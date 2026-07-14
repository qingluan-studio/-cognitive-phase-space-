/**
 * ChemotaxisFollower - 趋化性跟随者
 * 沿信息浓度梯度移动，自动趋向高浓度区域或远离低浓度区域，
 * 模拟生物对化学信号的定向运动。
 */

export interface ChemotaxisFollowerData {
  readonly followerId: string;
  position: number;
  sensitivity: number;
  speed: number;
  attractant: boolean;
}

export interface GradientReading {
  position: number;
  concentration: number;
  gradient: number;
}

export class ChemotaxisFollower {
  private _data: ChemotaxisFollowerData;
  private _readings: GradientReading[] = [];
  private _distanceTraveled: number = 0;
  private _lastGradient: number = 0;
  private _field: (pos: number) => number;

  constructor(data: ChemotaxisFollowerData, field: (pos: number) => number) {
    this._data = { ...data };
    this._field = field;
  }

  get followerId(): string {
    return this._data.followerId;
  }

  get position(): number {
    return this._data.position;
  }

  get distanceTraveled(): number {
    return this._distanceTraveled;
  }

  public sense(): GradientReading {
    const concentration = this._field(this._data.position);
    const ahead = this._field(this._data.position + 0.1);
    const gradient = (ahead - concentration) / 0.1;
    this._lastGradient = gradient;
    const reading: GradientReading = { position: this._data.position, concentration, gradient };
    this._readings.push(reading);
    if (this._readings.length > 40) {
      this._readings.shift();
    }
    return reading;
  }

  public move(): number {
    const reading = this.sense();
    const direction = this._data.attractant
      ? Math.sign(reading.gradient)
      : -Math.sign(reading.gradient);
    const step = direction * this._data.speed * this._data.sensitivity;
    const newPos = this._data.position + step;
    this._distanceTraveled += Math.abs(step);
    this._data.position = newPos;
    return newPos;
  }

  public adjustSensitivity(delta: number): void {
    this._data.sensitivity = Math.max(0, Math.min(2, this._data.sensitivity + delta));
  }

  public setSpeed(speed: number): void {
    this._data.speed = Math.max(0, speed);
  }

  public toggleAttractant(): void {
    this._data.attractant = !this._data.attractant;
  }

  public detectPlateau(): boolean {
    if (this._readings.length < 5) {
      return false;
    }
    const recent = this._readings.slice(-5);
    const gradients = recent.map((r) => Math.abs(r.gradient));
    const maxGrad = Math.max(...gradients);
    return maxGrad < 0.01;
  }

  public reverseField(newField: (pos: number) => number): void {
    this._field = newField;
    this._readings = [];
  }

  public jumpTo(position: number): void {
    this._data.position = position;
    this._readings = [];
  }

  public followerReport(): Record<string, unknown> {
    return {
      followerId: this.followerId,
      position: this._data.position.toFixed(3),
      sensitivity: this._data.sensitivity.toFixed(3),
      speed: this._data.speed.toFixed(3),
      attractant: this._data.attractant,
      distanceTraveled: this._distanceTraveled.toFixed(2),
      lastGradient: this._lastGradient.toFixed(4),
      readingCount: this._readings.length,
      plateaued: this.detectPlateau(),
    };
  }
}
