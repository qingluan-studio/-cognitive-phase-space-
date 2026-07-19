import { DataPacket } from '../shared/types';

export interface DistributedStorageInfo {
  readonly nodes: number;
  readonly data: string[];
  readonly replicas: number;
  readonly consistency: 'strong' | 'eventual' | 'weak' | 'causal';
}

export interface StorageNode {
  readonly id: string;
  readonly capacity: number;
  readonly used: number;
  readonly data: Map<string, string>;
  readonly status: 'online' | 'offline' | 'degraded';
}

export class DistributedStorage {
  private _nodes: Map<string, StorageNode> = new Map();
  private _data: Map<string, string> = new Map();
  private _history: string[] = [];
  private _counter = 0;
  private _replicas = 3;

  get nodeCount(): number {
    return this._nodes.size;
  }

  get dataCount(): number {
    return this._data.size;
  }

  get history(): string[] {
    return [...this._history];
  }

  get replicas(): number {
    return this._replicas;
  }

  public consistentHashing(keys: string[], nodes: string[], vnodes: number): { mapping: Map<string, string>; ring: string[] } {
    const mapping = new Map<string, string>();
    const ring: string[] = [];
    for (const key of keys) {
      const nodeIdx = Math.abs(this._hash(key)) % nodes.length;
      mapping.set(key, nodes[nodeIdx] ?? 'node-0');
    }
    for (let i = 0; i < nodes.length * vnodes; i++) {
      ring.push(nodes[i % nodes.length] ?? 'node-0');
    }
    this._recordHistory(`consistentHashing(keys=${keys.length}, nodes=${nodes.length}, vnodes=${vnodes})`);
    return { mapping, ring };
  }

  public dataPartition(data: string[], partitions: number): { parts: string[][]; partitionCount: number } {
    const parts: string[][] = Array.from({ length: partitions }, () => []);
    data.forEach((item, idx) => {
      parts[idx % partitions]?.push(item);
    });
    this._recordHistory(`dataPartition(data=${data.length}, partitions=${partitions})`);
    return { parts, partitionCount: partitions };
  }

  public replicatedStorage(data: string[], nodes: string[], replicas: number): { stored: number; redundancy: number; nodes: number } {
    this._replicas = replicas;
    const stored = data.length;
    const redundancy = replicas;
    data.forEach((item, idx) => {
      this._data.set(`key-${idx}`, item);
    });
    nodes.forEach(id => {
      this._nodes.set(id, {
        id,
        capacity: 1000,
        used: data.length,
        data: new Map(this._data),
        status: 'online',
      });
    });
    this._recordHistory(`replicatedStorage(data=${data.length}, nodes=${nodes.length}, replicas=${replicas})`);
    return { stored, redundancy, nodes: nodes.length };
  }

  public erasureCoding(data: string[], k: number, m: number): { chunks: string[]; fragments: number; recoverable: boolean } {
    const chunks = [...data];
    const fragments = k + m;
    const recoverable = k > 0 && m > 0;
    this._recordHistory(`erasureCoding(k=${k}, m=${m}) -> fragments=${fragments}`);
    return { chunks, fragments, recoverable };
  }

  public gossipProtocol(nodes: string[], data: string, rounds: number): { infected: number; rounds: number; converged: boolean } {
    let infected = 1;
    for (let r = 0; r < rounds; r++) {
      const newInfections = Math.floor(infected * 0.5 * Math.random());
      infected = Math.min(nodes.length, infected + newInfections);
    }
    const converged = infected >= nodes.length * 0.95;
    this._recordHistory(`gossipProtocol(nodes=${nodes.length}, rounds=${rounds}) -> infected=${infected}`);
    return { infected, rounds, converged };
  }

  public epidemicAlgorithm(nodes: string[], patientZero: string): { spread: string[]; peakDay: number; totalInfected: number } {
    const spread: string[] = [patientZero];
    const remaining = nodes.filter(n => n !== patientZero);
    for (const node of remaining) {
      if (Math.random() > 0.3) spread.push(node);
    }
    this._recordHistory(`epidemicAlgorithm(nodes=${nodes.length}) -> infected=${spread.length}`);
    return { spread, peakDay: Math.floor(spread.length / 2), totalInfected: spread.length };
  }

  public distributedHashTable(peers: string[], put: { key: string; value: string } | null, get: string | null): { value: string | null; responsible: string; peers: number } {
    const responsibleIdx = get ? Math.abs(this._hash(get)) % peers.length : 0;
    const responsible = peers[responsibleIdx] ?? 'peer-0';
    let value: string | null = null;
    if (put) {
      this._data.set(put.key, put.value);
      value = put.value;
    }
    if (get) {
      value = this._data.get(get) ?? null;
    }
    this._recordHistory(`dht(peers=${peers.length}, put=${put ? 'yes' : 'no'}, get=${get ?? 'none'})`);
    return { value, responsible, peers: peers.length };
  }

  public chordRing(nodes: string[], keys: string[]): { successors: Map<string, string>; fingerTables: number; keyCount: number } {
    const successors = new Map<string, string>();
    const sorted = [...nodes].sort();
    sorted.forEach((node, idx) => {
      successors.set(node, sorted[(idx + 1) % sorted.length] ?? sorted[0] ?? 'node-0');
    });
    this._recordHistory(`chordRing(nodes=${nodes.length}, keys=${keys.length})`);
    return { successors, fingerTables: Math.ceil(Math.log2(nodes.length || 1)), keyCount: keys.length };
  }

  public pastrly(nodes: string[], keys: string[], routing: number): { routeLength: number; hopCount: number; successRate: number } {
    const routeLength = Math.ceil(Math.log(nodes.length || 1) / Math.log(Math.max(2, routing)));
    const hopCount = routeLength;
    const successRate = 0.95 + Math.random() * 0.05;
    this._recordHistory(`pastrly(nodes=${nodes.length}, routing=${routing}) -> hops=${hopCount}`);
    return { routeLength, hopCount, successRate };
  }

  public dynamo(nodes: string[], get: string | null, put: { key: string; value: string } | null, consistency: 'strong' | 'eventual'): { result: string | null; replicas: number; consistency: string } {
    const replicas = Math.min(3, nodes.length);
    let result: string | null = null;
    if (put) {
      this._data.set(put.key, put.value);
      result = put.value;
    }
    if (get) {
      result = this._data.get(get) ?? null;
    }
    this._recordHistory(`dynamo(nodes=${nodes.length}, consistency=${consistency})`);
    return { result, replicas, consistency };
  }

  public capTradeoff(consistency: number, availability: number, partition: number): { cap: string; dominant: string; score: number } {
    const cap = consistency + availability + partition > 2.5 ? 'pick two' : 'balanced';
    const dominant = consistency >= availability && consistency >= partition ? 'CP' : availability >= partition ? 'AP' : 'PA';
    const score = consistency * availability * partition;
    this._recordHistory(`capTradeoff(C=${consistency}, A=${availability}, P=${partition}) -> ${dominant}`);
    return { cap, dominant, score };
  }

  public eventualConsistency(data: string[], nodes: string[], convergence: number): { consistent: boolean; convergenceTime: number; conflicts: number } {
    const consistent = convergence > 0.9;
    const convergenceTime = Math.floor((1 - convergence) * 1000);
    const conflicts = Math.floor(data.length * (1 - convergence) * 0.1);
    this._recordHistory(`eventualConsistency(nodes=${nodes.length}, convergence=${convergence})`);
    return { consistent, convergenceTime, conflicts };
  }

  public vectorClock(events: { node: string; counter: number }[], nodes: string[]): { clocks: Map<string, number>; concurrent: number; causallyRelated: number } {
    const clocks = new Map<string, number>();
    nodes.forEach((node, idx) => clocks.set(node, events[idx]?.counter ?? 0));
    const concurrent = Math.floor(events.length * 0.3);
    const causallyRelated = events.length - concurrent;
    this._recordHistory(`vectorClock(nodes=${nodes.length}, events=${events.length})`);
    return { clocks, concurrent, causallyRelated };
  }

  public readRepair(data: string, replicas: number): { repaired: boolean; version: number; nodesRepaired: number } {
    const repaired = Math.random() > 0.2;
    const version = this._counter;
    const nodesRepaired = Math.floor(replicas * 0.7);
    this._recordHistory(`readRepair(replicas=${replicas}) -> repaired=${repaired}`);
    return { repaired, version, nodesRepaired };
  }

  public distributedFileSystem(
    blocks: { id: string; data: string }[],
    namenodes: string[],
    datanodes: string[],
    replicationFactor: number
  ): {
    blocksStored: number;
    namenode: string;
    datanodesUsed: string[];
    totalSize: number;
  } {
    const namenode = namenodes[0] ?? 'namenode-0';
    const datanodesUsed = datanodes.slice(0, Math.min(replicationFactor, datanodes.length));
    const blocksStored = blocks.length;
    const totalSize = blocks.reduce((s, b) => s + b.data.length, 0);
    this._recordHistory(`hdfs(blocks=${blocks.length}, datanodes=${datanodes.length}, rf=${replicationFactor})`);
    return { blocksStored, namenode, datanodesUsed, totalSize };
  }

  public objectStorage(
    buckets: { name: string; objects: { key: string; value: string; metadata: Map<string, string> }[] }[],
    region: string
  ): {
    buckets: number;
    objects: number;
    region: string;
    totalSize: number;
  } {
    const objectCount = buckets.reduce((s, b) => s + b.objects.length, 0);
    const totalSize = buckets.reduce(
      (s, b) => s + b.objects.reduce((os, o) => os + o.value.length, 0),
      0
    );
    buckets.forEach(bucket => {
      bucket.objects.forEach(obj => {
        this._data.set(`${bucket.name}/${obj.key}`, obj.value);
      });
    });
    this._recordHistory(`objectStorage(buckets=${buckets.length}, objects=${objectCount}, region=${region})`);
    return { buckets: buckets.length, objects: objectCount, region, totalSize };
  }

  public blockStorage(
    volumes: { id: string; size: number; blocks: string[] }[],
    nodes: string[],
    raidLevel: number
  ): {
    volumes: number;
    totalCapacity: number;
    raidLevel: number;
    nodesUsed: number;
  } {
    const totalCapacity = volumes.reduce((s, v) => s + v.size, 0);
    const nodesUsed = Math.min(nodes.length, raidLevel + 1);
    volumes.forEach(vol => {
      vol.blocks.forEach((block, idx) => {
        this._data.set(`vol-${vol.id}-block-${idx}`, block);
      });
    });
    this._recordHistory(`blockStorage(volumes=${volumes.length}, raid=${raidLevel}, capacity=${totalCapacity})`);
    return { volumes: volumes.length, totalCapacity, raidLevel, nodesUsed };
  }

  public cephStorage(
    pools: { name: string; pgNum: number; size: number }[],
    osds: string[],
    monitors: string[]
  ): {
    pools: number;
    placementGroups: number;
    osds: number;
    monitors: number;
    status: string;
  } {
    const placementGroups = pools.reduce((s, p) => s + p.pgNum, 0);
    const status = osds.length >= 3 ? 'healthy' : 'warning';
    this._recordHistory(`ceph(pools=${pools.length}, pgs=${placementGroups}, osds=${osds.length}) -> ${status}`);
    return {
      pools: pools.length,
      placementGroups,
      osds: osds.length,
      monitors: monitors.length,
      status,
    };
  }

  public hadoopHdfs(
    files: { path: string; blocks: string[]; size: number }[],
    namenode: string,
    datanodes: string[],
    replication: number
  ): {
    files: number;
    blocks: number;
    replication: number;
    namenode: string;
    usedCapacity: number;
  } {
    const totalBlocks = files.reduce((s, f) => s + f.blocks.length, 0);
    const usedCapacity = files.reduce((s, f) => s + f.size, 0);
    files.forEach(file => {
      file.blocks.forEach((block, idx) => {
        this._data.set(`${file.path}-block-${idx}`, block);
      });
    });
    this._recordHistory(`hdfs(files=${files.length}, blocks=${totalBlocks}, replication=${replication})`);
    return { files: files.length, blocks: totalBlocks, replication, namenode, usedCapacity };
  }

  public cassandraStorage(
    keyspace: string,
    tables: { name: string; rows: { key: string; value: Map<string, string> }[] }[],
    nodes: string[],
    consistencyLevel: string
  ): {
    keyspace: string;
    tables: number;
    rows: number;
    nodes: number;
    consistencyLevel: string;
  } {
    const totalRows = tables.reduce((s, t) => s + t.rows.length, 0);
    tables.forEach(table => {
      table.rows.forEach(row => {
        this._data.set(`${keyspace}.${table.name}.${row.key}`, JSON.stringify(Object.fromEntries(row.value)));
      });
    });
    this._recordHistory(`cassandra(keyspace=${keyspace}, tables=${tables.length}, rows=${totalRows}, cl=${consistencyLevel})`);
    return { keyspace, tables: tables.length, rows: totalRows, nodes: nodes.length, consistencyLevel };
  }

  public mongodbSharding(
    collections: { name: string; shardKey: string; documents: { _id: string; data: unknown }[] }[],
    shards: string[],
    configServers: string[]
  ): {
    collections: number;
    shards: number;
    documents: number;
    configServers: number;
    balanced: boolean;
  } {
    const totalDocs = collections.reduce((s, c) => s + c.documents.length, 0);
    const balanced = Math.random() > 0.2;
    collections.forEach(col => {
      col.documents.forEach(doc => {
        this._data.set(`${col.name}.${doc._id}`, JSON.stringify(doc.data));
      });
    });
    this._recordHistory(`mongodbSharding(collections=${collections.length}, shards=${shards.length}, docs=${totalDocs})`);
    return {
      collections: collections.length,
      shards: shards.length,
      documents: totalDocs,
      configServers: configServers.length,
      balanced,
    };
  }

  public elasticsearchIndex(
    indices: { name: string; shards: number; replicas: number; documents: unknown[] }[],
    nodes: string[]
  ): {
    indices: number;
    shards: number;
    replicas: number;
    documents: number;
    nodes: number;
    health: string;
  } {
    const totalShards = indices.reduce((s, i) => s + i.shards, 0);
    const totalDocs = indices.reduce((s, i) => s + i.documents.length, 0);
    const health = nodes.length >= 3 ? 'green' : nodes.length >= 2 ? 'yellow' : 'red';
    this._recordHistory(`elasticsearch(indices=${indices.length}, shards=${totalShards}, docs=${totalDocs}) -> health=${health}`);
    return {
      indices: indices.length,
      shards: totalShards,
      replicas: indices[0]?.replicas ?? 1,
      documents: totalDocs,
      nodes: nodes.length,
      health,
    };
  }

  public toPacket(): DataPacket<{
    nodes: number;
    data: number;
    history: string[];
    replicas: number;
  }> {
    return {
      id: `dist-storage-${Date.now()}-${this._counter}`,
      payload: {
        nodes: this._nodes.size,
        data: this._data.size,
        history: [...this._history],
        replicas: this._replicas,
      },
      metadata: {
        createdAt: Date.now(),
        route: ['distributed_systems', 'storage', 'result'],
        priority: 0.8,
        phase: 'persistence',
      },
    };
  }

  public reset(): void {
    this._nodes.clear();
    this._data.clear();
    this._history = [];
    this._counter = 0;
    this._replicas = 3;
  }

  private _hash(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) - h) + s.charCodeAt(i);
      h |= 0;
    }
    return h;
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }
}
