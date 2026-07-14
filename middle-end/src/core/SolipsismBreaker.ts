/** 唯我论破坏者 - 定期制造外部性冲击，防止陷入自我闭环幻觉 */

export interface ExternalShock {
  id: string;
  source: string;
  intensity: number;
  payload: Record<string, unknown>;
  deliveredAt: number;
  acknowledged: boolean;
}

export interface SelfLoopSignal {
  id: string;
  loopDepth: number;
  detectedAt: number;
  description: string;
}

export interface BreakerConfig {
  shockInterval: number;
  minIntensity: number;
  maxIntensity: number;
  autoBreak: boolean;
}

export class SolipsismBreaker {
  private _shocks: ExternalShock[] = [];
  private _loopSignals: SelfLoopSignal[] = [];
  private _config: BreakerConfig;
  private _idCounter = 0;
  private _lastShockAt = 0;
  private _externalSources: Set<string> = new Set();
  private _timer: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<BreakerConfig> = {}) {
    this._config = {
      shockInterval: 60000,
      minIntensity: 0.1,
      maxIntensity: 1.0,
      autoBreak: true,
      ...config,
    };
  }

  registerExternalSource(source: string): void {
    this._externalSources.add(source);
  }

  unregisterExternalSource(source: string): void {
    this._externalSources.delete(source);
  }

  deliverShock(source: string, payload: Record<string, unknown>, intensity?: number): ExternalShock {
    const resolvedIntensity = intensity ?? this._randomIntensity();
    if (resolvedIntensity < this._config.minIntensity || resolvedIntensity > this._config.maxIntensity) {
      throw new Error('Intensity out of configured bounds');
    }
    const shock: ExternalShock = {
      id: `shock-${++this._idCounter}-${Date.now()}`,
      source,
      intensity: resolvedIntensity,
      payload,
      deliveredAt: Date.now(),
      acknowledged: false,
    };
    this._shocks.push(shock);
    this._lastShockAt = shock.deliveredAt;
    return shock;
  }

  acknowledgeShock(shockId: string): boolean {
    const shock = this._shocks.find(s => s.id === shockId);
    if (!shock) return false;
    shock.acknowledged = true;
    return true;
  }

  detectSelfLoop(depth: number, description: string): SelfLoopSignal {
    const signal: SelfLoopSignal = {
      id: `loop-${++this._idCounter}-${Date.now()}`,
      loopDepth: depth,
      detectedAt: Date.now(),
      description,
    };
    this._loopSignals.push(signal);
    if (this._config.autoBreak && depth >= 3) {
      this.deliverShock('self-loop-breaker', { trigger: signal.id }, this._config.maxIntensity);
    }
    return signal;
  }

  startAutoShock(): void {
    if (this._timer) return;
    this._timer = setInterval(() => {
      if (this._externalSources.size === 0) return;
      const sources = Array.from(this._externalSources);
      const source = sources[Math.floor(Math.random() * sources.length)];
      this.deliverShock(source, { auto: true, tick: Date.now() });
    }, this._config.shockInterval);
  }

  stopAutoShock(): void {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  isolationIndex(): number {
    if (this._shocks.length === 0) return 1;
    const acknowledged = this._shocks.filter(s => s.acknowledged).length;
    return 1 - acknowledged / this._shocks.length;
  }

  updateConfig(config: Partial<BreakerConfig>): void {
    this._config = { ...this._config, ...config };
  }

  get shocks(): ExternalShock[] {
    return [...this._shocks];
  }

  get loopSignals(): SelfLoopSignal[] {
    return [...this._loopSignals];
  }

  get config(): BreakerConfig {
    return { ...this._config };
  }

  get externalSourceCount(): number {
    return this._externalSources.size;
  }

  get lastShockAt(): number {
    return this._lastShockAt;
  }

  private _randomIntensity(): number {
    const range = this._config.maxIntensity - this._config.minIntensity;
    return this._config.minIntensity + Math.random() * range;
  }
}
