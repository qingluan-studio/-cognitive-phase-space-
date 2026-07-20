import { DataPacket } from '../shared/types';

export interface Summary {
  text: string;
  originalLength: number;
  compressedRatio: number;
  type: string;
  keywords?: string[];
  sentences?: string[];
}

export interface SentenceScore {
  sentence: string;
  score: number;
  position: number;
  tokens?: string[];
}

export interface SummaryStat {
  totalSummaries: number;
  byType: Record<string, number>;
  avgCompression: number;
  avgSentenceCount: number;
}

export type SummarizationMethod = 'extractive' | 'abstractive' | 'tfidf' | 'textrank' | 'luhn' | 'centroid' | 'mma' | 'lexrank' | 'kl' | 'lsa';

interface WordFrequency {
  word: string;
  tf: number;
  idf: number;
  tfidf: number;
}

export class TextSummarizer {
  private _summaries: Summary[] = [];
  private _type: string = 'extractive';
  private _counter: number = 0;
  private _sentenceScores: SentenceScore[] = [];
  private _lastResult: Summary | null = null;
  private _stopwords: Set<string> = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
    'my', 'your', 'his', 'its', 'our', 'their', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'into', 'about', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further',
    'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all',
    'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such',
    'no', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just'
  ]);
  private _method: SummarizationMethod = 'extractive';
  private _keywords: string[] = [];
  private _dampingFactor: number = 0.85;
  private _maxIterations: number = 50;
  private _convergenceThreshold: number = 1e-5;

  get summaries(): Summary[] {
    return this._summaries;
  }

  get type(): string {
    return this._type;
  }

  get sentenceScores(): SentenceScore[] {
    return this._sentenceScores;
  }

  get method(): SummarizationMethod {
    return this._method;
  }

  set method(method: SummarizationMethod) {
    this._method = method;
  }

  get stopwords(): Set<string> {
    return this._stopwords;
  }

  get keywords(): string[] {
    return this._keywords;
  }

  set dampingFactor(value: number) {
    this._dampingFactor = Math.min(1, Math.max(0, value));
  }

  set maxIterations(value: number) {
    this._maxIterations = Math.max(1, value);
  }

  /**
   * Extractive summarization using the configured method
   */
  extractive(text: string, ratio: number = 0.3): string {
    const sentences = this._splitSentences(text);
    const scores = this.sentenceScoring(sentences, 'tfidf');
    const n = Math.max(1, Math.ceil(sentences.length * ratio));
    const topSentences = scores
      .sort((a, b) => b.score - a.score)
      .slice(0, n)
      .sort((a, b) => a.position - b.position)
      .map(s => s.sentence);
    const summary = topSentences.join(' ');
    const keywords = this._extractKeywords(text, 5);
    this._keywords = keywords;
    const result: Summary = {
      text: summary,
      originalLength: text.length,
      compressedRatio: summary.length / text.length,
      type: 'extractive',
      keywords,
      sentences: topSentences
    };
    this._lastResult = result;
    this._summaries.push(result);
    this._type = 'extractive';
    return summary;
  }

  /**
   * Abstractive summarization (simulated using compression)
   */
  abstractive(text: string, model: { name: string }): string {
    const sentences = this._splitSentences(text);
    const keySentences = this.textrank(sentences).slice(0, Math.ceil(sentences.length * 0.4));
    const words = keySentences.map(s => s.sentence).join(' ').split(/\s+/);
    // Compress by removing filler words and applying paraphrase-like transformations
    const compressed = words
      .filter(word => !this._stopwords.has(word.toLowerCase()) || this._hash(word) % 5 !== 0)
      .filter((_, i) => i % 2 === 0 || i < 10)
      .join(' ');
    const result: Summary = {
      text: compressed,
      originalLength: text.length,
      compressedRatio: compressed.length / text.length,
      type: 'abstractive',
      keywords: this._extractKeywords(text, 5)
    };
    this._lastResult = result;
    this._summaries.push(result);
    this._type = 'abstractive';
    return compressed;
  }

  /**
   * Score sentences using various methods
   */
  sentenceScoring(sentences: string[], method: string = 'tfidf'): SentenceScore[] {
    const allWords = sentences.map(s => this._tokenize(s.toLowerCase()));
    const df = new Map<string, number>();
    for (const words of allWords) {
      const unique = new Set(words);
      for (const word of unique) {
        df.set(word, (df.get(word) || 0) + 1);
      }
    }
    const scores: SentenceScore[] = [];
    for (let i = 0; i < sentences.length; i++) {
      const words = allWords[i];
      let score = 0;
      if (method === 'tfidf') {
        for (const word of words) {
          const tf = words.filter(w => w === word).length / Math.max(words.length, 1);
          const idf = Math.log(sentences.length / (df.get(word) || 1));
          score += tf * idf;
        }
      } else if (method === 'length') {
        score = words.length;
      } else if (method === 'position') {
        // Sentences at the beginning and end get higher scores
        const middle = sentences.length / 2;
        score = Math.max(sentences.length - i, Math.abs(middle - i) * 2);
      } else if (method === 'keyword') {
        for (const word of words) {
          if (this._keywords.includes(word)) score += 1;
        }
      } else if (method === 'cue') {
        // Cue phrases like "in conclusion", "importantly", etc.
        const cuePhrases = ['in conclusion', 'importantly', 'in summary', 'finally', 'overall', 'therefore', 'thus', 'hence'];
        for (const cue of cuePhrases) {
          if (sentences[i].toLowerCase().includes(cue)) score += 2;
        }
      } else {
        score = words.length;
      }
      scores.push({ sentence: sentences[i], score, position: i, tokens: words });
    }
    const maxScore = Math.max(...scores.map(s => s.score)) || 1;
    const normalized = scores.map(s => ({ ...s, score: s.score / maxScore }));
    this._sentenceScores = normalized;
    return normalized;
  }

  /**
   * TextRank algorithm for sentence ranking
   */
  textrank(sentences: string[]): SentenceScore[] {
    const n = sentences.length;
    if (n === 0) return [];
    const similarity: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
    const sentenceWords = sentences.map(s => new Set(this._tokenize(s.toLowerCase())));
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const inter = [...sentenceWords[i]].filter(w => sentenceWords[j].has(w)).length;
        const union = sentenceWords[i].size + sentenceWords[j].size - inter;
        similarity[i][j] = union > 0 ? inter / union : 0;
        similarity[j][i] = similarity[i][j];
      }
    }
    return this._runPageRank(sentences, similarity);
  }

  /**
   * LexRank - similar to TextRank but uses normalized similarity matrix
   */
  lexrank(sentences: string[], threshold: number = 0.1): SentenceScore[] {
    const n = sentences.length;
    if (n === 0) return [];
    const sentenceWords = sentences.map(s => new Set(this._tokenize(s.toLowerCase())));
    const similarity: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          similarity[i][j] = 0;
        } else {
          const inter = [...sentenceWords[i]].filter(w => sentenceWords[j].has(w)).length;
          const union = sentenceWords[i].size + sentenceWords[j].size - inter;
          const sim = union > 0 ? inter / union : 0;
          similarity[i][j] = sim > threshold ? sim : 0;
        }
      }
    }
    // Row-normalize the similarity matrix
    for (let i = 0; i < n; i++) {
      const rowSum = similarity[i].reduce((a, b) => a + b, 0);
      if (rowSum > 0) {
        for (let j = 0; j < n; j++) {
          similarity[i][j] /= rowSum;
        }
      }
    }
    return this._runPageRank(sentences, similarity);
  }

  /**
   * Run PageRank-style iteration to compute sentence scores
   */
  private _runPageRank(sentences: string[], similarity: number[][]): SentenceScore[] {
    const n = sentences.length;
    let scores = new Array(n).fill(1 / n);
    const damping = this._dampingFactor;
    for (let iter = 0; iter < this._maxIterations; iter++) {
      const newScores = new Array(n).fill((1 - damping) / n);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (i !== j) {
            const sumSim = similarity[j].reduce((a, b) => a + b, 0) || 1;
            newScores[i] += damping * (similarity[j][i] / sumSim) * scores[j];
          }
        }
      }
      // Check for convergence
      let delta = 0;
      for (let i = 0; i < n; i++) {
        delta += Math.abs(newScores[i] - scores[i]);
      }
      scores = newScores;
      if (delta < this._convergenceThreshold) break;
    }
    const result = sentences.map((s, i) => ({
      sentence: s,
      score: scores[i],
      position: i
    }));
    this._sentenceScores = result;
    return result;
  }

  /**
   * Lead-based summarization - just take the first N sentences
   */
  leadSentences(text: string, n: number = 3): string {
    const sentences = this._splitSentences(text);
    const lead = sentences.slice(0, n).join(' ');
    const result: Summary = {
      text: lead,
      originalLength: text.length,
      compressedRatio: lead.length / text.length,
      type: 'lead'
    };
    this._lastResult = result;
    this._summaries.push(result);
    return lead;
  }

  /**
   * Luhn's algorithm - significant word clusters
   */
  luhnSummarize(text: string, ratio: number = 0.3): string {
    const sentences = this._splitSentences(text);
    const allWords = this._tokenize(text.toLowerCase());
    const wordFreq = new Map<string, number>();
    for (const word of allWords) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }
    const significantWords = [...wordFreq.entries()]
      .filter(([, f]) => f >= 2 && f <= allWords.length * 0.5)
      .map(([w]) => w);
    const scored = sentences.map((sent, idx) => {
      const words = this._tokenize(sent.toLowerCase());
      let score = 0;
      let inChunk = false;
      let chunkStart = 0;
      let chunkWords = 0;
      let sigCount = 0;
      for (let i = 0; i < words.length; i++) {
        if (significantWords.includes(words[i])) {
          if (!inChunk) {
            inChunk = true;
            chunkStart = i;
            chunkWords = 0;
            sigCount = 0;
          }
          sigCount++;
          chunkWords++;
        } else if (inChunk) {
          chunkWords++;
          if (chunkWords > 4) {
            score += sigCount * sigCount / chunkWords;
            inChunk = false;
          }
        }
      }
      if (inChunk) {
        score += sigCount * sigCount / chunkWords;
      }
      return { sentence: sent, score, position: idx };
    });
    const n = Math.max(1, Math.ceil(sentences.length * ratio));
    const top = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, n)
      .sort((a, b) => a.position - b.position)
      .map(s => s.sentence)
      .join(' ');
    const result: Summary = {
      text: top,
      originalLength: text.length,
      compressedRatio: top.length / text.length,
      type: 'luhn'
    };
    this._lastResult = result;
    this._summaries.push(result);
    return top;
  }

  /**
   * TF-IDF summarization - select sentences with highest TF-IDF scores
   */
  tfidfSummarize(text: string, ratio: number = 0.3): string {
    return this.extractive(text, ratio);
  }

  /**
   * Centroid-based summarization
   */
  centroidSummarize(text: string, ratio: number = 0.3): string {
    const sentences = this._splitSentences(text);
    const allWords = this._tokenize(text.toLowerCase());
    const wordFreq = new Map<string, number>();
    for (const word of allWords) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }
    const centroid = new Set([...wordFreq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, Math.ceil(allWords.length * 0.1))
      .map(([w]) => w));
    const scored = sentences.map((sent, idx) => {
      const words = this._tokenize(sent.toLowerCase());
      const overlap = words.filter(w => centroid.has(w)).length;
      return { sentence: sent, score: overlap / Math.sqrt(words.length), position: idx };
    });
    const n = Math.max(1, Math.ceil(sentences.length * ratio));
    const top = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, n)
      .sort((a, b) => a.position - b.position)
      .map(s => s.sentence)
      .join(' ');
    const result: Summary = {
      text: top,
      originalLength: text.length,
      compressedRatio: top.length / text.length,
      type: 'centroid'
    };
    this._lastResult = result;
    this._summaries.push(result);
    return top;
  }

  /**
   * Maximal Marginal Relevance (MMR) summarization
   */
  mmaSummarize(text: string, ratio: number = 0.3): string {
    const sentences = this._splitSentences(text);
    const trScores = this.textrank(sentences);
    const tfidfScores = this.sentenceScoring(sentences, 'tfidf');
    const combined = sentences.map((_, i) => ({
      sentence: sentences[i],
      score: trScores[i].score * 0.5 + tfidfScores[i].score * 0.5,
      position: i
    }));
    const n = Math.max(1, Math.ceil(sentences.length * ratio));
    const top = combined
      .sort((a, b) => b.score - a.score)
      .slice(0, n)
      .sort((a, b) => a.position - b.position)
      .map(s => s.sentence)
      .join(' ');
    const result: Summary = {
      text: top,
      originalLength: text.length,
      compressedRatio: top.length / text.length,
      type: 'mma'
    };
    this._lastResult = result;
    this._summaries.push(result);
    return top;
  }

  /**
   * Maximal Marginal Relevance with redundancy penalty
   */
  mmrSummarize(text: string, ratio: number = 0.3, lambda: number = 0.7): string {
    const sentences = this._splitSentences(text);
    const allWords = this._tokenize(text.toLowerCase());
    const wordFreq = new Map<string, number>();
    for (const w of allWords) {
      wordFreq.set(w, (wordFreq.get(w) || 0) + 1);
    }
    const maxFreq = Math.max(...wordFreq.values()) || 1;
    const tfidf = new Map<string, number>();
    for (const [w, f] of wordFreq) {
      const idf = Math.log(sentences.length / 1);
      tfidf.set(w, (f / maxFreq) * idf);
    }
    // Sentence vectors
    const sentenceVecs = sentences.map(s => {
      const words = this._tokenize(s.toLowerCase());
      const vec = new Map<string, number>();
      for (const w of words) {
        vec.set(w, (vec.get(w) || 0) + (tfidf.get(w) || 0));
      }
      return vec;
    });
    const sentenceScores = this.textrank(sentences);
    const selected: number[] = [];
    const remaining = Array.from({ length: sentences.length }, (_, i) => i);
    const targetCount = Math.max(1, Math.ceil(sentences.length * ratio));
    while (selected.length < targetCount && remaining.length > 0) {
      let bestIdx = remaining[0];
      let bestScore = -Infinity;
      for (const idx of remaining) {
        const relevance = sentenceScores[idx].score;
        let maxSim = 0;
        for (const selIdx of selected) {
          const sim = this._cosineSimMaps(sentenceVecs[idx], sentenceVecs[selIdx]);
          if (sim > maxSim) maxSim = sim;
        }
        const mmrScore = lambda * relevance - (1 - lambda) * maxSim;
        if (mmrScore > bestScore) {
          bestScore = mmrScore;
          bestIdx = idx;
        }
      }
      selected.push(bestIdx);
      const i = remaining.indexOf(bestIdx);
      remaining.splice(i, 1);
    }
    selected.sort((a, b) => a - b);
    const summary = selected.map(i => sentences[i]).join(' ');
    const result: Summary = {
      text: summary,
      originalLength: text.length,
      compressedRatio: summary.length / text.length,
      type: 'mmr'
    };
    this._lastResult = result;
    this._summaries.push(result);
    return summary;
  }

  /**
   * KL-divergence summarization - minimize KL divergence between summary and original
   */
  klSummarize(text: string, ratio: number = 0.3): string {
    const sentences = this._splitSentences(text);
    const allWords = this._tokenize(text.toLowerCase());
    const totalWords = allWords.length;
    const wordDist = new Map<string, number>();
    for (const w of allWords) {
      wordDist.set(w, (wordDist.get(w) || 0) + 1);
    }
    // Normalize target distribution
    const target: Map<string, number> = new Map();
    for (const [w, c] of wordDist) {
      target.set(w, c / totalWords);
    }
    // Greedy selection minimizing KL divergence
    const selected: number[] = [];
    const summaryWords: string[] = [];
    const targetCount = Math.max(1, Math.ceil(sentences.length * ratio));
    const used = new Set<number>();
    while (selected.length < targetCount) {
      let bestIdx = -1;
      let bestKL = Infinity;
      for (let i = 0; i < sentences.length; i++) {
        if (used.has(i)) continue;
        const sentWords = this._tokenize(sentences[i].toLowerCase());
        const candidateWords = [...summaryWords, ...sentWords];
        const candidateDist = new Map<string, number>();
        for (const w of candidateWords) {
          candidateDist.set(w, (candidateDist.get(w) || 0) + 1);
        }
        const candLen = candidateWords.length || 1;
        let kl = 0;
        for (const [w, p] of target) {
          const q = (candidateDist.get(w) || 0) / candLen;
          if (p > 0 && q > 0) {
            kl += p * Math.log(p / q);
          }
        }
        if (kl < bestKL) {
          bestKL = kl;
          bestIdx = i;
        }
      }
      if (bestIdx === -1) break;
      selected.push(bestIdx);
      used.add(bestIdx);
      summaryWords.push(...this._tokenize(sentences[bestIdx].toLowerCase()));
    }
    selected.sort((a, b) => a - b);
    const summary = selected.map(i => sentences[i]).join(' ');
    const result: Summary = {
      text: summary,
      originalLength: text.length,
      compressedRatio: summary.length / text.length,
      type: 'kl'
    };
    this._lastResult = result;
    this._summaries.push(result);
    return summary;
  }

  /**
   * Latent Semantic Analysis (LSA) summarization
   */
  lsaSummarize(text: string, ratio: number = 0.3): string {
    const sentences = this._splitSentences(text);
    if (sentences.length === 0) return '';
    // Build term-sentence matrix
    const allWords = this._tokenize(text.toLowerCase());
    const vocab = Array.from(new Set(allWords));
    const matrix: number[][] = vocab.map(word => {
      return sentences.map(s => {
        const words = this._tokenize(s.toLowerCase());
        return words.filter(w => w === word).length;
      });
    });
    // Simple SVD approximation using power iteration
    const numTopics = Math.min(2, sentences.length);
    const topicScores = sentences.map(() => 0);
    for (let t = 0; t < numTopics; t++) {
      let v = new Array(sentences.length).fill(1).map(() => Math.random());
      for (let iter = 0; iter < 10; iter++) {
        const u = matrix.map(row => row.reduce((a, b, i) => a + b * v[i], 0));
        const newV = sentences.map((_, j) => matrix.reduce((a, row, i) => a + row[j] * u[i], 0));
        const norm = Math.sqrt(newV.reduce((a, b) => a + b * b, 0)) || 1;
        v = newV.map(x => x / norm);
      }
      for (let j = 0; j < sentences.length; j++) {
        topicScores[j] += Math.abs(v[j]);
      }
    }
    const scored = sentences.map((s, i) => ({
      sentence: s,
      score: topicScores[i],
      position: i
    }));
    const n = Math.max(1, Math.ceil(sentences.length * ratio));
    const top = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, n)
      .sort((a, b) => a.position - b.position)
      .map(s => s.sentence)
      .join(' ');
    const result: Summary = {
      text: top,
      originalLength: text.length,
      compressedRatio: top.length / text.length,
      type: 'lsa'
    };
    this._lastResult = result;
    this._summaries.push(result);
    return top;
  }

  /**
   * Query-focused summarization
   */
  queryFocused(text: string, query: string, ratio: number = 0.3): string {
    const sentences = this._splitSentences(text);
    const queryWords = new Set(this._tokenize(query.toLowerCase()));
    const scored = sentences.map((sent, idx) => {
      const words = this._tokenize(sent.toLowerCase());
      const overlap = words.filter(w => queryWords.has(w)).length;
      const positionBoost = idx < 3 ? 0.1 : 0;
      return { sentence: sent, score: overlap / Math.sqrt(words.length) + positionBoost, position: idx };
    });
    const n = Math.max(1, Math.ceil(sentences.length * ratio));
    const top = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, n)
      .sort((a, b) => a.position - b.position)
      .map(s => s.sentence)
      .join(' ');
    const result: Summary = {
      text: top,
      originalLength: text.length,
      compressedRatio: top.length / text.length,
      type: 'query-focused'
    };
    this._lastResult = result;
    this._summaries.push(result);
    return top;
  }

  /**
   * Multi-document summarization
   */
  multiDocumentSummarize(docs: string[], ratio: number = 0.2): string {
    const allSentences: { sentence: string; docIdx: number; posIdx: number }[] = [];
    for (let di = 0; di < docs.length; di++) {
      const sentences = this._splitSentences(docs[di]);
      for (let si = 0; si < sentences.length; si++) {
        allSentences.push({ sentence: sentences[si], docIdx: di, posIdx: si });
      }
    }
    const sentences = allSentences.map(s => s.sentence);
    const trScores = this.textrank(sentences);
    const totalLen = docs.reduce((a, d) => a + d.length, 0);
    const targetLen = totalLen * ratio;
    const selected: string[] = [];
    let currentLen = 0;
    const sorted = [...trScores].sort((a, b) => b.score - a.score);
    for (const scored of sorted) {
      if (currentLen >= targetLen) break;
      selected.push(scored.sentence);
      currentLen += scored.sentence.length;
    }
    const summary = selected.join(' ');
    const result: Summary = {
      text: summary,
      originalLength: totalLen,
      compressedRatio: summary.length / totalLen,
      type: 'multi-document'
    };
    this._lastResult = result;
    this._summaries.push(result);
    return summary;
  }

  /**
   * Update summarization - summarizes differences between two texts
   */
  updateSummarize(oldText: string, newText: string, ratio: number = 0.3): string {
    const oldSentences = this._splitSentences(oldText);
    const newSentences = this._splitSentences(newText);
    const oldSet = new Set(oldSentences.map(s => s.toLowerCase()));
    const updates = newSentences.filter(s => !oldSet.has(s.toLowerCase()));
    if (updates.length === 0) return '';
    const scores = this.textrank(updates);
    const n = Math.max(1, Math.ceil(updates.length * ratio));
    const top = scores
      .sort((a, b) => b.score - a.score)
      .slice(0, n)
      .map(s => s.sentence)
      .join(' ');
    const result: Summary = {
      text: top,
      originalLength: newText.length,
      compressedRatio: top.length / newText.length,
      type: 'update'
    };
    this._lastResult = result;
    this._summaries.push(result);
    return top;
  }

  /**
   * Bullet point summary
   */
  bulletPoints(text: string, n: number = 5): string[] {
    const sentences = this._splitSentences(text);
    const scores = this.textrank(sentences);
    const top = scores
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(n, sentences.length))
      .sort((a, b) => a.position - b.position)
      .map(s => s.sentence);
    return top;
  }

  /**
   * Generate a headline/title for the text
   */
  headline(text: string): string {
    const keywords = this._extractKeywords(text, 5);
    const templates = [
      `${keywords[0]} and ${keywords[1]}`,
      `The ${keywords[0]} of ${keywords[1]}`,
      `${keywords[0]}: A Complete Guide`,
      `Why ${keywords[0]} Matters`,
      `${keywords[0]} in the Modern World`
    ];
    const hash = this._hash(text);
    return templates[hash % templates.length];
  }

  /**
   * Generate an outline of the text
   */
  outline(text: string, maxSections: number = 5): { section: string; bullets: string[] }[] {
    const sentences = this._splitSentences(text);
    const scored = this.textrank(sentences);
    const top = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(maxSections, sentences.length))
      .sort((a, b) => a.position - b.position);
    return top.map(s => ({
      section: this._extractTopic(s.sentence),
      bullets: [s.sentence]
    }));
  }

  /**
   * Compute word frequency map
   */
  wordFrequency(text: string): Map<string, number> {
    const words = this._tokenize(text.toLowerCase());
    const freq = new Map<string, number>();
    for (const w of words) {
      freq.set(w, (freq.get(w) || 0) + 1);
    }
    return freq;
  }

  /**
   * Compute TF-IDF for all words
   */
  tfidf(text: string): WordFrequency[] {
    const sentences = this._splitSentences(text);
    const allWords = this._tokenize(text.toLowerCase());
    const totalWords = allWords.length;
    const tf = new Map<string, number>();
    for (const w of allWords) {
      tf.set(w, (tf.get(w) || 0) + 1);
    }
    const df = new Map<string, number>();
    for (const sent of sentences) {
      const sentWords = new Set(this._tokenize(sent.toLowerCase()));
      for (const w of sentWords) {
        df.set(w, (df.get(w) || 0) + 1);
      }
    }
    const result: WordFrequency[] = [];
    for (const [word, count] of tf) {
      const tfVal = count / totalWords;
      const idfVal = Math.log(sentences.length / (df.get(word) || 1));
      result.push({
        word,
        tf: tfVal,
        idf: idfVal,
        tfidf: tfVal * idfVal
      });
    }
    return result.sort((a, b) => b.tfidf - a.tfidf);
  }

  /**
   * Extract keywords from text
   */
  keywordsExtraction(text: string, n: number = 10): string[] {
    return this._extractKeywords(text, n);
  }

  /**
   * Evaluate summary quality (ROUGE-1)
   */
  rouge1(summary: string, reference: string): number {
    const sumWords = this._tokenize(summary.toLowerCase());
    const refWords = this._tokenize(reference.toLowerCase());
    const refCounts = new Map<string, number>();
    for (const w of refWords) {
      refCounts.set(w, (refCounts.get(w) || 0) + 1);
    }
    let overlap = 0;
    const sumCounts = new Map<string, number>();
    for (const w of sumWords) {
      sumCounts.set(w, (sumCounts.get(w) || 0) + 1);
    }
    for (const [w, c] of sumCounts) {
      overlap += Math.min(c, refCounts.get(w) || 0);
    }
    const precision = sumWords.length > 0 ? overlap / sumWords.length : 0;
    const recall = refWords.length > 0 ? overlap / refWords.length : 0;
    return precision + recall > 0 ? 2 * precision * recall / (precision + recall) : 0;
  }

  /**
   * ROUGE-2 - bigram overlap
   */
  rouge2(summary: string, reference: string): number {
    const sumBigrams = this._ngrams(this._tokenize(summary.toLowerCase()), 2);
    const refBigrams = this._ngrams(this._tokenize(reference.toLowerCase()), 2);
    const refCounts = new Map<string, number>();
    for (const bg of refBigrams) {
      refCounts.set(bg, (refCounts.get(bg) || 0) + 1);
    }
    let overlap = 0;
    const sumCounts = new Map<string, number>();
    for (const bg of sumBigrams) {
      sumCounts.set(bg, (sumCounts.get(bg) || 0) + 1);
    }
    for (const [bg, c] of sumCounts) {
      overlap += Math.min(c, refCounts.get(bg) || 0);
    }
    const precision = sumBigrams.length > 0 ? overlap / sumBigrams.length : 0;
    const recall = refBigrams.length > 0 ? overlap / refBigrams.length : 0;
    return precision + recall > 0 ? 2 * precision * recall / (precision + recall) : 0;
  }

  /**
   * ROUGE-L - longest common subsequence
   */
  rougeL(summary: string, reference: string): number {
    const sumWords = this._tokenize(summary.toLowerCase());
    const refWords = this._tokenize(reference.toLowerCase());
    const lcs = this._lcs(sumWords, refWords);
    const precision = sumWords.length > 0 ? lcs / sumWords.length : 0;
    const recall = refWords.length > 0 ? lcs / refWords.length : 0;
    return precision + recall > 0 ? 2 * precision * recall / (precision + recall) : 0;
  }

  /**
   * Compute compression ratio
   */
  compressionRatio(original: string, summary: string): number {
    return original.length > 0 ? summary.length / original.length : 0;
  }

  /**
   * Compute readability score (Flesch Reading Ease)
   */
  readabilityScore(text: string): number {
    const sentences = this._splitSentences(text);
    const words = this._tokenize(text);
    const syllables = words.reduce((a, w) => a + this._countSyllables(w), 0);
    if (sentences.length === 0 || words.length === 0) return 0;
    return 206.835 - 1.015 * (words.length / sentences.length) - 84.6 * (syllables / words.length);
  }

  /**
   * Generate statistics about generated summaries
   */
  statistics(): SummaryStat {
    const byType: Record<string, number> = {};
    let totalCompression = 0;
    let totalSentences = 0;
    for (const s of this._summaries) {
      byType[s.type] = (byType[s.type] || 0) + 1;
      totalCompression += s.compressedRatio;
      totalSentences += s.sentences?.length || 0;
    }
    return {
      totalSummaries: this._summaries.length,
      byType,
      avgCompression: this._summaries.length > 0 ? totalCompression / this._summaries.length : 0,
      avgSentenceCount: this._summaries.length > 0 ? totalSentences / this._summaries.length : 0
    };
  }

  /**
   * Get top keywords by TF-IDF
   */
  topKeywords(text: string, n: number = 10): string[] {
    return this._extractKeywords(text, n);
  }

  /**
   * Filter sentences by minimum length
   */
  filterShortSentences(sentences: string[], minLen: number = 5): string[] {
    return sentences.filter(s => s.split(/\s+/).length >= minLen);
  }

  /**
   * Remove duplicate sentences from a list
   */
  removeDuplicateSentences(sentences: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const s of sentences) {
      const key = s.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(s);
      }
    }
    return result;
  }

  /**
   * Add a stopword
   */
  addStopword(word: string): void {
    this._stopwords.add(word.toLowerCase());
  }

  /**
   * Remove a stopword
   */
  removeStopword(word: string): boolean {
    return this._stopwords.delete(word.toLowerCase());
  }

  /**
   * Update generation parameters
   */
  setParams(params: Partial<{ damping: number; iterations: number; threshold: number }>): void {
    if (params.damping !== undefined) this._dampingFactor = params.damping;
    if (params.iterations !== undefined) this._maxIterations = params.iterations;
    if (params.threshold !== undefined) this._convergenceThreshold = params.threshold;
  }

  /**
   * Get the configured method's summary
   */
  summarize(text: string, options: { ratio?: number; method?: SummarizationMethod; query?: string } = {}): string {
    const ratio = options.ratio ?? 0.3;
    const method = options.method ?? this._method;
    switch (method) {
      case 'extractive':
        return this.extractive(text, ratio);
      case 'abstractive':
        return this.abstractive(text, { name: 'abstractive' });
      case 'tfidf':
        return this.tfidfSummarize(text, ratio);
      case 'textrank':
        return this._summarizeWithScores(text, this.textrank(this._splitSentences(text)), ratio, 'textrank');
      case 'luhn':
        return this.luhnSummarize(text, ratio);
      case 'centroid':
        return this.centroidSummarize(text, ratio);
      case 'mma':
        return this.mmaSummarize(text, ratio);
      case 'lexrank':
        return this._summarizeWithScores(text, this.lexrank(this._splitSentences(text)), ratio, 'lexrank');
      case 'kl':
        return this.klSummarize(text, ratio);
      case 'lsa':
        return this.lsaSummarize(text, ratio);
      default:
        return this.extractive(text, ratio);
    }
  }

  /**
   * Internal helper - summarize using a list of scored sentences
   */
  private _summarizeWithScores(text: string, scores: SentenceScore[], ratio: number, type: string): string {
    const sentences = this._splitSentences(text);
    const n = Math.max(1, Math.ceil(sentences.length * ratio));
    const top = scores
      .sort((a, b) => b.score - a.score)
      .slice(0, n)
      .sort((a, b) => a.position - b.position)
      .map(s => s.sentence)
      .join(' ');
    const result: Summary = {
      text: top,
      originalLength: text.length,
      compressedRatio: top.length / text.length,
      type
    };
    this._lastResult = result;
    this._summaries.push(result);
    return top;
  }

  /**
   * Extract keywords from text using TF-IDF
   */
  private _extractKeywords(text: string, n: number): string[] {
    const tfidfs = this.tfidf(text);
    return tfidfs.slice(0, n).map(t => t.word);
  }

  /**
   * Extract topic word from a sentence
   */
  private _extractTopic(sentence: string): string {
    const words = this._tokenize(sentence.toLowerCase())
      .filter(w => !this._stopwords.has(w) && w.length > 3);
    return words[0] || 'topic';
  }

  /**
   * Split text into sentences
   */
  private _splitSentences(text: string): string[] {
    return text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
  }

  /**
   * Tokenize text into words (lowercase, length > 2)
   */
  private _tokenize(text: string): string[] {
    return text.toLowerCase().match(/\b\w{2,}\b/g) || [];
  }

  /**
   * Compute n-grams of words
   */
  private _ngrams(words: string[], n: number): string[] {
    const result: string[] = [];
    for (let i = 0; i <= words.length - n; i++) {
      result.push(words.slice(i, i + n).join(' '));
    }
    return result;
  }

  /**
   * Compute longest common subsequence length
   */
  private _lcs(a: string[], b: string[]): number {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }
    return dp[m][n];
  }

  /**
   * Count syllables in a word
   */
  private _countSyllables(word: string): number {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  }

  /**
   * Compute cosine similarity between two sparse vector maps
   */
  private _cosineSimMaps(a: Map<string, number>, b: Map<string, number>): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (const [k, v] of a) {
      normA += v * v;
      if (b.has(k)) dot += v * b.get(k)!;
    }
    for (const [, v] of b) {
      normB += v * v;
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom > 0 ? dot / denom : 0;
  }

  /**
   * Generate a stable hash
   */
  private _hash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Serialize state
   */
  serialize(): string {
    return JSON.stringify({
      type: this._type,
      method: this._method,
      dampingFactor: this._dampingFactor,
      maxIterations: this._maxIterations,
      keywords: this._keywords,
      stopwords: Array.from(this._stopwords)
    });
  }

  /**
   * Deserialize state
   */
  deserialize(json: string): void {
    try {
      const obj = JSON.parse(json);
      if (obj.type) this._type = obj.type;
      if (obj.method) this._method = obj.method;
      if (obj.dampingFactor !== undefined) this._dampingFactor = obj.dampingFactor;
      if (obj.maxIterations) this._maxIterations = obj.maxIterations;
      if (obj.keywords) this._keywords = obj.keywords;
      if (obj.stopwords) {
        this._stopwords = new Set(obj.stopwords);
      }
    } catch {
      // Ignore parse errors
    }
  }

  /**
   * Wrap result in a DataPacket
   */
  toPacket(): DataPacket<Summary> {
    const result = this._lastResult || { text: '', originalLength: 0, compressedRatio: 0, type: '' };
    this._counter++;
    return {
      id: `summarizer-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['nlp', 'summarizer'],
        priority: 1,
        phase: 'summarization'
      }
    };
  }

  /**
   * Reset all state
   */
  reset(): void {
    this._summaries = [];
    this._type = 'extractive';
    this._counter = 0;
    this._sentenceScores = [];
    this._lastResult = null;
    this._keywords = [];
    this._method = 'extractive';
  }
}
