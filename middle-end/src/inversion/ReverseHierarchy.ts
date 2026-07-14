export interface HierarchyNode {
  id: string;
  level: number;
  children: string[];
  parent: string | null;
}

export type ReversedHierarchy = {
  root: string;
  depth: number;
  nodes: HierarchyNode[];
};

export interface ReverseConfig {
  maxDepth: number;
  branchingFactor: number;
  preserveLeafCount: boolean;
}

export class ReverseHierarchy {
  private _config: ReverseConfig;
  private _nodes: HierarchyNode[] = [];
  private _reversed: ReversedHierarchy | null = null;
  private _state: Record<string, unknown> = {};
  private _centralityScores: Map<string, number> = new Map();
  private _adjacencyMatrix: Map<string, Set<string>> = new Map();

  constructor(config: ReverseConfig) {
    this._config = config;
  }

  get nodeCount(): number {
    return this._nodes.length;
  }

  get maxDepth(): number {
    return this._nodes.reduce((max, n) => (n.level > max ? n.level : max), 0);
  }

  private _buildAdjacency(): void {
    this._adjacencyMatrix.clear();
    for (const node of this._nodes) {
      const neighbors = new Set<string>(node.children);
      if (node.parent) neighbors.add(node.parent);
      this._adjacencyMatrix.set(node.id, neighbors);
    }
  }

  private _computeBetweennessCentrality(): void {
    this._centralityScores.clear();
    for (const source of this._nodes) {
      const dist: Record<string, number> = {};
      const paths: Record<string, number> = {};
      const queue: string[] = [];
      for (const n of this._nodes) {
        dist[n.id] = Infinity;
        paths[n.id] = 0;
      }
      dist[source.id] = 0;
      paths[source.id] = 1;
      queue.push(source.id);
      let head = 0;
      while (head < queue.length) {
        const current = queue[head++];
        const neighbors = this._adjacencyMatrix.get(current) || new Set();
        for (const neighbor of neighbors) {
          if (dist[neighbor] === Infinity) {
            dist[neighbor] = dist[current] + 1;
            queue.push(neighbor);
          }
          if (dist[neighbor] === dist[current] + 1) {
            paths[neighbor] += paths[current];
          }
        }
      }
      const dependency: Record<string, number> = {};
      for (const n of this._nodes) {
        dependency[n.id] = 0;
      }
      while (queue.length > 0) {
        const w = queue.pop()!;
        const neighbors = this._adjacencyMatrix.get(w) || new Set();
        for (const v of neighbors) {
          if (dist[v] === dist[w] - 1) {
            dependency[v] += (paths[v] / paths[w]) * (1 + dependency[w]);
          }
        }
        if (w !== source.id) {
          this._centralityScores.set(w, (this._centralityScores.get(w) || 0) + dependency[w]);
        }
      }
    }
  }

  addNode(id: string, level: number, parent: string | null): HierarchyNode {
    const node: HierarchyNode = { id, level, children: [], parent };
    this._nodes.push(node);
    if (parent) {
      const p = this._nodes.find((n) => n.id === parent);
      if (p) p.children.push(id);
    }
    if (this._nodes.length > 50) {
      this._nodes.shift();
    }
    this._buildAdjacency();
    this._computeBetweennessCentrality();
    return node;
  }

  reverse(): ReversedHierarchy {
    const leaves = this._nodes.filter((n) => n.children.length === 0);
    const newRoot = leaves.length > 0 ? leaves[0].id : this._nodes[0]?.id || 'root';
    const reversedNodes: HierarchyNode[] = [];
    for (const n of this._nodes) {
      reversedNodes.push({
        id: n.id,
        level: this._config.maxDepth - n.level,
        children: n.parent ? [n.parent] : [],
        parent: n.children.length > 0 ? n.children[0] : null,
      });
    }
    const depth = reversedNodes.reduce((max, n) => (n.level > max ? n.level : max), 0);
    this._reversed = { root: newRoot, depth, nodes: reversedNodes };
    this._state.reversedAt = Date.now();
    return this._reversed;
  }

  findRoot(): HierarchyNode | null {
    return this._nodes.find((n) => n.parent === null) ?? null;
  }

  findLeaves(): HierarchyNode[] {
    return this._nodes.filter((n) => n.children.length === 0);
  }

  mostCentral(): string | null {
    let best = '';
    let bestScore = -1;
    for (const [id, score] of this._centralityScores) {
      if (score > bestScore) {
        bestScore = score;
        best = id;
      }
    }
    return best || null;
  }

  isBalanced(): boolean {
    const root = this.findRoot();
    if (!root) return true;
    const depths: number[] = [];
    const dfs = (node: HierarchyNode, depth: number) => {
      if (node.children.length === 0) {
        depths.push(depth);
      }
      for (const childId of node.children) {
        const child = this._nodes.find((n) => n.id === childId);
        if (child) dfs(child, depth + 1);
      }
    };
    dfs(root, 0);
    const min = Math.min(...depths);
    const max = Math.max(...depths);
    return max - min <= 1;
  }

  reset(): void {
    this._nodes = [];
    this._reversed = null;
    this._centralityScores.clear();
    this._adjacencyMatrix.clear();
    this._state = {};
  }

  report(): Record<string, unknown> {
    return {
      nodes: this._nodes.length,
      maxDepth: this.maxDepth,
      reversed: this._reversed,
      state: this._state,
      mostCentral: this.mostCentral(),
      balanced: this.isBalanced(),
    };
  }
}
