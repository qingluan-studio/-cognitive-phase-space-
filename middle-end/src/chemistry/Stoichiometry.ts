import { DataPacket, PacketMeta } from '../shared/types';

/** Mole descriptor. 摩尔描述 */
export interface Mole {
  mass: number;
  molarMass: number;
  particles: number;
}

/** Solution descriptor. 溶液描述 */
export interface Solution {
  concentration: number;
  volume: number;
  solute: string;
}

/** Limiting reagent descriptor. 限量试剂描述 */
export interface LimitingReagent {
  reagent: string;
  moles: number;
  excess: number;
  product: number;
}

/** Colligative property result. 依数性结果 */
export interface ColligativeProperty {
  property: 'boiling-point-elevation' | 'freezing-point-depression' | 'osmotic-pressure' | 'vapor-pressure-lowering';
  value: number;
  unit: string;
  soluteParticles: number;
}

/** Gas stoichiometry result. 气体化学计量结果 */
export interface GasStoichiometry {
  moles: number;
  volume: number;
  pressure: number;
  temperature: number;
  density: number;
}

/** Empirical formula analysis result. 实验式分析结果 */
export interface FormulaAnalysis {
  empirical: string;
  molecular: string;
  molarMass: number;
  empiricalMass: number;
  multiplier: number;
  composition: Record<string, number>;
}

/** Combustion analysis result. 燃烧分析结果 */
export interface CombustionAnalysis {
  carbonMass: number;
  hydrogenMass: number;
  oxygenMass: number;
  empiricalFormula: string;
  elements: Record<string, number>;
}

/** Hydrate analysis result. 水合物分析结果 */
export interface HydrateAnalysis {
  formula: string;
  anhydrousMass: number;
  waterMass: number;
  waterRatio: number;
  waterOfHydration: number;
}

/** Concentration conversion result. 浓度转换结果 */
export interface ConcentrationConversion {
  molarity: number;
  molality: number;
  moleFraction: number;
  massFraction: number;
  percent: number;
  ppm: number;
  ppb: number;
}

/** Reaction stoichiometry analysis. 反应化学计量分析 */
export interface ReactionStoichiometry {
  reactants: Array<{ formula: string; moles: number; mass: number }>;
  products: Array<{ formula: string; moles: number; mass: number }>;
  limitingReagent: string;
  excessReagents: Array<{ formula: string; excess: number }>;
  theoreticalYield: number;
}

/** Gravimetric analysis result. 重量分析结果 */
export interface GravimetricAnalysis {
  analyteMass: number;
  precipitateMass: number;
  gravimetricFactor: number;
  purity: number;
}

/** Volumetric analysis result. 容量分析结果 */
export interface VolumetricAnalysis {
  titrantVolume: number;
  titrantMolarity: number;
  analyteMoles: number;
  analyteMass: number;
  endpoint: string;
}

const AVOGADRO = 6.022e23; // mol⁻¹
const R_GAS = 8.314; // J/(mol·K)
const R_LATM = 0.08206; // L·atm/(mol·K)
const KELVIN_OFFSET = 273.15;
const STANDARD_PRESSURE = 1.0; // atm
const STANDARD_TEMP = 273.15; // K
const MOLAR_VOLUME_STP = 22.414; // L/mol at STP (0°C, 1 atm)

/** Atomic mass lookup table (g/mol). 原子量查找表 */
const ATOMIC_MASSES: Record<string, number> = {
  H: 1.008, He: 4.003, Li: 6.941, Be: 9.012, B: 10.81, C: 12.011,
  N: 14.007, O: 15.999, F: 18.998, Ne: 20.180, Na: 22.990, Mg: 24.305,
  Al: 26.982, Si: 28.086, P: 30.974, S: 32.065, Cl: 35.453, Ar: 39.948,
  K: 39.098, Ca: 40.078, Sc: 44.956, Ti: 47.867, V: 50.942, Cr: 51.996,
  Mn: 54.938, Fe: 55.845, Co: 58.933, Ni: 58.693, Cu: 63.546, Zn: 65.38,
  Ga: 69.723, Ge: 72.64, As: 74.922, Se: 78.96, Br: 79.904, Kr: 83.798,
  Rb: 85.468, Sr: 87.62, Y: 88.906, Zr: 91.224, Nb: 92.906, Mo: 95.96,
  Tc: 98, Ru: 101.07, Rh: 102.91, Pd: 106.42, Ag: 107.87, Cd: 112.41,
  In: 114.82, Sn: 118.71, Sb: 121.76, Te: 127.60, I: 126.90, Xe: 131.29,
  Cs: 132.91, Ba: 137.33, La: 138.91, Ce: 140.12, Pr: 140.91, Nd: 144.24,
  Pm: 145, Sm: 150.36, Eu: 151.96, Gd: 157.25, Tb: 158.93, Dy: 162.50,
  Ho: 164.93, Er: 167.26, Tm: 168.93, Yb: 173.05, Lu: 174.97, Hf: 178.49,
  Ta: 180.95, W: 183.84, Re: 186.21, Os: 190.23, Ir: 192.22, Pt: 195.08,
  Au: 196.97, Hg: 200.59, Tl: 204.38, Pb: 207.2, Bi: 208.98, Po: 209,
  At: 210, Rn: 222, Fr: 223, Ra: 226, Ac: 227, Th: 232.04, Pa: 231.04,
  U: 238.03,
};

/** Common Kb/Kf constants (°C·kg/mol). 常见沸点升高/凝固点降低常数 */
const CRYOSCOPIC_CONSTANTS: Record<string, { Kf: number; Kb: number; bp: number; mp: number }> = {
  water: { Kf: 1.86, Kb: 0.512, bp: 100, mp: 0 },
  benzene: { Kf: 5.12, Kb: 2.53, bp: 80.1, mp: 5.5 },
  camphor: { Kf: 40, Kb: 5.95, bp: 207.4, mp: 179.8 },
  naphthalene: { Kf: 6.94, Kb: 5.8, bp: 218, mp: 80.3 },
  cyclohexane: { Kf: 20, Kb: 2.79, bp: 80.7, mp: 6.5 },
  aceticAcid: { Kf: 3.9, Kb: 3.07, bp: 118.1, mp: 16.6 },
  chloroform: { Kf: 4.9, Kb: 3.63, bp: 61.2, mp: -63.5 },
};

/** Common compound molar masses cache (g/mol). 常见化合物摩尔质量缓存 */
const COMPOUND_MOLAR_MASSES: Record<string, number> = {
  'H2O': 18.015,
  'CO2': 44.01,
  'NaCl': 58.44,
  'HCl': 36.46,
  'NaOH': 40.00,
  'H2SO4': 98.08,
  'HNO3': 63.01,
  'NH3': 17.03,
  'CH4': 16.04,
  'C2H6': 30.07,
  'C2H4': 28.05,
  'C2H2': 26.04,
  'C6H12O6': 180.16,
  'C12H22O11': 342.30,
  'CaCO3': 100.09,
  'CaO': 56.08,
  'Na2CO3': 105.99,
  'NaHCO3': 84.01,
  'KOH': 56.11,
  'KMnO4': 158.04,
  'KCl': 74.55,
  'AgNO3': 169.87,
  'BaCl2': 208.23,
  'CuSO4': 159.61,
  'CuSO4.5H2O': 249.69,
  'FeCl3': 162.20,
  'Fe2O3': 159.69,
  'Al2O3': 101.96,
  'MgSO4': 120.37,
  'MgSO4.7H2O': 246.48,
};

/** Parse a chemical formula and return element counts. 解析化学式返回元素计数 */
function parseFormula(formula: string): Record<string, number> {
  const counts: Record<string, number> = {};
  // Handle hydrates like CuSO4.5H2O
  const parts = formula.split('.');
  for (const part of parts) {
    const hydrateMatch = part.match(/^(\d+)(.*)$/);
    let multiplier = 1;
    let actualPart = part;
    if (hydrateMatch) {
      multiplier = parseInt(hydrateMatch[1], 10);
      actualPart = hydrateMatch[2];
    }
    const matches = actualPart.match(/([A-Z][a-z]?)(\d*)/g) ?? [];
    for (const m of matches) {
      const mm = m.match(/([A-Z][a-z]?)(\d*)/);
      if (!mm) continue;
      const element = mm[1];
      const n = mm[2] ? parseInt(mm[2], 10) : 1;
      counts[element] = (counts[element] ?? 0) + n * multiplier;
    }
  }
  return counts;
}

/** Compute molar mass from formula. 从化学式计算摩尔质量 */
function computeMolarMass(formula: string): number {
  const counts = parseFormula(formula);
  let mass = 0;
  for (const [el, n] of Object.entries(counts)) {
    mass += (ATOMIC_MASSES[el] ?? 0) * n;
  }
  return mass;
}

/** Greatest common divisor. 最大公约数 */
function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  return b === 0 ? a : gcd(b, a % b);
}

/** Mole stoichiometry calculations. 摩尔化学计量计算 */
export class Stoichiometry {
  private _moles: Mole[] = [];
  private _solutions: Solution[] = [];
  private _analyses: Array<{ type: string; result: unknown }> = [];
  private _history: unknown[] = [];
  private _counter = 0;

  /** Convert grams to moles. 克转摩尔 */
  toMoles(grams: number, molarMass: number): number {
    if (molarMass <= 0) return 0;
    const moles = grams / molarMass;
    this._history.push({ method: 'toMoles', grams, moles });
    return moles;
  }

  /** Convert moles to grams. 摩尔转克 */
  toGrams(moles: number, molarMass: number): number {
    const grams = moles * molarMass;
    this._history.push({ method: 'toGrams', moles, grams });
    return grams;
  }

  /** Convert moles to particles. 摩尔转粒子数 */
  toParticles(moles: number): number {
    const particles = moles * AVOGADRO;
    this._history.push({ method: 'toParticles', moles });
    return particles;
  }

  /** Convert particles to moles. 粒子数转摩尔 */
  fromParticles(particles: number): number {
    const moles = particles / AVOGADRO;
    this._history.push({ method: 'fromParticles', particles });
    return moles;
  }

  /** Compute molar mass from a chemical formula. 由化学式计算摩尔质量 */
  molarMassOf(formula: string): number {
    // Check cache first
    if (COMPOUND_MOLAR_MASSES[formula]) {
      this._history.push({ method: 'molarMassOf', formula, cached: true });
      return COMPOUND_MOLAR_MASSES[formula];
    }
    const mass = computeMolarMass(formula);
    this._history.push({ method: 'molarMassOf', formula, mass });
    return mass;
  }

  /** Get atomic mass of an element. 获取元素原子量 */
  atomicMass(element: string): number {
    const mass = ATOMIC_MASSES[element] ?? 0;
    this._history.push({ method: 'atomicMass', element });
    return mass;
  }

  /** Parse a chemical formula and return element counts. 解析化学式返回元素计数 */
  parseFormula(formula: string): Record<string, number> {
    const counts = parseFormula(formula);
    this._history.push({ method: 'parseFormula', formula });
    return counts;
  }

  /** Count atoms in a formula. 计算化学式中的原子总数 */
  atomCount(formula: string): number {
    const counts = parseFormula(formula);
    let total = 0;
    for (const n of Object.values(counts)) total += n;
    this._history.push({ method: 'atomCount', formula, total });
    return total;
  }

  /** Molarity = moles / liters. 摩尔浓度 */
  molarity(moles: number, volume: number): number {
    if (volume <= 0) return 0;
    const M = moles / volume;
    this._history.push({ method: 'molarity', moles, volume });
    return M;
  }

  /** Molality = moles / kg solvent. 质量摩尔浓度 */
  molality(moles: number, kg: number): number {
    if (kg <= 0) return 0;
    const m = moles / kg;
    this._history.push({ method: 'molality', moles, kg });
    return m;
  }

  /** Normality = equivalents / liters. 当量浓度 */
  normality(equivalents: number, volume: number): number {
    if (volume <= 0) return 0;
    const N = equivalents / volume;
    this._history.push({ method: 'normality', N });
    return N;
  }

  /** Convert molarity to normality given n-factor. 由摩尔浓度和 n 因子计算当量浓度 */
  molarityToNormality(M: number, nFactor: number): number {
    const N = M * nFactor;
    this._history.push({ method: 'molarityToNormality', N });
    return N;
  }

  /** Mole fraction of a component in a mixture. 摩尔分数 */
  moleFraction(component: number, total: number): number {
    if (total <= 0) return 0;
    const x = component / total;
    this._history.push({ method: 'moleFraction' });
    return x;
  }

  /** Mole fraction from moles array. 由摩尔数数组计算摩尔分数 */
  moleFractionFromMoles(moles: number[], index: number): number {
    const total = moles.reduce((s, m) => s + m, 0);
    if (total <= 0) return 0;
    const x = moles[index] / total;
    this._history.push({ method: 'moleFractionFromMoles', x });
    return x;
  }

  /** Mass fraction of a component. 质量分数 */
  massFraction(componentMass: number, totalMass: number): number {
    if (totalMass <= 0) return 0;
    const w = componentMass / totalMass;
    this._history.push({ method: 'massFraction', w });
    return w;
  }

  /** Mass percent from masses. 质量百分数 */
  massPercent(componentMass: number, totalMass: number): number {
    return this.massFraction(componentMass, totalMass) * 100;
  }

  /** Parts per million (ppm) from mass fraction. 质量分数转 ppm */
  toPPM(massFractionValue: number): number {
    const ppm = massFractionValue * 1e6;
    this._history.push({ method: 'toPPM', ppm });
    return ppm;
  }

  /** Parts per billion (ppb) from mass fraction. 质量分数转 ppb */
  toPPB(massFractionValue: number): number {
    const ppb = massFractionValue * 1e9;
    this._history.push({ method: 'toPPB', ppb });
    return ppb;
  }

  /** ppm from solute mass and total mass. 由溶质质量和总质量计算 ppm */
  ppmFromMasses(soluteMass: number, totalMass: number): number {
    if (totalMass <= 0) return 0;
    return (soluteMass / totalMass) * 1e6;
  }

  /** ppb from solute mass and total mass. 由溶质质量和总质量计算 ppb */
  ppbFromMasses(soluteMass: number, totalMass: number): number {
    if (totalMass <= 0) return 0;
    return (soluteMass / totalMass) * 1e9;
  }

  /** Concentration in g/L. 由溶质质量和溶液体积计算 g/L */
  gramsPerLiter(soluteMass: number, volume: number): number {
    if (volume <= 0) return 0;
    return soluteMass / volume;
  }

  /** Dilution equation M1*V1 = M2*V2; returns new V2 given others. 稀释方程 */
  dilution(M1: number, V1: number, M2: number): number {
    if (M2 <= 0) return 0;
    const V2 = (M1 * V1) / M2;
    this._history.push({ method: 'dilution', M1, V1, M2, V2 });
    return V2;
  }

  /** Dilution with explicit final volume. 已知初始和最终体积的稀释 */
  dilutionMixed(M1: number, V1: number, V2: number): number {
    if (V2 <= 0) return 0;
    const M2 = (M1 * V1) / V2;
    this._history.push({ method: 'dilutionMixed', M2 });
    return M2;
  }

  /** Serial dilution factor. 系列稀释 */
  serialDilution(initialConc: number, dilutionFactor: number, steps: number): number {
    let conc = initialConc;
    for (let i = 0; i < steps; i++) conc /= dilutionFactor;
    this._history.push({ method: 'serialDilution', final: conc });
    return conc;
  }

  /** Identify limiting reagent. 限量试剂判定 */
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

  /** Limiting reagent with detailed stoichiometry. 详细化学计量的限量试剂判定 */
  limitingReagentDetailed(
    reactants: Array<{ formula: string; mass: number; molarMass: number }>,
    ratio: number[],
  ): ReactionStoichiometry {
    const reactantMoles = reactants.map(r => r.mass / r.molarMass);
    let minIdx = 0;
    let minVal = Infinity;
    for (let i = 0; i < reactants.length; i++) {
      const eff = reactantMoles[i] / (ratio[i] ?? 1);
      if (eff < minVal) {
        minVal = eff;
        minIdx = i;
      }
    }
    const reactantData = reactants.map((r, i) => ({
      formula: r.formula,
      moles: reactantMoles[i],
      mass: r.mass,
    }));
    const excessReagents = reactants.map((r, i) => {
      if (i === minIdx) return null;
      const excess = reactantMoles[i] - minVal * (ratio[i] ?? 1);
      return { formula: r.formula, excess: Math.max(0, excess * r.molarMass) };
    }).filter(Boolean) as Array<{ formula: string; excess: number }>;
    const result: ReactionStoichiometry = {
      reactants: reactantData,
      products: [],
      limitingReagent: reactants[minIdx].formula,
      excessReagents,
      theoreticalYield: minVal,
    };
    this._history.push({ method: 'limitingReagentDetailed', idx: minIdx });
    return result;
  }

  /** Theoretical yield from a balanced reaction. 理论产量 */
  theoreticalYield(reaction: { products: Array<{ moles: number; molarMass: number }> }): number {
    if (reaction.products.length === 0) return 0;
    const p = reaction.products[0];
    const yieldGrams = p.moles * p.molarMass;
    this._history.push({ method: 'theoreticalYield', yield: yieldGrams });
    return yieldGrams;
  }

  /** Theoretical yield from limiting reagent. 由限量试剂计算理论产量 */
  theoreticalYieldFromLimiting(
    limitingReagentMoles: number,
    productMolarMass: number,
    stoichiometricRatio: number = 1,
  ): number {
    const yieldGrams = limitingReagentMoles * stoichiometricRatio * productMolarMass;
    this._history.push({ method: 'theoreticalYieldFromLimiting', yieldGrams });
    return yieldGrams;
  }

  /** Percent yield = actual / theoretical * 100. 产率百分数 */
  percentYield(actual: number, theoretical: number): number {
    if (theoretical <= 0) return 0;
    const pct = (actual / theoretical) * 100;
    this._history.push({ method: 'percentYield', pct });
    return pct;
  }

  /** Multi-step synthesis overall yield. 多步合成的总产率 */
  multiStepYield(stepYields: number[]): number {
    let overall = 1;
    for (const y of stepYields) overall *= y / 100;
    const result = overall * 100;
    this._history.push({ method: 'multiStepYield', result });
    return result;
  }

  /** Derive empirical formula from a token like 'C6H12O6'. 实验式 */
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
    const overall = values.reduce((acc, v) => gcd(acc, v), values[0] ?? 1);
    const parts: string[] = [];
    for (const [el, n] of Object.entries(counts)) {
      const d = n / overall;
      parts.push(d === 1 ? el : `${el}${d}`);
    }
    this._history.push({ method: 'empirical', formula });
    return parts.join('');
  }

  /** Empirical formula from element masses. 由元素质量求实验式 */
  empiricalFromMasses(elements: Array<{ symbol: string; mass: number; atomicMass: number }>): string {
    const molesArr = elements.map(e => e.mass / e.atomicMass);
    const minMoles = Math.min(...molesArr);
    const ratios = molesArr.map(m => m / minMoles);
    // Round to nearest integer
    const intRatios = ratios.map(r => Math.round(r));
    const parts: string[] = [];
    for (let i = 0; i < elements.length; i++) {
      parts.push(intRatios[i] === 1 ? elements[i].symbol : `${elements[i].symbol}${intRatios[i]}`);
    }
    this._history.push({ method: 'empiricalFromMasses' });
    return parts.join('');
  }

  /** Derive molecular formula from empirical and molar mass. 分子式 */
  molecular(empirical: string, molarMass: number): string {
    const matches = empirical.match(/([A-Z][a-z]?)(\d*)/g) ?? [];
    let empiricalMass = 0;
    for (const m of matches) {
      const mm = m.match(/([A-Z][a-z]?)(\d*)/);
      if (!mm) continue;
      const element = mm[1];
      const n = mm[2] ? parseInt(mm[2], 10) : 1;
      empiricalMass += (ATOMIC_MASSES[element] ?? 0) * n;
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

  /** Complete formula analysis. 完整化学式分析 */
  formulaAnalysis(formula: string, molarMass?: number): FormulaAnalysis {
    const empirical = this.empirical(formula);
    const empiricalMass = this.molarMassOf(empirical);
    const actualMolarMass = molarMass ?? this.molarMassOf(formula);
    const multiplier = Math.round(actualMolarMass / empiricalMass);
    const molecular = molarMass ? this.molecular(empirical, molarMass) : formula;
    const composition = this.percentComposition(formula);
    const result: FormulaAnalysis = {
      empirical,
      molecular,
      molarMass: actualMolarMass,
      empiricalMass,
      multiplier,
      composition,
    };
    this._analyses.push({ type: 'formulaAnalysis', result });
    this._history.push({ method: 'formulaAnalysis', formula });
    return result;
  }

  /** Percent composition of each element in a compound. 各元素质量百分数 */
  percentComposition(compound: string): Record<string, number> {
    const counts = parseFormula(compound);
    let total = 0;
    for (const [el, n] of Object.entries(counts)) {
      total += (ATOMIC_MASSES[el] ?? 0) * n;
    }
    const result: Record<string, number> = {};
    for (const [el, n] of Object.entries(counts)) {
      result[el] = ((ATOMIC_MASSES[el] ?? 0) * n / total) * 100;
    }
    this._history.push({ method: 'percentComposition', compound });
    return result;
  }

  /** Mass of an element in a compound of given mass. 给定质量的化合物中某元素的质量 */
  massOfElementInCompound(compound: string, element: string, compoundMass: number): number {
    const composition = this.percentComposition(compound);
    const pct = composition[element] ?? 0;
    const mass = compoundMass * pct / 100;
    this._history.push({ method: 'massOfElementInCompound', element, mass });
    return mass;
  }

  /** Combustion analysis: determine empirical formula from CO2 and H2O. 燃烧分析 */
  combustionAnalysis(co2Mass: number, h2oMass: number, sampleMass: number): CombustionAnalysis {
    const cMoles = co2Mass / 44.01; // CO2 → C
    const hMoles = (h2oMass / 18.015) * 2; // H2O → 2H
    const cMass = cMoles * 12.011;
    const hMass = hMoles * 1.008;
    const oMass = Math.max(0, sampleMass - cMass - hMass);
    const oMoles = oMass / 15.999;
    // Find simplest whole number ratio
    const minMoles = Math.min(cMoles, hMoles, oMoles > 0 ? oMoles : Infinity);
    const cRatio = Math.round(cMoles / minMoles);
    const hRatio = Math.round(hMoles / minMoles);
    const oRatio = oMoles > 0 ? Math.round(oMoles / minMoles) : 0;
    const empiricalParts: string[] = [];
    if (cRatio > 0) empiricalParts.push(cRatio === 1 ? 'C' : `C${cRatio}`);
    if (hRatio > 0) empiricalParts.push(hRatio === 1 ? 'H' : `H${hRatio}`);
    if (oRatio > 0) empiricalParts.push(oRatio === 1 ? 'O' : `O${oRatio}`);
    const result: CombustionAnalysis = {
      carbonMass: cMass,
      hydrogenMass: hMass,
      oxygenMass: oMass,
      empiricalFormula: empiricalParts.join(''),
      elements: { C: cMoles, H: hMoles, O: oMoles },
    };
    this._analyses.push({ type: 'combustionAnalysis', result });
    this._history.push({ method: 'combustionAnalysis' });
    return result;
  }

  /** Hydrate analysis: determine water of hydration. 水合物分析 */
  hydrateAnalysis(anhydrousMass: number, waterMass: number, anhydrousFormula: string): HydrateAnalysis {
    const anhydrousMolarMass = this.molarMassOf(anhydrousFormula);
    const anhydrousMoles = anhydrousMass / anhydrousMolarMass;
    const waterMoles = waterMass / 18.015;
    const waterRatio = Math.round(waterMoles / anhydrousMoles);
    const formula = `${anhydrousFormula}.${waterRatio}H2O`;
    const result: HydrateAnalysis = {
      formula,
      anhydrousMass,
      waterMass,
      waterRatio,
      waterOfHydration: waterMass / (anhydrousMass + waterMass) * 100,
    };
    this._analyses.push({ type: 'hydrateAnalysis', result });
    this._history.push({ method: 'hydrateAnalysis' });
    return result;
  }

  /** Boiling point elevation ΔTb = i * Kb * m. 沸点升高 */
  boilingPointElevation(molality: number, Kb: number, vantHoffFactor: number = 1): ColligativeProperty {
    const value = vantHoffFactor * Kb * molality;
    const result: ColligativeProperty = {
      property: 'boiling-point-elevation',
      value,
      unit: '°C',
      soluteParticles: vantHoffFactor,
    };
    this._history.push({ method: 'boilingPointElevation', value });
    return result;
  }

  /** Freezing point depression ΔTf = i * Kf * m. 凝固点降低 */
  freezingPointDepression(molality: number, Kf: number, vantHoffFactor: number = 1): ColligativeProperty {
    const value = vantHoffFactor * Kf * molality;
    const result: ColligativeProperty = {
      property: 'freezing-point-depression',
      value,
      unit: '°C',
      soluteParticles: vantHoffFactor,
    };
    this._history.push({ method: 'freezingPointDepression', value });
    return result;
  }

  /** Osmotic pressure π = i * M * R * T. 渗透压 */
  osmoticPressure(molarity: number, T: number, vantHoffFactor: number = 1): ColligativeProperty {
    const value = vantHoffFactor * molarity * R_GAS * T;
    const result: ColligativeProperty = {
      property: 'osmotic-pressure',
      value,
      unit: 'Pa',
      soluteParticles: vantHoffFactor,
    };
    this._history.push({ method: 'osmoticPressure', value });
    return result;
  }

  /** Vapor pressure lowering (Raoult's law): P = X_solvent * P°. 蒸气压下降 */
  vaporPressureLowering(solventMoleFraction: number, pureVaporPressure: number): ColligativeProperty {
    const value = pureVaporPressure - solventMoleFraction * pureVaporPressure;
    const result: ColligativeProperty = {
      property: 'vapor-pressure-lowering',
      value,
      unit: 'atm',
      soluteParticles: 1,
    };
    this._history.push({ method: 'vaporPressureLowering', value });
    return result;
  }

  /** Get cryoscopic/ebullioscopic constants for a solvent. 获取溶剂的凝固点/沸点常数 */
  solventConstants(solvent: string): { Kf: number; Kb: number; bp: number; mp: number } | null {
    const c = CRYOSCOPIC_CONSTANTS[solvent];
    this._history.push({ method: 'solventConstants', solvent });
    return c ?? null;
  }

  /** Ideal gas law PV = nRT. 理想气体定律 */
  idealGasLaw(P: number, V: number, n: number, T: number): number {
    // Returns whichever is missing (passed as NaN)
    if (Number.isNaN(P)) return (n * R_LATM * T) / V;
    if (Number.isNaN(V)) return (n * R_LATM * T) / P;
    if (Number.isNaN(n)) return (P * V) / (R_LATM * T);
    if (Number.isNaN(T)) return (P * V) / (n * R_LATM);
    return 0;
  }

  /** Molar volume at given T and P. 给定温度压力下的摩尔体积 */
  molarVolume(T: number, P: number): number {
    if (P <= 0) return 0;
    const Vm = (R_LATM * T) / P;
    this._history.push({ method: 'molarVolume', Vm });
    return Vm;
  }

  /** Gas density from molar mass at given T and P. 给定条件下气体密度 */
  gasDensity(molarMass: number, T: number, P: number): number {
    if (T <= 0) return 0;
    const density = (molarMass * P) / (R_LATM * T);
    this._history.push({ method: 'gasDensity', density });
    return density;
  }

  /** Molar volume at STP (0°C, 1 atm). 标况摩尔体积 */
  molarVolumeSTP(): number {
    return MOLAR_VOLUME_STP;
  }

  /** Gas stoichiometry: convert gas volume to moles at STP. 气体体积转摩尔（STP） */
  gasVolumeToMoles(volume: number, T: number = STANDARD_TEMP, P: number = STANDARD_PRESSURE): number {
    const Vm = this.molarVolume(T, P);
    if (Vm === 0) return 0;
    const moles = volume / Vm;
    this._history.push({ method: 'gasVolumeToMoles', moles });
    return moles;
  }

  /** Gas moles to volume at given T and P. 摩尔转气体体积 */
  molesToGasVolume(moles: number, T: number = STANDARD_TEMP, P: number = STANDARD_PRESSURE): number {
    const Vm = this.molarVolume(T, P);
    const volume = moles * Vm;
    this._history.push({ method: 'molesToGasVolume', volume });
    return volume;
  }

  /** Complete gas stoichiometry analysis. 完整气体化学计量分析 */
  gasStoichiometry(moles: number, T: number, P: number, molarMass: number): GasStoichiometry {
    const Vm = this.molarVolume(T, P);
    const volume = moles * Vm;
    const density = this.gasDensity(molarMass, T, P);
    const result: GasStoichiometry = {
      moles,
      volume,
      pressure: P,
      temperature: T,
      density,
    };
    this._history.push({ method: 'gasStoichiometry' });
    return result;
  }

  /** Combined gas law P1V1/T1 = P2V2/T2. 组合气体定律 */
  combinedGasLaw(P1: number, V1: number, T1: number, P2: number, V2: number, T2: number): number {
    // Returns whichever is missing (NaN)
    if (Number.isNaN(P2)) return (P1 * V1 * T2) / (T1 * V2);
    if (Number.isNaN(V2)) return (P1 * V1 * T2) / (T1 * P2);
    if (Number.isNaN(T2)) return (P2 * V2 * T1) / (P1 * V1);
    if (Number.isNaN(P1)) return (P2 * V2 * T1) / (T2 * V1);
    if (Number.isNaN(V1)) return (P2 * V2 * T1) / (T2 * P1);
    if (Number.isNaN(T1)) return (P1 * V1 * T2) / (P2 * V2);
    return 0;
  }

  /** Boyle's law P1V1 = P2V2 at constant T. 玻意耳定律 */
  boylesLaw(P1: number, V1: number, P2: number): number {
    if (P2 <= 0) return 0;
    const V2 = (P1 * V1) / P2;
    this._history.push({ method: 'boylesLaw', V2 });
    return V2;
  }

  /** Charles's law V1/T1 = V2/T2 at constant P. 查理定律 */
  charlesLaw(V1: number, T1: number, T2: number): number {
    if (T1 <= 0) return 0;
    const V2 = (V1 * T2) / T1;
    this._history.push({ method: 'charlesLaw', V2 });
    return V2;
  }

  /** Gay-Lussac's law P1/T1 = P2/T2 at constant V. 盖-吕萨克定律 */
  gayLussacLaw(P1: number, T1: number, T2: number): number {
    if (T1 <= 0) return 0;
    const P2 = (P1 * T2) / T1;
    this._history.push({ method: 'gayLussacLaw', P2 });
    return P2;
  }

  /** Avogadro's law V1/n1 = V2/n2 at constant T and P. 阿伏伽德罗定律 */
  avogadrosLaw(V1: number, n1: number, n2: number): number {
    if (n1 <= 0) return 0;
    const V2 = (V1 * n2) / n1;
    this._history.push({ method: 'avogadrosLaw', V2 });
    return V2;
  }

  /** Density of a solution. 溶液密度 */
  solutionDensity(soluteMass: number, solventMass: number, volume: number): number {
    if (volume <= 0) return 0;
    return (soluteMass + solventMass) / volume;
  }

  /** Mass of solute from molarity and volume. 由摩尔浓度和体积求溶质质量 */
  soluteMass(molarity: number, volume: number, molarMass: number): number {
    const moles = molarity * volume;
    const mass = moles * molarMass;
    this._history.push({ method: 'soluteMass', mass });
    return mass;
  }

  /** Convert between concentration units. 浓度单位转换 */
  convertConcentration(
    value: number,
    fromType: 'M' | 'm' | 'percent' | 'ppm' | 'ppb',
    soluteMolarMass: number,
    solutionDensity: number = 1.0,
    solventMolarMass: number = 18.015,
  ): ConcentrationConversion {
    // Convert input to molarity first
    let molarity = 0;
    if (fromType === 'M') molarity = value;
    else if (fromType === 'm') {
      // molality to molarity (approximation): m * density / (1 + m * soluteMolarMass/1000)
      molarity = (value * solutionDensity * 1000) / (1000 + value * soluteMolarMass);
    } else if (fromType === 'percent') {
      // mass percent → molarity
      molarity = (value * 10 * solutionDensity) / soluteMolarMass;
    } else if (fromType === 'ppm') {
      molarity = (value * solutionDensity) / (soluteMolarMass * 1000);
    } else if (fromType === 'ppb') {
      molarity = (value * solutionDensity) / (soluteMolarMass * 1e6);
    }
    // Convert molarity to all other units
    const molality = (molarity * 1000) / (solutionDensity * 1000 - molarity * soluteMolarMass);
    const soluteMassPerL = molarity * soluteMolarMass;
    const massFraction = soluteMassPerL / (solutionDensity * 1000);
    const percent = massFraction * 100;
    const ppm = massFraction * 1e6;
    const ppb = massFraction * 1e9;
    const totalMoles = (solutionDensity * 1000 - soluteMassPerL) / solventMolarMass + molarity;
    const moleFraction = totalMoles > 0 ? molarity / totalMoles : 0;
    const result: ConcentrationConversion = {
      molarity,
      molality: Number.isFinite(molality) ? molality : 0,
      moleFraction,
      massFraction,
      percent,
      ppm,
      ppb,
    };
    this._history.push({ method: 'convertConcentration' });
    return result;
  }

  /** Gravimetric analysis: analyte from precipitate mass. 重量分析 */
  gravimetricAnalysis(
    precipitateMass: number,
    precipitateMolarMass: number,
    analyteMolarMass: number,
    analyteAtomsPerPrecipitate: number = 1,
    sampleMass: number = 0,
  ): GravimetricAnalysis {
    const gravimetricFactor = (analyteMolarMass * analyteAtomsPerPrecipitate) / precipitateMolarMass;
    const analyteMass = precipitateMass * gravimetricFactor;
    const purity = sampleMass > 0 ? (analyteMass / sampleMass) * 100 : 100;
    const result: GravimetricAnalysis = {
      analyteMass,
      precipitateMass,
      gravimetricFactor,
      purity,
    };
    this._analyses.push({ type: 'gravimetricAnalysis', result });
    this._history.push({ method: 'gravimetricAnalysis' });
    return result;
  }

  /** Volumetric analysis: titration calculation. 容量分析 */
  volumetricAnalysis(
    titrantVolume: number,
    titrantMolarity: number,
    analyteMolarMass: number,
    reactionRatio: number = 1,
    endpoint: string = 'equivalence',
  ): VolumetricAnalysis {
    const analyteMoles = titrantVolume * titrantMolarity * reactionRatio;
    const analyteMass = analyteMoles * analyteMolarMass;
    const result: VolumetricAnalysis = {
      titrantVolume,
      titrantMolarity,
      analyteMoles,
      analyteMass,
      endpoint,
    };
    this._analyses.push({ type: 'volumetricAnalysis', result });
    this._history.push({ method: 'volumetricAnalysis' });
    return result;
  }

  /** Back titration analysis. 返滴定分析 */
  backTitration(
    addedTitrantMoles: number,
    excessTitrantVolume: number,
    excessTitrantMolarity: number,
    analyteMolarMass: number,
    reactionRatio: number = 1,
  ): { analyteMoles: number; analyteMass: number } {
    const excessMoles = excessTitrantVolume * excessTitrantMolarity;
    const analyteMoles = (addedTitrantMoles - excessMoles) * reactionRatio;
    const analyteMass = analyteMoles * analyteMolarMass;
    this._history.push({ method: 'backTitration', analyteMoles });
    return { analyteMoles: Math.max(0, analyteMoles), analyteMass: Math.max(0, analyteMass) };
  }

  /** Mass-mass stoichiometry. 质量化学计量计算 */
  massToMassStoichiometry(
    reactantMass: number,
    reactantMolarMass: number,
    productMolarMass: number,
    reactantRatio: number = 1,
    productRatio: number = 1,
  ): number {
    const moles = reactantMass / reactantMolarMass;
    const productMoles = moles * (productRatio / reactantRatio);
    const productMass = productMoles * productMolarMass;
    this._history.push({ method: 'massToMassStoichiometry', productMass });
    return productMass;
  }

  /** Mass-volume stoichiometry (gas). 质量-体积化学计量计算（气体） */
  massToVolumeStoichiometry(
    reactantMass: number,
    reactantMolarMass: number,
    reactantRatio: number = 1,
    productRatio: number = 1,
    T: number = STANDARD_TEMP,
    P: number = STANDARD_PRESSURE,
  ): number {
    const moles = reactantMass / reactantMolarMass;
    const productMoles = moles * (productRatio / reactantRatio);
    const volume = this.molesToGasVolume(productMoles, T, P);
    this._history.push({ method: 'massToVolumeStoichiometry', volume });
    return volume;
  }

  /** Volume-volume stoichiometry (gases at same T,P). 体积-体积化学计量计算（气体） */
  volumeToVolumeStoichiometry(
    reactantVolume: number,
    reactantRatio: number,
    productRatio: number,
  ): number {
    const productVolume = reactantVolume * (productRatio / reactantRatio);
    this._history.push({ method: 'volumeToVolumeStoichiometry', productVolume });
    return productVolume;
  }

  /** Solution stoichiometry. 溶液化学计量计算 */
  solutionStoichiometry(
    solutionVolume: number,
    solutionMolarity: number,
    productMolarMass: number,
    reactantRatio: number = 1,
    productRatio: number = 1,
  ): { productMoles: number; productMass: number } {
    const reactantMoles = solutionVolume * solutionMolarity;
    const productMoles = reactantMoles * (productRatio / reactantRatio);
    const productMass = productMoles * productMolarMass;
    this._history.push({ method: 'solutionStoichiometry', productMoles });
    return { productMoles, productMass };
  }

  /** Reaction yield with excess reagent. 含过量试剂的反应产率 */
  yieldWithExcess(
    limitingReagentMass: number,
    limitingMolarMass: number,
    actualProductMass: number,
    productMolarMass: number,
    ratio: number = 1,
  ): { theoretical: number; percent: number } {
    const theoretical = this.theoreticalYieldFromLimiting(
      limitingReagentMass / limitingMolarMass, productMolarMass, ratio,
    );
    const percent = this.percentYield(actualProductMass, theoretical);
    this._history.push({ method: 'yieldWithExcess' });
    return { theoretical, percent };
  }

  /** Percentage purity of a sample. 样品纯度百分数 */
  percentagePurity(actualMass: number, impureMass: number): number {
    if (impureMass <= 0) return 0;
    const pct = (actualMass / impureMass) * 100;
    this._history.push({ method: 'percentagePurity', pct });
    return pct;
  }

  /** Atom economy (green chemistry). 原子经济性（绿色化学） */
  atomEconomy(desiredProductMolarMass: number, allReactantsMolarMass: number): number {
    if (allReactantsMolarMass <= 0) return 0;
    const pct = (desiredProductMolarMass / allReactantsMolarMass) * 100;
    this._history.push({ method: 'atomEconomy', pct });
    return pct;
  }

  /** E-factor (waste per kg product). E-因子 */
  eFactor(totalWasteKg: number, productKg: number): number {
    if (productKg <= 0) return 0;
    const e = totalWasteKg / productKg;
    this._history.push({ method: 'eFactor', e });
    return e;
  }

  /** Reaction mass efficiency. 反应质量效率 */
  reactionMassEfficiency(
    productMass: number,
    reactantMasses: number[],
  ): number {
    const totalReactant = reactantMasses.reduce((s, m) => s + m, 0);
    if (totalReactant <= 0) return 0;
    const rme = (productMass / totalReactant) * 100;
    this._history.push({ method: 'reactionMassEfficiency', rme });
    return rme;
  }

  /** Equivalent weight from molar mass and n-factor. 当量质量 */
  equivalentWeight(molarMass: number, nFactor: number): number {
    if (nFactor <= 0) return 0;
    const eqW = molarMass / nFactor;
    this._history.push({ method: 'equivalentWeight', eqW });
    return eqW;
  }

  /** n-factor for acid (number of acidic H). 酸的 n 因子 */
  nFactorAcid(acidFormula: string): number {
    const h = acidFormula.match(/H/g)?.length ?? 0;
    this._history.push({ method: 'nFactorAcid', h });
    return h;
  }

  /** n-factor for base (number of OH or H+ consumed). 碱的 n 因子 */
  nFactorBase(baseFormula: string): number {
    if (baseFormula.includes('OH')) {
      const oh = baseFormula.match(/OH/g)?.length ?? 0;
      const multiplier = baseFormula.match(/\((\d+)\)/)?.[1];
      return oh * (multiplier ? parseInt(multiplier, 10) : 1);
    }
    // For ammonia-like bases, count N
    const n = baseFormula.match(/N/g)?.length ?? 1;
    this._history.push({ method: 'nFactorBase', n });
    return n;
  }

  /** n-factor for redox (electrons transferred). 氧化还原 n 因子 */
  nFactorRedox(initialOxidationState: number, finalOxidationState: number): number {
    const n = Math.abs(finalOxidationState - initialOxidationState);
    this._history.push({ method: 'nFactorRedox', n });
    return n;
  }

  /** Calculate oxidation state of an element in a compound. 计算化合物中某元素的氧化态 */
  oxidationState(compound: string, element: string): number {
    // Simplified: known common cases
    const known: Record<string, Record<string, number>> = {
      'H2O': { H: 1, O: -2 },
      'CO2': { C: 4, O: -2 },
      'H2SO4': { H: 1, S: 6, O: -2 },
      'HNO3': { H: 1, N: 5, O: -2 },
      'NaCl': { Na: 1, Cl: -1 },
      'KMnO4': { K: 1, Mn: 7, O: -2 },
      'K2Cr2O7': { K: 1, Cr: 6, O: -2 },
      'Fe2O3': { Fe: 3, O: -2 },
      'SO2': { S: 4, O: -2 },
      'SO3': { S: 6, O: -2 },
      'NH3': { N: -3, H: 1 },
      'NO2': { N: 4, O: -2 },
      'NO': { N: 2, O: -2 },
      'N2O': { N: 1, O: -2 },
      'HCl': { H: 1, Cl: -1 },
      'H2O2': { H: 1, O: -1 },
      'OF2': { O: 2, F: -1 },
    };
    const state = known[compound]?.[element] ?? 0;
    this._history.push({ method: 'oxidationState', compound, element, state });
    return state;
  }

  /** Number of moles in a sample given mass and formula. 给定质量和化学式求摩尔数 */
  molesFromMass(mass: number, formula: string): number {
    const mm = this.molarMassOf(formula);
    if (mm <= 0) return 0;
    return mass / mm;
  }

  /** Mass from moles and formula. 由摩尔数和化学式求质量 */
  massFromMoles(moles: number, formula: string): number {
    return moles * this.molarMassOf(formula);
  }

  /** Number of atoms of an element in a sample. 样品中某元素的原子数 */
  atomCountInSample(mass: number, formula: string, element: string): number {
    const counts = parseFormula(formula);
    const elementCount = counts[element] ?? 0;
    const moles = this.molesFromMass(mass, formula);
    const atoms = moles * elementCount * AVOGADRO;
    this._history.push({ method: 'atomCountInSample', atoms });
    return atoms;
  }

  /** Number of molecules in a sample. 样品中分子数 */
  moleculeCount(mass: number, formula: string): number {
    const moles = this.molesFromMass(mass, formula);
    const molecules = moles * AVOGADRO;
    this._history.push({ method: 'moleculeCount', molecules });
    return molecules;
  }

  /** Calculate percentage abundance of isotopes. 同位素丰度计算 */
  isotopeAbundance(averageMass: number, isotopeMasses: number[]): number[] {
    // Simplified for 2 isotopes
    if (isotopeMasses.length !== 2) return isotopeMasses.map(() => 100 / isotopeMasses.length);
    const [m1, m2] = isotopeMasses;
    const x1 = (averageMass - m2) / (m1 - m2);
    const x2 = 1 - x1;
    this._history.push({ method: 'isotopeAbundance' });
    return [x1 * 100, x2 * 100];
  }

  /** Average atomic mass from isotope data. 由同位素数据计算平均原子量 */
  averageAtomicMass(isotopes: Array<{ mass: number; abundance: number }>): number {
    const total = isotopes.reduce((s, i) => s + i.mass * i.abundance / 100, 0);
    this._history.push({ method: 'averageAtomicMass', total });
    return total;
  }

  /** Mass ratio in a compound. 化合物中元素的质量比 */
  massRatioInCompound(compound: string, element1: string, element2: string): number {
    const composition = this.percentComposition(compound);
    const m1 = composition[element1] ?? 0;
    const m2 = composition[element2] ?? 0;
    if (m2 === 0) return 0;
    const ratio = m1 / m2;
    this._history.push({ method: 'massRatioInCompound', ratio });
    return ratio;
  }

  /** Empirical formula from combustion + molar mass. 由燃烧分析和摩尔质量求分子式 */
  formulaFromCombustion(
    co2Mass: number, h2oMass: number, sampleMass: number, molarMass: number,
  ): { empirical: string; molecular: string } {
    const analysis = this.combustionAnalysis(co2Mass, h2oMass, sampleMass);
    const molecular = this.molecular(analysis.empiricalFormula, molarMass);
    this._history.push({ method: 'formulaFromCombustion' });
    return { empirical: analysis.empiricalFormula, molecular };
  }

  /** Volume of solution from molarity and moles. 由摩尔浓度和摩尔数求溶液体积 */
  volumeFromMolarity(moles: number, molarity: number): number {
    if (molarity <= 0) return 0;
    return moles / molarity;
  }

  /** Mass of solvent from molality and moles. 由质量摩尔浓度和摩尔数求溶剂质量 */
  solventMassFromMolality(moles: number, molality: number): number {
    if (molality <= 0) return 0;
    return moles / molality;
  }

  /** Mixing two solutions of same solute. 混合两种同溶质溶液 */
  mixSolutions(
    sol1: { volume: number; molarity: number },
    sol2: { volume: number; molarity: number },
  ): { volume: number; molarity: number } {
    const totalMoles = sol1.volume * sol1.molarity + sol2.volume * sol2.molarity;
    const totalVolume = sol1.volume + sol2.volume;
    if (totalVolume <= 0) return { volume: 0, molarity: 0 };
    const finalMolarity = totalMoles / totalVolume;
    this._history.push({ method: 'mixSolutions', finalMolarity });
    return { volume: totalVolume, molarity: finalMolarity };
  }

  /** Reaction conversion percent. 反应转化率 */
  conversionPercent(reactedMoles: number, initialMoles: number): number {
    if (initialMoles <= 0) return 0;
    const pct = (reactedMoles / initialMoles) * 100;
    this._history.push({ method: 'conversionPercent', pct });
    return pct;
  }

  /** Selectivity for parallel reactions. 平行反应选择性 */
  selectivity(majorProductMoles: number, minorProductMoles: number): number {
    const total = majorProductMoles + minorProductMoles;
    if (total <= 0) return 0;
    const pct = (majorProductMoles / total) * 100;
    this._history.push({ method: 'selectivity', pct });
    return pct;
  }

  /** Yield considering conversion and selectivity. 综合转化率和选择性的产率 */
  yieldFromConversionSelectivity(conversion: number, selectivity: number): number {
    const yieldPct = (conversion / 100) * (selectivity / 100) * 100;
    this._history.push({ method: 'yieldFromConversionSelectivity', yieldPct });
    return yieldPct;
  }

  /** Mole ratio in reaction. 反应中的摩尔比 */
  moleRatio(substance1Moles: number, substance2Moles: number): number {
    if (substance2Moles === 0) return 0;
    return substance1Moles / substance2Moles;
  }

  /** Standard temperature conversion. 标准温度转换 */
  celsiusToKelvin(celsius: number): number {
    return celsius + KELVIN_OFFSET;
  }

  /** Kelvin to Celsius. 开尔文转摄氏度 */
  kelvinToCelsius(kelvin: number): number {
    return kelvin - KELVIN_OFFSET;
  }

  /** Calculate moles at STP from gas volume. 由气体体积（STP）求摩尔数 */
  molesAtSTP(volumeLiters: number): number {
    return volumeLiters / MOLAR_VOLUME_STP;
  }

  /** Volume at STP from moles. 由摩尔数求 STP 体积 */
  volumeAtSTP(moles: number): number {
    return moles * MOLAR_VOLUME_STP;
  }

  /** Private history recorder (capped at 200 entries). 私有历史记录方法 */
  private _recordHistory(entry: unknown): void {
    this._history.push(entry);
    if (this._history.length > 200) {
      this._history.shift();
    }
  }

  toPacket(): DataPacket<{
    moles: Mole[];
    solutions: Solution[];
    analyses: Array<{ type: string; result: unknown }>;
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
        analyses: this._analyses,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._moles = [];
    this._solutions = [];
    this._analyses = [];
    this._history = [];
    this._counter = 0;
  }

  get moleCount(): number {
    return this._moles.length;
  }

  get solutionCount(): number {
    return this._solutions.length;
  }

  get analysisCount(): number {
    return this._analyses.length;
  }

  get historyDepth(): number {
    return this._history.length;
  }
}
