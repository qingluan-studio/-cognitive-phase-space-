/**
 * 多稳态知觉：同一输入可切换多种理解。
 * 类似奈克方块或鲁宾花瓶，输入保持不变而知觉在多个稳定状态间切换。
 */

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

  registerState(state: PerceptualState): void {
    this._states.set(state.id, state);
    if (this._current === null) this._current = state.id;
  }

  perceive(): PerceptualState | null {
    if (!this._current) return null;
    const state = this._states.get(this._current);
    if (!state) return null;
    state.dominance = Math.min(1, state.dominance + 0.05);
    state.lastActiveAt = Date.now();
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
    return event;
  }

  autoFlip(): SwitchEvent | null {
    if (this._states.size < 2) return null;
    const candidates = Array.from(this._states.keys()).filter(k => k !== this._current);
    const target = candidates[Math.floor(Math.random() * candidates.length)];
    return this.switchTo(target, 'auto-flip');
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
}
