/**
 * 格式塔聚合器模块：将碎片化的局部数据组合成
 * 大于部分之和的整体意义，遵循接近性、相似性、闭合性原则。
 */

export interface Fragment {
  id: string;
  data: Record<string, unknown>;
  position: number;
  similarityKey: string;
  weight: number;
}

export interface GestaltWhole {
  id: string;
  fragments: Fragment[];
  emergentMeaning: Record<string, unknown>;
  coherence: number;
  closed: boolean;
}

export type GestaltPrinciple = 'proximity' | 'similarity' | 'closure' | 'continuity';

export class GestaltAggregator {
  private _fragments: Map<string, Fragment> = new Map();
  private _wholes: Map<string, GestaltWhole> = new Map();
  private _principleWeights: Map<GestaltPrinciple, number> = new Map();
  private _nextWholeId = 0;

  constructor() {
    this._principleWeights.set('proximity', 0.4);
    this._principleWeights.set('similarity', 0.3);
    this._principleWeights.set('closure', 0.2);
    this._principleWeights.set('continuity', 0.1);
  }

  addFragment(fragment: Fragment): void {
    this._fragments.set(fragment.id, fragment);
  }

  setPrincipleWeight(principle: GestaltPrinciple, weight: number): void {
    this._principleWeights.set(principle, weight);
  }

  aggregate(threshold = 0.5): GestaltWhole[] {
    this._wholes.clear();
    const fragments = Array.from(this._fragments.values());
    const assigned = new Set<string>();

    for (const seed of fragments) {
      if (assigned.has(seed.id)) continue;
      const group: Fragment[] = [seed];
      assigned.add(seed.id);

      for (const candidate of fragments) {
        if (assigned.has(candidate.id)) continue;
        const score = this._affinity(seed, candidate);
        if (score >= threshold) {
          group.push(candidate);
          assigned.add(candidate.id);
        }
      }

      const whole = this._formWhole(group);
      this._wholes.set(whole.id, whole);
    }

    return Array.from(this._wholes.values());
  }

  private _affinity(a: Fragment, b: Fragment): number {
    const proximity = 1 - Math.min(1, Math.abs(a.position - b.position) / 100);
    const similarity = a.similarityKey === b.similarityKey ? 1 : 0;
    const closure = (group: Fragment[]): number => (group.length >= 3 ? 1 : 0);
    const continuity = Math.abs(a.position - b.position) <= 5 ? 1 : 0;

    const w = this._principleWeights;
    return (
      proximity * (w.get('proximity') ?? 0) +
      similarity * (w.get('similarity') ?? 0) +
      closure([a, b]) * (w.get('closure') ?? 0) +
      continuity * (w.get('continuity') ?? 0)
    );
  }

  private _formWhole(group: Fragment[]): GestaltWhole {
    const id = `whole-${this._nextWholeId++}`;
    const totalWeight = group.reduce((s, f) => s + f.weight, 0);
    const emergentMeaning: Record<string, unknown> = {
      fragmentCount: group.length,
      centroid: group.reduce((s, f) => s + f.position, 0) / group.length,
      dominantKey: this._dominantKey(group),
      totalWeight,
    };
    const coherence = group.length === 0 ? 0 : totalWeight / group.length;
    return {
      id,
      fragments: group,
      emergentMeaning,
      coherence,
      closed: group.length >= 3,
    };
  }

  private _dominantKey(group: Fragment[]): string {
    const counts = new Map<string, number>();
    for (const f of group) {
      counts.set(f.similarityKey, (counts.get(f.similarityKey) ?? 0) + 1);
    }
    let best = '';
    let max = 0;
    for (const [k, c] of counts) {
      if (c > max) { max = c; best = k; }
    }
    return best;
  }

  getWhole(id: string): GestaltWhole | undefined {
    return this._wholes.get(id);
  }

  dissolveWhole(id: string): boolean {
    const whole = this._wholes.get(id);
    if (!whole) return false;
    for (const f of whole.fragments) {
      this._fragments.delete(f.id);
    }
    return this._wholes.delete(id);
  }

  reset(): void {
    this._fragments.clear();
    this._wholes.clear();
  }

  get fragmentCount(): number {
    return this._fragments.size;
  }

  get wholeCount(): number {
    return this._wholes.size;
  }
}
