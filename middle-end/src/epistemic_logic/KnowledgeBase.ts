export interface KnowledgeBaseData {
  facts: number;
  queries: number;
  agents: number;
  beliefRevision: number;
  consistency: number;
}

export class KnowledgeBase {
  private _facts: number;
  private _queries: number;
  private _agents: number;
  private _beliefRevision: number;
  private _consistency: number;
  private _knowledge: Map<string, string>;
  private _beliefs: Map<string, number>;
  private _agentKnowledge: Map<number, Set<string>>;
  private _revisionHistory: string[];

  constructor(agents: number = 3) {
    this._facts = 0;
    this._queries = 0;
    this._agents = agents;
    this._beliefRevision = 0;
    this._consistency = 1.0;
    this._knowledge = new Map();
    this._beliefs = new Map();
    this._agentKnowledge = new Map();
    this._revisionHistory = [];
    for (let i = 0; i < agents; i++) {
      this._agentKnowledge.set(i, new Set());
    }
  }

  get facts(): number {
    return this._facts;
  }

  get queries(): number {
    return this._queries;
  }

  get agents(): number {
    return this._agents;
  }

  get consistency(): number {
    return this._consistency;
  }

  public addFact(agent: number, fact: string, value: string): void {
    this._facts++;
    this._knowledge.set(fact, value);
    if (agent >= 0 && agent < this._agents) {
      this._agentKnowledge.get(agent)?.add(fact);
    }
  }

  public getFact(fact: string): string | undefined {
    this._queries++;
    return this._knowledge.get(fact);
  }

  public hasFact(agent: number, fact: string): boolean {
    this._queries++;
    if (agent < 0 || agent >= this._agents) return false;
    return this._agentKnowledge.get(agent)?.has(fact) || false;
  }

  public addBelief(fact: string, degree: number): void {
    this._beliefs.set(fact, degree);
  }

  public getBelief(fact: string): number {
    return this._beliefs.get(fact) || 0;
  }

  public revise(fact: string, newValue: string): void {
    this._beliefRevision++;
    const oldValue = this._knowledge.get(fact);
    if (oldValue !== undefined) {
      this._revisionHistory.push(`REVISED: ${fact}: ${oldValue} -> ${newValue}`);
    } else {
      this._revisionHistory.push(`ADDED: ${fact} = ${newValue}`);
    }
    this._knowledge.set(fact, newValue);
    this._consistency = Math.max(0, this._consistency - 0.05);
  }

  public expand(fact: string, value: string): void {
    if (!this._knowledge.has(fact)) {
      this._facts++;
      this._knowledge.set(fact, value);
    }
  }

  public contract(fact: string): void {
    if (this._knowledge.has(fact)) {
      this._beliefRevision++;
      this._knowledge.delete(fact);
      this._facts--;
      this._revisionHistory.push(`REMOVED: ${fact}`);
    }
  }

  public isConsistent(): boolean {
    return this._consistency > 0.5;
  }

  public query(question: string): boolean {
    this._queries++;
    return this._knowledge.has(question);
  }

  public entailment(fact: string): boolean {
    return this._knowledge.has(fact);
  }

  public report(): KnowledgeBaseData {
    return {
      facts: this._facts,
      queries: this._queries,
      agents: this._agents,
      beliefRevision: this._beliefRevision,
      consistency: this._consistency,
    };
  }

  public getRevisionHistory(): string[] {
    return [...this._revisionHistory];
  }

  public agentFacts(agent: number): string[] {
    if (agent < 0 || agent >= this._agents) return [];
    return [...(this._agentKnowledge.get(agent) || [])];
  }

  public getAllFacts(): string[] {
    return [...this._knowledge.keys()];
  }

  public reset(): void {
    this._facts = 0;
    this._queries = 0;
    this._beliefRevision = 0;
    this._consistency = 1.0;
    this._knowledge.clear();
    this._beliefs.clear();
    this._revisionHistory = [];
    for (let i = 0; i < this._agents; i++) {
      this._agentKnowledge.get(i)?.clear();
    }
  }
}
