export interface InsightNode {
  id: string;
  content: string;
  concentration: number;
  connections: string[];
}

export interface InsightPattern {
  nodes: string[];
  averageConcentration: number;
  patternType: 'stripe' | 'spot' | 'labyrinth';
}

export class FermentedInsight {
  private _nodes: Map<string, InsightNode> = new Map();
  private _patterns: InsightPattern[] = [];
  private _diffusionRate: number = 0.1;
  private _reactionRate: number = 0.5;
  private _grid: number[][] = [];
  private _gridSize: number = 30;
  private _patternEntropy: number = 0;
  private _state: Record<string, unknown> = {};

  constructor() {
    this._initGrid();
    this._state.initializedAt = Date.now();
  }

  get nodeCount(): number {
    return this._nodes.size;
  }

  get patternEntropy(): number {
    return this._patternEntropy;
  }

  private _initGrid(): void {
    this._grid = [];
    for (let i = 0; i < this._gridSize; i++) {
      this._grid[i] = [];
      for (let j = 0; j < this._gridSize; j++) {
        this._grid[i][j] = Math.random() * 0.1;
      }
    }
  }

  addNode(id: string, content: string, initialConcentration: number): InsightNode {
    const node: InsightNode = {
      id,
      content,
      concentration: initialConcentration,
      connections: [],
    };
    this._nodes.set(id, node);
    const i = Math.floor(Math.random() * this._gridSize);
    const j = Math.floor(Math.random() * this._gridSize);
    this._grid[i][j] = initialConcentration;
    return node;
  }

  connect(fromId: string, toId: string): boolean {
    const from = this._nodes.get(fromId);
    const to = this._nodes.get(toId);
    if (!from || !to) return false;
    from.connections.push(toId);
    to.connections.push(fromId);
    return true;
  }

  diffuse(steps: number): void {
    for (let s = 0; s < steps; s++) {
      const newGrid = this._grid.map(row => [...row]);
      for (let i = 0; i < this._gridSize; i++) {
        for (let j = 0; j < this._gridSize; j++) {
          const laplacian =
            this._get(i - 1, j) + this._get(i + 1, j) + this._get(i, j - 1) + this._get(i, j + 1) - 4 * this._grid[i][j];
          const reaction = this._reactionRate * this._grid[i][j] * (1 - this._grid[i][j]);
          newGrid[i][j] = this._grid[i][j] + this._diffusionRate * laplacian + reaction * 0.01;
          newGrid[i][j] = Math.max(0, Math.min(1, newGrid[i][j]));
        }
      }
      this._grid = newGrid;
    }
    this._updatePatternEntropy();
    this._classifyPatterns();
  }

  private _get(i: number, j: number): number {
    const ii = (i + this._gridSize) % this._gridSize;
    const jj = (j + this._gridSize) % this._gridSize;
    return this._grid[ii][jj];
  }

  private _updatePatternEntropy(): void {
    const bins = 8;
    const counts = new Array(bins).fill(0);
    for (let i = 0; i < this._gridSize; i++) {
      for (let j = 0; j < this._gridSize; j++) {
        const idx = Math.min(bins - 1, Math.floor(this._grid[i][j] * bins));
        counts[idx]++;
      }
    }
    const total = this._gridSize * this._gridSize;
    let entropy = 0;
    for (const c of counts) {
      if (c > 0) {
        const p = c / total;
        entropy -= p * Math.log2(p);
      }
    }
    this._patternEntropy = entropy;
  }

  private _classifyPatterns(): void {
    this._patterns = [];
    const stripes = this._detectStripes();
    const spots = this._detectSpots();
    this._patterns.push(...stripes, ...spots);
  }

  private _detectStripes(): InsightPattern[] {
    const nodes = Array.from(this._nodes.keys()).slice(0, 5);
    return [{
      nodes,
      averageConcentration: nodes.reduce((s, id) => s + (this._nodes.get(id)?.concentration ?? 0), 0) / nodes.length,
      patternType: 'stripe',
    }];
  }

  private _detectSpots(): InsightPattern[] {
    const nodes = Array.from(this._nodes.keys()).slice(0, 3);
    return [{
      nodes,
      averageConcentration: nodes.reduce((s, id) => s + (this._nodes.get(id)?.concentration ?? 0), 0) / nodes.length,
      patternType: 'spot',
    }];
  }

  concentrationAt(x: number, y: number): number {
    const i = Math.floor(x) % this._gridSize;
    const j = Math.floor(y) % this._gridSize;
    return this._grid[i][j];
  }

  strongestNode(): InsightNode | null {
    let strongest: InsightNode | null = null;
    for (const n of this._nodes.values()) {
      if (!strongest || n.concentration > strongest.concentration) strongest = n;
    }
    return strongest;
  }

  averageConcentration(): number {
    if (this._nodes.size === 0) return 0;
    let sum = 0;
    for (const n of this._nodes.values()) sum += n.concentration;
    return sum / this._nodes.size;
  }

  setDiffusionRate(rate: number): void {
    this._diffusionRate = Math.max(0, Math.min(1, rate));
  }

  setReactionRate(rate: number): void {
    this._reactionRate = Math.max(0, Math.min(10, rate));
  }

  getPatterns(): InsightPattern[] {
    return [...this._patterns];
  }

  connectedComponents(): string[][] {
    const visited = new Set<string>();
    const components: string[][] = [];
    for (const [id, node] of this._nodes) {
      if (visited.has(id)) continue;
      const component: string[] = [];
      const queue = [node];
      visited.add(id);
      while (queue.length > 0) {
        const current = queue.shift()!;
        component.push(current.id);
        for (const neighborId of current.connections) {
          if (!visited.has(neighborId)) {
            visited.add(neighborId);
            const neighbor = this._nodes.get(neighborId);
            if (neighbor) queue.push(neighbor);
          }
        }
      }
      components.push(component);
    }
    return components;
  }

  clear(): void {
    this._nodes.clear();
    this._patterns = [];
    this._initGrid();
    this._patternEntropy = 0;
  }

  insightReport(): Record<string, unknown> {
    return {
      nodeCount: this._nodes.size,
      patternCount: this._patterns.length,
      patternEntropy: this._patternEntropy.toFixed(4),
      averageConcentration: this.averageConcentration().toFixed(4),
      diffusionRate: this._diffusionRate.toFixed(3),
      reactionRate: this._reactionRate.toFixed(3),
      connectedComponents: this.connectedComponents().length,
      state: this._state,
    };
  }
}
