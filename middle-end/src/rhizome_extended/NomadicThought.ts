/**
 * 游牧思想模块：思维模式不固定于某一领域，
 * 在不同知识领域间游牧迁徙，从一处采撷概念移至他处应用。
 */

export interface ThoughtTerritory {
  id: string;
  domain: string;
  fertility: number;
  visitedAt: number;
}

export interface NomadicMove {
  from: string;
  to: string;
  concepts: string[];
  movedAt: number;
}

export class NomadicThought {
  private _territories: Map<string, ThoughtTerritory> = new Map();
  private _moves: NomadicMove[] = [];
  private _current: string | null = null;
  private _exhaustionThreshold = 0.2;

  claimTerritory(territory: ThoughtTerritory): void {
    this._territories.set(territory.id, territory);
    if (this._current === null) this._current = territory.id;
  }

  moveTo(territoryId: string, concepts: string[]): NomadicMove | null {
    if (!this._territories.has(territoryId)) return null;
    const from = this._current ?? 'origin';
    const move: NomadicMove = {
      from,
      to: territoryId,
      concepts,
      movedAt: Date.now(),
    };
    this._moves.push(move);
    if (this._moves.length > 200) this._moves.shift();
    const target = this._territories.get(territoryId)!;
    target.visitedAt = Date.now();
    this._current = territoryId;
    return move;
  }

  graze(extractCount: number): string[] {
    if (!this._current) return [];
    const territory = this._territories.get(this._current);
    if (!territory) return [];
    const concepts: string[] = [];
    for (let i = 0; i < extractCount; i++) {
      concepts.push(`${territory.domain}-concept-${i}-${Math.random().toString(36).slice(2, 6)}`);
      territory.fertility = Math.max(0, territory.fertility - 0.1);
    }
    return concepts;
  }

  assessExhaustion(): string[] {
    const exhausted: string[] = [];
    for (const [id, t] of this._territories) {
      if (t.fertility < this._exhaustionThreshold) exhausted.push(id);
    }
    return exhausted;
  }

  restTerritory(territoryId: string, recovery: number): boolean {
    const territory = this._territories.get(territoryId);
    if (!territory) return false;
    territory.fertility = Math.min(1, territory.fertility + recovery);
    return true;
  }

  migrateWhenExhausted(concepts: string[]): NomadicMove | null {
    if (!this._current) return null;
    const current = this._territories.get(this._current);
    if (!current || current.fertility >= this._exhaustionThreshold) return null;
    const candidates = Array.from(this._territories.values())
      .filter(t => t.id !== this._current)
      .sort((a, b) => b.fertility - a.fertility);
    if (candidates.length === 0) return null;
    return this.moveTo(candidates[0].id, concepts);
  }

  getMoveHistory(limit: number = 50): NomadicMove[] {
    return this._moves.slice(-limit);
  }

  getCurrentTerritory(): ThoughtTerritory | null {
    if (!this._current) return null;
    return this._territories.get(this._current) ?? null;
  }

  get territoryCount(): number {
    return this._territories.size;
  }

  get totalMoves(): number {
    return this._moves.length;
  }
}
