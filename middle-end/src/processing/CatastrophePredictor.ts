/**
 * 灾变预测器模块：在预处理阶段识别即将发生的处理链崩溃，
 * 基于拓扑奇点与导数发散检测提前预警灾变临界点。
 */

export interface StressIndicator {
  id: string;
  metric: string;
  value: number;
  gradient: number;
  timestamp: number;
}

export interface CatastropheForecast {
  severity: 'low' | 'medium' | 'high' | 'critical';
  timeToCollapse: number;
  rootCauses: string[];
  confidence: number;
  recommendedAction: string;
}

export class CatastrophePredictor {
  private _indicators: Map<string, StressIndicator> = new Map();
  private _history: StressIndicator[][] = [];
  private _forecasts: CatastropheForecast[] = [];
  private _collapseThreshold = 0.8;
  private _maxHistory = 10;

  recordIndicator(indicator: StressIndicator): void {
    const existing = this._indicators.get(indicator.id);
    if (existing) {
      indicator.gradient = indicator.value - existing.value;
    }
    this._indicators.set(indicator.id, indicator);
  }

  snapshot(): void {
    this._history.push(Array.from(this._indicators.values()));
    if (this._history.length > this._maxHistory) this._history.shift();
  }

  forecast(): CatastropheForecast {
    const indicators = Array.from(this._indicators.values());
    const stressed = indicators.filter(i => i.value > this._collapseThreshold || i.gradient > 0.3);
    const divergent = indicators.filter(i => Math.abs(i.gradient) > 0.5);

    let severity: CatastropheForecast['severity'] = 'low';
    const stressScore = stressed.length / Math.max(1, indicators.length);
    if (stressScore > 0.75) severity = 'critical';
    else if (stressScore > 0.5) severity = 'high';
    else if (stressScore > 0.25) severity = 'medium';

    const avgGradient = divergent.length > 0
      ? divergent.reduce((s, i) => s + Math.abs(i.gradient), 0) / divergent.length
      : 0;
    const timeToCollapse = avgGradient === 0 ? Infinity : Math.max(0, Math.round((1 - stressScore) / avgGradient));

    const rootCauses = stressed.map(i => i.metric);
    const confidence = Math.min(1, stressScore + avgGradient * 0.5);

    const recommendedAction = severity === 'critical'
      ? 'immediate-shutdown-and-redistribute'
      : severity === 'high'
        ? 'load-shed-and-backpressure'
        : severity === 'medium'
          ? 'throttle-input-and-monitor'
          : 'continue-normal-operation';

    const forecast: CatastropheForecast = {
      severity,
      timeToCollapse,
      rootCauses,
      confidence,
      recommendedAction,
    };
    this._forecasts.push(forecast);
    return forecast;
  }

  isApproachingCollapse(): boolean {
    const latest = this._forecasts[this._forecasts.length - 1];
    return latest ? (latest.severity === 'high' || latest.severity === 'critical') : false;
  }

  collapseTrajectory(): number[] {
    return this._history.map(snapshot =>
      snapshot.reduce((s, i) => s + i.value, 0) / Math.max(1, snapshot.length)
    );
  }

  topStressMetrics(limit = 3): StressIndicator[] {
    return Array.from(this._indicators.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);
  }

  setCollapseThreshold(t: number): void {
    this._collapseThreshold = Math.max(0, Math.min(1, t));
  }

  reset(): void {
    this._indicators.clear();
    this._history = [];
    this._forecasts = [];
  }

  get indicatorCount(): number {
    return this._indicators.size;
  }

  get forecastCount(): number {
    return this._forecasts.length;
  }

  get collapseThreshold(): number {
    return this._collapseThreshold;
  }
}
