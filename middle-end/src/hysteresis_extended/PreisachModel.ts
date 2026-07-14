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
  private _everettValues: Map<string, number> = new Map();

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
    const sigma = this._config.maxAlpha / 2;
    return Math.exp(-((alpha - beta) ** 2) / (2 * sigma * sigma)) * this._config.densityScale;
  }

  public applyInput(input: number): number {
    this._inputHistory.push(input);
    if (this._inputHistory.length > 100) this._inputHistory.shift();
    let sum = 0;
    for (const op of this._operators) {
      if (input >= op.alpha) op.state = 1;
      else if (input <= op.beta) op.state = -1;
      sum += op.state * op.weight;
    }
    const prevOutput = this._output;
    this._output = sum;
    const key = `${input.toFixed(2)}`;
    this._everettValues.set(key, this._output - prevOutput);
    this._stats.lastInput = input;
    this._stats.derivative = this._output - prevOutput;
    return this._output;
  }

  public computeDensity(): PreisachDensity {
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

  public everettFunction(alpha: number, beta: number): number {
    let integral = 0;
    for (const op of this._operators) {
      if (op.alpha <= alpha && op.beta >= beta) {
        integral += op.weight;
      }
    }
    return integral * 2;
  }

  public computeHysteresisLoss(): number {
    if (this._inputHistory.length < 2) return 0;
    let loss = 0;
    for (let i = 1; i < this._inputHistory.length; i++) {
      const dH = this._inputHistory[i] - this._inputHistory[i - 1];
      loss += Math.abs(this._output * dH);
    }
    return loss;
  }

  public wipeout(): void {
    for (const op of this._operators) op.state = -1;
    this._output = 0;
    this._everettValues.clear();
    this._stats.wipeoutAt = Date.now();
  }

  public reset(): void {
    this._operators = [];
    this._output = 0;
    this._inputHistory = [];
    this._everettValues.clear();
    this._initializeOperators();
  }

  public majorLoopAmplitude(): number {
    return this._operators.reduce((acc, op) => acc + op.weight, 0);
  }

  public saturationOutput(): number {
    return this._operators.reduce((acc, op) => acc + op.weight, 0);
  }

  public reversibleComponent(input: number): number {
    let revSum = 0;
    for (const op of this._operators) {
      if (op.alpha - op.beta < 0.1) {
        revSum += op.weight * Math.tanh(input);
      }
    }
    return revSum;
  }

  public report(): Record<string, unknown> {
    return {
      output: this._output,
      operatorCount: this._operators.length,
      history: this._inputHistory.length,
      hysteresisLoss: this.computeHysteresisLoss(),
      majorLoopAmplitude: this.majorLoopAmplitude(),
      stats: this._stats,
    };
  }
}
