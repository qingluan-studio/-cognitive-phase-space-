export interface SensorReading {
  sensorId: string;
  value: number;
  weight: number;
  threshold: number;
  noise: number;
}

export interface TriggerState {
  active: boolean;
  confidence: number;
  fusedValue: number;
  triggerProbability: number;
  gateType: string;
}

export class GerminationTrigger {
  private _sensors: Map<string, SensorReading> = new Map();
  private _state: Record<string, unknown> = {};
  private _kalmanGain: number = 0.5;
  private _estimate: number = 0;
  private _estimateError: number = 1;
  private _triggerHistory: boolean[] = [];

  constructor() {}

  get sensorCount(): number {
    return this._sensors.size;
  }

  addSensor(sensorId: string, weight: number, threshold: number, noise: number = 0.1): void {
    this._sensors.set(sensorId, { sensorId, value: 0, weight, threshold, noise });
  }

  read(sensorId: string, value: number): void {
    const sensor = this._sensors.get(sensorId);
    if (!sensor) return;
    sensor.value = value + (Math.random() - 0.5) * sensor.noise;
    this._kalmanUpdate(sensor);
  }

  private _kalmanUpdate(sensor: SensorReading): void {
    const predictionError = this._estimateError + sensor.noise;
    this._kalmanGain = predictionError / (predictionError + sensor.noise);
    this._estimate = this._estimate + this._kalmanGain * (sensor.value - this._estimate);
    this._estimateError = (1 - this._kalmanGain) * predictionError;
  }

  evaluateAND(): TriggerState {
    const readings = Array.from(this._sensors.values());
    const active = readings.every((s) => s.value >= s.threshold);
    const fusedValue = readings.reduce((sum, s) => sum + s.value * s.weight, 0) / readings.reduce((sum, s) => sum + s.weight, 0);
    const confidence = readings.reduce((prod, s) => prod * (s.value / (s.threshold || 1)), 1);
    const triggerProbability = active ? confidence : 0;
    this._triggerHistory.push(active);
    if (this._triggerHistory.length > 50) this._triggerHistory.shift();
    return { active, confidence, fusedValue, triggerProbability, gateType: 'AND' };
  }

  evaluateOR(): TriggerState {
    const readings = Array.from(this._sensors.values());
    const active = readings.some((s) => s.value >= s.threshold);
    const fusedValue = readings.reduce((sum, s) => sum + s.value * s.weight, 0) / readings.reduce((sum, s) => sum + s.weight, 0);
    const confidence = 1 - readings.reduce((prod, s) => prod * (1 - s.value / (s.threshold || 1)), 1);
    const triggerProbability = active ? confidence : 0;
    this._triggerHistory.push(active);
    if (this._triggerHistory.length > 50) this._triggerHistory.shift();
    return { active, confidence, fusedValue, triggerProbability, gateType: 'OR' };
  }

  evaluateNAND(): TriggerState {
    const andState = this.evaluateAND();
    return { ...andState, active: !andState.active, gateType: 'NAND' };
  }

  evaluateXOR(): TriggerState {
    const readings = Array.from(this._sensors.values());
    const activeCount = readings.filter((s) => s.value >= s.threshold).length;
    const active = activeCount === 1;
    const fusedValue = readings.reduce((sum, s) => sum + s.value * s.weight, 0) / readings.reduce((sum, s) => sum + s.weight, 0);
    return { active, confidence: active ? 1 : 0, fusedValue, triggerProbability: active ? 1 : 0, gateType: 'XOR' };
  }

  multiSensorFusion(): { estimate: number; error: number; probability: number } {
    return { estimate: this._estimate, error: this._estimateError, probability: 1 / (1 + Math.exp(-this._estimate)) };
  }

  triggerEntropy(): number {
    const p = this._triggerHistory.filter(Boolean).length / (this._triggerHistory.length || 1);
    if (p === 0 || p === 1) return 0;
    return -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p));
  }

  resetKalman(): void {
    this._estimate = 0;
    this._estimateError = 1;
    this._kalmanGain = 0.5;
  }

  sensorReliability(): number {
    const noises = Array.from(this._sensors.values()).map((s) => s.noise);
    if (noises.length === 0) return 0;
    const avgNoise = noises.reduce((s, v) => s + v, 0) / noises.length;
    return 1 / (1 + avgNoise);
  }

  weightedSensorFusion(): number {
    const readings = Array.from(this._sensors.values());
    const totalWeight = readings.reduce((s, r) => s + r.weight, 0);
    if (totalWeight === 0) return 0;
    return readings.reduce((s, r) => s + r.value * r.weight, 0) / totalWeight;
  }

  report(): Record<string, unknown> {
    return {
      sensors: this._sensors.size,
      estimate: this._estimate,
      triggerHistory: this._triggerHistory.length,
      entropy: this.triggerEntropy(),
      state: this._state,
    };
  }
}
