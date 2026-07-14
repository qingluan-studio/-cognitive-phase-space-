/**
 * 涌现意志模块：通过大量简单规则的局部交互，
 * 在群体层面涌现出复杂的集体意志与决策方向。
 */

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
  emergedAt: number;
}

export class EmergentWill {
  private _agents: Map<string, Record<string, unknown>> = new Map();
  private _rules: AgentRule[] = [];
  private _emergences: CollectiveWill[] = [];
  private _consensusThreshold = 0.6;

  registerAgent(agentId: string, initialState: Record<string, unknown>): void {
    this._agents.set(agentId, initialState);
  }

  addRule(rule: AgentRule): void {
    this._rules.push(rule);
  }

  step(): void {
    for (const [id, state] of this._agents) {
      for (const rule of this._rules) {
        if (rule.condition(state)) {
          state['lastAction'] = rule.action;
          state['lastRule'] = rule.id;
          break;
        }
      }
    }
  }

  tallyVotes(): Map<string, number> {
    const tally = new Map<string, number>();
    for (const state of this._agents.values()) {
      const action = state['lastAction'] as string;
      if (action) {
        tally.set(action, (tally.get(action) ?? 0) + 1);
      }
    }
    return tally;
  }

  emerge(): CollectiveWill | null {
    const tally = this.tallyVotes();
    if (tally.size === 0) return null;
    let topAction = '';
    let topCount = 0;
    for (const [action, count] of tally) {
      if (count > topCount) {
        topCount = count;
        topAction = action;
      }
    }
    const consensus = topCount / this._agents.size;
    const will: CollectiveWill = {
      decision: topAction,
      supportCount: topCount,
      totalCount: this._agents.size,
      consensus,
      emergedAt: Date.now(),
    };
    if (consensus >= this._consensusThreshold) {
      this._emergences.push(will);
      if (this._emergences.length > 100) this._emergences.shift();
    }
    return will;
  }

  setConsensusThreshold(value: number): void {
    this._consensusThreshold = Math.max(0, Math.min(1, value));
  }

  getEmergenceHistory(limit: number = 50): CollectiveWill[] {
    return this._emergences.slice(-limit);
  }

  resetAgents(): void {
    for (const state of this._agents.values()) {
      state['lastAction'] = null;
      state['lastRule'] = null;
    }
  }

  getAgentState(agentId: string): Record<string, unknown> | null {
    return this._agents.get(agentId) ?? null;
  }

  get agentCount(): number {
    return this._agents.size;
  }

  get ruleCount(): number {
    return this._rules.length;
  }
}
