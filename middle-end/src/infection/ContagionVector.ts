/**
 * 传染向量：思想传播的路径。
 * 维护思想病毒在不同宿主间传播的有向网络，每条边记录传播概率与延迟。
 */

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

  addEdge(edge: VectorEdge): void {
    this._edges.set(edge.id, edge);
    if (!this._adjacency.has(edge.sourceHost)) {
      this._adjacency.set(edge.sourceHost, new Set());
    }
    this._adjacency.get(edge.sourceHost)!.add(edge.targetHost);
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
    return record;
  }

  findPath(from: string, to: string): string[] | null {
    const visited = new Set<string>();
    const queue: { node: string; path: string[] }[] = [{ node: from, path: [from] }];
    while (queue.length > 0) {
      const { node, path } = queue.shift()!;
      if (node === to) return path;
      if (visited.has(node)) continue;
      visited.add(node);
      const neighbors = this._adjacency.get(node) ?? new Set();
      for (const n of neighbors) {
        if (!visited.has(n)) queue.push({ node: n, path: [...path, n] });
      }
    }
    return null;
  }

  strengthenEdge(edgeId: string, factor: number): VectorEdge | null {
    const edge = this._edges.get(edgeId);
    if (!edge) return null;
    edge.transmissionProbability = Math.min(1, edge.transmissionProbability * factor);
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
