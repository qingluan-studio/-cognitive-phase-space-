/**
 * 随机放大器模块：在淹没于背景噪声的极微异常信号中，
 * 通过非线性放大与共振增强，将其抬升到可检测阈值之上。
 */

export interface AnomalySignal {
  id: string;
  raw: number;
  amplified: number;
  baseline: number;
  anomalyScore: number;
  detected: boolean;
}

export interface AmplifierConfig {
  noiseFloor: number;
  gain: number;
  saturation: number;
  sensitivity: number;
}

export class StochasticAmplifier {
  private _signals: Map<string, AnomalySignal> = new Map();
  private _config: AmplifierConfig;
  private _baseline: number;
  private _detectionCount = 0;
  private _rejectionCount = 0;

  constructor(config?: Partial<AmplifierConfig>) {
    this._config = {
      noiseFloor: config?.noiseFloor ?? 0.02,
      gain: config?.gain ?? 8,
      saturation: config?.saturation ?? 1,
      sensitivity: config?.sensitivity ?? 0.05,
    };
    this._baseline = this._config.noiseFloor;
  }

  feed(id: string, raw: number): AnomalySignal {
    const deviation = Math.abs(raw - this._baseline);
    const isAnomaly = deviation > this._config.sensitivity;

    let amplified: number;
    let anomalyScore: number;
    if (isAnomaly) {
      amplified = Math.min(this._config.saturation, raw * this._config.gain);
      anomalyScore = Math.min(1, deviation / this._config.sensitivity);
      this._detectionCount++;
    } else {
      amplified = raw;
      anomalyScore = 0;
      this._rejectionCount++;
    }

    const signal: AnomalySignal = {
      id,
      raw,
      amplified,
      baseline: this._baseline,
      anomalyScore,
      detected: isAnomaly,
    };
    this._signals.set(id, signal);
    this._updateBaseline(raw);
    return signal;
  }

  private _updateBaseline(value: number): void {
    const alpha = 0.05;
    this._baseline = this._baseline * (1 - alpha) + value * alpha;
  }

  burstFeed(items: Array<{ id: string; raw: number }>): AnomalySignal[] {
    return items.map(item => this.feed(item.id, item.raw));
  }

  detectedSignals(): AnomalySignal[] {
    return Array.from(this._signals.values()).filter(s => s.detected);
  }

  topAnomalies(limit = 5): AnomalySignal[] {
    return Array.from(this._signals.values())
      .filter(s => s.detected)
      .sort((a, b) => b.anomalyScore - a.anomalyScore)
      .slice(0, limit);
  }

  recalibrate(): void {
    const values = Array.from(this._signals.values()).map(s => s.raw);
    if (values.length > 0) {
      this._baseline = values.reduce((s, v) => s + v, 0) / values.length;
    }
  }

  tune(partial: Partial<AmplifierConfig>): void {
    this._config = { ...this._config, ...partial };
  }

  signalToNoise(): number {
    const detected = this.detectedSignals();
    if (detected.length === 0) return 0;
    const signalPower = detected.reduce((s, x) => s + Math.pow(x.amplified - x.baseline, 2), 0) / detected.length;
    const noisePower = Math.pow(this._config.noiseFloor, 2);
    return noisePower === 0 ? 0 : signalPower / noisePower;
  }

  reset(): void {
    this._signals.clear();
    this._detectionCount = 0;
    this._rejectionCount = 0;
    this._baseline = this._config.noiseFloor;
  }

  get signalCount(): number {
    return this._signals.size;
  }

  get detectionRate(): number {
    const total = this._detectionCount + this._rejectionCount;
    return total === 0 ? 0 : this._detectionCount / total;
  }

  get baseline(): number {
    return this._baseline;
  }

  get config(): AmplifierConfig {
    return { ...this._config };
  }
}
