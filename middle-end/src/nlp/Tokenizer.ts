import { DataPacket } from '../shared/types';

export interface Token {
  text: string;
  type: string;
  position: number;
  lemma: string;
}

export interface TokenizationResult {
  tokens: Token[];
  count: number;
  language: string;
}

export class Tokenizer {
  private _tokens: Token[] = [];
  private _language: string = 'en';
  private _counter: number = 0;
  private _stopwords: Set<string> = new Set();
  private _vocabulary: Map<string, number> = new Map();
  private _lastResult: TokenizationResult | null = null;

  constructor() {
    this._initDefaultStopwords();
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

  get tokens(): Token[] {
    return this._tokens;
  }

  get language(): string {
    return this._language;
  }

  get count(): number {
    return this._tokens.length;
  }

  get vocabulary(): Map<string, number> {
    return this._vocabulary;
  }

  wordTokenize(text: string): Token[] {
    const words = text.match(/[\w']+|[.,!?;:"'()\[\]{}]/g) || [];
    this._tokens = words.map((word, index) => ({
      text: word,
      type: /^[.,!?;:"'()\[\]{}]$/.test(word) ? 'punctuation' : 'word',
      position: index,
      lemma: word.toLowerCase()
    }));
    this._updateVocabulary();
    return this._tokens;
  }

  sentenceTokenize(text: string): string[] {
    const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
    return sentences;
  }

  characterTokenize(text: string): Token[] {
    this._tokens = text.split('').map((char, index) => ({
      text: char,
      type: /\s/.test(char) ? 'whitespace' : /[a-zA-Z]/.test(char) ? 'letter' : /[0-9]/.test(char) ? 'digit' : 'symbol',
      position: index,
      lemma: char.toLowerCase()
    }));
    return this._tokens;
  }

  ngram(text: string, n: number): string[] {
    const tokens = this.wordTokenize(text).map(t => t.text);
    const result: string[] = [];
    for (let i = 0; i <= tokens.length - n; i++) {
      result.push(tokens.slice(i, i + n).join(' '));
    }
    return result;
  }

  subwordTokenize(text: string, vocab: string[]): Token[] {
    const vocabSet = new Set(vocab);
    const words = text.split(/\s+/);
    const result: Token[] = [];
    let position = 0;
    for (const word of words) {
      let remaining = word;
      while (remaining.length > 0) {
        let matched = false;
        for (let len = remaining.length; len > 0; len--) {
          const sub = remaining.substring(0, len);
          if (vocabSet.has(sub)) {
            result.push({
              text: sub,
              type: 'subword',
              position: position++,
              lemma: sub.toLowerCase()
            });
            remaining = remaining.substring(len);
            matched = true;
            break;
          }
        }
        if (!matched) {
          result.push({
            text: remaining[0],
            type: 'unknown',
            position: position++,
            lemma: remaining[0].toLowerCase()
          });
          remaining = remaining.substring(1);
        }
      }
    }
    this._tokens = result;
    return this._tokens;
  }

  whitespaceTokenize(text: string): Token[] {
    const parts = text.split(/(\s+)/);
    let position = 0;
    this._tokens = parts
      .filter(p => p.length > 0)
      .map(part => ({
        text: part,
        type: /\s/.test(part) ? 'whitespace' : 'word',
        position: position++,
        lemma: part.trim().toLowerCase()
      }));
    return this._tokens;
  }

  regexTokenize(text: string, pattern: RegExp): Token[] {
    const matches = text.match(pattern) || [];
    let position = 0;
    this._tokens = matches.map(match => ({
      text: match,
      type: 'regex-match',
      position: position++,
      lemma: match.toLowerCase()
    }));
    return this._tokens;
  }

  chineseSegment(text: string): Token[] {
    const result: Token[] = [];
    let position = 0;
    let i = 0;
    while (i < text.length) {
      const char = text[i];
      if (/[\u4e00-\u9fa5]/.test(char)) {
        result.push({
          text: char,
          type: 'chinese-char',
          position: position++,
          lemma: char
        });
        i++;
      } else if (/[a-zA-Z0-9]+/.test(char)) {
        let j = i;
        while (j < text.length && /[a-zA-Z0-9]/.test(text[j])) j++;
        result.push({
          text: text.substring(i, j),
          type: 'latin',
          position: position++,
          lemma: text.substring(i, j).toLowerCase()
        });
        i = j;
      } else if (/\s+/.test(char)) {
        let j = i;
        while (j < text.length && /\s/.test(text[j])) j++;
        i = j;
      } else {
        result.push({
          text: char,
          type: 'punctuation',
          position: position++,
          lemma: char
        });
        i++;
      }
    }
    this._tokens = result;
    this._language = 'zh';
    return this._tokens;
  }

  posTag(tokens: Token[]): Token[] {
    return tokens.map(token => {
      const text = token.text.toLowerCase();
      let type = 'unknown';
      if (/^(the|a|an|this|that|these|those|my|your|his|her|its|our|their)$/.test(text)) {
        type = 'determiner';
      } else if (/^(is|are|was|were|be|been|being|have|has|had|do|does|did|will|would|could|should|may|might|must|can|shall)$/.test(text)) {
        type = 'verb';
      } else if (/^(and|but|or|nor|not|so|yet|because|if|when|where|how|what|which|who|whom)$/.test(text)) {
        type = 'conjunction';
      } else if (/^(in|on|at|to|for|with|from|by|about|as|into|through|during|before|after|above|below|between)$/.test(text)) {
        type = 'preposition';
      } else if (/^[.,!?;:"'()\[\]{}]$/.test(text)) {
        type = 'punctuation';
      } else if (/^\d+$/.test(text)) {
        type = 'number';
      } else if (text.endsWith('ly')) {
        type = 'adverb';
      } else if (text.endsWith('tion') || text.endsWith('ness') || text.endsWith('ment') || text.endsWith('ity')) {
        type = 'noun';
      } else if (text.endsWith('ing') || text.endsWith('ed') || text.endsWith('s') && text.length > 3) {
        type = 'verb';
      } else {
        type = 'noun';
      }
      return { ...token, type };
    });
  }

  lemmatize(token: Token): string {
    let lemma = token.text.toLowerCase();
    if (lemma.endsWith('ies') && lemma.length > 3) {
      lemma = lemma.slice(0, -3) + 'y';
    } else if (lemma.endsWith('es') && lemma.length > 2) {
      lemma = lemma.slice(0, -2);
    } else if (lemma.endsWith('s') && lemma.length > 3 && !lemma.endsWith('ss')) {
      lemma = lemma.slice(0, -1);
    }
    if (lemma.endsWith('ed') && lemma.length > 2) {
      lemma = lemma.slice(0, -2);
    } else if (lemma.endsWith('ing') && lemma.length > 3) {
      lemma = lemma.slice(0, -3);
    }
    return lemma;
  }

  stem(token: string, language: string = 'en'): string {
    let word = token.toLowerCase();
    if (language === 'en') {
      if (word.endsWith('ational') && word.length > 7) {
        word = word.slice(0, -5) + 'e';
      } else if (word.endsWith('ization') && word.length > 7) {
        word = word.slice(0, -5) + 'e';
      } else if (word.endsWith('tional') && word.length > 6) {
        word = word.slice(0, -2);
      } else if (word.endsWith('less') && word.length > 5) {
        word = word.slice(0, -4);
      } else if (word.endsWith('ful') && word.length > 4) {
        word = word.slice(0, -3);
      } else if (word.endsWith('ly') && word.length > 3) {
        word = word.slice(0, -2);
      } else if (word.endsWith('ment') && word.length > 5) {
        word = word.slice(0, -4);
      } else if (word.endsWith('ness') && word.length > 5) {
        word = word.slice(0, -4);
      } else if (word.endsWith('able') && word.length > 5) {
        word = word.slice(0, -3) + 'e';
      } else if (word.endsWith('ible') && word.length > 5) {
        word = word.slice(0, -3) + 'e';
      } else if (word.endsWith('ing') && word.length > 5) {
        word = word.slice(0, -3);
      } else if (word.endsWith('ed') && word.length > 4) {
        word = word.slice(0, -2);
      } else if (word.endsWith('es') && word.length > 4) {
        word = word.slice(0, -2);
      } else if (word.endsWith('s') && word.length > 3 && !word.endsWith('ss')) {
        word = word.slice(0, -1);
      }
    }
    return word;
  }

  stopwordFilter(tokens: Token[], stopwords: string[] = []): Token[] {
    const filterSet = stopwords.length > 0 ? new Set(stopwords) : this._stopwords;
    return tokens.filter(token => !filterSet.has(token.text.toLowerCase()));
  }

  private _updateVocabulary(): void {
    for (const token of this._tokens) {
      const word = token.text.toLowerCase();
      this._vocabulary.set(word, (this._vocabulary.get(word) || 0) + 1);
    }
  }

  toPacket(): DataPacket<TokenizationResult> {
    const result: TokenizationResult = {
      tokens: this._tokens,
      count: this._tokens.length,
      language: this._language
    };
    this._lastResult = result;
    this._counter++;
    return {
      id: `tokenizer-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['nlp', 'tokenizer'],
        priority: 1,
        phase: 'tokenization'
      }
    };
  }

  reset(): void {
    this._tokens = [];
    this._language = 'en';
    this._counter = 0;
    this._lastResult = null;
  }
}
