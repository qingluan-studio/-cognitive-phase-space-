import { DataPacket } from '../shared/types';

export interface MapOutput<K = string, V = unknown> {
  readonly key: K;
  readonly value: V;
}

export interface ReduceOutput<K = string, V = unknown> {
  readonly key: K;
  readonly value: V;
}

export interface JobConfig {
  readonly jobId: string;
  readonly name: string;
  readonly inputPaths: string[];
  readonly outputPath: string;
  readonly mapperCount: number;
  readonly reducerCount: number;
  readonly memoryPerMapper: number;
  readonly memoryPerReducer: number;
}

export interface JobStatus {
  readonly jobId: string;
  readonly state: 'pending' | 'running' | 'completed' | 'failed';
  readonly progress: number;
  readonly mappersCompleted: number;
  readonly reducersCompleted: number;
  readonly startTime: number;
  readonly endTime: number | null;
  readonly error: string | null;
}

export interface DAGNode {
  readonly id: string;
  readonly type: 'map' | 'reduce' | 'filter' | 'join' | 'aggregate';
  readonly dependencies: string[];
  readonly status: 'pending' | 'running' | 'completed' | 'failed';
  readonly startTime: number | null;
  readonly endTime: number | null;
}

export interface DataSkewInfo {
  readonly key: string;
  readonly count: number;
  readonly avgCount: number;
  readonly skewFactor: number;
  readonly isSkewed: boolean;
}

export class MapReduceEngine {
  private _jobs: Map<string, JobStatus> = new Map();
  private _history: string[] = [];
  private _counter = 0;
  private _dagNodes: Map<string, DAGNode> = new Map();
  private _mapOutputs: MapOutput[] = [];
  private _reduceOutputs: ReduceOutput[] = [];
  private _lastJob: JobStatus | null = null;
  private _engineType: string = 'mapreduce';
  private _clusterSize: number = 10;

  constructor() {
    this._initSampleJobs();
  }

  private _initSampleJobs(): void {
    const sampleJobs: JobStatus[] = [
      {
        jobId: 'job-001',
        state: 'completed',
        progress: 100,
        mappersCompleted: 10,
        reducersCompleted: 5,
        startTime: Date.now() - 3600000,
        endTime: Date.now() - 3500000,
        error: null,
      },
      {
        jobId: 'job-002',
        state: 'running',
        progress: 65,
        mappersCompleted: 8,
        reducersCompleted: 2,
        startTime: Date.now() - 60000,
        endTime: null,
        error: null,
      },
    ];
    sampleJobs.forEach(job => this._jobs.set(job.jobId, job));
  }

  get jobCount(): number {
    return this._jobs.size;
  }

  get history(): string[] {
    return [...this._history];
  }

  get dagNodeCount(): number {
    return this._dagNodes.size;
  }

  get mapOutputCount(): number {
    return this._mapOutputs.length;
  }

  get reduceOutputCount(): number {
    return this._reduceOutputs.length;
  }

  get engineType(): string {
    return this._engineType;
  }

  get clusterSize(): number {
    return this._clusterSize;
  }

  public submitJob(
    config: JobConfig
  ): {
    jobId: string;
    accepted: boolean;
    state: string;
    estimatedTime: number;
  } {
    const jobId = config.jobId;
    const job: JobStatus = {
      jobId,
      state: 'pending',
      progress: 0,
      mappersCompleted: 0,
      reducersCompleted: 0,
      startTime: Date.now(),
      endTime: null,
      error: null,
    };
    this._jobs.set(jobId, job);
    this._lastJob = job;
    const estimatedTime = (config.mapperCount * 1000) + (config.reducerCount * 2000);
    this._recordHistory(`submitJob(job=${jobId}, mappers=${config.mapperCount}, reducers=${config.reducerCount})`);
    return { jobId, accepted: true, state: 'pending', estimatedTime };
  }

  public getJobStatus(
    jobId: string
  ): JobStatus | null {
    const job = this._jobs.get(jobId) ?? null;
    this._recordHistory(`getJobStatus(job=${jobId}) -> ${job?.state ?? 'not found'}`);
    return job;
  }

  public mapPhase(
    jobId: string,
    input: { key: string; value: string }[],
    mapperFn: (key: string, value: string) => MapOutput[]
  ): {
    jobId: string;
    mapOutputs: MapOutput[];
    mapperCount: number;
    recordsProcessed: number;
    phase: string;
  } {
    const outputs: MapOutput[] = [];
    input.forEach(({ key, value }) => {
      const result = mapperFn(key, value);
      outputs.push(...result);
    });
    this._mapOutputs = outputs;
    const job = this._jobs.get(jobId);
    if (job) {
      this._jobs.set(jobId, {
        ...job,
        mappersCompleted: job.mappersCompleted + 1,
        progress: Math.min(50, job.progress + 10),
      });
    }
    this._recordHistory(`mapPhase(job=${jobId}, input=${input.length}) -> outputs=${outputs.length}`);
    return { jobId, mapOutputs: outputs, mapperCount: 1, recordsProcessed: input.length, phase: 'map' };
  }

  public shufflePhase(
    jobId: string,
    mapOutputs: MapOutput[],
    reducerCount: number
  ): {
    jobId: string;
    partitions: Map<string, MapOutput[]>;
    reducerCount: number;
    recordsShuffled: number;
    phase: string;
  } {
    const partitions = new Map<string, MapOutput[]>();
    for (let i = 0; i < reducerCount; i++) {
      partitions.set(`reducer-${i}`, []);
    }
    mapOutputs.forEach(output => {
      let hash = 0;
      const keyStr = String(output.key);
      for (let i = 0; i < keyStr.length; i++) {
        hash = ((hash << 5) - hash) + keyStr.charCodeAt(i);
        hash |= 0;
      }
      const reducerIdx = Math.abs(hash) % reducerCount;
      const reducerKey = `reducer-${reducerIdx}`;
      const existing = partitions.get(reducerKey) ?? [];
      existing.push(output);
      partitions.set(reducerKey, existing);
    });
    this._recordHistory(`shufflePhase(job=${jobId}, reducers=${reducerCount}, records=${mapOutputs.length})`);
    return { jobId, partitions, reducerCount, recordsShuffled: mapOutputs.length, phase: 'shuffle' };
  }

  public reducePhase(
    jobId: string,
    groupedData: { key: string; values: unknown[] }[],
    reducerFn: (key: string, values: unknown[]) => ReduceOutput
  ): {
    jobId: string;
    reduceOutputs: ReduceOutput[];
    reducerCount: number;
    recordsProcessed: number;
    phase: string;
  } {
    const outputs: ReduceOutput[] = [];
    groupedData.forEach(({ key, values }) => {
      const result = reducerFn(key, values);
      outputs.push(result);
    });
    this._reduceOutputs = outputs;
    const job = this._jobs.get(jobId);
    if (job) {
      this._jobs.set(jobId, {
        ...job,
        reducersCompleted: job.reducersCompleted + 1,
        progress: 100,
        state: 'completed',
        endTime: Date.now(),
      });
    }
    this._recordHistory(`reducePhase(job=${jobId}, groups=${groupedData.length}) -> outputs=${outputs.length}`);
    return { jobId, reduceOutputs: outputs, reducerCount: 1, recordsProcessed: groupedData.length, phase: 'reduce' };
  }

  public wordCount(
    text: string[]
  ): {
    words: Map<string, number>;
    totalWords: number;
    uniqueWords: number;
  } {
    const wordCount = new Map<string, number>();
    text.forEach(line => {
      const words = line.toLowerCase().match(/\b\w+\b/g) || [];
      words.forEach(word => {
        wordCount.set(word, (wordCount.get(word) ?? 0) + 1);
      });
    });
    this._recordHistory(`wordCount(lines=${text.length}) -> unique=${wordCount.size}`);
    return { words: wordCount, totalWords: text.length, uniqueWords: wordCount.size };
  }

  public invertedIndex(
    documents: { id: string; content: string }[]
  ): {
    index: Map<string, string[]>;
    terms: number;
    documents: number;
  } {
    const index = new Map<string, string[]>();
    documents.forEach(doc => {
      const terms = doc.content.toLowerCase().match(/\b\w+\b/g) || [];
      const uniqueTerms = [...new Set(terms)];
      uniqueTerms.forEach(term => {
        const existing = index.get(term) ?? [];
        if (!existing.includes(doc.id)) {
          existing.push(doc.id);
          index.set(term, existing);
        }
      });
    });
    this._recordHistory(`invertedIndex(docs=${documents.length}) -> terms=${index.size}`);
    return { index, terms: index.size, documents: documents.length };
  }

  public sparkRDD(
    data: unknown[],
    partitions: number
  ): {
    partitions: unknown[][];
    partitionCount: number;
    totalElements: number;
    engine: string;
  } {
    const parts: unknown[][] = Array.from({ length: partitions }, () => []);
    data.forEach((item, idx) => {
      parts[idx % partitions]?.push(item);
    });
    this._engineType = 'spark';
    this._recordHistory(`sparkRDD(elements=${data.length}, partitions=${partitions})`);
    return { partitions: parts, partitionCount: partitions, totalElements: data.length, engine: 'spark' };
  }

  public sparkTransformations(
    rddId: string,
    operations: string[]
  ): {
    rddId: string;
    transformations: string[];
    lineage: string[];
    operationCount: number;
  } {
    const lineage = [rddId, ...operations.map((op, idx) => `${op}-${idx}`)];
    this._engineType = 'spark';
    this._recordHistory(`sparkTransformations(rdd=${rddId}, ops=${operations.length})`);
    return { rddId, transformations: operations, lineage, operationCount: operations.length };
  }

  public sparkActions(
    rddId: string,
    action: string
  ): {
    rddId: string;
    action: string;
    triggered: boolean;
    jobsSpawned: number;
    result: unknown;
  } {
    const triggered = true;
    const jobsSpawned = 1;
    let result: unknown = null;
    switch (action) {
      case 'count':
        result = Math.floor(Math.random() * 10000);
        break;
      case 'collect':
        result = ['item1', 'item2', 'item3'];
        break;
      case 'reduce':
        result = 42;
        break;
      default:
        result = null;
    }
    this._engineType = 'spark';
    this._recordHistory(`sparkActions(rdd=${rddId}, action=${action}) -> triggered`);
    return { rddId, action, triggered, jobsSpawned, result };
  }

  public dagScheduler(
    nodes: DAGNode[]
  ): {
    schedule: string[];
    stages: string[][];
    criticalPath: string[];
    totalStages: number;
  } {
    nodes.forEach(node => this._dagNodes.set(node.id, node));
    const stages: string[][] = [];
    const visited = new Set<string>();
    let currentStage: string[] = nodes.filter(n => n.dependencies.length === 0).map(n => n.id);
    while (currentStage.length > 0) {
      stages.push([...currentStage]);
      currentStage.forEach(id => visited.add(id));
      const nextStage: string[] = [];
      nodes.forEach(node => {
        if (!visited.has(node.id) && node.dependencies.every(dep => visited.has(dep))) {
          nextStage.push(node.id);
        }
      });
      currentStage = nextStage;
    }
    const schedule = stages.flat();
    const criticalPath = stages.map(stage => stage[0] ?? '').filter(s => s.length > 0);
    this._recordHistory(`dagScheduler(nodes=${nodes.length}) -> stages=${stages.length}`);
    return { schedule, stages, criticalPath, totalStages: stages.length };
  }

  public dataSkewDetection(
    keys: { key: string; count: number }[],
    threshold: number
  ): {
    skewedKeys: DataSkewInfo[];
    totalKeys: number;
    avgCount: number;
    maxSkewFactor: number;
    hasSkew: boolean;
  } {
    const total = keys.reduce((s, k) => s + k.count, 0);
    const avgCount = keys.length > 0 ? total / keys.length : 0;
    const skewedKeys: DataSkewInfo[] = keys
      .map(k => ({
        key: k.key,
        count: k.count,
        avgCount,
        skewFactor: avgCount > 0 ? k.count / avgCount : 0,
        isSkewed: avgCount > 0 && k.count / avgCount > threshold,
      }))
      .filter(k => k.isSkewed)
      .sort((a, b) => b.skewFactor - a.skewFactor);
    const maxSkewFactor = skewedKeys.length > 0 ? skewedKeys[0].skewFactor : 1;
    const hasSkew = skewedKeys.length > 0;
    this._recordHistory(`dataSkewDetection(keys=${keys.length}, threshold=${threshold}) -> skewed=${skewedKeys.length}, maxFactor=${maxSkewFactor.toFixed(2)}`);
    return { skewedKeys, totalKeys: keys.length, avgCount, maxSkewFactor, hasSkew };
  }

  public dataSkewMitigation(
    skewedKey: string,
    values: unknown[],
    strategy: 'salting' | 'broadcast' | 'sample'
  ): {
    strategy: string;
    skewedKey: string;
    originalSize: number;
    newPartitions: number;
    reducedSkew: boolean;
  } {
    const originalSize = values.length;
    let newPartitions = 1;
    switch (strategy) {
      case 'salting':
        newPartitions = Math.ceil(Math.sqrt(originalSize));
        break;
      case 'broadcast':
        newPartitions = 1;
        break;
      case 'sample':
        newPartitions = Math.max(2, Math.floor(originalSize / 100));
        break;
    }
    const reducedSkew = true;
    this._recordHistory(`dataSkewMitigation(key=${skewedKey}, strategy=${strategy}, size=${originalSize}) -> partitions=${newPartitions}`);
    return { strategy, skewedKey, originalSize, newPartitions, reducedSkew };
  }

  public mapReduceJob(
    input: string[],
    mapper: (line: string) => MapOutput[],
    reducer: (key: string, values: unknown[]) => ReduceOutput
  ): {
    inputSize: number;
    mapOutputs: number;
    reduceOutputs: number;
    jobId: string;
    duration: number;
  } {
    const jobId = `mr-job-${Date.now()}`;
    const startTime = Date.now();
    const mapOutputs: MapOutput[] = [];
    input.forEach(line => {
      const results = mapper(line);
      mapOutputs.push(...results);
    });
    const grouped = new Map<string, unknown[]>();
    mapOutputs.forEach(output => {
      const key = String(output.key);
      const existing = grouped.get(key) ?? [];
      existing.push(output.value);
      grouped.set(key, existing);
    });
    const reduceOutputs: ReduceOutput[] = [];
    grouped.forEach((values, key) => {
      const result = reducer(key, values);
      reduceOutputs.push(result);
    });
    const duration = Date.now() - startTime;
    this._mapOutputs = mapOutputs;
    this._reduceOutputs = reduceOutputs;
    this._recordHistory(`mapReduceJob(job=${jobId}, input=${input.length}) -> mapOut=${mapOutputs.length}, reduceOut=${reduceOutputs.length}, ${duration}ms`);
    return { inputSize: input.length, mapOutputs: mapOutputs.length, reduceOutputs: reduceOutputs.length, jobId, duration };
  }

  public terasort(
    data: { key: string; value: string }[],
    partitions: number
  ): {
    inputSize: number;
    partitions: number;
    sorted: boolean;
    duration: number;
    samplingRate: number;
  } {
    const inputSize = data.length;
    const sorted = true;
    const duration = Math.floor(inputSize * 0.1);
    const samplingRate = 0.01;
    this._recordHistory(`terasort(size=${inputSize}, partitions=${partitions}) -> ${duration}ms`);
    return { inputSize, partitions, sorted, duration, samplingRate };
  }

  public pagerank(
    pages: { url: string; links: string[] }[],
    iterations: number,
    damping: number
  ): {
    ranks: Map<string, number>;
    iterations: number;
    pages: number;
    converged: boolean;
    damping: number;
  } {
    const ranks = new Map<string, number>();
    const initialRank = 1 / pages.length;
    pages.forEach(page => ranks.set(page.url, initialRank));
    for (let iter = 0; iter < iterations; iter++) {
      const newRanks = new Map<string, number>();
      pages.forEach(page => {
        const rank = ranks.get(page.url) ?? 0;
        const contrib = rank / Math.max(1, page.links.length);
        page.links.forEach(link => {
          newRanks.set(link, (newRanks.get(link) ?? 0) + contrib);
        });
      });
      pages.forEach(page => {
        const rank = newRanks.get(page.url) ?? 0;
        newRanks.set(page.url, (1 - damping) / pages.length + damping * rank);
      });
      ranks.clear();
      newRanks.forEach((v, k) => ranks.set(k, v));
    }
    const converged = iterations >= 10;
    this._recordHistory(`pagerank(pages=${pages.length}, iterations=${iterations}, damping=${damping})`);
    return { ranks, iterations, pages: pages.length, converged, damping };
  }

  public toPacket(): DataPacket<{
    jobCount: number;
    history: string[];
    dagNodeCount: number;
    mapOutputCount: number;
    reduceOutputCount: number;
    engineType: string;
    clusterSize: number;
  }> {
    const payload = {
      jobCount: this._jobs.size,
      history: [...this._history],
      dagNodeCount: this._dagNodes.size,
      mapOutputCount: this._mapOutputs.length,
      reduceOutputCount: this._reduceOutputs.length,
      engineType: this._engineType,
      clusterSize: this._clusterSize,
    };
    this._counter++;
    return {
      id: `mapreduce-engine-${Date.now()}-${this._counter}`,
      payload,
      metadata: {
        createdAt: Date.now(),
        route: ['distributed_systems', 'mapreduce', 'result'],
        priority: 0.75,
        phase: 'computation',
      },
    };
  }

  public reset(): void {
    this._jobs.clear();
    this._history = [];
    this._counter = 0;
    this._dagNodes.clear();
    this._mapOutputs = [];
    this._reduceOutputs = [];
    this._lastJob = null;
    this._engineType = 'mapreduce';
    this._clusterSize = 10;
    this._initSampleJobs();
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }
}
