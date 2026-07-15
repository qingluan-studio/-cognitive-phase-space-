export interface ContractRule {
  id: string;
  condition: string;
  obligation: string;
  beneficiaries: string[];
  enforcement: number;
}

export interface AgentPosition {
  agentId: string;
  resources: number;
  riskAversion: number;
  bargainingPower: number;
}

export class SocialContract {
  private _rules: ContractRule[];
  private _agents: Map<string, AgentPosition>;
  private _agreements: Map<string, Set<string>>;
  private _history: { ruleId: string; supporters: number; opposers: number }[];

  constructor() {
    this._rules = [];
    this._agents = new Map();
    this._agreements = new Map();
    this._history = [];
  }

  get ruleCount(): number { return this._rules.length; }
  get agentCount(): number { return this._agents.size; }

  public addAgent(agentId: string, resources: number, riskAversion: number = 0.5): void {
    this._agents.set(agentId, { agentId, resources, riskAversion, bargainingPower: resources });
  }

  public addRule(rule: ContractRule): void {
    this._rules.push(rule);
    this._agreements.set(rule.id, new Set());
  }

  public computeExpectedUtility(agentId: string, ruleId: string): number {
    const agent = this._agents.get(agentId);
    const rule = this._rules.find(r => r.id === ruleId);
    if (!agent || !rule) return 0;
    const isBeneficiary = rule.beneficiaries.includes(agentId);
    const cost = isBeneficiary ? 0 : rule.enforcement * 0.1;
    const benefit = isBeneficiary ? agent.resources * 0.1 : 0;
    return benefit - cost * agent.riskAversion;
  }

  public vote(agentId: string, ruleId: string): boolean {
    const utility = this.computeExpectedUtility(agentId, ruleId);
    const supports = utility > 0;
    if (supports) {
      this._agreements.get(ruleId)?.add(agentId);
    }
    return supports;
  }

  public tallyVotes(ruleId: string): { supporters: number; opposers: number; passes: boolean } {
    let supporters = 0;
    let opposers = 0;
    for (const agentId of this._agents.keys()) {
      if (this.vote(agentId, ruleId)) supporters++;
      else opposers++;
    }
    const passes = supporters > this._agents.size / 2;
    this._history.push({ ruleId, supporters, opposers });
    return { supporters, opposers, passes };
  }

  public computeNashBargaining(agentA: string, agentB: string): { splitA: number; splitB: number } {
    const a = this._agents.get(agentA);
    const b = this._agents.get(agentB);
    if (!a || !b) return { splitA: 0, splitB: 0 };
    const total = a.resources + b.resources;
    const threatA = a.resources * a.riskAversion;
    const threatB = b.resources * b.riskAversion;
    const surplus = total - threatA - threatB;
    const splitA = threatA + surplus / 2;
    const splitB = threatB + surplus / 2;
    return { splitA, splitB };
  }

  public computeVeilOfIgnoranceUtility(ruleId: string): number {
    const rule = this._rules.find(r => r.id === ruleId);
    if (!rule) return 0;
    let totalUtility = 0;
    for (const agent of this._agents.values()) {
      const originalResources = agent.resources;
      const shuffledResources = Array.from(this._agents.values()).map(a => a.resources);
      const avgResources = shuffledResources.reduce((sum, r) => sum + r, 0) / shuffledResources.length;
      agent.resources = avgResources;
      totalUtility += this.computeExpectedUtility(agent.agentId, ruleId);
      agent.resources = originalResources;
    }
    return totalUtility / this._agents.size;
  }

  public findRawlsianOptimal(): string | null {
    let bestRule: string | null = null;
    let maxMinUtility = -Infinity;
    for (const rule of this._rules) {
      const utilities = Array.from(this._agents.keys()).map(id => this.computeExpectedUtility(id, rule.id));
      const minUtility = Math.min(...utilities);
      if (minUtility > maxMinUtility) {
        maxMinUtility = minUtility;
        bestRule = rule.id;
      }
    }
    return bestRule;
  }

  public computeGiniCoefficient(): number {
    const resources = Array.from(this._agents.values()).map(a => a.resources).sort((a, b) => a - b);
    let sum = 0;
    for (let i = 0; i < resources.length; i++) {
      sum += (2 * (i + 1) - resources.length - 1) * resources[i];
    }
    const mean = resources.reduce((a, b) => a + b, 0) / resources.length;
    return mean > 0 ? sum / (resources.length * resources.length * mean) : 0;
  }

  public enforceRule(ruleId: string): number {
    const rule = this._rules.find(r => r.id === ruleId);
    if (!rule) return 0;
    let compliance = 0;
    for (const agent of this._agents.values()) {
      const utility = this.computeExpectedUtility(agent.agentId, ruleId);
      if (utility >= -rule.enforcement) compliance++;
    }
    return compliance / this._agents.size;
  }

  public simulateEvolution(generations: number = 10): void {
    for (let g = 0; g < generations; g++) {
      for (const rule of this._rules) {
        const result = this.tallyVotes(rule.id);
        if (result.passes) {
          rule.enforcement *= 1.1;
        } else {
          rule.enforcement *= 0.9;
        }
      }
    }
  }

  public reset(): void {
    this._rules = [];
    this._agents.clear();
    this._agreements.clear();
    this._history = [];
  }

  public exportRules(): ContractRule[] {
    return this._rules.map(r => ({ ...r, beneficiaries: [...r.beneficiaries] }));
  }
}
