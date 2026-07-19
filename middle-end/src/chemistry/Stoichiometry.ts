import { DataPacket, PacketMeta } from '../shared/types';

/** Mole descriptor. */
export interface Mole {
  mass: number;
  molarMass: number;
  particles: number;
}

/** Solution descriptor. */
export interface Solution {
  concentration: number;
  volume: number;
  solute: string;
}

/** Limiting reagent descriptor. */
export interface LimitingReagent {
  reagent: string;
  moles: number;
  excess: number;
  product: number;
}

const AVOGADRO = 6.022e23;

/** Mole stoichiometry calculations. */
export class Stoichiometry {
  private _moles: Mole[] = [];
  private _solutions: Solution[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  /** Convert grams to moles. */
  toMoles(grams: number, molarMass: number): number {
    if (molarMass <= 0) return 0;
    const moles = grams / molarMass;
    this._history.push({ method: 'toMoles', grams, moles });
    return moles;
  }

  /** Convert moles to grams. */
  toGrams(moles: number, molarMass: number): number {
    const grams = moles * molarMass;
    this._history.push({ method: 'toGrams', moles, grams });
    return grams;
  }

  /** Convert moles to particles. */
  toParticles(moles: number): number {
    const particles = moles * AVOGADRO;
    this._history.push({ method: 'toParticles', moles });
    return particles;
  }

  /** Molarity = moles / liters. */
  molarity(moles: number, volume: number): number {
    if (volume <= 0) return 0;
    const M = moles / volume;
    this._history.push({ method: 'molarity', moles, volume });
    return M;
  }

  /** Molality = moles / kg solvent. */
  molality(moles: number, kg: number): number {
    if (kg <= 0) return 0;
    const m = moles / kg;
    this._history.push({ method: 'molality', moles, kg });
    return m;
  }

  /** Mole fraction of a component in a mixture. */
  moleFraction(component: number, total: number): number {
    if (total <= 0) return 0;
    const x = component / total;
    this._history.push({ method: 'moleFraction' });
    return x;
  }

  /** Dilution equation M1*V1 = M2*V2; returns new V2 given others. */
  dilution(M1: number, V1: number, M2: number): number {
    if (M2 <= 0) return 0;
    const V2 = (M1 * V1) / M2;
    this._history.push({ method: 'dilution', M1, V1, M2, V2 });
    return V2;
  }

  /** Identify limiting reagent. */
  limitingReagent(reactants: Array<{ name: string; moles: number }>, ratio: number[]): LimitingReagent {
    let minIdx = 0;
    let minVal = Infinity;
    for (let i = 0; i < reactants.length; i++) {
      const eff = reactants[i].moles / (ratio[i] ?? 1);
      if (eff < minVal) {
        minVal = eff;
        minIdx = i;
      }
    }
    const limiting = reactants[minIdx];
    const product = minVal;
    let excess = 0;
    for (let i = 0; i < reactants.length; i++) {
      if (i === minIdx) continue;
      excess += reactants[i].moles - minVal * (ratio[i] ?? 1);
    }
    const result: LimitingReagent = {
      reagent: limiting.name,
      moles: limiting.moles,
      excess: Math.max(0, excess),
      product,
    };
    this._history.push({ method: 'limitingReagent', idx: minIdx });
    return result;
  }

  /** Theoretical yield from a balanced reaction. */
  theoreticalYield(reaction: { products: Array<{ moles: number; molarMass: number }> }): number {
    if (reaction.products.length === 0) return 0;
    const p = reaction.products[0];
    const yieldGrams = p.moles * p.molarMass;
    this._history.push({ method: 'theoreticalYield', yield: yieldGrams });
    return yieldGrams;
  }

  /** Percent yield = actual / theoretical * 100. */
  percentYield(actual: number, theoretical: number): number {
    if (theoretical <= 0) return 0;
    const pct = (actual / theoretical) * 100;
    this._history.push({ method: 'percentYield', pct });
    return pct;
  }

  /** Derive empirical formula from a token like 'C6H12O6'. */
  empirical(formula: string): string {
    const matches = formula.match(/([A-Z][a-z]?)(\d*)/g) ?? [];
    const counts: Record<string, number> = {};
    for (const m of matches) {
      const mm = m.match(/([A-Z][a-z]?)(\d*)/);
      if (!mm) continue;
      const element = mm[1];
      const n = mm[2] ? parseInt(mm[2], 10) : 1;
      counts[element] = (counts[element] ?? 0) + n;
    }
    const values = Object.values(counts);
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const overall = values.reduce((acc, v) => gcd(acc, v), values[0] ?? 1);
    const parts: string[] = [];
    for (const [el, n] of Object.entries(counts)) {
      const d = n / overall;
      parts.push(d === 1 ? el : `${el}${d}`);
    }
    this._history.push({ method: 'empirical', formula });
    return parts.join('');
  }

  /** Derive molecular formula from empirical and molar mass. */
  molecular(empirical: string, molarMass: number): string {
    const matches = empirical.match(/([A-Z][a-z]?)(\d*)/g) ?? [];
    let empiricalMass = 0;
    const masses: Record<string, number> = { H: 1, C: 12, N: 14, O: 16, S: 32, Cl: 35.5 };
    for (const m of matches) {
      const mm = m.match(/([A-Z][a-z]?)(\d*)/);
      if (!mm) continue;
      const element = mm[1];
      const n = mm[2] ? parseInt(mm[2], 10) : 1;
      empiricalMass += (masses[element] ?? 12) * n;
    }
    const factor = Math.round(molarMass / empiricalMass);
    const parts: string[] = [];
    for (const m of matches) {
      const mm = m.match(/([A-Z][a-z]?)(\d*)/);
      if (!mm) continue;
      const element = mm[1];
      const n = mm[2] ? parseInt(mm[2], 10) : 1;
      const d = n * factor;
      parts.push(d === 1 ? element : `${element}${d}`);
    }
    this._history.push({ method: 'molecular', empirical, molarMass });
    return parts.join('');
  }

  /** Percent composition of each element in a compound. */
  percentComposition(compound: string): Record<string, number> {
    const matches = compound.match(/([A-Z][a-z]?)(\d*)/g) ?? [];
    const masses: Record<string, number> = { H: 1, C: 12, N: 14, O: 16, S: 32, Cl: 35.5, Na: 23, K: 39 };
    const counts: Record<string, number> = {};
    let total = 0;
    for (const m of matches) {
      const mm = m.match(/([A-Z][a-z]?)(\d*)/);
      if (!mm) continue;
      const element = mm[1];
      const n = mm[2] ? parseInt(mm[2], 10) : 1;
      counts[element] = (counts[element] ?? 0) + n;
      total += (masses[element] ?? 12) * n;
    }
    const result: Record<string, number> = {};
    for (const [el, n] of Object.entries(counts)) {
      result[el] = ((masses[el] ?? 12) * n / total) * 100;
    }
    this._history.push({ method: 'percentComposition', compound });
    return result;
  }

  toPacket(): DataPacket<{
    moles: Mole[];
    solutions: Solution[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['chemistry', 'Stoichiometry'],
      priority: 1,
      phase: 'chemistry:stoichiometry',
    };
    return {
      id: `stoi-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        moles: this._moles,
        solutions: this._solutions,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._moles = [];
    this._solutions = [];
    this._history = [];
    this._counter = 0;
  }

  get moleCount(): number {
    return this._moles.length;
  }

  get solutionCount(): number {
    return this._solutions.length;
  }

  get historyDepth(): number {
    return this._history.length;
  }
}
