import { DataPacket } from '../shared/types';

export interface SearchQuery {
  rawQuery: string;
  tokens: string[];
  operators: string[];
  queryType: QueryType;
  fields: string[];
  filters: QueryFilter[];
}

export interface QueryFilter {
  field: string;
  operator: string;
  value: string | number | boolean;
}

export type QueryType = 'boolean' | 'vector' | 'phrase' | 'fuzzy' | 'wildcard';

export interface SearchResult {
  docId: string;
  score: number;
  rank: number;
  snippets: string[];
  matchedTerms: string[];
  metadata: Record<string, unknown>;
}

export interface SearchResultPage {
  query: SearchQuery;
  results: SearchResult[];
  totalResults: number;
  page: number;
  pageSize: number;
  totalPages: number;
  processingTime: number;
}

export interface Document {
  id: string;
  content: string;
  title?: string;
  metadata?: Record<string, unknown>;
}

export class SearchEngine {
  private _documents: Map<string, Document> = new Map();
  private _invertedIndex: Map<string, string[]> = new Map();
  private _termFrequencies: Map<string, Map<string, number>> = new Map();
  private _docFrequencies: Map<string, number> = new Map();
  private _docLengths: Map<string, number> = new Map();
  private _avgDocLength: number = 0;
  private _totalDocuments: number = 0;
  private _counter: number = 0;
  private _lastResult: SearchResultPage | null = null;
  private _defaultPageSize: number = 10;
  private _k1: number = 1.5;
  private _b: number = 0.75;
  private _stopwords: Set<string> = new Set();

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

  get documents(): Map<string, Document> {
    return this._documents;
  }

  get invertedIndex(): Map<string, string[]> {
    return this._invertedIndex;
  }

  get totalDocuments(): number {
    return this._totalDocuments;
  }

  get defaultPageSize(): number {
    return this._defaultPageSize;
  }

  get lastResult(): SearchResultPage | null {
    return this._lastResult;
  }

  indexDocuments(documents: Document[]): void {
    this._documents.clear();
    this._invertedIndex.clear();
    this._termFrequencies.clear();
    this._docFrequencies.clear();
    this._docLengths.clear();
    this._totalDocuments = 0;
    let totalLength = 0;

    for (const doc of documents) {
      this._documents.set(doc.id, doc);
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
        if (!this._invertedIndex.has(term)) {
          this._invertedIndex.set(term, []);
        }
        this._invertedIndex.get(term)!.push(doc.id);
        this._docFrequencies.set(term, (this._docFrequencies.get(term) || 0) + 1);
      }
    }

    this._avgDocLength = this._totalDocuments > 0 ? totalLength / this._totalDocuments : 0;
  }

  addDocument(doc: Document): void {
    if (this._documents.has(doc.id)) {
      this.removeDocument(doc.id);
    }

    this._documents.set(doc.id, doc);
    const terms = this._tokenize(doc.content);
    this._docLengths.set(doc.id, terms.length);
    this._totalDocuments++;

    const tfMap = new Map<string, number>();
    const uniqueTerms = new Set<string>();

    for (const term of terms) {
      tfMap.set(term, (tfMap.get(term) || 0) + 1);
      uniqueTerms.add(term);
    }

    this._termFrequencies.set(doc.id, tfMap);

    for (const term of uniqueTerms) {
      if (!this._invertedIndex.has(term)) {
        this._invertedIndex.set(term, []);
      }
      this._invertedIndex.get(term)!.push(doc.id);
      this._docFrequencies.set(term, (this._docFrequencies.get(term) || 0) + 1);
    }

    let totalLength = 0;
    for (const len of this._docLengths.values()) {
      totalLength += len;
    }
    this._avgDocLength = this._totalDocuments > 0 ? totalLength / this._totalDocuments : 0;
  }

  removeDocument(docId: string): void {
    const doc = this._documents.get(docId);
    if (!doc) return;

    this._documents.delete(docId);
    const terms = this._tokenize(doc.content);
    const uniqueTerms = new Set(terms);

    for (const term of uniqueTerms) {
      const postings = this._invertedIndex.get(term);
      if (postings) {
        const filtered = postings.filter(id => id !== docId);
        if (filtered.length === 0) {
          this._invertedIndex.delete(term);
          this._docFrequencies.delete(term);
        } else {
          this._invertedIndex.set(term, filtered);
          this._docFrequencies.set(term, filtered.length);
        }
      }
    }

    this._termFrequencies.delete(docId);
    this._docLengths.delete(docId);
    this._totalDocuments--;

    let totalLength = 0;
    for (const len of this._docLengths.values()) {
      totalLength += len;
    }
    this._avgDocLength = this._totalDocuments > 0 ? totalLength / this._totalDocuments : 0;
  }

  search(query: string, page: number = 1, pageSize?: number): SearchResultPage {
    const startTime = Date.now();
    const actualPageSize = pageSize || this._defaultPageSize;
    const parsedQuery = this.parseQuery(query);

    let results: SearchResult[] = [];

    switch (parsedQuery.queryType) {
      case 'boolean':
        results = this.booleanSearch(parsedQuery);
        break;
      case 'vector':
      default:
        results = this.vectorSpaceSearch(parsedQuery);
        break;
    }

    results.sort((a, b) => b.score - a.score);
    results = results.map((r, i) => ({ ...r, rank: i + 1 }));

    const totalResults = results.length;
    const totalPages = Math.ceil(totalResults / actualPageSize);
    const startIndex = (page - 1) * actualPageSize;
    const paginatedResults = results.slice(startIndex, startIndex + actualPageSize);

    const resultPage: SearchResultPage = {
      query: parsedQuery,
      results: paginatedResults,
      totalResults,
      page,
      pageSize: actualPageSize,
      totalPages,
      processingTime: Date.now() - startTime
    };

    this._lastResult = resultPage;
    return resultPage;
  }

  parseQuery(query: string): SearchQuery {
    const hasBooleanOps = /\b(AND|OR|NOT)\b/.test(query);
    const tokens = this._tokenize(query);
    const operators: string[] = [];

    if (hasBooleanOps) {
      const parts = query.match(/\b(AND|OR|NOT)\b/g);
      if (parts) operators.push(...parts);
    }

    let queryType: QueryType = 'vector';
    if (hasBooleanOps) {
      queryType = 'boolean';
    } else if (query.includes('"')) {
      queryType = 'phrase';
    } else if (query.includes('*') || query.includes('?')) {
      queryType = 'wildcard';
    } else if (query.includes('~')) {
      queryType = 'fuzzy';
    }

    return {
      rawQuery: query,
      tokens,
      operators,
      queryType,
      fields: [],
      filters: []
    };
  }

  booleanSearch(query: SearchQuery): SearchResult[] {
    if (query.operators.length === 0) {
      return this.vectorSpaceSearch(query);
    }

    const parts = query.rawQuery.split(/\s+(AND|OR|NOT)\s+/);
    let resultDocs: Set<string> | null = null;
    let currentOperator = 'OR';

    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed === 'AND' || trimmed === 'OR' || trimmed === 'NOT') {
        currentOperator = trimmed;
        continue;
      }

      const termDocs = this._getDocumentsForTerm(trimmed);

      if (resultDocs === null) {
        if (currentOperator === 'NOT') {
          resultDocs = new Set(this._documents.keys());
          for (const docId of termDocs) {
            resultDocs.delete(docId);
          }
        } else {
          resultDocs = new Set(termDocs);
        }
      } else {
        if (currentOperator === 'AND') {
          const newSet = new Set<string>();
          for (const docId of resultDocs) {
            if (termDocs.includes(docId)) {
              newSet.add(docId);
            }
          }
          resultDocs = newSet;
        } else if (currentOperator === 'OR') {
          for (const docId of termDocs) {
            resultDocs.add(docId);
          }
        } else if (currentOperator === 'NOT') {
          for (const docId of termDocs) {
            resultDocs.delete(docId);
          }
        }
      }
    }

    if (!resultDocs) return [];

    return Array.from(resultDocs).map(docId => ({
      docId,
      score: this._calculateBM25Score(docId, query.tokens),
      rank: 0,
      snippets: this._generateSnippets(docId, query.tokens),
      matchedTerms: query.tokens.filter(t => this._termFrequencies.get(docId)?.has(t)),
      metadata: this._documents.get(docId)?.metadata || {}
    }));
  }

  vectorSpaceSearch(query: SearchQuery): SearchResult[] {
    const queryTerms = query.tokens;
    const candidateDocs = new Set<string>();

    for (const term of queryTerms) {
      const docs = this._invertedIndex.get(term);
      if (docs) {
        for (const docId of docs) {
          candidateDocs.add(docId);
        }
      }
    }

    const results: SearchResult[] = [];
    for (const docId of candidateDocs) {
      const score = this._calculateCosineSimilarity(docId, queryTerms);
      results.push({
        docId,
        score,
        rank: 0,
        snippets: this._generateSnippets(docId, queryTerms),
        matchedTerms: queryTerms.filter(t => this._termFrequencies.get(docId)?.has(t)),
        metadata: this._documents.get(docId)?.metadata || {}
      });
    }

    return results;
  }

  phraseSearch(phrase: string): SearchResult[] {
    const terms = this._tokenize(phrase);
    if (terms.length === 0) return [];

    const firstTermDocs = this._invertedIndex.get(terms[0]);
    if (!firstTermDocs) return [];

    const results: SearchResult[] = [];

    for (const docId of firstTermDocs) {
      const doc = this._documents.get(docId);
      if (!doc) continue;

      const content = doc.content.toLowerCase();
      const phraseLower = phrase.toLowerCase().replace(/["']/g, '');
      const positions: number[] = [];
      let pos = content.indexOf(phraseLower);
      while (pos !== -1) {
        positions.push(pos);
        pos = content.indexOf(phraseLower, pos + 1);
      }

      if (positions.length > 0) {
        results.push({
          docId,
          score: positions.length * 2,
          rank: 0,
          snippets: this._generateSnippets(docId, terms),
          matchedTerms: terms,
          metadata: doc.metadata || {}
        });
      }
    }

    return results;
  }

  fuzzySearch(term: string, maxDistance: number = 2): SearchResult[] {
    const results: SearchResult[] = [];
    const target = term.toLowerCase();

    for (const [indexTerm, docIds] of this._invertedIndex) {
      const distance = this._levenshteinDistance(target, indexTerm);
      if (distance <= maxDistance) {
        const score = 1 - distance / Math.max(target.length, indexTerm.length);
        for (const docId of docIds) {
          const existing = results.find(r => r.docId === docId);
          if (existing) {
            existing.score = Math.max(existing.score, score);
            if (!existing.matchedTerms.includes(indexTerm)) {
              existing.matchedTerms.push(indexTerm);
            }
          } else {
            results.push({
              docId,
              score,
              rank: 0,
              snippets: this._generateSnippets(docId, [indexTerm]),
              matchedTerms: [indexTerm],
              metadata: this._documents.get(docId)?.metadata || {}
            });
          }
        }
      }
    }

    return results;
  }

  wildcardSearch(pattern: string): SearchResult[] {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i');
    const results: SearchResult[] = [];

    for (const [term, docIds] of this._invertedIndex) {
      if (regex.test(term)) {
        for (const docId of docIds) {
          const existing = results.find(r => r.docId === docId);
          if (existing) {
            existing.score += 1;
            if (!existing.matchedTerms.includes(term)) {
              existing.matchedTerms.push(term);
            }
          } else {
            results.push({
              docId,
              score: 1,
              rank: 0,
              snippets: this._generateSnippets(docId, [term]),
              matchedTerms: [term],
              metadata: this._documents.get(docId)?.metadata || {}
            });
          }
        }
      }
    }

    return results;
  }

  private _getDocumentsForTerm(term: string): string[] {
    const normalized = term.toLowerCase().replace(/[.,!?;:'"]/g, '');
    return this._invertedIndex.get(normalized) || [];
  }

  private _calculateBM25Score(docId: string, queryTerms: string[]): number {
    let score = 0;
    const docLength = this._docLengths.get(docId) || 0;

    for (const term of queryTerms) {
      const tf = this._termFrequencies.get(docId)?.get(term) || 0;
      const df = this._docFrequencies.get(term) || 0;
      const idf = Math.log((this._totalDocuments - df + 0.5) / (df + 0.5) + 1);

      const numerator = tf * (this._k1 + 1);
      const denominator = tf + this._k1 * (1 - this._b + this._b * (docLength / this._avgDocLength));

      score += idf * (numerator / denominator);
    }

    return score;
  }

  private _calculateCosineSimilarity(docId: string, queryTerms: string[]): number {
    const tfMap = this._termFrequencies.get(docId);
    if (!tfMap) return 0;

    const queryTf = new Map<string, number>();
    for (const term of queryTerms) {
      queryTf.set(term, (queryTf.get(term) || 0) + 1);
    }

    let dotProduct = 0;
    let docNorm = 0;
    let queryNorm = 0;

    for (const [term, qtf] of queryTf) {
      const dtf = tfMap.get(term) || 0;
      const df = this._docFrequencies.get(term) || 0;
      const idf = Math.log((this._totalDocuments + 1) / (df + 1)) + 1;

      const qWeight = qtf * idf;
      const dWeight = dtf * idf;

      dotProduct += qWeight * dWeight;
      queryNorm += qWeight * qWeight;
    }

    for (const [, tf] of tfMap) {
      docNorm += tf * tf;
    }

    const denominator = Math.sqrt(queryNorm) * Math.sqrt(docNorm);
    return denominator > 0 ? dotProduct / denominator : 0;
  }

  private _generateSnippets(docId: string, terms: string[], snippetCount: number = 3): string[] {
    const doc = this._documents.get(docId);
    if (!doc) return [];

    const content = doc.content;
    const sentences = content.split(/(?<=[.!?])\s+/);
    const snippets: string[] = [];
    const scoredSentences: { sentence: string; score: number }[] = [];

    for (const sentence of sentences) {
      let score = 0;
      const lowerSentence = sentence.toLowerCase();
      for (const term of terms) {
        const regex = new RegExp(term, 'gi');
        const matches = lowerSentence.match(regex);
        if (matches) {
          score += matches.length;
        }
      }
      if (score > 0) {
        scoredSentences.push({ sentence, score });
      }
    }

    scoredSentences.sort((a, b) => b.score - a.score);

    for (let i = 0; i < Math.min(snippetCount, scoredSentences.length); i++) {
      let snippet = scoredSentences[i].sentence;
      if (snippet.length > 200) {
        snippet = snippet.substring(0, 197) + '...';
      }
      snippets.push(snippet);
    }

    return snippets;
  }

  private _levenshteinDistance(s: string, t: string): number {
    const m = s.length;
    const n = t.length;
    const dp: number[][] = [];

    for (let i = 0; i <= m; i++) {
      dp[i] = [i];
    }
    for (let j = 0; j <= n; j++) {
      dp[0][j] = j;
    }

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (s[i - 1] === t[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,
            dp[i][j - 1] + 1,
            dp[i - 1][j - 1] + 1
          );
        }
      }
    }

    return dp[m][n];
  }

  private _tokenize(text: string): string[] {
    const words = text.toLowerCase().match(/[\w']+/g) || [];
    return words.filter(w => !this._stopwords.has(w) && w.length > 1);
  }

  toPacket(): DataPacket<SearchResultPage> {
    const result = this._lastResult || {
      query: {
        rawQuery: '',
        tokens: [],
        operators: [],
        queryType: 'vector' as QueryType,
        fields: [],
        filters: []
      },
      results: [],
      totalResults: 0,
      page: 1,
      pageSize: this._defaultPageSize,
      totalPages: 0,
      processingTime: 0
    };
    this._counter++;
    return {
      id: `search-engine-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['information-retrieval', 'search-engine'],
        priority: 1,
        phase: 'search'
      }
    };
  }

  reset(): void {
    this._documents.clear();
    this._invertedIndex.clear();
    this._termFrequencies.clear();
    this._docFrequencies.clear();
    this._docLengths.clear();
    this._avgDocLength = 0;
    this._totalDocuments = 0;
    this._counter = 0;
    this._lastResult = null;
    this._defaultPageSize = 10;
    this._k1 = 1.5;
    this._b = 0.75;
  }
}
