/**
 * GradientDescentDream - 梯度下降之梦
 * 沿损失函数的负梯度方向迭代寻找最优解，模拟机器学习中
 * 梯度下降算法的寻优过程，包含学习率与动量调节。
 */

export interface GradientDescentDreamData {
  readonly dreamId: string;
  initialPosition: number[];
  learningRate: number;
  momentum: number;
  maxIterations: number;
}

export interface DescentStep {
  iteration: number;
  position: number[];
  loss: number;
  gradient: number[];
}

export class GradientDescentDream {
  private _data: GradientDescentDreamData;
  private _position: number[];
  private _velocity: number[];
  private _steps: DescentStep[] = [];
  private _lossFunction: (pos: number[]) => number;
  private _gradientFunction: (pos: number[]) => number[];
  private _converged: boolean = false;

  constructor(
    data: GradientDescentDreamData,
    lossFn: (pos: number[]) => number,
    gradFn: (pos: number[]) => number[]
  ) {
    this._data = { ...data, initialPosition: [...data.initialPosition] };
    this._position = [...data.initialPosition];
    this._velocity = new Array(data.initialPosition.length).fill(0);
    this._lossFunction = lossFn;
    this._gradientFunction = gradFn;
  }

  get dreamId(): string {
    return this._data.dreamId;
  }

  get currentPosition(): readonly number[] {
    return this._position;
  }

  get converged(): boolean {
    return this._converged;
  }

  get stepCount(): number {
    return this._steps.length;
  }

  public step(): DescentStep {
    const iteration = this._steps.length;
    if (iteration >= this._data.maxIterations || this._converged) {
      return this._steps[this._steps.length - 1];
    }
    const loss = this._lossFunction(this._position);
    const gradient = this._gradientFunction(this._position);
    for (let i = 0; i < this._position.length; i++) {
      this._velocity[i] = this._data.momentum * this._velocity[i]
        - this._data.learningRate * gradient[i];
      this._position[i] += this._velocity[i];
    }
    const step: DescentStep = {
      iteration,
      position: [...this._position],
      loss,
      gradient: [...gradient],
    };
    this._steps.push(step);
    this._checkConvergence(gradient, loss);
    return step;
  }

  private _checkConvergence(gradient: number[], loss: number): void {
    const gradNorm = Math.sqrt(gradient.reduce((s, g) => s + g * g, 0));
    if (gradNorm < 0.0001 || (this._steps.length > 5 && Math.abs(loss) < 0.001)) {
      this._converged = true;
    }
  }

  public run(maxSteps: number): DescentStep[] {
    const limit = Math.min(maxSteps, this._data.maxIterations);
    for (let i = 0; i < limit; i++) {
      if (this._converged) {
        break;
      }
      this.step();
    }
    return [...this._steps];
  }

  public setLearningRate(rate: number): void {
    this._data.learningRate = Math.max(0, rate);
  }

  public setMomentum(momentum: number): void {
    this._data.momentum = Math.max(0, Math.min(1, momentum));
  }

  public reset(): void {
    this._position = [...this._data.initialPosition];
    this._velocity = new Array(this._position.length).fill(0);
    this._steps = [];
    this._converged = false;
  }

  public bestPosition(): number[] {
    if (this._steps.length === 0) {
      return [...this._position];
    }
    let best = this._steps[0];
    for (const s of this._steps) {
      if (s.loss < best.loss) {
        best = s;
      }
    }
    return best.position;
  }

  public dreamReport(): Record<string, unknown> {
    const lastLoss = this._steps.length > 0 ? this._steps[this._steps.length - 1].loss : null;
    return {
      dreamId: this.dreamId,
      dimensions: this._position.length,
      learningRate: this._data.learningRate.toFixed(4),
      momentum: this._data.momentum.toFixed(3),
      stepCount: this.stepCount,
      maxIterations: this._data.maxIterations,
      converged: this._converged,
      currentPosition: this._position.map((p) => p.toFixed(4)),
      lastLoss: lastLoss !== null ? lastLoss.toFixed(6) : null,
    };
  }
}
