export interface MetabolicFlux {
  reactionId: string;
  flux: number;
  lowerBound: number;
  upperBound: number;
  reducedCost: number;
}

export interface SymbiontLoad {
  hostId: string;
  symbiontId: string;
  load: number;
  metabolicCost: number;
  coevolutionIndex: number;
}

export class Endosymbiont {
  private _fluxes: Map<string, MetabolicFlux> = new Map();
  private _loads: SymbiontLoad[] = [];
  private _state: Record<string, unknown> = {};
  private _controlCoefficients: Map<string, number> = new Map();
  private _hostFitness: Map<string, number> = new Map();

  constructor() {}

  get fluxCount(): number {
    return this._fluxes.size;
  }

  get loadCount(): number {
    return this._loads.length;
  }

  addReaction(reactionId: string, lowerBound: number, upperBound: number): void {
    this._fluxes.set(reactionId, { reactionId, flux: 0, lowerBound, upperBound, reducedCost: 0 });
  }

  optimizeFlux(objectiveId: string): number {
    const objective = this._fluxes.get(objectiveId);
    if (!objective) return 0;
    objective.flux = objective.upperBound * 0.8;
    for (const flux of this._fluxes.values()) {
      if (flux.reactionId !== objectiveId) {
        flux.flux = flux.lowerBound + Math.random() * (flux.upperBound - flux.lowerBound);
        flux.reducedCost = flux.upperBound - flux.flux;
      }
    }
    return objective.flux;
  }

  metabolicControlAnalysis(reactionId: string): number {
    const flux = this._fluxes.get(reactionId);
    if (!flux) return 0;
    const coefficient = flux.flux / (flux.upperBound - flux.lowerBound + 1e-10);
    this._controlCoefficients.set(reactionId, coefficient);
    return coefficient;
  }

  addLoad(hostId: string, symbiontId: string, load: number): SymbiontLoad {
    const metabolicCost = load * 0.1;
    const hostFit = this._hostFitness.get(hostId) ?? 1;
    const coevolutionIndex = 1 / (1 + Math.abs(hostFit - load));
    const symbiontLoad: SymbiontLoad = { hostId, symbiontId, load, metabolicCost, coevolutionIndex };
    this._loads.push(symbiontLoad);
    if (this._loads.length > 100) this._loads.shift();
    return symbiontLoad;
  }

  fluxBalanceAnalysis(): number {
    let total = 0;
    for (const flux of this._fluxes.values()) {
      total += flux.flux;
    }
    return total;
  }

  symbiontBurden(hostId: string): number {
    return this._loads
      .filter((l) => l.hostId === hostId)
      .reduce((s, l) => s + l.metabolicCost, 0);
  }

  coevolutionTrend(): number {
    if (this._loads.length === 0) return 0;
    return this._loads.reduce((s, l) => s + l.coevolutionIndex, 0) / this._loads.length;
  }

  hostFitness(hostId: string): number {
    const burden = this.symbiontBurden(hostId);
    const benefit = this._loads
      .filter((l) => l.hostId === hostId)
      .reduce((s, l) => s + l.load * 0.2, 0);
    const fitness = Math.max(0, 1 - burden + benefit);
    this._hostFitness.set(hostId, fitness);
    return fitness;
  }

  metabolicEfficiency(reactionId: string): number {
    const flux = this._fluxes.get(reactionId);
    if (!flux) return 0;
    return flux.flux / (flux.upperBound || 1);
  }

  fluxVariance(): number {
    const fluxes = Array.from(this._fluxes.values()).map((f) => f.flux);
    if (fluxes.length === 0) return 0;
    const mean = fluxes.reduce((s, v) => s + v, 0) / fluxes.length;
    return fluxes.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / fluxes.length;
  }

  report(): Record<string, unknown> {
    return {
      fluxes: this._fluxes.size,
      loads: this._loads.length,
      fba: this.fluxBalanceAnalysis(),
      coevolution: this.coevolutionTrend(),
      state: this._state,
    };
  }
}
