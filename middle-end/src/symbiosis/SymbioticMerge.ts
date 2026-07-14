export interface ChemicalSpecies {
  id: string;
  concentration: number;
  stoichiometry: number;
  gibbsFreeEnergy: number;
}

export interface ReactionResult {
  reactants: string[];
  products: string[];
  deltaG: number;
  equilibriumConstant: number;
  rate: number;
  emergentProperty: number;
}

export class SymbioticMerge {
  private _species: Map<string, ChemicalSpecies> = new Map();
  private _reactions: ReactionResult[] = [];
  private _state: Record<string, unknown> = {};
  private _temperature: number = 298;
  private _gasConstant: number = 8.314;

  constructor(temperature: number = 298) {
    this._temperature = temperature;
  }

  get speciesCount(): number {
    return this._species.size;
  }

  get reactionCount(): number {
    return this._reactions.length;
  }

  addSpecies(id: string, concentration: number, stoichiometry: number, gibbsFreeEnergy: number): void {
    this._species.set(id, { id, concentration, stoichiometry, gibbsFreeEnergy });
  }

  react(reactantIds: string[], productIds: string[]): ReactionResult | null {
    let reactantG = 0;
    let productG = 0;
    for (const id of reactantIds) {
      const sp = this._species.get(id);
      if (sp) reactantG += sp.gibbsFreeEnergy * sp.stoichiometry;
    }
    for (const id of productIds) {
      const sp = this._species.get(id);
      if (sp) productG += sp.gibbsFreeEnergy * sp.stoichiometry;
    }
    const deltaG = productG - reactantG;
    const equilibriumConstant = Math.exp(-deltaG / (this._gasConstant * this._temperature));
    const rate = equilibriumConstant * Math.exp(-Math.abs(deltaG) / (this._gasConstant * this._temperature));
    const emergentProperty = -deltaG * Math.log(equilibriumConstant + 1);
    const result: ReactionResult = {
      reactants: [...reactantIds],
      products: [...productIds],
      deltaG,
      equilibriumConstant,
      rate,
      emergentProperty,
    };
    this._reactions.push(result);
    if (this._reactions.length > 100) this._reactions.shift();
    for (const id of reactantIds) {
      const sp = this._species.get(id);
      if (sp) sp.concentration = Math.max(0, sp.concentration - rate * sp.stoichiometry);
    }
    for (const id of productIds) {
      const sp = this._species.get(id);
      if (sp) sp.concentration += rate * sp.stoichiometry;
    }
    return result;
  }

  bindingEnergy(aId: string, bId: string): number {
    const a = this._species.get(aId);
    const b = this._species.get(bId);
    if (!a || !b) return 0;
    return a.gibbsFreeEnergy + b.gibbsFreeEnergy - Math.sqrt(a.gibbsFreeEnergy * b.gibbsFreeEnergy);
  }

  stoichiometricBalance(reactionId: number): number {
    const reaction = this._reactions[reactionId];
    if (!reaction) return 0;
    let reactantSum = 0;
    let productSum = 0;
    for (const id of reaction.reactants) {
      const sp = this._species.get(id);
      if (sp) reactantSum += sp.stoichiometry;
    }
    for (const id of reaction.products) {
      const sp = this._species.get(id);
      if (sp) productSum += sp.stoichiometry;
    }
    return Math.abs(reactantSum - productSum);
  }

  totalFreeEnergy(): number {
    return Array.from(this._species.values()).reduce((s, sp) => s + sp.gibbsFreeEnergy * sp.concentration, 0);
  }

  emergentProperties(): number[] {
    return this._reactions.map((r) => r.emergentProperty);
  }

  reactionYield(reactionId: number): number {
    const reaction = this._reactions[reactionId];
    if (!reaction) return 0;
    return 1 / (1 + Math.exp(reaction.deltaG / (this._gasConstant * this._temperature)));
  }

  report(): Record<string, unknown> {
    return {
      species: this._species.size,
      reactions: this._reactions.length,
      totalFreeEnergy: this.totalFreeEnergy(),
      temperature: this._temperature,
      state: this._state,
    };
  }
}
