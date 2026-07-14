export interface PerceptualState {
  id: string;
  name: string;
  dominance: number;
  lastActiveAt: number;
}

export interface SwitchEvent {
  fromState: string;
  toState: string;
  switchedAt: number;
  trigger: string;
}

export class MultistablePercept {
  private _states: Map<string, PerceptualState> = new Map();
  private _events: SwitchEvent[] = [];
  private _current: string | null = null;
  private _switchCount = 0;
  private _dwellTime = 1000;
  private _energyLandscape: Map<string, number> = new Map();
  private _transitionRates: Map<string, Map<string, number>> = new Map();

  registerState(state: PerceptualState): void {
    this._states.set(state.id, state);
    if (this._current === null) this._current = state.id;
    this._energyLandscape.set(state.id, Math.random());
    if (!this._transitionRates.has(state.id)) {
      this._transitionRates.set(state.id, new Map());
    }
  }

  perceive(): PerceptualState | null {
    if (!this._current) return null;
    const state = this._states.get(this._current);
    if (!state) return null;
    state.dominance = Math.min(1, state.dominance + 0.05);
    state.lastActiveAt = Date.now();
    this._energyLandscape.set(state.id, state.dominance);
    return state;
  }

  switchTo(stateId: string, trigger: string = 'spontaneous'): SwitchEvent | null {
    if (!this._states.has(stateId) || this._current === stateId) return null;
    const from = this._current ?? 'none';
    const event: SwitchEvent = {
      fromState: from,
      toState: stateId,
      switchedAt: Date.now(),
      trigger,
    };
    this._events.push(event);
    if (this._events.length > 100) this._events.shift();
    this._current = stateId;
    this._switchCount++;
    const newState = this._states.get(stateId);
    if (newState) newState.dominance = 0.6;
    this._updateTransitionRate(from, stateId);
    return event;
  }

  autoFlip(): SwitchEvent | null {
    if (this._states.size < 2) return null;
    const candidates = Array.from(this._states.keys()).filter(k => k !== this._current);
    const probs = candidates.map(id => this._transitionRates.get(this._current ?? '')?.get(id) ?? 1 / candidates.length);
    const total = probs.reduce((a, b) => a + b, 0);
    const r = Math.random() * total;
    let cum = 0;
    for (let i = 0; i < candidates.length; i++) {
      cum += probs[i];
      if (r <= cum) return this.switchTo(candidates[i], 'auto-flip');
    }
    return this.switchTo(candidates[0], 'auto-flip');
  }

  decayDominance(): void {
    for (const s of this._states.values()) {
      s.dominance = Math.max(0, s.dominance - 0.01);
    }
  }

  getEvents(limit: number = 50): SwitchEvent[] {
    return this._events.slice(-limit);
  }

  getCurrentState(): PerceptualState | null {
    return this._current ? this._states.get(this._current) ?? null : null;
  }

  get switchCount(): number {
    return this._switchCount;
  }

  computePerceptualEntropy(): number {
    const dominances = Array.from(this._states.values()).map(s => s.dominance);
    const total = dominances.reduce((a, b) => a + b, 0);
    if (total === 0) return 0;
    let entropy = 0;
    for (const d of dominances) {
      const p = d / total;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  simulateGillespie(duration: number): SwitchEvent[] {
    const events: SwitchEvent[] = [];
    const start = Date.now();
    while (Date.now() - start < duration) {
      const rates = Array.from(this._transitionRates.get(this._current ?? '')?.values() ?? []);
      const totalRate = rates.reduce((a, b) => a + b, 0);
      if (totalRate <= 0) break;
      const dt = -Math.log(Math.random()) / totalRate;
      const result = this.autoFlip();
      if (result) events.push(result);
    }
    return events;
  }

  private _updateTransitionRate(from: string, to: string): void {
    if (!this._transitionRates.has(from)) {
      this._transitionRates.set(from, new Map());
    }
    const map = this._transitionRates.get(from)!;
    map.set(to, (map.get(to) ?? 0) + 1);
  }
}
