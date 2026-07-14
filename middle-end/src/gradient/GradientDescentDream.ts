export interface DreamIteration {
  step: number;
  position: number[];
  loss: number;
  gradientNorm: number;
}

export type ConvergenceReport = {
  converged: boolean;
  finalLoss: number;
  iterations: number;
};

export interface DreamConfig {
  learningRate: number;
  momentum: number;
  decay: number;
  tolerance: number;
}

export class GradientDescentDream {
  private _config: DreamConfig;
  private _iterations: DreamIteration[] = [];
  private _position: number[] = [];
  private _velocity: number[] = [];
  private _report: ConvergenceReport | null = null;
  private _state: Record<string, unknown> = {};
  private _hessianDiagonal: number[] = [];
  private _conditionNumber: number = 1;
  private _lossLandscape: number[] = [];

  constructor(config: DreamConfig) {
    this._config = config;
  }

  get iterationCount(): number {
    return this._iterations.length;
  }

  get currentPosition(): readonly number[] {
    return this._position;
  }

  get conditionNumber(): number {
    return this._conditionNumber;
  }

  private _computeHessianDiagonal(gradientFn: (pos: number[]) => number[]): void {
    const eps = 1e-5;
    const grad = gradientFn(this._position);
    this._hessianDiagonal = [];
    for (let i = 0; i < this._position.length; i++) {
      const perturbed = [...this._position];
      perturbed[i] += eps;
      const gradPerturbed = gradientFn(perturbed);
      this._hessianDiagonal.push((gradPerturbed[i] - grad[i]) / eps);
    }
    const eigenvalues = this._hessianDiagonal.filter((v) => !isNaN(v) && v !== 0);
    const maxEig = eigenvalues.length > 0 ? Math.max(...eigenvalues.map(Math.abs)) : 1;
    const minEig = eigenvalues.length > 0 ? Math.min(...eigenvalues.map(Math.abs)) : 1;
    this._conditionNumber = maxEig / (minEig + 1e-8);
  }

  initialize(dimensions: number): void {
    this._position = [];
    this._velocity = [];
    for (let i = 0; i < dimensions; i++) {
      this._position.push(Math.random() * 2 - 1);
      this._velocity.push(0);
    }
    this._state.initialized = dimensions;
  }

  step(lossFn: (pos: number[]) => number, gradientFn: (pos: number[]) => number[]): DreamIteration {
    const loss = lossFn(this._position);
    const gradient = gradientFn(this._position);
    const gradientNorm = Math.sqrt(gradient.reduce((acc, g) => acc + g * g, 0));
    for (let i = 0; i < this._position.length; i++) {
      this._velocity[i] = this._config.momentum * this._velocity[i] - this._config.learningRate * gradient[i];
      this._position[i] += this._velocity[i];
    }
    this._computeHessianDiagonal(gradientFn);
    this._lossLandscape.push(loss);
    if (this._lossLandscape.length > 50) this._lossLandscape.shift();
    const iter: DreamIteration = {
      step: this._iterations.length,
      position: [...this._position],
      loss,
      gradientNorm,
    };
    this._iterations.push(iter);
    if (this._iterations.length > 100) this._iterations.shift();
    return iter;
  }

  optimize(lossFn: (pos: number[]) => number, gradientFn: (pos: number[]) => number[], maxSteps: number): ConvergenceReport {
    for (let i = 0; i < maxSteps; i++) {
      const iter = this.step(lossFn, gradientFn);
      if (iter.gradientNorm < this._config.tolerance) {
        this._report = { converged: true, finalLoss: iter.loss, iterations: i + 1 };
        return this._report;
      }
    }
    const last = this._iterations[this._iterations.length - 1];
    this._report = { converged: false, finalLoss: last ? last.loss : Infinity, iterations: maxSteps };
    return this._report;
  }

  currentLoss(): number {
    return this._iterations.length > 0 ? this._iterations[this._iterations.length - 1].loss : Infinity;
  }

  isConverged(): boolean {
    return this._report ? this._report.converged : false;
  }

  averageGradientNorm(): number {
    if (this._iterations.length === 0) return 0;
    return this._iterations.reduce((acc, i) => acc + i.gradientNorm, 0) / this._iterations.length;
  }

  computeLossCurvature(): number {
    if (this._lossLandscape.length < 3) return 0;
    const secondDerivatives: number[] = [];
    for (let i = 1; i < this._lossLandscape.length - 1; i++) {
      secondDerivatives.push(this._lossLandscape[i + 1] - 2 * this._lossLandscape[i] + this._lossLandscape[i - 1]);
    }
    return secondDerivatives.reduce((a, b) => a + b, 0) / secondDerivatives.length;
  }

  reset(): void {
    this._iterations = [];
    this._position = [];
    this._velocity = [];
    this._report = null;
    this._hessianDiagonal = [];
    this._conditionNumber = 1;
    this._lossLandscape = [];
    this._state = {};
  }

  report(): Record<string, unknown> {
    return {
      iterations: this._iterations.length,
      converged: this.isConverged(),
      currentLoss: this.currentLoss(),
      state: this._state,
      conditionNumber: this._conditionNumber.toFixed(4),
      lossCurvature: this.computeLossCurvature().toFixed(4),
    };
  }
}
