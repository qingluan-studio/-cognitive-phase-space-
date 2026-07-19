/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 图形计算引擎 —— 形与量的几何对话
 * Figure Calculation Engine: The Geometric Dialogue Between Form and Quantity
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 几何是空间的语言。三角形以海伦公式跨越高度未知的鸿沟，
 * 圆以π为永恒的密码，扇形是圆的局部投影，立体是平面的升维。
 * 相似比是缩放的尺度，内切外接是图形与圆的拥抱。
 */

import { DataPacket } from '../shared/types';

export type ShapeType =
  | 'triangle' | 'rectangle' | 'circle' | 'parallelogram'
  | 'trapezoid' | 'square' | 'sector'
  | 'cube' | 'sphere' | 'cylinder' | 'cone';

export interface Shape {
  readonly id: string;
  readonly type: ShapeType;
  readonly parameters: Map<string, number>;
  readonly area: number;
  readonly perimeter: number;
  readonly volume: number;
}

export interface ShapeRelation {
  readonly type: 'congruent' | 'similar' | 'inscribed' | 'circumscribed';
  readonly shapes: string[];
}

export interface GeometricProperty {
  readonly name: string;
  readonly value: number;
  readonly formula: string;
  readonly derivation: string;
}

interface TriangleParams {
  readonly a: number;
  readonly b: number;
  readonly c: number;
}

interface CircleInfo {
  readonly radius: number;
  readonly center: { x: number; y: number };
}

export class FigureCalculation {
  private _shapes: Map<string, Shape> = new Map();
  private _relations: ShapeRelation[] = [];
  private _properties: GeometricProperty[] = [];
  private _history: string[] = [];
  private _counter = 0;

  constructor() {
    this._recordHistory('FigureCalculation engine initialized');
  }

  get shapes(): Shape[] { return Array.from(this._shapes.values()); }
  get relations(): ShapeRelation[] { return [...this._relations]; }
  get properties(): GeometricProperty[] { return [...this._properties]; }

  /**
   * 创建图形
   * Create and register a shape
   */
  createShape(type: ShapeType, params: Record<string, number>): Shape {
    const id = `shape-${(++this._counter).toString(36)}`;
    const paramMap = new Map<string, number>();
    for (const k of Object.keys(params)) paramMap.set(k, params[k]);
    let area = 0;
    let perimeter = 0;
    let volume = 0;
    switch (type) {
      case 'triangle':
        area = this.triangleArea(params.base ?? 0, params.height ?? 0);
        perimeter = (params.a ?? 0) + (params.b ?? 0) + (params.c ?? 0);
        break;
      case 'rectangle':
        area = this.rectangleArea(params.length ?? 0, params.width ?? 0);
        perimeter = 2 * ((params.length ?? 0) + (params.width ?? 0));
        break;
      case 'square':
        area = this.rectangleArea(params.side ?? 0, params.side ?? 0);
        perimeter = 4 * (params.side ?? 0);
        break;
      case 'circle':
        area = this.circleArea(params.radius ?? 0);
        perimeter = 2 * Math.PI * (params.radius ?? 0);
        break;
      case 'sector':
        area = this.sectorArea(params.radius ?? 0, params.angle ?? 0);
        perimeter = 2 * (params.radius ?? 0) + 2 * Math.PI * (params.radius ?? 0) * (params.angle ?? 0) / 360;
        break;
      case 'parallelogram':
        area = this.parallelogramArea(params.base ?? 0, params.height ?? 0);
        perimeter = 2 * ((params.base ?? 0) + (params.side ?? 0));
        break;
      case 'trapezoid':
        area = this.trapezoidArea(params.a ?? 0, params.b ?? 0, params.height ?? 0);
        perimeter = (params.a ?? 0) + (params.b ?? 0) + (params.leg1 ?? 0) + (params.leg2 ?? 0);
        break;
      case 'cube':
        volume = this.cubeVolume(params.side ?? 0);
        area = 6 * Math.pow(params.side ?? 0, 2);
        break;
      case 'sphere':
        volume = this.sphereVolume(params.radius ?? 0);
        area = 4 * Math.PI * Math.pow(params.radius ?? 0, 2);
        break;
      case 'cylinder':
        volume = this.cylinderVolume(params.radius ?? 0, params.height ?? 0);
        area = 2 * Math.PI * (params.radius ?? 0) * ((params.radius ?? 0) + (params.height ?? 0));
        break;
      case 'cone':
        volume = this.coneVolume(params.radius ?? 0, params.height ?? 0);
        const slant = Math.sqrt(Math.pow(params.radius ?? 0, 2) + Math.pow(params.height ?? 0, 2));
        area = Math.PI * (params.radius ?? 0) * ((params.radius ?? 0) + slant);
        break;
    }
    const shape: Shape = { id, type, parameters: paramMap, area, perimeter, volume };
    this._shapes.set(id, shape);
    this._recordHistory(`createShape: ${type} (id=${id}) area=${area}, perim=${perimeter}, vol=${volume}`);
    return shape;
  }

  /**
   * 三角形面积
   * Triangle area: (1/2) × base × height
   */
  triangleArea(base: number, height: number): number {
    const a = 0.5 * base * height;
    this._recordHistory(`triangleArea: 0.5 × ${base} × ${height} = ${a}`);
    return a;
  }

  /**
   * 海伦公式
   * Heron's formula for triangle area from three sides
   */
  triangleHeron(a: number, b: number, c: number): number {
    if (a + b <= c || a + c <= b || b + c <= a) {
      this._recordHistory(`triangleHeron: invalid triangle ${a}, ${b}, ${c}`);
      return NaN;
    }
    const s = (a + b + c) / 2;
    const area = Math.sqrt(s * (s - a) * (s - b) * (s - c));
    this._recordHistory(`triangleHeron: a=${a}, b=${b}, c=${c} → ${area}`);
    return area;
  }

  /**
   * 长方形面积
   * Rectangle area
   */
  rectangleArea(length: number, width: number): number {
    const a = length * width;
    this._recordHistory(`rectangleArea: ${length} × ${width} = ${a}`);
    return a;
  }

  /**
   * 圆面积
   * Circle area
   */
  circleArea(radius: number): number {
    const a = Math.PI * radius * radius;
    this._recordHistory(`circleArea: π × ${radius}² = ${a}`);
    return a;
  }

  /**
   * 扇形面积
   * Sector area: (angle/360) × π r²
   */
  sectorArea(radius: number, angle: number): number {
    const a = (angle / 360) * Math.PI * radius * radius;
    this._recordHistory(`sectorArea: (${angle}/360) × π × ${radius}² = ${a}`);
    return a;
  }

  /**
   * 梯形面积
   * Trapezoid area: (a + b) × h ÷ 2
   */
  trapezoidArea(a: number, b: number, height: number): number {
    const area = (a + b) * height / 2;
    this._recordHistory(`trapezoidArea: (${a}+${b}) × ${height} ÷ 2 = ${area}`);
    return area;
  }

  /**
   * 平行四边形面积
   * Parallelogram area
   */
  parallelogramArea(base: number, height: number): number {
    const a = base * height;
    this._recordHistory(`parallelogramArea: ${base} × ${height} = ${a}`);
    return a;
  }

  /**
   * 立方体体积
   * Cube volume
   */
  cubeVolume(side: number): number {
    const v = Math.pow(side, 3);
    this._recordHistory(`cubeVolume: ${side}³ = ${v}`);
    return v;
  }

  /**
   * 球体积
   * Sphere volume: (4/3) π r³
   */
  sphereVolume(radius: number): number {
    const v = (4 / 3) * Math.PI * Math.pow(radius, 3);
    this._recordHistory(`sphereVolume: (4/3) π ${radius}³ = ${v}`);
    return v;
  }

  /**
   * 圆柱体积
   * Cylinder volume
   */
  cylinderVolume(radius: number, height: number): number {
    const v = Math.PI * radius * radius * height;
    this._recordHistory(`cylinderVolume: π × ${radius}² × ${height} = ${v}`);
    return v;
  }

  /**
   * 圆锥体积
   * Cone volume: (1/3) π r² h
   */
  coneVolume(radius: number, height: number): number {
    const v = (1 / 3) * Math.PI * radius * radius * height;
    this._recordHistory(`coneVolume: (1/3) π ${radius}² × ${height} = ${v}`);
    return v;
  }

  /**
   * 表面积
   * Surface area of a shape
   */
  surfaceArea(shape: Shape): number {
    switch (shape.type) {
      case 'cube': {
        const s = shape.parameters.get('side') ?? 0;
        return 6 * s * s;
      }
      case 'sphere': {
        const r = shape.parameters.get('radius') ?? 0;
        return 4 * Math.PI * r * r;
      }
      case 'cylinder': {
        const r = shape.parameters.get('radius') ?? 0;
        const h = shape.parameters.get('height') ?? 0;
        return 2 * Math.PI * r * (r + h);
      }
      case 'cone': {
        const r = shape.parameters.get('radius') ?? 0;
        const h = shape.parameters.get('height') ?? 0;
        const l = Math.sqrt(r * r + h * h);
        return Math.PI * r * (r + l);
      }
      case 'rectangle': {
        const l = shape.parameters.get('length') ?? 0;
        const w = shape.parameters.get('width') ?? 0;
        return l * w;
      }
      case 'circle': {
        const r = shape.parameters.get('radius') ?? 0;
        return Math.PI * r * r;
      }
      default:
        return shape.area;
    }
  }

  /**
   * 相似比
   * Similarity ratio between two shapes
   */
  similarShapesRatio(a: Shape, b: Shape): number {
    if (a.type !== b.type) {
      this._recordHistory(`similarShapesRatio: type mismatch ${a.type} vs ${b.type}`);
      return NaN;
    }
    const keyA = Array.from(a.parameters.keys())[0];
    const keyB = Array.from(b.parameters.keys())[0];
    if (!keyA || !keyB) return NaN;
    const va = a.parameters.get(keyA) ?? 0;
    const vb = b.parameters.get(keyB) ?? 0;
    if (vb === 0) return NaN;
    const ratio = va / vb;
    this._recordHistory(`similarShapesRatio: ${va} / ${vb} = ${ratio}`);
    return ratio;
  }

  /**
   * 内切圆
   * Inscribed circle of a triangle
   */
  inscribedCircle(triangle: TriangleParams): CircleInfo {
    const { a, b, c } = triangle;
    const s = (a + b + c) / 2;
    const area = Math.sqrt(s * (s - a) * (s - b) * (s - c));
    const r = area / s;
    // Incenter coordinates weighted by side lengths (assuming vertex A at origin, B at (c,0))
    const denom = a + b + c;
    const x = (a * 0 + b * c + c * (c * (a * a + c * c - b * b) / (2 * c * c))) / denom;
    const y = (a * 0 + b * 0 + c * Math.sqrt(Math.max(0, a * a - Math.pow((a * a + c * c - b * b) / (2 * c), 2)))) / denom;
    this._recordHistory(`inscribedCircle: r=${r}, center=(${x}, ${y})`);
    return { radius: r, center: { x, y } };
  }

  /**
   * 外接圆
   * Circumscribed circle of a triangle
   */
  circumscribedCircle(triangle: TriangleParams): CircleInfo {
    const { a, b, c } = triangle;
    const s = (a + b + c) / 2;
    const area = Math.sqrt(s * (s - a) * (s - b) * (s - c));
    const r = (a * b * c) / (4 * area);
    // Circumcenter: assume vertex A at origin, B at (c,0), find C then circumcenter
    const cx = (a * a + c * c - b * b) / (2 * c);
    const cy = Math.sqrt(Math.max(0, a * a - cx * cx));
    const ux = c / 2;
    const uy = 0;
    const vx = cx / 2;
    const vy = cy / 2;
    // Solve for circumcenter as intersection of perpendicular bisectors
    const d = 2 * (ux * vy - uy * vx);
    const ox = (vy * (ux * ux + uy * uy) - uy * (vx * vx + vy * vy)) / d;
    const oy = (ux * (vx * vx + vy * vy) - vx * (ux * ux + uy * uy)) / d;
    this._recordHistory(`circumscribedCircle: r=${r}, center=(${ox}, ${oy})`);
    return { radius: r, center: { x: ox, y: oy } };
  }

  /**
   * 获取图形
   * Get a shape by id
   */
  getShape(id: string): Shape | null {
    return this._shapes.get(id) ?? null;
  }

  /**
   * 序列化为 DataPacket
   * Serialize to DataPacket
   */
  toPacket(): DataPacket<{ shapes: Shape[]; relations: ShapeRelation[]; properties: GeometricProperty[] }> {
    const packet: DataPacket<{ shapes: Shape[]; relations: ShapeRelation[]; properties: GeometricProperty[] }> = {
      id: `figure-calc-${(++this._counter).toString(36)}`,
      payload: {
        shapes: this.shapes,
        relations: this._relations,
        properties: this._properties,
      },
      metadata: {
        createdAt: Date.now(),
        route: ['primary_math', 'FigureCalculation'],
        priority: 2,
        phase: 'figure-calculation',
      },
    };
    this._recordHistory(`toPacket: emitted ${packet.id}`);
    return packet;
  }

  /**
   * 重置引擎
   * Reset engine state
   */
  reset(): void {
    this._shapes.clear();
    this._relations = [];
    this._properties = [];
    this._history = [];
    this._counter = 0;
    this._recordHistory('FigureCalculation engine reset');
  }

  // ─────────────── private helpers ───────────────

  private _recordHistory(entry: string): void {
    this._history.push(`[${new Date().toISOString()}] ${entry}`);
    if (this._history.length > 500) this._history.shift();
  }
}
