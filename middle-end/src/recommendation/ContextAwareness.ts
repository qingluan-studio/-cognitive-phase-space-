import { DataPacket, PacketMeta } from '../shared/types';

export interface ContextualRec {
  recs: string[];
  context: string;
  relevance: number[];
  confidence: number;
  timestamp: number;
  contextFeatures: Record<string, number>;
}

export interface Context {
  type: string;
  value: string | number;
  weight: number;
  time: number;
  source: 'explicit' | 'implicit' | 'inferred';
  reliability: number;
}

export interface TemporalContext {
  hour: number;
  dayOfWeek: number;
  month: number;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  isWeekend: boolean;
  isHoliday: boolean;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
}

export interface SpatialContext {
  latitude: number;
  longitude: number;
  altitude?: number;
  venue?: string;
  region?: string;
  weather?: string;
  temperature?: number;
}

export interface SocialContext {
  companions: string[];
  socialSetting: 'alone' | 'family' | 'friends' | 'colleagues' | 'public';
  event?: string;
  mood?: string;
}

export interface DeviceContext {
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'tv' | 'wearable';
  os: string;
  screenSize: number;
  connectivity: 'wifi' | '4g' | '5g' | 'offline';
  batteryLevel?: number;
}

export interface TaskContext {
  intent: 'browse' | 'search' | 'purchase' | 'compare' | 'discover';
  urgency: number;
  budget?: number;
  constraints: string[];
}

export interface ContextFusionResult {
  fusedVector: number[];
  importanceWeights: Record<string, number>;
  dominantContext: string;
  uncertainty: number;
}

export class ContextAwareness {
  private _contexts: Context[] = [];
  private _recommendations: ContextualRec[] = [];
  private _counter: number = 0;
  private _method: string = 'pre-filter';
  private _lastRec: ContextualRec | null = null;
  private _contextHistory: Map<string, Context[]> = new Map();
  private _userContextProfiles: Map<string, Record<string, number>> = new Map();
  private _history: unknown[] = [];

  get contexts(): Context[] { return this._contexts; }
  get recommendations(): ContextualRec[] { return this._recommendations; }
  get method(): string { return this._method; }
  get contextTypeCount(): number { return new Set(this._contexts.map(c => c.type)).size; }

  contextualPreFilter(context: Context, items: string[], itemAttributes: Map<string, Record<string, string>> = new Map()): string[] {
    const filtered: string[] = [];
    for (const item of items) {
      if (this._matchesContext(item, context, itemAttributes)) {
        filtered.push(item);
      }
    }
    this._method = 'pre-filter';
    this._lastRec = {
      recs: filtered,
      context: context.type,
      relevance: filtered.map(() => 1),
      confidence: context.reliability,
      timestamp: Date.now(),
      contextFeatures: { [context.type]: context.weight },
    };
    this._recommendations.push(this._lastRec);
    this._history.push({ op: 'contextualPreFilter', contextType: context.type, filteredCount: filtered.length });
    return filtered;
  }

  contextualPostFilter(recs: string[], context: Context, threshold: number = 0.3): string[] {
    const filtered = recs.filter(item => this._contextRelevance(item, context) >= threshold);
    this._method = 'post-filter';
    this._lastRec = {
      recs: filtered,
      context: context.type,
      relevance: filtered.map(item => this._contextRelevance(item, context)),
      confidence: context.reliability,
      timestamp: Date.now(),
      contextFeatures: { [context.type]: context.weight },
    };
    this._recommendations.push(this._lastRec);
    this._history.push({ op: 'contextualPostFilter', contextType: context.type, filteredCount: filtered.length });
    return filtered;
  }

  contextualModeling(context: Context, model: { type: string }, items: string[], itemFeatures: Map<string, number[]> = new Map()): string[] {
    const scored = items.map(item => ({
      item,
      score: this._contextRelevance(item, context) + this._featureRelevance(item, context, itemFeatures),
    }));
    scored.sort((a, b) => b.score - a.score);
    const result = scored.map(s => s.item);
    this._method = 'modeling';
    this._lastRec = {
      recs: result,
      context: context.type,
      relevance: scored.map(s => s.score),
      confidence: context.reliability,
      timestamp: Date.now(),
      contextFeatures: { [context.type]: context.weight },
    };
    this._recommendations.push(this._lastRec);
    this._history.push({ op: 'contextualModeling', contextType: context.type, itemCount: items.length });
    return result;
  }

  timeAwareRecommend(user: string, time: Date, items: string[], temporalPatterns: Map<string, number[]> = new Map()): string[] {
    const context: Context = {
      type: 'time',
      value: time.getHours(),
      weight: 0.8,
      time: time.getTime(),
      source: 'implicit',
      reliability: 0.85,
    };
    const hour = time.getHours();
    const timeOfDay = hour >= 6 && hour < 12 ? 'morning' : hour >= 12 && hour < 18 ? 'afternoon' : hour >= 18 && hour < 22 ? 'evening' : 'night';
    const scored = items.map(item => {
      const pattern = temporalPatterns.get(item) || new Array(24).fill(0.04);
      return { item, score: pattern[hour] || 0.04 };
    });
    scored.sort((a, b) => b.score - a.score);
    const result = scored.map(s => s.item);
    this._method = 'time-aware';
    this._lastRec = {
      recs: result,
      context: `time-${timeOfDay}`,
      relevance: scored.map(s => s.score),
      confidence: 0.8,
      timestamp: Date.now(),
      contextFeatures: { hour, dayOfWeek: time.getDay() },
    };
    this._recommendations.push(this._lastRec);
    this._history.push({ op: 'timeAwareRecommend', user, timeOfDay });
    return result;
  }

  locationAwareRecommend(user: string, location: { lat: number; lon: number }, items: string[], itemLocations: Map<string, { lat: number; lon: number }> = new Map()): string[] {
    const context: Context = {
      type: 'location',
      value: `${location.lat},${location.lon}`,
      weight: 0.7,
      time: Date.now(),
      source: 'implicit',
      reliability: 0.75,
    };
    const scored = items.map(item => {
      const itemLoc = itemLocations.get(item);
      if (!itemLoc) return { item, score: 0.3 };
      const dist = Math.sqrt(Math.pow(location.lat - itemLoc.lat, 2) + Math.pow(location.lon - itemLoc.lon, 2));
      return { item, score: Math.max(0, 1 - dist * 10) };
    });
    scored.sort((a, b) => b.score - a.score);
    const result = scored.map(s => s.item);
    this._method = 'location-aware';
    this._lastRec = {
      recs: result,
      context: 'location',
      relevance: scored.map(s => s.score),
      confidence: 0.7,
      timestamp: Date.now(),
      contextFeatures: { lat: location.lat, lon: location.lon },
    };
    this._recommendations.push(this._lastRec);
    this._history.push({ op: 'locationAwareRecommend', user });
    return result;
  }

  deviceAwareRecommend(user: string, device: string, items: string[], deviceCompatibilities: Map<string, string[]> = new Map()): string[] {
    const context: Context = {
      type: 'device',
      value: device,
      weight: 0.5,
      time: Date.now(),
      source: 'implicit',
      reliability: 0.9,
    };
    const filtered = items.filter(item => {
      const compat = deviceCompatibilities.get(item);
      return !compat || compat.includes(device);
    });
    this._method = 'device-aware';
    this._lastRec = {
      recs: filtered,
      context: `device-${device}`,
      relevance: filtered.map(() => 1),
      confidence: 0.9,
      timestamp: Date.now(),
      contextFeatures: { device },
    };
    this._recommendations.push(this._lastRec);
    this._history.push({ op: 'deviceAwareRecommend', user, device });
    return filtered;
  }

  moodAwareRecommend(user: string, mood: string, items: string[], moodMappings: Map<string, string[]> = new Map()): string[] {
    const context: Context = {
      type: 'mood',
      value: mood,
      weight: 0.9,
      time: Date.now(),
      source: 'explicit',
      reliability: 0.7,
    };
    const scored = items.map(item => {
      const mappings = moodMappings.get(item) || [];
      return { item, score: mappings.includes(mood) ? 1 : 0.1 };
    });
    scored.sort((a, b) => b.score - a.score);
    const result = scored.map(s => s.item);
    this._method = 'mood-aware';
    this._lastRec = {
      recs: result,
      context: `mood-${mood}`,
      relevance: scored.map(s => s.score),
      confidence: 0.7,
      timestamp: Date.now(),
      contextFeatures: { mood },
    };
    this._recommendations.push(this._lastRec);
    this._history.push({ op: 'moodAwareRecommend', user, mood });
    return result;
  }

  occasionRecommend(user: string, occasion: string, items: string[], occasionRules: Map<string, string[]> = new Map()): string[] {
    const context: Context = {
      type: 'occasion',
      value: occasion,
      weight: 0.85,
      time: Date.now(),
      source: 'explicit',
      reliability: 0.8,
    };
    const relevant = items.filter(item => {
      const rules = occasionRules.get(item);
      return !rules || rules.includes(occasion);
    });
    this._method = 'occasion';
    this._lastRec = {
      recs: relevant,
      context: `occasion-${occasion}`,
      relevance: relevant.map(() => 1),
      confidence: 0.8,
      timestamp: Date.now(),
      contextFeatures: { occasion },
    };
    this._recommendations.push(this._lastRec);
    this._history.push({ op: 'occasionRecommend', user, occasion });
    return relevant;
  }

  socialContext(user: string, friends: string[], items: string[], friendPreferences: Map<string, string[]> = new Map()): string[] {
    const context: Context = {
      type: 'social',
      value: friends.join(','),
      weight: 0.6,
      time: Date.now(),
      source: 'implicit',
      reliability: 0.65,
    };
    const scored = items.map(item => {
      let score = 0;
      for (const friend of friends) {
        const prefs = friendPreferences.get(friend) || [];
        if (prefs.includes(item)) score += 0.3;
      }
      return { item, score: Math.min(1, score) };
    });
    scored.sort((a, b) => b.score - a.score);
    const result = scored.map(s => s.item);
    this._method = 'social';
    this._lastRec = {
      recs: result,
      context: 'social',
      relevance: scored.map(s => s.score),
      confidence: 0.65,
      timestamp: Date.now(),
      contextFeatures: { friendCount: friends.length },
    };
    this._recommendations.push(this._lastRec);
    this._history.push({ op: 'socialContext', user, friendCount: friends.length });
    return result;
  }

  sequentialRecommend(history: string[], items: string[], transitionProbs: Map<string, Map<string, number>> = new Map()): string[] {
    const context: Context = {
      type: 'sequential',
      value: history.length,
      weight: 0.75,
      time: Date.now(),
      source: 'implicit',
      reliability: 0.8,
    };
    const lastItem = history[history.length - 1];
    const scored = items.map(item => {
      let score = 0;
      const transitions = transitionProbs.get(lastItem);
      if (transitions) {
        score = transitions.get(item) || 0;
      }
      const itemLower = item.toLowerCase();
      for (const hist of history) {
        if (itemLower.includes(hist.toLowerCase()) || hist.toLowerCase().includes(itemLower)) {
          score += 0.1;
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
      relevance: scored.map(s => s.score),
      confidence: 0.8,
      timestamp: Date.now(),
      contextFeatures: { historyLength: history.length },
    };
    this._recommendations.push(this._lastRec);
    this._history.push({ op: 'sequentialRecommend', historyLength: history.length });
    return result;
  }

  sessionBasedRecommend(session: string[], items: string[], sessionEmbedding: number[] = []): string[] {
    const result = this.sequentialRecommend(session, items);
    this._method = 'session-based';
    this._history.push({ op: 'sessionBasedRecommend', sessionLength: session.length });
    return result;
  }

  microBehavior(behaviors: { type: string; item: string; timestamp: number }[], recs: string[]): string[] {
    const scores = new Map<string, number>();
    for (const beh of behaviors) {
      const weight = beh.type === 'purchase' ? 3 : beh.type === 'cart' ? 2 : beh.type === 'click' ? 1 : 0.5;
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
      relevance: result.map(r => scores.get(r) || 0),
      confidence: 0.75,
      timestamp: Date.now(),
      contextFeatures: { behaviorCount: behaviors.length },
    };
    this._recommendations.push(this._lastRec);
    this._history.push({ op: 'microBehavior', behaviorCount: behaviors.length });
    return result;
  }

  contextEmbedding(context: Context, model: { name: string }): number[] {
    const embedding = new Array(64).fill(0);
    let seed = this._hash(context.type + String(context.value));
    for (let i = 0; i < 64; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      embedding[i] = ((seed / 0x7fffffff) * 2 - 1) * context.weight;
    }
    const norm = Math.sqrt(embedding.reduce((a, b) => a + b * b, 0)) || 1;
    return embedding.map(v => v / norm);
  }

  contextFusion(contexts: Context[], fusionMethod: 'weighted-sum' | 'attention' | 'gating' = 'weighted-sum'): ContextFusionResult {
    const features: Record<string, number> = {};
    const weights: Record<string, number> = {};
    for (const ctx of contexts) {
      features[ctx.type] = ctx.weight * ctx.reliability;
      weights[ctx.type] = ctx.weight;
    }
    let fusedVector: number[] = [];
    if (fusionMethod === 'weighted-sum') {
      fusedVector = Object.values(features);
    } else if (fusionMethod === 'attention') {
      const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
      fusedVector = Object.entries(features).map(([type, val]) => val * (weights[type] / totalWeight));
    } else {
      const gate = Math.max(...Object.values(features));
      fusedVector = Object.values(features).map(v => v * (v >= gate * 0.8 ? 1 : 0.2));
    }
    const dominantContext = Object.entries(weights).reduce((max, [type, w]) => w > max[1] ? [type, w] : max, ['', 0])[0];
    const uncertainty = 1 - Math.max(...Object.values(features));
    this._history.push({ op: 'contextFusion', contextCount: contexts.length, fusionMethod });
    return { fusedVector, importanceWeights: weights, dominantContext, uncertainty: Number(uncertainty.toFixed(2)) };
  }

  weatherAwareRecommend(weather: string, temperature: number, items: string[], weatherMappings: Map<string, string[]> = new Map()): string[] {
    const context: Context = {
      type: 'weather',
      value: `${weather}-${temperature}`,
      weight: 0.6,
      time: Date.now(),
      source: 'implicit',
      reliability: 0.7,
    };
    const scored = items.map(item => {
      const mappings = weatherMappings.get(item) || [];
      return { item, score: mappings.includes(weather) ? 1 : 0.2 };
    });
    scored.sort((a, b) => b.score - a.score);
    const result = scored.map(s => s.item);
    this._lastRec = {
      recs: result,
      context: `weather-${weather}`,
      relevance: scored.map(s => s.score),
      confidence: 0.7,
      timestamp: Date.now(),
      contextFeatures: { weather, temperature },
    };
    this._recommendations.push(this._lastRec);
    this._history.push({ op: 'weatherAwareRecommend', weather, temperature });
    return result;
  }

  intentAwareRecommend(intent: string, urgency: number, items: string[], intentMappings: Map<string, string[]> = new Map()): string[] {
    const context: Context = {
      type: 'intent',
      value: intent,
      weight: 0.9,
      time: Date.now(),
      source: 'explicit',
      reliability: 0.85,
    };
    const filtered = items.filter(item => {
      const mappings = intentMappings.get(item);
      return !mappings || mappings.includes(intent);
    });
    const scored = filtered.map(item => ({ item, score: urgency }));
    scored.sort((a, b) => b.score - a.score);
    const result = scored.map(s => s.item);
    this._lastRec = {
      recs: result,
      context: `intent-${intent}`,
      relevance: scored.map(s => s.score),
      confidence: 0.85,
      timestamp: Date.now(),
      contextFeatures: { intent, urgency },
    };
    this._recommendations.push(this._lastRec);
    this._history.push({ op: 'intentAwareRecommend', intent, urgency });
    return result;
  }

  contextDriftDetection(currentContext: Context, userHistory: Context[], threshold: number = 0.3): { driftDetected: boolean; driftMagnitude: number; adaptationNeeded: boolean } {
    if (userHistory.length === 0) return { driftDetected: false, driftMagnitude: 0, adaptationNeeded: false };
    const recentContexts = userHistory.slice(-10);
    const avgWeight = recentContexts.reduce((sum, c) => sum + c.weight, 0) / recentContexts.length;
    const driftMagnitude = Math.abs(currentContext.weight - avgWeight);
    const driftDetected = driftMagnitude > threshold;
    this._history.push({ op: 'contextDriftDetection', driftDetected, driftMagnitude });
    return { driftDetected, driftMagnitude: Number(driftMagnitude.toFixed(2)), adaptationNeeded: driftDetected };
  }

  contextUncertaintyQuantification(contexts: Context[]): number {
    if (contexts.length === 0) return 1;
    const reliabilities = contexts.map(c => c.reliability);
    const mean = reliabilities.reduce((a, b) => a + b, 0) / reliabilities.length;
    const variance = reliabilities.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / reliabilities.length;
    return Number((1 - mean + variance).toFixed(2));
  }

  multiContextRecommend(contexts: Context[], items: string[]): string[] {
    const fusion = this.contextFusion(contexts, 'attention');
    const scored = items.map(item => {
      let score = 0;
      for (const ctx of contexts) {
        score += this._contextRelevance(item, ctx) * fusion.importanceWeights[ctx.type] || 0;
      }
      return { item, score: Math.min(1, score) };
    });
    scored.sort((a, b) => b.score - a.score);
    const result = scored.map(s => s.item);
    this._method = 'multi-context';
    this._lastRec = {
      recs: result,
      context: 'multi-context',
      relevance: scored.map(s => s.score),
      confidence: 1 - fusion.uncertainty,
      timestamp: Date.now(),
      contextFeatures: fusion.importanceWeights,
    };
    this._recommendations.push(this._lastRec);
    this._history.push({ op: 'multiContextRecommend', contextCount: contexts.length });
    return result;
  }

  private _matchesContext(item: string, context: Context, itemAttributes: Map<string, Record<string, string>>): boolean {
    const itemLower = item.toLowerCase();
    const contextLower = String(context.value).toLowerCase();
    const attrs = itemAttributes.get(item);
    if (context.type === 'time') {
      const hour = context.value as number;
      if (hour >= 6 && hour < 12) return itemLower.includes('morning') || true;
      if (hour >= 12 && hour < 18) return itemLower.includes('afternoon') || true;
      if (hour >= 18 && hour < 22) return itemLower.includes('evening') || true;
      return itemLower.includes('night') || true;
    }
    if (context.type === 'device') {
      if (attrs && attrs['compatibleDevices']) {
        return attrs['compatibleDevices'].toLowerCase().includes(contextLower);
      }
      return true;
    }
    if (attrs && attrs[context.type]) {
      return attrs[context.type].toLowerCase().includes(contextLower);
    }
    return itemLower.includes(contextLower) || true;
  }

  private _contextRelevance(item: string, context: Context): number {
    const base = 0.5;
    const itemLower = item.toLowerCase();
    const contextLower = String(context.value).toLowerCase();
    let relevance = base;
    if (itemLower.includes(contextLower)) relevance += 0.3;
    relevance = Math.min(1, relevance * context.weight * context.reliability);
    return relevance;
  }

  private _featureRelevance(item: string, context: Context, itemFeatures: Map<string, number[]>): number {
    const features = itemFeatures.get(item);
    if (!features) return 0;
    const seed = this._hash(context.type + String(context.value));
    return features[seed % features.length] * context.weight;
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

  /** Compute the temporal context embedding similarity. */
  temporalContextSimilarity(ctx1: TemporalContext, ctx2: TemporalContext): number {
    const hourSim = 1 - Math.abs(ctx1.hour - ctx2.hour) / 24;
    const daySim = ctx1.dayOfWeek === ctx2.dayOfWeek ? 1 : 0.5;
    const seasonSim = ctx1.season === ctx2.season ? 1 : 0;
    return Number(((hourSim + daySim + seasonSim) / 3).toFixed(2));
  }

  /** Compute the spatial distance between two contexts. */
  spatialDistance(ctx1: SpatialContext, ctx2: SpatialContext): number {
    const dLat = ctx1.latitude - ctx2.latitude;
    const dLon = ctx1.longitude - ctx2.longitude;
    return Number(Math.sqrt(dLat * dLat + dLon * dLon).toFixed(4));
  }

  /** Compute the context transition probability. */
  contextTransitionProbability(currentContext: string, nextContext: string, transitions: Map<string, Map<string, number>>): number {
    const trans = transitions.get(currentContext);
    if (!trans) return 0;
    return trans.get(nextContext) || 0;
  }

  /** Compute the context-aware exploration vs exploitation balance. */
  contextExplorationBalance(contextConfidence: number, userNoveltyPreference: number): number {
    return Number(((1 - contextConfidence) * 0.5 + userNoveltyPreference * 0.5).toFixed(2));
  }

  /** Compute the contextual cold-start boost. */
  contextualColdStartBoost(contextRichness: number, baseScore: number): number {
    return Number((baseScore * (1 + contextRichness * 0.5)).toFixed(2));
  }

  /** Compute the real-time context validity window. */
  contextValidityWindow(contextTimestamp: number, contextType: string): number {
    const windows: Record<string, number> = { location: 300000, time: 3600000, mood: 1800000, weather: 7200000 };
    return windows[contextType] || 3600000;
  }

  toPacket(): DataPacket<{
    contexts: number;
    recommendations: number;
    method: string;
    contextTypeCount: number;
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['recommendation', 'ContextAwareness'],
      priority: 1,
      phase: 'context-awareness',
    };
    return {
      id: `context-awareness-${Date.now().toString(36)}-${(++this._counter).toString(36)}`,
      payload: {
        contexts: this._contexts.length,
        recommendations: this._recommendations.length,
        method: this._method,
        contextTypeCount: this.contextTypeCount,
        history: [...this._history],
      },
      metadata,
    };
  }

  reset(): void {
    this._contexts = [];
    this._recommendations = [];
    this._counter = 0;
    this._method = 'pre-filter';
    this._lastRec = null;
    this._contextHistory.clear();
    this._userContextProfiles.clear();
    this._history = [];
  }
}
