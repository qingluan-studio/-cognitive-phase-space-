export interface EpistemicLogicData {
  agents: number;
  knowledge: number;
  belief: number;
  possibleWorlds: number;
  accessibility: number;
}

export class EpistemicLogic {
  private _agents: number;
  private _knowledge: number;
  private _belief: number;
  private _possibleWorlds: number;
  private _accessibility: number[][][];
  private _propositions: Map<string, boolean[]>;
  private _commonKnowledge: number;
  private _distributedKnowledge: number;

  constructor(agents: number = 3, worlds: number = 4) {
    this._agents = agents;
    this._knowledge = 0;
    this._belief = 0;
    this._possibleWorlds = worlds;
    this._commonKnowledge = 0;
    this._distributedKnowledge = 0;
    this._propositions = new Map();
    this._accessibility = [];
    for (let a = 0; a < agents; a++) {
      this._accessibility.push([]);
      for (let i = 0; i < worlds; i++) {
        this._accessibility[a].push([]);
        for (let j = 0; j < worlds; j++) {
          this._accessibility[a][i].push(1);
        }
      }
    }
  }

  get agents(): number {
    return this._agents;
  }

  get knowledge(): number {
    return this._knowledge;
  }

  get belief(): number {
    return this._belief;
  }

  get possibleWorlds(): number {
    return this._possibleWorlds;
  }

  public addAccessibility(agent: number, from: number, to: number): void {
    if (agent >= 0 && agent < this._agents) {
      if (from >= 0 && from < this._possibleWorlds && to >= 0 && to < this._possibleWorlds) {
        this._accessibility[agent][from][to] = 1;
      }
    }
  }

  public isAccessible(agent: number, from: number, to: number): boolean {
    if (agent < 0 || agent >= this._agents) return false;
    if (from < 0 || from >= this._possibleWorlds) return false;
    if (to < 0 || to >= this._possibleWorlds) return false;
    return this._accessibility[agent][from][to] === 1;
  }

  public addProposition(name: string, truthValues: boolean[]): void {
    this._propositions.set(name, [...truthValues]);
  }

  public isTrueAt(world: number, proposition: string): boolean {
    const values = this._propositions.get(proposition);
    if (!values) return false;
    if (world < 0 || world >= this._possibleWorlds) return false;
    return values[world];
  }

  public knows(agent: number, world: number, proposition: string): boolean {
    const values = this._propositions.get(proposition);
    if (!values) return false;
    for (let w = 0; w < this._possibleWorlds; w++) {
      if (this.isAccessible(agent, world, w) && !values[w]) {
        return false;
      }
    }
    this._knowledge++;
    return true;
  }

  public believes(agent: number, world: number, proposition: string): boolean {
    const values = this._propositions.get(proposition);
    if (!values) return false;
    let count = 0;
    let trueCount = 0;
    for (let w = 0; w < this._possibleWorlds; w++) {
      if (this.isAccessible(agent, world, w)) {
        count++;
        if (values[w]) trueCount++;
      }
    }
    if (count === 0) return false;
    this._belief++;
    return trueCount / count > 0.5;
  }

  public commonKnowledge(world: number, proposition: string): boolean {
    let currentWorlds = new Set<number>([world]);
    const values = this._propositions.get(proposition);
    if (!values) return false;
    for (let depth = 0; depth < this._agents * 2; depth++) {
      const nextWorlds = new Set<number>();
      for (const w of currentWorlds) {
        if (!values[w]) return false;
        for (let a = 0; a < this._agents; a++) {
          for (let v = 0; v < this._possibleWorlds; v++) {
            if (this.isAccessible(a, w, v)) {
              nextWorlds.add(v);
            }
          }
        }
      }
      currentWorlds = nextWorlds;
    }
    this._commonKnowledge++;
    return true;
  }

  public distributedKnowledge(world: number, proposition: string): boolean {
    const values = this._propositions.get(proposition);
    if (!values) return false;
    for (let w = 0; w < this._possibleWorlds; w++) {
      let allAgentsConsider = true;
      for (let a = 0; a < this._agents; a++) {
        if (!this.isAccessible(a, world, w)) {
          allAgentsConsider = false;
          break;
        }
      }
      if (allAgentsConsider && !values[w]) {
        return false;
      }
    }
    this._distributedKnowledge++;
    return true;
  }

  public isS5(): boolean {
    return true;
  }

  public isKD45(): boolean {
    return false;
  }

  public report(): EpistemicLogicData {
    let accessCount = 0;
    for (let a = 0; a < this._agents; a++) {
      for (let i = 0; i < this._possibleWorlds; i++) {
        for (let j = 0; j < this._possibleWorlds; j++) {
          accessCount += this._accessibility[a][i][j];
        }
      }
    }
    return {
      agents: this._agents,
      knowledge: this._knowledge,
      belief: this._belief,
      possibleWorlds: this._possibleWorlds,
      accessibility: accessCount,
    };
  }

  public getCommonKnowledgeCount(): number {
    return this._commonKnowledge;
  }

  public getDistributedKnowledgeCount(): number {
    return this._distributedKnowledge;
  }

  public getPropositions(): string[] {
    return [...this._propositions.keys()];
  }

  public reset(): void {
    this._knowledge = 0;
    this._belief = 0;
    this._commonKnowledge = 0;
    this._distributedKnowledge = 0;
  }
}
