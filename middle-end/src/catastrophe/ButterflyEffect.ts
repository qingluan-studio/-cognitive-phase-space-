export interface ButterflyEffectData {
  readonly butterflyId: string;
  sensitivityExponent: number;
  initialPerturbation: number;
  amplificationFactor: number;
}

export interface PerturbationOutcome {
  perturbation: number;
  evolvedValue: number;
  amplification: number;
  exceededThreshold: boolean;
  lyapunovLocal: number;
}

export class ButterflyEffect {
  private _data: ButterflyEffectData;
  private _outcomes: PerturbationOutcome[] = [];
  private _divergenceHistory: number[] = [];
  private _stormTriggered: boolean = false;
  private _referenceTrajectory: number[] = [];
  private _maxLyapunov: number = 0;

  constructor(data: ButterflyEffectData) {
    this._data = { ...data };
  }

  get butterflyId(): string {
    return this._data.butterflyId;
  }

  get sensitivityExponent(): number {
    return this._data.sensitivityExponent;
  }

  get stormTriggered(): boolean {
    return this._stormTriggered;
  }

  get maxLyapunov(): number {
    return this._maxLyapunov;
  }

  public setReferenceTrajectory(trajectory: number[]): void {
    this._referenceTrajectory = [...trajectory];
  }

  public flap(wingAmplitude: number, steps: number): PerturbationOutcome {
    const amplified = wingAmplitude * Math.exp(this._data.sensitivityExponent * steps * 0.1);
    const totalAmplification = amplified / Math.max(0.0001, wingAmplitude);
    const exceeded = amplified > this._data.amplificationFactor;
    const lyapunovLocal = steps > 0
      ? Math.log(Math.max(totalAmplification, 1e-10)) / steps
      : 0;
    if (exceeded) this._stormTriggered = true;
    if (lyapunovLocal > this._maxLyapunov) this._maxLyapunov = lyapunovLocal;
    this._divergenceHistory.push(amplified);
    if (this._divergenceHistory.length > 50) this._divergenceHistory.shift();
    const outcome: PerturbationOutcome = {
      perturbation: wingAmplitude,
      evolvedValue: amplified,
      amplification: totalAmplification,
      exceededThreshold: exceeded,
      lyapunovLocal,
    };
    this._outcomes.push(outcome);
    if (this._outcomes.length > 30) this._outcomes.shift();
    return outcome;
  }

  public compareTrajectories(perturbed: number[]): number {
    const minLen = Math.min(this._referenceTrajectory.length, perturbed.length);
    if (minLen === 0) return 0;
    let sumSquaredDiff = 0;
    for (let i = 0; i < minLen; i++) {
      const diff = this._referenceTrajectory[i] - perturbed[i];
      sumSquaredDiff += diff * diff;
    }
    return Math.sqrt(sumSquaredDiff / minLen);
  }

  public computeLyapunovExponent(timeSeries: number[]): number {
    if (timeSeries.length < 2) return 0;
    const logDivergences: number[] = [];
    for (let i = 1; i < timeSeries.length; i++) {
      const diff = Math.abs(timeSeries[i] - timeSeries[i - 1]);
      if (diff > 0) logDivergences.push(Math.log(diff));
    }
    if (logDivergences.length === 0) return 0;
    return logDivergences.reduce((s, v) => s + v, 0) / logDivergences.length;
  }

  public computeCorrelationDimension(timeSeries: number[]): number {
    if (timeSeries.length < 4) return 0;
    const pairs: number[] = [];
    for (let i = 0; i < timeSeries.length; i++) {
      for (let j = i + 1; j < timeSeries.length; j++) {
        pairs.push(Math.abs(timeSeries[i] - timeSeries[j]));
      }
    }
    const maxDist = Math.max(...pairs);
    if (maxDist === 0) return 0;
    const epsilons = [0.1, 0.3, 0.6, 1.0].map((f) => f * maxDist);
    const counts = epsilons.map((eps) => pairs.filter((d) => d < eps).length);
    const logCounts = counts.map((c) => Math.log(Math.max(c, 1)));
    const logEps = epsilons.map((e) => Math.log(e));
    const n = logCounts.length;
    const sumX = logEps.reduce((s, v) => s + v, 0);
    const sumY = logCounts.reduce((s, v) => s + v, 0);
    const sumXY = logEps.reduce((s, v, i) => s + v * logCounts[i], 0);
    const sumXX = logEps.reduce((s, v) => s + v * v, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return Math.max(0, slope);
  }

  public setSensitivity(exponent: number): void {
    this._data.sensitivityExponent = Math.max(0, exponent);
  }

  public setAmplificationFactor(factor: number): void {
    this._data.amplificationFactor = Math.max(0, factor);
  }

  public measurePredictabilityHorizon(): number {
    if (this._data.sensitivityExponent === 0) return Infinity;
    return Math.log(this._data.amplificationFactor) / this._data.sensitivityExponent;
  }

  public entropyRate(): number {
    if (this._divergenceHistory.length < 2) return 0;
    let h = 0;
    for (let i = 1; i < this._divergenceHistory.length; i++) {
      const ratio = this._divergenceHistory[i] / Math.max(this._divergenceHistory[i - 1], 1e-10);
      if (ratio > 0) h += Math.log(ratio);
    }
    return h / (this._divergenceHistory.length - 1);
  }

  public calmdown(): void {
    this._stormTriggered = false;
    this._divergenceHistory = [];
  }

  public butterflyReport(): Record<string, unknown> {
    return {
      butterflyId: this.butterflyId,
      sensitivityExponent: this._data.sensitivityExponent.toFixed(4),
      initialPerturbation: this._data.initialPerturbation.toFixed(6),
      amplificationFactor: this._data.amplificationFactor.toFixed(3),
      stormTriggered: this._stormTriggered,
      outcomeCount: this._outcomes.length,
      predictabilityHorizon: this.measurePredictabilityHorizon().toFixed(2),
      maxLyapunov: this._maxLyapunov.toFixed(4),
      entropyRate: this.entropyRate().toFixed(4),
      divergenceHistoryLength: this._divergenceHistory.length,
      referenceTrajectoryLength: this._referenceTrajectory.length,
    };
  }
}
