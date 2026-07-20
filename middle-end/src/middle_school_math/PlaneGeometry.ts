import { DataPacket, PacketMeta } from '../shared/types';

/** A point in the 2D plane. */
export interface Point {
  x: number;
  y: number;
  label: string;
}

/** A directed edge between two points. */
export interface Edge {
  start: Point;
  end: Point;
  length: number;
}

/** Type alias for figure kinds tracked by the engine. */
export type FigureType = 'triangle' | 'quadrilateral' | 'circle' | 'polygon';

/** A geometric figure composed of vertices and edges. */
export interface GeometricFigure {
  id: string;
  type: FigureType;
  vertices: Point[];
  edges: Edge[];
  properties: Map<string, unknown>;
}

/** A single reasoning step in a formal proof. */
export interface ProofStep {
  statement: string;
  reason: string;
  basedOn: string[];
}

/** A structured proof. */
export interface Proof {
  statement: string;
  given: string;
  toProve: string;
  steps: ProofStep[];
  conclusion: string;
}

/** Triangle congruence criterion. */
export type CongruenceMethod = 'SSS' | 'SAS' | 'ASA' | 'AAS' | 'HL';

/** Triangle similarity criterion. */
export type SimilarityMethod = 'AA' | 'SAS' | 'SSS';

/** Quadrilateral type classification. */
export type QuadrilateralType = 'parallelogram' | 'rectangle' | 'rhombus' | 'square' | 'trapezoid' | 'kite' | 'general';

/** Circle tangent result. */
export interface TangentResult {
  point: Point;
  length: number;
  angle: number;
}

/** Circle sector area result. */
export interface SectorResult {
  radius: number;
  angle: number;
  area: number;
  arcLength: number;
}

/** Polygon properties result. */
export interface PolygonProperties {
  sides: number;
  sideLength: number;
  perimeter: number;
  area: number;
  interiorAngle: number;
  exteriorAngle: number;
  apothem: number;
}

/** Triangle special points (centroid, circumcenter, etc. */
export interface TriangleCenters {
  centroid: Point;
  circumcenter: Point;
  incenter: Point;
  orthocenter: Point;
}

/** Median of a triangle. */
export interface Median {
  vertex: Point;
  midpoint: Point;
  length: number;
}

/** Altitude of a triangle. */
export interface Altitude {
  vertex: Point;
  foot: Point;
  length: number;
}

export class PlaneGeometry {
  private _figures: Map<string, GeometricFigure> = new Map();
  private _proofs: Proof[] = [];
  private _history: unknown[] = [];
  private _theorems: Map<string, string> = new Map();
  private _counter = 0;
  private _triangleCenters: TriangleCenters[] = [];

  createTriangle(a: number, b: number, c: number): GeometricFigure {
    if (a + b <= c || a + c <= b || b + c <= a) {
      throw new Error('Invalid triangle: violates triangle inequality');
    }
    const A: Point = { x: 0, y: 0, label: 'A' };
    const B: Point = { x: c, y: 0, label: 'B' };
    const cosA = (b * b + c * c - a * a) / (2 * b * c);
    const C: Point = { x: b * cosA, y: b * Math.sqrt(Math.max(0, 1 - cosA * cosA)), label: 'C' };
    const vertices = [A, B, C];
    const edges: Edge[] = [
      { start: A, end: B, length: c },
      { start: B, end: C, length: a },
      { start: C, end: A, length: b },
    ];
    const id = `tri-${++this._counter}`;
    const props = new Map<string, unknown>();
    props.set('sideA', a);
    props.set('sideB', b);
    props.set('sideC', c);
    const semi = (a + b + c) / 2;
    const area = Math.sqrt(semi * (semi - a) * (semi - b) * (semi - c));
    props.set('area', area);
    const figure: GeometricFigure = { id, type: 'triangle', vertices, edges, properties: props };
    this._figures.set(id, figure);
    this._history.push({ op: 'createTriangle', figure });
    return figure;
  }

  createQuadrilateral(points: Point[]): GeometricFigure {
    if (points.length !== 4) throw new Error('Quadrilateral requires exactly 4 vertices');
    const edges: Edge[] = [];
    for (let i = 0; i < 4; i++) {
      const next = (i + 1) % 4;
      edges.push({ start: points[i], end: points[next], length: this.distance(points[i], points[next]) });
    }
    const id = `quad-${++this._counter}`;
    const props = new Map<string, unknown>();
    const perimeter = edges.reduce((s, e) => s + e.length, 0);
    props.set('perimeter', perimeter);
    const figure: GeometricFigure = {
      id,
      type: 'quadrilateral',
      vertices: [...points],
      edges,
      properties: props,
    };
    this._figures.set(id, figure);
    this._history.push({ op: 'createQuadrilateral', figure });
    return figure;
  }

  createCircle(center: Point, radius: number): GeometricFigure {
    if (radius <= 0) throw new Error('Radius must be positive');
    const id = `circle-${++this._counter}`;
    const props = new Map<string, unknown>();
    props.set('radius', radius);
    props.set('circumference', 2 * Math.PI * radius);
    props.set('area', Math.PI * radius * radius);
    const figure: GeometricFigure = {
      id,
      type: 'circle',
      vertices: [center],
      edges: [],
      properties: props,
    };
    this._figures.set(id, figure);
    this._history.push({ op: 'createCircle', figure });
    return figure;
  }

  createRegularPolygon(sides: number, sideLength: number, center: Point = { x: 0, y: 0, label: 'center' }): GeometricFigure {
    if (sides < 3) throw new Error('Polygon must have at least 3 sides');
    const vertices: Point[] = [];
    const apothem = sideLength / (2 * Math.tan(Math.PI / sides));
    const radius = sideLength / (2 * Math.sin(Math.PI / sides));
    for (let i = 0; i < sides; i++) {
      const angle = (2 * Math.PI * i) / sides - Math.PI / 2;
      vertices.push({
        x: center.x + radius * Math.cos(angle),
        y: center.y + radius * Math.sin(angle),
        label: `P${i + 1}`,
      });
    }
    const edges: Edge[] = [];
    for (let i = 0; i < sides; i++) {
      const next = (i + 1) % sides;
      edges.push({ start: vertices[i], end: vertices[next], length: sideLength });
    }
    const id = `poly-${++this._counter}`;
    const props = new Map<string, unknown>();
    const area = (sides * sideLength * apothem) / 2;
    props.set('sides', sides);
    props.set('sideLength', sideLength);
    props.set('perimeter', sides * sideLength);
    props.set('area', area);
    props.set('apothem', apothem);
    props.set('interiorAngle', ((sides - 2) * 180) / sides);
    const figure: GeometricFigure = {
      id,
      type: 'polygon',
      vertices,
      edges,
      properties: props,
    };
    this._figures.set(id, figure);
    this._history.push({ op: 'createRegularPolygon', figure });
    return figure;
  }

  angleAt(vertex: Point, p1: Point, p2: Point): number {
    const v1x = p1.x - vertex.x;
    const v1y = p1.y - vertex.y;
    const v2x = p2.x - vertex.x;
    const v2y = p2.y - vertex.y;
    const dot = v1x * v2x + v1y * v2y;
    const m1 = Math.hypot(v1x, v1y);
    const m2 = Math.hypot(v2x, v2y);
    if (m1 === 0 || m2 === 0) return 0;
    const cos = Math.max(-1, Math.min(1, dot / (m1 * m2)));
    const rad = Math.acos(cos);
    return rad * 180 / Math.PI;
  }

  distance(p1: Point, p2: Point): number {
    return Math.hypot(p1.x - p2.x, p1.y - p2.y);
  }

  midpoint(p1: Point, p2: Point): Point {
    return {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2,
      label: `midpoint(${p1.label},${p2.label})`,
    };
  }

  isParallel(edge1: Edge, edge2: Edge): boolean {
    const dx1 = edge1.end.x - edge1.start.x;
    const dy1 = edge1.end.y - edge1.start.y;
    const dx2 = edge2.end.x - edge2.start.x;
    const dy2 = edge2.end.y - edge2.start.y;
    if (Math.abs(dx1) < 1e-12 && Math.abs(dx2) < 1e-12) return true;
    if (Math.abs(dx1) < 1e-12 || Math.abs(dx2) < 1e-12) return false;
    return Math.abs(dy1 * dx2 - dy2 * dx1) < 1e-9;
  }

  isPerpendicular(edge1: Edge, edge2: Edge): boolean {
    const dx1 = edge1.end.x - edge1.start.x;
    const dy1 = edge1.end.y - edge1.start.y;
    const dx2 = edge2.end.x - edge2.start.x;
    const dy2 = edge2.end.y - edge2.start.y;
    const dot = dx1 * dx2 + dy1 * dy2;
    return Math.abs(dot) < 1e-9;
  }

  isCongruent(fig1: GeometricFigure, fig2: GeometricFigure): boolean {
    if (fig1.type !== fig2.type) return false;
    if (fig1.type === 'triangle') {
      const s1 = fig1.edges.map(e => e.length).sort((a, b) => a - b);
      const s2 = fig2.edges.map(e => e.length).sort((a, b) => a - b);
      return s1.every((v, i) => Math.abs(v - s2[i]) < 1e-6);
    }
    if (fig1.type === 'circle') {
      const r1 = fig1.properties.get('radius') as number;
      const r2 = fig2.properties.get('radius') as number;
      return Math.abs(r1 - r2) < 1e-6;
    }
    return false;
  }

  isSimilar(fig1: GeometricFigure, fig2: GeometricFigure): boolean {
    if (fig1.type !== fig2.type) return false;
    if (fig1.type === 'triangle') {
      const s1 = fig1.edges.map(e => e.length).sort((a, b) => a - b);
      const s2 = fig2.edges.map(e => e.length).sort((a, b) => a - b);
      const ratio = s2[0] / s1[0];
      return s1.every((v, i) => Math.abs(s2[i] / v - ratio) < 1e-6);
    }
    if (fig1.type === 'circle') return true;
    return false;
  }

  proveCongruent(fig1: GeometricFigure, fig2: GeometricFigure, method: CongruenceMethod): Proof {
    const steps: ProofStep[] = [];
    const s1 = fig1.edges.map(e => e.length);
    const s2 = fig2.edges.map(e => e.length);
    let valid = false;
    switch (method) {
      case 'SSS':
        valid = s1.every((v, i) => Math.abs(v - s2[i]) < 1e-6);
        steps.push({ statement: 'All three pairs of sides equal', reason: 'given', basedOn: ['side lengths'] });
        break;
      case 'SAS':
        valid = Math.abs(s1[0] - s2[0]) < 1e-6 && Math.abs(s1[2] - s2[2]) < 1e-6;
        steps.push({ statement: 'Two sides and included angle equal', reason: 'given', basedOn: ['sides', 'angle'] });
        break;
      case 'ASA':
        valid = true;
        steps.push({ statement: 'Two angles and included side equal', reason: 'given', basedOn: ['angles', 'side'] });
        break;
      case 'AAS':
        valid = true;
        steps.push({ statement: 'Two angles and a non-included side equal', reason: 'given', basedOn: ['angles', 'side'] });
        break;
      case 'HL':
        valid = true;
        steps.push({ statement: 'Hypotenuse and one leg equal', reason: 'given', basedOn: ['hypotenuse', 'leg'] });
        break;
    }
    steps.push({ statement: `Triangles satisfy ${method}`, reason: method, basedOn: ['previous step'] });
    const proof: Proof = {
      statement: `${fig1.id} ≅ ${fig2.id}`,
      given: `${fig1.id} and ${fig2.id} share ${method} criteria`,
      toProve: 'the two triangles are congruent',
      steps,
      conclusion: valid ? 'Triangles are congruent' : 'Congruence cannot be established',
    };
    this._proofs.push(proof);
    this._history.push({ op: 'proveCongruent', proof });
    return proof;
  }

  proveSimilar(fig1: GeometricFigure, fig2: GeometricFigure, method: SimilarityMethod): Proof {
    const steps: ProofStep[] = [];
    switch (method) {
      case 'AA':
        steps.push({ statement: 'Two pairs of angles equal', reason: 'given', basedOn: ['angles'] });
        break;
      case 'SAS':
        steps.push({ statement: 'Two proportional sides and included angle equal', reason: 'given', basedOn: ['sides', 'angle'] });
        break;
      case 'SSS':
        steps.push({ statement: 'Three proportional sides', reason: 'given', basedOn: ['sides'] });
        break;
    }
    steps.push({ statement: `Triangles satisfy ${method} similarity`, reason: method, basedOn: ['previous step'] });
    const similar = this.isSimilar(fig1, fig2);
    const proof: Proof = {
      statement: `${fig1.id} ~ ${fig2.id}`,
      given: `${fig1.id} and ${fig2.id} with ${method} criteria`,
      toProve: 'the two triangles are similar',
      steps,
      conclusion: similar ? 'Triangles are similar' : 'Similarity cannot be established',
    };
    this._proofs.push(proof);
    this._history.push({ op: 'proveSimilar', proof });
    return proof;
  }

  pythagoreanTheorem(a: number, b: number): number {
    return Math.sqrt(a * a + b * b);
  }

  pythagoreanConverse(a: number, b: number, c: number): boolean {
    const sorted = [a, b, c].sort((x, y) => x - y);
    const [leg1, leg2, hyp] = sorted;
    return Math.abs(leg1 * leg1 + leg2 * leg2 - hyp * hyp) < 1e-9;
  }

  registerTheorem(name: string, statement: string): void {
    this._theorems.set(name, statement);
    this._history.push({ op: 'registerTheorem', name });
  }

  polygonPerimeter(vertices: Point[]): number {
    if (vertices.length < 2) return 0;
    let perimeter = 0;
    for (let i = 0; i < vertices.length; i++) {
      const next = (i + 1) % vertices.length;
      perimeter += this.distance(vertices[i], vertices[next]);
    }
    return perimeter;
  }

  polygonArea(vertices: Point[]): number {
    if (vertices.length < 3) return 0;
    let sum = 0;
    for (let i = 0; i < vertices.length; i++) {
      const next = (i + 1) % vertices.length;
      sum += vertices[i].x * vertices[next].y - vertices[next].x * vertices[i].y;
    }
    return Math.abs(sum) / 2;
  }

  triangleInradius(a: number, b: number, c: number): number {
    const s = (a + b + c) / 2;
    const area = Math.sqrt(Math.max(0, s * (s - a) * (s - b) * (s - c)));
    if (s === 0) return 0;
    return area / s;
  }

  triangleCircumradius(a: number, b: number, c: number): number {
    const s = (a + b + c) / 2;
    const area = Math.sqrt(Math.max(0, s * (s - a) * (s - b) * (s - c)));
    if (area < 1e-12) return Infinity;
    return (a * b * c) / (4 * area);
  }

  triangleKind(a: number, b: number, c: number): 'acute' | 'right' | 'obtuse' {
    const [s1, s2, s3] = [a, b, c].sort((x, y) => x - y);
    const sum = s1 * s1 + s2 * s2 - s3 * s3;
    if (Math.abs(sum) < 1e-9) return 'right';
    return sum > 0 ? 'acute' : 'obtuse';
  }

  triangleCentroid(triangle: GeometricFigure): Point {
    if (triangle.type !== 'triangle') throw new Error('Figure is not a triangle');
    const v = triangle.vertices;
    return {
      x: (v[0].x + v[1].x + v[2].x) / 3,
      y: (v[0].y + v[1].y + v[2].y) / 3,
      label: 'centroid',
    };
  }

  triangleCircumcenter(triangle: GeometricFigure): Point {
    if (triangle.type !== 'triangle') throw new Error('Figure is not a triangle');
    const [A, B, C] = triangle.vertices;
    const d = 2 * (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y));
    if (Math.abs(d) < 1e-12) return { x: 0, y: 0, label: 'circumcenter' };
    const ux = ((A.x * A.x + A.y * A.y) * (B.y - C.y) + (B.x * B.x + B.y * B.y) * (C.y - A.y) + (C.x * C.x + C.y * C.y) * (A.y - B.y)) / d;
    const uy = ((A.x * A.x + A.y * A.y) * (C.x - B.x) + (B.x * B.x + B.y * B.y) * (A.x - C.x) + (C.x * C.x + C.y * C.y) * (B.x - A.x)) / d;
    return { x: ux, y: uy, label: 'circumcenter' };
  }

  triangleIncenter(triangle: GeometricFigure): Point {
    if (triangle.type !== 'triangle') throw new Error('Figure is not a triangle');
    const [A, B, C] = triangle.vertices;
    const a = this.distance(B, C);
    const b = this.distance(A, C);
    const c = this.distance(A, B);
    const p = a + b + c;
    if (p === 0) return { x: 0, y: 0, label: 'incenter' };
    return {
      x: (a * A.x + b * B.x + c * C.x) / p,
      y: (a * A.y + b * B.y + c * C.y) / p,
      label: 'incenter',
    };
  }

  triangleOrthocenter(triangle: GeometricFigure): Point {
    if (triangle.type !== 'triangle') throw new Error('Figure is not a triangle');
    const centroid = this.triangleCentroid(triangle);
    const circumcenter = this.triangleCircumcenter(triangle);
    return {
      x: 3 * centroid.x - 2 * circumcenter.x,
      y: 3 * centroid.y - 2 * circumcenter.y,
      label: 'orthocenter',
    };
  }

  triangleMedians(triangle: GeometricFigure): Median[] {
    if (triangle.type !== 'triangle') throw new Error('Figure is not a triangle');
    const [A, B, C] = triangle.vertices;
    const medians: Median[] = [];
    const midBC = this.midpoint(B, C);
    medians.push({ vertex: A, midpoint: midBC, length: this.distance(A, midBC) });
    const midAC = this.midpoint(A, C);
    medians.push({ vertex: B, midpoint: midAC, length: this.distance(B, midAC) });
    const midAB = this.midpoint(A, B);
    medians.push({ vertex: C, midpoint: midAB, length: this.distance(C, midAB) });
    return medians;
  }

  triangleAltitudes(triangle: GeometricFigure): Altitude[] {
    if (triangle.type !== 'triangle') throw new Error('Figure is not a triangle');
    const [A, B, C] = triangle.vertices;
    const altitudes: Altitude[] = [];
    const area = this.polygonArea([A, B, C]);
    const a = this.distance(B, C);
    const b = this.distance(A, C);
    const c = this.distance(A, B);
    altitudes.push({ vertex: A, foot: B, length: (2 * area) / a });
    altitudes.push({ vertex: B, foot: C, length: (2 * area) / b });
    altitudes.push({ vertex: C, foot: A, length: (2 * area) / c });
    return altitudes;
  }

  classifyQuadrilateral(quad: GeometricFigure): QuadrilateralType {
    if (quad.type !== 'quadrilateral') return 'general';
    const edges = quad.edges;
    const s = edges.map(e => e.length);
    const sidesEqual = Math.abs(s[0] - s[2]) < 1e-9 && Math.abs(s[1] - s[3]) < 1e-9;
    const allSidesEqual = s.every(v => Math.abs(v - s[0]) < 1e-9);
    const diagonalsEqual = Math.abs(this.distance(quad.vertices[0], quad.vertices[2]) - this.distance(quad.vertices[1], quad.vertices[3])) < 1e-9;
    const sidesParallel = this.isParallel(edges[0], edges[2]) && this.isParallel(edges[1], edges[3]);
    const sidesPerpendicular = this.isPerpendicular(edges[0], edges[1]);
    if (allSidesEqual && diagonalsEqual && sidesPerpendicular) return 'square';
    if (allSidesEqual && sidesParallel) return 'rhombus';
    if (sidesEqual && sidesParallel && sidesPerpendicular) return 'rectangle';
    if (sidesEqual && sidesParallel) return 'parallelogram';
    if (this.isParallel(edges[0], edges[2]) || this.isParallel(edges[1], edges[3])) return 'trapezoid';
    const adjEqual = (Math.abs(s[0] - s[1]) < 1e-9 && Math.abs(s[2] - s[3]) < 1e-9) ||
      (Math.abs(s[1] - s[2]) < 1e-9 && Math.abs(s[0] - s[3]) < 1e-9);
    if (adjEqual) return 'kite';
    return 'general';
  }

  tangentLengthFromPoint(circle: GeometricFigure, external: Point): number {
    if (circle.type !== 'circle') return 0;
    const center = circle.vertices[0];
    const radius = circle.properties.get('radius') as number;
    const d = this.distance(center, external);
    return Math.sqrt(Math.max(0, d * d - radius * radius));
  }

  circleSectorArea(radius: number, angleDegrees: number): SectorResult {
    const angleRadians = angleDegrees * Math.PI / 180;
    const area = 0.5 * radius * radius * angleRadians;
    const arcLength = radius * angleRadians;
    const result: SectorResult = { radius, angle: angleDegrees, area, arcLength };
    this._history.push({ op: 'circleSectorArea', result });
    return result;
  }

  circleSegmentArea(radius: number, angleDegrees: number): number {
    const angleRadians = angleDegrees * Math.PI / 180;
    return 0.5 * radius * radius * (angleRadians - Math.sin(angleRadians));
  }

  arcLength(radius: number, angleDegrees: number): number {
    return radius * angleDegrees * Math.PI / 180;
  }

  annulusArea(outerRadius: number, innerRadius: number): number {
    return Math.PI * (outerRadius * outerRadius - innerRadius * innerRadius);
  }

  regularPolygonProperties(sides: number, sideLength: number): PolygonProperties {
    const perimeter = sides * sideLength;
    const apothem = sideLength / (2 * Math.tan(Math.PI / sides));
    const area = (perimeter * apothem) / 2;
    const interiorAngle = ((sides - 2) * 180) / sides;
    const exteriorAngle = 360 / sides;
    return { sides, sideLength, perimeter, area, interiorAngle, exteriorAngle, apothem };
  }

  sumOfInteriorAngles(sides: number): number {
    return (sides - 2) * 180;
  }

  sumOfExteriorAngles(): number {
    return 360;
  }

  isoscelesTriangleBaseAngles(vertexAngle: number): number {
    return (180 - vertexAngle) / 2;
  }

  equilateralTriangleArea(side: number): number {
    return (Math.sqrt(3) / 4) * side * side;
  }

  rightTriangleLegs(hypotenuse: number, angle: number): { opposite: number; adjacent: number } {
    const rad = angle * Math.PI / 180;
    return {
      opposite: hypotenuse * Math.sin(rad),
      adjacent: hypotenuse * Math.cos(rad),
    };
  }

  thalesTheorem(diameterEnd1: Point, diameterEnd2: Point, pointOnCircle: Point): boolean {
    const angle = this.angleAt(pointOnCircle, diameterEnd1, diameterEnd2);
    return Math.abs(angle - 90) < 1e-9;
  }

  inscribedAngleTheorem(centralAngle: number): number {
    return centralAngle / 2;
  }

  powerOfPoint(externalDistance: number, radius: number): number {
    return externalDistance * externalDistance - radius * radius;
  }

  cyclicQuadrilateralOppositeAngles(angleA: number, angleC: number): boolean {
    return Math.abs(angleA + angleC - 180) < 1e-9;
  }

  triangleAngleBisector(sideA: number, sideB: number, sideC: number, vertex: 'A' | 'B' | 'C'): number {
    const s = (sideA + sideB + sideC) / 2;
    let length = 0;
    if (vertex === 'A') {
      length = (2 * sideB * sideC * Math.cos(Math.acos((sideB * sideB + sideC * sideC - sideA * sideA) / (2 * sideB * sideC)) / 2));
    } else if (vertex === 'B') {
      length = (2 * sideA * sideC * Math.cos(Math.acos((sideA * sideA + sideC * sideC - sideB * sideB) / (2 * sideA * sideC)) / 2));
    } else {
      length = (2 * sideA * sideB * Math.cos(Math.acos((sideA * sideA + sideB * sideB - sideC * sideC) / (2 * sideA * sideB)) / 2));
    }
    return length;
  }

  triangleExteriorAngle(interiorAngle: number): number {
    return 180 - interiorAngle;
  }

  triangleAngleSum(): number {
    return 180;
  }

  exteriorAngleTheorem(remoteAngle1: number, remoteAngle2: number): number {
    return remoteAngle1 + remoteAngle2;
  }

  midsegmentTheorem(base: number): number {
    return base / 2;
  }

  triangleInequalityTheorem(a: number, b: number, c: number): boolean {
    return a + b > c && a + c > b && b + c > a;
  }

  parallelogramOppositeSidesEqual(quad: GeometricFigure): boolean {
    if (quad.type !== 'quadrilateral') return false;
    const s = quad.edges.map(e => e.length);
    return Math.abs(s[0] - s[2]) < 1e-9 && Math.abs(s[1] - s[3]) < 1e-9;
  }

  parallelogramOppositeAnglesEqual(quad: GeometricFigure): boolean {
    if (quad.type !== 'quadrilateral') return false;
    const v = quad.vertices;
    const a1 = this.angleAt(v[0], v[3], v[1]);
    const a2 = this.angleAt(v[2], v[1], v[3]);
    return Math.abs(a1 - a2) < 1e-9;
  }

  parallelogramDiagonalsBisect(quad: GeometricFigure): boolean {
    if (quad.type !== 'quadrilateral') return false;
    const v = quad.vertices;
    const mid1 = this.midpoint(v[0], v[2]);
    const mid2 = this.midpoint(v[1], v[3]);
    return Math.abs(mid1.x - mid2.x) < 1e-9 && Math.abs(mid1.y - mid2.y) < 1e-9;
  }

  rectangleDiagonalsEqual(quad: GeometricFigure): boolean {
    if (quad.type !== 'quadrilateral') return false;
    const v = quad.vertices;
    const d1 = this.distance(v[0], v[2]);
    const d2 = this.distance(v[1], v[3]);
    return Math.abs(d1 - d2) < 1e-9;
  }

  rhombusDiagonalsPerpendicular(quad: GeometricFigure): boolean {
    if (quad.type !== 'quadrilateral') return false;
    const v = quad.vertices;
    const diag1: Edge = { start: v[0], end: v[2], length: this.distance(v[0], v[2]) };
    const diag2: Edge = { start: v[1], end: v[3], length: this.distance(v[1], v[3]) };
    return this.isPerpendicular(diag1, diag2);
  }

  trapezoidMedianLength(base1: number, base2: number): number {
    return (base1 + base2) / 2;
  }

  isoscelesTrapezoidBaseAnglesEqual(angle1: number, angle2: number): boolean {
    return Math.abs(angle1 - angle2) < 1e-9;
  }

  kitePerimeter(side1: number, side2: number): number {
    return 2 * (side1 + side2);
  }

  kiteArea(diagonal1: number, diagonal2: number): number {
    return (diagonal1 * diagonal2) / 2;
  }

  squareDiagonal(side: number): number {
    return side * Math.sqrt(2);
  }

  squareSideFromDiagonal(diagonal: number): number {
    return diagonal / Math.sqrt(2);
  }

  circleChordLength(radius: number, angleDegrees: number): number {
    const angleRadians = angleDegrees * Math.PI / 180;
    return 2 * radius * Math.sin(angleRadians / 2);
  }

  circleChordDistanceFromCenter(radius: number, chordLength: number): number {
    return Math.sqrt(Math.max(0, radius * radius - (chordLength / 2) * (chordLength / 2)));
  }

  intersectingChordsTheorem(segment1a: number, segment1b: number, segment2a: number, segment2b: number): boolean {
    return Math.abs(segment1a * segment1b - segment2a * segment2b) < 1e-9;
  }

  secantSegmentTheorem(whole1: number, external1: number, whole2: number, external2: number): boolean {
    return Math.abs(whole1 * external1 - whole2 * external2) < 1e-9;
  }

  tangentSegmentTheorem(tangentLength: number, secantWhole: number, secantExternal: number): boolean {
    return Math.abs(tangentLength * tangentLength - secantWhole * secantExternal) < 1e-9;
  }

  commonExternalTangent(distance: number, r1: number, r2: number): number {
    return Math.sqrt(Math.max(0, distance * distance - (r1 - r2) * (r1 - r2)));
  }

  commonInternalTangent(distance: number, r1: number, r2: number): number {
    return Math.sqrt(Math.max(0, distance * distance - (r1 + r2) * (r1 + r2)));
  }

  luneArea(radius1: number, radius2: number, distance: number): number {
    const d = distance;
    const r1 = radius1;
    const r2 = radius2;
    const a1 = 2 * Math.acos((d * d + r1 * r1 - r2 * r2) / (2 * d * r1));
    const a2 = 2 * Math.acos((d * d + r2 * r2 - r1 * r1) / (2 * d * r2));
    return 0.5 * r1 * r1 * (a1 - Math.sin(a1)) + 0.5 * r2 * r2 * (a2 - Math.sin(a2));
  }

  heronsFormula(a: number, b: number, c: number): number {
    const s = (a + b + c) / 2;
    return Math.sqrt(Math.max(0, s * (s - a) * (s - b) * (s - c)));
  }

  brahmaguptasFormula(a: number, b: number, c: number, d: number): number {
    const s = (a + b + c + d) / 2;
    return Math.sqrt(Math.max(0, (s - a) * (s - b) * (s - c) * (s - d)));
  }

  pythagoreanTriple(a: number, b: number, c: number): boolean {
    const sorted = [a, b, c].sort((x, y) => x - y);
    return Math.abs(sorted[0] * sorted[0] + sorted[1] * sorted[1] - sorted[2] * sorted[2]) < 1e-9 &&
      Number.isInteger(sorted[0]) && Number.isInteger(sorted[1]) && Number.isInteger(sorted[2]);
  }

  generatePythagoreanTriple(m: number, n: number): { a: number; b: number; c: number } {
    if (m <= n || n <= 0) throw new Error('m > n > 0 required');
    return {
      a: m * m - n * n,
      b: 2 * m * n,
      c: m * m + n * n,
    };
  }

  goldenRatio(): number {
    return (1 + Math.sqrt(5)) / 2;
  }

  geometricMean(a: number, b: number): number {
    return Math.sqrt(a * b);
  }

  harmonicMean(a: number, b: number): number {
    return (2 * a * b) / (a + b);
  }

  arithmeticMean(a: number, b: number): number {
    return (a + b) / 2;
  }

  meanInequality(a: number, b: number): { HM: number; GM: number; AM: number; QM: number } {
    const am = this.arithmeticMean(a, b);
    const gm = this.geometricMean(a, b);
    const hm = this.harmonicMean(a, b);
    const qm = Math.sqrt((a * a + b * b) / 2);
    return { HM: hm, GM: gm, AM: am, QM: qm };
  }

  reflectionOverXAxis(point: Point): Point {
    return { x: point.x, y: -point.y, label: `${point.label}'` };
  }

  reflectionOverYAxis(point: Point): Point {
    return { x: -point.x, y: point.y, label: `${point.label}'` };
  }

  reflectionOverOrigin(point: Point): Point {
    return { x: -point.x, y: -point.y, label: `${point.label}'` };
  }

  rotation90CW(point: Point, center: Point = { x: 0, y: 0, label: 'origin' }): Point {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    return {
      x: center.x + dy,
      y: center.y - dx,
      label: `${point.label}'`,
    };
  }

  rotation90CCW(point: Point, center: Point = { x: 0, y: 0, label: 'origin' }): Point {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    return {
      x: center.x - dy,
      y: center.y + dx,
      label: `${point.label}'`,
    };
  }

  rotation180(point: Point, center: Point = { x: 0, y: 0, label: 'origin' }): Point {
    return {
      x: 2 * center.x - point.x,
      y: 2 * center.y - point.y,
      label: `${point.label}'`,
    };
  }

  translation(point: Point, dx: number, dy: number): Point {
    return { x: point.x + dx, y: point.y + dy, label: `${point.label}'` };
  }

  dilation(point: Point, scaleFactor: number, center: Point = { x: 0, y: 0, label: 'origin' }): Point {
    return {
      x: center.x + scaleFactor * (point.x - center.x),
      y: center.y + scaleFactor * (point.y - center.y),
      label: `${point.label}'`,
    };
  }

  toPacket(): DataPacket<{
    figures: Map<string, GeometricFigure>;
    proofs: Proof[];
    theorems: Map<string, string>;
    history: unknown[];
    triangleCenters: TriangleCenters[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['middle_school_math', 'PlaneGeometry'],
      priority: 1,
      phase: 'plane_geometry',
    };
    return {
      id: `planegeo-${Date.now().toString(36)}`,
      payload: {
        figures: this._figures,
        proofs: this._proofs,
        theorems: this._theorems,
        history: this._history,
        triangleCenters: this._triangleCenters,
      },
      metadata,
    };
  }

  reset(): void {
    this._figures = new Map();
    this._proofs = [];
    this._history = [];
    this._theorems = new Map();
    this._counter = 0;
    this._triangleCenters = [];
  }

  get figureCount(): number {
    return this._figures.size;
  }

  get proofCount(): number {
    return this._proofs.length;
  }

  get theoremCount(): number {
    return this._theorems.size;
  }

  get triangleCenterCount(): number {
    return this._triangleCenters.length;
  }
}
