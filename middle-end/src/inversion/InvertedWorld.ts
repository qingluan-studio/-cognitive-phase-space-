/**
 * 颠倒世界：把所有逻辑颠倒运行。
 * 将输入的真值、顺序、符号全部取反，以镜像世界的逻辑运行并输出反演结果。
 */

export interface InvertedFact {
  id: string;
  original: boolean;
  inverted: boolean;
  recordedAt: number;
}

export interface WorldSnapshot {
  facts: InvertedFact[];
  invertedOrder: string[];
  createdAt: number;
}

export class InvertedWorld {
  private _facts: Map<string, InvertedFact> = new Map();
  private _snapshots: WorldSnapshot[] = [];
  private _order: string[] = [];
  private _inversionCount = 0;

  ingestFact(id: string, value: boolean): InvertedFact {
    const fact: InvertedFact = {
      id,
      original: value,
      inverted: !value,
      recordedAt: Date.now(),
    };
    this._facts.set(id, fact);
    this._order.push(id);
    this._inversionCount++;
    return fact;
  }

  invertAll(): InvertedFact[] {
    const results: InvertedFact[] = [];
    for (const f of this._facts.values()) {
      f.inverted = !f.inverted;
      results.push(f);
    }
    return results;
  }

  reverseOrder(): string[] {
    this._order = [...this._order].reverse();
    return [...this._order];
  }

  query(id: string): boolean | null {
    const f = this._facts.get(id);
    return f ? f.inverted : null;
  }

  snapshot(): WorldSnapshot {
    const snap: WorldSnapshot = {
      facts: Array.from(this._facts.values()).map(f => ({ ...f })),
      invertedOrder: [...this._order],
      createdAt: Date.now(),
    };
    this._snapshots.push(snap);
    if (this._snapshots.length > 50) this._snapshots.shift();
    return snap;
  }

  restore(snapshot: WorldSnapshot): void {
    this._facts.clear();
    for (const f of snapshot.facts) this._facts.set(f.id, { ...f });
    this._order = [...snapshot.invertedOrder];
  }

  getFacts(): InvertedFact[] {
    return Array.from(this._facts.values());
  }

  getSnapshots(): WorldSnapshot[] {
    return [...this._snapshots];
  }

  get inversionCount(): number {
    return this._inversionCount;
  }
}
