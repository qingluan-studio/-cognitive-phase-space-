export type NodeDescriptor = {
  id: string;
  capacity: number;
  currentLoad: number;
  healthScore: number;
  location: string;
  volatility: number;
};

export type AllocationStrategy = 'random' | 'leastLoaded' | 'roundRobin' | 'adaptive';

export type AllocationResult = {
  nodeId: string;
  reason: string;
  confidence: number;
};

export class NomadBalancer {
  private nodes: Map<string, NodeDescriptor> = new Map();
  private strategy: AllocationStrategy = 'adaptive';
  private allocationHistory: AllocationResult[] = [];
  private migrationThreshold = 0.8;

  registerNode(node: NodeDescriptor): void {
    this.nodes.set(node.id, node);
  }

  setStrategy(strategy: AllocationStrategy): void {
    this.strategy = strategy;
  }

  allocate(requestId: string): AllocationResult {
    const candidates = this.filterHealthyNodes();
    if (candidates.length === 0) {
      return { nodeId: '', reason: 'No healthy nodes available', confidence: 0 };
    }

    let selected: NodeDescriptor;
    let reason: string;

    switch (this.strategy) {
      case 'random':
        selected = candidates[Math.floor(Math.random() * candidates.length)];
        reason = 'Random selection';
        break;
      case 'leastLoaded':
        selected = candidates.reduce((best, node) => 
          node.currentLoad < best.currentLoad ? node : best);
        reason = 'Least loaded node';
        break;
      case 'roundRobin':
        selected = this.roundRobinSelect(candidates);
        reason = 'Round robin selection';
        break;
      default:
        selected = this.adaptiveSelect(candidates);
        reason = 'Adaptive selection';
    }

    const confidence = this.calculateConfidence(selected);
    const result = { nodeId: selected.id, reason, confidence };
    
    this.allocationHistory.push(result);
    this.updateNodeLoad(selected.id, 1);

    return result;
  }

  private filterHealthyNodes(): NodeDescriptor[] {
    return Array.from(this.nodes.values()).filter(n => 
      n.healthScore > 0.5 && n.currentLoad < n.capacity * this.migrationThreshold
    );
  }

  private roundRobinSelect(candidates: NodeDescriptor[]): NodeDescriptor {
    const lastAlloc = this.allocationHistory[this.allocationHistory.length - 1];
    const lastIndex = lastAlloc ? candidates.findIndex(n => n.id === lastAlloc.nodeId) : -1;
    return candidates[(lastIndex + 1) % candidates.length];
  }

  private adaptiveSelect(candidates: NodeDescriptor[]): NodeDescriptor {
    const weights = candidates.map(node => {
      const loadFactor = 1 - node.currentLoad / node.capacity;
      const healthFactor = node.healthScore;
      const stabilityFactor = 1 - node.volatility;
      return loadFactor * 0.4 + healthFactor * 0.3 + stabilityFactor * 0.3;
    });

    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < candidates.length; i++) {
      random -= weights[i];
      if (random <= 0) return candidates[i];
    }
    
    return candidates[0];
  }

  private calculateConfidence(node: NodeDescriptor): number {
    const loadConfidence = 1 - node.currentLoad / node.capacity;
    const healthConfidence = node.healthScore;
    return (loadConfidence + healthConfidence) / 2;
  }

  updateNodeLoad(nodeId: string, delta: number): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.currentLoad = Math.max(0, Math.min(node.capacity, node.currentLoad + delta));
    }
  }

  getNodeStatus(nodeId: string): NodeDescriptor | undefined {
    return this.nodes.get(nodeId);
  }

  migrateOverloaded(): string[] {
    const overloaded = Array.from(this.nodes.values()).filter(
      n => n.currentLoad > n.capacity * this.migrationThreshold
    );
    
    const migrated: string[] = [];
    overloaded.forEach(node => {
      const target = this.allocate('migration');
      if (target.nodeId && target.nodeId !== node.id) {
        this.updateNodeLoad(node.id, -1);
        this.updateNodeLoad(target.nodeId, 1);
        migrated.push(`${node.id} -> ${target.nodeId}`);
      }
    });
    
    return migrated;
  }

  removeNode(nodeId: string): void {
    this.nodes.delete(nodeId);
  }
}