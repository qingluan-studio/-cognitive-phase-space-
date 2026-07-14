export interface Species {
  id: string;
  abundance: number;
  trophicLevel: number;
  areaRequirement: number;
  extinctionRisk: number;
}

export interface ExtinctionRecord {
  speciesId: string;
  time: number;
  cause: string;
  cascadeMagnitude: number;
}

export class ExtinctionEvent {
  private _species: Map<string, Species> = new Map();
  private _extinctions: ExtinctionRecord[] = [];
  private _state: Record<string, unknown> = {};
  private _powerLawExponent: number = 2;
  private _speciesAreaCurve: number = 0.25;

  constructor() {}

  get speciesCount(): number {
    return this._species.size;
  }

  get extinctionCount(): number {
    return this._extinctions.length;
  }

  addSpecies(id: string, abundance: number, trophicLevel: number): void {
    const areaRequirement = Math.pow(abundance, this._speciesAreaCurve);
    const extinctionRisk = 1 / (abundance + 1);
    this._species.set(id, { id, abundance, trophicLevel, areaRequirement, extinctionRisk });
  }

  triggerEvent(intensity: number): ExtinctionRecord[] {
    const records: ExtinctionRecord[] = [];
    const sorted = Array.from(this._species.values()).sort((a, b) => a.abundance - b.abundance);
    for (const sp of sorted) {
      const survivalProb = Math.pow(sp.abundance / (sp.abundance + intensity), this._powerLawExponent);
      if (Math.random() > survivalProb) {
        const record: ExtinctionRecord = {
          speciesId: sp.id,
          time: Date.now(),
          cause: 'mass_extinction',
          cascadeMagnitude: this._computeCascade(sp),
        };
        records.push(record);
        this._extinctions.push(record);
        this._species.delete(sp.id);
      }
    }
    return records;
  }

  private _computeCascade(target: Species): number {
    let cascade = 0;
    for (const sp of this._species.values()) {
      if (sp.trophicLevel > target.trophicLevel) {
        cascade += 1 / (Math.abs(sp.trophicLevel - target.trophicLevel) + 1);
      }
    }
    return cascade;
  }

  punctuatedEquilibriumCheck(): boolean {
    const recent = this._extinctions.slice(-10);
    if (recent.length < 10) return false;
    const intervals = [];
    for (let i = 1; i < recent.length; i++) {
      intervals.push(recent[i].time - recent[i - 1].time);
    }
    const mean = intervals.reduce((s, v) => s + v, 0) / intervals.length;
    const variance = intervals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / intervals.length;
    return variance > mean * mean;
  }

  speciesAreaRelationship(area: number): number {
    const c = this._species.size > 0 ? this._species.size / Math.pow(100, this._speciesAreaCurve) : 1;
    return c * Math.pow(area, this._speciesAreaCurve);
  }

  trophicCascade(startId: string): string[] {
    const start = this._species.get(startId);
    if (!start) return [];
    const affected: string[] = [];
    for (const sp of this._species.values()) {
      if (sp.trophicLevel > start.trophicLevel) {
        affected.push(sp.id);
      }
    }
    return affected;
  }

  biodiversityIndex(): { shannon: number; simpson: number } {
    const abundances = Array.from(this._species.values()).map((s) => s.abundance);
    const total = abundances.reduce((s, v) => s + v, 0);
    if (total === 0) return { shannon: 0, simpson: 0 };
    const shannon = -abundances.reduce((s, v) => {
      const p = v / total;
      return p > 0 ? s + p * Math.log2(p) : s;
    }, 0);
    const simpson = abundances.reduce((s, v) => s + (v / total) ** 2, 0);
    return { shannon, simpson };
  }

  recoveryRate(): number {
    if (this._extinctions.length === 0) return 0;
    const recent = this._extinctions.slice(-10);
    return 1 - recent.length / 100;
  }

  report(): Record<string, unknown> {
    return {
      species: this._species.size,
      extinctions: this._extinctions.length,
      biodiversity: this.biodiversityIndex(),
      state: this._state,
    };
  }
}
