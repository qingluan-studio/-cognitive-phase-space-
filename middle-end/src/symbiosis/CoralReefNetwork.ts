/**
 * CoralReefNetwork - 珊瑚礁网络模块
 * 模拟众多共生模块构成的生态系统网络，珊瑚、藻类、鱼类等
 * 多个节点相互依存，形成高密度、高多样性的共生生态。
 */

export interface ReefNode {
  readonly nodeId: string;
  species: string;
  role: 'producer' | 'consumer' | 'decomposer' | 'symbiont';
  energy: number;
  connections: string[];
}

export interface ReefEdge {
  from: string;
  to: string;
  weight: number;
  type: 'mutualism' | 'commensalism' | 'parasitism';
}

export class CoralReefNetwork {
  private _nodes: Map<string, ReefNode> = new Map();
  private _edges: ReefEdge[] = [];
  private _biodiversityIndex: number = 0;
  private _thermalStress: number = 0;
  private _bleachingEvents: number = 0;

  constructor() {}

  get nodeCount(): number {
    return this._nodes.size;
  }

  get biodiversity(): number {
    return this._biodiversityIndex;
  }

  get thermalStress(): number {
    return this._thermalStress;
  }

  public addNode(node: ReefNode): void {
    if (this._nodes.has(node.nodeId)) {
      return;
    }
    this._nodes.set(node.nodeId, { ...node, connections: [...node.connections] });
    this._recalculateBiodiversity();
  }

  public addEdge(edge: ReefEdge): void {
    if (!this._nodes.has(edge.from) || !this._nodes.has(edge.to)) {
      return;
    }
    this._edges.push({ ...edge });
    const from = this._nodes.get(edge.from)!;
    if (!from.connections.includes(edge.to)) {
      from.connections.push(edge.to);
    }
  }

  private _recalculateBiodiversity(): void {
    const species = new Set<string>();
    this._nodes.forEach((n) => species.add(n.species));
    const richness = species.size;
    const evenness = this._computeEvenness();
    this._biodiversityIndex = richness * evenness;
  }

  private _computeEvenness(): number {
    if (this._nodes.size === 0) {
      return 0;
    }
    const counts: Record<string, number> = {};
    this._nodes.forEach((n) => {
      counts[n.species] = (counts[n.species] ?? 0) + 1;
    });
    const total = this._nodes.size;
    const proportions = Object.values(counts).map((c) => c / total);
    const entropy = proportions.reduce((s, p) => s - p * Math.log(p), 0);
    const maxEntropy = Math.log(Object.keys(counts).length || 1);
    return maxEntropy === 0 ? 0 : entropy / maxEntropy;
  }

  public flowEnergy(): void {
    this._edges.forEach((edge) => {
      const from = this._nodes.get(edge.from);
      const to = this._nodes.get(edge.to);
      if (!from || !to) {
        return;
      }
      if (from.energy < edge.weight) {
        return;
      }
      from.energy -= edge.weight;
      to.energy += edge.weight * 0.9;
    });
  }

  public applyThermalStress(delta: number): void {
    this._thermalStress = Math.min(1, this._thermalStress + delta);
    if (this._thermalStress > 0.7) {
      this.triggerBleaching();
    }
  }

  public triggerBleaching(): void {
    this._bleachingEvents++;
    this._nodes.forEach((node) => {
      if (node.role === 'symbiont') {
        node.energy *= 0.3;
      }
    });
    this._edges = this._edges.filter((e) => e.type !== 'mutualism' || Math.random() > 0.5);
    this._thermalStress *= 0.5;
  }

  public recover(): void {
    this._thermalStress = Math.max(0, this._thermalStress - 0.1);
    this._nodes.forEach((node) => {
      node.energy = Math.min(100, node.energy + 2);
    });
  }

  public ecosystemReport(): Record<string, unknown> {
    const roleCounts: Record<string, number> = {};
    this._nodes.forEach((n) => {
      roleCounts[n.role] = (roleCounts[n.role] ?? 0) + 1;
    });
    return {
      nodeCount: this.nodeCount,
      edgeCount: this._edges.length,
      biodiversity: this._biodiversityIndex.toFixed(3),
      thermalStress: this._thermalStress.toFixed(3),
      bleachingEvents: this._bleachingEvents,
      roles: roleCounts,
    };
  }
}
