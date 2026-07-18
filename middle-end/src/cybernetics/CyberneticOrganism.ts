import type { DataPacket, Signal, KnowledgeUnit } from '../shared/types';

export type OrganismState = 'dormant' | 'active' | 'learning' | 'adapting' | 'reproducing' | 'repairing';

export interface Sensor {
  id: string;
  type: string;
  sensitivity: number;
  threshold: number;
  active: boolean;
  lastSignal: Signal | null;
}

export interface DecisionUnit {
  id: string;
  name: string;
  activation: number;
  threshold: number;
  weight: number;
  history: number[];
}

export interface Actuator {
  id: string;
  type: string;
  output: number;
  maxOutput: number;
  efficiency: number;
}

export interface Percept {
  id: string;
  timestamp: number;
  sensorId: string;
  rawSignal: Signal;
  processedContent: KnowledgeUnit;
  confidence: number;
}

export interface OrganismSnapshot {
  timestamp: number;
  state: OrganismState;
  energy: number;
  integrity: number;
  adaptationLevel: number;
  sensors: Record<string, number>;
  decisions: Record<string, number>;
  actuators: Record<string, number>;
}

export interface ICyberneticOrganism {
  addSensor(id: string, type: string): void;
  addDecisionUnit(id: string, name: string): void;
  addActuator(id: string, type: string): void;
  sense(signal: Signal): Percept | null;
  decide(): Record<string, number>;
  act(): Record<string, number>;
  update(deltaTime: number): void;
  getState(): OrganismSnapshot;
  processPacket(packet: DataPacket): DataPacket;
  reset(): void;
}

export class CyberneticOrganism implements ICyberneticOrganism {
  private _state: OrganismState = 'dormant';
  private _energy: number = 1.0;
  private _integrity: number = 1.0;
  private _adaptationLevel: number = 0;
  private _age: number = 0;

  private _sensors: Map<string, Sensor> = new Map();
  private _decisionUnits: Map<string, DecisionUnit> = new Map();
  private _actuators: Map<string, Actuator> = new Map();
  private _percepts: Percept[] = [];
  private _memory: KnowledgeUnit[] = [];

  private _sensorToDecision: Map<string, string[]> = new Map();
  private _decisionToActuator: Map<string, string[]> = new Map();

  private _history: OrganismSnapshot[] = [];
  private _maxHistory: number = 500;
  private _learningRate: number = 0.05;
  private _metabolicRate: number = 0.001;
  private _repairRate: number = 0.002;
  private _lastUpdate: number = Date.now();
  private _stimulusThreshold: number = 0.3;
  private _homeostaticTarget: number = 0.75;
  private _responseLatency: number = 50;
  private _actionBuffer: Array<{ timestamp: number; action: Record<string, number> }> = [];

  constructor() {
    this._initializeDefaultSystems();
  }

  get state(): OrganismState { return this._state; }
  get energy(): number { return this._energy; }
  get integrity(): number { return this._integrity; }
  get adaptationLevel(): number { return this._adaptationLevel; }
  get age(): number { return this._age; }
  get sensorCount(): number { return this._sensors.size; }
  get decisionUnitCount(): number { return this._decisionUnits.size; }
  get actuatorCount(): number { return this._actuators.size; }
  get learningRate(): number { return this._learningRate; }
  set learningRate(value: number) { this._learningRate = Math.max(0, Math.min(1, value)); }
  get metabolicRate(): number { return this._metabolicRate; }
  set metabolicRate(value: number) { this._metabolicRate = Math.max(0, Math.min(0.01, value)); }
  get history(): OrganismSnapshot[] { return this._history.map(h => ({ ...h, sensors: { ...h.sensors }, decisions: { ...h.decisions }, actuators: { ...h.actuators } })); }

  private _initializeDefaultSystems(): void {
    this.addSensor('visual', 'vision');
    this.addSensor('auditory', 'hearing');
    this.addSensor('tactile', 'touch');
    this.addSensor('interoceptive', 'internal');

    this.addDecisionUnit('threat-detection', 'Threat Detection');
    this.addDecisionUnit('reward-evaluation', 'Reward Evaluation');
    this.addDecisionUnit('planning', 'Planning');
    this.addDecisionUnit('homeostasis', 'Homeostasis');

    this.addActuator('motor', 'movement');
    this.addActuator('vocal', 'vocalization');
    this.addActuator('metabolic', 'metabolism');
    this.addActuator('attention', 'attention');

    this._wireDefaultConnections();
  }

  private _wireDefaultConnections(): void {
    this._sensorToDecision.set('visual', ['threat-detection', 'reward-evaluation', 'planning']);
    this._sensorToDecision.set('auditory', ['threat-detection', 'reward-evaluation']);
    this._sensorToDecision.set('tactile', ['threat-detection', 'homeostasis']);
    this._sensorToDecision.set('interoceptive', ['homeostasis', 'reward-evaluation']);

    this._decisionToActuator.set('threat-detection', ['motor', 'attention']);
    this._decisionToActuator.set('reward-evaluation', ['motor', 'metabolic']);
    this._decisionToActuator.set('planning', ['motor', 'attention', 'vocal']);
    this._decisionToActuator.set('homeostasis', ['metabolic']);
  }

  addSensor(id: string, type: string): void {
    if (this._sensors.has(id)) return;
    this._sensors.set(id, {
      id,
      type,
      sensitivity: 0.5 + Math.random() * 0.3,
      threshold: 0.2,
      active: true,
      lastSignal: null,
    });
  }

  addDecisionUnit(id: string, name: string): void {
    if (this._decisionUnits.has(id)) return;
    this._decisionUnits.set(id, {
      id,
      name,
      activation: 0,
      threshold: 0.5,
      weight: 1,
      history: [],
    });
  }

  addActuator(id: string, type: string): void {
    if (this._actuators.has(id)) return;
    this._actuators.set(id, {
      id,
      type,
      output: 0,
      maxOutput: 1,
      efficiency: 0.8,
    });
  }

  sense(signal: Signal): Percept | null {
    const sensor = this._sensors.get(signal.source);
    if (!sensor || !sensor.active) return null;

    const effectiveMagnitude = signal.magnitude * sensor.sensitivity;
    if (effectiveMagnitude < sensor.threshold) return null;

    sensor.lastSignal = signal;

    const processed: KnowledgeUnit = {
      id: `percept-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      content: `Percept from ${sensor.type}: magnitude=${effectiveMagnitude.toFixed(3)}`,
      vector: this._generatePerceptVector(signal, sensor),
      lineage: [signal.source, sensor.type, 'percept'],
    };

    const confidence = Math.min(1, effectiveMagnitude * sensor.sensitivity);

    const percept: Percept = {
      id: processed.id,
      timestamp: Date.now(),
      sensorId: signal.source,
      rawSignal: signal,
      processedContent: processed,
      confidence,
    };

    this._percepts.push(percept);
    if (this._percepts.length > 100) this._percepts.shift();

    this._memory.push(processed);
    if (this._memory.length > 500) this._memory.shift();

    this._activateDecisionUnits(percept);

    return percept;
  }

  private _generatePerceptVector(signal: Signal, sensor: Sensor): number[] {
    const vector = new Array(8).fill(0);
    vector[0] = signal.magnitude * sensor.sensitivity;
    vector[1] = signal.entropy;
    vector[2] = sensor.sensitivity;
    vector[3] = Math.random() * 0.1;
    vector[4] = (signal.timestamp % 1000) / 1000;
    vector[5] = sensor.threshold;
    vector[6] = signal.magnitude > sensor.threshold ? 1 : 0;
    vector[7] = 1 - signal.entropy;
    return vector;
  }

  private _activateDecisionUnits(percept: Percept): void {
    const connectedUnits = this._sensorToDecision.get(percept.sensorId) || [];

    for (const unitId of connectedUnits) {
      const unit = this._decisionUnits.get(unitId);
      if (!unit) continue;

      const activationDelta = percept.confidence * 0.3;
      unit.activation = Math.min(1, unit.activation + activationDelta);

      unit.history.push(unit.activation);
      if (unit.history.length > 50) unit.history.shift();
    }
  }

  decide(): Record<string, number> {
    const decisions: Record<string, number> = {};

    for (const [id, unit] of this._decisionUnits) {
      const activated = unit.activation >= unit.threshold;
      decisions[id] = activated ? unit.activation : 0;

      if (activated) {
        this._triggerActuators(id, unit.activation);
      }
    }

    this._decayDecisionUnits();

    return decisions;
  }

  private _decayDecisionUnits(): void {
    for (const unit of this._decisionUnits.values()) {
      unit.activation *= 0.95;
      if (unit.activation < 0.01) unit.activation = 0;
    }
  }

  private _triggerActuators(decisionId: string, activation: number): void {
    const connectedActuators = this._decisionToActuator.get(decisionId) || [];

    const action: Record<string, number> = {};
    for (const actId of connectedActuators) {
      const actuator = this._actuators.get(actId);
      if (!actuator) continue;

      const output = activation * actuator.efficiency * actuator.maxOutput;
      actuator.output = Math.min(actuator.maxOutput, actuator.output + output * 0.5);
      action[actId] = actuator.output;
    }

    this._actionBuffer.push({ timestamp: Date.now(), action });
    if (this._actionBuffer.length > 20) this._actionBuffer.shift();
  }

  act(): Record<string, number> {
    const outputs: Record<string, number> = {};

    for (const [id, actuator] of this._actuators) {
      outputs[id] = actuator.output;
      const energyCost = actuator.output * this._metabolicRate * 10;
      this._energy = Math.max(0, this._energy - energyCost);
    }

    this._decayActuators();

    return outputs;
  }

  private _decayActuators(): void {
    for (const actuator of this._actuators.values()) {
      actuator.output *= 0.9;
      if (actuator.output < 0.01) actuator.output = 0;
    }
  }

  update(deltaTime: number): void {
    const dt = deltaTime / 1000;
    this._age += dt;

    this._metabolize(dt);
    this._maintainHomeostasis(dt);
    this._updateState();
    this._adapt(dt);
    this._repair(dt);
    this._decaySensors(dt);

    this._lastUpdate = Date.now();
    this._recordSnapshot();
  }

  private _metabolize(dt: number): void {
    this._energy -= this._metabolicRate * dt;
    this._energy = Math.max(0, Math.min(1, this._energy));
  }

  private _maintainHomeostasis(dt: number): void {
    const homeoUnit = this._decisionUnits.get('homeostasis');
    if (homeoUnit) {
      const energyDeficit = this._homeostaticTarget - this._energy;
      homeoUnit.activation = Math.max(homeoUnit.activation, Math.abs(energyDeficit) * 0.5);
    }
  }

  private _updateState(): void {
    const avgActivation = Array.from(this._decisionUnits.values())
      .reduce((sum, u) => sum + u.activation, 0) / this._decisionUnits.size;

    if (this._energy < 0.1) {
      this._state = 'dormant';
    } else if (this._integrity < 0.5) {
      this._state = 'repairing';
    } else if (avgActivation > this._stimulusThreshold * 2) {
      this._state = 'active';
    } else if (avgActivation > this._stimulusThreshold) {
      this._state = 'learning';
    } else if (this._adaptationLevel > 0.3 && this._energy > 0.7) {
      this._state = 'adapting';
    } else {
      this._state = 'dormant';
    }
  }

  private _adapt(dt: number): void {
    if (this._state !== 'learning' && this._state !== 'adapting') return;
    if (this._energy < 0.3) return;

    this._adaptationLevel += this._learningRate * dt * 0.01;
    this._adaptationLevel = Math.min(1, this._adaptationLevel);

    for (const sensor of this._sensors.values()) {
      sensor.sensitivity += (Math.random() - 0.3) * this._learningRate * dt * 0.1;
      sensor.sensitivity = Math.max(0.1, Math.min(1, sensor.sensitivity));
    }
  }

  private _repair(dt: number): void {
    if (this._integrity >= 1) return;
    if (this._energy < 0.2) return;

    const repairAmount = this._repairRate * dt * (this._state === 'repairing' ? 3 : 1);
    this._integrity = Math.min(1, this._integrity + repairAmount);
    this._energy -= repairAmount * 0.5;
  }

  private _decaySensors(dt: number): void {
    for (const sensor of this._sensors.values()) {
      if (sensor.lastSignal) {
        const timeSince = Date.now() - sensor.lastSignal.timestamp;
        if (timeSince > 5000) {
          sensor.lastSignal = null;
        }
      }
    }
  }

  private _recordSnapshot(): void {
    const sensors: Record<string, number> = {};
    const decisions: Record<string, number> = {};
    const actuators: Record<string, number> = {};

    for (const [id, s] of this._sensors) sensors[id] = s.lastSignal?.magnitude || 0;
    for (const [id, d] of this._decisionUnits) decisions[id] = d.activation;
    for (const [id, a] of this._actuators) actuators[id] = a.output;

    this._history.push({
      timestamp: Date.now(),
      state: this._state,
      energy: this._energy,
      integrity: this._integrity,
      adaptationLevel: this._adaptationLevel,
      sensors,
      decisions,
      actuators,
    });

    if (this._history.length > this._maxHistory) {
      this._history.shift();
    }
  }

  getState(): OrganismSnapshot {
    const sensors: Record<string, number> = {};
    const decisions: Record<string, number> = {};
    const actuators: Record<string, number> = {};

    for (const [id, s] of this._sensors) sensors[id] = s.lastSignal?.magnitude || 0;
    for (const [id, d] of this._decisionUnits) decisions[id] = d.activation;
    for (const [id, a] of this._actuators) actuators[id] = a.output;

    return {
      timestamp: Date.now(),
      state: this._state,
      energy: this._energy,
      integrity: this._integrity,
      adaptationLevel: this._adaptationLevel,
      sensors,
      decisions,
      actuators,
    };
  }

  ingestEnergy(amount: number): void {
    this._energy = Math.min(1, this._energy + amount);
  }

  damage(amount: number): void {
    this._integrity = Math.max(0, this._integrity - amount);
  }

  getPercepts(limit: number = 10): Percept[] {
    return this._percepts.slice(-limit).map(p => ({ ...p }));
  }

  getMemory(limit: number = 20): KnowledgeUnit[] {
    return this._memory.slice(-limit).map(m => ({ ...m }));
  }

  processPacket(packet: DataPacket): DataPacket {
    const state = this.getState();
    return {
      ...packet,
      payload: {
        ...packet.payload as object,
        organism: {
          state: state.state,
          energy: state.energy,
          integrity: state.integrity,
          adaptation: state.adaptationLevel,
          age: this._age,
        },
      },
      metadata: {
        ...packet.metadata,
        route: [...packet.metadata.route, 'cybernetic-organism'],
        residue: state,
      },
    };
  }

  simulateLifeCycle(steps: number, deltaTime: number = 100): OrganismSnapshot[] {
    const results: OrganismSnapshot[] = [];

    for (let i = 0; i < steps; i++) {
      if (Math.random() < 0.3) {
        const signal: Signal = {
          source: Math.random() < 0.5 ? 'visual' : 'auditory',
          magnitude: Math.random() * 0.8,
          entropy: Math.random(),
          timestamp: Date.now(),
        };
        this.sense(signal);
      }

      this.decide();
      this.act();
      this.update(deltaTime);

      if (i % 10 === 0 && this._energy > 0.5) {
        this.ingestEnergy(0.1);
      }

      results.push(this.getState());
    }

    return results;
  }

  reset(): void {
    this._state = 'dormant';
    this._energy = 1.0;
    this._integrity = 1.0;
    this._adaptationLevel = 0;
    this._age = 0;
    this._sensors.clear();
    this._decisionUnits.clear();
    this._actuators.clear();
    this._percepts = [];
    this._memory = [];
    this._sensorToDecision.clear();
    this._decisionToActuator.clear();
    this._history = [];
    this._actionBuffer = [];
    this._lastUpdate = Date.now();
    this._initializeDefaultSystems();
  }
}
