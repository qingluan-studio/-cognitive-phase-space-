export interface CellPosition {
  x: number;
  y: number;
  density: number;
  stiffness: number;
}

export interface KeloidCluster {
  id: string;
  cells: CellPosition[];
  center: { x: number; y: number };
  radius: number;
  fractalDimension: number;
}

export class KeloidOvergrowth {
  private _clusters: Map<string, KeloidCluster> = new Map();
  private _grid: number[][] = [];
  private _state: Record<string, unknown> = {};
  private _aggregationSteps: number = 0;
  private _diffusionCoefficient: number = 0.1;

  constructor(gridSize: number = 50) {
    this._grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(0));
  }

  get clusterCount(): number {
    return this._clusters.size;
  }

  get gridSize(): number {
    return this._grid.length;
  }

  seedCluster(id: string, x: number, y: number, radius: number): KeloidCluster {
    const cells: CellPosition[] = [];
    for (let i = 0; i < radius * 2; i++) {
      for (let j = 0; j < radius * 2; j++) {
        const cx = x + i - radius;
        const cy = y + j - radius;
        const dist = Math.sqrt((cx - x) ** 2 + (cy - y) ** 2);
        if (dist <= radius) {
          cells.push({ x: cx, y: cy, density: 1 - dist / radius, stiffness: Math.random() });
        }
      }
    }
    const cluster: KeloidCluster = { id, cells, center: { x, y }, radius, fractalDimension: 0 };
    this._clusters.set(id, cluster);
    this._updateGrid(cluster);
    this._computeFractalDimension(cluster);
    return cluster;
  }

  private _updateGrid(cluster: KeloidCluster): void {
    for (const cell of cluster.cells) {
      const gx = Math.floor(cell.x + this._grid.length / 2);
      const gy = Math.floor(cell.y + this._grid.length / 2);
      if (gx >= 0 && gx < this._grid.length && gy >= 0 && gy < this._grid.length) {
        this._grid[gx][gy] = cell.density;
      }
    }
  }

  private _computeFractalDimension(cluster: KeloidCluster): void {
    const scales = [1, 2, 4];
    const counts = scales.map((s) => {
      const boxes = new Set<string>();
      for (const cell of cluster.cells) {
        boxes.add(`${Math.floor(cell.x / s)},${Math.floor(cell.y / s)}`);
      }
      return boxes.size;
    });
    let slope = 0;
    for (let i = 1; i < scales.length; i++) {
      slope += Math.log2(counts[i] / counts[i - 1]) / Math.log2(scales[i - 1] / scales[i]);
    }
    cluster.fractalDimension = slope / (scales.length - 1);
  }

  diffuse(steps: number): void {
    const size = this._grid.length;
    for (let s = 0; s < steps; s++) {
      const newGrid = this._grid.map((row) => [...row]);
      for (let i = 1; i < size - 1; i++) {
        for (let j = 1; j < size - 1; j++) {
          const laplacian =
            this._grid[i + 1][j] +
            this._grid[i - 1][j] +
            this._grid[i][j + 1] +
            this._grid[i][j - 1] -
            4 * this._grid[i][j];
          newGrid[i][j] = Math.max(0, Math.min(1, this._grid[i][j] + this._diffusionCoefficient * laplacian));
        }
      }
      this._grid = newGrid;
    }
    this._aggregationSteps += steps;
  }

  aggregate(clusterId: string, particles: number): void {
    const cluster = this._clusters.get(clusterId);
    if (!cluster) return;
    for (let i = 0; i < particles; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = cluster.radius + Math.random() * 5;
      const x = cluster.center.x + dist * Math.cos(angle);
      const y = cluster.center.y + dist * Math.sin(angle);
      let stuck = false;
      while (!stuck) {
        const neighbors = cluster.cells.filter((c) => Math.sqrt((c.x - x) ** 2 + (c.y - y) ** 2) < 2);
        if (neighbors.length > 0) {
          cluster.cells.push({ x, y, density: 0.5, stiffness: Math.random() });
          stuck = true;
        } else {
          break;
        }
      }
    }
    this._updateGrid(cluster);
    this._computeFractalDimension(cluster);
  }

  stiffnessMatrix(clusterId: string): number[][] {
    const cluster = this._clusters.get(clusterId);
    if (!cluster || cluster.cells.length === 0) return [[0]];
    const n = Math.min(cluster.cells.length, 10);
    const matrix: number[][] = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => {
        if (i === j) return cluster.cells[i].stiffness;
        const dx = cluster.cells[i].x - cluster.cells[j].x;
        const dy = cluster.cells[i].y - cluster.cells[j].y;
        return 1 / (Math.sqrt(dx * dx + dy * dy) + 1);
      })
    );
    return matrix;
  }

  totalDensity(): number {
    let sum = 0;
    for (const row of this._grid) {
      for (const v of row) sum += v;
    }
    return sum;
  }

  report(): Record<string, unknown> {
    return {
      clusters: this._clusters.size,
      gridSize: this._grid.length,
      totalDensity: this.totalDensity(),
      aggregationSteps: this._aggregationSteps,
      state: this._state,
    };
  }
}
