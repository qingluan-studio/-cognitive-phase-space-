export interface AcquiredTrait {
  id: string;
  name: string;
  learnedAt: number;
  usageCount: number;
  performanceGain: number;
  encoded: boolean;
  canalizationLevel: number;
  heritability: number;
}

export interface FitnessRecord {
  traitId: string;
  generation: number;
  fitness: number;
  measuredAt: number;
  selectionPressure: number;
}

export interface AccelerationResult {
  traitId: string;
  assimilated: boolean;
  newFitness: number;
  generations: number;
  canalizationLevel: number;
}

export interface FitnessLandscape {
  peaks: Array<{ traitId: string; fitness: number; generation: number }>;
  valleys: Array<{ traitId: string; fitness: number; generation: number }>;
  ruggedness: number;
}

export interface GeneticOperator {
  type: 'mutation' | 'crossover' | 'selection';
  rate: number;
  effectSize: number;
}

export class BaldwinAccelerator {
  private _traits: Map<string, AcquiredTrait> = new Map();
  private _fitness: Map<string, FitnessRecord[]> = new Map();
  private _genome: Set<string> = new Set();
  private _generation = 0;
  private _canalizationThreshold = 0.85;
  private _mutationRate = 0.05;
  private _selectionIntensity = 0.5;
  private _operators: GeneticOperator[] = [
    { type: 'mutation', rate: 0.05, effectSize: 0.1 },
    { type: 'crossover', rate: 0.1, effectSize: 0.2 },
    { type: 'selection', rate: 0.3, effectSize: 0.3 },
  ];

  recordAcquiredTrait(trait: Omit<AcquiredTrait, 'usageCount' | 'encoded' | 'canalizationLevel' | 'heritability'>): AcquiredTrait {
    const full: AcquiredTrait = {
      ...trait,
      usageCount: 0,
      encoded: false,
      canalizationLevel: 0,
      heritability: 0.3,
    };
    this._traits.set(trait.id, full);
    this._fitness.set(trait.id, []);
    return full;
  }

  reinforceUsage(traitId: string, gain: number): void {
    const trait = this._traits.get(traitId);
    if (!trait) return;
    trait.usageCount++;
    trait.performanceGain = Math.max(trait.performanceGain, gain);
    
    const selectionPressure = this._computeSelectionPressure(trait);
    this._recordFitness(traitId, gain, selectionPressure);
    
    trait.canalizationLevel = this._computeCanalization(trait);
    
    if (this._shouldCanalize(traitId)) {
      this.triggerCanalization(traitId);
    }
  }

  private _computeSelectionPressure(trait: AcquiredTrait): number {
    const avgFitness = this.evaluateFitness(trait.id);
    const usageBonus = trait.usageCount > 5 ? 0.2 : 0;
    const gainBonus = trait.performanceGain > 0.7 ? 0.3 : 0;
    return Math.min(1, avgFitness + usageBonus + gainBonus);
  }

  private _computeCanalization(trait: AcquiredTrait): number {
    const fitness = this.evaluateFitness(trait.id);
    const usageRate = trait.usageCount / (this._generation + 1);
    const stability = 1 - Math.abs(trait.performanceGain - fitness);
    return 0.4 * fitness + 0.3 * usageRate + 0.3 * stability;
  }

  private _recordFitness(traitId: string, fitness: number, selectionPressure: number): void {
    const records = this._fitness.get(traitId) ?? [];
    records.push({
      traitId,
      generation: this._generation,
      fitness,
      measuredAt: Date.now(),
      selectionPressure,
    });
    this._fitness.set(traitId, records);
  }

  evaluateFitness(traitId: string): number {
    const records = this._fitness.get(traitId) ?? [];
    if (records.length === 0) return 0;
    
    const recent = records.slice(-5);
    const weights = recent.map((_, i) => (i + 1) / recent.length);
    const weightedSum = recent.reduce((sum, r, i) => sum + r.fitness * weights[i], 0);
    const weightSum = weights.reduce((a, b) => a + b, 0);
    
    return weightedSum / weightSum;
  }

  private _shouldCanalize(traitId: string): boolean {
    const trait = this._traits.get(traitId);
    if (!trait || trait.encoded) return false;
    const fitness = this.evaluateFitness(traitId);
    return fitness >= this._canalizationThreshold && trait.canalizationLevel > 0.7;
  }

  triggerCanalization(traitId: string): AccelerationResult {
    const trait = this._traits.get(traitId);
    if (!trait) throw new Error(`Unknown trait: ${traitId}`);
    
    this._generation++;
    
    for (const op of this._operators) {
      if (Math.random() < op.rate) {
        this._applyOperator(trait, op);
      }
    }
    
    trait.encoded = true;
    trait.canalizationLevel = Math.min(1, trait.canalizationLevel + 0.2);
    trait.heritability = Math.min(1, trait.heritability + 0.15);
    this._genome.add(trait.name);
    
    const newFitness = Math.min(1, this.evaluateFitness(traitId) + trait.heritability * 0.1);
    
    return {
      traitId,
      assimilated: true,
      newFitness,
      generations: this._generation,
      canalizationLevel: trait.canalizationLevel,
    };
  }

  private _applyOperator(trait: AcquiredTrait, op: GeneticOperator): void {
    switch (op.type) {
      case 'mutation':
        trait.performanceGain = Math.max(0, Math.min(1, trait.performanceGain + (Math.random() - 0.5) * op.effectSize));
        break;
      case 'crossover':
        const otherTraits = Array.from(this._traits.values()).filter(t => t.id !== trait.id && t.encoded);
        if (otherTraits.length > 0) {
          const donor = otherTraits[Math.floor(Math.random() * otherTraits.length)];
          trait.heritability = (trait.heritability + donor.heritability) / 2;
        }
        break;
      case 'selection':
        if (trait.performanceGain < this._selectionIntensity) {
          trait.performanceGain *= 0.9;
        } else {
          trait.performanceGain *= 1.1;
        }
        break;
    }
  }

  encodeToGenome(traitId: string): boolean {
    const trait = this._traits.get(traitId);
    if (!trait) return false;
    if (this._shouldCanalize(traitId) || trait.usageCount >= 5) {
      trait.encoded = true;
      this._genome.add(trait.name);
      return true;
    }
    return false;
  }

  getAssimilationRate(): number {
    if (this._traits.size === 0) return 0;
    const encoded = Array.from(this._traits.values()).filter(t => t.encoded).length;
    return encoded / this._traits.size;
  }

  getTraitArchive(): AcquiredTrait[] {
    return Array.from(this._traits.values());
  }

  getGenome(): string[] {
    return Array.from(this._genome);
  }

  getFitnessLandscape(): FitnessLandscape {
    const peaks: FitnessLandscape['peaks'] = [];
    const valleys: FitnessLandscape['valleys'] = [];
    
    for (const [id, records] of this._fitness) {
      if (records.length < 3) continue;
      
      const recentFitness = records.slice(-3).map(r => r.fitness);
      const avgFitness = recentFitness.reduce((a, b) => a + b, 0) / recentFitness.length;
      
      if (avgFitness > 0.7) {
        peaks.push({ traitId: id, fitness: avgFitness, generation: this._generation });
      } else if (avgFitness < 0.3) {
        valleys.push({ traitId: id, fitness: avgFitness, generation: this._generation });
      }
    }
    
    let ruggedness = 0;
    if (peaks.length > 0 && valleys.length > 0) {
      const peakAvg = peaks.reduce((sum, p) => sum + p.fitness, 0) / peaks.length;
      const valleyAvg = valleys.reduce((sum, v) => sum + v.fitness, 0) / valleys.length;
      ruggedness = peakAvg - valleyAvg;
    }
    
    return { peaks, valleys, ruggedness };
  }

  setThreshold(value: number): void {
    this._canalizationThreshold = Math.max(0, Math.min(1, value));
  }

  setMutationRate(rate: number): void {
    this._mutationRate = Math.max(0, Math.min(0.5, rate));
    this._operators[0].rate = this._mutationRate;
  }

  get generation(): number {
    return this._generation;
  }

  get genomeSize(): number {
    return this._genome.size;
  }
}