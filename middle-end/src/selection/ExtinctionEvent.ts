/**
 * 灭绝事件：周期性大灭绝清除弱势模块。
 * 模拟周期性的大规模灭绝事件，按强度比例清除适应度最低的模块，给幸存者腾出空间。
 */

export interface ExtinctionEventData {
  id: string;
  intensity: number;
  eliminated: string[];
  survivors: string[];
  triggeredAt: number;
  cause: string;
}

export interface SpeciesEntry {
  id: string;
  name: string;
  fitness: number;
  population: number;
}

export class ExtinctionEvent {
  private _species: Map<string, SpeciesEntry> = new Map();
  private _events: ExtinctionEventData[] = [];
  private _periodCounter = 0;
  private _periodThreshold = 10;

  registerSpecies(species: SpeciesEntry): void {
    this._species.set(species.id, species);
  }

  tick(): ExtinctionEventData | null {
    this._periodCounter++;
    if (this._periodCounter < this._periodThreshold) return null;
    this._periodCounter = 0;
    return this.trigger('periodic', 0.5 + Math.random() * 0.4);
  }

  trigger(cause: string, intensity: number): ExtinctionEventData {
    const sorted = Array.from(this._species.values()).sort((a, b) => a.fitness - b.fitness);
    const eliminateCount = Math.floor(sorted.length * intensity);
    const eliminated: string[] = [];
    const survivors: string[] = [];
    for (let i = 0; i < sorted.length; i++) {
      if (i < eliminateCount) {
        eliminated.push(sorted[i].id);
        this._species.delete(sorted[i].id);
      } else {
        survivors.push(sorted[i].id);
        const species = this._species.get(sorted[i].id);
        if (species) species.population = Math.max(1, Math.floor(species.population * (1 - intensity * 0.3)));
      }
    }
    const event: ExtinctionEventData = {
      id: `ext-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      intensity,
      eliminated,
      survivors,
      triggeredAt: Date.now(),
      cause,
    };
    this._events.push(event);
    if (this._events.length > 50) this._events.shift();
    return event;
  }

  repopulate(survivorId: string, amount: number): SpeciesEntry | null {
    const species = this._species.get(survivorId);
    if (!species) return null;
    species.population += amount;
    return species;
  }

  setPeriodThreshold(threshold: number): void {
    this._periodThreshold = Math.max(1, threshold);
  }

  getSpecies(id: string): SpeciesEntry | null {
    return this._species.get(id) ?? null;
  }

  getEvents(limit: number = 20): ExtinctionEventData[] {
    return this._events.slice(-limit);
  }

  get speciesCount(): number {
    return this._species.size;
  }
}
