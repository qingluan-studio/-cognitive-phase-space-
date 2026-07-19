import { DataPacket } from '../shared/types';

export interface Document {
  id: string;
  content: string;
  title?: string;
  metadata?: Record<string, unknown>;
  category?: string;
  cluster?: number;
  fingerprint?: string;
}

export interface ClassificationResult {
  documentId: string;
  category: string;
  confidence: number;
  categoryScores: Map<string, number>;
}

export interface ClusteringResult {
  clusters: Map<number, Document[]>;
  centroids: Map<number, number[]>;
  documentClusters: Map<string, number>;
  silhouetteScores: Map<string, number>;
  k: number;
}

export interface DedupResult {
  uniqueDocuments: Document[];
  duplicateGroups: Document[][];
  removedCount: number;
  similarityThreshold: number;
}

export interface FilterCriteria {
  minLength?: number;
  maxLength?: number;
  requiredTerms?: string[];
  excludedTerms?: string[];
  categories?: string[];
  dateRange?: { start: number; end: number };
  customFilter?: (doc: Document) => boolean;
}

export class DocumentFilter {
  private _documents: Document[] = [];
  private _classifiedDocuments: ClassificationResult[] = [];
  private _clusteringResult: ClusteringResult | null = null;
  private _dedupResult: DedupResult | null = null;
  private _categoryKeywords: Map<string, string[]> = new Map();
  private _stopwords: Set<string> = new Set();
  private _counter: number = 0;
  private _lastResult: ClassificationResult[] | ClusteringResult | DedupResult | null = null;
  private _defaultSimilarityThreshold: number = 0.85;

  constructor() {
    this._initDefaultStopwords();
    this._initCategoryKeywords();
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

  private _initCategoryKeywords(): void {
    const categories: [string, string[]][] = [
      ['technology', ['computer', 'software', 'hardware', 'programming', 'code', 'developer', 'technology', 'internet', 'web', 'digital', 'algorithm', 'data', 'network', 'system', 'application']],
      ['business', ['business', 'company', 'market', 'finance', 'investment', 'revenue', 'profit', 'startup', 'entrepreneur', 'strategy', 'management', 'economic', 'industry', 'corporate', 'trade']],
      ['education', ['learn', 'education', 'school', 'university', 'course', 'study', 'teaching', 'knowledge', 'training', 'academic', 'student', 'research', 'science', 'professor', 'college']],
      ['health', ['health', 'medical', 'doctor', 'disease', 'treatment', 'medicine', 'fitness', 'nutrition', 'wellness', 'patient', 'hospital', 'therapy', 'diagnosis', 'symptom', 'pharmacy']],
      ['entertainment', ['movie', 'music', 'game', 'sports', 'celebrity', 'film', 'concert', 'festival', 'art', 'culture', 'entertainment', 'show', 'theater', 'dance', 'fun']],
      ['politics', ['politics', 'government', 'election', 'policy', 'law', 'president', 'congress', 'senate', 'vote', 'democracy', 'party', 'regulation', 'public', 'state', 'federal']],
      ['science', ['science', 'research', 'experiment', 'discovery', 'theory', 'scientist', 'physics', 'chemistry', 'biology', 'space', 'universe', 'laboratory', 'data', 'analysis', 'hypothesis']],
      ['sports', ['sports', 'game', 'team', 'player', 'match', 'tournament', 'championship', 'league', 'coach', 'athlete', 'score', 'goal', 'win', 'loss', 'competition']]
    ];
    for (const [category, keywords] of categories) {
      this._categoryKeywords.set(category, keywords);
    }
  }

  get documents(): Document[] {
    return this._documents;
  }

  get classifiedDocuments(): ClassificationResult[] {
    return this._classifiedDocuments;
  }

  get clusteringResult(): ClusteringResult | null {
    return this._clusteringResult;
  }

  get dedupResult(): DedupResult | null {
    return this._dedupResult;
  }

  get categoryKeywords(): Map<string, string[]> {
    return this._categoryKeywords;
  }

  setDocuments(documents: Document[]): void {
    this._documents = [...documents];
  }

  addDocument(doc: Document): void {
    this._documents.push(doc);
  }

  removeDocument(docId: string): void {
    this._documents = this._documents.filter(d => d.id !== docId);
  }

  classify(documents?: Document[]): ClassificationResult[] {
    const docs = documents || this._documents;
    const results: ClassificationResult[] = [];

    for (const doc of docs) {
      const tokens = this._tokenize(doc.content);
      const categoryScores = new Map<string, number>();
      let maxScore = 0;
      let bestCategory = 'general';

      for (const [category, keywords] of this._categoryKeywords) {
        let score = 0;
        for (const keyword of keywords) {
          const tokenFreq = tokens.filter(t => t === keyword.toLowerCase()).length;
          score += tokenFreq;
        }
        const normalizedScore = score / Math.max(tokens.length, 1);
        categoryScores.set(category, normalizedScore);
        if (normalizedScore > maxScore) {
          maxScore = normalizedScore;
          bestCategory = category;
        }
      }

      const totalScore = Array.from(categoryScores.values()).reduce((a, b) => a + b, 0);
      const confidence = totalScore > 0 ? maxScore / totalScore : 0.2;

      results.push({
        documentId: doc.id,
        category: bestCategory,
        confidence,
        categoryScores
      });
    }

    this._classifiedDocuments = results;
    this._lastResult = results;
    return results;
  }

  cluster(k: number = 5, documents?: Document[]): ClusteringResult {
    const docs = documents || this._documents;
    if (docs.length === 0 || k <= 0) {
      return {
        clusters: new Map(),
        centroids: new Map(),
        documentClusters: new Map(),
        silhouetteScores: new Map(),
        k
      };
    }

    const vectors = docs.map(doc => this._documentToVector(doc));
    const dimension = vectors[0].length;
    const centroids: Map<number, number[]> = new Map();
    const documentClusters: Map<string, number> = new Map();
    const clusters: Map<number, Document[]> = new Map();

    const shuffledIndices = [...Array(docs.length).keys()].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(k, docs.length); i++) {
      centroids.set(i, [...vectors[shuffledIndices[i]]]);
    }

    const maxIterations = 50;
    for (let iter = 0; iter < maxIterations; iter++) {
      let changed = false;

      for (let i = 0; i < docs.length; i++) {
        let bestCluster = 0;
        let bestDistance = Infinity;

        for (let c = 0; c < k; c++) {
          const centroid = centroids.get(c);
          if (centroid) {
            const dist = this._cosineDistance(vectors[i], centroid);
            if (dist < bestDistance) {
              bestDistance = dist;
              bestCluster = c;
            }
          }
        }

        const prevCluster = documentClusters.get(docs[i].id);
        if (prevCluster !== bestCluster) {
          changed = true;
        }
        documentClusters.set(docs[i].id, bestCluster);
      }

      for (let c = 0; c < k; c++) {
        const clusterDocs = docs.filter((_, i) => documentClusters.get(docs[i].id) === c);
        if (clusterDocs.length > 0) {
          const newCentroid = new Array(dimension).fill(0);
          let count = 0;
          for (let i = 0; i < docs.length; i++) {
            if (documentClusters.get(docs[i].id) === c) {
              for (let d = 0; d < dimension; d++) {
                newCentroid[d] += vectors[i][d];
              }
              count++;
            }
          }
          if (count > 0) {
            for (let d = 0; d < dimension; d++) {
              newCentroid[d] /= count;
            }
          }
          centroids.set(c, newCentroid);
        }
      }

      if (!changed) break;
    }

    for (let c = 0; c < k; c++) {
      clusters.set(c, docs.filter(d => documentClusters.get(d.id) === c));
    }

    const silhouetteScores = new Map<string, number>();
    for (let i = 0; i < docs.length; i++) {
      const docCluster = documentClusters.get(docs[i].id)!;
      const clusterDocs = docs.filter((_, idx) => documentClusters.get(docs[idx].id) === docCluster);
      
      if (clusterDocs.length <= 1) {
        silhouetteScores.set(docs[i].id, 0);
        continue;
      }

      let a = 0;
      for (let j = 0; j < docs.length; j++) {
        if (i !== j && documentClusters.get(docs[j].id) === docCluster) {
          a += this._cosineDistance(vectors[i], vectors[j]);
        }
      }
      a /= Math.max(clusterDocs.length - 1, 1);

      let b = Infinity;
      for (let c = 0; c < k; c++) {
        if (c !== docCluster) {
          let avgDist = 0;
          let count = 0;
          for (let j = 0; j < docs.length; j++) {
            if (documentClusters.get(docs[j].id) === c) {
              avgDist += this._cosineDistance(vectors[i], vectors[j]);
              count++;
            }
          }
          if (count > 0) {
            avgDist /= count;
            if (avgDist < b) {
              b = avgDist;
            }
          }
        }
      }

      const silhouette = b === Infinity ? 0 : (b - a) / Math.max(a, b);
      silhouetteScores.set(docs[i].id, silhouette);
    }

    const result: ClusteringResult = {
      clusters,
      centroids,
      documentClusters,
      silhouetteScores,
      k
    };

    this._clusteringResult = result;
    this._lastResult = result;
    return result;
  }

  deduplicate(documents?: Document[], threshold?: number): DedupResult {
    const docs = documents || this._documents;
    const simThreshold = threshold || this._defaultSimilarityThreshold;
    const uniqueDocuments: Document[] = [];
    const duplicateGroups: Document[][] = [];
    const fingerprints: Map<string, Document[]> = new Map();

    for (const doc of docs) {
      const fingerprint = this._computeFingerprint(doc.content);
      doc.fingerprint = fingerprint;

      if (!fingerprints.has(fingerprint)) {
        fingerprints.set(fingerprint, []);
      }
      fingerprints.get(fingerprint)!.push(doc);
    }

    const processed = new Set<string>();
    for (const [fingerprint, group] of fingerprints) {
      if (processed.has(fingerprint)) continue;

      if (group.length > 1) {
        duplicateGroups.push([...group]);
        uniqueDocuments.push(group[0]);
        for (const d of group) {
          processed.add(d.fingerprint!);
        }
      } else {
        uniqueDocuments.push(group[0]);
        processed.add(fingerprint);
      }
    }

    const similarGroups: Document[][] = [];
    const remainingUnique: Document[] = [];
    const used = new Set<string>();

    for (let i = 0; i < uniqueDocuments.length; i++) {
      if (used.has(uniqueDocuments[i].id)) continue;

      const currentGroup = [uniqueDocuments[i]];
      used.add(uniqueDocuments[i].id);

      for (let j = i + 1; j < uniqueDocuments.length; j++) {
        if (used.has(uniqueDocuments[j].id)) continue;

        const similarity = this._cosineSimilarity(
          this._textToVector(uniqueDocuments[i].content),
          this._textToVector(uniqueDocuments[j].content)
        );

        if (similarity >= simThreshold) {
          currentGroup.push(uniqueDocuments[j]);
          used.add(uniqueDocuments[j].id);
        }
      }

      if (currentGroup.length > 1) {
        similarGroups.push(currentGroup);
      }
      remainingUnique.push(currentGroup[0]);
    }

    const result: DedupResult = {
      uniqueDocuments: remainingUnique,
      duplicateGroups: [...duplicateGroups, ...similarGroups],
      removedCount: docs.length - remainingUnique.length,
      similarityThreshold: simThreshold
    };

    this._dedupResult = result;
    this._lastResult = result;
    return result;
  }

  filter(criteria: FilterCriteria, documents?: Document[]): Document[] {
    const docs = documents || this._documents;
    let filtered = [...docs];

    if (criteria.minLength !== undefined) {
      filtered = filtered.filter(d => d.content.length >= criteria.minLength!);
    }

    if (criteria.maxLength !== undefined) {
      filtered = filtered.filter(d => d.content.length <= criteria.maxLength!);
    }

    if (criteria.requiredTerms && criteria.requiredTerms.length > 0) {
      filtered = filtered.filter(d => 
        criteria.requiredTerms!.every(term => 
          d.content.toLowerCase().includes(term.toLowerCase())
        )
      );
    }

    if (criteria.excludedTerms && criteria.excludedTerms.length > 0) {
      filtered = filtered.filter(d => 
        !criteria.excludedTerms!.some(term => 
          d.content.toLowerCase().includes(term.toLowerCase())
        )
      );
    }

    if (criteria.categories && criteria.categories.length > 0) {
      if (this._classifiedDocuments.length === 0) {
        this.classify(filtered);
      }
      const classifiedIds = new Set(
        this._classifiedDocuments
          .filter(r => criteria.categories!.includes(r.category))
          .map(r => r.documentId)
      );
      filtered = filtered.filter(d => classifiedIds.has(d.id));
    }

    if (criteria.customFilter) {
      filtered = filtered.filter(criteria.customFilter);
    }

    return filtered;
  }

  private _tokenize(text: string): string[] {
    const words = text.toLowerCase().match(/[\w']+/g) || [];
    return words.filter(w => !this._stopwords.has(w) && w.length > 2);
  }

  private _textToVector(text: string): number[] {
    const tokens = this._tokenize(text);
    const wordFreq = new Map<string, number>();
    for (const token of tokens) {
      wordFreq.set(token, (wordFreq.get(token) || 0) + 1);
    }
    return Array.from(wordFreq.values());
  }

  private _documentToVector(doc: Document): number[] {
    const tokens = this._tokenize(doc.content + ' ' + (doc.title || ''));
    const vocabulary: string[] = [];
    const vocabIndex = new Map<string, number>();

    for (const keywordList of this._categoryKeywords.values()) {
      for (const kw of keywordList) {
        const lowerKw = kw.toLowerCase();
        if (!vocabIndex.has(lowerKw)) {
          vocabIndex.set(lowerKw, vocabulary.length);
          vocabulary.push(lowerKw);
        }
      }
    }

    const vector = new Array(vocabulary.length).fill(0);
    const wordFreq = new Map<string, number>();

    for (const token of tokens) {
      wordFreq.set(token, (wordFreq.get(token) || 0) + 1);
    }

    for (const [word, freq] of wordFreq) {
      const idx = vocabIndex.get(word);
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

  private _cosineSimilarity(v1: number[], v2: number[]): number {
    const maxLen = Math.max(v1.length, v2.length);
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < maxLen; i++) {
      const a = v1[i] || 0;
      const b = v2[i] || 0;
      dotProduct += a * b;
      norm1 += a * a;
      norm2 += b * b;
    }

    const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
    return denominator > 0 ? dotProduct / denominator : 0;
  }

  private _cosineDistance(v1: number[], v2: number[]): number {
    return 1 - this._cosineSimilarity(v1, v2);
  }

  private _computeFingerprint(text: string): string {
    const tokens = this._tokenize(text);
    const uniqueTokens = [...new Set(tokens)].sort();
    let hash = 0;
    for (const token of uniqueTokens) {
      for (let i = 0; i < token.length; i++) {
        hash = ((hash << 5) - hash + token.charCodeAt(i)) | 0;
      }
    }
    return Math.abs(hash).toString(36);
  }

  toPacket(): DataPacket<ClassificationResult[] | ClusteringResult | DedupResult> {
    const result = this._lastResult || [];
    this._counter++;
    return {
      id: `document-filter-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['information-retrieval', 'document-filter'],
        priority: 1,
        phase: 'filtering'
      }
    };
  }

  reset(): void {
    this._documents = [];
    this._classifiedDocuments = [];
    this._clusteringResult = null;
    this._dedupResult = null;
    this._counter = 0;
    this._lastResult = null;
    this._defaultSimilarityThreshold = 0.85;
  }
}
