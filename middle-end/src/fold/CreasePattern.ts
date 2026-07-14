export interface Crease {
  angle: number;
  depth: number;
  mirrored: boolean;
  type: 'mountain' | 'valley';
}

export type FlatFoldability = {
  flat: boolean;
  kawasakiSum: number;
  maekawaDifference: number;
};

export interface CreasePatternConfig {
  symmetry: number;
  minAngle: number;
  maxDepth: number;
}

export class CreasePattern {
  private _config: CreasePatternConfig;
  private _creases: Crease[] = [];
  private _foldability: FlatFoldability | null = null;
  private _state: Record<string, unknown> = {};
  private _angleSequence: number[] = [];
  private _kawasakiResidual: number = 0;
  private _maekawaDeviation: number = 0;

  constructor(config: CreasePatternConfig) {
    this._config = config;
  }

  get creaseCount(): number {
    return this._creases.length;
  }

  get kawasakiResidual(): number {
    return this._kawasakiResidual;
  }

  get maekawaDeviation(): number {
    return this._maekawaDeviation;
  }

  private _computeKawasaki(angles: number[]): number {
    if (angles.length < 4) return 0;
    let oddSum = 0;
    let evenSum = 0;
    for (let i = 0; i < angles.length; i++) {
      if (i % 2 === 0) {
        evenSum += angles[i];
      } else {
        oddSum += angles[i];
      }
    }
    return Math.abs(evenSum - oddSum - Math.PI);
  }

  private _computeMaekawa(creases: Crease[]): number {
    let mountains = 0;
    let valleys = 0;
    for (const c of creases) {
      if (c.type === 'mountain') mountains++;
      else valleys++;
    }
    return Math.abs(mountains - valleys);
  }

  addCrease(angle: number, depth: number, type: 'mountain' | 'valley', mirrored: boolean = false): Crease {
    const crease: Crease = { angle, depth, mirrored, type };
    this._creases.push(crease);
    this._angleSequence.push(angle);
    if (this._angleSequence.length > 20) this._angleSequence.shift();
    this._kawasakiResidual = this._computeKawasaki(this._angleSequence);
    this._maekawaDeviation = this._computeMaekawa(this._creases);
    if (this._creases.length > 40) this._creases.shift();
    return crease;
  }

  checkFlatFoldability(): FlatFoldability {
    const kawasakiSum = this._computeKawasaki(this._angleSequence);
    const maekawaDifference = this._computeMaekawa(this._creases);
    const flat = kawasakiSum < 0.1 && maekawaDifference === 2;
    this._foldability = { flat, kawasakiSum, maekawaDifference };
    return this._foldability;
  }

  mirror(): void {
    for (const c of this._creases) {
      c.angle = this._config.symmetry - c.angle;
      c.mirrored = !c.mirrored;
    }
    this._angleSequence = this._creases.map((c) => c.angle);
    this._kawasakiResidual = this._computeKawasaki(this._angleSequence);
    this._state.mirroredAt = Date.now();
  }

  rotate(offset: number): void {
    for (const c of this._creases) {
      c.angle = (c.angle + offset) % (2 * Math.PI);
    }
    this._angleSequence = this._creases.map((c) => c.angle);
    this._kawasakiResidual = this._computeKawasaki(this._angleSequence);
  }

  totalDepth(): number {
    return this._creases.reduce((acc, c) => acc + c.depth, 0);
  }

  deepestCrease(): Crease | null {
    if (this._creases.length === 0) return null;
    return this._creases.reduce((best, c) => (c.depth > best.depth ? c : best));
  }

  computeAngularVariance(): number {
    if (this._angleSequence.length === 0) return 0;
    const mean = this._angleSequence.reduce((a, b) => a + b, 0) / this._angleSequence.length;
    return this._angleSequence.reduce((a, b) => a + (b - mean) * (b - mean), 0) / this._angleSequence.length;
  }

  generateTessellation(repetitions: number): Crease[] {
    const result: Crease[] = [];
    for (let r = 0; r < repetitions; r++) {
      const rot = (r * 2 * Math.PI) / repetitions;
      for (const c of this._creases) {
        result.push({ ...c, angle: (c.angle + rot) % (2 * Math.PI) });
      }
    }
    return result;
  }

  reset(): void {
    this._creases = [];
    this._angleSequence = [];
    this._foldability = null;
    this._kawasakiResidual = 0;
    this._maekawaDeviation = 0;
    this._state = {};
  }

  report(): Record<string, unknown> {
    return {
      creases: this._creases.length,
      foldability: this._foldability,
      state: this._state,
      kawasakiResidual: this._kawasakiResidual.toFixed(4),
      maekawaDeviation: this._maekawaDeviation,
      angularVariance: this.computeAngularVariance().toFixed(4),
    };
  }
}
