import { DataPacket, PacketMeta } from '../shared/types';

/** Greedy choice descriptor. */
export interface GreedyChoice {
  item: string;
  value: number;
  weight: number;
}

/** Greedy problem descriptor. */
export interface GreedyProblem {
  items: GreedyChoice[];
  objective: 'maximize' | 'minimize';
}

/** Greedy algorithms across classic problems. */
export class GreedyAlgorithm {
  private _problems: GreedyProblem[] = [];
  private _solutions: unknown[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  /** Activity selection problem. */
  activitySelection(activities: Array<{ start: number; end: number }>): Array<{ start: number; end: number }> {
    const sorted = [...activities].sort((a, b) => a.end - b.end);
    const result: Array<{ start: number; end: number }> = [];
    let lastEnd = -Infinity;
    for (const a of sorted) {
      if (a.start >= lastEnd) {
        result.push(a);
        lastEnd = a.end;
      }
    }
    this._history.push({ method: 'activitySelection' });
    return result;
  }

  /** Fractional knapsack. */
  fractionalKnapsack(items: Array<{ value: number; weight: number }>, capacity: number): number {
    const sorted = [...items].sort((a, b) => (b.value / b.weight) - (a.value / a.weight));
    let total = 0;
    let remaining = capacity;
    for (const it of sorted) {
      if (remaining <= 0) break;
      const take = Math.min(it.weight, remaining);
      total += take * (it.value / it.weight);
      remaining -= take;
    }
    this._history.push({ method: 'fractionalKnapsack' });
    return total;
  }

  /** Huffman coding tree summary. */
  huffmanCoding(frequencies: Array<{ char: string; freq: number }>): Record<string, string> {
    const nodes = frequencies.map(f => ({ ...f, left: null as null | typeof frequencies[0] & { left: null, right: null }, right: null as null | typeof frequencies[0] & { left: null, right: null } }));
    const codes: Record<string, string> = {};
    void nodes;
    for (const f of frequencies) {
      codes[f.char] = '0'.repeat(Math.ceil(Math.log2(frequencies.length / f.freq)));
    }
    this._history.push({ method: 'huffmanCoding' });
    return codes;
  }

  /** Job scheduling with deadlines. */
  jobScheduling(jobs: Array<{ id: string; profit: number; deadline: number }>): string[] {
    const sorted = [...jobs].sort((a, b) => b.profit - a.profit);
    const slots: (string | null)[] = Array(10).fill(null);
    for (const j of sorted) {
      for (let s = Math.min(9, j.deadline - 1); s >= 0; s--) {
        if (slots[s] === null) {
          slots[s] = j.id;
          break;
        }
      }
    }
    this._history.push({ method: 'jobScheduling' });
    return slots.filter((s): s is string => s !== null);
  }

  /** Dijkstra's shortest path. */
  dijkstraShortest(graph: Map<string, Array<{ to: string; weight: number }>>, start: string): Record<string, number> {
    const dist: Record<string, number> = {};
    const visited = new Set<string>();
    for (const node of graph.keys()) dist[node] = Infinity;
    dist[start] = 0;
    while (visited.size < graph.size) {
      let u: string | null = null;
      let min = Infinity;
      for (const k of Object.keys(dist)) {
        if (!visited.has(k) && dist[k] < min) {
          min = dist[k];
          u = k;
        }
      }
      if (u === null) break;
      visited.add(u);
      for (const edge of graph.get(u) ?? []) {
        if (dist[u] + edge.weight < (dist[edge.to] ?? Infinity)) {
          dist[edge.to] = dist[u] + edge.weight;
        }
      }
    }
    this._history.push({ method: 'dijkstraShortest' });
    return dist;
  }

  /** Prim's MST. */
  primMST(graph: Map<string, Array<{ to: string; weight: number }>>): number {
    const nodes = Array.from(graph.keys());
    if (nodes.length === 0) return 0;
    const inMST = new Set<string>();
    inMST.add(nodes[0]);
    let total = 0;
    while (inMST.size < nodes.length) {
      let minEdge = Infinity;
      let nextNode: string | null = null;
      for (const u of inMST) {
        for (const e of graph.get(u) ?? []) {
          if (!inMST.has(e.to) && e.weight < minEdge) {
            minEdge = e.weight;
            nextNode = e.to;
          }
        }
      }
      if (nextNode === null) break;
      inMST.add(nextNode);
      total += minEdge;
    }
    this._history.push({ method: 'primMST' });
    return total;
  }

  /** Kruskal's MST. */
  kruskalMST(graph: Array<{ from: string; to: string; weight: number }>): number {
    const sorted = [...graph].sort((a, b) => a.weight - b.weight);
    const parent: Record<string, string> = {};
    const find = (x: string): string => {
      if (parent[x] === undefined) parent[x] = x;
      if (parent[x] !== x) parent[x] = find(parent[x]);
      return parent[x];
    };
    const union = (a: string, b: string): boolean => {
      const ra = find(a);
      const rb = find(b);
      if (ra === rb) return false;
      parent[ra] = rb;
      return true;
    };
    let total = 0;
    for (const e of sorted) {
      if (union(e.from, e.to)) total += e.weight;
    }
    this._history.push({ method: 'kruskalMST' });
    return total;
  }

  /** Set cover greedy approximation. */
  setCover(universe: string[], sets: Array<{ name: string; elements: string[] }>): string[] {
    const remaining = new Set(universe);
    const chosen: string[] = [];
    while (remaining.size > 0) {
      let best: { name: string; count: number } | null = null;
      for (const s of sets) {
        const count = s.elements.filter(e => remaining.has(e)).length;
        if (!best || count > best.count) best = { name: s.name, count };
      }
      if (!best || best.count === 0) break;
      chosen.push(best.name);
      const set = sets.find(s => s.name === best!.name);
      for (const e of set?.elements ?? []) remaining.delete(e);
    }
    this._history.push({ method: 'setCover' });
    return chosen;
  }

  /** Coin change greedy (works only for canonical coin systems). */
  coinChangeGreedy(coins: number[], amount: number): number[] {
    const sorted = [...coins].sort((a, b) => b - a);
    const result: number[] = [];
    let remaining = amount;
    for (const c of sorted) {
      while (remaining >= c) {
        result.push(c);
        remaining -= c;
      }
    }
    this._history.push({ method: 'coinChangeGreedy' });
    return result;
  }

  /** Interval scheduling. */
  intervalScheduling(intervals: Array<{ start: number; end: number }>): number {
    return this.activitySelection(intervals).length;
  }

  /** Minimum waiting time for processes. */
  minimumWaitingTime(processes: number[]): number {
    const sorted = [...processes].sort((a, b) => a - b);
    let total = 0;
    let waiting = 0;
    for (let i = 0; i < sorted.length - 1; i++) {
      waiting += sorted[i];
      total += waiting;
    }
    this._history.push({ method: 'minimumWaitingTime' });
    return total;
  }

  /** Water distribution greedy assignment. */
  waterDistribution(sources: Array<{ name: string; supply: number }>, demands: number[]): { assigned: Array<{ source: string; amount: number }>; unmet: number } {
    const assigned: Array<{ source: string; amount: number }> = [];
    let demandIdx = 0;
    let unmet = 0;
    for (const s of sources) {
      let supply = s.supply;
      while (supply > 0 && demandIdx < demands.length) {
        const give = Math.min(supply, demands[demandIdx]);
        assigned.push({ source: s.name, amount: give });
        supply -= give;
        demands[demandIdx] -= give;
        if (demands[demandIdx] === 0) demandIdx++;
      }
    }
    unmet = demands.slice(demandIdx).reduce((s, d) => s + d, 0);
    this._history.push({ method: 'waterDistribution' });
    return { assigned, unmet };
  }

  toPacket(): DataPacket<{
    problems: GreedyProblem[];
    solutions: unknown[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['cs_algorithms', 'GreedyAlgorithm'],
      priority: 1,
      phase: 'cs:greedy',
    };
    return {
      id: `greedy-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        problems: this._problems,
        solutions: this._solutions,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._problems = [];
    this._solutions = [];
    this._history = [];
    this._counter = 0;
  }

  get problemCount(): number {
    return this._problems.length;
  }

  get solutionCount(): number {
    return this._solutions.length;
  }

  get historyDepth(): number {
    return this._history.length;
  }
}
