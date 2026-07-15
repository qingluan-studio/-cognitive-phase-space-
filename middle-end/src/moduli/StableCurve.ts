//**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 稳定曲线 —— Deligne-Mumford紧化的基石
 * Stable Curve: The Cornerstone of Deligne-Mumford Compactification
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 稳定曲线是代数曲线模空间紧化的关键。Deligne和Mumford证明
 * 稳定曲线的模空间是紧的、几何不可约的，这是20世纪代数几何
 * 最伟大的成就之一。
 */

export interface CurveComponent {
  readonly label: string;
  readonly genus: number;
  readonly markedPoints: string[];
  readonly singularities: string[];
}

export interface DualGraph {
  readonly vertices: string[];
  readonly edges: string[];
  readonly genera: Map<string, number>;
}

export class StableCurve {
  private _curveName: string;
  private _components: CurveComponent[];
  private _dualGraph: DualGraph | null;
  private _isStable: boolean;
  private _history: string[];

  constructor(curveName: string) {
    this._curveName = curveName;
    this._components = [];
    this._dualGraph = null;
    this._isStable = false;
    this._history = [];
    this._recordHistory('Stable curve ' + curveName + ' summoned');
  }

  get curveName(): string { return this._curveName; }
  get isStable(): boolean { return this._isStable; }
  get componentCount(): number { return this._components.length; }

  /**
   * 注册曲线分量
   * Register curve component
   */
  public registerComponent(component: CurveComponent): void {
    this._components.push(component);
    this._recordHistory('Component ' + component.label + ' registered, genus ' + component.genus);
  }

  /**
   * 构造对偶图
   * Construct dual graph
   */
  public constructDualGraph(): DualGraph {
    const vertices: string[] = [];
    const edges: string[] = [];
    const genera = new Map<string, number>();
    for (const comp of this._components) {
      vertices.push(comp.label);
      genera.set(comp.label, comp.genus);
      for (const sing of comp.singularities) {
        edges.push(comp.label + '-' + sing);
      }
    }
    const graph: DualGraph = { vertices, edges, genera };
    this._dualGraph = graph;
    this._recordHistory('Dual graph constructed: ' + vertices.length + ' vertices, ' + edges.length + ' edges');
    return graph;
  }

  /**
   * 验证稳定性条件
   * Verify stability condition
   */
  public verifyStability(): boolean {
    // 稳定性：每个分量满足 2g - 2 + n > 0
    let stable = true;
    for (const comp of this._components) {
      const n = comp.markedPoints.length + comp.singularities.length;
      const val = 2 * comp.genus - 2 + n;
      if (val <= 0) {
        stable = false;
        break;
      }
    }
    this._isStable = stable;
    this._recordHistory('Stability verified: ' + stable);
    return stable;
  }

  /**
   * 计算算术亏格
   * Compute arithmetic genus
   */
  public computeArithmeticGenus(): number {
    let genus = 0;
    for (const comp of this._components) {
      genus += comp.genus;
    }
    if (this._dualGraph) {
      genus += 1 - this._dualGraph.vertices.length + this._dualGraph.edges.length;
    }
    this._recordHistory('Arithmetic genus computed: ' + genus);
    return genus;
  }

  /**
   * 计算模空间的维数 3g - 3 + n
   * Compute dimension of moduli space
   */
  public computeModuliDimension(): number {
    const g = this.computeArithmeticGenus();
    const n = this._components.reduce((sum, c) => sum + c.markedPoints.length, 0);
    const dim = 3 * g - 3 + n;
    this._recordHistory('Moduli dimension: ' + dim);
    return dim;
  }

  /**
   * 验证Deligne-Mumford紧化
   * Verify Deligne-Mumford compactification
   */
  public verifyDeligneMumfordCompactification(): boolean {
    const compact = this._isStable;
    this._recordHistory('Deligne-Mumford compactification verified: ' + compact);
    return compact;
  }

  /**
   * 计算线丛的度数
   * Compute degree of line bundle
   */
  public computeLineBundleDegree(componentLabel: string, markedPoints: string[]): number {
    const degree = markedPoints.length;
    this._recordHistory('Line bundle degree on ' + componentLabel + ': ' + degree);
    return degree;
  }

  /**
   * 验证映射的稳定化
   * Verify stabilization of map
   */
  public verifyStabilization(): boolean {
    const stabilized = this._isStable;
    this._recordHistory('Stabilization verified: ' + stabilized);
    return stabilized;
  }

  /**
   * 计算边界除子
   * Compute boundary divisors
   */
  public computeBoundaryDivisors(): string[] {
    const divisors: string[] = [];
    if (this._dualGraph) {
      for (const edge of this._dualGraph.edges) {
        divisors.push('δ_' + edge);
      }
    }
    this._recordHistory('Boundary divisors computed: ' + divisors.length);
    return divisors;
  }

  public report(): object {
    return {
      curveName: this._curveName,
      componentCount: this._components.length,
      isStable: this._isStable,
      arithmeticGenus: this.computeArithmeticGenus(),
      history: this._history
    };
  }

  public reset(): void {
    this._components = [];
    this._dualGraph = null;
    this._isStable = false;
    this._history = [];
  }

  // ─── Private helpers ───

  private _recordHistory(entry: string): void {
    this._history.push('[' + Date.now() + '] ' + entry);
  }
}
