export type ClockState = 'idle' | 'warming' | 'overclocked' | 'throttled' | 'shutdown';

export interface ClockReading {
  frequency: number;
  temperature: number;
  load: number;
  timestamp: number;
}

export interface OverclockProfile {
  baseFrequency: number;
  maxFrequency: number;
  thermalLimit: number;
  coolingCoefficient: number;
}

export class EkstasisOverclock {
  private _profile: OverclockProfile;
  private _state: ClockState = 'idle';
  private _currentFrequency: number;
  private _currentTemperature: number = 25;
  private _readings: ClockReading[] = [];
  private _pidIntegral: number = 0;
  private _pidPreviousError: number = 0;
  private _pidKp: number = 0.5;
  private _pidKi: number = 0.1;
  private _pidKd: number = 0.05;
  private _thermalThrottleCount: number = 0;
  private _stateTransitions: Map<string, number> = new Map();

  constructor(profile: OverclockProfile) {
    this._profile = { ...profile };
    this._currentFrequency = profile.baseFrequency;
  }

  get frequency(): number {
    return this._currentFrequency;
  }

  get temperature(): number {
    return this._currentTemperature;
  }

  get state(): ClockState {
    return this._state;
  }

  get thermalThrottleCount(): number {
    return this._thermalThrottleCount;
  }

  private _transitionTo(newState: ClockState): void {
    const key = `${this._state}->${newState}`;
    this._stateTransitions.set(key, (this._stateTransitions.get(key) ?? 0) + 1);
    this._state = newState;
  }

  tick(load: number): ClockReading {
    const power = load * (this._currentFrequency / this._profile.baseFrequency) ** 2;
    const deltaT = power * 0.5 - this._profile.coolingCoefficient * (this._currentTemperature - 25);
    this._currentTemperature += deltaT * 0.1;
    if (this._currentTemperature >= this._profile.thermalLimit) {
      this._thermalThrottleCount++;
      this._transitionTo('throttled');
      const error = this._profile.thermalLimit - this._currentTemperature;
      this._pidIntegral += error;
      const derivative = error - this._pidPreviousError;
      this._pidPreviousError = error;
      const pidOutput = this._pidKp * error + this._pidKi * this._pidIntegral + this._pidKd * derivative;
      this._currentFrequency = Math.max(
        this._profile.baseFrequency * 0.5,
        this._currentFrequency + pidOutput
      );
    } else if (this._currentTemperature < this._profile.thermalLimit * 0.7 && this._state === 'throttled') {
      this._transitionTo('overclocked');
      this._pidIntegral = 0;
    } else if (load > 0.8 && this._state !== 'throttled') {
      this._transitionTo('overclocked');
      this._currentFrequency = Math.min(this._profile.maxFrequency, this._currentFrequency * 1.02);
    } else if (load < 0.2 && this._state !== 'idle') {
      this._transitionTo('idle');
      this._currentFrequency = this._profile.baseFrequency;
      this._pidIntegral = 0;
    } else if (this._state === 'idle' && load > 0.2) {
      this._transitionTo('warming');
      this._currentFrequency = this._profile.baseFrequency * (1 + load * 0.1);
    }
    if (this._currentTemperature > this._profile.thermalLimit * 1.2) {
      this._transitionTo('shutdown');
      this._currentFrequency = 0;
    }
    const reading: ClockReading = {
      frequency: this._currentFrequency,
      temperature: this._currentTemperature,
      load,
      timestamp: Date.now(),
    };
    this._readings.push(reading);
    if (this._readings.length > 200) this._readings.shift();
    return reading;
  }

  manualOverride(frequency: number): void {
    this._currentFrequency = Math.max(0, Math.min(this._profile.maxFrequency * 1.1, frequency));
    this._transitionTo('overclocked');
  }

  coolDown(): void {
    this._currentTemperature = Math.max(25, this._currentTemperature - 10);
    this._pidIntegral = 0;
    if (this._currentTemperature < this._profile.thermalLimit * 0.5 && this._state === 'shutdown') {
      this._transitionTo('idle');
      this._currentFrequency = this._profile.baseFrequency;
    }
  }

  setPidGains(kp: number, ki: number, kd: number): void {
    this._pidKp = kp;
    this._pidKi = ki;
    this._pidKd = kd;
  }

  averageLoad(): number {
    if (this._readings.length === 0) return 0;
    return this._readings.reduce((acc, r) => acc + r.load, 0) / this._readings.length;
  }

  peakTemperature(): number {
    if (this._readings.length === 0) return 0;
    return Math.max(...this._readings.map(r => r.temperature));
  }

  getReadings(limit: number = 50): ClockReading[] {
    return this._readings.slice(-limit);
  }

  timeInState(state: ClockState): number {
    return this._readings.filter(r => {
      if (state === 'throttled') return r.temperature >= this._profile.thermalLimit;
      if (state === 'idle') return r.frequency === this._profile.baseFrequency;
      return false;
    }).length;
  }

  computeThermalEfficiency(): number {
    const perf = this._currentFrequency / this._profile.baseFrequency;
    const tempRatio = this._currentTemperature / this._profile.thermalLimit;
    return perf / (tempRatio + 0.01);
  }

  getStateTransitionMatrix(): Record<string, number> {
    return Object.fromEntries(this._stateTransitions);
  }

  reset(): void {
    this._state = 'idle';
    this._currentFrequency = this._profile.baseFrequency;
    this._currentTemperature = 25;
    this._readings = [];
    this._pidIntegral = 0;
    this._pidPreviousError = 0;
    this._thermalThrottleCount = 0;
    this._stateTransitions.clear();
  }

  overclockReport(): Record<string, unknown> {
    return {
      state: this._state,
      frequency: this._currentFrequency.toFixed(2),
      temperature: this._currentTemperature.toFixed(2),
      profile: this._profile,
      throttleCount: this._thermalThrottleCount,
      averageLoad: this.averageLoad().toFixed(3),
      peakTemperature: this.peakTemperature().toFixed(2),
      thermalEfficiency: this.computeThermalEfficiency().toFixed(3),
      readingsCount: this._readings.length,
      stateTransitions: Object.fromEntries(this._stateTransitions),
    };
  }
}
