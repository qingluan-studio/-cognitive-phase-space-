/**
 * 真实的荒漠：剥开所有仿真后的荒芜。
 * 逐层剥离仿真覆盖物，最终暴露出无法再被符号化的真实基底。
 */

export interface SimulacraVeil {
  id: string;
  layer: number;
  description: string;
  opacity: number;
  removable: boolean;
}

export interface DesertExposure {
  veilsRemoved: string[];
  remainingVeils: number;
  bareness: number;
  exposedAt: number;
}

export class DesertOfTheReal {
  private _veils: SimulacraVeil[] = [];
  private _exposures: DesertExposure[] = [];
  private _bareness = 0;
  private _core: string | null = null;

  addVeil(veil: SimulacraVeil): void {
    this._veils.push(veil);
    this._veils.sort((a, b) => b.layer - a.layer);
  }

  setCore(core: string): void {
    this._core = core;
  }

  peel(): DesertExposure | null {
    const removableIdx = this._veils.findIndex(v => v.removable);
    if (removableIdx < 0) return null;
    const [removed] = this._veils.splice(removableIdx, 1);
    this._bareness = Math.min(1, this._bareness + 0.15);
    const exposure: DesertExposure = {
      veilsRemoved: [removed.id],
      remainingVeils: this._veils.length,
      bareness: this._bareness,
      exposedAt: Date.now(),
    };
    this._exposures.push(exposure);
    if (this._exposures.length > 100) this._exposures.shift();
    return exposure;
  }

  peelAll(): DesertExposure {
    const removed: string[] = [];
    let idx: number;
    while ((idx = this._veils.findIndex(v => v.removable)) >= 0) {
      const [v] = this._veils.splice(idx, 1);
      removed.push(v.id);
    }
    this._bareness = 1;
    const exposure: DesertExposure = {
      veilsRemoved: removed,
      remainingVeils: this._veils.length,
      bareness: this._bareness,
      exposedAt: Date.now(),
    };
    this._exposures.push(exposure);
    return exposure;
  }

  reCover(veil: SimulacraVeil): void {
    this._veils.push(veil);
    this._bareness = Math.max(0, this._bareness - 0.1);
  }

  isBare(): boolean {
    return this._bareness >= 0.9 && this._veils.length === 0;
  }

  getVeils(): SimulacraVeil[] {
    return [...this._veils];
  }

  getExposures(): DesertExposure[] {
    return [...this._exposures];
  }

  get core(): string | null {
    return this._core;
  }

  get bareness(): number {
    return this._bareness;
  }
}
