/**
 * 酶逻辑：用酶促反应类比加速逻辑推理。
 * 把逻辑推理视为酶催化反应，通过引入逻辑"酶"加速推理链的反应速率。
 */

export type EnzymeType = 'deductive' | 'inductive' | 'abductive' | 'analogical';

export interface LogicSubstrate {
  id: string;
  premises: string[];
  enzymeType: EnzymeType;
  activationEnergy: number;
  products: string[];
}

export interface CatalyticResult {
  substrateId: string;
  enzyme: EnzymeType;
  reactionRate: number;
  products: string[];
  completedAt: number;
}

export class EnzymaticLogic {
  private _substrates: Map<string, LogicSubstrate> = new Map();
  private _results: CatalyticResult[] = [];
  private _enzymeAffinity: Record<EnzymeType, number> = {
    deductive: 1.0,
    inductive: 0.7,
    abductive: 0.6,
    analogical: 0.5,
  };
  private _temperature = 1.0;

  prepare(premises: string[], enzymeType: EnzymeType = 'deductive'): LogicSubstrate {
    const substrate: LogicSubstrate = {
      id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      premises: [...premises],
      enzymeType,
      activationEnergy: premises.length * 0.2,
      products: [],
    };
    this._substrates.set(substrate.id, substrate);
    return substrate;
  }

  catalyze(substrateId: string): CatalyticResult | null {
    const substrate = this._substrates.get(substrateId);
    if (!substrate) return null;
    const affinity = this._enzymeAffinity[substrate.enzymeType];
    const reactionRate = affinity * this._temperature / Math.max(0.1, substrate.activationEnergy);

    const products = this._deriveProducts(substrate);
    substrate.products = products;

    const result: CatalyticResult = {
      substrateId,
      enzyme: substrate.enzymeType,
      reactionRate,
      products,
      completedAt: Date.now(),
    };
    this._results.push(result);
    if (this._results.length > 100) this._results.shift();
    return result;
  }

  private _deriveProducts(substrate: LogicSubstrate): string[] {
    const products: string[] = [];
    switch (substrate.enzymeType) {
      case 'deductive':
        if (substrate.premises.length >= 2) {
          products.push(`Therefore: ${substrate.premises[0]} entails ${substrate.premises[1]}`);
        }
        break;
      case 'inductive':
        products.push(`Pattern suggests: ${substrate.premises.join(', ')} generalizes.`);
        break;
      case 'abductive':
        products.push(`Best explanation: ${substrate.premises[0]} explains observations.`);
        break;
      case 'analogical':
        if (substrate.premises.length >= 2) {
          products.push(`${substrate.premises[0]} is analogous to ${substrate.premises[1]}`);
        }
        break;
    }
    return products;
  }

  setEnzymeAffinity(enzyme: EnzymeType, affinity: number): void {
    this._enzymeAffinity[enzyme] = Math.max(0, affinity);
  }

  setTemperature(t: number): void {
    this._temperature = Math.max(0, t);
  }

  getCatalyzed(): CatalyticResult[] {
    return [...this._results];
  }

  getByEnzyme(enzyme: EnzymeType): CatalyticResult[] {
    return this._results.filter(r => r.enzyme === enzyme);
  }

  get substrateCount(): number {
    return this._substrates.size;
  }
}
