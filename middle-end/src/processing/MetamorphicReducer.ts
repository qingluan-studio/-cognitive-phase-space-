/**
 * 变形归约器模块：根据输出目标的容量与精度需求，
 * 自动将高维数据折叠为低维表示，或在带宽充裕时重新展开。
 */

export type ReductionTarget = 'compact' | 'balanced' | 'expanded';

export interface DimensionSpec {
  key: string;
  weight: number;
  collapsible: boolean;
}

export interface ReductionResult {
  target: ReductionTarget;
  inputDim: number;
  outputDim: number;
  payload: Record<string, unknown>;
  fidelity: number;
}

export class MetamorphicReducer {
  private _dimensions: Map<string, DimensionSpec> = new Map();
  private _target: ReductionTarget = 'balanced';
  private _history: ReductionResult[] = [];
  private _maxHistory = 32;

  addDimension(spec: DimensionSpec): void {
    this._dimensions.set(spec.key, spec);
  }

  removeDimension(key: string): boolean {
    return this._dimensions.delete(key);
  }

  setTarget(target: ReductionTarget): void {
    this._target = target;
  }

  reduce(payload: Record<string, unknown>): ReductionResult {
    const dims = Array.from(this._dimensions.values());
    const inputDim = dims.length;
    const ratio = this._targetRatio();
    const keepCount = Math.max(1, Math.round(inputDim * ratio));

    const sorted = [...dims].sort((a, b) => b.weight - a.weight);
    const kept = sorted.slice(0, keepCount).filter(d => !d.collapsible || keepCount === inputDim || true);
    const keysToKeep = new Set(kept.map(d => d.key));

    const out: Record<string, unknown> = {};
    for (const key of Object.keys(payload)) {
      if (keysToKeep.has(key) || this._target === 'expanded') {
        out[key] = payload[key];
      } else if (this._dimensions.has(key)) {
        const spec = this._dimensions.get(key)!;
        if (!spec.collapsible) out[key] = payload[key];
      }
    }

    const outputDim = Object.keys(out).length;
    const fidelity = inputDim === 0 ? 1 : outputDim / inputDim;
    const result: ReductionResult = {
      target: this._target,
      inputDim,
      outputDim,
      payload: out,
      fidelity,
    };
    this._pushHistory(result);
    return result;
  }

  expand(compressed: Record<string, unknown>, template: Record<string, unknown>): Record<string, unknown> {
    const expanded = { ...template, ...compressed };
    return expanded;
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

  reset(): void {
    this._history = [];
    this._dimensions.clear();
  }

  get dimensionCount(): number {
    return this._dimensions.size;
  }

  get target(): ReductionTarget {
    return this._target;
  }
}
