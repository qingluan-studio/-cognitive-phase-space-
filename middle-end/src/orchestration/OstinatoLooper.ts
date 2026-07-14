/** 固定音型循环器 - 将稳定的后端心跳循环播放以维持基线 */

export interface OstinatoPattern {
  id: string;
  name: string;
  interval: number;
  steps: Record<string, unknown>[];
  iterations: number;
}

export interface LoopCycle {
  id: string;
  patternId: string;
  startedAt: number;
  stepIndex: number;
  completed: boolean;
}

export interface BaselineReading {
  patternId: string;
  timestamp: number;
  value: number;
  stable: boolean;
}

export class OstinatoLooper {
  private _patterns: Map<string, OstinatoPattern> = new Map();
  private _cycles: Map<string, LoopCycle> = new Map();
  private _readings: BaselineReading[] = [];
  private _activeCycleId: string | null = null;
  private _timer: ReturnType<typeof setInterval> | null = null;
  private _idCounter = 0;
  private _baselineValue = 1;
  private _stabilityThreshold = 0.1;

  registerPattern(name: string, interval: number, steps: Record<string, unknown>[]): OstinatoPattern {
    if (interval <= 0) throw new Error('Interval must be positive');
    if (steps.length === 0) throw new Error('Pattern needs at least one step');
    const id = `pattern-${++this._idCounter}-${Date.now()}`;
    const pattern: OstinatoPattern = {
      id,
      name,
      interval,
      steps: [...steps],
      iterations: 0,
    };
    this._patterns.set(id, pattern);
    return pattern;
  }

  startLoop(patternId: string): LoopCycle {
    const pattern = this._patterns.get(patternId);
    if (!pattern) throw new Error(`Pattern not found: ${patternId}`);
    this.stopLoop();
    const cycle: LoopCycle = {
      id: `cycle-${++this._idCounter}-${Date.now()}`,
      patternId,
      startedAt: Date.now(),
      stepIndex: 0,
      completed: false,
    };
    this._cycles.set(cycle.id, cycle);
    this._activeCycleId = cycle.id;
    this._timer = setInterval(() => this._tick(), pattern.interval);
    return cycle;
  }

  stopLoop(): void {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    if (this._activeCycleId) {
      const cycle = this._cycles.get(this._activeCycleId);
      if (cycle) cycle.completed = true;
    }
    this._activeCycleId = null;
  }

  readBaseline(): BaselineReading {
    const cycleId = this._activeCycleId;
    const patternId = cycleId ? this._cycles.get(cycleId)?.patternId ?? 'none' : 'none';
    const value = this._baselineValue + (Math.random() - 0.5) * 0.05;
    const stable = Math.abs(value - this._baselineValue) <= this._stabilityThreshold;
    const reading: BaselineReading = {
      patternId,
      timestamp: Date.now(),
      value,
      stable,
    };
    this._readings.push(reading);
    return reading;
  }

  calibrateBaseline(value: number): void {
    this._baselineValue = value;
  }

  setStabilityThreshold(t: number): void {
    if (t < 0) throw new Error('Threshold must be non-negative');
    this._stabilityThreshold = t;
  }

  getPattern(id: string): OstinatoPattern | undefined {
    return this._patterns.get(id);
  }

  getActiveCycle(): LoopCycle | null {
    if (!this._activeCycleId) return null;
    return this._cycles.get(this._activeCycleId) || null;
  }

  get patterns(): OstinatoPattern[] {
    return Array.from(this._patterns.values());
  }

  get cycles(): LoopCycle[] {
    return Array.from(this._cycles.values());
  }

  get readings(): BaselineReading[] {
    return [...this._readings];
  }

  get baselineValue(): number {
    return this._baselineValue;
  }

  get isLooping(): boolean {
    return this._timer !== null;
  }

  get stabilityThreshold(): number {
    return this._stabilityThreshold;
  }

  private _tick(): void {
    if (!this._activeCycleId) return;
    const cycle = this._cycles.get(this._activeCycleId);
    if (!cycle) return;
    const pattern = this._patterns.get(cycle.patternId);
    if (!pattern) return;
    cycle.stepIndex = (cycle.stepIndex + 1) % pattern.steps.length;
    if (cycle.stepIndex === 0) pattern.iterations++;
    this.readBaseline();
  }
}
