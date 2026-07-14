/**
 * 醉汉行走优化器：无目的随机游走中偶然找到最优解。
 * 通过无偏随机游走探索解空间，依靠偶然性发现局部极小值之外的更优解。
 */

export interface WalkStep {
  stepIndex: number;
  position: number;
  value: number;
  accepted: boolean;
}

export interface WalkResult {
  bestPosition: number;
  bestValue: number;
  totalSteps: number;
  acceptedSteps: number;
  history: WalkStep[];
}

export class DrunkardsWalkOptimizer {
  private _objective: (x: number) => number;
  private _stepSize: number;
  private _maxSteps: number;
  private _bestPosition: number;
  private _bestValue: number;
  private _history: WalkStep[] = [];

  constructor(
    objective: (x: number) => number,
    initialPosition: number = 0,
    stepSize: number = 1.0,
    maxSteps: number = 1000
  ) {
    this._objective = objective;
    this._stepSize = stepSize;
    this._maxSteps = maxSteps;
    this._bestPosition = initialPosition;
    this._bestValue = objective(initialPosition);
  }

  walk(): WalkResult {
    let current = this._bestPosition;
    let currentVal = this._bestValue;
    let accepted = 0;
    this._history = [];

    for (let i = 0; i < this._maxSteps; i++) {
      const drift = (Math.random() - 0.5) * 2 * this._stepSize;
      const candidate = current + drift;
      const candidateVal = this._objective(candidate);

      const isAccepted = candidateVal < currentVal || Math.random() < 0.05;
      const step: WalkStep = {
        stepIndex: i,
        position: candidate,
        value: candidateVal,
        accepted: isAccepted,
      };
      this._history.push(step);

      if (isAccepted) {
        current = candidate;
        currentVal = candidateVal;
        accepted++;
        if (candidateVal < this._bestValue) {
          this._bestValue = candidateVal;
          this._bestPosition = candidate;
        }
      }
    }

    return {
      bestPosition: this._bestPosition,
      bestValue: this._bestValue,
      totalSteps: this._maxSteps,
      acceptedSteps: accepted,
      history: this._history,
    };
  }

  setStepSize(size: number): void {
    this._stepSize = Math.max(0, size);
  }

  reset(position: number): void {
    this._bestPosition = position;
    this._bestValue = this._objective(position);
    this._history = [];
  }

  getHistory(limit: number = 50): WalkStep[] {
    return this._history.slice(-limit);
  }

  get bestPosition(): number {
    return this._bestPosition;
  }

  get bestValue(): number {
    return this._bestValue;
  }

  anneal(reductionFactor: number = 0.95): void {
    this._stepSize *= reductionFactor;
  }
}
