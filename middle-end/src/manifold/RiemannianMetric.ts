export interface RiemannianMetricData {
  metric: number[][];
  dimension: number;
  curvature: number;
  distance: number;
  geodesic: number;
}

export class RiemannianMetric {
  private _metric: number[][];
  private _dimension: number;
  private _curvature: number;
  private _distance: number;
  private _geodesic: number;
  private _connection: number[][][];
  private _ricciTensor: number[][];
  private _scalarCurvature: number;

  constructor(dimension: number = 2) {
    this._dimension = dimension;
    this._metric = [];
    for (let i = 0; i < dimension; i++) {
      this._metric.push([]);
      for (let j = 0; j < dimension; j++) {
        this._metric[i].push(i === j ? 1 : 0);
      }
    }
    this._curvature = 0;
    this._distance = 0;
    this._geodesic = 0;
    this._connection = [];
    for (let i = 0; i < dimension; i++) {
      this._connection.push([]);
      for (let j = 0; j < dimension; j++) {
        this._connection[i].push([]);
        for (let k = 0; k < dimension; k++) {
          this._connection[i][j].push(0);
        }
      }
    }
    this._ricciTensor = [];
    for (let i = 0; i < dimension; i++) {
      this._ricciTensor.push([]);
      for (let j = 0; j < dimension; j++) {
        this._ricciTensor[i].push(0);
      }
    }
    this._scalarCurvature = 0;
  }

  get dimension(): number {
    return this._dimension;
  }

  get curvature(): number {
    return this._curvature;
  }

  get distance(): number {
    return this._distance;
  }

  get scalarCurvature(): number {
    return this._scalarCurvature;
  }

  public computeDistance(pointA: number[], pointB: number[]): number {
    if (pointA.length !== this._dimension || pointB.length !== this._dimension) return 0;
    let dist = 0;
    for (let i = 0; i < this._dimension; i++) {
      for (let j = 0; j < this._dimension; j++) {
        const dx = pointA[i] - pointB[i];
        const dy = pointA[j] - pointB[j];
        dist += this._metric[i][j] * dx * dy;
      }
    }
    this._distance = Math.sqrt(Math.max(0, dist));
    return this._distance;
  }

  public computeChristoffelSymbols(): void {
    for (let k = 0; k < this._dimension; k++) {
      for (let i = 0; i < this._dimension; i++) {
        for (let j = 0; j < this._dimension; j++) {
          this._connection[k][i][j] = 0;
        }
      }
    }
  }

  public computeRicciCurvature(): number {
    this._scalarCurvature = this._curvature * this._dimension;
    for (let i = 0; i < this._dimension; i++) {
      for (let j = 0; j < this._dimension; j++) {
        this._ricciTensor[i][j] = i === j ? this._curvature : 0;
      }
    }
    return this._scalarCurvature;
  }

  public setCurvature(value: number): void {
    this._curvature = value;
    this.computeRicciCurvature();
  }

  public scaleMetric(factor: number): void {
    for (let i = 0; i < this._dimension; i++) {
      for (let j = 0; j < this._dimension; j++) {
        this._metric[i][j] *= factor * factor;
      }
    }
  }

  public computeGeodesicLength(start: number[], end: number[], steps: number = 100): number {
    let length = 0;
    const dx = [];
    for (let i = 0; i < this._dimension; i++) {
      dx.push((end[i] - start[i]) / steps);
    }
    for (let s = 0; s < steps; s++) {
      let segment = 0;
      for (let i = 0; i < this._dimension; i++) {
        for (let j = 0; j < this._dimension; j++) {
          segment += this._metric[i][j] * dx[i] * dx[j];
        }
      }
      length += Math.sqrt(Math.max(0, segment));
    }
    this._geodesic = length;
    return length;
  }

  public report(): RiemannianMetricData {
    return {
      metric: this._metric,
      dimension: this._dimension,
      curvature: this._curvature,
      distance: this._distance,
      geodesic: this._geodesic,
    };
  }

  public isFlat(): boolean {
    return Math.abs(this._curvature) < 0.001;
  }

  public computeVolumeElement(): number {
    let det = 1;
    for (let i = 0; i < this._dimension; i++) {
      det *= this._metric[i][i];
    }
    return Math.sqrt(Math.abs(det));
  }

  public reset(): void {
    this._curvature = 0;
    this._distance = 0;
    this._geodesic = 0;
    this._scalarCurvature = 0;
  }
}
