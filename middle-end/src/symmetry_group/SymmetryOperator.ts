import { DataPacket, PacketMeta } from '../shared/types';
import { Point, Vector } from '../affine_geometry/AffineSpace';

export interface SymmetryElement {
  type: 'rotation' | 'reflection' | 'translation' | 'glide' | 'inversion';
  axis?: Vector;
  angle?: number;
  fixedPoints?: Point[];
}

export interface SymmetryOperation {
  element: SymmetryElement;
  order: number;
  composition: string[];
  conjugate: string;
}

export interface Orbit {
  points: Point[];
  stabilizer: string[];
  symmetryType: string;
}

export class SymmetryOperator {
  private _elements: Map<string, SymmetryElement> = new Map();
  private _operations: Map<string, SymmetryOperation> = new Map();
  private _orbits: Map<string, Orbit> = new Map();
  private _history: unknown[] = [];
  private _groupOrder = 1;

  rotate(point: Point, axis: Vector, angle: number): Point {
    const theta = angle * Math.PI / 180;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    const len = Math.sqrt(axis.dx ** 2 + axis.dy ** 2 + axis.dz ** 2);
    const ux = axis.dx / len;
    const uy = axis.dy / len;
    const uz = axis.dz / len;

    const x = point.x;
    const y = point.y;
    const z = point.z;

    const dot = ux * x + uy * y + uz * z;
    const rx = ux * dot * (1 - cos) + x * cos + (-uz * y + uy * z) * sin;
    const ry = uy * dot * (1 - cos) + y * cos + (uz * x - ux * z) * sin;
    const rz = uz * dot * (1 - cos) + z * cos + (-uy * x + ux * y) * sin;

    this._history.push({ type: 'rotate', point, axis, angle, result: { x: rx, y: ry, z: rz } });
    return { x: rx, y: ry, z: rz };
  }

  reflect(point: Point, plane: { normal: Vector; offset: number }): Point {
    const normal = plane.normal;
    const len = Math.sqrt(normal.dx ** 2 + normal.dy ** 2 + normal.dz ** 2);
    const nx = normal.dx / len;
    const ny = normal.dy / len;
    const nz = normal.dz / len;

    const dot = nx * point.x + ny * point.y + nz * point.z - plane.offset;
    const rx = point.x - 2 * dot * nx;
    const ry = point.y - 2 * dot * ny;
    const rz = point.z - 2 * dot * nz;

    this._history.push({ type: 'reflect', point, plane, result: { x: rx, y: ry, z: rz } });
    return { x: rx, y: ry, z: rz };
  }

  translate(point: Point, vector: Vector): Point {
    const result = {
      x: point.x + vector.dx,
      y: point.y + vector.dy,
      z: point.z + vector.dz,
    };
    this._history.push({ type: 'translate', point, vector, result });
    return result;
  }

  glideReflect(point: Point, line: { point: Point; direction: Vector }, vector: Vector): Point {
    const reflected = this.reflect(point, {
      normal: {
        dx: line.direction.dy,
        dy: -line.direction.dx,
        dz: 0,
      },
      offset: line.direction.dy * line.point.x - line.direction.dx * line.point.y,
    });
    const result = this.translate(reflected, vector);
    this._history.push({ type: 'glideReflect', point, line, vector, result });
    return result;
  }

  invert(point: Point, center: Point): Point {
    const result = {
      x: 2 * center.x - point.x,
      y: 2 * center.y - point.y,
      z: 2 * center.z - point.z,
    };
    this._history.push({ type: 'invert', point, center, result });
    return result;
  }

  compose(operationA: SymmetryOperation, operationB: SymmetryOperation): SymmetryOperation {
    const composition: string[] = [...operationA.composition, ...operationB.composition];
    const result: SymmetryOperation = {
      element: operationB.element,
      order: operationA.order * operationB.order,
      composition,
      conjugate: `${operationA.conjugate}∘${operationB.conjugate}`,
    };
    this._operations.set(result.conjugate, result);
    this._history.push({ type: 'compose', operationA, operationB, result });
    return result;
  }

  conjugate(operation: SymmetryOperation, by: SymmetryOperation): SymmetryOperation {
    const result: SymmetryOperation = {
      element: operation.element,
      order: operation.order,
      composition: [...by.composition, ...operation.composition, ...by.composition.reverse()],
      conjugate: `${by.conjugate}⁻¹∘${operation.conjugate}∘${by.conjugate}`,
    };
    this._operations.set(result.conjugate, result);
    this._history.push({ type: 'conjugate', operation, by, result });
    return result;
  }

  orbitOf(point: Point, group: SymmetryOperation[]): Orbit {
    const points: Point[] = [];
    const stabilizer: string[] = [];

    for (const op of group) {
      let transformed = point;
      for (const comp of op.composition) {
        if (comp.startsWith('rotate')) {
          transformed = this.rotate(transformed, { dx: 0, dy: 0, dz: 1 }, 90);
        } else if (comp.startsWith('reflect')) {
          transformed = this.reflect(transformed, { normal: { dx: 1, dy: 0, dz: 0 }, offset: 0 });
        }
      }
      points.push(transformed);

      const isStabilizer = Math.abs(transformed.x - point.x) < 1e-6 &&
        Math.abs(transformed.y - point.y) < 1e-6 &&
        Math.abs(transformed.z - point.z) < 1e-6;
      if (isStabilizer) {
        stabilizer.push(op.conjugate);
      }
    }

    const orbit: Orbit = { points, stabilizer, symmetryType: 'orbit' };
    const orbitId = `${point.x}-${point.y}-${point.z}`;
    this._orbits.set(orbitId, orbit);
    this._history.push({ type: 'orbitOf', point, group, result: orbit });
    return orbit;
  }

  stabilizerOf(point: Point, group: SymmetryOperation[]): string[] {
    const stabilizer: string[] = [];
    for (const op of group) {
      let transformed = point;
      for (const comp of op.composition) {
        if (comp.startsWith('rotate')) {
          transformed = this.rotate(transformed, { dx: 0, dy: 0, dz: 1 }, 90);
        }
      }
      const isStabilizer = Math.abs(transformed.x - point.x) < 1e-6 &&
        Math.abs(transformed.y - point.y) < 1e-6 &&
        Math.abs(transformed.z - point.z) < 1e-6;
      if (isStabilizer) {
        stabilizer.push(op.conjugate);
      }
    }
    this._history.push({ type: 'stabilizerOf', point, group, result: stabilizer });
    return stabilizer;
  }

  get getGroupOrder(): number {
    return this._groupOrder;
  }

  toPacket(): DataPacket<{
    elements: Map<string, SymmetryElement>;
    operations: Map<string, SymmetryOperation>;
    orbits: Map<string, Orbit>;
    groupOrder: number;
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['symmetry_group', 'SymmetryOperator'],
      priority: 1,
      phase: 'symmetry_analysis',
    };
    return {
      id: `sym-op-${Date.now().toString(36)}`,
      payload: {
        elements: this._elements,
        operations: this._operations,
        orbits: this._orbits,
        groupOrder: this._groupOrder,
      },
      metadata,
    };
  }

  reset(): void {
    this._elements = new Map();
    this._operations = new Map();
    this._orbits = new Map();
    this._history = [];
    this._groupOrder = 1;
  }
}
