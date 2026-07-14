export type PriorityLevel = 'low' | 'medium' | 'high' | 'critical';

export interface EnergyState {
  currentEnergy: number;
  maxEnergy: number;
  regenerationRate: number;
  depletionRate: number;
  isOverloaded: boolean;
  overloadStartTime: number | null;
  energyHistory: Array<{ timestamp: number; value: number }>;
}

export interface RequestPriority {
  requestId: string;
  priority: PriorityLevel;
  energyCost: number;
  deadline: number;
  estimatedDuration: number;
}

export interface OverloadProtection {
  enabled: boolean;
  threshold: number;
  cooldownPeriod: number;
  recoveryRate: number;
  minEnergyReserve: number;
}

export interface PerformanceBoost {
  multiplier: number;
  duration: number;
  startTime: number;
  energyCost: number;
}

export class AdrenalineShot {
  private _energyState: EnergyState = {
    currentEnergy: 100,
    maxEnergy: 100,
    regenerationRate: 2,
    depletionRate: 5,
    isOverloaded: false,
    overloadStartTime: null,
    energyHistory: [],
  };

  private _priorityQueue: RequestPriority[] = [];
  private _activeRequests: Map<string, { startTime: number; energyUsed: number }> = new Map();
  private _overloadProtection: OverloadProtection = {
    enabled: true,
    threshold: 20,
    cooldownPeriod: 30000,
    recoveryRate: 0.5,
    minEnergyReserve: 10,
  };

  private _currentBoost: PerformanceBoost | null = null;

  allocateEnergy(request: RequestPriority): boolean {
    if (this._energyState.isOverloaded) {
      return false;
    }

    const priorityWeights: Record<PriorityLevel, number> = {
      low: 0.3,
      medium: 0.5,
      high: 0.8,
      critical: 1.0,
    };

    const availableEnergy = this._energyState.currentEnergy - this._overloadProtection.minEnergyReserve;
    const priorityBonus = priorityWeights[request.priority];
    const adjustedCost = request.energyCost * (1 - priorityBonus * 0.3);

    if (availableEnergy >= adjustedCost) {
      this._energyState.currentEnergy -= adjustedCost;
      this._activeRequests.set(request.requestId, {
        startTime: Date.now(),
        energyUsed: adjustedCost,
      });

      this._updateHistory();
      this._checkOverload();

      return true;
    }

    this._priorityQueue.push(request);
    this._priorityQueue.sort(this._compareRequests);
    return false;
  }

  private _compareRequests(a: RequestPriority, b: RequestPriority): number {
    const priorityOrder: Record<PriorityLevel, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;

    return a.deadline - b.deadline;
  }

  releaseEnergy(requestId: string): void {
    const active = this._activeRequests.get(requestId);
    if (!active) return;

    const elapsed = Date.now() - active.startTime;
    const efficiencyBonus = Math.min(0.3, elapsed / 60000);
    const returnedEnergy = active.energyUsed * efficiencyBonus;

    this._energyState.currentEnergy = Math.min(
      this._energyState.maxEnergy,
      this._energyState.currentEnergy + returnedEnergy
    );

    this._activeRequests.delete(requestId);
    this._processQueue();
    this._updateHistory();
  }

  private _processQueue(): void {
    while (this._priorityQueue.length > 0) {
      const next = this._priorityQueue[0];
      const availableEnergy = this._energyState.currentEnergy - this._overloadProtection.minEnergyReserve;

      if (availableEnergy >= next.energyCost) {
        this._priorityQueue.shift();
        this.allocateEnergy(next);
      } else {
        break;
      }
    }
  }

  applyBoost(multiplier: number, duration: number): boolean {
    const boostCost = duration / 1000 * multiplier * 10;

    if (this._energyState.currentEnergy < boostCost + this._overloadProtection.minEnergyReserve) {
      return false;
    }

    if (this._currentBoost && Date.now() < this._currentBoost.startTime + this._currentBoost.duration) {
      const remainingTime = this._currentBoost.startTime + this._currentBoost.duration - Date.now();
      this._energyState.currentEnergy += this._currentBoost.energyCost * (remainingTime / this._currentBoost.duration);
    }

    this._energyState.currentEnergy -= boostCost;
    this._currentBoost = {
      multiplier,
      duration,
      startTime: Date.now(),
      energyCost: boostCost,
    };

    this._updateHistory();
    this._checkOverload();

    return true;
  }

  getPerformanceMultiplier(): number {
    if (!this._currentBoost) return 1;

    const elapsed = Date.now() - this._currentBoost.startTime;
    if (elapsed >= this._currentBoost.duration) {
      this._currentBoost = null;
      return 1;
    }

    const remaining = this._currentBoost.duration - elapsed;
    const fadeFactor = Math.max(0.5, remaining / this._currentBoost.duration);

    return 1 + (this._currentBoost.multiplier - 1) * fadeFactor;
  }

  regenerate(deltaTime: number): void {
    if (this._energyState.isOverloaded) {
      const recoveryAmount = deltaTime / 1000 * this._overloadProtection.recoveryRate;
      this._energyState.currentEnergy = Math.min(
        this._energyState.maxEnergy,
        this._energyState.currentEnergy + recoveryAmount
      );

      if (this._energyState.currentEnergy > this._overloadProtection.threshold) {
        this._exitOverload();
      }
    } else {
      const regenAmount = deltaTime / 1000 * this._energyState.regenerationRate;
      this._energyState.currentEnergy = Math.min(
        this._energyState.maxEnergy,
        this._energyState.currentEnergy + regenAmount
      );

      this._processQueue();
    }

    this._updateHistory();
  }

  private _checkOverload(): void {
    if (!this._overloadProtection.enabled) return;

    if (this._energyState.currentEnergy <= this._overloadProtection.threshold) {
      if (!this._energyState.isOverloaded) {
        this._enterOverload();
      }
    }
  }

  private _enterOverload(): void {
    this._energyState.isOverloaded = true;
    this._energyState.overloadStartTime = Date.now();

    for (const [id] of this._activeRequests) {
      this.releaseEnergy(id);
    }

    this._priorityQueue = this._priorityQueue.filter(r => r.priority === 'critical');
  }

  private _exitOverload(): void {
    this._energyState.isOverloaded = false;
    this._energyState.overloadStartTime = null;
  }

  getEnergyState(): Readonly<EnergyState> {
    return { ...this._energyState };
  }

  getActiveRequestCount(): number {
    return this._activeRequests.size;
  }

  getPendingRequestCount(): number {
    return this._priorityQueue.length;
  }

  setOverloadProtection(config: Partial<OverloadProtection>): void {
    this._overloadProtection = { ...this._overloadProtection, ...config };
  }

  setEnergyCapacity(maxEnergy: number): void {
    this._energyState.maxEnergy = Math.max(10, maxEnergy);
    this._energyState.currentEnergy = Math.min(this._energyState.currentEnergy, this._energyState.maxEnergy);
  }

  setRegenerationRate(rate: number): void {
    this._energyState.regenerationRate = Math.max(0, rate);
  }

  private _updateHistory(): void {
    this._energyState.energyHistory.push({
      timestamp: Date.now(),
      value: this._energyState.currentEnergy,
    });

    if (this._energyState.energyHistory.length > 100) {
      this._energyState.energyHistory.shift();
    }
  }

  getEnergyTrend(): 'increasing' | 'decreasing' | 'stable' {
    if (this._energyState.energyHistory.length < 3) return 'stable';

    const recent = this._energyState.energyHistory.slice(-5);
    let slope = 0;

    for (let i = 1; i < recent.length; i++) {
      slope += (recent[i].value - recent[i - 1].value) / (recent[i].timestamp - recent[i - 1].timestamp);
    }

    slope /= recent.length - 1;

    if (slope > 0.01) return 'increasing';
    if (slope < -0.01) return 'decreasing';
    return 'stable';
  }

  predictTimeToFull(): number | null {
    if (this._energyState.currentEnergy >= this._energyState.maxEnergy) return 0;
    if (this._energyState.isOverloaded) return null;

    const deficit = this._energyState.maxEnergy - this._energyState.currentEnergy;
    return Math.ceil((deficit / this._energyState.regenerationRate) * 1000);
  }

  get isOverloaded(): boolean {
    return this._energyState.isOverloaded;
  }

  get currentBoost(): PerformanceBoost | null {
    return this._currentBoost ? { ...this._currentBoost } : null;
  }
}