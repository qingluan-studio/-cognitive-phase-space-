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
  private _poincareSection: { theta: number; phi: number }[] = [];
  private _correlationSum: number = 0;
  private _embeddingDimension: number = 3;

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

  get windingNumber(): number {
    return this._windingNumber;
  }

  get trajectoryLength(): number {
    return this._trajectory.length;
  }

  public step(): TorusPoint {
    this._lastTheta = this._theta;
    this._theta += this._data.frequencyMajor;
    this._phi += this._data.frequencyMinor;
    if (this._theta > 2 * Math.PI) {
      this._theta -= 2 * Math.PI;
      this._windingNumber++;
      this._poincareSection.push({ theta: this._theta, phi: this._phi });
      if (this._poincareSection.length > 200) {
        this._poincareSection.shift();
      }
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
    this._updateCorrelation();
    return point;
  }

  private _updateCorrelation(): void {
    if (this._trajectory.length < 2) return;
    const n = this._trajectory.length;
    const p1 = this._trajectory[n - 2];
    const p2 = this._trajectory[n - 1];
    const dist = Math.sqrt(
      (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2 + (p1.z - p2.z) ** 2
    );
    this._correlationSum += dist;
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

  public computeContinuedFraction(depth: number = 5): number[] {
    let r = this._data.frequencyMajor / this._data.frequencyMinor;
    const terms: number[] = [];
    for (let i = 0; i < depth; i++) {
      const a = Math.floor(r);
      terms.push(a);
      const frac = r - a;
      if (frac < 1e-9) break;
      r = 1 / frac;
    }
    return terms;
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

  public computeCorrelationDimension(epsilon: number = 0.1): number {
    if (this._trajectory.length < 10) return 0;
    let count = 0;
    const n = this._trajectory.length;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = this._trajectory[i];
        const b = this._trajectory[j];
        const d = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
        if (d < epsilon) count++;
      }
    }
    const pairs = (n * (n - 1)) / 2;
    const c = count / pairs;
    return Math.log(c + 1e-9) / Math.log(epsilon + 1e-9);
  }

  public perturbPhi(amount: number): void {
    this._phi += amount;
  }

  public reset(): void {
    this._theta = 0;
    this._phi = 0;
    this._trajectory = [];
    this._windingNumber = 0;
    this._poincareSection = [];
    this._correlationSum = 0;
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
      continuedFraction: this.computeContinuedFraction(),
      correlationDimension: this.computeCorrelationDimension().toFixed(3),
      poincareSectionSize: this._poincareSection.length,
    };
  }
}
