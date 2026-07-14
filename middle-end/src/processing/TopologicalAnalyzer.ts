/**
 * 拓扑分析器模块：将数据流视为流形结构，
 * 检测其中的洞、连通分量与异常边界，揭示数据的空间结构特性。
 */

export interface TopologyNode {
  id: string;
  neighbors: string[];
  data: Record<string, unknown>;
  visited: boolean;
}

export interface TopologyReport {
  components: number;
  holes: number;
  bridges: string[];
  boundaryNodes: string[];
  eulerCharacteristic: number;
}

export class TopologicalAnalyzer {
  private _nodes: Map<string, TopologyNode> = new Map();
  private _lastReport: TopologyReport | null = null;

  addNode(node: TopologyNode): void {
    this._nodes.set(node.id, node);
  }

  connect(a: string, b: string): void {
    const nodeA = this._nodes.get(a);
    const nodeB = this._nodes.get(b);
    if (nodeA && !nodeA.neighbors.includes(b)) nodeA.neighbors.push(b);
    if (nodeB && !nodeB.neighbors.includes(a)) nodeB.neighbors.push(a);
  }

  analyze(): TopologyReport {
    for (const node of this._nodes.values()) node.visited = false;

    const components = this._countComponents();
    const holes = this._estimateHoles();
    const bridges = this._findBridges();
    const boundaryNodes = this._findBoundaryNodes();
    const eulerCharacteristic = this._nodes.size - this._edgeCount() + holes;

    this._lastReport = {
      components,
      holes,
      bridges,
      boundaryNodes,
      eulerCharacteristic,
    };
    return this._lastReport;
  }

  private _countComponents(): number {
    let count = 0;
    for (const node of this._nodes.values()) {
      if (!node.visited) {
        count++;
        this._bfs(node.id);
      }
    }
    return count;
  }

  private _bfs(startId: string): void {
    const queue = [startId];
    while (queue.length > 0) {
      const id = queue.shift()!;
      const node = this._nodes.get(id);
      if (!node || node.visited) continue;
      node.visited = true;
      for (const n of node.neighbors) {
        const neighbor = this._nodes.get(n);
        if (neighbor && !neighbor.visited) queue.push(n);
      }
    }
  }

  private _estimateHoles(): number {
    let cycles = 0;
    for (const node of this._nodes.values()) {
      for (const nId of node.neighbors) {
        const neighbor = this._nodes.get(nId);
        if (!neighbor) continue;
        for (const shared of neighbor.neighbors) {
          if (shared !== node.id && node.neighbors.includes(shared)) cycles++;
        }
      }
    }
    return Math.floor(cycles / 6);
  }

  private _findBridges(): string[] {
    const bridges: string[] = [];
    for (const node of this._nodes.values()) {
      for (const nId of node.neighbors) {
        if (node.id < nId && this._isBridge(node.id, nId)) {
          bridges.push(`${node.id}--${nId}`);
        }
      }
    }
    return bridges;
  }

  private _isBridge(a: string, b: string): boolean {
    const nodeA = this._nodes.get(a)!;
    const original = [...nodeA.neighbors];
    nodeA.neighbors = nodeA.neighbors.filter(n => n !== b);
    for (const n of this._nodes.values()) n.visited = false;
    const components = this._countComponents();
    nodeA.neighbors = original;
    return components > 1;
  }

  private _findBoundaryNodes(): string[] {
    return Array.from(this._nodes.values())
      .filter(n => n.neighbors.length <= 1)
      .map(n => n.id);
  }

  private _edgeCount(): number {
    let count = 0;
    for (const node of this._nodes.values()) count += node.neighbors.length;
    return Math.floor(count / 2);
  }

  getReport(): TopologyReport | null {
    return this._lastReport;
  }

  isConnected(): boolean {
    return this._lastReport?.components === 1;
  }

  reset(): void {
    this._nodes.clear();
    this._lastReport = null;
  }

  get nodeCount(): number {
    return this._nodes.size;
  }

  get edgeCount(): number {
    return this._edgeCount();
  }
}
