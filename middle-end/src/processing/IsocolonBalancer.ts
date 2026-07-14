/**
 * 对仗均衡器模块：强制输出结构在长度、类型与权重上对称，
 * 使数据流具备诗歌般的对仗韵律，失衡将被自动校正。
 */

export interface BalancedPair {
  id: string;
  left: Record<string, unknown>;
  right: Record<string, unknown>;
  leftWeight: number;
  rightWeight: number;
  symmetryScore: number;
}

export interface BalanceReport {
  totalPairs: number;
  balancedPairs: number;
  averageSymmetry: number;
  adjustments: number;
}

export class IsocolonBalancer {
  private _pairs: Map<string, BalancedPair> = new Map();
  private _adjustments = 0;
  private _targetSymmetry = 0.9;

  addPair(pair: BalancedPair): void {
    this._pairs.set(pair.id, pair);
  }

  setTargetSymmetry(t: number): void {
    this._targetSymmetry = Math.max(0, Math.min(1, t));
  }

  balance(pairId: string): BalancedPair | undefined {
    const pair = this._pairs.get(pairId);
    if (!pair) return undefined;

    const symmetry = this._computeSymmetry(pair.left, pair.right);
    pair.symmetryScore = symmetry;

    if (symmetry < this._targetSymmetry) {
      this._adjust(pair);
      this._adjustments++;
      pair.symmetryScore = this._computeSymmetry(pair.left, pair.right);
    }

    return pair;
  }

  private _computeSymmetry(a: Record<string, unknown>, b: Record<string, unknown>): number {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    const lengthSym = 1 - Math.min(1, Math.abs(keysA.length - keysB.length) / Math.max(1, Math.max(keysA.length, keysB.length)));
    const shared = keysA.filter(k => k in b);
    let typeMatch = 0;
    for (const k of shared) {
      if (typeof a[k] === typeof b[k]) typeMatch++;
    }
    const typeSym = shared.length === 0 ? 1 : typeMatch / shared.length;
    return lengthSym * 0.5 + typeSym * 0.5;
  }

  private _adjust(pair: BalancedPair): void {
    const leftKeys = Object.keys(pair.left);
    const rightKeys = Object.keys(pair.right);

    if (leftKeys.length > rightKeys.length) {
      for (const k of leftKeys) {
        if (!(k in pair.right)) pair.right[k] = this._defaultValue(pair.left[k]);
      }
    } else if (rightKeys.length > leftKeys.length) {
      for (const k of rightKeys) {
        if (!(k in pair.left)) pair.left[k] = this._defaultValue(pair.right[k]);
      }
    }

    const weightDiff = pair.leftWeight - pair.rightWeight;
    if (Math.abs(weightDiff) > 0) {
      const shift = weightDiff / 2;
      pair.leftWeight -= shift;
      pair.rightWeight += shift;
    }
  }

  private _defaultValue(sample: unknown): unknown {
    if (typeof sample === 'number') return 0;
    if (typeof sample === 'string') return '';
    if (typeof sample === 'boolean') return false;
    if (Array.isArray(sample)) return [];
    return null;
  }

  balanceAll(): BalanceReport {
    let balanced = 0;
    for (const id of this._pairs.keys()) {
      const result = this.balance(id);
      if (result && result.symmetryScore >= this._targetSymmetry) balanced++;
    }
    return {
      totalPairs: this._pairs.size,
      balancedPairs: balanced,
      averageSymmetry: this.averageSymmetry(),
      adjustments: this._adjustments,
    };
  }

  averageSymmetry(): number {
    if (this._pairs.size === 0) return 0;
    return Array.from(this._pairs.values()).reduce((s, p) => s + p.symmetryScore, 0) / this._pairs.size;
  }

  imbalancedPairs(): BalancedPair[] {
    return Array.from(this._pairs.values()).filter(p => p.symmetryScore < this._targetSymmetry);
  }

  getPair(id: string): BalancedPair | undefined {
    return this._pairs.get(id);
  }

  reset(): void {
    this._pairs.clear();
    this._adjustments = 0;
  }

  get pairCount(): number {
    return this._pairs.size;
  }

  get adjustmentCount(): number {
    return this._adjustments;
  }

  get targetSymmetry(): number {
    return this._targetSymmetry;
  }
}
