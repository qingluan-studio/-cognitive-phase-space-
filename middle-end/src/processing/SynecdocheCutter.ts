export type SynecdocheMode = 'part-for-whole' | 'whole-for-part';

export interface SynecdocheSlice {
  id: string;
  key: string;
  value: unknown;
  representative: boolean;
  coverage: number;
}

export interface CondensedResult {
  slices: SynecdocheSlice[];
  mode: SynecdocheMode;
  coverage: number;
  reconstructed: Record<string, unknown>;
}

interface KeyInfo {
  key: string;
  entropy: number;
  uniqueness: number;
  priority: number;
  score: number;
}

export class SynecdocheCutter {
  private _slices: Map<string, SynecdocheSlice> = new Map();
  private _mode: SynecdocheMode = 'part-for-whole';
  private _keyPriority: Map<string, number> = new Map();
  private _maxSlices = 8;
  private _coverageHistory: Map<string, number[]> = new Map();
  private _cooccurrenceMatrix: Map<string, Map<string, number>> = new Map();
  private _entropyWeights = { entropy: 0.4, uniqueness: 0.3, priority: 0.3 };

  setMode(mode: SynecdocheMode): void {
    this._mode = mode;
  }

  setKeyPriority(key: string, priority: number): void {
    this._keyPriority.set(key, priority);
  }

  setMaxSlices(max: number): void {
    this._maxSlices = Math.max(1, max);
  }

  setEntropyWeights(weights: { entropy: number; uniqueness: number; priority: number }): void {
    const total = weights.entropy + weights.uniqueness + weights.priority;
    this._entropyWeights = {
      entropy: weights.entropy / total,
      uniqueness: weights.uniqueness / total,
      priority: weights.priority / total,
    };
  }

  cut(whole: Record<string, unknown>): CondensedResult {
    const keys = Object.keys(whole);
    const keyInfos = this._computeKeyInfos(whole, keys);
    const selected = this._selectSlices(keyInfos);
    
    const slices: SynecdocheSlice[] = selected.map((info, idx) => ({
      id: `slice-${idx}-${this._hashKey(info.key)}`,
      key: info.key,
      value: whole[info.key],
      representative: idx === 0,
      coverage: this._computeSliceCoverage(info, keyInfos),
    }));

    const coverage = this._computeTotalCoverage(selected, keyInfos);
    const reconstructed = this._reconstruct(slices, whole, selected);
    this._recordCoverage(whole, coverage);
    this._updateCooccurrence(whole, selected.map(s => s.key));
    
    return { slices, mode: this._mode, coverage, reconstructed };
  }

  private _computeKeyInfos(whole: Record<string, unknown>, keys: string[]): KeyInfo[] {
    const valueFreqMap = new Map<string, Map<string, number>>();
    
    for (const key of keys) {
      const valStr = String(whole[key]);
      if (!valueFreqMap.has(key)) valueFreqMap.set(key, new Map());
      const freq = valueFreqMap.get(key)!;
      freq.set(valStr, (freq.get(valStr) ?? 0) + 1);
    }

    return keys.map(key => {
      const entropy = this._valueEntropy(whole[key]);
      const uniqueness = this._computeUniqueness(key, whole, keys);
      const priority = this._keyPriority.get(key) ?? 0;
      const score = this._weightedScore(entropy, uniqueness, priority);
      return { key, entropy, uniqueness, priority, score };
    });
  }

  private _valueEntropy(value: unknown): number {
    const str = String(value);
    if (str.length === 0) return 0;
    const freq = new Map<string, number>();
    for (const ch of str) {
      freq.set(ch, (freq.get(ch) ?? 0) + 1);
    }
    let entropy = 0;
    for (const count of freq.values()) {
      const p = count / str.length;
      entropy -= p * Math.log2(p);
    }
    const maxEntropy = Math.log2(Math.min(freq.size, 256));
    return maxEntropy === 0 ? 0 : Math.min(1, entropy / maxEntropy);
  }

  private _computeUniqueness(key: string, whole: Record<string, unknown>, keys: string[]): number {
    const val = String(whole[key]);
    let uniqueCount = 0;
    let total = 0;
    for (const otherKey of keys) {
      if (otherKey === key) continue;
      total++;
      if (String(whole[otherKey]) !== val) uniqueCount++;
    }
    return total === 0 ? 1 : uniqueCount / total;
  }

  private _weightedScore(entropy: number, uniqueness: number, priority: number): number {
    const normalizedPriority = Math.max(0, Math.min(1, priority / 10));
    return (
      entropy * this._entropyWeights.entropy +
      uniqueness * this._entropyWeights.uniqueness +
      normalizedPriority * this._entropyWeights.priority
    );
  }

  private _selectSlices(keyInfos: KeyInfo[]): KeyInfo[] {
    const sorted = [...keyInfos].sort((a, b) => b.score - a.score);
    const count = Math.min(this._maxSlices, sorted.length);
    
    if (this._mode === 'part-for-whole') {
      return this._greedyDiverseSelection(sorted, count);
    } else {
      return sorted.slice(-count).reverse();
    }
  }

  private _greedyDiverseSelection(sorted: KeyInfo[], count: number): KeyInfo[] {
    const selected: KeyInfo[] = [];
    const remaining = [...sorted];
    
    while (selected.length < count && remaining.length > 0) {
      if (selected.length === 0) {
        selected.push(remaining.shift()!);
        continue;
      }
      
      let bestIdx = 0;
      let bestDiversityScore = -1;
      
      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];
        const minSimilarity = Math.min(
          ...selected.map(s => this._keySimilarity(candidate.key, s.key))
        );
        const diversityScore = candidate.score * (0.5 + 0.5 * (1 - minSimilarity));
        if (diversityScore > bestDiversityScore) {
          bestDiversityScore = diversityScore;
          bestIdx = i;
        }
      }
      
      selected.push(remaining.splice(bestIdx, 1)[0]);
    }
    
    return selected.sort((a, b) => b.score - a.score);
  }

  private _keySimilarity(keyA: string, keyB: string): number {
    const cooc = this._cooccurrenceMatrix.get(keyA)?.get(keyB) ?? 0;
    const maxCooc = Math.max(
      ...Array.from(this._cooccurrenceMatrix.get(keyA)?.values() ?? [0]),
      1
    );
    return cooc / maxCooc;
  }

  private _computeSliceCoverage(slice: KeyInfo, all: KeyInfo[]): number {
    const totalScore = all.reduce((s, k) => s + k.score, 0);
    return totalScore === 0 ? 1 / all.length : slice.score / totalScore;
  }

  private _computeTotalCoverage(selected: KeyInfo[], all: KeyInfo[]): number {
    const selectedScores = selected.reduce((s, k) => s + k.score, 0);
    const totalScores = all.reduce((s, k) => s + k.score, 0);
    return totalScores === 0 ? 0 : selectedScores / totalScores;
  }

  private _reconstruct(
    slices: SynecdocheSlice[],
    original: Record<string, unknown>,
    selectedInfos: KeyInfo[]
  ): Record<string, unknown> {
    const reconstructed: Record<string, unknown> = {};
    const selectedKeys = new Set(selectedInfos.map(s => s.key));
    
    for (const slice of slices) {
      reconstructed[slice.key] = slice.value;
    }
    
    const allKeys = Object.keys(original);
    const missingKeys = allKeys.filter(k => !selectedKeys.has(k));
    
    for (const missingKey of missingKeys) {
      let closestKey = selectedInfos[0]?.key;
      let closestSim = -1;
      for (const info of selectedInfos) {
        const sim = this._keySimilarity(missingKey, info.key);
        if (sim > closestSim) {
          closestSim = sim;
          closestKey = info.key;
        }
      }
      if (closestKey) {
        reconstructed[missingKey] = { _inferred: true, _from: closestKey, _confidence: closestSim };
      }
    }
    
    reconstructed._reconstructed = true;
    reconstructed._missingKeys = missingKeys;
    reconstructed._inferredCount = missingKeys.length;
    return reconstructed;
  }

  private _recordCoverage(whole: Record<string, unknown>, coverage: number): void {
    const sig = this._signature(whole);
    if (!this._coverageHistory.has(sig)) {
      this._coverageHistory.set(sig, []);
    }
    const history = this._coverageHistory.get(sig)!;
    history.push(coverage);
    if (history.length > 32) history.shift();
  }

  private _updateCooccurrence(whole: Record<string, unknown>, selectedKeys: string[]): void {
    for (const keyA of selectedKeys) {
      if (!this._cooccurrenceMatrix.has(keyA)) {
        this._cooccurrenceMatrix.set(keyA, new Map());
      }
      const row = this._cooccurrenceMatrix.get(keyA)!;
      for (const keyB of selectedKeys) {
        if (keyA === keyB) continue;
        row.set(keyB, (row.get(keyB) ?? 0) + 1);
      }
    }
  }

  private _signature(obj: Record<string, unknown>): string {
    return Object.keys(obj).sort().join('|');
  }

  private _hashKey(key: string): string {
    let h = 0;
    for (let i = 0; i < key.length; i++) {
      h = ((h << 5) - h + key.charCodeAt(i)) | 0;
    }
    return Math.abs(h).toString(36);
  }

  storeSlice(slice: SynecdocheSlice): void {
    this._slices.set(slice.id, slice);
  }

  batchCut(wholes: Record<string, unknown>[]): CondensedResult[] {
    return wholes.map(w => this.cut(w));
  }

  expandSlice(sliceId: string, template: Record<string, unknown>): Record<string, unknown> | undefined {
    const slice = this._slices.get(sliceId);
    if (!slice) return undefined;
    return { ...template, [slice.key]: slice.value, _expanded: true };
  }

  averageCoverage(): number {
    if (this._slices.size === 0) return 0;
    return Array.from(this._slices.values()).reduce((s, x) => s + x.coverage, 0) / this._slices.size;
  }

  representativeSlices(): SynecdocheSlice[] {
    return Array.from(this._slices.values()).filter(s => s.representative);
  }

  coverageTrend(whole: Record<string, unknown>): 'improving' | 'declining' | 'stable' {
    const sig = this._signature(whole);
    const history = this._coverageHistory.get(sig) ?? [];
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
    this._slices.clear();
    this._keyPriority.clear();
    this._coverageHistory.clear();
    this._cooccurrenceMatrix.clear();
  }

  get sliceCount(): number {
    return this._slices.size;
  }

  get mode(): SynecdocheMode {
    return this._mode;
  }

  get maxSlices(): number {
    return this._maxSlices;
  }

  get entropyWeights(): { entropy: number; uniqueness: number; priority: number } {
    return { ...this._entropyWeights };
  }
}
