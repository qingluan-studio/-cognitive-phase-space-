export interface SilentMutationRecord {
  id: string;
  surface: string;
  underlying: string;
  latentDifference: number;
  expressed: boolean;
  entropyReduction: number;
  occurredAt: number;
}

export class SilentMutation {
  private _records: SilentMutationRecord[] = [];
  private _synonymMap: Map<string, string> = new Map([
    ['color', 'colour'],
    ['gray', 'grey'],
    ['center', 'centre'],
  ]);
  private _codonTable: Map<string, string> = new Map([
    ['aaa', 'F'], ['aab', 'F'], ['aac', 'L'], ['aad', 'L'],
    ['baa', 'S'], ['bab', 'S'], ['bac', 'S'], ['bad', 'S'],
  ]);
  private _expressionThreshold: number = 0.7;
  private _maxRecords: number = 300;

  mutate(surface: string): SilentMutationRecord | null {
    const underlying = this._applySynonyms(surface);
    if (underlying === surface) return null;
    const latentDifference = this._computeLatentDifference(surface, underlying);
    const entropyReduction = this._shannonEntropy(surface) - this._shannonEntropy(underlying);
    const record: SilentMutationRecord = {
      id: `sm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      surface,
      underlying,
      latentDifference,
      expressed: false,
      entropyReduction,
      occurredAt: Date.now(),
    };
    this._records.push(record);
    if (this._records.length > this._maxRecords) this._records.shift();
    return record;
  }

  express(recordId: string, conditionStrength: number): SilentMutationRecord | null {
    const record = this._records.find((r) => r.id === recordId);
    if (!record || record.expressed) return null;
    const activation = conditionStrength * record.latentDifference;
    if (activation >= this._expressionThreshold) {
      record.expressed = true;
    }
    return record;
  }

  computeDegeneracy(surface: string): number {
    const normalized = surface.toLowerCase();
    let alternatives = 0;
    for (const [from] of this._synonymMap.entries()) {
      if (normalized.includes(from)) alternatives++;
    }
    return alternatives;
  }

  computeSilentFraction(): number {
    if (this._records.length === 0) return 0;
    const silent = this._records.filter((r) => !r.expressed).length;
    return silent / this._records.length;
  }

  computeAverageLatentDifference(): number {
    if (this._records.length === 0) return 0;
    const sum = this._records.reduce((s, r) => s + r.latentDifference, 0);
    return sum / this._records.length;
  }

  computeExpressionRate(): number {
    if (this._records.length === 0) return 0;
    const expressed = this._records.filter((r) => r.expressed).length;
    return expressed / this._records.length;
  }

  addSynonym(from: string, to: string): void {
    this._synonymMap.set(from, to);
  }

  setExpressionThreshold(value: number): void {
    this._expressionThreshold = Math.max(0, Math.min(1, value));
  }

  getLatentOnly(): SilentMutationRecord[] {
    return this._records.filter((r) => !r.expressed);
  }

  getExpressed(): SilentMutationRecord[] {
    return this._records.filter((r) => r.expressed);
  }

  getRecord(id: string): SilentMutationRecord | null {
    return this._records.find((r) => r.id === id) ?? null;
  }

  getRecords(limit: number = 100): SilentMutationRecord[] {
    return this._records.slice(-limit);
  }

  get totalMutations(): number {
    return this._records.length;
  }

  private _applySynonyms(surface: string): string {
    let result = surface;
    for (const [from, to] of this._synonymMap.entries()) {
      if (surface.includes(from)) {
        result = result.replace(from, to);
        break;
      }
    }
    return result;
  }

  private _computeLatentDifference(surface: string, underlying: string): number {
    const surfaceCodons = this._extractCodons(surface);
    const underlyingCodons = this._extractCodons(underlying);
    const minLen = Math.min(surfaceCodons.length, underlyingCodons.length);
    if (minLen === 0) return Math.random();
    let silentCount = 0;
    for (let i = 0; i < minLen; i++) {
      const sAA = this._codonTable.get(surfaceCodons[i]) ?? '?';
      const uAA = this._codonTable.get(underlyingCodons[i]) ?? '?';
      if (sAA === uAA && surfaceCodons[i] !== underlyingCodons[i]) silentCount++;
    }
    return Math.min(1, silentCount / minLen + Math.random() * 0.1);
  }

  private _extractCodons(s: string): string[] {
    const codons: string[] = [];
    for (let i = 0; i + 3 <= s.length; i += 3) {
      codons.push(s.slice(i, i + 3).toLowerCase());
    }
    return codons;
  }

  private _shannonEntropy(text: string): number {
    if (text.length === 0) return 0;
    const freq: Record<string, number> = {};
    for (const ch of text) freq[ch] = (freq[ch] ?? 0) + 1;
    let entropy = 0;
    const len = text.length;
    for (const count of Object.values(freq)) {
      const p = count / len;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }
}
