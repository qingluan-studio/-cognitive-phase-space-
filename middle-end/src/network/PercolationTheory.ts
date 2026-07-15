export interface LatticeSite {
  x: number;
  y: number;
  occupied: boolean;
  clusterId: number;
}

export interface PercolationRecord {
  occupationProbability: number;
  largestClusterFraction: number;
  percolating: boolean;
  averageClusterSize: number;
}

export class PercolationTheory {
  private _lattice: LatticeSite[][];
  private _size: number;
  private _occupationProbability: number;
  private _clusterMap: number[][];
  private _largestClusterSize: number;
  private _percolating: boolean;
  private _history: PercolationRecord[];
  private _bondProbability: number;
  private _dimension: number;

  constructor(size: number = 50) {
    this._size = Math.max(2, size);
    this._lattice = [];
    this._clusterMap = [];
    this._occupationProbability = 0.5;
    this._largestClusterSize = 0;
    this._percolating = false;
    this._history = [];
    this._bondProbability = 0.5;
    this._dimension = 2;
    this._initializeLattice();
  }

  get size(): number {
    return this._size;
  }

  get occupationProbability(): number {
    return this._occupationProbability;
  }

  get largestClusterSize(): number {
    return this._largestClusterSize;
  }

  get isPercolating(): boolean {
    return this._percolating;
  }

  private _initializeLattice(): void {
    this._lattice = [];
    this._clusterMap = [];
    for (let i = 0; i < this._size; i++) {
      const row: LatticeSite[] = [];
      const clusterRow: number[] = [];
      for (let j = 0; j < this._size; j++) {
        row.push({ x: i, y: j, occupied: Math.random() < this._occupationProbability, clusterId: -1 });
        clusterRow.push(-1);
      }
      this._lattice.push(row);
      this._clusterMap.push(clusterRow);
    }
  }

  public setOccupationProbability(p: number): void {
    this._occupationProbability = Math.max(0, Math.min(1, p));
    for (let i = 0; i < this._size; i++) {
      for (let j = 0; j < this._size; j++) {
        this._lattice[i][j].occupied = Math.random() < this._occupationProbability;
      }
    }
    this._findClusters();
  }

  private _findClusters(): void {
    for (let i = 0; i < this._size; i++) {
      for (let j = 0; j < this._size; j++) {
        this._clusterMap[i][j] = -1;
      }
    }
    let clusterId = 0;
    const clusterSizes: number[] = [];
    for (let i = 0; i < this._size; i++) {
      for (let j = 0; j < this._size; j++) {
        if (this._lattice[i][j].occupied && this._clusterMap[i][j] === -1) {
          const size = this._floodFill(i, j, clusterId);
          clusterSizes.push(size);
          clusterId++;
        }
      }
    }
    this._largestClusterSize = clusterSizes.length > 0 ? Math.max(...clusterSizes) : 0;
    this._checkPercolation(clusterId);
  }

  private _floodFill(x: number, y: number, id: number): number {
    const stack = [[x, y]];
    let size = 0;
    while (stack.length > 0) {
      const [cx, cy] = stack.pop()!;
      if (cx < 0 || cx >= this._size || cy < 0 || cy >= this._size) continue;
      if (!this._lattice[cx][cy].occupied || this._clusterMap[cx][cy] !== -1) continue;
      this._clusterMap[cx][cy] = id;
      size++;
      stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
    return size;
  }

  private _checkPercolation(maxClusterId: number): void {
    this._percolating = false;
    for (let id = 0; id < maxClusterId; id++) {
      let touchesLeft = false;
      let touchesRight = false;
      let touchesTop = false;
      let touchesBottom = false;
      for (let i = 0; i < this._size; i++) {
        for (let j = 0; j < this._size; j++) {
          if (this._clusterMap[i][j] === id) {
            if (i === 0) touchesTop = true;
            if (i === this._size - 1) touchesBottom = true;
            if (j === 0) touchesLeft = true;
            if (j === this._size - 1) touchesRight = true;
          }
        }
      }
      if ((touchesLeft && touchesRight) || (touchesTop && touchesBottom)) {
        this._percolating = true;
        break;
      }
    }
  }

  public computeCorrelationLength(): number {
    const occupied = this._lattice.flat().filter(s => s.occupied).length;
    const total = this._size * this._size;
    const p = occupied / total;
    const pc = 0.5927;
    if (Math.abs(p - pc) < 1e-6) return Infinity;
    return Math.pow(Math.abs(p - pc), -0.88);
  }

  public computeSusceptibility(): number {
    const occupied = this._lattice.flat().filter(s => s.occupied).length;
    const total = this._size * this._size;
    const p = occupied / total;
    const pc = 0.5927;
    return Math.pow(Math.abs(p - pc), -1.8);
  }

  public sweepProbability(steps: number = 50): PercolationRecord[] {
    const records: PercolationRecord[] = [];
    for (let i = 0; i <= steps; i++) {
      const p = i / steps;
      this.setOccupationProbability(p);
      const avgCluster = this._computeAverageClusterSize();
      records.push({
        occupationProbability: p,
        largestClusterFraction: this._largestClusterSize / (this._size * this._size),
        percolating: this._percolating,
        averageClusterSize: avgCluster,
      });
    }
    this._history = records;
    return records;
  }

  private _computeAverageClusterSize(): number {
    const sizes: number[] = [];
    for (let i = 0; i < this._size; i++) {
      for (let j = 0; j < this._size; j++) {
        if (this._clusterMap[i][j] >= 0) {
          sizes.push(this._clusterMap[i][j]);
        }
      }
    }
    const counts: Record<number, number> = {};
    for (const id of sizes) {
      counts[id] = (counts[id] || 0) + 1;
    }
    const values = Object.values(counts);
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  }

  public getLattice(): LatticeSite[][] {
    return this._lattice.map(row => row.map(s => ({ ...s })));
  }

  public getClusterMap(): number[][] {
    return this._clusterMap.map(row => [...row]);
  }

  public getHistory(): PercolationRecord[] {
    return this._history.map(h => ({ ...h }));
  }

  public computeFractalDimension(): number {
    const boxSizes = [2, 4, 8, 16];
    const counts: number[] = [];
    for (const boxSize of boxSizes) {
      let count = 0;
      for (let i = 0; i < this._size; i += boxSize) {
        for (let j = 0; j < this._size; j += boxSize) {
          let occupied = false;
          for (let x = i; x < Math.min(i + boxSize, this._size); x++) {
            for (let y = j; y < Math.min(j + boxSize, this._size); y++) {
              if (this._lattice[x][y].occupied) occupied = true;
            }
          }
          if (occupied) count++;
        }
      }
      counts.push(count);
    }
    const logN = counts.map(c => Math.log(c + 1));
    const logR = boxSizes.map(r => Math.log(1 / r));
    const n = boxSizes.length;
    const sumX = logR.reduce((a, b) => a + b, 0);
    const sumY = logN.reduce((a, b) => a + b, 0);
    const sumXY = logR.reduce((sum, x, i) => sum + x * logN[i], 0);
    const sumX2 = logR.reduce((sum, x) => sum + x * x, 0);
    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  public setBondProbability(p: number): void {
    this._bondProbability = Math.max(0, Math.min(1, p));
  }

  public computeCriticalExponentBeta(): number {
    return 0.14;
  }

  public computeCriticalExponentNu(): number {
    return 0.88;
  }

  public reset(): void {
    this._occupationProbability = 0.5;
    this._initializeLattice();
    this._findClusters();
    this._history = [];
  }
}
