import { DataPacket } from '../shared/types';

export interface Posting {
  term: string;
  docId: string;
  positions: number[];
  tf: number;
  weight?: number;
}

export interface DictionaryEntry {
  term: string;
  df: number;
  cf: number;
  idf: number;
  postingOffset: number;
  postingLength: number;
}

export interface TextIndexResult {
  invertedIndex: Map<string, Posting[]>;
  forwardIndex: Map<string, string[]>;
  dictionary: Map<string, DictionaryEntry>;
  documentCount: number;
  termCount: number;
  indexType: string;
}

export interface IndexStatistics {
  totalDocuments: number;
  totalTerms: number;
  totalPostings: number;
  averageDocLength: number;
  vocabularySize: number;
}

export class TextIndexing {
  private _invertedIndex: Map<string, Posting[]> = new Map();
  private _forwardIndex: Map<string, string[]> = new Map();
  private _dictionary: Map<string, DictionaryEntry> = new Map();
  private _docLengths: Map<string, number> = new Map();
  private _totalDocumentCount: number = 0;
  private _totalTermCount: number = 0;
  private _counter: number = 0;
  private _lastResult: TextIndexResult | null = null;
  private _indexType: string = 'inverted';
  private _stopwords: Set<string> = new Set();
  private _stemmingEnabled: boolean = true;
  private _lowercasing: boolean = true;

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

  get invertedIndex(): Map<string, Posting[]> {
    return this._invertedIndex;
  }

  get forwardIndex(): Map<string, string[]> {
    return this._forwardIndex;
  }

  get dictionary(): Map<string, DictionaryEntry> {
    return this._dictionary;
  }

  get documentCount(): number {
    return this._totalDocumentCount;
  }

  get termCount(): number {
    return this._totalTermCount;
  }

  get indexType(): string {
    return this._indexType;
  }

  get stopwords(): Set<string> {
    return this._stopwords;
  }

  buildInvertedIndex(documents: { id: string; content: string }[]): TextIndexResult {
    this._invertedIndex.clear();
    this._forwardIndex.clear();
    this._dictionary.clear();
    this._docLengths.clear();
    this._totalDocumentCount = documents.length;
    this._totalTermCount = 0;

    const termStats = new Map<string, { df: number; cf: number }>();

    for (const doc of documents) {
      const terms = this._tokenize(doc.content);
      this._forwardIndex.set(doc.id, terms);
      this._docLengths.set(doc.id, terms.length);
      this._totalTermCount += terms.length;

      const termPositions = new Map<string, number[]>();
      for (let i = 0; i < terms.length; i++) {
        const term = terms[i];
        if (!termPositions.has(term)) {
          termPositions.set(term, []);
        }
        termPositions.get(term)!.push(i);
      }

      for (const [term, positions] of termPositions) {
        if (!this._invertedIndex.has(term)) {
          this._invertedIndex.set(term, []);
        }
        this._invertedIndex.get(term)!.push({
          term,
          docId: doc.id,
          positions,
          tf: positions.length
        });

        if (!termStats.has(term)) {
          termStats.set(term, { df: 0, cf: 0 });
        }
        const stats = termStats.get(term)!;
        stats.df++;
        stats.cf += positions.length;
      }
    }

    for (const [term, stats] of termStats) {
      const idf = Math.log((this._totalDocumentCount + 1) / (stats.df + 1)) + 1;
      this._dictionary.set(term, {
        term,
        df: stats.df,
        cf: stats.cf,
        idf,
        postingOffset: 0,
        postingLength: stats.df
      });
    }

    this._indexType = 'inverted';
    const result: TextIndexResult = {
      invertedIndex: new Map(this._invertedIndex),
      forwardIndex: new Map(this._forwardIndex),
      dictionary: new Map(this._dictionary),
      documentCount: this._totalDocumentCount,
      termCount: this._totalTermCount,
      indexType: this._indexType
    };
    this._lastResult = result;
    return result;
  }

  buildForwardIndex(documents: { id: string; content: string }[]): TextIndexResult {
    this._forwardIndex.clear();
    this._totalDocumentCount = documents.length;
    this._totalTermCount = 0;

    for (const doc of documents) {
      const terms = this._tokenize(doc.content);
      this._forwardIndex.set(doc.id, terms);
      this._totalTermCount += terms.length;
    }

    this._indexType = 'forward';
    const result: TextIndexResult = {
      invertedIndex: new Map(),
      forwardIndex: new Map(this._forwardIndex),
      dictionary: new Map(),
      documentCount: this._totalDocumentCount,
      termCount: this._totalTermCount,
      indexType: this._indexType
    };
    this._lastResult = result;
    return result;
  }

  buildPositionalIndex(documents: { id: string; content: string }[]): TextIndexResult {
    return this.buildInvertedIndex(documents);
  }

  buildNGramIndex(documents: { id: string; content: string }[], n: number = 3): TextIndexResult {
    this._invertedIndex.clear();
    this._totalDocumentCount = documents.length;
    this._totalTermCount = 0;

    const termStats = new Map<string, { df: number; cf: number }>();

    for (const doc of documents) {
      const text = doc.content.toLowerCase();
      const grams: string[] = [];
      const gramPositions = new Map<string, number[]>();

      for (let i = 0; i <= text.length - n; i++) {
        const gram = text.substring(i, i + n);
        grams.push(gram);
        if (!gramPositions.has(gram)) {
          gramPositions.set(gram, []);
        }
        gramPositions.get(gram)!.push(i);
      }

      this._totalTermCount += grams.length;

      for (const [gram, positions] of gramPositions) {
        if (!this._invertedIndex.has(gram)) {
          this._invertedIndex.set(gram, []);
        }
        this._invertedIndex.get(gram)!.push({
          term: gram,
          docId: doc.id,
          positions,
          tf: positions.length
        });

        if (!termStats.has(gram)) {
          termStats.set(gram, { df: 0, cf: 0 });
        }
        const stats = termStats.get(gram)!;
        stats.df++;
        stats.cf += positions.length;
      }
    }

    for (const [term, stats] of termStats) {
      const idf = Math.log((this._totalDocumentCount + 1) / (stats.df + 1)) + 1;
      this._dictionary.set(term, {
        term,
        df: stats.df,
        cf: stats.cf,
        idf,
        postingOffset: 0,
        postingLength: stats.df
      });
    }

    this._indexType = 'ngram';
    const result: TextIndexResult = {
      invertedIndex: new Map(this._invertedIndex),
      forwardIndex: new Map(),
      dictionary: new Map(this._dictionary),
      documentCount: this._totalDocumentCount,
      termCount: this._totalTermCount,
      indexType: this._indexType
    };
    this._lastResult = result;
    return result;
  }

  addDocument(doc: { id: string; content: string }): void {
    const terms = this._tokenize(doc.content);
    this._forwardIndex.set(doc.id, terms);
    this._docLengths.set(doc.id, terms.length);
    this._totalDocumentCount++;
    this._totalTermCount += terms.length;

    const termPositions = new Map<string, number[]>();
    for (let i = 0; i < terms.length; i++) {
      const term = terms[i];
      if (!termPositions.has(term)) {
        termPositions.set(term, []);
      }
      termPositions.get(term)!.push(i);
    }

    for (const [term, positions] of termPositions) {
      if (!this._invertedIndex.has(term)) {
        this._invertedIndex.set(term, []);
      }
      const postings = this._invertedIndex.get(term)!;
      const existing = postings.find(p => p.docId === doc.id);
      if (existing) {
        existing.positions = positions;
        existing.tf = positions.length;
      } else {
        postings.push({
          term,
          docId: doc.id,
          positions,
          tf: positions.length
        });
      }

      const dictEntry = this._dictionary.get(term);
      if (dictEntry) {
        dictEntry.df++;
        dictEntry.cf += positions.length;
        dictEntry.idf = Math.log((this._totalDocumentCount + 1) / (dictEntry.df + 1)) + 1;
        dictEntry.postingLength = dictEntry.df;
      } else {
        this._dictionary.set(term, {
          term,
          df: 1,
          cf: positions.length,
          idf: Math.log((this._totalDocumentCount + 1) / 2) + 1,
          postingOffset: 0,
          postingLength: 1
        });
      }
    }
  }

  removeDocument(docId: string): void {
    const terms = this._forwardIndex.get(docId);
    if (!terms) return;

    this._forwardIndex.delete(docId);
    const docLength = this._docLengths.get(docId) || 0;
    this._docLengths.delete(docId);
    this._totalDocumentCount--;
    this._totalTermCount -= docLength;

    const uniqueTerms = new Set(terms);
    const termsToRemove: string[] = [];

    for (const term of uniqueTerms) {
      const postings = this._invertedIndex.get(term);
      if (!postings) continue;

      const filtered = postings.filter(p => p.docId !== docId);
      if (filtered.length === 0) {
        this._invertedIndex.delete(term);
        termsToRemove.push(term);
      } else {
        this._invertedIndex.set(term, filtered);
        const dictEntry = this._dictionary.get(term);
        if (dictEntry) {
          const removedPosting = postings.find(p => p.docId === docId);
          dictEntry.df--;
          dictEntry.cf -= removedPosting ? removedPosting.tf : 0;
          dictEntry.idf = Math.log((this._totalDocumentCount + 1) / (dictEntry.df + 1)) + 1;
          dictEntry.postingLength = dictEntry.df;
        }
      }
    }

    for (const term of termsToRemove) {
      this._dictionary.delete(term);
    }
  }

  getPostingList(term: string): Posting[] {
    return this._invertedIndex.get(term.toLowerCase()) || [];
  }

  getDocumentFrequency(term: string): number {
    const entry = this._dictionary.get(term.toLowerCase());
    return entry ? entry.df : 0;
  }

  getCollectionFrequency(term: string): number {
    const entry = this._dictionary.get(term.toLowerCase());
    return entry ? entry.cf : 0;
  }

  getIDF(term: string): number {
    const entry = this._dictionary.get(term.toLowerCase());
    return entry ? entry.idf : 0;
  }

  getDocumentLength(docId: string): number {
    return this._docLengths.get(docId) || 0;
  }

  getStatistics(): IndexStatistics {
    let totalPostings = 0;
    for (const postings of this._invertedIndex.values()) {
      totalPostings += postings.length;
    }
    const avgDocLength = this._totalDocumentCount > 0
      ? this._totalTermCount / this._totalDocumentCount
      : 0;

    return {
      totalDocuments: this._totalDocumentCount,
      totalTerms: this._totalTermCount,
      totalPostings,
      averageDocLength: avgDocLength,
      vocabularySize: this._dictionary.size
    };
  }

  mergeIndexes(indexes: TextIndexResult[]): TextIndexResult {
    this._invertedIndex.clear();
    this._forwardIndex.clear();
    this._dictionary.clear();
    this._docLengths.clear();
    this._totalDocumentCount = 0;
    this._totalTermCount = 0;

    const termStats = new Map<string, { df: number; cf: number }>();

    for (const index of indexes) {
      for (const [docId, terms] of index.forwardIndex) {
        this._forwardIndex.set(docId, terms);
        this._docLengths.set(docId, terms.length);
        this._totalDocumentCount++;
        this._totalTermCount += terms.length;
      }

      for (const [term, postings] of index.invertedIndex) {
        if (!this._invertedIndex.has(term)) {
          this._invertedIndex.set(term, []);
        }
        this._invertedIndex.get(term)!.push(...postings);

        if (!termStats.has(term)) {
          termStats.set(term, { df: 0, cf: 0 });
        }
        const stats = termStats.get(term)!;
        for (const posting of postings) {
          stats.df++;
          stats.cf += posting.tf;
        }
      }
    }

    for (const [term, stats] of termStats) {
      const idf = Math.log((this._totalDocumentCount + 1) / (stats.df + 1)) + 1;
      this._dictionary.set(term, {
        term,
        df: stats.df,
        cf: stats.cf,
        idf,
        postingOffset: 0,
        postingLength: stats.df
      });
    }

    const result: TextIndexResult = {
      invertedIndex: new Map(this._invertedIndex),
      forwardIndex: new Map(this._forwardIndex),
      dictionary: new Map(this._dictionary),
      documentCount: this._totalDocumentCount,
      termCount: this._totalTermCount,
      indexType: 'merged'
    };
    this._lastResult = result;
    return result;
  }

  private _tokenize(text: string): string[] {
    let processed = text;
    if (this._lowercasing) {
      processed = processed.toLowerCase();
    }
    const words = processed.match(/[\w']+/g) || [];
    const filtered = words.filter(w => !this._stopwords.has(w));
    if (this._stemmingEnabled) {
      return filtered.map(w => this._stem(w));
    }
    return filtered;
  }

  private _stem(word: string): string {
    let stemmed = word.toLowerCase();
    if (stemmed.endsWith('ational') && stemmed.length > 7) {
      stemmed = stemmed.slice(0, -5) + 'e';
    } else if (stemmed.endsWith('ization') && stemmed.length > 7) {
      stemmed = stemmed.slice(0, -5) + 'e';
    } else if (stemmed.endsWith('tional') && stemmed.length > 6) {
      stemmed = stemmed.slice(0, -2);
    } else if (stemmed.endsWith('less') && stemmed.length > 5) {
      stemmed = stemmed.slice(0, -4);
    } else if (stemmed.endsWith('ful') && stemmed.length > 4) {
      stemmed = stemmed.slice(0, -3);
    } else if (stemmed.endsWith('ly') && stemmed.length > 3) {
      stemmed = stemmed.slice(0, -2);
    } else if (stemmed.endsWith('ment') && stemmed.length > 5) {
      stemmed = stemmed.slice(0, -4);
    } else if (stemmed.endsWith('ness') && stemmed.length > 5) {
      stemmed = stemmed.slice(0, -4);
    } else if (stemmed.endsWith('able') && stemmed.length > 5) {
      stemmed = stemmed.slice(0, -3) + 'e';
    } else if (stemmed.endsWith('ible') && stemmed.length > 5) {
      stemmed = stemmed.slice(0, -3) + 'e';
    } else if (stemmed.endsWith('ing') && stemmed.length > 5) {
      stemmed = stemmed.slice(0, -3);
    } else if (stemmed.endsWith('ed') && stemmed.length > 4) {
      stemmed = stemmed.slice(0, -2);
    } else if (stemmed.endsWith('es') && stemmed.length > 4) {
      stemmed = stemmed.slice(0, -2);
    } else if (stemmed.endsWith('s') && stemmed.length > 3 && !stemmed.endsWith('ss')) {
      stemmed = stemmed.slice(0, -1);
    }
    return stemmed;
  }

  toPacket(): DataPacket<TextIndexResult> {
    const result = this._lastResult || {
      invertedIndex: new Map(),
      forwardIndex: new Map(),
      dictionary: new Map(),
      documentCount: 0,
      termCount: 0,
      indexType: this._indexType
    };
    this._counter++;
    return {
      id: `text-indexing-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['information-retrieval', 'text-indexing'],
        priority: 1,
        phase: 'indexing'
      }
    };
  }

  reset(): void {
    this._invertedIndex.clear();
    this._forwardIndex.clear();
    this._dictionary.clear();
    this._docLengths.clear();
    this._totalDocumentCount = 0;
    this._totalTermCount = 0;
    this._counter = 0;
    this._lastResult = null;
    this._indexType = 'inverted';
    this._stemmingEnabled = true;
    this._lowercasing = true;
  }
}
