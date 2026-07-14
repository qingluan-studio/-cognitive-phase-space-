/** 惯性参照系 - 中端自身扭曲时空坐标系，所有处理相对其进行 */

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

export class InertialFrame {
  private _origin: SpacetimeCoord = { t: 0, x: 0, y: 0, z: 0 };
  private _transform: FrameTransform;
  private _snapshots: FrameSnapshot[] = [];
  private _frameId: string;

  constructor(frameId: string = 'inertial-main') {
    this._frameId = frameId;
    this._transform = {
      dilationFactor: 1,
      rotation: 0,
      translation: { t: 0, x: 0, y: 0, z: 0 },
      distortionMatrix: [
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1],
      ],
    };
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
    this._transform.distortionMatrix = matrix;
  }

  transform(coord: SpacetimeCoord): SpacetimeCoord {
    const relative: SpacetimeCoord = {
      t: coord.t - this._origin.t,
      x: coord.x - this._origin.x,
      y: coord.y - this._origin.y,
      z: coord.z - this._origin.z,
    };
    const dilated: SpacetimeCoord = {
      t: relative.t * this._transform.dilationFactor,
      x: relative.x,
      y: relative.y,
      z: relative.z,
    };
    const rotated = this._applyRotation(dilated);
    const vector = [rotated.t, rotated.x, rotated.y, rotated.z];
    const distorted = this._applyMatrix(vector);
    return {
      t: distorted[0] + this._transform.translation.t,
      x: distorted[1] + this._transform.translation.x,
      y: distorted[2] + this._transform.translation.y,
      z: distorted[3] + this._transform.translation.z,
    };
  }

  snapshot(coord: SpacetimeCoord): FrameSnapshot {
    const snap: FrameSnapshot = {
      coord: { ...coord },
      transformed: this.transform(coord),
      frameId: this._frameId,
      capturedAt: Date.now(),
    };
    this._snapshots.push(snap);
    return snap;
  }

  reset(): void {
    this._transform = {
      dilationFactor: 1,
      rotation: 0,
      translation: { t: 0, x: 0, y: 0, z: 0 },
      distortionMatrix: [
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1],
      ],
    };
    this._snapshots = [];
  }

  get origin(): SpacetimeCoord {
    return { ...this._origin };
  }

  get frameId(): string {
    return this._frameId;
  }

  get transform(): FrameTransform {
    return {
      ...this._transform,
      translation: { ...this._transform.translation },
      distortionMatrix: this._transform.distortionMatrix.map(r => [...r]),
    };
  }

  get snapshots(): FrameSnapshot[] {
    return [...this._snapshots];
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

  private _applyMatrix(vector: number[]): number[] {
    const m = this._transform.distortionMatrix;
    const result = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        result[i] += m[i][j] * vector[j];
      }
    }
    return result;
  }
}
