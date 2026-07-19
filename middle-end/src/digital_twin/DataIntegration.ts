import { DataPacket } from '../shared/types';

export interface RealTimeDataStream {
  id: string;
  source: string;
  type: 'sensor' | 'mqtt' | 'opc_ua' | 'kafka' | 'websocket' | 'http';
  endpoint: string;
  samplingRate: number;
  lastReceived: number;
  status: 'connected' | 'disconnected' | 'reconnecting' | 'error';
  dataPoints: number;
  bufferSize: number;
}

export interface HistoricalDataSet {
  id: string;
  source: string;
  timeRange: { start: number; end: number };
  resolution: string;
  recordCount: number;
  storageFormat: string;
  compressionRatio: number;
  dataQuality: number;
}

export interface DataAlignmentConfig {
  id: string;
  sources: string[];
  alignmentStrategy: 'timestamp' | 'index' | 'interpolate' | 'resample';
  targetFrequency: number;
  tolerance: number;
  interpolationMethod: 'linear' | 'cubic' | 'nearest' | 'spline';
  alignedPoints: number;
}

export interface DataSource {
  timestamp: number;
  sourceId: string;
  values: Record<string, number>;
  quality: number;
  metadata?: Record<string, unknown>;
}

export interface DataIntegrationResult {
  realTimeStreams: RealTimeDataStream[];
  historicalDataSets: HistoricalDataSet[];
  alignmentConfigs: DataAlignmentConfig[];
  totalDataPoints: number;
  integrationQuality: number;
  alignmentStatus: 'pending' | 'aligning' | 'aligned' | 'failed';
}

export class DataIntegration {
  private _realTimeStreams: Map<string, RealTimeDataStream> = new Map();
  private _historicalDataSets: Map<string, HistoricalDataSet> = new Map();
  private _alignmentConfigs: Map<string, DataAlignmentConfig> = new Map();
  private _dataBuffer: Map<string, Data[]> = new Map();
  private _counter: number = 0;
  private _lastResult: DataIntegrationResult | null = null;
  private _sourceRegistry: Map<string, { type: string; registeredAt: number }> = new Map();
  private _transformationRules: Map<string, { input: string; output: string; transform: string }> = new Map();
  private _qualityMetrics: {
    completeness: number;
    consistency: number;
    timeliness: number;
    accuracy: number;
  } = {
    completeness: 0,
    consistency: 0,
    timeliness: 0,
    accuracy: 0,
  };
  private _dataSchemaRegistry: Map<string, { fields: string[]; types: Record<string, string>; validations: string[] }> = new Map();
  private _integrationPipelines: Map<string, { sources: string[]; transformations: string[]; output: string; running: boolean }> = new Map();

  constructor() {
    this._initDefaultSchemas();
    this._initDefaultTransformations();
  }

  private _initDefaultSchemas(): void {
    const schemas = [
      {
        name: 'sensor_reading',
        schema: {
          fields: ['timestamp', 'sensorId', 'value', 'unit', 'quality'],
          types: { timestamp: 'number', sensorId: 'string', value: 'number', unit: 'string', quality: 'number' },
          validations: ['timestamp > 0', 'value is finite', 'quality between 0 and 1'],
        },
      },
      {
        name: 'equipment_status',
        schema: {
          fields: ['timestamp', 'equipmentId', 'status', 'mode', 'uptime'],
          types: { timestamp: 'number', equipmentId: 'string', status: 'string', mode: 'string', uptime: 'number' },
          validations: ['timestamp > 0', 'status in [running, stopped, error, maintenance]'],
        },
      },
      {
        name: 'environmental',
        schema: {
          fields: ['timestamp', 'location', 'temperature', 'humidity', 'pressure'],
          types: { timestamp: 'number', location: 'string', temperature: 'number', humidity: 'number', pressure: 'number' },
          validations: ['timestamp > 0', 'temperature between -100 and 200'],
        },
      },
    ];
    schemas.forEach(s => this._dataSchemaRegistry.set(s.name, s.schema));
  }

  private _initDefaultTransformations(): void {
    const transformations = [
      { name: 'celsius_to_fahrenheit', rule: { input: 'temperature_c', output: 'temperature_f', transform: 'value * 9/5 + 32' } },
      { name: 'kpa_to_psi', rule: { input: 'pressure_kpa', output: 'pressure_psi', transform: 'value * 0.145038' } },
      { name: 'normalize', rule: { input: 'raw', output: 'normalized', transform: '(value - min) / (max - min)' } },
      { name: 'smooth_moving_average', rule: { input: 'raw', output: 'smoothed', transform: 'movingAverage(value, window)' } },
    ];
    transformations.forEach(t => this._transformationRules.set(t.name, t.rule));
  }

  get realTimeStreams(): RealTimeDataStream[] {
    return Array.from(this._realTimeStreams.values());
  }

  get historicalDataSets(): HistoricalDataSet[] {
    return Array.from(this._historicalDataSets.values());
  }

  get alignmentConfigs(): DataAlignmentConfig[] {
    return Array.from(this._alignmentConfigs.values());
  }

  get totalDataPoints(): number {
    let total = 0;
    for (const stream of this._realTimeStreams.values()) {
      total += stream.dataPoints;
    }
    for (const dataset of this._historicalDataSets.values()) {
      total += dataset.recordCount;
    }
    return total;
  }

  get qualityMetrics(): { completeness: number; consistency: number; timeliness: number; accuracy: number } {
    return { ...this._qualityMetrics };
  }

  get sourceCount(): number {
    return this._realTimeStreams.size + this._historicalDataSets.size;
  }

  addRealTimeStream(
    source: string,
    type: 'sensor' | 'mqtt' | 'opc_ua' | 'kafka' | 'websocket' | 'http',
    params: {
      endpoint?: string;
      samplingRate?: number;
      bufferSize?: number;
    } = {}
  ): RealTimeDataStream {
    const id = `rt-${Date.now()}-${this._counter++}`;
    const stream: RealTimeDataStream = {
      id,
      source,
      type,
      endpoint: params.endpoint ?? '',
      samplingRate: params.samplingRate ?? 1,
      lastReceived: 0,
      status: 'disconnected',
      dataPoints: 0,
      bufferSize: params.bufferSize ?? 1000,
    };
    this._realTimeStreams.set(id, stream);
    this._sourceRegistry.set(id, { type: 'realtime', registeredAt: Date.now() });
    this._dataBuffer.set(id, []);
    this._updateQualityMetrics();
    return stream;
  }

  addHistoricalDataSet(
    source: string,
    timeRange: { start: number; end: number },
    params: {
      resolution?: string;
      recordCount?: number;
      storageFormat?: string;
      compressionRatio?: number;
      dataQuality?: number;
    } = {}
  ): HistoricalDataSet {
    const id = `hist-${Date.now()}-${this._counter++}`;
    const dataset: HistoricalDataSet = {
      id,
      source,
      timeRange,
      resolution: params.resolution ?? '1s',
      recordCount: params.recordCount ?? 0,
      storageFormat: params.storageFormat ?? 'parquet',
      compressionRatio: params.compressionRatio ?? 1,
      dataQuality: params.dataQuality ?? 0.95,
    };
    this._historicalDataSets.set(id, dataset);
    this._sourceRegistry.set(id, { type: 'historical', registeredAt: Date.now() });
    this._updateQualityMetrics();
    return dataset;
  }

  createAlignmentConfig(
    sources: string[],
    strategy: 'timestamp' | 'index' | 'interpolate' | 'resample',
    params: {
      targetFrequency?: number;
      tolerance?: number;
      interpolationMethod?: 'linear' | 'cubic' | 'nearest' | 'spline';
    } = {}
  ): DataAlignmentConfig {
    const id = `align-${Date.now()}-${this._counter++}`;
    const config: DataAlignmentConfig = {
      id,
      sources,
      alignmentStrategy: strategy,
      targetFrequency: params.targetFrequency ?? 1,
      tolerance: params.tolerance ?? 0.001,
      interpolationMethod: params.interpolationMethod ?? 'linear',
      alignedPoints: 0,
    };
    this._alignmentConfigs.set(id, config);
    return config;
  }

  connectStream(streamId: string): boolean {
    const stream = this._realTimeStreams.get(streamId);
    if (!stream) return false;
    stream.status = 'connected';
    stream.lastReceived = Date.now();
    return true;
  }

  disconnectStream(streamId: string): boolean {
    const stream = this._realTimeStreams.get(streamId);
    if (!stream) return false;
    stream.status = 'disconnected';
    return true;
  }

  ingestData(streamId: string, data: Data): boolean {
    const stream = this._realTimeStreams.get(streamId);
    if (!stream) return false;
    const buffer = this._dataBuffer.get(streamId);
    if (!buffer) return false;
    buffer.push(data);
    if (buffer.length > stream.bufferSize) {
      buffer.shift();
    }
    stream.dataPoints++;
    stream.lastReceived = data.timestamp;
    this._updateQualityMetrics();
    return true;
  }

  ingestBatch(streamId: string, dataPoints: Data[]): number {
    const stream = this._realTimeStreams.get(streamId);
    if (!stream) return 0;
    const buffer = this._dataBuffer.get(streamId);
    if (!buffer) return 0;
    let ingested = 0;
    for (const data of dataPoints) {
      buffer.push(data);
      if (buffer.length > stream.bufferSize) {
        buffer.shift();
      }
      stream.dataPoints++;
      if (data.timestamp > stream.lastReceived) {
        stream.lastReceived = data.timestamp;
      }
      ingested++;
    }
    this._updateQualityMetrics();
    return ingested;
  }

  getBufferedData(streamId: string, limit?: number): Data[] {
    const buffer = this._dataBuffer.get(streamId);
    if (!buffer) return [];
    if (limit === undefined) return [...buffer];
    return buffer.slice(-limit);
  }

  alignData(configId: string): { aligned: Data[]; count: number } {
    const config = this._alignmentConfigs.get(configId);
    if (!config) return { aligned: [], count: 0 };

    const allData: Data[] = [];
    for (const sourceId of config.sources) {
      const buffer = this._dataBuffer.get(sourceId);
      if (buffer) {
        allData.push(...buffer);
      }
    }

    const sorted = allData.sort((a, b) => a.timestamp - b.timestamp);
    let aligned: Data[] = [];

    if (config.alignmentStrategy === 'timestamp') {
      aligned = this._alignByTimestamp(sorted, config.tolerance);
    } else if (config.alignmentStrategy === 'interpolate') {
      aligned = this._alignByInterpolation(sorted, config.targetFrequency, config.interpolationMethod);
    } else if (config.alignmentStrategy === 'resample') {
      aligned = this._resampleData(sorted, config.targetFrequency);
    } else {
      aligned = sorted;
    }

    config.alignedPoints = aligned.length;
    return { aligned, count: aligned.length };
  }

  private _alignByTimestamp(data: Data[], tolerance: number): Data[] {
    const groups: Map<number, Data[]> = new Map();
    for (const point of data) {
      const key = Math.round(point.timestamp / tolerance) * tolerance;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(point);
    }
    const result: Data[] = [];
    for (const [timestamp, points] of groups.entries()) {
      const mergedValues: Record<string, number> = {};
      let totalQuality = 0;
      for (const point of points) {
        Object.assign(mergedValues, point.values);
        totalQuality += point.quality;
      }
      result.push({
        timestamp,
        sourceId: points.map(p => p.sourceId).join(','),
        values: mergedValues,
        quality: points.length > 0 ? totalQuality / points.length : 0,
      });
    }
    return result.sort((a, b) => a.timestamp - b.timestamp);
  }

  private _alignByInterpolation(
    data: Data[],
    targetFrequency: number,
    method: string
  ): Data[] {
    if (data.length < 2) return data;
    const result: Data[] = [];
    const startTime = data[0].timestamp;
    const endTime = data[data.length - 1].timestamp;
    const step = 1000 / targetFrequency;
    const valueKeys = new Set<string>();
    for (const point of data) {
      for (const key of Object.keys(point.values)) {
        valueKeys.add(key);
      }
    }
    for (let t = startTime; t <= endTime; t += step) {
      const values: Record<string, number> = {};
      for (const key of valueKeys) {
        values[key] = this._interpolate(data, key, t, method);
      }
      result.push({
        timestamp: t,
        sourceId: 'interpolated',
        values,
        quality: 0.9,
      });
    }
    return result;
  }

  private _interpolate(data: Data[], key: string, t: number, method: string): number {
    let before: Data | null = null;
    let after: Data | null = null;
    for (const point of data) {
      if (point.values[key] === undefined) continue;
      if (point.timestamp <= t) {
        before = point;
      } else if (point.timestamp >= t) {
        after = point;
        break;
      }
    }
    if (!before && after) return after.values[key];
    if (before && !after) return before.values[key];
    if (!before || !after) return 0;
    if (method === 'nearest') {
      return t - before.timestamp < after.timestamp - t ? before.values[key] : after.values[key];
    }
    const ratio = (t - before.timestamp) / (after.timestamp - before.timestamp);
    if (method === 'linear' || method === 'cubic' || method === 'spline') {
      return before.values[key] + ratio * (after.values[key] - before.values[key]);
    }
    return before.values[key];
  }

  private _resampleData(data: Data[], targetFrequency: number): Data[] {
    if (data.length < 2) return data;
    const result: Data[] = [];
    const step = 1000 / targetFrequency;
    let windowStart = data[0].timestamp;
    let windowValues: Record<string, number[]> = {};
    let windowCount = 0;
    let windowQuality = 0;
    for (const point of data) {
      if (point.timestamp >= windowStart + step) {
        const avgValues: Record<string, number> = {};
        for (const key of Object.keys(windowValues)) {
          const vals = windowValues[key];
          avgValues[key] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        }
        result.push({
          timestamp: windowStart,
          sourceId: 'resampled',
          values: avgValues,
          quality: windowCount > 0 ? windowQuality / windowCount : 0,
        });
        windowStart = point.timestamp;
        windowValues = {};
        windowCount = 0;
        windowQuality = 0;
      }
      for (const key of Object.keys(point.values)) {
        if (!windowValues[key]) windowValues[key] = [];
        windowValues[key].push(point.values[key]);
      }
      windowCount++;
      windowQuality += point.quality;
    }
    return result;
  }

  addTransformationRule(
    name: string,
    inputField: string,
    outputField: string,
    transform: string
  ): boolean {
    if (this._transformationRules.has(name)) return false;
    this._transformationRules.set(name, { input: inputField, output: outputField, transform });
    return true;
  }

  applyTransformation(data: Data[], ruleName: string): Data[] {
    const rule = this._transformationRules.get(ruleName);
    if (!rule) return data;
    return data.map(point => {
      const newPoint = { ...point, values: { ...point.values } };
      if (newPoint.values[rule.input] !== undefined) {
        const inputValue = newPoint.values[rule.input];
        let outputValue = inputValue;
        if (rule.transform.includes('*')) {
          const parts = rule.transform.split('*');
          if (parts.length === 2 && !isNaN(parseFloat(parts[1]))) {
            outputValue = inputValue * parseFloat(parts[1]);
          }
        } else if (rule.transform.includes('+')) {
          const parts = rule.transform.split('+');
          if (parts.length === 2 && !isNaN(parseFloat(parts[1]))) {
            outputValue = inputValue + parseFloat(parts[1]);
          }
        }
        newPoint.values[rule.output] = outputValue;
      }
      return newPoint;
    });
  }

  registerSchema(name: string, fields: string[], types: Record<string, string>, validations: string[]): boolean {
    if (this._dataSchemaRegistry.has(name)) return false;
    this._dataSchemaRegistry.set(name, { fields, types, validations });
    return true;
  }

  validateData(data: Data, schemaName: string): { valid: boolean; errors: string[] } {
    const schema = this._dataSchemaRegistry.get(schemaName);
    const errors: string[] = [];
    if (!schema) {
      errors.push(`Schema not found: ${schemaName}`);
      return { valid: false, errors };
    }
    for (const field of schema.fields) {
      if (data.values[field] === undefined && field !== 'timestamp' && field !== 'sourceId') {
        errors.push(`Missing field: ${field}`);
      }
    }
    return { valid: errors.length === 0, errors };
  }

  createIntegrationPipeline(
    name: string,
    sources: string[],
    transformations: string[],
    output: string
  ): boolean {
    if (this._integrationPipelines.has(name)) return false;
    this._integrationPipelines.set(name, { sources, transformations, output, running: false });
    return true;
  }

  startPipeline(name: string): boolean {
    const pipeline = this._integrationPipelines.get(name);
    if (!pipeline) return false;
    pipeline.running = true;
    return true;
  }

  stopPipeline(name: string): boolean {
    const pipeline = this._integrationPipelines.get(name);
    if (!pipeline) return false;
    pipeline.running = false;
    return true;
  }

  getPipelineStatus(name: string): { running: boolean; sources: string[]; transformations: string[] } | null {
    const pipeline = this._integrationPipelines.get(name);
    if (!pipeline) return null;
    return { running: pipeline.running, sources: pipeline.sources, transformations: pipeline.transformations };
  }

  getSchemaNames(): string[] {
    return Array.from(this._dataSchemaRegistry.keys());
  }

  getTransformationNames(): string[] {
    return Array.from(this._transformationRules.keys());
  }

  getPipelineNames(): string[] {
    return Array.from(this._integrationPipelines.keys());
  }

  private _updateQualityMetrics(): void {
    const streams = Array.from(this._realTimeStreams.values());
    const datasets = Array.from(this._historicalDataSets.values());
    const allSources = [...streams, ...datasets];
    if (allSources.length === 0) {
      this._qualityMetrics = { completeness: 0, consistency: 0, timeliness: 0, accuracy: 0 };
      return;
    }
    let totalCompleteness = 0;
    let totalTimeliness = 0;
    let totalAccuracy = 0;
    for (const stream of streams) {
      totalCompleteness += stream.status === 'connected' ? 0.95 : 0.5;
      totalTimeliness += stream.dataPoints > 0 ? Math.min(1, stream.dataPoints / 1000) : 0;
      totalAccuracy += 0.9;
    }
    for (const dataset of datasets) {
      totalCompleteness += dataset.dataQuality;
      totalTimeliness += 0.8;
      totalAccuracy += dataset.dataQuality;
    }
    const count = allSources.length;
    this._qualityMetrics = {
      completeness: totalCompleteness / count,
      consistency: 0.85,
      timeliness: totalTimeliness / count,
      accuracy: totalAccuracy / count,
    };
  }

  toPacket(): DataPacket<DataIntegrationResult> {
    const result: DataIntegrationResult = {
      realTimeStreams: Array.from(this._realTimeStreams.values()),
      historicalDataSets: Array.from(this._historicalDataSets.values()),
      alignmentConfigs: Array.from(this._alignmentConfigs.values()),
      totalDataPoints: this.totalDataPoints,
      integrationQuality:
        (this._qualityMetrics.completeness +
          this._qualityMetrics.consistency +
          this._qualityMetrics.timeliness +
          this._qualityMetrics.accuracy) /
        4,
      alignmentStatus: this._alignmentConfigs.size > 0 ? 'aligned' : 'pending',
    };
    this._lastResult = result;
    this._counter++;
    return {
      id: `data-integration-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['digital_twin', 'data_integration'],
        priority: 1,
        phase: 'integration',
      },
    };
  }

  reset(): void {
    this._realTimeStreams.clear();
    this._historicalDataSets.clear();
    this._alignmentConfigs.clear();
    this._dataBuffer.clear();
    this._counter = 0;
    this._lastResult = null;
    this._sourceRegistry.clear();
    this._qualityMetrics = {
      completeness: 0,
      consistency: 0,
      timeliness: 0,
      accuracy: 0,
    };
    this._integrationPipelines.clear();
  }
}
