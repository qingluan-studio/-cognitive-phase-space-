export interface PotentialReading {
  timestamp: number;
  voltage: number;
  sodiumCurrent: number;
  potassiumCurrent: number;
  leakCurrent: number;
}

export class MembranePotential {
  private _readings: PotentialReading[] = [];
  private _state: Record<string, unknown> = {};
  private _voltage: number = -65;
  private _gNa: number = 120;
  private _gK: number = 36;
  private _gL: number = 0.3;
  private _eNa: number = 50;
  private _eK: number = -77;
  private _eL: number = -54.4;
  private _cm: number = 1;
  private _m: number = 0.05;
  private _h: number = 0.6;
  private _n: number = 0.32;
  private _spikeCount: number = 0;
  private _isiHistory: number[] = [];
  private _lastSpikeTime: number = 0;

  get voltage(): number {
    return this._voltage;
  }

  get spikeCount(): number {
    return this._spikeCount;
  }

  private _alphaM(v: number): number {
    return 0.1 * (v + 40) / (1 - Math.exp(-(v + 40) / 10));
  }

  private _betaM(v: number): number {
    return 4 * Math.exp(-(v + 65) / 18);
  }

  private _alphaH(v: number): number {
    return 0.07 * Math.exp(-(v + 65) / 20);
  }

  private _betaH(v: number): number {
    return 1 / (1 + Math.exp(-(v + 35) / 10));
  }

  private _alphaN(v: number): number {
    return 0.01 * (v + 55) / (1 - Math.exp(-(v + 55) / 10));
  }

  private _betaN(v: number): number {
    return 0.125 * Math.exp(-(v + 65) / 80);
  }

  step(stimulusCurrent: number, dt: number = 0.01): PotentialReading {
    const v = this._voltage;
    const am = this._alphaM(v);
    const bm = this._betaM(v);
    const ah = this._alphaH(v);
    const bh = this._betaH(v);
    const an = this._alphaN(v);
    const bn = this._betaN(v);
    this._m += (am * (1 - this._m) - bm * this._m) * dt;
    this._h += (ah * (1 - this._h) - bh * this._h) * dt;
    this._n += (an * (1 - this._n) - bn * this._n) * dt;
    const iNa = this._gNa * Math.pow(this._m, 3) * this._h * (v - this._eNa);
    const iK = this._gK * Math.pow(this._n, 4) * (v - this._eK);
    const iL = this._gL * (v - this._eL);
    const dv = (stimulusCurrent - iNa - iK - iL) / this._cm;
    this._voltage += dv * dt;
    if (this._voltage >= 30 && v < 30) {
      this._spikeCount++;
      const now = Date.now();
      if (this._lastSpikeTime > 0) {
        this._isiHistory.push(now - this._lastSpikeTime);
        if (this._isiHistory.length > 50) this._isiHistory.shift();
      }
      this._lastSpikeTime = now;
    }
    const reading: PotentialReading = {
      timestamp: Date.now(),
      voltage: this._voltage,
      sodiumCurrent: iNa,
      potassiumCurrent: iK,
      leakCurrent: iL,
    };
    this._readings.push(reading);
    if (this._readings.length > 500) this._readings.shift();
    return reading;
  }

  runSimulation(steps: number, stimulus: number): PotentialReading[] {
    const readings: PotentialReading[] = [];
    for (let i = 0; i < steps; i++) {
      readings.push(this.step(stimulus));
    }
    return readings;
  }

  averageVoltage(): number {
    if (this._readings.length === 0) return 0;
    return this._readings.reduce((acc, r) => acc + r.voltage, 0) / this._readings.length;
  }

  averageISI(): number {
    if (this._isiHistory.length === 0) return 0;
    return this._isiHistory.reduce((a, b) => a + b, 0) / this._isiHistory.length;
  }

  firingRate(): number {
    if (this._isiHistory.length === 0) return 0;
    return 1000 / this.averageISI();
  }

  getReadings(limit: number = 50): PotentialReading[] {
    return this._readings.slice(-limit);
  }

  resetPotential(): void {
    this._voltage = -65;
    this._m = 0.05;
    this._h = 0.6;
    this._n = 0.32;
  }

  setConductances(gNa: number, gK: number, gL: number): void {
    this._gNa = gNa;
    this._gK = gK;
    this._gL = gL;
  }

  potentialReport(): Record<string, unknown> {
    return {
      voltage: this._voltage.toFixed(3),
      spikeCount: this._spikeCount,
      averageVoltage: this.averageVoltage().toFixed(3),
      averageISI: this.averageISI().toFixed(2),
      firingRate: this.firingRate().toFixed(2),
      readingsCount: this._readings.length,
      gatingVariables: { m: this._m.toFixed(4), h: this._h.toFixed(4), n: this._n.toFixed(4) },
      state: this._state,
    };
  }
}
