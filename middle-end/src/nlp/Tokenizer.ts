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

export interface TokenStat {
  totalTokens: number;
  uniqueTokens: number;
  avgTokenLength: number;
  typeTokenRatio: number;
  longestToken: string;
  distribution: Record<string, number>;
}

export class Tokenizer {
  private _tokens: Token[] = [];
  private _language: string = 'en';
  private _counter: number = 0;
  private _stopwords: Set<string> = new Set();
  private _vocabulary: Map<string, number> = new Map();
  private _lastResult: TokenizationResult | null = null;
  private _customPatterns: Map<string, RegExp> = new Map();
  private _punctuationSet: Set<string> = new Set([
    '.', ',', '!', '?', ';', ':', '"', "'", '(', ')', '[', ']', '{', '}', '-', '_', '/', '\\', '|', '@', '#', '$', '%', '^', '&', '*', '+', '=', '<', '>', '~', '`'
  ]);
  private _abbreviations: Set<string> = new Set([
    'Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.', 'Sr.', 'Jr.', 'St.', 'Mt.', 'Co.', 'Inc.', 'Ltd.', 'Corp.', 'No.', 'vs.', 'etc.', 'e.g.', 'i.e.', 'U.S.', 'U.K.'
  ]);

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

  get stopwords(): Set<string> {
    return this._stopwords;
  }

  get customPatterns(): Map<string, RegExp> {
    return this._customPatterns;
  }

  get abbreviations(): Set<string> {
    return this._abbreviations;
  }

  addStopwords(words: string[]): void {
    words.forEach(w => this._stopwords.add(w.toLowerCase()));
  }

  removeStopword(word: string): void {
    this._stopwords.delete(word.toLowerCase());
  }

  addCustomPattern(name: string, pattern: RegExp): void {
    this._customPatterns.set(name, pattern);
  }

  removeCustomPattern(name: string): void {
    this._customPatterns.delete(name);
  }

  addAbbreviation(abbr: string): void {
    this._abbreviations.add(abbr);
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
    const protectedText = this._protectAbbreviations(text);
    const sentences = protectedText
      .split(/(?<=[.!?])\s+/)
      .filter(s => s.trim().length > 0)
      .map(s => this._restoreAbbreviations(s));
    return sentences;
  }

  paragraphTokenize(text: string): string[] {
    return text
      .split(/\n\s*\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
  }

  lineTokenize(text: string): string[] {
    return text.split(/\r?\n/);
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

  charNgram(text: string, n: number): string[] {
    const clean = text.replace(/\s+/g, '');
    const result: string[] = [];
    for (let i = 0; i <= clean.length - n; i++) {
      result.push(clean.substring(i, i + n));
    }
    return result;
  }

  skipgram(text: string, n: number, k: number): string[] {
    const tokens = this.wordTokenize(text).map(t => t.text);
    const result: string[] = [];
    for (let i = 0; i < tokens.length; i++) {
      for (let j = i + k + 1; j < tokens.length && j - i <= n + k; j++) {
        result.push(tokens[i] + ' ' + tokens[j]);
      }
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

  japaneseSegment(text: string): Token[] {
    const result: Token[] = [];
    let position = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (/[\u3040-\u309f]/.test(char)) {
        result.push({ text: char, type: 'hiragana', position: position++, lemma: char });
      } else if (/[\u30a0-\u30ff]/.test(char)) {
        result.push({ text: char, type: 'katakana', position: position++, lemma: char });
      } else if (/[\u4e00-\u9fa5]/.test(char)) {
        result.push({ text: char, type: 'kanji', position: position++, lemma: char });
      } else if (/[a-zA-Z0-9]/.test(char)) {
        result.push({ text: char, type: 'latin', position: position++, lemma: char.toLowerCase() });
      } else if (/\s/.test(char)) {
        result.push({ text: char, type: 'whitespace', position: position++, lemma: char });
      } else {
        result.push({ text: char, type: 'symbol', position: position++, lemma: char });
      }
    }
    this._tokens = result;
    this._language = 'ja';
    return this._tokens;
  }

  koreanSegment(text: string): Token[] {
    const result: Token[] = [];
    let position = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (/[\uac00-\ud7af]/.test(char)) {
        result.push({ text: char, type: 'hangul', position: position++, lemma: char });
      } else if (/[a-zA-Z0-9]/.test(char)) {
        result.push({ text: char, type: 'latin', position: position++, lemma: char.toLowerCase() });
      } else if (/\s/.test(char)) {
        result.push({ text: char, type: 'whitespace', position: position++, lemma: char });
      } else {
        result.push({ text: char, type: 'symbol', position: position++, lemma: char });
      }
    }
    this._tokens = result;
    this._language = 'ko';
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

  detailedPosTag(tokens: Token[]): Token[] {
    const tagged = this.posTag(tokens);
    return tagged.map(token => {
      const text = token.text.toLowerCase();
      let type = token.type;
      if (/^(i|you|he|she|it|we|they|me|him|her|us|them)$/.test(text)) {
        type = 'pronoun';
      } else if (/^(my|your|his|its|our|their|mine|yours|hers|ours|theirs)$/.test(text)) {
        type = 'possessive';
      } else if (/^(this|that|these|those)$/.test(text)) {
        type = 'demonstrative';
      } else if (/^(who|what|where|when|why|how|which|whom|whose)$/.test(text)) {
        type = 'wh-pronoun';
      } else if (/^(red|blue|green|yellow|big|small|tall|short|beautiful|old|new|young|fast|slow)$/.test(text) || text.endsWith('ful') || text.endsWith('ous') || text.endsWith('ive') || text.endsWith('able')) {
        type = 'adjective';
      } else if (/^\d+rd$|^\d+st$|^\d+nd$|^\d+th$/.test(text)) {
        type = 'ordinal';
      } else if (/^(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)$/.test(text)) {
        type = 'ordinal';
      } else if (/^(once|twice|three times)$/.test(text)) {
        type = 'adverb-frequency';
      } else if (/^(always|never|often|rarely|sometimes|usually|frequently)$/.test(text)) {
        type = 'adverb-frequency';
      } else if (text.endsWith('self') || text.endsWith('selves')) {
        type = 'reflexive';
      } else if (/^(oh|wow|ouch|hey|hi|hello|bye|yes|no)$/.test(text)) {
        type = 'interjection';
      } else if (/^[A-Z][a-z]+$/.test(token.text) && token.type === 'noun') {
        type = 'proper-noun';
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

  lemmatizeAll(tokens: Token[]): Token[] {
    return tokens.map(t => ({ ...t, lemma: this.lemmatize(t) }));
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
    } else if (language === 'fr') {
      if (word.endsWith('ement') && word.length > 6) {
        word = word.slice(0, -5);
      } else if (word.endsWith('ation') && word.length > 6) {
        word = word.slice(0, -5);
      } else if (word.endsWith('ite') && word.length > 4) {
        word = word.slice(0, -3);
      }
    } else if (language === 'de') {
      if (word.endsWith('ung') && word.length > 5) {
        word = word.slice(0, -3);
      } else if (word.endsWith('heit') && word.length > 6) {
        word = word.slice(0, -4);
      } else if (word.endsWith('keit') && word.length > 6) {
        word = word.slice(0, -4);
      }
    }
    return word;
  }

  porterStem(token: string): string {
    let word = token.toLowerCase();
    if (word.length <= 2) return word;
    if (word.endsWith('sses')) {
      word = word.slice(0, -2);
    } else if (word.endsWith('ies')) {
      word = word.slice(0, -2);
    } else if (word.endsWith('ss')) {
      // leave as is
    } else if (word.endsWith('s') && word.length > 3) {
      word = word.slice(0, -1);
    }
    if (word.endsWith('eed') && word.length > 4) {
      word = word.slice(0, -1);
    } else if (word.endsWith('ed') && word.length > 3) {
      word = word.slice(0, -2);
    } else if (word.endsWith('ing') && word.length > 4) {
      word = word.slice(0, -3);
    }
    if (word.endsWith('y') && word.length > 2) {
      word = word.slice(0, -1) + 'i';
    }
    if (word.endsWith('ational')) {
      word = word.slice(0, -5) + 'e';
    } else if (word.endsWith('tional')) {
      word = word.slice(0, -2);
    } else if (word.endsWith('izer')) {
      word = word.slice(0, -2);
    } else if (word.endsWith('ization')) {
      word = word.slice(0, -5) + 'e';
    } else if (word.endsWith('fulness')) {
      word = word.slice(0, -4);
    } else if (word.endsWith('ousness')) {
      word = word.slice(0, -4);
    } else if (word.endsWith('iveness')) {
      word = word.slice(0, -4);
    }
    return word;
  }

  lancasterStem(token: string): string {
    let word = token.toLowerCase();
    if (word.length < 3) return word;
    if (word.endsWith('ingly') || word.endsWith('edly')) {
      word = word.slice(0, -3);
    }
    if (word.endsWith('ies') && word.length > 4) {
      word = word.slice(0, -3) + 'y';
    } else if (word.endsWith('es') && word.length > 3) {
      word = word.slice(0, -2);
    } else if (word.endsWith('ed') && word.length > 3) {
      word = word.slice(0, -2);
    } else if (word.endsWith('ing') && word.length > 4) {
      word = word.slice(0, -3);
    }
    if (word.endsWith('ness') && word.length > 5) {
      word = word.slice(0, -4);
    } else if (word.endsWith('ment') && word.length > 5) {
      word = word.slice(0, -4);
    } else if (word.endsWith('ful') && word.length > 4) {
      word = word.slice(0, -3);
    }
    return word;
  }

  snowballStem(token: string, language: string = 'en'): string {
    return this.porterStem(token);
  }

  stopwordFilter(tokens: Token[], stopwords: string[] = []): Token[] {
    const filterSet = stopwords.length > 0 ? new Set(stopwords) : this._stopwords;
    return tokens.filter(token => !filterSet.has(token.text.toLowerCase()));
  }

  punctuationFilter(tokens: Token[]): Token[] {
    return tokens.filter(token => !this._punctuationSet.has(token.text));
  }

  lengthFilter(tokens: Token[], minLen: number = 1, maxLen: number = 50): Token[] {
    return tokens.filter(token => token.text.length >= minLen && token.text.length <= maxLen);
  }

  numericFilter(tokens: Token[]): Token[] {
    return tokens.filter(token => !/^\d+(\.\d+)?$/.test(token.text));
  }

  urlFilter(tokens: Token[]): Token[] {
    return tokens.filter(token => !/^https?:\/\/\S+$/.test(token.text));
  }

  normalize(text: string): string {
    let result = text;
    result = result.normalize('NFKC');
    result = result.replace(/[\u2018\u2019\u201A\u201B]/g, "'");
    result = result.replace(/[\u201C\u201D\u201E\u201F]/g, '"');
    result = result.replace(/\u2013|\u2014/g, '-');
    result = result.replace(/\u2026/g, '...');
    result = result.replace(/\s+/g, ' ');
    return result.trim();
  }

  lowercase(text: string, language: string = 'en'): string {
    if (language === 'tr' || language === 'az') {
      return text.replace(/I/g, 'ı').replace(/İ/g, 'i').toLowerCase();
    }
    if (language === 'de') {
      return text.replace(/ß/g, 'ss').toLowerCase();
    }
    return text.toLowerCase();
  }

  detokenize(tokens: Token[]): string {
    let result = '';
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const prev = i > 0 ? tokens[i - 1].text : '';
      const next = i < tokens.length - 1 ? tokens[i + 1].text : '';
      if (this._punctuationSet.has(token.text) && token.text !== '(' && token.text !== '[' && token.text !== '{') {
        result += token.text;
      } else if (token.text === '(' || token.text === '[' || token.text === '{') {
        result += (i > 0 ? ' ' : '') + token.text;
      } else if (prev === '(' || prev === '[' || prev === '{') {
        result += token.text;
      } else if (i === 0) {
        result += token.text;
      } else {
        result += ' ' + token.text;
      }
    }
    return result.trim();
  }

  statistics(tokens?: Token[]): TokenStat {
    const target = tokens || this._tokens;
    if (target.length === 0) {
      return {
        totalTokens: 0,
        uniqueTokens: 0,
        avgTokenLength: 0,
        typeTokenRatio: 0,
        longestToken: '',
        distribution: {}
      };
    }
    const totalTokens = target.length;
    const uniqueSet = new Set(target.map(t => t.text.toLowerCase()));
    const uniqueTokens = uniqueSet.size;
    const totalLen = target.reduce((sum, t) => sum + t.text.length, 0);
    const avgTokenLength = totalLen / totalTokens;
    const typeTokenRatio = uniqueTokens / totalTokens;
    let longestToken = '';
    for (const t of target) {
      if (t.text.length > longestToken.length) longestToken = t.text;
    }
    const distribution: Record<string, number> = {};
    for (const t of target) {
      distribution[t.type] = (distribution[t.type] || 0) + 1;
    }
    return {
      totalTokens,
      uniqueTokens,
      avgTokenLength,
      typeTokenRatio,
      longestToken,
      distribution
    };
  }

  vocabularyFrequency(limit?: number): { word: string; count: number }[] {
    const entries = Array.from(this._vocabulary.entries())
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count);
    return limit ? entries.slice(0, limit) : entries;
  }

  detectLanguage(text: string): string {
    if (/[\u4e00-\u9fa5]/.test(text)) return 'zh';
    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return 'ja';
    if (/[\uac00-\ud7af]/.test(text)) return 'ko';
    if (/[\u0400-\u04FF]/.test(text)) return 'ru';
    if (/[\u0600-\u06FF]/.test(text)) return 'ar';
    if (/[\u0590-\u05FF]/.test(text)) return 'he';
    if (/[\u0900-\u097F]/.test(text)) return 'hi';
    if (/[\u0E00-\u0E7F]/.test(text)) return 'th';
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) return 'en';
    const enCommon = ['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that'];
    const frCommon = ['le', 'la', 'de', 'et', 'les', 'des'];
    const deCommon = ['der', 'die', 'und', 'in', 'den'];
    const esCommon = ['el', 'la', 'de', 'que', 'y'];
    let enCount = 0, frCount = 0, deCount = 0, esCount = 0;
    for (const w of words) {
      if (enCommon.includes(w)) enCount++;
      if (frCommon.includes(w)) frCount++;
      if (deCommon.includes(w)) deCount++;
      if (esCommon.includes(w)) esCount++;
    }
    const max = Math.max(enCount, frCount, deCount, esCount);
    if (max === 0) return 'en';
    if (enCount === max) return 'en';
    if (frCount === max) return 'fr';
    if (deCount === max) return 'de';
    if (esCount === max) return 'es';
    return 'en';
  }

  splitCamelCase(text: string): string {
    return text
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .trim();
  }

  splitSnakeCase(text: string): string {
    return text.replace(/_/g, ' ').trim();
  }

  splitKebabCase(text: string): string {
    return text.replace(/-/g, ' ').trim();
  }

  splitAllCases(text: string): string {
    let result = this.splitCamelCase(text);
    result = this.splitSnakeCase(result);
    result = this.splitKebabCase(result);
    return result;
  }

  removeAccents(text: string): string {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  removeEmojis(text: string): string {
    return text.replace(/[\u{1F600}-\u{1F64F}]/gu, '')
      .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
      .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
      .replace(/[\u{2600}-\u{26FF}]/gu, '')
      .replace(/[\u{2700}-\u{27BF}]/gu, '');
  }

  extractHashtags(text: string): string[] {
    const matches = text.match(/#\w+/g) || [];
    return matches;
  }

  extractMentions(text: string): string[] {
    const matches = text.match(/@\w+/g) || [];
    return matches;
  }

  extractUrls(text: string): string[] {
    const matches = text.match(/https?:\/\/[^\s]+/g) || [];
    return matches;
  }

  extractEmails(text: string): string[] {
    const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    return matches;
  }

  extractPhoneNumbers(text: string): string[] {
    const matches = text.match(/\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g) || [];
    return matches;
  }

  extractHashtagsTokens(text: string): Token[] {
    const matches = this.extractHashtags(text);
    return matches.map((m, i) => ({
      text: m,
      type: 'hashtag',
      position: i,
      lemma: m.toLowerCase()
    }));
  }

  extractMentionsTokens(text: string): Token[] {
    const matches = this.extractMentions(text);
    return matches.map((m, i) => ({
      text: m,
      type: 'mention',
      position: i,
      lemma: m.toLowerCase()
    }));
  }

  extractUrlsTokens(text: string): Token[] {
    const matches = this.extractUrls(text);
    return matches.map((m, i) => ({
      text: m,
      type: 'url',
      position: i,
      lemma: m.toLowerCase()
    }));
  }

  countSyllables(word: string): number {
    const lower = word.toLowerCase();
    if (lower.length <= 3) return 1;
    const noE = lower.endsWith('e') ? lower.slice(0, -1) : lower;
    const matches = noE.match(/[aeiouy]+/g);
    return matches ? matches.length : 1;
  }

  isPunctuation(text: string): boolean {
    return this._punctuationSet.has(text);
  }

  isStopword(text: string): boolean {
    return this._stopwords.has(text.toLowerCase());
  }

  isAbbreviation(text: string): boolean {
    return this._abbreviations.has(text);
  }

  isURL(text: string): boolean {
    return /^https?:\/\/\S+$/.test(text);
  }

  isEmail(text: string): boolean {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(text);
  }

  isNumber(text: string): boolean {
    return /^\d+(\.\d+)?$/.test(text);
  }

  isCapitalized(text: string): boolean {
    return /^[A-Z][a-z]+/.test(text);
  }

  isAllCaps(text: string): boolean {
    return /^[A-Z]+$/.test(text) && text.length > 1;
  }

  isMixedCase(text: string): boolean {
    return /[a-z]/.test(text) && /[A-Z]/.test(text);
  }

  isPalindrome(text: string): boolean {
    const clean = text.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
    return clean.length > 1 && clean === clean.split('').reverse().join('');
  }

  private _protectAbbreviations(text: string): string {
    let result = text;
    for (const abbr of this._abbreviations) {
      const escaped = abbr.replace(/\./g, '\\.');
      const regex = new RegExp(escaped, 'g');
      result = result.replace(regex, abbr.replace(/\./g, '\uFFFF'));
    }
    return result;
  }

  private _restoreAbbreviations(text: string): string {
    return text.replace(/\uFFFF/g, '.');
  }

  private _updateVocabulary(): void {
    for (const token of this._tokens) {
      const word = token.text.toLowerCase();
      this._vocabulary.set(word, (this._vocabulary.get(word) || 0) + 1);
    }
  }

  pipeline(text: string, steps: string[]): Token[] {
    let current = text;
    for (const step of steps) {
      if (step === 'normalize') {
        current = this.normalize(current);
      } else if (step === 'lowercase') {
        current = this.lowercase(current);
      } else if (step === 'remove-accents') {
        current = this.removeAccents(current);
      } else if (step === 'remove-emojis') {
        current = this.removeEmojis(current);
      } else if (step === 'tokenize') {
        this.wordTokenize(current);
      } else if (step === 'stopword-filter') {
        this._tokens = this.stopwordFilter(this._tokens);
      } else if (step === 'punctuation-filter') {
        this._tokens = this.punctuationFilter(this._tokens);
      } else if (step === 'numeric-filter') {
        this._tokens = this.numericFilter(this._tokens);
      } else if (step === 'length-filter') {
        this._tokens = this.lengthFilter(this._tokens);
      } else if (step === 'lemmatize') {
        this._tokens = this.lemmatizeAll(this._tokens);
      } else if (step === 'stem') {
        this._tokens = this._tokens.map(t => ({ ...t, lemma: this.stem(t.text) }));
      } else if (step === 'pos-tag') {
        this._tokens = this.posTag(this._tokens);
      }
    }
    return this._tokens;
  }

  defaultPipeline(text: string): Token[] {
    return this.pipeline(text, [
      'normalize',
      'tokenize',
      'lowercase',
      'stopword-filter',
      'punctuation-filter',
      'lemmatize'
    ]);
  }

  tokenizeWithOffsets(text: string): { text: string; start: number; end: number; type: string }[] {
    const tokens: { text: string; start: number; end: number; type: string }[] = [];
    const regex = /[\w']+|[.,!?;:"'()\[\]{}]/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const word = match[0];
      const type = /^[.,!?;:"'()\[\]{}]$/.test(word) ? 'punctuation' : 'word';
      tokens.push({
        text: word,
        start: match.index,
        end: match.index + word.length,
        type
      });
    }
    return tokens;
  }

  bpeTokenize(text: string, merges: [string, string][]): Token[] {
    const words = text.split(/\s+/);
    const result: Token[] = [];
    let position = 0;
    for (const word of words) {
      let symbols = word.split('');
      let changed = true;
      while (changed && symbols.length > 1) {
        changed = false;
        let bestIdx = -1;
        let bestRank = merges.length;
        for (let i = 0; i < symbols.length - 1; i++) {
          const pair = `${symbols[i]} ${symbols[i + 1]}`;
          const rank = merges.findIndex(([a, b]) => `${a} ${b}` === pair);
          if (rank >= 0 && rank < bestRank) {
            bestRank = rank;
            bestIdx = i;
          }
        }
        if (bestIdx >= 0) {
          symbols[bestIdx] = symbols[bestIdx] + symbols[bestIdx + 1];
          symbols.splice(bestIdx + 1, 1);
          changed = true;
        }
      }
      for (const sym of symbols) {
        result.push({
          text: sym,
          type: 'bpe',
          position: position++,
          lemma: sym.toLowerCase()
        });
      }
    }
    this._tokens = result;
    return this._tokens;
  }

  wordpieceTokenize(text: string, vocab: Set<string>, maxChars: number = 100): Token[] {
    const cls = '[CLS]';
    const sep = '[SEP]';
    const unk = '[UNK]';
    const result: Token[] = [{ text: cls, type: 'special', position: 0, lemma: cls }];
    let position = 1;
    const words = text.split(/\s+/);
    for (const word of words) {
      if (word.length > maxChars) {
        result.push({ text: unk, type: 'special', position: position++, lemma: unk });
        continue;
      }
      const chars = word.split('');
      let isBad = false;
      let start = 0;
      const subTokens: string[] = [];
      while (start < chars.length) {
        let end = chars.length;
        let curSubstr = '';
        while (start < end) {
          const substr = chars.slice(start, end).join('');
          const candidate = start > 0 ? '##' + substr : substr;
          if (vocab.has(candidate)) {
            curSubstr = candidate;
            break;
          }
          end--;
        }
        if (curSubstr === '') {
          isBad = true;
          break;
        }
        subTokens.push(curSubstr);
        start = end;
      }
      if (isBad) {
        result.push({ text: unk, type: 'special', position: position++, lemma: unk });
      } else {
        for (const st of subTokens) {
          result.push({ text: st, type: 'wordpiece', position: position++, lemma: st.toLowerCase() });
        }
      }
    }
    result.push({ text: sep, type: 'special', position: position, lemma: sep });
    this._tokens = result;
    return this._tokens;
  }

  sentencepieceTokenize(text: string, vocab: string[]): Token[] {
    const vocabSet = new Set(vocab);
    const result: Token[] = [];
    let position = 0;
    const chars = Array.from(text);
    let i = 0;
    while (i < chars.length) {
      let matched = false;
      for (let len = Math.min(chars.length - i, 20); len > 0; len--) {
        const sub = chars.slice(i, i + len).join('');
        if (vocabSet.has(sub)) {
          result.push({
            text: sub,
            type: 'sentencepiece',
            position: position++,
            lemma: sub.toLowerCase()
          });
          i += len;
          matched = true;
          break;
        }
      }
      if (!matched) {
        result.push({
          text: chars[i],
          type: 'unknown',
          position: position++,
          lemma: chars[i].toLowerCase()
        });
        i++;
      }
    }
    this._tokens = result;
    return this._tokens;
  }

  countWords(text: string): number {
    return this.wordTokenize(text).filter(t => t.type === 'word').length;
  }

  countSentences(text: string): number {
    return this.sentenceTokenize(text).length;
  }

  countParagraphs(text: string): number {
    return this.paragraphTokenize(text).length;
  }

  countLines(text: string): number {
    return this.lineTokenize(text).length;
  }

  countCharacters(text: string, includeWhitespace: boolean = true): number {
    return includeWhitespace ? text.length : text.replace(/\s/g, '').length;
  }

  readingTime(text: string, wpm: number = 200): number {
    const words = this.countWords(text);
    return words / wpm;
  }

  fleschReadingEase(text: string): number {
    const sentences = this.sentenceTokenize(text);
    const words = this.wordTokenize(text).filter(t => t.type === 'word');
    if (sentences.length === 0 || words.length === 0) return 0;
    const totalSyllables = words.reduce((sum, w) => sum + this.countSyllables(w.text), 0);
    return 206.835 - 1.015 * (words.length / sentences.length) - 84.6 * (totalSyllables / words.length);
  }

  fleschKincaidGrade(text: string): number {
    const sentences = this.sentenceTokenize(text);
    const words = this.wordTokenize(text).filter(t => t.type === 'word');
    if (sentences.length === 0 || words.length === 0) return 0;
    const totalSyllables = words.reduce((sum, w) => sum + this.countSyllables(w.text), 0);
    return 0.39 * (words.length / sentences.length) + 11.8 * (totalSyllables / words.length) - 15.59;
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
