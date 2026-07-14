export interface DissolvingBoundaryData {
  readonly boundaryId: string;
  solidity: number;
  dissolveRate: number;
  sideA: string;
  sideB: string;
}

export interface DissolveProgress {
  step: number;
  solidityBefore: number;
  solidityAfter: number;
  merged: boolean;
}

export class DissolvingBoundary {
  private _data: DissolvingBoundaryData;
  private _progressLog: DissolveProgress[] = [];
  private _flowVolume: number = 0;
  private _merged: boolean = false;
  private _dissolveSteps: number = 0;
  private _diffusionCoeff: number = 0.1;
  private _percolationThreshold: number = 0.5927;
  private _entropyProfile: number[] = [];
  private _latticeSize: number = 32;
  private _lattice: boolean[][] = [];

  constructor(data: DissolvingBoundaryData) {
    this._data = { ...data };
    this._initLattice();
  }

  get boundaryId(): string {
    return this._data.boundaryId;
  }

  get solidity(): number {
    return this._data.solidity;
  }

  get merged(): boolean {
    return this._merged;
  }

  get sides(): readonly [string, string] {
    return [this._data.sideA, this._data.sideB];
  }

  get percolationProbability(): number {
    return this._computePercolation();
  }

  private _initLattice(): void {
    this._lattice = [];
    for (let i = 0; i < this._latticeSize; i++) {
      const row: boolean[] = [];
      for (let j = 0; j < this._latticeSize; j++) {
        row.push(Math.random() < this._data.solidity);
      }
      this._lattice.push(row);
    }
  }

  private _computePercolation(): number {
    let openSites = 0;
    for (const row of this._lattice) {
      for (const cell of row) {
        if (!cell) {
          openSites++;
        }
      }
    }
    return openSites / (this._latticeSize * this._latticeSize);
  }

  private _fickDiffusion(concentrationA: number, concentrationB: number): number {
    const gradient = concentrationB - concentrationA;
    return -this._diffusionCoeff * gradient;
  }

  private _computeMixingEntropy(): number {
    const p = this._computePercolation();
    if (p <= 0 || p >= 1) {
      return 0;
    }
    return -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p));
  }

  public dissolve(): DissolveProgress {
    const before = this._data.solidity;
    const entropyBefore = this._computeMixingEntropy();
    this._data.solidity = Math.max(0, this._data.solidity - this._data.dissolveRate);
    this._dissolveSteps++;
    for (let i = 0; i < this._latticeSize; i++) {
      for (let j = 0; j < this._latticeSize; j++) {
        if (Math.random() > this._data.solidity) {
          this._lattice[i][j] = false;
        }
      }
    }
    if (this._data.solidity < this._percolationThreshold) {
      this._merged = true;
      this._data.solidity = 0;
    }
    const progress: DissolveProgress = {
      step: this._dissolveSteps,
      solidityBefore: before,
      solidityAfter: this._data.solidity,
      merged: this._merged,
    };
    this._progressLog.push(progress);
    if (this._progressLog.length > 30) {
      this._progressLog.shift();
    }
    const entropyAfter = this._computeMixingEntropy();
    this._entropyProfile.push(entropyAfter - entropyBefore);
    if (this._entropyProfile.length > 30) {
      this._entropyProfile.shift();
    }
    return progress;
  }

  public allowFlow(volume: number): number {
    const permeability = 1 - this._data.solidity;
    const diffusiveFlux = this._fickDiffusion(volume * permeability, 0);
    const flowed = volume * permeability + Math.abs(diffusiveFlux);
    this._flowVolume += flowed;
    return flowed;
  }

  public accelerateDissolution(factor: number): void {
    this._data.dissolveRate = Math.min(1, this._data.dissolveRate * factor);
    this._diffusionCoeff *= factor;
  }

  public reconstitute(amount: number): void {
    if (this._merged) {
      return;
    }
    this._data.solidity = Math.min(1, this._data.solidity + amount);
    this._initLattice();
  }

  public measurePermeability(): number {
    return 1 - this._data.solidity;
  }

  public isFullyDissolved(): boolean {
    return this._merged && this._data.solidity === 0;
  }

  public reverse(): void {
    this._data.solidity = 1;
    this._merged = false;
    this._flowVolume = 0;
    this._dissolveSteps = 0;
    this._progressLog = [];
    this._entropyProfile = [];
    this._initLattice();
  }

  public computeEntropyProduction(): number {
    if (this._entropyProfile.length === 0) {
      return 0;
    }
    return this._entropyProfile.reduce((a, b) => a + b, 0) / this._entropyProfile.length;
  }

  public dissolveReport(): Record<string, unknown> {
    return {
      boundaryId: this.boundaryId,
      sideA: this._data.sideA,
      sideB: this._data.sideB,
      solidity: this._data.solidity.toFixed(3),
      dissolveRate: this._data.dissolveRate.toFixed(3),
      permeability: this.measurePermeability().toFixed(3),
      merged: this._merged,
      dissolveSteps: this._dissolveSteps,
      flowVolume: this._flowVolume.toFixed(2),
      progressEntries: this._progressLog.length,
      percolationProbability: this.percolationProbability.toFixed(3),
      mixingEntropy: this._computeMixingEntropy().toFixed(3),
      entropyProduction: this.computeEntropyProduction().toFixed(4),
    };
  }
}
