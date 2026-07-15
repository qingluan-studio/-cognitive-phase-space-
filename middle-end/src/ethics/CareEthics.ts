export interface CareRelation {
  caregiver: string;
  receiver: string;
  dependency: number;
  response: number;
  attentiveness: number;
}

export interface CareNetwork {
  relations: CareRelation[];
  density: number;
  cohesion: number;
}

export class CareEthics {
  private _relations: CareRelation[];
  private _agents: Set<string>;
  private _history: CareNetwork[];

  constructor() {
    this._relations = [];
    this._agents = new Set();
    this._history = [];
  }

  get relationCount(): number { return this._relations.length; }
  get agentCount(): number { return this._agents.size; }

  public addRelation(caregiver: string, receiver: string, dependency: number): void {
    this._relations.push({ caregiver, receiver, dependency, response: 0, attentiveness: 0.5 });
    this._agents.add(caregiver);
    this._agents.add(receiver);
  }

  public respondToNeed(caregiver: string, receiver: string, responseLevel: number): void {
    const relation = this._relations.find(r => r.caregiver === caregiver && r.receiver === receiver);
    if (relation) {
      relation.response = Math.min(1, relation.response + responseLevel);
    }
  }

  public adjustAttentiveness(caregiver: string, receiver: string, level: number): void {
    const relation = this._relations.find(r => r.caregiver === caregiver && r.receiver === receiver);
    if (relation) {
      relation.attentiveness = Math.max(0, Math.min(1, level));
    }
  }

  public computeCareBurden(agentId: string): number {
    return this._relations
      .filter(r => r.caregiver === agentId)
      .reduce((sum, r) => sum + r.dependency * (1 - r.response), 0);
  }

  public computeReceivedCare(agentId: string): number {
    return this._relations
      .filter(r => r.receiver === agentId)
      .reduce((sum, r) => sum + r.response * r.attentiveness, 0);
  }

  public computeNetworkDensity(): number {
    const n = this._agents.size;
    if (n < 2) return 0;
    const possible = n * (n - 1);
    return this._relations.length / possible;
  }

  public computeCohesion(): number {
    if (this._relations.length === 0) return 0;
    const totalResponse = this._relations.reduce((sum, r) => sum + r.response, 0);
    const totalDependency = this._relations.reduce((sum, r) => sum + r.dependency, 0);
    return totalDependency > 0 ? totalResponse / totalDependency : 0;
  }

  public findVulnerableAgents(threshold: number = 0.3): string[] {
    const vulnerable: string[] = [];
    for (const agent of this._agents) {
      const received = this.computeReceivedCare(agent);
      const needed = this._relations
        .filter(r => r.receiver === agent)
        .reduce((sum, r) => sum + r.dependency, 0);
      if (needed > 0 && received / needed < threshold) {
        vulnerable.push(agent);
      }
    }
    return vulnerable;
  }

  public computeTrust(agentA: string, agentB: string): number {
    const relations = this._relations.filter(r =>
      (r.caregiver === agentA && r.receiver === agentB) ||
      (r.caregiver === agentB && r.receiver === agentA)
    );
    if (relations.length === 0) return 0;
    return relations.reduce((sum, r) => sum + r.response * r.attentiveness, 0) / relations.length;
  }

  public propagateCare(source: string, steps: number = 2, decay: number = 0.5): Map<string, number> {
    const careMap = new Map<string, number>();
    const queue: { agent: string; level: number; depth: number }[] = [{ agent: source, level: 1, depth: 0 }];
    const visited = new Set<string>();
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current.agent)) continue;
      visited.add(current.agent);
      careMap.set(current.agent, (careMap.get(current.agent) || 0) + current.level);
      if (current.depth < steps) {
        for (const relation of this._relations) {
          if (relation.caregiver === current.agent && !visited.has(relation.receiver)) {
            queue.push({ agent: relation.receiver, level: current.level * decay * relation.response, depth: current.depth + 1 });
          }
        }
      }
    }
    return careMap;
  }

  public evaluatePartiality(agentId: string): number {
    const given = this._relations.filter(r => r.caregiver === agentId);
    if (given.length === 0) return 0;
    const responses = given.map(r => r.response);
    const mean = responses.reduce((a, b) => a + b, 0) / responses.length;
    const variance = responses.reduce((sum, v) => sum + (v - mean) ** 2, 0) / responses.length;
    return variance;
  }

  public recordNetwork(): void {
    this._history.push({
      relations: this._relations.map(r => ({ ...r })),
      density: this.computeNetworkDensity(),
      cohesion: this.computeCohesion()
    });
  }

  public reset(): void {
    this._relations = [];
    this._agents.clear();
    this._history = [];
  }

  public exportRelations(): CareRelation[] {
    return this._relations.map(r => ({ ...r }));
  }
}
