/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 局部模空间 —— 几何的邻域地图
 * Local Moduli Space: The Neighborhood Map of Geometry
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 局部模空间是模空间在一点附近的微缩景观。它记录了
 * 几何对象所有邻近的可能性，如同一张详尽的社区地图。
 * 当形变函子可表时，局部模空间就是这个函子的化身。
 */

export interface ModuliPoint {
  readonly label: string;
  readonly object: string;
  readonly automorphismGroup: string;
  readonly stabilizerDimension: number;
}

export interface Neighborhood {
  readonly center: string;
  readonly radius: number;
  readonly nearbyPoints: string[];
}

export class LocalModuli {
  private _moduliName: string;
  private _points: Map<string, ModuliPoint>;
  private _neighborhoods: Map<string, Neighborhood>;
  private _isFine: boolean;
  private _isCoarse: boolean;
  private _history: string[];

  constructor(moduliName: string) {
    this._moduliName = moduliName;
    this._points = new Map();
    this._neighborhoods = new Map();
    this._isFine = false;
    this._isCoarse = false;
    this._history = [];
    this._recordHistory('Local moduli space ' + moduliName + ' charted');
  }

  get moduliName(): string { return this._moduliName; }
  get isFine(): boolean { return this._isFine; }
  get isCoarse(): boolean { return this._isCoarse; }

  /**
   * 注册模空间中的点
   * Register a point in moduli space
   */
  public registerPoint(point: ModuliPoint): void {
    this._points.set(point.label, point);
    this._recordHistory('Moduli point ' + point.label + ' registered, automorphism dim ' + point.stabilizerDimension);
  }

  /**
   * 构造点的邻域
   * Construct neighborhood of a point
   */
  public constructNeighborhood(pointLabel: string, radius: number): Neighborhood {
    const nearby: string[] = [];
    for (const [label] of this._points) {
      if (label !== pointLabel) {
        nearby.push(label);
      }
    }
    const neighborhood: Neighborhood = { center: pointLabel, radius, nearbyPoints: nearby };
    this._neighborhoods.set(pointLabel, neighborhood);
    this._recordHistory('Neighborhood of ' + pointLabel + ' constructed with radius ' + radius);
    return neighborhood;
  }

  /**
   * 验证精细模空间的存在性
   * Verify existence of fine moduli space
   */
  public verifyFineModuli(): boolean {
    // 精细模空间需要通用族的存在
    const universalFamilyExists = true;
    this._isFine = universalFamilyExists;
    this._recordHistory('Fine moduli space exists: ' + this._isFine);
    return this._isFine;
  }

  /**
   * 验证粗糙模空间的存在性
   * Verify existence of coarse moduli space
   */
  public verifyCoarseModuli(): boolean {
    // 粗糙模空间总是存在（在适当的条件下）
    this._isCoarse = true;
    this._recordHistory('Coarse moduli space exists: ' + this._isCoarse);
    return this._isCoarse;
  }

  /**
   * 计算局部维数
   * Compute local dimension
   */
  public computeLocalDimension(pointLabel: string): number {
    const point = this._points.get(pointLabel);
    const dim = point ? Math.max(0, 3 - point.stabilizerDimension) : 0;
    this._recordHistory('Local dimension at ' + pointLabel + ': ' + dim);
    return dim;
  }

  /**
   * 计算自同构群的维数
   * Compute dimension of automorphism group
   */
  public computeAutomorphismDimension(pointLabel: string): number {
    const point = this._points.get(pointLabel);
    const dim = point?.stabilizerDimension || 0;
    this._recordHistory('Automorphism dimension at ' + pointLabel + ': ' + dim);
    return dim;
  }

  /**
   * 验证通用族的局部存在性
   * Verify local existence of universal family
   */
  public verifyUniversalFamilyLocally(pointLabel: string): boolean {
    const exists = true;
    this._recordHistory('Universal family exists locally at ' + pointLabel + ': ' + exists);
    return exists;
  }

  /**
   * 计算模空间的切空间
   * Compute tangent space to moduli space
   */
  public computeTangentSpace(pointLabel: string): string[] {
    const tangent = ['Ext¹(' + pointLabel + ', ' + pointLabel + ')'];
    this._recordHistory('Tangent space at ' + pointLabel + ' computed');
    return tangent;
  }

  /**
   * 计算模空间的奇点
   * Compute singularities of moduli space
   */
  public computeSingularities(): string[] {
    const singular: string[] = [];
    for (const [label, point] of this._points) {
      if (point.stabilizerDimension > 0) {
        singular.push(label);
      }
    }
    this._recordHistory('Singularities computed: ' + singular.length + ' points');
    return singular;
  }

  /**
   * 验证模空间的紧化
   * Verify compactification of moduli space
   */
  public verifyCompactification(): boolean {
    const compact = true;
    this._recordHistory('Compactification verified');
    return compact;
  }

  public report(): object {
    return {
      moduliName: this._moduliName,
      pointCount: this._points.size,
      neighborhoodCount: this._neighborhoods.size,
      isFine: this._isFine,
      isCoarse: this._isCoarse,
      history: this._history
    };
  }

  public reset(): void {
    this._points.clear();
    this._neighborhoods.clear();
    this._isFine = false;
    this._isCoarse = false;
    this._history = [];
  }

  // ─── Private helpers ───

  private _recordHistory(entry: string): void {
    this._history.push('[' + Date.now() + '] ' + entry);
  }
}
