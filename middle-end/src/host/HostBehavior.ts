export type BehaviorState = 'explore' | 'exploit' | 'rest' | 'flee' | 'approach';

export interface BehaviorAction {
  id: string;
  state: BehaviorState;
  reward: number;
  expectedReward: number;
  predictionError: number;
  timestamp: number;
}

export interface BehaviorPolicy {
  exploreRate: number;
  learningRate: number;
  discountFactor: number;
}

export class HostBehavior {
  private _actions: BehaviorAction[] = [];
  private _policy: BehaviorPolicy;
  private _state: Record<string, unknown> = {};
  private _valueFunction: Map<string, number> = new Map();
  private _visitCounts: Map<string, number> = new Map();
  private _softmaxTemperature: number = 1;
  private _stateTransitionMatrix: Map<string, Map<string, number>> = new Map();

  constructor(policy: BehaviorPolicy) {
    this._policy = { ...policy };
    this._initTransitionMatrix();
  }

  private _initTransitionMatrix(): void {
    const states: BehaviorState[] = ['explore', 'exploit', 'rest', 'flee', 'approach'];
    for (const s of states) {
      const map = new Map<string, number>();
      for (const t of states) {
        map.set(t, s === t ? 0.5 : 0.125);
      }
      this._stateTransitionMatrix.set(s, map);
    }
  }

  act(state: BehaviorState, reward: number): BehaviorAction {
    const expected = this._valueFunction.get(state) ?? 0;
    const predictionError = reward - expected;
    const newValue = expected + this._policy.learningRate * predictionError;
    this._valueFunction.set(state, newValue);
    const visits = (this._visitCounts.get(state) ?? 0) + 1;
    this._visitCounts.set(state, visits);
    const action: BehaviorAction = {
      id: `action-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      state,
      reward,
      expectedReward: expected,
      predictionError,
      timestamp: Date.now(),
    };
    this._actions.push(action);
    if (this._actions.length > 200) this._actions.shift();
    return action;
  }

  selectActionSoftmax(): BehaviorState {
    const states: BehaviorState[] = ['explore', 'exploit', 'rest', 'flee', 'approach'];
    const values = states.map(s => this._valueFunction.get(s) ?? 0);
    const maxVal = Math.max(...values);
    const expValues = values.map(v => Math.exp((v - maxVal) / this._softmaxTemperature));
    const sumExp = expValues.reduce((a, b) => a + b, 0);
    const probs = expValues.map(v => v / sumExp);
    const roll = Math.random();
    let cumulative = 0;
    for (let i = 0; i < states.length; i++) {
      cumulative += probs[i];
      if (roll <= cumulative) return states[i];
    }
    return states[states.length - 1];
  }

  epsilonGreedy(): BehaviorState {
    if (Math.random() < this._policy.exploreRate) {
      const states: BehaviorState[] = ['explore', 'exploit', 'rest', 'flee', 'approach'];
      return states[Math.floor(Math.random() * states.length)];
    }
    let bestState: BehaviorState = 'rest';
    let bestValue = -Infinity;
    for (const [state, value] of this._valueFunction) {
      if (value > bestValue) {
        bestValue = value;
        bestState = state as BehaviorState;
      }
    }
    return bestState;
  }

  averageReward(): number {
    if (this._actions.length === 0) return 0;
    return this._actions.reduce((acc, a) => acc + a.reward, 0) / this._actions.length;
  }

  averagePredictionError(): number {
    if (this._actions.length === 0) return 0;
    return this._actions.reduce((acc, a) => acc + Math.abs(a.predictionError), 0) / this._actions.length;
  }

  getValue(state: BehaviorState): number {
    return this._valueFunction.get(state) ?? 0;
  }

  getVisitCount(state: BehaviorState): number {
    return this._visitCounts.get(state) ?? 0;
  }

  setPolicy(policy: Partial<BehaviorPolicy>): void {
    this._policy = { ...this._policy, ...policy };
  }

  setSoftmaxTemperature(temp: number): void {
    this._softmaxTemperature = Math.max(0.01, temp);
  }

  get actionCount(): number {
    return this._actions.length;
  }

  get stateSpaceSize(): number {
    return this._valueFunction.size;
  }

  behaviorReport(): Record<string, unknown> {
    return {
      actionCount: this._actions.length,
      stateSpaceSize: this._valueFunction.size,
      averageReward: this.averageReward().toFixed(4),
      averagePredictionError: this.averagePredictionError().toFixed(4),
      exploreRate: this._policy.exploreRate.toFixed(4),
      learningRate: this._policy.learningRate.toFixed(4),
      softmaxTemperature: this._softmaxTemperature.toFixed(4),
      state: this._state,
    };
  }
}
