export interface InfectionSite {
  id: string;
  tissueType: string;
  parasiteLoad: number;
  immunePressure: number;
  cystCount: number;
}

export interface ReplicationEvent {
  siteId: string;
  newParasites: number;
  bradyzoites: number;
  tachyzoites: number;
  timestamp: number;
}

export class ToxoplasmaGondii {
  private _sites: Map<string, InfectionSite> = new Map();
  private _events: ReplicationEvent[] = [];
  private _state: Record<string, unknown> = {};
  private _baselineReplicationRate: number = 0.1;
  private _hostManipulationIndex: number = 0;
  private _immuneEvasionFactor: number = 0.5;
  private _infectionEntropy: number = 0;

  infectSite(site: InfectionSite): void {
    this._sites.set(site.id, site);
    this._updateInfectionEntropy();
  }

  replicate(siteId: string): ReplicationEvent | null {
    const site = this._sites.get(siteId);
    if (!site) return null;
    const effectiveRate = this._baselineReplicationRate * (1 - site.immunePressure * this._immuneEvasionFactor);
    const newParasites = Math.floor(site.parasiteLoad * effectiveRate);
    const bradyzoites = Math.floor(newParasites * 0.3);
    const tachyzoites = newParasites - bradyzoites;
    site.parasiteLoad += newParasites;
    site.cystCount += bradyzoites;
    const event: ReplicationEvent = {
      siteId,
      newParasites,
      bradyzoites,
      tachyzoites,
      timestamp: Date.now(),
    };
    this._events.push(event);
    if (this._events.length > 200) this._events.shift();
    this._hostManipulationIndex += newParasites * 0.001;
    this._updateInfectionEntropy();
    return event;
  }

  private _updateInfectionEntropy(): void {
    const loads = Array.from(this._sites.values()).map(s => s.parasiteLoad);
    const total = loads.reduce((a, b) => a + b, 0);
    if (total === 0) {
      this._infectionEntropy = 0;
      return;
    }
    let entropy = 0;
    for (const load of loads) {
      const p = load / total;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    this._infectionEntropy = entropy;
  }

  immuneAttack(siteId: string, intensity: number): boolean {
    const site = this._sites.get(siteId);
    if (!site) return false;
    site.immunePressure = Math.min(1, site.immunePressure + intensity);
    site.parasiteLoad = Math.floor(site.parasiteLoad * (1 - intensity * 0.5));
    if (site.parasiteLoad <= 0) {
      this._sites.delete(siteId);
      this._updateInfectionEntropy();
      return true;
    }
    return false;
  }

  getSite(id: string): InfectionSite | null {
    return this._sites.get(id) ?? null;
  }

  totalParasiteLoad(): number {
    return Array.from(this._sites.values()).reduce((s, site) => s + site.parasiteLoad, 0);
  }

  totalCystCount(): number {
    return Array.from(this._sites.values()).reduce((s, site) => s + site.cystCount, 0);
  }

  averageImmunePressure(): number {
    if (this._sites.size === 0) return 0;
    return Array.from(this._sites.values()).reduce((s, site) => s + site.immunePressure, 0) / this._sites.size;
  }

  setReplicationRate(rate: number): void {
    this._baselineReplicationRate = Math.max(0, rate);
  }

  setImmuneEvasionFactor(factor: number): void {
    this._immuneEvasionFactor = Math.max(0, Math.min(1, factor));
  }

  get hostManipulationIndex(): number {
    return this._hostManipulationIndex;
  }

  get infectionEntropy(): number {
    return this._infectionEntropy;
  }

  gondiiReport(): Record<string, unknown> {
    return {
      siteCount: this._sites.size,
      totalParasiteLoad: this.totalParasiteLoad(),
      totalCystCount: this.totalCystCount(),
      averageImmunePressure: this.averageImmunePressure().toFixed(4),
      hostManipulationIndex: this._hostManipulationIndex.toFixed(4),
      infectionEntropy: this._infectionEntropy.toFixed(4),
      replicationRate: this._baselineReplicationRate.toFixed(4),
      immuneEvasionFactor: this._immuneEvasionFactor.toFixed(4),
      state: this._state,
    };
  }
}
