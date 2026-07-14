export interface PointMutationRecord {
  id: string;
  source: string;
  position: number;
  originalChar: string;
  mutatedChar: string;
  functionalChange: boolean;
  transition: boolean;
  occurredAt: number;
}

export class PointMutation {
  private _records: PointMutationRecord[] = [];
  private _alphabet: string = 'abcdefghijklmnopqrstuvwxyz0123456789';
  private _functionalChars: Set<string> = new Set(['a', 'e', 'i', 'o', 'u', '0', '1']);
  private _purines: Set<string> = new Set(['a', 'g']);
  private _pyrimidines: Set<string> = new Set(['c', 't']);
  private _positionWeight: Map<number, number> = new Map();
  private _maxRecords: number = 500;

  mutate(source: string, position?: number): PointMutationRecord | null {
    if (source.length === 0) return null;
    const pos = position ?? this._weightedPosition(source.length);
    const originalChar = source[pos];
    const mutatedChar = this._selectMutatedChar(originalChar);
    const functionalChange = this._functionalChars.has(originalChar) !== this._functionalChars.has(mutatedChar);
    const transition = this._isTransition(originalChar, mutatedChar);
    const record: PointMutationRecord = {
      id: `mut-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      source,
      position: pos,
      originalChar,
      mutatedChar,
      functionalChange,
      transition,
      occurredAt: Date.now(),
    };
    this._records.push(record);
    this._positionWeight.set(pos, (this._positionWeight.get(pos) ?? 0) + 1);
    if (this._records.length > this._maxRecords) this._records.shift();
    return record;
  }

  applyMutation(source: string, record: PointMutationRecord): string {
    return source.slice(0, record.position) + record.mutatedChar + source.slice(record.position + 1);
  }

  batchMutate(source: string, count: number): PointMutationRecord[] {
    const results: PointMutationRecord[] = [];
    let current = source;
    for (let i = 0; i < count; i++) {
      const record = this.mutate(current);
      if (!record) break;
      current = this.applyMutation(current, record);
      results.push(record);
    }
    return results;
  }

  hammingDistance(a: string, b: string): number {
    if (a.length !== b.length) return -1;
    let distance = 0;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) distance++;
    }
    return distance;
  }

  levenshteinDistance(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      }
    }
    return dp[m][n];
  }

  countFunctionalChanges(): number {
    return this._records.filter((r) => r.functionalChange).length;
  }

  computeTransitionTransversionRatio(): number {
    const transitions = this._records.filter((r) => r.transition).length;
    const transversions = this._records.length - transitions;
    if (transversions === 0) return transitions > 0 ? Infinity : 0;
    return transitions / transversions;
  }

  revertMutation(record: PointMutationRecord): string | null {
    if (!record.source || record.position >= record.source.length) return null;
    return record.source;
  }

  computeMutationDensity(): number {
    if (this._records.length === 0) return 0;
    return this.countFunctionalChanges() / this._records.length;
  }

  computeMutationSpectrum(): Record<string, number> {
    const spectrum: Record<string, number> = {};
    for (const r of this._records) {
      const key = `${r.originalChar}>${r.mutatedChar}`;
      spectrum[key] = (spectrum[key] ?? 0) + 1;
    }
    return spectrum;
  }

  computeHotspots(): number[] {
    const sorted = [...this._positionWeight.entries()].sort((a, b) => b[1] - a[1]);
    const maxCount = sorted.length > 0 ? sorted[0][1] : 1;
    return sorted.filter(([, c]) => c >= maxCount * 0.5).map(([p]) => p);
  }

  setAlphabet(alphabet: string): void {
    this._alphabet = alphabet;
  }

  getRecord(id: string): PointMutationRecord | null {
    return this._records.find((r) => r.id === id) ?? null;
  }

  getRecords(limit: number = 100): PointMutationRecord[] {
    return this._records.slice(-limit);
  }

  get totalMutations(): number {
    return this._records.length;
  }

  private _weightedPosition(length: number): number {
    if (this._positionWeight.size === 0) {
      return Math.floor(Math.random() * length);
    }
    const totalWeight = [...this._positionWeight.values()].reduce((s, w) => s + w, 0);
    if (Math.random() < 0.7 && totalWeight > 0) {
      const entries = [...this._positionWeight.entries()];
      let roll = Math.random() * totalWeight;
      for (const [pos, w] of entries) {
        roll -= w;
        if (roll <= 0) return pos % length;
      }
    }
    return Math.floor(Math.random() * length);
  }

  private _selectMutatedChar(original: string): string {
    const candidates = this._alphabet.split('').filter((c) => c !== original);
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  private _isTransition(a: string, b: string): boolean {
    const aPurine = this._purines.has(a);
    const bPurine = this._purines.has(b);
    const aPyrimidine = this._pyrimidines.has(a);
    const bPyrimidine = this._pyrimidines.has(b);
    return (aPurine && bPurine) || (aPyrimidine && bPyrimidine);
  }
}
