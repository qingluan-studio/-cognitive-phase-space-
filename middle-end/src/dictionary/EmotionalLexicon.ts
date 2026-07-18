import { KnowledgeUnit, Signal } from '../shared/types';

export type EmotionPolarity = 'positive' | 'negative' | 'neutral' | 'ambivalent';

export interface EmotionWord {
  word: string;
  polarity: EmotionPolarity;
  intensity: number;
  arousal: number;
  valence: number;
  dominance: number;
  categories: string[];
  synonyms: string[];
  antonyms: string[];
}

export interface CoOccurrenceEdge {
  wordA: string;
  wordB: string;
  weight: number;
  contexts: string[];
}

export interface EmotionCluster {
  id: string;
  name: string;
  centerWord: string;
  members: string[];
  centroidValence: number;
  centroidArousal: number;
  coherence: number;
}

export interface IEmotionalLexicon {
  size: number;
  addWord(word: EmotionWord): void;
  getWord(word: string): EmotionWord | undefined;
  computeSentiment(textWords: string[]): { valence: number; arousal: number; dominance: number };
  findCoOccurring(word: string, threshold: number): { word: string; weight: number }[];
  clusterEmotions(k: number): EmotionCluster[];
  getPolarityWords(polarity: EmotionPolarity): string[];
}

export class EmotionalLexicon implements IEmotionalLexicon {
  private _words: Map<string, EmotionWord>;
  private _coOccurrence: Map<string, Map<string, number>>;
  private _edges: CoOccurrenceEdge[];
  private _polarityIndex: Map<EmotionPolarity, string[]>;
  private _categoryIndex: Map<string, string[]>;
  private _sentimentHistory: { words: string[]; score: { valence: number; arousal: number; dominance: number } }[];
  private _maxHistorySize: number;

  constructor() {
    this._words = new Map();
    this._coOccurrence = new Map();
    this._edges = [];
    this._polarityIndex = new Map([
      ['positive', []],
      ['negative', []],
      ['neutral', []],
      ['ambivalent', []]
    ]);
    this._categoryIndex = new Map();
    this._sentimentHistory = [];
    this._maxHistorySize = 100;
  }

  get size(): number { return this._words.size; }
  get edgeCount(): number { return this._edges.length; }
  get categoryCount(): number { return this._categoryIndex.size; }
  get sentimentHistory(): { words: string[]; score: { valence: number; arousal: number; dominance: number } }[] {
    return [...this._sentimentHistory];
  }

  public addWord(word: EmotionWord): void {
    this._words.set(word.word, word);
    const polarityList = this._polarityIndex.get(word.polarity)!;
    if (!polarityList.includes(word.word)) {
      polarityList.push(word.word);
    }
    for (const cat of word.categories) {
      if (!this._categoryIndex.has(cat)) {
        this._categoryIndex.set(cat, []);
      }
      const catList = this._categoryIndex.get(cat)!;
      if (!catList.includes(word.word)) {
        catList.push(word.word);
      }
    }
  }

  public getWord(word: string): EmotionWord | undefined {
    const entry = this._words.get(word);
    return entry ? { ...entry, categories: [...entry.categories], synonyms: [...entry.synonyms], antonyms: [...entry.antonyms] } : undefined;
  }

  public addCoOccurrence(wordA: string, wordB: string, weight: number = 1.0, context: string = 'default'): void {
    if (!this._words.has(wordA) || !this._words.has(wordB)) return;
    if (!this._coOccurrence.has(wordA)) {
      this._coOccurrence.set(wordA, new Map());
    }
    if (!this._coOccurrence.has(wordB)) {
      this._coOccurrence.set(wordB, new Map());
    }
    const mapA = this._coOccurrence.get(wordA)!;
    const mapB = this._coOccurrence.get(wordB)!;
    mapA.set(wordB, (mapA.get(wordB) || 0) + weight);
    mapB.set(wordA, (mapB.get(wordA) || 0) + weight);
    const existingEdge = this._edges.find(e =>
      (e.wordA === wordA && e.wordB === wordB) || (e.wordA === wordB && e.wordB === wordA)
    );
    if (existingEdge) {
      existingEdge.weight += weight;
      if (!existingEdge.contexts.includes(context)) {
        existingEdge.contexts.push(context);
      }
    } else {
      this._edges.push({ wordA, wordB, weight, contexts: [context] });
    }
  }

  public computeSentiment(textWords: string[]): { valence: number; arousal: number; dominance: number } {
    let totalWeight = 0;
    let valence = 0;
    let arousal = 0;
    let dominance = 0;
    const seen = new Set<string>();
    for (const w of textWords) {
      const word = this._words.get(w);
      if (word && !seen.has(w)) {
        seen.add(w);
        const boost = this._computeContextBoost(w, textWords);
        const weight = word.intensity * boost;
        valence += word.valence * weight;
        arousal += word.arousal * weight;
        dominance += word.dominance * weight;
        totalWeight += weight;
      }
    }
    const result = totalWeight > 0
      ? { valence: valence / totalWeight, arousal: arousal / totalWeight, dominance: dominance / totalWeight }
      : { valence: 0, arousal: 0, dominance: 0 };
    this._sentimentHistory.push({ words: [...textWords], score: { ...result } });
    if (this._sentimentHistory.length > this._maxHistorySize) {
      this._sentimentHistory.shift();
    }
    return result;
  }

  private _computeContextBoost(word: string, context: string[]): number {
    const coMap = this._coOccurrence.get(word);
    if (!coMap) return 1;
    let boost = 1;
    for (const ctxWord of context) {
      if (ctxWord === word) continue;
      const weight = coMap.get(ctxWord);
      if (weight !== undefined) {
        boost += weight * 0.1;
      }
    }
    return Math.min(boost, 2.5);
  }

  public findCoOccurring(word: string, threshold: number = 0.1): { word: string; weight: number }[] {
    const coMap = this._coOccurrence.get(word);
    if (!coMap) return [];
    const results: { word: string; weight: number }[] = [];
    let maxWeight = 0;
    for (const [, w] of coMap) {
      if (w > maxWeight) maxWeight = w;
    }
    for (const [w, weight] of coMap) {
      const normalized = maxWeight > 0 ? weight / maxWeight : 0;
      if (normalized >= threshold) {
        results.push({ word: w, weight: normalized });
      }
    }
    results.sort((a, b) => b.weight - a.weight);
    return results;
  }

  public getPolarityWords(polarity: EmotionPolarity): string[] {
    return [...(this._polarityIndex.get(polarity) || [])];
  }

  public getCategoryWords(category: string): string[] {
    return [...(this._categoryIndex.get(category) || [])];
  }

  public findSynonyms(word: string, depth: number = 1): string[] {
    const results = new Set<string>();
    const queue: { word: string; depth: number }[] = [{ word, depth: 0 }];
    const visited = new Set<string>();
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current.word)) continue;
      visited.add(current.word);
      const entry = this._words.get(current.word);
      if (entry) {
        for (const syn of entry.synonyms) {
          if (!visited.has(syn)) {
            results.add(syn);
            if (current.depth < depth - 1) {
              queue.push({ word: syn, depth: current.depth + 1 });
            }
          }
        }
      }
    }
    return Array.from(results);
  }

  public findAntonyms(word: string): string[] {
    const entry = this._words.get(word);
    if (!entry) return [];
    return [...entry.antonyms];
  }

  public clusterEmotions(k: number = 5): EmotionCluster[] {
    const words = Array.from(this._words.keys());
    if (words.length < k) return [];
    const centroids: string[] = [];
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    for (let i = 0; i < k; i++) {
      centroids.push(shuffled[i]);
    }
    let assignments = new Map<string, number>();
    for (let iter = 0; iter < 20; iter++) {
      for (const w of words) {
        let bestCluster = 0;
        let bestSim = -Infinity;
        for (let c = 0; c < k; c++) {
          const sim = this._computeWordSimilarity(w, centroids[c]);
          if (sim > bestSim) {
            bestSim = sim;
            bestCluster = c;
          }
        }
        assignments.set(w, bestCluster);
      }
      for (let c = 0; c < k; c++) {
        const clusterWords = words.filter(w => assignments.get(w) === c);
        if (clusterWords.length > 0) {
          let maxCentrality = -Infinity;
          let centerWord = clusterWords[0];
          for (const w of clusterWords) {
            let centrality = 0;
            for (const other of clusterWords) {
              centrality += this._computeWordSimilarity(w, other);
            }
            centrality /= clusterWords.length;
            if (centrality > maxCentrality) {
              maxCentrality = centrality;
              centerWord = w;
            }
          }
          centroids[c] = centerWord;
        }
      }
    }
    const clusters: EmotionCluster[] = [];
    for (let c = 0; c < k; c++) {
      const members = words.filter(w => assignments.get(w) === c);
      const centerWord = centroids[c];
      const centerEntry = this._words.get(centerWord);
      if (!centerEntry || members.length === 0) continue;
      let totalValence = 0;
      let totalArousal = 0;
      let coherence = 0;
      for (const m of members) {
        const entry = this._words.get(m)!;
        totalValence += entry.valence;
        totalArousal += entry.arousal;
        coherence += this._computeWordSimilarity(m, centerWord);
      }
      clusters.push({
        id: `cluster-${c}`,
        name: `Emotion Cluster ${c} (${centerWord})`,
        centerWord,
        members,
        centroidValence: totalValence / members.length,
        centroidArousal: totalArousal / members.length,
        coherence: coherence / members.length
      });
    }
    return clusters;
  }

  private _computeWordSimilarity(wordA: string, wordB: string): number {
    const a = this._words.get(wordA);
    const b = this._words.get(wordB);
    if (!a || !b) return 0;
    const valenceDist = Math.abs(a.valence - b.valence);
    const arousalDist = Math.abs(a.arousal - b.arousal);
    const dominanceDist = Math.abs(a.dominance - b.dominance);
    const catA = new Set(a.categories);
    const catB = new Set(b.categories);
    let catOverlap = 0;
    for (const c of catA) {
      if (catB.has(c)) catOverlap++;
    }
    const catUnion = catA.size + catB.size - catOverlap;
    const catSim = catUnion > 0 ? catOverlap / catUnion : 0;
    const distSim = 1 - (valenceDist + arousalDist + dominanceDist) / 6;
    return distSim * 0.6 + catSim * 0.4;
  }

  public detectEmotionShift(wordsA: string[], wordsB: string[]): { shift: number; dimension: string } {
    const sentA = this.computeSentiment(wordsA);
    const sentB = this.computeSentiment(wordsB);
    const valenceShift = Math.abs(sentB.valence - sentA.valence);
    const arousalShift = Math.abs(sentB.arousal - sentA.arousal);
    const dominanceShift = Math.abs(sentB.dominance - sentA.dominance);
    const totalShift = valenceShift + arousalShift + dominanceShift;
    let dimension = 'valence';
    let maxShift = valenceShift;
    if (arousalShift > maxShift) { maxShift = arousalShift; dimension = 'arousal'; }
    if (dominanceShift > maxShift) { maxShift = dominanceShift; dimension = 'dominance'; }
    return { shift: totalShift / 3, dimension };
  }

  public toKnowledgeUnit(word: string): KnowledgeUnit | null {
    const entry = this._words.get(word);
    if (!entry) return null;
    const vector = [entry.valence, entry.arousal, entry.dominance, entry.intensity];
    return {
      id: `emotion-${word}`,
      content: word,
      vector,
      lineage: entry.categories
    };
  }

  public toSignal(word: string): Signal | null {
    const entry = this._words.get(word);
    if (!entry) return null;
    return {
      source: `emotion-${word}`,
      magnitude: entry.intensity,
      entropy: entry.polarity === 'ambivalent' ? 1 : entry.polarity === 'neutral' ? 0.5 : 0.2,
      timestamp: Date.now()
    };
  }

  public reset(): void {
    this._words.clear();
    this._coOccurrence.clear();
    this._edges = [];
    this._polarityIndex.set('positive', []);
    this._polarityIndex.set('negative', []);
    this._polarityIndex.set('neutral', []);
    this._polarityIndex.set('ambivalent', []);
    this._categoryIndex.clear();
    this._sentimentHistory = [];
  }
}
