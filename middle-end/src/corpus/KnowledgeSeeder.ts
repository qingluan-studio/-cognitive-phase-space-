import { DataPacket, KnowledgeUnit } from '../shared/types';

export interface KnowledgeSeed {
  id: string;
  sourceDocId: string;
  content: string;
  type: 'fact' | 'concept' | 'relationship' | 'hypothesis' | 'insight';
  confidence: number;
  vector: number[];
  connections: string[];
  extractedAt: number;
  tags: string[];
}

export interface ExtractionRule {
  id: string;
  pattern: RegExp;
  type: KnowledgeSeed['type'];
  weight: number;
  enabled: boolean;
}

export interface SeedStats {
  totalSeeds: number;
  byType: Record<string, number>;
  avgConfidence: number;
  sourcesCount: number;
  connectionDensity: number;
}

export interface SeedCluster {
  id: string;
  seedIds: string[];
  centroid: number[];
  label: string;
  size: number;
  coherence: number;
}

export class KnowledgeSeeder {
  private _seeds: Map<string, KnowledgeSeed>;
  private _extractionRules: Map<string, ExtractionRule>;
  private _clusters: Map<string, SeedCluster>;
  private _sourceIndex: Map<string, string[]>;
  private _stats: SeedStats;
  private _history: KnowledgeSeed[];
  private _vectorDim: number;

  constructor(vectorDim: number = 32) {
    this._seeds = new Map();
    this._extractionRules = new Map();
    this._clusters = new Map();
    this._sourceIndex = new Map();
    this._vectorDim = vectorDim;
    this._stats = {
      totalSeeds: 0,
      byType: {},
      avgConfidence: 0,
      sourcesCount: 0,
      connectionDensity: 0
    };
    this._history = [];
    this._initializeRules();
  }

  get seedCount(): number { return this._seeds.size; }
  get clusterCount(): number { return this._clusters.size; }
  get stats(): SeedStats { return { ...this._stats, byType: { ...this._stats.byType } }; }
  get ruleCount(): number { return this._extractionRules.size; }
  get vectorDim(): number { return this._vectorDim; }
  get history(): KnowledgeSeed[] { return this._history.map(s => ({ ...s, vector: [...s.vector], connections: [...s.connections], tags: [...s.tags] })); }

  private _initializeRules(): void {
    const rules: ExtractionRule[] = [
      {
        id: 'rule.is_a',
        pattern: /\bis\b.*?\./gi,
        type: 'fact',
        weight: 0.7,
        enabled: true
      },
      {
        id: 'rule.concept',
        pattern: /\b(the|a|an)\s+\w+(\s+\w+){0,3}\bis\b/gi,
        type: 'concept',
        weight: 0.5,
        enabled: true
      },
      {
        id: 'rule.relationship',
        pattern: /\b(and|or|because|therefore|however)\b/gi,
        type: 'relationship',
        weight: 0.4,
        enabled: true
      },
      {
        id: 'rule.hypothesis',
        pattern: /\b(may|might|could|possibly|perhaps)\b/gi,
        type: 'hypothesis',
        weight: 0.3,
        enabled: true
      },
      {
        id: 'rule.insight',
        pattern: /\b(therefore|thus|hence|consequently|shows that)\b/gi,
        type: 'insight',
        weight: 0.6,
        enabled: true
      }
    ];

    for (const rule of rules) {
      this._extractionRules.set(rule.id, { ...rule, pattern: new RegExp(rule.pattern.source, rule.pattern.flags) });
    }
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

  public addRule(rule: ExtractionRule): void {
    this._extractionRules.set(rule.id, { ...rule, pattern: new RegExp(rule.pattern.source, rule.pattern.flags) });
  }

  public removeRule(ruleId: string): boolean {
    return this._extractionRules.delete(ruleId);
  }

  public extractFromText(docId: string, text: string, sourceTags: string[] = []): KnowledgeSeed[] {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const seeds: KnowledgeSeed[] = [];

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim();
      const matchedTypes: { type: KnowledgeSeed['type']; weight: number }[] = [];

      for (const rule of this._extractionRules.values()) {
        if (!rule.enabled) continue;
        rule.pattern.lastIndex = 0;
        const matches = sentence.match(rule.pattern);
        if (matches && matches.length > 0) {
          matchedTypes.push({ type: rule.type, weight: rule.weight * matches.length });
        }
      }

      if (matchedTypes.length > 0) {
        matchedTypes.sort((a, b) => b.weight - a.weight);
        const primaryType = matchedTypes[0].type;
        const confidence = Math.min(0.95, 0.4 + matchedTypes.reduce((sum, m) => sum + m.weight, 0) * 0.2);

        const seed: KnowledgeSeed = {
          id: `seed_${docId}_${i}_${Date.now()}`,
          sourceDocId: docId,
          content: sentence,
          type: primaryType,
          confidence,
          vector: this._textToVector(sentence),
          connections: [],
          extractedAt: Date.now(),
          tags: [...sourceTags, primaryType]
        };

        this._seeds.set(seed.id, seed);
        seeds.push(seed);
        this._history.push(seed);

        if (!this._sourceIndex.has(docId)) {
          this._sourceIndex.set(docId, []);
        }
        this._sourceIndex.get(docId)!.push(seed.id);
      }
    }

    this._findConnections(seeds);
    this._updateStats();
    return seeds;
  }

  private _findConnections(newSeeds: KnowledgeSeed[]): void {
    const allSeeds = Array.from(this._seeds.values());
    
    for (const seed of newSeeds) {
      for (const other of allSeeds) {
        if (seed.id === other.id) continue;
        
        const similarity = this._cosineSimilarity(seed.vector, other.vector);
        if (similarity > 0.6) {
          if (!seed.connections.includes(other.id)) {
            seed.connections.push(other.id);
          }
          if (!other.connections.includes(seed.id)) {
            other.connections.push(seed.id);
          }
        }
      }
    }
  }

  private _updateStats(): void {
    const seeds = Array.from(this._seeds.values());
    this._stats.totalSeeds = seeds.length;
    
    this._stats.byType = {};
    let totalConfidence = 0;
    
    for (const seed of seeds) {
      this._stats.byType[seed.type] = (this._stats.byType[seed.type] || 0) + 1;
      totalConfidence += seed.confidence;
    }
    
    this._stats.avgConfidence = seeds.length > 0 ? totalConfidence / seeds.length : 0;
    this._stats.sourcesCount = this._sourceIndex.size;
    
    const totalConnections = seeds.reduce((sum, s) => sum + s.connections.length, 0);
    const maxConnections = seeds.length * (seeds.length - 1);
    this._stats.connectionDensity = maxConnections > 0 ? totalConnections / maxConnections : 0;
  }

  public getSeed(seedId: string): KnowledgeSeed | undefined {
    return this._seeds.get(seedId);
  }

  public getSeedsByType(type: KnowledgeSeed['type']): KnowledgeSeed[] {
    return Array.from(this._seeds.values()).filter(s => s.type === type);
  }

  public getSeedsBySource(docId: string): KnowledgeSeed[] {
    const ids = this._sourceIndex.get(docId) || [];
    return ids.map(id => this._seeds.get(id)!).filter(Boolean);
  }

  public getConnectedSeeds(seedId: string): KnowledgeSeed[] {
    const seed = this._seeds.get(seedId);
    if (!seed) return [];
    return seed.connections.map(id => this._seeds.get(id)!).filter(Boolean);
  }

  public searchSeeds(query: string, limit: number = 10): KnowledgeSeed[] {
    const queryVector = this._textToVector(query);
    const scored: { seed: KnowledgeSeed; score: number }[] = [];

    for (const seed of this._seeds.values()) {
      const similarity = this._cosineSimilarity(queryVector, seed.vector);
      const contentMatch = seed.content.toLowerCase().includes(query.toLowerCase());
      const score = similarity * 0.6 + (contentMatch ? 0.4 : 0);
      if (score > 0.1) {
        scored.push({ seed, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(s => s.seed);
  }

  public buildClusters(minClusterSize: number = 3): SeedCluster[] {
    const seeds = Array.from(this._seeds.values());
    if (seeds.length < minClusterSize) return [];

    this._clusters.clear();
    const unclustered = new Set(seeds.map(s => s.id));
    let clusterCount = 0;

    while (unclustered.size >= minClusterSize) {
      let bestSeed: string | null = null;
      let bestNeighbors: string[] = [];
      let bestScore = 0;

      for (const seedId of unclustered) {
        const seed = this._seeds.get(seedId)!;
        const neighbors: string[] = [];
        let totalSim = 0;

        for (const otherId of unclustered) {
          if (otherId === seedId) continue;
          const other = this._seeds.get(otherId)!;
          const sim = this._cosineSimilarity(seed.vector, other.vector);
          if (sim > 0.5) {
            neighbors.push(otherId);
            totalSim += sim;
          }
        }

        const score = neighbors.length >= minClusterSize - 1 ? totalSim / neighbors.length : 0;
        if (score > bestScore) {
          bestScore = score;
          bestSeed = seedId;
          bestNeighbors = neighbors;
        }
      }

      if (!bestSeed || bestNeighbors.length < minClusterSize - 1) break;

      const clusterSeeds = [bestSeed, ...bestNeighbors.slice(0, 10)];
      const centroid = this._computeCentroid(clusterSeeds);
      
      const cluster: SeedCluster = {
        id: `cluster_${clusterCount++}`,
        seedIds: clusterSeeds,
        centroid,
        label: this._generateClusterLabel(clusterSeeds),
        size: clusterSeeds.length,
        coherence: bestScore
      };

      this._clusters.set(cluster.id, cluster);
      clusterSeeds.forEach(id => unclustered.delete(id));
    }

    return Array.from(this._clusters.values());
  }

  private _computeCentroid(seedIds: string[]): number[] {
    const centroid = new Array(this._vectorDim).fill(0);
    for (const id of seedIds) {
      const seed = this._seeds.get(id)!;
      for (let i = 0; i < this._vectorDim; i++) {
        centroid[i] += seed.vector[i];
      }
    }
    const n = seedIds.length;
    return centroid.map(v => v / n);
  }

  private _generateClusterLabel(seedIds: string[]): string {
    const wordFreq: Record<string, number> = {};
    for (const id of seedIds) {
      const seed = this._seeds.get(id)!;
      const words = seed.content.toLowerCase().split(/\W+/).filter(w => w.length > 3);
      for (const word of words) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    }
    const topWords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([word]) => word);
    return topWords.join('_') || 'cluster';
  }

  public getCluster(clusterId: string): SeedCluster | undefined {
    return this._clusters.get(clusterId);
  }

  public getSeedsInCluster(clusterId: string): KnowledgeSeed[] {
    const cluster = this._clusters.get(clusterId);
    if (!cluster) return [];
    return cluster.seedIds.map(id => this._seeds.get(id)!).filter(Boolean);
  }

  public mergeSeeds(seedIdA: string, seedIdB: string, newContent: string): KnowledgeSeed | null {
    const seedA = this._seeds.get(seedIdA);
    const seedB = this._seeds.get(seedIdB);
    if (!seedA || !seedB) return null;

    const merged: KnowledgeSeed = {
      id: `seed_merged_${Date.now()}`,
      sourceDocId: seedA.sourceDocId,
      content: newContent,
      type: seedA.confidence >= seedB.confidence ? seedA.type : seedB.type,
      confidence: Math.max(seedA.confidence, seedB.confidence) * 0.9,
      vector: this._textToVector(newContent),
      connections: Array.from(new Set([...seedA.connections, ...seedB.connections].filter(id => id !== seedIdA && id !== seedIdB))),
      extractedAt: Date.now(),
      tags: Array.from(new Set([...seedA.tags, ...seedB.tags]))
    };

    this._seeds.set(merged.id, merged);
    this._history.push(merged);
    
    for (const connId of merged.connections) {
      const conn = this._seeds.get(connId);
      if (conn && !conn.connections.includes(merged.id)) {
        conn.connections.push(merged.id);
      }
    }

    this._seeds.delete(seedIdA);
    this._seeds.delete(seedIdB);
    this._updateStats();

    return merged;
  }

  public extractKnowledgeUnit(seedId: string): KnowledgeUnit | null {
    const seed = this._seeds.get(seedId);
    if (!seed) return null;

    return {
      id: `seed_knowledge_${seedId}`,
      content: seed.content,
      vector: seed.vector.slice(0, 16),
      lineage: ['knowledge_seeder', seed.type, ...seed.tags]
    };
  }

  public exportSeederPacket(): DataPacket<SeedStats> {
    return {
      id: `seeder_packet_${Date.now()}`,
      payload: this.stats,
      metadata: {
        createdAt: Date.now(),
        route: ['corpus', 'knowledge_seeder'],
        priority: 2,
        phase: 'germination'
      }
    };
  }

  public reset(): void {
    this._seeds.clear();
    this._extractionRules.clear();
    this._clusters.clear();
    this._sourceIndex.clear();
    this._history = [];
    this._stats = {
      totalSeeds: 0,
      byType: {},
      avgConfidence: 0,
      sourcesCount: 0,
      connectionDensity: 0
    };
    this._initializeRules();
  }

  public exportSeeds(): KnowledgeSeed[] {
    return Array.from(this._seeds.values()).map(s => ({
      ...s,
      vector: [...s.vector],
      connections: [...s.connections],
      tags: [...s.tags]
    }));
  }
}
