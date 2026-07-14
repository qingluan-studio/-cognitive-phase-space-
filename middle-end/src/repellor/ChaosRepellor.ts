export interface PhasePoint {
  x: number;
  y: number;
  z: number;
  time: number;
}

export interface RepellorParameters {
  sigma: number;
  rho: number;
  beta: number;
  dt: number;
}

export class ChaosRepellor {
  private _params: RepellorParameters;
  private _trajectory: PhasePoint[] = [];
  private _state: Record<string, unknown> = {};
  private _lyapunovExponent: number = 0;
  private _fractalDimension: number = 0;
  private _entropyRate: number = 0;

  constructor(params: RepellorParameters) {
    this._params = { ...params };
  }

  get trajectoryLength(): number {
    return this._trajectory.length;
  }

  get lyapunovExponent(): number {
    return this._lyapunovExponent;
  }

  iterate(steps: number, start: { x: number; y: number; z: number }): PhasePoint[] {
    let { x, y, z } = start;
    const result: PhasePoint[] = [];
    for (let i = 0; i < steps; i++) {
      const dx = this._params.sigma * (y - x);
      const dy = x * (this._params.rho - z) - y;
      const dz = x * y - this._params.beta * z;
      x += dx * this._params.dt;
      y += dy * this._params.dt;
      z += dz * this._params.dt;
      const point: PhasePoint = { x, y, z, time: i * this._params.dt };
      result.push(point);
      this._trajectory.push(point);
    }
    if (this._trajectory.length > 2000) {
      this._trajectory.splice(0, this._trajectory.length - 2000);
    }
    this._computeLyapunov();
    this._computeFractalDimension();
    this._computeEntropyRate();
    return result;
  }

  private _computeLyapunov(): void {
    if (this._trajectory.length < 10) return;
    let sum = 0;
    for (let i = 1; i < this._trajectory.length; i++) {
      const d0 = Math.sqrt(
        Math.pow(this._trajectory[i - 1].x - this._trajectory[0].x, 2) +
          Math.pow(this._trajectory[i - 1].y - this._trajectory[0].y, 2) +
          Math.pow(this._trajectory[i - 1].z - this._trajectory[0].z, 2)
      );
      const d1 = Math.sqrt(
        Math.pow(this._trajectory[i].x - this._trajectory[0].x, 2) +
          Math.pow(this._trajectory[i].y - this._trajectory[0].y, 2) +
          Math.pow(this._trajectory[i].z - this._trajectory[0].z, 2)
      );
      if (d0 > 0) sum += Math.log2(d1 / d0);
    }
    this._lyapunovExponent = sum / (this._trajectory.length * this._params.dt);
  }

  private _computeFractalDimension(): void {
    const n = this._trajectory.length;
    if (n < 10) return;
    const scales = [1, 2, 4, 8];
    const counts = scales.map((s) => {
      const boxes = new Set<string>();
      for (const p of this._trajectory) {
        boxes.add(`${Math.floor(p.x / s)},${Math.floor(p.y / s)},${Math.floor(p.z / s)}`);
      }
      return boxes.size;
    });
    let slope = 0;
    for (let i = 1; i < scales.length; i++) {
      slope += Math.log2(counts[i] / counts[i - 1]) / Math.log2(scales[i - 1] / scales[i]);
    }
    this._fractalDimension = slope / (scales.length - 1);
  }

  private _computeEntropyRate(): void {
    if (this._trajectory.length < 2) return;
    const diffs = [];
    for (let i = 1; i < this._trajectory.length; i++) {
      diffs.push(
        Math.sqrt(
          Math.pow(this._trajectory[i].x - this._trajectory[i - 1].x, 2) +
            Math.pow(this._trajectory[i].y - this._trajectory[i - 1].y, 2) +
            Math.pow(this._trajectory[i].z - this._trajectory[i - 1].z, 2)
        )
      );
    }
    const total = diffs.reduce((s, v) => s + v, 0);
    this._entropyRate = -diffs.reduce((s, v) => {
      const p = v / total;
      return p > 0 ? s + p * Math.log2(p) : s;
    }, 0);
  }

  attractorCenter(): { x: number; y: number; z: number } {
    if (this._trajectory.length === 0) return { x: 0, y: 0, z: 0 };
    const sum = this._trajectory.reduce(
      (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y, z: acc.z + p.z }),
      { x: 0, y: 0, z: 0 }
    );
    return { x: sum.x / this._trajectory.length, y: sum.y / this._trajectory.length, z: sum.z / this._trajectory.length };
  }

  isChaotic(): boolean {
    return this._lyapunovExponent > 0;
  }

  periodDoublingBifurcation(rhoStart: number, rhoEnd: number, steps: number): { rho: number; lyapunov: number }[] {
    const result: { rho: number; lyapunov: number }[] = [];
    const saved = this._params.rho;
    for (let i = 0; i < steps; i++) {
      this._params.rho = rhoStart + ((rhoEnd - rhoStart) * i) / (steps - 1);
      this._trajectory = [];
      this.iterate(500, { x: 1, y: 1, z: 1 });
      result.push({ rho: this._params.rho, lyapunov: this._lyapunovExponent });
    }
    this._params.rho = saved;
    return result;
  }

  report(): Record<string, unknown> {
    return {
      trajectoryLength: this._trajectory.length,
      lyapunov: this._lyapunovExponent,
      fractalDimension: this._fractalDimension,
      entropyRate: this._entropyRate,
      state: this._state,
    };
  }
}
