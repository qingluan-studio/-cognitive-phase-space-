export interface Antigen {
  id: string;
  epitope: string;
  virulence: number;
}

export interface ImmuneResponse {
  antigenId: string;
  cytokineLevel: number;
  antibodyTiter: number;
  cytotoxicity: number;
  timestamp: number;
}

export class HostRejection {
  private _antigens: Map<string, Antigen> = new Map();
  private _responses: ImmuneResponse[] = [];
  private _memoryCells: Map<string, number> = new Map();
  private _state: Record<string, unknown> = {};
  private _clonalExpansionRate: number = 0.3;
  private _cytokineThreshold: number = 10;
  private _hammingDistanceCache: Map<string, number> = new Map();

  introduceAntigen(antigen: Antigen): void {
    this._antigens.set(antigen.id, antigen);
    const memory = this._memoryCells.get(antigen.epitope) ?? 0;
    const response = this._mountResponse(antigen, memory);
    this._responses.push(response);
    if (this._responses.length > 200) this._responses.shift();
    if (response.cytotoxicity > antigen.virulence) {
      this._memoryCells.set(antigen.epitope, memory + 1);
    }
  }

  private _mountResponse(antigen: Antigen, memory: number): ImmuneResponse {
    const recognition = Math.max(0, 1 - this._computeHammingDistance(antigen.epitope, 'self') / antigen.epitope.length);
    const cytokineLevel = antigen.virulence * recognition * (1 + memory * 0.5);
    const antibodyTiter = cytokineLevel * this._clonalExpansionRate;
    const cytotoxicity = antibodyTiter * recognition;
    return {
      antigenId: antigen.id,
      cytokineLevel,
      antibodyTiter,
      cytotoxicity,
      timestamp: Date.now(),
    };
  }

  private _computeHammingDistance(a: string, b: string): number {
    const key = `${a}:${b}`;
    if (this._hammingDistanceCache.has(key)) return this._hammingDistanceCache.get(key)!;
    const maxLen = Math.max(a.length, b.length);
    let dist = 0;
    for (let i = 0; i < maxLen; i++) {
      if (a[i] !== b[i]) dist++;
    }
    this._hammingDistanceCache.set(key, dist);
    return dist;
  }

  getResponse(antigenId: string): ImmuneResponse | null {
    return this._responses.find(r => r.antigenId === antigenId) ?? null;
  }

  getResponsesForEpitope(epitope: string): ImmuneResponse[] {
    const antigenIds = Array.from(this._antigens.values()).filter(a => a.epitope === epitope).map(a => a.id);
    return this._responses.filter(r => antigenIds.includes(r.antigenId));
  }

  averageCytotoxicity(): number {
    if (this._responses.length === 0) return 0;
    return this._responses.reduce((acc, r) => acc + r.cytotoxicity, 0) / this._responses.length;
  }

  totalCytokineStorm(): number {
    return this._responses.reduce((acc, r) => acc + r.cytokineLevel, 0);
  }

  isCytokineStorm(): boolean {
    return this.totalCytokineStorm() > this._cytokineThreshold * this._antigens.size;
  }

  memoryStrength(epitope: string): number {
    return this._memoryCells.get(epitope) ?? 0;
  }

  setClonalExpansionRate(rate: number): void {
    this._clonalExpansionRate = Math.max(0, Math.min(1, rate));
  }

  setCytokineThreshold(threshold: number): void {
    this._cytokineThreshold = Math.max(0, threshold);
  }

  get antigenCount(): number {
    return this._antigens.size;
  }

  get memoryCount(): number {
    return this._memoryCells.size;
  }

  rejectionReport(): Record<string, unknown> {
    return {
      antigenCount: this._antigens.size,
      responseCount: this._responses.length,
      memoryCount: this._memoryCells.size,
      averageCytotoxicity: this.averageCytotoxicity().toFixed(4),
      totalCytokineStorm: this.totalCytokineStorm().toFixed(4),
      isCytokineStorm: this.isCytokineStorm(),
      cytokineThreshold: this._cytokineThreshold,
      clonalExpansionRate: this._clonalExpansionRate.toFixed(3),
      state: this._state,
    };
  }
}
