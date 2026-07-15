export interface MetricTensor {
  components: number[][];
  signature: number[];
}

export interface CurvatureScalar {
  ricciScalar: number;
  kretschmannScalar: number;
  weylScalar: number;
  eulerDensity: number;
}

export class SpacetimeCurvature {
  private _metric: number[][];
  private _inverseMetric: number[][];
  private _christoffel: number[][][];
  private _riemannTensor: number[][][][];
  private _ricciTensor: number[][];
  private _ricciScalar: number;
  private _einsteinTensor: number[][];
  private _dimension: number;
  private _coordinates: string[];
  private _history: CurvatureScalar[];

  constructor(dimension: number = 4) {
    this._dimension = Math.max(2, dimension);
    this._metric = this._initializeMinkowski();
    this._inverseMetric = this._initializeMinkowski();
    this._christoffel = this._initializeChristoffel();
    this._riemannTensor = this._initializeRiemann();
    this._ricciTensor = this._initializeSymmetric();
    this._ricciScalar = 0;
    this._einsteinTensor = this._initializeSymmetric();
    this._coordinates = ['t', 'r', 'theta', 'phi'];
    this._history = [];
  }

  get dimension(): number {
    return this._dimension;
  }

  get ricciScalar(): number {
    return this._ricciScalar;
  }

  get coordinates(): string[] {
    return [...this._coordinates];
  }

  private _initializeMinkowski(): number[][] {
    const g: number[][] = [];
    for (let i = 0; i < this._dimension; i++) {
      const row = new Array(this._dimension).fill(0);
      row[i] = i === 0 ? -1 : 1;
      g.push(row);
    }
    return g;
  }

  private _initializeChristoffel(): number[][][] {
    const gamma: number[][][] = [];
    for (let i = 0; i < this._dimension; i++) {
      const mat: number[][] = [];
      for (let j = 0; j < this._dimension; j++) {
        mat.push(new Array(this._dimension).fill(0));
      }
      gamma.push(mat);
    }
    return gamma;
  }

  private _initializeRiemann(): number[][][][] {
    const R: number[][][][] = [];
    for (let i = 0; i < this._dimension; i++) {
      const layer: number[][][] = [];
      for (let j = 0; j < this._dimension; j++) {
        const mat: number[][] = [];
        for (let k = 0; k < this._dimension; k++) {
          mat.push(new Array(this._dimension).fill(0));
        }
        layer.push(mat);
      }
      R.push(layer);
    }
    return R;
  }

  private _initializeSymmetric(): number[][] {
    const g: number[][] = [];
    for (let i = 0; i < this._dimension; i++) {
      const row = new Array(this._dimension).fill(0);
      g.push(row);
    }
    return g;
  }

  public setMetric(metric: number[][]): void {
    if (metric.length !== this._dimension || metric.some(row => row.length !== this._dimension)) return;
    this._metric = metric.map(row => [...row]);
    this._computeInverseMetric();
  }

  private _computeInverseMetric(): void {
    if (this._dimension === 2) {
      const det = this._metric[0][0] * this._metric[1][1] - this._metric[0][1] * this._metric[1][0];
      if (det === 0) return;
      const invDet = 1 / det;
      this._inverseMetric[0][0] = this._metric[1][1] * invDet;
      this._inverseMetric[0][1] = -this._metric[0][1] * invDet;
      this._inverseMetric[1][0] = -this._metric[1][0] * invDet;
      this._inverseMetric[1][1] = this._metric[0][0] * invDet;
    } else {
      for (let i = 0; i < this._dimension; i++) {
        for (let j = 0; j < this._dimension; j++) {
          this._inverseMetric[i][j] = i === j ? 1 / (this._metric[i][j] + 1e-10) : 0;
        }
      }
    }
  }

  public computeChristoffelSymbols(): number[][][] {
    const gamma = this._initializeChristoffel();
    const g = this._metric;
    const gInv = this._inverseMetric;
    for (let lambda = 0; lambda < this._dimension; lambda++) {
      for (let mu = 0; mu < this._dimension; mu++) {
        for (let nu = 0; nu < this._dimension; nu++) {
          let sum = 0;
          for (let sigma = 0; sigma < this._dimension; sigma++) {
            sum += gInv[lambda][sigma] * (this._partialDerivative(g[sigma][nu], mu) + this._partialDerivative(g[mu][sigma], nu) - this._partialDerivative(g[mu][nu], sigma));
          }
          gamma[lambda][mu][nu] = 0.5 * sum;
        }
      }
    }
    this._christoffel = gamma;
    return gamma;
  }

  private _partialDerivative(value: number, coordIndex: number): number {
    return value * 0.001;
  }

  public computeRiemannTensor(): number[][][][] {
    const R = this._initializeRiemann();
    for (let rho = 0; rho < this._dimension; rho++) {
      for (let sigma = 0; sigma < this._dimension; sigma++) {
        for (let mu = 0; mu < this._dimension; mu++) {
          for (let nu = 0; nu < this._dimension; nu++) {
            R[rho][sigma][mu][nu] = this._christoffel[rho][nu][sigma] * this._christoffel[rho][mu][sigma] - this._christoffel[rho][mu][sigma] * this._christoffel[rho][nu][sigma];
          }
        }
      }
    }
    this._riemannTensor = R;
    return R;
  }

  public computeRicciTensor(): number[][] {
    const Ric = this._initializeSymmetric();
    for (let mu = 0; mu < this._dimension; mu++) {
      for (let nu = 0; nu < this._dimension; nu++) {
        let sum = 0;
        for (let lambda = 0; lambda < this._dimension; lambda++) {
          sum += this._riemannTensor[lambda][mu][lambda][nu];
        }
        Ric[mu][nu] = sum;
      }
    }
    this._ricciTensor = Ric;
    return Ric;
  }

  public computeRicciScalar(): number {
    let R = 0;
    for (let mu = 0; mu < this._dimension; mu++) {
      for (let nu = 0; nu < this._dimension; nu++) {
        R += this._inverseMetric[mu][nu] * this._ricciTensor[mu][nu];
      }
    }
    this._ricciScalar = R;
    return R;
  }

  public computeEinsteinTensor(): number[][] {
    const G = this._initializeSymmetric();
    for (let mu = 0; mu < this._dimension; mu++) {
      for (let nu = 0; nu < this._dimension; nu++) {
        G[mu][nu] = this._ricciTensor[mu][nu] - 0.5 * this._metric[mu][nu] * this._ricciScalar;
      }
    }
    this._einsteinTensor = G;
    return G;
  }

  public computeKretschmannScalar(): number {
    let K = 0;
    for (let a = 0; a < this._dimension; a++) {
      for (let b = 0; b < this._dimension; b++) {
        for (let c = 0; c < this._dimension; c++) {
          for (let d = 0; d < this._dimension; d++) {
            const Rabcd = this._riemannTensor[a][b][c][d];
            K += Rabcd * Rabcd;
          }
        }
      }
    }
    return K;
  }

  public computeSchwarzschildMetric(M: number, r: number): number[][] {
    const c = 299792458;
    const G = 6.674e-11;
    const rs = (2 * G * M) / (c * c);
    const g: number[][] = [];
    for (let i = 0; i < 4; i++) {
      g.push(new Array(4).fill(0));
    }
    g[0][0] = -(1 - rs / r);
    g[1][1] = 1 / (1 - rs / r);
    g[2][2] = r * r;
    g[3][3] = r * r * Math.sin(Math.PI / 2) * Math.sin(Math.PI / 2);
    return g;
  }

  public computeFLRWMetric(a: number, k: number, r: number): number[][] {
    const g: number[][] = [];
    for (let i = 0; i < 4; i++) {
      g.push(new Array(4).fill(0));
    }
    g[0][0] = -1;
    g[1][1] = a * a / (1 - k * r * r);
    g[2][2] = a * a * r * r;
    g[3][3] = a * a * r * r * Math.sin(Math.PI / 2) * Math.sin(Math.PI / 2);
    return g;
  }

  public getMetric(): number[][] {
    return this._metric.map(row => [...row]);
  }

  public getEinsteinTensor(): number[][] {
    return this._einsteinTensor.map(row => [...row]);
  }

  public getCurvatureScalars(): CurvatureScalar {
    return {
      ricciScalar: this._ricciScalar,
      kretschmannScalar: this.computeKretschmannScalar(),
      weylScalar: this._ricciScalar / 6,
      eulerDensity: this._ricciScalar * this._ricciScalar,
    };
  }

  public getHistory(): CurvatureScalar[] {
    return this._history.map(h => ({ ...h }));
  }

  public recordCurvature(): void {
    this._history.push(this.getCurvatureScalars());
    if (this._history.length > 200) this._history.shift();
  }

  public isSingularity(): boolean {
    const K = this.computeKretschmannScalar();
    return !isFinite(K) || K > 1e20;
  }

  public reset(): void {
    this._metric = this._initializeMinkowski();
    this._inverseMetric = this._initializeMinkowski();
    this._christoffel = this._initializeChristoffel();
    this._riemannTensor = this._initializeRiemann();
    this._ricciTensor = this._initializeSymmetric();
    this._ricciScalar = 0;
    this._einsteinTensor = this._initializeSymmetric();
    this._history = [];
  }
}
