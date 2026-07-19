import { DataPacket, PacketMeta } from '../shared/types';

/** Token type. */
export type TokenType =
  | 'IDENTIFIER' | 'NUMBER' | 'STRING' | 'KEYWORD' | 'OPERATOR'
  | 'PUNCTUATION' | 'COMMENT' | 'WHITESPACE' | 'EOF' | 'UNKNOWN';

/** A single token in the source stream. */
export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
  position: number;
}

/** A pattern that recognizes a particular token type. */
export interface TokenPattern {
  type: TokenType;
  regex: RegExp;
  priority: number;
}

/** Internal lexer state. */
interface LexState {
  source: string;
  position: number;
  line: number;
  column: number;
  tokens: Token[];
  errors: string[];
}

/** Source map entry. */
export interface SourceMapEntry {
  tokenIndex: number;
  line: number;
  column: number;
  position: number;
}

/** Lexer history record. */
interface LexRecord {
  sourceLength: number;
  tokenCount: number;
  errorCount: number;
  timestamp: number;
}

export class Lexer {
  private _tokens: Token[] = [];
  private _patterns: TokenPattern[] = [];
  private _keywords: Map<string, TokenType> = new Map();
  private _state: LexState | null = null;
  private _history: LexRecord[] = [];

  constructor() {
    this._initDefaultPatterns();
    this._initDefaultKeywords();
  }

  addPattern(type: TokenType, regex: RegExp): void {
    this._patterns.push({ type, regex, priority: this._patterns.length });
    this._patterns.sort((a, b) => b.priority - a.priority);
  }

  addKeyword(word: string, type: TokenType): void {
    this._keywords.set(word, type);
  }

  tokenize(source: string): Token[] {
    this._state = {
      source,
      position: 0,
      line: 1,
      column: 1,
      tokens: [],
      errors: [],
    };
    while (this._state.position < source.length) {
      const before = this._state.position;
      this.skipWhitespace();
      this.skipComment();
      if (this._state.position >= source.length) break;
      if (this._state.position === before) {
        const token = this._nextToken();
        if (token) this._state.tokens.push(token);
        else {
          this._state.errors.push(`Unexpected character at line ${this._state.line}:${this._state.column}`);
          this._state.position++;
        }
      }
    }
    this._state.tokens.push({
      type: 'EOF', value: '', line: this._state.line, column: this._state.column, position: this._state.position,
    });
    this._tokens = this._state.tokens;
    this._history.push({
      sourceLength: source.length,
      tokenCount: this._tokens.length,
      errorCount: this._state.errors.length,
      timestamp: Date.now(),
    });
    return this._tokens;
  }

  nextToken(): Token | null {
    if (!this._state || this._state.position >= this._state.source.length) return null;
    const token = this._nextToken();
    if (token) this._state.tokens.push(token);
    return token;
  }

  peek(): Token | null {
    if (!this._state || this._state.position >= this._state.source.length) return null;
    const savedState = { ...this._state };
    const token = this._nextToken();
    this._state = savedState;
    return token;
  }

  skipWhitespace(): void {
    if (!this._state) return;
    const regex = /\s/;
    while (this._state.position < this._state.source.length && regex.test(this._state.source[this._state.position])) {
      if (this._state.source[this._state.position] === '\n') {
        this._state.line++;
        this._state.column = 1;
      } else {
        this._state.column++;
      }
      this._state.position++;
    }
  }

  skipComment(): void {
    if (!this._state) return;
    const src = this._state.source;
    const pos = this._state.position;
    if (src[pos] === '/' && src[pos + 1] === '/') {
      while (pos < src.length && src[this._state.position] !== '\n') this._state.position++;
    } else if (src[pos] === '/' && src[pos + 1] === '*') {
      this._state.position += 2;
      while (this._state.position < src.length - 1 && !(src[this._state.position] === '*' && src[this._state.position + 1] === '/')) {
        if (src[this._state.position] === '\n') { this._state.line++; this._state.column = 1; }
        else this._state.column++;
        this._state.position++;
      }
      this._state.position += 2;
    }
  }

  readString(): Token | null {
    if (!this._state) return null;
    const src = this._state.source;
    const start = this._state.position;
    const line = this._state.line;
    const col = this._state.column;
    const quote = src[this._state.position];
    if (quote !== '"' && quote !== "'") return null;
    this._state.position++;
    this._state.column++;
    let value = quote;
    while (this._state.position < src.length && src[this._state.position] !== quote) {
      if (src[this._state.position] === '\\') {
        value += src[this._state.position] + (src[this._state.position + 1] ?? '');
        this._state.position += 2;
        this._state.column += 2;
      } else {
        value += src[this._state.position];
        if (src[this._state.position] === '\n') { this._state.line++; this._state.column = 1; }
        else this._state.column++;
        this._state.position++;
      }
    }
    if (this._state.position < src.length) {
      value += quote;
      this._state.position++;
      this._state.column++;
    }
    return { type: 'STRING', value, line, column: col, position: start };
  }

  readNumber(): Token | null {
    if (!this._state) return null;
    const src = this._state.source;
    const start = this._state.position;
    const line = this._state.line;
    const col = this._state.column;
    let value = '';
    let hasDot = false;
    while (this._state.position < src.length) {
      const c = src[this._state.position];
      if (/[0-9]/.test(c)) value += c;
      else if (c === '.' && !hasDot) { value += c; hasDot = true; }
      else break;
      this._state.position++;
      this._state.column++;
    }
    if (value.length === 0) return null;
    return { type: 'NUMBER', value, line, column: col, position: start };
  }

  readIdentifier(): Token | null {
    if (!this._state) return null;
    const src = this._state.source;
    const start = this._state.position;
    const line = this._state.line;
    const col = this._state.column;
    let value = '';
    while (this._state.position < src.length) {
      const c = src[this._state.position];
      if (/[a-zA-Z0-9_$]/.test(c)) {
        value += c;
        this._state.position++;
        this._state.column++;
      } else break;
    }
    if (value.length === 0) return null;
    const type = this._keywords.get(value) ?? 'IDENTIFIER';
    return { type, value, line, column: col, position: start };
  }

  matchPattern(input: string, patterns: TokenPattern[]): Token | null {
    for (const pattern of patterns) {
      const match = input.match(pattern.regex);
      if (match && match.index === 0) {
        return {
          type: pattern.type,
          value: match[0],
          line: this._state?.line ?? 1,
          column: this._state?.column ?? 1,
          position: this._state?.position ?? 0,
        };
      }
    }
    return null;
  }

  errorRecovery(state: LexState, error: string): Token {
    state.errors.push(error);
    state.position++;
    return { type: 'UNKNOWN', value: '?', line: state.line, column: state.column, position: state.position };
  }

  getTokenStream(source: string): Iterable<Token> {
    const tokens = this.tokenize(source);
    return tokens;
  }

  getSourceMap(tokens: Token[]): SourceMapEntry[] {
    return tokens.map((t, i) => ({
      tokenIndex: i,
      line: t.line,
      column: t.column,
      position: t.position,
    }));
  }

  toPacket(): DataPacket<{ tokens: Token[]; patterns: TokenPattern[]; keywords: Map<string, TokenType>; history: LexRecord[] }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['compiler', 'Lexer'],
      priority: 1,
      phase: 'lexer',
    };
    return {
      id: `lexer-${Date.now().toString(36)}`,
      payload: {
        tokens: this._tokens,
        patterns: this._patterns,
        keywords: this._keywords,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._tokens = [];
    this._patterns = [];
    this._keywords = new Map();
    this._state = null;
    this._history = [];
    this._initDefaultPatterns();
    this._initDefaultKeywords();
  }

  get tokenCount(): number { return this._tokens.length; }
  get patternCount(): number { return this._patterns.length; }
  get keywordCount(): number { return this._keywords.size; }
  get errorCount(): number { return this._history.reduce((s, h) => s + h.errorCount, 0); }

  private _initDefaultPatterns(): void {
    this._patterns = [
      { type: 'NUMBER', regex: /^[0-9]+(\.[0-9]+)?/, priority: 100 },
      { type: 'STRING', regex: /^"[^"]*"|^'[^']'/, priority: 90 },
      { type: 'OPERATOR', regex: /^[+\-*/%=<>!&|^~?:]+/, priority: 80 },
      { type: 'PUNCTUATION', regex: /^[()[\]{}.,;]/, priority: 70 },
      { type: 'IDENTIFIER', regex: /^[a-zA-Z_$][a-zA-Z0-9_$]*/, priority: 60 },
      { type: 'UNKNOWN', regex: /^./, priority: 0 },
    ];
  }

  private _initDefaultKeywords(): void {
    const kw: TokenType = 'KEYWORD';
    for (const w of ['if', 'else', 'while', 'for', 'do', 'return', 'break', 'continue', 'function', 'class', 'let', 'const', 'var', 'true', 'false', 'null', 'undefined', 'this', 'new', 'try', 'catch', 'finally', 'throw', 'import', 'export', 'default', 'extends', 'implements', 'interface', 'enum', 'type']) {
      this._keywords.set(w, kw);
    }
  }

  private _nextToken(): Token | null {
    if (!this._state) return null;
    const src = this._state.source;
    const c = src[this._state.position];
    if (c === '"' || c === "'") return this.readString();
    if (/[0-9]/.test(c)) return this.readNumber();
    if (/[a-zA-Z_$]/.test(c)) return this.readIdentifier();
    const remaining = src.slice(this._state.position);
    const token = this.matchPattern(remaining, this._patterns);
    if (token) {
      this._state.position += token.value.length;
      this._state.column += token.value.length;
      return token;
    }
    return null;
  }
}
