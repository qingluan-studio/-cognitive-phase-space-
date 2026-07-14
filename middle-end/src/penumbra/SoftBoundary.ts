/**
 * 软边界模块：两侧逐渐融合的无清晰界限。
 * 用于刻画系统中没有明确分界、彼此渗透的过渡区。
 */

export interface BoundaryZone {
  side: 'left' | 'right' | 'center';
  membership: number;
  blendFactor: number;
}

export type BoundaryBlend = {
  zones: number;
  centerMembership: number;
  blendWidth: number;
};

export interface SoftBoundaryConfig {
  zoneCount: number;
  blendWidth: number;
  steepness: number;
}

export class SoftBoundary {
  private _config: SoftBoundaryConfig;
  private _zones: BoundaryZone[] = [];
  private _blend: BoundaryBlend | null = null;
  private _state: Record<string, unknown> = {};

  constructor(config: SoftBoundaryConfig) {
    this._config = config;
    this._build();
  }

  get zoneCount(): number {
    return this._zones.length;
  }

  get blendWidth(): number {
    return this._config.blendWidth;
  }

  private _build(): void {
    this._zones = [];
    const n = this._config.zoneCount;
    for (let i = 0; i < n; i++) {
      const t = (i / (n - 1)) * 2 - 1;
      const membership = 1 / (1 + Math.exp(this._config.steepness * t));
      const blendFactor = 4 * membership * (1 - membership);
      const side: BoundaryZone['side'] =
        t < -0.1 ? 'left' : t > 0.1 ? 'right' : 'center';
      this._zones.push({ side, membership, blendFactor });
    }
  }

  computeBlend(): BoundaryBlend {
    const centerZones = this._zones.filter((z) => z.side === 'center');
    const centerMembership =
      centerZones.length > 0
        ? centerZones.reduce((acc, z) => acc + z.blendFactor, 0) / centerZones.length
        : 0;
    this._blend = {
      zones: this._zones.length,
      centerMembership,
      blendWidth: this._config.blendWidth,
    };
    return this._blend;
  }

  membershipAt(position: number): number {
    const t = position;
    return 1 / (1 + Math.exp(this._config.steepness * t));
  }

  isBlended(): boolean {
    return this.computeBlend().centerMembership > 0.5;
  }

  peakBlendZone(): BoundaryZone | null {
    if (this._zones.length === 0) return null;
    return this._zones.reduce((best, z) => (z.blendFactor > best.blendFactor ? z : best));
  }

  leftSideMembership(): number {
    const left = this._zones.filter((z) => z.side === 'left');
    if (left.length === 0) return 0;
    return left.reduce((acc, z) => acc + z.membership, 0) / left.length;
  }

  rightSideMembership(): number {
    const right = this._zones.filter((z) => z.side === 'right');
    if (right.length === 0) return 0;
    return right.reduce((acc, z) => acc + z.membership, 0) / right.length;
  }

  setSteepness(steepness: number): void {
    this._config.steepness = steepness;
    this._build();
    this._state.steepnessUpdated = steepness;
  }

  report(): Record<string, unknown> {
    return {
      zoneCount: this._zones.length,
      blend: this._blend,
      state: this._state,
    };
  }
}
