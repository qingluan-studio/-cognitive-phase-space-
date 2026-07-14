/**
 * SingularityAvoid - 奇点规避
 * 永远避开无穷大点，当状态接近奇点时施加强力排斥，
 * 防止系统在发散点崩溃。
 */

export interface SingularityAvoidData {
  readonly avoidId: string;
  singularityPosition: number;
  safeDistance: number;
  maxForce: number;
}

export interface AvoidanceResult {
  position: number;
  distance: number;
  forceApplied: number;
  avoided: boolean;
}

export class SingularityAvoid {
  private _data: SingularityAvoidData;
  private _results: AvoidanceResult[] = [];
  private _avoidanceCount: number = 0;
  private _closestApproach: number = Infinity;
  private _currentForce: number = 0;

  constructor(data: SingularityAvoidData) {
    this._data = { ...data };
  }

  get avoidId(): string {
    return this._data.avoidId;
  }

  get singularityPosition(): number {
    return this._data.singularityPosition;
  }

  get safeDistance(): number {
    return this._data.safeDistance;
  }

  public check(position: number): AvoidanceResult {
    const distance = Math.abs(position - this._data.singularityPosition);
    this._closestApproach = Math.min(this._closestApproach, distance);
    let forceApplied = 0;
    let avoided = true;
    if (distance < this._data.safeDistance) {
      const urgency = 1 - distance / this._data.safeDistance;
      forceApplied = Math.min(this._data.maxForce, urgency * this._data.maxForce * 2);
      const direction = position > this._data.singularityPosition ? 1 : -1;
      const correctedPosition = this._data.singularityPosition + direction * this._data.safeDistance;
      this._currentForce = forceApplied;
      this._avoidanceCount++;
      avoided = true;
      const result: AvoidanceResult = {
        position: correctedPosition,
        distance: this._data.safeDistance,
        forceApplied,
        avoided,
      };
      this._results.push(result);
      if (this._results.length > 40) {
        this._results.shift();
      }
      return result;
    }
    this._currentForce = 0;
    const result: AvoidanceResult = { position, distance, forceApplied, avoided };
    this._results.push(result);
    if (this._results.length > 40) {
      this._results.shift();
    }
    return result;
  }

  public setSafeDistance(distance: number): void {
    this._data.safeDistance = Math.max(0.001, distance);
  }

  public setMaxForce(force: number): void {
    this._data.maxForce = Math.max(0, force);
  }

  public relocateSingularity(newPosition: number): void {
    this._data.singularityPosition = newPosition;
    this._closestApproach = Infinity;
  }

  public computeSafetyMargin(position: number): number {
    const distance = Math.abs(position - this._data.singularityPosition);
    return distance - this._data.safeDistance;
  }

  public isInDanger(position: number): boolean {
    return this.computeSafetyMargin(position) < 0;
  }

  public tightenSafeZone(factor: number): void {
    this._data.safeDistance *= factor;
  }

  public measureVigilance(): number {
    if (this._results.length === 0) {
      return 0;
    }
    const recent = this._results.slice(-20);
    const triggered = recent.filter((r) => r.forceApplied > 0).length;
    return triggered / recent.length;
  }

  public avoidReport(): Record<string, unknown> {
    return {
      avoidId: this.avoidId,
      singularityPosition: this._data.singularityPosition,
      safeDistance: this._data.safeDistance.toFixed(4),
      maxForce: this._data.maxForce.toFixed(3),
      currentForce: this._currentForce.toFixed(3),
      avoidanceCount: this._avoidanceCount,
      closestApproach: this._closestApproach === Infinity ? 'none' : this._closestApproach.toFixed(4),
      vigilance: this.measureVigilance().toFixed(3),
      resultCount: this._results.length,
    };
  }
}
