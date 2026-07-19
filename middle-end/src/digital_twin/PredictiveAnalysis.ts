import { DataPacket } from '../shared/types';

export interface TrendPrediction {
  id: string;
  metric: string;
  algorithm: string;
  horizon: number;
  predictions: { time: number; value: number; lowerBound: number; upperBound: number }[];
  confidence: number;
  modelParams: Record<string, number>;
  lastTrained: number;
  trainingSamples: number;
}

export interface AnomalyPrediction {
  id: string;
  metric: string;
  method: string;
  threshold: number;
  anomalies: { time: number; value: number; severity: 'low' | 'medium' | 'high' | 'critical'; score: number }[];
  detectionRate: number;
  falsePositiveRate: number;
  lastChecked: number;
  totalAnomalies: number;
}

export interface RemainingUsefulLife {
  id: string;
  component: string;
  method: string;
  currentAge: number;
  predictedRul: number;
  confidence: number;
  lowerBound: number;
  upperBound: number;
  failureThreshold: number;
  degradationRate: number;
  lastUpdated: number;
}

export interface ReliabilityAnalysis {
  id: string;
  system: string;
  method: string;
  reliability: number;
  mtbf: number;
  mttr: number;
  availability: number;
  failureRate: number;
  confidence: number;
  timePeriod: number;
  faultTree: { node: string; probability: number; children: string[] }[];
}

export interface PredictiveAnalysisResult {
  trendPredictions: TrendPrediction[];
  anomalyPredictions: AnomalyPrediction[];
  rulPredictions: RemainingUsefulLife[];
  reliabilityAnalyses: ReliabilityAnalysis[];
  totalPredictions: number;
  avgConfidence: number;
  predictionStatus: 'idle' | 'predicting' | 'completed' | 'failed';
}

export class PredictiveAnalysis {
  private _trendPredictions: Map<string, TrendPrediction> = new Map();
  private _anomalyPredictions: Map<string, AnomalyPrediction> = new Map();
  private _rulPredictions: Map<string, RemainingUsefulLife> = new Map();
  private _reliabilityAnalyses: Map<string, ReliabilityAnalysis> = new Map();
  private _historicalData: Map<string, { time: number; value: number }[]> = new Map();
  private _counter: number = 0;
  private _lastResult: PredictiveAnalysisResult | null = null;
  private _modelRegistry: Map<string, { type: string; createdAt: number; lastUsed: number }> = new Map();
  private _featureLibrary: Map<string, { name: string; type: string; description: string }> = new Map();
  private _predictionStats: {
    totalPredictions: number;
    successfulPredictions: number;
    avgConfidence: number;
    avgError: number;
  } = {
    totalPredictions: 0,
    successfulPredictions: 0,
    avgConfidence: 0,
    avgError: 0,
  };
  private _degradationModels: Map<string, { type: string; parameters: Record<string, number> }> = new Map();
  private _alertRules: Map<string, {
    metric: string;
    condition: string;
    threshold: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    enabled: boolean;
  }> = new Map();

  constructor() {
    this._initFeatureLibrary();
    this._initDegradationModels();
    this._initAlertRules();
  }

  private _initFeatureLibrary(): void {
    const features = [
      { name: 'mean', type: 'statistical', description: 'Mean value over window' },
      { name: 'std', type: 'statistical', description: 'Standard deviation' },
      { name: 'max', type: 'statistical', description: 'Maximum value' },
      { name: 'min', type: 'statistical', description: 'Minimum value' },
      { name: 'rms', type: 'statistical', description: 'Root mean square' },
      { name: 'peak_to_peak', type: 'statistical', description: 'Peak to peak value' },
      { name: 'skewness', type: 'statistical', description: 'Distribution skewness' },
      { name: 'kurtosis', type: 'statistical', description: 'Distribution kurtosis' },
      { name: 'trend', type: 'temporal', description: 'Linear trend coefficient' },
      { name: 'autocorrelation', type: 'temporal', description: 'Autocorrelation at lag 1' },
      { name: 'fft_peak', type: 'frequency', description: 'Peak frequency component' },
      { name: 'band_energy', type: 'frequency', description: 'Energy in frequency band' },
    ];
    features.forEach(f => this._featureLibrary.set(f.name, f));
  }

  private _initDegradationModels(): void {
    const models = [
      { name: 'linear', model: { type: 'linear', parameters: { slope: 0.01, intercept: 0 } } },
      { name: 'exponential', model: { type: 'exponential', parameters: { lambda: 0.001, alpha: 1 } } },
      { name: 'power_law', model: { type: 'power_law', parameters: { a: 0.01, b: 1.5 } } },
      { name: 'logistic', model: { type: 'logistic', parameters: { L: 1, k: 0.5, x0: 1000 } } },
      { name: 'weibull', model: { type: 'weibull', parameters: { shape: 2, scale: 1000 } } },
    ];
    models.forEach(m => this._degradationModels.set(m.name, m.model));
  }

  private _initAlertRules(): void {
    const rules = [
      { name: 'high_temp', rule: { metric: 'temperature', condition: '>', threshold: 80, severity: 'high' as const, enabled: true } },
      { name: 'low_pressure', rule: { metric: 'pressure', condition: '<', threshold: 50, severity: 'medium' as const, enabled: true } },
      { name: 'high_vibration', rule: { metric: 'vibration', condition: '>', threshold: 5, severity: 'critical' as const, enabled: true } },
      { name: 'efficiency_drop', rule: { metric: 'efficiency', condition: '<', threshold: 0.8, severity: 'medium' as const, enabled: true } },
    ];
    rules.forEach(r => this._alertRules.set(r.name, r.rule));
  }

  get trendPredictions(): TrendPrediction[] {
    return Array.from(this._trendPredictions.values());
  }

  get anomalyPredictions(): AnomalyPrediction[] {
    return Array.from(this._anomalyPredictions.values());
  }

  get rulPredictions(): RemainingUsefulLife[] {
    return Array.from(this._rulPredictions.values());
  }

  get reliabilityAnalyses(): ReliabilityAnalysis[] {
    return Array.from(this._reliabilityAnalyses.values());
  }

  get totalPredictions(): number {
    return (
      this._trendPredictions.size +
      this._anomalyPredictions.size +
      this._rulPredictions.size +
      this._reliabilityAnalyses.size
    );
  }

  get avgConfidence(): number {
    if (this.totalPredictions === 0) return 0;
    let total = 0;
    for (const p of this._trendPredictions.values()) total += p.confidence;
    for (const a of this._anomalyPredictions.values()) total += a.detectionRate;
    for (const r of this._rulPredictions.values()) total += r.confidence;
    for (const rel of this._reliabilityAnalyses.values()) total += rel.confidence;
    return total / this.totalPredictions;
  }

  get predictionStats(): {
    totalPredictions: number;
    successfulPredictions: number;
    avgConfidence: number;
    avgError: number;
  } {
    return { ...this._predictionStats };
  }

  addHistoricalData(metricId: string, data: { time: number; value: number }[]): number {
    if (!this._historicalData.has(metricId)) {
      this._historicalData.set(metricId, []);
    }
    const history = this._historicalData.get(metricId)!;
    let added = 0;
    for (const point of data) {
      history.push(point);
      added++;
    }
    history.sort((a, b) => a.time - b.time);
    if (history.length > 10000) {
      history.splice(0, history.length - 10000);
    }
    return added;
  }

  getHistoricalData(metricId: string, limit?: number): { time: number; value: number }[] {
    const data = this._historicalData.get(metricId) ?? [];
    if (limit === undefined) return [...data];
    return data.slice(-limit);
  }

  createTrendPrediction(
    metric: string,
    algorithm: string,
    horizon: number,
    params: { modelParams?: Record<string, number>; trainingSamples?: number } = {}
  ): TrendPrediction {
    const id = `trend-${Date.now()}-${this._counter++}`;
    const history = this._historicalData.get(metric) ?? [];
    const predictions: { time: number; value: number; lowerBound: number; upperBound: number }[] = [];
    const lastTime = history.length > 0 ? history[history.length - 1].time : Date.now();
    const lastValue = history.length > 0 ? history[history.length - 1].value : 0;
    const trend = this._estimateTrend(history);
    const volatility = this._estimateVolatility(history);
    for (let i = 0; i < horizon; i++) {
      const time = lastTime + (i + 1) * 1000;
      const value = lastValue + trend * (i + 1);
      const uncertainty = volatility * Math.sqrt(i + 1);
      predictions.push({
        time,
        value,
        lowerBound: value - uncertainty * 1.96,
        upperBound: value + uncertainty * 1.96,
      });
    }
    const prediction: TrendPrediction = {
      id,
      metric,
      algorithm,
      horizon,
      predictions,
      confidence: 0.85 + Math.random() * 0.1,
      modelParams: params.modelParams ?? { trend, volatility },
      lastTrained: Date.now(),
      trainingSamples: params.trainingSamples ?? history.length,
    };
    this._trendPredictions.set(id, prediction);
    this._modelRegistry.set(id, { type: 'trend', createdAt: Date.now(), lastUsed: Date.now() });
    this._predictionStats.totalPredictions++;
    this._updateAvgConfidence(prediction.confidence);
    return prediction;
  }

  createAnomalyPrediction(
    metric: string,
    method: string,
    threshold: number,
    params: { detectionRate?: number; falsePositiveRate?: number } = {}
  ): AnomalyPrediction {
    const id = `anomaly-${Date.now()}-${this._counter++}`;
    const history = this._historicalData.get(metric) ?? [];
    const anomalies: { time: number; value: number; severity: 'low' | 'medium' | 'high' | 'critical'; score: number }[] = [];
    const stats = this._computeStatistics(history.map(d => d.value));
    for (const point of history) {
      const zScore = Math.abs((point.value - stats.mean) / stats.std);
      if (zScore > threshold) {
        let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
        if (zScore > threshold * 3) severity = 'critical';
        else if (zScore > threshold * 2) severity = 'high';
        else if (zScore > threshold * 1.5) severity = 'medium';
        anomalies.push({ time: point.time, value: point.value, severity, score: zScore });
      }
    }
    const prediction: AnomalyPrediction = {
      id,
      metric,
      method,
      threshold,
      anomalies,
      detectionRate: params.detectionRate ?? 0.9,
      falsePositiveRate: params.falsePositiveRate ?? 0.05,
      lastChecked: Date.now(),
      totalAnomalies: anomalies.length,
    };
    this._anomalyPredictions.set(id, prediction);
    this._modelRegistry.set(id, { type: 'anomaly', createdAt: Date.now(), lastUsed: Date.now() });
    this._predictionStats.totalPredictions++;
    return prediction;
  }

  createRulPrediction(
    component: string,
    method: string,
    currentAge: number,
    params: {
      failureThreshold?: number;
      degradationRate?: number;
      confidence?: number;
    } = {}
  ): RemainingUsefulLife {
    const id = `rul-${Date.now()}-${this._counter++}`;
    const failureThreshold = params.failureThreshold ?? 100;
    const degradationRate = params.degradationRate ?? 0.01;
    const currentDegradation = currentAge * degradationRate;
    const remainingLife = Math.max(0, (failureThreshold - currentDegradation) / degradationRate);
    const confidence = params.confidence ?? 0.8;
    const uncertainty = remainingLife * (1 - confidence);
    const prediction: RemainingUsefulLife = {
      id,
      component,
      method,
      currentAge,
      predictedRul: remainingLife,
      confidence,
      lowerBound: Math.max(0, remainingLife - uncertainty),
      upperBound: remainingLife + uncertainty,
      failureThreshold,
      degradationRate,
      lastUpdated: Date.now(),
    };
    this._rulPredictions.set(id, prediction);
    this._modelRegistry.set(id, { type: 'rul', createdAt: Date.now(), lastUsed: Date.now() });
    this._predictionStats.totalPredictions++;
    this._updateAvgConfidence(confidence);
    return prediction;
  }

  createReliabilityAnalysis(
    system: string,
    method: string,
    timePeriod: number,
    params: {
      mtbf?: number;
      mttr?: number;
      components?: string[];
    } = {}
  ): ReliabilityAnalysis {
    const id = `rel-${Date.now()}-${this._counter++}`;
    const mtbf = params.mtbf ?? 1000;
    const mttr = params.mttr ?? 10;
    const failureRate = 1 / mtbf;
    const reliability = Math.exp(-failureRate * timePeriod);
    const availability = mtbf / (mtbf + mttr);
    const faultTree: { node: string; probability: number; children: string[] }[] = [
      { node: 'system_failure', probability: 1 - reliability, children: ['subsystem_a', 'subsystem_b'] },
      { node: 'subsystem_a', probability: (1 - reliability) * 0.6, children: ['component_1', 'component_2'] },
      { node: 'subsystem_b', probability: (1 - reliability) * 0.4, children: ['component_3'] },
      { node: 'component_1', probability: failureRate * timePeriod * 0.3, children: [] },
      { node: 'component_2', probability: failureRate * timePeriod * 0.3, children: [] },
      { node: 'component_3', probability: failureRate * timePeriod * 0.4, children: [] },
    ];
    const analysis: ReliabilityAnalysis = {
      id,
      system,
      method,
      reliability,
      mtbf,
      mttr,
      availability,
      failureRate,
      confidence: 0.85,
      timePeriod,
      faultTree,
    };
    this._reliabilityAnalyses.set(id, analysis);
    this._modelRegistry.set(id, { type: 'reliability', createdAt: Date.now(), lastUsed: Date.now() });
    this._predictionStats.totalPredictions++;
    this._updateAvgConfidence(analysis.confidence);
    return analysis;
  }

  updatePrediction(predictionId: string): { updated: boolean; newConfidence: number } {
    const trend = this._trendPredictions.get(predictionId);
    if (trend) {
      const history = this._historicalData.get(trend.metric) ?? [];
      const newTrend = this._estimateTrend(history);
      const volatility = this._estimateVolatility(history);
      trend.modelParams.trend = newTrend;
      trend.modelParams.volatility = volatility;
      trend.lastTrained = Date.now();
      trend.trainingSamples = history.length;
      trend.confidence = Math.min(0.99, trend.confidence + 0.01);
      const modelEntry = this._modelRegistry.get(predictionId);
      if (modelEntry) modelEntry.lastUsed = Date.now();
      this._predictionStats.successfulPredictions++;
      return { updated: true, newConfidence: trend.confidence };
    }
    const anomaly = this._anomalyPredictions.get(predictionId);
    if (anomaly) {
      anomaly.lastChecked = Date.now();
      return { updated: true, newConfidence: anomaly.detectionRate };
    }
    const rul = this._rulPredictions.get(predictionId);
    if (rul) {
      rul.lastUpdated = Date.now();
      return { updated: true, newConfidence: rul.confidence };
    }
    const reliability = this._reliabilityAnalyses.get(predictionId);
    if (reliability) {
      return { updated: true, newConfidence: reliability.confidence };
    }
    return { updated: false, newConfidence: 0 };
  }

  detectAnomalies(metricId: string, method: string = 'z_score'): {
    anomalies: { time: number; value: number; score: number; severity: string }[];
    count: number;
  } {
    const history = this._historicalData.get(metricId) ?? [];
    const stats = this._computeStatistics(history.map(d => d.value));
    const anomalies: { time: number; value: number; score: number; severity: string }[] = [];
    for (const point of history) {
      let score = 0;
      if (method === 'z_score') {
        score = Math.abs((point.value - stats.mean) / stats.std);
      } else if (method === 'iqr') {
        const iqr = stats.q3 - stats.q1;
        const lower = stats.q1 - 1.5 * iqr;
        const upper = stats.q3 + 1.5 * iqr;
        if (point.value < lower) score = (lower - point.value) / iqr;
        else if (point.value > upper) score = (point.value - upper) / iqr;
      }
      if (score > 2) {
        let severity = 'low';
        if (score > 4) severity = 'critical';
        else if (score > 3) severity = 'high';
        else if (score > 2.5) severity = 'medium';
        anomalies.push({ time: point.time, value: point.value, score, severity });
      }
    }
    return { anomalies, count: anomalies.length };
  }

  computeFeature(metricId: string, featureName: string, windowSize: number = 100): number {
    const history = this._historicalData.get(metricId) ?? [];
    const window = history.slice(-windowSize).map(d => d.value);
    if (window.length === 0) return 0;
    switch (featureName) {
      case 'mean':
        return window.reduce((a, b) => a + b, 0) / window.length;
      case 'std':
        const mean = window.reduce((a, b) => a + b, 0) / window.length;
        return Math.sqrt(window.reduce((a, b) => a + (b - mean) ** 2, 0) / window.length);
      case 'max':
        return Math.max(...window);
      case 'min':
        return Math.min(...window);
      case 'rms':
        return Math.sqrt(window.reduce((a, b) => a + b * b, 0) / window.length);
      case 'peak_to_peak':
        return Math.max(...window) - Math.min(...window);
      default:
        return 0;
    }
  }

  addAlertRule(
    name: string,
    metric: string,
    condition: string,
    threshold: number,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): boolean {
    if (this._alertRules.has(name)) return false;
    this._alertRules.set(name, { metric, condition, threshold, severity, enabled: true });
    return true;
  }

  checkAlerts(metricId: string, value: number): {
    triggered: { rule: string; severity: string; message: string }[];
  } {
    const triggered: { rule: string; severity: string; message: string }[] = [];
    for (const [name, rule] of this._alertRules.entries()) {
      if (!rule.enabled || rule.metric !== metricId) continue;
      let isTriggered = false;
      switch (rule.condition) {
        case '>':
          isTriggered = value > rule.threshold;
          break;
        case '<':
          isTriggered = value < rule.threshold;
          break;
        case '>=':
          isTriggered = value >= rule.threshold;
          break;
        case '<=':
          isTriggered = value <= rule.threshold;
          break;
      }
      if (isTriggered) {
        triggered.push({
          rule: name,
          severity: rule.severity,
          message: `${metricId} ${rule.condition} ${rule.threshold} (current: ${value})`,
        });
      }
    }
    return { triggered };
  }

  getFeatureNames(): string[] {
    return Array.from(this._featureLibrary.keys());
  }

  getDegradationModelNames(): string[] {
    return Array.from(this._degradationModels.keys());
  }

  getAlertRuleNames(): string[] {
    return Array.from(this._alertRules.keys());
  }

  private _estimateTrend(data: { time: number; value: number }[]): number {
    if (data.length < 2) return 0;
    const n = data.length;
    let sumTime = 0;
    let sumValue = 0;
    let sumTimeValue = 0;
    let sumTimeSq = 0;
    const startTime = data[0].time;
    for (let i = 0; i < n; i++) {
      const t = (data[i].time - startTime) / 1000;
      sumTime += t;
      sumValue += data[i].value;
      sumTimeValue += t * data[i].value;
      sumTimeSq += t * t;
    }
    const denominator = n * sumTimeSq - sumTime * sumTime;
    if (denominator === 0) return 0;
    return (n * sumTimeValue - sumTime * sumValue) / denominator;
  }

  private _estimateVolatility(data: { time: number; value: number }[]): number {
    if (data.length < 2) return 1;
    const values = data.map(d => d.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
    return Math.sqrt(variance);
  }

  private _computeStatistics(values: number[]): {
    mean: number;
    std: number;
    min: number;
    max: number;
    q1: number;
    q3: number;
  } {
    if (values.length === 0) {
      return { mean: 0, std: 1, min: 0, max: 0, q1: 0, q3: 0 };
    }
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    const mean = sorted.reduce((a, b) => a + b, 0) / n;
    const variance = sorted.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
    const std = Math.sqrt(variance);
    const min = sorted[0];
    const max = sorted[n - 1];
    const q1 = sorted[Math.floor(n * 0.25)];
    const q3 = sorted[Math.floor(n * 0.75)];
    return { mean, std, min, max, q1, q3 };
  }

  private _updateAvgConfidence(confidence: number): void {
    const total = this._predictionStats.totalPredictions;
    this._predictionStats.avgConfidence =
      (this._predictionStats.avgConfidence * (total - 1) + confidence) / total;
  }

  toPacket(): DataPacket<PredictiveAnalysisResult> {
    const result: PredictiveAnalysisResult = {
      trendPredictions: Array.from(this._trendPredictions.values()),
      anomalyPredictions: Array.from(this._anomalyPredictions.values()),
      rulPredictions: Array.from(this._rulPredictions.values()),
      reliabilityAnalyses: Array.from(this._reliabilityAnalyses.values()),
      totalPredictions: this.totalPredictions,
      avgConfidence: this.avgConfidence,
      predictionStatus: this.totalPredictions > 0 ? 'completed' : 'idle',
    };
    this._lastResult = result;
    this._counter++;
    return {
      id: `predictive-analysis-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['digital_twin', 'predictive_analysis'],
        priority: 1,
        phase: 'prediction',
      },
    };
  }

  reset(): void {
    this._trendPredictions.clear();
    this._anomalyPredictions.clear();
    this._rulPredictions.clear();
    this._reliabilityAnalyses.clear();
    this._historicalData.clear();
    this._counter = 0;
    this._lastResult = null;
    this._modelRegistry.clear();
    this._predictionStats = {
      totalPredictions: 0,
      successfulPredictions: 0,
      avgConfidence: 0,
      avgError: 0,
    };
  }
}
