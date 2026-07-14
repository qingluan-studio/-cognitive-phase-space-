export interface PainNode {
  id: string;
  intensity: number;
  allostaticLoad: number;
  hormeticDose: number;
  activation: number;
  resilience: number;
}

export interface NetworkState {
  nodes: number;
  edges: number;
  percolationThreshold: number;
  giantComponentSize: number;
  averageResilience: number;
}

export class PainAsPower {
  private _nodes: Map<string, PainNode> = new Map();
  private _edges: Map<string, Set<string>> = new Map();
  private _state: Record<string, unknown> = {};
  private _allostaticOverload: number = 0;
  private _hormesisPeak: number = 0;
  private _percolationProbability: number = 0;

  constructor() {}

  get nodeCount(): number {
    return this._nodes.size;
  }

  get edgeCount(): number {
    let count = 0;
    for (const set of this._edges.values()) count += set.size;
    return count / 2;
  }

  addNode(id: string, intensity: number, hormeticDose: number): void {
    const activation = this._sigmoid(intensity - hormeticDose);
    const resilience = Math.exp(-Math.pow(intensity - hormeticDose, 2) / (2 * hormeticDose * hormeticDose));
    const node: PainNode = { id, intensity, allostaticLoad: 0, hormeticDose, activation, resilience };
    this._nodes.set(id, node);
    this._edges.set(id, new Set());
    this._updateAllostaticLoad();
    this._updatePercolation();
  }

  private _sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  connect(a: string, b: string): void {
    if (!this._nodes.has(a) || !this._nodes.has(b)) return;
    this._edges.get(a)!.add(b);
    this._edges.get(b)!.add(a);
    this._updatePercolation();
  }

  private _updateAllostaticLoad(): void {
    let sum = 0;
    for (const node of this._nodes.values()) {
      sum += node.intensity;
    }
    this._allostaticOverload = sum / (this._nodes.size || 1);
  }

  private _updatePercolation(): void {
    const occupied = Array.from(this._nodes.values()).filter((n) => n.activation > 0.5).length;
    this._percolationProbability = occupied / (this._nodes.size || 1);
  }

  stimulate(nodeId: string, delta: number): void {
    const node = this._nodes.get(nodeId);
    if (!node) return;
    node.intensity = Math.max(0, node.intensity + delta);
    node.activation = this._sigmoid(node.intensity - node.hormeticDose);
    node.resilience = Math.exp(-Math.pow(node.intensity - node.hormeticDose, 2) / (2 * node.hormeticDose * node.hormeticDose));
    this._updateAllostaticLoad();
    this._updatePercolation();
  }

  networkState(): NetworkState {
    const visited = new Set<string>();
    let maxComponent = 0;
    for (const id of this._nodes.keys()) {
      if (visited.has(id)) continue;
      const stack = [id];
      let size = 0;
      while (stack.length > 0) {
        const curr = stack.pop()!;
        if (visited.has(curr)) continue;
        visited.add(curr);
        size++;
        for (const neighbor of this._edges.get(curr) ?? []) {
          if (!visited.has(neighbor)) stack.push(neighbor);
        }
      }
      maxComponent = Math.max(maxComponent, size);
    }
    const avgResilience = Array.from(this._nodes.values()).reduce((s, n) => s + n.resilience, 0) / (this._nodes.size || 1);
    const threshold = 1 / (this._averageDegree() || 1);
    return {
      nodes: this._nodes.size,
      edges: this.edgeCount,
      percolationThreshold: threshold,
      giantComponentSize: maxComponent,
      averageResilience: avgResilience,
    };
  }

  private _averageDegree(): number {
    if (this._nodes.size === 0) return 0;
    let sum = 0;
    for (const set of this._edges.values()) sum += set.size;
    return sum / this._nodes.size;
  }

  hormesisCurve(doses: number[]): { dose: number; response: number }[] {
    return doses.map((dose) => {
      const response = 1 - Math.exp(-dose * dose / 2);
      return { dose, response };
    });
  }

  cascadeFailure(startId: string): string[] {
    const failed: string[] = [];
    const queue: string[] = [startId];
    const threshold = 0.7;
    while (queue.length > 0) {
      const curr = queue.shift()!;
      const node = this._nodes.get(curr);
      if (!node || failed.includes(curr)) continue;
      if (node.activation > threshold) {
        failed.push(curr);
        for (const neighbor of this._edges.get(curr) ?? []) {
          queue.push(neighbor);
        }
      }
    }
    return failed;
  }

  totalPower(): number {
    return Array.from(this._nodes.values()).reduce((s, n) => s + n.activation * n.resilience, 0);
  }

  report(): Record<string, unknown> {
    return {
      nodes: this._nodes.size,
      edges: this.edgeCount,
      allostaticOverload: this._allostaticOverload,
      percolation: this._percolationProbability,
      totalPower: this.totalPower(),
      state: this._state,
    };
  }
}
