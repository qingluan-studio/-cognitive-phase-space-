import { DataPacket } from '../shared/types';

export interface EmbeddingResult {
  vector: number[];
  dimension: number;
  token: string;
}

export interface EmbeddingModel {
  name: string;
  vocab: string[];
  dims: number;
}

export interface EmbeddingStat {
  count: number;
  dimension: number;
  meanNorm: number;
  minNorm: number;
  maxNorm: number;
  vocabularySize: number;
}

export interface SimilarityResult {
  token: string;
  similarity: number;
  rank: number;
}

export class Embedding {
  private _vectors: Map<string, number[]> = new Map();
  private _dimension: number = 128;
  private _counter: number = 0;
  private _modelName: string = 'default';
  private _vocabulary: string[] = [];
  private _lastEmbedding: EmbeddingResult | null = null;
  private _normalization: string = 'l2';
  private _oovStrategy: string = 'random';
  private _similarityMetric: string = 'cosine';
  private _maxVocabSize: number = 100000;
  private _minFreq: number = 1;

  constructor(dimension: number = 128) {
    this._dimension = dimension;
  }

  get vectors(): Map<string, number[]> {
    return this._vectors;
  }

  get dimension(): number {
    return this._dimension;
  }

  get modelName(): string {
    return this._modelName;
  }

  get vocabulary(): string[] {
    return this._vocabulary;
  }

  get normalization(): string {
    return this._normalization;
  }

  get oovStrategy(): string {
    return this._oovStrategy;
  }

  get similarityMetric(): string {
    return this._similarityMetric;
  }

  setNormalization(strategy: string): void {
    if (['l2', 'l1', 'none'].includes(strategy)) {
      this._normalization = strategy;
    }
  }

  setOovStrategy(strategy: string): void {
    if (['random', 'zero', 'average', 'unk'].includes(strategy)) {
      this._oovStrategy = strategy;
    }
  }

  setSimilarityMetric(metric: string): void {
    if (['cosine', 'euclidean', 'manhattan', 'dot', 'jaccard'].includes(metric)) {
      this._similarityMetric = metric;
    }
  }

  addVector(token: string, vector: number[]): void {
    const normalized = this._normalizeVector(vector);
    this._vectors.set(token.toLowerCase(), normalized);
    if (!this._vocabulary.includes(token.toLowerCase())) {
      this._vocabulary.push(token.toLowerCase());
    }
  }

  getVector(token: string): number[] | undefined {
    return this._vectors.get(token.toLowerCase());
  }

  removeVector(token: string): boolean {
    return this._vectors.delete(token.toLowerCase());
  }

  hasVector(token: string): boolean {
    return this._vectors.has(token.toLowerCase());
  }

  oneHot(token: string, vocab: string[]): number[] {
    const index = vocab.indexOf(token);
    const vector = new Array(vocab.length).fill(0);
    if (index >= 0) {
      vector[index] = 1;
    }
    this._vectors.set(token, vector);
    this._dimension = vocab.length;
    this._lastEmbedding = { vector, dimension: vocab.length, token };
    return vector;
  }

  bagOfWords(tokens: string[], vocab: string[]): number[] {
    const vector = new Array(vocab.length).fill(0);
    const vocabMap = new Map(vocab.map((w, i) => [w, i]));
    for (const token of tokens) {
      const idx = vocabMap.get(token.toLowerCase());
      if (idx !== undefined) {
        vector[idx]++;
      }
    }
    this._dimension = vocab.length;
    this._lastEmbedding = { vector, dimension: vocab.length, token: tokens.join(' ') };
    return vector;
  }

  tfIdf(documents: string[][], vocab: string[]): number[][] {
    const docCount = documents.length;
    const vocabMap = new Map(vocab.map((w, i) => [w, i]));
    const df = new Array(vocab.length).fill(0);

    for (const doc of documents) {
      const seen = new Set<string>();
      for (const token of doc) {
        const lower = token.toLowerCase();
        if (vocabMap.has(lower) && !seen.has(lower)) {
          const idx = vocabMap.get(lower)!;
          df[idx]++;
          seen.add(lower);
        }
      }
    }

    const result: number[][] = [];
    for (const doc of documents) {
      const tf = new Array(vocab.length).fill(0);
      for (const token of doc) {
        const lower = token.toLowerCase();
        const idx = vocabMap.get(lower);
        if (idx !== undefined) {
          tf[idx]++;
        }
      }
      const total = tf.reduce((a, b) => a + b, 0) || 1;
      const tfidf = tf.map((t, i) => (t / total) * Math.log((docCount + 1) / (df[i] + 1)));
      result.push(tfidf);
    }

    this._dimension = vocab.length;
    return result;
  }

  tfIdfWeighted(tokens: string[], idf: Map<string, number>, vocab: string[]): number[] {
    const vector = new Array(vocab.length).fill(0);
    const vocabMap = new Map(vocab.map((w, i) => [w, i]));
    const tf = new Map<string, number>();
    for (const t of tokens) {
      const lower = t.toLowerCase();
      tf.set(lower, (tf.get(lower) || 0) + 1);
    }
    const total = tokens.length || 1;
    for (const [word, count] of tf) {
      const idx = vocabMap.get(word);
      if (idx !== undefined) {
        const idfVal = idf.get(word) ?? 1;
        vector[idx] = (count / total) * idfVal;
      }
    }
    return vector;
  }

  word2vec(token: string, model: EmbeddingModel): number[] {
    const index = model.vocab.indexOf(token.toLowerCase());
    let vector: number[];
    if (index >= 0) {
      const seed = index * 9973;
      vector = this._generateRandomVector(model.dims, seed);
    } else {
      vector = this._handleOOV(token, model.dims);
    }
    const normalized = this._normalizeVector(vector);
    this._vectors.set(token, normalized);
    this._dimension = model.dims;
    this._modelName = model.name;
    this._lastEmbedding = { vector: normalized, dimension: model.dims, token };
    return normalized;
  }

  glove(token: string, model: EmbeddingModel): number[] {
    const index = model.vocab.indexOf(token.toLowerCase());
    let vector: number[];
    if (index >= 0) {
      const seed = index * 7919;
      vector = this._generateRandomVector(model.dims, seed);
    } else {
      vector = this._handleOOV(token, model.dims);
    }
    const normalized = this._normalizeVector(vector);
    this._vectors.set(token, normalized);
    this._dimension = model.dims;
    this._modelName = model.name;
    this._lastEmbedding = { vector: normalized, dimension: model.dims, token };
    return normalized;
  }

  fasttext(token: string, model: EmbeddingModel): number[] {
    let vector = new Array(model.dims).fill(0);
    const subwords = this._getSubwords(token, 3, 6);
    let found = 0;
    for (const sub of subwords) {
      const index = model.vocab.indexOf(sub);
      if (index >= 0) {
        const seed = index * 3137;
        const subVec = this._generateRandomVector(model.dims, seed);
        vector = vector.map((v, i) => v + subVec[i]);
        found++;
      }
    }
    if (found === 0) {
      vector = this._handleOOV(token, model.dims);
    }
    const norm = Math.sqrt(vector.reduce((a, b) => a + b * b, 0)) || 1;
    vector = vector.map(v => v / norm);
    this._vectors.set(token, vector);
    this._dimension = model.dims;
    this._modelName = model.name;
    this._lastEmbedding = { vector, dimension: model.dims, token };
    return vector;
  }

  bertEmbedding(token: string, model: EmbeddingModel): number[] {
    const seed = token.split('').reduce((a, c, i) => a + c.charCodeAt(0) * (i + 1), 0);
    let vector = this._generateRandomVector(model.dims, seed);
    const positional = this._positionalEncoding(0, model.dims);
    vector = vector.map((v, i) => v + positional[i] * 0.1);
    const normalized = this._normalizeVector(vector);
    this._vectors.set(token, normalized);
    this._dimension = model.dims;
    this._modelName = model.name;
    this._lastEmbedding = { vector: normalized, dimension: model.dims, token };
    return normalized;
  }

  gptEmbedding(token: string, model: EmbeddingModel): number[] {
    const seed = token.split('').reduce((a, c, i) => a + c.charCodeAt(0) * (i + 7), 0);
    const vector = this._generateRandomVector(model.dims, seed);
    this._vectors.set(token, vector);
    this._dimension = model.dims;
    this._modelName = model.name;
    this._lastEmbedding = { vector, dimension: model.dims, token };
    return vector;
  }

  elmoEmbedding(token: string, model: EmbeddingModel): number[] {
    const charVec = this._charCNN(token, model.dims);
    const lexVec = this._generateRandomVector(model.dims, this._hash(token) * 13);
    const vector = charVec.map((v, i) => v * 0.5 + lexVec[i] * 0.5);
    const normalized = this._normalizeVector(vector);
    this._vectors.set(token, normalized);
    this._dimension = model.dims;
    this._modelName = model.name;
    this._lastEmbedding = { vector: normalized, dimension: model.dims, token };
    return normalized;
  }

  private _charCNN(token: string, dims: number): number[] {
    const chars = token.toLowerCase().split('');
    const charVecs = chars.map(c => this._generateRandomVector(15, c.charCodeAt(0)));
    const convSize = 3;
    const result = new Array(dims).fill(0);
    for (let i = 0; i <= charVecs.length - convSize; i++) {
      for (let j = 0; j < convSize; j++) {
        for (let d = 0; d < 15 && d < dims; d++) {
          result[d] += charVecs[i + j][d] / convSize;
        }
      }
    }
    return result;
  }

  sentenceEmbedding(sentence: string, model: EmbeddingModel): number[] {
    const tokens = sentence.toLowerCase().split(/\s+/);
    let vector = new Array(model.dims).fill(0);
    let count = 0;
    for (const token of tokens) {
      if (token.length === 0) continue;
      const tokenVec = this.word2vec(token, model);
      vector = vector.map((v, i) => v + tokenVec[i]);
      count++;
    }
    if (count > 0) {
      vector = vector.map(v => v / count);
    }
    const norm = Math.sqrt(vector.reduce((a, b) => a + b * b, 0)) || 1;
    vector = vector.map(v => v / norm);
    this._lastEmbedding = { vector, dimension: model.dims, token: sentence };
    return vector;
  }

  weightedSentenceEmbedding(sentence: string, weights: Map<string, number>, model: EmbeddingModel): number[] {
    const tokens = sentence.toLowerCase().split(/\s+/);
    let vector = new Array(model.dims).fill(0);
    let totalWeight = 0;
    for (const token of tokens) {
      if (token.length === 0) continue;
      const w = weights.get(token) ?? 1;
      const tokenVec = this.word2vec(token, model);
      vector = vector.map((v, i) => v + tokenVec[i] * w);
      totalWeight += w;
    }
    if (totalWeight > 0) {
      vector = vector.map(v => v / totalWeight);
    }
    const norm = Math.sqrt(vector.reduce((a, b) => a + b * b, 0)) || 1;
    return vector.map(v => v / norm);
  }

  maxPoolingEmbedding(sentence: string, model: EmbeddingModel): number[] {
    const tokens = sentence.toLowerCase().split(/\s+/);
    const result = new Array(model.dims).fill(-Infinity);
    for (const token of tokens) {
      if (token.length === 0) continue;
      const tokenVec = this.word2vec(token, model);
      for (let i = 0; i < model.dims; i++) {
        if (tokenVec[i] > result[i]) result[i] = tokenVec[i];
      }
    }
    return result.map(v => v === -Infinity ? 0 : v);
  }

  minPoolingEmbedding(sentence: string, model: EmbeddingModel): number[] {
    const tokens = sentence.toLowerCase().split(/\s+/);
    const result = new Array(model.dims).fill(Infinity);
    for (const token of tokens) {
      if (token.length === 0) continue;
      const tokenVec = this.word2vec(token, model);
      for (let i = 0; i < model.dims; i++) {
        if (tokenVec[i] < result[i]) result[i] = tokenVec[i];
      }
    }
    return result.map(v => v === Infinity ? 0 : v);
  }

  documentEmbedding(document: string, model: EmbeddingModel): number[] {
    const sentences = document.split(/[.!?]+/).filter(s => s.trim().length > 0);
    let vector = new Array(model.dims).fill(0);
    let count = 0;
    for (const sentence of sentences) {
      const sentVec = this.sentenceEmbedding(sentence, model);
      vector = vector.map((v, i) => v + sentVec[i]);
      count++;
    }
    if (count > 0) {
      vector = vector.map(v => v / count);
    }
    const norm = Math.sqrt(vector.reduce((a, b) => a + b * b, 0)) || 1;
    return vector.map(v => v / norm);
  }

  cosineSimilarity(v1: number[], v2: number[]): number {
    const minLen = Math.min(v1.length, v2.length);
    let dot = 0;
    let norm1 = 0;
    let norm2 = 0;
    for (let i = 0; i < minLen; i++) {
      dot += v1[i] * v2[i];
      norm1 += v1[i] * v1[i];
      norm2 += v2[i] * v2[i];
    }
    const denom = Math.sqrt(norm1) * Math.sqrt(norm2);
    return denom === 0 ? 0 : dot / denom;
  }

  euclideanDistance(v1: number[], v2: number[]): number {
    const minLen = Math.min(v1.length, v2.length);
    let sum = 0;
    for (let i = 0; i < minLen; i++) {
      const diff = v1[i] - v2[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  manhattanDistance(v1: number[], v2: number[]): number {
    const minLen = Math.min(v1.length, v2.length);
    let sum = 0;
    for (let i = 0; i < minLen; i++) {
      sum += Math.abs(v1[i] - v2[i]);
    }
    return sum;
  }

  dotProduct(v1: number[], v2: number[]): number {
    const minLen = Math.min(v1.length, v2.length);
    let sum = 0;
    for (let i = 0; i < minLen; i++) {
      sum += v1[i] * v2[i];
    }
    return sum;
  }

  jaccardSimilarity(s1: Set<number>, s2: Set<number>): number {
    let intersection = 0;
    for (const x of s1) if (s2.has(x)) intersection++;
    const union = s1.size + s2.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  hammingDistance(v1: number[], v2: number[]): number {
    const minLen = Math.min(v1.length, v2.length);
    let dist = 0;
    for (let i = 0; i < minLen; i++) {
      if (v1[i] !== v2[i]) dist++;
    }
    return dist + Math.abs(v1.length - v2.length);
  }

  minkowskiDistance(v1: number[], v2: number[], p: number): number {
    const minLen = Math.min(v1.length, v2.length);
    let sum = 0;
    for (let i = 0; i < minLen; i++) {
      sum += Math.pow(Math.abs(v1[i] - v2[i]), p);
    }
    return Math.pow(sum, 1 / p);
  }

  pearsonCorrelation(v1: number[], v2: number[]): number {
    const n = Math.min(v1.length, v2.length);
    if (n === 0) return 0;
    const mean1 = v1.slice(0, n).reduce((a, b) => a + b, 0) / n;
    const mean2 = v2.slice(0, n).reduce((a, b) => a + b, 0) / n;
    let num = 0;
    let den1 = 0;
    let den2 = 0;
    for (let i = 0; i < n; i++) {
      const d1 = v1[i] - mean1;
      const d2 = v2[i] - mean2;
      num += d1 * d2;
      den1 += d1 * d1;
      den2 += d2 * d2;
    }
    const den = Math.sqrt(den1 * den2);
    return den === 0 ? 0 : num / den;
  }

  nearestNeighbors(vector: number[], corpus: Map<string, number[]>, k: number): string[] {
    const scores: { word: string; score: number }[] = [];
    for (const [word, vec] of corpus) {
      const sim = this._computeSimilarity(vector, vec);
      scores.push({ word, score: sim });
    }
    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, k).map(s => s.word);
  }

  nearestNeighborsWithScores(vector: number[], corpus: Map<string, number[]>, k: number): SimilarityResult[] {
    const scores: SimilarityResult[] = [];
    for (const [word, vec] of corpus) {
      const sim = this._computeSimilarity(vector, vec);
      scores.push({ token: word, similarity: sim, rank: 0 });
    }
    scores.sort((a, b) => b.similarity - a.similarity);
    return scores.slice(0, k).map((s, i) => ({ ...s, rank: i + 1 }));
  }

  analogy(a: string, b: string, c: string, model: EmbeddingModel): string[] {
    const vecA = this.word2vec(a, model);
    const vecB = this.word2vec(b, model);
    const vecC = this.word2vec(c, model);
    const target = vecA.map((v, i) => v - vecB[i] + vecC[i]);
    const corpus = new Map<string, number[]>();
    for (const word of model.vocab) {
      corpus.set(word, this.word2vec(word, model));
    }
    corpus.delete(a);
    corpus.delete(b);
    corpus.delete(c);
    return this.nearestNeighbors(target, corpus, 10);
  }

  similarityMatrix(tokens: string[], model: EmbeddingModel): number[][] {
    const vectors = tokens.map(t => this.word2vec(t, model));
    const matrix: number[][] = [];
    for (let i = 0; i < tokens.length; i++) {
      const row: number[] = [];
      for (let j = 0; j < tokens.length; j++) {
        row.push(this.cosineSimilarity(vectors[i], vectors[j]));
      }
      matrix.push(row);
    }
    return matrix;
  }

  kMeansClustering(vectors: number[][], k: number, maxIter: number = 100): number[][] {
    const n = vectors.length;
    if (n === 0 || k <= 0) return [];
    const dims = vectors[0].length;
    const centroids: number[][] = [];
    for (let i = 0; i < k; i++) {
      centroids.push([...vectors[Math.floor((i * n) / k)]]);
    }
    const assignments = new Array(n).fill(0);
    for (let iter = 0; iter < maxIter; iter++) {
      let changed = false;
      for (let i = 0; i < n; i++) {
        let bestCluster = 0;
        let bestDist = Infinity;
        for (let c = 0; c < k; c++) {
          const dist = this.euclideanDistance(vectors[i], centroids[c]);
          if (dist < bestDist) {
            bestDist = dist;
            bestCluster = c;
          }
        }
        if (assignments[i] !== bestCluster) {
          assignments[i] = bestCluster;
          changed = true;
        }
      }
      const sums: number[][] = Array(k).fill(null).map(() => new Array(dims).fill(0));
      const counts = new Array(k).fill(0);
      for (let i = 0; i < n; i++) {
        const c = assignments[i];
        counts[c]++;
        for (let d = 0; d < dims; d++) {
          sums[c][d] += vectors[i][d];
        }
      }
      for (let c = 0; c < k; c++) {
        if (counts[c] > 0) {
          centroids[c] = sums[c].map(s => s / counts[c]);
        }
      }
      if (!changed) break;
    }
    const clusters: number[][] = Array(k).fill(null).map(() => []);
    for (let i = 0; i < n; i++) {
      clusters[assignments[i]].push(i);
    }
    return clusters;
  }

  pcaReduce(vectors: number[][], targetDims: number): number[][] {
    const n = vectors.length;
    if (n === 0) return [];
    const dims = vectors[0].length;
    const mean = new Array(dims).fill(0);
    for (const v of vectors) {
      for (let d = 0; d < dims; d++) mean[d] += v[d];
    }
    for (let d = 0; d < dims; d++) mean[d] /= n;
    const centered = vectors.map(v => v.map((x, d) => x - mean[d]));
    const cov: number[][] = Array(dims).fill(null).map(() => new Array(dims).fill(0));
    for (let i = 0; i < dims; i++) {
      for (let j = 0; j < dims; j++) {
        let s = 0;
        for (let k = 0; k < n; k++) {
          s += centered[k][i] * centered[k][j];
        }
        cov[i][j] = s / (n - 1 || 1);
      }
    }
    const eigenvalues = new Array(dims).fill(0);
    for (let i = 0; i < dims; i++) eigenvalues[i] = cov[i][i];
    const indices = eigenvalues.map((v, i) => i).sort((a, b) => eigenvalues[b] - eigenvalues[a]);
    const topIndices = indices.slice(0, targetDims);
    return centered.map(v => topIndices.map(i => v[i]));
  }

  tsneApprox(vectors: number[][], targetDims: number = 2, perplexity: number = 30): number[][] {
    const n = vectors.length;
    if (n === 0) return [];
    const distances: number[][] = Array(n).fill(null).map(() => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const d = this.euclideanDistance(vectors[i], vectors[j]);
        distances[i][j] = d;
        distances[j][i] = d;
      }
    }
    const p: number[][] = Array(n).fill(null).map(() => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          p[i][j] = Math.exp(-distances[i][j] * distances[i][j] / (2 * perplexity * perplexity));
          sum += p[i][j];
        }
      }
      if (sum > 0) {
        for (let j = 0; j < n; j++) p[i][j] /= sum;
      }
    }
    let y: number[][] = Array(n).fill(null).map(() => Array(targetDims).fill(0).map(() => Math.random() - 0.5));
    const lr = 0.01;
    for (let iter = 0; iter < 100; iter++) {
      for (let i = 0; i < n; i++) {
        for (let d = 0; d < targetDims; d++) {
          let grad = 0;
          for (let j = 0; j < n; j++) {
            if (i !== j) {
              const diff = y[i][d] - y[j][d];
              grad += (p[i][j] - 1 / (1 + diff * diff)) * diff;
            }
          }
          y[i][d] -= lr * grad;
        }
      }
    }
    return y;
  }

  tokenizeAndEmbed(text: string, model: EmbeddingModel): number[][] {
    const tokens = text.toLowerCase().split(/\s+/).filter(t => t.length > 0);
    return tokens.map(t => this.word2vec(t, model));
  }

  averageEmbedding(vectors: number[][]): number[] {
    if (vectors.length === 0) return [];
    const dims = vectors[0].length;
    const result = new Array(dims).fill(0);
    for (const v of vectors) {
      for (let i = 0; i < dims; i++) {
        result[i] += v[i];
      }
    }
    return result.map(v => v / vectors.length);
  }

  aggregateEmbeddings(vectors: number[][], method: string = 'mean'): number[] {
    if (vectors.length === 0) return [];
    const dims = vectors[0].length;
    if (method === 'mean') {
      return this.averageEmbedding(vectors);
    } else if (method === 'sum') {
      const result = new Array(dims).fill(0);
      for (const v of vectors) {
        for (let i = 0; i < dims; i++) result[i] += v[i];
      }
      return result;
    } else if (method === 'max') {
      const result = new Array(dims).fill(-Infinity);
      for (const v of vectors) {
        for (let i = 0; i < dims; i++) {
          if (v[i] > result[i]) result[i] = v[i];
        }
      }
      return result.map(v => v === -Infinity ? 0 : v);
    } else if (method === 'min') {
      const result = new Array(dims).fill(Infinity);
      for (const v of vectors) {
        for (let i = 0; i < dims; i++) {
          if (v[i] < result[i]) result[i] = v[i];
        }
      }
      return result.map(v => v === Infinity ? 0 : v);
    }
    return this.averageEmbedding(vectors);
  }

  hashEmbedding(token: string, dims: number, buckets: number = 1000003): number[] {
    const vec = new Array(dims).fill(0);
    for (let i = 0; i < dims; i++) {
      const hash = this._hash(token + ':' + i) % buckets;
      vec[i] = (hash % 2 === 0 ? 1 : -1) / Math.sqrt(dims);
    }
    return vec;
  }

  hashedProjection(token: string, dims: number): number[] {
    const vec = new Array(dims).fill(0);
    const seed = this._hash(token);
    let s = seed;
    for (let i = 0; i < dims; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      vec[i] = ((s % 2 === 0 ? 1 : -1) * (s % 100) / 100);
    }
    return vec;
  }

  randomProjection(vectors: number[][], targetDims: number): number[][] {
    const sourceDims = vectors[0]?.length || 0;
    if (sourceDims === 0) return [];
    const proj: number[][] = [];
    for (let i = 0; i < targetDims; i++) {
      const row = new Array(sourceDims).fill(0).map(() => (Math.random() - 0.5) * 2);
      const norm = Math.sqrt(row.reduce((a, b) => a + b * b, 0)) || 1;
      proj.push(row.map(r => r / norm));
    }
    return vectors.map(v => proj.map(p => p.reduce((a, b, i) => a + b * v[i], 0)));
  }

  statistics(): EmbeddingStat {
    const vecs = Array.from(this._vectors.values());
    if (vecs.length === 0) {
      return { count: 0, dimension: this._dimension, meanNorm: 0, minNorm: 0, maxNorm: 0, vocabularySize: 0 };
    }
    const norms = vecs.map(v => Math.sqrt(v.reduce((a, b) => a + b * b, 0)));
    const meanNorm = norms.reduce((a, b) => a + b, 0) / norms.length;
    const minNorm = Math.min(...norms);
    const maxNorm = Math.max(...norms);
    return {
      count: vecs.length,
      dimension: this._dimension,
      meanNorm,
      minNorm,
      maxNorm,
      vocabularySize: this._vocabulary.length
    };
  }

  exportVectors(): { token: string; vector: number[] }[] {
    return Array.from(this._vectors.entries()).map(([token, vector]) => ({ token, vector }));
  }

  importVectors(data: { token: string; vector: number[] }[]): void {
    for (const { token, vector } of data) {
      this._vectors.set(token, vector);
      if (!this._vocabulary.includes(token)) {
        this._vocabulary.push(token);
      }
    }
  }

  serialize(): string {
    const data = {
      dimension: this._dimension,
      modelName: this._modelName,
      vocabulary: this._vocabulary,
      vectors: Array.from(this._vectors.entries())
    };
    return JSON.stringify(data);
  }

  deserialize(json: string): void {
    const data = JSON.parse(json);
    this._dimension = data.dimension;
    this._modelName = data.modelName;
    this._vocabulary = data.vocabulary;
    this._vectors = new Map(data.vectors);
  }

  private _computeSimilarity(v1: number[], v2: number[]): number {
    switch (this._similarityMetric) {
      case 'cosine':
        return this.cosineSimilarity(v1, v2);
      case 'euclidean':
        return -this.euclideanDistance(v1, v2);
      case 'manhattan':
        return -this.manhattanDistance(v1, v2);
      case 'dot':
        return this.dotProduct(v1, v2);
      default:
        return this.cosineSimilarity(v1, v2);
    }
  }

  private _handleOOV(token: string, dims: number): number[] {
    switch (this._oovStrategy) {
      case 'zero':
        return new Array(dims).fill(0);
      case 'average':
        const avg = new Array(dims).fill(0);
        if (this._vectors.size > 0) {
          for (const v of this._vectors.values()) {
            for (let i = 0; i < dims; i++) avg[i] += v[i] || 0;
          }
          for (let i = 0; i < dims; i++) avg[i] /= this._vectors.size;
        }
        return avg;
      case 'unk':
        return this._generateRandomVector(dims, this._hash('<UNK>'));
      case 'random':
      default:
        return this._generateRandomVector(dims, this._hash(token));
    }
  }

  private _positionalEncoding(pos: number, dims: number): number[] {
    const result = new Array(dims).fill(0);
    for (let i = 0; i < dims; i += 2) {
      const angle = pos / Math.pow(10000, i / dims);
      result[i] = Math.sin(angle);
      if (i + 1 < dims) {
        result[i + 1] = Math.cos(angle);
      }
    }
    return result;
  }

  private _normalizeVector(vector: number[]): number[] {
    if (this._normalization === 'none') return vector;
    if (this._normalization === 'l1') {
      const sum = vector.reduce((a, b) => a + Math.abs(b), 0) || 1;
      return vector.map(v => v / sum);
    }
    const norm = Math.sqrt(vector.reduce((a, b) => a + b * b, 0)) || 1;
    return vector.map(v => v / norm);
  }

  private _generateRandomVector(dims: number, seed: number): number[] {
    const vector: number[] = [];
    let s = seed;
    for (let i = 0; i < dims; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      vector.push((s / 0x7fffffff) * 2 - 1);
    }
    const norm = Math.sqrt(vector.reduce((a, b) => a + b * b, 0)) || 1;
    return vector.map(v => v / norm);
  }

  private _getSubwords(token: string, minLen: number, maxLen: number): string[] {
    const subwords: string[] = [];
    const padded = `<${token}>`;
    for (let len = minLen; len <= maxLen; len++) {
      for (let i = 0; i <= padded.length - len; i++) {
        subwords.push(padded.substring(i, i + len));
      }
    }
    subwords.push(`<${token}>`);
    return subwords;
  }

  private _hash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  toPacket(): DataPacket<EmbeddingResult> {
    const result: EmbeddingResult = {
      vector: this._lastEmbedding?.vector || [],
      dimension: this._dimension,
      token: this._lastEmbedding?.token || ''
    };
    this._counter++;
    return {
      id: `embedding-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['nlp', 'embedding'],
        priority: 1,
        phase: 'embedding'
      }
    };
  }

  reset(): void {
    this._vectors.clear();
    this._dimension = 128;
    this._counter = 0;
    this._modelName = 'default';
    this._vocabulary = [];
    this._lastEmbedding = null;
    this._normalization = 'l2';
    this._oovStrategy = 'random';
    this._similarityMetric = 'cosine';
  }
}
