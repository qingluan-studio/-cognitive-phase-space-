export interface Morphogen {
  id: string;
  x: number;
  y: number;
  concentration: number;
  diffusionRate: number;
}

export type FieldGradient = {
  dx: number;
  dy: number;
  magnitude: number;
};

export interface MorphicConfig {
  width: number;
  height: number;
  resolution: number;
  decayRate: number;
}

export class MorphicField {
  private _config: MorphicConfig;
  private _morphogens: Morphogen[] = [];
  private _field: number[][] = [];
  private _gradients: FieldGradient[][] = [];
  private _meta: Record<string, unknown> = {};
  private _laplacian: number[][] = [];

  constructor(config: MorphicConfig) {
    this._config = config;
    this._initField();
  }

  get morphogenCount(): number {
    return this._morphogens.length;
  }

  get fieldResolution(): number {
    return this._config.resolution;
  }

  get totalConcentration(): number {
    let sum = 0;
    for (const row of this._field) {
      for (const v of row) {
        sum += v;
      }
    }
    return sum;
  }

  private _initField(): void {
    const res = this._config.resolution;
    this._field = [];
    this._gradients = [];
    this._laplacian = [];
    for (let i = 0; i < res; i++) {
      const row: number[] = [];
      const gRow: FieldGradient[] = [];
      const lRow: number[] = [];
      for (let j = 0; j < res; j++) {
        row.push(0);
        gRow.push({ dx: 0, dy: 0, magnitude: 0 });
        lRow.push(0);
      }
      this._field.push(row);
      this._gradients.push(gRow);
      this._laplacian.push(lRow);
    }
  }

  private _mapToGrid(x: number, y: number): [number, number] {
    const gx = Math.floor((x / this._config.width) * this._config.resolution);
    const gy = Math.floor((y / this._config.height) * this._config.resolution);
    return [
      Math.max(0, Math.min(this._config.resolution - 1, gx)),
      Math.max(0, Math.min(this._config.resolution - 1, gy)),
    ];
  }

  private _computeLaplacian(): void {
    const res = this._config.resolution;
    for (let i = 1; i < res - 1; i++) {
      for (let j = 1; j < res - 1; j++) {
        this._laplacian[i][j] =
          this._field[i - 1][j] +
          this._field[i + 1][j] +
          this._field[i][j - 1] +
          this._field[i][j + 1] -
          4 * this._field[i][j];
      }
    }
  }

  private _computeGradients(): void {
    const res = this._config.resolution;
    for (let i = 1; i < res - 1; i++) {
      for (let j = 1; j < res - 1; j++) {
        const dx = (this._field[i + 1][j] - this._field[i - 1][j]) / 2;
        const dy = (this._field[i][j + 1] - this._field[i][j - 1]) / 2;
        this._gradients[i][j] = { dx, dy, magnitude: Math.sqrt(dx * dx + dy * dy) };
      }
    }
  }

  addMorphogen(id: string, x: number, y: number, concentration: number, diffusionRate: number): void {
    const morphogen: Morphogen = { id, x, y, concentration, diffusionRate };
    this._morphogens.push(morphogen);
    const [gx, gy] = this._mapToGrid(x, y);
    this._field[gx][gy] += concentration;
    if (this._morphogens.length > 20) {
      this._morphogens.shift();
    }
  }

  diffuse(dt: number): void {
    this._computeLaplacian();
    const res = this._config.resolution;
    for (let i = 1; i < res - 1; i++) {
      for (let j = 1; j < res - 1; j++) {
        const rate = this._morphogens.reduce((max, m) => Math.max(max, m.diffusionRate), 0.1);
        this._field[i][j] += rate * this._laplacian[i][j] * dt;
        this._field[i][j] *= Math.exp(-this._config.decayRate * dt);
      }
    }
    this._computeGradients();
  }

  gradientAt(x: number, y: number): FieldGradient {
    const [gx, gy] = this._mapToGrid(x, y);
    return this._gradients[gx][gy];
  }

  concentrationAt(x: number, y: number): number {
    const [gx, gy] = this._mapToGrid(x, y);
    return this._field[gx][gy];
  }

  findPeaks(): { x: number; y: number; value: number }[] {
    const peaks: { x: number; y: number; value: number }[] = [];
    const res = this._config.resolution;
    for (let i = 1; i < res - 1; i++) {
      for (let j = 1; j < res - 1; j++) {
        const v = this._field[i][j];
        if (
          v > this._field[i - 1][j] &&
          v > this._field[i + 1][j] &&
          v > this._field[i][j - 1] &&
          v > this._field[i][j + 1]
        ) {
          peaks.push({
            x: (i / res) * this._config.width,
            y: (j / res) * this._config.height,
            value: v,
          });
        }
      }
    }
    return peaks;
  }

  reset(): void {
    this._morphogens = [];
    this._initField();
    this._meta = {};
  }

  report(): Record<string, unknown> {
    return {
      morphogens: this._morphogens.length,
      resolution: this._config.resolution,
      totalConcentration: this.totalConcentration.toFixed(3),
      peaks: this.findPeaks().length,
      meta: this._meta,
    };
  }
}
