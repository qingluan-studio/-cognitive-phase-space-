export interface FloodGaugeData {
  current: number;
  peak: number;
  warningLevel: 'safe' | 'watch' | 'warning' | 'critical';
  samples: number;
}

export class FloodGauge {
  private _current: number;
  private _peak: number;
  private _samples: number[];
  private _thresholds: { watch: number; warning: number; critical: number };
  private _shannonEntropy: number;
  private _fractalDimension: number;
  private _markovState: number;
  private _probabilityModel: number[];

  constructor(thresholds: { watch: number; warning: number; critical: number } = {
    watch: 50,
    warning: 75,
    critical: 90,
  }) {
    this._current = 0;
    this._peak = 0;
    this._samples = [];
    this._thresholds = thresholds;
    this._shannonEntropy = 0;
    this._fractalDimension = 1;
    this._markovState = 0;
    this._probabilityModel = [0.25, 0.25, 0.25, 0.25];
  }

  get current(): number {
    return this._current;
  }

  get peak(): number {
    return this._peak;
  }

  get warningLevel(): 'safe' | 'watch' | 'warning' | 'critical' {
    if (this._current >= this._thresholds.critical) {
      return 'critical';
    }
    if (this._current >= this._thresholds.warning) {
      return 'warning';
    }
    if (this._current >= this._thresholds.watch) {
      return 'watch';
    }
    return 'safe';
  }

  get shannonEntropy(): number {
    return this._shannonEntropy;
  }

  get fractalDimension(): number {
    return this._fractalDimension;
  }

  get floodProbability(): number {
    return this._probabilityModel[3];
  }

  public sample(level: number): void {
    this._current = level;
    this._peak = Math.max(this._peak, level);
    this._samples.push(level);
    if (this._samples.length > 1000) {
      this._samples.shift();
    }
    this._updateShannonEntropy();
    this._updateFractalDimension();
    this._updateMarkovState(level);
    this._updateProbabilityModel();
  }

  public resetPeak(): void {
    this._peak = this._current;
  }

  public calibrate(thresholds: Partial<{ watch: number; warning: number; critical: number }>): void {
    this._thresholds = { ...this._thresholds, ...thresholds };
  }

  public trend(): 'rising' | 'falling' | 'flat' {
    if (this._samples.length < 2) {
      return 'flat';
    }
    const recent = this._samples.slice(-5);
    const avg = recent.reduce((s, v) => s + v, 0) / recent.length;
    const prev = this._samples.slice(-10, -5);
    if (prev.length === 0) {
      return 'flat';
    }
    const prevAvg = prev.reduce((s, v) => s + v, 0) / prev.length;
    if (avg > prevAvg * 1.05) {
      return 'rising';
    }
    if (avg < prevAvg * 0.95) {
      return 'falling';
    }
    return 'flat';
  }

  public report(): FloodGaugeData {
    return {
      current: this._current,
      peak: this._peak,
      warningLevel: this.warningLevel,
      samples: this._samples.length,
    };
  }

  public predictNext(): number {
    if (this._samples.length < 2) {
      return this._current;
    }
    const n = this._samples.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    for (let i = 0; i < n; i++) {
      const x = i;
      const y = this._samples[i];
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    return slope * n + intercept;
  }

  public computeAutoCorrelation(lag: number): number {
    if (this._samples.length <= lag) {
      return 0;
    }
    const mean = this._samples.reduce((s, v) => s + v, 0) / this._samples.length;
    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < this._samples.length - lag; i++) {
      numerator += (this._samples[i] - mean) * (this._samples[i + lag] - mean);
    }
    for (let i = 0; i < this._samples.length; i++) {
      denominator += (this._samples[i] - mean) ** 2;
    }
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private _updateShannonEntropy(): void {
    const buckets = new Map<number, number>();
    for (const s of this._samples) {
      const b = Math.floor(s / 10);
      buckets.set(b, (buckets.get(b) ?? 0) + 1);
    }
    const total = this._samples.length;
    if (total === 0) {
      this._shannonEntropy = 0;
      return;
    }
    let entropy = 0;
    for (const count of buckets.values()) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }
    this._shannonEntropy = entropy;
  }

  private _updateFractalDimension(): void {
    if (this._samples.length < 4) {
      this._fractalDimension = 1;
      return;
    }
    const n = this._samples.length;
    const scales = [2, 4, 8];
    let totalLength = 0;
    for (let i = 1; i < n; i++) {
      totalLength += Math.abs(this._samples[i] - this._samples[i - 1]);
    }
    let logSum = 0;
    for (const scale of scales) {
      let boxCount = 0;
      for (let i = 0; i < n; i += scale) {
        const slice = this._samples.slice(i, i + scale);
        if (slice.length > 0) {
          boxCount += 1;
        }
      }
      if (boxCount > 0) {
        logSum += Math.log(totalLength / boxCount);
      }
    }
    this._fractalDimension = 1 + logSum / scales.length / Math.log(2);
  }

  private _updateMarkovState(level: number): void {
    if (level < this._thresholds.watch) {
      this._markovState = 0;
    } else if (level < this._thresholds.warning) {
      this._markovState = 1;
    } else if (level < this._thresholds.critical) {
      this._markovState = 2;
    } else {
      this._markovState = 3;
    }
  }

  private _updateProbabilityModel(): void {
    if (this._samples.length < 4) {
      return;
    }
    const counts = [0, 0, 0, 0];
    for (const s of this._samples) {
      if (s < this._thresholds.watch) {
        counts[0] += 1;
      } else if (s < this._thresholds.warning) {
        counts[1] += 1;
      } else if (s < this._thresholds.critical) {
        counts[2] += 1;
      } else {
        counts[3] += 1;
      }
    }
    const total = counts.reduce((s, v) => s + v, 0);
    this._probabilityModel = counts.map((c) => c / total);
  }
}
