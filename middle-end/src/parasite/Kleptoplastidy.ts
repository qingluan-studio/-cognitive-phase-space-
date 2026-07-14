/**
 * Kleptoplastidy - 盗质体
 * 偷取宿主的功能据为己有，将宿主的细胞器、能力或代码模块
 * 整合到自身，使其能够执行原本不属于自己的操作。
 */

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
}

export class Kleptoplastidy {
  private _data: KleptoplastidyData;
  private _stolenFunctions: Map<string, StolenFunction> = new Map();
  private _usageCount: number = 0;
  private _degradationRate: number = 0.01;
  private _integrationScore: number = 0;

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
    const fn: StolenFunction = {
      name,
      source,
      efficiency: baseEfficiency * 0.7,
      degrading: false,
    };
    this._stolenFunctions.set(name, fn);
    this._data.stolenOrganelles.push(name);
    this._data.functionalCapacity = Math.min(1, this._data.functionalCapacity + 0.1);
    return true;
  }

  public useStolenFunction(name: string): number {
    const fn = this._stolenFunctions.get(name);
    if (!fn) {
      return 0;
    }
    this._usageCount++;
    const output = fn.efficiency * (1 - this._degradationRate * this._usageCount);
    this._degradeFunction(fn);
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
    return true;
  }

  public discardFunction(name: string): void {
    this._stolenFunctions.delete(name);
    const idx = this._data.stolenOrganelles.indexOf(name);
    if (idx >= 0) {
      this._data.stolenOrganelles.splice(idx, 1);
    }
  }

  public isFunctionViable(name: string): boolean {
    const fn = this._stolenFunctions.get(name);
    return !!fn && fn.efficiency > 0.1 && !fn.degrading;
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
    };
  }
}
