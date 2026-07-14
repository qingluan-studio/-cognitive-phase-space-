export interface LoopSegment {
  id: string;
  duration: number;
  dutyCycle: number;
  phase: number;
  amplitude: number;
}

export interface LoopState {
  active: boolean;
  currentSegment: string;
  period: number;
  stability: number;
  pidOutput: number;
}

export class LiturgicalLoop {
  private _segments: Map<string, LoopSegment> = new Map();
  private _sequence: string[] = [];
  private _currentIndex: number = 0;
  private _state: Record<string, unknown> = {};
  private _pid: { kp: number; ki: number; kd: number; integral: number; prevError: number } = {
    kp: 1,
    ki: 0.1,
    kd: 0.05,
    integral: 0,
    prevError: 0,
  };
  private _phaseLocked: boolean = false;
  private _lockCount: number = 0;

  constructor() {}

  get segmentCount(): number {
    return this._segments.size;
  }

  get currentSegmentId(): string {
    return this._sequence[this._currentIndex] ?? '';
  }

  addSegment(id: string, duration: number, dutyCycle: number, amplitude: number): void {
    this._segments.set(id, { id, duration, dutyCycle, phase: 0, amplitude });
  }

  setSequence(ids: string[]): void {
    this._sequence = [...ids];
    this._currentIndex = 0;
  }

  step(dt: number): LoopState {
    const id = this._sequence[this._currentIndex];
    const segment = this._segments.get(id);
    if (!segment) {
      return { active: false, currentSegment: '', period: 0, stability: 0, pidOutput: 0 };
    }
    segment.phase += dt;
    const targetPhase = segment.duration * segment.dutyCycle;
    const error = targetPhase - segment.phase;
    this._pid.integral += error * dt;
    const derivative = (error - this._pid.prevError) / dt;
    const pidOutput = this._pid.kp * error + this._pid.ki * this._pid.integral + this._pid.kd * derivative;
    this._pid.prevError = error;
    segment.phase += pidOutput * dt;
    const period = this._sequence.reduce((s, segId) => s + (this._segments.get(segId)?.duration ?? 0), 0);
    const stability = 1 / (1 + Math.abs(error));
    if (Math.abs(error) < 0.01) {
      this._lockCount++;
      if (this._lockCount > 10) this._phaseLocked = true;
    } else {
      this._lockCount = 0;
      this._phaseLocked = false;
    }
    if (segment.phase >= segment.duration) {
      segment.phase = 0;
      this._currentIndex = (this._currentIndex + 1) % this._sequence.length;
    }
    return {
      active: true,
      currentSegment: id,
      period,
      stability,
      pidOutput,
    };
  }

  dutyCycleOf(id: string): number {
    return this._segments.get(id)?.dutyCycle ?? 0;
  }

  averageDutyCycle(): number {
    if (this._segments.size === 0) return 0;
    return Array.from(this._segments.values()).reduce((s, seg) => s + seg.dutyCycle, 0) / this._segments.size;
  }

  totalPeriod(): number {
    return this._sequence.reduce((s, id) => s + (this._segments.get(id)?.duration ?? 0), 0);
  }

  isPhaseLocked(): boolean {
    return this._phaseLocked;
  }

  resetPid(): void {
    this._pid.integral = 0;
    this._pid.prevError = 0;
    this._lockCount = 0;
    this._phaseLocked = false;
  }

  report(): Record<string, unknown> {
    return {
      segments: this._segments.size,
      sequenceLength: this._sequence.length,
      currentIndex: this._currentIndex,
      phaseLocked: this._phaseLocked,
      totalPeriod: this.totalPeriod(),
      state: this._state,
    };
  }
}
