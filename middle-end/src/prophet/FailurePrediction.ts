/**
 * 失败预测模块：总是悲观预测，却因此避开失败。
 * 持续假设最坏情况并触发预防措施，从而把可能的失败变成虚惊。
 */

export interface FailurePredictionData {
  predictions: number;
  prevented: number;
  falseAlarms: number;
  pessimism: number;
}

export interface Prediction {
  outcome: 'failure' | 'success';
  confidence: number;
  reason: string;
}

export class FailurePrediction {
  private _predictions: number;
  private _prevented: number;
  private _falseAlarms: number;
  private _pessimism: number;
  private _log: Prediction[];

  constructor(pessimism: number = 0.9) {
    this._predictions = 0;
    this._prevented = 0;
    this._falseAlarms = 0;
    this._pessimism = pessimism;
    this._log = [];
  }

  get pessimism(): number {
    return this._pessimism;
  }

  get preventionRate(): number {
    return this._predictions === 0 ? 0 : this._prevented / this._predictions;
  }

  public predict(riskFactors: number): Prediction {
    this._predictions += 1;
    const willFail = riskFactors * this._pessimism > 0.5;
    const prediction: Prediction = {
      outcome: willFail ? 'failure' : 'success',
      confidence: Math.min(1, riskFactors * this._pessimism),
      reason: willFail ? 'pessimistic-prevention' : 'low-risk',
    };
    this._log.push(prediction);
    if (willFail) this._prevented += 1;
    else this._falseAlarms += 1;
    return prediction;
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
    };
  }
}
