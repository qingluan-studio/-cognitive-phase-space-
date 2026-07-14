export interface FailurePredictionData {
  predictions: number;
  prevented: number;
  falseAlarms: number;
  pessimism: number;
  calibration: number;
  brierScore: number;
}

export interface Prediction {
  outcome: 'failure' | 'success';
  confidence: number;
  reason: string;
  expectedUtility: number;
}

interface _PredictionRecord {
  forecast: 'failure' | 'success';
  confidence: number;
  actual: 'failure' | 'success' | null;
  riskFactors: number;
  ts: number;
}

export class FailurePrediction {
  private _predictions: number;
  private _prevented: number;
  private _falseAlarms: number;
  private _pessimism: number;
  private _log: Prediction[];
  private _records: _PredictionRecord[];
  private _riskHistory: number[];
  private _adaptationRate: number;
  private _riskThreshold: number;

  constructor(pessimism: number = 0.9, adaptationRate: number = 0.05, riskThreshold: number = 0.5) {
    this._predictions = 0;
    this._prevented = 0;
    this._falseAlarms = 0;
    this._pessimism = Math.max(0, Math.min(1, pessimism));
    this._log = [];
    this._records = [];
    this._riskHistory = [];
    this._adaptationRate = adaptationRate;
    this._riskThreshold = riskThreshold;
  }

  get pessimism(): number {
    return this._pessimism;
  }

  get preventionRate(): number {
    return this._predictions === 0 ? 0 : this._prevented / this._predictions;
  }

  get calibration(): number {
    if (this._records.length === 0) return 0.5;
    let total = 0;
    let count = 0;
    for (const r of this._records) {
      if (r.actual === null) continue;
      const observed = r.actual === 'failure' ? 1 : 0;
      total += Math.abs(r.confidence - observed);
      count += 1;
    }
    return count === 0 ? 0.5 : 1 - total / count;
  }

  get brierScore(): number {
    if (this._records.length === 0) return 0;
    let acc = 0;
    let count = 0;
    for (const r of this._records) {
      if (r.actual === null) continue;
      const observed = r.actual === 'failure' ? 1 : 0;
      acc += (r.confidence - observed) ** 2;
      count += 1;
    }
    return count === 0 ? 0 : acc / count;
  }

  public predict(riskFactors: number): Prediction {
    this._predictions += 1;
    this._riskHistory.push(riskFactors);
    if (this._riskHistory.length > 100) this._riskHistory.shift();
    const trend = this._computeTrend();
    const adjustedRisk = riskFactors * this._pessimism + trend * this._adaptationRate;
    const willFail = adjustedRisk > this._riskThreshold;
    const confidence = Math.min(1, Math.max(0, adjustedRisk));
    const expectedUtility = willFail
      ? confidence * 10 - (1 - confidence) * 2
      : (1 - confidence) * 5 - confidence * 8;
    const prediction: Prediction = {
      outcome: willFail ? 'failure' : 'success',
      confidence,
      reason: willFail ? 'pessimistic-prevention' : 'low-risk',
      expectedUtility,
    };
    this._log.push(prediction);
    this._records.push({
      forecast: prediction.outcome,
      confidence,
      actual: null,
      riskFactors,
      ts: Date.now(),
    });
    if (willFail) this._prevented += 1;
    else this._falseAlarms += 1;
    this._autoCalibrate();
    return prediction;
  }

  private _computeTrend(): number {
    if (this._riskHistory.length < 2) return 0;
    const n = this._riskHistory.length;
    const xs = Array.from({ length: n }, (_, i) => i);
    const ys = this._riskHistory;
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

  private _autoCalibrate(): void {
    if (this._records.length < 10) return;
    const recent = this._records.slice(-10);
    const failureRate = recent.filter((r) => r.forecast === 'failure').length / recent.length;
    const error = failureRate - this._pessimism;
    this._pessimism = Math.max(0.1, Math.min(1, this._pessimism + error * this._adaptationRate));
  }

  public resolve(predictionIndex: number, actual: 'failure' | 'success'): void {
    const record = this._records[predictionIndex];
    if (!record) return;
    record.actual = actual;
  }

  public harden(factor: number): void {
    this._pessimism = Math.min(1, this._pessimism + factor);
  }

  public soften(factor: number): void {
    this._pessimism = Math.max(0, this._pessimism - factor);
  }

  public mitigate(): void {
    this._prevented += 1;
  }

  public history(): Prediction[] {
    return [...this._log];
  }

  public report(): FailurePredictionData {
    return {
      predictions: this._predictions,
      prevented: this._prevented,
      falseAlarms: this._falseAlarms,
      pessimism: this._pessimism,
      calibration: this.calibration,
      brierScore: this.brierScore,
    };
  }
}
