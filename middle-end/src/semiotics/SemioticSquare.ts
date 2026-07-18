import type { DataPacket, KnowledgeUnit } from '../shared/types';

export type SemioticPosition = 's1' | 's2' | 'not-s1' | 'not-s2';

export type SquareRelation = 'contradiction' | 'contrariety' | 'subcontrariety' | 'implication' | 'subimplication';

export interface SemioticTerm {
  position: SemioticPosition;
  label: string;
  concept: KnowledgeUnit | null;
  salience: number;
  value: number;
}

export interface SquareRelationEdge {
  from: SemioticPosition;
  to: SemioticPosition;
  type: SquareRelation;
  strength: number;
}

export interface SemioticSquareState {
  terms: Record<SemioticPosition, SemioticTerm>;
  relations: SquareRelationEdge[];
  tension: number;
  resolution: number;
  complexity: number;
  equilibrium: number;
}

export interface SquareDynamics {
  s1S2Tension: number;
  s1NotS1Balance: number;
  s2NotS2Balance: number;
  diagonalComplexity: number;
  metaStability: number;
}

export interface ISemioticSquare {
  setTerm(position: SemioticPosition, label: string, concept?: KnowledgeUnit): void;
  setValue(position: SemioticPosition, value: number): void;
  getTerm(position: SemioticPosition): SemioticTerm;
  getState(): SemioticSquareState;
  computeDynamics(): SquareDynamics;
  getRelation(from: SemioticPosition, to: SemioticPosition): SquareRelationEdge | undefined;
  update(deltaTime: number): void;
  processPacket(packet: DataPacket): DataPacket;
  reset(): void;
}

export class SemioticSquare implements ISemioticSquare {
  private _s1: SemioticTerm;
  private _s2: SemioticTerm;
  private _notS1: SemioticTerm;
  private _notS2: SemioticTerm;

  private _relations: SquareRelationEdge[];
  private _tension: number = 0;
  private _resolution: number = 0;
  private _complexity: number = 0;
  private _equilibrium: number = 0.5;

  private _history: SemioticSquareState[] = [];
  private _maxHistory: number = 200;
  private _diffusionRate: number = 0.02;
  private _interactionStrength: number = 0.3;
  private _lastUpdate: number = Date.now();
  private _decayRate: number = 0.005;
  private _saliences: Record<SemioticPosition, number> = {
    s1: 0.8,
    s2: 0.7,
    'not-s1': 0.5,
    'not-s2': 0.55,
  };

  constructor() {
    this._s1 = {
      position: 's1',
      label: 'S1 (正题)',
      concept: null,
      salience: 0.8,
      value: 0.7,
    };

    this._s2 = {
      position: 's2',
      label: 'S2 (反题)',
      concept: null,
      salience: 0.7,
      value: 0.3,
    };

    this._notS1 = {
      position: 'not-s1',
      label: '非S1',
      concept: null,
      salience: 0.5,
      value: 0.3,
    };

    this._notS2 = {
      position: 'not-s2',
      label: '非S2',
      concept: null,
      salience: 0.55,
      value: 0.7,
    };

    this._relations = this._initializeRelations();
    this._computeMetrics();
  }

  get tension(): number { return this._tension; }
  get resolution(): number { return this._resolution; }
  get complexity(): number { return this._complexity; }
  get equilibrium(): number { return this._equilibrium; }
  get diffusionRate(): number { return this._diffusionRate; }
  set diffusionRate(value: number) { this._diffusionRate = Math.max(0, Math.min(0.1, value)); }
  get interactionStrength(): number { return this._interactionStrength; }
  set interactionStrength(value: number) { this._interactionStrength = Math.max(0, Math.min(1, value)); }

  private _initializeRelations(): SquareRelationEdge[] {
    return [
      { from: 's1', to: 's2', type: 'contrariety', strength: 0.8 },
      { from: 's1', to: 'not-s1', type: 'contradiction', strength: 1.0 },
      { from: 's1', to: 'not-s2', type: 'subimplication', strength: 0.6 },
      { from: 's2', to: 'not-s2', type: 'contradiction', strength: 1.0 },
      { from: 's2', to: 'not-s1', type: 'subimplication', strength: 0.6 },
      { from: 'not-s1', to: 'not-s2', type: 'subcontrariety', strength: 0.7 },
    ];
  }

  setTerm(position: SemioticPosition, label: string, concept?: KnowledgeUnit): void {
    const term = this._getTermRef(position);
    term.label = label;
    if (concept) {
      term.concept = { ...concept };
    }
    this._computeMetrics();
  }

  setValue(position: SemioticPosition, value: number): void {
    const term = this._getTermRef(position);
    term.value = Math.max(0, Math.min(1, value));
    this._computeMetrics();
  }

  private _getTermRef(position: SemioticPosition): SemioticTerm {
    switch (position) {
      case 's1': return this._s1;
      case 's2': return this._s2;
      case 'not-s1': return this._notS1;
      case 'not-s2': return this._notS2;
    }
  }

  getTerm(position: SemioticPosition): SemioticTerm {
    const term = this._getTermRef(position);
    return {
      ...term,
      concept: term.concept ? { ...term.concept } : null,
    };
  }

  private _computeMetrics(): void {
    this._tension = this._computeTension();
    this._complexity = this._computeComplexity();
    this._resolution = this._computeResolution();
    this._equilibrium = this._computeEquilibrium();
  }

  private _computeTension(): number {
    const contrariety = Math.abs(this._s1.value - this._s2.value);
    const contradiction1 = Math.abs(this._s1.value - this._notS1.value);
    const contradiction2 = Math.abs(this._s2.value - this._notS2.value);
    const subcontrariety = Math.abs(this._notS1.value - this._notS2.value);

    return (contrariety * 0.3 + contradiction1 * 0.25 + contradiction2 * 0.25 + subcontrariety * 0.2);
  }

  private _computeComplexity(): number {
    const values = [this._s1.value, this._s2.value, this._notS1.value, this._notS2.value];
    const saliences = [this._s1.salience, this._s2.salience, this._notS1.salience, this._notS2.salience];

    let entropy = 0;
    let totalWeight = 0;
    for (let i = 0; i < values.length; i++) {
      const weight = values[i] * saliences[i];
      totalWeight += weight;
    }

    for (let i = 0; i < values.length; i++) {
      const p = totalWeight > 0 ? (values[i] * saliences[i]) / totalWeight : 0.25;
      if (p > 0) {
        entropy -= p * Math.log2(p);
      }
    }

    return entropy / 2;
  }

  private _computeResolution(): number {
    const diagonal1 = this._s1.value + this._notS2.value;
    const diagonal2 = this._s2.value + this._notS1.value;

    const s1Balance = this._s1.value + this._notS1.value;
    const s2Balance = this._s2.value + this._notS2.value;

    const diagonalBalance = 1 - Math.abs(diagonal1 - diagonal2) / 2;
    const axialBalance = 1 - (Math.abs(s1Balance - 1) + Math.abs(s2Balance - 1)) / 2;

    return (diagonalBalance * 0.6 + axialBalance * 0.4);
  }

  private _computeEquilibrium(): number {
    const avg = (this._s1.value + this._s2.value + this._notS1.value + this._notS2.value) / 4;
    const variance = [this._s1.value, this._s2.value, this._notS1.value, this._notS2.value]
      .reduce((s, v) => s + (v - avg) ** 2, 0) / 4;
    return Math.max(0, 1 - Math.sqrt(variance) * 2);
  }

  computeDynamics(): SquareDynamics {
    return {
      s1S2Tension: Math.abs(this._s1.value - this._s2.value),
      s1NotS1Balance: 1 - Math.abs(this._s1.value + this._notS1.value - 1),
      s2NotS2Balance: 1 - Math.abs(this._s2.value + this._notS2.value - 1),
      diagonalComplexity: Math.abs((this._s1.value + this._notS2.value) - (this._s2.value + this._notS1.value)),
      metaStability: this._equilibrium * (1 - this._tension),
    };
  }

  getRelation(from: SemioticPosition, to: SemioticPosition): SquareRelationEdge | undefined {
    return this._relations.find(r =>
      (r.from === from && r.to === to) || (r.from === to && r.to === from)
    );
  }

  getState(): SemioticSquareState {
    return {
      terms: {
        s1: this.getTerm('s1'),
        s2: this.getTerm('s2'),
        'not-s1': this.getTerm('not-s1'),
        'not-s2': this.getTerm('not-s2'),
      },
      relations: this._relations.map(r => ({ ...r })),
      tension: this._tension,
      resolution: this._resolution,
      complexity: this._complexity,
      equilibrium: this._equilibrium,
    };
  }

  update(deltaTime: number): void {
    const dt = deltaTime / 1000;

    this._diffuse(dt);
    this._interact(dt);
    this._decay(dt);
    this._enforceConstraints();
    this._computeMetrics();
    this._recordState();

    this._lastUpdate = Date.now();
  }

  private _diffuse(dt: number): void {
    const s1 = this._s1.value;
    const s2 = this._s2.value;
    const notS1 = this._notS1.value;
    const notS2 = this._notS2.value;

    const rate = this._diffusionRate * dt;

    this._s1.value += (notS2 - s1) * rate * 0.3;
    this._s2.value += (notS1 - s2) * rate * 0.3;
    this._notS1.value += (s2 - notS1) * rate * 0.3;
    this._notS2.value += (s1 - notS2) * rate * 0.3;
  }

  private _interact(dt: number): void {
    const strength = this._interactionStrength * dt;

    const s1 = this._s1.value;
    const s2 = this._s2.value;
    const notS1 = this._notS1.value;
    const notS2 = this._notS2.value;

    this._s1.value -= s2 * strength * 0.2;
    this._s2.value -= s1 * strength * 0.2;

    this._notS1.value += s2 * strength * 0.15;
    this._notS2.value += s1 * strength * 0.15;
  }

  private _decay(dt: number): void {
    const decay = this._decayRate * dt;
    this._s1.value += (0.5 - this._s1.value) * decay;
    this._s2.value += (0.5 - this._s2.value) * decay;
    this._notS1.value += (0.5 - this._notS1.value) * decay;
    this._notS2.value += (0.5 - this._notS2.value) * decay;
  }

  private _enforceConstraints(): void {
    this._s1.value = Math.max(0, Math.min(1, this._s1.value));
    this._s2.value = Math.max(0, Math.min(1, this._s2.value));
    this._notS1.value = Math.max(0, Math.min(1, this._notS1.value));
    this._notS2.value = Math.max(0, Math.min(1, this._notS2.value));
  }

  private _recordState(): void {
    this._history.push(this.getState());
    if (this._history.length > this._maxHistory) {
      this._history.shift();
    }
  }

  setSalience(position: SemioticPosition, salience: number): void {
    const term = this._getTermRef(position);
    term.salience = Math.max(0, Math.min(1, salience));
    this._saliences[position] = term.salience;
    this._computeMetrics();
  }

  setRelationStrength(from: SemioticPosition, to: SemioticPosition, strength: number): void {
    const relation = this._relations.find(r =>
      (r.from === from && r.to === to) || (r.from === to && r.to === from)
    );
    if (relation) {
      relation.strength = Math.max(0, Math.min(1, strength));
    }
  }

  perturb(position: SemioticPosition, amount: number): void {
    const term = this._getTermRef(position);
    term.value = Math.max(0, Math.min(1, term.value + amount));
    this._computeMetrics();
  }

  getHistory(): SemioticSquareState[] {
    return this._history.map(s => ({
      ...s,
      terms: {
        s1: { ...s.terms.s1 },
        s2: { ...s.terms.s2 },
        'not-s1': { ...s.terms['not-s1'] },
        'not-s2': { ...s.terms['not-s2'] },
      },
      relations: s.relations.map(r => ({ ...r })),
    }));
  }

  simulate(steps: number, deltaTime: number = 100): SemioticSquareState[] {
    const results: SemioticSquareState[] = [];
    for (let i = 0; i < steps; i++) {
      if (Math.random() < 0.1) {
        const positions: SemioticPosition[] = ['s1', 's2', 'not-s1', 'not-s2'];
        const pos = positions[Math.floor(Math.random() * positions.length)];
        this.perturb(pos, (Math.random() - 0.5) * 0.2);
      }
      this.update(deltaTime);
      results.push(this.getState());
    }
    return results;
  }

  processPacket(packet: DataPacket): DataPacket {
    const state = this.getState();
    const dynamics = this.computeDynamics();
    return {
      ...packet,
      payload: {
        ...packet.payload as object,
        semioticSquare: {
          tension: state.tension,
          resolution: state.resolution,
          complexity: state.complexity,
          equilibrium: state.equilibrium,
          dynamics,
        },
      },
      metadata: {
        ...packet.metadata,
        route: [...packet.metadata.route, 'semiotic-square'],
        residue: state,
      },
    };
  }

  reset(): void {
    this._s1 = { position: 's1', label: 'S1 (正题)', concept: null, salience: 0.8, value: 0.7 };
    this._s2 = { position: 's2', label: 'S2 (反题)', concept: null, salience: 0.7, value: 0.3 };
    this._notS1 = { position: 'not-s1', label: '非S1', concept: null, salience: 0.5, value: 0.3 };
    this._notS2 = { position: 'not-s2', label: '非S2', concept: null, salience: 0.55, value: 0.7 };
    this._relations = this._initializeRelations();
    this._history = [];
    this._lastUpdate = Date.now();
    this._computeMetrics();
  }
}
