import type { DataPacket, KnowledgeUnit } from '../shared/types';

export type MemeType = 'idea' | 'behavior' | 'style' | 'phrase' | 'artifact' | 'norm';

export type SelectionPressure = 'utility' | 'fidelity' | 'longevity' | 'contagiousness' | 'prestige';

export interface Meme {
  id: string;
  name: string;
  type: MemeType;
  content: KnowledgeUnit;
  fitness: number;
  frequency: number;
  mutationRate: number;
  age: number;
  origin: string;
  traits: Record<string, number>;
}

export interface CulturalVariant {
  id: string;
  name: string;
  memes: string[];
  prevalence: number;
  integrationLevel: number;
  adaptiveness: number;
  groupId: string;
}

export interface TransmissionEvent {
  memeId: string;
  source: string;
  target: string;
  fidelity: number;
  mutation: boolean;
  timestamp: number;
  success: boolean;
}

export interface CulturalState {
  memeCount: number;
  variantCount: number;
  totalTransmissions: number;
  avgFitness: number;
  avgMutationRate: number;
  diversity: number;
  culturalComplexity: number;
  evolutionaryRate: number;
  typeDistribution: Record<MemeType, number>;
}

export interface ICulturalEvolution {
  addMeme(id: string, name: string, type: MemeType, content: KnowledgeUnit): void;
  removeMeme(id: string): void;
  transmitMeme(memeId: string, source: string, target: string): TransmissionEvent;
  mutateMeme(memeId: string): Meme;
  selectMeme(pressure: SelectionPressure): string | null;
  getMeme(id: string): Meme | undefined;
  getState(): CulturalState;
  update(deltaTime: number): void;
  processPacket(packet: DataPacket): DataPacket;
  reset(): void;
}

export class CulturalEvolution implements ICulturalEvolution {
  private _memes: Map<string, Meme> = new Map();
  private _variants: Map<string, CulturalVariant> = new Map();
  private _transmissions: TransmissionEvent[] = [];
  private _population: Map<string, Set<string>> = new Map();
  private _history: CulturalState[] = [];
  private _maxHistory: number = 100;
  private _lastUpdate: number = Date.now();
  private _baseMutationRate: number = 0.05;
  private _transmissionProbability: number = 0.3;
  private _selectionStrength: number = 0.7;
  private _driftStrength: number = 0.2;
  private _culturalDiversity: number = 0;
  private _cumulativeCulture: number = 0;
  private _generation: number = 0;
  private _maxMemes: number = 200;
  private _prestigeBias: number = 0.4;
  private _conformistBias: number = 0.3;

  constructor() {
    this._initializeSeedMemes();
  }

  get memeCount(): number { return this._memes.size; }
  get variantCount(): number { return this._variants.size; }
  get transmissionCount(): number { return this._transmissions.length; }
  get baseMutationRate(): number { return this._baseMutationRate; }
  set baseMutationRate(value: number) { this._baseMutationRate = Math.max(0, Math.min(0.5, value)); }
  get selectionStrength(): number { return this._selectionStrength; }
  set selectionStrength(value: number) { this._selectionStrength = Math.max(0, Math.min(1, value)); }
  get culturalDiversity(): number { return this._culturalDiversity; }
  get cumulativeCulture(): number { return this._cumulativeCulture; }
  get generation(): number { return this._generation; }

  private _initializeSeedMemes(): void {
    const seedMemes: Array<{ id: string; name: string; type: MemeType }> = [
      { id: 'meme-001', name: '语言基础', type: 'phrase' },
      { id: 'meme-002', name: '工具使用', type: 'behavior' },
      { id: 'meme-003', name: '火的控制', type: 'artifact' },
      { id: 'meme-004', name: '艺术表达', type: 'idea' },
      { id: 'meme-005', name: '社会规范', type: 'norm' },
      { id: 'meme-006', name: '装饰风格', type: 'style' },
      { id: 'meme-007', name: '狩猎技术', type: 'behavior' },
      { id: 'meme-008', name: '故事传统', type: 'idea' },
    ];

    for (const m of seedMemes) {
      this.addMeme(m.id, m.name, m.type, {
        id: m.id,
        content: m.name,
        vector: Array.from({ length: 8 }, () => Math.random()),
        lineage: ['seed'],
      });
    }

    this._population.set('group-a', new Set(['meme-001', 'meme-002', 'meme-003']));
    this._population.set('group-b', new Set(['meme-001', 'meme-004', 'meme-005']));

    const meme1 = this._memes.get('meme-001');
    if (meme1) {
      meme1.fitness = 0.9;
      meme1.frequency = 0.8;
    }
    const meme2 = this._memes.get('meme-002');
    if (meme2) {
      meme2.fitness = 0.8;
      meme2.frequency = 0.6;
    }
  }

  addMeme(id: string, name: string, type: MemeType, content: KnowledgeUnit): void {
    if (this._memes.has(id)) return;

    const meme: Meme = {
      id,
      name,
      type,
      content: { ...content },
      fitness: 0.5 + Math.random() * 0.3,
      frequency: 0.1,
      mutationRate: this._baseMutationRate * (0.8 + Math.random() * 0.4),
      age: 0,
      origin: 'spontaneous',
      traits: {
        utility: 0.3 + Math.random() * 0.4,
        memorability: 0.3 + Math.random() * 0.4,
        transmissibility: 0.3 + Math.random() * 0.4,
        adaptability: 0.3 + Math.random() * 0.4,
      },
    };

    this._memes.set(id, meme);

    if (this._memes.size > this._maxMemes) {
      this._pruneLowFitness();
    }
  }

  private _pruneLowFitness(): void {
    const sorted = Array.from(this._memes.values()).sort((a, b) => a.fitness - b.fitness);
    const toRemove = sorted.slice(0, Math.floor(sorted.length * 0.1));
    for (const meme of toRemove) {
      this.removeMeme(meme.id);
    }
  }

  removeMeme(id: string): void {
    this._memes.delete(id);
    for (const group of this._population.values()) {
      group.delete(id);
    }
  }

  transmitMeme(memeId: string, source: string, target: string): TransmissionEvent {
    const meme = this._memes.get(memeId);
    const success = meme && Math.random() < this._transmissionProbability * meme.fitness;

    const event: TransmissionEvent = {
      memeId,
      source,
      target,
      fidelity: success ? 0.8 + Math.random() * 0.2 : 0,
      mutation: false,
      timestamp: Date.now(),
      success: !!success,
    };

    if (success && meme) {
      if (Math.random() < meme.mutationRate) {
        event.mutation = true;
        this._mutateMemeInternal(memeId);
      }

      let targetGroup = this._population.get(target);
      if (!targetGroup) {
        targetGroup = new Set();
        this._population.set(target, targetGroup);
      }
      targetGroup.add(memeId);

      meme.frequency = Math.min(1, meme.frequency + 0.05);
    }

    this._transmissions.push(event);
    if (this._transmissions.length > 500) {
      this._transmissions.shift();
    }

    return event;
  }

  mutateMeme(memeId: string): Meme {
    return this._mutateMemeInternal(memeId);
  }

  private _mutateMemeInternal(memeId: string): Meme {
    const meme = this._memes.get(memeId);
    if (!meme) {
      throw new Error(`Meme ${memeId} not found`);
    }

    const newVector = meme.content.vector.map(v => {
      const mutation = (Math.random() - 0.5) * 0.2;
      return Math.max(0, Math.min(1, v + mutation));
    });

    const magnitude = Math.sqrt(newVector.reduce((s, v) => s + v * v, 0));
    const normalized = magnitude > 0 ? newVector.map(v => v / magnitude) : newVector;

    const traitKeys = Object.keys(meme.traits) as (keyof typeof meme.traits)[];
    for (const key of traitKeys) {
      const delta = (Math.random() - 0.5) * 0.1;
      meme.traits[key] = Math.max(0, Math.min(1, meme.traits[key] + delta));
    }

    meme.content = {
      ...meme.content,
      id: `${memeId}-mut-${Date.now()}`,
      vector: normalized,
      lineage: [...meme.content.lineage, 'mutated'],
    };

    meme.fitness = this._computeMemeFitness(meme);
    meme.age = 0;

    return { ...meme, content: { ...meme.content }, traits: { ...meme.traits } };
  }

  private _computeMemeFitness(meme: Meme): number {
    const traits = meme.traits;
    return (
      traits.utility * 0.25 +
      traits.memorability * 0.25 +
      traits.transmissibility * 0.3 +
      traits.adaptability * 0.2
    );
  }

  selectMeme(pressure: SelectionPressure): string | null {
    const memes = Array.from(this._memes.values());
    if (memes.length === 0) return null;

    let scores: number[];

    switch (pressure) {
      case 'utility':
        scores = memes.map(m => m.traits.utility);
        break;
      case 'fidelity':
        scores = memes.map(m => 1 - m.mutationRate);
        break;
      case 'longevity':
        scores = memes.map(m => m.age);
        break;
      case 'contagiousness':
        scores = memes.map(m => m.frequency * m.traits.transmissibility);
        break;
      case 'prestige':
        scores = memes.map(m => m.fitness * m.frequency);
        break;
      default:
        scores = memes.map(m => m.fitness);
    }

    const totalScore = scores.reduce((s, sc) => s + Math.pow(sc, 1 / this._selectionStrength), 0);
    let rand = Math.random() * totalScore;

    for (let i = 0; i < memes.length; i++) {
      rand -= Math.pow(scores[i], 1 / this._selectionStrength);
      if (rand <= 0) {
        return memes[i].id;
      }
    }

    return memes[memes.length - 1].id;
  }

  getMeme(id: string): Meme | undefined {
    const meme = this._memes.get(id);
    return meme
      ? { ...meme, content: { ...meme.content }, traits: { ...meme.traits } }
      : undefined;
  }

  getState(): CulturalState {
    const typeDistribution: Record<MemeType, number> = {
      idea: 0,
      behavior: 0,
      style: 0,
      phrase: 0,
      artifact: 0,
      norm: 0,
    };

    let totalFitness = 0;
    let totalMutation = 0;

    for (const meme of this._memes.values()) {
      typeDistribution[meme.type]++;
      totalFitness += meme.fitness;
      totalMutation += meme.mutationRate;
    }

    const count = Math.max(1, this._memes.size);

    this._updateDiversity();

    return {
      memeCount: this._memes.size,
      variantCount: this._variants.size,
      totalTransmissions: this._transmissions.length,
      avgFitness: totalFitness / count,
      avgMutationRate: totalMutation / count,
      diversity: this._culturalDiversity,
      culturalComplexity: this._cumulativeCulture,
      evolutionaryRate: this._computeEvolutionaryRate(),
      typeDistribution,
    };
  }

  private _updateDiversity(): void {
    const frequencies = Array.from(this._memes.values()).map(m => m.frequency);
    const total = frequencies.reduce((s, f) => s + f, 0);

    if (total === 0) {
      this._culturalDiversity = 0;
      return;
    }

    let shannon = 0;
    for (const f of frequencies) {
      const p = f / total;
      if (p > 0) {
        shannon -= p * Math.log(p);
      }
    }

    const maxShannon = Math.log(this._memes.size || 1);
    this._culturalDiversity = maxShannon > 0 ? shannon / maxShannon : 0;
  }

  private _computeEvolutionaryRate(): number {
    if (this._transmissions.length < 10) return 0;

    const recent = this._transmissions.slice(-50);
    const mutationCount = recent.filter(t => t.mutation).length;
    const successRate = recent.filter(t => t.success).length / recent.length;

    return mutationCount / Math.max(1, recent.length) * successRate;
  }

  update(deltaTime: number): void {
    const dt = deltaTime / 1000;
    this._generation += dt * 0.01;

    this._updateMemeAges(dt);
    this._updateFrequencies(dt);
    this._simulateTransmissions(dt);
    this._applySelection(dt);
    this._applyDrift(dt);
    this._updateCumulativeCulture();

    this._lastUpdate = Date.now();
    this._recordState();
  }

  private _updateMemeAges(dt: number): void {
    for (const meme of this._memes.values()) {
      meme.age += dt;
    }
  }

  private _updateFrequencies(dt: number): void {
    for (const meme of this._memes.values()) {
      const targetFreq = meme.fitness;
      meme.frequency += (targetFreq - meme.frequency) * 0.01 * dt;
      meme.frequency = Math.max(0.001, Math.min(1, meme.frequency));
    }
  }

  private _simulateTransmissions(dt: number): void {
    const groups = Array.from(this._population.keys());
    if (groups.length < 2) return;

    const rate = this._transmissionProbability * dt * 0.1;

    for (let i = 0; i < 3; i++) {
      if (Math.random() < rate) {
        const sourceGroup = groups[Math.floor(Math.random() * groups.length)];
        const targetGroup = groups[Math.floor(Math.random() * groups.length)];
        if (sourceGroup === targetGroup) continue;

        const sourceMemes = Array.from(this._population.get(sourceGroup) || []);
        if (sourceMemes.length === 0) continue;

        const memeId = sourceMemes[Math.floor(Math.random() * sourceMemes.length)];
        this.transmitMeme(memeId, sourceGroup, targetGroup);
      }
    }
  }

  private _applySelection(dt: number): void {
    if (Math.random() < this._selectionStrength * dt * 0.05) {
      const selected = this.selectMeme('utility');
      if (selected) {
        const meme = this._memes.get(selected);
        if (meme) {
          meme.fitness = Math.min(1, meme.fitness + 0.01);
        }
      }
    }
  }

  private _applyDrift(dt: number): void {
    for (const meme of this._memes.values()) {
      const drift = (Math.random() - 0.5) * this._driftStrength * dt * 0.1;
      meme.frequency = Math.max(0.001, Math.min(1, meme.frequency + drift));
    }
  }

  private _updateCumulativeCulture(): void {
    let complexity = 0;
    for (const meme of this._memes.values()) {
      complexity += meme.fitness * meme.content.lineage.length * 0.1;
    }
    this._cumulativeCulture = complexity;
  }

  private _recordState(): void {
    this._history.push(this.getState());
    if (this._history.length > this._maxHistory) {
      this._history.shift();
    }
  }

  getAllMemes(): Meme[] {
    return Array.from(this._memes.values())
      .map(m => ({ ...m, content: { ...m.content }, traits: { ...m.traits } }))
      .sort((a, b) => b.fitness - a.fitness);
  }

  getTopMemes(k: number = 10): Meme[] {
    return this.getAllMemes().slice(0, k);
  }

  getTransmissions(limit: number = 20): TransmissionEvent[] {
    return this._transmissions.slice(-limit).map(t => ({ ...t }));
  }

  getHistory(): CulturalState[] {
    return this._history.map(s => ({
      ...s,
      typeDistribution: { ...s.typeDistribution },
    }));
  }

  simulateEvolution(steps: number, deltaTime: number = 100): CulturalState[] {
    const results: CulturalState[] = [];
    for (let i = 0; i < steps; i++) {
      if (Math.random() < 0.1) {
        const newMemeId = `meme-${Date.now()}-${i}`;
        this.addMeme(newMemeId, `New Meme ${i}`, 'idea', {
          id: newMemeId,
          content: `New cultural variant ${i}`,
          vector: Array.from({ length: 8 }, () => Math.random()),
          lineage: ['spontaneous'],
        });
      }

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
        culturalEvolution: {
          memeCount: state.memeCount,
          diversity: state.diversity,
          complexity: state.culturalComplexity,
          avgFitness: state.avgFitness,
          evolutionaryRate: state.evolutionaryRate,
          generation: this._generation,
        },
      },
      metadata: {
        ...packet.metadata,
        route: [...packet.metadata.route, 'cultural-evolution'],
        residue: state,
      },
    };
  }

  reset(): void {
    this._memes.clear();
    this._variants.clear();
    this._transmissions = [];
    this._population.clear();
    this._history = [];
    this._culturalDiversity = 0;
    this._cumulativeCulture = 0;
    this._generation = 0;
    this._lastUpdate = Date.now();
    this._initializeSeedMemes();
  }
}
