export interface WordVector {
  word: string;
  vector: number[];
  frequency: number;
}

export interface SemanticRelation {
  source: string;
  target: string;
  relation: string;
  strength: number;
}

export class SemanticField {
  private _vectors: Map<string, WordVector>;
  private _relations: SemanticRelation[];
  private _dimensions: number;
  private _history: { word: string; neighbors: string[] }[];

  constructor(dimensions: number = 100) {
    this._vectors = new Map();
    this._relations = [];
    this._dimensions = dimensions;
    this._history = [];
  }

  get dimensions(): number { return this._dimensions; }
  get vocabularySize(): number { return this._vectors.size; }
  get relationCount(): number { return this._relations.length; }
  get history(): { word: string; neighbors: string[] }[] { return this._history; }

  public addWord(word: string, vector?: number[], frequency: number = 1): void {
    if (!vector) {
      vector = Array.from({ length: this._dimensions }, () => (Math.random() * 2 - 1));
    }
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    const normalized = norm > 0 ? vector.map(v => v / norm) : vector;
    this._vectors.set(word, { word, vector: normalized, frequency });
  }

  public addRelation(source: string, target: string, relation: string, strength: number = 1.0): void {
    this._relations.push({ source, target, relation, strength });
  }

  public computeSimilarity(wordA: string, wordB: string): number {
    const a = this._vectors.get(wordA);
    const b = this._vectors.get(wordB);
    if (!a || !b) return 0;
    let dot = 0;
    for (let i = 0; i < this._dimensions; i++) {
      dot += a.vector[i] * b.vector[i];
    }
    return dot;
  }

  public findNearestNeighbors(word: string, k: number = 5): { word: string; similarity: number }[] {
    const target = this._vectors.get(word);
    if (!target) return [];
    const similarities: { word: string; similarity: number }[] = [];
    for (const [w, vec] of this._vectors) {
      if (w !== word) {
        let dot = 0;
        for (let i = 0; i < this._dimensions; i++) {
          dot += target.vector[i] * vec.vector[i];
        }
        similarities.push({ word: w, similarity: dot });
      }
    }
    similarities.sort((a, b) => b.similarity - a.similarity);
    const result = similarities.slice(0, k);
    this._history.push({ word, neighbors: result.map(r => r.word) });
    return result;
  }

  public computeAnalogy(a: string, b: string, c: string): string | null {
    const vecA = this._vectors.get(a)?.vector;
    const vecB = this._vectors.get(b)?.vector;
    const vecC = this._vectors.get(c)?.vector;
    if (!vecA || !vecB || !vecC) return null;
    const target = new Array(this._dimensions).fill(0);
    for (let i = 0; i < this._dimensions; i++) {
      target[i] = vecB[i] - vecA[i] + vecC[i];
    }
    const norm = Math.sqrt(target.reduce((sum, v) => sum + v * v, 0));
    for (let i = 0; i < this._dimensions; i++) target[i] /= norm;
    let bestWord: string | null = null;
    let bestSim = -Infinity;
    for (const [w, vec] of this._vectors) {
      if (w === a || w === b || w === c) continue;
      let dot = 0;
      for (let i = 0; i < this._dimensions; i++) {
        dot += target[i] * vec.vector[i];
      }
      if (dot > bestSim) {
        bestSim = dot;
        bestWord = w;
      }
    }
    return bestWord;
  }

  public computeFieldCentroid(words: string[]): number[] {
    const centroid = new Array(this._dimensions).fill(0);
    let count = 0;
    for (const w of words) {
      const vec = this._vectors.get(w);
      if (vec) {
        for (let i = 0; i < this._dimensions; i++) {
          centroid[i] += vec.vector[i];
        }
        count++;
      }
    }
    if (count > 0) {
      for (let i = 0; i < this._dimensions; i++) {
        centroid[i] /= count;
      }
    }
    return centroid;
  }

  public computeSemanticDensity(words: string[]): number {
    const centroid = this.computeFieldCentroid(words);
    let totalDist = 0;
    for (const w of words) {
      const vec = this._vectors.get(w);
      if (vec) {
        let dist = 0;
        for (let i = 0; i < this._dimensions; i++) {
          dist += (vec.vector[i] - centroid[i]) ** 2;
        }
        totalDist += Math.sqrt(dist);
      }
    }
    return words.length > 0 ? totalDist / words.length : 0;
  }

  public clusterWords(k: number = 5): Map<number, string[]> {
    const words = Array.from(this._vectors.keys());
    const centroids: number[][] = [];
    for (let i = 0; i < k; i++) {
      const randomWord = words[Math.floor(Math.random() * words.length)];
      centroids.push([...this._vectors.get(randomWord)!.vector]);
    }
    const assignments = new Map<string, number>();
    for (let iter = 0; iter < 20; iter++) {
      for (const w of words) {
        const vec = this._vectors.get(w)!.vector;
        let bestCluster = 0;
        let minDist = Infinity;
        for (let c = 0; c < k; c++) {
          let dist = 0;
          for (let i = 0; i < this._dimensions; i++) {
            dist += (vec[i] - centroids[c][i]) ** 2;
          }
          if (dist < minDist) {
            minDist = dist;
            bestCluster = c;
          }
        }
        assignments.set(w, bestCluster);
      }
      for (let c = 0; c < k; c++) {
        const clusterWords = words.filter(w => assignments.get(w) === c);
        if (clusterWords.length > 0) {
          centroids[c] = this.computeFieldCentroid(clusterWords);
        }
      }
    }
    const clusters = new Map<number, string[]>();
    for (const [w, c] of assignments) {
      if (!clusters.has(c)) clusters.set(c, []);
      clusters.get(c)!.push(w);
    }
    return clusters;
  }

  public computePolysemy(word: string): number {
    const neighbors = this.findNearestNeighbors(word, 20);
    const similarities = neighbors.map(n => n.similarity);
    const mean = similarities.reduce((a, b) => a + b, 0) / similarities.length;
    const variance = similarities.reduce((sum, s) => sum + (s - mean) ** 2, 0) / similarities.length;
    return variance;
  }

  public propagateRelations(steps: number = 3): void {
    for (let s = 0; s < steps; s++) {
      const newRelations: SemanticRelation[] = [];
      for (const r1 of this._relations) {
        for (const r2 of this._relations) {
          if (r1.target === r2.source && r1.relation === r2.relation) {
            newRelations.push({
              source: r1.source,
              target: r2.target,
              relation: r1.relation,
              strength: r1.strength * r2.strength * 0.5
            });
          }
        }
      }
      this._relations.push(...newRelations);
    }
  }

  public reset(): void {
    this._vectors.clear();
    this._relations = [];
    this._history = [];
  }

  public exportVectors(): WordVector[] {
    return Array.from(this._vectors.values()).map(v => ({ ...v, vector: [...v.vector] }));
  }
}
