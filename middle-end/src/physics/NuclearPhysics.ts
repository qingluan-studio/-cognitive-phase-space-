/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 核物理 —— 强力与弱力的疆域
 * Nuclear Physics: The Realm of Strong and Weak Forces
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 从结合能到链式反应，核物理揭示了原子核内部的强力与弱力。
 * 质量亏损化作能量，半衰期刻画衰变，而裂变与聚变则是恒星与文明的能量之源。
 *
 * 覆盖范围：
 *  - 核子相互作用：强力、弱力、电磁力、剩余核力（汤川势）
 *  - 结合能：质量亏损、半经验质量公式（Weizsäcker）、每核子结合能曲线
 *  - 核素图：β 稳定线、幻数、壳模型、衰变系/衰变链
 *  - 放射性衰变：α、β⁻、β⁺、γ、电子俘获、自发裂变、cluster 衰变、质子发射
 *  - 衰变动力学：半衰期、平均寿命、活度（Bq/Ci）、子核增长（Bateman 方程）
 *  - 放射性测年：¹⁴C、K-Ar、U-Pb、Rb-Sr
 *  - 核反应：Q 值、阈能、反应截面、Breit-Wigner、库仑势垒
 *  - 核裂变：液滴模型、链式反应、临界条件、反应性
 *  - 核聚变：劳森判据、聚变截面、Q 值
 *  - 恒星核合成：pp 链、CNO 循环、3α 反应、s/r/p 过程
 *  - 核反应堆物理：四因子/六因子公式、中子慢化、扩散方程、控制棒
 *  - 辐射防护：剂量、当量剂量、有效剂量、半值层
 *  - 带电粒子与物质相互作用：Bethe-Bloch 公式、轫致辐射、切伦科夫辐射
 *  - 中子物理：中子慢化、能谱、扩散长度、费米年龄
 *  - 核武器当量、辐射损伤
 *  - 张量分析（核力自旋相关部分，形式）
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
  readonly type: 'alpha' | 'beta-' | 'beta+' | 'gamma' | 'ec' | 'sf' | 'cluster' | 'proton';
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

/** 核素图条目。 */
export interface NuclideChartEntry {
  readonly protons: number;
  readonly neutrons: number;
  readonly massNumber: number;
  readonly stable: boolean;
  readonly decayMode: string;
  readonly bindingEnergyPerNucleon: number;
}

/** 幻数描述。 */
export interface MagicNumbers {
  readonly proton: boolean;
  readonly neutron: boolean;
  readonly doublyMagic: boolean;
}

/** 衰变链节点。 */
export interface DecayChainNode {
  readonly nuclide: string;
  readonly decayMode: string;
  readonly halfLife: number;
  readonly energy: number;
}

/** 辐射剂量描述。 */
export interface RadiationDose {
  readonly absorbedDose: number; // Gy
  readonly equivalentDose: number; // Sv
  readonly effectiveDose: number; // Sv
  readonly qualityFactor: number;
}

/** 核反应堆描述。 */
export interface ReactorState {
  readonly kEff: number;
  readonly reactivity: number;
  readonly status: 'subcritical' | 'critical' | 'supercritical';
  readonly period: number;
  readonly power: number;
}

/** 劳森判据结果。 */
export interface LawsonCriterion {
  readonly nTau: number; // m⁻³·s
  readonly tripleProduct: number; // keV·s/m³
  readonly achieved: boolean;
  readonly ignition: boolean;
}

/** 恒星核合成产物。 */
export interface StellarNucleosynthesis {
  readonly process: string;
  readonly reactions: string[];
  readonly energy: number; // 每循环 J
  readonly neutrinoLoss: number;
}

/** 反应截面描述（Breit-Wigner）。 */
export interface ResonanceCrossSection {
  readonly peakEnergy: number;
  readonly peakWidth: number;
  readonly crossSection: number;
  readonly barns: number;
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
/** 电子质量 (kg)。 */
const M_E = 9.1093837015e-31;
/** 电子伏特到焦耳换算。 */
const EV = 1.602176634e-19;
/** MeV 到焦耳换算。 */
const MEV = 1e6 * EV;
/** 普朗克常数 (J·s)。 */
const H_PLANCK = 6.62607015e-34;
/** 约化普朗克常数 (J·s)。 */
const HBAR = H_PLANCK / (2 * Math.PI);
/** 玻尔兹曼常数 (J/K)。 */
const K_B = 1.380649e-23;
/** 阿伏伽德罗常数。 */
const N_A = 6.02214076e23;
/** π 介子静质量近似 (kg)。 */
const M_PION = 2.488e-28;
/** 强相互作用耦合常数（无量纲）。 */
const ALPHA_S = 1.0;
/** 弱相互作用耦合常数。 */
const G_F = 1.1663787e-5; // GeV⁻²

/** 核幻数序列。 */
const MAGIC_NUMBERS = [2, 8, 20, 28, 50, 82, 126];

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

  // ─── 结合能与质量亏损 ───

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
    components: {
      volume: number; surface: number; coulomb: number;
      asymmetry: number; pairing: number;
    };
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
      `semiEmpiricalMassFormula: Z=${Z}, A=${A} -> B=${bindingEnergy} J (${perNucleon / MEV} MeV/A)`,
    );
    return {
      bindingEnergy,
      perNucleon,
      components: { volume, surface, coulomb, asymmetry, pairing: delta },
    };
  }

  /**
   * 寻找最稳定的同量异位素（给定 A，求 B 最大的 Z）
   * Most stable isobar (optimal Z for given A)
   */
  public mostStableIsobar(A: number): { Z: number; N: number; bindingEnergy: number } {
    if (A <= 0) throw new Error('A must be positive');
    let bestZ = Math.round(A / 2);
    let bestB = -Infinity;
    for (let Z = 1; Z <= A; Z++) {
      const { bindingEnergy } = this.semiEmpiricalMassFormula(Z, A);
      if (bindingEnergy > bestB) {
        bestB = bindingEnergy;
        bestZ = Z;
      }
    }
    this._recordHistory(`mostStableIsobar: A=${A} -> Z=${bestZ}, B=${bestB}`);
    return { Z: bestZ, N: A - bestZ, bindingEnergy: bestB };
  }

  /**
   * β 稳定线：Z = A / (1.98 + 0.0155 * A^(2/3))
   * Beta stability line
   */
  public betaStabilityLine(A: number): { Z: number; N: number } {
    if (A <= 0) throw new Error('A must be positive');
    const Z = Math.round(A / (1.98 + 0.0155 * Math.pow(A, 2 / 3)));
    this._recordHistory(`betaStabilityLine: A=${A} -> Z=${Z}, N=${A - Z}`);
    return { Z, N: A - Z };
  }

  /**
   * 检查是否为幻数核
   * Magic number check
   */
  public isMagic(Z: number, N: number): MagicNumbers {
    const proton = MAGIC_NUMBERS.includes(Z);
    const neutron = MAGIC_NUMBERS.includes(N);
    this._recordHistory(`isMagic: Z=${Z}, N=${N} -> p=${proton}, n=${neutron}`);
    return { proton, neutron, doublyMagic: proton && neutron };
  }

  /**
   * 壳模型：单粒子能级（简化）
   * Shell model single-particle energies
   */
  public shellModelLevels(nShell: number): Array<{ shell: string; capacity: number; energy: number }> {
    const labels = ['1s', '1p', '1d', '2s', '1f', '2p', '1g', '2d', '3s', '1h'];
    const capacities = [2, 6, 10, 2, 14, 6, 18, 10, 2, 22];
    const result: Array<{ shell: string; capacity: number; energy: number }> = [];
    for (let i = 0; i < Math.min(nShell, labels.length); i++) {
      const hbarOmega = 41 * Math.pow(i + 1, 1 / 3); // MeV 近似
      result.push({
        shell: labels[i],
        capacity: capacities[i],
        energy: hbarOmega * (i + 1),
      });
    }
    this._recordHistory(`shellModelLevels: n=${nShell} -> ${result.length} levels`);
    return result;
  }

  /**
   * 估算原子核半径：R = r0 * A^(1/3)
   * Nuclear radius
   */
  public nuclearRadius(A: number, r0: number = 1.2e-15): { radius: number; crossSection: number } {
    if (A <= 0) throw new Error('A must be positive');
    const radius = r0 * Math.pow(A, 1 / 3);
    const crossSection = Math.PI * radius * radius;
    this._recordHistory(`nuclearRadius: A=${A} -> R=${radius} m`);
    return { radius, crossSection };
  }

  // ─── 放射性衰变 ───

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
   * α 衰变 Geiger-Nuttall 定律：log10(t_½) = a1*(Z/√Q) + a2
   * Geiger-Nuttall law for alpha decay half-life
   */
  public geigerNuttall(Z: number, A: number, Q_alpha_MeV: number): number {
    if (Q_alpha_MeV <= 0) return Infinity;
    const a1 = 1.66175;
    const a2 = -8.5166;
    const logT = a1 * (Z / Math.sqrt(Q_alpha_MeV)) + a2;
    const halfLifeSeconds = Math.pow(10, logT);
    this._recordHistory(
      `geigerNuttall: Z=${Z}, Q=${Q_alpha_MeV} MeV -> t_½=${halfLifeSeconds} s`,
    );
    return halfLifeSeconds;
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
   * 电子俘获：p + e⁻ → n + ν
   * Electron capture
   */
  public electronCapture(parent: Nucleus, daughter: Nucleus): DecayProcess {
    const energy = Math.abs(parent.bindingEnergy - daughter.bindingEnergy) - 13.6 * EV;
    const decay: DecayProcess = { type: 'ec', halfLife: 0, energy: Math.max(0, energy) };
    const id = this._generateId();
    this._decays.set(id, { id, decay, timestamp: Date.now() });
    this._recordHistory(`electronCapture: Z=${parent.protons} -> Z=${daughter.protons}`);
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
   * 自发裂变：重核自发分裂为两个中等核
   * Spontaneous fission
   */
  public spontaneousFission(nucleus: Nucleus): DecayProcess {
    const energy = nucleus.bindingEnergy * 0.0015;
    const decay: DecayProcess = { type: 'sf', halfLife: 0, energy };
    const id = this._generateId();
    this._decays.set(id, { id, decay, timestamp: Date.now() });
    this._recordHistory(
      `spontaneousFission: A=${nucleus.massNumber}, Z=${nucleus.protons}, Q=${energy}`,
    );
    return decay;
  }

  /**
   * 团簇衰变：发射比 α 粒子更大的核子团
   * Cluster decay (e.g. ¹⁴C, ²⁴Ne emission)
   */
  public clusterDecay(
    parent: Nucleus,
    clusterA: number,
    clusterZ: number,
    energy: number,
  ): DecayProcess {
    if (clusterA <= 4) throw new Error('Cluster decay requires A > 4');
    const decay: DecayProcess = { type: 'cluster', halfLife: 0, energy };
    const id = this._generateId();
    this._decays.set(id, { id, decay, timestamp: Date.now() });
    this._recordHistory(
      `clusterDecay: A=${parent.massNumber}, cluster A=${clusterA}, Z=${clusterZ}`,
    );
    return decay;
  }

  /**
   * 质子发射：质子rich核发射质子
   * Proton emission
   */
  public protonEmission(parent: Nucleus, daughter: Nucleus, energy: number): DecayProcess {
    const decay: DecayProcess = { type: 'proton', halfLife: 0, energy };
    const id = this._generateId();
    this._decays.set(id, { id, decay, timestamp: Date.now() });
    this._recordHistory(
      `protonEmission: Z=${parent.protons} -> Z=${daughter.protons} + p`,
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
   * 平均寿命：τ = t_½ / ln(2)
   * Mean lifetime
   */
  public meanLifetime(halfLife: number): number {
    if (halfLife <= 0) throw new Error('Half-life must be positive');
    const tau = halfLife / Math.LN2;
    this._recordHistory(`meanLifetime: t_½=${halfLife} -> τ=${tau}`);
    return tau;
  }

  /**
   * 衰变常数：λ = ln(2) / t_½
   * Decay constant
   */
  public decayConstant(halfLife: number): number {
    if (halfLife <= 0) throw new Error('Half-life must be positive');
    const lambda = Math.LN2 / halfLife;
    this._recordHistory(`decayConstant: t_½=${halfLife} -> λ=${lambda}`);
    return lambda;
  }

  /**
   * 放射性活度：A = λ * N
   * Activity (Bq)
   */
  public activity(halfLife: number, numberOfNuclei: number): {
    activityBq: number;
    activityCi: number;
  } {
    if (halfLife <= 0) throw new Error('Half-life must be positive');
    const lambda = Math.LN2 / halfLife;
    const activityBq = lambda * numberOfNuclei;
    const activityCi = activityBq / 3.7e10;
    this._recordHistory(
      `activity: λ=${lambda}, N=${numberOfNuclei} -> A=${activityBq} Bq (${activityCi} Ci)`,
    );
    return { activityBq, activityCi };
  }

  /**
   * 比活度：单位质量的活度
   * Specific activity (Bq/g)
   */
  public specificActivity(halfLife: number, massNumber: number): number {
    if (halfLife <= 0 || massNumber <= 0) throw new Error('Invalid parameters');
    const lambda = Math.LN2 / halfLife;
    const atomsPerGram = N_A / massNumber;
    const sa = lambda * atomsPerGram;
    this._recordHistory(`specificActivity: t_½=${halfLife}, A=${massNumber} -> ${sa} Bq/g`);
    return sa;
  }

  /**
   * 子核增长（Bateman 方程简化）：长期平衡
   * Secular equilibrium (parent half-life >> daughter half-life)
   */
  public secularEquilibrium(
    parentActivity: number,
    parentHalfLife: number,
    daughterHalfLife: number,
    time: number,
  ): { parentActivity: number; daughterActivity: number; total: number } {
    if (parentHalfLife <= 0 || daughterHalfLife <= 0) {
      throw new Error('Half-lives must be positive');
    }
    const lambdaD = Math.LN2 / daughterHalfLife;
    const parentA = parentActivity * Math.exp(-Math.LN2 * time / parentHalfLife);
    const buildup = 1 - Math.exp(-lambdaD * time);
    const daughterA = parentActivity * (1 - Math.exp(-lambdaD * time * (1 - daughterHalfLife / parentHalfLife)));
    void buildup;
    this._recordHistory(
      `secularEquilibrium: t=${time} -> parent=${parentA}, daughter=${daughterA}`,
    );
    return { parentActivity: parentA, daughterActivity: daughterA, total: parentA + daughterA };
  }

  /**
   * 瞬态平衡：parent t_½ > daughter t_½
   * Transient equilibrium
   */
  public transientEquilibrium(
    parentHalfLife: number,
    daughterHalfLife: number,
    initialParentActivity: number,
    time: number,
  ): { parentActivity: number; daughterActivity: number } {
    if (parentHalfLife <= daughterHalfLife) {
      throw new Error('Transient equilibrium requires parent t_½ > daughter t_½');
    }
    const lambdaP = Math.LN2 / parentHalfLife;
    const lambdaD = Math.LN2 / daughterHalfLife;
    const parentA = initialParentActivity * Math.exp(-lambdaP * time);
    const factor = (lambdaD / (lambdaD - lambdaP)) * (Math.exp(-lambdaP * time) - Math.exp(-lambdaD * time));
    const daughterA = initialParentActivity * factor;
    this._recordHistory(
      `transientEquilibrium: t=${time} -> parent=${parentA}, daughter=${daughterA}`,
    );
    return { parentActivity: parentA, daughterActivity: daughterA };
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
   * K-Ar 测年法：基于 ⁴⁰K → ⁴⁰Ar 衰变
   * Potassium-argon dating
   */
  public potassiumArgonDating(
    ar40: number,
    k40: number,
    halfLife: number,
    branchRatio: number = 0.107,
  ): { age: number; argonRatio: number } {
    if (halfLife <= 0) throw new Error('Half-life must be positive');
    if (k40 <= 0) {
      this._recordHistory('potassiumArgonDating: invalid K40');
      return { age: 0, argonRatio: 0 };
    }
    const lambda = Math.LN2 / halfLife;
    const lambdaE = lambda * branchRatio;
    const ratio = ar40 / k40;
    const age = Math.log(1 + (lambda / lambdaE) * ratio) / lambda;
    this._recordHistory(`potassiumArgonDating: ⁴⁰Ar/⁴⁰K=${ratio}, age=${age}`);
    return { age, argonRatio: ratio };
  }

  /**
   * 铀铅测年法（基于 ²³⁸U → ²⁰⁶Pb）
   * U-Pb dating
   */
  public uraniumLeadDating(
    pb206: number,
    u238: number,
    halfLife238: number,
  ): { age: number; ratio: number } {
    if (halfLife238 <= 0 || u238 <= 0) throw new Error('Invalid parameters');
    const lambda = Math.LN2 / halfLife238;
    const ratio = pb206 / u238;
    const age = Math.log(1 + ratio) / lambda;
    this._recordHistory(`uraniumLeadDating: ²⁰⁶Pb/²³⁸U=${ratio}, age=${age}`);
    return { age, ratio };
  }

  /**
   * 衰变链（铀系、钍系、锕系）
   * Decay chain enumeration
   */
  public decayChain(series: 'uranium' | 'thorium' | 'actinium' | 'neptunium'): DecayChainNode[] {
    const chains: Record<string, Array<[string, string, number, number]>> = {
      // [nuclide, decayMode, halfLife(s), energy(J)]
      uranium: [
        ['²³⁸U', 'α', 1.4099e17, 4.27 * MEV],
        ['²³⁴Th', 'β⁻', 2.108e6, 0.273 * MEV],
        ['²³⁴Pa', 'β⁻', 2.412e4, 2.27 * MEV],
        ['²³⁴U', 'α', 7.716e12, 4.857 * MEV],
        ['²³⁰Th', 'α', 2.379e12, 4.77 * MEV],
        ['²²⁶Ra', 'α', 5.05e10, 4.871 * MEV],
        ['²²²Rn', 'α', 3.305e5, 5.59 * MEV],
        ['²¹⁸Po', 'α', 186, 6.115 * MEV],
        ['²¹⁴Pb', 'β⁻', 1608, 1.024 * MEV],
        ['²¹⁴Bi', 'β⁻', 1194, 3.272 * MEV],
        ['²¹⁴Po', 'α', 1.643e-4, 7.833 * MEV],
        ['²¹⁰Pb', 'β⁻', 7.04e8, 0.0635 * MEV],
        ['²¹⁰Bi', 'β⁻', 4.33e5, 1.426 * MEV],
        ['²¹⁰Po', 'α', 1.196e7, 5.407 * MEV],
        ['²⁰⁶Pb', 'stable', Infinity, 0],
      ],
      thorium: [
        ['²³²Th', 'α', 4.434e17, 4.081 * MEV],
        ['²²⁸Ra', 'β⁻', 1.833e6, 0.046 * MEV],
        ['²²⁸Ac', 'β⁻', 2.214e4, 2.127 * MEV],
        ['²²⁸Th', 'α', 6.045e6, 5.52 * MEV],
        ['²²⁴Ra', 'α', 3.139e5, 5.789 * MEV],
        ['²²⁰Rn', 'α', 55.6, 6.404 * MEV],
        ['²¹⁶Po', 'α', 0.145, 6.906 * MEV],
        ['²¹²Pb', 'β⁻', 3.832e4, 0.574 * MEV],
        ['²¹²Bi', 'β⁻', 36.55, 2.254 * MEV],
        ['²¹²Po', 'α', 2.99e-7, 8.954 * MEV],
        ['²⁰⁸Pb', 'stable', Infinity, 0],
      ],
      actinium: [
        ['²³⁵U', 'α', 2.221e16, 4.679 * MEV],
        ['²³¹Th', 'β⁻', 2.209e4, 0.391 * MEV],
        ['²³¹Pa', 'α', 1.034e12, 5.059 * MEV],
        ['²²⁷Ac', 'β⁻', 6.866e8, 0.045 * MEV],
        ['²²⁷Th', 'α', 1.632e6, 6.038 * MEV],
        ['²²³Fr', 'β⁻', 1320, 1.149 * MEV],
        ['²²³Ra', 'α', 9.074e5, 5.979 * MEV],
        ['²¹⁹Rn', 'α', 3.96, 6.946 * MEV],
        ['²¹⁵Po', 'α', 0.00178, 7.526 * MEV],
        ['²¹¹Pb', 'β⁻', 2172, 1.367 * MEV],
        ['²¹¹Bi', 'α', 128.3, 6.751 * MEV],
        ['²⁰⁷Tl', 'β⁻', 286, 1.422 * MEV],
        ['²⁰⁷Pb', 'stable', Infinity, 0],
      ],
      neptunium: [
        ['²³⁷Np', 'α', 6.746e13, 4.959 * MEV],
        ['²³³Pa', 'β⁻', 2.335e6, 0.571 * MEV],
        ['²³³U', 'α', 5.019e12, 4.909 * MEV],
        ['²²⁹Th', 'α', 2.521e12, 5.168 * MEV],
        ['²²⁵Ra', 'β⁻', 1.296e6, 0.36 * MEV],
        ['²²⁵Ac', 'α', 8.302e5, 5.935 * MEV],
        ['²²¹Fr', 'α', 300, 6.34 * MEV],
        ['²¹⁷At', 'α', 0.033, 7.202 * MEV],
        ['²¹³Bi', 'β⁻', 2754, 1.426 * MEV],
        ['²⁰⁹Tl', 'β⁻', 7224, 0.696 * MEV],
        ['²⁰⁹Pb', 'β⁻', 1.029e9, 0.064 * MEV],
        ['²⁰⁹Bi', 'stable', Infinity, 0],
      ],
    };
    const data = chains[series] ?? [];
    const result: DecayChainNode[] = data.map(([nuclide, mode, t, q]) => ({
      nuclide,
      decayMode: mode,
      halfLife: t,
      energy: q,
    }));
    this._recordHistory(`decayChain: ${series} -> ${result.length} stages`);
    return result;
  }

  // ─── 核反应 ───

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
   * 液滴模型裂变判据：Z²/A ≥ 47（临界值）
   * Liquid drop model fission criterion
   */
  public fissionCriterion(Z: number, A: number): {
    zSquaredOverA: number;
    critical: number;
    fissionable: boolean;
  } {
    if (A <= 0) throw new Error('A must be positive');
    const z2a = (Z * Z) / A;
    const critical = 47;
    const fissionable = z2a >= critical;
    this._recordHistory(`fissionCriterion: Z²/A=${z2a} -> fissionable=${fissionable}`);
    return { zSquaredOverA: z2a, critical, fissionable };
  }

  /**
   * 核聚变：轻核 → 较重核 + 能量
   * Nuclear fusion
   */
  public fusion(nucleus1: Nucleus, nucleus2: Nucleus): NuclearReaction {
    const totalBinding = nucleus1.bindingEnergy + nucleus2.bindingEnergy;
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
   * 氘氚聚变反应：D + T → ⁴He + n + 17.6 MeV
   * Deuterium-tritium fusion
   */
  public deuteriumTritiumFusion(): {
    reaction: NuclearReaction;
    energyMeV: number;
    crossSectionPeak: number;
  } {
    const energyMeV = 17.6;
    const energyJ = energyMeV * MEV;
    const reaction: NuclearReaction = {
      reactants: ['²H', '³H'],
      products: ['⁴He', 'n'],
      energy: energyJ,
      conserved: true,
    };
    const id = this._generateId();
    this._reactions.set(id, { id, reaction, timestamp: Date.now() });
    this._recordHistory(
      `deuteriumTritiumFusion: D + T -> ⁴He + n + ${energyMeV} MeV`,
    );
    return {
      reaction,
      energyMeV,
      crossSectionPeak: 5e-28, // ~5 barns at 64 keV
    };
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
   * 反应阈能：E_th = -Q * (m_a + m_A) / m_A（吸能反应）
   * Threshold energy for endothermic reactions
   */
  public thresholdEnergy(Q_J: number, projectileMass: number, targetMass: number): number {
    if (Q_J >= 0) {
      this._recordHistory(`thresholdEnergy: exothermic Q=${Q_J}, threshold=0`);
      return 0;
    }
    const threshold = -Q_J * (projectileMass + targetMass) / targetMass;
    this._recordHistory(`thresholdEnergy: Q=${Q_J} -> E_th=${threshold}`);
    return threshold;
  }

  /**
   * 库仑势垒：E_B = Z1*Z2*e² / (4πε₀*r)
   * Coulomb barrier
   */
  public coulombBarrier(Z1: number, Z2: number, R_fm: number): number {
    if (R_fm <= 0) throw new Error('Radius must be positive');
    const e = 1.602176634e-19;
    const epsilon0 = 8.8541878128e-12;
    const R = R_fm * 1e-15;
    const barrier = (Z1 * Z2 * e * e) / (4 * Math.PI * epsilon0 * R);
    this._recordHistory(
      `coulombBarrier: Z1=${Z1}, Z2=${Z2}, R=${R_fm} fm -> E_B=${barrier / MEV} MeV`,
    );
    return barrier;
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
   * Breit-Wigner 共振截面：σ(E) = π/k² * (2J+1)/((2J_a+1)(2J_A+1)) * Γ_aΓ_b / ((E-E_R)² + Γ²/4)
   * Breit-Wigner resonance cross-section
   */
  public breitWigner(
    E: number,
    E_R: number,
    Gamma: number,
    Gamma_a: number,
    Gamma_b: number,
    J: number,
    J_a: number,
    J_A: number,
  ): ResonanceCrossSection {
    if (E <= 0) throw new Error('Energy must be positive');
    const k = Math.sqrt(E);
    const spinFactor = (2 * J + 1) / ((2 * J_a + 1) * (2 * J_A + 1));
    const numerator = Gamma_a * Gamma_b;
    const denominator = (E - E_R) ** 2 + (Gamma * Gamma) / 4;
    const crossSection = (Math.PI / (k * k)) * spinFactor * (numerator / denominator);
    const barns = crossSection / 1e-28;
    this._recordHistory(
      `breitWigner: E=${E}, E_R=${E_R} -> σ=${crossSection} (${barns} b)`,
    );
    return {
      peakEnergy: E_R,
      peakWidth: Gamma,
      crossSection,
      barns,
    };
  }

  /**
   * 中子俘获截面（1/v 律）：σ ∝ 1/v
   * 1/v neutron capture cross-section
   */
  public oneOverVCrossSection(
    thermalCrossSection: number,
    thermalEnergy: number,
    energy: number,
  ): number {
    if (energy <= 0 || thermalEnergy <= 0) throw new Error('Energies must be positive');
    const sigma = thermalCrossSection * Math.sqrt(thermalEnergy / energy);
    this._recordHistory(`oneOverV: E=${energy} -> σ=${sigma}`);
    return sigma;
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

  // ─── 核反应堆物理 ───

  /**
   * 反应堆反应性：ρ = (k_eff - 1) / k_eff
   * Reactivity
   */
  public reactivity(kEff: number): { rho: number; status: 'subcritical' | 'critical' | 'supercritical' } {
    if (kEff <= 0) throw new Error('k_eff must be positive');
    const rho = (kEff - 1) / kEff;
    let status: 'subcritical' | 'critical' | 'supercritical';
    if (Math.abs(rho) < 1e-6) status = 'critical';
    else if (rho > 0) status = 'supercritical';
    else status = 'subcritical';
    this._recordHistory(`reactivity: k_eff=${kEff} -> ρ=${rho}, ${status}`);
    return { rho, status };
  }

  /**
   * 反应堆周期：T = ℓ / ρ（倒时方程简化）
   * Reactor period
   */
  public reactorPeriod(rho: number, l_star: number = 1e-4): number {
    if (Math.abs(rho) < 1e-12) return Infinity;
    const T = l_star / rho;
    this._recordHistory(`reactorPeriod: ρ=${rho}, ℓ*=${l_star} -> T=${T} s`);
    return T;
  }

  /**
   * 反应堆六因子公式（简化）
   * Six-factor formula
   */
  public sixFactorFormula(
    eta: number, // 每次裂变中子数
    f: number, // 热利用因子
    p: number, // 共振逃逸概率
    epsilon: number, // 快裂变因子
    Lf: number, // 快中子不漏失概率
    Lt: number, // 热中子不漏失概率
  ): { kEff: number; kInfinite: number } {
    const kInfinite = eta * f * p * epsilon;
    const kEff = kInfinite * Lf * Lt;
    this._recordHistory(
      `sixFactorFormula: η=${eta}, f=${f}, p=${p}, ε=${epsilon} -> k_eff=${kEff}`,
    );
    return { kEff, kInfinite };
  }

  /**
   * 反应堆稳态功率水平
   * Reactor power level
   */
  public reactorPower(
    kEff: number,
    neutronLifetime: number,
    fuelMass: number,
    energyPerFission: number = 200 * MEV,
  ): { power: number; status: ReactorState } {
    const rho = (kEff - 1) / kEff;
    const period = Math.abs(rho) < 1e-12 ? Infinity : neutronLifetime / rho;
    const power = fuelMass * 1e12 * energyPerFission * (kEff - 1);
    let status: 'subcritical' | 'critical' | 'supercritical';
    if (Math.abs(rho) < 1e-6) status = 'critical';
    else if (rho > 0) status = 'supercritical';
    else status = 'subcritical';
    const reactorState: ReactorState = {
      kEff,
      reactivity: rho,
      status,
      period,
      power: Math.max(0, power),
    };
    this._recordHistory(`reactorPower: k_eff=${kEff} -> P=${power}, status=${status}`);
    return { power: Math.max(0, power), status: reactorState };
  }

  /**
   * 控制棒价值（简化估计）
   * Control rod worth
   */
  public controlRodWorth(
    rodLength: number,
    totalLength: number,
    maxWorth: number,
  ): { worth: number; fractionInserted: number } {
    if (totalLength <= 0) throw new Error('Total length must be positive');
    const fraction = rodLength / totalLength;
    // S-curve approximation
    const worth = maxWorth * (fraction / (fraction + 0.1 * (1 - fraction)));
    this._recordHistory(`controlRodWorth: fraction=${fraction} -> ρ=${worth}`);
    return { worth, fractionInserted: fraction };
  }

  // ─── 中子物理 ───

  /**
   * 中子慢化（对数能降）
   * Lethargy and neutron moderation
   */
  public lethargy(E_initial: number, E_final: number): number {
    if (E_final <= 0 || E_initial <= 0) throw new Error('Energies must be positive');
    const u = Math.log(E_initial / E_final);
    this._recordHistory(`lethargy: E_i=${E_initial}, E_f=${E_final} -> u=${u}`);
    return u;
  }

  /**
   * 平均对数能降（每次碰撞）
   * Average logarithmic energy decrement
   */
  public averageLogDecrement(A: number): number {
    if (A < 1) throw new Error('Mass number must be ≥ 1');
    if (A === 1) return 1.0;
    const alpha = ((A - 1) / (A + 1)) ** 2;
    const xi = 1 + (alpha * Math.log(alpha)) / (1 - alpha);
    this._recordHistory(`averageLogDecrement: A=${A} -> ξ=${xi}`);
    return xi;
  }

  /**
   * 热化碰撞次数：N = ln(E_0/E_th) / ξ
   * Number of collisions for thermalization
   */
  public thermalizationCollisions(A: number, E0: number, E_th: number = 0.025): number {
    if (E0 <= 0 || E_th <= 0) throw new Error('Energies must be positive');
    const xi = this.averageLogDecrement(A);
    const N = Math.log(E0 / E_th) / xi;
    this._recordHistory(`thermalizationCollisions: A=${A} -> N=${N}`);
    return N;
  }

  /**
   * 慢化比：ξ * Σ_s / Σ_a
   * Moderating ratio
   */
  public moderatingRatio(A: number, sigmaS: number, sigmaA: number): number {
    if (sigmaA <= 0) return Infinity;
    const xi = this.averageLogDecrement(A);
    const mr = (xi * sigmaS) / sigmaA;
    this._recordHistory(`moderatingRatio: A=${A}, σ_s=${sigmaS}, σ_a=${sigmaA} -> MR=${mr}`);
    return mr;
  }

  /**
   * 中子扩散长度：L = √(D/Σ_a)
   * Diffusion length
   */
  public diffusionLength(diffusionCoeff: number, sigmaA: number): number {
    if (sigmaA <= 0) throw new Error('Σ_a must be positive');
    const L = Math.sqrt(diffusionCoeff / sigmaA);
    this._recordHistory(`diffusionLength: D=${diffusionCoeff}, Σ_a=${sigmaA} -> L=${L}`);
    return L;
  }

  /**
   * 费米年龄（慢化面积）
   * Fermi age
   */
  public fermiAge(xi: number, sigmaS: number, E0: number, E: number): number {
    if (sigmaS <= 0 || E0 <= E) throw new Error('Invalid parameters');
    const tau = (1 / (6 * xi * sigmaS)) * Math.log(E0 / E);
    this._recordHistory(`fermiAge: τ=${tau}`);
    return tau;
  }

  // ─── 劳森判据与聚变 ───

  /**
   * 劳森判据：n * τ_E ≥ 10²⁰ m⁻³·s (DT)
   * Lawson criterion
   */
  public lawsonCriterion(
    n: number, // m⁻³
    tauE: number, // s
    T_keV: number,
    fuel: 'D-T' | 'D-D' = 'D-T',
  ): LawsonCriterion {
    const nTau = n * tauE;
    const required = fuel === 'D-T' ? 1e20 : 1e22;
    const ignitionT = fuel === 'D-T' ? 4.4 : 4.4; // keV
    const ignitionNTau = fuel === 'D-T' ? 1.5e20 : 1e22;
    const achieved = nTau >= required;
    const ignition = nTau >= ignitionNTau && T_keV >= ignitionT;
    const tripleProduct = T_keV * nTau * 1e-21; // keV·s/m³
    this._recordHistory(
      `lawsonCriterion: nτ=${nTau}, T=${T_keV} keV, fuel=${fuel} -> achieved=${achieved}`,
    );
    return { nTau, tripleProduct, achieved, ignition };
  }

  /**
   * 聚变功率密度：P = n_D * n_T * <σv> * E_fusion
   * Fusion power density
   */
  public fusionPowerDensity(
    nD: number,
    nT: number,
    sigmaV: number,
    E_fusion_J: number = 17.6 * MEV,
  ): { power: number; arealDensity: number } {
    const power = nD * nT * sigmaV * E_fusion_J;
    const arealDensity = Math.sqrt(nD * nT);
    this._recordHistory(`fusionPowerDensity: P=${power} W/m³`);
    return { power, arealDensity };
  }

  // ─── 恒星核合成 ───

  /**
   * 质子-质子链（pp I）：4p → ⁴He + 2e⁺ + 2ν_e + 26.7 MeV
   * Proton-proton chain
   */
  public protonProtonChain(): StellarNucleosynthesis {
    const reactions = [
      'p + p → ²H + e⁺ + ν_e',
      '²H + p → ³He + γ',
      '³He + ³He → ⁴He + 2p',
    ];
    const energy = 26.7 * MEV;
    const neutrinoLoss = 0.6 * MEV; // 平均中微子损失
    this._recordHistory('protonProtonChain: 4p -> ⁴He + Q');
    return { process: 'pp-I', reactions, energy, neutrinoLoss };
  }

  /**
   * CNO 循环
   * CNO cycle
   */
  public cnoCycle(): StellarNucleosynthesis {
    const reactions = [
      '¹²C + p → ¹³N + γ',
      '¹³N → ¹³C + e⁺ + ν_e',
      '¹³C + p → ¹⁴N + γ',
      '¹⁴N + p → ¹⁵O + γ',
      '¹⁵O → ¹⁵N + e⁺ + ν_e',
      '¹⁵N + p → ¹²C + ⁴He',
    ];
    const energy = 26.7 * MEV;
    const neutrinoLoss = 1.7 * MEV;
    this._recordHistory('cnoCycle: 4p -> ⁴He (catalyst ¹²C regenerated)');
    return { process: 'CNO', reactions, energy, neutrinoLoss };
  }

  /**
   * 三 α 过程：3 ⁴He → ¹²C + 7.27 MeV
   * Triple-alpha process
   */
  public tripleAlpha(): StellarNucleosynthesis {
    const reactions = [
      '⁴He + ⁴He ↔ ⁸Be',
      '⁸Be + ⁴He → ¹²C + γ',
    ];
    const energy = 7.27 * MEV;
    const neutrinoLoss = 0;
    this._recordHistory('tripleAlpha: 3α -> ¹²C');
    return { process: 'triple-alpha', reactions, energy, neutrinoLoss };
  }

  /**
   * 碳燃烧：¹²C + ¹²C → ²⁰Ne + α / ²³Na + p / ²³Mg + n
   * Carbon burning
   */
  public carbonBurning(): StellarNucleosynthesis {
    const reactions = [
      '¹²C + ¹²C → ²⁰Ne + ⁴He',
      '¹²C + ¹²C → ²³Na + p',
      '¹²C + ¹²C → ²³Mg + n',
    ];
    const energy = 13.9 * MEV;
    this._recordHistory('carbonBurning: ¹²C + ¹²C -> ...');
    return { process: 'carbon-burning', reactions, energy, neutrinoLoss: 0 };
  }

  /**
   * 氧燃烧：¹⁶O + ¹⁶O → ²⁸Si + α / ³¹P + p / ³¹S + n
   * Oxygen burning
   */
  public oxygenBurning(): StellarNucleosynthesis {
    const reactions = [
      '¹⁶O + ¹⁶O → ²⁸Si + ⁴He',
      '¹⁶O + ¹⁶O → ³¹P + p',
      '¹⁶O + ¹⁶O → ³¹S + n',
    ];
    const energy = 16.8 * MEV;
    this._recordHistory('oxygenBurning: ¹⁶O + ¹⁶O -> ...');
    return { process: 'oxygen-burning', reactions, energy, neutrinoLoss: 0 };
  }

  /**
   * s 过程（慢中子俘获）
   * s-process (slow neutron capture)
   */
  public sProcess(seedA: number, nCapture: number): { finalA: number; path: string } {
    const finalA = seedA + nCapture;
    this._recordHistory(`sProcess: seed A=${seedA}, +${nCapture}n -> A=${finalA}`);
    return { finalA, path: `${seedA} → (n,γ)×${nCapture} → ${finalA}` };
  }

  /**
   * r 过程（快中子俘获）
   * r-process (rapid neutron capture)
   */
  public rProcess(seedA: number, nBurst: number): { finalA: number; path: string } {
    const finalA = seedA + nBurst;
    this._recordHistory(`rProcess: seed A=${seedA}, +${nBurst}n -> A=${finalA}`);
    return { finalA, path: `${seedA} → (n,γ)^${nBurst} → β⁻ decay → ${finalA}` };
  }

  /**
   * p 过程（质子俘获 / 光致蜕变）
   * p-process
   */
  public pProcess(seedA: number, seedZ: number): { description: string } {
    this._recordHistory(`pProcess: seed A=${seedA}, Z=${seedZ}`);
    return {
      description: `Proton capture or (γ,n) on ${seedZ}^${seedA} produces proton-rich isotopes`,
    };
  }

  // ─── 辐射防护与剂量学 ───

  /**
   * 吸收剂量：D = dE / dm (Gy = J/kg)
   * Absorbed dose
   */
  public absorbedDose(energyJ: number, massKg: number): number {
    if (massKg <= 0) throw new Error('Mass must be positive');
    const D = energyJ / massKg;
    this._recordHistory(`absorbedDose: E=${energyJ} J, m=${massKg} kg -> D=${D} Gy`);
    return D;
  }

  /**
   * 当量剂量：H = D * w_R (Sv)
   * Equivalent dose
   */
  public equivalentDose(absorbedDoseGy: number, radiationType: string): RadiationDose {
    const wR: Record<string, number> = {
      photon: 1, electron: 1, muon: 1,
      proton: 2, neutron_thermal: 2.5, neutron_fast: 20,
      alpha: 20, heavy_ion: 20, fission_fragment: 20,
    };
    const qf = wR[radiationType] ?? 1;
    const equivalent = absorbedDoseGy * qf;
    this._recordHistory(
      `equivalentDose: D=${absorbedDoseGy} Gy, type=${radiationType} -> H=${equivalent} Sv`,
    );
    return {
      absorbedDose: absorbedDoseGy,
      equivalentDose: equivalent,
      effectiveDose: equivalent,
      qualityFactor: qf,
    };
  }

  /**
   * 有效剂量：E = Σ w_T * H_T (Sv)
   * Effective dose (whole-body approximation: w_T summed = 1)
   */
  public effectiveDose(
    organDoses: Array<{ tissue: string; dose: number; weight: number }>,
  ): { effectiveDose: number; organSum: number } {
    let sum = 0;
    for (const { dose, weight } of organDoses) {
      sum += dose * weight;
    }
    this._recordHistory(`effectiveDose: E=${sum} Sv`);
    return { effectiveDose: sum, organSum: sum };
  }

  /**
   * 半值层：HVL = ln(2) / μ
   * Half-value layer
   */
  public halfValueLayer(attenuationCoeff: number): number {
    if (attenuationCoeff <= 0) throw new Error('μ must be positive');
    const hvl = Math.LN2 / attenuationCoeff;
    this._recordHistory(`halfValueLayer: μ=${attenuationCoeff} -> HVL=${hvl} m`);
    return hvl;
  }

  /**
   * 辐射衰减：I = I_0 * e^(-μx)
   * Radiation attenuation
   */
  public radiationAttenuation(
    I0: number,
    mu: number,
    x: number,
  ): { intensity: number; attenuationFraction: number } {
    const intensity = I0 * Math.exp(-mu * x);
    const attenuationFraction = 1 - intensity / I0;
    this._recordHistory(`radiationAttenuation: I/I_0=${intensity / I0}`);
    return { intensity, attenuationFraction };
  }

  /**
   * 距离平方反比律：I = I_0 / (4πr²)
   * Inverse square law
   */
  public inverseSquareLaw(
    sourceStrength: number,
    distance: number,
  ): { intensity: number; fluenceRate: number } {
    if (distance <= 0) throw new Error('Distance must be positive');
    const intensity = sourceStrength / (4 * Math.PI * distance * distance);
    this._recordHistory(`inverseSquareLaw: r=${distance} -> I=${intensity}`);
    return { intensity, fluenceRate: intensity };
  }

  /**
   * 年剂量限值评估
   * Annual dose limit assessment (ICRP)
   */
  public doseLimitAssessment(
    annualDose: number,
    occupationallyExposed: boolean = false,
  ): { limit: number; exceeded: boolean; fraction: number } {
    const limit = occupationallyExposed ? 0.02 : 0.001; // Sv/year
    const exceeded = annualDose > limit;
    const fraction = annualDose / limit;
    this._recordHistory(
      `doseLimitAssessment: dose=${annualDose}, limit=${limit} -> exceeded=${exceeded}`,
    );
    return { limit, exceeded, fraction };
  }

  // ─── 带电粒子与物质相互作用 ───

  /**
   * Bethe-Bloch 公式（重带电粒子能量损失）
   * Bethe-Bloch stopping power
   */
  public betheBloch(
    z: number, // 入射粒子电荷数
    beta: number, // v/c
    Z: number, // 介质原子序数
    A: number, // 介质质量数
    I_eV: number, // 平均激发能 (eV)
    density: number, // kg/m³
  ): { stoppingPower: number; massStoppingPower: number } {
    if (beta <= 0 || beta >= 1) throw new Error('0 < β < 1 required');
    const e = 1.602176634e-19;
    const epsilon0 = 8.8541878128e-12;
    const me = M_E;
    const K = (e * e) / (4 * Math.PI * epsilon0);
    const K2 = (K * K) / (2 * me * C_LIGHT * C_LIGHT);
    const n_e = (Z * density * N_A) / (A * U_MASS); // 电子数密度
    const gamma = 1 / Math.sqrt(1 - beta * beta);
    const logTerm = Math.log((2 * me * C_LIGHT * C_LIGHT * beta * beta * gamma * gamma) / (I_eV * e)) - beta * beta;
    const dEdx = K2 * (z * z * n_e / (beta * beta)) * logTerm;
    const massStoppingPower = dEdx / density;
    this._recordHistory(
      `betheBloch: z=${z}, β=${beta}, Z=${Z} -> dE/dx=${dEdx} J/m`,
    );
    return { stoppingPower: dEdx, massStoppingPower };
  }

  /**
   * 轫致辐射功率（电子）：P ∝ Z² e⁶ / (m²c³)
   * Bremsstrahlung power
   */
  public bremsstrahlung(
    electronEnergy: number,
    Z: number,
    n_e: number,
  ): { power: number; crossSection: number } {
    if (electronEnergy <= 0) throw new Error('Energy must be positive');
    const e = 1.602176634e-19;
    const r_e = (e * e) / (4 * Math.PI * 8.8541878128e-12 * M_E * C_LIGHT * C_LIGHT);
    const sigma = (16 / 3) * Math.PI * r_e * r_e * Z * Z * (electronEnergy / (M_E * C_LIGHT * C_LIGHT));
    const power = n_e * C_LIGHT * sigma * electronEnergy;
    this._recordHistory(`bremsstrahlung: E=${electronEnergy}, Z=${Z} -> P=${power}`);
    return { power, crossSection: sigma };
  }

  /**
   * 切伦科夫辐射条件：v > c/n
   * Cherenkov radiation threshold
   */
  public cherenkovRadiation(beta: number, n: number): {
    emits: boolean;
    cosTheta: number;
    angle: number;
  } {
    if (n <= 1) {
      this._recordHistory(`cherenkovRadiation: n=${n} ≤ 1, no emission`);
      return { emits: false, cosTheta: 1, angle: 0 };
    }
    const betaThreshold = 1 / n;
    if (beta <= betaThreshold) {
      this._recordHistory(`cherenkovRadiation: β=${beta} ≤ threshold=${betaThreshold}`);
      return { emits: false, cosTheta: 1, angle: 0 };
    }
    const cosTheta = 1 / (beta * n);
    const angle = Math.acos(Math.max(-1, Math.min(1, cosTheta)));
    this._recordHistory(`cherenkovRadiation: β=${beta}, n=${n} -> θ=${angle}`);
    return { emits: true, cosTheta, angle };
  }

  /**
   * 中子慢化剂选择评估
   * Moderator selection evaluation
   */
  public evaluateModerator(A: number, sigmaS: number, sigmaA: number): {
    xi: number;
    moderatingRatio: number;
    rating: 'excellent' | 'good' | 'fair' | 'poor';
  } {
    const xi = this.averageLogDecrement(A);
    const mr = sigmaA > 0 ? (xi * sigmaS) / sigmaA : Infinity;
    let rating: 'excellent' | 'good' | 'fair' | 'poor';
    if (mr > 50) rating = 'excellent';
    else if (mr > 10) rating = 'good';
    else if (mr > 1) rating = 'fair';
    else rating = 'poor';
    this._recordHistory(`evaluateModerator: A=${A} -> MR=${mr}, ${rating}`);
    return { xi, moderatingRatio: mr, rating };
  }

  // ─── 核武器与核能 ───

  /**
   * 核武器当量：E = Δm * c² → kt TNT
   * Nuclear weapon yield
   */
  public nuclearYield(massConvertedKg: number): { joules: number; kilotonsTNT: number; megatonsTNT: number } {
    if (massConvertedKg < 0) throw new Error('Mass must be non-negative');
    const joules = massConvertedKg * C_LIGHT * C_LIGHT;
    const ktTNT = joules / 4.184e12; // 1 kt TNT = 4.184 TJ
    const mtTNT = ktTNT / 1000;
    this._recordHistory(
      `nuclearYield: Δm=${massConvertedKg} kg -> ${ktTNT} kt TNT`,
    );
    return { joules, kilotonsTNT: ktTNT, megatonsTNT: mtTNT };
  }

  /**
   * 临界质量估算
   * Critical mass estimation (bare sphere)
   */
  public criticalMass(
    density: number,
    sigmaF: number,
    nu: number,
    molarMass: number,
  ): { mass: number; radius: number; kInf: number } {
    // 简化的扩散理论估计
    const N = (density * N_A) / molarMass;
    const sigmaA = 1e-28; // 假设吸收截面
    const kInf = (nu * sigmaF) / sigmaA;
    if (kInf <= 1) {
      return { mass: Infinity, radius: Infinity, kInf };
    }
    const L = 0.01; // 扩散长度估计 (m)
    const B2 = (kInf - 1) / (L * L);
    const R = Math.PI / Math.sqrt(B2);
    const mass = (4 / 3) * Math.PI * R * R * R * density;
    this._recordHistory(`criticalMass: k∞=${kInf} -> m=${mass} kg, R=${R} m`);
    return { mass, radius: R, kInf };
  }

  /**
   * 裂变能产量
   * Fission energy yield per gram
   */
  public fissionEnergyPerGram(
    fuel: 'U-235' | 'Pu-239' | 'U-233' = 'U-235',
  ): { energyJ: number; energyMWh: number; fissionProduct: string } {
    const E_per_fission = 200 * MEV;
    const molarMass = fuel === 'U-235' ? 235 : fuel === 'Pu-239' ? 239 : 233;
    const atomsPerGram = N_A / molarMass;
    const energyJ = atomsPerGram * E_per_fission;
    const energyMWh = energyJ / 3.6e9;
    this._recordHistory(`fissionEnergyPerGram: ${fuel} -> ${energyMWh} MWh/g`);
    return { energyJ, energyMWh, fissionProduct: fuel };
  }

  // ─── 核力（简化模型）───

  /**
   * 汤川势：V(r) = -g² * e^(-m_π c r/ℏ) / r
   * Yukawa potential for residual nuclear force
   */
  public yukawaPotential(r: number, g: number = ALPHA_S): { potential: number; range: number } {
    if (r <= 0) throw new Error('Distance must be positive');
    const range = HBAR / (M_PION * C_LIGHT); // ~1.4 fm
    const potential = -(g * g * Math.exp(-r / range)) / r;
    this._recordHistory(`yukawaPotential: r=${r} -> V=${potential}, range=${range}`);
    return { potential, range };
  }

  /**
   * 核力自旋-同位旋相关性（形式）
   * Spin-isospin dependence of nuclear force
   */
  public nuclearForceSpinDependence(spinUp: boolean, isospinSinglet: boolean): {
    central: number;
    tensor: number;
    description: string;
  } {
    const central = spinUp ? -1.0 : -0.5;
    const tensor = isospinSinglet ? 0.3 : -0.2;
    const description = `S=${spinUp ? 1 : 0}, I=${isospinSinglet ? 0 : 1} channel`;
    this._recordHistory(`nuclearForceSpinDependence: ${description}`);
    return { central, tensor, description };
  }

  // ─── 核素图工具 ───

  /**
   * 生成核素图区域
   * Generate nuclide chart region
   */
  public nuclideChart(
    zMin: number, zMax: number, nMin: number, nMax: number,
  ): NuclideChartEntry[] {
    if (zMin < 0 || nMin < 0 || zMax < zMin || nMax < nMin) {
      throw new Error('Invalid range');
    }
    const entries: NuclideChartEntry[] = [];
    for (let Z = zMin; Z <= zMax; Z++) {
      for (let N = nMin; N <= nMax; N++) {
        const A = Z + N;
        if (A === 0) continue;
        const { perNucleon } = this.semiEmpiricalMassFormula(Z, A);
        const stableLine = this.betaStabilityLine(A);
        const stable = Z === stableLine.Z || Math.abs(Z - stableLine.Z) <= 1;
        let decayMode = 'stable';
        if (!stable) {
          if (Z > stableLine.Z) decayMode = 'beta+';
          else decayMode = 'beta-';
          if (A > 200) decayMode = 'alpha';
        }
        entries.push({
          protons: Z,
          neutrons: N,
          massNumber: A,
          stable,
          decayMode,
          bindingEnergyPerNucleon: perNucleon,
        });
      }
    }
    this._recordHistory(
      `nuclideChart: Z[${zMin},${zMax}] N[${nMin},${nMax}] -> ${entries.length} entries`,
    );
    return entries;
  }

  /**
   * 估算每核子结合能峰值位置（铁峰 ~⁵⁶Fe）
   * Peak binding energy per nucleon (iron peak)
   */
  public ironPeak(): { A: number; Z: number; bindingEnergyPerNucleon: number } {
    let bestA = 56;
    let bestZ = 26;
    let bestB = -Infinity;
    for (let A = 50; A <= 65; A++) {
      const { Z, bindingEnergy } = this.mostStableIsobar(A);
      const perNucleon = bindingEnergy / A;
      if (perNucleon > bestB) {
        bestB = perNucleon;
        bestA = A;
        bestZ = Z;
      }
    }
    this._recordHistory(`ironPeak: A=${bestA}, Z=${bestZ} -> B/A=${bestB / MEV} MeV`);
    return { A: bestA, Z: bestZ, bindingEnergyPerNucleon: bestB };
  }

  // ─── 核数据分析 ───

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

  /** 物理常量：光速、原子质量单位、中子质量、氢原子质量、电子质量、普朗克常数、玻尔兹曼常数、阿伏伽德罗常数。 */
  public static readonly C = C_LIGHT;
  public static readonly U = U_MASS;
  public static readonly M_NEUTRON = M_N;
  public static readonly M_HYDROGEN = M_H;
  public static readonly M_ELECTRON = M_E;
  public static readonly H = H_PLANCK;
  public static readonly HBAR = HBAR;
  public static readonly K_B = K_B;
  public static readonly N_A = N_A;
  public static readonly EV = EV;
  public static readonly MEV = MEV;
  public static readonly MAGIC_NUMBERS = MAGIC_NUMBERS;
}
