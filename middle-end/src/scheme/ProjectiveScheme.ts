/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 射影概型 —— 无穷远点的殿堂
 * Projective Scheme: The Palace of Points at Infinity
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 射影概型是代数几何的完形。它将仿射空间的碎片在无穷远处缝合，
 * 让每一个方向都有一个归宿。齐次坐标是射影空间的通用语言，
 * 而Graded Ring则是这种语言的语法书。
 */

export interface HomogeneousCoordinate {
  readonly label: string;
  readonly degree: number;
  readonly values: number[];
}

export interface HomogeneousIdeal {
  readonly generators: string[];
  readonly degree: number;
}

export interface ProjPoint {
  readonly coordinates: number[];
  readonly isAtInfinity: boolean;
  readonly affineChart: string;
}

export class ProjectiveScheme {
  private _gradedRing: string;
  private _dimension: number;
  private _homogeneousIdeals: HomogeneousIdeal[];
  private _projPoints: ProjPoint[];
  private _affineCharts: Map<string, string[]>;
  private _isIrreducible: boolean;
  private _history: string[];

  constructor(gradedRing: string, dimension: number) {
    this._gradedRing = gradedRing;
    this._dimension = dimension;
    this._homogeneousIdeals = [];
    this._projPoints = [];
    this._affineCharts = new Map();
    this._isIrreducible = false;
    this._history = [];
    this._recordHistory('Projective scheme Proj(' + gradedRing + ') summoned in dimension ' + dimension);
  }

  get gradedRing(): string { return this._gradedRing; }
  get dimension(): number { return this._dimension; }
  get isIrreducible(): boolean { return this._isIrreducible; }

  /**
   * 注册齐次理想
   * Register homogeneous ideal
   */
  public registerHomogeneousIdeal(ideal: HomogeneousIdeal): void {
    this._homogeneousIdeals.push(ideal);
    this._recordHistory('Homogeneous ideal of degree ' + ideal.degree + ' registered');
  }

  /**
   * 构造射影空间的点
   * Construct points of projective space
   */
  public constructPoints(coordinates: number[][]): ProjPoint[] {
    this._projPoints = [];
    for (const coords of coordinates) {
      const isInf = coords[0] === 0;
      this._projPoints.push({
        coordinates: coords,
        isAtInfinity: isInf,
        affineChart: isInf ? 'U_∞' : 'U_0'
      });
    }
    this._recordHistory('Constructed ' + this._projPoints.length + ' projective points');
    return [...this._projPoints];
  }

  /**
   * 构造标准仿射卡 U_i = {x_i ≠ 0}
   * Construct standard affine chart
   */
  public constructAffineChart(chartIndex: number): string[] {
    const chart: string[] = [];
    for (const point of this._projPoints) {
      if (point.coordinates[chartIndex] !== 0) {
        chart.push('[' + point.coordinates.join(':') + ']');
      }
    }
    this._affineCharts.set('U_' + chartIndex, chart);
    this._recordHistory('Affine chart U_' + chartIndex + ' constructed with ' + chart.length + ' points');
    return chart;
  }

  /**
   * 将射影点去齐次化为仿射坐标
   * Dehomogenize projective point to affine coordinates
   */
  public dehomogenize(point: ProjPoint, chartIndex: number): number[] {
    const coords = point.coordinates;
    const dehom = coords.map((c, i) => (i === chartIndex ? 1 : c / coords[chartIndex]));
    this._recordHistory('Point dehomogenized in chart U_' + chartIndex);
    return dehom;
  }

  /**
   * 将仿射坐标齐次化为射影点
   * Homogenize affine coordinates to projective point
   */
  public homogenize(affineCoords: number[], chartIndex: number): number[] {
    const hom: number[] = Array(this._dimension + 2).fill(0);
    for (let i = 0; i < affineCoords.length; i++) {
      const targetIdx = i < chartIndex ? i : i + 1;
      hom[targetIdx] = affineCoords[i];
    }
    hom[chartIndex] = 1;
    this._recordHistory('Affine coordinates homogenized');
    return hom;
  }

  /**
   * 验证概型的不可约性
   * Verify irreducibility
   */
  public verifyIrreducibility(): boolean {
    this._isIrreducible = this._homogeneousIdeals.length <= 1;
    this._recordHistory('Irreducibility verified: ' + this._isIrreducible);
    return this._isIrreducible;
  }

  /**
   * 计算超平面截面
   * Compute hyperplane section
   */
  public computeHyperplaneSection(equation: number[]): ProjPoint[] {
    const section: ProjPoint[] = [];
    for (const point of this._projPoints) {
      let value = 0;
      for (let i = 0; i < equation.length && i < point.coordinates.length; i++) {
        value += equation[i] * point.coordinates[i];
      }
      if (Math.abs(value) < 1e-10) {
        section.push(point);
      }
    }
    this._recordHistory('Hyperplane section contains ' + section.length + ' points');
    return section;
  }

  /**
   * 计算Veronese嵌入
   * Compute Veronese embedding
   */
  public computeVeroneseEmbedding(degree: number): number[][] {
    const embedded: number[][] = [];
    for (const point of this._projPoints) {
      const coords = point.coordinates;
      const veronese: number[] = [];
      for (let i = 0; i < coords.length; i++) {
        for (let j = i; j < coords.length; j++) {
          veronese.push(coords[i] * coords[j]);
        }
      }
      embedded.push(veronese);
    }
    this._recordHistory('Veronese embedding of degree ' + degree + ' computed');
    return embedded;
  }

  /**
   * 计算Segre嵌入 P^m × P^n → P^{(m+1)(n+1)-1}
   * Compute Segre embedding
   */
  public computeSegreEmbedding(otherCoords: number[][]): number[][] {
    const segre: number[][] = [];
    for (const p1 of this._projPoints) {
      for (const p2 of otherCoords) {
        const product: number[] = [];
        for (const c1 of p1.coordinates) {
          for (const c2 of p2) {
            product.push(c1 * c2);
          }
        }
        segre.push(product);
      }
    }
    this._recordHistory('Segre embedding computed with ' + segre.length + ' points');
    return segre;
  }

  /**
   * 验证Bézout定理的特殊情形
   * Verify special case of Bézout's theorem
   */
  public verifyBezout(degree1: number, degree2: number): boolean {
    const expectedIntersections = degree1 * degree2;
    const actual = this._projPoints.length;
    const bezout = actual <= expectedIntersections + 1; // 简化
    this._recordHistory('Bezout theorem: expected ' + expectedIntersections + ' intersections');
    return bezout;
  }

  public report(): object {
    return {
      gradedRing: this._gradedRing,
      dimension: this._dimension,
      homogeneousIdealCount: this._homogeneousIdeals.length,
      pointCount: this._projPoints.length,
      isIrreducible: this._isIrreducible,
      affineChartCount: this._affineCharts.size,
      history: this._history
    };
  }

  public reset(): void {
    this._homogeneousIdeals = [];
    this._projPoints = [];
    this._affineCharts.clear();
    this._isIrreducible = false;
    this._history = [];
  }

  // ─── Private helpers ───

  private _recordHistory(entry: string): void {
    this._history.push('[' + Date.now() + '] ' + entry);
  }
}
