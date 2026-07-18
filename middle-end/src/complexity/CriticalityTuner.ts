import { DataPacket, Signal } from '../shared/types';

export interface CriticalityState {
  controlParameter: number;
  orderParameter: number;
  distanceToCritical: number;
  susceptibility: number;
  correlationLength: number;
  isCritical: boolean;
  timestamp: number;
}

export interface TuningRecord {
  step: number;
  controlParam: number;
  targetDistance: number;
  actualDistance: number;
  adjustment: number;
}

export interface PhaseTransition {
  criticalPoint: number;
  orderParameterJump: number;
  transitionWidth: number;
  hysteresis: number;
}

export class CriticalityTuner {
  private _controlParameter: number;
  private _orderParameter: number;
  private _criticalPoint: number;
  private _susceptibility: number;
  private _correlationLength: number;
  private _targetDistance: number;
  private _tuningGain: number;
  private _history: CriticalityState[];
  private _tuningHistory: TuningRecord[];
  private _timeStep: number;
  private _noiseAmplitude: number;
  private _relaxationRate: number;

  constructor(initialControl: number = 0.5, criticalPoint: number = 0.5) {
    this._controlParameter = initialControl;
    this._orderParameter = 0;
    this._criticalPoint = criticalPoint;
    this._susceptibility = 1;
    this._correlationLength = 1;
    this._targetDistance = 0.05;
    this._tuningGain = 0.1;
    this._history = [];
    this._tuningHistory = [];
    this._timeStep = 0;
    this._noiseAmplitude = 0.02;
    this._relaxationRate = 0.3;
  }

  get controlParameter(): number { return this._controlParameter; }
  get orderParameter(): number { return this._orderParameter; }
  get criticalPoint(): number { return this._criticalPoint; }
  get susceptibility(): number { return this._susceptibility; }
  get correlationLength(): number { return this._correlationLength; }
  get distanceToCritical(): number { return Math.abs(this._controlParameter - this._criticalPoint); }
  get targetDistance(): number { return this._targetDistance; }
  get tuningGain(): number { return this._tuningGain; }

  public setCriticalPoint(point: number): void {
    this._criticalPoint = Math.max(0, Math.min(1, point));
  }

  public setTargetDistance(distance: number): void {
    this._targetDistance = Math.max(0.001, Math.min(1, distance));
  }

  public setTuningGain(gain: number): void {
    this._tuningGain = Math.max(0.001, Math.min(1, gain));
  }

  public setNoiseAmplitude(amplitude: number): void {
    this._noiseAmplitude = Math.max(0, amplitude);
  }

  public setRelaxationRate(rate: number): void {
    this._relaxationRate = Math.max(0, Math.min(1, rate));
  }

  public setControlParameter(value: number): void {
    this._controlParameter = Math.max(0, Math.min(1, value));
    this._updateOrderParameter();
  }

  private _updateOrderParameter(): void {
    const delta = this._controlParameter - this._criticalPoint;

    if (delta > 0) {
      this._orderParameter = Math.pow(delta, 0.5);
    } else {
      this._orderParameter = 0;
    }

    const noise = (Math.random() * 2 - 1) * this._noiseAmplitude;
    this._orderParameter = Math.max(0, Math.min(1, this._orderParameter + noise));

    const absDelta = Math.abs(delta);
    this._susceptibility = 1 / Math.max(absDelta, 0.001);
    this._susceptibility = Math.min(this._susceptibility, 1000);

    this._correlationLength = 1 / Math.max(absDelta, 0.001);
    this._correlationLength = Math.min(this._correlationLength, 100);
  }

  public tune(): TuningRecord {
    this._timeStep++;

    const currentDistance = this.distanceToCritical;
    const error = this._targetDistance - currentDistance;

    let adjustment = 0;
    if (this._controlParameter < this._criticalPoint) {
      adjustment = this._tuningGain * Math.sign(error);
    } else {
      adjustment = -this._tuningGain * Math.sign(error);
    }

    adjustment += (Math.random() * 2 - 1) * this._noiseAmplitude * 0.1;

    const oldControl = this._controlParameter;
    this._controlParameter = Math.max(0, Math.min(1, this._controlParameter + adjustment));
    this._updateOrderParameter();

    const record: TuningRecord = {
      step: this._timeStep,
      controlParam: this._controlParameter,
      targetDistance: this._targetDistance,
      actualDistance: this.distanceToCritical,
      adjustment: this._controlParameter - oldControl
    };

    this._tuningHistory.push(record);
    this._recordState();
    return record;
  }

  private _recordState(): void {
    const state: CriticalityState = {
      controlParameter: this._controlParameter,
      orderParameter: this._orderParameter,
      distanceToCritical: this.distanceToCritical,
      susceptibility: this._susceptibility,
      correlationLength: this._correlationLength,
      isCritical: this.isAtCriticality(),
      timestamp: this._timeStep
    };
    this._history.push(state);
  }

  public runTuning(steps: number): TuningRecord[] {
    const records: TuningRecord[] = [];
    for (let i = 0; i < steps; i++) {
      records.push(this.tune());
    }
    return records;
  }

  public isAtCriticality(tolerance: number = 0.1): boolean {
    return this.distanceToCritical < tolerance * this._criticalPoint;
  }

  public findPhaseTransition(
    startParam: number = 0,
    endParam: number = 1,
    steps: number = 100
  ): PhaseTransition {
    const orderParams: number[] = [];
    const controlParams: number[] = [];

    for (let i = 0; i <= steps; i++) {
      const param = startParam + (endParam - startParam) * i / steps;
      this._controlParameter = param;
      this._updateOrderParameter();
      orderParams.push(this._orderParameter);
      controlParams.push(param);
    }

    let maxChange = 0;
    let criticalIdx = 0;
    for (let i = 1; i < orderParams.length; i++) {
      const change = Math.abs(orderParams[i] - orderParams[i - 1]);
      if (change > maxChange) {
        maxChange = change;
        criticalIdx = i;
      }
    }

    const orderJump = maxChange;
    const transitionWidth = orderJump > 0 ? 1 / orderJump : 1;

    const forwardPeak = controlParams[criticalIdx];
    let backwardPeak = controlParams[criticalIdx];
    for (let i = orderParams.length - 2; i >= 0; i--) {
      const change = Math.abs(orderParams[i] - orderParams[i + 1]);
      if (change > maxChange * 0.8) {
        backwardPeak = controlParams[i];
        break;
      }
    }
    const hysteresis = Math.abs(forwardPeak - backwardPeak);

    return {
      criticalPoint: controlParams[criticalIdx],
      orderParameterJump: orderJump,
      transitionWidth,
      hysteresis
    };
  }

  public calculateSpecificHeat(): number {
    if (this._history.length < 2) return 0;
    const recent = this._history.slice(-10);
    let variance = 0;
    const mean = recent.reduce((s, r) => s + r.orderParameter, 0) / recent.length;
    for (const r of recent) {
      variance += (r.orderParameter - mean) ** 2;
    }
    return variance / recent.length;
  }

  public criticalExponent(): number {
    const delta = this.distanceToCritical;
    if (delta < 0.01) return 0.5;
    return Math.log(Math.max(this._orderParameter, 1e-10)) / Math.log(delta);
  }

  public scaleFreeRegion(): { lower: number; upper: number } {
    const criticalPoint = this._criticalPoint;
    const width = this._susceptibility > 0 ? 1 / this._susceptibility : 0.1;
    return {
      lower: criticalPoint - width,
      upper: criticalPoint + width
    };
  }

  public selfOrganizedCriticality(perturbation: number): number {
    const oldDistance = this.distanceToCritical;
    this._controlParameter += perturbation;
    this._controlParameter = Math.max(0, Math.min(1, this._controlParameter));
    this._updateOrderParameter();
    const newDistance = this.distanceToCritical;
    return newDistance - oldDistance;
  }

  public avalancheDistribution(threshold: number = 0.1): number[] {
    const sizes: number[] = [];
    let currentSize = 0;

    for (const state of this._history) {
      if (state.orderParameter > threshold) {
        currentSize++;
      } else if (currentSize > 0) {
        sizes.push(currentSize);
        currentSize = 0;
      }
    }
    if (currentSize > 0) sizes.push(currentSize);
    return sizes;
  }

  public criticalityToPacket(): DataPacket<Signal> {
    return {
      id: `criticality-${Date.now()}`,
      payload: {
        source: 'criticality-tuner',
        magnitude: this.distanceToCritical,
        entropy: this._susceptibility / 100,
        timestamp: Date.now()
      },
      metadata: {
        createdAt: Date.now(),
        route: ['complexity', 'criticality'],
        priority: 0.7,
        phase: 'tuning'
      }
    };
  }

  public reset(): void {
    this._controlParameter = 0.5;
    this._orderParameter = 0;
    this._susceptibility = 1;
    this._correlationLength = 1;
    this._history = [];
    this._tuningHistory = [];
    this._timeStep = 0;
  }

  public getHistory(): CriticalityState[] {
    return [...this._history];
  }

  public getTuningHistory(): TuningRecord[] {
    return [...this._tuningHistory];
  }
}
