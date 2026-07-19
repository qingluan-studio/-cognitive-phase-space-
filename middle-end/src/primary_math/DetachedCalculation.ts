/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 脱式计算引擎 —— 等号链上的递归下降
 * Detached Calculation Engine: Recursive Descent on the Equal-Sign Chain
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 脱式计算是算术走向代数的桥梁。每一步运算都必须保持等式平衡，
 * 优先级是它的礼法，括号是它的领地，分数与幂则是它的远亲。
 * 调度场算法将中缀转后缀，逆波兰机则将后缀还原为数。
 */

import { DataPacket } from '../shared/types';

export interface DetachedStep {
  readonly stepNumber: number;
  readonly expression: string;
  readonly operation: string;
  readonly result: number;
  readonly annotation: string;
}

export interface DetachedResult {
  readonly originalExpression: string;
  readonly steps: DetachedStep[];
  readonly finalAnswer: number;
  readonly properties: Record<string, unknown>;
}

export interface OperatorPrecedence {
  readonly operator: string;
  readonly priority: number;
  readonly associative: 'left' | 'right' | 'none';
}

interface RpnToken {
  readonly kind: 'num' | 'op' | 'lparen' | 'rparen';
  readonly value: string;
  readonly num?: number;
}

export class DetachedCalculation {
  private _results: DetachedResult[] = [];
  private _history: string[] = [];
  private _precedence: Map<string, OperatorPrecedence> = new Map();
  private _variables: Map<string, number> = new Map();
  private _counter = 0;

  constructor() {
    this._initPrecedence();
    this._recordHistory('DetachedCalculation engine initialized');
  }

  get results(): DetachedResult[] { return [...this._results]; }
  get variables(): Map<string, number> { return new Map(this._variables); }
  get history(): string[] { return [...this._history]; }

  /**
   * 脱式计算（递归下降解析器）
   * Full evaluation of an expression
   */
  evaluate(expression: string): DetachedResult {
    const cleaned = this._normalize(expression);
    const rpn = this.applyPrecedence(this.parseExpression(cleaned));
    const value = this.evaluateRPN(rpn);
    const steps = this.solveStepByStep(cleaned);
    const result: DetachedResult = {
      originalExpression: expression,
      steps,
      finalAnswer: value,
      properties: {
        tokenCount: rpn.length,
        hasVariables: /\b[a-zA-Z_]\w*\b/.test(cleaned),
        normalized: cleaned,
      },
    };
    this._results.push(result);
    this._recordHistory(`evaluate: ${expression} = ${value}`);
    return result;
  }

  /**
   * 词法分析
   * Lexical analysis into tokens
   */
  parseExpression(expr: string): string[] {
    const tokens: string[] = [];
    let i = 0;
    const s = expr.replace(/\s+/g, '');
    while (i < s.length) {
      const c = s[i];
      if (/[0-9.]/.test(c)) {
        let num = '';
        while (i < s.length && /[0-9.]/.test(s[i])) { num += s[i]; i++; }
        tokens.push(num);
      } else if (/[a-zA-Z_]/.test(c)) {
        let name = '';
        while (i < s.length && /[a-zA-Z0-9_]/.test(s[i])) { name += s[i]; i++; }
        tokens.push(name);
      } else if ('+-*/^%()'.includes(c)) {
        tokens.push(c);
        i++;
      } else {
        i++;
      }
    }
    this._recordHistory(`parseExpression: ${expr} → [${tokens.join(', ')}]`);
    return tokens;
  }

  /**
   * 中缀转后缀（调度场算法）
   * Infix to postfix via shunting-yard
   */
  applyPrecedence(tokens: string[]): string[] {
    const output: string[] = [];
    const stack: string[] = [];
    const classify = (t: string): RpnToken => {
      if (t === '(') return { kind: 'lparen', value: t };
      if (t === ')') return { kind: 'rparen', value: t };
      if (this._precedence.has(t)) return { kind: 'op', value: t };
      if (/^[0-9.]/.test(t)) return { kind: 'num', value: t, num: Number(t) };
      return { kind: 'num', value: t, num: this._variables.get(t) ?? NaN };
    };
    for (const tok of tokens) {
      const c = classify(tok);
      if (c.kind === 'num') {
        output.push(tok);
      } else if (c.kind === 'op') {
        const prec = this._precedence.get(c.value)!;
        while (stack.length > 0 && stack[stack.length - 1] !== '(') {
          const top = this._precedence.get(stack[stack.length - 1]);
          if (!top) break;
          if ((top.priority > prec.priority) ||
              (top.priority === prec.priority && prec.associative === 'left')) {
            output.push(stack.pop()!);
          } else {
            break;
          }
        }
        stack.push(c.value);
      } else if (c.kind === 'lparen') {
        stack.push('(');
      } else if (c.kind === 'rparen') {
        while (stack.length > 0 && stack[stack.length - 1] !== '(') {
          output.push(stack.pop()!);
        }
        if (stack.length > 0 && stack[stack.length - 1] === '(') stack.pop();
      }
    }
    while (stack.length > 0) output.push(stack.pop()!);
    this._recordHistory(`applyPrecedence: ${tokens.join(',')} → ${output.join(',')}`);
    return output;
  }

  /**
   * 逆波兰求值
   * Evaluate an RPN token stream
   */
  evaluateRPN(rpn: string[]): number {
    const stack: number[] = [];
    const lookup = (t: string): number => {
      if (/^-?[0-9.]+$/.test(t)) return Number(t);
      if (this._variables.has(t)) return this._variables.get(t)!;
      return NaN;
    };
    for (const tok of rpn) {
      if (this._precedence.has(tok)) {
        const b = stack.pop() ?? NaN;
        const a = stack.pop() ?? NaN;
        let r: number;
        switch (tok) {
          case '+': r = a + b; break;
          case '-': r = a - b; break;
          case '*': r = a * b; break;
          case '/': r = b === 0 ? NaN : a / b; break;
          case '%': r = b === 0 ? NaN : a % b; break;
          case '^': r = Math.pow(a, b); break;
          default: r = NaN;
        }
        stack.push(r);
      } else {
        stack.push(lookup(tok));
      }
    }
    const v = stack.length === 1 ? stack[0] : NaN;
    this._recordHistory(`evaluateRPN: ${rpn.join(',')} = ${v}`);
    return v;
  }

  /**
   * 逐步脱式
   * Step-by-step detached evaluation
   */
  solveStepByStep(expression: string): DetachedStep[] {
    const steps: DetachedStep[] = [];
    let current = this._normalize(expression);
    let stepNo = 0;
    // First: powers
    current = this._reduceOnce(current, /\^/, 'power', steps, () => ++stepNo);
    // Then: multiply/divide/modulo
    current = this._reduceOnce(current, /[*/%]/, 'mul-div', steps, () => ++stepNo);
    // Finally: add/subtract
    current = this._reduceOnce(current, /[+\-]/, 'add-sub', steps, () => ++stepNo);
    if (steps.length === 0) {
      steps.push({
        stepNumber: 1,
        expression: current,
        operation: 'identity',
        result: Number(current),
        annotation: '无需化简',
      });
    }
    return steps;
  }

  /**
   * 括号处理
   * Bracket resolution: evaluate innermost parentheses first
   */
  handleBrackets(expression: string): string {
    let s = this._normalize(expression);
    let guard = 0;
    while (s.includes('(') && guard++ < 50) {
      const inner = s.match(/\(([^()]+)\)/);
      if (!inner) break;
      const rpn = this.applyPrecedence(this.parseExpression(inner[1]));
      const v = this.evaluateRPN(rpn);
      s = s.replace(inner[0], String(v));
    }
    this._recordHistory(`handleBrackets: ${expression} → ${s}`);
    return s;
  }

  /**
   * 分数处理
   * Fraction handling: a/b → evaluated quotient
   */
  handleFractions(expression: string): string {
    const s = this._normalize(expression);
    const out = s.replace(/(\d+)\s*\/\s*(\d+)/g, (_m, a: string, b: string) => {
      const bn = Number(b);
      return bn === 0 ? 'NaN' : String(Number(a) / bn);
    });
    this._recordHistory(`handleFractions: ${expression} → ${out}`);
    return out;
  }

  /**
   * 幂运算处理
   * Power handling: a^b → evaluated power
   */
  handlePowers(expression: string): string {
    const s = this._normalize(expression);
    const out = s.replace(/(\d+(?:\.\d+)?)\s*\^\s*(\d+(?:\.\d+)?)/g, (_m, a: string, b: string) => {
      return String(Math.pow(Number(a), Number(b)));
    });
    this._recordHistory(`handlePowers: ${expression} → ${out}`);
    return out;
  }

  /**
   * 表达式验证
   * Validate expression: balanced parentheses, valid chars
   */
  validateExpression(expr: string): boolean {
    const s = expr.replace(/\s+/g, '');
    if (s.length === 0) return false;
    if (!/^[0-9a-zA-Z_+\-*/^%().]+$/.test(s)) return false;
    let depth = 0;
    for (const c of s) {
      if (c === '(') depth++;
      if (c === ')') depth--;
      if (depth < 0) return false;
    }
    if (depth !== 0) return false;
    if (/[+\-*/^%]{2,}/.test(s) && !/--/.test(s)) return false;
    return true;
  }

  /**
   * 设置变量
   * Set a named variable's value
   */
  setVariable(name: string, value: number): void {
    this._variables.set(name, value);
    this._recordHistory(`setVariable: ${name} = ${value}`);
  }

  /**
   * 序列化为 DataPacket
   * Serialize to DataPacket
   */
  toPacket(): DataPacket<{ results: DetachedResult[]; variables: Record<string, number> }> {
    const vars: Record<string, number> = {};
    this._variables.forEach((v, k) => { vars[k] = v; });
    const packet: DataPacket<{ results: DetachedResult[]; variables: Record<string, number> }> = {
      id: `detached-calc-${(++this._counter).toString(36)}`,
      payload: { results: this._results, variables: vars },
      metadata: {
        createdAt: Date.now(),
        route: ['primary_math', 'DetachedCalculation'],
        priority: 2,
        phase: 'detached-calculation',
      },
    };
    this._recordHistory(`toPacket: emitted ${packet.id}`);
    return packet;
  }

  /**
   * 重置引擎
   * Reset engine state
   */
  reset(): void {
    this._results = [];
    this._history = [];
    this._variables.clear();
    this._counter = 0;
    this._initPrecedence();
    this._recordHistory('DetachedCalculation engine reset');
  }

  // ─────────────── private helpers ───────────────

  private _recordHistory(entry: string): void {
    this._history.push(`[${new Date().toISOString()}] ${entry}`);
    if (this._history.length > 500) this._history.shift();
  }

  private _initPrecedence(): void {
    this._precedence.clear();
    const entries: OperatorPrecedence[] = [
      { operator: '+', priority: 1, associative: 'left' },
      { operator: '-', priority: 1, associative: 'left' },
      { operator: '*', priority: 2, associative: 'left' },
      { operator: '/', priority: 2, associative: 'left' },
      { operator: '%', priority: 2, associative: 'left' },
      { operator: '^', priority: 3, associative: 'right' },
    ];
    for (const e of entries) this._precedence.set(e.operator, e);
  }

  private _normalize(expr: string): string {
    return expr.replace(/\s+/g, '').replace(/--/g, '+');
  }

  private _reduceOnce(
    s: string,
    opRegex: RegExp,
    label: string,
    steps: DetachedStep[],
    nextStep: () => number,
  ): string {
    let current = s;
    let guard = 0;
    while (guard++ < 100) {
      const m = current.match(new RegExp(`([0-9.]+)\\s*(${opRegex.source})\\s*([0-9.]+)`));
      if (!m) break;
      const a = Number(m[1]);
      const b = Number(m[3]);
      const op = m[2];
      let r: number;
      switch (op) {
        case '^': r = Math.pow(a, b); break;
        case '*': r = a * b; break;
        case '/': r = b === 0 ? NaN : a / b; break;
        case '%': r = b === 0 ? NaN : a % b; break;
        case '+': r = a + b; break;
        case '-': r = a - b; break;
        default: r = NaN;
      }
      const before = current;
      current = current.replace(m[0], String(r));
      steps.push({
        stepNumber: nextStep(),
        expression: before,
        operation: label,
        result: r,
        annotation: `${a} ${op} ${b} = ${r}`,
      });
    }
    return current;
  }
}
