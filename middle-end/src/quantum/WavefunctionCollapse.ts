export interface Eigenstate {
  value: number;
  probability: number;
  vector: number[];
}

export interface CollapseRecord {
  timestamp: number;
  observedEigenvalue: number;
  preCollapseVariance: number;
  postCollapseEntropy: number;
}

export class WavefunctionCollapse {
  private _wavefunction: number[];
  private _eigenvalues: number[];
  private _eigenvectors: number[][];
  private _collapsedIndex: number | null;
  private _history: CollapseRecord[];
  private _uncertainty: number;
  private _observerCount: number;
  private _collapseCount: number;
  private _dimension: number;
  private _projectionOperator: number[][];

  constructor(dimension: number = 4) {
    this._dimension = Math.max(2, dimension);
    this._wavefunction = this._initializeUniform();
    this._eigenvalues = this._initializeEigenvalues();
    this._eigenvectors = this._initializeEigenvectors();
    this._collapsedIndex = null;
    this._history = [];
    this._uncertainty = 1.0;
    this._observerCount = 0;
    this._collapseCount = 0;
    this._projectionOperator = this._identityMatrix();
  }

  get dimension(): number {
    return this._dimension;
  }

  get uncertainty(): number {
    return this._uncertainty;
  }

  get collapsedIndex(): number | null {
    return this._collapsedIndex;
  }

  get collapseCount(): number {
    return this._collapseCount;
  }

  private _initializeUniform(): number[] {
    const amp = 1 / Math.sqrt(this._dimension);
    return new Array(this._dimension).fill(amp);
  }

  private _initializeEigenvalues(): number[] {
    const vals: number[] = [];
    for (let i = 0; i < this._dimension; i++) {
      vals.push(i + 1);
    }
    return vals;
  }

  private _initializeEigenvectors(): number[][] {
    const vecs: number[][] = [];
    for (let i = 0; i < this._dimension; i++) {
      const vec = new Array(this._dimension).fill(0);
      vec[i] = 1;
      vecs.push(vec);
    }
    return vecs;
  }

  private _identityMatrix(): number[][] {
    const mat: number[][] = [];
    for (let i = 0; i < this._dimension; i++) {
      const row = new Array(this._dimension).fill(0);
      row[i] = 1;
      mat.push(row);
    }
    return mat;
  }

  public setWavefunction(amplitudes: number[]): void {
    if (amplitudes.length !== this._dimension) return;
    let norm = 0;
    for (const a of amplitudes) {
      norm += a * a;
    }
    if (norm === 0) return;
    const scale = 1 / Math.sqrt(norm);
    this._wavefunction = amplitudes.map(a => a * scale);
    this._collapsedIndex = null;
    this._updateUncertainty();
  }

  private _updateUncertainty(): void {
    const probs = this._wavefunction.map(a => a * a);
    let entropy = 0;
    for (const p of probs) {
      if (p > 0) entropy -= p * Math.log2(p);
    }
    const maxEntropy = Math.log2(this._dimension);
    this._uncertainty = maxEntropy > 0 ? entropy / maxEntropy : 0;
  }

  public setObservable(eigenvalues: number[], eigenvectors: number[][]): void {
    if (eigenvalues.length !== this._dimension) return;
    if (eigenvectors.length !== this._dimension) return;
    this._eigenvalues = [...eigenvalues];
    this._eigenvectors = eigenvectors.map(v => [...v]);
    this._collapsedIndex = null;
  }

  public observe(): number {
    const probs = this._computeMeasurementProbabilities();
    const rand = Math.random();
    let cumulative = 0;
    let chosen = this._dimension - 1;
    for (let i = 0; i < this._dimension; i++) {
      cumulative += probs[i];
      if (rand < cumulative) {
        chosen = i;
        break;
      }
    }
    const preVariance = this._computeVariance();
    this._collapsedIndex = chosen;
    this._wavefunction = new Array(this._dimension).fill(0);
    this._wavefunction[chosen] = 1;
    this._uncertainty = 0;
    this._collapseCount++;
    this._observerCount++;
    const record: CollapseRecord = {
      timestamp: Date.now(),
      observedEigenvalue: this._eigenvalues[chosen],
      preCollapseVariance: preVariance,
      postCollapseEntropy: 0,
    };
    this._history.push(record);
    if (this._history.length > 200) this._history.shift();
    return this._eigenvalues[chosen];
  }

  private _computeMeasurementProbabilities(): number[] {
    const probs: number[] = new Array(this._dimension).fill(0);
    for (let i = 0; i < this._dimension; i++) {
      let overlap = 0;
      const vec = this._eigenvectors[i];
      for (let j = 0; j < this._dimension; j++) {
        overlap += vec[j] * this._wavefunction[j];
      }
      probs[i] = overlap * overlap;
    }
    const sum = probs.reduce((a, b) => a + b, 0);
    if (sum === 0) return probs.map(() => 1 / this._dimension);
    return probs.map(p => p / sum);
  }

  private _computeVariance(): number {
    const probs = this._wavefunction.map(a => a * a);
    let mean = 0;
    for (let i = 0; i < this._dimension; i++) {
      mean += probs[i] * this._eigenvalues[i];
    }
    let variance = 0;
    for (let i = 0; i < this._dimension; i++) {
      const diff = this._eigenvalues[i] - mean;
      variance += probs[i] * diff * diff;
    }
    return variance;
  }

  public getProbabilities(): number[] {
    return this._computeMeasurementProbabilities();
  }

  public getEigenstates(): Eigenstate[] {
    const probs = this._computeMeasurementProbabilities();
    return this._eigenvalues.map((val, i) => ({
      value: val,
      probability: probs[i],
      vector: [...this._eigenvectors[i]],
    }));
  }

  public applyOperator(matrix: number[][]): void {
    if (matrix.length !== this._dimension || matrix.some(row => row.length !== this._dimension)) {
      return;
    }
    const newPsi = new Array(this._dimension).fill(0);
    for (let i = 0; i < this._dimension; i++) {
      for (let j = 0; j < this._dimension; j++) {
        newPsi[i] += matrix[i][j] * this._wavefunction[j];
      }
    }
    this.setWavefunction(newPsi);
  }

  public buildProjectionOperator(eigenvalue: number): number[][] {
    const index = this._eigenvalues.indexOf(eigenvalue);
    if (index < 0) return this._identityMatrix();
    const vec = this._eigenvectors[index];
    const proj: number[][] = [];
    for (let i = 0; i < this._dimension; i++) {
      const row: number[] = [];
      for (let j = 0; j < this._dimension; j++) {
        row.push(vec[i] * vec[j]);
      }
      proj.push(row);
    }
    this._projectionOperator = proj;
    return proj;
  }

  public projectOntoEigenstate(eigenvalue: number): number {
    const index = this._eigenvalues.indexOf(eigenvalue);
    if (index < 0) return 0;
    let overlap = 0;
    const vec = this._eigenvectors[index];
    for (let i = 0; i < this._dimension; i++) {
      overlap += vec[i] * this._wavefunction[i];
    }
    const prob = overlap * overlap;
    this._wavefunction = new Array(this._dimension).fill(0);
    this._wavefunction[index] = 1;
    this._collapsedIndex = index;
    this._uncertainty = 0;
    return prob;
  }

  public computeExpectationValue(): number {
    const probs = this._computeMeasurementProbabilities();
    let exp = 0;
    for (let i = 0; i < this._dimension; i++) {
      exp += probs[i] * this._eigenvalues[i];
    }
    return exp;
  }

  public renormalize(): void {
    let norm = 0;
    for (const a of this._wavefunction) {
      norm += a * a;
    }
    if (norm === 0) {
      this._wavefunction = this._initializeUniform();
      return;
    }
    const scale = 1 / Math.sqrt(norm);
    this._wavefunction = this._wavefunction.map(a => a * scale);
  }

  public getHistory(): CollapseRecord[] {
    return this._history.map(h => ({ ...h }));
  }

  public getObserverCount(): number {
    return this._observerCount;
  }

  public reset(): void {
    this._wavefunction = this._initializeUniform();
    this._collapsedIndex = null;
    this._uncertainty = 1.0;
    this._observerCount = 0;
    this._collapseCount = 0;
    this._history = [];
    this._projectionOperator = this._identityMatrix();
  }
}
