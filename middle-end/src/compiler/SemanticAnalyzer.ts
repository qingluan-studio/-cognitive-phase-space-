import { DataPacket, PacketMeta } from '../shared/types';

/** Symbol kind. */
export type SymbolKind = 'variable' | 'function' | 'class' | 'parameter' | 'module' | 'type' | 'enum';

/** Symbol in the symbol table. */
export interface Symbol {
  name: string;
  type: TypeType;
  scope: string;
  kind: SymbolKind;
  mutable: boolean;
  initialized: boolean;
  line: number;
  column: number;
}

/** Symbol table scope. */
export interface SymbolTable {
  symbols: Map<string, Symbol>;
  parent: SymbolTable | null;
  scope: string;
  children: SymbolTable[];
}

/** A type representation. */
export type TypeType =
  | 'number' | 'string' | 'boolean' | 'void' | 'any' | 'null' | 'undefined'
  | 'function' | 'array' | 'object' | 'union' | 'intersection' | 'generic';

/** A semantic error. */
export interface SemanticError {
  message: string;
  line: number;
  column: number;
  severity: 'error' | 'warning';
}

/** AST node interface (minimal). */
export interface ASTNode {
  type: string;
  value: unknown;
  children: ASTNode[];
  line: number;
  column: number;
  attributes: Record<string, unknown>;
}

/** Semantic analysis history record. */
interface SemanticRecord {
  symbols: number;
  scopes: number;
  errors: number;
  timestamp: number;
}

export class SemanticAnalyzer {
  private _symbols: Map<string, Symbol> = new Map();
  private _scopes: SymbolTable[] = [];
  private _types: Map<string, TypeType> = new Map();
  private _errors: SemanticError[] = [];
  private _history: SemanticRecord[] = [];
  private _currentScope: SymbolTable | null = null;

  analyze(ast: ASTNode): { symbols: Symbol[]; errors: SemanticError[] } {
    this._currentScope = this.enterScope('global');
    this.collectSymbols(ast);
    this.buildSymbolTable(ast);
    this.typeCheck(ast);
    return { symbols: Array.from(this._symbols.values()), errors: this._errors };
  }

  enterScope(name: string): SymbolTable {
    const scope: SymbolTable = {
      symbols: new Map(),
      parent: this._currentScope,
      scope: name,
      children: [],
    };
    if (this._currentScope) this._currentScope.children.push(scope);
    this._currentScope = scope;
    this._scopes.push(scope);
    return scope;
  }

  exitScope(): SymbolTable | null {
    const scope = this._currentScope;
    this._currentScope = this._currentScope?.parent ?? null;
    return scope;
  }

  declareSymbol(name: string, type: TypeType, kind: SymbolKind, mutable: boolean = true, line: number = 0, column: number = 0): Symbol | null {
    if (!this._currentScope) return null;
    if (this._currentScope.symbols.has(name)) {
      this._errors.push({
        message: `Symbol ${name} already declared in scope ${this._currentScope.scope}`,
        line, column, severity: 'error',
      });
      return null;
    }
    const symbol: Symbol = {
      name, type, scope: this._currentScope.scope, kind, mutable, initialized: false, line, column,
    };
    this._currentScope.symbols.set(name, symbol);
    this._symbols.set(`${this._currentScope.scope}:${name}`, symbol);
    return symbol;
  }

  lookupSymbol(name: string): Symbol | null {
    let scope = this._currentScope;
    while (scope) {
      const sym = scope.symbols.get(name);
      if (sym) return sym;
      scope = scope.parent;
    }
    return null;
  }

  resolveType(type: string): TypeType {
    const resolved = this._types.get(type);
    if (resolved) return resolved;
    if (['number', 'string', 'boolean', 'void', 'any', 'null', 'undefined'].includes(type)) {
      this._types.set(type, type as TypeType);
      return type as TypeType;
    }
    return 'any';
  }

  typeCheck(node: ASTNode): TypeType {
    switch (node.type) {
      case 'Literal':
        if (typeof node.value === 'number') return 'number';
        if (typeof node.value === 'string') return 'string';
        if (typeof node.value === 'boolean') return 'boolean';
        return 'any';
      case 'Identifier': {
        const sym = this.lookupSymbol(String(node.value));
        if (!sym) {
          this._errors.push({
            message: `Undefined identifier: ${String(node.value)}`,
            line: node.line, column: node.column, severity: 'error',
          });
          return 'any';
        }
        return sym.type;
      }
      case 'BinaryExpression':
        return this.checkBinaryOp(node.children[0], String((node.value as { op: string }).op), node.children[1]);
      case 'UnaryExpression':
        return this.checkBinaryOp(node.children[0], String((node.value as { op: string }).op), node.children[0]);
      case 'CallExpression':
        return this.checkFunctionCall(node.children[0], node.children.slice(1));
      case 'VariableDeclaration':
        return this.checkAssignment(node, node.children[0] ?? null);
      case 'ReturnStatement':
        return this.checkReturn(node, node.children[0] ?? null);
      case 'IfStatement':
        this.checkCondition(node.children[0]);
        return 'void';
      case 'WhileStatement':
      case 'ForStatement':
        this.checkLoop(node.children[node.children.length - 1]);
        return 'void';
      default:
        for (const child of node.children) this.typeCheck(child);
        return 'void';
    }
  }

  typeInference(expr: ASTNode): TypeType {
    return this.typeCheck(expr);
  }

  checkBinaryOp(left: ASTNode, op: string, right: ASTNode): TypeType {
    const lt = this.typeCheck(left);
    const rt = this.typeCheck(right);
    if (['+', '-', '*', '/', '%'].includes(op)) {
      if (lt === 'string' || rt === 'string') return 'string';
      return 'number';
    }
    if (['==', '!=', '===', '!==', '<', '>', '<=', '>='].includes(op)) return 'boolean';
    if (['&&', '||'].includes(op)) return lt === 'boolean' && rt === 'boolean' ? 'boolean' : lt;
    return 'any';
  }

  checkFunctionCall(func: ASTNode, args: ASTNode[]): TypeType {
    const funcType = this.typeCheck(func);
    for (const arg of args) this.typeCheck(arg);
    if (funcType === 'function') return 'any';
    return 'any';
  }

  checkAssignment(target: ASTNode, value: ASTNode | null): TypeType {
    const tt = this.typeCheck(target);
    if (value) {
      const vt = this.typeCheck(value);
      if (tt !== 'any' && vt !== 'any' && tt !== vt) {
        this._errors.push({
          message: `Type mismatch: cannot assign ${vt} to ${tt}`,
          line: target.line, column: target.column, severity: 'error',
        });
      }
    }
    return tt;
  }

  checkReturn(func: ASTNode, value: ASTNode | null): TypeType {
    if (value) return this.typeCheck(value);
    return 'void';
  }

  checkCondition(expr: ASTNode): TypeType {
    const t = this.typeCheck(expr);
    if (t !== 'boolean' && t !== 'any') {
      this._errors.push({
        message: `Condition must be boolean, got ${t}`,
        line: expr.line, column: expr.column, severity: 'warning',
      });
    }
    return t;
  }

  checkLoop(body: ASTNode): TypeType {
    return this.typeCheck(body);
  }

  inferReturnType(funcBody: ASTNode): TypeType {
    let returnType: TypeType = 'void';
    const visit = (node: ASTNode): void => {
      if (node.type === 'ReturnStatement' && node.children.length > 0) {
        returnType = this.typeCheck(node.children[0]);
      }
      for (const child of node.children) visit(child);
    };
    visit(funcBody);
    return returnType;
  }

  unifyTypes(t1: TypeType, t2: TypeType): TypeType {
    if (t1 === t2) return t1;
    if (t1 === 'any' || t2 === 'any') return t1 === 'any' ? t2 : t1;
    return 'union';
  }

  collectSymbols(ast: ASTNode): void {
    const visit = (node: ASTNode, _scope: SymbolTable): void => {
      if (node.type === 'VariableDeclaration') {
        const attrs = node.value as { name: string; kind: string };
        this.declareSymbol(attrs.name, 'any', 'variable', attrs.kind !== 'const', node.line, node.column);
      } else if (node.type === 'FunctionDeclaration') {
        const attrs = node.value as { name: string };
        this.declareSymbol(attrs.name, 'function', 'function', false, node.line, node.column);
      } else if (node.type === 'ClassDeclaration') {
        const attrs = node.value as { name: string };
        this.declareSymbol(attrs.name, 'object', 'class', false, node.line, node.column);
      } else if (node.type === 'Parameter') {
        const attrs = node.value as { name?: string; key?: string };
        this.declareSymbol(attrs.name ?? attrs.key ?? '_', 'any', 'parameter', true, node.line, node.column);
      }
      for (const child of node.children) visit(child, _scope);
    };
    visit(ast, this._currentScope ?? this.enterScope('global'));
  }

  buildSymbolTable(ast: ASTNode): SymbolTable {
    if (!this._currentScope) this._currentScope = this.enterScope('global');
    return this._currentScope;
  }

  toPacket(): DataPacket<{ symbols: Map<string, Symbol>; scopes: SymbolTable[]; types: Map<string, TypeType>; errors: SemanticError[]; history: SemanticRecord[] }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['compiler', 'SemanticAnalyzer'],
      priority: 1,
      phase: 'semantic_analyzer',
    };
    return {
      id: `semantic-${Date.now().toString(36)}`,
      payload: {
        symbols: this._symbols,
        scopes: this._scopes,
        types: this._types,
        errors: this._errors,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._symbols = new Map();
    this._scopes = [];
    this._types = new Map();
    this._errors = [];
    this._history = [];
    this._currentScope = null;
  }

  get symbolCount(): number { return this._symbols.size; }
  get scopeCount(): number { return this._scopes.length; }
  get errorCount(): number { return this._errors.length; }
  get warningCount(): number { return this._errors.filter(e => e.severity === 'warning').length; }

  private _recordHistory(): void {
    this._history.push({
      symbols: this._symbols.size,
      scopes: this._scopes.length,
      errors: this._errors.length,
      timestamp: Date.now(),
    });
  }
}
