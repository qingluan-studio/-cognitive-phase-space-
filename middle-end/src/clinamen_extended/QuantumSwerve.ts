export interface QuantumState {
  amplitude: number;
  phase: number;
  superposition: { value: number; probability: number }[];
  collapsed: boolean;
  entangledWith: Set<string>;
}

export interface SwerveEvent {
  timestamp: number;
  originalVector: number;
  swervedVector: number;
  uncertainty: number;
  bornProbability: number;
}

export class QuantumSwerve {
  private _state: QuantumState;
  private _events: SwerveEvent[] = [];
  private _uncertaintyConstant: number;
  private _collapseThreshold = 0.5;
  private _entanglementPhase: Map<string, number> = new Map();
  private _id: string;
  private _decoherenceRate = 0.01;

  constructor(uncertainty: number = 0.3, id?: string) {
    this._uncertaintyConstant = Math.max(0, Math.min(1, uncertainty));
    this._id = id ?? `qs-${Math.random().toString(36).slice(2, 10)}`;
    this._state = {
      amplitude: 1,
      phase: 0,
      superposition: [],
      collapsed: false,
      entangledWith: new Set(),
    };
  }

  prepareSuperposition(values: number[]): void {
    const n = Math.max(1, values.length);
    const norm = Math.sqrt(1 / n);
    this._state.superposition = values.map(v => ({ value: v, probability: norm * norm }));
    this._state.collapsed = false;
    this._state.amplitude = norm;
    this._state.phase = 0;
  }

  swerve(vector: number): number {
    const uncertainty = Math.random() * this._uncertaintyConstant;
    const phaseShift = (Math.random() - 0.5) * Math.PI * uncertainty;
    const delta = Math.sin(phaseShift) * uncertainty * vector;
    const swerved = vector + delta;
    const bornProbability = this._state.superposition.length > 0
      ? this._state.superposition[0].probability
      : 0;
    this._events.push({
      timestamp: Date.now(),
      originalVector: vector,
      swervedVector: swerved,
      uncertainty,
      bornProbability,
    });
    if (this._events.length > 100) this._events.shift();
    this._state.phase += phaseShift;
    this._decohere();
    return swerved;
  }

  collapse(): number {
    if (this._state.collapsed) return this._state.amplitude;
    if (this._state.superposition.length === 0) {
      this._state.collapsed = true;
      return 0;
    }
    const r = Math.random();
    let cumulative = 0;
    let chosen = this._state.superposition[0].value;
    let chosenAmp = this._state.superposition[0].probability;
    for (const amp of this._state.superposition) {
      cumulative += amp.probability;
      if (r <= cumulative) {
        chosen = amp.value;
        chosenAmp = amp.probability;
        break;
      }
    }
    this._state.superposition = [{ value: chosen, probability: 1 }];
    this._state.amplitude = Math.sqrt(chosenAmp);
    this._state.collapsed = true;
    return chosen;
  }

  entangle(other: QuantumSwerve): void {
    this._state.entangledWith.add(other._id);
    other._state.entangledWith.add(this._id);
    const avg = (this._uncertaintyConstant + other._uncertaintyConstant) / 2;
    this._uncertaintyConstant = avg;
    other._uncertaintyConstant = avg;
    const sharedPhase = (this._state.phase + other._state.phase) / 2;
    this._entanglementPhase.set(other._id, sharedPhase);
    other._entanglementPhase.set(this._id, sharedPhase);
  }

  measure(): { probability: number; value: number; phase: number } {
    if (this._state.superposition.length === 0) {
      return { probability: 0, value: 0, phase: this._state.phase };
    }
    const idx = Math.floor(Math.random() * this._state.superposition.length);
    const value = this._state.superposition[idx].value;
    return {
      probability: this._state.superposition[idx].probability,
      value,
      phase: this._state.phase,
    };
  }

  interfere(otherValues: number[]): number {
    if (this._state.superposition.length === 0) return 0;
    let sum = 0;
    for (let i = 0; i < this._state.superposition.length; i++) {
      const self = this._state.superposition[i].value;
      const other = otherValues[i % otherValues.length] ?? 0;
      sum += Math.sqrt(self * self + other * other + 2 * self * other * Math.cos(this._state.phase));
    }
    return sum / this._state.superposition.length;
  }

  getEvents(): SwerveEvent[] { return [...this._events]; }
  get isCollapsed(): boolean { return this._state.collapsed; }
  get uncertainty(): number { return this._uncertaintyConstant; }
  get id(): string { return this._id; }
  get entanglementCount(): number { return this._state.entangledWith.size; }

  setCollapseThreshold(value: number): void {
    this._collapseThreshold = Math.max(0, Math.min(1, value));
  }

  private _decohere(): void {
    if (this._state.entangledWith.size === 0) return;
    this._uncertaintyConstant = Math.min(1, this._uncertaintyConstant + this._decoherenceRate);
  }
}
