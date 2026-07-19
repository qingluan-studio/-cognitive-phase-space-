import { DataPacket } from '../shared/types';

export interface ItemFeature {
  id: string;
  name: string;
  value: string | number | boolean;
  weight: number;
  category: string;
}

export interface ItemProfile {
  id: string;
  title: string;
  description: string;
  features: ItemFeature[];
  tags: string[];
  categories: string[];
  embedding?: number[];
  metadata: Record<string, unknown>;
}

export interface UserInterest {
  feature: string;
  weight: number;
  frequency: number;
  lastAccessed: number;
  decay: number;
}

export interface UserContentProfile {
  userId: string;
  interests: UserInterest[];
  preferredTags: string[];
  preferredCategories: string[];
  featureWeights: Map<string, number>;
  historyItems: string[];
  createdAt: number;
  updatedAt: number;
}

export interface ContentRecommendation {
  itemId: string;
  score: number;
  confidence: number;
  matchedFeatures: string[];
  explanation: string;
}

export interface ContentConfig {
  similarityMethod: 'cosine' | 'jaccard' | 'dice' | 'overlap' | 'euclidean';
  featureWeighting: 'tfidf' | 'frequency' | 'binary' | 'custom';
  decayRate: number;
  maxInterests: number;
  minFeatureWeight: number;
}

export class ContentBasedFiltering {
  private _userProfiles: Map<string, UserContentProfile> = new Map();
  private _itemProfiles: Map<string, ItemProfile> = new Map();
  private _counter: number = 0;
  private _method: string = 'content-based';
  private _lastRecommendations: ContentRecommendation[] = [];
  private _config: ContentConfig = {
    similarityMethod: 'cosine',
    featureWeighting: 'tfidf',
    decayRate: 0.001,
    maxInterests: 100,
    minFeatureWeight: 0.01
  };
  private _idfCache: Map<string, number> = new Map();
  private _featureDocumentFrequency: Map<string, number> = new Map();

  constructor() {
    this._initializeIdfCache();
  }

  private _initializeIdfCache(): void {
    this._idfCache.clear();
    this._featureDocumentFrequency.clear();
  }

  get userProfiles(): Map<string, UserContentProfile> {
    return this._userProfiles;
  }

  get itemProfiles(): Map<string, ItemProfile> {
    return this._itemProfiles;
  }

  get method(): string {
    return this._method;
  }

  get config(): ContentConfig {
    return { ...this._config };
  }

  get lastRecommendations(): ContentRecommendation[] {
    return this._lastRecommendations;
  }

  get userCount(): number {
    return this._userProfiles.size;
  }

  get itemCount(): number {
    return this._itemProfiles.size;
  }

  setConfig(config: Partial<ContentConfig>): void {
    this._config = { ...this._config, ...config };
  }

  buildItemProfile(item: Partial<ItemProfile> & { id: string }): ItemProfile {
    const profile: ItemProfile = {
      id: item.id,
      title: item.title || '',
      description: item.description || '',
      features: item.features || [],
      tags: item.tags || [],
      categories: item.categories || [],
      embedding: item.embedding,
      metadata: item.metadata || {}
    };
    this._itemProfiles.set(item.id, profile);
    this._updateIdfCache(profile);
    return profile;
  }

  buildUserProfile(
    userId: string,
    items: ItemProfile[],
    ratings: number[]
  ): UserContentProfile {
    const featureWeights = new Map<string, number>();
    const featureFrequency = new Map<string, number>();
    const featureLastAccessed = new Map<string, number>();
    const preferredTags = new Set<string>();
    const preferredCategories = new Set<string>();
    const historyItems: string[] = [];
    const now = Date.now();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const rating = ratings[i] || 3;
      const normalizedRating = (rating - 1) / 4;
      historyItems.push(item.id);

      for (const feature of item.features) {
        const key = `${feature.category}:${feature.name}`;
        const weight = (feature.weight || 1) * normalizedRating;
        featureWeights.set(key, (featureWeights.get(key) || 0) + weight);
        featureFrequency.set(key, (featureFrequency.get(key) || 0) + 1);
        featureLastAccessed.set(key, now);
      }

      for (const tag of item.tags) {
        if (normalizedRating > 0.5) {
          preferredTags.add(tag);
        }
      }

      for (const category of item.categories) {
        if (normalizedRating > 0.5) {
          preferredCategories.add(category);
        }
      }
    }

    const interests: UserInterest[] = [];
    const maxWeight = Math.max(...featureWeights.values(), 1);

    for (const [feature, weight] of featureWeights) {
      const normalizedWeight = weight / maxWeight;
      if (normalizedWeight >= this._config.minFeatureWeight) {
        interests.push({
          feature,
          weight: normalizedWeight,
          frequency: featureFrequency.get(feature) || 0,
          lastAccessed: featureLastAccessed.get(feature) || now,
          decay: this._config.decayRate
        });
      }
    }

    interests.sort((a, b) => b.weight - a.weight);
    const topInterests = interests.slice(0, this._config.maxInterests);
    const normalizedFeatureWeights = new Map<string, number>();
    for (const interest of topInterests) {
      normalizedFeatureWeights.set(interest.feature, interest.weight);
    }

    const profile: UserContentProfile = {
      userId,
      interests: topInterests,
      preferredTags: Array.from(preferredTags),
      preferredCategories: Array.from(preferredCategories),
      featureWeights: normalizedFeatureWeights,
      historyItems,
      createdAt: now,
      updatedAt: now
    };

    this._userProfiles.set(userId, profile);
    return profile;
  }

  recommend(
    userId: string,
    topN: number = 10
  ): ContentRecommendation[] {
    const userProfile = this._userProfiles.get(userId);
    if (!userProfile) {
      return [];
    }

    const historySet = new Set(userProfile.historyItems);
    const candidates: ContentRecommendation[] = [];

    for (const [itemId, itemProfile] of this._itemProfiles) {
      if (!historySet.has(itemId)) {
        const recommendation = this._calculateContentMatch(userProfile, itemProfile);
        candidates.push(recommendation);
      }
    }

    candidates.sort((a, b) => b.score - a.score);
    this._lastRecommendations = candidates.slice(0, topN);
    this._method = 'content-based';
    this._counter++;
    return this._lastRecommendations;
  }

  contentScore(
    userProfile: UserContentProfile,
    itemProfile: ItemProfile
  ): number {
    return this._calculateContentMatch(userProfile, itemProfile).score;
  }

  private _calculateContentMatch(
    userProfile: UserContentProfile,
    itemProfile: ItemProfile
  ): ContentRecommendation {
    const matchedFeatures: string[] = [];
    let totalScore = 0;
    let totalWeight = 0;

    for (const feature of itemProfile.features) {
      const key = `${feature.category}:${feature.name}`;
      const userWeight = userProfile.featureWeights.get(key);
      if (userWeight !== undefined) {
        const itemWeight = feature.weight || 1;
        const score = userWeight * itemWeight;
        totalScore += score;
        totalWeight += itemWeight;
        matchedFeatures.push(key);
      }
    }

    let tagBonus = 0;
    for (const tag of itemProfile.tags) {
      if (userProfile.preferredTags.includes(tag)) {
        tagBonus += 0.1;
      }
    }

    let categoryBonus = 0;
    for (const category of itemProfile.categories) {
      if (userProfile.preferredCategories.includes(category)) {
        categoryBonus += 0.05;
      }
    }

    const baseScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    const finalScore = Math.min(1, baseScore + tagBonus + categoryBonus);
    const confidence = Math.min(1, matchedFeatures.length / Math.max(itemProfile.features.length, 1));
    const explanation = `匹配 ${matchedFeatures.length} 个特征，${itemProfile.tags.filter(t => userProfile.preferredTags.includes(t)).length} 个标签`;

    return {
      itemId: itemProfile.id,
      score: finalScore,
      confidence,
      matchedFeatures,
      explanation
    };
  }

  itemSimilarity(item1: string, item2: string): number {
    const profile1 = this._itemProfiles.get(item1);
    const profile2 = this._itemProfiles.get(item2);
    if (!profile1 || !profile2) return 0;

    return this._profileSimilarity(profile1, profile2);
  }

  private _profileSimilarity(profile1: ItemProfile, profile2: ItemProfile): number {
    const method = this._config.similarityMethod;

    switch (method) {
      case 'cosine':
        return this._cosineSimilarity(profile1, profile2);
      case 'jaccard':
        return this._jaccardSimilarity(profile1, profile2);
      case 'dice':
        return this._diceCoefficient(profile1, profile2);
      case 'overlap':
        return this._overlapCoefficient(profile1, profile2);
      case 'euclidean':
        return this._euclideanSimilarity(profile1, profile2);
      default:
        return this._cosineSimilarity(profile1, profile2);
    }
  }

  private _cosineSimilarity(profile1: ItemProfile, profile2: ItemProfile): number {
    const features1 = this._profileToVector(profile1);
    const features2 = this._profileToVector(profile2);

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    const allKeys = new Set([...features1.keys(), ...features2.keys()]);
    for (const key of allKeys) {
      const v1 = features1.get(key) || 0;
      const v2 = features2.get(key) || 0;
      dotProduct += v1 * v2;
      norm1 += v1 * v1;
      norm2 += v2 * v2;
    }

    const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  private _jaccardSimilarity(profile1: ItemProfile, profile2: ItemProfile): number {
    const set1 = new Set(profile1.features.map(f => `${f.category}:${f.name}`));
    const set2 = new Set(profile2.features.map(f => `${f.category}:${f.name}`));

    let intersection = 0;
    for (const item of set1) {
      if (set2.has(item)) intersection++;
    }
    const union = set1.size + set2.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  private _diceCoefficient(profile1: ItemProfile, profile2: ItemProfile): number {
    const set1 = new Set(profile1.features.map(f => `${f.category}:${f.name}`));
    const set2 = new Set(profile2.features.map(f => `${f.category}:${f.name}`));

    let intersection = 0;
    for (const item of set1) {
      if (set2.has(item)) intersection++;
    }
    const total = set1.size + set2.size;
    return total === 0 ? 0 : (2 * intersection) / total;
  }

  private _overlapCoefficient(profile1: ItemProfile, profile2: ItemProfile): number {
    const set1 = new Set(profile1.features.map(f => `${f.category}:${f.name}`));
    const set2 = new Set(profile2.features.map(f => `${f.category}:${f.name}`));

    let intersection = 0;
    for (const item of set1) {
      if (set2.has(item)) intersection++;
    }
    const minSize = Math.min(set1.size, set2.size);
    return minSize === 0 ? 0 : intersection / minSize;
  }

  private _euclideanSimilarity(profile1: ItemProfile, profile2: ItemProfile): number {
    const features1 = this._profileToVector(profile1);
    const features2 = this._profileToVector(profile2);

    let sumSqDiff = 0;
    const allKeys = new Set([...features1.keys(), ...features2.keys()]);
    for (const key of allKeys) {
      const diff = (features1.get(key) || 0) - (features2.get(key) || 0);
      sumSqDiff += diff * diff;
    }

    const distance = Math.sqrt(sumSqDiff);
    return 1 / (1 + distance);
  }

  private _profileToVector(profile: ItemProfile): Map<string, number> {
    const vector = new Map<string, number>();
    const weighting = this._config.featureWeighting;

    for (const feature of profile.features) {
      const key = `${feature.category}:${feature.name}`;
      let weight = feature.weight || 1;

      if (weighting === 'tfidf') {
        const idf = this._idfCache.get(key) || 1;
        weight = weight * idf;
      } else if (weighting === 'binary') {
        weight = 1;
      }

      vector.set(key, weight);
    }

    return vector;
  }

  tfidfTransform(items: ItemProfile[]): Map<string, number>[] {
    this._computeIdf(items);
    const result: Map<string, number>[] = [];

    for (const item of items) {
      const tfidfVector = new Map<string, number>();
      for (const feature of item.features) {
        const key = `${feature.category}:${feature.name}`;
        const tf = feature.weight || 1;
        const idf = this._idfCache.get(key) || 1;
        tfidfVector.set(key, tf * idf);
      }
      result.push(tfidfVector);
    }

    return result;
  }

  private _computeIdf(items: ItemProfile[]): void {
    this._featureDocumentFrequency.clear();
    const totalDocs = items.length;

    for (const item of items) {
      const seenFeatures = new Set<string>();
      for (const feature of item.features) {
        const key = `${feature.category}:${feature.name}`;
        if (!seenFeatures.has(key)) {
          this._featureDocumentFrequency.set(
            key,
            (this._featureDocumentFrequency.get(key) || 0) + 1
          );
          seenFeatures.add(key);
        }
      }
    }

    this._idfCache.clear();
    for (const [feature, df] of this._featureDocumentFrequency) {
      const idf = Math.log((totalDocs + 1) / (df + 1)) + 1;
      this._idfCache.set(feature, idf);
    }
  }

  private _updateIdfCache(profile: ItemProfile): void {
    const seenFeatures = new Set<string>();
    for (const feature of profile.features) {
      const key = `${feature.category}:${feature.name}`;
      if (!seenFeatures.has(key)) {
        this._featureDocumentFrequency.set(
          key,
          (this._featureDocumentFrequency.get(key) || 0) + 1
        );
        seenFeatures.add(key);
      }
    }

    const totalDocs = this._itemProfiles.size;
    for (const [feature, df] of this._featureDocumentFrequency) {
      const idf = Math.log((totalDocs + 1) / (df + 1)) + 1;
      this._idfCache.set(feature, idf);
    }
  }

  updateUserProfile(
    userId: string,
    interaction: { itemId: string; rating: number; timestamp?: number }
  ): UserContentProfile | null {
    const profile = this._userProfiles.get(userId);
    const item = this._itemProfiles.get(interaction.itemId);
    if (!profile || !item) return null;

    const timestamp = interaction.timestamp || Date.now();
    const normalizedRating = (interaction.rating - 1) / 4;
    const featureWeights = new Map(profile.featureWeights);
    const featureFrequency = new Map<string, number>();
    const featureLastAccessed = new Map<string, number>();

    for (const interest of profile.interests) {
      featureFrequency.set(interest.feature, interest.frequency);
      featureLastAccessed.set(interest.feature, interest.lastAccessed);
    }

    for (const feature of item.features) {
      const key = `${feature.category}:${feature.name}`;
      const currentWeight = featureWeights.get(key) || 0;
      const delta = (feature.weight || 1) * normalizedRating * 0.1;
      featureWeights.set(key, Math.min(1, currentWeight + delta));
      featureFrequency.set(key, (featureFrequency.get(key) || 0) + 1);
      featureLastAccessed.set(key, timestamp);
    }

    const preferredTags = new Set(profile.preferredTags);
    const preferredCategories = new Set(profile.preferredCategories);

    if (normalizedRating > 0.5) {
      item.tags.forEach(tag => preferredTags.add(tag));
      item.categories.forEach(cat => preferredCategories.add(cat));
    }

    const historyItems = [...profile.historyItems, interaction.itemId];

    const interests: UserInterest[] = [];
    const maxWeight = Math.max(...featureWeights.values(), 1);

    for (const [feature, weight] of featureWeights) {
      const normalizedWeight = weight / maxWeight;
      if (normalizedWeight >= this._config.minFeatureWeight) {
        const timeDecay = this._calculateTimeDecay(
          featureLastAccessed.get(feature) || timestamp,
          timestamp
        );
        interests.push({
          feature,
          weight: normalizedWeight * timeDecay,
          frequency: featureFrequency.get(feature) || 0,
          lastAccessed: featureLastAccessed.get(feature) || timestamp,
          decay: this._config.decayRate
        });
      }
    }

    interests.sort((a, b) => b.weight - a.weight);
    const topInterests = interests.slice(0, this._config.maxInterests);
    const normalizedFeatureWeights = new Map<string, number>();
    for (const interest of topInterests) {
      normalizedFeatureWeights.set(interest.feature, interest.weight);
    }

    const updatedProfile: UserContentProfile = {
      userId,
      interests: topInterests,
      preferredTags: Array.from(preferredTags),
      preferredCategories: Array.from(preferredCategories),
      featureWeights: normalizedFeatureWeights,
      historyItems,
      createdAt: profile.createdAt,
      updatedAt: timestamp
    };

    this._userProfiles.set(userId, updatedProfile);
    return updatedProfile;
  }

  private _calculateTimeDecay(lastAccessed: number, now: number): number {
    const timeDiff = (now - lastAccessed) / (1000 * 60 * 60 * 24);
    return Math.exp(-this._config.decayRate * timeDiff);
  }

  featureSelection(
    features: ItemFeature[],
    method: 'frequency' | 'variance' | 'mutual-information' = 'frequency'
  ): ItemFeature[] {
    if (features.length <= 20) return features;

    if (method === 'frequency') {
      return features.sort((a, b) => (b.weight || 1) - (a.weight || 1)).slice(0, 50);
    }

    return features.slice(0, 50);
  }

  diversityScore(recommendations: string[]): number {
    const allFeatures = new Set<string>();
    let totalFeatures = 0;

    for (const itemId of recommendations) {
      const item = this._itemProfiles.get(itemId);
      if (item) {
        for (const feature of item.features) {
          allFeatures.add(`${feature.category}:${feature.name}`);
          totalFeatures++;
        }
      }
    }

    return totalFeatures > 0 ? allFeatures.size / totalFeatures : 0;
  }

  noveltyScore(recommendations: string[], history: string[]): number {
    const historySet = new Set(history);
    let novel = 0;

    for (const itemId of recommendations) {
      if (!historySet.has(itemId)) {
        novel++;
      }
    }

    return recommendations.length > 0 ? novel / recommendations.length : 0;
  }

  serendipityScore(
    recommendations: string[],
    history: string[],
    expectedItems: string[]
  ): number {
    const historySet = new Set(history);
    const expectedSet = new Set(expectedItems);
    let serendipitous = 0;

    for (const itemId of recommendations) {
      if (!historySet.has(itemId) && !expectedSet.has(itemId)) {
        const item = this._itemProfiles.get(itemId);
        if (item && item.categories.some(cat => !this._isExpectedCategory(cat, history))) {
          serendipitous++;
        }
      }
    }

    return recommendations.length > 0 ? serendipitous / recommendations.length : 0;
  }

  private _isExpectedCategory(category: string, history: string[]): boolean {
    for (const itemId of history) {
      const item = this._itemProfiles.get(itemId);
      if (item && item.categories.includes(category)) {
        return true;
      }
    }
    return false;
  }

  findSimilarItems(itemId: string, topN: number = 10): ContentRecommendation[] {
    const targetItem = this._itemProfiles.get(itemId);
    if (!targetItem) return [];

    const results: ContentRecommendation[] = [];
    for (const [id, profile] of this._itemProfiles) {
      if (id !== itemId) {
        const similarity = this._profileSimilarity(targetItem, profile);
        results.push({
          itemId: id,
          score: similarity,
          confidence: similarity,
          matchedFeatures: [],
          explanation: `与物品 ${itemId} 的相似度为 ${(similarity * 100).toFixed(2)}%`
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topN);
  }

  explainRecommendation(
    userId: string,
    itemId: string
  ): { score: number; reasons: string[] } {
    const userProfile = this._userProfiles.get(userId);
    const itemProfile = this._itemProfiles.get(itemId);
    if (!userProfile || !itemProfile) {
      return { score: 0, reasons: [] };
    }

    const recommendation = this._calculateContentMatch(userProfile, itemProfile);
    const reasons: string[] = [];

    const topMatched = recommendation.matchedFeatures.slice(0, 5);
    if (topMatched.length > 0) {
      reasons.push(`匹配的关键特征: ${topMatched.join(', ')}`);
    }

    const matchedTags = itemProfile.tags.filter(t => userProfile.preferredTags.includes(t));
    if (matchedTags.length > 0) {
      reasons.push(`匹配的偏好标签: ${matchedTags.join(', ')}`);
    }

    const matchedCategories = itemProfile.categories.filter(c =>
      userProfile.preferredCategories.includes(c)
    );
    if (matchedCategories.length > 0) {
      reasons.push(`匹配的偏好类别: ${matchedCategories.join(', ')}`);
    }

    return { score: recommendation.score, reasons };
  }

  toPacket(): DataPacket<ContentRecommendation[]> {
    this._counter++;
    return {
      id: `content-${Date.now()}-${this._counter}`,
      payload: this._lastRecommendations,
      metadata: {
        createdAt: Date.now(),
        route: ['recommendation', 'content-based'],
        priority: 1,
        phase: 'content-based-filtering'
      }
    };
  }

  reset(): void {
    this._userProfiles.clear();
    this._itemProfiles.clear();
    this._counter = 0;
    this._method = 'content-based';
    this._lastRecommendations = [];
    this._idfCache.clear();
    this._featureDocumentFrequency.clear();
    this._config = {
      similarityMethod: 'cosine',
      featureWeighting: 'tfidf',
      decayRate: 0.001,
      maxInterests: 100,
      minFeatureWeight: 0.01
    };
  }
}
