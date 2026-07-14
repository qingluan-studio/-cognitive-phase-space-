/**
 * 返祖触发器：出现祖先特征的现象。
 * 在某些条件下，本应被现代模块覆盖的祖先特征会重新出现并暂时主导行为。
 */

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

  registerTrait(trait: AtavisticTrait): void {
    trait.currentlyActive = false;
    this._traits.set(trait.id, trait);
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
}
