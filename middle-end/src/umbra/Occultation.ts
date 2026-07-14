/**
 * 掩星模块：一个天体被另一个天体遮掩的天文现象。
 * 用于刻画系统中对象被另一对象临时遮蔽的检测与跟踪。
 */

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

  constructor(config: OccultationConfig) {
    this._config = config;
  }

  get eventCount(): number {
    return this._events.length;
  }

  detect(occulted: string, occulting: string, duration: number, magnitude: number): OccultationEvent | null {
    if (magnitude < this._config.detectionThreshold) return null;
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
    this._state.resetAt = Date.now();
  }

  report(): Record<string, unknown> {
    return {
      eventCount: this._events.length,
      track: this._track,
      state: this._state,
    };
  }
}
