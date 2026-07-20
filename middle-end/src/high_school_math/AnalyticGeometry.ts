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

  ellipseArea(a: number, b: number): number {
    return Math.PI * a * b;
  }

  ellipsePerimeter(a: number, b: number): number {
    return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
  }

  ellipseEccentricity(a: number, b: number): number {
    const major = Math.max(a, b);
    const minor = Math.min(a, b);
    return Math.sqrt(1 - (minor * minor) / (major * major));
  }

  ellipseFociDistance(a: number, b: number): number {
    return 2 * Math.sqrt(Math.abs(a * a - b * b));
  }

  ellipseLatusRectum(a: number, b: number): number {
    return (2 * b * b) / a;
  }

  ellipseDirectrix(a: number, b: number): number {
    const e = this.ellipseEccentricity(a, b);
    return a / e;
  }

  hyperbolaEccentricity(a: number, b: number): number {
    return Math.sqrt(1 + (b * b) / (a * a));
  }

  hyperbolaFociDistance(a: number, b: number): number {
    return 2 * Math.sqrt(a * a + b * b);
  }

  hyperbolaLatusRectum(a: number, b: number): number {
    return (2 * b * b) / a;
  }

  hyperbolaDirectrix(a: number, b: number): number {
    const e = this.hyperbolaEccentricity(a, b);
    return a / e;
  }

  hyperbolaConjugate(a: number, b: number): ConicSection {
    return this.hyperbolaStandard(0, 0, b, a);
  }

  hyperbolaRectangular(a: number): ConicSection {
    return this.hyperbolaStandard(0, 0, a, a);
  }

  parabolaFocus(h: number, k: number, a: number, direction: ParabolaDirection): Point {
    switch (direction) {
      case 'up': return { x: h, y: k + 1 / (4 * a) };
      case 'down': return { x: h, y: k - 1 / (4 * a) };
      case 'right': return { x: h + 1 / (4 * a), y: k };
      case 'left': return { x: h - 1 / (4 * a), y: k };
    }
  }

  parabolaDirectrixEquation(h: number, k: number, a: number, direction: ParabolaDirection): string {
    switch (direction) {
      case 'up': return `y = ${k - 1 / (4 * a)}`;
      case 'down': return `y = ${k + 1 / (4 * a)}`;
      case 'right': return `x = ${h - 1 / (4 * a)}`;
      case 'left': return `x = ${h + 1 / (4 * a)}`;
    }
  }

  parabolaLatusRectum(a: number): number {
    return 1 / a;
  }

  parabolaVertex(h: number, k: number): Point {
    return { x: h, y: k };
  }

  parabolaFromFocusDirectrix(focus: Point, directrix: string): ConicSection {
    const dirMatch = directrix.match(/([xy])\s*=\s*(-?\d*\.?\d+)/);
    if (!dirMatch) return this.parabolaStandard(0, 0, 1, 'up');
    const axis = dirMatch[1];
    const dirVal = parseFloat(dirMatch[2]);
    if (axis === 'y') {
      const a = 1 / (4 * (focus.y - dirVal));
      const h = focus.x;
      const k = (focus.y + dirVal) / 2;
      return this.parabolaStandard(h, k, a, focus.y > dirVal ? 'up' : 'down');
    } else {
      const a = 1 / (4 * (focus.x - dirVal));
      const h = (focus.x + dirVal) / 2;
      const k = focus.y;
      return this.parabolaStandard(h, k, a, focus.x > dirVal ? 'right' : 'left');
    }
  }

  conicGeneralForm(conic: ConicSection): string {
    if (conic.type === 'ellipse') {
      const a = conic.a;
      const b = conic.b;
      const h = conic.centerX;
      const k = conic.centerY;
      return `${b * b}x² + ${a * a}y² - ${2 * b * b * h}x - ${2 * a * a * k}y + ${b * b * h * h + a * a * k * k - a * a * b * b} = 0`;
    }
    if (conic.type === 'hyperbola') {
      const a = conic.a;
      const b = conic.b;
      const h = conic.centerX;
      const k = conic.centerY;
      return `${b * b}x² - ${a * a}y² - ${2 * b * b * h}x + ${2 * a * a * k}y + ${b * b * h * h - a * a * k * k - a * a * b * b} = 0`;
    }
    if (conic.type === 'parabola') {
      const a = conic.a;
      const h = conic.centerX;
      const k = conic.centerY;
      const dir = conic.direction || 'up';
      if (dir === 'up' || dir === 'down') {
        return `x² - ${4 * a}y - ${2 * h}x + ${h * h + 4 * a * k} = 0`;
      } else {
        return `y² - ${4 * a}x - ${2 * k}y + ${k * k + 4 * a * h} = 0`;
      }
    }
    return '';
  }

  eccentricityOfConic(type: ConicType, a: number, b: number): number {
    if (type === 'ellipse') return this.ellipseEccentricity(a, b);
    if (type === 'hyperbola') return this.hyperbolaEccentricity(a, b);
    return 1;
  }

  classifyConicByEccentricity(e: number): ConicType {
    if (Math.abs(e) < 1e-9) return 'ellipse';
    if (Math.abs(e - 1) < 1e-9) return 'parabola';
    if (e < 1) return 'ellipse';
    return 'hyperbola';
  }

  polarEquationEllipse(a: number, e: number): string {
    const b = a * Math.sqrt(1 - e * e);
    return `r = ${b * b / a} / (1 - ${e} cos θ)`;
  }

  polarEquationHyperbola(a: number, e: number): string {
    const b = a * Math.sqrt(e * e - 1);
    return `r = ${b * b / a} / (1 - ${e} cos θ)`;
  }

  polarEquationParabola(p: number): string {
    return `r = ${p} / (1 - cos θ)`;
  }

  parametricEllipse(a: number, b: number, h: number = 0, k: number = 0): ParametricCurve {
    return {
      xFunction: `${h} + ${a} cos t`,
      yFunction: `${k} + ${b} sin t`,
      parameterRange: [0, 2 * Math.PI],
    };
  }

  parametricHyperbola(a: number, b: number, h: number = 0, k: number = 0): ParametricCurve {
    return {
      xFunction: `${h} + ${a} sec t`,
      yFunction: `${k} + ${b} tan t`,
      parameterRange: [-Math.PI / 2 + 0.01, Math.PI / 2 - 0.01],
    };
  }

  parametricParabola(a: number, h: number = 0, k: number = 0): ParametricCurve {
    return {
      xFunction: `${h} + ${2 * a} t`,
      yFunction: `${k} + ${2 * a} t * t`,
      parameterRange: [-5, 5],
    };
  }

  reflectionProperty(type: ConicType): string {
    switch (type) {
      case 'parabola':
        return 'Rays parallel to the axis reflect through the focus';
      case 'ellipse':
        return 'Rays from one focus reflect to the other focus';
      case 'hyperbola':
        return 'Rays directed toward one focus reflect to the other focus';
    }
  }

  conicApplications(type: ConicType): string[] {
    switch (type) {
      case 'parabola':
        return ['Reflectors (headlights, satellite dishes)', 'Suspension bridges', 'Projectile motion', 'Solar cookers'];
      case 'ellipse':
        return ['Planetary orbits', 'Whispering galleries', 'Medical lithotripsy', 'Architectural design'];
      case 'hyperbola':
        return ['Navigation (LORAN)', 'Telescopes', 'Cooling towers', 'Satellite tracking'];
    }
  }

  rotateConic(conic: ConicSection, angleDeg: number): ConicSection {
    const rad = angleDeg * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return {
      ...conic,
      centerX: conic.centerX * cos - conic.centerY * sin,
      centerY: conic.centerX * sin + conic.centerY * cos,
    };
  }

  translateConic(conic: ConicSection, dx: number, dy: number): ConicSection {
    return {
      ...conic,
      centerX: conic.centerX + dx,
      centerY: conic.centerY + dy,
      foci: conic.foci.map(f => ({ x: f.x + dx, y: f.y + dy })),
      vertices: conic.vertices.map(v => ({ x: v.x + dx, y: v.y + dy })),
    };
  }

  dilateConic(conic: ConicSection, scaleX: number, scaleY: number): ConicSection {
    return {
      ...conic,
      a: conic.a * scaleX,
      b: conic.b * scaleY,
      foci: conic.foci.map(f => ({ x: f.x * scaleX, y: f.y * scaleY })),
      vertices: conic.vertices.map(v => ({ x: v.x * scaleX, y: v.y * scaleY })),
    };
  }

  pointInsideEllipse(point: Point, ellipse: ConicSection): boolean {
    const val = ((point.x - ellipse.centerX) ** 2) / (ellipse.a * ellipse.a) +
      ((point.y - ellipse.centerY) ** 2) / (ellipse.b * ellipse.b);
    return val < 1;
  }

  pointInsideHyperbola(point: Point, hyperbola: ConicSection): boolean {
    const val = ((point.x - hyperbola.centerX) ** 2) / (hyperbola.a * hyperbola.a) -
      ((point.y - hyperbola.centerY) ** 2) / (hyperbola.b * hyperbola.b);
    return val > 1;
  }

  tangentsToConicFromPoint(conic: ConicSection, point: Point): string[] {
    const tangents: string[] = [];
    if (conic.type === 'parabola') {
      const a = conic.a;
      const h = conic.centerX;
      const k = conic.centerY;
      const x1 = point.x;
      const y1 = point.y;
      const yy1 = y1 - k;
      const xx1 = x1 - h;
      const discriminant = yy1 * yy1 - 4 * a * xx1;
      if (discriminant >= 0) {
        tangents.push(`y - ${y1} = m1(x - ${x1})`);
        tangents.push(`y - ${y1} = m2(x - ${x1})`);
      }
    }
    return tangents;
  }

  normalLineAtPoint(conic: ConicSection, point: Point): string {
    return `Normal line at (${point.x}, ${point.y})`;
  }

  chordOfContactEllipse(ellipse: ConicSection, point: Point): string {
    const h = ellipse.centerX;
    const k = ellipse.centerY;
    const a = ellipse.a;
    const b = ellipse.b;
    const x1 = point.x - h;
    const y1 = point.y - k;
    return `(${x1}x)/${a * a} + (${y1}y)/${b * b} = 1`;
  }

  polarOfPoint(conic: ConicSection, point: Point): string {
    return `Polar of (${point.x}, ${point.y}) with respect to the conic`;
  }

  poleOfLine(conic: ConicSection, line: string): Point {
    return { x: 0, y: 0 };
  }

  diameterOfConic(conic: ConicSection, slope: number): string {
    return `Diameter conjugate to lines with slope ${slope}`;
  }

  conjugateDiameters(conic: ConicSection, m1: number): number {
    if (conic.type === 'ellipse') {
      return -(conic.b * conic.b) / (conic.a * conic.a * m1);
    }
    if (conic.type === 'hyperbola') {
      return (conic.b * conic.b) / (conic.a * conic.a * m1);
    }
    return 0;
  }

  directorCircle(conic: ConicSection): { center: Point; radius: number } {
    if (conic.type === 'ellipse') {
      return {
        center: { x: conic.centerX, y: conic.centerY },
        radius: Math.sqrt(conic.a * conic.a + conic.b * conic.b),
      };
    }
    if (conic.type === 'hyperbola') {
      return {
        center: { x: conic.centerX, y: conic.centerY },
        radius: Math.sqrt(Math.abs(conic.a * conic.a - conic.b * conic.b)),
      };
    }
    return { center: { x: conic.centerX, y: conic.centerY }, radius: 0 };
  }

  rectangularHyperbolaEccentricity(): number {
    return Math.sqrt(2);
  }

  asymptotesAngle(a: number, b: number): number {
    return 2 * Math.atan(b / a) * 180 / Math.PI;
  }

  eccentricityAngle(e: number): number {
    return Math.acos(e) * 180 / Math.PI;
  }

  aphelionPerihelion(a: number, e: number): { aphelion: number; perihelion: number } {
    return {
      aphelion: a * (1 + e),
      perihelion: a * (1 - e),
    };
  }

  orbitalPeriod(a: number, GM: number): number {
    return 2 * Math.PI * Math.sqrt(a * a * a / GM);
  }

  keplerThirdLaw(T1: number, a1: number, T2: number, a2: number): boolean {
    const ratio1 = (T1 * T1) / (a1 * a1 * a1);
    const ratio2 = (T2 * T2) / (a2 * a2 * a2);
    return Math.abs(ratio1 - ratio2) < 1e-6;
  }

  parametricCurveLength(curve: ParametricCurve, t0: number, t1: number, n: number = 1000): number {
    const dt = (t1 - t0) / n;
    let length = 0;
    for (let i = 0; i < n; i++) {
      const t = t0 + i * dt;
      const dx = this._evalParam(curve.xFunction, t + dt) - this._evalParam(curve.xFunction, t);
      const dy = this._evalParam(curve.yFunction, t + dt) - this._evalParam(curve.yFunction, t);
      length += Math.hypot(dx, dy);
    }
    return length;
  }

  private _evalParam(func: string, t: number): number {
    try {
      const replaced = func
        .replace(/t/g, `(${t})`)
        .replace(/\bsin\b/g, 'Math.sin')
        .replace(/\bcos\b/g, 'Math.cos')
        .replace(/\btan\b/g, 'Math.tan')
        .replace(/\bsec\b/g, '(1/Math.cos)')
        .replace(/\^/g, '**');
      const fn = new Function(`return ${replaced};`);
      const result = Number(fn());
      return Number.isFinite(result) ? result : 0;
    } catch {
      return 0;
    }
  }

  polarCurveLength(rFunc: string, alpha: number, beta: number, n: number = 1000): number {
    const dTheta = (beta - alpha) / n;
    let length = 0;
    for (let i = 0; i < n; i++) {
      const theta = alpha + i * dTheta;
      const r1 = this._evalPolar(rFunc, theta);
      const r2 = this._evalPolar(rFunc, theta + dTheta);
      const dr = r2 - r1;
      length += Math.sqrt(r1 * r1 + dr * dr);
    }
    return length;
  }

  private _evalPolar(func: string, theta: number): number {
    try {
      const replaced = func.replace(/θ/g, `(${theta})`).replace(/\^/g, '**');
      const fn = new Function(`return ${replaced};`);
      const result = Number(fn());
      return Number.isFinite(result) ? result : 0;
    } catch {
      return 0;
    }
  }

  roseCurve(n: number, a: number, type: 'sin' | 'cos'): string {
    return `r = ${a} ${type}(${n}θ)`;
  }

  limaçonCurve(a: number, b: number, type: 'sin' | 'cos'): string {
    return `r = ${a} + ${b} ${type} θ`;
  }

  cardioidCurve(a: number, type: 'sin' | 'cos'): string {
    return `r = ${a}(1 + ${type} θ)`;
  }

  lemniscateCurve(a: number): string {
    return `r² = ${a * a} cos 2θ`;
  }

  spiralArchimedean(a: number): string {
    return `r = ${a}θ`;
  }

  spiralLogarithmic(a: number, b: number): string {
    return `r = ${a} e^(${b}θ)`;
  }

  conicSectionsSummary(): string[] {
    return [
      'Circle: e = 0, special case of ellipse',
      'Ellipse: 0 < e < 1, closed curve',
      'Parabola: e = 1, open curve',
      'Hyperbola: e > 1, two separate branches',
    ];
  }

  degenerateConics(): string[] {
    return [
      'Point: when intersecting plane passes through vertex',
      'Line: when plane is tangent to the cone',
      'Two intersecting lines: hyperbola degenerate',
      'Two parallel lines: parabola degenerate',
      'No real graph: imaginary ellipse',
    ];
  }

  dandelinSpheres(): string {
    return 'Spheres inscribed in a cone tangent to the cutting plane; points of tangency are the foci of the conic section';
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
