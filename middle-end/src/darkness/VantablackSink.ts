/**
 * 梵塔黑阱模块：吸收几乎所有入射光线与信息，几乎不反射。
 * 用于建模极致的信息吞噬与不可观测区域。
 */

export interface AbsorptionEvent {
  id: number;
  incoming: number;
  absorbed: number;
  reflected: number;
}

export type SinkCapacity = {
  totalAbsorbed: number;
  reflectance: number;
  saturation: number;
};

export interface VantablackConfig {
  reflectance: number;
  maxCapacity: number;
  absorptionRate: number;
}

export class VantablackSink {
  private _config: VantablackConfig;
  private _events: AbsorptionEvent[] = [];
  private _nextId: number = 0;
  private _capacity: SinkCapacity | null = null;
  private _state: Record<string, unknown> = {};

  constructor(config: VantablackConfig) {
    this._config = config;
  }

  get eventCount(): number {
    return this._events.length;
  }

  get totalAbsorbed(): number {
    return this._events.reduce((acc, e) => acc + e.absorbed, 0);
  }

  absorb(incoming: number): AbsorptionEvent {
    const absorbed = incoming * this._config.absorptionRate;
    const reflected = incoming * this._config.reflectance;
    const event: AbsorptionEvent = {
      id: this._nextId++,
      incoming,
      absorbed,
      reflected,
    };
    this._events.push(event);
    if (this._events.length > this._config.maxCapacity) {
      this._events.shift();
    }
    return event;
  }

  computeCapacity(): SinkCapacity {
    const totalAbsorbed = this.totalAbsorbed;
    const totalIncoming = this._events.reduce((acc, e) => acc + e.incoming, 0);
    const reflectance = totalIncoming > 0 ? 1 - totalAbsorbed / totalIncoming : 0;
    const saturation = Math.min(1, this._events.length / this._config.maxCapacity);
    this._capacity = { totalAbsorbed, reflectance, saturation };
    return this._capacity;
  }

  isSaturated(): boolean {
    return this.computeCapacity().saturation >= 0.95;
  }

  tuneReflectance(value: number): void {
    this._config.reflectance = Math.max(0, Math.min(0.01, value));
    this._state.reflectanceTuned = value;
  }

  totalReflectance(): number {
    return this.computeCapacity().reflectance;
  }

  strongestAbsorption(): AbsorptionEvent | null {
    if (this._events.length === 0) return null;
    return this._events.reduce((best, e) => (e.absorbed > best.absorbed ? e : best));
  }

  averageAbsorption(): number {
    if (this._events.length === 0) return 0;
    return this.totalAbsorbed / this._events.length;
  }

  purge(): void {
    this._events = [];
    this._state.purgedAt = Date.now();
  }

  report(): Record<string, unknown> {
    return {
      eventCount: this._events.length,
      totalAbsorbed: this.totalAbsorbed,
      capacity: this._capacity,
      state: this._state,
    };
  }
}
