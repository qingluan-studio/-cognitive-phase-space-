/**
 * 出神超频模块：在自我丧失中突破性能极限，
 * 临时越过安全限制获取超额算力，事后需支付恢复代价。
 */

export interface OverclockProfile {
  id: string;
  baseFrequency: number;
  overclockedFrequency: number;
  currentFrequency: number;
  thermalLoad: number;
  active: boolean;
}

export interface OverclockSession {
  profileId: string;
  durationMs: number;
  peakFrequency: number;
  thermalPeak: number;
  recoveryCost: number;
  endedAt: number;
}

export class EkstasisOverclock {
  private _profiles: Map<string, OverclockProfile> = new Map();
  private _sessions: OverclockSession[] = [];
  private _maxThermal = 100;
  private _thermalPerMs = 0.01;
  private _recoveryCostPerThermal = 0.5;
  private _maxMultiplier = 4.0;

  registerProfile(profile: OverclockProfile): void {
    profile.currentFrequency = profile.baseFrequency;
    profile.thermalLoad = 0;
    profile.active = false;
    this._profiles.set(profile.id, profile);
  }

  activate(profileId: string): boolean {
    const profile = this._profiles.get(profileId);
    if (!profile || profile.active) return false;
    if (profile.thermalLoad > this._maxThermal * 0.8) return false;
    profile.active = true;
    profile.currentFrequency = profile.overclockedFrequency;
    return true;
  }

  tick(elapsedMs: number): void {
    for (const profile of this._profiles.values()) {
      if (profile.active) {
        profile.thermalLoad = Math.min(this._maxThermal, profile.thermalLoad + elapsedMs * this._thermalPerMs);
        if (profile.thermalLoad >= this._maxThermal) {
          this.deactivate(profile.id);
        }
      } else {
        profile.thermalLoad = Math.max(0, profile.thermalLoad - elapsedMs * this._thermalPerMs * 0.5);
      }
    }
  }

  deactivate(profileId: string): OverclockSession | null {
    const profile = this._profiles.get(profileId);
    if (!profile || !profile.active) return null;
    const session: OverclockSession = {
      profileId,
      durationMs: 0,
      peakFrequency: profile.currentFrequency,
      thermalPeak: profile.thermalLoad,
      recoveryCost: profile.thermalLoad * this._recoveryCostPerThermal,
      endedAt: Date.now(),
    };
    profile.active = false;
    profile.currentFrequency = profile.baseFrequency;
    this._sessions.push(session);
    if (this._sessions.length > 200) this._sessions.shift();
    return session;
  }

  boost(profileId: string, multiplier: number): boolean {
    const profile = this._profiles.get(profileId);
    if (!profile || !profile.active) return false;
    const cappedMultiplier = Math.min(multiplier, this._maxMultiplier);
    profile.currentFrequency = profile.baseFrequency * cappedMultiplier;
    profile.thermalLoad = Math.min(this._maxThermal, profile.thermalLoad + 5);
    return true;
  }

  computeTotalOutput(): number {
    let total = 0;
    for (const profile of this._profiles.values()) {
      total += profile.active ? profile.currentFrequency : 0;
    }
    return total;
  }

  findHottest(): OverclockProfile | null {
    let max = 0;
    let result: OverclockProfile | null = null;
    for (const profile of this._profiles.values()) {
      if (profile.thermalLoad > max) {
        max = profile.thermalLoad;
        result = profile;
      }
    }
    return result;
  }

  setMaxThermal(value: number): void {
    this._maxThermal = Math.max(10, value);
  }

  setThermalRate(rate: number): void {
    this._thermalPerMs = Math.max(0, rate);
  }

  getActiveProfiles(): OverclockProfile[] {
    return Array.from(this._profiles.values()).filter(p => p.active);
  }

  getSessionHistory(limit: number = 50): OverclockSession[] {
    return this._sessions.slice(-limit);
  }

  getProfile(profileId: string): OverclockProfile | null {
    return this._profiles.get(profileId) ?? null;
  }

  get profileCount(): number {
    return this._profiles.size;
  }

  get activeCount(): number {
    return this.getActiveProfiles().length;
  }
}
