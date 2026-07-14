/**
 * 歌之路追踪：沿着歌声路径遍历记忆。
 * 模拟原住民"歌之路"概念，沿歌声路径标识地点与记忆，每个节点同时承载地理与神话意义。
 */

export interface SonglineNode {
  id: string;
  name: string;
  verse: string;
  memory: string;
  next: string | null;
}

export interface TraceResult {
  visited: string[];
  versesSung: string[];
  totalDistance: number;
  completed: boolean;
}

export class SonglineTracer {
  private _nodes: Map<string, SonglineNode> = new Map();
  private _results: TraceResult[] = [];
  private _startId: string | null = null;
  private _maxSteps = 1000;

  addNode(node: SonglineNode): void {
    this._nodes.set(node.id, node);
    if (this._startId === null) this._startId = node.id;
  }

  setStart(id: string): boolean {
    if (!this._nodes.has(id)) return false;
    this._startId = id;
    return true;
  }

  trace(): TraceResult | null {
    if (!this._startId) return null;
    const visited: string[] = [];
    const versesSung: string[] = [];
    let current: SonglineNode | null = this._nodes.get(this._startId) ?? null;
    let totalDistance = 0;
    let steps = 0;
    while (current && steps < this._maxSteps) {
      if (visited.includes(current.id)) break;
      visited.push(current.id);
      versesSung.push(current.verse);
      totalDistance += current.verse.length;
      current = current.next ? this._nodes.get(current.next) ?? null : null;
      steps++;
    }
    const result: TraceResult = {
      visited,
      versesSung,
      totalDistance,
      completed: current === null,
    };
    this._results.push(result);
    if (this._results.length > 50) this._results.shift();
    return result;
  }

  findNodeByVerse(verseFragment: string): SonglineNode | null {
    for (const node of this._nodes.values()) {
      if (node.verse.includes(verseFragment)) return node;
    }
    return null;
  }

  connect(fromId: string, toId: string): boolean {
    const from = this._nodes.get(fromId);
    if (!from || !this._nodes.has(toId)) return false;
    from.next = toId;
    return true;
  }

  getNode(id: string): SonglineNode | null {
    return this._nodes.get(id) ?? null;
  }

  getResults(): TraceResult[] {
    return [...this._results];
  }

  get nodeCount(): number {
    return this._nodes.size;
  }
}
