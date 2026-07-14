/**
 * 孢子散布模块：将休眠孢子广播到多个异质环境，
 * 以提高至少一个孢子成功萌发的概率。仿生自真菌孢子的风力传播。
 */

export type DispersalMedium = 'air' | 'water' | 'soil' | 'digital' | 'memory';

export interface DispersalTarget {
  envId: string;
  medium: DispersalMedium;
  hostility: number;
  reachable: boolean;
}

export interface DispersalRecord {
  sporeId: string;
  targets: string[];
  dispatchedAt: number;
  successCount: number;
}

export class SporeDispersal {
  private _targets: Map<string, DispersalTarget> = new Map();
  private _records: DispersalRecord[] = [];
  private _maxRange = 12;
  private _redundancy = 3;

  registerTarget(target: DispersalTarget): void {
    this._targets.set(target.envId, target);
  }

  selectTargets(medium: DispersalMedium, count: number): DispersalTarget[] {
    const candidates = Array.from(this._targets.values()).filter(
      t => t.medium === medium && t.reachable
    );
    candidates.sort((a, b) => a.hostility - b.hostility);
    return candidates.slice(0, Math.min(count, this._maxRange));
  }

  broadcast(sporeId: string, medium: DispersalMedium): DispersalRecord {
    const targets = this.selectTargets(medium, this._redundancy);
    const targetIds = targets.map(t => t.envId);
    let successCount = 0;
    for (const t of targets) {
      if (Math.random() > t.hostility) successCount++;
    }
    const record: DispersalRecord = {
      sporeId,
      targets: targetIds,
      dispatchedAt: Date.now(),
      successCount,
    };
    this._records.push(record);
    if (this._records.length > 500) this._records.shift();
    return record;
  }

  evaluateCoverage(): { medium: DispersalMedium; covered: number }[] {
    const media: DispersalMedium[] = ['air', 'water', 'soil', 'digital', 'memory'];
    return media.map(m => ({
      medium: m,
      covered: Array.from(this._targets.values()).filter(t => t.medium === m && t.reachable).length,
    }));
  }

  pruneUnreachable(): number {
    let removed = 0;
    for (const [id, t] of this._targets) {
      if (!t.reachable) {
        this._targets.delete(id);
        removed++;
      }
    }
    return removed;
  }

  recallSpore(sporeId: string): DispersalRecord[] {
    return this._records.filter(r => r.sporeId === sporeId);
  }

  getSuccessfulDispatches(): DispersalRecord[] {
    return this._records.filter(r => r.successCount > 0);
  }

  setRedundancy(n: number): void {
    this._redundancy = Math.max(1, Math.min(n, this._maxRange));
  }

  get targetCount(): number {
    return this._targets.size;
  }

  get totalDispatched(): number {
    return this._records.length;
  }
}
