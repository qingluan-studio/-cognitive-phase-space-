import { DataPacket, PacketMeta } from '../shared/types';

export interface SparkJob {
  name: string;
  stages: number;
  duration: number;
  status: string;
  tasks: number;
}

export interface RDD<T = unknown> {
  id: string;
  partitions: number;
  count: number;
  data: T[];
}

export class SparkProcessing {
  private _rdds: Map<string, RDD> = new Map();
  private _jobs: Map<string, SparkJob> = new Map();
  private _counter = 0;

  createRDD<T>(data: T[], partitions: number = 4): RDD<T> {
    const rddId = `rdd-${++this._counter}`;
    const rdd: RDD<T> = { id: rddId, partitions, count: data.length, data };
    this._rdds.set(rddId, rdd as RDD);
    return rdd;
  }

  map<T, U>(rdd: RDD<T>, func: (item: T) => U): RDD<U> {
    const newData = rdd.data.map(func);
    return this.createRDD(newData, rdd.partitions);
  }

  filter<T>(rdd: RDD<T>, predicate: (item: T) => boolean): RDD<T> {
    const newData = rdd.data.filter(predicate);
    return this.createRDD(newData, rdd.partitions);
  }

  reduce<T>(rdd: RDD<T>, func: (a: T, b: T) => T): T {
    if (rdd.data.length === 0) throw new Error('Cannot reduce empty RDD');
    return rdd.data.reduce(func);
  }

  aggregate<T, U>(rdd: RDD<T>, zero: U, seq: (acc: U, item: T) => U, comb: (a: U, b: U) => U): U {
    const perPartition: U[] = [];
    const perPartSize = Math.ceil(rdd.data.length / rdd.partitions);
    for (let p = 0; p < rdd.partitions; p++) {
      const slice = rdd.data.slice(p * perPartSize, (p + 1) * perPartSize);
      let acc = { ...zero } as unknown as U;
      for (const item of slice) acc = seq(acc, item);
      perPartition.push(acc);
    }
    return perPartition.reduce(comb, zero);
  }

  join<K, V, W>(rdd1: RDD<[K, V]>, rdd2: RDD<[K, W]>, joinType: string = 'inner'): RDD<[K, [V, W?]]> {
    const map1 = new Map<K, V[]>();
    const map2 = new Map<K, W[]>();
    for (const [k, v] of rdd1.data) {
      if (!map1.has(k)) map1.set(k, []);
      map1.get(k)!.push(v);
    }
    for (const [k, w] of rdd2.data) {
      if (!map2.has(k)) map2.set(k, []);
      map2.get(k)!.push(w);
    }
    const result: [K, [V, W?]][] = [];
    const keys = new Set([...map1.keys(), ...map2.keys()]);
    for (const k of keys) {
      const v1 = map1.get(k) || [];
      const v2 = map2.get(k) || [];
      if (joinType === 'inner' && v1.length > 0 && v2.length > 0) {
        for (const a of v1) for (const b of v2) result.push([k, [a, b]]);
      } else if (joinType === 'left' && v1.length > 0) {
        for (const a of v1) {
          if (v2.length > 0) for (const b of v2) result.push([k, [a, b]]);
          else result.push([k, [a]]);
        }
      } else if (joinType === 'right' && v2.length > 0) {
        for (const b of v2) {
          if (v1.length > 0) for (const a of v1) result.push([k, [a, b]]);
          else result.push([k, [undefined as unknown as V, b]]);
        }
      } else if (joinType === 'full') {
        if (v1.length > 0 && v2.length > 0) {
          for (const a of v1) for (const b of v2) result.push([k, [a, b]]);
        } else if (v1.length > 0) {
          for (const a of v1) result.push([k, [a]]);
        } else {
          for (const b of v2) result.push([k, [undefined as unknown as V, b]]);
        }
      }
    }
    return this.createRDD(result);
  }

  groupByKey<K, V>(rdd: RDD<[K, V]>): RDD<[K, V[]]> {
    const groups = new Map<K, V[]>();
    for (const [k, v] of rdd.data) {
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(v);
    }
    return this.createRDD(Array.from(groups.entries()));
  }

  sortByKey<K, V>(rdd: RDD<[K, V]>, ascending: boolean = true): RDD<[K, V]> {
    const sorted = [...rdd.data].sort((a, b) => {
      if (a[0] < b[0]) return ascending ? -1 : 1;
      if (a[0] > b[0]) return ascending ? 1 : -1;
      return 0;
    });
    return this.createRDD(sorted, rdd.partitions);
  }

  sparkSQL(query: string, tables: Record<string, Record<string, unknown>[]>): Record<string, unknown>[] {
    const firstTable = Object.values(tables)[0] || [];
    return firstTable.slice(0, 100);
  }

  dataframeTransform(df: Record<string, unknown>[], operations: string[]): Record<string, unknown>[] {
    let result = [...df];
    for (const op of operations) {
      result = result.map(row => ({ ...row, [op]: true }));
    }
    return result;
  }

  sparkStreaming(dstream: Record<string, unknown>[], operation: string): Record<string, unknown>[] {
    return dstream.map(row => ({ ...row, streamProcessed: true, operation }));
  }

  mlPipeline(stages: string[], data: Record<string, unknown>[]): Record<string, unknown>[] {
    let result = [...data];
    for (const stage of stages) {
      result = result.map(row => ({ ...row, [`stage_${stage}`]: 'completed' }));
    }
    return result;
  }

  cache<T>(rdd: RDD<T>): RDD<T> {
    return { ...rdd, data: [...rdd.data] };
  }

  persist<T>(rdd: RDD<T>, level: string): RDD<T> {
    return { ...rdd, data: [...rdd.data] };
  }

  checkpoint<T>(rdd: RDD<T>): RDD<T> {
    return rdd;
  }

  repartition<T>(rdd: RDD<T>, n: number): RDD<T> {
    return { ...rdd, partitions: n };
  }

  toPacket(): DataPacket<{
    rdds: Map<string, RDD>;
    jobs: Map<string, SparkJob>;
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['big_data', 'SparkProcessing'],
      priority: 1,
      phase: 'spark_processing',
    };
    return {
      id: `spark-${Date.now().toString(36)}`,
      payload: {
        rdds: this._rdds,
        jobs: this._jobs,
      },
      metadata,
    };
  }

  reset(): void {
    this._rdds = new Map();
    this._jobs = new Map();
    this._counter = 0;
  }

  get rddCount(): number { return this._rdds.size; }
  get jobCount(): number { return this._jobs.size; }
}
