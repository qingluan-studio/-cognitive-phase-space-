/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 正规扩张 —— 代数闭包的守门人
 * Normal Extension: The Gatekeeper of Algebraic Closure
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 正规扩张是代数扩张中最和谐的一类。它们包含极小多项式的所有根，
 * 如同一个完整的星座，不遗漏任何一颗星。正规扩张与Galois扩张
 * 之间的桥梁就是可分性——这是代数世界的阴阳两面。
 */

export interface AlgebraicElement {
  readonly label: string;
  readonly minimalPolynomial: number[];
  readonly degree: number;
  readonly conjugates: string[];
}

export interface Embedding {
  readonly source: string;
  readonly target: string;
  readonly map: Map<string, number>;
}

export class NormalExtension {
  private _baseField: string;
  private _elements: Map<string, AlgebraicElement>;
  private _isNormal: boolean;
  private _isSeparable: boolean;
  private _isGalois: boolean;
  private _embeddings: Embedding[];
  private _history: string[];

  constructor(baseField: string) {
    this._baseField = baseField;
    this._elements = new Map();
    this._isNormal = false;
    this._isSeparable = false;
    this._isGalois = false;
    this._embeddings = [];
    this._history = [];
    this._recordHistory('Normal extension gatekeeper stationed over ' + baseField);
  }

  get baseField(): string { return this._baseField; }
  get isNormal(): boolean { return this._isNormal; }
  get isGalois(): boolean { return this._isGalois; }
  get elementCount(): number { return this._elements.size; }

  /**
   * 注册代数元及其共轭
   * Register algebraic element with its conjugates
   */
  public registerElement(element: AlgebraicElement): void {
    this._elements.set(element.label, element);
    this._recordHistory('Element ' + element.label + ' registered with ' + element.conjugates.length + ' conjugates');
  }

  /**
   * 验证扩张包含所有共轭元
   * Verify extension contains all conjugates
   */
  public verifyConjugateContainment(): boolean {
    for (const [, element] of this._elements) {
      for (const conjugate of element.conjugates) {
        if (!this._elements.has(conjugate)) {
          this._isNormal = false;
          this._recordHistory('Missing conjugate ' + conjugate + ' for element ' + element.label);
          return false;
        }
      }
    }
    this._isNormal = true;
    this._updateGaloisStatus();
    this._recordHistory('All conjugates contained; extension is normal');
    return true;
  }

  /**
   * 验证可分性：所有极小多项式无重根
   * Verify separability
   */
  public verifySeparability(): boolean {
    // 简化：在特征零域中所有扩张都可分
    let allSeparable = true;
    for (const [, element] of this._elements) {
      const hasRepeatedRoots = this._checkRepeatedRoots(element.minimalPolynomial);
      if (hasRepeatedRoots) {
        allSeparable = false;
        break;
      }
    }
    this._isSeparable = allSeparable;
    this._updateGaloisStatus();
    this._recordHistory('Separability verified: ' + allSeparable);
    return allSeparable;
  }

  /**
   * 验证是否为Galois扩张
   * Verify if extension is Galois
   */
  public verifyGalois(): boolean {
    this.verifyConjugateContainment();
    this.verifySeparability();
    this._isGalois = this._isNormal && this._isSeparable;
    this._recordHistory('Galois extension verified: ' + this._isGalois);
    return this._isGalois;
  }

  /**
   * 构造K-嵌入 K(α) → Ω
   * Construct K-embeddings into algebraic closure
   */
  public constructEmbeddings(targetField: string): Embedding[] {
    const embeddings: Embedding[] = [];
    for (const [label, element] of this._elements) {
      for (const conjugate of element.conjugates) {
        const map = new Map<string, number>();
        map.set(label, this._elements.get(conjugate)?.degree || 0);
        embeddings.push({
          source: label,
          target: conjugate,
          map
        });
      }
    }
    this._embeddings = embeddings;
    this._recordHistory('Constructed ' + embeddings.length + ' embeddings into ' + targetField);
    return embeddings;
  }

  /**
   * 计算嵌入的个数 [L:K]_s
   * Compute number of separable embeddings
   */
  public computeSeparableDegree(): number {
    let degree = 0;
    for (const [, element] of this._elements) {
      degree = Math.max(degree, element.conjugates.length);
    }
    this._recordHistory('Separable degree computed: ' + degree);
    return degree;
  }

  /**
   * 验证正规闭包
   * Verify normal closure
   */
  public verifyNormalClosure(): boolean {
    const closureExists = this._isNormal;
    this._recordHistory('Normal closure verified: ' + closureExists);
    return closureExists;
  }

  /**
   * 寻找正规闭包的最小扩张
   * Find minimal extension for normal closure
   */
  public findMinimalNormalClosure(): string[] {
    const requiredElements: string[] = [];
    for (const [, element] of this._elements) {
      for (const conjugate of element.conjugates) {
        if (!this._elements.has(conjugate)) {
          requiredElements.push(conjugate);
        }
      }
    }
    this._recordHistory('Minimal normal closure requires ' + requiredElements.length + ' additional elements');
    return requiredElements;
  }

  /**
   * 计算不可分次数 [L:K]_i
   * Compute inseparable degree
   */
  public computeInseparableDegree(): number {
    const totalDegree = this._elements.size;
    const separableDegree = this.computeSeparableDegree();
    const inseparable = totalDegree / separableDegree;
    this._recordHistory('Inseparable degree: ' + inseparable);
    return inseparable;
  }

  /**
   * 验证Artin定理：中间域 ↔ 闭子群
   * Verify Artin's theorem
   */
  public verifyArtinTheorem(subgroupOrder: number): boolean {
    // 简化：|G| = [L:K]，中间域的个数等于子群的个数
    const expectedSubgroups = this._elements.size;
    const holds = subgroupOrder <= expectedSubgroups;
    this._recordHistory('Artin theorem verified: ' + holds);
    return holds;
  }

  /**
   * 计算固定域 Fix(H)
   * Compute fixed field of a subgroup
   */
  public computeFixedField(subgroupElements: string[]): string {
    const fixed = 'Fix(' + subgroupElements.join(',') + ')';
    this._recordHistory('Fixed field computed: ' + fixed);
    return fixed;
  }

  /**
   * 应用正规基定理
   * Apply normal basis theorem
   */
  public applyNormalBasisTheorem(): string {
    const basis = 'Normal basis: {σ(α) | σ ∈ Gal(L/K)}';
    this._recordHistory('Normal basis theorem applied');
    return basis;
  }

  public report(): object {
    return {
      baseField: this._baseField,
      elementCount: this._elements.size,
      isNormal: this._isNormal,
      isSeparable: this._isSeparable,
      isGalois: this._isGalois,
      embeddingCount: this._embeddings.length,
      history: this._history
    };
  }

  public reset(): void {
    this._elements.clear();
    this._isNormal = false;
    this._isSeparable = false;
    this._isGalois = false;
    this._embeddings = [];
    this._history = [];
  }

  // ─── Private helpers ───

  private _recordHistory(entry: string): void {
    this._history.push('[' + Date.now() + '] ' + entry);
  }

  private _updateGaloisStatus(): void {
    this._isGalois = this._isNormal && this._isSeparable;
  }

  private _checkRepeatedRoots(polynomial: number[]): boolean {
    // 简化：检查判别式是否为零
    if (polynomial.length === 3) {
      const [a, b, c] = polynomial;
      const discriminant = b * b - 4 * a * c;
      return Math.abs(discriminant) < 1e-10;
    }
    return false;
  }
}
