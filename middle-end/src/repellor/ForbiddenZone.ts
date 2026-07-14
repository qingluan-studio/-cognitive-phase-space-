/**
 * ForbiddenZone - 禁区
 * 状态空间中绝对不可进入的区域，任何尝试进入的操作
 * 都会被立即拒绝并触发警报。
 */

export interface ForbiddenZoneData {
  readonly zoneId: string;
  boundaries: { minX: number; maxX: number; minY: number; maxY: number };
  severity: number;
  violations: number;
}

export interface ZoneCheck {
  position: { x: number; y: number };
  inside: boolean;
  violated: boolean;
  distanceToEdge: number;
}

export class ForbiddenZone {
  private _data: ForbiddenZoneData;
  private _checks: ZoneCheck[] = [];
  private _violationLog: number[] = [];
  private _lockdown: boolean = false;
  private _warningCount: number = 0;

  constructor(data: ForbiddenZoneData) {
    this._data = { ...data, boundaries: { ...data.boundaries } };
  }

  get zoneId(): string {
    return this._data.zoneId;
  }

  get boundaries(): Readonly<{ minX: number; maxX: number; minY: number; maxY: number }> {
    return this._data.boundaries;
  }

  get severity(): number {
    return this._data.severity;
  }

  get isLockedDown(): boolean {
    return this._lockdown;
  }

  public check(position: { x: number; y: number }): ZoneCheck {
    const b = this._data.boundaries;
    const inside =
      position.x >= b.minX && position.x <= b.maxX &&
      position.y >= b.minY && position.y <= b.maxY;
    const violated = inside;
    let distanceToEdge = 0;
    if (inside) {
      distanceToEdge = Math.min(
        position.x - b.minX,
        b.maxX - position.x,
        position.y - b.minY,
        b.maxY - position.y
      );
    } else {
      const dx = Math.max(b.minX - position.x, 0, position.x - b.maxX);
      const dy = Math.max(b.minY - position.y, 0, position.y - b.maxY);
      distanceToEdge = Math.sqrt(dx * dx + dy * dy);
    }
    if (violated) {
      this._data.violations++;
      this._violationLog.push(Date.now());
      if (this._data.severity > 0.8) {
        this._lockdown = true;
      }
    } else if (distanceToEdge < 1) {
      this._warningCount++;
    }
    const check: ZoneCheck = { position: { ...position }, inside, violated, distanceToEdge };
    this._checks.push(check);
    if (this._checks.length > 50) {
      this._checks.shift();
    }
    return check;
  }

  public expandZone(delta: number): void {
    this._data.boundaries.minX -= delta;
    this._data.boundaries.maxX += delta;
    this._data.boundaries.minY -= delta;
    this._data.boundaries.maxY += delta;
  }

  public shrinkZone(delta: number): void {
    this._data.boundaries.minX += delta;
    this._data.boundaries.maxX -= delta;
    this._data.boundaries.minY += delta;
    this._data.boundaries.maxY -= delta;
  }

  public setSeverity(severity: number): void {
    this._data.severity = Math.max(0, Math.min(1, severity));
  }

  public liftLockdown(): void {
    this._lockdown = false;
  }

  public relocateZone(boundaries: { minX: number; maxX: number; minY: number; maxY: number }): void {
    this._data.boundaries = { ...boundaries };
  }

  public computeArea(): number {
    const b = this._data.boundaries;
    return Math.abs((b.maxX - b.minX) * (b.maxY - b.minY));
  }

  public isApproaching(position: { x: number; y: number }, threshold: number): boolean {
    const check = this.check(position);
    return !check.inside && check.distanceToEdge < threshold;
  }

  public zoneReport(): Record<string, unknown> {
    return {
      zoneId: this.zoneId,
      boundaries: this._data.boundaries,
      area: this.computeArea().toFixed(2),
      severity: this._data.severity.toFixed(3),
      violations: this._data.violations,
      warnings: this._warningCount,
      lockedDown: this._lockdown,
      checkCount: this._checks.length,
    };
  }
}
