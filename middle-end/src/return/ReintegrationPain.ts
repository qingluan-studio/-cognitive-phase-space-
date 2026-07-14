/**
 * 重新整合之痛模块：回归过程中的冲突与适应。
 * 模块回归必然引发摩擦，疼痛值随冲突累积，需配合缓冲机制逐步消解。
 */

export interface ReintegrationPainData {
  pain: number;
  conflicts: number;
  resolved: number;
  adapting: boolean;
}

export class ReintegrationPain {
  private _pain: number;
  private _conflicts: number;
  private _resolved: number;
  private _painkillers: number;
  private _adaptationThreshold: number;

  constructor(threshold: number = 30) {
    this._pain = 0;
    this._conflicts = 0;
    this._resolved = 0;
    this._painkillers = 3;
    this._adaptationThreshold = threshold;
  }

  get pain(): number {
    return this._pain;
  }

  get adapting(): boolean {
    return this._pain < this._adaptationThreshold;
  }

  public clash(intensity: number): void {
    this._conflicts += 1;
    this._pain = Math.min(100, this._pain + intensity);
  }

  public soothe(amount: number): void {
    this._pain = Math.max(0, this._pain - amount);
  }

  public painkiller(): boolean {
    if (this._painkillers <= 0) return false;
    this._painkillers -= 1;
    this._pain = Math.max(0, this._pain - 25);
    return true;
  }

  public resolve(): void {
    this._resolved += 1;
    this._pain = Math.max(0, this._pain - 10);
  }

  public adapt(cycles: number): void {
    for (let i = 0; i < cycles; i += 1) {
      this._pain = Math.max(0, this._pain - 2);
    }
  }

  public refill(n: number): void {
    this._painkillers += n;
  }

  public report(): ReintegrationPainData {
    return {
      pain: this._pain,
      conflicts: this._conflicts,
      resolved: this._resolved,
      adapting: this.adapting,
    };
  }
}
