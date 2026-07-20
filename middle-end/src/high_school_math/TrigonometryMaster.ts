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

  csc(angle: number): number {
    const s = this.sin(angle);
    if (Math.abs(s) < 1e-12) return Infinity;
    return 1 / s;
  }

  sec(angle: number): number {
    const c = this.cos(angle);
    if (Math.abs(c) < 1e-12) return Infinity;
    return 1 / c;
  }

  cot(angle: number): number {
    const t = this.tan(angle);
    if (!Number.isFinite(t)) return 0;
    if (Math.abs(t) < 1e-12) return Infinity;
    return 1 / t;
  }

  arccsc(value: number): number {
    if (Math.abs(value) < 1) return NaN;
    return this.toDegrees(Math.asin(1 / value));
  }

  arcsec(value: number): number {
    if (Math.abs(value) < 1) return NaN;
    return this.toDegrees(Math.acos(1 / value));
  }

  arccot(value: number): number {
    return this.toDegrees(Math.atan(1 / value));
  }

  pythagoreanIdentities(): string[] {
    return [
      'sin²θ + cos²θ = 1',
      '1 + tan²θ = sec²θ',
      '1 + cot²θ = csc²θ',
    ];
  }

  reciprocalIdentities(): string[] {
    return [
      'sin θ = 1/csc θ',
      'cos θ = 1/sec θ',
      'tan θ = 1/cot θ',
      'csc θ = 1/sin θ',
      'sec θ = 1/cos θ',
      'cot θ = 1/tan θ',
    ];
  }

  quotientIdentities(): string[] {
    return [
      'tan θ = sin θ / cos θ',
      'cot θ = cos θ / sin θ',
    ];
  }

  cofunctionIdentities(): string[] {
    return [
      'sin(90°-θ) = cos θ',
      'cos(90°-θ) = sin θ',
      'tan(90°-θ) = cot θ',
      'cot(90°-θ) = tan θ',
      'sec(90°-θ) = csc θ',
      'csc(90°-θ) = sec θ',
    ];
  }

  evenOddIdentities(): string[] {
    return [
      'sin(-θ) = -sin θ (odd)',
      'cos(-θ) = cos θ (even)',
      'tan(-θ) = -tan θ (odd)',
      'csc(-θ) = -csc θ (odd)',
      'sec(-θ) = sec θ (even)',
      'cot(-θ) = -cot θ (odd)',
    ];
  }

  sumDifferenceIdentities(): string[] {
    return [
      'sin(α±β) = sin α cos β ± cos α sin β',
      'cos(α±β) = cos α cos β ∓ sin α sin β',
      'tan(α±β) = (tan α ± tan β) / (1 ∓ tan α tan β)',
    ];
  }

  doubleAngleIdentities(): string[] {
    return [
      'sin 2θ = 2 sin θ cos θ',
      'cos 2θ = cos²θ - sin²θ = 2cos²θ - 1 = 1 - 2sin²θ',
      'tan 2θ = 2 tan θ / (1 - tan²θ)',
    ];
  }

  halfAngleIdentities(): string[] {
    return [
      'sin(θ/2) = ±√[(1 - cos θ)/2]',
      'cos(θ/2) = ±√[(1 + cos θ)/2]',
      'tan(θ/2) = sin θ / (1 + cos θ) = (1 - cos θ) / sin θ = ±√[(1 - cos θ)/(1 + cos θ)]',
    ];
  }

  productToSumIdentities(): string[] {
    return [
      'sin α cos β = ½[sin(α+β) + sin(α-β)]',
      'cos α sin β = ½[sin(α+β) - sin(α-β)]',
      'cos α cos β = ½[cos(α+β) + cos(α-β)]',
      'sin α sin β = ½[cos(α-β) - cos(α+β)]',
    ];
  }

  sumToProductIdentities(): string[] {
    return [
      'sin α + sin β = 2 sin[(α+β)/2] cos[(α-β)/2]',
      'sin α - sin β = 2 cos[(α+β)/2] sin[(α-β)/2]',
      'cos α + cos β = 2 cos[(α+β)/2] cos[(α-β)/2]',
      'cos α - cos β = -2 sin[(α+β)/2] sin[(α-β)/2]',
    ];
  }

  powerReducingIdentities(): string[] {
    return [
      'sin²θ = (1 - cos 2θ)/2',
      'cos²θ = (1 + cos 2θ)/2',
      'tan²θ = (1 - cos 2θ)/(1 + cos 2θ)',
    ];
  }

  lawOfSinesFormula(): string {
    return 'a/sin A = b/sin B = c/sin C = 2R';
  }

  lawOfCosinesFormula(): string[] {
    return [
      'a² = b² + c² - 2bc cos A',
      'b² = a² + c² - 2ac cos B',
      'c² = a² + b² - 2ab cos C',
    ];
  }

  lawOfTangents(): string {
    return '(a - b)/(a + b) = tan[(A-B)/2] / tan[(A+B)/2]';
  }

  ambiguousCaseSSA(a: number, b: number, A: number): { solutions: number; case: string } {
    const sinB = (b * this.sin(A)) / a;
    if (Math.abs(sinB) > 1 + 1e-9) {
      return { solutions: 0, case: 'no triangle' };
    }
    if (Math.abs(sinB - 1) < 1e-9) {
      return { solutions: 1, case: 'right triangle' };
    }
    if (a >= b) {
      return { solutions: 1, case: 'one triangle (a >= b)' };
    }
    return { solutions: 2, case: 'two triangles (ambiguous case)' };
  }

  areaFormulas(): string[] {
    return [
      'Area = ½ab sin C',
      'Area = ½bc sin A',
      'Area = ½ac sin B',
      'Area = √[s(s-a)(s-b)(s-c)] (Heron\'s formula)',
      'Area = abc/(4R) (R = circumradius)',
      'Area = r·s (r = inradius, s = semiperimeter)',
    ];
  }

  triangleHeights(a: number, b: number, c: number): { ha: number; hb: number; hc: number } {
    const s = (a + b + c) / 2;
    const area = Math.sqrt(Math.max(0, s * (s - a) * (s - b) * (s - c)));
    return {
      ha: a > 0 ? (2 * area) / a : 0,
      hb: b > 0 ? (2 * area) / b : 0,
      hc: c > 0 ? (2 * area) / c : 0,
    };
  }

  triangleMedians(a: number, b: number, c: number): { ma: number; mb: number; mc: number } {
    return {
      ma: 0.5 * Math.sqrt(Math.max(0, 2 * b * b + 2 * c * c - a * a)),
      mb: 0.5 * Math.sqrt(Math.max(0, 2 * a * a + 2 * c * c - b * b)),
      mc: 0.5 * Math.sqrt(Math.max(0, 2 * a * a + 2 * b * b - c * c)),
    };
  }

  triangleAngleBisectors(a: number, b: number, c: number): { wa: number; wb: number; wc: number } {
    const s = (a + b + c) / 2;
    return {
      wa: (2 * b * c * Math.cos(Math.acos((b * b + c * c - a * a) / (2 * b * c)) / 2)),
      wb: (2 * a * c * Math.cos(Math.acos((a * a + c * c - b * b) / (2 * a * c)) / 2)),
      wc: (2 * a * b * Math.cos(Math.acos((a * a + b * b - c * c) / (2 * a * b)) / 2)),
    };
  }

  apolloniusTheorem(a: number, b: number, c: number): boolean {
    const medians = this.triangleMedians(a, b, c);
    const lhs = b * b + c * c;
    const rhs = 2 * medians.ma * medians.ma + 0.5 * a * a;
    return Math.abs(lhs - rhs) < 1e-6;
  }

  stewartsTheorem(b: number, c: number, m: number, n: number, d: number): boolean {
    const a = m + n;
    return Math.abs(b * b * m + c * c * n - a * (d * d + m * n)) < 1e-6;
  }

  angleInRadians(degrees: number): number {
    return degrees * Math.PI / 180;
  }

  angleInDegrees(radians: number): number {
    return radians * 180 / Math.PI;
  }

  angularVelocity(angle: number, time: number): number {
    return angle / time;
  }

  linearVelocity(radius: number, angularVelocity: number): number {
    return radius * angularVelocity;
  }

  arcLengthFromAngle(radius: number, angleDeg: number): number {
    return radius * this.angleInRadians(angleDeg);
  }

  sectorAreaFromAngle(radius: number, angleDeg: number): number {
    return 0.5 * radius * radius * this.angleInRadians(angleDeg);
  }

  angularSpeed(rpm: number): number {
    return (2 * Math.PI * rpm) / 60;
  }

  unitCircleCoordinates(angleDeg: number): { x: number; y: number } {
    const rad = this.toRadians(angleDeg);
    return { x: Math.cos(rad), y: Math.sin(rad) };
  }

  referenceAngleFor(angleDeg: number): number {
    return this.referenceAngle(angleDeg);
  }

  coterminalAngles(angleDeg: number, count: number = 4): number[] {
    const angles: number[] = [];
    for (let i = 1; i <= count / 2; i++) {
      angles.push(angleDeg + 360 * i);
      angles.push(angleDeg - 360 * i);
    }
    return angles.sort((a, b) => a - b);
  }

  phaseShift(func: 'sin' | 'cos', amplitude: number, period: number, phase: number, vertical: number): {
    amplitude: number;
    period: number;
    phaseShift: number;
    verticalShift: number;
    equation: string;
  } {
    const equation = `${func}(x) = ${amplitude} ${func}[${2 * Math.PI / period}(x - ${phase})] + ${vertical}`;
    return { amplitude, period, phaseShift: phase, verticalShift: vertical, equation };
  }

  simpleHarmonicMotion(amplitude: number, frequency: number, phase: number, t: number): number {
    return amplitude * Math.sin(2 * Math.PI * frequency * t + phase);
  }

  dampedHarmonicMotion(amplitude: number, damping: number, frequency: number, phase: number, t: number): number {
    return amplitude * Math.exp(-damping * t) * Math.sin(2 * Math.PI * frequency * t + phase);
  }

  bearingToStandard(bearing: number): number {
    return (90 - bearing + 360) % 360;
  }

  standardToBearing(angle: number): number {
    return (90 - angle + 360) % 360;
  }

  navigationBearing(angle: number): string {
    const normalized = ((angle % 360) + 360) % 360;
    if (normalized === 0) return 'Due North';
    if (normalized === 90) return 'Due East';
    if (normalized === 180) return 'Due South';
    if (normalized === 270) return 'Due West';
    if (normalized < 90) return `N ${normalized}° E`;
    if (normalized < 180) return `S ${180 - normalized}° E`;
    if (normalized < 270) return `S ${normalized - 180}° W`;
    return `N ${360 - normalized}° W`;
  }

  obliqueTriangle(type: 'AAS' | 'ASA' | 'SAS' | 'SSS' | 'SSA', given: TriangleGiven): Triangle {
    return this.solveTriangle(given);
  }

  elevationAngle(height: number, distance: number): number {
    return this.arctan(height / distance);
  }

  depressionAngle(height: number, distance: number): number {
    return this.arctan(height / distance);
  }

  shadowLength(height: number, sunAngleDeg: number): number {
    return height / Math.tan(this.toRadians(sunAngleDeg));
  }

  treeHeight(shadowLen: number, angleDeg: number): number {
    return shadowLen * Math.tan(this.toRadians(angleDeg));
  }

  distanceByAngle(baseLen: number, angleADeg: number, angleBDeg: number): number {
    const angleC = 180 - angleADeg - angleBDeg;
    const sideC = baseLen;
    const ratio = sideC / this.sin(angleC);
    return ratio * this.sin(angleADeg);
  }

  complexNumberPolar(r: number, thetaDeg: number): { real: number; imaginary: number } {
    const rad = this.toRadians(thetaDeg);
    return { real: r * Math.cos(rad), imaginary: r * Math.sin(rad) };
  }

  complexNumberRectangular(real: number, imaginary: number): { r: number; theta: number } {
    const r = Math.hypot(real, imaginary);
    const theta = this.arctan2(imaginary, real);
    return { r, theta };
  }

  deMoivresTheorem(r: number, thetaDeg: number, n: number): { r: number; theta: number } {
    return { r: Math.pow(r, n), theta: thetaDeg * n };
  }

  nthRoots(r: number, thetaDeg: number, n: number): { r: number; theta: number }[] {
    const roots: { r: number; theta: number }[] = [];
    const rRoot = Math.pow(r, 1 / n);
    for (let k = 0; k < n; k++) {
      roots.push({ r: rRoot, theta: (thetaDeg + 360 * k) / n });
    }
    return roots;
  }

  eulersFormula(): string {
    return 'e^(iθ) = cos θ + i sin θ';
  }

  sinGraph(amplitude: number, period: number, phase: number, vertical: number): {
    amplitude: number;
    period: number;
    phaseShift: number;
    verticalShift: number;
    domain: string;
    range: string;
    equation: string;
  } {
    const equation = `y = ${amplitude} sin(${2 * Math.PI / period}x + ${phase}) + ${vertical}`;
    return {
      amplitude,
      period,
      phaseShift: -phase * period / (2 * Math.PI),
      verticalShift: vertical,
      domain: '(-∞, +∞)',
      range: `[${vertical - Math.abs(amplitude)}, ${vertical + Math.abs(amplitude)}]`,
      equation,
    };
  }

  cosGraph(amplitude: number, period: number, phase: number, vertical: number): {
    amplitude: number;
    period: number;
    phaseShift: number;
    verticalShift: number;
    domain: string;
    range: string;
    equation: string;
  } {
    const equation = `y = ${amplitude} cos(${2 * Math.PI / period}x + ${phase}) + ${vertical}`;
    return {
      amplitude,
      period,
      phaseShift: -phase * period / (2 * Math.PI),
      verticalShift: vertical,
      domain: '(-∞, +∞)',
      range: `[${vertical - Math.abs(amplitude)}, ${vertical + Math.abs(amplitude)}]`,
      equation,
    };
  }

  tanGraph(amplitude: number, period: number, phase: number, vertical: number): {
    amplitude: string;
    period: number;
    phaseShift: number;
    verticalShift: number;
    domain: string;
    range: string;
    asymptotes: string;
    equation: string;
  } {
    const equation = `y = ${amplitude} tan(${2 * Math.PI / period}x + ${phase}) + ${vertical}`;
    return {
      amplitude: 'none (no amplitude for tangent)',
      period,
      phaseShift: -phase * period / (2 * Math.PI),
      verticalShift: vertical,
      domain: `x ≠ ${period / 2 - phase * period / (2 * Math.PI)} + k·${period / 2}`,
      range: '(-∞, +∞)',
      asymptotes: `x = ${period / 4 - phase * period / (2 * Math.PI)} + k·${period / 2}`,
      equation,
    };
  }

  solveSinEquation(a: number, b: number, c: number): {
    solutions: number[];
    generalSolution: string;
    principalSolutions: number[];
  } {
    const sinValue = -c / a;
    if (Math.abs(sinValue) > 1) {
      return { solutions: [], generalSolution: 'no solution', principalSolutions: [] };
    }
    const principal1 = this.arcsin(sinValue);
    const principal2 = 180 - principal1;
    const solutions: number[] = [];
    for (let k = -2; k <= 2; k++) {
      solutions.push(principal1 + 360 * k);
      solutions.push(principal2 + 360 * k);
    }
    solutions.sort((x, y) => x - y);
    const generalSolution = `x = ${principal1}° + 360°k  or  x = ${principal2}° + 360°k, k ∈ ℤ`;
    return {
      solutions,
      generalSolution,
      principalSolutions: [principal1, principal2],
    };
  }

  solveCosEquation(a: number, b: number, c: number): {
    solutions: number[];
    generalSolution: string;
    principalSolutions: number[];
  } {
    const cosValue = -c / a;
    if (Math.abs(cosValue) > 1) {
      return { solutions: [], generalSolution: 'no solution', principalSolutions: [] };
    }
    const principal = this.arccos(cosValue);
    const solutions: number[] = [];
    for (let k = -2; k <= 2; k++) {
      solutions.push(principal + 360 * k);
      solutions.push(-principal + 360 * k);
    }
    solutions.sort((x, y) => x - y);
    const generalSolution = `x = ±${principal}° + 360°k, k ∈ ℤ`;
    return {
      solutions,
      generalSolution,
      principalSolutions: [principal, -principal + 360],
    };
  }

  solveTanEquation(a: number, b: number, c: number): {
    solutions: number[];
    generalSolution: string;
    principalSolution: number;
  } {
    const tanValue = -c / a;
    const principal = this.arctan(tanValue);
    const solutions: number[] = [];
    for (let k = -4; k <= 4; k++) {
      solutions.push(principal + 180 * k);
    }
    solutions.sort((x, y) => x - y);
    const generalSolution = `x = ${principal}° + 180°k, k ∈ ℤ`;
    return {
      solutions,
      generalSolution,
      principalSolution: principal,
    };
  }

  sinSquared(angle: number): number {
    return Math.pow(this.sin(angle), 2);
  }

  cosSquared(angle: number): number {
    return Math.pow(this.cos(angle), 2);
  }

  tanSquared(angle: number): number {
    return Math.pow(this.tan(angle), 2);
  }

  sinCubed(angle: number): number {
    return Math.pow(this.sin(angle), 3);
  }

  cosCubed(angle: number): number {
    return Math.pow(this.cos(angle), 3);
  }

  tanCubed(angle: number): number {
    return Math.pow(this.tan(angle), 3);
  }

  tripleAngleSin(angle: number): number {
    const rad = this.toRadians(angle);
    return 3 * Math.sin(rad) - 4 * Math.pow(Math.sin(rad), 3);
  }

  tripleAngleCos(angle: number): number {
    const rad = this.toRadians(angle);
    return 4 * Math.pow(Math.cos(rad), 3) - 3 * Math.cos(rad);
  }

  tripleAngleTan(angle: number): number {
    const t = this.tan(angle);
    return (3 * t - t * t * t) / (1 - 3 * t * t);
  }

  sumToProductSin(a: number, b: number): number {
    const ra = this.toRadians(a);
    const rb = this.toRadians(b);
    return 2 * Math.sin((ra + rb) / 2) * Math.cos((ra - rb) / 2);
  }

  sumToProductCos(a: number, b: number): number {
    const ra = this.toRadians(a);
    const rb = this.toRadians(b);
    return 2 * Math.cos((ra + rb) / 2) * Math.cos((ra - rb) / 2);
  }

  differenceToProductSin(a: number, b: number): number {
    const ra = this.toRadians(a);
    const rb = this.toRadians(b);
    return 2 * Math.cos((ra + rb) / 2) * Math.sin((ra - rb) / 2);
  }

  differenceToProductCos(a: number, b: number): number {
    const ra = this.toRadians(a);
    const rb = this.toRadians(b);
    return -2 * Math.sin((ra + rb) / 2) * Math.sin((ra - rb) / 2);
  }

  sinOfSum(a: number, b: number): number {
    return this.sumDifference('sin', a, b);
  }

  cosOfSum(a: number, b: number): number {
    return this.sumDifference('cos', a, b);
  }

  tanOfSum(a: number, b: number): number {
    return this.sumDifference('tan', a, b);
  }

  sinOfDifference(a: number, b: number): number {
    const ra = this.toRadians(a);
    const rb = this.toRadians(b);
    return Math.sin(ra - rb);
  }

  cosOfDifference(a: number, b: number): number {
    const ra = this.toRadians(a);
    const rb = this.toRadians(b);
    return Math.cos(ra - rb);
  }

  tanOfDifference(a: number, b: number): number {
    const ra = this.toRadians(a);
    const rb = this.toRadians(b);
    return Math.tan(ra - rb);
  }

  cscDoubleAngle(angle: number): number {
    return 1 / this.doubleAngle('sin', angle);
  }

  secDoubleAngle(angle: number): number {
    return 1 / this.doubleAngle('cos', angle);
  }

  cotDoubleAngle(angle: number): number {
    return 1 / this.doubleAngle('tan', angle);
  }

  cscHalfAngle(angle: number): number {
    return 1 / this.halfAngle('sin', angle);
  }

  secHalfAngle(angle: number): number {
    return 1 / this.halfAngle('cos', angle);
  }

  cotHalfAngle(angle: number): number {
    return 1 / this.halfAngle('tan', angle);
  }

  sineWave(frequency: number, amplitude: number, phase: number, sampleRate: number, duration: number): number[] {
    const samples: number[] = [];
    const totalSamples = Math.floor(sampleRate * duration);
    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      samples.push(amplitude * Math.sin(2 * Math.PI * frequency * t + phase));
    }
    return samples;
  }

  cosineWave(frequency: number, amplitude: number, phase: number, sampleRate: number, duration: number): number[] {
    const samples: number[] = [];
    const totalSamples = Math.floor(sampleRate * duration);
    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      samples.push(amplitude * Math.cos(2 * Math.PI * frequency * t + phase));
    }
    return samples;
  }

  fourierSeriesSquareWave(frequency: number, amplitude: number, harmonics: number, t: number): number {
    let sum = 0;
    for (let n = 1; n <= harmonics; n += 2) {
      sum += (1 / n) * Math.sin(2 * Math.PI * n * frequency * t);
    }
    return (4 * amplitude / Math.PI) * sum;
  }

  fourierSeriesSawtoothWave(frequency: number, amplitude: number, harmonics: number, t: number): number {
    let sum = 0;
    for (let n = 1; n <= harmonics; n++) {
      sum += (1 / n) * Math.sin(2 * Math.PI * n * frequency * t);
    }
    return (2 * amplitude / Math.PI) * sum;
  }

  hyperbolicSin(x: number): number {
    return (Math.exp(x) - Math.exp(-x)) / 2;
  }

  hyperbolicCos(x: number): number {
    return (Math.exp(x) + Math.exp(-x)) / 2;
  }

  hyperbolicTan(x: number): number {
    const ex = Math.exp(x);
    const enx = Math.exp(-x);
    return (ex - enx) / (ex + enx);
  }

  hyperbolicCsc(x: number): number {
    if (Math.abs(x) < 1e-12) return Infinity;
    return 2 / (Math.exp(x) - Math.exp(-x));
  }

  hyperbolicSec(x: number): number {
    return 2 / (Math.exp(x) + Math.exp(-x));
  }

  hyperbolicCot(x: number): number {
    const ex = Math.exp(x);
    const enx = Math.exp(-x);
    if (Math.abs(ex - enx) < 1e-12) return Infinity;
    return (ex + enx) / (ex - enx);
  }

  inverseHyperbolicSin(x: number): number {
    return Math.log(x + Math.sqrt(x * x + 1));
  }

  inverseHyperbolicCos(x: number): number {
    if (x < 1) return NaN;
    return Math.log(x + Math.sqrt(x * x - 1));
  }

  inverseHyperbolicTan(x: number): number {
    if (Math.abs(x) >= 1) return NaN;
    return 0.5 * Math.log((1 + x) / (1 - x));
  }

  cosineRuleAngle(a: number, b: number, c: number): number {
    const cosC = (a * a + b * b - c * c) / (2 * a * b);
    return this.arccos(Math.max(-1, Math.min(1, cosC)));
  }

  sineRuleSide(a: number, A: number, B: number): number {
    return (a * this.sin(B)) / this.sin(A);
  }

  sineRuleAngle(a: number, b: number, A: number): number {
    const sinB = (b * this.sin(A)) / a;
    return this.arcsin(Math.max(-1, Math.min(1, sinB)));
  }

  areaFromTwoSidesIncludedAngle(a: number, b: number, C: number): number {
    return this.areaOfTriangle(a, b, C);
  }

  areaFromThreeSides(a: number, b: number, c: number): number {
    return this.heronArea(a, b, c);
  }

  areaFromSideAndTwoAngles(a: number, B: number, C: number): number {
    const A = 180 - B - C;
    const b = this.sineRuleSide(a, A, B);
    return this.areaOfTriangle(a, b, C);
  }

  areaFromBaseHeight(base: number, height: number): number {
    return 0.5 * base * height;
  }

  circumradiusFromSides(a: number, b: number, c: number): number {
    const area = this.heronArea(a, b, c);
    if (area < 1e-12) return Infinity;
    return (a * b * c) / (4 * area);
  }

  inradiusFromSides(a: number, b: number, c: number): number {
    return this.inradius(a, b, c);
  }

  semiperimeter(a: number, b: number, c: number): number {
    return (a + b + c) / 2;
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
