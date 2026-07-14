/**
 * 反谱系学模块：打破线性进化树结构，建立横向连接网络，
 * 拒绝单一祖先叙事，让每个节点都有多重起源与影响源。
 */

export interface GenealogyNode {
  id: string;
  label: string;
  parents: string[];
  lateralPeers: string[];
  orphaned: boolean;
}

export interface LateralEdge {
  a: string;
  b: string;
  weight: number;
  createdAt: number;
}

export class AntiGenealogy {
  private _nodes: Map<string, GenealogyNode> = new Map();
  private _lateral: LateralEdge[] = [];
  private _treeDepthLimit = 3;

  addNode(node: GenealogyNode): void {
    this._nodes.set(node.id, node);
  }

  breakLinearChain(nodeId: string): boolean {
    const node = this._nodes.get(nodeId);
    if (!node) return false;
    if (node.parents.length === 0) return false;
    node.parents = [];
    node.orphaned = true;
    return true;
  }

  establishLateral(a: string, b: string, weight: number): LateralEdge | null {
    if (!this._nodes.has(a) || !this._nodes.has(b)) return null;
    const edge: LateralEdge = { a, b, weight, createdAt: Date.now() };
    this._lateral.push(edge);
    const nodeA = this._nodes.get(a)!;
    const nodeB = this._nodes.get(b)!;
    if (!nodeA.lateralPeers.includes(b)) nodeA.lateralPeers.push(b);
    if (!nodeB.lateralPeers.includes(a)) nodeB.lateralPeers.push(a);
    return edge;
  }

  getInfluences(nodeId: string): string[] {
    const node = this._nodes.get(nodeId);
    if (!node) return [];
    const influences = new Set<string>(node.parents);
    for (const edge of this._lateral) {
      if (edge.a === nodeId) influences.add(edge.b);
      if (edge.b === nodeId) influences.add(edge.a);
    }
    return Array.from(influences);
  }

  detectTreeDepth(nodeId: string, visited: Set<string> = new Set()): number {
    if (visited.has(nodeId)) return 0;
    visited.add(nodeId);
    const node = this._nodes.get(nodeId);
    if (!node || node.parents.length === 0) return 1;
    if (visited.size > this._treeDepthLimit) return visited.size;
    let maxDepth = 0;
    for (const p of node.parents) {
      maxDepth = Math.max(maxDepth, this.detectTreeDepth(p, visited));
    }
    return maxDepth + 1;
  }

  flattenHierarchy(): string[] {
    return Array.from(this._nodes.keys()).filter(id => {
      const node = this._nodes.get(id)!;
      return node.parents.length <= 1;
    });
  }

  declarePolygenesis(groupId: string, memberIds: string[]): boolean {
    for (const id of memberIds) {
      const node = this._nodes.get(id);
      if (!node) return false;
      node.parents = [];
      node.orphaned = true;
    }
    for (let i = 0; i < memberIds.length; i++) {
      for (let j = i + 1; j < memberIds.length; j++) {
        this.establishLateral(memberIds[i], memberIds[j], 1);
      }
    }
    return true;
  }

  getNode(id: string): GenealogyNode | null {
    return this._nodes.get(id) ?? null;
  }

  getLateralEdges(): LateralEdge[] {
    return [...this._lateral];
  }

  get nodeCount(): number {
    return this._nodes.size;
  }

  get orphanCount(): number {
    return Array.from(this._nodes.values()).filter(n => n.orphaned).length;
  }
}
