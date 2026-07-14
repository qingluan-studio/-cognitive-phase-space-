/**
 * LimitCyclePath - 极限环路径
 * 系统状态沿重复的周期轨道运动，无论初始条件如何最终
 * 都会收敛到同一闭合环路上，形成稳定的振荡行为。
 */

export interface LimitCyclePathData {
  readonly cycleId: string;
  centerX: number;
  centerY: number;
  radius: number;
  angularVelocity: number;
}

export interface CyclePoint {
  x: number;
  y: number;
  angle: number;
  radiusError: number;
}

export class LimitCyclePath {
  private _data: LimitCyclePathData;
  private _currentAngle: number = 0;
  private _position: { x: number; y: number };
  private _trajectory: CyclePoint[] = [];
  private _cycleCount: number = 0;
  private _lastAngle: number = 0;

  constructor(data: LimitCyclePathData, startPosition: { x: number; y: number }) {
    this._data = { ...data };
    this._position = { ...startPosition };
    this._currentAngle = Math.atan2(
      startPosition.y - data.centerY,
      startPosition.x - data.centerX
    );
    this._lastAngle = this._currentAngle;
  }

  get cycleId(): string {
    return this._data.cycleId;
  }

  get position(): Readonly<{ x: number; y: number }> {
    return this._position;
  }

  get cycleCount(): number {
    return this._cycleCount;
  }

  public advance(): CyclePoint {
    this._lastAngle = this._currentAngle;
    this._currentAngle += this._data.angularVelocity;
    const targetRadius = this._data.radius;
    const currentRadius = Math.sqrt(
      (this._position.x - this._data.centerX) ** 2 +
      (this._position.y - this._data.centerY) ** 2
    );
    const radiusCorrection = (targetRadius - currentRadius) * 0.1;
    const newRadius = currentRadius + radiusCorrection;
    this._position.x = this._data.centerX + newRadius * Math.cos(this._currentAngle);
    this._position.y = this._data.centerY + newRadius * Math.sin(this._currentAngle);
    if (this._currentAngle - this._lastAngle > 0 && this._currentAngle % (2 * Math.PI) < this._lastAngle % (2 * Math.PI)) {
      this._cycleCount++;
    }
    const point: CyclePoint = {
      x: this._position.x,
      y: this._position.y,
      angle: this._currentAngle,
      radiusError: Math.abs(newRadius - targetRadius),
    };
    this._trajectory.push(point);
    if (this._trajectory.length > 200) {
      this._trajectory.shift();
    }
    return point;
  }

  public runCycles(count: number): CyclePoint[] {
    const points: CyclePoint[] = [];
    const stepsPerCycle = Math.ceil(2 * Math.PI / this._data.angularVelocity);
    for (let i = 0; i < count * stepsPerCycle; i++) {
      points.push(this.advance());
    }
    return points;
  }

  public setAngularVelocity(velocity: number): void {
    this._data.angularVelocity = Math.max(0.001, velocity);
  }

  public resizeRadius(newRadius: number): void {
    this._data.radius = Math.max(0.01, newRadius);
  }

  public shiftCenter(dx: number, dy: number): void {
    this._data.centerX += dx;
    this._data.centerY += dy;
  }

  public perturb(magnitude: number): void {
    this._position.x += magnitude * (Math.random() - 0.5);
    this._position.y += magnitude * (Math.random() - 0.5);
  }

  public measureStability(): number {
    if (this._trajectory.length < 10) {
      return 0;
    }
    const recent = this._trajectory.slice(-10);
    const errors = recent.map((p) => p.radiusError);
    const maxError = Math.max(...errors);
    return Math.max(0, 1 - maxError / this._data.radius);
  }

  public isOnCycle(): boolean {
    return this.measureStability() > 0.9;
  }

  public cycleReport(): Record<string, unknown> {
    return {
      cycleId: this.cycleId,
      centerX: this._data.centerX.toFixed(3),
      centerY: this._data.centerY.toFixed(3),
      radius: this._data.radius.toFixed(3),
      angularVelocity: this._data.angularVelocity.toFixed(4),
      currentAngle: this._currentAngle.toFixed(3),
      position: { x: this._position.x.toFixed(3), y: this._position.y.toFixed(3) },
      cycleCount: this._cycleCount,
      trajectoryLength: this._trajectory.length,
      stability: this.measureStability().toFixed(3),
      onCycle: this.isOnCycle(),
    };
  }
}
