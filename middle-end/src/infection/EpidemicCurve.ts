export interface CurveSample {
  timestamp: number;
  susceptible: number;
  infected: number;
  recovered: number;
}

export interface CurveSummary {
  peakInfected: number;
  peakTime: number;
  totalInfected: number;
  duration: number;
}

export class EpidemicCurve {
  private _samples: CurveSample[] = [];
  private _susceptible = 0;
  private _infected = 0;
  private _recovered = 0;
  private _infectionRate = 0.3;
  private _recoveryRate = 0.1;
  private _population = 0;
  private _stepCount = 0;

  initialize(population: number, initialInfected: number = 1): void {
    this._population = Math.max(1, population);
    this._susceptible = Math.max(0, population - initialInfected);
    this._infected = Math.max(0, initialInfected);
    this._recovered = 0;
    this._samples = [];
    this._stepCount = 0;
    this._sample();
  }

  step(): CurveSample {
    const n = Math.max(1, this._susceptible + this._infected + this._recovered);
    const k1s = -this._infectionRate * this._susceptible * this._infected / n;
    const k1i = this._infectionRate * this._susceptible * this._infected / n - this._recoveryRate * this._infected;
    const k1r = this._recoveryRate * this._infected;

    const s2 = Math.max(0, this._susceptible + 0.5 * k1s);
    const i2 = Math.max(0, this._infected + 0.5 * k1i);
    const k2s = -this._infectionRate * s2 * i2 / n;
    const k2i = this._infectionRate * s2 * i2 / n - this._recoveryRate * i2;
    const k2r = this._recoveryRate * i2;

    const s3 = Math.max(0, this._susceptible + 0.5 * k2s);
    const i3 = Math.max(0, this._infected + 0.5 * k2i);
    const k3s = -this._infectionRate * s3 * i3 / n;
    const k3i = this._infectionRate * s3 * i3 / n - this._recoveryRate * i3;
    const k3r = this._recoveryRate * i3;

    const s4 = Math.max(0, this._susceptible + k3s);
    const i4 = Math.max(0, this._infected + k3i);
    const k4s = -this._infectionRate * s4 * i4 / n;
    const k4i = this._infectionRate * s4 * i4 / n - this._recoveryRate * i4;
    const k4r = this._recoveryRate * i4;

    this._susceptible = Math.max(0, Math.round(this._susceptible + (k1s + 2 * k2s + 2 * k3s + k4s) / 6));
    this._infected = Math.max(0, Math.round(this._infected + (k1i + 2 * k2i + 2 * k3i + k4i) / 6));
    this._recovered = Math.max(0, Math.round(this._recovered + (k1r + 2 * k2r + 2 * k3r + k4r) / 6));
    this._stepCount++;
    return this._sample();
  }

  private _sample(): CurveSample {
    const sample: CurveSample = {
      timestamp: Date.now(),
      susceptible: this._susceptible,
      infected: this._infected,
      recovered: this._recovered,
    };
    this._samples.push(sample);
    if (this._samples.length > 1000) this._samples.shift();
    return sample;
  }

  summarize(): CurveSummary {
    if (this._samples.length === 0) {
      return { peakInfected: 0, peakTime: 0, totalInfected: 0, duration: 0 };
    }
    let peak = 0;
    let peakTime = 0;
    for (const s of this._samples) {
      if (s.infected > peak) {
        peak = s.infected;
        peakTime = s.timestamp;
      }
    }
    return {
      peakInfected: peak,
      peakTime,
      totalInfected: this._recovered + this._infected,
      duration: this._samples[this._samples.length - 1].timestamp - this._samples[0].timestamp,
    };
  }

  computeR0(): number {
    return this._recoveryRate > 0 ? this._infectionRate / this._recoveryRate : 0;
  }

  computeHerdImmunityThreshold(): number {
    const r0 = this.computeR0();
    return r0 > 1 ? 1 - 1 / r0 : 0;
  }

  computeEffectiveReproductionNumber(): number {
    const n = Math.max(1, this._susceptible + this._infected + this._recovered);
    const susceptibleRatio = this._susceptible / n;
    return this.computeR0() * susceptibleRatio;
  }

  computeDoublingTime(): number {
    if (this._samples.length < 4) return 0;
    const recent = this._samples.slice(-4);
    const start = recent[0].infected;
    const end = recent[recent.length - 1].infected;
    if (start <= 0 || end <= start) return Infinity;
    const timeSpan = recent[recent.length - 1].timestamp - recent[0].timestamp;
    return timeSpan * Math.log(2) / Math.log(end / start);
  }

  isEpidemicGrowing(): boolean {
    return this.computeEffectiveReproductionNumber() > 1;
  }

  setInfectionRate(value: number): void {
    this._infectionRate = Math.max(0, Math.min(1, value));
  }

  setRecoveryRate(value: number): void {
    this._recoveryRate = Math.max(0, Math.min(1, value));
  }

  getSamples(limit: number = 100): CurveSample[] {
    return this._samples.slice(-limit);
  }

  get stepCount(): number {
    return this._stepCount;
  }

  get currentState(): CurveSample | null {
    return this._samples.length > 0 ? this._samples[this._samples.length - 1] : null;
  }
}
