export interface InfinityCategoryData {
  objects: number;
  morphisms: number;
  higherMorphisms: number;
  compositions: number;
  weakEquivalences: boolean;
}

export class InfinityCategory {
  private _objects: number;
  private _morphisms: number;
  private _higherMorphisms: number;
  private _compositions: number;
  private _weakEquivalences: boolean;
  private _simplicialSet: number[][];
  private _nerves: number;
  private _quasicategory: boolean;

  constructor(objects: number = 10) {
    this._objects = objects;
    this._morphisms = objects * objects;
    this._higherMorphisms = 0;
    this._compositions = 0;
    this._weakEquivalences = true;
    this._simplicialSet = [];
    for (let i = 0; i < 5; i++) {
      const dim = Math.pow(objects, i + 1);
      const simplex = [];
      for (let j = 0; j < dim; j++) {
        simplex.push(j);
      }
      this._simplicialSet.push(simplex);
    }
    this._nerves = 1;
    this._quasicategory = true;
  }

  get objects(): number {
    return this._objects;
  }

  get morphisms(): number {
    return this._morphisms;
  }

  get higherMorphisms(): number {
    return this._higherMorphisms;
  }

  get weakEquivalences(): boolean {
    return this._weakEquivalences;
  }

  public nSimplex(n: number): number {
    if (n < 0 || n >= this._simplicialSet.length) return 0;
    return this._simplicialSet[n].length;
  }

  public faceMap(simplex: number, k: number): number {
    return Math.floor(simplex / this._objects);
  }

  public degeneracyMap(simplex: number, k: number): number {
    return simplex * this._objects + k;
  }

  public composeMorphism(f: number, g: number): number {
    this._compositions++;
    return f * g;
  }

  public higherMorphism(n: number): number {
    this._higherMorphisms++;
    return Math.pow(this._morphisms, n);
  }

  public isQuasicategory(): boolean {
    return this._quasicategory;
  }

  public nerve(category: number): number {
    this._nerves++;
    return category * category;
  }

  public homotopyCategory(): number {
    return this._objects;
  }

  public weakEquivalence(f: number): boolean {
    return this._weakEquivalences;
  }

  public report(): InfinityCategoryData {
    return {
      objects: this._objects,
      morphisms: this._morphisms,
      higherMorphisms: this._higherMorphisms,
      compositions: this._compositions,
      weakEquivalences: this._weakEquivalences,
    };
  }

  public setObjects(n: number): void {
    this._objects = n;
    this._morphisms = n * n;
    this._simplicialSet = [];
    for (let i = 0; i < 5; i++) {
      const dim = Math.pow(n, i + 1);
      const simplex = [];
      for (let j = 0; j < dim; j++) {
        simplex.push(j);
      }
      this._simplicialSet.push(simplex);
    }
  }

  public isInfinityGroupoid(): boolean {
    return this._weakEquivalences && this._quasicategory;
  }

  public mappingSpace(X: number, Y: number): number {
    return X * Y;
  }

  public reset(): void {
    this._higherMorphisms = 0;
    this._compositions = 0;
    this._nerves = 0;
  }
}
