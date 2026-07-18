import type { DataPacket, KnowledgeUnit } from '../shared/types';

export type SuccessionStage = 'pioneer' | 'early' | 'mid' | 'late' | 'climax' | 'disturbed';

export type DisturbanceType = 'fire' | 'flood' | 'drought' | 'storm' | 'human' | 'disease';

export interface SuccessionalSpecies {
  id: string;
  name: string;
  colonizingAbility: number;
  competitiveAbility: number;
  stressTolerance: number;
  growthRate: number;
  longevity: number;
  currentAbundance: number;
  maxAbundance: number;
  strategy: 'r' | 'k' | 'stress-tolerant';
  optimalStage: SuccessionStage;
  nicheBreadth: number;
}

export interface DisturbanceEvent {
  id: string;
  type: DisturbanceType;
  severity: number;
  timestamp: number;
  affectedArea: number;
  recoveryTime: number;
}

export interface SuccessionState {
  timestamp: number;
  currentStage: SuccessionStage;
  stageProgress: number;
  successionRate: number;
  speciesRichness: number;
  totalAbundance: number;
  diversity: number;
  resilience: number;
  resistance: number;
  timeSinceDisturbance: number;
  stageDistribution: Record<SuccessionStage, number>;
}

export interface IEcologicalSuccession {
  addSpecies(id: string, name: string, strategy: 'r' | 'k' | 'stress-tolerant', optimalStage: SuccessionStage): void;
  removeSpecies(id: string): void;
  disturb(type: DisturbanceType, severity: number): DisturbanceEvent;
  update(deltaTime: number): void;
  getState(): SuccessionState;
  getSpecies(id: string): SuccessionalSpecies | undefined;
  getStageSpecies(stage: SuccessionStage): SuccessionalSpecies[];
  predictNextStage(steps: number): SuccessionState[];
  processPacket(packet: DataPacket): DataPacket;
  reset(): void;
}

export class EcologicalSuccession implements IEcologicalSuccession {
  private _species: Map<string, SuccessionalSpecies> = new Map();
  private _currentStage: SuccessionStage = 'pioneer';
  private _stageProgress: number = 0;
  private _successionRate: number = 0.01;
  private _disturbanceHistory: DisturbanceEvent[] = [];
  private _timeSinceDisturbance: number = 0;
  private _history: SuccessionState[] = [];
  private _maxHistory: number = 200;
  private _lastUpdate: number = Date.now();
  private _resilience: number = 0.5;
  private _resistance: number = 0.5;
  private _climaxStability: number = 0.9;
  private _resourceAvailability: number = 0.3;
  private _soilDevelopment: number = 0.2;
  private _habitatComplexity: number = 0.1;

  private _stageOrder: SuccessionStage[] = ['pioneer', 'early', 'mid', 'late', 'climax'];

  constructor() {
    this._initializePioneerSpecies();
  }

  get currentStage(): SuccessionStage { return this._currentStage; }
  get stageProgress(): number { return this._stageProgress; }
  get speciesCount(): number { return this._species.size; }
  get resilience(): number { return this._resilience; }
  get resistance(): number { return this._resistance; }
  get timeSinceDisturbance(): number { return this._timeSinceDisturbance; }
  get successionRate(): number { return this._successionRate; }
  set successionRate(value: number) { this._successionRate = Math.max(0.001, Math.min(0.1, value)); }

  private _initializePioneerSpecies(): void {
    this.addSpecies('lichen', '地衣', 'stress-tolerant', 'pioneer');
    this.addSpecies('moss', '苔藓', 'r', 'pioneer');
    this.addSpecies('grass', '草本', 'r', 'early');
    this.addSpecies('shrub', '灌木', 'r', 'mid');
    this.addSpecies('pine', '松树', 'k', 'mid');
    this.addSpecies('oak', '橡树', 'k', 'late');
    this.addSpecies('beech', '山毛榉', 'k', 'climax');
    this.addSpecies('epiphyte', '附生植物', 'stress-tolerant', 'climax');

    const lichen = this._species.get('lichen');
    if (lichen) lichen.currentAbundance = 30;
    const moss = this._species.get('moss');
    if (moss) moss.currentAbundance = 20;
  }

  addSpecies(id: string, name: string, strategy: 'r' | 'k' | 'stress-tolerant', optimalStage: SuccessionStage): void {
    if (this._species.has(id)) return;

    const strategyTraits = {
      'r': { colonizing: 0.9, competitive: 0.3, stress: 0.4, growth: 0.1, longevity: 0.2, niche: 0.8 },
      'k': { colonizing: 0.3, competitive: 0.9, stress: 0.5, growth: 0.03, longevity: 0.9, niche: 0.4 },
      'stress-tolerant': { colonizing: 0.5, competitive: 0.4, stress: 0.95, growth: 0.02, longevity: 0.7, niche: 0.6 },
    };

    const traits = strategyTraits[strategy];

    const species: SuccessionalSpecies = {
      id,
      name,
      colonizingAbility: traits.colonizing,
      competitiveAbility: traits.competitive,
      stressTolerance: traits.stress,
      growthRate: traits.growth,
      longevity: traits.longevity,
      currentAbundance: 0,
      maxAbundance: 100,
      strategy,
      optimalStage,
      nicheBreadth: traits.niche,
    };

    this._species.set(id, species);
  }

  removeSpecies(id: string): void {
    this._species.delete(id);
  }

  disturb(type: DisturbanceType, severity: number): DisturbanceEvent {
    const event: DisturbanceEvent = {
      id: `disturbance-${Date.now()}`,
      type,
      severity,
      timestamp: Date.now(),
      affectedArea: severity,
      recoveryTime: severity * 10000,
    };

    this._disturbanceHistory.push(event);
    this._timeSinceDisturbance = 0;

    for (const species of this._species.values()) {
      const sensitivity = this._computeDisturbanceSensitivity(species, type);
      const loss = severity * sensitivity * species.currentAbundance;
      species.currentAbundance = Math.max(0, species.currentAbundance - loss);
    }

    const stageIndex = this._stageOrder.indexOf(this._currentStage);
    const stageRegression = Math.floor(severity * 3);
    const newStageIndex = Math.max(0, stageIndex - stageRegression);
    this._currentStage = this._stageOrder[newStageIndex];
    this._stageProgress = 0;

    this._soilDevelopment = Math.max(0.1, this._soilDevelopment - severity * 0.5);
    this._habitatComplexity = Math.max(0.05, this._habitatComplexity - severity * 0.4);
    this._resourceAvailability = Math.min(1, this._resourceAvailability + severity * 0.3);

    return event;
  }

  private _computeDisturbanceSensitivity(species: SuccessionalSpecies, type: DisturbanceType): number {
    const typeSensitivity: Record<DisturbanceType, number> = {
      fire: species.strategy === 'k' ? 0.8 : 0.3,
      flood: species.strategy === 'stress-tolerant' ? 0.2 : 0.6,
      drought: species.strategy === 'stress-tolerant' ? 0.1 : 0.7,
      storm: species.longevity > 0.7 ? 0.4 : 0.2,
      human: 0.6,
      disease: species.nicheBreadth < 0.5 ? 0.8 : 0.4,
    };

    return typeSensitivity[type] || 0.5;
  }

  update(deltaTime: number): void {
    const dt = deltaTime / 1000;
    this._timeSinceDisturbance += deltaTime;

    this._updateEnvironment(dt);
    this._updateSpeciesAbundance(dt);
    this._updateSuccessionStage(dt);
    this._updateStabilityMetrics(dt);

    this._lastUpdate = Date.now();
    this._recordState();
  }

  private _updateEnvironment(dt: number): void {
    const stageIndex = this._stageOrder.indexOf(this._currentStage);
    const targetSoil = 0.2 + stageIndex * 0.15;
    const targetHabitat = 0.1 + stageIndex * 0.18;
    const targetResource = 0.3 + stageIndex * 0.1;

    this._soilDevelopment += (targetSoil - this._soilDevelopment) * 0.01 * dt;
    this._habitatComplexity += (targetHabitat - this._habitatComplexity) * 0.01 * dt;
    this._resourceAvailability += (targetResource - this._resourceAvailability) * 0.005 * dt;

    this._soilDevelopment = Math.max(0, Math.min(1, this._soilDevelopment));
    this._habitatComplexity = Math.max(0, Math.min(1, this._habitatComplexity));
    this._resourceAvailability = Math.max(0, Math.min(1, this._resourceAvailability));
  }

  private _updateSpeciesAbundance(dt: number): void {
    const stageIndex = this._stageOrder.indexOf(this._currentStage);

    for (const species of this._species.values()) {
      const optimalStageIndex = this._stageOrder.indexOf(species.optimalStage);
      const stageMatch = 1 - Math.abs(stageIndex - optimalStageIndex) / (this._stageOrder.length - 1);

      const environmentSuitability =
        this._soilDevelopment * 0.3 +
        this._habitatComplexity * 0.3 +
        this._resourceAvailability * 0.4;

      const competition = this._computeCompetition(species);
      const colonization = species.colonizingAbility * (1 - stageMatch) * 0.5;
      const stressEffect = (1 - environmentSuitability) * (1 - species.stressTolerance);

      const netGrowth = species.growthRate * stageMatch * environmentSuitability *
        (1 - competition) * (1 - stressEffect) + colonization;

      const carryingCapacity = species.maxAbundance * stageMatch * environmentSuitability;
      const logisticGrowth = netGrowth * species.currentAbundance *
        (1 - species.currentAbundance / Math.max(1, carryingCapacity));

      species.currentAbundance += logisticGrowth * dt;
      species.currentAbundance = Math.max(0, Math.min(species.maxAbundance, species.currentAbundance));
    }
  }

  private _computeCompetition(species: SuccessionalSpecies): number {
    let totalCompetition = 0;
    const stageIndex = this._stageOrder.indexOf(this._currentStage);

    for (const other of this._species.values()) {
      if (other.id === species.id) continue;
      const otherStageIndex = this._stageOrder.indexOf(other.optimalStage);
      const nicheOverlap = 1 - Math.abs(stageIndex - otherStageIndex) / (this._stageOrder.length - 1);
      const competitiveEffect = other.competitiveAbility * (other.currentAbundance / other.maxAbundance) * nicheOverlap;
      totalCompetition += competitiveEffect;
    }

    return Math.min(1, totalCompetition * 0.1);
  }

  private _updateSuccessionStage(dt: number): void {
    const diversity = this._computeDiversity();
    const totalAbundance = this._computeTotalAbundance();
    const stageIndex = this._stageOrder.indexOf(this._currentStage);

    const progressionConditions =
      diversity > 0.5 &&
      totalAbundance > 50 &&
      this._habitatComplexity > 0.3 + stageIndex * 0.1 &&
      this._soilDevelopment > 0.2 + stageIndex * 0.1;

    if (progressionConditions && stageIndex < this._stageOrder.length - 1) {
      this._stageProgress += this._successionRate * dt;

      if (this._stageProgress >= 1) {
        this._currentStage = this._stageOrder[stageIndex + 1];
        this._stageProgress = 0;
      }
    } else if (!progressionConditions && this._stageProgress > 0) {
      this._stageProgress = Math.max(0, this._stageProgress - this._successionRate * 0.5 * dt);
    }
  }

  private _updateStabilityMetrics(dt: number): void {
    const diversity = this._computeDiversity();
    const stageIndex = this._stageOrder.indexOf(this._currentStage);

    this._resistance = 0.3 + diversity * 0.4 + (stageIndex / (this._stageOrder.length - 1)) * 0.3;
    this._resilience = 0.5 + (1 - stageIndex / (this._stageOrder.length - 1)) * 0.3 + diversity * 0.2;

    if (this._currentStage === 'climax') {
      this._resistance = this._climaxStability;
    }
  }

  private _computeDiversity(): number {
    const abundances = Array.from(this._species.values()).map(s => s.currentAbundance);
    const total = abundances.reduce((s, a) => s + a, 0);
    if (total === 0) return 0;

    let shannon = 0;
    for (const a of abundances) {
      const p = a / total;
      if (p > 0) {
        shannon -= p * Math.log(p);
      }
    }

    const maxShannon = Math.log(this._species.size || 1);
    return maxShannon > 0 ? shannon / maxShannon : 0;
  }

  private _computeTotalAbundance(): number {
    return Array.from(this._species.values()).reduce((s, sp) => s + sp.currentAbundance, 0);
  }

  getState(): SuccessionState {
    const stageDistribution: Record<SuccessionStage, number> = {
      pioneer: 0,
      early: 0,
      mid: 0,
      late: 0,
      climax: 0,
      disturbed: 0,
    };

    for (const species of this._species.values()) {
      stageDistribution[species.optimalStage] += species.currentAbundance;
    }

    return {
      timestamp: Date.now(),
      currentStage: this._currentStage,
      stageProgress: this._stageProgress,
      successionRate: this._successionRate,
      speciesRichness: this._species.size,
      totalAbundance: this._computeTotalAbundance(),
      diversity: this._computeDiversity(),
      resilience: this._resilience,
      resistance: this._resistance,
      timeSinceDisturbance: this._timeSinceDisturbance,
      stageDistribution,
    };
  }

  private _recordState(): void {
    this._history.push(this.getState());
    if (this._history.length > this._maxHistory) {
      this._history.shift();
    }
  }

  getSpecies(id: string): SuccessionalSpecies | undefined {
    const sp = this._species.get(id);
    return sp ? { ...sp } : undefined;
  }

  getStageSpecies(stage: SuccessionStage): SuccessionalSpecies[] {
    return Array.from(this._species.values())
      .filter(s => s.optimalStage === stage)
      .map(s => ({ ...s }));
  }

  getAllSpecies(): SuccessionalSpecies[] {
    return Array.from(this._species.values()).map(s => ({ ...s }));
  }

  getDisturbanceHistory(): DisturbanceEvent[] {
    return this._disturbanceHistory.map(e => ({ ...e }));
  }

  predictNextStage(steps: number): SuccessionState[] {
    const predictions: SuccessionState[] = [];
    const savedState = this._saveState();

    try {
      for (let i = 0; i < steps; i++) {
        this.update(1000);
        predictions.push(this.getState());
      }
    } finally {
      this._restoreState(savedState);
    }

    return predictions;
  }

  private _saveState(): object {
    return {
      species: Array.from(this._species.entries()).map(([id, s]) => [id, { ...s }]),
      currentStage: this._currentStage,
      stageProgress: this._stageProgress,
      timeSinceDisturbance: this._timeSinceDisturbance,
      soilDevelopment: this._soilDevelopment,
      habitatComplexity: this._habitatComplexity,
      resourceAvailability: this._resourceAvailability,
    };
  }

  private _restoreState(saved: any): void {
    this._species.clear();
    for (const [id, s] of saved.species) {
      this._species.set(id, { ...s });
    }
    this._currentStage = saved.currentStage;
    this._stageProgress = saved.stageProgress;
    this._timeSinceDisturbance = saved.timeSinceDisturbance;
    this._soilDevelopment = saved.soilDevelopment;
    this._habitatComplexity = saved.habitatComplexity;
    this._resourceAvailability = saved.resourceAvailability;
  }

  getHistory(): SuccessionState[] {
    return this._history.map(h => ({
      ...h,
      stageDistribution: { ...h.stageDistribution },
    }));
  }

  simulate(steps: number, deltaTime: number = 100): SuccessionState[] {
    const results: SuccessionState[] = [];
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
        succession: {
          stage: state.currentStage,
          progress: state.stageProgress,
          diversity: state.diversity,
          resilience: state.resilience,
          resistance: state.resistance,
          speciesRichness: state.speciesRichness,
        },
      },
      metadata: {
        ...packet.metadata,
        route: [...packet.metadata.route, 'ecological-succession'],
        residue: state,
      },
    };
  }

  reset(): void {
    this._species.clear();
    this._currentStage = 'pioneer';
    this._stageProgress = 0;
    this._disturbanceHistory = [];
    this._timeSinceDisturbance = 0;
    this._history = [];
    this._resilience = 0.5;
    this._resistance = 0.5;
    this._soilDevelopment = 0.2;
    this._habitatComplexity = 0.1;
    this._resourceAvailability = 0.3;
    this._lastUpdate = Date.now();
    this._initializePioneerSpecies();
  }
}
