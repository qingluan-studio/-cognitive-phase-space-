export interface MemoryVector {
  id: string;
  components: number[];
  magnitude: number;
  normalized: number[];
}

export interface MemoryAssociation {
  sourceId: string;
  targetId: string;
  similarity: number;
  tfidfScore: number;
  hebbianWeight: number;
}

export class WoundMemory {
  private _vectors: Map<string, MemoryVector> = new Map();
  private _associations: MemoryAssociation[] = [];
  private _state: Record<string, unknown> = {};
  private _documentFreq: Map<number, number> = new Map();
  private _hebbianMatrix: Map<string, Map<string, number>> = new Map();

  constructor() {}

  get vectorCount(): number {
    return this._vectors.size;
  }

  get associationCount(): number {
    return this._associations.length;
  }

  encode(id: string, components: number[]): MemoryVector {
    const sum = components.reduce((s, v) => s + v * v, 0);
    const magnitude = Math.sqrt(sum);
    const normalized = magnitude > 0 ? components.map((v) => v / magnitude) : [...components];
    const vector: MemoryVector = { id, components: [...components], magnitude, normalized };
    this._vectors.set(id, vector);
    for (let i = 0; i < components.length; i++) {
      if (components[i] !== 0) {
        this._documentFreq.set(i, (this._documentFreq.get(i) ?? 0) + 1);
      }
    }
    return vector;
  }

  cosineSimilarity(aId: string, bId: string): number {
    const a = this._vectors.get(aId);
    const b = this._vectors.get(bId);
    if (!a || !b) return 0;
    let dot = 0;
    const len = Math.max(a.normalized.length, b.normalized.length);
    for (let i = 0; i < len; i++) {
      dot += (a.normalized[i] ?? 0) * (b.normalized[i] ?? 0);
    }
    return dot;
  }

  tfidf(aId: string, bId: string): number {
    const a = this._vectors.get(aId);
    const b = this._vectors.get(bId);
    if (!a || !b) return 0;
    const n = this._vectors.size;
    let score = 0;
    const len = Math.max(a.components.length, b.components.length);
    for (let i = 0; i < len; i++) {
      const tf = (a.components[i] ?? 0) * (b.components[i] ?? 0);
      const df = this._documentFreq.get(i) ?? 1;
      const idf = Math.log2(n / df);
      score += tf * idf;
    }
    return score;
  }

  associate(sourceId: string, targetId: string): MemoryAssociation | null {
    const similarity = this.cosineSimilarity(sourceId, targetId);
    const tfidfScore = this.tfidf(sourceId, targetId);
    if (!this._hebbianMatrix.has(sourceId)) this._hebbianMatrix.set(sourceId, new Map());
    const weightMap = this._hebbianMatrix.get(sourceId)!;
    const oldWeight = weightMap.get(targetId) ?? 0;
    const hebbianWeight = oldWeight + 0.1 * similarity;
    weightMap.set(targetId, hebbianWeight);
    const assoc: MemoryAssociation = { sourceId, targetId, similarity, tfidfScore, hebbianWeight };
    this._associations.push(assoc);
    if (this._associations.length > 200) this._associations.shift();
    return assoc;
  }

  recall(queryId: string, threshold: number): string[] {
    const results: string[] = [];
    for (const id of this._vectors.keys()) {
      if (id === queryId) continue;
      const sim = this.cosineSimilarity(queryId, id);
      if (sim >= threshold) results.push(id);
    }
    return results.sort((a, b) => this.cosineSimilarity(queryId, b) - this.cosineSimilarity(queryId, a));
  }

  consolidate(): void {
    for (const [sourceId, map] of this._hebbianMatrix) {
      for (const [targetId, weight] of map) {
        map.set(targetId, weight * 0.95);
      }
    }
  }

  strongestAssociation(sourceId: string): MemoryAssociation | null {
    const assocs = this._associations.filter((a) => a.sourceId === sourceId);
    if (assocs.length === 0) return null;
    return assocs.reduce((best, a) => (a.hebbianWeight > best.hebbianWeight ? a : best));
  }

  memoryEntropy(): number {
    const mags = Array.from(this._vectors.values()).map((v) => v.magnitude);
    const total = mags.reduce((s, v) => s + v, 0);
    if (total === 0) return 0;
    return -mags.reduce((s, v) => {
      const p = v / total;
      return p > 0 ? s + p * Math.log2(p) : s;
    }, 0);
  }

  report(): Record<string, unknown> {
    return {
      vectors: this._vectors.size,
      associations: this._associations.length,
      entropy: this.memoryEntropy(),
      state: this._state,
    };
  }
}
