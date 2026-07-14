/**
 * EscapeVelocity - 逃逸速度
 * 脱离吸引子引力束缚所需的最小速度，低于此速度将被
 * 拉回吸引子，高于此速度则能逃逸到无穷远。
 */

export interface EscapeVelocityData {
  readonly escapeId: string;
  attractorMass: number;
  gravitationalConstant: number;
  currentDistance: number;
}

export interface EscapeAttempt {
  velocity: number;
  required: number;
  escaped: boolean;
  trajectoryType: 'escape' | 'bound' | 'circular';
}

export class EscapeVelocity {
  private _data: EscapeVelocityData;
  private _attempts: EscapeAttempt[] = [];
  private _successfulEscapes: number = 0;
  private _failedEscapes: number = 0;
  private _currentVelocity: number = 0;

  constructor(data: EscapeVelocityData) {
    this._data = { ...data };
  }

  get escapeId(): string {
    return this._data.escapeId;
  }

  get currentDistance(): number {
    return this._data.currentDistance;
  }

  public computeRequiredVelocity(): number {
    return Math.sqrt(
      (2 * this._data.gravitationalConstant * this._data.attractorMass) /
        Math.max(0.001, this._data.currentDistance)
    );
  }

  public attemptEscape(velocity: number): EscapeAttempt {
    this._currentVelocity = velocity;
    const required = this.computeRequiredVelocity();
    let escaped: boolean;
    let trajectoryType: 'escape' | 'bound' | 'circular';
    if (velocity > required * 1.05) {
      escaped = true;
      trajectoryType = 'escape';
      this._successfulEscapes++;
    } else if (velocity < required * 0.95) {
      escaped = false;
      trajectoryType = 'bound';
      this._failedEscapes++;
    } else {
      escaped = false;
      trajectoryType = 'circular';
    }
    const attempt: EscapeAttempt = { velocity, required, escaped, trajectoryType };
    this._attempts.push(attempt);
    if (this._attempts.length > 40) {
      this._attempts.shift();
    }
    return attempt;
  }

  public setVelocity(velocity: number): void {
    this._currentVelocity = Math.max(0, velocity);
  }

  public changeDistance(newDistance: number): void {
    this._data.currentDistance = Math.max(0.001, newDistance);
  }

  public adjustMass(delta: number): void {
    this._data.attractorMass = Math.max(0.001, this._data.attractorMass + delta);
  }

  public boost(delta: number): number {
    this._currentVelocity += delta;
    return this._currentVelocity;
  }

  public computeOrbitalVelocity(): number {
    return Math.sqrt(
      (this._data.gravitationalConstant * this._data.attractorMass) /
        Math.max(0.001, this._data.currentDistance)
    );
  }

  public marginToEscape(): number {
    return this._currentVelocity - this.computeRequiredVelocity();
  }

  public willEscape(velocity: number): boolean {
    return velocity >= this.computeRequiredVelocity();
  }

  public escapeReport(): Record<string, unknown> {
    return {
      escapeId: this.escapeId,
      attractorMass: this._data.attractorMass.toFixed(3),
      gravitationalConstant: this._data.gravitationalConstant.toFixed(4),
      currentDistance: this._data.currentDistance.toFixed(3),
      currentVelocity: this._currentVelocity.toFixed(3),
      requiredEscapeVelocity: this.computeRequiredVelocity().toFixed(3),
      orbitalVelocity: this.computeOrbitalVelocity().toFixed(3),
      marginToEscape: this.marginToEscape().toFixed(3),
      successfulEscapes: this._successfulEscapes,
      failedEscapes: this._failedEscapes,
      attemptCount: this._attempts.length,
    };
  }
}
