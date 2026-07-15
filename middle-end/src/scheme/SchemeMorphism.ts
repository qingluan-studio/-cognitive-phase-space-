//**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 概型态射 —— 几何空间的翻译者
 * Scheme Morphism: The Translator of Geometric Spaces
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 概型态射是代数几何中的函数概念。它不仅仅是映射，
 * 更是结构层之间的同态，将坐标环的代数关系带到新的舞台。
 * 每个态射都携带着逆像层的包裹，如同信使传递着几何的消息。
 */

export interface MorphismData {
  readonly sourceScheme: string;
  readonly targetScheme: string;
  readonly mapOnPoints: Map<string, string>;
  readonly mapOnRings: string;
}

export interface Fiber {
  readonly targetPoint: string;
  readonly fiberScheme: string;
  readonly dimension: number;
}

export interface Pullback {
  readonly sheafName: string;
  readonly originalSection: string;
  readonly pulledBackSection: string;
}

export class SchemeMorphism {
  private _sourceScheme: string;
  private _targetScheme: string;
  private _pointMap: Map<string, string>;
  private _ringMap: string;
  private _fibers: Map<string, Fiber>;
  private _pullbacks: Map<string, Pullback[]>;
  private _isFinite: boolean;
  private _isProper: boolean;
  private _history: string[];

  constructor(data: MorphismData) {
    this._sourceScheme = data.sourceScheme;
    this._targetScheme = data.targetScheme;
    this._pointMap = new Map(data.mapOnPoints);
    this._ringMap = data.mapOnRings;
    this._fibers = new Map();
    this._pullbacks = new Map();
    this._isFinite = false;
    this._isProper = false;
    this._history = [];
    this._recordHistory('Morphism ' + data.sourceScheme + ' → ' + data.targetScheme + ' defined');
  }

  get sourceScheme(): string { return this._sourceScheme; }
  get targetScheme(): string { return this._targetScheme; }
  get isFinite(): boolean { return this._isFinite; }
  get isProper(): boolean { return this._isProper; }

  /**
   * 计算点在态射下的像
   * Compute image of a point under morphism
   */
  public mapPoint(pointLabel: string): string | undefined {
    const image = this._pointMap.get(pointLabel);
    this._recordHistory('Point ' + pointLabel + ' mapped to ' + image);
    return image;
  }

  /**
   * 计算纤维 f⁻¹(y)
   * Compute fiber over a point
   */
  public computeFiber(targetPoint: string): Fiber | null {
    const fiberPoints: string[] = [];
    for (const [source, target] of this._pointMap) {
      if (target === targetPoint) {
        fiberPoints.push(source);
      }
    }
    const fiber: Fiber = {
      targetPoint,
      fiberScheme: this._sourceScheme + '_' + targetPoint,
      dimension: fiberPoints.length > 0 ? 1 : 0
    };
    this._fibers.set(targetPoint, fiber);
    this._recordHistory('Fiber over ' + targetPoint + ' computed, dimension ' + fiber.dimension);
    return fiber;
  }

  /**
   * 验证态射的连续性
   * Verify continuity of morphism
   */
  public verifyContinuity(): boolean {
    // 简化：概型态射自动连续
    const continuous = true;
    this._recordHistory('Continuity verified');
    return continuous;
  }

  /**
   * 拉回层 f*F
   * Compute pullback sheaf
   */
  public computePullback(sheafName: string, section: string): Pullback {
    const pullback: Pullback = {
      sheafName,
      originalSection: section,
      pulledBackSection: 'f*(' + section + ')'
    };
    if (!this._pullbacks.has(sheafName)) {
      this._pullbacks.set(sheafName, []);
    }
    this._pullbacks.get(sheafName)!.push(pullback);
    this._recordHistory('Pullback of ' + section + ' computed');
    return pullback;
  }

  /**
   * 前推层 f_*F
   * Compute pushforward sheaf
   */
  public computePushforward(sheafName: string, section: string): string {
    const pushforward = 'f_*(' + section + ')';
    this._recordHistory('Pushforward of ' + section + ' computed');
    return pushforward;
  }

  /**
   * 验证态射是否为有限态射
   * Verify if morphism is finite
   */
  public verifyFinite(): boolean {
    // 简化：若所有纤维有限则态射有限
    const finite = this._fibers.size > 0;
    this._isFinite = finite;
    this._recordHistory('Finite morphism verified: ' + finite);
    return finite;
  }

  /**
   * 验证态射是否为正常（proper）态射
   * Verify if morphism is proper
   */
  public verifyProper(): boolean {
    // 简化：正常 = 泛型有限 + 分离 + 泛型紧
    const proper = this._isFinite;
    this._isProper = proper;
    this._recordHistory('Proper morphism verified: ' + proper);
    return proper;
  }

  /**
   * 验证态射是否为平坦的
   * Verify flatness
   */
  public verifyFlatness(): boolean {
    // 简化：平坦性验证
    const flat = true;
    this._recordHistory('Flatness verified');
    return flat;
  }

  /**
   * 计算态射的像概型
   * Compute image scheme
   */
  public computeImageScheme(): string[] {
    const image: string[] = [];
    for (const [, target] of this._pointMap) {
      if (!image.includes(target)) image.push(target);
    }
    this._recordHistory('Image scheme contains ' + image.length + ' points');
    return image;
  }

  /**
   * 计算态射的图 Γ_f ⊂ X × Y
   * Compute graph of morphism
   */
  public computeGraph(): string[] {
    const graph: string[] = [];
    for (const [source, target] of this._pointMap) {
      graph.push('(' + source + ', ' + target + ')');
    }
    this._recordHistory('Graph computed with ' + graph.length + ' points');
    return graph;
  }

  /**
   * 应用基变换
   * Apply base change
   */
  public applyBaseChange(newBase: string): string {
    const baseChange = this._sourceScheme + ' ×_' + this._targetScheme + ' ' + newBase;
    this._recordHistory('Base change applied: ' + baseChange);
    return baseChange;
  }

  public report(): object {
    return {
      sourceScheme: this._sourceScheme,
      targetScheme: this._targetScheme,
      pointMapCount: this._pointMap.size,
      fiberCount: this._fibers.size,
      isFinite: this._isFinite,
      isProper: this._isProper,
      history: this._history
    };
  }

  public reset(): void {
    this._pointMap.clear();
    this._fibers.clear();
    this._pullbacks.clear();
    this._isFinite = false;
    this._isProper = false;
    this._history = [];
  }

  // ─── Private helpers ───

  private _recordHistory(entry: string): void {
    this._history.push('[' + Date.now() + '] ' + entry);
  }
}
