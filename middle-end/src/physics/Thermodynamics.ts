/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 热力学 —— 熵与能量的舞蹈
 * Thermodynamics: The Dance of Entropy and Energy
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 从卡诺循环到玻尔兹曼分布，热力学揭示了宏观世界中能量流转与不可逆性的深层规律。
 * 熵增的箭头始终指向未来，而麦克斯韦妖在概率的迷雾中踟蹰。
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

/** 理想气体常数 R (J/(mol·K))。 */
const R_GAS = 8.314462618;
/** 斯特藩-玻尔兹曼常数 σ (W/(m^2·K^4))。 */
const SIGMA_SB = 5.670374419e-8;
/** 玻尔兹曼常数 k_B (J/K)。 */
const K_B = 1.380649e-23;

export class Thermodynamics {
  private _systems: Map<string, SystemRecord> = new Map();
  private _transfers: Map<string, TransferRecord> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get systemCount(): number { return this._systems.size; }
  get transferCount(): number { return this._transfers.size; }
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
   * 转换为数据包
   * Serialize to DataPacket
   */
  public toPacket(): DataPacket<{
    systems: number;
    transfers: number;
    history: string[];
  }> {
    return {
      id: `thermo-${Date.now()}-${this._counter}`,
      payload: {
        systems: this._systems.size,
        transfers: this._transfers.size,
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
}
