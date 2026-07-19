import { DataPacket, PacketMeta } from '../shared/types';

export interface ReplicaSet {
  primary: string;
  secondaries: string[];
  status: string;
  members: string[];
}

export interface ReplicationLag {
  replica: string;
  lagSeconds: number;
  lastApplied: number;
}

export class DatabaseReplication {
  private _replicaSets: Map<string, ReplicaSet> = new Map();
  private _lags: ReplicationLag[] = [];
  private _counter = 0;

  masterSlave(master: string, slaves: string[], mode: string = 'asynchronous'): ReplicaSet {
    const rs: ReplicaSet = {
      primary: master,
      secondaries: slaves,
      status: mode,
      members: [master, ...slaves],
    };
    this._replicaSets.set(`rs-${++this._counter}`, rs);
    return rs;
  }

  primaryReplica(primary: string, replicas: string[]): ReplicaSet {
    return this.masterSlave(primary, replicas, 'semi-synchronous');
  }

  multiMaster(nodes: string[], conflictResolution: string): { nodes: string[]; resolution: string; status: string } {
    return { nodes, resolution: conflictResolution, status: 'active' };
  }

  peerToPeer(nodes: string[], protocol: string): { nodes: string[]; protocol: string; status: string } {
    return { nodes, protocol, status: 'gossiping' };
  }

  synchronousReplication(master: string, slave: string): { master: string; slave: string; ack: boolean; latency: number } {
    return { master, slave, ack: true, latency: 10 };
  }

  asynchronousReplication(master: string, slave: string): ReplicationLag {
    const lag: ReplicationLag = {
      replica: slave,
      lagSeconds: Math.random() * 5,
      lastApplied: Date.now() - Math.floor(Math.random() * 5000),
    };
    this._lags.push(lag);
    return lag;
  }

  semiSynchronous(master: string, slaves: string[], count: number): { master: string; slaves: string[]; requiredAcks: number; status: string } {
    return { master, slaves, requiredAcks: count, status: 'semi-sync' };
  }

  logShipping(primary: string, secondary: string): { primary: string; secondary: string; logsShipped: number; latency: number } {
    return { primary, secondary, logsShipped: 100, latency: 30 };
  }

  failover(primary: string, replica: string, method: string): { oldPrimary: string; newPrimary: string; method: string; status: string } {
    return { oldPrimary: primary, newPrimary: replica, method, status: 'failed_over' };
  }

  readReplicas(primary: string, count: number, mode: string): ReplicaSet {
    const replicas = Array.from({ length: count }, (_, i) => `replica-${i}`);
    return this.masterSlave(primary, replicas, mode);
  }

  shardCollection(dataset: string, shardKey: string, shards: number): { dataset: string; shardKey: string; shards: number; strategy: string } {
    return { dataset, shardKey, shards, strategy: 'hash' };
  }

  chunkMigration(fromShard: string, toShard: string, chunks: number): { from: string; to: string; chunks: number; status: string } {
    return { from: fromShard, to: toShard, chunks, status: 'migrating' };
  }

  consistencyLevel(level: string, nodes: number): { level: string; nodes: number; quorum: number } {
    const quorum = Math.floor(nodes / 2) + 1;
    return { level, nodes, quorum };
  }

  toPacket(): DataPacket<{
    replicaSets: Map<string, ReplicaSet>;
    lags: ReplicationLag[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['database', 'DatabaseReplication'],
      priority: 1,
      phase: 'database_replication',
    };
    return {
      id: `db-replication-${Date.now().toString(36)}`,
      payload: {
        replicaSets: this._replicaSets,
        lags: this._lags,
      },
      metadata,
    };
  }

  reset(): void {
    this._replicaSets = new Map();
    this._lags = [];
    this._counter = 0;
  }

  get replicaSetCount(): number { return this._replicaSets.size; }
  get lagCount(): number { return this._lags.length; }
}
