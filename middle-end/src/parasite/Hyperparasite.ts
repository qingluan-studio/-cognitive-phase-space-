export interface HyperparasiteData {
  readonly hyperparasiteId: string;
  primaryParasiteId: string;
  tier: number;
  drainEfficiency: number;
  nestingDepth: number;
}

export interface ParasiteChainNode {
  id: string;
  tier: number;
  resourceHeld: number;
  parent: string | null;
  adjacency: string[];
}

export class Hyperparasite {
  private _data: HyperparasiteData;
  private _chain: Map<string, ParasiteChainNode> = new Map();
  private _extractedTotal: number = 0;
  private _tierBonus: number = 0;
  private _collapseRisk: number = 0;
  private _adjacencyMatrix: number[][] = [];
  private _topologicalOrder: string[] = [];

  constructor(data: HyperparasiteData) {
    this._data = { ...data };
    this._chain.set(data.primaryParasiteId, {
      id: data.primaryParasiteId,
      tier: 1,
      resourceHeld: 0,
      parent: null,
      adjacency: [],
    });
    this._rebuildAdjacency();
  }

  get hyperparasiteId(): string {
    return this._data.hyperparasiteId;
  }

  get tier(): number {
    return this._data.tier;
  }

  get nestingDepth(): number {
    return this._data.nestingDepth;
  }

  get chainSize(): number {
    return this._chain.size;
  }

  get collapseRisk(): number {
    return this._collapseRisk;
  }

  private _rebuildAdjacency(): void {
    const nodes = Array.from(this._chain.keys());
    const n = nodes.length;
    this._adjacencyMatrix = Array.from({ length: n }, () => Array(n).fill(0));
    const indexMap = new Map(nodes.map((id, i) => [id, i]));
    for (const node of this._chain.values()) {
      const i = indexMap.get(node.id)!;
      for (const peer of node.adjacency) {
        const j = indexMap.get(peer);
        if (j !== undefined) {
          this._adjacencyMatrix[i][j] = 1;
          this._adjacencyMatrix[j][i] = 1;
        }
      }
      if (node.parent) {
        const j = indexMap.get(node.parent);
        if (j !== undefined) {
          this._adjacencyMatrix[i][j] = 1;
        }
      }
    }
    this._topologicalSort(nodes, indexMap);
  }

  private _topologicalSort(nodes: string[], indexMap: Map<string, number>): void {
    const visited = new Set<string>();
    const order: string[] = [];
    const visit = (id: string): void => {
      if (visited.has(id)) return;
      visited.add(id);
      const node = this._chain.get(id);
      if (node) {
        for (const peer of node.adjacency) if (!visited.has(peer)) visit(peer);
        if (node.parent && !visited.has(node.parent)) visit(node.parent);
      }
      order.push(id);
    };
    for (const id of nodes) if (!visited.has(id)) visit(id);
    this._topologicalOrder = order;
  }

  public attachToParasite(parasiteId: string, parentTier: number): boolean {
    if (this._chain.size >= 5) {
      return false;
    }
    const parentNode = Array.from(this._chain.values()).find((n) => n.tier === parentTier);
    if (!parentNode) {
      return false;
    }
    const newTier = parentTier + 1;
    this._chain.set(parasiteId, {
      id: parasiteId,
      tier: newTier,
      resourceHeld: 0,
      parent: parentNode.id,
      adjacency: [],
    });
    parentNode.adjacency.push(parasiteId);
    this._data.nestingDepth = Math.max(this._data.nestingDepth, newTier);
    this._tierBonus = newTier * 0.1;
    this._rebuildAdjacency();
    return true;
  }

  public siphonFromTier(tier: number, amount: number): number {
    const node = Array.from(this._chain.values()).find((n) => n.tier === tier);
    if (!node) {
      return 0;
    }
    const available = node.resourceHeld;
    const extracted = Math.min(amount * this._data.drainEfficiency, available);
    node.resourceHeld -= extracted;
    this._extractedTotal += extracted * (1 + this._tierBonus);
    if (available < amount * 0.5) {
      this._collapseRisk = Math.min(1, this._collapseRisk + 0.1);
    }
    return extracted;
  }

  public feedChain(baseResource: number): void {
    this._chain.forEach((node) => {
      const allocation = baseResource / (node.tier + 1);
      node.resourceHeld += allocation;
    });
  }

  public stabilizeChain(): void {
    this._collapseRisk = Math.max(0, this._collapseRisk - 0.15);
    this._chain.forEach((node) => {
      node.resourceHeld *= 1.05;
    });
  }

  public detectCollapse(): boolean {
    const weakNodes = Array.from(this._chain.values()).filter((n) => n.resourceHeld < 1);
    if (weakNodes.length > this._chain.size * 0.4) {
      this._collapseRisk = Math.min(1, this._collapseRisk + 0.2);
      return true;
    }
    return false;
  }

  public pruneTier(tier: number): void {
    const toRemove = Array.from(this._chain.values()).filter((n) => n.tier >= tier);
    toRemove.forEach((node) => {
      this._chain.delete(node.id);
    });
    this._collapseRisk = Math.max(0, this._collapseRisk - 0.2);
    this._rebuildAdjacency();
  }

  public hyperparasiteReport(): Record<string, unknown> {
    const tierCounts: Record<number, number> = {};
    this._chain.forEach((n) => {
      tierCounts[n.tier] = (tierCounts[n.tier] ?? 0) + 1;
    });
    return {
      hyperparasiteId: this.hyperparasiteId,
      chainSize: this.chainSize,
      nestingDepth: this._data.nestingDepth,
      extractedTotal: this._extractedTotal.toFixed(2),
      tierBonus: this._tierBonus.toFixed(3),
      collapseRisk: this._collapseRisk.toFixed(3),
      tierDistribution: tierCounts,
      centrality: this.eigenvectorCentrality(),
    };
  }
}
