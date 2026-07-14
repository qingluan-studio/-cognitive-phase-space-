/**
 * 深渊压力模块：越深压力越大，测试系统的极限承受能力。
 * 模拟流体静压力，超过阈值会触发崩溃或塑性变形。
 */

export interface AbyssalPressureData {
  depth: number;
  pressure: number;
  yieldStrength: number;
  status: 'stable' | 'deforming' | 'critical';
}

export class AbyssalPressure {
  private _depth: number;
  private _yieldStrength: number;
  private _deformation: number;
  private _log: AbyssalPressureData[];

  constructor(yieldStrength: number = 1000) {
    this._depth = 0;
    this._yieldStrength = yieldStrength;
    this._deformation = 0;
    this._log = [];
  }

  get pressure(): number {
    return this._depth * 0.1 + this._deformation * 2;
  }

  get depth(): number {
    return this._depth;
  }

  get status(): 'stable' | 'deforming' | 'critical' {
    const p = this.pressure;
    if (p >= this._yieldStrength) return 'critical';
    if (p >= this._yieldStrength * 0.7) return 'deforming';
    return 'stable';
  }

  public descend(meters: number): AbyssalPressureData {
    this._depth += meters;
    const p = this.pressure;
    if (p > this._yieldStrength * 0.7) {
      this._deformation += (p - this._yieldStrength * 0.7) * 0.01;
    }
    const record: AbyssalPressureData = {
      depth: this._depth,
      pressure: p,
      yieldStrength: this._yieldStrength,
      status: this.status,
    };
    this._log.push(record);
    return record;
  }

  public ascend(meters: number): void {
    this._depth = Math.max(0, this._depth - meters);
  }

  public reinforce(amount: number): void {
    this._yieldStrength += amount;
  }

  public report(): AbyssalPressureData {
    return {
      depth: this._depth,
      pressure: this.pressure,
      yieldStrength: this._yieldStrength,
      status: this.status,
    };
  }

  public stressTest(targetDepth: number, step: number): AbyssalPressureData[] {
    const results: AbyssalPressureData[] = [];
    while (this._depth < targetDepth) {
      results.push(this.descend(step));
      if (this.status === 'critical') break;
    }
    return results;
  }

  public history(): AbyssalPressureData[] {
    return [...this._log];
  }
}
