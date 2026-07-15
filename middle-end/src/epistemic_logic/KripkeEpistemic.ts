export interface KripkeEpistemicData {
  agents: number;
  worlds: number;
  relations: number;
  knowledgeBase: number;
  beliefs: number;
}

export class KripkeEpistemic {
  private _agents: number;
  private _worlds: number;
  private _relations: number[][][];
  private _knowledgeBase: number;
  private _beliefs: number;
  private _valuations: Map<string, boolean[]>;
  private _actualWorld: number;
  private _reflexive: boolean;
  private _transitive: boolean;

  constructor(agents: number = 2, worlds: number = 6) {
    this._agents = agents;
    this._worlds = worlds;
    this._knowledgeBase = 0;
    this._beliefs = 0;
    this._valuations = new Map();
    this._actualWorld = 0;
    this._reflexive = true;
    this._transitive = true;
    this._relations = [];
    for (let a = 0; a < agents; a++) {
      this._relations.push([]);
      for (let i = 0; i < worlds; i++) {
        this._relations[a].push([]);
        for (let j = 0; j < worlds; j++) {
          this._relations[a][i].push(1);
        }
      }
    }
  }

  get agents(): number {
    return this._agents;
  }

  get worlds(): number {
    return this._worlds;
  }

  get knowledgeBase(): number {
    return this._knowledgeBase;
  }

  get actualWorld(): number {
    return this._actualWorld;
  }

  public setActualWorld(world: number): void {
    if (world >= 0 && world < this._worlds) {
      this._actualWorld = world;
    }
  }

  public addRelation(agent: number, from: number, to: number): void {
    if (agent >= 0 && agent < this._agents) {
      if (from >= 0 && from < this._worlds && to >= 0 && to < this._worlds) {
        this._relations[agent][from][to] = 1;
      }
    }
  }

  public removeRelation(agent: number, from: number, to: number): void {
    if (agent >= 0 && agent < this._agents) {
      if (from >= 0 && from < this._worlds && to >= 0 && to < this._worlds) {
        this._relations[agent][from][to] = 0;
      }
    }
  }

  public hasRelation(agent: number, from: number, to: number): boolean {
    if (agent < 0 || agent >= this._agents) return false;
    if (from < 0 || from >= this._worlds) return false;
    if (to < 0 || to >= this._worlds) return false;
    return this._relations[agent][from][to] === 1;
  }

  public addValuation(prop: string, worlds: boolean[]): void {
    this._valuations.set(prop, [...worlds]);
  }

  public isTrue(world: number, prop: string): boolean {
    const vals = this._valuations.get(prop);
    if (!vals) return false;
    if (world < 0 || world >= this._worlds) return false;
    return vals[world];
  }

  public knows(agent: number, prop: string): boolean {
    const vals = this._valuations.get(prop);
    if (!vals) return false;
    for (let w = 0; w < this._worlds; w++) {
      if (this.hasRelation(agent, this._actualWorld, w) && !vals[w]) {
        return false;
      }
    }
    this._knowledgeBase++;
    return true;
  }

  public considersPossible(agent: number, prop: string): boolean {
    const vals = this._valuations.get(prop);
    if (!vals) return false;
    for (let w = 0; w < this._worlds; w++) {
      if (this.hasRelation(agent, this._actualWorld, w) && vals[w]) {
        return true;
      }
    }
    return false;
  }

  public commonKnowledge(prop: string): boolean {
    let frontier = new Set<number>([this._actualWorld]);
    const vals = this._valuations.get(prop);
    if (!vals) return false;
    const visited = new Set<number>();
    while (frontier.size > 0) {
      const nextFrontier = new Set<number>();
      for (const w of frontier) {
        if (visited.has(w)) continue;
        visited.add(w);
        if (!vals[w]) return false;
        for (let a = 0; a < this._agents; a++) {
          for (let v = 0; v < this._worlds; v++) {
            if (this.hasRelation(a, w, v) && !visited.has(v)) {
              nextFrontier.add(v);
            }
          }
        }
      }
      frontier = nextFrontier;
    }
    return true;
  }

  public isReflexive(): boolean {
    return this._reflexive;
  }

  public isTransitive(): boolean {
    return this._transitive;
  }

  public report(): KripkeEpistemicData {
    let relCount = 0;
    for (let a = 0; a < this._agents; a++) {
      for (let i = 0; i < this._worlds; i++) {
        for (let j = 0; j < this._worlds; j++) {
          relCount += this._relations[a][i][j];
        }
      }
    }
    return {
      agents: this._agents,
      worlds: this._worlds,
      relations: relCount,
      knowledgeBase: this._knowledgeBase,
      beliefs: this._beliefs,
    };
  }

  public getPropositions(): string[] {
    return [...this._valuations.keys()];
  }

  public addWorld(): number {
    this._worlds++;
    for (let a = 0; a < this._agents; a++) {
      const newRow: number[] = new Array(this._worlds).fill(0);
      this._relations[a].push(newRow);
      for (let i = 0; i < this._worlds - 1; i++) {
        this._relations[a][i].push(0);
      }
    }
    return this._worlds - 1;
  }

  public reset(): void {
    this._knowledgeBase = 0;
    this._beliefs = 0;
  }
}
