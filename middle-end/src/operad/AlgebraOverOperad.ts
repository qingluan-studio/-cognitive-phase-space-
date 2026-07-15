export interface AlgebraOverOperadData {
  algebra: number;
  operadActions: number;
  structure: string;
  generators: number;
  relations: number;
}

export class AlgebraOverOperad {
  private _algebra: number;
  private _operadActions: number;
  private _structure: string;
  private _generators: number;
  private _relations: number;
  private _elements: number[];
  private _operations: ((...args: number[]) => number)[];
  private _dimension: number;

  constructor(structure: string = 'associative', generators: number = 2) {
    this._structure = structure;
    this._generators = generators;
    this._algebra = 0;
    this._operadActions = 0;
    this._relations = 0;
    this._elements = [];
    for (let i = 0; i < generators; i++) {
      this._elements.push(i);
    }
    this._operations = [];
    this._dimension = generators;
    this._initializeOperations();
  }

  get algebra(): number {
    return this._algebra;
  }

  get operadActions(): number {
    return this._operadActions;
  }

  get structure(): string {
    return this._structure;
  }

  get generators(): number {
    return this._generators;
  }

  private _initializeOperations(): void {
    switch (this._structure) {
      case 'associative':
        this._operations.push((...args: number[]) => args.reduce((a, b) => a + b, 0));
        break;
      case 'commutative':
        this._operations.push((...args: number[]) => args.reduce((a, b) => a + b, 0));
        break;
      case 'lie':
        this._operations.push((a: number, b: number) => a - b);
        break;
      case 'poisson':
        this._operations.push((a: number, b: number) => a * b);
        this._operations.push((a: number, b: number) => a - b);
        break;
    }
  }

  public applyOperation(opIndex: number, ...args: number[]): number {
    if (opIndex < 0 || opIndex >= this._operations.length) return 0;
    this._operadActions++;
    return this._operations[opIndex](...args);
  }

  public multiply(a: number, b: number): number {
    return this.applyOperation(0, a, b);
  }

  public isCommutative(): boolean {
    return this._structure === 'commutative' || this._structure === 'poisson';
  }

  public isAssociative(): boolean {
    return this._structure !== 'lie';
  }

  public addRelation(relation: number): void {
    this._relations++;
  }

  public computeDimension(): number {
    this._dimension = this._generators + this._relations;
    return this._dimension;
  }

  public report(): AlgebraOverOperadData {
    return {
      algebra: this._algebra,
      operadActions: this._operadActions,
      structure: this._structure,
      generators: this._generators,
      relations: this._relations,
    };
  }

  public setStructure(type: string): void {
    this._structure = type;
    this._operations = [];
    this._initializeOperations();
  }

  public getElements(): number[] {
    return [...this._elements];
  }

  public freeAlgebra(degree: number): number {
    if (degree === 0) return 1;
    return Math.pow(this._generators, degree);
  }

  public abelianization(): number {
    return this._generators;
  }

  public reset(): void {
    this._operadActions = 0;
    this._relations = 0;
  }
}
