export interface GeneticMemoryUnit {
  id: string;
  encodedExperience: string;
  generation: number;
  dominance: number;
  expressed: boolean;
}

export interface InheritancePacket {
  units: GeneticMemoryUnit[];
  generation: number;
  transferredAt: number;
}

export class GeneticMemory {
  private _units: Map<string, GeneticMemoryUnit> = new Map();
  private _inheritanceLog: InheritancePacket[] = [];
  private _currentGeneration = 0;
  private _expressionThreshold = 0.5;
  private _fitnessLandscape: Map<string, number> = new Map();
  private _alleleFreq: Map<string, number> = new Map();

  encode(experience: string, dominance: number = 0.5): GeneticMemoryUnit {
    const unit: GeneticMemoryUnit = {
      id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      encodedExperience: experience.split('').reverse().join(''),
      generation: this._currentGeneration,
      dominance,
      expressed: false,
    };
    this._units.set(unit.id, unit);
    this._alleleFreq.set(unit.id, (this._alleleFreq.get(unit.id) ?? 0) + 1);
    return unit;
  }

  express(unitId: string): GeneticMemoryUnit | null {
    const unit = this._units.get(unitId);
    if (!unit) return null;
    if (unit.dominance >= this._expressionThreshold) unit.expressed = true;
    this._fitnessLandscape.set(unitId, unit.dominance * (unit.expressed ? 1.5 : 0.8));
    return unit;
  }

  inherit(parentUnitIds: string[]): InheritancePacket {
    this._currentGeneration++;
    const inherited: GeneticMemoryUnit[] = [];
    for (const id of parentUnitIds) {
      const parent = this._units.get(id);
      if (!parent) continue;
      const mutationFactor = 0.5 + Math.random() * 0.5;
      const child: GeneticMemoryUnit = {
        id: `${parent.id}-g${this._currentGeneration}`,
        encodedExperience: this._mutateSequence(parent.encodedExperience, mutationFactor),
        generation: this._currentGeneration,
        dominance: parent.dominance * mutationFactor,
        expressed: false,
      };
      this._units.set(child.id, child);
      inherited.push(child);
    }
    const packet: InheritancePacket = {
      units: inherited,
      generation: this._currentGeneration,
      transferredAt: Date.now(),
    };
    this._inheritanceLog.push(packet);
    if (this._inheritanceLog.length > 50) this._inheritanceLog.shift();
    this._updateAlleleFreq(inherited);
    return packet;
  }

  setThreshold(value: number): void {
    this._expressionThreshold = Math.max(0, Math.min(1, value));
  }

  getExpressedMemories(): GeneticMemoryUnit[] {
    return Array.from(this._units.values()).filter(u => u.expressed);
  }

  getUnit(id: string): GeneticMemoryUnit | null {
    return this._units.get(id) ?? null;
  }

  getInheritanceLog(): InheritancePacket[] {
    return [...this._inheritanceLog];
  }

  get generation(): number {
    return this._currentGeneration;
  }

  computeGeneticDiversity(): number {
    const total = this._units.size;
    if (total === 0) return 0;
    let diversity = 0;
    for (const count of this._alleleFreq.values()) {
      const p = count / total;
      diversity -= p * Math.log(p);
    }
    return diversity;
  }

  computeFitness(unitId: string): number {
    return this._fitnessLandscape.get(unitId) ?? 0;
  }

  selectFittest(k: number): GeneticMemoryUnit[] {
    const sorted = Array.from(this._units.values())
      .map(u => ({ unit: u, fitness: this._fitnessLandscape.get(u.id) ?? u.dominance }))
      .sort((a, b) => b.fitness - a.fitness);
    return sorted.slice(0, k).map(x => x.unit);
  }

  private _mutateSequence(seq: string, rate: number): string {
    return seq.split('').map(ch => Math.random() < rate * 0.1 ? String.fromCharCode(ch.charCodeAt(0) + 1) : ch).join('');
  }

  private _updateAlleleFreq(inherited: GeneticMemoryUnit[]): void {
    for (const unit of inherited) {
      this._alleleFreq.set(unit.id, (this._alleleFreq.get(unit.id) ?? 0) + 1);
    }
  }
}
