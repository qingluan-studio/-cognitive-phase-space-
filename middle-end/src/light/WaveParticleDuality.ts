export interface QuantumState {
  waveAmplitude: number;
  particlePosition: number;
  momentum: number;
  probability: number;
}

export type MeasurementOutcome = {
  collapsedTo: 'wave' | 'particle';
  value: number;
  uncertainty: number;
};

export interface DualityConfig {
  planckConstant: number;
  slitSeparation: number;
  screenDistance: number;
}

export class WaveParticleDuality {
  private _config: DualityConfig;
  private _states: QuantumState[] = [];
  private _outcomes: MeasurementOutcome[] = [];
  private _state: Record<string, unknown> = {};
  private _deBroglieWavelength: number = 0;
  private _uncertaintyProduct: number = 0;
  private _interferencePattern: number[] = [];

  constructor(config: DualityConfig) {
    this._config = config;
  }

  get stateCount(): number {
    return this._states.length;
  }

  get uncertaintyProduct(): number {
    return this._uncertaintyProduct;
  }

  get deBroglieWavelength(): number {
    return this._deBroglieWavelength;
  }

  private _computeDeBroglie(momentum: number): number {
    return this._config.planckConstant / (momentum + 0.001);
  }

  private _computeUncertainty(position: number, momentum: number): void {
    const deltaX = Math.abs(position) * 0.1;
    const deltaP = Math.abs(momentum) * 0.1;
    this._uncertaintyProduct = deltaX * deltaP;
  }

  private _computeInterference(position: number): number {
    const k = (2 * Math.PI) / this._deBroglieWavelength;
    const d = this._config.slitSeparation;
    const l = this._config.screenDistance;
    const theta = position / l;
    const pathDiff = d * Math.sin(theta);
    const phaseDiff = k * pathDiff;
    return Math.cos(phaseDiff / 2) * Math.cos(phaseDiff / 2);
  }

  superpose(waveAmplitude: number, particlePosition: number, momentum: number): QuantumState {
    this._deBroglieWavelength = this._computeDeBroglie(momentum);
    this._computeUncertainty(particlePosition, momentum);
    const probability = waveAmplitude * waveAmplitude;
    const state: QuantumState = { waveAmplitude, particlePosition, momentum, probability };
    this._states.push(state);
    if (this._states.length > 30) this._states.shift();
    const interference = this._computeInterference(particlePosition);
    this._interferencePattern.push(interference);
    if (this._interferencePattern.length > 30) this._interferencePattern.shift();
    return state;
  }

  measure(): MeasurementOutcome {
    if (this._states.length === 0) {
      return { collapsedTo: 'particle', value: 0, uncertainty: Infinity };
    }
    const last = this._states[this._states.length - 1];
    const waveProb = last.waveAmplitude * last.waveAmplitude;
    const collapsedTo = Math.random() < waveProb ? 'wave' : 'particle';
    const value = collapsedTo === 'wave' ? last.waveAmplitude : last.particlePosition;
    const uncertainty = this._uncertaintyProduct / (Math.abs(value) + 0.001);
    const outcome: MeasurementOutcome = { collapsedTo, value, uncertainty };
    this._outcomes.push(outcome);
    if (this._outcomes.length > 30) this._outcomes.shift();
    this._state.lastMeasurement = collapsedTo;
    return outcome;
  }

  computePattern(): number[] {
    return [...this._interferencePattern];
  }

  averageProbability(): number {
    if (this._states.length === 0) return 0;
    return this._states.reduce((acc, s) => acc + s.probability, 0) / this._states.length;
  }

  violatesUncertainty(): boolean {
    return this._uncertaintyProduct < this._config.planckConstant / 2;
  }

  reset(): void {
    this._states = [];
    this._outcomes = [];
    this._interferencePattern = [];
    this._uncertaintyProduct = 0;
    this._deBroglieWavelength = 0;
    this._state = {};
  }

  report(): Record<string, unknown> {
    return {
      states: this._states.length,
      outcomes: this._outcomes.length,
      averageProbability: this.averageProbability().toFixed(4),
      state: this._state,
      uncertaintyProduct: this._uncertaintyProduct.toFixed(4),
      deBroglieWavelength: this._deBroglieWavelength.toFixed(4),
      violatesUncertainty: this.violatesUncertainty(),
    };
  }
}
