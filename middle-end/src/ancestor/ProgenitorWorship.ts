/**
 * 祖先崇拜：将最初创建者视为神明。
 * 维护一份"创世神"列表与祭祀仪式，所有重大变更必须先请示祖先、献祭获得许可。
 */

export interface ProgenitorDeity {
  id: string;
  name: string;
  domain: string;
  reverence: number;
  appeased: boolean;
}

export interface OfferingRecord {
  deityId: string;
  offering: string;
  intent: string;
  accepted: boolean;
  offeredAt: number;
}

export class ProgenitorWorship {
  private _deities: Map<string, ProgenitorDeity> = new Map();
  private _offerings: OfferingRecord[] = [];
  private _approvalThreshold = 0.6;

  enshrine(deity: ProgenitorDeity): void {
    this._deities.set(deity.id, deity);
  }

  offer(deityId: string, offering: string, intent: string): OfferingRecord | null {
    const deity = this._deities.get(deityId);
    if (!deity) return null;
    deity.reverence = Math.min(1, deity.reverence + 0.05);
    const accepted = deity.reverence >= this._approvalThreshold && offering.length > 0;
    if (accepted) deity.appeased = true;
    const record: OfferingRecord = {
      deityId,
      offering,
      intent,
      accepted,
      offeredAt: Date.now(),
    };
    this._offerings.push(record);
    if (this._offerings.length > 200) this._offerings.shift();
    return record;
  }

  requestPermission(deityId: string, action: string): boolean {
    const deity = this._deities.get(deityId);
    if (!deity) return false;
    if (!deity.appeased) return false;
    return deity.domain.includes(action) || Math.random() > 0.5;
  }

  ritual(): void {
    for (const deity of this._deities.values()) {
      deity.reverence = Math.min(1, deity.reverence + 0.02);
    }
  }

  displeasedDeities(): ProgenitorDeity[] {
    return Array.from(this._deities.values()).filter(d => !d.appeased);
  }

  totalReverence(): number {
    let total = 0;
    for (const deity of this._deities.values()) total += deity.reverence;
    return total;
  }

  setApprovalThreshold(value: number): void {
    this._approvalThreshold = Math.max(0, Math.min(1, value));
  }

  getDeity(id: string): ProgenitorDeity | null {
    return this._deities.get(id) ?? null;
  }

  getOfferings(limit: number = 50): OfferingRecord[] {
    return this._offerings.slice(-limit);
  }

  get deityCount(): number {
    return this._deities.size;
  }
}
