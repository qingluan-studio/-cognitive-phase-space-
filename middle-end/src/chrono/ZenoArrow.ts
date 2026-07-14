export interface TimeSlice {
  id: number;
  start: number;
  end: number;
  snapshot: Record<string, unknown>;
  granularity: number;
  midpoint: number;
  uncertainty: number;
}

export interface SliceAnalysis {
  sliceId: number;
  entropy: number;
  deltaToPrevious: number;
  frozen: boolean;
  fractalDimension: number;
  energyUncertainty: number;
}

export class ZenoArrow {
  private _slices: TimeSlice[] = [];
  private _analyses: Map<number, SliceAnalysis> = new Map();
  private _granularity: number = 1;
  private _maxSlices: number = 1024;
  private _arrowFlying: boolean = false;
  private _epsilon: number = 1e-12;
  private _maxDepth: number = 20;
  private _reducedPlanck: number = 1;

  slice(start: number, end: number, snapshot: Record<string, unknown>): TimeSlice {
    const mid = (start + end) / 2;
    const duration = Math.abs(end - start);
    const uncertainty = this._energyTimeUncertainty(duration);
    const sl: TimeSlice = {
      id: this._slices.length,
      start: mid,
      end,
      snapshot,
      granularity: this._granularity,
      midpoint: mid,
      uncertainty,
    };
    this._slices.push(sl);
    this._granularity *= 2;
    if (this._slices.length > this._maxSlices) this._slices.shift();
    return sl;
  }

  captureInstant(): TimeSlice | null {
    if (this._slices.length === 0) return null;
    const latest = this._slices[this._slices.length - 1];
    this._arrowFlying = true;
    return latest;
  }

  analyze(): SliceAnalysis[] {
    const results: SliceAnalysis[] = [];
    let prevEntropy = 0;
    for (const sl of this._slices) {
      const entropy = this._shannonEntropy(sl.snapshot);
      const delta = entropy - prevEntropy;
      const duration = Math.abs(sl.end - sl.start);
      const fractalDim = this._boxCountingDimension(sl.snapshot);
      const energyUncert = this._energyTimeUncertainty(duration);
      const analysis: SliceAnalysis = {
        sliceId: sl.id,
        entropy,
        deltaToPrevious: delta,
        frozen: Math.abs(delta) < 1e-6,
        fractalDimension: fractalDim,
        energyUncertainty: energyUncert,
      };
      this._analyses.set(sl.id, analysis);
      results.push(analysis);
      prevEntropy = entropy;
    }
    return results;
  }

  reachLimit(): boolean {
    if (this._slices.length < 2) return false;
    const a = this._slices[this._slices.length - 1];
    const b = this._slices[this._slices.length - 2];
    const spanRatio = Math.abs(a.end - a.start) / Math.max(1, Math.abs(b.end - b.start));
    return spanRatio < 0.5 + this._epsilon;
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

  interpolateInstant(targetTime: number): Record<string, unknown> | null {
    if (this._slices.length < 2) return null;
    const sorted = [...this._slices].sort((a, b) => a.midpoint - b.midpoint);
    let idx = 0;
    while (idx < sorted.length && sorted[idx].midpoint < targetTime) idx++;
    if (idx === 0) return sorted[0].snapshot;
    if (idx >= sorted.length) return sorted[sorted.length - 1].snapshot;
    const a = sorted[idx - 1], b = sorted[idx];
    const dt = b.midpoint - a.midpoint;
    const t = dt === 0 ? 0 : (targetTime - a.midpoint) / dt;
    const result: Record<string, unknown> = {};
    const keys = new Set([...Object.keys(a.snapshot), ...Object.keys(b.snapshot)]);
    for (const key of keys) {
      const av = a.snapshot[key], bv = b.snapshot[key];
      if (typeof av === 'number' && typeof bv === 'number') result[key] = av + t * (bv - av);
      else if (av !== undefined) result[key] = av;
      else result[key] = bv;
    }
    return result;
  }

  private _shannonEntropy(snapshot: Record<string, unknown>): number {
    const keys = Object.keys(snapshot);
    if (keys.length === 0) return 0;
    let sum = 0;
    const values: number[] = [];
    for (const k of keys) {
      const v = snapshot[k];
      const n = typeof v === 'number' ? Math.abs(v) : String(v).length;
      values.push(n);
      sum += n;
    }
    if (sum === 0) return 0;
    let entropy = 0;
    for (const v of values) {
      const p = v / sum;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  private _energyTimeUncertainty(duration: number): number {
    if (duration === 0) return Infinity;
    return this._reducedPlanck / (2 * duration);
  }

  private _boxCountingDimension(snapshot: Record<string, unknown>): number {
    const numeric = Object.values(snapshot).filter(v => typeof v === 'number').map(v => Math.abs(v as number));
    if (numeric.length < 4) return 1;
    const maxVal = Math.max(...numeric);
    if (maxVal === 0) return 1;
    const counts: number[] = [];
    const sizes: number[] = [];
    for (let scale = 1; scale <= 4; scale++) {
      const boxSize = maxVal / Math.pow(2, scale);
      if (boxSize === 0) break;
      const boxes = new Set(numeric.map(v => Math.floor(v / boxSize)));
      counts.push(boxes.size);
      sizes.push(boxSize);
    }
    if (counts.length < 2) return 1;
    let sl = 0, cl = 0, scl = 0, s2l = 0;
    for (let i = 0; i < counts.length; i++) {
      const ls = -Math.log(sizes[i] / maxVal);
      const lc = Math.log(counts[i]);
      sl += ls; cl += lc; scl += ls * lc; s2l += ls * ls;
    }
    const n = counts.length;
    const denom = n * s2l - sl * sl;
    return denom === 0 ? 1 : (n * scl - sl * cl) / denom;
  }
}
