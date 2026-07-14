/**
 * 随机发散：利用随机性故意偏离收敛点。
 * 在算法趋向收敛时主动注入发散扰动，避免陷入局部最优与思维僵化。
 */

export type DivergenceStrategy = 'gaussian' | 'uniform' | 'levy' | 'burst';

export interface DivergenceEvent {
  iteration: number;
  convergedPoint: number;
  divergedPoint: number;
  magnitude: number;
  strategy: DivergenceStrategy;
}

export interface DivergenceConfig {
  strategy: DivergenceStrategy;
  triggerThreshold: number;
  magnitude: number;
  cooldownSteps: number;
}

export class StochasticDivergence {
  private _config: DivergenceConfig;
  private _events: DivergenceEvent[] = [];
  private _lastDivergenceStep = -Infinity;
  private _convergenceHistory: number[] = [];

  constructor(config?: Partial<DivergenceConfig>) {
    this._config = {
      strategy: config?.strategy ?? 'gaussian',
      triggerThreshold: config?.triggerThreshold ?? 0.01,
      magnitude: config?.magnitude ?? 1.0,
      cooldownSteps: config?.cooldownSteps ?? 10,
    };
  }

  observe(point: number, iteration: number): DivergenceEvent | null {
    this._convergenceHistory.push(point);
    if (this._convergenceHistory.length > 50) this._convergenceHistory.shift();

    if (!this._isConverging()) return null;
    if (iteration - this._lastDivergenceStep < this._config.cooldownSteps) return null;

    return this._diverge(point, iteration);
  }

  forceDiverge(point: number, iteration: number): DivergenceEvent {
    return this._diverge(point, iteration);
  }

  private _diverge(point: number, iteration: number): DivergenceEvent {
    const magnitude = this._config.magnitude * this._sampleMagnitude();
    const divergedPoint = point + magnitude;
    const event: DivergenceEvent = {
      iteration,
      convergedPoint: point,
      divergedPoint,
      magnitude,
      strategy: this._config.strategy,
    };
    this._events.push(event);
    if (this._events.length > 100) this._events.shift();
    this._lastDivergenceStep = iteration;
    return event;
  }

  setStrategy(strategy: DivergenceStrategy): void {
    this._config.strategy = strategy;
  }

  setMagnitude(m: number): void {
    this._config.magnitude = Math.max(0, m);
  }

  getEvents(): DivergenceEvent[] {
    return [...this._events];
  }

  get divergenceCount(): number {
    return this._events.length;
  }

  private _isConverging(): boolean {
    if (this._convergenceHistory.length < 5) return false;
    const recent = this._convergenceHistory.slice(-5);
    let delta = 0;
    for (let i = 1; i < recent.length; i++) {
      delta += Math.abs(recent[i] - recent[i - 1]);
    }
    return delta / (recent.length - 1) < this._config.triggerThreshold;
  }

  private _sampleMagnitude(): number {
    switch (this._config.strategy) {
      case 'gaussian':
        return this._gaussian() ;
      case 'uniform':
        return Math.random() * 2 - 1;
      case 'levy':
        return this._gaussian() / Math.max(0.01, Math.random());
      case 'burst':
        return Math.random() < 0.1 ? 5 : 0;
    }
  }

  private _gaussian(): number {
    const u1 = Math.max(1e-9, Math.random());
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
}
