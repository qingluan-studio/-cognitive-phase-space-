import { DataPacket } from '../shared/types';

export type ShardingStrategy = 'HASH' | 'RANGE' | 'LIST' | 'CONSISTENT_HASH' | 'DIRECTORY';
export type ShardingDimension = 'HORIZONTAL' | 'VERTICAL';
export type ShardStatus = 'ACTIVE' | 'INACTIVE' | 'MIGRATING' | 'OVERLOADED' | 'RECOVERING';

export interface Shard {
  id: string;
  index: number;
  name: string;
  status: ShardStatus;
  nodeId: string;
  dataSize: number;
  recordCount: number;
  readCount: number;
  writeCount: number;
  startTime: number;
  lastAccessTime: number;
  rangeStart?: unknown;
  rangeEnd?: unknown;
  weight: number;
}

export interface ShardNode {
  id: string;
  name: string;
  host: string;
  port: number;
  region: string;
  capacity: number;
  usedCapacity: number;
  shards: string[];
  status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE';
  connections: number;
  latencyMs: number;
}

export interface ShardingConfig {
  strategy: ShardingStrategy;
  dimension: ShardingDimension;
  shardKey: string;
  totalShards: number;
  virtualNodes: number;
  replicationFactor: number;
  autoRebalance: boolean;
  rebalanceThreshold: number;
  consistentHashRing: Map<number, string>;
}

export interface ShardRouteResult {
  shardId: string;
  nodeId: string;
  shardIndex: number;
  isPrimary: boolean;
  replicas: string[];
}

export interface ShardMigration {
  id: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  sourceShard: string;
  targetShard: string;
  totalRecords: number;
  migratedRecords: number;
  startTime?: number;
  endTime?: number;
  error?: string;
}

export interface ShardRebalancePlan {
  id: string;
  createdAt: number;
  migrations: ShardMigration[];
  estimatedTime: number;
  totalRecordsToMove: number;
  expectedImbalanceAfter: number;
}

export interface ShardStatistics {
  totalShards: number;
  activeShards: number;
  totalNodes: number;
  totalRecords: number;
  totalDataSize: number;
  averageShardSize: number;
  maxShardSize: number;
  minShardSize: number;
  imbalanceRatio: number;
  totalReadOperations: number;
  totalWriteOperations: number;
  avgLatencyMs: number;
}

export interface DatabaseShardingState {
  config: ShardingConfig;
  shards: Map<string, Shard>;
  nodes: Map<string, ShardNode>;
  statistics: ShardStatistics;
  activeMigrations: ShardMigration[];
  lastRoute?: { key: string; shardId: string };
  lastRebalance?: ShardRebalancePlan;
}

export class DatabaseSharding {
  private _config: ShardingConfig;
  private _shards: Map<string, Shard> = new Map();
  private _nodes: Map<string, ShardNode> = new Map();
  private _migrations: Map<string, ShardMigration> = new Map();
  private _hashRing: Map<number, string> = new Map();
  private _totalReadOps: number = 0;
  private _totalWriteOps: number = 0;
  private _counter: number = 0;
  private _lastRoute: { key: string; shardId: string } | null = null;
  private _lastRebalance: ShardRebalancePlan | null = null;
  private _shardDataStores: Map<string, Map<string, unknown>> = new Map();

  constructor(strategy: ShardingStrategy = 'HASH', totalShards: number = 8) {
    this._config = {
      strategy,
      dimension: 'HORIZONTAL',
      shardKey: 'id',
      totalShards,
      virtualNodes: 150,
      replicationFactor: 1,
      autoRebalance: true,
      rebalanceThreshold: 0.2,
      consistentHashRing: new Map()
    };
    this._initializeDefaultNodes();
    this._initializeShards();
    if (strategy === 'CONSISTENT_HASH') {
      this._buildConsistentHashRing();
    }
  }

  private _initializeDefaultNodes(): void {
    const nodeConfigs = [
      { id: 'node-0', name: 'primary-node-0', host: 'db-node-0.internal', port: 5432, region: 'us-east-1', capacity: 10737418240 },
      { id: 'node-1', name: 'primary-node-1', host: 'db-node-1.internal', port: 5432, region: 'us-east-1', capacity: 10737418240 },
      { id: 'node-2', name: 'primary-node-2', host: 'db-node-2.internal', port: 5432, region: 'us-west-2', capacity: 10737418240 },
      { id: 'node-3', name: 'replica-node-0', host: 'db-replica-0.internal', port: 5432, region: 'us-east-1', capacity: 5368709120 }
    ];

    for (const nc of nodeConfigs) {
      const node: ShardNode = {
        ...nc,
        usedCapacity: 0,
        shards: [],
        status: 'ONLINE',
        connections: 0,
        latencyMs: Math.random() * 5
      };
      this._nodes.set(node.id, node);
    }
  }

  private _initializeShards(): void {
    const nodeIds = Array.from(this._nodes.keys());
    for (let i = 0; i < this._config.totalShards; i++) {
      const shardId = `shard-${i}`;
      const nodeIndex = i % nodeIds.length;
      const nodeId = nodeIds[nodeIndex];
      const recordCount = Math.floor(10000 + Math.random() * 50000);
      const dataSize = recordCount * 256;

      const shard: Shard = {
        id: shardId,
        index: i,
        name: `Shard ${i}`,
        status: 'ACTIVE',
        nodeId,
        dataSize,
        recordCount,
        readCount: Math.floor(Math.random() * 100000),
        writeCount: Math.floor(Math.random() * 10000),
        startTime: Date.now() - Math.random() * 86400000,
        lastAccessTime: Date.now() - Math.random() * 3600000,
        weight: 1
      };

      if (this._config.strategy === 'RANGE') {
        const rangeSize = 1000000 / this._config.totalShards;
        shard.rangeStart = Math.floor(i * rangeSize);
        shard.rangeEnd = Math.floor((i + 1) * rangeSize);
      }

      this._shards.set(shardId, shard);
      this._shardDataStores.set(shardId, new Map());

      const node = this._nodes.get(nodeId);
      if (node) {
        node.shards.push(shardId);
        node.usedCapacity += dataSize;
      }
    }
  }

  private _buildConsistentHashRing(): void {
    this._hashRing.clear();
    for (const [shardId, shard] of this._shards) {
      for (let v = 0; v < this._config.virtualNodes; v++) {
        const hash = this._hash(`${shardId}-vn-${v}`);
        this._hashRing.set(hash, shardId);
      }
    }
  }

  private _hash(key: string): number {
    let h = 0;
    for (let i = 0; i < key.length; i++) {
      h = ((h << 5) - h) + key.charCodeAt(i);
      h = h & h;
    }
    return Math.abs(h);
  }

  get config(): ShardingConfig {
    return { ...this._config, consistentHashRing: new Map(this._config.consistentHashRing) };
  }

  get totalShards(): number {
    return this._shards.size;
  }

  get activeShards(): number {
    let count = 0;
    for (const shard of this._shards.values()) {
      if (shard.status === 'ACTIVE') count++;
    }
    return count;
  }

  get totalNodes(): number {
    return this._nodes.size;
  }

  get totalRecords(): number {
    let total = 0;
    for (const shard of this._shards.values()) {
      total += shard.recordCount;
    }
    return total;
  }

  get totalDataSize(): number {
    let total = 0;
    for (const shard of this._shards.values()) {
      total += shard.dataSize;
    }
    return total;
  }

  get activeMigrations(): ShardMigration[] {
    const active: ShardMigration[] = [];
    for (const migration of this._migrations.values()) {
      if (migration.status === 'IN_PROGRESS' || migration.status === 'PENDING') {
        active.push(migration);
      }
    }
    return active;
  }

  get lastRoute(): { key: string; shardId: string } | null {
    return this._lastRoute;
  }

  get lastRebalance(): ShardRebalancePlan | null {
    return this._lastRebalance;
  }

  get statistics(): ShardStatistics {
    let totalRecords = 0;
    let totalDataSize = 0;
    let maxSize = 0;
    let minSize = Infinity;
    let totalReads = 0;
    let totalWrites = 0;
    let activeCount = 0;
    let totalLatency = 0;
    let nodeCount = 0;

    for (const shard of this._shards.values()) {
      totalRecords += shard.recordCount;
      totalDataSize += shard.dataSize;
      totalReads += shard.readCount;
      totalWrites += shard.writeCount;
      if (shard.dataSize > maxSize) maxSize = shard.dataSize;
      if (shard.dataSize < minSize) minSize = shard.dataSize;
      if (shard.status === 'ACTIVE') activeCount++;
    }

    for (const node of this._nodes.values()) {
      totalLatency += node.latencyMs;
      nodeCount++;
    }

    const avgSize = this._shards.size > 0 ? totalDataSize / this._shards.size : 0;
    const imbalanceRatio = avgSize > 0 ? (maxSize - minSize) / avgSize : 0;

    return {
      totalShards: this._shards.size,
      activeShards: activeCount,
      totalNodes: this._nodes.size,
      totalRecords,
      totalDataSize,
      averageShardSize: avgSize,
      maxShardSize: maxSize,
      minShardSize: minSize === Infinity ? 0 : minSize,
      imbalanceRatio,
      totalReadOperations: totalReads,
      totalWriteOperations: totalWrites,
      avgLatencyMs: nodeCount > 0 ? totalLatency / nodeCount : 0
    };
  }

  route(key: string): ShardRouteResult {
    let shardId: string;

    switch (this._config.strategy) {
      case 'HASH':
        shardId = this._hashRoute(key);
        break;
      case 'RANGE':
        shardId = this._rangeRoute(key);
        break;
      case 'CONSISTENT_HASH':
        shardId = this._consistentHashRoute(key);
        break;
      case 'LIST':
        shardId = this._listRoute(key);
        break;
      default:
        shardId = this._hashRoute(key);
    }

    const shard = this._shards.get(shardId);
    const replicas: string[] = [];

    this._lastRoute = { key, shardId };
    this._totalReadOps++;
    if (shard) {
      shard.readCount++;
      shard.lastAccessTime = Date.now();
    }

    return {
      shardId,
      nodeId: shard?.nodeId || '',
      shardIndex: shard?.index || 0,
      isPrimary: true,
      replicas
    };
  }

  private _hashRoute(key: string): string {
    const hash = this._hash(key);
    const shardIndex = hash % this._config.totalShards;
    return `shard-${shardIndex}`;
  }

  private _rangeRoute(key: string): string {
    const keyNum = parseInt(key.replace(/\D/g, ''), 10) || 0;
    for (const shard of this._shards.values()) {
      if (shard.rangeStart !== undefined && shard.rangeEnd !== undefined) {
        const start = Number(shard.rangeStart);
        const end = Number(shard.rangeEnd);
        if (keyNum >= start && keyNum < end) {
          return shard.id;
        }
      }
    }
    return `shard-0`;
  }

  private _consistentHashRoute(key: string): string {
    const hash = this._hash(key);
    const sortedHashes = Array.from(this._hashRing.keys()).sort((a, b) => a - b);
    for (const h of sortedHashes) {
      if (h >= hash) {
        return this._hashRing.get(h) || 'shard-0';
      }
    }
    return sortedHashes.length > 0 ? this._hashRing.get(sortedHashes[0]) || 'shard-0' : 'shard-0';
  }

  private _listRoute(key: string): string {
    const hash = this._hash(key);
    const shardIndex = hash % this._config.totalShards;
    return `shard-${shardIndex}`;
  }

  put(key: string, value: unknown): ShardRouteResult {
    const route = this.route(key);
    const store = this._shardDataStores.get(route.shardId);
    const shard = this._shards.get(route.shardId);
    if (store) {
      const existed = store.has(key);
      store.set(key, value);
      if (!existed && shard) {
        shard.recordCount++;
        shard.dataSize += this._estimateSize(value);
      } else if (shard) {
        shard.dataSize += this._estimateSize(value) / 2;
      }
      shard!.writeCount++;
      shard!.lastAccessTime = Date.now();
    }
    this._totalWriteOps++;
    return route;
  }

  get(key: string): { value: unknown; route: ShardRouteResult } | null {
    const route = this.route(key);
    const store = this._shardDataStores.get(route.shardId);
    if (store && store.has(key)) {
      return { value: store.get(key), route };
    }
    return null;
  }

  delete(key: string): boolean {
    const route = this.route(key);
    const store = this._shardDataStores.get(route.shardId);
    const shard = this._shards.get(route.shardId);
    if (store && store.has(key)) {
      const value = store.get(key);
      store.delete(key);
      if (shard) {
        shard.recordCount--;
        shard.dataSize -= this._estimateSize(value);
        shard.writeCount++;
      }
      this._totalWriteOps++;
      return true;
    }
    return false;
  }

  private _estimateSize(value: unknown): number {
    if (value === null || value === undefined) return 0;
    try {
      return JSON.stringify(value).length;
    } catch {
      return 256;
    }
  }

  addShard(nodeId?: string): Shard | null {
    const node = nodeId ? this._nodes.get(nodeId) : this._findLeastLoadedNode();
    if (!node) return null;

    const newIndex = this._config.totalShards;
    const shardId = `shard-${newIndex}`;
    const shard: Shard = {
      id: shardId,
      index: newIndex,
      name: `Shard ${newIndex}`,
      status: 'ACTIVE',
      nodeId: node.id,
      dataSize: 0,
      recordCount: 0,
      readCount: 0,
      writeCount: 0,
      startTime: Date.now(),
      lastAccessTime: Date.now(),
      weight: 1
    };

    this._shards.set(shardId, shard);
    this._shardDataStores.set(shardId, new Map());
    this._config.totalShards++;
    node.shards.push(shardId);

    if (this._config.strategy === 'CONSISTENT_HASH') {
      this._addVirtualNodes(shardId);
    }

    return shard;
  }

  removeShard(shardId: string): boolean {
    const shard = this._shards.get(shardId);
    if (!shard) return false;

    const node = this._nodes.get(shard.nodeId);
    if (node) {
      const idx = node.shards.indexOf(shardId);
      if (idx > -1) node.shards.splice(idx, 1);
      node.usedCapacity -= shard.dataSize;
    }

    this._shards.delete(shardId);
    this._shardDataStores.delete(shardId);

    if (this._config.strategy === 'CONSISTENT_HASH') {
      this._removeVirtualNodes(shardId);
    }

    return true;
  }

  private _addVirtualNodes(shardId: string): void {
    for (let v = 0; v < this._config.virtualNodes; v++) {
      const hash = this._hash(`${shardId}-vn-${v}`);
      this._hashRing.set(hash, shardId);
    }
  }

  private _removeVirtualNodes(shardId: string): void {
    const toDelete: number[] = [];
    for (const [hash, sid] of this._hashRing) {
      if (sid === shardId) toDelete.push(hash);
    }
    for (const h of toDelete) this._hashRing.delete(h);
  }

  addNode(node: Omit<ShardNode, 'shards' | 'status' | 'connections' | 'latencyMs' | 'usedCapacity'>): ShardNode {
    const newNode: ShardNode = {
      ...node,
      usedCapacity: 0,
      shards: [],
      status: 'ONLINE',
      connections: 0,
      latencyMs: Math.random() * 5
    };
    this._nodes.set(node.id, newNode);
    return newNode;
  }

  removeNode(nodeId: string): boolean {
    const node = this._nodes.get(nodeId);
    if (!node) return false;

    for (const shardId of node.shards) {
      const shard = this._shards.get(shardId);
      if (shard) {
        const newNode = this._findLeastLoadedNode(nodeId);
        if (newNode) {
          shard.nodeId = newNode.id;
          newNode.shards.push(shardId);
          newNode.usedCapacity += shard.dataSize;
        }
      }
    }

    this._nodes.delete(nodeId);
    return true;
  }

  private _findLeastLoadedNode(excludeId?: string): ShardNode | null {
    let least: ShardNode | null = null;
    let minLoad = Infinity;
    for (const node of this._nodes.values()) {
      if (node.id === excludeId) continue;
      if (node.status !== 'ONLINE') continue;
      const load = node.usedCapacity / node.capacity;
      if (load < minLoad) {
        minLoad = load;
        least = node;
      }
    }
    return least;
  }

  startMigration(sourceShardId: string, targetShardId: string, keys: string[] = []): ShardMigration | null {
    const sourceShard = this._shards.get(sourceShardId);
    const targetShard = this._shards.get(targetShardId);
    if (!sourceShard || !targetShard) return null;

    const sourceStore = this._shardDataStores.get(sourceShardId);
    const targetStore = this._shardDataStores.get(targetShardId);
    if (!sourceStore || !targetStore) return null;

    let recordsToMove = keys.length > 0 ? keys.length : Math.floor(sourceShard.recordCount * 0.3);

    const migrationId = `migration-${Date.now()}-${++this._counter}`;
    const migration: ShardMigration = {
      id: migrationId,
      status: 'IN_PROGRESS',
      sourceShard: sourceShardId,
      targetShard: targetShardId,
      totalRecords: recordsToMove,
      migratedRecords: 0,
      startTime: Date.now()
    };

    this._migrations.set(migrationId, migration);
    this._executeMigration(migration, keys);

    return migration;
  }

  private _executeMigration(migration: ShardMigration, keys: string[]): void {
    const sourceStore = this._shardDataStores.get(migration.sourceShard);
    const targetStore = this._shardDataStores.get(migration.targetShard);
    const sourceShard = this._shards.get(migration.sourceShard);
    const targetShard = this._shards.get(migration.targetShard);
    if (!sourceStore || !targetStore || !sourceShard || !targetShard) return;

    let keysToMove: string[];
    if (keys.length > 0) {
      keysToMove = keys.filter(k => sourceStore.has(k));
    } else {
      const allKeys = Array.from(sourceStore.keys());
      keysToMove = allKeys.slice(0, migration.totalRecords);
    }

    migration.totalRecords = keysToMove.length;

    for (const key of keysToMove) {
      const value = sourceStore.get(key);
      if (value !== undefined) {
        targetStore.set(key, value);
        sourceStore.delete(key);
        const size = this._estimateSize(value);
        sourceShard.recordCount--;
        sourceShard.dataSize -= size;
        targetShard.recordCount++;
        targetShard.dataSize += size;
        migration.migratedRecords++;
      }
    }

    migration.status = 'COMPLETED';
    migration.endTime = Date.now();

    const sourceNode = this._nodes.get(sourceShard.nodeId);
    const targetNode = this._nodes.get(targetShard.nodeId);
    if (sourceNode) sourceNode.usedCapacity -= migration.migratedRecords * 256;
    if (targetNode) targetNode.usedCapacity += migration.migratedRecords * 256;
  }

  rebalance(): ShardRebalancePlan | null {
    const stats = this.statistics;
    if (stats.imbalanceRatio < this._config.rebalanceThreshold) {
      return null;
    }

    const migrations: ShardMigration[] = [];
    let totalRecords = 0;
    const sortedShards = Array.from(this._shards.values()).sort((a, b) => b.recordCount - a.recordCount);
    const mid = Math.floor(sortedShards.length / 2);

    for (let i = 0; i < mid; i++) {
      const source = sortedShards[i];
      const target = sortedShards[sortedShards.length - 1 - i];
      const toMove = Math.floor((source.recordCount - target.recordCount) / 2);
      if (toMove > 0) {
        const migration: ShardMigration = {
          id: `migration-rebalance-${i}`,
          status: 'PENDING',
          sourceShard: source.id,
          targetShard: target.id,
          totalRecords: toMove,
          migratedRecords: 0
        };
        migrations.push(migration);
        totalRecords += toMove;
      }
    }

    const plan: ShardRebalancePlan = {
      id: `rebalance-${Date.now()}`,
      createdAt: Date.now(),
      migrations,
      estimatedTime: totalRecords * 0.01,
      totalRecordsToMove: totalRecords,
      expectedImbalanceAfter: stats.imbalanceRatio * 0.3
    };

    this._lastRebalance = plan;
    return plan;
  }

  getShard(shardId: string): Shard | undefined {
    return this._shards.get(shardId);
  }

  getNode(nodeId: string): ShardNode | undefined {
    return this._nodes.get(nodeId);
  }

  listShards(): string[] {
    return Array.from(this._shards.keys());
  }

  listNodes(): string[] {
    return Array.from(this._nodes.keys());
  }

  getShardDataSize(shardId: string): number {
    const shard = this._shards.get(shardId);
    return shard?.dataSize || 0;
  }

  getShardRecordCount(shardId: string): number {
    const shard = this._shards.get(shardId);
    return shard?.recordCount || 0;
  }

  setStrategy(strategy: ShardingStrategy): void {
    this._config.strategy = strategy;
    if (strategy === 'CONSISTENT_HASH') {
      this._buildConsistentHashRing();
    }
  }

  setShardKey(key: string): void {
    this._config.shardKey = key;
  }

  setAutoRebalance(enabled: boolean, threshold?: number): void {
    this._config.autoRebalance = enabled;
    if (threshold !== undefined) {
      this._config.rebalanceThreshold = threshold;
    }
  }

  getShardDistribution(): Array<{ shardId: string; recordCount: number; percentage: number }> {
    const total = this.totalRecords || 1;
    return Array.from(this._shards.values())
      .map(s => ({
        shardId: s.id,
        recordCount: s.recordCount,
        percentage: (s.recordCount / total) * 100
      }))
      .sort((a, b) => a.shardId.localeCompare(b.shardId));
  }

  getNodeDistribution(): Array<{ nodeId: string; shardCount: number; usedCapacity: number; capacity: number }> {
    return Array.from(this._nodes.values()).map(n => ({
      nodeId: n.id,
      shardCount: n.shards.length,
      usedCapacity: n.usedCapacity,
      capacity: n.capacity
    }));
  }

  toPacket(): DataPacket<DatabaseShardingState> {
    const state: DatabaseShardingState = {
      config: this._config,
      shards: this._shards,
      nodes: this._nodes,
      statistics: this.statistics,
      activeMigrations: this.activeMigrations,
      lastRoute: this._lastRoute || undefined,
      lastRebalance: this._lastRebalance || undefined
    };
    this._counter++;
    return {
      id: `db-sharding-${Date.now()}-${this._counter}`,
      payload: state,
      metadata: {
        createdAt: Date.now(),
        route: ['database', 'sharding'],
        priority: 1,
        phase: 'data-distribution'
      }
    };
  }

  reset(): void {
    this._shards.clear();
    this._nodes.clear();
    this._migrations.clear();
    this._hashRing.clear();
    this._shardDataStores.clear();
    this._totalReadOps = 0;
    this._totalWriteOps = 0;
    this._counter = 0;
    this._lastRoute = null;
    this._lastRebalance = null;
    this._config = {
      strategy: this._config.strategy,
      dimension: 'HORIZONTAL',
      shardKey: 'id',
      totalShards: 8,
      virtualNodes: 150,
      replicationFactor: 1,
      autoRebalance: true,
      rebalanceThreshold: 0.2,
      consistentHashRing: new Map()
    };
    this._initializeDefaultNodes();
    this._initializeShards();
    if (this._config.strategy === 'CONSISTENT_HASH') {
      this._buildConsistentHashRing();
    }
  }
}
