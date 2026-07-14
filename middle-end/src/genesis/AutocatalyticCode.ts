/**
 * 自催化代码：写代码的代码，递归产出自身变体。
 * 以当前源码为模板，通过受控突变递归生成可执行变体，
 * 变体再作为下一轮模板，形成自催化链。
 */

export interface CodeVariant {
  id: string;
  source: string;
  generation: number;
  fitness: number;
  parentId: string | null;
}

export interface MutationProfile {
  rate: number;
  insertions: number;
  deletions: number;
}

export class AutocatalyticCode {
  private _variants: Map<string, CodeVariant> = new Map();
  private _template: string = '';
  private _generation: number = 0;
  private _mutation: MutationProfile = { rate: 0.1, insertions: 0, deletions: 0 };

  seed(source: string): CodeVariant {
    this._template = source;
    const variant: CodeVariant = {
      id: `v0-${Date.now()}`,
      source,
      generation: 0,
      fitness: 0,
      parentId: null,
    };
    this._variants.set(variant.id, variant);
    return variant;
  }

  /** 以指定变体为模板生成一代新变体。 */
  generate(parentId: string): CodeVariant | null {
    const parent = this._variants.get(parentId);
    if (!parent) return null;
    this._generation++;
    const mutated = this._mutate(parent.source);
    const variant: CodeVariant = {
      id: `v${this._generation}-${Date.now()}`,
      source: mutated,
      generation: this._generation,
      fitness: 0,
      parentId,
    };
    this._variants.set(variant.id, variant);
    return variant;
  }

  /** 递归自复制：以自身为模板连续产出 N 代。 */
  selfReplicate(rootId: string, depth: number): CodeVariant[] {
    const chain: CodeVariant[] = [];
    let current = this._variants.get(rootId);
    for (let i = 0; i < depth && current; i++) {
      const child = this.generate(current.id);
      if (!child) break;
      chain.push(child);
      current = child;
    }
    return chain;
  }

  evaluate(variantId: string, fitness: number): void {
    const v = this._variants.get(variantId);
    if (v) v.fitness = fitness;
  }

  /** 按适应度选出最优模板。 */
  select(): CodeVariant | null {
    let best: CodeVariant | null = null;
    for (const v of this._variants.values()) {
      if (!best || v.fitness > best.fitness) best = v;
    }
    if (best) this._template = best.source;
    return best;
  }

  setMutationRate(rate: number): void {
    this._mutation.rate = Math.max(0, Math.min(1, rate));
  }

  get generation(): number {
    return this._generation;
  }

  getVariants(): CodeVariant[] {
    return [...this._variants.values()];
  }

  private _mutate(source: string): string {
    const chars = source.split('');
    const rate = this._mutation.rate;
    for (let i = 0; i < chars.length; i++) {
      if (Math.random() < rate) {
        if (Math.random() < 0.5) {
          chars[i] = String.fromCharCode(chars[i].charCodeAt(0) + 1);
          this._mutation.insertions++;
        } else {
          chars[i] = '';
          this._mutation.deletions++;
        }
      }
    }
    return chars.join('');
  }
}
