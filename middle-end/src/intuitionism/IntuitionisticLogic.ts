export interface IntuitionisticLogicData {
  propositions: number;
  proofs: number;
  excludedMiddle: boolean;
  doubleNegation: boolean;
  heytingAlgebra: boolean;
}

export class IntuitionisticLogic {
  private _propositions: number;
  private _proofs: number;
  private _excludedMiddle: boolean;
  private _doubleNegation: boolean;
  private _heytingAlgebra: boolean;
  private _formulas: string[];
  private _proofTree: string[];
  private _truthValues: number;

  constructor() {
    this._propositions = 0;
    this._proofs = 0;
    this._excludedMiddle = false;
    this._doubleNegation = false;
    this._heytingAlgebra = true;
    this._formulas = [];
    this._proofTree = [];
    this._truthValues = 3;
  }

  get propositions(): number {
    return this._propositions;
  }

  get proofs(): number {
    return this._proofs;
  }

  get excludedMiddle(): boolean {
    return this._excludedMiddle;
  }

  get heytingAlgebra(): boolean {
    return this._heytingAlgebra;
  }

  public addProposition(prop: string): number {
    this._propositions++;
    this._formulas.push(prop);
    return this._propositions - 1;
  }

  public and(a: boolean, b: boolean): boolean {
    return a && b;
  }

  public or(a: boolean, b: boolean): boolean {
    return a || b;
  }

  public implies(a: boolean, b: boolean): boolean {
    return !a || b;
  }

  public not(a: boolean): boolean {
    return !a;
  }

  public proveAnd(introA: number, introB: number): number {
    this._proofs++;
    this._proofTree.push(`∧I: ${introA}, ${introB}`);
    return this._proofs - 1;
  }

  public proveOrLeft(intro: number): number {
    this._proofs++;
    this._proofTree.push(`∨I_left: ${intro}`);
    return this._proofs - 1;
  }

  public proveOrRight(intro: number): number {
    this._proofs++;
    this._proofTree.push(`∨I_right: ${intro}`);
    return this._proofs - 1;
  }

  public proveImplication(discharge: number, conclusion: number): number {
    this._proofs++;
    this._proofTree.push(`→I: [${discharge}] → ${conclusion}`);
    return this._proofs - 1;
  }

  public proveNegation(discharge: number, falsum: number): number {
    this._proofs++;
    this._proofTree.push(`¬I: [${discharge}] → ⊥`);
    return this._proofs - 1;
  }

  public isExcludedMiddleValid(): boolean {
    return this._excludedMiddle;
  }

  public isDoubleNegationEliminationValid(): boolean {
    return this._doubleNegation;
  }

  public doubleNegationIntroduction(proof: number): number {
    this._proofs++;
    this._proofTree.push(`¬¬I: ${proof}`);
    return this._proofs - 1;
  }

  public isConstructive(): boolean {
    return !this._excludedMiddle && !this._doubleNegation;
  }

  public report(): IntuitionisticLogicData {
    return {
      propositions: this._propositions,
      proofs: this._proofs,
      excludedMiddle: this._excludedMiddle,
      doubleNegation: this._doubleNegation,
      heytingAlgebra: this._heytingAlgebra,
    };
  }

  public getProofTree(): string[] {
    return [...this._proofTree];
  }

  public brouwer(): string {
    return 'intuitionism';
  }

  public weakExcludedMiddle(): boolean {
    return false;
  }

  public setTruthValues(n: number): void {
    this._truthValues = n;
    this._heytingAlgebra = n >= 2;
  }

  public reset(): void {
    this._propositions = 0;
    this._proofs = 0;
    this._formulas = [];
    this._proofTree = [];
  }
}
