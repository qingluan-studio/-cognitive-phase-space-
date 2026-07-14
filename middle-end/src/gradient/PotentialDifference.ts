export interface PotentialNode {
  id: string;
  potential: number;
  charge: number;
  fixed: boolean;
}

export type PotentialFlow = {
  source: string;
  sink: string;
  current: number;
  resistance: number;
};

export interface PotentialConfig {
  conductivity: number;
  dielectricConstant: number;
  relaxationTime: number;
}

export class PotentialDifference {
  private _config: PotentialConfig;
  private _nodes: PotentialNode[] = [];
  private _flows: PotentialFlow[] = [];
  private _state: Record<string, unknown> = {};
  private _laplacianMatrix: number[][] = [];
  private _equipotentialError: number = 0;

  constructor(config: PotentialConfig) {
    this._config = config;
  }

  get nodeCount(): number {
    return this._nodes.length;
  }

  get totalEnergy(): number {
    let sum = 0;
    for (const n of this._nodes) {
      sum += n.potential * n.potential * n.charge;
    }
    return sum * 0.5;
  }

  get equipotentialError(): number {
    return this._equipotentialError;
  }

  private _buildLaplacian(): void {
    const n = this._nodes.length;
    this._laplacianMatrix = [];
    for (let i = 0; i < n; i++) {
      const row: number[] = [];
      for (let j = 0; j < n; j++) {
        if (i === j) {
          row.push(this._nodes.filter((node) => node.id !== this._nodes[i].id).length);
        } else {
          row.push(-1);
        }
      }
      this._laplacianMatrix.push(row);
    }
  }

  private _solveGaussSeidel(tolerance: number = 1e-3, maxIter: number = 50): void {
    const n = this._nodes.length;
    for (let iter = 0; iter < maxIter; iter++) {
      let maxDiff = 0;
      for (let i = 0; i < n; i++) {
        if (this._nodes[i].fixed) continue;
        let sum = 0;
        for (let j = 0; j < n; j++) {
          if (i !== j) {
            sum += this._nodes[j].potential;
          }
        }
        const newPotential = sum / Math.max(1, n - 1);
        const diff = Math.abs(newPotential - this._nodes[i].potential);
        if (diff > maxDiff) maxDiff = diff;
        this._nodes[i].potential = newPotential;
      }
      if (maxDiff < tolerance) break;
    }
    this._equipotentialError = 0;
    for (let i = 0; i < n; i++) {
      if (this._nodes[i].fixed) continue;
      let sum = 0;
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          sum += this._nodes[j].potential;
        }
      }
      const avg = sum / Math.max(1, n - 1);
      this._equipotentialError += Math.abs(this._nodes[i].potential - avg);
    }
  }

  addNode(id: string, potential: number, charge: number, fixed: boolean = false): PotentialNode {
    const node: PotentialNode = { id, potential, charge, fixed };
    this._nodes.push(node);
    if (this._nodes.length > 30) this._nodes.shift();
    this._buildLaplacian();
    return node;
  }

  connect(sourceId: string, sinkId: string, resistance: number): PotentialFlow | null {
    const source = this._nodes.find((n) => n.id === sourceId);
    const sink = this._nodes.find((n) => n.id === sinkId);
    if (!source || !sink) return null;
    const current = (source.potential - sink.potential) / (resistance + 0.001);
    const flow: PotentialFlow = { source: sourceId, sink: sinkId, current, resistance };
    this._flows.push(flow);
    if (this._flows.length > 40) this._flows.shift();
    this._state.lastConnection = { sourceId, sinkId };
    return flow;
  }

  relax(): void {
    this._solveGaussSeidel();
    for (const flow of this._flows) {
      const source = this._nodes.find((n) => n.id === flow.source);
      const sink = this._nodes.find((n) => n.id === flow.sink);
      if (source && sink) {
        flow.current = (source.potential - sink.potential) / (flow.resistance + 0.001);
      }
    }
  }

  potentialAt(id: string): number {
    const node = this._nodes.find((n) => n.id === id);
    return node ? node.potential : 0;
  }

  totalCurrent(): number {
    return this._flows.reduce((acc, f) => acc + Math.abs(f.current), 0);
  }

  findMaxPotential(): PotentialNode | null {
    if (this._nodes.length === 0) return null;
    return this._nodes.reduce((best, n) => (n.potential > best.potential ? n : best));
  }

  isEquilibrium(): boolean {
    return this._equipotentialError < 0.01;
  }

  reset(): void {
    this._nodes = [];
    this._flows = [];
    this._laplacianMatrix = [];
    this._equipotentialError = 0;
    this._state = {};
  }

  report(): Record<string, unknown> {
    return {
      nodes: this._nodes.length,
      flows: this._flows.length,
      totalEnergy: this.totalEnergy,
      state: this._state,
      equipotentialError: this._equipotentialError.toFixed(4),
      equilibrium: this.isEquilibrium(),
    };
  }
}
