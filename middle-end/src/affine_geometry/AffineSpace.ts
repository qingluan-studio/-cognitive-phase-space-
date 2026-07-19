import { DataPacket, PacketMeta } from '../shared/types';

export interface Point {
  x: number;
  y: number;
  z: number;
}

export interface Vector {
  dx: number;
  dy: number;
  dz: number;
}

export interface AffineFrame {
  origin: Point;
  basis: Vector[];
}

export type TransformationType = 'translation' | 'rotation' | 'scaling' | 'shear' | 'reflection';

export interface AffineTransformation {
  type: TransformationType;
  matrix: number[][];
  determinant: number;
}

export class AffineSpace {
  private _points: Map<string, Point> = new Map();
  private _vectors: Map<string, Vector> = new Map();
  private _frames: Map<string, AffineFrame> = new Map();
  private _transformations: Map<string, AffineTransformation> = new Map();
  private _history: string[] = [];
  private _dimension: number = 3;
  private _counter = 0;

  get points(): Map<string, Point> {
    return new Map(this._points);
  }

  get vectors(): Map<string, Vector> {
    return new Map(this._vectors);
  }

  get frames(): Map<string, AffineFrame> {
    return new Map(this._frames);
  }

  get transformations(): Map<string, AffineTransformation> {
    return new Map(this._transformations);
  }

  get history(): string[] {
    return [...this._history];
  }

  get dimension(): number {
    return this._dimension;
  }

  addPoint(point: Point): string {
    const id = `pt-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    this._points.set(id, { ...point });
    this._history.push(`Added point ${id}`);
    return id;
  }

  addVector(vector: Vector): string {
    const id = `vec-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    this._vectors.set(id, { ...vector });
    this._history.push(`Added vector ${id}`);
    return id;
  }

  createFrame(origin: Point, basis: Vector[]): string {
    if (basis.length !== this._dimension) {
      throw new Error(`Basis must have ${this._dimension} vectors`);
    }
    const id = `frm-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    this._frames.set(id, { origin: { ...origin }, basis: basis.map(v => ({ ...v })) });
    this._history.push(`Created frame ${id}`);
    return id;
  }

  translate(point: Point, vector: Vector): Point {
    return {
      x: point.x + vector.dx,
      y: point.y + vector.dy,
      z: point.z + vector.dz,
    };
  }

  rotate(point: Point, axis: Vector, angle: number): Point {
    const mag = Math.sqrt(axis.dx ** 2 + axis.dy ** 2 + axis.dz ** 2);
    if (mag === 0) return { ...point };
    const ux = axis.dx / mag;
    const uy = axis.dy / mag;
    const uz = axis.dz / mag;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const oneMinusCos = 1 - cos;

    const rotationMatrix = [
      [cos + ux * ux * oneMinusCos, ux * uy * oneMinusCos - uz * sin, ux * uz * oneMinusCos + uy * sin],
      [uy * ux * oneMinusCos + uz * sin, cos + uy * uy * oneMinusCos, uy * uz * oneMinusCos - ux * sin],
      [uz * ux * oneMinusCos - uy * sin, uz * uy * oneMinusCos + ux * sin, cos + uz * uz * oneMinusCos],
    ];

    return {
      x: rotationMatrix[0][0] * point.x + rotationMatrix[0][1] * point.y + rotationMatrix[0][2] * point.z,
      y: rotationMatrix[1][0] * point.x + rotationMatrix[1][1] * point.y + rotationMatrix[1][2] * point.z,
      z: rotationMatrix[2][0] * point.x + rotationMatrix[2][1] * point.y + rotationMatrix[2][2] * point.z,
    };
  }

  scale(point: Point, factor: number): Point {
    return {
      x: point.x * factor,
      y: point.y * factor,
      z: point.z * factor,
    };
  }

  shear(point: Point, direction: Vector, amount: number): Point {
    const mag = Math.sqrt(direction.dx ** 2 + direction.dy ** 2 + direction.dz ** 2);
    if (mag === 0) return { ...point };
    const nx = direction.dx / mag;
    const ny = direction.dy / mag;
    const nz = direction.dz / mag;

    return {
      x: point.x + amount * nx * (nx * point.x + ny * point.y + nz * point.z),
      y: point.y + amount * ny * (nx * point.x + ny * point.y + nz * point.z),
      z: point.z + amount * nz * (nx * point.x + ny * point.y + nz * point.z),
    };
  }

  reflect(point: Point, plane: { normal: Vector; distance: number }): Point {
    const mag = Math.sqrt(plane.normal.dx ** 2 + plane.normal.dy ** 2 + plane.normal.dz ** 2);
    if (mag === 0) return { ...point };
    const nx = plane.normal.dx / mag;
    const ny = plane.normal.dy / mag;
    const nz = plane.normal.dz / mag;

    const dot = nx * point.x + ny * point.y + nz * point.z;
    const distance = dot - plane.distance;

    return {
      x: point.x - 2 * distance * nx,
      y: point.y - 2 * distance * ny,
      z: point.z - 2 * distance * nz,
    };
  }

  composeTransformations(transforms: AffineTransformation[]): AffineTransformation {
    if (transforms.length === 0) {
      return { type: 'translation', matrix: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], determinant: 1 };
    }

    let result = transforms[0].matrix;
    for (let i = 1; i < transforms.length; i++) {
      result = this._matrixMultiply(result, transforms[i].matrix);
    }

    let det = 1;
    transforms.forEach(t => {
      det *= t.determinant;
    });

    const id = `comp-${(++this._counter).toString(36)}`;
    const composed: AffineTransformation = {
      type: 'rotation',
      matrix: result,
      determinant: det,
    };
    this._transformations.set(id, composed);
    this._history.push(`Composed transformation ${id}`);
    return composed;
  }

  affineCombination(points: Point[], weights: number[]): Point {
    if (points.length !== weights.length) {
      throw new Error('Points and weights must have same length');
    }

    const sumWeights = weights.reduce((a, b) => a + b, 0);
    if (Math.abs(sumWeights - 1) > 1e-9) {
      throw new Error('Weights must sum to 1');
    }

    return {
      x: points.reduce((sum, p, i) => sum + p.x * weights[i], 0),
      y: points.reduce((sum, p, i) => sum + p.y * weights[i], 0),
      z: points.reduce((sum, p, i) => sum + p.z * weights[i], 0),
    };
  }

  barycentricCoordinate(point: Point, triangle: Point[]): number[] {
    if (triangle.length !== 3) {
      throw new Error('Triangle must have 3 points');
    }

    const v0 = { dx: triangle[1].x - triangle[0].x, dy: triangle[1].y - triangle[0].y, dz: triangle[1].z - triangle[0].z };
    const v1 = { dx: triangle[2].x - triangle[0].x, dy: triangle[2].y - triangle[0].y, dz: triangle[2].z - triangle[0].z };
    const v2 = { dx: point.x - triangle[0].x, dy: point.y - triangle[0].y, dz: point.z - triangle[0].z };

    const d00 = v0.dx * v0.dx + v0.dy * v0.dy + v0.dz * v0.dz;
    const d01 = v0.dx * v1.dx + v0.dy * v1.dy + v0.dz * v1.dz;
    const d11 = v1.dx * v1.dx + v1.dy * v1.dy + v1.dz * v1.dz;
    const d20 = v2.dx * v0.dx + v2.dy * v0.dy + v2.dz * v0.dz;
    const d21 = v2.dx * v1.dx + v2.dy * v1.dy + v2.dz * v1.dz;

    const denom = d00 * d11 - d01 * d01;
    if (denom === 0) return [0, 0, 1];

    const v = (d11 * d20 - d01 * d21) / denom;
    const w = (d00 * d21 - d01 * d20) / denom;
    const u = 1 - v - w;

    return [u, v, w];
  }

  getTransformationMatrix(type: TransformationType, params: Record<string, number>): number[][] {
    switch (type) {
      case 'translation':
        return [
          [1, 0, 0, params.dx || 0],
          [0, 1, 0, params.dy || 0],
          [0, 0, 1, params.dz || 0],
          [0, 0, 0, 1],
        ];
      case 'rotation':
        const angle = params.angle || 0;
        return [
          [Math.cos(angle), -Math.sin(angle), 0, 0],
          [Math.sin(angle), Math.cos(angle), 0, 0],
          [0, 0, 1, 0],
          [0, 0, 0, 1],
        ];
      case 'scaling':
        return [
          [params.factor || 1, 0, 0, 0],
          [0, params.factor || 1, 0, 0],
          [0, 0, params.factor || 1, 0],
          [0, 0, 0, 1],
        ];
      case 'shear':
        return [
          [1, params.amount || 0, 0, 0],
          [0, 1, 0, 0],
          [0, 0, 1, 0],
          [0, 0, 0, 1],
        ];
      case 'reflection':
        return [
          [-1, 0, 0, 0],
          [0, 1, 0, 0],
          [0, 0, 1, 0],
          [0, 0, 0, 1],
        ];
      default:
        return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    }
  }

  toPacket(): DataPacket<{
    points: Array<{ id: string; point: Point }>;
    vectors: Array<{ id: string; vector: Vector }>;
    frames: Array<{ id: string; frame: AffineFrame }>;
    transformations: Array<{ id: string; transformation: AffineTransformation }>;
    history: string[];
    dimension: number;
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['affine-space'],
      priority: 1,
      phase: 'geometry',
    };

    return {
      id: `affine-${Date.now().toString(36)}`,
      payload: {
        points: Array.from(this._points.entries()).map(([id, p]) => ({ id, point: p })),
        vectors: Array.from(this._vectors.entries()).map(([id, v]) => ({ id, vector: v })),
        frames: Array.from(this._frames.entries()).map(([id, f]) => ({ id, frame: f })),
        transformations: Array.from(this._transformations.entries()).map(([id, t]) => ({ id, transformation: t })),
        history: this._history,
        dimension: this._dimension,
      },
      metadata,
    };
  }

  reset(): void {
    this._points.clear();
    this._vectors.clear();
    this._frames.clear();
    this._transformations.clear();
    this._history = [];
    this._counter = 0;
  }

  private _matrixMultiply(a: number[][], b: number[][]): number[][] {
    const result: number[][] = [];
    for (let i = 0; i < a.length; i++) {
      result[i] = [];
      for (let j = 0; j < b[0].length; j++) {
        let sum = 0;
        for (let k = 0; k < b.length; k++) {
          sum += (a[i][k] || 0) * (b[k][j] || 0);
        }
        result[i][j] = sum;
      }
    }
    return result;
  }
}