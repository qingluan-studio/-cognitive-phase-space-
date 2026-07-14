export interface ResourceBudget {
  cpuTicks: number;
  memoryBytes: number;
  energyUnits: number;
}

export interface SurvivalReport {
  alive: boolean;
  budgetRemaining: ResourceBudget;
  ticksSurvived: number;
  threatLevel: 'none' | 'low' | 'moderate' | 'severe' | 'critical';
  reserveRatio: number;
  efficiency: number;
}

export class MinimalViableExistence {
  private _budget: ResourceBudget;
  private _minimalBudget: ResourceBudget;
  private _ticksSurvived = 0;
  private _alive = true;
  private _heartbeatCost: ResourceBudget = { cpuTicks: 1, memoryBytes: 64, energyUnits: 1 };
  private _efficiencyHistory: number[] = [];
  private _dormant = false;
  private _dormancyThreshold = 0.5;

  constructor(initial: ResourceBudget, minimal: ResourceBudget) {
    this._budget = { ...initial };
    this._minimalBudget = { ...minimal };
  }

  heartbeat(): boolean {
    if (!this._alive) return false;
    if (this._dormant) {
      return this._dormantHeartbeat();
    }
    const cost = this._heartbeatCost;
    if (
      this._budget.cpuTicks < cost.cpuTicks ||
      this._budget.memoryBytes < cost.memoryBytes ||
      this._budget.energyUnits < cost.energyUnits
    ) {
      if (this._meetsMinimal()) {
        this._dormant = true;
        return this._dormantHeartbeat();
      }
      this._alive = false;
      return false;
    }
    this._budget.cpuTicks -= cost.cpuTicks;
    this._budget.memoryBytes -= cost.memoryBytes;
    this._budget.energyUnits -= cost.energyUnits;
    this._ticksSurvived++;
    this._recordEfficiency();
    return true;
  }

  private _dormantHeartbeat(): boolean {
    const dormantCost = {
      cpuTicks: Math.max(0, Math.floor(this._heartbeatCost.cpuTicks * 0.1)),
      memoryBytes: Math.max(0, Math.floor(this._heartbeatCost.memoryBytes * 0.1)),
      energyUnits: Math.max(0, Math.floor(this._heartbeatCost.energyUnits * 0.1)),
    };
    if (
      this._budget.cpuTicks < dormantCost.cpuTicks ||
      this._budget.energyUnits < dormantCost.energyUnits
    ) {
      this._alive = false;
      return false;
    }
    this._budget.cpuTicks -= dormantCost.cpuTicks;
    this._budget.memoryBytes -= dormantCost.memoryBytes;
    this._budget.energyUnits -= dormantCost.energyUnits;
    this._ticksSurvived++;
    if (this._reserveRatio() > this._dormancyThreshold * 2) {
      this._dormant = false;
    }
    return true;
  }

  replenish(resource: Partial<ResourceBudget>): void {
    if (resource.cpuTicks) this._budget.cpuTicks += resource.cpuTicks;
    if (resource.memoryBytes) this._budget.memoryBytes += resource.memoryBytes;
    if (resource.energyUnits) this._budget.energyUnits += resource.energyUnits;
    if (!this._alive && this._meetsMinimal()) {
      this._alive = true;
      this._dormant = false;
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
      reserveRatio: this._reserveRatio(),
      efficiency: this._currentEfficiency(),
    };
  }

  get isAlive(): boolean { return this._alive; }
  get isDormant(): boolean { return this._dormant; }
  get ticksSurvived(): number { return this._ticksSurvived; }

  private _reserveRatio(): number {
    const remaining = this._budget.cpuTicks + this._budget.memoryBytes + this._budget.energyUnits;
    const minimal = this._minimalBudget.cpuTicks + this._minimalBudget.memoryBytes + this._minimalBudget.energyUnits;
    return remaining / Math.max(1, minimal);
  }

  private _assessThreat(): SurvivalReport['threatLevel'] {
    if (!this._alive) return 'critical';
    const ratio = this._reserveRatio();
    if (ratio < 0.5) return 'critical';
    if (ratio < 1) return 'severe';
    if (ratio < 2) return 'moderate';
    if (ratio < 4) return 'low';
    return 'none';
  }

  private _recordEfficiency(): void {
    const minimalTotal = this._minimalBudget.cpuTicks + this._minimalBudget.memoryBytes + this._minimalBudget.energyUnits;
    const remainingTotal = this._budget.cpuTicks + this._budget.memoryBytes + this._budget.energyUnits;
    const efficiency = remainingTotal / Math.max(1, minimalTotal + remainingTotal);
    this._efficiencyHistory.push(efficiency);
    if (this._efficiencyHistory.length > 64) this._efficiencyHistory.shift();
  }

  private _currentEfficiency(): number {
    if (this._efficiencyHistory.length === 0) return 0;
    return this._efficiencyHistory.reduce((s, v) => s + v, 0) / this._efficiencyHistory.length;
  }

  private _meetsMinimal(): boolean {
    return (
      this._budget.cpuTicks >= this._minimalBudget.cpuTicks &&
      this._budget.memoryBytes >= this._minimalBudget.memoryBytes &&
      this._budget.energyUnits >= this._minimalBudget.energyUnits
    );
  }
}
