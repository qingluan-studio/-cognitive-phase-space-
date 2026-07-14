export interface CacheEntry {
  key: string;
  value: Record<string, unknown>;
  frequency: number;
  timestamp: number;
  ttl: number;
  entropy: number;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
  hitRatio: number;
  entropy: number;
}

export class CeremonialCache {
  private _entries: Map<string, CacheEntry> = new Map();
  private _metrics: CacheMetrics = { hits: 0, misses: 0, evictions: 0, hitRatio: 0, entropy: 0 };
  private _state: Record<string, unknown> = {};
  private _capacity: number = 100;
  private _replacementPolicy: 'lru' | 'lfu' | 'fifo' = 'lru';
  private _ttlDecayRate: number = 0.99;

  constructor(capacity: number, policy: 'lru' | 'lfu' | 'fifo' = 'lru') {
    this._capacity = capacity;
    this._replacementPolicy = policy;
  }

  get size(): number {
    return this._entries.size;
  }

  get capacity(): number {
    return this._capacity;
  }

  get hitRatio(): number {
    return this._metrics.hitRatio;
  }

  set(key: string, value: Record<string, unknown>, ttl: number = 60000): void {
    const entropy = this._computeEntryEntropy(value);
    const entry: CacheEntry = {
      key,
      value: { ...value },
      frequency: 1,
      timestamp: Date.now(),
      ttl,
      entropy,
    };
    if (this._entries.size >= this._capacity && !this._entries.has(key)) {
      this._evict();
    }
    this._entries.set(key, entry);
  }

  get(key: string): Record<string, unknown> | undefined {
    const entry = this._entries.get(key);
    if (!entry) {
      this._metrics.misses++;
      this._updateHitRatio();
      return undefined;
    }
    if (Date.now() - entry.timestamp > entry.ttl) {
      this._entries.delete(key);
      this._metrics.misses++;
      this._updateHitRatio();
      return undefined;
    }
    entry.frequency++;
    entry.timestamp = Date.now();
    this._metrics.hits++;
    this._updateHitRatio();
    return { ...entry.value };
  }

  private _computeEntryEntropy(value: Record<string, unknown>): number {
    const keys = Object.keys(value);
    if (keys.length === 0) return 0;
    const lengths = keys.map((k) => String(value[k]).length);
    const total = lengths.reduce((s, v) => s + v, 0);
    if (total === 0) return 0;
    return -lengths.reduce((s, v) => {
      const p = v / total;
      return p > 0 ? s + p * Math.log2(p) : s;
    }, 0);
  }

  private _evict(): void {
    if (this._entries.size === 0) return;
    let victim: string | null = null;
    if (this._replacementPolicy === 'lru') {
      let oldest = Infinity;
      for (const [k, e] of this._entries) {
        if (e.timestamp < oldest) {
          oldest = e.timestamp;
          victim = k;
        }
      }
    } else if (this._replacementPolicy === 'lfu') {
      let lowest = Infinity;
      for (const [k, e] of this._entries) {
        if (e.frequency < lowest) {
          lowest = e.frequency;
          victim = k;
        }
      }
    } else {
      const first = this._entries.keys().next().value;
      victim = first ?? null;
    }
    if (victim) {
      this._entries.delete(victim);
      this._metrics.evictions++;
    }
  }

  private _updateHitRatio(): void {
    const total = this._metrics.hits + this._metrics.misses;
    this._metrics.hitRatio = total > 0 ? this._metrics.hits / total : 0;
  }

  computeCacheEntropy(): number {
    const entropies = Array.from(this._entries.values()).map((e) => e.entropy);
    const total = entropies.reduce((s, v) => s + v, 0);
    if (total === 0) return 0;
    return -entropies.reduce((s, v) => {
      const p = v / total;
      return p > 0 ? s + p * Math.log2(p) : s;
    }, 0);
  }

  decayAll(): void {
    const now = Date.now();
    for (const entry of this._entries.values()) {
      entry.ttl *= this._ttlDecayRate;
      if (now - entry.timestamp > entry.ttl) {
        entry.frequency = Math.max(1, entry.frequency - 1);
      }
    }
  }

  ttlDistribution(): { mean: number; variance: number } {
    const ttls = Array.from(this._entries.values()).map((e) => e.ttl);
    const mean = ttls.reduce((s, v) => s + v, 0) / (ttls.length || 1);
    const variance = ttls.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (ttls.length || 1);
    return { mean, variance };
  }

  clear(): void {
    this._entries.clear();
    this._metrics = { hits: 0, misses: 0, evictions: 0, hitRatio: 0, entropy: 0 };
  }

  report(): Record<string, unknown> {
    return {
      size: this._entries.size,
      capacity: this._capacity,
      hits: this._metrics.hits,
      misses: this._metrics.misses,
      hitRatio: this._metrics.hitRatio,
      entropy: this.computeCacheEntropy(),
      state: this._state,
    };
  }
}
