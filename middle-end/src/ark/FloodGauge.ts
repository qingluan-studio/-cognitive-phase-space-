/**
 * 洪水水位计模块：监测信息洪水的危险水位。
 * 实时采集水位样本，超过警戒线时分级报警。
 */

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

  constructor(thresholds: { watch: number; warning: number; critical: number } = {
    watch: 50,
    warning: 75,
    critical: 90,
  }) {
    this._current = 0;
    this._peak = 0;
    this._samples = [];
    this._thresholds = thresholds;
  }

  get current(): number {
    return this._current;
  }

  get peak(): number {
    return this._peak;
  }

  get warningLevel(): 'safe' | 'watch' | 'warning' | 'critical' {
    if (this._current >= this._thresholds.critical) return 'critical';
    if (this._current >= this._thresholds.warning) return 'warning';
    if (this._current >= this._thresholds.watch) return 'watch';
    return 'safe';
  }

  public sample(level: number): void {
    this._current = level;
    this._peak = Math.max(this._peak, level);
    this._samples.push(level);
    if (this._samples.length > 1000) this._samples.shift();
  }

  public resetPeak(): void {
    this._peak = this._current;
  }

  public calibrate(thresholds: Partial<{ watch: number; warning: number; critical: number }>): void {
    this._thresholds = { ...this._thresholds, ...thresholds };
  }

  public trend(): 'rising' | 'falling' | 'flat' {
    if (this._samples.length < 2) return 'flat';
    const recent = this._samples.slice(-5);
    const avg = recent.reduce((s, v) => s + v, 0) / recent.length;
    const prev = this._samples.slice(-10, -5);
    if (prev.length === 0) return 'flat';
    const prevAvg = prev.reduce((s, v) => s + v, 0) / prev.length;
    if (avg > prevAvg * 1.05) return 'rising';
    if (avg < prevAvg * 0.95) return 'falling';
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
}
