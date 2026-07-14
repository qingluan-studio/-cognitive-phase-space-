/**
 * 梦境轨迹：在梦中走过的路径会改变现实。
 * 梦中行走的路径被记录，并在清醒后映射为现实状态的修改。
 */

export interface DreamStep {
  id: string;
  position: { x: number; y: number };
  action: string;
  timestamp: number;
}

export interface RealityShift {
  dreamPathId: string;
  field: string;
  delta: number;
  appliedAt: number;
}

export class DreamingTrack {
  private _paths: Map<string, DreamStep[]> = new Map();
  private _shifts: RealityShift[] = [];
  private _realityState: Map<string, number> = new Map();
  private _conversionRate = 0.1;

  startPath(id: string): void {
    this._paths.set(id, []);
  }

  step(pathId: string, step: Omit<DreamStep, 'id' | 'timestamp'>): DreamStep | null {
    const path = this._paths.get(pathId);
    if (!path) return null;
    const fullStep: DreamStep = {
      id: `step-${pathId}-${path.length}`,
      timestamp: Date.now(),
      ...step,
    };
    path.push(fullStep);
    return fullStep;
  }

  wakeAndApply(pathId: string): RealityShift[] {
    const path = this._paths.get(pathId);
    if (!path) return [];
    const shifts: RealityShift[] = [];
    for (const step of path) {
      const field = `field-${Math.floor(step.position.x)}-${Math.floor(step.position.y)}`;
      const current = this._realityState.get(field) ?? 0;
      const delta = step.action.length * this._conversionRate;
      this._realityState.set(field, current + delta);
      shifts.push({
        dreamPathId: pathId,
        field,
        delta,
        appliedAt: Date.now(),
      });
    }
    this._shifts.push(...shifts);
    if (this._shifts.length > 500) this._shifts.splice(0, this._shifts.length - 500);
    return shifts;
  }

  setConversionRate(value: number): void {
    this._conversionRate = Math.max(0, value);
  }

  getRealityValue(field: string): number {
    return this._realityState.get(field) ?? 0;
  }

  getPath(pathId: string): DreamStep[] | null {
    const path = this._paths.get(pathId);
    return path ? [...path] : null;
  }

  getShifts(limit: number = 50): RealityShift[] {
    return this._shifts.slice(-limit);
  }

  get pathCount(): number {
    return this._paths.size;
  }
}
