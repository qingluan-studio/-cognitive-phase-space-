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

interface SymmetryBreakdown {
  structural: number;
  typeAlignment: number;
  valueDistribution: number;
  weightBalance: number;
  overall: number;
}

interface IsomorphicMapping {
  leftToRight: Map<string, string>;
  rightToLeft: Map<string, string>;
  similarity: number;
  unmatchedLeft: string[];
  unmatchedRight: string[];
}

export class IsocolonBalancer {
  private _pairs: Map<string, BalancedPair> = new Map();
  private _adjustments = 0;
  private _targetSymmetry = 0.9;
  private _isomorphismCache: Map<string, IsomorphicMapping> = new Map();
  private _balanceHistory: Map<string, number[]> = new Map();
  private _maxHistory = 32;
  private _adjustmentRate = 0.5;

  addPair(pair: BalancedPair): void {
    this._pairs.set(pair.id, pair);
    this._isomorphismCache.delete(pair.id);
  }

  setTargetSymmetry(t: number): void {
    this._targetSymmetry = Math.max(0, Math.min(1, t));
  }

  setAdjustmentRate(rate: number): void {
    this._adjustmentRate = Math.max(0, Math.min(1, rate));
  }

  balance(pairId: string): BalancedPair | undefined {
    const pair = this._pairs.get(pairId);
    if (!pair) return undefined;

    const breakdown = this._computeSymmetryBreakdown(pair.left, pair.right);
    pair.symmetryScore = breakdown.overall;

    if (breakdown.overall < this._targetSymmetry) {
      this._adjust(pair, breakdown);
      this._adjustments++;
      const newBreakdown = this._computeSymmetryBreakdown(pair.left, pair.right);
      pair.symmetryScore = newBreakdown.overall;
      this._recordHistory(pairId, newBreakdown.overall);
    } else {
      this._recordHistory(pairId, breakdown.overall);
    }

    return pair;
  }

  private _computeSymmetryBreakdown(
    a: Record<string, unknown>,
    b: Record<string, unknown>
  ): SymmetryBreakdown {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    const maxLen = Math.max(keysA.length, keysB.length, 1);
    const lengthDiff = Math.abs(keysA.length - keysB.length);
    const structural = 1 - lengthDiff / maxLen;

    const iso = this._computeIsomorphism(a, b);
    let typeMatch = 0;
    let typeTotal = 0;

    for (const [leftKey, rightKey] of iso.leftToRight.entries()) {
      typeTotal++;
      if (typeof a[leftKey] === typeof b[rightKey]) {
        typeMatch++;
      }
    }

    const typeAlignment = typeTotal === 0 ? 1 : typeMatch / typeTotal;

    let valueSim = 0;
    let valueTotal = 0;
    for (const [leftKey, rightKey] of iso.leftToRight.entries()) {
      valueTotal++;
      valueSim += this._valueSimilarity(a[leftKey], b[rightKey]);
    }
    const valueDistribution = valueTotal === 0 ? 1 : valueSim / valueTotal;

    const leftWeight = this._computeObjectWeight(a);
    const rightWeight = this._computeObjectWeight(b);
    const weightBalance = 1 - Math.min(1, Math.abs(leftWeight - rightWeight) / Math.max(leftWeight, rightWeight, 1));

    const overall = structural * 0.25 + typeAlignment * 0.2 + valueDistribution * 0.3 + weightBalance * 0.25;

    return { structural, typeAlignment, valueDistribution, weightBalance, overall };
  }

  private _computeIsomorphism(
    a: Record<string, unknown>,
    b: Record<string, unknown>
  ): IsomorphicMapping {
    const cacheKey = this._pairSignature(a, b);
    if (this._isomorphismCache.has(cacheKey)) {
      return this._isomorphismCache.get(cacheKey)!;
    }

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    const leftToRight = new Map<string, string>();
    const rightToLeft = new Map<string, string>();
    const matchedB = new Set<string>();
    let totalSim = 0;
    let matched = 0;

    for (const keyA of keysA) {
      let bestKey = '';
      let bestSim = -1;
      const valA = a[keyA];
      const typeA = typeof valA;

      for (const keyB of keysB) {
        if (matchedB.has(keyB)) continue;
        const valB = b[keyB];
        const typeB = typeof valB;
        
        let sim = 0;
        if (typeA === typeB) sim += 0.4;
        
        const nameSim = this._nameSimilarity(keyA, keyB);
        sim += nameSim * 0.3;
        
        if (typeA === typeB) {
          sim += this._valueSimilarity(valA, valB) * 0.3;
        }

        if (sim > bestSim) {
          bestSim = sim;
          bestKey = keyB;
        }
      }

      if (bestKey && bestSim > 0.3) {
        leftToRight.set(keyA, bestKey);
        rightToLeft.set(bestKey, keyA);
        matchedB.add(bestKey);
        totalSim += bestSim;
        matched++;
      }
    }

    const unmatchedLeft = keysA.filter(k => !leftToRight.has(k));
    const unmatchedRight = keysB.filter(k => !rightToLeft.has(k));
    const similarity = matched === 0 ? 0 : totalSim / matched;

    const result: IsomorphicMapping = {
      leftToRight,
      rightToLeft,
      similarity,
      unmatchedLeft,
      unmatchedRight,
    };
    this._isomorphismCache.set(cacheKey, result);
    return result;
  }

  private _nameSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    const lowerA = a.toLowerCase();
    const lowerB = b.toLowerCase();
    if (lowerA === lowerB) return 0.9;
    
    let matches = 0;
    const setA = new Set(lowerA);
    const setB = new Set(lowerB);
    for (const ch of setA) {
      if (setB.has(ch)) matches++;
    }
    const union = new Set([...setA, ...setB]).size;
    const jaccard = union === 0 ? 0 : matches / union;
    
    const prefixLen = this._commonPrefixLength(lowerA, lowerB);
    const prefixBonus = Math.min(prefixLen / 4, 0.2);
    
    return Math.min(1, jaccard * 0.7 + prefixBonus);
  }

  private _commonPrefixLength(a: string, b: string): number {
    let len = 0;
    while (len < a.length && len < b.length && a[len] === b[len]) len++;
    return len;
  }

  private _valueSimilarity(a: unknown, b: unknown): number {
    if (a === b) return 1;
    if (a === undefined || b === undefined) return 0;
    if (typeof a === 'number' && typeof b === 'number') {
      const maxAbs = Math.max(Math.abs(a), Math.abs(b), 1);
      return Math.max(0, 1 - Math.abs(a - b) / maxAbs);
    }
    if (typeof a === 'string' && typeof b === 'string') {
      const maxLen = Math.max(a.length, b.length, 1);
      let matches = 0;
      const minLen = Math.min(a.length, b.length);
      for (let i = 0; i < minLen; i++) {
        if (a[i] === b[i]) matches++;
      }
      return matches / maxLen;
    }
    if (typeof a === 'boolean' && typeof b === 'boolean') {
      return a === b ? 1 : 0;
    }
    return 0.2;
  }

  private _computeObjectWeight(obj: Record<string, unknown>): number {
    let weight = 0;
    for (const [key, value] of Object.entries(obj)) {
      const keyWeight = key.startsWith('_') ? 0.5 : 1;
      let valWeight = 1;
      if (typeof value === 'number') valWeight = Math.min(2, Math.abs(value) / 5 + 0.5);
      else if (typeof value === 'string') valWeight = Math.min(2, value.length / 20 + 0.5);
      else if (typeof value === 'object' && value !== null) {
        valWeight = Math.min(3, Object.keys(value as Record<string, unknown>).length / 5 + 0.5);
      }
      weight += keyWeight * valWeight;
    }
    return weight;
  }

  private _adjust(pair: BalancedPair, breakdown: SymmetryBreakdown): void {
    const iso = this._computeIsomorphism(pair.left, pair.right);
    
    if (breakdown.structural < this._targetSymmetry) {
      this._adjustStructure(pair, iso);
    }
    
    if (breakdown.typeAlignment < this._targetSymmetry) {
      this._adjustTypes(pair, iso);
    }
    
    if (breakdown.valueDistribution < this._targetSymmetry) {
      this._adjustValues(pair, iso);
    }
    
    if (breakdown.weightBalance < this._targetSymmetry) {
      this._adjustWeights(pair);
    }
    
    this._isomorphismCache.delete(this._pairSignature(pair.left, pair.right));
  }

  private _adjustStructure(pair: BalancedPair, iso: IsomorphicMapping): void {
    for (const key of iso.unmatchedLeft) {
      if (!this._isInternalKey(key)) {
        pair.right[key] = this._mirrorValue(pair.left[key]);
      }
    }
    for (const key of iso.unmatchedRight) {
      if (!this._isInternalKey(key)) {
        pair.left[key] = this._mirrorValue(pair.right[key]);
      }
    }
  }

  private _adjustTypes(pair: BalancedPair, iso: IsomorphicMapping): void {
    for (const [leftKey, rightKey] of iso.leftToRight.entries()) {
      const leftVal = pair.left[leftKey];
      const rightVal = pair.right[rightKey];
      if (typeof leftVal !== typeof rightVal) {
        if (typeof leftVal === 'number' && typeof rightVal === 'string') {
          const num = Number(rightVal);
          if (!isNaN(num)) pair.right[rightKey] = num;
        } else if (typeof leftVal === 'string' && typeof rightVal === 'number') {
          const num = Number(leftVal);
          if (!isNaN(num)) pair.left[leftKey] = num;
        }
      }
    }
  }

  private _adjustValues(pair: BalancedPair, iso: IsomorphicMapping): void {
    for (const [leftKey, rightKey] of iso.leftToRight.entries()) {
      const leftVal = pair.left[leftKey];
      const rightVal = pair.right[rightKey];
      if (typeof leftVal === 'number' && typeof rightVal === 'number') {
        const midpoint = (leftVal + rightVal) / 2;
        const shift = (midpoint - leftVal) * this._adjustmentRate;
        pair.left[leftKey] = leftVal + shift;
        pair.right[rightKey] = rightVal - shift;
      }
    }
  }

  private _adjustWeights(pair: BalancedPair): void {
    const weightDiff = pair.leftWeight - pair.rightWeight;
    const shift = weightDiff * this._adjustmentRate * 0.5;
    pair.leftWeight -= shift;
    pair.rightWeight += shift;
  }

  private _mirrorValue(value: unknown): unknown {
    if (typeof value === 'number') return -value;
    if (typeof value === 'boolean') return !value;
    if (typeof value === 'string') return value.split('').reverse().join('');
    if (value === null) return null;
    if (typeof value === 'object') {
      const mirrored: Record<string, unknown> = {};
      const entries = Object.entries(value as Record<string, unknown>);
      for (let i = 0; i < entries.length; i++) {
        const [key, val] = entries[i];
        mirrored[key] = this._mirrorValue(val);
      }
      return mirrored;
    }
    return value;
  }

  private _isInternalKey(key: string): boolean {
    return key.startsWith('_');
  }

  private _pairSignature(a: Record<string, unknown>, b: Record<string, unknown>): string {
    return Object.keys(a).sort().join('|') + '||' + Object.keys(b).sort().join('|');
  }

  private _recordHistory(pairId: string, score: number): void {
    if (!this._balanceHistory.has(pairId)) {
      this._balanceHistory.set(pairId, []);
    }
    const history = this._balanceHistory.get(pairId)!;
    history.push(score);
    if (history.length > this._maxHistory) history.shift();
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

  getSymmetryBreakdown(pairId: string): SymmetryBreakdown | undefined {
    const pair = this._pairs.get(pairId);
    if (!pair) return undefined;
    return this._computeSymmetryBreakdown(pair.left, pair.right);
  }

  balanceTrend(pairId: string): 'improving' | 'declining' | 'stable' {
    const history = this._balanceHistory.get(pairId) ?? [];
    if (history.length < 4) return 'stable';
    const firstHalf = history.slice(0, Math.floor(history.length / 2));
    const secondHalf = history.slice(Math.floor(history.length / 2));
    const firstAvg = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length;
    const diff = secondAvg - firstAvg;
    if (diff > 0.02) return 'improving';
    if (diff < -0.02) return 'declining';
    return 'stable';
  }

  reset(): void {
    this._pairs.clear();
    this._adjustments = 0;
    this._isomorphismCache.clear();
    this._balanceHistory.clear();
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

  get adjustmentRate(): number {
    return this._adjustmentRate;
  }
}
