/**
 * 反向层级：最底层拥有最高否决权。
 * 颠倒传统自上而下的层级，使最底层节点拥有最强的否决权与决策权。
 */

export interface HierarchyNode {
  id: string;
  level: number;
  vetoPower: number;
  label: string;
}

export interface VetoResult {
  nodeId: string;
  proposal: string;
  passed: boolean;
  decidedAt: number;
}

export class ReverseHierarchy {
  private _nodes: Map<string, HierarchyNode> = new Map();
  private _vetoLog: VetoResult[] = [];
  private _maxLevel = 5;

  registerNode(node: HierarchyNode): void {
    const veto = this._maxLevel - node.level + 1;
    node.vetoPower = Math.max(1, veto);
    this._nodes.set(node.id, node);
  }

  propose(proposal: string): VetoResult {
    const bottom = this._getBottomNode();
    if (!bottom) {
      return { nodeId: 'none', proposal, passed: true, decidedAt: Date.now() };
    }
    const passed = Math.random() > 0.3 / bottom.vetoPower;
    const result: VetoResult = {
      nodeId: bottom.id,
      proposal,
      passed,
      decidedAt: Date.now(),
    };
    this._vetoLog.push(result);
    if (this._vetoLog.length > 200) this._vetoLog.shift();
    return result;
  }

  escalate(nodeId: string): HierarchyNode | null {
    const node = this._nodes.get(nodeId);
    if (!node) return null;
    node.level = Math.max(1, node.level - 1);
    node.vetoPower = Math.max(1, this._maxLevel - node.level + 1);
    return node;
  }

  demote(nodeId: string): HierarchyNode | null {
    const node = this._nodes.get(nodeId);
    if (!node) return null;
    node.level = Math.min(this._maxLevel, node.level + 1);
    node.vetoPower = Math.max(1, this._maxLevel - node.level + 1);
    return node;
  }

  getVetoPower(nodeId: string): number {
    return this._nodes.get(nodeId)?.vetoPower ?? 0;
  }

  getVetoLog(limit: number = 50): VetoResult[] {
    return this._vetoLog.slice(-limit);
  }

  getNodes(): HierarchyNode[] {
    return Array.from(this._nodes.values()).sort((a, b) => b.level - a.level);
  }

  private _getBottomNode(): HierarchyNode | null {
    const nodes = Array.from(this._nodes.values());
    if (nodes.length === 0) return null;
    return nodes.reduce((max, n) => (n.level > max.level ? n : max), nodes[0]);
  }

  get nodeCount(): number {
    return this._nodes.size;
  }
}
