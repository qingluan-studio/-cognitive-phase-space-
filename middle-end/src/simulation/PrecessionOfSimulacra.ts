export interface SimulacrumState {
  order: number;
  mask: number;
  appearance: number;
  simulation: number;
}

export type PrecessionTrajectory = {
  currentOrder: number;
  precessionRate: number;
  phase: 'icon' | 'index' | 'symbol' | 'simulacrum';
};

export interface PrecessionConfig {
  iconThreshold: number;
  indexThreshold: number;
  symbolThreshold: number;
  decayFactor: number;
}

export class PrecessionOfSimulacra {
  private _config: PrecessionConfig;
  private _states: SimulacrumState[] = [];
  private _trajectory: PrecessionTrajectory | null = null;
  private _state: Record<string, unknown> = {};
  private _markovTransition: number[][] = [[0.7, 0.2, 0.1, 0], [0.1, 0.6, 0.2, 0.1], [0, 0.1, 0.5, 0.4], [0, 0, 0.2, 0.8]];
  private _currentMarkovState: number = 0;
  private _lyapunovExponent: number = 0;

  constructor(config: PrecessionConfig) {
    this._config = config;
  }

  get stateCount(): number {
    return this._states.length;
  }

  get currentPhase(): PrecessionTrajectory['phase'] | null {
    return this._trajectory ? this._trajectory.phase : null;
  }

  get lyapunovExponent(): number {
    return this._lyapunovExponent;
  }

  private _stepMarkov(): number {
    const probs = this._markovTransition[this._currentMarkovState];
    const roll = Math.random();
    let cum = 0;
    for (let i = 0; i < probs.length; i++) {
      cum += probs[i];
      if (roll <= cum) {
        this._currentMarkovState = i;
        return i;
      }
    }
    this._currentMarkovState = probs.length - 1;
    return this._currentMarkovState;
  }

  private _classifyPhase(order: number): PrecessionTrajectory['phase'] {
    if (order < this._config.iconThreshold) return 'icon';
    if (order < this._config.indexThreshold) return 'index';
    if (order < this._config.symbolThreshold) return 'symbol';
    return 'simulacrum';
  }

  private _computeLyapunov(): void {
    if (this._states.length < 2) return;
    let sum = 0;
    for (let i = 1; i < this._states.length; i++) {
      const diff = Math.abs(this._states[i].order - this._states[i - 1].order);
      if (diff > 0) sum += Math.log(diff + 1);
    }
    this._lyapunovExponent = sum / Math.max(1, this._states.length - 1);
  }

  precess(order: number, mask: number, appearance: number, simulation: number): SimulacrumState {
    const state: SimulacrumState = { order, mask, appearance, simulation };
    this._states.push(state);
    if (this._states.length > 40) this._states.shift();
    const markovState = this._stepMarkov();
    const phase = this._classifyPhase(order);
    const precessionRate = (mask + appearance + simulation) / 3 * this._config.decayFactor;
    this._trajectory = { currentOrder: markovState, precessionRate, phase };
    this._computeLyapunov();
    this._state.lastPrecession = { order, phase };
    return state;
  }

  currentOrder(): number {
    return this._states.length > 0 ? this._states[this._states.length - 1].order : 0;
  }

  isSimulacrum(): boolean {
    return this.currentPhase === 'simulacrum';
  }

  collapseToReality(): SimulacrumState | null {
    const last = this._states[this._states.length - 1];
    if (!last) return null;
    last.simulation = 0;
    last.mask = 0;
    last.appearance = last.order;
    this._state.collapsed = true;
    return last;
  }

  averageOrder(): number {
    if (this._states.length === 0) return 0;
    return this._states.reduce((acc, s) => acc + s.order, 0) / this._states.length;
  }

  entropyOfPhases(): number {
    const counts: Record<string, number> = {};
    for (const s of this._states) {
      const phase = this._classifyPhase(s.order);
      counts[phase] = (counts[phase] || 0) + 1;
    }
    const total = this._states.length;
    let entropy = 0;
    for (const key of Object.keys(counts)) {
      const p = counts[key] / total;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  reset(): void {
    this._states = [];
    this._trajectory = null;
    this._currentMarkovState = 0;
    this._lyapunovExponent = 0;
    this._state = {};
  }

  report(): Record<string, unknown> {
    return {
      states: this._states.length,
      currentPhase: this.currentPhase,
      trajectory: this._trajectory,
      state: this._state,
      lyapunovExponent: this._lyapunovExponent.toFixed(4),
      phaseEntropy: this.entropyOfPhases().toFixed(4),
    };
  }
}
