export interface Individual {
  id: string;
  genotype: number[];
  fitness: number;
  generation: number;
  heritability: number;
}

export interface SelectionResult {
  parentIds: string[];
  childId: string;
  crossoverPoint: number;
  mutationRate: number;
  fitnessDelta: number;
}

export class NaturalSelector {
  private _population: Map<string, Individual> = new Map();
  private _generation: number = 0;
  private _history: SelectionResult[] = [];
  private _state: Record<string, unknown> = {};
  private _selectionPressure: number = 1.5;
  private _mutationRate: number = 0.01;
  private _heritabilityEstimate: number = 0.5;

  constructor() {}

  get populationSize(): number {
    return this._population.size;
  }

  get generation(): number {
    return this._generation;
  }

  seed(id: string, genotype: number[], fitness: number): void {
    this._population.set(id, { id, genotype: [...genotype], fitness, generation: 0, heritability: 0.5 });
  }

  select(): Individual | null {
    if (this._population.size === 0) return null;
    const individuals = Array.from(this._population.values());
    const minFitness = Math.min(...individuals.map((i) => i.fitness));
    const adjusted = individuals.map((i) => Math.pow(i.fitness - minFitness + 1, this._selectionPressure));
    const total = adjusted.reduce((s, v) => s + v, 0);
    let r = Math.random() * total;
    for (let i = 0; i < individuals.length; i++) {
      r -= adjusted[i];
      if (r <= 0) return individuals[i];
    }
    return individuals[individuals.length - 1];
  }

  reproduce(parentA: string, parentB: string, childId: string): SelectionResult | null {
    const a = this._population.get(parentA);
    const b = this._population.get(parentB);
    if (!a || !b) return null;
    const len = Math.min(a.genotype.length, b.genotype.length);
    const crossoverPoint = Math.floor(Math.random() * len);
    const childGenotype: number[] = [];
    for (let i = 0; i < len; i++) {
      const gene = i < crossoverPoint ? a.genotype[i] : b.genotype[i];
      const mutated = Math.random() < this._mutationRate ? gene + (Math.random() - 0.5) : gene;
      childGenotype.push(mutated);
    }
    const meanParentFitness = (a.fitness + b.fitness) / 2;
    const breedingValue = this._heritabilityEstimate * meanParentFitness;
    const childFitness = Math.max(0, breedingValue + (Math.random() - 0.5) * 0.1);
    const child: Individual = {
      id: childId,
      genotype: childGenotype,
      fitness: childFitness,
      generation: this._generation,
      heritability: this._heritabilityEstimate,
    };
    this._population.set(childId, child);
    const result: SelectionResult = {
      parentIds: [parentA, parentB],
      childId,
      crossoverPoint,
      mutationRate: this._mutationRate,
      fitnessDelta: childFitness - meanParentFitness,
    };
    this._history.push(result);
    if (this._history.length > 100) this._history.shift();
    return result;
  }

  cull(percentage: number): void {
    const sorted = Array.from(this._population.values()).sort((a, b) => a.fitness - b.fitness);
    const toRemove = Math.floor(sorted.length * percentage);
    for (let i = 0; i < toRemove; i++) {
      this._population.delete(sorted[i].id);
    }
  }

  evolve(generations: number): void {
    for (let g = 0; g < generations; g++) {
      this._generation++;
      const parentA = this.select();
      const parentB = this.select();
      if (parentA && parentB) {
        this.reproduce(parentA.id, parentB.id, `gen_${this._generation}_${Math.random().toString(36).slice(2, 6)}`);
      }
      if (this._population.size > 100) {
        this.cull(0.2);
      }
    }
  }

  fisherFundamentalTheorem(): number {
    const fitnesses = Array.from(this._population.values()).map((i) => i.fitness);
    const mean = fitnesses.reduce((s, v) => s + v, 0) / (fitnesses.length || 1);
    const variance = fitnesses.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (fitnesses.length || 1);
    return variance / (mean || 1);
  }

  priceEquation(): { deltaZ: number; cov: number; expDelta: number } {
    const individuals = Array.from(this._population.values());
    if (individuals.length === 0) return { deltaZ: 0, cov: 0, expDelta: 0 };
    const z = individuals.map((i) => i.fitness);
    const w = individuals.map(() => 1);
    const meanW = w.reduce((s, v) => s + v, 0) / w.length;
    const meanZ = z.reduce((s, v) => s + v, 0) / z.length;
    let cov = 0;
    for (let i = 0; i < individuals.length; i++) {
      cov += (w[i] - meanW) * (z[i] - meanZ);
    }
    cov /= individuals.length;
    const expDelta = 0;
    const deltaZ = cov / (meanW || 1) + expDelta;
    return { deltaZ, cov, expDelta };
  }

  averageFitness(): number {
    if (this._population.size === 0) return 0;
    return Array.from(this._population.values()).reduce((s, i) => s + i.fitness, 0) / this._population.size;
  }

  fitnessVariance(): number {
    const avg = this.averageFitness();
    if (this._population.size === 0) return 0;
    return Array.from(this._population.values()).reduce((s, i) => s + Math.pow(i.fitness - avg, 2), 0) / this._population.size;
  }

  report(): Record<string, unknown> {
    return {
      population: this._population.size,
      generation: this._generation,
      avgFitness: this.averageFitness(),
      variance: this.fitnessVariance(),
      fisherTheorem: this.fisherFundamentalTheorem(),
      state: this._state,
    };
  }
}
