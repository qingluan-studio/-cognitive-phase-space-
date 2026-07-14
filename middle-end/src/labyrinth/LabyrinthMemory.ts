export interface MemoryTile {
  id: string;
  content: string;
  connections: string[];
  visited: boolean;
  visitCount: number;
}

export interface MemoryPath {
  tiles: string[];
  length: number;
  entropy: number;
}

export class LabyrinthMemory {
  private _tiles: Map<string, MemoryTile> = new Map();
  private _paths: MemoryPath[] = [];
  private _currentTile: string | null = null;
  private _adjacencyMatrix: Map<string, Map<string, number>> = new Map();
  private _spectralGap: number;

  constructor() {
    this._spectralGap = 0;
  }

  get currentTile(): string | null {
    return this._currentTile;
  }

  get spectralGap(): number {
    return this._spectralGap;
  }

  public addTile(tile: MemoryTile): void {
    this._tiles.set(tile.id, tile);
    this._adjacencyMatrix.set(tile.id, new Map());
    if (this._currentTile === null) this._currentTile = tile.id;
  }

  public connect(fromId: string, toId: string): void {
    const from = this._tiles.get(fromId);
    if (!from || !this._tiles.has(toId)) return;
    if (!from.connections.includes(toId)) from.connections.push(toId);
    this._adjacencyMatrix.get(fromId)?.set(toId, (this._adjacencyMatrix.get(fromId)?.get(toId) ?? 0) + 1);
    this._updateSpectralGap();
  }

  public stepTo(tileId: string): MemoryTile | null {
    const tile = this._tiles.get(tileId);
    if (!tile) return null;
    tile.visited = true;
    tile.visitCount += 1;
    this._currentTile = tileId;
    return tile;
  }

  public recordPath(tileIds: string[]): MemoryPath {
    const entropy = this._computePathEntropy(tileIds);
    const path: MemoryPath = {
      tiles: [...tileIds],
      length: tileIds.length,
      entropy,
    };
    this._paths.push(path);
    if (this._paths.length > 50) this._paths.shift();
    return path;
  }

  public forgetTile(tileId: string): boolean {
    const removed = this._tiles.delete(tileId);
    if (removed) {
      this._adjacencyMatrix.delete(tileId);
      for (const adj of this._adjacencyMatrix.values()) adj.delete(tileId);
    }
    return removed;
  }

  public report(): { tileCount: number; pathCount: number; current: string | null } {
    return {
      tileCount: this._tiles.size,
      pathCount: this._paths.length,
      current: this._currentTile,
    };
  }

  public findShortestPath(fromId: string, toId: string): string[] {
    const queue: { node: string; path: string[] }[] = [{ node: fromId, path: [fromId] }];
    const visited = new Set<string>();
    while (queue.length > 0) {
      const { node, path } = queue.shift()!;
      if (node === toId) return path;
      if (visited.has(node)) continue;
      visited.add(node);
      const tile = this._tiles.get(node);
      if (!tile) continue;
      for (const next of tile.connections) {
        if (!visited.has(next)) {
          queue.push({ node: next, path: [...path, next] });
        }
      }
    }
    return [];
  }

  public computePageRank(iterations: number = 50, damping: number = 0.85): Map<string, number> {
    const ids = Array.from(this._tiles.keys());
    const n = ids.length;
    if (n === 0) return new Map();
    const rank = new Map<string, number>();
    for (const id of ids) rank.set(id, 1 / n);
    for (let iter = 0; iter < iterations; iter++) {
      const newRank = new Map<string, number>();
      for (const id of ids) {
        let sum = 0;
        for (const [from, adj] of this._adjacencyMatrix) {
          if (adj.has(id)) {
            const outDegree = Array.from(adj.values()).reduce((a, b) => a + b, 0);
            sum += (rank.get(from) ?? 0) * (adj.get(id) ?? 0) / Math.max(outDegree, 1);
          }
        }
        newRank.set(id, (1 - damping) / n + damping * sum);
      }
      for (const id of ids) rank.set(id, newRank.get(id) ?? 0);
    }
    return rank;
  }

  public computeSpectralGap(): number {
    return this._spectralGap;
  }

  private _computePathEntropy(tileIds: string[]): number {
    const freq = new Map<string, number>();
    for (const id of tileIds) {
      freq.set(id, (freq.get(id) ?? 0) + 1);
    }
    let entropy = 0;
    for (const count of freq.values()) {
      const p = count / tileIds.length;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  private _updateSpectralGap(): void {
    const ids = Array.from(this._tiles.keys());
    const n = ids.length;
    if (n === 0) {
      this._spectralGap = 0;
      return;
    }
    const degrees = ids.map(id => this._tiles.get(id)?.connections.length ?? 0);
    const totalDegree = degrees.reduce((a, b) => a + b, 0);
    if (totalDegree === 0) {
      this._spectralGap = 0;
      return;
    }
    const laplacian = ids.map((id, i) => {
      const row = new Array(n).fill(0);
      row[i] = (this._tiles.get(id)?.connections.length ?? 0) / totalDegree;
      for (const conn of this._tiles.get(id)?.connections ?? []) {
        const j = ids.indexOf(conn);
        if (j >= 0) row[j] = -1 / totalDegree;
      }
      return row;
    });
    const eigenvalues = this._powerIteration(laplacian, n);
    eigenvalues.sort((a, b) => a - b);
    this._spectralGap = eigenvalues.length > 1 ? eigenvalues[1] - eigenvalues[0] : 0;
  }

  private _powerIteration(matrix: number[][], n: number): number[] {
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
    return [eigenvalue];
  }
}
