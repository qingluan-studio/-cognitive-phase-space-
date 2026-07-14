export interface AbyssalGlowPoint {
  depth: number;
  luminance: number;
  source: string;
  stable: boolean;
}

export type AbyssalProfile = {
  points: number;
  totalLuminance: number;
  deepestGlow: number;
};

export interface AbyssalGlowConfig {
  maxDepth: number;
  baseLuminance: number;
  attenuation: number;
}

export class AbyssalGlow {
  private _config: AbyssalGlowConfig;
  private _points: AbyssalGlowPoint[] = [];
  private _profile: AbyssalProfile | null = null;
  private _state: Record<string, unknown> = {};
  private _depthEntropy: number = 0;
  private _stochasticKernel: number[][] = [];
  private _kernelSize: number = 8;

  constructor(config: AbyssalGlowConfig) {
    this._config = config;
    this._initKernel();
  }

  get pointCount(): number {
    return this._points.length;
  }

  get maxDepth(): number {
    return this._config.maxDepth;
  }

  get depthEntropy(): number {
    return this._depthEntropy;
  }

  private _initKernel(): void {
    this._stochasticKernel = [];
    for (let i = 0; i < this._kernelSize; i++) {
      const row: number[] = [];
      let sum = 0;
      for (let j = 0; j < this._kernelSize; j++) {
        const v = Math.exp(-Math.abs(i - j) * 0.5);
        row.push(v);
        sum += v;
      }
      this._stochasticKernel.push(row.map((v) => v / sum));
    }
  }

  private _computeDepthEntropy(): void {
    if (this._points.length === 0) {
      this._depthEntropy = 0;
      return;
    }
    const bins = new Array(this._kernelSize).fill(0);
    for (const p of this._points) {
      const idx = Math.min(this._kernelSize - 1, Math.floor((p.depth / this._config.maxDepth) * this._kernelSize));
      bins[idx]++;
    }
    let entropy = 0;
    const total = this._points.length;
    for (const b of bins) {
      const p = b / total;
      if (p > 0) {
        entropy -= p * Math.log2(p);
      }
    }
    this._depthEntropy = entropy;
  }

  private _applyKernelTransition(depthRatio: number): number {
    const idx = Math.min(this._kernelSize - 1, Math.floor(depthRatio * this._kernelSize));
    let next = 0;
    for (let j = 0; j < this._kernelSize; j++) {
      next += this._stochasticKernel[idx][j] * (j / this._kernelSize);
    }
    return next;
  }

  register(source: string, depth: number): AbyssalGlowPoint {
    const attenuation = Math.exp(-depth * this._config.attenuation);
    const depthRatio = depth / this._config.maxDepth;
    const transitioned = this._applyKernelTransition(depthRatio);
    const luminance = this._config.baseLuminance * attenuation * (1 + transitioned * 0.1);
    const stable = luminance > 0.001;
    const point: AbyssalGlowPoint = { depth, luminance, source, stable };
    this._points.push(point);
    if (this._points.length > 60) this._points.shift();
    this._computeDepthEntropy();
    this._state.lastTransitionedDepth = transitioned;
    return point;
  }

  computeProfile(): AbyssalProfile {
    const totalLuminance = this._points.reduce((acc, p) => acc + p.luminance, 0);
    const deepestGlow =
      this._points.length > 0 ? Math.max(...this._points.map((p) => p.depth)) : 0;
    this._profile = {
      points: this._points.length,
      totalLuminance,
      deepestGlow,
    };
    return this._profile;
  }

  isDetectable(): boolean {
    return this.computeProfile().totalLuminance > 0.01;
  }

  deepestPoint(): AbyssalGlowPoint | null {
    if (this._points.length === 0) return null;
    return this._points.reduce((best, p) => (p.depth > best.depth ? p : best));
  }

  brightestPoint(): AbyssalGlowPoint | null {
    if (this._points.length === 0) return null;
    return this._points.reduce((best, p) => (p.luminance > best.luminance ? p : best));
  }

  filterByDepth(minDepth: number, maxDepth: number): AbyssalGlowPoint[] {
    return this._points.filter((p) => p.depth >= minDepth && p.depth <= maxDepth);
  }

  tuneAttenuation(factor: number): void {
    this._config.attenuation *= factor;
    this._state.attenuationTuned = factor;
  }

  reset(): void {
    this._points = [];
    this._state.resetAt = Date.now();
    this._depthEntropy = 0;
  }

  report(): Record<string, unknown> {
    return {
      pointCount: this._points.length,
      profile: this._profile,
      state: this._state,
      depthEntropy: this._depthEntropy.toFixed(4),
    };
  }
}
