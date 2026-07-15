export interface AgentUtility {
  id: string;
  happiness: number;
  suffering: number;
  duration: number;
  probability: number;
}

export interface ActionOutcome {
  action: string;
  agents: AgentUtility[];
  totalUtility: number;
  averageUtility: number;
}

export class UtilitarianCalculus {
  private _outcomes: Map<string, ActionOutcome>;
  private _discountRate: number;
  private _populationSize: number;
  private _history: ActionOutcome[];

  constructor(discountRate: number = 0.03, populationSize: number = 100) {
    this._outcomes = new Map();
    this._discountRate = discountRate;
    this._populationSize = populationSize;
    this._history = [];
  }

  get discountRate(): number { return this._discountRate; }
  get populationSize(): number { return this._populationSize; }
  get history(): ActionOutcome[] { return this._history; }

  public addOutcome(action: string, agents: AgentUtility[]): void {
    const total = agents.reduce((sum, a) => sum + this._computeAgentUtility(a), 0);
    const avg = total / (agents.length || 1);
    const outcome: ActionOutcome = { action, agents: agents.map(a => ({ ...a })), totalUtility: total, averageUtility: avg };
    this._outcomes.set(action, outcome);
  }

  private _computeAgentUtility(agent: AgentUtility): number {
    const net = agent.happiness - agent.suffering;
    const discounted = net / Math.pow(1 + this._discountRate, agent.duration);
    return discounted * agent.probability;
  }

  public evaluateAction(action: string): number {
    const outcome = this._outcomes.get(action);
    if (!outcome) return 0;
    return outcome.totalUtility;
  }

  public chooseBestAction(): string | null {
    let bestAction: string | null = null;
    let maxUtility = -Infinity;
    for (const [action, outcome] of this._outcomes) {
      if (outcome.totalUtility > maxUtility) {
        maxUtility = outcome.totalUtility;
        bestAction = action;
      }
    }
    if (bestAction) {
      this._history.push(this._outcomes.get(bestAction)!);
    }
    return bestAction;
  }

  public computeGiniCoefficient(action: string): number {
    const outcome = this._outcomes.get(action);
    if (!outcome || outcome.agents.length === 0) return 0;
    const utilities = outcome.agents.map(a => this._computeAgentUtility(a)).sort((a, b) => a - b);
    let sum = 0;
    for (let i = 0; i < utilities.length; i++) {
      sum += (2 * (i + 1) - utilities.length - 1) * utilities[i];
    }
    const mean = utilities.reduce((a, b) => a + b, 0) / utilities.length;
    return mean > 0 ? sum / (utilities.length * utilities.length * mean) : 0;
  }

  public computePrioritarianUtility(action: string, priorityWeight: number = 2): number {
    const outcome = this._outcomes.get(action);
    if (!outcome) return 0;
    return outcome.agents.reduce((sum, a) => {
      const u = this._computeAgentUtility(a);
      return sum + (u < 0 ? u * priorityWeight : u);
    }, 0);
  }

  public computeSufficientarianUtility(action: string, threshold: number = 5): number {
    const outcome = this._outcomes.get(action);
    if (!outcome) return 0;
    return outcome.agents.reduce((sum, a) => {
      const u = this._computeAgentUtility(a);
      return sum + (u < threshold ? threshold - u : 0);
    }, 0);
  }

  public computeExpectedValue(action: string, scenarios: { probability: number; multiplier: number }[]): number {
    let ev = 0;
    for (const scenario of scenarios) {
      ev += scenario.probability * this.evaluateAction(action) * scenario.multiplier;
    }
    return ev;
  }

  public applyIntergenerationalDiscount(action: string, generations: number): number {
    const base = this.evaluateAction(action);
    let total = 0;
    for (let g = 0; g < generations; g++) {
      total += base / Math.pow(1 + this._discountRate, g);
    }
    return total;
  }

  public computeParfitRepugnance(action: string, addedPopulation: AgentUtility[]): number {
    const outcome = this._outcomes.get(action);
    if (!outcome) return 0;
    const newAgents = [...outcome.agents, ...addedPopulation];
    const newTotal = newAgents.reduce((sum, a) => sum + this._computeAgentUtility(a), 0);
    const newAvg = newTotal / newAgents.length;
    const oldAvg = outcome.averageUtility;
    return newAvg - oldAvg;
  }

  public compareActions(actionA: string, actionB: string): number {
    return this.evaluateAction(actionA) - this.evaluateAction(actionB);
  }

  public getOutcomes(): ActionOutcome[] {
    return Array.from(this._outcomes.values()).map(o => ({
      action: o.action,
      agents: o.agents.map(a => ({ ...a })),
      totalUtility: o.totalUtility,
      averageUtility: o.averageUtility
    }));
  }

  public reset(): void {
    this._outcomes.clear();
    this._history = [];
  }
}
