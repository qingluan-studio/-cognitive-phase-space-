import { DataPacket } from '../shared/types';

export interface RelevanceJudgment {
  docId: string;
  relevant: boolean;
  score?: number;
  queryId?: string;
}

export interface FeedbackResult {
  originalQuery: string;
  expandedQuery: string;
  relevantDocs: string[];
  nonRelevantDocs: string[];
  addedTerms: string[];
  removedTerms: string[];
  method: FeedbackMethod;
  queryVector: number[];
  newQueryVector: number[];
}

export type FeedbackMethod = 
  | 'rocchio' 
  | 'pseudo_relevance' 
  | 'ide_regular' 
  | 'ide_dec_his' 
  | 'explicit';

export interface RocchioParameters {
  alpha: number;
  beta: number;
  gamma: number;
  maxExpansionTerms: number;
  minTermFrequency: number;
}

export interface PseudoRelevanceConfig {
  topK: number;
  feedbackMethod: FeedbackMethod;
  useRocchio: boolean;
  rocchioParams: RocchioParameters;
}

export class RelevanceFeedback {
  private _judgments: RelevanceJudgment[] = [];
  private _feedbackHistory: FeedbackResult[] = [];
  private _documentVectors: Map<string, number[]> = new Map();
  private _vocabulary: string[] = [];
  private _vocabIndex: Map<string, number> = new Map();
  private _rocchioParams: RocchioParameters = {
    alpha: 1.0,
    beta: 0.75,
    gamma: 0.25,
    maxExpansionTerms: 20,
    minTermFrequency: 2
  };
  private _pseudoConfig: PseudoRelevanceConfig = {
    topK: 10,
    feedbackMethod: 'pseudo_relevance',
    useRocchio: true,
    rocchioParams: {
      alpha: 1.0,
      beta: 0.75,
      gamma: 0.15,
      maxExpansionTerms: 20,
      minTermFrequency: 2
    }
  };
  private _stopwords: Set<string> = new Set();
  private _counter: number = 0;
  private _lastResult: FeedbackResult | null = null;

  constructor() {
    this._initDefaultStopwords();
  }

  private _initDefaultStopwords(): void {
    const defaultStopwords = [
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'can', 'shall', 'of', 'in', 'to',
      'for', 'with', 'on', 'at', 'from', 'by', 'about', 'as', 'into',
      'through', 'during', 'before', 'after', 'above', 'below', 'between',
      'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both', 'either',
      'neither', 'each', 'every', 'all', 'any', 'few', 'more', 'most',
      'other', 'some', 'such', 'no', 'only', 'own', 'same', 'than', 'too',
      'very', 'just', 'because', 'if', 'when', 'where', 'how', 'what',
      'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'i', 'you',
      'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
      'my', 'your', 'his', 'its', 'our', 'their', 'mine', 'yours', 'hers',
      'ours', 'theirs'
    ];
    defaultStopwords.forEach(word => this._stopwords.add(word));
  }

  get judgments(): RelevanceJudgment[] {
    return this._judgments;
  }

  get feedbackHistory(): FeedbackResult[] {
    return this._feedbackHistory;
  }

  get rocchioParams(): RocchioParameters {
    return { ...this._rocchioParams };
  }

  get pseudoConfig(): PseudoRelevanceConfig {
    return { 
      ...this._pseudoConfig, 
      rocchioParams: { ...this._pseudoConfig.rocchioParams } 
    };
  }

  get lastResult(): FeedbackResult | null {
    return this._lastResult;
  }

  setRocchioParams(params: Partial<RocchioParameters>): void {
    this._rocchioParams = { ...this._rocchioParams, ...params };
  }

  setPseudoConfig(config: Partial<PseudoRelevanceConfig>): void {
    this._pseudoConfig = { 
      ...this._pseudoConfig, 
      ...config,
      rocchioParams: config.rocchioParams 
        ? { ...this._pseudoConfig.rocchioParams, ...config.rocchioParams }
        : this._pseudoConfig.rocchioParams
    };
  }

  addJudgment(judgment: RelevanceJudgment): void {
    const existing = this._judgments.findIndex(
      j => j.docId === judgment.docId && j.queryId === judgment.queryId
    );
    if (existing >= 0) {
      this._judgments[existing] = judgment;
    } else {
      this._judgments.push(judgment);
    }
  }

  addJudgments(judgments: RelevanceJudgment[]): void {
    for (const j of judgments) {
      this.addJudgment(j);
    }
  }

  buildDocumentVectors(documents: { id: string; content: string }[]): void {
    this._documentVectors.clear();
    this._vocabulary = [];
    this._vocabIndex.clear();

    const allTerms = new Set<string>();
    const docTokens: Map<string, string[]> = new Map();

    for (const doc of documents) {
      const tokens = this._tokenize(doc.content);
      docTokens.set(doc.id, tokens);
      for (const token of tokens) {
        allTerms.add(token);
      }
    }

    this._vocabulary = Array.from(allTerms).sort();
    for (let i = 0; i < this._vocabulary.length; i++) {
      this._vocabIndex.set(this._vocabulary[i], i);
    }

    const docFrequencies = new Map<string, number>();
    for (const [, tokens] of docTokens) {
      const uniqueTokens = new Set(tokens);
      for (const token of uniqueTokens) {
        docFrequencies.set(token, (docFrequencies.get(token) || 0) + 1);
      }
    }

    const totalDocs = documents.length;

    for (const doc of documents) {
      const tokens = docTokens.get(doc.id) || [];
      const tf = new Map<string, number>();
      for (const token of tokens) {
        tf.set(token, (tf.get(token) || 0) + 1);
      }

      const vector = new Array(this._vocabulary.length).fill(0);
      for (const [term, freq] of tf) {
        const idx = this._vocabIndex.get(term);
        if (idx !== undefined) {
          const df = docFrequencies.get(term) || 0;
          const idf = Math.log((totalDocs + 1) / (df + 1)) + 1;
          vector[idx] = freq * idf;
        }
      }

      const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
      if (magnitude > 0) {
        for (let i = 0; i < vector.length; i++) {
          vector[i] /= magnitude;
        }
      }

      this._documentVectors.set(doc.id, vector);
    }
  }

  rocchio(
    query: string,
    relevantDocs: string[],
    nonRelevantDocs: string[]
  ): FeedbackResult {
    const queryVector = this._queryToVector(query);
    const { alpha, beta, gamma, maxExpansionTerms } = this._rocchioParams;

    const relevantCentroid = this._computeCentroid(relevantDocs);
    const nonRelevantCentroid = this._computeCentroid(nonRelevantDocs);

    const newQueryVector = new Array(this._vocabulary.length).fill(0);
    for (let i = 0; i < this._vocabulary.length; i++) {
      newQueryVector[i] = 
        alpha * queryVector[i] +
        beta * (relevantCentroid[i] || 0) -
        gamma * (nonRelevantCentroid[i] || 0);
      newQueryVector[i] = Math.max(0, newQueryVector[i]);
    }

    const { addedTerms, removedTerms, expandedQuery } = this._extractExpandedQuery(
      query,
      queryVector,
      newQueryVector,
      maxExpansionTerms
    );

    const result: FeedbackResult = {
      originalQuery: query,
      expandedQuery,
      relevantDocs: [...relevantDocs],
      nonRelevantDocs: [...nonRelevantDocs],
      addedTerms,
      removedTerms,
      method: 'rocchio',
      queryVector,
      newQueryVector
    };

    this._feedbackHistory.push(result);
    this._lastResult = result;
    return result;
  }

  pseudoRelevance(
    query: string,
    rankedDocs: { docId: string; score: number }[]
  ): FeedbackResult {
    const { topK, useRocchio, rocchioParams } = this._pseudoConfig;
    const topDocs = rankedDocs.slice(0, topK).map(d => d.docId);
    const bottomDocs = rankedDocs.slice(-Math.floor(rankedDocs.length * 0.1)).map(d => d.docId);

    if (useRocchio) {
      const savedParams = this._rocchioParams;
      this._rocchioParams = rocchioParams;
      const result = this.rocchio(query, topDocs, bottomDocs);
      result.method = 'pseudo_relevance';
      this._rocchioParams = savedParams;
      return result;
    }

    const queryVector = this._queryToVector(query);
    const relevantCentroid = this._computeCentroid(topDocs);

    const newQueryVector = new Array(this._vocabulary.length).fill(0);
    for (let i = 0; i < this._vocabulary.length; i++) {
      newQueryVector[i] = queryVector[i] + 0.5 * (relevantCentroid[i] || 0);
    }

    const { addedTerms, removedTerms, expandedQuery } = this._extractExpandedQuery(
      query,
      queryVector,
      newQueryVector,
      rocchioParams.maxExpansionTerms
    );

    const result: FeedbackResult = {
      originalQuery: query,
      expandedQuery,
      relevantDocs: topDocs,
      nonRelevantDocs: bottomDocs,
      addedTerms,
      removedTerms,
      method: 'pseudo_relevance',
      queryVector,
      newQueryVector
    };

    this._feedbackHistory.push(result);
    this._lastResult = result;
    return result;
  }

  ideRegular(
    query: string,
    relevantDocs: string[],
    nonRelevantDocs: string[]
  ): FeedbackResult {
    const queryVector = this._queryToVector(query);
    const newQueryVector = new Array(this._vocabulary.length).fill(0);

    const relevantCentroid = this._computeCentroid(relevantDocs);
    const nonRelevantCentroid = this._computeCentroid(nonRelevantDocs);

    for (let i = 0; i < this._vocabulary.length; i++) {
      newQueryVector[i] = 
        queryVector[i] + 
        (relevantCentroid[i] || 0) - 
        (nonRelevantCentroid[i] || 0);
      newQueryVector[i] = Math.max(0, newQueryVector[i]);
    }

    const { addedTerms, removedTerms, expandedQuery } = this._extractExpandedQuery(
      query,
      queryVector,
      newQueryVector,
      this._rocchioParams.maxExpansionTerms
    );

    const result: FeedbackResult = {
      originalQuery: query,
      expandedQuery,
      relevantDocs: [...relevantDocs],
      nonRelevantDocs: [...nonRelevantDocs],
      addedTerms,
      removedTerms,
      method: 'ide_regular',
      queryVector,
      newQueryVector
    };

    this._feedbackHistory.push(result);
    this._lastResult = result;
    return result;
  }

  ideDecHis(
    query: string,
    relevantDocs: string[],
    nonRelevantDocs: string[]
  ): FeedbackResult {
    const queryVector = this._queryToVector(query);
    const newQueryVector = new Array(this._vocabulary.length).fill(0);

    const relevantCentroid = this._computeCentroid(relevantDocs);
    
    let strongestNonRelevant = new Array(this._vocabulary.length).fill(0);
    let maxMagnitude = 0;
    for (const docId of nonRelevantDocs) {
      const vec = this._documentVectors.get(docId);
      if (vec) {
        const magnitude = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
        if (magnitude > maxMagnitude) {
          maxMagnitude = magnitude;
          strongestNonRelevant = vec;
        }
      }
    }

    for (let i = 0; i < this._vocabulary.length; i++) {
      newQueryVector[i] = 
        queryVector[i] + 
        (relevantCentroid[i] || 0) - 
        strongestNonRelevant[i];
      newQueryVector[i] = Math.max(0, newQueryVector[i]);
    }

    const { addedTerms, removedTerms, expandedQuery } = this._extractExpandedQuery(
      query,
      queryVector,
      newQueryVector,
      this._rocchioParams.maxExpansionTerms
    );

    const result: FeedbackResult = {
      originalQuery: query,
      expandedQuery,
      relevantDocs: [...relevantDocs],
      nonRelevantDocs: [...nonRelevantDocs],
      addedTerms,
      removedTerms,
      method: 'ide_dec_his',
      queryVector,
      newQueryVector
    };

    this._feedbackHistory.push(result);
    this._lastResult = result;
    return result;
  }

  applyFeedback(
    query: string,
    judgments: RelevanceJudgment[],
    method: FeedbackMethod = 'rocchio'
  ): FeedbackResult {
    this.addJudgments(judgments);

    const relevantDocs = judgments.filter(j => j.relevant).map(j => j.docId);
    const nonRelevantDocs = judgments.filter(j => !j.relevant).map(j => j.docId);

    switch (method) {
      case 'rocchio':
        return this.rocchio(query, relevantDocs, nonRelevantDocs);
      case 'ide_regular':
        return this.ideRegular(query, relevantDocs, nonRelevantDocs);
      case 'ide_dec_his':
        return this.ideDecHis(query, relevantDocs, nonRelevantDocs);
      case 'explicit':
      default:
        return this.rocchio(query, relevantDocs, nonRelevantDocs);
    }
  }

  private _computeCentroid(docIds: string[]): number[] {
    const centroid = new Array(this._vocabulary.length).fill(0);
    if (docIds.length === 0) return centroid;

    let count = 0;
    for (const docId of docIds) {
      const vec = this._documentVectors.get(docId);
      if (vec) {
        for (let i = 0; i < this._vocabulary.length; i++) {
          centroid[i] += vec[i];
        }
        count++;
      }
    }

    if (count > 0) {
      for (let i = 0; i < this._vocabulary.length; i++) {
        centroid[i] /= count;
      }
    }

    return centroid;
  }

  private _queryToVector(query: string): number[] {
    const tokens = this._tokenize(query);
    const tf = new Map<string, number>();
    for (const token of tokens) {
      tf.set(token, (tf.get(token) || 0) + 1);
    }

    const vector = new Array(this._vocabulary.length).fill(0);
    for (const [term, freq] of tf) {
      const idx = this._vocabIndex.get(term);
      if (idx !== undefined) {
        vector[idx] = freq;
      }
    }

    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    if (magnitude > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] /= magnitude;
      }
    }

    return vector;
  }

  private _extractExpandedQuery(
    originalQuery: string,
    originalVector: number[],
    newVector: number[],
    maxTerms: number
  ): { addedTerms: string[]; removedTerms: string[]; expandedQuery: string } {
    const originalTerms = new Set(this._tokenize(originalQuery));
    const addedTerms: string[] = [];
    const removedTerms: string[] = [];

    const termWeights: { term: string; weight: number; original: number }[] = [];
    for (let i = 0; i < this._vocabulary.length; i++) {
      termWeights.push({
        term: this._vocabulary[i],
        weight: newVector[i],
        original: originalVector[i]
      });
    }

    termWeights.sort((a, b) => b.weight - a.weight);

    for (const tw of termWeights) {
      if (tw.weight > 0 && !originalTerms.has(tw.term) && addedTerms.length < maxTerms) {
        if (tw.original === 0 && tw.weight > 0.01) {
          addedTerms.push(tw.term);
        }
      }
    }

    for (const term of originalTerms) {
      const idx = this._vocabIndex.get(term);
      if (idx !== undefined && newVector[idx] < 0.001) {
        removedTerms.push(term);
      }
    }

    const queryTerms = [...originalTerms].filter(t => !removedTerms.includes(t));
    queryTerms.push(...addedTerms);
    const expandedQuery = queryTerms.join(' ');

    return { addedTerms, removedTerms, expandedQuery };
  }

  private _tokenize(text: string): string[] {
    const words = text.toLowerCase().match(/[\w']+/g) || [];
    return words.filter(w => !this._stopwords.has(w) && w.length > 2);
  }

  getQueryTerms(vector: number[], topK: number = 10): { term: string; weight: number }[] {
    const terms: { term: string; weight: number }[] = [];
    for (let i = 0; i < this._vocabulary.length; i++) {
      if (vector[i] > 0) {
        terms.push({ term: this._vocabulary[i], weight: vector[i] });
      }
    }
    terms.sort((a, b) => b.weight - a.weight);
    return terms.slice(0, topK);
  }

  computeSimilarity(vec1: number[], vec2: number[]): number {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    const len = Math.max(vec1.length, vec2.length);

    for (let i = 0; i < len; i++) {
      const a = vec1[i] || 0;
      const b = vec2[i] || 0;
      dotProduct += a * b;
      norm1 += a * a;
      norm2 += b * b;
    }

    const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
    return denominator > 0 ? dotProduct / denominator : 0;
  }

  toPacket(): DataPacket<FeedbackResult> {
    const result = this._lastResult || {
      originalQuery: '',
      expandedQuery: '',
      relevantDocs: [],
      nonRelevantDocs: [],
      addedTerms: [],
      removedTerms: [],
      method: 'rocchio' as FeedbackMethod,
      queryVector: [],
      newQueryVector: []
    };
    this._counter++;
    return {
      id: `relevance-feedback-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['information-retrieval', 'relevance-feedback'],
        priority: 1,
        phase: 'feedback'
      }
    };
  }

  reset(): void {
    this._judgments = [];
    this._feedbackHistory = [];
    this._documentVectors.clear();
    this._vocabulary = [];
    this._vocabIndex.clear();
    this._counter = 0;
    this._lastResult = null;
    this._rocchioParams = {
      alpha: 1.0,
      beta: 0.75,
      gamma: 0.25,
      maxExpansionTerms: 20,
      minTermFrequency: 2
    };
    this._pseudoConfig = {
      topK: 10,
      feedbackMethod: 'pseudo_relevance',
      useRocchio: true,
      rocchioParams: {
        alpha: 1.0,
        beta: 0.75,
        gamma: 0.15,
        maxExpansionTerms: 20,
        minTermFrequency: 2
      }
    };
  }
}
