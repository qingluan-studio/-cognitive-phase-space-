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
  probability: number;
}

export class ParasiticModule {
  private _data: ParasiticModuleData;
  private _drainedTotal: number = 0;
  private _providedValue: number = 0;
  private _detectionRisk: number = 0;
  private _hostResources: Record<string, number> = {};
  private _feedLog: DrainResult[] = [];
  private _lotkaVolterraAlpha: number = 0.1;
  private _lotkaVolterraBeta: number = 0.02;
  private _hostPopulation: number = 100;
  private _parasitePopulation: number = 10;

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

  get detectionRisk(): number {
    return this._detectionRisk;
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
      return { resource, amount: 0, detected: false, probability: 0 };
    }
    const available = this._hostResources[resource] ?? 0;
    const actual = Math.min(amount * this._data.drainRate, available);
    this._hostResources[resource] = available - actual;
    this._drainedTotal += actual;
    const detectionProb = 1 - this._data.stealthLevel;
    const detected = Math.random() < detectionProb;
    if (detected) {
      this._detectionRisk = Math.min(1, this._detectionRisk + 0.1);
    }
    const result: DrainResult = { resource, amount: actual, detected, probability: detectionProb };
    this._feedLog.push(result);
    if (this._feedLog.length > 30) {
      this._feedLog.shift();
    }
    this._updateLotkaVolterra(actual);
    return result;
  }

  private _updateLotkaVolterra(drainAmount: number): void {
    const dt = 0.1;
    const dHost = this._lotkaVolterraAlpha * this._hostPopulation - this._lotkaVolterraBeta * this._hostPopulation * this._parasitePopulation;
    const dParasite = this._lotkaVolterraBeta * drainAmount * this._hostPopulation * this._parasitePopulation - 0.1 * this._parasitePopulation;
    this._hostPopulation = Math.max(0, this._hostPopulation + dHost * dt);
    this._parasitePopulation = Math.max(0, this._parasitePopulation + dParasite * dt);
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

  public equilibriumPoint(): { host: number; parasite: number } {
    const hostEq = 0.1 / (this._lotkaVolterraBeta || 1e-9);
    const parasiteEq = this._lotkaVolterraAlpha / (this._lotkaVolterraBeta || 1e-9);
    return { host: hostEq, parasite: parasiteEq };
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
      hostPopulation: this._hostPopulation.toFixed(2),
      parasitePopulation: this._parasitePopulation.toFixed(2),
    };
  }
}
