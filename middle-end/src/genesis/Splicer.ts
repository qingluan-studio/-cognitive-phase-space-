/**
 * 拼接者：跨模块剪切思想片段并杂交产生新模块。
 * 在不同模块中剪切思想片段，重组杂交为新的合成模块，
 * 评估其可执行性后提交到产物库。
 */

export interface ThoughtFragment {
  id: string;
  originModule: string;
  content: Record<string, unknown>;
  quality: number;
}

export interface HybridModule {
  id: string;
  fragments: string[];
  combined: Record<string, unknown>;
  viability: number;
  committed: boolean;
}

export class Splicer {
  private _fragments: Map<string, ThoughtFragment> = new Map();
  private _hybrids: HybridModule[] = [];
  private _viabilityThreshold: number = 0.6;

  /** 从指定模块剪切一个思想片段。 */
  harvest(originModule: string, content: Record<string, unknown>, quality: number): ThoughtFragment {
    const fragment: ThoughtFragment = {
      id: `frag-${originModule}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      originModule,
      content,
      quality,
    };
    this._fragments.set(fragment.id, fragment);
    return fragment;
  }

  /** 把多个片段拼接为合成模块。 */
  splice(fragmentIds: string[]): HybridModule | null {
    const frags = fragmentIds.map(id => this._fragments.get(id)).filter((f): f is ThoughtFragment => !!f);
    if (frags.length < 2) return null;
    const combined: Record<string, unknown> = {};
    for (const f of frags) Object.assign(combined, f.content);
    const hybrid: HybridModule = {
      id: `hybrid-${Date.now()}`,
      fragments: frags.map(f => f.id),
      combined,
      viability: 0,
      committed: false,
    };
    this._hybrids.push(hybrid);
    return hybrid;
  }

  /** 把两个片段杂交：交叉重组其内容。 */
  hybridize(idA: string, idB: string): HybridModule | null {
    const a = this._fragments.get(idA);
    const b = this._fragments.get(idB);
    if (!a || !b) return null;
    const keysA = Object.keys(a.content);
    const keysB = Object.keys(b.content);
    const combined: Record<string, unknown> = {};
    keysA.forEach((k, i) => {
      combined[k] = i % 2 === 0 ? a.content[k] : b.content[k];
    });
    keysB.forEach((k, i) => {
      if (!(k in combined)) combined[k] = i % 2 === 0 ? b.content[k] : a.content[k];
    });
    const hybrid: HybridModule = {
      id: `hyb-${Date.now()}`,
      fragments: [idA, idB],
      combined,
      viability: (a.quality + b.quality) / 2,
      committed: false,
    };
    this._hybrids.push(hybrid);
    return hybrid;
  }

  evaluate(hybridId: string, viability: number): void {
    const h = this._hybrids.find(x => x.id === hybridId);
    if (h) h.viability = viability;
  }

  /** 通过性达标的合成模块才能提交。 */
  commit(hybridId: string): boolean {
    const h = this._hybrids.find(x => x.id === hybridId);
    if (!h || h.committed) return false;
    if (h.viability < this._viabilityThreshold) return false;
    h.committed = true;
    return true;
  }

  getFragments(): ThoughtFragment[] {
    return [...this._fragments.values()];
  }

  get hybrids(): HybridModule[] {
    return [...this._hybrids];
  }

  get committedCount(): number {
    return this._hybrids.filter(h => h.committed).length;
  }
}
