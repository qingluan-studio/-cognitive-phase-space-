import { DataPacket } from '../shared/types';

export interface ColdStartRecommendation {
  itemId: string;
  score: number;
  confidence: number;
  strategy: string;
  explanation: string;
}

export interface NewUserProfile {
  userId: string;
  registrationInfo: Record<string, unknown>;
  initialInterests: string[];
  demographicInfo: Record<string, unknown>;
  onboardingProgress: number;
  coldStartPhase: 'pre-onboarding' | 'onboarding' | 'early-adopter' | 'normal';
}

export interface NewItemProfile {
  itemId: string;
  attributes: Record<string, unknown>;
  category: string;
  subcategory?: string;
  tags: string[];
  launchDate: number;
  coldStartPhase: 'new' | 'rising' | 'established';
}

export interface NewSceneProfile {
  sceneId: string;
  context: Record<string, unknown>;
  userSegments: string[];
  itemCategories: string[];
  timestamp: number;
}

export interface ColdStartStrategy {
  name: string;
  type: 'user-cold-start' | 'item-cold-start' | 'scene-cold-start';
  weight: number;
  condition: (user?: NewUserProfile, item?: NewItemProfile, scene?: NewSceneProfile) => boolean;
}

export interface PopularityBasedConfig {
  timeWindowDays: number;
  categoryLevel: 'all' | 'category' | 'subcategory';
  diversityFactor: number;
}

export interface ContentBasedConfig {
  featureWeight: number;
  similarityThreshold: number;
  maxSimilarItems: number;
}

export interface DemographicConfig {
  ageWeight: number;
  genderWeight: number;
  locationWeight: number;
  occupationWeight: number;
}

export interface ExplorationConfig {
  explorationRate: number;
  explorationDecay: number;
  maxExplorationItems: number;
}

export interface SocialGraphConfig {
  friendWeight: number;
  followWeight: number;
  socialProofThreshold: number;
}

export class ColdStartSolver {
  private _recommendations: ColdStartRecommendation[] = [];
  private _counter: number = 0;
  private _lastStrategy: string = '';
  private _newUsers: Map<string, NewUserProfile> = new Map();
  private _newItems: Map<string, NewItemProfile> = new Map();
  private _newScenes: Map<string, NewSceneProfile> = new Map();
  private _popularityCache: Map<string, Array<{ itemId: string; score: number }>> = new Map();
  private _strategies: ColdStartStrategy[] = [];
  private _popularityConfig: PopularityBasedConfig = {
    timeWindowDays: 7,
    categoryLevel: 'all',
    diversityFactor: 0.3
  };
  private _contentConfig: ContentBasedConfig = {
    featureWeight: 0.8,
    similarityThreshold: 0.2,
    maxSimilarItems: 20
  };
  private _demographicConfig: DemographicConfig = {
    ageWeight: 0.2,
    genderWeight: 0.3,
    locationWeight: 0.25,
    occupationWeight: 0.25
  };
  private _explorationConfig: ExplorationConfig = {
    explorationRate: 0.3,
    explorationDecay: 0.95,
    maxExplorationItems: 5
  };
  private _socialConfig: SocialGraphConfig = {
    friendWeight: 0.6,
    followWeight: 0.4,
    socialProofThreshold: 3
  };
  private _onboardingQuestions: Array<{
    id: string;
    question: string;
    options: string[];
    category: string;
    weight: number;
  }> = [];

  constructor() {
    this._initializeStrategies();
    this._initializeOnboardingQuestions();
  }

  private _initializeStrategies(): void {
    this._strategies = [
      {
        name: 'popularity-based',
        type: 'user-cold-start',
        weight: 1.0,
        condition: (user) => user?.coldStartPhase === 'pre-onboarding' || user?.onboardingProgress === 0
      },
      {
        name: 'demographic-based',
        type: 'user-cold-start',
        weight: 0.8,
        condition: (user) => !!user?.demographicInfo && Object.keys(user.demographicInfo).length > 0
      },
      {
        name: 'content-based',
        type: 'item-cold-start',
        weight: 0.9,
        condition: (_, item) => !!item?.category || (item?.tags?.length || 0) > 0
      },
      {
        name: 'exploration-based',
        type: 'scene-cold-start',
        weight: 0.7,
        condition: (_, __, scene) => !!scene && Object.keys(scene.context).length > 0
      }
    ];
  }

  private _initializeOnboardingQuestions(): void {
    this._onboardingQuestions = [
      {
        id: 'gender',
        question: '您的性别是？',
        options: ['男', '女', '其他', '不愿透露'],
        category: 'demographic',
        weight: 0.3
      },
      {
        id: 'age-group',
        question: '您的年龄段是？',
        options: ['18以下', '18-24', '25-34', '35-44', '45-54', '55以上'],
        category: 'demographic',
        weight: 0.25
      },
      {
        id: 'interest-category',
        question: '您感兴趣的品类是？（可多选）',
        options: ['科技', '时尚', '美食', '旅行', '运动', '阅读', '音乐', '游戏'],
        category: 'interest',
        weight: 0.45
      }
    ];
  }

  get recommendations(): ColdStartRecommendation[] {
    return this._recommendations;
  }

  get lastStrategy(): string {
    return this._lastStrategy;
  }

  get newUsers(): Map<string, NewUserProfile> {
    return this._newUsers;
  }

  get newItems(): Map<string, NewItemProfile> {
    return this._newItems;
  }

  get popularityConfig(): PopularityBasedConfig {
    return { ...this._popularityConfig };
  }

  get contentConfig(): ContentBasedConfig {
    return { ...this._contentConfig };
  }

  get demographicConfig(): DemographicConfig {
    return { ...this._demographicConfig };
  }

  get explorationConfig(): ExplorationConfig {
    return { ...this._explorationConfig };
  }

  get onboardingQuestions(): Array<{ id: string; question: string; options: string[]; category: string; weight: number }> {
    return [...this._onboardingQuestions];
  }

  setPopularityConfig(config: Partial<PopularityBasedConfig>): void {
    this._popularityConfig = { ...this._popularityConfig, ...config };
  }

  setContentConfig(config: Partial<ContentBasedConfig>): void {
    this._contentConfig = { ...this._contentConfig, ...config };
  }

  setDemographicConfig(config: Partial<DemographicConfig>): void {
    this._demographicConfig = { ...this._demographicConfig, ...config };
  }

  setExplorationConfig(config: Partial<ExplorationConfig>): void {
    this._explorationConfig = { ...this._explorationConfig, ...config };
  }

  registerNewUser(
    userId: string,
    initialData?: {
      registrationInfo?: Record<string, unknown>;
      initialInterests?: string[];
      demographicInfo?: Record<string, unknown>;
    }
  ): NewUserProfile {
    const profile: NewUserProfile = {
      userId,
      registrationInfo: initialData?.registrationInfo || {},
      initialInterests: initialData?.initialInterests || [],
      demographicInfo: initialData?.demographicInfo || {},
      onboardingProgress: 0,
      coldStartPhase: 'pre-onboarding'
    };

    this._newUsers.set(userId, profile);
    return profile;
  }

  updateUserOnboarding(
    userId: string,
    answers: Record<string, string[]>
  ): NewUserProfile | null {
    const user = this._newUsers.get(userId);
    if (!user) return null;

    const totalQuestions = this._onboardingQuestions.length;
    const answeredQuestions = Object.keys(answers).length;
    user.onboardingProgress = answeredQuestions / totalQuestions;

    for (const [questionId, answer] of Object.entries(answers)) {
      const question = this._onboardingQuestions.find(q => q.id === questionId);
      if (question && question.category === 'demographic') {
        user.demographicInfo[questionId] = answer;
      } else if (question && question.category === 'interest') {
        user.initialInterests = [...new Set([...user.initialInterests, ...answer])];
      }
    }

    if (user.onboardingProgress >= 1) {
      user.coldStartPhase = 'onboarding';
    } else if (user.onboardingProgress > 0) {
      user.coldStartPhase = 'pre-onboarding';
    }

    this._newUsers.set(userId, user);
    return user;
  }

  registerNewItem(
    itemId: string,
    data: {
      category: string;
      subcategory?: string;
      tags?: string[];
      attributes?: Record<string, unknown>;
    }
  ): NewItemProfile {
    const profile: NewItemProfile = {
      itemId,
      attributes: data.attributes || {},
      category: data.category,
      subcategory: data.subcategory,
      tags: data.tags || [],
      launchDate: Date.now(),
      coldStartPhase: 'new'
    };

    this._newItems.set(itemId, profile);
    return profile;
  }

  registerNewScene(
    sceneId: string,
    data: {
      context?: Record<string, unknown>;
      userSegments?: string[];
      itemCategories?: string[];
    }
  ): NewSceneProfile {
    const profile: NewSceneProfile = {
      sceneId,
      context: data.context || {},
      userSegments: data.userSegments || [],
      itemCategories: data.itemCategories || [],
      timestamp: Date.now()
    };

    this._newScenes.set(sceneId, profile);
    return profile;
  }

  solveUserColdStart(
    userId: string,
    itemPool: Array<{ itemId: string; category?: string; popularity?: number; tags?: string[] }>,
    topN: number = 10
  ): ColdStartRecommendation[] {
    const user = this._newUsers.get(userId);
    if (!user) {
      return this._popularityBasedRecommend(itemPool, topN);
    }

    const strategy = this._selectUserStrategy(user);
    this._lastStrategy = strategy;

    let recommendations: ColdStartRecommendation[] = [];

    switch (strategy) {
      case 'popularity-based':
        recommendations = this._popularityBasedRecommend(itemPool, topN);
        break;
      case 'demographic-based':
        recommendations = this._demographicBasedRecommend(user, itemPool, topN);
        break;
      case 'interest-based':
        recommendations = this._interestBasedRecommend(user, itemPool, topN);
        break;
      case 'hybrid-cold-start':
        recommendations = this._hybridColdStartRecommend(user, itemPool, topN);
        break;
      default:
        recommendations = this._popularityBasedRecommend(itemPool, topN);
    }

    this._recommendations = recommendations;
    this._counter++;
    return recommendations;
  }

  private _selectUserStrategy(user: NewUserProfile): string {
    if (user.coldStartPhase === 'pre-onboarding' || user.onboardingProgress === 0) {
      return 'popularity-based';
    } else if (Object.keys(user.demographicInfo).length > 0 && user.initialInterests.length === 0) {
      return 'demographic-based';
    } else if (user.initialInterests.length > 0) {
      return 'interest-based';
    }
    return 'hybrid-cold-start';
  }

  private _popularityBasedRecommend(
    itemPool: Array<{ itemId: string; category?: string; popularity?: number; tags?: string[] }>,
    topN: number
  ): ColdStartRecommendation[] {
    const sorted = [...itemPool].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    const recommendations: ColdStartRecommendation[] = sorted.slice(0, topN).map((item, idx) => ({
      itemId: item.itemId,
      score: 1 - idx * 0.05,
      confidence: 0.6,
      strategy: 'popularity-based',
      explanation: `热门推荐，热度排名第 ${idx + 1}`
    }));

    return recommendations;
  }

  private _demographicBasedRecommend(
    user: NewUserProfile,
    itemPool: Array<{ itemId: string; category?: string; popularity?: number; tags?: string[]; demographicMatch?: Record<string, number> }>,
    topN: number
  ): ColdStartRecommendation[] {
    const scoredItems = itemPool.map(item => {
      let score = 0;
      let totalWeight = 0;

      if (item.demographicMatch) {
        for (const [key, value] of Object.entries(item.demographicMatch)) {
          const weight = (this._demographicConfig as Record<string, number>)[key] || 0.1;
          score += value * weight;
          totalWeight += weight;
        }
      }

      score = totalWeight > 0 ? score / totalWeight : (item.popularity || 0) * 0.5;
      return { ...item, finalScore: score };
    });

    scoredItems.sort((a, b) => b.finalScore - a.finalScore);

    return scoredItems.slice(0, topN).map((item, idx) => ({
      itemId: item.itemId,
      score: item.finalScore,
      confidence: 0.55,
      strategy: 'demographic-based',
      explanation: `基于人口统计学的推荐，匹配度排名第 ${idx + 1}`
    }));
  }

  private _interestBasedRecommend(
    user: NewUserProfile,
    itemPool: Array<{ itemId: string; category?: string; popularity?: number; tags?: string[] }>,
    topN: number
  ): ColdStartRecommendation[] {
    const userInterests = new Set(user.initialInterests);

    const scoredItems = itemPool.map(item => {
      let matchCount = 0;
      const itemTags = item.tags || [];
      const itemCategory = item.category || '';

      for (const tag of itemTags) {
        if (userInterests.has(tag)) {
          matchCount++;
        }
      }

      if (userInterests.has(itemCategory)) {
        matchCount += 2;
      }

      const totalPossible = itemTags.length + 1;
      const score = totalPossible > 0 ? matchCount / totalPossible : 0;
      const popularityBonus = (item.popularity || 0) * 0.2;

      return { ...item, finalScore: score * 0.8 + popularityBonus };
    });

    scoredItems.sort((a, b) => b.finalScore - a.finalScore);

    return scoredItems.slice(0, topN).map((item, idx) => ({
      itemId: item.itemId,
      score: item.finalScore,
      confidence: 0.65,
      strategy: 'interest-based',
      explanation: `基于初始兴趣的推荐，兴趣匹配度排名第 ${idx + 1}`
    }));
  }

  private _hybridColdStartRecommend(
    user: NewUserProfile,
    itemPool: Array<{ itemId: string; category?: string; popularity?: number; tags?: string[] }>,
    topN: number
  ): ColdStartRecommendation[] {
    const popularityRecs = this._popularityBasedRecommend(itemPool, topN * 2);
    const interestRecs = this._interestBasedRecommend(user, itemPool, topN * 2);

    const itemScores = new Map<string, { score: number; strategies: string[] }>();

    for (const rec of popularityRecs) {
      itemScores.set(rec.itemId, { score: rec.score * 0.4, strategies: [rec.strategy] });
    }

    for (const rec of interestRecs) {
      const existing = itemScores.get(rec.itemId);
      if (existing) {
        existing.score += rec.score * 0.6;
        existing.strategies.push(rec.strategy);
      } else {
        itemScores.set(rec.itemId, { score: rec.score * 0.6, strategies: [rec.strategy] });
      }
    }

    const combined = Array.from(itemScores.entries())
      .map(([itemId, data]) => ({ itemId, ...data }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);

    return combined.map((item, idx) => ({
      itemId: item.itemId,
      score: item.score,
      confidence: 0.7,
      strategy: item.strategies.join('+'),
      explanation: `混合冷启动推荐，综合排名第 ${idx + 1}`
    }));
  }

  solveItemColdStart(
    itemId: string,
    relatedItems: Array<{ itemId: string; category?: string; tags?: string[]; similarity?: number }>,
    topN: number = 10
  ): ColdStartRecommendation[] {
    const item = this._newItems.get(itemId);
    const strategy = item ? this._selectItemStrategy(item) : 'content-based';
    this._lastStrategy = strategy;

    let recommendations: ColdStartRecommendation[] = [];

    if (strategy === 'content-based') {
      recommendations = this._contentBasedItemRecommend(itemId, relatedItems, topN);
    } else if (strategy === 'category-popularity') {
      recommendations = this._categoryPopularityRecommend(itemId, relatedItems, topN);
    }

    this._recommendations = recommendations;
    this._counter++;
    return recommendations;
  }

  private _selectItemStrategy(item: NewItemProfile): string {
    if (item.tags.length > 0 || item.category) {
      return 'content-based';
    }
    return 'category-popularity';
  }

  private _contentBasedItemRecommend(
    itemId: string,
    relatedItems: Array<{ itemId: string; category?: string; tags?: string[]; similarity?: number }>,
    topN: number
  ): ColdStartRecommendation[] {
    const scored = relatedItems.map(item => {
      const similarity = item.similarity || this._calculateItemSimilarity(itemId, item);
      return { ...item, finalSimilarity: similarity };
    });

    scored.sort((a, b) => b.finalSimilarity - a.finalSimilarity);

    return scored.slice(0, topN).map((item, idx) => ({
      itemId: item.itemId,
      score: item.finalSimilarity,
      confidence: 0.65,
      strategy: 'content-based',
      explanation: `基于内容相似性推荐，相似度排名第 ${idx + 1}`
    }));
  }

  private _calculateItemSimilarity(
    itemId: string,
    otherItem: { category?: string; tags?: string[] }
  ): number {
    const item = this._newItems.get(itemId);
    if (!item) return 0;

    const itemTags = new Set(item.tags);
    const otherTags = new Set(otherItem.tags || []);

    let intersection = 0;
    for (const tag of itemTags) {
      if (otherTags.has(tag)) intersection++;
    }
    const union = itemTags.size + otherTags.size - intersection;
    const jaccard = union === 0 ? 0 : intersection / union;

    const categoryMatch = item.category === otherItem.category ? 1 : 0;

    return jaccard * 0.7 + categoryMatch * 0.3;
  }

  private _categoryPopularityRecommend(
    itemId: string,
    relatedItems: Array<{ itemId: string; category?: string; popularity?: number }>,
    topN: number
  ): ColdStartRecommendation[] {
    const item = this._newItems.get(itemId);
    const category = item?.category || '';

    const sameCategoryItems = relatedItems.filter(i => i.category === category);
    const sorted = sameCategoryItems.length > 0
      ? sameCategoryItems.sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      : relatedItems.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

    return sorted.slice(0, topN).map((item, idx) => ({
      itemId: item.itemId,
      score: 1 - idx * 0.05,
      confidence: 0.5,
      strategy: 'category-popularity',
      explanation: `同品类热门推荐，排名第 ${idx + 1}`
    }));
  }

  solveSceneColdStart(
    sceneId: string,
    itemPool: Array<{ itemId: string; category?: string; popularity?: number }>,
    topN: number = 10
  ): ColdStartRecommendation[] {
    const scene = this._newScenes.get(sceneId);
    this._lastStrategy = 'exploration-based';

    const recommendations: ColdStartRecommendation[] = [];
    const shuffled = [...itemPool].sort(() => Math.random() - 0.5);
    const explorationItems = shuffled.slice(0, Math.min(this._explorationConfig.maxExplorationItems, topN));

    for (let i = 0; i < explorationItems.length; i++) {
      recommendations.push({
        itemId: explorationItems[i].itemId,
        score: 0.5 + Math.random() * 0.3,
        confidence: 0.4,
        strategy: 'exploration-based',
        explanation: `新场景探索推荐，探索性推荐第 ${i + 1} 个`
      });
    }

    const remaining = topN - recommendations.length;
    if (remaining > 0) {
      const popularItems = [...itemPool]
        .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
        .slice(0, remaining);

      for (let i = 0; i < popularItems.length; i++) {
        recommendations.push({
          itemId: popularItems[i].itemId,
          score: 0.6 - i * 0.03,
          confidence: 0.55,
          strategy: 'popularity-fallback',
          explanation: `热门兜底推荐，排名第 ${i + 1}`
        });
      }
    }

    recommendations.sort((a, b) => b.score - a.score);
    this._recommendations = recommendations.slice(0, topN);
    this._counter++;
    return this._recommendations;
  }

  estimateColdStartSeverity(
    userId?: string,
    itemId?: string,
    sceneId?: string
  ): { user: number; item: number; scene: number; overall: number } {
    let userSeverity = 0;
    let itemSeverity = 0;
    let sceneSeverity = 0;

    if (userId) {
      const user = this._newUsers.get(userId);
      if (user) {
        userSeverity = 1 - user.onboardingProgress;
      } else {
        userSeverity = 1;
      }
    }

    if (itemId) {
      const item = this._newItems.get(itemId);
      if (item) {
        const daysSinceLaunch = (Date.now() - item.launchDate) / (1000 * 60 * 60 * 24);
        itemSeverity = Math.max(0, 1 - daysSinceLaunch / 30);
      } else {
        itemSeverity = 1;
      }
    }

    if (sceneId) {
      const scene = this._newScenes.get(sceneId);
      if (scene) {
        const dataPoints = Object.keys(scene.context).length + scene.userSegments.length + scene.itemCategories.length;
        sceneSeverity = Math.max(0, 1 - dataPoints / 20);
      } else {
        sceneSeverity = 1;
      }
    }

    const components = [userSeverity, itemSeverity, sceneSeverity].filter(s => s > 0);
    const overall = components.length > 0 ? components.reduce((a, b) => a + b, 0) / components.length : 0;

    return { user: userSeverity, item: itemSeverity, scene: sceneSeverity, overall };
  }

  transitionUserPhase(userId: string, interactionCount: number): NewUserProfile | null {
    const user = this._newUsers.get(userId);
    if (!user) return null;

    if (interactionCount >= 50) {
      user.coldStartPhase = 'normal';
    } else if (interactionCount >= 20) {
      user.coldStartPhase = 'early-adopter';
    } else if (user.onboardingProgress >= 1) {
      user.coldStartPhase = 'onboarding';
    }

    this._newUsers.set(userId, user);
    return user;
  }

  transitionItemPhase(itemId: string, interactionCount: number): NewItemProfile | null {
    const item = this._newItems.get(itemId);
    if (!item) return null;

    if (interactionCount >= 100) {
      item.coldStartPhase = 'established';
    } else if (interactionCount >= 20) {
      item.coldStartPhase = 'rising';
    }

    this._newItems.set(itemId, item);
    return item;
  }

  addStrategy(strategy: ColdStartStrategy): void {
    this._strategies.push(strategy);
  }

  setPopularityCache(category: string, items: Array<{ itemId: string; score: number }>): void {
    this._popularityCache.set(category, items);
  }

  toPacket(): DataPacket<ColdStartRecommendation[]> {
    this._counter++;
    return {
      id: `cold-start-${Date.now()}-${this._counter}`,
      payload: this._recommendations,
      metadata: {
        createdAt: Date.now(),
        route: ['recommendation', 'cold-start'],
        priority: 1,
        phase: 'cold-start-solving'
      }
    };
  }

  reset(): void {
    this._recommendations = [];
    this._counter = 0;
    this._lastStrategy = '';
    this._newUsers.clear();
    this._newItems.clear();
    this._newScenes.clear();
    this._popularityCache.clear();
    this._strategies = [];
    this._popularityConfig = {
      timeWindowDays: 7,
      categoryLevel: 'all',
      diversityFactor: 0.3
    };
    this._contentConfig = {
      featureWeight: 0.8,
      similarityThreshold: 0.2,
      maxSimilarItems: 20
    };
    this._demographicConfig = {
      ageWeight: 0.2,
      genderWeight: 0.3,
      locationWeight: 0.25,
      occupationWeight: 0.25
    };
    this._explorationConfig = {
      explorationRate: 0.3,
      explorationDecay: 0.95,
      maxExplorationItems: 5
    };
    this._socialConfig = {
      friendWeight: 0.6,
      followWeight: 0.4,
      socialProofThreshold: 3
    };
    this._initializeStrategies();
    this._initializeOnboardingQuestions();
  }
}
