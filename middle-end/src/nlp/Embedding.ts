import { DataPacket } from '../shared/types';

export interface Embedding {
  vector: number[];
  dimension: number;
  token: string;
}

export interface EmbeddingModel {
  name: string;
  vocab: string[];
  dims: number;
}

export class Embedding {
  private _vectors: Map<string, number[]> = new Map();
  private _dimension: number = 128;
  private _counter: number = 0;
  private _modelName: string = 'default';
  private _vocabulary: string[] = [];
  private _lastEmbedding: Embedding | null = null;

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

  oneHot(token: string, vocab: string[]): number[] {
    const index = vocab.indexOf(token);
    const vector = new Array(vocab.length).fill(0);
    if (index >= 0) {
      vector[index] = 1;
    }
    this._vectors.set(token, vector);
    this._dimension = vocab.length;
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

  word2vec(token: string, model: EmbeddingModel): number[] {
    const index = model.vocab.indexOf(token.toLowerCase());
    let vector: number[];
    if (index >= 0) {
      const seed = index * 9973;
      vector = this._generateRandomVector(model.dims, seed);
    } else {
      vector = this._generateRandomVector(model.dims, token.length * 1234);
    }
    this._vectors.set(token, vector);
    this._dimension = model.dims;
    this._modelName = model.name;
    return vector;
  }

  glove(token: string, model: EmbeddingModel): number[] {
    const index = model.vocab.indexOf(token.toLowerCase());
    let vector: number[];
    if (index >= 0) {
      const seed = index * 7919;
      vector = this._generateRandomVector(model.dims, seed);
    } else {
      vector = this._generateRandomVector(model.dims, token.length * 5678);
    }
    this._vectors.set(token, vector);
    this._dimension = model.dims;
    this._modelName = model.name;
    return vector;
  }

  fasttext(token: string, model: EmbeddingModel): number[] {
    let vector = new Array(model.dims).fill(0);
    const subwords = this._getSubwords(token, 3, 6);
    for (const sub of subwords) {
      const index = model.vocab.indexOf(sub);
      if (index >= 0) {
        const seed = index * 3137;
        const subVec = this._generateRandomVector(model.dims, seed);
        vector = vector.map((v, i) => v + subVec[i]);
      }
    }
    const norm = Math.sqrt(vector.reduce((a, b) => a + b * b, 0)) || 1;
    vector = vector.map(v => v / norm);
    this._vectors.set(token, vector);
    this._dimension = model.dims;
    this._modelName = model.name;
    return vector;
  }

  bertEmbedding(token: string, model: EmbeddingModel): number[] {
    const seed = token.split('').reduce((a, c, i) => a + c.charCodeAt(0) * (i + 1), 0);
    const vector = this._generateRandomVector(model.dims, seed);
    this._vectors.set(token, vector);
    this._dimension = model.dims;
    this._modelName = model.name;
    return vector;
  }

  sentenceEmbedding(sentence: string, model: EmbeddingModel): number[] {
    const tokens = sentence.toLowerCase().split(/\s+/);
    let vector = new Array(model.dims).fill(0);
    for (const token of tokens) {
      const tokenVec = this.word2vec(token, model);
      vector = vector.map((v, i) => v + tokenVec[i]);
    }
    const norm = Math.sqrt(vector.reduce((a, b) => a + b * b, 0)) || 1;
    vector = vector.map(v => v / norm);
    return vector;
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

  dotProduct(v1: number[], v2: number[]): number {
    const minLen = Math.min(v1.length, v2.length);
    let sum = 0;
    for (let i = 0; i < minLen; i++) {
      sum += v1[i] * v2[i];
    }
    return sum;
  }

  nearestNeighbors(vector: number[], corpus: Map<string, number[]>, k: number): string[] {
    const scores: { word: string; score: number }[] = [];
    for (const [word, vec] of corpus) {
      const sim = this.cosineSimilarity(vector, vec);
      scores.push({ word, score: sim });
    }
    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, k).map(s => s.word);
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

  toPacket(): DataPacket<Embedding> {
    const result: Embedding = {
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
  }
}
