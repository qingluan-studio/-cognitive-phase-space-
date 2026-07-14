export interface DissonanceBelief {
  id: string;
  content: string;
  weight: number;
  conflicts: string[];
}

export type DissonanceScore = {
  raw: number;
  normalized: number;
  severity: 'low' | 'medium' | 'high';
};

export interface CognitiveConfig {
  resolutionDrive: number;
  tolerance: number;
  maxBeliefs: number;
}

export class CognitiveDissonance {
  private _config: CognitiveConfig;
  private _beliefs: DissonanceBelief[] = [];
  private _lastScore: number = 0;
  private _adjustments: Record<string, unknown> = {};
  private _conflictGraph: Map<string, Set<string>> = new Map();
  private _pageRank: Map<string, number> = new Map();
  private _entropyOfBeliefs: number = 0;

  constructor(config: CognitiveConfig) {
    this._config = config;
  }

  get beliefCount(): number {
    return this._beliefs.length;
  }

  get lastScore(): number {
    return this._lastScore;
  }

  get beliefEntropy(): number {
    return this._entropyOfBeliefs;
  }

  private _buildConflictGraph(): void {
    this._conflictGraph.clear();
    for (const b of this._beliefs) {
      this._conflictGraph.set(b.id, new Set(b.conflicts));
    }
  }

  private _computePageRank(iterations: number = 20): void {
    const n = this._beliefs.length;
    if (n === 0) return;
    const damping = 0.85;
    const ranks = new Map<string, number>();
    for (const b of this._beliefs) {
      ranks.set(b.id, 1 / n);
    }
    for (let iter = 0; iter < iterations; iter++) {
      const newRanks = new Map<string, number>();
      for (const b of this._beliefs) {
        let sum = 0;
        for (const other of this._beliefs) {
          if (other.conflicts.includes(b.id)) {
            const outDegree = other.conflicts.length;
            sum += (ranks.get(other.id) || 0) / (outDegree || 1);
          }
        }
        newRanks.set(b.id, (1 - damping) / n + damping * sum);
      }
      ranks.clear();
      for (const [k, v] of newRanks) {
        ranks.set(k, v);
      }
    }
    this._pageRank = ranks;
  }

  private _computeBeliefEntropy(): void {
    const totalWeight = this._beliefs.reduce((s, b) => s + b.weight, 0);
    if (totalWeight === 0) {
      this._entropyOfBeliefs = 0;
      return;
    }
    let entropy = 0;
    for (const b of this._beliefs) {
      const p = b.weight / totalWeight;
      if (p > 0) {
        entropy -= p * Math.log2(p);
      }
    }
    this._entropyOfBeliefs = entropy;
  }

  addBelief(belief: DissonanceBelief): void {
    this._beliefs.push(belief);
    if (this._beliefs.length > this._config.maxBeliefs) {
      this._beliefs.shift();
    }
    this._buildConflictGraph();
    this._computePageRank();
    this._computeBeliefEntropy();
  }

  computeScore(): DissonanceScore {
    let raw = 0;
    for (const b of this._beliefs) {
      for (const c of b.conflicts) {
        const target = this._beliefs.find((x) => x.id === c);
        if (target) {
          const prB = this._pageRank.get(b.id) || 1 / this._beliefs.length;
          const prT = this._pageRank.get(target.id) || 1 / this._beliefs.length;
          raw += b.weight * target.weight * (prB + prT);
        }
      }
    }
    this._lastScore = raw;
    const normalized = this._beliefs.length > 0 ? raw / this._beliefs.length : 0;
    const severity = normalized > 0.6 ? 'high' : normalized > 0.3 ? 'medium' : 'low';
    return { raw, normalized, severity };
  }

  resolveConflict(idA: string, idB: string, winner: string): boolean {
    const a = this._beliefs.find((b) => b.id === idA);
    const b = this._beliefs.find((b) => b.id === idB);
    if (!a || !b) return false;
    if (winner === idA) {
      b.weight *= 1 - this._config.resolutionDrive;
      a.conflicts = a.conflicts.filter((c) => c !== idB);
    } else {
      a.weight *= 1 - this._config.resolutionDrive;
      b.conflicts = b.conflicts.filter((c) => c !== idA);
    }
    this._adjustments.lastResolution = { idA, idB, winner };
    this._buildConflictGraph();
    this._computePageRank();
    this._computeBeliefEntropy();
    return true;
  }

  isTolerable(): boolean {
    return this.computeScore().normalized <= this._config.tolerance;
  }

  strongestConflict(): { a: string; b: string; value: number } | null {
    let best: { a: string; b: string; value: number } | null = null;
    for (const b of this._beliefs) {
      for (const c of b.conflicts) {
        const target = this._beliefs.find((x) => x.id === c);
        if (target) {
          const v = b.weight * target.weight;
          if (!best || v > best.value) {
            best = { a: b.id, b: c, value: v };
          }
        }
      }
    }
    return best;
  }

  pruneWeak(threshold: number): number {
    const before = this._beliefs.length;
    this._beliefs = this._beliefs.filter((b) => b.weight >= threshold);
    this._buildConflictGraph();
    this._computePageRank();
    this._computeBeliefEntropy();
    return before - this._beliefs.length;
  }

  report(): Record<string, unknown> {
    return {
      beliefCount: this._beliefs.length,
      lastScore: this._lastScore,
      tolerable: this.isTolerable(),
      adjustments: this._adjustments,
      beliefEntropy: this._entropyOfBeliefs.toFixed(4),
      pageRankSum: Array.from(this._pageRank.values()).reduce((a, b) => a + b, 0).toFixed(4),
    };
  }
}
