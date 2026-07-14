export interface LayerNode {
  id: string;
  depth: number;
  opacity: number;
  referenceCount: number;
}

export type LayerGraph = {
  nodes: number;
  edges: number;
  cycles: number;
};

export interface LayerConfig {
  maxDepth: number;
  opacityDecay: number;
  referenceBoost: number;
}

export class SimulacrumLayer {
  private _config: LayerConfig;
  private _nodes: LayerNode[] = [];
  private _graph: LayerGraph | null = null;
  private _state: Record<string, unknown> = {};
  private _adjacencyList: Map<string, Set<string>> = new Map();
  private _pagerank: Map<string, number> = new Map();
  private _topologicalOrder: string[] = [];

  constructor(config: LayerConfig) {
    this._config = config;
  }

  get nodeCount(): number {
    return this._nodes.length;
  }

  get deepestNode(): number {
    return this._nodes.reduce((max, n) => (n.depth > max ? n.depth : max), 0);
  }

  get graphCycles(): number {
    return this._graph ? this._graph.cycles : 0;
  }

  private _buildAdjacency(): void {
    this._adjacencyList.clear();
    for (const node of this._nodes) {
      if (!this._adjacencyList.has(node.id)) {
        this._adjacencyList.set(node.id, new Set());
      }
      for (const other of this._nodes) {
        if (other.depth === node.depth + 1) {
          this._adjacencyList.get(node.id)!.add(other.id);
        }
      }
    }
  }

  private _computePageRank(iterations: number = 15): void {
    const n = this._nodes.length;
    if (n === 0) return;
    const damping = 0.85;
    const ranks = new Map<string, number>();
    for (const node of this._nodes) {
      ranks.set(node.id, 1 / n);
    }
    for (let iter = 0; iter < iterations; iter++) {
      const newRanks = new Map<string, number>();
      for (const node of this._nodes) {
        let sum = 0;
        for (const other of this._nodes) {
          if (other.id === node.id) continue;
          const neighbors = this._adjacencyList.get(other.id) || new Set();
          if (neighbors.has(node.id)) {
            const outDegree = neighbors.size;
            sum += (ranks.get(other.id) || 0) / (outDegree || 1);
          }
        }
        newRanks.set(node.id, (1 - damping) / n + damping * sum);
      }
      ranks.clear();
      for (const [k, v] of newRanks) {
        ranks.set(k, v);
      }
    }
    this._pagerank = ranks;
  }

  private _detectCycles(): number {
    let cycles = 0;
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      recStack.add(nodeId);
      const neighbors = this._adjacencyList.get(nodeId) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) cycles++;
        } else if (recStack.has(neighbor)) {
          cycles++;
        }
      }
      recStack.delete(nodeId);
      return false;
    };
    for (const node of this._nodes) {
      if (!visited.has(node.id)) {
        dfs(node.id);
      }
    }
    return cycles;
  }

  private _topologicalSort(): void {
    this._topologicalOrder = [];
    const inDegree = new Map<string, number>();
    for (const node of this._nodes) {
      inDegree.set(node.id, 0);
    }
    for (const node of this._nodes) {
      const neighbors = this._adjacencyList.get(node.id) || new Set();
      for (const neighbor of neighbors) {
        inDegree.set(neighbor, (inDegree.get(neighbor) || 0) + 1);
      }
    }
    const queue: string[] = [];
    for (const [id, degree] of inDegree) {
      if (degree === 0) queue.push(id);
    }
    while (queue.length > 0) {
      const current = queue.shift()!;
      this._topologicalOrder.push(current);
      const neighbors = this._adjacencyList.get(current) || new Set();
      for (const neighbor of neighbors) {
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) queue.push(neighbor);
      }
    }
  }

  addNode(id: string, depth: number): LayerNode {
    const opacity = Math.exp(-depth * this._config.opacityDecay);
    const node: LayerNode = { id, depth, opacity, referenceCount: 0 };
    this._nodes.push(node);
    if (this._nodes.length > 30) this._nodes.shift();
    this._buildAdjacency();
    this._computePageRank();
    this._topologicalSort();
    const cycles = this._detectCycles();
    const edges = Array.from(this._adjacencyList.values()).reduce((acc, s) => acc + s.size, 0);
    this._graph = { nodes: this._nodes.length, edges, cycles };
    return node;
  }

  addReference(fromId: string, toId: string): boolean {
    const from = this._nodes.find((n) => n.id === fromId);
    const to = this._nodes.find((n) => n.id === toId);
    if (!from || !to) return false;
    to.referenceCount++;
    if (!this._adjacencyList.has(fromId)) {
      this._adjacencyList.set(fromId, new Set());
    }
    this._adjacencyList.get(fromId)!.add(toId);
    this._computePageRank();
    const cycles = this._detectCycles();
    const edges = Array.from(this._adjacencyList.values()).reduce((acc, s) => acc + s.size, 0);
    this._graph = { nodes: this._nodes.length, edges, cycles };
    return true;
  }

  computeGraph(): LayerGraph {
    return this._graph ?? { nodes: 0, edges: 0, cycles: 0 };
  }

  mostReferenced(): LayerNode | null {
    if (this._nodes.length === 0) return null;
    return this._nodes.reduce((best, n) => (n.referenceCount > best.referenceCount ? n : best));
  }

  isDAG(): boolean {
    return this._topologicalOrder.length === this._nodes.length;
  }

  averageOpacity(): number {
    if (this._nodes.length === 0) return 0;
    return this._nodes.reduce((acc, n) => acc + n.opacity, 0) / this._nodes.length;
  }

  pagerankOf(id: string): number {
    return this._pagerank.get(id) || 0;
  }

  reset(): void {
    this._nodes = [];
    this._graph = null;
    this._adjacencyList.clear();
    this._pagerank.clear();
    this._topologicalOrder = [];
    this._state = {};
  }

  report(): Record<string, unknown> {
    return {
      nodes: this._nodes.length,
      deepest: this.deepestNode,
      graph: this._graph,
      state: this._state,
      isDAG: this.isDAG(),
      averageOpacity: this.averageOpacity().toFixed(4),
      topologicalLength: this._topologicalOrder.length,
    };
  }
}
