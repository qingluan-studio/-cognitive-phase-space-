export interface Embryo {
  id: string;
  genome: Record<string, unknown>;
  fitness: number;
  age: number;
  alive: boolean;
}

export interface Champion {
  embryoId: string;
  genome: Record<string, unknown>;
  mergedAt: number;
}

export interface MaternalGenome {
  genes: Record<string, unknown>;
  generation: number;
}

export class AmnioticPool {
  private _embryos: Map<string, Embryo> = new Map();
  private _champions: Champion[] = [];
  private _maternal: MaternalGenome = { genes: {}, generation: 0 };
  private _maxPopulation: number = 500;
  private _incubationTemp: number = 0.5;
  private _crossoverRate: number = 0.7;
  private _mutationRate: number = 0.1;
  private _sharingRadius: number = 0.3;

  spawn(genome: Record<string, unknown>): Embryo {
    if (this._embryos.size >= this._maxPopulation) {
      this.cull(this._maxPopulation / 2);
    }
    const embryo: Embryo = {
      id: `embryo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      genome,
      fitness: 0,
      age: 0,
      alive: true,
    };
    this._embryos.set(embryo.id, embryo);
    return embryo;
  }

  incubate(evaluator: (e: Embryo) => number): number {
    let aliveCount = 0;
    for (const e of this._embryos.values()) {
      if (!e.alive) continue;
      e.age++;
      const rawFitness = evaluator(e);
      e.fitness = this._applyFitnessSharing(e, rawFitness);
      if (e.age > 50 || e.fitness < 0.05) e.alive = false;
      else aliveCount++;
    }
    return aliveCount;
  }

  compete(survivorCount: number): Embryo[] {
    const alive = [...this._embryos.values()].filter(e => e.alive);
    alive.sort((a, b) => b.fitness - a.fitness);
    const survivors = alive.slice(0, survivorCount);
    for (const e of alive.slice(survivorCount)) e.alive = false;
    return survivors;
  }

  merge(championId: string): Champion | null {
    const embryo = this._embryos.get(championId);
    if (!embryo || !embryo.alive) return null;
    this._maternal.genes = this._blendGenomes(this._maternal.genes, embryo.genome, 0.3);
    this._maternal.generation++;
    const champion: Champion = {
      embryoId: championId,
      genome: { ...embryo.genome },
      mergedAt: Date.now(),
    };
    this._champions.push(champion);
    embryo.alive = false;
    return champion;
  }

  cull(targetPopulation: number): number {
    const alive = [...this._embryos.values()].filter(e => e.alive);
    if (alive.length <= targetPopulation) return 0;
    alive.sort((a, b) => a.fitness - b.fitness);
    const toCull = alive.length - targetPopulation;
    for (let i = 0; i < toCull; i++) alive[i].alive = false;
    return toCull;
  }

  get maternalGenome(): MaternalGenome {
    return { ...this._maternal, genes: { ...this._maternal.genes } };
  }

  getChampions(): Champion[] {
    return [...this._champions];
  }

  get population(): number {
    return [...this._embryos.values()].filter(e => e.alive).length;
  }

  setTemperature(temp: number): void {
    this._incubationTemp = Math.max(0, Math.min(1, temp));
    this._mutationRate = 0.05 + temp * 0.2;
    this._crossoverRate = 0.5 + temp * 0.4;
  }

  breed(evaluator: (e: Embryo) => number, generations: number): Embryo[] {
    const history: Embryo[] = [];
    for (let g = 0; g < generations; g++) {
      this.incubate(evaluator);
      const best = this._tournamentSelect(Math.ceil(this.population * 0.2));
      const offspring = this._reproduce(best);
      for (const child of offspring) this.spawn(child.genome);
      this.compete(Math.floor(this._maxPopulation * 0.8));
      const top = [...this._embryos.values()].filter(e => e.alive).sort((a, b) => b.fitness - a.fitness)[0];
      if (top) history.push(top);
    }
    return history;
  }

  private _tournamentSelect(count: number): Embryo[] {
    const alive = [...this._embryos.values()].filter(e => e.alive);
    const winners: Embryo[] = [];
    const tournamentSize = Math.max(2, Math.floor(alive.length * 0.1));
    for (let i = 0; i < count; i++) {
      const tournament: Embryo[] = [];
      const shuffled = [...alive].sort(() => Math.random() - 0.5);
      for (let j = 0; j < tournamentSize && j < shuffled.length; j++) {
        tournament.push(shuffled[j]);
      }
      tournament.sort((a, b) => b.fitness - a.fitness);
      if (tournament.length > 0) winners.push(tournament[0]);
    }
    return winners;
  }

  private _reproduce(parents: Embryo[]): Embryo[] {
    const offspring: Embryo[] = [];
    for (let i = 0; i < parents.length - 1; i += 2) {
      if (Math.random() < this._crossoverRate) {
        const childGenome = this._uniformCrossover(parents[i].genome, parents[i + 1].genome);
        const mutated = this._mutateGenome(childGenome);
        offspring.push({
          id: `embryo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          genome: mutated,
          fitness: 0,
          age: 0,
          alive: true,
        });
      }
    }
    return offspring;
  }

  private _uniformCrossover(a: Record<string, unknown>, b: Record<string, unknown>): Record<string, unknown> {
    const child: Record<string, unknown> = {};
    const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of allKeys) {
      const fromA = Math.random() < 0.5;
      if (fromA && key in a) child[key] = a[key];
      else if (key in b) child[key] = b[key];
      else if (key in a) child[key] = a[key];
    }
    return child;
  }

  private _mutateGenome(genome: Record<string, unknown>): Record<string, unknown> {
    const mutated: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(genome)) {
      if (Math.random() < this._mutationRate) {
        mutated[key] = this._mutateValue(value);
      } else {
        mutated[key] = value;
      }
    }
    return mutated;
  }

  private _mutateValue(value: unknown): unknown {
    if (typeof value === 'number') {
      const delta = (Math.random() - 0.5) * 2 * this._incubationTemp;
      return value + delta;
    }
    if (typeof value === 'boolean') {
      return Math.random() < 0.5;
    }
    if (typeof value === 'string') {
      if (value.length > 0 && Math.random() < 0.3) {
        const idx = Math.floor(Math.random() * value.length);
        return value.slice(0, idx) + String.fromCharCode(97 + Math.floor(Math.random() * 26)) + value.slice(idx + 1);
      }
      return value;
    }
    return value;
  }

  private _applyFitnessSharing(embryo: Embryo, rawFitness: number): number {
    const alive = [...this._embryos.values()].filter(e => e.alive && e.id !== embryo.id);
    let nicheCount = 1;
    for (const other of alive) {
      const distance = this._genomeDistance(embryo.genome, other.genome);
      if (distance < this._sharingRadius) {
        nicheCount += 1 - distance / this._sharingRadius;
      }
    }
    return rawFitness / nicheCount;
  }

  private _genomeDistance(a: Record<string, unknown>, b: Record<string, unknown>): number {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    const allKeys = new Set([...keysA, ...keysB]);
    if (allKeys.size === 0) return 0;
    let diffCount = 0;
    for (const key of allKeys) {
      const valA = a[key];
      const valB = b[key];
      if (typeof valA === 'number' && typeof valB === 'number') {
        const diff = Math.abs(valA - valB);
        diffCount += Math.min(1, diff);
      } else if (valA !== valB) {
        diffCount += 1;
      }
    }
    return diffCount / allKeys.size;
  }

  private _blendGenomes(a: Record<string, unknown>, b: Record<string, unknown>, blendRatio: number): Record<string, unknown> {
    const result: Record<string, unknown> = { ...a };
    for (const [key, valB] of Object.entries(b)) {
      const valA = result[key];
      if (typeof valA === 'number' && typeof valB === 'number') {
        result[key] = valA * (1 - blendRatio) + valB * blendRatio;
      } else {
        result[key] = Math.random() < blendRatio ? valB : valA;
      }
    }
    return result;
  }
}
