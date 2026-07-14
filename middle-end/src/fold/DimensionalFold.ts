export interface FoldLayer {
  dimension: number;
  compression: number;
  tension: number;
  active: boolean;
}

export type FoldMetric = {
  curvature: number;
  volume: number;
  density: number;
};

export interface DimensionalFoldConfig {
  dimensionality: number;
  compressionFactor: number;
  tensionLimit: number;
}

export class DimensionalFold {
  private _config: DimensionalFoldConfig;
  private _layers: FoldLayer[] = [];
  private _metrics: FoldMetric | null = null;
  private _state: Record<string, unknown> = {};
  private _ricciScalar: number = 0;
  private _volumeForm: number = 1;
  private _christoffelSymbols: number[][][] = [];

  constructor(config: DimensionalFoldConfig) {
    this._config = config;
    this._initLayers();
    this._initChristoffel();
  }

  get layerCount(): number {
    return this._layers.length;
  }

  get ricciScalar(): number {
    return this._ricciScalar;
  }

  get volumeForm(): number {
    return this._volumeForm;
  }

  private _initLayers(): void {
    this._layers = [];
    for (let d = 2; d <= this._config.dimensionality; d++) {
      this._layers.push({
        dimension: d,
        compression: 1,
        tension: 0,
        active: true,
      });
    }
  }

  private _initChristoffel(): void {
    const n = this._config.dimensionality;
    this._christoffelSymbols = [];
    for (let i = 0; i < n; i++) {
      const plane: number[][] = [];
      for (let j = 0; j < n; j++) {
        const row: number[] = [];
        for (let k = 0; k < n; k++) {
          row.push(i === j && j === k ? 0.1 : 0);
        }
        plane.push(row);
      }
      this._christoffelSymbols.push(plane);
    }
  }

  private _computeRicci(): void {
    const n = this._config.dimensionality;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        sum += this._christoffelSymbols[i][j][j] - this._christoffelSymbols[i][i][j];
      }
    }
    this._ricciScalar = sum / (n * n);
  }

  private _updateVolumeForm(): void {
    let det = 1;
    for (const layer of this._layers) {
      det *= layer.compression;
    }
    this._volumeForm = det;
  }

  fold(dimension: number): void {
    const layer = this._layers.find((l) => l.dimension === dimension);
    if (!layer || !layer.active) return;
    layer.compression *= this._config.compressionFactor;
    layer.tension += (1 - layer.compression) * 10;
    if (layer.tension > this._config.tensionLimit) {
      layer.active = false;
    }
    this._updateVolumeForm();
    this._computeRicci();
    this._state.lastFolded = dimension;
  }

  unfold(dimension: number): void {
    const layer = this._layers.find((l) => l.dimension === dimension);
    if (!layer) return;
    layer.compression = Math.min(1, layer.compression / this._config.compressionFactor);
    layer.tension = Math.max(0, layer.tension - 1);
    layer.active = true;
    this._updateVolumeForm();
    this._computeRicci();
    this._state.lastUnfolded = dimension;
  }

  computeMetrics(): FoldMetric {
    const curvature = this._layers.reduce((acc, l) => acc + l.tension * l.tension, 0);
    const volume = this._volumeForm;
    const density = this._layers.length / Math.max(0.001, volume);
    this._metrics = { curvature, volume, density };
    return this._metrics;
  }

  isTorn(): boolean {
    return this._layers.some((l) => !l.active);
  }

  tornDimensions(): number[] {
    return this._layers.filter((l) => !l.active).map((l) => l.dimension);
  }

  restoreDimension(dimension: number): void {
    const layer = this._layers.find((l) => l.dimension === dimension);
    if (layer) {
      layer.active = true;
      layer.tension = 0;
      layer.compression = 1;
    }
    this._updateVolumeForm();
    this._computeRicci();
  }

  totalTension(): number {
    return this._layers.reduce((acc, l) => acc + l.tension, 0);
  }

  averageCompression(): number {
    if (this._layers.length === 0) return 0;
    return this._layers.reduce((acc, l) => acc + l.compression, 0) / this._layers.length;
  }

  reset(): void {
    this._initLayers();
    this._metrics = null;
    this._ricciScalar = 0;
    this._volumeForm = 1;
    this._state = {};
    this._initChristoffel();
  }

  report(): Record<string, unknown> {
    return {
      layers: this._layers.length,
      torn: this.isTorn(),
      metrics: this._metrics,
      state: this._state,
      ricciScalar: this._ricciScalar.toFixed(4),
      volumeForm: this._volumeForm.toFixed(4),
    };
  }
}
