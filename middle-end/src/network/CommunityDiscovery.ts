export interface CommunityAssignment {
  nodeId: number;
  communityId: number;
}

export interface ModularityHistory {
  iteration: number;
  modularity: number;
  communityCount: number;
}

export class CommunityDiscovery {
  private _adjacency: Map<number, Set<number>>;
  private _communities: Map<number, number>;
  private _modularityHistory: ModularityHistory[];
  private _edgeCount: number;
  private _resolution: number;
  private _nodeDegrees: Map<number, number>;

  constructor(resolution: number = 1.0) {
    this._adjacency = new Map();
    this._communities = new Map();
    this._modularityHistory = [];
    this._edgeCount = 0;
    this._resolution = resolution;
    this._nodeDegrees = new Map();
  }

  get nodeCount(): number { return this._adjacency.size; }
  get edgeCount(): number { return this._edgeCount; }
  get resolution(): number { return this._resolution; }
  get modularityHistory(): ModularityHistory[] { return this._modularityHistory; }
  get communityCount(): number {
    const set = new Set(this._communities.values());
    return set.size;
  }

  public addNode(id: number): void {
    if (!this._adjacency.has(id)) {
      this._adjacency.set(id, new Set());
      this._nodeDegrees.set(id, 0);
      this._communities.set(id, id);
    }
  }

  public addEdge(u: number, v: number): void {
    this.addNode(u);
    this.addNode(v);
    if (!this._adjacency.get(u)!.has(v)) {
      this._adjacency.get(u)!.add(v);
      this._adjacency.get(v)!.add(u);
      this._edgeCount++;
      this._nodeDegrees.set(u, (this._nodeDegrees.get(u) || 0) + 1);
      this._nodeDegrees.set(v, (this._nodeDegrees.get(v) || 0) + 1);
    }
  }

  public setCommunity(nodeId: number, commId: number): void {
    this._communities.set(nodeId, commId);
  }

  public getCommunity(nodeId: number): number {
    return this._communities.get(nodeId) ?? nodeId;
  }

  public getNeighbors(nodeId: number): number[] {
    return Array.from(this._adjacency.get(nodeId) || []);
  }

  public getDegree(nodeId: number): number {
    return this._nodeDegrees.get(nodeId) || 0;
  }

  public computeModularity(): number {
    let q = 0;
    const m2 = 2 * this._edgeCount;
    if (m2 === 0) return 0;
    const commNodes = new Map<number, number[]>();
    for (const [node, comm] of this._communities) {
      if (!commNodes.has(comm)) commNodes.set(comm, []);
      commNodes.get(comm)!.push(node);
    }
    for (const [comm, nodes] of commNodes) {
      let e_c = 0;
      let d_c = 0;
      for (const i of nodes) {
        d_c += this.getDegree(i);
        for (const j of nodes) {
          if (this._adjacency.get(i)!.has(j)) {
            e_c += 0.5;
          }
        }
      }
      q += (e_c / this._edgeCount) - this._resolution * Math.pow(d_c / m2, 2);
    }
    return q;
  }

  public louvainPhaseOne(): boolean {
    let improved = false;
    const nodes = Array.from(this._adjacency.keys());
    let localImprove = true;
    let iter = 0;
    while (localImprove && iter < 100) {
      iter++;
      localImprove = false;
      for (const node of nodes) {
        const currentComm = this.getCommunity(node);
        const neighborComms = new Map<number, number>();
        for (const neigh of this.getNeighbors(node)) {
          const nc = this.getCommunity(neigh);
          neighborComms.set(nc, (neighborComms.get(nc) || 0) + 1);
        }
        let bestComm = currentComm;
        let bestGain = 0;
        const ki = this.getDegree(node);
        const m2 = 2 * this._edgeCount;
        for (const [comm, kic] of neighborComms) {
          if (comm === currentComm) continue;
          let sigmaTot = 0;
          for (const [n, c] of this._communities) {
            if (c === comm) sigmaTot += this.getDegree(n);
          }
          const gain = kic - this._resolution * ki * sigmaTot / m2;
          if (gain > bestGain) {
            bestGain = gain;
            bestComm = comm;
          }
        }
        if (bestComm !== currentComm) {
          this._communities.set(node, bestComm);
          localImprove = true;
          improved = true;
        }
      }
    }
    return improved;
  }

  public louvainPhaseTwo(): void {
    const commMap = new Map<number, number>();
    let newId = 0;
    for (const comm of new Set(this._communities.values())) {
      commMap.set(comm, newId++);
    }
    const newAdj = new Map<number, Set<number>>();
    const newDegrees = new Map<number, number>();
    const newCommunities = new Map<number, number>();
    for (const [oldNode, oldComm] of this._communities) {
      const c = commMap.get(oldComm)!;
      newCommunities.set(oldNode, c);
      if (!newAdj.has(c)) {
        newAdj.set(c, new Set());
        newDegrees.set(c, 0);
      }
    }
    for (const [u, neighbors] of this._adjacency) {
      const cu = commMap.get(this._communities.get(u)!)!;
      for (const v of neighbors) {
        const cv = commMap.get(this._communities.get(v)!)!;
        if (cu !== cv) {
          newAdj.get(cu)!.add(cv);
        }
      }
    }
    this._adjacency.clear();
    this._nodeDegrees.clear();
    this._communities.clear();
    for (const [c, neighs] of newAdj) {
      this._adjacency.set(c, neighs);
      this._nodeDegrees.set(c, neighs.size);
      this._communities.set(c, c);
    }
    this._edgeCount = 0;
    for (const [c, neighs] of this._adjacency) {
      this._edgeCount += neighs.size;
    }
    this._edgeCount /= 2;
  }

  public runLouvain(maxIterations: number = 10): void {
    this._modularityHistory = [];
    for (let i = 0; i < maxIterations; i++) {
      const improved = this.louvainPhaseOne();
      const q = this.computeModularity();
      this._modularityHistory.push({ iteration: i, modularity: q, communityCount: this.communityCount });
      if (!improved) break;
      this.louvainPhaseTwo();
    }
  }

  public labelPropagation(maxIterations: number = 100): void {
    const nodes = Array.from(this._adjacency.keys());
    for (const node of nodes) {
      this._communities.set(node, node);
    }
    for (let iter = 0; iter < maxIterations; iter++) {
      let changed = false;
      const shuffled = nodes.slice().sort(() => Math.random() - 0.5);
      for (const node of shuffled) {
        const labelCounts = new Map<number, number>();
        for (const neigh of this.getNeighbors(node)) {
          const lbl = this.getCommunity(neigh);
          labelCounts.set(lbl, (labelCounts.get(lbl) || 0) + 1);
        }
        let bestLabel = this.getCommunity(node);
        let bestCount = 0;
        for (const [lbl, cnt] of labelCounts) {
          if (cnt > bestCount) {
            bestCount = cnt;
            bestLabel = lbl;
          }
        }
        if (bestLabel !== this.getCommunity(node)) {
          this._communities.set(node, bestLabel);
          changed = true;
        }
      }
      if (!changed) break;
    }
  }

  public computeConductance(commId: number): number {
    const nodesInComm: number[] = [];
    for (const [node, c] of this._communities) {
      if (c === commId) nodesInComm.push(node);
    }
    let internalEdges = 0;
    let externalEdges = 0;
    for (const node of nodesInComm) {
      for (const neigh of this.getNeighbors(node)) {
        if (this.getCommunity(neigh) === commId) {
          internalEdges += 0.5;
        } else {
          externalEdges++;
        }
      }
    }
    const vol = nodesInComm.reduce((sum, n) => sum + this.getDegree(n), 0);
    if (vol === 0 || 2 * this._edgeCount - vol === 0) return 0;
    return externalEdges / Math.min(vol, 2 * this._edgeCount - vol);
  }

  public computeNMI(other: CommunityDiscovery): number {
    const nodes = Array.from(this._adjacency.keys());
    const contingency: Map<string, number> = new Map();
    const ca = new Map<number, number>();
    const cb = new Map<number, number>();
    for (const node of nodes) {
      const a = this.getCommunity(node);
      const b = other.getCommunity(node);
      const key = `${a},${b}`;
      contingency.set(key, (contingency.get(key) || 0) + 1);
      ca.set(a, (ca.get(a) || 0) + 1);
      cb.set(b, (cb.get(b) || 0) + 1);
    }
    const n = nodes.length;
    let mi = 0;
    for (const [key, val] of contingency) {
      const [a, b] = key.split(',').map(Number);
      const pab = val / n;
      const pa = (ca.get(a) || 0) / n;
      const pb = (cb.get(b) || 0) / n;
      mi += pab * Math.log(pab / (pa * pb));
    }
    let ha = 0;
    for (const [, val] of ca) {
      const p = val / n;
      ha -= p * Math.log(p);
    }
    let hb = 0;
    for (const [, val] of cb) {
      const p = val / n;
      hb -= p * Math.log(p);
    }
    if (ha + hb === 0) return 1;
    return 2 * mi / (ha + hb);
  }

  public getCommunitiesAsArrays(): Map<number, number[]> {
    const result = new Map<number, number[]>();
    for (const [node, comm] of this._communities) {
      if (!result.has(comm)) result.set(comm, []);
      result.get(comm)!.push(node);
    }
    return result;
  }

  public generateStochasticBlockModel(sizes: number[], probs: number[][]): void {
    let nodeId = 0;
    const groupStart: number[] = [];
    for (const s of sizes) {
      groupStart.push(nodeId);
      for (let i = 0; i < s; i++) {
        this.addNode(nodeId++);
      }
    }
    for (let g = 0; g < sizes.length; g++) {
      for (let h = 0; h < sizes.length; h++) {
        const p = probs[g][h];
        for (let i = groupStart[g]; i < groupStart[g] + sizes[g]; i++) {
          for (let j = groupStart[h]; j < groupStart[h] + sizes[h]; j++) {
            if (i < j && Math.random() < p) {
              this.addEdge(i, j);
            }
          }
        }
      }
    }
  }

  public resetCommunities(): void {
    for (const node of this._adjacency.keys()) {
      this._communities.set(node, node);
    }
    this._modularityHistory = [];
  }

  public exportAssignments(): CommunityAssignment[] {
    const arr: CommunityAssignment[] = [];
    for (const [node, comm] of this._communities) {
      arr.push({ nodeId: node, communityId: comm });
    }
    return arr;
  }
}
