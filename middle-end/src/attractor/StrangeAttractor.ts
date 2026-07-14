/**
 * StrangeAttractor - 奇异吸引子
 * 混沌系统中隐藏的有序模式，轨迹永不重复但始终被吸引
 * 到一个分形结构的奇异区域内，如洛伦兹吸引子的蝴蝶翅膀。
 */

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
      bounds,
    };
  }
}
