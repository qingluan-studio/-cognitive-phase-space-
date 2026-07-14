export interface AbyssalPressureData {
  depth: number;
  pressure: number;
  yieldStrength: number;
  status: 'stable' | 'deforming' | 'critical';
}

export class AbyssalPressure {
  private _depth: number;
  private _yieldStrength: number;
  private _deformation: number;
  private _log: AbyssalPressureData[];
  private _stressTensor: number[][];
  private _phaseField: number;
  private _creepExponent: number;

  constructor(yieldStrength: number = 1000) {
    this._depth = 0;
    this._yieldStrength = yieldStrength;
    this._deformation = 0;
    this._log = [];
    this._stressTensor = [[0, 0], [0, 0]];
    this._phaseField = 0;
    this._creepExponent = 3.5;
  }

  get pressure(): number {
    return this._depth * 0.1 + this._deformation * 2 + this._vonMisesStress();
  }

  get depth(): number {
    return this._depth;
  }

  get status(): 'stable' | 'deforming' | 'critical' {
    const p = this.pressure;
    if (p >= this._yieldStrength) return 'critical';
    if (p >= this._yieldStrength * 0.7) return 'deforming';
    return 'stable';
  }

  get vonMises(): number {
    return this._vonMisesStress();
  }

  public descend(meters: number): AbyssalPressureData {
    this._depth += meters;
    const p = this.pressure;
    this._updateStressTensor(meters);
    if (p > this._yieldStrength * 0.7) {
      const excess = p - this._yieldStrength * 0.7;
      this._deformation += Math.pow(excess * 0.01, 1 / this._creepExponent);
    }
    this._phaseField = Math.tanh(p / this._yieldStrength);
    const record: AbyssalPressureData = {
      depth: this._depth,
      pressure: p,
      yieldStrength: this._yieldStrength,
      status: this.status,
    };
    this._log.push(record);
    return record;
  }

  public ascend(meters: number): void {
    this._depth = Math.max(0, this._depth - meters);
    this._stressTensor = this._stressTensor.map(row => row.map(v => v * 0.9));
  }

  public reinforce(amount: number): void {
    this._yieldStrength += amount;
    this._stressTensor = [[0, 0], [0, 0]];
  }

  public report(): AbyssalPressureData {
    return {
      depth: this._depth,
      pressure: this.pressure,
      yieldStrength: this._yieldStrength,
      status: this.status,
    };
  }

  public stressTest(targetDepth: number, step: number): AbyssalPressureData[] {
    const results: AbyssalPressureData[] = [];
    while (this._depth < targetDepth) {
      results.push(this.descend(step));
      if (this.status === 'critical') break;
    }
    return results;
  }

  public history(): AbyssalPressureData[] {
    return [...this._log];
  }

  public phaseTransitionProbability(): number {
    const p = this.pressure / this._yieldStrength;
    return 1 / (1 + Math.exp(-10 * (p - 1)));
  }

  public spectralDecomposition(): { eigenvalues: number[]; trace: number; determinant: number } {
    const [[a, b], [c, d]] = this._stressTensor;
    const trace = a + d;
    const det = a * d - b * c;
    const discriminant = Math.sqrt(Math.max(0, trace * trace - 4 * det));
    const lambda1 = (trace + discriminant) / 2;
    const lambda2 = (trace - discriminant) / 2;
    return { eigenvalues: [lambda1, lambda2], trace, determinant: det };
  }

  private _vonMisesStress(): number {
    const { eigenvalues } = this.spectralDecomposition();
    const [s1, s2] = eigenvalues;
    return Math.sqrt(s1 * s1 - s1 * s2 + s2 * s2);
  }

  private _updateStressTensor(delta: number): void {
    const factor = delta * 0.05;
    this._stressTensor[0][0] += factor;
    this._stressTensor[1][1] += factor * 0.7;
    this._stressTensor[0][1] += factor * 0.3;
    this._stressTensor[1][0] = this._stressTensor[0][1];
  }
}
