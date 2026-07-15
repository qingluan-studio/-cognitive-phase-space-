export interface SandpileState {
  grid: number[][];
  avalancheSize: number;
  avalancheDuration: number;
  topplings: number;
}

export class SelfOrganizedCriticality {
  private _grid: number[][];
  private _rows: number;
  private _cols: number;
  private _threshold: number;
  private _history: SandpileState[];
  private _totalGrains: number;
  private _avalancheSizes: number[];
  private _avalancheDurations: number[];

  constructor(rows: number, cols: number, threshold: number = 4) {
    this._rows = rows;
    this._cols = cols;
    this._threshold = threshold;
    this._grid = Array.from({ length: rows }, () => new Array(cols).fill(0));
    this._history = [];
    this._totalGrains = 0;
    this._avalancheSizes = [];
    this._avalancheDurations = [];
  }

  get rows(): number { return this._rows; }
  get cols(): number { return this._cols; }
  get threshold(): number { return this._threshold; }
  get totalGrains(): number { return this._totalGrains; }
  get avalancheSizes(): number[] { return [...this._avalancheSizes]; }
  get avalancheDurations(): number[] { return [...this._avalancheDurations]; }

  public addGrain(row: number, col: number): SandpileState {
    if (row >= 0 && row < this._rows && col >= 0 && col < this._cols) {
      this._grid[row][col]++;
      this._totalGrains++;
    }
    return this._topple();
  }

  public addGrainAtCenter(): SandpileState {
    const r = Math.floor(this._rows / 2);
    const c = Math.floor(this._cols / 2);
    return this.addGrain(r, c);
  }

  public addRandomGrain(): SandpileState {
    const r = Math.floor(Math.random() * this._rows);
    const c = Math.floor(Math.random() * this._cols);
    return this.addGrain(r, c);
  }

  private _topple(): SandpileState {
    const toppled = new Set<string>();
    let duration = 0;
    let unstable = true;
    while (unstable) {
      unstable = false;
      const toTopple: { r: number; c: number }[] = [];
      for (let r = 0; r < this._rows; r++) {
        for (let c = 0; c < this._cols; c++) {
          if (this._grid[r][c] >= this._threshold) {
            toTopple.push({ r, c });
          }
        }
      }
      if (toTopple.length > 0) {
        unstable = true;
        duration++;
        for (const { r, c } of toTopple) {
          this._grid[r][c] -= this._threshold;
          toppled.add(`${r},${c}`);
          const neighbors = [
            { r: r - 1, c },
            { r: r + 1, c },
            { r, c: c - 1 },
            { r, c: c + 1 }
          ];
          for (const n of neighbors) {
            if (n.r >= 0 && n.r < this._rows && n.c >= 0 && n.c < this._cols) {
              this._grid[n.r][n.c]++;
            } else {
              this._totalGrains--;
            }
          }
        }
      }
    }
    const state: SandpileState = {
      grid: this._grid.map(row => [...row]),
      avalancheSize: toppled.size,
      avalancheDuration: duration,
      topplings: toppled.size
    };
    this._history.push(state);
    this._avalancheSizes.push(toppled.size);
    this._avalancheDurations.push(duration);
    return state;
  }

  public run(steps: number): void {
    for (let i = 0; i < steps; i++) {
      this.addRandomGrain();
    }
  }

  public computeSlopeDistribution(): Map<number, number> {
    const dist = new Map<number, number>();
    for (let r = 0; r < this._rows; r++) {
      for (let c = 0; c < this._cols; c++) {
        const val = this._grid[r][c];
        dist.set(val, (dist.get(val) || 0) + 1);
      }
    }
    return dist;
  }

  public computeAvalancheSizeDistribution(): Map<number, number> {
    const dist = new Map<number, number>();
    for (const size of this._avalancheSizes) {
      dist.set(size, (dist.get(size) || 0) + 1);
    }
    return dist;
  }

  public computePowerLawExponent(): number {
    const sizes = this._avalancheSizes.filter(s => s > 0);
    if (sizes.length < 10) return 0;
    sizes.sort((a, b) => a - b);
    const logX = sizes.map(s => Math.log(s));
    const logY = sizes.map((_, i) => Math.log(1 - i / sizes.length));
    const n = logX.length;
    const meanX = logX.reduce((a, b) => a + b, 0) / n;
    const meanY = logY.reduce((a, b) => a + b, 0) / n;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (logX[i] - meanX) * (logY[i] - meanY);
      den += (logX[i] - meanX) ** 2;
    }
    return den > 0 ? num / den : 0;
  }

  public computeMeanAvalancheSize(): number {
    if (this._avalancheSizes.length === 0) return 0;
    return this._avalancheSizes.reduce((a, b) => a + b, 0) / this._avalancheSizes.length;
  }

  public computeMeanAvalancheDuration(): number {
    if (this._avalancheDurations.length === 0) return 0;
    return this._avalancheDurations.reduce((a, b) => a + b, 0) / this._avalancheDurations.length;
  }

  public computeCorrelationTime(): number {
    if (this._avalancheSizes.length < 2) return 0;
    const mean = this.computeMeanAvalancheSize();
    let c0 = 0;
    let ct = 0;
    for (const s of this._avalancheSizes) {
      c0 += (s - mean) ** 2;
    }
    c0 /= this._avalancheSizes.length;
    for (let t = 1; t < this._avalancheSizes.length; t++) {
      let sum = 0;
      for (let i = 0; i < this._avalancheSizes.length - t; i++) {
        sum += (this._avalancheSizes[i] - mean) * (this._avalancheSizes[i + t] - mean);
      }
      ct = sum / (this._avalancheSizes.length - t);
      if (ct < c0 / Math.E) return t;
    }
    return this._avalancheSizes.length;
  }

  public isCritical(): boolean {
    const meanSlope = this._grid.flat().reduce((a, b) => a + b, 0) / (this._rows * this._cols);
    return Math.abs(meanSlope - (this._threshold - 1)) < 0.5;
  }

  public getAvalancheStatistics(): { maxSize: number; maxDuration: number; totalEvents: number } {
    return {
      maxSize: Math.max(...this._avalancheSizes, 0),
      maxDuration: Math.max(...this._avalancheDurations, 0),
      totalEvents: this._avalancheSizes.length
    };
  }

  public reset(): void {
    this._grid = Array.from({ length: this._rows }, () => new Array(this._cols).fill(0));
    this._history = [];
    this._totalGrains = 0;
    this._avalancheSizes = [];
    this._avalancheDurations = [];
  }

  public exportGrid(): number[][] {
    return this._grid.map(row => [...row]);
  }

  public exportHistory(): SandpileState[] {
    return this._history.map(h => ({
      grid: h.grid.map(row => [...row]),
      avalancheSize: h.avalancheSize,
      avalancheDuration: h.avalancheDuration,
      topplings: h.topplings
    }));
  }
}
