import type { DataPacket, Signal } from '../shared/types';

export type FeedbackType = 'positive' | 'negative';

export type LoopState = 'growing' | 'decaying' | 'oscillating' | 'stable' | 'divergent';

export interface FeedbackConnection {
  id: string;
  source: string;
  target: string;
  type: FeedbackType;
  gain: number;
  delay: number;
  threshold: number;
}

export interface LoopVariable {
  name: string;
  value: number;
  target: number;
  min: number;
  max: number;
  velocity: number;
  acceleration: number;
}

export interface LoopSnapshot {
  timestamp: number;
  variables: Record<string, number>;
  state: LoopState;
  energy: number;
  amplitude: number;
  frequency: number;
}

export interface IFeedbackLoop {
  addVariable(name: string, initial: number, min: number, max: number): void;
  addConnection(source: string, target: string, type: FeedbackType, gain: number, delay: number): void;
  setTarget(name: string, value: number): void;
  update(deltaTime: number): void;
  getState(): LoopState;
  getSnapshot(): LoopSnapshot;
  inject(signal: Signal): void;
  processPacket(packet: DataPacket): DataPacket;
  reset(): void;
}

export class FeedbackLoop implements IFeedbackLoop {
  private _variables: Map<string, LoopVariable> = new Map();
  private _connections: FeedbackConnection[] = [];
  private _connectionHistory: Map<string, number[]> = new Map();
  private _state: LoopState = 'stable';
  private _energy: number = 0;
  private _amplitude: number = 0;
  private _frequency: number = 0;
  private _phase: number = 0;
  private _history: LoopSnapshot[] = [];
  private _damping: number = 0.05;
  private _noiseLevel: number = 0.01;
  private _lastUpdate: number = Date.now();
  private _oscillationPeriods: number[] = [];
  private _peakDetector: Map<string, { lastPeak: number; lastTrough: number; direction: number }> = new Map();

  constructor() {
    this._initializeDefaults();
  }

  get state(): LoopState { return this._state; }
  get energy(): number { return this._energy; }
  get amplitude(): number { return this._amplitude; }
  get frequency(): number { return this._frequency; }
  get variableNames(): string[] { return Array.from(this._variables.keys()); }
  get history(): LoopSnapshot[] { return this._history.map(h => ({ ...h, variables: { ...h.variables } })); }
  get damping(): number { return this._damping; }
  set damping(value: number) { this._damping = Math.max(0, Math.min(1, value)); }
  get noiseLevel(): number { return this._noiseLevel; }
  set noiseLevel(value: number) { this._noiseLevel = Math.max(0, Math.min(0.5, value)); }

  private _initializeDefaults(): void {
    this.addVariable('output', 0.5, 0, 1);
    this.addVariable('error', 0, -1, 1);
    this.setTarget('output', 0.5);
  }

  addVariable(name: string, initial: number, min: number, max: number): void {
    if (this._variables.has(name)) return;
    this._variables.set(name, {
      name,
      value: initial,
      target: initial,
      min,
      max,
      velocity: 0,
      acceleration: 0,
    });
    this._peakDetector.set(name, { lastPeak: initial, lastTrough: initial, direction: 0 });
  }

  addConnection(source: string, target: string, type: FeedbackType, gain: number, delay: number): void {
    if (!this._variables.has(source) || !this._variables.has(target)) return;
    const id = `${source}-${target}-${Date.now()}`;
    this._connections.push({ id, source, target, type, gain, delay, threshold: 0.01 });
    this._connectionHistory.set(id, []);
  }

  setTarget(name: string, value: number): void {
    const variable = this._variables.get(name);
    if (!variable) return;
    variable.target = Math.max(variable.min, Math.min(variable.max, value));
  }

  update(deltaTime: number): void {
    const now = Date.now();
    const dt = deltaTime / 1000;

    this._computeErrors();
    this._applyFeedback(dt);
    this._updateDynamics(dt);
    this._applyNoise(dt);
    this._detectOscillations();
    this._computeEnergy();
    this._classifyState();

    this._lastUpdate = now;
    this._recordSnapshot();
  }

  private _computeErrors(): void {
    for (const variable of this._variables.values()) {
      const errorVar = this._variables.get('error');
      if (errorVar && variable.name === 'output') {
        errorVar.value = variable.target - variable.value;
      }
    }
  }

  private _applyFeedback(dt: number): void {
    const influences: Map<string, number> = new Map();

    for (const conn of this._connections) {
      const source = this._variables.get(conn.source);
      const target = this._variables.get(conn.target);
      if (!source || !target) continue;

      const sourceNorm = (source.value - source.min) / (source.max - source.min);
      if (Math.abs(sourceNorm - 0.5) < conn.threshold) continue;

      const deviation = sourceNorm - 0.5;
      let influence = conn.gain * deviation * dt;

      if (conn.type === 'negative') {
        influence = -influence;
      }

      const current = influences.get(conn.target) || 0;
      influences.set(conn.target, current + influence);
    }

    for (const [name, influence] of influences) {
      const variable = this._variables.get(name);
      if (!variable) continue;
      variable.acceleration += influence;
    }
  }

  private _updateDynamics(dt: number): void {
    for (const variable of this._variables.values()) {
      variable.velocity += variable.acceleration;
      variable.velocity *= (1 - this._damping);
      variable.value += variable.velocity * dt;
      variable.value = Math.max(variable.min, Math.min(variable.max, variable.value));
      variable.acceleration = 0;
    }
    this._phase += dt * this._frequency * 2 * Math.PI;
  }

  private _applyNoise(dt: number): void {
    if (this._noiseLevel <= 0) return;
    for (const variable of this._variables.values()) {
      const noise = (Math.random() - 0.5) * this._noiseLevel * Math.sqrt(dt);
      variable.velocity += noise;
    }
  }

  private _detectOscillations(): void {
    let totalAmplitude = 0;
    let oscillatingCount = 0;

    for (const variable of this._variables.values()) {
      const detector = this._peakDetector.get(variable.name);
      if (!detector) continue;

      const newDirection = Math.sign(variable.velocity);

      if (detector.direction > 0 && newDirection < 0) {
        detector.lastPeak = variable.value;
        const period = this._oscillationPeriods.length > 0 ? this._oscillationPeriods[this._oscillationPeriods.length - 1] : 1;
        this._oscillationPeriods.push(Date.now() - (this._lastUpdate - period));
        if (this._oscillationPeriods.length > 20) this._oscillationPeriods.shift();
      } else if (detector.direction < 0 && newDirection > 0) {
        detector.lastTrough = variable.value;
      }

      detector.direction = newDirection;

      const amp = (detector.lastPeak - detector.lastTrough) / 2;
      if (amp > 0.01) {
        totalAmplitude += amp;
        oscillatingCount++;
      }
    }

    this._amplitude = oscillatingCount > 0 ? totalAmplitude / oscillatingCount : 0;

    if (this._oscillationPeriods.length > 2) {
      const avgPeriod = this._oscillationPeriods.reduce((a, b) => a + b, 0) / this._oscillationPeriods.length;
      this._frequency = avgPeriod > 0 ? 1000 / avgPeriod : 0;
    }
  }

  private _computeEnergy(): void {
    let kinetic = 0;
    let potential = 0;

    for (const variable of this._variables.values()) {
      kinetic += 0.5 * variable.velocity * variable.velocity;
      const displacement = variable.value - variable.target;
      potential += 0.5 * displacement * displacement;
    }

    this._energy = kinetic + potential;
  }

  private _classifyState(): void {
    const avgVelocity = Array.from(this._variables.values())
      .reduce((sum, v) => sum + Math.abs(v.velocity), 0) / this._variables.size;

    if (this._amplitude > 0.1 && this._frequency > 0.01) {
      const amplitudeTrend = this._amplitudeTrend();
      if (amplitudeTrend > 0.05) {
        this._state = 'divergent';
      } else if (amplitudeTrend < -0.05) {
        this._state = 'decaying';
      } else {
        this._state = 'oscillating';
      }
    } else if (avgVelocity < 0.001) {
      this._state = 'stable';
    } else if (avgVelocity > 0.05) {
      this._state = 'growing';
    } else {
      this._state = 'decaying';
    }
  }

  private _amplitudeTrend(): number {
    if (this._history.length < 10) return 0;
    const recent = this._history.slice(-10);
    let trend = 0;
    for (let i = 1; i < recent.length; i++) {
      trend += recent[i].amplitude - recent[i - 1].amplitude;
    }
    return trend / recent.length;
  }

  private _recordSnapshot(): void {
    const variables: Record<string, number> = {};
    for (const [name, v] of this._variables) {
      variables[name] = v.value;
    }

    this._history.push({
      timestamp: Date.now(),
      variables,
      state: this._state,
      energy: this._energy,
      amplitude: this._amplitude,
      frequency: this._frequency,
    });

    if (this._history.length > 1000) {
      this._history.shift();
    }
  }

  getState(): LoopState {
    return this._state;
  }

  getSnapshot(): LoopSnapshot {
    const variables: Record<string, number> = {};
    for (const [name, v] of this._variables) {
      variables[name] = v.value;
    }
    return {
      timestamp: Date.now(),
      variables,
      state: this._state,
      energy: this._energy,
      amplitude: this._amplitude,
      frequency: this._frequency,
    };
  }

  inject(signal: Signal): void {
    const outputVar = this._variables.get('output');
    if (!outputVar) return;
    const scaledMagnitude = signal.magnitude * (outputVar.max - outputVar.min);
    outputVar.velocity += scaledMagnitude * 0.1;
  }

  processPacket(packet: DataPacket): DataPacket {
    const snapshot = this.getSnapshot();
    return {
      ...packet,
      payload: {
        ...packet.payload as object,
        feedbackState: snapshot.state,
        feedbackEnergy: snapshot.energy,
        feedbackAmplitude: snapshot.amplitude,
        variables: snapshot.variables,
      },
      metadata: {
        ...packet.metadata,
        route: [...packet.metadata.route, 'feedback-loop'],
        residue: snapshot,
      },
    };
  }

  getVariableValue(name: string): number | undefined {
    return this._variables.get(name)?.value;
  }

  getVariableTarget(name: string): number | undefined {
    return this._variables.get(name)?.target;
  }

  setGain(connectionId: string, gain: number): void {
    const conn = this._connections.find(c => c.id === connectionId);
    if (conn) {
      conn.gain = gain;
    }
  }

  getConnections(): FeedbackConnection[] {
    return this._connections.map(c => ({ ...c }));
  }

  simulate(steps: number, deltaTime: number = 100): LoopSnapshot[] {
    const results: LoopSnapshot[] = [];
    for (let i = 0; i < steps; i++) {
      this.update(deltaTime);
      results.push(this.getSnapshot());
    }
    return results;
  }

  reset(): void {
    this._variables.clear();
    this._connections = [];
    this._connectionHistory.clear();
    this._state = 'stable';
    this._energy = 0;
    this._amplitude = 0;
    this._frequency = 0;
    this._phase = 0;
    this._history = [];
    this._oscillationPeriods = [];
    this._peakDetector.clear();
    this._lastUpdate = Date.now();
    this._initializeDefaults();
  }
}
