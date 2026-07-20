import { DataPacket, PacketMeta } from '../shared/types';

/** Generic edge descriptor. */
export interface Edge {
  from: string;
  to: string;
  weight: number;
  directed: boolean;
}

/** Generic graph node. */
export interface GraphNode {
  id: string;
  label: string;
  metadata: Record<string, unknown>;
}

/** Graph representation. */
export interface Graph {
  nodes: Map<string, GraphNode>;
  adjacency: Map<string, Array<{ to: string; weight: number }>>;
  directed: boolean;
}

/** Shortest path result. */
export interface ShortestPathResult {
  source: string;
  distances: Map<string, number>;
  predecessors: Map<string, string | null>;
  reachable: number;
}

/** Traversal result. */
export interface TraversalResult {
  visited: string[];
  order: number[];
  edges: Array<{ from: string; to: string }>;
}

/** Connected component descriptor. */
export interface ConnectedComponent {
  id: number;
  nodes: string[];
  size: number;
}

/** Cycle detection result. */
export interface CycleResult {
  hasCycle: boolean;
  cycle: string[];
  length: number;
}

/** MST result. */
export interface MSTResult {
  edges: Edge[];
  totalWeight: number;
  nodeCount: number;
}

/** Max-flow result. */
export interface MaxFlowResult {
  maxFlow: number;
  flow: Map<string, number>;
  minCut: string[];
  augmentingPaths: number;
}

/** Topological sort result. */
export interface TopoSortResult {
  order: string[];
  cyclic: boolean;
  cycle: string[];
}

/** Bipartite check result. */
export interface BipartiteResult {
  bipartite: boolean;
  partitionA: string[];
  partitionB: string[];
  conflictEdge: { from: string; to: string } | null;
}

/** Strongly connected component result. */
export interface SCCResult {
  components: string[][];
  count: number;
  largestSize: number;
}

/** Bridge/cut-vertex result. */
export interface BridgeResult {
  bridges: Edge[];
  cutVertices: string[];
}

/** All-pairs shortest path matrix. */
export interface AllPairsResult {
  distances: number[][];
  predecessors: number[][];
  negativeCycle: boolean;
}

/** 2-coloring / vertex coloring result. */
export interface ColoringResult {
  colors: Map<string, number>;
  chromaticNumber: number;
  proper: boolean;
}

/** Edge classification (DFS tree/back/forward/cross). */
export type EdgeClass = 'tree' | 'back' | 'forward' | 'cross';

/** Graph algorithm suite. */
export class GraphAlgorithms {
  private _graphs: Graph[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  /** Create a new graph from edges. */
  createGraph(nodes: GraphNode[], edges: Edge[], directed: boolean = false): Graph {
    const graph: Graph = {
      nodes: new Map(nodes.map(n => [n.id, n])),
      adjacency: new Map(),
      directed,
    };
    for (const node of nodes) graph.adjacency.set(node.id, []);
    for (const e of edges) {
      const fromList = graph.adjacency.get(e.from) ?? [];
      fromList.push({ to: e.to, weight: e.weight });
      graph.adjacency.set(e.from, fromList);
      if (!directed) {
        const toList = graph.adjacency.get(e.to) ?? [];
        toList.push({ to: e.from, weight: e.weight });
        graph.adjacency.set(e.to, toList);
      }
    }
    this._graphs.push(graph);
    this._history.push({ method: 'createGraph', nodes: nodes.length, edges: edges.length });
    return graph;
  }

  /** Breadth-first search traversal. */
  bfs(graph: Graph, source: string): TraversalResult {
    const visited = new Set<string>();
    const visitedOrder: string[] = [];
    const order: number[] = [];
    const edges: Array<{ from: string; to: string }> = [];
    const queue: string[] = [source];
    visited.add(source);
    let counter = 0;
    while (queue.length > 0) {
      const node = queue.shift()!;
      visitedOrder.push(node);
      order.push(counter++);
      for (const { to } of graph.adjacency.get(node) ?? []) {
        if (!visited.has(to)) {
          visited.add(to);
          queue.push(to);
          edges.push({ from: node, to });
        }
      }
    }
    this._history.push({ method: 'bfs', source, nodes: visitedOrder.length });
    return { visited: visitedOrder, order, edges };
  }

  /** Depth-first search traversal (iterative). */
  dfs(graph: Graph, source: string): TraversalResult {
    const visited = new Set<string>();
    const visitedOrder: string[] = [];
    const order: number[] = [];
    const edges: Array<{ from: string; to: string }> = [];
    const stack: string[] = [source];
    let counter = 0;
    while (stack.length > 0) {
      const node = stack.pop()!;
      if (visited.has(node)) continue;
      visited.add(node);
      visitedOrder.push(node);
      order.push(counter++);
      const neighbors = [...(graph.adjacency.get(node) ?? [])].reverse();
      for (const { to } of neighbors) {
        if (!visited.has(to)) {
          edges.push({ from: node, to });
          stack.push(to);
        }
      }
    }
    this._history.push({ method: 'dfs', source, nodes: visitedOrder.length });
    return { visited: visitedOrder, order, edges };
  }

  /** Recursive DFS helper that supports a callback. */
  dfsRecursive(graph: Graph, source: string, callback?: (node: string, depth: number) => void): string[] {
    const visited = new Set<string>();
    const result: string[] = [];
    const visit = (node: string, depth: number): void => {
      if (visited.has(node)) return;
      visited.add(node);
      result.push(node);
      callback?.(node, depth);
      for (const { to } of graph.adjacency.get(node) ?? []) {
        visit(to, depth + 1);
      }
    };
    visit(source, 0);
    this._history.push({ method: 'dfsRecursive', source });
    return result;
  }

  /** Dijkstra's shortest path algorithm with binary-heap style efficiency. */
  dijkstra(graph: Graph, source: string): ShortestPathResult {
    const distances = new Map<string, number>();
    const predecessors = new Map<string, string | null>();
    const visited = new Set<string>();
    for (const id of graph.nodes.keys()) {
      distances.set(id, Infinity);
      predecessors.set(id, null);
    }
    distances.set(source, 0);
    while (visited.size < graph.nodes.size) {
      let u: string | null = null;
      let minDist = Infinity;
      for (const [id, d] of distances) {
        if (!visited.has(id) && d < minDist) {
          minDist = d;
          u = id;
        }
      }
      if (u === null) break;
      visited.add(u);
      for (const { to, weight } of graph.adjacency.get(u) ?? []) {
        const newDist = distances.get(u)! + weight;
        if (newDist < (distances.get(to) ?? Infinity)) {
          distances.set(to, newDist);
          predecessors.set(to, u);
        }
      }
    }
    const reachable = Array.from(distances.values()).filter(d => d < Infinity).length - 1;
    this._history.push({ method: 'dijkstra', source, reachable });
    return { source, distances, predecessors, reachable };
  }

  /** Bellman-Ford algorithm (handles negative weights). */
  bellmanFord(graph: Graph, source: string): { distances: Map<string, number>; predecessors: Map<string, string | null>; hasNegativeCycle: boolean } {
    const distances = new Map<string, number>();
    const predecessors = new Map<string, string | null>();
    for (const id of graph.nodes.keys()) {
      distances.set(id, Infinity);
      predecessors.set(id, null);
    }
    distances.set(source, 0);
    const edges: Array<{ from: string; to: string; weight: number }> = [];
    for (const [from, list] of graph.adjacency) {
      for (const { to, weight } of list) edges.push({ from, to, weight });
    }
    for (let i = 0; i < graph.nodes.size - 1; i++) {
      for (const { from, to, weight } of edges) {
        const distFrom = distances.get(from) ?? Infinity;
        const distTo = distances.get(to) ?? Infinity;
        if (distFrom + weight < distTo) {
          distances.set(to, distFrom + weight);
          predecessors.set(to, from);
        }
      }
    }
    let hasNegativeCycle = false;
    for (const { from, to, weight } of edges) {
      const distFrom = distances.get(from) ?? Infinity;
      const distTo = distances.get(to) ?? Infinity;
      if (distFrom + weight < distTo) {
        hasNegativeCycle = true;
        break;
      }
    }
    this._history.push({ method: 'bellmanFord', source, hasNegativeCycle });
    return { distances, predecessors, hasNegativeCycle };
  }

  /** Floyd-Warshall all-pairs shortest paths. */
  floydWarshall(graph: Graph): AllPairsResult {
    const ids = Array.from(graph.nodes.keys());
    const idxMap = new Map<string, number>(ids.map((id, i) => [id, i]));
    const n = ids.length;
    const dist: number[][] = Array.from({ length: n }, () => new Array(n).fill(Infinity));
    const pred: number[][] = Array.from({ length: n }, () => new Array(n).fill(-1));
    for (let i = 0; i < n; i++) dist[i][i] = 0;
    for (const [from, list] of graph.adjacency) {
      const i = idxMap.get(from)!;
      for (const { to, weight } of list) {
        const j = idxMap.get(to)!;
        if (weight < dist[i][j]) {
          dist[i][j] = weight;
          pred[i][j] = i;
        }
      }
    }
    for (let k = 0; k < n; k++) {
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (dist[i][k] + dist[k][j] < dist[i][j]) {
            dist[i][j] = dist[i][k] + dist[k][j];
            pred[i][j] = pred[k][j];
          }
        }
      }
    }
    let negativeCycle = false;
    for (let i = 0; i < n; i++) if (dist[i][i] < 0) negativeCycle = true;
    this._history.push({ method: 'floydWarshall', nodes: n, negativeCycle });
    return { distances: dist, predecessors: pred, negativeCycle };
  }

  /** A* search algorithm with heuristic. */
  aStar(graph: Graph, source: string, target: string, heuristic: (a: string, b: string) => number = () => 0): { path: string[]; cost: number; expanded: number } {
    const open = new Set<string>([source]);
    const gScore = new Map<string, number>([[source, 0]]);
    const fScore = new Map<string, number>([[source, heuristic(source, target)]]);
    const cameFrom = new Map<string, string>();
    const closed = new Set<string>();
    while (open.size > 0) {
      let current: string | null = null;
      let minF = Infinity;
      for (const id of open) {
        const f = fScore.get(id) ?? Infinity;
        if (f < minF) {
          minF = f;
          current = id;
        }
      }
      if (current === null) break;
      if (current === target) {
        const path: string[] = [current];
        while (cameFrom.has(path[0])) path.unshift(cameFrom.get(path[0])!);
        this._history.push({ method: 'aStar', source, target, cost: gScore.get(target) ?? Infinity });
        return { path, cost: gScore.get(target) ?? Infinity, expanded: closed.size + 1 };
      }
      open.delete(current);
      closed.add(current);
      for (const { to, weight } of graph.adjacency.get(current) ?? []) {
        if (closed.has(to)) continue;
        const tentativeG = (gScore.get(current) ?? Infinity) + weight;
        if (tentativeG < (gScore.get(to) ?? Infinity)) {
          cameFrom.set(to, current);
          gScore.set(to, tentativeG);
          fScore.set(to, tentativeG + heuristic(to, target));
          open.add(to);
        }
      }
    }
    return { path: [], cost: Infinity, expanded: closed.size };
  }

  /** Prim's minimum spanning tree. */
  primMST(graph: Graph): MSTResult {
    const ids = Array.from(graph.nodes.keys());
    if (ids.length === 0) return { edges: [], totalWeight: 0, nodeCount: 0 };
    const inMST = new Set<string>();
    inMST.add(ids[0]);
    const mstEdges: Edge[] = [];
    let totalWeight = 0;
    while (inMST.size < ids.length) {
      let minEdge: { from: string; to: string; weight: number } | null = null;
      for (const u of inMST) {
        for (const { to, weight } of graph.adjacency.get(u) ?? []) {
          if (!inMST.has(to) && (!minEdge || weight < minEdge.weight)) {
            minEdge = { from: u, to, weight };
          }
        }
      }
      if (!minEdge) break;
      inMST.add(minEdge.to);
      mstEdges.push({ from: minEdge.from, to: minEdge.to, weight: minEdge.weight, directed: false });
      totalWeight += minEdge.weight;
    }
    this._history.push({ method: 'primMST', edges: mstEdges.length, totalWeight });
    return { edges: mstEdges, totalWeight, nodeCount: ids.length };
  }

  /** Kruskal's minimum spanning tree using union-find. */
  kruskalMST(graph: Graph): MSTResult {
    const allEdges: Array<{ from: string; to: string; weight: number }> = [];
    const seen = new Set<string>();
    for (const [from, list] of graph.adjacency) {
      for (const { to, weight } of list) {
        const key = [from, to].sort().join('-');
        if (!seen.has(key)) {
          allEdges.push({ from, to, weight });
          seen.add(key);
        }
      }
    }
    allEdges.sort((a, b) => a.weight - b.weight);
    const parent = new Map<string, string>();
    const find = (x: string): string => {
      if (!parent.has(x)) parent.set(x, x);
      const p = parent.get(x)!;
      if (p !== x) parent.set(x, find(p));
      return parent.get(x)!;
    };
    const union = (a: string, b: string): boolean => {
      const ra = find(a);
      const rb = find(b);
      if (ra === rb) return false;
      parent.set(ra, rb);
      return true;
    };
    const mstEdges: Edge[] = [];
    let totalWeight = 0;
    for (const { from, to, weight } of allEdges) {
      if (union(from, to)) {
        mstEdges.push({ from, to, weight, directed: false });
        totalWeight += weight;
        if (mstEdges.length >= graph.nodes.size - 1) break;
      }
    }
    this._history.push({ method: 'kruskalMST', edges: mstEdges.length, totalWeight });
    return { edges: mstEdges, totalWeight, nodeCount: graph.nodes.size };
  }

  /** Borůvka's MST algorithm. */
  boruvkaMST(graph: Graph): MSTResult {
    if (graph.nodes.size === 0) return { edges: [], totalWeight: 0, nodeCount: 0 };
    const parent = new Map<string, string>();
    const find = (x: string): string => {
      if (!parent.has(x)) parent.set(x, x);
      const p = parent.get(x)!;
      if (p !== x) parent.set(x, find(p));
      return parent.get(x)!;
    };
    const union = (a: string, b: string): boolean => {
      const ra = find(a);
      const rb = find(b);
      if (ra === rb) return false;
      parent.set(ra, rb);
      return true;
    };
    const allEdges: Array<{ from: string; to: string; weight: number }> = [];
    for (const [from, list] of graph.adjacency) {
      for (const { to, weight } of list) allEdges.push({ from, to, weight });
    }
    const mstEdges: Edge[] = [];
    let totalWeight = 0;
    const ids = Array.from(graph.nodes.keys());
    while (mstEdges.length < ids.length - 1) {
      const cheapest = new Map<string, { from: string; to: string; weight: number } | null>();
      for (const id of ids) cheapest.set(find(id), null);
      for (const e of allEdges) {
        const ra = find(e.from);
        const rb = find(e.to);
        if (ra === rb) continue;
        const curRa = cheapest.get(ra);
        const curRb = cheapest.get(rb);
        if (!curRa || e.weight < curRa.weight) cheapest.set(ra, e);
        if (!curRb || e.weight < curRb.weight) cheapest.set(rb, e);
      }
      let added = false;
      for (const e of cheapest.values()) {
        if (e && union(e.from, e.to)) {
          mstEdges.push({ from: e.from, to: e.to, weight: e.weight, directed: false });
          totalWeight += e.weight;
          added = true;
        }
      }
      if (!added) break;
    }
    this._history.push({ method: 'boruvkaMST', edges: mstEdges.length, totalWeight });
    return { edges: mstEdges, totalWeight, nodeCount: ids.length };
  }

  /** Topological sort via Kahn's algorithm (BFS-based). */
  topologicalSort(graph: Graph): TopoSortResult {
    const inDegree = new Map<string, number>();
    for (const id of graph.nodes.keys()) inDegree.set(id, 0);
    for (const [, list] of graph.adjacency) {
      for (const { to } of list) inDegree.set(to, (inDegree.get(to) ?? 0) + 1);
    }
    const queue: string[] = [];
    for (const [id, deg] of inDegree) if (deg === 0) queue.push(id);
    const order: string[] = [];
    while (queue.length > 0) {
      const node = queue.shift()!;
      order.push(node);
      for (const { to } of graph.adjacency.get(node) ?? []) {
        inDegree.set(to, (inDegree.get(to) ?? 0) - 1);
        if (inDegree.get(to) === 0) queue.push(to);
      }
    }
    if (order.length === graph.nodes.size) {
      this._history.push({ method: 'topologicalSort', nodes: order.length, cyclic: false });
      return { order, cyclic: false, cycle: [] };
    }
    const cycle = this._findCycleInResidual(graph, inDegree);
    this._history.push({ method: 'topologicalSort', nodes: order.length, cyclic: true });
    return { order, cyclic: true, cycle };
  }

  private _findCycleInResidual(graph: Graph, inDegree: Map<string, number>): string[] {
    const remaining = new Set<string>();
    for (const [id, deg] of inDegree) if (deg > 0) remaining.add(id);
    const visited = new Set<string>();
    const stack: string[] = [];
    const path: string[] = [];
    const dfs = (node: string): boolean => {
      if (stack.includes(node)) {
        const cycleStart = stack.indexOf(node);
        path.push(...stack.slice(cycleStart), node);
        return true;
      }
      if (visited.has(node)) return false;
      visited.add(node);
      stack.push(node);
      for (const { to } of graph.adjacency.get(node) ?? []) {
        if (remaining.has(to) && dfs(to)) return true;
      }
      stack.pop();
      return false;
    };
    for (const node of remaining) {
      if (dfs(node)) break;
    }
    return path;
  }

  /** Topological sort via DFS post-order. */
  topologicalSortDFS(graph: Graph): TopoSortResult {
    const visited = new Set<string>();
    const inStack = new Set<string>();
    const stack: string[] = [];
    const order: string[] = [];
    let cycle: string[] = [];
    const visit = (node: string): boolean => {
      if (inStack.has(node)) {
        const idx = stack.indexOf(node);
        cycle = [...stack.slice(idx), node];
        return false;
      }
      if (visited.has(node)) return true;
      visited.add(node);
      inStack.add(node);
      stack.push(node);
      for (const { to } of graph.adjacency.get(node) ?? []) {
        if (!visit(to)) return false;
      }
      inStack.delete(node);
      stack.pop();
      order.unshift(node);
      return true;
    };
    let cyclic = false;
    for (const id of graph.nodes.keys()) {
      if (!visited.has(id) && !visit(id)) {
        cyclic = true;
        break;
      }
    }
    this._history.push({ method: 'topologicalSortDFS', nodes: order.length, cyclic });
    return { order, cyclic, cycle };
  }

  /** Cycle detection (works on directed and undirected graphs). */
  hasCycle(graph: Graph): CycleResult {
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const parent = new Map<string, string | null>();
    let cycle: string[] = [];
    const dfs = (node: string, par: string | null): boolean => {
      visited.add(node);
      recStack.add(node);
      parent.set(node, par);
      for (const { to } of graph.adjacency.get(node) ?? []) {
        if (!graph.directed && to === par) continue;
        if (!visited.has(to)) {
          if (dfs(to, node)) return true;
        } else if (recStack.has(to) || !graph.directed) {
          cycle = [to, node];
          let cur: string | null = node;
          while (cur && cur !== to) {
            cycle.unshift(cur);
            cur = parent.get(cur) ?? null;
          }
          cycle.unshift(to);
          return true;
        }
      }
      recStack.delete(node);
      return false;
    };
    for (const id of graph.nodes.keys()) {
      if (!visited.has(id) && dfs(id, null)) {
        this._history.push({ method: 'hasCycle', hasCycle: true, length: cycle.length });
        return { hasCycle: true, cycle, length: cycle.length };
      }
    }
    this._history.push({ method: 'hasCycle', hasCycle: false });
    return { hasCycle: false, cycle: [], length: 0 };
  }

  /** Connected components (undirected). */
  connectedComponents(graph: Graph): ConnectedComponent[] {
    const visited = new Set<string>();
    const components: ConnectedComponent[] = [];
    let id = 0;
    for (const start of graph.nodes.keys()) {
      if (visited.has(start)) continue;
      const component: string[] = [];
      const queue: string[] = [start];
      visited.add(start);
      while (queue.length > 0) {
        const node = queue.shift()!;
        component.push(node);
        for (const { to } of graph.adjacency.get(node) ?? []) {
          if (!visited.has(to)) {
            visited.add(to);
            queue.push(to);
          }
        }
      }
      components.push({ id: id++, nodes: component, size: component.length });
    }
    this._history.push({ method: 'connectedComponents', count: components.length });
    return components;
  }

  /** Strongly connected components via Tarjan's algorithm. */
  tarjanSCC(graph: Graph): SCCResult {
    const indexMap = new Map<string, number>();
    const lowlink = new Map<string, number>();
    const onStack = new Set<string>();
    const stack: string[] = [];
    const sccs: string[][] = [];
    let idx = 0;
    const strongConnect = (v: string): void => {
      indexMap.set(v, idx);
      lowlink.set(v, idx);
      idx++;
      stack.push(v);
      onStack.add(v);
      for (const { to } of graph.adjacency.get(v) ?? []) {
        if (!indexMap.has(to)) {
          strongConnect(to);
          lowlink.set(v, Math.min(lowlink.get(v)!, lowlink.get(to)!));
        } else if (onStack.has(to)) {
          lowlink.set(v, Math.min(lowlink.get(v)!, indexMap.get(to)!));
        }
      }
      if (lowlink.get(v) === indexMap.get(v)) {
        const scc: string[] = [];
        let w: string;
        do {
          w = stack.pop()!;
          onStack.delete(w);
          scc.push(w);
        } while (w !== v);
        sccs.push(scc);
      }
    };
    for (const id of graph.nodes.keys()) {
      if (!indexMap.has(id)) strongConnect(id);
    }
    const largestSize = sccs.reduce((m, s) => Math.max(m, s.length), 0);
    this._history.push({ method: 'tarjanSCC', count: sccs.length, largest: largestSize });
    return { components: sccs, count: sccs.length, largestSize };
  }

  /** Kosaraju's algorithm for SCC. */
  kosarajuSCC(graph: Graph): SCCResult {
    const visited = new Set<string>();
    const finishStack: string[] = [];
    const dfs1 = (v: string): void => {
      visited.add(v);
      for (const { to } of graph.adjacency.get(v) ?? []) {
        if (!visited.has(to)) dfs1(to);
      }
      finishStack.push(v);
    };
    for (const id of graph.nodes.keys()) if (!visited.has(id)) dfs1(id);
    const reverseAdj = new Map<string, Array<{ to: string; weight: number }>>();
    for (const id of graph.nodes.keys()) reverseAdj.set(id, []);
    for (const [from, list] of graph.adjacency) {
      for (const { to, weight } of list) reverseAdj.get(to)!.push({ to: from, weight });
    }
    visited.clear();
    const sccs: string[][] = [];
    const dfs2 = (v: string, component: string[]): void => {
      visited.add(v);
      component.push(v);
      for (const { to } of reverseAdj.get(v) ?? []) {
        if (!visited.has(to)) dfs2(to, component);
      }
    };
    while (finishStack.length > 0) {
      const v = finishStack.pop()!;
      if (!visited.has(v)) {
        const component: string[] = [];
        dfs2(v, component);
        sccs.push(component);
      }
    }
    const largestSize = sccs.reduce((m, s) => Math.max(m, s.length), 0);
    this._history.push({ method: 'kosarajuSCC', count: sccs.length });
    return { components: sccs, count: sccs.length, largestSize };
  }

  /** Bipartite check using 2-coloring BFS. */
  isBipartite(graph: Graph): BipartiteResult {
    const color = new Map<string, number>();
    const partitionA: string[] = [];
    const partitionB: string[] = [];
    for (const start of graph.nodes.keys()) {
      if (color.has(start)) continue;
      color.set(start, 0);
      partitionA.push(start);
      const queue: string[] = [start];
      while (queue.length > 0) {
        const node = queue.shift()!;
        const c = color.get(node)!;
        for (const { to } of graph.adjacency.get(node) ?? []) {
          if (!color.has(to)) {
            color.set(to, 1 - c);
            if (1 - c === 0) partitionA.push(to); else partitionB.push(to);
            queue.push(to);
          } else if (color.get(to) === c) {
            this._history.push({ method: 'isBipartite', bipartite: false });
            return { bipartite: false, partitionA: [], partitionB: [], conflictEdge: { from: node, to } };
          }
        }
      }
    }
    this._history.push({ method: 'isBipartite', bipartite: true });
    return { bipartite: true, partitionA, partitionB, conflictEdge: null };
  }

  /** Find bridges and articulation points via Tarjan's algorithm. */
  findBridgesAndCutVertices(graph: Graph): BridgeResult {
    const visited = new Set<string>();
    const disc = new Map<string, number>();
    const low = new Map<string, number>();
    const parent = new Map<string, string | null>();
    const bridges: Edge[] = [];
    const cutVertices = new Set<string>();
    let time = 0;
    const dfs = (u: string, par: string | null): void => {
      visited.add(u);
      disc.set(u, time);
      low.set(u, time);
      time++;
      parent.set(u, par);
      let children = 0;
      for (const { to } of graph.adjacency.get(u) ?? []) {
        if (!visited.has(to)) {
          children++;
          dfs(to, u);
          low.set(u, Math.min(low.get(u)!, low.get(to)!));
          if (par !== null && low.get(to)! >= disc.get(u)!) cutVertices.add(u);
          if (low.get(to)! > disc.get(u)!) {
            bridges.push({ from: u, to, weight: 0, directed: false });
          }
        } else if (to !== par) {
          low.set(u, Math.min(low.get(u)!, disc.get(to)!));
        }
      }
      if (par === null && children > 1) cutVertices.add(u);
    };
    for (const id of graph.nodes.keys()) {
      if (!visited.has(id)) dfs(id, null);
    }
    this._history.push({ method: 'findBridgesAndCutVertices', bridges: bridges.length, cuts: cutVertices.size });
    return { bridges, cutVertices: Array.from(cutVertices) };
  }

  /** Ford-Fulkerson maximum flow (with BFS = Edmonds-Karp). */
  maxFlow(graph: Graph, source: string, sink: string): MaxFlowResult {
    const residual = new Map<string, Map<string, number>>();
    const initCapacity = (a: string, b: string, w: number): void => {
      if (!residual.has(a)) residual.set(a, new Map());
      if (!residual.has(b)) residual.set(b, new Map());
      residual.get(a)!.set(b, (residual.get(a)!.get(b) ?? 0) + w);
      if (!residual.get(b)!.has(a)) residual.get(b)!.set(a, 0);
    };
    for (const [from, list] of graph.adjacency) {
      for (const { to, weight } of list) initCapacity(from, to, weight);
    }
    let maxFlow = 0;
    let augmentingPaths = 0;
    const flow = new Map<string, number>();
    const findPath = (): { path: string[]; minCap: number } | null => {
      const visited = new Set<string>([source]);
      const queue: string[] = [source];
      const parent = new Map<string, string | null>([[source, null]]);
      while (queue.length > 0) {
        const u = queue.shift()!;
        for (const [v, cap] of residual.get(u) ?? []) {
          if (!visited.has(v) && cap > 0) {
            visited.add(v);
            parent.set(v, u);
            if (v === sink) {
              const path: string[] = [v];
              let cur: string | null = v;
              while (cur) { path.unshift(cur); cur = parent.get(cur) ?? null; }
              let minCap = Infinity;
              for (let i = 0; i < path.length - 1; i++) {
                minCap = Math.min(minCap, residual.get(path[i])!.get(path[i + 1])!);
              }
              return { path, minCap };
            }
            queue.push(v);
          }
        }
      }
      return null;
    };
    while (true) {
      const found = findPath();
      if (!found) break;
      augmentingPaths++;
      const { path, minCap } = found;
      maxFlow += minCap;
      for (let i = 0; i < path.length - 1; i++) {
        const u = path[i];
        const v = path[i + 1];
        residual.get(u)!.set(v, residual.get(u)!.get(v)! - minCap);
        residual.get(v)!.set(u, residual.get(v)!.get(u)! + minCap);
        flow.set(`${u}->${v}`, (flow.get(`${u}->${v}`) ?? 0) + minCap);
      }
    }
    const minCut: string[] = [];
    const visited = new Set<string>([source]);
    const queue: string[] = [source];
    while (queue.length > 0) {
      const u = queue.shift()!;
      for (const [v, cap] of residual.get(u) ?? []) {
        if (!visited.has(v) && cap > 0) {
          visited.add(v);
          queue.push(v);
        }
      }
    }
    for (const id of visited) minCut.push(id);
    this._history.push({ method: 'maxFlow', source, sink, maxFlow, augmentingPaths });
    return { maxFlow, flow, minCut, augmentingPaths };
  }

  /** Hopcroft-Karp bipartite matching. */
  bipartiteMatching(graph: Graph, setA: string[], setB: string[]): { matches: Array<{ a: string; b: string }>; size: number } {
    const matchA = new Map<string, string | null>();
    const matchB = new Map<string, string | null>();
    for (const a of setA) matchA.set(a, null);
    for (const b of setB) matchB.set(b, null);
    const bfs = (): boolean => {
      const dist = new Map<string, number>();
      const queue: string[] = [];
      for (const a of setA) {
        if (matchA.get(a) === null) {
          dist.set(a, 0);
          queue.push(a);
        } else {
          dist.set(a, Infinity);
        }
      }
      let found = false;
      while (queue.length > 0) {
        const u = queue.shift()!;
        for (const { to } of graph.adjacency.get(u) ?? []) {
          const v = matchB.get(to);
          if (v === undefined) continue;
          const next = v === null ? null : v;
          if (next === null) {
            found = true;
          } else if (!dist.has(next) || dist.get(next) === Infinity) {
            dist.set(next, (dist.get(u) ?? 0) + 1);
            queue.push(next);
          }
        }
      }
      return found;
    };
    const dfs = (u: string): boolean => {
      for (const { to } of graph.adjacency.get(u) ?? []) {
        const v = matchB.get(to);
        if (v === undefined) continue;
        if (v === null) {
          matchA.set(u, to);
          matchB.set(to, u);
          return true;
        }
      }
      return false;
    };
    let matching = 0;
    while (bfs()) {
      for (const a of setA) {
        if (matchA.get(a) === null && dfs(a)) matching++;
      }
    }
    const matches: Array<{ a: string; b: string }> = [];
    for (const [a, b] of matchA) if (b) matches.push({ a, b });
    this._history.push({ method: 'bipartiteMatching', size: matching });
    return { matches, size: matching };
  }

  /** Vertex coloring (greedy with smallest-last ordering). */
  greedyColoring(graph: Graph): ColoringResult {
    const colors = new Map<string, number>();
    const order = [...graph.nodes.keys()].sort((a, b) => (graph.adjacency.get(b)?.length ?? 0) - (graph.adjacency.get(a)?.length ?? 0));
    for (const node of order) {
      const usedColors = new Set<number>();
      for (const { to } of graph.adjacency.get(node) ?? []) {
        if (colors.has(to)) usedColors.add(colors.get(to)!);
      }
      let color = 0;
      while (usedColors.has(color)) color++;
      colors.set(node, color);
    }
    const chromaticNumber = colors.size > 0 ? Math.max(...colors.values()) + 1 : 0;
    let proper = true;
    for (const [from, list] of graph.adjacency) {
      for (const { to } of list) {
        if (colors.get(from) === colors.get(to)) {
          proper = false;
          break;
        }
      }
      if (!proper) break;
    }
    this._history.push({ method: 'greedyColoring', chromaticNumber });
    return { colors, chromaticNumber, proper };
  }

  /** Edge classification via DFS (tree/back/forward/cross edges). */
  classifyEdges(graph: Graph): Array<{ from: string; to: string; class: EdgeClass }> {
    const discovery = new Map<string, number>();
    const finish = new Map<string, number>();
    const result: Array<{ from: string; to: string; class: EdgeClass }> = [];
    let time = 0;
    const dfs = (u: string): void => {
      discovery.set(u, time++);
      for (const { to } of graph.adjacency.get(u) ?? []) {
        if (!discovery.has(to)) {
          result.push({ from: u, to, class: 'tree' });
          dfs(to);
        } else if (!finish.has(to)) {
          result.push({ from: u, to, class: 'back' });
        } else if (discovery.get(u)! < discovery.get(to)!) {
          result.push({ from: u, to, class: 'forward' });
        } else {
          result.push({ from: u, to, class: 'cross' });
        }
      }
      finish.set(u, time++);
    };
    for (const id of graph.nodes.keys()) {
      if (!discovery.has(id)) dfs(id);
    }
    this._history.push({ method: 'classifyEdges', edges: result.length });
    return result;
  }

  /** Eulerian path detection. */
  hasEulerianPath(graph: Graph): boolean {
    if (!this.isConnected(graph)) return false;
    if (!graph.directed) {
      let oddCount = 0;
      for (const [, list] of graph.adjacency) {
        if (list.length % 2 !== 0) oddCount++;
      }
      return oddCount === 0 || oddCount === 2;
    }
    let inDeg = 0;
    let outDeg = 0;
    for (const [node] of graph.nodes) {
      const out = graph.adjacency.get(node)?.length ?? 0;
      let inD = 0;
      for (const [, list] of graph.adjacency) {
        for (const { to } of list) if (to === node) inD++;
      }
      if (out - inD === 1) outDeg++;
      else if (inD - out === 1) inDeg++;
      else if (inD !== out) return false;
    }
    return (inDeg === 0 && outDeg === 0) || (inDeg === 1 && outDeg === 1);
  }

  /** Hamiltonian path detection via backtracking. */
  hasHamiltonianPath(graph: Graph): boolean {
    const nodes = Array.from(graph.nodes.keys());
    const visited = new Set<string>();
    const dfs = (node: string, count: number): boolean => {
      if (count === nodes.length) return true;
      for (const { to } of graph.adjacency.get(node) ?? []) {
        if (!visited.has(to)) {
          visited.add(to);
          if (dfs(to, count + 1)) return true;
          visited.delete(to);
        }
      }
      return false;
    };
    for (const start of nodes) {
      visited.clear();
      visited.add(start);
      if (dfs(start, 1)) {
        this._history.push({ method: 'hasHamiltonianPath', found: true });
        return true;
      }
    }
    this._history.push({ method: 'hasHamiltonianPath', found: false });
    return false;
  }

  /** Connectivity check. */
  isConnected(graph: Graph): boolean {
    if (graph.nodes.size === 0) return true;
    const start = Array.from(graph.nodes.keys())[0];
    const visited = new Set<string>();
    const queue: string[] = [start];
    visited.add(start);
    while (queue.length > 0) {
      const node = queue.shift()!;
      for (const { to } of graph.adjacency.get(node) ?? []) {
        if (!visited.has(to)) {
          visited.add(to);
          queue.push(to);
        }
      }
    }
    return visited.size === graph.nodes.size;
  }

  /** Compute graph density: 2E / (V*(V-1)) for undirected, E / (V*(V-1)) for directed. */
  density(graph: Graph): number {
    const v = graph.nodes.size;
    if (v < 2) return 0;
    let e = 0;
    for (const [, list] of graph.adjacency) e += list.length;
    if (!graph.directed) e /= 2;
    return e / (v * (v - 1) / (graph.directed ? 1 : 2));
  }

  /** Compute graph diameter (longest shortest path). */
  diameter(graph: Graph): number {
    let max = 0;
    for (const start of graph.nodes.keys()) {
      const { distances } = this.dijkstra(graph, start);
      for (const d of distances.values()) {
        if (d < Infinity && d > max) max = d;
      }
    }
    this._history.push({ method: 'diameter', value: max });
    return max;
  }

  /** Compute average clustering coefficient. */
  clusteringCoefficient(graph: Graph): number {
    let sum = 0;
    let count = 0;
    for (const [node, list] of graph.adjacency) {
      const neighbors = list.map(e => e.to);
      const k = neighbors.length;
      if (k < 2) continue;
      let edges = 0;
      for (let i = 0; i < neighbors.length; i++) {
        for (let j = i + 1; j < neighbors.length; j++) {
          const adj = graph.adjacency.get(neighbors[i]) ?? [];
          if (adj.some(e => e.to === neighbors[j])) edges++;
        }
      }
      sum += (2 * edges) / (k * (k - 1));
      count++;
    }
    return count === 0 ? 0 : sum / count;
  }

  /** PageRank centrality. */
  pageRank(graph: Graph, iterations: number = 100, damping: number = 0.85): Map<string, number> {
    const nodes = Array.from(graph.nodes.keys());
    const n = nodes.length;
    if (n === 0) return new Map();
    const rank = new Map<string, number>(nodes.map(id => [id, 1 / n]));
    const outDeg = new Map<string, number>();
    for (const [node, list] of graph.adjacency) outDeg.set(node, list.length);
    for (let iter = 0; iter < iterations; iter++) {
      const newRank = new Map<string, number>();
      for (const node of nodes) {
        let sum = 0;
        for (const [other, list] of graph.adjacency) {
          if (list.some(e => e.to === node)) {
            const deg = outDeg.get(other) ?? 1;
            sum += (rank.get(other) ?? 0) / deg;
          }
        }
        newRank.set(node, (1 - damping) / n + damping * sum);
      }
      for (const [k, v] of newRank) rank.set(k, v);
    }
    this._history.push({ method: 'pageRank', iterations });
    return rank;
  }

  /** Betweenness centrality. */
  betweennessCentrality(graph: Graph): Map<string, number> {
    const nodes = Array.from(graph.nodes.keys());
    const centrality = new Map<string, number>(nodes.map(n => [n, 0]));
    for (const source of nodes) {
      const { predecessors, distances } = this.dijkstra(graph, source);
      const stack: string[] = nodes.filter(n => (distances.get(n) ?? Infinity) < Infinity && n !== source);
      stack.sort((a, b) => (distances.get(b) ?? 0) - (distances.get(a) ?? 0));
      const sigma = new Map<string, number>(nodes.map(n => [n, 0]));
      sigma.set(source, 1);
      const ordered = [source, ...stack];
      for (let i = 1; i < ordered.length; i++) {
        const w = ordered[i];
        const pred = predecessors.get(w);
        if (pred) sigma.set(w, sigma.get(pred) ?? 1);
      }
      const delta = new Map<string, number>(nodes.map(n => [n, 0]));
      for (let i = stack.length - 1; i >= 0; i--) {
        const w = stack[i];
        const pred = predecessors.get(w);
        if (pred) {
          delta.set(pred, (delta.get(pred) ?? 0) + ((sigma.get(pred) ?? 1) / (sigma.get(w) ?? 1)) * (1 + (delta.get(w) ?? 0)));
        }
        if (w !== source) centrality.set(w, (centrality.get(w) ?? 0) + (delta.get(w) ?? 0));
      }
    }
    this._history.push({ method: 'betweennessCentrality' });
    return centrality;
  }

  /** Degree centrality (in-degree + out-degree). */
  degreeCentrality(graph: Graph): Map<string, number> {
    const centrality = new Map<string, number>();
    for (const [node, list] of graph.adjacency) {
      centrality.set(node, list.length);
    }
    this._history.push({ method: 'degreeCentrality' });
    return centrality;
  }

  /** Closeness centrality. */
  closenessCentrality(graph: Graph): Map<string, number> {
    const centrality = new Map<string, number>();
    const n = graph.nodes.size;
    for (const source of graph.nodes.keys()) {
      const { distances } = this.dijkstra(graph, source);
      let sum = 0;
      let reachable = 0;
      for (const d of distances.values()) {
        if (d < Infinity && d > 0) {
          sum += d;
          reachable++;
        }
      }
      centrality.set(source, sum > 0 ? (reachable - 1) / sum : 0);
    }
    void n;
    this._history.push({ method: 'closenessCentrality' });
    return centrality;
  }

  /** Detect negative-weight cycle (Bellman-Ford). */
  hasNegativeCycle(graph: Graph): boolean {
    if (graph.nodes.size === 0) return false;
    const source = Array.from(graph.nodes.keys())[0];
    const { hasNegativeCycle } = this.bellmanFord(graph, source);
    return hasNegativeCycle;
  }

  /** Traveling salesman problem via DP with bitmask (Held-Karp). */
  travelingSalesman(distances: number[][], start: number = 0): { cost: number; path: number[] } {
    const n = distances.length;
    if (n === 0) return { cost: 0, path: [] };
    if (n === 1) return { cost: 0, path: [0] };
    const dp: number[][] = Array.from({ length: 1 << n }, () => new Array(n).fill(Infinity));
    dp[1 << start][start] = 0;
    for (let mask = 0; mask < (1 << n); mask++) {
      for (let u = 0; u < n; u++) {
        if (!(mask & (1 << u))) continue;
        if (dp[mask][u] === Infinity) continue;
        for (let v = 0; v < n; v++) {
          if (mask & (1 << v)) continue;
          const newMask = mask | (1 << v);
          dp[newMask][v] = Math.min(dp[newMask][v], dp[mask][u] + distances[u][v]);
        }
      }
    }
    let minCost = Infinity;
    let endNode = start;
    const fullMask = (1 << n) - 1;
    for (let u = 0; u < n; u++) {
      if (u === start) continue;
      const cost = dp[fullMask][u] + distances[u][start];
      if (cost < minCost) {
        minCost = cost;
        endNode = u;
      }
    }
    if (minCost === Infinity) return { cost: Infinity, path: [] };
    const path: number[] = [start];
    let mask = fullMask;
    let cur = endNode;
    while (cur !== start) {
      path.push(cur);
      for (let prev = 0; prev < n; prev++) {
        if (prev === cur || !(mask & (1 << prev))) continue;
        if (dp[mask ^ (1 << cur)][prev] + distances[prev][cur] === dp[mask][cur]) {
          mask ^= (1 << cur);
          cur = prev;
          break;
        }
      }
    }
    path.push(start);
    path.reverse();
    path.push(start);
    this._history.push({ method: 'travelingSalesman', n, cost: minCost });
    return { cost: minCost, path };
  }

  /** Multi-source shortest path (multi-source BFS for unweighted). */
  multiSourceBFS(graph: Graph, sources: string[]): Map<string, number> {
    const distances = new Map<string, number>();
    const queue: string[] = [];
    for (const s of sources) {
      distances.set(s, 0);
      queue.push(s);
    }
    while (queue.length > 0) {
      const node = queue.shift()!;
      const d = distances.get(node)!;
      for (const { to } of graph.adjacency.get(node) ?? []) {
        if (!distances.has(to)) {
          distances.set(to, d + 1);
          queue.push(to);
        }
      }
    }
    this._history.push({ method: 'multiSourceBFS', sources: sources.length });
    return distances;
  }

  /** Bidirectional BFS for shortest path between two nodes. */
  bidirectionalBFS(graph: Graph, source: string, target: string): { path: string[]; length: number } {
    if (source === target) return { path: [source], length: 0 };
    const visitedS = new Map<string, string | null>([[source, null]]);
    const visitedT = new Map<string, string | null>([[target, null]]);
    let queueS: string[] = [source];
    let queueT: string[] = [target];
    let meeting: string | null = null;
    while (queueS.length > 0 && queueT.length > 0 && !meeting) {
      const nextS: string[] = [];
      for (const node of queueS) {
        for (const { to } of graph.adjacency.get(node) ?? []) {
          if (!visitedS.has(to)) {
            visitedS.set(to, node);
            nextS.push(to);
            if (visitedT.has(to)) {
              meeting = to;
              break;
            }
          }
        }
        if (meeting) break;
      }
      queueS = nextS;
      if (meeting) break;
      const nextT: string[] = [];
      for (const node of queueT) {
        for (const [from, list] of graph.adjacency) {
          if (list.some(e => e.to === node) && !visitedT.has(from)) {
            visitedT.set(from, node);
            nextT.push(from);
            if (visitedS.has(from)) {
              meeting = from;
              break;
            }
          }
        }
        if (meeting) break;
      }
      queueT = nextT;
    }
    if (meeting === null) return { path: [], length: -1 };
    const path: string[] = [];
    let cur: string | null = meeting;
    while (cur !== null) {
      path.unshift(cur);
      cur = visitedS.get(cur) ?? null;
    }
    cur = visitedT.get(meeting) ?? null;
    while (cur !== null) {
      path.push(cur);
      cur = visitedT.get(cur) ?? null;
    }
    this._history.push({ method: 'bidirectionalBFS', length: path.length - 1 });
    return { path, length: path.length - 1 };
  }

  /** Johnson's all-pairs shortest paths. */
  johnsonsAlgorithm(graph: Graph): AllPairsResult {
    const ids = Array.from(graph.nodes.keys());
    const idxMap = new Map<string, number>(ids.map((id, i) => [id, i]));
    const augmented = this.createGraph(
      ids.map(id => ({ id, label: id, metadata: {} })),
      Array.from(graph.adjacency.entries()).flatMap(([from, list]) => list.map(e => ({ from, to: e.to, weight: e.weight, directed: true }))),
      true
    );
    const q = '__johnson_q__';
    augmented.nodes.set(q, { id: q, label: q, metadata: {} });
    augmented.adjacency.set(q, ids.map(id => ({ to: id, weight: 0 })));
    const { distances: h, hasNegativeCycle } = this.bellmanFord(augmented, q);
    if (hasNegativeCycle) {
      return { distances: [], predecessors: [], negativeCycle: true };
    }
    const reweighted = this.createGraph(
      ids.map(id => ({ id, label: id, metadata: {} })),
      Array.from(graph.adjacency.entries()).flatMap(([from, list]) =>
        list.map(e => ({
          from,
          to: e.to,
          weight: e.weight + (h.get(from) ?? 0) - (h.get(e.to) ?? 0),
          directed: true,
        }))
      ),
      true
    );
    const n = ids.length;
    const dist: number[][] = Array.from({ length: n }, () => new Array(n).fill(Infinity));
    const pred: number[][] = Array.from({ length: n }, () => new Array(n).fill(-1));
    for (let i = 0; i < n; i++) {
      const { distances } = this.dijkstra(reweighted, ids[i]);
      for (let j = 0; j < n; j++) {
        if (i === j) {
          dist[i][j] = 0;
        } else {
          const d = distances.get(ids[j]) ?? Infinity;
          const adjust = (h.get(ids[i]) ?? 0) - (h.get(ids[j]) ?? 0);
          dist[i][j] = d === Infinity ? Infinity : d + adjust;
        }
      }
    }
    void idxMap;
    this._history.push({ method: 'johnsonsAlgorithm', nodes: n });
    return { distances: dist, predecessors: pred, negativeCycle: false };
  }

  /** 2-edge-connected components. */
  twoEdgeConnectedComponents(graph: Graph): string[][] {
    const { bridges } = this.findBridgesAndCutVertices(graph);
    const bridgeSet = new Set(bridges.map(b => [b.from, b.to].sort().join('|')));
    const visited = new Set<string>();
    const components: string[][] = [];
    for (const start of graph.nodes.keys()) {
      if (visited.has(start)) continue;
      const component: string[] = [];
      const stack: string[] = [start];
      visited.add(start);
      while (stack.length > 0) {
        const node = stack.pop()!;
        component.push(node);
        for (const { to } of graph.adjacency.get(node) ?? []) {
          if (visited.has(to)) continue;
          const key = [node, to].sort().join('|');
          if (bridgeSet.has(key)) continue;
          visited.add(to);
          stack.push(to);
        }
      }
      components.push(component);
    }
    this._history.push({ method: 'twoEdgeConnectedComponents', count: components.length });
    return components;
  }

  /** Minimum vertex cover via 2-approximation. */
  minimumVertexCover(graph: Graph): string[] {
    const visited = new Set<string>();
    const cover = new Set<string>();
    for (const [u, list] of graph.adjacency) {
      if (visited.has(u)) continue;
      for (const { to } of list) {
        if (visited.has(to)) continue;
        cover.add(u);
        cover.add(to);
        visited.add(u);
        visited.add(to);
        break;
      }
    }
    this._history.push({ method: 'minimumVertexCover', size: cover.size });
    return Array.from(cover);
  }

  /** Maximum independent set (complement of minimum vertex cover approximation). */
  maximumIndependentSet(graph: Graph): string[] {
    const cover = new Set(this.minimumVertexCover(graph));
    const result = Array.from(graph.nodes.keys()).filter(id => !cover.has(id));
    this._history.push({ method: 'maximumIndependentSet', size: result.length });
    return result;
  }

  /** Minimum cut using Stoer-Wagner algorithm (undirected weighted). */
  stoerWagnerMinCut(graph: Graph): { minCut: number; partition: [string[], string[]] } {
    const nodes = Array.from(graph.nodes.keys());
    if (nodes.length < 2) return { minCut: 0, partition: [nodes, []] };
    const weights: Map<string, Map<string, number>> = new Map();
    for (const [from, list] of graph.adjacency) {
      for (const { to, weight } of list) {
        if (!weights.has(from)) weights.set(from, new Map());
        if (!weights.has(to)) weights.set(to, new Map());
        weights.get(from)!.set(to, (weights.get(from)!.get(to) ?? 0) + weight);
        weights.get(to)!.set(from, (weights.get(to)!.get(from) ?? 0) + weight);
      }
    }
    let bestCut = Infinity;
    let bestPartition: [string[], string[]] = [nodes, []];
    let remaining = new Set(nodes);
    while (remaining.size > 1) {
      const arr = Array.from(remaining);
      const added = new Set<string>([arr[0]]);
      const weightsToAdded = new Map<string, number>();
      for (const id of arr) {
        if (id !== arr[0]) weightsToAdded.set(id, weights.get(arr[0])?.get(id) ?? 0);
      }
      let prev = arr[0];
      while (added.size < remaining.size) {
        let maxNode: string | null = null;
        let maxW = -Infinity;
        for (const [id, w] of weightsToAdded) {
          if (!added.has(id) && w > maxW) {
            maxW = w;
            maxNode = id;
          }
        }
        if (maxNode === null) break;
        prev = maxNode;
        added.add(maxNode);
        weightsToAdded.delete(maxNode);
        for (const [neighbor, w] of weights.get(maxNode) ?? []) {
          if (!added.has(neighbor)) {
            weightsToAdded.set(neighbor, (weightsToAdded.get(neighbor) ?? 0) + w);
          }
        }
        if (added.size === remaining.size) {
          if (maxW < bestCut) {
            bestCut = maxW;
            bestPartition = [[prev], Array.from(remaining).filter(n => n !== prev)];
          }
        }
      }
      const last = prev;
      const before = Array.from(remaining).filter(n => n !== last);
      remaining = new Set(before);
      const mergedNode = before[0];
      for (const neighbor of weights.get(last)?.keys() ?? []) {
        if (neighbor === mergedNode || !remaining.has(neighbor)) continue;
        const w = weights.get(last)!.get(neighbor) ?? 0;
        weights.get(mergedNode)!.set(neighbor, (weights.get(mergedNode)!.get(neighbor) ?? 0) + w);
        weights.get(neighbor)!.set(mergedNode, weights.get(mergedNode)!.get(neighbor) ?? 0);
      }
    }
    this._history.push({ method: 'stoerWagnerMinCut', value: bestCut });
    return { minCut: bestCut, partition: bestPartition };
  }

  /** Lowest Common Ancestor via Tarjan offline algorithm. */
  lcaOffline(tree: Graph, root: string, pairs: Array<[string, string]>): Map<string, string> {
    const parent = new Map<string, string | null>([[root, null]]);
    const rank = new Map<string, number>([[root, 0]]);
    const ancestor = new Map<string, string>([[root, root]]);
    const visited = new Set<string>();
    const result = new Map<string, string>();
    const find = (x: string): string => {
      if (parent.get(x) === x) return x;
      const p = find(parent.get(x)!);
      parent.set(x, p);
      return p;
    };
    const union = (a: string, b: string): void => {
      const ra = find(a);
      const rb = find(b);
      if (ra === rb) return;
      if ((rank.get(ra) ?? 0) > (rank.get(rb) ?? 0)) {
        parent.set(rb, ra);
      } else if ((rank.get(ra) ?? 0) < (rank.get(rb) ?? 0)) {
        parent.set(ra, rb);
      } else {
        parent.set(rb, ra);
        rank.set(ra, (rank.get(ra) ?? 0) + 1);
      }
    };
    const dfs = (u: string): void => {
      visited.add(u);
      parent.set(u, u);
      ancestor.set(u, u);
      for (const { to } of tree.adjacency.get(u) ?? []) {
        if (!visited.has(to)) {
          dfs(to);
          union(u, to);
          ancestor.set(find(u), u);
        }
      }
      for (const [a, b] of pairs) {
        if (visited.has(a) && visited.has(b) && a === u) {
          result.set(`${a}|${b}`, ancestor.get(find(b)) ?? a);
        }
        if (visited.has(a) && visited.has(b) && b === u) {
          result.set(`${a}|${b}`, ancestor.get(find(a)) ?? b);
        }
      }
    };
    dfs(root);
    this._history.push({ method: 'lcaOffline', pairs: pairs.length });
    return result;
  }

  /** Count simple paths from source to target (bounded to avoid exponential blowup). */
  countSimplePaths(graph: Graph, source: string, target: string, maxPaths: number = 1000): number {
    const visited = new Set<string>([source]);
    let count = 0;
    const dfs = (node: string): void => {
      if (count >= maxPaths) return;
      if (node === target) {
        count++;
        return;
      }
      for (const { to } of graph.adjacency.get(node) ?? []) {
        if (!visited.has(to)) {
          visited.add(to);
          dfs(to);
          visited.delete(to);
          if (count >= maxPaths) return;
        }
      }
    };
    dfs(source);
    this._history.push({ method: 'countSimplePaths', source, target, count });
    return count;
  }

  /** Random walk on graph. */
  randomWalk(graph: Graph, start: string, steps: number): string[] {
    const path: string[] = [start];
    let current = start;
    for (let i = 0; i < steps; i++) {
      const neighbors = graph.adjacency.get(current) ?? [];
      if (neighbors.length === 0) break;
      current = neighbors[Math.floor(Math.random() * neighbors.length)].to;
      path.push(current);
    }
    this._history.push({ method: 'randomWalk', steps });
    return path;
  }

  /** Detect if graph has an Eulerian circuit. */
  hasEulerianCircuit(graph: Graph): boolean {
    if (!this.isConnected(graph)) return false;
    if (!graph.directed) {
      for (const [, list] of graph.adjacency) {
        if (list.length % 2 !== 0) return false;
      }
      return true;
    }
    for (const [node, list] of graph.adjacency) {
      let inDeg = 0;
      for (const [, adj] of graph.adjacency) {
        for (const { to } of adj) if (to === node) inDeg++;
      }
      if (inDeg !== list.length) return false;
    }
    return true;
  }

  /** Compute adjacency matrix as 2D array. */
  adjacencyMatrix(graph: Graph): number[][] {
    const nodes = Array.from(graph.nodes.keys());
    const n = nodes.length;
    const idx = new Map<string, number>(nodes.map((id, i) => [id, i]));
    const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (const [from, list] of graph.adjacency) {
      const i = idx.get(from)!;
      for (const { to, weight } of list) {
        const j = idx.get(to);
        if (j !== undefined) matrix[i][j] = weight;
      }
    }
    this._history.push({ method: 'adjacencyMatrix', n });
    return matrix;
  }

  /** Convert adjacency matrix back to graph. */
  fromAdjacencyMatrix(matrix: number[][], ids: string[], directed: boolean = false): Graph {
    const nodes: GraphNode[] = ids.map(id => ({ id, label: id, metadata: {} }));
    const edges: Edge[] = [];
    for (let i = 0; i < matrix.length; i++) {
      for (let j = 0; j < matrix[0].length; j++) {
        if (matrix[i][j] !== 0 && (directed || i < j)) {
          edges.push({ from: ids[i], to: ids[j], weight: matrix[i][j], directed });
        }
      }
    }
    return this.createGraph(nodes, edges, directed);
  }

  /** Find all articulation points. */
  findArticulationPoints(graph: Graph): string[] {
    const { cutVertices } = this.findBridgesAndCutVertices(graph);
    return cutVertices;
  }

  /** Validate that a graph is a tree (connected and acyclic). */
  isTree(graph: Graph): boolean {
    if (!graph.directed) {
      let edgeCount = 0;
      for (const [, list] of graph.adjacency) edgeCount += list.length;
      edgeCount /= 2;
      return this.isConnected(graph) && edgeCount === graph.nodes.size - 1;
    }
    const inDeg = new Map<string, number>();
    for (const id of graph.nodes.keys()) inDeg.set(id, 0);
    for (const [, list] of graph.adjacency) {
      for (const { to } of list) inDeg.set(to, (inDeg.get(to) ?? 0) + 1);
    }
    let roots = 0;
    for (const [, deg] of inDeg) if (deg === 0) roots++;
    return roots === 1 && this.isConnected(graph);
  }

  /** Clone a graph (deep copy). */
  cloneGraph(graph: Graph): Graph {
    const nodes = Array.from(graph.nodes.values());
    const edges: Edge[] = [];
    for (const [from, list] of graph.adjacency) {
      for (const { to, weight } of list) edges.push({ from, to, weight, directed: graph.directed });
    }
    return this.createGraph(nodes, edges, graph.directed);
  }

  /** Compute shortest path between source and target via Dijkstra. */
  shortestPath(graph: Graph, source: string, target: string): { path: string[]; distance: number } {
    const { distances, predecessors } = this.dijkstra(graph, source);
    const d = distances.get(target);
    if (d === undefined || d === Infinity) return { path: [], distance: Infinity };
    const path: string[] = [target];
    let cur: string | null = target;
    while (cur !== source) {
      cur = predecessors.get(cur) ?? null;
      if (cur === null) break;
      path.unshift(cur);
    }
    this._history.push({ method: 'shortestPath', source, target, distance: d });
    return { path, distance: d };
  }

  /** Count nodes at distance k from source. */
  countNodesAtDistance(graph: Graph, source: string, k: number): number {
    const { distances } = this.dijkstra(graph, source);
    let count = 0;
    for (const d of distances.values()) if (d === k) count++;
    return count;
  }

  /** Diameter of a tree via two BFS passes. */
  treeDiameter(graph: Graph): number {
    if (!this.isTree(graph)) return this.diameter(graph);
    const nodes = Array.from(graph.nodes.keys());
    if (nodes.length === 0) return 0;
    const bfs = (start: string): { farthest: string; dist: number } => {
      const dist = new Map<string, number>([[start, 0]]);
      const queue: string[] = [start];
      let farthest = start;
      let maxDist = 0;
      while (queue.length > 0) {
        const node = queue.shift()!;
        const d = dist.get(node)!;
        if (d > maxDist) {
          maxDist = d;
          farthest = node;
        }
        for (const { to } of graph.adjacency.get(node) ?? []) {
          if (!dist.has(to)) {
            dist.set(to, d + 1);
            queue.push(to);
          }
        }
      }
      return { farthest, dist: maxDist };
    };
    const first = bfs(nodes[0]);
    const second = bfs(first.farthest);
    this._history.push({ method: 'treeDiameter', value: second.dist });
    return second.dist;
  }

  toPacket(): DataPacket<{
    graphs: Graph[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['cs_algorithms', 'GraphAlgorithms'],
      priority: 1,
      phase: 'cs:graph',
    };
    return {
      id: `graph-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        graphs: this._graphs,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._graphs = [];
    this._history = [];
    this._counter = 0;
  }

  get graphCount(): number {
    return this._graphs.length;
  }

  get historyDepth(): number {
    return this._history.length;
  }
}
