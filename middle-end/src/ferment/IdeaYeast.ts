export interface YeastColony {
  id: string;
  population: number;
  carryingCapacity: number;
  growthRate: number;
  lagPhaseDuration: number;
  age: number;
}

export interface GrowthSnapshot {
  colonyId: string;
  population: number;
  growthRate: number;
  nutrientAvailability: number;
  timestamp: number;
}

export class IdeaYeast {
  private _colonies: Map<string, YeastColony> = new Map();
  private _snapshots: GrowthSnapshot[] = [];
  private _nutrientPool: number = 1000;
  private _nutrientConsumptionRate: number = 0.1;
  private _gompertzAsymptote: number = 1;
  private _gompertzDecay: number = 0.1;
  private _gompertzDisplacement: number = 1;
  private _state: Record<string, unknown> = {};
  private _diversityIndex: number = 0;

  get colonyCount(): number {
    return this._colonies.size;
  }

  get totalPopulation(): number {
    let sum = 0;
    for (const c of this._colonies.values()) sum += c.population;
    return sum;
  }

  get diversityIndex(): number {
    return this._diversityIndex;
  }

  inoculate(id: string, initialPopulation: number, carryingCapacity: number, growthRate: number, lagPhase: number = 0): YeastColony {
    const colony: YeastColony = {
      id,
      population: initialPopulation,
      carryingCapacity,
      growthRate,
      lagPhaseDuration: lagPhase,
      age: 0,
    };
    this._colonies.set(id, colony);
    this._updateDiversityIndex();
    return colony;
  }

  private _updateDiversityIndex(): void {
    const total = this.totalPopulation;
    if (total === 0) {
      this._diversityIndex = 0;
      return;
    }
    let shannon = 0;
    for (const c of this._colonies.values()) {
      const p = c.population / total;
      if (p > 0) shannon -= p * Math.log2(p);
    }
    this._diversityIndex = shannon;
  }

  step(dt: number = 1): GrowthSnapshot[] {
    const snaps: GrowthSnapshot[] = [];
    for (const colony of this._colonies.values()) {
      colony.age += dt;
      let nutrientAvailability = this._nutrientPool / (this._colonies.size * 100);
      nutrientAvailability = Math.max(0, Math.min(1, nutrientAvailability));
      let effectiveRate = 0;
      if (colony.age > colony.lagPhaseDuration) {
        const logistic = colony.growthRate * colony.population * (1 - colony.population / colony.carryingCapacity);
        const gompertz = colony.carryingCapacity * Math.exp(-this._gompertzDecay * Math.exp(-this._gompertzAsymptote * (colony.age - this._gompertzDisplacement)));
        effectiveRate = (logistic + gompertz * 0.01) * nutrientAvailability;
      }
      colony.population += effectiveRate * dt;
      colony.population = Math.max(0, Math.min(colony.carryingCapacity * 2, colony.population));
      this._nutrientPool -= colony.population * this._nutrientConsumptionRate * dt;
      this._nutrientPool = Math.max(0, this._nutrientPool);
      const snapshot: GrowthSnapshot = {
        colonyId: colony.id,
        population: colony.population,
        growthRate: effectiveRate,
        nutrientAvailability,
        timestamp: Date.now(),
      };
      this._snapshots.push(snapshot);
      if (this._snapshots.length > 200) this._snapshots.shift();
      snaps.push(snapshot);
    }
    this._updateDiversityIndex();
    return snaps;
  }

  addNutrient(amount: number): void {
    this._nutrientPool += amount;
  }

  setConsumptionRate(rate: number): void {
    this._nutrientConsumptionRate = Math.max(0, rate);
  }

  setGompertzParameters(asymptote: number, decay: number, displacement: number): void {
    this._gompertzAsymptote = asymptote;
    this._gompertzDecay = decay;
    this._gompertzDisplacement = displacement;
  }

  getColony(id: string): YeastColony | null {
    return this._colonies.get(id) ?? null;
  }

  dominantColony(): YeastColony | null {
    let dominant: YeastColony | null = null;
    for (const c of this._colonies.values()) {
      if (!dominant || c.population > dominant.population) dominant = c;
    }
    return dominant;
  }

  averagePopulation(): number {
    if (this._colonies.size === 0) return 0;
    return this.totalPopulation / this._colonies.size;
  }

  getSnapshots(limit: number = 50): GrowthSnapshot[] {
    return this._snapshots.slice(-limit);
  }

  carryingCapacityUtilization(): number {
    let totalCapacity = 0;
    for (const c of this._colonies.values()) totalCapacity += c.carryingCapacity;
    if (totalCapacity === 0) return 0;
    return this.totalPopulation / totalCapacity;
  }

  isNutrientDepleted(): boolean {
    return this._nutrientPool < 1;
  }

  extinctionRisk(): number {
    const depleted = Array.from(this._colonies.values()).filter(c => c.population < 1).length;
    return this._colonies.size > 0 ? depleted / this._colonies.size : 0;
  }

  clear(): void {
    this._colonies.clear();
    this._snapshots = [];
    this._nutrientPool = 1000;
    this._diversityIndex = 0;
  }

  yeastReport(): Record<string, unknown> {
    return {
      colonyCount: this._colonies.size,
      totalPopulation: this.totalPopulation.toFixed(2),
      averagePopulation: this.averagePopulation().toFixed(2),
      diversityIndex: this._diversityIndex.toFixed(4),
      nutrientPool: this._nutrientPool.toFixed(2),
      carryingCapacityUtilization: this.carryingCapacityUtilization().toFixed(4),
      extinctionRisk: this.extinctionRisk().toFixed(4),
      nutrientDepleted: this.isNutrientDepleted(),
      state: this._state,
    };
  }
}
