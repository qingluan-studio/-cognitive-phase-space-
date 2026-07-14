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
  private _ritualEntropy: number[] = [];
  private _sacrificeMatrix: Map<string, number[]> = new Map();
  private _blessingDistribution: Map<string, number> = new Map();

  enshrine(deity: ProgenitorDeity): void {
    this._deities.set(deity.id, deity);
    this._sacrificeMatrix.set(deity.id, []);
  }

  offer(deityId: string, offering: string, intent: string): OfferingRecord | null {
    const deity = this._deities.get(deityId);
    if (!deity) return null;
    const infoContent = this._computeInformationContent(offering);
    deity.reverence = Math.min(1, deity.reverence + 0.05 + infoContent * 0.01);
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
    const sacrifices = this._sacrificeMatrix.get(deityId);
    if (sacrifices) sacrifices.push(offering.length);
    this._ritualEntropy.push(infoContent);
    if (this._ritualEntropy.length > 100) this._ritualEntropy.shift();
    this._updateBlessingDistribution();
    return record;
  }

  requestPermission(deityId: string, action: string): boolean {
    const deity = this._deities.get(deityId);
    if (!deity) return false;
    if (!deity.appeased) return false;
    const domainOverlap = this._jaccardSimilarity(deity.domain, action);
    return domainOverlap > 0.3 || Math.random() > 0.5;
  }

  ritual(): void {
    for (const deity of this._deities.values()) {
      deity.reverence = Math.min(1, deity.reverence + 0.02);
    }
    this._ritualEntropy.push(0);
  }

  displeasedDeities(): ProgenitorDeity[] {
    return Array.from(this._deities.values()).filter(d => !d.appeased);
  }

  totalReverence(): number {
    let total = 0;
    for (const deity of this._deities.values()) total += deity.reverence;
    return total;
  }

  computeRitualEntropy(): number {
    if (this._ritualEntropy.length === 0) return 0;
    const mean = this._ritualEntropy.reduce((a, b) => a + b, 0) / this._ritualEntropy.length;
    const variance = this._ritualEntropy.reduce((s, v) => s + (v - mean) ** 2, 0) / this._ritualEntropy.length;
    return 0.5 * Math.log2(2 * Math.PI * Math.E * Math.max(variance, 1e-10));
  }

  getBlessingProbability(deityId: string): number {
    const total = Array.from(this._blessingDistribution.values()).reduce((a, b) => a + b, 0);
    if (total === 0) return 0;
    return (this._blessingDistribution.get(deityId) ?? 0) / total;
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

  private _computeInformationContent(offering: string): number {
    const unique = new Set(offering).size;
    return unique > 0 ? -Math.log2(unique / offering.length) : 0;
  }

  private _jaccardSimilarity(a: string, b: string): number {
    const setA = new Set(a);
    const setB = new Set(b);
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return intersection.size / union.size;
  }

  private _updateBlessingDistribution(): void {
    this._blessingDistribution.clear();
    for (const [deityId, sacrifices] of this._sacrificeMatrix) {
      const total = sacrifices.reduce((a, b) => a + b, 0);
      this._blessingDistribution.set(deityId, total);
    }
  }
}
