/**
 * 沉默突变：不影响功能但有潜在差异。
 * 突变在表面上不改变系统行为，但在底层留下潜在差异，可能在未来条件下显现。
 */

export interface SilentMutationRecord {
  id: string;
  surface: string;
  underlying: string;
  latentDifference: number;
  expressed: boolean;
  occurredAt: number;
}

export class SilentMutation {
  private _records: SilentMutationRecord[] = [];
  private _synonymMap: Map<string, string> = new Map([
    ['color', 'colour'],
    ['gray', 'grey'],
    ['center', 'centre'],
  ]);
  private _expressionThreshold = 0.7;
  private _maxRecords = 300;

  mutate(surface: string): SilentMutationRecord | null {
    let underlying = surface;
    for (const [from, to] of this._synonymMap.entries()) {
      if (surface.includes(from)) {
        underlying = underlying.replace(from, to);
        break;
      }
    }
    if (underlying === surface) return null;
    const latentDifference = Math.random();
    const record: SilentMutationRecord = {
      id: `sm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      surface,
      underlying,
      latentDifference,
      expressed: false,
      occurredAt: Date.now(),
    };
    this._records.push(record);
    if (this._records.length > this._maxRecords) this._records.shift();
    return record;
  }

  express(recordId: string, conditionStrength: number): SilentMutationRecord | null {
    const record = this._records.find(r => r.id === recordId);
    if (!record || record.expressed) return null;
    if (conditionStrength * record.latentDifference >= this._expressionThreshold) {
      record.expressed = true;
    }
    return record;
  }

  addSynonym(from: string, to: string): void {
    this._synonymMap.set(from, to);
  }

  setExpressionThreshold(value: number): void {
    this._expressionThreshold = Math.max(0, Math.min(1, value));
  }

  getLatentOnly(): SilentMutationRecord[] {
    return this._records.filter(r => !r.expressed);
  }

  getExpressed(): SilentMutationRecord[] {
    return this._records.filter(r => r.expressed);
  }

  getRecord(id: string): SilentMutationRecord | null {
    return this._records.find(r => r.id === id) ?? null;
  }

  getRecords(limit: number = 100): SilentMutationRecord[] {
    return this._records.slice(-limit);
  }

  get totalMutations(): number {
    return this._records.length;
  }
}
