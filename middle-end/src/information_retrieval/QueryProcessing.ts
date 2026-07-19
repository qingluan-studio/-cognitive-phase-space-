import { DataPacket } from '../shared/types';

export interface QueryExpansion {
  original: string;
  expanded: string[];
  method: string;
}

export interface Query {
  text: string;
  terms: string[];
  operators: string[];
  weight: number;
}

export class QueryProcessing {
  private _queries: Query[] = [];
  private _expansions: QueryExpansion[] = [];
  private _counter: number = 0;
  private _method: string = 'default';
  private _lastQuery: Query | null = null;

  get queries(): Query[] {
    return this._queries;
  }

  get expansions(): QueryExpansion[] {
    return this._expansions;
  }

  get method(): string {
    return this._method;
  }

  parseQuery(query: string): Query {
    const operators: string[] = [];
    const terms: string[] = [];
    const tokens = query.split(/\s+/);
    for (const token of tokens) {
      const upper = token.toUpperCase();
      if (upper === 'AND' || upper === 'OR' || upper === 'NOT') {
        operators.push(upper);
      } else {
        terms.push(token.toLowerCase().replace(/[.,!?;:'"]/g, ''));
      }
    }
    const result: Query = {
      text: query,
      terms,
      operators,
      weight: 1.0
    };
    this._lastQuery = result;
    this._queries.push(result);
    return result;
  }

  tokenizeQuery(query: string): string[] {
    return query.toLowerCase()
      .split(/\s+/)
      .map(w => w.replace(/[.,!?;:'"]/g, ''))
      .filter(w => w.length > 0);
  }

  stemQuery(terms: string[]): string[] {
    return terms.map(term => {
      let word = term.toLowerCase();
      if (word.endsWith('ing') && word.length > 5) {
        word = word.slice(0, -3);
      } else if (word.endsWith('ed') && word.length > 4) {
        word = word.slice(0, -2);
      } else if (word.endsWith('es') && word.length > 3) {
        word = word.slice(0, -2);
      } else if (word.endsWith('s') && word.length > 3 && !word.endsWith('ss')) {
        word = word.slice(0, -1);
      }
      if (word.endsWith('tion') && word.length > 5) {
        word = word.slice(0, -4);
      } else if (word.endsWith('ness') && word.length > 5) {
        word = word.slice(0, -4);
      }
      return word;
    });
  }

  queryNormalization(query: string): string {
    let normalized = query.toLowerCase().trim();
    normalized = normalized.replace(/\s+/g, ' ');
    normalized = normalized.replace(/[.,!?;:'"]/g, '');
    return normalized;
  }

  stopwordRemoval(query: string): string {
    const stopwords = new Set([
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
      'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'
    ]);
    const words = query.split(/\s+/);
    return words.filter(w => !stopwords.has(w.toLowerCase())).join(' ');
  }

  queryExpansion(query: string, method: string, resources: Map<string, string[]>): string[] {
    const terms = this.tokenizeQuery(query);
    const expanded: string[] = [...terms];
    if (method === 'thesaurus') {
      return this.thesaurusExpansion(query, resources);
    } else if (method === 'pseudo-relevance') {
      return this.pseudoRelevanceFeedback(query, []);
    } else {
      for (const term of terms) {
        const syns = resources.get(term);
        if (syns) {
          expanded.push(...syns.slice(0, 2));
        }
      }
    }
    this._expansions.push({ original: query, expanded, method });
    return expanded;
  }

  pseudoRelevanceFeedback(query: string, topDocs: { content: string }[]): string[] {
    const terms = this.tokenizeQuery(query);
    const termFreq = new Map<string, number>();
    for (const doc of topDocs) {
      const docTerms = this.tokenizeQuery(doc.content);
      for (const term of docTerms) {
        termFreq.set(term, (termFreq.get(term) || 0) + 1);
      }
    }
    const sorted = [...termFreq.entries()]
      .filter(([t]) => !terms.includes(t))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([t]) => t);
    return [...terms, ...sorted];
  }

  thesaurusExpansion(query: string, thesaurus: Map<string, string[]>): string[] {
    const terms = this.tokenizeQuery(query);
    const expanded: string[] = [...terms];
    for (const term of terms) {
      const syns = thesaurus.get(term);
      if (syns) {
        expanded.push(...syns.slice(0, 3));
      }
    }
    this._expansions.push({ original: query, expanded, method: 'thesaurus' });
    return expanded;
  }

  queryRewriting(query: string, intent: string): string {
    let rewritten = query;
    if (intent === 'informational') {
      rewritten = query + ' information definition explain';
    } else if (intent === 'navigational') {
      rewritten = query + ' official website homepage';
    } else if (intent === 'transactional') {
      rewritten = query + ' buy purchase order online';
    }
    return rewritten;
  }

  querySuggestion(prefix: string, dictionary: string[]): string[] {
    const suggestions: string[] = [];
    const lowerPrefix = prefix.toLowerCase();
    for (const word of dictionary) {
      if (word.toLowerCase().startsWith(lowerPrefix)) {
        suggestions.push(word);
      }
      if (suggestions.length >= 10) break;
    }
    return suggestions;
  }

  autocomplete(prefix: string, index: string[]): string[] {
    return this.querySuggestion(prefix, index);
  }

  spellCorrect(query: string, dictionary: Set<string>): string {
    const words = query.split(/(\s+|[.,!?;:'"])/);
    const corrected: string[] = [];
    for (const word of words) {
      if (/^[a-zA-Z]+$/.test(word) && !dictionary.has(word.toLowerCase())) {
        const suggestion = this._findClosest(word.toLowerCase(), dictionary);
        corrected.push(suggestion || word);
      } else {
        corrected.push(word);
      }
    }
    return corrected.join('');
  }

  private _findClosest(word: string, dictionary: Set<string>): string | null {
    let best: string | null = null;
    let bestDist = Infinity;
    for (const dictWord of dictionary) {
      const dist = this._levenshtein(word, dictWord);
      if (dist < bestDist && dist <= 2) {
        bestDist = dist;
        best = dictWord;
      }
    }
    return best;
  }

  private _levenshtein(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
        }
      }
    }
    return dp[m][n];
  }

  toPacket(): DataPacket<Query> {
    const result = this._lastQuery || { text: '', terms: [], operators: [], weight: 0 };
    this._counter++;
    return {
      id: `query-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['information-retrieval', 'query-processing'],
        priority: 1,
        phase: 'query-processing'
      }
    };
  }

  reset(): void {
    this._queries = [];
    this._expansions = [];
    this._counter = 0;
    this._method = 'default';
    this._lastQuery = null;
  }
}
