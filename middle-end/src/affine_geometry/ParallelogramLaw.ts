import { DataPacket, PacketMeta } from '../shared/types';
import { Point, Vector } from './AffineSpace';

export interface Parallelogram {
  vertices: Point[];
  center: Point;
  area: number;
  orientation: number;
}

export interface VectorSum {
  vectorA: Vector;
  vectorB: Vector;
  resultant: Vector;
  parallelogram: Parallelogram;
}

export interface ForceDiagram {
  forces: Vector[];
  equilibrium: boolean;
  resultant: Vector;
}

export class ParallelogramLaw {
  private _parallelograms: Map<string, Parallelogram> = new Map();
  private _vectorSums: Map<string, VectorSum> = new Map();
  private _forceDiagrams: Map<string, ForceDiagram> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get parallelograms(): Map<string, Parallelogram> {
    return new Map(this._parallelograms);
  }

  get vectorSums(): Map<string, VectorSum> {
    return new Map(this._vectorSums);
  }

  get forceDiagrams(): Map<string, ForceDiagram> {
    return new Map(this._forceDiagrams);
  }

  get history(): string[] {
    return [...this._history];
  }

  construct(vertexA: Point, vertexB: Point, vertexC: Point): string {
    const vertexD: Point = {
      x: vertexA.x + vertexC.x - vertexB.x,
      y: vertexA.y + vertexC.y - vertexB.y,
      z: vertexA.z + vertexC.z - vertexB.z,
    };

    const vertices = [vertexA, vertexB, vertexC, vertexD];
    const center = this.midpoint(vertexA, vertexC);
    const area = this.areaCalculate({ vertices, center, area: 0, orientation: 0 });
    const orientation = this._calculateOrientation(vertices);

    const parallelogram: Parallelogram = {
      vertices: vertices.map(v => ({ ...v })),
      center: { ...center },
      area,
      orientation,
    };

    const id = `para-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    this._parallelograms.set(id, parallelogram);
    this._history.push(`Constructed parallelogram ${id}`);
    return id;
  }

  vectorAdd(vectorA: Vector, vectorB: Vector): VectorSum {
    const resultant: Vector = {
      dx: vectorA.dx + vectorB.dx,
      dy: vectorA.dy + vectorB.dy,
      dz: vectorA.dz + vectorB.dz,
    };

    const vertexA: Point = { x: 0, y: 0, z: 0 };
    const vertexB: Point = { x: vectorA.dx, y: vectorA.dy, z: vectorA.dz };
    const vertexC: Point = { x: vectorB.dx, y: vectorB.dy, z: vectorB.dz };
    const vertexD: Point = { x: resultant.dx, y: resultant.dy, z: resultant.dz };

    const center: Point = { x: resultant.dx / 2, y: resultant.dy / 2, z: resultant.dz / 2 };
    const area = this.areaCalculate({
      vertices: [vertexA, vertexB, vertexD, vertexC],
      center,
      area: 0,
      orientation: 0,
    });

    const parallelogram: Parallelogram = {
      vertices: [vertexA, vertexB, vertexD, vertexC].map(v => ({ ...v })),
      center: { ...center },
      area,
      orientation: this._calculateOrientation([vertexA, vertexB, vertexD, vertexC]),
    };

    const vectorSum: VectorSum = {
      vectorA: { ...vectorA },
      vectorB: { ...vectorB },
      resultant: { ...resultant },
      parallelogram,
    };

    const id = `sum-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    this._vectorSums.set(id, vectorSum);
    this._history.push(`Vector addition ${id}`);
    return vectorSum;
  }

  vectorSubtract(vectorA: Vector, vectorB: Vector): VectorSum {
    const negatedB: Vector = {
      dx: -vectorB.dx,
      dy: -vectorB.dy,
      dz: -vectorB.dz,
    };
    return this.vectorAdd(vectorA, negatedB);
  }

  resolveForce(force: Vector, angle: number): { normal: Vector; tangential: Vector } {
    const magnitude = Math.sqrt(force.dx ** 2 + force.dy ** 2 + force.dz ** 2);
    const normal: Vector = {
      dx: magnitude * Math.cos(angle),
      dy: magnitude * Math.sin(angle),
      dz: force.dz,
    };
    const tangential: Vector = {
      dx: magnitude * Math.sin(angle),
      dy: -magnitude * Math.cos(angle),
      dz: 0,
    };
    return { normal, tangential };
  }

  equilibriumCheck(forces: Vector[]): boolean {
    const resultant = this.getResultant(forces);
    const magnitude = Math.sqrt(resultant.dx ** 2 + resultant.dy ** 2 + resultant.dz ** 2);
    return magnitude < 1e-9;
  }

  getResultant(forces: Vector[]): Vector {
    return forces.reduce((acc, f) => ({
      dx: acc.dx + f.dx,
      dy: acc.dy + f.dy,
      dz: acc.dz + f.dz,
    }), { dx: 0, dy: 0, dz: 0 });
  }

  areaCalculate(parallelogram: Parallelogram): number {
    if (parallelogram.vertices.length < 4) return 0;

    const v1: Vector = {
      dx: parallelogram.vertices[1].x - parallelogram.vertices[0].x,
      dy: parallelogram.vertices[1].y - parallelogram.vertices[0].y,
      dz: parallelogram.vertices[1].z - parallelogram.vertices[0].z,
    };
    const v2: Vector = {
      dx: parallelogram.vertices[2].x - parallelogram.vertices[0].x,
      dy: parallelogram.vertices[2].y - parallelogram.vertices[0].y,
      dz: parallelogram.vertices[2].z - parallelogram.vertices[0].z,
    };

    const crossProduct: Vector = {
      dx: v1.dy * v2.dz - v1.dz * v2.dy,
      dy: v1.dz * v2.dx - v1.dx * v2.dz,
      dz: v1.dx * v2.dy - v1.dy * v2.dx,
    };

    return Math.sqrt(crossProduct.dx ** 2 + crossProduct.dy ** 2 + crossProduct.dz ** 2);
  }

  midpoint(vertexA: Point, vertexB: Point): Point {
    return {
      x: (vertexA.x + vertexB.x) / 2,
      y: (vertexA.y + vertexB.y) / 2,
      z: (vertexA.z + vertexB.z) / 2,
    };
  }

  getParallelogram(id: string): Parallelogram | null {
    return this._parallelograms.get(id) || null;
  }

  toPacket(): DataPacket<{
    parallelograms: Array<{ id: string; parallelogram: Parallelogram }>;
    vectorSums: Array<{ id: string; vectorSum: VectorSum }>;
    forceDiagrams: Array<{ id: string; forceDiagram: ForceDiagram }>;
    history: string[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['parallelogram-law'],
      priority: 1,
      phase: 'geometry',
    };

    return {
      id: `para-law-${Date.now().toString(36)}`,
      payload: {
        parallelograms: Array.from(this._parallelograms.entries()).map(([id, p]) => ({ id, parallelogram: p })),
        vectorSums: Array.from(this._vectorSums.entries()).map(([id, v]) => ({ id, vectorSum: v })),
        forceDiagrams: Array.from(this._forceDiagrams.entries()).map(([id, f]) => ({ id, forceDiagram: f })),
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._parallelograms.clear();
    this._vectorSums.clear();
    this._forceDiagrams.clear();
    this._history = [];
    this._counter = 0;
  }

  private _calculateOrientation(vertices: Point[]): number {
    if (vertices.length < 3) return 0;

    const v1: Vector = {
      dx: vertices[1].x - vertices[0].x,
      dy: vertices[1].y - vertices[0].y,
      dz: vertices[1].z - vertices[0].z,
    };
    const v2: Vector = {
      dx: vertices[2].x - vertices[0].x,
      dy: vertices[2].y - vertices[0].y,
      dz: vertices[2].z - vertices[0].z,
    };

    const crossZ = v1.dx * v2.dy - v1.dy * v2.dx;
    return crossZ > 0 ? 1 : crossZ < 0 ? -1 : 0;
  }
}