export interface Stakeholder {
  id: string;
  rights: string[];
  interests: number[];
  vulnerability: number;
}

export interface DilemmaOption {
  description: string;
  consequences: Map<string, number>;
  violatedRights: string[];
}

export class MoralDilemma {
  private _stakeholders: Map<string, Stakeholder>;
  private _options: DilemmaOption[];
  private _history: { optionIndex: number; resolution: string; justification: string }[];
  private _principles: string[];

  constructor() {
    this._stakeholders = new Map();
    this._options = [];
    this._history = [];
    this._principles = [];
  }

  get stakeholderCount(): number { return this._stakeholders.size; }
  get optionCount(): number { return this._options.length; }

  public addStakeholder(id: string, rights: string[], interests: number[], vulnerability: number = 0.5): void {
    this._stakeholders.set(id, { id, rights: [...rights], interests: [...interests], vulnerability });
  }

  public addOption(description: string, consequences: Map<string, number>, violatedRights: string[] = []): void {
    this._options.push({ description, consequences: new Map(consequences), violatedRights: [...violatedRights] });
  }

  public addPrinciple(principle: string): void {
    this._principles.push(principle);
  }

  public computeHarm(optionIndex: number): number {
    const option = this._options[optionIndex];
    if (!option) return 0;
    let totalHarm = 0;
    for (const [stakeholderId, impact] of option.consequences) {
      const stakeholder = this._stakeholders.get(stakeholderId);
      if (stakeholder) {
        totalHarm += Math.abs(Math.min(0, impact)) * (1 + stakeholder.vulnerability);
      }
    }
    return totalHarm;
  }

  public computeRightsViolation(optionIndex: number): number {
    const option = this._options[optionIndex];
    if (!option) return 0;
    return option.violatedRights.length;
  }

  public computeDistributiveJustice(optionIndex: number): number {
    const option = this._options[optionIndex];
    if (!option) return 0;
    const impacts = Array.from(option.consequences.values());
    if (impacts.length === 0) return 0;
    const mean = impacts.reduce((a, b) => a + b, 0) / impacts.length;
    const variance = impacts.reduce((sum, v) => sum + (v - mean) ** 2, 0) / impacts.length;
    return 1 / (1 + variance);
  }

  public computeCareEthicsScore(optionIndex: number): number {
    const option = this._options[optionIndex];
    if (!option) return 0;
    let score = 0;
    for (const [stakeholderId, impact] of option.consequences) {
      const stakeholder = this._stakeholders.get(stakeholderId);
      if (stakeholder) {
        score += impact * stakeholder.vulnerability;
      }
    }
    return score;
  }

  public resolveByUtilitarianism(): number {
    let bestIndex = -1;
    let maxUtility = -Infinity;
    for (let i = 0; i < this._options.length; i++) {
      const utility = Array.from(this._options[i].consequences.values()).reduce((a, b) => a + b, 0);
      if (utility > maxUtility) {
        maxUtility = utility;
        bestIndex = i;
      }
    }
    return bestIndex;
  }

  public resolveByMinimax(): number {
    let bestIndex = -1;
    let maxMin = -Infinity;
    for (let i = 0; i < this._options.length; i++) {
      const min = Math.min(...Array.from(this._options[i].consequences.values()));
      if (min > maxMin) {
        maxMin = min;
        bestIndex = i;
      }
    }
    return bestIndex;
  }

  public resolveByRightsBased(): number {
    let bestIndex = -1;
    let minViolations = Infinity;
    for (let i = 0; i < this._options.length; i++) {
      const violations = this.computeRightsViolation(i);
      if (violations < minViolations) {
        minViolations = violations;
        bestIndex = i;
      }
    }
    return bestIndex;
  }

  public resolveByCareEthics(): number {
    let bestIndex = -1;
    let maxCare = -Infinity;
    for (let i = 0; i < this._options.length; i++) {
      const care = this.computeCareEthicsScore(i);
      if (care > maxCare) {
        maxCare = care;
        bestIndex = i;
      }
    }
    return bestIndex;
  }

  public getConflictMatrix(): number[][] {
    const matrix: number[][] = [];
    for (let i = 0; i < this._options.length; i++) {
      matrix[i] = [];
      for (let j = 0; j < this._options.length; j++) {
        if (i === j) {
          matrix[i][j] = 0;
        } else {
          const overlap = this._options[i].violatedRights.filter(r => this._options[j].violatedRights.includes(r)).length;
          matrix[i][j] = overlap;
        }
      }
    }
    return matrix;
  }

  public recordResolution(optionIndex: number, resolution: string, justification: string): void {
    this._history.push({ optionIndex, resolution, justification });
  }

  public reset(): void {
    this._stakeholders.clear();
    this._options = [];
    this._history = [];
    this._principles = [];
  }

  public exportOptions(): DilemmaOption[] {
    return this._options.map(o => ({
      description: o.description,
      consequences: new Map(o.consequences),
      violatedRights: [...o.violatedRights]
    }));
  }
}
