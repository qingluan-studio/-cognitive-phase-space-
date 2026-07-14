export interface OasisCacheData {
  size: number;
  hits: number;
  misses: number;
  keys: string[];
}

export interface CacheEntry {
  value: unknown;
  expiresAt: number;
  rescued: number;
}

export class OasisCache {
  private _store: Map<string, CacheEntry>;
  private _hits: number;
  private _misses: number;
  private _ttl: number;
  private _accessFrequency: Map<string, number>;
  private _evictionPolicy: 'lru' | 'lfu' | 'random';

  constructor(ttl: number = 60000) {
    this._store = new Map<string, CacheEntry>();
    this._hits = 0;
    this._misses = 0;
    this._ttl = ttl;
    this._accessFrequency = new Map();
    this._evictionPolicy = 'lru';
  }

  get size(): number {
    return this._store.size;
  }

  get hitRate(): number {
    const total = this._hits + this._misses;
    return total === 0 ? 0 : this._hits / total;
  }

  get evictionPolicy(): string {
    return this._evictionPolicy;
  }

  public set(key: string, value: unknown, hungerLevel: number = 0): void {
    const expiresAt = Date.now() + this._ttl;
    this._store.set(key, { value, expiresAt, rescued: hungerLevel });
    this._accessFrequency.set(key, (this._accessFrequency.get(key) ?? 0) + 1);
  }

  public get(key: string): unknown | null {
    const entry = this._store.get(key);
    if (!entry) {
      this._misses += 1;
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this._store.delete(key);
      this._misses += 1;
      return null;
    }
    this._hits += 1;
    this._accessFrequency.set(key, (this._accessFrequency.get(key) ?? 0) + 1);
    return entry.value;
  }

  public evaporate(): void {
    const now = Date.now();
    for (const [k, e] of this._store) {
      if (now > e.expiresAt) this._store.delete(k);
    }
  }

  public drainStarved(threshold: number): string[] {
    const drained: string[] = [];
    for (const [k, e] of this._store) {
      if (e.rescued < threshold) {
        drained.push(k);
        this._store.delete(k);
      }
    }
    return drained;
  }

  public clear(): void {
    this._store.clear();
    this._hits = 0;
    this._misses = 0;
    this._accessFrequency.clear();
  }

  public report(): OasisCacheData {
    return {
      size: this._store.size,
      hits: this._hits,
      misses: this._misses,
      keys: Array.from(this._store.keys()),
    };
  }

  public evict(count: number): string[] {
    const evicted: string[] = [];
    const keys = Array.from(this._store.keys());
    let sorted: string[] = [];
    if (this._evictionPolicy === 'lru') {
      sorted = keys.sort((a, b) => (this._store.get(a)?.expiresAt ?? 0) - (this._store.get(b)?.expiresAt ?? 0));
    } else if (this._evictionPolicy === 'lfu') {
      sorted = keys.sort((a, b) => (this._accessFrequency.get(a) ?? 0) - (this._accessFrequency.get(b) ?? 0));
    } else {
      sorted = keys.sort(() => Math.random() - 0.5);
    }
    for (let i = 0; i < Math.min(count, sorted.length); i++) {
      this._store.delete(sorted[i]);
      evicted.push(sorted[i]);
    }
    return evicted;
  }

  public setEvictionPolicy(policy: 'lru' | 'lfu' | 'random'): void {
    this._evictionPolicy = policy;
  }

  public computeCacheEntropy(): number {
    const freqs = Array.from(this._accessFrequency.values());
    const total = freqs.reduce((a, b) => a + b, 0);
    if (total === 0) return 0;
    let entropy = 0;
    for (const f of freqs) {
      const p = f / total;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    return entropy;
  }
}
