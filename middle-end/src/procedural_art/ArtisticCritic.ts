import { DataPacket, KnowledgeUnit } from '../shared/types';

export interface ArtworkMetrics {
  composition: number;
  colorHarmony: number;
  balance: number;
  contrast: number;
  textureQuality: number;
  emotionalImpact: number;
  originality: number;
  technicalSkill: number;
}

export interface CriticReview {
  id: string;
  artworkId: string;
  scores: ArtworkMetrics;
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  styleAnalysis: string;
  emotionalResonance: string;
  timestamp: number;
}

export interface IterationSuggestion {
  parameter: string;
  currentValue: number;
  suggestedValue: number;
  confidence: number;
  reason: string;
}

export interface AestheticProfile {
  preferredStyles: string[];
  colorTemperatureBias: number;
  complexityPreference: number;
  symmetryBias: number;
  noveltyThreshold: number;
}

export class ArtisticCritic {
  private _reviews: Map<string, CriticReview>;
  private _aestheticProfile: AestheticProfile;
  private _history: CriticReview[];
  private _styleLibrary: Map<string, ArtworkMetrics>;
  private _iterationLog: Map<string, IterationSuggestion[]>;
  private _artworkCache: Map<string, { metrics: ArtworkMetrics; data: unknown }>;

  constructor() {
    this._reviews = new Map();
    this._aestheticProfile = {
      preferredStyles: ['abstract', 'minimalist', 'impressionist'],
      colorTemperatureBias: 0,
      complexityPreference: 0.6,
      symmetryBias: 0.3,
      noveltyThreshold: 0.4
    };
    this._history = [];
    this._styleLibrary = new Map();
    this._iterationLog = new Map();
    this._artworkCache = new Map();
    this._initializeStyleLibrary();
  }

  get reviewCount(): number { return this._reviews.size; }
  get aestheticProfile(): AestheticProfile { return { ...this._aestheticProfile, preferredStyles: [...this._aestheticProfile.preferredStyles] }; }
  get history(): CriticReview[] { return this._history.map(r => ({ ...r, scores: { ...r.scores } })); }
  get styleCount(): number { return this._styleLibrary.size; }

  private _initializeStyleLibrary(): void {
    const styles: Array<[string, ArtworkMetrics]> = [
      ['minimalist', {
        composition: 0.8, colorHarmony: 0.7, balance: 0.9, contrast: 0.4,
        textureQuality: 0.3, emotionalImpact: 0.6, originality: 0.5, technicalSkill: 0.7
      }],
      ['baroque', {
        composition: 0.7, colorHarmony: 0.6, balance: 0.5, contrast: 0.9,
        textureQuality: 0.9, emotionalImpact: 0.85, originality: 0.6, technicalSkill: 0.9
      }],
      ['impressionist', {
        composition: 0.6, colorHarmony: 0.8, balance: 0.7, contrast: 0.5,
        textureQuality: 0.7, emotionalImpact: 0.75, originality: 0.7, technicalSkill: 0.8
      }],
      ['cyberpunk', {
        composition: 0.65, colorHarmony: 0.5, balance: 0.55, contrast: 0.85,
        textureQuality: 0.8, emotionalImpact: 0.7, originality: 0.85, technicalSkill: 0.75
      }],
      ['abstract', {
        composition: 0.7, colorHarmony: 0.65, balance: 0.6, contrast: 0.7,
        textureQuality: 0.6, emotionalImpact: 0.8, originality: 0.9, technicalSkill: 0.6
      }]
    ];
    for (const [name, metrics] of styles) {
      this._styleLibrary.set(name, metrics);
    }
  }

  public setAestheticProfile(profile: Partial<AestheticProfile>): void {
    this._aestheticProfile = { ...this._aestheticProfile, ...profile };
    if (profile.preferredStyles) {
      this._aestheticProfile.preferredStyles = [...profile.preferredStyles];
    }
  }

  public evaluateArtwork(
    artworkId: string,
    visualMetrics: Partial<ArtworkMetrics>,
    style: string = 'abstract'
  ): CriticReview {
    const styleMetrics = this._styleLibrary.get(style) || this._styleLibrary.get('abstract')!;
    const combined = this._combineMetrics(styleMetrics, visualMetrics);
    const adjusted = this._applyProfileBias(combined);

    const overallScore = this._calculateOverall(adjusted);
    const strengths = this._identifyStrengths(adjusted);
    const weaknesses = this._identifyWeaknesses(adjusted);
    const suggestions = this._generateSuggestions(adjusted, weaknesses);
    const styleAnalysis = this._analyzeStyle(adjusted, style);
    const emotionalResonance = this._analyzeEmotion(adjusted);

    const review: CriticReview = {
      id: `review_${artworkId}_${Date.now()}`,
      artworkId,
      scores: adjusted,
      overallScore,
      strengths,
      weaknesses: weaknesses.map(w => w.parameter),
      suggestions: suggestions.map(s => s.reason),
      styleAnalysis,
      emotionalResonance,
      timestamp: Date.now()
    };

    this._reviews.set(review.id, review);
    this._history.push(review);
    
    if (!this._iterationLog.has(artworkId)) {
      this._iterationLog.set(artworkId, []);
    }
    this._iterationLog.get(artworkId)!.push(...suggestions);

    return review;
  }

  private _combineMetrics(base: ArtworkMetrics, input: Partial<ArtworkMetrics>): ArtworkMetrics {
    return {
      composition: input.composition !== undefined ? (base.composition + input.composition) / 2 : base.composition,
      colorHarmony: input.colorHarmony !== undefined ? (base.colorHarmony + input.colorHarmony) / 2 : base.colorHarmony,
      balance: input.balance !== undefined ? (base.balance + input.balance) / 2 : base.balance,
      contrast: input.contrast !== undefined ? (base.contrast + input.contrast) / 2 : base.contrast,
      textureQuality: input.textureQuality !== undefined ? (base.textureQuality + input.textureQuality) / 2 : base.textureQuality,
      emotionalImpact: input.emotionalImpact !== undefined ? (base.emotionalImpact + input.emotionalImpact) / 2 : base.emotionalImpact,
      originality: input.originality !== undefined ? (base.originality + input.originality) / 2 : base.originality,
      technicalSkill: input.technicalSkill !== undefined ? (base.technicalSkill + input.technicalSkill) / 2 : base.technicalSkill
    };
  }

  private _applyProfileBias(metrics: ArtworkMetrics): ArtworkMetrics {
    const profile = this._aestheticProfile;
    const adjusted = { ...metrics };

    adjusted.balance += (profile.symmetryBias - 0.3) * 0.1;
    adjusted.composition += (profile.complexityPreference - 0.5) * 0.05;
    adjusted.emotionalImpact += profile.noveltyThreshold * 0.1;

    for (const key of Object.keys(adjusted) as (keyof ArtworkMetrics)[]) {
      adjusted[key] = Math.max(0, Math.min(1, adjusted[key]));
    }

    return adjusted;
  }

  private _calculateOverall(scores: ArtworkMetrics): number {
    const weights = {
      composition: 0.15,
      colorHarmony: 0.15,
      balance: 0.1,
      contrast: 0.1,
      textureQuality: 0.1,
      emotionalImpact: 0.2,
      originality: 0.15,
      technicalSkill: 0.05
    };

    let total = 0;
    for (const key of Object.keys(weights) as (keyof ArtworkMetrics)[]) {
      total += scores[key] * weights[key];
    }
    return total;
  }

  private _identifyStrengths(scores: ArtworkMetrics): string[] {
    const entries = Object.entries(scores) as [keyof ArtworkMetrics, number][];
    entries.sort((a, b) => b[1] - a[1]);
    return entries.slice(0, 3).map(([key]) => this._metricToLabel(key));
  }

  private _identifyWeaknesses(scores: ArtworkMetrics): { parameter: keyof ArtworkMetrics; score: number }[] {
    const entries = Object.entries(scores) as [keyof ArtworkMetrics, number][];
    entries.sort((a, b) => a[1] - b[1]);
    return entries
      .filter(([, score]) => score < 0.6)
      .slice(0, 3)
      .map(([parameter, score]) => ({ parameter, score }));
  }

  private _generateSuggestions(
    scores: ArtworkMetrics,
    weaknesses: { parameter: keyof ArtworkMetrics; score: number }[]
  ): IterationSuggestion[] {
    const suggestions: IterationSuggestion[] = [];

    for (const weak of weaknesses) {
      const target = Math.min(0.8, weak.score + 0.25);
      suggestions.push({
        parameter: weak.parameter,
        currentValue: weak.score,
        suggestedValue: target,
        confidence: Math.min(0.9, 0.5 + (target - weak.score) * 2),
        reason: `Improve ${this._metricToLabel(weak.parameter)} from ${(weak.score * 100).toFixed(0)}% to ${(target * 100).toFixed(0)}%`
      });
    }

    if (scores.balance < 0.7 && scores.contrast < 0.7) {
      suggestions.push({
        parameter: 'balance',
        currentValue: scores.balance,
        suggestedValue: 0.75,
        confidence: 0.7,
        reason: 'Consider rebalancing composition to improve visual flow and dynamic contrast'
      });
    }

    return suggestions;
  }

  private _metricToLabel(metric: keyof ArtworkMetrics): string {
    const labels: Record<keyof ArtworkMetrics, string> = {
      composition: 'Composition',
      colorHarmony: 'Color Harmony',
      balance: 'Visual Balance',
      contrast: 'Contrast',
      textureQuality: 'Texture Quality',
      emotionalImpact: 'Emotional Impact',
      originality: 'Originality',
      technicalSkill: 'Technical Skill'
    };
    return labels[metric];
  }

  private _analyzeStyle(scores: ArtworkMetrics, dominantStyle: string): string {
    let analysis = `Dominant style appears to be ${dominantStyle}. `;
    
    if (scores.originality > 0.7 && scores.emotionalImpact > 0.7) {
      analysis += 'Strong expressive quality with distinctive voice. ';
    }
    if (scores.technicalSkill > 0.75 && scores.textureQuality > 0.7) {
      analysis += 'Demonstrates solid technical craftsmanship. ';
    }
    if (scores.balance > 0.7 && scores.composition > 0.7) {
      analysis += 'Well-structured composition with thoughtful arrangement. ';
    }
    if (scores.colorHarmony > 0.7) {
      analysis += 'Color palette shows strong cohesion and intentionality.';
    }

    return analysis;
  }

  private _analyzeEmotion(scores: ArtworkMetrics): string {
    const emotions: string[] = [];

    if (scores.emotionalImpact > 0.7) {
      if (scores.contrast > 0.7) {
        emotions.push('intensity');
        emotions.push('drama');
      }
      if (scores.colorHarmony > 0.7) {
        emotions.push('serenity');
      }
      if (scores.originality > 0.7) {
        emotions.push('wonder');
        emotions.push('curiosity');
      }
    }

    if (scores.balance > 0.7 && scores.contrast < 0.5) {
      emotions.push('calm');
      emotions.push('meditation');
    }

    if (emotions.length === 0) {
      return 'Neutral emotional resonance. The work may benefit from more expressive elements.';
    }

    return `Evokes feelings of ${emotions.slice(0, 3).join(', ')}. Emotional intensity: ${(scores.emotionalImpact * 100).toFixed(0)}%.`;
  }

  public getReview(reviewId: string): CriticReview | undefined {
    return this._reviews.get(reviewId);
  }

  public getArtworkReviews(artworkId: string): CriticReview[] {
    return this._history.filter(r => r.artworkId === artworkId);
  }

  public getIterationSuggestions(artworkId: string): IterationSuggestion[] {
    return this._iterationLog.get(artworkId) || [];
  }

  public compareArtworks(artworkIdA: string, artworkIdB: string): { 
    differences: ArtworkMetrics; 
    winner: string | null;
    margin: number;
  } {
    const reviewsA = this.getArtworkReviews(artworkIdA);
    const reviewsB = this.getArtworkReviews(artworkIdB);

    if (reviewsA.length === 0 || reviewsB.length === 0) {
      return {
        differences: {
          composition: 0, colorHarmony: 0, balance: 0, contrast: 0,
          textureQuality: 0, emotionalImpact: 0, originality: 0, technicalSkill: 0
        },
        winner: null,
        margin: 0
      };
    }

    const latestA = reviewsA[reviewsA.length - 1];
    const latestB = reviewsB[reviewsB.length - 1];

    const differences: ArtworkMetrics = {
      composition: latestA.scores.composition - latestB.scores.composition,
      colorHarmony: latestA.scores.colorHarmony - latestB.scores.colorHarmony,
      balance: latestA.scores.balance - latestB.scores.balance,
      contrast: latestA.scores.contrast - latestB.scores.contrast,
      textureQuality: latestA.scores.textureQuality - latestB.scores.textureQuality,
      emotionalImpact: latestA.scores.emotionalImpact - latestB.scores.emotionalImpact,
      originality: latestA.scores.originality - latestB.scores.originality,
      technicalSkill: latestA.scores.technicalSkill - latestB.scores.technicalSkill
    };

    const margin = latestA.overallScore - latestB.overallScore;

    return {
      differences,
      winner: Math.abs(margin) > 0.05 ? (margin > 0 ? artworkIdA : artworkIdB) : null,
      margin: Math.abs(margin)
    };
  }

  public trackImprovement(artworkId: string): { improvement: number; trajectory: number[] } {
    const reviews = this.getArtworkReviews(artworkId);
    if (reviews.length < 2) {
      return {
        improvement: 0,
        trajectory: reviews.map(r => r.overallScore)
      };
    }

    const first = reviews[0].overallScore;
    const last = reviews[reviews.length - 1].overallScore;

    return {
      improvement: last - first,
      trajectory: reviews.map(r => r.overallScore)
    };
  }

  public findStyleMatch(metrics: ArtworkMetrics): { style: string; similarity: number }[] {
    const results: { style: string; similarity: number }[] = [];

    for (const [style, styleMetrics] of this._styleLibrary) {
      let distance = 0;
      for (const key of Object.keys(metrics) as (keyof ArtworkMetrics)[]) {
        distance += Math.pow(metrics[key] - styleMetrics[key], 2);
      }
      const similarity = 1 - Math.min(1, Math.sqrt(distance) / 2);
      results.push({ style, similarity });
    }

    results.sort((a, b) => b.similarity - a.similarity);
    return results;
  }

  public extractKnowledgeUnit(reviewId: string): KnowledgeUnit | null {
    const review = this._reviews.get(reviewId);
    if (!review) return null;

    const vector = [
      review.overallScore,
      review.scores.composition,
      review.scores.colorHarmony,
      review.scores.balance,
      review.scores.contrast,
      review.scores.textureQuality,
      review.scores.emotionalImpact,
      review.scores.originality,
      review.scores.technicalSkill,
      review.strengths.length / 3,
      review.weaknesses.length / 3
    ];

    return {
      id: `critic_knowledge_${reviewId}`,
      content: `Art review for ${review.artworkId}: overall ${(review.overallScore * 100).toFixed(1)}%`,
      vector,
      lineage: ['artistic_critic']
    };
  }

  public exportReviewPacket(reviewId: string): DataPacket<CriticReview> | null {
    const review = this._reviews.get(reviewId);
    if (!review) return null;
    return {
      id: `packet_${reviewId}`,
      payload: { ...review, scores: { ...review.scores } },
      metadata: {
        createdAt: Date.now(),
        route: ['procedural_art', 'artistic_critic'],
        priority: 2,
        phase: 'critique'
      }
    };
  }

  public reset(): void {
    this._reviews.clear();
    this._history = [];
    this._iterationLog.clear();
    this._artworkCache.clear();
    this._aestheticProfile = {
      preferredStyles: ['abstract', 'minimalist', 'impressionist'],
      colorTemperatureBias: 0,
      complexityPreference: 0.6,
      symmetryBias: 0.3,
      noveltyThreshold: 0.4
    };
  }

  public exportReviews(): CriticReview[] {
    return this._history.map(r => ({ ...r, scores: { ...r.scores } }));
  }
}
