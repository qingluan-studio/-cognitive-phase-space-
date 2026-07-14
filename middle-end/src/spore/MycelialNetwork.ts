export interface MycelialNode {
  id: string;
  x: number;
  y: number;
  nutrient: number;
  capacity: number;
  flow: number;
}

export interface MycelialEdge {
  from: string;
  to: string;
  conductance: number;
  length: number;
  flow: number;
}

export class MycelialNetwork {
  private _nodes: Map<string, MycelialNode> = new Map();
  private _edges: MycelialEdge[] = [];
  private _state: Record<string, unknown> = {};
  private _diffusionMatrix: number[][] = [];
  private _resilienceIndex: number = 0;

  constructor() {}

  get nodeCount(): number {
    return this._nodes.size;
  }

  get edgeCount(): number {
    return this._edges.length;
  }

  addNode(id: string, x: number, y: number, capacity: number): void {
    this._nodes.set(id, { id, x, y, nutrient: 0, capacity, flow: 0 });
  }

  link(from: string, to: string, conductance: number): void {
    const a = this._nodes.get(from);
    const b = this._nodes.get(to);
    if (!a || !b) return;
    const length = Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
    this._edges.push({ from, to, conductance, length, flow: 0 });
    this._edges.push({ to, from, conductance, length, flow: 0 });
  }

  diffuseNutrients(dt: number): void {
    const nodeIds = Array.from(this._nodes.keys());
    const n = nodeIds.length;
    this._diffusionMatrix = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const edge = this._edges.find((e) => e.from === nodeIds[i] && e.to === nodeIds[j]);
        if (edge) {
          this._diffusionMatrix[i][j] = edge.conductance / (edge.length + 1);
        }
      }
    }
    const newNutrients = new Map<string, number>();
    for (let i = 0; i < n; i++) {
      const id = nodeIds[i];
      const node = this._nodes.get(id)!;
      let influx = 0;
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const neighbor = this._nodes.get(nodeIds[j])!;
        influx += this._diffusionMatrix[j][i] * (neighbor.nutrient - node.nutrient);
      }
      newNutrients.set(id, node.nutrient + dt * influx);
    }
    for (const [id, val] of newNutrients) {
      const node = this._nodes.get(id)!;
      node.nutrient = Math.max(0, Math.min(node.capacity, val));
    }
  }

  minimumSpanningTree(): MycelialEdge[] {
    const mst: MycelialEdge[] = [];
    const visited = new Set<string>();
    const ids = Array.from(this._nodes.keys());
    if (ids.length === 0) return mst;
    visited.add(ids[0]);
    while (visited.size < ids.length) {
      let bestEdge: MycelialEdge | null = null;
      for (const edge of this._edges) {
        if (visited.has(edge.from) && !visited.has(edge.to)) {
          if (!bestEdge || edge.length < bestEdge.length) {
            bestEdge = edge;
          }
        }
      }
      if (!bestEdge) break;
      mst.push(bestEdge);
      visited.add(bestEdge.to);
    }
    return mst;
  }

  maxFlow(source: string, sink: string): number {
    let flow = 0;
    const residual = new Map<string, Map<string, number>>();
    for (const edge of this._edges) {
      if (!residual.has(edge.from)) residual.set(edge.from, new Map());
      residual.get(edge.from)!.set(edge.to, edge.conductance);
    }
    const bfs = (): string[] | null => {
      const parent = new Map<string, string | null>();
      const queue: string[] = [source];
      parent.set(source, null);
      while (queue.length > 0) {
        const u = queue.shift()!;
        for (const [v, cap] of residual.get(u) ?? []) {
          if (!parent.has(v) && cap > 0) {
            parent.set(v, u);
            if (v === sink) {
              const path: string[] = [];
              let curr: string | null = v;
              while (curr) {
                path.unshift(curr);
                curr = parent.get(curr) ?? null;
              }
              return path;
            }
            queue.push(v);
          }
        }
      }
      return null;
    };
    while (true) {
      const path = bfs();
      if (!path) break;
      let pathFlow = Infinity;
      for (let i = 0; i < path.length - 1; i++) {
        pathFlow = Math.min(pathFlow, residual.get(path[i])!.get(path[i + 1])!);
      }
      for (let i = 0; i < path.length - 1; i++) {
        const u = path[i];
        const v = path[i + 1];
        residual.get(u)!.set(v, residual.get(u)!.get(v)! - pathFlow);
        residual.get(v)!.set(u, (residual.get(v)!.get(u) ?? 0) + pathFlow);
      }
      flow += pathFlow;
    }
    return flow;
  }

  networkResilience(): number {
    const mst = this.minimumSpanningTree();
    const totalLength = this._edges.reduce((s, e) => s + e.length, 0) / 2;
    const mstLength = mst.reduce((s, e) => s + e.length, 0);
    this._resilienceIndex = totalLength > 0 ? mstLength / totalLength : 0;
    return this._resilienceIndex;
  }

  nutrientEntropy(): number {
    const nutrients = Array.from(this._nodes.values()).map((n) => n.nutrient);
    const total = nutrients.reduce((s, v) => s + v, 0);
    if (total === 0) return 0;
    return -nutrients.reduce((s, v) => {
      const p = v / total;
      return p > 0 ? s + p * Math.log2(p) : s;
    }, 0);
  }

  report(): Record<string, unknown> {
    return {
      nodes: this._nodes.size,
      edges: this._edges.length,
      resilience: this.networkResilience(),
      nutrientEntropy: this.nutrientEntropy(),
      state: this._state,
    };
  }
}
