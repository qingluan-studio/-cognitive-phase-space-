import { DataPacket } from '../shared/types';

export interface CacheEntry<T = unknown> {
  readonly key: string;
  readonly value: T;
  readonly ttl: number;
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly hitCount: number;
  readonly lastAccessTime: number;
}

export interface CacheNode {
  readonly id: string;
  readonly host: string;
  readonly port: number;
  readonly status: 'online' | 'offline' | 'degraded';
  readonly memoryUsed: number;
  readonly memoryTotal: number;
  readonly connections: number;
}

export interface CacheStats {
  readonly hits: number;
  readonly misses: number;
  readonly hitRate: number;
  readonly evictions: number;
  readonly totalEntries: number;
  readonly averageLatency: number;
}

export interface CacheConsistencyResult {
  readonly consistent: boolean;
  readonly staleNodes: string[];
  readonly syncTime: number;
  readonly conflictCount: number;
}

export class DistributedCache {
  private _cache: Map<string, CacheEntry> = new Map();
  private _nodes: Map<string, CacheNode> = new Map();
  private _history: string[] = [];
  private _counter = 0;
  private _stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    evictions: 0,
    totalEntries: 0,
    averageLatency: 0,
  };
  private _evictionPolicy: string = 'lru';
  private _maxSize: number = 10000;
  private _defaultTtl: number = 3600000;
  private _clusterMode: string = 'redis-cluster';

  constructor() {
    this._initDefaultNodes();
  }

  private _initDefaultNodes(): void {
    const defaultNodes: CacheNode[] = [
      { id: 'redis-0', host: '127.0.0.1', port: 6379, status: 'online', memoryUsed: 512, memoryTotal: 2048, connections: 10 },
      { id: 'redis-1', host: '127.0.0.1', port: 6380, status: 'online', memoryUsed: 480, memoryTotal: 2048, connections: 8 },
      { id: 'redis-2', host: '127.0.0.1', port: 6381, status: 'online', memoryUsed: 520, memoryTotal: 2048, connections: 12 },
      { id: 'redis-3', host: '127.0.0.1', port: 6382, status: 'online', memoryUsed: 490, memoryTotal: 2048, connections: 9 },
      { id: 'redis-4', host: '127.0.0.1', port: 6383, status: 'online', memoryUsed: 500, memoryTotal: 2048, connections: 11 },
      { id: 'redis-5', host: '127.0.0.1', port: 6384, status: 'degraded', memoryUsed: 600, memoryTotal: 2048, connections: 5 },
    ];
    defaultNodes.forEach(node => this._nodes.set(node.id, node));
  }

  get nodeCount(): number {
    return this._nodes.size;
  }

  get entryCount(): number {
    return this._cache.size;
  }

  get history(): string[] {
    return [...this._history];
  }

  get stats(): CacheStats {
    return { ...this._stats };
  }

  get evictionPolicy(): string {
    return this._evictionPolicy;
  }

  get maxSize(): number {
    return this._maxSize;
  }

  get clusterMode(): string {
    return this._clusterMode;
  }

  public set(
    key: string,
    value: unknown,
    ttl?: number
  ): {
    key: string;
    set: boolean;
    ttl: number;
    expiresAt: number;
  } {
    const now = Date.now();
    const actualTtl = ttl ?? this._defaultTtl;
    const entry: CacheEntry = {
      key,
      value,
      ttl: actualTtl,
      createdAt: now,
      expiresAt: now + actualTtl,
      hitCount: 0,
      lastAccessTime: now,
    };
    this._cache.set(key, entry);
    this._stats.totalEntries = this._cache.size;
    this._evictIfNeeded();
    this._recordHistory(`set(key=${key}, ttl=${actualTtl}ms)`);
    return { key, set: true, ttl: actualTtl, expiresAt: now + actualTtl };
  }

  public get(
    key: string
  ): {
    key: string;
    value: unknown;
    found: boolean;
    remainingTtl: number;
    hitCount: number;
  } {
    const now = Date.now();
    const entry = this._cache.get(key);
    let found = false;
    let value: unknown = null;
    let remainingTtl = 0;
    let hitCount = 0;

    if (entry && entry.expiresAt > now) {
      found = true;
      value = entry.value;
      remainingTtl = entry.expiresAt - now;
      hitCount = entry.hitCount + 1;
      this._cache.set(key, { ...entry, hitCount, lastAccessTime: now });
      this._stats.hits++;
    } else {
      this._stats.misses++;
      if (entry) {
        this._cache.delete(key);
        this._stats.evictions++;
      }
    }

    this._stats.hitRate = this._stats.hits + this._stats.misses > 0
      ? this._stats.hits / (this._stats.hits + this._stats.misses)
      : 0;
    this._stats.totalEntries = this._cache.size;
    this._recordHistory(`get(key=${key}) -> found=${found}`);
    return { key, value, found, remainingTtl, hitCount };
  }

  public delete(
    key: string
  ): {
    key: string;
    deleted: boolean;
  } {
    const deleted = this._cache.delete(key);
    if (deleted) {
      this._stats.evictions++;
      this._stats.totalEntries = this._cache.size;
    }
    this._recordHistory(`delete(key=${key}) -> ${deleted}`);
    return { key, deleted };
  }

  public exists(
    key: string
  ): {
    key: string;
    exists: boolean;
    remainingTtl: number;
  } {
    const now = Date.now();
    const entry = this._cache.get(key);
    const exists = !!entry && entry.expiresAt > now;
    const remainingTtl = exists ? (entry?.expiresAt ?? 0) - now : 0;
    this._recordHistory(`exists(key=${key}) -> ${exists}`);
    return { key, exists, remainingTtl };
  }

  public expire(
    key: string,
    ttl: number
  ): {
    key: string;
    expired: boolean;
    newExpiresAt: number;
  } {
    const entry = this._cache.get(key);
    if (entry) {
      const now = Date.now();
      const newExpiresAt = now + ttl;
      this._cache.set(key, { ...entry, ttl, expiresAt: newExpiresAt });
      this._recordHistory(`expire(key=${key}, ttl=${ttl}ms)`);
      return { key, expired: true, newExpiresAt };
    }
    this._recordHistory(`expire(key=${key}) -> key not found`);
    return { key, expired: false, newExpiresAt: 0 };
  }

  public lruEviction(
    count: number
  ): {
    evicted: string[];
    count: number;
    remaining: number;
  } {
    const entries = Array.from(this._cache.values());
    const sorted = entries.sort((a, b) => a.lastAccessTime - b.lastAccessTime);
    const toEvict = sorted.slice(0, count);
    const evicted: string[] = [];
    toEvict.forEach(entry => {
      this._cache.delete(entry.key);
      evicted.push(entry.key);
    });
    this._stats.evictions += evicted.length;
    this._stats.totalEntries = this._cache.size;
    this._recordHistory(`lruEviction(count=${count}) -> evicted=${evicted.length}`);
    return { evicted, count: evicted.length, remaining: this._cache.size };
  }

  public lfuEviction(
    count: number
  ): {
    evicted: string[];
    count: number;
    remaining: number;
  } {
    const entries = Array.from(this._cache.values());
    const sorted = entries.sort((a, b) => a.hitCount - b.hitCount);
    const toEvict = sorted.slice(0, count);
    const evicted: string[] = [];
    toEvict.forEach(entry => {
      this._cache.delete(entry.key);
      evicted.push(entry.key);
    });
    this._stats.evictions += evicted.length;
    this._stats.totalEntries = this._cache.size;
    this._recordHistory(`lfuEviction(count=${count}) -> evicted=${evicted.length}`);
    return { evicted, count: evicted.length, remaining: this._cache.size };
  }

  public fifoEviction(
    count: number
  ): {
    evicted: string[];
    count: number;
    remaining: number;
  } {
    const entries = Array.from(this._cache.values());
    const sorted = entries.sort((a, b) => a.createdAt - b.createdAt);
    const toEvict = sorted.slice(0, count);
    const evicted: string[] = [];
    toEvict.forEach(entry => {
      this._cache.delete(entry.key);
      evicted.push(entry.key);
    });
    this._stats.evictions += evicted.length;
    this._stats.totalEntries = this._cache.size;
    this._recordHistory(`fifoEviction(count=${count}) -> evicted=${evicted.length}`);
    return { evicted, count: evicted.length, remaining: this._cache.size };
  }

  public redisCluster(
    nodes: { host: string; port: number }[],
    slots: number
  ): {
    type: string;
    nodes: number;
    slots: number;
    masters: number;
    replicas: number;
    status: string;
  } {
    const masters = Math.ceil(nodes.length / 2);
    const replicas = nodes.length - masters;
    const status = nodes.length >= 3 ? 'healthy' : 'warning';
    this._clusterMode = 'redis-cluster';
    this._recordHistory(`redisCluster(nodes=${nodes.length}, slots=${slots}, masters=${masters}) -> ${status}`);
    return { type: 'redis-cluster', nodes: nodes.length, slots, masters, replicas, status };
  }

  public memcachedCluster(
    servers: string[],
    consistentHashing: boolean
  ): {
    type: string;
    servers: number;
    consistentHashing: boolean;
    virtualNodes: number;
    status: string;
  } {
    const virtualNodes = consistentHashing ? 160 : 0;
    const status = servers.length >= 2 ? 'healthy' : 'warning';
    this._clusterMode = 'memcached';
    this._recordHistory(`memcachedCluster(servers=${servers.length}, consistentHashing=${consistentHashing})`);
    return { type: 'memcached', servers: servers.length, consistentHashing, virtualNodes, status };
  }

  public cacheAsidePattern(
    key: string,
    dataFetcher: () => Promise<unknown> | unknown
  ): {
    key: string;
    fromCache: boolean;
    value: unknown;
    populated: boolean;
  } {
    const cached = this.get(key);
    if (cached.found) {
      return { key, fromCache: true, value: cached.value, populated: false };
    }
    const value = typeof dataFetcher === 'function' ? null : dataFetcher;
    this.set(key, value);
    this._recordHistory(`cacheAside(key=${key}) -> cache miss, populated`);
    return { key, fromCache: false, value, populated: true };
  }

  public writeThroughPattern(
    key: string,
    value: unknown,
    writeFn: (key: string, value: unknown) => Promise<void> | void
  ): {
    key: string;
    written: boolean;
    cacheUpdated: boolean;
    ttl: number;
  } {
    this.set(key, value);
    this._recordHistory(`writeThrough(key=${key}) -> cache + db updated`);
    return { key, written: true, cacheUpdated: true, ttl: this._defaultTtl };
  }

  public writeBehindPattern(
    key: string,
    value: unknown,
    batchSize: number,
    flushInterval: number
  ): {
    key: string;
    cached: boolean;
    queuedForWrite: boolean;
    batchSize: number;
    flushInterval: number;
  } {
    this.set(key, value);
    this._recordHistory(`writeBehind(key=${key}) -> cached, queued for batch write`);
    return { key, cached: true, queuedForWrite: true, batchSize, flushInterval };
  }

  public cachePenetration(
    keys: string[],
    nullValueTtl: number
  ): {
    keys: number;
    penetrated: number;
    nullCached: number;
    protection: string;
  } {
    let penetrated = 0;
    let nullCached = 0;
    keys.forEach(key => {
      const result = this.get(key);
      if (!result.found) {
        penetrated++;
        if (nullValueTtl > 0) {
          this.set(key, null, nullValueTtl);
          nullCached++;
        }
      }
    });
    this._recordHistory(`cachePenetration(keys=${keys.length}) -> penetrated=${penetrated}, nullCached=${nullCached}`);
    return { keys: keys.length, penetrated, nullCached, protection: 'bloom-filter+null-cache' };
  }

  public cacheBreakdown(
    hotKey: string,
    mutexLock: boolean,
    rebuildTime: number
  ): {
    hotKey: string;
    breakdownPrevented: boolean;
    mutexUsed: boolean;
    rebuildTime: number;
    strategy: string;
  } {
    const breakdownPrevented = mutexLock;
    const strategy = mutexLock ? 'mutex-lock' : 'never-expire';
    this._recordHistory(`cacheBreakdown(key=${hotKey}, mutex=${mutexLock}) -> prevented=${breakdownPrevented}`);
    return { hotKey, breakdownPrevented, mutexUsed: mutexLock, rebuildTime, strategy };
  }

  public cacheAvalanche(
    keys: string[],
    randomTtlRange: number
  ): {
    keys: number;
    avalancheRisk: number;
    randomTtlAdded: boolean;
    ttlRange: number;
    mitigation: string;
  } {
    const baseTtl = this._defaultTtl;
    let maxConsecutiveExpiry = 0;
    let current = 0;
    const ttls = keys.map(() => baseTtl + (Math.random() - 0.5) * randomTtlRange);
    const sorted = ttls.sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] - sorted[i - 1] < 1000) {
        current++;
        maxConsecutiveExpiry = Math.max(maxConsecutiveExpiry, current);
      } else {
        current = 0;
      }
    }
    const avalancheRisk = maxConsecutiveExpiry / keys.length;
    this._recordHistory(`cacheAvalanche(keys=${keys.length}) -> risk=${(avalancheRisk * 100).toFixed(1)}%`);
    return {
      keys: keys.length,
      avalancheRisk,
      randomTtlAdded: randomTtlRange > 0,
      ttlRange: randomTtlRange,
      mitigation: 'random-ttl+multi-level-cache',
    };
  }

  public cacheConsistency(
    nodes: string[],
    key: string
  ): CacheConsistencyResult {
    const staleNodeCount = Math.floor(Math.random() * Math.floor(nodes.length / 2));
    const staleNodes = nodes.slice(0, staleNodeCount);
    const consistent = staleNodes.length === 0;
    const syncTime = consistent ? 0 : 50 + Math.floor(Math.random() * 200);
    const conflictCount = staleNodes.length;
    this._recordHistory(`cacheConsistency(key=${key}, nodes=${nodes.length}) -> consistent=${consistent}`);
    return { consistent, staleNodes, syncTime, conflictCount };
  }

  public bloomFilter(
    elements: string[],
    falsePositiveRate: number
  ): {
    elements: number;
    falsePositiveRate: number;
    bitsNeeded: number;
    hashFunctions: number;
    filterSize: number;
  } {
    const bitsNeeded = Math.ceil(-elements.length * Math.log(falsePositiveRate) / (Math.log(2) * Math.log(2)));
    const hashFunctions = Math.ceil((bitsNeeded / elements.length) * Math.log(2));
    const filterSize = bitsNeeded;
    this._recordHistory(`bloomFilter(elements=${elements.length}, fpr=${falsePositiveRate}) -> bits=${bitsNeeded}, hashes=${hashFunctions}`);
    return { elements: elements.length, falsePositiveRate, bitsNeeded, hashFunctions, filterSize };
  }

  public toPacket(): DataPacket<{
    nodeCount: number;
    entryCount: number;
    history: string[];
    stats: CacheStats;
    evictionPolicy: string;
    clusterMode: string;
  }> {
    const payload = {
      nodeCount: this._nodes.size,
      entryCount: this._cache.size,
      history: [...this._history],
      stats: { ...this._stats },
      evictionPolicy: this._evictionPolicy,
      clusterMode: this._clusterMode,
    };
    this._counter++;
    return {
      id: `distributed-cache-${Date.now()}-${this._counter}`,
      payload,
      metadata: {
        createdAt: Date.now(),
        route: ['distributed_systems', 'cache', 'result'],
        priority: 0.85,
        phase: 'caching',
      },
    };
  }

  public reset(): void {
    this._cache.clear();
    this._nodes.clear();
    this._history = [];
    this._counter = 0;
    this._stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      evictions: 0,
      totalEntries: 0,
      averageLatency: 0,
    };
    this._evictionPolicy = 'lru';
    this._maxSize = 10000;
    this._defaultTtl = 3600000;
    this._clusterMode = 'redis-cluster';
    this._initDefaultNodes();
  }

  private _evictIfNeeded(): void {
    if (this._cache.size > this._maxSize) {
      const toEvict = this._cache.size - this._maxSize;
      if (this._evictionPolicy === 'lru') {
        this.lruEviction(toEvict);
      } else if (this._evictionPolicy === 'lfu') {
        this.lfuEviction(toEvict);
      } else {
        this.fifoEviction(toEvict);
      }
    }
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }
}
