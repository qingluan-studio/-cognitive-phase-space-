export interface AharonovBohmData {
  flux: number;
  phase: number;
  interference: number;
  pathDifference: number;
  observable: boolean;
}

export class AharonovBohm {
  private _flux: number;
  private _phase: number;
  private _interference: number;
  private _pathDifference: number;
  private _observable: boolean;
  private _vectorPotential: number;
  private _wavefunction1: { amplitude: number; phase: number };
  private _wavefunction2: { amplitude: number; phase: number };
  private _fluxQuantum: number;

  constructor(flux: number = 0) {
    this._flux = flux;
    this._phase = 0;
    this._interference = 0;
    this._pathDifference = 0;
    this._observable = false;
    this._vectorPotential = 0;
    this._wavefunction1 = { amplitude: 1, phase: 0 };
    this._wavefunction2 = { amplitude: 1, phase: 0 };
    this._fluxQuantum = 2.067833848e-15;
  }

  get flux(): number {
    return this._flux;
  }

  get phase(): number {
    return this._phase;
  }

  get interference(): number {
    return this._interference;
  }

  get observable(): boolean {
    return this._observable;
  }

  public setFlux(value: number): void {
    this._flux = value;
    this._computePhase();
  }

  private _computePhase(): void {
    this._phase = this._flux / this._fluxQuantum * 2 * Math.PI;
  }

  public computeVectorPotential(radius: number): number {
    if (radius <= 0) return 0;
    this._vectorPotential = this._flux / (2 * Math.PI * radius);
    return this._vectorPotential;
  }

  public computePhaseShift(pathLength: number, charge: number): number {
    const hbar = 1.054571817e-34;
    return charge * this._vectorPotential * pathLength / hbar;
  }

  public interfere(): number {
    const totalPhase = this._wavefunction1.phase - this._wavefunction2.phase + this._phase;
    const amplitude1 = this._wavefunction1.amplitude;
    const amplitude2 = this._wavefunction2.amplitude;
    this._interference = amplitude1 * amplitude1 + amplitude2 * amplitude2 + 2 * amplitude1 * amplitude2 * Math.cos(totalPhase);
    this._observable = Math.abs(this._interference - (amplitude1 * amplitude1 + amplitude2 * amplitude2)) > 0.001;
    return this._interference;
  }

  public setWavefunctions(
    amp1: number, phase1: number,
    amp2: number, phase2: number
  ): void {
    this._wavefunction1 = { amplitude: amp1, phase: phase1 };
    this._wavefunction2 = { amplitude: amp2, phase: phase2 };
  }

  public computeFluxQuantization(): number {
    return Math.round(this._flux / this._fluxQuantum) * this._fluxQuantum;
  }

  public report(): AharonovBohmData {
    return {
      flux: this._flux,
      phase: this._phase,
      interference: this._interference,
      pathDifference: this._pathDifference,
      observable: this._observable,
    };
  }

  public setPathDifference(value: number): void {
    this._pathDifference = value;
  }

  public isGaugeInvariant(): boolean {
    return this._phase % (2 * Math.PI) === 0;
  }

  public computeOscillationPeriod(): number {
    return this._fluxQuantum;
  }

  public reset(): void {
    this._phase = 0;
    this._interference = 0;
    this._observable = false;
    this._vectorPotential = 0;
  }
}
