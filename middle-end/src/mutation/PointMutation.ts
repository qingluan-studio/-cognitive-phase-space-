/**
 * 点突变：单个字符的改变产生全新功能。
 * 在源代码或字符串中执行单点字符替换，并追踪该突变是否催生新的功能性变更。
 */

export interface PointMutationRecord {
  id: string;
  source: string;
  position: number;
  originalChar: string;
  mutatedChar: string;
  functionalChange: boolean;
  occurredAt: number;
}

export class PointMutation {
  private _records: PointMutationRecord[] = [];
  private _alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  private _functionalChars: Set<string> = new Set(['a', 'e', 'i', 'o', 'u', '0', '1']);
  private _maxRecords = 500;

  mutate(source: string, position?: number): PointMutationRecord | null {
    if (source.length === 0) return null;
    const pos = position ?? Math.floor(Math.random() * source.length);
    const originalChar = source[pos];
    const mutatedChar = this._alphabet[Math.floor(Math.random() * this._alphabet.length)];
    const functionalChange = this._functionalChars.has(originalChar) !== this._functionalChars.has(mutatedChar);
    const record: PointMutationRecord = {
      id: `mut-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      source,
      position: pos,
      originalChar,
      mutatedChar,
      functionalChange,
      occurredAt: Date.now(),
    };
    this._records.push(record);
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

  countFunctionalChanges(): number {
    return this._records.filter(r => r.functionalChange).length;
  }

  revertMutation(record: PointMutationRecord): string | null {
    if (!record.source || record.position >= record.source.length) return null;
    return record.source;
  }

  computeMutationDensity(): number {
    if (this._records.length === 0) return 0;
    return this.countFunctionalChanges() / this._records.length;
  }

  setAlphabet(alphabet: string): void {
    this._alphabet = alphabet;
  }

  getRecord(id: string): PointMutationRecord | null {
    return this._records.find(r => r.id === id) ?? null;
  }

  getRecords(limit: number = 100): PointMutationRecord[] {
    return this._records.slice(-limit);
  }

  get totalMutations(): number {
    return this._records.length;
  }
}
