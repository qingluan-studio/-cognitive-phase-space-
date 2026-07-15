export interface TangentSpaceData {
  dimension: number;
  basis: number[][];
  vectors: number;
  point: number[];
  cotangent: boolean;
}

export class TangentSpace {
  private _dimension: number;
  private _basis: number[][];
  private _vectors: number;
  private _point: number[];
  private _cotangent: boolean;
  private _tangentVectors: number[][];
  private _dualBasis: number[][];
  private _metric: number[][];

  constructor(dimension: number = 2) {
    this._dimension = dimension;
    this._basis = [];
    for (let i = 0; i < dimension; i++) {
      const v = [];
      for (let j = 0; j < dimension; j++) {
        v.push(i === j ? 1 : 0);
      }
      this._basis.push(v);
    }
    this._vectors = 0;
    this._point = new Array(dimension).fill(0);
    this._cotangent = false;
    this._tangentVectors = [];
    this._dualBasis = [];
    for (let i = 0; i < dimension; i++) {
      const v = [];
      for (let j = 0; j < dimension; j++) {
        v.push(i === j ? 1 : 0);
      }
      this._dualBasis.push(v);
    }
    this._metric = [];
    for (let i = 0; i < dimension; i++) {
      this._metric.push([]);
      for (let j = 0; j < dimension; j++) {
        this._metric[i].push(i === j ? 1 : 0);
      }
    }
  }

  get dimension(): number {
    return this._dimension;
  }

  get vectors(): number {
    return this._vectors;
  }

  get point(): number[] {
    return [...this._point];
  }

  get cotangent(): boolean {
    return this._cotangent;
  }

  public setPoint(coords: number[]): void {
    if (coords.length === this._dimension) {
      this._point = [...coords];
    }
  }

  public addVector(components: number[]): number {
    if (components.length !== this._dimension) return -1;
    this._tangentVectors.push([...components]);
    this._vectors++;
    return this._vectors - 1;
  }

  public vectorAt(index: number): number[] {
    if (index < 0 || index >= this._vectors) return [];
    return [...this._tangentVectors[index]];
  }

  public innerProduct(v1: number[], v2: number[]): number {
    let result = 0;
    for (let i = 0; i < this._dimension; i++) {
      for (let j = 0; j < this._dimension; j++) {
        result += this._metric[i][j] * v1[i] * v2[j];
      }
    }
    return result;
  }

  public norm(vector: number[]): number {
    return Math.sqrt(Math.max(0, this.innerProduct(vector, vector)));
  }

  public toCotangent(vector: number[]): number[] {
    const covector = [];
    for (let i = 0; i < this._dimension; i++) {
      let c = 0;
      for (let j = 0; j < this._dimension; j++) {
        c += this._metric[i][j] * vector[j];
      }
      covector.push(c);
    }
    return covector;
  }

  public toTangent(covector: number[]): number[] {
    const vector = [];
    for (let i = 0; i < this._dimension; i++) {
      let v = 0;
      for (let j = 0; j < this._dimension; j++) {
        v += covector[j] / (this._metric[i][j] || 1);
      }
      vector.push(v);
    }
    return vector;
  }

  public report(): TangentSpaceData {
    return {
      dimension: this._dimension,
      basis: this._basis,
      vectors: this._vectors,
      point: [...this._point],
      cotangent: this._cotangent,
    };
  }

  public setCotangent(value: boolean): void {
    this._cotangent = value;
  }

  public lieDerivative(vectorField: number[][], functionValues: number[]): number[] {
    const result = [];
    for (let i = 0; i < functionValues.length; i++) {
      let dv = 0;
      for (let j = 0; j < this._dimension; j++) {
        dv += vectorField[i][j] * (functionValues[i + 1] || 0 - functionValues[i]) / 0.01;
      }
      result.push(dv);
    }
    return result;
  }

  public reset(): void {
    this._vectors = 0;
    this._tangentVectors = [];
    this._point = new Array(this._dimension).fill(0);
  }
}
