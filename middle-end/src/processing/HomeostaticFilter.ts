/**
 * 稳态过滤器模块：只放行打破系统平衡的异常信号，
 * 将处于正常稳态区间的值视为无信息量而过滤掉。
 */

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
}

export class HomeostaticFilter {
  private _ranges: Map<string, HomeostaticRange> = new Map();
  private _readings: HomeostaticReading[] = [];
  private _passed: HomeostaticReading[] = [];
  private _suppressed = 0;
  private _adaptive = true;

  setRange(range: HomeostaticRange): void {
    this._ranges.set(range.key, range);
  }

  setAdaptive(enabled: boolean): void {
    this._adaptive = enabled;
  }

  observe(id: string, key: string, value: number): HomeostaticReading | null {
    const range = this._ranges.get(key);
    const now = Date.now();

    if (!range) {
      const reading: HomeostaticReading = { id, key, value, timestamp: now, deviates: true, deviation: 0 };
      this._readings.push(reading);
      this._passed.push(reading);
      return reading;
    }

    const deviation = this._computeDeviation(value, range);
    const deviates = Math.abs(deviation) > range.tolerance;

    const reading: HomeostaticReading = { id, key, value, timestamp: now, deviates, deviation };

    if (deviates) {
      this._readings.push(reading);
      this._passed.push(reading);
      if (this._adaptive) this._expandRange(range, value);
      return reading;
    }

    this._suppressed++;
    if (this._adaptive) this._tightenRange(range, value);
    return null;
  }

  private _computeDeviation(value: number, range: HomeostaticRange): number {
    const midpoint = (range.lower + range.upper) / 2;
    const halfSpan = (range.upper - range.lower) / 2;
    return halfSpan === 0 ? 0 : (value - midpoint) / halfSpan;
  }

  private _expandRange(range: HomeostaticRange, value: number): void {
    const alpha = 0.1;
    range.lower = range.lower * (1 - alpha) + Math.min(value, range.lower) * alpha;
    range.upper = range.upper * (1 - alpha) + Math.max(value, range.upper) * alpha;
  }

  private _tightenRange(range: HomeostaticRange, value: number): void {
    const alpha = 0.02;
    range.lower = range.lower * (1 - alpha) + value * alpha;
    range.upper = range.upper * (1 - alpha) + value * alpha;
  }

  burstObserve(items: Array<{ id: string; key: string; value: number }>): HomeostaticReading[] {
    const captured: HomeostaticReading[] = [];
    for (const item of items) {
      const r = this.observe(item.id, item.key, item.value);
      if (r) captured.push(r);
    }
    return captured;
  }

  passedReadings(): HomeostaticReading[] {
    return [...this._passed];
  }

  recentDeviations(limit = 5): HomeostaticReading[] {
    return this._passed.slice(-limit);
  }

  averageDeviation(): number {
    if (this._passed.length === 0) return 0;
    return this._passed.reduce((s, r) => s + Math.abs(r.deviation), 0) / this._passed.length;
  }

  getRange(key: string): HomeostaticRange | undefined {
    return this._ranges.get(key);
  }

  resetRanges(): void {
    for (const range of this._ranges.values()) {
      const midpoint = (range.lower + range.upper) / 2;
      const span = range.upper - range.lower;
      range.lower = midpoint - span / 2;
      range.upper = midpoint + span / 2;
    }
  }

  reset(): void {
    this._readings = [];
    this._passed = [];
    this._suppressed = 0;
  }

  get readingCount(): number {
    return this._readings.length;
  }

  get suppressedCount(): number {
    return this._suppressed;
  }

  get rangeCount(): number {
    return this._ranges.size;
  }
}
