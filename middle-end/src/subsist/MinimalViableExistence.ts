/**
 * 最小可行存在：以最低资源维持存在感。
 * 在极度资源受限的环境中，仅保留必要的心跳和最基本的状态以维持"在场"。
 */

export interface ResourceBudget {
  cpuTicks: number;
  memoryBytes: number;
  energyUnits: number;
}

export interface SurvivalReport {
  alive: boolean;
  budgetRemaining: ResourceBudget;
  ticksSurvived: number;
  threatLevel: 'none' | 'low' | 'moderate' | 'severe';
}

export class MinimalViableExistence {
  private _budget: ResourceBudget;
  private _minimalBudget: ResourceBudget;
  private _ticksSurvived = 0;
  private _alive = true;
  private _heartbeatCost = { cpuTicks: 1, memoryBytes: 64, energyUnits: 1 };

  constructor(initial: ResourceBudget, minimal: ResourceBudget) {
    this._budget = { ...initial };
    this._minimalBudget = { ...minimal };
  }

  heartbeat(): boolean {
    if (!this._alive) return false;
    const cost = this._heartbeatCost;
    if (
      this._budget.cpuTicks < cost.cpuTicks ||
      this._budget.memoryBytes < cost.memoryBytes ||
      this._budget.energyUnits < cost.energyUnits
    ) {
      this._alive = false;
      return false;
    }
    this._budget.cpuTicks -= cost.cpuTicks;
    this._budget.memoryBytes -= cost.memoryBytes;
    this._budget.energyUnits -= cost.energyUnits;
    this._ticksSurvived++;
    return true;
  }

  replenish(resource: Partial<ResourceBudget>): void {
    if (resource.cpuTicks) this._budget.cpuTicks += resource.cpuTicks;
    if (resource.memoryBytes) this._budget.memoryBytes += resource.memoryBytes;
    if (resource.energyUnits) this._budget.energyUnits += resource.energyUnits;
    if (!this._alive && this._meetsMinimal()) {
      this._alive = true;
    }
  }

  reduceHeartbeatCost(factor: number): void {
    this._heartbeatCost = {
      cpuTicks: Math.max(0, Math.floor(this._heartbeatCost.cpuTicks * factor)),
      memoryBytes: Math.max(0, Math.floor(this._heartbeatCost.memoryBytes * factor)),
      energyUnits: Math.max(0, Math.floor(this._heartbeatCost.energyUnits * factor)),
    };
  }

  getReport(): SurvivalReport {
    return {
      alive: this._alive,
      budgetRemaining: { ...this._budget },
      ticksSurvived: this._ticksSurvived,
      threatLevel: this._assessThreat(),
    };
  }

  private _assessThreat(): SurvivalReport['threatLevel'] {
    if (!this._alive) return 'severe';
    const minimalTotal = this._minimalBudget.cpuTicks + this._minimalBudget.memoryBytes + this._minimalBudget.energyUnits;
    const remainingTotal = this._budget.cpuTicks + this._budget.memoryBytes + this._budget.energyUnits;
    const ratio = remainingTotal / Math.max(1, minimalTotal);
    if (ratio < 1) return 'severe';
    if (ratio < 2) return 'moderate';
    if (ratio < 4) return 'low';
    return 'none';
  }

  private _meetsMinimal(): boolean {
    return (
      this._budget.cpuTicks >= this._minimalBudget.cpuTicks &&
      this._budget.memoryBytes >= this._minimalBudget.memoryBytes &&
      this._budget.energyUnits >= this._minimalBudget.energyUnits
    );
  }

  get isAlive(): boolean {
    return this._alive;
  }

  get ticksSurvived(): number {
    return this._ticksSurvived;
  }
}
