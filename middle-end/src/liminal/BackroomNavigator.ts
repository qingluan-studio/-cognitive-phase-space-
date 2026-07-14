/**
 * 后室导航：在无定义的状态空间中寻找捷径。
 * 当系统跌入未定义的"后室"区域时，导航器在该稀疏、
 * 无中心的状态图中探测邻接节点，寻找通往定义域的捷径。
 */

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

export class BackroomNavigator {
  private _nodes: Map<string, BackroomNode> = new Map();
  private _adjacency: Map<string, string[]> = new Map();
  private _currentId: string | null = null;
  private _shortcuts: Shortcut[] = [];

  /** 跌入后室：以未定义节点作为入口。 */
  enterBackroom(node: BackroomNode): string {
    this._nodes.set(node.id, node);
    if (!this._adjacency.has(node.id)) this._adjacency.set(node.id, []);
    this._currentId = node.id;
    return node.id;
  }

  /** 探测当前节点的邻接节点。 */
  getNeighbors(nodeId: string): BackroomNode[] {
    const ids = this._adjacency.get(nodeId) ?? [];
    return ids.map(id => this._nodes.get(id)).filter((n): n is BackroomNode => !!n);
  }

  /** 把未定义空间映射成图节点。 */
  mapUndefined(node: BackroomNode, neighbors: string[]): void {
    this._nodes.set(node.id, node);
    this._adjacency.set(node.id, neighbors);
    for (const nId of neighbors) {
      const list = this._adjacency.get(nId) ?? [];
      if (!list.includes(node.id)) list.push(node.id);
      this._adjacency.set(nId, list);
    }
  }

  /** 广度优先搜索通往已定义节点的捷径。 */
  findShortcut(startId: string): Shortcut {
    const queue: string[][] = [[startId]];
    const visited = new Set<string>([startId]);
    while (queue.length > 0) {
      const path = queue.shift()!;
      const last = path[path.length - 1];
      const node = this._nodes.get(last);
      if (node?.defined) {
        const sc: Shortcut = { path, length: path.length - 1, exitFound: true };
        this._shortcuts.push(sc);
        return sc;
      }
      for (const n of this._adjacency.get(last) ?? []) {
        if (!visited.has(n)) {
          visited.add(n);
          queue.push([...path, n]);
        }
      }
    }
    return { path: [startId], length: 0, exitFound: false };
  }

  /** 沿捷径移动到出口。 */
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
}
