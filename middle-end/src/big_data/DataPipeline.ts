import { DataPacket, PacketMeta } from '../shared/types';

export interface Pipeline {
  stages: string[];
  source: string;
  sink: string;
  status: string;
  metrics: Record<string, number>;
  id: string;
  createdAt: number;
  lastRunAt: number;
  runCount: number;
  lastDuration: number;
  schedule?: string;
  dependencies: string[];
}

export interface PipelineStage {
  name: string;
  input: unknown;
  output: unknown;
  metrics: Record<string, number>;
  status: string;
  duration: number;
  error?: string;
  retries: number;
}

export interface DataQualityRule {
  name: string;
  field: string;
  type: 'not_null' | 'unique' | 'range' | 'format' | 'regex' | 'reference';
  threshold?: number;
  min?: number;
  max?: number;
  regex?: string;
  referenceTable?: string;
  referenceField?: string;
}

export interface DataQualityResult {
  passed: boolean;
  issues: { field: string; rule: string; count: number; message: string }[];
  score: number;
  totalRules: number;
  passedRules: number;
}

export interface PipelineMetrics {
  recordsRead: number;
  recordsWritten: number;
  recordsDropped: number;
  recordsUpdated: number;
  duration: number;
  throughput: number;
  errorRate: number;
  retries: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface SchedulingConfig {
  cron: string;
  timezone: string;
  concurrency: number;
  maxRetries: number;
  retryDelay: number;
  backoffStrategy: 'fixed' | 'exponential' | 'linear';
}

export interface ErrorHandlingConfig {
  strategy: 'abort' | 'retry' | 'skip' | 'dead-letter';
  maxRetries: number;
  retryDelay: number;
  deadLetterQueue: string;
  alertThreshold: number;
}

export interface PipelineEvent {
  eventId: string;
  pipelineId: string;
  eventType: 'start' | 'success' | 'failure' | 'retry' | 'timeout';
  timestamp: number;
  metadata: Record<string, unknown>;
}

export class DataPipeline {
  private _pipelines: Map<string, Pipeline> = new Map();
  private _stages: Map<string, PipelineStage[]> = new Map();
  private _events: PipelineEvent[] = [];
  private _metrics: Map<string, PipelineMetrics[]> = new Map();
  private _counter = 0;

  get pipelineCount(): number { return this._pipelines.size; }
  get stageCount(): number { 
    let count = 0;
    for (const stages of this._stages.values()) count += stages.length;
    return count;
  }
  get eventCount(): number { return this._events.length; }

  private _recordHistory(entry: string): void {
    this._events.push({
      eventId: `evt-${Date.now().toString(36)}-${this._counter++}`,
      pipelineId: 'system',
      eventType: 'info',
      timestamp: Date.now(),
      metadata: { message: entry },
    });
  }

  extract(source: string, options?: { batchSize?: number; format?: string }): Record<string, unknown>[] {
    const batchSize = options?.batchSize || 1000;
    const result = [];
    for (let i = 0; i < batchSize; i++) {
      result.push({ 
        source, 
        data: `raw_data_${i}`, 
        extractedAt: Date.now(), 
        recordId: i,
        sourceFormat: options?.format || 'json',
      });
    }
    this._recordHistory(`extract(source=${source}, batchSize=${batchSize}) -> ${result.length} records`);
    return result;
  }

  transform(data: Record<string, unknown>[], operations: string[]): Record<string, unknown>[] {
    let result = [...data];
    for (const op of operations) {
      if (op === 'filter_null') {
        result = result.filter(row => {
          for (const val of Object.values(row)) {
            if (val === null || val === undefined) return false;
          }
          return true;
        });
      } else if (op === 'uppercase') {
        result = result.map(row => {
          const newRow: Record<string, unknown> = { ...row };
          for (const [key, val] of Object.entries(newRow)) {
            if (typeof val === 'string') {
              newRow[key] = val.toUpperCase();
            }
          }
          return newRow;
        });
      } else if (op === 'normalize') {
        result = result.map(row => {
          const newRow: Record<string, unknown> = { ...row };
          for (const [key, val] of Object.entries(newRow)) {
            if (typeof val === 'string') {
              newRow[key] = val.trim().toLowerCase();
            }
          }
          return newRow;
        });
      } else if (op === 'cast_types') {
        result = result.map(row => {
          const newRow: Record<string, unknown> = { ...row };
          if (newRow['id'] !== undefined) newRow['id'] = Number(newRow['id']);
          if (newRow['value'] !== undefined) newRow['value'] = Number(newRow['value']);
          if (newRow['timestamp'] !== undefined) newRow['timestamp'] = Number(newRow['timestamp']);
          return newRow;
        });
      } else if (op === 'add_metadata') {
        result = result.map(row => ({
          ...row,
          transformed_at: Date.now(),
          transform_version: 1,
        }));
      } else {
        result = result.map(row => ({ ...row, [`transformed_${op}`]: true }));
      }
    }
    this._recordHistory(`transform(operations=${operations.length}) -> ${result.length} records`);
    return result;
  }

  load(data: Record<string, unknown>[], sink: string, options?: { batchSize?: number; format?: string }): { success: boolean; recordsLoaded: number; sink: string } {
    const batchSize = options?.batchSize || 1000;
    const batches = Math.ceil(data.length / batchSize);
    this._recordHistory(`load(sink=${sink}, batches=${batches}, total=${data.length})`);
    return { success: true, recordsLoaded: data.length, sink };
  }

  etl(source: string, transform: string[], sink: string): Pipeline {
    const pipelineId = `pipeline-${++this._counter}`;
    const startTime = Date.now();
    
    const extracted = this.extract(source);
    const transformed = this.transform(extracted, transform);
    const loadResult = this.load(transformed, sink);
    
    const duration = Date.now() - startTime;
    
    const pipeline: Pipeline = {
      stages: ['extract', 'transform', 'load'],
      source,
      sink,
      status: 'completed',
      metrics: { 
        records: extracted.length, 
        transformations: transform.length,
        duration,
        throughput: extracted.length / (duration / 1000),
      },
      id: pipelineId,
      createdAt: Date.now(),
      lastRunAt: Date.now(),
      runCount: 1,
      lastDuration: duration,
      dependencies: [],
    };
    
    this._pipelines.set(pipelineId, pipeline);
    
    const stages: PipelineStage[] = [
      { name: 'extract', input: source, output: extracted.length, metrics: { records: extracted.length }, status: 'completed', duration: duration * 0.3, retries: 0 },
      { name: 'transform', input: extracted.length, output: transformed.length, metrics: { records: transformed.length, operations: transform.length }, status: 'completed', duration: duration * 0.5, retries: 0 },
      { name: 'load', input: transformed.length, output: loadResult.recordsLoaded, metrics: { records: loadResult.recordsLoaded }, status: 'completed', duration: duration * 0.2, retries: 0 },
    ];
    this._stages.set(pipelineId, stages);
    
    this._recordHistory(`etl(source=${source}, sink=${sink}, duration=${duration}ms)`);
    return pipeline;
  }

  elt(source: string, load: string, transform: string[]): Pipeline {
    const pipelineId = `pipeline-${++this._counter}`;
    const startTime = Date.now();
    
    const extracted = this.extract(source);
    const loadResult = this.load(extracted, load);
    const transformed = this.transform(extracted, transform);
    
    const duration = Date.now() - startTime;
    
    const pipeline: Pipeline = {
      stages: ['extract', 'load', 'transform'],
      source,
      sink: load,
      status: 'completed',
      metrics: { 
        records: extracted.length, 
        transformations: transform.length,
        duration,
      },
      id: pipelineId,
      createdAt: Date.now(),
      lastRunAt: Date.now(),
      runCount: 1,
      lastDuration: duration,
      dependencies: [],
    };
    
    this._pipelines.set(pipelineId, pipeline);
    this._recordHistory(`elt(source=${source}, load=${load}, duration=${duration}ms)`);
    return pipeline;
  }

  dataQualityCheck(data: Record<string, unknown>[], rules: DataQualityRule[]): DataQualityResult {
    const issues: { field: string; rule: string; count: number; message: string }[] = [];
    let passedRules = 0;
    
    for (const rule of rules) {
      let violations = 0;
      for (const row of data) {
        const value = row[rule.field];
        
        if (rule.type === 'not_null' && (value === null || value === undefined)) {
          violations++;
        } else if (rule.type === 'unique') {
        } else if (rule.type === 'range' && typeof value === 'number') {
          if ((rule.min !== undefined && value < rule.min) || (rule.max !== undefined && value > rule.max)) {
            violations++;
          }
        } else if (rule.type === 'format' && typeof value === 'string') {
          if (rule.regex && !new RegExp(rule.regex).test(value)) {
            violations++;
          }
        }
      }
      
      if (violations === 0) {
        passedRules++;
      } else {
        issues.push({
          field: rule.field,
          rule: rule.name,
          count: violations,
          message: `${rule.name}: ${violations} violations found in ${rule.field}`,
        });
      }
    }
    
    const score = rules.length > 0 ? (passedRules / rules.length) * 100 : 100;
    
    this._recordHistory(`dataQualityCheck(rules=${rules.length}, score=${score.toFixed(1)})`);
    return { passed: issues.length === 0, issues, score, totalRules: rules.length, passedRules };
  }

  schemaValidation(data: Record<string, unknown>[], schema: Record<string, string>): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (data.length === 0) return { valid: true, errors, warnings };
    
    const columns = Object.keys(data[0]);
    const schemaKeys = Object.keys(schema);
    
    for (const [field, type] of Object.entries(schema)) {
      if (!columns.includes(field)) {
        errors.push(`Missing column: ${field}`);
      } else {
        for (const row of data) {
          const value = row[field];
          if (value !== null && value !== undefined) {
            if (type === 'number' && typeof value !== 'number') {
              warnings.push(`Type mismatch in ${field}: expected number, got ${typeof value}`);
            } else if (type === 'string' && typeof value !== 'string') {
              warnings.push(`Type mismatch in ${field}: expected string, got ${typeof value}`);
            } else if (type === 'boolean' && typeof value !== 'boolean') {
              warnings.push(`Type mismatch in ${field}: expected boolean, got ${typeof value}`);
            }
          }
        }
      }
    }
    
    for (const col of columns) {
      if (!schemaKeys.includes(col)) {
        warnings.push(`Extra column not in schema: ${col}`);
      }
    }
    
    this._recordHistory(`schemaValidation(columns=${columns.length}, errors=${errors.length}, warnings=${warnings.length})`);
    return { valid: errors.length === 0, errors, warnings };
  }

  dataLineage(tables: string[], jobs: string[]): { sources: string[]; targets: string[]; transformations: string[]; edges: { source: string; target: string; job: string }[]; depth: number } {
    const sources = tables.slice(0, Math.ceil(tables.length / 2));
    const targets = tables.slice(Math.ceil(tables.length / 2));
    const edges: { source: string; target: string; job: string }[] = [];
    
    for (let i = 0; i < Math.min(sources.length, targets.length); i++) {
      for (const job of jobs) {
        edges.push({ source: sources[i], target: targets[i], job });
      }
    }
    
    this._recordHistory(`dataLineage(sources=${sources.length}, targets=${targets.length})`);
    return { sources, targets, transformations: jobs, edges, depth: jobs.length };
  }

  orchestrate(jobs: string[], dependencies: Record<string, string[]>, concurrency: number = 4): { order: string[]; status: string; concurrency: number; stages: string[][] } {
    const order: string[] = [];
    const visited = new Set<string>();
    const inProgress = new Set<string>();
    const stages: string[][] = [];
    
    const visit = (job: string) => {
      if (visited.has(job)) return;
      if (inProgress.has(job)) {
        throw new Error(`Cycle detected in job dependencies: ${job}`);
      }
      
      inProgress.add(job);
      const deps = dependencies[job] || [];
      for (const d of deps) visit(d);
      inProgress.delete(job);
      
      visited.add(job);
      order.push(job);
    };
    
    for (const job of jobs) visit(job);
    
    for (let i = 0; i < order.length; i += concurrency) {
      stages.push(order.slice(i, i + concurrency));
    }
    
    this._recordHistory(`orchestrate(jobs=${jobs.length}, concurrency=${concurrency}) -> ${stages.length} stages`);
    return { order, status: 'scheduled', concurrency, stages };
  }

  scheduling(pipeline: string, config: SchedulingConfig): { pipeline: string; cron: string; nextRun: number; timezone: string; config: SchedulingConfig } {
    const nextRun = Date.now() + 3600000;
    
    this._recordHistory(`scheduling(pipeline=${pipeline}, cron=${config.cron})`);
    return { pipeline, cron: config.cron, nextRun, timezone: config.timezone, config };
  }

  monitoring(pipeline: string, metrics: string[]): PipelineMetrics {
    const result: PipelineMetrics = {
      recordsRead: Math.floor(Math.random() * 1000000),
      recordsWritten: Math.floor(Math.random() * 1000000),
      recordsDropped: Math.floor(Math.random() * 10000),
      recordsUpdated: Math.floor(Math.random() * 100000),
      duration: Math.floor(Math.random() * 300000),
      throughput: Math.floor(Math.random() * 10000),
      errorRate: Math.random() * 0.01,
      retries: Math.floor(Math.random() * 5),
      memoryUsage: Math.random() * 8,
      cpuUsage: Math.random() * 100,
    };
    
    const history = this._metrics.get(pipeline) || [];
    this._metrics.set(pipeline, [...history, result]);
    
    this._recordHistory(`monitoring(pipeline=${pipeline}, records=${result.recordsRead})`);
    return result;
  }

  errorHandling(pipeline: string, config: ErrorHandlingConfig): { pipeline: string; strategy: string; retries: number; retryDelay: number; deadLetterQueue: string } {
    this._recordHistory(`errorHandling(pipeline=${pipeline}, strategy=${config.strategy})`);
    return { 
      pipeline, 
      strategy: config.strategy, 
      retries: config.maxRetries, 
      retryDelay: config.retryDelay, 
      deadLetterQueue: config.deadLetterQueue 
    };
  }

  retryPolicy(job: string, policy: { retries: number; delay: number; backoff: string }): { job: string; retries: number; delay: number; backoff: string; delays: number[] } {
    const delays: number[] = [];
    let currentDelay = policy.delay;
    
    for (let i = 0; i < policy.retries; i++) {
      delays.push(currentDelay);
      if (policy.backoff === 'exponential') {
        currentDelay *= 2;
      } else if (policy.backoff === 'linear') {
        currentDelay += policy.delay;
      }
    }
    
    this._recordHistory(`retryPolicy(job=${job}, retries=${policy.retries}, backoff=${policy.backoff})`);
    return { job, retries: policy.retries, delay: policy.delay, backoff: policy.backoff, delays };
  }

  backfill(startDate: number, endDate: number, pipeline: string): { startDate: number; endDate: number; pipeline: string; status: string; partitions: number; batches: number; progress: number } {
    const partitions = Math.ceil((endDate - startDate) / 86400000);
    const batches = partitions * 24;
    const progress = Math.floor(Math.random() * 50);
    
    this._recordHistory(`backfill(pipeline=${pipeline}, days=${partitions}) -> ${progress}%`);
    return { startDate, endDate, pipeline, status: 'backfilling', partitions, batches, progress };
  }

  incrementalLoad(source: string, since: number, checkpoint?: string): { recordsLoaded: number; checkpoint: string; timestamp: number; source: string } {
    const recordsLoaded = Math.floor(Math.random() * 100000);
    const newCheckpoint = checkpoint || `checkpoint-${Date.now()}`;
    
    this._recordHistory(`incrementalLoad(source=${source}, records=${recordsLoaded})`);
    return { recordsLoaded, checkpoint: newCheckpoint, timestamp: Date.now(), source };
  }

  streamingIngest(source: string, batchSize: number = 1000): { batchId: string; records: number; source: string; timestamp: number } {
    const batchId = `stream-batch-${Date.now().toString(36)}-${this._counter++}`;
    
    this._recordHistory(`streamingIngest(source=${source}, batch=${batchId}, records=${batchSize})`);
    return { batchId, records: batchSize, source, timestamp: Date.now() };
  }

  dataDeduplication(data: Record<string, unknown>[], keys: string[]): { deduplicated: Record<string, unknown>[]; duplicatesRemoved: number; totalInput: number } {
    const seen = new Set<string>();
    const deduplicated: Record<string, unknown>[] = [];
    
    for (const row of data) {
      const key = keys.map(k => String(row[k])).join('|');
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(row);
      }
    }
    
    const duplicatesRemoved = data.length - deduplicated.length;
    
    this._recordHistory(`dataDeduplication(keys=${keys.length}, removed=${duplicatesRemoved})`);
    return { deduplicated, duplicatesRemoved, totalInput: data.length };
  }

  dataEnrichment(data: Record<string, unknown>[], enrichment: Record<string, (row: Record<string, unknown>) => unknown>): Record<string, unknown>[] {
    const result = data.map(row => {
      const enriched: Record<string, unknown> = { ...row };
      for (const [field, func] of Object.entries(enrichment)) {
        enriched[field] = func(row);
      }
      return enriched;
    });
    
    this._recordHistory(`dataEnrichment(fields=${Object.keys(enrichment).length}, records=${result.length})`);
    return result;
  }

  joinData(left: Record<string, unknown>[], right: Record<string, unknown>[], joinKey: string, joinType: 'inner' | 'left' | 'right' | 'full' = 'inner'): Record<string, unknown>[] {
    const rightMap = new Map<string, Record<string, unknown>[]>();
    for (const row of right) {
      const key = String(row[joinKey]);
      if (!rightMap.has(key)) rightMap.set(key, []);
      rightMap.get(key)!.push(row);
    }
    
    const result: Record<string, unknown>[] = [];
    
    for (const leftRow of left) {
      const key = String(leftRow[joinKey]);
      const matches = rightMap.get(key) || [];
      
      if (matches.length > 0) {
        for (const rightRow of matches) {
          result.push({ ...leftRow, ...rightRow });
        }
      } else if (joinType === 'left' || joinType === 'full') {
        result.push(leftRow);
      }
    }
    
    if (joinType === 'right' || joinType === 'full') {
      for (const [key, rows] of rightMap) {
        const hasMatch = left.some(r => String(r[joinKey]) === key);
        if (!hasMatch) {
          for (const row of rows) {
            result.push(row);
          }
        }
      }
    }
    
    this._recordHistory(`joinData(type=${joinType}, key=${joinKey}, result=${result.length})`);
    return result;
  }

  aggregateData(data: Record<string, unknown>[], groupBy: string[], aggregations: Record<string, (values: unknown[]) => unknown>): Record<string, unknown>[] {
    const groups = new Map<string, Record<string, unknown>[]>();
    
    for (const row of data) {
      const key = groupBy.map(k => String(row[k])).join('|');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }
    
    const result: Record<string, unknown>[] = [];
    
    for (const [key, rows] of groups) {
      const groupResult: Record<string, unknown> = {};
      const keys = key.split('|');
      for (let i = 0; i < groupBy.length; i++) {
        groupResult[groupBy[i]] = keys[i];
      }
      
      for (const [aggName, func] of Object.entries(aggregations)) {
        const values = rows.map(r => r[aggName.replace('_', '')]);
        groupResult[aggName] = func(values);
      }
      
      result.push(groupResult);
    }
    
    this._recordHistory(`aggregateData(groups=${groupBy.length}, aggs=${Object.keys(aggregations).length}, result=${result.length})`);
    return result;
  }

  pipelineStatus(pipelineId: string): Pipeline | null {
    const pipeline = this._pipelines.get(pipelineId) || null;
    if (pipeline) {
      this._recordHistory(`pipelineStatus(id=${pipelineId}, status=${pipeline.status})`);
    }
    return pipeline;
  }

  listPipelines(status?: string): Pipeline[] {
    const pipelines = Array.from(this._pipelines.values());
    const filtered = status ? pipelines.filter(p => p.status === status) : pipelines;
    
    this._recordHistory(`listPipelines(status=${status || 'all'}, count=${filtered.length})`);
    return filtered;
  }

  runPipeline(pipelineId: string): { pipelineId: string; status: string; startedAt: number; duration: number; metrics: PipelineMetrics } {
    const pipeline = this._pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline not found: ${pipelineId}`);
    }
    
    const startedAt = Date.now();
    const duration = Math.floor(Math.random() * 300000);
    
    const metrics: PipelineMetrics = {
      recordsRead: Math.floor(Math.random() * 1000000),
      recordsWritten: Math.floor(Math.random() * 1000000),
      recordsDropped: Math.floor(Math.random() * 10000),
      recordsUpdated: Math.floor(Math.random() * 100000),
      duration,
      throughput: Math.floor(Math.random() * 10000),
      errorRate: Math.random() * 0.005,
      retries: Math.floor(Math.random() * 3),
      memoryUsage: Math.random() * 4,
      cpuUsage: Math.random() * 80,
    };
    
    this._pipelines.set(pipelineId, {
      ...pipeline,
      status: 'completed',
      lastRunAt: startedAt,
      runCount: pipeline.runCount + 1,
      lastDuration: duration,
    });
    
    const history = this._metrics.get(pipelineId) || [];
    this._metrics.set(pipelineId, [...history, metrics]);
    
    this._recordHistory(`runPipeline(id=${pipelineId}, duration=${duration}ms)`);
    return { pipelineId, status: 'completed', startedAt, duration, metrics };
  }

  stopPipeline(pipelineId: string): { pipelineId: string; stopped: boolean; lastStatus: string } {
    const pipeline = this._pipelines.get(pipelineId);
    const stopped = !!pipeline;
    const lastStatus = pipeline?.status || 'unknown';
    
    if (stopped && pipeline) {
      this._pipelines.set(pipelineId, { ...pipeline, status: 'stopped' });
    }
    
    this._recordHistory(`stopPipeline(id=${pipelineId}, stopped=${stopped})`);
    return { pipelineId, stopped, lastStatus };
  }

  deletePipeline(pipelineId: string): { pipelineId: string; deleted: boolean; existed: boolean } {
    const existed = this._pipelines.has(pipelineId);
    const deleted = existed;
    
    if (existed) {
      this._pipelines.delete(pipelineId);
      this._stages.delete(pipelineId);
      this._metrics.delete(pipelineId);
    }
    
    this._recordHistory(`deletePipeline(id=${pipelineId}, deleted=${deleted})`);
    return { pipelineId, deleted, existed };
  }

  createPipeline(config: { name: string; source: string; sink: string; stages: string[]; schedule?: string }): Pipeline {
    const pipelineId = `pipeline-${++this._counter}`;
    
    const pipeline: Pipeline = {
      id: pipelineId,
      stages: config.stages,
      source: config.source,
      sink: config.sink,
      status: 'created',
      metrics: {},
      createdAt: Date.now(),
      lastRunAt: 0,
      runCount: 0,
      lastDuration: 0,
      schedule: config.schedule,
      dependencies: [],
    };
    
    this._pipelines.set(pipelineId, pipeline);
    this._recordHistory(`createPipeline(id=${pipelineId}, name=${config.name})`);
    return pipeline;
  }

  updatePipeline(pipelineId: string, updates: Partial<Pipeline>): { pipelineId: string; updated: boolean; pipeline: Pipeline | null } {
    const pipeline = this._pipelines.get(pipelineId);
    const updated = !!pipeline;
    
    if (updated && pipeline) {
      const updatedPipeline = { ...pipeline, ...updates };
      this._pipelines.set(pipelineId, updatedPipeline);
      this._recordHistory(`updatePipeline(id=${pipelineId})`);
      return { pipelineId, updated, pipeline: updatedPipeline };
    }
    
    this._recordHistory(`updatePipeline(id=${pipelineId}, updated=false)`);
    return { pipelineId, updated: false, pipeline: null };
  }

  getPipelineMetrics(pipelineId: string, window?: { start: number; end: number }): PipelineMetrics[] {
    const metrics = this._metrics.get(pipelineId) || [];
    
    if (window) {
      const filtered = metrics.filter(m => m.duration >= window.start && m.duration <= window.end);
      this._recordHistory(`getPipelineMetrics(id=${pipelineId}, window=${filtered.length})`);
      return filtered;
    }
    
    this._recordHistory(`getPipelineMetrics(id=${pipelineId}, total=${metrics.length})`);
    return metrics;
  }

  getPipelineStages(pipelineId: string): PipelineStage[] {
    const stages = this._stages.get(pipelineId) || [];
    this._recordHistory(`getPipelineStages(id=${pipelineId}, stages=${stages.length})`);
    return stages;
  }

  getPipelineEvents(pipelineId: string, limit: number = 100): PipelineEvent[] {
    const events = this._events.filter(e => e.pipelineId === pipelineId || e.pipelineId === 'system');
    const limited = events.slice(-limit);
    this._recordHistory(`getPipelineEvents(id=${pipelineId}, events=${limited.length})`);
    return limited;
  }

  pipelineSummary(): {
    total: number;
    byStatus: Record<string, number>;
    healthy: number;
    failing: number;
    avgDuration: number;
    avgRunCount: number;
  } {
    const byStatus: Record<string, number> = {};
    let healthy = 0;
    let failing = 0;
    let totalDuration = 0;
    let totalRuns = 0;
    for (const p of this._pipelines.values()) {
      byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
      if (p.status === 'running' || p.status === 'completed') healthy++;
      if (p.status === 'failed' || p.status === 'error') failing++;
      totalDuration += p.lastDuration;
      totalRuns += p.runCount;
    }
    const count = this._pipelines.size;
    return {
      total: count,
      byStatus,
      healthy,
      failing,
      avgDuration: count > 0 ? Math.round(totalDuration / count) : 0,
      avgRunCount: count > 0 ? Math.round(totalRuns / count) : 0,
    };
  }

  eventStatistics(): { total: number; byType: Record<string, number>; recentCount: number } {
    const byType: Record<string, number> = {};
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    let recentCount = 0;
    for (const e of this._events) {
      byType[e.eventType] = (byType[e.eventType] ?? 0) + 1;
      if (e.timestamp >= cutoff) recentCount++;
    }
    return { total: this._events.length, byType, recentCount };
  }

  exportPipelineConfig(pipelineId: string, format: 'json' | 'yaml' | 'csv'): string | null {
    const pipeline = this._pipelines.get(pipelineId);
    if (!pipeline) return null;
    const stages = this._stages.get(pipelineId) ?? [];
    if (format === 'yaml') {
      const lines: string[] = [];
      lines.push(`pipeline:`);
      lines.push(`  id: ${pipeline.id}`);
      lines.push(`  source: ${pipeline.source}`);
      lines.push(`  sink: ${pipeline.sink}`);
      lines.push(`  status: ${pipeline.status}`);
      lines.push(`  schedule: ${pipeline.schedule ?? 'manual'}`);
      lines.push(`  stages:`);
      for (const s of stages) {
        lines.push(`    - name: ${s.name}`);
        lines.push(`      status: ${s.status}`);
        lines.push(`      duration: ${s.duration}`);
      }
      return lines.join('\n');
    }
    if (format === 'csv') {
      const header = 'stageName,status,duration,retries';
      const rows = stages.map(s => `${s.name},${s.status},${s.duration},${s.retries}`);
      return [header, ...rows].join('\n');
    }
    return JSON.stringify({ pipeline, stages }, null, 2);
  }

  searchPipelines(query: { source?: string; sink?: string; status?: string }): Pipeline[] {
    return Array.from(this._pipelines.values()).filter(p => {
      if (query.source && !p.source.includes(query.source)) return false;
      if (query.sink && !p.sink.includes(query.sink)) return false;
      if (query.status && p.status !== query.status) return false;
      return true;
    });
  }

  batchRunPipelines(pipelineIds: string[]): { triggered: number; failed: number; results: { id: string; status: string }[] } {
    const results: { id: string; status: string }[] = [];
    let triggered = 0;
    let failed = 0;
    pipelineIds.forEach(id => {
      const p = this._pipelines.get(id);
      if (p) {
        this._pipelines.set(id, { ...p, status: 'running', lastRunAt: Date.now(), runCount: p.runCount + 1 });
        triggered++;
        results.push({ id, status: 'triggered' });
      } else {
        failed++;
        results.push({ id, status: 'not_found' });
      }
    });
    this._recordHistory(`batchRunPipelines(${pipelineIds.length}) -> ${triggered}/${failed}`);
    return { triggered, failed, results };
  }

  healthCheck(): { healthy: boolean; pipelinesDown: string[]; pipelinesDegraded: string[]; recentFailures: number } {
    const down: string[] = [];
    const degraded: string[] = [];
    let recentFailures = 0;
    const cutoff = Date.now() - 60 * 60 * 1000;
    for (const [id, p] of this._pipelines.entries()) {
      if (p.status === 'failed' || p.status === 'error') down.push(id);
      else if (p.status === 'paused' || p.status === 'idle') degraded.push(id);
    }
    for (const e of this._events) {
      if (e.timestamp >= cutoff && (e.eventType === 'failure' || e.eventType === 'timeout')) recentFailures++;
    }
    return { healthy: down.length === 0, pipelinesDown: down, pipelinesDegraded: degraded, recentFailures };
  }

  aggregateMetrics(pipelineId: string): { avgThroughput: number; maxDuration: number; totalRecordsRead: number; totalRecordsWritten: number; avgErrorRate: number } | null {
    const metrics = this._metrics.get(pipelineId);
    if (!metrics || metrics.length === 0) return null;
    const avgThroughput = metrics.reduce((s, m) => s + m.throughput, 0) / metrics.length;
    const maxDuration = Math.max(...metrics.map(m => m.duration));
    const totalRecordsRead = metrics.reduce((s, m) => s + m.recordsRead, 0);
    const totalRecordsWritten = metrics.reduce((s, m) => s + m.recordsWritten, 0);
    const avgErrorRate = metrics.reduce((s, m) => s + m.errorRate, 0) / metrics.length;
    return {
      avgThroughput: Math.round(avgThroughput),
      maxDuration,
      totalRecordsRead,
      totalRecordsWritten,
      avgErrorRate,
    };
  }

  cleanupOldEvents(maxAgeDays: number = 30): number {
    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
    const before = this._events.length;
    this._events = this._events.filter(e => e.timestamp >= cutoff);
    const removed = before - this._events.length;
    this._recordHistory(`cleanupOldEvents(${maxAgeDays} days) -> ${removed} removed`);
    return removed;
  }

  toPacket(): DataPacket<{
    pipelines: Map<string, Pipeline>;
    stages: Map<string, PipelineStage[]>;
    events: PipelineEvent[];
    metrics: Map<string, PipelineMetrics[]>;
    pipelineCount: number;
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['big_data', 'DataPipeline'],
      priority: 1,
      phase: 'data_pipeline',
    };
    return {
      id: `data-pipeline-${Date.now().toString(36)}-${this._counter}`,
      payload: {
        pipelines: this._pipelines,
        stages: this._stages,
        events: this._events,
        metrics: this._metrics,
        pipelineCount: this._pipelines.size,
      },
      metadata,
    };
  }

  reset(): void {
    this._pipelines = new Map();
    this._stages = new Map();
    this._events = [];
    this._metrics = new Map();
    this._counter = 0;
  }
}