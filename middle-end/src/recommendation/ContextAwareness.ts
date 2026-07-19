import { DataPacket } from '../shared/types';

export interface ContextualRec {
  recs: string[];
  context: string;
  relevance: number[];
}

export interface Context {
  type: string;
  value: string | number;
  weight: number;
  time: number;
}

export class ContextAwareness {
  private _contexts: Context[] = [];
  private _recommendations: ContextualRec[] = [];
  private _counter: number = 0;
  private _method: string = 'pre-filter';
  private _lastRec: ContextualRec | null = null;

  get contexts(): Context[] {
    return this._contexts;
  }

  get recommendations(): ContextualRec[] {
    return this._recommendations;
  }

  get method(): string {
    return this._method;
  }

  contextualPreFilter(context: Context, items: string[]): string[] {
    const filtered: string[] = [];
    for (const item of items) {
      if (this._matchesContext(item, context)) {
        filtered.push(item);
      }
    }
    this._method = 'pre-filter';
    this._lastRec = {
      recs: filtered,
      context: context.type,
      relevance: filtered.map(() => 1)
    };
    this._recommendations.push(this._lastRec);
    return filtered;
  }

  contextualPostFilter(recs: string[], context: Context): string[] {
    const filtered = recs.filter(item => this._matchesContext(item, context));
    this._method = 'post-filter';
    this._lastRec = {
      recs: filtered,
      context: context.type,
      relevance: filtered.map(() => 1)
    };
    this._recommendations.push(this._lastRec);
    return filtered;
  }

  contextualModeling(context: Context, model: { type: string }, items: string[]): string[] {
    const scored = items.map(item => ({
      item,
      score: this._contextRelevance(item, context)
    }));
    scored.sort((a, b) => b.score - a.score);
    const result = scored.map(s => s.item);
    this._method = 'modeling';
    this._lastRec = {
      recs: result,
      context: context.type,
      relevance: scored.map(s => s.score)
    };
    this._recommendations.push(this._lastRec);
    return result;
  }

  timeAwareRecommend(user: string, time: Date, items: string[]): string[] {
    const context: Context = {
      type: 'time',
      value: time.getHours(),
      weight: 0.8,
      time: time.getTime()
    };
    return this.contextualModeling(context, { type: 'time-aware' }, items);
  }

  locationAwareRecommend(user: string, location: { lat: number; lon: number }, items: string[]): string[] {
    const context: Context = {
      type: 'location',
      value: `${location.lat},${location.lon}`,
      weight: 0.7,
      time: Date.now()
    };
    return this.contextualModeling(context, { type: 'location-aware' }, items);
  }

  deviceAwareRecommend(user: string, device: string, items: string[]): string[] {
    const context: Context = {
      type: 'device',
      value: device,
      weight: 0.5,
      time: Date.now()
    };
    return this.contextualPreFilter(context, items);
  }

  moodAwareRecommend(user: string, mood: string, items: string[]): string[] {
    const context: Context = {
      type: 'mood',
      value: mood,
      weight: 0.9,
      time: Date.now()
    };
    return this.contextualModeling(context, { type: 'mood-aware' }, items);
  }

  occasionRecommend(user: string, occasion: string, items: string[]): string[] {
    const context: Context = {
      type: 'occasion',
      value: occasion,
      weight: 0.85,
      time: Date.now()
    };
    return this.contextualModeling(context, { type: 'occasion' }, items);
  }

  socialContext(user: string, friends: string[], items: string[]): string[] {
    const context: Context = {
      type: 'social',
      value: friends.join(','),
      weight: 0.6,
      time: Date.now()
    };
    return this.contextualModeling(context, { type: 'social' }, items);
  }

  sequentialRecommend(history: string[], items: string[]): string[] {
    const context: Context = {
      type: 'sequential',
      value: history.length,
      weight: 0.75,
      time: Date.now()
    };
    const scored = items.map(item => {
      let score = 0;
      const itemLower = item.toLowerCase();
      for (const hist of history) {
        if (itemLower.includes(hist.toLowerCase()) || hist.toLowerCase().includes(itemLower)) {
          score += 0.5;
        }
      }
      return { item, score };
    });
    scored.sort((a, b) => b.score - a.score);
    const result = scored.map(s => s.item);
    this._method = 'sequential';
    this._lastRec = {
      recs: result,
      context: 'sequential',
      relevance: scored.map(s => s.score)
    };
    this._recommendations.push(this._lastRec);
    return result;
  }

  sessionBasedRecommend(session: string[], items: string[]): string[] {
    return this.sequentialRecommend(session, items);
  }

  microBehavior(behaviors: { type: string; item: string; timestamp: number }[], recs: string[]): string[] {
    const scores = new Map<string, number>();
    for (const beh of behaviors) {
      const weight = beh.type === 'purchase' ? 3 : beh.type === 'cart' ? 2 : 1;
      scores.set(beh.item, (scores.get(beh.item) || 0) + weight);
    }
    const result = [...recs].sort((a, b) => {
      const sa = scores.get(a) || 0;
      const sb = scores.get(b) || 0;
      return sb - sa;
    });
    this._method = 'micro-behavior';
    this._lastRec = {
      recs: result,
      context: 'micro-behavior',
      relevance: result.map(r => scores.get(r) || 0)
    };
    return result;
  }

  contextEmbedding(context: Context, model: { name: string }): number[] {
    const embedding = new Array(64).fill(0);
    let seed = this._hash(context.type + context.value);
    for (let i = 0; i < 64; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      embedding[i] = ((seed / 0x7fffffff) * 2 - 1) * context.weight;
    }
    const norm = Math.sqrt(embedding.reduce((a, b) => a + b * b, 0)) || 1;
    return embedding.map(v => v / norm);
  }

  private _matchesContext(item: string, context: Context): boolean {
    const itemLower = item.toLowerCase();
    const contextLower = String(context.value).toLowerCase();
    if (context.type === 'time') {
      const hour = context.value as number;
      if (hour >= 6 && hour < 12) return itemLower.includes('morning') || true;
      if (hour >= 12 && hour < 18) return itemLower.includes('afternoon') || true;
      if (hour >= 18 && hour < 22) return itemLower.includes('evening') || true;
      return itemLower.includes('night') || true;
    }
    if (context.type === 'device') {
      return true;
    }
    return itemLower.includes(contextLower) || true;
  }

  private _contextRelevance(item: string, context: Context): number {
    const base = 0.5;
    const itemLower = item.toLowerCase();
    const contextLower = String(context.value).toLowerCase();
    let relevance = base;
    if (itemLower.includes(contextLower)) {
      relevance += 0.3;
    }
    relevance = Math.min(1, relevance * context.weight);
    return relevance;
  }

  private _hash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  toPacket(): DataPacket<ContextualRec> {
    const result = this._lastRec || { recs: [], context: '', relevance: [] };
    this._counter++;
    return {
      id: `context-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['recommendation', 'context-awareness'],
        priority: 1,
        phase: 'context-aware'
      }
    };
  }

  reset(): void {
    this._contexts = [];
    this._recommendations = [];
    this._counter = 0;
    this._method = 'pre-filter';
    this._lastRec = null;
  }
}
