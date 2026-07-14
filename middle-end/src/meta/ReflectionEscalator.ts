export interface ReflectionLevel {
  depth: number;
  content: string;
  reflexive: boolean;
}

export interface EscalationSnapshot {
  currentDepth: number;
  topContent: string;
  stackSize: number;
}

export class ReflectionEscalator {
  private _stack: ReflectionLevel[];
  private _maxDepth: number;
  private _reflexivityIndex: number;
  private _depthEntropy: number[];
  private _bifurcationPoints: number[];

  constructor(maxDepth: number = 10) {
    this._stack = [];
    this._maxDepth = maxDepth;
    this._reflexivityIndex = 0;
    this._depthEntropy = [];
    this._bifurcationPoints = [];
  }

  get currentDepth(): number {
    return this._stack.length;
  }

  get maxDepth(): number {
    return this._maxDepth;
  }

  get reflexivityIndex(): number {
    return this._reflexivityIndex;
  }

  public push(content: string): ReflectionLevel | null {
    if (this._stack.length >= this._maxDepth) return null;
    const reflexive = content.includes('反思') || content.includes('reflect');
    const level: ReflectionLevel = {
      depth: this._stack.length + 1,
      content,
      reflexive,
    };
    this._stack.push(level);
    this._reflexivityIndex = this._computeReflexivity();
    this._depthEntropy.push(this._computeLevelEntropy(level));
    if (this._depthEntropy.length > 50) this._depthEntropy.shift();
    if (this._stack.length > 1 && reflexive) {
      this._bifurcationPoints.push(this._stack.length);
    }
    return level;
  }

  public pop(): ReflectionLevel | null {
    const level = this._stack.pop();
    if (level) {
      this._reflexivityIndex = this._computeReflexivity();
    }
    return level ?? null;
  }

  public reflect(): EscalationSnapshot {
    return {
      currentDepth: this.currentDepth,
      topContent: this._stack[this._stack.length - 1]?.content ?? '',
      stackSize: this._stack.length,
    };
  }

  public collapse(): ReflectionLevel[] {
    const all = [...this._stack];
    this._stack = [];
    this._reflexivityIndex = 0;
    this._depthEntropy = [];
    this._bifurcationPoints = [];
    return all;
  }

  public getLevel(depth: number): ReflectionLevel | null {
    return this._stack[depth - 1] ?? null;
  }

  public getStack(): ReflectionLevel[] {
    return [...this._stack];
  }

  public computeDepthEntropy(): number {
    if (this._depthEntropy.length === 0) return 0;
    const mean = this._depthEntropy.reduce((a, b) => a + b, 0) / this._depthEntropy.length;
    const variance = this._depthEntropy.reduce((s, v) => s + (v - mean) ** 2, 0) / this._depthEntropy.length;
    return 0.5 * Math.log2(2 * Math.PI * Math.E * Math.max(variance, 1e-10));
  }

  public computeBifurcationDimension(): number {
    if (this._bifurcationPoints.length < 2) return 0;
    const diffs: number[] = [];
    for (let i = 1; i < this._bifurcationPoints.length; i++) {
      diffs.push(this._bifurcationPoints[i] - this._bifurcationPoints[i - 1]);
    }
    const meanDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    return meanDiff > 0 ? Math.log(2) / Math.log(meanDiff) : 0;
  }

  public simulateFeigenbaum(iterations: number): number[] {
    const trajectory: number[] = [];
    let r = 1.0;
    let x = 0.5;
    for (let i = 0; i < iterations; i++) {
      r += 0.01;
      x = r * x * (1 - x);
      trajectory.push(x);
      if (Math.abs(x - 0.5) < 0.001) {
        this._bifurcationPoints.push(r);
      }
    }
    return trajectory;
  }

  private _computeReflexivity(): number {
    if (this._stack.length === 0) return 0;
    const reflexiveCount = this._stack.filter(l => l.reflexive).length;
    return reflexiveCount / this._stack.length;
  }

  private _computeLevelEntropy(level: ReflectionLevel): number {
    const freq = new Map<string, number>();
    for (const ch of level.content) {
      freq.set(ch, (freq.get(ch) ?? 0) + 1);
    }
    let entropy = 0;
    for (const count of freq.values()) {
      const p = count / level.content.length;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }
}
