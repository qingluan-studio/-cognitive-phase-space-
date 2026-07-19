import { DataPacket } from '../shared/types';

export interface ParsedQuery {
  originalQuery: string;
  normalizedQuery: string;
  tokens: string[];
  intent: QueryIntent;
  entities: QueryEntity[];
  categories: string[];
  rewritingSuggestions: string[];
  expandedTerms: string[];
  queryLength: number;
  complexity: number;
}

export type QueryIntent = 
  | 'informational' 
  | 'navigational' 
  | 'transactional' 
  | 'commercial' 
  | 'ambiguous';

export interface QueryEntity {
  text: string;
  type: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
}

export interface QueryRewrite {
  originalQuery: string;
  rewrittenQuery: string;
  rewriteType: RewriteType;
  confidence: number;
}

export type RewriteType = 
  | 'spelling_correction' 
  | 'synonym_expansion' 
  | 'stemming' 
  | 'query_splitting' 
  | 'query_combination'
  | 'contextual_enhancement';

export interface QueryExpansionResult {
  originalTerms: string[];
  expandedTerms: string[];
  expansionMethod: ExpansionMethod;
  synonyms: Map<string, string[]>;
}

export type ExpansionMethod = 
  | 'thesaurus' 
  | 'relevance_feedback' 
  | 'pseudo_relevance' 
  | 'word_embedding' 
  | 'co_occurrence';

export class QueryUnderstanding {
  private _parsedQueries: ParsedQuery[] = [];
  private _queryRewrites: QueryRewrite[] = [];
  private _synonymDictionary: Map<string, string[]> = new Map();
  private _stopwords: Set<string> = new Set();
  private _entityPatterns: Map<string, RegExp> = new Map();
  private _intentPatterns: Map<QueryIntent, RegExp[]> = new Map();
  private _counter: number = 0;
  private _lastResult: ParsedQuery | null = null;
  private _maxExpansionTerms: number = 10;
  private _minTermLength: number = 2;

  constructor() {
    this._initDefaultStopwords();
    this._initEntityPatterns();
    this._initIntentPatterns();
    this._initSynonymDictionary();
  }

  private _initDefaultStopwords(): void {
    const defaultStopwords = [
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'can', 'shall', 'of', 'in', 'to',
      'for', 'with', 'on', 'at', 'from', 'by', 'about', 'as', 'into',
      'through', 'during', 'before', 'after', 'above', 'below', 'between',
      'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both', 'either',
      'neither', 'each', 'every', 'all', 'any', 'few', 'more', 'most',
      'other', 'some', 'such', 'no', 'only', 'own', 'same', 'than', 'too',
      'very', 'just', 'because', 'if', 'when', 'where', 'how', 'what',
      'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'i', 'you',
      'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
      'my', 'your', 'his', 'its', 'our', 'their', 'mine', 'yours', 'hers',
      'ours', 'theirs'
    ];
    defaultStopwords.forEach(word => this._stopwords.add(word));
  }

  private _initEntityPatterns(): void {
    this._entityPatterns.set('email', /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g);
    this._entityPatterns.set('url', /https?:\/\/[^\s]+/g);
    this._entityPatterns.set('phone', /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g);
    this._entityPatterns.set('date', /\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b/g);
    this._entityPatterns.set('number', /\b\d+(\.\d+)?\b/g);
    this._entityPatterns.set('price', /\$\d+(\.\d{2})?/g);
  }

  private _initIntentPatterns(): void {
    this._intentPatterns.set('informational', [
      /\b(what|who|where|when|why|how|which|information|about|define|meaning)\b/i,
      /\b(history|background|overview|tutorial|guide|documentation)\b/i
    ]);

    this._intentPatterns.set('navigational', [
      /\b(go to|visit|find|locate|address|website|site|page)\b/i,
      /^[a-zA-Z0-9][-a-zA-Z0-9]{0,62}\.[a-zA-Z]{2,}$/
    ]);

    this._intentPatterns.set('transactional', [
      /\b(buy|purchase|order|download|subscribe|register|sign up|login|checkout)\b/i,
      /\b(price|cost|discount|coupon|deal|offer)\b/i
    ]);

    this._intentPatterns.set('commercial', [
      /\b(best|top|review|compare|comparison|vs|versus)\b/i,
      /\b(recommended|recommendation|rating|test|benchmark)\b/i
    ]);
  }

  private _initSynonymDictionary(): void {
    const synonyms: [string, string[]][] = [
      ['computer', ['pc', 'desktop', 'laptop', 'machine', 'workstation']],
      ['software', ['program', 'application', 'app', 'tool', 'utility']],
      ['search', ['find', 'lookup', 'query', 'seek', 'explore']],
      ['information', ['data', 'knowledge', 'details', 'facts', 'content']],
      ['fast', ['quick', 'rapid', 'swift', 'speedy', 'efficient']],
      ['important', ['significant', 'crucial', 'essential', 'key', 'vital']],
      ['improve', ['enhance', 'optimize', 'boost', 'increase', 'upgrade']],
      ['learn', ['study', 'understand', 'discover', 'educate', 'acquire']],
      ['problem', ['issue', 'challenge', 'difficulty', 'trouble', 'obstacle']],
      ['solution', ['answer', 'fix', 'resolution', 'approach', 'method']]
    ];
    for (const [term, syns] of synonyms) {
      this._synonymDictionary.set(term, syns);
    }
  }

  get parsedQueries(): ParsedQuery[] {
    return this._parsedQueries;
  }

  get queryRewrites(): QueryRewrite[] {
    return this._queryRewrites;
  }

  get synonymDictionary(): Map<string, string[]> {
    return this._synonymDictionary;
  }

  get lastResult(): ParsedQuery | null {
    return this._lastResult;
  }

  get maxExpansionTerms(): number {
    return this._maxExpansionTerms;
  }

  parse(query: string): ParsedQuery {
    const normalizedQuery = this._normalizeQuery(query);
    const tokens = this._tokenize(normalizedQuery);
    const intent = this._detectIntent(query, tokens);
    const entities = this._extractEntities(query);
    const categories = this._categorizeQuery(tokens, intent);
    const rewritingSuggestions = this._generateRewriteSuggestions(query, tokens);
    const expandedTerms = this._expandQuery(tokens);
    const complexity = this._calculateComplexity(query, tokens, entities);

    const parsedQuery: ParsedQuery = {
      originalQuery: query,
      normalizedQuery,
      tokens,
      intent,
      entities,
      categories,
      rewritingSuggestions,
      expandedTerms,
      queryLength: query.length,
      complexity
    };

    this._parsedQueries.push(parsedQuery);
    this._lastResult = parsedQuery;
    return parsedQuery;
  }

  private _normalizeQuery(query: string): string {
    let normalized = query.toLowerCase().trim();
    normalized = normalized.replace(/\s+/g, ' ');
    normalized = normalized.replace(/[^\w\s@#$%&*()\-+='":,.?!/]/g, '');
    return normalized;
  }

  private _tokenize(query: string): string[] {
    const words = query.match(/[\w']+/g) || [];
    return words.filter(w => w.length >= this._minTermLength);
  }

  private _detectIntent(query: string, tokens: string[]): QueryIntent {
    const intentScores: Map<QueryIntent, number> = new Map();
    const intents: QueryIntent[] = ['informational', 'navigational', 'transactional', 'commercial'];

    for (const intent of intents) {
      let score = 0;
      const patterns = this._intentPatterns.get(intent) || [];
      for (const pattern of patterns) {
        const matches = query.match(pattern);
        if (matches) {
          score += matches.length * 2;
        }
      }
      intentScores.set(intent, score);
    }

    if (tokens.length === 1) {
      intentScores.set('navigational', (intentScores.get('navigational') || 0) + 1);
    }

    if (tokens.length >= 5) {
      intentScores.set('informational', (intentScores.get('informational') || 0) + 1);
    }

    let maxScore = 0;
    let bestIntent: QueryIntent = 'ambiguous';
    for (const [intent, score] of intentScores) {
      if (score > maxScore) {
        maxScore = score;
        bestIntent = intent;
      }
    }

    if (maxScore === 0) {
      bestIntent = 'ambiguous';
    }

    return bestIntent;
  }

  private _extractEntities(query: string): QueryEntity[] {
    const entities: QueryEntity[] = [];

    for (const [type, pattern] of this._entityPatterns) {
      const matches = query.matchAll(pattern);
      for (const match of matches) {
        if (match.index !== undefined) {
          entities.push({
            text: match[0],
            type,
            confidence: 0.9,
            startIndex: match.index,
            endIndex: match.index + match[0].length
          });
        }
      }
    }

    const capitalizedWords = query.match(/\b[A-Z][a-z]+\b/g);
    if (capitalizedWords) {
      for (const word of capitalizedWords) {
        const index = query.indexOf(word);
        if (index !== -1 && !entities.some(e => e.text === word)) {
          entities.push({
            text: word,
            type: 'named_entity',
            confidence: 0.6,
            startIndex: index,
            endIndex: index + word.length
          });
        }
      }
    }

    return entities.sort((a, b) => a.startIndex - b.startIndex);
  }

  private _categorizeQuery(tokens: string[], intent: QueryIntent): string[] {
    const categories: string[] = [];
    const contentTokens = tokens.filter(t => !this._stopwords.has(t));

    const techTerms = ['computer', 'software', 'hardware', 'programming', 'code', 'developer', 'technology', 'internet', 'web', 'digital'];
    const businessTerms = ['business', 'company', 'market', 'finance', 'investment', 'revenue', 'profit', 'startup', 'entrepreneur'];
    const educationTerms = ['learn', 'education', 'school', 'university', 'course', 'study', 'teaching', 'knowledge', 'training'];
    const healthTerms = ['health', 'medical', 'doctor', 'disease', 'treatment', 'medicine', 'fitness', 'nutrition', 'wellness'];

    if (contentTokens.some(t => techTerms.includes(t))) {
      categories.push('technology');
    }
    if (contentTokens.some(t => businessTerms.includes(t))) {
      categories.push('business');
    }
    if (contentTokens.some(t => educationTerms.includes(t))) {
      categories.push('education');
    }
    if (contentTokens.some(t => healthTerms.includes(t))) {
      categories.push('health');
    }

    if (categories.length === 0) {
      categories.push('general');
    }

    return categories;
  }

  private _generateRewriteSuggestions(query: string, tokens: string[]): string[] {
    const suggestions: string[] = [];

    const correctedQuery = this._correctSpelling(query);
    if (correctedQuery !== query.toLowerCase()) {
      suggestions.push(correctedQuery);
    }

    const expandedQuery = tokens
      .map(t => {
        const syns = this._synonymDictionary.get(t) || [];
        return syns.length > 0 ? `${t} (${syns[0]})` : t;
      })
      .join(' ');
    if (expandedQuery !== query) {
      suggestions.push(expandedQuery);
    }

    if (tokens.length > 3) {
      const shorterQuery = tokens.slice(0, 3).join(' ');
      suggestions.push(shorterQuery);
    }

    if (tokens.length < 5 && tokens.length > 0) {
      const lastTerm = tokens[tokens.length - 1];
      const syns = this._synonymDictionary.get(lastTerm) || [];
      if (syns.length > 0) {
        const extendedQuery = [...tokens, syns[0]].join(' ');
        suggestions.push(extendedQuery);
      }
    }

    return [...new Set(suggestions)].slice(0, 5);
  }

  private _correctSpelling(query: string): string {
    let corrected = query.toLowerCase();
    
    const commonMistakes: [RegExp, string][] = [
      [/\brecieve\b/g, 'receive'],
      [/\bseperate\b/g, 'separate'],
      [/\boccured\b/g, 'occurred'],
      [/\bbegining\b/g, 'beginning'],
      [/\bbelieve\b/g, 'believe'],
      [/\bcalender\b/g, 'calendar'],
      [/\bcollegue\b/g, 'colleague'],
      [/\bconcious\b/g, 'conscious'],
      [/\bdefinately\b/g, 'definitely'],
      [/\benvironment\b/g, 'environment']
    ];

    for (const [pattern, replacement] of commonMistakes) {
      corrected = corrected.replace(pattern, replacement);
    }

    return corrected;
  }

  private _expandQuery(tokens: string[]): string[] {
    const expanded: Set<string> = new Set(tokens);

    for (const token of tokens) {
      const synonyms = this._synonymDictionary.get(token.toLowerCase()) || [];
      for (const syn of synonyms) {
        if (expanded.size < this._maxExpansionTerms + tokens.length) {
          expanded.add(syn);
        }
      }
    }

    return Array.from(expanded);
  }

  expandQuery(query: string, method: ExpansionMethod = 'thesaurus'): QueryExpansionResult {
    const tokens = this._tokenize(this._normalizeQuery(query));
    const originalTerms = [...tokens];
    const expandedTerms: string[] = [...tokens];
    const synonyms = new Map<string, string[]>();

    switch (method) {
      case 'thesaurus':
        for (const term of tokens) {
          const termSynonyms = this._synonymDictionary.get(term.toLowerCase()) || [];
          if (termSynonyms.length > 0) {
            synonyms.set(term, termSynonyms);
            for (const syn of termSynonyms) {
              if (!expandedTerms.includes(syn)) {
                expandedTerms.push(syn);
              }
            }
          }
        }
        break;

      case 'co_occurrence':
        for (const term of tokens) {
          const coOccurring = this._findCoOccurringTerms(term);
          if (coOccurring.length > 0) {
            synonyms.set(term, coOccurring);
            for (const co of coOccurring.slice(0, 3)) {
              if (!expandedTerms.includes(co)) {
                expandedTerms.push(co);
              }
            }
          }
        }
        break;

      case 'word_embedding':
        for (const term of tokens) {
          const similar = this._findEmbeddingSimilarTerms(term);
          if (similar.length > 0) {
            synonyms.set(term, similar);
            for (const sim of similar.slice(0, 3)) {
              if (!expandedTerms.includes(sim)) {
                expandedTerms.push(sim);
              }
            }
          }
        }
        break;

      default:
        break;
    }

    return {
      originalTerms,
      expandedTerms: expandedTerms.slice(0, this._maxExpansionTerms + originalTerms.length),
      expansionMethod: method,
      synonyms
    };
  }

  rewriteQuery(query: string, rewriteType: RewriteType): QueryRewrite {
    let rewrittenQuery = query;
    let confidence = 0.5;

    switch (rewriteType) {
      case 'spelling_correction':
        rewrittenQuery = this._correctSpelling(query);
        confidence = rewrittenQuery !== query.toLowerCase() ? 0.8 : 0.3;
        break;

      case 'synonym_expansion':
        const tokens = this._tokenize(this._normalizeQuery(query));
        rewrittenQuery = tokens
          .map(t => {
            const syns = this._synonymDictionary.get(t) || [];
            return syns.length > 0 ? `${t} OR ${syns.slice(0, 2).join(' OR ')}` : t;
          })
          .join(' ');
        confidence = 0.6;
        break;

      case 'stemming':
        const stemmed = this._tokenize(this._normalizeQuery(query))
          .map(t => this._stem(t))
          .join(' ');
        rewrittenQuery = stemmed;
        confidence = 0.7;
        break;

      case 'query_splitting':
        const splitQueries = this._splitQuery(query);
        rewrittenQuery = splitQueries.join(' | ');
        confidence = 0.5;
        break;

      case 'contextual_enhancement':
        rewrittenQuery = this._enhanceWithContext(query);
        confidence = 0.55;
        break;

      default:
        break;
    }

    const rewrite: QueryRewrite = {
      originalQuery: query,
      rewrittenQuery,
      rewriteType,
      confidence
    };

    this._queryRewrites.push(rewrite);
    return rewrite;
  }

  private _findCoOccurringTerms(term: string): string[] {
    const coOccurring: string[] = [];
    const termLower = term.toLowerCase();
    const relatedTerms = this._synonymDictionary.get(termLower) || [];
    
    for (const related of relatedTerms) {
      if (!coOccurring.includes(related)) {
        coOccurring.push(related);
      }
    }

    return coOccurring;
  }

  private _findEmbeddingSimilarTerms(term: string): string[] {
    const similar: string[] = [];
    const termLower = term.toLowerCase();
    
    for (const [key, synonyms] of this._synonymDictionary) {
      if (key.includes(termLower) || termLower.includes(key)) {
        for (const syn of synonyms) {
          if (!similar.includes(syn)) {
            similar.push(syn);
          }
        }
      }
    }

    return similar.slice(0, 5);
  }

  private _splitQuery(query: string): string[] {
    const parts: string[] = [];
    
    const andParts = query.split(/\s+and\s+/i);
    if (andParts.length > 1) {
      parts.push(...andParts);
    }

    const commaParts = query.split(/[,;]/);
    if (commaParts.length > 1) {
      parts.push(...commaParts.map(p => p.trim()));
    }

    if (parts.length === 0) {
      const tokens = this._tokenize(this._normalizeQuery(query));
      if (tokens.length >= 4) {
        const mid = Math.floor(tokens.length / 2);
        parts.push(tokens.slice(0, mid).join(' '));
        parts.push(tokens.slice(mid).join(' '));
      } else {
        parts.push(query);
      }
    }

    return [...new Set(parts.map(p => p.trim()).filter(p => p.length > 0))];
  }

  private _enhanceWithContext(query: string): string {
    const tokens = this._tokenize(this._normalizeQuery(query));
    const enhanced: string[] = [];

    for (const token of tokens) {
      enhanced.push(token);
      const syns = this._synonymDictionary.get(token.toLowerCase()) || [];
      if (syns.length > 0) {
        enhanced.push(syns[0]);
      }
    }

    return enhanced.join(' ');
  }

  private _calculateComplexity(query: string, tokens: string[], entities: QueryEntity[]): number {
    let complexity = 0;

    complexity += Math.min(tokens.length / 10, 0.3);
    complexity += query.length > 50 ? 0.2 : query.length / 250;
    complexity += entities.length * 0.1;
    complexity += (query.match(/[?&|!()]/g) || []).length * 0.05;

    const hasOperators = /\b(AND|OR|NOT)\b/.test(query);
    if (hasOperators) complexity += 0.2;

    const hasQuotes = /["']/.test(query);
    if (hasQuotes) complexity += 0.1;

    return Math.min(complexity, 1);
  }

  private _stem(word: string): string {
    let stemmed = word.toLowerCase();
    if (stemmed.endsWith('ational') && stemmed.length > 7) {
      stemmed = stemmed.slice(0, -5) + 'e';
    } else if (stemmed.endsWith('ization') && stemmed.length > 7) {
      stemmed = stemmed.slice(0, -5) + 'e';
    } else if (stemmed.endsWith('tional') && stemmed.length > 6) {
      stemmed = stemmed.slice(0, -2);
    } else if (stemmed.endsWith('less') && stemmed.length > 5) {
      stemmed = stemmed.slice(0, -4);
    } else if (stemmed.endsWith('ful') && stemmed.length > 4) {
      stemmed = stemmed.slice(0, -3);
    } else if (stemmed.endsWith('ly') && stemmed.length > 3) {
      stemmed = stemmed.slice(0, -2);
    } else if (stemmed.endsWith('ment') && stemmed.length > 5) {
      stemmed = stemmed.slice(0, -4);
    } else if (stemmed.endsWith('ness') && stemmed.length > 5) {
      stemmed = stemmed.slice(0, -4);
    } else if (stemmed.endsWith('ing') && stemmed.length > 5) {
      stemmed = stemmed.slice(0, -3);
    } else if (stemmed.endsWith('ed') && stemmed.length > 4) {
      stemmed = stemmed.slice(0, -2);
    } else if (stemmed.endsWith('es') && stemmed.length > 4) {
      stemmed = stemmed.slice(0, -2);
    } else if (stemmed.endsWith('s') && stemmed.length > 3 && !stemmed.endsWith('ss')) {
      stemmed = stemmed.slice(0, -1);
    }
    return stemmed;
  }

  toPacket(): DataPacket<ParsedQuery> {
    const result = this._lastResult || {
      originalQuery: '',
      normalizedQuery: '',
      tokens: [],
      intent: 'ambiguous' as QueryIntent,
      entities: [],
      categories: [],
      rewritingSuggestions: [],
      expandedTerms: [],
      queryLength: 0,
      complexity: 0
    };
    this._counter++;
    return {
      id: `query-understanding-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['information-retrieval', 'query-understanding'],
        priority: 1,
        phase: 'query-processing'
      }
    };
  }

  reset(): void {
    this._parsedQueries = [];
    this._queryRewrites = [];
    this._counter = 0;
    this._lastResult = null;
    this._maxExpansionTerms = 10;
    this._minTermLength = 2;
  }
}
