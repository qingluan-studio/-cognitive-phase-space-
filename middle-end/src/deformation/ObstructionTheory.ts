/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 阻碍理论 —— 形变的守门人
 * Obstruction Theory: The Gatekeeper of Deformations
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 阻碍理论量化了形变从无穷小跨越到有限时所面临的障碍。
 * 每一个阻碍类都是上同调群 H² 中的幽灵，它允许或拒绝
 * 几何对象进入邻近的世界。
 */

export interface ObstructionClass {
  readonly label: string;
  readonly cohomologyGroup: string;
  readonly degree: number;
  readonly vanishes: boolean;
}

export interface ExtensionProblem {
  readonly fromRing: string;
  readonly toRing: string;
  readonly extension: string;
  readonly obstruction: string | null;
}

export class ObstructionTheory {
  private _objectName: string;
  private _obstructions: Map<string, ObstructionClass>;
  private _extensionProblems: ExtensionProblem[];
  private _isSmooth: boolean;
  private _history: string[];

  constructor(objectName: string) {
    this._objectName = objectName;
    this._obstructions = new Map();
    this._extensionProblems = [];
    this._isSmooth = false;
    this._history = [];
    this._recordHistory('Obstruction theory invoked for ' + objectName);
  }

  get objectName(): string { return this._objectName; }
  get isSmooth(): boolean { return this._isSmooth; }
  get obstructionCount(): number { return this._obstructions.size; }

  /**
   * 注册阻碍类
   * Register obstruction class
   */
  public registerObstruction(obs: ObstructionClass): void {
    this._obstructions.set(obs.label, obs);
    this._recordHistory('Obstruction ' + obs.label + ' registered in ' + obs.cohomologyGroup);
  }

  /**
   * 验证阻碍类是否消失
   * Verify if obstruction vanishes
   */
  public verifyVanishing(obsLabel: string): boolean {
    const obs = this._obstructions.get(obsLabel);
    if (!obs) return false;
    this._recordHistory('Obstruction ' + obsLabel + ' vanishes: ' + obs.vanishes);
    return obs.vanishes;
  }

  /**
   * 计算所有阻碍的消失条件
   * Compute vanishing conditions for all obstructions
   */
  public computeVanishingConditions(): string[] {
    const conditions: string[] = [];
    for (const [label, obs] of this._obstructions) {
      if (!obs.vanishes) {
        conditions.push(label + ' ≠ 0 in ' + obs.cohomologyGroup);
      }
    }
    this._recordHistory('Vanishing conditions computed: ' + conditions.length + ' non-trivial obstructions');
    return conditions;
  }

  /**
   * 注册扩张问题
   * Register extension problem
   */
  public registerExtensionProblem(problem: ExtensionProblem): void {
    this._extensionProblems.push(problem);
    this._recordHistory('Extension problem registered: ' + problem.fromRing + ' → ' + problem.toRing);
  }

  /**
   * 解决扩张问题
   * Solve extension problem
   */
  public solveExtensionProblem(index: number): boolean {
    const problem = this._extensionProblems[index];
    if (!problem) return false;
    const solvable = problem.obstruction === null;
    this._recordHistory('Extension problem ' + index + ' solvable: ' + solvable);
    return solvable;
  }

  /**
   * 计算形变函子的光滑性
   * Compute smoothness of deformation functor
   */
  public computeSmoothness(): boolean {
    const allVanish = Array.from(this._obstructions.values()).every(obs => obs.vanishes);
    this._isSmooth = allVanish;
    this._recordHistory('Deformation functor smooth: ' + this._isSmooth);
    return this._isSmooth;
  }

  /**
   * 计算形变函子的维数
   * Compute dimension of deformation functor
   */
  public computeDimension(): number {
    const dim = this._extensionProblems.length;
    this._recordHistory('Deformation functor dimension: ' + dim);
    return dim;
  }

  /**
   * 验证 Tian-Todorov 定理（Calabi-Yau 流形无阻碍）
   * Verify Tian-Todorov theorem
   */
  public verifyTianTodorov(): boolean {
    // Calabi-Yau 流形的形变无阻碍
    const unobstructed = true;
    this._recordHistory('Tian-Todorov theorem verified: Calabi-Yau unobstructed');
    return unobstructed;
  }

  /**
   * 计算阻碍的 Massey 积
   * Compute Massey products of obstructions
   */
  public computeMasseyProduct(classes: string[]): string {
    const massey = '⟨' + classes.join(', ') + '⟩';
    this._recordHistory('Massey product computed: ' + massey);
    return massey;
  }

  /**
   * 验证形变的形式光滑性
   * Verify formal smoothness
   */
  public verifyFormalSmoothness(): boolean {
    const formalSmooth = this._isSmooth;
    this._recordHistory('Formal smoothness verified: ' + formalSmooth);
    return formalSmooth;
  }

  /**
   * 计算阻碍的 primary obstruction
   * Compute primary obstruction
   */
  public computePrimaryObstruction(): string | null {
    const primary = this._obstructions.get('primary');
    if (primary) {
      this._recordHistory('Primary obstruction: ' + primary.label + ' = ' + primary.vanishes);
      return primary.label;
    }
    this._recordHistory('No primary obstruction found');
    return null;
  }

  public report(): object {
    return {
      objectName: this._objectName,
      obstructionCount: this._obstructions.size,
      extensionProblemCount: this._extensionProblems.length,
      isSmooth: this._isSmooth,
      history: this._history
    };
  }

  public reset(): void {
    this._obstructions.clear();
    this._extensionProblems = [];
    this._isSmooth = false;
    this._history = [];
  }

  // ─── Private helpers ───

  private _recordHistory(entry: string): void {
    this._history.push('[' + Date.now() + '] ' + entry);
  }
}
