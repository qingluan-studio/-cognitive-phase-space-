import { DataPacket, PacketMeta } from '../shared/types';

/** Type of chemical reaction. */
export type ReactionType = 'synthesis' | 'decomposition' | 'single-replacement'
  | 'double-replacement' | 'combustion' | 'redox' | 'acid-base' | 'unknown';

/** A chemical reaction record. */
export interface Reaction {
  reactants: string[];
  products: string[];
  type: ReactionType;
  balanced: boolean;
  enthalpy: number;
  entropy: number;
  gibbs: number;
}

/** Reaction rate descriptor. */
export interface ReactionRate {
  constant: number;
  order: number[];
  rate: number;
  units: string;
}

/** Equilibrium descriptor. */
export interface Equilibrium {
  K: number;
  Q: number;
  direction: 'forward' | 'reverse' | 'none';
  description: string;
}

const R_GAS = 8.314;

/** Balance and analyze chemical reactions. */
export class ChemicalReaction {
  private _reactions: Reaction[] = [];
  private _rates: ReactionRate[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  /** Attempt to balance a textual equation like 'H2 + O2 -> H2O'. */
  balance(equation: string): Reaction {
    const [lhs, rhs] = equation.split('->').map(s => s.trim());
    const reactants = lhs.split('+').map(s => s.trim()).filter(Boolean);
    const products = (rhs ?? '').split('+').map(s => s.trim()).filter(Boolean);
    const balanced = reactants.length > 0 && products.length > 0
      && this._heuristicBalance(reactants, products);
    const reaction: Reaction = {
      reactants,
      products,
      type: 'unknown',
      balanced,
      enthalpy: 0,
      entropy: 0,
      gibbs: 0,
    };
    this._reactions.push(reaction);
    this._history.push({ method: 'balance', equation, balanced });
    return reaction;
  }

  private _heuristicBalance(reactants: string[], products: string[]): boolean {
    const count = (arr: string[]): Record<string, number> => {
      const map: Record<string, number> = {};
      for (const r of arr) {
        const m = r.match(/[A-Z][a-z]?/g) ?? [];
        for (const t of m) map[t] = (map[t] ?? 0) + 1;
      }
      return map;
    };
    const a = count(reactants);
    const b = count(products);
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
      if ((a[k] ?? 0) !== (b[k] ?? 0)) return false;
    }
    return true;
  }

  /** Synthesis A + B -> AB. */
  synthesis(a: string, b: string): Reaction {
    const products = [`${a}${b}`];
    const reaction: Reaction = {
      reactants: [a, b],
      products,
      type: 'synthesis',
      balanced: true,
      enthalpy: -100,
      entropy: -50,
      gibbs: -85,
    };
    this._reactions.push(reaction);
    this._history.push({ method: 'synthesis', a, b });
    return reaction;
  }

  /** Decomposition AB -> A + B. */
  decomposition(compound: string): Reaction {
    const tokens = compound.match(/[A-Z][a-z]?/g) ?? [];
    const reaction: Reaction = {
      reactants: [compound],
      products: tokens,
      type: 'decomposition',
      balanced: true,
      enthalpy: 100,
      entropy: 80,
      gibbs: 60,
    };
    this._reactions.push(reaction);
    this._history.push({ method: 'decomposition', compound });
    return reaction;
  }

  /** Single replacement A + BC -> AC + B. */
  singleReplacement(a: string, b: string): Reaction {
    const reaction: Reaction = {
      reactants: [a, b],
      products: [`${a}X`, `${b[0] ?? 'Y'}`],
      type: 'single-replacement',
      balanced: true,
      enthalpy: -50,
      entropy: 30,
      gibbs: -40,
    };
    this._reactions.push(reaction);
    this._history.push({ method: 'singleReplacement', a, b });
    return reaction;
  }

  /** Double replacement AB + CD -> AD + CB. */
  doubleReplacement(a: string, b: string): Reaction {
    const reaction: Reaction = {
      reactants: [a, b],
      products: [`${a[0] ?? 'A'}${b[1] ?? 'D'}`, `${b[0] ?? 'C'}${a[1] ?? 'B'}`],
      type: 'double-replacement',
      balanced: true,
      enthalpy: -20,
      entropy: 40,
      gibbs: -10,
    };
    this._reactions.push(reaction);
    this._history.push({ method: 'doubleReplacement', a, b });
    return reaction;
  }

  /** Combustion of a substance (typically hydrocarbon). */
  combustion(substance: string): Reaction {
    const reaction: Reaction = {
      reactants: [substance, 'O2'],
      products: ['CO2', 'H2O'],
      type: 'combustion',
      balanced: true,
      enthalpy: -800,
      entropy: 200,
      gibbs: -860,
    };
    this._reactions.push(reaction);
    this._history.push({ method: 'combustion', substance });
    return reaction;
  }

  /** Redox reaction analysis. */
  redox(reaction: Reaction): Reaction {
    const updated: Reaction = { ...reaction, type: 'redox' };
    this._reactions.push(updated);
    this._history.push({ method: 'redox' });
    return updated;
  }

  /** Compute reaction rate from rate constant and concentrations. */
  reactionRate(k: number, concentrations: number[]): ReactionRate {
    let rate = k;
    for (const c of concentrations) rate *= Math.pow(c, 1);
    const result: ReactionRate = {
      constant: k,
      order: concentrations.map(() => 1),
      rate,
      units: 'M/s',
    };
    this._rates.push(result);
    this._history.push({ method: 'reactionRate', k });
    return result;
  }

  /** General rate law given reactants and orders. */
  rateLaw(reactants: string[], orders: number[]): ReactionRate {
    const k = 0.1;
    const concentrations = reactants.map(() => 1.0);
    let rate = k;
    for (let i = 0; i < concentrations.length; i++) {
      rate *= Math.pow(concentrations[i], orders[i] ?? 1);
    }
    const result: ReactionRate = { constant: k, order: orders, rate, units: 'M/s' };
    this._rates.push(result);
    this._history.push({ method: 'rateLaw', reactants });
    return result;
  }

  /** Arrhenius equation k = A * exp(-Ea/(RT)). */
  arrheniusEquation(A: number, Ea: number, T: number): number {
    const k = A * Math.exp(-Ea / (R_GAS * T));
    this._history.push({ method: 'arrheniusEquation', A, Ea, T, k });
    return k;
  }

  /** Activation energy from two rate constants at two temperatures. */
  activationEnergy(k1: number, T1: number, k2: number, T2: number): number {
    if (k1 <= 0 || k2 <= 0 || T1 === T2) return 0;
    const Ea = (R_GAS * Math.log(k2 / k1) * T1 * T2) / (T2 - T1);
    this._history.push({ method: 'activationEnergy', Ea });
    return Ea;
  }

  /** Compute reaction quotient and direction relative to K. */
  equilibrium(K: number, concentrations: number[]): Equilibrium {
    let Q = 1;
    for (const c of concentrations) Q *= c;
    let direction: 'forward' | 'reverse' | 'none' = 'none';
    if (Q < K) direction = 'forward';
    else if (Q > K) direction = 'reverse';
    const description = Q === K
      ? 'at equilibrium'
      : direction === 'forward'
        ? 'shifts forward to reach equilibrium'
        : 'shifts reverse to reach equilibrium';
    const result: Equilibrium = { K, Q, direction, description };
    this._history.push({ method: 'equilibrium', K, Q });
    return result;
  }

  /** Apply Le Chatelier's principle to a stress. */
  leChatelier(reaction: Reaction, stress: string): string {
    let shift: string;
    switch (stress) {
      case 'add-reactant': shift = 'shifts forward to consume added reactant'; break;
      case 'add-product': shift = 'shifts reverse to consume added product'; break;
      case 'remove-reactant': shift = 'shifts reverse to replenish reactant'; break;
      case 'remove-product': shift = 'shifts forward to replenish product'; break;
      case 'increase-pressure': shift = 'shifts toward side with fewer gas moles'; break;
      case 'decrease-pressure': shift = 'shifts toward side with more gas moles'; break;
      case 'increase-temperature': shift = reaction.enthalpy < 0 ? 'shifts reverse (endothermic)' : 'shifts forward (endothermic)'; break;
      case 'decrease-temperature': shift = reaction.enthalpy < 0 ? 'shifts forward (exothermic)' : 'shifts reverse (exothermic)'; break;
      case 'add-catalyst': shift = 'no shift; only speeds attainment of equilibrium'; break;
      default: shift = 'unknown stress';
    }
    this._history.push({ method: 'leChatelier', stress });
    return shift;
  }

  /** Enthalpy change from bond energies. */
  enthalpyChange(bondsBroken: number[], bondsFormed: number[]): number {
    const inSum = bondsBroken.reduce((s, e) => s + e, 0);
    const outSum = bondsFormed.reduce((s, e) => s + e, 0);
    const dH = inSum - outSum;
    this._history.push({ method: 'enthalpyChange', dH });
    return dH;
  }

  /** Entropy change estimate from reaction complexity. */
  entropyChange(reaction: Reaction): number {
    const dS = (reaction.products.length - reaction.reactants.length) * 50;
    this._history.push({ method: 'entropyChange', dS });
    return dS;
  }

  /** Gibbs free energy ΔG = ΔH - TΔS (T in Kelvin). */
  gibbsFreeEnergy(H: number, S: number, T: number): number {
    const G = H - T * (S / 1000);
    this._history.push({ method: 'gibbsFreeEnergy', G });
    return G;
  }

  /** Spontaneity classification from ΔG. */
  spontaneity(G: number): 'spontaneous' | 'nonspontaneous' | 'equilibrium' {
    let result: 'spontaneous' | 'nonspontaneous' | 'equilibrium';
    if (G < -1e-6) result = 'spontaneous';
    else if (G > 1e-6) result = 'nonspontaneous';
    else result = 'equilibrium';
    this._history.push({ method: 'spontaneity', G, result });
    return result;
  }

  toPacket(): DataPacket<{
    reactions: Reaction[];
    rates: ReactionRate[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['chemistry', 'ChemicalReaction'],
      priority: 1,
      phase: 'chemistry:reaction',
    };
    return {
      id: `rxn-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        reactions: this._reactions,
        rates: this._rates,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._reactions = [];
    this._rates = [];
    this._history = [];
    this._counter = 0;
  }

  get reactionCount(): number {
    return this._reactions.length;
  }

  get rateCount(): number {
    return this._rates.length;
  }

  get historyDepth(): number {
    return this._history.length;
  }
}
