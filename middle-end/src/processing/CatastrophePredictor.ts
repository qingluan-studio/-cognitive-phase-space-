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
  lyapunovExponent: number;
  cuspPosition: number;
}

export class CatastrophePredictor {
  private _indicators: Map<string, StressIndicator> = new Map();
  private _history: StressIndicator[][] = [];
  private _forecasts: CatastropheForecast[] = [];
  private _collapseThreshold = 0.8;
  private _maxHistory = 10;
  private _bifurcationParam = 0.5;
  private _controlParam = 0.3;
  private _lyapunovWindow = 5;

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
    const lyapunov = this._computeLyapunovExponent();
    const cuspPosition = this._computeCuspCatastrophe(indicators);

    const stressed = indicators.filter(i =>
      i.value > this._collapseThreshold || i.gradient > 0.3
    );
    const divergent = indicators.filter(i => Math.abs(i.gradient) > 0.5);

    let severity: CatastropheForecast['severity'] = 'low';
    const stressScore = stressed.length / Math.max(1, indicators.length);
    const chaosScore = Math.min(1, Math.max(0, lyapunov) * 2);
    const combinedScore = stressScore * 0.5 + chaosScore * 0.3 + cuspPosition * 0.2;

    if (combinedScore > 0.85) severity = 'critical';
    else if (combinedScore > 0.65) severity = 'high';
    else if (combinedScore > 0.4) severity = 'medium';

    const avgGradient = divergent.length > 0
      ? divergent.reduce((s, i) => s + Math.abs(i.gradient), 0) / divergent.length
      : 0;

    const timeToCollapse = lyapunov <= 0
      ? Infinity
      : Math.max(0, Math.round((1 - combinedScore) / Math.max(0.01, lyapunov * avgGradient)));

    const rootCauses = stressed.sort((a, b) => b.value - a.value).map(i => i.metric);
    const confidence = Math.min(1, combinedScore + (1 - Math.exp(-this._history.length / 5)) * 0.2);

    const recommendedAction = severity === 'critical'
      ? 'immediate-shutdown-and-redistribute'
      : severity === 'high'
        ? 'load-shed-and-backpressure'
        : severity === 'medium'
          ? 'throttle-input-and-monitor'
          : 'continue-normal-operation';

    const forecast: CatastropheForecast = {
      severity, timeToCollapse, rootCauses, confidence, recommendedAction,
      lyapunovExponent: lyapunov, cuspPosition,
    };
    this._forecasts.push(forecast);
    return forecast;
  }

  private _computeLyapunovExponent(): number {
    if (this._history.length < this._lyapunovWindow + 1) return -0.5;

    const recent = this._history.slice(-this._lyapunovWindow - 1);
    let totalDivergence = 0;
    let validPairs = 0;

    for (let i = 1; i < recent.length; i++) {
      const prev = recent[i - 1];
      const curr = recent[i];
      const prevMap = new Map(prev.map(x => [x.metric, x.value]));
      const currMap = new Map(curr.map(x => [x.metric, x.value]));

      const allMetrics = new Set([...prevMap.keys(), ...currMap.keys()]);
      let divergence = 0;
      let count = 0;

      for (const metric of allMetrics) {
        const p = prevMap.get(metric) ?? 0;
        const c = currMap.get(metric) ?? 0;
        const diff = Math.abs(c - p);
        if (p !== 0 || c !== 0) {
          divergence += diff / Math.max(0.001, Math.abs(p));
          count++;
        }
      }

      if (count > 0) {
        totalDivergence += Math.log(Math.max(0.001, divergence / count));
        validPairs++;
      }
    }

    return validPairs > 0 ? totalDivergence / validPairs : -0.5;
  }

  private _computeCuspCatastrophe(indicators: StressIndicator[]): number {
    if (indicators.length < 2) return 0;

    const values = indicators.map(i => i.value);
    const gradients = indicators.map(i => i.gradient);

    const avgValue = values.reduce((s, v) => s + v, 0) / values.length;
    const avgGradient = gradients.reduce((s, g) => s + g, 0) / gradients.length;

    const variance = values.reduce((s, v) => s + (v - avgValue) ** 2, 0) / values.length;
    const skewness = values.reduce((s, v) => s + ((v - avgValue) / Math.max(0.001, Math.sqrt(variance))) ** 3, 0) / values.length;

    const a = this._controlParam - 0.5;
    const b = this._bifurcationParam - 0.5;

    const cuspPotential = avgValue ** 4 + a * avgValue ** 2 + b * avgValue;
    const instability = Math.abs(skewness) * 0.3 + variance * 0.4 + Math.abs(avgGradient) * 0.3;

    return Math.min(1, Math.max(0, instability * (1 + cuspPotential * 0.5)));
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

  setControlParam(p: number): void {
    this._controlParam = Math.max(0, Math.min(1, p));
  }

  setBifurcationParam(p: number): void {
    this._bifurcationParam = Math.max(0, Math.min(1, p));
  }

  chaosLevel(): number {
    const lyap = this._computeLyapunovExponent();
    return Math.min(1, Math.max(0, lyap + 0.5));
  }

  reset(): void {
    this._indicators.clear();
    this._history = [];
    this._forecasts = [];
  }

  get indicatorCount(): number { return this._indicators.size; }
  get forecastCount(): number { return this._forecasts.length; }
  get collapseThreshold(): number { return this._collapseThreshold; }
  get controlParam(): number { return this._controlParam; }
  get bifurcationParam(): number { return this._bifurcationParam; }
}
