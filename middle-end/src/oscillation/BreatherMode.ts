/**
 * 呼吸模：周期性起伏而不衰减。
 * 维持一种能量不衰减的周期性起伏模式，类似非线性系统中的呼吸子解。
 */

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
    const value = profile.carrier * envelope * this._sustainFactor * Math.cos(profile.carrier * t);
    profile.energy = Math.abs(value);
    const sample: BreathingSample = {
      timestamp: Date.now(),
      value,
      profileId: profile.id,
    };
    this._samples.push(sample);
    if (this._samples.length > this._maxSamples) this._samples.shift();
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
}
