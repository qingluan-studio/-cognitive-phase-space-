export interface Vesicle {
  id: string;
  cargo: string;
  size: number;
  calciumSensitivity: number;
  docked: boolean;
  fused: boolean;
}

export interface ExocytosisEvent {
  vesicleId: string;
  calciumConcentration: number;
  releaseProbability: number;
  cargoReleased: string;
  timestamp: number;
}

export class ExocytosisBurst {
  private _vesicles: Map<string, Vesicle> = new Map();
  private _events: ExocytosisEvent[] = [];
  private _state: Record<string, unknown> = {};
  private _snareComplexStability: number = 0.8;
  private _calciumThreshold: number = 10;
  private _releaseEntropy: number = 0;
  private _cargoDistribution: Map<string, number> = new Map();

  dockVesicle(vesicle: Vesicle): void {
    vesicle.docked = true;
    vesicle.fused = false;
    this._vesicles.set(vesicle.id, vesicle);
    this._cargoDistribution.set(vesicle.cargo, (this._cargoDistribution.get(vesicle.cargo) ?? 0) + 1);
  }

  stimulate(calciumConcentration: number): ExocytosisEvent[] {
    const events: ExocytosisEvent[] = [];
    for (const vesicle of this._vesicles.values()) {
      if (!vesicle.docked || vesicle.fused) continue;
      const prob = this._computeReleaseProbability(calciumConcentration, vesicle.calciumSensitivity);
      if (Math.random() < prob) {
        vesicle.fused = true;
        const event: ExocytosisEvent = {
          vesicleId: vesicle.id,
          calciumConcentration,
          releaseProbability: prob,
          cargoReleased: vesicle.cargo,
          timestamp: Date.now(),
        };
        this._events.push(event);
        if (this._events.length > 200) this._events.shift();
        events.push(event);
      }
    }
    this._updateReleaseEntropy();
    return events;
  }

  private _computeReleaseProbability(ca: number, sensitivity: number): number {
    const hillCoefficient = 4;
    const ec50 = this._calciumThreshold / sensitivity;
    return Math.pow(ca, hillCoefficient) / (Math.pow(ec50, hillCoefficient) + Math.pow(ca, hillCoefficient));
  }

  private _updateReleaseEntropy(): void {
    const total = this._events.length;
    if (total === 0) {
      this._releaseEntropy = 0;
      return;
    }
    const cargoCounts: Record<string, number> = {};
    for (const e of this._events) {
      cargoCounts[e.cargoReleased] = (cargoCounts[e.cargoReleased] ?? 0) + 1;
    }
    let entropy = 0;
    for (const count of Object.values(cargoCounts)) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }
    this._releaseEntropy = entropy;
  }

  recycle(vesicleId: string): boolean {
    const vesicle = this._vesicles.get(vesicleId);
    if (!vesicle) return false;
    vesicle.fused = false;
    vesicle.docked = false;
    return true;
  }

  getVesicle(id: string): Vesicle | null {
    return this._vesicles.get(id) ?? null;
  }

  dockedCount(): number {
    return Array.from(this._vesicles.values()).filter(v => v.docked && !v.fused).length;
  }

  fusedCount(): number {
    return Array.from(this._vesicles.values()).filter(v => v.fused).length;
  }

  setSnareStability(stability: number): void {
    this._snareComplexStability = Math.max(0, Math.min(1, stability));
  }

  setCalciumThreshold(threshold: number): void {
    this._calciumThreshold = Math.max(0, threshold);
  }

  get eventCount(): number {
    return this._events.length;
  }

  get releaseEntropy(): number {
    return this._releaseEntropy;
  }

  burstReport(): Record<string, unknown> {
    return {
      vesicleCount: this._vesicles.size,
      dockedCount: this.dockedCount(),
      fusedCount: this.fusedCount(),
      eventCount: this._events.length,
      releaseEntropy: this._releaseEntropy.toFixed(4),
      snareStability: this._snareComplexStability.toFixed(4),
      calciumThreshold: this._calciumThreshold.toFixed(4),
      state: this._state,
    };
  }
}
