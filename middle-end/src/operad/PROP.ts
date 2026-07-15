export interface PROPData {
  inputs: number;
  outputs: number;
  operations: number;
  compositions: number;
  symmetric: boolean;
}

export class PROP {
  private _inputs: number;
  private _outputs: number;
  private _operations: number;
  private _compositions: number;
  private _symmetric: boolean;
  private _verticalComposition: boolean;
  private _horizontalComposition: boolean;
  private _operationList: { in: number; out: number }[];

  constructor(maxInputs: number = 3, maxOutputs: number = 3) {
    this._inputs = maxInputs;
    this._outputs = maxOutputs;
    this._operations = 0;
    this._compositions = 0;
    this._symmetric = true;
    this._verticalComposition = true;
    this._horizontalComposition = true;
    this._operationList = [];
    for (let i = 1; i <= maxInputs; i++) {
      for (let j = 1; j <= maxOutputs; j++) {
        this._operationList.push({ in: i, out: j });
        this._operations++;
      }
    }
  }

  get inputs(): number {
    return this._inputs;
  }

  get outputs(): number {
    return this._outputs;
  }

  get operations(): number {
    return this._operations;
  }

  get symmetric(): boolean {
    return this._symmetric;
  }

  public verticalCompose(op1: number, op2: number): number {
    if (op1 < 0 || op1 >= this._operations) return -1;
    if (op2 < 0 || op2 >= this._operations) return -1;
    this._compositions++;
    const a = this._operationList[op1];
    const b = this._operationList[op2];
    if (a.out !== b.in) return -1;
    return this._findOperation(a.in, b.out);
  }

  public horizontalCompose(op1: number, op2: number): number {
    if (op1 < 0 || op1 >= this._operations) return -1;
    if (op2 < 0 || op2 >= this._operations) return -1;
    this._compositions++;
    const a = this._operationList[op1];
    const b = this._operationList[op2];
    return this._findOperation(a.in + b.in, a.out + b.out);
  }

  private _findOperation(inputs: number, outputs: number): number {
    for (let i = 0; i < this._operationList.length; i++) {
      const op = this._operationList[i];
      if (op.in === inputs && op.out === outputs) return i;
    }
    return -1;
  }

  public addOperation(inputs: number, outputs: number): number {
    const existing = this._findOperation(inputs, outputs);
    if (existing >= 0) return existing;
    this._operationList.push({ in: inputs, out: outputs });
    this._operations++;
    if (inputs > this._inputs) this._inputs = inputs;
    if (outputs > this._outputs) this._outputs = outputs;
    return this._operations - 1;
  }

  public getOperation(index: number): { in: number; out: number } | null {
    if (index < 0 || index >= this._operations) return null;
    return { ...this._operationList[index] };
  }

  public checkSymmetry(): boolean {
    this._symmetric = true;
    return this._symmetric;
  }

  public isOperad(): boolean {
    for (const op of this._operationList) {
      if (op.out !== 1) return false;
    }
    return true;
  }

  public report(): PROPData {
    return {
      inputs: this._inputs,
      outputs: this._outputs,
      operations: this._operations,
      compositions: this._compositions,
      symmetric: this._symmetric,
    };
  }

  public setSymmetric(value: boolean): void {
    this._symmetric = value;
  }

  public hasVerticalComposition(): boolean {
    return this._verticalComposition;
  }

  public hasHorizontalComposition(): boolean {
    return this._horizontalComposition;
  }

  public generateFreePROP(generators: number): number {
    let total = 0;
    for (let i = 1; i <= this._inputs; i++) {
      for (let j = 1; j <= this._outputs; j++) {
        total += Math.pow(generators, i + j);
      }
    }
    return total;
  }

  public reset(): void {
    this._compositions = 0;
  }
}
