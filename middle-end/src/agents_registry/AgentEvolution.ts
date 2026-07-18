import { DataPacket, KnowledgeUnit } from '../shared/types';

export interface AgentVariant {
  id: string;
  parentId: string;
  generation: number;
  mutations: string[];
  fitnessScores: Record<string, number>;
  overallFitness: number;
  status: 'candidate' | 'active' | 'archived' | 'rejected';
  bornAt: number;
  evaluatedAt: number | null;
}

export interface EvolutionConfig {
  populationSize: number;
  mutationRate: number;
  crossoverRate: number;
  elitismCount: number;
  selectionPressure: number;
  fitnessWeights: Record<string, number>;
}

export interface GenerationRecord {
  generation: number;
  population: string[];
  bestFitness: number;
  avgFitness: number;
  worstFitness: number;
  diversity: number;
  timestamp: number;
}

export interface SelectionResult {
  selected: string[];
  selectionPressure: number;
  method: string;
}

export class AgentEvolution {
  private _variants: Map<string, AgentVariant>;
  private _lineage: Map<string, string[]>;
  private _generations: GenerationRecord[];
  private _config: EvolutionConfig;
  private _currentGeneration: number;
  private _history: AgentVariant[];
  private _evaluationQueue: string[];
  private _fitnessMetrics: string[];

  constructor() {
    this._variants = new Map();
    this._lineage = new Map();
    this._generations = [];
    this._config = {
      populationSize: 20,
      mutationRate: 0.3,
      crossoverRate: 0.7,
      elitismCount: 2,
      selectionPressure: 0.5,
      fitnessWeights: {
        performance: 0.4,
        efficiency: 0.25,
        robustness: 0.2,
        novelty: 0.15
      }
    };
    this._currentGeneration = 0;
    this._history = [];
    this._evaluationQueue = [];
    this._fitnessMetrics = ['performance', 'efficiency', 'robustness', 'novelty'];
  }

  get variantCount(): number { return this._variants.size; }
  get generationCount(): number { return this._generations.length; }
  get currentGeneration(): number { return this._currentGeneration; }
  get config(): EvolutionConfig { return { ...this._config, fitnessWeights: { ...this._config.fitnessWeights } }; }
  get fitnessMetrics(): string[] { return [...this._fitnessMetrics]; }
  get evaluationQueueLength(): number { return this._evaluationQueue.length; }
  get history(): AgentVariant[] { return this._history.map(v => ({ ...v, mutations: [...v.mutations], fitnessScores: { ...v.fitnessScores } })); }

  public setConfig(config: Partial<EvolutionConfig>): void {
    this._config = { ...this._config, ...config };
    if (config.fitnessWeights) {
      this._config.fitnessWeights = { ...config.fitnessWeights };
      this._fitnessMetrics = Object.keys(config.fitnessWeights);
    }
  }

  public initializePopulation(seedVariants: AgentVariant[]): void {
    this._variants.clear();
    this._lineage.clear();
    this._generations = [];
    this._currentGeneration = 0;
    this._evaluationQueue = [];

    for (const variant of seedVariants) {
      this._variants.set(variant.id, { ...variant, mutations: [...variant.mutations], fitnessScores: { ...variant.fitnessScores } });
      this._lineage.set(variant.id, []);
      this._evaluationQueue.push(variant.id);
    }

    this._recordGeneration(seedVariants.map(v => v.id));
  }

  public createVariant(parentId: string, mutations: string[], variantId?: string): AgentVariant | null {
    const parent = this._variants.get(parentId);
    if (!parent) return null;

    const id = variantId || `variant_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const variant: AgentVariant = {
      id,
      parentId,
      generation: parent.generation + 1,
      mutations: [...mutations],
      fitnessScores: {},
      overallFitness: 0,
      status: 'candidate',
      bornAt: Date.now(),
      evaluatedAt: null
    };

    this._variants.set(id, variant);
    this._lineage.set(id, [...(this._lineage.get(parentId) || []), parentId]);
    this._evaluationQueue.push(id);
    this._history.push(variant);

    return variant;
  }

  public mutate(variantId: string, mutationCount: number = 1): AgentVariant | null {
    const variant = this._variants.get(variantId);
    if (!variant) return null;

    const mutationTypes = [
      'parameter_tuning',
      'architecture_change',
      'weight_adjustment',
      'feature_addition',
      'feature_removal',
      'learning_rate_adjust',
      'regularization_change',
      'activation_swap'
    ];

    const mutations: string[] = [];
    for (let i = 0; i < mutationCount; i++) {
      const mutation = mutationTypes[Math.floor(Math.random() * mutationTypes.length)];
      mutations.push(`${mutation}_${i}`);
    }

    return this.createVariant(variantId, mutations);
  }

  public crossover(parentIdA: string, parentIdB: string): AgentVariant | null {
    const parentA = this._variants.get(parentIdA);
    const parentB = this._variants.get(parentIdB);
    if (!parentA || !parentB) return null;

    const id = `crossover_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const combinedMutations = [
      ...parentA.mutations.slice(0, Math.floor(parentA.mutations.length / 2)),
      ...parentB.mutations.slice(Math.floor(parentB.mutations.length / 2))
    ];

    const variant: AgentVariant = {
      id,
      parentId: parentIdA,
      generation: Math.max(parentA.generation, parentB.generation) + 1,
      mutations: combinedMutations,
      fitnessScores: {},
      overallFitness: 0,
      status: 'candidate',
      bornAt: Date.now(),
      evaluatedAt: null
    };

    this._variants.set(id, variant);
    
    const lineageA = this._lineage.get(parentIdA) || [];
    const lineageB = this._lineage.get(parentIdB) || [];
    const combinedLineage = Array.from(new Set([...lineageA, parentIdA, ...lineageB, parentIdB]));
    this._lineage.set(id, combinedLineage);
    
    this._evaluationQueue.push(id);
    this._history.push(variant);

    return variant;
  }

  public evaluateVariant(variantId: string, scores: Record<string, number>): boolean {
    const variant = this._variants.get(variantId);
    if (!variant) return false;

    variant.fitnessScores = { ...scores };
    variant.overallFitness = this._calculateOverallFitness(scores);
    variant.evaluatedAt = Date.now();
    variant.status = 'active';

    const idx = this._evaluationQueue.indexOf(variantId);
    if (idx >= 0) this._evaluationQueue.splice(idx, 1);

    return true;
  }

  private _calculateOverallFitness(scores: Record<string, number>): number {
    let total = 0;
    let totalWeight = 0;

    for (const [metric, weight] of Object.entries(this._config.fitnessWeights)) {
      const score = scores[metric] !== undefined ? scores[metric] : 0.5;
      total += score * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? total / totalWeight : 0;
  }

  public select(populationIds: string[], method: string = 'tournament'): SelectionResult {
    const evaluated = populationIds
      .map(id => this._variants.get(id))
      .filter(v => v && v.evaluatedAt !== null) as AgentVariant[];

    if (evaluated.length === 0) {
      return { selected: [], selectionPressure: this._config.selectionPressure, method };
    }

    let selected: string[];

    switch (method) {
      case 'tournament':
        selected = this._tournamentSelection(evaluated);
        break;
      case 'roulette':
        selected = this._rouletteSelection(evaluated);
        break;
      case 'rank':
        selected = this._rankSelection(evaluated);
        break;
      case 'truncation':
        selected = this._truncationSelection(evaluated);
        break;
      default:
        selected = this._tournamentSelection(evaluated);
    }

    return {
      selected,
      selectionPressure: this._config.selectionPressure,
      method
    };
  }

  private _tournamentSelection(evaluated: AgentVariant[]): string[] {
    const selected: string[] = [];
    const tournamentSize = Math.max(2, Math.floor(evaluated.length * 0.3));

    for (let i = 0; i < this._config.populationSize; i++) {
      const tournament: AgentVariant[] = [];
      for (let j = 0; j < tournamentSize; j++) {
        tournament.push(evaluated[Math.floor(Math.random() * evaluated.length)]);
      }
      tournament.sort((a, b) => b.overallFitness - a.overallFitness);
      selected.push(tournament[0].id);
    }

    return selected;
  }

  private _rouletteSelection(evaluated: AgentVariant[]): string[] {
    const totalFitness = evaluated.reduce((sum, v) => sum + v.overallFitness, 0);
    if (totalFitness === 0) return evaluated.slice(0, this._config.populationSize).map(v => v.id);

    const selected: string[] = [];
    for (let i = 0; i < this._config.populationSize; i++) {
      let r = Math.random() * totalFitness;
      for (const variant of evaluated) {
        r -= variant.overallFitness;
        if (r <= 0) {
          selected.push(variant.id);
          break;
        }
      }
    }
    return selected;
  }

  private _rankSelection(evaluated: AgentVariant[]): string[] {
    const sorted = [...evaluated].sort((a, b) => a.overallFitness - b.overallFitness);
    const totalRank = sorted.length * (sorted.length + 1) / 2;
    const selected: string[] = [];

    for (let i = 0; i < this._config.populationSize; i++) {
      let r = Math.random() * totalRank;
      let cumRank = 0;
      for (let j = 0; j < sorted.length; j++) {
        cumRank += j + 1;
        if (r <= cumRank) {
          selected.push(sorted[j].id);
          break;
        }
      }
    }
    return selected;
  }

  private _truncationSelection(evaluated: AgentVariant[]): string[] {
    const sorted = [...evaluated].sort((a, b) => b.overallFitness - a.overallFitness);
    const truncCount = Math.floor(sorted.length * (1 - this._config.selectionPressure));
    const pool = sorted.slice(0, Math.max(truncCount, 2));
    const selected: string[] = [];

    for (let i = 0; i < this._config.populationSize; i++) {
      selected.push(pool[Math.floor(Math.random() * pool.length)].id);
    }
    return selected;
  }

  public evolveGeneration(): GenerationRecord | null {
    const currentPop = this._getCurrentPopulation();
    if (currentPop.length === 0) return null;

    const evaluated = currentPop
      .map(id => this._variants.get(id))
      .filter(v => v && v.evaluatedAt !== null) as AgentVariant[];

    if (evaluated.length < 2) return null;

    evaluated.sort((a, b) => b.overallFitness - a.overallFitness);

    const elites = evaluated.slice(0, this._config.elitismCount).map(v => v.id);
    const selectionResult = this.select(currentPop, 'tournament');
    
    const newPopulation: string[] = [...elites];

    while (newPopulation.length < this._config.populationSize) {
      const parentA = selectionResult.selected[Math.floor(Math.random() * selectionResult.selected.length)];
      const parentB = selectionResult.selected[Math.floor(Math.random() * selectionResult.selected.length)];

      if (Math.random() < this._config.crossoverRate && parentA !== parentB) {
        const child = this.crossover(parentA, parentB);
        if (child) {
          if (Math.random() < this._config.mutationRate) {
            const mutated = this.mutate(child.id, Math.floor(Math.random() * 3) + 1);
            if (mutated) {
              newPopulation.push(mutated.id);
              continue;
            }
          }
          newPopulation.push(child.id);
        }
      } else if (Math.random() < this._config.mutationRate) {
        const mutated = this.mutate(parentA, Math.floor(Math.random() * 2) + 1);
        if (mutated) newPopulation.push(mutated.id);
      } else {
        newPopulation.push(parentA);
      }
    }

    this._currentGeneration++;
    const record = this._recordGeneration(newPopulation.slice(0, this._config.populationSize));
    return record;
  }

  private _getCurrentPopulation(): string[] {
    if (this._generations.length === 0) return Array.from(this._variants.keys());
    const lastGen = this._generations[this._generations.length - 1];
    return lastGen.population;
  }

  private _recordGeneration(population: string[]): GenerationRecord {
    const evaluated = population
      .map(id => this._variants.get(id))
      .filter(v => v && v.evaluatedAt !== null) as AgentVariant[];

    let bestFitness = 0;
    let avgFitness = 0;
    let worstFitness = 1;
    let diversity = 0;

    if (evaluated.length > 0) {
      const fitnesses = evaluated.map(v => v.overallFitness);
      bestFitness = Math.max(...fitnesses);
      avgFitness = fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length;
      worstFitness = Math.min(...fitnesses);
      diversity = this._calculateDiversity(evaluated);
    }

    const record: GenerationRecord = {
      generation: this._currentGeneration,
      population: [...population],
      bestFitness,
      avgFitness,
      worstFitness,
      diversity,
      timestamp: Date.now()
    };

    this._generations.push(record);
    return record;
  }

  private _calculateDiversity(variants: AgentVariant[]): number {
    if (variants.length < 2) return 0;

    let totalDistance = 0;
    let comparisons = 0;

    for (let i = 0; i < variants.length; i++) {
      for (let j = i + 1; j < variants.length; j++) {
        let distance = 0;
        const allMetrics = new Set([
          ...Object.keys(variants[i].fitnessScores),
          ...Object.keys(variants[j].fitnessScores)
        ]);
        for (const metric of allMetrics) {
          const si = variants[i].fitnessScores[metric] || 0;
          const sj = variants[j].fitnessScores[metric] || 0;
          distance += Math.abs(si - sj);
        }
        distance /= allMetrics.size || 1;
        
        const mutI = new Set(variants[i].mutations);
        const mutJ = new Set(variants[j].mutations);
        const mutOverlap = new Set([...mutI].filter(x => mutJ.has(x))).size;
        const mutUnion = new Set([...mutI, ...mutJ]).size;
        const mutDistance = mutUnion > 0 ? 1 - mutOverlap / mutUnion : 0;
        
        totalDistance += distance * 0.6 + mutDistance * 0.4;
        comparisons++;
      }
    }

    return comparisons > 0 ? totalDistance / comparisons : 0;
  }

  public getVariant(variantId: string): AgentVariant | undefined {
    return this._variants.get(variantId);
  }

  public getLineage(variantId: string): string[] {
    return this._lineage.get(variantId) || [];
  }

  public getGeneration(generation: number): GenerationRecord | undefined {
    return this._generations[generation];
  }

  public getBestVariants(count: number = 5): AgentVariant[] {
    return Array.from(this._variants.values())
      .filter(v => v.status === 'active')
      .sort((a, b) => b.overallFitness - a.overallFitness)
      .slice(0, count);
  }

  public getFitnessTrend(): { generation: number; best: number; average: number }[] {
    return this._generations.map(g => ({
      generation: g.generation,
      best: g.bestFitness,
      average: g.avgFitness
    }));
  }

  public dequeueEvaluation(): string | null {
    return this._evaluationQueue.shift() || null;
  }

  public archiveVariant(variantId: string): boolean {
    const variant = this._variants.get(variantId);
    if (!variant) return false;
    variant.status = 'archived';
    return true;
  }

  public extractKnowledgeUnit(variantId: string): KnowledgeUnit | null {
    const variant = this._variants.get(variantId);
    if (!variant) return null;

    const lineage = this.getLineage(variantId);
    const vector = [
      variant.overallFitness,
      variant.generation / 100,
      variant.mutations.length / 20,
      lineage.length / 50,
      ...this._fitnessMetrics.map(m => variant.fitnessScores[m] || 0)
    ];

    return {
      id: `evolution_knowledge_${variantId}`,
      content: `Agent variant with ${variant.mutations.length} mutations, fitness ${variant.overallFitness.toFixed(3)}`,
      vector: vector.slice(0, 16),
      lineage: ['agent_evolution', ...lineage]
    };
  }

  public exportEvolutionPacket(): DataPacket<GenerationRecord[]> {
    return {
      id: `evolution_packet_${Date.now()}`,
      payload: this._generations.map(g => ({ ...g, population: [...g.population] })),
      metadata: {
        createdAt: Date.now(),
        route: ['agents_registry', 'agent_evolution'],
        priority: 2,
        phase: 'evolution'
      }
    };
  }

  public reset(): void {
    this._variants.clear();
    this._lineage.clear();
    this._generations = [];
    this._currentGeneration = 0;
    this._history = [];
    this._evaluationQueue = [];
    this._config = {
      populationSize: 20,
      mutationRate: 0.3,
      crossoverRate: 0.7,
      elitismCount: 2,
      selectionPressure: 0.5,
      fitnessWeights: {
        performance: 0.4,
        efficiency: 0.25,
        robustness: 0.2,
        novelty: 0.15
      }
    };
    this._fitnessMetrics = ['performance', 'efficiency', 'robustness', 'novelty'];
  }

  public exportVariants(): AgentVariant[] {
    return Array.from(this._variants.values()).map(v => ({
      ...v,
      mutations: [...v.mutations],
      fitnessScores: { ...v.fitnessScores }
    }));
  }
}
