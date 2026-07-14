export interface PsycheNode {
  id: string;
  depth: number;
  shadowContent: number;
  integrated: boolean;
  resistance: number;
}

export interface IntegrationPath {
  nodes: string[];
  totalDepth: number;
  totalResistance: number;
  progress: number;
}

export class ShadowWork {
  private _nodes: Map<string, PsycheNode> = new Map();
  private _edges: Map<string, Set<string>> = new Map();
  private _state: Record<string, unknown> = {};
  private _integrationDepth: number = 0;
  private _totalProgress: number = 0;
  private _thermodynamicCost: number = 0;

  constructor() {}

  get nodeCount(): number {
    return this._nodes.size;
  }

  get integratedCount(): number {
    return Array.from(this._nodes.values()).filter((n) => n.integrated).length;
  }

  addNode(id: string, depth: number, shadowContent: number, resistance: number): void {
    this._nodes.set(id, { id, depth, shadowContent, integrated: false, resistance });
    this._edges.set(id, new Set());
  }

  connect(a: string, b: string): void {
    if (!this._nodes.has(a) || !this._nodes.has(b)) return;
    this._edges.get(a)!.add(b);
    this._edges.get(b)!.add(a);
  }

  exploreDepthFirst(startId: string, maxDepth: number): IntegrationPath {
    const path: string[] = [];
    const visited = new Set<string>();
    const stack: [string, number][] = [[startId, 0]];
    let totalDepth = 0;
    let totalResistance = 0;
    while (stack.length > 0) {
      const [id, currentDepth] = stack.pop()!;
      if (visited.has(id) || currentDepth > maxDepth) continue;
      visited.add(id);
      const node = this._nodes.get(id);
      if (!node) continue;
      path.push(id);
      totalDepth += node.depth;
      totalResistance += node.resistance;
      for (const neighbor of this._edges.get(id) ?? []) {
        if (!visited.has(neighbor)) {
          stack.push([neighbor, currentDepth + 1]);
        }
      }
    }
    const integrated = path.filter((id) => this._nodes.get(id)?.integrated).length;
    const progress = path.length > 0 ? integrated / path.length : 0;
    return { nodes: path, totalDepth, totalResistance, progress };
  }

  integrate(id: string): boolean {
    const node = this._nodes.get(id);
    if (!node || node.integrated) return false;
    const cost = node.shadowContent * node.resistance;
    this._thermodynamicCost += cost;
    node.integrated = true;
    node.resistance *= 0.5;
    this._totalProgress = this.integratedCount / (this._nodes.size || 1);
    this._integrationDepth = Math.max(this._integrationDepth, node.depth);
    return true;
  }

  progressiveDisclosure(startId: string, layers: number): PsycheNode[] {
    const result: PsycheNode[] = [];
    const visited = new Set<string>();
    const queue: [string, number][] = [[startId, 0]];
    while (queue.length > 0) {
      const [id, layer] = queue.shift()!;
      if (visited.has(id) || layer >= layers) continue;
      visited.add(id);
      const node = this._nodes.get(id);
      if (node) result.push(node);
      for (const neighbor of this._edges.get(id) ?? []) {
        if (!visited.has(neighbor)) queue.push([neighbor, layer + 1]);
      }
    }
    return result;
  }

  shadowDepthEntropy(): number {
    const depths = Array.from(this._nodes.values()).map((n) => n.depth);
    const total = depths.reduce((s, v) => s + v, 0);
    if (total === 0) return 0;
    return -depths.reduce((s, v) => {
      const p = v / total;
      return p > 0 ? s + p * Math.log2(p) : s;
    }, 0);
  }

  coherenceMetric(): number {
    const integrated = Array.from(this._nodes.values()).filter((n) => n.integrated);
    if (integrated.length === 0) return 0;
    const avgDepth = integrated.reduce((s, n) => s + n.depth, 0) / integrated.length;
    const variance = integrated.reduce((s, n) => s + Math.pow(n.depth - avgDepth, 2), 0) / integrated.length;
    return 1 / (1 + variance);
  }

  deepestShadow(): PsycheNode | null {
    if (this._nodes.size === 0) return null;
    return Array.from(this._nodes.values()).reduce((best, n) => (n.depth > best.depth ? n : best));
  }

  report(): Record<string, unknown> {
    return {
      nodes: this._nodes.size,
      integrated: this.integratedCount,
      progress: this._totalProgress,
      thermodynamicCost: this._thermodynamicCost,
      coherence: this.coherenceMetric(),
      state: this._state,
    };
  }
}
