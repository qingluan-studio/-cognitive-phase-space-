/**
 * 深度声呐模块：向下探测深渊深度。
 * 发射声波并测量回声时间，估算深渊真实深度，支持多次探测取平均。
 */

export interface DepthSoundData {
  pings: number[];
  estimatedDepth: number;
  lastEcho: number;
}

export interface EchoSample {
  sentAt: number;
  receivedAt: number;
  travelTime: number;
}

export class DepthSound {
  private _pings: number[];
  private _maxRange: number;
  private _calibration: number;
  private _samples: EchoSample[];

  constructor(maxRange: number = 10000, calibration: number = 1.0) {
    this._pings = [];
    this._maxRange = maxRange;
    this._calibration = calibration;
    this._samples = [];
  }

  get pingCount(): number {
    return this._pings.length;
  }

  get maxRange(): number {
    return this._maxRange;
  }

  public ping(intensity: number): EchoSample {
    const sentAt = Date.now();
    const travelTime = Math.min(intensity * 10, this._maxRange);
    const receivedAt = sentAt + travelTime;
    const depth = travelTime * this._calibration * 0.5;
    this._pings.push(depth);
    const sample: EchoSample = { sentAt, receivedAt, travelTime };
    this._samples.push(sample);
    return sample;
  }

  public estimateDepth(): number {
    if (this._pings.length === 0) return 0;
    const sorted = [...this._pings].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted[mid];
  }

  public recalibrate(factor: number): void {
    this._calibration = Math.max(0.1, factor);
  }

  public clearSamples(): void {
    this._pings = [];
    this._samples = [];
  }

  public report(): DepthSoundData {
    return {
      pings: [...this._pings],
      estimatedDepth: this.estimateDepth(),
      lastEcho: this._samples.length > 0 ? this._samples[this._samples.length - 1].travelTime : 0,
    };
  }

  public detectAnomalies(): string[] {
    const anomalies: string[] = [];
    const avg = this.estimateDepth();
    for (const p of this._pings) {
      if (Math.abs(p - avg) > avg * 0.5) {
        anomalies.push(`anomaly@${p}m (avg=${avg.toFixed(2)})`);
      }
    }
    return anomalies;
  }
}
