import { DataPacket, PacketMeta } from '../shared/types';

/** AST node type. */
export type ASTNodeType =
  | 'Program' | 'FunctionDeclaration' | 'ClassDeclaration' | 'VariableDeclaration'
  | 'IfStatement' | 'WhileStatement' | 'ForStatement' | 'ReturnStatement' | 'BlockStatement'
  | 'BinaryExpression' | 'UnaryExpression' | 'CallExpression' | 'MemberExpression'
  | 'Identifier' | 'Literal' | 'ArrayLiteral' | 'ObjectLiteral' | 'Parameter' | 'Empty';

/** An AST node. */
export interface ASTNode {
  type: ASTNodeType;
  value: unknown;
  children: ASTNode[];
  line: number;
  column: number;
  attributes: Record<string, unknown>;
}

/** Grammar rule. */
export interface GrammarRule {
  nonTerminal: string;
  production: string[];
  action: (children: ASTNode[]) => ASTNode;
}

/** Parser state. */
interface ParseState {
  tokens: Token[];
  position: number;
  errors: string[];
  ast: ASTNode | null;
}

/** Minimal token interface used by the parser. */
export interface Token {
  type: string;
  value: string;
  line: number;
  column: number;
  position: number;
}

/** Parser history record. */
interface ParseRecord {
  nodeCount: number;
  depth: number;
  errorCount: number;
  timestamp: number;
}

export class Parser {
  private _ast: ASTNode | null = null;
  private _grammar: Map<string, GrammarRule[]> = new Map();
  private _tokens: Token[] = [];
  private _position = 0;
  private _state: ParseState | null = null;
  private _history: ParseRecord[] = [];

  addRule(nonTerminal: string, production: string[], action: (children: ASTNode[]) => ASTNode): void {
    const rules = this._grammar.get(nonTerminal) ?? [];
    rules.push({ nonTerminal, production, action });
    this._grammar.set(nonTerminal, rules);
  }

  parse(tokens: Token[]): ASTNode {
    this._tokens = tokens;
    this._position = 0;
    this._state = { tokens, position: 0, errors: [], ast: null };
    const children: ASTNode[] = [];
    while (!this._isAtEnd()) {
      const stmt = this.parseStatement();
      if (stmt) children.push(stmt);
    }
    this._ast = this._makeNode('Program', null, children, 1, 1);
    this._state.ast = this._ast;
    this._history.push({
      nodeCount: this._countNodes(this._ast),
      depth: this._treeDepth(this._ast),
      errorCount: this._state.errors.length,
      timestamp: Date.now(),
    });
    return this._ast;
  }

  parseExpression(): ASTNode {
    return this.parseBinaryOp(0);
  }

  parseStatement(): ASTNode | null {
    const token = this._peek();
    if (!token) return null;
    switch (token.type) {
      case 'KEYWORD':
        if (token.value === 'function') return this.parseFunction();
        if (token.value === 'class') return this.parseClass();
        if (token.value === 'if') return this.parseIf();
        if (token.value === 'while') return this.parseWhile();
        if (token.value === 'for') return this.parseFor();
        if (token.value === 'return') return this.parseReturn();
        if (['let', 'const', 'var'].includes(token.value)) return this.parseDeclaration();
        break;
      case 'PUNCTUATION':
        if (token.value === '{') return this.parseBlock();
        break;
    }
    const expr = this.parseExpression();
    this.match('PUNCTUATION');
    return expr;
  }

  parseDeclaration(): ASTNode {
    const keyword = this.consume('KEYWORD');
    const name = this.consume('IDENTIFIER');
    let init: ASTNode | null = null;
    if (this.match('OPERATOR') && this._previous()?.value === '=') {
      init = this.parseExpression();
    }
    this.match('PUNCTUATION');
    return this._makeNode('VariableDeclaration', { name: name?.value, kind: keyword?.value }, init ? [init] : [], name?.line ?? 1, name?.column ?? 1);
  }

  parseFunction(): ASTNode {
    const fn = this.consume('KEYWORD');
    const name = this.consume('IDENTIFIER');
    this.consume('PUNCTUATION');
    const params: ASTNode[] = [];
    while (this._peek() && this._peek()!.value !== ')') {
      const p = this.consume('IDENTIFIER');
      if (p) params.push(this._makeNode('Parameter', { name: p.value }, [], p.line, p.column));
      if (this._peek()?.value === ',') this.consume('PUNCTUATION');
    }
    this.consume('PUNCTUATION');
    const body = this.parseBlock();
    return this._makeNode('FunctionDeclaration', { name: name?.value }, [...params, body], fn?.line ?? 1, fn?.column ?? 1);
  }

  parseClass(): ASTNode {
    const cls = this.consume('KEYWORD');
    const name = this.consume('IDENTIFIER');
    const body = this.parseBlock();
    return this._makeNode('ClassDeclaration', { name: name?.value }, [body], cls?.line ?? 1, cls?.column ?? 1);
  }

  parseIf(): ASTNode {
    const kw = this.consume('KEYWORD');
    this.consume('PUNCTUATION');
    const cond = this.parseExpression();
    this.consume('PUNCTUATION');
    const then = this.parseBlock();
    let els: ASTNode | null = null;
    if (this._peek()?.value === 'else') {
      this.consume('KEYWORD');
      els = this._peek()?.value === 'if' ? this.parseIf() : this.parseBlock();
    }
    return this._makeNode('IfStatement', null, els ? [cond, then, els] : [cond, then], kw?.line ?? 1, kw?.column ?? 1);
  }

  parseWhile(): ASTNode {
    const kw = this.consume('KEYWORD');
    this.consume('PUNCTUATION');
    const cond = this.parseExpression();
    this.consume('PUNCTUATION');
    const body = this.parseBlock();
    return this._makeNode('WhileStatement', null, [cond, body], kw?.line ?? 1, kw?.column ?? 1);
  }

  parseFor(): ASTNode {
    const kw = this.consume('KEYWORD');
    this.consume('PUNCTUATION');
    const init = this.parseDeclaration();
    const cond = this.parseExpression();
    this.match('PUNCTUATION');
    const update = this.parseExpression();
    this.consume('PUNCTUATION');
    const body = this.parseBlock();
    return this._makeNode('ForStatement', null, [init, cond, update, body], kw?.line ?? 1, kw?.column ?? 1);
  }

  parseBlock(): ASTNode {
    const open = this.consume('PUNCTUATION');
    const children: ASTNode[] = [];
    while (this._peek() && this._peek()!.value !== '}') {
      const stmt = this.parseStatement();
      if (stmt) children.push(stmt);
    }
    this.consume('PUNCTUATION');
    return this._makeNode('BlockStatement', null, children, open?.line ?? 1, open?.column ?? 1);
  }

  parseReturn(): ASTNode {
    const kw = this.consume('KEYWORD');
    let expr: ASTNode | null = null;
    if (this._peek() && this._peek()!.value !== ';') {
      expr = this.parseExpression();
    }
    this.match('PUNCTUATION');
    return this._makeNode('ReturnStatement', null, expr ? [expr] : [], kw?.line ?? 1, kw?.column ?? 1);
  }

  parseBinaryOp(precedence: number): ASTNode {
    let left = this.parseUnary();
    while (true) {
      const op = this._peek();
      if (!op || op.type !== 'OPERATOR') break;
      const opPrec = this._precedence(op.value);
      if (opPrec < precedence) break;
      this.consume('OPERATOR');
      const right = this.parseBinaryOp(opPrec + 1);
      left = this._makeNode('BinaryExpression', { op: op.value }, [left, right], op.line, op.column);
    }
    return left;
  }

  parseUnary(): ASTNode {
    const op = this._peek();
    if (op && op.type === 'OPERATOR' && ['-', '+', '!', '~'].includes(op.value)) {
      this.consume('OPERATOR');
      const operand = this.parseUnary();
      return this._makeNode('UnaryExpression', { op: op.value }, [operand], op.line, op.column);
    }
    return this.parsePrimary();
  }

  parsePrimary(): ASTNode {
    const token = this._peek();
    if (!token) return this._makeNode('Empty', null, [], 1, 1);
    if (token.type === 'NUMBER' || token.type === 'STRING' || token.type === 'KEYWORD') {
      this.advance();
      return this._makeNode('Literal', token.value, [], token.line, token.column);
    }
    if (token.type === 'IDENTIFIER') {
      this.advance();
      return this.parseCall(this.parseMemberAccess(this._makeNode('Identifier', token.value, [], token.line, token.column)));
    }
    if (token.value === '(') {
      this.consume('PUNCTUATION');
      const expr = this.parseExpression();
      this.consume('PUNCTUATION');
      return expr;
    }
    if (token.value === '[') return this.parseArrayLiteral();
    if (token.value === '{') return this.parseObjectLiteral();
    this.advance();
    return this._makeNode('Literal', token.value, [], token.line, token.column);
  }

  parseCall(callee: ASTNode): ASTNode {
    while (this._peek()?.value === '(') {
      this.consume('PUNCTUATION');
      const args: ASTNode[] = [];
      while (this._peek() && this._peek()!.value !== ')') {
        args.push(this.parseExpression());
        if (this._peek()?.value === ',') this.consume('PUNCTUATION');
      }
      this.consume('PUNCTUATION');
      callee = this._makeNode('CallExpression', null, [callee, ...args], callee.line, callee.column);
    }
    return callee;
  }

  parseMemberAccess(callee: ASTNode): ASTNode {
    while (this._peek()?.value === '.' || this._peek()?.value === '[') {
      if (this._peek()?.value === '.') {
        this.consume('PUNCTUATION');
        const prop = this.consume('IDENTIFIER');
        if (prop) callee = this._makeNode('MemberExpression', { property: prop.value }, [callee], prop.line, prop.column);
      } else {
        this.consume('PUNCTUATION');
        const idx = this.parseExpression();
        this.consume('PUNCTUATION');
        callee = this._makeNode('MemberExpression', { computed: true }, [callee, idx], callee.line, callee.column);
      }
    }
    return callee;
  }

  parseArrayLiteral(): ASTNode {
    const open = this.consume('PUNCTUATION');
    const elements: ASTNode[] = [];
    while (this._peek() && this._peek()!.value !== ']') {
      elements.push(this.parseExpression());
      if (this._peek()?.value === ',') this.consume('PUNCTUATION');
    }
    this.consume('PUNCTUATION');
    return this._makeNode('ArrayLiteral', null, elements, open?.line ?? 1, open?.column ?? 1);
  }

  parseObjectLiteral(): ASTNode {
    const open = this.consume('PUNCTUATION');
    const properties: ASTNode[] = [];
    while (this._peek() && this._peek()!.value !== '}') {
      const key = this.consume('IDENTIFIER') ?? this.consume('STRING');
      this.match('OPERATOR');
      const value = this.parseExpression();
      properties.push(this._makeNode('Parameter', { key: key?.value }, [value], key?.line ?? 1, key?.column ?? 1));
      if (this._peek()?.value === ',') this.consume('PUNCTUATION');
    }
    this.consume('PUNCTUATION');
    return this._makeNode('ObjectLiteral', null, properties, open?.line ?? 1, open?.column ?? 1);
  }

  match(expected: string): boolean {
    if (this._peek()?.type === expected) {
      this.advance();
      return true;
    }
    return false;
  }

  consume(type: string): Token | null {
    if (this._peek()?.type === type) return this.advance();
    if (this._state) this._state.errors.push(`Expected ${type} but got ${this._peek()?.type ?? 'EOF'}`);
    return null;
  }

  expect(type: string): Token {
    const token = this.consume(type);
    return token ?? { type: 'UNKNOWN', value: '', line: 0, column: 0, position: 0 };
  }

  buildAST(tokens: Token[]): ASTNode {
    return this.parse(tokens);
  }

  syntaxError(token: Token, expected: string): string {
    const msg = `Syntax error at line ${token.line}:${token.column}, expected ${expected} but got ${token.value}`;
    if (this._state) this._state.errors.push(msg);
    return msg;
  }

  toPacket(): DataPacket<{ ast: ASTNode | null; grammar: Map<string, GrammarRule[]>; tokens: Token[]; history: ParseRecord[] }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['compiler', 'Parser'],
      priority: 1,
      phase: 'parser',
    };
    return {
      id: `parser-${Date.now().toString(36)}`,
      payload: { ast: this._ast, grammar: this._grammar, tokens: this._tokens, history: this._history },
      metadata,
    };
  }

  reset(): void {
    this._ast = null;
    this._grammar = new Map();
    this._tokens = [];
    this._position = 0;
    this._state = null;
    this._history = [];
  }

  get nodeCount(): number { return this._ast ? this._countNodes(this._ast) : 0; }
  get ruleCount(): number { return this._grammar.size; }
  get errorCount(): number { return this._state?.errors.length ?? 0; }

  private _peek(): Token | null {
    return this._position < this._tokens.length ? this._tokens[this._position] : null;
  }

  private _previous(): Token | null {
    return this._position > 0 ? this._tokens[this._position - 1] : null;
  }

  private advance(): Token | null {
    if (!this._isAtEnd()) this._position++;
    return this._tokens[this._position - 1] ?? null;
  }

  private _isAtEnd(): boolean {
    const t = this._peek();
    return !t || t.type === 'EOF';
  }

  private _precedence(op: string): number {
    const prec: Record<string, number> = {
      '=': 1, '+=': 1, '-=': 1, '*=': 1, '/=': 1,
      '||': 2, '&&': 3,
      '==': 4, '!=': 4, '===': 4, '!==': 4,
      '<': 5, '>': 5, '<=': 5, '>=': 5,
      '+': 6, '-': 6,
      '*': 7, '/': 7, '%': 7,
    };
    return prec[op] ?? 0;
  }

  private _makeNode(type: ASTNodeType, value: unknown, children: ASTNode[], line: number, column: number): ASTNode {
    return { type, value, children, line, column, attributes: {} };
  }

  private _countNodes(node: ASTNode | null): number {
    if (!node) return 0;
    return 1 + node.children.reduce((s, c) => s + this._countNodes(c), 0);
  }

  private _treeDepth(node: ASTNode | null): number {
    if (!node) return 0;
    if (node.children.length === 0) return 1;
    return 1 + Math.max(...node.children.map(c => this._treeDepth(c)));
  }
}
