/**
 * 先天免疫：与生俱来的基础防御。
 * 系统内置的基础防御层，对所有外来的通用可疑模式进行非特异性识别与拦截。
 */

export interface InnateBarrier {
  id: string;
  pattern: string;
  threshold: number;
  blockCount: number;
}

export interface DefenseTrigger {
  barrierId: string;
  intruderSignature: string;
  blocked: boolean;
  triggeredAt: number;
}

export class InnateImmunity {
  private _barriers: Map<string, InnateBarrier> = new Map();
  private _triggers: DefenseTrigger[] = [];
  private _sensitivity = 0.5;
  private _maxTriggers = 300;

  installBarrier(barrier: InnateBarrier): void {
    this._barriers.set(barrier.id, barrier);
  }

  scan(signature: string): DefenseTrigger[] {
    const results: DefenseTrigger[] = [];
    for (const barrier of this._barriers.values()) {
      const matches = this._matchCount(signature, barrier.pattern);
      const score = matches / Math.max(barrier.pattern.length, 1);
      const blocked = score >= barrier.threshold * this._sensitivity;
      if (blocked) barrier.blockCount++;
      const trigger: DefenseTrigger = {
        barrierId: barrier.id,
        intruderSignature: signature,
        blocked,
        triggeredAt: Date.now(),
      };
      results.push(trigger);
      this._triggers.push(trigger);
    }
    if (this._triggers.length > this._maxTriggers) this._triggers.splice(0, this._triggers.length - this._maxTriggers);
    return results;
  }

  private _matchCount(sig: string, pattern: string): number {
    let count = 0;
    for (const ch of pattern) if (sig.includes(ch)) count++;
    return count;
  }

  reinforce(barrierId: string, amount: number): InnateBarrier | null {
    const barrier = this._barriers.get(barrierId);
    if (!barrier) return null;
    barrier.threshold = Math.max(0, Math.min(1, barrier.threshold - amount));
    return barrier;
  }

  setSensitivity(value: number): void {
    this._sensitivity = Math.max(0, Math.min(1, value));
  }

  getBarrier(id: string): InnateBarrier | null {
    return this._barriers.get(id) ?? null;
  }

  getTriggers(limit: number = 50): DefenseTrigger[] {
    return this._triggers.slice(-limit);
  }

  getBlockStatistics(): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const barrier of this._barriers.values()) {
      stats[barrier.id] = barrier.blockCount;
    }
    return stats;
  }

  get barrierCount(): number {
    return this._barriers.size;
  }
}
