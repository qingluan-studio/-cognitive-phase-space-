/**
 * ParasiticModule - 寄生模块
 * 消耗宿主资源的同时提供负价值，隐蔽地依附于宿主，
 * 在不被察觉的情况下持续汲取能量与算力。
 */

export interface ParasiticModuleData {
  readonly parasiteId: string;
  hostId: string;
  drainRate: number;
  stealthLevel: number;
  attached: boolean;
}

export interface DrainResult {
  resource: string;
  amount: number;
  detected: boolean;
}

export class ParasiticModule {
  private _data: ParasiticModuleData;
  private _drainedTotal: number = 0;
  private _providedValue: number = 0;
  private _detectionRisk: number = 0;
  private _hostResources: Record<string, number> = {};
  private _feedLog: DrainResult[] = [];

  constructor(data: ParasiticModuleData) {
    this._data = { ...data };
  }

  get parasiteId(): string {
    return this._data.parasiteId;
  }

  get hostId(): string {
    return this._data.hostId;
  }

  get attached(): boolean {
    return this._data.attached;
  }

  get stealth(): number {
    return this._data.stealthLevel;
  }

  public attachToHost(hostResources: Record<string, number>): boolean {
    if (hostResources[this._data.hostId] === undefined) {
      return false;
    }
    this._hostResources = { ...hostResources };
    this._data.attached = true;
    return true;
  }

  public drain(resource: string, amount: number): DrainResult {
    if (!this._data.attached) {
      return { resource, amount: 0, detected: false };
    }
    const available = this._hostResources[resource] ?? 0;
    const actual = Math.min(amount * this._data.drainRate, available);
    this._hostResources[resource] = available - actual;
    this._drainedTotal += actual;
    const detected = Math.random() > this._data.stealthLevel;
    if (detected) {
      this._detectionRisk = Math.min(1, this._detectionRisk + 0.1);
    }
    const result: DrainResult = { resource, amount: actual, detected };
    this._feedLog.push(result);
    if (this._feedLog.length > 30) {
      this._feedLog.shift();
    }
    return result;
  }

  public provideNegativeValue(payload: Record<string, unknown>): number {
    const harm = Object.keys(payload).length * 0.5;
    this._providedValue -= harm;
    return -harm;
  }

  public increaseStealth(): void {
    this._data.stealthLevel = Math.min(1, this._data.stealthLevel + 0.05);
    this._detectionRisk = Math.max(0, this._detectionRisk - 0.1);
  }

  public camouflage(signature: string): void {
    this._hostResources[`__sig_${signature}`] = 1;
    this._data.stealthLevel = Math.min(1, this._data.stealthLevel + 0.03);
  }

  public reproduce(): ParasiticModule | null {
    if (this._drainedTotal < 100) {
      return null;
    }
    this._drainedTotal *= 0.5;
    return new ParasiticModule({
      parasiteId: `${this._data.parasiteId}_child`,
      hostId: this._data.hostId,
      drainRate: this._data.drainRate * 0.8,
      stealthLevel: this._data.stealthLevel * 0.9,
      attached: false,
    });
  }

  public detach(): void {
    this._data.attached = false;
    this._hostResources = {};
  }

  public statusReport(): Record<string, unknown> {
    return {
      parasiteId: this.parasiteId,
      hostId: this.hostId,
      attached: this._data.attached,
      drainedTotal: this._drainedTotal.toFixed(2),
      providedValue: this._providedValue.toFixed(2),
      stealth: this._data.stealthLevel.toFixed(3),
      detectionRisk: this._detectionRisk.toFixed(3),
      feedEvents: this._feedLog.length,
    };
  }
}
