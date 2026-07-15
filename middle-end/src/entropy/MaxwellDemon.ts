export interface MaxwellDemonData {
  sortedParticles: number;
  totalParticles: number;
  information: number;
  energyCost: number;
  sortingEfficiency: number;
}

export class MaxwellDemon {
  private _sortedParticles: number;
  private _totalParticles: number;
  private _information: number;
  private _energyCost: number;
  private _sortingEfficiency: number;
  private _fastSide: number;
  private _slowSide: number;
  private _measurementHistory: boolean[];
  private _kT: number;

  constructor(totalParticles: number = 1000) {
    this._totalParticles = totalParticles;
    this._sortedParticles = 0;
    this._information = 0;
    this._energyCost = 0;
    this._sortingEfficiency = 0.5;
    this._fastSide = totalParticles / 2;
    this._slowSide = totalParticles / 2;
    this._measurementHistory = [];
    this._kT = 4.11e-21;
  }

  get sortedParticles(): number {
    return this._sortedParticles;
  }

  get information(): number {
    return this._information;
  }

  get energyCost(): number {
    return this._energyCost;
  }

  get sortingEfficiency(): number {
    return this._sortingEfficiency;
  }

  public measureAndSort(particles: number): number {
    let sorted = 0;
    for (let i = 0; i < particles; i++) {
      const isFast = Math.random() < this._fastSide / this._totalParticles;
      const correct = Math.random() < this._sortingEfficiency;
      if (correct) {
        if (isFast && this._slowSide > 0) {
          this._fastSide++;
          this._slowSide--;
          sorted++;
        } else if (!isFast && this._fastSide > 0) {
          this._fastSide--;
          this._slowSide++;
          sorted++;
        }
      }
      this._measurementHistory.push(correct);
      this._information += Math.log2(2);
    }
    this._sortedParticles += sorted;
    this._energyCost += particles * this._kT * Math.log(2);
    if (this._measurementHistory.length > 200) {
      this._measurementHistory = this._measurementHistory.slice(-200);
    }
    return sorted;
  }

  public computeTemperatureRatio(): number {
    if (this._slowSide === 0) return Infinity;
    return this._fastSide / this._slowSide;
  }

  public computeInformationEntropy(): number {
    const p = this._fastSide / this._totalParticles;
    if (p <= 0 || p >= 1) return 0;
    return -p * Math.log2(p) - (1 - p) * Math.log2(1 - p);
  }

  public resetMemory(): void {
    const erasureCost = this._information * this._kT * Math.log(2);
    this._energyCost += erasureCost;
    this._information = 0;
    this._measurementHistory = [];
  }

  public report(): MaxwellDemonData {
    return {
      sortedParticles: this._sortedParticles,
      totalParticles: this._totalParticles,
      information: this._information,
      energyCost: this._energyCost,
      sortingEfficiency: this._sortingEfficiency,
    };
  }

  public setSortingEfficiency(value: number): void {
    this._sortingEfficiency = Math.max(0.5, Math.min(1.0, value));
  }

  public computeWorkExtractable(): number {
    const ratio = this.computeTemperatureRatio();
    if (!isFinite(ratio)) return 0;
    return this._totalParticles * this._kT * Math.log(ratio);
  }

  public computeLandauerLimit(): number {
    return this._kT * Math.log(2);
  }

  public cycle(particles: number): number {
    const sorted = this.measureAndSort(particles);
    const work = this.computeWorkExtractable();
    this.resetMemory();
    return work - this._energyCost;
  }
}
