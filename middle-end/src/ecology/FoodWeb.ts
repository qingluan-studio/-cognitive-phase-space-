import type { DataPacket, KnowledgeUnit } from '../shared/types';

export type TrophicLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type FeedingType = 'autotroph' | 'herbivore' | 'carnivore' | 'omnivore' | 'detritivore' | 'parasite';

export interface TrophicNode {
  id: string;
  name: string;
  level: TrophicLevel;
  feedingType: FeedingType;
  biomass: number;
  productivity: number;
  efficiency: number;
  consumptionRate: number;
  maxBiomass: number;
  isKeystone: boolean;
}

export interface TrophicLink {
  id: string;
  source: string;
  target: string;
  energyFlow: number;
  interactionStrength: number;
  feedingEfficiency: number;
}

export interface FoodWebState {
  timestamp: number;
  totalBiomass: number;
  totalProductivity: number;
  trophicPyramid: number[];
  avgEfficiency: number;
  complexity: number;
  connectance: number;
  stability: number;
}

export interface TrophicCascade {
  origin: string;
  affectedNodes: string[];
  magnitude: number;
  direction: 'top-down' | 'bottom-up';
  propagation: number[];
}

export interface IFoodWeb {
  addNode(id: string, name: string, level: TrophicLevel, feedingType: FeedingType): void;
  addLink(source: string, target: string, strength: number): void;
  removeNode(id: string): void;
  update(deltaTime: number): void;
  getState(): FoodWebState;
  getNode(id: string): TrophicNode | undefined;
  getLinks(nodeId: string): TrophicLink[];
  simulateCascade(nodeId: string, perturbation: number): TrophicCascade;
  processPacket(packet: DataPacket): DataPacket;
  reset(): void;
}

export class FoodWeb implements IFoodWeb {
  private _nodes: Map<string, TrophicNode> = new Map();
  private _links: TrophicLink[] = [];
  private _preyIndex: Map<string, string[]> = new Map();
  private _predatorIndex: Map<string, string[]> = new Map();
  private _history: FoodWebState[] = [];
  private _maxHistory: number = 200;
  private _baseResourceInput: number = 10;
  private _trophicEfficiency: number = 0.1;
  private _decayRate: number = 0.02;
  private _lastUpdate: number = Date.now();
  private _topDownControl: number = 0.5;
  private _bottomUpControl: number = 0.5;
  private _complexity: number = 0;
  private _connectance: number = 0;

  constructor() {
    this._initializeDefaultWeb();
  }

  get nodeCount(): number { return this._nodes.size; }
  get linkCount(): number { return this._links.length; }
  get totalBiomass(): number { return this._computeTotalBiomass(); }
  get complexity(): number { return this._complexity; }
  get connectance(): number { return this._connectance; }
  get trophicEfficiency(): number { return this._trophicEfficiency; }
  set trophicEfficiency(value: number) { this._trophicEfficiency = Math.max(0.01, Math.min(0.5, value)); }
  get topDownControl(): number { return this._topDownControl; }
  set topDownControl(value: number) { this._topDownControl = Math.max(0, Math.min(1, value)); }
  get bottomUpControl(): number { return this._bottomUpControl; }
  set bottomUpControl(value: number) { this._bottomUpControl = Math.max(0, Math.min(1, value)); }

  private _initializeDefaultWeb(): void {
    this.addNode('plants', '生产者植物', 1, 'autotroph');
    this.addNode('herbivores', '草食动物', 2, 'herbivore');
    this.addNode('primary-carnivores', '初级肉食', 3, 'carnivore');
    this.addNode('top-predators', '顶级捕食者', 4, 'carnivore');
    this.addNode('decomposers', '分解者', 0, 'detritivore');

    this.addLink('plants', 'herbivores', 0.6);
    this.addLink('herbivores', 'primary-carnivores', 0.5);
    this.addLink('primary-carnivores', 'top-predators', 0.4);
    this.addLink('plants', 'decomposers', 0.3);
    this.addLink('herbivores', 'decomposers', 0.2);
    this.addLink('primary-carnivores', 'decomposers', 0.15);
    this.addLink('top-predators', 'decomposers', 0.1);

    const plants = this._nodes.get('plants');
    const herbivores = this._nodes.get('herbivores');
    const primaryCarn = this._nodes.get('primary-carnivores');
    const topPred = this._nodes.get('top-predators');
    const decomposers = this._nodes.get('decomposers');

    if (plants) plants.biomass = 100;
    if (herbivores) herbivores.biomass = 25;
    if (primaryCarn) primaryCarn.biomass = 6;
    if (topPred) topPred.biomass = 1.5;
    if (decomposers) decomposers.biomass = 15;

    this._updateComplexityMetrics();
  }

  addNode(id: string, name: string, level: TrophicLevel, feedingType: FeedingType): void {
    if (this._nodes.has(id)) return;

    const baseBiomass = Math.pow(0.2, level) * 100;

    const node: TrophicNode = {
      id,
      name,
      level,
      feedingType,
      biomass: baseBiomass,
      productivity: feedingType === 'autotroph' ? 0.1 : 0.05,
      efficiency: this._trophicEfficiency * (0.8 + Math.random() * 0.4),
      consumptionRate: feedingType === 'autotroph' ? 0 : 0.3,
      maxBiomass: baseBiomass * 3,
      isKeystone: false,
    };

    this._nodes.set(id, node);
    this._preyIndex.set(id, []);
    this._predatorIndex.set(id, []);
  }

  addLink(source: string, target: string, strength: number): void {
    if (!this._nodes.has(source) || !this._nodes.has(target)) return;
    if (source === target) return;

    const id = `${source}->${target}`;
    const existing = this._links.find(l => l.id === id);
    if (existing) {
      existing.interactionStrength = strength;
      return;
    }

    const sourceNode = this._nodes.get(source)!;
    const targetNode = this._nodes.get(target)!;

    const link: TrophicLink = {
      id,
      source,
      target,
      energyFlow: 0,
      interactionStrength: strength,
      feedingEfficiency: targetNode.efficiency,
    };

    this._links.push(link);

    const preyList = this._predatorIndex.get(source) || [];
    if (!preyList.includes(target)) preyList.push(target);
    this._predatorIndex.set(source, preyList);

    const predatorList = this._preyIndex.get(target) || [];
    if (!predatorList.includes(source)) predatorList.push(source);
    this._preyIndex.set(target, predatorList);

    this._updateComplexityMetrics();
  }

  removeNode(id: string): void {
    this._nodes.delete(id);
    this._preyIndex.delete(id);
    this._predatorIndex.delete(id);
    this._links = this._links.filter(l => l.source !== id && l.target !== id);

    for (const key of this._preyIndex.keys()) {
      const list = this._preyIndex.get(key) || [];
      this._preyIndex.set(key, list.filter(x => x !== id));
    }
    for (const key of this._predatorIndex.keys()) {
      const list = this._predatorIndex.get(key) || [];
      this._predatorIndex.set(key, list.filter(x => x !== id));
    }

    this._updateComplexityMetrics();
  }

  private _updateComplexityMetrics(): void {
    const n = this._nodes.size;
    const l = this._links.length;
    const maxLinks = n * (n - 1);
    this._connectance = maxLinks > 0 ? l / maxLinks : 0;
    this._complexity = this._connectance * n;
  }

  update(deltaTime: number): void {
    const dt = deltaTime / 1000;

    this._updatePrimaryProduction(dt);
    this._updateEnergyFlow(dt);
    this._updateBiomass(dt);
    this._enforceTrophicConstraints();
    this._computeStability();

    this._lastUpdate = Date.now();
    this._recordState();
  }

  private _updatePrimaryProduction(dt: number): void {
    for (const node of this._nodes.values()) {
      if (node.feedingType === 'autotroph') {
        const growth = node.productivity * this._baseResourceInput * dt;
        node.biomass += growth;
        node.biomass = Math.min(node.maxBiomass, node.biomass);
      }
    }
  }

  private _updateEnergyFlow(dt: number): void {
    for (const link of this._links) {
      const prey = this._nodes.get(link.source);
      const predator = this._nodes.get(link.target);
      if (!prey || !predator) continue;

      const maxConsumption = predator.consumptionRate * predator.biomass * dt;
      const availablePrey = prey.biomass * link.interactionStrength * 0.1;
      const actualConsumption = Math.min(maxConsumption, availablePrey);

      link.energyFlow = actualConsumption;

      prey.biomass -= actualConsumption;
      predator.biomass += actualConsumption * link.feedingEfficiency;
    }
  }

  private _updateBiomass(dt: number): void {
    for (const node of this._nodes.values()) {
      node.biomass *= (1 - this._decayRate * dt);
      node.biomass = Math.max(0.001, node.biomass);
      node.biomass = Math.min(node.maxBiomass, node.biomass);
    }
  }

  private _enforceTrophicConstraints(): void {
    let total = 0;
    const levelBiomass: number[] = [0, 0, 0, 0, 0, 0];

    for (const node of this._nodes.values()) {
      levelBiomass[node.level] += node.biomass;
      total += node.biomass;
    }

    for (let i = 1; i < levelBiomass.length; i++) {
      if (levelBiomass[i] > 0 && levelBiomass[i - 1] > 0) {
        const ratio = levelBiomass[i] / levelBiomass[i - 1];
        if (ratio > 1 / this._trophicEfficiency) {
          const maxBiomass = levelBiomass[i - 1] * this._trophicEfficiency;
          const scale = maxBiomass / levelBiomass[i];
          for (const node of this._nodes.values()) {
            if (node.level === i) {
              node.biomass *= scale;
            }
          }
        }
      }
    }
  }

  private _computeTotalBiomass(): number {
    return Array.from(this._nodes.values()).reduce((s, n) => s + n.biomass, 0);
  }

  private _computeStability(): number {
    const biomasses = Array.from(this._nodes.values()).map(n => n.biomass);
    if (biomasses.length === 0) return 1;

    const mean = biomasses.reduce((s, b) => s + b, 0) / biomasses.length;
    const variance = biomasses.reduce((s, b) => s + (b - mean) ** 2, 0) / biomasses.length;
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 1;

    const complexityStability = 1 - Math.min(1, this._complexity * 0.1);
    const biomassStability = 1 - Math.min(1, cv * 0.5);

    return complexityStability * 0.4 + biomassStability * 0.6;
  }

  getState(): FoodWebState {
    const trophicPyramid: number[] = [0, 0, 0, 0, 0, 0];
    let totalProd = 0;
    let totalEff = 0;
    let effCount = 0;

    for (const node of this._nodes.values()) {
      trophicPyramid[node.level] += node.biomass;
      totalProd += node.productivity * node.biomass;
      if (node.level > 0) {
        totalEff += node.efficiency;
        effCount++;
      }
    }

    return {
      timestamp: Date.now(),
      totalBiomass: this._computeTotalBiomass(),
      totalProductivity: totalProd,
      trophicPyramid,
      avgEfficiency: effCount > 0 ? totalEff / effCount : 0,
      complexity: this._complexity,
      connectance: this._connectance,
      stability: this._computeStability(),
    };
  }

  private _recordState(): void {
    this._history.push(this.getState());
    if (this._history.length > this._maxHistory) {
      this._history.shift();
    }
  }

  getNode(id: string): TrophicNode | undefined {
    const node = this._nodes.get(id);
    return node ? { ...node } : undefined;
  }

  getLinks(nodeId: string): TrophicLink[] {
    return this._links
      .filter(l => l.source === nodeId || l.target === nodeId)
      .map(l => ({ ...l }));
  }

  getAllNodes(): TrophicNode[] {
    return Array.from(this._nodes.values()).map(n => ({ ...n }));
  }

  getAllLinks(): TrophicLink[] {
    return this._links.map(l => ({ ...l }));
  }

  getTrophicLevel(level: TrophicLevel): TrophicNode[] {
    return Array.from(this._nodes.values())
      .filter(n => n.level === level)
      .map(n => ({ ...n }));
  }

  simulateCascade(nodeId: string, perturbation: number): TrophicCascade {
    const originNode = this._nodes.get(nodeId);
    if (!originNode) {
      return { origin: nodeId, affectedNodes: [], magnitude: 0, direction: 'top-down', propagation: [] };
    }

    const direction: 'top-down' | 'bottom-up' = perturbation > 0 ? 'bottom-up' : 'top-down';
    const affectedNodes: string[] = [nodeId];
    const propagation: number[] = [perturbation];
    let currentMagnitude = perturbation;

    const visited = new Set<string>([nodeId]);
    const queue: Array<{ id: string; magnitude: number }> = [{ id: nodeId, magnitude: perturbation }];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentNode = this._nodes.get(current.id);
      if (!currentNode) continue;

      const neighbors = direction === 'top-down'
        ? this._predatorIndex.get(current.id) || []
        : this._preyIndex.get(current.id) || [];

      for (const neighborId of neighbors) {
        if (visited.has(neighborId)) continue;
        visited.add(neighborId);

        const link = this._links.find(l =>
          (direction === 'top-down' && l.source === current.id && l.target === neighborId) ||
          (direction === 'bottom-up' && l.target === current.id && l.source === neighborId)
        );

        const transferStrength = link ? link.interactionStrength * this._trophicEfficiency : 0.1;
        const neighborMagnitude = current.magnitude * transferStrength;

        if (Math.abs(neighborMagnitude) > 0.01) {
          affectedNodes.push(neighborId);
          propagation.push(neighborMagnitude);
          queue.push({ id: neighborId, magnitude: neighborMagnitude });
          currentMagnitude = neighborMagnitude;
        }
      }
    }

    return {
      origin: nodeId,
      affectedNodes,
      magnitude: Math.abs(propagation[propagation.length - 1] || 0),
      direction,
      propagation,
    };
  }

  setKeystone(nodeId: string, isKeystone: boolean): void {
    const node = this._nodes.get(nodeId);
    if (node) {
      node.isKeystone = isKeystone;
    }
  }

  getKeystoneSpecies(): TrophicNode[] {
    return Array.from(this._nodes.values())
      .filter(n => n.isKeystone)
      .map(n => ({ ...n }));
  }

  getHistory(): FoodWebState[] {
    return this._history.map(h => ({
      ...h,
      trophicPyramid: [...h.trophicPyramid],
    }));
  }

  perturbBiomass(nodeId: string, amount: number): void {
    const node = this._nodes.get(nodeId);
    if (node) {
      node.biomass = Math.max(0.001, node.biomass + amount);
    }
  }

  simulate(steps: number, deltaTime: number = 100): FoodWebState[] {
    const results: FoodWebState[] = [];
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
        foodWeb: {
          totalBiomass: state.totalBiomass,
          complexity: state.complexity,
          connectance: state.connectance,
          stability: state.stability,
          trophicPyramid: state.trophicPyramid,
        },
      },
      metadata: {
        ...packet.metadata,
        route: [...packet.metadata.route, 'food-web'],
        residue: state,
      },
    };
  }

  reset(): void {
    this._nodes.clear();
    this._links = [];
    this._preyIndex.clear();
    this._predatorIndex.clear();
    this._history = [];
    this._complexity = 0;
    this._connectance = 0;
    this._lastUpdate = Date.now();
    this._initializeDefaultWeb();
  }
}
