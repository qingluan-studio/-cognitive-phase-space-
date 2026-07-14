/**
 * 照应消解器模块：跨多个请求追踪代词与指示词的指代对象，
 * 还原紧密上下文，使孤立请求能正确指代前文实体。
 */

export interface Entity {
  id: string;
  label: string;
  attributes: Record<string, unknown>;
  lastMentionedAt: number;
  mentionCount: number;
}

export interface AnaphoricReference {
  id: string;
  pronoun: string;
  resolvedEntityId: string | null;
  confidence: number;
  context: Record<string, unknown>;
}

export class AnaphoraResolver {
  private _entities: Map<string, Entity> = new Map();
  private _references: AnaphoricReference[] = [];
  private _pronounMap: Map<string, string[]> = new Map();
  private _salienceWindow = 5;
  private _recentEntities: string[] = [];

  constructor() {
    this._pronounMap.set('he', ['male']);
    this._pronounMap.set('she', ['female']);
    this._pronounMap.set('it', ['object', 'concept']);
    this._pronounMap.set('他们', ['group']);
    this._pronounMap.set('它', ['object', 'concept']);
    this._pronounMap.set('他', ['male']);
    this._pronounMap.set('她', ['female']);
  }

  registerEntity(entity: Entity): void {
    this._entities.set(entity.id, entity);
    this._touchRecent(entity.id);
  }

  private _touchRecent(id: string): void {
    this._recentEntities = this._recentEntities.filter(e => e !== id);
    this._recentEntities.push(id);
    if (this._recentEntities.length > this._salienceWindow) {
      this._recentEntities.shift();
    }
    const entity = this._entities.get(id);
    if (entity) {
      entity.lastMentionedAt = Date.now();
      entity.mentionCount++;
    }
  }

  resolve(id: string, pronoun: string, context: Record<string, unknown> = {}): AnaphoricReference {
    const candidates = this._recentEntities
      .map(eid => this._entities.get(eid))
      .filter(Boolean) as Entity[];

    let bestEntity: Entity | null = null;
    let bestScore = 0;

    for (const candidate of candidates) {
      const score = this._scoreCandidate(candidate, pronoun, context);
      if (score > bestScore) {
        bestScore = score;
        bestEntity = candidate;
      }
    }

    const reference: AnaphoricReference = {
      id,
      pronoun,
      resolvedEntityId: bestEntity?.id ?? null,
      confidence: bestScore,
      context,
    };
    this._references.push(reference);
    if (bestEntity) this._touchRecent(bestEntity.id);
    return reference;
  }

  private _scoreCandidate(entity: Entity, pronoun: string, context: Record<string, unknown>): number {
    const expectedTypes = this._pronounMap.get(pronoun.toLowerCase()) ?? [];
    const attrType = String(entity.attributes.type ?? entity.attributes.gender ?? 'object');
    const typeMatch = expectedTypes.length === 0 || expectedTypes.includes(attrType) ? 1 : 0.3;

    const recencyBonus = this._recentEntities.lastIndexOf(entity.id) / this._salienceWindow;
    const frequencyBonus = Math.min(1, entity.mentionCount / 5);

    let contextMatch = 0.5;
    for (const key of Object.keys(context)) {
      if (key in entity.attributes && String(entity.attributes[key]) === String(context[key])) {
        contextMatch = 1;
      }
    }

    return typeMatch * 0.4 + recencyBonus * 0.2 + frequencyBonus * 0.2 + contextMatch * 0.2;
  }

  getRecentEntities(limit = 3): Entity[] {
    return this._recentEntities
      .slice(-limit)
      .map(id => this._entities.get(id))
      .filter(Boolean) as Entity[];
  }

  unresolvedCount(): number {
    return this._references.filter(r => r.resolvedEntityId === null).length;
  }

  averageConfidence(): number {
    if (this._references.length === 0) return 0;
    return this._references.reduce((s, r) => s + r.confidence, 0) / this._references.length;
  }

  setSalienceWindow(size: number): void {
    this._salienceWindow = Math.max(1, size);
  }

  forget(entityId: string): boolean {
    this._recentEntities = this._recentEntities.filter(e => e !== entityId);
    return this._entities.delete(entityId);
  }

  reset(): void {
    this._entities.clear();
    this._references = [];
    this._recentEntities = [];
  }

  get entityCount(): number {
    return this._entities.size;
  }

  get referenceCount(): number {
    return this._references.length;
  }

  get salienceWindow(): number {
    return this._salienceWindow;
  }
}
