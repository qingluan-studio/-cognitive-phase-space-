export interface MorphogenParticle {
  id: string;
  x: number;
  y: number;
  concentration: number;
  diffusionCoeff: number;
}

export type CloudSnapshot = {
  particleCount: number;
  totalMass: number;
  centerOfMass: [number, number];
  gyrationRadius: number;
};

export interface MorphogenConfig {
  width: number;
  height: number;
  particleCount: number;
  viscosity: number;
}

export class MorphogenCloud {
  private _config: MorphogenConfig;
  private _particles: MorphogenParticle[] = [];
  private _snapshots: CloudSnapshot[] = [];
  private _state: Record<string, unknown> = {};
  private _concentrationGrid: number[][] = [];
  private _gridSize: number = 16;
  private _reactionRate: number = 0.1;

  constructor(config: MorphogenConfig) {
    this._config = config;
    this._initGrid();
  }

  get particleCount(): number {
    return this._particles.length;
  }

  get totalMass(): number {
    return this._particles.reduce((acc, p) => acc + p.concentration, 0);
  }

  get gridEntropy(): number {
    return this._computeGridEntropy();
  }

  private _initGrid(): void {
    this._concentrationGrid = [];
    for (let i = 0; i < this._gridSize; i++) {
      const row: number[] = [];
      for (let j = 0; j < this._gridSize; j++) {
        row.push(0);
      }
      this._concentrationGrid.push(row);
    }
  }

  private _mapToGrid(x: number, y: number): [number, number] {
    const gx = Math.floor((x / this._config.width) * this._gridSize);
    const gy = Math.floor((y / this._config.height) * this._gridSize);
    return [
      Math.max(0, Math.min(this._gridSize - 1, gx)),
      Math.max(0, Math.min(this._gridSize - 1, gy)),
    ];
  }

  private _updateGrid(): void {
    this._initGrid();
    for (const p of this._particles) {
      const [gx, gy] = this._mapToGrid(p.x, p.y);
      this._concentrationGrid[gx][gy] += p.concentration;
    }
  }

  private _computeGridEntropy(): number {
    let entropy = 0;
    const total = this.totalMass;
    if (total === 0) return 0;
    for (const row of this._concentrationGrid) {
      for (const v of row) {
        const p = v / total;
        if (p > 0) {
          entropy -= p * Math.log2(p);
        }
      }
    }
    return entropy;
  }

  private _grayScottReaction(u: number, v: number): [number, number] {
    const f = 0.0545;
    const k = 0.062;
    const reaction = u * v * v;
    const du = -reaction + f * (1 - u);
    const dv = reaction - (f + k) * v;
    return [du, dv];
  }

  emit(id: string, x: number, y: number, concentration: number): MorphogenParticle {
    const particle: MorphogenParticle = {
      id,
      x,
      y,
      concentration,
      diffusionCoeff: 0.1 + Math.random() * 0.4,
    };
    this._particles.push(particle);
    if (this._particles.length > this._config.particleCount) {
      this._particles.shift();
    }
    this._updateGrid();
    return particle;
  }

  diffuse(dt: number): void {
    for (const p of this._particles) {
      const dx = (Math.random() - 0.5) * p.diffusionCoeff * dt * 10;
      const dy = (Math.random() - 0.5) * p.diffusionCoeff * dt * 10;
      p.x = Math.max(0, Math.min(this._config.width, p.x + dx));
      p.y = Math.max(0, Math.min(this._config.height, p.y + dy));
      const [du, dv] = this._grayScottReaction(p.concentration, 0.5);
      p.concentration += (du * this._reactionRate - this._config.viscosity * p.concentration) * dt;
      p.concentration = Math.max(0, p.concentration);
    }
    this._updateGrid();
  }

  snapshot(): CloudSnapshot {
    const totalMass = this.totalMass;
    let cx = 0;
    let cy = 0;
    for (const p of this._particles) {
      cx += p.x * p.concentration;
      cy += p.y * p.concentration;
    }
    const centerOfMass: [number, number] = totalMass > 0 ? [cx / totalMass, cy / totalMass] : [0, 0];
    let rg = 0;
    for (const p of this._particles) {
      const dx = p.x - centerOfMass[0];
      const dy = p.y - centerOfMass[1];
      rg += p.concentration * (dx * dx + dy * dy);
    }
    rg = totalMass > 0 ? Math.sqrt(rg / totalMass) : 0;
    const snap: CloudSnapshot = {
      particleCount: this._particles.length,
      totalMass,
      centerOfMass,
      gyrationRadius: rg,
    };
    this._snapshots.push(snap);
    if (this._snapshots.length > 30) this._snapshots.shift();
    return snap;
  }

  findPeak(): MorphogenParticle | null {
    if (this._particles.length === 0) return null;
    return this._particles.reduce((best, p) => (p.concentration > best.concentration ? p : best));
  }

  averageDiffusionCoeff(): number {
    if (this._particles.length === 0) return 0;
    return this._particles.reduce((acc, p) => acc + p.diffusionCoeff, 0) / this._particles.length;
  }

  reset(): void {
    this._particles = [];
    this._snapshots = [];
    this._initGrid();
    this._state = {};
  }

  report(): Record<string, unknown> {
    return {
      particles: this._particles.length,
      totalMass: this.totalMass.toFixed(3),
      snapshots: this._snapshots.length,
      state: this._state,
      gridEntropy: this.gridEntropy.toFixed(4),
    };
  }
}
