/**
 * 普罗米修斯之手：从任何前端中窃取隐藏的"火种"数据——那些被刻意
 * 隐藏、混淆或延迟加载的敏感片段，将其带回供系统使用与分析。
 */

export type EmberKind = 'hidden-field' | 'obfuscated-var' | 'lazy-payload' | 'shadow-attr' | 'encrypted-blob';

export interface Ember {
  id: string;
  kind: EmberKind;
  location: string;
  raw: Record<string, unknown>;
  value: unknown;
  stolenAt: number;
}

export interface TheftPlan {
  targetUrl: string;
  selectors: string[];
  deobfuscate: boolean;
  depth: number;
}

export interface StolenCache {
  embers: Ember[];
  totalValue: number;
}

export class PrometheusHand {
  private _embers: Map<string, Ember> = new Map();
  private _plans: Map<string, TheftPlan> = new Map();
  private _cache: StolenCache = { embers: [], totalValue: 0 };
  private _deobfuscators: Map<EmberKind, (raw: Record<string, unknown>) => unknown> = new Map();
  private _theftCount = 0;

  registerPlan(plan: TheftPlan): void {
    this._plans.set(plan.targetUrl, plan);
  }

  registerDeobfuscator(kind: EmberKind, fn: (raw: Record<string, unknown>) => unknown): void {
    this._deobfuscators.set(kind, fn);
  }

  reach(targetUrl: string, discovered: Array<{ kind: EmberKind; location: string; raw: Record<string, unknown> }>): Ember[] {
    const plan = this._plans.get(targetUrl);
    const results: Ember[] = [];
    for (const item of discovered) {
      const id = `ember-${++this._theftCount}`;
      let value: unknown = item.raw;
      if (plan?.deobfuscate) {
        const deob = this._deobfuscators.get(item.kind);
        value = deob ? deob(item.raw) : item.raw;
      }
      const ember: Ember = {
        id,
        kind: item.kind,
        location: item.location,
        raw: item.raw,
        value,
        stolenAt: Date.now(),
      };
      this._embers.set(id, ember);
      results.push(ember);
    }
    this._refreshCache();
    return results;
  }

  private _refreshCache(): void {
    const embers = Array.from(this._embers.values());
    const totalValue = embers.reduce((sum, e) => sum + this._scoreEmber(e), 0);
    this._cache = { embers, totalValue };
  }

  private _scoreEmber(ember: Ember): number {
    const weights: Record<EmberKind, number> = {
      'hidden-field': 1,
      'obfuscated-var': 2,
      'lazy-payload': 1.5,
      'shadow-attr': 1,
      'encrypted-blob': 3,
    };
    return weights[ember.kind] * (ember.value ? 1 : 0.1);
  }

  retrieveEmber(id: string): Ember | undefined {
    return this._embers.get(id);
  }

  filterByKind(kind: EmberKind): Ember[] {
    return Array.from(this._embers.values()).filter(e => e.kind === kind);
  }

  purgeEmber(id: string): boolean {
    const removed = this._embers.delete(id);
    if (removed) this._refreshCache();
    return removed;
  }

  getCache(): StolenCache {
    return { ...this._cache, embers: [...this._cache.embers] };
  }

  listTargets(): string[] {
    return Array.from(this._plans.keys());
  }

  get theftCount(): number {
    return this._theftCount;
  }

  get emberCount(): number {
    return this._embers.size;
  }
}
