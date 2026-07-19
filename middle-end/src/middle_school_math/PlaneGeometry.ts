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

export class PlaneGeometry {
  private _figures: Map<string, GeometricFigure> = new Map();
  private _proofs: Proof[] = [];
  private _history: unknown[] = [];
  private _theorems: Map<string, string> = new Map();
  private _counter = 0;

  createTriangle(a: number, b: number, c: number): GeometricFigure {
    if (a + b <= c || a + c <= b || b + c <= a) {
      throw new Error('Invalid triangle: violates triangle inequality');
    }
    // Place A at origin, B at (c, 0), C by intersection
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

  /** Compute the perimeter of a polygon given its vertices. */
  polygonPerimeter(vertices: Point[]): number {
    if (vertices.length < 2) return 0;
    let perimeter = 0;
    for (let i = 0; i < vertices.length; i++) {
      const next = (i + 1) % vertices.length;
      perimeter += this.distance(vertices[i], vertices[next]);
    }
    return perimeter;
  }

  /** Compute the area of a polygon via the shoelace formula. */
  polygonArea(vertices: Point[]): number {
    if (vertices.length < 3) return 0;
    let sum = 0;
    for (let i = 0; i < vertices.length; i++) {
      const next = (i + 1) % vertices.length;
      sum += vertices[i].x * vertices[next].y - vertices[next].x * vertices[i].y;
    }
    return Math.abs(sum) / 2;
  }

  /** Compute the inradius of a triangle given its side lengths. */
  triangleInradius(a: number, b: number, c: number): number {
    const s = (a + b + c) / 2;
    const area = Math.sqrt(Math.max(0, s * (s - a) * (s - b) * (s - c)));
    if (s === 0) return 0;
    return area / s;
  }

  /** Compute the circumradius of a triangle given its side lengths. */
  triangleCircumradius(a: number, b: number, c: number): number {
    const s = (a + b + c) / 2;
    const area = Math.sqrt(Math.max(0, s * (s - a) * (s - b) * (s - c)));
    if (area < 1e-12) return Infinity;
    return (a * b * c) / (4 * area);
  }

  /** Determine the kind (acute/right/obtuse) of a triangle from its side lengths. */
  triangleKind(a: number, b: number, c: number): 'acute' | 'right' | 'obtuse' {
    const [s1, s2, s3] = [a, b, c].sort((x, y) => x - y);
    const sum = s1 * s1 + s2 * s2 - s3 * s3;
    if (Math.abs(sum) < 1e-9) return 'right';
    return sum > 0 ? 'acute' : 'obtuse';
  }

  toPacket(): DataPacket<{
    figures: Map<string, GeometricFigure>;
    proofs: Proof[];
    theorems: Map<string, string>;
    history: unknown[];
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
}
