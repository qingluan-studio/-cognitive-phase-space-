export interface ElementaryToposData {
  objects: number;
  morphisms: number;
  subobjectClassifier: boolean;
  powerObject: boolean;
  finiteLimits: boolean;
}

export class ElementaryTopos {
  private _objects: number;
  private _morphisms: number;
  private _subobjectClassifier: boolean;
  private _powerObject: boolean;
  private _finiteLimits: boolean;
  private _exponentials: boolean;
  private _terminalObject: number;
  private _pullbackCount: number;

  constructor(objects: number = 5) {
    this._objects = objects;
    this._morphisms = objects * objects;
    this._subobjectClassifier = true;
    this._powerObject = true;
    this._finiteLimits = true;
    this._exponentials = true;
    this._terminalObject = 1;
    this._pullbackCount = 0;
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

  get finiteLimits(): boolean {
    return this._finiteLimits;
  }

  public terminal(): number {
    return this._terminalObject;
  }

  public product(a: number, b: number): number {
    return a * b;
  }

  public equalizer(f: number, g: number): number {
    return Math.min(f, g);
  }

  public pullback(f: number, g: number): number {
    this._pullbackCount++;
    return Math.min(f, g);
  }

  public powerObject(X: number): number {
    return Math.pow(2, X);
  }

  public exponential(Y: number, X: number): number {
    return Math.pow(Y, X);
  }

  public eval(expo: number, x: number): number {
    return Math.pow(expo, 1 / x);
  }

  public currying(f: number): number {
    return f;
  }

  public uncurrying(g: number): number {
    return g;
  }

  public isElementary(): boolean {
    return this._finiteLimits && this._exponentials && this._subobjectClassifier;
  }

  public hasSubobjectClassifier(): boolean {
    return this._subobjectClassifier;
  }

  public hasExponentials(): boolean {
    return this._exponentials;
  }

  public hasPowerObjects(): boolean {
    return this._powerObject;
  }

  public report(): ElementaryToposData {
    return {
      objects: this._objects,
      morphisms: this._morphisms,
      subobjectClassifier: this._subobjectClassifier,
      powerObject: this._powerObject,
      finiteLimits: this._finiteLimits,
    };
  }

  public setObjects(n: number): void {
    this._objects = n;
    this._morphisms = n * n;
  }

  public omega(): number {
    return 2;
  }

  public trueMorphism(): number {
    return 1;
  }

  public characteristicMorphism(subobject: number): number {
    return subobject;
  }

  public getPullbackCount(): number {
    return this._pullbackCount;
  }

  public reset(): void {
    this._pullbackCount = 0;
  }
}
