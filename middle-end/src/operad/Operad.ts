export interface OperadData {
  arity: number;
  operations: number;
  compositions: number;
  associative: boolean;
  unital: boolean;
}

export class Operad {
  private _arity: number;
  private _operations: number;
  private _compositions: number;
  private _associative: boolean;
  private _unital: boolean;
  private _operationNames: string[];
  private _identityOperation: number;
  private _compositionRules: number[][];

  constructor(maxArity: number = 3) {
    this._arity = maxArity;
    this._operations = maxArity;
    this._compositions = 0;
    this._associative = true;
    this._unital = true;
    this._operationNames = [];
    for (let i = 1; i <= maxArity; i++) {
      this._operationNames.push(`op_${i}`);
    }
    this._identityOperation = 1;
    this._compositionRules = [];
    for (let i = 0; i < maxArity; i++) {
      this._compositionRules.push([]);
      for (let j = 0; j < maxArity; j++) {
        this._compositionRules[i].push(Math.min(i + j + 1, maxArity));
      }
    }
  }

  get arity(): number {
    return this._arity;
  }

  get operations(): number {
    return this._operations;
  }

  get compositions(): number {
    return this._compositions;
  }

  get associative(): boolean {
    return this._associative;
  }

  public compose(operationI: number, operationJ: number, position: number): number {
    this._compositions++;
    if (operationI < 0 || operationI >= this._operations) return -1;
    if (operationJ < 0 || operationJ >= this._operations) return -1;
    const result = this._compositionRules[operationI]?.[operationJ] || 0;
    return Math.min(result, this._arity);
  }

  public identity(): number {
    return this._identityOperation;
  }

  public checkAssociativity(op1: number, op2: number, op3: number): boolean {
    const left = this.compose(this.compose(op1, op2, 0), op3, 0);
    const right = this.compose(op1, this.compose(op2, op3, 0), 0);
    this._associative = left === right;
    return this._associative;
  }

  public checkUnit(operation: number): boolean {
    const leftUnit = this.compose(this._identityOperation - 1, operation, 0);
    const rightUnit = this.compose(operation, this._identityOperation - 1, 0);
    return leftUnit === operation && rightUnit === operation;
  }

  public getOperation(n: number): string {
    if (n < 0 || n >= this._operations) return '';
    return this._operationNames[n];
  }

  public setArity(n: number): void {
    this._arity = Math.max(1, n);
    this._operations = this._arity;
    this._operationNames = [];
    for (let i = 1; i <= this._arity; i++) {
      this._operationNames.push(`op_${i}`);
    }
  }

  public report(): OperadData {
    return {
      arity: this._arity,
      operations: this._operations,
      compositions: this._compositions,
      associative: this._associative,
      unital: this._unital,
    };
  }

  public isUnital(): boolean {
    return this._unital;
  }

  public generateFreeOperad(generators: number): number {
    let total = 0;
    for (let i = 1; i <= this._arity; i++) {
      total += Math.pow(generators, i);
    }
    return total;
  }

  public operadicHomology(degree: number): number {
    if (degree === 0) return 1;
    if (degree === 1) return this._operations;
    return Math.floor(this._operations / (degree + 1));
  }

  public reset(): void {
    this._compositions = 0;
    this._associative = true;
  }
}
