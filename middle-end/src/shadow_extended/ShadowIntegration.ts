export interface ShadowSelf {
  id: string;
  shadowValue: number;
  selfValue: number;
  reconciliation: number;
  entropy: number;
}

export interface IntegrationGraph {
  nodes: Map<string, ShadowSelf>;
  edges: Map<string, Map<string, number>>;
  coherence: number;
  psychologicalEntropy: number;
}

export class ShadowIntegration {
  private _nodes: Map<string, ShadowSelf> = new Map();
  private _edges: Map<string, Map<string, number>> = new Map();
  private _state: Record<string, unknown> = {};
  private _coherence: number = 0;
  private _psychologicalEntropy: number = 0;

  constructor() {}

  get nodeCount(): number {
    return this._nodes.size;
  }

  get coherence(): number {
    return this._coherence;
  }

  get psychologicalEntropy(): number {
    return this._psychologicalEntropy;
  }

  addNode(id: string, shadowValue: number, selfValue: number): void {
    const reconciliation = 1 - Math.abs(shadowValue - selfValue);
    const entropy = -shadowValue * Math.log2(shadowValue || 1) - selfValue * Math.log2(selfValue || 1);
    this._nodes.set(id, { id, shadowValue, selfValue, reconciliation, entropy });
    this._edges.set(id, new Map());
    this._updateMetrics();
  }

  connect(a: string, b: string, weight: number): void {
    if (!this._nodes.has(a) || !this._nodes.has(b)) return;
    this._edges.get(a)!.set(b, weight);
    this._edges.get(b)!.set(a, weight);
    this._updateMetrics();
  }

  private _updateMetrics(): void {
    const nodes = Array.from(this._nodes.values());
    if (nodes.length === 0) return;
    const avgReconciliation = nodes.reduce((s, n) => s + n.reconciliation, 0) / nodes.length;
    const variance = nodes.reduce((s, n) => s + Math.pow(n.reconciliation - avgReconciliation, 2), 0) / nodes.length;
    this._coherence = 1 / (1 + variance);
    const totalEntropy = nodes.reduce((s, n) => s + n.entropy, 0);
    this._psychologicalEntropy = -nodes.reduce((s, n) => {
      const p = n.entropy / (totalEntropy || 1);
      return p > 0 ? s + p * Math.log2(p) : s;
    }, 0);
  }

  reconcile(id: string, adjustment: number): void {
    const node = this._nodes.get(id);
    if (!node) return;
    node.shadowValue = Math.max(0, Math.min(1, node.shadowValue + adjustment));
    node.reconciliation = 1 - Math.abs(node.shadowValue - node.selfValue);
    node.entropy = -node.shadowValue * Math.log2(node.shadowValue || 1) - node.selfValue * Math.log2(node.selfValue || 1);
    this._updateMetrics();
  }

  reconciliationGraph(): IntegrationGraph {
    return {
      nodes: new Map(this._nodes),
      edges: new Map(this._edges),
      coherence: this._coherence,
      psychologicalEntropy: this._psychologicalEntropy,
    };
  }

  weakestLink(): { a: string; b: string; weight: number } | null {
    let weakest: { a: string; b: string; weight: number } | null = null;
    for (const [a, map] of this._edges) {
      for (const [b, weight] of map) {
        if (!weakest || weight < weakest.weight) {
          weakest = { a, b, weight };
        }
      }
    }
    return weakest;
  }

  strongestReconciliation(): ShadowSelf | null {
    if (this._nodes.size === 0) return null;
    return Array.from(this._nodes.values()).reduce((best, n) => (n.reconciliation > best.reconciliation ? n : best));
  }

  personalityCoherence(): number {
    return this._coherence;
  }

  shadowDominance(): number {
    if (this._nodes.size === 0) return 0;
    return Array.from(this._nodes.values()).reduce((s, n) => s + n.shadowValue, 0) / this._nodes.size;
  }

  selfDominance(): number {
    if (this._nodes.size === 0) return 0;
    return Array.from(this._nodes.values()).reduce((s, n) => s + n.selfValue, 0) / this._nodes.size;
  }

  report(): Record<string, unknown> {
    return {
      nodes: this._nodes.size,
      coherence: this._coherence,
      psychologicalEntropy: this._psychologicalEntropy,
      shadowDominance: this.shadowDominance(),
      selfDominance: this.selfDominance(),
      state: this._state,
    };
  }
}
