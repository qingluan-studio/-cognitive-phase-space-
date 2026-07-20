/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 热力学 —— 熵与能量的舞蹈
 * Thermodynamics: The Dance of Entropy and Energy
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 从卡诺循环到玻尔兹曼分布，热力学揭示了宏观世界中能量流转与不可逆性的深层规律。
 * 熵增的箭头始终指向未来，而麦克斯韦妖在概率的迷雾中踟蹰。
 *
 * 本模块覆盖：四大定律、过程方程、热机与制冷机循环、热力学势、相变、气体分子动理论、
 * 溶液依数性、量子统计模型（爱因斯坦固体、德拜模型）等。
 */

import { DataPacket } from '../shared/types';

/** 热力学系统状态：温度、压强、体积与熵。 */
export interface ThermalSystem {
  readonly temperature: number;
  readonly pressure: number;
  readonly volume: number;
  readonly entropy: number;
}

/** 热量传递：类型、数量与方向。 */
export interface HeatTransfer {
  readonly type: 'conduction' | 'convection' | 'radiation';
  readonly amount: number;
  readonly direction: 'in' | 'out';
}

/** 理想气体状态参量。 */
export interface GasLaw {
  readonly pressure: number;
  readonly volume: number;
  readonly moles: number;
  readonly temperature: number;
}

/** 热力学过程类型。 */
export type ProcessType = 'isothermal' | 'isobaric' | 'isochoric' | 'adiabatic' | 'polytropic';

/** 热力学过程描述。 */
export interface ThermodynamicProcess {
  readonly type: ProcessType;
  readonly work: number;
  readonly heat: number;
  readonly deltaU: number;
  readonly deltaS: number;
  readonly finalPressure: number;
  readonly finalVolume: number;
  readonly finalTemperature: number;
}

/** 热机循环描述。 */
export interface HeatEngine {
  readonly type: 'carnot' | 'otto' | 'diesel' | 'rankine' | 'brayton' | 'sterling';
  readonly efficiency: number;
  readonly heatIn: number;
  readonly heatOut: number;
  readonly work: number;
  readonly compressionRatio?: number;
}

/** 制冷机/热泵描述。 */
export interface Refrigerator {
  readonly type: 'refrigerator' | 'heat-pump';
  readonly cop: number;
  readonly heatExtracted: number;
  readonly workInput: number;
  readonly heatDelivered: number;
}

/** 热力学势集合。 */
export interface ThermodynamicPotentials {
  readonly internalEnergy: number;
  readonly enthalpy: number;
  readonly helmholtz: number;
  readonly gibbs: number;
}

/** 相变描述。 */
export interface PhaseTransition {
  readonly from: 'solid' | 'liquid' | 'gas' | 'plasma';
  readonly to: 'solid' | 'liquid' | 'gas' | 'plasma';
  readonly temperature: number;
  readonly latentHeat: number;
  readonly entropyChange: number;
}

/** 热容系统。 */
export interface HeatCapacitySystem {
  readonly cv: number;
  readonly cp: number;
  readonly gamma: number;
  readonly molarCv: number;
  readonly molarCp: number;
}

type SystemRecord = {
  readonly id: string;
  readonly system: ThermalSystem;
  readonly timestamp: number;
};

type TransferRecord = {
  readonly id: string;
  readonly transfer: HeatTransfer;
  readonly timestamp: number;
};

type ProcessRecord = {
  readonly id: string;
  readonly process: ThermodynamicProcess;
  readonly timestamp: number;
};

type EngineRecord = {
  readonly id: string;
  readonly engine: HeatEngine;
  readonly timestamp: number;
};

/** 理想气体常数 R (J/(mol·K))。 */
const R_GAS = 8.314462618;
/** 斯特藩-玻尔兹曼常数 σ (W/(m^2·K^4))。 */
const SIGMA_SB = 5.670374419e-8;
/** 玻尔兹曼常数 k_B (J/K)。 */
const K_B = 1.380649e-23;
/** 阿伏伽德罗常数 N_A (1/mol)。 */
const N_A = 6.02214076e23;
/** 水的三相点温度 (K)。 */
const T_TRIPLE_WATER = 273.16;
/** 标准大气压 (Pa)。 */
const P_ATM = 101325;

export class Thermodynamics {
  private _systems: Map<string, SystemRecord> = new Map();
  private _transfers: Map<string, TransferRecord> = new Map();
  private _processes: Map<string, ProcessRecord> = new Map();
  private _engines: Map<string, EngineRecord> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get systemCount(): number { return this._systems.size; }
  get transferCount(): number { return this._transfers.size; }
  get processCount(): number { return this._processes.size; }
  get engineCount(): number { return this._engines.size; }
  get history(): string[] { return [...this._history]; }

  /**
   * 理想气体状态方程：PV = nRT
   * Ideal Gas Law
   */
  public idealGasLaw(P: number, V: number, n: number, T: number): GasLaw {
    if (P < 0 || V < 0 || n < 0 || T < 0) {
      throw new Error('Thermodynamic quantities must be non-negative');
    }
    const gas: GasLaw = { pressure: P, volume: V, moles: n, temperature: T };
    this._registerSystem({
      temperature: T,
      pressure: P,
      volume: V,
      entropy: n > 0 ? (n * R_GAS * Math.log(V / n + 1)) : 0,
    });
    this._recordHistory(`idealGasLaw: P=${P}, V=${V}, n=${n}, T=${T} -> PV=${P * V}, nRT=${n * R_GAS * T}`);
    return gas;
  }

  /**
   * 玻意耳定律：P1*V1 = P2*V2 (等温)
   * Boyle's Law (isothermal)
   */
  public boylesLaw(P1: number, V1: number, P2: number): { V2: number; constant: number } {
    if (P2 <= 0) throw new Error('P2 must be positive');
    if (P1 < 0 || V1 < 0) throw new Error('P1 and V1 must be non-negative');
    const constant = P1 * V1;
    const V2 = constant / P2;
    this._recordHistory(`boylesLaw: P1=${P1}, V1=${V1}, P2=${P2} -> V2=${V2}`);
    return { V2, constant };
  }

  /**
   * 查理定律：V1/T1 = V2/T2 (等压)
   * Charles's Law (isobaric)
   */
  public charlesLaw(V1: number, T1: number, V2: number): { T2: number; constant: number } {
    if (T1 <= 0) throw new Error('T1 must be positive');
    if (V1 < 0 || V2 < 0) throw new Error('Volumes must be non-negative');
    const constant = V1 / T1;
    const T2 = V2 / constant;
    this._recordHistory(`charlesLaw: V1=${V1}, T1=${T1}, V2=${V2} -> T2=${T2}`);
    return { T2, constant };
  }

  /**
   * 盖-吕萨克定律：P1/T1 = P2/T2 (等容)
   * Gay-Lussac's Law (isochoric)
   */
  public gayLussacLaw(P1: number, T1: number, P2: number): { T2: number; constant: number } {
    if (T1 <= 0) throw new Error('T1 must be positive');
    if (P1 < 0 || P2 < 0) throw new Error('Pressures must be non-negative');
    const constant = P1 / T1;
    const T2 = P2 / constant;
    this._recordHistory(`gayLussacLaw: P1=${P1}, T1=${T1}, P2=${P2} -> T2=${T2}`);
    return { T2, constant };
  }

  /**
   * 阿伏伽德罗定律：V/n = const (等温等压)
   * Avogadro's Law
   */
  public avogadrosLaw(n1: number, V1: number, n2: number): { V2: number; molarVolume: number } {
    if (n1 <= 0) throw new Error('n1 must be positive');
    if (V1 < 0 || n2 < 0) throw new Error('V1 and n2 must be non-negative');
    const molarVolume = V1 / n1;
    const V2 = molarVolume * n2;
    this._recordHistory(`avogadrosLaw: n1=${n1}, V1=${V1}, n2=${n2} -> V2=${V2}`);
    return { V2, molarVolume };
  }

  /**
   * 道尔顿分压定律：P_total = Σ P_i
   * Dalton's Law of partial pressures
   */
  public daltonsLaw(partialPressures: number[]): {
    totalPressure: number;
    moleFractions: number[];
    averageMolarMass: number;
  } {
    if (partialPressures.length === 0) {
      return { totalPressure: 0, moleFractions: [], averageMolarMass: 0 };
    }
    const totalPressure = partialPressures.reduce((s, p) => s + p, 0);
    const moleFractions = partialPressures.map(p => (totalPressure > 0 ? p / totalPressure : 0));
    const averageMolarMass = moleFractions.reduce((s, x, i) => s + x * (10 + i * 5), 0);
    this._recordHistory(`daltonsLaw: ${partialPressures.length} gases -> P_total=${totalPressure}`);
    return { totalPressure, moleFractions, averageMolarMass };
  }

  /**
   * 热力学第一定律：ΔU = Q - W
   * First Law of Thermodynamics
   */
  public firstLaw(heat: number, work: number): {
    internalEnergyChange: number;
    direction: HeatTransfer['direction'];
  } {
    const internalEnergyChange = heat - work;
    const direction: HeatTransfer['direction'] = heat >= 0 ? 'in' : 'out';
    this._recordHistory(`firstLaw: Q=${heat}, W=${work} -> ΔU=${internalEnergyChange}`);
    return { internalEnergyChange, direction };
  }

  /**
   * 热力学第二定律：ΔS ≥ Q/T
   * Second Law of Thermodynamics
   */
  public secondLaw(entropy: number): { entropyChange: number; reversible: boolean } {
    const reversible = entropy <= 0;
    this._recordHistory(`secondLaw: ΔS=${entropy}, reversible=${reversible}`);
    return { entropyChange: entropy, reversible };
  }

  /**
   * 热力学第三定律：T → 0 K 时 S → 0
   * Third Law of Thermodynamics (Nernst heat theorem)
   */
  public thirdLaw(temperature: number, residualEntropy: number = 0): {
    absoluteEntropy: number;
    attainable: boolean;
  } {
    if (temperature < 0) throw new Error('Temperature must be non-negative');
    const absoluteEntropy = residualEntropy + R_GAS * Math.log(Math.max(1, temperature / 1e-10));
    const attainable = temperature > 0;
    this._recordHistory(`thirdLaw: T=${temperature} -> S=${absoluteEntropy}, attainable=${attainable}`);
    return { absoluteEntropy, attainable };
  }

  /**
   * 卡诺效率：η = 1 - T_cold/T_hot
   * Carnot efficiency
   */
  public carnotEfficiency(T_hot: number, T_cold: number): {
    efficiency: number;
    carnotRatio: number;
  } {
    if (T_hot <= 0 || T_cold < 0) throw new Error('Temperatures must be positive (T_hot) or non-negative (T_cold)');
    if (T_cold >= T_hot) throw new Error('T_cold must be less than T_hot');
    const efficiency = 1 - T_cold / T_hot;
    const carnotRatio = T_cold / T_hot;
    this._recordHistory(`carnotEfficiency: T_hot=${T_hot}, T_cold=${T_cold} -> η=${efficiency}`);
    return { efficiency, carnotRatio };
  }

  /**
   * 卡诺循环：等温膨胀 → 绝热膨胀 → 等温压缩 → 绝热压缩
   * Carnot cycle
   */
  public carnotCycle(T_hot: number, T_cold: number, V1: number, V2: number, V3: number, V4: number, n: number = 1): {
    efficiency: number;
    work: number;
    heatIn: number;
    heatOut: number;
  } {
    if (T_hot <= 0 || T_cold <= 0 || T_cold >= T_hot) {
      throw new Error('Need T_hot > T_cold > 0');
    }
    if (V1 <= 0 || V2 <= 0 || V3 <= 0 || V4 <= 0) {
      throw new Error('Volumes must be positive');
    }
    const Q_hot = n * R_GAS * T_hot * Math.log(V2 / V1);
    const Q_cold = -n * R_GAS * T_cold * Math.log(V3 / V4);
    const work = Q_hot + Q_cold;
    const efficiency = Q_hot > 0 ? work / Q_hot : 0;
    const engine: HeatEngine = {
      type: 'carnot',
      efficiency,
      heatIn: Q_hot,
      heatOut: -Q_cold,
      work,
    };
    const id = this._generateId();
    this._engines.set(id, { id, engine, timestamp: Date.now() });
    this._recordHistory(`carnotCycle: η=${efficiency}, W=${work}`);
    return { efficiency, work, heatIn: Q_hot, heatOut: -Q_cold };
  }

  /**
   * 奥托循环（汽油机）：η = 1 - 1/r^(γ-1)
   * Otto cycle (gasoline engine)
   */
  public ottoCycle(compressionRatio: number, gamma: number = 1.4): {
    efficiency: number;
    work: number;
    heatIn: number;
    heatOut: number;
  } {
    if (compressionRatio <= 1) throw new Error('Compression ratio must be > 1');
    if (gamma <= 1) throw new Error('γ must be > 1');
    const efficiency = 1 - 1 / Math.pow(compressionRatio, gamma - 1);
    const heatIn = 1000;
    const heatOut = heatIn * (1 - efficiency);
    const work = heatIn - heatOut;
    const engine: HeatEngine = {
      type: 'otto',
      efficiency,
      heatIn,
      heatOut,
      work,
      compressionRatio,
    };
    const id = this._generateId();
    this._engines.set(id, { id, engine, timestamp: Date.now() });
    this._recordHistory(`ottoCycle: r=${compressionRatio}, γ=${gamma} -> η=${efficiency}`);
    return { efficiency, work, heatIn, heatOut };
  }

  /**
   * 狄塞尔循环（柴油机）：η = 1 - (r_c^γ - 1) / (γ * r^(γ-1) * (r_c - 1))
   * Diesel cycle
   */
  public dieselCycle(compressionRatio: number, cutoffRatio: number, gamma: number = 1.4): {
    efficiency: number;
    work: number;
    heatIn: number;
    heatOut: number;
  } {
    if (compressionRatio <= 1 || cutoffRatio <= 1) {
      throw new Error('Compression and cutoff ratios must be > 1');
    }
    if (gamma <= 1) throw new Error('γ must be > 1');
    const r = compressionRatio;
    const rc = cutoffRatio;
    const num = Math.pow(rc, gamma) - 1;
    const denom = gamma * Math.pow(r, gamma - 1) * (rc - 1);
    const efficiency = 1 - num / denom;
    const heatIn = 1000;
    const heatOut = heatIn * (1 - efficiency);
    const work = heatIn - heatOut;
    const engine: HeatEngine = {
      type: 'diesel',
      efficiency,
      heatIn,
      heatOut,
      work,
      compressionRatio,
    };
    const id = this._generateId();
    this._engines.set(id, { id, engine, timestamp: Date.now() });
    this._recordHistory(`dieselCycle: r=${r}, rc=${rc}, γ=${gamma} -> η=${efficiency}`);
    return { efficiency, work, heatIn, heatOut };
  }

  /**
   * 布雷顿循环（燃气轮机）：η = 1 - 1/r_p^((γ-1)/γ)
   * Brayton cycle (gas turbine)
   */
  public braytonCycle(pressureRatio: number, gamma: number = 1.4): {
    efficiency: number;
    work: number;
    heatIn: number;
    heatOut: number;
  } {
    if (pressureRatio <= 1) throw new Error('Pressure ratio must be > 1');
    if (gamma <= 1) throw new Error('γ must be > 1');
    const efficiency = 1 - 1 / Math.pow(pressureRatio, (gamma - 1) / gamma);
    const heatIn = 1000;
    const heatOut = heatIn * (1 - efficiency);
    const work = heatIn - heatOut;
    const engine: HeatEngine = {
      type: 'brayton',
      efficiency,
      heatIn,
      heatOut,
      work,
    };
    const id = this._generateId();
    this._engines.set(id, { id, engine, timestamp: Date.now() });
    this._recordHistory(`braytonCycle: r_p=${pressureRatio}, γ=${gamma} -> η=${efficiency}`);
    return { efficiency, work, heatIn, heatOut };
  }

  /**
   * 制冷系数：COP_R = T_cold / (T_hot - T_cold)
   * Coefficient of performance for a refrigerator
   */
  public refrigeratorCOP(T_hot: number, T_cold: number): {
    cop: number;
    heatExtracted: number;
    workInput: number;
  } {
    if (T_hot <= T_cold) throw new Error('T_hot must be > T_cold');
    const cop = T_cold / (T_hot - T_cold);
    const heatExtracted = 1000;
    const workInput = heatExtracted / cop;
    const fridge: Refrigerator = {
      type: 'refrigerator',
      cop,
      heatExtracted,
      workInput,
      heatDelivered: heatExtracted + workInput,
    };
    void fridge;
    this._recordHistory(`refrigeratorCOP: T_hot=${T_hot}, T_cold=${T_cold} -> COP=${cop}`);
    return { cop, heatExtracted, workInput };
  }

  /**
   * 热泵性能系数：COP_HP = T_hot / (T_hot - T_cold)
   * Heat pump coefficient of performance
   */
  public heatPumpCOP(T_hot: number, T_cold: number): {
    cop: number;
    heatDelivered: number;
    workInput: number;
  } {
    if (T_hot <= T_cold) throw new Error('T_hot must be > T_cold');
    const cop = T_hot / (T_hot - T_cold);
    const heatDelivered = 1000;
    const workInput = heatDelivered / cop;
    this._recordHistory(`heatPumpCOP: T_hot=${T_hot}, T_cold=${T_cold} -> COP=${cop}`);
    return { cop, heatDelivered, workInput };
  }

  /**
   * 热传导：Q/t = k * A * ΔT / L
   * Heat conduction (Fourier's Law)
   */
  public heatConduction(k: number, A: number, dT: number, L: number): number {
    if (L <= 0) throw new Error('Thickness L must be positive');
    if (k < 0 || A < 0) throw new Error('k and A must be non-negative');
    const rate = (k * A * dT) / L;
    this._registerTransfer({
      type: 'conduction',
      amount: rate,
      direction: dT >= 0 ? 'in' : 'out',
    });
    this._recordHistory(`heatConduction: k=${k}, A=${A}, ΔT=${dT}, L=${L} -> Q/t=${rate}`);
    return rate;
  }

  /**
   * 热阻：R_th = L / (k * A)
   * Thermal resistance
   */
  public thermalResistance(k: number, A: number, L: number): number {
    if (k <= 0 || A <= 0) throw new Error('k and A must be positive');
    const R = L / (k * A);
    this._recordHistory(`thermalResistance: k=${k}, A=${A}, L=${L} -> R=${R}`);
    return R;
  }

  /**
   * 串联热阻：R = Σ R_i
   * Series thermal resistance
   */
  public seriesThermalResistance(resistances: number[]): number {
    if (resistances.length === 0) return 0;
    const total = resistances.reduce((s, r) => s + r, 0);
    this._recordHistory(`seriesThermalResistance: ${resistances.length} layers -> R=${total}`);
    return total;
  }

  /**
   * 并联热阻：1/R = Σ 1/R_i
   * Parallel thermal resistance
   */
  public parallelThermalResistance(resistances: number[]): number {
    if (resistances.length === 0) return 0;
    let sumReciprocal = 0;
    for (const r of resistances) {
      if (r === 0) return 0;
      sumReciprocal += 1 / r;
    }
    const total = sumReciprocal === 0 ? Infinity : 1 / sumReciprocal;
    this._recordHistory(`parallelThermalResistance: ${resistances.length} layers -> R=${total}`);
    return total;
  }

  /**
   * 对流换热：Q = h * A * ΔT
   * Convective heat transfer (Newton's law of cooling)
   */
  public convection(h: number, A: number, dT: number): number {
    if (h < 0 || A < 0) throw new Error('h and A must be non-negative');
    const rate = h * A * dT;
    this._registerTransfer({
      type: 'convection',
      amount: rate,
      direction: dT >= 0 ? 'in' : 'out',
    });
    this._recordHistory(`convection: h=${h}, A=${A}, ΔT=${dT} -> Q=${rate}`);
    return rate;
  }

  /**
   * 热辐射：P = ε * σ * A * (T^4 - T_env^4)
   * Radiative heat transfer (Stefan-Boltzmann)
   */
  public radiation(epsilon: number, sigma: number, T: number, T_env: number): number {
    if (epsilon < 0 || epsilon > 1) throw new Error('Emissivity must be in [0, 1]');
    if (T < 0 || T_env < 0) throw new Error('Temperatures must be non-negative');
    const power = epsilon * sigma * (Math.pow(T, 4) - Math.pow(T_env, 4));
    this._registerTransfer({
      type: 'radiation',
      amount: power,
      direction: T >= T_env ? 'out' : 'in',
    });
    this._recordHistory(`radiation: ε=${epsilon}, σ=${sigma}, T=${T}, T_env=${T_env} -> P=${power}`);
    return power;
  }

  /**
   * 维恩位移定律：λ_max * T = b (b = 2.898e-3 m·K)
   * Wien's displacement law
   */
  public wienDisplacementLaw(T: number): { peakWavelength: number; peakFrequency: number } {
    if (T <= 0) throw new Error('Temperature must be positive');
    const b = 2.898e-3;
    const peakWavelength = b / T;
    const peakFrequency = (5.879e10) * T;
    this._recordHistory(`wienDisplacementLaw: T=${T} -> λ_max=${peakWavelength} m`);
    return { peakWavelength, peakFrequency };
  }

  /**
   * 普朗克黑体辐射定律（谱辐射度）
   * Planck's law of blackbody radiation
   */
  public planckRadiationLaw(wavelength: number, T: number): number {
    if (wavelength <= 0 || T <= 0) throw new Error('Wavelength and T must be positive');
    const h = 6.62607015e-34;
    const c = 299792458;
    const exponent = (h * c) / (wavelength * K_B * T);
    const spectralRadiance = (2 * h * c * c) / (Math.pow(wavelength, 5) * (Math.exp(exponent) - 1));
    this._recordHistory(`planckRadiationLaw: λ=${wavelength}, T=${T} -> B=${spectralRadiance}`);
    return spectralRadiance;
  }

  /**
   * 斯特藩-玻尔兹曼定律：P/A = σ * T^4
   * Stefan-Boltzmann law
   */
  public stefanBoltzmannLaw(T: number, emissivity: number = 1): number {
    if (T < 0) throw new Error('Temperature must be non-negative');
    if (emissivity < 0 || emissivity > 1) throw new Error('Emissivity must be in [0, 1]');
    const powerPerArea = emissivity * SIGMA_SB * Math.pow(T, 4);
    this._recordHistory(`stefanBoltzmannLaw: T=${T}, ε=${emissivity} -> P/A=${powerPerArea}`);
    return powerPerArea;
  }

  /**
   * 比热容：Q = m * c * ΔT
   * Specific heat capacity
   */
  public specificHeat(mass: number, c: number, dT: number): number {
    if (mass < 0 || c < 0) throw new Error('Mass and specific heat must be non-negative');
    const heat = mass * c * dT;
    this._registerTransfer({
      type: 'conduction',
      amount: heat,
      direction: dT >= 0 ? 'in' : 'out',
    });
    this._recordHistory(`specificHeat: m=${mass}, c=${c}, ΔT=${dT} -> Q=${heat}`);
    return heat;
  }

  /**
   * 迈耶关系：C_p - C_v = R
   * Mayer's relation
   */
  public mayerRelation(Cp: number, Cv: number): { R: number; consistent: boolean; gamma: number } {
    const R = Cp - Cv;
    const consistent = Math.abs(R - R_GAS) < 1e-3 * R_GAS;
    const gamma = Cv > 0 ? Cp / Cv : 0;
    this._recordHistory(`mayerRelation: Cp=${Cp}, Cv=${Cv} -> R=${R}, γ=${gamma}`);
    return { R, consistent, gamma };
  }

  /**
   * 热容比（绝热指数）：γ = C_p / C_v
   * Heat capacity ratio (adiabatic index)
   */
  public heatCapacityRatio(Cp: number, Cv: number): HeatCapacitySystem {
    if (Cv <= 0) throw new Error('Cv must be positive');
    const gamma = Cp / Cv;
    this._recordHistory(`heatCapacityRatio: Cp=${Cp}, Cv=${Cv} -> γ=${gamma}`);
    return { cv: Cv, cp: Cp, gamma, molarCv: Cv, molarCp: Cp };
  }

  /**
   * 潜热：Q = m * L
   * Latent heat (phase transition)
   */
  public latentHeat(mass: number, L: number): number {
    if (mass < 0) throw new Error('Mass must be non-negative');
    const heat = mass * L;
    this._registerTransfer({
      type: 'conduction',
      amount: heat,
      direction: L >= 0 ? 'in' : 'out',
    });
    this._recordHistory(`latentHeat: m=${mass}, L=${L} -> Q=${heat}`);
    return heat;
  }

  /**
   * 相变过程
   * Phase transition analysis
   */
  public phaseTransition(
    from: 'solid' | 'liquid' | 'gas' | 'plasma',
    to: 'solid' | 'liquid' | 'gas' | 'plasma',
    temperature: number,
    mass: number,
    latentHeat: number,
  ): PhaseTransition {
    if (temperature < 0) throw new Error('Temperature must be non-negative');
    if (mass < 0) throw new Error('Mass must be non-negative');
    const Q = mass * latentHeat;
    const entropyChange = Q / temperature;
    const transition: PhaseTransition = {
      from,
      to,
      temperature,
      latentHeat: Q,
      entropyChange,
    };
    this._recordHistory(`phaseTransition: ${from}->${to} at T=${temperature}, Q=${Q}`);
    return transition;
  }

  /**
   * 克劳修斯-克拉珀龙方程：dP/dT = L / (T * ΔV)
   * Clausius-Clapeyron equation
   */
  public clausiusClapeyron(L: number, T: number, deltaV: number): { slope: number; latentHeatPerVolume: number } {
    if (T <= 0) throw new Error('Temperature must be positive');
    if (deltaV === 0) throw new Error('ΔV must be non-zero');
    const slope = L / (T * deltaV);
    const latentHeatPerVolume = L / deltaV;
    this._recordHistory(`clausiusClapeyron: L=${L}, T=${T}, ΔV=${deltaV} -> dP/dT=${slope}`);
    return { slope, latentHeatPerVolume };
  }

  /**
   * 安托万方程：log10(P) = A - B/(C+T)
   * Antoine equation for vapor pressure
   */
  public antoineEquation(A: number, B: number, C: number, T: number): { vaporPressure: number; consistent: boolean } {
    if (C + T === 0) throw new Error('C + T must be non-zero');
    const logP = A - B / (C + T);
    const vaporPressure = Math.pow(10, logP);
    const consistent = vaporPressure > 0;
    this._recordHistory(`antoineEquation: T=${T} -> P=${vaporPressure}`);
    return { vaporPressure, consistent };
  }

  /**
   * 熵变：ΔS = Q / T
   * Entropy change
   */
  public entropyChange(Q: number, T: number): number {
    if (T <= 0) throw new Error('Temperature must be positive');
    const deltaS = Q / T;
    this._recordHistory(`entropyChange: Q=${Q}, T=${T} -> ΔS=${deltaS}`);
    return deltaS;
  }

  /**
   * 等温过程熵变：ΔS = nR * ln(V2/V1)
   * Isothermal entropy change
   */
  public isothermalEntropyChange(n: number, V1: number, V2: number): number {
    if (V1 <= 0 || V2 <= 0) throw new Error('Volumes must be positive');
    const deltaS = n * R_GAS * Math.log(V2 / V1);
    this._recordHistory(`isothermalEntropyChange: n=${n}, V1=${V1}, V2=${V2} -> ΔS=${deltaS}`);
    return deltaS;
  }

  /**
   * 玻尔兹曼分布：P(E) ∝ exp(-E / kT)
   * Boltzmann distribution
   */
  public boltzmannDistribution(energy: number, temperature: number): {
    probability: number;
    partitionContribution: number;
  } {
    if (temperature <= 0) throw new Error('Temperature must be positive');
    const probability = Math.exp(-energy / (K_B * temperature));
    const partitionContribution = probability;
    this._recordHistory(
      `boltzmannDistribution: E=${energy}, T=${temperature} -> P=${probability}`,
    );
    return { probability, partitionContribution };
  }

  /**
   * 配分函数：Z = Σ exp(-E_i / kT)
   * Partition function
   */
  public partitionFunction(energies: number[], T: number): {
    Z: number;
    averageEnergy: number;
    freeEnergy: number;
    entropy: number;
  } {
    if (T <= 0) throw new Error('Temperature must be positive');
    if (energies.length === 0) return { Z: 0, averageEnergy: 0, freeEnergy: 0, entropy: 0 };
    const boltzmannFactors = energies.map(E => Math.exp(-E / (K_B * T)));
    const Z = boltzmannFactors.reduce((s, b) => s + b, 0);
    let averageEnergy = 0;
    for (let i = 0; i < energies.length; i++) {
      averageEnergy += energies[i] * boltzmannFactors[i];
    }
    averageEnergy = Z > 0 ? averageEnergy / Z : 0;
    const freeEnergy = -K_B * T * Math.log(Math.max(Z, 1e-300));
    const entropy = Z > 0
      ? (averageEnergy - freeEnergy) / T
      : 0;
    this._recordHistory(`partitionFunction: ${energies.length} states, T=${T} -> Z=${Z}, <E>=${averageEnergy}`);
    return { Z, averageEnergy, freeEnergy, entropy };
  }

  /**
   * 麦克斯韦-玻尔兹曼分布：最概然速率 v_p = √(2kT/m)
   * Maxwell-Boltzmann distribution
   */
  public maxwellBoltzmann(mass: number, T: number): {
    vMostProbable: number;
    vAverage: number;
    vRms: number;
  } {
    if (mass <= 0) throw new Error('Mass must be positive');
    if (T <= 0) throw new Error('Temperature must be positive');
    const kT_over_m = (K_B * T) / mass;
    const vMostProbable = Math.sqrt(2 * kT_over_m);
    const vAverage = Math.sqrt((8 * kT_over_m) / Math.PI);
    const vRms = Math.sqrt(3 * kT_over_m);
    this._recordHistory(
      `maxwellBoltzmann: m=${mass}, T=${T} -> v_p=${vMostProbable}, v_avg=${vAverage}, v_rms=${vRms}`,
    );
    return { vMostProbable, vAverage, vRms };
  }

  /**
   * 麦克斯韦-玻尔兹曼速率分布函数：f(v) = 4π * (m/(2πkT))^(3/2) * v² * exp(-mv²/(2kT))
   * Maxwell-Boltzmann speed distribution
   */
  public maxwellBoltzmannPDF(v: number, mass: number, T: number): number {
    if (mass <= 0 || T <= 0) throw new Error('Mass and T must be positive');
    if (v < 0) return 0;
    const factor = Math.pow(mass / (2 * Math.PI * K_B * T), 1.5);
    const pdf = 4 * Math.PI * factor * v * v * Math.exp(-(mass * v * v) / (2 * K_B * T));
    this._recordHistory(`maxwellBoltzmannPDF: v=${v} -> f(v)=${pdf}`);
    return pdf;
  }

  /**
   * 能量均分定理：每个自由度贡献 (1/2)kT
   * Equipartition theorem
   */
  public equipartitionTheorem(degreesOfFreedom: number, T: number): {
    averageEnergy: number;
    totalEnergy: number;
  } {
    if (degreesOfFreedom < 0) throw new Error('Degrees of freedom must be non-negative');
    if (T < 0) throw new Error('Temperature must be non-negative');
    const averageEnergy = 0.5 * K_B * T;
    const totalEnergy = degreesOfFreedom * averageEnergy;
    this._recordHistory(
      `equipartitionTheorem: dof=${degreesOfFreedom}, T=${T} -> E=${totalEnergy}`,
    );
    return { averageEnergy, totalEnergy };
  }

  /**
   * 气体动理论压强：P = (1/3) * n * m * <v²>
   * Kinetic theory of gases pressure
   */
  public kineticTheoryPressure(n: number, mass: number, vRms: number): number {
    if (n < 0 || mass < 0) throw new Error('n and mass must be non-negative');
    const P = (1 / 3) * n * mass * vRms * vRms;
    this._recordHistory(`kineticTheoryPressure: n=${n}, m=${mass}, v_rms=${vRms} -> P=${P}`);
    return P;
  }

  /**
   * 平均自由程：λ = kT / (√2 * π * d² * P)
   * Mean free path
   */
  public meanFreePath(T: number, P: number, diameter: number): number {
    if (T <= 0 || P <= 0 || diameter <= 0) {
      throw new Error('T, P, and diameter must be positive');
    }
    const lambda = (K_B * T) / (Math.SQRT2 * Math.PI * diameter * diameter * P);
    this._recordHistory(`meanFreePath: T=${T}, P=${P}, d=${diameter} -> λ=${lambda}`);
    return lambda;
  }

  /**
   * 等温过程：W = nRT * ln(V2/V1)
   * Isothermal process
   */
  public isothermalProcess(n: number, T: number, V1: number, V2: number): ThermodynamicProcess {
    if (T <= 0 || V1 <= 0 || V2 <= 0) throw new Error('T, V1, V2 must be positive');
    const work = n * R_GAS * T * Math.log(V2 / V1);
    const heat = work;
    const deltaU = 0;
    const deltaS = n * R_GAS * Math.log(V2 / V1);
    const P2 = (n * R_GAS * T) / V2;
    const process: ThermodynamicProcess = {
      type: 'isothermal',
      work,
      heat,
      deltaU,
      deltaS,
      finalPressure: P2,
      finalVolume: V2,
      finalTemperature: T,
    };
    const id = this._generateId();
    this._processes.set(id, { id, process, timestamp: Date.now() });
    this._recordHistory(`isothermalProcess: W=${work}, Q=${heat}`);
    return process;
  }

  /**
   * 等压过程：W = P * ΔV, Q = n * Cp * ΔT
   * Isobaric process
   */
  public isobaricProcess(n: number, P: number, T1: number, T2: number, Cp: number): ThermodynamicProcess {
    if (P <= 0 || T1 <= 0 || T2 <= 0) throw new Error('P, T1, T2 must be positive');
    const V1 = (n * R_GAS * T1) / P;
    const V2 = (n * R_GAS * T2) / P;
    const work = P * (V2 - V1);
    const heat = n * Cp * (T2 - T1);
    const deltaU = heat - work;
    const deltaS = n * Cp * Math.log(T2 / T1);
    const process: ThermodynamicProcess = {
      type: 'isobaric',
      work,
      heat,
      deltaU,
      deltaS,
      finalPressure: P,
      finalVolume: V2,
      finalTemperature: T2,
    };
    const id = this._generateId();
    this._processes.set(id, { id, process, timestamp: Date.now() });
    this._recordHistory(`isobaricProcess: W=${work}, Q=${heat}`);
    return process;
  }

  /**
   * 等容过程：W = 0, Q = n * Cv * ΔT
   * Isochoric process
   */
  public isochoricProcess(n: number, V: number, T1: number, T2: number, Cv: number): ThermodynamicProcess {
    if (V <= 0 || T1 <= 0 || T2 <= 0) throw new Error('V, T1, T2 must be positive');
    const P1 = (n * R_GAS * T1) / V;
    const P2 = (n * R_GAS * T2) / V;
    const work = 0;
    const heat = n * Cv * (T2 - T1);
    const deltaU = heat;
    const deltaS = n * Cv * Math.log(T2 / T1);
    const process: ThermodynamicProcess = {
      type: 'isochoric',
      work,
      heat,
      deltaU,
      deltaS,
      finalPressure: P2,
      finalVolume: V,
      finalTemperature: T2,
    };
    const id = this._generateId();
    this._processes.set(id, { id, process, timestamp: Date.now() });
    this._recordHistory(`isochoricProcess: P1=${P1} -> P2=${P2}, Q=${heat}`);
    return process;
  }

  /**
   * 绝热过程：P * V^γ = const, T * V^(γ-1) = const
   * Adiabatic process
   */
  public adiabaticProcess(n: number, gamma: number, V1: number, T1: number, V2: number): ThermodynamicProcess {
    if (n <= 0 || gamma <= 1) throw new Error('n must be positive, γ > 1');
    if (V1 <= 0 || T1 <= 0 || V2 <= 0) throw new Error('V1, T1, V2 must be positive');
    const T2 = T1 * Math.pow(V1 / V2, gamma - 1);
    const P1 = (n * R_GAS * T1) / V1;
    const P2 = P1 * Math.pow(V1 / V2, gamma);
    const Cv = R_GAS / (gamma - 1);
    const work = n * Cv * (T1 - T2);
    const heat = 0;
    const deltaU = -work;
    const deltaS = 0;
    const process: ThermodynamicProcess = {
      type: 'adiabatic',
      work,
      heat,
      deltaU,
      deltaS,
      finalPressure: P2,
      finalVolume: V2,
      finalTemperature: T2,
    };
    const id = this._generateId();
    this._processes.set(id, { id, process, timestamp: Date.now() });
    this._recordHistory(`adiabaticProcess: T1=${T1}, V1=${V1} -> T2=${T2}, V2=${V2}`);
    return process;
  }

  /**
   * 多方过程：P * V^n = const
   * Polytropic process
   */
  public polytropicProcess(n_moles: number, polytropicIndex: number, V1: number, P1: number, V2: number): ThermodynamicProcess {
    if (V1 <= 0 || V2 <= 0 || P1 <= 0) throw new Error('V1, V2, P1 must be positive');
    const P2 = P1 * Math.pow(V1 / V2, polytropicIndex);
    const T1 = (P1 * V1) / (n_moles * R_GAS);
    const T2 = (P2 * V2) / (n_moles * R_GAS);
    const work = polytropicIndex !== 1
      ? (P1 * V1 - P2 * V2) / (polytropicIndex - 1)
      : P1 * V1 * Math.log(V2 / V1);
    const Cv = (3 / 2) * R_GAS;
    const deltaU = n_moles * Cv * (T2 - T1);
    const heat = deltaU + work;
    const deltaS = n_moles * Cv * Math.log(T2 / T1) + n_moles * R_GAS * Math.log(V2 / V1);
    const process: ThermodynamicProcess = {
      type: 'polytropic',
      work,
      heat,
      deltaU,
      deltaS,
      finalPressure: P2,
      finalVolume: V2,
      finalTemperature: T2,
    };
    const id = this._generateId();
    this._processes.set(id, { id, process, timestamp: Date.now() });
    this._recordHistory(`polytropicProcess: n_idx=${polytropicIndex}, V1=${V1} -> V2=${V2}`);
    return process;
  }

  /**
   * 范德瓦尔斯方程：(P + a*n²/V²)(V - n*b) = nRT
   * Van der Waals equation of state
   */
  public vanDerWaals(P: number, V: number, n: number, T: number, a: number, b: number): {
    correctedPressure: number;
    correctedVolume: number;
    consistent: boolean;
  } {
    if (V <= 0 || n <= 0 || T <= 0) throw new Error('V, n, T must be positive');
    const correctedPressure = (n * R_GAS * T) / (V - n * b) - (a * n * n) / (V * V);
    const correctedVolume = (n * R_GAS * T) / (P + (a * n * n) / (V * V)) + n * b;
    const consistent = Math.abs(correctedPressure - P) < 1e-3 * Math.max(1, Math.abs(P));
    this._recordHistory(`vanDerWaals: P_corr=${correctedPressure}, V_corr=${correctedVolume}`);
    return { correctedPressure, correctedVolume, consistent };
  }

  /**
   * 焓：H = U + PV
   * Enthalpy
   */
  public enthalpy(internalEnergy: number, P: number, V: number): number {
    if (P < 0 || V < 0) throw new Error('P and V must be non-negative');
    const H = internalEnergy + P * V;
    this._recordHistory(`enthalpy: U=${internalEnergy}, PV=${P * V} -> H=${H}`);
    return H;
  }

  /**
   * 赫姆霍兹自由能：F = U - TS
   * Helmholtz free energy
   */
  public helmholtzFreeEnergy(internalEnergy: number, T: number, S: number): number {
    if (T < 0) throw new Error('Temperature must be non-negative');
    const F = internalEnergy - T * S;
    this._recordHistory(`helmholtzFreeEnergy: U=${internalEnergy}, T=${T}, S=${S} -> F=${F}`);
    return F;
  }

  /**
   * 吉布斯自由能：G = H - TS = U + PV - TS
   * Gibbs free energy
   */
  public gibbsFreeEnergy(enthalpy: number, T: number, S: number): number {
    if (T < 0) throw new Error('Temperature must be non-negative');
    const G = enthalpy - T * S;
    this._recordHistory(`gibbsFreeEnergy: H=${enthalpy}, T=${T}, S=${S} -> G=${G}`);
    return G;
  }

  /**
   * 热力学势全集
   * All four thermodynamic potentials at once
   */
  public thermodynamicPotentials(U: number, T: number, S: number, P: number, V: number): ThermodynamicPotentials {
    if (T < 0 || P < 0 || V < 0) throw new Error('T, P, V must be non-negative');
    const H = U + P * V;
    const F = U - T * S;
    const G = H - T * S;
    this._recordHistory(`thermodynamicPotentials: U=${U}, H=${H}, F=${F}, G=${G}`);
    return { internalEnergy: U, enthalpy: H, helmholtz: F, gibbs: G };
  }

  /**
   * 麦克斯韦关系（四个）
   * Maxwell relations (thermodynamic square)
   */
  public maxwellRelations(): {
    dSdV: string;
    dSdP: string;
    dTdV: string;
    dTdP: string;
  } {
    this._recordHistory('maxwellRelations: returned four Maxwell relations');
    return {
      dSdV: '(∂S/∂V)_T = (∂P/∂T)_V',
      dSdP: '(∂S/∂P)_T = -(∂V/∂T)_P',
      dTdV: '(∂T/∂V)_S = -(∂P/∂S)_V',
      dTdP: '(∂T/∂P)_S = (∂V/∂S)_P',
    };
  }

  /**
   * 赫斯定律：反应焓变与路径无关
   * Hess's law
   */
  public hessLaw(reactions: Array<{ equation: string; enthalpy: number }>): {
    totalEnthalpy: number;
    steps: number;
    path: string[];
  } {
    if (reactions.length === 0) return { totalEnthalpy: 0, steps: 0, path: [] };
    const totalEnthalpy = reactions.reduce((s, r) => s + r.enthalpy, 0);
    const path = reactions.map(r => `${r.equation} (ΔH=${r.enthalpy})`);
    this._recordHistory(`hessLaw: ${reactions.length} steps -> ΔH_total=${totalEnthalpy}`);
    return { totalEnthalpy, steps: reactions.length, path };
  }

  /**
   * 基尔霍夫方程：ΔG(T2) = ΔG(T1) - ΔS * (T2 - T1) (近似)
   * Gibbs-Helmholtz equation
   */
  public gibbsHelmholtzEquation(G1: number, T1: number, T2: number, S: number): {
    G2: number;
    deltaG: number;
  } {
    if (T1 <= 0 || T2 <= 0) throw new Error('Temperatures must be positive');
    const deltaG = -S * (T2 - T1);
    const G2 = G1 + deltaG;
    this._recordHistory(`gibbsHelmholtzEquation: G1=${G1}, T1=${T1}, T2=${T2}, S=${S} -> G2=${G2}`);
    return { G2, deltaG };
  }

  /**
   * 焦耳-汤姆孙系数：μ_JT = (∂T/∂P)_H
   * Joule-Thomson coefficient (approximate)
   */
  public jouleThomsonCoefficient(T: number, Cp: number, a: number, b: number): number {
    if (Cp <= 0 || T <= 0) throw new Error('Cp and T must be positive');
    const mu = (1 / Cp) * ((2 * a) / (R_GAS * T) - b);
    this._recordHistory(`jouleThomsonCoefficient: T=${T}, Cp=${Cp} -> μ=${mu}`);
    return mu;
  }

  /**
   * 线膨胀：ΔL = α * L_0 * ΔT
   * Linear thermal expansion
   */
  public linearExpansion(alpha: number, L0: number, dT: number): {
    deltaL: number;
    finalLength: number;
  } {
    if (alpha < 0) throw new Error('α must be non-negative');
    if (L0 < 0) throw new Error('L0 must be non-negative');
    const deltaL = alpha * L0 * dT;
    this._recordHistory(`linearExpansion: α=${alpha}, L0=${L0}, ΔT=${dT} -> ΔL=${deltaL}`);
    return { deltaL, finalLength: L0 + deltaL };
  }

  /**
   * 体积膨胀：ΔV = β * V_0 * ΔT
   * Volumetric thermal expansion
   */
  public volumetricExpansion(beta: number, V0: number, dT: number): {
    deltaV: number;
    finalVolume: number;
  } {
    if (beta < 0) throw new Error('β must be non-negative');
    if (V0 < 0) throw new Error('V0 must be non-negative');
    const deltaV = beta * V0 * dT;
    this._recordHistory(`volumetricExpansion: β=${beta}, V0=${V0}, ΔT=${dT} -> ΔV=${deltaV}`);
    return { deltaV, finalVolume: V0 + deltaV };
  }

  /**
   * 拉乌尔定律：P_i = x_i * P*_i
   * Raoult's law for ideal solutions
   */
  public raoultsLaw(moleFractions: number[], pureVaporPressures: number[]): {
    totalPressure: number;
    partialPressures: number[];
  } {
    if (moleFractions.length !== pureVaporPressures.length) {
      throw new Error('Arrays must have equal length');
    }
    const partialPressures = moleFractions.map((x, i) => x * pureVaporPressures[i]);
    const totalPressure = partialPressures.reduce((s, p) => s + p, 0);
    this._recordHistory(`raoultsLaw: ${moleFractions.length} components -> P_total=${totalPressure}`);
    return { totalPressure, partialPressures };
  }

  /**
   * 亨利定律：P = k_H * x
   * Henry's law for gas solubility
   */
  public henrysLaw(kH: number, moleFraction: number): { pressure: number; solubility: number } {
    if (kH < 0) throw new Error('k_H must be non-negative');
    const pressure = kH * moleFraction;
    const solubility = moleFraction;
    this._recordHistory(`henrysLaw: k_H=${kH}, x=${moleFraction} -> P=${pressure}`);
    return { pressure, solubility };
  }

  /**
   * 沸点升高：ΔT_b = K_b * m
   * Boiling point elevation
   */
  public boilingPointElevation(Kb: number, molality: number, vanHoffFactor: number = 1): number {
    if (Kb < 0 || molality < 0) throw new Error('Kb and molality must be non-negative');
    const dTb = Kb * molality * vanHoffFactor;
    this._recordHistory(`boilingPointElevation: Kb=${Kb}, m=${molality}, i=${vanHoffFactor} -> ΔT_b=${dTb}`);
    return dTb;
  }

  /**
   * 凝固点降低：ΔT_f = K_f * m
   * Freezing point depression
   */
  public freezingPointDepression(Kf: number, molality: number, vanHoffFactor: number = 1): number {
    if (Kf < 0 || molality < 0) throw new Error('Kf and molality must be non-negative');
    const dTf = Kf * molality * vanHoffFactor;
    this._recordHistory(`freezingPointDepression: Kf=${Kf}, m=${molality}, i=${vanHoffFactor} -> ΔT_f=${dTf}`);
    return dTf;
  }

  /**
   * 渗透压：π = M * R * T
   * Osmotic pressure
   */
  public osmoticPressure(molarity: number, T: number, vanHoffFactor: number = 1): number {
    if (T <= 0) throw new Error('T must be positive');
    if (molarity < 0) throw new Error('molarity must be non-negative');
    const pi = vanHoffFactor * molarity * R_GAS * T;
    this._recordHistory(`osmoticPressure: M=${molarity}, T=${T}, i=${vanHoffFactor} -> π=${pi}`);
    return pi;
  }

  /**
   * 爱因斯坦固体比热模型
   * Einstein model of specific heat
   */
  public einsteinModel(T: number, thetaE: number, n: number = 1): { cv: number; highTRange: boolean } {
    if (T <= 0 || thetaE <= 0) throw new Error('T and θ_E must be positive');
    const x = thetaE / T;
    const ex = Math.exp(x);
    const cv = 3 * n * R_GAS * (x * x * ex) / Math.pow(ex - 1, 2);
    const highTRange = T > 5 * thetaE;
    this._recordHistory(`einsteinModel: T=${T}, θ_E=${thetaE} -> Cv=${cv}`);
    return { cv, highTRange };
  }

  /**
   * 德拜模型比热（低温近似：C ~ T³）
   * Debye model of specific heat
   */
  public debyeModel(T: number, thetaD: number, n: number = 1): { cv: number; lowTApprox: number } {
    if (T <= 0 || thetaD <= 0) throw new Error('T and θ_D must be positive');
    const x = thetaD / T;
    let cv: number;
    if (x < 20) {
      const ex = Math.exp(x);
      cv = 9 * n * R_GAS * Math.pow(T / thetaD, 3) *
        (x * x * ex) / Math.pow(ex - 1, 2);
    } else {
      cv = (12 * Math.PI * Math.PI * Math.PI / 5) * n * R_GAS * Math.pow(T / thetaD, 3);
    }
    const lowTApprox = (12 * Math.PI * Math.PI * Math.PI / 5) * n * R_GAS * Math.pow(T / thetaD, 3);
    this._recordHistory(`debyeModel: T=${T}, θ_D=${thetaD} -> Cv=${cv}`);
    return { cv, lowTApprox };
  }

  /**
   * 临界点估计（范德瓦尔斯）：T_c = 8a/(27Rb), P_c = a/(27b²)
   * Critical point (van der Waals)
   */
  public criticalPoint(a: number, b: number): {
    criticalTemperature: number;
    criticalPressure: number;
    criticalVolume: number;
    compressibilityFactor: number;
  } {
    if (a <= 0 || b <= 0) throw new Error('a and b must be positive');
    const Tc = (8 * a) / (27 * R_GAS * b);
    const Pc = a / (27 * b * b);
    const Vc = 3 * b;
    const Zc = (Pc * Vc) / (R_GAS * Tc);
    this._recordHistory(`criticalPoint: T_c=${Tc}, P_c=${Pc}, V_c=${Vc}, Z_c=${Zc}`);
    return {
      criticalTemperature: Tc,
      criticalPressure: Pc,
      criticalVolume: Vc,
      compressibilityFactor: Zc,
    };
  }

  /**
   * 化学势（理想气体）：μ = μ° + RT * ln(P/P°)
   * Chemical potential of ideal gas
   */
  public chemicalPotential(muStandard: number, P: number, P0: number = P_ATM, T: number = 298.15): number {
    if (P <= 0 || P0 <= 0) throw new Error('P and P0 must be positive');
    if (T <= 0) throw new Error('T must be positive');
    const mu = muStandard + R_GAS * T * Math.log(P / P0);
    this._recordHistory(`chemicalPotential: μ°=${muStandard}, P=${P} -> μ=${mu}`);
    return mu;
  }

  /**
   * 理想气体声速：c = √(γ * R * T / M)
   * Speed of sound in ideal gas
   */
  public speedOfSoundInGas(gamma: number, T: number, molarMass: number): number {
    if (gamma <= 1 || T <= 0 || molarMass <= 0) {
      throw new Error('γ > 1, T > 0, M > 0 required');
    }
    const c = Math.sqrt((gamma * R_GAS * T) / molarMass);
    this._recordHistory(`speedOfSoundInGas: γ=${gamma}, T=${T}, M=${molarMass} -> c=${c}`);
    return c;
  }

  /**
   * 热扩散率：α = k / (ρ * c_p)
   * Thermal diffusivity
   */
  public thermalDiffusivity(k: number, rho: number, cp: number): number {
    if (rho <= 0 || cp <= 0) throw new Error('ρ and c_p must be positive');
    if (k < 0) throw new Error('k must be non-negative');
    const alpha = k / (rho * cp);
    this._recordHistory(`thermalDiffusivity: k=${k}, ρ=${rho}, cp=${cp} -> α=${alpha}`);
    return alpha;
  }

  /**
   * 普朗克长度、时间、温度（自然单位）
   * Planck scale constants
   */
  public planckScale(): {
    planckLength: number;
    planckTime: number;
    planckTemperature: number;
    planckEnergy: number;
  } {
    const hbar = 1.054571817e-34;
    const G = 6.6743e-11;
    const c = 299792458;
    const planckLength = Math.sqrt((hbar * G) / Math.pow(c, 3));
    const planckTime = planckLength / c;
    const planckEnergy = Math.sqrt((hbar * Math.pow(c, 5)) / G);
    const planckTemperature = planckEnergy / K_B;
    this._recordHistory(`planckScale: L_p=${planckLength}, T_p=${planckTime}`);
    return { planckLength, planckTime, planckTemperature, planckEnergy };
  }

  /**
   * 玻尔兹曼熵公式：S = k_B * ln(W)
   * Boltzmann entropy formula
   */
  public boltzmannEntropy(W: number): { entropy: number; microstates: number } {
    if (W <= 0) throw new Error('W must be positive');
    const S = K_B * Math.log(W);
    this._recordHistory(`boltzmannEntropy: W=${W} -> S=${S}`);
    return { entropy: S, microstates: W };
  }

  /**
   * 信息熵（香农）转热力学熵：S = k_B * H
   * Shannon entropy → thermodynamic entropy
   */
  public shannonToThermoEntropy(probabilities: number[]): { shannon: number; thermo: number } {
    if (probabilities.length === 0) return { shannon: 0, thermo: 0 };
    let H = 0;
    for (const p of probabilities) {
      if (p > 0) H -= p * Math.log2(p);
    }
    const thermo = K_B * H * Math.log2(Math.E);
    this._recordHistory(`shannonToThermoEntropy: H=${H} bits -> S=${thermo}`);
    return { shannon: H, thermo };
  }

  /**
   * 转换为数据包
   * Serialize to DataPacket
   */
  public toPacket(): DataPacket<{
    systems: number;
    transfers: number;
    processes: number;
    engines: number;
    history: string[];
  }> {
    return {
      id: `thermo-${Date.now()}-${this._counter}`,
      payload: {
        systems: this._systems.size,
        transfers: this._transfers.size,
        processes: this._processes.size,
        engines: this._engines.size,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['physics', 'thermodynamics'],
        priority: 0.75,
        phase: 'analysis',
      },
    };
  }

  /**
   * 重置状态
   * Reset internal state
   */
  public reset(): void {
    this._systems.clear();
    this._transfers.clear();
    this._processes.clear();
    this._engines.clear();
    this._history = [];
    this._counter = 0;
  }

  // ─── Private helpers ───

  private _generateId(): string {
    return `th-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
  }

  private _registerSystem(system: ThermalSystem): void {
    const id = this._generateId();
    this._systems.set(id, { id, system, timestamp: Date.now() });
    if (this._systems.size > 500) {
      const firstKey = this._systems.keys().next().value;
      if (firstKey !== undefined) this._systems.delete(firstKey);
    }
  }

  private _registerTransfer(transfer: HeatTransfer): void {
    const id = this._generateId();
    this._transfers.set(id, { id, transfer, timestamp: Date.now() });
    if (this._transfers.size > 500) {
      const firstKey = this._transfers.keys().next().value;
      if (firstKey !== undefined) this._transfers.delete(firstKey);
    }
  }

  private _recordHistory(entry: string): void {
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  /** 暴露斯特藩-玻尔兹曼常量以便调用方使用。 */
  public static readonly STEFAN_BOLTZMANN = SIGMA_SB;
  /** 暴露理想气体常量。 */
  public static readonly R = R_GAS;
  /** 暴露玻尔兹曼常量。 */
  public static readonly BOLTZMANN = K_B;
  /** 暴露阿伏伽德罗常量。 */
  public static readonly N_A = N_A;
  /** 暴露水的三相点温度。 */
  public static readonly T_TRIPLE_WATER = T_TRIPLE_WATER;
  /** 暴露标准大气压。 */
  public static readonly P_ATM = P_ATM;
}
