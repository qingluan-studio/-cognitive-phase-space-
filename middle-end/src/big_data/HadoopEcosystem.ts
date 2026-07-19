import { DataPacket, PacketMeta } from '../shared/types';

export interface HadoopCluster {
  nodes: string[];
  capacity: number;
  usage: number;
  nodeStatus: Record<string, string>;
}

export interface MapReduceJob {
  id: string;
  input: string;
  output: string;
  status: string;
  mapperCount: number;
  reducerCount: number;
}

export class HadoopEcosystem {
  private _clusters: Map<string, HadoopCluster> = new Map();
  private _jobs: Map<string, MapReduceJob> = new Map();
  private _counter = 0;

  hdfsRead(path: string): Record<string, unknown>[] {
    return [{ path, blocks: 3, replication: 3, size: 1024 }];
  }

  hdfsWrite(path: string, data: Record<string, unknown>[]): boolean {
    return true;
  }

  mapReduceJob(input: string, mapper: (kv: [string, unknown]) => [string, unknown][], reducer: (key: string, values: unknown[]) => [string, unknown][]): MapReduceJob {
    const jobId = `job-${++this._counter}`;
    const inputData = [{ key: 'input', value: input }];
    const mapped = this.mapPhase(inputData, mapper);
    const shuffled = this._shuffle(mapped);
    const reduced = this.reducePhase(shuffled, reducer);
    const job: MapReduceJob = {
      id: jobId,
      input,
      output: `${input}_output`,
      status: 'completed',
      mapperCount: inputData.length,
      reducerCount: reduced.length,
    };
    this._jobs.set(jobId, job);
    return job;
  }

  mapPhase(data: [string, unknown][], mapper: (kv: [string, unknown]) => [string, unknown][]): [string, unknown][] {
    const result: [string, unknown][] = [];
    for (const kv of data) {
      const mapped = mapper(kv);
      result.push(...mapped);
    }
    return result;
  }

  reducePhase(shuffled: Map<string, unknown[]>, reducer: (key: string, values: unknown[]) => [string, unknown][]): [string, unknown][] {
    const result: [string, unknown][] = [];
    for (const [key, values] of shuffled.entries()) {
      const reduced = reducer(key, values);
      result.push(...reduced);
    }
    return result;
  }

  hdfsReplication(factor: number): Record<string, number> {
    return { factor, blocks: 100, totalReplicas: 100 * factor };
  }

  blockManagement(files: string[], blockSize: number): Record<string, unknown> {
    return { files, blockSize, totalBlocks: files.length * 3, usedSpace: files.length * blockSize * 3 };
  }

  namenodeMetadata(files: string[]): Record<string, unknown> {
    const metadata: Record<string, unknown> = {};
    for (const f of files) {
      metadata[f] = { blocks: 3, size: 1024, replication: 3, modificationTime: Date.now() };
    }
    return metadata;
  }

  datanodeStatus(nodes: string[]): Record<string, { status: string; capacity: number; used: number }> {
    const status: Record<string, { status: string; capacity: number; used: number }> = {};
    for (const node of nodes) {
      status[node] = { status: 'alive', capacity: 10000, used: Math.random() * 5000 };
    }
    return status;
  }

  yarnSchedule(jobs: string[], resources: { vcores: number; memory: number }): Record<string, unknown> {
    return {
      scheduled: jobs,
      resources,
      clusterUtilization: jobs.length * 0.2,
      queue: 'default',
    };
  }

  pigLatin(script: string, data: Record<string, unknown>[]): Record<string, unknown>[] {
    return data.map(row => ({ ...row, processed: true, script: script.substring(0, 20) }));
  }

  hiveQuery(query: string, tables: Record<string, Record<string, unknown>[]>): Record<string, unknown>[] {
    const firstTable = Object.values(tables)[0] || [];
    return firstTable.slice(0, 10).map(row => ({ ...row, queryResult: true }));
  }

  hbaseRead(table: string, rowKey: string): Record<string, unknown> {
    return { table, rowKey, columns: { cf: { col1: 'val1', col2: 'val2' } }, timestamp: Date.now() };
  }

  sqoopImport(rdbms: string, hdfs: string): Record<string, unknown> {
    return { source: rdbms, target: hdfs, status: 'importing', records: 10000, mappers: 4 };
  }

  flumeIngest(source: string, sink: string): Record<string, unknown> {
    return { source, sink, channel: 'memory', events: 1000, status: 'running' };
  }

  private _shuffle(mapped: [string, unknown][]): Map<string, unknown[]> {
    const shuffled = new Map<string, unknown[]>();
    for (const [key, value] of mapped) {
      if (!shuffled.has(key)) shuffled.set(key, []);
      shuffled.get(key)!.push(value);
    }
    return shuffled;
  }

  toPacket(): DataPacket<{
    clusters: Map<string, HadoopCluster>;
    jobs: Map<string, MapReduceJob>;
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['big_data', 'HadoopEcosystem'],
      priority: 1,
      phase: 'hadoop_ecosystem',
    };
    return {
      id: `hadoop-${Date.now().toString(36)}`,
      payload: {
        clusters: this._clusters,
        jobs: this._jobs,
      },
      metadata,
    };
  }

  reset(): void {
    this._clusters = new Map();
    this._jobs = new Map();
    this._counter = 0;
  }

  get clusterCount(): number { return this._clusters.size; }
  get jobCount(): number { return this._jobs.size; }
}
