export interface KleptoplastidyData {
  readonly kleptoplastId: string;
  hostId: string;
  retentionDays: number;
  functionalCapacity: number;
  stolenOrganelles: string[];
}

export interface StolenFunction {
  name: string;
  source: string;
  efficiency: number;
  degrading: boolean;
  halflife: number;
}

export class Kleptoplastidy {
  private _data: KleptoplastidyData;
  private _stolenFunctions: Map<string, StolenFunction> = new Map();
  private _usageCount: number = 0;
  private _degradationRate: number = 0.01;
  private _integrationScore: number = 0;
  private _exponentialDecay: number = 0.693;
  private _viabilityModel: number[] = [];

  constructor(data: KleptoplastidyData) {
    this._data = { ...data, stolenOrganelles: [...data.stolenOrganelles] };
  }

  get kleptoplastId(): string {
    return this._data.kleptoplastId;
  }

  get hostId(): string {
    return this._data.hostId;
  }

  get functionalCapacity(): number {
    return this._data.functionalCapacity;
  }

  get integrationScore(): number {
    return this._integrationScore;
  }

  public stealFunction(name: string, source: string, baseEfficiency: number): boolean {
    if (this._stolenFunctions.size >= 10) {
      return false;
    }
    const halflife = baseEfficiency > 0 ? -Math.log(0.5) / (this._degradationRate * baseEfficiency) : 100;
    const fn: StolenFunction = {
      name,
      source,
      efficiency: baseEfficiency * 0.7,
      degrading: false,
      halflife,
    };
    this._stolenFunctions.set(name, fn);
    this._data.stolenOrganelles.push(name);
    this._data.functionalCapacity = Math.min(1, this._data.functionalCapacity + 0.1);
    this._updateViabilityModel();
    return true;
  }

  private _updateViabilityModel(): void {
    this._viabilityModel = Array.from(this._stolenFunctions.values()).map((fn) =>
      Math.exp(-this._exponentialDecay * this._usageCount / (fn.halflife || 1))
    );
  }

  public useStolenFunction(name: string): number {
    const fn = this._stolenFunctions.get(name);
    if (!fn) {
      return 0;
    }
    this._usageCount++;
    const decayFactor = Math.exp(-this._exponentialDecay * this._usageCount / (fn.halflife || 1));
    const output = fn.efficiency * decayFactor;
    this._degradeFunction(fn);
    this._updateViabilityModel();
    return Math.max(0, output);
  }

  private _degradeFunction(fn: StolenFunction): void {
    fn.efficiency = Math.max(0, fn.efficiency - this._degradationRate);
    if (fn.efficiency < 0.3) {
      fn.degrading = true;
    }
  }

  public maintainFunction(name: string, energySpent: number): void {
    const fn = this._stolenFunctions.get(name);
    if (!fn) {
      return;
    }
    fn.efficiency = Math.min(1, fn.efficiency + energySpent * 0.05);
    fn.degrading = fn.efficiency < 0.3;
    this._integrationScore = Math.min(1, this._integrationScore + 0.01);
  }

  public integrateDeeply(name: string): boolean {
    const fn = this._stolenFunctions.get(name);
    if (!fn || fn.efficiency < 0.5) {
      return false;
    }
    fn.efficiency = Math.min(1, fn.efficiency + 0.2);
    fn.degrading = false;
    this._degradationRate *= 0.9;
    this._integrationScore = Math.min(1, this._integrationScore + 0.1);
    this._updateViabilityModel();
    return true;
  }

  public discardFunction(name: string): void {
    this._stolenFunctions.delete(name);
    const idx = this._data.stolenOrganelles.indexOf(name);
    if (idx >= 0) {
      this._data.stolenOrganelles.splice(idx, 1);
    }
    this._updateViabilityModel();
  }

  public isFunctionViable(name: string): boolean {
    const fn = this._stolenFunctions.get(name);
    return !!fn && fn.efficiency > 0.1 && !fn.degrading;
  }

  public meanTimeToFailure(): number {
    if (this._stolenFunctions.size === 0) return Infinity;
    let sum = 0;
    for (const fn of this._stolenFunctions.values()) {
      sum += fn.halflife;
    }
    return sum / this._stolenFunctions.size;
  }

  public kleptoplastReport(): Record<string, unknown> {
    const viable = Array.from(this._stolenFunctions.values()).filter((f) => !f.degrading).length;
    return {
      kleptoplastId: this.kleptoplastId,
      hostId: this.hostId,
      stolenCount: this._stolenFunctions.size,
      viableCount: viable,
      functionalCapacity: this._data.functionalCapacity.toFixed(3),
      integrationScore: this._integrationScore.toFixed(3),
      usageCount: this._usageCount,
      retentionDays: this._data.retentionDays,
      mtbf: this.meanTimeToFailure().toFixed(2),
    };
  }
}
