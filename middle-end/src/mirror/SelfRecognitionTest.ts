export interface RecognitionTrial {
  trialId: number;
  stimulus: string;
  response: string;
  match: boolean;
  confidence: number;
}

export type RecognitionMetrics = {
  accuracy: number;
  dPrime: number;
  criterion: number;
};

export interface SelfRecognitionConfig {
  trials: number;
  threshold: number;
  noiseStd: number;
}

export class SelfRecognitionTest {
  private _config: SelfRecognitionConfig;
  private _trials: RecognitionTrial[] = [];
  private _metrics: RecognitionMetrics | null = null;
  private _state: Record<string, unknown> = {};
  private _signalDistribution: number[] = [];
  private _noiseDistribution: number[] = [];
  private _receiverOperatingCurve: number[][] = [];

  constructor(config: SelfRecognitionConfig) {
    this._config = config;
  }

  get trialCount(): number {
    return this._trials.length;
  }

  get accuracy(): number {
    if (this._trials.length === 0) return 0;
    return this._trials.filter((t) => t.match).length / this._trials.length;
  }

  get dPrime(): number {
    return this._metrics ? this._metrics.dPrime : 0;
  }

  private _gaussianSample(mean: number, std: number): number {
    let u = 0;
    let v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  private _updateDistributions(trial: RecognitionTrial): void {
    if (trial.match) {
      this._signalDistribution.push(trial.confidence);
    } else {
      this._noiseDistribution.push(trial.confidence);
    }
    if (this._signalDistribution.length > 30) this._signalDistribution.shift();
    if (this._noiseDistribution.length > 30) this._noiseDistribution.shift();
  }

  private _computeROC(): void {
    this._receiverOperatingCurve = [];
    for (let c = 0; c <= 1; c += 0.1) {
      const hits = this._signalDistribution.filter((v) => v >= c).length;
      const fa = this._noiseDistribution.filter((v) => v >= c).length;
      const hr = this._signalDistribution.length > 0 ? hits / this._signalDistribution.length : 0;
      const far = this._noiseDistribution.length > 0 ? fa / this._noiseDistribution.length : 0;
      this._receiverOperatingCurve.push([far, hr]);
    }
  }

  runTrial(stimulus: string, isSelf: boolean): RecognitionTrial {
    const signal = isSelf ? this._gaussianSample(0.8, this._config.noiseStd) : this._gaussianSample(0.3, this._config.noiseStd);
    const response = signal > this._config.threshold ? 'self' : 'other';
    const match = (isSelf && response === 'self') || (!isSelf && response === 'other');
    const confidence = Math.abs(signal - this._config.threshold);
    const trial: RecognitionTrial = {
      trialId: this._trials.length,
      stimulus,
      response,
      match,
      confidence,
    };
    this._trials.push(trial);
    if (this._trials.length > this._config.trials) this._trials.shift();
    this._updateDistributions(trial);
    this._computeROC();
    this._state.lastTrial = trial.trialId;
    return trial;
  }

  computeMetrics(): RecognitionMetrics {
    const hits = this._trials.filter((t) => t.match && t.response === 'self').length;
    const misses = this._trials.filter((t) => !t.match && t.stimulus === 'self').length;
    const fas = this._trials.filter((t) => !t.match && t.response === 'self').length;
    const crs = this._trials.filter((t) => t.match && t.response === 'other').length;
    const hr = hits + misses > 0 ? hits / (hits + misses) : 0.5;
    const far = fas + crs > 0 ? fas / (fas + crs) : 0.5;
    const zHit = this._inverseNormal(hr);
    const zFa = this._inverseNormal(far);
    const dPrime = zHit - zFa;
    const criterion = -(zHit + zFa) / 2;
    this._metrics = { accuracy: this.accuracy, dPrime, criterion };
    return this._metrics;
  }

  private _inverseNormal(p: number): number {
    if (p <= 0) return -3;
    if (p >= 1) return 3;
    const a1 = -3.969683028665376e1;
    const a2 = 2.209460984245205e2;
    const a3 = -2.759285104469687e2;
    const a4 = 1.38357751867269e2;
    const a5 = -3.066479806614716e1;
    const a6 = 2.506628277459239;
    const b1 = -5.447609879822406e1;
    const b2 = 1.615858368580409e2;
    const b3 = -1.556989798598866e2;
    const b4 = 6.680131188771972e1;
    const b5 = -1.328068155288572e1;
    const c1 = -7.784894002430293e-3;
    const c2 = -3.223964580411365e-1;
    const c3 = -2.400758277161838;
    const c4 = -2.549732539343734;
    const c5 = 4.374664141464968;
    const c6 = 2.938163982698783;
    const d1 = 7.784695709041462e-3;
    const d2 = 3.224671290700398e-1;
    const d3 = 2.445134137142996;
    const d4 = 3.754408661907416;
    const pLow = 0.02425;
    const pHigh = 1 - pLow;
    let q: number;
    let r: number;
    if (p < pLow) {
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) / ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
    } else if (p <= pHigh) {
      q = p - 0.5;
      r = q * q;
      return (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q / (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
    } else {
      q = Math.sqrt(-2 * Math.log(1 - p));
      return -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) / ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
    }
  }

  isRecognizing(): boolean {
    return this.computeMetrics().dPrime > 1;
  }

  areaUnderROC(): number {
    let area = 0;
    for (let i = 1; i < this._receiverOperatingCurve.length; i++) {
      const dx = this._receiverOperatingCurve[i][0] - this._receiverOperatingCurve[i - 1][0];
      const avgY = (this._receiverOperatingCurve[i][1] + this._receiverOperatingCurve[i - 1][1]) / 2;
      area += dx * avgY;
    }
    return area;
  }

  reset(): void {
    this._trials = [];
    this._metrics = null;
    this._signalDistribution = [];
    this._noiseDistribution = [];
    this._receiverOperatingCurve = [];
    this._state = {};
  }

  report(): Record<string, unknown> {
    return {
      trials: this._trials.length,
      accuracy: this.accuracy.toFixed(3),
      metrics: this._metrics,
      state: this._state,
      dPrime: this.dPrime.toFixed(4),
      auc: this.areaUnderROC().toFixed(4),
    };
  }
}
