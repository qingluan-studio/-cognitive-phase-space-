export interface AgentRule {
  id: string;
  weight: number;
  condition: (state: Record<string, unknown>) => boolean;
  action: string;
}

export interface CollectiveWill {
  decision: string;
  supportCount: number;
  totalCount: number;
  consensus: number;
  entropy: number;
  emergedAt: number;
}

export interface CouplingEdge {
  source: string;
  target: string;
  strength: number;
}

export class EmergentWill {
  private _agents: Map<string, Record<string, unknown>> = new Map();
  private _rules: AgentRule[] = [];
  private _emergences: CollectiveWill[] = [];
  private _couplings: Map<string, number> = new Map();
  private _consensusThreshold = 0.6;
  private _entropyCeiling = 0.3;
  private _tick = 0;
  private _influenceField: Map<string, number> = new Map();

  registerAgent(agentId: string, initialState: Record<string, unknown>): void {
    const state: Record<string, unknown> = { ...initialState, lastAction: null, lastRule: null, bias: 0 };
    this._agents.set(agentId, state);
    this._influenceField.set(agentId, 0);
  }

  addRule(rule: AgentRule): void {
    this._rules.push(rule);
    this._rules.sort((a, b) => b.weight - a.weight);
  }

  coupleRules(source: string, target: string, strength: number): void {
    const key = `${source}>${target}`;
    this._couplings.set(key, Math.max(0, Math.min(1, strength)));
  }

  step(): void {
    this._tick += 1;
    for (const [id, state] of this._agents) {
      const matched = this._rules.filter(r => r.condition(state));
      if (matched.length === 0) continue;
      const winner = this._softmaxPick(matched);
      const prev = state['lastAction'] as string | null;
      state['lastAction'] = winner.action;
      state['lastRule'] = winner.id;
      state['bias'] = ((state['bias'] as number) ?? 0) + winner.weight * 0.1;
      if (prev && prev !== winner.action) this._propagateShift(id, winner.action);
    }
  }

  private _softmaxPick(rules: AgentRule[]): AgentRule {
    const logits = rules.map(r => r.weight + (this._influenceField.get(r.id) ?? 0));
    const max = Math.max(...logits);
    const exps = logits.map(l => Math.exp(l - max));
    const sum = exps.reduce((s, e) => s + e, 0);
    let r = Math.random() * sum;
    for (let i = 0; i < rules.length; i++) {
      r -= exps[i];
      if (r <= 0) return rules[i];
    }
    return rules[rules.length - 1];
  }

  private _propagateShift(agentId: string, action: string): void {
    for (const [key, strength] of this._couplings) {
      if (!key.startsWith(`${agentId}>`)) continue;
      const target = key.split('>')[1];
      const cur = this._influenceField.get(target) ?? 0;
      this._influenceField.set(target, cur + strength * 0.05);
    }
    void action;
  }

  tallyVotes(): Map<string, number> {
    const tally = new Map<string, number>();
    for (const state of this._agents.values()) {
      const action = state['lastAction'] as string | null;
      if (!action) continue;
      const bias = (state['bias'] as number) ?? 0;
      tally.set(action, (tally.get(action) ?? 0) + 1 + bias);
    }
    return tally;
  }

  private _shannonEntropy(tally: Map<string, number>): number {
    const total = Array.from(tally.values()).reduce((s, v) => s + v, 0);
    if (total === 0) return 1;
    let h = 0;
    for (const v of tally.values()) {
      const p = v / total;
      if (p > 0) h -= p * Math.log2(p);
    }
    const max = Math.log2(tally.size || 1);
    return max === 0 ? 0 : h / max;
  }

  emerge(): CollectiveWill | null {
    const tally = this.tallyVotes();
    if (tally.size === 0) return null;
    let topAction = '';
    let topCount = 0;
    for (const [action, count] of tally) {
      if (count > topCount) { topCount = count; topAction = action; }
    }
    const consensus = topCount / this._agents.size;
    const entropy = this._shannonEntropy(tally);
    const will: CollectiveWill = {
      decision: topAction,
      supportCount: Math.round(topCount),
      totalCount: this._agents.size,
      consensus,
      entropy,
      emergedAt: Date.now(),
    };
    if (consensus >= this._consensusThreshold && entropy <= this._entropyCeiling) {
      this._emergences.push(will);
      if (this._emergences.length > 100) this._emergences.shift();
    }
    return will;
  }

  setConsensusThreshold(value: number): void {
    this._consensusThreshold = Math.max(0, Math.min(1, value));
  }

  setEntropyCeiling(value: number): void {
    this._entropyCeiling = Math.max(0, Math.min(1, value));
  }

  measureCoherence(): number {
    if (this._agents.size === 0) return 0;
    const tally = this.tallyVotes();
    return 1 - this._shannonEntropy(tally);
  }

  getEmergenceHistory(limit: number = 50): CollectiveWill[] {
    return this._emergences.slice(-limit);
  }

  resetAgents(): void {
    for (const state of this._agents.values()) {
      state['lastAction'] = null;
      state['lastRule'] = null;
      state['bias'] = 0;
    }
    this._influenceField.clear();
    for (const id of this._agents.keys()) this._influenceField.set(id, 0);
  }

  getAgentState(agentId: string): Record<string, unknown> | null {
    const s = this._agents.get(agentId);
    return s ? { ...s } : null;
  }

  get agentCount(): number {
    return this._agents.size;
  }

  get ruleCount(): number {
    return this._rules.length;
  }

  get tick(): number {
    return this._tick;
  }

  get couplingCount(): number {
    return this._couplings.size;
  }
}
