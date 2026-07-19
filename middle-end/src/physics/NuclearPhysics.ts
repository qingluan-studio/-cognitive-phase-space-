/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 核物理 —— 强力与弱力的疆域
 * Nuclear Physics: The Realm of Strong and Weak Forces
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 从结合能到链式反应，核物理揭示了原子核内部的强力与弱力。
 * 质量亏损化作能量，半衰期刻画衰变，而裂变与聚变则是恒星与文明的能量之源。
 */

import { DataPacket } from '../shared/types';

/** 原子核：质子数、中子数与结合能。 */
export interface Nucleus {
  readonly protons: number;
  readonly neutrons: number;
  readonly bindingEnergy: number;
  readonly massNumber: number;
}

/** 衰变过程：类型、半衰期与释放能量。 */
export interface DecayProcess {
  readonly type: 'alpha' | 'beta-' | 'beta+' | 'gamma';
  readonly halfLife: number;
  readonly energy: number;
}

/** 核反应：反应物、产物与释放能量。 */
export interface NuclearReaction {
  readonly reactants: string[];
  readonly products: string[];
  readonly energy: number;
  readonly conserved: boolean;
}

type NucleusRecord = {
  readonly id: string;
  readonly nucleus: Nucleus;
  readonly timestamp: number;
};

type DecayRecord = {
  readonly id: string;
  readonly decay: DecayProcess;
  readonly timestamp: number;
};

type ReactionRecord = {
  readonly id: string;
  readonly reaction: NuclearReaction;
  readonly timestamp: number;
};

/** 光速 (m/s)。 */
const C_LIGHT = 299792458;
/** 原子质量单位 (kg)。 */
const U_MASS = 1.66053906660e-27;
/** 氢原子质量 (kg, ~1.007825 u)。 */
const M_H = 1.007825 * U_MASS;
/** 中子质量 (kg, ~1.008665 u)。 */
const M_N = 1.008665 * U_MASS;
/** 电子伏特到焦耳换算。 */
const EV = 1.602176634e-19;

export class NuclearPhysics {
  private _nuclei: Map<string, NucleusRecord> = new Map();
  private _decays: Map<string, DecayRecord> = new Map();
  private _reactions: Map<string, ReactionRecord> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get nucleusCount(): number { return this._nuclei.size; }
  get decayCount(): number { return this._decays.size; }
  get reactionCount(): number { return this._reactions.size; }
  get history(): string[] { return [...this._history]; }

  /**
   * 结合能：B = Δm * c²
   * Nuclear binding energy from mass defect
   */
  public bindingEnergy(Z: number, N: number): { bindingEnergy: number; perNucleon: number } {
    if (Z < 0 || N < 0) throw new Error('Z and N must be non-negative');
    const A = Z + N;
    if (A === 0) return { bindingEnergy: 0, perNucleon: 0 };
    const massDefect = Z * M_H + N * M_N - this._approximateNuclearMass(Z, N);
    const bindingEnergy = massDefect * C_LIGHT * C_LIGHT;
    const perNucleon = bindingEnergy / A;
    this._recordHistory(
      `bindingEnergy: Z=${Z}, N=${N} -> B=${bindingEnergy} J (${perNucleon / EV} eV/A)`,
    );
    return { bindingEnergy, perNucleon };
  }

  /**
   * 质量亏损：Δm = Z*m_H + N*m_N - m_nucleus
   * Mass defect
   */
  public massDefect(Z: number, N: number): { defect: number; energyEquivalent: number } {
    if (Z < 0 || N < 0) throw new Error('Z and N must be non-negative');
    const massDefect = Z * M_H + N * M_N - this._approximateNuclearMass(Z, N);
    const energyEquivalent = massDefect * C_LIGHT * C_LIGHT;
    this._recordHistory(`massDefect: Z=${Z}, N=${N} -> Δm=${massDefect} kg`);
    return { defect: massDefect, energyEquivalent };
  }

  /**
   * 半经验质量公式（Weizsäcker）：B(Z,A) = aV*A - aS*A^(2/3) - ...
   * Semi-empirical mass formula (SEMF)
   */
  public semiEmpiricalMassFormula(Z: number, A: number): {
    bindingEnergy: number;
    perNucleon: number;
  } {
    if (Z < 0 || A <= 0 || Z > A) throw new Error('Invalid Z and A: 0 ≤ Z ≤ A, A > 0');
    const N = A - Z;
    const aV = 15.75 * EV;
    const aS = 17.8 * EV;
    const aC = 0.711 * EV;
    const aA = 23.7 * EV;
    const aP = 11.18 * EV;
    const volume = aV * A;
    const surface = aS * Math.pow(A, 2 / 3);
    const coulomb = aC * (Z * (Z - 1)) / Math.pow(A, 1 / 3);
    const asymmetry = aA * Math.pow(N - Z, 2) / A;
    const delta =
      Z % 2 === 0 && N % 2 === 0
        ? aP / Math.sqrt(A)
        : Z % 2 === 1 && N % 2 === 1
          ? -aP / Math.sqrt(A)
          : 0;
    const bindingEnergy = volume - surface - coulomb - asymmetry + delta;
    const perNucleon = bindingEnergy / A;
    this._registerNucleus({
      protons: Z,
      neutrons: N,
      bindingEnergy,
      massNumber: A,
    });
    this._recordHistory(
      `semiEmpiricalMassFormula: Z=${Z}, A=${A} -> B=${bindingEnergy} J`,
    );
    return { bindingEnergy, perNucleon };
  }

  /**
   * α 衰变：父核 → 子核 + ⁴He
   * Alpha decay
   */
  public alphaDecay(parent: Nucleus, daughter: Nucleus, energy: number): DecayProcess {
    const decay: DecayProcess = { type: 'alpha', halfLife: 0, energy };
    const id = this._generateId();
    this._decays.set(id, { id, decay, timestamp: Date.now() });
    this._recordHistory(
      `alphaDecay: ${parent.protons}X -> ${daughter.protons}Y + ⁴He, Q=${energy}`,
    );
    return decay;
  }

  /**
   * β 衰变：n → p + e⁻ + ν̄ (β⁻) 或 p → n + e⁺ + ν (β⁺)
   * Beta decay
   */
  public betaDecay(
    parent: Nucleus,
    daughter: Nucleus,
    type: 'beta-' | 'beta+',
  ): DecayProcess {
    const energy = Math.abs(parent.bindingEnergy - daughter.bindingEnergy);
    const decay: DecayProcess = { type, halfLife: 0, energy };
    const id = this._generateId();
    this._decays.set(id, { id, decay, timestamp: Date.now() });
    this._recordHistory(
      `betaDecay: ${parent.protons}X -> ${daughter.protons}Y (${type}), Q=${energy}`,
    );
    return decay;
  }

  /**
   * γ 衰变：激发态核释放光子回到基态
   * Gamma decay
   */
  public gammaDecay(nucleus: Nucleus, energy: number): DecayProcess {
    const decay: DecayProcess = { type: 'gamma', halfLife: 0, energy };
    const id = this._generateId();
    this._decays.set(id, { id, decay, timestamp: Date.now() });
    this._recordHistory(
      `gammaDecay: Z=${nucleus.protons}, A=${nucleus.massNumber}, E_γ=${energy}`,
    );
    return decay;
  }

  /**
   * 半衰期：N(t) = N_0 * (1/2)^(t/t_½)
   * Half-life and remaining quantity
   */
  public halfLife(decay: DecayProcess, time: number): {
    remainingFraction: number;
    decayedFraction: number;
  } {
    if (decay.halfLife <= 0) throw new Error('Half-life must be positive');
    const exponent = time / decay.halfLife;
    const remainingFraction = Math.pow(0.5, exponent);
    const decayedFraction = 1 - remainingFraction;
    this._recordHistory(
      `halfLife: t=${time}, t_½=${decay.halfLife} -> remaining=${remainingFraction}`,
    );
    return { remainingFraction, decayedFraction };
  }

  /**
   * 放射性碳测年：t = -t_½ * log2(N/N_0)
   * Radiocarbon dating (¹⁴C)
   */
  public radiocarbonDating(C14: number, C12: number, halfLife: number): {
    age: number;
    ratio: number;
  } {
    if (halfLife <= 0) throw new Error('Half-life must be positive');
    const initialRatio = 1.2e-12;
    const currentRatio = C12 === 0 ? 0 : C14 / C12;
    if (currentRatio <= 0 || currentRatio >= initialRatio) {
      this._recordHistory(`radiocarbonDating: invalid ratio ${currentRatio}`);
      return { age: 0, ratio: currentRatio };
    }
    const age = -halfLife * Math.log2(currentRatio / initialRatio);
    this._recordHistory(
      `radiocarbonDating: ¹⁴C/¹²C=${currentRatio}, t_½=${halfLife} -> age=${age}`,
    );
    return { age, ratio: currentRatio };
  }

  /**
   * 核裂变：重核 + 中子 → 中等核 + 中子 + 能量
   * Nuclear fission
   */
  public fission(nucleus: Nucleus, neutron: number): NuclearReaction {
    const products = ['A', 'B', `${neutron + 2}n`];
    const energy = nucleus.bindingEnergy * 0.001;
    const reaction: NuclearReaction = {
      reactants: [`${nucleus.massNumber}X`, 'n'],
      products,
      energy,
      conserved: true,
    };
    const id = this._generateId();
    this._reactions.set(id, { id, reaction, timestamp: Date.now() });
    this._recordHistory(
      `fission: A=${nucleus.massNumber} + n -> ${products.join(' + ')}, Q=${energy}`,
    );
    return reaction;
  }

  /**
   * 核聚变：轻核 → 较重核 + 能量
   * Nuclear fusion
   */
  public fusion(nucleus1: Nucleus, nucleus2: Nucleus): NuclearReaction {
    const totalBinding =
      nucleus1.bindingEnergy + nucleus2.bindingEnergy;
    const energy = Math.max(0, totalBinding * 0.0001);
    const reaction: NuclearReaction = {
      reactants: [`${nucleus1.massNumber}X`, `${nucleus2.massNumber}Y`],
      products: [`${nucleus1.massNumber + nucleus2.massNumber}Z`],
      energy,
      conserved: true,
    };
    const id = this._generateId();
    this._reactions.set(id, { id, reaction, timestamp: Date.now() });
    this._recordHistory(
      `fusion: ${nucleus1.massNumber} + ${nucleus2.massNumber} -> Q=${energy}`,
    );
    return reaction;
  }

  /**
   * 反应 Q 值：Q = (m_reactants - m_products) * c²
   * Q-value of a nuclear reaction
   */
  public qValue(reaction: NuclearReaction): { q: number; exothermic: boolean } {
    const q = reaction.energy;
    const exothermic = q > 0;
    this._recordHistory(
      `qValue: reactants=${reaction.reactants.length}, products=${reaction.products.length} -> Q=${q}`,
    );
    return { q, exothermic };
  }

  /**
   * 反应截面：σ(E)（简化估计）
   * Nuclear cross-section (simplified estimate)
   */
  public crossection(energy: number, target: Nucleus): {
    crossSection: number;
    barns: number;
  } {
    if (energy < 0) throw new Error('Energy must be non-negative');
    const crossSection = (target.massNumber * 1e-28) / Math.max(Math.sqrt(energy), 1);
    const barns = crossSection / 1e-28;
    this._recordHistory(
      `crossection: E=${energy}, A=${target.massNumber} -> σ=${crossSection} (${barns} b)`,
    );
    return { crossSection, barns };
  }

  /**
   * 链式反应：倍增因子 k
   * Chain reaction with multiplication factor k
   */
  public chainReaction(n: number, k: number): {
    generations: number;
    finalNeutrons: number;
    critical: 'subcritical' | 'critical' | 'supercritical';
  } {
    if (n < 0) throw new Error('Initial neutron count must be non-negative');
    if (k < 0) throw new Error('Multiplication factor must be non-negative');
    const generations = k > 1.001 ? Math.ceil(Math.log(1e6) / Math.log(k)) : 100;
    const finalNeutrons = n * Math.pow(k, generations);
    let critical: 'subcritical' | 'critical' | 'supercritical';
    if (k < 0.999) critical = 'subcritical';
    else if (k > 1.001) critical = 'supercritical';
    else critical = 'critical';
    this._recordHistory(
      `chainReaction: n_0=${n}, k=${k} -> ${critical}, generations=${generations}`,
    );
    return { generations, finalNeutrons, critical };
  }

  /**
   * 转换为数据包
   * Serialize to DataPacket
   */
  public toPacket(): DataPacket<{
    nuclei: number;
    decays: number;
    reactions: number;
    history: string[];
  }> {
    return {
      id: `nuc-${Date.now()}-${this._counter}`,
      payload: {
        nuclei: this._nuclei.size,
        decays: this._decays.size,
        reactions: this._reactions.size,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['physics', 'nuclear'],
        priority: 0.92,
        phase: 'analysis',
      },
    };
  }

  /**
   * 重置状态
   * Reset internal state
   */
  public reset(): void {
    this._nuclei.clear();
    this._decays.clear();
    this._reactions.clear();
    this._history = [];
    this._counter = 0;
  }

  // ─── Private helpers ───

  private _generateId(): string {
    return `np-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
  }

  private _registerNucleus(nucleus: Nucleus): void {
    const id = this._generateId();
    this._nuclei.set(id, { id, nucleus, timestamp: Date.now() });
    if (this._nuclei.size > 500) {
      const firstKey = this._nuclei.keys().next().value;
      if (firstKey !== undefined) this._nuclei.delete(firstKey);
    }
  }

  private _approximateNuclearMass(Z: number, N: number): number {
    const A = Z + N;
    if (A === 0) return 0;
    return Z * M_H + N * M_N - (15.75 * A * EV) / (C_LIGHT * C_LIGHT);
  }

  private _recordHistory(entry: string): void {
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  /** 物理常量：光速、原子质量单位、中子质量、氢原子质量。 */
  public static readonly C = C_LIGHT;
  public static readonly U = U_MASS;
  public static readonly M_NEUTRON = M_N;
  public static readonly M_HYDROGEN = M_H;
}
