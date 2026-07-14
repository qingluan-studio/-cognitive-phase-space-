/**
 * ButterflyEffect - 蝴蝶效应
 * 微小的原因引发巨大的突变，混沌系统对初始条件极端敏感，
 * 翅膀的微小扇动可引发远处的风暴。
 */

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
}

export class ButterflyEffect {
  private _data: ButterflyEffectData;
  private _outcomes: PerturbationOutcome[] = [];
  private _divergenceHistory: number[] = [];
  private _stormTriggered: boolean = false;
  private _referenceTrajectory: number[] = [];

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

  public setReferenceTrajectory(trajectory: number[]): void {
    this._referenceTrajectory = [...trajectory];
  }

  public flap(wingAmplitude: number, steps: number): PerturbationOutcome {
    const amplified = wingAmplitude * Math.exp(this._data.sensitivityExponent * steps * 0.1);
    const totalAmplification = amplified / Math.max(0.0001, wingAmplitude);
    const exceeded = amplified > this._data.amplificationFactor;
    if (exceeded) {
      this._stormTriggered = true;
    }
    this._divergenceHistory.push(amplified);
    if (this._divergenceHistory.length > 50) {
      this._divergenceHistory.shift();
    }
    const outcome: PerturbationOutcome = {
      perturbation: wingAmplitude,
      evolvedValue: amplified,
      amplification: totalAmplification,
      exceededThreshold: exceeded,
    };
    this._outcomes.push(outcome);
    if (this._outcomes.length > 30) {
      this._outcomes.shift();
    }
    return outcome;
  }

  public compareTrajectories(perturbed: number[]): number {
    const minLen = Math.min(this._referenceTrajectory.length, perturbed.length);
    if (minLen === 0) {
      return 0;
    }
    let sumSquaredDiff = 0;
    for (let i = 0; i < minLen; i++) {
      const diff = this._referenceTrajectory[i] - perturbed[i];
      sumSquaredDiff += diff * diff;
    }
    return Math.sqrt(sumSquaredDiff / minLen);
  }

  public setSensitivity(exponent: number): void {
    this._data.sensitivityExponent = Math.max(0, exponent);
  }

  public setAmplificationFactor(factor: number): void {
    this._data.amplificationFactor = Math.max(0, factor);
  }

  public computeLyapunovExponent(timeSeries: number[]): number {
    if (timeSeries.length < 2) {
      return 0;
    }
    const logDivergences: number[] = [];
    for (let i = 1; i < timeSeries.length; i++) {
      const diff = Math.abs(timeSeries[i] - timeSeries[i - 1]);
      if (diff > 0) {
        logDivergences.push(Math.log(diff));
      }
    }
    if (logDivergences.length === 0) {
      return 0;
    }
    return logDivergences.reduce((s, v) => s + v, 0) / logDivergences.length;
  }

  public measurePredictabilityHorizon(): number {
    if (this._data.sensitivityExponent === 0) {
      return Infinity;
    }
    return Math.log(this._data.amplificationFactor) / this._data.sensitivityExponent;
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
      divergenceHistoryLength: this._divergenceHistory.length,
      referenceTrajectoryLength: this._referenceTrajectory.length,
    };
  }
}
