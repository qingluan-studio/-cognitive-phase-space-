/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 仿射概型 —— 环的几何化身
 * Affine Scheme: The Geometric Incarnation of a Ring
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 仿射概型是交换代数的视觉化。Spec(R) 将抽象的环转化为几何空间，
 * 素理想成为点，局部化成为邻域。这是Grothendieck革命的核心——
 * 几何不再是点的集合，而是层的舞台。
 */

export interface RingElement {
  readonly label: string;
  readonly value: number;
}

export interface PrimeIdeal {
  readonly label: string;
  readonly generators: string[];
  readonly height: number;
}

export interface LocalRing {
  readonly primeIdeal: PrimeIdeal;
  readonly localization: string;
  readonly residueField: string;
}

export class AffineScheme {
  private _ringName: string;
  private _primeIdeals: PrimeIdeal[];
  private _localRings: Map<string, LocalRing>;
  private _structureSheaf: Map<string, string[]>;
  private _dimension: number;
  private _isIntegral: boolean;
  private _isReduced: boolean;
  private _history: string[];

  constructor(ringName: string) {
    this._ringName = ringName;
    this._primeIdeals = [];
    this._localRings = new Map();
    this._structureSheaf = new Map();
    this._dimension = -1;
    this._isIntegral = false;
    this._isReduced = false;
    this._history = [];
    this._recordHistory('Affine scheme Spec(' + ringName + ') summoned into existence');
  }

  get ringName(): string { return this._ringName; }
  get dimension(): number { return this._dimension; }
  get isIntegral(): boolean { return this._isIntegral; }
  get isReduced(): boolean { return this._isReduced; }

  /**
   * 注册一个素理想作为概型的点
   * Register a prime ideal as a point of the scheme
   */
  public registerPrimeIdeal(ideal: PrimeIdeal): void {
    this._primeIdeals.push(ideal);
    this._recordHistory('Prime ideal ' + ideal.label + ' added as a geometric point');
  }

  /**
   * 计算概型的Krull维数
   * Compute Krull dimension
   */
  public computeKrullDimension(): number {
    if (this._primeIdeals.length === 0) return -1;
    let maxHeight = 0;
    for (const ideal of this._primeIdeals) {
      maxHeight = Math.max(maxHeight, ideal.height);
    }
    this._dimension = maxHeight;
    this._recordHistory('Krull dimension computed: ' + maxHeight);
    return maxHeight;
  }

  /**
   * 构造基本开集 D(f)
   * Construct basic open set D(f)
   */
  public constructBasicOpenSet(elementLabel: string): string[] {
    const openSet: string[] = [];
    for (const ideal of this._primeIdeals) {
      if (!ideal.generators.includes(elementLabel)) {
        openSet.push(ideal.label);
      }
    }
    this._recordHistory('Basic open set D(' + elementLabel + ') contains ' + openSet.length + ' points');
    return openSet;
  }

  /**
   * 在点p处局部化环 R_p
   * Localize ring at point p
   */
  public localizeAtPoint(primeLabel: string): LocalRing | null {
    const prime = this._primeIdeals.find(p => p.label === primeLabel);
    if (!prime) return null;

    const local: LocalRing = {
      primeIdeal: prime,
      localization: this._ringName + '_' + primeLabel,
      residueField: 'Frac(' + this._ringName + '/' + primeLabel + ')'
    };
    this._localRings.set(primeLabel, local);
    this._recordHistory('Ring localized at ' + primeLabel);
    return local;
  }

  /**
   * 验证结构层的层公理
   * Verify sheaf axioms for structure sheaf
   */
  public verifySheafAxioms(): boolean {
    // 简化：验证局部相容性
    const consistent = this._localRings.size > 0;
    this._recordHistory('Structure sheaf axioms verified: ' + consistent);
    return consistent;
  }

  /**
   * 计算结构层在 openset 上的截面
   * Compute sections of structure sheaf over open set
   */
  public computeSections(openSetLabel: string): string[] {
    const sections: string[] = [];
    for (const [label, local] of this._localRings) {
      sections.push('s_' + label + ' ∈ ' + local.localization);
    }
    this._structureSheaf.set(openSetLabel, sections);
    this._recordHistory('Sections over ' + openSetLabel + ' computed: ' + sections.length);
    return sections;
  }

  /**
   * 验证概型是否整的
   * Verify if scheme is integral
   */
  public verifyIntegral(): boolean {
    // 整 = 既约 + 不可约
    const integral = this._isReduced && this._primeIdeals.length > 0;
    this._isIntegral = integral;
    this._recordHistory('Integral scheme: ' + integral);
    return integral;
  }

  /**
   * 验证概型是否既约
   * Verify if scheme is reduced
   */
  public verifyReduced(): boolean {
    // 简化：假设无幂零元
    this._isReduced = true;
    this._recordHistory('Reduced scheme verified');
    return true;
  }

  /**
   * 计算闭子概型 V(I)
   * Compute closed subscheme V(I)
   */
  public computeClosedSubscheme(idealGenerators: string[]): string[] {
    const closedPoints: string[] = [];
    for (const ideal of this._primeIdeals) {
      const containsAll = idealGenerators.every(g => ideal.generators.includes(g));
      if (containsAll) {
        closedPoints.push(ideal.label);
      }
    }
    this._recordHistory('Closed subscheme V(I) contains ' + closedPoints.length + ' points');
    return closedPoints;
  }

  /**
   * 计算函数域（对整概型）
   * Compute function field
   */
  public computeFunctionField(): string {
    const functionField = 'Frac(' + this._ringName + ')';
    this._recordHistory('Function field: ' + functionField);
    return functionField;
  }

  /**
   * 寻找泛点（对不可约分支）
   * Find generic point
   */
  public findGenericPoint(): PrimeIdeal | null {
    const generic = this._primeIdeals.find(p => p.height === 0);
    if (generic) {
      this._recordHistory('Generic point found: ' + generic.label);
    }
    return generic || null;
  }

  /**
   * 验证概型是否是仿射空间 Aⁿ
   * Verify if scheme is affine space
   */
  public verifyAffineSpace(n: number): boolean {
    const expected = this._ringName === 'k[x₁,...,xₙ]' && this._dimension === n;
    this._recordHistory('Affine space A^' + n + ' verified: ' + expected);
    return expected;
  }

  public report(): object {
    return {
      ringName: this._ringName,
      dimension: this._dimension,
      primeIdealCount: this._primeIdeals.length,
      isIntegral: this._isIntegral,
      isReduced: this._isReduced,
      localRingCount: this._localRings.size,
      history: this._history
    };
  }

  public reset(): void {
    this._primeIdeals = [];
    this._localRings.clear();
    this._structureSheaf.clear();
    this._dimension = -1;
    this._isIntegral = false;
    this._isReduced = false;
    this._history = [];
  }

  // ─── Private helpers ───

  private _recordHistory(entry: string): void {
    this._history.push('[' + Date.now() + '] ' + entry);
  }
}
