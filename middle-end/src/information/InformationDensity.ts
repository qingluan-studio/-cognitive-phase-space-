export interface DensityProfile {
  position: number;
  informationDensity: number;
  entropyDensity: number;
  complexity: number;
}

export interface DensityRecord {
  timestamp: number;
  totalInformation: number;
  averageDensity: number;
  maxDensity: number;
  minDensity: number;
}

export class InformationDensity {
  private _profile: DensityProfile[];
  private _totalInformation: number;
  private _averageDensity: number;
  private _maxDensity: number;
  private _minDensity: number;
  private _history: DensityRecord[];
  private _spatialResolution: number;
  private _temporalResolution: number;
  private _compressionFactor: number;
  private _redundancyProfile: number[];

  constructor(resolution: number = 100) {
    this._spatialResolution = resolution;
    this._profile = this._initializeProfile();
    this._totalInformation = 0;
    this._averageDensity = 0;
    this._maxDensity = 0;
    this._minDensity = 0;
    this._history = [];
    this._temporalResolution = 1;
    this._compressionFactor = 1;
    this._redundancyProfile = new Array(resolution).fill(0);
  }

  get totalInformation(): number {
    return this._totalInformation;
  }

  get averageDensity(): number {
    return this._averageDensity;
  }

  get spatialResolution(): number {
    return this._spatialResolution;
  }

  private _initializeProfile(): DensityProfile[] {
    const profile: DensityProfile[] = [];
    for (let i = 0; i < this._spatialResolution; i++) {
      profile.push({
        position: i,
        informationDensity: Math.random(),
        entropyDensity: Math.random() * Math.log2(2),
        complexity: Math.random(),
      });
    }
    return profile;
  }

  public setProfile(densities: number[]): void {
    if (densities.length !== this._spatialResolution) return;
    for (let i = 0; i < this._spatialResolution; i++) {
      this._profile[i].informationDensity = densities[i];
      this._profile[i].entropyDensity = densities[i] > 0 ? -densities[i] * Math.log2(densities[i]) : 0;
    }
    this._computeAggregates();
  }

  private _computeAggregates(): void {
    this._totalInformation = 0;
    this._maxDensity = -Infinity;
    this._minDensity = Infinity;
    for (const point of this._profile) {
      this._totalInformation += point.informationDensity;
      if (point.informationDensity > this._maxDensity) this._maxDensity = point.informationDensity;
      if (point.informationDensity < this._minDensity) this._minDensity = point.informationDensity;
    }
    this._averageDensity = this._totalInformation / this._spatialResolution;
  }

  public computeKolmogorovComplexityApproximation(data: number[]): number {
    const uniquePatterns = new Set<string>();
    for (let i = 0; i < data.length - 4; i++) {
      uniquePatterns.add(data.slice(i, i + 4).join(','));
    }
    return Math.log2(uniquePatterns.size + 1);
  }

  public computeEffectiveComplexity(data: number[]): number {
    const K = this.computeKolmogorovComplexityApproximation(data);
    const H = this._shannonEntropyOfData(data);
    return Math.abs(K - H);
  }

  private _shannonEntropyOfData(data: number[]): number {
    const counts: Record<number, number> = {};
    for (const d of data) {
      counts[d] = (counts[d] || 0) + 1;
    }
    let H = 0;
    const n = data.length;
    for (const key of Object.keys(counts)) {
      const p = counts[Number(key)] / n;
      H -= p * Math.log2(p);
    }
    return H;
  }

  public computeFisherInformation(densityGradient: number[]): number {
    let I = 0;
    for (const grad of densityGradient) {
      I += grad * grad;
    }
    return I;
  }

  public computeMutualInformationDensity(xProfile: number[], yProfile: number[]): number[] {
    const mi: number[] = [];
    for (let i = 0; i < Math.min(xProfile.length, yProfile.length); i++) {
      const p = xProfile[i];
      const q = yProfile[i];
      const joint = p * q;
      if (joint > 0) {
        mi.push(joint * Math.log2(joint / (p * q + 1e-10)));
      } else {
        mi.push(0);
      }
    }
    return mi;
  }

  public computeTransferEntropyDensity(source: number[], target: number[], delay: number): number[] {
    const te: number[] = [];
    for (let i = delay; i < Math.min(source.length, target.length); i++) {
      const p = source[i - delay];
      const q = target[i];
      const joint = p * q;
      te.push(joint > 0 ? joint * Math.log2(joint / (p * q + 1e-10)) : 0);
    }
    return te;
  }

  public computeIntegratedInformation(partitionSize: number): number {
    let phi = 0;
    for (let i = 0; i < this._profile.length; i += partitionSize) {
      const subset = this._profile.slice(i, i + partitionSize);
      const subsetEntropy = subset.reduce((sum, p) => sum + p.entropyDensity, 0);
      phi += subsetEntropy;
    }
    return phi;
  }

  public applyCompression(factor: number): void {
    this._compressionFactor = Math.max(1, factor);
    for (const point of this._profile) {
      point.informationDensity /= this._compressionFactor;
    }
    this._computeAggregates();
  }

  public computeTemporalEvolution(dt: number): void {
    for (let i = 0; i < this._profile.length; i++) {
      const diffusion = 0.1 * (this._laplacian(i));
      this._profile[i].informationDensity += diffusion * dt;
      this._profile[i].informationDensity = Math.max(0, this._profile[i].informationDensity);
    }
    this._computeAggregates();
  }

  private _laplacian(index: number): number {
    const left = this._profile[Math.max(0, index - 1)].informationDensity;
    const right = this._profile[Math.min(this._profile.length - 1, index + 1)].informationDensity;
    const center = this._profile[index].informationDensity;
    return left + right - 2 * center;
  }

  public getDensityProfile(): DensityProfile[] {
    return this._profile.map(p => ({ ...p }));
  }

  public recordDensity(): void {
    this._history.push({
      timestamp: Date.now(),
      totalInformation: this._totalInformation,
      averageDensity: this._averageDensity,
      maxDensity: this._maxDensity,
      minDensity: this._minDensity,
    });
    if (this._history.length > 200) this._history.shift();
  }

  public getHistory(): DensityRecord[] {
    return this._history.map(h => ({ ...h }));
  }

  public computeEntropyProfile(): number[] {
    return this._profile.map(p => {
      const rho = p.informationDensity;
      return rho > 0 ? -rho * Math.log2(rho) : 0;
    });
  }

  public computeRedundancyProfile(): number[] {
    return this._redundancyProfile.map((r, i) => {
      const maxEnt = Math.log2(this._spatialResolution);
      const ent = this._profile[i].entropyDensity;
      return maxEnt > 0 ? 1 - ent / maxEnt : 0;
    });
  }

  public setRedundancyProfile(profile: number[]): void {
    if (profile.length === this._spatialResolution) {
      this._redundancyProfile = [...profile];
    }
  }

  public computeHolographicBound(surfaceArea: number): number {
    const G = 6.674e-11;
    const hbar = 1.055e-34;
    const c = 299792458;
    const kB = 1.38e-23;
    return (kB * c * c * c * surfaceArea) / (4 * G * hbar);
  }

  public computeBekensteinBound(energy: number, radius: number): number {
    const hbar = 1.055e-34;
    const c = 299792458;
    const kB = 1.38e-23;
    return (2 * Math.PI * energy * radius) / (hbar * c * Math.log(2));
  }

  public reset(): void {
    this._profile = this._initializeProfile();
    this._totalInformation = 0;
    this._averageDensity = 0;
    this._maxDensity = 0;
    this._minDensity = 0;
    this._history = [];
    this._compressionFactor = 1;
    this._redundancyProfile = new Array(this._spatialResolution).fill(0);
  }
}
