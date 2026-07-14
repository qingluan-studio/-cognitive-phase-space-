export interface ChaosSeed {
  value: number;
  id: string;
  source: string;
}

export interface ChaosCascade {
  seeds: number;
  spreadRadius: number;
  entropy: number;
}

export class DionysianChaos {
  private _seeds: Map<string, ChaosSeed> = new Map();
  private _cascades: ChaosCascade[] = [];
  private _lattice: number[][] = [];
  private _latticeSize: number = 20;
  private _couplingStrength: number = 0.3;
  private _lyapunovSpectrum: number[] = [];
  private _entropyProduction: number = 0;
  private _state: Record<string, unknown> = {};

  constructor() {
    this._initLattice();
    this._state.initializedAt = Date.now();
  }

  get seedCount(): number {
    return this._seeds.size;
  }

  get latticeSize(): number {
    return this._latticeSize;
  }

  get entropyProduction(): number {
    return this._entropyProduction;
  }

  private _initLattice(): void {
    this._lattice = [];
    for (let i = 0; i < this._latticeSize; i++) {
      this._lattice[i] = [];
      for (let j = 0; j < this._latticeSize; j++) {
        this._lattice[i][j] = Math.random();
      }
    }
  }

  plant(seed: ChaosSeed): void {
    this._seeds.set(seed.id, seed);
    const i = Math.floor(Math.random() * this._latticeSize);
    const j = Math.floor(Math.random() * this._latticeSize);
    this._lattice[i][j] = seed.value;
  }

  spread(steps: number): ChaosCascade {
    let spreadRadius = 0;
    for (let s = 0; s < steps; s++) {
      const newLattice = this._lattice.map(row => [...row]);
      for (let i = 0; i < this._latticeSize; i++) {
        for (let j = 0; j < this._latticeSize; j++) {
          const logistic = 4 * this._lattice[i][j] * (1 - this._lattice[i][j]);
          let neighborSum = 0;
          let count = 0;
          for (let di = -1; di <= 1; di++) {
            for (let dj = -1; dj <= 1; dj++) {
              const ni = (i + di + this._latticeSize) % this._latticeSize;
              const nj = (j + dj + this._latticeSize) % this._latticeSize;
              neighborSum += this._lattice[ni][nj];
              count++;
            }
          }
          newLattice[i][j] = (1 - this._couplingStrength) * logistic + this._couplingStrength * (neighborSum / count);
        }
      }
      this._lattice = newLattice;
      spreadRadius++;
    }
    const entropy = this._computeLatticeEntropy();
    this._updateLyapunovSpectrum();
    this._entropyProduction += entropy * 0.01;
    const cascade: ChaosCascade = {
      seeds: this._seeds.size,
      spreadRadius,
      entropy,
    };
    this._cascades.push(cascade);
    if (this._cascades.length > 50) this._cascades.shift();
    return cascade;
  }

  private _computeLatticeEntropy(): number {
    const bins = 10;
    const counts = new Array(bins).fill(0);
    for (let i = 0; i < this._latticeSize; i++) {
      for (let j = 0; j < this._latticeSize; j++) {
        const idx = Math.min(bins - 1, Math.floor(this._lattice[i][j] * bins));
        counts[idx]++;
      }
    }
    const total = this._latticeSize * this._latticeSize;
    let entropy = 0;
    for (const c of counts) {
      if (c > 0) {
        const p = c / total;
        entropy -= p * Math.log2(p);
      }
    }
    return entropy;
  }

  private _updateLyapunovSpectrum(): void {
    const exponents: number[] = [];
    for (let i = 0; i < 5; i++) {
      let divergence = 0;
      for (let j = 0; j < this._latticeSize; j++) {
        const x = this._lattice[j][0];
        const delta = 1e-6;
        const f1 = 4 * x * (1 - x);
        const f2 = 4 * (x + delta) * (1 - (x + delta));
        divergence += Math.log(Math.abs((f2 - f1) / delta) + 1e-9);
      }
      exponents.push(divergence / this._latticeSize);
    }
    this._lyapunovSpectrum = exponents;
  }

  intensityAt(x: number, y: number): number {
    const i = Math.floor(x) % this._latticeSize;
    const j = Math.floor(y) % this._latticeSize;
    return this._lattice[i][j];
  }

  getSeed(id: string): ChaosSeed | null {
    return this._seeds.get(id) ?? null;
  }

  listSeeds(): ChaosSeed[] {
    return Array.from(this._seeds.values());
  }

  recentCascades(limit: number = 20): ChaosCascade[] {
    return this._cascades.slice(-limit);
  }

  setCoupling(strength: number): void {
    this._couplingStrength = Math.max(0, Math.min(1, strength));
  }

  largestLyapunov(): number {
    if (this._lyapunovSpectrum.length === 0) return 0;
    return Math.max(...this._lyapunovSpectrum);
  }

  computeKolmogorovSinaiEntropy(): number {
    return this._lyapunovSpectrum.filter(e => e > 0).reduce((a, b) => a + b, 0);
  }

  findHotspots(threshold: number = 0.8): { x: number; y: number; value: number }[] {
    const hotspots: { x: number; y: number; value: number }[] = [];
    for (let i = 0; i < this._latticeSize; i++) {
      for (let j = 0; j < this._latticeSize; j++) {
        if (this._lattice[i][j] >= threshold) {
          hotspots.push({ x: i, y: j, value: this._lattice[i][j] });
        }
      }
    }
    return hotspots;
  }

  totalEnergy(): number {
    let sum = 0;
    for (let i = 0; i < this._latticeSize; i++) {
      for (let j = 0; j < this._latticeSize; j++) {
        sum += this._lattice[i][j] * this._lattice[i][j];
      }
    }
    return sum;
  }

  chaosReport(): Record<string, unknown> {
    return {
      seedCount: this._seeds.size,
      cascadeCount: this._cascades.length,
      latticeSize: this._latticeSize,
      couplingStrength: this._couplingStrength.toFixed(3),
      entropyProduction: this._entropyProduction.toFixed(4),
      largestLyapunov: this.largestLyapunov().toFixed(4),
      kolmogorovSinaiEntropy: this.computeKolmogorovSinaiEntropy().toFixed(4),
      totalEnergy: this.totalEnergy().toFixed(3),
    };
  }
}
