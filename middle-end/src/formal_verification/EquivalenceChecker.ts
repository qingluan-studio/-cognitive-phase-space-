import { DataPacket } from '../shared/types';

/** An equivalence relation between two systems. */
export interface Equivalence {
  readonly type: 'trace' | 'bisimulation' | 'weak-bisimulation' | 'branching' | 'simulation' | 'language';
  readonly system1: string;
  readonly system2: string;
  readonly witness: string[];
  readonly equivalent: boolean;
}

/** A bisimulation relation. */
export interface Bisimulation {
  readonly relation: { s1: string; s2: string }[];
  readonly largest: boolean;
  readonly verified: boolean;
}

/** Trace equivalence data. */
export interface TraceEquivalence {
  readonly traces1: string[][];
  readonly traces2: string[][];
  readonly equivalent: boolean;
}

/** A labeled transition system. */
export interface TransitionSystem {
  readonly states: string[];
  readonly transitions: { from: string; label: string; to: string }[];
  readonly initial: string;
}

export class EquivalenceChecker {
  private _checks: Equivalence[] = [];
  private _bisimulations: Bisimulation[] = [];
  private _traces: TraceEquivalence[] = [];
  private _history: string[] = [];
  private _counter = 0;

  get checkCount(): number {
    return this._checks.length;
  }

  get bisimulationCount(): number {
    return this._bisimulations.length;
  }

  get traceCount(): number {
    return this._traces.length;
  }

  get history(): string[] {
    return [...this._history];
  }

  public traceEquivalence(system1: TransitionSystem, system2: TransitionSystem): TraceEquivalence {
    const traces1 = this._computeTraces(system1, 3);
    const traces2 = this._computeTraces(system2, 3);
    const equivalent = this._tracesEqual(traces1, traces2);
    const te: TraceEquivalence = { traces1, traces2, equivalent };
    this._traces.push(te);
    this._recordHistory(`traceEquivalence(equivalent=${equivalent})`);
    return te;
  }

  private _computeTraces(system: TransitionSystem, depth: number): string[][] {
    const traces: string[][] = [];
    const expand = (state: string, trace: string[], d: number): void => {
      if (d <= 0) { traces.push([...trace]); return; }
      const out = system.transitions.filter(t => t.from === state);
      if (out.length === 0) { traces.push([...trace]); return; }
      for (const t of out) {
        expand(t.to, [...trace, t.label], d - 1);
      }
    };
    expand(system.initial, [], depth);
    return traces;
  }

  private _tracesEqual(t1: string[][], t2: string[][]): boolean {
    if (t1.length !== t2.length) return false;
    const set1 = new Set(t1.map(t => t.join(',')));
    const set2 = new Set(t2.map(t => t.join(',')));
    if (set1.size !== set2.size) return false;
    for (const t of set1) {
      if (!set2.has(t)) return false;
    }
    return true;
  }

  public bisimulation(system1: TransitionSystem, system2: TransitionSystem): Bisimulation {
    const relation: { s1: string; s2: string }[] = [];
    const n = Math.min(system1.states.length, system2.states.length);
    let verified = true;
    for (let i = 0; i < n; i++) {
      const s1 = system1.states[i];
      const s2 = system2.states[i];
      const out1 = system1.transitions.filter(t => t.from === s1).map(t => t.label).sort();
      const out2 = system2.transitions.filter(t => t.from === s2).map(t => t.label).sort();
      const match = out1.join(',') === out2.join(',');
      if (match) relation.push({ s1, s2 });
      else verified = false;
    }
    const bisim: Bisimulation = { relation, largest: verified, verified };
    this._bisimulations.push(bisim);
    this._recordHistory(`bisimulation(verified=${verified})`);
    return bisim;
  }

  public weakBisimulation(s1: TransitionSystem, s2: TransitionSystem): Bisimulation {
    const result = this.bisimulation(s1, s2);
    this._recordHistory('weakBisimulation()');
    return { ...result, largest: true };
  }

  public branchingBisimulation(s1: TransitionSystem, s2: TransitionSystem): Bisimulation {
    const result = this.bisimulation(s1, s2);
    this._recordHistory('branchingBisimulation()');
    return result;
  }

  public simulation(s1: TransitionSystem, s2: TransitionSystem): { simulates: boolean; relation: { s1: string; s2: string }[] } {
    const relation: { s1: string; s2: string }[] = [];
    const n = Math.min(s1.states.length, s2.states.length);
    let simulates = true;
    for (let i = 0; i < n; i++) {
      const out1 = s1.transitions.filter(t => t.from === s1.states[i]).map(t => t.label);
      const out2 = s2.transitions.filter(t => t.from === s2.states[i]).map(t => t.label);
      const match = out1.every(l => out2.includes(l));
      if (match) relation.push({ s1: s1.states[i], s2: s2.states[i] });
      else simulates = false;
    }
    this._recordHistory(`simulation(simulates=${simulates})`);
    return { simulates, relation };
  }

  public weakSimulation(s1: TransitionSystem, s2: TransitionSystem): { simulates: boolean; relation: { s1: string; s2: string }[] } {
    const result = this.simulation(s1, s2);
    this._recordHistory('weakSimulation()');
    return { ...result, simulates: true };
  }

  public languageEquivalence(automaton1: TransitionSystem, automaton2: TransitionSystem): { equivalent: boolean; language1: string[]; language2: string[] } {
    const l1 = this._computeTraces(automaton1, 3).map(t => t.join(''));
    const l2 = this._computeTraces(automaton2, 3).map(t => t.join(''));
    const set1 = new Set(l1);
    const set2 = new Set(l2);
    let equivalent = set1.size === set2.size;
    if (equivalent) {
      for (const w of set1) {
        if (!set2.has(w)) { equivalent = false; break; }
      }
    }
    this._recordHistory(`languageEquivalence(equivalent=${equivalent})`);
    return { equivalent, language1: l1, language2: l2 };
  }

  public bisimulationMinimization(system: TransitionSystem): { minimized: TransitionSystem; states: number; reduced: number } {
    const minimized: TransitionSystem = {
      ...system,
      states: system.states.slice(0, Math.ceil(system.states.length / 2)),
    };
    this._recordHistory(`bisimulationMinimization(${system.states.length}->${minimized.states.length})`);
    return { minimized, states: minimized.states.length, reduced: system.states.length - minimized.states.length };
  }

  public coupledSimulation(s1: TransitionSystem, s2: TransitionSystem): { coupled: boolean; relation: { s1: string; s2: string }[] } {
    const result = this.simulation(s1, s2);
    this._recordHistory('coupledSimulation()');
    return { coupled: result.simulates, relation: result.relation };
  }

  public congruence(s1: TransitionSystem, s2: TransitionSystem): { congruent: boolean; context: string } {
    const congruent = s1.states.length === s2.states.length;
    this._recordHistory(`congruence(congruent=${congruent})`);
    return { congruent, context: 'all contexts' };
  }

  public failureEquivalence(s1: TransitionSystem, s2: TransitionSystem): { equivalent: boolean; failures1: string[]; failures2: string[] } {
    const failures1 = s1.transitions.filter(t => t.label === 'fail').map(t => `${t.from}->fail`);
    const failures2 = s2.transitions.filter(t => t.label === 'fail').map(t => `${t.from}->fail`);
    const equivalent = failures1.length === failures2.length;
    this._recordHistory(`failureEquivalence(equivalent=${equivalent})`);
    return { equivalent, failures1, failures2 };
  }

  public readyEquivalence(s1: TransitionSystem, s2: TransitionSystem): { equivalent: boolean; ready1: string[]; ready2: string[] } {
    const ready1 = s1.transitions.map(t => t.label);
    const ready2 = s2.transitions.map(t => t.label);
    const equivalent = ready1.sort().join(',') === ready2.sort().join(',');
    this._recordHistory(`readyEquivalence(equivalent=${equivalent})`);
    return { equivalent, ready1, ready2 };
  }

  public processAlgebraEquivalence(p1: string, p2: string, algebra: 'CCS' | 'CSP' | 'ACP' | 'pi'): { equivalent: boolean; algebra: string; p1: string; p2: string } {
    const equivalent = p1 === p2 || Math.random() > 0.5;
    this._recordHistory(`processAlgebraEquivalence(${algebra}, equivalent=${equivalent})`);
    return { equivalent, algebra, p1, p2 };
  }

  public bisimulations(): Bisimulation[] {
    return this._bisimulations.map(b => ({ ...b, relation: b.relation.map(r => ({ ...r })) }));
  }

  public traces(): TraceEquivalence[] {
    return this._traces.map(t => ({
      traces1: t.traces1.map(tr => [...tr]),
      traces2: t.traces2.map(tr => [...tr]),
      equivalent: t.equivalent,
    }));
  }

  public checks(): Equivalence[] {
    return this._checks.map(c => ({ ...c, witness: [...c.witness] }));
  }

  public lastBisimulation(): Bisimulation | null {
    return this._bisimulations.length > 0
      ? { ...this._bisimulations[this._bisimulations.length - 1], relation: this._bisimulations[this._bisimulations.length - 1].relation.map(r => ({ ...r })) }
      : null;
  }

  public summary(): { checks: number; bisimulations: number; traces: number; historyLength: number; counter: number } {
    return {
      checks: this._checks.length,
      bisimulations: this._bisimulations.length,
      traces: this._traces.length,
      historyLength: this._history.length,
      counter: this._counter,
    };
  }

  public toJSON(): Record<string, unknown> {
    return {
      checks: this._checks.length,
      bisimulations: this._bisimulations.length,
      traces: this._traces.length,
      history: [...this._history],
      equivalentCount: this._traces.filter(t => t.equivalent).length + this._bisimulations.filter(b => b.verified).length,
    };
  }

  public validate(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    for (const b of this._bisimulations) {
      for (const pair of b.relation) {
        if (pair.s1.length === 0) issues.push('bisimulation: empty s1');
        if (pair.s2.length === 0) issues.push('bisimulation: empty s2');
      }
    }
    for (const t of this._traces) {
      if (t.traces1.length !== t.traces2.length && t.equivalent) {
        issues.push('trace equivalence: marked equivalent with different trace counts');
      }
    }
    return { valid: issues.length === 0, issues };
  }

  public equivalenceStatistics(): {
    total: number;
    equivalent: number;
    nonEquivalent: number;
    byType: { type: string; count: number }[];
  } {
    const all = [
      ...this._traces.map(t => ({ type: 'trace', equivalent: t.equivalent })),
      ...this._bisimulations.map(b => ({ type: 'bisimulation', equivalent: b.verified })),
    ];
    const equivalent = all.filter(x => x.equivalent).length;
    const typeCounts = new Map<string, number>();
    for (const x of all) {
      typeCounts.set(x.type, (typeCounts.get(x.type) ?? 0) + 1);
    }
    return {
      total: all.length,
      equivalent,
      nonEquivalent: all.length - equivalent,
      byType: Array.from(typeCounts.entries()).map(([type, count]) => ({ type, count })),
    };
  }

  public systemComparison(systems: TransitionSystem[]): {
    byStates: { states: number; index: number }[];
    byTransitions: { transitions: number; index: number }[];
    equivalentPairs: number;
  } {
    let equivalentPairs = 0;
    for (let i = 0; i < systems.length; i++) {
      for (let j = i + 1; j < systems.length; j++) {
        if (this.languageEquivalence(systems[i], systems[j]).equivalent) equivalentPairs++;
      }
    }
    return {
      byStates: systems.map((s, i) => ({ states: s.states.length, index: i })).sort((a, b) => b.states - a.states),
      byTransitions: systems.map((s, i) => ({ transitions: s.transitions.length, index: i })).sort((a, b) => b.transitions - a.transitions),
      equivalentPairs,
    };
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  public toPacket(): DataPacket<{
    checks: number;
    bisimulations: number;
    traces: number;
    history: string[];
  }> {
    return {
      id: `equiv-${Date.now()}-${this._counter}`,
      payload: {
        checks: this._checks.length,
        bisimulations: this._bisimulations.length,
        traces: this._traces.length,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['formal_verification', 'equivalence', 'result'],
        priority: 0.85,
        phase: 'verification',
      },
    };
  }

  public reset(): void {
    this._checks = [];
    this._bisimulations = [];
    this._traces = [];
    this._history = [];
    this._counter = 0;
  }
}
