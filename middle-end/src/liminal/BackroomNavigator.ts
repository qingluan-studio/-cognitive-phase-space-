export interface BackroomNode {
  id: string;
  coordinates: number[];
  defined: boolean;
  visited: boolean;
  metadata: Record<string, unknown>;
}

export interface Shortcut {
  path: string[];
  length: number;
  exitFound: boolean;
}

interface SearchNode {
  id: string;
  g: number;
  f: number;
  parent: string | null;
}

export class BackroomNavigator {
  private _nodes: Map<string, BackroomNode> = new Map();
  private _adjacency: Map<string, string[]> = new Map();
  private _currentId: string | null = null;
  private _shortcuts: Shortcut[] = [];
  private _potentialField: Map<string, number> = new Map();
  private _exitAttractors: string[] = [];

  enterBackroom(node: BackroomNode): string {
    this._nodes.set(node.id, node);
    if (!this._adjacency.has(node.id)) this._adjacency.set(node.id, []);
    this._currentId = node.id;
    if (node.defined) this._registerAttractor(node.id);
    return node.id;
  }

  getNeighbors(nodeId: string): BackroomNode[] {
    const ids = this._adjacency.get(nodeId) ?? [];
    return ids.map(id => this._nodes.get(id)).filter((n): n is BackroomNode => !!n);
  }

  mapUndefined(node: BackroomNode, neighbors: string[]): void {
    this._nodes.set(node.id, node);
    this._adjacency.set(node.id, neighbors);
    for (const nId of neighbors) {
      const list = this._adjacency.get(nId) ?? [];
      if (!list.includes(node.id)) list.push(node.id);
      this._adjacency.set(nId, list);
    }
    if (node.defined) this._registerAttractor(node.id);
    this._updatePotentialField();
  }

  findShortcut(startId: string): Shortcut {
    return this._aStarSearch(startId);
  }

  exit(shortcut: Shortcut): BackroomNode | null {
    if (!shortcut.exitFound) return null;
    const exitId = shortcut.path[shortcut.path.length - 1];
    const node = this._nodes.get(exitId);
    if (node) {
      node.visited = true;
      this._currentId = exitId;
    }
    return node ?? null;
  }

  get position(): string | null {
    return this._currentId;
  }

  getShortcuts(): Shortcut[] {
    return [...this._shortcuts];
  }

  get totalNodes(): number {
    return this._nodes.size;
  }

  get potentialField(): Map<string, number> {
    return new Map(this._potentialField);
  }

  private _registerAttractor(nodeId: string): void {
    if (!this._exitAttractors.includes(nodeId)) {
      this._exitAttractors.push(nodeId);
    }
  }

  private _updatePotentialField(): void {
    this._potentialField.clear();
    for (const [id] of this._nodes) {
      let minDist = Infinity;
      for (const attractor of this._exitAttractors) {
        const d = this._euclideanDistance(id, attractor);
        if (d < minDist) minDist = d;
      }
      this._potentialField.set(id, minDist);
    }
  }

  private _euclideanDistance(idA: string, idB: string): number {
    const a = this._nodes.get(idA);
    const b = this._nodes.get(idB);
    if (!a || !b) return Infinity;
    const dims = Math.min(a.coordinates.length, b.coordinates.length);
    let sum = 0;
    for (let i = 0; i < dims; i++) {
      const diff = a.coordinates[i] - b.coordinates[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  private _aStarSearch(startId: string): Shortcut {
    const openSet = new Map<string, SearchNode>();
    const closedSet = new Set<string>();
    const startNode: SearchNode = {
      id: startId,
      g: 0,
      f: this._heuristic(startId),
      parent: null,
    };
    openSet.set(startId, startNode);
    while (openSet.size > 0) {
      let currentId = '';
      let currentF = Infinity;
      for (const [id, node] of openSet) {
        if (node.f < currentF) {
          currentF = node.f;
          currentId = id;
        }
      }
      const current = openSet.get(currentId)!;
      const currentNodeData = this._nodes.get(currentId);
      if (currentNodeData?.defined) {
        const path = this._reconstructPath(current, openSet);
        const sc: Shortcut = { path, length: path.length - 1, exitFound: true };
        this._shortcuts.push(sc);
        return sc;
      }
      openSet.delete(currentId);
      closedSet.add(currentId);
      const neighbors = this._adjacency.get(currentId) ?? [];
      for (const neighborId of neighbors) {
        if (closedSet.has(neighborId)) continue;
        const tentativeG = current.g + this._edgeCost(currentId, neighborId);
        const existing = openSet.get(neighborId);
        if (!existing || tentativeG < existing.g) {
          const neighbor: SearchNode = {
            id: neighborId,
            g: tentativeG,
            f: tentativeG + this._heuristic(neighborId),
            parent: currentId,
          };
          openSet.set(neighborId, neighbor);
        }
      }
    }
    return { path: [startId], length: 0, exitFound: false };
  }

  private _heuristic(nodeId: string): number {
    let minDist = Infinity;
    for (const attractor of this._exitAttractors) {
      const d = this._euclideanDistance(nodeId, attractor);
      if (d < minDist) minDist = d;
    }
    const potential = this._potentialField.get(nodeId) ?? minDist;
    return (minDist + potential) / 2;
  }

  private _edgeCost(idA: string, idB: string): number {
    const base = this._euclideanDistance(idA, idB);
    const nodeA = this._nodes.get(idA);
    const nodeB = this._nodes.get(idB);
    const riskPenalty = (!nodeA?.defined || !nodeB?.defined) ? 1.5 : 1;
    return base * riskPenalty;
  }

  private _reconstructPath(end: SearchNode, openSet: Map<string, SearchNode>): string[] {
    const path: string[] = [];
    let current: SearchNode | null = end;
    const allNodes = new Map(openSet);
    for (const [id, node] of allNodes) {
      if (node.parent) {
        const parent = allNodes.get(node.parent) || null;
        if (!parent && node.parent) {
          allNodes.set(node.parent, { id: node.parent, g: 0, f: 0, parent: null });
        }
      }
    }
    const visited = new Set<string>();
    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      path.unshift(current.id);
      current = current.parent ? allNodes.get(current.parent) || null : null;
      if (!current) break;
    }
    if (path.length === 0) path.push(end.id);
    return path;
  }

  drift(): string | null {
    if (!this._currentId) return null;
    const neighbors = this._adjacency.get(this._currentId) ?? [];
    if (neighbors.length === 0) return null;
    let bestId = neighbors[0];
    let bestPotential = Infinity;
    for (const nId of neighbors) {
      const potential = this._potentialField.get(nId) ?? 0;
      const randomFactor = Math.random() * 0.3;
      const score = potential + randomFactor;
      if (score < bestPotential) {
        bestPotential = score;
        bestId = nId;
      }
    }
    const node = this._nodes.get(bestId);
    if (node) node.visited = true;
    this._currentId = bestId;
    return bestId;
  }
}
