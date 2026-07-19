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

export class DataCollection {
  private _readings: SensorReading[] = [];
  private _streams: Map<string, DataStream> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get readingCount(): number {
    return this._readings.length;
  }

  get streamCount(): number {
    return this._streams.size;
  }

  get history(): string[] {
    return [...this._history];
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
    this._recordHistory(`dataAggregation(method=${method}, interval=${interval}) -> ${aggregated.length} points`);
    return { aggregated, method, interval };
  }

  public timeSeriesStore(readings: SensorReading[], database: string): { stored: number; database: string; points: number } {
    this._readings.push(...readings);
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
    this._recordHistory(`dataCalibration(readings=${readings.length}, offset=${calibration.offset}, scale=${calibration.scale})`);
    return { calibrated, offset: calibration.offset, scale: calibration.scale };
  }

  public edgeAnalytics(data: SensorReading[], algorithm: string): { result: string; algorithm: string; dataPoints: number } {
    this._recordHistory(`edgeAnalytics(algo=${algorithm}, data=${data.length})`);
    return { result: 'analysis-result', algorithm, dataPoints: data.length };
  }

  public sensorFusion(sensors: string[], data: SensorReading[], method: string): { fused: SensorReading; sensors: string[]; method: string } {
    const values = data.map(d => d.value);
    const fusedValue = values.reduce((s, v) => s + v, 0) / values.length;
    const fused: SensorReading = {
      device: 'fused',
      sensor: sensors.join('+'),
      value: fusedValue,
      timestamp: Date.now(),
      unit: 'fused',
    };
    this._recordHistory(`sensorFusion(sensors=${sensors.length}, method=${method})`);
    return { fused, sensors, method };
  }

  public anomalyDetection(stream: SensorReading[], threshold: number): { anomalies: SensorReading[]; count: number; threshold: number } {
    const mean = stream.reduce((s, r) => s + r.value, 0) / stream.length;
    const std = Math.sqrt(stream.reduce((s, r) => s + Math.pow(r.value - mean, 2), 0) / stream.length);
    const anomalies = stream.filter(r => Math.abs(r.value - mean) > threshold * std);
    this._recordHistory(`anomalyDetection(stream=${stream.length}, threshold=${threshold}) -> ${anomalies.length} anomalies`);
    return { anomalies, count: anomalies.length, threshold };
  }

  public thresholdAlert(sensor: string, value: number, thresholds: { min: number; max: number }): { alert: boolean; sensor: string; value: number; level: string } {
    const alert = value < thresholds.min || value > thresholds.max;
    const level = value > thresholds.max ? 'high' : value < thresholds.min ? 'low' : 'normal';
    this._recordHistory(`thresholdAlert(sensor=${sensor}, value=${value.toFixed(2)}) -> alert=${alert} (${level})`);
    return { alert, sensor, value, level };
  }

  public dataCompression(data: string, method: string): { compressed: string; method: string; ratio: number } {
    const ratio = 0.5 + Math.random() * 0.3;
    const compressed = data.slice(0, Math.floor(data.length * ratio));
    this._recordHistory(`dataCompression(method=${method}) -> ratio=${(ratio * 100).toFixed(1)}%`);
    return { compressed, method, ratio };
  }

  public dataBuffering(data: SensorReading[], size: number, time: number): { buffer: SensorReading[]; size: number; time: number; flushed: boolean } {
    const buffer = data.slice(0, size);
    const flushed = buffer.length >= size;
    this._recordHistory(`dataBuffering(size=${size}, time=${time}ms) -> buffer=${buffer.length}, flushed=${flushed}`);
    return { buffer, size, time, flushed };
  }

  public batchUpload(batch: SensorReading[], endpoint: string): { uploaded: number; endpoint: string; batchSize: number; success: boolean } {
    const success = Math.random() > 0.1;
    this._recordHistory(`batchUpload(batch=${batch.length}, endpoint=${endpoint}) -> success=${success}`);
    return { uploaded: batch.length, endpoint, batchSize: batch.length, success };
  }

  public toPacket(): DataPacket<{
    readings: number;
    streams: number;
    history: string[];
  }> {
    return {
      id: `data-collection-${Date.now()}-${this._counter}`,
      payload: {
        readings: this._readings.length,
        streams: this._streams.size,
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
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }
}
