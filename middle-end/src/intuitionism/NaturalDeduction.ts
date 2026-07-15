export interface NaturalDeductionData {
  rules: number;
  proofs: number;
  assumptions: number;
  discharges: number;
  intuitionistic: boolean;
}

export class NaturalDeduction {
  private _rules: number;
  private _proofs: number;
  private _assumptions: number;
  private _discharges: number;
  private _intuitionistic: boolean;
  private _proofLines: string[];
  private _assumptionStack: number[];
  private _lineNumber: number;

  constructor() {
    this._rules = 12;
    this._proofs = 0;
    this._assumptions = 0;
    this._discharges = 0;
    this._intuitionistic = true;
    this._proofLines = [];
    this._assumptionStack = [];
    this._lineNumber = 0;
  }

  get rules(): number {
    return this._rules;
  }

  get proofs(): number {
    return this._proofs;
  }

  get assumptions(): number {
    return this._assumptions;
  }

  get discharges(): number {
    return this._discharges;
  }

  public assume(formula: string): number {
    this._assumptions++;
    this._assumptionStack.push(this._lineNumber);
    this._proofLines.push(`${this._lineNumber}: ${formula} (assumption)`);
    this._lineNumber++;
    return this._lineNumber - 1;
  }

  public andIntro(lineA: number, lineB: number): number {
    this._proofLines.push(`${this._lineNumber}: ∧I(${lineA}, ${lineB})`);
    this._lineNumber++;
    this._proofs++;
    return this._lineNumber - 1;
  }

  public andElimLeft(line: number): number {
    this._proofLines.push(`${this._lineNumber}: ∧E_left(${line})`);
    this._lineNumber++;
    return this._lineNumber - 1;
  }

  public andElimRight(line: number): number {
    this._proofLines.push(`${this._lineNumber}: ∧E_right(${line})`);
    this._lineNumber++;
    return this._lineNumber - 1;
  }

  public orIntroLeft(line: number): number {
    this._proofLines.push(`${this._lineNumber}: ∨I_left(${line})`);
    this._lineNumber++;
    return this._lineNumber - 1;
  }

  public orIntroRight(line: number): number {
    this._proofLines.push(`${this._lineNumber}: ∨I_right(${line})`);
    this._lineNumber++;
    return this._lineNumber - 1;
  }

  public orElim(lineOr: number, lineCase1: number, lineCase2: number): number {
    this._proofLines.push(`${this._lineNumber}: ∨E(${lineOr}, ${lineCase1}, ${lineCase2})`);
    this._lineNumber++;
    return this._lineNumber - 1;
  }

  public impliesIntro(assumptionLine: number, conclusionLine: number): number {
    this._discharges++;
    this._assumptionStack.pop();
    this._proofLines.push(`${this._lineNumber}: →I([${assumptionLine}], ${conclusionLine})`);
    this._lineNumber++;
    this._proofs++;
    return this._lineNumber - 1;
  }

  public impliesElim(lineImplies: number, lineAntecedent: number): number {
    this._proofLines.push(`${this._lineNumber}: →E(${lineImplies}, ${lineAntecedent})`);
    this._lineNumber++;
    return this._lineNumber - 1;
  }

  public notIntro(assumptionLine: number, falsumLine: number): number {
    this._discharges++;
    this._assumptionStack.pop();
    this._proofLines.push(`${this._lineNumber}: ¬I([${assumptionLine}], ${falsumLine})`);
    this._lineNumber++;
    this._proofs++;
    return this._lineNumber - 1;
  }

  public notElim(lineNot: number, lineA: number): number {
    this._proofLines.push(`${this._lineNumber}: ¬E(${lineNot}, ${lineA})`);
    this._lineNumber++;
    return this._lineNumber - 1;
  }

  public falsumElim(falsumLine: number): number {
    this._proofLines.push(`${this._lineNumber}: ⊥E(${falsumLine})`);
    this._lineNumber++;
    return this._lineNumber - 1;
  }

  public excludedMiddle(): number {
    this._intuitionistic = false;
    this._proofLines.push(`${this._lineNumber}: LEM`);
    this._lineNumber++;
    return this._lineNumber - 1;
  }

  public isIntuitionistic(): boolean {
    return this._intuitionistic;
  }

  public report(): NaturalDeductionData {
    return {
      rules: this._rules,
      proofs: this._proofs,
      assumptions: this._assumptions,
      discharges: this._discharges,
      intuitionistic: this._intuitionistic,
    };
  }

  public getProof(): string[] {
    return [...this._proofLines];
  }

  public getOpenAssumptions(): number {
    return this._assumptionStack.length;
  }

  public reset(): void {
    this._proofs = 0;
    this._assumptions = 0;
    this._discharges = 0;
    this._proofLines = [];
    this._assumptionStack = [];
    this._lineNumber = 0;
    this._intuitionistic = true;
  }
}
