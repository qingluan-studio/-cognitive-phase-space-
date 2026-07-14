export interface TopologyNode {
  id: string;
  neighbors: string[];
  data: Record<string, unknown>;
  visited: boolean;
  centrality: number;
  componentId: number;
}

export interface TopologyReport {
  components: number;
  holes: number;
  bridges: string[];
  boundaryNodes: string[];
  eulerCharacteristic: number;
  bettiNumbers: number[];
  spectralGap: number;
  algebraicConnectivity: number;
}

export class TopologicalAnalyzer {
  private _nodes: Map<string, TopologyNode> = new Map();
  private _lastReport: TopologyReport | null = null;
  private _laplacian: number[][] = [];
  private _nodeIndex: Map<string, number> = new Map();

  addNode(node: TopologyNode): void { this._nodes.set(node.id, { ...node, centrality: node.centrality ?? 0, componentId: node.componentId ?? -1 }); }

  connect(a: string, b: string): void {
    const na = this._nodes.get(a), nb = this._nodes.get(b);
    if (na && !na.neighbors.includes(b)) na.neighbors.push(b);
    if (nb && !nb.neighbors.includes(a)) nb.neighbors.push(a);
  }

  analyze(): TopologyReport {
    for (const n of this._nodes.values()) n.visited = false;
    this._buildLaplacian();
    const components = this._countComponents();
    const betti = this._bettiNumbers(components);
    const holes = betti[1] ?? 0;
    const bridges = this._findBridges();
    const boundaryNodes = this._boundaryNodes();
    const euler = this._nodes.size - this._edgeCount() + holes;
    const { spectralGap, algebraicConnectivity } = this._spectralAnalysis();
    this._computeCentrality();
    this._lastReport = { components, holes, bridges, boundaryNodes, eulerCharacteristic: euler, bettiNumbers: betti, spectralGap, algebraicConnectivity };
    return this._lastReport;
  }

  private _buildLaplacian(): void {
    const ids = Array.from(this._nodes.keys());
    this._nodeIndex.clear();
    const n = ids.length;
    for (let i = 0; i < n; i++) this._nodeIndex.set(ids[i], i);
    this._laplacian = [];
    for (let i = 0; i < n; i++) {
      const row: number[] = [];
      const node = this._nodes.get(ids[i])!;
      const deg = node.neighbors.length;
      for (let j = 0; j < n; j++) row.push(i === j ? deg : (node.neighbors.includes(ids[j]) ? -1 : 0));
      this._laplacian.push(row);
    }
  }

  private _countComponents(): number {
    let count = 0;
    const ids = Array.from(this._nodes.keys());
    for (let i = 0; i < ids.length; i++) {
      const node = this._nodes.get(ids[i]);
      if (!node || node.visited) continue;
      count++;
      const queue = [ids[i]];
      while (queue.length > 0) {
        const id = queue.shift()!;
        const n = this._nodes.get(id);
        if (!n || n.visited) continue;
        n.visited = true;
        n.componentId = count;
        for (const nb of n.neighbors) if (this._nodes.get(nb) && !this._nodes.get(nb)!.visited) queue.push(nb);
      }
    }
    return count;
  }

  private _bettiNumbers(components: number): number[] {
    const n = this._nodes.size, m = this._edgeCount();
    return [components, Math.max(0, m - n + components), Math.max(0, Math.floor((m - n + components) / 3))];
  }

  private _findBridges(): string[] {
    const bridges: string[] = [];
    const ids = Array.from(this._nodes.keys());
    for (let i = 0; i < ids.length; i++) {
      const node = this._nodes.get(ids[i])!;
      for (const nId of node.neighbors) {
        const j = this._nodeIndex.get(nId) ?? -1;
        if (j < i && this._isBridge(ids[i], nId)) bridges.push(`${ids[i]}--${nId}`);
      }
    }
    return bridges;
  }

  private _isBridge(a: string, b: string): boolean {
    const na = this._nodes.get(a)!;
    const orig = [...na.neighbors];
    na.neighbors = na.neighbors.filter(n => n !== b);
    for (const n of this._nodes.values()) n.visited = false;
    const comps = this._countComponents();
    na.neighbors = orig;
    return comps > 1;
  }

  private _boundaryNodes(): string[] {
    const boundaries: string[] = [];
    for (const node of this._nodes.values()) {
      if (node.neighbors.length <= 1) { boundaries.push(node.id); continue; }
      let lc = 0, total = 0;
      for (let i = 0; i < node.neighbors.length; i++) {
        for (let j = i + 1; j < node.neighbors.length; j++) {
          total++;
          const ni = this._nodes.get(node.neighbors[i]);
          if (ni && ni.neighbors.includes(node.neighbors[j])) lc++;
        }
      }
      if (total > 0 && lc / total < 0.2 && node.neighbors.length <= 2) boundaries.push(node.id);
    }
    return boundaries;
  }

  private _edgeCount(): number {
    let c = 0;
    for (const n of this._nodes.values()) c += n.neighbors.length;
    return Math.floor(c / 2);
  }

  private _spectralAnalysis(): { spectralGap: number; algebraicConnectivity: number } {
    const n = this._laplacian.length;
    if (n < 2) return { spectralGap: 0, algebraicConnectivity: 0 };
    const evs = this._approxEigenvalues(Math.min(4, n));
    evs.sort((a, b) => a - b);
    return { spectralGap: evs.length > 1 ? evs[1] - evs[0] : 0, algebraicConnectivity: evs.length > 1 ? evs[1] : 0 };
  }

  private _approxEigenvalues(k: number): number[] {
    const n = this._laplacian.length;
    const evs: number[] = [];
    for (let e = 0; e < k; e++) {
      let vec = new Array(n).fill(0);
      vec[e % n] = 1;
      let ev = 0;
      for (let iter = 0; iter < 30; iter++) {
        const nv = new Array(n).fill(0);
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) nv[i] += this._laplacian[i][j] * vec[j];
        let norm = 0;
        for (const v of nv) norm += v * v;
        norm = Math.sqrt(norm);
        if (norm < 1e-10) break;
        for (let i = 0; i < nv.length; i++) nv[i] /= norm;
        let dot = 0;
        for (let i = 0; i < vec.length; i++) dot += vec[i] * nv[i];
        ev = dot;
        for (let i = 0; i < evs.length; i++) {
          const pv = new Array(n).fill(0);
          pv[i % n] = 1;
          let proj = 0;
          for (let j = 0; j < n; j++) proj += nv[j] * pv[j];
          for (let j = 0; j < n; j++) nv[j] -= proj * pv[j];
        }
        vec = nv;
      }
      evs.push(Math.abs(ev));
    }
    return evs;
  }

  private _computeCentrality(): void {
    const ids = Array.from(this._nodes.keys());
    const n = ids.length;
    for (let i = 0; i < n; i++) {
      const node = this._nodes.get(ids[i])!;
      const degree = node.neighbors.length;
      let neighborDegreeSum = 0;
      for (const nb of node.neighbors) neighborDegreeSum += this._nodes.get(nb)?.neighbors.length ?? 0;
      node.centrality = degree / Math.max(1, n - 1) * 0.5 + (degree / Math.max(1, degree + neighborDegreeSum)) * 0.5;
    }
  }

  getReport(): TopologyReport | null { return this._lastReport; }
  isConnected(): boolean { return this._lastReport?.components === 1; }
  reset(): void { this._nodes.clear(); this._lastReport = null; this._laplacian = []; this._nodeIndex.clear(); }
  get nodeCount(): number { return this._nodes.size; }
  get edgeCount(): number { return this._edgeCount(); }
}
