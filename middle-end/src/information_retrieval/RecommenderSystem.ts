import { DataPacket } from '../shared/types';

export interface RecommendationResult {
  items: string[];
  scores: number[];
}

export interface Recommendation {
  items: string[];
  scores: number[];
  reason: string;
  type: string;
}

export class RecommenderSystem {
  private _recommendations: Recommendation[] = [];
  private _type: string = 'collaborative';
  private _counter: number = 0;
  private _lastRec: Recommendation | null = null;

  get recommendations(): Recommendation[] {
    return this._recommendations;
  }

  get type(): string {
    return this._type;
  }

  collaborativeFiltering(user: string, ratings: Map<string, Map<string, number>>, method: string = 'user-based'): Recommendation {
    const rec: Recommendation = {
      items: [],
      scores: [],
      reason: method,
      type: 'collaborative'
    };
    if (method === 'user-based') {
      const userItems = ratings.get(user) || new Map();
      const similarities = new Map<string, number>();
      for (const [otherUser, otherRatings] of ratings) {
        if (otherUser !== user) {
          let sim = 0;
          let count = 0;
          for (const [item, score] of userItems) {
            if (otherRatings.has(item)) {
              sim += Math.abs(score - (otherRatings.get(item) || 0));
              count++;
            }
          }
          similarities.set(otherUser, count > 0 ? 1 / (1 + sim / count) : 0);
        }
      }
      const candidates = new Map<string, { score: number; simSum: number }>();
      for (const [otherUser, sim] of similarities) {
        const otherRatings = ratings.get(otherUser) || new Map();
        for (const [item, score] of otherRatings) {
          if (!userItems.has(item)) {
            if (!candidates.has(item)) {
              candidates.set(item, { score: 0, simSum: 0 });
            }
            const c = candidates.get(item)!;
            c.score += score * sim;
            c.simSum += sim;
          }
        }
      }
      const sorted = [...candidates.entries()]
        .map(([item, c]) => ({ item, score: c.simSum > 0 ? c.score / c.simSum : 0 }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
      rec.items = sorted.map(s => s.item);
      rec.scores = sorted.map(s => s.score);
    } else {
      rec.items = Array.from(ratings.keys()).slice(0, 10);
      rec.scores = rec.items.map((_, i) => 1 - i * 0.1);
    }
    this._lastRec = rec;
    this._recommendations.push(rec);
    this._type = 'collaborative';
    return rec;
  }

  userBasedCF(user: string, ratings: Map<string, Map<string, number>>, similarity: string = 'cosine'): Recommendation {
    return this.collaborativeFiltering(user, ratings, 'user-based');
  }

  itemBasedCF(item: string, ratings: Map<string, Map<string, number>>, similarity: string = 'cosine'): Recommendation {
    const rec: Recommendation = {
      items: [],
      scores: [],
      reason: 'item-based',
      type: 'collaborative'
    };
    const itemUsers = new Map<string, number>();
    for (const [, userRatings] of ratings) {
      for (const [it, score] of userRatings) {
        if (it !== item) {
          if (userRatings.has(item)) {
            const s = userRatings.get(item)!;
            const current = itemUsers.get(it) || { score: 0, count: 0 };
            itemUsers.set(it, { score: current.score + Math.abs(score - s), count: current.count + 1 } as any);
          }
        }
      }
    }
    const sorted = [...itemUsers.entries()]
      .map(([it, v]: [string, any]) => ({ item: it, score: 1 / (1 + v.score / Math.max(v.count, 1)) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    rec.items = sorted.map(s => s.item);
    rec.scores = sorted.map(s => s.score);
    this._lastRec = rec;
    this._recommendations.push(rec);
    return rec;
  }

  matrixFactorization(ratings: Map<string, Map<string, number>>, factors: number = 10): Recommendation {
    const rec: Recommendation = {
      items: [],
      scores: [],
      reason: 'matrix-factorization',
      type: 'collaborative'
    };
    const allItems = new Set<string>();
    for (const [, userRatings] of ratings) {
      for (const item of userRatings.keys()) {
        allItems.add(item);
      }
    }
    rec.items = Array.from(allItems).slice(0, 10);
    rec.scores = rec.items.map((_, i) => 0.5 + Math.random() * 0.5);
    this._lastRec = rec;
    this._recommendations.push(rec);
    return rec;
  }

  svdRecommend(ratings: Map<string, Map<string, number>>, k: number = 10): Recommendation {
    return this.matrixFactorization(ratings, k);
  }

  contentBased(user: string, profiles: Map<string, string[]>, items: Map<string, string[]>): Recommendation {
    const rec: Recommendation = {
      items: [],
      scores: [],
      reason: 'content-based',
      type: 'content'
    };
    const userProfile = profiles.get(user) || [];
    const userFeatures = new Set(userProfile);
    const scored: { item: string; score: number }[] = [];
    for (const [item, features] of items) {
      let match = 0;
      for (const f of features) {
        if (userFeatures.has(f)) match++;
      }
      scored.push({ item, score: match / Math.max(features.length, 1) });
    }
    scored.sort((a, b) => b.score - a.score);
    rec.items = scored.slice(0, 10).map(s => s.item);
    rec.scores = scored.slice(0, 10).map(s => s.score);
    this._lastRec = rec;
    this._recommendations.push(rec);
    this._type = 'content';
    return rec;
  }

  hybridRecommend(user: string, ratings: Map<string, Map<string, number>>, items: Map<string, string[]>, content: number = 0.5): Recommendation {
    const cf = this.collaborativeFiltering(user, ratings, 'user-based');
    const cb = this.contentBased(user, new Map(), items);
    const allScores = new Map<string, number>();
    for (let i = 0; i < cf.items.length; i++) {
      allScores.set(cf.items[i], (1 - content) * cf.scores[i]);
    }
    for (let i = 0; i < cb.items.length; i++) {
      const existing = allScores.get(cb.items[i]) || 0;
      allScores.set(cb.items[i], existing + content * cb.scores[i]);
    }
    const sorted = [...allScores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    const rec: Recommendation = {
      items: sorted.map(s => s[0]),
      scores: sorted.map(s => s[1]),
      reason: 'hybrid',
      type: 'hybrid'
    };
    this._lastRec = rec;
    this._recommendations.push(rec);
    this._type = 'hybrid';
    return rec;
  }

  associationMining(transactions: string[][], rules: number = 10): Recommendation {
    const itemCount = new Map<string, number>();
    for (const t of transactions) {
      for (const item of t) {
        itemCount.set(item, (itemCount.get(item) || 0) + 1);
      }
    }
    const sorted = [...itemCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, rules);
    const rec: Recommendation = {
      items: sorted.map(s => s[0]),
      scores: sorted.map(s => s[1] / transactions.length),
      reason: 'association',
      type: 'association'
    };
    this._lastRec = rec;
    this._recommendations.push(rec);
    return rec;
  }

  popularityRecommend(items: string[], n: number = 10): Recommendation {
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    const rec: Recommendation = {
      items: shuffled.slice(0, n),
      scores: shuffled.slice(0, n).map((_, i) => 1 - i * 0.1),
      reason: 'popularity',
      type: 'popularity'
    };
    this._lastRec = rec;
    this._recommendations.push(rec);
    return rec;
  }

  diversityRecommend(recs: string[], method: string = 'maximal-margin'): string[] {
    return [...new Set(recs)];
  }

  serendipityRecommend(user: string, recs: string[]): string[] {
    return recs.filter(() => Math.random() > 0.5);
  }

  noveltyRecommend(recs: string[], history: Set<string>): string[] {
    return recs.filter(r => !history.has(r));
  }

  evaluation(recs: string[], groundTruth: string[]): { precision: number; recall: number; f1: number } {
    const recSet = new Set(recs);
    const gtSet = new Set(groundTruth);
    let tp = 0;
    for (const r of recs) {
      if (gtSet.has(r)) tp++;
    }
    const precision = tp / Math.max(recs.length, 1);
    const recall = tp / Math.max(groundTruth.length, 1);
    const f1 = precision + recall > 0 ? 2 * precision * recall / (precision + recall) : 0;
    return { precision, recall, f1 };
  }

  toPacket(): DataPacket<Recommendation> {
    const result = this._lastRec || { items: [], scores: [], reason: '', type: '' };
    this._counter++;
    return {
      id: `recommender-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['information-retrieval', 'recommender'],
        priority: 1,
        phase: 'recommendation'
      }
    };
  }

  reset(): void {
    this._recommendations = [];
    this._type = 'collaborative';
    this._counter = 0;
    this._lastRec = null;
  }
}
