import { DataPacket, PacketMeta } from '../shared/types';
import { Point } from '../affine_geometry/AffineSpace';

export interface HomogeneousPoint {
  coordinates: number[];
  atInfinity: boolean;
}

export interface ProjectiveLine {
  equation: number[];
  ideal: boolean;
}

export interface Incidence {
  point: HomogeneousPoint;
  line: ProjectiveLine;
  incident: boolean;
}

export class ProjectivePlane {
  private _points: Map<string, HomogeneousPoint> = new Map();
  private _lines: Map<string, ProjectiveLine> = new Map();
  private _incidences: Map<string, Incidence> = new Map();
  private _history: string[] = [];
  private _idealLine: ProjectiveLine;
  private _counter = 0;

  constructor() {
    this._idealLine = { equation: [0, 0, 1], ideal: true };
  }

  get points(): Map<string, HomogeneousPoint> {
    return new Map(this._points);
  }

  get lines(): Map<string, ProjectiveLine> {
    return new Map(this._lines);
  }

  get incidences(): Map<string, Incidence> {
    return new Map(this._incidences);
  }

  get history(): string[] {
    return [...this._history];
  }

  get idealLine(): ProjectiveLine {
    return { ...this._idealLine };
  }

  createPoint(coordinates: number[]): string {
    const normalized = this._normalize(coordinates);
    const atInfinity = normalized[normalized.length - 1] === 0;

    const point: HomogeneousPoint = {
      coordinates: normalized,
      atInfinity,
    };

    const id = `hp-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    this._points.set(id, point);
    this._history.push(`Created point ${id}`);
    return id;
  }

  createLine(points: HomogeneousPoint[]): string {
    if (points.length < 2) {
      throw new Error('Need at least 2 points to create a line');
    }

    const p1 = points[0].coordinates;
    const p2 = points[1].coordinates;

    const equation = this._crossProduct(p1, p2);
    const ideal = equation[equation.length - 1] === 0;

    const line: ProjectiveLine = {
      equation: this._normalize(equation),
      ideal,
    };

    const id = `pl-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    this._lines.set(id, line);
    this._history.push(`Created line ${id}`);
    return id;
  }

  incident(pointId: string, lineId: string): boolean {
    const point = this._points.get(pointId);
    const line = this._lines.get(lineId);

    if (!point || !line) {
      throw new Error('Point or line not found');
    }

    const dot = point.coordinates.reduce((sum, coord, i) => sum + coord * (line.equation[i] || 0), 0);
    const incident = Math.abs(dot) < 1e-9;

    const incidence: Incidence = {
      point: { ...point },
      line: { ...line },
      incident,
    };

    const id = `inc-${pointId}-${lineId}`;
    this._incidences.set(id, incidence);
    return incident;
  }

  meet(lineA: ProjectiveLine, lineB: ProjectiveLine): HomogeneousPoint {
    const coordinates = this._crossProduct(lineA.equation, lineB.equation);
    const normalized = this._normalize(coordinates);

    return {
      coordinates: normalized,
      atInfinity: normalized[normalized.length - 1] === 0,
    };
  }

  join(pointA: HomogeneousPoint, pointB: HomogeneousPoint): ProjectiveLine {
    const equation = this._crossProduct(pointA.coordinates, pointB.coordinates);
    const normalized = this._normalize(equation);

    return {
      equation: normalized,
      ideal: normalized[normalized.length - 1] === 0,
    };
  }

  crossRatio(pointA: HomogeneousPoint, pointB: HomogeneousPoint, pointC: HomogeneousPoint, pointD: HomogeneousPoint): number {
    const a = this._projectToLine(pointA, pointB, pointC);
    const b = this._projectToLine(pointB, pointA, pointC);
    const c = this._projectToLine(pointC, pointA, pointB);
    const d = this._projectToLine(pointD, pointA, pointB);

    if (b === 0 || c === 0 || d === 0) return 0;

    return (a / b) / (c / d);
  }

  harmonicConjugate(pointA: HomogeneousPoint, pointB: HomogeneousPoint, pointC: HomogeneousPoint): HomogeneousPoint {
    const crossRatioValue = 1;

    const aCoords = pointA.coordinates;
    const bCoords = pointB.coordinates;
    const cCoords = pointC.coordinates;

    const result: number[] = [];
    for (let i = 0; i < aCoords.length; i++) {
      result[i] = (crossRatioValue * bCoords[i] - aCoords[i]) / (crossRatioValue - 1) * cCoords[i] / aCoords[i] * aCoords[i];
    }

    const normalized = this._normalize(result);
    return {
      coordinates: normalized,
      atInfinity: normalized[normalized.length - 1] === 0,
    };
  }

  idealPoint(direction: number[]): HomogeneousPoint {
    const homogeneous = [...direction, 0];
    return {
      coordinates: this._normalize(homogeneous),
      atInfinity: true,
    };
  }

  realToHomogeneous(point: Point): HomogeneousPoint {
    return {
      coordinates: [point.x, point.y, point.z, 1],
      atInfinity: false,
    };
  }

  homogeneousToReal(homogeneous: HomogeneousPoint): Point | null {
    if (homogeneous.atInfinity) return null;

    const w = homogeneous.coordinates[homogeneous.coordinates.length - 1];
    if (w === 0) return null;

    return {
      x: homogeneous.coordinates[0] / w,
      y: homogeneous.coordinates[1] / w,
      z: homogeneous.coordinates[2] || 0,
    };
  }

  getPoint(id: string): HomogeneousPoint | null {
    return this._points.get(id) || null;
  }

  toPacket(): DataPacket<{
    points: Array<{ id: string; point: HomogeneousPoint }>;
    lines: Array<{ id: string; line: ProjectiveLine }>;
    incidences: Array<{ id: string; incidence: Incidence }>;
    idealLine: ProjectiveLine;
    history: string[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['projective-plane'],
      priority: 1,
      phase: 'geometry',
    };

    return {
      id: `proj-plane-${Date.now().toString(36)}`,
      payload: {
        points: Array.from(this._points.entries()).map(([id, p]) => ({ id, point: p })),
        lines: Array.from(this._lines.entries()).map(([id, l]) => ({ id, line: l })),
        incidences: Array.from(this._incidences.entries()).map(([id, i]) => ({ id, incidence: i })),
        idealLine: { ...this._idealLine },
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._points.clear();
    this._lines.clear();
    this._incidences.clear();
    this._history = [];
    this._counter = 0;
    this._idealLine = { equation: [0, 0, 1], ideal: true };
  }

  private _normalize(coordinates: number[]): number[] {
    const maxAbs = Math.max(...coordinates.map(c => Math.abs(c)));
    if (maxAbs === 0) return coordinates;
    return coordinates.map(c => c / maxAbs);
  }

  private _crossProduct(a: number[], b: number[]): number[] {
    const result: number[] = [];
    const n = a.length;

    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < n; j++) {
        for (let k = 0; k < n; k++) {
          if (j !== i && k !== i) {
            const sign = (j < k) === ((j - i + n) % n < (k - i + n) % n) ? 1 : -1;
            sum += sign * a[j] * b[k];
          }
        }
      }
      result.push(sum);
    }

    return result;
  }

  private _projectToLine(point: HomogeneousPoint, linePointA: HomogeneousPoint, linePointB: HomogeneousPoint): number {
    const a = linePointA.coordinates;
    const b = linePointB.coordinates;
    const p = point.coordinates;

    const crossAB = this._crossProduct(a, b);
    const crossAP = this._crossProduct(a, p);

    const magAB = Math.sqrt(crossAB.reduce((sum, c) => sum + c * c, 0));
    const magAP = Math.sqrt(crossAP.reduce((sum, c) => sum + c * c, 0));

    return magAB === 0 ? 0 : magAP / magAB;
  }
}