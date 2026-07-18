import type { DataPacket, KnowledgeUnit } from '../shared/types';

export type SignType = 'icon' | 'index' | 'symbol';

export interface SignClass {
  type: SignType;
  name: string;
  description: string;
  representation: number;
  similarity: number;
  contiguity: number;
  convention: number;
}

export interface ClassifiedSign {
  id: string;
  content: KnowledgeUnit;
  primaryType: SignType;
  typeScores: Record<SignType, number>;
  certainty: number;
  context: string;
  classifiedAt: number;
}

export interface ClassificationResult {
  signId: string;
  primaryType: SignType;
  iconScore: number;
  indexScore: number;
  symbolScore: number;
  certainty: number;
  features: string[];
}

export interface IIconIndexSymbol {
  classify(sign: KnowledgeUnit, context?: string): ClassificationResult;
  getSignClass(type: SignType): SignClass;
  getClassifiedSigns(): ClassifiedSign[];
  getTypeDistribution(): Record<SignType, number>;
  computeSimilarity(signA: string, signB: string): number;
  updatePrototype(type: SignType, features: number[]): void;
  processPacket(packet: DataPacket): DataPacket;
  reset(): void;
}

export class IconIndexSymbol implements IIconIndexSymbol {
  private _iconClass: SignClass;
  private _indexClass: SignClass;
  private _symbolClass: SignClass;

  private _iconPrototype: number[];
  private _indexPrototype: number[];
  private _symbolPrototype: number[];

  private _classifiedSigns: Map<string, ClassifiedSign> = new Map();
  private _classificationHistory: ClassificationResult[] = [];
  private _contextBiases: Map<string, Record<SignType, number>> = new Map();
  private _learningRate: number = 0.03;
  private _maxClassified: number = 500;
  private _lastUpdate: number = Date.now();
  private _featureWeights: number[];

  constructor() {
    this._iconClass = {
      type: 'icon',
      name: '图像符号',
      description: '通过相似性表征对象',
      representation: 0.8,
      similarity: 0.9,
      contiguity: 0.1,
      convention: 0.2,
    };

    this._indexClass = {
      type: 'index',
      name: '指示符号',
      description: '通过因果/邻接关系指示对象',
      representation: 0.6,
      similarity: 0.3,
      contiguity: 0.85,
      convention: 0.4,
    };

    this._symbolClass = {
      type: 'symbol',
      name: '象征符号',
      description: '通过约定俗成的社会契约',
      representation: 0.5,
      similarity: 0.1,
      contiguity: 0.2,
      convention: 0.95,
    };

    this._iconPrototype = this._generatePrototype('icon');
    this._indexPrototype = this._generatePrototype('index');
    this._symbolPrototype = this._generatePrototype('symbol');
    this._featureWeights = [0.2, 0.25, 0.15, 0.15, 0.1, 0.1, 0.05, 0.05];
  }

  get iconClass(): SignClass { return { ...this._iconClass }; }
  get indexClass(): SignClass { return { ...this._indexClass }; }
  get symbolClass(): SignClass { return { ...this._symbolClass }; }
  get classifiedCount(): number { return this._classifiedSigns.size; }
  get learningRate(): number { return this._learningRate; }
  set learningRate(value: number) { this._learningRate = Math.max(0, Math.min(0.1, value)); }

  private _generatePrototype(seed: string): number[] {
    const vector: number[] = [];
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash |= 0;
    }
    for (let i = 0; i < 8; i++) {
      hash = ((hash << 5) - hash) + i * 12345;
      hash |= 0;
      vector.push(0.3 + Math.abs(hash % 1000) / 1000 * 0.7);
    }
    const magnitude = Math.sqrt(vector.reduce((s, v) => s + v * v, 0));
    return magnitude > 0 ? vector.map(v => v / magnitude) : vector;
  }

  classify(sign: KnowledgeUnit, context: string = 'default'): ClassificationResult {
    const iconScore = this._computeIconScore(sign);
    const indexScore = this._computeIndexScore(sign);
    let symbolScore = this._computeSymbolScore(sign);

    const contextBias = this._contextBiases.get(context);
    if (contextBias) {
      symbolScore *= contextBias.symbol;
    }

    const scores: Record<SignType, number> = {
      icon: iconScore,
      index: indexScore,
      symbol: symbolScore,
    };

    const total = iconScore + indexScore + symbolScore;
    const normalized = total > 0
      ? { icon: iconScore / total, index: indexScore / total, symbol: symbolScore / total }
      : { icon: 1 / 3, index: 1 / 3, symbol: 1 / 3 };

    let primaryType: SignType = 'symbol';
    let maxScore = 0;
    for (const [type, score] of Object.entries(normalized)) {
      if (score > maxScore) {
        maxScore = score;
        primaryType = type as SignType;
      }
    }

    const certainty = maxScore - (1 - maxScore) / 2;

    const features = this._extractFeatures(sign, primaryType);

    const result: ClassificationResult = {
      signId: sign.id,
      primaryType,
      iconScore: normalized.icon,
      indexScore: normalized.index,
      symbolScore: normalized.symbol,
      certainty,
      features,
    };

    const classified: ClassifiedSign = {
      id: sign.id,
      content: sign,
      primaryType,
      typeScores: normalized,
      certainty,
      context,
      classifiedAt: Date.now(),
    };

    this._classifiedSigns.set(sign.id, classified);
    this._classificationHistory.push(result);

    if (this._classificationHistory.length > 200) {
      this._classificationHistory.shift();
    }

    if (this._classifiedSigns.size > this._maxClassified) {
      this._pruneOldestClassified();
    }

    this._updatePrototypes(sign, primaryType, certainty);

    return result;
  }

  private _computeIconScore(sign: KnowledgeUnit): number {
    const similarity = this._weightedCosineSimilarity(sign.vector, this._iconPrototype);
    const visualBias = this._extractVisualFeatures(sign);
    return similarity * 0.7 + visualBias * 0.3;
  }

  private _computeIndexScore(sign: KnowledgeUnit): number {
    const similarity = this._weightedCosineSimilarity(sign.vector, this._indexPrototype);
    const causalBias = this._extractCausalFeatures(sign);
    return similarity * 0.6 + causalBias * 0.4;
  }

  private _computeSymbolScore(sign: KnowledgeUnit): number {
    const similarity = this._weightedCosineSimilarity(sign.vector, this._symbolPrototype);
    const conventionalBias = this._extractConventionalFeatures(sign);
    return similarity * 0.5 + conventionalBias * 0.5;
  }

  private _weightedCosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      const w = this._featureWeights[i] || 1;
      dot += a[i] * b[i] * w;
      normA += a[i] * a[i] * w;
      normB += b[i] * b[i] * w;
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom > 0 ? dot / denom : 0;
  }

  private _extractVisualFeatures(sign: KnowledgeUnit): number {
    let score = 0;
    const content = sign.content.toLowerCase();
    const visualKeywords = ['图像', '图片', '画', '图', '像', '形状', '颜色', 'image', 'picture', 'icon', 'visual'];
    for (const kw of visualKeywords) {
      if (content.includes(kw)) score += 0.1;
    }
    return Math.min(1, score);
  }

  private _extractCausalFeatures(sign: KnowledgeUnit): number {
    let score = 0;
    const content = sign.content.toLowerCase();
    const causalKeywords = ['因为', '所以', '导致', '引起', '标志', '信号', '指示', 'cause', 'signal', 'indicate', 'index'];
    for (const kw of causalKeywords) {
      if (content.includes(kw)) score += 0.1;
    }
    return Math.min(1, score);
  }

  private _extractConventionalFeatures(sign: KnowledgeUnit): number {
    let score = 0.3;
    if (sign.lineage.length > 3) score += 0.2;
    const content = sign.content;
    if (content.length > 10) score += 0.1;
    if (content.length > 30) score += 0.1;
    return Math.min(1, score);
  }

  private _extractFeatures(sign: KnowledgeUnit, type: SignType): string[] {
    const features: string[] = [];
    const content = sign.content.toLowerCase();

    if (type === 'icon') {
      if (content.includes('图') || content.includes('image')) features.push('visual');
      if (sign.vector[0] > 0.5) features.push('high-dimensional');
    } else if (type === 'index') {
      if (content.includes('因为') || content.includes('cause')) features.push('causal');
      if (sign.vector[1] > 0.5) features.push('temporal');
    } else {
      if (sign.lineage.length > 2) features.push('cultural');
      if (content.length > 20) features.push('abstract');
    }

    return features;
  }

  private _updatePrototypes(sign: KnowledgeUnit, type: SignType, certainty: number): void {
    const prototype = type === 'icon' ? this._iconPrototype
      : type === 'index' ? this._indexPrototype
      : this._symbolPrototype;

    const updateRate = this._learningRate * certainty;
    for (let i = 0; i < prototype.length; i++) {
      prototype[i] = prototype[i] * (1 - updateRate) + (sign.vector[i] || 0) * updateRate;
    }

    const magnitude = Math.sqrt(prototype.reduce((s, v) => s + v * v, 0));
    if (magnitude > 0) {
      for (let i = 0; i < prototype.length; i++) {
        prototype[i] /= magnitude;
      }
    }
  }

  private _pruneOldestClassified(): void {
    const sorted = Array.from(this._classifiedSigns.values())
      .sort((a, b) => a.classifiedAt - b.classifiedAt);
    const toRemove = sorted.slice(0, Math.floor(sorted.length * 0.1));
    for (const sign of toRemove) {
      this._classifiedSigns.delete(sign.id);
    }
  }

  getSignClass(type: SignType): SignClass {
    switch (type) {
      case 'icon': return { ...this._iconClass };
      case 'index': return { ...this._indexClass };
      case 'symbol': return { ...this._symbolClass };
    }
  }

  getClassifiedSigns(): ClassifiedSign[] {
    return Array.from(this._classifiedSigns.values()).map(s => ({
      ...s,
      typeScores: { ...s.typeScores },
      content: { ...s.content },
    }));
  }

  getClassifiedSign(id: string): ClassifiedSign | undefined {
    const sign = this._classifiedSigns.get(id);
    return sign ? { ...sign, typeScores: { ...sign.typeScores }, content: { ...sign.content } } : undefined;
  }

  getTypeDistribution(): Record<SignType, number> {
    const distribution: Record<SignType, number> = { icon: 0, index: 0, symbol: 0 };
    for (const sign of this._classifiedSigns.values()) {
      distribution[sign.primaryType]++;
    }
    const total = this._classifiedSigns.size || 1;
    return {
      icon: distribution.icon / total,
      index: distribution.index / total,
      symbol: distribution.symbol / total,
    };
  }

  computeSimilarity(signA: string, signB: string): number {
    const a = this._classifiedSigns.get(signA);
    const b = this._classifiedSigns.get(signB);
    if (!a || !b) return 0;
    return this._weightedCosineSimilarity(a.content.vector, b.content.vector);
  }

  setContextBias(context: string, biases: Record<SignType, number>): void {
    this._contextBiases.set(context, { ...biases });
  }

  getContextBias(context: string): Record<SignType, number> | undefined {
    const bias = this._contextBiases.get(context);
    return bias ? { ...bias } : undefined;
  }

  getClassificationHistory(limit: number = 50): ClassificationResult[] {
    return this._classificationHistory.slice(-limit).map(r => ({ ...r }));
  }

  updatePrototype(type: SignType, features: number[]): void {
    const prototype = type === 'icon' ? this._iconPrototype
      : type === 'index' ? this._indexPrototype
      : this._symbolPrototype;

    for (let i = 0; i < prototype.length && i < features.length; i++) {
      prototype[i] = features[i];
    }
  }

  processPacket(packet: DataPacket): DataPacket {
    const distribution = this.getTypeDistribution();
    const stats = {
      totalClassified: this._classifiedSigns.size,
      distribution,
      avgCertainty: this._computeAvgCertainty(),
    };

    return {
      ...packet,
      payload: {
        ...packet.payload as object,
        signClassification: stats,
      },
      metadata: {
        ...packet.metadata,
        route: [...packet.metadata.route, 'icon-index-symbol'],
        residue: stats,
      },
    };
  }

  private _computeAvgCertainty(): number {
    if (this._classifiedSigns.size === 0) return 0;
    const total = Array.from(this._classifiedSigns.values())
      .reduce((sum, s) => sum + s.certainty, 0);
    return total / this._classifiedSigns.size;
  }

  batchClassify(signs: KnowledgeUnit[], context?: string): ClassificationResult[] {
    return signs.map(s => this.classify(s, context));
  }

  getTopSigns(type: SignType, k: number = 10): ClassifiedSign[] {
    return Array.from(this._classifiedSigns.values())
      .filter(s => s.primaryType === type)
      .sort((a, b) => b.certainty - a.certainty)
      .slice(0, k);
  }

  reset(): void {
    this._classifiedSigns.clear();
    this._classificationHistory = [];
    this._contextBiases.clear();
    this._iconPrototype = this._generatePrototype('icon');
    this._indexPrototype = this._generatePrototype('index');
    this._symbolPrototype = this._generatePrototype('symbol');
    this._lastUpdate = Date.now();
  }
}
