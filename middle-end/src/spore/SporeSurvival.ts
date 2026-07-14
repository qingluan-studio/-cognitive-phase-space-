/**
 * 孢子幸存模块：通过冗余策略与遗传备份，确保至少一个孢子能存活，
 * 将核心基因信息传递到下一代。仿生孢子的高抗性与多拷贝策略。
 */

export interface GeneticPayload {
  id: string;
  sequence: string;
  checksum: number;
  critical: boolean;
}

export interface SurvivalOutcome {
  payloadId: string;
  totalSpores: number;
  survivors: number;
  guaranteed: boolean;
  evaluatedAt: number;
}

export class SporeSurvival {
  private _payloads: Map<string, GeneticPayload> = new Map();
  private _copies: Map<string, number> = new Map();
  private _outcomes: SurvivalOutcome[] = [];
  private _minRedundancy = 3;

  registerPayload(payload: GeneticPayload): void {
    this._payloads.set(payload.id, payload);
    this._copies.set(payload.id, 0);
  }

  replicatePayload(payloadId: string, count: number): number {
    const payload = this._payloads.get(payloadId);
    if (!payload) return 0;
    const current = this._copies.get(payloadId) ?? 0;
    const updated = current + count;
    this._copies.set(payloadId, updated);
    return updated;
  }

  ensureRedundancy(payloadId: string): number {
    const payload = this._payloads.get(payloadId);
    if (!payload) return 0;
    const current = this._copies.get(payloadId) ?? 0;
    if (current < this._minRedundancy) {
      const needed = this._minRedundancy - current;
      this.replicatePayload(payloadId, needed);
      return needed;
    }
    return 0;
  }

  simulateCatastrophe(payloadId: string, killRate: number): SurvivalOutcome {
    const payload = this._payloads.get(payloadId);
    if (!payload) {
      return {
        payloadId,
        totalSpores: 0,
        survivors: 0,
        guaranteed: false,
        evaluatedAt: Date.now(),
      };
    }
    const total = this._copies.get(payloadId) ?? 0;
    const killed = Math.floor(total * Math.min(1, Math.max(0, killRate)));
    const survivors = Math.max(0, total - killed);
    this._copies.set(payloadId, survivors);
    const outcome: SurvivalOutcome = {
      payloadId,
      totalSpores: total,
      survivors,
      guaranteed: survivors > 0,
      evaluatedAt: Date.now(),
    };
    this._outcomes.push(outcome);
    if (this._outcomes.length > 200) this._outcomes.shift();
    return outcome;
  }

  verifyChecksum(payloadId: string, candidate: string): boolean {
    const payload = this._payloads.get(payloadId);
    if (!payload) return false;
    let sum = 0;
    for (let i = 0; i < candidate.length; i++) {
      sum += candidate.charCodeAt(i);
    }
    return sum === payload.checksum && candidate === payload.sequence;
  }

  restoreFromBackup(payloadId: string): GeneticPayload | null {
    const payload = this._payloads.get(payloadId);
    if (!payload) return null;
    const copies = this._copies.get(payloadId) ?? 0;
    if (copies <= 0) return null;
    return { ...payload };
  }

  getOutcomeHistory(limit: number = 50): SurvivalOutcome[] {
    return this._outcomes.slice(-limit);
  }

  listCriticalPayloads(): GeneticPayload[] {
    return Array.from(this._payloads.values()).filter(p => p.critical);
  }

  get totalPayloads(): number {
    return this._payloads.size;
  }

  get totalCopies(): number {
    let sum = 0;
    for (const c of this._copies.values()) sum += c;
    return sum;
  }
}
