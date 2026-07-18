import type { DataPacket, Signal, Handler } from '../shared/types';

export interface CompressionResult {
  original: string;
  compressed: string;
  compressionRatio: number;
  keyPoints: string[];
  summaryLength: number;
  originalLength: number;
}

export interface ExtractionResult {
  keywords: string[];
  keySentences: string[];
  entities: string[];
  topics: string[];
  sentiment: number;
}

export interface TranslationResult {
  source: string;
  target: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
  translatedText: string;
}

export interface CompressionOptions {
  targetRatio?: number;
  preserveEntities?: boolean;
  extractKeyPoints?: boolean;
  language?: string;
}

export class MeaningCompressor {
  private _compressionHistory: CompressionResult[];
  private _translationCache: Map<string, TranslationResult>;
  private _stopWords: Set<string>;
  private _defaultRatio: number;
  private _maxHistorySize: number;
  private _supportedLanguages: Set<string>;
  private _keywordWeights: Map<string, number>;

  constructor() {
    this._compressionHistory = [];
    this._translationCache = new Map();
    this._stopWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after',
      'above', 'below', 'between', 'out', 'off', 'over', 'under', 'again',
      'further', 'then', 'once', 'this', 'that', 'these', 'those', 'i',
      'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who',
      'whom', 'this', 'that', 'which', 'who', 'whom', 'whose'
    ]);
    this._defaultRatio = 0.3;
    this._maxHistorySize = 100;
    this._supportedLanguages = new Set(['en', 'zh', 'ja', 'fr', 'de', 'es']);
    this._keywordWeights = new Map();
  }

  get compressionHistory(): CompressionResult[] { return [...this._compressionHistory]; }
  get supportedLanguages(): string[] { return Array.from(this._supportedLanguages); }
  get defaultRatio(): number { return this._defaultRatio; }

  public setDefaultRatio(ratio: number): void {
    this._defaultRatio = Math.max(0.1, Math.min(0.9, ratio));
  }

  public addStopWords(words: string[]): void {
    for (const w of words) this._stopWords.add(w.toLowerCase());
  }

  public removeStopWords(words: string[]): void {
    for (const w of words) this._stopWords.delete(w.toLowerCase());
  }

  public compress(text: string, options: CompressionOptions = {}): CompressionResult {
    const targetRatio = options.targetRatio || this._defaultRatio;
    const sentences = this._splitSentences(text);
    const targetSentences = Math.max(1, Math.floor(sentences.length * targetRatio));

    const scoredSentences = sentences.map((s, idx) => ({
      sentence: s,
      index: idx,
      score: this._scoreSentence(s, text)
    }));

    scoredSentences.sort((a, b) => b.score - a.score);
    const topSentences = scoredSentences.slice(0, targetSentences);
    topSentences.sort((a, b) => a.index - b.index);

    const compressed = topSentences.map(s => s.sentence).join(' ');
    const keyPoints = options.extractKeyPoints
      ? topSentences.slice(0, 5).map(s => s.sentence.trim())
      : [];

    const result: CompressionResult = {
      original: text,
      compressed,
      compressionRatio: text.length > 0 ? compressed.length / text.length : 0,
      keyPoints,
      summaryLength: compressed.length,
      originalLength: text.length
    };

    this._compressionHistory.push(result);
    if (this._compressionHistory.length > this._maxHistorySize) {
      this._compressionHistory.shift();
    }

    return result;
  }

  private _splitSentences(text: string): string[] {
    const sentences = text.split(/[.!?。！？]+/);
    return sentences.map(s => s.trim()).filter(s => s.length > 0);
  }

  private _scoreSentence(sentence: string, fullText: string): number {
    const words = this._tokenize(sentence);
    const keywords = this._extractKeywords(fullText, 20);
    let score = 0;
    for (const word of words) {
      if (keywords.has(word.toLowerCase())) {
        score += 1;
      }
    }
    const lengthBonus = sentence.length > 20 && sentence.length < 200 ? 0.5 : 0;
    return score + lengthBonus;
  }

  private _tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fa5]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1 && !this._stopWords.has(w));
  }

  private _extractKeywords(text: string, limit: number): Set<string> {
    const words = this._tokenize(text);
    const freq = new Map<string, number>();
    for (const w of words) {
      freq.set(w, (freq.get(w) || 0) + 1);
    }
    const sorted = Array.from(freq.entries()).sort((a, b) => b[1] - a[1]);
    return new Set(sorted.slice(0, limit).map(s => s[0]));
  }

  public extract(text: string): ExtractionResult {
    const words = this._tokenize(text);
    const sentences = this._splitSentences(text);

    const freq = new Map<string, number>();
    for (const w of words) {
      if (!this._stopWords.has(w)) {
        freq.set(w, (freq.get(w) || 0) + 1);
      }
    }

    const keywords = Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(e => e[0]);

    const scoredSentences = sentences.map(s => ({
      sentence: s,
      score: this._scoreSentence(s, text)
    }));
    scoredSentences.sort((a, b) => b.score - a.score);
    const keySentences = scoredSentences.slice(0, 3).map(s => s.sentence.trim());

    const entities = this._extractEntities(text);
    const topics = this._detectTopics(keywords);
    const sentiment = this._analyzeSentiment(text);

    return {
      keywords,
      keySentences,
      entities,
      topics,
      sentiment
    };
  }

  private _extractEntities(text: string): string[] {
    const entities: string[] = [];
    const capitalizedWords = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
    if (capitalizedWords) {
      for (const word of capitalizedWords) {
        if (word.split(' ').length <= 3 && !this._stopWords.has(word.toLowerCase().split(' ')[0])) {
          entities.push(word);
        }
      }
    }
    return [...new Set(entities)].slice(0, 10);
  }

  private _detectTopics(keywords: string[]): string[] {
    const topics: string[] = [];
    const topicClusters = [
      { keywords: ['code', 'function', 'class', 'method', 'programming', 'software', 'developer'], topic: 'technology' },
      { keywords: ['data', 'analysis', 'statistics', 'research', 'study', 'data'], topic: 'research' },
      { keywords: ['business', 'market', 'company', 'product', 'customer', 'revenue'], topic: 'business' },
      { keywords: ['health', 'medical', 'patient', 'treatment', 'disease'], topic: 'healthcare' },
      { keywords: ['education', 'learning', 'student', 'teacher', 'school'], topic: 'education' }
    ];
    for (const cluster of topicClusters) {
      const matches = keywords.filter(k => cluster.keywords.includes(k.toLowerCase()));
      if (matches.length >= 2) {
        topics.push(cluster.topic);
      }
    }
    return topics;
  }

  private _analyzeSentiment(text: string): number {
    const positiveWords = new Set(['good', 'great', 'excellent', 'amazing', 'wonderful', 'best', 'love', 'happy', 'positive', 'success']);
    const negativeWords = new Set(['bad', 'terrible', 'awful', 'worst', 'hate', 'sad', 'negative', 'failure', 'problem', 'error']);
    const words = this._tokenize(text);
    let score = 0;
    for (const w of words) {
      if (positiveWords.has(w)) score++;
      if (negativeWords.has(w)) score--;
    }
    return words.length > 0 ? score / Math.sqrt(words.length) : 0;
  }

  public translate(text: string, sourceLang: string, targetLang: string): TranslationResult {
    const cacheKey = `${sourceLang}:${targetLang}:${text.substring(0, 100)}`;
    const cached = this._translationCache.get(cacheKey);
    if (cached) return { ...cached };

    const translated = this._simulateTranslation(text, sourceLang, targetLang);
    const result: TranslationResult = {
      source: text,
      target: translated,
      sourceLanguage: sourceLang,
      targetLanguage: targetLang,
      confidence: 0.85,
      translatedText: translated
    };

    this._translationCache.set(cacheKey, { ...result });
    if (this._translationCache.size > 200) {
      const firstKey = this._translationCache.keys().next().value;
      if (firstKey) this._translationCache.delete(firstKey);
    }

    return result;
  }

  private _simulateTranslation(text: string, source: string, target: string): string {
    if (source === target) return text;
    const prefix = `[${source}→${target}] `;
    return prefix + text;
  }

  public summarize(text: string, maxLength: number = 200): string {
    const sentences = this._splitSentences(text);
    if (sentences.length === 0) return '';
    let result = '';
    for (const sentence of sentences) {
      if ((result + ' ' + sentence).length <= maxLength) {
        result = result ? result + ' ' + sentence : sentence;
      } else {
        break;
      }
    }
    return result.trim();
  }

  public refine(text: string): string {
    let refined = text.replace(/\s+/g, ' ').trim();
    refined = refined.replace(/\.\s*\./g, '.');
    refined = refined.replace(/,\s*,/g, ',');
    return refined;
  }

  public detectSignalFromText(text: string): Signal {
    const extraction = this.extract(text);
    const density = extraction.keywords.length / Math.max(1, text.split(' ').length);
    return {
      source: 'meaning-compressor',
      magnitude: Math.min(1, extraction.keySentences.length / 3),
      entropy: 1 - Math.min(1, density * 10),
      timestamp: Date.now()
    };
  }

  public processPacket(packet: DataPacket<string>): DataPacket<CompressionResult> {
    const compressed = this.compress(packet.payload);
    return {
      id: `cmp-${packet.id}`,
      payload: compressed,
      metadata: {
        createdAt: Date.now(),
        route: [...packet.metadata.route, 'meaning-compressor'],
        priority: packet.metadata.priority,
        phase: 'compressed'
      }
    };
  }

  public getCompressionStats(): { avgRatio: number; totalCompressed: number } {
    if (this._compressionHistory.length === 0) {
      return { avgRatio: 0, totalCompressed: 0 };
    }
    const avgRatio = this._compressionHistory.reduce((sum, r) => sum + r.compressionRatio, 0)
      / this._compressionHistory.length;
    const totalCompressed = this._compressionHistory.reduce(
      (sum, r) => sum + (r.originalLength - r.summaryLength), 0
    );
    return { avgRatio, totalCompressed };
  }

  public clearHistory(): void {
    this._compressionHistory = [];
    this._translationCache.clear();
  }

  public reset(): void {
    this._compressionHistory = [];
    this._translationCache.clear();
    this._keywordWeights.clear();
  }
}
