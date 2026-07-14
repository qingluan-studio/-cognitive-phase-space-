export interface LandscapePoint {
  x: number;
  y: number;
  fitness: number;
  ruggedness: number;
  neutrality: number;
}

export interface NKConfig {
  n: number;
  k: number;
  ruggedness: number;
}

export class FitnessLandscape {
  private _config: NKConfig;
  private _points: Map<string, LandscapePoint> = new Map();
  private _state: Record<string, unknown> = {};
  private _correlationLength: number = 0;
  private _adaptiveWalkLength: number = 0;

  constructor(config: NKConfig) {
    this._config = { ...config };
  }

  get pointCount(): number {
    return this._points.size;
  }

  get n(): number {
    return this._config.n;
  }

  get k(): number {
    return this._config.k;
  }

  generateLandscape(): void {
    const size = Math.pow(2, this._config.n);
    for (let i = 0; i < size; i++) {
      const x = i % Math.sqrt(size);
      const y = Math.floor(i / Math.sqrt(size));
      const baseFitness = Math.random();
      const ruggedness = this._config.ruggedness * Math.random();
      const fitness = baseFitness * (1 - ruggedness) + ruggedness * Math.random();
      const neutrality = Math.random() < 0.1 ? 1 : 0;
      this._points.set(`${x},${y}`, { x, y, fitness, ruggedness, neutrality });
    }
    this._computeCorrelationLength();
  }

  private _computeCorrelationLength(): void {
    const points = Array.from(this._points.values());
    if (points.length < 2) return;
    let sum = 0;
    let count = 0;
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const dist = Math.sqrt(Math.pow(points[i].x - points[j].x, 2) + Math.pow(points[i].y - points[j].y, 2));
        if (dist > 0 && dist < 5) {
          sum += (points[i].fitness - points[j].fitness) / dist;
          count++;
        }
      }
    }
    this._correlationLength = count > 0 ? sum / count : 0;
  }

  fitnessAt(x: number, y: number): number {
    return this._points.get(`${x},${y}`)?.fitness ?? 0;
  }

  localOptima(): LandscapePoint[] {
    const optima: LandscapePoint[] = [];
    for (const point of this._points.values()) {
      const neighbors = [
        this._points.get(`${point.x + 1},${point.y}`),
        this._points.get(`${point.x - 1},${point.y}`),
        this._points.get(`${point.x},${point.y + 1}`),
        this._points.get(`${point.x},${point.y - 1}`),
      ].filter(Boolean) as LandscapePoint[];
      if (neighbors.every((n) => n.fitness <= point.fitness)) {
        optima.push(point);
      }
    }
    return optima;
  }

  adaptiveWalk(startX: number, startY: number, steps: number): LandscapePoint[] {
    const path: LandscapePoint[] = [];
    let current = this._points.get(`${startX},${startY}`);
    if (!current) return path;
    for (let i = 0; i < steps; i++) {
      const neighbors = [
        this._points.get(`${current.x + 1},${current.y}`),
        this._points.get(`${current.x - 1},${current.y}`),
        this._points.get(`${current.x},${current.y + 1}`),
        this._points.get(`${current.x},${current.y - 1}`),
      ].filter(Boolean) as LandscapePoint[];
      if (neighbors.length === 0) break;
      const best = neighbors.reduce((b, n) => (n.fitness > b.fitness ? n : b));
      if (best.fitness <= current.fitness) break;
      current = best;
      path.push(current);
    }
    this._adaptiveWalkLength = path.length;
    return path;
  }

  neutralNetwork(): LandscapePoint[] {
    return Array.from(this._points.values()).filter((p) => p.neutrality > 0);
  }

  ruggednessMetric(): number {
    const points = Array.from(this._points.values());
    if (points.length < 2) return 0;
    let sum = 0;
    for (let i = 1; i < points.length; i++) {
      sum += Math.abs(points[i].fitness - points[i - 1].fitness);
    }
    return sum / (points.length - 1);
  }

  report(): Record<string, unknown> {
    return {
      points: this._points.size,
      n: this._config.n,
      k: this._config.k,
      correlationLength: this._correlationLength,
      adaptiveWalkLength: this._adaptiveWalkLength,
      localOptima: this.localOptima().length,
      ruggedness: this.ruggednessMetric(),
      state: this._state,
    };
  }
}
