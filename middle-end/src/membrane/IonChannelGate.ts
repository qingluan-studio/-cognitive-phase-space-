/**
 * IonChannelGate - 离子通道门
 * 快速开启或关闭特定信息通道，模拟细胞膜上离子通道的
 * 门控机制，对特定信号做出毫秒级响应。
 */

export interface IonChannelGateData {
  readonly gateId: string;
  ionType: string;
  conductance: number;
  thresholdPotential: number;
  state: 'open' | 'closed' | 'inactivated';
}

export interface GateTransition {
  from: 'open' | 'closed' | 'inactivated';
  to: 'open' | 'closed' | 'inactivated';
  trigger: string;
  timestamp: number;
}

export class IonChannelGate {
  private _data: IonChannelGateData;
  private _transitions: GateTransition[] = [];
  private _ionFlux: number = 0;
  private _currentPotential: number = 0;
  private _refractoryTimer: number = 0;

  constructor(data: IonChannelGateData) {
    this._data = { ...data };
  }

  get gateId(): string {
    return this._data.gateId;
  }

  get state(): 'open' | 'closed' | 'inactivated' {
    return this._data.state;
  }

  get ionFlux(): number {
    return this._ionFlux;
  }

  public applyPotential(potential: number, timestamp: number): number {
    this._currentPotential = potential;
    if (this._refractoryTimer > 0) {
      this._refractoryTimer--;
      return 0;
    }
    if (this._data.state === 'closed' && potential >= this._data.thresholdPotential) {
      this._transition('open', 'depolarization', timestamp);
    } else if (this._data.state === 'open' && potential >= this._data.thresholdPotential * 1.5) {
      this._transition('inactivated', 'overexcitation', timestamp);
      this._refractoryTimer = 5;
    } else if (this._data.state === 'open' && potential < this._data.thresholdPotential * 0.5) {
      this._transition('closed', 'repolarization', timestamp);
    }
    return this._computeFlux();
  }

  private _transition(to: 'open' | 'closed' | 'inactivated', trigger: string, timestamp: number): void {
    const from = this._data.state;
    this._data.state = to;
    const t: GateTransition = { from, to, trigger, timestamp };
    this._transitions.push(t);
    if (this._transitions.length > 30) {
      this._transitions.shift();
    }
  }

  private _computeFlux(): number {
    if (this._data.state !== 'open') {
      return 0;
    }
    const drivingForce = Math.abs(this._currentPotential - this._data.thresholdPotential);
    const flux = this._data.conductance * drivingForce;
    this._ionFlux += flux;
    return flux;
  }

  public resetGate(): void {
    this._data.state = 'closed';
    this._refractoryTimer = 0;
  }

  public adjustConductance(factor: number): void {
    this._data.conductance = Math.max(0, this._data.conductance * factor);
  }

  public setThreshold(newThreshold: number): void {
    this._data.thresholdPotential = Math.max(0, newThreshold);
  }

  public block(channelBlocker: string): boolean {
    if (channelBlocker === this._data.ionType) {
      this._data.state = 'inactivated';
      this._refractoryTimer = 10;
      return true;
    }
    return false;
  }

  public measureConductivity(): number {
    return this._data.state === 'open' ? this._data.conductance : 0;
  }

  public gateReport(): Record<string, unknown> {
    return {
      gateId: this.gateId,
      ionType: this._data.ionType,
      state: this._data.state,
      conductance: this._data.conductance.toFixed(3),
      threshold: this._data.thresholdPotential.toFixed(2),
      currentPotential: this._currentPotential.toFixed(2),
      ionFlux: this._ionFlux.toFixed(2),
      refractoryTimer: this._refractoryTimer,
      transitionCount: this._transitions.length,
      conductivity: this.measureConductivity().toFixed(3),
    };
  }
}
