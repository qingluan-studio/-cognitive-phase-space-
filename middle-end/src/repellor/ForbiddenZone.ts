export interface ForbiddenZoneData {
  readonly zoneId: string;
  centerX: number;
  centerY: number;
  radius: number;
  repulsion: number;
}

export interface VoronoiCell {
  siteId: string;
  x: number;
  y: number;
  area: number;
  edges: number;
}

export class ForbiddenZone {
  private _data: ForbiddenZoneData;
  private _occupied: Map<string, { x: number; y: number }> = new Map();
  private _state: Record<string, unknown> = {};
  private _voronoiSites: VoronoiCell[] = [];
  private _distanceField: number[][] = [];

  constructor(data: ForbiddenZoneData) {
    this._data = { ...data };
  }

  get zoneId(): string {
    return this._data.zoneId;
  }

  get radius(): number {
    return this._data.radius;
  }

  get repulsion(): number {
    return this._data.repulsion;
  }

  occupy(id: string, x: number, y: number): void {
    this._occupied.set(id, { x, y });
    this._buildDistanceField();
    this._computeVoronoi();
  }

  private _buildDistanceField(): void {
    const res = 20;
    this._distanceField = Array.from({ length: res }, (_, i) =>
      Array.from({ length: res }, (_, j) => {
        const x = (j / res) * this._data.radius * 2 - this._data.radius;
        const y = (i / res) * this._data.radius * 2 - this._data.radius;
        return Math.sqrt(x * x + y * y);
      })
    );
  }

  private _computeVoronoi(): void {
    const entries = Array.from(this._occupied.entries());
    this._voronoiSites = entries.map(([siteId, pos]) => ({
      siteId,
      x: pos.x,
      y: pos.y,
      area: 0,
      edges: 0,
    }));
    const res = 50;
    for (let i = 0; i < res; i++) {
      for (let j = 0; j < res; j++) {
        const x = (j / res) * this._data.radius * 2 - this._data.radius;
        const y = (i / res) * this._data.radius * 2 - this._data.radius;
        let bestId = '';
        let bestDist = Infinity;
        for (const site of this._voronoiSites) {
          const d = Math.pow(x - site.x, 2) + Math.pow(y - site.y, 2);
          if (d < bestDist) {
            bestDist = d;
            bestId = site.siteId;
          }
        }
        const site = this._voronoiSites.find((s) => s.siteId === bestId);
        if (site) site.area += 1;
      }
    }
  }

  distanceToCenter(x: number, y: number): number {
    const dx = x - this._data.centerX;
    const dy = y - this._data.centerY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  signedDistance(x: number, y: number): number {
    return this.distanceToCenter(x, y) - this._data.radius;
  }

  repel(x: number, y: number): { dx: number; dy: number; force: number } {
    const dist = this.distanceToCenter(x, y);
    if (dist > this._data.radius) {
      return { dx: 0, dy: 0, force: 0 };
    }
    const dx = x - this._data.centerX;
    const dy = y - this._data.centerY;
    const norm = dist || 1;
    const force = this._data.repulsion * (1 - dist / this._data.radius);
    return { dx: (dx / norm) * force, dy: (dy / norm) * force, force };
  }

  contains(x: number, y: number): boolean {
    return this.distanceToCenter(x, y) <= this._data.radius;
  }

  borderDistance(x: number, y: number): number {
    return Math.abs(this.distanceToCenter(x, y) - this._data.radius);
  }

  expand(amount: number): void {
    this._data.radius += amount;
    this._state.expandedAt = Date.now();
  }

  shrink(amount: number): void {
    this._data.radius = Math.max(0, this._data.radius - amount);
    this._state.shrunkAt = Date.now();
  }

  intersectionArea(other: ForbiddenZoneData): number {
    const d = Math.sqrt(
      Math.pow(this._data.centerX - other.centerX, 2) + Math.pow(this._data.centerY - other.centerY, 2)
    );
    const r1 = this._data.radius;
    const r2 = other.radius;
    if (d >= r1 + r2) return 0;
    if (d <= Math.abs(r1 - r2)) return Math.PI * Math.min(r1, r2) ** 2;
    const r1Sq = r1 * r1;
    const r2Sq = r2 * r2;
    const alpha = Math.acos((d * d + r1Sq - r2Sq) / (2 * d * r1));
    const beta = Math.acos((d * d + r2Sq - r1Sq) / (2 * d * r2));
    return r1Sq * alpha + r2Sq * beta - 0.5 * Math.sqrt((-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2));
  }

  largestVoronoiCell(): VoronoiCell | null {
    if (this._voronoiSites.length === 0) return null;
    return this._voronoiSites.reduce((best, s) => (s.area > best.area ? s : best));
  }

  report(): Record<string, unknown> {
    return {
      zoneId: this.zoneId,
      radius: this._data.radius,
      occupied: this._occupied.size,
      voronoiSites: this._voronoiSites.length,
      state: this._state,
    };
  }
}
