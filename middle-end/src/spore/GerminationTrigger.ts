/**
 * 萌发触发器模块：当环境条件满足阈值时激活休眠孢子，
 * 监测温度、湿度、营养、信号分子等多维条件以判断萌发时机。
 */

export interface GerminationCondition {
  metric: string;
  value: number;
  threshold: number;
  satisfied: boolean;
}

export interface TriggerResult {
  sporeId: string;
  ready: boolean;
  conditions: GerminationCondition[];
  firedAt: number;
}

export class GerminationTrigger {
  private _conditions: Map<string, GerminationCondition> = new Map();
  private _pending: Set<string> = new Set();
  private _fired: TriggerResult[] = [];
  private _cooldownMs = 1000;

  registerCondition(metric: string, threshold: number): void {
    this._conditions.set(metric, {
      metric,
      value: 0,
      threshold,
      satisfied: false,
    });
  }

  updateMetric(metric: string, value: number): boolean {
    const cond = this._conditions.get(metric);
    if (!cond) return false;
    cond.value = value;
    cond.satisfied = value >= cond.threshold;
    return cond.satisfied;
  }

  evaluateAll(): GerminationCondition[] {
    return Array.from(this._conditions.values());
  }

  armSpore(sporeId: string): void {
    this._pending.add(sporeId);
  }

  disarmSpore(sporeId: string): void {
    this._pending.delete(sporeId);
  }

  fire(sporeId: string): TriggerResult {
    const conditions = this.evaluateAll();
    const ready = conditions.every(c => c.satisfied) && conditions.length > 0;
    const result: TriggerResult = {
      sporeId,
      ready,
      conditions: [...conditions],
      firedAt: Date.now(),
    };
    if (ready) {
      this._pending.delete(sporeId);
      this._fired.push(result);
      if (this._fired.length > 200) this._fired.shift();
    }
    return result;
  }

  fireAllPending(): TriggerResult[] {
    const results: TriggerResult[] = [];
    for (const sporeId of Array.from(this._pending)) {
      const last = this._fired.find(r => r.sporeId === sporeId);
      if (last && Date.now() - last.firedAt < this._cooldownMs) continue;
      results.push(this.fire(sporeId));
    }
    return results;
  }

  getFiredHistory(limit: number = 50): TriggerResult[] {
    return this._fired.slice(-limit);
  }

  clearConditions(): void {
    this._conditions.clear();
  }

  get pendingCount(): number {
    return this._pending.size;
  }

  get conditionCount(): number {
    return this._conditions.size;
  }
}
