import { DataPacket, PacketMeta } from '../shared/types';

/** Angle representation. */
export interface Angle {
  degrees: number;
  radians: number;
  quadrant: 1 | 2 | 3 | 4;
}

/** Triangle classification. */
export type TriangleKind = 'right' | 'acute' | 'obtuse';

/** Triangle side/angle data. */
export interface Triangle {
  sides: number[];
  angles: number[];
  type: TriangleKind;
}

/** Trigonometric identity record. */
export interface TrigIdentity {
  name: string;
  expression: string;
  proof: string;
}

/** Function labels supported by transformation routines. */
export type TrigFunction = 'sin' | 'cos' | 'tan' | 'csc' | 'sec' | 'cot';

/** Inputs to solveTriangle. */
export interface TriangleGiven {
  a?: number;
  b?: number;
  c?: number;
  A?: number;
  B?: number;
  C?: number;
}

export class TrigonometryMaster {
  private _angles: Map<string, Angle> = new Map();
  private _triangles: Map<string, Triangle> = new Map();
  private _identities: TrigIdentity[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  toRadians(degrees: number): number {
    return degrees * Math.PI / 180;
  }

  toDegrees(radians: number): number {
    return radians * 180 / Math.PI;
  }

  sin(angle: number): number {
    return Math.sin(this.toRadians(angle));
  }

  cos(angle: number): number {
    return Math.cos(this.toRadians(angle));
  }

  tan(angle: number): number {
    const c = this.cos(angle);
    if (Math.abs(c) < 1e-12) return Infinity * Math.sign(this.sin(angle));
    return this.sin(angle) / c;
  }

  arcsin(value: number): number {
    return this.toDegrees(Math.asin(value));
  }

  arccos(value: number): number {
    return this.toDegrees(Math.acos(value));
  }

  arctan(value: number): number {
    return this.toDegrees(Math.atan(value));
  }

  lawOfSines(a: number, A: number, b: number): number {
    // B = arcsin(b * sin(A) / a)
    const sinA = Math.sin(this.toRadians(A));
    const ratio = b * sinA / a;
    if (ratio > 1 || ratio < -1) return NaN;
    const B = this.toDegrees(Math.asin(ratio));
    const angle: Angle = { degrees: B, radians: this.toRadians(B), quadrant: B <= 90 ? 1 : 2 };
    const id = `angle-${++this._counter}`;
    this._angles.set(id, angle);
    this._history.push({ op: 'lawOfSines', B });
    return B;
  }

  lawOfCosines(a: number, b: number, C: number): number {
    const cosC = Math.cos(this.toRadians(C));
    const c = Math.sqrt(a * a + b * b - 2 * a * b * cosC);
    this._history.push({ op: 'lawOfCosines', c });
    return c;
  }

  areaOfTriangle(a: number, b: number, C: number): number {
    return 0.5 * a * b * Math.sin(this.toRadians(C));
  }

  solveTriangle(given: TriangleGiven): Triangle {
    let { a, b, c, A, B, C } = given;
    // Try SSS
    if (a !== undefined && b !== undefined && c !== undefined) {
      A = this.toDegrees(Math.acos((b * b + c * c - a * a) / (2 * b * c)));
      B = this.toDegrees(Math.acos((a * a + c * c - b * b) / (2 * a * c)));
      C = 180 - A - B;
    } else if (a !== undefined && b !== undefined && C !== undefined) {
      // SAS
      c = this.lawOfCosines(a, b, C);
      A = this.toDegrees(Math.asin(a * Math.sin(this.toRadians(C)) / c));
      B = 180 - A - C;
    } else if (a !== undefined && A !== undefined && b !== undefined) {
      // ASA via sine rule
      B = this.lawOfSines(a, A, b);
      C = 180 - A - (B || 0);
      if (c !== undefined && C !== undefined) {
        // recalculate c
        const ratio = a / Math.sin(this.toRadians(A));
        c = ratio * Math.sin(this.toRadians(C));
      } else if (C !== undefined) {
        const ratio = a / Math.sin(this.toRadians(A));
        c = ratio * Math.sin(this.toRadians(C));
      }
    }
    const sides = [a, b, c].filter((v): v is number => v !== undefined);
    const angles = [A, B, C].filter((v): v is number => v !== undefined);
    let type: TriangleKind = 'acute';
    if (angles.some(angle => Math.abs(angle - 90) < 1e-6)) type = 'right';
    else if (angles.some(angle => angle > 90)) type = 'obtuse';
    const triangle: Triangle = { sides, angles, type };
    const id = `tri-${++this._counter}`;
    this._triangles.set(id, triangle);
    this._history.push({ op: 'solveTriangle', triangle });
    return triangle;
  }

  unitCircle(): { angle: number; sin: number; cos: number }[] {
    const result: { angle: number; sin: number; cos: number }[] = [];
    for (let deg = 0; deg < 360; deg += 30) {
      result.push({
        angle: deg,
        sin: Math.sin(this.toRadians(deg)),
        cos: Math.cos(this.toRadians(deg)),
      });
    }
    return result;
  }

  referenceAngle(angle: number): number {
    const normalized = ((angle % 360) + 360) % 360;
    if (normalized <= 90) return normalized;
    if (normalized <= 180) return 180 - normalized;
    if (normalized <= 270) return normalized - 180;
    return 360 - normalized;
  }

  coterminalAngle(angle: number): number[] {
    return [angle + 360, angle - 360, angle + 720, angle - 720];
  }

  doubleAngle(func: TrigFunction, angle: number): number {
    const rad = this.toRadians(angle);
    switch (func) {
      case 'sin': return 2 * Math.sin(rad) * Math.cos(rad);
      case 'cos': return 2 * Math.cos(rad) * Math.cos(rad) - 1;
      case 'tan': {
        const t = Math.tan(rad);
        return 2 * t / (1 - t * t);
      }
      case 'csc': return 1 / (2 * Math.sin(rad) * Math.cos(rad));
      case 'sec': return 1 / (2 * Math.cos(rad) * Math.cos(rad) - 1);
      case 'cot': {
        const t = Math.tan(rad);
        return (1 - t * t) / (2 * t);
      }
      default: return NaN;
    }
  }

  halfAngle(func: TrigFunction, angle: number): number {
    const rad = this.toRadians(angle);
    const sign = (angle % 360 + 360) % 360 > 180 ? -1 : 1;
    switch (func) {
      case 'sin': return sign * Math.sqrt((1 - Math.cos(rad)) / 2);
      case 'cos': return sign * Math.sqrt((1 + Math.cos(rad)) / 2);
      case 'tan': return Math.sin(rad) / (1 + Math.cos(rad));
      case 'csc': return 1 / (sign * Math.sqrt((1 - Math.cos(rad)) / 2));
      case 'sec': return 1 / (sign * Math.sqrt((1 + Math.cos(rad)) / 2));
      case 'cot': return (1 + Math.cos(rad)) / Math.sin(rad);
      default: return NaN;
    }
  }

  sumDifference(func: TrigFunction, a: number, b: number): number {
    const ra = this.toRadians(a);
    const rb = this.toRadians(b);
    switch (func) {
      case 'sin': return Math.sin(ra + rb);
      case 'cos': return Math.cos(ra + rb);
      case 'tan': return Math.tan(ra + rb);
      case 'csc': return 1 / Math.sin(ra + rb);
      case 'sec': return 1 / Math.cos(ra + rb);
      case 'cot': return 1 / Math.tan(ra + rb);
      default: return NaN;
    }
  }

  productToSum(func: 'sin_cos' | 'cos_sin' | 'sin_sin' | 'cos_cos', a: number, b: number): number {
    const ra = this.toRadians(a);
    const rb = this.toRadians(b);
    switch (func) {
      case 'sin_cos': return 0.5 * (Math.sin(ra + rb) + Math.sin(ra - rb));
      case 'cos_sin': return 0.5 * (Math.sin(ra + rb) - Math.sin(ra - rb));
      case 'sin_sin': return 0.5 * (Math.cos(ra - rb) - Math.cos(ra + rb));
      case 'cos_cos': return 0.5 * (Math.cos(ra - rb) + Math.cos(ra + rb));
      default: return NaN;
    }
  }

  verifyIdentity(leftSide: string, rightSide: string): boolean {
    // Numerical verification: evaluate at multiple test angles
    const testAngles = [0, 30, 45, 60, 90, 120, 135, 150, 210, 240, 300];
    for (const angle of testAngles) {
      const leftVal = this._evalTrigExpr(leftSide, angle);
      const rightVal = this._evalTrigExpr(rightSide, angle);
      if (Number.isNaN(leftVal) || Number.isNaN(rightVal)) continue;
      if (Math.abs(leftVal - rightVal) > 1e-6) return false;
    }
    return true;
  }

  /** Register a custom trigonometric identity in the library. */
  registerIdentity(name: string, expression: string, proof: string): TrigIdentity {
    const identity: TrigIdentity = { name, expression, proof };
    this._identities.push(identity);
    this._history.push({ op: 'registerIdentity', name });
    return identity;
  }

  /** Convert an angle into its quadrant designation. */
  quadrantOf(angle: number): 1 | 2 | 3 | 4 {
    const normalized = ((angle % 360) + 360) % 360;
    if (normalized < 90) return 1;
    if (normalized < 180) return 2;
    if (normalized < 270) return 3;
    return 4;
  }

  /** Returns the signed values of sin and cos for an angle. */
  signsByQuadrant(angle: number): { sin: number; cos: number; tan: number } {
    const q = this.quadrantOf(angle);
    const s = Math.sign(this.sin(angle)) || 1;
    const c = Math.sign(this.cos(angle)) || 1;
    const t = Math.sign(this.tan(angle)) || 1;
    return {
      sin: q === 1 || q === 2 ? s : -s,
      cos: q === 1 || q === 4 ? c : -c,
      tan: q === 1 || q === 3 ? t : -t,
    };
  }

  /** Convert a bearing (clockwise from north) to standard angle (counterclockwise from east). */
  bearingToStandard(bearing: number): number {
    return (90 - bearing + 360) % 360;
  }

  /** Convert degrees-minutes-seconds to decimal degrees. */
  dmsToDecimal(degrees: number, minutes: number, seconds: number): number {
    const sign = degrees < 0 ? -1 : 1;
    return sign * (Math.abs(degrees) + minutes / 60 + seconds / 3600);
  }

  /** Convert decimal degrees to degrees-minutes-seconds. */
  decimalToDms(decimal: number): { degrees: number; minutes: number; seconds: number } {
    const sign = decimal < 0 ? -1 : 1;
    const abs = Math.abs(decimal);
    const degrees = Math.floor(abs);
    const minutesFloat = (abs - degrees) * 60;
    const minutes = Math.floor(minutesFloat);
    const seconds = (minutesFloat - minutes) * 60;
    return { degrees: sign * degrees, minutes, seconds };
  }

  /** Inverse tangent respecting quadrant, akin to atan2. */
  arctan2(y: number, x: number): number {
    return this.toDegrees(Math.atan2(y, x));
  }

  /** Triangle area from three sides using Heron's formula. */
  heronArea(a: number, b: number, c: number): number {
    const s = (a + b + c) / 2;
    const inside = s * (s - a) * (s - b) * (s - c);
    if (inside < 0) return 0;
    return Math.sqrt(inside);
  }

  /** Perimeter helper for completeness with the solveTriangle flow. */
  perimeter(a: number, b: number, c: number): number {
    return a + b + c;
  }

  /** Inradius of a triangle given its side lengths. */
  inradius(a: number, b: number, c: number): number {
    const area = this.heronArea(a, b, c);
    const s = (a + b + c) / 2;
    if (s === 0) return 0;
    return area / s;
  }

  /** Circumradius of a triangle given side a and opposite angle A. */
  circumradius(a: number, A: number): number {
    const sinA = Math.sin(this.toRadians(A));
    if (Math.abs(sinA) < 1e-12) return Infinity;
    return a / (2 * sinA);
  }

  private _evalTrigExpr(expr: string, angleDeg: number): number {
    try {
      const rad = this.toRadians(angleDeg);
      const replaced = expr
        .replace(/\bsin\b/g, `Math.sin(${rad})`)
        .replace(/\bcos\b/g, `Math.cos(${rad})`)
        .replace(/\btan\b/g, `Math.tan(${rad})`)
        .replace(/\bcsc\b/g, `(1/Math.sin(${rad}))`)
        .replace(/\bsec\b/g, `(1/Math.cos(${rad}))`)
        .replace(/\bcot\b/g, `(1/Math.tan(${rad}))`)
        .replace(/\^/g, '**');
      // eslint-disable-next-line no-new-func
      const fn = new Function(`return ${replaced};`);
      const result = Number(fn());
      return Number.isFinite(result) ? result : NaN;
    } catch {
      return NaN;
    }
  }

  toPacket(): DataPacket<{
    angles: Map<string, Angle>;
    triangles: Map<string, Triangle>;
    identities: TrigIdentity[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['high_school_math', 'TrigonometryMaster'],
      priority: 1,
      phase: 'trigonometry',
    };
    return {
      id: `trig-${Date.now().toString(36)}`,
      payload: {
        angles: this._angles,
        triangles: this._triangles,
        identities: this._identities,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._angles = new Map();
    this._triangles = new Map();
    this._identities = [];
    this._history = [];
    this._counter = 0;
  }

  get angleCount(): number {
    return this._angles.size;
  }

  get triangleCount(): number {
    return this._triangles.size;
  }

  get identityCount(): number {
    return this._identities.length;
  }
}
