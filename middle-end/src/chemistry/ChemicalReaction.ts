import { DataPacket, PacketMeta } from '../shared/types';

/** Type of chemical reaction. 反应类型 */
export type ReactionType = 'synthesis' | 'decomposition' | 'single-replacement'
  | 'double-replacement' | 'combustion' | 'redox' | 'acid-base' | 'unknown';

/** A chemical reaction record. 化学反应记录 */
export interface Reaction {
  reactants: string[];
  products: string[];
  type: ReactionType;
  balanced: boolean;
  enthalpy: number;
  entropy: number;
  gibbs: number;
}

/** Reaction rate descriptor. 反应速率描述 */
export interface ReactionRate {
  constant: number;
  order: number[];
  rate: number;
  units: string;
}

/** Equilibrium descriptor. 平衡描述 */
export interface Equilibrium {
  K: number;
  Q: number;
  direction: 'forward' | 'reverse' | 'none';
  description: string;
}

/** Integrated rate law result. 积分速率定律结果 */
export interface IntegratedRateLaw {
  order: 0 | 1 | 2;
  equation: string;
  halfLife: number;
  k: number;
  unit: string;
}

/** Catalysis descriptor. 催化描述 */
export interface Catalysis {
  type: 'homogeneous' | 'heterogeneous' | 'enzyme' | 'acid' | 'base';
  catalyst: string;
  rateEnhancement: number;
  mechanism: string;
}

/** Michaelis-Menten enzyme kinetics. 米氏酶动力学 */
export interface MichaelisMenten {
  Vmax: number;
  Km: number;
  rate: number;
  saturation: number;
  turnover: number;
}

/** Reaction mechanism step. 反应机理步骤 */
export interface MechanismStep {
  step: number;
  reactants: string[];
  products: string[];
  rateConstant: number;
  reversible: boolean;
}

/** Reaction mechanism analysis. 反应机理分析 */
export interface Mechanism {
  steps: MechanismStep[];
  rateDeterminingStep: number;
  rateLaw: string;
  intermediates: string[];
  overallEquation: string;
}

/** Chain reaction descriptor. 链反应描述 */
export interface ChainReaction {
  initiation: string;
  propagation: string[];
  termination: string[];
  chainLength: number;
  branching: boolean;
}

/** Photochemical reaction descriptor. 光化学反应描述 */
export interface PhotochemicalReaction {
  wavelength: number;
  photonEnergy: number;
  quantumYield: number;
  primaryProcess: string;
  secondaryProcess: string;
}

/** Reaction quotient analysis with activity. 含活度的反应商分析 */
export interface ActivityAnalysis {
  Q: number;
  K: number;
  ionicStrength: number;
  activityCoefficients: number[];
  direction: 'forward' | 'reverse' | 'none';
}

/** Buffer capacity result. 缓冲容量结果 */
export interface BufferCapacity {
  pH: number;
  capacity: number;
  range: [number, number];
  optimalRatio: number;
}

/** Explosion characteristics. 爆炸特征 */
export interface Explosion {
  type: 'detonation' | 'deflagration' | 'thermal' | 'chain-branching';
  lowerExplosionLimit: number;
  upperExplosionLimit: number;
  detonationVelocity: number;
  pressureRatio: number;
}

const R_GAS = 8.314; // J/(mol·K)
const TEMP_REF = 298.15; // K, 参考温度

/** Bond dissociation energies (kJ/mol). 键解离能 */
const BOND_DISSOCIATION_ENERGIES: Record<string, number> = {
  'H-H': 436, 'C-H': 413, 'C-C': 348, 'C=C': 614, 'C≡C': 839,
  'O-H': 463, 'O=O': 498, 'C-O': 358, 'C=O': 799, 'N-H': 391,
  'N-N': 163, 'N=N': 418, 'N≡N': 946, 'C-N': 305, 'C=N': 615,
  'C≡N': 891, 'Cl-Cl': 243, 'H-Cl': 432, 'C-Cl': 339,
  'Br-Br': 193, 'H-Br': 366, 'C-Br': 276,
  'I-I': 151, 'H-I': 298, 'C-I': 238,
  'S-H': 347, 'S-S': 266, 'C-S': 259,
};

/** Common rate constants at 25°C (L/(mol·s)). 常见反应速率常数 */
const COMMON_RATE_CONSTANTS: Record<string, number> = {
  'H2+I2->2HI': 0.024,
  '2NO2->2NO+O2': 0.54,
  'H+Br2->HBr+Br': 9.2e8,
  'C2H4+HBr->C2H5Br': 5.0e-6,
  'CH3+CH3->C2H6': 2.2e10,
  'OH+H2->H2O+H': 4.2e7,
};

/** Balance and analyze chemical reactions. 化学反应平衡与分析 */
export class ChemicalReaction {
  private _reactions: Reaction[] = [];
  private _rates: ReactionRate[] = [];
  private _catalyses: Catalysis[] = [];
  private _mechanisms: Mechanism[] = [];
  private _chainReactions: ChainReaction[] = [];
  private _photochemical: PhotochemicalReaction[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  /** Attempt to balance a textual equation like 'H2 + O2 -> H2O'. 尝试平衡方程式 */
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
    this._recordHistory({ method: 'balance', equation, balanced });
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

  /** Synthesis A + B -> AB. 化合反应 */
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
    this._recordHistory({ method: 'synthesis', a, b });
    return reaction;
  }

  /** Decomposition AB -> A + B. 分解反应 */
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
    this._recordHistory({ method: 'decomposition', compound });
    return reaction;
  }

  /** Single replacement A + BC -> AC + B. 置换反应 */
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
    this._recordHistory({ method: 'singleReplacement', a, b });
    return reaction;
  }

  /** Double replacement AB + CD -> AD + CB. 复分解反应 */
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
    this._recordHistory({ method: 'doubleReplacement', a, b });
    return reaction;
  }

  /** Combustion of a substance (typically hydrocarbon). 燃烧反应 */
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
    this._recordHistory({ method: 'combustion', substance });
    return reaction;
  }

  /** Redox reaction analysis. 氧化还原反应分析 */
  redox(reaction: Reaction): Reaction {
    const updated: Reaction = { ...reaction, type: 'redox' };
    this._reactions.push(updated);
    this._recordHistory({ method: 'redox' });
    return updated;
  }

  /** Acid-base neutralization reaction. 酸碱中和反应 */
  acidBaseReaction(acid: string, base: string): Reaction {
    const reaction: Reaction = {
      reactants: [acid, base],
      products: ['salt', 'H2O'],
      type: 'acid-base',
      balanced: true,
      enthalpy: -57.1,
      entropy: 80,
      gibbs: -80,
    };
    this._reactions.push(reaction);
    this._recordHistory({ method: 'acidBaseReaction', acid, base });
    return reaction;
  }

  /** Precipitation reaction. 沉淀反应 */
  precipitation(cation: string, anion: string): Reaction {
    const reaction: Reaction = {
      reactants: [cation, anion],
      products: [`${cation}${anion}`],
      type: 'double-replacement',
      balanced: true,
      enthalpy: -20,
      entropy: -100,
      gibbs: 10,
    };
    this._reactions.push(reaction);
    this._recordHistory({ method: 'precipitation', cation, anion });
    return reaction;
  }

  /** Compute reaction rate from rate constant and concentrations. 由速率常数和浓度计算反应速率 */
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
    this._recordHistory({ method: 'reactionRate', k });
    return result;
  }

  /** General rate law given reactants and orders. 给定反应物和反应级数的速率定律 */
  rateLaw(reactants: string[], orders: number[]): ReactionRate {
    const k = 0.1;
    const concentrations = reactants.map(() => 1.0);
    let rate = k;
    for (let i = 0; i < concentrations.length; i++) {
      rate *= Math.pow(concentrations[i], orders[i] ?? 1);
    }
    const result: ReactionRate = { constant: k, order: orders, rate, units: 'M/s' };
    this._rates.push(result);
    this._recordHistory({ method: 'rateLaw', reactants });
    return result;
  }

  /** Arrhenius equation k = A * exp(-Ea/(RT)). 阿伦尼乌斯方程 */
  arrheniusEquation(A: number, Ea: number, T: number): number {
    const k = A * Math.exp(-Ea / (R_GAS * T));
    this._recordHistory({ method: 'arrheniusEquation', A, Ea, T, k });
    return k;
  }

  /** Activation energy from two rate constants at two temperatures. 由两个温度下的速率常数计算活化能 */
  activationEnergy(k1: number, T1: number, k2: number, T2: number): number {
    if (k1 <= 0 || k2 <= 0 || T1 === T2) return 0;
    const Ea = (R_GAS * Math.log(k2 / k1) * T1 * T2) / (T2 - T1);
    this._recordHistory({ method: 'activationEnergy', Ea });
    return Ea;
  }

  /** Pre-exponential factor from Arrhenius plot. 由阿伦尼乌斯图计算指前因子 */
  preExponentialFactor(k: number, Ea: number, T: number): number {
    const A = k / Math.exp(-Ea / (R_GAS * T));
    this._recordHistory({ method: 'preExponentialFactor', A });
    return A;
  }

  /** Compute rate constant at new temperature using Arrhenius. 用阿伦尼乌斯方程计算新温度下的速率常数 */
  rateAtTemperature(k1: number, T1: number, Ea: number, T2: number): number {
    const k2 = k1 * Math.exp((Ea / R_GAS) * (1 / T1 - 1 / T2));
    this._recordHistory({ method: 'rateAtTemperature', k2 });
    return k2;
  }

  /** Temperature coefficient Q10 (rate change per 10 K). 温度系数 Q10 */
  temperatureCoefficientQ10(k1: number, T1: number, k2: number, T2: number): number {
    const dT = T2 - T1;
    if (dT === 0 || k1 <= 0) return 1;
    const Q10 = Math.pow(k2 / k1, 10 / dT);
    this._recordHistory({ method: 'temperatureCoefficientQ10', Q10 });
    return Q10;
  }

  /** Zero-order integrated rate law: [A] = [A]0 - kt. 零级积分速率定律 */
  zeroOrderIntegrated(A0: number, k: number, t: number): { concentration: number; halfLife: number } {
    const concentration = Math.max(0, A0 - k * t);
    const halfLife = A0 / (2 * k);
    this._recordHistory({ method: 'zeroOrderIntegrated', concentration, halfLife });
    return { concentration, halfLife };
  }

  /** First-order integrated rate law: ln[A] = ln[A]0 - kt. 一级积分速率定律 */
  firstOrderIntegrated(A0: number, k: number, t: number): { concentration: number; halfLife: number } {
    const concentration = A0 * Math.exp(-k * t);
    const halfLife = Math.log(2) / k;
    this._recordHistory({ method: 'firstOrderIntegrated', concentration, halfLife });
    return { concentration, halfLife };
  }

  /** Second-order integrated rate law: 1/[A] = 1/[A]0 + kt. 二级积分速率定律 */
  secondOrderIntegrated(A0: number, k: number, t: number): { concentration: number; halfLife: number } {
    const denom = 1 / A0 + k * t;
    const concentration = denom > 0 ? 1 / denom : 0;
    const halfLife = 1 / (k * A0);
    this._recordHistory({ method: 'secondOrderIntegrated', concentration, halfLife });
    return { concentration, halfLife };
  }

  /** Determine reaction order and compute integrated rate law parameters. 确定反应级数并计算积分速率定律参数 */
  integratedRateLaw(order: 0 | 1 | 2, k: number, A0: number): IntegratedRateLaw {
    let equation: string;
    let halfLife: number;
    let unit: string;
    if (order === 0) {
      equation = '[A](t) = [A]0 - k*t';
      halfLife = A0 / (2 * k);
      unit = 'M/s';
    } else if (order === 1) {
      equation = 'ln[A](t) = ln[A]0 - k*t';
      halfLife = Math.log(2) / k;
      unit = '1/s';
    } else {
      equation = '1/[A](t) = 1/[A]0 + k*t';
      halfLife = 1 / (k * A0);
      unit = 'L/(mol·s)';
    }
    const result: IntegratedRateLaw = { order, equation, halfLife, k, unit };
    this._recordHistory({ method: 'integratedRateLaw', order });
    return result;
  }

  /** Pseudo-order kinetics for reactions with one reactant in large excess. 假级数动力学 */
  pseudoOrder(trueK: number, excessConcentration: number, trueOrder: number): { kObs: number; order: number } {
    const kObs = trueK * Math.pow(excessConcentration, trueOrder - 1);
    this._recordHistory({ method: 'pseudoOrder', kObs });
    return { kObs, order: 1 };
  }

  /** Collision theory rate constant: k = Z * p * exp(-Ea/RT). 碰撞理论速率常数 */
  collisionTheory(sigma: number, mu: number, T: number, Ea: number, p: number = 1): number {
    // sigma: collision cross-section (m²); mu: reduced mass (kg); p: steric factor
    const NA = 6.022e23;
    const kB = 1.381e-23;
    const Z = sigma * Math.sqrt(8 * Math.PI * kB * T / mu) * NA;
    const k = p * Z * Math.exp(-Ea / (R_GAS * T));
    this._recordHistory({ method: 'collisionTheory', k, Z });
    return k;
  }

  /** Transition state theory (Eyring equation): k = (kB*T/h) * exp(-ΔG‡/RT). 过渡态理论 */
  eyringEquation(dG: number, T: number): number {
    const kB = 1.381e-23;
    const h = 6.626e-34;
    const k = (kB * T / h) * Math.exp(-dG / (R_GAS * T));
    this._recordHistory({ method: 'eyringEquation', k });
    return k;
  }

  /** Activation entropy from Eyring plot. 由 Eyring 图计算活化熵 */
  activationEntropy(k: number, T: number, dH: number): number {
    const kB = 1.381e-23;
    const h = 6.626e-34;
    const ratio = k * h / (kB * T);
    if (ratio <= 0) return 0;
    const dS = R_GAS * Math.log(ratio) + dH / T;
    this._recordHistory({ method: 'activationEntropy', dS });
    return dS;
  }

  /** Compute reaction quotient and direction relative to K. 计算反应商并判断方向 */
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
    this._recordHistory({ method: 'equilibrium', K, Q });
    return result;
  }

  /** Apply Le Chatelier's principle to a stress. 应用勒夏特列原理 */
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
      case 'add-inert-gas': shift = 'no shift at constant volume'; break;
      case 'add-inert-gas-pressure': shift = 'shifts toward side with more gas moles (constant pressure)'; break;
      default: shift = 'unknown stress';
    }
    this._recordHistory({ method: 'leChatelier', stress });
    return shift;
  }

  /** Enthalpy change from bond energies. 由键能计算焓变 */
  enthalpyChange(bondsBroken: number[], bondsFormed: number[]): number {
    const inSum = bondsBroken.reduce((s, e) => s + e, 0);
    const outSum = bondsFormed.reduce((s, e) => s + e, 0);
    const dH = inSum - outSum;
    this._recordHistory({ method: 'enthalpyChange', dH });
    return dH;
  }

  /** Enthalpy change from named bonds. 由键名计算焓变 */
  enthalpyFromBonds(broken: string[], formed: string[]): number {
    const sumE = (bonds: string[]) =>
      bonds.reduce((s, b) => s + (BOND_DISSOCIATION_ENERGIES[b] ?? 0), 0);
    const dH = sumE(broken) - sumE(formed);
    this._recordHistory({ method: 'enthalpyFromBonds', dH });
    return dH;
  }

  /** Hess's law: combine multiple reactions' enthalpies. 盖斯定律：组合多个反应的焓变 */
  hessLaw(reactions: Array<{ enthalpy: number; multiplier: number }>): number {
    const total = reactions.reduce((s, r) => s + r.enthalpy * r.multiplier, 0);
    this._recordHistory({ method: 'hessLaw', total });
    return total;
  }

  /** Standard enthalpy of formation reaction. 标准生成焓 */
  enthalpyOfFormation(compounds: Array<{ formula: string; dHf: number; coefficient: number }>): number {
    const total = compounds.reduce(
      (s, c) => s + c.dHf * c.coefficient,
      0,
    );
    this._recordHistory({ method: 'enthalpyOfFormation', total });
    return total;
  }

  /** Entropy change estimate from reaction complexity. 由反应复杂度估算熵变 */
  entropyChange(reaction: Reaction): number {
    const dS = (reaction.products.length - reaction.reactants.length) * 50;
    this._recordHistory({ method: 'entropyChange', dS });
    return dS;
  }

  /** Standard entropy change from tabulated values. 由标准熵表计算熵变 */
  entropyChangeFromTable(
    products: Array<{ S: number; coefficient: number }>,
    reactants: Array<{ S: number; coefficient: number }>,
  ): number {
    const sumP = products.reduce((s, p) => s + p.S * p.coefficient, 0);
    const sumR = reactants.reduce((s, r) => s + r.S * r.coefficient, 0);
    const dS = sumP - sumR;
    this._recordHistory({ method: 'entropyChangeFromTable', dS });
    return dS;
  }

  /** Gibbs free energy ΔG = ΔH - TΔS (T in Kelvin). 吉布斯自由能 */
  gibbsFreeEnergy(H: number, S: number, T: number): number {
    const G = H - T * (S / 1000);
    this._recordHistory({ method: 'gibbsFreeEnergy', G });
    return G;
  }

  /** Gibbs free energy from formation values. 由生成自由能计算 */
  gibbsFromFormation(
    products: Array<{ dGf: number; coefficient: number }>,
    reactants: Array<{ dGf: number; coefficient: number }>,
  ): number {
    const sumP = products.reduce((s, p) => s + p.dGf * p.coefficient, 0);
    const sumR = reactants.reduce((s, r) => s + r.dGf * r.coefficient, 0);
    const dG = sumP - sumR;
    this._recordHistory({ method: 'gibbsFromFormation', dG });
    return dG;
  }

  /** Spontaneity classification from ΔG. 由 ΔG 判断自发性 */
  spontaneity(G: number): 'spontaneous' | 'nonspontaneous' | 'equilibrium' {
    let result: 'spontaneous' | 'nonspontaneous' | 'equilibrium';
    if (G < -1e-6) result = 'spontaneous';
    else if (G > 1e-6) result = 'nonspontaneous';
    else result = 'equilibrium';
    this._recordHistory({ method: 'spontaneity', G, result });
    return result;
  }

  /** Spontaneity table from ΔH and ΔS signs. 由 ΔH 和 ΔS 符号判断自发性 */
  spontaneityTable(dH: number, dS: number): {低温: string; 高温: string; description: string} {
    let low: string;
    let high: string;
    let desc: string;
    if (dH < 0 && dS > 0) {
      low = 'spontaneous';
      high = 'spontaneous';
      desc = 'always spontaneous';
    } else if (dH < 0 && dS < 0) {
      low = 'spontaneous';
      high = 'nonspontaneous';
      desc = 'spontaneous at low T';
    } else if (dH > 0 && dS > 0) {
      low = 'nonspontaneous';
      high = 'spontaneous';
      desc = 'spontaneous at high T';
    } else {
      low = 'nonspontaneous';
      high = 'nonspontaneous';
      desc = 'never spontaneous';
    }
    const result = { 低温: low, 高温: high, description: desc };
    this._recordHistory({ method: 'spontaneityTable', result });
    return result;
  }

  /** Equilibrium temperature where ΔG = 0: T_eq = ΔH/ΔS. 平衡温度 */
  equilibriumTemperature(dH: number, dS: number): number {
    if (dS === 0) return Infinity;
    const T = dH / dS;
    this._recordHistory({ method: 'equilibriumTemperature', T });
    return T;
  }

  /** Relationship between ΔG° and K: ΔG° = -RT ln K. ΔG° 与 K 的关系 */
  gibbsEquilibriumConstant(dG: number, T: number = TEMP_REF): number {
    const K = Math.exp(-dG / (R_GAS * T));
    this._recordHistory({ method: 'gibbsEquilibriumConstant', K });
    return K;
  }

  /** Compute K from ΔG°. 由 ΔG° 反算 K */
  equilibriumConstantFromGibbs(dG: number, T: number = TEMP_REF): number {
    return this.gibbsEquilibriumConstant(dG, T);
  }

  /** Compute ΔG° from K. 由 K 反算 ΔG° */
  gibbsFromEquilibriumConstant(K: number, T: number = TEMP_REF): number {
    if (K <= 0) return 0;
    const dG = -R_GAS * T * Math.log(K);
    this._recordHistory({ method: 'gibbsFromEquilibriumConstant', dG });
    return dG;
  }

  /** van't Hoff equation: d(ln K)/dT = ΔH°/(RT²). 范特霍夫方程 */
  vantHoff(K1: number, T1: number, T2: number, dH: number): number {
    const lnRatio = (dH / R_GAS) * (1 / T1 - 1 / T2);
    const K2 = K1 * Math.exp(lnRatio);
    this._recordHistory({ method: 'vantHoff', K2 });
    return K2;
  }

  /** Van't Hoff plot slope = -ΔH°/R. 范特霍夫图斜率 */
  vantHoffSlope(dH: number): number {
    const slope = -dH / R_GAS;
    this._recordHistory({ method: 'vantHoffSlope', slope });
    return slope;
  }

  /** Clausius-Clapeyron equation for vapor pressure. 克劳修斯-克拉珀龙方程 */
  clausiusClapeyron(P1: number, T1: number, T2: number, dHvap: number): number {
    const lnRatio = -(dHvap / R_GAS) * (1 / T2 - 1 / T1);
    const P2 = P1 * Math.exp(lnRatio);
    this._recordHistory({ method: 'clausiusClapeyron', P2 });
    return P2;
  }

  /** Boiling point at given pressure from Clausius-Clapeyron. 由克劳修斯-克拉珀龙方程计算沸点 */
  boilingPointAtPressure(P1: number, T1: number, P2: number, dHvap: number): number {
    // ln(P2/P1) = -dHvap/R * (1/T2 - 1/T1)
    if (P2 <= 0 || P1 <= 0) return T1;
    const ratio = Math.log(P2 / P1);
    const invT2 = 1 / T1 - (R_GAS * ratio) / dHvap;
    if (invT2 <= 0) return T1;
    const T2 = 1 / invT2;
    this._recordHistory({ method: 'boilingPointAtPressure', T2 });
    return T2;
  }

  /** Homogeneous catalysis descriptor. 均相催化 */
  homogeneousCatalysis(catalyst: string, substrate: string, enhancement: number): Catalysis {
    const cat: Catalysis = {
      type: 'homogeneous',
      catalyst,
      rateEnhancement: enhancement,
      mechanism: `${catalyst} forms intermediate with ${substrate} in same phase`,
    };
    this._catalyses.push(cat);
    this._recordHistory({ method: 'homogeneousCatalysis', catalyst });
    return cat;
  }

  /** Heterogeneous catalysis (surface). 多相催化 */
  heterogeneousCatalysis(catalyst: string, substrate: string, enhancement: number): Catalysis {
    const cat: Catalysis = {
      type: 'heterogeneous',
      catalyst,
      rateEnhancement: enhancement,
      mechanism: `adsorption of ${substrate} on ${catalyst} surface lowers Ea`,
    };
    this._catalyses.push(cat);
    this._recordHistory({ method: 'heterogeneousCatalysis', catalyst });
    return cat;
  }

  /** Acid catalysis. 酸催化 */
  acidCatalysis(acid: string, substrate: string): Catalysis {
    const cat: Catalysis = {
      type: 'acid',
      catalyst: acid,
      rateEnhancement: 100,
      mechanism: `${acid} protonates ${substrate}, increasing electrophilicity`,
    };
    this._catalyses.push(cat);
    this._recordHistory({ method: 'acidCatalysis', acid });
    return cat;
  }

  /** Base catalysis. 碱催化 */
  baseCatalysis(base: string, substrate: string): Catalysis {
    const cat: Catalysis = {
      type: 'base',
      catalyst: base,
      rateEnhancement: 100,
      mechanism: `${base} deprotonates ${substrate}, increasing nucleophilicity`,
    };
    this._catalyses.push(cat);
    this._recordHistory({ method: 'baseCatalysis', base });
    return cat;
  }

  /** Enzyme catalysis with Michaelis-Menten kinetics. 米氏酶催化动力学 */
  enzymeCatalysis(enzyme: string, Vmax: number, Km: number, substrate: number): MichaelisMenten {
    const rate = (Vmax * substrate) / (Km + substrate);
    const saturation = substrate / (Km + substrate);
    const turnover = Vmax / 1e-6; // assume 1 µM enzyme
    const result: MichaelisMenten = {
      Vmax,
      Km,
      rate,
      saturation,
      turnover,
    };
    const cat: Catalysis = {
      type: 'enzyme',
      catalyst: enzyme,
      rateEnhancement: 1e6,
      mechanism: `E + S -> ES -> E + P (Vmax=${Vmax}, Km=${Km})`,
    };
    this._catalyses.push(cat);
    this._recordHistory({ method: 'enzymeCatalysis', rate });
    return result;
  }

  /** Lineweaver-Burk plot parameters. Lineweaver-Burk 双倒数作图参数 */
  lineweaverBurk(Vmax: number, Km: number): { slope: number; intercept: number; xIntercept: number } {
    const slope = Km / Vmax;
    const intercept = 1 / Vmax;
    const xIntercept = -1 / Km;
    this._recordHistory({ method: 'lineweaverBurk' });
    return { slope, intercept, xIntercept };
  }

  /** Determine inhibition type from kinetic data. 由动力学数据判断抑制类型 */
  inhibitionType(
    KmNormal: number, VmaxNormal: number,
    KmInhib: number, VmaxInhib: number,
  ): 'competitive' | 'uncompetitive' | 'noncompetitive' | 'mixed' | 'none' {
    if (KmInhib === KmNormal && VmaxInhib === VmaxNormal) return 'none';
    if (VmaxInhib === VmaxNormal && KmInhib > KmNormal) return 'competitive';
    if (VmaxInhib < VmaxNormal && KmInhib === KmNormal) return 'noncompetitive';
    if (VmaxInhib < VmaxNormal && KmInhib < KmNormal) return 'uncompetitive';
    return 'mixed';
  }

  /** Reaction mechanism analysis with rate-determining step. 含速控步的反应机理分析 */
  mechanism(steps: Array<{ reactants: string[]; products: string[]; k: number; reversible?: boolean }>): Mechanism {
    const stepsWithIndex: MechanismStep[] = steps.map((s, i) => ({
      step: i + 1,
      reactants: s.reactants,
      products: s.products,
      rateConstant: s.k,
      reversible: s.reversible ?? false,
    }));
    // Find slowest step (lowest k)
    let rdsIdx = 0;
    let minK = Infinity;
    for (let i = 0; i < stepsWithIndex.length; i++) {
      if (stepsWithIndex[i].rateConstant < minK) {
        minK = stepsWithIndex[i].rateConstant;
        rdsIdx = i;
      }
    }
    // Identify intermediates (products of one step that are reactants of next)
    const allProducts = new Set<string>();
    const allReactants = new Set<string>();
    for (const s of stepsWithIndex) {
      for (const p of s.products) allProducts.add(p);
      for (const r of s.reactants) allReactants.add(r);
    }
    const intermediates = [...allProducts].filter(p => allReactants.has(p));
    const rateLaw = `rate = k${rdsIdx + 1}[${stepsWithIndex[rdsIdx].reactants.join('][')}]`;
    const overall = `${stepsWithIndex[0].reactants.join('+')} -> ${stepsWithIndex[stepsWithIndex.length - 1].products.join('+')}`;
    const result: Mechanism = {
      steps: stepsWithIndex,
      rateDeterminingStep: rdsIdx + 1,
      rateLaw,
      intermediates,
      overallEquation: overall,
    };
    this._mechanisms.push(result);
    this._recordHistory({ method: 'mechanism', rds: rdsIdx + 1 });
    return result;
  }

  /** Steady-state approximation for intermediates. 稳态近似 */
  steadyStateApproximation(intermediate: string, formationRate: number, consumptionRate: number): number {
    // d[intermediate]/dt = formationRate - consumptionRate*[I] = 0
    // [I]ss = formationRate / consumptionRate
    if (consumptionRate === 0) return 0;
    const concentration = formationRate / consumptionRate;
    this._recordHistory({ method: 'steadyStateApproximation', intermediate, concentration });
    return concentration;
  }

  /** Pre-equilibrium approximation. 平衡前近似 */
  preEquilibriumApproximation(K: number, k: number, reactantConc: number): number {
    // rate = K * k * [reactant]
    const rate = K * k * reactantConc;
    this._recordHistory({ method: 'preEquilibriumApproximation', rate });
    return rate;
  }

  /** Chain reaction descriptor. 链反应 */
  chainReaction(
    initiation: string,
    propagation: string[],
    termination: string[],
    branching: boolean = false,
  ): ChainReaction {
    // Chain length = propagation rate / termination rate (approximated)
    const chainLength = branching ? Infinity : Math.max(1, propagation.length * 100);
    const result: ChainReaction = {
      initiation,
      propagation,
      termination,
      chainLength,
      branching,
    };
    this._chainReactions.push(result);
    this._recordHistory({ method: 'chainReaction', chainLength });
    return result;
  }

  /** Photochemical reaction analysis. 光化学反应分析 */
  photochemicalReaction(
    wavelength: number,
    quantumYield: number,
    primaryProcess: string,
    secondaryProcess: string = '',
  ): PhotochemicalReaction {
    const h = 6.626e-34;
    const c = 3.0e8;
    const photonEnergy = (h * c) / (wavelength * 1e-9); // in Joules
    const result: PhotochemicalReaction = {
      wavelength,
      photonEnergy,
      quantumYield,
      primaryProcess,
      secondaryProcess,
    };
    this._photochemical.push(result);
    this._recordHistory({ method: 'photochemicalReaction', wavelength });
    return result;
  }

  /** Stark-Einstein law: one molecule reacts per photon absorbed. 斯塔克-爱因斯坦定律 */
  starkEinsteinLaw(photonsAbsorbed: number, quantumYield: number = 1): number {
    const moleculesReacted = photonsAbsorbed * quantumYield;
    this._recordHistory({ method: 'starkEinsteinLaw', moleculesReacted });
    return moleculesReacted;
  }

  /** Photosensitization: transfer energy from sensitizer to substrate. 光敏化 */
  photosensitization(sensitizer: string, substrate: string, efficiency: number): { process: string; rate: number } {
    const process = `${sensitizer} + hν → ${sensitizer}* → ${sensitizer} + ${substrate}*`;
    const rate = efficiency;
    this._recordHistory({ method: 'photosensitization', rate });
    return { process, rate };
  }

  /** Explosion limits for chain-branching reactions. 链支化爆炸极限 */
  explosionLimits(compound: string, lowerPct: number, upperPct: number): Explosion {
    const result: Explosion = {
      type: 'chain-branching',
      lowerExplosionLimit: lowerPct,
      upperExplosionLimit: upperPct,
      detonationVelocity: 1800 + compound.length * 50,
      pressureRatio: 8,
    };
    this._recordHistory({ method: 'explosionLimits', compound });
    return result;
  }

  /** Ionic strength I = 0.5 * Σ ci * zi². 离子强度 */
  ionicStrength(ions: Array<{ concentration: number; charge: number }>): number {
    const I = ions.reduce((s, i) => s + i.concentration * i.charge * i.charge, 0) * 0.5;
    this._recordHistory({ method: 'ionicStrength', I });
    return I;
  }

  /** Debye-Hückel limiting law: log10(γ) = -A * z² * sqrt(I). 德拜-休克尔极限定律 */
  debyeHuckelLimiting(z: number, I: number, A: number = 0.509): number {
    const logGamma = -A * z * z * Math.sqrt(I);
    const gamma = Math.pow(10, logGamma);
    this._recordHistory({ method: 'debyeHuckelLimiting', gamma });
    return gamma;
  }

  /** Extended Debye-Hückel equation: log10(γ) = -A z² √I / (1 + B a √I). 扩展德拜-休克尔方程 */
  debyeHuckelExtended(z: number, I: number, a: number, A: number = 0.509, B: number = 0.328): number {
    const denom = 1 + B * a * Math.sqrt(I);
    const logGamma = denom > 0 ? (-A * z * z * Math.sqrt(I)) / denom : 0;
    const gamma = Math.pow(10, logGamma);
    this._recordHistory({ method: 'debyeHuckelExtended', gamma });
    return gamma;
  }

  /** Activity analysis with ionic strength correction. 含离子强度校正的活度分析 */
  activityAnalysis(
    K: number,
    species: Array<{ concentration: number; charge: number; sizeParam?: number }>,
  ): ActivityAnalysis {
    const I = this.ionicStrength(species.map(s => ({ concentration: s.concentration, charge: s.charge })));
    const activityCoeffs = species.map(s => {
      if (s.sizeParam) return this.debyeHuckelExtended(s.charge, I, s.sizeParam);
      return this.debyeHuckelLimiting(s.charge, I);
    });
    let Q = 1;
    for (let i = 0; i < species.length; i++) {
      Q *= species[i].concentration * activityCoeffs[i];
    }
    let direction: 'forward' | 'reverse' | 'none' = 'none';
    if (Q < K) direction = 'forward';
    else if (Q > K) direction = 'reverse';
    const result: ActivityAnalysis = {
      Q,
      K,
      ionicStrength: I,
      activityCoefficients: activityCoeffs,
      direction,
    };
    this._recordHistory({ method: 'activityAnalysis', Q, K, I });
    return result;
  }

  /** Buffer capacity β = dCb/dpH. 缓冲容量 */
  bufferCapacity(acidConc: number, saltConc: number, Ka: number): BufferCapacity {
    const pKa = -Math.log10(Ka);
    const pH = pKa + Math.log10(saltConc / acidConc);
    // Buffer capacity (van Slyke equation): β = 2.303 * C * Ka * [H+] / (Ka + [H+])²
    const H = Math.pow(10, -pH);
    const C = acidConc + saltConc;
    const capacity = 2.303 * C * Ka * H / Math.pow(Ka + H, 2);
    const result: BufferCapacity = {
      pH,
      capacity,
      range: [pKa - 1, pKa + 1],
      optimalRatio: 1,
    };
    this._recordHistory({ method: 'bufferCapacity', pH, capacity });
    return result;
  }

  /** Common ion effect on solubility. 同离子效应 */
  commonIonEffect(Ksp: number, commonIonConc: number): { solubility: number; reduction: number } {
    // Ksp = s * (s + commonIonConc) ≈ s * commonIonConc when commonIonConc >> s
    const solubilityNoCommon = Math.sqrt(Ksp);
    const solubility = Ksp / commonIonConc;
    const reduction = ((solubilityNoCommon - solubility) / solubilityNoCommon) * 100;
    this._recordHistory({ method: 'commonIonEffect', solubility });
    return { solubility, reduction: Math.max(0, reduction) };
  }

  /** Solubility product analysis. 溶度积分析 */
  solubilityProduct(Ksp: number, ionCharges: number[]): { solubility: number; ionConcentrations: number[] } {
    if (ionCharges.length === 0) return { solubility: 0, ionConcentrations: [] };
    if (ionCharges.length === 2 && ionCharges[0] === 1 && ionCharges[1] === 1) {
      const s = Math.sqrt(Ksp);
      return { solubility: s, ionConcentrations: [s, s] };
    }
    if (ionCharges.length === 2 && ionCharges[0] === 2 && ionCharges[1] === 2) {
      const s = Math.pow(Ksp, 1 / 3) / Math.pow(4, 1 / 3);
      return { solubility: s, ionConcentrations: [s, s] };
    }
    // Generic: Ksp = product(s^|charge_i|)
    let s = Math.pow(Ksp, 1 / ionCharges.reduce((sum, c) => sum + Math.abs(c), 0));
    this._recordHistory({ method: 'solubilityProduct', s });
    return { solubility: s, ionConcentrations: ionCharges.map(c => s) };
  }

  /** Complex ion formation and stability. 配离子形成与稳定性 */
  complexFormation(Kf: number, metalConc: number, ligandConc: number, n: number): { complexConc: number; freeMetal: number } {
    // Kf = [MLn] / ([M][L]^n)
    if (ligandConc === 0) return { complexConc: 0, freeMetal: metalConc };
    const numerator = Kf * metalConc * Math.pow(ligandConc, n);
    const denom = 1 + Kf * Math.pow(ligandConc, n);
    const complexConc = numerator / denom;
    const freeMetal = metalConc - complexConc;
    this._recordHistory({ method: 'complexFormation', complexConc });
    return { complexConc, freeMetal: Math.max(0, freeMetal) };
  }

  /** Reaction quotient with stoichiometric coefficients. 含化学计量数的反应商 */
  reactionQuotient(species: Array<{ concentration: number; coefficient: number; isProduct: boolean }>): number {
    let numerator = 1;
    let denominator = 1;
    for (const s of species) {
      if (s.isProduct) numerator *= Math.pow(s.concentration, s.coefficient);
      else denominator *= Math.pow(s.concentration, s.coefficient);
    }
    const Q = denominator > 0 ? numerator / denominator : 0;
    this._recordHistory({ method: 'reactionQuotient', Q });
    return Q;
  }

  /** ICE table computation (Initial, Change, Equilibrium). ICE 表计算 */
  iceTable(
    K: number,
    initial: Array<{ reactant: boolean; conc: number; coefficient: number }>,
  ): { equilibrium: number[]; x: number } {
    // Simplified: assume x is the extent of reaction
    // For aA + bB <=> cC + dD, K = ([C]0 + cx)^c / (([A]0 - ax)^a * ([B]0 - bx)^b)
    // Solve numerically via bisection for simple 1:1 case
    if (initial.length < 2) return { equilibrium: initial.map(i => i.conc), x: 0 };
    const xMax = Math.min(...initial.filter(i => i.reactant).map(i => i.conc / i.coefficient));
    let lo = 0, hi = xMax;
    for (let iter = 0; iter < 100; iter++) {
      const mid = (lo + hi) / 2;
      let num = 1, den = 1;
      for (const s of initial) {
        if (s.reactant) den *= Math.pow(s.conc - s.coefficient * mid, s.coefficient);
        else num *= Math.pow(s.conc + s.coefficient * mid, s.coefficient);
      }
      const Q = den > 0 ? num / den : 0;
      if (Q < K) lo = mid;
      else hi = mid;
    }
    const x = (lo + hi) / 2;
    const equilibrium = initial.map(s => s.reactant ? s.conc - s.coefficient * x : s.conc + s.coefficient * x);
    this._recordHistory({ method: 'iceTable', x });
    return { equilibrium, x };
  }

  /** Reaction selectivity between competing pathways. 反应选择性 */
  selectivity(majorProduct: number, minorProduct: number): number {
    const total = majorProduct + minorProduct;
    if (total === 0) return 0;
    const selectivity = (majorProduct / total) * 100;
    this._recordHistory({ method: 'selectivity', selectivity });
    return selectivity;
  }

  /** Reaction yield with side reactions. 含副反应的产率 */
  reactionYieldWithSideReaction(
    mainRate: number, sideRate: number, time: number,
  ): { mainYield: number; sideYield: number; mainSelectivity: number } {
    const main = mainRate * time;
    const side = sideRate * time;
    const mainYield = main / (main + side) * 100;
    const sideYield = side / (main + side) * 100;
    this._recordHistory({ method: 'reactionYieldWithSideReaction', mainYield });
    return { mainYield, sideYield, mainSelectivity: mainYield };
  }

  /** Half-life for n-th order reaction. n 级反应半衰期 */
  halfLifeNthOrder(n: number, k: number, A0: number): number {
    if (n === 1) return Math.log(2) / k;
    if (n <= 0 || A0 <= 0) return 0;
    const t12 = (Math.pow(2, n - 1) - 1) / ((n - 1) * k * Math.pow(A0, n - 1));
    this._recordHistory({ method: 'halfLifeNthOrder', n, t12 });
    return t12;
  }

  /** Fractional life (time for fraction f to react). 分数寿期 */
  fractionalLife(f: number, n: number, k: number, A0: number): number {
    if (n === 1) {
      const t = -Math.log(1 - f) / k;
      this._recordHistory({ method: 'fractionalLife', t });
      return t;
    }
    if (n <= 0 || A0 <= 0) return 0;
    const t = (Math.pow(1 / (1 - f), n - 1) - 1) / ((n - 1) * k * Math.pow(A0, n - 1));
    this._recordHistory({ method: 'fractionalLife', t });
    return t;
  }

  /** Look up common rate constant by reaction string. 查询常见反应速率常数 */
  lookupRateConstant(reactionKey: string): number {
    const k = COMMON_RATE_CONSTANTS[reactionKey] ?? 0;
    this._recordHistory({ method: 'lookupRateConstant', reactionKey, k });
    return k;
  }

  /** Hammond postulate analysis: transition state resembles nearest stable species. 哈蒙德假设分析 */
  hammondPostulate(Ea: number, dH: number): 'reactant-like' | 'product-like' | 'intermediate' {
    let result: 'reactant-like' | 'product-like' | 'intermediate';
    if (Ea < Math.abs(dH) / 2) result = 'reactant-like';
    else if (Ea > Math.abs(dH) * 1.5) result = 'product-like';
    else result = 'intermediate';
    this._recordHistory({ method: 'hammondPostulate', result });
    return result;
  }

  /** Kinetic isotope effect kH/kD. 动力学同位素效应 */
  kineticIsotopeEffect(EaH: number, EaD: number, T: number): number {
    // kH/kD = exp((EaD - EaH)/(RT))
    const kHkD = Math.exp((EaD - EaH) / (R_GAS * T));
    this._recordHistory({ method: 'kineticIsotopeEffect', kHkD });
    return kHkD;
  }

  /** Beer-Lambert law for photochemical absorbance. 朗伯-比尔定律（光化学） */
  beerLambertAbsorbance(epsilon: number, c: number, l: number): number {
    const A = epsilon * c * l;
    this._recordHistory({ method: 'beerLambertAbsorbance', A });
    return A;
  }

  /** Convert absorbance to transmittance. 吸光度转透光率 */
  absorbanceToTransmittance(A: number): number {
    const T = Math.pow(10, -A);
    this._recordHistory({ method: 'absorbanceToTransmittance', T });
    return T;
  }

  /** Reaction enthalpy at temperature T using Kirchhoff's law. 基尔霍夫定律计算温度 T 下的焓变 */
  kirchhoffLaw(dH298: number, dCp: number, T: number): number {
    const dHT = dH298 + dCp * (T - TEMP_REF);
    this._recordHistory({ method: 'kirchhoffLaw', dHT });
    return dHT;
  }

  /** Adiabatic flame temperature estimate. 绝热火焰温度估算 */
  adiabaticFlameTemperature(
    dHcombustion: number, CpProducts: number, T0: number = TEMP_REF,
  ): number {
    if (CpProducts === 0) return T0;
    const Tad = T0 + (-dHcombustion) / CpProducts;
    this._recordHistory({ method: 'adiabaticFlameTemperature', Tad });
    return Tad;
  }

  /** Reaction equilibrium from partial pressures (gas phase). 由分压计算气相平衡 */
  equilibriumFromPressures(Kp: number, pressures: number[]): Equilibrium {
    let Qp = 1;
    for (const p of pressures) Qp *= p;
    let direction: 'forward' | 'reverse' | 'none' = 'none';
    if (Qp < Kp) direction = 'forward';
    else if (Qp > Kp) direction = 'reverse';
    const description = Qp === Kp ? 'at equilibrium' : `shifts ${direction}`;
    const result: Equilibrium = { K: Kp, Q: Qp, direction, description };
    this._recordHistory({ method: 'equilibriumFromPressures', Qp });
    return result;
  }

  /** Convert Kp to Kc: Kp = Kc(RT)^Δn. Kp 与 Kc 转换 */
  kpToKc(Kp: number, deltaN: number, T: number = TEMP_REF): number {
    const R_L = 0.08206; // L·atm/(mol·K)
    const Kc = Kp / Math.pow(R_L * T, deltaN);
    this._recordHistory({ method: 'kpToKc', Kc });
    return Kc;
  }

  /** Convert Kc to Kp. Kc 转 Kp */
  kcToKp(Kc: number, deltaN: number, T: number = TEMP_REF): number {
    const R_L = 0.08206;
    const Kp = Kc * Math.pow(R_L * T, deltaN);
    this._recordHistory({ method: 'kcToKp', Kp });
    return Kp;
  }

  /** Reaction spontaneity including non-standard conditions. 非标准条件下的反应自发性 */
  nonstandardSpontaneity(dGstandard: number, Q: number, T: number = TEMP_REF): { dG: number; spontaneous: boolean } {
    const dG = dGstandard + R_GAS * T * Math.log(Q > 0 ? Q : 1e-300);
    this._recordHistory({ method: 'nonstandardSpontaneity', dG });
    return { dG, spontaneous: dG < 0 };
  }

  /** Reaction coupling: drive non-spontaneous reaction via spontaneous one. 反应偶联 */
  coupledReaction(dG1: number, dG2: number): { dGtotal: number; spontaneous: boolean } {
    const dGtotal = dG1 + dG2;
    this._recordHistory({ method: 'coupledReaction', dGtotal });
    return { dGtotal, spontaneous: dGtotal < 0 };
  }

  /** Standard enthalpy of neutralization (strong acid + strong base). 强酸强碱中和焓 */
  enthalpyOfNeutralization(strong: boolean = true): number {
    const dH = strong ? -57.1 : -50;
    this._recordHistory({ method: 'enthalpyOfNeutralization', dH });
    return dH;
  }

  /** Lattice energy via Born-Landé equation. Born-Landé 晶格能 */
  bornLandeLatticeEnergy(
    zPlus: number, zMinus: number, r0: number, M: number, nBorn: number,
  ): number {
    // U = -M * z+ * z- * e² / (4π ε0 r0) * (1 - 1/n)
    // Using simplified form with kJ/mol constants
    const e = 1.602e-19;
    const epsilon0 = 8.854e-12;
    const NA = 6.022e23;
    const r0m = r0 * 1e-12; // pm to m
    const U_J = -(M * zPlus * zMinus * e * e) / (4 * Math.PI * epsilon0 * r0m) * (1 - 1 / nBorn);
    const U_kJ = (U_J * NA) / 1000;
    this._recordHistory({ method: 'bornLandeLatticeEnergy', U_kJ });
    return U_kJ;
  }

  /** Born-Haber cycle analysis for ionic compound formation. Born-Haber 循环分析 */
  bornHaberCycle(
    dHf: number, sublimation: number, bondDissociation: number, ie: number[], ea: number[], latticeEnergy: number,
  ): number {
    const sumIE = ie.reduce((s, v) => s + v, 0);
    const sumEA = ea.reduce((s, v) => s + v, 0);
    // dHf = sub + 0.5*bond + IE + EA + U
    // Solve for missing quantity; here we verify by returning sum
    const calc = sublimation + 0.5 * bondDissociation + sumIE + sumEA + latticeEnergy;
    const discrepancy = dHf - calc;
    this._recordHistory({ method: 'bornHaberCycle', discrepancy });
    return discrepancy;
  }

  /** Henderson-Hasselbalch for buffer pH. Henderson-Hasselbalch 缓冲方程 */
  hendersonHasselbalch(pKa: number, acidConc: number, baseConc: number): number {
    if (acidConc <= 0) return pKa;
    const pH = pKa + Math.log10(baseConc / acidConc);
    this._recordHistory({ method: 'hendersonHasselbalch', pH });
    return pH;
  }

  /** Rate-determining step approximation: rate = k[RDS reactants]. 速控步近似 */
  rateDeterminingStep(kRDS: number, reactantConcs: number[]): number {
    const rate = kRDS * reactantConcs.reduce((s, c) => s * c, 1);
    this._recordHistory({ method: 'rateDeterminingStep', rate });
    return rate;
  }

  /** Effectiveness factor for heterogeneous catalysis (Thiele modulus). 多相催化的效率因子 */
  thieleModulus(k: number, R: number, Deff: number, n: number = 1): number {
    // φ = R * sqrt(k * C0^(n-1) / Deff)
    if (Deff === 0) return 0;
    const phi = R * Math.sqrt(k / Deff);
    this._recordHistory({ method: 'thieleModulus', phi });
    return phi;
  }

  /** Effectiveness factor η = tanh(φ)/φ for first-order. 一级反应效率因子 */
  effectivenessFactor(phi: number): number {
    if (phi === 0) return 1;
    const eta = Math.tanh(phi) / phi;
    this._recordHistory({ method: 'effectivenessFactor', eta });
    return eta;
  }

  /** Arrhenius frequency factor from collision frequency. 由碰撞频率计算阿伦尼乌斯指前因子 */
  frequencyFactor(sigma: number, mu: number, T: number): number {
    const NA = 6.022e23;
    const kB = 1.381e-23;
    const A = sigma * Math.sqrt(8 * Math.PI * kB * T / mu) * NA;
    this._recordHistory({ method: 'frequencyFactor', A });
    return A;
  }

  /** Quantitative structure-activity relationship (QSAR) estimate. 定量构效关系估算 */
  qsarEstimate(
    descriptors: number[], weights: number[], intercept: number = 0,
  ): number {
    let activity = intercept;
    for (let i = 0; i < descriptors.length; i++) {
      activity += descriptors[i] * (weights[i] ?? 0);
    }
    this._recordHistory({ method: 'qsarEstimate', activity });
    return activity;
  }

  /** Reaction order from initial rate method. 由初始速率法求反应级数 */
  reactionOrderFromInitialRates(
    experiments: Array<{ rate: number; concentrations: number[] }>,
  ): number[] {
    if (experiments.length < 2) return [];
    const orders: number[] = [];
    const base = experiments[0];
    for (let i = 0; i < base.concentrations.length; i++) {
      for (let j = 1; j < experiments.length; j++) {
        const other = experiments[j];
        if (other.concentrations[i] !== base.concentrations[i]) {
          // Vary only one concentration to find order
          const ratio = Math.log(other.rate / base.rate) / Math.log(other.concentrations[i] / base.concentrations[i]);
          if (!Number.isNaN(ratio)) {
            orders.push(ratio);
            break;
          }
        }
      }
    }
    this._recordHistory({ method: 'reactionOrderFromInitialRates', orders });
    return orders;
  }

  /** Activation energy from three or more (T, k) data points. 由多个温度数据点计算活化能 */
  activationEnergyFromArrheniusPlot(data: Array<{ T: number; k: number }>): number {
    if (data.length < 2) return 0;
    // Linear regression: ln(k) = ln(A) - Ea/R * (1/T)
    const x = data.map(d => 1 / d.T);
    const y = data.map(d => Math.log(d.k));
    const n = data.length;
    const sumX = x.reduce((s, v) => s + v, 0);
    const sumY = y.reduce((s, v) => s + v, 0);
    const sumXY = x.reduce((s, v, i) => s + v * y[i], 0);
    const sumXX = x.reduce((s, v) => s + v * v, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const Ea = -slope * R_GAS;
    this._recordHistory({ method: 'activationEnergyFromArrheniusPlot', Ea });
    return Ea;
  }

  /** Identify consecutive reaction A -> B -> C maximum [B]. 连续反应中 [B] 的最大值 */
  consecutiveReactionMaxB(k1: number, k2: number, A0: number): { tMax: number; Bmax: number } {
    if (k1 === k2 || k1 === 0) return { tMax: 0, Bmax: 0 };
    const tMax = Math.log(k2 / k1) / (k2 - k1);
    const Bmax = A0 * Math.pow(k1 / k2, k2 / (k2 - k1));
    this._recordHistory({ method: 'consecutiveReactionMaxB', tMax, Bmax });
    return { tMax, Bmax };
  }

  /** Parallel reaction selectivity. 平行反应选择性 */
  parallelReactionSelectivity(k1: number, k2: number, A: number, n1: number = 1, n2: number = 1): { ratio1: number; ratio2: number } {
    const rate1 = k1 * Math.pow(A, n1);
    const rate2 = k2 * Math.pow(A, n2);
    const total = rate1 + rate2;
    if (total === 0) return { ratio1: 0, ratio2: 0 };
    this._recordHistory({ method: 'parallelReactionSelectivity' });
    return { ratio1: rate1 / total, ratio2: rate2 / total };
  }

  /** Reversible first-order reaction kinetics. 可逆一级反应动力学 */
  reversibleFirstOrder(kf: number, kr: number, A0: number, B0: number = 0, t: number): { A: number; B: number; equilibrium: { A: number; B: number } } {
    const K = kf / kr;
    const Aeq = (A0 + B0) / (1 + K);
    const Beq = K * Aeq;
    const A = Aeq + (A0 - Aeq) * Math.exp(-(kf + kr) * t);
    const B = Beq + (B0 - Beq) * Math.exp(-(kf + kr) * t);
    this._recordHistory({ method: 'reversibleFirstOrder' });
    return { A, B, equilibrium: { A: Aeq, B: Beq } };
  }

  /** Lindemann mechanism for unimolecular reactions. 林德曼单分子反应机理 */
  lindemannMechanism(k1: number, k2: number, k3: number, A: number, M: number): { rate: number; order: string } {
    // High pressure: rate = k3*k1/(k2) * [A] (first order)
    // Low pressure: rate = k1 * [A][M] (second order)
    const rateHigh = (k3 * k1 / k2) * A;
    const rateLow = k1 * A * M;
    const totalRate = (rateHigh * rateLow) / (rateHigh + rateLow);
    const order = M > 100 ? 'first-order (high pressure)' : M < 0.01 ? 'second-order (low pressure)' : 'mixed';
    this._recordHistory({ method: 'lindemannMechanism', totalRate });
    return { rate: totalRate, order };
  }

  /** Overall reaction order from stoichiometry of elementary steps. 由基元反应化学计量数求总反应级数 */
  elementaryStepOrder(reactants: string[]): number {
    // Molecularity = number of reactant molecules in an elementary step
    const order = reactants.length;
    this._recordHistory({ method: 'elementaryStepOrder', order });
    return order;
  }

  /** Reaction yield based on theoretical and actual. 由理论产量与实际产量计算产率 */
  yieldPercent(actual: number, theoretical: number): number {
    if (theoretical <= 0) return 0;
    const pct = (actual / theoretical) * 100;
    this._recordHistory({ method: 'yieldPercent', pct });
    return pct;
  }

  /** Atom economy (green chemistry metric). 原子经济性 */
  atomEconomy(desiredProductMass: number, totalReactantMass: number): number {
    if (totalReactantMass <= 0) return 0;
    const pct = (desiredProductMass / totalReactantMass) * 100;
    this._recordHistory({ method: 'atomEconomy', pct });
    return pct;
  }

  /** E-factor (green chemistry waste metric). E-因子 */
  eFactor(totalWasteKg: number, totalProductKg: number): number {
    if (totalProductKg <= 0) return 0;
    const e = totalWasteKg / totalProductKg;
    this._recordHistory({ method: 'eFactor', e });
    return e;
  }

  /** Private history recorder (capped at 200 entries). 私有历史记录方法 */
  private _recordHistory(entry: unknown): void {
    this._history.push(entry);
    if (this._history.length > 200) {
      this._history.shift();
    }
  }

  toPacket(): DataPacket<{
    reactions: Reaction[];
    rates: ReactionRate[];
    catalyses: Catalysis[];
    mechanisms: Mechanism[];
    chainReactions: ChainReaction[];
    photochemical: PhotochemicalReaction[];
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
        catalyses: this._catalyses,
        mechanisms: this._mechanisms,
        chainReactions: this._chainReactions,
        photochemical: this._photochemical,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._reactions = [];
    this._rates = [];
    this._catalyses = [];
    this._mechanisms = [];
    this._chainReactions = [];
    this._photochemical = [];
    this._history = [];
    this._counter = 0;
  }

  get reactionCount(): number {
    return this._reactions.length;
  }

  get rateCount(): number {
    return this._rates.length;
  }

  get catalysisCount(): number {
    return this._catalyses.length;
  }

  get mechanismCount(): number {
    return this._mechanisms.length;
  }

  get chainReactionCount(): number {
    return this._chainReactions.length;
  }

  get photochemicalCount(): number {
    return this._photochemical.length;
  }

  get historyDepth(): number {
    return this._history.length;
  }
}
