/**
 * 内外翻转：将内部状态与外部表现互换。
 * 将原本的内部状态外显化，同时将原本的外部表现内化，造成视角上的彻底翻转。
 */

export interface InnerState {
  id: string;
  content: string;
  visibility: 'hidden' | 'exposed';
}

export interface OuterExpression {
  id: string;
  content: string;
  location: 'external' | 'internalized';
}

export class TurnInsideOut {
  private _inner: Map<string, InnerState> = new Map();
  private _outer: Map<string, OuterExpression> = new Map();
  private _flipped: Set<string> = new Set();
  private _flipCount = 0;

  addInner(state: InnerState): void {
    this._inner.set(state.id, state);
  }

  addOuter(expr: OuterExpression): void {
    this._outer.set(expr.id, expr);
  }

  flip(id: string): { inner?: InnerState; outer?: OuterExpression } | null {
    const inner = this._inner.get(id);
    const outer = this._outer.get(id);
    if (!inner && !outer) return null;
    if (inner) {
      inner.visibility = inner.visibility === 'hidden' ? 'exposed' : 'hidden';
      this._flipped.add(id);
    }
    if (outer) {
      outer.location = outer.location === 'external' ? 'internalized' : 'external';
      this._flipped.add(id);
    }
    this._flipCount++;
    return { inner: inner ?? undefined, outer: outer ?? undefined };
  }

  flipAll(): void {
    for (const inner of this._inner.values()) {
      inner.visibility = inner.visibility === 'hidden' ? 'exposed' : 'hidden';
      this._flipped.add(inner.id);
    }
    for (const outer of this._outer.values()) {
      outer.location = outer.location === 'external' ? 'internalized' : 'external';
      this._flipped.add(outer.id);
    }
    this._flipCount++;
  }

  exposeInner(id: string): InnerState | null {
    const s = this._inner.get(id);
    if (!s) return null;
    s.visibility = 'exposed';
    return s;
  }

  internalizeOuter(id: string): OuterExpression | null {
    const e = this._outer.get(id);
    if (!e) return null;
    e.location = 'internalized';
    return e;
  }

  getFlipped(): string[] {
    return Array.from(this._flipped);
  }

  getInner(id: string): InnerState | null {
    return this._inner.get(id) ?? null;
  }

  getOuter(id: string): OuterExpression | null {
    return this._outer.get(id) ?? null;
  }

  get flipCount(): number {
    return this._flipCount;
  }
}
