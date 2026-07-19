/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 逻辑与集合论 —— 真值的几何
 * Logic and Set Theory: The Geometry of Truth
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 逻辑是命题的拓扑，集合是元素的几何。从真值表到推理规则，
 * 从笛卡尔积到幂集，每一种运算都在真值与元素的迷宫中铺设道路。
 */

import { DataPacket } from '../shared/types';

export interface Proposition {
  readonly expression: string;
  readonly variables: string[];
  readonly truthValue: boolean | null;
}

export interface TruthTable {
  readonly variables: string[];
  readonly rows: boolean[][];
  readonly result: boolean[];
}

export interface Set {
  readonly elements: number[];
  readonly universe: number[];
  readonly operations: string[];
}

export interface ProofStep {
  readonly statement: string;
  readonly rule: string;
}

export interface Proof {
  readonly premises: string[];
  readonly conclusion: string;
  readonly steps: ProofStep[];
}

type LogicCache = {
  readonly id: string;
  readonly kind: 'proposition' | 'truth-table' | 'set' | 'proof';
  readonly data: unknown;
};

export class LogicSetTheory {
  private _propositions: Proposition[] = [];
  private _truthTables: TruthTable[] = [];
  private _sets: Map<string, Set> = new Map();
  private _proofs: Proof[] = [];
  private _history: string[] = [];
  private _counter = 0;
  private _cache: Map<string, LogicCache> = new Map();

  get propositionCount(): number { return this._propositions.length; }
  get truthTableCount(): number { return this._truthTables.length; }
  get setCount(): number { return this._sets.size; }
  get proofCount(): number { return this._proofs.length; }
  get history(): string[] { return [...this._history]; }

  /**
   * 命题求值
   * Evaluate a proposition with variable assignments
   */
  public evaluateProposition(expr: string, values: Map<string, boolean>): boolean {
    const result = this._evaluateExpr(expr, values);
    this._recordHistory(`evaluateProposition: ${expr} -> ${result}`);
    return result;
  }

  /**
   * 真值表
   * Generate truth table
   */
  public truthTable(expr: string): TruthTable {
    const variables = this._extractVariables(expr);
    const rows: boolean[][] = [];
    const result: boolean[] = [];
    const n = variables.length;
    const total = 1 << n;
    for (let i = 0; i < total; i++) {
      const row: boolean[] = [];
      const values = new Map<string, boolean>();
      for (let j = 0; j < n; j++) {
        const v = ((i >> (n - 1 - j)) & 1) === 1;
        row.push(v);
        values.set(variables[j]!, v);
      }
      rows.push(row);
      result.push(this._evaluateExpr(expr, values));
    }
    const table: TruthTable = { variables, rows, result };
    this._truthTables.push(table);
    this._recordHistory(`truthTable: ${expr} (${total} rows)`);
    return table;
  }

  /**
   * 永真式判定
   * Tautology check
   */
  public tautologyCheck(expr: string): boolean {
    const table = this.truthTable(expr);
    const result = table.result.every(v => v);
    this._recordHistory(`tautologyCheck: ${expr} -> ${result}`);
    return result;
  }

  /**
   * 矛盾式判定
   * Contradiction check
   */
  public contradictionCheck(expr: string): boolean {
    const table = this.truthTable(expr);
    const result = table.result.every(v => !v);
    this._recordHistory(`contradictionCheck: ${expr} -> ${result}`);
    return result;
  }

  /**
   * 等价判定
   * Logical equivalence check
   */
  public equivalent(expr1: string, expr2: string): boolean {
    const vars1 = this._extractVariables(expr1);
    const vars2 = this._extractVariables(expr2);
    const variables = [...new Set([...vars1, ...vars2])];
    const n = variables.length;
    const total = 1 << n;
    for (let i = 0; i < total; i++) {
      const values = new Map<string, boolean>();
      for (let j = 0; j < n; j++) {
        values.set(variables[j]!, ((i >> (n - 1 - j)) & 1) === 1);
      }
      if (this._evaluateExpr(expr1, values) !== this._evaluateExpr(expr2, values)) {
        this._recordHistory(`equivalent: ${expr1} ≠ ${expr2}`);
        return false;
      }
    }
    this._recordHistory(`equivalent: ${expr1} ≡ ${expr2}`);
    return true;
  }

  /**
   * 假言推理：p, p→q ⊢ q
   * Modus ponens
   */
  public modusPonens(p: string, pImpliesQ: string): string {
    const proof: Proof = {
      premises: [p, pImpliesQ],
      conclusion: 'q',
      steps: [
        { statement: p, rule: 'premise' },
        { statement: pImpliesQ, rule: 'premise' },
        { statement: 'q', rule: 'modus ponens' }
      ]
    };
    this._proofs.push(proof);
    this._recordHistory('modusPonens: derived q');
    return 'q';
  }

  /**
   * 否定后件：¬q, p→q ⊢ ¬p
   * Modus tollens
   */
  public modusTollens(notQ: string, pImpliesQ: string): string {
    const proof: Proof = {
      premises: [notQ, pImpliesQ],
      conclusion: '¬p',
      steps: [
        { statement: notQ, rule: 'premise' },
        { statement: pImpliesQ, rule: 'premise' },
        { statement: '¬p', rule: 'modus tollens' }
      ]
    };
    this._proofs.push(proof);
    this._recordHistory('modusTollens: derived ¬p');
    return '¬p';
  }

  /**
   * 假言三段论：p→q, q→r ⊢ p→r
   * Hypothetical syllogism
   */
  public hypotheticalSyllogism(pImpliesQ: string, qImpliesR: string): string {
    const proof: Proof = {
      premises: [pImpliesQ, qImpliesR],
      conclusion: 'p→r',
      steps: [
        { statement: pImpliesQ, rule: 'premise' },
        { statement: qImpliesR, rule: 'premise' },
        { statement: 'p→r', rule: 'hypothetical syllogism' }
      ]
    };
    this._proofs.push(proof);
    this._recordHistory('hypotheticalSyllogism: derived p→r');
    return 'p→r';
  }

  /**
   * 析取三段论：p∨q, ¬p ⊢ q
   * Disjunctive syllogism
   */
  public disjunctiveSyllogism(pOrQ: string, notP: string): string {
    const proof: Proof = {
      premises: [pOrQ, notP],
      conclusion: 'q',
      steps: [
        { statement: pOrQ, rule: 'premise' },
        { statement: notP, rule: 'premise' },
        { statement: 'q', rule: 'disjunctive syllogism' }
      ]
    };
    this._proofs.push(proof);
    this._recordHistory('disjunctiveSyllogism: derived q');
    return 'q';
  }

  /**
   * 并集：A ∪ B
   * Set union
   */
  public setUnion(a: number[], b: number[]): number[] {
    const result = [...new Set([...a, ...b])].sort((x, y) => x - y);
    this._recordHistory(`setUnion: ${a.length} ∪ ${b.length} -> ${result.length}`);
    return result;
  }

  /**
   * 交集：A ∩ B
   * Set intersection
   */
  public setIntersection(a: number[], b: number[]): number[] {
    const setB = new Set(b);
    const result = [...new Set(a.filter(x => setB.has(x)))].sort((x, y) => x - y);
    this._recordHistory(`setIntersection: ${result.length} elements`);
    return result;
  }

  /**
   * 差集：A \ B
   * Set difference
   */
  public setDifference(a: number[], b: number[]): number[] {
    const setB = new Set(b);
    const result = [...new Set(a.filter(x => !setB.has(x)))].sort((x, y) => x - y);
    this._recordHistory(`setDifference: ${result.length} elements`);
    return result;
  }

  /**
   * 补集：U \ A
   * Set complement
   */
  public setComplement(a: number[], universe: number[]): number[] {
    const setA = new Set(a);
    const result = [...new Set(universe.filter(x => !setA.has(x)))].sort((x, y) => x - y);
    this._recordHistory(`setComplement: ${result.length} elements`);
    return result;
  }

  /**
   * 笛卡尔积：A × B
   * Cartesian product
   */
  public cartesianProduct(a: number[], b: number[]): number[][] {
    const result: number[][] = [];
    for (const x of a) {
      for (const y of b) {
        result.push([x, y]);
      }
    }
    this._recordHistory(`cartesianProduct: ${result.length} pairs`);
    return result;
  }

  /**
   * 幂集：P(A)
   * Power set
   */
  public powerSet(a: number[]): number[][] {
    const n = a.length;
    const total = 1 << n;
    const result: number[][] = [];
    for (let i = 0; i < total; i++) {
      const subset: number[] = [];
      for (let j = 0; j < n; j++) {
        if ((i >> j) & 1) subset.push(a[j]!);
      }
      result.push(subset);
    }
    this._recordHistory(`powerSet: ${result.length} subsets`);
    return result;
  }

  /**
   * 子集判定：A ⊆ B
   * Subset check
   */
  public isSubset(a: number[], b: number[]): boolean {
    const setB = new Set(b);
    const result = a.every(x => setB.has(x));
    this._recordHistory(`isSubset: ${result}`);
    return result;
  }

  /**
   * 基数：|A|
   * Cardinality
   */
  public cardinality(a: number[]): number {
    return new Set(a).size;
  }

  /**
   * 注册集合
   * Register a named set
   */
  public registerSet(name: string, elements: number[], universe: number[] = []): void {
    this._sets.set(name, { elements: [...elements], universe: [...universe], operations: [] });
    this._recordHistory(`registerSet: ${name} with ${elements.length} elements`);
  }

  /**
   * 转换为数据包
   * Serialize to DataPacket
   */
  public toPacket(): DataPacket<{
    propositions: Proposition[];
    truthTables: TruthTable[];
    sets: Set[];
    proofs: Proof[];
    history: string[];
  }> {
    return {
      id: `logic-set-${Date.now()}-${this._counter}`,
      payload: {
        propositions: [...this._propositions],
        truthTables: [...this._truthTables],
        sets: Array.from(this._sets.values()),
        proofs: [...this._proofs],
        history: [...this._history]
      },
      metadata: {
        createdAt: Date.now(),
        route: ['discrete_math', 'logic-set-theory', 'result'],
        priority: 0.8,
        phase: 'analysis'
      }
    };
  }

  /**
   * 重置状态
   * Reset internal state
   */
  public reset(): void {
    this._propositions = [];
    this._truthTables = [];
    this._sets.clear();
    this._proofs = [];
    this._history = [];
    this._cache.clear();
    this._counter = 0;
  }

  // ─── Private helpers ───

  private _recordHistory(entry: string): void {
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
    this._counter++;
  }

  private _extractVariables(expr: string): string[] {
    const matches = expr.match(/[a-z][a-z0-9]*/gi) ?? [];
    const reserved = new Set(['and', 'or', 'not', 'true', 'false', 'xor', 'implies', 'if', 'then']);
    return [...new Set(matches.filter(m => !reserved.has(m.toLowerCase())))].sort();
  }

  private _evaluateExpr(expr: string, values: Map<string, boolean>): boolean {
    // Normalize operators
    let normalized = expr
      .replace(/∧/g, ' and ')
      .replace(/∨/g, ' or ')
      .replace(/¬/g, ' not ')
      .replace(/→/g, ' implies ')
      .replace(/⊕/g, ' xor ')
      .replace(/\^/g, ' and ')
      .replace(/\|\|/g, ' or ')
      .replace(/&&/g, ' and ')
      .replace(/!/g, ' not ');
    // Replace implies: a implies b = (not a) or b
    normalized = normalized.replace(/(\w+)\s+implies\s+(\w+)/g, '(!($1) or ($2))');
    // Replace xor
    normalized = normalized.replace(/(\w+)\s+xor\s+(\w+)/g, '(($1) != ($2))');
    // Replace variable names with their values
    const variables = this._extractVariables(expr);
    let evaluable = normalized;
    for (const v of variables) {
      const val = values.get(v) ?? false;
      evaluable = evaluable.replace(new RegExp(`\\b${v}\\b`, 'g'), String(val));
    }
    // Convert logical operators to JS
    const js = evaluable
      .replace(/\band\b/g, '&&')
      .replace(/\bor\b/g, '||')
      .replace(/\bnot\b/g, '!')
      .replace(/\btrue\b/g, 'true')
      .replace(/\bfalse\b/g, 'false');
    try {
      // eslint-disable-next-line no-new-func
      return Boolean(new Function(`return (${js});`)());
    } catch {
      return false;
    }
  }
}
