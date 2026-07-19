import { DataPacket } from '../shared/types';

export interface Summary {
  text: string;
  originalLength: number;
  compressedRatio: number;
  type: string;
}

export interface SentenceScore {
  sentence: string;
  score: number;
  position: number;
}

export class TextSummarizer {
  private _summaries: Summary[] = [];
  private _type: string = 'extractive';
  private _counter: number = 0;
  private _sentenceScores: SentenceScore[] = [];
  private _lastResult: Summary | null = null;

  get summaries(): Summary[] {
    return this._summaries;
  }

  get type(): string {
    return this._type;
  }

  get sentenceScores(): SentenceScore[] {
    return this._sentenceScores;
  }

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
    const result: Summary = {
      text: summary,
      originalLength: text.length,
      compressedRatio: summary.length / text.length,
      type: 'extractive'
    };
    this._lastResult = result;
    this._summaries.push(result);
    this._type = 'extractive';
    return summary;
  }

  abstractive(text: string, model: { name: string }): string {
    const sentences = this._splitSentences(text);
    const keySentences = this.textrank(sentences).slice(0, Math.ceil(sentences.length * 0.4));
    const words = keySentences.map(s => s.sentence).join(' ').split(/\s+/);
    const compressed = words.filter((_, i) => i % 2 === 0).join(' ');
    const result: Summary = {
      text: compressed,
      originalLength: text.length,
      compressedRatio: compressed.length / text.length,
      type: 'abstractive'
    };
    this._lastResult = result;
    this._summaries.push(result);
    this._type = 'abstractive';
    return compressed;
  }

  sentenceScoring(sentences: string[], method: string = 'tfidf'): SentenceScore[] {
    const allWords = sentences.map(s => s.toLowerCase().split(/\s+/).filter(w => w.length > 2));
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
          const tf = words.filter(w => w === word).length / words.length;
          const idf = Math.log(sentences.length / ((df.get(word) || 1)));
          score += tf * idf;
        }
      } else if (method === 'length') {
        score = words.length;
      } else if (method === 'position') {
        score = sentences.length - i;
      } else {
        score = words.length;
      }
      scores.push({ sentence: sentences[i], score, position: i });
    }
    const maxScore = Math.max(...scores.map(s => s.score)) || 1;
    const normalized = scores.map(s => ({ ...s, score: s.score / maxScore }));
    this._sentenceScores = normalized;
    return normalized;
  }

  textrank(sentences: string[]): SentenceScore[] {
    const n = sentences.length;
    const similarity: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
    const sentenceWords = sentences.map(s => new Set(s.toLowerCase().split(/\s+/).filter(w => w.length > 2)));
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const inter = [...sentenceWords[i]].filter(w => sentenceWords[j].has(w)).length;
        const union = sentenceWords[i].size + sentenceWords[j].size - inter;
        similarity[i][j] = union > 0 ? inter / union : 0;
        similarity[j][i] = similarity[i][j];
      }
    }
    let scores = new Array(n).fill(1 / n);
    const damping = 0.85;
    for (let iter = 0; iter < 20; iter++) {
      const newScores = new Array(n).fill((1 - damping) / n);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (i !== j) {
            const sumSim = similarity[j].reduce((a, b) => a + b, 0) || 1;
            newScores[i] += damping * (similarity[j][i] / sumSim) * scores[j];
          }
        }
      }
      scores = newScores;
    }
    const result = sentences.map((s, i) => ({
      sentence: s,
      score: scores[i],
      position: i
    }));
    this._sentenceScores = result;
    return result;
  }

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

  luhnSummarize(text: string, ratio: number = 0.3): string {
    const sentences = this._splitSentences(text);
    const allWords = text.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const wordFreq = new Map<string, number>();
    for (const word of allWords) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }
    const significantWords = [...wordFreq.entries()]
      .filter(([, f]) => f >= 2 && f <= allWords.length * 0.5)
      .map(([w]) => w);
    const scored = sentences.map((sent, idx) => {
      const words = sent.toLowerCase().split(/\s+/);
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

  tfidfSummarize(text: string, ratio: number = 0.3): string {
    return this.extractive(text, ratio);
  }

  centroidSummarize(text: string, ratio: number = 0.3): string {
    const sentences = this._splitSentences(text);
    const allWords = text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const wordFreq = new Map<string, number>();
    for (const word of allWords) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }
    const centroid = new Set([...wordFreq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, Math.ceil(allWords.length * 0.1))
      .map(([w]) => w));
    const scored = sentences.map((sent, idx) => {
      const words = sent.toLowerCase().split(/\s+/);
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

  queryFocused(text: string, query: string, ratio: number = 0.3): string {
    const sentences = this._splitSentences(text);
    const queryWords = new Set(query.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    const scored = sentences.map((sent, idx) => {
      const words = sent.toLowerCase().split(/\s+/);
      const overlap = words.filter(w => queryWords.has(w)).length;
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
      type: 'query-focused'
    };
    this._lastResult = result;
    this._summaries.push(result);
    return top;
  }

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

  private _splitSentences(text: string): string[] {
    const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
    return sentences;
  }

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

  reset(): void {
    this._summaries = [];
    this._type = 'extractive';
    this._counter = 0;
    this._sentenceScores = [];
    this._lastResult = null;
  }
}
