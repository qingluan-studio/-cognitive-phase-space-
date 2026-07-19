import { DataPacket } from '../shared/types';

export interface Entity {
  text: string;
  type: string;
  position: number;
  confidence: number;
}

export interface NERResult {
  entities: Entity[];
  relations: { from: string; to: string; type: string; confidence: number }[];
}

export class NamedEntity {
  private _entities: Entity[] = [];
  private _relations: { from: string; to: string; type: string; confidence: number }[] = [];
  private _counter: number = 0;
  private _modelType: string = 'default';
  private _gazetteers: Map<string, Set<string>> = new Map();
  private _lastResult: NERResult | null = null;

  constructor() {
    this._initDefaultGazetteers();
  }

  get entities(): Entity[] {
    return this._entities;
  }

  get relations(): { from: string; to: string; type: string; confidence: number }[] {
    return this._relations;
  }

  get modelType(): string {
    return this._modelType;
  }

  get gazetteers(): Map<string, Set<string>> {
    return this._gazetteers;
  }

  private _initDefaultGazetteers(): void {
    const people = new Set(['john', 'jane', 'michael', 'sarah', 'david', 'emily', 'james', 'olivia', 'robert', 'sophia']);
    const orgs = new Set(['google', 'microsoft', 'apple', 'amazon', 'facebook', 'tesla', 'ibm', 'oracle', 'salesforce', 'adobe']);
    const locations = new Set(['new york', 'london', 'paris', 'tokyo', 'beijing', 'sydney', 'berlin', 'moscow', 'dubai', 'singapore']);
    this._gazetteers.set('PERSON', people);
    this._gazetteers.set('ORG', orgs);
    this._gazetteers.set('GPE', locations);
  }

  recognize(text: string, model: { type: string }): Entity[] {
    const entities: Entity[] = [];
    const words = text.split(/\s+/);
    let position = 0;
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (/^[A-Z][a-z]+$/.test(word) && word.length > 2) {
        let entityType = 'PERSON';
        if (i > 0) {
          const prevWord = words[i - 1].toLowerCase();
          if (prevWord === 'at' || prevWord === 'in' || prevWord === 'to') {
            entityType = 'GPE';
          } else if (prevWord === 'the') {
            entityType = 'ORG';
          }
        }
        entities.push({
          text: word,
          type: entityType,
          position,
          confidence: 0.7 + (this._hash(word + entityType) % 30) / 100
        });
      }
      position += word.length + 1;
    }
    this._entities = entities;
    this._modelType = model.type;
    return entities;
  }

  personEntity(text: string): Entity[] {
    const entities: Entity[] = [];
    const words = text.split(/\s+/);
    let position = 0;
    const personGazetteer = this._gazetteers.get('PERSON') || new Set();
    for (let i = 0; i < words.length; i++) {
      const word = words[i].replace(/[.,!?;:'"]$/, '');
      const lower = word.toLowerCase();
      if (personGazetteer.has(lower) || (/^[A-Z][a-z]+$/.test(word) && i > 0 && /^(Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.)$/.test(words[i - 1]))) {
        entities.push({
          text: word,
          type: 'PERSON',
          position,
          confidence: 0.85
        });
      }
      position += words[i].length + 1;
    }
    this._entities = entities;
    this._modelType = 'person-entity';
    return entities;
  }

  orgEntity(text: string): Entity[] {
    const entities: Entity[] = [];
    const words = text.split(/\s+/);
    let position = 0;
    const orgGazetteer = this._gazetteers.get('ORG') || new Set();
    for (let i = 0; i < words.length; i++) {
      const word = words[i].replace(/[.,!?;:'"]$/, '');
      const lower = word.toLowerCase();
      if (orgGazetteer.has(lower) || /(Inc\.|LLC|Ltd\.|Corp\.|Corporation|Company)$/.test(words[i])) {
        entities.push({
          text: word,
          type: 'ORG',
          position,
          confidence: 0.9
        });
      }
      position += words[i].length + 1;
    }
    this._entities = entities;
    this._modelType = 'org-entity';
    return entities;
  }

  locationEntity(text: string): Entity[] {
    const entities: Entity[] = [];
    const words = text.split(/\s+/);
    let position = 0;
    const locGazetteer = this._gazetteers.get('GPE') || new Set();
    for (let i = 0; i < words.length; i++) {
      const word = words[i].replace(/[.,!?;:'"]$/, '');
      const lower = word.toLowerCase();
      if (locGazetteer.has(lower)) {
        entities.push({
          text: word,
          type: 'GPE',
          position,
          confidence: 0.88
        });
      }
      position += words[i].length + 1;
    }
    this._entities = entities;
    this._modelType = 'location-entity';
    return entities;
  }

  dateEntity(text: string): Entity[] {
    const entities: Entity[] = [];
    const datePatterns = [
      /\b\d{4}-\d{2}-\d{2}\b/g,
      /\b\d{2}\/\d{2}\/\d{4}\b/g,
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi,
      /\b\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/gi,
      /\btoday\b/gi,
      /\btomorrow\b/gi,
      /\byesterday\b/gi
    ];
    for (const pattern of datePatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          text: match[0],
          type: 'DATE',
          position: match.index,
          confidence: 0.95
        });
      }
    }
    this._entities = entities;
    this._modelType = 'date-entity';
    return entities;
  }

  timeEntity(text: string): Entity[] {
    const entities: Entity[] = [];
    const timePatterns = [
      /\b\d{1,2}:\d{2}(:\d{2})?(\s?[AaPp][Mm])?\b/g,
      /\b\d{1,2}\s?[AaPp][Mm]\b/g,
      /\bnoon\b/gi,
      /\bmidnight\b/gi,
      /\b(morning|afternoon|evening|night)\b/gi
    ];
    for (const pattern of timePatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          text: match[0],
          type: 'TIME',
          position: match.index,
          confidence: 0.92
        });
      }
    }
    this._entities = entities;
    this._modelType = 'time-entity';
    return entities;
  }

  moneyEntity(text: string): Entity[] {
    const entities: Entity[] = [];
    const moneyPatterns = [
      /\$\d{1,3}(,\d{3})*(\.\d{2})?\b/g,
      /\b\d{1,3}(,\d{3})*(\.\d{2})?\s?(dollars|USD|EUR|GBP|JPY|CNY)\b/gi,
      /\b\d+(\.\d+)?\s?(million|billion|trillion)\s?(dollars|USD)?\b/gi
    ];
    for (const pattern of moneyPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          text: match[0],
          type: 'MONEY',
          position: match.index,
          confidence: 0.93
        });
      }
    }
    this._entities = entities;
    this._modelType = 'money-entity';
    return entities;
  }

  percentEntity(text: string): Entity[] {
    const entities: Entity[] = [];
    const percentPatterns = [
      /\b\d+(\.\d+)?\s?%/g,
      /\b\d+(\.\d+)?\s?percent\b/gi,
      /\b\d+(\.\d+)?\s?per\s?cent\b/gi
    ];
    for (const pattern of percentPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          text: match[0],
          type: 'PERCENT',
          position: match.index,
          confidence: 0.96
        });
      }
    }
    this._entities = entities;
    this._modelType = 'percent-entity';
    return entities;
  }

  productEntity(text: string): Entity[] {
    const entities: Entity[] = [];
    const words = text.split(/\s+/);
    let position = 0;
    const productIndicators = ['model', 'version', 'release', 'product', 'device'];
    for (let i = 0; i < words.length; i++) {
      const word = words[i].replace(/[.,!?;:'"]$/, '');
      if (/^[A-Z][a-z]*\d+/.test(word) || /\d+[A-Za-z]+/.test(word)) {
        entities.push({
          text: word,
          type: 'PRODUCT',
          position,
          confidence: 0.75
        });
      }
      if (i > 0 && productIndicators.includes(words[i - 1].toLowerCase())) {
        entities.push({
          text: word,
          type: 'PRODUCT',
          position,
          confidence: 0.8
        });
      }
      position += words[i].length + 1;
    }
    this._entities = entities;
    this._modelType = 'product-entity';
    return entities;
  }

  eventEntity(text: string): Entity[] {
    const entities: Entity[] = [];
    const eventWords = ['conference', 'meeting', 'seminar', 'workshop', 'concert', 'festival', 'exhibition', 'summit', 'symposium', 'tournament'];
    const words = text.split(/\s+/);
    let position = 0;
    let i = 0;
    while (i < words.length) {
      const word = words[i].toLowerCase().replace(/[.,!?;:'"]$/, '');
      if (eventWords.includes(word)) {
        let eventName = words[i];
        let startPos = position;
        if (i > 0 && /^[A-Z]/.test(words[i - 1])) {
          eventName = words[i - 1] + ' ' + eventName;
          startPos -= words[i - 1].length + 1;
        }
        entities.push({
          text: eventName,
          type: 'EVENT',
          position: startPos,
          confidence: 0.82
        });
      }
      position += words[i].length + 1;
      i++;
    }
    this._entities = entities;
    this._modelType = 'event-entity';
    return entities;
  }

  ruleBasedNER(text: string, patterns: { type: string; regex: RegExp }[]): Entity[] {
    const entities: Entity[] = [];
    for (const pattern of patterns) {
      let match;
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags.includes('g') ? pattern.regex.flags : pattern.regex.flags + 'g');
      while ((match = regex.exec(text)) !== null) {
        entities.push({
          text: match[0],
          type: pattern.type,
          position: match.index,
          confidence: 0.88
        });
      }
    }
    this._entities = entities;
    this._modelType = 'rule-based';
    return entities;
  }

  gazetteerNER(text: string, gazetteers: Map<string, string[]>): Entity[] {
    const entities: Entity[] = [];
    const lowerText = text.toLowerCase();
    for (const [type, terms] of gazetteers) {
      for (const term of terms) {
        const lowerTerm = term.toLowerCase();
        let pos = 0;
        while (pos < lowerText.length) {
          const idx = lowerText.indexOf(lowerTerm, pos);
          if (idx === -1) break;
          entities.push({
            text: text.substring(idx, idx + term.length),
            type,
            position: idx,
            confidence: 0.9
          });
          pos = idx + term.length;
        }
      }
    }
    this._entities = entities;
    this._modelType = 'gazetteer';
    return entities;
  }

  coreference(text: string): { mention: string; referent: string; position: number }[] {
    const results: { mention: string; referent: string; position: number }[] = [];
    const sentences = text.split(/(?<=[.!?])\s+/);
    const properNouns: string[] = [];
    for (const sentence of sentences) {
      const words = sentence.split(/\s+/);
      for (const word of words) {
        const clean = word.replace(/[.,!?;:'"]$/, '');
        if (/^[A-Z][a-z]+$/.test(clean) && clean.length > 2) {
          properNouns.push(clean);
        }
      }
    }
    const pronouns = ['he', 'she', 'it', 'they', 'him', 'her', 'them', 'his', 'her', 'its', 'their'];
    let position = 0;
    for (const sentence of sentences) {
      const words = sentence.split(/\s+/);
      for (let i = 0; i < words.length; i++) {
        const word = words[i].toLowerCase().replace(/[.,!?;:'"]$/, '');
        if (pronouns.includes(word) && properNouns.length > 0) {
          results.push({
            mention: words[i],
            referent: properNouns[0],
            position
          });
        }
        position += words[i].length + 1;
      }
    }
    return results;
  }

  relationExtraction(text: string, model: { type: string }): { from: string; to: string; type: string; confidence: number }[] {
    const relations: { from: string; to: string; type: string; confidence: number }[] = [];
    const entities = this.recognize(text, model);
    const relationPatterns = [
      { pattern: /works?\s*(at|for|with)/i, type: 'WORKS_FOR' },
      { pattern: /is\s*(located|based|situated)\s*(in|at)/i, type: 'LOCATED_IN' },
      { pattern: /(ceo|president|director|manager|founder)\s*(of|at)/i, type: 'LEADER_OF' },
      { pattern: /(was|is)\s*born\s*(in|on)/i, type: 'BORN_IN' },
      { pattern: /(married|wife|husband|spouse)/i, type: 'SPOUSE_OF' }
    ];
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const e1 = entities[i];
        const e2 = entities[j];
        const between = text.substring(e1.position + e1.text.length, e2.position).toLowerCase();
        for (const rp of relationPatterns) {
          if (rp.pattern.test(between)) {
            relations.push({
              from: e1.text,
              to: e2.text,
              type: rp.type,
              confidence: 0.7 + (this._hash(e1.text + e2.text + rp.type) % 25) / 100
            });
            break;
          }
        }
      }
    }
    this._relations = relations;
    this._modelType = 'relation-extraction';
    return relations;
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

  toPacket(): DataPacket<NERResult> {
    const result: NERResult = {
      entities: this._entities,
      relations: this._relations
    };
    this._lastResult = result;
    this._counter++;
    return {
      id: `ner-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['nlp', 'ner'],
        priority: 1,
        phase: 'entity-recognition'
      }
    };
  }

  reset(): void {
    this._entities = [];
    this._relations = [];
    this._counter = 0;
    this._modelType = 'default';
    this._lastResult = null;
  }
}
