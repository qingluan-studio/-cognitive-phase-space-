/**
 * 平原跳跃者模块：在不同知识平原（稳定概念区）之间进行跳跃，
 * 跨越中间的混沌谷地，直接抵达另一稳定认知平台。
 */

export interface KnowledgePlateau {
  id: string;
  name: string;
  altitude: number;
  stability: number;
}

export interface PlateauJump {
  id: string;
  from: string;
  to: string;
  gapCrossed: number;
  landed: boolean;
  jumpedAt: number;
}

export class PlateauHopper {
  private _plateaus: Map<string, KnowledgePlateau> = new Map();
  private _jumps: PlateauJump[] = [];
  private _current: string | null = null;
  private _maxJumpDistance = 5.0;

  registerPlateau(plateau: KnowledgePlateau): void {
    this._plateaus.set(plateau.id, plateau);
    if (this._current === null) this._current = plateau.id;
  }

  measureGap(a: string, b: string): number {
    const pa = this._plateaus.get(a);
    const pb = this._plateaus.get(b);
    if (!pa || !pb) return Infinity;
    const altDiff = Math.abs(pa.altitude - pb.altitude);
    const stabDiff = Math.abs(pa.stability - pb.stability);
    return altDiff + stabDiff;
  }

  jump(to: string): PlateauJump | null {
    if (!this._current || !this._plateaus.has(to)) return null;
    const gap = this.measureGap(this._current, to);
    if (gap > this._maxJumpDistance) {
      const failed: PlateauJump = {
        id: `jump-${Date.now()}`,
        from: this._current,
        to,
        gapCrossed: gap,
        landed: false,
        jumpedAt: Date.now(),
      };
      this._jumps.push(failed);
      return failed;
    }
    const jump: PlateauJump = {
      id: `jump-${Date.now()}`,
      from: this._current,
      to,
      gapCrossed: gap,
      landed: true,
      jumpedAt: Date.now(),
    };
    this._jumps.push(jump);
    if (this._jumps.length > 200) this._jumps.shift();
    this._current = to;
    return jump;
  }

  findReachable(): string[] {
    if (!this._current) return [];
    return Array.from(this._plateaus.keys()).filter(id => {
      if (id === this._current) return false;
      return this.measureGap(this._current, id) <= this._maxJumpDistance;
    });
  }

  buildBridge(a: string, b: string): boolean {
    const pa = this._plateaus.get(a);
    const pb = this._plateaus.get(b);
    if (!pa || !pb) return false;
    const avgAlt = (pa.altitude + pb.altitude) / 2;
    const avgStab = (pa.stability + pb.stability) / 2;
    pa.altitude = avgAlt;
    pb.altitude = avgAlt;
    pa.stability = avgStab;
    pb.stability = avgStab;
    return true;
  }

  expandJumpCapability(delta: number): void {
    this._maxJumpDistance = Math.max(1, this._maxJumpDistance + delta);
  }

  getSuccessfulJumps(): PlateauJump[] {
    return this._jumps.filter(j => j.landed);
  }

  getCurrentPlateau(): KnowledgePlateau | null {
    if (!this._current) return null;
    return this._plateaus.get(this._current) ?? null;
  }

  get plateauCount(): number {
    return this._plateaus.size;
  }

  get jumpCount(): number {
    return this._jumps.length;
  }
}
