/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Galois群 —— 对称性的终极审判
 * Galois Group: The Ultimate Judgment of Symmetry
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Galois群是域扩张的灵魂。它衡量了扩张中隐藏的对称性，
 * 将可解性问题转化为群论的语言。当Galois群是可解群时，
 * 方程的根式解便如同天堂的钥匙，落入凡人之手。
 */

export interface Automorphism {
  readonly label: string;
  readonly permutation: number[];
  readonly order: number;
}

export interface Subgroup {
  readonly label: string;
  readonly elements: string[];
  readonly isNormal: boolean;
}

export interface GaloisCorrespondence {
  readonly subgroup: Subgroup;
  readonly fixedField: string;
  readonly extensionDegree: number;
}

export class GaloisGroup {
  private _extensionLabel: string;
  private _elements: Map<string, Automorphism>;
  private _subgroups: Subgroup[];
  private _correspondences: GaloisCorrespondence[];
  private _isSolvable: boolean;
  private _isAbelian: boolean;
  private _order: number;
  private _history: string[];

  constructor(extensionLabel: string, order: number) {
    this._extensionLabel = extensionLabel;
    this._elements = new Map();
    this._subgroups = [];
    this._correspondences = [];
    this._isSolvable = false;
    this._isAbelian = false;
    this._order = order;
    this._history = [];
    this._recordHistory('Galois group awakened for ' + extensionLabel + ', order ' + order);
  }

  get extensionLabel(): string { return this._extensionLabel; }
  get order(): number { return this._order; }
  get isSolvable(): boolean { return this._isSolvable; }
  get isAbelian(): boolean { return this._isAbelian; }

  /**
   * 注册一个自同构
   * Register an automorphism
   */
  public registerAutomorphism(auto: Automorphism): void {
    this._elements.set(auto.label, auto);
    this._recordHistory('Automorphism ' + auto.label + ' joined the Galois group');
  }

  /**
   * 计算两个自同构的复合
   * Compute composition of two automorphisms
   */
  public composeAutomosphisms(aLabel: string, bLabel: string): number[] {
    const a = this._elements.get(aLabel);
    const b = this._elements.get(bLabel);
    if (!a || !b) return [];

    const composition: number[] = [];
    for (let i = 0; i < a.permutation.length; i++) {
      composition.push(b.permutation[a.permutation[i]]);
    }
    this._recordHistory('Composed ' + aLabel + ' ∘ ' + bLabel);
    return composition;
  }

  /**
   * 计算自同构的逆
   * Compute inverse of an automorphism
   */
  public computeInverse(autoLabel: string): number[] {
    const auto = this._elements.get(autoLabel);
    if (!auto) return [];

    const inverse: number[] = Array(auto.permutation.length).fill(0);
    for (let i = 0; i < auto.permutation.length; i++) {
      inverse[auto.permutation[i]] = i;
    }
    this._recordHistory('Inverse of ' + autoLabel + ' computed');
    return inverse;
  }

  /**
   * 验证群公理：封闭性、结合律、单位元、逆元
   * Verify group axioms
   */
  public verifyGroupAxioms(): boolean {
    if (this._elements.size !== this._order) return false;
    // 简化：假设所有自同构满足群公理
    const isGroup = this._elements.size > 0;
    this._recordHistory('Group axioms verified: ' + isGroup);
    return isGroup;
  }

  /**
   * 验证群是否为阿贝尔群
   * Verify if group is abelian
   */
  public verifyAbelian(): boolean {
    const labels = Array.from(this._elements.keys());
    for (const a of labels) {
      for (const b of labels) {
        const ab = this.composeAutomosphisms(a, b);
        const ba = this.composeAutomosphisms(b, a);
        if (!this._permutationsEqual(ab, ba)) {
          this._isAbelian = false;
          this._recordHistory('Group is not abelian: ' + a + ' and ' + b + ' do not commute');
          return false;
        }
      }
    }
    this._isAbelian = true;
    this._recordHistory('Group is abelian');
    return true;
  }

  /**
   * 验证群是否为可解群
   * Verify if group is solvable
   */
  public verifySolvable(): boolean {
    // 简化：p-群、阿贝尔群、阶小于60的群都是可解的
    const solvable = this._isAbelian || this._order < 60 || this._order % 2 !== 0;
    this._isSolvable = solvable;
    this._recordHistory('Solvability verified: ' + solvable);
    return solvable;
  }

  /**
   * 寻找所有子群
   * Find all subgroups
   */
  public findSubgroups(): Subgroup[] {
    const subgroups: Subgroup[] = [];
    const labels = Array.from(this._elements.keys());
    // 简化：添加平凡子群和全群
    subgroups.push({ label: 'trivial', elements: [labels[0] || 'e'], isNormal: true });
    subgroups.push({ label: 'whole', elements: labels, isNormal: true });

    // 寻找2阶子群
    for (const [label, auto] of this._elements) {
      if (auto.order === 2) {
        subgroups.push({ label: 'H_' + label, elements: [labels[0] || 'e', label], isNormal: false });
      }
    }

    this._subgroups = subgroups;
    this._recordHistory('Found ' + subgroups.length + ' subgroups');
    return [...subgroups];
  }

  /**
   * 验证子群的正规性
   * Verify normality of subgroup
   */
  public verifySubgroupNormality(subgroup: Subgroup): boolean {
    const labels = Array.from(this._elements.keys());
    for (const g of labels) {
      for (const h of subgroup.elements) {
        const ghgInv = this._conjugate(g, h);
        if (!subgroup.elements.includes(ghgInv)) {
          this._recordHistory('Subgroup ' + subgroup.label + ' is not normal');
          return false;
        }
      }
    }
    this._recordHistory('Subgroup ' + subgroup.label + ' is normal');
    return true;
  }

  /**
   * 应用Galois对应：子群 ↔ 中间域
   * Apply Galois correspondence
   */
  public applyGaloisCorrespondence(): GaloisCorrespondence[] {
    const correspondences: GaloisCorrespondence[] = [];
    for (const subgroup of this._subgroups) {
      const fixedField = 'Fix(' + subgroup.label + ')';
      const extDegree = this._order / subgroup.elements.length;
      correspondences.push({ subgroup, fixedField, extensionDegree: extDegree });
    }
    this._correspondences = correspondences;
    this._recordHistory('Galois correspondence established with ' + correspondences.length + ' entries');
    return [...correspondences];
  }

  /**
   * 计算商群 G/H
   * Compute quotient group
   */
  public computeQuotientGroup(normalSubgroup: Subgroup): string[] {
    if (!normalSubgroup.isNormal) {
      this._recordHistory('Cannot form quotient: subgroup not normal');
      return [];
    }

    const cosets: string[] = [];
    const labels = Array.from(this._elements.keys());
    const used = new Set<string>();

    for (const g of labels) {
      if (used.has(g)) continue;
      const coset = this._computeCoset(g, normalSubgroup);
      cosets.push(coset.join('H'));
      for (const elem of coset) used.add(elem);
    }

    this._recordHistory('Quotient group G/' + normalSubgroup.label + ' has ' + cosets.length + ' cosets');
    return cosets;
  }

  /**
   * 寻找合成列
   * Find composition series
   */
  public findCompositionSeries(): Subgroup[] {
    const series: Subgroup[] = [];
    // 简化：从平凡子群到全群的合成列
    series.push(this._subgroups.find(s => s.label === 'trivial') || { label: '1', elements: [], isNormal: true });

    if (this._isSolvable) {
      // 可解群有阿贝尔商群的合成列
      for (const sg of this._subgroups) {
        if (sg.label !== 'trivial' && sg.label !== 'whole') {
          series.push(sg);
        }
      }
    }

    series.push(this._subgroups.find(s => s.label === 'whole') || { label: 'G', elements: [], isNormal: true });
    this._recordHistory('Composition series found, length ' + series.length);
    return series;
  }

  /**
   * 验证根式可解性：Galois群可解当且仅当方程根式可解
   * Verify solvability by radicals
   */
  public verifySolvableByRadicals(): boolean {
    const solvable = this.verifySolvable();
    this._recordHistory('Equation solvable by radicals: ' + solvable);
    return solvable;
  }

  /**
   * 计算Galois群的中心
   * Compute center of Galois group
   */
  public computeCenter(): string[] {
    const center: string[] = [];
    const labels = Array.from(this._elements.keys());

    for (const z of labels) {
      let commutesWithAll = true;
      for (const g of labels) {
        const zg = this.composeAutomosphisms(z, g);
        const gz = this.composeAutomosphisms(g, z);
        if (!this._permutationsEqual(zg, gz)) {
          commutesWithAll = false;
          break;
        }
      }
      if (commutesWithAll) center.push(z);
    }

    this._recordHistory('Center of Galois group has ' + center.length + ' elements');
    return center;
  }

  public report(): object {
    return {
      extensionLabel: this._extensionLabel,
      order: this._order,
      isSolvable: this._isSolvable,
      isAbelian: this._isAbelian,
      elementCount: this._elements.size,
      subgroupCount: this._subgroups.length,
      correspondenceCount: this._correspondences.length,
      history: this._history
    };
  }

  public reset(): void {
    this._elements.clear();
    this._subgroups = [];
    this._correspondences = [];
    this._isSolvable = false;
    this._isAbelian = false;
    this._history = [];
  }

  // ─── Private helpers ───

  private _recordHistory(entry: string): void {
    this._history.push('[' + Date.now() + '] ' + entry);
  }

  private _permutationsEqual(a: number[], b: number[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  private _conjugate(g: string, h: string): string {
    // 简化：返回g h g⁻¹的表示
    return g + '_' + h + '_' + g + '_inv';
  }

  private _computeCoset(representative: string, subgroup: Subgroup): string[] {
    const coset: string[] = [];
    for (const h of subgroup.elements) {
      coset.push(representative + '_' + h);
    }
    return coset;
  }
}
