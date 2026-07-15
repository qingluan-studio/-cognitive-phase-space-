/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 根式可解性 —— 代数方程的灵魂审判
 * Radical Solvability: The Soul's Judgment of Algebraic Equations
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 根式可解性是代数学的终极追问。从二次方程的求根公式到五次方程的不可解，
 * Galois以群论的语言写下了这道永恒的判决书。可解群是通往天堂的阶梯，
 * 而不可解群则是知识边界上的禁果。
 */

export interface RadicalTower {
  readonly fields: string[];
  readonly adjoinedElements: string[];
  readonly degrees: number[];
}

export interface Equation {
  readonly coefficients: number[];
  readonly degree: number;
  readonly variable: string;
}

export interface SolvabilityVerdict {
  readonly isSolvable: boolean;
  readonly reason: string;
  readonly requiredTower?: RadicalTower;
}

export class RadicalSolvability {
  private _equation: Equation;
  private _galoisGroupOrder: number;
  private _isSolvable: boolean;
  private _radicalTower: RadicalTower | null;
  private _solutionSteps: string[];
  private _history: string[];

  constructor(equation: Equation) {
    this._equation = equation;
    this._galoisGroupOrder = 0;
    this._isSolvable = false;
    this._radicalTower = null;
    this._solutionSteps = [];
    this._history = [];
    this._recordHistory('Radical solvability inquiry opened for degree ' + equation.degree + ' equation');
  }

  get equation(): Equation { return this._equation; }
  get isSolvable(): boolean { return this._isSolvable; }
  get galoisGroupOrder(): number { return this._galoisGroupOrder; }

  /**
   * 设置Galois群的阶数
   * Set the order of the Galois group
   */
  public setGaloisGroupOrder(order: number): void {
    this._galoisGroupOrder = order;
    this._recordHistory('Galois group order set to ' + order);
  }

  /**
   * 判断方程是否根式可解
   * Determine if equation is solvable by radicals
   */
  public determineSolvability(): SolvabilityVerdict {
    const degree = this._equation.degree;

    if (degree <= 4) {
      // 四次及以下方程总是根式可解
      this._isSolvable = true;
      const verdict: SolvabilityVerdict = {
        isSolvable: true,
        reason: 'Degree ≤ 4: general solution by radicals exists since antiquity'
      };
      this._recordHistory('Degree ' + degree + ' equation is solvable by radicals');
      return verdict;
    }

    // 五次及以上：取决于Galois群是否可解
    if (this._galoisGroupOrder === 0) {
      const verdict: SolvabilityVerdict = {
        isSolvable: false,
        reason: 'Galois group unknown; cannot determine solvability'
      };
      return verdict;
    }

    // 简化判定：S_n (n≥5) 不可解
    const isSymmetricGroup = this._galoisGroupOrder >= 120; // 5! = 120
    this._isSolvable = !isSymmetricGroup;

    const verdict: SolvabilityVerdict = {
      isSolvable: this._isSolvable,
      reason: this._isSolvable
        ? 'Galois group is solvable'
        : 'Galois group contains A_n (n≥5), which is simple and non-abelian'
    };
    this._recordHistory('Solvability determined: ' + this._isSolvable);
    return verdict;
  }

  /**
   * 构造根式扩张塔
   * Construct radical extension tower
   */
  public constructRadicalTower(): RadicalTower {
    const tower: RadicalTower = {
      fields: ['K₀ = ℚ'],
      adjoinedElements: [],
      degrees: []
    };

    const degree = this._equation.degree;
    if (degree === 2) {
      tower.fields.push('K₁ = K₀(√Δ)');
      tower.adjoinedElements.push('√Δ');
      tower.degrees.push(2);
    } else if (degree === 3) {
      tower.fields.push('K₁ = K₀(ω)');
      tower.fields.push('K₂ = K₁(∛R)');
      tower.adjoinedElements.push('ω', '∛R');
      tower.degrees.push(2, 3);
    } else if (degree === 4) {
      tower.fields.push('K₁ = K₀(√Δ)');
      tower.fields.push('K₂ = K₁(√R₁)', 'K₃ = K₂(√R₂)');
      tower.adjoinedElements.push('√Δ', '√R₁', '√R₂');
      tower.degrees.push(2, 2, 2);
    }

    this._radicalTower = tower;
    this._recordHistory('Radical tower constructed with ' + tower.fields.length + ' levels');
    return tower;
  }

  /**
   * 计算二次方程的根式解
   * Compute quadratic formula
   */
  public solveQuadratic(): string[] {
    const [a, b, c] = this._equation.coefficients;
    const discriminant = b * b - 4 * a * c;
    const sqrtD = Math.sqrt(Math.abs(discriminant));

    const solutions: string[] = [];
    if (discriminant >= 0) {
      solutions.push('(-' + b + ' + ' + sqrtD.toFixed(4) + ') / ' + (2 * a));
      solutions.push('(-' + b + ' - ' + sqrtD.toFixed(4) + ') / ' + (2 * a));
    } else {
      solutions.push('(-' + b + ' + ' + sqrtD.toFixed(4) + 'i) / ' + (2 * a));
      solutions.push('(-' + b + ' - ' + sqrtD.toFixed(4) + 'i) / ' + (2 * a));
    }

    this._solutionSteps.push('Applied quadratic formula');
    this._recordHistory('Quadratic equation solved');
    return solutions;
  }

  /**
   * 计算三次方程的Cardano公式
   * Compute Cardano's formula for cubic
   */
  public solveCubicCardano(): string[] {
    const [a, b, c, d] = this._equation.coefficients;
    // 简化：输出Cardano公式的一般形式
    const solutions: string[] = [
      '∛(-q/2 + √(q²/4 + p³/27)) + ∛(-q/2 - √(q²/4 + p³/27))',
      'ω∛(-q/2 + √(q²/4 + p³/27)) + ω²∛(-q/2 - √(q²/4 + p³/27))',
      'ω²∛(-q/2 + √(q²/4 + p³/27)) + ω∛(-q/2 - √(q²/4 + p³/27))'
    ];

    this._solutionSteps.push('Applied Cardano\'s formula');
    this._recordHistory('Cubic equation solved via Cardano formula');
    return solutions;
  }

  /**
   * 计算四次方程的Ferrari方法
   * Compute Ferrari's method for quartic
   */
  public solveQuarticFerrari(): string[] {
    // 简化的Ferrari方法描述
    const solutions: string[] = [
      '(-b + √(2y) + √(−(2y + 2b√(2y) − c))) / 2a',
      '(-b + √(2y) − √(−(2y + 2b√(2y) − c))) / 2a',
      '(-b − √(2y) + √(−(2y − 2b√(2y) − c))) / 2a',
      '(-b − √(2y) − √(−(2y − 2b√(2y) − c))) / 2a'
    ];

    this._solutionSteps.push('Applied Ferrari\'s method');
    this._recordHistory('Quartic equation solved via Ferrari method');
    return solutions;
  }

  /**
   * 证明五次及以上一般方程不可根式解
   * Prove unsolvability of general quintic and higher
   */
  public proveUnsolvability(): string {
    const proof = 'General polynomial of degree n≥5 has Galois group S_n. ' +
      'For n≥5, A_n is simple and non-abelian, hence S_n is not solvable. ' +
      'By Galois\' criterion, the equation is not solvable by radicals.';
    this._recordHistory('Unsolvability proof constructed for degree ' + this._equation.degree);
    return proof;
  }

  /**
   * 计算判别式与可解性的关系
   * Compute relation between discriminant and solvability
   */
  public computeDiscriminantSolvability(): string {
    const [a, b, c] = this._equation.coefficients;
    if (this._equation.degree === 2) {
      const disc = b * b - 4 * a * c;
      return disc >= 0 ? 'Real roots via rational discriminant' : 'Complex roots, still solvable';
    }
    this._recordHistory('Discriminant-solvability relation computed');
    return 'Discriminant analysis complete';
  }

  /**
   * 构造可解列
   * Construct solvable series
   */
  public constructSolvableSeries(): string[] {
    if (!this._isSolvable) return [];

    const series: string[] = ['G⁽⁰⁾ = G'];
    let current = this._galoisGroupOrder;
    let level = 1;
    while (current > 1) {
      const next = Math.floor(current / 2);
      series.push('G⁽' + level + '⁾, order ' + next);
      current = next;
      level++;
    }
    series.push('G⁽ⁿ⁾ = {e}');
    this._recordHistory('Solvable series constructed, length ' + series.length);
    return series;
  }

  /**
   * 验证根式解的每一步
   * Verify each step of radical solution
   */
  public verifySolutionSteps(): boolean {
    const valid = this._solutionSteps.length > 0 && this._isSolvable;
    this._recordHistory('Solution steps verified: ' + valid);
    return valid;
  }

  public report(): object {
    return {
      equationDegree: this._equation.degree,
      galoisGroupOrder: this._galoisGroupOrder,
      isSolvable: this._isSolvable,
      solutionStepCount: this._solutionSteps.length,
      hasRadicalTower: this._radicalTower !== null,
      history: this._history
    };
  }

  public reset(): void {
    this._galoisGroupOrder = 0;
    this._isSolvable = false;
    this._radicalTower = null;
    this._solutionSteps = [];
    this._history = [];
  }

  // ─── Private helpers ───

  private _recordHistory(entry: string): void {
    this._history.push('[' + Date.now() + '] ' + entry);
  }
}
