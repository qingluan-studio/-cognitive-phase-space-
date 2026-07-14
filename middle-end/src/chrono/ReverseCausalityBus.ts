/**
 * 逆因果总线：先取结果后执行前提，不匹配则微回滚。
 * 订阅者从总线"取"尚未产生的结果，随后真正执行前提。
 * 若前提产出与预取结果不一致，总线对该次回溯进行微回滚补偿。
 */

export interface CausalResult {
  id: string;
  premiseId: string;
  payload: Record<string, unknown>;
  fetchedAt: number;
  matched: boolean;
}

export interface CausalPremise {
  id: string;
  action: string;
  payload: Record<string, unknown>;
  executedAt: number;
}

export type RollbackDelta = {
  premiseId: string;
  reason: string;
  timestamp: number;
};

export interface BusSubscriber {
  id: string;
  topic: string;
  onResult: (result: CausalResult) => void;
}

export class ReverseCausalityBus {
  private _results: Map<string, CausalResult> = new Map();
  private _premises: Map<string, CausalPremise> = new Map();
  private _subscribers: Map<string, BusSubscriber> = new Map();
  private _rollbackLog: RollbackDelta[] = [];
  private _paradoxCount: number = 0;

  /** 先取结果：在前提执行之前取得预期产出。 */
  fetchResult(id: string, premiseId: string, payload: Record<string, unknown>): CausalResult {
    const result: CausalResult = {
      id,
      premiseId,
      payload,
      fetchedAt: Date.now(),
      matched: false,
    };
    this._results.set(id, result);
    this._notify(premiseId, result);
    return result;
  }

  /** 后执行前提：真正产生产出后与预取结果比对。 */
  executePremise(premise: CausalPremise): boolean {
    this._premises.set(premise.id, premise);
    const result = this._findResultByPremise(premise.id);
    if (!result) {
      this._paradoxCount++;
      this._rollbackLog.push({
        premiseId: premise.id,
        reason: 'no prefetched result',
        timestamp: Date.now(),
      });
      return false;
    }
    const consistent = this._compare(result.payload, premise.payload);
    if (!consistent) {
      this._microRollback(result, 'payload mismatch');
      return false;
    }
    result.matched = true;
    return true;
  }

  subscribe(subscriber: BusSubscriber): void {
    this._subscribers.set(subscriber.id, subscriber);
  }

  unsubscribe(id: string): boolean {
    return this._subscribers.delete(id);
  }

  reconcile(): number {
    let resolved = 0;
    for (const result of this._results.values()) {
      if (!result.matched) {
        this._microRollback(result, 'unresolved at reconcile');
      } else {
        resolved++;
      }
    }
    return resolved;
  }

  get paradoxCount(): number {
    return this._paradoxCount;
  }

  getRollbackLog(): RollbackDelta[] {
    return [...this._rollbackLog];
  }

  private _microRollback(result: CausalResult, reason: string): void {
    this._paradoxCount++;
    this._rollbackLog.push({
      premiseId: result.premiseId,
      reason,
      timestamp: Date.now(),
    });
    result.matched = false;
  }

  private _notify(premiseId: string, result: CausalResult): void {
    for (const sub of this._subscribers.values()) {
      if (sub.topic === premiseId) sub.onResult(result);
    }
  }

  private _findResultByPremise(premiseId: string): CausalResult | undefined {
    for (const r of this._results.values()) {
      if (r.premiseId === premiseId) return r;
    }
    return undefined;
  }

  private _compare(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  }
}
