import { DataPacket } from '../shared/types';

export interface MinedPattern {
  pattern: string;
  support: number;
  confidence: number;
  lift: number;
}

export interface MiningResult {
  patterns: MinedPattern[];
  stats: Record<string, number>;
}

export class TextMining {
  private _patterns: MinedPattern[] = [];
  private _stats: Record<string, number> = {};
  private _counter: number = 0;
  private _method: string = 'default';
  private _lastResult: MiningResult | null = null;

  get patterns(): MinedPattern[] {
    return this._patterns;
  }

  get stats(): Record<string, number> {
    return this._stats;
  }

  get method(): string {
    return this._method;
  }

  keywordExtraction(text: string, n: number = 10, method: string = 'tfidf'): string[] {
    const words = text.toLowerCase()
      .split(/\s+/)
      .map(w => w.replace(/[.,!?;:'"]/g, ''))
      .filter(w => w.length > 3);
    const freq = new Map<string, number>();
    for (const word of words) {
      freq.set(word, (freq.get(word) || 0) + 1);
    }
    const sorted = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([word]) => word);
    this._method = method;
    return sorted;
  }

  keyphraseExtraction(text: string, n: number = 5): string[] {
    const sentences = text.split(/(?<=[.!?])\s+/);
    const phrases: string[] = [];
    const wordFreq = new Map<string, number>();
    const words = text.toLowerCase().split(/\s+/).map(w => w.replace(/[.,!?;:'"]/g, ''));
    for (const word of words) {
      if (word.length > 2) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    }
    for (let i = 0; i < words.length - 1; i++) {
      const phrase = words[i] + ' ' + words[i + 1];
      const score = (wordFreq.get(words[i]) || 0) + (wordFreq.get(words[i + 1]) || 0);
      if (words[i].length > 2 && words[i + 1].length > 2 && score > 2) {
        if (!phrases.includes(phrase)) {
          phrases.push(phrase);
        }
      }
    }
    return phrases.slice(0, n);
  }

  topicModeling(documents: string[], n: number = 5, method: string = 'lda'): string[][] {
    const topics: string[][] = [];
    const allWords = new Set<string>();
    for (const doc of documents) {
      const words = doc.toLowerCase().split(/\s+/).map(w => w.replace(/[.,!?;:'"]/g, '')).filter(w => w.length > 3);
      words.forEach(w => allWords.add(w));
    }
    const wordList = Array.from(allWords);
    for (let t = 0; t < n; t++) {
      const topicWords: string[] = [];
      for (let i = 0; i < 10; i++) {
        const idx = (t * 7 + i * 13) % wordList.length;
        topicWords.push(wordList[idx]);
      }
      topics.push(topicWords);
    }
    this._method = method;
    return topics;
  }

  lda(documents: string[], topics: number = 5, iterations: number = 100): string[][] {
    return this.topicModeling(documents, topics, 'lda');
  }

  nmf(documents: string[], components: number = 5): string[][] {
    return this.topicModeling(documents, components, 'nmf');
  }

  clustering(docs: string[], algorithm: string = 'kmeans', n: number = 5): string[][] {
    const clusters: string[][] = [];
    for (let i = 0; i < n; i++) {
      clusters.push([]);
    }
    for (let i = 0; i < docs.length; i++) {
      const clusterIdx = i % n;
      clusters[clusterIdx].push(docs[i]);
    }
    this._method = algorithm;
    return clusters;
  }

  associationRuleMining(transactions: string[][], minsup: number = 0.5, minconf: number = 0.8): MinedPattern[] {
    const rules: MinedPattern[] = [];
    const itemCount = new Map<string, number>();
    const n = transactions.length;
    for (const transaction of transactions) {
      for (const item of transaction) {
        itemCount.set(item, (itemCount.get(item) || 0) + 1);
      }
    }
    const frequentItems = [...itemCount.entries()]
      .filter(([, count]) => count / n >= minsup)
      .map(([item]) => item);
    for (let i = 0; i < frequentItems.length; i++) {
      for (let j = i + 1; j < frequentItems.length; j++) {
        const a = frequentItems[i];
        const b = frequentItems[j];
        let abCount = 0;
        let aCount = 0;
        for (const transaction of transactions) {
          const hasA = transaction.includes(a);
          const hasB = transaction.includes(b);
          if (hasA) aCount++;
          if (hasA && hasB) abCount++;
        }
        const support = abCount / n;
        const confidence = aCount > 0 ? abCount / aCount : 0;
        const bSupport = (itemCount.get(b) || 0) / n;
        const lift = bSupport > 0 ? confidence / bSupport : 0;
        if (support >= minsup && confidence >= minconf) {
          rules.push({
            pattern: `${a} -> ${b}`,
            support,
            confidence,
            lift
          });
        }
      }
    }
    this._patterns = rules;
    return rules;
  }

  sequenceMining(sequences: string[][], minsup: number = 0.5): string[][] {
    const freqSeqs: string[][] = [];
    const itemCount = new Map<string, number>();
    const n = sequences.length;
    for (const seq of sequences) {
      const items = new Set(seq);
      for (const item of items) {
        itemCount.set(item, (itemCount.get(item) || 0) + 1);
      }
    }
    const freqItems = [...itemCount.entries()]
      .filter(([, count]) => count / n >= minsup)
      .map(([item]) => item);
    for (const item of freqItems) {
      freqSeqs.push([item]);
    }
    return freqSeqs;
  }

  conceptExtraction(text: string): string[] {
    const keywords = this.keywordExtraction(text, 10, 'frequency');
    return keywords;
  }

  entityLinking(entities: string[], knowledge: Map<string, string>): Map<string, string> {
    const linked = new Map<string, string>();
    for (const entity of entities) {
      let bestMatch = '';
      let bestSim = 0;
      for (const [k] of knowledge) {
        const sim = this._stringSimilarity(entity.toLowerCase(), k.toLowerCase());
        if (sim > bestSim) {
          bestSim = sim;
          bestMatch = k;
        }
      }
      if (bestSim > 0.6) {
        linked.set(entity, bestMatch);
      }
    }
    return linked;
  }

  textSegmentation(text: string, method: string = 'topic'): string[] {
    const sentences = text.split(/(?<=[.!?])\s+/);
    const segments: string[] = [];
    const segSize = Math.max(1, Math.floor(sentences.length / 5));
    for (let i = 0; i < sentences.length; i += segSize) {
      segments.push(sentences.slice(i, i + segSize).join(' '));
    }
    return segments;
  }

  textClustering(documents: string[], k: number = 5): string[][] {
    return this.clustering(documents, 'kmeans', k);
  }

  noveltyDetection(documents: string[]): number[] {
    const scores: number[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < documents.length; i++) {
      const words = new Set(
        documents[i].toLowerCase()
          .split(/\s+/)
          .map(w => w.replace(/[.,!?;:'"]/g, ''))
          .filter(w => w.length > 3)
      );
      let novelty = 0;
      for (const word of words) {
        if (!seen.has(word)) novelty++;
      }
      scores.push(novelty / Math.max(words.size, 1));
      words.forEach(w => seen.add(w));
    }
    return scores;
  }

  private _stringSimilarity(s1: string, s2: string): number {
    const maxLen = Math.max(s1.length, s2.length);
    if (maxLen === 0) return 1;
    const dist = this._levenshtein(s1, s2);
    return 1 - dist / maxLen;
  }

  private _levenshtein(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
        }
      }
    }
    return dp[m][n];
  }

  toPacket(): DataPacket<MiningResult> {
    const result = this._lastResult || { patterns: [], stats: {} };
    this._counter++;
    return {
      id: `text-mining-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['information-retrieval', 'text-mining'],
        priority: 1,
        phase: 'mining'
      }
    };
  }

  reset(): void {
    this._patterns = [];
    this._stats = {};
    this._counter = 0;
    this._method = 'default';
    this._lastResult = null;
  }
}
