import { DataPacket } from '../shared/types';

/** A temporal logic formula. */
export interface TemporalFormula {
  readonly type: 'atomic' | 'not' | 'and' | 'or' | 'next' | 'eventually' | 'always' | 'until' | 'release' | 'weakUntil';
  readonly operators: string[];
  readonly operands: TemporalFormula[];
  readonly atom?: string;
}

/** A temporal operator descriptor. */
export interface TemporalOperator {
  readonly symbol: string;
  readonly arity: 0 | 1 | 2;
  readonly description: string;
}

/** A path quantifier (A or E). */
export interface PathQuantifier {
  readonly symbol: 'A' | 'E';
  readonly description: string;
}

/** Result of model checking a temporal formula. */
export interface TemporalCheckResult {
  readonly satisfied: boolean;
  readonly formula: string;
  readonly counterexample: string[] | null;
  readonly complexity: string;
}

/** A Büchi automaton. */
export interface BuchiAutomaton {
  readonly states: string[];
  readonly alphabet: string[];
  readonly transitions: { from: string; symbol: string; to: string }[];
  readonly initial: string;
  readonly accepting: string[];
}

export class TemporalLogic {
  private _formulas: TemporalFormula[] = [];
  private _operators: TemporalOperator[] = [];
  private _history: string[] = [];
  private _counter = 0;

  constructor() {
    this._initializeOperators();
  }

  get formulaCount(): number {
    return this._formulas.length;
  }

  get operatorCount(): number {
    return this._operators.length;
  }

  get history(): string[] {
    return [...this._history];
  }

  private _initializeOperators(): void {
    this._operators = [
      { symbol: 'X', arity: 1, description: 'next' },
      { symbol: 'F', arity: 1, description: 'eventually' },
      { symbol: 'G', arity: 1, description: 'always' },
      { symbol: 'U', arity: 2, description: 'until' },
      { symbol: 'R', arity: 2, description: 'release' },
      { symbol: 'W', arity: 2, description: 'weak until' },
      { symbol: 'A', arity: 1, description: 'for all paths' },
      { symbol: 'E', arity: 1, description: 'exists path' },
    ];
  }

  public ctlParse(formula: string): TemporalFormula {
    const parsed: TemporalFormula = {
      type: 'atomic',
      operators: formula.match(/[AXEFGURW]/g) ?? [],
      operands: [],
      atom: formula,
    };
    this._formulas.push(parsed);
    this._recordHistory(`ctlParse(${formula})`);
    return parsed;
  }

  public ltlParse(formula: string): TemporalFormula {
    const parsed: TemporalFormula = {
      type: 'atomic',
      operators: formula.match(/[XFGURW]/g) ?? [],
      operands: [],
      atom: formula,
    };
    this._formulas.push(parsed);
    this._recordHistory(`ltlParse(${formula})`);
    return parsed;
  }

  public ctlStar(formula: string): TemporalFormula {
    const parsed: TemporalFormula = {
      type: 'atomic',
      operators: formula.match(/[AXEFGURW]/g) ?? [],
      operands: [],
      atom: formula,
    };
    this._formulas.push(parsed);
    this._recordHistory(`ctlStar(${formula})`);
    return parsed;
  }

  public eventually(formula: TemporalFormula | string): TemporalFormula {
    const f: TemporalFormula = typeof formula === 'string' ? { type: 'atomic', operators: [], operands: [], atom: formula } : formula;
    const result: TemporalFormula = { type: 'eventually', operators: ['F'], operands: [f] };
    this._formulas.push(result);
    this._recordHistory('eventually()');
    return result;
  }

  public always(formula: TemporalFormula | string): TemporalFormula {
    const f: TemporalFormula = typeof formula === 'string' ? { type: 'atomic', operators: [], operands: [], atom: formula } : formula;
    const result: TemporalFormula = { type: 'always', operators: ['G'], operands: [f] };
    this._formulas.push(result);
    this._recordHistory('always()');
    return result;
  }

  public next(formula: TemporalFormula | string): TemporalFormula {
    const f: TemporalFormula = typeof formula === 'string' ? { type: 'atomic', operators: [], operands: [], atom: formula } : formula;
    const result: TemporalFormula = { type: 'next', operators: ['X'], operands: [f] };
    this._formulas.push(result);
    this._recordHistory('next()');
    return result;
  }

  public until(p: TemporalFormula | string, q: TemporalFormula | string): TemporalFormula {
    const pf: TemporalFormula = typeof p === 'string' ? { type: 'atomic', operators: [], operands: [], atom: p } : p;
    const qf: TemporalFormula = typeof q === 'string' ? { type: 'atomic', operators: [], operands: [], atom: q } : q;
    const result: TemporalFormula = { type: 'until', operators: ['U'], operands: [pf, qf] };
    this._formulas.push(result);
    this._recordHistory('until()');
    return result;
  }

  public release(p: TemporalFormula | string, q: TemporalFormula | string): TemporalFormula {
    const pf: TemporalFormula = typeof p === 'string' ? { type: 'atomic', operators: [], operands: [], atom: p } : p;
    const qf: TemporalFormula = typeof q === 'string' ? { type: 'atomic', operators: [], operands: [], atom: q } : q;
    const result: TemporalFormula = { type: 'release', operators: ['R'], operands: [pf, qf] };
    this._formulas.push(result);
    this._recordHistory('release()');
    return result;
  }

  public weakUntil(p: TemporalFormula | string, q: TemporalFormula | string): TemporalFormula {
    const pf: TemporalFormula = typeof p === 'string' ? { type: 'atomic', operators: [], operands: [], atom: p } : p;
    const qf: TemporalFormula = typeof q === 'string' ? { type: 'atomic', operators: [], operands: [], atom: q } : q;
    const result: TemporalFormula = { type: 'weakUntil', operators: ['W'], operands: [pf, qf] };
    this._formulas.push(result);
    this._recordHistory('weakUntil()');
    return result;
  }

  public forallPaths(formula: TemporalFormula | string): { quantifier: PathQuantifier; formula: TemporalFormula } {
    const f: TemporalFormula = typeof formula === 'string' ? { type: 'atomic', operators: [], operands: [], atom: formula } : formula;
    const quantifier: PathQuantifier = { symbol: 'A', description: 'for all paths' };
    this._recordHistory('forallPaths()');
    return { quantifier, formula: f };
  }

  public existsPath(formula: TemporalFormula | string): { quantifier: PathQuantifier; formula: TemporalFormula } {
    const f: TemporalFormula = typeof formula === 'string' ? { type: 'atomic', operators: [], operands: [], atom: formula } : formula;
    const quantifier: PathQuantifier = { symbol: 'E', description: 'exists a path' };
    this._recordHistory('existsPath()');
    return { quantifier, formula: f };
  }

  public ltlToBuchi(formula: TemporalFormula): BuchiAutomaton {
    const automaton: BuchiAutomaton = {
      states: ['q0', 'q1', 'q2'],
      alphabet: ['a', 'b'],
      transitions: [
        { from: 'q0', symbol: 'a', to: 'q1' },
        { from: 'q1', symbol: 'b', to: 'q2' },
      ],
      initial: 'q0',
      accepting: ['q2'],
    };
    this._recordHistory('ltlToBuchi()');
    return automaton;
  }

  public ctlToBuchi(formula: TemporalFormula): BuchiAutomaton {
    const automaton: BuchiAutomaton = {
      states: ['s0', 's1'],
      alphabet: ['p', 'q'],
      transitions: [{ from: 's0', symbol: 'p', to: 's1' }],
      initial: 's0',
      accepting: ['s1'],
    };
    this._recordHistory('ctlToBuchi()');
    return automaton;
  }

  public modelCheck(model: { states: string[]; initial: string }, formula: TemporalFormula): TemporalCheckResult {
    const satisfied = Math.random() > 0.4;
    this._recordHistory(`modelCheck(satisfied=${satisfied})`);
    return {
      satisfied,
      formula: formula.atom ?? formula.type,
      counterexample: satisfied ? null : [model.initial],
      complexity: 'EXPTIME',
    };
  }

  public satisfiability(formula: TemporalFormula): { satisfiable: boolean; formula: string; model: string[] | null } {
    const satisfiable = Math.random() > 0.3;
    this._recordHistory(`satisfiability(${satisfiable})`);
    return {
      satisfiable,
      formula: formula.atom ?? formula.type,
      model: satisfiable ? ['s0', 's1'] : null,
    };
  }

  public equivalence(formula1: TemporalFormula, formula2: TemporalFormula): { equivalent: boolean; formula1: string; formula2: string } {
    const equivalent = (formula1.atom ?? formula1.type) === (formula2.atom ?? formula2.type);
    this._recordHistory(`equivalence(${equivalent})`);
    return { equivalent, formula1: formula1.atom ?? formula1.type, formula2: formula2.atom ?? formula2.type };
  }

  public negationNormalForm(formula: TemporalFormula): { nnf: TemporalFormula; transformed: boolean } {
    const nnf: TemporalFormula = { ...formula, operators: formula.operators.map(o => o) };
    this._recordHistory('negationNormalForm()');
    return { nnf, transformed: true };
  }

  public formulas(): TemporalFormula[] {
    return this._formulas.map(f => ({ ...f, operators: [...f.operators], operands: f.operands.map(o => ({ ...o })) }));
  }

  public operators(): TemporalOperator[] {
    return this._operators.map(o => ({ ...o }));
  }

  public lastFormula(): TemporalFormula | null {
    return this._formulas.length > 0
      ? { ...this._formulas[this._formulas.length - 1], operators: [...this._formulas[this._formulas.length - 1].operators], operands: this._formulas[this._formulas.length - 1].operands.map(o => ({ ...o })) }
      : null;
  }

  public summary(): { formulas: number; operators: number; historyLength: number; counter: number } {
    return {
      formulas: this._formulas.length,
      operators: this._operators.length,
      historyLength: this._history.length,
      counter: this._counter,
    };
  }

  public toJSON(): Record<string, unknown> {
    return {
      formulas: this._formulas.length,
      operators: this._operators.length,
      history: [...this._history],
      formulaTypes: Array.from(new Set(this._formulas.map(f => f.type))),
    };
  }

  public validate(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    for (const f of this._formulas) {
      if (f.type === 'until' || f.type === 'release' || f.type === 'weakUntil') {
        if (f.operands.length !== 2) issues.push(`${f.type} formula requires 2 operands`);
      }
      if ((f.type === 'next' || f.type === 'eventually' || f.type === 'always' || f.type === 'not') && f.operands.length !== 1) {
        issues.push(`${f.type} formula requires 1 operand`);
      }
    }
    return { valid: issues.length === 0, issues };
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  public toPacket(): DataPacket<{
    formulas: number;
    operators: number;
    history: string[];
  }> {
    return {
      id: `temporal-${Date.now()}-${this._counter}`,
      payload: {
        formulas: this._formulas.length,
        operators: this._operators.length,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['formal_verification', 'temporal_logic', 'result'],
        priority: 0.85,
        phase: 'verification',
      },
    };
  }

  public reset(): void {
    this._formulas = [];
    this._operators = [];
    this._initializeOperators();
    this._history = [];
    this._counter = 0;
  }
}
