export interface HomeostaticRange {
  key: string;
  lower: number;
  upper: number;
  tolerance: number;
}

export interface HomeostaticReading {
  id: string;
  key: string;
  value: number;
  timestamp: number;
  deviates: boolean;
  deviation: number;
  zScore: number;
  anomalyScore: number;
}

interface KalmanState {
  mean: number;
  variance: number;
  processNoise: number;
  measurementNoise: number;
  history: number[];
}

export class HomeostaticFilter {
  private _ranges: Map<string, HomeostaticRange> = new Map();
  private _kalmanStates: Map<string, KalmanState> = new Map();
  private _readings: HomeostaticReading[] = [];
  private _passed: HomeostaticReading[] = [];
  private _suppressed = 0;
  private _adaptive = true;
  private _anomalyThreshold = 2.0;
  private _maxHistory = 200;

  setRange(range: HomeostaticRange): void {
    this._ranges.set(range.key, range);
    if (!this._kalmanStates.has(range.key)) {
      const mid = (range.lower + range.upper) / 2;
      const span = (range.upper - range.lower) / 2;
      this._kalmanStates.set(range.key, { mean: mid, variance: span * span * 0.25, processNoise: span * 0.01, measurementNoise: span * 0.05, history: [] });
    }
  }

  setAdaptive(enabled: boolean): void { this._adaptive = enabled; }
  setAnomalyThreshold(z: number): void { this._anomalyThreshold = Math.max(0.5, z); }

  observe(id: string, key: string, value: number): HomeostaticReading | null {
    const range = this._ranges.get(key);
    const now = Date.now();
    if (!range) {
      this._initRange(key, value);
      const reading: HomeostaticReading = { id, key, value, timestamp: now, deviates: true, deviation: 0, zScore: 0, anomalyScore: 0 };
      this._readings.push(reading);
      this._passed.push(reading);
      return reading;
    }
    const state = this._kalmanStates.get(key)!;
    const zScore = this._zScore(value, state);
    const deviation = this._deviation(value, range);
    const anomalyScore = this._anomalyScore(value, state, zScore);
    const deviates = Math.abs(zScore) > this._anomalyThreshold || anomalyScore > 0.7;
    const reading: HomeostaticReading = { id, key, value, timestamp: now, deviates, deviation, zScore, anomalyScore };
    this._updateKalman(state, value);
    state.history.push(value);
    if (state.history.length > this._maxHistory) state.history.shift();
    if (deviates) {
      this._readings.push(reading);
      this._passed.push(reading);
      if (this._adaptive) this._expandRange(range, value, zScore);
      return reading;
    }
    this._suppressed++;
    if (this._adaptive) this._tightenRange(range, state);
    return null;
  }

  private _initRange(key: string, value: number): void {
    this._ranges.set(key, { key, lower: value * 0.5, upper: value * 1.5, tolerance: 0.3 });
    this._kalmanStates.set(key, { mean: value, variance: value * value * 0.1, processNoise: Math.abs(value) * 0.01, measurementNoise: Math.abs(value) * 0.05, history: [value] });
  }

  private _zScore(value: number, state: KalmanState): number {
    const std = Math.sqrt(Math.max(state.variance, 1e-10));
    return (value - state.mean) / std;
  }

  private _deviation(value: number, range: HomeostaticRange): number {
    const mid = (range.lower + range.upper) / 2;
    const halfSpan = (range.upper - range.lower) / 2;
    return halfSpan === 0 ? 0 : (value - mid) / halfSpan;
  }

  private _anomalyScore(value: number, state: KalmanState, zScore: number): number {
    const zComp = Math.min(1, Math.abs(zScore) / (this._anomalyThreshold * 2));
    let trendComp = 0;
    if (state.history.length >= 5) {
      const recent = state.history.slice(-5);
      const prev = recent.slice(0, 3).reduce((s, v) => s + v, 0) / 3;
      const curr = recent.slice(-3).reduce((s, v) => s + v, 0) / 3;
      trendComp = Math.min(1, Math.abs(curr - prev) / Math.max(Math.abs(prev), 1e-6) * 10);
    }
    let distComp = 0;
    if (state.history.length >= 20) {
      const sorted = [...state.history].sort((a, b) => a - b);
      distComp = Math.abs(this._percentileRank(sorted, value) - 0.5) * 2;
    }
    return Math.min(1, zComp * 0.5 + trendComp * 0.3 + distComp * 0.2);
  }

  private _percentileRank(sorted: number[], value: number): number {
    let low = 0, high = sorted.length;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (sorted[mid] < value) low = mid + 1; else high = mid;
    }
    return low / sorted.length;
  }

  private _updateKalman(state: KalmanState, measurement: number): void {
    const predMean = state.mean;
    const predVar = state.variance + state.processNoise;
    const gain = predVar / (predVar + state.measurementNoise);
    state.mean = predMean + gain * (measurement - predMean);
    state.variance = (1 - gain) * predVar;
    state.measurementNoise = state.measurementNoise * 0.99 + Math.abs(measurement - state.mean) * 0.01;
  }

  private _expandRange(range: HomeostaticRange, value: number, zScore: number): void {
    const alpha = 0.05 + Math.min(0.2, Math.abs(zScore) * 0.02);
    if (value < range.lower) range.lower = range.lower * (1 - alpha) + value * alpha;
    if (value > range.upper) range.upper = range.upper * (1 - alpha) + value * alpha;
    range.tolerance = Math.min(0.8, range.tolerance + alpha * 0.1);
  }

  private _tightenRange(range: HomeostaticRange, state: KalmanState): void {
    const alpha = 0.005;
    const targetLower = state.mean - Math.sqrt(state.variance) * this._anomalyThreshold;
    const targetUpper = state.mean + Math.sqrt(state.variance) * this._anomalyThreshold;
    range.lower = range.lower * (1 - alpha) + Math.max(range.lower, targetLower) * alpha;
    range.upper = range.upper * (1 - alpha) + Math.min(range.upper, targetUpper) * alpha;
    range.tolerance = Math.max(0.05, range.tolerance - alpha * 0.05);
  }

  burstObserve(items: Array<{ id: string; key: string; value: number }>): HomeostaticReading[] {
    const captured: HomeostaticReading[] = [];
    for (const item of items) { const r = this.observe(item.id, item.key, item.value); if (r) captured.push(r); }
    return captured;
  }

  passedReadings(): HomeostaticReading[] { return [...this._passed]; }
  recentDeviations(limit = 5): HomeostaticReading[] { return this._passed.slice(-limit); }
  averageDeviation(): number { return this._passed.length === 0 ? 0 : this._passed.reduce((s, r) => s + Math.abs(r.deviation), 0) / this._passed.length; }
  averageZScore(): number { return this._passed.length === 0 ? 0 : this._passed.reduce((s, r) => s + Math.abs(r.zScore), 0) / this._passed.length; }
  getRange(key: string): HomeostaticRange | undefined { return this._ranges.get(key); }
  getMean(key: string): number | undefined { return this._kalmanStates.get(key)?.mean; }
  getVariance(key: string): number | undefined { return this._kalmanStates.get(key)?.variance; }

  stabilityScore(key: string): number {
    const state = this._kalmanStates.get(key);
    if (!state || state.history.length < 10) return 0.5;
    const cv = Math.sqrt(state.variance) / Math.max(Math.abs(state.mean), 1e-6);
    return Math.max(0, 1 - cv);
  }

  resetRanges(): void {
    for (const range of this._ranges.values()) {
      const state = this._kalmanStates.get(range.key);
      if (state) {
        const span = Math.sqrt(state.variance) * this._anomalyThreshold * 2;
        range.lower = state.mean - span / 2;
        range.upper = state.mean + span / 2;
      }
    }
  }

  reset(): void { this._readings = []; this._passed = []; this._suppressed = 0; }

  get readingCount(): number { return this._readings.length; }
  get suppressedCount(): number { return this._suppressed; }
  get rangeCount(): number { return this._ranges.size; }
  get anomalyThreshold(): number { return this._anomalyThreshold; }
}
