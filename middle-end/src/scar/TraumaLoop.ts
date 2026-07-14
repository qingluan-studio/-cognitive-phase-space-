export interface TraumaState {
  id: string;
  intensity: number;
  exposureCount: number;
  habituation: number;
  qValue: number;
  extinctionBurst: boolean;
}

export interface ExposureEvent {
  stateId: string;
  intensity: number;
  deltaQ: number;
  reward: number;
  habituationCurve: number;
}

export class TraumaLoop {
  private _states: Map<string, TraumaState> = new Map();
  private _exposureHistory: ExposureEvent[] = [];
  private _state: Record<string, unknown> = {};
  private _learningRate: number = 0.1;
  private _discountFactor: number = 0.95;
  private _extinctionThreshold: number = 0.05;
  private _habituationRate: number = 0.15;

  constructor() {}

  get stateCount(): number {
    return this._states.size;
  }

  get exposureCount(): number {
    return this._exposureHistory.length;
  }

  registerState(id: string, intensity: number): void {
    this._states.set(id, {
      id,
      intensity,
      exposureCount: 0,
      habituation: 0,
      qValue: intensity,
      extinctionBurst: false,
    });
  }

  expose(stateId: string, duration: number): ExposureEvent | null {
    const state = this._states.get(stateId);
    if (!state) return null;
    state.exposureCount++;
    const habituationCurve = 1 - Math.exp(-state.exposureCount * this._habituationRate);
    state.habituation = habituationCurve;
    const reward = -state.intensity * (1 - habituationCurve);
    const oldQ = state.qValue;
    const maxNextQ = state.qValue;
    const deltaQ = this._learningRate * (reward + this._discountFactor * maxNextQ - oldQ);
    state.qValue += deltaQ;
    if (state.qValue < this._extinctionThreshold && state.intensity > 0.3) {
      state.extinctionBurst = true;
      state.intensity *= 1.2;
    } else {
      state.extinctionBurst = false;
    }
    const event: ExposureEvent = { stateId, intensity: state.intensity, deltaQ, reward, habituationCurve };
    this._exposureHistory.push(event);
    if (this._exposureHistory.length > 100) this._exposureHistory.shift();
    return event;
  }

  reinforcementSchedule(stateId: string, rewardProbability: number): number {
    const state = this._states.get(stateId);
    if (!state) return 0;
    const reward = Math.random() < rewardProbability ? 1 : -1;
    state.qValue += this._learningRate * (reward - state.qValue);
    return reward;
  }

  averageQValue(): number {
    if (this._states.size === 0) return 0;
    return Array.from(this._states.values()).reduce((s, st) => s + st.qValue, 0) / this._states.size;
  }

  totalIntensity(): number {
    return Array.from(this._states.values()).reduce((s, st) => s + st.intensity, 0);
  }

  mostHabituated(): TraumaState | null {
    if (this._states.size === 0) return null;
    return Array.from(this._states.values()).reduce((best, st) => (st.habituation > best.habituation ? st : best));
  }

  extinctionBursts(): TraumaState[] {
    return Array.from(this._states.values()).filter((st) => st.extinctionBurst);
  }

  exposureSchedule(steps: number): { step: number; intensity: number; qValue: number }[] {
    const schedule: { step: number; intensity: number; qValue: number }[] = [];
    for (let i = 0; i < steps; i++) {
      const intensity = Math.exp(-i * this._habituationRate);
      const q = this._learningRate * (1 - intensity);
      schedule.push({ step: i, intensity, qValue: q });
    }
    return schedule;
  }

  habituationCurve(): number {
    const total = this._states.size;
    if (total === 0) return 0;
    return Array.from(this._states.values()).reduce((s, st) => s + st.habituation, 0) / total;
  }

  report(): Record<string, unknown> {
    return {
      states: this._states.size,
      exposures: this._exposureHistory.length,
      avgQ: this.averageQValue(),
      totalIntensity: this.totalIntensity(),
      bursts: this.extinctionBursts().length,
      state: this._state,
    };
  }
}
