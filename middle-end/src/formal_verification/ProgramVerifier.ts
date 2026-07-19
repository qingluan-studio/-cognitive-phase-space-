import { DataPacket } from '../shared/types';

/** A program specification. */
export interface Specification {
  readonly precondition: string;
  readonly postcondition: string;
  readonly invariants: string[];
  readonly modifies: string[];
}

/** A verification condition. */
export interface VerificationCondition {
  readonly condition: string;
  readonly source: string;
  readonly valid: boolean;
  readonly discharge: string;
}

/** A Hoare triple {P} C {Q}. */
export interface HoareTriple {
  readonly precondition: string;
  readonly program: string;
  readonly postcondition: string;
  readonly valid: boolean;
}

/** Result of a verification attempt. */
export interface VerificationResult {
  readonly verified: boolean;
  readonly conditions: VerificationCondition[];
  readonly errors: string[];
  readonly time: number;
}

export class ProgramVerifier {
  private _specs: Map<string, Specification> = new Map();
  private _conditions: VerificationCondition[] = [];
  private _triples: HoareTriple[] = [];
  private _history: string[] = [];
  private _counter = 0;

  get specCount(): number {
    return this._specs.size;
  }

  get conditionCount(): number {
    return this._conditions.length;
  }

  get tripleCount(): number {
    return this._triples.length;
  }

  get history(): string[] {
    return [...this._history];
  }

  public hoareLogic(pre: string, program: string, post: string): HoareTriple {
    const valid = pre.length > 0 && post.length > 0 && !program.includes('error');
    const triple: HoareTriple = { precondition: pre, program, postcondition: post, valid };
    this._triples.push(triple);
    this._recordHistory(`hoareLogic(valid=${valid})`);
    return triple;
  }

  public weakestPrecondition(program: string, post: string): { wp: string; program: string; post: string } {
    const wp = `wp("${program}", ${post})`;
    this._recordHistory('weakestPrecondition()');
    return { wp, program, post };
  }

  public strongestPostcondition(pre: string, program: string): { sp: string; pre: string; program: string } {
    const sp = `sp(${pre}, "${program}")`;
    this._recordHistory('strongestPostcondition()');
    return { sp, pre, program };
  }

  public verificationCondition(program: string, spec: Specification): VerificationResult {
    const conditions: VerificationCondition[] = [
      { condition: spec.precondition, source: 'entry', valid: true, discharge: 'assumption' },
      { condition: spec.postcondition, source: 'exit', valid: Math.random() > 0.2, discharge: 'wp-calculation' },
      ...spec.invariants.map((inv, i) => ({
        condition: inv,
        source: `loop-${i}`,
        valid: Math.random() > 0.3,
        discharge: 'invariant-preservation',
      })),
    ];
    const errors = conditions.filter(c => !c.valid).map(c => `cannot discharge: ${c.condition}`);
    const verified = errors.length === 0;
    this._conditions.push(...conditions);
    this._recordHistory(`verificationCondition(verified=${verified})`);
    return { verified, conditions, errors, time: Date.now() };
  }

  public invariantDiscovery(loop: { body: string; guard: string }, candidates: string[]): { discovered: string[]; candidates: number; valid: number } {
    const discovered = candidates.filter(() => Math.random() > 0.5);
    this._recordHistory(`invariantDiscovery(found=${discovered.length}/${candidates.length})`);
    return { discovered, candidates: candidates.length, valid: discovered.length };
  }

  public rankingFunction(loop: { body: string; guard: string }, variant: string): { found: boolean; variant: string; decreasing: boolean } {
    const found = variant.length > 0;
    this._recordHistory(`rankingFunction(found=${found})`);
    return { found, variant, decreasing: found };
  }

  public partialCorrectness(triple: HoareTriple): { correct: boolean; triple: HoareTriple } {
    this._recordHistory(`partialCorrectness(valid=${triple.valid})`);
    return { correct: triple.valid, triple };
  }

  public totalCorrectness(triple: HoareTriple): { correct: boolean; terminates: boolean; triple: HoareTriple } {
    const terminates = Math.random() > 0.2;
    this._recordHistory(`totalCorrectness(correct=${triple.valid && terminates})`);
    return { correct: triple.valid && terminates, terminates, triple };
  }

  public dataFlow(program: string, analysis: 'reaching' | 'live' | 'available' | 'very-busy'): { facts: Record<string, string[]>; analysis: string } {
    const lines = program.split(';').filter(l => l.trim().length > 0);
    const facts: Record<string, string[]> = {};
    lines.forEach((l, i) => {
      facts[`line-${i}`] = [`${analysis}-fact`];
    });
    this._recordHistory(`dataFlow(${analysis}, lines=${lines.length})`);
    return { facts, analysis };
  }

  public controlFlow(program: string, analysis: 'dominator' | 'postdominator' | 'loop' | 'strongly-connected'): { graph: { nodes: number; edges: number }; analysis: string; cycles: number } {
    const nodes = program.split(';').length;
    const edges = Math.max(0, nodes - 1);
    const cycles = analysis === 'loop' ? Math.floor(nodes / 3) : 0;
    this._recordHistory(`controlFlow(${analysis}, nodes=${nodes})`);
    return { graph: { nodes, edges }, analysis, cycles };
  }

  public abstractInterpretation(program: string, domain: 'interval' | 'sign' | 'constant' | 'polyhedra'): { abstract: Record<string, unknown>; domain: string; precise: boolean } {
    const abstract: Record<string, unknown> = {};
    program.split(';').forEach((l, i) => {
      abstract[`var-${i}`] = domain === 'interval' ? [0, 100] : domain === 'sign' ? '+' : domain === 'constant' ? 0 : [];
    });
    this._recordHistory(`abstractInterpretation(${domain})`);
    return { abstract, domain, precise: domain === 'interval' };
  }

  public symbolicExecution(program: string, inputs: Record<string, number>): { paths: number; constraints: string[]; feasible: number; outputs: unknown[] } {
    const paths = Math.min(8, Math.pow(2, Object.keys(inputs).length));
    const constraints: string[] = [];
    const outputs: unknown[] = [];
    for (let i = 0; i < paths; i++) {
      constraints.push(`path_${i}: ${program}`);
      outputs.push({ path: i, result: i % 2 === 0 ? 'ok' : 'error' });
    }
    this._recordHistory(`symbolicExecution(paths=${paths})`);
    return { paths, constraints, feasible: paths, outputs };
  }

  public assumeAssertion(program: string): { assumptions: string[]; assertions: string[]; verified: boolean } {
    const assumptions = program.match(/assume\([^)]+\)/g) ?? [];
    const assertions = program.match(/assert\([^)]+\)/g) ?? [];
    const verified = assertions.length > 0;
    this._recordHistory(`assumeAssertion(assumptions=${assumptions.length}, assertions=${assertions.length})`);
    return { assumptions, assertions, verified };
  }

  public intermediateAssertion(program: string, assertions: string[]): { inserted: number; verified: number; assertions: string[] } {
    const verified = assertions.filter(() => Math.random() > 0.3).length;
    this._recordHistory(`intermediateAssertion(verified=${verified}/${assertions.length})`);
    return { inserted: assertions.length, verified, assertions };
  }

  public registerSpec(name: string, spec: Specification): void {
    this._specs.set(name, spec);
  }

  public triples(): HoareTriple[] {
    return this._triples.map(t => ({ ...t }));
  }

  public specs(): Specification[] {
    return Array.from(this._specs.values()).map(s => ({ ...s, invariants: [...s.invariants], modifies: [...s.modifies] }));
  }

  public conditions(): VerificationCondition[] {
    return this._conditions.map(c => ({ ...c }));
  }

  public lastTriple(): HoareTriple | null {
    return this._triples.length > 0 ? { ...this._triples[this._triples.length - 1] } : null;
  }

  public summary(): { specs: number; conditions: number; triples: number; historyLength: number; counter: number } {
    return {
      specs: this._specs.size,
      conditions: this._conditions.length,
      triples: this._triples.length,
      historyLength: this._history.length,
      counter: this._counter,
    };
  }

  public toJSON(): Record<string, unknown> {
    return {
      specs: this._specs.size,
      conditions: this._conditions.length,
      triples: this._triples.length,
      history: [...this._history],
      verifiedTriples: this._triples.filter(t => t.valid).length,
      specNames: Array.from(this._specs.keys()),
    };
  }

  public validate(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    for (const [name, spec] of this._specs) {
      if (spec.precondition.length === 0) issues.push(`spec ${name}: empty precondition`);
      if (spec.postcondition.length === 0) issues.push(`spec ${name}: empty postcondition`);
    }
    for (const t of this._triples) {
      if (t.precondition.length === 0) issues.push('triple: empty precondition');
      if (t.program.length === 0) issues.push('triple: empty program');
    }
    for (const c of this._conditions) {
      if (c.condition.length === 0) issues.push('condition: empty condition string');
    }
    return { valid: issues.length === 0, issues };
  }

  public verificationStatistics(): {
    total: number;
    verified: number;
    failed: number;
    avgConditions: number;
    successRate: number;
  } {
    const triples = this._triples.length;
    const verified = this._triples.filter(t => t.valid).length;
    const failed = triples - verified;
    const avgConditions = triples > 0 ? this._conditions.length / triples : 0;
    return { total: triples, verified, failed, avgConditions, successRate: triples > 0 ? verified / triples : 0 };
  }

  public conditionBreakdown(): {
    valid: number;
    invalid: number;
    bySource: { source: string; count: number }[];
  } {
    const valid = this._conditions.filter(c => c.valid).length;
    const invalid = this._conditions.length - valid;
    const sources = new Map<string, number>();
    for (const c of this._conditions) {
      sources.set(c.source, (sources.get(c.source) ?? 0) + 1);
    }
    return {
      valid,
      invalid,
      bySource: Array.from(sources.entries()).map(([source, count]) => ({ source, count })),
    };
  }

  public complexityEstimate(program: string): {
    lines: number;
    branches: number;
    loops: number;
    estimatedDifficulty: 'low' | 'medium' | 'high';
  } {
    const lines = program.split(';').filter(l => l.trim().length > 0).length;
    const branches = (program.match(/if|else|switch/g) ?? []).length;
    const loops = (program.match(/for|while|do/g) ?? []).length;
    const score = branches * 2 + loops * 3;
    const estimatedDifficulty: 'low' | 'medium' | 'high' = score < 5 ? 'low' : score < 15 ? 'medium' : 'high';
    return { lines, branches, loops, estimatedDifficulty };
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  public toPacket(): DataPacket<{
    specs: number;
    conditions: number;
    triples: number;
    history: string[];
  }> {
    return {
      id: `progverify-${Date.now()}-${this._counter}`,
      payload: {
        specs: this._specs.size,
        conditions: this._conditions.length,
        triples: this._triples.length,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['formal_verification', 'program_verifier', 'result'],
        priority: 0.9,
        phase: 'verification',
      },
    };
  }

  public reset(): void {
    this._specs.clear();
    this._conditions = [];
    this._triples = [];
    this._history = [];
    this._counter = 0;
  }
}
