export interface PastLife {
  id: string;
  moduleName: string;
  memories: Record<string, unknown>;
  causeOfDeath: string;
  diedAt: number;
  fitness: number;
}

export interface Reincarnation {
  id: string;
  moduleName: string;
  inheritedFrom: string[];
  bornAt: number;
  generation: number;
  fitness: number;
}

export interface InheritedMemory {
  trait: string;
  weight: number;
  payload: Record<string, unknown>;
  lineageCount: number;
}

export class PalingenesisCore {
  private _pastLives: PastLife[] = [];
  private _incarnations: Reincarnation[] = [];
  private _inheritance: Map<string, InheritedMemory[]> = new Map();
  private _generation: number = 0;
  private _traitFreq: Map<string, number> = new Map();
  private _lineageTree: Map<string, string[]> = new Map();
  private _bestFitness: number = 0;
  private _selectionPressure: number = 0.7;

  get generation(): number { return this._generation; }
  get incarnations(): Reincarnation[] { return [...this._incarnations]; }
  get pastLifeCount(): number { return this._pastLives.length; }
  get bestFitness(): number { return this._bestFitness; }
  get totalTraits(): number { return this._traitFreq.size; }

  recordLife(moduleName: string, memories: Record<string, unknown>, cause: string): PastLife {
    const fitness = this._computeLifeFitness(memories, cause);
    const life: PastLife = {
      id: `life-${moduleName}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      moduleName, memories, causeOfDeath: cause, diedAt: Date.now(), fitness,
    };
    this._pastLives.push(life);
    this._bestFitness = Math.max(this._bestFitness, fitness);
    return life;
  }

  inherit(lifeId: string): InheritedMemory[] {
    const life = this._pastLives.find(l => l.id === lifeId);
    if (!life) return [];
    const traits: InheritedMemory[] = [];
    for (const [key, value] of Object.entries(life.memories)) {
      const baseW = typeof value === 'number' ? Math.min(1, Math.max(0, value)) : 0.5;
      const freqBonus = (this._traitFreq.get(key) ?? 0) * 0.05;
      const fitBonus = life.fitness * 0.3;
      const weight = Math.min(1, baseW + freqBonus + fitBonus);
      traits.push({
        trait: key, weight,
        payload: { value, origin: lifeId, cause: life.causeOfDeath },
        lineageCount: 1,
      });
      this._traitFreq.set(key, (this._traitFreq.get(key) ?? 0) + 1);
    }
    this._inheritance.set(lifeId, traits);
    return traits;
  }

  reincarnate(moduleName: string, ancestorIds: string[]): Reincarnation {
    this._generation++;
    for (const id of ancestorIds) if (!this._inheritance.has(id)) this.inherit(id);
    const combined = this._mergeInheritance(ancestorIds);
    const fitness = combined.reduce((s, t) => s + t.weight, 0) / Math.max(1, combined.length);
    const incarnation: Reincarnation = {
      id: `inc-${moduleName}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      moduleName, inheritedFrom: ancestorIds, bornAt: Date.now(),
      generation: this._generation, fitness,
    };
    this._incarnations.push(incarnation);
    this._lineageTree.set(incarnation.id, ancestorIds);
    return incarnation;
  }

  recall(incarnationId: string): InheritedMemory[] {
    const inc = this._incarnations.find(i => i.id === incarnationId);
    if (!inc) return [];
    return this._mergeInheritance(inc.inheritedFrom);
  }

  evolve(): InheritedMemory[] {
    const agg = new Map<string, { total: number; count: number; payload: Record<string, unknown> }>();
    for (const traits of this._inheritance.values()) {
      for (const t of traits) {
        const cur = agg.get(t.trait) ?? { total: 0, count: 0, payload: t.payload };
        cur.total += t.weight; cur.count++;
        agg.set(t.trait, cur);
      }
    }
    return [...agg.entries()]
      .map(([trait, v]) => ({ trait, weight: v.total / v.count, payload: v.payload, lineageCount: v.count }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 10);
  }

  selectParents(count: number = 2): string[] {
    const sorted = [...this._pastLives].sort((a, b) => b.fitness - a.fitness);
    const pool = sorted.slice(0, Math.ceil(sorted.length * this._selectionPressure));
    const selected: string[] = [];
    for (let i = 0; i < Math.min(count, pool.length); i++) {
      selected.push(pool[Math.floor(Math.random() * pool.length)].id);
    }
    return selected;
  }

  lineageDistance(aId: string, bId: string): number {
    const ancA = this._getAllAncestors(aId);
    const ancB = this._getAllAncestors(bId);
    const common = new Set([...ancA].filter(x => ancB.has(x)));
    const maxDepth = Math.max(ancA.size, ancB.size, 1);
    return 1 - common.size / maxDepth;
  }

  getMemories(): PastLife[] { return [...this._pastLives]; }
  setSelectionPressure(pressure: number): void {
    this._selectionPressure = Math.max(0.1, Math.min(1, pressure));
  }
  getDominantTraits(n: number = 5): InheritedMemory[] { return this.evolve().slice(0, n); }

  private _computeLifeFitness(memories: Record<string, unknown>, cause: string): number {
    let score = 0;
    const entries = Object.entries(memories);
    for (const [, value] of entries) {
      if (typeof value === 'number') score += Math.min(1, Math.max(0, value));
      else if (typeof value === 'boolean') score += value ? 0.8 : 0.2;
      else score += 0.5;
    }
    const avg = entries.length > 0 ? score / entries.length : 0;
    const penalty = cause.includes('error') || cause.includes('crash') ? 0.3 : 0;
    return Math.max(0, Math.min(1, avg - penalty));
  }

  private _mergeInheritance(ancestorIds: string[]): InheritedMemory[] {
    const merged = new Map<string, { weight: number; payload: Record<string, unknown>; count: number }>();
    for (const id of ancestorIds) {
      const traits = this._inheritance.get(id) ?? [];
      for (const t of traits) {
        const cur = merged.get(t.trait) ?? { weight: 0, payload: t.payload, count: 0 };
        cur.weight += t.weight; cur.count++;
        merged.set(t.trait, cur);
      }
    }
    return [...merged.entries()].map(([trait, v]) => ({
      trait, weight: v.weight / v.count, payload: v.payload, lineageCount: v.count,
    }));
  }

  private _getAllAncestors(id: string): Set<string> {
    const ancestors = new Set<string>();
    const queue = [id];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const parents = this._lineageTree.get(current);
      if (parents) for (const p of parents) {
        if (!ancestors.has(p)) { ancestors.add(p); queue.push(p); }
      }
    }
    return ancestors;
  }
}
