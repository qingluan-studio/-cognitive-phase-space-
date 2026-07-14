/**
 * 神圣禁令模块：定义不可逾越的绝对命令，
 * 任何试图违反禁令的操作都会被立即阻断并记录追责。
 */

export interface Prohibition {
  id: string;
  command: string;
  description: string;
  absolute: boolean;
  violations: number;
}

export interface ProhibitionViolation {
  prohibitionId: string;
  actor: string;
  context: Record<string, unknown>;
  blockedAt: number;
}

export class SacredProhibition {
  private _prohibitions: Map<string, Prohibition> = new Map();
  private _violations: ProhibitionViolation[] = [];
  private _enforcementEnabled = true;
  private _maxViolationsBeforeLockdown = 5;

  declare(prohibition: Prohibition): void {
    this._prohibitions.set(prohibition.id, prohibition);
  }

  revoke(prohibitionId: string): boolean {
    const prohibition = this._prohibitions.get(prohibitionId);
    if (!prohibition || prohibition.absolute) return false;
    return this._prohibitions.delete(prohibitionId);
  }

  check(prohibitionId: string, actor: string, context: Record<string, unknown>): boolean {
    if (!this._enforcementEnabled) return true;
    const prohibition = this._prohibitions.get(prohibitionId);
    if (!prohibition) return true;
    const violation: ProhibitionViolation = {
      prohibitionId,
      actor,
      context,
      blockedAt: Date.now(),
    };
    this._violations.push(violation);
    if (this._violations.length > 500) this._violations.shift();
    prohibition.violations++;
    return false;
  }

  isAbsolute(prohibitionId: string): boolean {
    const prohibition = this._prohibitions.get(prohibitionId);
    return !!prohibition && prohibition.absolute;
  }

  enableEnforcement(): void {
    this._enforcementEnabled = true;
  }

  disableEnforcement(): void {
    this._enforcementEnabled = false;
  }

  shouldLockdown(): boolean {
    let totalViolations = 0;
    for (const p of this._prohibitions.values()) {
      totalViolations += p.violations;
    }
    return totalViolations >= this._maxViolationsBeforeLockdown;
  }

  resetViolations(prohibitionId: string): boolean {
    const prohibition = this._prohibitions.get(prohibitionId);
    if (!prohibition) return false;
    prohibition.violations = 0;
    return true;
  }

  getViolationsByActor(actor: string): ProhibitionViolation[] {
    return this._violations.filter(v => v.actor === actor);
  }

  listProhibitions(): Prohibition[] {
    return Array.from(this._prohibitions.values());
  }

  getViolationLog(limit: number = 50): ProhibitionViolation[] {
    return this._violations.slice(-limit);
  }

  get prohibitionCount(): number {
    return this._prohibitions.size;
  }

  get totalViolations(): number {
    return this._violations.length;
  }
}
