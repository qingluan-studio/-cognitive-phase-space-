/**
 * 遗传记忆：祖先的经历被编码传递。
 * 祖先模块的经历以基因式编码保存，并按遗传规律传递给后代，作为隐式知识起作用。
 */

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

  encode(experience: string, dominance: number = 0.5): GeneticMemoryUnit {
    const unit: GeneticMemoryUnit = {
      id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      encodedExperience: experience.split('').reverse().join(''),
      generation: this._currentGeneration,
      dominance,
      expressed: false,
    };
    this._units.set(unit.id, unit);
    return unit;
  }

  express(unitId: string): GeneticMemoryUnit | null {
    const unit = this._units.get(unitId);
    if (!unit) return null;
    if (unit.dominance >= this._expressionThreshold) unit.expressed = true;
    return unit;
  }

  inherit(parentUnitIds: string[]): InheritancePacket {
    this._currentGeneration++;
    const inherited: GeneticMemoryUnit[] = [];
    for (const id of parentUnitIds) {
      const parent = this._units.get(id);
      if (!parent) continue;
      const child: GeneticMemoryUnit = {
        id: `${parent.id}-g${this._currentGeneration}`,
        encodedExperience: parent.encodedExperience,
        generation: this._currentGeneration,
        dominance: parent.dominance * (0.5 + Math.random() * 0.5),
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
}
