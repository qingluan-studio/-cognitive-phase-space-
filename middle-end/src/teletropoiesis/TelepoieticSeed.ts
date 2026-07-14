export interface SeedCell {
  x: number;
  y: number;
  state: number;
  potential: number;
}

export interface SeedConfig {
  gridSize: number;
  initialDensity: number;
  birthThreshold: number;
  growthRate: number;
}

export class TelepoieticSeed {
  private _config: SeedConfig;
  private _grid: SeedCell[][] = [];
  private _generation: number = 0;
  private _entropyHistory: number[] = [];
  private _growthFront: number = 0;
  private _vonNeumannRadius: number = 1;

  constructor(config: SeedConfig) {
    this._config = config;
    this._initializeGrid();
  }

  get gridSize(): number {
    return this._config.gridSize;
  }
  get generation(): number {
    return this._generation;
  }
  get liveCellCount(): number {
    let count = 0;
    for (const row of this._grid) {
      for (const cell of row) {
        if (cell.state > 0) count++;
      }
    }
    return count;
  }
  private _initializeGrid(): void {
    this._grid = [];
    const n = this._config.gridSize;
    for (let y = 0; y < n; y++) {
      const row: SeedCell[] = [];
      for (let x = 0; x < n; x++) {
        row.push({ x, y, state: Math.random() < this._config.initialDensity ? 1 : 0, potential: 0 });
      }
      this._grid.push(row);
    }
  }

  grow(): void {
    const n = this._config.gridSize;
    const newGrid: SeedCell[][] = [];
    for (let y = 0; y < n; y++) {
      const row: SeedCell[] = [];
      for (let x = 0; x < n; x++) {
        const neighbors = this._countVonNeumannNeighbors(x, y);
        const current = this._grid[y][x];
        let newState = current.state, newPotential = current.potential;
        if (current.state > 0) {
          if (neighbors < 2 || neighbors > 3) {
            newState = 0;
            newPotential *= 0.5;
          } else {
            newPotential += this._config.growthRate;
          }
        } else if (neighbors >= this._config.birthThreshold) {
          newState = 1;
          newPotential = neighbors * this._config.growthRate;
        }
        row.push({ x, y, state: newState, potential: newPotential });
      }
      newGrid.push(row);
    }
    this._grid = newGrid;
    this._generation++;
    this._updateEntropy();
    this._growthFront = this._computeGrowthFront();
  }
  private _countVonNeumannNeighbors(x: number, y: number): number {
    let count = 0;
    const r = this._vonNeumannRadius;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx === 0 && dy === 0) continue;
        if (Math.abs(dx) + Math.abs(dy) > r) continue;
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < this._config.gridSize && ny >= 0 && ny < this._config.gridSize) {
          count += this._grid[ny][nx].state > 0 ? 1 : 0;
        }
      }
    }
    return count;
  }

  private _updateEntropy(): void {
    const live = this.liveCellCount;
    const total = this._config.gridSize * this._config.gridSize;
    const dead = total - live;
    if (live === 0 || dead === 0) {
      this._entropyHistory.push(0);
    } else {
      const pLive = live / total, pDead = dead / total;
      this._entropyHistory.push(-pLive * Math.log2(pLive) - pDead * Math.log2(pDead));
    }
    if (this._entropyHistory.length > 50) this._entropyHistory.shift();
  }
  private _computeGrowthFront(): number {
    let maxDist = 0;
    const center = this._config.gridSize / 2;
    for (const row of this._grid) {
      for (const cell of row) {
        if (cell.state > 0) {
          const dist = Math.sqrt((cell.x - center) ** 2 + (cell.y - center) ** 2);
          if (dist > maxDist) maxDist = dist;
        }
      }
    }
    return maxDist;
  }

  seedAt(x: number, y: number, potential: number = 1): boolean {
    if (x < 0 || x >= this._config.gridSize || y < 0 || y >= this._config.gridSize) return false;
    this._grid[y][x].state = 1;
    this._grid[y][x].potential = potential;
    return true;
  }
  extinguishAt(x: number, y: number): boolean {
    if (x < 0 || x >= this._config.gridSize || y < 0 || y >= this._config.gridSize) return false;
    this._grid[y][x].state = 0;
    this._grid[y][x].potential = 0;
    return true;
  }

  getCell(x: number, y: number): SeedCell | null {
    if (x < 0 || x >= this._config.gridSize || y < 0 || y >= this._config.gridSize) return null;
    return { ...this._grid[y][x] };
  }
  getDensity(): number {
    const total = this._config.gridSize * this._config.gridSize;
    return total > 0 ? this.liveCellCount / total : 0;
  }

  reset(): void {
    this._generation = 0;
    this._entropyHistory = [];
    this._growthFront = 0;
    this._initializeGrid();
  }
  getEntropyHistory(): number[] {
    return [...this._entropyHistory];
  }

  getGrowthFront(): number {
    return this._growthFront;
  }
  computeCorrelationLength(): number {
    const n = this._config.gridSize;
    let totalPairs = 0, correlatedPairs = 0;
    for (let y1 = 0; y1 < n; y1++) {
      for (let x1 = 0; x1 < n; x1++) {
        for (let dy = 1; dy <= 3; dy++) {
          for (let dx = 0; dx <= 3; dx++) {
            const x2 = x1 + dx, y2 = y1 + dy;
            if (x2 >= n || y2 >= n) continue;
            totalPairs++;
            if (this._grid[y1][x1].state === this._grid[y2][x2].state) correlatedPairs++;
          }
        }
      }
    }
    return totalPairs > 0 ? correlatedPairs / totalPairs : 0;
  }

  setBirthThreshold(t: number): void {
    this._config.birthThreshold = Math.max(1, Math.min(8, t));
  }

  setVonNeumannRadius(r: number): void {
    this._vonNeumannRadius = Math.max(1, Math.min(3, r));
  }

  computeMeanPotential(): number {
    let sum = 0, count = 0;
    for (const row of this._grid) {
      for (const cell of row) {
        if (cell.state > 0) {
          sum += cell.potential;
          count++;
        }
      }
    }
    return count > 0 ? sum / count : 0;
  }
}
