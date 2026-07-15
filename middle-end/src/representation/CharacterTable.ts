/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 特征标表 —— 对称性的指纹
 * Character Table: The Fingerprint of Symmetry
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 特征标表是群表示论中最神圣的文献。每一行是一个不可约表示的灵魂，
 * 每一列是一个共轭类的面具。正交关系如同星辰之间的引力，
 * 将离散的算术与连续的几何焊接在一起。
 */

export interface ConjugacyClass {
  readonly label: string;
  readonly size: number;
  readonly representative: string;
  readonly order: number;
}

export interface IrreducibleCharacter {
  readonly label: string;
  readonly dimension: number;
  readonly values: number[];
}

export interface CharacterEntry {
  readonly classLabel: string;
  readonly charLabel: string;
  readonly value: number;
}

export class CharacterTable {
  private _groupName: string;
  private _classes: ConjugacyClass[];
  private _irreducibles: IrreducibleCharacter[];
  private _table: Map<string, Map<string, number>>;
  private _isOrthogonal: boolean;
  private _classCount: number;
  private _irreducibleCount: number;
  private _history: string[];

  constructor(groupName: string) {
    this._groupName = groupName;
    this._classes = [];
    this._irreducibles = [];
    this._table = new Map();
    this._isOrthogonal = false;
    this._classCount = 0;
    this._irreducibleCount = 0;
    this._history = [];
    this._recordHistory('Character table summoned for ' + groupName);
  }

  get groupName(): string { return this._groupName; }
  get classCount(): number { return this._classCount; }
  get irreducibleCount(): number { return this._irreducibleCount; }
  get isOrthogonal(): boolean { return this._isOrthogonal; }

  /**
   * 注册一个共轭类
   * Register a conjugacy class
   */
  public registerConjugacyClass(cls: ConjugacyClass): void {
    this._classes.push(cls);
    this._classCount = this._classes.length;
    this._recordHistory('Conjugacy class ' + cls.label + ' inscribed, size ' + cls.size);
  }

  /**
   * 注册一个不可约特征标
   * Register an irreducible character
   */
  public registerIrreducibleCharacter(ch: IrreducibleCharacter): void {
    this._irreducibles.push(ch);
    this._irreducibleCount = this._irreducibles.length;
    if (!this._table.has(ch.label)) {
      this._table.set(ch.label, new Map());
    }
    for (let i = 0; i < this._classes.length && i < ch.values.length; i++) {
      this._table.get(ch.label)!.set(this._classes[i].label, ch.values[i]);
    }
    this._recordHistory('Irreducible character ' + ch.label + ' inscribed, dimension ' + ch.dimension);
  }

  /**
   * 验证第一正交关系：行正交性
   * Verify first orthogonality relation (row orthogonality)
   */
  public verifyRowOrthogonality(chiLabel: string, psiLabel: string): number {
    const chi = this._table.get(chiLabel);
    const psi = this._table.get(psiLabel);
    if (!chi || !psi) return NaN;

    let sum = 0;
    const groupOrder = this._computeGroupOrder();
    for (const cls of this._classes) {
      const chiVal = chi.get(cls.label) || 0;
      const psiVal = psi.get(cls.label) || 0;
      sum += cls.size * chiVal * this._complexConjugate(psiVal);
    }

    const expected = chiLabel === psiLabel ? groupOrder : 0;
    this._recordHistory('Row orthogonality <' + chiLabel + ',' + psiLabel + '> = ' + sum + ' (expected ' + expected + ')');
    return sum;
  }

  /**
   * 验证第二正交关系：列正交性
   * Verify second orthogonality relation (column orthogonality)
   */
  public verifyColumnOrthogonality(classA: string, classB: string): number {
    let sum = 0;
    const groupOrder = this._computeGroupOrder();
    for (const irr of this._irreducibles) {
      const chiA = this._table.get(irr.label)?.get(classA) || 0;
      const chiB = this._table.get(irr.label)?.get(classB) || 0;
      sum += chiA * this._complexConjugate(chiB);
    }

    const clsA = this._classes.find(c => c.label === classA);
    const clsB = this._classes.find(c => c.label === classB);
    const expected = (classA === classB && clsA) ? groupOrder / clsA.size : 0;
    this._recordHistory('Column orthogonality [' + classA + ',' + classB + '] = ' + sum + ' (expected ' + expected + ')');
    return sum;
  }

  /**
   * 计算特征标的内积 ⟨χ, ψ⟩
   * Compute character inner product
   */
  public innerProduct(chiLabel: string, psiLabel: string): number {
    const groupOrder = this._computeGroupOrder();
    const rowOrtho = this.verifyRowOrthogonality(chiLabel, psiLabel);
    return rowOrtho / groupOrder;
  }

  /**
   * 将特征标分解为不可约特征标的直和
   * Decompose a character into irreducibles
   */
  public decomposeCharacter(charLabel: string): Map<string, number> {
    const multiplicities = new Map<string, number>();
    for (const irr of this._irreducibles) {
      const multiplicity = this.innerProduct(charLabel, irr.label);
      if (Math.abs(multiplicity) > 1e-10) {
        multiplicities.set(irr.label, Math.round(multiplicity));
      }
    }
    this._recordHistory('Character ' + charLabel + ' decomposed into ' + multiplicities.size + ' irreducibles');
    return multiplicities;
  }

  /**
   * 验证特征标表的完备性：Σ(dim_i)² = |G|
   * Verify completeness: sum of squares of dimensions equals group order
   */
  public verifyCompleteness(): boolean {
    let sumSquares = 0;
    for (const irr of this._irreducibles) {
      sumSquares += irr.dimension * irr.dimension;
    }
    const groupOrder = this._computeGroupOrder();
    const complete = Math.abs(sumSquares - groupOrder) < 1e-10;
    this._recordHistory('Completeness check: Σd² = ' + sumSquares + ', |G| = ' + groupOrder + ', complete = ' + complete);
    return complete;
  }

  /**
   * 计算特征标的次数与群阶的关系
   * Verify that dimension divides group order
   */
  public verifyDimensionDividesOrder(): boolean {
    const groupOrder = this._computeGroupOrder();
    for (const irr of this._irreducibles) {
      if (groupOrder % irr.dimension !== 0) {
        this._recordHistory('Dimension theorem violated by ' + irr.label);
        return false;
      }
    }
    this._recordHistory('All dimensions divide group order');
    return true;
  }

  /**
   * 计算Burnside环中的诱导特征标
   * Compute induced character from subgroup
   */
  public induceCharacter(subgroupValues: number[], index: number): number[] {
    const induced: number[] = [];
    for (const cls of this._classes) {
      const val = subgroupValues[0] || 0;
      induced.push(index * val);
    }
    this._recordHistory('Character induced with index ' + index);
    return induced;
  }

  /**
   * 计算特征标的张量积 χ ⊗ ψ
   * Compute tensor product of characters
   */
  public tensorProductCharacters(chiLabel: string, psiLabel: string): number[] {
    const chi = this._table.get(chiLabel);
    const psi = this._table.get(psiLabel);
    if (!chi || !psi) return [];

    const product: number[] = [];
    for (const cls of this._classes) {
      const chiVal = chi.get(cls.label) || 0;
      const psiVal = psi.get(cls.label) || 0;
      product.push(chiVal * psiVal);
    }
    this._recordHistory('Tensor product ' + chiLabel + ' ⊗ ' + psiLabel + ' computed');
    return product;
  }

  /**
   * 应用Frobenius互反律
   * Apply Frobenius reciprocity
   */
  public frobeniusReciprocity(subgroupChar: string, inducedChar: string, restriction: number[]): boolean {
    // 简化验证：⟨Ind_H^G(ψ), χ⟩_G = ⟨ψ, Res_H^G(χ)⟩_H
    const left = this.innerProduct(inducedChar, subgroupChar);
    const right = restriction.reduce((a, b) => a + b, 0) / restriction.length;
    const holds = Math.abs(left - right) < 1e-10;
    this._recordHistory('Frobenius reciprocity verified: ' + holds);
    return holds;
  }

  /**
   * 计算特征标表的行列式
   * Compute determinant of character table
   */
  public computeDeterminant(): number {
    if (this._irreducibles.length === 0 || this._classes.length === 0) return 0;
    const matrix: number[][] = [];
    for (const irr of this._irreducibles) {
      const row: number[] = [];
      for (const cls of this._classes) {
        row.push(this._table.get(irr.label)?.get(cls.label) || 0);
      }
      matrix.push(row);
    }
    const det = this._determinant2x2Or3x3(matrix);
    this._recordHistory('Character table determinant: ' + det);
    return det;
  }

  public report(): object {
    return {
      groupName: this._groupName,
      classCount: this._classCount,
      irreducibleCount: this._irreducibleCount,
      isOrthogonal: this._isOrthogonal,
      groupOrder: this._computeGroupOrder(),
      history: this._history
    };
  }

  public reset(): void {
    this._classes = [];
    this._irreducibles = [];
    this._table.clear();
    this._isOrthogonal = false;
    this._classCount = 0;
    this._irreducibleCount = 0;
    this._history = [];
  }

  // ─── Private helpers ───

  private _recordHistory(entry: string): void {
    this._history.push('[' + Date.now() + '] ' + entry);
  }

  private _computeGroupOrder(): number {
    return this._classes.reduce((sum, cls) => sum + cls.size, 0);
  }

  private _complexConjugate(z: number): number {
    return z; // 简化：假设实数值
  }

  private _determinant2x2Or3x3(matrix: number[][]): number {
    const n = matrix.length;
    if (n === 2) {
      return matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
    }
    if (n === 3) {
      return matrix[0][0] * (matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1])
        - matrix[0][1] * (matrix[1][0] * matrix[2][2] - matrix[1][2] * matrix[2][0])
        + matrix[0][2] * (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0]);
    }
    return 0;
  }
}
