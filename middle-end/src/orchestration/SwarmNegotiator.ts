export type NegotiationOffer = { providerId: string; price: number; latency: number; reliability: number; capacity: number };
export type NegotiationStrategy = 'greedy' | 'balanced' | 'conservative' | 'exploratory';
export type NegotiationResult = { providerId: string; accepted: boolean; finalPrice: number; finalLatency: number; trustScore: number; utilityScore: number };
export type Bid = { providerId: string; offer: NegotiationOffer; timestamp: number; round: number };
export type ProviderProfile = { offer: NegotiationOffer; trustScore: number; history: Bid[]; concessionRate: number; stubbornness: number; competitiveness: number };

export class SwarmNegotiator {
  private _providers: Map<string, ProviderProfile> = new Map();
  private _strategy: NegotiationStrategy = 'balanced';
  private _maxRounds = 5;
  private _threshold = 0.02;
  private _globalTrust = 0.5;

  get providers(): Map<string, ProviderProfile> { return new Map(this._providers); }
  get strategy(): NegotiationStrategy { return this._strategy; }
  get globalTrust(): number { return this._globalTrust; }

  registerProvider(id: string, offer: NegotiationOffer): void {
    this._providers.set(id, { 
      offer, 
      trustScore: 0.5, 
      history: [], 
      concessionRate: 0.1 + Math.random() * 0.1, 
      stubbornness: 0.3 + Math.random() * 0.4,
      competitiveness: 0.3 + Math.random() * 0.4,
    });
  }

  setStrategy(strategy: NegotiationStrategy): void { this._strategy = strategy; }
  setMaxRounds(rounds: number): void { this._maxRounds = Math.max(1, rounds); }

  private _updateGlobalTrust(): void {
    const providers = Array.from(this._providers.values());
    if (!providers.length) return;
    this._globalTrust = providers.reduce((s, p) => s + p.trustScore, 0) / providers.length;
  }

  negotiate(req: { maxPrice: number; maxLatency: number; minReliability: number; urgency: number }): Promise<NegotiationResult[]> {
    return Promise.all(Array.from(this._providers.entries()).map(([id, profile]) => this._bargain(id, profile, req)));
  }

  private async _bargain(id: string, profile: ProviderProfile, req: { maxPrice: number; maxLatency: number; minReliability: number; urgency: number }): Promise<NegotiationResult> {
    let offer = { ...profile.offer }, prev = { ...offer }, round = 0;
    while (round < this._maxRounds) {
      await new Promise(r => setTimeout(r, 30 + Math.random() * 80));
      
      const myConcess = this._concession(this._strategy, round, this._maxRounds);
      const marketPressure = this._globalTrust * profile.competitiveness;
      const providerConcess = profile.concessionRate * (1 - round / this._maxRounds + 1 - profile.trustScore * 0.5 + marketPressure) * 0.3;
      
      const priceReduction = (req.maxPrice - offer.price) * myConcess * (1 - profile.stubbornness);
      const latencyReduction = (req.maxLatency - offer.latency) * myConcess * 0.5 * (1 - profile.stubbornness);
      
      offer.price = Math.max(offer.price * 0.9, offer.price + priceReduction);
      offer.latency = Math.max(offer.latency * 0.95, offer.latency + latencyReduction);
      offer.reliability = Math.min(1, offer.reliability + providerConcess * 0.15);

      const convergence = ((Math.abs(offer.price - prev.price) / Math.max(prev.price, 1)) + (Math.abs(offer.latency - prev.latency) / Math.max(prev.latency, 1))) / 2;
      if (convergence < this._threshold) break;
      
      prev = { ...offer };
      profile.history.push({ providerId: id, offer: { ...offer }, timestamp: Date.now(), round: ++round });
    }

    const accepted = offer.price <= req.maxPrice && offer.latency <= req.maxLatency && offer.reliability >= req.minReliability;
    const utility = this._utility(offer, req);
    profile.trustScore = Math.max(0.1, Math.min(1, profile.trustScore + (accepted ? 0.03 + utility * 0.05 : -0.08)));
    profile.offer = { ...offer };
    this._updateGlobalTrust();
    
    return { providerId: id, accepted, finalPrice: offer.price, finalLatency: offer.latency, trustScore: profile.trustScore, utilityScore: utility };
  }

  private _concession(strategy: NegotiationStrategy, round: number, maxRounds: number): number {
    const params: Record<NegotiationStrategy, { initial: number; decay: number }> = { 
      greedy: { initial: 0.4, decay: 0.3 }, 
      balanced: { initial: 0.2, decay: 0.5 }, 
      conservative: { initial: 0.1, decay: 0.7 }, 
      exploratory: { initial: 0.25, decay: 0.4 } 
    };
    const { initial, decay } = params[strategy];
    return initial * Math.pow(decay, round / maxRounds);
  }

  private _utility(offer: NegotiationOffer, req: { maxPrice: number; maxLatency: number; minReliability: number; urgency: number }): number {
    const pw = Math.max(0, 1 - offer.price / req.maxPrice);
    const lw = Math.max(0, 1 - offer.latency / req.maxLatency);
    const rw = Math.max(0, (offer.reliability - req.minReliability) / (1 - req.minReliability));
    return (pw * 0.35 + lw * 0.35 + rw * 0.3) * (1 + req.urgency * 0.2);
  }

  selectBest(results: NegotiationResult[], req: { urgency: number }): NegotiationResult | null {
    const accepted = results.filter(r => r.accepted);
    if (!accepted.length) return null;
    return accepted.reduce((best, curr) => this._selectionScore(best, req) > this._selectionScore(curr, req) ? best : curr);
  }

  private _selectionScore(result: NegotiationResult, req: { urgency: number }): number {
    const weights: Record<NegotiationStrategy, { price: number; latency: number; trust: number }> = { 
      greedy: { price: 0.5, latency: 0.25, trust: 0.25 }, 
      balanced: { price: 0.33, latency: 0.33, trust: 0.34 }, 
      conservative: { price: 0.2, latency: 0.2, trust: 0.6 }, 
      exploratory: { price: 0.3, latency: 0.4, trust: 0.3 } 
    };
    const w = weights[this._strategy];
    return (1 - result.finalPrice / 100) * w.price + (1 - result.finalLatency / 1000) * w.latency + result.trustScore * w.trust + result.utilityScore * req.urgency * 0.1;
  }

  getTrustScore(id: string): number { return this._providers.get(id)?.trustScore ?? 0; }
  getHistory(id: string): Bid[] { return this._providers.get(id)?.history ?? []; }
  removeProvider(id: string): void { this._providers.delete(id); this._updateGlobalTrust(); }
  resetTrust(): void { this._providers.forEach(p => { p.trustScore = 0.5; p.history = []; }); this._updateGlobalTrust(); }

  equilibrium(): number {
    const providers = Array.from(this._providers.values());
    if (!providers.length) return 0;
    const avgPrice = providers.reduce((s, p) => s + p.offer.price, 0) / providers.length;
    const avgLatency = providers.reduce((s, p) => s + p.offer.latency, 0) / providers.length;
    const avgTrust = providers.reduce((s, p) => s + p.trustScore, 0) / providers.length;
    return (1 - avgPrice / 100) * 0.4 + (1 - avgLatency / 1000) * 0.3 + avgTrust * 0.3;
  }

  predictMarketTrend(lookaheadRounds: number): { price: number; latency: number; reliability: number } {
    const providers = Array.from(this._providers.values());
    if (!providers.length) return { price: 0, latency: 0, reliability: 0 };
    
    const trends = providers.map(p => {
      const history = p.history.slice(-3);
      if (history.length < 2) return p.offer;
      
      const priceTrend = (history[history.length-1].offer.price - history[0].offer.price) / history.length;
      const latencyTrend = (history[history.length-1].offer.latency - history[0].offer.latency) / history.length;
      const reliabilityTrend = (history[history.length-1].offer.reliability - history[0].offer.reliability) / history.length;
      
      return {
        price: p.offer.price + priceTrend * lookaheadRounds,
        latency: p.offer.latency + latencyTrend * lookaheadRounds,
        reliability: Math.min(1, Math.max(0, p.offer.reliability + reliabilityTrend * lookaheadRounds)),
      };
    });
    
    return {
      price: trends.reduce((s, t) => s + t.price, 0) / trends.length,
      latency: trends.reduce((s, t) => s + t.latency, 0) / trends.length,
      reliability: trends.reduce((s, t) => s + t.reliability, 0) / trends.length,
    };
  }
}