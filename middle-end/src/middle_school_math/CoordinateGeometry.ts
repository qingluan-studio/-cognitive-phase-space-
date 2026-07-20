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

  parallelThroughPoint(line: LineEquation, point: Coordinate): LineEquation {
    return this.lineFromSlopePoint(line.slope, point);
  }

  perpendicularThroughPoint(line: LineEquation, point: Coordinate): LineEquation {
    if (Math.abs(line.slope - Infinity) < 1e-12) {
      return {
        type: 'slope-intercept',
        a: 0,
        b: 1,
        c: -point.y,
        slope: 0,
        yIntercept: point.y,
      };
    }
    if (Math.abs(line.slope) < 1e-12) {
      return {
        type: 'general',
        a: 1,
        b: 0,
        c: -point.x,
        slope: Infinity,
        yIntercept: NaN,
      };
    }
    const perpSlope = -1 / line.slope;
    return this.lineFromSlopePoint(perpSlope, point);
  }

  pointLineProjection(point: Coordinate, line: LineEquation): Coordinate {
    const denom = line.a * line.a + line.b * line.b;
    if (denom < 1e-12) return { ...point };
    const t = -(line.a * point.x + line.b * point.y + line.c) / denom;
    return {
      x: point.x + line.a * t,
      y: point.y + line.b * t,
    };
  }

  angleBisector(line1: LineEquation, line2: LineEquation): LineEquation[] {
    const den1 = Math.hypot(line1.a, line1.b);
    const den2 = Math.hypot(line2.a, line2.b);
    if (den1 < 1e-12 || den2 < 1e-12) return [];
    const bisectors: LineEquation[] = [];
    for (const sign of [1, -1]) {
      const a = line1.a / den1 + sign * line2.a / den2;
      const b = line1.b / den1 + sign * line2.b / den2;
      const c = line1.c / den1 + sign * line2.c / den2;
      const slope = Math.abs(b) < 1e-12 ? Infinity : -a / b;
      const yIntercept = Math.abs(b) < 1e-12 ? NaN : -c / b;
      bisectors.push({
        type: 'general',
        a,
        b,
        c,
        slope,
        yIntercept,
      });
    }
    return bisectors;
  }

  familyOfLines(line1: LineEquation, line2: LineEquation, lambda: number): LineEquation {
    const a = line1.a + lambda * line2.a;
    const b = line1.b + lambda * line2.b;
    const c = line1.c + lambda * line2.c;
    const slope = Math.abs(b) < 1e-12 ? Infinity : -a / b;
    const yIntercept = Math.abs(b) < 1e-12 ? NaN : -c / b;
    return {
      type: 'general',
      a,
      b,
      c,
      slope,
      yIntercept,
    };
  }

  circleFromDiameter(p1: Coordinate, p2: Coordinate): CircleEquation {
    const centerX = (p1.x + p2.x) / 2;
    const centerY = (p1.y + p2.y) / 2;
    const radius = this.distance(p1, p2) / 2;
    const circle: CircleEquation = {
      centerX,
      centerY,
      radius,
      equation: `(x - ${centerX})^2 + (y - ${centerY})^2 = ${radius * radius}`,
    };
    const id = `circle-${++this._counter}`;
    this._circles.set(id, circle);
    return circle;
  }

  circleFromCenterRadius(center: Coordinate, radius: number): CircleEquation {
    const circle: CircleEquation = {
      centerX: center.x,
      centerY: center.y,
      radius,
      equation: `(x - ${center.x})^2 + (y - ${center.y})^2 = ${radius * radius}`,
    };
    const id = `circle-${++this._counter}`;
    this._circles.set(id, circle);
    return circle;
  }

  tangentLineAtPoint(circle: CircleEquation, point: Coordinate): LineEquation {
    const dx = point.x - circle.centerX;
    const dy = point.y - circle.centerY;
    const a = dx;
    const b = dy;
    const c = -dx * point.x - dy * point.y;
    const slope = Math.abs(b) < 1e-12 ? Infinity : -a / b;
    const yIntercept = Math.abs(b) < 1e-12 ? NaN : -c / b;
    return {
      type: 'general',
      a,
      b,
      c,
      slope,
      yIntercept,
    };
  }

  lengthOfTangent(point: Coordinate, circle: CircleEquation): number {
    const d = this.distance(point, { x: circle.centerX, y: circle.centerY });
    return Math.sqrt(Math.max(0, d * d - circle.radius * circle.radius));
  }

  radicalAxis(c1: CircleEquation, c2: CircleEquation): LineEquation {
    const a = 2 * (c2.centerX - c1.centerX);
    const b = 2 * (c2.centerY - c1.centerY);
    const c = (c1.centerX * c1.centerX + c1.centerY * c1.centerY - c1.radius * c1.radius) -
      (c2.centerX * c2.centerX + c2.centerY * c2.centerY - c2.radius * c2.radius);
    const slope = Math.abs(b) < 1e-12 ? Infinity : -a / b;
    const yIntercept = Math.abs(b) < 1e-12 ? NaN : -c / b;
    return {
      type: 'general',
      a,
      b,
      c,
      slope,
      yIntercept,
    };
  }

  commonTangents(c1: CircleEquation, c2: CircleEquation): LineEquation[] {
    const d = this.distance({ x: c1.centerX, y: c1.centerY }, { x: c2.centerX, y: c2.centerY });
    const tangents: LineEquation[] = [];
    if (d < 1e-12) return tangents;
    const directRatio = c1.radius / c2.radius;
    if (Math.abs(directRatio - 1) < 1e-12) {
      const dx = c2.centerX - c1.centerX;
      const dy = c2.centerY - c1.centerY;
      const perpX = -dy / d;
      const perpY = dx / d;
      for (const sign of [1, -1]) {
        const px = c1.centerX + perpX * c1.radius * sign;
        const py = c1.centerY + perpY * c1.radius * sign;
        const a = dx;
        const b = dy;
        const c = -dx * px - dy * py;
        const slope = Math.abs(b) < 1e-12 ? Infinity : -a / b;
        const yIntercept = Math.abs(b) < 1e-12 ? NaN : -c / b;
        tangents.push({ type: 'general', a, b, c, slope, yIntercept });
      }
    }
    return tangents;
  }

  areaOfQuadrilateral(p1: Coordinate, p2: Coordinate, p3: Coordinate, p4: Coordinate): number {
    return Math.abs(
      (p1.x * p2.y + p2.x * p3.y + p3.x * p4.y + p4.x * p1.y) -
      (p2.x * p1.y + p3.x * p2.y + p4.x * p3.y + p1.x * p4.y),
    ) / 2;
  }

  shoelaceFormula(points: Coordinate[]): number {
    let sum = 0;
    const n = points.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      sum += points[i].x * points[j].y - points[j].x * points[i].y;
    }
    return Math.abs(sum) / 2;
  }

  centroidOfPolygon(points: Coordinate[]): Coordinate {
    const n = points.length;
    if (n === 0) return { x: 0, y: 0 };
    let cx = 0, cy = 0;
    const area = this.shoelaceFormula(points);
    if (Math.abs(area) < 1e-12) {
      cx = points.reduce((s, p) => s + p.x, 0) / n;
      cy = points.reduce((s, p) => s + p.y, 0) / n;
      return { x: cx, y: cy };
    }
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const cross = points[i].x * points[j].y - points[j].x * points[i].y;
      cx += (points[i].x + points[j].x) * cross;
      cy += (points[i].y + points[j].y) * cross;
    }
    cx /= 6 * area;
    cy /= 6 * area;
    return { x: cx, y: cy };
  }

  incenterOfTriangle(p1: Coordinate, p2: Coordinate, p3: Coordinate, a: number, b: number, c: number): Coordinate {
    const p = a + b + c;
    if (p === 0) return { x: 0, y: 0 };
    return {
      x: (a * p1.x + b * p2.x + c * p3.x) / p,
      y: (a * p1.y + b * p2.y + c * p3.y) / p,
    };
  }

  circumcenterOfTriangle(p1: Coordinate, p2: Coordinate, p3: Coordinate): Coordinate {
    const ax = p1.x, ay = p1.y;
    const bx = p2.x, by = p2.y;
    const cx = p3.x, cy = p3.y;
    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    if (Math.abs(d) < 1e-12) return { x: 0, y: 0 };
    const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
    const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
    return { x: ux, y: uy };
  }

  orthocenterOfTriangle(p1: Coordinate, p2: Coordinate, p3: Coordinate): Coordinate {
    const centroid = this.centroid(p1, p2, p3);
    const circumcenter = this.circumcenterOfTriangle(p1, p2, p3);
    return {
      x: 3 * centroid.x - 2 * circumcenter.x,
      y: 3 * centroid.y - 2 * circumcenter.y,
    };
  }

  ninePointCenter(p1: Coordinate, p2: Coordinate, p3: Coordinate): Coordinate {
    const ortho = this.orthocenterOfTriangle(p1, p2, p3);
    const circum = this.circumcenterOfTriangle(p1, p2, p3);
    return {
      x: (ortho.x + circum.x) / 2,
      y: (ortho.y + circum.y) / 2,
    };
  }

  eulerLineLength(p1: Coordinate, p2: Coordinate, p3: Coordinate): number {
    const ortho = this.orthocenterOfTriangle(p1, p2, p3);
    const circum = this.circumcenterOfTriangle(p1, p2, p3);
    return this.distance(ortho, circum);
  }

  sectionFormula(p1: Coordinate, p2: Coordinate, m: number, n: number): Coordinate {
    return {
      x: (m * p2.x + n * p1.x) / (m + n),
      y: (m * p2.y + n * p1.y) / (m + n),
    };
  }

  externalSection(p1: Coordinate, p2: Coordinate, m: number, n: number): Coordinate {
    if (m === n) return { x: Infinity, y: Infinity };
    return {
      x: (m * p2.x - n * p1.x) / (m - n),
      y: (m * p2.y - n * p1.y) / (m - n),
    };
  }

  trisectionPoints(p1: Coordinate, p2: Coordinate): [Coordinate, Coordinate] {
    return [
      { x: (2 * p1.x + p2.x) / 3, y: (2 * p1.y + p2.y) / 3 },
      { x: (p1.x + 2 * p2.x) / 3, y: (p1.y + 2 * p2.y) / 3 },
    ];
  }

  xIntercept(line: LineEquation): number | null {
    if (Math.abs(line.a) < 1e-12) return null;
    return -line.c / line.a;
  }

  yIntercept(line: LineEquation): number | null {
    if (Math.abs(line.b) < 1e-12) return null;
    return -line.c / line.b;
  }

  interceptForm(a: number, b: number): LineEquation {
    const line: LineEquation = {
      type: 'general',
      a: 1 / a,
      b: 1 / b,
      c: -1,
      slope: -b / a,
      yIntercept: b,
    };
    const id = `line-${++this._counter}`;
    this._lines.set(id, line);
    return line;
  }

  normalForm(p: number, alpha: number): LineEquation {
    const a = Math.cos(alpha);
    const b = Math.sin(alpha);
    const c = -p;
    const slope = Math.abs(b) < 1e-12 ? Infinity : -a / b;
    const yIntercept = Math.abs(b) < 1e-12 ? NaN : -c / b;
    const line: LineEquation = {
      type: 'general',
      a,
      b,
      c,
      slope,
      yIntercept,
    };
    const id = `line-${++this._counter}`;
    this._lines.set(id, line);
    return line;
  }

  pairOfStraightLines(equation: string): { separate: LineEquation[]; angle: number } {
    const lines: LineEquation[] = [];
    const A = this._extractCoef(equation, 'x^2');
    const B = this._extractCoef(equation, 'xy');
    const C = this._extractCoef(equation, 'y^2');
    const angle = Math.atan(Math.abs(2 * Math.sqrt(Math.max(0, B * B / 4 - A * C)) / (A + C))) * 180 / Math.PI;
    return { separate: lines, angle };
  }

  pairOfTangentsFromPoint(point: Coordinate, circle: CircleEquation): LineEquation[] {
    const tangents: LineEquation[] = [];
    const len = this.lengthOfTangent(point, circle);
    if (len < 1e-12) return tangents;
    return tangents;
  }

  directorCircle(circle: CircleEquation): CircleEquation {
    const r = circle.radius * Math.sqrt(2);
    return {
      centerX: circle.centerX,
      centerY: circle.centerY,
      radius: r,
      equation: `(x - ${circle.centerX})^2 + (y - ${circle.centerY})^2 = ${2 * circle.radius * circle.radius}`,
    };
  }

  chordOfContact(point: Coordinate, circle: CircleEquation): LineEquation {
    const a = point.x - circle.centerX;
    const b = point.y - circle.centerY;
    const c = circle.centerX * point.x + circle.centerY * point.y -
      (circle.centerX * circle.centerX + circle.centerY * circle.centerY + circle.radius * circle.radius);
    const slope = Math.abs(b) < 1e-12 ? Infinity : -a / b;
    const yIntercept = Math.abs(b) < 1e-12 ? NaN : -c / b;
    return {
      type: 'general',
      a,
      b,
      c,
      slope,
      yIntercept,
    };
  }

  polarOfPoint(point: Coordinate, circle: CircleEquation): LineEquation {
    return this.chordOfContact(point, circle);
  }

  poleOfLine(line: LineEquation, circle: CircleEquation): Coordinate {
    const A = line.a;
    const B = line.b;
    const C = line.c;
    const denom = A * circle.centerX + B * circle.centerY + C;
    if (Math.abs(denom) < 1e-12) return { x: Infinity, y: Infinity };
    const k = -circle.radius * circle.radius / denom;
    return {
      x: circle.centerX + k * A,
      y: circle.centerY + k * B,
    };
  }

  rotationOfAxes(angle: number, point: Coordinate): Coordinate {
    const rad = angle * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return {
      x: point.x * cos + point.y * sin,
      y: -point.x * sin + point.y * cos,
    };
  }

  translationOfAxes(h: number, k: number, point: Coordinate): Coordinate {
    return {
      x: point.x - h,
      y: point.y - k,
    };
  }

  locusOfPoint(condition: string): string {
    return `Locus satisfying: ${condition}`;
  }

  slopeInterceptToGeneral(m: number, b: number): { a: number; b: number; c: number } {
    return { a: -m, b: 1, c: -b };
  }

  generalToSlopeIntercept(a: number, b: number, c: number): { slope: number; intercept: number } {
    if (Math.abs(b) < 1e-12) return { slope: Infinity, intercept: NaN };
    return { slope: -a / b, intercept: -c / b };
  }

  threePointArea(p1: Coordinate, p2: Coordinate, p3: Coordinate): number {
    return this.triangleArea(p1, p2, p3);
  }

  polygonPerimeter(points: Coordinate[]): number {
    let perimeter = 0;
    const n = points.length;
    for (let i = 0; i < n; i++) {
      perimeter += this.distance(points[i], points[(i + 1) % n]);
    }
    return perimeter;
  }

  isPointInPolygon(point: Coordinate, polygon: Coordinate[]): boolean {
    let inside = false;
    const n = polygon.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      if (((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }

  isPointOnSegment(point: Coordinate, p1: Coordinate, p2: Coordinate): boolean {
    const d1 = this.distance(point, p1);
    const d2 = this.distance(point, p2);
    const d = this.distance(p1, p2);
    return Math.abs(d1 + d2 - d) < 1e-9;
  }

  lineAngleWithXAxis(line: LineEquation): number {
    if (Math.abs(line.slope - Infinity) < 1e-12) return 90;
    return Math.atan(line.slope) * 180 / Math.PI;
  }

  footOfPerpendicular(point: Coordinate, line: LineEquation): Coordinate {
    return this.pointLineProjection(point, line);
  }

  distanceBetweenTwoLines(line1: LineEquation, line2: LineEquation): number {
    if (!this.isParallel(line1, line2)) return 0;
    const point = { x: 0, y: line1.yIntercept };
    if (!Number.isFinite(line1.yIntercept)) {
      return Math.abs(line1.c - line2.c) / Math.hypot(line1.a, line1.b);
    }
    return this.distancePointToLine(point, line2);
  }

  angleBisectorOfAngle(vertex: Coordinate, p1: Coordinate, p2: Coordinate): LineEquation {
    const d1 = this.distance(vertex, p1);
    const d2 = this.distance(vertex, p2);
    const point: Coordinate = {
      x: (d2 * p1.x + d1 * p2.x) / (d1 + d2),
      y: (d2 * p1.y + d1 * p2.y) / (d1 + d2),
    };
    return this.lineFromTwoPoints(vertex, point);
  }

  excenterOfTriangle(p1: Coordinate, p2: Coordinate, p3: Coordinate, a: number, b: number, c: number): Coordinate {
    const denom = -a + b + c;
    if (Math.abs(denom) < 1e-12) return { x: 0, y: 0 };
    return {
      x: (-a * p1.x + b * p2.x + c * p3.x) / denom,
      y: (-a * p1.y + b * p2.y + c * p3.y) / denom,
    };
  }

  symmedianPoint(p1: Coordinate, p2: Coordinate, p3: Coordinate, a: number, b: number, c: number): Coordinate {
    const denom = a * a + b * b + c * c;
    if (denom === 0) return { x: 0, y: 0 };
    return {
      x: (a * a * p1.x + b * b * p2.x + c * c * p3.x) / denom,
      y: (a * a * p1.y + b * b * p2.y + c * c * p3.y) / denom,
    };
  }

  lemoinePoint(p1: Coordinate, p2: Coordinate, p3: Coordinate, a: number, b: number, c: number): Coordinate {
    return this.symmedianPoint(p1, p2, p3, a, b, c);
  }

  gergonnePoint(p1: Coordinate, p2: Coordinate, p3: Coordinate, a: number, b: number, c: number): Coordinate {
    const s = (a + b + c) / 2;
    const x1 = s - a;
    const x2 = s - b;
    const x3 = s - c;
    const denom = x1 + x2 + x3;
    if (denom === 0) return { x: 0, y: 0 };
    return {
      x: (x1 * p1.x + x2 * p2.x + x3 * p3.x) / denom,
      y: (x1 * p1.y + x2 * p2.y + x3 * p3.y) / denom,
    };
  }

  nagelPoint(p1: Coordinate, p2: Coordinate, p3: Coordinate, a: number, b: number, c: number): Coordinate {
    const s = (a + b + c) / 2;
    const x1 = s - a;
    const x2 = s - b;
    const x3 = s - c;
    return {
      x: (x1 * p1.x + x2 * p2.x + x3 * p3.x) / (x1 + x2 + x3),
      y: (x1 * p1.y + x2 * p2.y + x3 * p3.y) / (x1 + x2 + x3),
    };
  }

  feuerbachPoint(p1: Coordinate, p2: Coordinate, p3: Coordinate): Coordinate {
    const incenter = this.incenterOfTriangle(p1, p2, p3,
      this.distance(p2, p3), this.distance(p1, p3), this.distance(p1, p2));
    const ninePoint = this.ninePointCenter(p1, p2, p3);
    return this.midpoint(incenter, ninePoint);
  }

  torricelliPoint(p1: Coordinate, p2: Coordinate, p3: Coordinate): Coordinate {
    const a = this.distance(p2, p3);
    const b = this.distance(p1, p3);
    const c = this.distance(p1, p2);
    const cosA = (b * b + c * c - a * a) / (2 * b * c);
    const cosB = (a * a + c * c - b * b) / (2 * a * c);
    const cosC = (a * a + b * b - c * c) / (2 * a * b);
    if (cosA < -0.5) return p1;
    if (cosB < -0.5) return p2;
    if (cosC < -0.5) return p3;
    return this.centroid(p1, p2, p3);
  }

  rotationOfPoint(point: Coordinate, center: Coordinate, angleDeg: number): Coordinate {
    const rad = angleDeg * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    return {
      x: center.x + dx * cos - dy * sin,
      y: center.y + dx * sin + dy * cos,
    };
  }

  reflectionOverPoint(point: Coordinate, center: Coordinate): Coordinate {
    return {
      x: 2 * center.x - point.x,
      y: 2 * center.y - point.y,
    };
  }

  homothety(point: Coordinate, center: Coordinate, ratio: number): Coordinate {
    return {
      x: center.x + ratio * (point.x - center.x),
      y: center.y + ratio * (point.y - center.y),
    };
  }

  translation(point: Coordinate, dx: number, dy: number): Coordinate {
    return { x: point.x + dx, y: point.y + dy };
  }

  scaling(point: Coordinate, sx: number, sy: number): Coordinate {
    return { x: point.x * sx, y: point.y * sy };
  }

  private _extractCoef(expr: string, term: string): number {
    const m = expr.match(new RegExp(`([+-]?\\d*\\.?\\d+)\\s*\\*?\\s*${term.replace(/[()^]/g, '\\$&')}`));
    if (!m) return 0;
    const c = parseFloat(m[1]);
    return Number.isFinite(c) ? c : 1;
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
