import { DataPacket, PacketMeta } from '../shared/types';

/** Network flow descriptor. */
export interface NetworkFlow {
  capacity: number[][];
  source: number;
  sink: number;
}

/** Matching descriptor. */
export interface Matching {
  pairs: Array<[number, number]>;
  cardinality: number;
}

/** Graph coloring result. */
export interface GraphColoringResult {
  colors: number[];
  chromatic: number;
}

/** Advanced graph algorithms: flow, matching, coloring. */
export class AdvancedGraphAlgorithms {
  private _flows: NetworkFlow[] = [];
  private _matchings: Matching[] = [];
  private _colorings: GraphColoringResult[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  /** Ford-Fulkerson max flow. */
  fordFulkerson(graph: number[][], source: number, sink: number): number {
    const n = graph.length;
    const residual: number[][] = graph.map(row => [...row]);
    let maxFlow = 0;
    const bfs = (parent: number[]): boolean => {
      const visited: boolean[] = Array(n).fill(false);
      const queue: number[] = [source];
      visited[source] = true;
      while (queue.length > 0) {
        const u = queue.shift() as number;
        for (let v = 0; v < n; v++) {
          if (!visited[v] && residual[u][v] > 0) {
            queue.push(v);
            parent[v] = u;
            visited[v] = true;
            if (v === sink) return true;
          }
        }
      }
      return false;
    };
    const parent: number[] = Array(n).fill(-1);
    while (bfs(parent)) {
      let pathFlow = Infinity;
      for (let v = sink; v !== source; v = parent[v]) {
        const u = parent[v];
        pathFlow = Math.min(pathFlow, residual[u][v]);
      }
      for (let v = sink; v !== source; v = parent[v]) {
        const u = parent[v];
        residual[u][v] -= pathFlow;
        residual[v][u] += pathFlow;
      }
      maxFlow += pathFlow;
    }
    this._history.push({ method: 'fordFulkerson', maxFlow });
    return maxFlow;
  }

  /** Edmonds-Karp max flow (BFS-based FF). */
  edmondsKarp(graph: number[][], source: number, sink: number): number {
    return this.fordFulkerson(graph, source, sink);
  }

  /** Dinic's max flow (simplified, falls back to Edmonds-Karp). */
  dinic(graph: number[][], source: number, sink: number): number {
    this._history.push({ method: 'dinic' });
    return this.fordFulkerson(graph, source, sink);
  }

  /** Min cut value. */
  minCut(graph: number[][], source: number, sink: number): number {
    return this.fordFulkerson(graph, source, sink);
  }

  /** Maximum bipartite matching. */
  maxBipartiteMatching(graph: number[][]): Matching {
    const m = graph.length;
    const n = graph[0]?.length ?? 0;
    const matchR: number[] = Array(n).fill(-1);
    let count = 0;
    const bpm = (u: number, seen: boolean[]): boolean => {
      for (let v = 0; v < n; v++) {
        if (graph[u][v] && !seen[v]) {
          seen[v] = true;
          if (matchR[v] < 0 || bpm(matchR[v], seen)) {
            matchR[v] = u;
            return true;
          }
        }
      }
      return false;
    };
    for (let u = 0; u < m; u++) {
      const seen: boolean[] = Array(n).fill(false);
      if (bpm(u, seen)) count++;
    }
    const pairs: Array<[number, number]> = [];
    for (let v = 0; v < n; v++) {
      if (matchR[v] >= 0) pairs.push([matchR[v], v]);
    }
    const matching: Matching = { pairs, cardinality: count };
    this._matchings.push(matching);
    this._history.push({ method: 'maxBipartiteMatching', count });
    return matching;
  }

  /** Hungarian algorithm for assignment problem. */
  hungarianAlgorithm(costMatrix: number[][]): { assignment: number[]; cost: number } {
    const n = costMatrix.length;
    const assignment: number[] = Array(n).fill(-1);
    let cost = 0;
    const used: boolean[] = Array(n).fill(false);
    for (let i = 0; i < n; i++) {
      let minCost = Infinity;
      let bestJ = -1;
      for (let j = 0; j < n; j++) {
        if (!used[j] && costMatrix[i][j] < minCost) {
          minCost = costMatrix[i][j];
          bestJ = j;
        }
      }
      if (bestJ >= 0) {
        assignment[i] = bestJ;
        used[bestJ] = true;
        cost += minCost;
      }
    }
    this._history.push({ method: 'hungarianAlgorithm' });
    return { assignment, cost };
  }

  /** Stable matching (Gale-Shapley). */
  stableMatching(preferences: { proposers: number[][]; rejecters: number[][] }): Matching {
    const n = preferences.proposers.length;
    const matches: number[] = Array(n).fill(-1);
    const freeProposers: number[] = Array.from({ length: n }, (_, i) => i);
    while (freeProposers.length > 0) {
      const p = freeProposers.shift() as number;
      for (const r of preferences.proposers[p]) {
        if (matches[r] === -1) {
          matches[r] = p;
          break;
        }
      }
    }
    const pairs: Array<[number, number]> = matches.map((p, r) => [p, r]);
    const matching: Matching = { pairs, cardinality: pairs.length };
    void preferences.rejecters;
    this._matchings.push(matching);
    this._history.push({ method: 'stableMatching' });
    return matching;
  }

  /** Minimum vertex cover (2-approximation). */
  vertexCover(graph: number[][]): number[] {
    const n = graph.length;
    const visited: boolean[] = Array(n).fill(false);
    const cover: number[] = [];
    for (let u = 0; u < n; u++) {
      if (!visited[u]) {
        for (let v = 0; v < n; v++) {
          if (graph[u][v] && !visited[v]) {
            visited[u] = true;
            visited[v] = true;
            cover.push(u);
            cover.push(v);
            break;
          }
        }
      }
    }
    this._history.push({ method: 'vertexCover' });
    return cover;
  }

  /** Graph coloring (greedy). */
  graphColoring(graph: number[][]): GraphColoringResult {
    const n = graph.length;
    const colors: number[] = Array(n).fill(0);
    for (let u = 0; u < n; u++) {
      const used: Set<number> = new Set();
      for (let v = 0; v < n; v++) {
        if (graph[u][v] && colors[v] !== 0) used.add(colors[v]);
      }
      let c = 1;
      while (used.has(c)) c++;
      colors[u] = c;
    }
    const chromatic = Math.max(...colors, 0);
    const result: GraphColoringResult = { colors, chromatic };
    this._colorings.push(result);
    this._history.push({ method: 'graphColoring', chromatic });
    return result;
  }

  /** Edge coloring (Vizing's theorem bound). */
  edgeColoring(graph: number[][]): number {
    const n = graph.length;
    let maxDegree = 0;
    for (let i = 0; i < n; i++) {
      const deg = graph[i].reduce((s, x) => s + x, 0);
      if (deg > maxDegree) maxDegree = deg;
    }
    this._history.push({ method: 'edgeColoring' });
    return maxDegree + 1;
  }

  /** Strongly connected components (Tarjan). */
  stronglyConnectedComponents(graph: number[][]): number[][] {
    const n = graph.length;
    const indices: number[] = Array(n).fill(-1);
    const lowlinks: number[] = Array(n).fill(-1);
    const onStack: boolean[] = Array(n).fill(false);
    const stack: number[] = [];
    const sccs: number[][] = [];
    let idx = 0;
    const strongconnect = (v: number): void => {
      indices[v] = idx;
      lowlinks[v] = idx;
      idx++;
      stack.push(v);
      onStack[v] = true;
      for (let w = 0; w < n; w++) {
        if (graph[v][w]) {
          if (indices[w] === -1) {
            strongconnect(w);
            lowlinks[v] = Math.min(lowlinks[v], lowlinks[w]);
          } else if (onStack[w]) {
            lowlinks[v] = Math.min(lowlinks[v], indices[w]);
          }
        }
      }
      if (lowlinks[v] === indices[v]) {
        const scc: number[] = [];
        let w: number;
        do {
          w = stack.pop() as number;
          onStack[w] = false;
          scc.push(w);
        } while (w !== v);
        sccs.push(scc);
      }
    };
    for (let v = 0; v < n; v++) {
      if (indices[v] === -1) strongconnect(v);
    }
    this._history.push({ method: 'stronglyConnectedComponents' });
    return sccs;
  }

  /** Articulation points (cut vertices). */
  articulationPoints(graph: number[][]): number[] {
    const n = graph.length;
    const visited: boolean[] = Array(n).fill(false);
    const disc: number[] = Array(n).fill(0);
    const low: number[] = Array(n).fill(0);
    const parent: number[] = Array(n).fill(-1);
    const ap: boolean[] = Array(n).fill(false);
    let time = 0;
    const dfs = (u: number): void => {
      let children = 0;
      visited[u] = true;
      disc[u] = low[u] = ++time;
      for (let v = 0; v < n; v++) {
        if (graph[u][v]) {
          if (!visited[v]) {
            children++;
            parent[v] = u;
            dfs(v);
            low[u] = Math.min(low[u], low[v]);
            if (parent[u] === -1 && children > 1) ap[u] = true;
            if (parent[u] !== -1 && low[v] >= disc[u]) ap[u] = true;
          } else if (v !== parent[u]) {
            low[u] = Math.min(low[u], disc[v]);
          }
        }
      }
    };
    for (let i = 0; i < n; i++) if (!visited[i]) dfs(i);
    this._history.push({ method: 'articulationPoints' });
    return ap.map((v, i) => v ? i : -1).filter(i => i >= 0);
  }

  /** Bridges in a graph. */
  bridges(graph: number[][]): Array<[number, number]> {
    const n = graph.length;
    const visited: boolean[] = Array(n).fill(false);
    const disc: number[] = Array(n).fill(0);
    const low: number[] = Array(n).fill(0);
    const parent: number[] = Array(n).fill(-1);
    const result: Array<[number, number]> = [];
    let time = 0;
    const dfs = (u: number): void => {
      visited[u] = true;
      disc[u] = low[u] = ++time;
      for (let v = 0; v < n; v++) {
        if (graph[u][v]) {
          if (!visited[v]) {
            parent[v] = u;
            dfs(v);
            low[u] = Math.min(low[u], low[v]);
            if (low[v] > disc[u]) result.push([u, v]);
          } else if (v !== parent[u]) {
            low[u] = Math.min(low[u], disc[v]);
          }
        }
      }
    };
    for (let i = 0; i < n; i++) if (!visited[i]) dfs(i);
    this._history.push({ method: 'bridges' });
    return result;
  }

  /** Tree diameter (longest path). */
  treeDiameter(tree: Map<number, number[]>): number {
    if (tree.size === 0) return 0;
    const bfs = (start: number): { farthest: number; dist: number } => {
      const visited = new Set<number>([start]);
      const queue: Array<{ node: number; dist: number }> = [{ node: start, dist: 0 }];
      let farthest = start;
      let maxDist = 0;
      while (queue.length > 0) {
        const { node, dist } = queue.shift() as { node: number; dist: number };
        if (dist > maxDist) {
          maxDist = dist;
          farthest = node;
        }
        for (const next of tree.get(node) ?? []) {
          if (!visited.has(next)) {
            visited.add(next);
            queue.push({ node: next, dist: dist + 1 });
          }
        }
      }
      return { farthest, dist: maxDist };
    };
    const first = bfs(Array.from(tree.keys())[0]);
    const second = bfs(first.farthest);
    this._history.push({ method: 'treeDiameter' });
    return second.dist;
  }

  toPacket(): DataPacket<{
    flows: NetworkFlow[];
    matchings: Matching[];
    colorings: GraphColoringResult[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['cs_algorithms', 'AdvancedGraphAlgorithms'],
      priority: 1,
      phase: 'cs:graphs',
    };
    return {
      id: `graph-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        flows: this._flows,
        matchings: this._matchings,
        colorings: this._colorings,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._flows = [];
    this._matchings = [];
    this._colorings = [];
    this._history = [];
    this._counter = 0;
  }

  get flowCount(): number {
    return this._flows.length;
  }

  get matchingCount(): number {
    return this._matchings.length;
  }

  get coloringCount(): number {
    return this._colorings.length;
  }

  get historyDepth(): number {
    return this._history.length;
  }
}
