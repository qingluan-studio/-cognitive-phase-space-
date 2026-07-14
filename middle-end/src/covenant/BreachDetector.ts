/**
 * 违约检测器模块：任何违约立即引发警报。
 * 持续比对预期与实际，差异超阈值即触发警报并上报。
 */

export interface BreachDetectorData {
  checks: number;
  breaches: number;
  severity: 'none' | 'low' | 'high';
  lastBreach: string | null;
}

export class BreachDetector {
  private _checks: number;
  private _breaches: number;
  private _threshold: number;
  private _lastBreach: string | null;
  private _handlers: Array<(b: string) => void>;

  constructor(threshold: number = 0.1) {
    this._checks = 0;
    this._breaches = 0;
    this._threshold = threshold;
    this._lastBreach = null;
    this._handlers = [];
  }

  get severity(): 'none' | 'low' | 'high' {
    if (this._breaches === 0) return 'none';
    const ratio = this._breaches / Math.max(1, this._checks);
    return ratio > 0.3 ? 'high' : 'low';
  }

  get breachCount(): number {
    return this._breaches;
  }

  public check(expected: number, actual: number, label: string): boolean {
    this._checks += 1;
    const diff = Math.abs(expected - actual);
    const ratio = expected === 0 ? diff : diff / Math.abs(expected);
    if (ratio > this._threshold) {
      this._breaches += 1;
      this._lastBreach = `${label}: expected=${expected} actual=${actual}`;
      for (const h of this._handlers) h(this._lastBreach);
      return false;
    }
    return true;
  }

  public onBreach(handler: (b: string) => void): void {
    this._handlers.push(handler);
  }

  public calibrate(threshold: number): void {
    this._threshold = Math.max(0, threshold);
  }

  public reset(): void {
    this._checks = 0;
    this._breaches = 0;
    this._lastBreach = null;
  }

  public report(): BreachDetectorData {
    return {
      checks: this._checks,
      breaches: this._breaches,
      severity: this.severity,
      lastBreach: this._lastBreach,
    };
  }
}
