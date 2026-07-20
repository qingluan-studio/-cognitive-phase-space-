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

export interface SetData {
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
  private _sets: Map<string, SetData> = new Map();
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
   * 对称差：A △ B = (A∪B) \ (A∩B)
   * Symmetric difference
   */
  public symmetricDifference(a: number[], b: number[]): number[] {
    const setA = new Set(a);
    const setB = new Set(b);
    const result: number[] = [];
    for (const x of setA) if (!setB.has(x)) result.push(x);
    for (const x of setB) if (!setA.has(x)) result.push(x);
    result.sort((x, y) => x - y);
    this._recordHistory(`symmetricDifference: ${result.length} elements`);
    return result;
  }

  /**
   * 德摩根定律验证
   * De Morgan's laws verification
   */
  public deMorganLaws(a: number[], b: number[], universe: number[]): {
    law1Holds: boolean;
    law2Holds: boolean;
  } {
    const notA = this.setComplement(a, universe);
    const notB = this.setComplement(b, universe);
    const notAUnionB = this.setComplement(this.setUnion(a, b), universe);
    const notAIntersectNotB = this.setIntersection(notA, notB);
    const law1 = this._setsEqual(notAUnionB, notAIntersectNotB);
    const notAIntersectB = this.setComplement(this.setIntersection(a, b), universe);
    const notAUnionNotB = this.setUnion(notA, notB);
    const law2 = this._setsEqual(notAIntersectB, notAUnionNotB);
    this._recordHistory(`deMorganLaws: law1=${law1}, law2=${law2}`);
    return { law1Holds: law1, law2Holds: law2 };
  }

  /**
   * 分配律验证
   * Distributive laws verification
   */
  public distributiveLaws(a: number[], b: number[], c: number[]): {
    law1Holds: boolean;
    law2Holds: boolean;
  } {
    const left1 = this.setIntersection(a, this.setUnion(b, c));
    const right1 = this.setUnion(this.setIntersection(a, b), this.setIntersection(a, c));
    const law1 = this._setsEqual(left1, right1);
    const left2 = this.setUnion(a, this.setIntersection(b, c));
    const right2 = this.setIntersection(this.setUnion(a, b), this.setUnion(a, c));
    const law2 = this._setsEqual(left2, right2);
    this._recordHistory(`distributiveLaws: law1=${law1}, law2=${law2}`);
    return { law1Holds: law1, law2Holds: law2 };
  }

  /**
   * 吸收律验证
   * Absorption laws verification
   */
  public absorptionLaws(a: number[], b: number[]): {
    law1Holds: boolean;
    law2Holds: boolean;
  } {
    const left1 = this.setIntersection(a, this.setUnion(a, b));
    const law1 = this._setsEqual(left1, a);
    const left2 = this.setUnion(a, this.setIntersection(a, b));
    const law2 = this._setsEqual(left2, a);
    this._recordHistory(`absorptionLaws: law1=${law1}, law2=${law2}`);
    return { law1Holds: law1, law2Holds: law2 };
  }

  /**
   * 容斥原理
   * Inclusion-exclusion principle
   */
  public inclusionExclusion(sets: number[][]): number {
    const n = sets.length;
    let result = 0;
    for (let mask = 1; mask < (1 << n); mask++) {
      const count = this._countBits(mask);
      let intersection: number[] | null = null;
      for (let i = 0; i < n; i++) {
        if (mask & (1 << i)) {
          if (intersection === null) {
            intersection = [...sets[i]!];
          } else {
            intersection = this.setIntersection(intersection, sets[i]!);
          }
        }
      }
      const size = intersection ? this.cardinality(intersection) : 0;
      if (count % 2 === 1) {
        result += size;
      } else {
        result -= size;
      }
    }
    this._recordHistory(`inclusionExclusion: ${n} sets, result=${result}`);
    return result;
  }

  /**
   * 集合划分验证
   * Partition verification
   */
  public isPartition(sets: number[][], universe: number[]): boolean {
    const union = sets.reduce((acc, s) => this.setUnion(acc, s), []);
    if (!this._setsEqual(union, universe)) return false;
    for (let i = 0; i < sets.length; i++) {
      if (sets[i]!.length === 0) return false;
      for (let j = i + 1; j < sets.length; j++) {
        if (this.setIntersection(sets[i]!, sets[j]!).length > 0) return false;
      }
    }
    this._recordHistory(`isPartition: ${sets.length} sets`);
    return true;
  }

  /**
   * 关系：A × B 的子集
   * Relation: subset of A × B
   */
  public createRelation(a: number[], b: number[], predicate: (x: number, y: number) => boolean): number[][] {
    const result: number[][] = [];
    for (const x of a) {
      for (const y of b) {
        if (predicate(x, y)) result.push([x, y]);
      }
    }
    this._recordHistory(`createRelation: ${result.length} pairs`);
    return result;
  }

  /**
   * 关系的性质：自反、对称、传递
   * Relation properties: reflexive, symmetric, transitive
   */
  public relationProperties(relation: number[][], set: number[]): {
    reflexive: boolean;
    symmetric: boolean;
    transitive: boolean;
    equivalence: boolean;
  } {
    const pairSet = new Set(relation.map(([x, y]) => `${x},${y}`));
    let reflexive = true;
    for (const x of set) {
      if (!pairSet.has(`${x},${x}`)) reflexive = false;
    }
    let symmetric = true;
    for (const [x, y] of relation) {
      if (!pairSet.has(`${y},${x}`)) symmetric = false;
    }
    let transitive = true;
    const pairMap = new Map<number, Set<number>>();
    for (const [x, y] of relation) {
      if (!pairMap.has(x)) pairMap.set(x, new Set());
      pairMap.get(x)!.add(y);
    }
    for (const x of set) {
      const ys = pairMap.get(x);
      if (!ys) continue;
      for (const y of ys) {
        const zs = pairMap.get(y);
        if (!zs) continue;
        for (const z of zs) {
          if (!pairSet.has(`${x},${z}`)) transitive = false;
        }
      }
    }
    const equivalence = reflexive && symmetric && transitive;
    this._recordHistory(`relationProperties: ref=${reflexive}, sym=${symmetric}, trans=${transitive}`);
    return { reflexive, symmetric, transitive, equivalence };
  }

  /**
   * 等价类
   * Equivalence classes
   */
  public equivalenceClasses(relation: number[][], set: number[]): number[][] {
    const visited = new Set<number>();
    const classes: number[][] = [];
    const pairMap = new Map<number, Set<number>>();
    for (const [x, y] of relation) {
      if (!pairMap.has(x)) pairMap.set(x, new Set());
      pairMap.get(x)!.add(y);
    }
    for (const x of set) {
      if (visited.has(x)) continue;
      const eqClass: number[] = [];
      const stack = [x];
      while (stack.length > 0) {
        const current = stack.pop()!;
        if (visited.has(current)) continue;
        visited.add(current);
        eqClass.push(current);
        const related = pairMap.get(current);
        if (related) {
          for (const y of related) {
            if (!visited.has(y)) stack.push(y);
          }
        }
      }
      eqClass.sort((a, b) => a - b);
      classes.push(eqClass);
    }
    this._recordHistory(`equivalenceClasses: ${classes.length} classes`);
    return classes;
  }

  /**
   * 偏序集：最大元、最小元
   * Poset: maximal and minimal elements
   */
  public posetExtremes(relation: number[][], set: number[]): {
    maximal: number[];
    minimal: number[];
  } {
    const pairSet = new Set(relation.map(([x, y]) => `${x},${y}`));
    const maximal: number[] = [];
    const minimal: number[] = [];
    for (const x of set) {
      let isMaximal = true;
      let isMinimal = true;
      for (const y of set) {
        if (x === y) continue;
        if (pairSet.has(`${x},${y}`)) isMaximal = false;
        if (pairSet.has(`${y},${x}`)) isMinimal = false;
      }
      if (isMaximal) maximal.push(x);
      if (isMinimal) minimal.push(x);
    }
    this._recordHistory(`posetExtremes: ${maximal.length} max, ${minimal.length} min`);
    return { maximal, minimal };
  }

  /**
   * 函数性质：单射、满射、双射
   * Function properties: injective, surjective, bijective
   */
  public functionProperties(fn: number[][], domain: number[], codomain: number[]): {
    injective: boolean;
    surjective: boolean;
    bijective: boolean;
  } {
    const domainSet = new Set(domain);
    const codomainSet = new Set(codomain);
    const fnMap = new Map<number, number>();
    for (const [x, y] of fn) {
      if (!domainSet.has(x)) return { injective: false, surjective: false, bijective: false };
      fnMap.set(x, y);
    }
    const imageSet = new Set(fnMap.values());
    const injective = fnMap.size === new Set(fnMap.values()).size;
    const surjective = codomainSet.size === imageSet.size && [...codomainSet].every(x => imageSet.has(x));
    const bijective = injective && surjective;
    this._recordHistory(`functionProperties: inj=${injective}, surj=${surjective}, bij=${bijective}`);
    return { injective, surjective, bijective };
  }

  /**
   * 合取范式（CNF）
   * Conjunctive Normal Form
   */
  public toCNF(expr: string): string {
    const vars = this._extractVariables(expr);
    const table = this.truthTable(expr);
    const clauses: string[] = [];
    for (let i = 0; i < table.rows.length; i++) {
      if (!table.result[i]) {
        const literals: string[] = [];
        for (let j = 0; j < table.variables.length; j++) {
          literals.push(table.rows[i]![j] ? `¬${table.variables[j]}` : table.variables[j]!);
        }
        clauses.push(`(${literals.join(' ∨ ')})`);
      }
    }
    const result = clauses.length > 0 ? clauses.join(' ∧ ') : 'true';
    this._recordHistory(`toCNF: ${clauses.length} clauses`);
    return result;
  }

  /**
   * 析取范式（DNF）
   * Disjunctive Normal Form
   */
  public toDNF(expr: string): string {
    const table = this.truthTable(expr);
    const terms: string[] = [];
    for (let i = 0; i < table.rows.length; i++) {
      if (table.result[i]) {
        const literals: string[] = [];
        for (let j = 0; j < table.variables.length; j++) {
          literals.push(table.rows[i]![j] ? table.variables[j]! : `¬${table.variables[j]}`);
        }
        terms.push(`(${literals.join(' ∧ ')})`);
      }
    }
    const result = terms.length > 0 ? terms.join(' ∨ ') : 'false';
    this._recordHistory(`toDNF: ${terms.length} terms`);
    return result;
  }

  /**
   * 可满足性判定（SAT）
   * Satisfiability check
   */
  public isSatisfiable(expr: string): boolean {
    const table = this.truthTable(expr);
    const result = table.result.some(v => v);
    this._recordHistory(`isSatisfiable: ${result}`);
    return result;
  }

  /**
   * 逻辑结论验证
   * Logical consequence check
   */
  public isLogicalConsequence(premises: string[], conclusion: string): boolean {
    const allVars = new Set<string>();
    for (const p of premises) this._extractVariables(p).forEach(v => allVars.add(v));
    this._extractVariables(conclusion).forEach(v => allVars.add(v));
    const variables = [...allVars].sort();
    const n = variables.length;
    const total = 1 << n;
    for (let i = 0; i < total; i++) {
      const values = new Map<string, boolean>();
      for (let j = 0; j < n; j++) {
        values.set(variables[j]!, ((i >> (n - 1 - j)) & 1) === 1);
      }
      const allPremisesTrue = premises.every(p => this._evaluateExpr(p, values));
      const conclusionTrue = this._evaluateExpr(conclusion, values);
      if (allPremisesTrue && !conclusionTrue) {
        this._recordHistory('isLogicalConsequence: false');
        return false;
      }
    }
    this._recordHistory('isLogicalConsequence: true');
    return true;
  }

  /**
   * 双重否定律验证
   * Double negation law verification
   */
  public doubleNegationLaw(expr: string): boolean {
    return this.equivalent(expr, `¬¬(${expr})`);
  }

  /**
   * 排中律验证
   * Law of excluded middle verification
   */
  public excludedMiddle(expr: string): boolean {
    return this.tautologyCheck(`${expr} ∨ ¬(${expr})`);
  }

  /**
   * 矛盾律验证
   * Law of non-contradiction verification
   */
  public nonContradiction(expr: string): boolean {
    return this.contradictionCheck(`${expr} ∧ ¬(${expr})`);
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
    sets: SetData[];
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
    normalized = normalized.replace(/(\w+)\s+implies\s+(\w+)/g, '(!($1) or ($2))');
    normalized = normalized.replace(/(\w+)\s+xor\s+(\w+)/g, '(($1) != ($2))');
    const variables = this._extractVariables(expr);
    let evaluable = normalized;
    for (const v of variables) {
      const val = values.get(v) ?? false;
      evaluable = evaluable.replace(new RegExp(`\\b${v}\\b`, 'g'), String(val));
    }
    const js = evaluable
      .replace(/\band\b/g, '&&')
      .replace(/\bor\b/g, '||')
      .replace(/\bnot\b/g, '!')
      .replace(/\btrue\b/g, 'true')
      .replace(/\bfalse\b/g, 'false');
    try {
      return Boolean(new Function(`return (${js});`)());
    } catch {
      return false;
    }
  }

  private _setsEqual(a: number[], b: number[]): boolean {
    const setA = new Set(a);
    const setB = new Set(b);
    if (setA.size !== setB.size) return false;
    for (const x of setA) if (!setB.has(x)) return false;
    return true;
  }

  /**
   * 关系的自反闭包
   * Reflexive closure of a relation
   */
  public reflexiveClosure(relation: number[][], set: number[]): number[][] {
    const pairSet = new Set(relation.map(([x, y]) => `${x},${y}`));
    const result = [...relation];
    for (const x of set) {
      if (!pairSet.has(`${x},${x}`)) {
        result.push([x, x]);
      }
    }
    this._recordHistory(`reflexiveClosure: ${relation.length} -> ${result.length} pairs`);
    return result;
  }

  /**
   * 关系的对称闭包
   * Symmetric closure of a relation
   */
  public symmetricClosure(relation: number[][]): number[][] {
    const pairSet = new Set(relation.map(([x, y]) => `${x},${y}`));
    const result = [...relation];
    for (const [x, y] of relation) {
      if (!pairSet.has(`${y},${x}`)) {
        result.push([y, x]);
        pairSet.add(`${y},${x}`);
      }
    }
    this._recordHistory(`symmetricClosure: ${relation.length} -> ${result.length} pairs`);
    return result;
  }

  /**
   * 关系的传递闭包（Warshall 算法）
   * Transitive closure using Warshall's algorithm
   */
  public transitiveClosure(relation: number[][], set: number[]): number[][] {
    const n = set.length;
    const idx = new Map<number, number>();
    set.forEach((v, i) => idx.set(v, i));
    const tc: boolean[][] = Array.from({ length: n }, () => new Array(n).fill(false));
    for (const [x, y] of relation) {
      const i = idx.get(x);
      const j = idx.get(y);
      if (i !== undefined && j !== undefined) tc[i]![j] = true;
    }
    for (let k = 0; k < n; k++) {
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (tc[i]![k] && tc[k]![j]) tc[i]![j] = true;
        }
      }
    }
    const result: number[][] = [];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (tc[i]![j]) result.push([set[i]!, set[j]!]);
      }
    }
    this._recordHistory(`transitiveClosure: ${relation.length} -> ${result.length} pairs`);
    return result;
  }

  /**
   * 偏序集的上确界和下确界
   * Supremum and infimum in a poset
   */
  public posetBounds(relation: number[][], set: number[], subset: number[]): {
    upperBounds: number[];
    lowerBounds: number[];
    supremum: number | null;
    infimum: number | null;
  } {
    const pairSet = new Set(relation.map(([x, y]) => `${x},${y}`));
    const upperBounds: number[] = [];
    const lowerBounds: number[] = [];
    for (const x of set) {
      let isUpper = true;
      let isLower = true;
      for (const s of subset) {
        if (!pairSet.has(`${s},${x}`)) isUpper = false;
        if (!pairSet.has(`${x},${s}`)) isLower = false;
      }
      if (isUpper) upperBounds.push(x);
      if (isLower) lowerBounds.push(x);
    }
    let supremum: number | null = null;
    for (const u of upperBounds) {
      let isLeast = true;
      for (const v of upperBounds) {
        if (!pairSet.has(`${u},${v}`)) isLeast = false;
      }
      if (isLeast) { supremum = u; break; }
    }
    let infimum: number | null = null;
    for (const l of lowerBounds) {
      let isGreatest = true;
      for (const m of lowerBounds) {
        if (!pairSet.has(`${m},${l}`)) isGreatest = false;
      }
      if (isGreatest) { infimum = l; break; }
    }
    this._recordHistory(`posetBounds: sup=${supremum}, inf=${infimum}`);
    return { upperBounds, lowerBounds, supremum, infimum };
  }

  /**
   * 布尔代数运算
   * Boolean algebra operations
   */
  public booleanAlgebra(expr: string, values: Map<string, boolean>): boolean {
    return this._evaluateExpr(expr, values);
  }

  /**
   * 德摩根定律（逻辑版）验证
   * De Morgan's laws (logical version) verification
   */
  public deMorganLawsLogic(p: string, q: string): {
    law1Holds: boolean;
    law2Holds: boolean;
  } {
    const law1 = this.equivalent(`¬(${p} ∧ ${q})`, `¬${p} ∨ ¬${q}`);
    const law2 = this.equivalent(`¬(${p} ∨ ${q})`, `¬${p} ∧ ¬${q}`);
    this._recordHistory(`deMorganLawsLogic: law1=${law1}, law2=${law2}`);
    return { law1Holds: law1, law2Holds: law2 };
  }

  /**
   * 分配律（逻辑版）验证
   * Distributive laws (logical version) verification
   */
  public distributiveLawsLogic(p: string, q: string, r: string): {
    law1Holds: boolean;
    law2Holds: boolean;
  } {
    const law1 = this.equivalent(`${p} ∧ (${q} ∨ ${r})`, `(${p} ∧ ${q}) ∨ (${p} ∧ ${r})`);
    const law2 = this.equivalent(`${p} ∨ (${q} ∧ ${r})`, `(${p} ∨ ${q}) ∧ (${p} ∨ ${r})`);
    this._recordHistory(`distributiveLawsLogic: law1=${law1}, law2=${law2}`);
    return { law1Holds: law1, law2Holds: law2 };
  }

  /**
   * 集合的对称差性质验证
   * Symmetric difference properties verification
   */
  public symmetricDifferenceProperties(a: number[], b: number[], c: number[]): {
    commutative: boolean;
    associative: boolean;
    selfInverse: boolean;
  } {
    const commutative = this._setsEqual(
      this.symmetricDifference(a, b),
      this.symmetricDifference(b, a)
    );
    const associative = this._setsEqual(
      this.symmetricDifference(this.symmetricDifference(a, b), c),
      this.symmetricDifference(a, this.symmetricDifference(b, c))
    );
    const selfInverse = this._setsEqual(
      this.symmetricDifference(a, a),
      []
    );
    this._recordHistory(`symmetricDifferenceProperties: comm=${commutative}, assoc=${associative}`);
    return { commutative, associative, selfInverse };
  }

  /**
   * 多重集运算
   * Multiset operations
   */
  public multisetUnion(a: number[], b: number[]): number[] {
    const countA = this._countElements(a);
    const countB = this._countElements(b);
    const result: number[] = [];
    const allElements = new Set([...a, ...b]);
    for (const x of allElements) {
      const count = Math.max(countA.get(x) ?? 0, countB.get(x) ?? 0);
      for (let i = 0; i < count; i++) result.push(x);
    }
    result.sort((x, y) => x - y);
    this._recordHistory(`multisetUnion: ${a.length} + ${b.length} -> ${result.length}`);
    return result;
  }

  /**
   * 多重集交集
   * Multiset intersection
   */
  public multisetIntersection(a: number[], b: number[]): number[] {
    const countA = this._countElements(a);
    const countB = this._countElements(b);
    const result: number[] = [];
    const allElements = new Set([...a].filter(x => countB.has(x)));
    for (const x of allElements) {
      const count = Math.min(countA.get(x) ?? 0, countB.get(x) ?? 0);
      for (let i = 0; i < count; i++) result.push(x);
    }
    result.sort((x, y) => x - y);
    this._recordHistory(`multisetIntersection: ${result.length} elements`);
    return result;
  }

  private _countElements(arr: number[]): Map<number, number> {
    const counts = new Map<number, number>();
    for (const x of arr) counts.set(x, (counts.get(x) ?? 0) + 1);
    return counts;
  }

  private _countBits(n: number): number {
    let count = 0;
    while (n > 0) {
      count += n & 1;
      n >>= 1;
    }
    return count;
  }
}
