export interface DesertWanderingData {
  position: { x: number; y: number };
  stepsTaken: number;
  signals: string[];
  areaCovered: number;
}

export class DesertWandering {
  private _x: number;
  private _y: number;
  private _steps: number;
  private _signals: string[];
  private _visited: Set<string>;
  private _seed: number;
  private _autocorrelation: number[];
  private _percolationThreshold: number;

  constructor(startX: number = 0, startY: number = 0, seed: number = 42) {
    this._x = startX;
    this._y = startY;
    this._steps = 0;
    this._signals = [];
    this._visited = new Set<string>();
    this._seed = seed;
    this._autocorrelation = [];
    this._percolationThreshold = 0.592746;
    this._visited.add(`${this._x},${this._y}`);
  }

  get position(): { x: number; y: number } {
    return { x: this._x, y: this._y };
  }

  get stepsTaken(): number {
    return this._steps;
  }

  get areaCovered(): number {
    return this._visited.size;
  }

  get fractalDimension(): number {
    const r = Math.sqrt(this.areaCovered);
    return r > 0 ? Math.log(this._visited.size) / Math.log(r + 1) : 0;
  }

  public walk(directions: number): void {
    const moves = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let i = 0; i < directions; i += 1) {
      const m = moves[Math.floor(this._rand() * moves.length)];
      this._x += m[0];
      this._y += m[1];
      this._steps += 1;
      this._visited.add(`${this._x},${this._y}`);
      this._autocorrelation.push(this._x * this._x + this._y * this._y);
      if (this._autocorrelation.length > 100) this._autocorrelation.shift();
    }
  }

  public listen(signal: string): void {
    if (signal && !this._signals.includes(signal)) {
      this._signals.push(signal);
    }
  }

  public backtrack(): void {
    const keys = Array.from(this._visited);
    if (keys.length === 0) return;
    const [x, y] = keys[0].split(',').map(Number);
    this._x = x;
    this._y = y;
  }

  public report(): DesertWanderingData {
    return {
      position: this.position,
      stepsTaken: this._steps,
      signals: [...this._signals],
      areaCovered: this.areaCovered,
    };
  }

  public signalDensity(): number {
    return this._steps === 0 ? 0 : this._signals.length / this._steps;
  }

  public computeAutocorrelation(lag: number): number {
    if (this._autocorrelation.length <= lag) return 0;
    const mean = this._autocorrelation.reduce((a, b) => a + b, 0) / this._autocorrelation.length;
    let num = 0;
    let den = 0;
    for (let i = 0; i < this._autocorrelation.length - lag; i++) {
      num += (this._autocorrelation[i] - mean) * (this._autocorrelation[i + lag] - mean);
    }
    for (let i = 0; i < this._autocorrelation.length; i++) {
      den += (this._autocorrelation[i] - mean) ** 2;
    }
    return den > 0 ? num / den : 0;
  }

  public estimatePercolationProbability(): number {
    const gridSize = Math.ceil(Math.sqrt(this.areaCovered));
    const occupied = this.areaCovered;
    const total = gridSize * gridSize;
    const p = total > 0 ? occupied / total : 0;
    return p > this._percolationThreshold ? 1 : 0;
  }

  public computeMeanSquaredDisplacement(): number {
    if (this._steps === 0) return 0;
    return (this._x * this._x + this._y * this._y) / this._steps;
  }

  private _rand(): number {
    this._seed = (this._seed * 9301 + 49297) % 233280;
    return this._seed / 233280;
  }
}
