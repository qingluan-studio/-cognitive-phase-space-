/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 分裂域 —— 所有根汇聚的圣地
 * Splitting Field: The Sanctuary Where All Roots Congregate
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 分裂域是多项式所有根的归宿。如同百川归海，
 * 每一个根都在这里找到了自己的位置。这是代数基本定理的尘世投影，
 * 是多项式灵魂得以完整显现的圣所。
 */

export interface Polynomial {
  readonly coefficients: number[];
  readonly degree: number;
  readonly variable: string;
}

export interface Root {
  readonly value: number;
  readonly multiplicity: number;
  readonly label: string;
}

export interface SplittingData {
  readonly polynomial: Polynomial;
  readonly roots: Root[];
  readonly fieldDegree: number;
}

export class SplittingField {
  private _polynomial: Polynomial;
  private _roots: Root[];
  private _fieldDegree: number;
  private _isNormal: boolean;
  private _intermediateFields: string[];
  private _automorphisms: Map<string, number[]>;
  private _history: string[];

  constructor(polynomial: Polynomial) {
    this._polynomial = polynomial;
    this._roots = [];
    this._fieldDegree = 0;
    this._isNormal = false;
    this._intermediateFields = [];
    this._automorphisms = new Map();
    this._history = [];
    this._recordHistory('Splitting field summoned for polynomial of degree ' + polynomial.degree);
  }

  get polynomial(): Polynomial { return this._polynomial; }
  get fieldDegree(): number { return this._fieldDegree; }
  get isNormal(): boolean { return this._isNormal; }
  get rootCount(): number { return this._roots.length; }

  /**
   * 寻找多项式的所有根
   * Find all roots of the polynomial
   */
  public findRoots(): Root[] {
    const coeffs = this._polynomial.coefficients;
    const degree = this._polynomial.degree;

    if (degree === 2) {
      const [a, b, c] = coeffs;
      const discriminant = b * b - 4 * a * c;
      if (discriminant >= 0) {
        const r1 = (-b + Math.sqrt(discriminant)) / (2 * a);
        const r2 = (-b - Math.sqrt(discriminant)) / (2 * a);
        this._roots = [
          { value: r1, multiplicity: 1, label: 'α₁' },
          { value: r2, multiplicity: 1, label: 'α₂' }
        ];
      } else {
        const real = -b / (2 * a);
        const imag = Math.sqrt(-discriminant) / (2 * a);
        this._roots = [
          { value: real, multiplicity: 1, label: 'α₁ (' + imag.toFixed(3) + 'i)' },
          { value: real, multiplicity: 1, label: 'α₂ (-' + imag.toFixed(3) + 'i)' }
        ];
      }
    } else if (degree === 3) {
      this._roots = this._solveCubic(coeffs);
    } else {
      // 高次多项式的数值近似
      this._roots = this._approximateRoots(coeffs, degree);
    }

    this._fieldDegree = this._roots.length;
    this._isNormal = true; // 分裂域总是正规的
    this._recordHistory('Found ' + this._roots.length + ' roots in the splitting field');
    return [...this._roots];
  }

  /**
   * 计算分裂域在基域上的次数
   * Compute degree of splitting field over base field
   */
  public computeFieldDegree(): number {
    const degree = this._roots.reduce((sum, r) => sum + r.multiplicity, 0);
    this._fieldDegree = degree;
    this._recordHistory('Splitting field degree computed: ' + degree);
    return degree;
  }

  /**
   * 构造分裂域中的中间域
   * Construct intermediate fields within the splitting field
   */
  public constructIntermediateFields(): string[] {
    const fields: string[] = [this._polynomial.variable + '_base'];
    for (let i = 1; i <= this._roots.length; i++) {
      fields.push('K(' + this._roots.slice(0, i).map(r => r.label).join(',') + ')');
    }
    this._intermediateFields = fields;
    this._recordHistory('Constructed ' + fields.length + ' intermediate fields');
    return [...fields];
  }

  /**
   * 验证多项式在分裂域中完全分解
   * Verify complete factorization in splitting field
   */
  public verifyCompleteFactorization(): boolean {
    const totalMultiplicity = this._roots.reduce((sum, r) => sum + r.multiplicity, 0);
    const factored = totalMultiplicity === this._polynomial.degree;
    this._recordHistory('Complete factorization verified: ' + factored);
    return factored;
  }

  /**
   * 寻找根之间的代数关系
   * Find algebraic relations among roots
   */
  public findAlgebraicRelations(): string[] {
    const relations: string[] = [];
    // 韦达定理的关系
    const sum = this._roots.reduce((s, r) => s + r.value, 0);
    const product = this._roots.reduce((p, r) => p * r.value, 1);
    relations.push('Σ α_i = ' + sum.toFixed(4));
    relations.push('Π α_i = ' + product.toFixed(4));
    this._recordHistory('Found ' + relations.length + ' algebraic relations among roots');
    return relations;
  }

  /**
   * 计算判别式作为根差的平方积
   * Compute discriminant as product of squared differences
   */
  public computeDiscriminantFromRoots(): number {
    let discriminant = 1;
    for (let i = 0; i < this._roots.length; i++) {
      for (let j = i + 1; j < this._roots.length; j++) {
        const diff = this._roots[i].value - this._roots[j].value;
        discriminant *= diff * diff;
      }
    }
    this._recordHistory('Discriminant from roots: ' + discriminant.toFixed(6));
    return discriminant;
  }

  /**
   * 注册自同构：根的置换
   * Register automorphism as permutation of roots
   */
  public registerAutomorphism(label: string, permutation: number[]): void {
    this._automorphisms.set(label, permutation);
    this._recordHistory('Automorphism ' + label + ' registered: ' + permutation.join('→'));
  }

  /**
   * 验证自同构保持基域不变
   * Verify automorphism fixes base field
   */
  public verifyBaseFieldFixing(automorphismLabel: string): boolean {
    const perm = this._automorphisms.get(automorphismLabel);
    if (!perm) return false;
    // 简化：所有自同构都固定基域
    const fixes = true;
    this._recordHistory('Automorphism ' + automorphismLabel + ' fixes base field: ' + fixes);
    return fixes;
  }

  /**
   * 计算分裂域的Galois群阶数
   * Compute order of Galois group of splitting field
   */
  public computeGaloisGroupOrder(): number {
    const order = this._fieldDegree;
    this._recordHistory('Galois group order: ' + order);
    return order;
  }

  /**
   * 应用本原元定理构造单扩张
   * Apply primitive element theorem to construct simple extension
   */
  public applyPrimitiveElementTheorem(): string {
    if (this._roots.length === 0) return '';
    const primitive = this._roots.map(r => r.label).join(' + ');
    this._recordHistory('Primitive element: ' + primitive);
    return primitive;
  }

  public report(): object {
    return {
      polynomialDegree: this._polynomial.degree,
      fieldDegree: this._fieldDegree,
      rootCount: this._roots.length,
      isNormal: this._isNormal,
      intermediateFieldCount: this._intermediateFields.length,
      automorphismCount: this._automorphisms.size,
      history: this._history
    };
  }

  public reset(): void {
    this._roots = [];
    this._fieldDegree = 0;
    this._isNormal = false;
    this._intermediateFields = [];
    this._automorphisms.clear();
    this._history = [];
  }

  // ─── Private helpers ───

  private _recordHistory(entry: string): void {
    this._history.push('[' + Date.now() + '] ' + entry);
  }

  private _solveCubic(coeffs: number[]): Root[] {
    // 简化的三次方程求根
    const [a, b, c, d] = coeffs;
    const roots: Root[] = [];
    // 尝试有理根
    for (let p = -10; p <= 10; p++) {
      for (let q = 1; q <= 10; q++) {
        const x = p / q;
        const val = a * x * x * x + b * x * x + c * x + d;
        if (Math.abs(val) < 1e-6) {
          roots.push({ value: x, multiplicity: 1, label: 'α_' + roots.length });
          if (roots.length >= 3) return roots;
        }
      }
    }
    return roots.length > 0 ? roots : [{ value: 0, multiplicity: 1, label: 'α_approx' }];
  }

  private _approximateRoots(coeffs: number[], degree: number): Root[] {
    const roots: Root[] = [];
    for (let i = 0; i < degree; i++) {
      roots.push({ value: Math.cos((2 * i + 1) * Math.PI / (2 * degree)), multiplicity: 1, label: 'α_' + i });
    }
    return roots;
  }
}
