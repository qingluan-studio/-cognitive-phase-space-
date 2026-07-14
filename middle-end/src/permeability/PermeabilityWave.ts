export interface Wavefront {
  position: number;
  amplitude: number;
  frequency: number;
  phase: number;
  envelope: number;
}

export interface PermeabilityResult {
  position: number;
  transmission: number;
  reflection: number;
  absorption: number;
  phaseShift: number;
}

export class PermeabilityWave {
  private _wavefronts: Wavefront[] = [];
  private _barrierPosition: number = 0.5;
  private _barrierImpedance: number = 1;
  private _results: PermeabilityResult[] = [];
  private _fftCache: { real: number[]; imag: number[] } | null = null;

  constructor(wavefrontCount: number) {
    for (let i = 0; i < wavefrontCount; i++) {
      this._wavefronts.push({
        position: i / wavefrontCount,
        amplitude: Math.random(),
        frequency: 1 + i * 0.5,
        phase: Math.random() * Math.PI * 2,
        envelope: Math.exp(-i * 0.1),
      });
    }
  }

  get waveCount(): number {
    return this._wavefronts.length;
  }

  get barrierPosition(): number {
    return this._barrierPosition;
  }

  setBarrier(position: number, impedance: number): void {
    this._barrierPosition = position;
    this._barrierImpedance = impedance;
  }

  propagate(time: number): PermeabilityResult[] {
    this._results = [];
    for (const wave of this._wavefronts) {
      const newPos = wave.position + wave.frequency * 0.01 * time;
      wave.position = newPos % 1;
      if (newPos >= this._barrierPosition) {
        const z1 = 1;
        const z2 = this._barrierImpedance;
        const reflectionCoeff = (z2 - z1) / (z2 + z1);
        const transmissionCoeff = (2 * z2) / (z2 + z1);
        const transmission = Math.abs(transmissionCoeff) * wave.amplitude * wave.envelope;
        const reflection = Math.abs(reflectionCoeff) * wave.amplitude * wave.envelope;
        const absorption = 1 - transmission - reflection;
        const phaseShift = Math.atan2(z1, z2);
        this._results.push({
          position: wave.position,
          transmission,
          reflection,
          absorption: Math.max(0, absorption),
          phaseShift,
        });
      }
    }
    return this._results;
  }

  spectralDecomposition(): { frequency: number[]; amplitude: number[] } {
    const frequencies: number[] = [];
    const amplitudes: number[] = [];
    for (const wave of this._wavefronts) {
      frequencies.push(wave.frequency);
      amplitudes.push(wave.amplitude);
    }
    return { frequency: frequencies, amplitude: amplitudes };
  }

  envelopeDetection(): number {
    return this._wavefronts.reduce((acc, w) => acc + Math.abs(w.amplitude * w.envelope), 0);
  }

  phaseLockLoop(targetPhase: number): number {
    let error = 0;
    for (const wave of this._wavefronts) {
      error += Math.sin(targetPhase - wave.phase);
      wave.phase += 0.1 * Math.sin(targetPhase - wave.phase);
    }
    return error / (this._wavefronts.length || 1);
  }

  computeFFT(): { real: number[]; imag: number[] } {
    const n = this._wavefronts.length;
    const real = this._wavefronts.map((w) => w.amplitude * Math.cos(w.phase));
    const imag = this._wavefronts.map((w) => w.amplitude * Math.sin(w.phase));
    this._fftCache = { real: [...real], imag: [...imag] };
    return this._fftCache;
  }

  totalTransmission(): number {
    return this._results.reduce((s, r) => s + r.transmission, 0);
  }

  totalReflection(): number {
    return this._results.reduce((s, r) => s + r.reflection, 0);
  }

  coherenceLength(): number {
    if (this._wavefronts.length < 2) return 0;
    let sum = 0;
    for (let i = 1; i < this._wavefronts.length; i++) {
      sum += Math.abs(this._wavefronts[i].position - this._wavefronts[i - 1].position);
    }
    return sum / (this._wavefronts.length - 1);
  }

  report(): Record<string, unknown> {
    return {
      waves: this._wavefronts.length,
      barrier: this._barrierPosition,
      impedance: this._barrierImpedance,
      results: this._results.length,
      transmission: this.totalTransmission(),
      reflection: this.totalReflection(),
      coherence: this.coherenceLength(),
    };
  }
}
