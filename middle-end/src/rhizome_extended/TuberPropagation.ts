/**
 * 块茎繁殖模块：通过无性复制产生模块副本，并在复制过程中引入变异，
 * 生成既有亲本特征又有个体差异的后代。仿生自马铃薯块茎的繁殖方式。
 */

export type MutationKind = 'neutral' | 'beneficial' | 'harmful';

export interface TuberVariant {
  id: string;
  parentId: string;
  generation: number;
  traits: Record<string, unknown>;
  mutations: MutationKind[];
  fitness: number;
}

export interface PropagationResult {
  parentId: string;
  offspring: TuberVariant[];
  propagatedAt: number;
}

export class TuberPropagation {
  private _tubers: Map<string, TuberVariant> = new Map();
  private _history: PropagationResult[] = [];
  private _mutationRate = 0.15;
  private _maxOffspring = 5;

  plant(tuber: TuberVariant): void {
    this._tubers.set(tuber.id, tuber);
  }

  propagate(parentId: string, count: number): PropagationResult | null {
    const parent = this._tubers.get(parentId);
    if (!parent) return null;
    const actualCount = Math.min(count, this._maxOffspring);
    const offspring: TuberVariant[] = [];
    for (let i = 0; i < actualCount; i++) {
      const variant = this._mutate(parent);
      offspring.push(variant);
      this._tubers.set(variant.id, variant);
    }
    const result: PropagationResult = {
      parentId,
      offspring,
      propagatedAt: Date.now(),
    };
    this._history.push(result);
    if (this._history.length > 200) this._history.shift();
    return result;
  }

  private _mutate(parent: TuberVariant): TuberVariant {
    const traits: Record<string, unknown> = { ...parent.traits };
    const mutations: MutationKind[] = [];
    let fitnessDelta = 0;
    for (const key of Object.keys(traits)) {
      if (Math.random() < this._mutationRate) {
        const kind = this._pickMutationKind();
        mutations.push(kind);
        if (kind === 'beneficial') fitnessDelta += 0.1;
        else if (kind === 'harmful') fitnessDelta -= 0.1;
        if (typeof traits[key] === 'number') {
          const original = traits[key] as number;
          traits[key] = original + (Math.random() - 0.5) * 0.3;
        }
      }
    }
    return {
      id: `tuber-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      parentId: parent.id,
      generation: parent.generation + 1,
      traits,
      mutations,
      fitness: Math.max(0, Math.min(1, parent.fitness + fitnessDelta)),
    };
  }

  private _pickMutationKind(): MutationKind {
    const r = Math.random();
    if (r < 0.5) return 'neutral';
    if (r < 0.8) return 'beneficial';
    return 'harmful';
  }

  selectFittest(topN: number): TuberVariant[] {
    return Array.from(this._tubers.values())
      .sort((a, b) => b.fitness - a.fitness)
      .slice(0, topN);
  }

  cullWeak(threshold: number): number {
    let removed = 0;
    for (const [id, tuber] of this._tubers) {
      if (tuber.fitness < threshold) {
        this._tubers.delete(id);
        removed++;
      }
    }
    return removed;
  }

  getLineage(tuberId: string): TuberVariant[] {
    const chain: TuberVariant[] = [];
    let current = this._tubers.get(tuberId);
    while (current) {
      chain.unshift(current);
      current = this._tubers.get(current.parentId);
    }
    return chain;
  }

  setMutationRate(rate: number): void {
    this._mutationRate = Math.max(0, Math.min(1, rate));
  }

  getHistory(limit: number = 50): PropagationResult[] {
    return this._history.slice(-limit);
  }

  get tuberCount(): number {
    return this._tubers.size;
  }

  get averageFitness(): number {
    if (this._tubers.size === 0) return 0;
    let sum = 0;
    for (const t of this._tubers.values()) sum += t.fitness;
    return sum / this._tubers.size;
  }
}
