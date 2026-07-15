export interface TypeTheoryData {
  types: number;
  terms: number;
  judgments: number;
  inferenceRules: number;
  dependent: boolean;
}

export class TypeTheory {
  private _types: number;
  private _terms: number;
  private _judgments: number;
  private _inferenceRules: number;
  private _dependent: boolean;
  private _typeList: string[];
  private _termList: { term: string; type: string }[];
  private _judgmentList: string[];

  constructor(dependent: boolean = true) {
    this._types = 0;
    this._terms = 0;
    this._judgments = 0;
    this._inferenceRules = 8;
    this._dependent = dependent;
    this._typeList = [];
    this._termList = [];
    this._judgmentList = [];
  }

  get types(): number {
    return this._types;
  }

  get terms(): number {
    return this._terms;
  }

  get judgments(): number {
    return this._judgments;
  }

  get dependent(): boolean {
    return this._dependent;
  }

  public addType(typeName: string): number {
    this._types++;
    this._typeList.push(typeName);
    return this._types - 1;
  }

  public addTerm(term: string, type: string): number {
    this._terms++;
    this._termList.push({ term, type });
    return this._terms - 1;
  }

  public addJudgment(judgment: string): number {
    this._judgments++;
    this._judgmentList.push(judgment);
    return this._judgments - 1;
  }

  public typeCheck(termIndex: number, typeIndex: number): boolean {
    if (termIndex < 0 || termIndex >= this._terms) return false;
    if (typeIndex < 0 || typeIndex >= this._types) return false;
    const term = this._termList[termIndex];
    return term.type === this._typeList[typeIndex];
  }

  public piType(domain: string, codomain: (x: string) => string): string {
    return `Π(${domain}). ${codomain(domain)}`;
  }

  public sigmaType(domain: string, codomain: (x: string) => string): string {
    return `Σ(${domain}). ${codomain(domain)}`;
  }

  public lambdaAbstraction(varName: string, body: string): string {
    return `λ${varName}. ${body}`;
  }

  public application(func: string, arg: string): string {
    return `${func}(${arg})`;
  }

  public pair(first: string, second: string): string {
    return `(${first}, ${second})`;
  }

  public firstProjection(pair: string): string {
    return `π₁(${pair})`;
  }

  public secondProjection(pair: string): string {
    return `π₂(${pair})`;
  }

  public idType(a: string, b: string): string {
    return `Id(${a}, ${b})`;
  }

  public reflexivity(term: string): string {
    return `refl(${term})`;
  }

  public isDependent(): boolean {
    return this._dependent;
  }

  public report(): TypeTheoryData {
    return {
      types: this._types,
      terms: this._terms,
      judgments: this._judgments,
      inferenceRules: this._inferenceRules,
      dependent: this._dependent,
    };
  }

  public getTypes(): string[] {
    return [...this._typeList];
  }

  public getJudgments(): string[] {
    return [...this._judgmentList];
  }

  public curryHoward(proof: string): string {
    return proof;
  }

  public setDependent(value: boolean): void {
    this._dependent = value;
  }

  public reset(): void {
    this._types = 0;
    this._terms = 0;
    this._judgments = 0;
    this._typeList = [];
    this._termList = [];
    this._judgmentList = [];
  }
}
