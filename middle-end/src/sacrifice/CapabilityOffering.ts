/**
 * 能力献祭模块：通过主动删除某些功能模块来换取更高级能力的觉醒，
 * 删除越核心的功能，获得的回报能力越强大。
 */

export interface CapabilityOffering {
  id: string;
  sacrificedCapability: string;
  gainedCapability: string;
  sacrificeValue: number;
  gainMultiplier: number;
}

export interface OfferingResult {
  offeringId: string;
  accepted: boolean;
  netGain: number;
  completedAt: number;
}

export class CapabilityOffering {
  private _offerings: Map<string, CapabilityOffering> = new Map();
  private _results: OfferingResult[] = [];
  private _sacrificed: Set<string> = new Set();
  private _minValue = 0.3;
  private _maxMultiplier = 5.0;

  propose(offering: CapabilityOffering): void {
    offering.gainMultiplier = Math.min(offering.gainMultiplier, this._maxMultiplier);
    this._offerings.set(offering.id, offering);
  }

  evaluate(offeringId: string): OfferingResult {
    const offering = this._offerings.get(offeringId);
    if (!offering) {
      return { offeringId, accepted: false, netGain: 0, completedAt: Date.now() };
    }
    const accepted = offering.sacrificeValue >= this._minValue && !this._sacrificed.has(offering.sacrificedCapability);
    const netGain = accepted ? offering.sacrificeValue * offering.gainMultiplier - offering.sacrificeValue : 0;
    const result: OfferingResult = {
      offeringId,
      accepted,
      netGain,
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

  findSacrificesForGain(targetGain: number): CapabilityOffering[] {
    return Array.from(this._offerings.values())
      .filter(o => o.sacrificeValue * o.gainMultiplier >= targetGain && !this._sacrificed.has(o.sacrificedCapability))
      .sort((a, b) => a.sacrificeValue - b.sacrificeValue);
  }

  calculateOptimal(): CapabilityOffering | null {
    const available = Array.from(this._offerings.values()).filter(
      o => !this._sacrificed.has(o.sacrificedCapability)
    );
    if (available.length === 0) return null;
    return available.reduce((best, o) => {
      const scoreO = o.sacrificeValue * o.gainMultiplier - o.sacrificeValue;
      const scoreBest = best.sacrificeValue * best.gainMultiplier - best.sacrificeValue;
      return scoreO > scoreBest ? o : best;
    });
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

  get offeringCount(): number {
    return this._offerings.size;
  }

  get totalNetGain(): number {
    return this._results.filter(r => r.accepted).reduce((sum, r) => sum + r.netGain, 0);
  }
}
