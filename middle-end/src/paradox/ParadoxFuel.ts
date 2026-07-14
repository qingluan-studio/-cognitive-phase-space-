export interface ParadoxFuelData {
  fuelLevel: number;
  efficiency: number;
  paradoxesConsumed: number;
  output: number;
}

export class ParadoxFuel {
  private _fuelLevel: number;
  private _efficiency: number;
  private _paradoxesConsumed: number;
  private _output: number;
  private _fuelHistory: number[];
  private _thermodynamicLimit: number;

  constructor(efficiency: number = 0.3) {
    this._fuelLevel = 0;
    this._efficiency = efficiency;
    this._paradoxesConsumed = 0;
    this._output = 0;
    this._fuelHistory = [];
    this._thermodynamicLimit = 1.0;
  }

  get fuelLevel(): number {
    return this._fuelLevel;
  }

  get efficiency(): number {
    return this._efficiency;
  }

  get output(): number {
    return this._output;
  }

  public feed(paradoxStrength: number): void {
    this._fuelLevel += paradoxStrength;
    this._paradoxesConsumed++;
    this._fuelHistory.push(paradoxStrength);
    if (this._fuelHistory.length > 50) this._fuelHistory.shift();
  }

  public burn(): number {
    const generated = this._fuelLevel * this._efficiency;
    this._output += generated;
    this._fuelLevel = 0;
    return generated;
  }

  public convert(work: number): number {
    const required = work / Math.max(this._efficiency, 1e-10);
    if (this._fuelLevel >= required) {
      this._fuelLevel -= required;
      this._output += work;
      return work;
    }
    const partial = this._fuelLevel * this._efficiency;
    this._output += partial;
    this._fuelLevel = 0;
    return partial;
  }

  public report(): ParadoxFuelData {
    return {
      fuelLevel: this._fuelLevel,
      efficiency: this._efficiency,
      paradoxesConsumed: this._paradoxesConsumed,
      output: this._output,
    };
  }

  public setEfficiency(value: number): void {
    this._efficiency = Math.max(0, Math.min(this._thermodynamicLimit, value));
  }

  public computeFuelEntropy(): number {
    if (this._fuelHistory.length === 0) return 0;
    const mean = this._fuelHistory.reduce((a, b) => a + b, 0) / this._fuelHistory.length;
    const variance = this._fuelHistory.reduce((s, v) => s + (v - mean) ** 2, 0) / this._fuelHistory.length;
    return 0.5 * Math.log2(2 * Math.PI * Math.E * Math.max(variance, 1e-10));
  }

  public computeCarnotEfficiency(heatSinkTemp: number, heatSourceTemp: number): number {
    if (heatSourceTemp <= heatSinkTemp) return 0;
    return 1 - heatSinkTemp / heatSourceTemp;
  }

  public optimizeEfficiency(targetOutput: number): number {
    const requiredFuel = targetOutput / Math.max(this._efficiency, 1e-10);
    if (this._fuelLevel >= requiredFuel) return this._efficiency;
    const optimal = this._fuelLevel > 0 ? targetOutput / this._fuelLevel : this._efficiency;
    this._efficiency = Math.min(this._thermodynamicLimit, optimal);
    return this._efficiency;
  }

  public computeExergy(): number {
    return this._fuelLevel * (1 - 298 / 500);
  }
}
