/**
 * 鲍德温加速器：将后天习得的特性通过反复使用加速固化进系统基因，
 * 使原本需要学习的行为逐渐成为先天的本能，缩短适应路径。
 */

export interface AcquiredTrait {
  id: string;
  name: string;
  learnedAt: number;
  usageCount: number;
  performanceGain: number;
  encoded: boolean;
}

export interface FitnessRecord {
  traitId: string;
  generation: number;
  fitness: number;
  measuredAt: number;
}

export interface AccelerationResult {
  traitId: string;
  assimilated: boolean;
  newFitness: number;
  generations: number;
}

export class BaldwinAccelerator {
  private _traits: Map<string, AcquiredTrait> = new Map();
  private _fitness: Map<string, FitnessRecord[]> = new Map();
  private _genome: Set<string> = new Set();
  private _generation = 0;
  private _canalizationThreshold = 0.85;

  recordAcquiredTrait(trait: Omit<AcquiredTrait, 'usageCount' | 'encoded'>): AcquiredTrait {
    const full: AcquiredTrait = {
      ...trait,
      usageCount: 0,
      encoded: false,
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
    this._recordFitness(traitId, gain);
    if (this._shouldCanalize(traitId)) {
      this.triggerCanalization(traitId);
    }
  }

  private _recordFitness(traitId: string, fitness: number): void {
    const records = this._fitness.get(traitId) ?? [];
    records.push({
      traitId,
      generation: this._generation,
      fitness,
      measuredAt: Date.now(),
    });
    this._fitness.set(traitId, records);
  }

  evaluateFitness(traitId: string): number {
    const records = this._fitness.get(traitId) ?? [];
    if (records.length === 0) return 0;
    const recent = records.slice(-5);
    const avg = recent.reduce((sum, r) => sum + r.fitness, 0) / recent.length;
    return avg;
  }

  private _shouldCanalize(traitId: string): boolean {
    const trait = this._traits.get(traitId);
    if (!trait || trait.encoded) return false;
    const fitness = this.evaluateFitness(traitId);
    return fitness >= this._canalizationThreshold && trait.usageCount >= 3;
  }

  triggerCanalization(traitId: string): AccelerationResult {
    const trait = this._traits.get(traitId);
    if (!trait) throw new Error(`Unknown trait: ${traitId}`);
    this._generation++;
    trait.encoded = true;
    this._genome.add(trait.name);
    const newFitness = Math.min(1, this.evaluateFitness(traitId) + 0.1);
    return {
      traitId,
      assimilated: true,
      newFitness,
      generations: this._generation,
    };
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

  setThreshold(value: number): void {
    this._canalizationThreshold = Math.max(0, Math.min(1, value));
  }

  get generation(): number {
    return this._generation;
  }
}
