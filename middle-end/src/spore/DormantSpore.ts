export interface SporeState {
  id: string;
  viability: number;
  temperature: number;
  activationEnergy: number;
  dormancyDepth: number;
}

export interface StateTransition {
  from: string;
  to: string;
  rate: number;
  time: number;
}

export class DormantSpore {
  private _states: Map<string, SporeState> = new Map();
  private _transitions: StateTransition[] = [];
  private _state: Record<string, unknown> = {};
  private _markovChain: Map<string, Map<string, number>> = new Map();
  private _arrheniusConstant: number = 1e13;
  private _boltzmannConstant: number = 8.617e-5;

  constructor() {}

  get sporeCount(): number {
    return this._states.size;
  }

  get transitionCount(): number {
    return this._transitions.length;
  }

  addSpore(id: string, viability: number, activationEnergy: number, temperature: number): void {
    const dormancyDepth = activationEnergy / (this._boltzmannConstant * (temperature + 273.15));
    this._states.set(id, { id, viability, temperature, activationEnergy, dormancyDepth });
    this._markovChain.set(id, new Map());
  }

  computeArrheniusRate(sporeId: string): number {
    const spore = this._states.get(sporeId);
    if (!spore) return 0;
    const T = spore.temperature + 273.15;
    return this._arrheniusConstant * Math.exp(-spore.activationEnergy / (this._boltzmannConstant * T));
  }

  thermalInactivation(sporeId: string, time: number, temperature: number): number {
    const spore = this._states.get(sporeId);
    if (!spore) return 0;
    const T = temperature + 273.15;
    const k = this._arrheniusConstant * Math.exp(-spore.activationEnergy / (this._boltzmannConstant * T));
    return spore.viability * Math.exp(-k * time);
  }

  transition(sporeId: string, toState: string, rate: number): StateTransition | null {
    const spore = this._states.get(sporeId);
    if (!spore) return null;
    const transition: StateTransition = { from: sporeId, to: toState, rate, time: Date.now() };
    this._transitions.push(transition);
    if (this._transitions.length > 100) this._transitions.shift();
    this._markovChain.get(sporeId)!.set(toState, rate);
    return transition;
  }

  viabilityDecay(sporeId: string, dt: number): number {
    const spore = this._states.get(sporeId);
    if (!spore) return 0;
    const rate = this.computeArrheniusRate(sporeId);
    spore.viability = Math.max(0, spore.viability * Math.exp(-rate * dt));
    return spore.viability;
  }

  markovStateProbability(sporeId: string, state: string, time: number): number {
    const rates = this._markovChain.get(sporeId);
    if (!rates) return 0;
    const totalRate = Array.from(rates.values()).reduce((s, r) => s + r, 0);
    const rate = rates.get(state) ?? 0;
    if (totalRate === 0) return 1;
    return (rate / totalRate) * (1 - Math.exp(-totalRate * time));
  }

  equilibriumViability(temperature: number): number {
    const T = temperature + 273.15;
    const avgEnergy = Array.from(this._states.values()).reduce((s, sp) => s + sp.activationEnergy, 0) / (this._states.size || 1);
    const k = this._arrheniusConstant * Math.exp(-avgEnergy / (this._boltzmannConstant * T));
    return Math.exp(-k);
  }

  dormancyEntropy(): number {
    const depths = Array.from(this._states.values()).map((s) => s.dormancyDepth);
    const total = depths.reduce((s, v) => s + v, 0);
    if (total === 0) return 0;
    return -depths.reduce((s, v) => {
      const p = v / total;
      return p > 0 ? s + p * Math.log2(p) : s;
    }, 0);
  }

  meanViability(): number {
    if (this._states.size === 0) return 0;
    return Array.from(this._states.values()).reduce((s, sp) => s + sp.viability, 0) / this._states.size;
  }

  activationEnergyDistribution(): { mean: number; variance: number } {
    const energies = Array.from(this._states.values()).map((s) => s.activationEnergy);
    const mean = energies.reduce((s, v) => s + v, 0) / (energies.length || 1);
    const variance = energies.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (energies.length || 1);
    return { mean, variance };
  }

  report(): Record<string, unknown> {
    return {
      spores: this._states.size,
      transitions: this._transitions.length,
      meanViability: this.meanViability(),
      dormancyEntropy: this.dormancyEntropy(),
      state: this._state,
    };
  }
}
