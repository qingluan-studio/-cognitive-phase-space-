import type { DataPacket, KnowledgeUnit } from '../shared/types';

export type SocialClass = 'upper' | 'upper-middle' | 'middle' | 'lower-middle' | 'working' | 'lower';

export type MobilityType = 'upward' | 'downward' | 'horizontal' | 'immobile';

export type StratificationDimension = 'economic' | 'social' | 'cultural' | 'political' | 'educational';

export interface SocialActor {
  id: string;
  name: string;
  classPosition: SocialClass;
  statusScore: number;
  wealth: number;
  education: number;
  socialCapital: number;
  culturalCapital: number;
  politicalCapital: number;
  groupId: string;
  mobilityHistory: MobilityType[];
}

export interface StratificationLayer {
  name: SocialClass;
  size: number;
  totalWealth: number;
  avgStatus: number;
  avgEducation: number;
  avgSocialCapital: number;
  mobilityRate: number;
  percentage: number;
}

export interface PowerStructure {
  concentration: number;
  giniCoefficient: number;
  top10Share: number;
  bottom50Share: number;
  powerIndex: Map<string, number>;
}

export interface StratificationState {
  actorCount: number;
  layers: Record<SocialClass, StratificationLayer>;
  giniCoefficient: number;
  mobilityRate: number;
  socialElasticity: number;
  inequality: number;
  dimensionScores: Record<StratificationDimension, number>;
  powerConcentration: number;
}

export interface ISocialStratification {
  addActor(id: string, name: string, classPosition: SocialClass, groupId?: string): void;
  removeActor(id: string): void;
  promoteActor(actorId: string, amount: number): void;
  demoteActor(actorId: string, amount: number): void;
  computeGini(): number;
  computeMobility(): number;
  getStratification(): StratificationState;
  getActor(id: string): SocialActor | undefined;
  getLayer(className: SocialClass): StratificationLayer;
  update(deltaTime: number): void;
  processPacket(packet: DataPacket): DataPacket;
  reset(): void;
}

export class SocialStratification implements ISocialStratification {
  private _actors: Map<string, SocialActor> = new Map();
  private _layers: Record<SocialClass, StratificationLayer>;
  private _history: StratificationState[] = [];
  private _maxHistory: number = 100;
  private _lastUpdate: number = Date.now();
  private _mobilityRate: number = 0.05;
  private _inequality: number = 0.5;
  private _elasticity: number = 0.3;
  private _classBoundaries: Record<SocialClass, [number, number]>;
  private _intergenerationalCorrelation: number = 0.5;
  private _meritocracyFactor: number = 0.4;
  private _inheritanceFactor: number = 0.6;
  private _networkEffect: number = 0.3;

  constructor() {
    this._layers = this._initializeLayers();
    this._classBoundaries = {
      upper: [0.9, 1.0],
      'upper-middle': [0.7, 0.9],
      middle: [0.5, 0.7],
      'lower-middle': [0.3, 0.5],
      working: [0.15, 0.3],
      lower: [0, 0.15],
    };
    this._initializeDefaultPopulation();
  }

  get actorCount(): number { return this._actors.size; }
  get giniCoefficient(): number { return this.computeGini(); }
  get mobilityRate(): number { return this._mobilityRate; }
  set mobilityRate(value: number) { this._mobilityRate = Math.max(0, Math.min(0.5, value)); }
  get socialElasticity(): number { return this._elasticity; }
  set socialElasticity(value: number) { this._elasticity = Math.max(0, Math.min(1, value)); }
  get inequality(): number { return this._inequality; }
  get meritocracyFactor(): number { return this._meritocracyFactor; }
  set meritocracyFactor(value: number) { this._meritocracyFactor = Math.max(0, Math.min(1, value)); }

  private _initializeLayers(): Record<SocialClass, StratificationLayer> {
    const classNames: SocialClass[] = ['upper', 'upper-middle', 'middle', 'lower-middle', 'working', 'lower'];
    const result: any = {};
    for (const name of classNames) {
      result[name] = {
        name,
        size: 0,
        totalWealth: 0,
        avgStatus: 0,
        avgEducation: 0,
        avgSocialCapital: 0,
        mobilityRate: 0,
        percentage: 0,
      };
    }
    return result;
  }

  private _initializeDefaultPopulation(): void {
    const classSizes: Record<SocialClass, number> = {
      upper: 2,
      'upper-middle': 5,
      middle: 12,
      'lower-middle': 10,
      working: 15,
      lower: 6,
    };

    let idx = 0;
    for (const [className, size] of Object.entries(classSizes) as [SocialClass, number][]) {
      for (let i = 0; i < size; i++) {
        const id = `actor-${idx}`;
        const name = `个体${idx}`;
        this.addActor(id, name, className, 'default');
        idx++;
      }
    }

    this._updateLayerStats();
  }

  addActor(id: string, name: string, classPosition: SocialClass, groupId: string = 'default'): void {
    if (this._actors.has(id)) return;

    const [low, high] = this._classBoundaries[classPosition];
    const baseStatus = low + Math.random() * (high - low);

    const actor: SocialActor = {
      id,
      name,
      classPosition,
      statusScore: baseStatus,
      wealth: baseStatus * 0.6 + Math.random() * 0.2,
      education: baseStatus * 0.7 + Math.random() * 0.2,
      socialCapital: baseStatus * 0.5 + Math.random() * 0.3,
      culturalCapital: baseStatus * 0.6 + Math.random() * 0.25,
      politicalCapital: baseStatus * 0.4 + Math.random() * 0.3,
      groupId,
      mobilityHistory: [],
    };

    actor.wealth = Math.max(0, Math.min(1, actor.wealth));
    actor.education = Math.max(0, Math.min(1, actor.education));
    actor.socialCapital = Math.max(0, Math.min(1, actor.socialCapital));
    actor.culturalCapital = Math.max(0, Math.min(1, actor.culturalCapital));
    actor.politicalCapital = Math.max(0, Math.min(1, actor.politicalCapital));

    this._actors.set(id, actor);
  }

  removeActor(id: string): void {
    this._actors.delete(id);
    this._updateLayerStats();
  }

  promoteActor(actorId: string, amount: number): void {
    const actor = this._actors.get(actorId);
    if (!actor) return;

    const oldClass = actor.classPosition;
    actor.statusScore = Math.min(1, actor.statusScore + amount);
    const newClass = this._determineClass(actor.statusScore);

    if (oldClass !== newClass) {
      actor.classPosition = newClass;
      const mobility: MobilityType = this._isHigherClass(newClass, oldClass) ? 'upward' : 'downward';
      actor.mobilityHistory.push(mobility);
      if (actor.mobilityHistory.length > 20) {
        actor.mobilityHistory.shift();
      }
    }

    this._updateLayerStats();
  }

  demoteActor(actorId: string, amount: number): void {
    this.promoteActor(actorId, -amount);
  }

  private _determineClass(status: number): SocialClass {
    if (status >= 0.9) return 'upper';
    if (status >= 0.7) return 'upper-middle';
    if (status >= 0.5) return 'middle';
    if (status >= 0.3) return 'lower-middle';
    if (status >= 0.15) return 'working';
    return 'lower';
  }

  private _isHigherClass(a: SocialClass, b: SocialClass): boolean {
    const order: SocialClass[] = ['lower', 'working', 'lower-middle', 'middle', 'upper-middle', 'upper'];
    return order.indexOf(a) > order.indexOf(b);
  }

  computeGini(): number {
    const statuses = Array.from(this._actors.values())
      .map(a => a.statusScore)
      .sort((a, b) => a - b);

    const n = statuses.length;
    if (n === 0) return 0;

    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += (2 * i - n - 1) * statuses[i];
    }

    const mean = statuses.reduce((s, v) => s + v, 0) / n;
    return mean > 0 ? sum / (n * n * mean) : 0;
  }

  computeMobility(): number {
    let totalMobility = 0;
    let count = 0;

    for (const actor of this._actors.values()) {
      if (actor.mobilityHistory.length > 0) {
        const upward = actor.mobilityHistory.filter(m => m === 'upward').length;
        const downward = actor.mobilityHistory.filter(m => m === 'downward').length;
        totalMobility += (upward + downward) / actor.mobilityHistory.length;
        count++;
      }
    }

    return count > 0 ? totalMobility / count : 0;
  }

  getStratification(): StratificationState {
    this._updateLayerStats();

    const dimensionScores: Record<StratificationDimension, number> = {
      economic: this._computeDimensionGini('wealth'),
      social: this._computeDimensionGini('socialCapital'),
      cultural: this._computeDimensionGini('culturalCapital'),
      political: this._computeDimensionGini('politicalCapital'),
      educational: this._computeDimensionGini('education'),
    };

    return {
      actorCount: this._actors.size,
      layers: { ...this._layers },
      giniCoefficient: this.computeGini(),
      mobilityRate: this.computeMobility(),
      socialElasticity: this._elasticity,
      inequality: this._inequality,
      dimensionScores,
      powerConcentration: this._computePowerConcentration(),
    };
  }

  private _computeDimensionGini(dimension: keyof SocialActor): number {
    const values = Array.from(this._actors.values())
      .map(a => a[dimension] as number)
      .sort((a, b) => a - b);

    const n = values.length;
    if (n === 0) return 0;

    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += (2 * i - n - 1) * values[i];
    }

    const mean = values.reduce((s, v) => s + v, 0) / n;
    return mean > 0 ? sum / (n * n * mean) : 0;
  }

  private _computePowerConcentration(): number {
    const powers = Array.from(this._actors.values())
      .map(a =>
        a.wealth * 0.3 +
        a.statusScore * 0.25 +
        a.politicalCapital * 0.25 +
        a.socialCapital * 0.2
      )
      .sort((a, b) => b - a);

    if (powers.length === 0) return 0;

    const total = powers.reduce((s, p) => s + p, 0);
    const top10Count = Math.max(1, Math.floor(powers.length * 0.1));
    const top10Sum = powers.slice(0, top10Count).reduce((s, p) => s + p, 0);

    return total > 0 ? top10Sum / total : 0;
  }

  private _updateLayerStats(): void {
    const classNames: SocialClass[] = ['upper', 'upper-middle', 'middle', 'lower-middle', 'working', 'lower'];

    for (const name of classNames) {
      this._layers[name] = {
        name,
        size: 0,
        totalWealth: 0,
        avgStatus: 0,
        avgEducation: 0,
        avgSocialCapital: 0,
        mobilityRate: 0,
        percentage: 0,
      };
    }

    for (const actor of this._actors.values()) {
      const layer = this._layers[actor.classPosition];
      layer.size++;
      layer.totalWealth += actor.wealth;
      layer.avgStatus += actor.statusScore;
      layer.avgEducation += actor.education;
      layer.avgSocialCapital += actor.socialCapital;

      const upward = actor.mobilityHistory.filter(m => m === 'upward').length;
      const downward = actor.mobilityHistory.filter(m => m === 'downward').length;
      const total = actor.mobilityHistory.length || 1;
      layer.mobilityRate += (upward + downward) / total;
    }

    const totalActors = Math.max(1, this._actors.size);

    for (const name of classNames) {
      const layer = this._layers[name];
      if (layer.size > 0) {
        layer.avgStatus /= layer.size;
        layer.avgEducation /= layer.size;
        layer.avgSocialCapital /= layer.size;
        layer.mobilityRate /= layer.size;
      }
      layer.percentage = layer.size / totalActors;
    }
  }

  getActor(id: string): SocialActor | undefined {
    const actor = this._actors.get(id);
    return actor ? { ...actor, mobilityHistory: [...actor.mobilityHistory] } : undefined;
  }

  getLayer(className: SocialClass): StratificationLayer {
    this._updateLayerStats();
    return { ...this._layers[className] };
  }

  getAllActors(): SocialActor[] {
    return Array.from(this._actors.values())
      .map(a => ({ ...a, mobilityHistory: [...a.mobilityHistory] }))
      .sort((a, b) => b.statusScore - a.statusScore);
  }

  getTopActors(k: number = 10): SocialActor[] {
    return this.getAllActors().slice(0, k);
  }

  getBottomActors(k: number = 10): SocialActor[] {
    return this.getAllActors().slice(-k).reverse();
  }

  update(deltaTime: number): void {
    const dt = deltaTime / 1000;

    this._updateStatusScores(dt);
    this._simulateMobility(dt);
    this._updateInequality(dt);
    this._updateLayerStats();

    this._lastUpdate = Date.now();
    this._recordState();
  }

  private _updateStatusScores(dt: number): void {
    for (const actor of this._actors.values()) {
      const meritEffect = actor.education * this._meritocracyFactor;
      const inheritanceEffect = actor.statusScore * this._inheritanceFactor;
      const networkEffect = actor.socialCapital * this._networkEffect;

      const drift = (meritEffect + inheritanceEffect + networkEffect) / 3;
      const change = (drift - actor.statusScore) * 0.01 * dt;
      const noise = (Math.random() - 0.5) * this._mobilityRate * dt * 0.5;

      actor.statusScore += change + noise;
      actor.statusScore = Math.max(0, Math.min(1, actor.statusScore));

      const newClass = this._determineClass(actor.statusScore);
      if (newClass !== actor.classPosition) {
        const mobility: MobilityType = this._isHigherClass(newClass, actor.classPosition) ? 'upward' : 'downward';
        actor.mobilityHistory.push(mobility);
        if (actor.mobilityHistory.length > 20) {
          actor.mobilityHistory.shift();
        }
        actor.classPosition = newClass;
      }
    }
  }

  private _simulateMobility(dt: number): void {
    const mobilityProb = this._mobilityRate * dt * 0.1;

    for (const actor of this._actors.values()) {
      if (Math.random() < mobilityProb) {
        const direction = Math.random() < 0.5 ? -1 : 1;
        const amount = 0.05 * direction * (1 - this._intergenerationalCorrelation);
        this.promoteActor(actor.id, amount);
      }
    }
  }

  private _updateInequality(dt: number): void {
    const currentGini = this.computeGini();
    this._inequality = currentGini;

    this._elasticity = 1 - currentGini * 0.5;
  }

  private _recordState(): void {
    this._history.push(this.getStratification());
    if (this._history.length > this._maxHistory) {
      this._history.shift();
    }
  }

  getHistory(): StratificationState[] {
    return this._history.map(s => ({
      ...s,
      layers: { ...s.layers },
      dimensionScores: { ...s.dimensionScores },
    }));
  }

  redistributeWealth(amount: number): void {
    const actors = Array.from(this._actors.values());
    if (actors.length < 2) return;

    const sortedByWealth = [...actors].sort((a, b) => b.wealth - a.wealth);
    const topCount = Math.max(1, Math.floor(sortedByWealth.length * 0.1));
    const bottomCount = Math.max(1, Math.floor(sortedByWealth.length * 0.5));

    const top = sortedByWealth.slice(0, topCount);
    const bottom = sortedByWealth.slice(-bottomCount);

    let totalRedistributed = 0;
    for (const actor of top) {
      const contribution = actor.wealth * amount * 0.1;
      actor.wealth -= contribution;
      totalRedistributed += contribution;
    }

    const perBottom = totalRedistributed / bottom.length;
    for (const actor of bottom) {
      actor.wealth = Math.min(1, actor.wealth + perBottom);
    }

    this._updateLayerStats();
  }

  computePowerIndex(): Map<string, number> {
    const powerMap = new Map<string, number>();
    for (const actor of this._actors.values()) {
      const power =
        actor.wealth * 0.3 +
        actor.statusScore * 0.25 +
        actor.politicalCapital * 0.25 +
        actor.socialCapital * 0.2;
      powerMap.set(actor.id, power);
    }
    return powerMap;
  }

  processPacket(packet: DataPacket): DataPacket {
    const state = this.getStratification();
    return {
      ...packet,
      payload: {
        ...packet.payload as object,
        stratification: {
          gini: state.giniCoefficient,
          inequality: state.inequality,
          mobility: state.mobilityRate,
          elasticity: state.socialElasticity,
          powerConcentration: state.powerConcentration,
          dimensions: state.dimensionScores,
        },
      },
      metadata: {
        ...packet.metadata,
        route: [...packet.metadata.route, 'social-stratification'],
        residue: state,
      },
    };
  }

  reset(): void {
    this._actors.clear();
    this._history = [];
    this._inequality = 0.5;
    this._elasticity = 0.3;
    this._layers = this._initializeLayers();
    this._lastUpdate = Date.now();
    this._initializeDefaultPopulation();
  }
}
