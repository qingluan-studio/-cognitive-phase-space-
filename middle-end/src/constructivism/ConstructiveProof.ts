export interface ConstructiveProofData {
  statements: number;
  proofs: number;
  assumptions: number;
  constructions: number;
  verified: boolean;
}

export class ConstructiveProof {
  private _statements: number;
  private _proofs: number;
  private _assumptions: number;
  private _constructions: number;
  private _verified: boolean;
  private _proofSteps: string[];
  private _witnesses: number[];
  private _excludedMiddle: boolean;

  constructor() {
    this._statements = 0;
    this._proofs = 0;
    this._assumptions = 0;
    this._constructions = 0;
    this._verified = false;
    this._proofSteps = [];
    this._witnesses = [];
    this._excludedMiddle = false;
  }

  get statements(): number {
    return this._statements;
  }

  get proofs(): number {
    return this._proofs;
  }

  get assumptions(): number {
    return this._assumptions;
  }

  get constructions(): number {
    return this._constructions;
  }

  public addStatement(statement: string): number {
    this._statements++;
    this._proofSteps.push(statement);
    return this._statements - 1;
  }

  public assume(assumption: string): number {
    this._assumptions++;
    this._proofSteps.push(`assume: ${assumption}`);
    return this._assumptions - 1;
  }

  public construct(witness: number): number {
    this._constructions++;
    this._witnesses.push(witness);
    this._proofSteps.push(`construct: ${witness}`);
    return this._constructions - 1;
  }

  public proveConjunction(a: number, b: number): number {
    this._proofs++;
    this._proofSteps.push(`∧intro: ${a}, ${b}`);
    return this._proofs - 1;
  }

  public proveDisjunctionLeft(a: number): number {
    this._proofs++;
    this._proofSteps.push(`∨intro_left: ${a}`);
    return this._proofs - 1;
  }

  public proveDisjunctionRight(b: number): number {
    this._proofs++;
    this._proofSteps.push(`∨intro_right: ${b}`);
    return this._proofs - 1;
  }

  public proveImplication(assumptionIndex: number, conclusionIndex: number): number {
    this._proofs++;
    this._proofSteps.push(`→intro: [${assumptionIndex}] → ${conclusionIndex}`);
    return this._proofs - 1;
  }

  public proveUniversal(construction: number): number {
    this._proofs++;
    this._proofSteps.push(`∀intro: ${construction}`);
    return this._proofs - 1;
  }

  public proveExistential(witnessIndex: number): number {
    this._proofs++;
    this._proofSteps.push(`∃intro: w=${witnessIndex}`);
    return this._proofs - 1;
  }

  public useExcludedMiddle(): boolean {
    this._excludedMiddle = true;
    return false;
  }

  public isConstructive(): boolean {
    return !this._excludedMiddle;
  }

  public verify(): boolean {
    this._verified = this._witnesses.length > 0 || this._assumptions > 0;
    return this._verified;
  }

  public report(): ConstructiveProofData {
    return {
      statements: this._statements,
      proofs: this._proofs,
      assumptions: this._assumptions,
      constructions: this._constructions,
      verified: this._verified,
    };
  }

  public getProofSteps(): string[] {
    return [...this._proofSteps];
  }

  public getWitnesses(): number[] {
    return [...this._witnesses];
  }

  public curryHoward(isomorphism: number): number {
    return isomorphism;
  }

  public reset(): void {
    this._statements = 0;
    this._proofs = 0;
    this._assumptions = 0;
    this._constructions = 0;
    this._verified = false;
    this._proofSteps = [];
    this._witnesses = [];
    this._excludedMiddle = false;
  }
}
