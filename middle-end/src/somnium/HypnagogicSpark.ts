export interface HypnagogicCapture {
  id: string;
  raw: string;
  intensity: number;
  capturedAt: number;
  ignited: boolean;
  tags: string[];
  coherence: number;
  phaseAngle: number;
}

export type ConsciousnessPhase = 'awake' | 'drowsy' | 'hypnagogic' | 'asleep';

export class HypnagogicSpark {
  private _sparks: HypnagogicCapture[] = [];
  private _phase: ConsciousnessPhase = 'awake';
  private _thetaPhase: number = 0;
  private _alphaPhase: number = 0;
  private _thetaFreq: number = 0.08;
  private _alphaFreq: number = 0.14;
  private _coupling: number = 0.3;
  private _captureThreshold: number = 0.6;
  private _decayRate: number = 0.015;
  private _noiseAmplitude: number = 0.08;

  drift(target: ConsciousnessPhase): ConsciousnessPhase {
    this._phase = target;
    const phaseFreq: Record<ConsciousnessPhase, { t: number; a: number; c: number }> = {
      awake: { t: 0.06, a: 0.18, c: 0.1 },
      drowsy: { t: 0.09, a: 0.12, c: 0.25 },
      hypnagogic: { t: 0.12, a: 0.08, c: 0.45 },
      asleep: { t: 0.15, a: 0.04, c: 0.6 },
    };
    const p = phaseFreq[target];
    this._thetaFreq += (p.t - this._thetaFreq) * 0.3;
    this._alphaFreq += (p.a - this._alphaFreq) * 0.3;
    this._coupling += (p.c - this._coupling) * 0.3;
    return this._phase;
  }

  capture(raw: string, tags: string[]): HypnagogicCapture | null {
    if (this._phase !== 'hypnagogic') return null;
    const coherence = this._computeCrossFrequencyCoupling();
    if (coherence < this._captureThreshold) return null;
    const intensity = this._modulationDepth(coherence);
    const spark: HypnagogicCapture = {
      id: `spark-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      raw,
      intensity,
      capturedAt: Date.now(),
      ignited: false,
      tags,
      coherence,
      phaseAngle: (this._thetaPhase + this._alphaPhase) / 2,
    };
    this._sparks.push(spark);
    this._perturbOscillators();
    return spark;
  }

  ignite(id: string): boolean {
    const s = this._sparks.find(x => x.id === id);
    if (!s || s.ignited) return false;
    s.ignited = true;
    s.intensity = Math.min(1, s.intensity * 1.4);
    return true;
  }

  evaluate(): { total: number; ignited: number; averageIntensity: number; netEnergy: number } {
    const total = this._sparks.length;
    const ignited = this._sparks.filter(s => s.ignited).length;
    const avg = total === 0 ? 0 : this._sparks.reduce((s, x) => s + x.intensity, 0) / total;
    const net = this._sparks.reduce((s, x) => s + (x.ignited ? x.intensity : -x.intensity * 0.3), 0);
    return { total, ignited, averageIntensity: avg, netEnergy: net };
  }

  extinguish(id: string): boolean {
    const s = this._sparks.find(x => x.id === id);
    if (!s || s.ignited) return false;
    s.intensity = 0;
    s.coherence = 0;
    return true;
  }

  tick(dt: number = 1): void {
    const thetaDrive = this._thetaFreq + this._coupling * Math.sin(this._alphaPhase - this._thetaPhase);
    const alphaDrive = this._alphaFreq + this._coupling * Math.sin(this._thetaPhase - this._alphaPhase) * 0.7;
    this._thetaPhase = (this._thetaPhase + thetaDrive * dt + this._gaussianNoise() * this._noiseAmplitude) % (Math.PI * 2);
    this._alphaPhase = (this._alphaPhase + alphaDrive * dt + this._gaussianNoise() * this._noiseAmplitude * 0.8) % (Math.PI * 2);
    for (const s of this._sparks) {
      if (!s.ignited && s.intensity > 0) {
        s.intensity = Math.max(0, s.intensity * (1 - this._decayRate * dt));
      }
    }
  }

  get intensity(): number {
    return this._computeCrossFrequencyCoupling();
  }

  get phase(): ConsciousnessPhase {
    return this._phase;
  }

  get thetaPhase(): number {
    return this._thetaPhase;
  }

  get alphaPhase(): number {
    return this._alphaPhase;
  }

  getCaptured(): HypnagogicCapture[] {
    return [...this._sparks];
  }

  setCaptureThreshold(threshold: number): void {
    this._captureThreshold = Math.max(0, Math.min(1, threshold));
  }

  private _computeCrossFrequencyCoupling(): number {
    const phaseDiff = this._thetaPhase - this._alphaPhase;
    const n = 20;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2;
      const thetaEnv = Math.cos(this._thetaPhase + t * this._thetaFreq / this._alphaFreq);
      const alphaAmp = Math.cos(this._alphaPhase + t);
      sum += thetaEnv * alphaAmp;
    }
    const coupling = Math.abs(sum / n);
    return Math.min(1, coupling * (1 + this._coupling));
  }

  private _modulationDepth(coherence: number): number {
    const base = coherence * 0.7;
    const harmonic = Math.sin(this._thetaPhase * 3) * 0.15;
    const amplified = base + harmonic * coherence;
    return Math.max(0, Math.min(1, amplified + this._gaussianNoise() * 0.05));
  }

  private _perturbOscillators(): void {
    const kick = 0.3 + Math.random() * 0.2;
    this._thetaPhase = (this._thetaPhase + kick) % (Math.PI * 2);
    this._alphaPhase = (this._alphaPhase - kick * 0.6) % (Math.PI * 2);
  }

  private _gaussianNoise(): number {
    const u1 = Math.random() || 1e-10;
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(Math.PI * 2 * u2);
  }
}
