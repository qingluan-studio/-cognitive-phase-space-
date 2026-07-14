/**
 * 普赖萨赫模型模块：用大量简单迟滞算子的集合来精确描述复杂磁滞行为。
 * 通过算子分布密度积分得到宏观响应。
 */

export interface PreisachOperator {
  alpha: number;
  beta: number;
  state: number;
  weight: number;
}

export type PreisachDensity = {
  grid: number[][];
  resolution: number;
};

export interface PreisachConfig {
  resolution: number;
  maxAlpha: number;
  maxBeta: number;
  densityScale: number;
}

export class PreisachModel {
  private _config: PreisachConfig;
  private _operators: PreisachOperator[] = [];
  private _output: number = 0;
  private _inputHistory: number[] = [];
  private _stats: Record<string, unknown> = {};

  constructor(config: PreisachConfig) {
    this._config = config;
    this._initializeOperators();
  }

  get output(): number {
    return this._output;
  }

  get operatorCount(): number {
    return this._operators.length;
  }

  get inputHistoryLength(): number {
    return this._inputHistory.length;
  }

  private _initializeOperators(): void {
    const n = this._config.resolution;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        const alpha = (i / n) * this._config.maxAlpha;
        const beta = (j / n) * this._config.maxBeta - this._config.maxBeta;
        if (alpha >= beta) {
          this._operators.push({
            alpha,
            beta,
            state: -1,
            weight: this._density(alpha, beta),
          });
        }
      }
    }
  }

  private _density(alpha: number, beta: number): number {
    return Math.exp(-(alpha * alpha + beta * beta) / 2) * this._config.densityScale;
  }

  applyInput(input: number): number {
    this._inputHistory.push(input);
    if (this._inputHistory.length > 100) this._inputHistory.shift();
    let sum = 0;
    for (const op of this._operators) {
      if (input >= op.alpha) op.state = 1;
      else if (input <= op.beta) op.state = -1;
      sum += op.state * op.weight;
    }
    this._output = sum;
    this._stats.lastInput = input;
    return this._output;
  }

  computeDensity(): PreisachDensity {
    const n = this._config.resolution;
    const grid: number[][] = [];
    for (let i = 0; i < n; i++) {
      const row: number[] = [];
      for (let j = 0; j < n; j++) {
        row.push(this._density((i / n) * this._config.maxAlpha, (j / n) * this._config.maxBeta));
      }
      grid.push(row);
    }
    return { grid, resolution: n };
  }

  wipeout(): void {
    for (const op of this._operators) op.state = -1;
    this._output = 0;
    this._stats.wipeoutAt = Date.now();
  }

  reset(): void {
    this._operators = [];
    this._output = 0;
    this._inputHistory = [];
    this._initializeOperators();
  }

  majorLoopAmplitude(): number {
    return this._operators.reduce((acc, op) => acc + op.weight, 0);
  }

  report(): Record<string, unknown> {
    return {
      output: this._output,
      operatorCount: this._operators.length,
      history: this._inputHistory.length,
      stats: this._stats,
    };
  }
}
