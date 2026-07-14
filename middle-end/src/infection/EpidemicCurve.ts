/**
 * 流行曲线：思想传染的速度和范围。
 * 跟踪思想病毒随时间的传染情况，绘制 SIR 模型风格的流行曲线。
 */

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

  initialize(population: number, initialInfected: number = 1): void {
    this._susceptible = Math.max(0, population - initialInfected);
    this._infected = initialInfected;
    this._recovered = 0;
    this._samples = [];
    this._sample();
  }

  step(): CurveSample {
    const newInfected = Math.min(
      this._susceptible,
      Math.floor(this._infected * this._infectionRate * (this._susceptible / (this._susceptible + this._infected + this._recovered || 1)) * 10)
    );
    const newRecovered = Math.floor(this._infected * this._recoveryRate);
    this._susceptible -= newInfected;
    this._infected = this._infected - newRecovered + newInfected;
    this._recovered += newRecovered;
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

  setInfectionRate(value: number): void {
    this._infectionRate = Math.max(0, Math.min(1, value));
  }

  setRecoveryRate(value: number): void {
    this._recoveryRate = Math.max(0, Math.min(1, value));
  }

  getSamples(limit: number = 100): CurveSample[] {
    return this._samples.slice(-limit);
  }

  get currentState(): CurveSample | null {
    return this._samples.length > 0 ? this._samples[this._samples.length - 1] : null;
  }
}
