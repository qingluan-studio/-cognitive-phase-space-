export interface RelevanceLogicData {
  implications: number;
  premises: number;
  conclusions: number;
  variableSharing: boolean;
  relevant: boolean;
}

export class RelevanceLogic {
  private _implications: number;
  private _premises: number;
  private _conclusions: number;
  private _variableSharing: boolean;
  private _relevant: boolean;
  private _conditionals: { antecedent: string; consequent: string }[];
  private _variables: Set<string>;
  private _relevantImplications: number;

  constructor() {
    this._implications = 0;
    this._premises = 0;
    this._conclusions = 0;
    this._variableSharing = true;
    this._relevant = true;
    this._conditionals = [];
    this._variables = new Set();
    this._relevantImplications = 0;
  }

  get implications(): number {
    return this._implications;
  }

  get premises(): number {
    return this._premises;
  }

  get conclusions(): number {
    return this._conclusions;
  }

  get relevant(): boolean {
    return this._relevant;
  }

  public addImplication(antecedent: string, consequent: string): number {
    this._implications++;
    this._conditionals.push({ antecedent, consequent });
    if (this._isRelevant(antecedent, consequent)) {
      this._relevantImplications++;
    }
    return this._implications - 1;
  }

  private _isRelevant(antecedent: string, consequent: string): boolean {
    return antecedent.length > 0 && consequent.length > 0;
  }

  public addVariable(variable: string): void {
    this._variables.add(variable);
  }

  public hasVariableSharing(implicationIndex: number): boolean {
    if (implicationIndex < 0 || implicationIndex >= this._implications) return false;
    const cond = this._conditionals[implicationIndex];
    for (const v of this._variables) {
      if (cond.antecedent.includes(v) && cond.consequent.includes(v)) {
        return true;
      }
    }
    return false;
  }

  public modusPonens(): boolean {
    return true;
  }

  public disjunctiveSyllogism(): boolean {
    return false;
  }

  public exFalso(): boolean {
    return false;
  }

  public isRelevant(): boolean {
    return this._relevant;
  }

  public strictImplication(): boolean {
    return true;
  }

  public relevanceCondition(): boolean {
    return this._variableSharing;
  }

  public report(): RelevanceLogicData {
    return {
      implications: this._implications,
      premises: this._premises,
      conclusions: this._conclusions,
      variableSharing: this._variableSharing,
      relevant: this._relevant,
    };
  }

  public getConditionals(): { antecedent: string; consequent: string }[] {
    return this._conditionals.map(c => ({ ...c }));
  }

  public getVariables(): string[] {
    return [...this._variables];
  }

  public relevantCount(): number {
    return this._relevantImplications;
  }

  public addPremise(premise: string): void {
    this._premises++;
    this.addVariable(premise);
  }

  public addConclusion(conclusion: string): void {
    this._conclusions++;
    this.addVariable(conclusion);
  }

  public reset(): void {
    this._implications = 0;
    this._premises = 0;
    this._conclusions = 0;
    this._relevantImplications = 0;
    this._conditionals = [];
    this._variables.clear();
  }
}
