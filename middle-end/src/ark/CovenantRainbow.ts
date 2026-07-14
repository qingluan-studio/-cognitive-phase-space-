/**
 * 契约彩虹模块：灾难后永不灭的承诺标记。
 * 以七色光谱形式存储不变承诺，任何颜色丢失都意味契约被破坏。
 */

export interface CovenantRainbowData {
  bands: Array<{ color: string; promise: string; intact: boolean }>;
  intactCount: number;
}

export class CovenantRainbow {
  private _bands: Map<string, string>;
  private _broken: Set<string>;
  private _signature: string;

  constructor() {
    this._bands = new Map<string, string>();
    this._broken = new Set<string>();
    this._signature = '';
    const initial = [
      ['red', 'never destroy data'],
      ['orange', 'never skip validation'],
      ['yellow', 'never lie to user'],
      ['green', 'never leak secrets'],
      ['blue', 'never block forever'],
      ['indigo', 'never forget history'],
      ['violet', 'never break contract'],
    ];
    for (const [c, p] of initial) this._bands.set(c, p);
    this._signature = this._computeSignature();
  }

  get bandCount(): number {
    return this._bands.size;
  }

  get intactCount(): number {
    return this._bands.size - this._broken.size;
  }

  public promise(color: string): string | undefined {
    return this._bands.get(color);
  }

  public isIntact(color: string): boolean {
    return this._bands.has(color) && !this._broken.has(color);
  }

  public breakBand(color: string): boolean {
    if (!this._bands.has(color)) return false;
    this._broken.add(color);
    return true;
  }

  public restore(color: string): void {
    this._broken.delete(color);
  }

  public verify(): boolean {
    return this._computeSignature() === this._signature && this._broken.size === 0;
  }

  public report(): CovenantRainbowData {
    const bands: Array<{ color: string; promise: string; intact: boolean }> = [];
    for (const [color, promise] of this._bands) {
      bands.push({ color, promise, intact: !this._broken.has(color) });
    }
    return { bands, intactCount: this.intactCount };
  }

  private _computeSignature(): string {
    return Array.from(this._bands.values()).join('|');
  }
}
