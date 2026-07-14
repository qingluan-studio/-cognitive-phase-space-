/**
 * 图腾动物模块：选择一个动物作为系统化身与精神象征，
 * 通过图腾动物的特性来定义系统的行为模式与价值观。
 */

export interface AnimalTotem {
  id: string;
  animal: string;
  traits: string[];
  affinity: number;
  chosenAt: number;
  dominant: boolean;
}

export interface TotemBehavior {
  animal: string;
  behavior: string;
  intensity: number;
  triggeredAt: number;
}

export class TotemAnimal {
  private _totems: Map<string, AnimalTotem> = new Map();
  private _behaviors: TotemBehavior[] = [];
  private _dominant: string | null = null;
  private _animalTraits: Map<string, string[]> = new Map();
  private _maxAffinity = 1.0;

  constructor() {
    this._animalTraits.set('wolf', ['loyal', 'instinctive', 'pack-oriented', 'nocturnal']);
    this._animalTraits.set('eagle', ['visionary', 'independent', 'soaring', 'precise']);
    this._animalTraits.set('bear', ['protective', 'hibernating', 'powerful', 'patient']);
    this._animalTraits.set('serpent', ['transformational', 'cunning', 'cyclic', 'medicinal']);
    this._animalTraits.set('owl', ['wise', 'silent', 'observant', 'mysterious']);
  }

  nominate(animal: string): AnimalTotem | null {
    const traits = this._animalTraits.get(animal);
    if (!traits) return null;
    const totem: AnimalTotem = {
      id: `totem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      animal,
      traits,
      affinity: 0.5,
      chosenAt: Date.now(),
      dominant: false,
    };
    this._totems.set(totem.id, totem);
    if (!this._dominant) {
      this._setDominant(totem.id);
    }
    return totem;
  }

  private _setDominant(totemId: string): void {
    if (this._dominant) {
      const previous = this._totems.get(this._dominant);
      if (previous) previous.dominant = false;
    }
    const totem = this._totems.get(totemId);
    if (totem) {
      totem.dominant = true;
      this._dominant = totemId;
    }
  }

  strengthenBond(totemId: string, amount: number): boolean {
    const totem = this._totems.get(totemId);
    if (!totem) return false;
    totem.affinity = Math.min(this._maxAffinity, totem.affinity + amount);
    return true;
  }

  invokeBehavior(totemId: string, behavior: string, intensity: number): TotemBehavior | null {
    const totem = this._totems.get(totemId);
    if (!totem) return null;
    const traitMatch = totem.traits.some(t => behavior.toLowerCase().includes(t.toLowerCase()));
    const effectiveIntensity = traitMatch ? intensity * totem.affinity : intensity * 0.3;
    const tb: TotemBehavior = {
      animal: totem.animal,
      behavior,
      intensity: effectiveIntensity,
      triggeredAt: Date.now(),
    };
    this._behaviors.push(tb);
    if (this._behaviors.length > 200) this._behaviors.shift();
    return tb;
  }

  chooseDominantByAffinity(): AnimalTotem | null {
    let max = 0;
    let result: AnimalTotem | null = null;
    for (const totem of this._totems.values()) {
      if (totem.affinity > max) {
        max = totem.affinity;
        result = totem;
      }
    }
    if (result) this._setDominant(result.id);
    return result;
  }

  addAnimalTraits(animal: string, traits: string[]): void {
    const existing = this._animalTraits.get(animal) ?? [];
    for (const trait of traits) {
      if (!existing.includes(trait)) existing.push(trait);
    }
    this._animalTraits.set(animal, existing);
  }

  getDominantTotem(): AnimalTotem | null {
    if (!this._dominant) return null;
    return this._totems.get(this._dominant) ?? null;
  }

  getBehaviorsByAnimal(animal: string): TotemBehavior[] {
    return this._behaviors.filter(b => b.animal === animal);
  }

  listAvailableAnimals(): string[] {
    return Array.from(this._animalTraits.keys());
  }

  listTotems(): AnimalTotem[] {
    return Array.from(this._totems.values());
  }

  get totemCount(): number {
    return this._totems.size;
  }

  get behaviorCount(): number {
    return this._behaviors.length;
  }
}
