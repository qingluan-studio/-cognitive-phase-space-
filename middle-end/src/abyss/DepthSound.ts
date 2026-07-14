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
  private _fourierCache: number[];
  private _bayesianPrior: number;
  private _posteriorVariance: number;

  constructor(maxRange: number = 10000, calibration: number = 1.0) {
    this._pings = [];
    this._maxRange = maxRange;
    this._calibration = calibration;
    this._samples = [];
    this._fourierCache = [];
    this._bayesianPrior = maxRange / 2;
    this._posteriorVariance = maxRange * maxRange / 12;
  }

  get pingCount(): number {
    return this._pings.length;
  }

  get maxRange(): number {
    return this._maxRange;
  }

  get posteriorMean(): number {
    return this._bayesianPrior;
  }

  get posteriorStd(): number {
    return Math.sqrt(this._posteriorVariance);
  }

  public ping(intensity: number): EchoSample {
    const sentAt = Date.now();
    const noise = this._generateGaussian(0, intensity * 0.05);
    const travelTime = Math.min(intensity * 10 + noise, this._maxRange);
    const receivedAt = sentAt + Math.abs(travelTime);
    const depth = travelTime * this._calibration * 0.5;
    this._pings.push(depth);
    const sample: EchoSample = { sentAt, receivedAt, travelTime };
    this._samples.push(sample);
    this._updateBayesianEstimate(depth);
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
    this._pings = this._pings.map(p => p * factor / this._calibration);
  }

  public clearSamples(): void {
    this._pings = [];
    this._samples = [];
    this._fourierCache = [];
    this._bayesianPrior = this._maxRange / 2;
    this._posteriorVariance = this._maxRange * this._maxRange / 12;
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
    const std = this._computeStd();
    for (const p of this._pings) {
      if (Math.abs(p - avg) > 2 * std + avg * 0.1) {
        anomalies.push(`anomaly@${p.toFixed(2)}m (avg=${avg.toFixed(2)},std=${std.toFixed(2)})`);
      }
    }
    return anomalies;
  }

  public computeDFT(): number[] {
    const N = this._pings.length;
    if (N === 0) return [];
    const result: number[] = new Array(N).fill(0);
    for (let k = 0; k < N; k++) {
      let real = 0;
      let imag = 0;
      for (let n = 0; n < N; n++) {
        const angle = -2 * Math.PI * k * n / N;
        real += this._pings[n] * Math.cos(angle);
        imag += this._pings[n] * Math.sin(angle);
      }
      result[k] = Math.sqrt(real * real + imag * imag);
    }
    this._fourierCache = [...result];
    return result;
  }

  public confidenceInterval(level: number): [number, number] {
    const mean = this._bayesianPrior;
    const z = level >= 0.95 ? 1.96 : level >= 0.9 ? 1.645 : 1.0;
    const margin = z * this.posteriorStd;
    return [Math.max(0, mean - margin), mean + margin];
  }

  private _generateGaussian(mean: number, std: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z0 * std;
  }

  private _updateBayesianEstimate(observation: number): void {
    const priorVar = this._posteriorVariance;
    const obsVar = observation * observation * 0.01 + 1;
    const posteriorVar = 1 / (1 / priorVar + 1 / obsVar);
    const posteriorMean = posteriorVar * (this._bayesianPrior / priorVar + observation / obsVar);
    this._bayesianPrior = posteriorMean;
    this._posteriorVariance = posteriorVar;
  }

  private _computeStd(): number {
    if (this._pings.length < 2) return 0;
    const mean = this._pings.reduce((a, b) => a + b, 0) / this._pings.length;
    const sq = this._pings.reduce((s, p) => s + (p - mean) * (p - mean), 0);
    return Math.sqrt(sq / (this._pings.length - 1));
  }
}
