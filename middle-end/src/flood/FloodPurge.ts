/**
 * 洪水清洗模块：用洪流清洗冗余和腐朽。
 * 把过时、重复、低价值的数据冲刷掉，只留下坚固的核心。
 */

export interface FloodPurgeData {
  totalWashed: number;
  survivors: number;
  sediment: string[];
}

export class FloodPurge {
  private _totalWashed: number;
  private _survivors: unknown[];
  private _sediment: string[];
  private _waveStrength: number;

  constructor(waveStrength: number = 50) {
    this._totalWashed = 0;
    this._survivors = [];
    this._sediment = [];
    this._waveStrength = waveStrength;
  }

  get waveStrength(): number {
    return this._waveStrength;
  }

  get survivorCount(): number {
    return this._survivors.length;
  }

  public unleash(data: Array<{ item: unknown; durability: number }>): void {
    this._survivors = [];
    this._sediment = [];
    for (const entry of data) {
      if (entry.durability >= this._waveStrength) {
        this._survivors.push(entry.item);
      } else {
        this._totalWashed += 1;
        this._sediment.push(`washed:${typeof entry.item}`);
      }
    }
  }

  public intensify(amount: number): void {
    this._waveStrength += amount;
  }

  public calm(amount: number): void {
    this._waveStrength = Math.max(0, this._waveStrength - amount);
  }

  public retreat(): void {
    this._waveStrength = Math.floor(this._waveStrength * 0.5);
  }

  public collectSurvivors(): unknown[] {
    return [...this._survivors];
  }

  public report(): FloodPurgeData {
    return {
      totalWashed: this._totalWashed,
      survivors: this._survivors.length,
      sediment: [...this._sediment],
    };
  }
}
