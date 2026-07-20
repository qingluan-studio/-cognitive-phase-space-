/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 图形计算引擎 —— 形与量的几何对话
 * Figure Calculation Engine: The Geometric Dialogue Between Form and Quantity
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 几何是空间的语言。三角形以海伦公式跨越高度未知的鸿沟，
 * 圆以π为永恒的密码，扇形是圆的局部投影，立体是平面的升维。
 * 相似比是缩放的尺度，内切外接是图形与圆的拥抱。
 *
 * 本引擎提供完整的几何计算体系，从平面图形到立体图形，
 * 从基本的面积周长到复杂的坐标几何，从简单的三角形到
 * 复杂的组合图形，全面覆盖小学阶段的所有几何知识点。
 */

import { DataPacket } from '../shared/types';

export type ShapeType =
  | 'triangle' | 'rectangle' | 'circle' | 'parallelogram'
  | 'trapezoid' | 'square' | 'sector' | 'rhombus'
  | 'cube' | 'sphere' | 'cylinder' | 'cone' | 'cuboid' | 'prism' | 'pyramid';

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Shape {
  readonly id: string;
  readonly type: ShapeType;
  readonly parameters: Map<string, number>;
  readonly area: number;
  readonly perimeter: number;
  readonly volume: number;
  readonly surfaceArea: number;
}

export interface ShapeRelation {
  readonly type: 'congruent' | 'similar' | 'inscribed' | 'circumscribed' | 'complementary' | 'supplementary';
  readonly shapes: string[];
  readonly ratio?: number;
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
  readonly center: Point;
  readonly area: number;
  readonly circumference: number;
}

export interface TriangleType {
  readonly type: 'equilateral' | 'isosceles' | 'scalene' | 'right' | 'acute' | 'obtuse';
  readonly description: string;
}

export interface PolygonInfo {
  readonly sides: number;
  readonly sideLength: number;
  readonly area: number;
  readonly perimeter: number;
  readonly interiorAngle: number;
  readonly exteriorAngle: number;
  readonly apothem: number;
}

export class FigureCalculation {
  private _shapes: Map<string, Shape> = new Map();
  private _relations: ShapeRelation[] = [];
  private _properties: GeometricProperty[] = [];
  private _history: string[] = [];
  private _counter = 0;
  private _pi = Math.PI;

  constructor() {
    this._recordHistory('FigureCalculation engine initialized');
  }

  get shapes(): Shape[] { return Array.from(this._shapes.values()); }
  get relations(): ShapeRelation[] { return [...this._relations]; }
  get properties(): GeometricProperty[] { return [...this._properties]; }

  // ===========================================================================
  // 图形创建与管理
  // ===========================================================================

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
    let surfaceArea = 0;
    switch (type) {
      case 'triangle':
        area = this.triangleArea(params.base ?? 0, params.height ?? 0);
        perimeter = (params.a ?? 0) + (params.b ?? 0) + (params.c ?? 0);
        break;
      case 'rectangle':
        area = this.rectangleArea(params.length ?? 0, params.width ?? 0);
        perimeter = 2 * ((params.length ?? 0) + (params.width ?? 0));
        surfaceArea = area;
        break;
      case 'square':
        area = this.rectangleArea(params.side ?? 0, params.side ?? 0);
        perimeter = 4 * (params.side ?? 0);
        surfaceArea = area;
        break;
      case 'circle':
        area = this.circleArea(params.radius ?? 0);
        perimeter = 2 * this._pi * (params.radius ?? 0);
        surfaceArea = area;
        break;
      case 'sector':
        area = this.sectorArea(params.radius ?? 0, params.angle ?? 0);
        perimeter = 2 * (params.radius ?? 0) + 2 * this._pi * (params.radius ?? 0) * (params.angle ?? 0) / 360;
        break;
      case 'parallelogram':
        area = this.parallelogramArea(params.base ?? 0, params.height ?? 0);
        perimeter = 2 * ((params.base ?? 0) + (params.side ?? 0));
        break;
      case 'trapezoid':
        area = this.trapezoidArea(params.a ?? 0, params.b ?? 0, params.height ?? 0);
        perimeter = (params.a ?? 0) + (params.b ?? 0) + (params.leg1 ?? 0) + (params.leg2 ?? 0);
        break;
      case 'rhombus':
        area = this.rhombusArea(params.d1 ?? 0, params.d2 ?? 0);
        perimeter = 4 * (params.side ?? 0);
        break;
      case 'cube':
        volume = this.cubeVolume(params.side ?? 0);
        surfaceArea = this.cubeSurfaceArea(params.side ?? 0);
        area = surfaceArea;
        perimeter = 12 * (params.side ?? 0);
        break;
      case 'cuboid':
        volume = this.cuboidVolume(params.length ?? 0, params.width ?? 0, params.height ?? 0);
        surfaceArea = this.cuboidSurfaceArea(params.length ?? 0, params.width ?? 0, params.height ?? 0);
        area = surfaceArea;
        perimeter = 4 * ((params.length ?? 0) + (params.width ?? 0) + (params.height ?? 0));
        break;
      case 'sphere':
        volume = this.sphereVolume(params.radius ?? 0);
        surfaceArea = this.sphereSurfaceArea(params.radius ?? 0);
        area = surfaceArea;
        break;
      case 'cylinder':
        volume = this.cylinderVolume(params.radius ?? 0, params.height ?? 0);
        surfaceArea = this.cylinderSurfaceArea(params.radius ?? 0, params.height ?? 0);
        area = surfaceArea;
        break;
      case 'cone':
        volume = this.coneVolume(params.radius ?? 0, params.height ?? 0);
        surfaceArea = this.coneSurfaceArea(params.radius ?? 0, params.height ?? 0);
        area = surfaceArea;
        break;
      case 'prism':
        volume = (params.baseArea ?? 0) * (params.height ?? 0);
        surfaceArea = 2 * (params.baseArea ?? 0) + (params.basePerimeter ?? 0) * (params.height ?? 0);
        area = surfaceArea;
        break;
      case 'pyramid':
        volume = (params.baseArea ?? 0) * (params.height ?? 0) / 3;
        surfaceArea = (params.baseArea ?? 0) + (params.lateralArea ?? 0);
        area = surfaceArea;
        break;
    }
    const shape: Shape = { id, type, parameters: paramMap, area, perimeter, volume, surfaceArea };
    this._shapes.set(id, shape);
    this._recordHistory(`createShape: ${type} (id=${id}) area=${area}, perim=${perimeter}, vol=${volume}`);
    return shape;
  }

  /**
   * 获取图形
   * Get a shape by id
   */
  getShape(id: string): Shape | null {
    return this._shapes.get(id) ?? null;
  }

  /**
   * 删除图形
   * Delete a shape by id
   */
  deleteShape(id: string): boolean {
    const existed = this._shapes.has(id);
    if (existed) {
      this._shapes.delete(id);
      this._recordHistory(`deleteShape: ${id}`);
    }
    return existed;
  }

  /**
   * 按类型筛选图形
   * Filter shapes by type
   */
  getShapesByType(type: ShapeType): Shape[] {
    return this.shapes.filter(s => s.type === type);
  }

  // ===========================================================================
  // 三角形相关计算
  // ===========================================================================

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
   * 三角形类型判断
   * Determine triangle type
   */
  triangleType(a: number, b: number, c: number): TriangleType {
    const sides = [a, b, c].sort((x, y) => x - y);
    const [s1, s2, s3] = sides;
    let type: TriangleType['type'];
    let description: string;
    const eqSides = (a === b ? 1 : 0) + (b === c ? 1 : 0) + (a === c ? 1 : 0);
    if (eqSides >= 3) {
      type = 'equilateral';
      description = '等边三角形：三边相等，三角都是60°';
    } else if (eqSides === 1) {
      type = 'isosceles';
      description = '等腰三角形：两边相等，两底角相等';
    } else {
      type = 'scalene';
      description = '不等边三角形：三边都不相等';
    }
    const sq1 = s1 * s1 + s2 * s2;
    const sq3 = s3 * s3;
    if (Math.abs(sq1 - sq3) < 1e-6) {
      type = 'right';
      description = '直角三角形：有一个角为90°';
    } else if (sq1 > sq3) {
      type = 'acute';
      description = '锐角三角形：三个角都是锐角';
    } else {
      type = 'obtuse';
      description = '钝角三角形：有一个角是钝角';
    }
    this._recordHistory(`triangleType: ${a}, ${b}, ${c} → ${type}`);
    return { type, description };
  }

  /**
   * 三角形内角和验证
   * Verify triangle angle sum
   */
  triangleAngleSum(angleA: number, angleB: number, angleC: number): boolean {
    const sum = angleA + angleB + angleC;
    const valid = Math.abs(sum - 180) < 1e-6;
    this._recordHistory(`triangleAngleSum: ${angleA}+${angleB}+${angleC}=${sum}, valid=${valid}`);
    return valid;
  }

  /**
   * 三角形的高
   * Calculate triangle height from area and base
   */
  triangleHeight(area: number, base: number): number {
    const h = base === 0 ? NaN : 2 * area / base;
    this._recordHistory(`triangleHeight: area=${area}, base=${base} → h=${h}`);
    return h;
  }

  // ===========================================================================
  // 四边形相关计算
  // ===========================================================================

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
   * 长方形周长
   * Rectangle perimeter
   */
  rectanglePerimeter(length: number, width: number): number {
    const p = 2 * (length + width);
    this._recordHistory(`rectanglePerimeter: 2×(${length}+${width}) = ${p}`);
    return p;
  }

  /**
   * 长方形对角线
   * Rectangle diagonal
   */
  rectangleDiagonal(length: number, width: number): number {
    const d = Math.sqrt(length * length + width * width);
    this._recordHistory(`rectangleDiagonal: √(${length}²+${width}²) = ${d}`);
    return d;
  }

  /**
   * 正方形面积
   * Square area
   */
  squareArea(side: number): number {
    const a = side * side;
    this._recordHistory(`squareArea: ${side}² = ${a}`);
    return a;
  }

  /**
   * 正方形对角线
   * Square diagonal
   */
  squareDiagonal(side: number): number {
    const d = side * Math.sqrt(2);
    this._recordHistory(`squareDiagonal: ${side}×√2 = ${d}`);
    return d;
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
   * 梯形面积
   * Trapezoid area: (a + b) × h ÷ 2
   */
  trapezoidArea(a: number, b: number, height: number): number {
    const area = (a + b) * height / 2;
    this._recordHistory(`trapezoidArea: (${a}+${b}) × ${height} ÷ 2 = ${area}`);
    return area;
  }

  /**
   * 梯形中位线
   * Trapezoid median line
   */
  trapezoidMedian(a: number, b: number): number {
    const m = (a + b) / 2;
    this._recordHistory(`trapezoidMedian: (${a}+${b})÷2 = ${m}`);
    return m;
  }

  /**
   * 菱形面积（对角线乘积的一半）
   * Rhombus area: (d1 × d2) / 2
   */
  rhombusArea(d1: number, d2: number): number {
    const a = d1 * d2 / 2;
    this._recordHistory(`rhombusArea: (${d1}×${d2})÷2 = ${a}`);
    return a;
  }

  // ===========================================================================
  // 圆与扇形相关计算
  // ===========================================================================

  /**
   * 圆面积
   * Circle area
   */
  circleArea(radius: number): number {
    const a = this._pi * radius * radius;
    this._recordHistory(`circleArea: π × ${radius}² = ${a}`);
    return a;
  }

  /**
   * 圆周长
   * Circle circumference
   */
  circleCircumference(radius: number): number {
    const c = 2 * this._pi * radius;
    this._recordHistory(`circleCircumference: 2 × π × ${radius} = ${c}`);
    return c;
  }

  /**
   * 圆直径
   * Circle diameter
   */
  circleDiameter(radius: number): number {
    const d = 2 * radius;
    this._recordHistory(`circleDiameter: 2 × ${radius} = ${d}`);
    return d;
  }

  /**
   * 扇形面积
   * Sector area: (angle/360) × π r²
   */
  sectorArea(radius: number, angle: number): number {
    const a = (angle / 360) * this._pi * radius * radius;
    this._recordHistory(`sectorArea: (${angle}/360) × π × ${radius}² = ${a}`);
    return a;
  }

  /**
   * 扇形弧长
   * Sector arc length
   */
  sectorArcLength(radius: number, angle: number): number {
    const l = (angle / 360) * 2 * this._pi * radius;
    this._recordHistory(`sectorArcLength: (${angle}/360) × 2π × ${radius} = ${l}`);
    return l;
  }

  /**
   * 圆环面积
   * Annulus area
   */
  annulusArea(outerRadius: number, innerRadius: number): number {
    const a = this._pi * (outerRadius * outerRadius - innerRadius * innerRadius);
    this._recordHistory(`annulusArea: π×(${outerRadius}²-${innerRadius}²) = ${a}`);
    return a;
  }

  // ===========================================================================
  // 立体图形相关计算
  // ===========================================================================

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
   * 立方体表面积
   * Cube surface area
   */
  cubeSurfaceArea(side: number): number {
    const sa = 6 * side * side;
    this._recordHistory(`cubeSurfaceArea: 6 × ${side}² = ${sa}`);
    return sa;
  }

  /**
   * 长方体体积
   * Cuboid volume
   */
  cuboidVolume(length: number, width: number, height: number): number {
    const v = length * width * height;
    this._recordHistory(`cuboidVolume: ${length}×${width}×${height} = ${v}`);
    return v;
  }

  /**
   * 长方体表面积
   * Cuboid surface area
   */
  cuboidSurfaceArea(length: number, width: number, height: number): number {
    const sa = 2 * (length * width + length * height + width * height);
    this._recordHistory(`cuboidSurfaceArea: 2×(${length}×${width}+${length}×${height}+${width}×${height}) = ${sa}`);
    return sa;
  }

  /**
   * 球体积
   * Sphere volume: (4/3) π r³
   */
  sphereVolume(radius: number): number {
    const v = (4 / 3) * this._pi * Math.pow(radius, 3);
    this._recordHistory(`sphereVolume: (4/3) π ${radius}³ = ${v}`);
    return v;
  }

  /**
   * 球表面积
   * Sphere surface area
   */
  sphereSurfaceArea(radius: number): number {
    const sa = 4 * this._pi * radius * radius;
    this._recordHistory(`sphereSurfaceArea: 4 × π × ${radius}² = ${sa}`);
    return sa;
  }

  /**
   * 圆柱体积
   * Cylinder volume
   */
  cylinderVolume(radius: number, height: number): number {
    const v = this._pi * radius * radius * height;
    this._recordHistory(`cylinderVolume: π × ${radius}² × ${height} = ${v}`);
    return v;
  }

  /**
   * 圆柱表面积
   * Cylinder surface area
   */
  cylinderSurfaceArea(radius: number, height: number): number {
    const sa = 2 * this._pi * radius * (radius + height);
    this._recordHistory(`cylinderSurfaceArea: 2π×${radius}×(${radius}+${height}) = ${sa}`);
    return sa;
  }

  /**
   * 圆柱侧面积
   * Cylinder lateral surface area
   */
  cylinderLateralArea(radius: number, height: number): number {
    const la = 2 * this._pi * radius * height;
    this._recordHistory(`cylinderLateralArea: 2π×${radius}×${height} = ${la}`);
    return la;
  }

  /**
   * 圆锥体积
   * Cone volume: (1/3) π r² h
   */
  coneVolume(radius: number, height: number): number {
    const v = (1 / 3) * this._pi * radius * radius * height;
    this._recordHistory(`coneVolume: (1/3) π ${radius}² × ${height} = ${v}`);
    return v;
  }

  /**
   * 圆锥表面积
   * Cone surface area
   */
  coneSurfaceArea(radius: number, height: number): number {
    const slant = Math.sqrt(radius * radius + height * height);
    const sa = this._pi * radius * (radius + slant);
    this._recordHistory(`coneSurfaceArea: π×${radius}×(${radius}+${slant}) = ${sa}`);
    return sa;
  }

  /**
   * 圆锥母线长
   * Cone slant height
   */
  coneSlantHeight(radius: number, height: number): number {
    const l = Math.sqrt(radius * radius + height * height);
    this._recordHistory(`coneSlantHeight: √(${radius}²+${height}²) = ${l}`);
    return l;
  }

  // ===========================================================================
  // 图形关系与变换
  // ===========================================================================

  /**
   * 表面积
   * Surface area of a shape
   */
  surfaceArea(shape: Shape): number {
    return shape.surfaceArea || shape.area;
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
   * 相似图形面积比
   * Area ratio of similar shapes
   */
  similarAreaRatio(linearRatio: number): number {
    const ratio = linearRatio * linearRatio;
    this._recordHistory(`similarAreaRatio: (${linearRatio})² = ${ratio}`);
    return ratio;
  }

  /**
   * 相似图形体积比
   * Volume ratio of similar shapes
   */
  similarVolumeRatio(linearRatio: number): number {
    const ratio = linearRatio * linearRatio * linearRatio;
    this._recordHistory(`similarVolumeRatio: (${linearRatio})³ = ${ratio}`);
    return ratio;
  }

  /**
   * 图形放大/缩小
   * Scale a shape by a factor
   */
  scaleShape(shapeId: string, factor: number): Shape | null {
    const shape = this._shapes.get(shapeId);
    if (!shape) return null;
    const newParams: Record<string, number> = {};
    shape.parameters.forEach((v, k) => {
      newParams[k] = v * factor;
    });
    const newShape = this.createShape(shape.type, newParams);
    this._relations.push({
      type: 'similar',
      shapes: [shapeId, newShape.id],
      ratio: factor,
    });
    return newShape;
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
    const denom = a + b + c;
    const cx = (a * 0 + b * c + c * ((a * a + c * c - b * b) / (2 * c))) / denom;
    const cy = (a * 0 + b * 0 + c * Math.sqrt(Math.max(0, a * a - Math.pow((a * a + c * c - b * b) / (2 * c), 2)))) / denom;
    const info: CircleInfo = {
      radius: r,
      center: { x: cx, y: cy },
      area: this._pi * r * r,
      circumference: 2 * this._pi * r,
    };
    this._recordHistory(`inscribedCircle: r=${r}, center=(${cx}, ${cy})`);
    return info;
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
    const cx = (a * a + c * c - b * b) / (2 * c);
    const cy = Math.sqrt(Math.max(0, a * a - cx * cx));
    const ux = c / 2;
    const uy = 0;
    const vx = cx / 2;
    const vy = cy / 2;
    const d = 2 * (ux * vy - uy * vx);
    const ox = (vy * (ux * ux + uy * uy) - uy * (vx * vx + vy * vy)) / d;
    const oy = (ux * (vx * vx + vy * vy) - vx * (ux * ux + uy * uy)) / d;
    const info: CircleInfo = {
      radius: r,
      center: { x: ox, y: oy },
      area: this._pi * r * r,
      circumference: 2 * this._pi * r,
    };
    this._recordHistory(`circumscribedCircle: r=${r}, center=(${ox}, ${oy})`);
    return info;
  }

  // ===========================================================================
  // 坐标几何
  // ===========================================================================

  /**
   * 两点间距离
   * Distance between two points
   */
  distance(p1: Point, p2: Point): number {
    const d = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
    this._recordHistory(`distance: (${p1.x},${p1.y}) to (${p2.x},${p2.y}) = ${d}`);
    return d;
  }

  /**
   * 中点坐标
   * Midpoint of two points
   */
  midpoint(p1: Point, p2: Point): Point {
    const m = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    this._recordHistory(`midpoint: (${p1.x},${p1.y}) & (${p2.x},${p2.y}) → (${m.x},${m.y})`);
    return m;
  }

  /**
   * 直线斜率
   * Slope of a line
   */
  slope(p1: Point, p2: Point): number {
    const dx = p2.x - p1.x;
    if (dx === 0) return Infinity;
    const m = (p2.y - p1.y) / dx;
    this._recordHistory(`slope: (${p1.x},${p1.y}) to (${p2.x},${p2.y}) = ${m}`);
    return m;
  }

  /**
   * 多边形面积（鞋带公式）
   * Polygon area (shoelace formula)
   */
  polygonArea(points: Point[]): number {
    if (points.length < 3) return 0;
    let area = 0;
    const n = points.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    area = Math.abs(area) / 2;
    this._recordHistory(`polygonArea: ${n} sides → ${area}`);
    return area;
  }

  /**
   * 多边形周长
   * Polygon perimeter
   */
  polygonPerimeter(points: Point[]): number {
    if (points.length < 2) return 0;
    let perimeter = 0;
    const n = points.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      perimeter += this.distance(points[i], points[j]);
    }
    this._recordHistory(`polygonPerimeter: ${n} sides → ${perimeter}`);
    return perimeter;
  }

  // ===========================================================================
  // 正多边形计算
  // ===========================================================================

  /**
   * 正多边形计算
   * Regular polygon calculations
   */
  regularPolygon(sides: number, sideLength: number): PolygonInfo {
    const interiorAngle = (sides - 2) * 180 / sides;
    const exteriorAngle = 360 / sides;
    const apothem = sideLength / (2 * Math.tan(this._pi / sides));
    const perimeter = sides * sideLength;
    const area = perimeter * apothem / 2;
    const info: PolygonInfo = { sides, sideLength, area, perimeter, interiorAngle, exteriorAngle, apothem };
    this._recordHistory(`regularPolygon: ${sides} sides, length=${sideLength} → area=${area}`);
    return info;
  }

  /**
   * 正三角形（等边三角形）
   * Equilateral triangle
   */
  equilateralTriangle(side: number): { area: number; height: number; perimeter: number } {
    const height = (Math.sqrt(3) / 2) * side;
    const area = (Math.sqrt(3) / 4) * side * side;
    const perimeter = 3 * side;
    this._recordHistory(`equilateralTriangle: side=${side} → area=${area}, h=${height}`);
    return { area, height, perimeter };
  }

  /**
   * 正六边形
   * Regular hexagon
   */
  regularHexagon(side: number): { area: number; perimeter: number; longDiagonal: number; shortDiagonal: number } {
    const area = (3 * Math.sqrt(3) / 2) * side * side;
    const perimeter = 6 * side;
    const longDiagonal = 2 * side;
    const shortDiagonal = Math.sqrt(3) * side;
    this._recordHistory(`regularHexagon: side=${side} → area=${area}`);
    return { area, perimeter, longDiagonal, shortDiagonal };
  }

  // ===========================================================================
  // 组合图形计算
  // ===========================================================================

  /**
   * 组合图形面积（多个图形面积之和）
   * Composite shape area
   */
  compositeArea(shapeIds: string[]): number {
    let total = 0;
    for (const id of shapeIds) {
      const shape = this._shapes.get(id);
      if (shape) total += shape.area;
    }
    this._recordHistory(`compositeArea: ${shapeIds.length} shapes → ${total}`);
    return total;
  }

  /**
   * 阴影面积（大图形减小图形）
   * Shaded area
   */
  shadedArea(outerId: string, innerId: string): number {
    const outer = this._shapes.get(outerId);
    const inner = this._shapes.get(innerId);
    if (!outer || !inner) return NaN;
    const area = outer.area - inner.area;
    this._recordHistory(`shadedArea: ${outerId} - ${innerId} = ${area}`);
    return area;
  }

  // ===========================================================================
  // 序列化为 DataPacket
  // ===========================================================================

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

  // ===========================================================================
  // 私有辅助方法
  // ===========================================================================

  private _recordHistory(entry: string): void {
    this._history.push(`[${new Date().toISOString()}] ${entry}`);
    if (this._history.length > 500) this._history.shift();
  }
}
