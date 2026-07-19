import { DataPacket, PacketMeta } from '../shared/types';

/** Population descriptor. */
export interface Population {
  size: number;
  alleleFreq: Record<string, number>;
  fitness: number;
}

/** Selection descriptor. */
export interface Selection {
  type: 'directional' | 'stabilizing' | 'disruptive' | 'sexual' | 'artificial';
  pressure: number;
  direction: 'positive' | 'negative' | 'balanced';
}

/** Speciation descriptor. */
export interface Speciation {
  type: 'allopatric' | 'sympatric' | 'parapatric' | 'peripatric';
  isolation: 'geographic' | 'reproductive' | 'temporal' | 'behavioral' | 'ecological';
}

/** Evolution: natural selection, drift, speciation. */
export class Evolution {
  private _populations: Population[] = [];
  private _selections: Selection[] = [];
  private _speciations: Speciation[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  /** Apply natural selection to a population. */
  naturalSelection(population: Population, pressure: number): Population {
    const newFitness = population.fitness * (1 - pressure * 0.1);
    const newSize = Math.max(1, Math.floor(population.size * (1 + pressure * 0.05)));
    const newAlleleFreq: Record<string, number> = {};
    for (const [k, v] of Object.entries(population.alleleFreq)) {
      newAlleleFreq[k] = Math.max(0, Math.min(1, v + pressure * 0.01));
    }
    const result: Population = { size: newSize, alleleFreq: newAlleleFreq, fitness: newFitness };
    this._populations.push(result);
    this._history.push({ method: 'naturalSelection' });
    return result;
  }

  /** Artificial selection across generations. */
  artificialSelection(trait: string, generations: number): { trait: string; generations: number; change: number } {
    const change = generations * 0.05;
    this._history.push({ method: 'artificialSelection', trait });
    return { trait, generations, change };
  }

  /** Genetic drift over generations. */
  geneticDrift(population: Population, generations: number): Population {
    let alleleFreq = { ...population.alleleFreq };
    for (let g = 0; g < generations; g++) {
      for (const k of Object.keys(alleleFreq)) {
        const drift = (Math.random() - 0.5) * 0.1 / Math.sqrt(population.size);
        alleleFreq[k] = Math.max(0, Math.min(1, alleleFreq[k] + drift));
      }
    }
    const result: Population = { ...population, alleleFreq };
    this._populations.push(result);
    this._history.push({ method: 'geneticDrift' });
    return result;
  }

  /** Bottleneck event. */
  bottleneck(population: Population, event: { survivors: number }): Population {
    const newSize = event.survivors;
    const result: Population = { ...population, size: newSize };
    this._populations.push(result);
    this._history.push({ method: 'bottleneck' });
    return result;
  }

  /** Founder effect. */
  founderEffect(population: Population, founders: string[]): Population {
    const founderAlleles: Record<string, number> = {};
    for (const a of founders) {
      founderAlleles[a] = (founderAlleles[a] ?? 0) + 1;
    }
    const total = founders.length;
    for (const k of Object.keys(founderAlleles)) {
      founderAlleles[k] = founderAlleles[k] / total;
    }
    const result: Population = { ...population, alleleFreq: founderAlleles };
    this._populations.push(result);
    this._history.push({ method: 'founderEffect' });
    return result;
  }

  /** Gene flow between populations. */
  geneFlow(pop1: Population, pop2: Population, rate: number): { pop1: Population; pop2: Population } {
    const newFreq1: Record<string, number> = {};
    const newFreq2: Record<string, number> = {};
    const keys = new Set([...Object.keys(pop1.alleleFreq), ...Object.keys(pop2.alleleFreq)]);
    for (const k of keys) {
      const f1 = pop1.alleleFreq[k] ?? 0;
      const f2 = pop2.alleleFreq[k] ?? 0;
      newFreq1[k] = f1 * (1 - rate) + f2 * rate;
      newFreq2[k] = f2 * (1 - rate) + f1 * rate;
    }
    const result1: Population = { ...pop1, alleleFreq: newFreq1 };
    const result2: Population = { ...pop2, alleleFreq: newFreq2 };
    this._populations.push(result1, result2);
    this._history.push({ method: 'geneFlow' });
    return { pop1: result1, pop2: result2 };
  }

  /** Hardy-Weinberg equilibrium check. */
  hardyWeinbergEquilibrium(p: number, q: number): { equilibrium: boolean; expected: Record<string, number> } {
    const equilibrium = Math.abs(p + q - 1) < 1e-6;
    const expected: Record<string, number> = {
      pp: p * p,
      pq: 2 * p * q,
      qq: q * q,
    };
    this._history.push({ method: 'hardyWeinbergEquilibrium' });
    return { equilibrium, expected };
  }

  /** Compute fitness of a genotype in an environment. */
  fitness(genotype: string, environment: string): number {
    let f = 1.0;
    if (environment === 'harsh') f = 0.6;
    if (environment === 'favorable') f = 1.2;
    if (genotype.includes('A')) f += 0.1;
    this._history.push({ method: 'fitness' });
    return Math.max(0, Math.min(1.5, f));
  }

  /** Directional selection favors one extreme. */
  directionalSelection(population: Population, trait: string): Selection {
    const result: Selection = { type: 'directional', pressure: 0.2, direction: 'positive' };
    void trait;
    this._selections.push(result);
    this._history.push({ method: 'directionalSelection' });
    return result;
  }

  /** Stabilizing selection favors the mean. */
  stabilizingSelection(population: Population, trait: string): Selection {
    const result: Selection = { type: 'stabilizing', pressure: 0.1, direction: 'balanced' };
    void population;
    void trait;
    this._selections.push(result);
    this._history.push({ method: 'stabilizingSelection' });
    return result;
  }

  /** Disruptive selection favors both extremes. */
  disruptiveSelection(population: Population, trait: string): Selection {
    const result: Selection = { type: 'disruptive', pressure: 0.3, direction: 'balanced' };
    void population;
    void trait;
    this._selections.push(result);
    this._history.push({ method: 'disruptiveSelection' });
    return result;
  }

  /** Sexual selection. */
  sexualSelection(trait: string, preference: string): Selection {
    const result: Selection = { type: 'sexual', pressure: 0.15, direction: 'positive' };
    void trait;
    void preference;
    this._selections.push(result);
    this._history.push({ method: 'sexualSelection' });
    return result;
  }

  /** Allopatric speciation via geographic barrier. */
  speciationAllopatric(population: Population, barrier: string): Speciation {
    void population;
    void barrier;
    const result: Speciation = { type: 'allopatric', isolation: 'geographic' };
    this._speciations.push(result);
    this._history.push({ method: 'speciationAllopatric' });
    return result;
  }

  /** Sympatric speciation within the same area. */
  speciationSympatric(population: Population, mechanism: string): Speciation {
    void population;
    const isolationMap: Record<string, Speciation['isolation']> = {
      'polyploidy': 'reproductive',
      'behavioral': 'behavioral',
      'temporal': 'temporal',
      'ecological': 'ecological',
    };
    const result: Speciation = {
      type: 'sympatric',
      isolation: isolationMap[mechanism] ?? 'reproductive',
    };
    this._speciations.push(result);
    this._history.push({ method: 'speciationSympatric' });
    return result;
  }

  /** Coevolution between two species. */
  coevolution(species1: string, species2: string): { species1: string; species2: string; relationship: string } {
    this._history.push({ method: 'coevolution' });
    return { species1, species2, relationship: 'mutualistic' };
  }

  /** Extinction risk assessment. */
  extinctionRisk(population: Population): { risk: 'low' | 'medium' | 'high'; cause: string } {
    let risk: 'low' | 'medium' | 'high';
    if (population.size < 50) risk = 'high';
    else if (population.size < 500) risk = 'medium';
    else risk = 'low';
    this._history.push({ method: 'extinctionRisk' });
    return { risk, cause: 'small population size' };
  }

  toPacket(): DataPacket<{
    populations: Population[];
    selections: Selection[];
    speciations: Speciation[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['biology', 'Evolution'],
      priority: 1,
      phase: 'biology:evolution',
    };
    return {
      id: `evo-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        populations: this._populations,
        selections: this._selections,
        speciations: this._speciations,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._populations = [];
    this._selections = [];
    this._speciations = [];
    this._history = [];
    this._counter = 0;
  }

  get populationCount(): number {
    return this._populations.length;
  }

  get selectionCount(): number {
    return this._selections.length;
  }

  get speciationCount(): number {
    return this._speciations.length;
  }

  get historyDepth(): number {
    return this._history.length;
  }
}
