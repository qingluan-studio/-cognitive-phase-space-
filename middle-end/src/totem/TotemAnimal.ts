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
  private _traitVectors: Map<string, number[]> = new Map();
  private _interactionMatrix: Map<string, Map<string, number>> = new Map();

  constructor() {
    this._animalTraits.set('wolf', ['loyal', 'instinctive', 'pack-oriented', 'nocturnal']);
    this._animalTraits.set('eagle', ['visionary', 'independent', 'soaring', 'precise']);
    this._animalTraits.set('bear', ['protective', 'hibernating', 'powerful', 'patient']);
    this._animalTraits.set('serpent', ['transformational', 'cunning', 'cyclic', 'medicinal']);
    this._animalTraits.set('owl', ['wise', 'silent', 'observant', 'mysterious']);
    this._buildTraitVectors();
  }

  private _buildTraitVectors(): void {
    const allTraits = new Set<string>();
    for (const traits of this._animalTraits.values()) {
      for (const t of traits) allTraits.add(t);
    }
    const traitList = Array.from(allTraits);
    for (const [animal, traits] of this._animalTraits) {
      const vec = traitList.map(t => traits.includes(t) ? 1 : 0);
      this._traitVectors.set(animal, vec);
    }
    for (const a of this._animalTraits.keys()) {
      const row = new Map<string, number>();
      for (const b of this._animalTraits.keys()) {
        row.set(b, this._cosineSimilarity(this._traitVectors.get(a)!, this._traitVectors.get(b)!));
      }
      this._interactionMatrix.set(a, row);
    }
  }

  private _cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    return na > 0 && nb > 0 ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
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
    const logGain = Math.log1p(amount) / Math.log(2);
    totem.affinity = Math.min(this._maxAffinity, totem.affinity + logGain * 0.1);
    return true;
  }

  invokeBehavior(totemId: string, behavior: string, intensity: number): TotemBehavior | null {
    const totem = this._totems.get(totemId);
    if (!totem) return null;
    const traitMatch = totem.traits.some(t => behavior.toLowerCase().includes(t.toLowerCase()));
    const effectiveIntensity = traitMatch ? intensity * totem.affinity : intensity * 0.3 * Math.exp(-totem.affinity);
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
    this._buildTraitVectors();
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

  computeAnimalCompatibility(animalA: string, animalB: string): number {
    return this._interactionMatrix.get(animalA)?.get(animalB) ?? 0;
  }

  getAffinityDistribution(): { mean: number; variance: number } {
    const affinities = Array.from(this._totems.values()).map(t => t.affinity);
    if (affinities.length === 0) return { mean: 0, variance: 0 };
    const mean = affinities.reduce((a, b) => a + b, 0) / affinities.length;
    const variance = affinities.reduce((a, b) => a + (b - mean) ** 2, 0) / affinities.length;
    return { mean, variance };
  }
}
