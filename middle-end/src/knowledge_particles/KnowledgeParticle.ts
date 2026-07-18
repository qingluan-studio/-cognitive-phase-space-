import { KnowledgeUnit, Signal, EntangledToken } from '../shared/types';

export type ParticleState = 'wave' | 'particle' | 'entangled' | 'superposed' | 'collapsed';

export interface KnowledgeQubit {
  state: '0' | '1';
  amplitude0: number;
  amplitude1: number;
  phase: number;
}

export interface ParticleProperty {
  name: string;
  value: number;
  uncertainty: number;
}

export interface IKnowledgeParticle {
  id: string;
  state: ParticleState;
  content: string;
  properties: Map<string, ParticleProperty>;
  superpositionStates: Map<string, number>;
  entangledWith: string[];
  energy: number;
  coherence: number;
  observe(): void;
  getProperty(name: string): ParticleProperty | undefined;
  setProperty(name: string, value: number, uncertainty?: number): void;
  entangle(otherId: string): void;
  disentangle(otherId: string): void;
  computeEntropy(): number;
  toKnowledgeUnit(): KnowledgeUnit;
  toSignal(): Signal;
}

export class KnowledgeParticle implements IKnowledgeParticle {
  private _id: string;
  private _content: string;
  private _state: ParticleState;
  private _properties: Map<string, ParticleProperty>;
  private _superpositionStates: Map<string, number>;
  private _entangledWith: string[];
  private _energy: number;
  private _coherence: number;
  private _phase: number;
  private _mass: number;
  private _spin: number;
  private _observationCount: number;
  private _lastObserved: number | null;
  private _birthTime: number;
  private _qubit: KnowledgeQubit;

  constructor(id: string, content: string) {
    this._id = id;
    this._content = content;
    this._state = 'wave';
    this._properties = new Map();
    this._superpositionStates = new Map();
    this._superpositionStates.set('known', 0.5);
    this._superpositionStates.set('unknown', 0.5);
    this._entangledWith = [];
    this._energy = Math.random() * 0.5 + 0.5;
    this._coherence = 0.9;
    this._phase = Math.random() * Math.PI * 2;
    this._mass = 0.1;
    this._spin = Math.random() * 2 - 1;
    this._observationCount = 0;
    this._lastObserved = null;
    this._birthTime = Date.now();
    this._qubit = {
      state: '0',
      amplitude0: Math.SQRT1_2,
      amplitude1: Math.SQRT1_2,
      phase: 0
    };
  }

  get id(): string { return this._id; }
  get content(): string { return this._content; }
  get state(): ParticleState { return this._state; }
  get energy(): number { return this._energy; }
  get coherence(): number { return this._coherence; }
  get phase(): number { return this._phase; }
  get mass(): number { return this._mass; }
  get spin(): number { return this._spin; }
  get observationCount(): number { return this._observationCount; }
  get lastObserved(): number | null { return this._lastObserved; }
  get age(): number { return Date.now() - this._birthTime; }
  get entangledWith(): string[] { return [...this._entangledWith]; }
  get superpositionStates(): Map<string, number> { return new Map(this._superpositionStates); }
  get properties(): Map<string, ParticleProperty> { return new Map(this._properties); }

  public observe(): void {
    this._observationCount++;
    this._lastObserved = Date.now();
    if (this._state === 'wave' || this._state === 'superposed') {
      this._collapse();
    }
    this._decohere(0.05);
  }

  private _collapse(): void {
    const states = Array.from(this._superpositionStates.entries());
    if (states.length === 0) {
      this._state = 'collapsed';
      return;
    }
    let totalProb = 0;
    for (const [, prob] of states) {
      totalProb += prob * prob;
    }
    let rand = Math.random() * totalProb;
    let chosen = '';
    for (const [state, prob] of states) {
      rand -= prob * prob;
      if (rand <= 0) {
        chosen = state;
        break;
      }
    }
    chosen = chosen || states[0][0];
    this._superpositionStates.clear();
    this._superpositionStates.set(chosen, 1);
    this._qubit.state = Math.random() > 0.5 ? '1' : '0';
    this._qubit.amplitude0 = this._qubit.state === '0' ? 1 : 0;
    this._qubit.amplitude1 = this._qubit.state === '1' ? 1 : 0;
    this._state = 'collapsed';
    this._energy *= 0.8;
  }

  private _decohere(amount: number): void {
    this._coherence = Math.max(0, this._coherence - amount);
    if (this._coherence < 0.1) {
      this._state = 'collapsed';
    }
  }

  public getProperty(name: string): ParticleProperty | undefined {
    const p = this._properties.get(name);
    if (!p) return undefined;
    if (this._state === 'wave' || this._state === 'superposed') {
      return {
        ...p,
        value: p.value + (Math.random() * 2 - 1) * p.uncertainty,
        uncertainty: p.uncertainty * (1 + Math.random() * 0.5)
      };
    }
    return { ...p };
  }

  public setProperty(name: string, value: number, uncertainty: number = 0.1): void {
    this._properties.set(name, { name, value, uncertainty });
    this._energy += 0.05;
    if (this._state === 'collapsed') {
      this._state = 'superposed';
      this._coherence = Math.min(1, this._coherence + 0.2);
    }
  }

  public addSuperpositionState(state: string, probability: number): void {
    this._superpositionStates.set(state, probability);
    this._normalizeSuperposition();
    this._state = this._superpositionStates.size > 1 ? 'superposed' : this._state;
    this._coherence = Math.min(1, this._coherence + 0.1);
  }

  private _normalizeSuperposition(): void {
    let total = 0;
    for (const [, prob] of this._superpositionStates) {
      total += prob * prob;
    }
    if (total > 0) {
      const factor = 1 / Math.sqrt(total);
      for (const [state, prob] of this._superpositionStates) {
        this._superpositionStates.set(state, prob * factor);
      }
    }
  }

  public entangle(otherId: string): void {
    if (!this._entangledWith.includes(otherId)) {
      this._entangledWith.push(otherId);
      this._state = 'entangled';
      this._coherence = Math.min(1, this._coherence + 0.1);
    }
  }

  public disentangle(otherId: string): void {
    const idx = this._entangledWith.indexOf(otherId);
    if (idx >= 0) {
      this._entangledWith.splice(idx, 1);
      if (this._entangledWith.length === 0 && this._state === 'entangled') {
        this._state = 'superposed';
      }
    }
  }

  public computeEntropy(): number {
    let entropy = 0;
    for (const [, prob] of this._superpositionStates) {
      const p = prob * prob;
      if (p > 0) {
        entropy -= p * Math.log2(p);
      }
    }
    for (const [, prop] of this._properties) {
      if (prop.uncertainty > 0) {
        entropy += prop.uncertainty * 0.5;
      }
    }
    entropy += (1 - this._coherence) * 2;
    return entropy;
  }

  public interferesWith(other: KnowledgeParticle): number {
    const phaseDiff = Math.abs(this._phase - other._phase);
    const interference = Math.cos(phaseDiff);
    const coherenceFactor = (this._coherence + other._coherence) / 2;
    return interference * coherenceFactor;
  }

  public applyPhaseShift(delta: number): void {
    this._phase += delta;
    this._qubit.phase += delta;
    while (this._phase > Math.PI * 2) {
      this._phase -= Math.PI * 2;
    }
    while (this._phase < 0) {
      this._phase += Math.PI * 2;
    }
  }

  public hadamardTransform(): void {
    const newAmplitude0 = (this._qubit.amplitude0 + this._qubit.amplitude1) / Math.SQRT2;
    const newAmplitude1 = (this._qubit.amplitude0 - this._qubit.amplitude1) / Math.SQRT2;
    this._qubit.amplitude0 = newAmplitude0;
    this._qubit.amplitude1 = newAmplitude1;
    this._state = 'superposed';
    this._coherence = Math.min(1, this._coherence + 0.1);
  }

  public measureQubit(): '0' | '1' {
    const prob1 = this._qubit.amplitude1 * this._qubit.amplitude1;
    const result = Math.random() < prob1 ? '1' : '0';
    this._qubit.state = result;
    this._qubit.amplitude0 = result === '0' ? 1 : 0;
    this._qubit.amplitude1 = result === '1' ? 1 : 0;
    if (this._state === 'superposed') {
      this._collapse();
    }
    return result;
  }

  public toKnowledgeUnit(): KnowledgeUnit {
    const vector: number[] = [];
    vector.push(this._energy);
    vector.push(this._coherence);
    vector.push(this._state === 'entangled' ? 1 : 0);
    vector.push(this._state === 'superposed' ? 1 : 0);
    vector.push(this._mass);
    vector.push(this._spin);
    vector.push(this._observationCount / 10);
    vector.push(this.computeEntropy() / 5);
    vector.push(this._qubit.amplitude0);
    vector.push(this._qubit.amplitude1);
    const propValues = Array.from(this._properties.values()).map(p => p.value);
    for (let i = 0; i < 10; i++) {
      vector.push(propValues[i] || 0);
    }
    return {
      id: `kp-${this._id}`,
      content: this._content,
      vector,
      lineage: [`state-${this._state}`, ...this._entangledWith]
    };
  }

  public toSignal(): Signal {
    return {
      source: `kp-${this._id}`,
      magnitude: this._energy,
      entropy: this.computeEntropy(),
      timestamp: Date.now()
    };
  }

  public toEntangledToken(): EntangledToken<string> {
    return {
      id: this._id,
      payload: this._content,
      entangledWith: [...this._entangledWith],
      bornAt: this._birthTime
    };
  }

  public clone(): KnowledgeParticle {
    const clone = new KnowledgeParticle(`${this._id}-clone-${Date.now()}`, this._content);
    clone._state = this._state;
    clone._properties = new Map(this._properties);
    clone._superpositionStates = new Map(this._superpositionStates);
    clone._entangledWith = [...this._entangledWith];
    clone._energy = this._energy;
    clone._coherence = this._coherence;
    clone._phase = this._phase;
    clone._mass = this._mass;
    clone._spin = this._spin;
    clone._qubit = { ...this._qubit };
    return clone;
  }

  public decay(amount: number): void {
    this._energy = Math.max(0, this._energy - amount);
    this._coherence = Math.max(0, this._coherence - amount * 0.5);
    if (this._energy < 0.01) {
      this._state = 'collapsed';
    }
  }

  public excite(amount: number): void {
    this._energy = Math.min(1, this._energy + amount);
    this._coherence = Math.min(1, this._coherence + amount * 0.3);
  }
}
