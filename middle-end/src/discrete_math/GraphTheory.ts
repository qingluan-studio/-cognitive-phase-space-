/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 图论 —— 连接的拓扑学
 * Graph Theory: The Topology of Connections
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 图是顶点与边的舞蹈。BFS、DFS、Dijkstra、Floyd-Warshall，
 * 从最小生成树到欧拉回路，每条路径都讲述着连接的故事。
 */

import { DataPacket } from '../shared/types';

export interface Edge {
  readonly from: string;
  readonly to: string;
  readonly weight: number;
}

export interface Graph {
  readonly vertices: string[];
  readonly edges: Edge[];
  readonly directed: boolean;
  readonly weighted: boolean;
}

export interface Path {
  readonly vertices: string[];
  readonly length: number;
  readonly totalWeight: number;
}

export interface GraphAlgorithm {
  readonly name: string;
  readonly result: unknown;
  readonly steps: string[];
}

type GraphCache = {
  readonly id: string;
  readonly graph: Graph;
};

export class GraphTheory {
  private _graphs: Map<string, GraphCache> = new Map();
  private _algorithms: GraphAlgorithm[] = [];
  private _history: string[] = [];
  private _counter = 0;

  get graphCount(): number { return this._graphs.size; }
  get algorithmCount(): number { return this._algorithms.length; }
  get history(): string[] { return [...this._history]; }

  /**
   * 创建图
   * Create a new graph
   */
  public createGraph(
    vertices: string[],
    edges: Edge[],
    directed: boolean = false,
    weighted: boolean = false
  ): Graph {
    const graph: Graph = {
      vertices: [...vertices],
      edges: edges.map(e => ({ ...e })),
      directed,
      weighted
    };
    const id = `graph-${(++this._counter).toString(36)}`;
    this._graphs.set(id, { id, graph });
    this._recordHistory(`createGraph: ${vertices.length} vertices, ${edges.length} edges`);
    return graph;
  }

  /**
   * 添加顶点
   * Add a vertex to a stored graph
   */
  public addVertex(graphId: string, vertex: string): void {
    const entry = this._graphs.get(graphId);
    if (!entry) throw new Error(`Graph ${graphId} not found`);
    if (entry.graph.vertices.includes(vertex)) return;
    const updated: Graph = {
      vertices: [...entry.graph.vertices, vertex],
      edges: entry.graph.edges,
      directed: entry.graph.directed,
      weighted: entry.graph.weighted
    };
    this._graphs.set(graphId, { id: graphId, graph: updated });
    this._recordHistory(`addVertex: ${vertex} to ${graphId}`);
  }

  /**
   * 添加边
   * Add an edge to a stored graph
   */
  public addEdge(graphId: string, edge: Edge): void {
    const entry = this._graphs.get(graphId);
    if (!entry) throw new Error(`Graph ${graphId} not found`);
    const updated: Graph = {
      vertices: entry.graph.vertices,
      edges: [...entry.graph.edges, { ...edge }],
      directed: entry.graph.directed,
      weighted: entry.graph.weighted
    };
    this._graphs.set(graphId, { id: graphId, graph: updated });
    this._recordHistory(`addEdge: ${edge.from}->${edge.to} to ${graphId}`);
  }

  /**
   * 广度优先搜索
   * Breadth-first search
   */
  public bfs(graph: Graph, start: string): string[] {
    const adj = this._buildAdjacency(graph);
    const visited = new Set<string>();
    const queue: string[] = [start];
    const order: string[] = [];
    visited.add(start);
    while (queue.length > 0) {
      const v = queue.shift()!;
      order.push(v);
      const neighbors = adj.get(v) ?? [];
      for (const { to } of neighbors) {
        if (!visited.has(to)) {
          visited.add(to);
          queue.push(to);
        }
      }
    }
    this._recordHistory(`bfs from ${start}: ${order.length} visited`);
    return order;
  }

  /**
   * 深度优先搜索
   * Depth-first search
   */
  public dfs(graph: Graph, start: string): string[] {
    const adj = this._buildAdjacency(graph);
    const visited = new Set<string>();
    const order: string[] = [];
    const stack: string[] = [start];
    while (stack.length > 0) {
      const v = stack.pop()!;
      if (visited.has(v)) continue;
      visited.add(v);
      order.push(v);
      const neighbors = adj.get(v) ?? [];
      for (let i = neighbors.length - 1; i >= 0; i--) {
        if (!visited.has(neighbors[i]!.to)) {
          stack.push(neighbors[i]!.to);
        }
      }
    }
    this._recordHistory(`dfs from ${start}: ${order.length} visited`);
    return order;
  }

  /**
   * Dijkstra 最短路径
   * Dijkstra's shortest path
   */
  public dijkstra(graph: Graph, start: string): Map<string, number> {
    const adj = this._buildAdjacency(graph);
    const dist = new Map<string, number>();
    const visited = new Set<string>();
    for (const v of graph.vertices) dist.set(v, Infinity);
    dist.set(start, 0);
    while (visited.size < graph.vertices.length) {
      let u: string | null = null;
      let min = Infinity;
      for (const [v, d] of dist) {
        if (!visited.has(v) && d < min) { min = d; u = v; }
      }
      if (u === null) break;
      visited.add(u);
      const neighbors = adj.get(u) ?? [];
      for (const { to, weight } of neighbors) {
        const alt = dist.get(u)! + weight;
        if (alt < (dist.get(to) ?? Infinity)) dist.set(to, alt);
      }
    }
    this._recordHistory(`dijkstra from ${start}`);
    return dist;
  }

  /**
   * Bellman-Ford 算法（支持负权）
   * Bellman-Ford algorithm
   */
  public bellmanFord(graph: Graph, start: string): Map<string, number> {
    const dist = new Map<string, number>();
    for (const v of graph.vertices) dist.set(v, Infinity);
    dist.set(start, 0);
    const V = graph.vertices.length;
    for (let i = 0; i < V - 1; i++) {
      for (const edge of graph.edges) {
        const du = dist.get(edge.from) ?? Infinity;
        if (du === Infinity) continue;
        const candidate = du + edge.weight;
        if (candidate < (dist.get(edge.to) ?? Infinity)) {
          dist.set(edge.to, candidate);
        }
      }
    }
    this._recordHistory(`bellmanFord from ${start}`);
    return dist;
  }

  /**
   * Floyd-Warshall 全源最短路径
   * Floyd-Warshall all-pairs shortest paths
   */
  public floydWarshall(graph: Graph): number[][] {
    const idx = new Map<string, number>();
    graph.vertices.forEach((v, i) => idx.set(v, i));
    const n = graph.vertices.length;
    const dist: number[][] = Array.from({ length: n }, () => new Array(n).fill(Infinity));
    for (let i = 0; i < n; i++) dist[i]![i] = 0;
    for (const e of graph.edges) {
      const i = idx.get(e.from)!;
      const j = idx.get(e.to)!;
      if (e.weight < dist[i]![j]!) dist[i]![j] = e.weight;
      if (!graph.directed && e.weight < dist[j]![i]!) dist[j]![i] = e.weight;
    }
    for (let k = 0; k < n; k++) {
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (dist[i]![k]! + dist[k]![j]! < dist[i]![j]!) {
            dist[i]![j] = dist[i]![k]! + dist[k]![j]!;
          }
        }
      }
    }
    this._recordHistory('floydWarshall: complete');
    return dist;
  }

  /**
   * Prim 最小生成树
   * Prim's MST
   */
  public prim(graph: Graph, start: string): Edge[] {
    const adj = this._buildAdjacency(graph);
    const visited = new Set<string>([start]);
    const mst: Edge[] = [];
    while (visited.size < graph.vertices.length) {
      let minEdge: Edge | null = null;
      for (const v of visited) {
        const neighbors = adj.get(v) ?? [];
        for (const e of neighbors) {
          if (!visited.has(e.to) && (minEdge === null || e.weight < minEdge.weight)) {
            minEdge = { from: v, to: e.to, weight: e.weight };
          }
        }
      }
      if (minEdge === null) break;
      mst.push(minEdge);
      visited.add(minEdge.to);
    }
    this._recordHistory(`prim from ${start}: ${mst.length} edges`);
    return mst;
  }

  /**
   * Kruskal 最小生成树
   * Kruskal's MST
   */
  public kruskal(graph: Graph): Edge[] {
    const sorted = [...graph.edges].sort((a, b) => a.weight - b.weight);
    const parent = new Map<string, string>();
    for (const v of graph.vertices) parent.set(v, v);
    const find = (v: string): string => {
      let root = v;
      while (parent.get(root) !== root) root = parent.get(root)!;
      return root;
    };
    const union = (a: string, b: string): boolean => {
      const ra = find(a);
      const rb = find(b);
      if (ra === rb) return false;
      parent.set(ra, rb);
      return true;
    };
    const mst: Edge[] = [];
    for (const e of sorted) {
      if (union(e.from, e.to)) mst.push({ ...e });
    }
    this._recordHistory(`kruskal: ${mst.length} edges`);
    return mst;
  }

  /**
   * 拓扑排序（有向无环图）
   * Topological sort (Kahn's algorithm)
   */
  public topologicalSort(graph: Graph): string[] {
    const inDegree = new Map<string, number>();
    for (const v of graph.vertices) inDegree.set(v, 0);
    for (const e of graph.edges) inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1);
    const queue: string[] = [];
    for (const [v, d] of inDegree) if (d === 0) queue.push(v);
    const order: string[] = [];
    while (queue.length > 0) {
      const v = queue.shift()!;
      order.push(v);
      for (const e of graph.edges) {
        if (e.from === v) {
          inDegree.set(e.to, (inDegree.get(e.to) ?? 0) - 1);
          if (inDegree.get(e.to) === 0) queue.push(e.to);
        }
      }
    }
    this._recordHistory(`topologicalSort: ${order.length} vertices`);
    return order;
  }

  /**
   * 环检测（DFS）
   * Cycle detection
   */
  public detectCycle(graph: Graph): boolean {
    const adj = this._buildAdjacency(graph);
    const WHITE = 0, GRAY = 1, BLACK = 2;
    const color = new Map<string, number>();
    for (const v of graph.vertices) color.set(v, WHITE);
    const dfs = (v: string): boolean => {
      color.set(v, GRAY);
      for (const { to } of adj.get(v) ?? []) {
        const c = color.get(to);
        if (c === GRAY) return true;
        if (c === WHITE && dfs(to)) return true;
      }
      color.set(v, BLACK);
      return false;
    };
    for (const v of graph.vertices) {
      if (color.get(v) === WHITE && dfs(v)) {
        this._recordHistory('detectCycle: cycle found');
        return true;
      }
    }
    this._recordHistory('detectCycle: no cycle');
    return false;
  }

  /**
   * 连通分量
   * Find connected components
   */
  public findConnectedComponents(graph: Graph): string[][] {
    const adj = this._buildAdjacency(graph);
    const visited = new Set<string>();
    const components: string[][] = [];
    for (const v of graph.vertices) {
      if (visited.has(v)) continue;
      const component: string[] = [];
      const stack: string[] = [v];
      while (stack.length > 0) {
        const u = stack.pop()!;
        if (visited.has(u)) continue;
        visited.add(u);
        component.push(u);
        for (const { to } of adj.get(u) ?? []) {
          if (!visited.has(to)) stack.push(to);
        }
      }
      components.push(component);
    }
    this._recordHistory(`findConnectedComponents: ${components.length} components`);
    return components;
  }

  /**
   * 二分图判定
   * Check if graph is bipartite
   */
  public isBipartite(graph: Graph): boolean {
    const adj = this._buildAdjacency(graph);
    const color = new Map<string, number>();
    for (const v of graph.vertices) {
      if (color.has(v)) continue;
      color.set(v, 0);
      const queue: string[] = [v];
      while (queue.length > 0) {
        const u = queue.shift()!;
        const uc = color.get(u)!;
        for (const { to } of adj.get(u) ?? []) {
          if (!color.has(to)) {
            color.set(to, 1 - uc);
            queue.push(to);
          } else if (color.get(to) === uc) {
            return false;
          }
        }
      }
    }
    this._recordHistory('isBipartite: true');
    return true;
  }

  /**
   * 欧拉路径
   * Eulerian path (Hierholzer's algorithm)
   */
  public eulerianPath(graph: Graph): string[] | null {
    const adj = this._buildAdjacency(graph);
    const degrees = new Map<string, number>();
    for (const v of graph.vertices) degrees.set(v, 0);
    for (const [v, neighbors] of adj) {
      degrees.set(v, (degrees.get(v) ?? 0) + neighbors.length);
    }
    let start = graph.vertices[0] ?? null;
    let oddCount = 0;
    for (const [v, d] of degrees) {
      if (d % 2 === 1) {
        oddCount++;
        if (!start) start = v;
      }
    }
    if (oddCount !== 0 && oddCount !== 2) {
      this._recordHistory('eulerianPath: not possible');
      return null;
    }
    const path: string[] = [];
    const stack: string[] = start ? [start] : [];
    const localAdj = new Map<string, string[]>();
    for (const [v, neighbors] of adj) {
      localAdj.set(v, neighbors.map(n => n.to));
    }
    while (stack.length > 0) {
      const u = stack[stack.length - 1]!;
      const neighbors = localAdj.get(u) ?? [];
      if (neighbors.length === 0) {
        path.push(stack.pop()!);
      } else {
        const next = neighbors.shift()!;
        stack.push(next);
        const reverse = localAdj.get(next) ?? [];
        const idx = reverse.indexOf(u);
        if (idx !== -1) reverse.splice(idx, 1);
      }
    }
    this._recordHistory(`eulerianPath: ${path.length} vertices`);
    return path;
  }

  /**
   * 哈密顿路径（回溯法）
   * Hamiltonian path (backtracking)
   */
  public hamiltonianPath(graph: Graph): string[] | null {
    const adj = this._buildAdjacency(graph);
    const visited = new Set<string>();
    const path: string[] = [];
    const backtrack = (v: string): boolean => {
      visited.add(v);
      path.push(v);
      if (path.length === graph.vertices.length) return true;
      for (const { to } of adj.get(v) ?? []) {
        if (!visited.has(to) && backtrack(to)) return true;
      }
      visited.delete(v);
      path.pop();
      return false;
    };
    for (const v of graph.vertices) {
      if (backtrack(v)) {
        this._recordHistory(`hamiltonianPath: ${path.length} vertices`);
        return path;
      }
    }
    this._recordHistory('hamiltonianPath: not found');
    return null;
  }

  /**
   * 转换为数据包
   * Serialize to DataPacket
   */
  public toPacket(): DataPacket<{
    graphs: number;
    algorithms: GraphAlgorithm[];
    history: string[];
  }> {
    return {
      id: `graph-theory-${Date.now()}-${this._counter}`,
      payload: {
        graphs: this._graphs.size,
        algorithms: [...this._algorithms],
        history: [...this._history]
      },
      metadata: {
        createdAt: Date.now(),
        route: ['discrete_math', 'graph-theory', 'result'],
        priority: 0.8,
        phase: 'analysis'
      }
    };
  }

  /**
   * 重置状态
   * Reset internal state
   */
  public reset(): void {
    this._graphs.clear();
    this._algorithms = [];
    this._history = [];
    this._counter = 0;
  }

  // ─── Private helpers ───

  private _recordHistory(entry: string): void {
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  private _buildAdjacency(graph: Graph): Map<string, Edge[]> {
    const adj = new Map<string, Edge[]>();
    for (const v of graph.vertices) adj.set(v, []);
    for (const e of graph.edges) {
      adj.get(e.from)?.push({ ...e });
      if (!graph.directed) {
        adj.get(e.to)?.push({ from: e.to, to: e.from, weight: e.weight });
      }
    }
    return adj;
  }
}
