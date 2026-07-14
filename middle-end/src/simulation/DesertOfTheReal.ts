export interface OasisPoint {
  x: number;
  y: number;
  depth: number;
  real: boolean;
}

export type DesertTopology = {
  area: number;
  oasisCount: number;
  realRatio: number;
};

export interface DesertConfig {
  width: number;
  height: number;
  oasisProbability: number;
  mirageFactor: number;
}

export class DesertOfTheReal {
  private _config: DesertConfig;
  private _points: OasisPoint[] = [];
  private _topology: DesertTopology | null = null;
  private _state: Record<string, unknown> = {};
  private _perlinGrid: number[][] = [];
  private _fractalDimension: number = 0;
  private _entropyOfReality: number = 0;

  constructor(config: DesertConfig) {
    this._config = config;
    this._initPerlin();
  }

  get pointCount(): number {
    return this._points.length;
  }

  get realCount(): number {
    return this._points.filter((p) => p.real).length;
  }

  get fractalDimension(): number {
    return this._fractalDimension;
  }

  private _initPerlin(): void {
    const size = 8;
    this._perlinGrid = [];
    for (let i = 0; i <= size; i++) {
      const row: number[] = [];
      for (let j = 0; j <= size; j++) {
        row.push(Math.random());
      }
      this._perlinGrid.push(row);
    }
  }

  private _perlinNoise(x: number, y: number): number {
    const size = 8;
    const fx = (x / this._config.width) * size;
    const fy = (y / this._config.height) * size;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const x1 = Math.min(x0 + 1, size);
    const y1 = Math.min(y0 + 1, size);
    const sx = fx - x0;
    const sy = fy - y0;
    const n0 = this._perlinGrid[x0][y0];
    const n1 = this._perlinGrid[x1][y0];
    const n2 = this._perlinGrid[x0][y1];
    const n3 = this._perlinGrid[x1][y1];
    const ix0 = n0 + sx * (n1 - n0);
    const ix1 = n2 + sx * (n3 - n2);
    return ix0 + sy * (ix1 - ix0);
  }

  private _computeFractalDimension(): void {
    const boxes = new Set<number>();
    for (const p of this._points) {
      const res = 10;
      const bx = Math.floor((p.x / this._config.width) * res);
      const by = Math.floor((p.y / this._config.height) * res);
      boxes.add(bx * res + by);
    }
    this._fractalDimension = Math.log(boxes.size + 1) / Math.log(10);
  }

  private _computeRealityEntropy(): void {
    const real = this.realCount;
    const fake = this._points.length - real;
    const total = this._points.length;
    if (total === 0) {
      this._entropyOfReality = 0;
      return;
    }
    const pReal = real / total;
    const pFake = fake / total;
    let entropy = 0;
    if (pReal > 0) entropy -= pReal * Math.log2(pReal);
    if (pFake > 0) entropy -= pFake * Math.log2(pFake);
    this._entropyOfReality = entropy;
  }

  explore(x: number, y: number): OasisPoint {
    const noise = this._perlinNoise(x, y);
    const depth = noise * 10;
    const real = noise > this._config.oasisProbability && Math.random() > this._config.mirageFactor;
    const point: OasisPoint = { x, y, depth, real };
    this._points.push(point);
    if (this._points.length > 60) this._points.shift();
    this._computeFractalDimension();
    this._computeRealityEntropy();
    return point;
  }

  computeTopology(): DesertTopology {
    const oasisCount = this._points.filter((p) => p.depth > 5).length;
    const realRatio = this._points.length > 0 ? this.realCount / this._points.length : 0;
    this._topology = { area: this._config.width * this._config.height, oasisCount, realRatio };
    return this._topology;
  }

  isReal(point: OasisPoint): boolean {
    return point.real;
  }

  nearestReal(x: number, y: number): OasisPoint | null {
    const realPoints = this._points.filter((p) => p.real);
    if (realPoints.length === 0) return null;
    return realPoints.reduce((best, p) => {
      const db = (best.x - x) * (best.x - x) + (best.y - y) * (best.y - y);
      const dp = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y);
      return dp < db ? p : best;
    });
  }

  mirageDensity(): number {
    return 1 - (this._points.length > 0 ? this.realCount / this._points.length : 0);
  }

  reset(): void {
    this._points = [];
    this._topology = null;
    this._fractalDimension = 0;
    this._entropyOfReality = 0;
    this._initPerlin();
    this._state = {};
  }

  report(): Record<string, unknown> {
    return {
      points: this._points.length,
      realCount: this.realCount,
      topology: this._topology,
      state: this._state,
      fractalDimension: this._fractalDimension.toFixed(4),
      realityEntropy: this._entropyOfReality.toFixed(4),
    };
  }
}
