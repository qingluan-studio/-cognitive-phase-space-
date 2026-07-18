import type { DataPacket, KnowledgeUnit } from '../shared/types';

export type EcologicalRelation = 'competition' | 'mutualism' | 'predation' | 'parasitism' | 'commensalism' | 'amensalism';

export type ModuleNiche = 'producer' | 'consumer' | 'decomposer' | 'transformer' | 'storage' | 'regulator';

export interface ModuleNode {
  id: string;
  name: string;
  niche: ModuleNiche;
  population: number;
  fitness: number;
  carryingCapacity: number;
  growthRate: number;
  metabolicRate: number;
  resourceConsumption: number;
  vector: number[];
}

export interface EcologicalInteraction {
  id: string;
  source: string;
  target: string;
  type: EcologicalRelation;
  strength: number;
  frequency: number;
}

export interface EcosystemState {
  timestamp: number;
  totalPopulation: number;
  biodiversity: number;
  totalBiomass: number;
  stability: number;
  connectivity: number;
  nicheDistribution: Record<ModuleNiche, number>;
  relationDistribution: Record<EcologicalRelation, number>;
}

export interface IModuleEcosystem {
  addModule(id: string, name: string, niche: ModuleNiche): void;
  addInteraction(source: string, target: string, type: EcologicalRelation, strength: number): void;
  removeModule(id: string): void;
  update(deltaTime: number): void;
  getState(): EcosystemState;
  getModule(id: string): ModuleNode | undefined;
  getInteractions(moduleId: string): EcologicalInteraction[];
  processPacket(packet: DataPacket): DataPacket;
  reset(): void;
}

export class ModuleEcosystem implements IModuleEcosystem {
  private _modules: Map<string, ModuleNode> = new Map();
  private _interactions: EcologicalInteraction[] = [];
  private _interactionIndex: Map<string, EcologicalInteraction[]> = new Map();
  private _resources: number = 100;
  private _resourceRegenerationRate: number = 0.5;
  private _maxResources: number = 200;
  private _history: EcosystemState[] = [];
  private _maxHistory: number = 300;
  private _lastUpdate: number = Date.now();
  private _disturbanceLevel: number = 0;
  private _successionStage: number = 0;
  private _invasionResistance: number = 0.6;
  private _nicheOverlapThreshold: number = 0.7;

  constructor() {
    this._initializeFounderSpecies();
  }

  get moduleCount(): number { return this._modules.size; }
  get interactionCount(): number { return this._interactions.length; }
  get resources(): number { return this._resources; }
  get biodiversity(): number { return this._computeBiodiversity(); }
  get stability(): number { return this._computeStability(); }
  get disturbanceLevel(): number { return this._disturbanceLevel; }
  set disturbanceLevel(value: number) { this._disturbanceLevel = Math.max(0, Math.min(1, value)); }
  get successionStage(): number { return this._successionStage; }
  get invasionResistance(): number { return this._invasionResistance; }

  private _initializeFounderSpecies(): void {
    const founders: Array<{ id: string; name: string; niche: ModuleNiche }> = [
      { id: 'producer-a', name: '生产者A', niche: 'producer' },
      { id: 'producer-b', name: '生产者B', niche: 'producer' },
      { id: 'consumer-a', name: '消费者A', niche: 'consumer' },
      { id: 'decomposer-a', name: '分解者A', niche: 'decomposer' },
      { id: 'transformer-a', name: '转化者A', niche: 'transformer' },
    ];

    for (const f of founders) {
      this.addModule(f.id, f.name, f.niche);
    }

    this._initializeDefaultInteractions();
  }

  private _initializeDefaultInteractions(): void {
    this.addInteraction('producer-a', 'consumer-a', 'predation', 0.4);
    this.addInteraction('producer-b', 'consumer-a', 'predation', 0.3);
    this.addInteraction('consumer-a', 'decomposer-a', 'commensalism', 0.2);
    this.addInteraction('producer-a', 'producer-b', 'competition', 0.3);
    this.addInteraction('transformer-a', 'producer-a', 'mutualism', 0.5);
    this.addInteraction('transformer-a', 'consumer-a', 'mutualism', 0.3);
  }

  addModule(id: string, name: string, niche: ModuleNiche): void {
    if (this._modules.has(id)) return;

    const nicheBase: Record<ModuleNiche, { pop: number; growth: number; metabolic: number; consumption: number }> = {
      producer: { pop: 30, growth: 0.08, metabolic: 0.02, consumption: 0.5 },
      consumer: { pop: 15, growth: 0.05, metabolic: 0.04, consumption: 1.2 },
      decomposer: { pop: 20, growth: 0.06, metabolic: 0.03, consumption: 0.8 },
      transformer: { pop: 10, growth: 0.04, metabolic: 0.05, consumption: 1.0 },
      storage: { pop: 5, growth: 0.02, metabolic: 0.01, consumption: 0.3 },
      regulator: { pop: 8, growth: 0.03, metabolic: 0.06, consumption: 0.7 },
    };

    const base = nicheBase[niche];

    const module: ModuleNode = {
      id,
      name,
      niche,
      population: base.pop,
      fitness: 0.5 + Math.random() * 0.3,
      carryingCapacity: base.pop * 3,
      growthRate: base.growth,
      metabolicRate: base.metabolic,
      resourceConsumption: base.consumption,
      vector: this._generateNicheVector(niche),
    };

    this._modules.set(id, module);
    this._interactionIndex.set(id, []);
  }

  private _generateNicheVector(niche: ModuleNiche): number[] {
    const baseVectors: Record<ModuleNiche, number[]> = {
      producer: [0.9, 0.2, 0.1, 0.3, 0.8, 0.1, 0.4, 0.2],
      consumer: [0.3, 0.8, 0.5, 0.7, 0.2, 0.6, 0.3, 0.8],
      decomposer: [0.2, 0.3, 0.9, 0.4, 0.1, 0.8, 0.2, 0.3],
      transformer: [0.5, 0.5, 0.4, 0.9, 0.5, 0.3, 0.7, 0.5],
      storage: [0.1, 0.2, 0.3, 0.2, 0.9, 0.4, 0.1, 0.1],
      regulator: [0.4, 0.6, 0.5, 0.6, 0.3, 0.9, 0.8, 0.6],
    };

    const base = baseVectors[niche];
    return base.map(v => Math.max(0, Math.min(1, v + (Math.random() - 0.5) * 0.2)));
  }

  addInteraction(source: string, target: string, type: EcologicalRelation, strength: number): void {
    if (!this._modules.has(source) || !this._modules.has(target)) return;
    if (source === target) return;

    const id = `${source}:${target}:${type}`;
    const existing = this._interactions.find(i => i.id === id);
    if (existing) {
      existing.strength = strength;
      existing.frequency++;
      return;
    }

    const interaction: EcologicalInteraction = {
      id,
      source,
      target,
      type,
      strength,
      frequency: 1,
    };

    this._interactions.push(interaction);

    const sourceList = this._interactionIndex.get(source) || [];
    sourceList.push(interaction);
    this._interactionIndex.set(source, sourceList);

    const targetList = this._interactionIndex.get(target) || [];
    targetList.push(interaction);
    this._interactionIndex.set(target, targetList);
  }

  removeModule(id: string): void {
    this._modules.delete(id);
    this._interactionIndex.delete(id);
    this._interactions = this._interactions.filter(i => i.source !== id && i.target !== id);
    for (const key of this._interactionIndex.keys()) {
      const list = this._interactionIndex.get(key) || [];
      this._interactionIndex.set(key, list.filter(i => i.source !== id && i.target !== id));
    }
  }

  update(deltaTime: number): void {
    const dt = deltaTime / 1000;

    this._regenerateResources(dt);
    this._applyInteractions(dt);
    this._updatePopulations(dt);
    this._applyDisturbance(dt);
    this._updateSuccession(dt);
    this._extinctCheck();

    this._lastUpdate = Date.now();
    this._recordState();
  }

  private _regenerateResources(dt: number): void {
    const regen = this._resourceRegenerationRate * dt;
    this._resources = Math.min(this._maxResources, this._resources + regen);
  }

  private _applyInteractions(dt: number): Map<string, number> {
    const growthModifiers: Map<string, number> = new Map();

    for (const interaction of this._interactions) {
      const source = this._modules.get(interaction.source);
      const target = this._modules.get(interaction.target);
      if (!source || !target) continue;

      const effect = interaction.strength * dt * (source.population / 100);

      switch (interaction.type) {
        case 'mutualism':
          this._modifyGrowth(growthModifiers, interaction.source, effect * 0.5);
          this._modifyGrowth(growthModifiers, interaction.target, effect * 0.5);
          break;
        case 'competition':
          this._modifyGrowth(growthModifiers, interaction.source, -effect * 0.3);
          this._modifyGrowth(growthModifiers, interaction.target, -effect * 0.3);
          break;
        case 'predation':
          this._modifyGrowth(growthModifiers, interaction.source, effect * 0.6);
          this._modifyGrowth(growthModifiers, interaction.target, -effect * 0.4);
          break;
        case 'parasitism':
          this._modifyGrowth(growthModifiers, interaction.source, effect * 0.3);
          this._modifyGrowth(growthModifiers, interaction.target, -effect * 0.5);
          break;
        case 'commensalism':
          this._modifyGrowth(growthModifiers, interaction.source, effect * 0.4);
          break;
        case 'amensalism':
          this._modifyGrowth(growthModifiers, interaction.target, -effect * 0.4);
          break;
      }
    }

    return growthModifiers;
  }

  private _modifyGrowth(map: Map<string, number>, id: string, delta: number): void {
    const current = map.get(id) || 0;
    map.set(id, current + delta);
  }

  private _updatePopulations(dt: number): void {
    const growthModifiers = this._applyInteractions(dt) as unknown as Map<string, number> || new Map<string, number>();

    const totalConsumption = Array.from(this._modules.values())
      .reduce((sum, m) => sum + m.population * m.resourceConsumption, 0);

    const resourceRatio = totalConsumption > 0
      ? Math.min(1, this._resources / totalConsumption)
      : 1;

    this._resources -= totalConsumption * 0.01 * dt;
    this._resources = Math.max(0, this._resources);

    for (const module of this._modules.values()) {
      const modifier = growthModifiers.get(module.id) || 0;
      const growth = (module.growthRate + modifier) * resourceRatio;

      const logisticGrowth = growth * module.population * (1 - module.population / module.carryingCapacity);
      const metabolicCost = module.metabolicRate * module.population * dt;

      module.population += logisticGrowth * dt;
      module.population -= metabolicCost;

      module.fitness = 0.5 * (logisticGrowth / Math.max(1, module.growthRate)) + 0.5 * resourceRatio;
      module.fitness = Math.max(0, Math.min(1, module.fitness));

      module.population = Math.max(0, module.population);
    }
  }

  private _applyDisturbance(dt: number): void {
    if (this._disturbanceLevel <= 0) return;

    for (const module of this._modules.values()) {
      const disturbanceEffect = this._disturbanceLevel * (1 - module.fitness) * 0.1 * dt;
      module.population *= (1 - disturbanceEffect);
    }

    this._resources *= (1 - this._disturbanceLevel * 0.05 * dt);
  }

  private _updateSuccession(dt: number): void {
    const diversity = this._computeBiodiversity();
    const targetStage = diversity * 0.8;
    this._successionStage += (targetStage - this._successionStage) * 0.01 * dt;
    this._successionStage = Math.max(0, Math.min(1, this._successionStage));

    this._invasionResistance = 0.3 + this._successionStage * 0.6;
  }

  private _extinctCheck(): void {
    const toRemove: string[] = [];
    for (const [id, module] of this._modules) {
      if (module.population < 0.5) {
        toRemove.push(id);
      }
    }
    for (const id of toRemove) {
      this.removeModule(id);
    }
  }

  private _computeBiodiversity(): number {
    const populations = Array.from(this._modules.values()).map(m => m.population);
    const total = populations.reduce((s, p) => s + p, 0);
    if (total === 0) return 0;

    let shannon = 0;
    for (const p of populations) {
      const proportion = p / total;
      if (proportion > 0) {
        shannon -= proportion * Math.log(proportion);
      }
    }

    const maxShannon = Math.log(this._modules.size || 1);
    return maxShannon > 0 ? shannon / maxShannon : 0;
  }

  private _computeStability(): number {
    const populations = Array.from(this._modules.values()).map(m => m.population);
    if (populations.length === 0) return 1;

    const mean = populations.reduce((s, p) => s + p, 0) / populations.length;
    const variance = populations.reduce((s, p) => s + (p - mean) ** 2, 0) / populations.length;
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 1;

    const connectivity = this._computeConnectivity();
    const diversity = this._computeBiodiversity();

    return Math.max(0, Math.min(1, (1 - cv * 0.5) * 0.4 + connectivity * 0.3 + diversity * 0.3));
  }

  private _computeConnectivity(): number {
    const n = this._modules.size;
    if (n < 2) return 0;
    const maxConnections = n * (n - 1);
    return maxConnections > 0 ? this._interactions.length / maxConnections : 0;
  }

  getState(): EcosystemState {
    const nicheDistribution: Record<ModuleNiche, number> = {
      producer: 0,
      consumer: 0,
      decomposer: 0,
      transformer: 0,
      storage: 0,
      regulator: 0,
    };

    const relationDistribution: Record<EcologicalRelation, number> = {
      competition: 0,
      mutualism: 0,
      predation: 0,
      parasitism: 0,
      commensalism: 0,
      amensalism: 0,
    };

    let totalPopulation = 0;
    let totalBiomass = 0;

    for (const module of this._modules.values()) {
      nicheDistribution[module.niche]++;
      totalPopulation += module.population;
      totalBiomass += module.population * module.fitness;
    }

    for (const interaction of this._interactions) {
      relationDistribution[interaction.type]++;
    }

    return {
      timestamp: Date.now(),
      totalPopulation,
      biodiversity: this._computeBiodiversity(),
      totalBiomass,
      stability: this._computeStability(),
      connectivity: this._computeConnectivity(),
      nicheDistribution,
      relationDistribution,
    };
  }

  private _recordState(): void {
    this._history.push(this.getState());
    if (this._history.length > this._maxHistory) {
      this._history.shift();
    }
  }

  getModule(id: string): ModuleNode | undefined {
    const module = this._modules.get(id);
    return module ? { ...module, vector: [...module.vector] } : undefined;
  }

  getInteractions(moduleId: string): EcologicalInteraction[] {
    const interactions = this._interactionIndex.get(moduleId) || [];
    return interactions.map(i => ({ ...i }));
  }

  getAllModules(): ModuleNode[] {
    return Array.from(this._modules.values()).map(m => ({ ...m, vector: [...m.vector] }));
  }

  getAllInteractions(): EcologicalInteraction[] {
    return this._interactions.map(i => ({ ...i }));
  }

  getHistory(): EcosystemState[] {
    return this._history.map(h => ({
      ...h,
      nicheDistribution: { ...h.nicheDistribution },
      relationDistribution: { ...h.relationDistribution },
    }));
  }

  injectResources(amount: number): void {
    this._resources = Math.min(this._maxResources, this._resources + amount);
  }

  introduceSpecies(id: string, name: string, niche: ModuleNiche, initialPopulation: number = 5): boolean {
    if (this._modules.has(id)) return false;
    if (Math.random() > this._invasionResistance) {
      this.addModule(id, name, niche);
      const module = this._modules.get(id);
      if (module) {
        module.population = initialPopulation;
      }
      return true;
    }
    return false;
  }

  simulate(steps: number, deltaTime: number = 100): EcosystemState[] {
    const results: EcosystemState[] = [];
    for (let i = 0; i < steps; i++) {
      this.update(deltaTime);
      results.push(this.getState());
    }
    return results;
  }

  processPacket(packet: DataPacket): DataPacket {
    const state = this.getState();
    return {
      ...packet,
      payload: {
        ...packet.payload as object,
        ecosystem: {
          biodiversity: state.biodiversity,
          stability: state.stability,
          totalPopulation: state.totalPopulation,
          connectivity: state.connectivity,
          resources: this._resources,
          succession: this._successionStage,
        },
      },
      metadata: {
        ...packet.metadata,
        route: [...packet.metadata.route, 'module-ecosystem'],
        residue: state,
      },
    };
  }

  reset(): void {
    this._modules.clear();
    this._interactions = [];
    this._interactionIndex.clear();
    this._resources = 100;
    this._history = [];
    this._disturbanceLevel = 0;
    this._successionStage = 0;
    this._invasionResistance = 0.6;
    this._lastUpdate = Date.now();
    this._initializeFounderSpecies();
  }
}
