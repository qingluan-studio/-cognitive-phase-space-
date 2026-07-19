import { DataPacket, PacketMeta } from '../shared/types';

/** Chemical element descriptor. */
export interface Element {
  symbol: string;
  name: string;
  atomicNumber: number;
  atomicMass: number;
  group: number;
  period: number;
  category: string;
  electronConfig: string;
  electronegativity: number;
  oxidationStates: number[];
}

/** Property trend along a period or group. */
export interface Trend {
  axis: 'period' | 'group';
  index: number;
  property: string;
  values: Array<{ symbol: string; value: number }>;
}

/** Predicted physical/chemical properties for a candidate element. */
export interface PredictedProperties {
  atomicNumber: number;
  estimatedRadius: number;
  estimatedIonization: number;
  estimatedElectronegativity: number;
  likelyCategory: string;
}

/** Isotopic record for an element. */
export interface Isotope {
  symbol: string;
  massNumber: number;
  abundance: number;
  stable: boolean;
}

type Category = 'alkali-metal' | 'alkaline-earth' | 'transition' | 'post-transition'
  | 'metalloid' | 'nonmetal' | 'halogen' | 'noble-gas' | 'lanthanide' | 'actinide' | 'unknown';

const SHELL_CAPACITIES = [2, 8, 18, 32, 32, 18, 8];

/** Compact periodic table with derived property lookups. */
export class PeriodicTable {
  private _elements: Map<string, Element> = new Map();
  private _byNumber: Map<number, Element> = new Map();
  private _groups: Map<number, Element[]> = new Map();
  private _periods: Map<number, Element[]> = new Map();
  private _isotopes: Map<string, Isotope[]> = new Map();
  private _history: unknown[] = [];
  private _counter = 0;

  constructor() {
    this._seedElements();
  }

  private _seedElements(): void {
    const seed: Array<[string, string, number, number, number, number, Category, string, number, number[]]> = [
      ['H', 'Hydrogen', 1, 1.008, 1, 1, 'nonmetal', '1s1', 2.20, [1, -1]],
      ['He', 'Helium', 2, 4.003, 18, 1, 'noble-gas', '1s2', 0, [0]],
      ['Li', 'Lithium', 3, 6.941, 1, 2, 'alkali-metal', '[He]2s1', 0.98, [1]],
      ['Be', 'Beryllium', 4, 9.012, 2, 2, 'alkaline-earth', '[He]2s2', 1.57, [2]],
      ['B', 'Boron', 5, 10.811, 13, 2, 'metalloid', '[He]2s2 2p1', 2.04, [3]],
      ['C', 'Carbon', 6, 12.011, 14, 2, 'nonmetal', '[He]2s2 2p2', 2.55, [4, -4, 2]],
      ['N', 'Nitrogen', 7, 14.007, 15, 2, 'nonmetal', '[He]2s2 2p3', 3.04, [5, -3, 3]],
      ['O', 'Oxygen', 8, 15.999, 16, 2, 'nonmetal', '[He]2s2 2p4', 3.44, [-2]],
      ['F', 'Fluorine', 9, 18.998, 17, 2, 'halogen', '[He]2s2 2p5', 3.98, [-1]],
      ['Ne', 'Neon', 10, 20.180, 18, 2, 'noble-gas', '[He]2s2 2p6', 0, [0]],
      ['Na', 'Sodium', 11, 22.990, 1, 3, 'alkali-metal', '[Ne]3s1', 0.93, [1]],
      ['Mg', 'Magnesium', 12, 24.305, 2, 3, 'alkaline-earth', '[Ne]3s2', 1.31, [2]],
      ['Al', 'Aluminum', 13, 26.982, 13, 3, 'post-transition', '[Ne]3s2 3p1', 1.61, [3]],
      ['Si', 'Silicon', 14, 28.086, 14, 3, 'metalloid', '[Ne]3s2 3p2', 1.90, [4, -4]],
      ['P', 'Phosphorus', 15, 30.974, 15, 3, 'nonmetal', '[Ne]3s2 3p3', 2.19, [5, -3, 3]],
      ['S', 'Sulfur', 16, 32.065, 16, 3, 'nonmetal', '[Ne]3s2 3p4', 2.58, [6, -2, 4, 2]],
      ['Cl', 'Chlorine', 17, 35.453, 17, 3, 'halogen', '[Ne]3s2 3p5', 3.16, [-1, 1, 3, 5, 7]],
      ['Ar', 'Argon', 18, 39.948, 18, 3, 'noble-gas', '[Ne]3s2 3p6', 0, [0]],
      ['K', 'Potassium', 19, 39.098, 1, 4, 'alkali-metal', '[Ar]4s1', 0.82, [1]],
      ['Ca', 'Calcium', 20, 40.078, 2, 4, 'alkaline-earth', '[Ar]4s2', 1.00, [2]],
      ['Fe', 'Iron', 26, 55.845, 8, 4, 'transition', '[Ar]3d6 4s2', 1.83, [2, 3, 6]],
      ['Cu', 'Copper', 29, 63.546, 11, 4, 'transition', '[Ar]3d10 4s1', 1.90, [1, 2]],
      ['Zn', 'Zinc', 30, 65.380, 12, 4, 'transition', '[Ar]3d10 4s2', 1.65, [2]],
      ['Br', 'Bromine', 35, 79.904, 17, 4, 'halogen', '[Ar]3d10 4s2 4p5', 2.96, [-1, 1, 3, 5]],
      ['Ag', 'Silver', 47, 107.868, 11, 5, 'transition', '[Kr]4d10 5s1', 1.93, [1]],
      ['I', 'Iodine', 53, 126.904, 17, 5, 'halogen', '[Kr]4d10 5s2 5p5', 2.66, [-1, 1, 3, 5, 7]],
      ['Au', 'Gold', 79, 196.967, 11, 6, 'transition', '[Xe]4f14 5d10 6s1', 2.54, [1, 3]],
      ['Hg', 'Mercury', 80, 200.590, 12, 6, 'transition', '[Xe]4f14 5d10 6s2', 2.00, [1, 2]],
      ['Pb', 'Lead', 82, 207.200, 14, 6, 'post-transition', '[Xe]4f14 5d10 6s2 6p2', 2.33, [2, 4]],
      ['U', 'Uranium', 92, 238.029, 0, 7, 'actinide', '[Rn]5f3 6d1 7s2', 1.38, [3, 4, 5, 6]],
    ];
    for (const row of seed) {
      const el: Element = {
        symbol: row[0],
        name: row[1],
        atomicNumber: row[2],
        atomicMass: row[3],
        group: row[4],
        period: row[5],
        category: row[6],
        electronConfig: row[7],
        electronegativity: row[8],
        oxidationStates: row[9],
      };
      this._elements.set(el.symbol, el);
      this._byNumber.set(el.atomicNumber, el);
      const g = this._groups.get(el.group) ?? [];
      g.push(el);
      this._groups.set(el.group, g);
      const p = this._periods.get(el.period) ?? [];
      p.push(el);
      this._periods.set(el.period, p);
    }
    this._seedIsotopes();
  }

  private _seedIsotopes(): void {
    this._isotopes.set('H', [
      { symbol: 'H', massNumber: 1, abundance: 99.985, stable: true },
      { symbol: 'H', massNumber: 2, abundance: 0.015, stable: true },
      { symbol: 'H', massNumber: 3, abundance: 0, stable: false },
    ]);
    this._isotopes.set('C', [
      { symbol: 'C', massNumber: 12, abundance: 98.89, stable: true },
      { symbol: 'C', massNumber: 13, abundance: 1.11, stable: true },
      { symbol: 'C', massNumber: 14, abundance: 0, stable: false },
    ]);
    this._isotopes.set('O', [
      { symbol: 'O', massNumber: 16, abundance: 99.76, stable: true },
      { symbol: 'O', massNumber: 17, abundance: 0.04, stable: true },
      { symbol: 'O', massNumber: 18, abundance: 0.20, stable: true },
    ]);
    this._isotopes.set('U', [
      { symbol: 'U', massNumber: 234, abundance: 0.0055, stable: false },
      { symbol: 'U', massNumber: 235, abundance: 0.720, stable: false },
      { symbol: 'U', massNumber: 238, abundance: 99.275, stable: false },
    ]);
  }

  /** Fetch element by symbol. */
  getElement(symbol: string): Element | null {
    const el = this._elements.get(symbol);
    if (!el) return null;
    this._history.push({ method: 'getElement', symbol, at: Date.now() });
    return el;
  }

  /** Fetch element by atomic number Z. */
  getElementByNumber(z: number): Element | null {
    const el = this._byNumber.get(z);
    if (!el) return null;
    this._history.push({ method: 'getElementByNumber', z, at: Date.now() });
    return el;
  }

  /** Fetch all elements in a given group (column). */
  getGroup(n: number): Element[] {
    const arr = this._groups.get(n) ?? [];
    this._history.push({ method: 'getGroup', n });
    return [...arr];
  }

  /** Fetch all elements in a given period (row). */
  getPeriod(n: number): Element[] {
    const arr = this._periods.get(n) ?? [];
    this._history.push({ method: 'getPeriod', n });
    return [...arr];
  }

  /** Resolve electron configuration string for atomic number Z. */
  electronConfiguration(z: number): string {
    const el = this._byNumber.get(z);
    if (el) {
      this._history.push({ method: 'electronConfiguration', z });
      return el.electronConfig;
    }
    return this._deriveConfiguration(z);
  }

  private _deriveConfiguration(z: number): string {
    const shells: number[] = [];
    let remaining = z;
    for (const cap of SHELL_CAPACITIES) {
      if (remaining <= 0) break;
      const fill = Math.min(remaining, cap);
      shells.push(fill);
      remaining -= fill;
    }
    const labels = ['s', 'p', 'd', 'f'];
    const parts: string[] = [];
    for (let i = 0; i < shells.length; i++) {
      parts.push(`${i + 1}${labels[Math.min(i, labels.length - 1)]}${shells[i]}`);
    }
    return parts.join(' ');
  }

  /** Count valence electrons for atomic number Z. */
  valenceElectrons(z: number): number {
    const el = this._byNumber.get(z);
    if (!el) return 0;
    if (el.category === 'transition') {
      const tokens = el.electronConfig.split(' ');
      const last = tokens[tokens.length - 1];
      const m = last.match(/(\d+)$/);
      return m ? parseInt(m[1], 10) : 0;
    }
    const g = el.group;
    if (g >= 1 && g <= 2) return g;
    if (g >= 13 && g <= 18) return g - 10;
    return 0;
  }

  /** Approximate atomic radius in picometers. */
  atomicRadius(z: number): number {
    const el = this._byNumber.get(z);
    if (!el) return 0;
    const period = el.period;
    const base = 200 - (period - 1) * 30;
    const groupMod = el.group === 0 ? 8 : el.group;
    return Math.max(30, base - groupMod * 6);
  }

  /** Approximate first ionization energy in kJ/mol. */
  ionizationEnergy(z: number): number {
    const el = this._byNumber.get(z);
    if (!el) return 0;
    const period = el.period;
    const base = 500 + period * 150;
    const groupMod = el.group === 0 ? 8 : el.group;
    if (el.category === 'noble-gas') return base + 800;
    if (el.category === 'halogen') return base + 400;
    return Math.max(400, base + (8 - (groupMod > 8 ? groupMod - 10 : groupMod)) * 50);
  }

  /** Approximate electron affinity in kJ/mol. */
  electronAffinity(z: number): number {
    const el = this._byNumber.get(z);
    if (!el) return 0;
    if (el.category === 'halogen') return -300 - el.period * 10;
    if (el.category === 'noble-gas') return 0;
    if (el.category === 'alkali-metal') return -50;
    return -100 - (8 - (el.group > 8 ? el.group - 10 : el.group)) * 15;
  }

  /** Electronegativity on Pauling scale. */
  electronegativity(z: number): number {
    const el = this._byNumber.get(z);
    if (!el) return 0;
    this._history.push({ method: 'electronegativity', z });
    return el.electronegativity;
  }

  /** Categorize element as metal, nonmetal, or metalloid. */
  metalNonmetal(z: number): 'metal' | 'nonmetal' | 'metalloid' {
    const el = this._byNumber.get(z);
    if (!el) return 'nonmetal';
    if (el.category === 'metalloid') return 'metalloid';
    if (el.category === 'nonmetal' || el.category === 'halogen' || el.category === 'noble-gas') {
      return 'nonmetal';
    }
    return 'metal';
  }

  /** List known isotopes for an element symbol. */
  isotope(symbol: string): Isotope[] {
    const arr = this._isotopes.get(symbol) ?? [];
    this._history.push({ method: 'isotope', symbol });
    return [...arr];
  }

  /** Sample a property trend across a period. */
  periodTrends(property: 'electronegativity' | 'radius' | 'ionization'): Trend {
    const allPeriods = Array.from(this._periods.keys()).sort((a, b) => a - b);
    const target = allPeriods[1] ?? 1;
    const els = (this._periods.get(target) ?? []).slice().sort((a, b) => a.atomicNumber - b.atomicNumber);
    const values = els.map(el => ({
      symbol: el.symbol,
      value: property === 'electronegativity'
        ? el.electronegativity
        : property === 'radius'
          ? this.atomicRadius(el.atomicNumber)
          : this.ionizationEnergy(el.atomicNumber),
    }));
    const trend: Trend = { axis: 'period', index: target, property, values };
    this._history.push({ method: 'periodTrends', property });
    return trend;
  }

  /** Sample a property trend down a group. */
  groupTrends(property: 'electronegativity' | 'radius' | 'ionization'): Trend {
    const allGroups = Array.from(this._groups.keys()).filter(g => g > 0).sort((a, b) => a - b);
    const target = allGroups[0] ?? 1;
    const els = (this._groups.get(target) ?? []).slice().sort((a, b) => a.atomicNumber - b.atomicNumber);
    const values = els.map(el => ({
      symbol: el.symbol,
      value: property === 'electronegativity'
        ? el.electronegativity
        : property === 'radius'
          ? this.atomicRadius(el.atomicNumber)
          : this.ionizationEnergy(el.atomicNumber),
    }));
    const trend: Trend = { axis: 'group', index: target, property, values };
    this._history.push({ method: 'groupTrends', property });
    return trend;
  }

  /** Predict properties of a hypothetical element with atomic number Z. */
  predictProperties(z: number): PredictedProperties {
    const existing = this._byNumber.get(z);
    const period = existing?.period ?? Math.ceil(z / 18);
    const group = existing?.group ?? (z % 18 === 0 ? 18 : z % 18);
    const category = existing?.category ?? 'unknown';
    const estimatedRadius = this.atomicRadius(z) || Math.max(40, 220 - period * 25 - group * 4);
    const estimatedIonization = this.ionizationEnergy(z) || 500 + period * 100;
    const estimatedEN = existing?.electronegativity ?? Math.max(0.5, 2.0 - (period - 2) * 0.1);
    const result: PredictedProperties = {
      atomicNumber: z,
      estimatedRadius,
      estimatedIonization,
      estimatedElectronegativity: estimatedEN,
      likelyCategory: category,
    };
    this._history.push({ method: 'predictProperties', z });
    return result;
  }

  /** Compute electron shell filling distribution for atomic number Z. */
  shellFill(z: number): number[] {
    const shells: number[] = [];
    let remaining = z;
    for (const cap of SHELL_CAPACITIES) {
      if (remaining <= 0) break;
      const fill = Math.min(remaining, cap);
      shells.push(fill);
      remaining -= fill;
    }
    this._history.push({ method: 'shellFill', z, shells });
    return shells;
  }

  toPacket(): DataPacket<{
    elements: Map<string, Element>;
    groups: Map<number, Element[]>;
    periods: Map<number, Element[]>;
    isotopes: Map<string, Isotope[]>;
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['chemistry', 'PeriodicTable'],
      priority: 1,
      phase: 'chemistry:periodic-table',
    };
    return {
      id: `pt-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        elements: this._elements,
        groups: this._groups,
        periods: this._periods,
        isotopes: this._isotopes,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._elements = new Map();
    this._byNumber = new Map();
    this._groups = new Map();
    this._periods = new Map();
    this._isotopes = new Map();
    this._history = [];
    this._counter = 0;
    this._seedElements();
  }

  get elementCount(): number {
    return this._elements.size;
  }

  get groupCount(): number {
    return this._groups.size;
  }

  get periodCount(): number {
    return this._periods.size;
  }

  get historyDepth(): number {
    return this._history.length;
  }
}
