export interface OstinatoPattern {
  id: string;
  name: string;
  interval: number;
  steps: Record<string, unknown>[];
  iterations: number;
  phaseOffset: number;
  harmonicRatio: number;
}

export interface LoopCycle {
  id: string;
  patternId: string;
  startedAt: number;
  stepIndex: number;
  completed: boolean;
  phase: number;
  drift: number;
}

export interface BaselineReading {
  patternId: string;
  timestamp: number;
  value: number;
  stable: boolean;
  phase: number;
  trend: number;
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
  private _historyDepth = 50;
  private _trendWindow = 5;

  registerPattern(name: string, interval: number, steps: Record<string, unknown>[], phaseOffset: number = 0, harmonicRatio: number = 1): OstinatoPattern {
    if (interval <= 0 || steps.length === 0 || harmonicRatio <= 0) throw new Error('Invalid pattern parameters');
    const id = `pattern-${++this._idCounter}-${Date.now()}`;
    const pattern: OstinatoPattern = { id, name, interval, steps: [...steps], iterations: 0, phaseOffset: phaseOffset % (2 * Math.PI), harmonicRatio };
    this._patterns.set(id, pattern);
    return pattern;
  }

  startLoop(patternId: string): LoopCycle {
    const pattern = this._patterns.get(patternId);
    if (!pattern) throw new Error(`Pattern not found: ${patternId}`);
    this.stopLoop();
    const cycle: LoopCycle = { id: `cycle-${++this._idCounter}-${Date.now()}`, patternId, startedAt: Date.now(), stepIndex: 0, completed: false, phase: pattern.phaseOffset, drift: 0 };
    this._cycles.set(cycle.id, cycle);
    this._activeCycleId = cycle.id;
    this._timer = setInterval(() => this._tick(), pattern.interval / pattern.harmonicRatio);
    return cycle;
  }

  stopLoop(): void {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    if (this._activeCycleId) { const cycle = this._cycles.get(this._activeCycleId); if (cycle) cycle.completed = true; }
    this._activeCycleId = null;
  }

  readBaseline(): BaselineReading {
    const cycleId = this._activeCycleId;
    const patternId = cycleId ? this._cycles.get(cycleId)?.patternId ?? 'none' : 'none';
    const cycle = cycleId ? this._cycles.get(cycleId) : null;
    const pattern = patternId !== 'none' ? this._patterns.get(patternId) : null;
    const noise = (Math.random() - 0.5) * 0.05;
    const value = this._baselineValue + noise + (pattern ? Math.sin(cycle!.phase) * 0.02 : 0);
    const reading: BaselineReading = { patternId, timestamp: Date.now(), value, stable: Math.abs(value - this._baselineValue) <= this._stabilityThreshold, phase: cycle?.phase ?? 0, trend: this._computeTrend(value) };
    this._readings.push(reading);
    if (this._readings.length > this._historyDepth) this._readings.shift();
    return reading;
  }

  calibrateBaseline(value: number): void {
    this._baselineValue = value;
    const recent = this._readings.slice(-10);
    if (recent.length > 0) this._stabilityThreshold = Math.abs(recent.reduce((s, r) => s + r.value, 0) / recent.length - value) * 2;
  }

  setStabilityThreshold(t: number): void { if (t < 0) throw new Error('Threshold must be non-negative'); this._stabilityThreshold = t; }
  setHistoryDepth(d: number): void { if (d < 10) throw new Error('History depth must be at least 10'); this._historyDepth = d; }
  getPattern(id: string): OstinatoPattern | undefined { return this._patterns.get(id); }
  getActiveCycle(): LoopCycle | null { return this._activeCycleId ? this._cycles.get(this._activeCycleId) || null : null; }

  getStabilityScore(): number {
    const recent = this._readings.slice(-this._trendWindow);
    if (recent.length < 2) return 1;
    const values = recent.map(r => r.value);
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
    const drift = Math.abs(values[values.length - 1] - values[0]) / Math.max(Math.abs(values[0]), 0.001);
    const phaseCoherence = this._computePhaseCoherence();
    return Math.max(0, (1 - variance) * (1 - drift) * phaseCoherence);
  }

  get patterns(): OstinatoPattern[] { return Array.from(this._patterns.values()); }
  get cycles(): LoopCycle[] { return Array.from(this._cycles.values()); }
  get readings(): BaselineReading[] { return [...this._readings]; }
  get baselineValue(): number { return this._baselineValue; }
  get isLooping(): boolean { return this._timer !== null; }
  get stabilityThreshold(): number { return this._stabilityThreshold; }
  get historyDepth(): number { return this._historyDepth; }

  private _tick(): void {
    if (!this._activeCycleId) return;
    const cycle = this._cycles.get(this._activeCycleId);
    const pattern = cycle ? this._patterns.get(cycle.patternId) : null;
    if (!cycle || !pattern) return;
    const stepCount = pattern.steps.length;
    cycle.phase = (cycle.phase + (2 * Math.PI) / (stepCount * pattern.harmonicRatio)) % (2 * Math.PI);
    cycle.stepIndex = Math.floor((cycle.phase / (2 * Math.PI)) * stepCount);
    if (cycle.stepIndex === 0) {
      pattern.iterations++;
      const expected = pattern.interval * stepCount;
      cycle.drift = Math.abs(Date.now() - cycle.startedAt - expected) / expected;
      cycle.startedAt = Date.now();
    }
    this.readBaseline();
  }

  private _computeTrend(currentValue: number): number {
    const recent = this._readings.slice(-this._trendWindow);
    if (recent.length < 2) return 0;
    const values = recent.map(r => r.value);
    const n = values.length;
    const sumX = values.reduce((s, _, i) => s + i, 0);
    const sumY = values.reduce((s, v) => s + v, 0);
    const sumXY = values.reduce((s, v, i) => s + i * v, 0);
    const sumX2 = values.reduce((s, _, i) => s + i * i, 0);
    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  private _computePhaseCoherence(): number {
    const cycle = this.getActiveCycle();
    if (!cycle) return 1;
    const pattern = this._patterns.get(cycle.patternId);
    if (!pattern) return 1;
    const expected = (cycle.stepIndex / pattern.steps.length) * 2 * Math.PI + pattern.phaseOffset;
    const diff = Math.abs(cycle.phase - expected) / (2 * Math.PI);
    return 1 - Math.min(diff, 1 - diff);
  }
}