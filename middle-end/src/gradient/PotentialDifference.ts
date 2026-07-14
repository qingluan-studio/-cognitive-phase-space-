/**
 * PotentialDifference - 势差
 * 利用两点之间的势能差异驱动流动，势差越大驱动越强，
 * 是能量传递与信息流动的根本动力来源。
 */

export interface PotentialDifferenceData {
  readonly potentialId: string;
  highPotential: number;
  lowPotential: number;
  conductance: number;
}

export interface FlowResult {
  amount: number;
  duration: number;
  remainingDifference: number;
}

export class PotentialDifference {
  private _data: PotentialDifferenceData;
  private _flows: FlowResult[] = [];
  private _totalFlowed: number = 0;
  private _efficiency: number = 0.9;

  constructor(data: PotentialDifferenceData) {
    this._data = { ...data };
  }

  get potentialId(): string {
    return this._data.potentialId;
  }

  get difference(): number {
    return this._data.highPotential - this._data.lowPotential;
  }

  get conductance(): number {
    return this._data.conductance;
  }

  get totalFlowed(): number {
    return this._totalFlowed;
  }

  public flow(duration: number): FlowResult {
    if (this.difference <= 0) {
      return { amount: 0, duration, remainingDifference: this.difference };
    }
    const amount = this.difference * this._data.conductance * this._efficiency * duration;
    this._data.highPotential -= amount;
    this._data.lowPotential += amount;
    this._totalFlowed += amount;
    const result: FlowResult = {
      amount,
      duration,
      remainingDifference: this.difference,
    };
    this._flows.push(result);
    if (this._flows.length > 30) {
      this._flows.shift();
    }
    return result;
  }

  public chargeHigh(amount: number): void {
    this._data.highPotential += amount;
  }

  public drainLow(amount: number): void {
    this._data.lowPotential = Math.max(0, this._data.lowPotential - amount);
  }

  public setConductance(value: number): void {
    this._data.conductance = Math.max(0, Math.min(1, value));
  }

  public adjustEfficiency(delta: number): void {
    this._efficiency = Math.max(0, Math.min(1, this._efficiency + delta));
  }

  public isEquilibrium(): boolean {
    return Math.abs(this.difference) < 0.01;
  }

  public amplifyDifference(factor: number): number {
    const newDiff = this.difference * factor;
    const midpoint = (this._data.highPotential + this._data.lowPotential) / 2;
    this._data.highPotential = midpoint + newDiff / 2;
    this._data.lowPotential = midpoint - newDiff / 2;
    return this.difference;
  }

  public invert(): void {
    const temp = this._data.highPotential;
    this._data.highPotential = this._data.lowPotential;
    this._data.lowPotential = temp;
  }

  public potentialReport(): Record<string, unknown> {
    return {
      potentialId: this.potentialId,
      highPotential: this._data.highPotential.toFixed(3),
      lowPotential: this._data.lowPotential.toFixed(3),
      difference: this.difference.toFixed(3),
      conductance: this._data.conductance.toFixed(3),
      efficiency: this._efficiency.toFixed(3),
      totalFlowed: this._totalFlowed.toFixed(2),
      flowCount: this._flows.length,
      atEquilibrium: this.isEquilibrium(),
    };
  }
}
