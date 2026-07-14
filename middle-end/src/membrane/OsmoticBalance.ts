export interface Compartment {
  id: string;
  volume: number;
  soluteConcentration: number;
  membranePermeability: number;
  externalConcentration: number;
}

export interface OsmoticFlux {
  from: string;
  to: string;
  waterFlux: number;
  osmoticPressure: number;
  timestamp: number;
}

export class OsmoticBalance {
  private _compartments: Map<string, Compartment> = new Map();
  private _fluxes: OsmoticFlux[] = [];
  private _state: Record<string, unknown> = {};
  private _gasConstant: number = 0.0821;
  private _temperature: number = 310;
  private _vantHoffFactor: number = 1;
  private _totalEntropy: number = 0;

  addCompartment(compartment: Compartment): void {
    this._compartments.set(compartment.id, compartment);
  }

  computeOsmoticPressure(compartmentId: string): number {
    const comp = this._compartments.get(compartmentId);
    if (!comp) return 0;
    return this._vantHoffFactor * comp.soluteConcentration * this._gasConstant * this._temperature;
  }

  equilibrate(compartmentId: string, dt: number = 1): OsmoticFlux | null {
    const comp = this._compartments.get(compartmentId);
    if (!comp) return null;
    const piIn = this.computeOsmoticPressure(compartmentId);
    const piOut = this._vantHoffFactor * comp.externalConcentration * this._gasConstant * this._temperature;
    const deltaPi = piIn - piOut;
    const waterFlux = -comp.membranePermeability * deltaPi * dt;
    const newVolume = comp.volume + waterFlux;
    if (newVolume > 0) {
      comp.soluteConcentration = (comp.soluteConcentration * comp.volume) / newVolume;
      comp.volume = newVolume;
    }
    const flux: OsmoticFlux = {
      from: compartmentId,
      to: 'external',
      waterFlux,
      osmoticPressure: piIn,
      timestamp: Date.now(),
    };
    this._fluxes.push(flux);
    if (this._fluxes.length > 200) this._fluxes.shift();
    this._updateEntropy();
    return flux;
  }

  private _updateEntropy(): void {
    const concentrations = Array.from(this._compartments.values()).map(c => c.soluteConcentration);
    const total = concentrations.reduce((a, b) => a + b, 0);
    if (total === 0) {
      this._totalEntropy = 0;
      return;
    }
    let entropy = 0;
    for (const c of concentrations) {
      const p = c / total;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    this._totalEntropy = entropy;
  }

  getCompartment(id: string): Compartment | null {
    return this._compartments.get(id) ?? null;
  }

  totalVolume(): number {
    return Array.from(this._compartments.values()).reduce((s, c) => s + c.volume, 0);
  }

  averageConcentration(): number {
    if (this._compartments.size === 0) return 0;
    return Array.from(this._compartments.values()).reduce((s, c) => s + c.soluteConcentration, 0) / this._compartments.size;
  }

  setExternalConcentration(compartmentId: string, concentration: number): void {
    const comp = this._compartments.get(compartmentId);
    if (comp) comp.externalConcentration = concentration;
  }

  setVantHoffFactor(factor: number): void {
    this._vantHoffFactor = Math.max(0, factor);
  }

  setTemperature(temp: number): void {
    this._temperature = Math.max(0, temp);
  }

  get fluxCount(): number {
    return this._fluxes.length;
  }

  get totalEntropy(): number {
    return this._totalEntropy;
  }

  balanceReport(): Record<string, unknown> {
    return {
      compartmentCount: this._compartments.size,
      totalVolume: this.totalVolume().toFixed(4),
      averageConcentration: this.averageConcentration().toFixed(4),
      totalEntropy: this._totalEntropy.toFixed(4),
      fluxCount: this._fluxes.length,
      temperature: this._temperature.toFixed(2),
      vantHoffFactor: this._vantHoffFactor.toFixed(2),
      state: this._state,
    };
  }
}
