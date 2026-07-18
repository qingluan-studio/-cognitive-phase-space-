import { DataPacket, Signal, KnowledgeUnit } from '../shared/types';

export interface OntologicalCategory {
  id: string;
  name: string;
  parent: string | null;
  children: string[];
  level: number;
  description: string;
}

export interface Substance {
  id: string;
  name: string;
  essence: string;
  accidents: string[];
  kind: 'primary' | 'secondary';
}

export interface Being {
  id: string;
  name: string;
  categoryId: string;
  substanceId: string;
  accidents: Map<string, unknown>;
  actuality: number;
  potentiality: number;
  createdAt: number;
}

export class BeingClassifier {
  private _categories: Map<string, OntologicalCategory> = new Map();
  private _substances: Map<string, Substance> = new Map();
  private _beings: Map<string, Being> = new Map();
  private _hierarchy: string[] = [];
  private _history: string[] = [];
  private _counter = 0;

  constructor() {
    this._initDefaultCategories();
  }

  defineCategory(name: string, parent: string | null): OntologicalCategory {
    const id = `cat-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    const parentCategory = parent ? this._categories.get(parent) : null;
    const level = parentCategory ? parentCategory.level + 1 : 0;

    const category: OntologicalCategory = {
      id,
      name,
      parent,
      children: [],
      level,
      description: `Category: ${name}`,
    };

    this._categories.set(id, category);

    if (parent && parentCategory) {
      parentCategory.children.push(id);
    }

    this._rebuildHierarchy();
    this._recordHistory(`defineCategory:${name}:level${level}`);
    return category;
  }

  defineSubstance(name: string, essence: string): Substance {
    const id = `sub-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    const substance: Substance = {
      id,
      name,
      essence,
      accidents: [],
      kind: 'secondary',
    };
    this._substances.set(id, substance);
    this._recordHistory(`defineSubstance:${name}`);
    return substance;
  }

  createBeing(categoryId: string, substanceId: string): Being | null {
    const category = this._categories.get(categoryId);
    const substance = this._substances.get(substanceId);
    if (!category || !substance) return null;

    const id = `being-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    const being: Being = {
      id,
      name: `${substance.name} ${category.name}`,
      categoryId,
      substanceId,
      accidents: new Map(),
      actuality: 0.5,
      potentiality: 0.5,
      createdAt: Date.now(),
    };
    this._beings.set(id, being);
    this._recordHistory(`createBeing:${id}:${category.name}`);
    return being;
  }

  addAccident(beingId: string, property: string, value: unknown): Being | null {
    const being = this._beings.get(beingId);
    if (!being) return null;

    being.accidents.set(property, value);
    being.actuality = Math.min(1, being.actuality + 0.05);
    being.potentiality = Math.max(0, being.potentiality - 0.02);

    const substance = this._substances.get(being.substanceId);
    if (substance && !substance.accidents.includes(property)) {
      substance.accidents.push(property);
    }

    this._recordHistory(`addAccident:${beingId}:${property}`);
    return being;
  }

  classify(entity: Record<string, unknown>): OntologicalCategory | null {
    let bestCategory: OntologicalCategory | null = null;
    let bestScore = 0;

    for (const category of this._categories.values()) {
      let score = 0;
      const entityKeys = Object.keys(entity);

      for (const key of entityKeys) {
        if (category.name.toLowerCase().includes(key.toLowerCase())) {
          score += 0.2;
        }
        if (category.description.toLowerCase().includes(key.toLowerCase())) {
          score += 0.1;
        }
      }

      if (category.level > 0) {
        score += category.level * 0.05;
      }

      if (score > bestScore) {
        bestScore = score;
        bestCategory = category;
      }
    }

    this._recordHistory(`classify:${bestCategory?.name ?? 'unknown'}`);
    return bestCategory;
  }

  essenceAccidentDistinction(beingId: string): { essence: string; accidents: Array<{ property: string; value: unknown }> } | null {
    const being = this._beings.get(beingId);
    if (!being) return null;

    const substance = this._substances.get(being.substanceId);
    const essence = substance?.essence ?? 'unknown essence';

    return {
      essence,
      accidents: Array.from(being.accidents.entries()).map(([property, value]) => ({ property, value })),
    };
  }

  actPotency(beingId: string): { actuality: number; potentiality: number; ratio: number } | null {
    const being = this._beings.get(beingId);
    if (!being) return null;

    const ratio = being.potentiality > 0 ? being.actuality / being.potentiality : being.actuality;
    return {
      actuality: being.actuality,
      potentiality: being.potentiality,
      ratio,
    };
  }

  getCategoryTree(): OntologicalCategory[] {
    return Array.from(this._categories.values()).sort((a, b) => a.level - b.level);
  }

  findCategory(name: string): OntologicalCategory | undefined {
    return Array.from(this._categories.values()).find(
      c => c.name.toLowerCase() === name.toLowerCase()
    );
  }

  subcategories(categoryId: string): OntologicalCategory[] {
    return Array.from(this._categories.values())
      .filter(c => c.parent === categoryId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  parentCategory(categoryId: string): OntologicalCategory | null {
    const category = this._categories.get(categoryId);
    if (!category || !category.parent) return null;
    return this._categories.get(category.parent) || null;
  }

  isSubcategoryOf(categoryId: string, parentId: string): boolean {
    let current = this._categories.get(categoryId);
    while (current) {
      if (current.id === parentId) return true;
      if (!current.parent) return false;
      current = this._categories.get(current.parent);
    }
    return false;
  }

  commonAncestor(categoryA: string, categoryB: string): OntologicalCategory | null {
    const ancestorsA = new Set<string>();
    let current = this._categories.get(categoryA);
    while (current) {
      ancestorsA.add(current.id);
      if (!current.parent) break;
      current = this._categories.get(current.parent);
    }

    current = this._categories.get(categoryB);
    while (current) {
      if (ancestorsA.has(current.id)) return current;
      if (!current.parent) break;
      current = this._categories.get(current.parent);
    }

    return null;
  }

  beingsInCategory(categoryId: string): Being[] {
    return Array.from(this._beings.values()).filter(b => {
      return this.isSubcategoryOf(b.categoryId, categoryId) || b.categoryId === categoryId;
    });
  }

  substanceOfBeing(beingId: string): Substance | null {
    const being = this._beings.get(beingId);
    if (!being) return null;
    return this._substances.get(being.substanceId) || null;
  }

  mostAccidentalBeing(): Being | null {
    if (this._beings.size === 0) return null;
    let maxAccidents = -1;
    let result: Being | null = null;
    for (const being of this._beings.values()) {
      if (being.accidents.size > maxAccidents) {
        maxAccidents = being.accidents.size;
        result = being;
      }
    }
    return result;
  }

  mostActualBeing(): Being | null {
    if (this._beings.size === 0) return null;
    let maxActuality = -1;
    let result: Being | null = null;
    for (const being of this._beings.values()) {
      if (being.actuality > maxActuality) {
        maxActuality = being.actuality;
        result = being;
      }
    }
    return result;
  }

  mostPotentialBeing(): Being | null {
    if (this._beings.size === 0) return null;
    let maxPotentiality = -1;
    let result: Being | null = null;
    for (const being of this._beings.values()) {
      if (being.potentiality > maxPotentiality) {
        maxPotentiality = being.potentiality;
        result = being;
      }
    }
    return result;
  }

  toPacket(): DataPacket {
    return {
      id: `classifier-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        categories: Array.from(this._categories.values()),
        substances: Array.from(this._substances.values()),
        beings: Array.from(this._beings.values()).map(b => ({
          ...b,
          accidents: Object.fromEntries(b.accidents),
        })),
        hierarchy: [...this._hierarchy],
        totalCategories: this._categories.size,
        totalBeings: this._beings.size,
      },
      metadata: {
        createdAt: Date.now(),
        route: ['ontology', 'BeingClassifier'],
        priority: Math.max(1, Math.floor(this._beings.size * 0.3)),
        phase: 'classifying',
      },
    };
  }

  reset(): void {
    this._categories.clear();
    this._substances.clear();
    this._beings.clear();
    this._hierarchy = [];
    this._history = [];
    this._counter = 0;
    this._initDefaultCategories();
  }

  get categoryCount(): number {
    return this._categories.size;
  }

  get beingCount(): number {
    return this._beings.size;
  }

  get history(): string[] {
    return [...this._history];
  }

  private _initDefaultCategories(): void {
    const root = this.defineCategory('Entity', null);
    const substance = this.defineCategory('Substance', root.id);
    const quantity = this.defineCategory('Quantity', root.id);
    const quality = this.defineCategory('Quality', root.id);
    const relation = this.defineCategory('Relation', root.id);
    const place = this.defineCategory('Place', root.id);
    const time = this.defineCategory('Time', root.id);
    const position = this.defineCategory('Position', root.id);
    const state = this.defineCategory('State', root.id);
    const action = this.defineCategory('Action', root.id);
    const passion = this.defineCategory('Passion', root.id);
  }

  private _rebuildHierarchy(): void {
    const roots = Array.from(this._categories.values()).filter(c => c.parent === null);
    const hierarchy: string[] = [];

    const traverse = (categoryId: string, depth: number) => {
      const category = this._categories.get(categoryId);
      if (!category) return;
      hierarchy.push(`${'  '.repeat(depth)}${category.name}`);
      for (const childId of category.children) {
        traverse(childId, depth + 1);
      }
    };

    for (const root of roots) {
      traverse(root.id, 0);
    }

    this._hierarchy = hierarchy;
  }

  private _recordHistory(action: string): void {
    this._history.push(`${Date.now()}:${action}`);
  }
}
