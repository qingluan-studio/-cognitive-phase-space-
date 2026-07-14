export interface OccultationEvent {
  id: number;
  occulted: string;
  occulting: string;
  startTime: number;
  duration: number;
  magnitude: number;
}

export type OccultationTrack = {
  events: number;
  totalObscuredTime: number;
  maxMagnitude: number;
};

export interface OccultationConfig {
  maxEvents: number;
  detectionThreshold: number;
}

export class Occultation {
  private _config: OccultationConfig;
  private _events: OccultationEvent[] = [];
  private _nextId: number = 0;
  private _track: OccultationTrack | null = null;
  private _state: Record<string, unknown> = {};
  private _besselElements: Map<number, number[]> = new Map();
  private _lightCurve: { time: number; flux: number }[] = [];

  constructor(config: OccultationConfig) {
    this._config = config;
  }

  get eventCount(): number {
    return this._events.length;
  }

  detect(occulted: string, occulting: string, duration: number, magnitude: number): OccultationEvent | null {
    if (magnitude < this._config.detectionThreshold) return null;
    const geometricDepth = Math.min(1, magnitude / 10);
    const fluxDrop = 1 - Math.pow(1 - geometricDepth, 2);
    const event: OccultationEvent = {
      id: this._nextId++,
      occulted,
      occulting,
      startTime: Date.now(),
      duration,
      magnitude,
    };
    this._events.push(event);
    if (this._events.length > this._config.maxEvents) {
      this._events.shift();
    }
    this._lightCurve.push({ time: event.startTime, flux: 1 - fluxDrop });
    if (this._lightCurve.length > 100) this._lightCurve.shift();
    this._besselElements.set(event.id, [duration, magnitude, geometricDepth]);
    this._state.lastDetection = event.id;
    return event;
  }

  computeTrack(): OccultationTrack {
    const totalObscuredTime = this._events.reduce((acc, e) => acc + e.duration, 0);
    const maxMagnitude =
      this._events.length > 0 ? Math.max(...this._events.map((e) => e.magnitude)) : 0;
    this._track = {
      events: this._events.length,
      totalObscuredTime,
      maxMagnitude,
    };
    return this._track;
  }

  isActive(eventId: number): boolean {
    const event = this._events.find((e) => e.id === eventId);
    if (!event) return false;
    return Date.now() - event.startTime < event.duration;
  }

  activeCount(): number {
    return this._events.filter((e) => this.isActive(e.id)).length;
  }

  filterByOcculted(name: string): OccultationEvent[] {
    return this._events.filter((e) => e.occulted === name);
  }

  strongestEvent(): OccultationEvent | null {
    if (this._events.length === 0) return null;
    return this._events.reduce((best, e) => (e.magnitude > best.magnitude ? e : best));
  }

  setThreshold(threshold: number): void {
    this._config.detectionThreshold = threshold;
    this._state.thresholdUpdated = threshold;
  }

  reset(): void {
    this._events = [];
    this._lightCurve = [];
    this._besselElements.clear();
    this._state.resetAt = Date.now();
  }

  report(): Record<string, unknown> {
    return {
      eventCount: this._events.length,
      track: this._track,
      state: this._state,
    };
  }

  computeBesselianElements(eventId: number): number[] | null {
    return this._besselElements.get(eventId) ?? null;
  }

  fitLightCurve(): { ingress: number; egress: number; depth: number } | null {
    if (this._lightCurve.length < 3) return null;
    const baseline = 1;
    let ingress = 0;
    let egress = 0;
    let minFlux = baseline;
    for (const point of this._lightCurve) {
      if (point.flux < minFlux) minFlux = point.flux;
    }
    const depth = baseline - minFlux;
    const halfDepth = baseline - depth / 2;
    for (let i = 0; i < this._lightCurve.length; i++) {
      if (this._lightCurve[i].flux <= halfDepth && ingress === 0) ingress = this._lightCurve[i].time;
      if (this._lightCurve[i].flux <= halfDepth) egress = this._lightCurve[i].time;
    }
    return { ingress, egress, depth };
  }

  computeDutyCycle(): number {
    const totalDuration = this._events.reduce((a, e) => a + e.duration, 0);
    if (this._events.length === 0) return 0;
    const span = Date.now() - Math.min(...this._events.map(e => e.startTime));
    return span > 0 ? totalDuration / span : 0;
  }
}
