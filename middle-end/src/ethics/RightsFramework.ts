export interface Right {
  holder: string;
  content: string;
  weight: number;
  correlative: string;
  enforceable: boolean;
}

export interface RightsViolation {
  right: Right;
  violator: string;
  severity: number;
  remedy: string;
}

export class RightsFramework {
  private _rights: Right[];
  private _violations: RightsViolation[];
  private _history: { action: string; affectedRights: number }[];

  constructor() {
    this._rights = [];
    this._violations = [];
    this._history = [];
  }

  get rightCount(): number { return this._rights.length; }
  get violationCount(): number { return this._violations.length; }

  public addRight(holder: string, content: string, weight: number = 1, correlative: string = '', enforceable: boolean = true): void {
    this._rights.push({ holder, content, weight, correlative, enforceable });
  }

  public addViolation(right: Right, violator: string, severity: number, remedy: string): void {
    this._violations.push({ right: { ...right }, violator, severity, remedy });
  }

  public checkCompatibility(rightA: Right, rightB: Right): boolean {
    return rightA.holder !== rightB.holder || rightA.content !== rightB.content;
  }

  public findConflicts(): { rightA: Right; rightB: Right }[] {
    const conflicts: { rightA: Right; rightB: Right }[] = [];
    for (let i = 0; i < this._rights.length; i++) {
      for (let j = i + 1; j < this._rights.length; j++) {
        if (!this.checkCompatibility(this._rights[i], this._rights[j])) {
          conflicts.push({ rightA: this._rights[i], rightB: this._rights[j] });
        }
      }
    }
    return conflicts;
  }

  public computeRightsDensity(agentId: string): number {
    return this._rights.filter(r => r.holder === agentId).reduce((sum, r) => sum + r.weight, 0);
  }

  public computeProtectionLevel(agentId: string): number {
    const agentRights = this._rights.filter(r => r.holder === agentId);
    if (agentRights.length === 0) return 0;
    const enforceable = agentRights.filter(r => r.enforceable).length;
    return enforceable / agentRights.length;
  }

  public computeViolationSeverity(agentId: string): number {
    return this._violations
      .filter(v => v.right.holder === agentId)
      .reduce((sum, v) => sum + v.severity, 0);
  }

  public findRemedies(agentId: string): string[] {
    return this._violations
      .filter(v => v.right.holder === agentId)
      .map(v => v.remedy);
  }

  public prioritizeRights(): Right[] {
    return [...this._rights].sort((a, b) => b.weight - a.weight);
  }

  public aggregateRights(): Map<string, number> {
    const aggregate = new Map<string, number>();
    for (const right of this._rights) {
      aggregate.set(right.content, (aggregate.get(right.content) || 0) + right.weight);
    }
    return aggregate;
  }

  public evaluateAction(action: string, affectedHolders: string[]): number {
    let affected = 0;
    for (const holder of affectedHolders) {
      affected += this._rights.filter(r => r.holder === holder).length;
    }
    this._history.push({ action, affectedRights: affected });
    return affected;
  }

  public generateClaim(agentId: string, content: string): Right | null {
    const existing = this._rights.find(r => r.holder === agentId && r.content === content);
    if (existing) return null;
    const right: Right = { holder: agentId, content, weight: 1, correlative: '', enforceable: false };
    this._rights.push(right);
    return right;
  }

  public computeRightsEntropy(): number {
    const holders = new Map<string, number>();
    for (const right of this._rights) {
      holders.set(right.holder, (holders.get(right.holder) || 0) + 1);
    }
    const total = this._rights.length;
    let entropy = 0;
    for (const count of holders.values()) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  public reset(): void {
    this._rights = [];
    this._violations = [];
    this._history = [];
  }

  public exportRights(): Right[] {
    return this._rights.map(r => ({ ...r }));
  }
}
