import type { DataPacket, KnowledgeUnit } from '../shared/types';

export type KeystoneRole = 'predator' | 'engineer' | 'mutualist' | 'host' | 'nutrient-provider' | 'foundation';

export interface KeystoneCandidate {
  id: string;
  name: string;
  role: KeystoneRole;
  keystoneIndex: number;
  communityImpact: number;
  trophicLevel: number;
  biomass: number;
  relativeAbundance: number;
  interactionCount: number;
  redundancy: number;
  isKeystone: boolean;
}

export interface RemovalSimulation {
  targetSpecies: string;
  cascadingExtinctions: string[];
  diversityLoss: number;
  stabilityChange: number;
  recoveryTime: number;
  impactScore: number;
}

export interface KeystoneAnalysis {
  keystones: KeystoneCandidate[];
  totalSpecies: number;
  keystoneRatio: number;
  overallStability: number;
  fragilityIndex: number;
  mostVital: KeystoneCandidate | null;
}

export interface IKeystoneSpecies {
  addSpecies(id: string, name: string, role: KeystoneRole, trophicLevel: number): void;
  addInteraction(source: string, target: string, strength: number): void;
  removeSpecies(id: string): void;
  identifyKeystones(): KeystoneAnalysis;
  simulateRemoval(speciesId: string): RemovalSimulation;
  getSpecies(id: string): KeystoneCandidate | undefined;
  getKeystones(): KeystoneCandidate[];
  update(deltaTime: number): void;
  processPacket(packet: DataPacket): DataPacket;
  reset(): void;
}

export class KeystoneSpecies implements IKeystoneSpecies {
  private _species: Map<string, KeystoneCandidate> = new Map();
  private _interactions: Map<string, Map<string, number>> = new Map();
  private _interactionCount: Map<string, number> = new Map();
  private _history: KeystoneAnalysis[] = [];
  private _maxHistory: number = 100;
  private _lastUpdate: number = Date.now();
  private _keystoneThreshold: number = 0.6;
  private _redundancyFactor: number = 0.5;
  private _cascadeSensitivity: number = 0.7;
  private _trophicMultiplier: number = 1.5;
  private _identified: boolean = false;

  constructor() {
    this._initializeDefaultCommunity();
  }

  get speciesCount(): number { return this._species.size; }
  get keystoneThreshold(): number { return this._keystoneThreshold; }
  set keystoneThreshold(value: number) { this._keystoneThreshold = Math.max(0, Math.min(1, value)); }
  get cascadeSensitivity(): number { return this._cascadeSensitivity; }
  set cascadeSensitivity(value: number) { this._cascadeSensitivity = Math.max(0, Math.min(1, value)); }
  get identified(): boolean { return this._identified; }

  private _initializeDefaultCommunity(): void {
    this.addSpecies('wolf', '灰狼', 'predator', 4);
    this.addSpecies('elk', '麋鹿', 'foundation', 2);
    this.addSpecies('beaver', '河狸', 'engineer', 2);
    this.addSpecies('tree', '乔木', 'foundation', 1);
    this.addSpecies('bee', '蜜蜂', 'mutualist', 2);
    this.addSpecies('flower', '开花植物', 'nutrient-provider', 1);
    this.addSpecies('bacteria', '固氮菌', 'nutrient-provider', 0);
    this.addSpecies('bird', '鸣禽', 'host', 3);
    this.addSpecies('grass', '草本', 'foundation', 1);
    this.addSpecies('rabbit', '兔子', 'foundation', 2);

    this.addInteraction('wolf', 'elk', 0.8);
    this.addInteraction('wolf', 'rabbit', 0.4);
    this.addInteraction('elk', 'tree', 0.6);
    this.addInteraction('elk', 'grass', 0.5);
    this.addInteraction('beaver', 'tree', 0.7);
    this.addInteraction('bee', 'flower', 0.9);
    this.addInteraction('flower', 'bee', 0.9);
    this.addInteraction('bird', 'tree', 0.5);
    this.addInteraction('rabbit', 'grass', 0.6);
    this.addInteraction('bacteria', 'tree', 0.4);
    this.addInteraction('bacteria', 'flower', 0.5);
    this.addInteraction('bacteria', 'grass', 0.5);

    const wolf = this._species.get('wolf');
    if (wolf) wolf.biomass = 5;
    const elk = this._species.get('elk');
    if (elk) elk.biomass = 30;
    const beaver = this._species.get('beaver');
    if (beaver) beaver.biomass = 15;
    const tree = this._species.get('tree');
    if (tree) tree.biomass = 100;
    const bee = this._species.get('bee');
    if (bee) bee.biomass = 2;
    const flower = this._species.get('flower');
    if (flower) flower.biomass = 25;
    const bacteria = this._species.get('bacteria');
    if (bacteria) bacteria.biomass = 10;
    const bird = this._species.get('bird');
    if (bird) bird.biomass = 3;
    const grass = this._species.get('grass');
    if (grass) grass.biomass = 60;
    const rabbit = this._species.get('rabbit');
    if (rabbit) rabbit.biomass = 20;
  }

  addSpecies(id: string, name: string, role: KeystoneRole, trophicLevel: number): void {
    if (this._species.has(id)) return;

    const species: KeystoneCandidate = {
      id,
      name,
      role,
      keystoneIndex: 0,
      communityImpact: 0,
      trophicLevel,
      biomass: 10,
      relativeAbundance: 0.1,
      interactionCount: 0,
      redundancy: 0,
      isKeystone: false,
    };

    this._species.set(id, species);
    this._interactions.set(id, new Map());
    this._interactionCount.set(id, 0);
    this._identified = false;
  }

  addInteraction(source: string, target: string, strength: number): void {
    if (!this._species.has(source) || !this._species.has(target)) return;
    if (source === target) return;

    const sourceMap = this._interactions.get(source);
    if (sourceMap) {
      sourceMap.set(target, strength);
    }

    const targetMap = this._interactions.get(target);
    if (targetMap) {
      targetMap.set(source, strength);
    }

    const sourceCount = this._interactionCount.get(source) || 0;
    this._interactionCount.set(source, sourceCount + 1);

    const targetCount = this._interactionCount.get(target) || 0;
    this._interactionCount.set(target, targetCount + 1);

    this._identified = false;
  }

  removeSpecies(id: string): void {
    this._species.delete(id);
    this._interactions.delete(id);
    this._interactionCount.delete(id);

    for (const key of this._interactions.keys()) {
      this._interactions.get(key)?.delete(id);
      const count = this._interactionCount.get(key);
      if (count !== undefined) {
        this._interactionCount.set(key, Math.max(0, count - 1));
      }
    }

    this._identified = false;
  }

  identifyKeystones(): KeystoneAnalysis {
    const totalBiomass = Array.from(this._species.values()).reduce((s, sp) => s + sp.biomass, 0);

    for (const [id, species] of this._species) {
      species.relativeAbundance = totalBiomass > 0 ? species.biomass / totalBiomass : 0;
      species.interactionCount = this._interactionCount.get(id) || 0;

      const interactionScore = this._computeInteractionScore(id);
      const trophicScore = this._computeTrophicScore(species);
      const lowAbundanceBonus = this._computeLowAbundanceBonus(species);
      const uniquenessScore = this._computeUniquenessScore(species);
      const roleBonus = this._computeRoleBonus(species);

      species.communityImpact = (
        interactionScore * 0.3 +
        trophicScore * 0.25 +
        lowAbundanceBonus * 0.2 +
        uniquenessScore * 0.15 +
        roleBonus * 0.1
      );

      species.redundancy = this._computeRedundancy(species);
      species.keystoneIndex = species.communityImpact * (1 - species.redundancy * this._redundancyFactor);
      species.isKeystone = species.keystoneIndex >= this._keystoneThreshold;
    }

    this._identified = true;
    const analysis = this._buildAnalysis();
    this._history.push(analysis);
    if (this._history.length > this._maxHistory) this._history.shift();

    return analysis;
  }

  private _computeInteractionScore(speciesId: string): number {
    const interactions = this._interactions.get(speciesId);
    if (!interactions || interactions.size === 0) return 0;

    let totalStrength = 0;
    for (const strength of interactions.values()) {
      totalStrength += strength;
    }

    const avgStrength = totalStrength / interactions.size;
    const normalizedCount = Math.min(1, interactions.size / Math.max(1, this._species.size - 1));

    return (normalizedCount * 0.5 + avgStrength * 0.5);
  }

  private _computeTrophicScore(species: KeystoneCandidate): number {
    const maxTrophic = 5;
    return Math.pow(species.trophicLevel / maxTrophic, this._trophicMultiplier);
  }

  private _computeLowAbundanceBonus(species: KeystoneCandidate): number {
    return 1 - Math.min(1, species.relativeAbundance * 5);
  }

  private _computeUniquenessScore(species: KeystoneCandidate): number {
    const sameRole = Array.from(this._species.values())
      .filter(s => s.role === species.role && s.id !== species.id).length;

    const sameTrophic = Array.from(this._species.values())
      .filter(s => Math.abs(s.trophicLevel - species.trophicLevel) < 0.5 && s.id !== species.id).length;

    const roleUniqueness = sameRole === 0 ? 1 : 1 / (sameRole + 1);
    const trophicUniqueness = sameTrophic === 0 ? 1 : 1 / (sameTrophic + 1);

    return (roleUniqueness * 0.6 + trophicUniqueness * 0.4);
  }

  private _computeRoleBonus(species: KeystoneCandidate): number {
    const roleScores: Record<KeystoneRole, number> = {
      predator: 0.8,
      engineer: 0.9,
      mutualist: 0.7,
      host: 0.5,
      'nutrient-provider': 0.6,
      foundation: 0.75,
    };
    return roleScores[species.role] || 0.5;
  }

  private _computeRedundancy(species: KeystoneCandidate): number {
    const similar = Array.from(this._species.values()).filter(s =>
      s.id !== species.id &&
      s.role === species.role &&
      Math.abs(s.trophicLevel - species.trophicLevel) < 1
    );

    if (similar.length === 0) return 0;

    let totalOverlap = 0;
    const speciesInteractions = this._interactions.get(species.id);
    const speciesSet = speciesInteractions ? new Set(speciesInteractions.keys()) : new Set();

    for (const sim of similar) {
      const simInteractions = this._interactions.get(sim.id);
      const simSet = simInteractions ? new Set(simInteractions.keys()) : new Set();

      let overlap = 0;
      for (const item of speciesSet) {
        if (simSet.has(item)) overlap++;
      }

      const total = speciesSet.size + simSet.size - overlap;
      const jaccard = total > 0 ? overlap / total : 0;
      totalOverlap += jaccard;
    }

    return Math.min(1, totalOverlap / similar.length);
  }

  private _buildAnalysis(): KeystoneAnalysis {
    const keystones = Array.from(this._species.values())
      .filter(s => s.isKeystone)
      .sort((a, b) => b.keystoneIndex - a.keystoneIndex);

    const allSpecies = Array.from(this._species.values());
    const avgKeystoneIndex = allSpecies.length > 0
      ? allSpecies.reduce((s, sp) => s + sp.keystoneIndex, 0) / allSpecies.length
      : 0;

    const totalBiomass = allSpecies.reduce((s, sp) => s + sp.biomass, 0);
    const keystoneBiomass = keystones.reduce((s, sp) => s + sp.biomass, 0);
    const biomassRatio = totalBiomass > 0 ? keystoneBiomass / totalBiomass : 0;

    const fragility = keystones.length > 0
      ? (1 - biomassRatio) * (keystones.length / allSpecies.length)
      : 0;

    const mostVital = keystones.length > 0 ? { ...keystones[0] } : null;

    return {
      keystones: keystones.map(k => ({ ...k })),
      totalSpecies: this._species.size,
      keystoneRatio: keystones.length / Math.max(1, this._species.size),
      overallStability: 1 - avgKeystoneIndex * 0.5,
      fragilityIndex: Math.min(1, fragility * 2),
      mostVital,
    };
  }

  simulateRemoval(speciesId: string): RemovalSimulation {
    if (!this._species.has(speciesId)) {
      return {
        targetSpecies: speciesId,
        cascadingExtinctions: [],
        diversityLoss: 0,
        stabilityChange: 0,
        recoveryTime: 0,
        impactScore: 0,
      };
    }

    const savedState = this._saveState();

    try {
      const initialDiversity = this._species.size;
      const cascadingExtinctions: string[] = [];
      let currentRemovals = [speciesId];

      this.removeSpecies(speciesId);

      let rounds = 0;
      const maxRounds = 5;

      while (currentRemovals.length > 0 && rounds < maxRounds) {
        rounds++;
        const nextRemovals: string[] = [];

        for (const species of this._species.values()) {
          const interactionCount = this._interactionCount.get(species.id) || 0;
          const originalCount = savedState.interactionCounts.get(species.id) || 1;
          const lossRatio = 1 - (interactionCount / originalCount);

          if (lossRatio > this._cascadeSensitivity && species.biomass < 15) {
            if (!cascadingExtinctions.includes(species.id) && species.id !== speciesId) {
              cascadingExtinctions.push(species.id);
              nextRemovals.push(species.id);
            }
          }
        }

        for (const id of nextRemovals) {
          this.removeSpecies(id);
        }

        currentRemovals = nextRemovals;
      }

      const finalDiversity = this._species.size;
      const diversityLoss = (initialDiversity - finalDiversity) / initialDiversity;

      const analysisBefore = savedState.analysis;
      this.identifyKeystones();
      const analysisAfter = this._buildAnalysis();
      const stabilityChange = analysisAfter.overallStability - analysisBefore.overallStability;

      const recoveryTime = diversityLoss * 1000 * (1 + rounds * 0.5);

      const impactScore = diversityLoss * 0.4 +
        Math.abs(stabilityChange) * 0.3 +
        cascadingExtinctions.length / initialDiversity * 0.3;

      return {
        targetSpecies: speciesId,
        cascadingExtinctions,
        diversityLoss,
        stabilityChange,
        recoveryTime,
        impactScore,
      };
    } finally {
      this._restoreState(savedState);
    }
  }

  private _saveState(): { species: Map<string, KeystoneCandidate>; interactions: Map<string, Map<string, number>>; interactionCounts: Map<string, number>; analysis: KeystoneAnalysis } {
    const speciesCopy = new Map<string, KeystoneCandidate>();
    for (const [id, s] of this._species) {
      speciesCopy.set(id, { ...s });
    }

    const interactionsCopy = new Map<string, Map<string, number>>();
    for (const [id, map] of this._interactions) {
      interactionsCopy.set(id, new Map(map));
    }

    const interactionCountsCopy = new Map(this._interactionCount);

    const analysis = this._identified ? this._buildAnalysis() : {
      keystones: [],
      totalSpecies: this._species.size,
      keystoneRatio: 0,
      overallStability: 0.5,
      fragilityIndex: 0,
      mostVital: null,
    };

    return {
      species: speciesCopy,
      interactions: interactionsCopy,
      interactionCounts: interactionCountsCopy,
      analysis,
    };
  }

  private _restoreState(saved: any): void {
    this._species = new Map();
    for (const [id, s] of saved.species) {
      this._species.set(id, { ...s });
    }

    this._interactions = new Map();
    for (const [id, map] of saved.interactions) {
      this._interactions.set(id, new Map(map));
    }

    this._interactionCount = new Map(saved.interactionCounts);
    this._identified = true;
  }

  getSpecies(id: string): KeystoneCandidate | undefined {
    const sp = this._species.get(id);
    return sp ? { ...sp } : undefined;
  }

  getKeystones(): KeystoneCandidate[] {
    if (!this._identified) {
      this.identifyKeystones();
    }
    return Array.from(this._species.values())
      .filter(s => s.isKeystone)
      .map(s => ({ ...s }))
      .sort((a, b) => b.keystoneIndex - a.keystoneIndex);
  }

  getAllSpecies(): KeystoneCandidate[] {
    return Array.from(this._species.values())
      .map(s => ({ ...s }))
      .sort((a, b) => b.keystoneIndex - a.keystoneIndex);
  }

  getInteractions(speciesId: string): Map<string, number> {
    const interactions = this._interactions.get(speciesId);
    return interactions ? new Map(interactions) : new Map();
  }

  update(deltaTime: number): void {
    if (!this._identified) {
      this.identifyKeystones();
    }
    this._lastUpdate = Date.now();
  }

  getHistory(): KeystoneAnalysis[] {
    return this._history.map(h => ({
      ...h,
      keystones: h.keystones.map(k => ({ ...k })),
      mostVital: h.mostVital ? { ...h.mostVital } : null,
    }));
  }

  processPacket(packet: DataPacket): DataPacket {
    if (!this._identified) {
      this.identifyKeystones();
    }
    const analysis = this._buildAnalysis();
    return {
      ...packet,
      payload: {
        ...packet.payload as object,
        keystone: {
          keystoneCount: analysis.keystones.length,
          keystoneRatio: analysis.keystoneRatio,
          fragility: analysis.fragilityIndex,
          stability: analysis.overallStability,
          mostVital: analysis.mostVital?.name || null,
        },
      },
      metadata: {
        ...packet.metadata,
        route: [...packet.metadata.route, 'keystone-species'],
        residue: analysis,
      },
    };
  }

  reset(): void {
    this._species.clear();
    this._interactions.clear();
    this._interactionCount.clear();
    this._history = [];
    this._identified = false;
    this._lastUpdate = Date.now();
    this._initializeDefaultCommunity();
  }
}
