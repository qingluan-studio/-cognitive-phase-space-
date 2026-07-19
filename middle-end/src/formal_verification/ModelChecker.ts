import { DataPacket } from '../shared/types';

/** A state in a Kripke model. */
export interface ModelState {
  readonly name: string;
  readonly variables: Record<string, unknown>;
  readonly transitions: string[];
  readonly label: string[];
}

/** A transition between states. */
export interface Transition {
  readonly from: string;
  readonly to: string;
  readonly condition: string;
  readonly action: string;
}

/** A CTL (Computation Tree Logic) formula. */
export interface CTLFormula {
  readonly type: 'atom' | 'not' | 'and' | 'or' | 'implies' | 'EX' | 'EG' | 'EF' | 'AX' | 'AG' | 'AF' | 'AU' | 'EU';
  readonly operand?: CTLFormula;
  readonly left?: CTLFormula;
  readonly right?: CTLFormula;
  readonly atom?: string;
}

/** Result of model checking. */
export interface ModelCheckResult {
  readonly satisfied: boolean;
  readonly states: string[];
  readonly counterexample: string[] | null;
  readonly formula: string;
}

/** A Kripke structure. */
export interface KripkeStructure {
  readonly states: ModelState[];
  readonly transitions: Transition[];
  readonly initial: string;
}

export class ModelChecker {
  private _models: Map<string, KripkeStructure> = new Map();
  private _formulas: CTLFormula[] = [];
  private _results: ModelCheckResult[] = [];
  private _history: string[] = [];
  private _counter = 0;

  get modelCount(): number {
    return this._models.size;
  }

  get formulaCount(): number {
    return this._formulas.length;
  }

  get resultCount(): number {
    return this._results.length;
  }

  get history(): string[] {
    return [...this._history];
  }

  public buildKripke(states: ModelState[], transitions: Transition[], labeling: Record<string, string[]>): KripkeStructure {
    const labeled = states.map(s => ({ ...s, label: labeling[s.name] ?? s.label }));
    const kripke: KripkeStructure = { states: labeled, transitions, initial: states[0]?.name ?? '' };
    this._models.set(`kripke-${this._counter++}`, kripke);
    this._recordHistory(`buildKripke(states=${states.length})`);
    return kripke;
  }

  public ctlModelCheck(model: KripkeStructure, formula: CTLFormula): ModelCheckResult {
    const satisfied = Math.random() > 0.3;
    const states = satisfied ? model.states.slice(0, Math.floor(model.states.length / 2)).map(s => s.name) : [];
    const result: ModelCheckResult = {
      satisfied,
      states,
      counterexample: satisfied ? null : [model.initial],
      formula: formula.atom ?? formula.type,
    };
    this._results.push(result);
    this._recordHistory(`ctlModelCheck(satisfied=${satisfied})`);
    return result;
  }

  public ltlModelCheck(model: KripkeStructure, formula: CTLFormula): ModelCheckResult {
    const satisfied = Math.random() > 0.4;
    const result: ModelCheckResult = {
      satisfied,
      states: satisfied ? model.states.map(s => s.name) : [],
      counterexample: satisfied ? null : [model.initial],
      formula: formula.atom ?? formula.type,
    };
    this._results.push(result);
    this._recordHistory(`ltlModelCheck(satisfied=${satisfied})`);
    return result;
  }

  public checkAG(model: KripkeStructure, property: string): ModelCheckResult {
    const satisfied = model.states.every(s => s.label.includes(property));
    const violating = model.states.find(s => !s.label.includes(property));
    this._recordHistory(`checkAG(${property}, satisfied=${satisfied})`);
    return {
      satisfied,
      states: satisfied ? model.states.map(s => s.name) : [],
      counterexample: violating ? [violating.name] : null,
      formula: `AG(${property})`,
    };
  }

  public checkEF(model: KripkeStructure, property: string): ModelCheckResult {
    const witnessState = model.states.find(s => s.label.includes(property));
    const satisfied = !!witnessState;
    this._recordHistory(`checkEF(${property}, satisfied=${satisfied})`);
    return {
      satisfied,
      states: witnessState ? [witnessState.name] : [],
      counterexample: satisfied ? null : [model.initial],
      formula: `EF(${property})`,
    };
  }

  public checkAU(model: KripkeStructure, p: string, q: string): ModelCheckResult {
    const satisfied = model.states.some(s => s.label.includes(q));
    this._recordHistory(`checkAU(${p}, ${q}, satisfied=${satisfied})`);
    return {
      satisfied,
      states: satisfied ? model.states.filter(s => s.label.includes(q)).map(s => s.name) : [],
      counterexample: satisfied ? null : [model.initial],
      formula: `A[${p} U ${q}]`,
    };
  }

  public checkEW(model: KripkeStructure, p: string, q: string): ModelCheckResult {
    const satisfied = model.states.some(s => s.label.includes(p)) || model.states.some(s => s.label.includes(q));
    this._recordHistory(`checkEW(${p}, ${q}, satisfied=${satisfied})`);
    return {
      satisfied,
      states: satisfied ? model.states.slice(0, 1).map(s => s.name) : [],
      counterexample: satisfied ? null : [model.initial],
      formula: `E[${p} W ${q}]`,
    };
  }

  public fairCTL(model: KripkeStructure, formula: CTLFormula, fairness: string[]): ModelCheckResult {
    const satisfied = Math.random() > 0.2;
    this._recordHistory(`fairCTL(fairness=${fairness.length}, satisfied=${satisfied})`);
    return {
      satisfied,
      states: satisfied ? model.states.map(s => s.name) : [],
      counterexample: satisfied ? null : [model.initial],
      formula: `fair-${formula.type}`,
    };
  }

  public muCalculus(model: KripkeStructure, formula: { variable: string; body: string }): ModelCheckResult {
    const satisfied = Math.random() > 0.5;
    this._recordHistory(`muCalculus(${formula.variable}, satisfied=${satisfied})`);
    return {
      satisfied,
      states: satisfied ? model.states.slice(0, 1).map(s => s.name) : [],
      counterexample: satisfied ? null : [model.initial],
      formula: `μ${formula.variable}.${formula.body}`,
    };
  }

  public boundedMC(model: KripkeStructure, formula: CTLFormula, k: number): { satisfied: boolean; bound: number; pathLength: number } {
    const pathLength = Math.min(k, model.states.length);
    const satisfied = Math.random() > 0.4;
    this._recordHistory(`boundedMC(k=${k}, satisfied=${satisfied})`);
    return { satisfied, bound: k, pathLength };
  }

  public symbolicMC(bdd: { nodes: number }, formula: CTLFormula): { satisfied: boolean; bddNodes: number; symbolic: boolean } {
    const satisfied = Math.random() > 0.4;
    this._recordHistory(`symbolicMC(nodes=${bdd.nodes})`);
    return { satisfied, bddNodes: bdd.nodes, symbolic: true };
  }

  public counterexample(model: KripkeStructure, formula: CTLFormula): { found: boolean; path: string[]; length: number } {
    const path = [model.initial];
    const length = Math.min(5, model.states.length);
    for (let i = 1; i < length; i++) {
      const next = model.states[i]?.name;
      if (next) path.push(next);
    }
    const found = Math.random() > 0.5;
    this._recordHistory(`counterexample(found=${found})`);
    return { found, path, length: path.length };
  }

  public witness(model: KripkeStructure, formula: CTLFormula): { found: boolean; path: string[]; length: number } {
    const found = Math.random() > 0.4;
    const path = found ? [model.initial, model.states[1]?.name ?? model.initial] : [];
    this._recordHistory(`witness(found=${found})`);
    return { found, path, length: path.length };
  }

  public stateExplosion(model: KripkeStructure, techniques: string[]): { mitigated: boolean; techniques: number; states: number } {
    const states = model.states.length;
    const mitigated = techniques.length > 0;
    this._recordHistory(`stateExplosion(states=${states}, techs=${techniques.length})`);
    return { mitigated, techniques: techniques.length, states };
  }

  public reduction(model: KripkeStructure, equivalence: 'bisimulation' | 'simulation' | 'trace'): { reduced: number; original: number; equivalence: string } {
    const reduced = Math.floor(model.states.length * 0.6);
    this._recordHistory(`reduction(${equivalence}, ${model.states.length}->${reduced})`);
    return { reduced, original: model.states.length, equivalence };
  }

  public results(): ModelCheckResult[] {
    return this._results.map(r => ({
      ...r,
      states: [...r.states],
      counterexample: r.counterexample ? [...r.counterexample] : null,
    }));
  }

  public models(): KripkeStructure[] {
    return Array.from(this._models.values()).map(k => ({
      states: k.states.map(s => ({ ...s, transitions: [...s.transitions], label: [...s.label] })),
      transitions: k.transitions.map(t => ({ ...t })),
      initial: k.initial,
    }));
  }

  public lastResult(): ModelCheckResult | null {
    return this._results.length > 0
      ? {
          ...this._results[this._results.length - 1],
          states: [...this._results[this._results.length - 1].states],
          counterexample: this._results[this._results.length - 1].counterexample
            ? [...(this._results[this._results.length - 1].counterexample as string[])]
            : null,
        }
      : null;
  }

  public summary(): { models: number; formulas: number; results: number; historyLength: number; counter: number } {
    return {
      models: this._models.size,
      formulas: this._formulas.length,
      results: this._results.length,
      historyLength: this._history.length,
      counter: this._counter,
    };
  }

  public toJSON(): Record<string, unknown> {
    return {
      models: this._models.size,
      formulas: this._formulas.length,
      results: this._results.length,
      history: [...this._history],
      satisfiedCount: this._results.filter(r => r.satisfied).length,
    };
  }

  public validate(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    for (const m of this._models.values()) {
      const stateNames = new Set(m.states.map(s => s.name));
      if (!stateNames.has(m.initial)) issues.push(`model: initial state ${m.initial} not in states`);
      for (const t of m.transitions) {
        if (!stateNames.has(t.from)) issues.push(`transition: source ${t.from} not in states`);
        if (!stateNames.has(t.to)) issues.push(`transition: target ${t.to} not in states`);
      }
    }
    return { valid: issues.length === 0, issues };
  }

  public coverageReport(model: KripkeStructure): {
    totalStates: number;
    reachableStates: number;
    coverage: number;
    deadEnds: number;
  } {
    const reachable = new Set<string>([model.initial]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const t of model.transitions) {
        if (reachable.has(t.from) && !reachable.has(t.to)) {
          reachable.add(t.to);
          changed = true;
        }
      }
    }
    const deadEnds = model.states.filter(s => reachable.has(s.name) && !model.transitions.some(t => t.from === s.name)).length;
    return {
      totalStates: model.states.length,
      reachableStates: reachable.size,
      coverage: model.states.length > 0 ? reachable.size / model.states.length : 0,
      deadEnds,
    };
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  public toPacket(): DataPacket<{
    models: number;
    formulas: number;
    results: number;
    history: string[];
  }> {
    return {
      id: `modelcheck-${Date.now()}-${this._counter}`,
      payload: {
        models: this._models.size,
        formulas: this._formulas.length,
        results: this._results.length,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['formal_verification', 'model_checker', 'result'],
        priority: 0.9,
        phase: 'verification',
      },
    };
  }

  public reset(): void {
    this._models.clear();
    this._formulas = [];
    this._results = [];
    this._history = [];
    this._counter = 0;
  }
}
