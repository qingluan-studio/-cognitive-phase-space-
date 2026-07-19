import { DataPacket } from '../shared/types';

export interface UserBehavior {
  userId: string;
  itemId: string;
  action: 'view' | 'click' | 'purchase' | 'favorite' | 'share' | 'comment' | 'rate';
  timestamp: number;
  duration?: number;
  rating?: number;
  metadata?: Record<string, unknown>;
}

export interface InterestTag {
  tag: string;
  weight: number;
  frequency: number;
  lastActive: number;
  category: string;
  level: number;
}

export interface UserDemographics {
  age?: number;
  gender?: string;
  location?: string;
  occupation?: string;
  education?: string;
  incomeLevel?: string;
}

export interface UserPreferences {
  priceRange?: [number, number];
  brandPreferences?: string[];
  stylePreferences?: string[];
  contentTypes?: string[];
  preferredTime?: string[];
  devicePreference?: string;
}

export interface UserSegment {
  segmentId: string;
  name: string;
  description: string;
  confidence: number;
  characteristics: string[];
}

export interface UserProfile {
  userId: string;
  demographics: UserDemographics;
  preferences: UserPreferences;
  interests: InterestTag[];
  behaviorHistory: UserBehavior[];
  segments: UserSegment[];
  activityLevel: number;
  loyaltyScore: number;
  lifetimeValue: number;
  createdAt: number;
  updatedAt: number;
  lastActive: number;
}

export interface ProfileConfig {
  maxHistorySize: number;
  interestDecayRate: number;
  maxInterests: number;
  minInterestWeight: number;
  behaviorWeights: Record<string, number>;
  timeWindowDays: number;
}

export class UserProfiling {
  private _profiles: Map<string, UserProfile> = new Map();
  private _counter: number = 0;
  private _lastProfile: UserProfile | null = null;
  private _config: ProfileConfig = {
    maxHistorySize: 1000,
    interestDecayRate: 0.01,
    maxInterests: 200,
    minInterestWeight: 0.01,
    behaviorWeights: {
      view: 1,
      click: 2,
      favorite: 4,
      share: 5,
      comment: 3,
      purchase: 10,
      rate: 3
    },
    timeWindowDays: 90
  };
  private _tagCategories: Map<string, string> = new Map();
  private _segmentRules: Map<string, (profile: UserProfile) => boolean> = new Map();

  constructor() {
    this._initializeDefaultSegments();
  }

  private _initializeDefaultSegments(): void {
    this._segmentRules.set('new-user', (p) => {
      const age = Date.now() - p.createdAt;
      return age < 7 * 24 * 60 * 60 * 1000;
    });
    this._segmentRules.set('active-user', (p) => p.activityLevel > 0.5);
    this._segmentRules.set('loyal-customer', (p) => p.loyaltyScore > 0.7);
    this._segmentRules.set('high-value', (p) => p.lifetimeValue > 1000);
    this._segmentRules.set('price-sensitive', (p) => {
      return p.preferences.priceRange !== undefined;
    });
    this._segmentRules.set('casual-browser', (p) => {
      return p.behaviorHistory.filter(b => b.action === 'purchase').length < 3;
    });
  }

  get profiles(): Map<string, UserProfile> {
    return this._profiles;
  }

  get config(): ProfileConfig {
    return { ...this._config };
  }

  get lastProfile(): UserProfile | null {
    return this._lastProfile;
  }

  get profileCount(): number {
    return this._profiles.size;
  }

  setConfig(config: Partial<ProfileConfig>): void {
    this._config = { ...this._config, ...config };
  }

  setTagCategory(tag: string, category: string): void {
    this._tagCategories.set(tag, category);
  }

  createProfile(
    userId: string,
    demographics?: UserDemographics,
    preferences?: UserPreferences
  ): UserProfile {
    const now = Date.now();
    const profile: UserProfile = {
      userId,
      demographics: demographics || {},
      preferences: preferences || {},
      interests: [],
      behaviorHistory: [],
      segments: [],
      activityLevel: 0,
      loyaltyScore: 0,
      lifetimeValue: 0,
      createdAt: now,
      updatedAt: now,
      lastActive: now
    };

    this._profiles.set(userId, profile);
    this._lastProfile = profile;
    this._counter++;
    return profile;
  }

  getProfile(userId: string): UserProfile | undefined {
    return this._profiles.get(userId);
  }

  recordBehavior(
    userId: string,
    behavior: Omit<UserBehavior, 'userId' | 'timestamp'> & { timestamp?: number }
  ): UserProfile | null {
    let profile = this._profiles.get(userId);
    if (!profile) {
      profile = this.createProfile(userId);
    }

    const fullBehavior: UserBehavior = {
      userId,
      itemId: behavior.itemId,
      action: behavior.action,
      timestamp: behavior.timestamp || Date.now(),
      duration: behavior.duration,
      rating: behavior.rating,
      metadata: behavior.metadata
    };

    profile.behaviorHistory.unshift(fullBehavior);
    if (profile.behaviorHistory.length > this._config.maxHistorySize) {
      profile.behaviorHistory = profile.behaviorHistory.slice(0, this._config.maxHistorySize);
    }

    this._updateInterests(profile, fullBehavior);
    this._updateActivityLevel(profile);
    this._updateLoyaltyScore(profile);
    this._updateLifetimeValue(profile, fullBehavior);
    this._updateSegments(profile);

    profile.updatedAt = Date.now();
    profile.lastActive = fullBehavior.timestamp;

    this._profiles.set(userId, profile);
    this._lastProfile = profile;
    return profile;
  }

  private _updateInterests(profile: UserProfile, behavior: UserBehavior): void {
    const weight = this._config.behaviorWeights[behavior.action] || 1;
    const tags = this._extractTagsFromBehavior(behavior);
    const now = behavior.timestamp;

    const interestMap = new Map<string, InterestTag>();
    for (const interest of profile.interests) {
      interestMap.set(interest.tag, interest);
    }

    for (const tag of tags) {
      const existing = interestMap.get(tag);
      if (existing) {
        existing.weight += weight;
        existing.frequency += 1;
        existing.lastActive = now;
        existing.level = Math.min(5, existing.level + 0.1);
      } else {
        interestMap.set(tag, {
          tag,
          weight,
          frequency: 1,
          lastActive: now,
          category: this._tagCategories.get(tag) || 'general',
          level: 1
        });
      }
    }

    for (const interest of interestMap.values()) {
      const timeSinceActive = (now - interest.lastActive) / (1000 * 60 * 60 * 24);
      const decay = Math.exp(-this._config.interestDecayRate * timeSinceActive);
      interest.weight *= decay;
      interest.level *= decay;
    }

    const interests = Array.from(interestMap.values())
      .filter(i => i.weight >= this._config.minInterestWeight)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, this._config.maxInterests);

    if (interests.length > 0) {
      const maxWeight = Math.max(...interests.map(i => i.weight));
      interests.forEach(i => {
        i.weight = i.weight / maxWeight;
      });
    }

    profile.interests = interests;
  }

  private _extractTagsFromBehavior(behavior: UserBehavior): string[] {
    const tags: string[] = [];
    tags.push(`item:${behavior.itemId}`);

    if (behavior.metadata) {
      if (behavior.metadata.category) {
        tags.push(`category:${behavior.metadata.category}`);
      }
      if (behavior.metadata.brand) {
        tags.push(`brand:${behavior.metadata.brand}`);
      }
      if (behavior.metadata.tags && Array.isArray(behavior.metadata.tags)) {
        behavior.metadata.tags.forEach((t: string) => tags.push(t));
      }
    }

    return tags;
  }

  private _updateActivityLevel(profile: UserProfile): void {
    const now = Date.now();
    const windowMs = this._config.timeWindowDays * 24 * 60 * 60 * 1000;
    const recentBehaviors = profile.behaviorHistory.filter(
      b => now - b.timestamp < windowMs
    );

    const behaviorCount = recentBehaviors.length;
    const weightedCount = recentBehaviors.reduce((sum, b) => {
      return sum + (this._config.behaviorWeights[b.action] || 1);
    }, 0);

    const expectedMax = 100;
    profile.activityLevel = Math.min(1, weightedCount / expectedMax);
  }

  private _updateLoyaltyScore(profile: UserProfile): void {
    const purchaseCount = profile.behaviorHistory.filter(
      b => b.action === 'purchase'
    ).length;
    const activityScore = profile.activityLevel;
    const ageScore = Math.min(1, (Date.now() - profile.createdAt) / (365 * 24 * 60 * 60 * 1000));
    const varietyScore = this._calculateBehaviorVariety(profile);

    profile.loyaltyScore = (
      purchaseCount * 0.3 +
      activityScore * 0.3 +
      ageScore * 0.2 +
      varietyScore * 0.2
    );
    profile.loyaltyScore = Math.min(1, Math.max(0, profile.loyaltyScore));
  }

  private _calculateBehaviorVariety(profile: UserProfile): number {
    const actions = new Set(profile.behaviorHistory.map(b => b.action));
    const maxActions = 7;
    return actions.size / maxActions;
  }

  private _updateLifetimeValue(profile: UserProfile, behavior: UserBehavior): void {
    if (behavior.action === 'purchase' && behavior.metadata) {
      const amount = (behavior.metadata.amount as number) || 0;
      profile.lifetimeValue += amount;
    }
  }

  private _updateSegments(profile: UserProfile): void {
    const segments: UserSegment[] = [];

    for (const [segmentId, rule] of this._segmentRules) {
      if (rule(profile)) {
        segments.push({
          segmentId,
          name: this._getSegmentName(segmentId),
          description: this._getSegmentDescription(segmentId),
          confidence: 0.8,
          characteristics: []
        });
      }
    }

    profile.segments = segments;
  }

  private _getSegmentName(segmentId: string): string {
    const names: Record<string, string> = {
      'new-user': '新用户',
      'active-user': '活跃用户',
      'loyal-customer': '忠实客户',
      'high-value': '高价值用户',
      'price-sensitive': '价格敏感型',
      'casual-browser': '休闲浏览者'
    };
    return names[segmentId] || segmentId;
  }

  private _getSegmentDescription(segmentId: string): string {
    const descriptions: Record<string, string> = {
      'new-user': '注册时间在7天以内的新用户',
      'active-user': '近期活跃度较高的用户',
      'loyal-customer': '忠诚度评分较高的用户',
      'high-value': '生命周期价值较高的用户',
      'price-sensitive': '对价格敏感的用户',
      'casual-browser': '购买行为较少的浏览用户'
    };
    return descriptions[segmentId] || '';
  }

  updateDemographics(
    userId: string,
    demographics: Partial<UserDemographics>
  ): UserProfile | null {
    const profile = this._profiles.get(userId);
    if (!profile) return null;

    profile.demographics = { ...profile.demographics, ...demographics };
    profile.updatedAt = Date.now();
    this._profiles.set(userId, profile);
    this._lastProfile = profile;
    return profile;
  }

  updatePreferences(
    userId: string,
    preferences: Partial<UserPreferences>
  ): UserProfile | null {
    const profile = this._profiles.get(userId);
    if (!profile) return null;

    profile.preferences = { ...profile.preferences, ...preferences };
    profile.updatedAt = Date.now();
    this._profiles.set(userId, profile);
    this._lastProfile = profile;
    return profile;
  }

  addInterestTag(
    userId: string,
    tag: string,
    weight: number = 0.5,
    category: string = 'general'
  ): UserProfile | null {
    const profile = this._profiles.get(userId);
    if (!profile) return null;

    const existingIndex = profile.interests.findIndex(i => i.tag === tag);
    const now = Date.now();

    if (existingIndex >= 0) {
      profile.interests[existingIndex].weight = Math.min(1, profile.interests[existingIndex].weight + weight);
      profile.interests[existingIndex].frequency += 1;
      profile.interests[existingIndex].lastActive = now;
    } else {
      profile.interests.push({
        tag,
        weight,
        frequency: 1,
        lastActive: now,
        category,
        level: 1
      });
    }

    profile.interests.sort((a, b) => b.weight - a.weight);
    profile.updatedAt = now;
    this._profiles.set(userId, profile);
    this._lastProfile = profile;
    return profile;
  }

  getTopInterests(userId: string, topN: number = 10): InterestTag[] {
    const profile = this._profiles.get(userId);
    if (!profile) return [];
    return profile.interests.slice(0, topN);
  }

  getInterestsByCategory(userId: string, category: string): InterestTag[] {
    const profile = this._profiles.get(userId);
    if (!profile) return [];
    return profile.interests.filter(i => i.category === category);
  }

  calculateUserSimilarity(user1: string, user2: string): number {
    const profile1 = this._profiles.get(user1);
    const profile2 = this._profiles.get(user2);
    if (!profile1 || !profile2) return 0;

    const interests1 = new Map(profile1.interests.map(i => [i.tag, i.weight]));
    const interests2 = new Map(profile2.interests.map(i => [i.tag, i.weight]));

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    const allTags = new Set([...interests1.keys(), ...interests2.keys()]);
    for (const tag of allTags) {
      const w1 = interests1.get(tag) || 0;
      const w2 = interests2.get(tag) || 0;
      dotProduct += w1 * w2;
      norm1 += w1 * w1;
      norm2 += w2 * w2;
    }

    const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  clusterUsers(userIds: string[], k: number = 3): Map<number, string[]> {
    if (userIds.length <= k) {
      const clusters = new Map<number, string[]>();
      userIds.forEach((id, idx) => clusters.set(idx, [id]));
      return clusters;
    }

    const clusters = new Map<number, string[]>();
    const assigned = new Map<string, number>();

    for (let i = 0; i < k; i++) {
      clusters.set(i, [userIds[i]]);
      assigned.set(userIds[i], i);
    }

    for (let i = k; i < userIds.length; i++) {
      const userId = userIds[i];
      let bestCluster = 0;
      let bestSimilarity = -1;

      for (let c = 0; c < k; c++) {
        const clusterUsers = clusters.get(c) || [];
        if (clusterUsers.length > 0) {
          const avgSim = clusterUsers.reduce(
            (sum, u) => sum + this.calculateUserSimilarity(userId, u),
            0
          ) / clusterUsers.length;
          if (avgSim > bestSimilarity) {
            bestSimilarity = avgSim;
            bestCluster = c;
          }
        }
      }

      const cluster = clusters.get(bestCluster) || [];
      cluster.push(userId);
      clusters.set(bestCluster, cluster);
      assigned.set(userId, bestCluster);
    }

    return clusters;
  }

  getUserStats(userId: string): {
    totalBehaviors: number;
    behaviorBreakdown: Record<string, number>;
    averageSessionDuration: number;
    favoriteCategories: string[];
  } {
    const profile = this._profiles.get(userId);
    if (!profile) {
      return {
        totalBehaviors: 0,
        behaviorBreakdown: {},
        averageSessionDuration: 0,
        favoriteCategories: []
      };
    }

    const behaviorBreakdown: Record<string, number> = {};
    for (const b of profile.behaviorHistory) {
      behaviorBreakdown[b.action] = (behaviorBreakdown[b.action] || 0) + 1;
    }

    const totalDuration = profile.behaviorHistory
      .filter(b => b.duration)
      .reduce((sum, b) => sum + (b.duration || 0), 0);
    const sessions = profile.behaviorHistory.filter(b => b.duration).length;
    const averageSessionDuration = sessions > 0 ? totalDuration / sessions : 0;

    const categoryWeights = new Map<string, number>();
    for (const interest of profile.interests) {
      if (interest.tag.startsWith('category:')) {
        categoryWeights.set(interest.tag.replace('category:', ''), interest.weight);
      }
    }
    const favoriteCategories = Array.from(categoryWeights.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat]) => cat);

    return {
      totalBehaviors: profile.behaviorHistory.length,
      behaviorBreakdown,
      averageSessionDuration,
      favoriteCategories
    };
  }

  predictUserPreference(
    userId: string,
    itemTags: string[]
  ): number {
    const profile = this._profiles.get(userId);
    if (!profile) return 0.5;

    const interestMap = new Map(profile.interests.map(i => [i.tag, i.weight]));
    let totalScore = 0;
    let matchedTags = 0;

    for (const tag of itemTags) {
      const weight = interestMap.get(tag);
      if (weight !== undefined) {
        totalScore += weight;
        matchedTags++;
      }
    }

    return itemTags.length > 0 ? totalScore / itemTags.length : 0;
  }

  decayInterests(userId: string): UserProfile | null {
    const profile = this._profiles.get(userId);
    if (!profile) return null;

    const now = Date.now();
    for (const interest of profile.interests) {
      const timeSinceActive = (now - interest.lastActive) / (1000 * 60 * 60 * 24);
      const decay = Math.exp(-this._config.interestDecayRate * timeSinceActive);
      interest.weight *= decay;
      interest.level *= decay;
    }

    profile.interests = profile.interests
      .filter(i => i.weight >= this._config.minInterestWeight)
      .sort((a, b) => b.weight - a.weight);

    profile.updatedAt = now;
    this._profiles.set(userId, profile);
    return profile;
  }

  mergeProfiles(primaryUserId: string, secondaryUserId: string): UserProfile | null {
    const primary = this._profiles.get(primaryUserId);
    const secondary = this._profiles.get(secondaryUserId);
    if (!primary || !secondary) return null;

    primary.behaviorHistory = [...secondary.behaviorHistory, ...primary.behaviorHistory]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, this._config.maxHistorySize);

    const interestMap = new Map<string, InterestTag>();
    for (const interest of primary.interests) {
      interestMap.set(interest.tag, interest);
    }
    for (const interest of secondary.interests) {
      const existing = interestMap.get(interest.tag);
      if (existing) {
        existing.weight = Math.max(existing.weight, interest.weight);
        existing.frequency += interest.frequency;
        existing.lastActive = Math.max(existing.lastActive, interest.lastActive);
      } else {
        interestMap.set(interest.tag, interest);
      }
    }

    primary.interests = Array.from(interestMap.values())
      .sort((a, b) => b.weight - a.weight)
      .slice(0, this._config.maxInterests);

    primary.demographics = { ...secondary.demographics, ...primary.demographics };
    primary.preferences = { ...secondary.preferences, ...primary.preferences };
    primary.lifetimeValue += secondary.lifetimeValue;
    primary.updatedAt = Date.now();

    this._updateActivityLevel(primary);
    this._updateLoyaltyScore(primary);
    this._updateSegments(primary);

    this._profiles.set(primaryUserId, primary);
    this._profiles.delete(secondaryUserId);
    this._lastProfile = primary;
    return primary;
  }

  toPacket(): DataPacket<UserProfile | null> {
    this._counter++;
    return {
      id: `user-profile-${Date.now()}-${this._counter}`,
      payload: this._lastProfile,
      metadata: {
        createdAt: Date.now(),
        route: ['recommendation', 'user-profiling'],
        priority: 1,
        phase: 'user-profiling'
      }
    };
  }

  reset(): void {
    this._profiles.clear();
    this._counter = 0;
    this._lastProfile = null;
    this._config = {
      maxHistorySize: 1000,
      interestDecayRate: 0.01,
      maxInterests: 200,
      minInterestWeight: 0.01,
      behaviorWeights: {
        view: 1,
        click: 2,
        favorite: 4,
        share: 5,
        comment: 3,
        purchase: 10,
        rate: 3
      },
      timeWindowDays: 90
    };
    this._tagCategories.clear();
    this._initializeDefaultSegments();
  }
}
