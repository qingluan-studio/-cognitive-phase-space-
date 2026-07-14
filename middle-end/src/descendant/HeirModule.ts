export interface HeirCandidate {
  id: string;
  name: string;
  compatibility: number;
  inheritedCapabilities: string[];
  ready: boolean;
}

export interface TransferEvent {
  heirId: string;
  capability: string;
  transferredAt: number;
  acknowledged: boolean;
}

export class HeirModule {
  private _candidates: Map<string, HeirCandidate> = new Map();
  private _transfers: TransferEvent[] = [];
  private _coreCapabilities: Set<string> = new Set();
  private _selectedHeir: string | null = null;
  private _dependencyGraph: Map<string, Set<string>> = new Map();
  private _transferEntropy: number = 0;
  private _compatibilityDistribution: number[] = [];

  registerCandidate(candidate: HeirCandidate): void {
    this._candidates.set(candidate.id, candidate);
    this._updateCompatibilityDistribution();
  }

  defineCoreCapability(capability: string): void {
    this._coreCapabilities.add(capability);
    if (!this._dependencyGraph.has(capability)) {
      this._dependencyGraph.set(capability, new Set<string>());
    }
  }

  defineDependency(capability: string, dependsOn: string): void {
    const set = this._dependencyGraph.get(capability) ?? new Set<string>();
    set.add(dependsOn);
    this._dependencyGraph.set(capability, set);
  }

  selectHeir(): HeirCandidate | null {
    if (this._candidates.size === 0) {
      return null;
    }
    const sorted = Array.from(this._candidates.values()).sort(
      (a, b) => b.compatibility - a.compatibility
    );
    const top = sorted[0];
    const entropy = this._computeSelectionEntropy(sorted.map((c) => c.compatibility));
    if (entropy > 1.5 && sorted.length > 1) {
      const roulette = this._rouletteWheelSelection(sorted);
      this._selectedHeir = roulette.id;
      return roulette;
    }
    this._selectedHeir = top.id;
    return top;
  }

  transferCapability(capability: string): TransferEvent | null {
    if (!this._selectedHeir) {
      return null;
    }
    if (!this._coreCapabilities.has(capability)) {
      return null;
    }
    const heir = this._candidates.get(this._selectedHeir);
    if (!heir) {
      return null;
    }
    const deps = this._dependencyGraph.get(capability) ?? new Set<string>();
    for (const dep of deps) {
      if (!heir.inheritedCapabilities.includes(dep)) {
        return null;
      }
    }
    heir.inheritedCapabilities.push(capability);
    heir.ready = heir.inheritedCapabilities.length >= this._coreCapabilities.size;
    const event: TransferEvent = {
      heirId: this._selectedHeir,
      capability,
      transferredAt: Date.now(),
      acknowledged: true,
    };
    this._transfers.push(event);
    if (this._transfers.length > 200) {
      this._transfers.shift();
    }
    this._updateTransferEntropy();
    return event;
  }

  verifyReadiness(heirId: string): boolean {
    const heir = this._candidates.get(heirId);
    return heir ? heir.ready : false;
  }

  getCandidate(id: string): HeirCandidate | null {
    return this._candidates.get(id) ?? null;
  }

  getTransfers(limit: number = 50): TransferEvent[] {
    return this._transfers.slice(-limit);
  }

  get candidateCount(): number {
    return this._candidates.size;
  }

  get selectedHeir(): string | null {
    return this._selectedHeir;
  }

  get transferEntropy(): number {
    return this._transferEntropy;
  }

  computeTopologicalOrder(): string[] {
    const inDegree = new Map<string, number>();
    for (const cap of this._coreCapabilities) {
      inDegree.set(cap, 0);
    }
    for (const [cap, deps] of this._dependencyGraph) {
      for (const dep of deps) {
        if (this._coreCapabilities.has(dep)) {
          inDegree.set(cap, (inDegree.get(cap) ?? 0) + 1);
        }
      }
    }
    const queue: string[] = [];
    for (const [cap, degree] of inDegree) {
      if (degree === 0) {
        queue.push(cap);
      }
    }
    const order: string[] = [];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      order.push(curr);
      for (const [cap, deps] of this._dependencyGraph) {
        if (deps.has(curr)) {
          const newDegree = (inDegree.get(cap) ?? 0) - 1;
          inDegree.set(cap, newDegree);
          if (newDegree === 0) {
            queue.push(cap);
          }
        }
      }
    }
    return order;
  }

  computeReadinessProbability(heirId: string): number {
    const heir = this._candidates.get(heirId);
    if (!heir) {
      return 0;
    }
    const total = this._coreCapabilities.size;
    if (total === 0) {
      return 1;
    }
    const have = heir.inheritedCapabilities.length;
    const missing = total - have;
    const pTransfer = this._transferEntropy > 0 ? 1 / this._transferEntropy : 0.5;
    return Math.pow(pTransfer, missing);
  }

  private _updateTransferEntropy(): void {
    const freq = new Map<string, number>();
    for (const t of this._transfers) {
      freq.set(t.capability, (freq.get(t.capability) ?? 0) + 1);
    }
    const total = this._transfers.length;
    if (total === 0) {
      this._transferEntropy = 0;
      return;
    }
    let entropy = 0;
    for (const count of freq.values()) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }
    this._transferEntropy = entropy;
  }

  private _updateCompatibilityDistribution(): void {
    this._compatibilityDistribution = Array.from(this._candidates.values()).map((c) => c.compatibility);
  }

  private _computeSelectionEntropy(scores: number[]): number {
    const total = scores.reduce((s, v) => s + v, 0);
    if (total === 0) {
      return 0;
    }
    let entropy = 0;
    for (const score of scores) {
      const p = score / total;
      if (p > 0) {
        entropy -= p * Math.log2(p);
      }
    }
    return entropy;
  }

  private _rouletteWheelSelection(candidates: HeirCandidate[]): HeirCandidate {
    const total = candidates.reduce((s, c) => s + c.compatibility, 0);
    const r = Math.random() * total;
    let acc = 0;
    for (const c of candidates) {
      acc += c.compatibility;
      if (r <= acc) {
        return c;
      }
    }
    return candidates[candidates.length - 1];
  }
}
