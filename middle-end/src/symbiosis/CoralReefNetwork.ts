export interface ReefSpecies {
  id: string;
  trophicLevel: number;
  biomass: number;
  energyInput: number;
  biodiversityContribution: number;
}

export interface TrophicLink {
  predator: string;
  prey: string;
  energyTransfer: number;
  efficiency: number;
}

export class CoralReefNetwork {
  private _species: Map<string, ReefSpecies> = new Map();
  private _links: TrophicLink[] = [];
  private _state: Record<string, unknown> = {};
  private _energyPyramid: Map<number, number> = new Map();
  private _trophicEfficiency: number = 0.1;

  constructor() {}

  get speciesCount(): number {
    return this._species.size;
  }

  get linkCount(): number {
    return this._links.length;
  }

  addSpecies(id: string, trophicLevel: number, biomass: number, energyInput: number): void {
    const biodiversityContribution = biomass * Math.exp(-trophicLevel * 0.5);
    this._species.set(id, { id, trophicLevel, biomass, energyInput, biodiversityContribution });
    this._updateEnergyPyramid();
  }

  private _updateEnergyPyramid(): void {
    this._energyPyramid.clear();
    for (const sp of this._species.values()) {
      const current = this._energyPyramid.get(sp.trophicLevel) ?? 0;
      this._energyPyramid.set(sp.trophicLevel, current + sp.energyInput);
    }
  }

  linkTrophic(predator: string, prey: string): void {
    const p = this._species.get(predator);
    const q = this._species.get(prey);
    if (!p || !q || p.trophicLevel <= q.trophicLevel) return;
    const energyTransfer = q.energyInput * this._trophicEfficiency;
    const efficiency = energyTransfer / (q.energyInput || 1);
    this._links.push({ predator, prey, energyTransfer, efficiency });
  }

  trophicLevelEnergy(level: number): number {
    return this._energyPyramid.get(level) ?? 0;
  }

  pyramidRatio(): number {
    const levels = Array.from(this._energyPyramid.keys()).sort((a, b) => a - b);
    if (levels.length < 2) return 0;
    const base = this._energyPyramid.get(levels[0]) ?? 1;
    const top = this._energyPyramid.get(levels[levels.length - 1]) ?? 0;
    return top / base;
  }

  shannonDiversity(): number {
    const biomasses = Array.from(this._species.values()).map((s) => s.biomass);
    const total = biomasses.reduce((s, v) => s + v, 0);
    if (total === 0) return 0;
    return -biomasses.reduce((s, v) => {
      const p = v / total;
      return p > 0 ? s + p * Math.log2(p) : s;
    }, 0);
  }

  simpsonDiversity(): number {
    const biomasses = Array.from(this._species.values()).map((s) => s.biomass);
    const total = biomasses.reduce((s, v) => s + v, 0);
    if (total === 0) return 0;
    return biomasses.reduce((s, v) => s + Math.pow(v / total, 2), 0);
  }

  keystoneSpecies(): string | null {
    let maxLinks = 0;
    let keystone: string | null = null;
    const linkCounts = new Map<string, number>();
    for (const link of this._links) {
      linkCounts.set(link.predator, (linkCounts.get(link.predator) ?? 0) + 1);
      linkCounts.set(link.prey, (linkCounts.get(link.prey) ?? 0) + 1);
    }
    for (const [id, count] of linkCounts) {
      if (count > maxLinks) {
        maxLinks = count;
        keystone = id;
      }
    }
    return keystone;
  }

  cascadeRemoval(id: string): string[] {
    const affected: string[] = [];
    const removed = new Set<string>([id]);
    const queue: string[] = [id];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      for (const link of this._links) {
        if (link.predator === curr && !removed.has(link.prey)) {
          removed.add(link.prey);
          affected.push(link.prey);
          queue.push(link.prey);
        }
      }
    }
    return affected;
  }

  report(): Record<string, unknown> {
    return {
      species: this._species.size,
      links: this._links.length,
      shannon: this.shannonDiversity(),
      simpson: this.simpsonDiversity(),
      keystone: this.keystoneSpecies(),
      state: this._state,
    };
  }
}
