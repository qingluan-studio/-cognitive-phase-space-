import { DataPacket } from '../shared/types';

export type EvictionPolicy = 'LRU' | 'LFU' | 'FIFO' | 'RANDOM' | 'TTL' | 'ARC';
export type ConsistencyMode = 'STRONG' | 'EVENTUAL' | 'WEAK' | 'SESSION';
export type CacheTier = 'L1' | 'L2' | 'L3' | 'DISK';

export interface CacheEntry {
  key: string;
  value: unknown;
  size: number;
  createdAt: number;
  lastAccessedAt: number;
  accessCount: number;
  expiresAt?: number;
  version: number;
  tags: Set<string>;
}

export interface CacheStatistics {
  tier: CacheTier;
  capacity: number;
  used: number;
  entryCount: number;
  hits: number;
  misses: number;
  evictions: number;
  hitRate: number;
  avgAccessTime: number;
  totalAccessTime: number;
  totalOperations: number;
}

export interface CacheInvalidationEvent {
  key: string;
  reason: 'EXPLICIT' | 'TTL' | 'EVICTION' | 'UPDATE';
  timestamp: number;
  oldValue?: unknown;
}

export interface CachePenetrationGuard {
  bloomFilter: Set<string>;
  nullCacheTTL: number;
  enabled: boolean;
}

export interface CacheBreakdownGuard {
  mutexLocks: Map<string, Promise<unknown>>;
  singleFlightEnabled: boolean;
  hotKeyThreshold: number;
}

export interface CacheAvalancheGuard {
  randomTTLJitter: number;
  staggeredExpiration: boolean;
  circuitBreakerThreshold: number;
  circuitBreakerOpen: boolean;
  fallbackEnabled: boolean;
}

export interface MultiLevelCacheConfig {
  tiers: Map<CacheTier, { capacity: number; evictionPolicy: EvictionPolicy }>;
  writeThrough: boolean;
  writeBehind: boolean;
  consistencyMode: ConsistencyMode;
}

export interface CacheSystemState {
  statistics: Map<CacheTier, CacheStatistics>;
  totalHits: number;
  totalMisses: number;
  overallHitRate: number;
  lastOperation?: { type: string; key: string; hit: boolean };
  lastInvalidation?: CacheInvalidationEvent;
  penetrationGuard: { enabled: boolean; bloomFilterSize: number };
  breakdownGuard: { enabled: boolean; activeLocks: number };
  avalancheGuard: { enabled: boolean; circuitBreakerOpen: boolean };
}

export class CacheSystem {
  private _cacheStores: Map<CacheTier, Map<string, CacheEntry>> = new Map();
  private _statistics: Map<CacheTier, CacheStatistics> = new Map();
  private _evictionPolicies: Map<CacheTier, EvictionPolicy> = new Map();
  private _accessOrder: Map<CacheTier, string[]> = new Map();
  private _lfuCounts: Map<CacheTier, Map<string, number>> = new Map();
  private _totalHits: number = 0;
  private _totalMisses: number = 0;
  private _counter: number = 0;
  private _lastOperation: { type: string; key: string; hit: boolean } | null = null;
  private _lastInvalidation: CacheInvalidationEvent | null = null;
  private _consistencyMode: ConsistencyMode = 'EVENTUAL';
  private _penetrationGuard: CachePenetrationGuard;
  private _breakdownGuard: CacheBreakdownGuard;
  private _avalancheGuard: CacheAvalancheGuard;
  private _defaultTTL: number = 3600000;
  private _warmupData: Map<string, unknown> = new Map();

  constructor() {
    this._initializeCacheTiers();
    this._penetrationGuard = {
      bloomFilter: new Set(),
      nullCacheTTL: 60000,
      enabled: true
    };
    this._breakdownGuard = {
      mutexLocks: new Map(),
      singleFlightEnabled: true,
      hotKeyThreshold: 1000
    };
    this._avalancheGuard = {
      randomTTLJitter: 0.1,
      staggeredExpiration: true,
      circuitBreakerThreshold: 0.5,
      circuitBreakerOpen: false,
      fallbackEnabled: true
    };
    this._initializeWarmupData();
  }

  private _initializeCacheTiers(): void {
    const tiers: CacheTier[] = ['L1', 'L2', 'L3'];
    const capacities = [10 * 1024 * 1024, 100 * 1024 * 1024, 1024 * 1024 * 1024];
    const policies: EvictionPolicy[] = ['LRU', 'LFU', 'FIFO'];

    for (let i = 0; i < tiers.length; i++) {
      const tier = tiers[i];
      this._cacheStores.set(tier, new Map());
      this._accessOrder.set(tier, []);
      this._lfuCounts.set(tier, new Map());
      this._evictionPolicies.set(tier, policies[i]);
      const stats: CacheStatistics = {
        tier,
        capacity: capacities[i],
        used: 0,
        entryCount: 0,
        hits: 0,
        misses: 0,
        evictions: 0,
        hitRate: 0,
        avgAccessTime: 0,
        totalAccessTime: 0,
        totalOperations: 0
      };
      this._statistics.set(tier, stats);
    }
  }

  private _initializeWarmupData(): void {
    const warmupKeys = [
      'config:app_settings',
      'config:feature_flags',
      'user:profile:default',
      'product:categories',
      'locale:en:translations'
    ];
    for (const key of warmupKeys) {
      this._warmupData.set(key, { warmed: true, key, timestamp: Date.now() });
      this.set(key, { warmed: true, key }, 'L1');
      this._penetrationGuard.bloomFilter.add(key);
    }
  }

  get totalHits(): number {
    return this._totalHits;
  }

  get totalMisses(): number {
    return this._totalMisses;
  }

  get overallHitRate(): number {
    const total = this._totalHits + this._totalMisses;
    return total > 0 ? (this._totalHits / total) * 100 : 0;
  }

  get statistics(): Map<CacheTier, CacheStatistics> {
    return this._statistics;
  }

  get consistencyMode(): ConsistencyMode {
    return this._consistencyMode;
  }

  get penetrationGuardEnabled(): boolean {
    return this._penetrationGuard.enabled;
  }

  get breakdownGuardEnabled(): boolean {
    return this._breakdownGuard.singleFlightEnabled;
  }

  get avalancheGuardEnabled(): boolean {
    return this._avalancheGuard.fallbackEnabled;
  }

  get lastOperation(): { type: string; key: string; hit: boolean } | null {
    return this._lastOperation;
  }

  get lastInvalidation(): CacheInvalidationEvent | null {
    return this._lastInvalidation;
  }

  get defaultTTL(): number {
    return this._defaultTTL;
  }

  get(key: string, tier: CacheTier = 'L1'): unknown | undefined {
    const startTime = Date.now();
    const store = this._cacheStores.get(tier);
    const stats = this._statistics.get(tier);
    if (!store || !stats) return undefined;

    stats.totalOperations++;
    const entry = store.get(key);

    if (entry) {
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        store.delete(key);
        stats.entryCount--;
        stats.used -= entry.size;
        stats.evictions++;
        this._recordInvalidation(key, 'TTL', entry.value);
        this._updateAccessOrder(tier, key, true);
        this._totalMisses++;
        stats.misses++;
        this._updateHitRate(stats);
        this._recordAccessTime(stats, startTime);
        this._lastOperation = { type: 'GET', key, hit: false };
        return undefined;
      }

      entry.lastAccessedAt = Date.now();
      entry.accessCount++;
      this._updateAccessOrder(tier, key, false);
      this._totalHits++;
      stats.hits++;
      this._updateHitRate(stats);
      this._recordAccessTime(stats, startTime);
      this._lastOperation = { type: 'GET', key, hit: true };
      return entry.value;
    }

    this._totalMisses++;
    stats.misses++;
    this._updateHitRate(stats);
    this._recordAccessTime(stats, startTime);
    this._lastOperation = { type: 'GET', key, hit: false };

    const lowerTier = this._getLowerTier(tier);
    if (lowerTier) {
      const lowerValue = this.get(key, lowerTier);
      if (lowerValue !== undefined) {
        this.set(key, lowerValue, tier);
        return lowerValue;
      }
    }

    return undefined;
  }

  set(key: string, value: unknown, tier: CacheTier = 'L1', ttl?: number): boolean {
    const store = this._cacheStores.get(tier);
    const stats = this._statistics.get(tier);
    if (!store || !stats) return false;

    const size = this._estimateSize(value);
    const existing = store.get(key);

    if (existing) {
      stats.used -= existing.size;
      stats.entryCount--;
    }

    while (stats.used + size > stats.capacity && store.size > 0) {
      this._evictEntry(tier);
    }

    const now = Date.now();
    let effectiveTTL = ttl !== undefined ? ttl : this._defaultTTL;
    if (this._avalancheGuard.staggeredExpiration) {
      const jitter = effectiveTTL * this._avalancheGuard.randomTTLJitter * (Math.random() * 2 - 1);
      effectiveTTL = Math.max(0, effectiveTTL + jitter);
    }

    const entry: CacheEntry = {
      key,
      value,
      size,
      createdAt: now,
      lastAccessedAt: now,
      accessCount: existing ? existing.accessCount + 1 : 1,
      expiresAt: now + effectiveTTL,
      version: existing ? existing.version + 1 : 1,
      tags: new Set()
    };

    store.set(key, entry);
    stats.used += size;
    stats.entryCount++;
    this._updateAccessOrder(tier, key, !existing);
    this._penetrationGuard.bloomFilter.add(key);

    if (this._consistencyMode === 'STRONG') {
      this._propagateToLowerTiers(key, value, tier, ttl);
    }

    this._lastOperation = { type: 'SET', key, hit: existing ? true : false };
    return true;
  }

  delete(key: string, tier?: CacheTier): boolean {
    const tiers = tier ? [tier] : (['L1', 'L2', 'L3'] as CacheTier[]);
    let deleted = false;

    for (const t of tiers) {
      const store = this._cacheStores.get(t);
      const stats = this._statistics.get(t);
      if (!store || !stats) continue;

      const entry = store.get(key);
      if (entry) {
        store.delete(key);
        stats.entryCount--;
        stats.used -= entry.size;
        this._recordInvalidation(key, 'EXPLICIT', entry.value);
        this._removeFromAccessOrder(t, key);
        deleted = true;
      }
    }

    if (deleted) {
      this._lastOperation = { type: 'DELETE', key, hit: true };
    }

    return deleted;
  }

  has(key: string, tier: CacheTier = 'L1'): boolean {
    const store = this._cacheStores.get(tier);
    if (!store) return false;
    const entry = store.get(key);
    if (!entry) return false;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.delete(key, tier);
      return false;
    }
    return true;
  }

  private _estimateSize(value: unknown): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'string') return value.length * 2;
    if (typeof value === 'number') return 8;
    if (typeof value === 'boolean') return 1;
    try {
      return JSON.stringify(value).length * 2;
    } catch {
      return 256;
    }
  }

  private _evictEntry(tier: CacheTier): void {
    const store = this._cacheStores.get(tier);
    const stats = this._statistics.get(tier);
    const policy = this._evictionPolicies.get(tier);
    const order = this._accessOrder.get(tier);
    if (!store || !stats || !policy || !order || store.size === 0) return;

    let evictKey: string | undefined;

    switch (policy) {
      case 'LRU':
        evictKey = order[0];
        break;
      case 'LFU':
        const lfuCounts = this._lfuCounts.get(tier);
        if (lfuCounts) {
          let minCount = Infinity;
          for (const [key, count] of lfuCounts) {
            if (count < minCount) {
              minCount = count;
              evictKey = key;
            }
          }
        }
        break;
      case 'FIFO':
        evictKey = order[0];
        break;
      case 'RANDOM':
        const keys = Array.from(store.keys());
        evictKey = keys[Math.floor(Math.random() * keys.length)];
        break;
      case 'TTL':
        let earliestExpiry = Infinity;
        for (const [key, entry] of store) {
          if (entry.expiresAt && entry.expiresAt < earliestExpiry) {
            earliestExpiry = entry.expiresAt;
            evictKey = key;
          }
        }
        break;
      default:
        evictKey = order[0];
    }

    if (evictKey) {
      const entry = store.get(evictKey);
      if (entry) {
        store.delete(evictKey);
        stats.entryCount--;
        stats.used -= entry.size;
        stats.evictions++;
        this._recordInvalidation(evictKey, 'EVICTION', entry.value);
        this._removeFromAccessOrder(tier, evictKey);
        const lfuCounts = this._lfuCounts.get(tier);
        if (lfuCounts) lfuCounts.delete(evictKey);
      }
    }
  }

  private _updateAccessOrder(tier: CacheTier, key: string, isNew: boolean): void {
    const order = this._accessOrder.get(tier);
    const lfuCounts = this._lfuCounts.get(tier);
    if (!order) return;

    const idx = order.indexOf(key);
    if (idx > -1) order.splice(idx, 1);
    order.push(key);

    if (lfuCounts) {
      lfuCounts.set(key, (lfuCounts.get(key) || 0) + 1);
    }
  }

  private _removeFromAccessOrder(tier: CacheTier, key: string): void {
    const order = this._accessOrder.get(tier);
    if (!order) return;
    const idx = order.indexOf(key);
    if (idx > -1) order.splice(idx, 1);
  }

  private _recordInvalidation(key: string, reason: CacheInvalidationEvent['reason'], oldValue?: unknown): void {
    this._lastInvalidation = {
      key,
      reason,
      timestamp: Date.now(),
      oldValue
    };
  }

  private _updateHitRate(stats: CacheStatistics): void {
    const total = stats.hits + stats.misses;
    stats.hitRate = total > 0 ? (stats.hits / total) * 100 : 0;
  }

  private _recordAccessTime(stats: CacheStatistics, startTime: number): void {
    const time = Date.now() - startTime;
    stats.totalAccessTime += time;
    if (stats.totalOperations > 0) {
      stats.avgAccessTime = stats.totalAccessTime / stats.totalOperations;
    }
  }

  private _getLowerTier(tier: CacheTier): CacheTier | null {
    const tiers: CacheTier[] = ['L1', 'L2', 'L3'];
    const idx = tiers.indexOf(tier);
    return idx < tiers.length - 1 ? tiers[idx + 1] : null;
  }

  private _propagateToLowerTiers(key: string, value: unknown, fromTier: CacheTier, ttl?: number): void {
    let tier = this._getLowerTier(fromTier);
    while (tier) {
      this.set(key, value, tier, ttl);
      tier = this._getLowerTier(tier);
    }
  }

  getOrCompute(key: string, computeFn: () => unknown, tier: CacheTier = 'L1', ttl?: number): unknown {
    const cached = this.get(key, tier);
    if (cached !== undefined) return cached;

    if (this._penetrationGuard.enabled && !this._penetrationGuard.bloomFilter.has(key)) {
      return null;
    }

    if (this._breakdownGuard.singleFlightEnabled && this._breakdownGuard.mutexLocks.has(key)) {
      return this._breakdownGuard.mutexLocks.get(key);
    }

    const promise = Promise.resolve().then(() => {
      try {
        const value = computeFn();
        if (value === null || value === undefined) {
          this.set(key, null, tier, this._penetrationGuard.nullCacheTTL);
        } else {
          this.set(key, value, tier, ttl);
        }
        this._breakdownGuard.mutexLocks.delete(key);
        return value;
      } catch (e) {
        this._breakdownGuard.mutexLocks.delete(key);
        throw e;
      }
    });

    if (this._breakdownGuard.singleFlightEnabled) {
      this._breakdownGuard.mutexLocks.set(key, promise);
    }

    return promise;
  }

  invalidateByTag(tag: string): number {
    let count = 0;
    for (const [tier, store] of this._cacheStores) {
      const toDelete: string[] = [];
      for (const [key, entry] of store) {
        if (entry.tags.has(tag)) {
          toDelete.push(key);
        }
      }
      for (const key of toDelete) {
        this.delete(key, tier);
        count++;
      }
    }
    return count;
  }

  invalidateAll(): void {
    for (const [tier, store] of this._cacheStores) {
      const stats = this._statistics.get(tier);
      store.clear();
      if (stats) {
        stats.entryCount = 0;
        stats.used = 0;
      }
      const order = this._accessOrder.get(tier);
      if (order) order.length = 0;
      const lfu = this._lfuCounts.get(tier);
      if (lfu) lfu.clear();
    }
  }

  addTag(key: string, tag: string, tier: CacheTier = 'L1'): boolean {
    const store = this._cacheStores.get(tier);
    if (!store) return false;
    const entry = store.get(key);
    if (!entry) return false;
    entry.tags.add(tag);
    return true;
  }

  removeTag(key: string, tag: string, tier: CacheTier = 'L1'): boolean {
    const store = this._cacheStores.get(tier);
    if (!store) return false;
    const entry = store.get(key);
    if (!entry) return false;
    return entry.tags.delete(tag);
  }

  setConsistencyMode(mode: ConsistencyMode): void {
    this._consistencyMode = mode;
  }

  setEvictionPolicy(tier: CacheTier, policy: EvictionPolicy): void {
    this._evictionPolicies.set(tier, policy);
  }

  setDefaultTTL(ms: number): void {
    this._defaultTTL = ms;
  }

  enablePenetrationGuard(enabled: boolean): void {
    this._penetrationGuard.enabled = enabled;
  }

  enableBreakdownGuard(enabled: boolean): void {
    this._breakdownGuard.singleFlightEnabled = enabled;
  }

  enableAvalancheGuard(enabled: boolean): void {
    this._avalancheGuard.fallbackEnabled = enabled;
  }

  getTierStats(tier: CacheTier): CacheStatistics | undefined {
    return this._statistics.get(tier);
  }

  getHotKeys(tier: CacheTier, topN: number = 10): Array<{ key: string; accessCount: number }> {
    const store = this._cacheStores.get(tier);
    if (!store) return [];
    return Array.from(store.values())
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, topN)
      .map(e => ({ key: e.key, accessCount: e.accessCount }));
  }

  getExpiringKeys(tier: CacheTier, withinMs: number): string[] {
    const store = this._cacheStores.get(tier);
    if (!store) return [];
    const now = Date.now();
    const result: string[] = [];
    for (const [key, entry] of store) {
      if (entry.expiresAt && entry.expiresAt - now < withinMs) {
        result.push(key);
      }
    }
    return result;
  }

  warmup(entries: Array<{ key: string; value: unknown }>, tier: CacheTier = 'L2'): number {
    let count = 0;
    for (const entry of entries) {
      if (this.set(entry.key, entry.value, tier)) {
        count++;
      }
    }
    return count;
  }

  getOverallStats(): {
    totalEntries: number;
    totalCapacity: number;
    totalUsed: number;
    overallHitRate: number;
    totalHits: number;
    totalMisses: number;
    totalEvictions: number;
  } {
    let totalEntries = 0;
    let totalCapacity = 0;
    let totalUsed = 0;
    let totalEvictions = 0;
    for (const stats of this._statistics.values()) {
      totalEntries += stats.entryCount;
      totalCapacity += stats.capacity;
      totalUsed += stats.used;
      totalEvictions += stats.evictions;
    }
    return {
      totalEntries,
      totalCapacity,
      totalUsed,
      overallHitRate: this.overallHitRate,
      totalHits: this._totalHits,
      totalMisses: this._totalMisses,
      totalEvictions
    };
  }

  toPacket(): DataPacket<CacheSystemState> {
    const state: CacheSystemState = {
      statistics: this._statistics,
      totalHits: this._totalHits,
      totalMisses: this._totalMisses,
      overallHitRate: this.overallHitRate,
      lastOperation: this._lastOperation || undefined,
      lastInvalidation: this._lastInvalidation || undefined,
      penetrationGuard: {
        enabled: this._penetrationGuard.enabled,
        bloomFilterSize: this._penetrationGuard.bloomFilter.size
      },
      breakdownGuard: {
        enabled: this._breakdownGuard.singleFlightEnabled,
        activeLocks: this._breakdownGuard.mutexLocks.size
      },
      avalancheGuard: {
        enabled: this._avalancheGuard.fallbackEnabled,
        circuitBreakerOpen: this._avalancheGuard.circuitBreakerOpen
      }
    };
    this._counter++;
    return {
      id: `cache-system-${Date.now()}-${this._counter}`,
      payload: state,
      metadata: {
        createdAt: Date.now(),
        route: ['database', 'cache'],
        priority: 1,
        phase: 'caching'
      }
    };
  }

  reset(): void {
    this._cacheStores.clear();
    this._statistics.clear();
    this._evictionPolicies.clear();
    this._accessOrder.clear();
    this._lfuCounts.clear();
    this._totalHits = 0;
    this._totalMisses = 0;
    this._counter = 0;
    this._lastOperation = null;
    this._lastInvalidation = null;
    this._consistencyMode = 'EVENTUAL';
    this._penetrationGuard = {
      bloomFilter: new Set(),
      nullCacheTTL: 60000,
      enabled: true
    };
    this._breakdownGuard = {
      mutexLocks: new Map(),
      singleFlightEnabled: true,
      hotKeyThreshold: 1000
    };
    this._avalancheGuard = {
      randomTTLJitter: 0.1,
      staggeredExpiration: true,
      circuitBreakerThreshold: 0.5,
      circuitBreakerOpen: false,
      fallbackEnabled: true
    };
    this._warmupData.clear();
    this._initializeCacheTiers();
    this._initializeWarmupData();
  }
}
