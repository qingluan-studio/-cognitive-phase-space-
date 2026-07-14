export interface BreatherProfile {
  id: string;
  baseFrequency: number;
  modulationDepth: number;
  carrier: number;
  energy: number;
}

export interface BreathingSample {
  timestamp: number;
  value: number;
  profileId: string;
}

export class BreatherMode {
  private _profiles: Map<string, BreatherProfile> = new Map();
  private _samples: BreathingSample[] = [];
  private _activeProfile: string | null = null;
  private _maxSamples = 500;
  private _sustainFactor = 1.0;
  private _floquetMultipliers: number[] = [];
  private _modulationInstabilityGain: number = 0.1;

  registerProfile(profile: BreatherProfile): void {
    this._profiles.set(profile.id, profile);
    if (this._activeProfile === null) this._activeProfile = profile.id;
  }

  activate(profileId: string): boolean {
    if (!this._profiles.has(profileId)) return false;
    this._activeProfile = profileId;
    return true;
  }

  breathe(t: number): BreathingSample | null {
    if (!this._activeProfile) return null;
    const profile = this._profiles.get(this._activeProfile);
    if (!profile) return null;
    const envelope = 1 + profile.modulationDepth * Math.sin(profile.baseFrequency * t);
    const dispersion = Math.cos(profile.carrier * t);
    const nonlinearity = this._computeNonlinearTerm(profile, envelope);
    const value = profile.carrier * envelope * this._sustainFactor * dispersion + nonlinearity;
    profile.energy = 0.5 * value * value + 0.5 * profile.carrier * profile.carrier * envelope * envelope;
    const sample: BreathingSample = {
      timestamp: Date.now(),
      value,
      profileId: profile.id,
    };
    this._samples.push(sample);
    if (this._samples.length > this._maxSamples) this._samples.shift();
    this._updateFloquet(profile, value);
    return sample;
  }

  adjustModulation(profileId: string, depth: number): BreatherProfile | null {
    const p = this._profiles.get(profileId);
    if (!p) return null;
    p.modulationDepth = Math.max(0, Math.min(2, depth));
    return p;
  }

  setSustain(factor: number): void {
    this._sustainFactor = Math.max(0, factor);
  }

  computeEnergySpectrum(): number[] {
    const spectrum: number[] = [];
    for (const profile of this._profiles.values()) {
      spectrum.push(profile.energy);
    }
    return spectrum;
  }

  computeModulationInstability(k: number): number {
    if (!this._activeProfile) return 0;
    const profile = this._profiles.get(this._activeProfile);
    if (!profile) return 0;
    const omega0 = profile.baseFrequency;
    const omegaK = omega0 + k * k * 0.5;
    const gain = k * Math.sqrt(omega0 * omega0 - 0.25 * k * k);
    return gain * profile.modulationDepth * this._modulationInstabilityGain;
  }

  computeFloquetStability(): number {
    if (this._floquetMultipliers.length === 0) return 0;
    const maxMultiplier = Math.max(...this._floquetMultipliers.map(Math.abs));
    return maxMultiplier > 1 ? -1 : 1;
  }

  getSamples(limit: number = 100): BreathingSample[] {
    return this._samples.slice(-limit);
  }

  getActiveProfile(): BreatherProfile | null {
    return this._activeProfile ? this._profiles.get(this._activeProfile) ?? null : null;
  }

  getProfileCount(): number {
    return this._profiles.size;
  }

  get sustainFactor(): number {
    return this._sustainFactor;
  }

  get floquetMultipliers(): number[] {
    return [...this._floquetMultipliers];
  }

  private _computeNonlinearTerm(profile: BreatherProfile, envelope: number): number {
    const chi3 = 0.01;
    return chi3 * profile.carrier * profile.carrier * profile.carrier * envelope * envelope * envelope;
  }

  private _updateFloquet(profile: BreatherProfile, value: number): void {
    const period = 2 * Math.PI / profile.baseFrequency;
    const jacobian = -profile.baseFrequency * profile.baseFrequency + 3 * 0.01 * value * value;
    const multiplier = Math.exp(jacobian * period);
    this._floquetMultipliers.push(multiplier);
    if (this._floquetMultipliers.length > 50) this._floquetMultipliers.shift();
  }
}
