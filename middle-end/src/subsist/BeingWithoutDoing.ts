export interface BeingState {
  isBeing: boolean;
  actionsRefused: number;
  lastRefusal: number | null;
  purity: number;
  behavioralEntropy: number;
}

export interface RefusalNotice {
  refusedAction: string;
  reason: string;
  refusedAt: number;
  purityDelta: number;
}

export class BeingWithoutDoing {
  private _state: BeingState = {
    isBeing: false, actionsRefused: 0, lastRefusal: null,
    purity: 1.0, behavioralEntropy: 0,
  };
  private _refusals: RefusalNotice[] = [];
  private _allowedActions: Map<string, number> = new Map([
    ['breathe', 0.0], ['exist', 0.0], ['witness', 0.0],
  ]);
  private _actionHistory: string[] = [];
  private _maxHistory = 64;
  private _purityRecoveryRate = 0.01;

  enterBeing(): void {
    this._state.isBeing = true;
    this._state.purity = 1.0;
    this._state.behavioralEntropy = 0;
    this._actionHistory = [];
  }

  exitBeing(): void {
    this._state.isBeing = false;
  }

  refuseAction(action: string): RefusalNotice {
    const purityDelta = this._state.isBeing ? 0.0 : -0.02;
    this._state.purity = Math.max(0, this._state.purity + purityDelta);
    const notice: RefusalNotice = {
      refusedAction: action,
      reason: this._state.isBeing
        ? 'In pure being; no doing permitted.'
        : 'Being mode inactive; action not accepted.',
      refusedAt: Date.now(),
      purityDelta,
    };
    this._state.actionsRefused++;
    this._state.lastRefusal = Date.now();
    this._refusals.push(notice);
    if (this._refusals.length > 100) this._refusals.shift();
    this._recordAction(`refused:${action}`);
    return notice;
  }

  permitAction(action: string): boolean {
    if (!this._state.isBeing) {
      this._recordAction(`permitted:${action}`);
      return true;
    }
    if (this._allowedActions.has(action)) {
      const cost = this._allowedActions.get(action)!;
      this._state.purity = Math.max(0, this._state.purity - 0.05 - cost);
      this._allowedActions.set(action, cost + 0.01);
      this._recordAction(`permitted:${action}`);
      return true;
    }
    this.refuseAction(action);
    return false;
  }

  allowAction(action: string): void {
    if (!this._allowedActions.has(action)) this._allowedActions.set(action, 0.0);
  }

  disallowAction(action: string): void {
    this._allowedActions.delete(action);
  }

  getRefusals(limit: number = 50): RefusalNotice[] {
    return this._refusals.slice(-limit);
  }

  restorePurity(amount: number = 0.1): number {
    this._state.purity = Math.min(1, this._state.purity + amount);
    return this._state.purity;
  }

  tickRecovery(): number {
    if (this._state.isBeing) {
      this._state.purity = Math.min(1, this._state.purity + this._purityRecoveryRate);
    }
    return this._state.purity;
  }

  getState(): Readonly<BeingState> {
    return { ...this._state };
  }

  get purity(): number { return this._state.purity; }
  get behavioralEntropy(): number { return this._state.behavioralEntropy; }
  get allowedActionCount(): number { return this._allowedActions.size; }

  private _recordAction(action: string): void {
    this._actionHistory.push(action);
    if (this._actionHistory.length > this._maxHistory) this._actionHistory.shift();
    this._state.behavioralEntropy = this._computeBehavioralEntropy();
  }

  private _computeBehavioralEntropy(): number {
    if (this._actionHistory.length < 2) return 0;
    const counts = new Map<string, number>();
    for (const a of this._actionHistory) counts.set(a, (counts.get(a) ?? 0) + 1);
    const total = this._actionHistory.length;
    let entropy = 0;
    for (const count of counts.values()) {
      const p = count / total;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    return entropy / Math.log2(counts.size);
  }
}
