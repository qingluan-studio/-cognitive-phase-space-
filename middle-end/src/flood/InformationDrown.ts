/**
 * 信息溺亡模块：在过量数据中窒息。
 * 模拟系统在数据过载下的认知衰减，超过临界点后失去分辨能力。
 */

export interface InformationDrownData {
  intake: number;
  lungCapacity: number;
  breathLeft: number;
  drowning: boolean;
}

export class InformationDrown {
  private _intake: number;
  private _lungCapacity: number;
  private _breathLeft: number;
  private _drowning: boolean;

  constructor(lungCapacity: number = 500) {
    this._intake = 0;
    this._lungCapacity = lungCapacity;
    this._breathLeft = lungCapacity;
    this._drowning = false;
  }

  get intake(): number {
    return this._intake;
  }

  get drowning(): boolean {
    return this._drowning;
  }

  get breathLeft(): number {
    return this._breathLeft;
  }

  public swallow(volume: number): void {
    this._intake += volume;
    this._breathLeft -= volume;
    if (this._breathLeft <= 0) {
      this._drowning = true;
      this._breathLeft = 0;
    }
  }

  public exhale(): void {
    this._breathLeft = Math.min(this._lungCapacity, this._breathLeft + this._lungCapacity * 0.2);
    if (this._breathLeft > this._lungCapacity * 0.3) this._drowning = false;
  }

  public surface(): void {
    this._breathLeft = this._lungCapacity;
    this._drowning = false;
  }

  public cough(): number {
    const expelled = Math.floor(this._intake * 0.3);
    this._intake -= expelled;
    return expelled;
  }

  public vitals(): InformationDrownData {
    return {
      intake: this._intake,
      lungCapacity: this._lungCapacity,
      breathLeft: this._breathLeft,
      drowning: this._drowning,
    };
  }

  public filter(predicate: (chunk: unknown) => boolean, data: unknown[]): unknown[] {
    if (this._drowning) return [];
    return data.filter(predicate);
  }
}
