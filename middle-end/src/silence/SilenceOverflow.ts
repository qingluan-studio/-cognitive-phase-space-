/**
 * 沉默溢出模块：过度的沉默反而震耳欲聋。
 * 沉默累积超过承载极限后会反向爆发，把积压的压力一次性释放。
 */

export interface SilenceOverflowData {
  accumulated: number;
  capacity: number;
  overflowCount: number;
  deafening: boolean;
}

export class SilenceOverflow {
  private _accumulated: number;
  private _capacity: number;
  private _overflowCount: number;
  private _deafening: boolean;

  constructor(capacity: number = 100) {
    this._accumulated = 0;
    this._capacity = capacity;
    this._overflowCount = 0;
    this._deafening = false;
  }

  get accumulated(): number {
    return this._accumulated;
  }

  get deafening(): boolean {
    return this._deafening;
  }

  public accumulate(amount: number): void {
    this._accumulated += amount;
    if (this._accumulated >= this._capacity) {
      this._erupt();
    }
  }

  public absorb(amount: number): void {
    this._accumulated = Math.max(0, this._accumulated - amount);
    if (this._accumulated < this._capacity * 0.5) this._deafening = false;
  }

  private _erupt(): void {
    this._overflowCount += 1;
    this._deafening = true;
    this._accumulated = Math.floor(this._capacity * 0.3);
  }

  public expand(extra: number): void {
    this._capacity += extra;
  }

  public measure(): number {
    return this._deafening ? this._accumulated * 10 : this._accumulated;
  }

  public reset(): void {
    this._accumulated = 0;
    this._deafening = false;
  }

  public report(): SilenceOverflowData {
    return {
      accumulated: this._accumulated,
      capacity: this._capacity,
      overflowCount: this._overflowCount,
      deafening: this._deafening,
    };
  }
}
