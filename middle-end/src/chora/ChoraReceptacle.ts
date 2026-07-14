export interface ReceptacleSeed {
  id: string;
  form: string;
  potential: number;
  nucleated: boolean;
}

export interface ReceptacleState {
  supersaturation: number;
  temperature: number;
  volume: number;
}

export class ChoraReceptacle {
  private _seeds: Map<string, ReceptacleSeed> = new Map();
  private _state: ReceptacleState;
  private _nucleationCount: number = 0;
  private _dissolvedEnergy: number = 0;
  private _surfaceTension: number = 0.072;
  private _criticalRadius: number = 0;
  private _diffusionCoefficient: number = 1e-9;

  constructor(initial: ReceptacleState) {
    this._state = { ...initial };
    this._computeCriticalRadius();
  }

  get seedCount(): number {
    return this._seeds.size;
  }

  get nucleationCount(): number {
    return this._nucleationCount;
  }

  get supersaturation(): number {
    return this._state.supersaturation;
  }

  private _computeCriticalRadius(): void {
    const Vm = 1.8e-5;
    const R = 8.314;
    const S = this._state.supersaturation;
    if (S <= 1) {
      this._criticalRadius = Infinity;
      return;
    }
    this._criticalRadius = 2 * this._surfaceTension * Vm / (R * this._state.temperature * Math.log(S));
  }

  deposit(form: string, potential: number): ReceptacleSeed {
    const seed: ReceptacleSeed = {
      id: `seed-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      form,
      potential,
      nucleated: false,
    };
    this._seeds.set(seed.id, seed);
    this._dissolvedEnergy += potential;
    this._attemptNucleation(seed);
    return seed;
  }

  private _attemptNucleation(seed: ReceptacleSeed): void {
    const radius = Math.pow(3 * seed.potential / (4 * Math.PI), 1 / 3);
    this._computeCriticalRadius();
    if (radius >= this._criticalRadius && this._state.supersaturation > 1.1) {
      seed.nucleated = true;
      this._nucleationCount++;
      this._dissolvedEnergy -= seed.potential;
      this._state.supersaturation *= 0.95;
    }
  }

  incubate(time: number): void {
    const diffusionLength = Math.sqrt(4 * this._diffusionCoefficient * time);
    for (const seed of this._seeds.values()) {
      if (!seed.nucleated) {
        const growthProbability = 1 - Math.exp(-diffusionLength * this._state.supersaturation);
        if (growthProbability > 0.5) {
          seed.potential *= 1 + growthProbability * 0.1;
          this._attemptNucleation(seed);
        }
      }
    }
    this._state.temperature *= 0.999;
    this._computeCriticalRadius();
  }

  retrieve(id: string): ReceptacleSeed | null {
    return this._seeds.get(id) ?? null;
  }

  withdraw(id: string): ReceptacleSeed | null {
    const seed = this._seeds.get(id);
    if (!seed) return null;
    this._seeds.delete(id);
    if (seed.nucleated) this._nucleationCount--;
    return seed;
  }

  purge(): void {
    this._seeds.clear();
    this._nucleationCount = 0;
    this._dissolvedEnergy = 0;
  }

  getNucleatedSeeds(): ReceptacleSeed[] {
    return Array.from(this._seeds.values()).filter(s => s.nucleated);
  }

  getDissolvedEnergy(): number {
    return this._dissolvedEnergy;
  }

  getCriticalRadius(): number {
    return this._criticalRadius;
  }

  setSupersaturation(S: number): void {
    this._state.supersaturation = Math.max(1, S);
    this._computeCriticalRadius();
  }

  getState(): ReceptacleState {
    return { ...this._state };
  }

  computeNucleationRate(): number {
    const Z = 0.1;
    const k = 1.38e-23;
    const exponent = -4 * Math.pow(this._surfaceTension, 3) * Math.pow(1.8e-5, 2) /
      (3 * Math.pow(k * this._state.temperature, 3) * Math.pow(Math.log(this._state.supersaturation), 2));
    return Z * Math.exp(exponent);
  }

  setSurfaceTension(gamma: number): void {
    this._surfaceTension = Math.max(0.001, gamma);
    this._computeCriticalRadius();
  }

  computeGibbsFreeEnergy(seedRadius: number): number {
    const Vm = 1.8e-5;
    const R = 8.314;
    const S = this._state.supersaturation;
    const surfaceTerm = 4 * Math.PI * seedRadius * seedRadius * this._surfaceTension;
    const volumeTerm = (4 / 3) * Math.PI * Math.pow(seedRadius, 3) * R * this._state.temperature * Math.log(S) / Vm;
    return surfaceTerm - volumeTerm;
  }

  getNucleationEfficiency(): number {
    const total = this._seeds.size;
    return total > 0 ? this._nucleationCount / total : 0;
  }
}
