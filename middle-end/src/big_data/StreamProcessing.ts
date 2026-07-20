import { DataPacket, PacketMeta } from '../shared/types';

export interface StreamEvent {
  eventId: string;
  timestamp: number;
  data: unknown;
  type: string;
  source: string;
  partition: number;
  offset: number;
  key?: string;
}

export interface StreamJob {
  name: string;
  throughput: number;
  latency: number;
  status: string;
  id: string;
  createdAt: number;
  lastRunAt: number;
  runCount: number;
  inputTopics: string[];
  outputTopics: string[];
  processingTime: number;
  recordsProcessed: number;
  recordsFailed: number;
}

export interface StreamWindow {
  type: 'tumbling' | 'sliding' | 'session' | 'hop';
  size: number;
  slide?: number;
  gap?: number;
  hop?: number;
  allowedLateness?: number;
}

export interface StreamAggregation {
  type: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'distinct' | 'topk' | 'approx_count_distinct';
  field: string;
  window?: StreamWindow;
  groupBy?: string[];
}

export interface StateStore {
  name: string;
  type: 'memory' | 'rocksdb' | 'hdfs' | 'kafka';
  retentionMs: number;
  sizeBytes: number;
  keyCount: number;
}

export interface WatermarkConfig {
  delayMs: number;
  timestampField: string;
  maxOutOfOrdernessMs: number;
}

export interface CheckpointConfig {
  intervalMs: number;
  location: string;
  mode: 'exactly_once' | 'at_least_once';
  timeoutMs: number;
}

export interface KafkaTopic {
  name: string;
  partitions: number;
  replicationFactor: number;
  retentionMs: number;
  minInsyncReplicas: number;
  cleanupPolicy: string;
  segmentBytes: number;
  messages: number;
  sizeBytes: number;
}

export interface StreamTopology {
  id: string;
  name: string;
  sources: string[];
  sinks: string[];
  processors: ProcessorNode[];
  edges: { from: string; to: string; label: string }[];
}

export interface ProcessorNode {
  id: string;
  type: 'source' | 'sink' | 'processor' | 'transform' | 'aggregate' | 'join' | 'window';
  name: string;
  config: Record<string, unknown>;
}

export class StreamProcessing {
  private _events: StreamEvent[] = [];
  private _jobs: Map<string, StreamJob> = new Map();
  private _topics: Map<string, KafkaTopic> = new Map();
  private _stateStores: Map<string, StateStore> = new Map();
  private _topologies: Map<string, StreamTopology> = new Map();
  private _counter = 0;
  private _history: string[] = [];

  get eventCount(): number { return this._events.length; }
  get jobCount(): number { return this._jobs.size; }
  get topicCount(): number { return this._topics.size; }
  get history(): string[] { return [...this._history]; }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  public createTopic(name: string, partitions: number = 3, replicationFactor: number = 3): KafkaTopic {
    const topic: KafkaTopic = {
      name,
      partitions,
      replicationFactor,
      retentionMs: 604800000,
      minInsyncReplicas: Math.max(1, Math.floor(replicationFactor / 2)),
      cleanupPolicy: 'delete',
      segmentBytes: 1073741824,
      messages: 0,
      sizeBytes: 0,
    };
    this._topics.set(name, topic);
    this._recordHistory(`createTopic(name=${name}, partitions=${partitions}, replication=${replicationFactor})`);
    return topic;
  }

  public getTopic(name: string): KafkaTopic | null {
    const topic = this._topics.get(name) || null;
    if (topic) {
      this._recordHistory(`getTopic(name=${name})`);
    }
    return topic;
  }

  public deleteTopic(name: string): { success: boolean; name: string; existed: boolean } {
    const existed = this._topics.has(name);
    const success = existed;
    if (existed) {
      this._topics.delete(name);
    }
    this._recordHistory(`deleteTopic(name=${name}, success=${success})`);
    return { success, name, existed };
  }

  public kafkaConsume(topic: string, groupId: string, config?: { maxRecords?: number; timeoutMs?: number; autoCommit?: boolean }): StreamEvent[] {
    const maxRecords = config?.maxRecords || 10;
    const timeoutMs = config?.timeoutMs || 1000;
    
    const events: StreamEvent[] = [];
    for (let i = 0; i < maxRecords; i++) {
      events.push({
        eventId: `evt-${++this._counter}`,
        timestamp: Date.now() + i * 1000,
        data: { topic, partition: i % 3, offset: i * 100, groupId },
        type: 'kafka_message',
        source: `broker-${i % 3}`,
        partition: i % 3,
        offset: i * 100,
        key: `key-${i}`,
      });
    }
    this._events.push(...events);
    
    this._recordHistory(`kafkaConsume(topic=${topic}, group=${groupId}, records=${events.length})`);
    return events;
  }

  public kafkaProduce(topic: string, message: unknown, key?: string, partition?: number): { success: boolean; topic: string; offset: number; partition: number } {
    const topicObj = this._topics.get(topic);
    const targetPartition = partition ?? Math.floor(Math.random() * (topicObj?.partitions || 3));
    const offset = Math.floor(Math.random() * 100000);
    
    if (topicObj) {
      topicObj.messages++;
      topicObj.sizeBytes += JSON.stringify(message).length;
    }
    
    this._recordHistory(`kafkaProduce(topic=${topic})`);
    return { success: true, topic, offset, partition: targetPartition };
  }

  public kafkaBatchProduce(topic: string, messages: unknown[], keys?: string[]): { success: boolean; topic: string; messagesProduced: number; errors: number } {
    let errors = 0;
    for (let i = 0; i < messages.length; i++) {
      const key = keys?.[i];
      const result = this.kafkaProduce(topic, messages[i], key);
      if (!result.success) errors++;
    }
    
    this._recordHistory(`kafkaBatchProduce(topic=${topic}, messages=${messages.length})`);
    return { success: errors === 0, topic, messagesProduced: messages.length - errors, errors };
  }

  public streamFilter(stream: StreamEvent[], predicate: (event: StreamEvent) => boolean): StreamEvent[] {
    const result = stream.filter(predicate);
    this._recordHistory(`streamFilter(input=${stream.length}, output=${result.length})`);
    return result;
  }

  public streamMap(stream: StreamEvent[], func: (event: StreamEvent) => StreamEvent): StreamEvent[] {
    const result = stream.map(func);
    this._recordHistory(`streamMap(input=${stream.length}, output=${result.length})`);
    return result;
  }

  public streamFlatMap(stream: StreamEvent[], func: (event: StreamEvent) => StreamEvent[]): StreamEvent[] {
    const result = stream.flatMap(func);
    this._recordHistory(`streamFlatMap(input=${stream.length}, output=${result.length})`);
    return result;
  }

  public streamAggregate(stream: StreamEvent[], window: StreamWindow, func: (events: StreamEvent[]) => unknown): StreamEvent[] {
    const result: StreamEvent[] = [];
    const windowSize = window.size;
    
    for (let i = 0; i < stream.length; i += windowSize) {
      const batch = stream.slice(i, i + windowSize);
      if (batch.length > 0) {
        result.push({
          eventId: `agg-${++this._counter}`,
          timestamp: batch[batch.length - 1].timestamp,
          data: func(batch),
          type: 'aggregate',
          source: 'aggregator',
          partition: 0,
          offset: i,
        });
      }
    }
    
    this._recordHistory(`streamAggregate(window=${window.type}, input=${stream.length}, output=${result.length})`);
    return result;
  }

  public streamJoin(stream1: StreamEvent[], stream2: StreamEvent[], window: StreamWindow, joinKey: string = 'id'): StreamEvent[] {
    const result: StreamEvent[] = [];
    const map2 = new Map<string, StreamEvent>();
    
    for (const e of stream2) {
      const key = String((e.data as Record<string, unknown>)[joinKey] || e.eventId);
      map2.set(key, e);
    }
    
    for (const e1 of stream1) {
      const key = String((e1.data as Record<string, unknown>)[joinKey] || e1.eventId);
      const e2 = map2.get(key);
      
      result.push({
        eventId: `join-${e1.eventId}`,
        timestamp: e1.timestamp,
        data: { left: e1.data, right: e2?.data },
        type: 'join',
        source: 'joiner',
        partition: e1.partition,
        offset: e1.offset,
      });
    }
    
    this._recordHistory(`streamJoin(type=${window.type}, input1=${stream1.length}, input2=${stream2.length}, output=${result.length})`);
    return result;
  }

  public tumblingWindow(stream: StreamEvent[], size: number, func: (events: StreamEvent[]) => unknown): StreamEvent[] {
    const window: StreamWindow = { type: 'tumbling', size };
    return this.streamAggregate(stream, window, func);
  }

  public slidingWindow(stream: StreamEvent[], size: number, slide: number, func: (events: StreamEvent[]) => unknown): StreamEvent[] {
    const result: StreamEvent[] = [];
    for (let i = 0; i < stream.length - size + 1; i += slide) {
      const window = stream.slice(i, i + size);
      if (window.length > 0) {
        result.push({
          eventId: `slide-${++this._counter}`,
          timestamp: window[window.length - 1].timestamp,
          data: func(window),
          type: 'sliding_window',
          source: 'sliding-window',
          partition: 0,
          offset: i,
        });
      }
    }
    this._recordHistory(`slidingWindow(size=${size}, slide=${slide}, input=${stream.length}, output=${result.length})`);
    return result;
  }

  public sessionWindow(stream: StreamEvent[], gap: number, func: (events: StreamEvent[]) => unknown): StreamEvent[] {
    const result: StreamEvent[] = [];
    let session: StreamEvent[] = [];
    
    const sorted = [...stream].sort((a, b) => a.timestamp - b.timestamp);
    
    for (let i = 0; i < sorted.length; i++) {
      if (session.length > 0 && sorted[i].timestamp - session[session.length - 1].timestamp > gap) {
        result.push({
          eventId: `session-${++this._counter}`,
          timestamp: session[session.length - 1].timestamp,
          data: func(session),
          type: 'session_window',
          source: 'session-window',
          partition: 0,
          offset: 0,
        });
        session = [];
      }
      session.push(sorted[i]);
    }
    
    if (session.length > 0) {
      result.push({
        eventId: `session-${++this._counter}`,
        timestamp: session[session.length - 1].timestamp,
        data: func(session),
        type: 'session_window',
        source: 'session-window',
        partition: 0,
        offset: 0,
      });
    }
    
    this._recordHistory(`sessionWindow(gap=${gap}, input=${stream.length}, sessions=${result.length})`);
    return result;
  }

  public hopWindow(stream: StreamEvent[], size: number, hop: number, func: (events: StreamEvent[]) => unknown): StreamEvent[] {
    const result: StreamEvent[] = [];
    for (let i = 0; i < stream.length; i += hop) {
      const window = stream.slice(i, i + size);
      if (window.length > 0) {
        result.push({
          eventId: `hop-${++this._counter}`,
          timestamp: window[window.length - 1].timestamp,
          data: func(window),
          type: 'hop_window',
          source: 'hop-window',
          partition: 0,
          offset: i,
        });
      }
    }
    this._recordHistory(`hopWindow(size=${size}, hop=${hop}, input=${stream.length}, output=${result.length})`);
    return result;
  }

  public statefulProcess(stream: StreamEvent[], stateFunc: (state: Record<string, unknown>, event: StreamEvent) => { state: Record<string, unknown>; output: unknown }): StreamEvent[] {
    const state: Record<string, unknown> = {};
    const result: StreamEvent[] = [];
    
    for (const event of stream) {
      const { state: newState, output } = stateFunc(state, event);
      Object.assign(state, newState);
      result.push({
        eventId: `stateful-${event.eventId}`,
        timestamp: event.timestamp,
        data: output,
        type: 'stateful',
        source: 'stateful-processor',
        partition: event.partition,
        offset: event.offset,
      });
    }
    
    this._recordHistory(`statefulProcess(input=${stream.length}, output=${result.length})`);
    return result;
  }

  public checkpointing(stream: StreamEvent[], interval: number): StreamEvent[] {
    const result = stream.map((e, i) => ({
      ...e,
      data: { ...(e.data as object), checkpoint: i % interval === 0, checkpointId: i % interval === 0 ? `chk-${i}` : undefined },
    }));
    this._recordHistory(`checkpointing(interval=${interval}, events=${stream.length})`);
    return result;
  }

  public watermark(stream: StreamEvent[], config: WatermarkConfig): StreamEvent[] {
    const sorted = [...stream].sort((a, b) => a.timestamp - b.timestamp);
    let maxTimestamp = 0;
    
    const result = sorted.map(e => {
      const ts = e.timestamp;
      maxTimestamp = Math.max(maxTimestamp, ts);
      return {
        ...e,
        data: { ...(e.data as object), watermark: maxTimestamp - config.delayMs, eventTime: ts },
      };
    });
    
    this._recordHistory(`watermark(delay=${config.delayMs}, events=${stream.length})`);
    return result;
  }

  public exactlyOnce(stream: StreamEvent[], idempotent: (event: StreamEvent) => string): StreamEvent[] {
    const seen = new Set<string>();
    const result: StreamEvent[] = [];
    
    for (const event of stream) {
      const key = idempotent(event);
      if (!seen.has(key)) {
        seen.add(key);
        result.push({
          ...event,
          data: { ...(event.data as object), deduplicated: true, deduplicationKey: key },
        });
      }
    }
    
    this._recordHistory(`exactlyOnce(input=${stream.length}, output=${result.length}, duplicates=${stream.length - result.length})`);
    return result;
  }

  public atLeastOnce(stream: StreamEvent[]): StreamEvent[] {
    this._recordHistory(`atLeastOnce(events=${stream.length})`);
    return stream.map(e => ({ ...e, data: { ...(e.data as object), deliveryGuarantee: 'at_least_once' } }));
  }

  public createStateStore(name: string, type: StateStore['type'], retentionMs: number = 3600000): StateStore {
    const store: StateStore = {
      name,
      type,
      retentionMs,
      sizeBytes: 0,
      keyCount: 0,
    };
    this._stateStores.set(name, store);
    this._recordHistory(`createStateStore(name=${name}, type=${type})`);
    return store;
  }

  public updateState(storeName: string, key: string, value: unknown): { storeName: string; key: string; updated: boolean } {
    const store = this._stateStores.get(storeName);
    const updated = !!store;
    
    if (updated && store) {
      store.keyCount++;
      store.sizeBytes += JSON.stringify(value).length;
    }
    
    this._recordHistory(`updateState(store=${storeName}, key=${key})`);
    return { storeName, key, updated };
  }

  public getState(storeName: string, key: string): { storeName: string; key: string; value: unknown | null; exists: boolean } {
    const store = this._stateStores.get(storeName);
    const exists = !!store;
    
    this._recordHistory(`getState(store=${storeName}, key=${key})`);
    return { storeName, key, value: exists ? { key, timestamp: Date.now() } : null, exists };
  }

  public deleteState(storeName: string, key: string): { storeName: string; key: string; deleted: boolean } {
    const store = this._stateStores.get(storeName);
    const deleted = !!store;
    
    if (deleted && store) {
      store.keyCount = Math.max(0, store.keyCount - 1);
    }
    
    this._recordHistory(`deleteState(store=${storeName}, key=${key})`);
    return { storeName, key, deleted };
  }

  public aggregateByKey(stream: StreamEvent[], keyFunc: (event: StreamEvent) => string, aggFunc: (values: unknown[]) => unknown): StreamEvent[] {
    const groups = new Map<string, unknown[]>();
    
    for (const event of stream) {
      const key = keyFunc(event);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(event.data);
    }
    
    const result: StreamEvent[] = [];
    for (const [key, values] of groups) {
      result.push({
        eventId: `agg-key-${++this._counter}`,
        timestamp: Date.now(),
        data: { key, aggregated: aggFunc(values), count: values.length },
        type: 'aggregate_by_key',
        source: 'key-aggregator',
        partition: 0,
        offset: 0,
      });
    }
    
    this._recordHistory(`aggregateByKey(groups=${groups.size}, input=${stream.length})`);
    return result;
  }

  public countByKey(stream: StreamEvent[], keyFunc: (event: StreamEvent) => string): StreamEvent[] {
    const groups = new Map<string, number>();
    
    for (const event of stream) {
      const key = keyFunc(event);
      groups.set(key, (groups.get(key) || 0) + 1);
    }
    
    const result: StreamEvent[] = [];
    for (const [key, count] of groups) {
      result.push({
        eventId: `count-${++this._counter}`,
        timestamp: Date.now(),
        data: { key, count },
        type: 'count_by_key',
        source: 'counter',
        partition: 0,
        offset: 0,
      });
    }
    
    this._recordHistory(`countByKey(groups=${groups.size})`);
    return result;
  }

  public sumByKey(stream: StreamEvent[], keyFunc: (event: StreamEvent) => string, valueFunc: (event: StreamEvent) => number): StreamEvent[] {
    const groups = new Map<string, number>();
    
    for (const event of stream) {
      const key = keyFunc(event);
      const value = valueFunc(event);
      groups.set(key, (groups.get(key) || 0) + value);
    }
    
    const result: StreamEvent[] = [];
    for (const [key, sum] of groups) {
      result.push({
        eventId: `sum-${++this._counter}`,
        timestamp: Date.now(),
        data: { key, sum },
        type: 'sum_by_key',
        source: 'summer',
        partition: 0,
        offset: 0,
      });
    }
    
    this._recordHistory(`sumByKey(groups=${groups.size})`);
    return result;
  }

  public avgByKey(stream: StreamEvent[], keyFunc: (event: StreamEvent) => string, valueFunc: (event: StreamEvent) => number): StreamEvent[] {
    const groups = new Map<string, { sum: number; count: number }>();
    
    for (const event of stream) {
      const key = keyFunc(event);
      const value = valueFunc(event);
      const current = groups.get(key) || { sum: 0, count: 0 };
      groups.set(key, { sum: current.sum + value, count: current.count + 1 });
    }
    
    const result: StreamEvent[] = [];
    for (const [key, { sum, count }] of groups) {
      result.push({
        eventId: `avg-${++this._counter}`,
        timestamp: Date.now(),
        data: { key, avg: sum / count, count, sum },
        type: 'avg_by_key',
        source: 'averager',
        partition: 0,
        offset: 0,
      });
    }
    
    this._recordHistory(`avgByKey(groups=${groups.size})`);
    return result;
  }

  public minByKey(stream: StreamEvent[], keyFunc: (event: StreamEvent) => string, valueFunc: (event: StreamEvent) => number): StreamEvent[] {
    const groups = new Map<string, number>();
    
    for (const event of stream) {
      const key = keyFunc(event);
      const value = valueFunc(event);
      const current = groups.get(key);
      if (current === undefined || value < current) {
        groups.set(key, value);
      }
    }
    
    const result: StreamEvent[] = [];
    for (const [key, min] of groups) {
      result.push({
        eventId: `min-${++this._counter}`,
        timestamp: Date.now(),
        data: { key, min },
        type: 'min_by_key',
        source: 'min-finder',
        partition: 0,
        offset: 0,
      });
    }
    
    this._recordHistory(`minByKey(groups=${groups.size})`);
    return result;
  }

  public maxByKey(stream: StreamEvent[], keyFunc: (event: StreamEvent) => string, valueFunc: (event: StreamEvent) => number): StreamEvent[] {
    const groups = new Map<string, number>();
    
    for (const event of stream) {
      const key = keyFunc(event);
      const value = valueFunc(event);
      const current = groups.get(key);
      if (current === undefined || value > current) {
        groups.set(key, value);
      }
    }
    
    const result: StreamEvent[] = [];
    for (const [key, max] of groups) {
      result.push({
        eventId: `max-${++this._counter}`,
        timestamp: Date.now(),
        data: { key, max },
        type: 'max_by_key',
        source: 'max-finder',
        partition: 0,
        offset: 0,
      });
    }
    
    this._recordHistory(`maxByKey(groups=${groups.size})`);
    return result;
  }

  public topK(stream: StreamEvent[], k: number, keyFunc: (event: StreamEvent) => string, valueFunc: (event: StreamEvent) => number): StreamEvent[] {
    const groups = new Map<string, number>();
    
    for (const event of stream) {
      const key = keyFunc(event);
      const value = valueFunc(event);
      groups.set(key, (groups.get(key) || 0) + value);
    }
    
    const sorted = Array.from(groups.entries()).sort((a, b) => b[1] - a[1]).slice(0, k);
    
    const result: StreamEvent[] = [];
    for (let i = 0; i < sorted.length; i++) {
      const [key, value] = sorted[i];
      result.push({
        eventId: `topk-${++this._counter}`,
        timestamp: Date.now(),
        data: { key, value, rank: i + 1 },
        type: 'topk',
        source: 'topk-computer',
        partition: 0,
        offset: 0,
      });
    }
    
    this._recordHistory(`topK(k=${k}, groups=${groups.size}, result=${result.length})`);
    return result;
  }

  public approximateCountDistinct(stream: StreamEvent[], hashFunc: (event: StreamEvent) => string, precision: number = 0.01): StreamEvent {
    const hashes = new Set<string>();
    for (const event of stream) {
      hashes.add(hashFunc(event));
    }
    
    const estimated = hashes.size;
    const error = estimated * precision;
    
    this._recordHistory(`approximateCountDistinct(input=${stream.length}, estimated=${estimated})`);
    return {
      eventId: `count-distinct-${++this._counter}`,
      timestamp: Date.now(),
      data: { estimated, error, method: 'hyperloglog', precision },
      type: 'approx_count_distinct',
      source: 'distinct-counter',
      partition: 0,
      offset: 0,
    };
  }

  public cdcStream(stream: StreamEvent[]): StreamEvent[] {
    const operations = ['INSERT', 'UPDATE', 'DELETE', 'UPSERT'];
    
    const result = stream.map(event => {
      const op = operations[Math.floor(Math.random() * operations.length)];
      return {
        ...event,
        data: { ...(event.data as object), operation: op, cdc: true },
        type: 'cdc_event',
      };
    });
    
    this._recordHistory(`cdcStream(events=${stream.length})`);
    return result;
  }

  public eventTimeProcessing(stream: StreamEvent[], timestampField: string): StreamEvent[] {
    const result = stream.map(event => {
      const data = event.data as Record<string, unknown>;
      const eventTime = data[timestampField] as number || event.timestamp;
      return {
        ...event,
        timestamp: eventTime,
        data: { ...data, eventTime, processingTime: Date.now() },
      };
    }).sort((a, b) => a.timestamp - b.timestamp);
    
    this._recordHistory(`eventTimeProcessing(events=${stream.length})`);
    return result;
  }

  public processingTimeProcessing(stream: StreamEvent[]): StreamEvent[] {
    const result = stream.map(event => ({
      ...event,
      data: { ...(event.data as object), processingTime: Date.now(), isProcessingTime: true },
    }));
    
    this._recordHistory(`processingTimeProcessing(events=${stream.length})`);
    return result;
  }

  public createTopology(name: string, sources: string[], sinks: string[]): StreamTopology {
    const topologyId = `topology-${++this._counter}`;
    const topology: StreamTopology = {
      id: topologyId,
      name,
      sources,
      sinks,
      processors: [],
      edges: [],
    };
    
    this._topologies.set(topologyId, topology);
    this._recordHistory(`createTopology(name=${name}, sources=${sources.length}, sinks=${sinks.length})`);
    return topology;
  }

  public addProcessor(topologyId: string, processor: ProcessorNode): { topologyId: string; processorId: string; added: boolean } {
    const topology = this._topologies.get(topologyId);
    const added = !!topology;
    
    if (added && topology) {
      topology.processors.push(processor);
    }
    
    this._recordHistory(`addProcessor(topology=${topologyId}, processor=${processor.name})`);
    return { topologyId, processorId: processor.id, added };
  }

  public addEdge(topologyId: string, from: string, to: string, label: string): { topologyId: string; added: boolean } {
    const topology = this._topologies.get(topologyId);
    const added = !!topology;
    
    if (added && topology) {
      topology.edges.push({ from, to, label });
    }
    
    this._recordHistory(`addEdge(topology=${topologyId}, from=${from}, to=${to})`);
    return { topologyId, added };
  }

  public submitJob(name: string, inputTopics: string[], outputTopics: string[], config?: Partial<StreamJob>): StreamJob {
    const jobId = `stream-job-${++this._counter}`;
    const job: StreamJob = {
      id: jobId,
      name,
      inputTopics,
      outputTopics,
      throughput: config?.throughput || 10000,
      latency: config?.latency || 100,
      status: 'running',
      createdAt: Date.now(),
      lastRunAt: Date.now(),
      runCount: 1,
      processingTime: 0,
      recordsProcessed: 0,
      recordsFailed: 0,
    };
    
    this._jobs.set(jobId, job);
    this._recordHistory(`submitJob(name=${name}, id=${jobId})`);
    return job;
  }

  public getJobStatus(jobId: string): StreamJob | null {
    const job = this._jobs.get(jobId) || null;
    if (job) {
      this._recordHistory(`getJobStatus(id=${jobId}, status=${job.status})`);
    }
    return job;
  }

  public stopJob(jobId: string): { jobId: string; stopped: boolean; lastStatus: string } {
    const job = this._jobs.get(jobId);
    const stopped = !!job;
    const lastStatus = job?.status || 'unknown';
    
    if (stopped && job) {
      this._jobs.set(jobId, { ...job, status: 'stopped' });
    }
    
    this._recordHistory(`stopJob(id=${jobId}, stopped=${stopped})`);
    return { jobId, stopped, lastStatus };
  }

  public deleteJob(jobId: string): { jobId: string; deleted: boolean; existed: boolean } {
    const existed = this._jobs.has(jobId);
    const deleted = existed;
    
    if (existed) {
      this._jobs.delete(jobId);
    }
    
    this._recordHistory(`deleteJob(id=${jobId}, deleted=${deleted})`);
    return { jobId, deleted, existed };
  }

  public toPacket(): DataPacket<{
    events: StreamEvent[];
    jobs: Map<string, StreamJob>;
    topics: Map<string, KafkaTopic>;
    stateStores: Map<string, StateStore>;
    topologies: Map<string, StreamTopology>;
    counts: { events: number; jobs: number; topics: number; stateStores: number };
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['big_data', 'StreamProcessing'],
      priority: 1,
      phase: 'stream_processing',
    };
    return {
      id: `stream-processing-${Date.now().toString(36)}-${this._counter}`,
      payload: {
        events: this._events,
        jobs: this._jobs,
        topics: this._topics,
        stateStores: this._stateStores,
        topologies: this._topologies,
        counts: {
          events: this._events.length,
          jobs: this._jobs.size,
          topics: this._topics.size,
          stateStores: this._stateStores.size,
        },
      },
      metadata,
    };
  }

  public reset(): void {
    this._events = [];
    this._jobs = new Map();
    this._topics = new Map();
    this._stateStores = new Map();
    this._topologies = new Map();
    this._counter = 0;
    this._history = [];
  }
}