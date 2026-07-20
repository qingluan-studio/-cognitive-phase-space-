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
   * 强连通分量（Kosaraju 算法）
   * Strongly connected components (Kosaraju's algorithm)
   */
  public stronglyConnectedComponents(graph: Graph): string[][] {
    if (!graph.directed) {
      return this.findConnectedComponents(graph);
    }
    const adj = this._buildAdjacency(graph);
    const visited = new Set<string>();
    const order: string[] = [];
    const dfs1 = (v: string) => {
      if (visited.has(v)) return;
      visited.add(v);
      for (const { to } of adj.get(v) ?? []) dfs1(to);
      order.push(v);
    };
    for (const v of graph.vertices) dfs1(v);
    const reverseAdj = new Map<string, string[]>();
    for (const v of graph.vertices) reverseAdj.set(v, []);
    for (const e of graph.edges) {
      reverseAdj.get(e.to)?.push(e.from);
    }
    visited.clear();
    const components: string[][] = [];
    const dfs2 = (v: string, component: string[]) => {
      if (visited.has(v)) return;
      visited.add(v);
      component.push(v);
      for (const to of reverseAdj.get(v) ?? []) dfs2(to, component);
    };
    for (let i = order.length - 1; i >= 0; i--) {
      const v = order[i]!;
      if (!visited.has(v)) {
        const component: string[] = [];
        dfs2(v, component);
        components.push(component);
      }
    }
    this._recordHistory(`stronglyConnectedComponents: ${components.length} SCCs`);
    return components;
  }

  /**
   * 桥查找（Tarjan 算法）
   * Find bridges (Tarjan's algorithm)
   */
  public findBridges(graph: Graph): Edge[] {
    const adj = this._buildAdjacency(graph);
    const bridges: Edge[] = [];
    const disc = new Map<string, number>();
    const low = new Map<string, number>();
    const parent = new Map<string, string | null>();
    let time = 0;
    const dfs = (u: string) => {
      disc.set(u, time);
      low.set(u, time);
      time++;
      for (const { to: v } of adj.get(u) ?? []) {
        if (!disc.has(v)) {
          parent.set(v, u);
          dfs(v);
          low.set(u, Math.min(low.get(u)!, low.get(v)!));
          if (low.get(v)! > disc.get(u)!) {
            bridges.push({ from: u, to: v, weight: 1 });
          }
        } else if (v !== parent.get(u)) {
          low.set(u, Math.min(low.get(u)!, disc.get(v)!));
        }
      }
    };
    for (const v of graph.vertices) {
      if (!disc.has(v)) {
        parent.set(v, null);
        dfs(v);
      }
    }
    this._recordHistory(`findBridges: ${bridges.length} bridges`);
    return bridges;
  }

  /**
   * 割点查找（Tarjan 算法）
   * Find articulation points (Tarjan's algorithm)
   */
  public findArticulationPoints(graph: Graph): string[] {
    const adj = this._buildAdjacency(graph);
    const ap = new Set<string>();
    const disc = new Map<string, number>();
    const low = new Map<string, number>();
    const parent = new Map<string, string | null>();
    let time = 0;
    const dfs = (u: string) => {
      let children = 0;
      disc.set(u, time);
      low.set(u, time);
      time++;
      for (const { to: v } of adj.get(u) ?? []) {
        if (!disc.has(v)) {
          children++;
          parent.set(v, u);
          dfs(v);
          low.set(u, Math.min(low.get(u)!, low.get(v)!));
          if (parent.get(u) === null && children > 1) ap.add(u);
          if (parent.get(u) !== null && low.get(v)! >= disc.get(u)!) ap.add(u);
        } else if (v !== parent.get(u)) {
          low.set(u, Math.min(low.get(u)!, disc.get(v)!));
        }
      }
    };
    for (const v of graph.vertices) {
      if (!disc.has(v)) {
        parent.set(v, null);
        dfs(v);
      }
    }
    const result = [...ap];
    this._recordHistory(`findArticulationPoints: ${result.length} points`);
    return result;
  }

  /**
   * 最大流（Edmonds-Karp 算法）
   * Max flow (Edmonds-Karp algorithm)
   */
  public maxFlow(graph: Graph, source: string, sink: string): number {
    const adj = this._buildAdjacency(graph);
    const residual = new Map<string, Map<string, number>>();
    for (const v of graph.vertices) residual.set(v, new Map());
    for (const e of graph.edges) {
      residual.get(e.from)!.set(e.to, (residual.get(e.from)!.get(e.to) ?? 0) + e.weight);
      if (!graph.directed) {
        residual.get(e.to)!.set(e.from, (residual.get(e.to)!.get(e.from) ?? 0) + e.weight);
      }
    }
    let flow = 0;
    while (true) {
      const parent = new Map<string, string | null>();
      const visited = new Set<string>([source]);
      const queue: string[] = [source];
      let found = false;
      while (queue.length > 0) {
        const u = queue.shift()!;
        if (u === sink) { found = true; break; }
        for (const [v, cap] of residual.get(u) ?? []) {
          if (!visited.has(v) && cap > 0) {
            visited.add(v);
            parent.set(v, u);
            queue.push(v);
          }
        }
      }
      if (!found) break;
      let minCap = Infinity;
      for (let v = sink; v !== source; v = parent.get(v)!) {
        const u = parent.get(v)!;
        minCap = Math.min(minCap, residual.get(u)!.get(v)!);
      }
      for (let v = sink; v !== source; v = parent.get(v)!) {
        const u = parent.get(v)!;
        residual.get(u)!.set(v, residual.get(u)!.get(v)! - minCap);
        residual.get(v)!.set(u, (residual.get(v)!.get(u) ?? 0) + minCap);
      }
      flow += minCap;
    }
    this._recordHistory(`maxFlow: ${flow} from ${source} to ${sink}`);
    return flow;
  }

  /**
   * 二分图最大匹配（Hopcroft-Karp 算法，简化版 BFS）
   * Bipartite matching (simplified)
   */
  public bipartiteMatching(graph: Graph, left: string[], right: string[]): number {
    const adj = this._buildAdjacency(graph);
    const matchTo = new Map<string, string>();
    let result = 0;
    const dfs = (u: string, visited: Set<string>): boolean => {
      for (const { to: v } of adj.get(u) ?? []) {
        if (visited.has(v)) continue;
        visited.add(v);
        if (!matchTo.has(v) || dfs(matchTo.get(v)!, visited)) {
          matchTo.set(v, u);
          return true;
        }
      }
      return false;
    };
    for (const u of left) {
      if (dfs(u, new Set())) result++;
    }
    this._recordHistory(`bipartiteMatching: ${result} matches`);
    return result;
  }

  /**
   * 图着色（贪心算法）
   * Graph coloring (greedy algorithm)
   */
  public greedyColoring(graph: Graph): Map<string, number> {
    const adj = this._buildAdjacency(graph);
    const color = new Map<string, number>();
    for (const v of graph.vertices) {
      const used = new Set<number>();
      for (const { to } of adj.get(v) ?? []) {
        if (color.has(to)) used.add(color.get(to)!);
      }
      let c = 0;
      while (used.has(c)) c++;
      color.set(v, c);
    }
    this._recordHistory(`greedyColoring: ${new Set(color.values()).size} colors`);
    return color;
  }

  /**
   * 顶点覆盖（2-近似算法）
   * Vertex cover (2-approximation)
   */
  public vertexCoverApprox(graph: Graph): string[] {
    const cover = new Set<string>();
    const edges = [...graph.edges];
    for (const e of edges) {
      if (!cover.has(e.from) && !cover.has(e.to)) {
        cover.add(e.from);
        cover.add(e.to);
      }
    }
    const result = [...cover];
    this._recordHistory(`vertexCoverApprox: ${result.length} vertices`);
    return result;
  }

  /**
   * 独立集（贪心算法）
   * Independent set (greedy)
   */
  public independentSetGreedy(graph: Graph): string[] {
    const adj = this._buildAdjacency(graph);
    const remaining = new Set(graph.vertices);
    const independent: string[] = [];
    while (remaining.size > 0) {
      let minDegree = Infinity;
      let minVertex = '';
      for (const v of remaining) {
        let degree = 0;
        for (const { to } of adj.get(v) ?? []) {
          if (remaining.has(to)) degree++;
        }
        if (degree < minDegree) {
          minDegree = degree;
          minVertex = v;
        }
      }
      independent.push(minVertex);
      remaining.delete(minVertex);
      for (const { to } of adj.get(minVertex) ?? []) {
        remaining.delete(to);
      }
    }
    this._recordHistory(`independentSetGreedy: ${independent.length} vertices`);
    return independent;
  }

  /**
   * DAG 最长路径
   * Longest path in DAG
   */
  public longestPathDAG(graph: Graph): string[] {
    if (!graph.directed || this.detectCycle(graph)) return [];
    const topo = this.topologicalSort(graph);
    const adj = this._buildAdjacency(graph);
    const dist = new Map<string, number>();
    const prev = new Map<string, string | null>();
    for (const v of graph.vertices) {
      dist.set(v, 0);
      prev.set(v, null);
    }
    for (const u of topo) {
      for (const { to: v, weight } of adj.get(u) ?? []) {
        if (dist.get(u)! + weight > dist.get(v)!) {
          dist.set(v, dist.get(u)! + weight);
          prev.set(v, u);
        }
      }
    }
    let maxDist = -Infinity;
    let endVertex = '';
    for (const [v, d] of dist) {
      if (d > maxDist) {
        maxDist = d;
        endVertex = v;
      }
    }
    const path: string[] = [];
    for (let v = endVertex; v !== null; v = prev.get(v)!) {
      path.unshift(v);
    }
    this._recordHistory(`longestPathDAG: ${path.length} vertices, weight=${maxDist}`);
    return path;
  }

  /**
   * 图的直径
   * Graph diameter (longest shortest path)
   */
  public graphDiameter(graph: Graph): number {
    const dist = this.floydWarshall(graph);
    let max = 0;
    for (let i = 0; i < dist.length; i++) {
      for (let j = 0; j < dist[i]!.length; j++) {
        if (dist[i]![j]! < Infinity && dist[i]![j]! > max) {
          max = dist[i]![j]!;
        }
      }
    }
    this._recordHistory(`graphDiameter: ${max}`);
    return max;
  }

  /**
   * 图的半径和中心
   * Graph radius and center
   */
  public graphCenter(graph: Graph): { radius: number; centers: string[] } {
    const dist = this.floydWarshall(graph);
    const n = graph.vertices.length;
    const eccentricity: number[] = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let max = 0;
      for (let j = 0; j < n; j++) {
        if (dist[i]![j]! < Infinity && dist[i]![j]! > max) {
          max = dist[i]![j]!;
        }
      }
      eccentricity[i] = max;
    }
    let radius = Infinity;
    for (const e of eccentricity) {
      if (e < radius && e > 0) radius = e;
    }
    const centers: string[] = [];
    for (let i = 0; i < n; i++) {
      if (eccentricity[i] === radius) centers.push(graph.vertices[i]!);
    }
    this._recordHistory(`graphCenter: radius=${radius}, ${centers.length} centers`);
    return { radius, centers };
  }

  /**
   * 邻接矩阵
   * Adjacency matrix
   */
  public adjacencyMatrix(graph: Graph): number[][] {
    const idx = new Map<string, number>();
    graph.vertices.forEach((v, i) => idx.set(v, i));
    const n = graph.vertices.length;
    const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (const e of graph.edges) {
      const i = idx.get(e.from)!;
      const j = idx.get(e.to)!;
      matrix[i]![j] = graph.weighted ? e.weight : 1;
      if (!graph.directed) matrix[j]![i] = graph.weighted ? e.weight : 1;
    }
    this._recordHistory(`adjacencyMatrix: ${n}x${n}`);
    return matrix;
  }

  /**
   * 拉普拉斯矩阵
   * Laplacian matrix
   */
  public laplacianMatrix(graph: Graph): number[][] {
    const adj = this.adjacencyMatrix(graph);
    const n = adj.length;
    const laplacian: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      let degree = 0;
      for (let j = 0; j < n; j++) {
        degree += adj[i]![j]!;
        laplacian[i]![j] = -adj[i]![j]!;
      }
      laplacian[i]![i] = degree;
    }
    this._recordHistory(`laplacianMatrix: ${n}x${n}`);
    return laplacian;
  }

  /**
   * 度数序列
   * Degree sequence
   */
  public degreeSequence(graph: Graph): number[] {
    const adj = this._buildAdjacency(graph);
    const degrees = graph.vertices.map(v => adj.get(v)?.length ?? 0);
    degrees.sort((a, b) => b - a);
    this._recordHistory(`degreeSequence: ${degrees.length} vertices`);
    return degrees;
  }

  /**
   * Erdős–Gallai 定理：度数序列判定
   * Erdős–Gallai theorem: graphical sequence check
   */
  public isGraphicalSequence(degrees: number[]): boolean {
    const sorted = [...degrees].sort((a, b) => b - a);
    const n = sorted.length;
    let sum = 0;
    for (const d of sorted) {
      if (d < 0 || d >= n) return false;
      sum += d;
    }
    if (sum % 2 !== 0) return false;
    for (let k = 1; k <= n; k++) {
      let leftSum = 0;
      for (let i = 0; i < k; i++) leftSum += sorted[i]!;
      let rightSum = k * (k - 1);
      for (let i = k; i < n; i++) {
        rightSum += Math.min(sorted[i]!, k);
      }
      if (leftSum > rightSum) return false;
    }
    return true;
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
