/**
 * 绿洲缓存模块：在绝境中突然出现的救命缓存。
 * 命中率极低但价值极高，使用 TTL 与饥饿度共同决定淘汰策略。
 */

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

  constructor(ttl: number = 60000) {
    this._store = new Map<string, CacheEntry>();
    this._hits = 0;
    this._misses = 0;
    this._ttl = ttl;
  }

  get size(): number {
    return this._store.size;
  }

  get hitRate(): number {
    const total = this._hits + this._misses;
    return total === 0 ? 0 : this._hits / total;
  }

  public set(key: string, value: unknown, hungerLevel: number = 0): void {
    const expiresAt = Date.now() + this._ttl;
    this._store.set(key, { value, expiresAt, rescued: hungerLevel });
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
  }

  public report(): OasisCacheData {
    return {
      size: this._store.size,
      hits: this._hits,
      misses: this._misses,
      keys: Array.from(this._store.keys()),
    };
  }
}
