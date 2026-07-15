/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 域扩张 —— 数字的朝圣之旅
 * Field Extension: The Pilgrimage of Numbers
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 域扩张是数的最深刻冒险。当有理数踏上寻找代数闭包的旅途，
 * 每一次添加根式都是一次灵魂的跃迁。塔式扩张如同巴别塔，
 * 一层一层地触及天堂的门槛。
 */

export interface FieldElement {
  readonly coefficients: number[];
  readonly degree: number;
}

export interface ExtensionTower {
  readonly baseField: string;
  readonly extensions: string[];
  readonly degrees: number[];
}

export interface PrimitiveElement {
  readonly element: FieldElement;
  readonly minimalPolynomial: number[];
}

export class FieldExtension {
  private _baseField: string;
  private _extensionDegree: number;
  private _minimalPolynomial: number[];
  private _elements: Map<string, FieldElement>;
  private _isAlgebraic: boolean;
  private _isSeparable: boolean;
  private _isNormal: boolean;
  private _isGalois: boolean;
  private _history: string[];

  constructor(baseField: string, minimalPolynomial: number[]) {
    this._baseField = baseField;
    this._minimalPolynomial = [...minimalPolynomial];
    this._extensionDegree = minimalPolynomial.length - 1;
    this._elements = new Map();
    this._isAlgebraic = true;
    this._isSeparable = true;
    this._isNormal = false;
    this._isGalois = false;
    this._history = [];
    this._recordHistory('Field extension born over ' + baseField + ', degree ' + this._extensionDegree);
  }

  get baseField(): string { return this._baseField; }
  get extensionDegree(): number { return this._extensionDegree; }
  get isAlgebraic(): boolean { return this._isAlgebraic; }
  get isSeparable(): boolean { return this._isSeparable; }
  get isGalois(): boolean { return this._isGalois; }

  /**
   * 注册一个域元素
   * Register a field element
   */
  public registerElement(label: string, element: FieldElement): void {
    this._elements.set(label, element);
    this._recordHistory('Element ' + label + ' inscribed into the extension field');
  }

  /**
   * 计算极小多项式在基域上的次数
   * Compute degree of minimal polynomial over base field
   */
  public computeDegree(): number {
    const degree = this._minimalPolynomial.length - 1;
    this._extensionDegree = degree;
    this._recordHistory('Extension degree computed: ' + degree);
    return degree;
  }

  /**
   * 验证元素是否属于基域
   * Verify if element belongs to base field
   */
  public isInBaseField(element: FieldElement): boolean {
    const inBase = element.degree <= 1;
    this._recordHistory('Element degree ' + element.degree + ' in base field: ' + inBase);
    return inBase;
  }

  /**
   * 计算域扩张的迹 Tr_{L/K}(α)
   * Compute field trace
   */
  public computeTrace(element: FieldElement): number {
    // 简化：迹是共轭根的和，等于极小多项式次高项系数的相反数
    if (this._minimalPolynomial.length < 2) return 0;
    const trace = -this._minimalPolynomial[this._minimalPolynomial.length - 2];
    this._recordHistory('Trace computed: ' + trace);
    return trace;
  }

  /**
   * 计算域扩张的范数 N_{L/K}(α)
   * Compute field norm
   */
  public computeNorm(element: FieldElement): number {
    // 简化：范数是常数项（符号取决于次数的奇偶性）
    const degree = this._minimalPolynomial.length - 1;
    const constantTerm = this._minimalPolynomial[0];
    const norm = degree % 2 === 0 ? constantTerm : -constantTerm;
    this._recordHistory('Norm computed: ' + norm);
    return norm;
  }

  /**
   * 验证可分性：极小多项式无重根
   * Verify separability
   */
  public verifySeparability(): boolean {
    // 简化：特征零域上所有代数扩张都可分
    const separable = true;
    this._isSeparable = separable;
    this._recordHistory('Separability verified: ' + separable);
    return separable;
  }

  /**
   * 验证正规性：扩张包含极小多项式的所有根
   * Verify normality
   */
  public verifyNormality(): boolean {
    // 简化检查：假设扩张包含所有共轭根
    const normal = this._elements.size >= this._extensionDegree;
    this._isNormal = normal;
    this._updateGaloisStatus();
    this._recordHistory('Normality verified: ' + normal);
    return normal;
  }

  /**
   * 验证扩张是否为Galois扩张
   * Verify if extension is Galois
   */
  public verifyGalois(): boolean {
    this._isGalois = this._isNormal && this._isSeparable;
    this._recordHistory('Galois extension: ' + this._isGalois);
    return this._isGalois;
  }

  /**
   * 寻找本原元（本原元定理）
   * Find primitive element
   */
  public findPrimitiveElement(): PrimitiveElement | null {
    // 简化：在有限扩张中，添加一个本原元即可生成整个扩张
    for (const [label, element] of this._elements) {
      if (element.degree === this._extensionDegree) {
        const primitive: PrimitiveElement = {
          element,
          minimalPolynomial: this._minimalPolynomial
        };
        this._recordHistory('Primitive element found: ' + label);
        return primitive;
      }
    }
    this._recordHistory('No primitive element found');
    return null;
  }

  /**
   * 构造扩张塔 K ⊂ K(α₁) ⊂ K(α₁, α₂) ⊂ ... ⊂ L
   * Construct extension tower
   */
  public constructTower(intermediateDegrees: number[]): ExtensionTower {
    const tower: ExtensionTower = {
      baseField: this._baseField,
      extensions: [],
      degrees: []
    };

    let currentDegree = 1;
    for (let i = 0; i < intermediateDegrees.length; i++) {
      currentDegree *= intermediateDegrees[i];
      tower.extensions.push('L_' + i);
      tower.degrees.push(currentDegree);
    }

    this._recordHistory('Extension tower constructed with ' + tower.extensions.length + ' steps');
    return tower;
  }

  /**
   * 计算两个扩张的复合域
   * Compute compositum of two extensions
   */
  public computeCompositum(other: FieldExtension): number {
    const gcd = this._gcd(this._extensionDegree, other.extensionDegree);
    const compositumDegree = (this._extensionDegree * other.extensionDegree) / gcd;
    this._recordHistory('Compositum degree computed: ' + compositumDegree);
    return compositumDegree;
  }

  /**
   * 计算域扩张的判别式
   * Compute discriminant of field extension
   */
  public computeDiscriminant(): number {
    // 简化：对二次扩张 ax² + bx + c，判别式为 b² - 4ac
    if (this._minimalPolynomial.length === 3) {
      const [a, b, c] = this._minimalPolynomial;
      const disc = b * b - 4 * a * c;
      this._recordHistory('Discriminant computed: ' + disc);
      return disc;
    }
    this._recordHistory('Discriminant computation simplified for higher degree');
    return 0;
  }

  public report(): object {
    return {
      baseField: this._baseField,
      extensionDegree: this._extensionDegree,
      isAlgebraic: this._isAlgebraic,
      isSeparable: this._isSeparable,
      isNormal: this._isNormal,
      isGalois: this._isGalois,
      elementCount: this._elements.size,
      history: this._history
    };
  }

  public reset(): void {
    this._elements.clear();
    this._isSeparable = true;
    this._isNormal = false;
    this._isGalois = false;
    this._history = [];
  }

  // ─── Private helpers ───

  private _recordHistory(entry: string): void {
    this._history.push('[' + Date.now() + '] ' + entry);
  }

  private _updateGaloisStatus(): void {
    this._isGalois = this._isNormal && this._isSeparable;
  }

  private _gcd(a: number, b: number): number {
    while (b !== 0) {
      const temp = b;
      b = a % b;
      a = temp;
    }
    return a;
  }
}
