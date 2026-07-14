/** 终末计时器 - 预设死亡倒计时，所有操作向死而生对齐 */

export interface EschatonConfig {
  id: string;
  totalDuration: number;
  startedAt: number;
  finalAction: () => void;
}

export interface EschatonState {
  configId: string;
  elapsed: number;
  remaining: number;
  progress: number;
  isExpired: boolean;
}

export interface AlignmentRecord {
  operationId: string;
  timestamp: number;
  remainingAtCall: number;
  aligned: boolean;
}

export class EschatonTimer {
  private _configs: Map<string, EschatonConfig> = new Map();
  private _alignments: AlignmentRecord[] = [];
  private _activeConfigId: string | null = null;
  private _expirationHandlers: Map<string, Array<() => void>> = new Map();
  private _idCounter = 0;
  private _expired = false;

  arm(totalDuration: number, finalAction: () => void = () => {}): string {
    if (totalDuration <= 0) throw new Error('Duration must be positive');
    const id = `eschaton-${++this._idCounter}-${Date.now()}`;
    const config: EschatonConfig = {
      id,
      totalDuration,
      startedAt: Date.now(),
      finalAction,
    };
    this._configs.set(id, config);
    this._activeConfigId = id;
    this._expired = false;
    return id;
  }

  disarm(configId: string): boolean {
    if (this._activeConfigId === configId) {
      this._activeConfigId = null;
    }
    return this._configs.delete(configId);
  }

  getState(configId?: string): EschatonState | null {
    const id = configId || this._activeConfigId;
    if (!id) return null;
    const config = this._configs.get(id);
    if (!config) return null;
    const elapsed = Date.now() - config.startedAt;
    const remaining = Math.max(0, config.totalDuration - elapsed);
    const progress = Math.min(1, elapsed / config.totalDuration);
    if (remaining === 0 && !this._expired) {
      this._expired = true;
      this._triggerExpiration(id);
    }
    return {
      configId: id,
      elapsed,
      remaining,
      progress,
      isExpired: remaining === 0,
    };
  }

  align(operationId: string, configId?: string): AlignmentRecord {
    const state = this.getState(configId);
    if (!state) {
      throw new Error('No active eschaton config');
    }
    const record: AlignmentRecord = {
      operationId,
      timestamp: Date.now(),
      remainingAtCall: state.remaining,
      aligned: true,
    };
    this._alignments.push(record);
    return record;
  }

  registerExpirationHandler(configId: string, handler: () => void): void {
    const list = this._expirationHandlers.get(configId) || [];
    list.push(handler);
    this._expirationHandlers.set(configId, list);
  }

  remainingRatio(configId?: string): number {
    const state = this.getState(configId);
    if (!state) return 0;
    const config = this._configs.get(state.configId);
    if (!config) return 0;
    return state.remaining / config.totalDuration;
  }

  urgencyFactor(configId?: string): number {
    return 1 - this.remainingRatio(configId);
  }

  get alignments(): AlignmentRecord[] {
    return [...this._alignments];
  }

  get activeConfigId(): string | null {
    return this._activeConfigId;
  }

  get isExpired(): boolean {
    return this._expired;
  }

  private _triggerExpiration(configId: string): void {
    const config = this._configs.get(configId);
    if (config) {
      try {
        config.finalAction();
      } catch (err) {
        // final action errors are swallowed to preserve system integrity
      }
    }
    const handlers = this._expirationHandlers.get(configId) || [];
    for (const handler of handlers) {
      try {
        handler();
      } catch (err) {
        // handler errors are swallowed
      }
    }
  }
}
