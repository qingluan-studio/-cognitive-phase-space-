/**
 * 荒漠游荡模块：在无数据荒野中漫无目的游荡。
 * 通过随机走动收集稀疏信号，并把走过的足迹合并成地图。
 */

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

  constructor(startX: number = 0, startY: number = 0, seed: number = 42) {
    this._x = startX;
    this._y = startY;
    this._steps = 0;
    this._signals = [];
    this._visited = new Set<string>();
    this._seed = seed;
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

  public walk(directions: number): void {
    const moves = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let i = 0; i < directions; i += 1) {
      const m = moves[Math.floor(this._rand() * moves.length)];
      this._x += m[0];
      this._y += m[1];
      this._steps += 1;
      this._visited.add(`${this._x},${this._y}`);
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

  private _rand(): number {
    this._seed = (this._seed * 9301 + 49297) % 233280;
    return this._seed / 233280;
  }
}
