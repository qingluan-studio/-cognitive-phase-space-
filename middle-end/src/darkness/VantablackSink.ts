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
  private _kleinNishina: number[][] = [];
  private _blackbodySpectrum: number[] = [];
  private _occupationNumber: number = 0;
  private _fermiLevel: number = 0;

  constructor(config: VantablackConfig) {
    this._config = config;
    this._initKleinNishina();
    this._initBlackbody();
  }

  get eventCount(): number {
    return this._events.length;
  }

  get totalAbsorbed(): number {
    return this._events.reduce((acc, e) => acc + e.absorbed, 0);
  }

  get occupationNumber(): number {
    return this._occupationNumber;
  }

  private _initKleinNishina(): void {
    this._kleinNishina = [];
    const alpha = 0.01;
    for (let theta = 0; theta < 18; theta++) {
      const rad = (theta * 10 * Math.PI) / 180;
      const cos = Math.cos(rad);
      const term1 = 1 / (1 + alpha * (1 - cos));
      const term2 = term1 + cos * cos;
      this._kleinNishina.push([rad, term1 * term2]);
    }
  }

  private _initBlackbody(): void {
    this._blackbodySpectrum = [];
    const h = 6.626e-34;
    const c = 3e8;
    const k = 1.38e-23;
    const T = 300;
    for (let lambdaNm = 300; lambdaNm <= 700; lambdaNm += 25) {
      const lambda = lambdaNm * 1e-9;
      const intensity = (2 * h * c * c) / (Math.pow(lambda, 5) * (Math.exp((h * c) / (lambda * k * T)) - 1));
      this._blackbodySpectrum.push(intensity * 1e-13);
    }
  }

  private _boseEinsteinOccupation(energy: number): number {
    const kT = 0.025;
    return 1 / (Math.exp((energy - this._fermiLevel) / kT) - 1 + 0.001);
  }

  absorb(incoming: number): AbsorptionEvent {
    const crossSection = this._kleinNishina.reduce((sum, [, cs]) => sum + cs, 0) / this._kleinNishina.length;
    const effectiveAbsorption = this._config.absorptionRate * (1 + crossSection * 0.01);
    const absorbed = incoming * effectiveAbsorption;
    const reflected = incoming * this._config.reflectance * (1 - crossSection * 0.005);
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
    this._occupationNumber += this._boseEinsteinOccupation(absorbed);
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

  computeSpectralEfficiency(): number {
    if (this._blackbodySpectrum.length === 0) return 0;
    const avgBB = this._blackbodySpectrum.reduce((a, b) => a + b, 0) / this._blackbodySpectrum.length;
    return avgBB > 0 ? this.averageAbsorption() / avgBB : 0;
  }

  purge(): void {
    this._events = [];
    this._state.purgedAt = Date.now();
    this._occupationNumber = 0;
  }

  report(): Record<string, unknown> {
    return {
      eventCount: this._events.length,
      totalAbsorbed: this.totalAbsorbed,
      capacity: this._capacity,
      state: this._state,
      occupationNumber: this._occupationNumber.toFixed(3),
      spectralEfficiency: this.computeSpectralEfficiency().toFixed(4),
    };
  }
}
