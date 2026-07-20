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

/** Quantum number set. */
export interface QuantumNumbers {
  n: number; // 主量子数
  l: number; // 角量子数
  m: number; // 磁量子数
  s: number; // 自旋
  subshell: string;
}

/** Block classification. */
export type Block = 's' | 'p' | 'd' | 'f';

/** Effective nuclear charge descriptor. */
export interface EffectiveNuclearCharge {
  Z: number;
  Zeff: number;
  shielding: number;
  method: string;
}

/** Ionic radius descriptor. */
export interface IonicRadius {
  ion: string;
  radius: number;
  coordination: number;
  charge: number;
}

/** Periodic trend comparison. */
export interface PeriodicComparison {
  property: string;
  values: Array<{ symbol: string; value: number }>;
  trend: 'increasing' | 'decreasing' | 'irregular';
  explanation: string;
}

type Category = 'alkali-metal' | 'alkaline-earth' | 'transition' | 'post-transition'
  | 'metalloid' | 'nonmetal' | 'halogen' | 'noble-gas' | 'lanthanide' | 'actinide' | 'unknown';

const SHELL_CAPACITIES = [2, 8, 18, 32, 32, 18, 8];

/** Orbit filling order (Aufbau principle). */
const AUFBAU_ORDER: Array<[number, number, string]> = [
  [1, 0, '1s'], [2, 0, '2s'], [2, 1, '2p'],
  [3, 0, '3s'], [3, 1, '3p'], [4, 0, '4s'], [3, 2, '3d'], [4, 1, '4p'],
  [5, 0, '5s'], [4, 2, '4d'], [5, 1, '5p'], [6, 0, '6s'], [4, 3, '4f'], [5, 2, '5d'], [6, 1, '6p'],
  [7, 0, '7s'], [5, 3, '5f'], [6, 2, '6d'], [7, 1, '7p'],
];

const SUBSHELL_CAPACITY: Record<string, number> = { s: 2, p: 6, d: 10, f: 14 };

/** Atomic masses for elements 1-92 (subset of full IUPAC data, simplified). */
const ATOMIC_MASS_LOOKUP: Record<number, number> = {
  1: 1.008, 2: 4.003, 3: 6.941, 4: 9.012, 5: 10.811, 6: 12.011, 7: 14.007, 8: 15.999,
  9: 18.998, 10: 20.180, 11: 22.990, 12: 24.305, 13: 26.982, 14: 28.086, 15: 30.974,
  16: 32.065, 17: 35.453, 18: 39.948, 19: 39.098, 20: 40.078, 21: 44.956, 22: 47.867,
  23: 50.942, 24: 51.996, 25: 54.938, 26: 55.845, 27: 58.933, 28: 58.693, 29: 63.546,
  30: 65.380, 31: 69.723, 32: 72.630, 33: 74.922, 34: 78.960, 35: 79.904, 36: 83.798,
  37: 85.468, 38: 87.620, 39: 88.906, 40: 91.224, 41: 92.906, 42: 95.950, 43: 98.000,
  44: 101.070, 45: 102.906, 46: 106.420, 47: 107.868, 48: 112.411, 49: 114.818, 50: 118.710,
  51: 121.760, 52: 127.600, 53: 126.904, 54: 131.293, 55: 132.905, 56: 137.327, 57: 138.905,
  58: 140.116, 59: 140.908, 60: 144.242, 61: 145.000, 62: 150.360, 63: 151.964, 64: 157.250,
  65: 158.925, 66: 162.500, 67: 164.930, 68: 167.259, 69: 168.934, 70: 173.045, 71: 174.967,
  72: 178.490, 73: 180.948, 74: 183.840, 75: 186.207, 76: 190.230, 77: 192.217, 78: 195.084,
  79: 196.967, 80: 200.590, 81: 204.383, 82: 207.200, 83: 208.980, 84: 209.000, 85: 210.000,
  86: 222.000, 87: 223.000, 88: 226.000, 89: 227.000, 90: 232.038, 91: 231.036, 92: 238.029,
};

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
    // [symbol, name, Z, mass, group, period, category, electronConfig, EN, oxidation states]
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
      ['Sc', 'Scandium', 21, 44.956, 3, 4, 'transition', '[Ar]3d1 4s2', 1.36, [3]],
      ['Ti', 'Titanium', 22, 47.867, 4, 4, 'transition', '[Ar]3d2 4s2', 1.54, [4, 3, 2]],
      ['V', 'Vanadium', 23, 50.942, 5, 4, 'transition', '[Ar]3d3 4s2', 1.63, [5, 4, 3, 2]],
      ['Cr', 'Chromium', 24, 51.996, 6, 4, 'transition', '[Ar]3d5 4s1', 1.66, [6, 3, 2]],
      ['Mn', 'Manganese', 25, 54.938, 7, 4, 'transition', '[Ar]3d5 4s2', 1.55, [7, 4, 3, 2]],
      ['Fe', 'Iron', 26, 55.845, 8, 4, 'transition', '[Ar]3d6 4s2', 1.83, [2, 3, 6]],
      ['Co', 'Cobalt', 27, 58.933, 9, 4, 'transition', '[Ar]3d7 4s2', 1.88, [2, 3]],
      ['Ni', 'Nickel', 28, 58.693, 10, 4, 'transition', '[Ar]3d8 4s2', 1.91, [2, 3]],
      ['Cu', 'Copper', 29, 63.546, 11, 4, 'transition', '[Ar]3d10 4s1', 1.90, [1, 2]],
      ['Zn', 'Zinc', 30, 65.380, 12, 4, 'transition', '[Ar]3d10 4s2', 1.65, [2]],
      ['Ga', 'Gallium', 31, 69.723, 13, 4, 'post-transition', '[Ar]3d10 4s2 4p1', 1.81, [3]],
      ['Ge', 'Germanium', 32, 72.630, 14, 4, 'metalloid', '[Ar]3d10 4s2 4p2', 2.01, [4, 2]],
      ['As', 'Arsenic', 33, 74.922, 15, 4, 'metalloid', '[Ar]3d10 4s2 4p3', 2.18, [5, 3, -3]],
      ['Se', 'Selenium', 34, 78.960, 16, 4, 'nonmetal', '[Ar]3d10 4s2 4p4', 2.55, [6, 4, -2]],
      ['Br', 'Bromine', 35, 79.904, 17, 4, 'halogen', '[Ar]3d10 4s2 4p5', 2.96, [-1, 1, 3, 5]],
      ['Kr', 'Krypton', 36, 83.798, 18, 4, 'noble-gas', '[Ar]3d10 4s2 4p6', 3.00, [0, 2]],
      ['Rb', 'Rubidium', 37, 85.468, 1, 5, 'alkali-metal', '[Kr]5s1', 0.82, [1]],
      ['Sr', 'Strontium', 38, 87.620, 2, 5, 'alkaline-earth', '[Kr]5s2', 0.95, [2]],
      ['Y', 'Yttrium', 39, 88.906, 3, 5, 'transition', '[Kr]4d1 5s2', 1.22, [3]],
      ['Zr', 'Zirconium', 40, 91.224, 4, 5, 'transition', '[Kr]4d2 5s2', 1.33, [4, 3, 2]],
      ['Nb', 'Niobium', 41, 92.906, 5, 5, 'transition', '[Kr]4d4 5s1', 1.60, [5, 3, 2]],
      ['Mo', 'Molybdenum', 42, 95.950, 6, 5, 'transition', '[Kr]4d5 5s1', 2.16, [6, 4, 3, 2]],
      ['Tc', 'Technetium', 43, 98.000, 7, 5, 'transition', '[Kr]4d5 5s2', 1.90, [7, 4, 3]],
      ['Ru', 'Ruthenium', 44, 101.070, 8, 5, 'transition', '[Kr]4d7 5s1', 2.20, [4, 3, 2]],
      ['Rh', 'Rhodium', 45, 102.906, 9, 5, 'transition', '[Kr]4d8 5s1', 2.28, [3, 2]],
      ['Pd', 'Palladium', 46, 106.420, 10, 5, 'transition', '[Kr]4d10', 2.20, [2, 4]],
      ['Ag', 'Silver', 47, 107.868, 11, 5, 'transition', '[Kr]4d10 5s1', 1.93, [1]],
      ['Cd', 'Cadmium', 48, 112.411, 12, 5, 'transition', '[Kr]4d10 5s2', 1.69, [2]],
      ['In', 'Indium', 49, 114.818, 13, 5, 'post-transition', '[Kr]4d10 5s2 5p1', 1.78, [3, 1]],
      ['Sn', 'Tin', 50, 118.710, 14, 5, 'post-transition', '[Kr]4d10 5s2 5p2', 1.96, [4, 2, -4]],
      ['Sb', 'Antimony', 51, 121.760, 15, 5, 'metalloid', '[Kr]4d10 5s2 5p3', 2.05, [5, 3, -3]],
      ['Te', 'Tellurium', 52, 127.600, 16, 5, 'metalloid', '[Kr]4d10 5s2 5p4', 2.10, [6, 4, 2, -2]],
      ['I', 'Iodine', 53, 126.904, 17, 5, 'halogen', '[Kr]4d10 5s2 5p5', 2.66, [-1, 1, 3, 5, 7]],
      ['Xe', 'Xenon', 54, 131.293, 18, 5, 'noble-gas', '[Kr]4d10 5s2 5p6', 2.60, [0, 2, 4, 6]],
      ['Cs', 'Cesium', 55, 132.905, 1, 6, 'alkali-metal', '[Xe]6s1', 0.79, [1]],
      ['Ba', 'Barium', 56, 137.327, 2, 6, 'alkaline-earth', '[Xe]6s2', 0.89, [2]],
      ['La', 'Lanthanum', 57, 138.905, 3, 6, 'lanthanide', '[Xe]5d1 6s2', 1.10, [3]],
      ['Ce', 'Cerium', 58, 140.116, 0, 6, 'lanthanide', '[Xe]4f1 5d1 6s2', 1.12, [4, 3]],
      ['Pr', 'Praseodymium', 59, 140.908, 0, 6, 'lanthanide', '[Xe]4f3 6s2', 1.13, [3, 4]],
      ['Nd', 'Neodymium', 60, 144.242, 0, 6, 'lanthanide', '[Xe]4f4 6s2', 1.14, [3, 2]],
      ['Pm', 'Promethium', 61, 145.000, 0, 6, 'lanthanide', '[Xe]4f5 6s2', 1.13, [3]],
      ['Sm', 'Samarium', 62, 150.360, 0, 6, 'lanthanide', '[Xe]4f6 6s2', 1.17, [3, 2]],
      ['Eu', 'Europium', 63, 151.964, 0, 6, 'lanthanide', '[Xe]4f7 6s2', 1.20, [3, 2]],
      ['Gd', 'Gadolinium', 64, 157.250, 0, 6, 'lanthanide', '[Xe]4f7 5d1 6s2', 1.20, [3]],
      ['Tb', 'Terbium', 65, 158.925, 0, 6, 'lanthanide', '[Xe]4f9 6s2', 1.20, [3, 4]],
      ['Dy', 'Dysprosium', 66, 162.500, 0, 6, 'lanthanide', '[Xe]4f10 6s2', 1.22, [3, 2]],
      ['Ho', 'Holmium', 67, 164.930, 0, 6, 'lanthanide', '[Xe]4f11 6s2', 1.23, [3]],
      ['Er', 'Erbium', 68, 167.259, 0, 6, 'lanthanide', '[Xe]4f12 6s2', 1.24, [3]],
      ['Tm', 'Thulium', 69, 168.934, 0, 6, 'lanthanide', '[Xe]4f13 6s2', 1.25, [3, 2]],
      ['Yb', 'Ytterbium', 70, 173.045, 0, 6, 'lanthanide', '[Xe]4f14 6s2', 1.10, [3, 2]],
      ['Lu', 'Lutetium', 71, 174.967, 3, 6, 'lanthanide', '[Xe]4f14 5d1 6s2', 1.27, [3]],
      ['Hf', 'Hafnium', 72, 178.490, 4, 6, 'transition', '[Xe]4f14 5d2 6s2', 1.30, [4, 3]],
      ['Ta', 'Tantalum', 73, 180.948, 5, 6, 'transition', '[Xe]4f14 5d3 6s2', 1.50, [5, 3]],
      ['W', 'Tungsten', 74, 183.840, 6, 6, 'transition', '[Xe]4f14 5d4 6s2', 2.36, [6, 4, 3, 2]],
      ['Re', 'Rhenium', 75, 186.207, 7, 6, 'transition', '[Xe]4f14 5d5 6s2', 1.90, [7, 4, 3, 2]],
      ['Os', 'Osmium', 76, 190.230, 8, 6, 'transition', '[Xe]4f14 5d6 6s2', 2.20, [8, 4, 3, 2]],
      ['Ir', 'Iridium', 77, 192.217, 9, 6, 'transition', '[Xe]4f14 5d7 6s2', 2.20, [4, 3, 2]],
      ['Pt', 'Platinum', 78, 195.084, 10, 6, 'transition', '[Xe]4f14 5d9 6s1', 2.28, [4, 2]],
      ['Au', 'Gold', 79, 196.967, 11, 6, 'transition', '[Xe]4f14 5d10 6s1', 2.54, [1, 3]],
      ['Hg', 'Mercury', 80, 200.590, 12, 6, 'transition', '[Xe]4f14 5d10 6s2', 2.00, [1, 2]],
      ['Tl', 'Thallium', 81, 204.383, 13, 6, 'post-transition', '[Xe]4f14 5d10 6s2 6p1', 1.62, [1, 3]],
      ['Pb', 'Lead', 82, 207.200, 14, 6, 'post-transition', '[Xe]4f14 5d10 6s2 6p2', 2.33, [2, 4]],
      ['Bi', 'Bismuth', 83, 208.980, 15, 6, 'post-transition', '[Xe]4f14 5d10 6s2 6p3', 2.02, [3, 5]],
      ['Po', 'Polonium', 84, 209.000, 16, 6, 'post-transition', '[Xe]4f14 5d10 6s2 6p4', 2.00, [4, 2, -2]],
      ['At', 'Astatine', 85, 210.000, 17, 6, 'halogen', '[Xe]4f14 5d10 6s2 6p5', 2.20, [-1, 1, 3, 5]],
      ['Rn', 'Radon', 86, 222.000, 18, 6, 'noble-gas', '[Xe]4f14 5d10 6s2 6p6', 2.20, [0, 2]],
      ['Fr', 'Francium', 87, 223.000, 1, 7, 'alkali-metal', '[Rn]7s1', 0.70, [1]],
      ['Ra', 'Radium', 88, 226.000, 2, 7, 'alkaline-earth', '[Rn]7s2', 0.90, [2]],
      ['Ac', 'Actinium', 89, 227.000, 3, 7, 'actinide', '[Rn]6d1 7s2', 1.10, [3]],
      ['Th', 'Thorium', 90, 232.038, 0, 7, 'actinide', '[Rn]6d2 7s2', 1.30, [4, 3]],
      ['Pa', 'Protactinium', 91, 231.036, 0, 7, 'actinide', '[Rn]5f2 6d1 7s2', 1.50, [5, 4, 3]],
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
    this._isotopes.set('N', [
      { symbol: 'N', massNumber: 14, abundance: 99.634, stable: true },
      { symbol: 'N', massNumber: 15, abundance: 0.366, stable: true },
    ]);
    this._isotopes.set('O', [
      { symbol: 'O', massNumber: 16, abundance: 99.76, stable: true },
      { symbol: 'O', massNumber: 17, abundance: 0.04, stable: true },
      { symbol: 'O', massNumber: 18, abundance: 0.20, stable: true },
    ]);
    this._isotopes.set('Cl', [
      { symbol: 'Cl', massNumber: 35, abundance: 75.78, stable: true },
      { symbol: 'Cl', massNumber: 37, abundance: 24.22, stable: true },
    ]);
    this._isotopes.set('Fe', [
      { symbol: 'Fe', massNumber: 54, abundance: 5.845, stable: true },
      { symbol: 'Fe', massNumber: 56, abundance: 91.754, stable: true },
      { symbol: 'Fe', massNumber: 57, abundance: 2.119, stable: true },
      { symbol: 'Fe', massNumber: 58, abundance: 0.282, stable: true },
    ]);
    this._isotopes.set('U', [
      { symbol: 'U', massNumber: 234, abundance: 0.0055, stable: false },
      { symbol: 'U', massNumber: 235, abundance: 0.720, stable: false },
      { symbol: 'U', massNumber: 238, abundance: 99.275, stable: false },
    ]);
    this._isotopes.set('Pb', [
      { symbol: 'Pb', massNumber: 204, abundance: 1.4, stable: true },
      { symbol: 'Pb', massNumber: 206, abundance: 24.1, stable: true },
      { symbol: 'Pb', massNumber: 207, abundance: 22.1, stable: true },
      { symbol: 'Pb', massNumber: 208, abundance: 52.4, stable: true },
    ]);
    this._isotopes.set('Sr', [
      { symbol: 'Sr', massNumber: 84, abundance: 0.56, stable: true },
      { symbol: 'Sr', massNumber: 86, abundance: 9.86, stable: true },
      { symbol: 'Sr', massNumber: 87, abundance: 7.0, stable: true },
      { symbol: 'Sr', massNumber: 88, abundance: 82.58, stable: true },
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

  /** List all element symbols in atomic-number order. */
  allSymbols(): string[] {
    const arr = Array.from(this._byNumber.keys()).sort((a, b) => a - b);
    this._history.push({ method: 'allSymbols', count: arr.length });
    return arr.map((z) => this._byNumber.get(z)!.symbol);
  }

  /** Filter elements by category. */
  byCategory(category: string): Element[] {
    const result: Element[] = [];
    for (const el of this._elements.values()) {
      if (el.category === category) result.push(el);
    }
    this._history.push({ method: 'byCategory', category, count: result.length });
    return result;
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

  /** Resolve electron configuration from Aufbau principle. */
  aufbauConfiguration(z: number): Array<{ subshell: string; electrons: number }> {
    if (z <= 0) return [];
    let remaining = z;
    const result: Array<{ subshell: string; electrons: number }> = [];
    for (const [_n, _l, label] of AUFBAU_ORDER) {
      if (remaining <= 0) break;
      const subshellLetter = label.slice(-1);
      const cap = SUBSHELL_CAPACITY[subshellLetter] ?? 2;
      const filled = Math.min(remaining, cap);
      result.push({ subshell: label, electrons: filled });
      remaining -= filled;
    }
    this._history.push({ method: 'aufbauConfiguration', z, result });
    return result;
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

  /** Block classification (s, p, d, f). */
  block(z: number): Block | null {
    const el = this._byNumber.get(z);
    if (!el) return null;
    if (el.category === 'lanthanide' || el.category === 'actinide') return 'f';
    if (el.category === 'transition') return 'd';
    if (el.group >= 1 && el.group <= 2) return 's';
    if (el.group >= 13 && el.group <= 18) return 'p';
    return null;
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

  /** Covalent radius estimate. */
  covalentRadius(z: number): number {
    const r = this.atomicRadius(z);
    return Math.max(20, r * 0.78);
  }

  /** Van der Waals radius estimate. */
  vanderWaalsRadius(z: number): number {
    const r = this.atomicRadius(z);
    return r * 1.4;
  }

  /** Approximate ionic radius for a given charge. */
  ionicRadius(z: number, charge: number, coordination: number = 6): IonicRadius | null {
    const el = this._byNumber.get(z);
    if (!el) return null;
    const atomicR = this.atomicRadius(z);
    let factor = 1.0;
    if (charge > 0) factor = Math.max(0.3, 1 - 0.15 * charge);
    else if (charge < 0) factor = 1 + 0.2 * Math.abs(charge);
    const coordFactor = coordination >= 8 ? 1.05 : coordination <= 4 ? 0.85 : 1.0;
    const radius = atomicR * factor * coordFactor;
    const ion = `${el.symbol}${charge > 0 ? '+' : ''}${charge < 0 ? '-' : ''}${Math.abs(charge) || ''}`;
    this._history.push({ method: 'ionicRadius', z, charge });
    return { ion, radius, coordination, charge };
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

  /** Successive ionization energies (kJ/mol). */
  successiveIonizationEnergies(z: number, count: number = 5): number[] {
    const first = this.ionizationEnergy(z);
    const result: number[] = [first];
    for (let i = 1; i < count; i++) {
      // 每次电离能大幅增加，特别是越过满壳/半满壳时
      const shellComplete = (i + 1) % 2 === 0;
      const jump = shellComplete ? 4 + i : 2 + i * 0.5;
      result.push(result[i - 1] * jump);
    }
    this._history.push({ method: 'successiveIonizationEnergies', z, count });
    return result;
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

  /** Mulliken electronegativity: (IE + EA) / 2. */
  mullikenElectronegativity(z: number): number {
    const ie = this.ionizationEnergy(z);
    const ea = this.electronAffinity(z);
    const mulliken = (ie + Math.abs(ea)) / 2;
    this._history.push({ method: 'mullikenElectronegativity', z });
    return mulliken;
  }

  /** Allred-Rochow electronegativity: 0.359*Zeff/r² + 0.744. */
  allredRochowElectronegativity(z: number): number {
    const el = this._byNumber.get(z);
    if (!el) return 0;
    const zeff = this.slatersEffectiveNuclearCharge(z).Zeff;
    const r = this.covalentRadius(z) / 100; // convert pm to Å
    if (r === 0) return 0;
    const ar = (0.359 * zeff) / (r * r) + 0.744;
    this._history.push({ method: 'allredRochowElectronegativity', z });
    return ar;
  }

  /** Slater's effective nuclear charge. */
  slatersEffectiveNuclearCharge(z: number): EffectiveNuclearCharge {
    const el = this._byNumber.get(z);
    if (!el) return { Z: z, Zeff: z, shielding: 0, method: 'slater' };
    const config = this.aufbauConfiguration(z);
    const groups: number[][] = [[], [], [], [], []];
    let currentN = -1;
    let groupIdx = -1;
    for (const { subshell, electrons } of config) {
      const n = parseInt(subshell[0], 10);
      const letter = subshell.slice(1);
      if (n !== currentN) {
        groupIdx++;
        currentN = n;
      }
      const idx = letter === 's' || letter === 'p' ? groupIdx : groupIdx;
      if (groups[idx] === undefined) groups[idx] = [];
      groups[idx].push(electrons);
    }
    let shielding = 0;
    for (let i = 0; i < groups.length; i++) {
      if (groups[i].length === 0) continue;
      const nI = i + 1;
      const eInGroup = groups[i].reduce((a, b) => a + b, 0);
      const other = groups[i].reduce((a, b) => a + b, 0) - (groups[i][groups[i].length - 1] ?? 0);
      if (i < groups.length - 1) {
        // 内层电子：nI < nValence
        shielding += 0.85 * other;
        if (i > 0 && nI < currentN - 1) shielding += 1.00 * (groups[i - 1]?.reduce((a, b) => a + b, 0) ?? 0);
      } else {
        // 同层（价层）其他电子
        shielding += 0.35 * Math.max(0, eInGroup - 1);
      }
    }
    shielding = Math.min(z - 1, Math.max(0, shielding));
    const zeff = z - shielding;
    this._history.push({ method: 'slatersEffectiveNuclearCharge', z, zeff });
    return { Z: z, Zeff: zeff, shielding, method: 'slater' };
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

  /** Diagonal relationship check (e.g. Li-Mg, Be-Al, B-Si). */
  diagonalRelationship(z1: number, z2: number): { related: boolean; reason: string } {
    const pairs: Array<[number, number, string]> = [
      [3, 12, 'Li-Mg: similar small ionic radii and covalent character'],
      [4, 13, 'Be-Al: amphoteric oxides, covalent halides'],
      [5, 14, 'B-Si: metalloids, acidic oxides'],
      [6, 15, 'C-P: similar electronegativity and nonmetallic character'],
      [7, 16, 'N-S: multiple bonding, polyatomic ions'],
      [8, 17, 'O-Cl: high electronegativity'],
    ];
    for (const [a, b, reason] of pairs) {
      if ((z1 === a && z2 === b) || (z1 === b && z2 === a)) {
        this._history.push({ method: 'diagonalRelationship', z1, z2, related: true });
        return { related: true, reason };
      }
    }
    this._history.push({ method: 'diagonalRelationship', z1, z2, related: false });
    return { related: false, reason: 'no known diagonal relationship' };
  }

  /** Inert pair effect check (heavy p-block elements). */
  inertPairEffect(z: number): { present: boolean; explanation: string } {
    const el = this._byNumber.get(z);
    if (!el) return { present: false, explanation: 'unknown element' };
    const inertPairElements = [31, 32, 49, 50, 51, 81, 82, 83, 84, 85];
    const present = inertPairElements.includes(z);
    const explanation = present
      ? `${el.symbol} exhibits inert pair effect: ns² electrons resist bonding`
      : `${el.symbol} does not show significant inert pair effect`;
    this._history.push({ method: 'inertPairEffect', z, present });
    return { present, explanation };
  }

  /** Lanthanide contraction estimate (period 6 transition metals). */
  lanthanideContraction(z: number): { contraction: number; explanation: string } {
    const el = this._byNumber.get(z);
    if (!el) return { contraction: 0, explanation: 'unknown' };
    const isHfLike = z >= 72 && z <= 78;
    const contraction = isHfLike ? -15 : 0; // pm
    const explanation = isHfLike
      ? `${el.symbol} contracted due to poor f-electron shielding`
      : 'not significantly affected';
    this._history.push({ method: 'lanthanideContraction', z });
    return { contraction, explanation };
  }

  /** List known isotopes for an element symbol. */
  isotope(symbol: string): Isotope[] {
    const arr = this._isotopes.get(symbol) ?? [];
    this._history.push({ method: 'isotope', symbol });
    return [...arr];
  }

  /** Compute average atomic mass from isotopic abundances. */
  averageAtomicMass(symbol: string): number {
    const el = this._elements.get(symbol);
    if (!el) return 0;
    const isotopes = this._isotopes.get(symbol) ?? [];
    if (isotopes.length === 0) return el.atomicMass;
    let sum = 0;
    let totalAbundance = 0;
    for (const iso of isotopes) {
      sum += iso.massNumber * iso.abundance;
      totalAbundance += iso.abundance;
    }
    if (totalAbundance === 0) return el.atomicMass;
    this._history.push({ method: 'averageAtomicMass', symbol });
    return sum / totalAbundance;
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

  /** Comprehensive periodic comparison across a period. */
  comparePeriodTrends(period: number): PeriodicComparison[] {
    const els = (this._periods.get(period) ?? []).slice().sort((a, b) => a.atomicNumber - b.atomicNumber);
    const results: PeriodicComparison[] = [];
    if (els.length === 0) return results;
    const enValues = els.map(el => ({ symbol: el.symbol, value: el.electronegativity }));
    const radValues = els.map(el => ({ symbol: el.symbol, value: this.atomicRadius(el.atomicNumber) }));
    const ieValues = els.map(el => ({ symbol: el.symbol, value: this.ionizationEnergy(el.atomicNumber) }));
    results.push({
      property: 'electronegativity',
      values: enValues,
      trend: 'increasing',
      explanation: 'electronegativity generally increases across a period',
    });
    results.push({
      property: 'atomic radius',
      values: radValues,
      trend: 'decreasing',
      explanation: 'atomic radius decreases across a period due to increasing Z_eff',
    });
    results.push({
      property: 'ionization energy',
      values: ieValues,
      trend: 'increasing',
      explanation: 'ionization energy increases across a period with local dips',
    });
    this._history.push({ method: 'comparePeriodTrends', period });
    return results;
  }

  /** Comprehensive periodic comparison down a group. */
  compareGroupTrends(group: number): PeriodicComparison[] {
    const els = (this._groups.get(group) ?? []).slice().sort((a, b) => a.atomicNumber - b.atomicNumber);
    const results: PeriodicComparison[] = [];
    if (els.length === 0) return results;
    const enValues = els.map(el => ({ symbol: el.symbol, value: el.electronegativity }));
    const radValues = els.map(el => ({ symbol: el.symbol, value: this.atomicRadius(el.atomicNumber) }));
    const ieValues = els.map(el => ({ symbol: el.symbol, value: this.ionizationEnergy(el.atomicNumber) }));
    results.push({
      property: 'electronegativity',
      values: enValues,
      trend: 'decreasing',
      explanation: 'electronegativity generally decreases down a group',
    });
    results.push({
      property: 'atomic radius',
      values: radValues,
      trend: 'increasing',
      explanation: 'atomic radius increases down a group due to additional shells',
    });
    results.push({
      property: 'ionization energy',
      values: ieValues,
      trend: 'decreasing',
      explanation: 'ionization energy decreases down a group due to shielding',
    });
    this._history.push({ method: 'compareGroupTrends', group });
    return results;
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

  /** Quantum numbers for the last filled electron. */
  quantumNumbers(z: number): QuantumNumbers | null {
    const config = this.aufbauConfiguration(z);
    if (config.length === 0) return null;
    const last = config[config.length - 1];
    const n = parseInt(last.subshell[0], 10);
    const subshellLetter = last.subshell.slice(1);
    const lMap: Record<string, number> = { s: 0, p: 1, d: 2, f: 3 };
    const l = lMap[subshellLetter] ?? 0;
    const m = 0;
    const s = last.electrons % 2 === 1 ? 0.5 : -0.5;
    this._history.push({ method: 'quantumNumbers', z });
    return { n, l, m, s, subshell: last.subshell };
  }

  /** Maximum number of orbitals per shell. */
  orbitalCount(n: number): number {
    return n * n;
  }

  /** Maximum number of electrons per shell. */
  electronCapacity(n: number): number {
    return 2 * n * n;
  }

  /** Predict common oxidation states for an element. */
  commonOxidationStates(z: number): number[] {
    const el = this._byNumber.get(z);
    if (!el) return [0];
    this._history.push({ method: 'commonOxidationStates', z });
    return [...el.oxidationStates];
  }

  /** Most stable oxidation state. */
  mostStableOxidationState(z: number): number {
    const el = this._byNumber.get(z);
    if (!el) return 0;
    if (el.oxidationStates.length === 0) return 0;
    // For groups 1-2, the most stable is the group number
    if (el.group === 1) return 1;
    if (el.group === 2) return 2;
    // For groups 13-18, prefer lower oxidation state for heavier elements (inert pair)
    if (el.group >= 13 && el.group <= 16 && el.period >= 5) {
      return el.group - 10;
    }
    // For p-block non-heavy, prefer highest oxidation state
    if (el.group >= 13 && el.group <= 17) {
      return Math.max(...el.oxidationStates.filter(s => s > 0));
    }
    return el.oxidationStates[0];
  }

  /** Density estimate (g/cm³) from atomic mass and radius. */
  densityEstimate(z: number): number {
    const el = this._byNumber.get(z);
    if (!el) return 0;
    const r = this.atomicRadius(z) * 1e-12; // m
    const volume = (4 / 3) * Math.PI * r * r * r; // m³
    const mass = el.atomicMass * 1.66054e-27; // kg
    const density = mass / volume / 1000; // g/cm³
    this._history.push({ method: 'densityEstimate', z, density });
    return Math.max(0.01, density);
  }

  /** Estimate melting point (K) from period and group trends. */
  meltingPointEstimate(z: number): number {
    const el = this._byNumber.get(z);
    if (!el) return 0;
    let base = 300;
    if (el.category === 'transition') base = 1500 + (el.period - 4) * 200;
    else if (el.category === 'noble-gas') base = 1 + el.period * 5;
    else if (el.category === 'halogen') base = 200 - el.period * 50;
    else if (el.category === 'alkali-metal') base = 350 - el.period * 50;
    else if (el.category === 'metalloid') base = 800 + el.period * 50;
    else base = 200 + el.period * 50;
    this._history.push({ method: 'meltingPointEstimate', z, base });
    return Math.max(1, base);
  }

  /** Estimate boiling point (K). */
  boilingPointEstimate(z: number): number {
    const melting = this.meltingPointEstimate(z);
    const bp = melting * 1.4 + 50;
    this._history.push({ method: 'boilingPointEstimate', z });
    return bp;
  }

  /** Magnetic susceptibility estimate (paramagnetic / diamagnetic). */
  magneticProperty(z: number): 'paramagnetic' | 'diamagnetic' | 'ferromagnetic' {
    const el = this._byNumber.get(z);
    if (!el) return 'diamagnetic';
    const ferro = [26, 27, 28]; // Fe, Co, Ni
    if (ferro.includes(z)) return 'ferromagnetic';
    const config = this.aufbauConfiguration(z);
    const last = config[config.length - 1];
    const cap = SUBSHELL_CAPACITY[last.subshell.slice(-1)] ?? 2;
    const unpaired = last.electrons % 2 === 1 || (last.electrons < cap && last.electrons > 0 && cap - last.electrons >= 1);
    return unpaired ? 'paramagnetic' : 'diamagnetic';
  }

  /** Electron binding energy (K-shell) estimate (eV). */
  kShellBindingEnergy(z: number): number {
    if (z <= 0) return 0;
    // Moseley-like: E ∝ (Z - 1)²
    const E = 13.6 * Math.pow(z - 1, 2);
    this._history.push({ method: 'kShellBindingEnergy', z, E });
    return E;
  }

  /** Moseley's law: √ν = a(Z - b) */
  moseleyLaw(z: number, kShell: number = 1): number {
    if (z <= 0) return 0;
    const a = 2.47e15;
    const b = 1;
    void kShell;
    const nu = Math.pow(a * (z - b), 2);
    this._history.push({ method: 'moseleyLaw', z, nu });
    return nu;
  }

  /** Hydration enthalpy estimate (kJ/mol) for an ion. */
  hydrationEnthalpy(z: number, charge: number): number {
    const r = this.ionicRadius(z, charge)?.radius ?? 100;
    if (r === 0) return 0;
    const enthalpy = -70000 * (charge * charge) / r;
    this._history.push({ method: 'hydrationEnthalpy', z, charge, enthalpy });
    return enthalpy;
  }

  /** Lattice energy estimate (Born-Landé, kJ/mol). */
  latticeEnergy(z1: number, z2: number, charge1: number, charge2: number, d: number): number {
    if (d <= 0) return 0;
    const z1c = z1 * charge1;
    const z2c = z2 * charge2;
    const U = -1.2e5 * (z1c * z2c) / d;
    this._history.push({ method: 'latticeEnergy', U });
    return U;
  }

  /** Polarizability estimate (Å³). */
  polarizability(z: number): number {
    const r = this.atomicRadius(z) / 100; // Å
    return Math.pow(r, 3) * 0.4;
  }

  /** Periodic law explanation. */
  periodicLaw(): string {
    return 'Properties of elements are periodic functions of their atomic numbers, ' +
      'arising from the periodic filling of electron shells and subshells.';
  }

  /** Mendeleev-style classification. */
  mendeleevClassification(z: number): string {
    const el = this._byNumber.get(z);
    if (!el) return 'unknown';
    if (el.category === 'alkali-metal' || el.category === 'alkaline-earth') return 'Group I/II metal';
    if (el.category === 'transition') return 'transition metal';
    if (el.category === 'post-transition') return 'post-transition metal';
    if (el.category === 'metalloid') return 'metalloid';
    if (el.category === 'halogen') return 'halogen';
    if (el.category === 'noble-gas') return 'noble gas';
    if (el.category === 'lanthanide' || el.category === 'actinide') return 'inner transition metal';
    return 'nonmetal';
  }

  /** Compute effective atomic number for shielding in compounds. */
  effectiveAtomicNumber(z: number, bondingElectrons: number): number {
    return z - bondingElectrons;
  }

  /** Find elements with similar electronegativity (within tolerance). */
  similarElectronegativity(z: number, tolerance: number = 0.3): Element[] {
    const el = this._byNumber.get(z);
    if (!el) return [];
    const target = el.electronegativity;
    const result: Element[] = [];
    for (const e of this._elements.values()) {
      if (e.atomicNumber === z) continue;
      if (Math.abs(e.electronegativity - target) <= tolerance) {
        result.push(e);
      }
    }
    this._history.push({ method: 'similarElectronegativity', z, count: result.length });
    return result;
  }

  /** Compute mass number estimate from isotopic distribution. */
  mostCommonIsotopeMassNumber(symbol: string): number {
    const isotopes = this._isotopes.get(symbol) ?? [];
    if (isotopes.length === 0) {
      const el = this._elements.get(symbol);
      return el ? Math.round(el.atomicMass) : 0;
    }
    let best = isotopes[0];
    for (const iso of isotopes) {
      if (iso.abundance > best.abundance) best = iso;
    }
    return best.massNumber;
  }

  /** Determine if element is radioactive. */
  isRadioactive(z: number): boolean {
    const radioactive = [43, 61, 84, 85, 86, 87, 88, 89, 90, 91, 92];
    return radioactive.includes(z) || z > 92;
  }

  /** Determine if element is a transition metal. */
  isTransitionMetal(z: number): boolean {
    const el = this._byNumber.get(z);
    return el?.category === 'transition';
  }

  /** Determine if element is a noble gas. */
  isNobleGas(z: number): boolean {
    const el = this._byNumber.get(z);
    return el?.category === 'noble-gas';
  }

  /** Determine if element is a halogen. */
  isHalogen(z: number): boolean {
    const el = this._byNumber.get(z);
    return el?.category === 'halogen';
  }

  /** Determine if element is an alkali metal. */
  isAlkaliMetal(z: number): boolean {
    const el = this._byNumber.get(z);
    return el?.category === 'alkali-metal';
  }

  /** Determine if element is rare earth. */
  isRareEarth(z: number): boolean {
    const el = this._byNumber.get(z);
    return el?.category === 'lanthanide' || el?.category === 'actinide';
  }

  /** Maximum oxidation state by group. */
  maxOxidationState(z: number): number {
    const el = this._byNumber.get(z);
    if (!el) return 0;
    return Math.max(...el.oxidationStates);
  }

  /** Minimum oxidation state by group. */
  minOxidationState(z: number): number {
    const el = this._byNumber.get(z);
    if (!el) return 0;
    return Math.min(...el.oxidationStates);
  }

  /** Find group from valence electrons. */
  groupFromValence(valence: number, block: Block): number {
    if (block === 's') return valence;
    if (block === 'p') return valence + 10;
    return -1;
  }

  /** Period from shell count. */
  periodFromShells(shells: number): number {
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

  /** Static reference to atomic mass lookup. */
  public static readonly ATOMIC_MASS = ATOMIC_MASS_LOOKUP;
  public static readonly SHELL_CAPACITIES = SHELL_CAPACITIES;
  public static readonly AUFBAU_ORDER = AUFBAU_ORDER;
}
