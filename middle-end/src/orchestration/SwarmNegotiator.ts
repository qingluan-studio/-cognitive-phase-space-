export type NegotiationOffer = {
  providerId: string;
  price: number;
  latency: number;
  reliability: number;
  capacity: number;
};

export type NegotiationStrategy = 'greedy' | 'balanced' | 'conservative' | 'exploratory';

export type NegotiationResult = {
  providerId: string;
  accepted: boolean;
  finalPrice: number;
  finalLatency: number;
  trustScore: number;
};

export type Bid = {
  providerId: string;
  offer: NegotiationOffer;
  timestamp: number;
};

export class SwarmNegotiator {
  private providers: Map<string, NegotiationOffer> = new Map();
  private strategy: NegotiationStrategy = 'balanced';
  private trustScores: Map<string, number> = new Map();

  registerProvider(providerId: string, initialOffer: NegotiationOffer): void {
    this.providers.set(providerId, initialOffer);
    this.trustScores.set(providerId, 0.5);
  }

  setStrategy(strategy: NegotiationStrategy): void {
    this.strategy = strategy;
  }

  negotiate(requirements: {
    maxPrice: number;
    maxLatency: number;
    minReliability: number;
  }): Promise<NegotiationResult[]> {
    const promises = Array.from(this.providers.entries()).map(([id, offer]) =>
      this.bargain(id, offer, requirements)
    );
    return Promise.all(promises);
  }

  private async bargain(
    providerId: string,
    offer: NegotiationOffer,
    requirements: { maxPrice: number; maxLatency: number; minReliability: number }
  ): Promise<NegotiationResult> {
    const rounds = Math.floor(Math.random() * 3) + 1;
    let currentOffer = { ...offer };

    for (let i = 0; i < rounds; i++) {
      await new Promise(r => setTimeout(r, 50 + Math.random() * 100));
      
      const priceReduction = this.strategy === 'greedy' ? 0.2 :
                            this.strategy === 'conservative' ? 0.05 : 0.1;
      currentOffer.price *= (1 - priceReduction);
      currentOffer.latency *= (1 - priceReduction * 0.5);
    }

    const meetsRequirements = 
      currentOffer.price <= requirements.maxPrice &&
      currentOffer.latency <= requirements.maxLatency &&
      currentOffer.reliability >= requirements.minReliability;

    const trustScore = this.trustScores.get(providerId)!;
    if (meetsRequirements) {
      this.trustScores.set(providerId, Math.min(1, trustScore + 0.05));
    } else {
      this.trustScores.set(providerId, Math.max(0, trustScore - 0.1));
    }

    return {
      providerId,
      accepted: meetsRequirements,
      finalPrice: currentOffer.price,
      finalLatency: currentOffer.latency,
      trustScore: this.trustScores.get(providerId)!,
    };
  }

  selectBest(result: NegotiationResult[]): NegotiationResult | null {
    const accepted = result.filter(r => r.accepted);
    if (accepted.length === 0) return null;

    return accepted.reduce((best, current) => {
      const bestScore = this.calculateScore(best);
      const currentScore = this.calculateScore(current);
      return currentScore > bestScore ? current : best;
    });
  }

  private calculateScore(result: NegotiationResult): number {
    const priceWeight = this.strategy === 'greedy' ? 0.5 : 0.25;
    const latencyWeight = 0.3;
    const trustWeight = 0.25;
    
    return (1 - result.finalPrice / 100) * priceWeight +
           (1 - result.finalLatency / 1000) * latencyWeight +
           result.trustScore * trustWeight;
  }

  getTrustScore(providerId: string): number {
    return this.trustScores.get(providerId) ?? 0;
  }

  removeProvider(providerId: string): void {
    this.providers.delete(providerId);
    this.trustScores.delete(providerId);
  }
}