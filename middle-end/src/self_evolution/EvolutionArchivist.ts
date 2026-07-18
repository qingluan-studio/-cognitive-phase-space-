import { DataPacket, KnowledgeUnit } from '../shared/types';

export interface EvolutionRecord {
  id: string;
  entityId: string;
  entityType: string;
  generation: number;
  parentId: string | null;
  timestamp: number;
  metrics: Record<string, number>;
  overallFitness: number;
  genotype: string[];
  phenotype: string;
  status: 'alive' | 'archived' | 'extinct' | 'dominant';
  eventType: 'birth' | 'mutation' | 'crossover' | 'evaluation' | 'selection' | 'death';
}

export interface LineageNode {
  id: string;
  entityId: string;
  parentId: string | null;
  children: string[];
  generation: number;
  fitness: number;
  birthTime: number;
}

export interface LineageTree {
  rootId: string;
  nodes: Map<string, LineageNode>;
  maxDepth: number;
  totalNodes: number;
  extinctCount: number;
}

export interface EvolutionPhase {
  id: string;
  name: string;
  startGeneration: number;
  endGeneration: number;
  bestFitness: number;
  avgFitness: number;
  populationSize: number;
  milestones: string[];
  description: string;
}

export interface ArchiveStats {
  totalRecords: number;
  uniqueEntities: number;
  generations: number;
  lineages: number;
  phases: number;
  avgGenerationTime: number;
  survivalRate: number;
}

export class EvolutionArchivist {
  private _records: EvolutionRecord[];
  private _lineages: Map<string, LineageTree>;
  private _phases: EvolutionPhase[];
  private _entityIndex: Map<string, EvolutionRecord[]>;
  private _generationIndex: Map<number, string[]>;
  private _stats: ArchiveStats;
  private _checkpoints: Map<string, { generation: number; snapshot: unknown; timestamp: number }>;

  constructor() {
    this._records = [];
    this._lineages = new Map();
    this._phases = [];
    this._entityIndex = new Map();
    this._generationIndex = new Map();
    this._checkpoints = new Map();
    this._stats = {
      totalRecords: 0,
      uniqueEntities: 0,
      generations: 0,
      lineages: 0,
      phases: 0,
      avgGenerationTime: 0,
      survivalRate: 0
    };
  }

  get recordCount(): number { return this._records.length; }
  get lineageCount(): number { return this._lineages.size; }
  get phaseCount(): number { return this._phases.length; }
  get stats(): ArchiveStats { return { ...this._stats }; }
  get currentGeneration(): number { return this._stats.generations; }

  public recordEvent(record: Omit<EvolutionRecord, 'id' | 'timestamp'>): EvolutionRecord {
    const fullRecord: EvolutionRecord = {
      ...record,
      id: `record_${record.entityId}_${record.eventType}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: Date.now()
    };

    this._records.push(fullRecord);

    if (!this._entityIndex.has(fullRecord.entityId)) {
      this._entityIndex.set(fullRecord.entityId, []);
    }
    this._entityIndex.get(fullRecord.entityId)!.push(fullRecord);

    if (!this._generationIndex.has(fullRecord.generation)) {
      this._generationIndex.set(fullRecord.generation, []);
    }
    this._generationIndex.get(fullRecord.generation)!.push(fullRecord.entityId);

    this._stats.totalRecords++;
    this._stats.uniqueEntities = this._entityIndex.size;
    this._stats.generations = Math.max(this._stats.generations, fullRecord.generation + 1);

    this._updateLineage(fullRecord);
    this._recalcStats();

    return fullRecord;
  }

  private _updateLineage(record: EvolutionRecord): void {
    if (record.eventType === 'birth' && !record.parentId) {
      const tree: LineageTree = {
        rootId: record.entityId,
        nodes: new Map(),
        maxDepth: 0,
        totalNodes: 1,
        extinctCount: 0
      };
      
      tree.nodes.set(record.entityId, {
        id: record.entityId,
        entityId: record.entityId,
        parentId: null,
        children: [],
        generation: record.generation,
        fitness: record.overallFitness,
        birthTime: record.timestamp
      });

      this._lineages.set(record.entityId, tree);
      this._stats.lineages = this._lineages.size;
    } else if (record.parentId) {
      for (const tree of this._lineages.values()) {
        if (tree.nodes.has(record.parentId)) {
          const parentNode = tree.nodes.get(record.parentId)!;
          
          const childNode: LineageNode = {
            id: record.entityId,
            entityId: record.entityId,
            parentId: record.parentId,
            children: [],
            generation: record.generation,
            fitness: record.overallFitness,
            birthTime: record.timestamp
          };
          
          tree.nodes.set(record.entityId, childNode);
          parentNode.children.push(record.entityId);
          tree.totalNodes++;
          tree.maxDepth = Math.max(tree.maxDepth, record.generation);
          
          if (record.status === 'extinct') {
            tree.extinctCount++;
          }
          break;
        }
      }
    }

    if (record.eventType === 'death' || record.status === 'extinct') {
      for (const tree of this._lineages.values()) {
        const node = tree.nodes.get(record.entityId);
        if (node) {
          tree.extinctCount++;
          break;
        }
      }
    }
  }

  private _recalcStats(): void {
    if (this._records.length < 2) return;

    const firstRecord = this._records[0];
    const lastRecord = this._records[this._records.length - 1];
    const totalTime = lastRecord.timestamp - firstRecord.timestamp;
    this._stats.avgGenerationTime = this._stats.generations > 1
      ? totalTime / (this._stats.generations * 1000)
      : 0;

    const alive = new Set(
      this._records.filter(r => r.status === 'alive' || r.status === 'dominant').map(r => r.entityId)
    );
    this._stats.survivalRate = this._stats.uniqueEntities > 0
      ? alive.size / this._stats.uniqueEntities
      : 0;

    this._stats.phases = this._phases.length;
  }

  public getRecords(entityId: string): EvolutionRecord[] {
    return this._entityIndex.get(entityId) || [];
  }

  public getLatestRecord(entityId: string): EvolutionRecord | undefined {
    const records = this._entityIndex.get(entityId);
    return records && records.length > 0 ? records[records.length - 1] : undefined;
  }

  public getGenerationRecords(generation: number): EvolutionRecord[] {
    const entityIds = this._generationIndex.get(generation) || [];
    const result: EvolutionRecord[] = [];
    const seen = new Set<string>();
    
    for (const entityId of entityIds) {
      const records = this._entityIndex.get(entityId) || [];
      for (const record of records) {
        if (record.generation === generation && !seen.has(record.entityId)) {
          result.push(record);
          seen.add(record.entityId);
        }
      }
    }
    
    return result;
  }

  public getLineage(entityId: string): LineageTree | null {
    for (const tree of this._lineages.values()) {
      if (tree.nodes.has(entityId)) {
        return tree;
      }
    }
    return null;
  }

  public getAncestors(entityId: string): EvolutionRecord[] {
    const ancestors: EvolutionRecord[] = [];
    let currentId: string | null = entityId;
    
    while (currentId) {
      const records = this._entityIndex.get(currentId);
      if (records && records.length > 0) {
        ancestors.push(records[0]);
        currentId = records[0].parentId;
      } else {
        break;
      }
    }
    
    return ancestors;
  }

  public getDescendants(entityId: string): EvolutionRecord[] {
    const tree = this.getLineage(entityId);
    if (!tree) return [];

    const descendants: EvolutionRecord[] = [];
    const queue: string[] = [entityId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      const node = tree.nodes.get(current);
      if (!node) continue;

      if (current !== entityId) {
        const records = this._entityIndex.get(current);
        if (records && records.length > 0) {
          descendants.push(records[0]);
        }
      }

      queue.push(...node.children);
    }

    return descendants;
  }

  public createPhase(
    name: string,
    startGen: number,
    endGen: number,
    description: string,
    milestones: string[] = []
  ): EvolutionPhase {
    let bestFitness = 0;
    let totalFitness = 0;
    let count = 0;
    const entitiesSeen = new Set<string>();

    for (let g = startGen; g <= endGen; g++) {
      const entityIds = this._generationIndex.get(g) || [];
      for (const id of entityIds) {
        if (entitiesSeen.has(id)) continue;
        entitiesSeen.add(id);
        const records = this._entityIndex.get(id) || [];
        const record = records.find(r => r.generation === g);
        if (record) {
          bestFitness = Math.max(bestFitness, record.overallFitness);
          totalFitness += record.overallFitness;
          count++;
        }
      }
    }

    const phase: EvolutionPhase = {
      id: `phase_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name,
      startGeneration: startGen,
      endGeneration: endGen,
      bestFitness,
      avgFitness: count > 0 ? totalFitness / count : 0,
      populationSize: count,
      milestones: [...milestones],
      description
    };

    this._phases.push(phase);
    this._stats.phases = this._phases.length;
    return phase;
  }

  public getPhase(phaseId: string): EvolutionPhase | undefined {
    return this._phases.find(p => p.id === phaseId);
  }

  public getPhases(): EvolutionPhase[] {
    return [...this._phases];
  }

  public getFitnessTrend(): { generation: number; best: number; average: number; population: number }[] {
    const trend: { generation: number; best: number; average: number; population: number }[] = [];
    
    for (const [gen] of this._generationIndex) {
      const entityIds = this._generationIndex.get(gen) || [];
      let best = 0;
      let total = 0;
      let count = 0;
      const seen = new Set<string>();

      for (const id of entityIds) {
        if (seen.has(id)) continue;
        seen.add(id);
        const records = this._entityIndex.get(id) || [];
        const record = records.find(r => r.generation === gen);
        if (record) {
          best = Math.max(best, record.overallFitness);
          total += record.overallFitness;
          count++;
        }
      }

      trend.push({
        generation: gen,
        best,
        average: count > 0 ? total / count : 0,
        population: count
      });
    }

    trend.sort((a, b) => a.generation - b.generation);
    return trend;
  }

  public saveCheckpoint(name: string, snapshot: unknown): void {
    this._checkpoints.set(name, {
      generation: this._stats.generations,
      snapshot,
      timestamp: Date.now()
    });
  }

  public getCheckpoint(name: string): { generation: number; snapshot: unknown; timestamp: number } | undefined {
    return this._checkpoints.get(name);
  }

  public listCheckpoints(): string[] {
    return Array.from(this._checkpoints.keys());
  }

  public findDominantSpecies(count: number = 5): EvolutionRecord[] {
    const latestByEntity = new Map<string, EvolutionRecord>();
    
    for (const record of this._records) {
      const existing = latestByEntity.get(record.entityId);
      if (!existing || record.generation > existing.generation) {
        latestByEntity.set(record.entityId, record);
      }
    }

    return Array.from(latestByEntity.values())
      .filter(r => r.status === 'alive' || r.status === 'dominant')
      .sort((a, b) => b.overallFitness - a.overallFitness)
      .slice(0, count);
  }

  public getLongestLineage(): LineageTree | null {
    let longest: LineageTree | null = null;
    for (const tree of this._lineages.values()) {
      if (!longest || tree.maxDepth > longest.maxDepth) {
        longest = tree;
      }
    }
    return longest;
  }

  public compareGenerations(genA: number, genB: number): {
    fitnessDelta: number;
    populationDelta: number;
    bestDelta: number;
  } {
    const trend = this.getFitnessTrend();
    const a = trend.find(t => t.generation === genA);
    const b = trend.find(t => t.generation === genB);

    if (!a || !b) {
      return { fitnessDelta: 0, populationDelta: 0, bestDelta: 0 };
    }

    return {
      fitnessDelta: b.average - a.average,
      populationDelta: b.population - a.population,
      bestDelta: b.best - a.best
    };
  }

  public searchRecords(
    filters: {
      entityType?: string;
      eventType?: string;
      status?: string;
      minFitness?: number;
      maxFitness?: number;
      generation?: number;
    }
  ): EvolutionRecord[] {
    return this._records.filter(r => {
      if (filters.entityType && r.entityType !== filters.entityType) return false;
      if (filters.eventType && r.eventType !== filters.eventType) return false;
      if (filters.status && r.status !== filters.status) return false;
      if (filters.minFitness !== undefined && r.overallFitness < filters.minFitness) return false;
      if (filters.maxFitness !== undefined && r.overallFitness > filters.maxFitness) return false;
      if (filters.generation !== undefined && r.generation !== filters.generation) return false;
      return true;
    });
  }

  public extractKnowledgeUnit(entityId: string): KnowledgeUnit | null {
    const records = this._entityIndex.get(entityId);
    if (!records || records.length === 0) return null;

    const latest = records[records.length - 1];
    const ancestors = this.getAncestors(entityId);
    
    const metricKeys = Object.keys(latest.metrics);
    const metricValues = metricKeys.slice(0, 8).map(k => latest.metrics[k] || 0);

    const vector = [
      latest.overallFitness,
      latest.generation / 50,
      ancestors.length / 20,
      latest.genotype.length / 10,
      latest.status === 'dominant' ? 1 : latest.status === 'alive' ? 0.7 : latest.status === 'archived' ? 0.3 : 0,
      ...metricValues
    ];

    return {
      id: `archive_knowledge_${entityId}`,
      content: `${latest.entityType} entity at generation ${latest.generation}, fitness ${latest.overallFitness.toFixed(3)}`,
      vector: vector.slice(0, 16),
      lineage: ['evolution_archivist', latest.entityType, ...ancestors.map(a => a.entityId).slice(0, 5)]
    };
  }

  public exportArchivePacket(): DataPacket<ArchiveStats> {
    return {
      id: `archive_packet_${Date.now()}`,
      payload: { ...this._stats },
      metadata: {
        createdAt: Date.now(),
        route: ['self_evolution', 'evolution_archivist'],
        priority: 2,
        phase: 'archiving'
      }
    };
  }

  public reset(): void {
    this._records = [];
    this._lineages.clear();
    this._phases = [];
    this._entityIndex.clear();
    this._generationIndex.clear();
    this._checkpoints.clear();
    this._stats = {
      totalRecords: 0,
      uniqueEntities: 0,
      generations: 0,
      lineages: 0,
      phases: 0,
      avgGenerationTime: 0,
      survivalRate: 0
    };
  }

  public exportAllRecords(): EvolutionRecord[] {
    return this._records.map(r => ({
      ...r,
      metrics: { ...r.metrics },
      genotype: [...r.genotype]
    }));
  }
}
