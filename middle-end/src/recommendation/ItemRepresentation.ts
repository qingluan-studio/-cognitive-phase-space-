import { DataPacket } from '../shared/types';

export interface ItemFeature {
  name: string;
  value: string | number | boolean;
  type: 'categorical' | 'numerical' | 'boolean' | 'text' | 'ordinal';
  weight: number;
  source: string;
}

export interface ItemEmbedding {
  itemId: string;
  vector: number[];
  dimension: number;
  method: string;
  timestamp: number;
}

export interface KnowledgeGraphNode {
  id: string;
  label: string;
  type: string;
  properties: Record<string, unknown>;
}

export interface KnowledgeGraphRelation {
  source: string;
  target: string;
  relation: string;
  weight: number;
  properties: Record<string, unknown>;
}

export interface KnowledgeGraph {
  nodes: Map<string, KnowledgeGraphNode>;
  relations: KnowledgeGraphRelation[];
}

export interface ItemProfile {
  itemId: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  features: ItemFeature[];
  tags: string[];
  price?: number;
  brand?: string;
  attributes: Record<string, string | number | boolean>;
  embedding?: ItemEmbedding;
  popularity: number;
  quality: number;
  createdAt: number;
  updatedAt: number;
}

export interface FeatureEngineeringConfig {
  normalizationMethod: 'min-max' | 'z-score' | 'log' | 'robust';
  encodingMethod: 'one-hot' | 'label' | 'target' | 'binary';
  featureSelection: 'filter' | 'wrapper' | 'embedded';
  maxFeatures: number;
  minFeatureFrequency: number;
}

export interface EmbeddingConfig {
  dimension: number;
  method: 'word2vec' | 'glove' | 'fasttext' | 'item2vec' | 'tfidf' | 'svd';
  windowSize: number;
  learningRate: number;
  epochs: number;
  negativeSamples: number;
}

export class ItemRepresentation {
  private _items: Map<string, ItemProfile> = new Map();
  private _embeddings: Map<string, ItemEmbedding> = new Map();
  private _knowledgeGraph: KnowledgeGraph = {
    nodes: new Map(),
    relations: []
  };
  private _counter: number = 0;
  private _lastItem: ItemProfile | null = null;
  private _featureConfig: FeatureEngineeringConfig = {
    normalizationMethod: 'min-max',
    encodingMethod: 'one-hot',
    featureSelection: 'filter',
    maxFeatures: 500,
    minFeatureFrequency: 2
  };
  private _embeddingConfig: EmbeddingConfig = {
    dimension: 128,
    method: 'item2vec',
    windowSize: 5,
    learningRate: 0.025,
    epochs: 20,
    negativeSamples: 5
  };
  private _featureVocabulary: Map<string, number> = new Map();
  private _idfCache: Map<string, number> = new Map();

  constructor() {
    this._initializeDefaults();
  }

  private _initializeDefaults(): void {
    this._featureVocabulary.clear();
    this._idfCache.clear();
  }

  get items(): Map<string, ItemProfile> {
    return this._items;
  }

  get embeddings(): Map<string, ItemEmbedding> {
    return this._embeddings;
  }

  get knowledgeGraph(): KnowledgeGraph {
    return this._knowledgeGraph;
  }

  get featureConfig(): FeatureEngineeringConfig {
    return { ...this._featureConfig };
  }

  get embeddingConfig(): EmbeddingConfig {
    return { ...this._embeddingConfig };
  }

  get lastItem(): ItemProfile | null {
    return this._lastItem;
  }

  get itemCount(): number {
    return this._items.size;
  }

  get embeddingCount(): number {
    return this._embeddings.size;
  }

  setFeatureConfig(config: Partial<FeatureEngineeringConfig>): void {
    this._featureConfig = { ...this._featureConfig, ...config };
  }

  setEmbeddingConfig(config: Partial<EmbeddingConfig>): void {
    this._embeddingConfig = { ...this._embeddingConfig, ...config };
  }

  createItem(
    itemId: string,
    data: Partial<ItemProfile> & { title: string; category: string }
  ): ItemProfile {
    const now = Date.now();
    const profile: ItemProfile = {
      itemId,
      title: data.title,
      description: data.description || '',
      category: data.category,
      subcategory: data.subcategory,
      features: data.features || [],
      tags: data.tags || [],
      price: data.price,
      brand: data.brand,
      attributes: data.attributes || {},
      embedding: data.embedding,
      popularity: data.popularity || 0,
      quality: data.quality || 0.5,
      createdAt: now,
      updatedAt: now
    };

    this._items.set(itemId, profile);
    this._lastItem = profile;
    this._counter++;
    this._updateFeatureVocabulary(profile);
    this._addToKnowledgeGraph(profile);
    return profile;
  }

  getItem(itemId: string): ItemProfile | undefined {
    return this._items.get(itemId);
  }

  updateItem(
    itemId: string,
    updates: Partial<ItemProfile>
  ): ItemProfile | null {
    const item = this._items.get(itemId);
    if (!item) return null;

    const updated: ItemProfile = {
      ...item,
      ...updates,
      itemId,
      updatedAt: Date.now()
    };

    this._items.set(itemId, updated);
    this._lastItem = updated;
    this._updateFeatureVocabulary(updated);
    return updated;
  }

  addFeature(
    itemId: string,
    feature: ItemFeature
  ): ItemProfile | null {
    const item = this._items.get(itemId);
    if (!item) return null;

    const existingIndex = item.features.findIndex(f => f.name === feature.name);
    if (existingIndex >= 0) {
      item.features[existingIndex] = feature;
    } else {
      item.features.push(feature);
    }

    item.updatedAt = Date.now();
    this._items.set(itemId, item);
    this._lastItem = item;
    return item;
  }

  addTag(itemId: string, tag: string): ItemProfile | null {
    const item = this._items.get(itemId);
    if (!item) return null;

    if (!item.tags.includes(tag)) {
      item.tags.push(tag);
      item.updatedAt = Date.now();
      this._items.set(itemId, item);
      this._lastItem = item;
    }

    return item;
  }

  extractFeatures(text: string, itemId?: string): ItemFeature[] {
    const features: ItemFeature[] = [];
    const words = text.toLowerCase().match(/[a-z\u4e00-\u9fa5]+/g) || [];
    const wordFreq = new Map<string, number>();

    for (const word of words) {
      if (word.length > 1) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    }

    for (const [word, freq] of wordFreq) {
      const idf = this._idfCache.get(word) || 1;
      features.push({
        name: word,
        value: freq,
        type: 'numerical',
        weight: freq * idf,
        source: 'text-extraction'
      });
    }

    features.sort((a, b) => b.weight - a.weight);
    return features.slice(0, this._featureConfig.maxFeatures);
  }

  normalizeFeatures(
    features: ItemFeature[],
    method?: string
  ): ItemFeature[] {
    const normMethod = method || this._featureConfig.normalizationMethod;
    const numericalFeatures = features.filter(f => f.type === 'numerical');
    const values = numericalFeatures.map(f => f.weight);

    if (values.length === 0) return features;

    let normalizedWeights: number[] = [];

    switch (normMethod) {
      case 'min-max':
        normalizedWeights = this._minMaxNormalize(values);
        break;
      case 'z-score':
        normalizedWeights = this._zScoreNormalize(values);
        break;
      case 'log':
        normalizedWeights = values.map(v => Math.log1p(v));
        break;
      case 'robust':
        normalizedWeights = this._robustNormalize(values);
        break;
      default:
        normalizedWeights = this._minMaxNormalize(values);
    }

    let numIndex = 0;
    return features.map(f => {
      if (f.type === 'numerical') {
        return { ...f, weight: normalizedWeights[numIndex++] };
      }
      return f;
    });
  }

  private _minMaxNormalize(values: number[]): number[] {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    if (range === 0) return values.map(() => 0.5);
    return values.map(v => (v - min) / range);
  }

  private _zScoreNormalize(values: number[]): number[] {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
    const std = Math.sqrt(variance);
    if (std === 0) return values.map(() => 0);
    return values.map(v => (v - mean) / std);
  }

  private _robustNormalize(values: number[]): number[] {
    const sorted = [...values].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const q1 = sorted[Math.floor(sorted.length / 4)];
    const q3 = sorted[Math.floor(sorted.length * 3 / 4)];
    const iqr = q3 - q1;
    if (iqr === 0) return values.map(() => 0);
    return values.map(v => (v - median) / iqr);
  }

  encodeCategoricalFeatures(
    features: ItemFeature[],
    method?: string
  ): Map<string, number> {
    const encodingMethod = method || this._featureConfig.encodingMethod;
    const encoded = new Map<string, number>();

    const categoricalFeatures = features.filter(f => f.type === 'categorical');

    if (encodingMethod === 'one-hot') {
      for (const feature of categoricalFeatures) {
        const key = `${feature.name}_${feature.value}`;
        encoded.set(key, feature.weight);
      }
    } else if (encodingMethod === 'label') {
      for (let i = 0; i < categoricalFeatures.length; i++) {
        encoded.set(categoricalFeatures[i].name, i);
      }
    } else if (encodingMethod === 'binary') {
      for (let i = 0; i < categoricalFeatures.length; i++) {
        const binary = i.toString(2);
        for (let j = 0; j < binary.length; j++) {
          encoded.set(`${categoricalFeatures[i].name}_bit${j}`, parseInt(binary[j]));
        }
      }
    }

    for (const feature of features.filter(f => f.type === 'numerical')) {
      encoded.set(feature.name, feature.weight);
    }

    return encoded;
  }

  selectFeatures(
    features: ItemFeature[],
    method?: string,
    topN?: number
  ): ItemFeature[] {
    const selectionMethod = method || this._featureConfig.featureSelection;
    const n = topN || this._featureConfig.maxFeatures;

    if (selectionMethod === 'filter') {
      return features
        .filter(f => f.weight >= this._featureConfig.minFeatureFrequency)
        .sort((a, b) => b.weight - a.weight)
        .slice(0, n);
    }

    return features.slice(0, n);
  }

  generateEmbedding(itemId: string): ItemEmbedding | null {
    const item = this._items.get(itemId);
    if (!item) return null;

    const dimension = this._embeddingConfig.dimension;
    const vector = this._generateRandomVector(dimension);

    const textFeatures = item.features.filter(f => f.source === 'text-extraction');
    if (textFeatures.length > 0) {
      for (let i = 0; i < textFeatures.length && i < dimension; i++) {
        vector[i % dimension] = textFeatures[i].weight;
      }
    }

    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    if (norm > 0) {
      for (let i = 0; i < dimension; i++) {
        vector[i] = vector[i] / norm;
      }
    }

    const embedding: ItemEmbedding = {
      itemId,
      vector,
      dimension,
      method: this._embeddingConfig.method,
      timestamp: Date.now()
    };

    this._embeddings.set(itemId, embedding);
    item.embedding = embedding;
    item.updatedAt = Date.now();
    this._items.set(itemId, item);

    return embedding;
  }

  generateAllEmbeddings(): Map<string, ItemEmbedding> {
    for (const itemId of this._items.keys()) {
      this.generateEmbedding(itemId);
    }
    return this._embeddings;
  }

  computeItemSimilarity(item1: string, item2: string): number {
    const emb1 = this._embeddings.get(item1);
    const emb2 = this._embeddings.get(item2);

    if (!emb1 || !emb2) {
      return this._featureBasedSimilarity(item1, item2);
    }

    return this._cosineSimilarity(emb1.vector, emb2.vector);
  }

  private _cosineSimilarity(v1: number[], v2: number[]): number {
    if (v1.length !== v2.length) return 0;

    let dot = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < v1.length; i++) {
      dot += v1[i] * v2[i];
      norm1 += v1[i] * v1[i];
      norm2 += v2[i] * v2[i];
    }

    const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
    return denominator === 0 ? 0 : dot / denominator;
  }

  private _featureBasedSimilarity(item1: string, item2: string): number {
    const profile1 = this._items.get(item1);
    const profile2 = this._items.get(item2);

    if (!profile1 || !profile2) return 0;

    const features1 = new Map(profile1.features.map(f => [f.name, f.weight]));
    const features2 = new Map(profile2.features.map(f => [f.name, f.weight]));

    let dot = 0;
    let norm1 = 0;
    let norm2 = 0;

    const allFeatures = new Set([...features1.keys(), ...features2.keys()]);
    for (const f of allFeatures) {
      const w1 = features1.get(f) || 0;
      const w2 = features2.get(f) || 0;
      dot += w1 * w2;
      norm1 += w1 * w1;
      norm2 += w2 * w2;
    }

    const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
    return denominator === 0 ? 0 : dot / denominator;
  }

  findSimilarItems(itemId: string, topN: number = 10): Array<{ itemId: string; similarity: number }> {
    const results: Array<{ itemId: string; similarity: number }> = [];

    for (const otherId of this._items.keys()) {
      if (otherId !== itemId) {
        const similarity = this.computeItemSimilarity(itemId, otherId);
        results.push({ itemId: otherId, similarity });
      }
    }

    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, topN);
  }

  addKnowledgeNode(node: KnowledgeGraphNode): void {
    this._knowledgeGraph.nodes.set(node.id, node);
  }

  addKnowledgeRelation(relation: KnowledgeGraphRelation): void {
    this._knowledgeGraph.relations.push(relation);
  }

  private _addToKnowledgeGraph(item: ItemProfile): void {
    const itemNode: KnowledgeGraphNode = {
      id: item.itemId,
      label: item.title,
      type: 'item',
      properties: {
        category: item.category,
        price: item.price,
        brand: item.brand
      }
    };
    this._knowledgeGraph.nodes.set(item.itemId, itemNode);

    if (item.category) {
      const categoryNodeId = `category:${item.category}`;
      if (!this._knowledgeGraph.nodes.has(categoryNodeId)) {
        this._knowledgeGraph.nodes.set(categoryNodeId, {
          id: categoryNodeId,
          label: item.category,
          type: 'category',
          properties: {}
        });
      }
      this._knowledgeGraph.relations.push({
        source: item.itemId,
        target: categoryNodeId,
        relation: 'belongs_to',
        weight: 1,
        properties: {}
      });
    }

    if (item.brand) {
      const brandNodeId = `brand:${item.brand}`;
      if (!this._knowledgeGraph.nodes.has(brandNodeId)) {
        this._knowledgeGraph.nodes.set(brandNodeId, {
          id: brandNodeId,
          label: item.brand,
          type: 'brand',
          properties: {}
        });
      }
      this._knowledgeGraph.relations.push({
        source: item.itemId,
        target: brandNodeId,
        relation: 'produced_by',
        weight: 1,
        properties: {}
      });
    }
  }

  getRelatedItems(itemId: string, depth: number = 2): string[] {
    const related = new Set<string>();
    const visited = new Set<string>();
    const queue: Array<{ id: string; level: number }> = [{ id: itemId, level: 0 }];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current.id) || current.level > depth) continue;
      visited.add(current.id);

      for (const rel of this._knowledgeGraph.relations) {
        if (rel.source === current.id && !visited.has(rel.target)) {
          const targetNode = this._knowledgeGraph.nodes.get(rel.target);
          if (targetNode && targetNode.type === 'item') {
            related.add(rel.target);
          }
          queue.push({ id: rel.target, level: current.level + 1 });
        }
        if (rel.target === current.id && !visited.has(rel.source)) {
          const sourceNode = this._knowledgeGraph.nodes.get(rel.source);
          if (sourceNode && sourceNode.type === 'item') {
            related.add(rel.source);
          }
          queue.push({ id: rel.source, level: current.level + 1 });
        }
      }
    }

    related.delete(itemId);
    return Array.from(related);
  }

  tfidfTransform(items: ItemProfile[]): Map<string, number>[] {
    this._computeIdf(items);
    const result: Map<string, number>[] = [];

    for (const item of items) {
      const tfidf = new Map<string, number>();
      for (const feature of item.features) {
        const tf = feature.weight || 1;
        const idf = this._idfCache.get(feature.name) || 1;
        tfidf.set(feature.name, tf * idf);
      }
      result.push(tfidf);
    }

    return result;
  }

  private _computeIdf(items: ItemProfile[]): void {
    this._idfCache.clear();
    const totalDocs = items.length;

    const docFreq = new Map<string, number>();
    for (const item of items) {
      const seenFeatures = new Set(item.features.map(f => f.name));
      for (const feature of seenFeatures) {
        docFreq.set(feature, (docFreq.get(feature) || 0) + 1);
      }
    }

    for (const [feature, df] of docFreq) {
      const idf = Math.log((totalDocs + 1) / (df + 1)) + 1;
      this._idfCache.set(feature, idf);
    }
  }

  private _updateFeatureVocabulary(item: ItemProfile): void {
    for (const feature of item.features) {
      this._featureVocabulary.set(
        feature.name,
        (this._featureVocabulary.get(feature.name) || 0) + 1
      );
    }
  }

  private _generateRandomVector(dimension: number): number[] {
    const vector: number[] = [];
    for (let i = 0; i < dimension; i++) {
      vector.push((Math.random() - 0.5) * 0.1);
    }
    return vector;
  }

  getItemsByCategory(category: string): ItemProfile[] {
    const result: ItemProfile[] = [];
    for (const item of this._items.values()) {
      if (item.category === category) {
        result.push(item);
      }
    }
    return result;
  }

  getPopularItems(topN: number = 10): ItemProfile[] {
    return Array.from(this._items.values())
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, topN);
  }

  toPacket(): DataPacket<ItemProfile | null> {
    this._counter++;
    return {
      id: `item-repr-${Date.now()}-${this._counter}`,
      payload: this._lastItem,
      metadata: {
        createdAt: Date.now(),
        route: ['recommendation', 'item-representation'],
        priority: 1,
        phase: 'item-representation'
      }
    };
  }

  reset(): void {
    this._items.clear();
    this._embeddings.clear();
    this._knowledgeGraph = {
      nodes: new Map(),
      relations: []
    };
    this._counter = 0;
    this._lastItem = null;
    this._featureVocabulary.clear();
    this._idfCache.clear();
    this._featureConfig = {
      normalizationMethod: 'min-max',
      encodingMethod: 'one-hot',
      featureSelection: 'filter',
      maxFeatures: 500,
      minFeatureFrequency: 2
    };
    this._embeddingConfig = {
      dimension: 128,
      method: 'item2vec',
      windowSize: 5,
      learningRate: 0.025,
      epochs: 20,
      negativeSamples: 5
    };
  }
}
