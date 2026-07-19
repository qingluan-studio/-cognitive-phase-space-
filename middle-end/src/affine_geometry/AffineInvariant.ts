import { DataPacket, PacketMeta } from '../shared/types';
import { Point, Vector, AffineTransformation } from './AffineSpace';

export type InvariantType = 'ratio' | 'collinearity' | 'parallelism' | 'barycenter';

export interface Invariant {
  name: string;
  type: InvariantType;
  value: number;
  preserved: boolean;
}

export interface AffineProperty {
  name: string;
  description: string;
  preservedUnder: string[];
  notPreservedUnder: string[];
}

export class AffineInvariant {
  private _invariants: Map<string, Invariant> = new Map();
  private _properties: Map<string, AffineProperty> = new Map();
  private _history: string[] = [];
  private _preservationMatrix: Record<string, Record<string, boolean>> = {};
  private _counter = 0;

  constructor() {
    this._initPreservationMatrix();
    this._initProperties();
  }

  get invariants(): Map<string, Invariant> {
    return new Map(this._invariants);
  }

  get properties(): Map<string, AffineProperty> {
    return new Map(this._properties);
  }

  get history(): string[] {
    return [...this._history];
  }

  detectInvariant(geometry: Point[] | Vector[], transformation: AffineTransformation): Invariant {
    const beforeValue = this._calculateGeometryValue(geometry);
    const transformed = this._applyTransformation(geometry, transformation);
    const afterValue = this._calculateGeometryValue(transformed);
    const preserved = Math.abs(beforeValue - afterValue) < 1e-9;

    const invariant: Invariant = {
      name: `invariant-${this._counter}`,
      type: this._classifyInvariant(geometry),
      value: beforeValue,
      preserved,
    };

    const id = `inv-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    this._invariants.set(id, invariant);
    this._history.push(`Detected invariant ${id}: ${invariant.name} = ${invariant.value}, preserved=${preserved}`);
    return invariant;
  }

  checkCollinearity(points: Point[]): boolean {
    if (points.length < 3) return true;

    const v1: Vector = {
      dx: points[1].x - points[0].x,
      dy: points[1].y - points[0].y,
      dz: points[1].z - points[0].z,
    };

    for (let i = 2; i < points.length; i++) {
      const vi: Vector = {
        dx: points[i].x - points[0].x,
        dy: points[i].y - points[0].y,
        dz: points[i].z - points[0].z,
      };

      const crossProduct: Vector = {
        dx: v1.dy * vi.dz - v1.dz * vi.dy,
        dy: v1.dz * vi.dx - v1.dx * vi.dz,
        dz: v1.dx * vi.dy - v1.dy * vi.dx,
      };

      if (crossProduct.dx !== 0 || crossProduct.dy !== 0 || crossProduct.dz !== 0) {
        return false;
      }
    }

    return true;
  }

  checkParallelism(lines: Vector[][]): boolean {
    if (lines.length < 2) return true;

    const firstLine = lines[0];
    const direction1: Vector = {
      dx: firstLine[1].dx - firstLine[0].dx,
      dy: firstLine[1].dy - firstLine[0].dy,
      dz: firstLine[1].dz - firstLine[0].dz,
    };

    const mag1 = Math.sqrt(direction1.dx ** 2 + direction1.dy ** 2 + direction1.dz ** 2);
    if (mag1 === 0) return false;

    for (let i = 1; i < lines.length; i++) {
      const directionI: Vector = {
        dx: lines[i][1].dx - lines[i][0].dx,
        dy: lines[i][1].dy - lines[i][0].dy,
        dz: lines[i][1].dz - lines[i][0].dz,
      };

      const magI = Math.sqrt(directionI.dx ** 2 + directionI.dy ** 2 + directionI.dz ** 2);
      if (magI === 0) return false;

      const normalized1 = {
        dx: direction1.dx / mag1,
        dy: direction1.dy / mag1,
        dz: direction1.dz / mag1,
      };
      const normalizedI = {
        dx: directionI.dx / magI,
        dy: directionI.dy / magI,
        dz: directionI.dz / magI,
      };

      const dot = normalized1.dx * normalizedI.dx + normalized1.dy * normalizedI.dy + normalized1.dz * normalizedI.dz;
      if (Math.abs(Math.abs(dot) - 1) > 1e-9) {
        return false;
      }
    }

    return true;
  }

  barycenterRatio(points: Point[]): number[] {
    if (points.length === 0) return [];

    const centroid: Point = {
      x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
      y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
      z: points.reduce((sum, p) => sum + p.z, 0) / points.length,
    };

    return points.map(point => {
      const dist = Math.sqrt(
        Math.pow(point.x - centroid.x, 2) +
        Math.pow(point.y - centroid.y, 2) +
        Math.pow(point.z - centroid.z, 2)
      );
      return dist;
    });
  }

  affineRatio(pointA: Point, pointB: Point, pointC: Point): number {
    const denominator = pointB.x - pointA.x || pointB.y - pointA.y || pointB.z - pointA.z;
    if (denominator === 0) return 0;

    const numerator = pointC.x - pointA.x || pointC.y - pointA.y || pointC.z - pointA.z;
    return numerator / denominator;
  }

  preservationCheck(transformations: AffineTransformation[]): Record<string, boolean> {
    const result: Record<string, boolean> = {};

    transformations.forEach(transform => {
      Object.keys(this._preservationMatrix).forEach(invariantType => {
        const preserved = this._preservationMatrix[invariantType][transform.type];
        result[`${invariantType}-${transform.type}`] = preserved;
      });
    });

    return result;
  }

  getPreservedInvariants(transformType: string): string[] {
    const preserved: string[] = [];

    Object.keys(this._preservationMatrix).forEach(invariantType => {
      if (this._preservationMatrix[invariantType][transformType]) {
        preserved.push(invariantType);
      }
    });

    return preserved;
  }

  toPacket(): DataPacket<{
    invariants: Array<{ id: string; invariant: Invariant }>;
    properties: Array<{ id: string; property: AffineProperty }>;
    preservationMatrix: Record<string, Record<string, boolean>>;
    history: string[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['affine-invariant'],
      priority: 1,
      phase: 'geometry',
    };

    return {
      id: `affine-inv-${Date.now().toString(36)}`,
      payload: {
        invariants: Array.from(this._invariants.entries()).map(([id, i]) => ({ id, invariant: i })),
        properties: Array.from(this._properties.entries()).map(([id, p]) => ({ id, property: p })),
        preservationMatrix: { ...this._preservationMatrix },
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._invariants.clear();
    this._properties.clear();
    this._history = [];
    this._counter = 0;
  }

  private _initPreservationMatrix(): void {
    this._preservationMatrix = {
      ratio: {
        translation: true,
        rotation: true,
        scaling: false,
        shear: true,
        reflection: true,
      },
      collinearity: {
        translation: true,
        rotation: true,
        scaling: true,
        shear: true,
        reflection: true,
      },
      parallelism: {
        translation: true,
        rotation: true,
        scaling: true,
        shear: true,
        reflection: true,
      },
      barycenter: {
        translation: false,
        rotation: true,
        scaling: false,
        shear: true,
        reflection: true,
      },
    };
  }

  private _initProperties(): void {
    const properties: AffineProperty[] = [
      {
        name: 'Parallelism',
        description: 'Lines remain parallel after transformation',
        preservedUnder: ['translation', 'rotation', 'scaling', 'shear', 'reflection'],
        notPreservedUnder: [],
      },
      {
        name: 'Collinearity',
        description: 'Points remain collinear after transformation',
        preservedUnder: ['translation', 'rotation', 'scaling', 'shear', 'reflection'],
        notPreservedUnder: [],
      },
      {
        name: 'Ratio of Lengths',
        description: 'Ratio of lengths along a line is preserved',
        preservedUnder: ['translation', 'rotation', 'shear', 'reflection'],
        notPreservedUnder: ['scaling'],
      },
      {
        name: 'Barycenter',
        description: 'Centroid of a set of points',
        preservedUnder: ['rotation', 'shear', 'reflection'],
        notPreservedUnder: ['translation', 'scaling'],
      },
      {
        name: 'Area Ratio',
        description: 'Ratio of areas is preserved',
        preservedUnder: ['translation', 'rotation', 'shear', 'reflection'],
        notPreservedUnder: ['scaling'],
      },
    ];

    properties.forEach((prop, index) => {
      this._properties.set(`prop-${index.toString(36)}`, prop);
    });
  }

  private _calculateGeometryValue(geometry: Point[] | Vector[]): number {
    if (geometry.length === 0) return 0;

    if ('x' in geometry[0]) {
      const points = geometry as Point[];
      if (points.length === 3) {
        return this.affineRatio(points[0], points[1], points[2]);
      }
      const ratios = this.barycenterRatio(points);
      return ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
    }

    const vectors = geometry as Vector[];
    if (vectors.length === 2) {
      const dot = vectors[0].dx * vectors[1].dx + vectors[0].dy * vectors[1].dy + vectors[0].dz * vectors[1].dz;
      const mag1 = Math.sqrt(vectors[0].dx ** 2 + vectors[0].dy ** 2 + vectors[0].dz ** 2);
      const mag2 = Math.sqrt(vectors[1].dx ** 2 + vectors[1].dy ** 2 + vectors[1].dz ** 2);
      return mag1 === 0 || mag2 === 0 ? 0 : dot / (mag1 * mag2);
    }

    return 0;
  }

  private _classifyInvariant(geometry: Point[] | Vector[]): InvariantType {
    if (geometry.length === 0) return 'ratio';

    if ('x' in geometry[0]) {
      const points = geometry as Point[];
      if (points.length === 3) return 'ratio';
      if (points.length >= 3 && this.checkCollinearity(points)) return 'collinearity';
      return 'barycenter';
    }

    return 'parallelism';
  }

  private _applyTransformation(geometry: Point[] | Vector[], transform: AffineTransformation): Point[] | Vector[] {
    const matrix = transform.matrix;

    if ('x' in geometry[0]) {
      return (geometry as Point[]).map(point => {
        const x = matrix[0][0] * point.x + (matrix[0][1] || 0) * point.y + (matrix[0][2] || 0) * point.z + (matrix[0][3] || 0);
        const y = matrix[1][0] * point.x + (matrix[1][1] || 1) * point.y + (matrix[1][2] || 0) * point.z + (matrix[1][3] || 0);
        const z = matrix[2][0] * point.x + (matrix[2][1] || 0) * point.y + (matrix[2][2] || 1) * point.z + (matrix[2][3] || 0);
        return { x, y, z };
      });
    }

    return (geometry as Vector[]).map(vector => {
      const dx = matrix[0][0] * vector.dx + (matrix[0][1] || 0) * vector.dy + (matrix[0][2] || 0) * vector.dz;
      const dy = matrix[1][0] * vector.dx + (matrix[1][1] || 1) * vector.dy + (matrix[1][2] || 0) * vector.dz;
      const dz = matrix[2][0] * vector.dx + (matrix[2][1] || 0) * vector.dy + (matrix[2][2] || 1) * vector.dz;
      return { dx, dy, dz };
    });
  }
}