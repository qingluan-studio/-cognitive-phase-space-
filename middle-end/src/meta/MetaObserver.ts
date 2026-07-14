export interface Observation {
  id: string;
  target: string;
  property: string;
  value: unknown;
  observedAt: number;
}

export interface MetaObservation {
  observationId: string;
  metaProperty: string;
  metaValue: unknown;
  observedAt: number;
}

export class MetaObserver {
  private _observations: Observation[];
  private _metaObservations: MetaObservation[];
  private _recursionDepth: number;
  private _maxRecursionDepth: number;
  private _observationEntropy: number[];
  private _covarianceMatrix: number[][];

  constructor(maxRecursionDepth: number = 3) {
    this._observations = [];
    this._metaObservations = [];
    this._recursionDepth = 0;
    this._maxRecursionDepth = maxRecursionDepth;
    this._observationEntropy = [];
    this._covarianceMatrix = [];
  }

  get observationCount(): number {
    return this._observations.length;
  }

  get metaObservationCount(): number {
    return this._metaObservations.length;
  }

  get recursionDepth(): number {
    return this._recursionDepth;
  }

  public observe(target: string, property: string, value: unknown): Observation {
    const obs: Observation = {
      id: `obs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      target,
      property,
      value,
      observedAt: Date.now(),
    };
    this._observations.push(obs);
    this._recursionDepth = 0;
    this._observationEntropy.push(this._computeValueEntropy(value));
    if (this._observationEntropy.length > 50) this._observationEntropy.shift();
    this._updateCovariance();
    return obs;
  }

  public observeObservation(observationId: string): MetaObservation | null {
    if (this._recursionDepth >= this._maxRecursionDepth) return null;
    const obs = this._observations.find(o => o.id === observationId);
    if (!obs) return null;
    this._recursionDepth++;
    const meta: MetaObservation = {
      observationId,
      metaProperty: `observed-${obs.property}`,
      metaValue: typeof obs.value,
      observedAt: Date.now(),
    };
    this._metaObservations.push(meta);
    if (this._metaObservations.length > 100) this._metaObservations.shift();
    return meta;
  }

  public reflect(): MetaObservation[] {
    return [...this._metaObservations];
  }

  public collapse(): void {
    this._observations = [];
    this._metaObservations = [];
    this._recursionDepth = 0;
    this._observationEntropy = [];
    this._covarianceMatrix = [];
  }

  public getObservation(id: string): Observation | null {
    return this._observations.find(o => o.id === id) ?? null;
  }

  public getObservationsByTarget(target: string): Observation[] {
    return this._observations.filter(o => o.target === target);
  }

  public computeObservationEntropy(): number {
    if (this._observationEntropy.length === 0) return 0;
    const mean = this._observationEntropy.reduce((a, b) => a + b, 0) / this._observationEntropy.length;
    const variance = this._observationEntropy.reduce((s, v) => s + (v - mean) ** 2, 0) / this._observationEntropy.length;
    return 0.5 * Math.log2(2 * Math.PI * Math.E * Math.max(variance, 1e-10));
  }

  public computeEigenvalues(): number[] {
    if (this._covarianceMatrix.length === 0) return [];
    const n = this._covarianceMatrix.length;
    const trace = this._covarianceMatrix.reduce((s, row, i) => s + (row[i] ?? 0), 0);
    const det = n === 2
      ? (this._covarianceMatrix[0][0] * this._covarianceMatrix[1][1] - (this._covarianceMatrix[0][1] ?? 0) * (this._covarianceMatrix[1][0] ?? 0))
      : trace;
    const discriminant = Math.sqrt(Math.max(0, trace * trace - 4 * det));
    return [(trace + discriminant) / 2, (trace - discriminant) / 2];
  }

  public mutualInformation(obsA: string, obsB: string): number {
    const a = this._observations.find(o => o.id === obsA);
    const b = this._observations.find(o => o.id === obsB);
    if (!a || !b) return 0;
    const pa = typeof a.value === 'number' ? Math.abs(a.value as number) : 0.5;
    const pb = typeof b.value === 'number' ? Math.abs(b.value as number) : 0.5;
    const pJoint = (pa + pb) / 2;
    return pJoint > 0 ? Math.log2(pJoint / (pa * pb + 1e-10)) : 0;
  }

  private _computeValueEntropy(value: unknown): number {
    const str = JSON.stringify(value);
    const freq = new Map<string, number>();
    for (const ch of str) {
      freq.set(ch, (freq.get(ch) ?? 0) + 1);
    }
    let entropy = 0;
    for (const count of freq.values()) {
      const p = count / str.length;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  private _updateCovariance(): void {
    const n = this._observationEntropy.length;
    if (n < 2) return;
    const mean = this._observationEntropy.reduce((a, b) => a + b, 0) / n;
    this._covarianceMatrix = [[0, 0], [0, 0]];
    this._covarianceMatrix[0][0] = this._observationEntropy.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
    this._covarianceMatrix[1][1] = this._covarianceMatrix[0][0];
    this._covarianceMatrix[0][1] = this._observationEntropy[n - 1] - mean;
    this._covarianceMatrix[1][0] = this._covarianceMatrix[0][1];
  }
}
