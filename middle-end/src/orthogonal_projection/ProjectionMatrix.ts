import { DataPacket, PacketMeta } from '../shared/types';
import { Point, Vector } from '../affine_geometry/AffineSpace';

export interface Matrix4x4 {
  data: number[][];
}

export interface TransformPipeline {
  transforms: string[];
  matrix: Matrix4x4;
  output: Point[];
}

export interface MatrixOperation {
  type: 'translate' | 'rotate' | 'scale' | 'project';
  matrix: Matrix4x4;
  parameters: Record<string, number>;
}

export class ProjectionMatrix {
  private _matrices: Map<string, Matrix4x4> = new Map();
  private _pipelines: Map<string, TransformPipeline> = new Map();
  private _operations: Map<string, MatrixOperation> = new Map();
  private _history: unknown[] = [];

  identity(): Matrix4x4 {
    const matrix: Matrix4x4 = {
      data: [
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1],
      ],
    };
    this._matrices.set('identity', matrix);
    this._history.push({ type: 'identity', result: matrix });
    return matrix;
  }

  translation(x: number, y: number, z: number): Matrix4x4 {
    const matrix: Matrix4x4 = {
      data: [
        [1, 0, 0, x],
        [0, 1, 0, y],
        [0, 0, 1, z],
        [0, 0, 0, 1],
      ],
    };
    const id = `translate-${x}-${y}-${z}`;
    this._matrices.set(id, matrix);
    this._operations.set(id, { type: 'translate', matrix, parameters: { x, y, z } });
    this._history.push({ type: 'translation', x, y, z, result: matrix });
    return matrix;
  }

  rotation(axis: Vector, angle: number): Matrix4x4 {
    const theta = angle * Math.PI / 180;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    const len = Math.sqrt(axis.dx ** 2 + axis.dy ** 2 + axis.dz ** 2);
    const ux = axis.dx / len;
    const uy = axis.dy / len;
    const uz = axis.dz / len;

    const matrix: Matrix4x4 = {
      data: [
        [cos + ux * ux * (1 - cos), ux * uy * (1 - cos) - uz * sin, ux * uz * (1 - cos) + uy * sin, 0],
        [uy * ux * (1 - cos) + uz * sin, cos + uy * uy * (1 - cos), uy * uz * (1 - cos) - ux * sin, 0],
        [uz * ux * (1 - cos) - uy * sin, uz * uy * (1 - cos) + ux * sin, cos + uz * uz * (1 - cos), 0],
        [0, 0, 0, 1],
      ],
    };
    const id = `rotate-${axis.dx}-${axis.dy}-${axis.dz}-${angle}`;
    this._matrices.set(id, matrix);
    this._operations.set(id, { type: 'rotate', matrix, parameters: { angle, ax: axis.dx, ay: axis.dy, az: axis.dz } });
    this._history.push({ type: 'rotation', axis, angle, result: matrix });
    return matrix;
  }

  scaling(x: number, y: number, z: number): Matrix4x4 {
    const matrix: Matrix4x4 = {
      data: [
        [x, 0, 0, 0],
        [0, y, 0, 0],
        [0, 0, z, 0],
        [0, 0, 0, 1],
      ],
    };
    const id = `scale-${x}-${y}-${z}`;
    this._matrices.set(id, matrix);
    this._operations.set(id, { type: 'scale', matrix, parameters: { x, y, z } });
    this._history.push({ type: 'scaling', x, y, z, result: matrix });
    return matrix;
  }

  perspective(fov: number, aspect: number, near: number, far: number): Matrix4x4 {
    const f = 1 / Math.tan(fov * Math.PI / 180 / 2);
    const matrix: Matrix4x4 = {
      data: [
        [f / aspect, 0, 0, 0],
        [0, f, 0, 0],
        [0, 0, (far + near) / (near - far), 2 * far * near / (near - far)],
        [0, 0, -1, 0],
      ],
    };
    const id = `perspective-${fov}-${aspect}-${near}-${far}`;
    this._matrices.set(id, matrix);
    this._operations.set(id, { type: 'project', matrix, parameters: { fov, aspect, near, far } });
    this._history.push({ type: 'perspective', fov, aspect, near, far, result: matrix });
    return matrix;
  }

  orthographic(left: number, right: number, bottom: number, top: number, near: number, far: number): Matrix4x4 {
    const matrix: Matrix4x4 = {
      data: [
        [2 / (right - left), 0, 0, -(right + left) / (right - left)],
        [0, 2 / (top - bottom), 0, -(top + bottom) / (top - bottom)],
        [0, 0, 2 / (near - far), -(near + far) / (near - far)],
        [0, 0, 0, 1],
      ],
    };
    const id = `ortho-${left}-${right}-${bottom}-${top}-${near}-${far}`;
    this._matrices.set(id, matrix);
    this._operations.set(id, { type: 'project', matrix, parameters: { left, right, bottom, top, near, far } });
    this._history.push({ type: 'orthographic', left, right, bottom, top, near, far, result: matrix });
    return matrix;
  }

  lookAt(eye: Point, target: Point, up: Vector): Matrix4x4 {
    const forward: Vector = {
      dx: target.x - eye.x,
      dy: target.y - eye.y,
      dz: target.z - eye.z,
    };
    const len = Math.sqrt(forward.dx ** 2 + forward.dy ** 2 + forward.dz ** 2);
    const f = { dx: forward.dx / len, dy: forward.dy / len, dz: forward.dz / len };

    const right: Vector = {
      dx: f.dy * up.dz - f.dz * up.dy,
      dy: f.dz * up.dx - f.dx * up.dz,
      dz: f.dx * up.dy - f.dy * up.dx,
    };
    const rLen = Math.sqrt(right.dx ** 2 + right.dy ** 2 + right.dz ** 2);
    const r = { dx: right.dx / rLen, dy: right.dy / rLen, dz: right.dz / rLen };

    const newUp: Vector = {
      dx: r.dy * f.dz - r.dz * f.dy,
      dy: r.dz * f.dx - r.dx * f.dz,
      dz: r.dx * f.dy - r.dy * f.dx,
    };

    const matrix: Matrix4x4 = {
      data: [
        [r.dx, r.dy, r.dz, -r.dx * eye.x - r.dy * eye.y - r.dz * eye.z],
        [newUp.dx, newUp.dy, newUp.dz, -newUp.dx * eye.x - newUp.dy * eye.y - newUp.dz * eye.z],
        [-f.dx, -f.dy, -f.dz, f.dx * eye.x + f.dy * eye.y + f.dz * eye.z],
        [0, 0, 0, 1],
      ],
    };
    const id = `lookat-${eye.x}-${eye.y}-${eye.z}`;
    this._matrices.set(id, matrix);
    this._history.push({ type: 'lookAt', eye, target, up, result: matrix });
    return matrix;
  }

  compose(matrices: Matrix4x4[]): Matrix4x4 {
    if (matrices.length === 0) return this.identity();

    let result = matrices[0];
    for (let i = 1; i < matrices.length; i++) {
      result = this.multiply(result, matrices[i]);
    }

    const id = `composed-${matrices.length}`;
    this._matrices.set(id, result);
    this._history.push({ type: 'compose', matrices, result });
    return result;
  }

  invert(matrix: Matrix4x4): Matrix4x4 {
    const m = matrix.data;
    const det = this.determinant(matrix);
    if (Math.abs(det) < 1e-10) return this.identity();

    const inv: number[][] = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    const sign = [1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, -1, -1, 1, -1, 1];

    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const minor: number[][] = [];
        for (let k = 0; k < 4; k++) {
          if (k === i) continue;
          const row: number[] = [];
          for (let l = 0; l < 4; l++) {
            if (l === j) continue;
            row.push(m[k][l]);
          }
          minor.push(row);
        }
        let minorDet = 0;
        for (let k = 0; k < 3; k++) {
          minorDet += minor[0][k] * (minor[1][(k + 1) % 3] * minor[2][(k + 2) % 3] - minor[1][(k + 2) % 3] * minor[2][(k + 1) % 3]);
        }
        inv[j][i] = sign[i * 4 + j] * minorDet / det;
      }
    }

    const result: Matrix4x4 = { data: inv };
    this._history.push({ type: 'invert', matrix, result });
    return result;
  }

  transpose(matrix: Matrix4x4): Matrix4x4 {
    const m = matrix.data;
    const result: Matrix4x4 = {
      data: [
        [m[0][0], m[1][0], m[2][0], m[3][0]],
        [m[0][1], m[1][1], m[2][1], m[3][1]],
        [m[0][2], m[1][2], m[2][2], m[3][2]],
        [m[0][3], m[1][3], m[2][3], m[3][3]],
      ],
    };
    this._history.push({ type: 'transpose', matrix, result });
    return result;
  }

  determinant(matrix: Matrix4x4): number {
    const m = matrix.data;
    let det = 0;
    for (let i = 0; i < 4; i++) {
      const sign = i % 2 === 0 ? 1 : -1;
      const minor: number[][] = [];
      for (let j = 1; j < 4; j++) {
        const row: number[] = [];
        for (let k = 0; k < 4; k++) {
          if (k === i) continue;
          row.push(m[j][k]);
        }
        minor.push(row);
      }
      let minorDet = 0;
      for (let j = 0; j < 3; j++) {
        minorDet += minor[0][j] * (minor[1][(j + 1) % 3] * minor[2][(j + 2) % 3] - minor[1][(j + 2) % 3] * minor[2][(j + 1) % 3]);
      }
      det += sign * m[0][i] * minorDet;
    }
    return det;
  }

  multiply(matrixA: Matrix4x4, matrixB: Matrix4x4): Matrix4x4 {
    const a = matrixA.data;
    const b = matrixB.data;
    const result: number[][] = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];

    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        for (let k = 0; k < 4; k++) {
          result[i][j] += a[i][k] * b[k][j];
        }
      }
    }

    const matrix: Matrix4x4 = { data: result };
    this._history.push({ type: 'multiply', matrixA, matrixB, result: matrix });
    return matrix;
  }

  toPacket(): DataPacket<{
    matrices: Map<string, Matrix4x4>;
    pipelines: Map<string, TransformPipeline>;
    operations: Map<string, MatrixOperation>;
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['orthogonal_projection', 'ProjectionMatrix'],
      priority: 1,
      phase: 'matrix_transform',
    };
    return {
      id: `matrix-${Date.now().toString(36)}`,
      payload: {
        matrices: this._matrices,
        pipelines: this._pipelines,
        operations: this._operations,
      },
      metadata,
    };
  }

  reset(): void {
    this._matrices = new Map();
    this._pipelines = new Map();
    this._operations = new Map();
    this._history = [];
  }
}
