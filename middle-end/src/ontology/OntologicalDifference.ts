import { DataPacket, Signal, KnowledgeUnit } from '../shared/types';

export interface Being {
  id: string;
  name: string;
  modeOfBeing: 'ready-to-hand' | 'present-at-hand' | 'existential';
  disclosedness: number;
  world: string;
  careStructure: {
    aheadOfItself: number;
    alreadyBeingIn: number;
    beingAlongside: number;
  };
  authenticity: number;
}

export interface Entity {
  id: string;
  name: string;
  type: string;
  equipmentalRole: string | null;
  totality: string | null;
  usefulness: number;
  discoveredness: number;
}

export interface Clearing {
  id: string;
  name: string;
  world: string;
  lightingLevel: number;
  entitiesRevealed: string[];
  mood: string;
  understanding: string;
  discourse: string;
}

export class OntologicalDifference {
  private _beings: Map<string, Being> = new Map();
  private _entities: Map<string, Entity> = new Map();
  private _clearings: Map<string, Clearing> = new Map();
  private _history: string[] = [];
  private _seinsfrage = 0.5;
  private _counter = 0;

  disclose(world: string): Clearing {
    const id = `clearing-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    const clearing: Clearing = {
      id,
      name: `Clearing of ${world}`,
      world,
      lightingLevel: 0.6,
      entitiesRevealed: [],
      mood: 'anxiety',
      understanding: 'projection',
      discourse: 'articulation',
    };
    this._clearings.set(id, clearing);
    this._seinsfrage = Math.min(1, this._seinsfrage + 0.1);
    this._recordHistory(`disclose:${world}`);
    return clearing;
  }

  readyToHand(entityId: string): Entity | null {
    const entity = this._entities.get(entityId);
    if (!entity) return null;

    entity.equipmentalRole = 'tool';
    entity.usefulness = Math.min(1, entity.usefulness + 0.2);
    entity.discoveredness = Math.min(1, entity.discoveredness + 0.15);

    this._recordHistory(`readyToHand:${entity.name}`);
    return entity;
  }

  presentAtHand(entityId: string): Entity | null {
    const entity = this._entities.get(entityId);
    if (!entity) return null;

    entity.equipmentalRole = null;
    entity.usefulness = Math.max(0, entity.usefulness - 0.3);
    entity.discoveredness = Math.min(1, entity.discoveredness + 0.1);

    this._recordHistory(`presentAtHand:${entity.name}`);
    return entity;
  }

  equipmentalWhole(entityId: string): { entity: Entity; whole: string; relatedEntities: Entity[] } | null {
    const entity = this._entities.get(entityId);
    if (!entity) return null;

    const related = Array.from(this._entities.values()).filter(
      e => e.id !== entityId && e.totality === entity.totality
    );

    entity.totality = entity.totality || `equipment-whole-${entityId}`;

    this._recordHistory(`equipmentalWhole:${entity.name}`);
    return {
      entity,
      whole: entity.totality,
      relatedEntities: related,
    };
  }

  beingTowardsDeath(beingId: string): Being | null {
    const being = this._beings.get(beingId);
    if (!being) return null;

    being.authenticity = Math.min(1, being.authenticity + 0.25);
    being.careStructure.aheadOfItself = Math.min(1, being.careStructure.aheadOfItself + 0.2);
    being.disclosedness = Math.min(1, being.disclosedness + 0.15);

    this._recordHistory(`beingTowardsDeath:${being.name}`);
    return being;
  }

  careStructure(beingId: string): {
    being: Being;
    care: {
      aheadOfItself: number;
      alreadyBeingIn: number;
      beingAlongside: number;
    };
    totalCare: number;
  } | null {
    const being = this._beings.get(beingId);
    if (!being) return null;

    const totalCare = (being.careStructure.aheadOfItself + being.careStructure.alreadyBeingIn + being.careStructure.beingAlongside) / 3;

    this._recordHistory(`careStructure:${being.name}`);
    return {
      being,
      care: { ...being.careStructure },
      totalCare,
    };
  }

  clearingLight(clearingId: string): Clearing | null {
    const clearing = this._clearings.get(clearingId);
    if (!clearing) return null;

    clearing.lightingLevel = Math.min(1, clearing.lightingLevel + 0.1);

    for (const entityId of clearing.entitiesRevealed) {
      const entity = this._entities.get(entityId);
      if (entity) {
        entity.discoveredness = Math.min(1, entity.discoveredness + 0.1);
      }
    }

    this._seinsfrage = Math.min(1, this._seinsfrage + 0.05);
    this._recordHistory(`clearingLight:${clearing.name}`);
    return clearing;
  }

  ontologicalDifference(): {
    being: string;
    beings: string;
    difference: number;
    forgottenness: number;
  } {
    const beingCount = this._beings.size;
    const entityCount = this._entities.size;
    const clearingCount = this._clearings.size;

    const difference = clearingCount > 0 ? 1 / (1 + beingCount / Math.max(1, clearingCount)) : 0.5;
    const forgottenness = entityCount > 0 ? 1 - (clearingCount / Math.max(1, entityCount)) : 0.5;

    this._recordHistory(`ontologicalDifference`);
    return {
      being: 'The event of clearing, the there is',
      beings: 'Entities discovered within the clearing',
      difference,
      forgottenness,
    };
  }

  getBeing(beingId: string): Being | undefined {
    return this._beings.get(beingId);
  }

  getEntity(entityId: string): Entity | undefined {
    return this._entities.get(entityId);
  }

  getClearing(clearingId: string): Clearing | undefined {
    return this._clearings.get(clearingId);
  }

  throwness(beingId: string): {
    thrown: boolean;
    world: string;
    facticity: number;
  } | null {
    const being = this._beings.get(beingId);
    if (!being) return null;

    return {
      thrown: true,
      world: being.world,
      facticity: being.careStructure.alreadyBeingIn,
    };
  }

  fallenness(beingId: string): {
    fallen: boolean;
    mode: string;
    authenticity: number;
  } | null {
    const being = this._beings.get(beingId);
    if (!being) return null;

    const fallen = being.authenticity < 0.5;
    const mode = fallen ? 'das Man (the They)' : 'authentic existence';

    return {
      fallen,
      mode,
      authenticity: being.authenticity,
    };
  }

  anxiety(clearingId: string): {
    mood: string;
    significance: string;
    nothingRevealed: boolean;
  } | null {
    const clearing = this._clearings.get(clearingId);
    if (!clearing) return null;

    clearing.mood = 'anxiety';
    clearing.lightingLevel = Math.max(0, clearing.lightingLevel - 0.1);

    this._recordHistory(`anxiety:${clearingId}`);
    return {
      mood: 'anxiety',
      significance: 'Anxiety reveals the nothing and individualizes Dasein',
      nothingRevealed: true,
    };
  }

  discourse(clearingId: string, speech: string): Clearing | null {
    const clearing = this._clearings.get(clearingId);
    if (!clearing) return null;

    clearing.discourse = speech;
    clearing.lightingLevel = Math.min(1, clearing.lightingLevel + 0.05);

    this._recordHistory(`discourse:${clearingId}`);
    return clearing;
  }

  understandingProjection(clearingId: string, possibility: string): Clearing | null {
    const clearing = this._clearings.get(clearingId);
    if (!clearing) return null;

    clearing.understanding = possibility;
    clearing.lightingLevel = Math.min(1, clearing.lightingLevel + 0.08);

    this._recordHistory(`understandingProjection:${clearingId}`);
    return clearing;
  }

  readyToHandCount(): number {
    return Array.from(this._entities.values()).filter(e => e.equipmentalRole === 'tool').length;
  }

  presentAtHandCount(): number {
    return Array.from(this._entities.values()).filter(e => e.equipmentalRole === null).length;
  }

  mostDisclosedBeing(): Being | null {
    if (this._beings.size === 0) return null;
    let maxDisclosed = -1;
    let result: Being | null = null;
    for (const being of this._beings.values()) {
      if (being.disclosedness > maxDisclosed) {
        maxDisclosed = being.disclosedness;
        result = being;
      }
    }
    return result;
  }

  mostAuthenticBeing(): Being | null {
    if (this._beings.size === 0) return null;
    let maxAuthenticity = -1;
    let result: Being | null = null;
    for (const being of this._beings.values()) {
      if (being.authenticity > maxAuthenticity) {
        maxAuthenticity = being.authenticity;
        result = being;
      }
    }
    return result;
  }

  createBeing(name: string): Being {
    const id = `being-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    const being: Being = {
      id,
      name,
      modeOfBeing: 'existential',
      disclosedness: 0.3,
      world: 'world',
      careStructure: {
        aheadOfItself: 0.3,
        alreadyBeingIn: 0.4,
        beingAlongside: 0.3,
      },
      authenticity: 0.2,
    };
    this._beings.set(id, being);
    this._recordHistory(`createBeing:${name}`);
    return being;
  }

  createEntity(name: string, type: string): Entity {
    const id = `entity-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    const entity: Entity = {
      id,
      name,
      type,
      equipmentalRole: null,
      totality: null,
      usefulness: 0.5,
      discoveredness: 0.2,
    };
    this._entities.set(id, entity);
    this._recordHistory(`createEntity:${name}`);
    return entity;
  }

  toPacket(): DataPacket {
    return {
      id: `ontDiff-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        beings: Array.from(this._beings.values()),
        entities: Array.from(this._entities.values()),
        clearings: Array.from(this._clearings.values()),
        seinsfrage: this._seinsfrage,
        ontologicalDifference: this.ontologicalDifference(),
        totalBeings: this._beings.size,
        totalEntities: this._entities.size,
      },
      metadata: {
        createdAt: Date.now(),
        route: ['ontology', 'OntologicalDifference'],
        priority: Math.max(1, Math.floor(this._seinsfrage * 10)),
        phase: 'disclosing',
      },
    };
  }

  reset(): void {
    this._beings.clear();
    this._entities.clear();
    this._clearings.clear();
    this._history = [];
    this._seinsfrage = 0.5;
    this._counter = 0;
  }

  get beingCount(): number {
    return this._beings.size;
  }

  get entityCount(): number {
    return this._entities.size;
  }

  get seinsfrage(): number {
    return this._seinsfrage;
  }

  get history(): string[] {
    return [...this._history];
  }

  private _recordHistory(action: string): void {
    this._history.push(`${Date.now()}:${action}`);
  }
}
