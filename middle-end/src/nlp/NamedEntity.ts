import { DataPacket } from '../shared/types';

export interface Entity {
  text: string;
  type: string;
  position: number;
  confidence: number;
  endPosition?: number;
  normalized?: string;
  wikiId?: string;
  metadata?: Record<string, unknown>;
}

export interface NERResult {
  entities: Entity[];
  relations: { from: string; to: string; type: string; confidence: number }[];
  tags?: TaggedToken[];
}

export interface TaggedToken {
  token: string;
  tag: string;
  position: number;
}

export interface EntityLink {
  entity: Entity;
  candidate: string;
  score: number;
  source: string;
}

export interface CoreferenceChain {
  representative: string;
  mentions: { text: string; position: number; type: string }[];
}

export interface NERStat {
  totalEntities: number;
  byType: Record<string, number>;
  avgConfidence: number;
  coverage: number;
}

export type TagScheme = 'IOB' | 'BILOU' | 'IOBES';

interface CRFFeature {
  word: string;
  isCapitalized: boolean;
  isAllCaps: boolean;
  isDigit: boolean;
  prefix: string;
  suffix: string;
  shape: string;
  prevWord: string;
  nextWord: string;
  prevTag: string;
}

interface CRFWeights {
  emission: Map<string, Map<string, number>>;
  transition: Map<string, Map<string, number>>;
}

export class NamedEntity {
  private _entities: Entity[] = [];
  private _relations: { from: string; to: string; type: string; confidence: number }[] = [];
  private _counter: number = 0;
  private _modelType: string = 'default';
  private _gazetteers: Map<string, Set<string>> = new Map();
  private _lastResult: NERResult | null = null;
  private _tagScheme: TagScheme = 'IOB';
  private _crfWeights: CRFWeights = { emission: new Map(), transition: new Map() };
  private _crfTrained: boolean = false;
  private _entityLinker: Map<string, EntityLink[]> = new Map();
  private _knowledgeGraph: Map<string, { type: string; aliases: string[]; description: string }> = new Map();
  private _stopwords: Set<string> = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being']);
  private _titleHonorifics: Set<string> = new Set(['mr', 'mrs', 'ms', 'dr', 'prof', 'sir', 'lord', 'lady', 'rev', 'capt', 'col', 'gen']);
  private _organizationSuffixes: Set<string> = new Set(['inc', 'llc', 'ltd', 'corp', 'corporation', 'company', 'co', 'group', 'gmbh', 'sa', 'ag']);
  private _relationPatterns: { pattern: RegExp; type: string }[] = [];

  constructor() {
    this._initDefaultGazetteers();
    this._initKnowledgeGraph();
    this._initRelationPatterns();
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

  get tagScheme(): TagScheme {
    return this._tagScheme;
  }

  set tagScheme(scheme: TagScheme) {
    this._tagScheme = scheme;
  }

  get knowledgeGraph(): Map<string, { type: string; aliases: string[]; description: string }> {
    return this._knowledgeGraph;
  }

  /**
   * Initialize default gazetteers for common entity types
   */
  private _initDefaultGazetteers(): void {
    const people = new Set([
      'john', 'jane', 'michael', 'sarah', 'david', 'emily', 'james', 'olivia',
      'robert', 'sophia', 'william', 'emma', 'daniel', 'ava', 'joseph', 'isabella',
      'charles', 'mia', 'thomas', 'charlotte', 'christopher', 'amelia', 'andrew',
      'harper', 'matthew', 'evelyn', 'anthony', 'abigail', 'mark', 'emily',
      'donald', 'elizabeth', 'steven', 'samantha', 'paul', 'victoria', 'andrew',
      'elena', 'joshua', 'katherine', 'kenneth', 'jessica', 'kevin', 'rachel',
      'brian', 'natalie', 'george', 'anna', 'edward', 'hannah', 'ronald', 'lily'
    ]);
    const orgs = new Set([
      'google', 'microsoft', 'apple', 'amazon', 'facebook', 'tesla', 'ibm', 'oracle',
      'salesforce', 'adobe', 'netflix', 'twitter', 'meta', 'nvidia', 'intel', 'amd',
      'samsung', 'sony', 'huawei', 'alibaba', 'tencent', 'baidu', 'jingdong', 'bytedance',
      'openai', 'anthropic', 'deepmind', 'uber', 'lyft', 'airbnb', 'spotify',
      'cisco', 'dell', 'hp', 'lenovo', 'asus', 'acer', 'paypal', 'visa', 'mastercard'
    ]);
    const locations = new Set([
      'new york', 'london', 'paris', 'tokyo', 'beijing', 'sydney', 'berlin', 'moscow',
      'dubai', 'singapore', 'hong kong', 'seoul', 'mumbai', 'delhi', 'shanghai',
      'los angeles', 'san francisco', 'chicago', 'toronto', 'vancouver', 'madrid',
      'rome', 'amsterdam', 'vienna', 'prague', 'istanbul', 'cairo', 'rio de janeiro',
      'buenos aires', 'mexico city', 'bangkok', 'jakarta', 'manila', 'taipei', 'osaka'
    ]);
    const languages = new Set([
      'english', 'chinese', 'spanish', 'hindi', 'arabic', 'portuguese', 'russian',
      'japanese', 'german', 'french', 'korean', 'italian', 'turkish', 'dutch',
      'polish', 'swedish', 'norwegian', 'finnish', 'danish', 'greek', 'hebrew',
      'thai', 'vietnamese', 'indonesian', 'malay', 'filipino', 'bengali', 'punjabi'
    ]);
    const currencies = new Set([
      'usd', 'eur', 'gbp', 'jpy', 'cny', 'aud', 'cad', 'chf', 'hkd', 'sgd',
      'krw', 'inr', 'rub', 'brl', 'mxn', 'zar', 'try', 'sek', 'nok', 'dkk',
      'dollar', 'euro', 'pound', 'yen', 'yuan', 'rupee', 'ruble', 'real', 'peso', 'won'
    ]);
    const laws = new Set([
      'gdpr', 'ccpa', 'hipaa', 'sox', 'dodd-frank', 'basel iii', 'mifid ii',
      'constitution', 'bill of rights', 'magna carta', 'civil rights act',
      'affordable care act', 'patriot act', 'esa', 'ada', 'fmla', 'fair labor standards act'
    ]);
    const nationalities = new Set([
      'american', 'british', 'french', 'german', 'spanish', 'italian', 'russian',
      'chinese', 'japanese', 'korean', 'indian', 'brazilian', 'canadian', 'australian',
      'mexican', 'argentinian', 'dutch', 'swedish', 'norwegian', 'finnish', 'danish',
      'polish', 'turkish', 'egyptian', 'south african', 'nigerian', 'kenyan'
    ]);
    this._gazetteers.set('PERSON', people);
    this._gazetteers.set('ORG', orgs);
    this._gazetteers.set('GPE', locations);
    this._gazetteers.set('LANGUAGE', languages);
    this._gazetteers.set('CURRENCY', currencies);
    this._gazetteers.set('LAW', laws);
    this._gazetteers.set('NORP', nationalities);
  }

  /**
   * Initialize a simple in-memory knowledge graph for entity linking
   */
  private _initKnowledgeGraph(): void {
    this._knowledgeGraph.set('apple', {
      type: 'ORG',
      aliases: ['apple inc', 'apple computer', 'aapl'],
      description: 'American multinational technology company headquartered in Cupertino, California.'
    });
    this._knowledgeGraph.set('apple_fruit', {
      type: 'PRODUCT',
      aliases: ['apple', 'malus domestica'],
      description: 'Edible fruit produced by an apple tree.'
    });
    this._knowledgeGraph.set('google', {
      type: 'ORG',
      aliases: ['google llc', 'alphabet'],
      description: 'American multinational technology company specializing in internet services.'
    });
    this._knowledgeGraph.set('microsoft', {
      type: 'ORG',
      aliases: ['microsoft corporation', 'msft'],
      description: 'American multinational technology corporation.'
    });
    this._knowledgeGraph.set('washington_president', {
      type: 'PERSON',
      aliases: ['george washington', 'president washington'],
      description: 'First president of the United States.'
    });
    this._knowledgeGraph.set('washington_state', {
      type: 'GPE',
      aliases: ['washington state', 'wa'],
      description: 'State in the Pacific Northwest region of the United States.'
    });
    this._knowledgeGraph.set('washington_dc', {
      type: 'GPE',
      aliases: ['washington d.c.', 'dc', 'district of columbia'],
      description: 'Capital of the United States.'
    });
  }

  /**
   * Initialize common relation extraction patterns
   */
  private _initRelationPatterns(): void {
    this._relationPatterns = [
      { pattern: /works?\s*(at|for|with)\s+/i, type: 'WORKS_FOR' },
      { pattern: /is\s*(located|based|situated|headquartered)\s*(in|at)\s+/i, type: 'LOCATED_IN' },
      { pattern: /(ceo|president|director|manager|founder|chairman|cto|cfo|coo|cmo)\s+(of|at)\s+/i, type: 'LEADER_OF' },
      { pattern: /(was|is|were|are)\s*born\s*(in|on)\s+/i, type: 'BORN_IN' },
      { pattern: /(married|wife|husband|spouse|partner)\s+(of|to)?\s*/i, type: 'SPOUSE_OF' },
      { pattern: /(parent|subsidiary|acquired|bought|owns)\s+/i, type: 'SUBSIDIARY_OF' },
      { pattern: /(founded|established|created|started)\s+(in)?\s*/i, type: 'FOUNDED_IN' },
      { pattern: /(part\s*of|member\s*of|belongs\s*to)\s+/i, type: 'PART_OF' },
      { pattern: /(author|writer|creator)\s+(of)\s+/i, type: 'AUTHOR_OF' },
      { pattern: /(capital|largest\s+city)\s+(of|in)\s+/i, type: 'CAPITAL_OF' },
      { pattern: /(president|king|queen|emperor|leader)\s+(of)\s+/i, type: 'LEADER_OF' },
      { pattern: /(manufactured|produced|made)\s+(by)\s+/i, type: 'MANUFACTURED_BY' }
    ];
  }

  /**
   * Heuristic NER using capitalization + context clues
   */
  recognize(text: string, model: { type: string }): Entity[] {
    const entities: Entity[] = [];
    const words = text.split(/\s+/);
    let position = 0;
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const clean = word.replace(/[.,!?;:'"]/g, '');
      if (/^[A-Z][a-z]+$/.test(clean) && clean.length > 2 && !this._isSentenceStart(words, i)) {
        let entityType = 'PERSON';
        if (i > 0) {
          const prevWord = words[i - 1].toLowerCase().replace(/[.,!?;:'"]/g, '');
          if (prevWord === 'at' || prevWord === 'in' || prevWord === 'to' || prevWord === 'from') {
            entityType = 'GPE';
          } else if (prevWord === 'the' || prevWord === 'an') {
            entityType = 'ORG';
          } else if (this._titleHonorifics.has(prevWord.replace(/\./g, ''))) {
            entityType = 'PERSON';
          }
        }
        // Gazetteer lookup overrides heuristics
        for (const [type, terms] of this._gazetteers) {
          if (terms.has(clean.toLowerCase())) {
            entityType = type;
            break;
          }
        }
        entities.push({
          text: clean,
          type: entityType,
          position,
          endPosition: position + clean.length,
          confidence: 0.7 + (this._hash(clean + entityType) % 30) / 100
        });
      }
      position += word.length + 1;
    }
    this._entities = entities;
    this._modelType = model.type;
    return entities;
  }

  /**
   * Detect PERSON entities using gazetteers + honorifics + capitalization
   */
  personEntity(text: string): Entity[] {
    const entities: Entity[] = [];
    const words = text.split(/\s+/);
    let position = 0;
    const personGazetteer = this._gazetteers.get('PERSON') || new Set();
    for (let i = 0; i < words.length; i++) {
      const word = words[i].replace(/[.,!?;:'"]$/, '');
      const lower = word.toLowerCase();
      const prevWord = i > 0 ? words[i - 1].toLowerCase().replace(/\./g, '') : '';
      const isHonorific = this._titleHonorifics.has(prevWord);
      if (personGazetteer.has(lower) || (isHonorific && /^[A-Z][a-z]+$/.test(word))) {
        // Capture multi-word name (e.g., "John Smith")
        let fullText = word;
        let endPos = position + word.length;
        if (i + 1 < words.length && /^[A-Z][a-z]+$/.test(words[i + 1].replace(/[.,!?;:'"]$/, ''))) {
          fullText += ' ' + words[i + 1];
          endPos += 1 + words[i + 1].length;
        }
        entities.push({
          text: fullText,
          type: 'PERSON',
          position,
          endPosition: endPos,
          confidence: 0.85 + (this._hash(fullText) % 10) / 100
        });
      }
      position += words[i].length + 1;
    }
    this._entities = entities;
    this._modelType = 'person-entity';
    return entities;
  }

  /**
   * Detect ORG (organization) entities using gazetteers + suffixes
   */
  orgEntity(text: string): Entity[] {
    const entities: Entity[] = [];
    const words = text.split(/\s+/);
    let position = 0;
    const orgGazetteer = this._gazetteers.get('ORG') || new Set();
    for (let i = 0; i < words.length; i++) {
      const word = words[i].replace(/[.,!?;:'"]$/, '');
      const lower = word.toLowerCase();
      const hasSuffix = this._organizationSuffixes.has(lower);
      if (orgGazetteer.has(lower) || hasSuffix) {
        let fullText = word;
        let startPos = position;
        let endPos = position + word.length;
        // Extend backwards to capture organization name
        if (hasSuffix && i > 0) {
          let j = i - 1;
          while (j >= 0 && (/^[A-Z]/.test(words[j]) || this._organizationSuffixes.has(words[j].toLowerCase().replace(/[.,!?;:'"]$/, '')))) {
            fullText = words[j] + ' ' + fullText;
            startPos -= words[j].length + 1;
            j--;
          }
        }
        entities.push({
          text: fullText,
          type: 'ORG',
          position: startPos,
          endPosition: endPos,
          confidence: 0.9
        });
      }
      position += words[i].length + 1;
    }
    this._entities = entities;
    this._modelType = 'org-entity';
    return entities;
  }

  /**
   * Detect GPE (Geo-Political Entity) - countries, cities, states
   */
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
          endPosition: position + word.length,
          confidence: 0.88
        });
      }
      position += words[i].length + 1;
    }
    // Try matching multi-word locations
    for (const loc of locGazetteer) {
      if (loc.includes(' ')) {
        const lower = loc.toLowerCase();
        let pos = 0;
        while (pos < text.length) {
          const idx = text.toLowerCase().indexOf(lower, pos);
          if (idx === -1) break;
          entities.push({
            text: text.substring(idx, idx + loc.length),
            type: 'GPE',
            position: idx,
            endPosition: idx + loc.length,
            confidence: 0.92
          });
          pos = idx + loc.length;
        }
      }
    }
    this._entities = entities;
    this._modelType = 'location-entity';
    return entities;
  }

  /**
   * Detect DATE entities using a variety of date patterns
   */
  dateEntity(text: string): Entity[] {
    const entities: Entity[] = [];
    const datePatterns = [
      /\b\d{4}-\d{2}-\d{2}\b/g,
      /\b\d{2}\/\d{2}\/\d{4}\b/g,
      /\b\d{1,2}-\d{1,2}-\d{4}\b/g,
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi,
      /\b(Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+\d{1,2},?\s+\d{4}\b/gi,
      /\b\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/gi,
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/gi,
      /\b(today|tomorrow|yesterday|tonight)\b/gi,
      /\b(next|last|this)\s+(week|month|year|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
      /\b(Spring|Summer|Autumn|Fall|Winter)\s+\d{4}\b/gi,
      /\b\d{1,2}(st|nd|rd|th)\s+(century|century)\b/gi,
      /\b(1[0-9]{3}|20[0-9]{2}|19[0-9]{2})\b/g
    ];
    for (const pattern of datePatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          text: match[0],
          type: 'DATE',
          position: match.index,
          endPosition: match.index + match[0].length,
          confidence: 0.95
        });
      }
    }
    this._entities = entities;
    this._modelType = 'date-entity';
    return entities;
  }

  /**
   * Detect TIME entities
   */
  timeEntity(text: string): Entity[] {
    const entities: Entity[] = [];
    const timePatterns = [
      /\b\d{1,2}:\d{2}(:\d{2})?(\s?[AaPp][Mm])?\b/g,
      /\b\d{1,2}\s?[AaPp][Mm]\b/g,
      /\bnoon\b/gi,
      /\bmidnight\b/gi,
      /\b(morning|afternoon|evening|night|dawn|dusk|sunset|sunrise)\b/gi,
      /\b\d{1,2}\s?(hours?|hrs?|minutes?|mins?|seconds?|secs?)\b/gi,
      /\b\d{1,2}:\d{2}\s?(am|pm|AM|PM)\b/g
    ];
    for (const pattern of timePatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          text: match[0],
          type: 'TIME',
          position: match.index,
          endPosition: match.index + match[0].length,
          confidence: 0.92
        });
      }
    }
    this._entities = entities;
    this._modelType = 'time-entity';
    return entities;
  }

  /**
   * Detect MONEY / currency amounts
   */
  moneyEntity(text: string): Entity[] {
    const entities: Entity[] = [];
    const moneyPatterns = [
      /\$\d{1,3}(,\d{3})*(\.\d{2})?\b/g,
      /\b\d{1,3}(,\d{3})*(\.\d{2})?\s?(dollars|USD|EUR|GBP|JPY|CNY)\b/gi,
      /\b\d+(\.\d+)?\s?(million|billion|trillion|thousand|k|m|bn)\s?(dollars|USD|EUR|GBP)?\b/gi,
      /€\d{1,3}(,\d{3})*(\.\d{2})?/g,
      /£\d{1,3}(,\d{3})*(\.\d{2})?/g,
      /¥\d{1,3}(,\d{3})*(\.\d{2})?/g
    ];
    for (const pattern of moneyPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          text: match[0],
          type: 'MONEY',
          position: match.index,
          endPosition: match.index + match[0].length,
          confidence: 0.93
        });
      }
    }
    this._entities = entities;
    this._modelType = 'money-entity';
    return entities;
  }

  /**
   * Detect PERCENT entities
   */
  percentEntity(text: string): Entity[] {
    const entities: Entity[] = [];
    const percentPatterns = [
      /\b\d+(\.\d+)?\s?%/g,
      /\b\d+(\.\d+)?\s?percent\b/gi,
      /\b\d+(\.\d+)?\s?per\s?cent\b/gi,
      /\b\d+(\.\d+)?\s?(basis\s+points?|bps?)\b/gi,
      /\b(half|quarter|third|two-thirds?|three-quarters?)\s+(percent|%)?\b/gi
    ];
    for (const pattern of percentPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          text: match[0],
          type: 'PERCENT',
          position: match.index,
          endPosition: match.index + match[0].length,
          confidence: 0.96
        });
      }
    }
    this._entities = entities;
    this._modelType = 'percent-entity';
    return entities;
  }

  /**
   * Detect QUANTITY entities (measurements, weights, distances)
   */
  quantityEntity(text: string): Entity[] {
    const entities: Entity[] = [];
    const patterns = [
      { regex: /\b\d+(\.\d+)?\s?(kg|kilograms?|g|grams?|pounds?|lbs?|ounces?|oz)\b/gi, subtype: 'WEIGHT' },
      { regex: /\b\d+(\.\d+)?\s?(km|kilometers?|m|meters?|cm|centimeters?|mm|millimeters?|miles?|ft|feet|inches?|in)\b/gi, subtype: 'LENGTH' },
      { regex: /\b\d+(\.\d+)?\s?(l|liters?|gallons?|gal|quarts?|qt|pints?|pt|cups?)\b/gi, subtype: 'VOLUME' },
      { regex: /\b\d+(\.\d+)?\s?(celsius|c|fahrenheit|f|kelvin|k)\b/gi, subtype: 'TEMPERATURE' },
      { regex: /\b\d+(\.\d+)?\s?(hz|hertz|khz|mhz|ghz|thz)\b/gi, subtype: 'FREQUENCY' },
      { regex: /\b\d+(\.\d+)?\s?(bytes?|kb|mb|gb|tb|pb)\b/gi, subtype: 'DATA' },
      { regex: /\b\d+(\.\d+)?\s?(mph|km\/h|mps|knots?)\b/gi, subtype: 'SPEED' },
      { regex: /\b\d+\s?(years?|months?|weeks?|days?|hours?|minutes?|seconds?)\b/gi, subtype: 'DURATION' }
    ];
    for (const { regex, subtype } of patterns) {
      let match;
      while ((match = regex.exec(text)) !== null) {
        entities.push({
          text: match[0],
          type: 'QUANTITY',
          position: match.index,
          endPosition: match.index + match[0].length,
          confidence: 0.9,
          metadata: { subtype }
        });
      }
    }
    this._entities = entities;
    this._modelType = 'quantity-entity';
    return entities;
  }

  /**
   * Detect LANGUAGE entities
   */
  languageEntity(text: string): Entity[] {
    const entities: Entity[] = [];
    const langGazetteer = this._gazetteers.get('LANGUAGE') || new Set();
    const words = text.split(/\s+/);
    let position = 0;
    for (let i = 0; i < words.length; i++) {
      const word = words[i].replace(/[.,!?;:'"]$/, '');
      const lower = word.toLowerCase();
      if (langGazetteer.has(lower)) {
        entities.push({
          text: word,
          type: 'LANGUAGE',
          position,
          endPosition: position + word.length,
          confidence: 0.9
        });
      }
      position += words[i].length + 1;
    }
    this._entities = entities;
    this._modelType = 'language-entity';
    return entities;
  }

  /**
   * Detect LAW entities (acts, regulations, etc.)
   */
  lawEntity(text: string): Entity[] {
    const entities: Entity[] = [];
    const lawGazetteer = this._gazetteers.get('LAW') || new Set();
    for (const term of lawGazetteer) {
      const lower = term.toLowerCase();
      let pos = 0;
      while (pos < text.length) {
        const idx = text.toLowerCase().indexOf(lower, pos);
        if (idx === -1) break;
        entities.push({
          text: text.substring(idx, idx + term.length),
          type: 'LAW',
          position: idx,
          endPosition: idx + term.length,
          confidence: 0.92
        });
        pos = idx + term.length;
      }
    }
    this._entities = entities;
    this._modelType = 'law-entity';
    return entities;
  }

  /**
   * Detect CURRENCY entities (just currency names, not amounts)
   */
  currencyEntity(text: string): Entity[] {
    const entities: Entity[] = [];
    const curGazetteer = this._gazetteers.get('CURRENCY') || new Set();
    const words = text.split(/\s+/);
    let position = 0;
    for (const word of words) {
      const clean = word.replace(/[.,!?;:'"]$/, '');
      const lower = clean.toLowerCase();
      if (curGazetteer.has(lower) && !/^\d/.test(clean)) {
        entities.push({
          text: clean,
          type: 'CURRENCY',
          position,
          endPosition: position + clean.length,
          confidence: 0.88
        });
      }
      position += word.length + 1;
    }
    this._entities = entities;
    this._modelType = 'currency-entity';
    return entities;
  }

  /**
   * Detect ORDINAL entities (1st, 2nd, third, etc.)
   */
  ordinalEntity(text: string): Entity[] {
    const entities: Entity[] = [];
    const patterns = [
      /\b\d+(st|nd|rd|th)\b/gi,
      /\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth)\b/gi,
      /\b(twenty-first|twenty-second|thirty-first|forty-fifth|fiftieth|hundredth|thousandth)\b/gi
    ];
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          text: match[0],
          type: 'ORDINAL',
          position: match.index,
          endPosition: match.index + match[0].length,
          confidence: 0.94
        });
      }
    }
    this._entities = entities;
    this._modelType = 'ordinal-entity';
    return entities;
  }

  /**
   * Detect CARDINAL entities (plain numbers)
   */
  cardinalEntity(text: string): Entity[] {
    const entities: Entity[] = [];
    const patterns = [
      /\b\d{1,3}(,\d{3})*\b/g,
      /\b\d+(\.\d+)?\b/g,
      /\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|trillion)\b/gi
    ];
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          text: match[0],
          type: 'CARDINAL',
          position: match.index,
          endPosition: match.index + match[0].length,
          confidence: 0.92
        });
      }
    }
    this._entities = entities;
    this._modelType = 'cardinal-entity';
    return entities;
  }

  /**
   * Detect NORP (Nationalities or Religious/Political Groups)
   */
  norpEntity(text: string): Entity[] {
    const entities: Entity[] = [];
    const norpGazetteer = this._gazetteers.get('NORP') || new Set();
    const words = text.split(/\s+/);
    let position = 0;
    for (const word of words) {
      const clean = word.replace(/[.,!?;:'"]$/, '');
      const lower = clean.toLowerCase();
      if (norpGazetteer.has(lower)) {
        entities.push({
          text: clean,
          type: 'NORP',
          position,
          endPosition: position + clean.length,
          confidence: 0.9
        });
      }
      position += word.length + 1;
    }
    this._entities = entities;
    this._modelType = 'norp-entity';
    return entities;
  }

  /**
   * Detect WORK_OF_ART entities (book titles, song titles, etc.)
   */
  workOfArtEntity(text: string): Entity[] {
    const entities: Entity[] = [];
    // Quoted strings often indicate titles
    const quotedPattern = /[""']([A-Z][^""]{3,80})[""']/g;
    let match;
    while ((match = quotedPattern.exec(text)) !== null) {
      entities.push({
        text: match[0],
        type: 'WORK_OF_ART',
        position: match.index,
        endPosition: match.index + match[0].length,
        confidence: 0.78
      });
    }
    // Italic markers and "by Author" patterns
    const byPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;
    while ((match = byPattern.exec(text)) !== null) {
      entities.push({
        text: match[1],
        type: 'WORK_OF_ART',
        position: match.index,
        endPosition: match.index + match[1].length,
        confidence: 0.82
      });
    }
    this._entities = entities;
    this._modelType = 'work-of-art-entity';
    return entities;
  }

  /**
   * Detect FACILITY entities (airports, bridges, stadiums, etc.)
   */
  facilityEntity(text: string): Entity[] {
    const entities: Entity[] = [];
    const facilityIndicators = [
      'airport', 'station', 'bridge', 'tunnel', 'stadium', 'arena', 'museum',
      'hospital', 'university', 'college', 'library', 'tower', 'mall', 'park',
      'plaza', 'square', 'memorial', 'center', 'centre', 'hall', 'palace',
      'castle', 'cathedral', 'temple', 'mosque', 'synagogue'
    ];
    const words = text.split(/\s+/);
    let position = 0;
    for (let i = 0; i < words.length; i++) {
      const word = words[i].toLowerCase().replace(/[.,!?;:'"]$/, '');
      if (facilityIndicators.includes(word) && i > 0) {
        let name = words[i];
        let startPos = position;
        let j = i - 1;
        while (j >= 0 && /^[A-Z]/.test(words[j])) {
          name = words[j] + ' ' + name;
          startPos -= words[j].length + 1;
          j--;
        }
        if (name !== words[i]) {
          entities.push({
            text: name,
            type: 'FAC',
            position: startPos,
            endPosition: position + words[i].length,
            confidence: 0.85
          });
        }
      }
      position += words[i].length + 1;
    }
    this._entities = entities;
    this._modelType = 'facility-entity';
    return entities;
  }

  /**
   * Detect PRODUCT entities (specific model names, product numbers)
   */
  productEntity(text: string): Entity[] {
    const entities: Entity[] = [];
    const words = text.split(/\s+/);
    let position = 0;
    const productIndicators = ['model', 'version', 'release', 'product', 'device', 'iphone', 'galaxy', 'pixel'];
    for (let i = 0; i < words.length; i++) {
      const word = words[i].replace(/[.,!?;:'"]$/, '');
      if (/^[A-Z][a-z]*\d+/.test(word) || /\d+[A-Za-z]+/.test(word) || /\bi(Phone|Pad|Pod|Watch|Mac)\b/i.test(word)) {
        entities.push({
          text: word,
          type: 'PRODUCT',
          position,
          endPosition: position + word.length,
          confidence: 0.75
        });
      }
      if (i > 0 && productIndicators.includes(words[i - 1].toLowerCase())) {
        entities.push({
          text: word,
          type: 'PRODUCT',
          position,
          endPosition: position + word.length,
          confidence: 0.8
        });
      }
      position += words[i].length + 1;
    }
    this._entities = entities;
    this._modelType = 'product-entity';
    return entities;
  }

  /**
   * Detect EVENT entities (conferences, festivals, etc.)
   */
  eventEntity(text: string): Entity[] {
    const entities: Entity[] = [];
    const eventWords = ['conference', 'meeting', 'seminar', 'workshop', 'concert', 'festival', 'exhibition', 'summit', 'symposium', 'tournament', 'championship', 'olympics', 'world cup', 'ceremony', 'gala', 'fair', 'forum'];
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
          endPosition: position + words[i].length,
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

  /**
   * Generic rule-based NER using provided regex patterns
   */
  ruleBasedNER(text: string, patterns: { type: string; regex: RegExp }[]): Entity[] {
    const entities: Entity[] = [];
    for (const pattern of patterns) {
      let match;
      const flags = pattern.regex.flags.includes('g') ? pattern.regex.flags : pattern.regex.flags + 'g';
      const regex = new RegExp(pattern.regex.source, flags);
      while ((match = regex.exec(text)) !== null) {
        entities.push({
          text: match[0],
          type: pattern.type,
          position: match.index,
          endPosition: match.index + match[0].length,
          confidence: 0.88
        });
      }
    }
    this._entities = entities;
    this._modelType = 'rule-based';
    return entities;
  }

  /**
   * Gazetteer-based NER using a Map of entity type -> terms
   */
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
            endPosition: idx + term.length,
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

  /**
   * Add a term to a gazetteer at runtime
   */
  addGazetteerTerm(type: string, term: string): void {
    if (!this._gazetteers.has(type)) {
      this._gazetteers.set(type, new Set());
    }
    this._gazetteers.get(type)!.add(term.toLowerCase());
  }

  /**
   * Remove a term from a gazetteer
   */
  removeGazetteerTerm(type: string, term: string): boolean {
    const gazetteer = this._gazetteers.get(type);
    if (!gazetteer) return false;
    return gazetteer.delete(term.toLowerCase());
  }

  /**
   * Extract features for CRF-style sequence tagging
   */
  private _extractCRFFeatures(words: string[]): CRFFeature[] {
    return words.map((word, i) => {
      const prevWord = i > 0 ? words[i - 1] : '<START>';
      const nextWord = i < words.length - 1 ? words[i + 1] : '<END>';
      return {
        word,
        isCapitalized: /^[A-Z]/.test(word),
        isAllCaps: /^[A-Z]+$/.test(word) && word.length > 1,
        isDigit: /^\d+$/.test(word),
        prefix: word.substring(0, Math.min(3, word.length)).toLowerCase(),
        suffix: word.substring(Math.max(0, word.length - 3)).toLowerCase(),
        shape: this._wordShape(word),
        prevWord: prevWord.toLowerCase(),
        nextWord: nextWord.toLowerCase(),
        prevTag: 'O'
      };
    });
  }

  /**
   * Compute word shape (e.g., "Apple" -> "Xxxxx")
   */
  private _wordShape(word: string): string {
    let shape = '';
    for (const ch of word) {
      if (/[A-Z]/.test(ch)) shape += 'X';
      else if (/[a-z]/.test(ch)) shape += 'x';
      else if (/[0-9]/.test(ch)) shape += 'd';
      else shape += ch;
    }
    return shape;
  }

  /**
   * Convert tag between IOB, BILOU, IOBES schemes
   */
  convertTag(tag: string, from: TagScheme, to: TagScheme): string {
    if (from === to) return tag;
    if (tag === 'O') return 'O';
    const parts = tag.split('-');
    if (parts.length !== 2) return tag;
    const prefix = parts[0];
    const entityType = parts[1];

    // Convert to canonical IOB form first
    let canonical: 'B' | 'I' | 'O';
    if (from === 'IOB') {
      canonical = prefix === 'B' ? 'B' : 'I';
    } else if (from === 'BILOU') {
      if (prefix === 'U') canonical = 'B';
      else if (prefix === 'L') canonical = 'I';
      else if (prefix === 'B') canonical = 'B';
      else canonical = 'I';
    } else { // IOBES
      if (prefix === 'B') canonical = 'B';
      else if (prefix === 'E' || prefix === 'S') canonical = 'I';
      else canonical = 'I';
    }

    // Convert from canonical to target
    if (to === 'IOB') {
      return canonical === 'B' ? `B-${entityType}` : `I-${entityType}`;
    } else if (to === 'BILOU') {
      // Simplified conversion - assume each B/I is a separate entity
      return canonical === 'B' ? `U-${entityType}` : `L-${entityType}`;
    } else { // IOBES
      return canonical === 'B' ? `S-${entityType}` : `E-${entityType}`;
    }
  }

  /**
   * Apply IOB tagging using gazetteer + heuristics
   */
  iobTagging(text: string): TaggedToken[] {
    const tokens = this._tokenize(text);
    const result: TaggedToken[] = [];
    let position = 0;
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const lower = token.toLowerCase();
      let tag = 'O';
      for (const [type, terms] of this._gazetteers) {
        if (terms.has(lower)) {
          // Check if previous token had same type to extend entity
          const prev = i > 0 ? result[i - 1] : null;
          if (prev && prev.tag === `I-${type}`) {
            tag = `I-${type}`;
          } else {
            tag = `B-${type}`;
          }
          break;
        }
      }
      if (tag === 'O' && /^[A-Z][a-z]+$/.test(token) && token.length > 2) {
        tag = 'B-PERSON';
      }
      result.push({ token, tag, position });
      position += token.length + 1;
    }
    return result;
  }

  /**
   * Apply BILOU tagging scheme
   */
  bilouTagging(text: string): TaggedToken[] {
    const iobTokens = this.iobTagging(text);
    return iobTokens.map(t => ({
      ...t,
      tag: this.convertTag(t.tag, 'IOB', 'BILOU')
    }));
  }

  /**
   * Apply IOBES tagging scheme
   */
  iobesTagging(text: string): TaggedToken[] {
    const iobTokens = this.iobTagging(text);
    return iobTokens.map(t => ({
      ...t,
      tag: this.convertTag(t.tag, 'IOB', 'IOBES')
    }));
  }

  /**
   * Train a simple CRF model using perceptron-style updates
   */
  trainCRF(samples: { tokens: string[]; tags: string[] }[], iterations: number = 10): void {
    this._crfWeights = { emission: new Map(), transition: new Map() };
    for (let iter = 0; iter < iterations; iter++) {
      for (const sample of samples) {
        const features = this._extractCRFFeatures(sample.tokens);
        const predicted = this._viterbiDecode(features);
        for (let i = 0; i < sample.tags.length; i++) {
          const correct = sample.tags[i];
          const pred = predicted[i];
          if (correct !== pred) {
            this._updateWeights(features[i], correct, 1);
            this._updateWeights(features[i], pred, -1);
            if (i > 0) {
              this._updateTransition(sample.tags[i - 1], correct, 1);
              this._updateTransition(predicted[i - 1] || 'O', pred, -1);
            }
          }
        }
      }
    }
    this._crfTrained = true;
  }

  /**
   * Update emission weights for perceptron training
   */
  private _updateWeights(feature: CRFFeature, tag: string, delta: number): void {
    const key = this._featureKey(feature);
    if (!this._crfWeights.emission.has(key)) {
      this._crfWeights.emission.set(key, new Map());
    }
    const tagMap = this._crfWeights.emission.get(key)!;
    tagMap.set(tag, (tagMap.get(tag) || 0) + delta);
  }

  /**
   * Update transition weights for perceptron training
   */
  private _updateTransition(prevTag: string, currTag: string, delta: number): void {
    if (!this._crfWeights.transition.has(prevTag)) {
      this._crfWeights.transition.set(prevTag, new Map());
    }
    const tagMap = this._crfWeights.transition.get(prevTag)!;
    tagMap.set(currTag, (tagMap.get(currTag) || 0) + delta);
  }

  /**
   * Build a feature key for a token
   */
  private _featureKey(feature: CRFFeature): string {
    return [
      `w=${feature.word.toLowerCase()}`,
      `cap=${feature.isCapitalized}`,
      `all=${feature.isAllCaps}`,
      `dig=${feature.isDigit}`,
      `pre=${feature.prefix}`,
      `suf=${feature.suffix}`,
      `shp=${feature.shape}`,
      `pw=${feature.prevWord}`,
      `nw=${feature.nextWord}`
    ].join('|');
  }

  /**
   * Viterbi decoding for CRF inference
   */
  private _viterbiDecode(features: CRFFeature[]): string[] {
    if (!this._crfTrained || features.length === 0) {
      return features.map(() => 'O');
    }
    const tags = ['O', 'B-PERSON', 'I-PERSON', 'B-ORG', 'I-ORG', 'B-GPE', 'I-GPE', 'B-DATE', 'I-DATE'];
    const V: Map<string, number>[] = [new Map()];
    const bp: Map<string, string>[] = [new Map()];
    // Initialize
    const firstFeature = features[0];
    const firstKey = this._featureKey(firstFeature);
    for (const tag of tags) {
      const emit = this._crfWeights.emission.get(firstKey)?.get(tag) || 0;
      const trans = this._crfWeights.transition.get('START')?.get(tag) || 0;
      V[0].set(tag, emit + trans);
    }
    // Forward pass
    for (let t = 1; t < features.length; t++) {
      V[t] = new Map();
      bp[t] = new Map();
      const key = this._featureKey(features[t]);
      for (const curr of tags) {
        const emit = this._crfWeights.emission.get(key)?.get(curr) || 0;
        let best = -Infinity;
        let bestPrev = 'O';
        for (const prev of tags) {
          const prevScore = V[t - 1].get(prev) || -Infinity;
          const trans = this._crfWeights.transition.get(prev)?.get(curr) || 0;
          const score = prevScore + emit + trans;
          if (score > best) {
            best = score;
            bestPrev = prev;
          }
        }
        V[t].set(curr, best);
        bp[t].set(curr, bestPrev);
      }
    }
    // Backtrack
    const result: string[] = new Array(features.length);
    let lastTag = 'O';
    let bestScore = -Infinity;
    const lastV = V[features.length - 1];
    for (const [tag, score] of lastV) {
      if (score > bestScore) {
        bestScore = score;
        lastTag = tag;
      }
    }
    result[features.length - 1] = lastTag;
    for (let t = features.length - 2; t >= 0; t--) {
      lastTag = bp[t + 1].get(lastTag) || 'O';
      result[t] = lastTag;
    }
    return result;
  }

  /**
   * Predict tags using trained CRF model
   */
  crfPredict(text: string): TaggedToken[] {
    const tokens = this._tokenize(text);
    const features = this._extractCRFFeatures(tokens);
    const tags = this._viterbiDecode(features);
    let position = 0;
    return tokens.map((token, i) => {
      const t = { token, tag: tags[i], position };
      position += token.length + 1;
      return t;
    });
  }

  /**
   * BERT-based NER (simulated - returns entities based on heuristics + features)
   */
  bertNER(text: string, model: { name: string; layers?: number }): Entity[] {
    const tokens = this._tokenize(text);
    const features = this._extractCRFFeatures(tokens);
    const entities: Entity[] = [];
    let position = 0;
    let currentEntity: { text: string; type: string; startPos: number } | null = null;
    const bertConfidence = 0.92;
    for (let i = 0; i < tokens.length; i++) {
      const feat = features[i];
      let predictedType: string | null = null;
      // Simulated BERT prediction based on features
      if (feat.isCapitalized && !feat.isAllCaps) {
        const lower = tokens[i].toLowerCase();
        for (const [type, terms] of this._gazetteers) {
          if (terms.has(lower)) {
            predictedType = type;
            break;
          }
        }
        if (!predictedType) {
          if (/^\d{4}$/.test(tokens[i])) predictedType = 'DATE';
          else if (/^\d+([.,]\d+)?$/.test(tokens[i])) predictedType = 'CARDINAL';
          else if (feat.prefix === 'jan' || feat.prefix === 'feb' || feat.prefix === 'mar') predictedType = 'DATE';
          else predictedType = 'PERSON';
        }
      } else if (feat.isDigit) {
        if (/^\d{4}$/.test(tokens[i])) predictedType = 'DATE';
        else predictedType = 'CARDINAL';
      }
      if (predictedType) {
        if (currentEntity && currentEntity.type === predictedType) {
          currentEntity.text += ' ' + tokens[i];
        } else {
          if (currentEntity) {
            entities.push({
              text: currentEntity.text,
              type: currentEntity.type,
              position: currentEntity.startPos,
              endPosition: position,
              confidence: bertConfidence
            });
          }
          currentEntity = { text: tokens[i], type: predictedType, startPos: position };
        }
      } else {
        if (currentEntity) {
          entities.push({
            text: currentEntity.text,
            type: currentEntity.type,
            position: currentEntity.startPos,
            endPosition: position,
            confidence: bertConfidence
          });
          currentEntity = null;
        }
      }
      position += tokens[i].length + 1;
    }
    if (currentEntity) {
      entities.push({
        text: currentEntity.text,
        type: currentEntity.type,
        position: currentEntity.startPos,
        endPosition: position,
        confidence: bertConfidence
      });
    }
    this._entities = entities;
    this._modelType = `bert-${model.name}`;
    return entities;
  }

  /**
   * spaCy-style EntityRuler - pattern-based NER with priority
   */
  entityRuler(text: string, patterns: { label: string; pattern: string | RegExp; id?: string }[]): Entity[] {
    const entities: Entity[] = [];
    for (const { label, pattern, id } of patterns) {
      if (typeof pattern === 'string') {
        const lower = pattern.toLowerCase();
        let pos = 0;
        while (pos < text.length) {
          const idx = text.toLowerCase().indexOf(lower, pos);
          if (idx === -1) break;
          entities.push({
            text: text.substring(idx, idx + pattern.length),
            type: label,
            position: idx,
            endPosition: idx + pattern.length,
            confidence: 0.95,
            wikiId: id
          });
          pos = idx + pattern.length;
        }
      } else {
        const regex = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
        let match;
        while ((match = regex.exec(text)) !== null) {
          entities.push({
            text: match[0],
            type: label,
            position: match.index,
            endPosition: match.index + match[0].length,
            confidence: 0.95,
            wikiId: id
          });
        }
      }
    }
    // Resolve overlaps: keep the longer match
    entities.sort((a, b) => a.position - b.position || (b.endPosition! - b.position) - (a.endPosition! - a.position));
    const filtered: Entity[] = [];
    let lastEnd = -1;
    for (const e of entities) {
      if (e.position >= lastEnd) {
        filtered.push(e);
        lastEnd = e.endPosition || (e.position + e.text.length);
      }
    }
    this._entities = filtered;
    this._modelType = 'entity-ruler';
    return filtered;
  }

  /**
   * Entity Linking - link detected entities to knowledge graph entries
   */
  entityLinking(entities: Entity[]): EntityLink[] {
    const links: EntityLink[] = [];
    for (const entity of entities) {
      const candidates = this._findCandidates(entity.text);
      let best: EntityLink | null = null;
      for (const candidate of candidates) {
        const score = this._linkScore(entity, candidate);
        if (!best || score > best.score) {
          best = {
            entity,
            candidate: candidate.key,
            score,
            source: 'knowledge-graph'
          };
        }
      }
      if (best) {
        links.push(best);
        this._entityLinker.set(entity.text, this._entityLinker.get(entity.text) || [best]);
      }
    }
    return links;
  }

  /**
   * Find candidate knowledge graph entries for an entity mention
   */
  private _findCandidates(mention: string): { key: string; entry: { type: string; aliases: string[]; description: string } }[] {
    const candidates: { key: string; entry: { type: string; aliases: string[]; description: string } }[] = [];
    const lower = mention.toLowerCase();
    for (const [key, entry] of this._knowledgeGraph) {
      if (key.toLowerCase() === lower) {
        candidates.push({ key, entry });
        continue;
      }
      for (const alias of entry.aliases) {
        if (alias.toLowerCase() === lower) {
          candidates.push({ key, entry });
          break;
        }
      }
      if (entry.description.toLowerCase().includes(lower)) {
        candidates.push({ key, entry });
      }
    }
    return candidates;
  }

  /**
   * Compute a link score between entity mention and candidate
   */
  private _linkScore(entity: Entity, candidate: { key: string; entry: { type: string; aliases: string[]; description: string } }): number {
    let score = 0;
    if (candidate.entry.type === entity.type) score += 0.4;
    if (candidate.entry.aliases.some(a => a.toLowerCase() === entity.text.toLowerCase())) score += 0.4;
    if (candidate.entry.description.toLowerCase().includes(entity.text.toLowerCase())) score += 0.2;
    score += entity.confidence * 0.2;
    return Math.min(1, score);
  }

  /**
   * Entity Disambiguation - resolve multiple link candidates
   */
  disambiguate(entity: Entity, candidates: string[], context: string): string {
    let bestCandidate = candidates[0] || 'unknown';
    let bestScore = -1;
    for (const candidate of candidates) {
      const entry = this._knowledgeGraph.get(candidate);
      if (!entry) continue;
      let score = 0;
      // Context overlap
      const descWords = entry.description.toLowerCase().split(/\s+/);
      const contextWords = context.toLowerCase().split(/\s+/);
      const overlap = descWords.filter(w => contextWords.includes(w)).length;
      score += overlap * 0.1;
      // Type match
      if (entry.type === entity.type) score += 0.3;
      // Alias exact match
      if (entry.aliases.some(a => a.toLowerCase() === entity.text.toLowerCase())) score += 0.5;
      if (score > bestScore) {
        bestScore = score;
        bestCandidate = candidate;
      }
    }
    return bestCandidate;
  }

  /**
   * Normalize entity text (canonical form)
   */
  normalizeEntity(entity: Entity): string {
    let normalized = entity.text.trim();
    // Remove punctuation
    normalized = normalized.replace(/[.,!?;:'"]/g, '');
    // Title case for proper nouns
    if (['PERSON', 'ORG', 'GPE', 'NORP', 'FAC', 'PRODUCT', 'EVENT', 'WORK_OF_ART'].includes(entity.type)) {
      normalized = normalized.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }
    // Uppercase for currencies
    if (entity.type === 'CURRENCY' || entity.type === 'LANGUAGE') {
      normalized = normalized.toUpperCase();
    }
    return normalized;
  }

  /**
   * Canonicalize entities (resolve to canonical forms)
   */
  canonicalize(entities: Entity[]): Entity[] {
    return entities.map(e => ({
      ...e,
      normalized: this.normalizeEntity(e)
    }));
  }

  /**
   * Improved coreference resolution with proper noun tracking
   */
  coreference(text: string): { mention: string; referent: string; position: number }[] {
    const results: { mention: string; referent: string; position: number }[] = [];
    const sentences = text.split(/(?<=[.!?])\s+/);
    const properNouns: { text: string; gender: 'male' | 'female' | 'unknown' | 'plural' }[] = [];
    for (const sentence of sentences) {
      const words = sentence.split(/\s+/);
      for (let i = 0; i < words.length; i++) {
        const clean = words[i].replace(/[.,!?;:'"]$/, '');
        if (/^[A-Z][a-z]+$/.test(clean) && clean.length > 2) {
          const lower = clean.toLowerCase();
          const maleNames = this._gazetteers.get('PERSON');
          let gender: 'male' | 'female' | 'unknown' | 'plural' = 'unknown';
          if (maleNames && maleNames.has(lower)) {
            // Simple gender guesser based on name endings
            if (lower.endsWith('a') || lower.endsWith('e') || lower.endsWith('ia')) gender = 'female';
            else gender = 'male';
          }
          properNouns.push({ text: clean, gender });
        }
      }
    }
    const pronouns = {
      male: ['he', 'him', 'his'],
      female: ['she', 'her', 'hers'],
      plural: ['they', 'them', 'their'],
      unknown: ['it', 'its']
    };
    let position = 0;
    let lastReferent: { text: string; gender: 'male' | 'female' | 'unknown' | 'plural' } | null = null;
    for (const sentence of sentences) {
      const words = sentence.split(/\s+/);
      for (let i = 0; i < words.length; i++) {
        const word = words[i].toLowerCase().replace(/[.,!?;:'"]$/, '');
        let pronounType: 'male' | 'female' | 'unknown' | 'plural' | null = null;
        if (pronouns.male.includes(word)) pronounType = 'male';
        else if (pronouns.female.includes(word)) pronounType = 'female';
        else if (pronouns.plural.includes(word)) pronounType = 'plural';
        else if (pronouns.unknown.includes(word)) pronounType = 'unknown';
        if (pronounType) {
          // Find best matching referent by gender
          let referent = properNouns.find(p => p.gender === pronounType);
          if (!referent && lastReferent) referent = lastReferent;
          if (referent) {
            results.push({
              mention: words[i],
              referent: referent.text,
              position
            });
            lastReferent = referent;
          }
        }
        position += words[i].length + 1;
      }
    }
    return results;
  }

  /**
   * Build coreference chains - group mentions that refer to the same entity
   */
  coreferenceChains(text: string): CoreferenceChain[] {
    const chains: CoreferenceChain[] = [];
    const mentions = this.coreference(text);
    const grouped = new Map<string, { text: string; position: number; type: string }[]>();
    for (const m of mentions) {
      if (!grouped.has(m.referent)) grouped.set(m.referent, []);
      grouped.get(m.referent)!.push({ text: m.referent, position: 0, type: 'proper' });
      grouped.get(m.referent)!.push({ text: m.mention, position: m.position, type: 'pronoun' });
    }
    for (const [representative, mentions] of grouped) {
      chains.push({ representative, mentions });
    }
    return chains;
  }

  /**
   * Relation extraction with configurable patterns
   */
  relationExtraction(text: string, model: { type: string }): { from: string; to: string; type: string; confidence: number }[] {
    const relations: { from: string; to: string; type: string; confidence: number }[] = [];
    const entities = this.recognize(text, model);
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const e1 = entities[i];
        const e2 = entities[j];
        const between = text.substring(e1.position + e1.text.length, e2.position).toLowerCase();
        for (const rp of this._relationPatterns) {
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

  /**
   * Extract relations using a transformer-style model (simulated)
   */
  relationExtractionBERT(text: string, model: { name: string }): { from: string; to: string; type: string; confidence: number }[] {
    const entities = this.bertNER(text, model);
    return this.relationExtraction(text, { type: 'relation-bert' });
  }

  /**
   * Combined NER + relation extraction pipeline
   */
  pipeline(text: string, options: { nerModel?: { type: string }; extractRelations?: boolean } = {}): NERResult {
    const nerModel = options.nerModel || { type: 'combined' };
    const entities = this.recognize(text, nerModel);
    const relations = options.extractRelations !== false
      ? this.relationExtraction(text, { type: 'pipeline' })
      : [];
    const tags = this.iobTagging(text);
    const result: NERResult = { entities, relations, tags };
    this._lastResult = result;
    this._entities = entities;
    this._relations = relations;
    return result;
  }

  /**
   * Batch processing for multiple texts
   */
  batchRecognize(texts: string[], model: { type: string }): Entity[][] {
    return texts.map(t => this.recognize(t, model));
  }

  /**
   * Filter entities by type
   */
  filterByType(entities: Entity[], types: string[]): Entity[] {
    return entities.filter(e => types.includes(e.type));
  }

  /**
   * Filter entities by confidence threshold
   */
  filterByConfidence(entities: Entity[], threshold: number): Entity[] {
    return entities.filter(e => e.confidence >= threshold);
  }

  /**
   * Remove duplicate entities (same text and type)
   */
  deduplicate(entities: Entity[]): Entity[] {
    const seen = new Set<string>();
    const result: Entity[] = [];
    for (const e of entities) {
      const key = `${e.text}|${e.type}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(e);
      }
    }
    return result;
  }

  /**
   * Merge overlapping entities
   */
  mergeOverlaps(entities: Entity[]): Entity[] {
    if (entities.length === 0) return [];
    const sorted = [...entities].sort((a, b) => a.position - b.position);
    const result: Entity[] = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      const prev = result[result.length - 1];
      const curr = sorted[i];
      const prevEnd = prev.endPosition || (prev.position + prev.text.length);
      if (curr.position < prevEnd) {
        // Overlap - keep the one with higher confidence
        if (curr.confidence > prev.confidence) {
          result[result.length - 1] = curr;
        }
      } else {
        result.push(curr);
      }
    }
    return result;
  }

  /**
   * Compute NER statistics
   */
  statistics(text?: string): NERStat {
    const byType: Record<string, number> = {};
    let totalConfidence = 0;
    for (const e of this._entities) {
      byType[e.type] = (byType[e.type] || 0) + 1;
      totalConfidence += e.confidence;
    }
    const totalEntities = this._entities.length;
    const avgConfidence = totalEntities > 0 ? totalConfidence / totalEntities : 0;
    const coverage = text && text.length > 0
      ? this._entities.reduce((sum, e) => sum + e.text.length, 0) / text.length
      : 0;
    return { totalEntities, byType, avgConfidence, coverage };
  }

  /**
   * Evaluate NER predictions against gold standard
   */
  evaluate(predictions: Entity[], gold: Entity[]): {
    precision: number;
    recall: number;
    f1: number;
    correct: number;
    predicted: number;
    goldCount: number;
  } {
    const predSet = new Set(predictions.map(e => `${e.position}|${e.text}|${e.type}`));
    const goldSet = new Set(gold.map(e => `${e.position}|${e.text}|${e.type}`));
    let correct = 0;
    for (const key of predSet) {
      if (goldSet.has(key)) correct++;
    }
    const precision = predictions.length > 0 ? correct / predictions.length : 0;
    const recall = gold.length > 0 ? correct / gold.length : 0;
    const f1 = precision + recall > 0 ? 2 * precision * recall / (precision + recall) : 0;
    return {
      precision,
      recall,
      f1,
      correct,
      predicted: predictions.length,
      goldCount: gold.length
    };
  }

  /**
   * Export entities to JSON
   */
  exportJSON(entities: Entity[]): string {
    return JSON.stringify(entities, null, 2);
  }

  /**
   * Import entities from JSON
   */
  importJSON(json: string): Entity[] {
    try {
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed)) {
        this._entities = parsed as Entity[];
        return this._entities;
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Export to CoNLL format (token tag pairs)
   */
  exportCoNLL(text: string): string {
    const tags = this.iobTagging(text);
    const lines: string[] = [];
    for (const t of tags) {
      lines.push(`${t.token}\t${t.tag}`);
    }
    return lines.join('\n');
  }

  /**
   * Export to BIO format with sentence boundaries
   */
  exportBIO(text: string): string {
    const sentences = text.split(/(?<=[.!?])\s+/);
    const lines: string[] = [];
    for (const sentence of sentences) {
      const tags = this.iobTagging(sentence);
      for (const t of tags) {
        lines.push(`${t.token}\t${t.tag}`);
      }
      lines.push('');
    }
    return lines.join('\n');
  }

  /**
   * Import tagged data from CoNLL format
   */
  importCoNLL(conllText: string): { tokens: string[]; tags: string[] }[] {
    const samples: { tokens: string[]; tags: string[] }[] = [];
    let tokens: string[] = [];
    let tags: string[] = [];
    for (const line of conllText.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) {
        if (tokens.length > 0) {
          samples.push({ tokens, tags });
          tokens = [];
          tags = [];
        }
        continue;
      }
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 2) {
        tokens.push(parts[0]);
        tags.push(parts[1]);
      }
    }
    if (tokens.length > 0) samples.push({ tokens, tags });
    return samples;
  }

  /**
   * Annotate text with entity markers (e.g., "Apple [ORG:Apple] released...")
   */
  annotate(text: string, entities: Entity[]): string {
    let result = '';
    let lastEnd = 0;
    const sorted = [...entities].sort((a, b) => a.position - b.position);
    for (const e of sorted) {
      result += text.substring(lastEnd, e.position);
      result += `[${e.type}:${e.text}]`;
      lastEnd = e.position + e.text.length;
    }
    result += text.substring(lastEnd);
    return result;
  }

  /**
   * Highlight entities with HTML-like markup
   */
  highlight(text: string, entities: Entity[]): string {
    let result = '';
    let lastEnd = 0;
    const sorted = [...entities].sort((a, b) => a.position - b.position);
    for (const e of sorted) {
      result += text.substring(lastEnd, e.position);
      result += `<span class="entity ${e.type.toLowerCase()}" data-confidence="${e.confidence.toFixed(2)}">${e.text}</span>`;
      lastEnd = e.position + e.text.length;
    }
    result += text.substring(lastEnd);
    return result;
  }

  /**
   * Extract entities of all types using a combined pipeline
   */
  extractAll(text: string): Entity[] {
    const all: Entity[] = [];
    all.push(...this.personEntity(text));
    all.push(...this.orgEntity(text));
    all.push(...this.locationEntity(text));
    all.push(...this.dateEntity(text));
    all.push(...this.timeEntity(text));
    all.push(...this.moneyEntity(text));
    all.push(...this.percentEntity(text));
    all.push(...this.quantityEntity(text));
    all.push(...this.languageEntity(text));
    all.push(...this.lawEntity(text));
    all.push(...this.currencyEntity(text));
    all.push(...this.ordinalEntity(text));
    all.push(...this.cardinalEntity(text));
    all.push(...this.norpEntity(text));
    all.push(...this.workOfArtEntity(text));
    all.push(...this.facilityEntity(text));
    all.push(...this.productEntity(text));
    all.push(...this.eventEntity(text));
    const dedup = this.deduplicate(all);
    this._entities = this.mergeOverlaps(dedup);
    this._modelType = 'combined';
    return this._entities;
  }

  /**
   * Tokenize text preserving word boundaries
   */
  private _tokenize(text: string): string[] {
    return text.match(/\b[\w'-]+\b/g) || text.split(/\s+/);
  }

  /**
   * Check if a capitalized word is at sentence start
   */
  private _isSentenceStart(words: string[], idx: number): boolean {
    if (idx === 0) return true;
    const prev = words[idx - 1];
    return /[.!?]$/.test(prev);
  }

  /**
   * Add an entry to the knowledge graph
   */
  addKnowledgeEntry(key: string, type: string, aliases: string[], description: string): void {
    this._knowledgeGraph.set(key, { type, aliases, description });
  }

  /**
   * Remove an entry from the knowledge graph
   */
  removeKnowledgeEntry(key: string): boolean {
    return this._knowledgeGraph.delete(key);
  }

  /**
   * Lookup entity in the knowledge graph
   */
  lookupKnowledge(key: string): { type: string; aliases: string[]; description: string } | undefined {
    return this._knowledgeGraph.get(key);
  }

  /**
   * Add a custom relation pattern
   */
  addRelationPattern(pattern: RegExp, type: string): void {
    this._relationPatterns.push({ pattern, type });
  }

  /**
   * Clear all relation patterns
   */
  clearRelationPatterns(): void {
    this._relationPatterns = [];
  }

  /**
   * Compute similarity between two entity mentions (string similarity)
   */
  entitySimilarity(e1: string, e2: string): number {
    const s1 = e1.toLowerCase();
    const s2 = e2.toLowerCase();
    if (s1 === s2) return 1;
    const set1 = new Set(s1.split(/\s+/));
    const set2 = new Set(s2.split(/\s+/));
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Find similar entities in the entity list
   */
  findSimilar(entity: Entity, threshold: number = 0.5): Entity[] {
    return this._entities.filter(e => {
      if (e.text === entity.text) return false;
      return this.entitySimilarity(e.text, entity.text) >= threshold;
    });
  }

  /**
   * Convert entities to a feature vector (one-hot of types)
   */
  toFeatureVector(entities: Entity[], types: string[]): number[] {
    const vector = new Array(types.length).fill(0);
    for (const e of entities) {
      const idx = types.indexOf(e.type);
      if (idx >= 0) vector[idx] += 1;
    }
    return vector;
  }

  /**
   * Generate a simple hash (deterministic random helper)
   */
  private _hash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Serialize the entire NER state to JSON
   */
  serialize(): string {
    return JSON.stringify({
      entities: this._entities,
      relations: this._relations,
      modelType: this._modelType,
      tagScheme: this._tagScheme,
      gazetteers: Array.from(this._gazetteers.entries()).map(([k, v]) => [k, Array.from(v)])
    });
  }

  /**
   * Deserialize NER state from JSON
   */
  deserialize(json: string): void {
    try {
      const obj = JSON.parse(json);
      this._entities = obj.entities || [];
      this._relations = obj.relations || [];
      this._modelType = obj.modelType || 'default';
      this._tagScheme = obj.tagScheme || 'IOB';
      if (obj.gazetteers) {
        for (const [type, terms] of obj.gazetteers) {
          this._gazetteers.set(type, new Set(terms));
        }
      }
    } catch {
      // Ignore deserialization errors
    }
  }

  /**
   * Wrap results in a DataPacket for transport
   */
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

  /**
   * Reset all state
   */
  reset(): void {
    this._entities = [];
    this._relations = [];
    this._counter = 0;
    this._modelType = 'default';
    this._lastResult = null;
    this._crfTrained = false;
    this._crfWeights = { emission: new Map(), transition: new Map() };
    this._entityLinker.clear();
    this._tagScheme = 'IOB';
  }
}
