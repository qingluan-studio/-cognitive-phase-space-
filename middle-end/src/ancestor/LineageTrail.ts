/**
 * 谱系追踪：记录每个模块的演变世系。
 * 通过父子关系构建模块谱系树，可追溯任意模块的祖先链与后代分支。
 */

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

  registerNode(node: LineageNode): void {
    this._nodes.set(node.id, node);
    if (node.parentId) {
      if (!this._childrenIndex.has(node.parentId)) {
        this._childrenIndex.set(node.parentId, new Set());
      }
      this._childrenIndex.get(node.parentId)!.add(node.id);
    }
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
    return -1;
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
}
