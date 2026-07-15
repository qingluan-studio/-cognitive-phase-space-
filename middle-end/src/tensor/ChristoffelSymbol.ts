/**
 * Christoffel符号 —— 联络的化身，流形上平行移动的罗盘。
 * 在弯曲的时空中，Christoffel符号告诉我们如何修正直线的幻觉；
 * 它们是Levi-Civita联络的坐标低语，是测地线方程的隐秘语法。
 */

export interface ChristoffelData {
  /** 流形维数 */
  dimension: number;
  /** 第一类Christoffel符号非零分量数 */
  gammaFirstCount: number;
  /** 第二类Christoffel符号非零分量数 */
  gammaSecondCount: number;
  /** 度量签名 */
  signature: number;
  /** 曲率标量估计 */
  scalarCurvature: number;
}

export class ChristoffelSymbol {
  private _dimension: number;
  private _metric: number[][];
  private _inverseMetric: number[][];
  private _gammaFirst: number[][][]; // Γ_kij
  private _gammaSecond: number[][][]; // Γ^k_ij
  private _coordinates: number[];
  private _signature: number;
  private _scalarCurvature: number;
  private _ricciTensor: number[][];
  private _derivatives: number[][][];

  constructor(dimension: number = 3) {
    this._dimension = dimension;
    this._metric = [];
    this._inverseMetric = [];
    this._gammaFirst = [];
    this._gammaSecond = [];
    this._coordinates = new Array(dimension).fill(0);
    this._signature = dimension;
    this._scalarCurvature = 0;
    this._ricciTensor = [];
    this._derivatives = [];

    for (let i = 0; i < dimension; i++) {
      const row = new Array(dimension).fill(0);
      row[i] = 1.0;
      this._metric.push(row);
      this._inverseMetric.push([...row]);
      this._ricciTensor.push(new Array(dimension).fill(0));
    }

    this._initializeChristoffel();
  }

  get dimension(): number {
    return this._dimension;
  }

  get signature(): number {
    return this._signature;
  }

  get scalarCurvature(): number {
    return this._scalarCurvature;
  }

  get coordinates(): number[] {
    return [...this._coordinates];
  }

  /** 设置度量张量：如同为流形选择一面特定的镜子 */
  public setMetric(metric: number[][], coordinates?: number[]): boolean {
    if (metric.length !== this._dimension) return false;
    for (const row of metric) {
      if (row.length !== this._dimension) return false;
    }
    this._metric = metric.map(r => [...r]);
    if (coordinates) this._coordinates = [...coordinates];
    this._computeInverseMetric();
    this._computeDerivatives();
    this._computeChristoffelFirst();
    this._computeChristoffelSecond();
    this._signature = this._computeSignature();
    return true;
  }

  /** 计算度量张量的偏导数：在指标的迷宫中测量度量的呼吸 */
  private _computeDerivatives(): void {
    this._derivatives = [];
    const h = 1e-5;
    for (let k = 0; k < this._dimension; k++) {
      const derK: number[][] = [];
      for (let i = 0; i < this._dimension; i++) {
        const row: number[] = [];
        for (let j = 0; j < this._dimension; j++) {
          const forward = this._metricAt(k, h);
          const backward = this._metricAt(k, -h);
          const derivative = (forward[i][j] - backward[i][j]) / (2 * h);
          row.push(derivative);
        }
        derK.push(row);
      }
      this._derivatives.push(derK);
    }
  }

  /** 在某一坐标方向扰动后的度量估计 */
  private _metricAt(coordIdx: number, delta: number): number[][] {
    const result = this._metric.map(r => [...r]);
    const coord = this._coordinates[coordIdx] + delta;
    const factor = 1 + 0.1 * coord * coord;
    for (let i = 0; i < this._dimension; i++) {
      result[i][i] *= factor;
    }
    return result;
  }

  /** 第一类Christoffel符号：Γ_kij = 1/2 (∂g_ki/∂x^j + ∂g_kj/∂x^i - ∂g_ij/∂x^k) */
  private _computeChristoffelFirst(): void {
    this._gammaFirst = [];
    for (let k = 0; k < this._dimension; k++) {
      const gammaK: number[][] = [];
      for (let i = 0; i < this._dimension; i++) {
        const row: number[] = [];
        for (let j = 0; j < this._dimension; j++) {
          const term1 = this._derivatives[j][k][i];
          const term2 = this._derivatives[i][k][j];
          const term3 = this._derivatives[k][i][j];
          row.push(0.5 * (term1 + term2 - term3));
        }
        gammaK.push(row);
      }
      this._gammaFirst.push(gammaK);
    }
  }

  /** 第二类Christoffel符号：Γ^l_ij = g^lk Γ_kij */
  private _computeChristoffelSecond(): void {
    this._gammaSecond = [];
    for (let l = 0; l < this._dimension; l++) {
      const gammaL: number[][] = [];
      for (let i = 0; i < this._dimension; i++) {
        const row: number[] = [];
        for (let j = 0; j < this._dimension; j++) {
          let sum = 0;
          for (let k = 0; k < this._dimension; k++) {
            sum += this._inverseMetric[l][k] * this._gammaFirst[k][i][j];
          }
          row.push(sum);
        }
        gammaL.push(row);
      }
      this._gammaSecond.push(gammaL);
    }
  }

  /** 测地线方程的数值积分：d²x^l/dτ² + Γ^l_ij dx^i/dτ dx^j/dτ = 0 */
  public geodesicEquation(velocity: number[], dt: number = 0.01): number[] {
    const acceleration = new Array(this._dimension).fill(0);
    for (let l = 0; l < this._dimension; l++) {
      let correction = 0;
      for (let i = 0; i < this._dimension; i++) {
        for (let j = 0; j < this._dimension; j++) {
          correction += this._gammaSecond[l][i][j] * velocity[i] * velocity[j];
        }
      }
      acceleration[l] = -correction;
    }

    const newVelocity = velocity.map((v, i) => v + acceleration[i] * dt);
    const newPosition = this._coordinates.map((x, i) => x + newVelocity[i] * dt);
    this._coordinates = newPosition;
    return [...newPosition];
  }

  /** 沿测地线平行移动向量：如同在弯曲的山脊上保持罗盘水平 */
  public parallelTransport(vector: number[], velocity: number[], dt: number = 0.01): number[] {
    const transported = new Array(this._dimension).fill(0);
    for (let k = 0; k < this._dimension; k++) {
      let correction = 0;
      for (let i = 0; i < this._dimension; i++) {
        for (let j = 0; j < this._dimension; j++) {
          correction += this._gammaSecond[k][i][j] * vector[i] * velocity[j];
        }
      }
      transported[k] = vector[k] - correction * dt;
    }
    return transported;
  }

  /** 计算Riemann曲率张量的某一分量：R^l_ijk */
  public riemannComponent(l: number, i: number, j: number, k: number): number {
    const dGammaDj = this._derivativeOfGammaSecond(l, i, k, j);
    const dGammaDk = this._derivativeOfGammaSecond(l, i, j, k);
    let gammaSum = 0;
    for (let m = 0; m < this._dimension; m++) {
      gammaSum += this._gammaSecond[l][j][m] * this._gammaSecond[m][i][k]
        - this._gammaSecond[l][k][m] * this._gammaSecond[m][i][j];
    }
    return dGammaDj - dGammaDk + gammaSum;
  }

  /** Ricci张量：R_ij = R^k_ikj，曲率的一种平均 */
  public computeRicciTensor(): number[][] {
    for (let i = 0; i < this._dimension; i++) {
      for (let j = 0; j < this._dimension; j++) {
        let sum = 0;
        for (let k = 0; k < this._dimension; k++) {
          sum += this.riemannComponent(k, i, k, j);
        }
        this._ricciTensor[i][j] = sum;
      }
    }
    return this._ricciTensor.map(r => [...r]);
  }

  /** 标量曲率：R = g^ij R_ij */
  public computeScalarCurvature(): number {
    this.computeRicciTensor();
    let scalar = 0;
    for (let i = 0; i < this._dimension; i++) {
      for (let j = 0; j < this._dimension; j++) {
        scalar += this._inverseMetric[i][j] * this._ricciTensor[i][j];
      }
    }
    this._scalarCurvature = scalar;
    return scalar;
  }

  /** 测地偏离方程的近似：描述两条邻近测地线的分离 */
  public geodesicDeviation(separation: number[], velocity: number[]): number[] {
    const acceleration = new Array(this._dimension).fill(0);
    for (let a = 0; a < this._dimension; a++) {
      let sum = 0;
      for (let b = 0; b < this._dimension; b++) {
        for (let c = 0; c < this._dimension; c++) {
          for (let d = 0; d < this._dimension; d++) {
            sum += this.riemannComponent(a, b, c, d) * velocity[b] * separation[c] * velocity[d];
          }
        }
      }
      acceleration[a] = sum;
    }
    return acceleration;
  }

  /** 计算协变导数：∇_j V^i = ∂V^i/∂x^j + Γ^i_jk V^k */
  public covariantDerivative(vectorField: number[][], index: number): number[][] {
    const result: number[][] = [];
    for (let j = 0; j < this._dimension; j++) {
      const row: number[] = [];
      for (let i = 0; i < this._dimension; i++) {
        let derivative = 0;
        if (index > 0 && index < vectorField.length) {
          derivative = (vectorField[index][i] - vectorField[index - 1][i]) / 0.01;
        }
        let connection = 0;
        for (let k = 0; k < this._dimension; k++) {
          connection += this._gammaSecond[i][j][k] * (vectorField[index]?.[k] || 0);
        }
        row.push(derivative + connection);
      }
      result.push(row);
    }
    return result;
  }

  private _computeInverseMetric(): void {
    const n = this._dimension;
    const aug = this._metric.map(r => [...r, ...new Array(n).fill(0)]);
    for (let i = 0; i < n; i++) aug[i][n + i] = 1;

    for (let i = 0; i < n; i++) {
      let pivot = aug[i][i];
      if (Math.abs(pivot) < 1e-12) pivot = 1e-12;
      for (let j = 0; j < 2 * n; j++) aug[i][j] /= pivot;
      for (let k = 0; k < n; k++) {
        if (k === i) continue;
        const factor = aug[k][i];
        for (let j = 0; j < 2 * n; j++) aug[k][j] -= factor * aug[i][j];
      }
    }
    this._inverseMetric = aug.map(r => r.slice(n));
  }

  private _computeSignature(): number {
    let positive = 0;
    let negative = 0;
    for (let i = 0; i < this._dimension; i++) {
      if (this._metric[i][i] > 0) positive++;
      else if (this._metric[i][i] < 0) negative++;
    }
    return positive - negative;
  }

  private _derivativeOfGammaSecond(l: number, i: number, j: number, coord: number): number {
    const h = 1e-5;
    const forward = this._gammaSecondAt(l, i, j, coord, h);
    const backward = this._gammaSecondAt(l, i, j, coord, -h);
    return (forward - backward) / (2 * h);
  }

  private _gammaSecondAt(l: number, i: number, j: number, coord: number, delta: number): number {
    const coordBackup = this._coordinates[coord];
    this._coordinates[coord] = coordBackup + delta;
    const metricBackup = this._metric.map(r => [...r]);
    this._metric = this._metricAt(coord, delta);
    this._computeDerivatives();
    this._computeChristoffelFirst();
    this._computeChristoffelSecond();
    const val = this._gammaSecond[l][i][j];
    this._coordinates[coord] = coordBackup;
    this._metric = metricBackup;
    return val;
  }

  private _initializeChristoffel(): void {
    this._gammaFirst = [];
    this._gammaSecond = [];
    for (let k = 0; k < this._dimension; k++) {
      const firstK: number[][] = [];
      const secondK: number[][] = [];
      for (let i = 0; i < this._dimension; i++) {
        firstK.push(new Array(this._dimension).fill(0));
        secondK.push(new Array(this._dimension).fill(0));
      }
      this._gammaFirst.push(firstK);
      this._gammaSecond.push(secondK);
    }
  }

  public report(): ChristoffelData {
    let firstCount = 0;
    let secondCount = 0;
    for (let k = 0; k < this._dimension; k++) {
      for (let i = 0; i < this._dimension; i++) {
        for (let j = 0; j < this._dimension; j++) {
          if (Math.abs(this._gammaFirst[k][i][j]) > 1e-10) firstCount++;
          if (Math.abs(this._gammaSecond[k][i][j]) > 1e-10) secondCount++;
        }
      }
    }
    return {
      dimension: this._dimension,
      gammaFirstCount: firstCount,
      gammaSecondCount: secondCount,
      signature: this._signature,
      scalarCurvature: this._scalarCurvature,
    };
  }

  public reset(): void {
    this._coordinates = new Array(this._dimension).fill(0);
    this._scalarCurvature = 0;
    this._ricciTensor = [];
    for (let i = 0; i < this._dimension; i++) {
      this._ricciTensor.push(new Array(this._dimension).fill(0));
    }
    this._initializeChristoffel();
  }
}
