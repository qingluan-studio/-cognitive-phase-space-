export interface CurvatureTensorData {
  dimension: number;
  scalarCurvature: number;
  ricciTensor: number[][];
  sectionalCurvature: number;
  einsteinTensor: number[][];
}

export class CurvatureTensor {
  private _dimension: number;
  private _scalarCurvature: number;
  private _ricciTensor: number[][];
  private _sectionalCurvature: number;
  private _einsteinTensor: number[][];
  private _riemannTensor: number[][][][];
  private _weylTensor: number;
  private _traceless: boolean;

  constructor(dimension: number = 3) {
    this._dimension = dimension;
    this._scalarCurvature = 0;
    this._sectionalCurvature = 0;
    this._ricciTensor = [];
    this._einsteinTensor = [];
    for (let i = 0; i < dimension; i++) {
      this._ricciTensor.push([]);
      this._einsteinTensor.push([]);
      for (let j = 0; j < dimension; j++) {
        this._ricciTensor[i].push(0);
        this._einsteinTensor[i].push(0);
      }
    }
    this._riemannTensor = [];
    for (let i = 0; i < dimension; i++) {
      this._riemannTensor.push([]);
      for (let j = 0; j < dimension; j++) {
        this._riemannTensor[i].push([]);
        for (let k = 0; k < dimension; k++) {
          this._riemannTensor[i][j].push([]);
          for (let l = 0; l < dimension; l++) {
            this._riemannTensor[i][j][k].push(0);
          }
        }
      }
    }
    this._weylTensor = 0;
    this._traceless = false;
  }

  get dimension(): number {
    return this._dimension;
  }

  get scalarCurvature(): number {
    return this._scalarCurvature;
  }

  get sectionalCurvature(): number {
    return this._sectionalCurvature;
  }

  get weylTensor(): number {
    return this._weylTensor;
  }

  public setConstantCurvature(K: number): void {
    this._sectionalCurvature = K;
    this._scalarCurvature = K * this._dimension * (this._dimension - 1);
    for (let i = 0; i < this._dimension; i++) {
      for (let j = 0; j < this._dimension; j++) {
        this._ricciTensor[i][j] = i === j ? K * (this._dimension - 1) : 0;
      }
    }
    this._computeEinsteinTensor();
  }

  private _computeEinsteinTensor(): void {
    for (let i = 0; i < this._dimension; i++) {
      for (let j = 0; j < this._dimension; j++) {
        const g_ij = i === j ? 1 : 0;
        this._einsteinTensor[i][j] = this._ricciTensor[i][j] - 0.5 * this._scalarCurvature * g_ij;
      }
    }
  }

  public computeRiemannComponent(i: number, j: number, k: number, l: number): number {
    const K = this._sectionalCurvature;
    const g_ik = i === k ? 1 : 0;
    const g_jl = j === l ? 1 : 0;
    const g_il = i === l ? 1 : 0;
    const g_jk = j === k ? 1 : 0;
    return K * (g_ik * g_jl - g_il * g_jk);
  }

  public contractRicci(): number[][] {
    return this._ricciTensor.map(row => [...row]);
  }

  public computeWeyl(): number {
    if (this._dimension < 3) return 0;
    this._weylTensor = this._scalarCurvature / (this._dimension * (this._dimension - 1));
    return this._weylTensor;
  }

  public isEinsteinManifold(): boolean {
    const lambda = this._scalarCurvature / this._dimension;
    for (let i = 0; i < this._dimension; i++) {
      for (let j = 0; j < this._dimension; j++) {
        const g_ij = i === j ? 1 : 0;
        if (Math.abs(this._ricciTensor[i][j] - lambda * g_ij) > 0.001) {
          return false;
        }
      }
    }
    return true;
  }

  public report(): CurvatureTensorData {
    return {
      dimension: this._dimension,
      scalarCurvature: this._scalarCurvature,
      ricciTensor: this._ricciTensor.map(r => [...r]),
      sectionalCurvature: this._sectionalCurvature,
      einsteinTensor: this._einsteinTensor.map(r => [...r]),
    };
  }

  public scalarToRicci(scalar: number): number[][] {
    const ricci: number[][] = [];
    for (let i = 0; i < this._dimension; i++) {
      ricci.push([]);
      for (let j = 0; j < this._dimension; j++) {
        ricci[i].push(i === j ? scalar / this._dimension : 0);
      }
    }
    return ricci;
  }

  public isFlat(): boolean {
    return Math.abs(this._scalarCurvature) < 0.001;
  }

  public reset(): void {
    this._scalarCurvature = 0;
    this._sectionalCurvature = 0;
    this._weylTensor = 0;
    this._traceless = false;
    for (let i = 0; i < this._dimension; i++) {
      for (let j = 0; j < this._dimension; j++) {
        this._ricciTensor[i][j] = 0;
        this._einsteinTensor[i][j] = 0;
      }
    }
  }
}
