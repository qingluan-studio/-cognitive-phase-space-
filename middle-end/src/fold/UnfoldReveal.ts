export interface HiddenLayer {
  depth: number;
  data: string;
  revealed: boolean;
  opacity: number;
}

export type RevealProgress = {
  layersRevealed: number;
  totalDepth: number;
  completion: number;
};

export interface UnfoldRevealConfig {
  layerCount: number;
  maxDepth: number;
  revealRate: number;
}

export class UnfoldReveal {
  private _config: UnfoldRevealConfig;
  private _layers: HiddenLayer[] = [];
  private _progress: RevealProgress | null = null;
  private _state: Record<string, unknown> = {};
  private _bifurcationParameter: number = 0;
  private _lyapunovSpectrum: number[] = [];
  private _fractalDimensionEstimate: number = 0;

  constructor(config: UnfoldRevealConfig) {
    this._config = config;
    this._initLayers();
  }

  get layerCount(): number {
    return this._layers.length;
  }

  get revealedCount(): number {
    return this._layers.filter((l) => l.revealed).length;
  }

  get fractalDimensionEstimate(): number {
    return this._fractalDimensionEstimate;
  }

  private _initLayers(): void {
    this._layers = [];
    for (let i = 0; i < this._config.layerCount; i++) {
      this._layers.push({
        depth: (i / this._config.layerCount) * this._config.maxDepth,
        data: `layer-${i}`,
        revealed: false,
        opacity: 0,
      });
    }
  }

  private _logisticMap(r: number, x: number): number {
    return r * x * (1 - x);
  }

  private _computeLyapunov(r: number): number {
    let x = 0.5;
    let sum = 0;
    for (let i = 0; i < 100; i++) {
      x = this._logisticMap(r, x);
      const derivative = Math.abs(r * (1 - 2 * x));
      if (derivative > 0) {
        sum += Math.log(derivative);
      }
    }
    return sum / 100;
  }

  private _boxCountDim(values: number[]): number {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    if (range === 0) return 0;
    const boxes = new Set<number>();
    for (const v of values) {
      boxes.add(Math.floor((v - min) / (range / 10)));
    }
    return Math.log(boxes.size) / Math.log(10);
  }

  addLayer(data: string): HiddenLayer {
    const layer: HiddenLayer = {
      depth: this._config.maxDepth,
      data,
      revealed: false,
      opacity: 0,
    };
    this._layers.push(layer);
    if (this._layers.length > this._config.layerCount * 2) {
      this._layers.shift();
    }
    return layer;
  }

  revealNext(): HiddenLayer | null {
    const next = this._layers.find((l) => !l.revealed);
    if (!next) return null;
    next.revealed = true;
    next.opacity = 1;
    this._bifurcationParameter += this._config.revealRate;
    const lyap = this._computeLyapunov(3.5 + this._bifurcationParameter);
    this._lyapunovSpectrum.push(lyap);
    if (this._lyapunovSpectrum.length > 30) this._lyapunovSpectrum.shift();
    const depths = this._layers.map((l) => l.depth);
    this._fractalDimensionEstimate = this._boxCountDim(depths);
    this._state.lastRevealed = next.data;
    return next;
  }

  computeProgress(): RevealProgress {
    const revealed = this.revealedCount;
    const totalDepth = this._layers.reduce((acc, l) => acc + l.depth, 0);
    const completion = this._layers.length > 0 ? revealed / this._layers.length : 0;
    this._progress = { layersRevealed: revealed, totalDepth, completion };
    return this._progress;
  }

  isComplete(): boolean {
    return this._layers.every((l) => l.revealed);
  }

  conceal(id: string): boolean {
    const layer = this._layers.find((l) => l.data === id);
    if (!layer || !layer.revealed) return false;
    layer.revealed = false;
    layer.opacity = 0;
    return true;
  }

  deepestLayer(): HiddenLayer | null {
    return this._layers.reduce((best, l) => (l.depth > best.depth ? l : best));
  }

  averageLyapunov(): number {
    if (this._lyapunovSpectrum.length === 0) return 0;
    return this._lyapunovSpectrum.reduce((a, b) => a + b, 0) / this._lyapunovSpectrum.length;
  }

  reset(): void {
    this._initLayers();
    this._progress = null;
    this._bifurcationParameter = 0;
    this._lyapunovSpectrum = [];
    this._fractalDimensionEstimate = 0;
    this._state = {};
  }

  report(): Record<string, unknown> {
    return {
      layers: this._layers.length,
      revealed: this.revealedCount,
      progress: this._progress,
      state: this._state,
      averageLyapunov: this.averageLyapunov().toFixed(4),
      fractalDimensionEstimate: this._fractalDimensionEstimate.toFixed(4),
    };
  }
}
