export interface BHKInterpretationData {
  proofs: number;
  implications: number;
  constructions: number;
  witnesses: number;
  intuitionistic: boolean;
}

export class BHKInterpretation {
  private _proofs: number;
  private _implications: number;
  private _constructions: number;
  private _witnesses: number;
  private _intuitionistic: boolean;
  private _proofObjects: { type: string; content: number }[];
  private _implicationProofs: ((x: number) => number)[];
  private _conjunctionProofs: [number, number][];

  constructor() {
    this._proofs = 0;
    this._implications = 0;
    this._constructions = 0;
    this._witnesses = 0;
    this._intuitionistic = true;
    this._proofObjects = [];
    this._implicationProofs = [];
    this._conjunctionProofs = [];
  }

  get proofs(): number {
    return this._proofs;
  }

  get implications(): number {
    return this._implications;
  }

  get constructions(): number {
    return this._constructions;
  }

  get witnesses(): number {
    return this._witnesses;
  }

  public proveConjunction(proofA: number, proofB: number): [number, number] {
    this._proofs++;
    this._constructions++;
    const pair: [number, number] = [proofA, proofB];
    this._conjunctionProofs.push(pair);
    this._proofObjects.push({ type: 'conjunction', content: proofA * proofB });
    return pair;
  }

  public proveDisjunctionLeft(proof: number): number {
    this._proofs++;
    this._proofObjects.push({ type: 'disjunction_left', content: proof });
    return proof;
  }

  public proveDisjunctionRight(proof: number): number {
    this._proofs++;
    this._proofObjects.push({ type: 'disjunction_right', content: proof });
    return proof;
  }

  public proveImplication(f: (x: number) => number): (x: number) => number {
    this._implications++;
    this._constructions++;
    this._implicationProofs.push(f);
    this._proofObjects.push({ type: 'implication', content: this._implications });
    return f;
  }

  public proveUniversal(construction: (x: number) => number): (x: number) => number {
    this._proofs++;
    this._constructions++;
    this._proofObjects.push({ type: 'universal', content: this._constructions });
    return construction;
  }

  public proveExistential(witness: number, proof: number): number {
    this._witnesses++;
    this._proofs++;
    this._proofObjects.push({ type: 'existential', content: witness });
    return witness;
  }

  public applyImplication(implication: (x: number) => number, proof: number): number {
    return implication(proof);
  }

  public firstProjection(pair: [number, number]): number {
    return pair[0];
  }

  public secondProjection(pair: [number, number]): number {
    return pair[1];
  }

  public disjunctionElimination(
    proofOr: number,
    proofAtoC: (x: number) => number,
    proofBtoC: (x: number) => number
  ): number {
    if (proofOr > 0) {
      return proofAtoC(proofOr);
    }
    return proofBtoC(proofOr);
  }

  public falsumElimination(falsum: number): number {
    return 0;
  }

  public isIntuitionistic(): boolean {
    return this._intuitionistic;
  }

  public report(): BHKInterpretationData {
    return {
      proofs: this._proofs,
      implications: this._implications,
      constructions: this._constructions,
      witnesses: this._witnesses,
      intuitionistic: this._intuitionistic,
    };
  }

  public getProofObjects(): { type: string; content: number }[] {
    return [...this._proofObjects];
  }

  public curryHowardCorrespondence(proof: number): number {
    return proof;
  }

  public reset(): void {
    this._proofs = 0;
    this._implications = 0;
    this._constructions = 0;
    this._witnesses = 0;
    this._proofObjects = [];
    this._implicationProofs = [];
    this._conjunctionProofs = [];
  }
}
