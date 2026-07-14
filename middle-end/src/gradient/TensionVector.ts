export interface VectorComponent {
  direction: number;
  magnitude: number;
  origin: string;
}

export type TensionResult = {
  netX: number;
  netY: number;
  totalMagnitude: number;
  equilibrium: boolean;
};

export interface TensionConfig {
  maxVectors: number;
  equilibriumThreshold: number;
  damping: number;
}

export class TensionVector {
  private _config: TensionConfig;
  private _vectors: VectorComponent[] = [];
  private _result: TensionResult | null = null;
  private _state: Record<string, unknown> = {};
  private _stressTensor: number[][] = [[0, 0], [0, 0]];
  private _principalStresses: number[] = [];
  private _vonMisesStress: number = 0;

  constructor(config: TensionConfig) {
    this._config = config;
  }

  get vectorCount(): number {
    return this._vectors.length;
  }

  get vonMisesStress(): number {
    return this._vonMisesStress;
  }

  get principalStresses(): readonly number[] {
    return this._principalStresses;
  }

  private _updateStressTensor(): void {
    this._stressTensor = [[0, 0], [0, 0]];
    for (const v of this._vectors) {
      const fx = v.magnitude * Math.cos(v.direction);
      const fy = v.magnitude * Math.sin(v.direction);
      this._stressTensor[0][0] += fx * fx;
      this._stressTensor[0][1] += fx * fy;
      this._stressTensor[1][0] += fy * fx;
      this._stressTensor[1][1] += fy * fy;
    }
    const trace = this._stressTensor[0][0] + this._stressTensor[1][1];
    const det = this._stressTensor[0][0] * this._stressTensor[1][1] - this._stressTensor[0][1] * this._stressTensor[1][0];
    const discriminant = Math.sqrt(trace * trace - 4 * det);
    this._principalStresses = [(trace + discriminant) / 2, (trace - discriminant) / 2];
    const s1 = this._principalStresses[0];
    const s2 = this._principalStresses[1];
    this._vonMisesStress = Math.sqrt(s1 * s1 - s1 * s2 + s2 * s2);
  }

  addVector(direction: number, magnitude: number, origin: string): VectorComponent {
    const vector: VectorComponent = { direction, magnitude, origin };
    this._vectors.push(vector);
    if (this._vectors.length > this._config.maxVectors) {
      this._vectors.shift();
    }
    this._updateStressTensor();
    return vector;
  }

  computeResult(): TensionResult {
    let netX = 0;
    let netY = 0;
    for (const v of this._vectors) {
      netX += v.magnitude * Math.cos(v.direction);
      netY += v.magnitude * Math.sin(v.direction);
    }
    const totalMagnitude = Math.sqrt(netX * netX + netY * netY);
    const equilibrium = totalMagnitude < this._config.equilibriumThreshold;
    this._result = { netX, netY, totalMagnitude, equilibrium };
    return this._result;
  }

  isEquilibrium(): boolean {
    return this.computeResult().equilibrium;
  }

  damp(factor: number): void {
    for (const v of this._vectors) {
      v.magnitude *= factor * this._config.damping;
    }
    this._updateStressTensor();
  }

  dominantVector(): VectorComponent | null {
    if (this._vectors.length === 0) return null;
    return this._vectors.reduce((best, v) => (v.magnitude > best.magnitude ? v : best));
  }

  opposingPairs(): [VectorComponent, VectorComponent][] {
    const pairs: [VectorComponent, VectorComponent][] = [];
    for (let i = 0; i < this._vectors.length; i++) {
      for (let j = i + 1; j < this._vectors.length; j++) {
        const diff = Math.abs(this._vectors[i].direction - this._vectors[j].direction);
        if (Math.abs(diff - Math.PI) < 0.2) {
          pairs.push([this._vectors[i], this._vectors[j]]);
        }
      }
    }
    return pairs;
  }

  computeStrainEnergy(): number {
    if (this._principalStresses.length < 2) return 0;
    const e = 1;
    const nu = 0.3;
    const s1 = this._principalStresses[0];
    const s2 = this._principalStresses[1];
    return (1 / (2 * e)) * (s1 * s1 + s2 * s2 - 2 * nu * s1 * s2);
  }

  reset(): void {
    this._vectors = [];
    this._result = null;
    this._stressTensor = [[0, 0], [0, 0]];
    this._principalStresses = [];
    this._vonMisesStress = 0;
    this._state = {};
  }

  report(): Record<string, unknown> {
    return {
      vectors: this._vectors.length,
      equilibrium: this.isEquilibrium(),
      result: this._result,
      state: this._state,
      vonMisesStress: this._vonMisesStress.toFixed(4),
      principalStresses: this._principalStresses.map((s) => s.toFixed(4)),
      strainEnergy: this.computeStrainEnergy().toFixed(4),
    };
  }
}
