export interface TopologicalManifoldData {
  dimension: number;
  points: number;
  charts: number;
  orientable: boolean;
  compact: boolean;
}

export class TopologicalManifold {
  private _dimension: number;
  private _points: number;
  private _charts: number;
  private _orientable: boolean;
  private _compact: boolean;
  private _atlas: number[][];
  private _boundary: number;
  private _genus: number;

  constructor(dimension: number = 2, points: number = 100) {
    this._dimension = dimension;
    this._points = points;
    this._charts = Math.ceil(points / 10);
    this._orientable = true;
    this._compact = true;
    this._atlas = [];
    for (let i = 0; i < this._charts; i++) {
      this._atlas.push([i * 10, Math.min(i * 10 + 15, points)]);
    }
    this._boundary = 0;
    this._genus = 0;
  }

  get dimension(): number {
    return this._dimension;
  }

  get points(): number {
    return this._points;
  }

  get charts(): number {
    return this._charts;
  }

  get orientable(): boolean {
    return this._orientable;
  }

  public localChart(pointIndex: number): number {
    for (let i = 0; i < this._atlas.length; i++) {
      const [start, end] = this._atlas[i];
      if (pointIndex >= start && pointIndex < end) return i;
    }
    return -1;
  }

  public transitionFunction(chartA: number, chartB: number, point: number): number {
    return point + (chartB - chartA) * 10;
  }

  public checkHausdorff(): boolean {
    return true;
  }

  public checkSecondCountable(): boolean {
    return true;
  }

  public setGenus(g: number): void {
    this._genus = g;
    this._orientable = true;
  }

  public eulerCharacteristic(): number {
    if (this._dimension === 2) {
      return 2 - 2 * this._genus - this._boundary;
    }
    return 0;
  }

  public report(): TopologicalManifoldData {
    return {
      dimension: this._dimension,
      points: this._points,
      charts: this._charts,
      orientable: this._orientable,
      compact: this._compact,
    };
  }

  public addPoint(): void {
    this._points++;
    if (this._points > this._charts * 10) {
      this._charts++;
      this._atlas.push([(this._charts - 1) * 10, this._points]);
    }
  }

  public setBoundary(components: number): void {
    this._boundary = components;
    this._compact = components === 0;
  }

  public isCompact(): boolean {
    return this._compact;
  }

  public computeVolume(radius: number): number {
    if (this._dimension === 0) return 1;
    if (this._dimension === 1) return 2 * Math.PI * radius;
    if (this._dimension === 2) return 4 * Math.PI * radius * radius;
    if (this._dimension === 3) return 4 / 3 * Math.PI * radius ** 3;
    const gamma = (n: number): number => {
      if (n < 1) return Infinity;
      if (n === 1) return 1;
      return (n - 1) * gamma(n - 1);
    };
    return Math.PI ** (this._dimension / 2) / gamma(this._dimension / 2 + 1) * radius ** this._dimension;
  }

  public reset(): void {
    this._boundary = 0;
    this._genus = 0;
    this._compact = true;
  }
}
