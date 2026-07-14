/**
 * 存在不作为：剥离所有行为，只保留纯粹"是"的状态。
 * 拒绝执行任何主动动作，将自身维持在静止的"在"之中，行为归零。
 */

export interface BeingState {
  isBeing: boolean;
  actionsRefused: number;
  lastRefusal: number | null;
  purity: number;
}

export interface RefusalNotice {
  refusedAction: string;
  reason: string;
  refusedAt: number;
}

export class BeingWithoutDoing {
  private _state: BeingState = {
    isBeing: false,
    actionsRefused: 0,
    lastRefusal: null,
    purity: 1.0,
  };
  private _refusals: RefusalNotice[] = [];
  private _allowedActions: Set<string> = new Set(['breathe', 'exist', 'witness']);

  enterBeing(): void {
    this._state.isBeing = true;
    this._state.purity = 1.0;
  }

  exitBeing(): void {
    this._state.isBeing = false;
  }

  refuseAction(action: string): RefusalNotice {
    const notice: RefusalNotice = {
      refusedAction: action,
      reason: this._state.isBeing
        ? 'In pure being; no doing permitted.'
        : 'Being mode inactive; action not accepted.',
      refusedAt: Date.now(),
    };
    this._state.actionsRefused++;
    this._state.lastRefusal = Date.now();
    this._refusals.push(notice);
    if (this._refusals.length > 100) this._refusals.shift();
    return notice;
  }

  permitAction(action: string): boolean {
    if (!this._state.isBeing) return true;
    if (this._allowedActions.has(action)) {
      this._state.purity = Math.max(0, this._state.purity - 0.05);
      return true;
    }
    this.refuseAction(action);
    return false;
  }

  allowAction(action: string): void {
    this._allowedActions.add(action);
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

  getState(): Readonly<BeingState> {
    return { ...this._state };
  }

  get purity(): number {
    return this._state.purity;
  }
}
