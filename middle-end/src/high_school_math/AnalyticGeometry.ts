import { DataPacket, PacketMeta } from '../shared/types';

/** Type of conic section. */
export type ConicType = 'ellipse' | 'hyperbola' | 'parabola';

/** Direction in which a parabola opens. */
export type ParabolaDirection = 'up' | 'down' | 'left' | 'right';

/** A point in 2D space. */
export interface Point {
  x: number;
  y: number;
}

/** A polar coordinate. */
export interface PolarPoint {
  r: number;
  theta: number;
}

/** Parametric curve specification. */
export interface ParametricCurve {
  xFunction: string;
  yFunction: string;
  parameterRange: [number, number];
}

/** A conic section representation. */
export interface ConicSection {
  type: ConicType;
  equation: string;
  centerX: number;
  centerY: number;
  a: number;
  b: number;
  foci: Point[];
  vertices: Point[];
  asymptotes: string[];
  eccentricity: number;
  direction?: ParabolaDirection;
}

export class AnalyticGeometry {
  private _conics: Map<string, ConicSection> = new Map();
  private _polarPoints: PolarPoint[] = [];
  private _parametricCurves: ParametricCurve[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  ellipseStandard(h: number, k: number, a: number, b: number): ConicSection {
    const c = Math.sqrt(Math.abs(a * a - b * b));
    const foci: Point[] = a >= b
      ? [{ x: h + c, y: k }, { x: h - c, y: k }]
      : [{ x: h, y: k + c }, { x: h, y: k - c }];
    const vertices: Point[] = [
      { x: h + a, y: k },
      { x: h - a, y: k },
      { x: h, y: k + b },
      { x: h, y: k - b },
    ];
    const conic: ConicSection = {
      type: 'ellipse',
      equation: `((x-${h})^2/${a * a}) + ((y-${k})^2/${b * b}) = 1`,
      centerX: h,
      centerY: k,
      a,
      b,
      foci,
      vertices,
      asymptotes: [],
      eccentricity: c / Math.max(a, b),
    };
    const id = `ellipse-${++this._counter}`;
    this._conics.set(id, conic);
    this._history.push({ op: 'ellipseStandard', conic });
    return conic;
  }

  hyperbolaStandard(h: number, k: number, a: number, b: number): ConicSection {
    const c = Math.sqrt(a * a + b * b);
    const horizontal = true;
    const foci: Point[] = [
      { x: h + c, y: k },
      { x: h - c, y: k },
    ];
    const vertices: Point[] = [
      { x: h + a, y: k },
      { x: h - a, y: k },
    ];
    const slope = b / a;
    const asymptotes = horizontal
      ? [`y - ${k} = ±${slope}(x - ${h})`]
      : [`y - ${k} = ±${1 / slope}(x - ${h})`];
    const conic: ConicSection = {
      type: 'hyperbola',
      equation: `((x-${h})^2/${a * a}) - ((y-${k})^2/${b * b}) = 1`,
      centerX: h,
      centerY: k,
      a,
      b,
      foci,
      vertices,
      asymptotes,
      eccentricity: c / a,
    };
    const id = `hyperbola-${++this._counter}`;
    this._conics.set(id, conic);
    this._history.push({ op: 'hyperbolaStandard', conic });
    return conic;
  }

  parabolaStandard(h: number, k: number, a: number, direction: ParabolaDirection): ConicSection {
    const focus: Point = direction === 'up' || direction === 'down'
      ? { x: h, y: k + 1 / (4 * a) }
      : { x: h + 1 / (4 * a), y: k };
    const vertex: Point = { x: h, y: k };
    const directrix = direction === 'up' || direction === 'down'
      ? `y = ${k - 1 / (4 * a)}`
      : `x = ${h - 1 / (4 * a)}`;
    let equation: string;
    if (direction === 'up' || direction === 'down') {
      equation = `(x - ${h})^2 = ${4 * a}(y - ${k})`;
    } else {
      equation = `(y - ${k})^2 = ${4 * a}(x - ${h})`;
    }
    const conic: ConicSection = {
      type: 'parabola',
      equation,
      centerX: h,
      centerY: k,
      a,
      b: 0,
      foci: [focus],
      vertices: [vertex],
      asymptotes: [directrix],
      eccentricity: 1,
      direction,
    };
    const id = `parabola-${++this._counter}`;
    this._conics.set(id, conic);
    this._history.push({ op: 'parabolaStandard', conic });
    return conic;
  }

  identifyConic(equation: string): ConicSection {
    // Form: Ax^2 + Bxy + Cy^2 + Dx + Ey + F = 0
    const A = this._extractCoef(equation, 'x^2');
    const B = this._extractCoef(equation, 'xy');
    const C = this._extractCoef(equation, 'y^2');
    const disc = B * B - 4 * A * C;
    let type: ConicType;
    if (Math.abs(disc) < 1e-9) type = 'parabola';
    else if (disc > 0) type = 'hyperbola';
    else type = 'ellipse';
    const conic: ConicSection = {
      type,
      equation,
      centerX: 0,
      centerY: 0,
      a: A,
      b: C,
      foci: [],
      vertices: [],
      asymptotes: [],
      eccentricity: 0,
    };
    const id = `conic-${++this._counter}`;
    this._conics.set(id, conic);
    this._history.push({ op: 'identifyConic', conic });
    return conic;
  }

  findFoci(conic: ConicSection): Point[] {
    if (conic.foci.length) return conic.foci;
    if (conic.type === 'ellipse') {
      const c = Math.sqrt(Math.abs(conic.a * conic.a - conic.b * conic.b));
      return [{ x: conic.centerX + c, y: conic.centerY }, { x: conic.centerX - c, y: conic.centerY }];
    }
    if (conic.type === 'hyperbola') {
      const c = Math.sqrt(conic.a * conic.a + conic.b * conic.b);
      return [{ x: conic.centerX + c, y: conic.centerY }, { x: conic.centerX - c, y: conic.centerY }];
    }
    return [];
  }

  findVertices(conic: ConicSection): Point[] {
    if (conic.vertices.length) return conic.vertices;
    if (conic.type === 'ellipse') {
      return [
        { x: conic.centerX + conic.a, y: conic.centerY },
        { x: conic.centerX - conic.a, y: conic.centerY },
        { x: conic.centerX, y: conic.centerY + conic.b },
        { x: conic.centerX, y: conic.centerY - conic.b },
      ];
    }
    if (conic.type === 'hyperbola') {
      return [
        { x: conic.centerX + conic.a, y: conic.centerY },
        { x: conic.centerX - conic.a, y: conic.centerY },
      ];
    }
    return [{ x: conic.centerX, y: conic.centerY }];
  }

  findAsymptotes(conic: ConicSection): string[] {
    if (conic.asymptotes.length) return conic.asymptotes;
    if (conic.type !== 'hyperbola') return [];
    const slope = conic.b / conic.a;
    return [
      `y - ${conic.centerY} = ${slope}(x - ${conic.centerX})`,
      `y - ${conic.centerY} = ${-slope}(x - ${conic.centerX})`,
    ];
  }

  findDirectrix(conic: ConicSection): string {
    if (conic.type !== 'parabola') return 'no directrix for non-parabolic conic';
    const a = conic.a;
    if (conic.direction === 'up' || conic.direction === 'down') {
      return `y = ${conic.centerY - 1 / (4 * a)}`;
    }
    return `x = ${conic.centerX - 1 / (4 * a)}`;
  }

  eccentricity(conic: ConicSection): number {
    if (conic.eccentricity > 0) return conic.eccentricity;
    if (conic.type === 'ellipse') {
      const c = Math.sqrt(Math.abs(conic.a * conic.a - conic.b * conic.b));
      return c / Math.max(conic.a, conic.b);
    }
    if (conic.type === 'hyperbola') {
      const c = Math.sqrt(conic.a * conic.a + conic.b * conic.b);
      return c / conic.a;
    }
    return 1;
  }

  toPolar(x: number, y: number): PolarPoint {
    const r = Math.hypot(x, y);
    const theta = Math.atan2(y, x);
    const point: PolarPoint = { r, theta };
    this._polarPoints.push(point);
    return point;
  }

  toCartesian(r: number, theta: number): Point {
    return { x: r * Math.cos(theta), y: r * Math.sin(theta) };
  }

  polarEquation(conic: ConicSection): string {
    const e = this.eccentricity(conic);
    const directrix = conic.type === 'parabola' ? 1 : Math.max(conic.a, conic.b);
    return `r = ${(e * directrix).toFixed(4)} / (1 ± ${e.toFixed(4)} cos θ)`;
  }

  parametricToCartesian(curve: ParametricCurve): string {
    return `y expressed in terms of x using parameter t; eliminate t from x=${curve.xFunction}, y=${curve.yFunction}`;
  }

  eliminateParameter(xFunc: string, yFunc: string): string {
    // Heuristic: if both are linear in t (e.g., x = t + h, y = mt + k), substitute
    const xm = xFunc.match(/=\s*t\s*([+-])\s*(\d*\.?\d+)/);
    const ym = yFunc.match(/=\s*(-?\d*\.?\d*)\s*\*\s*t\s*([+-])\s*(\d*\.?\d+)/);
    if (xm && ym) {
      const sign = xm[1] === '+' ? '-' : '+';
      const xOffset = xm[2];
      const slope = parseFloat(ym[1] || '1');
      const ySign = ym[2] === '+' ? '-' : '+';
      const yOffset = ym[3];
      return `y ${ySign} ${slope} * ${yOffset} = ${slope} * (x ${sign} ${xOffset})`;
    }
    return 'parameter elimination not supported for this form';
  }

  /** Compute the standard-form equation of an ellipse given two foci and a vertex. */
  ellipseFromFociVertex(f1: Point, f2: Point, vertex: Point): ConicSection {
    const h = (f1.x + f2.x) / 2;
    const k = (f1.y + f2.y) / 2;
    const c = Math.hypot(f1.x - f2.x, f1.y - f2.y) / 2;
    const a = Math.hypot(vertex.x - h, vertex.y - k);
    const b = Math.sqrt(Math.max(0, a * a - c * c));
    return this.ellipseStandard(h, k, a, b);
  }

  /** Verify whether a point lies on a conic section. */
  pointOnConic(conic: ConicSection, point: Point): boolean {
    if (conic.type === 'ellipse') {
      const v = ((point.x - conic.centerX) ** 2) / (conic.a * conic.a) +
        ((point.y - conic.centerY) ** 2) / (conic.b * conic.b);
      return Math.abs(v - 1) < 1e-6;
    }
    if (conic.type === 'hyperbola') {
      const v = ((point.x - conic.centerX) ** 2) / (conic.a * conic.a) -
        ((point.y - conic.centerY) ** 2) / (conic.b * conic.b);
      return Math.abs(v - 1) < 1e-6;
    }
    if (conic.type === 'parabola') {
      const dir = conic.direction;
      const a = conic.a;
      if (dir === 'up' || dir === 'down') {
        return Math.abs((point.x - conic.centerX) ** 2 - 4 * a * (point.y - conic.centerY)) < 1e-6;
      }
      return Math.abs((point.y - conic.centerY) ** 2 - 4 * a * (point.x - conic.centerX)) < 1e-6;
    }
    return false;
  }

  /** Compute the focal parameter p = b^2 / a for a conic. */
  focalParameter(conic: ConicSection): number {
    if (conic.type === 'parabola') return 2 * conic.a;
    if (conic.type === 'ellipse') return conic.b * conic.b / conic.a;
    if (conic.type === 'hyperbola') return conic.b * conic.b / conic.a;
    return 0;
  }

  /** Compute the semi-latus rectum length of a conic. */
  semiLatusRectum(conic: ConicSection): number {
    if (conic.type === 'parabola') return 2 * conic.a;
    return conic.b * conic.b / conic.a;
  }

  /** Convert a polar point to its degree form for display. */
  polarToDegrees(point: PolarPoint): { r: number; degrees: number } {
    return { r: point.r, degrees: point.theta * 180 / Math.PI };
  }

  private _extractCoef(expr: string, term: string): number {
    const m = expr.match(new RegExp(`([+-]?\\d*\\.?\\d+)\\s*\\*?\\s*${term.replace(/[()^]/g, '\\$&')}`));
    if (!m) return 0;
    const c = parseFloat(m[1]);
    return Number.isFinite(c) ? c : 1;
  }

  toPacket(): DataPacket<{
    conics: Map<string, ConicSection>;
    polarPoints: PolarPoint[];
    parametricCurves: ParametricCurve[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['high_school_math', 'AnalyticGeometry'],
      priority: 1,
      phase: 'analytic_geometry',
    };
    return {
      id: `analytic-${Date.now().toString(36)}`,
      payload: {
        conics: this._conics,
        polarPoints: this._polarPoints,
        parametricCurves: this._parametricCurves,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._conics = new Map();
    this._polarPoints = [];
    this._parametricCurves = [];
    this._history = [];
    this._counter = 0;
  }

  get conicCount(): number {
    return this._conics.size;
  }

  get polarPointCount(): number {
    return this._polarPoints.length;
  }

  get parametricCurveCount(): number {
    return this._parametricCurves.length;
  }
}
