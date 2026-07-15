export interface BarrierProfile {
  width: number;
  height: number;
  position: number;
  shape: 'rectangular' | 'triangular' | 'gaussian';
}

export interface TunnelingResult {
  transmissionCoefficient: number;
  reflectionCoefficient: number;
  tunnelingTime: number;
  energy: number;
}

export class QuantumTunneling {
  private _barrier: BarrierProfile;
  private _particleMass: number;
  private _particleEnergy: number;
  private _planckConstant: number;
  private _barrierHistory: BarrierProfile[];
  private _transmissionHistory: number[];
  private _waveNumber: number;
  private _decayConstant: number;
  private _attempts: number;

  constructor(mass: number = 1.0, energy: number = 0.5) {
    this._particleMass = Math.max(1e-10, mass);
    this._particleEnergy = Math.max(1e-10, energy);
    this._planckConstant = 1.054571817e-34;
    this._barrier = { width: 1.0, height: 1.0, position: 0, shape: 'rectangular' };
    this._barrierHistory = [];
    this._transmissionHistory = [];
    this._waveNumber = this._computeWaveNumber();
    this._decayConstant = this._computeDecayConstant();
    this._attempts = 0;
  }

  get particleMass(): number {
    return this._particleMass;
  }

  get particleEnergy(): number {
    return this._particleEnergy;
  }

  get barrier(): BarrierProfile {
    return { ...this._barrier };
  }

  get transmissionCoefficient(): number {
    return this._computeTransmission();
  }

  private _computeWaveNumber(): number {
    return Math.sqrt(2 * this._particleMass * this._particleEnergy) / this._planckConstant;
  }

  private _computeDecayConstant(): number {
    const deltaE = Math.max(1e-20, this._barrier.height - this._particleEnergy);
    return Math.sqrt(2 * this._particleMass * deltaE) / this._planckConstant;
  }

  public setBarrier(width: number, height: number, position: number = 0, shape: BarrierProfile['shape'] = 'rectangular'): void {
    this._barrier = { width: Math.max(1e-10, width), height: Math.max(0, height), position, shape };
    this._decayConstant = this._computeDecayConstant();
    this._barrierHistory.push({ ...this._barrier });
    if (this._barrierHistory.length > 100) this._barrierHistory.shift();
  }

  public setParticleProperties(mass: number, energy: number): void {
    this._particleMass = Math.max(1e-10, mass);
    this._particleEnergy = Math.max(1e-10, energy);
    this._waveNumber = this._computeWaveNumber();
    this._decayConstant = this._computeDecayConstant();
  }

  private _computeTransmission(): number {
    const E = this._particleEnergy;
    const V0 = this._barrier.height;
    const L = this._barrier.width;
    if (E >= V0) {
      const kPrime = Math.sqrt(2 * this._particleMass * (E - V0)) / this._planckConstant;
      const k = this._waveNumber;
      const term = (k * k - kPrime * kPrime) / (2 * k * kPrime);
      const sinTerm = Math.sin(kPrime * L);
      const denom = 1 + term * term * sinTerm * sinTerm;
      return 1 / denom;
    }
    const kappa = this._decayConstant;
    const sinhTerm = Math.sinh(kappa * L);
    const k = this._waveNumber;
    const term = (k * k + kappa * kappa) / (2 * k * kappa);
    const denom = 1 + term * term * sinhTerm * sinhTerm;
    return 1 / denom;
  }

  public computeWKBTransmission(): number {
    const E = this._particleEnergy;
    const V0 = this._barrier.height;
    if (E >= V0) return 1.0;
    const integral = this._computeActionIntegral();
    return Math.exp(-2 * integral);
  }

  private _computeActionIntegral(): number {
    const E = this._particleEnergy;
    const V0 = this._barrier.height;
    const L = this._barrier.width;
    const shape = this._barrier.shape;
    let integral = 0;
    const steps = 1000;
    for (let i = 0; i < steps; i++) {
      const x = (i / steps) * L;
      let Vx = V0;
      if (shape === 'triangular') {
        Vx = V0 * (1 - x / L);
      } else if (shape === 'gaussian') {
        const mu = L / 2;
        const sigma = L / 4;
        Vx = V0 * Math.exp(-((x - mu) * (x - mu)) / (2 * sigma * sigma));
      }
      if (Vx > E) {
        integral += Math.sqrt(2 * this._particleMass * (Vx - E)) * (L / steps);
      }
    }
    return integral / this._planckConstant;
  }

  public computeReflection(): number {
    return 1 - this._computeTransmission();
  }

  public computeTunnelingTime(): number {
    const T = this._computeTransmission();
    if (T <= 0) return Infinity;
    const v = this._planckConstant * this._waveNumber / this._particleMass;
    const L = this._barrier.width;
    return L / Math.max(v * T, 1e-20);
  }

  public simulateTunnelingAttempts(maxAttempts: number): TunnelingResult {
    let success = false;
    let attempts = 0;
    const T = this._computeTransmission();
    while (!success && attempts < maxAttempts) {
      attempts++;
      if (Math.random() < T) {
        success = true;
      }
    }
    this._attempts += attempts;
    this._transmissionHistory.push(T);
    if (this._transmissionHistory.length > 200) this._transmissionHistory.shift();
    return {
      transmissionCoefficient: T,
      reflectionCoefficient: 1 - T,
      tunnelingTime: this.computeTunnelingTime(),
      energy: this._particleEnergy,
    };
  }

  public computeResonantTransmission(energies: number[]): number[] {
    const originalEnergy = this._particleEnergy;
    const results: number[] = [];
    for (const E of energies) {
      this._particleEnergy = E;
      this._waveNumber = this._computeWaveNumber();
      this._decayConstant = this._computeDecayConstant();
      results.push(this._computeTransmission());
    }
    this._particleEnergy = originalEnergy;
    this._waveNumber = this._computeWaveNumber();
    this._decayConstant = this._computeDecayConstant();
    return results;
  }

  public scanBarrierWidth(widths: number[]): TunnelingResult[] {
    const originalWidth = this._barrier.width;
    const results: TunnelingResult[] = [];
    for (const w of widths) {
      this._barrier.width = w;
      this._decayConstant = this._computeDecayConstant();
      results.push({
        transmissionCoefficient: this._computeTransmission(),
        reflectionCoefficient: this.computeReflection(),
        tunnelingTime: this.computeTunnelingTime(),
        energy: this._particleEnergy,
      });
    }
    this._barrier.width = originalWidth;
    this._decayConstant = this._computeDecayConstant();
    return results;
  }

  public getBarrierHistory(): BarrierProfile[] {
    return this._barrierHistory.map(b => ({ ...b }));
  }

  public getTransmissionHistory(): number[] {
    return [...this._transmissionHistory];
  }

  public getAttempts(): number {
    return this._attempts;
  }

  public computePhaseShift(): number {
    const E = this._particleEnergy;
    const V0 = this._barrier.height;
    const L = this._barrier.width;
    if (E >= V0) {
      const kPrime = Math.sqrt(2 * this._particleMass * (E - V0)) / this._planckConstant;
      return Math.atan((this._waveNumber / kPrime - kPrime / this._waveNumber) * Math.tan(kPrime * L) / 2);
    }
    const kappa = this._decayConstant;
    return Math.atan((this._waveNumber / kappa + kappa / this._waveNumber) * Math.tanh(kappa * L) / 2);
  }

  public reset(): void {
    this._barrier = { width: 1.0, height: 1.0, position: 0, shape: 'rectangular' };
    this._barrierHistory = [];
    this._transmissionHistory = [];
    this._attempts = 0;
    this._waveNumber = this._computeWaveNumber();
    this._decayConstant = this._computeDecayConstant();
  }
}
