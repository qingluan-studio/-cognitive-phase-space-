export interface LoopNode {
  id: string;
  statement: string;
  references: string[];
  truthValue: boolean | null;
}

export interface LoopResult {
  loopId: string;
  nodes: string[];
  paradoxical: boolean;
  detectedAt: number;
}

export class LiarLoopDetector {
  private _nodes: Map<string, LoopNode> = new Map();
  private _results: LoopResult[] = [];
  private _adjacencyMatrix: Map<string, Map<string, number>> = new Map();
  private _eigenvalueCache: number[] = [];

  addNode(node: LoopNode): void {
    this._nodes.set(node.id, node);
    this._adjacencyMatrix.set(node.id, new Map());
  }

  link(fromId: string, toId: string): void {
    const from = this._nodes.get(fromId);
    if (!from || !this._nodes.has(toId)) return;
    if (!from.references.includes(toId)) from.references.push(toId);
    this._adjacencyMatrix.get(fromId)?.set(toId, (this._adjacencyMatrix.get(fromId)?.get(toId) ?? 0) + 1);
    this._updateEigenvalues();
  }

  detect(startId: string): LoopResult | null {
    const visited = new Set<string>();
    const path: string[] = [];
    const dfs = (current: string): string[] | null => {
      if (visited.has(current)) {
        const idx = path.indexOf(current);
        return idx >= 0 ? path.slice(idx) : null;
      }
      visited.add(current);
      path.push(current);
      const node = this._nodes.get(current);
      if (node) {
        for (const ref of node.references) {
          const loop = dfs(ref);
          if (loop) return loop;
        }
      }
      path.pop();
      visited.delete(current);
      return null;
    };
    const loop = dfs(startId);
    if (!loop) return null;
    const paradoxical = loop.length % 2 === 1;
    const result: LoopResult = {
      loopId: `loop-${Date.now()}`,
      nodes: loop,
      paradoxical,
      detectedAt: Date.now(),
    };
    this._results.push(result);
    if (this._results.length > 50) this._results.shift();
    return result;
  }

  evaluateTruth(nodeId: string): boolean | null {
    const node = this._nodes.get(nodeId);
    if (!node) return null;
    if (node.truthValue !== null) return node.truthValue;
    const loop = this.detect(nodeId);
    if (loop && loop.paradoxical) return null;
    const negations = node.references.filter(ref => {
      const refNode = this._nodes.get(ref);
      return refNode && refNode.statement.includes('不');
    }).length;
    return negations % 2 === 0;
  }

  getNode(id: string): LoopNode | null {
    return this._nodes.get(id) ?? null;
  }

  getResults(): LoopResult[] {
    return [...this._results];
  }

  computeGraphEntropy(): number {
    const degrees: number[] = [];
    for (const adj of this._adjacencyMatrix.values()) {
      degrees.push(Array.from(adj.values()).reduce((a, b) => a + b, 0));
    }
    const total = degrees.reduce((a, b) => a + b, 0);
    if (total === 0) return 0;
    let entropy = 0;
    for (const d of degrees) {
      const p = d / total;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  computeEigenvalueSpectrum(): number[] {
    return [...this._eigenvalueCache];
  }

  computeAlgebraicConnectivity(): number {
    if (this._eigenvalueCache.length < 2) return 0;
    const sorted = [...this._eigenvalueCache].sort((a, b) => a - b);
    return sorted[1] - sorted[0];
  }

  private _updateEigenvalues(): void {
    const ids = Array.from(this._nodes.keys());
    const n = ids.length;
    if (n === 0) return;
    const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        matrix[i][j] = this._adjacencyMatrix.get(ids[i])?.get(ids[j]) ?? 0;
      }
    }
    const vec = new Array(n).fill(1 / n);
    for (let iter = 0; iter < 20; iter++) {
      const newVec = new Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          newVec[i] += matrix[i][j] * vec[j];
        }
      }
      const norm = Math.sqrt(newVec.reduce((s, v) => s + v * v, 0));
      for (let i = 0; i < n; i++) vec[i] = newVec[i] / (norm || 1);
    }
    const eigenvalue = vec.reduce((s, v, i) => s + v * matrix[i].reduce((ss, m, j) => ss + m * vec[j], 0), 0);
    this._eigenvalueCache.push(eigenvalue);
    if (this._eigenvalueCache.length > 10) this._eigenvalueCache.shift();
  }
}
