import { DataPacket, PacketMeta } from '../shared/types';
import { Point, Vector } from '../affine_geometry/AffineSpace';
import { ProjectiveLine } from './ProjectivePlane';

export type ConicType = 'circle' | 'ellipse' | 'parabola' | 'hyperbola';

export interface Conic {
  type: ConicType;
  equation: number[];
  foci: Point[];
  eccentricity: number;
}

export interface TangentLine {
  line: ProjectiveLine;
  pointOfTangency: Point;
  conicId: string;
}

export interface PolePolar {
  pole: Point;
  polar: ProjectiveLine;
  conicId: string;
}

export class ConicSection {
  private _conics: Map<string, Conic> = new Map();
  private _tangents: Map<string, TangentLine> = new Map();
  private _polePolars: Map<string, PolePolar> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get conics(): Map<string, Conic> {
    return new Map(this._conics);
  }

  get tangents(): Map<string, TangentLine> {
    return new Map(this._tangents);
  }

  get polePolars(): Map<string, PolePolar> {
    return new Map(this._polePolars);
  }

  get history(): string[] {
    return [...this._history];
  }

  createConic(focusA: Point, focusB: Point, eccentricity: number): string {
    let type: ConicType;
    if (Math.abs(eccentricity) < 1e-9) {
      type = 'circle';
    } else if (eccentricity < 1) {
      type = 'ellipse';
    } else if (Math.abs(eccentricity - 1) < 1e-9) {
      type = 'parabola';
    } else {
      type = 'hyperbola';
    }

    const center: Point = {
      x: (focusA.x + focusB.x) / 2,
      y: (focusA.y + focusB.y) / 2,
      z: (focusA.z + focusB.z) / 2,
    };

    const distance = Math.sqrt(
      Math.pow(focusB.x - focusA.x, 2) +
      Math.pow(focusB.y - focusA.y, 2) +
      Math.pow(focusB.z - focusA.z, 2)
    );

    const equation = this._buildConicEquation(center, distance, eccentricity, type);

    const conic: Conic = {
      type,
      equation,
      foci: [{ ...focusA }, { ...focusB }],
      eccentricity,
    };

    const id = `conic-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    this._conics.set(id, conic);
    this._history.push(`Created ${type} conic ${id}`);
    return id;
  }

  tangentAt(conicId: string, point: Point): TangentLine {
    const conic = this._conics.get(conicId);
    if (!conic) {
      throw new Error('Conic not found');
    }

    const equation = conic.equation;
    const tangentEquation = this._calculateTangentEquation(equation, point);

    const tangentLine: TangentLine = {
      line: { equation: tangentEquation, ideal: false },
      pointOfTangency: { ...point },
      conicId,
    };

    const id = `tan-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    this._tangents.set(id, tangentLine);
    this._history.push(`Created tangent ${id} at point (${point.x}, ${point.y}, ${point.z})`);
    return tangentLine;
  }

  polarOf(conicId: string, point: Point): PolePolar {
    const conic = this._conics.get(conicId);
    if (!conic) {
      throw new Error('Conic not found');
    }

    const equation = conic.equation;
    const polarEquation = this._calculatePolarEquation(equation, point);

    const polePolar: PolePolar = {
      pole: { ...point },
      polar: { equation: polarEquation, ideal: false },
      conicId,
    };

    const id = `pp-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    this._polePolars.set(id, polePolar);
    this._history.push(`Created polar ${id} for point (${point.x}, ${point.y}, ${point.z})`);
    return polePolar;
  }

  poleOf(conicId: string, line: ProjectiveLine): PolePolar {
    const conic = this._conics.get(conicId);
    if (!conic) {
      throw new Error('Conic not found');
    }

    const equation = conic.equation;
    const pole = this._calculatePolePoint(equation, line.equation);

    const polePolar: PolePolar = {
      pole,
      polar: { ...line },
      conicId,
    };

    const id = `pp-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    this._polePolars.set(id, polePolar);
    this._history.push(`Created pole ${id} for line`);
    return polePolar;
  }

  intersect(conicA: Conic, conicB: Conic): Point[] {
    const points: Point[] = [];

    for (let x = -10; x <= 10; x += 0.1) {
      for (let y = -10; y <= 10; y += 0.1) {
        const valA = this._evaluateConic(conicA.equation, { x, y, z: 0 });
        const valB = this._evaluateConic(conicB.equation, { x, y, z: 0 });

        if (Math.abs(valA) < 0.01 && Math.abs(valB) < 0.01) {
          points.push({ x, y, z: 0 });
        }
      }
    }

    return points.slice(0, 4);
  }

  dualConic(conicId: string): Conic {
    const conic = this._conics.get(conicId);
    if (!conic) {
      throw new Error('Conic not found');
    }

    const dualEquation = this._calculateDualEquation(conic.equation);

    const dualConic: Conic = {
      type: conic.type,
      equation: dualEquation,
      foci: conic.foci.map(f => ({ ...f })),
      eccentricity: conic.eccentricity,
    };

    const id = `dual-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    this._conics.set(id, dualConic);
    this._history.push(`Created dual conic ${id}`);
    return dualConic;
  }

  degenerateConic(type: ConicType): Conic {
    let equation: number[];
    let foci: Point[];
    let eccentricity: number;

    switch (type) {
      case 'circle':
        equation = [1, 0, 0, 0, 1, 0, 0, 0, 0];
        foci = [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }];
        eccentricity = 0;
        break;
      case 'ellipse':
        equation = [1, 0, 0, 0, 0.5, 0, 0, 0, 0];
        foci = [{ x: -0.5, y: 0, z: 0 }, { x: 0.5, y: 0, z: 0 }];
        eccentricity = 0.5;
        break;
      case 'parabola':
        equation = [0, 0, 0, 0, 1, -1, 0, -1, 0];
        foci = [{ x: 0, y: 0.5, z: 0 }, { x: 0, y: 0.5, z: 0 }];
        eccentricity = 1;
        break;
      case 'hyperbola':
        equation = [1, 0, 0, 0, -1, 0, 0, 0, 0];
        foci = [{ x: -1.414, y: 0, z: 0 }, { x: 1.414, y: 0, z: 0 }];
        eccentricity = 1.414;
        break;
      default:
        equation = [1, 0, 0, 0, 1, 0, 0, 0, 0];
        foci = [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }];
        eccentricity = 0;
    }

    const conic: Conic = {
      type,
      equation,
      foci,
      eccentricity,
    };

    const id = `degen-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    this._conics.set(id, conic);
    this._history.push(`Created degenerate ${type} conic ${id}`);
    return conic;
  }

  eccentricityFromFoci(focusA: Point, focusB: Point, directrix: { point: Point; normal: Vector }): number {
    const distanceFoci = Math.sqrt(
      Math.pow(focusB.x - focusA.x, 2) +
      Math.pow(focusB.y - focusA.y, 2) +
      Math.pow(focusB.z - focusA.z, 2)
    );

    const center: Point = {
      x: (focusA.x + focusB.x) / 2,
      y: (focusA.y + focusB.y) / 2,
      z: (focusA.z + focusB.z) / 2,
    };

    const mag = Math.sqrt(directrix.normal.dx ** 2 + directrix.normal.dy ** 2 + directrix.normal.dz ** 2);
    const nd = {
      dx: directrix.normal.dx / mag,
      dy: directrix.normal.dy / mag,
      dz: directrix.normal.dz / mag,
    };

    const distanceDirectrix = Math.abs(
      nd.dx * (center.x - directrix.point.x) +
      nd.dy * (center.y - directrix.point.y) +
      nd.dz * (center.z - directrix.point.z)
    );

    return distanceFoci / (2 * distanceDirectrix);
  }

  getConic(id: string): Conic | null {
    return this._conics.get(id) || null;
  }

  toPacket(): DataPacket<{
    conics: Array<{ id: string; conic: Conic }>;
    tangents: Array<{ id: string; tangent: TangentLine }>;
    polePolars: Array<{ id: string; polePolar: PolePolar }>;
    history: string[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['conic-section'],
      priority: 1,
      phase: 'geometry',
    };

    return {
      id: `conic-${Date.now().toString(36)}`,
      payload: {
        conics: Array.from(this._conics.entries()).map(([id, c]) => ({ id, conic: c })),
        tangents: Array.from(this._tangents.entries()).map(([id, t]) => ({ id, tangent: t })),
        polePolars: Array.from(this._polePolars.entries()).map(([id, pp]) => ({ id, polePolar: pp })),
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._conics.clear();
    this._tangents.clear();
    this._polePolars.clear();
    this._history = [];
    this._counter = 0;
  }

  private _buildConicEquation(center: Point, distance: number, eccentricity: number, type: ConicType): number[] {
    const a = distance / (2 * eccentricity) || 1;
    const b = Math.sqrt(Math.abs(a * a * (1 - eccentricity * eccentricity)));

    switch (type) {
      case 'circle':
        return [1, 0, 0, -center.x, 1, 0, -center.y, 0, center.x * center.x + center.y * center.y - b * b];
      case 'ellipse':
        return [1 / (a * a), 0, 0, -center.x / (a * a), 1 / (b * b), 0, -center.y / (b * b), 0, center.x * center.x / (a * a) + center.y * center.y / (b * b) - 1];
      case 'parabola':
        return [1, 0, 0, 0, 0, -0.5, 0, -center.y, center.y * center.y / 4];
      case 'hyperbola':
        return [1 / (a * a), 0, 0, -center.x / (a * a), -1 / (b * b), 0, -center.y / (b * b), 0, -center.x * center.x / (a * a) + center.y * center.y / (b * b) + 1];
      default:
        return [1, 0, 0, 0, 1, 0, 0, 0, -1];
    }
  }

  private _calculateTangentEquation(equation: number[], point: Point): number[] {
    const [A, B, C, D, E, F, G, H, I] = equation;
    return [
      A * point.x + B * point.y + D,
      B * point.x + E * point.y + F,
      D * point.x + F * point.y + I,
    ];
  }

  private _calculatePolarEquation(equation: number[], point: Point): number[] {
    return this._calculateTangentEquation(equation, point);
  }

  private _calculatePolePoint(equation: number[], lineEquation: number[]): Point {
    const [A, B, C, D, E, F, G, H, I] = equation;
    const [a, b, c] = lineEquation;

    const det = A * E - B * B;
    if (det === 0) return { x: 0, y: 0, z: 0 };

    return {
      x: (E * a - B * b) / det,
      y: (-B * a + A * b) / det,
      z: 0,
    };
  }

  private _evaluateConic(equation: number[], point: Point): number {
    const [A, B, C, D, E, F, G, H, I] = equation;
    return (
      A * point.x * point.x +
      B * point.x * point.y +
      C * point.x * point.z +
      D * point.y * point.x +
      E * point.y * point.y +
      F * point.y * point.z +
      G * point.z * point.x +
      H * point.z * point.y +
      I * point.z * point.z
    );
  }

  private _calculateDualEquation(equation: number[]): number[] {
    const [A, B, C, D, E, F, G, H, I] = equation;

    const det = A * E * I + B * F * G + C * D * H - C * E * G - B * D * I - A * F * H;
    if (det === 0) return equation;

    return [
      (E * I - F * F) / det,
      (F * G - B * I) / det,
      (B * F - E * G) / det,
      (F * G - B * I) / det,
      (A * I - G * G) / det,
      (B * G - A * F) / det,
      (B * F - E * G) / det,
      (B * G - A * F) / det,
      (A * E - B * B) / det,
    ];
  }
}