export interface LineageNode {
  id: string;
  parentId: string | null;
  generation: number;
  mutationType: string;
  bornAt: number;
}

export interface LineageQueryResult {
  ancestors: string[];
  descendants: string[];
  siblings: string[];
}

export class LineageTrail {
  private _nodes: Map<string, LineageNode> = new Map();
  private _childrenIndex: Map<string, Set<string>> = new Map();
  private _maxGenerations = 100;
  private _adjacencyMatrix: Map<string, Map<string, number>> = new Map();
  private _centralityScores: Map<string, number> = new Map();

  registerNode(node: LineageNode): void {
    this._nodes.set(node.id, node);
    if (node.parentId) {
      if (!this._childrenIndex.has(node.parentId)) {
        this._childrenIndex.set(node.parentId, new Set());
      }
      this._childrenIndex.get(node.parentId)!.add(node.id);
    }
    this._buildAdjacency();
  }

  query(nodeId: string): LineageQueryResult | null {
    const node = this._nodes.get(nodeId);
    if (!node) return null;
    const ancestors: string[] = [];
    let current = node;
    while (current.parentId && this._nodes.has(current.parentId)) {
      ancestors.push(current.parentId);
      current = this._nodes.get(current.parentId)!;
      if (ancestors.length > this._maxGenerations) break;
    }
    const descendants = this._collectDescendants(nodeId);
    const siblings = node.parentId
      ? Array.from(this._childrenIndex.get(node.parentId) ?? []).filter(id => id !== nodeId)
      : [];
    return { ancestors, descendants, siblings };
  }

  private _collectDescendants(nodeId: string): string[] {
    const result: string[] = [];
    const queue: string[] = [nodeId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const children = this._childrenIndex.get(current);
      if (children) {
        for (const child of children) {
          result.push(child);
          queue.push(child);
        }
      }
    }
    return result;
  }

  computeDistance(fromId: string, toId: string): number {
    const from = this._nodes.get(fromId);
    if (!from) return -1;
    if (fromId === toId) return 0;
    const descendants = this._collectDescendants(fromId);
    if (descendants.includes(toId)) {
      const target = this._nodes.get(toId);
      return target ? target.generation - from.generation : -1;
    }
    return this._shortestPath(fromId, toId);
  }

  computeBetweennessCentrality(nodeId: string): number {
    if (this._centralityScores.has(nodeId)) return this._centralityScores.get(nodeId)!;
    const allNodes = Array.from(this._nodes.keys());
    let betweenness = 0;
    for (let s = 0; s < allNodes.length; s++) {
      for (let t = s + 1; t < allNodes.length; t++) {
        const paths = this._allShortestPaths(allNodes[s], allNodes[t]);
        const total = paths.length;
        const through = paths.filter(p => p.includes(nodeId)).length;
        if (total > 0) betweenness += through / total;
      }
    }
    const score = betweenness / (allNodes.length * (allNodes.length - 1) / 2);
    this._centralityScores.set(nodeId, score);
    return score;
  }

  getNode(id: string): LineageNode | null {
    return this._nodes.get(id) ?? null;
  }

  getAllNodes(): LineageNode[] {
    return Array.from(this._nodes.values());
  }

  getRoots(): LineageNode[] {
    return Array.from(this._nodes.values()).filter(n => n.parentId === null);
  }

  get nodeCount(): number {
    return this._nodes.size;
  }

  private _buildAdjacency(): void {
    this._adjacencyMatrix.clear();
    for (const [id, node] of this._nodes) {
      this._adjacencyMatrix.set(id, new Map());
      if (node.parentId) {
        this._adjacencyMatrix.get(id)!.set(node.parentId, 1);
      }
      const children = this._childrenIndex.get(id);
      if (children) {
        for (const child of children) {
          this._adjacencyMatrix.get(id)!.set(child, 1);
        }
      }
    }
  }

  private _shortestPath(fromId: string, toId: string): number {
    const dist = new Map<string, number>();
    const queue: string[] = [fromId];
    dist.set(fromId, 0);
    while (queue.length > 0) {
      const curr = queue.shift()!;
      const d = dist.get(curr)!;
      const neighbors = this._adjacencyMatrix.get(curr);
      if (!neighbors) continue;
      for (const [neighbor] of neighbors) {
        if (!dist.has(neighbor)) {
          dist.set(neighbor, d + 1);
          queue.push(neighbor);
        }
        if (neighbor === toId) return dist.get(neighbor)!;
      }
    }
    return -1;
  }

  private _allShortestPaths(fromId: string, toId: string): string[][] {
    const results: string[][] = [];
    const queue: { node: string; path: string[] }[] = [{ node: fromId, path: [fromId] }];
    let minLen = Infinity;
    while (queue.length > 0) {
      const { node, path } = queue.shift()!;
      if (path.length > minLen) continue;
      if (node === toId) {
        if (path.length < minLen) {
          minLen = path.length;
          results.length = 0;
        }
        results.push(path);
        continue;
      }
      const neighbors = this._adjacencyMatrix.get(node);
      if (!neighbors) continue;
      for (const [neighbor] of neighbors) {
        if (!path.includes(neighbor)) {
          queue.push({ node: neighbor, path: [...path, neighbor] });
        }
      }
    }
    return results;
  }
}
