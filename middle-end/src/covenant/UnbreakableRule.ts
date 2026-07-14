export interface UnbreakableRuleData {
  rules: Array<{ id: string; clause: string; frozen: boolean; weight: number }>;
  violations: number;
  integrity: number;
}

interface _RuleEntry {
  clause: string;
  weight: number;
  fingerprint: number;
  invoked: number;
}

export class UnbreakableRule {
  private _rules: Map<string, _RuleEntry>;
  private _frozen: Set<string>;
  private _violations: number;
  private _enforcementLog: Array<{ id: string; passed: boolean; ts: number }>;
  private _entanglement: Map<string, Set<string>>;
  private _decay: number;

  constructor(decay: number = 0.999) {
    this._rules = new Map<string, _RuleEntry>();
    this._frozen = new Set<string>();
    this._violations = 0;
    this._enforcementLog = [];
    this._entanglement = new Map<string, Set<string>>();
    this._decay = decay;
  }

  get ruleCount(): number {
    return this._rules.size;
  }

  get violations(): number {
    return this._violations;
  }

  get integrity(): number {
    if (this._rules.size === 0) return 1;
    let acc = 0;
    let total = 0;
    for (const entry of this._rules.values()) {
      const actual = this._fingerprint(entry.clause);
      const intact = entry.fingerprint === actual;
      acc += intact ? entry.weight : 0;
      total += entry.weight;
    }
    return total === 0 ? 1 : acc / total;
  }

  public enact(id: string, clause: string, freeze: boolean = true, weight: number = 1): void {
    if (this._frozen.has(id)) {
      this._violations += 1;
      throw new Error(`Rule ${id} is frozen and cannot be re-enacted.`);
    }
    const entry: _RuleEntry = {
      clause,
      weight: Math.max(0, weight),
      fingerprint: this._fingerprint(clause),
      invoked: 0,
    };
    this._rules.set(id, entry);
    if (freeze) this._frozen.add(id);
    if (!this._entanglement.has(id)) this._entanglement.set(id, new Set<string>());
  }

  public enforce(id: string, value: unknown): boolean {
    const entry = this._rules.get(id);
    this._enforcementLog.push({ id, passed: false, ts: Date.now() });
    if (!entry) {
      this._violations += 1;
      return false;
    }
    entry.invoked += 1;
    entry.weight *= this._decay;
    const candidate = typeof value === 'string' ? value : String(value ?? '');
    const satisfied = candidate.includes(entry.clause);
    const fingerprintMatch = entry.fingerprint === this._fingerprint(entry.clause);
    const passed = satisfied && fingerprintMatch;
    if (!passed) this._violations += 1;
    const last = this._enforcementLog[this._enforcementLog.length - 1];
    if (last) last.passed = passed;
    if (this._enforcementLog.length > 256) this._enforcementLog.shift();
    return passed;
  }

  public entangle(idA: string, idB: string): boolean {
    if (!this._rules.has(idA) || !this._rules.has(idB)) return false;
    this._entanglement.get(idA)!.add(idB);
    this._entanglement.get(idB)!.add(idA);
    return true;
  }

  public propagateBreach(id: string): string[] {
    const chain: string[] = [id];
    const visited = new Set<string>([id]);
    const frontier = [id];
    while (frontier.length > 0) {
      const current = frontier.shift()!;
      const neighbors = this._entanglement.get(current);
      if (!neighbors) continue;
      for (const n of neighbors) {
        if (visited.has(n)) continue;
        visited.add(n);
        const entry = this._rules.get(n);
        if (entry && !this._frozen.has(n)) {
          entry.weight = Math.max(0, entry.weight - 0.1);
          chain.push(n);
          frontier.push(n);
        }
      }
    }
    return chain;
  }

  public read(id: string): string | undefined {
    return this._rules.get(id)?.clause;
  }

  public isFrozen(id: string): boolean {
    return this._frozen.has(id);
  }

  public weightOf(id: string): number {
    return this._rules.get(id)?.weight ?? 0;
  }

  public list(): Array<{ id: string; clause: string; frozen: boolean; weight: number }> {
    const out: Array<{ id: string; clause: string; frozen: boolean; weight: number }> = [];
    for (const [id, entry] of this._rules) {
      out.push({ id, clause: entry.clause, frozen: this._frozen.has(id), weight: entry.weight });
    }
    return out;
  }

  public enforcementHistory(limit: number = 50): Array<{ id: string; passed: boolean; ts: number }> {
    return this._enforcementLog.slice(-limit);
  }

  public report(): UnbreakableRuleData {
    return {
      rules: Array.from(this._rules.entries()).map(([id, e]) => ({
        id,
        clause: e.clause,
        frozen: this._frozen.has(id),
        weight: e.weight,
      })),
      violations: this._violations,
      integrity: this.integrity,
    };
  }

  private _fingerprint(s: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i += 1) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  }
}
