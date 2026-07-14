/**
 * 阿里阿德涅之线模块：唯一能找到出口的线索。
 * 在进入迷宫时放线，回溯时沿原路返回，防止迷失方向。
 */

export interface AriadneThreadData {
  length: number;
  unspooled: number;
  anchors: string[];
  exitFound: boolean;
}

export class AriadneThread {
  private _length: number;
  private _unspooled: number;
  private _anchors: string[];
  private _exitFound: boolean;

  constructor(length: number = 1000) {
    this._length = length;
    this._unspooled = 0;
    this._anchors = [];
    this._exitFound = false;
  }

  get remaining(): number {
    return this._length - this._unspooled;
  }

  get anchors(): string[] {
    return [...this._anchors];
  }

  public advance(meters: number, landmark?: string): boolean {
    if (this._unspooled + meters > this._length) {
      return false;
    }
    this._unspooled += meters;
    if (landmark) this._anchors.push(landmark);
    return true;
  }

  public retreat(meters: number): string | null {
    this._unspooled = Math.max(0, this._unspooled - meters);
    if (this._anchors.length > 0 && meters >= 10) {
      return this._anchors.pop() ?? null;
    }
    return null;
  }

  public markExit(): void {
    this._exitFound = true;
  }

  public followBack(): string[] {
    return [...this._anchors].reverse();
  }

  public report(): AriadneThreadData {
    return {
      length: this._length,
      unspooled: this._unspooled,
      anchors: [...this._anchors],
      exitFound: this._exitFound,
    };
  }

  public splice(extra: number): void {
    this._length += extra;
  }
}
