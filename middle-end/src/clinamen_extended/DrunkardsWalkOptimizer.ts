export interface WalkStep {
  stepIndex: number;
  position: number;
  value: number;
  accepted: boolean;
  acceptanceProbability: number;
  temperature: number;
}

export interface WalkResult {
  bestPosition: number;
  bestValue: number;
  totalSteps: number;
  acceptedSteps: number;
  acceptanceRate: number;
  history: WalkStep[];
  finalTemperature: number;
}

export class DrunkardsWalkOptimizer {
  private _objective: (x: number) => number;
  private _stepSize: number;
  private _maxSteps: number;
  private _initialTemperature: number;
  private _coolingRate: number;
  private _bestPosition: number;
  private _bestValue: number;
  private _history: WalkStep[] = [];
  private _levyAlpha = 1.5;
  private _useLevyFlights: boolean;

  constructor(
    objective: (x: number) => number,
    initialPosition: number = 0,
    stepSize: number = 1.0,
    maxSteps: number = 1000,
    initialTemperature: number = 1.0,
    coolingRate: number = 0.995,
  ) {
    this._objective = objective;
    this._stepSize = Math.max(0, stepSize);
    this._maxSteps = Math.max(1, maxSteps);
    this._initialTemperature = Math.max(0, initialTemperature);
    this._coolingRate = Math.max(0.5, Math.min(1, coolingRate));
    this._bestPosition = initialPosition;
    this._bestValue = objective(initialPosition);
    this._useLevyFlights = false;
  }

  walk(): WalkResult {
    let current = this._bestPosition;
    let currentVal = this._bestValue;
    let accepted = 0;
    let temperature = this._initialTemperature;
    this._history = [];

    for (let i = 0; i < this._maxSteps; i++) {
      const drift = this._useLevyFlights && Math.random() < 0.1
        ? this._levyFlight()
        : this._gaussian() * this._stepSize;
      const candidate = current + drift;
      const candidateVal = this._objective(candidate);
      const delta = candidateVal - currentVal;
      const acceptanceProbability = delta < 0
        ? 1
        : Math.exp(-delta / Math.max(1e-9, temperature));
      const isAccepted = Math.random() < acceptanceProbability;

      const step: WalkStep = {
        stepIndex: i,
        position: candidate,
        value: candidateVal,
        accepted: isAccepted,
        acceptanceProbability,
        temperature,
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
      temperature *= this._coolingRate;
    }

    return {
      bestPosition: this._bestPosition,
      bestValue: this._bestValue,
      totalSteps: this._maxSteps,
      acceptedSteps: accepted,
      acceptanceRate: accepted / this._maxSteps,
      history: this._history,
      finalTemperature: temperature,
    };
  }

  setStepSize(size: number): void {
    this._stepSize = Math.max(0, size);
  }

  enableLevyFlights(enabled: boolean): void {
    this._useLevyFlights = enabled;
  }

  setLevyAlpha(alpha: number): void {
    this._levyAlpha = Math.max(0.5, Math.min(2, alpha));
  }

  reset(position: number): void {
    this._bestPosition = position;
    this._bestValue = this._objective(position);
    this._history = [];
  }

  getHistory(limit: number = 50): WalkStep[] {
    return this._history.slice(-limit);
  }

  get bestPosition(): number { return this._bestPosition; }
  get bestValue(): number { return this._bestValue; }
  get stepCount(): number { return this._history.length; }

  anneal(reductionFactor: number = 0.95): void {
    this._stepSize *= Math.max(0, Math.min(1, reductionFactor));
  }

  private _gaussian(): number {
    const u1 = Math.max(1e-9, Math.random());
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  private _levyFlight(): number {
    const u = Math.max(1e-9, Math.random()) - 0.5;
    const v = Math.max(1e-9, Math.random());
    const alpha = this._levyAlpha;
    const sigma = Math.pow(
      (Math.gamma(1 + alpha) * Math.sin(Math.PI * alpha / 2)) /
      (Math.gamma((1 + alpha) / 2) * alpha * Math.pow(2, (alpha - 1) / 2)),
      1 / alpha
    );
    return (u * sigma) / Math.pow(Math.abs(v), 1 / alpha) * this._stepSize;
  }
}

declare global {
  interface Math {
    gamma(x: number): number;
  }
}

Math.gamma = Math.gamma || function(x: number): number {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) {
    return Math.PI / (Math.sin(Math.PI * x) * Math.gamma(1 - x));
  }
  x -= 1;
  let a = c[0];
  const t = x + g + 0.5;
  for (let i = 1; i < g + 2; i++) {
    a += c[i] / (x + i);
  }
  return Math.sqrt(2 * Math.PI) * Math.pow(t, x + 0.5) * Math.exp(-t) * a;
};
