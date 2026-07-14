/**
 * TorusAttractor - 环面吸引子
 * 二维周期运动构成环面拓扑结构，系统同时在两个频率上
 * 做准周期运动，轨迹在环面上形成密集的编织图案。
 */

export interface TorusAttractorData {
  readonly torusId: string;
  majorRadius: number;
  minorRadius: number;
  frequencyMajor: number;
  frequencyMinor: number;
}

export interface TorusPoint {
  x: number;
  y: number;
  z: number;
  theta: number;
  phi: number;
}

export class TorusAttractor {
  private _data: TorusAttractorData;
  private _theta: number = 0;
  private _phi: number = 0;
  private _trajectory: TorusPoint[] = [];
  private _windingNumber: number = 0;
  private _lastTheta: number = 0;

  constructor(data: TorusAttractorData) {
    this._data = { ...data };
  }

  get torusId(): string {
    return this._data.torusId;
  }

  get majorRadius(): number {
    return this._data.majorRadius;
  }

  get minorRadius(): number {
    return this._data.minorRadius;
  }

  public step(): TorusPoint {
    this._lastTheta = this._theta;
    this._theta += this._data.frequencyMajor;
    this._phi += this._data.frequencyMinor;
    if (this._theta > 2 * Math.PI) {
      this._theta -= 2 * Math.PI;
      this._windingNumber++;
    }
    if (this._phi > 2 * Math.PI) {
      this._phi -= 2 * Math.PI;
    }
    const cosTheta = Math.cos(this._theta);
    const sinTheta = Math.sin(this._theta);
    const cosPhi = Math.cos(this._phi);
    const sinPhi = Math.sin(this._phi);
    const x = (this._data.majorRadius + this._data.minorRadius * cosPhi) * cosTheta;
    const y = (this._data.majorRadius + this._data.minorRadius * cosPhi) * sinTheta;
    const z = this._data.minorRadius * sinPhi;
    const point: TorusPoint = { x, y, z, theta: this._theta, phi: this._phi };
    this._trajectory.push(point);
    if (this._trajectory.length > 500) {
      this._trajectory.shift();
    }
    return point;
  }

  public runSteps(count: number): TorusPoint[] {
    const points: TorusPoint[] = [];
    for (let i = 0; i < count; i++) {
      points.push(this.step());
    }
    return points;
  }

  public setFrequencies(freqMajor: number, freqMinor: number): void {
    this._data.frequencyMajor = Math.max(0.001, freqMajor);
    this._data.frequencyMinor = Math.max(0.001, freqMinor);
  }

  public resizeTorus(major: number, minor: number): void {
    this._data.majorRadius = Math.max(0.01, major);
    this._data.minorRadius = Math.max(0.01, Math.min(minor, major));
  }

  public isQuasiperiodic(): boolean {
    const ratio = this._data.frequencyMajor / this._data.frequencyMinor;
    return !Number.isInteger(ratio) && !Number.isInteger(1 / ratio);
  }

  public computeDensity(): number {
    if (this._trajectory.length === 0) {
      return 0;
    }
    const cells = new Set<string>();
    this._trajectory.forEach((p) => {
      const cell = `${Math.floor(p.theta * 10)}_${Math.floor(p.phi * 10)}`;
      cells.add(cell);
    });
    return cells.size / 400;
  }

  public perturbPhi(amount: number): void {
    this._phi += amount;
  }

  public reset(): void {
    this._theta = 0;
    this._phi = 0;
    this._trajectory = [];
    this._windingNumber = 0;
  }

  public torusReport(): Record<string, unknown> {
    return {
      torusId: this.torusId,
      majorRadius: this._data.majorRadius.toFixed(3),
      minorRadius: this._data.minorRadius.toFixed(3),
      frequencyMajor: this._data.frequencyMajor.toFixed(4),
      frequencyMinor: this._data.frequencyMinor.toFixed(4),
      theta: this._theta.toFixed(3),
      phi: this._phi.toFixed(3),
      windingNumber: this._windingNumber,
      trajectoryLength: this._trajectory.length,
      quasiperiodic: this.isQuasiperiodic(),
      density: this.computeDensity().toFixed(3),
    };
  }
}
