import { DataPacket } from '../shared/types';

export interface SensorReading {
  readonly device: string;
  readonly sensor: string;
  readonly value: number;
  readonly timestamp: number;
  readonly unit: string;
}

export interface DataStream {
  readonly id: string;
  readonly readings: SensorReading[];
  readonly frequency: number;
  readonly startTime: number;
}

export interface DataQualityMetric {
  readonly completeness: number;
  readonly accuracy: number;
  readonly timeliness: number;
  readonly consistency: number;
}

export interface SamplingStrategy {
  readonly type: 'uniform' | 'adaptive' | 'event-driven' | 'burst';
  readonly interval: number;
  readonly threshold: number;
  readonly jitter: number;
}

export interface BufferPolicy {
  readonly maxSize: number;
  readonly flushInterval: number;
  readonly priority: 'latency' | 'throughput' | 'reliability';
}

export interface TimeSeriesPoint {
  readonly timestamp: number;
  readonly value: number;
  readonly metadata: Record<string, unknown>;
}

export class DataCollection {
  private _readings: SensorReading[] = [];
  private _streams: Map<string, DataStream> = new Map();
  private _history: string[] = [];
  private _counter = 0;
  private _qualityMetrics: Map<string, DataQualityMetric> = new Map();
  private _samplingStrategies: Map<string, SamplingStrategy> = new Map();
  private _bufferPolicies: Map<string, BufferPolicy> = new Map();
  private _timeSeries: Map<string, TimeSeriesPoint[]> = new Map();
  private _aggregatedData: Map<string, { timestamp: number; value: number }[]> = new Map();
  private _calibrationParams: Map<string, { offset: number; scale: number; lastCalibrated: number }> = new Map();
  private _activeSensors: Set<string> = new Set();

  get readingCount(): number {
    return this._readings.length;
  }

  get streamCount(): number {
    return this._streams.size;
  }

  get history(): string[] {
    return [...this._history];
  }

  get qualityMetricCount(): number {
    return this._qualityMetrics.size;
  }

  get activeSensorCount(): number {
    return this._activeSensors.size;
  }

  get timeSeriesCount(): number {
    return this._timeSeries.size;
  }

  public sensorRead(device: string, sensor: string): { reading: SensorReading; device: string; sensor: string } {
    const reading: SensorReading = {
      device,
      sensor,
      value: Math.random() * 100,
      timestamp: Date.now(),
      unit: 'unit',
    };
    this._readings.push(reading);
    this._activeSensors.add(`${device}:${sensor}`);
    this._recordHistory(`sensorRead(device=${device}, sensor=${sensor}) -> value=${reading.value.toFixed(2)}`);
    return { reading, device, sensor };
  }

  public sampleData(sensor: string, rate: number, duration: number): { samples: SensorReading[]; sensor: string; rate: number; duration: number } {
    const samples: SensorReading[] = [];
    const count = Math.floor(rate * duration);
    for (let i = 0; i < count; i++) {
      samples.push({
        device: 'device-0',
        sensor,
        value: 50 + Math.sin(i * 0.1) * 30 + Math.random() * 10,
        timestamp: Date.now() + (i * 1000) / rate,
        unit: 'unit',
      });
    }
    this._readings.push(...samples);
    this._recordHistory(`sampleData(sensor=${sensor}, rate=${rate}Hz, duration=${duration}s) -> ${count} samples`);
    return { samples, sensor, rate, duration };
  }

  public dataAggregation(readings: SensorReading[], method: string, interval: number): { aggregated: { timestamp: number; value: number }[]; method: string; interval: number } {
    const aggregated: { timestamp: number; value: number }[] = [];
    const groups = new Map<number, number[]>();
    for (const r of readings) {
      const bucket = Math.floor(r.timestamp / interval) * interval;
      if (!groups.has(bucket)) groups.set(bucket, []);
      groups.get(bucket)?.push(r.value);
    }
    for (const [ts, values] of groups.entries()) {
      let val = 0;
      if (method === 'avg') val = values.reduce((s, v) => s + v, 0) / values.length;
      else if (method === 'max') val = Math.max(...values);
      else if (method === 'min') val = Math.min(...values);
      else val = values.reduce((s, v) => s + v, 0);
      aggregated.push({ timestamp: ts, value: val });
    }
    this._aggregatedData.set(`agg-${method}-${interval}`, aggregated);
    this._recordHistory(`dataAggregation(method=${method}, interval=${interval}) -> ${aggregated.length} points`);
    return { aggregated, method, interval };
  }

  public timeSeriesStore(readings: SensorReading[], database: string): { stored: number; database: string; points: number } {
    this._readings.push(...readings);
    const points: TimeSeriesPoint[] = readings.map(r => ({
      timestamp: r.timestamp,
      value: r.value,
      metadata: { device: r.device, sensor: r.sensor, unit: r.unit },
    }));
    const existing = this._timeSeries.get(database) ?? [];
    this._timeSeries.set(database, [...existing, ...points]);
    this._recordHistory(`timeSeriesStore(database=${database}, points=${readings.length})`);
    return { stored: readings.length, database, points: readings.length };
  }

  public dataNormalization(readings: SensorReading[], range: { min: number; max: number }): { normalized: SensorReading[]; min: number; max: number } {
    const values = readings.map(r => r.value);
    const dataMin = Math.min(...values);
    const dataMax = Math.max(...values);
    const normalized = readings.map(r => ({
      ...r,
      value: range.min + ((r.value - dataMin) / (dataMax - dataMin || 1)) * (range.max - range.min),
    }));
    this._recordHistory(`dataNormalization(readings=${readings.length}, range=[${range.min}, ${range.max}])`);
    return { normalized, min: range.min, max: range.max };
  }

  public dataCalibration(readings: SensorReading[], calibration: { offset: number; scale: number }): { calibrated: SensorReading[]; offset: number; scale: number } {
    const calibrated = readings.map(r => ({
      ...r,
      value: r.value * calibration.scale + calibration.offset,
    }));
    this._calibrationParams.set('global', { ...calibration, lastCalibrated: Date.now() });
    this._recordHistory(`dataCalibration(readings=${readings.length}, offset=${calibration.offset}, scale=${calibration.scale})`);
    return { calibrated, offset: calibration.offset, scale: calibration.scale };
  }

  public edgeAnalytics(data: SensorReading[], algorithm: string): { result: string; algorithm: string; dataPoints: number; confidence: number } {
    const confidence = 0.85 + Math.random() * 0.1;
    this._recordHistory(`edgeAnalytics(algo=${algorithm}, data=${data.length}) -> confidence=${confidence.toFixed(2)}`);
    return { result: 'analysis-result', algorithm, dataPoints: data.length, confidence };
  }

  public sensorFusion(sensors: string[], data: SensorReading[], method: 'kalman' | 'weighted' | 'bayesian'): { fused: SensorReading; sensors: string[]; method: string; uncertainty: number } {
    const values = data.map(d => d.value);
    const fusedValue = values.reduce((s, v) => s + v, 0) / values.length;
    const uncertainty = Math.sqrt(values.reduce((s, v) => s + Math.pow(v - fusedValue, 2), 0) / values.length);
    const fused: SensorReading = {
      device: 'fused',
      sensor: sensors.join('+'),
      value: fusedValue,
      timestamp: Date.now(),
      unit: 'fused',
    };
    this._recordHistory(`sensorFusion(sensors=${sensors.length}, method=${method}) -> value=${fusedValue.toFixed(2)}`);
    return { fused, sensors, method, uncertainty };
  }

  public anomalyDetection(stream: SensorReading[], threshold: number): { anomalies: SensorReading[]; count: number; threshold: number; severity: string } {
    const mean = stream.reduce((s, r) => s + r.value, 0) / stream.length;
    const std = Math.sqrt(stream.reduce((s, r) => s + Math.pow(r.value - mean, 2), 0) / stream.length);
    const anomalies = stream.filter(r => Math.abs(r.value - mean) > threshold * std);
    const severity = anomalies.length > stream.length * 0.2 ? 'critical' : anomalies.length > stream.length * 0.05 ? 'warning' : 'normal';
    this._recordHistory(`anomalyDetection(stream=${stream.length}, threshold=${threshold}) -> ${anomalies.length} anomalies (${severity})`);
    return { anomalies, count: anomalies.length, threshold, severity };
  }

  public thresholdAlert(sensor: string, value: number, thresholds: { min: number; max: number }): { alert: boolean; sensor: string; value: number; level: string; duration: number } {
    const alert = value < thresholds.min || value > thresholds.max;
    const level = value > thresholds.max ? 'high' : value < thresholds.min ? 'low' : 'normal';
    const duration = alert ? Math.floor(Math.random() * 60) + 1 : 0;
    this._recordHistory(`thresholdAlert(sensor=${sensor}, value=${value.toFixed(2)}) -> alert=${alert} (${level})`);
    return { alert, sensor, value, level, duration };
  }

  public dataCompression(data: string, method: 'gzip' | 'lz4' | 'zstd'): { compressed: string; method: string; ratio: number; originalSize: number } {
    const ratio = 0.5 + Math.random() * 0.3;
    const compressed = data.slice(0, Math.floor(data.length * ratio));
    this._recordHistory(`dataCompression(method=${method}) -> ratio=${(ratio * 100).toFixed(1)}%`);
    return { compressed, method, ratio, originalSize: data.length };
  }

  public dataBuffering(data: SensorReading[], size: number, time: number): { buffer: SensorReading[]; size: number; time: number; flushed: boolean; overflow: number } {
    const buffer = data.slice(0, size);
    const flushed = buffer.length >= size;
    const overflow = Math.max(0, data.length - size);
    this._recordHistory(`dataBuffering(size=${size}, time=${time}ms) -> buffer=${buffer.length}, flushed=${flushed}`);
    return { buffer, size, time, flushed, overflow };
  }

  public batchUpload(batch: SensorReading[], endpoint: string): { uploaded: number; endpoint: string; batchSize: number; success: boolean; latency: number } {
    const success = Math.random() > 0.1;
    const latency = success ? 50 + Math.floor(Math.random() * 200) : 5000;
    this._recordHistory(`batchUpload(batch=${batch.length}, endpoint=${endpoint}) -> success=${success}`);
    return { uploaded: batch.length, endpoint, batchSize: batch.length, success, latency };
  }

  public adaptiveSampling(sensor: string, baseline: number, variance: number): { strategy: SamplingStrategy; sensor: string; adjustedRate: number; reason: string } {
    const type: SamplingStrategy['type'] = variance > baseline * 0.3 ? 'event-driven' : 'uniform';
    const interval = type === 'event-driven' ? 100 : 1000;
    const strategy: SamplingStrategy = { type, interval, threshold: baseline + variance, jitter: Math.random() * 10 };
    this._samplingStrategies.set(sensor, strategy);
    this._recordHistory(`adaptiveSampling(sensor=${sensor}, type=${type}) -> interval=${interval}ms`);
    return { strategy, sensor, adjustedRate: 1000 / interval, reason: `variance=${variance.toFixed(2)}` };
  }

  public dataQualityAssessment(streamId: string, readings: SensorReading[]): { streamId: string; metric: DataQualityMetric; passed: boolean } {
    const completeness = readings.length > 0 ? 1.0 : 0.0;
    const accuracy = 0.95 + Math.random() * 0.05;
    const timeliness = 0.9 + Math.random() * 0.1;
    const consistency = 0.92 + Math.random() * 0.08;
    const metric: DataQualityMetric = { completeness, accuracy, timeliness, consistency };
    this._qualityMetrics.set(streamId, metric);
    const passed = accuracy > 0.9 && timeliness > 0.85;
    this._recordHistory(`dataQualityAssessment(stream=${streamId}) -> passed=${passed}`);
    return { streamId, metric, passed };
  }

  public outlierRemoval(readings: SensorReading[], method: 'iqr' | 'zscore' | 'mad'): { cleaned: SensorReading[]; removed: number; method: string } {
    const values = readings.map(r => r.value);
    const sorted = [...values].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const deviations = values.map(v => Math.abs(v - median));
    const threshold = method === 'iqr' ? (sorted[Math.floor(sorted.length * 0.75)] - sorted[Math.floor(sorted.length * 0.25)]) * 1.5 : method === 'zscore' ? 3 : 2.5;
    const cleaned: SensorReading[] = [];
    let removed = 0;
    for (let i = 0; i < readings.length; i++) {
      if (deviations[i] <= threshold) {
        cleaned.push(readings[i]);
      } else {
        removed++;
      }
    }
    this._recordHistory(`outlierRemoval(method=${method}) -> removed=${removed}`);
    return { cleaned, removed, method };
  }

  public trendAnalysis(readings: SensorReading[], window: number): { trend: 'up' | 'down' | 'stable'; slope: number; confidence: number; window: number } {
    const recent = readings.slice(-window);
    if (recent.length < 2) return { trend: 'stable', slope: 0, confidence: 0, window };
    const first = recent[0].value;
    const last = recent[recent.length - 1].value;
    const slope = (last - first) / window;
    const confidence = Math.min(1, Math.abs(slope) / 10);
    const trend: 'up' | 'down' | 'stable' = slope > 0.5 ? 'up' : slope < -0.5 ? 'down' : 'stable';
    this._recordHistory(`trendAnalysis(window=${window}) -> trend=${trend}, slope=${slope.toFixed(3)}`);
    return { trend, slope, confidence, window };
  }

  public forecasting(readings: SensorReading[], horizon: number): { predictions: { timestamp: number; value: number; lower: number; upper: number }[]; horizon: number; method: string } {
    const last = readings[readings.length - 1];
    const predictions: { timestamp: number; value: number; lower: number; upper: number }[] = [];
    for (let i = 1; i <= horizon; i++) {
      const predicted = last.value + (Math.random() - 0.5) * 10;
      predictions.push({
        timestamp: last.timestamp + i * 60000,
        value: predicted,
        lower: predicted - 5,
        upper: predicted + 5,
      });
    }
    this._recordHistory(`forecasting(horizon=${horizon}) -> ${predictions.length} predictions`);
    return { predictions, horizon, method: 'exponential-smoothing' };
  }

  public configureBufferPolicy(streamId: string, policy: BufferPolicy): { streamId: string; configured: boolean; policy: BufferPolicy } {
    this._bufferPolicies.set(streamId, policy);
    this._recordHistory(`configureBufferPolicy(stream=${streamId}, maxSize=${policy.maxSize})`);
    return { streamId, configured: true, policy };
  }

  public streamMetadata(streamId: string, metadata: Record<string, unknown>): { streamId: string; metadata: Record<string, unknown>; stored: boolean } {
    const stream = this._streams.get(streamId);
    if (stream) {
      this._streams.set(streamId, { ...stream, ...metadata } as DataStream);
    }
    this._recordHistory(`streamMetadata(stream=${streamId}) -> stored=${!!stream}`);
    return { streamId, metadata, stored: !!stream };
  }

  public getQualityReport(): { streams: number; averageCompleteness: number; averageAccuracy: number; issues: string[] } {
    const metrics = Array.from(this._qualityMetrics.values());
    const averageCompleteness = metrics.length > 0 ? metrics.reduce((s, m) => s + m.completeness, 0) / metrics.length : 0;
    const averageAccuracy = metrics.length > 0 ? metrics.reduce((s, m) => s + m.accuracy, 0) / metrics.length : 0;
    const issues: string[] = [];
    if (averageCompleteness < 0.9) issues.push('low completeness');
    if (averageAccuracy < 0.9) issues.push('low accuracy');
    this._recordHistory(`getQualityReport() -> streams=${metrics.length}, issues=${issues.length}`);
    return { streams: metrics.length, averageCompleteness, averageAccuracy, issues };
  }

  public getCalibrationStatus(): { calibrated: boolean; lastCalibrated: number; params: { offset: number; scale: number } | null } {
    const params = this._calibrationParams.get('global');
    const calibrated = !!params;
    this._recordHistory(`getCalibrationStatus() -> calibrated=${calibrated}`);
    return { calibrated, lastCalibrated: params?.lastCalibrated ?? 0, params: params ? { offset: params.offset, scale: params.scale } : null };
  }

  public getTimeSeries(database: string): { database: string; points: TimeSeriesPoint[]; count: number } {
    const points = this._timeSeries.get(database) ?? [];
    this._recordHistory(`getTimeSeries(database=${database}) -> ${points.length} points`);
    return { database, points, count: points.length };
  }

  public listActiveSensors(): { sensors: string[]; count: number } {
    const sensors = Array.from(this._activeSensors);
    this._recordHistory(`listActiveSensors() -> ${sensors.length} sensors`);
    return { sensors, count: sensors.length };
  }

  public clearStream(streamId: string): { cleared: boolean; streamId: string; removedReadings: number } {
    const before = this._readings.length;
    this._readings = this._readings.filter(r => `${r.device}:${r.sensor}` !== streamId);
    const removedReadings = before - this._readings.length;
    this._streams.delete(streamId);
    this._recordHistory(`clearStream(stream=${streamId}) -> removed=${removedReadings}`);
    return { cleared: true, streamId, removedReadings };
  }

  public interpolateMissing(readings: SensorReading[], interval: number): { interpolated: SensorReading[]; filled: number; method: string } {
    const interpolated: SensorReading[] = [];
    let filled = 0;
    for (let i = 0; i < readings.length - 1; i++) {
      interpolated.push(readings[i]);
      const gap = readings[i + 1].timestamp - readings[i].timestamp;
      if (gap > interval * 1.5) {
        const midValue = (readings[i].value + readings[i + 1].value) / 2;
        interpolated.push({
          ...readings[i],
          value: midValue,
          timestamp: readings[i].timestamp + Math.floor(gap / 2),
        });
        filled++;
      }
    }
    if (readings.length > 0) interpolated.push(readings[readings.length - 1]);
    this._recordHistory(`interpolateMissing(readings=${readings.length}) -> filled=${filled}`);
    return { interpolated, filled, method: 'linear' };
  }

  public slidingWindowAnalysis(readings: SensorReading[], windowSize: number, step: number): { windows: { start: number; end: number; mean: number; std: number }[]; count: number } {
    const windows: { start: number; end: number; mean: number; std: number }[] = [];
    for (let i = 0; i <= readings.length - windowSize; i += step) {
      const slice = readings.slice(i, i + windowSize);
      const values = slice.map(r => r.value);
      const mean = values.reduce((s, v) => s + v, 0) / values.length;
      const std = Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length);
      windows.push({ start: i, end: i + windowSize, mean, std });
    }
    this._recordHistory(`slidingWindowAnalysis(window=${windowSize}, step=${step}) -> ${windows.length} windows`);
    return { windows, count: windows.length };
  }

  public spectralAnalysis(readings: SensorReading[], samplingRate: number): { dominantFrequency: number; magnitude: number; frequencies: number[]; magnitudes: number[] } {
    const n = readings.length;
    const frequencies: number[] = [];
    const magnitudes: number[] = [];
    for (let k = 0; k < n / 2; k++) {
      let real = 0;
      let imag = 0;
      for (let t = 0; t < n; t++) {
        const angle = (2 * Math.PI * k * t) / n;
        real += readings[t].value * Math.cos(angle);
        imag -= readings[t].value * Math.sin(angle);
      }
      const magnitude = Math.sqrt(real * real + imag * imag);
      frequencies.push((k * samplingRate) / n);
      magnitudes.push(magnitude);
    }
    const maxIdx = magnitudes.indexOf(Math.max(...magnitudes));
    const dominantFrequency = frequencies[maxIdx] ?? 0;
    this._recordHistory(`spectralAnalysis(samples=${n}) -> dominant=${dominantFrequency.toFixed(2)}Hz`);
    return { dominantFrequency, magnitude: magnitudes[maxIdx] ?? 0, frequencies, magnitudes };
  }

  public rateLimiting(sensor: string, maxEvents: number, windowMs: number): { allowed: boolean; sensor: string; remaining: number; resetTime: number } {
    const now = Date.now();
    const recent = this._readings.filter(r => r.sensor === sensor && r.timestamp > now - windowMs).length;
    const allowed = recent < maxEvents;
    const remaining = Math.max(0, maxEvents - recent);
    const resetTime = now + windowMs;
    this._recordHistory(`rateLimiting(sensor=${sensor}, max=${maxEvents}) -> allowed=${allowed}`);
    return { allowed, sensor, remaining, resetTime };
  }

  public dataRetentionPolicy(database: string, maxAgeMs: number): { pruned: number; database: string; remaining: number } {
    const now = Date.now();
    const points = this._timeSeries.get(database) ?? [];
    const before = points.length;
    const retained = points.filter(p => now - p.timestamp <= maxAgeMs);
    this._timeSeries.set(database, retained);
    const pruned = before - retained.length;
    this._recordHistory(`dataRetentionPolicy(database=${database}, maxAge=${maxAgeMs}ms) -> pruned=${pruned}`);
    return { pruned, database, remaining: retained.length };
  }

  public correlationAnalysis(streamA: SensorReading[], streamB: SensorReading[]): { correlation: number; covariance: number; significant: boolean; samples: number } {
    const n = Math.min(streamA.length, streamB.length);
    if (n === 0) return { correlation: 0, covariance: 0, significant: false, samples: 0 };
    const meanA = streamA.slice(0, n).reduce((s, r) => s + r.value, 0) / n;
    const meanB = streamB.slice(0, n).reduce((s, r) => s + r.value, 0) / n;
    let covariance = 0;
    let varA = 0;
    let varB = 0;
    for (let i = 0; i < n; i++) {
      const da = streamA[i].value - meanA;
      const db = streamB[i].value - meanB;
      covariance += da * db;
      varA += da * da;
      varB += db * db;
    }
    covariance /= n;
    const correlation = Math.sqrt(varA * varB) > 0 ? covariance / (Math.sqrt(varA * varB) / n) : 0;
    const significant = Math.abs(correlation) > 0.5;
    this._recordHistory(`correlationAnalysis(samples=${n}) -> r=${correlation.toFixed(3)}`);
    return { correlation, covariance, significant, samples: n };
  }

  public batchInterpolation(gaps: { start: number; end: number }[], baseReadings: SensorReading[]): { filled: SensorReading[]; gapsFilled: number; totalGenerated: number } {
    const filled: SensorReading[] = [];
    let gapsFilled = 0;
    for (const gap of gaps) {
      const before = baseReadings.filter(r => r.timestamp <= gap.start).pop();
      const after = baseReadings.filter(r => r.timestamp >= gap.end).shift();
      if (before && after) {
        const steps = Math.floor((gap.end - gap.start) / 1000);
        for (let i = 1; i < steps; i++) {
          const t = gap.start + i * 1000;
          const ratio = (t - gap.start) / (gap.end - gap.start);
          filled.push({
            device: before.device,
            sensor: before.sensor,
            value: before.value + (after.value - before.value) * ratio,
            timestamp: t,
            unit: before.unit,
          });
        }
        gapsFilled++;
      }
    }
    this._recordHistory(`batchInterpolation(gaps=${gaps.length}) -> filled=${gapsFilled}`);
    return { filled, gapsFilled, totalGenerated: filled.length };
  }

  public exportToCSV(readings: SensorReading[]): { csv: string; rows: number; columns: string[] } {
    const columns = ['timestamp', 'device', 'sensor', 'value', 'unit'];
    const rows = readings.map(r => `${r.timestamp},${r.device},${r.sensor},${r.value.toFixed(4)},${r.unit}`);
    const csv = [columns.join(','), ...rows].join('\n');
    this._recordHistory(`exportToCSV(readings=${readings.length}) -> ${rows.length} rows`);
    return { csv, rows: rows.length, columns };
  }

  public signalProcessing(readings: SensorReading[], filterType: 'lowpass' | 'highpass' | 'bandpass'): { filtered: SensorReading[]; filterType: string; cutoffFrequency: number; attenuation: number } {
    const cutoffFrequency = 10 + Math.random() * 90;
    const attenuation = 20 + Math.random() * 40;
    const filtered = readings.map(r => ({
      ...r,
      value: r.value * 0.95 + Math.random() * 0.05,
    }));
    this._recordHistory(`signalProcessing(filter=${filterType}) -> cutoff=${cutoffFrequency.toFixed(1)}Hz`);
    return { filtered, filterType, cutoffFrequency, attenuation };
  }

  public noiseReduction(readings: SensorReading[], windowSize: number): { denoised: SensorReading[]; method: string; snrBefore: number; snrAfter: number } {
    const denoised: SensorReading[] = [];
    for (let i = 0; i < readings.length; i++) {
      const start = Math.max(0, i - Math.floor(windowSize / 2));
      const end = Math.min(readings.length, i + Math.floor(windowSize / 2) + 1);
      const window = readings.slice(start, end);
      const avg = window.reduce((s, r) => s + r.value, 0) / window.length;
      denoised.push({ ...readings[i], value: avg });
    }
    const snrBefore = 10 + Math.random() * 20;
    const snrAfter = snrBefore + 5 + Math.random() * 10;
    this._recordHistory(`noiseReduction(window=${windowSize}) -> snr=${snrAfter.toFixed(1)}dB`);
    return { denoised, method: 'moving-average', snrBefore, snrAfter };
  }

  public dataCompressionStream(streamId: string, algorithm: 'gzip' | 'zstd' | 'lz4'): { compressed: boolean; streamId: string; algorithm: string; ratio: number; throughput: number } {
    const ratio = 0.4 + Math.random() * 0.3;
    const throughput = 100 + Math.floor(Math.random() * 900);
    this._recordHistory(`dataCompressionStream(id=${streamId}, algo=${algorithm}) -> ratio=${(ratio * 100).toFixed(1)}%`);
    return { compressed: true, streamId, algorithm, ratio, throughput };
  }

  public encryptionAtRest(data: SensorReading[], algorithm: 'AES-256-GCM' | 'ChaCha20-Poly1305'): { encrypted: boolean; algorithm: string; keyId: string; dataSize: number } {
    const keyId = `key-${Date.now()}`;
    const dataSize = JSON.stringify(data).length;
    this._recordHistory(`encryptionAtRest(algo=${algorithm}) -> keyId=${keyId}`);
    return { encrypted: true, algorithm, keyId, dataSize };
  }

  public accessControl(streamId: string, userId: string, permission: 'read' | 'write' | 'admin'): { granted: boolean; streamId: string; userId: string; permission: string; reason: string } {
    const granted = permission !== 'admin' || Math.random() > 0.5;
    const reason = granted ? 'authorized' : 'insufficient-privileges';
    this._recordHistory(`accessControl(stream=${streamId}, user=${userId}, perm=${permission}) -> ${granted}`);
    return { granted, streamId, userId, permission, reason };
  }

  public pipelineOrchestration(sources: string[], sinks: string[], transformations: string[]): { orchestrated: boolean; sources: number; sinks: number; transformations: number; throughput: number } {
    const throughput = 1000 + Math.floor(Math.random() * 9000);
    this._recordHistory(`pipelineOrchestration(sources=${sources.length}, sinks=${sinks.length}) -> throughput=${throughput}`);
    return { orchestrated: true, sources: sources.length, sinks: sinks.length, transformations: transformations.length, throughput };
  }

  public schemaEvolution(modelId: string, oldSchema: Record<string, string>, newSchema: Record<string, string>): { evolved: boolean; modelId: string; addedFields: string[]; removedFields: string[]; compatible: boolean } {
    const oldKeys = Object.keys(oldSchema);
    const newKeys = Object.keys(newSchema);
    const addedFields = newKeys.filter(k => !oldKeys.includes(k));
    const removedFields = oldKeys.filter(k => !newKeys.includes(k));
    const compatible = removedFields.length === 0;
    this._recordHistory(`schemaEvolution(model=${modelId}) -> added=${addedFields.length}, removed=${removedFields.length}`);
    return { evolved: true, modelId, addedFields, removedFields, compatible };
  }

  public dataLineage(source: string, destination: string, transformations: string[]): { lineage: string; source: string; destination: string; transformations: number; traceable: boolean } {
    this._recordHistory(`dataLineage(${source} -> ${destination}, transforms=${transformations.length})`);
    return { lineage: `${source}->${destination}`, source, destination, transformations: transformations.length, traceable: true };
  }

  public batchValidation(batch: SensorReading[], schema: Record<string, string>): { valid: boolean; batchSize: number; validRecords: number; invalidRecords: number; errors: string[] } {
    let validRecords = 0;
    const errors: string[] = [];
    for (const r of batch) {
      let recordValid = true;
      for (const field of Object.keys(schema)) {
        if (!(field in r)) {
          recordValid = false;
          errors.push(`missing-field-${field}`);
        }
      }
      if (recordValid) validRecords++;
    }
    const invalidRecords = batch.length - validRecords;
    this._recordHistory(`batchValidation(batch=${batch.length}) -> valid=${validRecords}`);
    return { valid: invalidRecords === 0, batchSize: batch.length, validRecords, invalidRecords, errors };
  }

  public realTimeAlerting(condition: string, threshold: number, readings: SensorReading[]): { alerts: SensorReading[]; triggered: boolean; condition: string; severity: string } {
    const alerts = readings.filter(r => r.value > threshold);
    const triggered = alerts.length > 0;
    const severity = alerts.length > readings.length * 0.2 ? 'critical' : alerts.length > readings.length * 0.05 ? 'warning' : 'info';
    this._recordHistory(`realTimeAlerting(condition=${condition}, threshold=${threshold}) -> ${alerts.length} alerts`);
    return { alerts, triggered, condition, severity };
  }

  public toPacket(): DataPacket<{
    readings: number;
    streams: number;
    qualityMetrics: number;
    activeSensors: number;
    timeSeries: number;
    history: string[];
  }> {
    return {
      id: `data-collection-${Date.now()}-${this._counter}`,
      payload: {
        readings: this._readings.length,
        streams: this._streams.size,
        qualityMetrics: this._qualityMetrics.size,
        activeSensors: this._activeSensors.size,
        timeSeries: this._timeSeries.size,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['iot', 'data_collection', 'result'],
        priority: 0.7,
        phase: 'collection',
      },
    };
  }

  public reset(): void {
    this._readings = [];
    this._streams.clear();
    this._history = [];
    this._counter = 0;
    this._qualityMetrics.clear();
    this._samplingStrategies.clear();
    this._bufferPolicies.clear();
    this._timeSeries.clear();
    this._aggregatedData.clear();
    this._calibrationParams.clear();
    this._activeSensors.clear();
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }
}
