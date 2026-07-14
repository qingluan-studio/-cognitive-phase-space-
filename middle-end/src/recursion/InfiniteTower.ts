/**
 * 无限塔模块：无限递归的调用栈不崩溃。
 * 通过迭代展开与状态压缩，模拟无限高调用塔而不爆栈。
 */

export interface InfiniteTowerData {
  height: number;
  frames: number;
  compressed: number;
  stable: boolean;
}

export class InfiniteTower {
  private _height: number;
  private _frames: number;
  private _compressed: number;
  private _maxFrames: number;
  private _state: number[];

  constructor(maxFrames: number = 10000) {
    this._height = 0;
    this._frames = 0;
    this._compressed = 0;
    this._maxFrames = maxFrames;
    this._state = [];
  }

  get height(): number {
    return this._height;
  }

  get stable(): boolean {
    return this._frames < this._maxFrames;
  }

  public push(value: number): void {
    this._height += 1;
    this._frames += 1;
    this._state.push(value);
    if (this._frames >= this._maxFrames) {
      this._compress();
    }
  }

  public pop(): number | undefined {
    if (this._state.length === 0) return undefined;
    this._height = Math.max(0, this._height - 1);
    return this._state.pop();
  }

  private _compress(): void {
    const sum = this._state.reduce((s, v) => s + v, 0);
    this._state = [sum];
    this._frames = 1;
    this._compressed += 1;
  }

  public expand(amount: number): void {
    this._maxFrames += amount;
  }

  public peek(): number | undefined {
    return this._state[this._state.length - 1];
  }

  public reset(): void {
    this._height = 0;
    this._frames = 0;
    this._compressed = 0;
    this._state = [];
  }

  public report(): InfiniteTowerData {
    return {
      height: this._height,
      frames: this._frames,
      compressed: this._compressed,
      stable: this.stable,
    };
  }
}
