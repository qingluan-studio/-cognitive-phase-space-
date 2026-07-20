import { DataPacket } from '../shared/types';

export interface DataSource {
  id: string;
  name: string;
  type: 'sensor' | 'database' | 'api' | 'file' | 'stream' | 'message-queue' | 'cloud-storage' | 'iot-hub';
  protocol: 'http' | 'https' | 'mqtt' | 'coap' | 'websocket' | 'grpc' | 'jdbc' | 'odbc' | 's3' | 'kafka';
  endpoint: string;
  port: number;
  authType: 'none' | 'basic' | 'bearer' | 'oauth2' | 'api-key' | 'certificate';
  credentials: Record<string, string>;
  connectionTimeout: number;
  retryPolicy: { maxRetries: number; backoffMultiplier: number; initialDelay: number };
  metadata: Record<string, unknown>;
  healthCheckInterval: number;
  isActive: boolean;
}

export interface IntegrationPipeline {
  id: string;
  name: string;
  sources: string[];
  transformations: DataTransformation[];
  destinations: string[];
  schedule: 'real-time' | 'batch' | 'cron' | 'event-driven' | 'manual';
  cronExpression?: string;
  batchSize: number;
  parallelization: number;
  errorHandling: 'stop' | 'skip' | 'retry' | 'dead-letter';
  maxConcurrency: number;
  metadata: Record<string, unknown>;
}

export interface DataTransformation {
  id: string;
  type: 'filter' | 'map' | 'aggregate' | 'enrich' | 'validate' | 'normalize' | 'join' | 'split' | 'deduplicate' | 'anonymize';
  config: Record<string, unknown>;
  order: number;
  condition?: string;
  description: string;
  enabled: boolean;
}

export interface DataIntegrationResult {
  pipelineId: string;
  recordsProcessed: number;
  recordsFailed: number;
  recordsFiltered: number;
  bytesTransferred: number;
  duration: number;
  startTime: number;
  endTime: number;
  errors: string[];
  warnings: string[];
  sourceMetrics: Map<string, { records: number; latency: number }>;
  transformationMetrics: Map<string, { input: number; output: number; duration: number }>;
}

export interface DataSchema {
  id: string;
  name: string;
  fields: DataField[];
  version: string;
  compatibility: 'backward' | 'forward' | 'full' | 'none';
  namespace: string;
  description: string;
}

export interface DataField {
  name: string;
  type: 'string' | 'integer' | 'float' | 'boolean' | 'timestamp' | 'array' | 'object' | 'binary' | 'uuid';
  nullable: boolean;
  defaultValue?: unknown;
  description: string;
  constraints?: { min?: number; max?: number; pattern?: string; enum?: unknown[] };
}

export interface DataQualityRule {
  id: string;
  name: string;
  field: string;
  check: 'not-null' | 'range' | 'pattern' | 'uniqueness' | 'consistency' | 'timeliness' | 'completeness' | 'accuracy';
  parameters: Record<string, unknown>;
  severity: 'error' | 'warning' | 'info';
  enabled: boolean;
}

export interface ConnectionPool {
  id: string;
  sourceId: string;
  maxConnections: number;
  minConnections: number;
  idleTimeout: number;
  activeConnections: number;
  waitingRequests: number;
}

export class DataIntegration {
  private _sources: Map<string, DataSource> = new Map();
  private _pipelines: Map<string, IntegrationPipeline> = new Map();
  private _transformations: Map<string, DataTransformation> = new Map();
  private _schemas: Map<string, DataSchema> = new Map();
  private _qualityRules: Map<string, DataQualityRule> = new Map();
  private _connectionPools: Map<string, ConnectionPool> = new Map();
  private _lastResult: DataIntegrationResult | null = null;
  private _counter: number = 0;
  private _pipelineHistory: DataIntegrationResult[] = [];
  private _maxHistorySize: number = 100;
  private _defaultBatchSize: number = 1000;
  private _defaultParallelization: number = 4;
  private _globalMetrics: Map<string, number> = new Map();
  private _circuitBreakers: Map<string, { failures: number; lastFailure: number; state: 'closed' | 'open' | 'half-open' }> = new Map();
  private _circuitBreakerThreshold: number = 5;
  private _circuitBreakerTimeout: number = 30000;
  private _dataCache: Map<string, { data: unknown; timestamp: number; ttl: number }> = new Map();
  private _schemaRegistry: Map<string, DataSchema[]> = new Map();
  private _encryptionEnabled: boolean = false;
  private _compressionEnabled: boolean = true;
  private _auditLog: { timestamp: number; action: string; sourceId: string; details: string }[] = [];

  constructor() {
    this._initDefaultSchemas();
    this._initDefaultQualityRules();
  }

  private _initDefaultSchemas(): void {
    this._schemas.set('sensor-data-v1', {
      id: 'sensor-data-v1',
      name: 'SensorData',
      fields: [
        { name: 'sensorId', type: 'uuid', nullable: false, description: 'Unique sensor identifier' },
        { name: 'timestamp', type: 'timestamp', nullable: false, description: 'Measurement timestamp' },
        { name: 'value', type: 'float', nullable: false, description: 'Sensor reading value' },
        { name: 'unit', type: 'string', nullable: false, description: 'Measurement unit' },
        { name: 'quality', type: 'integer', nullable: true, defaultValue: 100, description: 'Data quality score', constraints: { min: 0, max: 100 } },
        { name: 'location', type: 'object', nullable: true, description: 'Geographic location' },
        { name: 'metadata', type: 'object', nullable: true, description: 'Additional metadata' }
      ],
      version: '1.0.0',
      compatibility: 'backward',
      namespace: 'digital-twin.sensor',
      description: 'Standard sensor data schema'
    });

    this._schemas.set('telemetry-v1', {
      id: 'telemetry-v1',
      name: 'Telemetry',
      fields: [
        { name: 'deviceId', type: 'uuid', nullable: false, description: 'Device identifier' },
        { name: 'eventTime', type: 'timestamp', nullable: false, description: 'Event timestamp' },
        { name: 'eventType', type: 'string', nullable: false, description: 'Type of telemetry event' },
        { name: 'payload', type: 'object', nullable: false, description: 'Event payload' },
        { name: 'severity', type: 'string', nullable: true, defaultValue: 'info', description: 'Event severity level' }
      ],
      version: '1.0.0',
      compatibility: 'full',
      namespace: 'digital-twin.telemetry',
      description: 'Device telemetry event schema'
    });
  }

  private _initDefaultQualityRules(): void {
    this._qualityRules.set('sensor-timestamp-range', {
      id: 'sensor-timestamp-range',
      name: 'Sensor Timestamp Range',
      field: 'timestamp',
      check: 'range',
      parameters: { min: 0, max: 4102444800000 },
      severity: 'error',
      enabled: true
    });

    this._qualityRules.set('sensor-value-not-null', {
      id: 'sensor-value-not-null',
      name: 'Sensor Value Not Null',
      field: 'value',
      check: 'not-null',
      parameters: {},
      severity: 'error',
      enabled: true
    });

    this._qualityRules.set('sensor-id-uuid', {
      id: 'sensor-id-uuid',
      name: 'Sensor ID UUID Format',
      field: 'sensorId',
      check: 'pattern',
      parameters: { pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' },
      severity: 'warning',
      enabled: true
    });
  }

  get sources(): Map<string, DataSource> {
    return new Map(this._sources);
  }

  get pipelines(): Map<string, IntegrationPipeline> {
    return new Map(this._pipelines);
  }

  get transformations(): Map<string, DataTransformation> {
    return new Map(this._transformations);
  }

  get schemas(): Map<string, DataSchema> {
    return new Map(this._schemas);
  }

  get qualityRules(): Map<string, DataQualityRule> {
    return new Map(this._qualityRules);
  }

  get lastResult(): DataIntegrationResult | null {
    return this._lastResult;
  }

  get pipelineHistory(): DataIntegrationResult[] {
    return [...this._pipelineHistory];
  }

  get globalMetrics(): Map<string, number> {
    return new Map(this._globalMetrics);
  }

  get defaultBatchSize(): number {
    return this._defaultBatchSize;
  }

  get defaultParallelization(): number {
    return this._defaultParallelization;
  }

  get encryptionEnabled(): boolean {
    return this._encryptionEnabled;
  }

  get compressionEnabled(): boolean {
    return this._compressionEnabled;
  }

  get activeSourceCount(): number {
    return Array.from(this._sources.values()).filter(s => s.isActive).length;
  }

  get totalSources(): number {
    return this._sources.size;
  }

  get totalPipelines(): number {
    return this._pipelines.size;
  }

  setDefaultBatchSize(size: number): void {
    this._defaultBatchSize = size;
  }

  setDefaultParallelization(count: number): void {
    this._defaultParallelization = count;
  }

  setEncryptionEnabled(enabled: boolean): void {
    this._encryptionEnabled = enabled;
  }

  setCompressionEnabled(enabled: boolean): void {
    this._compressionEnabled = enabled;
  }

  addSource(source: DataSource): void {
    this._sources.set(source.id, source);
    this._circuitBreakers.set(source.id, { failures: 0, lastFailure: 0, state: 'closed' });
    this._audit('add-source', source.id, `Added source ${source.name}`);
  }

  removeSource(id: string): boolean {
    const removed = this._sources.delete(id);
    if (removed) {
      this._circuitBreakers.delete(id);
      this._audit('remove-source', id, `Removed source ${id}`);
    }
    return removed;
  }

  updateSource(id: string, updates: Partial<DataSource>): boolean {
    const source = this._sources.get(id);
    if (!source) return false;
    this._sources.set(id, { ...source, ...updates, id });
    this._audit('update-source', id, `Updated source ${id}`);
    return true;
  }

  testConnection(sourceId: string): { success: boolean; latency: number; error?: string } {
    const source = this._sources.get(sourceId);
    if (!source) return { success: false, latency: 0, error: 'Source not found' };

    const startTime = Date.now();
    const circuitBreaker = this._circuitBreakers.get(sourceId);

    if (circuitBreaker && circuitBreaker.state === 'open') {
      if (Date.now() - circuitBreaker.lastFailure < this._circuitBreakerTimeout) {
        return { success: false, latency: 0, error: 'Circuit breaker is open' };
      }
      circuitBreaker.state = 'half-open';
    }

    const latency = Date.now() - startTime;
    const success = Math.random() > 0.1;

    if (!success && circuitBreaker) {
      circuitBreaker.failures++;
      circuitBreaker.lastFailure = Date.now();
      if (circuitBreaker.failures >= this._circuitBreakerThreshold) {
        circuitBreaker.state = 'open';
      }
    } else if (success && circuitBreaker) {
      circuitBreaker.failures = 0;
      circuitBreaker.state = 'closed';
    }

    return { success, latency, error: success ? undefined : 'Connection failed' };
  }

  addPipeline(pipeline: IntegrationPipeline): void {
    this._pipelines.set(pipeline.id, pipeline);
    this._audit('add-pipeline', pipeline.id, `Added pipeline ${pipeline.name}`);
  }

  removePipeline(id: string): boolean {
    const removed = this._pipelines.delete(id);
    if (removed) {
      this._audit('remove-pipeline', id, `Removed pipeline ${id}`);
    }
    return removed;
  }

  updatePipeline(id: string, updates: Partial<IntegrationPipeline>): boolean {
    const pipeline = this._pipelines.get(id);
    if (!pipeline) return false;
    this._pipelines.set(id, { ...pipeline, ...updates, id });
    this._audit('update-pipeline', id, `Updated pipeline ${id}`);
    return true;
  }

  addTransformation(transformation: DataTransformation): void {
    this._transformations.set(transformation.id, transformation);
  }

  removeTransformation(id: string): boolean {
    return this._transformations.delete(id);
  }

  addSchema(schema: DataSchema): void {
    this._schemas.set(schema.id, schema);
    const versions = this._schemaRegistry.get(schema.name) || [];
    versions.push(schema);
    this._schemaRegistry.set(schema.name, versions);
  }

  removeSchema(id: string): boolean {
    const schema = this._schemas.get(id);
    if (schema) {
      const versions = this._schemaRegistry.get(schema.name) || [];
      const filtered = versions.filter(v => v.id !== id);
      this._schemaRegistry.set(schema.name, filtered);
    }
    return this._schemas.delete(id);
  }

  getSchemaVersions(name: string): DataSchema[] {
    return this._schemaRegistry.get(name) || [];
  }

  validateData(data: Record<string, unknown>, schemaId: string): { valid: boolean; errors: string[]; warnings: string[] } {
    const schema = this._schemas.get(schemaId);
    if (!schema) return { valid: false, errors: [`Schema ${schemaId} not found`], warnings: [] };

    const errors: string[] = [];
    const warnings: string[] = [];

    for (const field of schema.fields) {
      const value = data[field.name];

      if (value === undefined || value === null) {
        if (!field.nullable) {
          errors.push(`Field ${field.name} is required`);
        }
        continue;
      }

      if (field.constraints) {
        if (field.constraints.min !== undefined && typeof value === 'number' && value < field.constraints.min) {
          errors.push(`Field ${field.name} value ${value} is below minimum ${field.constraints.min}`);
        }
        if (field.constraints.max !== undefined && typeof value === 'number' && value > field.constraints.max) {
          errors.push(`Field ${field.name} value ${value} exceeds maximum ${field.constraints.max}`);
        }
        if (field.constraints.pattern && typeof value === 'string' && !new RegExp(field.constraints.pattern).test(value)) {
          warnings.push(`Field ${field.name} does not match expected pattern`);
        }
        if (field.constraints.enum && !field.constraints.enum.includes(value)) {
          errors.push(`Field ${field.name} value is not in allowed enum`);
        }
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  applyTransformation(data: Record<string, unknown>[], transformationId: string): Record<string, unknown>[] {
    const transformation = this._transformations.get(transformationId);
    if (!transformation || !transformation.enabled) return data;

    switch (transformation.type) {
      case 'filter':
        return data.filter(record => {
          const field = transformation.config.field as string;
          const value = record[field];
          const condition = transformation.config.condition as string;
          const target = transformation.config.value;
          switch (condition) {
            case 'eq': return value === target;
            case 'gt': return typeof value === 'number' && value > (target as number);
            case 'lt': return typeof value === 'number' && value < (target as number);
            case 'contains': return typeof value === 'string' && value.includes(target as string);
            default: return true;
          }
        });
      case 'map':
        return data.map(record => {
          const mapped = { ...record };
          const mappings = transformation.config.mappings as Record<string, string>;
          for (const [from, to] of Object.entries(mappings)) {
            if (mapped[from] !== undefined) {
              mapped[to] = mapped[from];
              delete mapped[from];
            }
          }
          return mapped;
        });
      case 'normalize':
        return data.map(record => {
          const normalized = { ...record };
          const fields = transformation.config.fields as string[];
          for (const field of fields) {
            const value = normalized[field];
            if (typeof value === 'string') {
              normalized[field] = value.toLowerCase().trim();
            }
          }
          return normalized;
        });
      case 'anonymize':
        return data.map(record => {
          const anonymized = { ...record };
          const fields = transformation.config.fields as string[];
          for (const field of fields) {
            if (anonymized[field] !== undefined) {
              anonymized[field] = '***';
            }
          }
          return anonymized;
        });
      default:
        return data;
    }
  }

  executePipeline(pipelineId: string): DataIntegrationResult {
    const pipeline = this._pipelines.get(pipelineId);
    if (!pipeline) {
      return this._createErrorResult(pipelineId, 'Pipeline not found');
    }

    const startTime = Date.now();
    let recordsProcessed = 0;
    let recordsFailed = 0;
    let recordsFiltered = 0;
    let bytesTransferred = 0;
    const errors: string[] = [];
    const warnings: string[] = [];
    const sourceMetrics = new Map<string, { records: number; latency: number }>();
    const transformationMetrics = new Map<string, { input: number; output: number; duration: number }>();

    for (const sourceId of pipeline.sources) {
      const connectionTest = this.testConnection(sourceId);
      if (!connectionTest.success) {
        errors.push(`Source ${sourceId} connection failed: ${connectionTest.error}`);
        if (pipeline.errorHandling === 'stop') {
          return this._createErrorResult(pipelineId, `Stopped due to source ${sourceId} failure`);
        }
        continue;
      }

      const sourceRecords = Math.floor(Math.random() * 1000) + 100;
      recordsProcessed += sourceRecords;
      bytesTransferred += sourceRecords * 256;
      sourceMetrics.set(sourceId, { records: sourceRecords, latency: connectionTest.latency });
    }

    let currentData: Record<string, unknown>[] = Array(recordsProcessed).fill(null).map(() => ({}));

    const sortedTransformations = pipeline.transformations
      .filter(t => t.enabled)
      .sort((a, b) => a.order - b.order);

    for (const transformation of sortedTransformations) {
      const transformStart = Date.now();
      const inputCount = currentData.length;
      currentData = this.applyTransformation(currentData, transformation.id);
      const outputCount = currentData.length;
      recordsFiltered += inputCount - outputCount;

      transformationMetrics.set(transformation.id, {
        input: inputCount,
        output: outputCount,
        duration: Date.now() - transformStart
      });
    }

    for (const rule of this._qualityRules.values()) {
      if (!rule.enabled) continue;
      for (const record of currentData) {
        const validation = this.validateData(record, 'sensor-data-v1');
        if (!validation.valid) {
          errors.push(...validation.errors);
          warnings.push(...validation.warnings);
        }
      }
    }

    const duration = Date.now() - startTime;

    const result: DataIntegrationResult = {
      pipelineId,
      recordsProcessed,
      recordsFailed,
      recordsFiltered,
      bytesTransferred,
      duration,
      startTime,
      endTime: Date.now(),
      errors,
      warnings,
      sourceMetrics,
      transformationMetrics
    };

    this._lastResult = result;
    this._addToHistory(result);
    this._updateGlobalMetrics(result);
    this._audit('execute-pipeline', pipelineId, `Executed pipeline ${pipelineId}: ${recordsProcessed} records`);
    return result;
  }

  private _createErrorResult(pipelineId: string, error: string): DataIntegrationResult {
    const result: DataIntegrationResult = {
      pipelineId,
      recordsProcessed: 0,
      recordsFailed: 0,
      recordsFiltered: 0,
      bytesTransferred: 0,
      duration: 0,
      startTime: Date.now(),
      endTime: Date.now(),
      errors: [error],
      warnings: [],
      sourceMetrics: new Map(),
      transformationMetrics: new Map()
    };
    this._lastResult = result;
    return result;
  }

  private _addToHistory(result: DataIntegrationResult): void {
    this._pipelineHistory.push(result);
    if (this._pipelineHistory.length > this._maxHistorySize) {
      this._pipelineHistory.shift();
    }
  }

  private _updateGlobalMetrics(result: DataIntegrationResult): void {
    this._globalMetrics.set('totalRecordsProcessed', (this._globalMetrics.get('totalRecordsProcessed') || 0) + result.recordsProcessed);
    this._globalMetrics.set('totalRecordsFailed', (this._globalMetrics.get('totalRecordsFailed') || 0) + result.recordsFailed);
    this._globalMetrics.set('totalBytesTransferred', (this._globalMetrics.get('totalBytesTransferred') || 0) + result.bytesTransferred);
    this._globalMetrics.set('totalPipelinesExecuted', (this._globalMetrics.get('totalPipelinesExecuted') || 0) + 1);
    this._globalMetrics.set('totalDuration', (this._globalMetrics.get('totalDuration') || 0) + result.duration);
  }

  getCache(key: string): unknown | undefined {
    const entry = this._dataCache.get(key);
    if (!entry) return undefined;
    if (Date.now() - entry.timestamp > entry.ttl) {
      this._dataCache.delete(key);
      return undefined;
    }
    return entry.data;
  }

  setCache(key: string, data: unknown, ttl: number = 60000): void {
    this._dataCache.set(key, { data, timestamp: Date.now(), ttl });
  }

  clearCache(): void {
    this._dataCache.clear();
  }

  getPipelineSuccessRate(pipelineId: string): number {
    const history = this._pipelineHistory.filter(h => h.pipelineId === pipelineId);
    if (history.length === 0) return 0;
    const successful = history.filter(h => h.errors.length === 0).length;
    return successful / history.length;
  }

  getAveragePipelineLatency(pipelineId: string): number {
    const history = this._pipelineHistory.filter(h => h.pipelineId === pipelineId);
    if (history.length === 0) return 0;
    return history.reduce((sum, h) => sum + h.duration, 0) / history.length;
  }

  getSourceHealth(sourceId: string): { healthy: boolean; lastCheck: number; failures: number } {
    const source = this._sources.get(sourceId);
    const breaker = this._circuitBreakers.get(sourceId);
    return {
      healthy: source?.isActive && breaker?.state === 'closed',
      lastCheck: breaker?.lastFailure || 0,
      failures: breaker?.failures || 0
    };
  }

  getAuditLog(): { timestamp: number; action: string; sourceId: string; details: string }[] {
    return [...this._auditLog];
  }

  private _audit(action: string, sourceId: string, details: string): void {
    this._auditLog.push({ timestamp: Date.now(), action, sourceId, details });
    if (this._auditLog.length > 10000) {
      this._auditLog.shift();
    }
  }

  schedulePipeline(pipelineId: string, schedule: string): void {
    const pipeline = this._pipelines.get(pipelineId);
    if (!pipeline) return;
    pipeline.schedule = 'cron';
    pipeline.cronExpression = schedule;
    this._audit('schedule-pipeline', pipelineId, `Scheduled pipeline ${pipelineId} with ${schedule}`);
  }

  exportPipelineConfig(pipelineId: string): string {
    const pipeline = this._pipelines.get(pipelineId);
    if (!pipeline) return '';
    return JSON.stringify(pipeline, null, 2);
  }

  importPipelineConfig(json: string): IntegrationPipeline | null {
    try {
      const pipeline = JSON.parse(json) as IntegrationPipeline;
      this.addPipeline(pipeline);
      return pipeline;
    } catch {
      return null;
    }
  }

  toPacket(): DataPacket<DataIntegrationResult> {
    const result = this._lastResult || {
      pipelineId: '',
      recordsProcessed: 0,
      recordsFailed: 0,
      recordsFiltered: 0,
      bytesTransferred: 0,
      duration: 0,
      startTime: Date.now(),
      endTime: Date.now(),
      errors: [],
      warnings: [],
      sourceMetrics: new Map(),
      transformationMetrics: new Map()
    };
    this._counter++;
    return {
      id: `data-integration-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['digital-twin', 'data-integration'],
        priority: 1,
        phase: 'integration'
      }
    };
  }

  reset(): void {
    this._sources.clear();
    this._pipelines.clear();
    this._transformations.clear();
    this._schemas.clear();
    this._qualityRules.clear();
    this._connectionPools.clear();
    this._lastResult = null;
    this._counter = 0;
    this._pipelineHistory = [];
    this._globalMetrics.clear();
    this._circuitBreakers.clear();
    this._dataCache.clear();
    this._schemaRegistry.clear();
    this._encryptionEnabled = false;
    this._compressionEnabled = true;
    this._auditLog = [];
    this._initDefaultSchemas();
    this._initDefaultQualityRules();
  }
}
