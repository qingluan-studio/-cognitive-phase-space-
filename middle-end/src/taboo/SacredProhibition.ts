export interface Prohibition {
  id: string;
  command: string;
  description: string;
  absolute: boolean;
  violations: number;
  weight: number;
}

export interface ProhibitionViolation {
  prohibitionId: string;
  actor: string;
  context: Record<string, unknown>;
  blockedAt: number;
  severity: number;
}

export class SacredProhibition {
  private _prohibitions: Map<string, Prohibition> = new Map();
  private _violations: ProhibitionViolation[] = [];
  private _enforcementEnabled = true;
  private _maxViolationsBeforeLockdown = 5;
  private _actorScores: Map<string, number> = new Map();
  private _lockdownActive = false;

  declare(prohibition: Prohibition): void {
    const normalized: Prohibition = { ...prohibition, weight: prohibition.weight ?? 1 };
    this._prohibitions.set(prohibition.id, normalized);
  }

  revoke(prohibitionId: string): boolean {
    const prohibition = this._prohibitions.get(prohibitionId);
    if (!prohibition || prohibition.absolute) return false;
    return this._prohibitions.delete(prohibitionId);
  }

  private _computeSeverity(prohibition: Prohibition, actor: string): number {
    const base = prohibition.absolute ? 1.0 : 0.5;
    const actorScore = this._actorScores.get(actor) ?? 0;
    const recidivism = Math.min(1, actorScore * 0.1);
    return Math.min(1, base * prohibition.weight * 0.7 + recidivism * 0.3);
  }

  check(prohibitionId: string, actor: string, context: Record<string, unknown>): boolean {
    if (!this._enforcementEnabled || this._lockdownActive) return false;
    const prohibition = this._prohibitions.get(prohibitionId);
    if (!prohibition) return true;
    const severity = this._computeSeverity(prohibition, actor);
    const violation: ProhibitionViolation = {
      prohibitionId,
      actor,
      context: { ...context },
      blockedAt: Date.now(),
      severity,
    };
    this._violations.push(violation);
    if (this._violations.length > 500) this._violations.shift();
    prohibition.violations++;
    this._actorScores.set(actor, (this._actorScores.get(actor) ?? 0) + 1);
    if (this._detectLockdownNeeded()) this._lockdownActive = true;
    return false;
  }

  private _detectLockdownNeeded(): boolean {
    let totalViolations = 0;
    let highSeverityCount = 0;
    for (const p of this._prohibitions.values()) totalViolations += p.violations;
    for (const v of this._violations) if (v.severity > 0.7) highSeverityCount++;
    return totalViolations >= this._maxViolationsBeforeLockdown || highSeverityCount >= 3;
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
    return this._lockdownActive;
  }

  liftLockdown(): boolean {
    if (!this._lockdownActive) return false;
    this._lockdownActive = false;
    return true;
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

  computeActorRisk(actor: string): number {
    const score = this._actorScores.get(actor) ?? 0;
    return Math.min(1, score / 10);
  }

  listProhibitions(): Prohibition[] {
    return Array.from(this._prohibitions.values());
  }

  getViolationLog(limit: number = 50): ProhibitionViolation[] {
    return this._violations.slice(-limit);
  }

  measureEnforcementStrictness(): number {
    if (this._prohibitions.size === 0) return 0;
    let sum = 0;
    for (const p of this._prohibitions.values()) {
      sum += (p.absolute ? 1 : 0.5) * p.weight;
    }
    return Math.min(1, sum / this._prohibitions.size);
  }

  get prohibitionCount(): number {
    return this._prohibitions.size;
  }

  get totalViolations(): number {
    return this._violations.length;
  }

  get isLockdownActive(): boolean {
    return this._lockdownActive;
  }
}
