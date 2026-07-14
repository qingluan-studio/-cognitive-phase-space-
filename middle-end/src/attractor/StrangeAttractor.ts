export interface StrangeAttractorData {
  readonly attractorId: string;
  sigma: number;
  rho: number;
  beta: number;
  dt: number;
}

export interface TrajectoryPoint {
  x: number;
  y: number;
  z: number;
  step: number;
}

export class StrangeAttractor {
  private _data: StrangeAttractorData;
  private _trajectory: TrajectoryPoint[] = [];
  private _position: { x: number; y: number; z: number };
  private _step: number = 0;
  private _lyapunovEstimate: number = 0;
  private _kaplanYorkeDimension: number = 0;
  private _recurrenceMatrix: boolean[][] = [];
  private _boxCounts: Map<number, number> = new Map();

  constructor(data: StrangeAttractorData, initial: { x: number; y: number; z: number }) {
    this._data = { ...data };
    this._position = { ...initial };
  }

  get attractorId(): string {
    return this._data.attractorId;
  }

  get position(): Readonly<{ x: number; y: number; z: number }> {
    return this._position;
  }

  get trajectoryLength(): number {
    return this._trajectory.length;
  }

  get kaplanYorkeDimension(): number {
    return this._kaplanYorkeDimension;
  }

  public evolve(): TrajectoryPoint {
    const { x, y, z } = this._position;
    const dx = this._data.sigma * (y - x);
    const dy = x * (this._data.rho - z) - y;
    const dz = x * y - this._data.beta * z;
    this._position.x += dx * this._data.dt;
    this._position.y += dy * this._data.dt;
    this._position.z += dz * this._data.dt;
    this._step++;
    const point: TrajectoryPoint = {
      x: this._position.x,
      y: this._position.y,
      z: this._position.z,
      step: this._step,
    };
    this._trajectory.push(point);
    if (this._trajectory.length > 500) {
      this._trajectory.shift();
    }
    this._updateLyapunov();
    this._updateKaplanYorke();
    return point;
  }

  private _updateLyapunov(): void {
    if (this._trajectory.length < 2) {
      return;
    }
    const prev = this._trajectory[this._trajectory.length - 2];
    const curr = this._trajectory[this._trajectory.length - 1];
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    const dz = curr.z - prev.z;
    const divergence = Math.sqrt(dx * dx + dy * dy + dz * dz);
    this._lyapunovEstimate = this._lyapunovEstimate * 0.99 + divergence * 0.01;
  }

  private _updateKaplanYorke(): void {
    if (this._trajectory.length < 10) return;
    const n = Math.min(this._trajectory.length, 50);
    const recent = this._trajectory.slice(-n);
    const exponents = this._computeLocalExponents(recent);
    let sum = 0;
    let dim = 0;
    for (let i = 0; i < exponents.length; i++) {
      sum += exponents[i];
      if (sum < 0) {
        dim = i + sum / Math.abs(exponents[i]);
        break;
      }
    }
    this._kaplanYorkeDimension = dim;
  }

  private _computeLocalExponents(points: TrajectoryPoint[]): number[] {
    const dxx = this._averageDifference(points, 'x');
    const dyy = this._averageDifference(points, 'y');
    const dzz = this._averageDifference(points, 'z');
    return [Math.log(dxx + 1e-9), Math.log(dyy + 1e-9), Math.log(dzz + 1e-9)];
  }

  private _averageDifference(points: TrajectoryPoint[], axis: 'x' | 'y' | 'z'): number {
    let sum = 0;
    for (let i = 1; i < points.length; i++) {
      sum += Math.abs(points[i][axis] - points[i - 1][axis]);
    }
    return sum / (points.length - 1);
  }

  public runSteps(count: number): TrajectoryPoint[] {
    const points: TrajectoryPoint[] = [];
    for (let i = 0; i < count; i++) {
      points.push(this.evolve());
    }
    return points;
  }

  public perturb(amount: number): void {
    this._position.x += amount * (Math.random() - 0.5);
    this._position.y += amount * (Math.random() - 0.5);
    this._position.z += amount * (Math.random() - 0.5);
  }

  public adjustParameters(sigma?: number, rho?: number, beta?: number): void {
    if (sigma !== undefined) {
      this._data.sigma = sigma;
    }
    if (rho !== undefined) {
      this._data.rho = rho;
    }
    if (beta !== undefined) {
      this._data.beta = beta;
    }
  }

  public resetTo(initial: { x: number; y: number; z: number }): void {
    this._position = { ...initial };
    this._trajectory = [];
    this._step = 0;
    this._lyapunovEstimate = 0;
    this._kaplanYorkeDimension = 0;
    this._boxCounts.clear();
  }

  public computeBounds(): { minX: number; maxX: number; minZ: number; maxZ: number } {
    if (this._trajectory.length === 0) {
      return { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
    }
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    this._trajectory.forEach((p) => {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minZ = Math.min(minZ, p.z);
      maxZ = Math.max(maxZ, p.z);
    });
    return { minX, maxX, minZ, maxZ };
  }

  public computeBoxCountingDimension(boxSizes: number[] = [0.5, 0.25, 0.125, 0.0625]): number {
    const bounds = this.computeBounds();
    if (bounds.maxX === bounds.minX) return 0;
    const dims: number[] = [];
    for (const size of boxSizes) {
      const boxes = new Set<string>();
      for (const p of this._trajectory) {
        const ix = Math.floor((p.x - bounds.minX) / size);
        const iz = Math.floor((p.z - bounds.minZ) / size);
        boxes.add(`${ix},${iz}`);
      }
      this._boxCounts.set(size, boxes.size);
      dims.push(Math.log(boxes.size + 1) / Math.log(1 / size + 1));
    }
    return dims.reduce((a, b) => a + b, 0) / dims.length;
  }

  public computeRecurrencePlot(threshold: number = 2): number[][] {
    const n = Math.min(this._trajectory.length, 100);
    if (n < 2) return [];
    const matrix: number[][] = [];
    for (let i = 0; i < n; i++) {
      matrix[i] = [];
      for (let j = 0; j < n; j++) {
        const a = this._trajectory[this._trajectory.length - n + i];
        const b = this._trajectory[this._trajectory.length - n + j];
        const d = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
        matrix[i][j] = d < threshold ? 1 : 0;
      }
    }
    return matrix;
  }

  public attractorReport(): Record<string, unknown> {
    const bounds = this.computeBounds();
    return {
      attractorId: this.attractorId,
      sigma: this._data.sigma,
      rho: this._data.rho,
      beta: this._data.beta,
      dt: this._data.dt,
      step: this._step,
      position: { x: this._position.x.toFixed(3), y: this._position.y.toFixed(3), z: this._position.z.toFixed(3) },
      trajectoryLength: this.trajectoryLength,
      lyapunovEstimate: this._lyapunovEstimate.toFixed(4),
      kaplanYorkeDimension: this._kaplanYorkeDimension.toFixed(3),
      boxCountingDimension: this.computeBoxCountingDimension().toFixed(3),
      bounds,
    };
  }
}
