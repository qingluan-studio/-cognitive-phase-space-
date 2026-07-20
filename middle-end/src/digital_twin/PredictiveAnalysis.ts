import { DataPacket } from '../shared/types';

export interface TrendPrediction {
  id: string;
  metric: string;
  horizon: number;
  predictedValues: number[];
  confidenceIntervals: { lower: number[]; upper: number[] };
  modelType: 'linear' | 'polynomial' | 'exponential' | 'logarithmic' | 'seasonal';
  rmse: number;
  mape: number;
  trainingDataPoints: number;
  lastTrainingTime: number;
}

export interface AnomalyPrediction {
  id: string;
  metric: string;
  timestamp: number;
  predictedAnomaly: boolean;
  anomalyScore: number;
  anomalyType: 'spike' | 'dip' | 'trend-shift' | 'seasonal-break' | 'pattern-break';
  severity: 'low' | 'medium' | 'high' | 'critical';
  contributingFactors: string[];
  confidence: number;
}

export interface RemainingUsefulLife {
  id: string;
  component: string;
  currentAge: number;
  predictedRUL: number;
  confidenceInterval: { lower: number; upper: number };
  degradationModel: 'exponential' | 'linear' | 'power-law' | 'weibull' | 'gamma';
  healthIndex: number;
  criticalThreshold: number;
  recommendedAction: string;
  lastAssessmentTime: number;
}

export interface ReliabilityAnalysis {
  id: string;
  component: string;
  mtbf: number;
  mttr: number;
  failureRate: number;
  availability: number;
  reliabilityCurve: number[];
  confidenceLevel: number;
  analysisMethod: 'weibull' | 'exponential' | 'log-normal' | 'bayesian';
  censoredDataRatio: number;
}

export interface FailureMode {
  id: string;
  name: string;
  description: string;
  probability: number;
  severity: number;
  detectability: number;
  riskPriorityNumber: number;
  mitigationStrategies: string[];
  detectionMethods: string[];
  effects: string[];
}

export interface DegradationSignature {
  id: string;
  component: string;
  features: string[];
  baseline: number[];
  thresholds: { warning: number; alarm: number; critical: number };
  driftRate: number;
  lastUpdated: number;
}

export interface PredictiveModelConfig {
  id: string;
  name: string;
  type: 'regression' | 'classification' | 'time-series' | 'survival' | 'ensemble';
  algorithm: string;
  hyperparameters: Record<string, unknown>;
  features: string[];
  target: string;
  trainingSchedule: 'manual' | 'daily' | 'weekly' | 'continuous';
  validationStrategy: 'hold-out' | 'cross-validation' | 'time-series-split';
  retrainThreshold: number;
  enabled: boolean;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
  notificationChannels: string[];
  cooldownPeriod: number;
  enabled: boolean;
  lastTriggered: number;
  triggerCount: number;
}

export class PredictiveAnalysis {
  private _trendPredictions: Map<string, TrendPrediction> = new Map();
  private _anomalyPredictions: Map<string, AnomalyPrediction> = new Map();
  private _rulPredictions: Map<string, RemainingUsefulLife> = new Map();
  private _reliabilityAnalyses: Map<string, ReliabilityAnalysis> = new Map();
  private _failureModes: Map<string, FailureMode> = new Map();
  private _degradationSignatures: Map<string, DegradationSignature> = new Map();
  private _modelConfigs: Map<string, PredictiveModelConfig> = new Map();
  private _alertRules: Map<string, AlertRule> = new Map();
  private _lastResult: TrendPrediction | AnomalyPrediction | RemainingUsefulLife | ReliabilityAnalysis | null = null;
  private _counter: number = 0;
  private _predictionHistory: Map<string, unknown[]> = new Map();
  private _maxHistorySize: number = 1000;
  private _confidenceThreshold: number = 0.8;
  private _predictionHorizon: number = 100;
  private _autoRetrain: boolean = false;
  private _featureImportance: Map<string, Map<string, number>> = new Map();
  private _modelPerformance: Map<string, { accuracy: number; precision: number; recall: number; f1Score: number }> = new Map();
  private _sensorFusionWeights: Map<string, number> = new Map();
  private _baselineData: Map<string, number[]> = new Map();
  private _alertHistory: { timestamp: number; ruleId: string; message: string; severity: string }[] = [];

  constructor() {
    this._initDefaultFailureModes();
    this._initDefaultAlertRules();
  }

  private _initDefaultFailureModes(): void {
    this._failureModes.set('bearing-wear', {
      id: 'bearing-wear',
      name: 'Bearing Wear',
      description: 'Progressive wear of rotating bearing surfaces',
      probability: 0.15,
      severity: 7,
      detectability: 6,
      riskPriorityNumber: 630,
      mitigationStrategies: ['Regular lubrication', 'Vibration monitoring', 'Scheduled replacement'],
      detectionMethods: ['Vibration analysis', 'Temperature monitoring', 'Oil analysis'],
      effects: ['Increased vibration', 'Temperature rise', 'Noise increase', ' eventual seizure']
    });

    this._failureModes.set('motor-overheat', {
      id: 'motor-overheat',
      name: 'Motor Overheating',
      description: 'Excessive temperature rise in motor windings',
      probability: 0.1,
      severity: 8,
      detectability: 8,
      riskPriorityNumber: 640,
      mitigationStrategies: ['Thermal protection', 'Load monitoring', 'Cooling system maintenance'],
      detectionMethods: ['Temperature sensors', 'Current monitoring', 'Thermal imaging'],
      effects: ['Insulation damage', 'Reduced efficiency', 'Fire risk', 'Motor failure']
    });

    this._failureModes.set('gear-tooth-fracture', {
      id: 'gear-tooth-fracture',
      name: 'Gear Tooth Fracture',
      description: 'Mechanical fracture of gear teeth due to overload or fatigue',
      probability: 0.05,
      severity: 9,
      detectability: 5,
      riskPriorityNumber: 225,
      mitigationStrategies: ['Load limiting', 'Material selection', 'Regular inspection'],
      detectionMethods: ['Vibration analysis', 'Oil debris monitoring', 'Visual inspection'],
      effects: ['Transmission failure', 'Secondary damage', 'Production stop']
    });
  }

  private _initDefaultAlertRules(): void {
    this._alertRules.set('high-temperature', {
      id: 'high-temperature',
      name: 'High Temperature Alert',
      condition: 'temperature > threshold',
      threshold: 80,
      severity: 'warning',
      notificationChannels: ['email', 'dashboard'],
      cooldownPeriod: 300,
      enabled: true,
      lastTriggered: 0,
      triggerCount: 0
    });

    this._alertRules.set('critical-vibration', {
      id: 'critical-vibration',
      name: 'Critical Vibration Alert',
      condition: 'vibration_rms > threshold',
      threshold: 10,
      severity: 'critical',
      notificationChannels: ['email', 'sms', 'dashboard'],
      cooldownPeriod: 60,
      enabled: true,
      lastTriggered: 0,
      triggerCount: 0
    });

    this._alertRules.set('rul-low', {
      id: 'rul-low',
      name: 'Low Remaining Useful Life',
      condition: 'rul < threshold',
      threshold: 100,
      severity: 'warning',
      notificationChannels: ['email', 'dashboard'],
      cooldownPeriod: 3600,
      enabled: true,
      lastTriggered: 0,
      triggerCount: 0
    });
  }

  get trendPredictions(): Map<string, TrendPrediction> {
    return new Map(this._trendPredictions);
  }

  get anomalyPredictions(): Map<string, AnomalyPrediction> {
    return new Map(this._anomalyPredictions);
  }

  get rulPredictions(): Map<string, RemainingUsefulLife> {
    return new Map(this._rulPredictions);
  }

  get reliabilityAnalyses(): Map<string, ReliabilityAnalysis> {
    return new Map(this._reliabilityAnalyses);
  }

  get failureModes(): Map<string, FailureMode> {
    return new Map(this._failureModes);
  }

  get degradationSignatures(): Map<string, DegradationSignature> {
    return new Map(this._degradationSignatures);
  }

  get modelConfigs(): Map<string, PredictiveModelConfig> {
    return new Map(this._modelConfigs);
  }

  get alertRules(): Map<string, AlertRule> {
    return new Map(this._alertRules);
  }

  get lastResult(): TrendPrediction | AnomalyPrediction | RemainingUsefulLife | ReliabilityAnalysis | null {
    return this._lastResult;
  }

  get confidenceThreshold(): number {
    return this._confidenceThreshold;
  }

  get predictionHorizon(): number {
    return this._predictionHorizon;
  }

  get autoRetrain(): boolean {
    return this._autoRetrain;
  }

  get totalPredictions(): number {
    return this._trendPredictions.size + this._anomalyPredictions.size + this._rulPredictions.size + this._reliabilityAnalyses.size;
  }

  get activeAlertRules(): number {
    return Array.from(this._alertRules.values()).filter(r => r.enabled).length;
  }

  setConfidenceThreshold(threshold: number): void {
    this._confidenceThreshold = threshold;
  }

  setPredictionHorizon(horizon: number): void {
    this._predictionHorizon = horizon;
  }

  setAutoRetrain(enabled: boolean): void {
    this._autoRetrain = enabled;
  }

  addTrendPrediction(prediction: TrendPrediction): void {
    this._trendPredictions.set(prediction.id, prediction);
    this._lastResult = prediction;
    this._addToHistory(prediction.id, prediction);
  }

  addAnomalyPrediction(prediction: AnomalyPrediction): void {
    this._anomalyPredictions.set(prediction.id, prediction);
    this._lastResult = prediction;
    this._addToHistory(prediction.id, prediction);
    if (prediction.predictedAnomaly) {
      this._evaluateAlertRules(prediction);
    }
  }

  addRULPrediction(prediction: RemainingUsefulLife): void {
    this._rulPredictions.set(prediction.id, prediction);
    this._lastResult = prediction;
    this._addToHistory(prediction.id, prediction);
  }

  addReliabilityAnalysis(analysis: ReliabilityAnalysis): void {
    this._reliabilityAnalyses.set(analysis.id, analysis);
    this._lastResult = analysis;
    this._addToHistory(analysis.id, analysis);
  }

  addFailureMode(mode: FailureMode): void {
    this._failureModes.set(mode.id, mode);
  }

  removeFailureMode(id: string): boolean {
    return this._failureModes.delete(id);
  }

  addDegradationSignature(signature: DegradationSignature): void {
    this._degradationSignatures.set(signature.id, signature);
  }

  updateDegradationSignature(id: string, updates: Partial<DegradationSignature>): boolean {
    const sig = this._degradationSignatures.get(id);
    if (!sig) return false;
    this._degradationSignatures.set(id, { ...sig, ...updates, id });
    return true;
  }

  addModelConfig(config: PredictiveModelConfig): void {
    this._modelConfigs.set(config.id, config);
  }

  removeModelConfig(id: string): boolean {
    return this._modelConfigs.delete(id);
  }

  updateModelConfig(id: string, updates: Partial<PredictiveModelConfig>): boolean {
    const config = this._modelConfigs.get(id);
    if (!config) return false;
    this._modelConfigs.set(id, { ...config, ...updates, id });
    return true;
  }

  addAlertRule(rule: AlertRule): void {
    this._alertRules.set(rule.id, rule);
  }

  removeAlertRule(id: string): boolean {
    return this._alertRules.delete(id);
  }

  updateAlertRule(id: string, updates: Partial<AlertRule>): boolean {
    const rule = this._alertRules.get(id);
    if (!rule) return false;
    this._alertRules.set(id, { ...rule, ...updates, id });
    return true;
  }

  private _evaluateAlertRules(prediction: AnomalyPrediction): void {
    for (const rule of this._alertRules.values()) {
      if (!rule.enabled) continue;
      if (Date.now() - rule.lastTriggered < rule.cooldownPeriod * 1000) continue;

      let triggered = false;
      if (rule.condition.includes('anomaly') && prediction.predictedAnomaly && prediction.anomalyScore > rule.threshold) {
        triggered = true;
      }

      if (triggered) {
        rule.lastTriggered = Date.now();
        rule.triggerCount++;
        this._alertHistory.push({
          timestamp: Date.now(),
          ruleId: rule.id,
          message: `Alert ${rule.name} triggered for ${prediction.metric}: score ${prediction.anomalyScore.toFixed(2)}`,
          severity: rule.severity
        });
      }
    }
  }

  private _addToHistory(key: string, value: unknown): void {
    const history = this._predictionHistory.get(key) || [];
    history.push(value);
    if (history.length > this._maxHistorySize) {
      history.shift();
    }
    this._predictionHistory.set(key, history);
  }

  getPredictionHistory(key: string): unknown[] {
    return this._predictionHistory.get(key) || [];
  }

  predictTrend(metric: string, historicalData: number[], horizon: number = this._predictionHorizon): TrendPrediction {
    const n = historicalData.length;
    const sumX = historicalData.reduce((sum, _, i) => sum + i, 0);
    const sumY = historicalData.reduce((sum, val) => sum + val, 0);
    const sumXY = historicalData.reduce((sum, val, i) => sum + i * val, 0);
    const sumX2 = historicalData.reduce((sum, _, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const predictedValues: number[] = [];
    const lower: number[] = [];
    const upper: number[] = [];

    const lastValue = historicalData[n - 1];
    const stdDev = Math.sqrt(historicalData.reduce((sum, val) => sum + Math.pow(val - sumY / n, 2), 0) / n);

    for (let i = 1; i <= horizon; i++) {
      const predicted = lastValue + slope * i;
      predictedValues.push(predicted);
      lower.push(predicted - 1.96 * stdDev);
      upper.push(predicted + 1.96 * stdDev);
    }

    const rmse = Math.sqrt(historicalData.reduce((sum, val, i) => {
      const predicted = intercept + slope * i;
      return sum + Math.pow(val - predicted, 2);
    }, 0) / n);

    const mape = historicalData.reduce((sum, val, i) => {
      const predicted = intercept + slope * i;
      return sum + Math.abs((val - predicted) / (val || 1));
    }, 0) / n * 100;

    const prediction: TrendPrediction = {
      id: `trend-${metric}-${Date.now()}`,
      metric,
      horizon,
      predictedValues,
      confidenceIntervals: { lower, upper },
      modelType: 'linear',
      rmse,
      mape,
      trainingDataPoints: n,
      lastTrainingTime: Date.now()
    };

    this.addTrendPrediction(prediction);
    return prediction;
  }

  predictAnomaly(metric: string, value: number, baseline: number[], threshold: number = 3): AnomalyPrediction {
    const mean = baseline.reduce((sum, val) => sum + val, 0) / baseline.length;
    const stdDev = Math.sqrt(baseline.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / baseline.length);
    const zScore = stdDev > 0 ? Math.abs(value - mean) / stdDev : 0;
    const anomalyScore = Math.min(zScore / threshold, 10);
    const isAnomaly = zScore > threshold;

    let anomalyType: AnomalyPrediction['anomalyType'] = 'spike';
    if (value < mean - threshold * stdDev) anomalyType = 'dip';
    else if (baseline.length > 10 && value > baseline[baseline.length - 2] * 1.5) anomalyType = 'trend-shift';

    let severity: AnomalyPrediction['severity'] = 'low';
    if (anomalyScore > 8) severity = 'critical';
    else if (anomalyScore > 5) severity = 'high';
    else if (anomalyScore > 2) severity = 'medium';

    const prediction: AnomalyPrediction = {
      id: `anomaly-${metric}-${Date.now()}`,
      metric,
      timestamp: Date.now(),
      predictedAnomaly: isAnomaly,
      anomalyScore,
      anomalyType,
      severity,
      contributingFactors: [`Deviation from mean: ${(value - mean).toFixed(2)}`, `Z-score: ${zScore.toFixed(2)}`],
      confidence: Math.min(anomalyScore / threshold, 1)
    };

    this.addAnomalyPrediction(prediction);
    return prediction;
  }

  predictRUL(component: string, currentAge: number, degradationData: number[], model: RemainingUsefulLife['degradationModel'] = 'exponential'): RemainingUsefulLife {
    const criticalThreshold = degradationData[0] * 1.5;
    const lastValue = degradationData[degradationData.length - 1];
    const trend = degradationData.length > 1
      ? (lastValue - degradationData[0]) / degradationData.length
      : 0;

    let predictedRUL = 0;
    if (trend > 0) {
      predictedRUL = Math.max(0, (criticalThreshold - lastValue) / trend);
    }

    const confidenceWidth = predictedRUL * 0.2;

    const prediction: RemainingUsefulLife = {
      id: `rul-${component}-${Date.now()}`,
      component,
      currentAge,
      predictedRUL,
      confidenceInterval: {
        lower: Math.max(0, predictedRUL - confidenceWidth),
        upper: predictedRUL + confidenceWidth
      },
      degradationModel: model,
      healthIndex: Math.max(0, Math.min(1, 1 - lastValue / criticalThreshold)),
      criticalThreshold,
      recommendedAction: predictedRUL < 50 ? 'Schedule maintenance immediately' : predictedRUL < 100 ? 'Plan maintenance' : 'Continue monitoring',
      lastAssessmentTime: Date.now()
    };

    this.addRULPrediction(prediction);
    return prediction;
  }

  analyzeReliability(component: string, failureTimes: number[], censored: boolean[] = []): ReliabilityAnalysis {
    const n = failureTimes.length;
    const sumT = failureTimes.reduce((sum, t) => sum + t, 0);
    const mtbf = sumT / n;
    const mttr = mtbf * 0.1;
    const failureRate = 1 / mtbf;
    const availability = mtbf / (mtbf + mttr);

    const reliabilityCurve = Array.from({ length: 100 }, (_, i) => Math.exp(-failureRate * i * mtbf / 50));

    const analysis: ReliabilityAnalysis = {
      id: `reliability-${component}-${Date.now()}`,
      component,
      mtbf,
      mttr,
      failureRate,
      availability,
      reliabilityCurve,
      confidenceLevel: 0.95,
      analysisMethod: 'exponential',
      censoredDataRatio: censored.length > 0 ? censored.filter(c => c).length / censored.length : 0
    };

    this.addReliabilityAnalysis(analysis);
    return analysis;
  }

  computeRiskPriorityNumber(failureModeId: string): number {
    const mode = this._failureModes.get(failureModeId);
    if (!mode) return 0;
    return mode.severity * mode.detectability * Math.round(mode.probability * 10);
  }

  getCriticalFailureModes(threshold: number = 500): FailureMode[] {
    return Array.from(this._failureModes.values()).filter(mode => {
      const rpn = this.computeRiskPriorityNumber(mode.id);
      return rpn >= threshold;
    });
  }

  updateFeatureImportance(modelId: string, features: Record<string, number>): void {
    const importanceMap = new Map<string, number>();
    for (const [feature, importance] of Object.entries(features)) {
      importanceMap.set(feature, importance);
    }
    this._featureImportance.set(modelId, importanceMap);
  }

  getFeatureImportance(modelId: string): Map<string, number> | undefined {
    return this._featureImportance.get(modelId);
  }

  updateModelPerformance(modelId: string, metrics: { accuracy: number; precision: number; recall: number; f1Score: number }): void {
    this._modelPerformance.set(modelId, metrics);
  }

  getModelPerformance(modelId: string): { accuracy: number; precision: number; recall: number; f1Score: number } | undefined {
    return this._modelPerformance.get(modelId);
  }

  setSensorFusionWeight(sensorId: string, weight: number): void {
    this._sensorFusionWeights.set(sensorId, weight);
  }

  getSensorFusionWeights(): Map<string, number> {
    return new Map(this._sensorFusionWeights);
  }

  setBaselineData(metric: string, data: number[]): void {
    this._baselineData.set(metric, [...data]);
  }

  getBaselineData(metric: string): number[] | undefined {
    return this._baselineData.get(metric);
  }

  getAlertHistory(): { timestamp: number; ruleId: string; message: string; severity: string }[] {
    return [...this._alertHistory];
  }

  exportPrediction(predictionId: string): string {
    const pred = this._trendPredictions.get(predictionId) ||
                 this._anomalyPredictions.get(predictionId) ||
                 this._rulPredictions.get(predictionId) ||
                 this._reliabilityAnalyses.get(predictionId);
    return pred ? JSON.stringify(pred, null, 2) : '';
  }

  getHealthSummary(): Record<string, number> {
    const summary: Record<string, number> = {};
    for (const rul of this._rulPredictions.values()) {
      summary[rul.component] = rul.healthIndex;
    }
    return summary;
  }

  getComponentRiskMatrix(): { component: string; probability: number; severity: number; rpn: number }[] {
    return Array.from(this._failureModes.values()).map(mode => ({
      component: mode.name,
      probability: mode.probability,
      severity: mode.severity,
      rpn: this.computeRiskPriorityNumber(mode.id)
    }));
  }

  scheduleRetraining(): { modelId: string; scheduledTime: number; reason: string }[] {
    const schedule: { modelId: string; scheduledTime: number; reason: string }[] = [];
    for (const config of this._modelConfigs.values()) {
      if (!config.enabled) continue;
      const performance = this._modelPerformance.get(config.id);
      if (performance && performance.accuracy < config.retrainThreshold) {
        schedule.push({
          modelId: config.id,
          scheduledTime: Date.now() + 3600000,
          reason: `Accuracy ${performance.accuracy.toFixed(2)} below threshold ${config.retrainThreshold}`
        });
      }
    }
    return schedule;
  }

  toPacket(): DataPacket<unknown> {
    const result = this._lastResult || {};
    this._counter++;
    return {
      id: `predictive-analysis-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['digital-twin', 'predictive-analysis'],
        priority: 1,
        phase: 'prediction'
      }
    };
  }

  reset(): void {
    this._trendPredictions.clear();
    this._anomalyPredictions.clear();
    this._rulPredictions.clear();
    this._reliabilityAnalyses.clear();
    this._failureModes.clear();
    this._degradationSignatures.clear();
    this._modelConfigs.clear();
    this._alertRules.clear();
    this._lastResult = null;
    this._counter = 0;
    this._predictionHistory.clear();
    this._confidenceThreshold = 0.8;
    this._predictionHorizon = 100;
    this._autoRetrain = false;
    this._featureImportance.clear();
    this._modelPerformance.clear();
    this._sensorFusionWeights.clear();
    this._baselineData.clear();
    this._alertHistory = [];
    this._initDefaultFailureModes();
    this._initDefaultAlertRules();
  }
}
