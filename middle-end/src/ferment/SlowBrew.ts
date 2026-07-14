export interface BrewReaction {
  reactant: string;
  product: string;
  progress: number;
  activationEnergy: number;
  temperature: number;
}

export interface BrewSnapshot {
  reactant: string;
  concentration: number;
  rateConstant: number;
  halfLife: number;
  timestamp: number;
}

export class SlowBrew {
  private _reactions: BrewReaction[] = [];
  private _snapshots: BrewSnapshot[] = [];
  private _temperature: number = 298;
  private _arrheniusPrefactor: number = 1e12;
  private _gasConstant: number = 8.314;
  private _state: Record<string, unknown> = {};
  private _rateHistory: number[] = [];
  private _equilibriumConstants: Map<string, number> = new Map();

  get reactionCount(): number {
    return this._reactions.length;
  }

  get temperature(): number {
    return this._temperature;
  }

  startReaction(reactant: string, product: string, activationEnergy: number, initialProgress: number = 0): BrewReaction {
    const reaction: BrewReaction = {
      reactant,
      product,
      progress: initialProgress,
      activationEnergy,
      temperature: this._temperature,
    };
    this._reactions.push(reaction);
    this._equilibriumConstants.set(`${reactant}->${product}`, Math.exp(-activationEnergy / (this._gasConstant * this._temperature)));
    return reaction;
  }

  private _computeRateConstant(activationEnergy: number): number {
    return this._arrheniusPrefactor * Math.exp(-activationEnergy / (this._gasConstant * this._temperature));
  }

  step(dt: number = 1): BrewSnapshot[] {
    const snaps: BrewSnapshot[] = [];
    for (const reaction of this._reactions) {
      const k = this._computeRateConstant(reaction.activationEnergy);
      const remaining = 1 - reaction.progress;
      const rate = k * remaining;
      reaction.progress += rate * dt;
      reaction.progress = Math.min(1, Math.max(0, reaction.progress));
      reaction.temperature = this._temperature;
      const halfLife = remaining > 0 ? Math.log(2) / k : 0;
      const snapshot: BrewSnapshot = {
        reactant: reaction.reactant,
        concentration: remaining,
        rateConstant: k,
        halfLife,
        timestamp: Date.now(),
      };
      this._snapshots.push(snapshot);
      if (this._snapshots.length > 200) this._snapshots.shift();
      snaps.push(snapshot);
      this._rateHistory.push(rate);
      if (this._rateHistory.length > 100) this._rateHistory.shift();
    }
    return snaps;
  }

  setTemperature(temp: number): void {
    this._temperature = Math.max(200, temp);
    for (const reaction of this._reactions) {
      this._equilibriumConstants.set(
        `${reaction.reactant}->${reaction.product}`,
        Math.exp(-reaction.activationEnergy / (this._gasConstant * this._temperature))
      );
    }
  }

  computeHalfLife(reactionIndex: number): number {
    const reaction = this._reactions[reactionIndex];
    if (!reaction) return 0;
    const k = this._computeRateConstant(reaction.activationEnergy);
    return k > 0 ? Math.log(2) / k : 0;
  }

  computeTimeToCompletion(reactionIndex: number, threshold: number = 0.99): number {
    const reaction = this._reactions[reactionIndex];
    if (!reaction) return 0;
    const k = this._computeRateConstant(reaction.activationEnergy);
    if (k <= 0) return Infinity;
    return -Math.log(1 - threshold) / k;
  }

  averageProgress(): number {
    if (this._reactions.length === 0) return 0;
    return this._reactions.reduce((acc, r) => acc + r.progress, 0) / this._reactions.length;
  }

  completedReactions(): BrewReaction[] {
    return this._reactions.filter(r => r.progress >= 0.99);
  }

  getSnapshots(limit: number = 50): BrewSnapshot[] {
    return this._snapshots.slice(-limit);
  }

  getRateHistory(): number[] {
    return [...this._rateHistory];
  }

  equilibriumConstant(reactant: string, product: string): number {
    return this._equilibriumConstants.get(`${reactant}->${product}`) ?? 0;
  }

  activationEnergyProfile(): Record<string, number> {
    const profile: Record<string, number> = {};
    for (const r of this._reactions) {
      profile[r.reactant] = r.activationEnergy;
    }
    return profile;
  }

  setArrheniusPrefactor(prefactor: number): void {
    this._arrheniusPrefactor = Math.max(1, prefactor);
  }

  fastestReaction(): BrewReaction | null {
    if (this._reactions.length === 0) return null;
    return this._reactions.reduce((best, r) =>
      this._computeRateConstant(r.activationEnergy) > this._computeRateConstant(best.activationEnergy) ? r : best
    );
  }

  clear(): void {
    this._reactions = [];
    this._snapshots = [];
    this._rateHistory = [];
    this._equilibriumConstants.clear();
  }

  brewReport(): Record<string, unknown> {
    return {
      reactionCount: this._reactions.length,
      temperature: this._temperature.toFixed(2),
      averageProgress: this.averageProgress().toFixed(4),
      completedCount: this.completedReactions().length,
      arrheniusPrefactor: this._arrheniusPrefactor.toFixed(2),
      equilibriumConstants: Object.fromEntries(this._equilibriumConstants),
      state: this._state,
    };
  }
}
