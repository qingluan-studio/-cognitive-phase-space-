/**
 * OsmoticBalance - 渗透平衡
 * 维持膜两侧信息/物质密度的动态平衡，通过调节渗透压
 * 防止一侧过载或干涸，保持系统的稳定内环境。
 */

export interface OsmoticBalanceData {
  readonly balanceId: string;
  soluteInside: number;
  soluteOutside: number;
  solventVolume: number;
  membranePermeability: number;
}

export interface OsmosisStep {
  flowDirection: 'in' | 'out' | 'none';
  volume: number;
  pressureDelta: number;
}

export class OsmoticBalance {
  private _data: OsmoticBalanceData;
  private _steps: OsmosisStep[] = [];
  private _osmoticPressure: number = 0;
  private _lysisRisk: number = 0;
  private _equilibriumReached: boolean = false;

  constructor(data: OsmoticBalanceData) {
    this._data = { ...data };
    this._computePressure();
  }

  get balanceId(): string {
    return this._data.balanceId;
  }

  get osmoticPressure(): number {
    return this._osmoticPressure;
  }

  get lysisRisk(): number {
    return this._lysisRisk;
  }

  get equilibriumReached(): boolean {
    return this._equilibriumReached;
  }

  private _computePressure(): void {
    const inConc = this._data.soluteInside / (this._data.solventVolume + 0.001);
    const outConc = this._data.soluteOutside / (this._data.solventVolume + 0.001);
    this._osmoticPressure = Math.abs(inConc - outConc);
  }

  public stepOsmosis(): OsmosisStep {
    this._computePressure();
    const inConc = this._data.soluteInside / (this._data.solventVolume + 0.001);
    const outConc = this._data.soluteOutside / (this._data.solventVolume + 0.001);
    let direction: 'in' | 'out' | 'none' = 'none';
    let volume = 0;
    if (Math.abs(inConc - outConc) < 0.01) {
      this._equilibriumReached = true;
      direction = 'none';
    } else if (inConc > outConc) {
      direction = 'in';
      volume = this._osmoticPressure * this._data.membranePermeability * 10;
      this._data.solventVolume += volume;
    } else {
      direction = 'out';
      volume = this._osmoticPressure * this._data.membranePermeability * 10;
      this._data.solventVolume = Math.max(0.1, this._data.solventVolume - volume);
    }
    this._updateLysisRisk(direction, volume);
    const step: OsmosisStep = {
      flowDirection: direction,
      volume,
      pressureDelta: this._osmoticPressure,
    };
    this._steps.push(step);
    if (this._steps.length > 40) {
      this._steps.shift();
    }
    return step;
  }

  private _updateLysisRisk(direction: 'in' | 'out' | 'none', volume: number): void {
    if (direction === 'in') {
      this._lysisRisk = Math.min(1, this._lysisRisk + volume * 0.05);
    } else if (direction === 'out') {
      this._lysisRisk = Math.max(0, this._lysisRisk - volume * 0.02);
    }
  }

  public addSolute(side: 'inside' | 'outside', amount: number): void {
    if (side === 'inside') {
      this._data.soluteInside += amount;
    } else {
      this._data.soluteOutside += amount;
    }
    this._equilibriumReached = false;
  }

  public adjustPermeability(delta: number): void {
    this._data.membranePermeability = Math.max(0, Math.min(1, this._data.membranePermeability + delta));
  }

  public regulatePressure(target: number): void {
    const diff = target - this._osmoticPressure;
    if (diff > 0) {
      this._data.soluteInside += diff * 0.5;
    } else {
      this._data.soluteOutside += Math.abs(diff) * 0.5;
    }
    this._computePressure();
  }

  public checkLysis(): boolean {
    return this._lysisRisk > 0.8;
  }

  public osmosisReport(): Record<string, unknown> {
    return {
      balanceId: this.balanceId,
      soluteInside: this._data.soluteInside.toFixed(2),
      soluteOutside: this._data.soluteOutside.toFixed(2),
      solventVolume: this._data.solventVolume.toFixed(2),
      permeability: this._data.membranePermeability.toFixed(3),
      osmoticPressure: this._osmoticPressure.toFixed(3),
      lysisRisk: this._lysisRisk.toFixed(3),
      equilibrium: this._equilibriumReached,
      stepCount: this._steps.length,
    };
  }
}
