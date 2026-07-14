/**
 * 芝诺之箭：无限切分时间，捕捉瞬时状态用于分析。
 * 仿照芝诺悖论，把任意时间区间不断二分，逼近"瞬时"
 * 状态切片，用于细粒度状态分析。
 */

export interface TimeSlice {
  id: number;
  start: number;
  end: number;
  snapshot: Record<string, unknown>;
  granularity: number;
}

export interface SliceAnalysis {
  sliceId: number;
  entropy: number;
  deltaToPrevious: number;
  frozen: boolean;
}

export class ZenoArrow {
  private _slices: TimeSlice[] = [];
  private _analyses: Map<number, SliceAnalysis> = new Map();
  private _granularity: number = 1;
  private _maxSlices: number = 1024;
  private _arrowFlying: boolean = false;

  /** 对给定区间执行一次切分，记录瞬时快照。 */
  slice(start: number, end: number, snapshot: Record<string, unknown>): TimeSlice {
    const mid = (start + end) / 2;
    const sl: TimeSlice = {
      id: this._slices.length,
      start: mid,
      end,
      snapshot,
      granularity: this._granularity,
    };
    this._slices.push(sl);
    this._granularity *= 2;
    if (this._slices.length > this._maxSlices) {
      this._slices.shift();
    }
    return sl;
  }

  /** 在最细切片上捕获瞬时状态。 */
  captureInstant(): TimeSlice | null {
    if (this._slices.length === 0) return null;
    const latest = this._slices[this._slices.length - 1];
    this._arrowFlying = true;
    return latest;
  }

  /** 对切片流执行熵分析。 */
  analyze(): SliceAnalysis[] {
    const results: SliceAnalysis[] = [];
    let prevEntropy = 0;
    for (const sl of this._slices) {
      const entropy = this._entropy(sl.snapshot);
      const delta = entropy - prevEntropy;
      const analysis: SliceAnalysis = {
        sliceId: sl.id,
        entropy,
        deltaToPrevious: delta,
        frozen: Math.abs(delta) < 1e-6,
      };
      this._analyses.set(sl.id, analysis);
      results.push(analysis);
      prevEntropy = entropy;
    }
    return results;
  }

  /** 逼近极限：当切片间增量趋零时认为到达芝诺极限。 */
  reachLimit(): boolean {
    if (this._slices.length < 2) return false;
    const a = this._slices[this._slices.length - 1];
    const b = this._slices[this._slices.length - 2];
    return Math.abs(a.end - a.start) < 1e-9 || Math.abs(a.start - b.start) < 1e-9;
  }

  getSlice(id: number): TimeSlice | null {
    return this._slices.find(s => s.id === id) ?? null;
  }

  get resolution(): number {
    return this._granularity;
  }

  get arrowFlying(): boolean {
    return this._arrowFlying;
  }

  reset(): void {
    this._slices = [];
    this._analyses.clear();
    this._granularity = 1;
    this._arrowFlying = false;
  }

  private _entropy(snapshot: Record<string, unknown>): number {
    const keys = Object.keys(snapshot);
    if (keys.length === 0) return 0;
    let sum = 0;
    for (const k of keys) {
      const v = snapshot[k];
      sum += typeof v === 'number' ? Math.abs(v) : String(v).length;
    }
    return Math.log(1 + sum) / Math.log(2);
  }
}
