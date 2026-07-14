/**
 * ActiveTransport - 主动运输
 * 消耗能量逆浓度梯度传输物质，通过载体蛋白与ATP供能，
 * 将物质从低浓度侧运送到高浓度侧，维持系统的非平衡态。
 */

export interface ActiveTransportData {
  readonly transporterId: string;
  cargoType: string;
  pumpRate: number;
  atpReserve: number;
  concentrationIn: number;
  concentrationOut: number;
}

export interface TransportCycle {
  cargoMoved: number;
  energySpent: number;
  againstGradient: boolean;
  successful: boolean;
}

export class ActiveTransport {
  private _data: ActiveTransportData;
  private _cycles: TransportCycle[] = [];
  private _totalTransported: number = 0;
  private _totalEnergySpent: number = 0;
  private _carrierSaturation: number = 0;

  constructor(data: ActiveTransportData) {
    this._data = { ...data };
  }

  get transporterId(): string {
    return this._data.transporterId;
  }

  get atpReserve(): number {
    return this._data.atpReserve;
  }

  get gradientDirection(): 'inbound' | 'outbound' | 'equilibrium' {
    if (this._data.concentrationIn > this._data.concentrationOut) {
      return 'outbound';
    }
    if (this._data.concentrationIn < this._data.concentrationOut) {
      return 'inbound';
    }
    return 'equilibrium';
  }

  public pump(cycles: number): TransportCycle[] {
    const results: TransportCycle[] = [];
    for (let i = 0; i < cycles; i++) {
      const cycle = this._executeSinglePump();
      results.push(cycle);
      if (!cycle.successful) {
        break;
      }
    }
    return results;
  }

  private _executeSinglePump(): TransportCycle {
    const energyPerCycle = 1;
    if (this._data.atpReserve < energyPerCycle) {
      return { cargoMoved: 0, energySpent: 0, againstGradient: false, successful: false };
    }
    const againstGradient = this._data.concentrationIn < this._data.concentrationOut;
    const efficiency = againstGradient ? 0.6 : 0.9;
    const cargoMoved = this._data.pumpRate * efficiency * (1 - this._carrierSaturation);
    this._data.atpReserve -= energyPerCycle;
    this._data.concentrationIn += cargoMoved * 0.1;
    this._data.concentrationOut -= cargoMoved * 0.1;
    this._carrierSaturation = Math.min(1, this._carrierSaturation + 0.05);
    this._totalTransported += cargoMoved;
    this._totalEnergySpent += energyPerCycle;
    const cycle: TransportCycle = {
      cargoMoved,
      energySpent: energyPerCycle,
      againstGradient,
      successful: true,
    };
    this._cycles.push(cycle);
    if (this._cycles.length > 40) {
      this._cycles.shift();
    }
    return cycle;
  }

  public replenishATP(amount: number): void {
    this._data.atpReserve += amount;
  }

  public recoverCarriers(): void {
    this._carrierSaturation = Math.max(0, this._carrierSaturation - 0.3);
  }

  public adjustPumpRate(factor: number): void {
    this._data.pumpRate = Math.max(0, this._data.pumpRate * factor);
  }

  public computeEfficiency(): number {
    if (this._totalEnergySpent === 0) {
      return 0;
    }
    return this._totalTransported / this._totalEnergySpent;
  }

  public isBalanced(): boolean {
    const ratio = this._data.concentrationIn / (this._data.concentrationOut + 0.001);
    return ratio > 0.9 && ratio < 1.1;
  }

  public transportReport(): Record<string, unknown> {
    return {
      transporterId: this.transporterId,
      cargoType: this._data.cargoType,
      atpReserve: this._data.atpReserve.toFixed(2),
      pumpRate: this._data.pumpRate.toFixed(3),
      gradientDirection: this.gradientDirection,
      concentrationIn: this._data.concentrationIn.toFixed(2),
      concentrationOut: this._data.concentrationOut.toFixed(2),
      totalTransported: this._totalTransported.toFixed(2),
      totalEnergySpent: this._totalEnergySpent.toFixed(2),
      efficiency: this.computeEfficiency().toFixed(3),
      carrierSaturation: this._carrierSaturation.toFixed(3),
      balanced: this.isBalanced(),
    };
  }
}
