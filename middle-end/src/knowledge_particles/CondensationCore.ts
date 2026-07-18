import { KnowledgeUnit, Signal } from '../shared/types';
import { KnowledgeParticle } from './KnowledgeParticle';
import { ParticleCloud } from './ParticleCloud';

export interface CoreConcept {
  id: string;
  name: string;
  centrality: number;
  attractiveness: number;
  bindingStrength: number;
  seedParticles: string[];
}

export interface CrystalLayer {
  level: number;
  particles: string[];
  density: number;
  order: number;
  growthRate: number;
}

export interface CrystalStructure {
  coreId: string;
  coreConcept: string;
  layers: CrystalLayer[];
  totalParticles: number;
  symmetry: number;
  stability: number;
  growthDirection: number[];
}

export interface NucleationEvent {
  id: string;
  coreId: string;
  timestamp: number;
  initialParticleCount: number;
  criticalMass: number;
  spontaneous: boolean;
}

export interface ICondensationCore {
  coreCount: number;
  cloud: ParticleCloud;
  addCore(core: CoreConcept): void;
  getCore(coreId: string): CoreConcept | undefined;
  nucleate(coreId: string): NucleationEvent | null;
  growCrystal(coreId: string, iterations: number): CrystalStructure | null;
  getCrystalStructure(coreId: string): CrystalStructure | null;
  computeCrystallizationRate(): number;
  findStableCores(minStability: number): string[];
  dissolveCore(coreId: string): void;
  getLargestCrystal(): CrystalStructure | null;
}

export class CondensationCore implements ICondensationCore {
  private _cloud: ParticleCloud;
  private _cores: Map<string, CoreConcept>;
  private _crystals: Map<string, CrystalStructure>;
  private _nucleationEvents: NucleationEvent[];
  private _growthLog: { coreId: string; iteration: number; size: number }[];
  private _criticalMass: number;
  private _maxCores: number;
  private _maxGrowthIterations: number;

  constructor(cloud: ParticleCloud) {
    this._cloud = cloud;
    this._cores = new Map();
    this._crystals = new Map();
    this._nucleationEvents = [];
    this._growthLog = [];
    this._criticalMass = 5;
    this._maxCores = 20;
    this._maxGrowthIterations = 50;
  }

  get coreCount(): number { return this._cores.size; }
  get cloud(): ParticleCloud { return this._cloud; }
  get crystalCount(): number { return this._crystals.size; }
  get nucleationCount(): number { return this._nucleationEvents.length; }
  get criticalMass(): number { return this._criticalMass; }

  public setCriticalMass(mass: number): void {
    this._criticalMass = Math.max(1, mass);
  }

  public addCore(core: CoreConcept): void {
    if (this._cores.size >= this._maxCores) {
      this._removeWeakestCore();
    }
    this._cores.set(core.id, {
      ...core,
      seedParticles: [...core.seedParticles]
    });
  }

  private _removeWeakestCore(): void {
    let weakestId = '';
    let weakestCentrality = Infinity;
    for (const [id, core] of this._cores) {
      if (core.centrality < weakestCentrality) {
        weakestCentrality = core.centrality;
        weakestId = id;
      }
    }
    if (weakestId) {
      this._cores.delete(weakestId);
      this._crystals.delete(weakestId);
    }
  }

  public getCore(coreId: string): CoreConcept | undefined {
    const c = this._cores.get(coreId);
    return c ? { ...c, seedParticles: [...c.seedParticles] } : undefined;
  }

  public getAllCoreIds(): string[] {
    return Array.from(this._cores.keys());
  }

  public nucleate(coreId: string): NucleationEvent | null {
    const core = this._cores.get(coreId);
    if (!core) return null;
    const nearbyParticles = this._findNearbyParticles(coreId, 3);
    if (nearbyParticles.length < this._criticalMass) {
      return null;
    }
    const seedParticles = nearbyParticles.slice(0, Math.floor(this._criticalMass * 1.5));
    core.seedParticles = seedParticles.map(p => p.id);
    const event: NucleationEvent = {
      id: `nuc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      coreId,
      timestamp: Date.now(),
      initialParticleCount: seedParticles.length,
      criticalMass: this._criticalMass,
      spontaneous: false
    };
    this._nucleationEvents.push(event);
    const initialLayer: CrystalLayer = {
      level: 0,
      particles: core.seedParticles,
      density: 1,
      order: 0.5,
      growthRate: 0
    };
    this._crystals.set(coreId, {
      coreId,
      coreConcept: core.name,
      layers: [initialLayer],
      totalParticles: core.seedParticles.length,
      symmetry: 0.3,
      stability: 0.4,
      growthDirection: this._computeGrowthDirection(coreId)
    });
    return event;
  }

  public trySpontaneousNucleation(): NucleationEvent | null {
    const stats = this._cloud.computeStatistics();
    if (stats.density < 0.01 || stats.temperature > 0.7) {
      return null;
    }
    const highEnergy = this._cloud.findHighestEnergy(10);
    if (highEnergy.length < this._criticalMass) return null;
    const centerParticle = highEnergy[0];
    const nearby = this._findNearbyParticlesById(centerParticle.id, 5);
    if (nearby.length < this._criticalMass) return null;
    const coreId = `spontaneous-core-${Date.now()}`;
    const core: CoreConcept = {
      id: coreId,
      name: `Spontaneous Core ${this._cores.size + 1}`,
      centrality: 0.5 + Math.random() * 0.3,
      attractiveness: 0.6 + Math.random() * 0.3,
      bindingStrength: 0.5 + Math.random() * 0.3,
      seedParticles: nearby.slice(0, this._criticalMass).map(p => p.id)
    };
    this.addCore(core);
    const event = this.nucleate(coreId);
    if (event) {
      event.spontaneous = true;
    }
    return event;
  }

  private _findNearbyParticles(coreId: string, radius: number): KnowledgeParticle[] {
    const core = this._cores.get(coreId);
    if (!core) return [];
    const result: { particle: KnowledgeParticle; dist: number }[] = [];
    let corePos: number[] | null = null;
    for (const seedId of core.seedParticles) {
      const pos = this._cloud.getPosition(seedId);
      if (pos) {
        corePos = pos;
        break;
      }
    }
    if (!corePos) {
      const sample = this._cloud.findHighestEnergy(1);
      if (sample.length > 0) {
        corePos = this._cloud.getPosition(sample[0].id) || [];
      }
    }
    if (!corePos || corePos.length === 0) return [];
    const allIds = this._cloud.findByState('wave').concat(
      this._cloud.findByState('superposed'),
      this._cloud.findByState('entangled')
    );
    for (const id of allIds) {
      const p = this._cloud.getParticle(id);
      const pos = this._cloud.getPosition(id);
      if (!p || !pos) continue;
      let dist = 0;
      for (let i = 0; i < pos.length && i < corePos.length; i++) {
        dist += (pos[i] - corePos[i]) ** 2;
      }
      dist = Math.sqrt(dist);
      if (dist < radius) {
        result.push({ particle: p, dist });
      }
    }
    result.sort((a, b) => a.dist - b.dist);
    return result.map(r => r.particle);
  }

  private _findNearbyParticlesById(particleId: string, radius: number): KnowledgeParticle[] {
    const pos = this._cloud.getPosition(particleId);
    if (!pos) return [];
    const result: { particle: KnowledgeParticle; dist: number }[] = [];
    const allStateIds = ['wave', 'superposed', 'entangled', 'collapsed'];
    const allIds = new Set<string>();
    for (const state of allStateIds) {
      for (const id of this._cloud.findByState(state)) {
        allIds.add(id);
      }
    }
    for (const id of allIds) {
      if (id === particleId) continue;
      const p = this._cloud.getParticle(id);
      const pPos = this._cloud.getPosition(id);
      if (!p || !pPos) continue;
      let dist = 0;
      for (let i = 0; i < pPos.length && i < pos.length; i++) {
        dist += (pPos[i] - pos[i]) ** 2;
      }
      dist = Math.sqrt(dist);
      if (dist < radius) {
        result.push({ particle: p, dist });
      }
    }
    result.sort((a, b) => a.dist - b.dist);
    return result.map(r => r.particle);
  }

  private _computeGrowthDirection(coreId: string): number[] {
    const crystal = this._crystals.get(coreId);
    if (!crystal || crystal.layers.length === 0) return [];
    const dim = this._cloud.dimension;
    const direction = new Array(dim).fill(0);
    for (const particleId of crystal.layers[0].particles) {
      const vel = this._cloud.getVelocity(particleId);
      if (vel) {
        for (let i = 0; i < dim; i++) {
          direction[i] += vel[i];
        }
      }
    }
    const norm = Math.sqrt(direction.reduce((s, v) => s + v * v, 0));
    if (norm > 0) {
      return direction.map(v => v / norm);
    }
    return direction;
  }

  public growCrystal(coreId: string, iterations: number = 10): CrystalStructure | null {
    const core = this._cores.get(coreId);
    let crystal = this._crystals.get(coreId);
    if (!core) return null;
    if (!crystal) {
      this.nucleate(coreId);
      crystal = this._crystals.get(coreId);
      if (!crystal) return null;
    }
    const maxIter = Math.min(iterations, this._maxGrowthIterations);
    for (let iter = 0; iter < maxIter; iter++) {
      this._growthLog.push({
        coreId,
        iteration: iter,
        size: crystal.totalParticles
      });
      const lastLayer = crystal.layers[crystal.layers.length - 1];
      const boundaryParticles = lastLayer.particles;
      const attractionRadius = 2 + core.attractiveness * 3;
      const candidates = new Set<string>();
      for (const pid of boundaryParticles) {
        const nearby = this._findNearbyParticlesById(pid, attractionRadius);
        for (const p of nearby) {
          let alreadyInCrystal = false;
          for (const layer of crystal.layers) {
            if (layer.particles.includes(p.id)) {
              alreadyInCrystal = true;
              break;
            }
          }
          if (!alreadyInCrystal) {
            candidates.add(p.id);
          }
        }
      }
      const newLayerParticles: string[] = [];
      for (const cid of candidates) {
        const p = this._cloud.getParticle(cid);
        if (!p) continue;
        const bindingProbability = core.bindingStrength * (p.energy + p.coherence) / 2;
        if (Math.random() < bindingProbability) {
          newLayerParticles.push(cid);
          p.excite(0.05);
        }
      }
      if (newLayerParticles.length === 0) {
        break;
      }
      const newLayer: CrystalLayer = {
        level: crystal.layers.length,
        particles: newLayerParticles,
        density: newLayerParticles.length / (4 * Math.PI * (crystal.layers.length + 1) ** 2 + 1),
        order: this._estimateLayerOrder(newLayerParticles, coreId),
        growthRate: newLayerParticles.length / Math.max(1, lastLayer.particles.length)
      };
      crystal.layers.push(newLayer);
      crystal.totalParticles += newLayerParticles.length;
      crystal.symmetry = this._computeSymmetry(crystal);
      crystal.stability = this._computeStability(crystal, core);
    }
    return this._cloneCrystal(crystal);
  }

  private _estimateLayerOrder(particleIds: string[], coreId: string): number {
    if (particleIds.length < 3) return 0.5;
    const crystal = this._crystals.get(coreId);
    if (!crystal) return 0.5;
    let totalDist = 0;
    let count = 0;
    for (let i = 0; i < particleIds.length; i++) {
      for (let j = i + 1; j < particleIds.length; j++) {
        const posI = this._cloud.getPosition(particleIds[i]);
        const posJ = this._cloud.getPosition(particleIds[j]);
        if (posI && posJ) {
          let dist = 0;
          for (let d = 0; d < posI.length && d < posJ.length; d++) {
            dist += (posI[d] - posJ[d]) ** 2;
          }
          totalDist += Math.sqrt(dist);
          count++;
        }
      }
    }
    const avgDist = count > 0 ? totalDist / count : 1;
    let variance = 0;
    for (let i = 0; i < particleIds.length; i++) {
      for (let j = i + 1; j < particleIds.length; j++) {
        const posI = this._cloud.getPosition(particleIds[i]);
        const posJ = this._cloud.getPosition(particleIds[j]);
        if (posI && posJ) {
          let dist = 0;
          for (let d = 0; d < posI.length && d < posJ.length; d++) {
            dist += (posI[d] - posJ[d]) ** 2;
          }
          const d = Math.sqrt(dist);
          variance += (d - avgDist) ** 2;
        }
      }
    }
    const stdDev = count > 0 ? Math.sqrt(variance / count) : 1;
    const order = 1 / (1 + stdDev / avgDist);
    return Math.min(1, Math.max(0, order));
  }

  private _computeSymmetry(crystal: CrystalStructure): number {
    if (crystal.layers.length < 2) return 0.3;
    let symmetry = 0;
    for (let i = 1; i < crystal.layers.length; i++) {
      const ratio = crystal.layers[i].particles.length / Math.max(1, crystal.layers[i - 1].particles.length);
      const idealRatio = (i + 1) ** 2 / i ** 2;
      symmetry += 1 - Math.abs(ratio - idealRatio) / idealRatio;
    }
    return symmetry / (crystal.layers.length - 1);
  }

  private _computeStability(crystal: CrystalStructure, core: CoreConcept): number {
    const orderFactor = crystal.layers.reduce((s, l) => s + l.order, 0) / crystal.layers.length;
    const sizeFactor = Math.min(1, crystal.totalParticles / 50);
    const coreFactor = core.centrality * core.bindingStrength;
    const symmetryFactor = crystal.symmetry;
    return (orderFactor * 0.3 + sizeFactor * 0.2 + coreFactor * 0.3 + symmetryFactor * 0.2);
  }

  private _cloneCrystal(c: CrystalStructure): CrystalStructure {
    return {
      ...c,
      layers: c.layers.map(l => ({ ...l, particles: [...l.particles] })),
      growthDirection: [...c.growthDirection]
    };
  }

  public getCrystalStructure(coreId: string): CrystalStructure | null {
    const c = this._crystals.get(coreId);
    return c ? this._cloneCrystal(c) : null;
  }

  public computeCrystallizationRate(): number {
    if (this._cores.size === 0) return 0;
    let totalRate = 0;
    for (const [coreId] of this._cores) {
      const crystal = this._crystals.get(coreId);
      if (crystal && crystal.layers.length > 1) {
        const lastLayer = crystal.layers[crystal.layers.length - 1];
        totalRate += lastLayer.growthRate;
      }
    }
    return totalRate / this._cores.size;
  }

  public findStableCores(minStability: number = 0.5): string[] {
    const result: string[] = [];
    for (const [coreId] of this._cores) {
      const crystal = this._crystals.get(coreId);
      if (crystal && crystal.stability >= minStability) {
        result.push(coreId);
      }
    }
    return result;
  }

  public dissolveCore(coreId: string): void {
    const crystal = this._crystals.get(coreId);
    if (crystal) {
      for (const layer of crystal.layers) {
        for (const pid of layer.particles) {
          const p = this._cloud.getParticle(pid);
          if (p) {
            p.decay(0.1);
            p.applyPhaseShift(Math.random() * Math.PI * 2);
          }
        }
      }
    }
    this._cores.delete(coreId);
    this._crystals.delete(coreId);
  }

  public getLargestCrystal(): CrystalStructure | null {
    let largest: CrystalStructure | null = null;
    let maxSize = 0;
    for (const [, crystal] of this._crystals) {
      if (crystal.totalParticles > maxSize) {
        maxSize = crystal.totalParticles;
        largest = this._cloneCrystal(crystal);
      }
    }
    return largest;
  }

  public toKnowledgeUnit(coreId: string): KnowledgeUnit | null {
    const core = this._cores.get(coreId);
    const crystal = this._crystals.get(coreId);
    if (!core) return null;
    const vector: number[] = [];
    vector.push(core.centrality);
    vector.push(core.attractiveness);
    vector.push(core.bindingStrength);
    vector.push(crystal ? crystal.totalParticles / 100 : 0);
    vector.push(crystal ? crystal.stability : 0);
    vector.push(crystal ? crystal.symmetry : 0);
    vector.push(crystal ? crystal.layers.length / 10 : 0);
    vector.push(core.seedParticles.length / 10);
    return {
      id: `condensation-${coreId}`,
      content: core.name,
      vector,
      lineage: ['condensation-core', ...(crystal ? [crystal.coreConcept] : [])]
    };
  }

  public toSignal(): Signal {
    const totalCrystallized = Array.from(this._crystals.values())
      .reduce((s, c) => s + c.totalParticles, 0);
    const avgStability = this._crystals.size > 0
      ? Array.from(this._crystals.values()).reduce((s, c) => s + c.stability, 0) / this._crystals.size
      : 0;
    return {
      source: 'condensation-core',
      magnitude: totalCrystallized * avgStability,
      entropy: 1 - avgStability,
      timestamp: Date.now()
    };
  }

  public reset(): void {
    this._cores.clear();
    this._crystals.clear();
    this._nucleationEvents = [];
    this._growthLog = [];
  }
}
