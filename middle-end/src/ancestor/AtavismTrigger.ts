export interface AtavisticTrait {
  id: string;
  name: string;
  dormantSince: number;
  triggerConditions: string[];
  currentlyActive: boolean;
}

export interface AtavismEpisode {
  traitId: string;
  triggeredAt: number;
  duration: number;
  intensity: number;
}

export class AtavismTrigger {
  private _traits: Map<string, AtavisticTrait> = new Map();
  private _episodes: AtavismEpisode[] = [];
  private _triggerProbability = 0.2;
  private _maxEpisodes = 100;
  private _markovTransition: Map<string, Map<string, number>> = new Map();
  private _activationEntropy: number[] = [];

  registerTrait(trait: AtavisticTrait): void {
    trait.currentlyActive = false;
    this._traits.set(trait.id, trait);
    if (!this._markovTransition.has(trait.id)) {
      this._markovTransition.set(trait.id, new Map());
    }
  }

  evaluate(condition: string): AtavismEpisode | null {
    for (const trait of this._traits.values()) {
      if (trait.currentlyActive) continue;
      const matches = trait.triggerConditions.some(c => condition.includes(c));
      if (matches && Math.random() < this._triggerProbability) {
        trait.currentlyActive = true;
        trait.dormantSince = Date.now();
        const episode: AtavismEpisode = {
          traitId: trait.id,
          triggeredAt: Date.now(),
          duration: 1000 + Math.random() * 4000,
          intensity: Math.random(),
        };
        this._episodes.push(episode);
        if (this._episodes.length > this._maxEpisodes) this._episodes.shift();
        this._updateMarkovChain(episode.traitId);
        this._activationEntropy.push(episode.intensity);
        if (this._activationEntropy.length > 50) this._activationEntropy.shift();
        return episode;
      }
    }
    return null;
  }

  settle(traitId: string): boolean {
    const trait = this._traits.get(traitId);
    if (!trait || !trait.currentlyActive) return false;
    trait.currentlyActive = false;
    return true;
  }

  settleAll(): number {
    let count = 0;
    for (const trait of this._traits.values()) {
      if (trait.currentlyActive) {
        trait.currentlyActive = false;
        count++;
      }
    }
    return count;
  }

  setTriggerProbability(value: number): void {
    this._triggerProbability = Math.max(0, Math.min(1, value));
  }

  getActiveTraits(): AtavisticTrait[] {
    return Array.from(this._traits.values()).filter(t => t.currentlyActive);
  }

  getTrait(id: string): AtavisticTrait | null {
    return this._traits.get(id) ?? null;
  }

  getEpisodes(limit: number = 50): AtavismEpisode[] {
    return this._episodes.slice(-limit);
  }

  get traitCount(): number {
    return this._traits.size;
  }

  computeActivationEntropy(): number {
    if (this._activationEntropy.length === 0) return 0;
    const mean = this._activationEntropy.reduce((a, b) => a + b, 0) / this._activationEntropy.length;
    const variance = this._activationEntropy.reduce((s, v) => s + (v - mean) ** 2, 0) / this._activationEntropy.length;
    return 0.5 * Math.log2(2 * Math.PI * Math.E * Math.max(variance, 1e-10));
  }

  predictNextTrait(currentTraitId: string): string | null {
    const transitions = this._markovTransition.get(currentTraitId);
    if (!transitions || transitions.size === 0) return null;
    let total = 0;
    for (const v of transitions.values()) total += v;
    const r = Math.random() * total;
    let cum = 0;
    for (const [id, prob] of transitions) {
      cum += prob;
      if (r <= cum) return id;
    }
    return null;
  }

  private _updateMarkovChain(traitId: string): void {
    if (this._episodes.length < 2) return;
    const prev = this._episodes[this._episodes.length - 2].traitId;
    const trans = this._markovTransition.get(prev);
    if (trans) {
      trans.set(traitId, (trans.get(traitId) ?? 0) + 1);
    }
  }
}
