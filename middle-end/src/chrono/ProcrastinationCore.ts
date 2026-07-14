/**
 * 拖延核心：故意延迟决策，等待未来信息达到临界量。
 * 被推迟的决策进入等待队列，随信息累积评估；当信息质量
 * 超过临界阈值或外力强制时才落地，避免过早确定。
 */

export interface PendingDecision {
  id: string;
  description: string;
  options: Record<string, unknown>[];
  infoMass: number;
  deferredAt: number;
  decided: boolean;
  resolution: Record<string, unknown> | null;
}

export type ProcrastinationState = 'idle' | 'waiting' | 'critical' | 'forced';

export interface DecisionReport {
  id: string;
  resolved: boolean;
  finalInfoMass: number;
  waitedMs: number;
}

export class ProcrastinationCore {
  private _pending: Map<string, PendingDecision> = new Map();
  private _threshold: number = 1.0;
  private _state: ProcrastinationState = 'idle';
  private _totalDeferred: number = 0;
  private _totalResolved: number = 0;

  defer(id: string, description: string, options: Record<string, unknown>[]): PendingDecision {
    const decision: PendingDecision = {
      id,
      description,
      options,
      infoMass: 0,
      deferredAt: Date.now(),
      decided: false,
      resolution: null,
    };
    this._pending.set(id, decision);
    this._totalDeferred++;
    this._state = 'waiting';
    return decision;
  }

  /** 累积未来到达的信息量。 */
  accumulate(decisionId: string, infoDelta: number): number {
    const decision = this._pending.get(decisionId);
    if (!decision) return 0;
    decision.infoMass += infoDelta;
    if (decision.infoMass >= this._threshold) {
      this._state = 'critical';
    }
    return decision.infoMass;
  }

  evaluate(): string[] {
    const ready: string[] = [];
    for (const decision of this._pending.values()) {
      if (!decision.decided && decision.infoMass >= this._threshold) {
        ready.push(decision.id);
      }
    }
    return ready;
  }

  /** 当信息达到临界量时执行决策。 */
  decide(decisionId: string): DecisionReport {
    const decision = this._pending.get(decisionId);
    if (!decision) {
      return { id: decisionId, resolved: false, finalInfoMass: 0, waitedMs: 0 };
    }
    decision.decided = true;
    decision.resolution =
      decision.options[0] ?? { deferred: true, note: 'insufficient options' };
    this._totalResolved++;
    if (this._pending.size === 0) this._state = 'idle';
    return {
      id: decisionId,
      resolved: true,
      finalInfoMass: decision.infoMass,
      waitedMs: Date.now() - decision.deferredAt,
    };
  }

  /** 外力强制决策：即使信息不足也必须落地。 */
  forceDecide(decisionId: string): DecisionReport {
    this._state = 'forced';
    const decision = this._pending.get(decisionId);
    if (!decision) {
      return { id: decisionId, resolved: false, finalInfoMass: 0, waitedMs: 0 };
    }
    decision.infoMass = this._threshold;
    return this.decide(decisionId);
  }

  get pendingCount(): number {
    return this._pending.size;
  }

  get state(): ProcrastinationState {
    return this._state;
  }

  getStats(): { deferred: number; resolved: number; threshold: number } {
    return {
      deferred: this._totalDeferred,
      resolved: this._totalResolved,
      threshold: this._threshold,
    };
  }
}
