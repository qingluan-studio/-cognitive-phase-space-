import { DataPacket, KnowledgeUnit } from '../shared/types';

export interface FermentedInsight {
  id: string;
  content: string;
  seedIds: string[];
  generation: number;
  type: 'synthesis' | 'analogy' | 'question' | 'hypothesis' | 'implication';
  novelty: number;
  coherence: number;
  support: number;
  vector: number[];
  createdAt: number;
  tags: string[];
}

export interface FermentationConfig {
  temperature: number;
  duration: number;
  mixingRate: number;
  crossoverRate: number;
  noveltyBias: number;
  maxGenerations: number;
}

export interface FermentationState {
  currentGeneration: number;
  insightsCount: number;
  averageNovelty: number;
  averageCoherence: number;
  activeSeeds: number;
  fermenting: boolean;
}

export interface InsightConnection {
  insightA: string;
  insightB: string;
  strength: number;
  type: 'supports' | 'contradicts' | 'extends' | 'analogous_to';
}

export class SemanticFermenter {
  private _insights: Map<string, FermentedInsight>;
  private _seeds: Map<string, { content: string; vector: number[]; type: string }>;
  private _connections: Map<string, InsightConnection[]>;
  private _config: FermentationConfig;
  private _state: FermentationState;
  private _history: FermentedInsight[];
  private _vectorDim: number;
  private _generationLogs: FermentationState[];

  constructor(vectorDim: number = 32) {
    this._insights = new Map();
    this._seeds = new Map();
    this._connections = new Map();
    this._vectorDim = vectorDim;
    this._config = {
      temperature: 0.5,
      duration: 10,
      mixingRate: 0.6,
      crossoverRate: 0.7,
      noveltyBias: 0.4,
      maxGenerations: 10
    };
    this._state = {
      currentGeneration: 0,
      insightsCount: 0,
      averageNovelty: 0,
      averageCoherence: 0,
      activeSeeds: 0,
      fermenting: false
    };
    this._history = [];
    this._generationLogs = [];
  }

  get insightCount(): number { return this._insights.size; }
  get seedCount(): number { return this._seeds.size; }
  get config(): FermentationConfig { return { ...this._config }; }
  get state(): FermentationState { return { ...this._state }; }
  get vectorDim(): number { return this._vectorDim; }
  get history(): FermentedInsight[] { return this._history.map(i => ({ ...i, vector: [...i.vector], seedIds: [...i.seedIds], tags: [...i.tags] })); }

  public setConfig(config: Partial<FermentationConfig>): void {
    this._config = { ...this._config, ...config };
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
        const prev = words[i - 1];
        let bigramHash = 0;
        const bigram = prev + '_' + word;
        for (let j = 0; j < bigram.length; j++) {
          bigramHash = ((bigramHash << 5) - bigramHash + bigram.charCodeAt(j));
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

  public addSeed(seedId: string, content: string, type: string = 'fact'): void {
    this._seeds.set(seedId, {
      content,
      vector: this._textToVector(content),
      type
    });
    this._state.activeSeeds = this._seeds.size;
  }

  public addSeeds(seeds: Array<{ id: string; content: string; type: string }>): void {
    for (const seed of seeds) {
      this.addSeed(seed.id, seed.content, seed.type);
    }
  }

  public ferment(generations: number = 5): FermentationState {
    this._state.fermenting = true;

    for (let g = 0; g < generations; g++) {
      if (this._state.currentGeneration >= this._config.maxGenerations) break;
      
      this._state.currentGeneration++;
      this._runFermentationCycle();
      this._logGeneration();
    }

    this._state.fermenting = false;
    return { ...this._state };
  }

  private _runFermentationCycle(): void {
    const seedEntries = Array.from(this._seeds.entries());
    const insightEntries = Array.from(this._insights.entries());
    const allItems = [
      ...seedEntries.map(([id, s]) => ({ id, vector: s.vector, content: s.content, type: s.type, isSeed: true })),
      ...insightEntries.map(([id, i]) => ({ id, vector: i.vector, content: i.content, type: i.type, isSeed: false }))
    ];

    if (allItems.length < 2) return;

    const newInsights: FermentedInsight[] = [];
    const mixCount = Math.floor(allItems.length * this._config.mixingRate);

    for (let i = 0; i < mixCount; i++) {
      const idxA = Math.floor(Math.random() * allItems.length);
      let idxB = Math.floor(Math.random() * allItems.length);
      while (idxB === idxA && allItems.length > 1) {
        idxB = Math.floor(Math.random() * allItems.length);
      }

      const itemA = allItems[idxA];
      const itemB = allItems[idxB];

      if (Math.random() < this._config.crossoverRate) {
        const insight = this._crossoverInsight(itemA, itemB);
        if (insight) {
          newInsights.push(insight);
        }
      } else {
        const insight = this._mutateInsight(itemA);
        if (insight) {
          newInsights.push(insight);
        }
      }
    }

    for (const insight of newInsights) {
      this._insights.set(insight.id, insight);
      this._history.push(insight);
      this._findConnections(insight);
    }

    this._pruneInsights();
    this._updateState();
  }

  private _crossoverInsight(
    a: { id: string; vector: number[]; content: string; type: string },
    b: { id: string; vector: number[]; content: string; type: string }
  ): FermentedInsight | null {
    const similarity = this._cosineSimilarity(a.vector, b.vector);
    const temperature = this._config.temperature;
    
    const noveltyBase = 1 - similarity;
    const novelty = Math.min(0.95, noveltyBase * (0.5 + temperature * 0.5) + this._config.noveltyBias * 0.3);
    const coherence = Math.max(0.1, similarity * (1 - temperature * 0.5));
    const support = similarity * 0.8;

    const crossoverPoint = Math.floor(this._vectorDim * (0.3 + Math.random() * 0.4));
    const newVector = new Array(this._vectorDim).fill(0);
    for (let i = 0; i < this._vectorDim; i++) {
      if (i < crossoverPoint) {
        newVector[i] = a.vector[i];
      } else {
        newVector[i] = b.vector[i];
      }
    }

    const norm = Math.sqrt(newVector.reduce((sum, v) => sum + v * v, 0));
    if (norm > 0) {
      for (let i = 0; i < this._vectorDim; i++) {
        newVector[i] /= norm;
      }
    }

    const types: FermentedInsight['type'][] = ['synthesis', 'analogy', 'hypothesis', 'implication'];
    const type = types[Math.floor(Math.random() * types.length)];

    const insight: FermentedInsight = {
      id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      content: this._generateSynthesisContent(a.content, b.content, type),
      seedIds: [a.id, b.id],
      generation: this._state.currentGeneration,
      type,
      novelty,
      coherence,
      support,
      vector: newVector,
      createdAt: Date.now(),
      tags: [type, `gen_${this._state.currentGeneration}`]
    };

    return insight;
  }

  private _mutateInsight(item: { id: string; vector: number[]; content: string; type: string }): FermentedInsight | null {
    const mutationAmount = this._config.temperature * 0.3;
    const newVector = [...item.vector];
    
    for (let i = 0; i < this._vectorDim; i++) {
      if (Math.random() < 0.3) {
        newVector[i] += (Math.random() - 0.5) * mutationAmount;
      }
    }

    const norm = Math.sqrt(newVector.reduce((sum, v) => sum + v * v, 0));
    if (norm > 0) {
      for (let i = 0; i < this._vectorDim; i++) {
        newVector[i] /= norm;
      }
    }

    const novelty = Math.min(0.9, mutationAmount * 2);
    const coherence = 1 - mutationAmount * 0.5;

    const insight: FermentedInsight = {
      id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      content: this._mutateContent(item.content, mutationAmount),
      seedIds: [item.id],
      generation: this._state.currentGeneration,
      type: 'hypothesis',
      novelty,
      coherence,
      support: 0.3,
      vector: newVector,
      createdAt: Date.now(),
      tags: ['mutated', `gen_${this._state.currentGeneration}`]
    };

    return insight;
  }

  private _generateSynthesisContent(contentA: string, contentB: string, type: string): string {
    const wordsA = contentA.split(/\s+/);
    const wordsB = contentB.split(/\s+/);
    
    const prefixes = {
      synthesis: 'The synthesis suggests that ',
      analogy: 'By analogy, ',
      hypothesis: 'It may be hypothesized that ',
      implication: 'This implies that ',
      question: 'This raises the question: '
    };

    const prefix = prefixes[type as keyof typeof prefixes] || 'The combination suggests that ';
    const combined = wordsA.slice(0, Math.floor(wordsA.length * 0.6)).join(' ') + 
                     ' and ' + 
                     wordsB.slice(Math.floor(wordsB.length * 0.4)).join(' ');
    
    return prefix + combined.toLowerCase() + '.';
  }

  private _mutateContent(content: string, mutationAmount: number): string {
    const words = content.split(/\s+/);
    const mutated = [...words];
    const mutateCount = Math.max(1, Math.floor(words.length * mutationAmount * 0.3));
    
    for (let i = 0; i < mutateCount; i++) {
      const idx = Math.floor(Math.random() * mutated.length);
      mutated[idx] = 'transformed';
    }
    
    return 'Reconsidered: ' + mutated.join(' ');
  }

  private _findConnections(insight: FermentedInsight): void {
    const connections: InsightConnection[] = [];

    for (const [id, other] of this._insights) {
      if (id === insight.id) continue;
      
      const similarity = this._cosineSimilarity(insight.vector, other.vector);
      if (similarity > 0.5) {
        const type: InsightConnection['type'] = 
          similarity > 0.8 ? 'supports' :
          similarity > 0.65 ? 'extends' :
          similarity > 0.55 ? 'analogous_to' : 'contradicts';

        connections.push({
          insightA: insight.id,
          insightB: id,
          strength: similarity,
          type
        });
      }
    }

    if (connections.length > 0) {
      this._connections.set(insight.id, connections);
    }
  }

  private _pruneInsights(): void {
    const allInsights = Array.from(this._insights.values());
    if (allInsights.length < 50) return;

    const scored = allInsights.map(insight => {
      const score = 
        insight.novelty * this._config.noveltyBias +
        insight.coherence * 0.3 +
        insight.support * 0.3;
      return { insight, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const keepCount = Math.floor(allInsights.length * 0.8);
    
    for (let i = keepCount; i < scored.length; i++) {
      const id = scored[i].insight.id;
      this._insights.delete(id);
      this._connections.delete(id);
    }

    for (const [id, conns] of this._connections) {
      this._connections.set(id, conns.filter(c => this._insights.has(c.insightB)));
    }
  }

  private _updateState(): void {
    const insights = Array.from(this._insights.values());
    this._state.insightsCount = insights.length;

    if (insights.length > 0) {
      this._state.averageNovelty = insights.reduce((sum, i) => sum + i.novelty, 0) / insights.length;
      this._state.averageCoherence = insights.reduce((sum, i) => sum + i.coherence, 0) / insights.length;
    }
  }

  private _logGeneration(): void {
    this._generationLogs.push({ ...this._state });
  }

  public getInsight(insightId: string): FermentedInsight | undefined {
    return this._insights.get(insightId);
  }

  public getInsightsByType(type: FermentedInsight['type']): FermentedInsight[] {
    return Array.from(this._insights.values()).filter(i => i.type === type);
  }

  public getInsightsByGeneration(generation: number): FermentedInsight[] {
    return Array.from(this._insights.values()).filter(i => i.generation === generation);
  }

  public getTopInsights(count: number = 10, by: 'novelty' | 'coherence' | 'support' = 'novelty'): FermentedInsight[] {
    return Array.from(this._insights.values())
      .sort((a, b) => b[by] - a[by])
      .slice(0, count);
  }

  public getConnections(insightId: string): InsightConnection[] {
    return this._connections.get(insightId) || [];
  }

  public searchInsights(query: string, limit: number = 10): FermentedInsight[] {
    const queryVector = this._textToVector(query);
    const scored: { insight: FermentedInsight; score: number }[] = [];

    for (const insight of this._insights.values()) {
      const similarity = this._cosineSimilarity(queryVector, insight.vector);
      const contentMatch = insight.content.toLowerCase().includes(query.toLowerCase());
      const score = similarity * 0.5 + (contentMatch ? 0.5 : 0);
      if (score > 0.1) {
        scored.push({ insight, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(s => s.insight);
  }

  public getFitnessTrend(): { generation: number; novelty: number; coherence: number }[] {
    return this._generationLogs.map((g, i) => ({
      generation: i,
      novelty: g.averageNovelty,
      coherence: g.averageCoherence
    }));
  }

  public extractKnowledgeUnit(insightId: string): KnowledgeUnit | null {
    const insight = this._insights.get(insightId);
    if (!insight) return null;

    return {
      id: `fermented_knowledge_${insightId}`,
      content: insight.content,
      vector: insight.vector.slice(0, 16),
      lineage: ['semantic_fermenter', insight.type, ...insight.tags]
    };
  }

  public exportFermenterPacket(): DataPacket<FermentationState> {
    return {
      id: `fermenter_packet_${Date.now()}`,
      payload: { ...this._state },
      metadata: {
        createdAt: Date.now(),
        route: ['corpus', 'semantic_fermenter'],
        priority: 2,
        phase: 'fermentation'
      }
    };
  }

  public reset(): void {
    this._insights.clear();
    this._seeds.clear();
    this._connections.clear();
    this._history = [];
    this._generationLogs = [];
    this._state = {
      currentGeneration: 0,
      insightsCount: 0,
      averageNovelty: 0,
      averageCoherence: 0,
      activeSeeds: 0,
      fermenting: false
    };
  }

  public exportInsights(): FermentedInsight[] {
    return Array.from(this._insights.values()).map(i => ({
      ...i,
      vector: [...i.vector],
      seedIds: [...i.seedIds],
      tags: [...i.tags]
    }));
  }
}
