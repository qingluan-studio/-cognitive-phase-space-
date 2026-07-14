/**
 * SemiPermeableWall - 半透膜墙
 * 选择性放行部分信息，依据预定义的过滤规则决定哪些内容
 * 可以穿过边界，维持两侧的物质/信息差异。
 */

export interface SemiPermeableWallData {
  readonly wallId: string;
  poreSize: number;
  selectivityRules: Record<string, boolean>;
  pressureDifferential: number;
}

export interface PassageRequest {
  readonly requestId: string;
  content: string;
  payloadSize: number;
  category: string;
}

export class SemiPermeableWall {
  private _data: SemiPermeableWallData;
  private _passedThrough: string[] = [];
  private _blockedCount: number = 0;
  private _fluxRate: number = 0;
  private _equilibriumGap: number;

  constructor(data: SemiPermeableWallData) {
    this._data = { ...data, selectivityRules: { ...data.selectivityRules } };
    this._equilibriumGap = data.pressureDifferential;
  }

  get wallId(): string {
    return this._data.wallId;
  }

  get poreSize(): number {
    return this._data.poreSize;
  }

  get fluxRate(): number {
    return this._fluxRate;
  }

  public evaluatePassage(request: PassageRequest): boolean {
    const sizeOk = request.payloadSize <= this._data.poreSize;
    const ruleAllowed = this._data.selectivityRules[request.category] ?? false;
    const pressurePush = this._equilibriumGap > 0;
    const passes = sizeOk && ruleAllowed && pressurePush;
    if (passes) {
      this._passedThrough.push(request.content);
      this._fluxRate += request.payloadSize * 0.1;
      this._equilibriumGap = Math.max(0, this._equilibriumGap - request.payloadSize * 0.01);
      if (this._passedThrough.length > 50) {
        this._passedThrough.shift();
      }
    } else {
      this._blockedCount++;
    }
    return passes;
  }

  public addSelectivityRule(category: string, allowed: boolean): void {
    this._data.selectivityRules[category] = allowed;
  }

  public adjustPoreSize(delta: number): void {
    this._data.poreSize = Math.max(0, this._data.poreSize + delta);
  }

  public applyPressure(increment: number): void {
    this._equilibriumGap += increment;
    this._data.pressureDifferential = this._equilibriumGap;
  }

  public reachEquilibrium(): boolean {
    const target = this._equilibriumGap * 0.95;
    this._equilibriumGap *= 0.95;
    return this._equilibriumGap < 0.1;
  }

  public flushBlocked(): number {
    const count = this._blockedCount;
    this._blockedCount = 0;
    return count;
  }

  public computeConductivity(): number {
    if (this._passedThrough.length === 0) {
      return 0;
    }
    const totalPassed = this._passedThrough.length;
    const totalAttempted = totalPassed + this._blockedCount;
    return totalAttempted === 0 ? 0 : totalPassed / totalAttempted;
  }

  public wallReport(): Record<string, unknown> {
    return {
      wallId: this.wallId,
      poreSize: this._data.poreSize.toFixed(2),
      pressureDifferential: this._data.pressureDifferential.toFixed(2),
      equilibriumGap: this._equilibriumGap.toFixed(3),
      passedCount: this._passedThrough.length,
      blockedCount: this._blockedCount,
      fluxRate: this._fluxRate.toFixed(2),
      conductivity: this.computeConductivity().toFixed(3),
      ruleCount: Object.keys(this._data.selectivityRules).length,
    };
  }
}
