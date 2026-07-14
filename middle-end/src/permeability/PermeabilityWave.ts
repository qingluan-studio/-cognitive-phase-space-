/**
 * PermeabilityWave - 通透性波
 * 通透度随时间周期性变化，形成波动的边界状态，使系统
 * 在不同时刻表现出不同的开放/封闭特性。
 */

export interface PermeabilityWaveData {
  readonly waveId: string;
  amplitude: number;
  frequency: number;
  basePermeability: number;
  phase: number;
}

export interface WaveSample {
  time: number;
  permeability: number;
  state: 'open' | 'closed' | 'transitional';
}

export class PermeabilityWave {
  private _data: PermeabilityWaveData;
  private _samples: WaveSample[] = [];
  private _currentPermeability: number;
  private _waveCycles: number = 0;

  constructor(data: PermeabilityWaveData) {
    this._data = { ...data };
    this._currentPermeability = data.basePermeability;
  }

  get waveId(): string {
    return this._data.waveId;
  }

  get currentPermeability(): number {
    return this._currentPermeability;
  }

  get amplitude(): number {
    return this._data.amplitude;
  }

  get frequency(): number {
    return this._data.frequency;
  }

  public sample(time: number): WaveSample {
    const wave = Math.sin(2 * Math.PI * this._data.frequency * time + this._data.phase);
    const permeability = Math.max(
      0,
      Math.min(1, this._data.basePermeability + wave * this._data.amplitude)
    );
    this._currentPermeability = permeability;
    let state: 'open' | 'closed' | 'transitional';
    if (permeability > 0.7) {
      state = 'open';
    } else if (permeability < 0.3) {
      state = 'closed';
    } else {
      state = 'transitional';
    }
    const sample: WaveSample = { time, permeability, state };
    this._samples.push(sample);
    if (this._samples.length > 100) {
      this._samples.shift();
    }
    if (this._samples.length > 1) {
      const prev = this._samples[this._samples.length - 2];
      if (prev.state === 'open' && state === 'closed') {
        this._waveCycles++;
      }
    }
    return sample;
  }

  public allowPassage(time: number, threshold: number): boolean {
    const sample = this.sample(time);
    return sample.permeability >= threshold;
  }

  public adjustAmplitude(delta: number): void {
    this._data.amplitude = Math.max(0, Math.min(0.5, this._data.amplitude + delta));
  }

  public shiftPhase(delta: number): void {
    this._data.phase = (this._data.phase + delta) % (2 * Math.PI);
  }

  public retuneFrequency(newFrequency: number): void {
    this._data.frequency = Math.max(0.01, newFrequency);
  }

  public findPeakTimes(): number[] {
    const peaks: number[] = [];
    for (let i = 1; i < this._samples.length - 1; i++) {
      const prev = this._samples[i - 1].permeability;
      const curr = this._samples[i].permeability;
      const next = this._samples[i + 1].permeability;
      if (curr > prev && curr > next) {
        peaks.push(this._samples[i].time);
      }
    }
    return peaks;
  }

  public averagePermeability(): number {
    if (this._samples.length === 0) {
      return this._data.basePermeability;
    }
    const sum = this._samples.reduce((s, sm) => s + sm.permeability, 0);
    return sum / this._samples.length;
  }

  public waveReport(): Record<string, unknown> {
    return {
      waveId: this.waveId,
      amplitude: this._data.amplitude.toFixed(3),
      frequency: this._data.frequency.toFixed(3),
      basePermeability: this._data.basePermeability.toFixed(3),
      phase: this._data.phase.toFixed(3),
      currentPermeability: this._currentPermeability.toFixed(3),
      waveCycles: this._waveCycles,
      sampleCount: this._samples.length,
      averagePermeability: this.averagePermeability().toFixed(3),
    };
  }
}
