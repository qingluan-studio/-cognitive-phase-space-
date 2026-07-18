export interface CapabilityOfferingData {
  id: string;
  sacrificedCapability: string;
  gainedCapability: string;
  sacrificeValue: number;
  gainMultiplier: number;
  cost: number;
}

export interface OfferingResult {
  offeringId: string;
  accepted: boolean;
  netGain: number;
  efficiency: number;
  completedAt: number;
}

export class CapabilityOffering {
  private _offerings: Map<string, CapabilityOfferingData> = new Map();
  private _results: OfferingResult[] = [];
  private _sacrificed: Set<string> = new Set();
  private _minValue = 0.3;
  private _maxMultiplier = 5.0;
  private _synergyMap: Map<string, Set<string>> = new Map();

  propose(offering: CapabilityOfferingData): void {
    const normalized: CapabilityOfferingData = {
      ...offering,
      gainMultiplier: Math.min(offering.gainMultiplier, this._maxMultiplier),
      sacrificeValue: Math.max(0, Math.min(1, offering.sacrificeValue)),
      cost: offering.cost ?? 0,
    };
    this._offerings.set(offering.id, normalized);
  }

  linkSynergy(capA: string, capB: string): void {
    if (!this._synergyMap.has(capA)) this._synergyMap.set(capA, new Set());
    if (!this._synergyMap.has(capB)) this._synergyMap.set(capB, new Set());
    this._synergyMap.get(capA)!.add(capB);
    this._synergyMap.get(capB)!.add(capA);
  }

  private _computeSynergyBonus(sacrificed: string, gained: string): number {
    const related = this._synergyMap.get(sacrificed);
    if (!related) return 0;
    return related.has(gained) ? 0.2 : 0;
  }

  evaluate(offeringId: string): OfferingResult {
    const offering = this._offerings.get(offeringId);
    if (!offering) {
      return { offeringId, accepted: false, netGain: 0, efficiency: 0, completedAt: Date.now() };
    }
    const synergyBonus = this._computeSynergyBonus(offering.sacrificedCapability, offering.gainedCapability);
    const effectiveMultiplier = offering.gainMultiplier + synergyBonus;
    const accepted = offering.sacrificeValue >= this._minValue
      && !this._sacrificed.has(offering.sacrificedCapability);
    const grossGain = accepted ? offering.sacrificeValue * effectiveMultiplier : 0;
    const netGain = accepted ? grossGain - offering.sacrificeValue - offering.cost : 0;
    const efficiency = accepted && offering.sacrificeValue > 0
      ? netGain / offering.sacrificeValue
      : 0;
    const result: OfferingResult = {
      offeringId,
      accepted,
      netGain,
      efficiency,
      completedAt: Date.now(),
    };
    if (accepted) {
      this._sacrificed.add(offering.sacrificedCapability);
    }
    this._results.push(result);
    if (this._results.length > 200) this._results.shift();
    return result;
  }

  isAlreadySacrificed(capability: string): boolean {
    return this._sacrificed.has(capability);
  }

  findSacrificesForGain(targetGain: number): CapabilityOfferingData[] {
    return Array.from(this._offerings.values())
      .filter(o => {
        if (this._sacrificed.has(o.sacrificedCapability)) return false;
        const synergyBonus = this._computeSynergyBonus(o.sacrificedCapability, o.gainedCapability);
        return o.sacrificeValue * (o.gainMultiplier + synergyBonus) >= targetGain;
      })
      .sort((a, b) => a.sacrificeValue - b.sacrificeValue);
  }

  calculateOptimal(): CapabilityOfferingData | null {
    const available = Array.from(this._offerings.values()).filter(
      o => !this._sacrificed.has(o.sacrificedCapability)
    );
    if (available.length === 0) return null;
    return available.reduce((best, o) => {
      const scoreO = this._scoreOffering(o);
      const scoreBest = this._scoreOffering(best);
      return scoreO > scoreBest ? o : best;
    });
  }

  private _scoreOffering(o: CapabilityOfferingData): number {
    const synergyBonus = this._computeSynergyBonus(o.sacrificedCapability, o.gainedCapability);
    const gain = o.sacrificeValue * (o.gainMultiplier + synergyBonus);
    return gain - o.sacrificeValue - o.cost;
  }

  revertSacrifice(capability: string): boolean {
    return this._sacrificed.delete(capability);
  }

  setMinValue(value: number): void {
    this._minValue = Math.max(0, Math.min(1, value));
  }

  getResults(): OfferingResult[] {
    return [...this._results];
  }

  listSacrificedCapabilities(): string[] {
    return Array.from(this._sacrificed);
  }

  computeAverageEfficiency(): number {
    const accepted = this._results.filter(r => r.accepted);
    if (accepted.length === 0) return 0;
    return accepted.reduce((s, r) => s + r.efficiency, 0) / accepted.length;
  }

  get offeringCount(): number {
    return this._offerings.size;
  }

  get totalNetGain(): number {
    return this._results.filter(r => r.accepted).reduce((sum, r) => sum + r.netGain, 0);
  }

  get synergyLinkCount(): number {
    let count = 0;
    for (const links of this._synergyMap.values()) count += links.size;
    return Math.floor(count / 2);
  }
}
