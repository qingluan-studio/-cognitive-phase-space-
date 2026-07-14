export type ReductionTarget = 'compact' | 'balanced' | 'expanded';

export interface DimensionSpec {
  key: string;
  weight: number;
  collapsible: boolean;
  variance: number;
  mean: number;
}

export interface ReductionResult {
  target: ReductionTarget;
  inputDim: number;
  outputDim: number;
  payload: Record<string, unknown>;
  fidelity: number;
  entropyRetention: number;
  principalComponents: string[];
}

export class MetamorphicReducer {
  private _dimensions: Map<string, DimensionSpec> = new Map();
  private _target: ReductionTarget = 'balanced';
  private _history: ReductionResult[] = [];
  private _maxHistory = 32;
  private _covarianceMatrix: Map<string, Map<string, number>> = new Map();
  private _sampleCount = 0;
  private _quantizationLevels = 8;
  private _eigenValues: Map<string, number> = new Map();

  addDimension(spec: DimensionSpec): void {
    const enriched: DimensionSpec = {
      ...spec,
      variance: spec.variance ?? 1,
      mean: spec.mean ?? 0,
    };
    this._dimensions.set(spec.key, enriched);
    this._covarianceMatrix.set(spec.key, new Map());
    for (const existing of this._dimensions.keys()) {
      if (!this._covarianceMatrix.get(spec.key)!.has(existing)) {
        this._covarianceMatrix.get(spec.key)!.set(existing, 0);
      }
      if (!this._covarianceMatrix.get(existing)!.has(spec.key)) {
        this._covarianceMatrix.get(existing)!.set(spec.key, 0);
      }
    }
  }

  removeDimension(key: string): boolean {
    this._covarianceMatrix.delete(key);
    for (const inner of this._covarianceMatrix.values()) {
      inner.delete(key);
    }
    this._eigenValues.delete(key);
    return this._dimensions.delete(key);
  }

  setTarget(target: ReductionTarget): void {
    this._target = target;
  }

  setQuantizationLevels(levels: number): void {
    this._quantizationLevels = Math.max(2, Math.min(256, levels));
  }

  reduce(payload: Record<string, unknown>): ReductionResult {
    const dims = Array.from(this._dimensions.values());
    const inputDim = dims.length;
    const ratio = this._targetRatio();
    const keepCount = Math.max(1, Math.round(inputDim * ratio));

    this._updateStatistics(payload);
    this._computeEigenApproximation();

    const ranked = this._rankByInformationContent(dims, payload);
    const keptKeys = new Set(ranked.slice(0, keepCount).map(d => d.key));

    const out: Record<string, unknown> = {};
    let retainedEntropy = 0;
    let totalEntropy = 0;

    for (const dim of dims) {
      const value = Number(payload[dim.key] ?? 0);
      const dimEntropy = this._dimensionEntropy(dim, value);
      totalEntropy += dimEntropy;

      if (keptKeys.has(dim.key) || !dim.collapsible || this._target === 'expanded') {
        out[dim.key] = this._target === 'compact' ? this._quantize(value, dim) : value;
        retainedEntropy += dimEntropy;
      } else {
        const bucket = this._foldDimension(dim, value, keptKeys, payload);
        const foldKey = `_fold_${dim.key}`;
        out[foldKey] = bucket;
        retainedEntropy += dimEntropy * 0.3;
      }
    }

    const outputDim = Object.keys(out).length;
    const fidelity = inputDim === 0 ? 1 : outputDim / inputDim;
    const entropyRetention = totalEntropy === 0 ? 1 : retainedEntropy / totalEntropy;

    const result: ReductionResult = {
      target: this._target,
      inputDim,
      outputDim,
      payload: out,
      fidelity,
      entropyRetention,
      principalComponents: ranked.slice(0, keepCount).map(d => d.key),
    };

    this._pushHistory(result);
    return result;
  }

  private _rankByInformationContent(dims: DimensionSpec[], payload: Record<string, unknown>): DimensionSpec[] {
    return [...dims].sort((a, b) => {
      const aInfo = (this._eigenValues.get(a.key) ?? 1) * a.weight * (1 + Math.abs(Number(payload[a.key] ?? 0) - a.mean) / Math.max(0.001, a.variance));
      const bInfo = (this._eigenValues.get(b.key) ?? 1) * b.weight * (1 + Math.abs(Number(payload[b.key] ?? 0) - b.mean) / Math.max(0.001, b.variance));
      return bInfo - aInfo;
    });
  }

  private _dimensionEntropy(dim: DimensionSpec, value: number): number {
    const normalized = (value - dim.mean) / Math.max(0.001, Math.sqrt(dim.variance));
    const gaussian = Math.exp(-0.5 * normalized * normalized) / Math.sqrt(2 * Math.PI * dim.variance);
    return -Math.log2(Math.max(0.001, gaussian));
  }

  private _quantize(value: number, dim: DimensionSpec): number {
    const std = Math.sqrt(dim.variance);
    const minVal = dim.mean - 2 * std;
    const maxVal = dim.mean + 2 * std;
    const clamped = Math.max(minVal, Math.min(maxVal, value));
    const step = (maxVal - minVal) / this._quantizationLevels;
    return Math.round((clamped - minVal) / step) * step + minVal;
  }

  private _foldDimension(dim: DimensionSpec, value: number, kept: Set<string>, payload: Record<string, unknown>): string {
    const std = Math.sqrt(dim.variance);
    const zScore = (value - dim.mean) / Math.max(0.001, std);
    const bucket = Math.max(0, Math.min(this._quantizationLevels - 1, Math.floor((zScore + 2) / 4 * this._quantizationLevels)));
    const sig = Array.from(kept).slice(0, 3).map(k => String(payload[k]).slice(0, 4)).join(':');
    return `${bucket}:${dim.key}:${sig}`;
  }

  expand(compressed: Record<string, unknown>, template: Record<string, unknown>): Record<string, unknown> {
    const expanded: Record<string, unknown> = {};
    const foldBuckets: Map<string, string> = new Map();

    for (const [key, value] of Object.entries(compressed)) {
      if (key.startsWith('_fold_')) {
        const originalKey = key.replace('_fold_', '');
        foldBuckets.set(originalKey, String(value));
      } else {
        expanded[key] = value;
      }
    }

    for (const [key, spec] of this._dimensions) {
      if (!(key in expanded) && key in template) {
        const bucketVal = foldBuckets.get(key);
        if (bucketVal) {
          expanded[key] = this._unfoldDimension(spec, bucketVal, template);
        } else {
          expanded[key] = template[key];
        }
      }
    }

    return { ...template, ...expanded };
  }

  private _unfoldDimension(dim: DimensionSpec, bucketStr: string, template: Record<string, unknown>): number {
    const parts = bucketStr.split(':');
    const bucket = parseInt(parts[0], 10);
    const std = Math.sqrt(dim.variance);
    const minVal = dim.mean - 2 * std;
    const maxVal = dim.mean + 2 * std;
    const step = (maxVal - minVal) / this._quantizationLevels;
    const baseValue = minVal + bucket * step + step / 2;
    const jitter = (this._hashString(parts[2] ?? '') % 100) / 100 * step - step / 2;
    return baseValue + jitter;
  }

  private _hashString(s: string): number {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      hash = ((hash << 5) - hash) + s.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  private _updateStatistics(payload: Record<string, unknown>): void {
    this._sampleCount++;
    const alpha = 1 / Math.max(1, this._sampleCount);
    const dimEntries = Array.from(this._dimensions.entries());

    for (const [key, spec] of dimEntries) {
      const value = Number(payload[key] ?? 0);
      const prevMean = spec.mean;
      const newMean = prevMean + alpha * (value - prevMean);
      const newVar = spec.variance + alpha * ((value - prevMean) * (value - newMean) - spec.variance);
      spec.mean = newMean;
      spec.variance = Math.max(0.001, newVar);
    }

    for (let i = 0; i < dimEntries.length; i++) {
      for (let j = 0; j < dimEntries.length; j++) {
        const [ki, si] = dimEntries[i];
        const [kj] = dimEntries[j];
        const vi = Number(payload[ki] ?? 0) - si.mean;
        const vj = Number(payload[kj] ?? 0) - this._dimensions.get(kj)!.mean;
        const row = this._covarianceMatrix.get(ki);
        if (row) {
          const prev = row.get(kj) ?? 0;
          row.set(kj, prev + alpha * (vi * vj - prev));
        }
      }
    }
  }

  private _computeEigenApproximation(): void {
    const keys = Array.from(this._dimensions.keys());
    if (keys.length === 0) return;

    for (const key of keys) {
      const row = this._covarianceMatrix.get(key);
      if (row) {
        let sum = 0;
        for (const v of row.values()) sum += Math.abs(v);
        this._eigenValues.set(key, 0.5 + 0.5 * sum / keys.length);
      }
    }
  }

  private _targetRatio(): number {
    switch (this._target) {
      case 'compact': return 0.4;
      case 'expanded': return 1.0;
      default: return 0.7;
    }
  }

  private _pushHistory(result: ReductionResult): void {
    this._history.push(result);
    if (this._history.length > this._maxHistory) {
      this._history.shift();
    }
  }

  getHistory(): ReductionResult[] {
    return [...this._history];
  }

  averageFidelity(): number {
    if (this._history.length === 0) return 1;
    const sum = this._history.reduce((s, r) => s + r.fidelity, 0);
    return sum / this._history.length;
  }

  averageEntropyRetention(): number {
    if (this._history.length === 0) return 1;
    const sum = this._history.reduce((s, r) => s + r.entropyRetention, 0);
    return sum / this._history.length;
  }

  reset(): void {
    this._history = [];
    this._sampleCount = 0;
    for (const [key, spec] of this._dimensions) {
      spec.variance = 1;
      spec.mean = 0;
    }
    for (const row of this._covarianceMatrix.values()) {
      for (const key of row.keys()) row.set(key, 0);
    }
    this._eigenValues.clear();
  }

  get dimensionCount(): number { return this._dimensions.size; }
  get target(): ReductionTarget { return this._target; }
  get sampleCount(): number { return this._sampleCount; }
  get quantizationLevels(): number { return this._quantizationLevels; }
}
