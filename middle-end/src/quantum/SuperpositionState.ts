export interface Amplitude {
  real: number;
  imag: number;
}

export interface SuperpositionData {
  probabilities: number[];
  phases: number[];
  coherence: number;
  basis: string;
}

export class SuperpositionState {
  private _amplitudes: Amplitude[];
  private _basisSize: number;
  private _coherence: number;
  private _phaseLock: number;
  private _interferencePattern: number[];
  private _basis: string;
  private _history: SuperpositionData[];
  private _decoherenceRate: number;

  constructor(basisSize: number = 2) {
    this._basisSize = Math.max(2, basisSize);
    this._amplitudes = this._initializeAmplitudes();
    this._coherence = 1.0;
    this._phaseLock = 0;
    this._interferencePattern = [];
    this._basis = 'computational';
    this._history = [];
    this._decoherenceRate = 0.001;
  }

  get basisSize(): number {
    return this._basisSize;
  }

  get coherence(): number {
    return this._coherence;
  }

  get phaseLock(): number {
    return this._phaseLock;
  }

  get basis(): string {
    return this._basis;
  }

  private _initializeAmplitudes(): Amplitude[] {
    const amps: Amplitude[] = [];
    const invSqrt = 1 / Math.sqrt(this._basisSize);
    for (let i = 0; i < this._basisSize; i++) {
      amps.push({ real: invSqrt, imag: 0 });
    }
    return amps;
  }

  public setAmplitude(index: number, real: number, imag: number): void {
    if (index < 0 || index >= this._basisSize) return;
    this._amplitudes[index] = { real, imag };
    this._normalize();
    this._updateCoherence();
  }

  private _normalize(): void {
    let norm = 0;
    for (const amp of this._amplitudes) {
      norm += amp.real * amp.real + amp.imag * amp.imag;
    }
    if (norm === 0) return;
    const scale = 1 / Math.sqrt(norm);
    for (const amp of this._amplitudes) {
      amp.real *= scale;
      amp.imag *= scale;
    }
  }

  private _updateCoherence(): void {
    let sumCross = 0;
    for (let i = 0; i < this._basisSize; i++) {
      for (let j = i + 1; j < this._basisSize; j++) {
        const cross =
          this._amplitudes[i].real * this._amplitudes[j].real +
          this._amplitudes[i].imag * this._amplitudes[j].imag;
        sumCross += Math.abs(cross);
      }
    }
    const maxCross = (this._basisSize * (this._basisSize - 1)) / 2;
    this._coherence = maxCross > 0 ? sumCross / maxCross : 1;
  }

  public getProbabilities(): number[] {
    return this._amplitudes.map(amp => amp.real * amp.real + amp.imag * amp.imag);
  }

  public getPhases(): number[] {
    return this._amplitudes.map(amp => Math.atan2(amp.imag, amp.real));
  }

  public measure(outcome?: number): number {
    const probs = this.getProbabilities();
    let result: number;
    if (outcome !== undefined && outcome >= 0 && outcome < this._basisSize) {
      result = outcome;
    } else {
      const rand = Math.random();
      let cumulative = 0;
      result = this._basisSize - 1;
      for (let i = 0; i < this._basisSize; i++) {
        cumulative += probs[i];
        if (rand < cumulative) {
          result = i;
          break;
        }
      }
    }
    for (let i = 0; i < this._basisSize; i++) {
      if (i === result) {
        this._amplitudes[i] = { real: 1, imag: 0 };
      } else {
        this._amplitudes[i] = { real: 0, imag: 0 };
      }
    }
    this._coherence = 0;
    this._phaseLock = 0;
    this._recordState();
    return result;
  }

  public applyPhaseShift(index: number, phase: number): void {
    if (index < 0 || index >= this._basisSize) return;
    const amp = this._amplitudes[index];
    const cosP = Math.cos(phase);
    const sinP = Math.sin(phase);
    const newReal = amp.real * cosP - amp.imag * sinP;
    const newImag = amp.real * sinP + amp.imag * cosP;
    amp.real = newReal;
    amp.imag = newImag;
    this._updateCoherence();
  }

  public applyHadamard(): void {
    if (this._basisSize !== 2) return;
    const invSqrt2 = 1 / Math.sqrt(2);
    const a = this._amplitudes[0];
    const b = this._amplitudes[1];
    const newA = {
      real: invSqrt2 * (a.real + b.real),
      imag: invSqrt2 * (a.imag + b.imag),
    };
    const newB = {
      real: invSqrt2 * (a.real - b.real),
      imag: invSqrt2 * (a.imag - b.imag),
    };
    this._amplitudes[0] = newA;
    this._amplitudes[1] = newB;
    this._updateCoherence();
  }

  public computeInterference(slits: number, screenResolution: number): number[] {
    const pattern: number[] = new Array(screenResolution).fill(0);
    const probs = this.getProbabilities();
    const phases = this.getPhases();
    for (let x = 0; x < screenResolution; x++) {
      const pos = (x / screenResolution) * 4 * Math.PI - 2 * Math.PI;
      let intensity = 0;
      for (let s = 0; s < slits; s++) {
        const slitPhase = (s / Math.max(1, slits - 1)) * Math.PI;
        const pathDiff = Math.sin(pos - slitPhase);
        for (let i = 0; i < this._basisSize; i++) {
          const wave = probs[i] * Math.cos(pathDiff * 10 + phases[i]);
          intensity += wave * wave;
        }
      }
      pattern[x] = intensity;
    }
    this._interferencePattern = [...pattern];
    return pattern;
  }

  public tickDecoherence(): void {
    this._coherence *= 1 - this._decoherenceRate;
    this._coherence = Math.max(0, this._coherence);
    for (let i = 0; i < this._basisSize; i++) {
      const decay = Math.exp(-this._decoherenceRate * i);
      this._amplitudes[i].real *= decay;
      this._amplitudes[i].imag *= decay;
    }
    this._normalize();
    this._phaseLock *= 1 - this._decoherenceRate * 0.5;
  }

  public setDecoherenceRate(rate: number): void {
    this._decoherenceRate = Math.max(0, Math.min(1, rate));
  }

  public getInterferencePattern(): number[] {
    return [...this._interferencePattern];
  }

  public swapBasis(newBasis: string): void {
    if (newBasis === this._basis) return;
    if (this._basisSize === 2 && newBasis === 'hadamard') {
      this.applyHadamard();
      this._basis = newBasis;
    } else if (newBasis === 'computational') {
      if (this._basis === 'hadamard') {
        this.applyHadamard();
      }
      this._basis = newBasis;
    } else {
      this._basis = newBasis;
    }
    this._recordState();
  }

  public computeExpectationValue(operator: number[][]): number {
    if (operator.length !== this._basisSize || operator.some(row => row.length !== this._basisSize)) {
      return 0;
    }
    let expectation = 0;
    for (let i = 0; i < this._basisSize; i++) {
      for (let j = 0; j < this._basisSize; j++) {
        const bra = { real: this._amplitudes[i].real, imag: -this._amplitudes[i].imag };
        const ket = this._amplitudes[j];
        const op = operator[i][j];
        expectation += op * (bra.real * ket.real - bra.imag * ket.imag);
      }
    }
    return expectation;
  }

  private _recordState(): void {
    const data: SuperpositionData = {
      probabilities: this.getProbabilities(),
      phases: this.getPhases(),
      coherence: this._coherence,
      basis: this._basis,
    };
    this._history.push(data);
    if (this._history.length > 100) this._history.shift();
  }

  public getHistory(): SuperpositionData[] {
    return this._history.map(h => ({ ...h }));
  }

  public reset(): void {
    this._amplitudes = this._initializeAmplitudes();
    this._coherence = 1.0;
    this._phaseLock = 0;
    this._interferencePattern = [];
    this._basis = 'computational';
    this._history = [];
  }
}
