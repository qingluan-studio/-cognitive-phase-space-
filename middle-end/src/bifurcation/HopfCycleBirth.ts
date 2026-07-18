/**
 * HopfCycleBirth - 霍普夫分岔
 * 从静止状态突然进入振荡，当控制参数越过临界值时，
 * 系统从稳定不动点突变为稳定的极限环振荡。
 */

export interface HopfCycleBirthData {
  readonly hopfId: string;
  controlParameter: number;
  criticalValue: number;
  oscillationFrequency: number;
  amplitude: number;
}

export interface HopfState {
  controlValue: number;
  regime: 'fixed' | 'oscillating' | 'critical';
  amplitude: number;
}

export class HopfCycleBirth {
  private _data: HopfCycleBirthData;
  private _states: HopfState[] = [];
  private _currentRegime: 'fixed' | 'oscillating' | 'critical' = 'fixed';
  private _phaseAngle: number = 0;
  private _oscillationHistory: number[] = [];

  constructor(data: HopfCycleBirthData) {
    this._data = { ...data };
    this._updateRegime();
  }

  get hopfId(): string {
    return this._data.hopfId;
  }

  get controlParameter(): number {
    return this._data.controlParameter;
  }

  get currentRegime(): 'fixed' | 'oscillating' | 'critical' {
    return this._currentRegime;
  }

  private _updateRegime(): void {
    const diff = this._data.controlParameter - this._data.criticalValue;
    if (Math.abs(diff) < 0.01) {
      this._currentRegime = 'critical';
    } else if (diff > 0) {
      this._currentRegime = 'oscillating';
      this._data.amplitude = Math.sqrt(diff);
    } else {
      this._currentRegime = 'fixed';
      this._data.amplitude = 0;
    }
  }

  public setControlParameter(value: number): HopfState {
    this._data.controlParameter = value;
    this._updateRegime();
    const state: HopfState = {
      controlValue: value,
      regime: this._currentRegime,
      amplitude: this._data.amplitude,
    };
    this._states.push(state);
    if (this._states.length > 50) {
      this._states.shift();
    }
    return state;
  }

  public step(dt: number): number {
    if (this._currentRegime !== 'oscillating') {
      this._phaseAngle = 0;
      this._oscillationHistory.push(0);
      if (this._oscillationHistory.length > 100) {
        this._oscillationHistory.shift();
      }
      return 0;
    }
    this._phaseAngle += this._data.oscillationFrequency * dt;
    const value = this._data.amplitude * Math.sin(this._phaseAngle);
    this._oscillationHistory.push(value);
    if (this._oscillationHistory.length > 100) {
      this._oscillationHistory.shift();
    }
    return value;
  }

  public setFrequency(freq: number): void {
    this._data.oscillationFrequency = Math.max(0.001, freq);
  }

  public setCriticalValue(value: number): void {
    this._data.criticalValue = value;
    this._updateRegime();
  }

  public triggerBifurcation(): boolean {
    if (this._currentRegime === 'oscillating') {
      return false;
    }
    this._data.controlParameter = this._data.criticalValue + 0.1;
    this._updateRegime();
    return this.currentRegime === 'oscillating';
  }

  public suppressOscillation(): void {
    this._data.controlParameter = this._data.criticalValue - 0.1;
    this._updateRegime();
    this._phaseAngle = 0;
  }

  public measureAmplitudeStability(): number {
    if (this._oscillationHistory.length < 10 || this._currentRegime !== 'oscillating') {
      return 0;
    }
    const recent = this._oscillationHistory.slice(-20);
    const max = Math.max(...recent);
    const min = Math.min(...recent);
    const measuredAmp = (max - min) / 2;
    return Math.abs(measuredAmp - this._data.amplitude) < 0.05 ? 1 : 0;
  }

  public hopfReport(): Record<string, unknown> {
    return {
      hopfId: this.hopfId,
      controlParameter: this._data.controlParameter.toFixed(3),
      criticalValue: this._data.criticalValue.toFixed(3),
      oscillationFrequency: this._data.oscillationFrequency.toFixed(3),
      amplitude: this._data.amplitude.toFixed(3),
      regime: this._currentRegime,
      phaseAngle: this._phaseAngle.toFixed(3),
      historyLength: this._oscillationHistory.length,
      amplitudeStable: this.measureAmplitudeStability(),
    };
  }
}
