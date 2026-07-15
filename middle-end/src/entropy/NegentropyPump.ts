export interface NegentropyPumpData {
  negentropy: number;
  efficiency: number;
  energyInput: number;
  orderProduced: number;
  pumpRate: number;
}

export class NegentropyPump {
  private _negentropy: number;
  private _efficiency: number;
  private _energyInput: number;
  private _orderProduced: number;
  private _pumpRate: number;
  private _orderHistory: number[];
  private _maxPumpRate: number;
  private _thermodynamicCost: number;

  constructor(efficiency: number = 0.4) {
    this._negentropy = 0;
    this._efficiency = efficiency;
    this._energyInput = 0;
    this._orderProduced = 0;
    this._pumpRate = 0;
    this._orderHistory = [];
    this._maxPumpRate = 100;
    this._thermodynamicCost = 0;
  }

  get negentropy(): number {
    return this._negentropy;
  }

  get efficiency(): number {
    return this._efficiency;
  }

  get orderProduced(): number {
    return this._orderProduced;
  }

  get pumpRate(): number {
    return this._pumpRate;
  }

  public pump(energy: number): number {
    this._energyInput += energy;
    const orderGain = energy * this._efficiency;
    this._negentropy += orderGain;
    this._orderProduced += orderGain;
    this._pumpRate = orderGain;
    this._thermodynamicCost = energy - orderGain;
    this._orderHistory.push(orderGain);
    if (this._orderHistory.length > 50) this._orderHistory.shift();
    return orderGain;
  }

  public dissipate(amount: number): number {
    const actual = Math.min(this._negentropy, amount);
    this._negentropy -= actual;
    return actual;
  }

  public setEfficiency(value: number): void {
    this._efficiency = Math.max(0, Math.min(0.95, value));
  }

  public computeOrderDensity(volume: number): number {
    if (volume <= 0) return 0;
    return this._negentropy / volume;
  }

  public report(): NegentropyPumpData {
    return {
      negentropy: this._negentropy,
      efficiency: this._efficiency,
      energyInput: this._energyInput,
      orderProduced: this._orderProduced,
      pumpRate: this._pumpRate,
    };
  }

  public reset(): void {
    this._negentropy = 0;
    this._energyInput = 0;
    this._orderProduced = 0;
    this._pumpRate = 0;
    this._orderHistory = [];
  }

  public computeAveragePumpRate(): number {
    if (this._orderHistory.length === 0) return 0;
    return this._orderHistory.reduce((a, b) => a + b, 0) / this._orderHistory.length;
  }

  public selfOptimize(targetOrder: number): number {
    if (this._energyInput <= 0) return this._efficiency;
    const required = targetOrder / Math.max(this._energyInput, 1e-10);
    this._efficiency = Math.min(0.95, Math.max(0.01, required));
    return this._efficiency;
  }

  public computeCOP(heatPumped: number, workInput: number): number {
    if (workInput <= 0) return 0;
    return heatPumped / workInput;
  }
}
