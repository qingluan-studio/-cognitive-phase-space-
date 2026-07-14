export interface ThoughtFragment {
  id: string;
  originModule: string;
  content: Record<string, unknown>;
  quality: number;
}

export interface HybridModule {
  id: string;
  fragments: string[];
  combined: Record<string, unknown>;
  viability: number;
  committed: boolean;
}

interface AnnealingState {
  fragmentOrder: string[];
  energy: number;
}

export class Splicer {
  private _fragments: Map<string, ThoughtFragment> = new Map();
  private _hybrids: HybridModule[] = [];
  private _viabilityThreshold: number = 0.6;
  private _coherenceMatrix: Map<string, Map<string, number>> = new Map();

  harvest(originModule: string, content: Record<string, unknown>, quality: number): ThoughtFragment {
    const fragment: ThoughtFragment = {
      id: `frag-${originModule}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      originModule,
      content,
      quality,
    };
    this._fragments.set(fragment.id, fragment);
    this._updateCoherence(fragment);
    return fragment;
  }

  splice(fragmentIds: string[]): HybridModule | null {
    const frags = fragmentIds.map(id => this._fragments.get(id)).filter((f): f is ThoughtFragment => !!f);
    if (frags.length < 2) return null;
    const optimizedOrder = this._simulatedAnnealing(fragmentIds);
    const combined = this._orderlySplice(optimizedOrder);
    const viability = this._computeViability(optimizedOrder, combined);
    const hybrid: HybridModule = {
      id: `hybrid-${Date.now()}`,
      fragments: optimizedOrder,
      combined,
      viability,
      committed: false,
    };
    this._hybrids.push(hybrid);
    return hybrid;
  }

  hybridize(idA: string, idB: string): HybridModule | null {
    const a = this._fragments.get(idA);
    const b = this._fragments.get(idB);
    if (!a || !b) return null;
    const keysA = Object.keys(a.content);
    const keysB = Object.keys(b.content);
    const combined: Record<string, unknown> = {};
    const allKeys = new Set([...keysA, ...keysB]);
    for (const key of allKeys) {
      const valA = a.content[key];
      const valB = b.content[key];
      if (typeof valA === 'number' && typeof valB === 'number') {
        const alpha = this._coherenceBetween(idA, idB);
        combined[key] = valA * alpha + valB * (1 - alpha);
      } else if (valA !== undefined && valB !== undefined) {
        combined[key] = Math.random() < 0.5 ? valA : valB;
      } else {
        combined[key] = valA ?? valB;
      }
    }
    const coherence = this._coherenceBetween(idA, idB);
    const hybrid: HybridModule = {
      id: `hyb-${Date.now()}`,
      fragments: [idA, idB],
      combined,
      viability: (a.quality + b.quality) / 2 * (0.5 + coherence * 0.5),
      committed: false,
    };
    this._hybrids.push(hybrid);
    return hybrid;
  }

  evaluate(hybridId: string, viability: number): void {
    const h = this._hybrids.find(x => x.id === hybridId);
    if (h) h.viability = viability;
  }

  commit(hybridId: string): boolean {
    const h = this._hybrids.find(x => x.id === hybridId);
    if (!h || h.committed) return false;
    if (h.viability < this._viabilityThreshold) return false;
    h.committed = true;
    return true;
  }

  getFragments(): ThoughtFragment[] {
    return [...this._fragments.values()];
  }

  get hybrids(): HybridModule[] {
    return [...this._hybrids];
  }

  get committedCount(): number {
    return this._hybrids.filter(h => h.committed).length;
  }

  get coherenceMatrix(): Map<string, Map<string, number>> {
    const copy = new Map<string, Map<string, number>>();
    for (const [k, v] of this._coherenceMatrix) {
      copy.set(k, new Map(v));
    }
    return copy;
  }

  setViabilityThreshold(threshold: number): void {
    this._viabilityThreshold = Math.max(0, Math.min(1, threshold));
  }

  private _updateCoherence(fragment: ThoughtFragment): void {
    for (const [id, existing] of this._fragments) {
      if (id === fragment.id) continue;
      const coherence = this._computeCoherence(fragment, existing);
      if (!this._coherenceMatrix.has(fragment.id)) {
        this._coherenceMatrix.set(fragment.id, new Map());
      }
      if (!this._coherenceMatrix.has(id)) {
        this._coherenceMatrix.set(id, new Map());
      }
      this._coherenceMatrix.get(fragment.id)!.set(id, coherence);
      this._coherenceMatrix.get(id)!.set(fragment.id, coherence);
    }
  }

  private _computeCoherence(a: ThoughtFragment, b: ThoughtFragment): number {
    const keysA = new Set(Object.keys(a.content));
    const keysB = new Set(Object.keys(b.content));
    const intersection = new Set([...keysA].filter(k => keysB.has(k)));
    const union = new Set([...keysA, ...keysB]);
    if (union.size === 0) return 0.3;
    const keyOverlap = intersection.size / union.size;
    let valueSimilarity = 0;
    let comparableCount = 0;
    for (const key of intersection) {
      const valA = a.content[key];
      const valB = b.content[key];
      if (typeof valA === 'number' && typeof valB === 'number') {
        const maxAbs = Math.max(Math.abs(valA), Math.abs(valB), 1);
        valueSimilarity += 1 - Math.abs(valA - valB) / maxAbs;
        comparableCount++;
      } else if (valA === valB) {
        valueSimilarity += 1;
        comparableCount++;
      } else {
        valueSimilarity += 0.2;
        comparableCount++;
      }
    }
    const avgValueSim = comparableCount > 0 ? valueSimilarity / comparableCount : 0.3;
    const moduleBonus = a.originModule === b.originModule ? 0.1 : 0;
    return Math.min(1, keyOverlap * 0.4 + avgValueSim * 0.5 + moduleBonus);
  }

  private _coherenceBetween(idA: string, idB: string): number {
    return this._coherenceMatrix.get(idA)?.get(idB) ?? 0.3;
  }

  private _simulatedAnnealing(fragmentIds: string[]): string[] {
    const n = fragmentIds.length;
    if (n <= 2) return [...fragmentIds];
    let current = [...fragmentIds].sort(() => Math.random() - 0.5);
    let currentEnergy = this._orderEnergy(current);
    let best = [...current];
    let bestEnergy = currentEnergy;
    let temperature = 1.0;
    const coolingRate = 0.95;
    const iterations = 50;
    for (let i = 0; i < iterations; i++) {
      const next = this._neighborOrder(current);
      const nextEnergy = this._orderEnergy(next);
      const delta = nextEnergy - currentEnergy;
      if (delta < 0 || Math.random() < Math.exp(-delta / Math.max(temperature, 1e-10))) {
        current = next;
        currentEnergy = nextEnergy;
        if (currentEnergy < bestEnergy) {
          best = [...current];
          bestEnergy = currentEnergy;
        }
      }
      temperature *= coolingRate;
    }
    return best;
  }

  private _neighborOrder(order: string[]): string[] {
    const result = [...order];
    const i = Math.floor(Math.random() * result.length);
    let j = Math.floor(Math.random() * result.length);
    while (j === i) j = Math.floor(Math.random() * result.length);
    [result[i], result[j]] = [result[j], result[i]];
    return result;
  }

  private _orderEnergy(order: string[]): number {
    let total = 0;
    for (let i = 0; i < order.length - 1; i++) {
      const coherence = this._coherenceBetween(order[i], order[i + 1]);
      total += 1 - coherence;
    }
    let qualityPenalty = 0;
    let cumulativeQuality = 0;
    for (let i = 0; i < order.length; i++) {
      const frag = this._fragments.get(order[i]);
      if (frag) {
        cumulativeQuality += frag.quality;
        const expectedPosition = (1 - frag.quality) * (order.length - 1);
        qualityPenalty += Math.abs(i - expectedPosition) / order.length;
      }
    }
    return total + qualityPenalty * 0.3;
  }

  private _orderlySplice(order: string[]): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    let weightSum = 0;
    const weights: number[] = [];
    for (let i = 0; i < order.length; i++) {
      const frag = this._fragments.get(order[i]);
      const quality = frag?.quality ?? 0.5;
      const positionBias = 1 - i / (order.length * 2);
      const weight = quality * positionBias;
      weights.push(weight);
      weightSum += weight;
    }
    for (let i = 0; i < order.length; i++) {
      const frag = this._fragments.get(order[i]);
      if (!frag) continue;
      const normalizedWeight = weights[i] / (weightSum || 1);
      for (const [key, value] of Object.entries(frag.content)) {
        if (typeof value === 'number') {
          const existing = result[key];
          if (typeof existing === 'number') {
            result[key] = existing + value * normalizedWeight;
          } else {
            result[key] = value * normalizedWeight;
          }
        } else {
          if (!(key in result)) {
            result[key] = value;
          }
        }
      }
    }
    return result;
  }

  private _computeViability(order: string[], combined: Record<string, unknown>): number {
    let qualitySum = 0;
    let coherenceSum = 0;
    for (const id of order) {
      const frag = this._fragments.get(id);
      if (frag) qualitySum += frag.quality;
    }
    const avgQuality = qualitySum / (order.length || 1);
    for (let i = 0; i < order.length - 1; i++) {
      coherenceSum += this._coherenceBetween(order[i], order[i + 1]);
    }
    const avgCoherence = order.length > 1 ? coherenceSum / (order.length - 1) : 0.5;
    const keyCount = Object.keys(combined).length;
    const complexityScore = Math.min(1, keyCount / 20);
    return avgQuality * 0.4 + avgCoherence * 0.4 + complexityScore * 0.2;
  }
}
