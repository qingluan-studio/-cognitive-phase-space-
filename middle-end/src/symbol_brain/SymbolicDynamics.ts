import { KnowledgeUnit, Signal } from '../shared/types';

export interface SymbolicEntity {
  id: string;
  symbol: string;
  fitness: number;
  replicability: number;
  mutationRate: number;
  generation: number;
  ancestors: string[];
  traits: Map<string, number>;
}

export interface ReplicationEvent {
  id: string;
  parentId: string;
  childId: string;
  timestamp: number;
  fidelity: number;
  mutations: string[];
}

export interface SelectionPressure {
  trait: string;
  direction: number;
  strength: number;
  targetValue: number;
}

export interface PopulationStatistics {
  generation: number;
  populationSize: number;
  avgFitness: number;
  maxFitness: number;
  avgReplicability: number;
  diversity: number;
}

export interface ISymbolicDynamics {
  populationSize: number;
  generation: number;
  addEntity(entity: SymbolicEntity): void;
  getEntity(entityId: string): SymbolicEntity | undefined;
  replicate(entityId: string): SymbolicEntity | null;
  mutate(entityId: string, mutationCount?: number): SymbolicEntity | null;
  applySelection(pressures: SelectionPressure[]): void;
  advanceGeneration(): PopulationStatistics;
  computeDiversity(): number;
  getLineage(entityId: string, depth: number): string[];
  findDominantTrait(): { trait: string; avgValue: number } | null;
}

export class SymbolicDynamics implements ISymbolicDynamics {
  private _population: Map<string, SymbolicEntity>;
  private _generation: number;
  private _replicationLog: ReplicationEvent[];
  private _statisticsLog: PopulationStatistics[];
  private _maxPopulation: number;
  private _maxLogSize: number;
  private _extinctionThreshold: number;

  constructor(maxPopulation: number = 500) {
    this._population = new Map();
    this._generation = 0;
    this._replicationLog = [];
    this._statisticsLog = [];
    this._maxPopulation = maxPopulation;
    this._maxLogSize = 1000;
    this._extinctionThreshold = 0.01;
  }

  get populationSize(): number { return this._population.size; }
  get generation(): number { return this._generation; }
  get replicationCount(): number { return this._replicationLog.length; }
  get statisticsLog(): PopulationStatistics[] { return [...this._statisticsLog]; }
  get avgFitness(): number {
    if (this._population.size === 0) return 0;
    let sum = 0;
    for (const [, e] of this._population) sum += e.fitness;
    return sum / this._population.size;
  }

  public addEntity(entity: SymbolicEntity): void {
    this._population.set(entity.id, {
      ...entity,
      ancestors: [...entity.ancestors],
      traits: new Map(entity.traits)
    });
  }

  public getEntity(entityId: string): SymbolicEntity | undefined {
    const e = this._population.get(entityId);
    return e ? {
      ...e,
      ancestors: [...e.ancestors],
      traits: new Map(e.traits)
    } : undefined;
  }

  public getAllEntities(): SymbolicEntity[] {
    const result: SymbolicEntity[] = [];
    for (const [, e] of this._population) {
      result.push({
        ...e,
        ancestors: [...e.ancestors],
        traits: new Map(e.traits)
      });
    }
    return result;
  }

  public replicate(entityId: string): SymbolicEntity | null {
    const parent = this._population.get(entityId);
    if (!parent) return null;
    if (this._population.size >= this._maxPopulation) {
      this._pruneWeakest();
    }
    const fidelity = parent.replicability * (0.9 + Math.random() * 0.2);
    const mutations: string[] = [];
    const childTraits = new Map(parent.traits);
    const traitKeys = Array.from(childTraits.keys());
    for (const trait of traitKeys) {
      if (Math.random() < parent.mutationRate) {
        const current = childTraits.get(trait)!;
        const delta = (Math.random() * 2 - 1) * 0.2;
        childTraits.set(trait, Math.max(0, Math.min(1, current + delta)));
        mutations.push(trait);
      }
    }
    let childFitness = parent.fitness * fidelity;
    for (const mutation of mutations) {
      if (Math.random() < 0.5) {
        childFitness = Math.min(1, childFitness * 1.1);
      } else {
        childFitness = Math.max(0, childFitness * 0.9);
      }
    }
    const childId = `${entityId}-g${this._generation}-${Math.random().toString(36).slice(2, 8)}`;
    const child: SymbolicEntity = {
      id: childId,
      symbol: parent.symbol + (mutations.length > 0 ? '*' : ''),
      fitness: childFitness,
      replicability: Math.max(0.1, Math.min(0.99, parent.replicability + (Math.random() * 2 - 1) * 0.05)),
      mutationRate: Math.max(0.01, Math.min(0.5, parent.mutationRate + (Math.random() * 2 - 1) * 0.02)),
      generation: this._generation,
      ancestors: [...parent.ancestors, entityId],
      traits: childTraits
    };
    this._population.set(childId, child);
    const event: ReplicationEvent = {
      id: `rep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      parentId: entityId,
      childId,
      timestamp: Date.now(),
      fidelity,
      mutations
    };
    this._replicationLog.push(event);
    if (this._replicationLog.length > this._maxLogSize) {
      this._replicationLog.shift();
    }
    return {
      ...child,
      ancestors: [...child.ancestors],
      traits: new Map(child.traits)
    };
  }

  private _pruneWeakest(): void {
    const entities = Array.from(this._population.values());
    entities.sort((a, b) => a.fitness - b.fitness);
    const toRemove = Math.floor(entities.length * 0.1);
    for (let i = 0; i < toRemove && i < entities.length; i++) {
      if (entities[i].fitness < this._extinctionThreshold) {
        this._population.delete(entities[i].id);
      }
    }
    if (this._population.size >= this._maxPopulation) {
      for (let i = 0; i < toRemove; i++) {
        this._population.delete(entities[i].id);
      }
    }
  }

  public mutate(entityId: string, mutationCount: number = 1): SymbolicEntity | null {
    const entity = this._population.get(entityId);
    if (!entity) return null;
    const traits = new Map(entity.traits);
    const keys = Array.from(traits.keys());
    const mutations: string[] = [];
    for (let i = 0; i < mutationCount; i++) {
      if (keys.length === 0) break;
      const randomTrait = keys[Math.floor(Math.random() * keys.length)];
      const current = traits.get(randomTrait)!;
      const delta = (Math.random() * 2 - 1) * 0.3;
      traits.set(randomTrait, Math.max(0, Math.min(1, current + delta)));
      mutations.push(randomTrait);
    }
    const newFitness = Math.max(0, Math.min(1, entity.fitness + (Math.random() * 2 - 1) * 0.2));
    entity.traits = traits;
    entity.fitness = newFitness;
    return {
      ...entity,
      ancestors: [...entity.ancestors],
      traits: new Map(entity.traits)
    };
  }

  public applySelection(pressures: SelectionPressure[]): void {
    for (const [, entity] of this._population) {
      let fitnessMultiplier = 1;
      for (const pressure of pressures) {
        const traitValue = entity.traits.get(pressure.trait);
        if (traitValue !== undefined) {
          const distance = Math.abs(traitValue - pressure.targetValue);
          const match = 1 - distance;
          const selectionEffect = 1 + pressure.direction * pressure.strength * match;
          fitnessMultiplier *= selectionEffect;
        }
      }
      entity.fitness = Math.max(0, Math.min(1, entity.fitness * fitnessMultiplier));
    }
    this._pruneWeakest();
  }

  public advanceGeneration(): PopulationStatistics {
    this._generation++;
    const entities = Array.from(this._population.values());
    entities.sort((a, b) => b.fitness - a.fitness);
    const reproducers = entities.slice(0, Math.floor(entities.length * 0.5));
    for (const parent of reproducers) {
      if (Math.random() < parent.replicability) {
        this.replicate(parent.id);
      }
    }
    const stats = this._computeStatistics();
    this._statisticsLog.push(stats);
    if (this._statisticsLog.length > 100) {
      this._statisticsLog.shift();
    }
    return stats;
  }

  private _computeStatistics(): PopulationStatistics {
    const entities = Array.from(this._population.values());
    if (entities.length === 0) {
      return {
        generation: this._generation,
        populationSize: 0,
        avgFitness: 0,
        maxFitness: 0,
        avgReplicability: 0,
        diversity: 0
      };
    }
    let totalFitness = 0;
    let totalRep = 0;
    let maxFitness = 0;
    for (const e of entities) {
      totalFitness += e.fitness;
      totalRep += e.replicability;
      if (e.fitness > maxFitness) maxFitness = e.fitness;
    }
    const diversity = this.computeDiversity();
    return {
      generation: this._generation,
      populationSize: entities.length,
      avgFitness: totalFitness / entities.length,
      maxFitness,
      avgReplicability: totalRep / entities.length,
      diversity
    };
  }

  public computeDiversity(): number {
    const entities = Array.from(this._population.values());
    if (entities.length < 2) return 0;
    let totalDist = 0;
    let pairs = 0;
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        totalDist += this._traitDistance(entities[i], entities[j]);
        pairs++;
      }
    }
    return pairs > 0 ? totalDist / pairs : 0;
  }

  private _traitDistance(a: SymbolicEntity, b: SymbolicEntity): number {
    const allTraits = new Set([...a.traits.keys(), ...b.traits.keys()]);
    if (allTraits.size === 0) return 0;
    let sum = 0;
    for (const trait of allTraits) {
      const va = a.traits.get(trait) || 0;
      const vb = b.traits.get(trait) || 0;
      sum += Math.abs(va - vb);
    }
    return sum / allTraits.size;
  }

  public getLineage(entityId: string, depth: number = 5): string[] {
    const entity = this._population.get(entityId);
    if (!entity) return [];
    const lineage = [entityId];
    const ancestors = [...entity.ancestors].reverse();
    for (let i = 0; i < Math.min(depth - 1, ancestors.length); i++) {
      lineage.push(ancestors[i]);
    }
    return lineage;
  }

  public findDominantTrait(): { trait: string; avgValue: number; dominance: number } | null {
    if (this._population.size === 0) return null;
    const traitSums = new Map<string, number>();
    const traitCounts = new Map<string, number>();
    for (const [, e] of this._population) {
      for (const [trait, value] of e.traits) {
        traitSums.set(trait, (traitSums.get(trait) || 0) + value);
        traitCounts.set(trait, (traitCounts.get(trait) || 0) + 1);
      }
    }
    let bestTrait = '';
    let bestValue = 0;
    let bestDominance = 0;
    for (const [trait, sum] of traitSums) {
      const count = traitCounts.get(trait) || 1;
      const avg = sum / count;
      const dominance = count / this._population.size;
      if (dominance > bestDominance) {
        bestDominance = dominance;
        bestTrait = trait;
        bestValue = avg;
      }
    }
    return bestTrait ? { trait: bestTrait, avgValue: bestValue, dominance: bestDominance } : null;
  }

  public findFittest(k: number = 5): SymbolicEntity[] {
    const entities = Array.from(this._population.values());
    entities.sort((a, b) => b.fitness - a.fitness);
    return entities.slice(0, k).map(e => ({
      ...e,
      ancestors: [...e.ancestors],
      traits: new Map(e.traits)
    }));
  }

  public toKnowledgeUnit(entityId: string): KnowledgeUnit | null {
    const e = this._population.get(entityId);
    if (!e) return null;
    const vector: number[] = [];
    vector.push(e.fitness);
    vector.push(e.replicability);
    vector.push(e.mutationRate);
    vector.push(e.generation / 100);
    const traitValues = Array.from(e.traits.values());
    for (let i = 0; i < 10; i++) {
      vector.push(traitValues[i] || 0);
    }
    return {
      id: `symdyn-${entityId}`,
      content: e.symbol,
      vector,
      lineage: e.ancestors.slice(-5)
    };
  }

  public toSignal(entityId: string): Signal | null {
    const e = this._population.get(entityId);
    if (!e) return null;
    return {
      source: `symdyn-${entityId}`,
      magnitude: e.fitness,
      entropy: e.mutationRate,
      timestamp: Date.now()
    };
  }

  public reset(): void {
    this._population.clear();
    this._generation = 0;
    this._replicationLog = [];
    this._statisticsLog = [];
  }
}
