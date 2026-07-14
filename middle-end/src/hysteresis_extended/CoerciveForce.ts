/**
 * 矫顽力模块：描述消除已有磁化记忆所需施加的反向外力。
 * 用于量化历史痕迹的稳固程度，并评估擦除成本。
 */

export interface CoerciveData {
  forwardField: number;
  reverseField: number;
  coercivity: number;
}

export type CoercionResult = {
  required: number;
  achieved: boolean;
  residual: number;
};

export interface CoerciveProfile {
  maxCoercivity: number;
  sensitivity: number;
  temperatureFactor: number;
}

export class CoerciveForce {
  private _profile: CoerciveProfile;
  private _measurements: CoerciveData[] = [];
  private _appliedForce: number = 0;
  private _erasureLog: Record<string, unknown> = {};

  constructor(profile: CoerciveProfile) {
    this._profile = profile;
  }

  get appliedForce(): number {
    return this._appliedForce;
  }

  get measurementCount(): number {
    return this._measurements.length;
  }

  get currentCoercivity(): number {
    if (this._measurements.length === 0) return 0;
    return this._measurements[this._measurements.length - 1].coercivity;
  }

  measure(forward: number, reverse: number): CoerciveData {
    const coercivity = Math.abs(reverse) * this._profile.sensitivity;
    const data: CoerciveData = { forwardField: forward, reverseField: reverse, coercivity };
    this._measurements.push(data);
    return data;
  }

  applyReverseForce(force: number): CoercionResult {
    this._appliedForce = force;
    const required = this.currentCoercivity * this._profile.temperatureFactor;
    const achieved = Math.abs(force) >= required;
    const residual = Math.max(0, required - Math.abs(force));
    this._erasureLog.lastAttempt = { force, required, achieved, residual };
    return { required, achieved, residual };
  }

  estimateErasureCost(): number {
    const base = this.currentCoercivity;
    return base * this._profile.maxCoercivity * this._profile.temperatureFactor;
  }

  tuneSensitivity(factor: number): void {
    this._profile = { ...this._profile, sensitivity: this._profile.sensitivity * factor };
  }

  averageCoercivity(): number {
    if (this._measurements.length === 0) return 0;
    const sum = this._measurements.reduce((acc, m) => acc + m.coercivity, 0);
    return sum / this._measurements.length;
  }

  summary(): Record<string, unknown> {
    return {
      appliedForce: this._appliedForce,
      currentCoercivity: this.currentCoercivity,
      average: this.averageCoercivity(),
      erasureCost: this.estimateErasureCost(),
      log: this._erasureLog,
    };
  }
}
