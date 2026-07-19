import { DataPacket, PacketMeta } from '../shared/types';

/** Type of line equation representation. */
export type LineForm =
  | 'slope-intercept'
  | 'point-slope'
  | 'general'
  | 'two-point';

/** Coordinate point in 2D plane. */
export interface Coordinate {
  x: number;
  y: number;
}

/** Line equation in various forms. */
export interface LineEquation {
  type: LineForm;
  a: number;
  b: number;
  c: number;
  slope: number;
  yIntercept: number;
}

/** Circle equation and parameters. */
export interface CircleEquation {
  centerX: number;
  centerY: number;
  radius: number;
  equation: string;
}

export class CoordinateGeometry {
  private _lines: Map<string, LineEquation> = new Map();
  private _circles: Map<string, CircleEquation> = new Map();
  private _history: unknown[] = [];
  private _counter = 0;

  slopeFromTwoPoints(p1: Coordinate, p2: Coordinate): number {
    const dx = p2.x - p1.x;
    if (Math.abs(dx) < 1e-12) return Infinity;
    return (p2.y - p1.y) / dx;
  }

  lineFromTwoPoints(p1: Coordinate, p2: Coordinate): LineEquation {
    const slope = this.slopeFromTwoPoints(p1, p2);
    const yIntercept = p1.y - slope * p1.x;
    const line: LineEquation = {
      type: 'two-point',
      a: -slope,
      b: 1,
      c: -yIntercept,
      slope,
      yIntercept,
    };
    const id = `line-${++this._counter}`;
    this._lines.set(id, line);
    this._history.push({ op: 'lineFromTwoPoints', line });
    return line;
  }

  lineFromSlopePoint(slope: number, point: Coordinate): LineEquation {
    const yIntercept = point.y - slope * point.x;
    const line: LineEquation = {
      type: 'point-slope',
      a: -slope,
      b: 1,
      c: -yIntercept,
      slope,
      yIntercept,
    };
    const id = `line-${++this._counter}`;
    this._lines.set(id, line);
    this._history.push({ op: 'lineFromSlopePoint', line });
    return line;
  }

  lineFromSlopeIntercept(slope: number, intercept: number): LineEquation {
    const line: LineEquation = {
      type: 'slope-intercept',
      a: -slope,
      b: 1,
      c: -intercept,
      slope,
      yIntercept: intercept,
    };
    const id = `line-${++this._counter}`;
    this._lines.set(id, line);
    this._history.push({ op: 'lineFromSlopeIntercept', line });
    return line;
  }

  generalForm(slope: number, intercept: number): { a: number; b: number; c: number } {
    // y = slope * x + intercept  ->  -slope * x + y - intercept = 0
    let a = -slope;
    let b = 1;
    let c = -intercept;
    // Normalize so coefficients are integers if simple
    const gcd = this._gcdAll([a, b, c]);
    if (gcd > 1e-12) {
      a /= gcd;
      b /= gcd;
      c /= gcd;
    }
    if (b < 0) {
      a = -a;
      b = -b;
      c = -c;
    }
    return { a, b, c };
  }

  distance(p1: Coordinate, p2: Coordinate): number {
    return Math.hypot(p2.x - p1.x, p2.y - p1.y);
  }

  midpoint(p1: Coordinate, p2: Coordinate): Coordinate {
    return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  }

  sectionRatio(p1: Coordinate, p2: Coordinate, ratio: number): Coordinate {
    if (Math.abs(ratio + 1) < 1e-12) {
      throw new Error('ratio cannot be -1 (point at infinity)');
    }
    const m = ratio;
    const n = 1;
    return {
      x: (m * p2.x + n * p1.x) / (m + n),
      y: (m * p2.y + n * p1.y) / (m + n),
    };
  }

  intersectionOfLines(line1: LineEquation, line2: LineEquation): Coordinate | null {
    const det = line1.a * line2.b - line2.a * line1.b;
    if (Math.abs(det) < 1e-12) {
      return null;
    }
    const x = (line1.b * line2.c - line2.b * line1.c) / det;
    const y = (line2.a * line1.c - line1.a * line2.c) / det;
    return { x, y };
  }

  intersectionOfLineCircle(line: LineEquation, circle: CircleEquation): Coordinate[] {
    // Substitute y = -(a*x + c)/b into (x-h)^2 + (y-k)^2 = r^2
    const { centerX: h, centerY: k, radius: r } = circle;
    if (Math.abs(line.b) < 1e-12) {
      // vertical line: a*x + c = 0 -> x = -c/a
      const x = -line.c / line.a;
      const dy = r * r - (x - h) * (x - h);
      if (dy < -1e-12) return [];
      if (Math.abs(dy) < 1e-12) return [{ x, y: k }];
      const sq = Math.sqrt(dy);
      return [{ x, y: k + sq }, { x, y: k - sq }];
    }
    // y = -(a*x + c)/b
    const m = -line.a / line.b;
    const c0 = -line.c / line.b;
    const A = 1 + m * m;
    const B = 2 * (m * (c0 - k) - h);
    const C = h * h + (c0 - k) * (c0 - k) - r * r;
    const disc = B * B - 4 * A * C;
    if (disc < -1e-12) return [];
    if (Math.abs(disc) < 1e-12) {
      const x = -B / (2 * A);
      return [{ x, y: m * x + c0 }];
    }
    const sq = Math.sqrt(disc);
    const x1 = (-B + sq) / (2 * A);
    const x2 = (-B - sq) / (2 * A);
    return [
      { x: x1, y: m * x1 + c0 },
      { x: x2, y: m * x2 + c0 },
    ];
  }

  intersectionOfCircles(c1: CircleEquation, c2: CircleEquation): Coordinate[] {
    const d = this.distance({ x: c1.centerX, y: c1.centerY }, { x: c2.centerX, y: c2.centerY });
    if (d > c1.radius + c2.radius + 1e-9) return [];
    if (d < Math.abs(c1.radius - c2.radius) - 1e-9) return [];
    if (Math.abs(d) < 1e-12) return [];
    const a = (c1.radius * c1.radius - c2.radius * c2.radius + d * d) / (2 * d);
    const h = c1.radius * c1.radius - a * a;
    if (h < -1e-12) return [];
    const x2 = c1.centerX + a * (c2.centerX - c1.centerX) / d;
    const y2 = c1.centerY + a * (c2.centerY - c1.centerY) / d;
    if (Math.abs(h) < 1e-12) return [{ x: x2, y: y2 }];
    const dx = c2.centerX - c1.centerX;
    const dy = c2.centerY - c1.centerY;
    const offset = Math.sqrt(h);
    return [
      { x: x2 + offset * dy / d, y: y2 - offset * dx / d },
      { x: x2 - offset * dy / d, y: y2 + offset * dx / d },
    ];
  }

  angleBetweenLines(line1: LineEquation, line2: LineEquation): number {
    if (Math.abs(line1.slope - Infinity) < 1e-12 && Math.abs(line2.slope - Infinity) < 1e-12) return 0;
    if (Math.abs(line1.slope - Infinity) < 1e-12) {
      return 90 - Math.atan(line2.slope) * 180 / Math.PI;
    }
    if (Math.abs(line2.slope - Infinity) < 1e-12) {
      return 90 - Math.atan(line1.slope) * 180 / Math.PI;
    }
    const tan = Math.abs((line2.slope - line1.slope) / (1 + line1.slope * line2.slope));
    return Math.atan(tan) * 180 / Math.PI;
  }

  isParallel(line1: LineEquation, line2: LineEquation): boolean {
    const det = line1.a * line2.b - line2.a * line1.b;
    const cross = line1.a * line2.c - line2.a * line1.c;
    return Math.abs(det) < 1e-9 && Math.abs(cross) > 1e-9;
  }

  isPerpendicular(line1: LineEquation, line2: LineEquation): boolean {
    if (Math.abs(line1.slope - Infinity) < 1e-12) return Math.abs(line2.slope) < 1e-12;
    if (Math.abs(line2.slope - Infinity) < 1e-12) return Math.abs(line1.slope) < 1e-12;
    return Math.abs(line1.slope * line2.slope + 1) < 1e-9;
  }

  distancePointToLine(point: Coordinate, line: LineEquation): number {
    const num = Math.abs(line.a * point.x + line.b * point.y + line.c);
    const den = Math.hypot(line.a, line.b);
    if (den < 1e-12) return 0;
    return num / den;
  }

  reflection(point: Coordinate, line: LineEquation): Coordinate {
    const denom = line.a * line.a + line.b * line.b;
    if (denom < 1e-12) return { ...point };
    const t = -(line.a * point.x + line.b * point.y + line.c) / denom;
    const footX = point.x + line.a * t;
    const footY = point.y + line.b * t;
    return { x: 2 * footX - point.x, y: 2 * footY - point.y };
  }

  circleFromThreePoints(p1: Coordinate, p2: Coordinate, p3: Coordinate): CircleEquation {
    const ax = p1.x, ay = p1.y;
    const bx = p2.x, by = p2.y;
    const cx = p3.x, cy = p3.y;
    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    if (Math.abs(d) < 1e-12) {
      throw new Error('Points are collinear, no finite circle through them');
    }
    const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
    const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
    const r = Math.hypot(ax - ux, ay - uy);
    const circle: CircleEquation = {
      centerX: ux,
      centerY: uy,
      radius: r,
      equation: `(x - ${ux.toFixed(4)})^2 + (y - ${uy.toFixed(4)})^2 = ${r.toFixed(4)}`,
    };
    const id = `circle-${++this._counter}`;
    this._circles.set(id, circle);
    this._history.push({ op: 'circleFromThreePoints', circle });
    return circle;
  }

  /** Slope-intercept representation of a line: y = m*x + b. */
  slopeInterceptForm(line: LineEquation): string {
    if (Math.abs(line.slope - Infinity) < 1e-12) {
      return `x = ${-line.c / line.a}`;
    }
    return `y = ${line.slope}x + ${line.yIntercept}`;
  }

  /** General-form representation of a line: a*x + b*y + c = 0. */
  generalFormString(line: LineEquation): string {
    const sign = (n: number) => (n < 0 ? '-' : '+');
    const aStr = Math.abs(line.a) === 1 ? (line.a < 0 ? '-' : '') : `${line.a}`;
    const bStr = Math.abs(line.b) === 1 ? (line.b < 0 ? '-' : '') : `${line.b}`;
    return `${aStr}x ${sign(line.b)} ${Math.abs(line.b)}y ${sign(line.c)} ${Math.abs(line.c)} = 0`;
  }

  /** Compute the area of a triangle formed by three points. */
  triangleArea(p1: Coordinate, p2: Coordinate, p3: Coordinate): number {
    return Math.abs(
      (p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y)) / 2,
    );
  }

  /** Compute the centroid of a triangle formed by three points. */
  centroid(p1: Coordinate, p2: Coordinate, p3: Coordinate): Coordinate {
    return {
      x: (p1.x + p2.x + p3.x) / 3,
      y: (p1.y + p2.y + p3.y) / 3,
    };
  }

  /** Determine whether three points are collinear. */
  areCollinear(p1: Coordinate, p2: Coordinate, p3: Coordinate): boolean {
    const area = this.triangleArea(p1, p2, p3);
    return Math.abs(area) < 1e-9;
  }

  /** Compute the distance from a point to a circle (0 if inside or on the circle). */
  distancePointToCircle(point: Coordinate, circle: CircleEquation): number {
    const dist = this.distance(point, { x: circle.centerX, y: circle.centerY });
    return Math.max(0, dist - circle.radius);
  }

  /** Translate a line by (dx, dy). */
  translateLine(line: LineEquation, dx: number, dy: number): LineEquation {
    return {
      ...line,
      c: line.c - (line.a * dx + line.b * dy),
    };
  }

  /** Compute the perpendicular bisector of a segment defined by two points. */
  perpendicularBisector(p1: Coordinate, p2: Coordinate): LineEquation {
    const mid = this.midpoint(p1, p2);
    const slope = this.slopeFromTwoPoints(p1, p2);
    const perpSlope = Math.abs(slope) < 1e-12 ? Infinity : -1 / slope;
    if (Math.abs(perpSlope - Infinity) < 1e-12) {
      return {
        type: 'general',
        a: 1,
        b: 0,
        c: -mid.x,
        slope: Infinity,
        yIntercept: NaN,
      };
    }
    return this.lineFromSlopePoint(perpSlope, mid);
  }

  private _gcdAll(values: number[]): number {
    const gcd = (a: number, b: number): number => {
      a = Math.abs(a);
      b = Math.abs(b);
      while (b > 1e-12) {
        [a, b] = [b, a % b];
      }
      return a;
    };
    return values.reduce((acc, v) => gcd(acc, v), 0);
  }

  toPacket(): DataPacket<{
    lines: Map<string, LineEquation>;
    circles: Map<string, CircleEquation>;
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['middle_school_math', 'CoordinateGeometry'],
      priority: 1,
      phase: 'coordinate_geometry',
    };
    return {
      id: `coordgeo-${Date.now().toString(36)}`,
      payload: {
        lines: this._lines,
        circles: this._circles,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._lines = new Map();
    this._circles = new Map();
    this._history = [];
    this._counter = 0;
  }

  get lineCount(): number {
    return this._lines.size;
  }

  get circleCount(): number {
    return this._circles.size;
  }

  get historyLength(): number {
    return this._history.length;
  }
}
