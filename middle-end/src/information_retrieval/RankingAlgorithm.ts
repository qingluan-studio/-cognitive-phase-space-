import { DataPacket } from '../shared/types';

export interface RankedDocument {
  docId: string;
  score: number;
  rank: number;
  features: Map<string, number>;
  explanation: string[];
}

export interface RankingResult {
  documents: RankedDocument[];
  algorithm: RankingAlgorithmType;
  query: string;
  totalCount: number;
  processingTime: number;
}

export type RankingAlgorithmType = 'tfidf' | 'bm25' | 'pagerank' | 'ml' | 'hybrid';

export interface PageRankNode {
  id: string;
  incoming: string[];
  outgoing: string[];
  score: number;
}

export interface MLFeature {
  name: string;
  weight: number;
  value: number;
}

export interface BM25Parameters {
  k1: number;
  b: number;
  k3: number;
  delta: number;
}

export class RankingAlgorithm {
  private _algorithm: RankingAlgorithmType = 'bm25';
  private _documents: Map<string, string> = new Map();
  private _termFrequencies: Map<string, Map<string, number>> = new Map();
  private _docFrequencies: Map<string, number> = new Map();
  private _docLengths: Map<string, number> = new Map();
  private _avgDocLength: number = 0;
  private _totalDocuments: number = 0;
  private _pageRankScores: Map<string, number> = new Map();
  private _bm25Params: BM25Parameters = { k1: 1.5, b: 0.75, k3: 1.5, delta: 0.5 };
  private _mlFeatureWeights: Map<string, number> = new Map();
  private _counter: number = 0;
  private _lastResult: RankingResult | null = null;
  private _stopwords: Set<string> = new Set();

  constructor() {
    this._initDefaultStopwords();
    this._initMLFeatureWeights();
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

  private _initMLFeatureWeights(): void {
    this._mlFeatureWeights.set('bm25_score', 0.35);
    this._mlFeatureWeights.set('tfidf_score', 0.20);
    this._mlFeatureWeights.set('pagerank_score', 0.15);
    this._mlFeatureWeights.set('title_match', 0.10);
    this._mlFeatureWeights.set('freshness', 0.10);
    this._mlFeatureWeights.set('coverage', 0.05);
    this._mlFeatureWeights.set('proximity', 0.05);
  }

  get algorithm(): RankingAlgorithmType {
    return this._algorithm;
  }

  get bm25Params(): BM25Parameters {
    return { ...this._bm25Params };
  }

  get pageRankScores(): Map<string, number> {
    return this._pageRankScores;
  }

  get mlFeatureWeights(): Map<string, number> {
    return this._mlFeatureWeights;
  }

  setAlgorithm(algorithm: RankingAlgorithmType): void {
    this._algorithm = algorithm;
  }

  setBM25Params(params: Partial<BM25Parameters>): void {
    this._bm25Params = { ...this._bm25Params, ...params };
  }

  indexDocuments(documents: { id: string; content: string; title?: string }[]): void {
    this._documents.clear();
    this._termFrequencies.clear();
    this._docFrequencies.clear();
    this._docLengths.clear();
    this._totalDocuments = 0;
    let totalLength = 0;

    for (const doc of documents) {
      this._documents.set(doc.id, doc.content);
      const terms = this._tokenize(doc.content);
      this._docLengths.set(doc.id, terms.length);
      totalLength += terms.length;
      this._totalDocuments++;

      const tfMap = new Map<string, number>();
      const uniqueTerms = new Set<string>();

      for (const term of terms) {
        tfMap.set(term, (tfMap.get(term) || 0) + 1);
        uniqueTerms.add(term);
      }

      this._termFrequencies.set(doc.id, tfMap);

      for (const term of uniqueTerms) {
        this._docFrequencies.set(term, (this._docFrequencies.get(term) || 0) + 1);
      }
    }

    this._avgDocLength = this._totalDocuments > 0 ? totalLength / this._totalDocuments : 0;
  }

  rank(query: string, docIds: string[], algorithm?: RankingAlgorithmType): RankingResult {
    const startTime = Date.now();
    const algo = algorithm || this._algorithm;
    let ranked: RankedDocument[] = [];

    switch (algo) {
      case 'tfidf':
        ranked = this.rankTFIDF(query, docIds);
        break;
      case 'bm25':
        ranked = this.rankBM25(query, docIds);
        break;
      case 'pagerank':
        ranked = this.rankPageRank(query, docIds);
        break;
      case 'ml':
        ranked = this.rankML(query, docIds);
        break;
      case 'hybrid':
        ranked = this.rankHybrid(query, docIds);
        break;
      default:
        ranked = this.rankBM25(query, docIds);
    }

    ranked.sort((a, b) => b.score - a.score);
    ranked = ranked.map((r, i) => ({ ...r, rank: i + 1 }));

    const result: RankingResult = {
      documents: ranked,
      algorithm: algo,
      query,
      totalCount: ranked.length,
      processingTime: Date.now() - startTime
    };

    this._lastResult = result;
    return result;
  }

  rankTFIDF(query: string, docIds: string[]): RankedDocument[] {
    const queryTerms = this._tokenize(query);
    const queryTf = this._calculateTermFrequency(queryTerms);
    const results: RankedDocument[] = [];

    for (const docId of docIds) {
      const docTf = this._termFrequencies.get(docId);
      if (!docTf) continue;

      let score = 0;
      const features = new Map<string, number>();
      const explanation: string[] = [];

      for (const [term, qtf] of queryTf) {
        const dtf = docTf.get(term) || 0;
        const df = this._docFrequencies.get(term) || 0;
        const idf = Math.log((this._totalDocuments + 1) / (df + 1)) + 1;

        const tfidf = dtf * idf;
        score += tfidf * qtf;

        features.set(`tfidf_${term}`, tfidf);
        if (dtf > 0) {
          explanation.push(`Term '${term}': tf=${dtf}, idf=${idf.toFixed(4)}, tfidf=${tfidf.toFixed(4)}`);
        }
      }

      features.set('total_tfidf', score);

      results.push({
        docId,
        score,
        rank: 0,
        features,
        explanation
      });
    }

    return results;
  }

  rankBM25(query: string, docIds: string[]): RankedDocument[] {
    const queryTerms = this._tokenize(query);
    const queryTf = this._calculateTermFrequency(queryTerms);
    const results: RankedDocument[] = [];

    const { k1, b, k3, delta } = this._bm25Params;

    for (const docId of docIds) {
      const docTf = this._termFrequencies.get(docId);
      if (!docTf) continue;

      const docLength = this._docLengths.get(docId) || 0;
      let score = 0;
      const features = new Map<string, number>();
      const explanation: string[] = [];

      for (const [term, qtf] of queryTf) {
        const dtf = docTf.get(term) || 0;
        const df = this._docFrequencies.get(term) || 0;

        const idf = Math.log((this._totalDocuments - df + 0.5) / (df + 0.5) + 1);

        const tfNumerator = dtf * (k1 + 1);
        const tfDenominator = dtf + k1 * (1 - b + b * (docLength / this._avgDocLength));
        const tfComponent = tfNumerator / tfDenominator;

        const qtfComponent = ((k3 + 1) * qtf) / (k3 + qtf);

        const termScore = idf * (tfComponent + delta) * qtfComponent;
        score += termScore;

        features.set(`bm25_${term}`, termScore);
        if (dtf > 0) {
          explanation.push(
            `Term '${term}': idf=${idf.toFixed(4)}, tf_component=${tfComponent.toFixed(4)}, qtf_component=${qtfComponent.toFixed(4)}, score=${termScore.toFixed(4)}`
          );
        }
      }

      features.set('doc_length', docLength);
      features.set('total_bm25', score);

      results.push({
        docId,
        score,
        rank: 0,
        features,
        explanation
      });
    }

    return results;
  }

  computePageRank(links: { source: string; target: string }[], damping: number = 0.85, iterations: number = 50): void {
    const nodes = new Map<string, PageRankNode>();

    for (const link of links) {
      if (!nodes.has(link.source)) {
        nodes.set(link.source, { id: link.source, incoming: [], outgoing: [], score: 1 });
      }
      if (!nodes.has(link.target)) {
        nodes.set(link.target, { id: link.target, incoming: [], outgoing: [], score: 1 });
      }
      nodes.get(link.source)!.outgoing.push(link.target);
      nodes.get(link.target)!.incoming.push(link.source);
    }

    const nodeIds = Array.from(nodes.keys());
    const n = nodeIds.length;

    for (let iter = 0; iter < iterations; iter++) {
      const newScores = new Map<string, number>();

      for (const nodeId of nodeIds) {
        const node = nodes.get(nodeId)!;
        let rank = (1 - damping) / n;

        for (const incomingId of node.incoming) {
          const incomingNode = nodes.get(incomingId)!;
          const outDegree = incomingNode.outgoing.length;
          if (outDegree > 0) {
            rank += damping * (incomingNode.score / outDegree);
          }
        }

        newScores.set(nodeId, rank);
      }

      for (const [nodeId, score] of newScores) {
        nodes.get(nodeId)!.score = score;
      }
    }

    this._pageRankScores.clear();
    for (const [nodeId, node] of nodes) {
      this._pageRankScores.set(nodeId, node.score);
    }
  }

  rankPageRank(query: string, docIds: string[]): RankedDocument[] {
    const queryTerms = this._tokenize(query);
    const results: RankedDocument[] = [];

    for (const docId of docIds) {
      const docTf = this._termFrequencies.get(docId);
      const pageRank = this._pageRankScores.get(docId) || 0;

      if (!docTf) continue;

      let contentScore = 0;
      const features = new Map<string, number>();
      const explanation: string[] = [];

      for (const term of queryTerms) {
        const dtf = docTf.get(term) || 0;
        if (dtf > 0) {
          contentScore += dtf;
          explanation.push(`Term '${term}': tf=${dtf}`);
        }
      }

      const normalizedContent = contentScore / (this._docLengths.get(docId) || 1);
      const score = pageRank * 0.6 + normalizedContent * 0.4;

      features.set('pagerank', pageRank);
      features.set('content_match', normalizedContent);
      features.set('combined_score', score);

      explanation.push(`PageRank: ${pageRank.toFixed(6)}`);
      explanation.push(`Content match: ${normalizedContent.toFixed(4)}`);
      explanation.push(`Final score: ${score.toFixed(6)}`);

      results.push({
        docId,
        score,
        rank: 0,
        features,
        explanation
      });
    }

    return results;
  }

  rankML(query: string, docIds: string[]): RankedDocument[] {
    const queryTerms = this._tokenize(query);
    const bm25Results = this.rankBM25(query, docIds);
    const tfidfResults = this.rankTFIDF(query, docIds);
    const results: RankedDocument[] = [];

    const bm25Scores = new Map(bm25Results.map(r => [r.docId, r.score]));
    const tfidfScores = new Map(tfidfResults.map(r => [r.docId, r.score]));

    const maxBM25 = Math.max(...bm25Scores.values(), 1);
    const maxTFIDF = Math.max(...tfidfScores.values(), 1);
    const maxPR = Math.max(...this._pageRankScores.values(), 1);

    for (const docId of docIds) {
      const docTf = this._termFrequencies.get(docId);
      if (!docTf) continue;

      const features = new Map<string, number>();
      const explanation: string[] = [];
      let score = 0;

      const bm25Norm = (bm25Scores.get(docId) || 0) / maxBM25;
      features.set('bm25_score', bm25Norm);
      const bm25Weight = this._mlFeatureWeights.get('bm25_score') || 0;
      score += bm25Norm * bm25Weight;
      explanation.push(`BM25 (normalized): ${bm25Norm.toFixed(4)} * weight ${bm25Weight} = ${(bm25Norm * bm25Weight).toFixed(4)}`);

      const tfidfNorm = (tfidfScores.get(docId) || 0) / maxTFIDF;
      features.set('tfidf_score', tfidfNorm);
      const tfidfWeight = this._mlFeatureWeights.get('tfidf_score') || 0;
      score += tfidfNorm * tfidfWeight;
      explanation.push(`TF-IDF (normalized): ${tfidfNorm.toFixed(4)} * weight ${tfidfWeight} = ${(tfidfNorm * tfidfWeight).toFixed(4)}`);

      const prNorm = (this._pageRankScores.get(docId) || 0) / maxPR;
      features.set('pagerank_score', prNorm);
      const prWeight = this._mlFeatureWeights.get('pagerank_score') || 0;
      score += prNorm * prWeight;
      explanation.push(`PageRank (normalized): ${prNorm.toFixed(4)} * weight ${prWeight} = ${(prNorm * prWeight).toFixed(4)}`);

      const titleMatch = this._calculateTitleMatch(docId, queryTerms);
      features.set('title_match', titleMatch);
      const titleWeight = this._mlFeatureWeights.get('title_match') || 0;
      score += titleMatch * titleWeight;
      explanation.push(`Title match: ${titleMatch.toFixed(4)} * weight ${titleWeight} = ${(titleMatch * titleWeight).toFixed(4)}`);

      const coverage = this._calculateQueryCoverage(docTf, queryTerms);
      features.set('coverage', coverage);
      const coverageWeight = this._mlFeatureWeights.get('coverage') || 0;
      score += coverage * coverageWeight;
      explanation.push(`Query coverage: ${coverage.toFixed(4)} * weight ${coverageWeight} = ${(coverage * coverageWeight).toFixed(4)}`);

      const proximity = this._calculateTermProximity(docId, queryTerms);
      features.set('proximity', proximity);
      const proxWeight = this._mlFeatureWeights.get('proximity') || 0;
      score += proximity * proxWeight;
      explanation.push(`Term proximity: ${proximity.toFixed(4)} * weight ${proxWeight} = ${(proximity * proxWeight).toFixed(4)}`);

      const freshness = this._calculateFreshness(docId);
      features.set('freshness', freshness);
      const freshWeight = this._mlFeatureWeights.get('freshness') || 0;
      score += freshness * freshWeight;
      explanation.push(`Freshness: ${freshness.toFixed(4)} * weight ${freshWeight} = ${(freshness * freshWeight).toFixed(4)}`);

      features.set('final_score', score);
      explanation.push(`Final ML score: ${score.toFixed(4)}`);

      results.push({
        docId,
        score,
        rank: 0,
        features,
        explanation
      });
    }

    return results;
  }

  rankHybrid(query: string, docIds: string[]): RankedDocument[] {
    const bm25Results = this.rankBM25(query, docIds);
    const mlResults = this.rankML(query, docIds);

    const bm25Map = new Map(bm25Results.map(r => [r.docId, r]));
    const mlMap = new Map(mlResults.map(r => [r.docId, r]));

    const maxBM25 = Math.max(...bm25Results.map(r => r.score), 1);
    const maxML = Math.max(...mlResults.map(r => r.score), 1);

    const results: RankedDocument[] = [];

    for (const docId of docIds) {
      const bm25Doc = bm25Map.get(docId);
      const mlDoc = mlMap.get(docId);
      if (!bm25Doc || !mlDoc) continue;

      const bm25Norm = bm25Doc.score / maxBM25;
      const mlNorm = mlDoc.score / maxML;
      const hybridScore = bm25Norm * 0.5 + mlNorm * 0.5;

      const features = new Map([
        ...bm25Doc.features,
        ...mlDoc.features,
        ['hybrid_score', hybridScore]
      ]);

      const explanation = [
        `=== Hybrid Ranking (50% BM25 + 50% ML) ===`,
        `BM25 (normalized): ${bm25Norm.toFixed(4)}`,
        `ML (normalized): ${mlNorm.toFixed(4)}`,
        `Final hybrid score: ${hybridScore.toFixed(4)}`,
        ``,
        `--- BM25 details ---`,
        ...bm25Doc.explanation,
        ``,
        `--- ML details ---`,
        ...mlDoc.explanation
      ];

      results.push({
        docId,
        score: hybridScore,
        rank: 0,
        features,
        explanation
      });
    }

    return results;
  }

  private _calculateTermFrequency(terms: string[]): Map<string, number> {
    const tf = new Map<string, number>();
    for (const term of terms) {
      tf.set(term, (tf.get(term) || 0) + 1);
    }
    return tf;
  }

  private _calculateTitleMatch(docId: string, queryTerms: string[]): number {
    const doc = this._documents.get(docId);
    if (!doc) return 0;

    const titleMatchScore = queryTerms.filter(term =>
      doc.toLowerCase().includes(term)
    ).length / Math.max(queryTerms.length, 1);

    return titleMatchScore;
  }

  private _calculateQueryCoverage(docTf: Map<string, number>, queryTerms: string[]): number {
    const uniqueQueryTerms = new Set(queryTerms);
    let matched = 0;
    for (const term of uniqueQueryTerms) {
      if (docTf.has(term)) {
        matched++;
      }
    }
    return matched / Math.max(uniqueQueryTerms.size, 1);
  }

  private _calculateTermProximity(docId: string, queryTerms: string[]): number {
    const doc = this._documents.get(docId);
    if (!doc) return 0;

    const terms = this._tokenize(doc);
    const positions: Map<string, number[]> = new Map();

    for (let i = 0; i < terms.length; i++) {
      const term = terms[i];
      if (!positions.has(term)) {
        positions.set(term, []);
      }
      positions.get(term)!.push(i);
    }

    const queryPositions: number[] = [];
    for (const term of queryTerms) {
      const pos = positions.get(term);
      if (pos && pos.length > 0) {
        queryPositions.push(...pos);
      }
    }

    if (queryPositions.length < 2) return 0;

    queryPositions.sort((a, b) => a - b);

    let minDistance = Infinity;
    for (let i = 1; i < queryPositions.length; i++) {
      const dist = queryPositions[i] - queryPositions[i - 1];
      if (dist < minDistance) {
        minDistance = dist;
      }
    }

    return 1 / (1 + minDistance);
  }

  private _calculateFreshness(docId: string): number {
    return Math.random() * 0.3 + 0.7;
  }

  private _tokenize(text: string): string[] {
    const words = text.toLowerCase().match(/[\w']+/g) || [];
    return words.filter(w => !this._stopwords.has(w) && w.length > 1);
  }

  toPacket(): DataPacket<RankingResult> {
    const result = this._lastResult || {
      documents: [],
      algorithm: this._algorithm,
      query: '',
      totalCount: 0,
      processingTime: 0
    };
    this._counter++;
    return {
      id: `ranking-algorithm-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['information-retrieval', 'ranking'],
        priority: 1,
        phase: 'ranking'
      }
    };
  }

  reset(): void {
    this._algorithm = 'bm25';
    this._documents.clear();
    this._termFrequencies.clear();
    this._docFrequencies.clear();
    this._docLengths.clear();
    this._avgDocLength = 0;
    this._totalDocuments = 0;
    this._pageRankScores.clear();
    this._bm25Params = { k1: 1.5, b: 0.75, k3: 1.5, delta: 0.5 };
    this._mlFeatureWeights.clear();
    this._counter = 0;
    this._lastResult = null;
    this._initMLFeatureWeights();
  }
}
