export interface EnzymeReaction {
  substrate: string;
  product: string;
  velocity: number;
  timestamp: number;
}

export interface EnzymeProfile {
  vmax: number;
  km: number;
  kcat: number;
  inhibitorConstant?: number;
}

export class EnzymaticLogic {
  private _reactions: EnzymeReaction[] = [];
  private _profiles: Map<string, EnzymeProfile> = new Map();
  private _inhibitors: Map<string, number> = new Map();
  private _state: Record<string, unknown> = {};
  private _lineweaverBurkData: { x: number; y: number }[] = [];
  private _michaelisMentenCurve: { substrate: number; velocity: number }[] = [];
  private _catalyticEfficiency: number = 0;

  registerEnzyme(name: string, profile: EnzymeProfile): void {
    this._profiles.set(name, { ...profile });
    if (profile.km > 0 && profile.kcat > 0) {
      this._catalyticEfficiency = profile.kcat / profile.km;
    }
    this._state[`registered_${name}`] = Date.now();
  }

  get enzymeCount(): number {
    return this._profiles.size;
  }

  get catalyticEfficiency(): number {
    return this._catalyticEfficiency;
  }

  computeVelocity(enzymeName: string, substrateConcentration: number): number {
    const profile = this._profiles.get(enzymeName);
    if (!profile) return 0;
    let vmax = profile.vmax;
    let km = profile.km;
    const inhibitor = this._inhibitors.get(enzymeName);
    if (inhibitor !== undefined && profile.inhibitorConstant !== undefined && profile.inhibitorConstant > 0) {
      const alpha = 1 + inhibitor / profile.inhibitorConstant;
      km = km * alpha;
    }
    const velocity = (vmax * substrateConcentration) / (km + substrateConcentration);
    const reaction: EnzymeReaction = {
      substrate: enzymeName,
      product: `${enzymeName}-product`,
      velocity,
      timestamp: Date.now(),
    };
    this._reactions.push(reaction);
    if (this._reactions.length > 200) this._reactions.shift();
    this._michaelisMentenCurve.push({ substrate: substrateConcentration, velocity });
    if (this._michaelisMentenCurve.length > 100) this._michaelisMentenCurve.shift();
    if (velocity > 0 && substrateConcentration > 0) {
      this._lineweaverBurkData.push({ x: 1 / substrateConcentration, y: 1 / velocity });
      if (this._lineweaverBurkData.length > 100) this._lineweaverBurkData.shift();
    }
    return velocity;
  }

  addInhibitor(enzymeName: string, concentration: number): void {
    this._inhibitors.set(enzymeName, concentration);
  }

  removeInhibitor(enzymeName: string): void {
    this._inhibitors.delete(enzymeName);
  }

  computeLineweaverBurkSlope(): number {
    if (this._lineweaverBurkData.length < 2) return 0;
    const n = this._lineweaverBurkData.length;
    const sumX = this._lineweaverBurkData.reduce((s, p) => s + p.x, 0);
    const sumY = this._lineweaverBurkData.reduce((s, p) => s + p.y, 0);
    const sumXY = this._lineweaverBurkData.reduce((s, p) => s + p.x * p.y, 0);
    const sumX2 = this._lineweaverBurkData.reduce((s, p) => s + p.x * p.x, 0);
    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  estimateKmFromData(): number {
    const slope = this.computeLineweaverBurkSlope();
    const intercept = this._estimateIntercept();
    if (slope === 0) return 0;
    return slope / intercept;
  }

  private _estimateIntercept(): number {
    if (this._lineweaverBurkData.length === 0) return 0;
    const avgX = this._lineweaverBurkData.reduce((s, p) => s + p.x, 0) / this._lineweaverBurkData.length;
    const avgY = this._lineweaverBurkData.reduce((s, p) => s + p.y, 0) / this._lineweaverBurkData.length;
    const slope = this.computeLineweaverBurkSlope();
    return avgY - slope * avgX;
  }

  averageVelocity(): number {
    if (this._reactions.length === 0) return 0;
    return this._reactions.reduce((acc, r) => acc + r.velocity, 0) / this._reactions.length;
  }

  maxVelocityObserved(): number {
    if (this._reactions.length === 0) return 0;
    return Math.max(...this._reactions.map(r => r.velocity));
  }

  getReactions(limit: number = 50): EnzymeReaction[] {
    return this._reactions.slice(-limit);
  }

  getReactionHistory(): EnzymeReaction[] {
    return [...this._reactions];
  }

  getProfile(name: string): EnzymeProfile | null {
    return this._profiles.get(name) ?? null;
  }

  computeTurnoverNumber(enzymeName: string): number {
    const profile = this._profiles.get(enzymeName);
    return profile?.kcat ?? 0;
  }

  computeSpecificityConstant(enzymeName: string): number {
    const profile = this._profiles.get(enzymeName);
    if (!profile || profile.km === 0) return 0;
    return (profile.kcat ?? 0) / profile.km;
  }

  saturationFraction(enzymeName: string, substrateConcentration: number): number {
    const profile = this._profiles.get(enzymeName);
    if (!profile) return 0;
    return substrateConcentration / (profile.km + substrateConcentration);
  }

  clearReactions(): void {
    this._reactions = [];
    this._lineweaverBurkData = [];
    this._michaelisMentenCurve = [];
  }

  enzymaticReport(): Record<string, unknown> {
    return {
      enzymeCount: this._profiles.size,
      reactionCount: this._reactions.length,
      averageVelocity: this.averageVelocity().toFixed(4),
      maxVelocityObserved: this.maxVelocityObserved().toFixed(4),
      catalyticEfficiency: this._catalyticEfficiency.toFixed(4),
      lineweaverBurkSlope: this.computeLineweaverBurkSlope().toFixed(4),
      estimatedKm: this.estimateKmFromData().toFixed(4),
      state: this._state,
    };
  }
}
