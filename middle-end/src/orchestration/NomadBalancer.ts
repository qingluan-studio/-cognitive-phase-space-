export type NodeDescriptor = { id: string; capacity: number; currentLoad: number; healthScore: number; location: string; volatility: number };
export type AllocationStrategy = 'random' | 'leastLoaded' | 'roundRobin' | 'adaptive';
export type AllocationResult = { nodeId: string; reason: string; confidence: number };

export class NomadBalancer {
  private _nodes: Map<string, NodeDescriptor> = new Map();
  private _strategy: AllocationStrategy = 'adaptive';
  private _history: AllocationResult[] = [];
  private _threshold = 0.8;
  private _locWeights: Record<string, number> = {};
  private _coolDown = 1000;
  private _lastMig = 0;

  get nodes(): Map<string, NodeDescriptor> { return new Map(this._nodes); }
  get strategy(): AllocationStrategy { return this._strategy; }

  registerNode(node: NodeDescriptor): void {
    this._nodes.set(node.id, node);
    this._locWeights[node.location] = (this._locWeights[node.location] || 0) + 1;
  }

  setStrategy(strategy: AllocationStrategy): void { this._strategy = strategy; }
  setThreshold(threshold: number): void { this._threshold = Math.max(0.5, Math.min(1, threshold)); }
  setCoolDown(ms: number): void { this._coolDown = Math.max(100, ms); }

  allocate(requestId: string, prefs?: { location?: string; minHealth?: number }): AllocationResult {
    const candidates = this._filter(prefs);
    if (!candidates.length) return { nodeId: '', reason: 'No healthy nodes', confidence: 0 };

    let selected: NodeDescriptor, reason: string;
    switch (this._strategy) {
      case 'random': selected = candidates[Math.floor(Math.random() * candidates.length)]; reason = 'Random'; break;
      case 'leastLoaded': selected = candidates.reduce((a, b) => a.currentLoad / a.capacity < b.currentLoad / b.capacity ? a : b); reason = 'Least loaded'; break;
      case 'roundRobin': selected = this._roundRobin(candidates); reason = 'Round robin'; break;
      default: selected = this._adaptive(candidates); reason = 'Adaptive';
    }

    const confidence = this._confidence(selected);
    const result = { nodeId: selected.id, reason, confidence };
    this._history.push(result);
    this._updateLoad(selected.id, 1);
    return result;
  }

  private _filter(prefs?: { location?: string; minHealth?: number }): NodeDescriptor[] {
    return Array.from(this._nodes.values()).filter(n => {
      if (prefs?.location && n.location !== prefs.location) return false;
      if (prefs?.minHealth && n.healthScore < prefs.minHealth) return false;
      return n.healthScore > 0.5 && n.currentLoad < n.capacity * this._threshold;
    });
  }

  private _roundRobin(candidates: NodeDescriptor[]): NodeDescriptor {
    const last = this._history[this._history.length - 1];
    const idx = last ? candidates.findIndex(n => n.id === last.nodeId) : -1;
    return candidates[(idx + 1) % candidates.length];
  }

  private _adaptive(candidates: NodeDescriptor[]): NodeDescriptor {
    const weights = candidates.map(node => {
      const load = 1 - Math.pow(node.currentLoad / node.capacity, 1.5);
      const health = Math.pow(node.healthScore, 2);
      const stability = 1 - node.volatility * 0.5;
      const locFactor = 1 - ((this._locWeights[node.location] || 1) - 1) / this._nodes.size * 0.3;
      return load * 0.35 + health * 0.25 + stability * 0.15 + locFactor * 0.25;
    });

    let r = Math.random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < candidates.length; i++) if ((r -= weights[i]) <= 0) return candidates[i];
    return candidates[0];
  }

  private _confidence(node: NodeDescriptor): number {
    const load = 1 - node.currentLoad / node.capacity;
    return load * 0.4 + node.healthScore * 0.4 + (1 - node.volatility) * 0.2;
  }

  updateNodeLoad(nodeId: string, delta: number): void {
    const node = this._nodes.get(nodeId);
    if (node) node.currentLoad = Math.max(0, Math.min(node.capacity, node.currentLoad + delta));
  }

  private _updateLoad(nodeId: string, delta: number): void { this.updateNodeLoad(nodeId, delta); }

  getNodeStatus(nodeId: string): NodeDescriptor | undefined { return this._nodes.get(nodeId); }

  migrateOverloaded(): { fromNode: string; toNode: string; cost: number }[] {
    const now = Date.now();
    if (now - this._lastMig < this._coolDown) return [];
    this._lastMig = now;

    const overloaded = Array.from(this._nodes.values()).filter(n => n.currentLoad > n.capacity * this._threshold);
    const migrated: { fromNode: string; toNode: string; cost: number }[] = [];
    
    overloaded.forEach(from => {
      const targets = this._filter().filter(n => n.id !== from.id);
      if (!targets.length) return;

      const target = targets.reduce((best, node) => this._migCost(from, node) < this._migCost(from, best) ? node : best);
      if (target.currentLoad < target.capacity * 0.7) {
        this._updateLoad(from.id, -1);
        this._updateLoad(target.id, 1);
        migrated.push({ fromNode: from.id, toNode: target.id, cost: this._migCost(from, target) });
      }
    });
    
    return migrated;
  }

  private _migCost(from: NodeDescriptor, to: NodeDescriptor): number {
    const loadDiff = Math.abs(from.currentLoad - to.currentLoad) / Math.max(from.capacity, to.capacity);
    return loadDiff + (1 - to.healthScore) * 0.3 + to.volatility * 0.2 + (from.location !== to.location ? 0.15 : 0);
  }

  removeNode(nodeId: string): void {
    const node = this._nodes.get(nodeId);
    if (node && --this._locWeights[node.location] <= 0) delete this._locWeights[node.location];
    this._nodes.delete(nodeId);
  }

  getSystemLoad(): number {
    const nodes = Array.from(this._nodes.values());
    if (!nodes.length) return 0;
    return nodes.reduce((s, n) => s + n.currentLoad, 0) / nodes.reduce((s, n) => s + n.capacity, 0);
  }

  getLoadBalance(): number {
    const nodes = Array.from(this._nodes.values());
    if (nodes.length < 2) return 1;
    const loads = nodes.map(n => n.currentLoad / n.capacity);
    const mean = loads.reduce((a, b) => a + b, 0) / loads.length;
    const variance = loads.reduce((s, l) => s + Math.pow(l - mean, 2), 0) / loads.length;
    return Math.max(0, 1 - Math.sqrt(variance) * 2);
  }
}