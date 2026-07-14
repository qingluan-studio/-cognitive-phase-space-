/**
 * TensionVector - 张力向量
 * 内部张力场的指向，描述系统中各点承受的拉伸/压缩应力，
 * 张力梯度驱动结构的形变与重组。
 */

export interface TensionVectorData {
  readonly vectorId: string;
  magnitude: number;
  direction: number;
  anchorPoint: number[];
}

export interface TensionReading {
  point: number[];
  tension: number;
  direction: number;
}

export class TensionVector {
  private _data: TensionVectorData;
  private _readings: TensionReading[] = [];
  private _strainAccumulator: number = 0;
  private _yieldPoint: number = 100;
  private _fractured: boolean = false;

  constructor(data: TensionVectorData) {
    this._data = { ...data, anchorPoint: [...data.anchorPoint] };
  }

  get vectorId(): string {
    return this._data.vectorId;
  }

  get magnitude(): number {
    return this._data.magnitude;
  }

  get direction(): number {
    return this._data.direction;
  }

  get fractured(): boolean {
    return this._fractured;
  }

  public applyForce(force: number, angle: number): number {
    if (this._fractured) {
      return 0;
    }
    const projected = force * Math.cos(angle - this._data.direction);
    this._data.magnitude += projected;
    this._strainAccumulator += Math.abs(projected);
    if (this._strainAccumulator > this._yieldPoint) {
      this._fractured = true;
    }
    return this._data.magnitude;
  }

  public measureAt(point: number[]): TensionReading {
    const dx = point[0] - this._data.anchorPoint[0];
    const dy = (point[1] ?? 0) - (this._data.anchorPoint[1] ?? 0);
    const distance = Math.sqrt(dx * dx + dy * dy);
    const tension = this._data.magnitude / (distance + 1);
    const direction = Math.atan2(dy, dx);
    const reading: TensionReading = { point: [...point], tension, direction };
    this._readings.push(reading);
    if (this._readings.length > 30) {
      this._readings.shift();
    }
    return reading;
  }

  public rotate(deltaAngle: number): void {
    this._data.direction = (this._data.direction + deltaAngle) % (2 * Math.PI);
  }

  public relax(amount: number): void {
    this._data.magnitude = Math.max(0, this._data.magnitude - amount);
    this._strainAccumulator = Math.max(0, this._strainAccumulator - amount * 0.5);
  }

  public setYieldPoint(point: number): void {
    this._yieldPoint = Math.max(0, point);
  }

  public moveTo(newAnchor: number[]): void {
    this._data.anchorPoint = [...newAnchor];
  }

  public resolve(): number {
    const resolved = this._data.magnitude;
    this._data.magnitude = 0;
    this._strainAccumulator = 0;
    this._fractured = false;
    return resolved;
  }

  public computeStressField(points: number[][]): TensionReading[] {
    return points.map((p) => this.measureAt(p));
  }

  public tensionReport(): Record<string, unknown> {
    return {
      vectorId: this.vectorId,
      magnitude: this._data.magnitude.toFixed(3),
      direction: this._data.direction.toFixed(3),
      anchorPoint: this._data.anchorPoint.map((v) => v.toFixed(2)),
      strainAccumulator: this._strainAccumulator.toFixed(2),
      yieldPoint: this._yieldPoint,
      fractured: this._fractured,
      readingCount: this._readings.length,
    };
  }
}
