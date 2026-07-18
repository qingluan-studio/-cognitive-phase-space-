import type { DataPacket, KnowledgeUnit } from '../shared/types';

export type SignRelation = 'arbitrary' | 'iconic' | 'indexical';

export interface Signifier {
  id: string;
  form: string;
  medium: string;
  salience: number;
  vector: number[];
}

export interface Signified {
  id: string;
  concept: string;
  category: string;
  meaning: number;
  vector: number[];
}

export interface Interpretant {
  id: string;
  interpretation: string;
  context: string;
  depth: number;
  confidence: number;
  vector: number[];
}

export interface TriadRecord {
  id: string;
  signifier: Signifier;
  signified: Signified;
  interpretant: Interpretant;
  relation: SignRelation;
  stability: number;
  createdAt: number;
  usageCount: number;
}

export interface TriadSnapshot {
  totalTriads: number;
  relationDistribution: Record<SignRelation, number>;
  avgStability: number;
  avgDepth: number;
  activeTriads: string[];
}

export interface ISignTriad {
  createSignifier(id: string, form: string, medium: string): Signifier;
  createSignified(id: string, concept: string, category: string): Signified;
  createInterpretant(id: string, interpretation: string, context: string): Interpretant;
  createTriad(signifierId: string, signifiedId: string, interpretantId: string, relation: SignRelation): TriadRecord;
  interpret(signifierId: string, context: string): Interpretant | null;
  getTriad(triadId: string): TriadRecord | null;
  getSnapshot(): TriadSnapshot;
  processPacket(packet: DataPacket): DataPacket;
  reset(): void;
}

export class SignTriad implements ISignTriad {
  private _signifiers: Map<string, Signifier> = new Map();
  private _signifieds: Map<string, Signified> = new Map();
  private _interpretants: Map<string, Interpretant> = new Map();
  private _triads: Map<string, TriadRecord> = new Map();
  private _signifierIndex: Map<string, string[]> = new Map();
  private _signifiedIndex: Map<string, string[]> = new Map();
  private _interpretationHistory: Array<{ timestamp: number; triadId: string; context: string }> = [];
  private _maxTriads: number = 500;
  private _learningRate: number = 0.05;
  private _decayRate: number = 0.001;
  private _lastUpdate: number = Date.now();
  private _contextMemory: Map<string, KnowledgeUnit[]> = new Map();
  private _abstractionHierarchy: Map<string, string[]> = new Map();

  constructor() {
    this._initializeFoundationTriads();
  }

  get triadCount(): number { return this._triads.size; }
  get signifierCount(): number { return this._signifiers.size; }
  get signifiedCount(): number { return this._signifieds.size; }
  get interpretantCount(): number { return this._interpretants.size; }
  get learningRate(): number { return this._learningRate; }
  set learningRate(value: number) { this._learningRate = Math.max(0, Math.min(1, value)); }
  get decayRate(): number { return this._decayRate; }
  set decayRate(value: number) { this._decayRate = Math.max(0, Math.min(0.01, value)); }

  private _initializeFoundationTriads(): void {
    const sig = this.createSignifier('word-tree', 'tree', 'text');
    const sigd = this.createSignified('concept-tree', '植物/树', 'natural');
    const interp = this.createInterpretant('interp-tree', '木本植物的统称', 'botany');
    this.createTriad('word-tree', 'concept-tree', 'interp-tree', 'arbitrary');
  }

  createSignifier(id: string, form: string, medium: string): Signifier {
    if (this._signifiers.has(id)) return this._signifiers.get(id)!;
    const signifier: Signifier = {
      id,
      form,
      medium,
      salience: 0.5,
      vector: this._generateVector(form, 8),
    };
    this._signifiers.set(id, signifier);
    return signifier;
  }

  createSignified(id: string, concept: string, category: string): Signified {
    if (this._signifieds.has(id)) return this._signifieds.get(id)!;
    const signified: Signified = {
      id,
      concept,
      category,
      meaning: 0.6,
      vector: this._generateVector(concept, 8),
    };
    this._signifieds.set(id, signified);
    return signified;
  }

  createInterpretant(id: string, interpretation: string, context: string): Interpretant {
    if (this._interpretants.has(id)) return this._interpretants.get(id)!;
    const interpretant: Interpretant = {
      id,
      interpretation,
      context,
      depth: 1,
      confidence: 0.5,
      vector: this._generateVector(interpretation, 8),
    };
    this._interpretants.set(id, interpretant);
    return interpretant;
  }

  private _generateVector(seed: string, dimensions: number): number[] {
    const vector: number[] = [];
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash |= 0;
    }
    for (let i = 0; i < dimensions; i++) {
      hash = ((hash << 5) - hash) + i * 7919;
      hash |= 0;
      vector.push(0.5 + (hash % 1000) / 1000 * 0.5);
    }
    const magnitude = Math.sqrt(vector.reduce((s, v) => s + v * v, 0));
    return magnitude > 0 ? vector.map(v => v / magnitude) : vector;
  }

  createTriad(signifierId: string, signifiedId: string, interpretantId: string, relation: SignRelation): TriadRecord {
    const signifier = this._signifiers.get(signifierId);
    const signified = this._signifieds.get(signifiedId);
    const interpretant = this._interpretants.get(interpretantId);

    if (!signifier || !signified || !interpretant) {
      throw new Error('All three components must exist to create a triad');
    }

    const triadId = `${signifierId}:${signifiedId}:${interpretantId}`;

    if (this._triads.has(triadId)) {
      const existing = this._triads.get(triadId)!;
      existing.usageCount++;
      existing.stability = Math.min(1, existing.stability + this._learningRate * 0.1);
      return existing;
    }

    const stability = this._computeInitialStability(signifier, signified, interpretant, relation);

    const triad: TriadRecord = {
      id: triadId,
      signifier,
      signified,
      interpretant,
      relation,
      stability,
      createdAt: Date.now(),
      usageCount: 1,
    };

    this._triads.set(triadId, triad);

    const sigTriads = this._signifierIndex.get(signifierId) || [];
    sigTriads.push(triadId);
    this._signifierIndex.set(signifierId, sigTriads);

    const sigdTriads = this._signifiedIndex.get(signifiedId) || [];
    sigdTriads.push(triadId);
    this._signifiedIndex.set(signifiedId, sigdTriads);

    if (this._triads.size > this._maxTriads) {
      this._pruneWeakestTriads();
    }

    return triad;
  }

  private _computeInitialStability(
    signifier: Signifier,
    signified: Signified,
    interpretant: Interpretant,
    relation: SignRelation
  ): number {
    const simSigSigd = this._cosineSimilarity(signifier.vector, signified.vector);
    const simSigInterp = this._cosineSimilarity(signifier.vector, interpretant.vector);
    const simSigdInterp = this._cosineSimilarity(signified.vector, interpretant.vector);

    const avgSimilarity = (simSigSigd + simSigInterp + simSigdInterp) / 3;
    const relationBonus = relation === 'iconic' ? 0.2 : relation === 'indexical' ? 0.1 : 0;

    return Math.min(1, Math.max(0.1, 0.3 + avgSimilarity * 0.5 + relationBonus));
  }

  private _cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom > 0 ? dot / denom : 0;
  }

  private _pruneWeakestTriads(): void {
    const sorted = Array.from(this._triads.values()).sort((a, b) => a.stability - b.stability);
    const toRemove = sorted.slice(0, Math.floor(sorted.length * 0.1));
    for (const triad of toRemove) {
      this._triads.delete(triad.id);
      this._removeFromIndex(this._signifierIndex, triad.signifier.id, triad.id);
      this._removeFromIndex(this._signifiedIndex, triad.signified.id, triad.id);
    }
  }

  private _removeFromIndex(index: Map<string, string[]>, key: string, value: string): void {
    const list = index.get(key);
    if (list) {
      const idx = list.indexOf(value);
      if (idx >= 0) list.splice(idx, 1);
    }
  }

  interpret(signifierId: string, context: string): Interpretant | null {
    const triadIds = this._signifierIndex.get(signifierId);
    if (!triadIds || triadIds.length === 0) return null;

    let bestTriad: TriadRecord | null = null;
    let bestScore = -Infinity;

    for (const triadId of triadIds) {
      const triad = this._triads.get(triadId);
      if (!triad) continue;

      const contextMatch = triad.interpretant.context === context ? 1 : 0.3;
      const score = triad.stability * triad.interpretant.confidence * contextMatch;

      if (score > bestScore) {
        bestScore = score;
        bestTriad = triad;
      }
    }

    if (!bestTriad) return null;

    bestTriad.usageCount++;
    bestTriad.stability = Math.min(1, bestTriad.stability + this._learningRate * 0.05);

    this._interpretationHistory.push({
      timestamp: Date.now(),
      triadId: bestTriad.id,
      context,
    });
    if (this._interpretationHistory.length > 200) this._interpretationHistory.shift();

    return { ...bestTriad.interpretant };
  }

  getTriad(triadId: string): TriadRecord | null {
    const triad = this._triads.get(triadId);
    return triad ? { ...triad, signifier: { ...triad.signifier }, signified: { ...triad.signified }, interpretant: { ...triad.interpretant } } : null;
  }

  getTriadsBySignifier(signifierId: string): TriadRecord[] {
    const ids = this._signifierIndex.get(signifierId) || [];
    return ids.map(id => this._triads.get(id)).filter((t): t is TriadRecord => t !== undefined);
  }

  getTriadsBySignified(signifiedId: string): TriadRecord[] {
    const ids = this._signifiedIndex.get(signifiedId) || [];
    return ids.map(id => this._triads.get(id)).filter((t): t is TriadRecord => t !== undefined);
  }

  getSnapshot(): TriadSnapshot {
    const relationDistribution: Record<SignRelation, number> = {
      arbitrary: 0,
      iconic: 0,
      indexical: 0,
    };

    let totalStability = 0;
    let totalDepth = 0;
    const activeTriads: string[] = [];

    for (const triad of this._triads.values()) {
      relationDistribution[triad.relation]++;
      totalStability += triad.stability;
      totalDepth += triad.interpretant.depth;
      if (triad.stability > 0.7) activeTriads.push(triad.id);
    }

    const count = Math.max(1, this._triads.size);

    return {
      totalTriads: this._triads.size,
      relationDistribution,
      avgStability: totalStability / count,
      avgDepth: totalDepth / count,
      activeTriads: activeTriads.slice(0, 10),
    };
  }

  updateDecay(deltaTime: number): void {
    const dt = deltaTime / 1000;
    for (const triad of this._triads.values()) {
      triad.stability *= (1 - this._decayRate * dt);
      triad.stability = Math.max(0.05, triad.stability);
    }
    this._lastUpdate = Date.now();
  }

  findAnalogy(sourceSignifierId: string, targetSignifierId: string): number {
    const sourceTriads = this.getTriadsBySignifier(sourceSignifierId);
    const targetTriads = this.getTriadsBySignifier(targetSignifierId);

    if (sourceTriads.length === 0 || targetTriads.length === 0) return 0;

    let maxSimilarity = 0;
    for (const s of sourceTriads) {
      for (const t of targetTriads) {
        const sim = this._cosineSimilarity(s.signified.vector, t.signified.vector);
        maxSimilarity = Math.max(maxSimilarity, sim);
      }
    }
    return maxSimilarity;
  }

  processPacket(packet: DataPacket): DataPacket {
    const snapshot = this.getSnapshot();
    return {
      ...packet,
      payload: {
        ...packet.payload as object,
        semiosis: snapshot,
      },
      metadata: {
        ...packet.metadata,
        route: [...packet.metadata.route, 'sign-triad'],
        residue: snapshot,
      },
    };
  }

  reset(): void {
    this._signifiers.clear();
    this._signifieds.clear();
    this._interpretants.clear();
    this._triads.clear();
    this._signifierIndex.clear();
    this._signifiedIndex.clear();
    this._interpretationHistory = [];
    this._contextMemory.clear();
    this._abstractionHierarchy.clear();
    this._lastUpdate = Date.now();
    this._initializeFoundationTriads();
  }
}
