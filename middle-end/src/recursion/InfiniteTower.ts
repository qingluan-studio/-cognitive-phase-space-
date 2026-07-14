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
  private _compressionRatio: number;
  private _lambdaAccumulator: Array<(x: number) => number>;
  private _fixpointLog: number[];
  private _entropyReduction: number;

  constructor(maxFrames: number = 10000) {
    this._height = 0;
    this._frames = 0;
    this._compressed = 0;
    this._maxFrames = maxFrames;
    this._state = [];
    this._compressionRatio = 1;
    this._lambdaAccumulator = [];
    this._fixpointLog = [];
    this._entropyReduction = 0;
  }

  get height(): number {
    return this._height;
  }

  get stable(): boolean {
    return this._frames < this._maxFrames;
  }

  get compressionRatio(): number {
    return this._compressionRatio;
  }

  get entropyReduction(): number {
    return this._entropyReduction;
  }

  public push(value: number): void {
    this._height += 1;
    this._frames += 1;
    this._state.push(value);
    this._lambdaAccumulator.push((x: number) => x + value);
    if (this._frames >= this._maxFrames) {
      this._compress();
    }
    this._updateEntropyReduction();
  }

  public pop(): number | undefined {
    if (this._state.length === 0) {
      return undefined;
    }
    this._height = Math.max(0, this._height - 1);
    this._lambdaAccumulator.pop();
    return this._state.pop();
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
    this._compressionRatio = 1;
    this._lambdaAccumulator = [];
    this._fixpointLog = [];
    this._entropyReduction = 0;
  }

  public report(): InfiniteTowerData {
    return {
      height: this._height,
      frames: this._frames,
      compressed: this._compressed,
      stable: this.stable,
    };
  }

  public foldRight(initial: number, fn: (acc: number, val: number) => number): number {
    let acc = initial;
    for (let i = this._state.length - 1; i >= 0; i--) {
      acc = fn(acc, this._state[i]);
    }
    return acc;
  }

  public computeFixpoint(seed: number, f: (x: number) => number, epsilon: number = 1e-6): number {
    let x = seed;
    let prev = x + 2 * epsilon;
    let iterations = 0;
    const maxIter = 1000;
    while (Math.abs(x - prev) > epsilon && iterations < maxIter) {
      prev = x;
      x = f(x);
      iterations += 1;
    }
    this._fixpointLog.push(iterations);
    if (this._fixpointLog.length > 100) {
      this._fixpointLog.shift();
    }
    return x;
  }

  public curryPush(fn: (x: number) => number): void {
    this._lambdaAccumulator.push(fn);
    this._height += 1;
    this._frames += 1;
    if (this._frames >= this._maxFrames) {
      this._compressLambda();
    }
    this._updateEntropyReduction();
  }

  public applyCurried(input: number): number {
    let result = input;
    for (const fn of this._lambdaAccumulator) {
      result = fn(result);
    }
    return result;
  }

  public computeKleeneChain(predicate: (n: number) => boolean, maxDepth: number = 100): number[] {
    const chain: number[] = [];
    let n = 0;
    while (n < maxDepth) {
      chain.push(n);
      if (!predicate(n)) {
        break;
      }
      n += 1;
    }
    return chain;
  }

  private _compress(): void {
    const sum = this._state.reduce((s, v) => s + v, 0);
    this._state = [sum];
    this._frames = 1;
    this._compressed += 1;
    this._compressionRatio = this._height > 0 ? this._frames / this._height : 1;
  }

  private _compressLambda(): void {
    const composed = (x: number) => {
      let r = x;
      for (const fn of this._lambdaAccumulator) {
        r = fn(r);
      }
      return r;
    };
    this._lambdaAccumulator = [composed];
    this._frames = 1;
    this._compressed += 1;
  }

  private _updateEntropyReduction(): void {
    if (this._state.length < 2) {
      this._entropyReduction = 0;
      return;
    }
    const mean = this._state.reduce((s, v) => s + v, 0) / this._state.length;
    const variance = this._state.reduce((s, v) => s + (v - mean) ** 2, 0) / this._state.length;
    const entropy = variance > 0 ? 0.5 * Math.log2(2 * Math.PI * Math.E * variance) : 0;
    this._entropyReduction = Math.max(0, this._entropyReduction + (1 - entropy / (this._height + 1)));
  }
}
