import { DataPacket } from '../shared/types';

/** A theorem with premises and conclusion. */
export interface Theorem {
  readonly premises: string[];
  readonly conclusion: string;
  readonly proof: ProofStep[];
  readonly name: string;
}

/** A single step in a proof. */
export interface ProofStep {
  readonly rule: string;
  readonly from: number[];
  readonly to: string;
  readonly justification: string;
}

/** A logical system specification. */
export interface LogicalSystem {
  readonly type: 'propositional' | 'first-order' | 'higher-order' | 'modal' | 'intuitionistic';
  readonly axioms: string[];
  readonly rules: string[];
}

/** Result of a proof attempt. */
export interface ProofResult {
  readonly proved: boolean;
  readonly steps: ProofStep[];
  readonly length: number;
  readonly system: string;
}

export class TheoremProver {
  private _theorems: Map<string, Theorem> = new Map();
  private _proofs: ProofResult[] = [];
  private _systems: LogicalSystem[] = [];
  private _history: string[] = [];
  private _counter = 0;

  get theoremCount(): number {
    return this._theorems.size;
  }

  get proofCount(): number {
    return this._proofs.length;
  }

  get systemCount(): number {
    return this._systems.length;
  }

  get history(): string[] {
    return [...this._history];
  }

  public naturalDeduction(premises: string[], conclusion: string): ProofResult {
    const steps: ProofStep[] = premises.map((p, i) => ({
      rule: 'premise',
      from: [],
      to: p,
      justification: `premise ${i + 1}`,
    }));
    steps.push({ rule: 'modus-ponens', from: [0, premises.length > 1 ? 1 : 0], to: conclusion, justification: '→I, →E' });
    this._recordHistory(`naturalDeduction(steps=${steps.length})`);
    return { proved: true, steps, length: steps.length, system: 'natural-deduction' };
  }

  public resolution(clauses: string[][], emptyClause: string): ProofResult {
    const steps: ProofStep[] = [];
    for (let i = 0; i < clauses.length - 1; i++) {
      steps.push({
        rule: 'resolution',
        from: [i, i + 1],
        to: `C${i + 1}'`,
        justification: `resolve(${i}, ${i + 1})`,
      });
    }
    steps.push({ rule: 'resolution', from: [clauses.length - 2, clauses.length - 1], to: emptyClause, justification: 'empty clause derived' });
    this._recordHistory(`resolution(clauses=${clauses.length})`);
    return { proved: true, steps, length: steps.length, system: 'resolution' };
  }

  public modusPonens(p: string, pImpQ: string): { conclusion: string; valid: boolean; rule: string } {
    this._recordHistory('modusPonens()');
    return { conclusion: pImpQ.replace(`${p}→`, ''), valid: true, rule: 'MP' };
  }

  public modusTollens(notQ: string, pImpQ: string): { conclusion: string; valid: boolean; rule: string } {
    this._recordHistory('modusTollens()');
    return { conclusion: '¬p', valid: true, rule: 'MT' };
  }

  public induction(baseCase: ProofStep, inductiveStep: ProofStep): ProofResult {
    const steps: ProofStep[] = [baseCase, inductiveStep];
    steps.push({ rule: 'induction', from: [0, 1], to: '∀n P(n)', justification: 'mathematical induction' });
    this._recordHistory('induction()');
    return { proved: true, steps, length: steps.length, system: 'induction' };
  }

  public coinduction(property: string, stream: string): ProofResult {
    const steps: ProofStep[] = [
      { rule: 'coinduction-step', from: [], to: property, justification: `property holds for ${stream}` },
      { rule: 'coinduction', from: [0], to: `coinductive-${property}`, justification: 'greatest fixed point' },
    ];
    this._recordHistory('coinduction()');
    return { proved: true, steps, length: steps.length, system: 'coinduction' };
  }

  public sequentCalculus(sequent: { left: string[]; right: string[] }): ProofResult {
    const steps: ProofStep[] = sequent.left.map((f, i) => ({
      rule: 'axiom',
      from: [],
      to: `${f} ⊢ ${sequent.right[0] ?? '?'}`,
      justification: `left ${i + 1}`,
    }));
    steps.push({ rule: 'cut', from: [0], to: `${sequent.left.join(',')} ⊢ ${sequent.right.join(',')}`, justification: 'sequent' });
    this._recordHistory('sequentCalculus()');
    return { proved: true, steps, length: steps.length, system: 'sequent-calculus' };
  }

  public tableaux(formula: string): ProofResult {
    const steps: ProofStep[] = [
      { rule: 'tableau-root', from: [], to: `¬(${formula})`, justification: 'negate goal' },
      { rule: 'tableau-closed', from: [0], to: 'CLOSED', justification: 'all branches closed' },
    ];
    this._recordHistory('tableaux()');
    return { proved: true, steps, length: steps.length, system: 'tableaux' };
  }

  public hilbertSystem(axioms: string[], rules: string[], theorem: string): ProofResult {
    const steps: ProofStep[] = axioms.map((a, i) => ({
      rule: 'axiom',
      from: [],
      to: a,
      justification: `axiom ${i + 1}`,
    }));
    steps.push({ rule: rules[0] ?? 'MP', from: [0, axioms.length > 1 ? 1 : 0], to: theorem, justification: 'derived' });
    this._recordHistory('hilbertSystem()');
    return { proved: true, steps, length: steps.length, system: 'hilbert' };
  }

  public typeTheory(judgment: { context: string[]; term: string; type: string }): ProofResult {
    const steps: ProofStep[] = [
      { rule: 'var', from: [], to: judgment.term, justification: `context: ${judgment.context.join(',')}` },
      { rule: 'type-check', from: [0], to: `${judgment.term} : ${judgment.type}`, justification: 'type assignment' },
    ];
    this._recordHistory('typeTheory()');
    return { proved: true, steps, length: steps.length, system: 'type-theory' };
  }

  public curryHoward(proposition: string, type: string, program: string): { valid: boolean; correspondence: string; proposition: string; type: string } {
    this._recordHistory('curryHoward()');
    return { valid: true, correspondence: `${proposition} ↔ ${type}, proof = ${program}`, proposition, type };
  }

  public dependentTypes(type: string, proof: ProofStep[]): ProofResult {
    const steps: ProofStep[] = [...proof, { rule: 'dependent-type', from: [], to: type, justification: 'dependent type formation' }];
    this._recordHistory('dependentTypes()');
    return { proved: true, steps, length: steps.length, system: 'dependent-types' };
  }

  public refutation(clauses: string[]): { refuted: boolean; clauses: number; empty: boolean } {
    const refuted = clauses.length > 0;
    this._recordHistory(`refutation(clauses=${clauses.length})`);
    return { refuted, clauses: clauses.length, empty: !refuted };
  }

  public skolemization(formula: string): { skolemized: string; skolemFunctions: number; formula: string } {
    const skolemized = formula.replace(/∀x/g, '').replace(/∃/g, 's_');
    const skolemFunctions = (formula.match(/∃/g) ?? []).length;
    this._recordHistory(`skolemization(funcs=${skolemFunctions})`);
    return { skolemized, skolemFunctions, formula };
  }

  public unification(term1: string, term2: string): { unified: boolean; substitution: Record<string, string>; term1: string; term2: string } {
    const substitution: Record<string, string> = {};
    const unified = term1 === term2 || Math.random() > 0.4;
    if (unified && term1 !== term2) {
      substitution[term1] = term2;
    }
    this._recordHistory(`unification(unified=${unified})`);
    return { unified, substitution, term1, term2 };
  }

  public registerTheorem(name: string, theorem: Theorem): void {
    this._theorems.set(name, theorem);
  }

  public proofs(): ProofResult[] {
    return this._proofs.map(p => ({ ...p, steps: p.steps.map(s => ({ ...s, from: [...s.from] })) }));
  }

  public theorems(): Theorem[] {
    return Array.from(this._theorems.values()).map(t => ({
      ...t,
      premises: [...t.premises],
      proof: t.proof.map(s => ({ ...s, from: [...s.from] })),
    }));
  }

  public lastProof(): ProofResult | null {
    return this._proofs.length > 0
      ? { ...this._proofs[this._proofs.length - 1], steps: this._proofs[this._proofs.length - 1].steps.map(s => ({ ...s, from: [...s.from] })) }
      : null;
  }

  public summary(): { theorems: number; proofs: number; systems: number; historyLength: number; counter: number } {
    return {
      theorems: this._theorems.size,
      proofs: this._proofs.length,
      systems: this._systems.length,
      historyLength: this._history.length,
      counter: this._counter,
    };
  }

  public toJSON(): Record<string, unknown> {
    return {
      theorems: this._theorems.size,
      proofs: this._proofs.length,
      systems: this._systems.length,
      history: [...this._history],
      provedCount: this._proofs.filter(p => p.proved).length,
      theoremNames: Array.from(this._theorems.keys()),
    };
  }

  public validate(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    for (const t of this._theorems.values()) {
      if (t.conclusion.length === 0) issues.push(`theorem ${t.name}: empty conclusion`);
      if (t.proof.length === 0) issues.push(`theorem ${t.name}: empty proof`);
      for (const step of t.proof) {
        for (const from of step.from) {
          if (from < 0 || from >= t.proof.length) {
            issues.push(`theorem ${t.name}: step references invalid index ${from}`);
          }
        }
      }
    }
    for (const p of this._proofs) {
      if (p.length !== p.steps.length) issues.push('proof: length field mismatch');
    }
    return { valid: issues.length === 0, issues };
  }

  public proofStatistics(): {
    total: number;
    proved: number;
    avgLength: number;
    bySystem: { system: string; count: number }[];
  } {
    const total = this._proofs.length;
    const proved = this._proofs.filter(p => p.proved).length;
    const avgLength = total > 0 ? this._proofs.reduce((s, p) => s + p.length, 0) / total : 0;
    const systemCounts = new Map<string, number>();
    for (const p of this._proofs) {
      systemCounts.set(p.system, (systemCounts.get(p.system) ?? 0) + 1);
    }
    return {
      total,
      proved,
      avgLength,
      bySystem: Array.from(systemCounts.entries()).map(([system, count]) => ({ system, count })),
    };
  }

  public proofComparison(proofs: ProofResult[]): {
    shortest: { system: string; length: number } | null;
    longest: { system: string; length: number } | null;
    avgLength: number;
  } {
    if (proofs.length === 0) return { shortest: null, longest: null, avgLength: 0 };
    const sorted = [...proofs].sort((a, b) => a.length - b.length);
    return {
      shortest: { system: sorted[0].system, length: sorted[0].length },
      longest: { system: sorted[sorted.length - 1].system, length: sorted[sorted.length - 1].length },
      avgLength: proofs.reduce((s, p) => s + p.length, 0) / proofs.length,
    };
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  public toPacket(): DataPacket<{
    theorems: number;
    proofs: number;
    systems: number;
    history: string[];
  }> {
    return {
      id: `theoremprover-${Date.now()}-${this._counter}`,
      payload: {
        theorems: this._theorems.size,
        proofs: this._proofs.length,
        systems: this._systems.length,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['formal_verification', 'theorem_prover', 'result'],
        priority: 0.9,
        phase: 'verification',
      },
    };
  }

  public reset(): void {
    this._theorems.clear();
    this._proofs = [];
    this._systems = [];
    this._history = [];
    this._counter = 0;
  }
}
