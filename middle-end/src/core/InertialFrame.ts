export interface SpacetimeCoord {
  t: number;
  x: number;
  y: number;
  z: number;
}

export interface FrameTransform {
  dilationFactor: number;
  rotation: number;
  translation: SpacetimeCoord;
  distortionMatrix: number[][];
}

export interface FrameSnapshot {
  coord: SpacetimeCoord;
  transformed: SpacetimeCoord;
  frameId: string;
  capturedAt: number;
}

const IDENTITY_MATRIX = [
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [0, 0, 0, 1],
];

const MINKOWSKI_METRIC = [
  [-1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [0, 0, 0, 1],
];

export class InertialFrame {
  private _origin: SpacetimeCoord = { t: 0, x: 0, y: 0, z: 0 };
  private _transform: FrameTransform;
  private _snapshots: FrameSnapshot[] = [];
  private _frameId: string;
  private _metricTensor: number[][];
  private _boostVelocity: SpacetimeCoord;
  private _properTimeAccumulator = 0;
  private _worldlinePoints: SpacetimeCoord[] = [];

  constructor(frameId: string = 'inertial-main') {
    this._frameId = frameId;
    this._transform = {
      dilationFactor: 1,
      rotation: 0,
      translation: { t: 0, x: 0, y: 0, z: 0 },
      distortionMatrix: IDENTITY_MATRIX.map(r => [...r]),
    };
    this._metricTensor = MINKOWSKI_METRIC.map(r => [...r]);
    this._boostVelocity = { t: 0, x: 0, y: 0, z: 0 };
  }

  setOrigin(coord: SpacetimeCoord): void {
    this._origin = { ...coord };
  }

  setDilation(factor: number): void {
    if (factor <= 0) throw new Error('Dilation factor must be positive');
    this._transform.dilationFactor = factor;
  }

  setRotation(angle: number): void {
    this._transform.rotation = angle;
  }

  setTranslation(coord: SpacetimeCoord): void {
    this._transform.translation = { ...coord };
  }

  distort(matrix: number[][]): void {
    if (matrix.length !== 4 || matrix.some(r => r.length !== 4)) {
      throw new Error('Distortion matrix must be 4x4');
    }
    this._transform.distortionMatrix = matrix.map(row => [...row]);
    this._recomputeMetricTensor();
  }

  setBoostVelocity(velocity: SpacetimeCoord): void {
    const speedSq = velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2;
    if (speedSq >= 1) throw new Error('Velocity must be less than c (c=1)');
    this._boostVelocity = { ...velocity };
  }

  transform(coord: SpacetimeCoord): SpacetimeCoord {
    const relative: SpacetimeCoord = {
      t: coord.t - this._origin.t,
      x: coord.x - this._origin.x,
      y: coord.y - this._origin.y,
      z: coord.z - this._origin.z,
    };
    const boosted = this._applyLorentzBoost(relative);
    const dilated: SpacetimeCoord = {
      t: boosted.t * this._transform.dilationFactor,
      x: boosted.x,
      y: boosted.y,
      z: boosted.z,
    };
    const rotated = this._applyRotation(dilated);
    const vector = [rotated.t, rotated.x, rotated.y, rotated.z];
    const distorted = this._applyMatrix(vector, this._transform.distortionMatrix);
    return {
      t: distorted[0] + this._transform.translation.t,
      x: distorted[1] + this._transform.translation.x,
      y: distorted[2] + this._transform.translation.y,
      z: distorted[3] + this._transform.translation.z,
    };
  }

  properTime(start: SpacetimeCoord, end: SpacetimeCoord): number {
    const dt = end.t - start.t;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dz = end.z - start.z;
    const dsSq = -(dt ** 2) + dx ** 2 + dy ** 2 + dz ** 2;
    return dsSq < 0 ? Math.sqrt(-dsSq) : 0;
  }

  spacetimeInterval(coord: SpacetimeCoord): number {
    const relative: SpacetimeCoord = {
      t: coord.t - this._origin.t,
      x: coord.x - this._origin.x,
      y: coord.y - this._origin.y,
      z: coord.z - this._origin.z,
    };
    const v = [relative.t, relative.x, relative.y, relative.z];
    let interval = 0;
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        interval += this._metricTensor[i][j] * v[i] * v[j];
      }
    }
    return interval;
  }

  lorentzGamma(): number {
    const vSq = this._boostVelocity.x ** 2 + this._boostVelocity.y ** 2 + this._boostVelocity.z ** 2;
    return 1 / Math.sqrt(1 - vSq);
  }

  snapshot(coord: SpacetimeCoord): FrameSnapshot {
    const snap: FrameSnapshot = {
      coord: { ...coord },
      transformed: this.transform(coord),
      frameId: this._frameId,
      capturedAt: Date.now(),
    };
    this._snapshots.push(snap);
    this._worldlinePoints.push({ ...coord });
    if (this._worldlinePoints.length > 1) {
      const idx = this._worldlinePoints.length - 1;
      this._properTimeAccumulator += this.properTime(
        this._worldlinePoints[idx - 1],
        this._worldlinePoints[idx]
      );
    }
    return snap;
  }

  reset(): void {
    this._transform = {
      dilationFactor: 1,
      rotation: 0,
      translation: { t: 0, x: 0, y: 0, z: 0 },
      distortionMatrix: IDENTITY_MATRIX.map(r => [...r]),
    };
    this._metricTensor = MINKOWSKI_METRIC.map(r => [...r]);
    this._boostVelocity = { t: 0, x: 0, y: 0, z: 0 };
    this._snapshots = [];
    this._worldlinePoints = [];
    this._properTimeAccumulator = 0;
  }

  get origin(): SpacetimeCoord {
    return { ...this._origin };
  }

  get frameId(): string {
    return this._frameId;
  }

  get frameTransform(): FrameTransform {
    return {
      ...this._transform,
      translation: { ...this._transform.translation },
      distortionMatrix: this._transform.distortionMatrix.map(r => [...r]),
    };
  }

  get snapshots(): FrameSnapshot[] {
    return [...this._snapshots];
  }

  get metricTensor(): number[][] {
    return this._metricTensor.map(r => [...r]);
  }

  get boostVelocity(): SpacetimeCoord {
    return { ...this._boostVelocity };
  }

  get accumulatedProperTime(): number {
    return this._properTimeAccumulator;
  }

  private _applyRotation(coord: SpacetimeCoord): SpacetimeCoord {
    const cos = Math.cos(this._transform.rotation);
    const sin = Math.sin(this._transform.rotation);
    return {
      t: coord.t,
      x: coord.x * cos - coord.y * sin,
      y: coord.x * sin + coord.y * cos,
      z: coord.z,
    };
  }

  private _applyMatrix(vector: number[], matrix: number[][]): number[] {
    const result = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        result[i] += matrix[i][j] * vector[j];
      }
    }
    return result;
  }

  private _applyLorentzBoost(coord: SpacetimeCoord): SpacetimeCoord {
    const v = this._boostVelocity;
    const vSq = v.x ** 2 + v.y ** 2 + v.z ** 2;
    if (vSq === 0) return { ...coord };
    const gamma = 1 / Math.sqrt(1 - vSq);
    const vDotR = v.x * coord.x + v.y * coord.y + v.z * coord.z;
    const factor = (gamma - 1) / vSq;
    return {
      t: gamma * (coord.t - vDotR),
      x: coord.x + factor * v.x * vDotR - gamma * v.x * coord.t,
      y: coord.y + factor * v.y * vDotR - gamma * v.y * coord.t,
      z: coord.z + factor * v.z * vDotR - gamma * v.z * coord.t,
    };
  }

  private _recomputeMetricTensor(): void {
    const g = MINKOWSKI_METRIC;
    const D = this._transform.distortionMatrix;
    const result = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        for (let k = 0; k < 4; k++) {
          for (let l = 0; l < 4; l++) {
            result[i][j] += D[k][i] * g[k][l] * D[l][j];
          }
        }
      }
    }
    this._metricTensor = result;
  }
}
