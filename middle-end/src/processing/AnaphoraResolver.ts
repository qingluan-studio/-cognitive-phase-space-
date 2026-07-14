export interface Entity {
  id: string;
  label: string;
  attributes: Record<string, unknown>;
  lastMentionedAt: number;
  mentionCount: number;
  salience: number;
  category: string;
}

export interface AnaphoricReference {
  id: string;
  pronoun: string;
  resolvedEntityId: string | null;
  confidence: number;
  context: Record<string, unknown>;
  hobbsDistance: number;
  centeringScore: number;
}

interface UtteranceState {
  forwardCenters: string[];
  backwardCenter: string | null;
  preferredCenter: string | null;
}

export class AnaphoraResolver {
  private _entities: Map<string, Entity> = new Map();
  private _references: AnaphoricReference[] = [];
  private _pronounMap: Map<string, string[]> = new Map();
  private _salienceWindow = 8;
  private _recentEntities: string[] = [];
  private _utteranceHistory: UtteranceState[] = [];
  private _decayRate = 0.15;

  constructor() {
    const pairs: Array<[string, string[]]> = [
      ['he', ['male', 'person']], ['she', ['female', 'person']],
      ['it', ['object', 'concept', 'thing']], ['they', ['group', 'plural', 'person']],
      ['them', ['group', 'plural', 'person']], ['this', ['object', 'concept', 'thing']],
      ['that', ['object', 'concept', 'thing']], ['他们', ['group', 'plural', 'person']],
      ['它们', ['group', 'plural', 'object']], ['它', ['object', 'concept', 'thing']],
      ['他', ['male', 'person']], ['她', ['female', 'person']],
      ['这个', ['object', 'concept', 'thing']], ['那个', ['object', 'concept', 'thing']],
    ];
    for (const [p, types] of pairs) this._pronounMap.set(p, types);
  }

  registerEntity(entity: Entity): void {
    this._entities.set(entity.id, {
      ...entity,
      salience: entity.salience ?? 0.5,
      category: entity.category ?? 'object',
    });
    this._touchRecent(entity.id);
  }

  private _touchRecent(id: string): void {
    this._recentEntities = this._recentEntities.filter(e => e !== id);
    this._recentEntities.push(id);
    if (this._recentEntities.length > this._salienceWindow) this._recentEntities.shift();
    const entity = this._entities.get(id);
    if (entity) {
      entity.lastMentionedAt = Date.now();
      entity.mentionCount++;
      entity.salience = Math.min(1, entity.salience + this._decayRate * 0.5);
    }
    this._decaySalience();
    this._updateUtteranceState(id);
  }

  private _decaySalience(): void {
    for (const entity of this._entities.values()) {
      if (!this._recentEntities.includes(entity.id)) {
        entity.salience = Math.max(0, entity.salience - this._decayRate);
      }
    }
  }

  private _updateUtteranceState(entityId: string): void {
    const prevState = this._utteranceHistory.length > 0 ? this._utteranceHistory[this._utteranceHistory.length - 1] : null;
    const forwardCenters = [...this._recentEntities].reverse();
    this._utteranceHistory.push({
      forwardCenters,
      backwardCenter: prevState?.forwardCenters[0] ?? null,
      preferredCenter: forwardCenters[0] ?? null,
    });
    if (this._utteranceHistory.length > 20) this._utteranceHistory.shift();
  }

  resolve(id: string, pronoun: string, context: Record<string, unknown> = {}): AnaphoricReference {
    const candidates = this._recentEntities
      .map(eid => this._entities.get(eid))
      .filter((e): e is Entity => e !== undefined);
    const hobbsRanked = this._hobbsRank(pronoun, candidates, context);
    let bestEntity: Entity | null = null;
    let bestScore = 0;
    let bestHobbsDist = Infinity;
    for (const candidate of hobbsRanked) {
      const hobbsDist = this._hobbsDistance(candidate, pronoun, context);
      const centeringScore = this._centeringScore(candidate);
      const score = centeringScore * 0.3 + candidate.salience * 0.25 +
        this._typeMatchScore(candidate, pronoun) * 0.25 + this._contextMatch(candidate, context) * 0.2;
      const adjusted = score * (1 - Math.min(1, hobbsDist / 10));
      if (adjusted > bestScore) {
        bestScore = adjusted;
        bestEntity = candidate;
        bestHobbsDist = hobbsDist;
      }
    }
    const reference: AnaphoricReference = {
      id, pronoun,
      resolvedEntityId: bestEntity?.id ?? null,
      confidence: bestScore, context,
      hobbsDistance: bestHobbsDist === Infinity ? -1 : bestHobbsDist,
      centeringScore: bestEntity ? this._centeringScore(bestEntity) : 0,
    };
    this._references.push(reference);
    if (bestEntity) this._touchRecent(bestEntity.id);
    return reference;
  }

  private _hobbsRank(pronoun: string, candidates: Entity[], context: Record<string, unknown>): Entity[] {
    const expectedTypes = this._pronounMap.get(pronoun.toLowerCase()) ?? [];
    return candidates.map(e => {
      const recency = this._recentEntities.indexOf(e.id);
      const typeMatch = expectedTypes.length === 0 ||
        expectedTypes.some(t => String(e.category).includes(t) || String(e.attributes.type || '').includes(t));
      return { entity: e, score: recency * 0.4 + (typeMatch ? 0 : 5) + (1 - this._contextMatch(e, context)) * 2 };
    }).sort((a, b) => a.score - b.score).map(s => s.entity);
  }

  private _hobbsDistance(entity: Entity, pronoun: string, context: Record<string, unknown>): number {
    const position = this._recentEntities.lastIndexOf(entity.id);
    const recencyDist = this._recentEntities.length - 1 - position;
    const expectedTypes = this._pronounMap.get(pronoun.toLowerCase()) ?? [];
    const typeMismatch = expectedTypes.length > 0 &&
      !expectedTypes.some(t => String(entity.category).includes(t) || String(entity.attributes.type || '').includes(t));
    let distance = recencyDist * 1.5 + (typeMismatch ? 3 : 0);
    let matchCount = 0;
    for (const key of Object.keys(context)) {
      if (key in entity.attributes && String(entity.attributes[key]) === String(context[key])) matchCount++;
    }
    distance -= matchCount * 0.5;
    return Math.max(0, distance);
  }

  private _centeringScore(entity: Entity): number {
    if (this._utteranceHistory.length < 1) return 0.5;
    const current = this._utteranceHistory[this._utteranceHistory.length - 1];
    const isPreferred = current.preferredCenter === entity.id ? 1 : 0;
    const isBackward = current.backwardCenter === entity.id ? 1 : 0;
    const rank = current.forwardCenters.indexOf(entity.id);
    const rankScore = rank === -1 ? 0 : 1 - rank / Math.max(1, current.forwardCenters.length);
    const continuation = isPreferred && isBackward ? 0.3 : 0;
    const retaining = isPreferred && !isBackward ? 0.15 : 0;
    const shifting = !isPreferred && isBackward ? 0.1 : 0;
    return Math.min(1, rankScore * 0.4 + continuation + retaining + shifting + 0.15);
  }

  private _typeMatchScore(entity: Entity, pronoun: string): number {
    const expectedTypes = this._pronounMap.get(pronoun.toLowerCase()) ?? [];
    if (expectedTypes.length === 0) return 0.5;
    const category = String(entity.category || entity.attributes.type || entity.attributes.gender || 'object').toLowerCase();
    let match = 0;
    for (const t of expectedTypes) {
      if (category.includes(t.toLowerCase())) { match = 1; break; }
    }
    for (const key of Object.keys(entity.attributes)) {
      const val = String(entity.attributes[key]).toLowerCase();
      for (const t of expectedTypes) {
        if (val.includes(t.toLowerCase())) match = Math.max(match, 0.8);
      }
    }
    return match;
  }

  private _contextMatch(entity: Entity, context: Record<string, unknown>): number {
    const contextKeys = Object.keys(context);
    if (contextKeys.length === 0) return 0.5;
    let matchScore = 0, total = 0;
    for (const key of contextKeys) {
      total++;
      if (key in entity.attributes) {
        const ev = String(entity.attributes[key]).toLowerCase();
        const cv = String(context[key]).toLowerCase();
        if (ev === cv) matchScore += 1;
        else if (ev.includes(cv) || cv.includes(ev)) matchScore += 0.5;
        else matchScore += 0.1;
      } else {
        matchScore += 0.3;
      }
    }
    return total === 0 ? 0.5 : matchScore / total;
  }

  getRecentEntities(limit = 3): Entity[] {
    return this._recentEntities
      .slice(-limit).reverse()
      .map(id => this._entities.get(id))
      .filter((e): e is Entity => e !== undefined);
  }

  unresolvedCount(): number {
    return this._references.filter(r => r.resolvedEntityId === null).length;
  }

  averageConfidence(): number {
    return this._references.length === 0 ? 0 : this._references.reduce((s, r) => s + r.confidence, 0) / this._references.length;
  }

  averageHobbsDistance(): number {
    const resolved = this._references.filter(r => r.hobbsDistance >= 0);
    return resolved.length === 0 ? 0 : resolved.reduce((s, r) => s + r.hobbsDistance, 0) / resolved.length;
  }

  setSalienceWindow(size: number): void {
    this._salienceWindow = Math.max(1, size);
  }

  forget(entityId: string): boolean {
    this._recentEntities = this._recentEntities.filter(e => e !== entityId);
    return this._entities.delete(entityId);
  }

  coherenceScore(): number {
    if (this._utteranceHistory.length < 2) return 0.5;
    let continuations = 0, total = 0;
    for (let i = 1; i < this._utteranceHistory.length; i++) {
      total++;
      const prev = this._utteranceHistory[i - 1];
      const curr = this._utteranceHistory[i];
      if (prev.preferredCenter && prev.preferredCenter === curr.backwardCenter) continuations++;
    }
    return total === 0 ? 0.5 : continuations / total;
  }

  reset(): void {
    this._entities.clear();
    this._references = [];
    this._recentEntities = [];
    this._utteranceHistory = [];
  }

  get entityCount(): number { return this._entities.size; }
  get referenceCount(): number { return this._references.length; }
  get salienceWindow(): number { return this._salienceWindow; }
  get utteranceCount(): number { return this._utteranceHistory.length; }
}
