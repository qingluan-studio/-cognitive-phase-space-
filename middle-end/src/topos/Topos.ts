export interface ToposData {
  objects: number;
  morphisms: number;
  subobjectClassifier: boolean;
  powerObjects: boolean;
  cartesianClosed: boolean;
}

export class Topos {
  private _objects: number;
  private _morphisms: number;
  private _subobjectClassifier: boolean;
  private _powerObjects: boolean;
  private _cartesianClosed: boolean;
  private _finiteLimits: boolean;
  private _finiteColimits: boolean;
  private _exponentials: number;

  constructor(objects: number = 10) {
    this._objects = objects;
    this._morphisms = objects * objects;
    this._subobjectClassifier = true;
    this._powerObjects = true;
    this._cartesianClosed = true;
    this._finiteLimits = true;
    this._finiteColimits = true;
    this._exponentials = objects * objects;
  }

  get objects(): number {
    return this._objects;
  }

  get morphisms(): number {
    return this._morphisms;
  }

  get subobjectClassifier(): boolean {
    return this._subobjectClassifier;
  }

  get cartesianClosed(): boolean {
    return this._cartesianClosed;
  }

  public terminalObject(): number {
    return 1;
  }

  public initialObject(): number {
    return 0;
  }

  public product(objA: number, objB: number): number {
    return objA * objB;
  }

  public coproduct(objA: number, objB: number): number {
    return objA + objB;
  }

  public exponential(domain: number, codomain: number): number {
    return Math.pow(codomain, domain);
  }

  public powerObject(obj: number): number {
    return Math.pow(2, obj);
  }

  public subobjectClassifierSize(): number {
    return this._subobjectClassifier ? 2 : 0;
  }

  public trueMorphism(): number {
    return 1;
  }

  public falseMorphism(): number {
    return 0;
  }

  public isElementaryTopos(): boolean {
    return this._finiteLimits && this._cartesianClosed && this._subobjectClassifier;
  }

  public isGrothendieckTopos(): boolean {
    return this.isElementaryTopos() && this._finiteColimits;
  }

  public report(): ToposData {
    return {
      objects: this._objects,
      morphisms: this._morphisms,
      subobjectClassifier: this._subobjectClassifier,
      powerObjects: this._powerObjects,
      cartesianClosed: this._cartesianClosed,
    };
  }

  public setObject(n: number): void {
    this._objects = n;
    this._morphisms = n * n;
    this._exponentials = n * n;
  }

  public internalLogic(): string {
    return 'intuitionistic_higher_order';
  }

  public hasFiniteLimits(): boolean {
    return this._finiteLimits;
  }

  public hasFiniteColimits(): boolean {
    return this._finiteColimits;
  }

  public hasExponentials(): boolean {
    return this._cartesianClosed;
  }

  public reset(): void {
    this._subobjectClassifier = true;
    this._powerObjects = true;
    this._cartesianClosed = true;
  }
}
