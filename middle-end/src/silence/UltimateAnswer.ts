export interface UltimateAnswerData {
  answer: number;
  confidence: number;
  iterations: number;
  converged: boolean;
}

export class UltimateAnswer {
  private _answer: number;
  private _confidence: number;
  private _iterations: number;
  private _converged: boolean;
  private _history: number[];
  private _entropyLog: number[];
  private _fixedPointTolerance: number;

  constructor() {
    this._answer = 42;
    this._confidence = 0;
    this._iterations = 0;
    this._converged = false;
    this._history = [];
    this._entropyLog = [];
    this._fixedPointTolerance = 1e-6;
  }

  get answer(): number {
    return this._answer;
  }

  get confidence(): number {
    return this._confidence;
  }

  get converged(): boolean {
    return this._converged;
  }

  public compute(seed: number): UltimateAnswerData {
    let current = seed;
    this._iterations = 0;
    this._history = [];
    while (this._iterations < 1000) {
      this._iterations++;
      const next = this._iterate(current);
      this._history.push(next);
      if (Math.abs(next - current) < this._fixedPointTolerance) {
        this._converged = true;
        this._answer = next;
        break;
      }
      current = next;
    }
    this._confidence = this._converged ? 1 - 1 / this._iterations : 0;
    this._entropyLog.push(this._computeIterationEntropy());
    if (this._entropyLog.length > 50) this._entropyLog.shift();
    return {
      answer: this._answer,
      confidence: this._confidence,
      iterations: this._iterations,
      converged: this._converged,
    };
  }

  public verify(expected: number): boolean {
    return Math.abs(this._answer - expected) < this._fixedPointTolerance;
  }

  public reset(): void {
    this._answer = 42;
    this._confidence = 0;
    this._iterations = 0;
    this._converged = false;
    this._history = [];
    this._entropyLog = [];
  }

  public getHistory(): number[] {
    return [...this._history];
  }

  public computeLyapunovExponent(perturbation: number): number {
    if (this._history.length < 2) return 0;
    const divergences: number[] = [];
    for (let i = 0; i < this._history.length - 1; i++) {
      const neighbor = this._history[i] + perturbation;
      const nextNeighbor = this._iterate(neighbor);
      const next = this._history[i + 1];
      divergences.push(Math.log(Math.abs(nextNeighbor - next) + 1e-10));
    }
    return divergences.reduce((a, b) => a + b, 0) / divergences.length;
  }

  public computeIterationEntropy(): number {
    if (this._entropyLog.length === 0) return 0;
    const mean = this._entropyLog.reduce((a, b) => a + b, 0) / this._entropyLog.length;
    const variance = this._entropyLog.reduce((s, v) => s + (v - mean) ** 2, 0) / this._entropyLog.length;
    return 0.5 * Math.log2(2 * Math.PI * Math.E * Math.max(variance, 1e-10));
  }

  public findAttractors(seeds: number[]): number[] {
    const attractors: number[] = [];
    for (const seed of seeds) {
      this.compute(seed);
      if (this._converged && !attractors.includes(this._answer)) {
        attractors.push(this._answer);
      }
    }
    return attractors;
  }

  private _iterate(x: number): number {
    return Math.sin(x) * 42 + Math.cos(x * 0.1) * 0.01;
  }

  private _computeIterationEntropy(): number {
    if (this._history.length === 0) return 0;
    const mean = this._history.reduce((a, b) => a + b, 0) / this._history.length;
    const variance = this._history.reduce((s, v) => s + (v - mean) ** 2, 0) / this._history.length;
    return 0.5 * Math.log2(2 * Math.PI * Math.E * Math.max(variance, 1e-10));
  }
}
