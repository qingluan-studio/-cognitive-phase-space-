export type EmberKind = 'hidden-field' | 'obfuscated-var' | 'lazy-payload' | 'shadow-attr' | 'encrypted-blob';

export interface Ember {
  id: string;
  kind: EmberKind;
  location: string;
  raw: Record<string, unknown>;
  value: unknown;
  stolenAt: number;
  quality: number;
  extractionEffort: number;
  freshness: number;
}

export interface TheftPlan {
  targetUrl: string;
  selectors: string[];
  deobfuscate: boolean;
  depth: number;
  priority: number;
  timeout: number;
}

export interface StolenCache {
  embers: Ember[];
  totalValue: number;
  averageQuality: number;
  coverage: number;
}

export interface ExtractionReport {
  targetUrl: string;
  totalDiscovered: number;
  successfullyExtracted: number;
  failedCount: number;
  avgQuality: number;
  totalEffort: number;
}

export class PrometheusHand {
  private _embers: Map<string, Ember> = new Map();
  private _plans: Map<string, TheftPlan> = new Map();
  private _cache: StolenCache = { embers: [], totalValue: 0, averageQuality: 0, coverage: 0 };
  private _deobfuscators: Map<EmberKind, (raw: Record<string, unknown>) => unknown> = new Map();
  private _theftCount = 0;
  private _extractionReports: ExtractionReport[] = [];
  private _qualityDecay = 0.995;

  constructor() {
    this._registerDefaultDeobfuscators();
  }

  private _registerDefaultDeobfuscators(): void {
    this._deobfuscators.set('hidden-field', (raw) => raw);
    this._deobfuscators.set('obfuscated-var', this._deobfuscateVariable.bind(this));
    this._deobfuscators.set('lazy-payload', this._decodeLazyPayload.bind(this));
    this._deobfuscators.set('shadow-attr', (raw) => {
      const result: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(raw)) {
        if (!k.startsWith('_')) result[k] = v;
      }
      return result;
    });
    this._deobfuscators.set('encrypted-blob', this._decryptBlob.bind(this));
  }

  private _deobfuscateVariable(raw: Record<string, unknown>): unknown {
    const value = raw.value as string;
    if (!value) return raw;
    let decoded = '';
    for (let i = 0; i < value.length; i++) {
      decoded += String.fromCharCode(value.charCodeAt(i) ^ 0x5F);
    }
    return { ...raw, value: decoded };
  }

  private _decodeLazyPayload(raw: Record<string, unknown>): unknown {
    const payload = raw.payload as string;
    if (!payload) return raw;
    try {
      return { ...raw, decoded: JSON.parse(atob(payload)) };
    } catch {
      return raw;
    }
  }

  private _decryptBlob(raw: Record<string, unknown>): unknown {
    const data = raw.data as string;
    if (!data) return raw;
    const key = (raw.key as number) || 0xAA;
    let decrypted = '';
    for (let i = 0; i < data.length; i++) {
      decrypted += String.fromCharCode(data.charCodeAt(i) ^ key ^ (i % 256));
    }
    return { ...raw, decrypted };
  }

  registerPlan(plan: TheftPlan): void {
    this._plans.set(plan.targetUrl, plan);
  }

  registerDeobfuscator(kind: EmberKind, fn: (raw: Record<string, unknown>) => unknown): void {
    this._deobfuscators.set(kind, fn);
  }

  reach(targetUrl: string, discovered: Array<{ kind: EmberKind; location: string; raw: Record<string, unknown> }>): Ember[] {
    const plan = this._plans.get(targetUrl);
    const results: Ember[] = [];
    let totalQuality = 0;
    let totalEffort = 0;

    for (const item of discovered) {
      this._theftCount++;
      const id = `ember-${this._theftCount}`;

      let value: unknown = item.raw;
      let effort = 1;

      if (plan?.deobfuscate) {
        const deob = this._deobfuscators.get(item.kind);
        if (deob) {
          try {
            value = deob(item.raw);
            effort = this._calculateExtractionEffort(item.kind, item.raw);
          } catch {
            effort = 5;
          }
        }
      }

      const quality = this._calculateQuality(item.kind, value, effort);
      totalQuality += quality;
      totalEffort += effort;

      const ember: Ember = {
        id,
        kind: item.kind,
        location: item.location,
        raw: item.raw,
        value,
        stolenAt: Date.now(),
        quality,
        extractionEffort: effort,
        freshness: 1,
      };

      this._embers.set(id, ember);
      results.push(ember);
    }

    this._refreshCache();

    const report: ExtractionReport = {
      targetUrl,
      totalDiscovered: discovered.length,
      successfullyExtracted: results.length,
      failedCount: discovered.length - results.length,
      avgQuality: results.length > 0 ? totalQuality / results.length : 0,
      totalEffort,
    };
    this._extractionReports.push(report);

    return results;
  }

  private _calculateExtractionEffort(kind: EmberKind, raw: Record<string, unknown>): number {
    const baseEfforts: Record<EmberKind, number> = {
      'hidden-field': 1,
      'obfuscated-var': 2,
      'lazy-payload': 3,
      'shadow-attr': 1,
      'encrypted-blob': 5,
    };
    const size = JSON.stringify(raw).length;
    const sizeFactor = Math.min(3, size / 100);
    return baseEfforts[kind] * sizeFactor;
  }

  private _calculateQuality(kind: EmberKind, value: unknown, effort: number): number {
    const weights: Record<EmberKind, number> = {
      'hidden-field': 1,
      'obfuscated-var': 2,
      'lazy-payload': 1.5,
      'shadow-attr': 1,
      'encrypted-blob': 3,
    };

    const valueFactor = value && typeof value === 'object' ? 1.5 : 1;
    const effortFactor = Math.max(0.5, 1 - effort * 0.1);

    return weights[kind] * valueFactor * effortFactor;
  }

  private _refreshCache(): void {
    const embers = Array.from(this._embers.values());
    const now = Date.now();

    for (const ember of embers) {
      const ageHours = (now - ember.stolenAt) / 3600000;
      ember.freshness = Math.max(0, 1 - ageHours * 0.1);
    }

    const totalValue = embers.reduce((sum, e) => sum + this._scoreEmber(e), 0);
    const avgQuality = embers.length > 0
      ? embers.reduce((sum, e) => sum + e.quality, 0) / embers.length
      : 0;

    const targetUrls = new Set(this._plans.keys());
    const stolenUrls = new Set(embers.map(e => new URL(e.location).hostname));
    const coverage = targetUrls.size > 0 ? stolenUrls.size / targetUrls.size : 0;

    this._cache = { embers, totalValue, averageQuality: avgQuality, coverage };
  }

  private _scoreEmber(ember: Ember): number {
    const weights: Record<EmberKind, number> = {
      'hidden-field': 1,
      'obfuscated-var': 2,
      'lazy-payload': 1.5,
      'shadow-attr': 1,
      'encrypted-blob': 3,
    };
    return weights[ember.kind] * ember.quality * ember.freshness;
  }

  retrieveEmber(id: string): Ember | undefined {
    const e = this._embers.get(id);
    return e ? { ...e } : undefined;
  }

  filterByKind(kind: EmberKind): Ember[] {
    return Array.from(this._embers.values())
      .filter(e => e.kind === kind)
      .map(e => ({ ...e }));
  }

  filterByFreshness(minFreshness: number): Ember[] {
    this._refreshCache();
    return Array.from(this._embers.values())
      .filter(e => e.freshness >= minFreshness)
      .map(e => ({ ...e }));
  }

  purgeEmber(id: string): boolean {
    const removed = this._embers.delete(id);
    if (removed) this._refreshCache();
    return removed;
  }

  purgeStaleEmbers(maxAgeHours: number): number {
    const cutoff = Date.now() - maxAgeHours * 3600000;
    let removed = 0;

    for (const [id, ember] of this._embers) {
      if (ember.stolenAt < cutoff) {
        this._embers.delete(id);
        removed++;
      }
    }

    if (removed > 0) this._refreshCache();
    return removed;
  }

  getCache(): StolenCache {
    this._refreshCache();
    return { ...this._cache, embers: this._cache.embers.map(e => ({ ...e })) };
  }

  listTargets(): string[] {
    return Array.from(this._plans.keys());
  }

  getExtractionReports(): ExtractionReport[] {
    return [...this._extractionReports];
  }

  get theftCount(): number {
    return this._theftCount;
  }

  get emberCount(): number {
    return this._embers.size;
  }

  get cacheCoverage(): number {
    return this._cache.coverage;
  }
}