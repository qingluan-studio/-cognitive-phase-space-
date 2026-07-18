import { DataPacket, KnowledgeUnit, Signal } from '../shared/types';

export interface CorpusDocument {
  id: string;
  title: string;
  content: string;
  source: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  vector: number[];
  wordCount: number;
  category: string;
}

export interface SearchResult {
  documentId: string;
  relevance: number;
  score: number;
  matchedTerms: string[];
  snippet: string;
}

export interface CorpusStats {
  totalDocuments: number;
  totalWords: number;
  uniqueTerms: number;
  avgDocLength: number;
  categoryDistribution: Record<string, number>;
}

export interface Association {
  termA: string;
  termB: string;
  strength: number;
  coOccurrenceCount: number;
  mutualInformation: number;
}

export class CorpusEngine {
  private _documents: Map<string, CorpusDocument>;
  private _invertedIndex: Map<string, { docIds: Set<string>; positions: Map<string, number[]> }>;
  private _termFrequency: Map<string, number>;
  private _associations: Map<string, Association[]>;
  private _stats: CorpusStats;
  private _history: { action: string; docId: string; timestamp: number }[];
  private _vectorDim: number;

  constructor(vectorDim: number = 64) {
    this._documents = new Map();
    this._invertedIndex = new Map();
    this._termFrequency = new Map();
    this._associations = new Map();
    this._vectorDim = vectorDim;
    this._stats = {
      totalDocuments: 0,
      totalWords: 0,
      uniqueTerms: 0,
      avgDocLength: 0,
      categoryDistribution: {}
    };
    this._history = [];
    this._initializeSampleCorpus();
  }

  get documentCount(): number { return this._documents.size; }
  get stats(): CorpusStats { return { ...this._stats, categoryDistribution: { ...this._stats.categoryDistribution } }; }
  get vectorDim(): number { return this._vectorDim; }

  private _initializeSampleCorpus(): void {
    const samples: Array<Omit<CorpusDocument, 'vector' | 'wordCount'>> = [
      {
        id: 'doc.001',
        title: 'Introduction to Cognitive Science',
        content: 'Cognitive science is the interdisciplinary study of the mind and its processes. It examines the nature, the tasks, and the functions of cognition.',
        source: 'textbook',
        tags: ['cognition', 'science', 'introduction'],
        createdAt: Date.now() - 86400000 * 100,
        updatedAt: Date.now() - 86400000 * 50,
        category: 'science'
      },
      {
        id: 'doc.002',
        title: 'Neural Networks Deep Dive',
        content: 'Neural networks are computing systems inspired by the biological neural networks that constitute animal brains. They learn to perform tasks by considering examples.',
        source: 'research',
        tags: ['neural', 'machine-learning', 'deep-learning'],
        createdAt: Date.now() - 86400000 * 80,
        updatedAt: Date.now() - 86400000 * 20,
        category: 'technology'
      },
      {
        id: 'doc.003',
        title: 'The Philosophy of Mind',
        content: 'Philosophy of mind is a branch of philosophy that studies the ontology and nature of the mind and its relationship with the body.',
        source: 'philosophy',
        tags: ['philosophy', 'mind', 'consciousness'],
        createdAt: Date.now() - 86400000 * 120,
        updatedAt: Date.now() - 86400000 * 60,
        category: 'philosophy'
      },
      {
        id: 'doc.004',
        title: 'Information Theory Foundations',
        content: 'Information theory is the scientific study of the quantification, storage, and communication of information. It was originally established by Claude Shannon.',
        source: 'textbook',
        tags: ['information', 'theory', 'communication'],
        createdAt: Date.now() - 86400000 * 90,
        updatedAt: Date.now() - 86400000 * 30,
        category: 'mathematics'
      },
      {
        id: 'doc.005',
        title: 'Evolutionary Biology Concepts',
        content: 'Evolutionary biology is the subfield of biology that studies the evolutionary processes that produced the diversity of life on Earth.',
        source: 'biology',
        tags: ['evolution', 'biology', 'diversity'],
        createdAt: Date.now() - 86400000 * 110,
        updatedAt: Date.now() - 86400000 * 40,
        category: 'science'
      },
      {
        id: 'doc.006',
        title: 'Language and Cognition',
        content: 'Language and cognition explores how language shapes thought and how thought influences language. It bridges linguistics and psychology.',
        source: 'research',
        tags: ['language', 'cognition', 'linguistics'],
        createdAt: Date.now() - 86400000 * 70,
        updatedAt: Date.now() - 86400000 * 10,
        category: 'science'
      }
    ];

    for (const sample of samples) {
      const wordCount = sample.content.split(/\s+/).length;
      const vector = this._textToVector(sample.title + ' ' + sample.content);
      this._documents.set(sample.id, { ...sample, vector, wordCount });
      this._indexDocument(sample.id, sample.content);
    }

    this._updateStats();
  }

  private _textToVector(text: string): number[] {
    const vector = new Array(this._vectorDim).fill(0);
    const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 0);
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      let hash = 0;
      for (let j = 0; j < word.length; j++) {
        hash = ((hash << 5) - hash) + word.charCodeAt(j);
        hash |= 0;
      }
      const idx = Math.abs(hash) % this._vectorDim;
      vector[idx] += 1;
      if (i > 0) {
        const prevWord = words[i - 1];
        let bigramHash = 0;
        const bigram = prevWord + '_' + word;
        for (let j = 0; j < bigram.length; j++) {
          bigramHash = ((bigramHash << 5) - bigramHash) + bigram.charCodeAt(j);
          bigramHash |= 0;
        }
        const bigramIdx = Math.abs(bigramHash) % this._vectorDim;
        vector[bigramIdx] += 0.5;
      }
    }

    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    if (norm > 0) {
      return vector.map(v => v / norm);
    }
    return vector;
  }

  private _tokenize(text: string): string[] {
    return text.toLowerCase().split(/\W+/).filter(w => w.length > 1);
  }

  private _indexDocument(docId: string, content: string): void {
    const tokens = this._tokenize(content);
    const positions = new Map<string, number[]>();

    for (let i = 0; i < tokens.length; i++) {
      const term = tokens[i];
      
      if (!this._invertedIndex.has(term)) {
        this._invertedIndex.set(term, { docIds: new Set(), positions: new Map() });
      }
      const entry = this._invertedIndex.get(term)!;
      entry.docIds.add(docId);
      
      if (!entry.positions.has(docId)) {
        entry.positions.set(docId, []);
      }
      entry.positions.get(docId)!.push(i);

      this._termFrequency.set(term, (this._termFrequency.get(term) || 0) + 1);
    }
  }

  private _updateStats(): void {
    const docs = Array.from(this._documents.values());
    this._stats.totalDocuments = docs.length;
    this._stats.totalWords = docs.reduce((sum, d) => sum + d.wordCount, 0);
    this._stats.uniqueTerms = this._invertedIndex.size;
    this._stats.avgDocLength = docs.length > 0 ? this._stats.totalWords / docs.length : 0;
    
    this._stats.categoryDistribution = {};
    for (const doc of docs) {
      this._stats.categoryDistribution[doc.category] = (this._stats.categoryDistribution[doc.category] || 0) + 1;
    }
  }

  public addDocument(doc: Omit<CorpusDocument, 'vector' | 'wordCount'>): CorpusDocument {
    const wordCount = doc.content.split(/\s+/).length;
    const vector = this._textToVector(doc.title + ' ' + doc.content);
    const fullDoc: CorpusDocument = { ...doc, vector, wordCount };
    
    this._documents.set(doc.id, fullDoc);
    this._indexDocument(doc.id, doc.content);
    this._updateStats();
    this._computeAssociationsForDoc(doc.id);
    this._history.push({ action: 'add', docId: doc.id, timestamp: Date.now() });
    
    return fullDoc;
  }

  public removeDocument(docId: string): boolean {
    const doc = this._documents.get(docId);
    if (!doc) return false;

    const tokens = this._tokenize(doc.content);
    for (const term of new Set(tokens)) {
      const entry = this._invertedIndex.get(term);
      if (entry) {
        entry.docIds.delete(docId);
        entry.positions.delete(docId);
        if (entry.docIds.size === 0) {
          this._invertedIndex.delete(term);
        }
      }
      const freq = this._termFrequency.get(term) || 0;
      const termCount = tokens.filter(t => t === term).length;
      if (freq <= termCount) {
        this._termFrequency.delete(term);
      } else {
        this._termFrequency.set(term, freq - termCount);
      }
    }

    this._documents.delete(docId);
    this._updateStats();
    this._associations.delete(docId);
    this._history.push({ action: 'remove', docId, timestamp: Date.now() });
    return true;
  }

  public getDocument(docId: string): CorpusDocument | undefined {
    return this._documents.get(docId);
  }

  public search(query: string, limit: number = 10): SearchResult[] {
    const queryTokens = this._tokenize(query);
    if (queryTokens.length === 0) return [];

    const queryVector = this._textToVector(query);
    const docScores = new Map<string, { score: number; matchedTerms: Set<string> }>();

    for (const term of queryTokens) {
      const entry = this._invertedIndex.get(term);
      if (!entry) continue;
      
      for (const docId of entry.docIds) {
        if (!docScores.has(docId)) {
          docScores.set(docId, { score: 0, matchedTerms: new Set() });
        }
        const docEntry = docScores.get(docId)!;
        docEntry.matchedTerms.add(term);
        
        const tf = (entry.positions.get(docId)?.length || 0) / (this._documents.get(docId)?.wordCount || 1);
        const idf = Math.log((this._documents.size + 1) / (entry.docIds.size + 1));
        docEntry.score += tf * idf;
      }
    }

    const results: SearchResult[] = [];
    for (const [docId, data] of docScores) {
      const doc = this._documents.get(docId)!;
      const vectorSim = this._cosineSimilarity(queryVector, doc.vector);
      const combinedScore = data.score * 0.6 + vectorSim * 0.4;
      
      const snippet = this._generateSnippet(doc.content, Array.from(data.matchedTerms));
      
      results.push({
        documentId: docId,
        relevance: combinedScore,
        score: combinedScore,
        matchedTerms: Array.from(data.matchedTerms),
        snippet
      });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  private _cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom > 0 ? dot / denom : 0;
  }

  private _generateSnippet(content: string, terms: string[]): string {
    const lowerContent = content.toLowerCase();
    let bestPos = 0;
    let bestCount = 0;
    const window = 100;

    for (let i = 0; i < content.length - window; i++) {
      const windowText = lowerContent.slice(i, i + window);
      let count = 0;
      for (const term of terms) {
        if (windowText.includes(term)) count++;
      }
      if (count > bestCount) {
        bestCount = count;
        bestPos = i;
      }
    }

    const snippet = content.slice(Math.max(0, bestPos - 20), Math.min(content.length, bestPos + window + 20));
    return (bestPos > 20 ? '...' : '') + snippet.trim() + (bestPos + window < content.length - 20 ? '...' : '');
  }

  public findRelated(docId: string, limit: number = 5): SearchResult[] {
    const source = this._documents.get(docId);
    if (!source) return [];

    const results: SearchResult[] = [];
    for (const [id, doc] of this._documents) {
      if (id === docId) continue;
      const similarity = this._cosineSimilarity(source.vector, doc.vector);
      if (similarity > 0.1) {
        results.push({
          documentId: id,
          relevance: similarity,
          score: similarity,
          matchedTerms: [],
          snippet: doc.content.slice(0, 100) + '...'
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  public getDocumentsByCategory(category: string): CorpusDocument[] {
    return Array.from(this._documents.values()).filter(d => d.category === category);
  }

  public getDocumentsByTag(tag: string): CorpusDocument[] {
    return Array.from(this._documents.values()).filter(d => d.tags.includes(tag));
  }

  public getTopTerms(count: number = 20): { term: string; frequency: number }[] {
    const terms = Array.from(this._termFrequency.entries())
      .map(([term, frequency]) => ({ term, frequency }))
      .sort((a, b) => b.frequency - a.frequency);
    return terms.slice(0, count);
  }

  private _computeAssociationsForDoc(docId: string): void {
    const doc = this._documents.get(docId);
    if (!doc) return;

    const tokens = this._tokenize(doc.content);
    const uniqueTerms = Array.from(new Set(tokens));
    
    for (let i = 0; i < uniqueTerms.length; i++) {
      for (let j = i + 1; j < uniqueTerms.length; j++) {
        const termA = uniqueTerms[i];
        const termB = uniqueTerms[j];
        const key = [termA, termB].sort().join('|');
        
        if (!this._associations.has(termA)) {
          this._associations.set(termA, []);
        }
        if (!this._associations.has(termB)) {
          this._associations.set(termB, []);
        }
      }
    }
  }

  public getAssociations(term: string, limit: number = 10): Association[] {
    const termEntry = this._invertedIndex.get(term.toLowerCase());
    if (!termEntry) return [];

    const associations: Association[] = [];
    const termDocs = termEntry.docIds;

    for (const [otherTerm, otherEntry] of this._invertedIndex) {
      if (otherTerm === term.toLowerCase()) continue;
      
      let coOccurrence = 0;
      for (const docId of termDocs) {
        if (otherEntry.docIds.has(docId)) coOccurrence++;
      }

      if (coOccurrence > 0) {
        const pA = termDocs.size / this._documents.size;
        const pB = otherEntry.docIds.size / this._documents.size;
        const pAB = coOccurrence / this._documents.size;
        const mi = pAB > 0 && pA > 0 && pB > 0 ? Math.log2(pAB / (pA * pB)) : 0;
        
        associations.push({
          termA: term.toLowerCase(),
          termB: otherTerm,
          strength: coOccurrence / Math.min(termDocs.size, otherEntry.docIds.size),
          coOccurrenceCount: coOccurrence,
          mutualInformation: mi
        });
      }
    }

    associations.sort((a, b) => b.mutualInformation - a.mutualInformation);
    return associations.slice(0, limit);
  }

  public toSignal(docId: string): Signal | null {
    const doc = this._documents.get(docId);
    if (!doc) return null;

    return {
      source: `corpus_${docId}`,
      magnitude: doc.wordCount / 1000,
      entropy: this._calculateEntropy(doc.content),
      timestamp: doc.updatedAt
    };
  }

  private _calculateEntropy(text: string): number {
    const freq: Record<string, number> = {};
    const chars = text.split('');
    for (const c of chars) {
      freq[c] = (freq[c] || 0) + 1;
    }
    let entropy = 0;
    for (const count of Object.values(freq)) {
      const p = count / chars.length;
      entropy -= p * Math.log2(p);
    }
    return entropy / 8;
  }

  public exportCorpusPacket(): DataPacket<CorpusStats> {
    return {
      id: `corpus_packet_${Date.now()}`,
      payload: this.stats,
      metadata: {
        createdAt: Date.now(),
        route: ['corpus', 'corpus_engine'],
        priority: 2,
        phase: 'indexing'
      }
    };
  }

  public extractKnowledgeUnit(docId: string): KnowledgeUnit | null {
    const doc = this._documents.get(docId);
    if (!doc) return null;

    return {
      id: `corpus_knowledge_${docId}`,
      content: doc.title + ': ' + doc.content.slice(0, 200),
      vector: doc.vector.slice(0, 16),
      lineage: ['corpus_engine', doc.category]
    };
  }

  public reset(): void {
    this._documents.clear();
    this._invertedIndex.clear();
    this._termFrequency.clear();
    this._associations.clear();
    this._history = [];
    this._stats = {
      totalDocuments: 0,
      totalWords: 0,
      uniqueTerms: 0,
      avgDocLength: 0,
      categoryDistribution: {}
    };
    this._initializeSampleCorpus();
  }

  public exportDocuments(): CorpusDocument[] {
    return Array.from(this._documents.values()).map(d => ({
      ...d,
      tags: [...d.tags],
      vector: [...d.vector]
    }));
  }
}
