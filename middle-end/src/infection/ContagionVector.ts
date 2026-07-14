export interface VectorEdge {
  id: string;
  sourceHost: string;
  targetHost: string;
  transmissionProbability: number;
  latencyMs: number;
  active: boolean;
}

export interface TransmissionRecord {
  edgeId: string;
  payloadId: string;
  success: boolean;
  transmittedAt: number;
}

export class ContagionVector {
  private _edges: Map<string, VectorEdge> = new Map();
  private _transmissions: TransmissionRecord[] = [];
  private _adjacency: Map<string, Set<string>> = new Map();
  private _edgeWeights: Map<string, number> = new Map();

  addEdge(edge: VectorEdge): void {
    this._edges.set(edge.id, edge);
    if (!this._adjacency.has(edge.sourceHost)) {
      this._adjacency.set(edge.sourceHost, new Set());
    }
    this._adjacency.get(edge.sourceHost)!.add(edge.targetHost);
    this._edgeWeights.set(edge.id, edge.transmissionProbability);
  }

  transmit(edgeId: string, payloadId: string): TransmissionRecord | null {
    const edge = this._edges.get(edgeId);
    if (!edge || !edge.active) return null;
    const success = Math.random() < edge.transmissionProbability;
    const record: TransmissionRecord = {
      edgeId,
      payloadId,
      success,
      transmittedAt: Date.now(),
    };
    this._transmissions.push(record);
    if (this._transmissions.length > 200) this._transmissions.shift();
    if (success) {
      this._reinforcePath(edge.sourceHost, edge.targetHost, 0.02);
    }
    return record;
  }

  private _reinforcePath(source: string, target: string, amount: number): void {
    for (const edge of this._edges.values()) {
      if (edge.sourceHost === source && edge.targetHost === target) {
        edge.transmissionProbability = Math.min(1, edge.transmissionProbability + amount);
        this._edgeWeights.set(edge.id, edge.transmissionProbability);
      }
    }
  }

  findPath(from: string, to: string): string[] | null {
    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const visited = new Set<string>();
    for (const node of this._allNodes()) {
      distances.set(node, Infinity);
      previous.set(node, null);
    }
    distances.set(from, 0);
    while (visited.size < distances.size) {
      let current: string | null = null;
      let minDist = Infinity;
      for (const [node, dist] of distances) {
        if (!visited.has(node) && dist < minDist) {
          minDist = dist;
          current = node;
        }
      }
      if (current === null || current === to) break;
      visited.add(current);
      const neighbors = this._adjacency.get(current) ?? new Set();
      for (const n of neighbors) {
        const edgeWeight = this._edgeWeight(current, n);
        const cost = 1 - edgeWeight;
        const alt = (distances.get(current) ?? Infinity) + cost;
        if (alt < (distances.get(n) ?? Infinity)) {
          distances.set(n, alt);
          previous.set(n, current);
        }
      }
    }
    if (!previous.has(to) || previous.get(to) === null && from !== to) {
      return distances.get(to) === Infinity ? null : [from, to];
    }
    const path: string[] = [];
    let cur: string | null = to;
    while (cur !== null) {
      path.unshift(cur);
      cur = previous.get(cur) ?? null;
    }
    return path[0] === from ? path : null;
  }

  private _edgeWeight(source: string, target: string): number {
    for (const edge of this._edges.values()) {
      if (edge.sourceHost === source && edge.targetHost === target && edge.active) {
        return edge.transmissionProbability;
      }
    }
    return 0;
  }

  private _allNodes(): Set<string> {
    const nodes = new Set<string>();
    for (const edge of this._edges.values()) {
      nodes.add(edge.sourceHost);
      nodes.add(edge.targetHost);
    }
    return nodes;
  }

  strengthenEdge(edgeId: string, factor: number): VectorEdge | null {
    const edge = this._edges.get(edgeId);
    if (!edge) return null;
    edge.transmissionProbability = Math.min(1, edge.transmissionProbability * factor);
    this._edgeWeights.set(edgeId, edge.transmissionProbability);
    return edge;
  }

  quarantine(hostId: string): number {
    let count = 0;
    for (const edge of this._edges.values()) {
      if (edge.sourceHost === hostId || edge.targetHost === hostId) {
        edge.active = false;
        count++;
      }
    }
    return count;
  }

  computeBasicReproductionNumber(): number {
    if (this._edges.size === 0) return 0;
    const outDegree = new Map<string, number>();
    for (const edge of this._edges.values()) {
      if (edge.active) {
        outDegree.set(edge.sourceHost, (outDegree.get(edge.sourceHost) ?? 0) + edge.transmissionProbability);
      }
    }
    const total = Array.from(outDegree.values()).reduce((s, v) => s + v, 0);
    return total / outDegree.size;
  }

  identifyBridges(): string[] {
    const bridges: string[] = [];
    for (const edge of this._edges.values()) {
      if (!edge.active) continue;
      const targetHasOther = Array.from(this._edges.values())
        .some(e => e.id !== edge.id && e.active && e.targetHost === edge.targetHost);
      if (!targetHasOther) bridges.push(edge.id);
    }
    return bridges;
  }

  getEdge(id: string): VectorEdge | null {
    return this._edges.get(id) ?? null;
  }

  getTransmissions(limit: number = 50): TransmissionRecord[] {
    return this._transmissions.slice(-limit);
  }

  get edgeCount(): number {
    return this._edges.size;
  }
}
