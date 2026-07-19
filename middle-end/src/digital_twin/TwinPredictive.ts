import { DataPacket } from '../shared/types';

export interface PredictiveMaintenance {
  twin: string;
  model: string;
  health: number;
  predictions: FailureForecast[];
}

export interface FailureForecast {
  id: string;
  component: string;
  timeToFailure: number;
  probability: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface SensorData {
  sensorId: string;
  values: number[];
  timestamps: number[];
}

interface Anomaly {
  id: string;
  sensor: string;
  timestamp: number;
  value: number;
  baseline: number;
  deviation: number;
  severity: string;
}

interface MaintenanceTask {
  id: string;
  asset: string;
  type: string;
  scheduledDate: number;
  priority: 'low' | 'medium' | 'high';
  status: 'scheduled' | 'in_progress' | 'completed';
}

export class TwinPredictive {
  private _models: Map<string, string> = new Map();
  private _healthScores: Map<string, number> = new Map();
  private _predictions: Map<string, FailureForecast[]> = new Map();
  private _anomalies: Anomaly[] = [];
  private _maintenanceTasks: Map<string, MaintenanceTask> = new Map();
  private _counter = 0;
  private _stats = {
    totalPredictions: 0,
    alerts: 0,
    resolved: 0,
    avgHealthScore: 0,
  };

  healthScore(twin: string, sensors: SensorData[], model: string): { score: number; components: Record<string, number>; trend: 'improving' | 'declining' | 'stable' } {
    const components: Record<string, number> = {};
    let totalScore = 0;
    for (const sensor of sensors) {
      const score = Math.max(0, Math.min(100, 100 - Math.random() * 30));
      components[sensor.sensorId] = score;
      totalScore += score;
    }
    const avgScore = sensors.length > 0 ? totalScore / sensors.length : 100;
    this._healthScores.set(twin, avgScore);
    this._models.set(twin, model);
    const trend = Math.random() > 0.5 ? 'stable' : Math.random() > 0.5 ? 'improving' : 'declining';
    this._updateAvgHealth();
    return { score: avgScore, components, trend };
  }

  remainingUsefulLife(twin: string, model: string, current: Record<string, number>): { rul: number; confidence: number; units: string } {
    const rul = Math.random() * 10000 + 1000;
    const confidence = Math.random() * 0.3 + 0.6;
    this._stats.totalPredictions++;
    return { rul, confidence, units: 'hours' };
  }

  failurePrediction(twin: string, model: string, horizon: number): { failures: FailureForecast[]; horizon: number; overallRisk: string } {
    const failureCount = Math.floor(Math.random() * 4 + 1);
    const failures: FailureForecast[] = [];
    const components = ['bearing', 'seal', 'gear', 'motor', 'pump', 'valve'];
    for (let i = 0; i < failureCount; i++) {
      const sevIdx = Math.floor(Math.random() * 4);
      failures.push({
        id: `fail-${Date.now()}-${this._counter++}`,
        component: components[Math.floor(Math.random() * components.length)],
        timeToFailure: Math.random() * horizon,
        probability: Math.random() * 0.5 + 0.3,
        severity: ['low', 'medium', 'high', 'critical'][sevIdx] as 'low' | 'medium' | 'high' | 'critical',
      });
    }
    this._predictions.set(twin, failures);
    this._stats.totalPredictions++;
    this._stats.alerts += failures.filter(f => f.severity === 'critical' || f.severity === 'high').length;
    const overallRisk = failures.some(f => f.severity === 'critical') ? 'critical' :
      failures.some(f => f.severity === 'high') ? 'high' :
      failures.some(f => f.severity === 'medium') ? 'medium' : 'low';
    return { failures, horizon, overallRisk };
  }

  anomalyDetect(twin: string, current: Record<string, number>, baseline: Record<string, number>): { anomalies: Anomaly[]; count: number; severity: string } {
    const anomalies: Anomaly[] = [];
    for (const [sensor, value] of Object.entries(current)) {
      const base = baseline[sensor] || value;
      const deviation = Math.abs(value - base) / (base || 1);
      if (deviation > 0.2) {
        const anomaly: Anomaly = {
          id: `anomaly-${Date.now()}-${this._counter++}`,
          sensor,
          timestamp: Date.now(),
          value,
          baseline: base,
          deviation,
          severity: deviation > 0.5 ? 'critical' : deviation > 0.3 ? 'high' : 'medium',
        };
        anomalies.push(anomaly);
        this._anomalies.push(anomaly);
      }
    }
    if (this._anomalies.length > 500) this._anomalies.splice(0, this._anomalies.length - 500);
    const severity = anomalies.some(a => a.severity === 'critical') ? 'critical' :
      anomalies.some(a => a.severity === 'high') ? 'high' :
      anomalies.length > 0 ? 'medium' : 'low';
    return { anomalies, count: anomalies.length, severity };
  }

  degradationModel(twin: string, data: SensorData[], type: string): { degradationRate: number; threshold: number; currentLevel: number } {
    return {
      degradationRate: Math.random() * 0.01,
      threshold: 80,
      currentLevel: Math.random() * 30 + 10,
    };
  }

  maintenanceSchedule(twin: string, predictions: FailureForecast[], strategy: string): { tasks: MaintenanceTask[]; nextMaintenance: number; totalCost: number } {
    const tasks: MaintenanceTask[] = predictions.map(p => {
      const task: MaintenanceTask = {
        id: `maint-${Date.now()}-${this._counter++}`,
        asset: twin,
        type: p.component,
        scheduledDate: Date.now() + p.timeToFailure * 0.8 * 3600000,
        priority: p.severity === 'critical' ? 'high' : p.severity === 'high' ? 'high' : p.severity === 'medium' ? 'medium' : 'low',
        status: 'scheduled',
      };
      this._maintenanceTasks.set(task.id, task);
      return task;
    });
    const nextMaintenance = tasks.length > 0 ? tasks[0].scheduledDate : Date.now() + 86400000;
    return {
      tasks,
      nextMaintenance,
      totalCost: tasks.length * 500,
    };
  }

  conditionMonitoring(twin: string, sensors: string[], thresholds: Record<string, { min: number; max: number }>): { status: string; violations: string[]; readings: Record<string, number> } {
    const readings: Record<string, number> = {};
    const violations: string[] = [];
    for (const sensor of sensors) {
      readings[sensor] = Math.random() * 100;
      const t = thresholds[sensor];
      if (t && (readings[sensor] < t.min || readings[sensor] > t.max)) {
        violations.push(sensor);
      }
    }
    const status = violations.length === 0 ? 'normal' : violations.length > 3 ? 'critical' : 'warning';
    return { status, violations, readings };
  }

  vibrationAnalysis(twin: string, sensor: string, frequency: number[]): { rms: number; peak: number; frequencyPeaks: number[]; faultFrequency: number | null } {
    const rms = Math.random() * 10;
    const peak = rms * (Math.random() * 2 + 1.5);
    const peakCount = Math.floor(Math.random() * 5 + 2);
    const frequencyPeaks: number[] = [];
    for (let i = 0; i < peakCount; i++) {
      frequencyPeaks.push(frequency[Math.floor(Math.random() * frequency.length)]);
    }
    return {
      rms,
      peak,
      frequencyPeaks,
      faultFrequency: Math.random() > 0.5 ? frequencyPeaks[0] : null,
    };
  }

  oilAnalysis(twin: string, sample: string, properties: string[]): { results: Record<string, number>; condition: string; contaminants: string[] } {
    const results: Record<string, number> = {};
    for (const prop of properties) {
      results[prop] = Math.random() * 100;
    }
    const condition = Math.random() > 0.3 ? 'good' : Math.random() > 0.5 ? 'fair' : 'poor';
    const contaminants = ['iron', 'copper', 'water', 'silica'].filter(() => Math.random() > 0.7);
    return { results, condition, contaminants };
  }

  thermography(twin: string, image: string, threshold: number): { hotspots: { location: [number, number]; temperature: number }[]; maxTemp: number; status: string } {
    const hotspotCount = Math.floor(Math.random() * 3);
    const hotspots: { location: [number, number]; temperature: number }[] = [];
    let maxTemp = 50;
    for (let i = 0; i < hotspotCount; i++) {
      const temp = Math.random() * 50 + 50;
      hotspots.push({
        location: [Math.random(), Math.random()] as [number, number],
        temperature: temp,
      });
      if (temp > maxTemp) maxTemp = temp;
    }
    const status = maxTemp > threshold ? 'overheating' : 'normal';
    return { hotspots, maxTemp, status };
  }

  ultrasoundInspection(twin: string, readings: number[]): { defects: number; severity: string; recommendations: string[] } {
    const defects = Math.floor(Math.random() * 5);
    const severity = defects > 3 ? 'high' : defects > 1 ? 'medium' : 'low';
    const recommendations = defects > 0 ? ['further inspection', 'schedule maintenance', 'monitor closely'].slice(0, defects) : [];
    return { defects, severity, recommendations };
  }

  rootCauseAnalysis(failure: string, factors: string[]): { rootCauses: string[]; contributingFactors: string[]; fishbone: Record<string, string[]> } {
    const fishbone: Record<string, string[]> = {
      man: ['training', 'procedure'],
      machine: ['wear', 'maintenance'],
      material: ['quality', 'supplier'],
      method: ['process', 'design'],
      environment: ['temperature', 'humidity'],
      measurement: ['calibration', 'accuracy'],
    };
    return {
      rootCauses: factors.slice(0, 2),
      contributingFactors: factors,
      fishbone,
    };
  }

  maintenanceOptimization(assets: string[], schedule: MaintenanceTask[], cost: Record<string, number>): { optimized: MaintenanceTask[]; totalCost: number; savedCost: number; availability: number } {
    const savedCost = schedule.length * 100 * Math.random();
    return {
      optimized: schedule,
      totalCost: schedule.length * 400,
      savedCost,
      availability: Math.random() * 0.1 + 0.9,
    };
  }

  private _updateAvgHealth(): void {
    const scores = Array.from(this._healthScores.values());
    this._stats.avgHealthScore = scores.length > 0 ? scores.reduce((s, v) => s + v, 0) / scores.length : 0;
  }

  get modelCount(): number {
    return this._models.size;
  }

  get predictionCount(): number {
    return this._predictions.size;
  }

  get anomalyCount(): number {
    return this._anomalies.length;
  }

  get stats(): { totalPredictions: number; alerts: number; resolved: number; avgHealthScore: number } {
    return { ...this._stats };
  }

  public toPacket(): DataPacket<{
    models: number;
    predictions: number;
    anomalies: number;
    maintenanceTasks: number;
    stats: { totalPredictions: number; alerts: number; resolved: number; avgHealthScore: number };
  }> {
    return {
      id: `dt-predictive-${Date.now()}-${this._counter}`,
      payload: {
        models: this._models.size,
        predictions: this._predictions.size,
        anomalies: this._anomalies.length,
        maintenanceTasks: this._maintenanceTasks.size,
        stats: { ...this._stats },
      },
      metadata: {
        createdAt: Date.now(),
        route: ['digital_twin', 'predictive', 'result'],
        priority: 0.8,
        phase: 'prediction',
      },
    };
  }

  public reset(): void {
    this._models.clear();
    this._healthScores.clear();
    this._predictions.clear();
    this._anomalies = [];
    this._maintenanceTasks.clear();
    this._counter = 0;
    this._stats = {
      totalPredictions: 0,
      alerts: 0,
      resolved: 0,
      avgHealthScore: 0,
    };
  }
}
