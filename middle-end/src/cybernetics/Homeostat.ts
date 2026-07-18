import type { DataPacket, Signal } from '../shared/types';

export interface HomeostaticVariable {
  id: string;
  name: string;
  value: number;
  setPoint: number;
  min: number;
  max: number;
  sensitivity: number;
  tolerance: number;
  integral: number;
}

export interface HomeostaticConnection {
  id: string;
  source: string;
  target: string;
  weight: number;
  type: 'excitatory' | 'inhibitory';
}

export interface HomeostatState {
  timestamp: number;
  variables: Record<string, number>;
  setPoints: Record<string, number>;
  stabilityScore: number;
  allostasisLevel: number;
  isStable: boolean;
  activeRegulators: string[];
}

export interface IHomeostat {
  addVariable(id: string, name: string, initial: number, min: number, max: number): void;
  setSetPoint(variableId: string, value: number): void;
  addConnection(source: string, target: string, weight: number, type: 'excitatory' | 'inhibitory'): void;
  update(deltaTime: number): void;
  getState(): HomeostatState;
  perturb(variableId: string, amount: number): void;
  injectSignal(signal: Signal): void;
  processPacket(packet: DataPacket): DataPacket;
  reset(): void;
}

export class Homeostat implements IHomeostat {
  private _variables: Map<string, HomeostaticVariable> = new Map();
  private _connections: HomeostaticConnection[] = [];
  private _history: HomeostatState[] = [];
  private _allostasisLevel: number = 0;
  private _adaptationRate: number = 0.01;
  private _maxHistory: number = 500;
  private _lastUpdate: number = Date.now();
  private _regulationEfficiency: number = 0.8;
  private _noiseFloor: number = 0.005;
  private _uniselectorPositions: Map<string, number> = new Map();
  private _stabilityThreshold: number = 0.15;
  private _adaptiveSetPoints: Map<string, { base: number; drift: number; driftRate: number }> = new Map();

  constructor() {
    this._initializeDefaultVariables();
  }

  get variableCount(): number { return this._variables.size; }
  get stabilityScore(): number { return this._computeStabilityScore(); }
  get allostasisLevel(): number { return this._allostasisLevel; }
  get isStable(): boolean { return this.stabilityScore > 1 - this._stabilityThreshold; }
  get variableIds(): string[] { return Array.from(this._variables.keys()); }
  get history(): HomeostatState[] { return this._history.map(h => ({ ...h, variables: { ...h.variables }, setPoints: { ...h.setPoints } })); }
  get adaptationRate(): number { return this._adaptationRate; }
  set adaptationRate(value: number) { this._adaptationRate = Math.max(0, Math.min(0.1, value)); }
  get regulationEfficiency(): number { return this._regulationEfficiency; }
  set regulationEfficiency(value: number) { this._regulationEfficiency = Math.max(0, Math.min(1, value)); }

  private _initializeDefaultVariables(): void {
    const defaults = [
      { id: 'temperature', name: 'Temperature', initial: 0.5, min: 0, max: 1 },
      { id: 'pressure', name: 'Pressure', initial: 0.45, min: 0, max: 1 },
      { id: 'energy', name: 'Energy', initial: 0.6, min: 0, max: 1 },
      { id: 'ph', name: 'pH Balance', initial: 0.52, min: 0, max: 1 },
    ];

    for (const def of defaults) {
      this.addVariable(def.id, def.name, def.initial, def.min, def.max);
    }

    this._initializeConnections();
  }

  private _initializeConnections(): void {
    this.addConnection('temperature', 'energy', 0.3, 'inhibitory');
    this.addConnection('energy', 'pressure', 0.25, 'excitatory');
    this.addConnection('pressure', 'temperature', 0.2, 'inhibitory');
    this.addConnection('ph', 'temperature', 0.15, 'inhibitory');
    this.addConnection('energy', 'ph', 0.2, 'excitatory');
  }

  addVariable(id: string, name: string, initial: number, min: number, max: number): void {
    if (this._variables.has(id)) return;
    this._variables.set(id, {
      id,
      name,
      value: initial,
      setPoint: initial,
      min,
      max,
      sensitivity: 0.1,
      tolerance: 0.05,
      integral: 0,
    });
    this._uniselectorPositions.set(id, Math.random());
    this._adaptiveSetPoints.set(id, { base: initial, drift: 0, driftRate: 0.0001 });
  }

  setSetPoint(variableId: string, value: number): void {
    const variable = this._variables.get(variableId);
    if (!variable) return;
    variable.setPoint = Math.max(variable.min, Math.min(variable.max, value));
    const adaptive = this._adaptiveSetPoints.get(variableId);
    if (adaptive) {
      adaptive.base = variable.setPoint;
    }
  }

  addConnection(source: string, target: string, weight: number, type: 'excitatory' | 'inhibitory'): void {
    if (!this._variables.has(source) || !this._variables.has(target)) return;
    const id = `${source}-${target}-${Date.now()}`;
    this._connections.push({ id, source, target, weight, type });
  }

  update(deltaTime: number): void {
    const dt = deltaTime / 1000;

    this._updateAdaptiveSetPoints(dt);
    this._computeRegulation(dt);
    this._applyInteractions(dt);
    this._applyNoise(dt);
    this._updateIntegrals(dt);
    this._updateAllostasis(dt);
    this._checkUniselectorReset();
    this._clampValues();
    this._recordState();

    this._lastUpdate = Date.now();
  }

  private _updateAdaptiveSetPoints(dt: number): void {
    for (const [id, variable] of this._variables) {
      const adaptive = this._adaptiveSetPoints.get(id);
      if (!adaptive) continue;

      const deviation = variable.value - variable.setPoint;
      const absDeviation = Math.abs(deviation);

      if (absDeviation > variable.tolerance * 2) {
        adaptive.drift += Math.sign(deviation) * adaptive.driftRate * this._allostasisLevel * dt;
        adaptive.drift = Math.max(-0.2, Math.min(0.2, adaptive.drift));
      } else {
        adaptive.drift *= (1 - 0.01 * dt);
      }

      variable.setPoint = Math.max(
        variable.min,
        Math.min(variable.max, adaptive.base + adaptive.drift)
      );
    }
  }

  private _computeRegulation(dt: number): void {
    for (const variable of this._variables.values()) {
      const error = variable.setPoint - variable.value;
      const proportional = error * variable.sensitivity * this._regulationEfficiency;
      const integral = variable.integral * 0.01;

      const derivativeEffect = 0;
      const change = (proportional + integral + derivativeEffect) * dt;

      variable.value += change;
    }
  }

  private _applyInteractions(dt: number): void {
    const deltas: Map<string, number> = new Map();

    for (const conn of this._connections) {
      const source = this._variables.get(conn.source);
      const target = this._variables.get(conn.target);
      if (!source || !target) continue;

      const sourceNorm = (source.value - source.min) / (source.max - source.min);
      const targetNorm = (target.value - target.min) / (target.max - target.min);
      const deviation = sourceNorm - 0.5;

      let delta = conn.weight * deviation * dt;
      if (conn.type === 'inhibitory') {
        delta = -delta;
      }

      const current = deltas.get(conn.target) || 0;
      deltas.set(conn.target, current + delta);
    }

    for (const [id, delta] of deltas) {
      const variable = this._variables.get(id);
      if (!variable) continue;
      const range = variable.max - variable.min;
      variable.value += delta * range;
    }
  }

  private _applyNoise(dt: number): void {
    if (this._noiseFloor <= 0) return;
    for (const variable of this._variables.values()) {
      const noise = (Math.random() - 0.5) * this._noiseFloor * Math.sqrt(dt);
      variable.value += noise * (variable.max - variable.min);
    }
  }

  private _updateIntegrals(dt: number): void {
    for (const variable of this._variables.values()) {
      const error = variable.setPoint - variable.value;
      variable.integral += error * dt;
      variable.integral = Math.max(-1, Math.min(1, variable.integral));
    }
  }

  private _updateAllostasis(dt: number): void {
    let totalDeviation = 0;
    for (const variable of this._variables.values()) {
      const normDeviation = Math.abs(variable.value - variable.setPoint) / (variable.max - variable.min);
      totalDeviation += normDeviation;
    }

    const avgDeviation = totalDeviation / this._variables.size;
    const targetAllostasis = Math.min(1, avgDeviation * 2);

    this._allostasisLevel += (targetAllostasis - this._allostasisLevel) * this._adaptationRate * dt;
  }

  private _checkUniselectorReset(): void {
    const stability = this._computeStabilityScore();

    if (stability < 0.3) {
      for (const [id, pos] of this._uniselectorPositions) {
        if (Math.random() < 0.1) {
          this._uniselectorPositions.set(id, Math.random());
          const variable = this._variables.get(id);
          if (variable) {
            variable.sensitivity = 0.05 + Math.random() * 0.15;
          }
        }
      }
    }
  }

  private _clampValues(): void {
    for (const variable of this._variables.values()) {
      variable.value = Math.max(variable.min, Math.min(variable.max, variable.value));
    }
  }

  private _computeStabilityScore(): number {
    if (this._variables.size === 0) return 1;

    let totalStability = 0;
    for (const variable of this._variables.values()) {
      const deviation = Math.abs(variable.value - variable.setPoint);
      const range = variable.max - variable.min;
      const normDeviation = range > 0 ? deviation / range : 0;
      totalStability += Math.max(0, 1 - normDeviation / variable.tolerance);
    }

    return totalStability / this._variables.size;
  }

  private _recordState(): void {
    const variables: Record<string, number> = {};
    const setPoints: Record<string, number> = {};
    const activeRegulators: string[] = [];

    for (const [id, v] of this._variables) {
      variables[id] = v.value;
      setPoints[id] = v.setPoint;
      const deviation = Math.abs(v.value - v.setPoint) / (v.max - v.min);
      if (deviation > v.tolerance) {
        activeRegulators.push(id);
      }
    }

    this._history.push({
      timestamp: Date.now(),
      variables,
      setPoints,
      stabilityScore: this._computeStabilityScore(),
      allostasisLevel: this._allostasisLevel,
      isStable: this.isStable,
      activeRegulators,
    });

    if (this._history.length > this._maxHistory) {
      this._history.shift();
    }
  }

  getState(): HomeostatState {
    const variables: Record<string, number> = {};
    const setPoints: Record<string, number> = {};
    const activeRegulators: string[] = [];

    for (const [id, v] of this._variables) {
      variables[id] = v.value;
      setPoints[id] = v.setPoint;
      const deviation = Math.abs(v.value - v.setPoint) / (v.max - v.min);
      if (deviation > v.tolerance) {
        activeRegulators.push(id);
      }
    }

    return {
      timestamp: Date.now(),
      variables,
      setPoints,
      stabilityScore: this._computeStabilityScore(),
      allostasisLevel: this._allostasisLevel,
      isStable: this.isStable,
      activeRegulators,
    };
  }

  perturb(variableId: string, amount: number): void {
    const variable = this._variables.get(variableId);
    if (!variable) return;
    variable.value += amount;
    variable.value = Math.max(variable.min, Math.min(variable.max, variable.value));
  }

  injectSignal(signal: Signal): void {
    const variable = this._variables.get(signal.source);
    if (variable) {
      variable.value += signal.magnitude * 0.1;
      variable.value = Math.max(variable.min, Math.min(variable.max, variable.value));
    } else {
      const firstVar = this._variables.values().next().value;
      if (firstVar) {
        firstVar.value += signal.magnitude * 0.1;
        firstVar.value = Math.max(firstVar.min, Math.min(firstVar.max, firstVar.value));
      }
    }
  }

  getVariableValue(id: string): number | undefined {
    return this._variables.get(id)?.value;
  }

  getVariableSetPoint(id: string): number | undefined {
    return this._variables.get(id)?.setPoint;
  }

  setSensitivity(variableId: string, sensitivity: number): void {
    const variable = this._variables.get(variableId);
    if (variable) {
      variable.sensitivity = Math.max(0.01, Math.min(0.5, sensitivity));
    }
  }

  getConnections(): HomeostaticConnection[] {
    return this._connections.map(c => ({ ...c }));
  }

  simulate(steps: number, deltaTime: number = 100): HomeostatState[] {
    const results: HomeostatState[] = [];
    for (let i = 0; i < steps; i++) {
      this.update(deltaTime);
      results.push(this.getState());
    }
    return results;
  }

  processPacket(packet: DataPacket): DataPacket {
    const state = this.getState();
    return {
      ...packet,
      payload: {
        ...packet.payload as object,
        homeostasis: {
          stability: state.stabilityScore,
          allostasis: state.allostasisLevel,
          activeRegulators: state.activeRegulators,
          variables: state.variables,
          setPoints: state.setPoints,
        },
      },
      metadata: {
        ...packet.metadata,
        route: [...packet.metadata.route, 'homeostat'],
        residue: state,
      },
    };
  }

  reset(): void {
    this._variables.clear();
    this._connections = [];
    this._history = [];
    this._allostasisLevel = 0;
    this._uniselectorPositions.clear();
    this._adaptiveSetPoints.clear();
    this._lastUpdate = Date.now();
    this._initializeDefaultVariables();
  }
}
