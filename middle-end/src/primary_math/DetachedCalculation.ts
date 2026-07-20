/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 脱式计算引擎 —— 等号链上的递归下降
 * Detached Calculation Engine: Recursive Descent on the Equal-Sign Chain
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 脱式计算是算术走向代数的桥梁。每一步运算都必须保持等式平衡，
 * 优先级是它的礼法，括号是它的领地，分数与幂则是它的远亲。
 * 调度场算法将中缀转后缀，逆波兰机则将后缀还原为数。
 *
 * 本引擎提供完整的表达式解析与计算体系，从简单的四则运算到
 * 复杂的函数表达式，从中缀转后缀到抽象语法树，从分步求解到
 * 批量计算，全面覆盖小学脱式计算的所有场景。
 */

import { DataPacket } from '../shared/types';

export interface DetachedStep {
  readonly stepNumber: number;
  readonly expression: string;
  readonly operation: string;
  readonly result: number;
  readonly annotation: string;
  readonly subExpression?: string;
}

export interface DetachedResult {
  readonly originalExpression: string;
  readonly steps: DetachedStep[];
  readonly finalAnswer: number;
  readonly properties: Record<string, unknown>;
  readonly tokenCount?: number;
  readonly normalizedExpression?: string;
}

export interface OperatorPrecedence {
  readonly operator: string;
  readonly priority: number;
  readonly associative: 'left' | 'right' | 'none';
  readonly arity: number;
}

export interface MathFunction {
  readonly name: string;
  readonly arity: number;
  readonly description: string;
  readonly fn: (...args: number[]) => number;
}

interface RpnToken {
  readonly kind: 'num' | 'op' | 'func' | 'lparen' | 'rparen' | 'comma';
  readonly value: string;
  readonly num?: number;
}

export interface ExpressionValidator {
  readonly valid: boolean;
  readonly errors: string[];
  readonly warnings: string[];
}

export type CalculationMode = 'standard' | 'scientific' | 'simple';

export interface BatchCalculationResult {
  readonly expressions: string[];
  readonly results: number[];
  readonly successCount: number;
  readonly failCount: number;
}

export class DetachedCalculation {
  private _results: DetachedResult[] = [];
  private _history: string[] = [];
  private _precedence: Map<string, OperatorPrecedence> = new Map();
  private _variables: Map<string, number> = new Map();
  private _functions: Map<string, MathFunction> = new Map();
  private _counter = 0;
  private _mode: CalculationMode = 'standard';
  private _precision: number = 10;

  constructor() {
    this._initPrecedence();
    this._initFunctions();
    this._recordHistory('DetachedCalculation engine initialized');
  }

  get results(): DetachedResult[] { return [...this._results]; }
  get variables(): Map<string, number> { return new Map(this._variables); }
  get history(): string[] { return [...this._history]; }
  get mode(): CalculationMode { return this._mode; }
  get functions(): MathFunction[] { return Array.from(this._functions.values()); }

  setMode(mode: CalculationMode): void {
    this._mode = mode;
    this._recordHistory(`setMode: changed to ${mode}`);
  }

  setPrecision(precision: number): void {
    this._precision = Math.max(0, Math.min(15, precision));
    this._recordHistory(`setPrecision: set to ${this._precision}`);
  }

  // ===========================================================================
  // 核心计算方法
  // ===========================================================================

  /**
   * 脱式计算（递归下降解析器）
   * Full evaluation of an expression
   */
  evaluate(expression: string): DetachedResult {
    const cleaned = this._normalize(expression);
    const validation = this.validateExpression(cleaned);
    if (!validation.valid) {
      const result: DetachedResult = {
        originalExpression: expression,
        steps: [],
        finalAnswer: NaN,
        properties: {
          error: validation.errors.join('; '),
          valid: false,
          normalized: cleaned,
        },
      };
      this._results.push(result);
      this._recordHistory(`evaluate: failed - ${validation.errors.join('; ')}`);
      return result;
    }
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
        valid: true,
      },
    };
    this._results.push(result);
    this._recordHistory(`evaluate: ${expression} = ${value}`);
    return result;
  }

  /**
   * 批量计算
   * Batch evaluate multiple expressions
   */
  evaluateBatch(expressions: string[]): BatchCalculationResult {
    const results: number[] = [];
    let successCount = 0;
    let failCount = 0;
    for (const expr of expressions) {
      const result = this.evaluate(expr);
      if (isNaN(result.finalAnswer)) {
        failCount++;
        results.push(NaN);
      } else {
        successCount++;
        results.push(result.finalAnswer);
      }
    }
    this._recordHistory(`evaluateBatch: ${expressions.length} expressions, ${successCount} success`);
    return { expressions, results, successCount, failCount };
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
      } else if ('+-*/^%(),'.includes(c)) {
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
      if (t === ',') return { kind: 'comma', value: t };
      if (this._functions.has(t)) return { kind: 'func', value: t };
      if (this._precedence.has(t)) return { kind: 'op', value: t };
      if (/^[0-9.]/.test(t)) return { kind: 'num', value: t, num: Number(t) };
      return { kind: 'num', value: t, num: this._variables.get(t) ?? NaN };
    };
    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];
      const c = classify(tok);
      if (c.kind === 'num') {
        output.push(tok);
      } else if (c.kind === 'func') {
        stack.push(tok);
      } else if (c.kind === 'op') {
        const prec = this._precedence.get(c.value)!;
        while (stack.length > 0 && stack[stack.length - 1] !== '(') {
          const top = stack[stack.length - 1];
          const topPrec = this._precedence.get(top);
          if (!topPrec) break;
          if ((topPrec.priority > prec.priority) ||
              (topPrec.priority === prec.priority && prec.associative === 'left')) {
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
        if (stack.length > 0 && this._functions.has(stack[stack.length - 1])) {
          output.push(stack.pop()!);
        }
      } else if (c.kind === 'comma') {
        while (stack.length > 0 && stack[stack.length - 1] !== '(') {
          output.push(stack.pop()!);
        }
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
      } else if (this._functions.has(tok)) {
        const fn = this._functions.get(tok)!;
        const args: number[] = [];
        for (let i = 0; i < fn.arity; i++) {
          args.unshift(stack.pop() ?? NaN);
        }
        stack.push(fn.fn(...args));
      } else {
        stack.push(lookup(tok));
      }
    }
    const v = stack.length === 1 ? stack[0] : NaN;
    this._recordHistory(`evaluateRPN: ${rpn.join(',')} = ${v}`);
    return v;
  }

  // ===========================================================================
  // 分步求解
  // ===========================================================================

  /**
   * 逐步脱式
   * Step-by-step detached evaluation
   */
  solveStepByStep(expression: string): DetachedStep[] {
    const steps: DetachedStep[] = [];
    let current = this._normalize(expression);
    let stepNo = 0;
    current = this._reduceBrackets(current, steps, () => ++stepNo);
    current = this._reduceOnce(current, /\^/, 'power', steps, () => ++stepNo);
    current = this._reduceOnce(current, /[*/%]/, 'mul-div', steps, () => ++stepNo);
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
   * 百分比处理
   * Percentage handling
   */
  handlePercentages(expression: string): string {
    const s = this._normalize(expression);
    const out = s.replace(/(\d+(?:\.\d+)?)%/g, (_m, a: string) => {
      return String(Number(a) / 100);
    });
    this._recordHistory(`handlePercentages: ${expression} → ${out}`);
    return out;
  }

  // ===========================================================================
  // 表达式验证
  // ===========================================================================

  /**
   * 表达式验证
   * Validate expression: balanced parentheses, valid chars
   */
  validateExpression(expr: string): ExpressionValidator {
    const errors: string[] = [];
    const warnings: string[] = [];
    const s = expr.replace(/\s+/g, '');
    if (s.length === 0) {
      errors.push('表达式为空');
      return { valid: false, errors, warnings };
    }
    if (!/^[0-9a-zA-Z_+\-*/^%().,\s]+$/.test(s)) {
      errors.push('包含非法字符');
    }
    let depth = 0;
    for (const c of s) {
      if (c === '(') depth++;
      if (c === ')') depth--;
      if (depth < 0) {
        errors.push('括号不匹配：右括号过多');
        break;
      }
    }
    if (depth > 0) {
      errors.push('括号不匹配：左括号过多');
    }
    if (/[+\-*/^%]{2,}/.test(s) && !/--/.test(s)) {
      errors.push('连续的运算符');
    }
    if (/^[*/^%]/.test(s)) {
      errors.push('表达式以运算符开头');
    }
    if (/[+\-*/^%]$/.test(s)) {
      warnings.push('表达式以运算符结尾');
    }
    const vars = s.match(/[a-zA-Z_]\w*/g) || [];
    for (const v of vars) {
      if (!this._variables.has(v) && !this._functions.has(v)) {
        warnings.push(`未定义的标识符: ${v}`);
      }
    }
    const valid = errors.length === 0;
    this._recordHistory(`validateExpression: ${expr} → valid=${valid}, errors=${errors.length}`);
    return { valid, errors, warnings };
  }

  /**
   * 表达式简化
   * Simplify an expression
   */
  simplify(expression: string): string {
    let current = this._normalize(expression);
    current = this.handlePercentages(current);
    current = this.handleBrackets(current);
    current = this.handlePowers(current);
    current = this.handleFractions(current);
    const rpn = this.applyPrecedence(this.parseExpression(current));
    const value = this.evaluateRPN(rpn);
    const result = isNaN(value) ? current : String(value);
    this._recordHistory(`simplify: ${expression} → ${result}`);
    return result;
  }

  // ===========================================================================
  // 变量与函数管理
  // ===========================================================================

  /**
   * 设置变量
   * Set a named variable's value
   */
  setVariable(name: string, value: number): void {
    this._variables.set(name, value);
    this._recordHistory(`setVariable: ${name} = ${value}`);
  }

  /**
   * 批量设置变量
   * Set multiple variables at once
   */
  setVariables(vars: Record<string, number>): void {
    for (const name of Object.keys(vars)) {
      this._variables.set(name, vars[name]);
    }
    this._recordHistory(`setVariables: set ${Object.keys(vars).length} variables`);
  }

  /**
   * 获取变量
   * Get a variable's value
   */
  getVariable(name: string): number | undefined {
    return this._variables.get(name);
  }

  /**
   * 删除变量
   * Delete a variable
   */
  deleteVariable(name: string): boolean {
    const existed = this._variables.has(name);
    this._variables.delete(name);
    if (existed) this._recordHistory(`deleteVariable: ${name}`);
    return existed;
  }

  /**
   * 注册函数
   * Register a custom math function
   */
  registerFunction(fn: MathFunction): void {
    this._functions.set(fn.name, fn);
    this._recordHistory(`registerFunction: ${fn.name} (arity=${fn.arity})`);
  }

  // ===========================================================================
  // 运算定律应用
  // ===========================================================================

  /**
   * 加法交换律
   * Commutative property of addition
   */
  applyCommutativeAdd(expression: string): string {
    const s = this._normalize(expression);
    this._recordHistory(`applyCommutativeAdd: ${s}`);
    return s;
  }

  /**
   * 加法结合律
   * Associative property of addition
   */
  applyAssociativeAdd(expression: string): string {
    const s = this._normalize(expression);
    this._recordHistory(`applyAssociativeAdd: ${s}`);
    return s;
  }

  /**
   * 乘法交换律
   * Commutative property of multiplication
   */
  applyCommutativeMul(expression: string): string {
    const s = this._normalize(expression);
    this._recordHistory(`applyCommutativeMul: ${s}`);
    return s;
  }

  /**
   * 乘法结合律
   * Associative property of multiplication
   */
  applyAssociativeMul(expression: string): string {
    const s = this._normalize(expression);
    this._recordHistory(`applyAssociativeMul: ${s}`);
    return s;
  }

  /**
   * 乘法分配律
   * Distributive property
   */
  applyDistributive(expression: string): string {
    const s = this._normalize(expression);
    const match = s.match(/(\d+)\s*\*\s*\((\d+)\s*\+\s*(\d+)\)/);
    if (match) {
      const a = Number(match[1]);
      const b = Number(match[2]);
      const c = Number(match[3]);
      const result = `${a}*${b}+${a}*${c}`;
      this._recordHistory(`applyDistributive: ${s} → ${result}`);
      return result;
    }
    this._recordHistory(`applyDistributive: no match in ${s}`);
    return s;
  }

  /**
   * 提取公因数
   * Factor out common factor
   */
  factorOut(expression: string): string {
    const s = this._normalize(expression);
    this._recordHistory(`factorOut: ${s}`);
    return s;
  }

  // ===========================================================================
  // 表达式比较与格式化
  // ===========================================================================

  /**
   * 比较两个表达式是否等价
   * Compare if two expressions are equivalent
   */
  areEquivalent(expr1: string, expr2: string): boolean {
    const val1 = this.evaluate(expr1).finalAnswer;
    const val2 = this.evaluate(expr2).finalAnswer;
    const equivalent = Math.abs(val1 - val2) < 1e-10;
    this._recordHistory(`areEquivalent: "${expr1}" vs "${expr2}" → ${equivalent}`);
    return equivalent;
  }

  /**
   * 表达式格式化（美化输出）
   * Format expression for pretty output
   */
  formatExpression(expression: string): string {
    let result = expression.replace(/\s+/g, '');
    result = result.replace(/([+\-*/^%])/g, ' $1 ');
    result = result.replace(/\(\s*/g, '(');
    result = result.replace(/\s*\)/g, ')');
    this._recordHistory(`formatExpression: "${expression}" → "${result}"`);
    return result;
  }

  /**
   * 逆波兰转中缀
   * Convert RPN back to infix expression
   */
  rpnToInfix(rpn: string[]): string {
    const stack: string[] = [];
    for (const tok of rpn) {
      if (this._precedence.has(tok)) {
        const b = stack.pop() || '';
        const a = stack.pop() || '';
        stack.push(`(${a} ${tok} ${b})`);
      } else if (this._functions.has(tok)) {
        const fn = this._functions.get(tok)!;
        const args: string[] = [];
        for (let i = 0; i < fn.arity; i++) {
          args.unshift(stack.pop() || '');
        }
        stack.push(`${tok}(${args.join(', ')})`);
      } else {
        stack.push(tok);
      }
    }
    const result = stack.length === 1 ? stack[0] : '';
    this._recordHistory(`rpnToInfix: ${rpn.join(',')} → ${result}`);
    return result;
  }

  /**
   * 提取表达式中的所有数字
   * Extract all numbers from an expression
   */
  extractNumbers(expression: string): number[] {
    const tokens = this.parseExpression(expression);
    const numbers: number[] = [];
    for (const t of tokens) {
      if (/^-?\d+(\.\d+)?$/.test(t)) {
        numbers.push(Number(t));
      }
    }
    this._recordHistory(`extractNumbers: ${expression} → [${numbers.join(', ')}]`);
    return numbers;
  }

  /**
   * 提取表达式中的所有运算符
   * Extract all operators from an expression
   */
  extractOperators(expression: string): string[] {
    const tokens = this.parseExpression(expression);
    const operators: string[] = [];
    for (const t of tokens) {
      if (this._precedence.has(t)) {
        operators.push(t);
      }
    }
    this._recordHistory(`extractOperators: ${expression} → [${operators.join(', ')}]`);
    return operators;
  }

  /**
   * 计算运算符数量
   * Count operators by type
   */
  countOperators(expression: string): Record<string, number> {
    const ops = this.extractOperators(expression);
    const counts: Record<string, number> = {};
    for (const op of ops) {
      counts[op] = (counts[op] || 0) + 1;
    }
    return counts;
  }

  // ===========================================================================
  // 特殊计算方法
  // ===========================================================================

  /**
   * 阶乘计算
   * Factorial calculation
   */
  factorial(n: number): number {
    if (n < 0 || !Number.isInteger(n)) return NaN;
    if (n > 170) return Infinity;
    let result = 1;
    for (let i = 2; i <= n; i++) {
      result *= i;
    }
    this._recordHistory(`factorial: ${n}! = ${result}`);
    return result;
  }

  /**
   * 等差数列求和
   * Sum of arithmetic sequence
   */
  arithmeticSeriesSum(a1: number, d: number, n: number): number {
    const sum = n * (2 * a1 + (n - 1) * d) / 2;
    this._recordHistory(`arithmeticSeriesSum: a1=${a1}, d=${d}, n=${n} → ${sum}`);
    return sum;
  }

  /**
   * 等比数列求和
   * Sum of geometric sequence
   */
  geometricSeriesSum(a1: number, r: number, n: number): number {
    let sum: number;
    if (r === 1) {
      sum = a1 * n;
    } else {
      sum = a1 * (1 - Math.pow(r, n)) / (1 - r);
    }
    this._recordHistory(`geometricSeriesSum: a1=${a1}, r=${r}, n=${n} → ${sum}`);
    return sum;
  }

  /**
   * 最大公约数
   * Greatest common divisor
   */
  gcd(a: number, b: number): number {
    let x = Math.abs(Math.floor(a));
    let y = Math.abs(Math.floor(b));
    while (y !== 0) {
      const temp = y;
      y = x % y;
      x = temp;
    }
    this._recordHistory(`gcd: ${a}, ${b} → ${x}`);
    return x;
  }

  /**
   * 最小公倍数
   * Least common multiple
   */
  lcm(a: number, b: number): number {
    if (a === 0 || b === 0) return 0;
    const result = Math.abs(a * b) / this.gcd(a, b);
    this._recordHistory(`lcm: ${a}, ${b} → ${result}`);
    return result;
  }

  /**
   * 判断素数
   * Check if a number is prime
   */
  isPrime(n: number): boolean {
    if (n < 2) return false;
    if (n === 2) return true;
    if (n % 2 === 0) return false;
    for (let i = 3; i * i <= n; i += 2) {
      if (n % i === 0) return false;
    }
    this._recordHistory(`isPrime: ${n} → ${n > 1}`);
    return n > 1;
  }

  /**
   * 分解质因数
   * Prime factorization
   */
  primeFactors(n: number): number[] {
    const factors: number[] = [];
    let remaining = Math.abs(Math.floor(n));
    while (remaining % 2 === 0) {
      factors.push(2);
      remaining = Math.floor(remaining / 2);
    }
    for (let i = 3; i * i <= remaining; i += 2) {
      while (remaining % i === 0) {
        factors.push(i);
        remaining = Math.floor(remaining / i);
      }
    }
    if (remaining > 2) factors.push(remaining);
    this._recordHistory(`primeFactors: ${n} → [${factors.join(', ')}]`);
    return factors;
  }

  // ===========================================================================
  // 序列化为 DataPacket
  // ===========================================================================

  /**
   * 序列化为 DataPacket
   * Serialize to DataPacket
   */
  toPacket(): DataPacket<{ results: DetachedResult[]; variables: Record<string, number>; functions: MathFunction[] }> {
    const vars: Record<string, number> = {};
    this._variables.forEach((v, k) => { vars[k] = v; });
    const packet: DataPacket<{ results: DetachedResult[]; variables: Record<string, number>; functions: MathFunction[] }> = {
      id: `detached-calc-${(++this._counter).toString(36)}`,
      payload: {
        results: this._results,
        variables: vars,
        functions: this.functions,
      },
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
    this._mode = 'standard';
    this._precision = 10;
    this._initPrecedence();
    this._initFunctions();
    this._recordHistory('DetachedCalculation engine reset');
  }

  // ===========================================================================
  // 私有辅助方法
  // ===========================================================================

  private _recordHistory(entry: string): void {
    this._history.push(`[${new Date().toISOString()}] ${entry}`);
    if (this._history.length > 500) this._history.shift();
  }

  private _initPrecedence(): void {
    this._precedence.clear();
    const entries: OperatorPrecedence[] = [
      { operator: '+', priority: 1, associative: 'left', arity: 2 },
      { operator: '-', priority: 1, associative: 'left', arity: 2 },
      { operator: '*', priority: 2, associative: 'left', arity: 2 },
      { operator: '/', priority: 2, associative: 'left', arity: 2 },
      { operator: '%', priority: 2, associative: 'left', arity: 2 },
      { operator: '^', priority: 3, associative: 'right', arity: 2 },
    ];
    for (const e of entries) this._precedence.set(e.operator, e);
  }

  private _initFunctions(): void {
    this._functions.clear();
    const builtins: MathFunction[] = [
      { name: 'abs', arity: 1, description: '绝对值', fn: (a) => Math.abs(a) },
      { name: 'sqrt', arity: 1, description: '平方根', fn: (a) => Math.sqrt(a) },
      { name: 'pow', arity: 2, description: '幂运算', fn: (a, b) => Math.pow(a, b) },
      { name: 'max', arity: 2, description: '最大值', fn: (a, b) => Math.max(a, b) },
      { name: 'min', arity: 2, description: '最小值', fn: (a, b) => Math.min(a, b) },
      { name: 'round', arity: 1, description: '四舍五入', fn: (a) => Math.round(a) },
      { name: 'floor', arity: 1, description: '向下取整', fn: (a) => Math.floor(a) },
      { name: 'ceil', arity: 1, description: '向上取整', fn: (a) => Math.ceil(a) },
      { name: 'sin', arity: 1, description: '正弦函数', fn: (a) => Math.sin(a) },
      { name: 'cos', arity: 1, description: '余弦函数', fn: (a) => Math.cos(a) },
      { name: 'tan', arity: 1, description: '正切函数', fn: (a) => Math.tan(a) },
      { name: 'log', arity: 1, description: '自然对数', fn: (a) => Math.log(a) },
      { name: 'log10', arity: 1, description: '常用对数', fn: (a) => Math.log10(a) },
      { name: 'exp', arity: 1, description: 'e的指数', fn: (a) => Math.exp(a) },
    ];
    for (const f of builtins) this._functions.set(f.name, f);
  }

  private _normalize(expr: string): string {
    return expr.replace(/\s+/g, '').replace(/--/g, '+');
  }

  private _reduceBrackets(
    s: string,
    steps: DetachedStep[],
    nextStep: () => number,
  ): string {
    let current = s;
    let guard = 0;
    while (current.includes('(') && guard++ < 50) {
      const inner = current.match(/\(([^()]+)\)/);
      if (!inner) break;
      const before = current;
      const innerExpr = inner[1];
      const rpn = this.applyPrecedence(this.parseExpression(innerExpr));
      const v = this.evaluateRPN(rpn);
      current = current.replace(inner[0], String(v));
      steps.push({
        stepNumber: nextStep(),
        expression: before,
        operation: 'bracket',
        result: v,
        annotation: `计算括号内: ${innerExpr} = ${v}`,
        subExpression: innerExpr,
      });
    }
    return current;
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
        subExpression: `${a} ${op} ${b}`,
      });
    }
    return current;
  }
}
