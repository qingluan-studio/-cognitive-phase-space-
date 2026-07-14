export type DivergenceStrategy = 'gaussian' | 'uniform' | 'levy' | 'burst';

export interface DivergenceEvent {
  iteration: number;
  convergedPoint: number;
  divergedPoint: number;
  magnitude: number;
  strategy: DivergenceStrategy;
  varianceRatio: number;
}

export interface DivergenceConfig {
  strategy: DivergenceStrategy;
  triggerThreshold: number;
  magnitude: number;
  cooldownSteps: number;
  adaptive: boolean;
}

export class StochasticDivergence {
  private _config: DivergenceConfig;
  private _events: DivergenceEvent[] = [];
  private _lastDivergenceStep = -Infinity;
  private _convergenceHistory: number[] = [];
  private _magnitudeHistory: number[] = [];
  private _windowSize = 10;

  constructor(config?: Partial<DivergenceConfig>) {
    this._config = {
      strategy: config?.strategy ?? 'gaussian',
      triggerThreshold: config?.triggerThreshold ?? 0.01,
      magnitude: config?.magnitude ?? 1.0,
      cooldownSteps: config?.cooldownSteps ?? 10,
      adaptive: config?.adaptive ?? true,
    };
  }

  observe(point: number, iteration: number): DivergenceEvent | null {
    this._convergenceHistory.push(point);
    if (this._convergenceHistory.length > 50) this._convergenceHistory.shift();

    if (this._convergenceHistory.length < this._windowSize) return null;
    if (iteration - this._lastDivergenceStep < this._config.cooldownSteps) return null;
    const varianceRatio = this._varianceRatioTest();
    if (varianceRatio > this._config.triggerThreshold) return null;

    return this._diverge(point, iteration, varianceRatio);
  }

  forceDiverge(point: number, iteration: number): DivergenceEvent {
    const vr = this._varianceRatioTest();
    return this._diverge(point, iteration, vr);
  }

  private _diverge(point: number, iteration: number, varianceRatio: number): DivergenceEvent {
    const adaptiveMag = this._config.adaptive
      ? this._config.magnitude * (1 + Math.abs(varianceRatio - this._config.triggerThreshold) * 10)
      : this._config.magnitude;
    const magnitude = adaptiveMag * this._sampleMagnitude();
    const divergedPoint = point + magnitude;
    const event: DivergenceEvent = {
      iteration,
      convergedPoint: point,
      divergedPoint,
      magnitude,
      strategy: this._config.strategy,
      varianceRatio,
    };
    this._events.push(event);
    if (this._events.length > 100) this._events.shift();
    this._magnitudeHistory.push(Math.abs(magnitude));
    if (this._magnitudeHistory.length > 32) this._magnitudeHistory.shift();
    this._lastDivergenceStep = iteration;
    return event;
  }

  setStrategy(strategy: DivergenceStrategy): void {
    this._config.strategy = strategy;
  }

  setMagnitude(m: number): void {
    this._config.magnitude = Math.max(0, m);
  }

  getEvents(): DivergenceEvent[] { return [...this._events]; }
  get divergenceCount(): number { return this._events.length; }
  get averageMagnitude(): number {
    if (this._magnitudeHistory.length === 0) return 0;
    return this._magnitudeHistory.reduce((s, v) => s + v, 0) / this._magnitudeHistory.length;
  }

  private _varianceRatioTest(): number {
    if (this._convergenceHistory.length < this._windowSize * 2) {
      const recent = this._convergenceHistory.slice(-this._windowSize);
      return this._stdDev(recent);
    }
    const recent = this._convergenceHistory.slice(-this._windowSize);
    const prior = this._convergenceHistory.slice(-this._windowSize * 2, -this._windowSize);
    const v1 = this._variance(recent);
    const v2 = this._variance(prior);
    if (v2 === 0) return v1;
    return v1 / v2;
  }

  private _variance(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    return values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
  }

  private _stdDev(values: number[]): number {
    return Math.sqrt(this._variance(values));
  }

  private _sampleMagnitude(): number {
    switch (this._config.strategy) {
      case 'gaussian': return this._gaussian();
      case 'uniform': return Math.random() * 2 - 1;
      case 'levy': return this._gaussian() / Math.max(0.01, Math.random());
      case 'burst': return Math.random() < 0.1 ? 5 : 0;
    }
  }

  private _gaussian(): number {
    const u1 = Math.max(1e-9, Math.random());
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
}
