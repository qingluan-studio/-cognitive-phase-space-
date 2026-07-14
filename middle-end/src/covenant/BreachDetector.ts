export interface BreachDetectorData {
  checks: number;
  breaches: number;
  severity: 'none' | 'low' | 'high';
  lastBreach: string | null;
  anomalyScore: number;
  trend: number;
}

interface _CheckRecord {
  label: string;
  expected: number;
  actual: number;
  ratio: number;
  ts: number;
}

export class BreachDetector {
  private _checks: number;
  private _breaches: number;
  private _threshold: number;
  private _lastBreach: string | null;
  private _handlers: Array<(b: string) => void>;
  private _history: _CheckRecord[];
  private _ewma: number;
  private _ewmaAlpha: number;
  private _baselines: Map<string, { mean: number; variance: number; samples: number }>;

  constructor(threshold: number = 0.1, ewmaAlpha: number = 0.3) {
    this._checks = 0;
    this._breaches = 0;
    this._threshold = threshold;
    this._lastBreach = null;
    this._handlers = [];
    this._history = [];
    this._ewma = 0;
    this._ewmaAlpha = ewmaAlpha;
    this._baselines = new Map<string, { mean: number; variance: number; samples: number }>();
  }

  get severity(): 'none' | 'low' | 'high' {
    if (this._breaches === 0) return 'none';
    const ratio = this._breaches / Math.max(1, this._checks);
    return ratio > 0.3 ? 'high' : 'low';
  }

  get breachCount(): number {
    return this._breaches;
  }

  get anomalyScore(): number {
    if (this._history.length === 0) return 0;
    const recent = this._history.slice(-20);
    const mean = recent.reduce((s, r) => s + r.ratio, 0) / recent.length;
    const variance = recent.reduce((s, r) => s + (r.ratio - mean) ** 2, 0) / recent.length;
    const std = Math.sqrt(variance);
    const last = recent[recent.length - 1]?.ratio ?? 0;
    return std === 0 ? 0 : Math.min(1, Math.abs(last - mean) / (3 * std));
  }

  get trend(): number {
    if (this._history.length < 2) return 0;
    const recent = this._history.slice(-10);
    const n = recent.length;
    const xs = recent.map((_, i) => i);
    const ys = recent.map((r) => r.ratio);
    const meanX = xs.reduce((s, x) => s + x, 0) / n;
    const meanY = ys.reduce((s, y) => s + y, 0) / n;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i += 1) {
      num += (xs[i] - meanX) * (ys[i] - meanY);
      den += (xs[i] - meanX) ** 2;
    }
    return den === 0 ? 0 : num / den;
  }

  public check(expected: number, actual: number, label: string): boolean {
    this._checks += 1;
    const diff = Math.abs(expected - actual);
    const ratio = expected === 0 ? diff : diff / Math.abs(expected);
    this._ewma = this._ewma === 0 ? ratio : this._ewmaAlpha * ratio + (1 - this._ewmaAlpha) * this._ewma;
    this._updateBaseline(label, actual);
    const baseline = this._baselines.get(label);
    const zScore = baseline && baseline.variance > 0
      ? Math.abs(actual - baseline.mean) / Math.sqrt(baseline.variance)
      : 0;
    const isBreach = ratio > this._threshold || zScore > 3;
    this._history.push({ label, expected, actual, ratio, ts: Date.now() });
    if (this._history.length > 256) this._history.shift();
    if (isBreach) {
      this._breaches += 1;
      this._lastBreach = `${label}: expected=${expected} actual=${actual} z=${zScore.toFixed(2)}`;
      for (const h of this._handlers) h(this._lastBreach);
      return false;
    }
    return true;
  }

  private _updateBaseline(label: string, value: number): void {
    const current = this._baselines.get(label) ?? { mean: 0, variance: 0, samples: 0 };
    const n = current.samples + 1;
    const delta = value - current.mean;
    const newMean = current.mean + delta / n;
    const newVariance = current.variance + (delta * (value - newMean) - current.variance) / n;
    this._baselines.set(label, { mean: newMean, variance: Math.max(0, newVariance), samples: n });
  }

  public onBreach(handler: (b: string) => void): void {
    this._handlers.push(handler);
  }

  public calibrate(threshold: number): void {
    this._threshold = Math.max(0, threshold);
  }

  public forecastBreach(label: string): number {
    const baseline = this._baselines.get(label);
    if (!baseline || baseline.variance === 0) return 0;
    const deviation = Math.abs(this._ewma - baseline.mean) / Math.sqrt(baseline.variance);
    return Math.min(1, deviation / 3);
  }

  public reset(): void {
    this._checks = 0;
    this._breaches = 0;
    this._lastBreach = null;
    this._history = [];
    this._ewma = 0;
  }

  public report(): BreachDetectorData {
    return {
      checks: this._checks,
      breaches: this._breaches,
      severity: this.severity,
      lastBreach: this._lastBreach,
      anomalyScore: this.anomalyScore,
      trend: this.trend,
    };
  }
}
