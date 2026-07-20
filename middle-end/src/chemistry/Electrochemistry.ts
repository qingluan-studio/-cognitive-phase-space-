import { DataPacket, PacketMeta } from '../shared/types';

/** Electrochemical cell descriptor. 电化学电池描述 */
export interface ElectrochemicalCell {
  anode: string;
  cathode: string;
  voltage: number;
  type: 'galvanic' | 'electrolytic' | 'concentration';
}

/** Half-reaction descriptor. 半反应描述 */
export interface HalfReaction {
  reaction: string;
  potential: number;
  electrons: number;
}

/** Corrosion descriptor. 腐蚀描述 */
export interface Corrosion {
  metal: string;
  environment: string;
  rate: number;
  severity: 'low' | 'moderate' | 'high';
}

/** Battery descriptor. 电池描述 */
export interface Battery {
  type: string;
  voltage: number;
  capacity: number; // Ah
  energyDensity: number; // Wh/kg
  cycleLife: number;
  chemistry: string;
}

/** Electrolysis result. 电解结果 */
export interface ElectrolysisResult {
  mass: number;
  moles: number;
  charge: number;
  time: number;
  current: number;
  efficiency: number;
}

/** Concentration cell descriptor. 浓差电池描述 */
export interface ConcentrationCell {
  anodeConc: number;
  cathodeConc: number;
  voltage: number;
  n: number;
}

/** pH electrode (hydrogen electrode) result. pH 电极结果 */
export interface PHElectrode {
  pH: number;
  voltage: number;
  temperature: number;
}

/** Reference electrode info. 参比电极信息 */
export interface ReferenceElectrode {
  name: string;
  potential: number; // V vs SHE
  composition: string;
  temperature: number;
}

/** Fuel cell descriptor. 燃料电池描述 */
export interface FuelCell {
  type: 'PEM' | 'PAFC' | 'MCFC' | 'SOFC' | 'AFC' | 'DMFC';
  fuel: string;
  oxidant: string;
  voltage: number;
  efficiency: number;
  operatingTemp: number;
  power: number;
}

/** Tafel plot parameters. Tafel 曲线参数 */
export interface TafelPlot {
  slope: number;
  intercept: number;
  corrosionCurrent: number;
  corrosionPotential: number;
}

/** Faradaic efficiency analysis. 法拉第效率分析 */
export interface FaradaicEfficiency {
  theoretical: number;
  actual: number;
  efficiency: number;
  sideReaction: string;
}

const FARADAY = 96485; // C/mol
const R_GAS = 8.314; // J/(mol·K)
const TEMP_REF = 298.15; // K
const FARADAY_MOL = 96485; // C/mol e-

/** Standard reduction potentials at 25°C (V vs SHE). 标准还原电位（25°C, vs SHE） */
const STANDARD_POTENTIALS: Record<string, number> = {
  'Li+/Li': -3.04,
  'K+/K': -2.93,
  'Ca2+/Ca': -2.87,
  'Na+/Na': -2.71,
  'Mg2+/Mg': -2.37,
  'Al3+/Al': -1.66,
  'Ti2+/Ti': -1.63,
  'Mn2+/Mn': -1.18,
  'Zn2+/Zn': -0.76,
  'Cr3+/Cr': -0.74,
  'Fe2+/Fe': -0.44,
  'Cd2+/Cd': -0.40,
  'Co2+/Co': -0.28,
  'Ni2+/Ni': -0.25,
  'Sn2+/Sn': -0.14,
  'Pb2+/Pb': -0.13,
  '2H+/H2': 0.00,
  'Cu2+/Cu': 0.34,
  'Cu+/Cu': 0.52,
  'I2/I-': 0.54,
  'Fe3+/Fe2+': 0.77,
  'Ag+/Ag': 0.80,
  'Hg2+/Hg': 0.85,
  'Br2/Br-': 1.07,
  'Pt2+/Pt': 1.20,
  'O2/H2O': 1.23,
  'Cl2/Cl-': 1.36,
  'Au3+/Au': 1.50,
  'MnO4-/Mn2+': 1.51,
  'Au+/Au': 1.69,
  'F2/F-': 2.87,
  'Cr2O7 2-/Cr3+': 1.33,
  'MnO2/Mn2+': 1.23,
  'PbO2/Pb2+': 1.46,
  'H2O2/H2O': 1.78,
  'O3/O2': 2.07,
  'S4O6 2-/S2O3 2-': 0.08,
  'NO3-/NO': 0.96,
  'AgCl/Ag': 0.22,
  'Hg2Cl2/Hg': 0.27,
  'PbSO4/Pb': -0.36,
};

/** Common battery chemistries. 常见电池化学体系 */
const BATTERY_CHEMISTRIES: Record<string, { voltage: number; chemistry: string; energyDensity: number; cycleLife: number }> = {
  'alkaline': { voltage: 1.5, chemistry: 'Zn/MnO2', energyDensity: 100, cycleLife: 0 },
  'lead-acid': { voltage: 2.0, chemistry: 'Pb/PbO2', energyDensity: 40, cycleLife: 500 },
  'NiCd': { voltage: 1.2, chemistry: 'NiOOH/Cd', energyDensity: 60, cycleLife: 1000 },
  'NiMH': { voltage: 1.2, chemistry: 'NiOOH/MH', energyDensity: 100, cycleLife: 1000 },
  'Li-ion': { voltage: 3.7, chemistry: 'LiCoO2/graphite', energyDensity: 200, cycleLife: 1000 },
  'LiPo': { voltage: 3.7, chemistry: 'LiCoO2/polymer', energyDensity: 200, cycleLife: 500 },
  'LiFePO4': { voltage: 3.2, chemistry: 'LiFePO4/graphite', energyDensity: 150, cycleLife: 2000 },
  'Zn-C': { voltage: 1.5, chemistry: 'Zn/MnO2', energyDensity: 60, cycleLife: 0 },
  'AgO': { voltage: 1.5, chemistry: 'AgO/Zn', energyDensity: 130, cycleLife: 0 },
  'Li-S': { voltage: 2.1, chemistry: 'Li/S', energyDensity: 400, cycleLife: 500 },
};

/** Reference electrodes table. 参比电极表 */
const REFERENCE_ELECTRODES: Record<string, { potential: number; composition: string }> = {
  'SHE': { potential: 0.000, composition: 'Pt|H2(1atm)|H+(1M)' },
  'SCE': { potential: 0.244, composition: 'Hg|Hg2Cl2|KCl(sat)' },
  'Ag/AgCl(sat)': { potential: 0.197, composition: 'Ag|AgCl|KCl(sat)' },
  'Ag/AgCl(3M)': { potential: 0.210, composition: 'Ag|AgCl|KCl(3M)' },
  'Ag/AgCl(1M)': { potential: 0.235, composition: 'Ag|AgCl|KCl(1M)' },
  'Cu/CuSO4': { potential: 0.314, composition: 'Cu|CuSO4(sat)' },
  'Hg/HgO': { potential: 0.140, composition: 'Hg|HgO|NaOH(1M)' },
};

/** Electrochemistry: cells, Nernst, electrolysis. 电化学：电池、能斯特、电解 */
export class Electrochemistry {
  private _cells: ElectrochemicalCell[] = [];
  private _reactions: HalfReaction[] = [];
  private _batteries: Battery[] = [];
  private _fuelCells: FuelCell[] = [];
  private _analyses: Array<{ type: string; result: unknown }> = [];
  private _history: unknown[] = [];
  private _counter = 0;

  /** Build a galvanic cell. 构建原电池 */
  galvanicCell(anode: string, cathode: string): ElectrochemicalCell {
    const v = this.cellVoltage(anode, cathode);
    const cell: ElectrochemicalCell = { anode, cathode, voltage: v, type: 'galvanic' };
    this._cells.push(cell);
    this._history.push({ method: 'galvanicCell' });
    return cell;
  }

  /** Build an electrolytic cell. 构建电解池 */
  electrolyticCell(anode: string, cathode: string, appliedVoltage: number): ElectrochemicalCell {
    const standardV = Math.abs(this.cellVoltage(anode, cathode));
    const cell: ElectrochemicalCell = {
      anode,
      cathode,
      voltage: appliedVoltage,
      type: 'electrolytic',
    };
    this._cells.push(cell);
    this._history.push({ method: 'electrolyticCell', appliedVoltage, standardV });
    return cell;
  }

  /** Build a concentration cell. 构建浓差电池 */
  concentrationCell(anodeConc: number, cathodeConc: number, n: number = 1): ConcentrationCell {
    // E = -(RT/nF) * ln(anodeConc/cathodeConc)
    const E = -(R_GAS * TEMP_REF / (n * FARADAY)) * Math.log(anodeConc / cathodeConc);
    const result: ConcentrationCell = {
      anodeConc,
      cathodeConc,
      voltage: E,
      n,
    };
    this._history.push({ method: 'concentrationCell', E });
    return result;
  }

  /** Look up standard reduction potential for a half-reaction. 查询标准还原电位 */
  electrodePotential(reaction: string): number {
    const e = STANDARD_POTENTIALS[reaction] ?? 0;
    const half: HalfReaction = { reaction, potential: e, electrons: 2 };
    this._reactions.push(half);
    this._history.push({ method: 'electrodePotential', reaction });
    return e;
  }

  /** Standard cell voltage = E_cathode - E_anode. 标准电池电压 */
  cellVoltage(anode: string, cathode: string): number {
    const eA = this.electrodePotential(anode);
    const eC = this.electrodePotential(cathode);
    const v = eC - eA;
    this._history.push({ method: 'cellVoltage', v });
    return v;
  }

  /** Nernst equation E = E0 - (RT/nF) * ln(Q). 能斯特方程 */
  nernstEquation(E0: number, n: number, Q: number): number {
    if (n === 0) return E0;
    const E = E0 - (R_GAS * TEMP_REF / (n * FARADAY)) * Math.log(Q);
    this._history.push({ method: 'nernstEquation' });
    return E;
  }

  /** Nernst equation at custom temperature. 自定义温度下的能斯特方程 */
  nernstEquationAtTemp(E0: number, n: number, Q: number, T: number): number {
    if (n === 0) return E0;
    const E = E0 - (R_GAS * T / (n * FARADAY)) * Math.log(Q);
    this._history.push({ method: 'nernstEquationAtTemp' });
    return E;
  }

  /** Nernst equation at 25°C using base-10 log form. 25°C 下用 log10 形式的能斯特方程 */
  nernstEquationBase10(E0: number, n: number, Q: number): number {
    if (n === 0) return E0;
    // E = E0 - (0.0592/n) * log10(Q) at 25°C
    const E = E0 - (0.0592 / n) * Math.log10(Q);
    this._history.push({ method: 'nernstEquationBase10' });
    return E;
  }

  /** Electrolysis mass deposition via Faraday's law. 法拉第电解定律 */
  electrolysis(current: number, time: number, substance: { molarMass: number; valence: number }): number {
    const q = current * time;
    const moles = q / (FARADAY * substance.valence);
    const mass = moles * substance.molarMass;
    this._history.push({ method: 'electrolysis', mass });
    return mass;
  }

  /** Detailed electrolysis with efficiency. 详细电解（含效率） */
  electrolysisDetailed(
    current: number, time: number, molarMass: number, valence: number, efficiency: number = 1,
  ): ElectrolysisResult {
    const q = current * time;
    const theoreticalMoles = q / (FARADAY * valence);
    const actualMoles = theoreticalMoles * efficiency;
    const mass = actualMoles * molarMass;
    const result: ElectrolysisResult = {
      mass,
      moles: actualMoles,
      charge: q,
      time,
      current,
      efficiency,
    };
    this._history.push({ method: 'electrolysisDetailed' });
    return result;
  }

  /** Faraday's law wrapper. 法拉第定律 */
  faradaysLaw(current: number, time: number, molarMass: number): number {
    const moles = (current * time) / FARADAY;
    const mass = moles * molarMass;
    this._history.push({ method: 'faradaysLaw', mass });
    return mass;
  }

  /** Faraday's law with valence. 含化合价的法拉第定律 */
  faradaysLawWithValence(current: number, time: number, molarMass: number, valence: number): number {
    const moles = (current * time) / (FARADAY * valence);
    const mass = moles * molarMass;
    this._history.push({ method: 'faradaysLawWithValence', mass });
    return mass;
  }

  /** Faradaic efficiency calculation. 法拉第效率计算 */
  faradaicEfficiency(actualMass: number, theoreticalMass: number, sideReaction: string = ''): FaradaicEfficiency {
    const efficiency = theoreticalMass > 0 ? (actualMass / theoreticalMass) * 100 : 0;
    const result: FaradaicEfficiency = {
      theoretical: theoreticalMass,
      actual: actualMass,
      efficiency,
      sideReaction,
    };
    this._history.push({ method: 'faradaicEfficiency' });
    return result;
  }

  /** Estimate corrosion rate for a metal in an environment. 估算金属腐蚀速率 */
  corrosionRate(metal: string, environment: string): Corrosion {
    let rate = 0.01;
    let severity: 'low' | 'moderate' | 'high' = 'low';
    if (environment.includes('salt')) {
      rate += 0.05;
      severity = 'moderate';
    }
    if (environment.includes('acid')) {
      rate += 0.1;
      severity = 'high';
    }
    if (environment.includes('moisture') || environment.includes('humid')) {
      rate += 0.02;
    }
    if (metal === 'Fe' || metal === 'Iron') {
      rate += 0.03;
    } else if (metal === 'Au' || metal === 'Pt') {
      rate = 0.001;
      severity = 'low';
    } else if (metal === 'Al' || metal === 'Aluminum') {
      rate = rate * 0.3; // passivation
    } else if (metal === 'Cu' || metal === 'Copper') {
      rate = rate * 0.5;
    } else if (metal === 'Zn' || metal === 'Zinc') {
      rate = rate * 0.8;
    }
    const result: Corrosion = { metal, environment, rate, severity };
    this._history.push({ method: 'corrosionRate', metal });
    return result;
  }

  /** Galvanic corrosion between two metals. 两种金属之间的电偶腐蚀 */
  galvanicCorrosion(metal1: string, metal2: string): { anode: string; cathode: string; voltage: number; corrodes: string } {
    const e1 = this.electrodePotential(`${metal1}+/${metal1}`);
    const e2 = this.electrodePotential(`${metal2}+/${metal2}`);
    const anode = e1 < e2 ? metal1 : metal2;
    const cathode = e1 < e2 ? metal2 : metal1;
    const voltage = Math.abs(e2 - e1);
    this._history.push({ method: 'galvanicCorrosion', anode });
    return { anode, cathode, voltage, corrodes: anode };
  }

  /** Battery capacity in Wh. 电池容量（Wh） */
  batteryCapacity(voltage: number, capacity: number): number {
    const wh = voltage * capacity;
    this._history.push({ method: 'batteryCapacity', wh });
    return wh;
  }

  /** Battery from chemistry type. 由化学体系生成电池 */
  batteryFromChemistry(type: string): Battery {
    const data = BATTERY_CHEMISTRIES[type] ?? { voltage: 1.5, chemistry: 'unknown', energyDensity: 100, cycleLife: 0 };
    const battery: Battery = {
      type,
      voltage: data.voltage,
      capacity: 2000, // mAh default
      energyDensity: data.energyDensity,
      cycleLife: data.cycleLife,
      chemistry: data.chemistry,
    };
    this._batteries.push(battery);
    this._history.push({ method: 'batteryFromChemistry', type });
    return battery;
  }

  /** Battery state of charge from voltage. 由电压计算电池荷电状态 */
  batteryStateOfCharge(currentVoltage: number, maxVoltage: number, minVoltage: number): number {
    if (maxVoltage === minVoltage) return 0;
    const soc = ((currentVoltage - minVoltage) / (maxVoltage - minVoltage)) * 100;
    this._history.push({ method: 'batteryStateOfCharge', soc });
    return Math.max(0, Math.min(100, soc));
  }

  /** Battery C-rate (1C = full discharge in 1 hour). 电池 C 倍率 */
  batteryCRate(capacity: number, current: number): number {
    if (capacity === 0) return 0;
    return current / capacity;
  }

  /** Battery discharge time. 电池放电时间 */
  batteryDischargeTime(capacity: number, current: number): number {
    if (current === 0) return Infinity;
    return capacity / current;
  }

  /** Peukert's law for lead-acid batteries. Peukert 定律（铅酸电池） */
  peukertLaw(capacity: number, current: number, k: number = 1.3): number {
    // t = H * (I/I_H)^(-k)
    // Simplified: t = capacity / current^k
    if (current <= 0) return Infinity;
    const t = capacity / Math.pow(current, k);
    this._history.push({ method: 'peukertLaw', t });
    return t;
  }

  /** Fuel cell efficiency estimate. 燃料电池效率估算 */
  fuelCell(type: string, efficiency: number): { type: string; efficiency: number; voltage: number } {
    const voltage = 1.23 * efficiency;
    this._history.push({ method: 'fuelCell', type });
    return { type, efficiency, voltage };
  }

  /** Detailed fuel cell analysis. 详细燃料电池分析 */
  fuelCellDetailed(
    type: 'PEM' | 'PAFC' | 'MCFC' | 'SOFC' | 'AFC' | 'DMFC',
    power: number = 1000,
  ): FuelCell {
    const specs: Record<string, { fuel: string; oxidant: string; voltage: number; efficiency: number; temp: number }> = {
      'PEM': { fuel: 'H2', oxidant: 'O2', voltage: 0.7, efficiency: 0.55, temp: 80 },
      'PAFC': { fuel: 'H2', oxidant: 'O2', voltage: 0.65, efficiency: 0.45, temp: 200 },
      'MCFC': { fuel: 'H2/CO', oxidant: 'O2', voltage: 0.75, efficiency: 0.55, temp: 650 },
      'SOFC': { fuel: 'H2/CO', oxidant: 'O2', voltage: 0.7, efficiency: 0.60, temp: 1000 },
      'AFC': { fuel: 'H2', oxidant: 'O2', voltage: 0.8, efficiency: 0.60, temp: 100 },
      'DMFC': { fuel: 'CH3OH', oxidant: 'O2', voltage: 0.4, efficiency: 0.40, temp: 80 },
    };
    const spec = specs[type];
    const result: FuelCell = {
      type,
      fuel: spec.fuel,
      oxidant: spec.oxidant,
      voltage: spec.voltage,
      efficiency: spec.efficiency,
      operatingTemp: spec.temp,
      power,
    };
    this._fuelCells.push(result);
    this._history.push({ method: 'fuelCellDetailed', type });
    return result;
  }

  /** Fuel cell theoretical efficiency (ΔG/ΔH). 燃料电池理论效率 */
  fuelCellTheoreticalEfficiency(dG: number, dH: number): number {
    if (dH === 0) return 0;
    return dG / dH;
  }

  /** Standard hydrogen electrode (SHE) potential. 标准氢电极电位 */
  standardHydrogenElectrode(): number {
    return 0.000;
  }

  /** pH from hydrogen electrode potential. 由氢电极电位计算 pH */
  phFromHydrogenElectrode(voltage: number, T: number = TEMP_REF): number {
    // E = -(RT/F) * ln(10) * pH
    // pH = -E / (0.0592 at 25°C)
    const slope = (R_GAS * T * Math.LN10) / FARADAY;
    const pH = -voltage / slope;
    this._history.push({ method: 'phFromHydrogenElectrode', pH });
    return pH;
  }

  /** pH electrode potential from pH. 由 pH 计算电极电位 */
  pHToElectrodePotential(pH: number, T: number = TEMP_REF): PHElectrode {
    const slope = (R_GAS * T * Math.LN10) / FARADAY;
    const voltage = -slope * pH;
    const result: PHElectrode = { pH, voltage, temperature: T };
    this._history.push({ method: 'pHToElectrodePotential' });
    return result;
  }

  /** Glass electrode slope (Nernst slope for H+). 玻璃电极斜率 */
  glassElectrodeSlope(T: number = TEMP_REF): number {
    // dE/dpH = -2.303 RT/F
    const slope = -(2.303 * R_GAS * T) / FARADAY;
    this._history.push({ method: 'glassElectrodeSlope', slope });
    return slope;
  }

  /** Get reference electrode info. 获取参比电极信息 */
  referenceElectrode(name: string): ReferenceElectrode | null {
    const data = REFERENCE_ELECTRODES[name];
    if (!data) return null;
    const result: ReferenceElectrode = {
      name,
      potential: data.potential,
      composition: data.composition,
      temperature: TEMP_REF,
    };
    this._history.push({ method: 'referenceElectrode', name });
    return result;
  }

  /** List all available reference electrodes. 列出所有可用参比电极 */
  listReferenceElectrodes(): ReferenceElectrode[] {
    return Object.entries(REFERENCE_ELECTRODES).map(([name, data]) => ({
      name,
      potential: data.potential,
      composition: data.composition,
      temperature: TEMP_REF,
    }));
  }

  /** Convert potential between reference electrodes. 参比电极间电位转换 */
  convertPotential(potential: number, fromRef: string, toRef: string): number {
    const from = REFERENCE_ELECTRODES[fromRef]?.potential ?? 0;
    const to = REFERENCE_ELECTRODES[toRef]?.potential ?? 0;
    // V(vs new) = V(vs old) + (old - new)
    const converted = potential + (from - to);
    this._history.push({ method: 'convertPotential', converted });
    return converted;
  }

  /** Gibbs free energy from cell voltage: ΔG = -nFE. 由电池电压计算吉布斯自由能 */
  gibbsFromCellVoltage(n: number, E: number): number {
    const dG = -n * FARADAY * E;
    this._history.push({ method: 'gibbsFromCellVoltage', dG });
    return dG;
  }

  /** Cell voltage from Gibbs free energy. 由吉布斯自由能计算电池电压 */
  cellVoltageFromGibbs(dG: number, n: number): number {
    if (n === 0) return 0;
    return -dG / (n * FARADAY);
  }

  /** Equilibrium constant from standard cell voltage. 由标准电池电压计算平衡常数 */
  equilibriumConstantFromVoltage(E0: number, n: number, T: number = TEMP_REF): number {
    // E° = (RT/nF) ln K → K = exp(nFE°/RT)
    const K = Math.exp((n * FARADAY * E0) / (R_GAS * T));
    this._history.push({ method: 'equilibriumConstantFromVoltage', K });
    return K;
  }

  /** Standard cell voltage from equilibrium constant. 由平衡常数计算标准电池电压 */
  voltageFromEquilibriumConstant(K: number, n: number, T: number = TEMP_REF): number {
    if (K <= 0) return 0;
    return (R_GAS * T * Math.log(K)) / (n * FARADAY);
  }

  /** Tafel equation: η = a + b log(i). Tafel 方程 */
  tafelEquation(exchangeCurrent: number, current: number, tafelSlope: number): number {
    if (exchangeCurrent <= 0) return 0;
    const overpotential = tafelSlope * Math.log10(current / exchangeCurrent);
    this._history.push({ method: 'tafelEquation', overpotential });
    return overpotential;
  }

  /** Tafel plot analysis. Tafel 曲线分析 */
  tafelPlotAnalysis(slope: number, intercept: number): TafelPlot {
    // corrosion current i_corr = 10^(intercept/slope)
    const corrosionCurrent = Math.pow(10, -intercept / slope);
    const result: TafelPlot = {
      slope,
      intercept,
      corrosionCurrent,
      corrosionPotential: intercept,
    };
    this._history.push({ method: 'tafelPlotAnalysis' });
    return result;
  }

  /** Butler-Volmer equation (simplified). Butler-Volmer 方程（简化） */
  butlerVolmer(exchangeCurrent: number, overpotential: number, alpha: number = 0.5, n: number = 1): number {
    const F_over_RT = FARADAY / (R_GAS * TEMP_REF);
    const i = exchangeCurrent * (
      Math.exp((1 - alpha) * n * F_over_RT * overpotential) -
      Math.exp(-alpha * n * F_over_RT * overpotential)
    );
    this._history.push({ method: 'butlerVolmer', i });
    return i;
  }

  /** Exchange current density from kinetic parameters. 由动力学参数计算交换电流密度 */
  exchangeCurrentDensity(k0: number, concentration: number, alpha: number = 0.5): number {
    // i0 = nFk0C^(1-α)C^α
    const i0 = FARADAY * k0 * Math.pow(concentration, alpha) * Math.pow(concentration, 1 - alpha);
    this._history.push({ method: 'exchangeCurrentDensity', i0 });
    return i0;
  }

  /** Concentration polarization. 浓差极化 */
  concentrationPolarization(limitingCurrent: number, current: number, n: number): number {
    // η_conc = (RT/nF) ln(i_L / (i_L - i))
    if (current >= limitingCurrent) return Infinity;
    const eta = (R_GAS * TEMP_REF / (n * FARADAY)) * Math.log(limitingCurrent / (limitingCurrent - current));
    this._history.push({ method: 'concentrationPolarization', eta });
    return eta;
  }

  /** Activation polarization (Tafel form). 活化极化（Tafel 形式） */
  activationPolarization(current: number, exchangeCurrent: number, beta: number = 0.12): number {
    if (exchangeCurrent <= 0) return 0;
    const eta = beta * Math.log10(current / exchangeCurrent);
    this._history.push({ method: 'activationPolarization', eta });
    return eta;
  }

  /** Limiting current from diffusion. 由扩散计算极限电流 */
  limitingCurrent(diffusionCoeff: number, concentration: number, thickness: number, n: number = 1, area: number = 1): number {
    // i_L = nFADC/δ
    if (thickness === 0) return 0;
    const iL = n * FARADAY * diffusionCoeff * concentration * area / thickness;
    this._history.push({ method: 'limitingCurrent', iL });
    return iL;
  }

  /** Diffusion coefficient from Stokes-Einstein. Stokes-Einstein 扩散系数 */
  diffusionCoefficientStokesEinstein(radius: number, viscosity: number, T: number = TEMP_REF): number {
    const kB = 1.381e-23;
    const D = (kB * T) / (6 * Math.PI * viscosity * radius);
    this._history.push({ method: 'diffusionCoefficientStokesEinstein', D });
    return D;
  }

  /** Conductivity from molar conductivity. 由摩尔电导率计算电导率 */
  conductivity(molarConductivity: number, concentration: number): number {
    return molarConductivity * concentration;
  }

  /** Kohlrausch's law of independent migration of ions. Kohlrausch 离子独立移动定律 */
  kohlrauschLaw(lambdaPlus: number, lambdaMinus: number, concentration: number): number {
    const molarConductivity = lambdaPlus + lambdaMinus;
    return this.conductivity(molarConductivity, concentration);
  }

  /** Molar conductivity at infinite dilution. 无限稀释摩尔电导率 */
  molarConductivityAtInfiniteDilution(ionConductivities: number[]): number {
    return ionConductivities.reduce((s, l) => s + l, 0);
  }

  /** Debye-Hückel-Onsager equation: Λm = Λ°m - K√c. Debye-Hückel-Onsager 方程 */
  debyeHuckelOnsager(lambdaInfinite: number, K: number, concentration: number): number {
    return lambdaInfinite - K * Math.sqrt(concentration);
  }

  /** Faraday constant value. 法拉第常数值 */
  faradayConstant(): number {
    return FARADAY;
  }

  /** Standard gas constant value. 标准气体常数值 */
  gasConstant(): number {
    return R_GAS;
  }

  /** Number of electrons from mass and charge. 由质量和电荷计算电子数 */
  electronsFromCharge(mass: number, molarMass: number, charge: number): number {
    if (mass === 0 || molarMass === 0) return 0;
    const moles = mass / molarMass;
    if (moles === 0) return 0;
    return charge / (moles * FARADAY);
  }

  /** Mass deposited given total charge and element. 由总电荷量和元素计算沉积质量 */
  massFromCharge(charge: number, molarMass: number, valence: number): number {
    const moles = charge / (FARADAY * valence);
    return moles * molarMass;
  }

  /** Volume of gas produced in electrolysis. 电解产生气体体积 */
  gasVolumeFromElectrolysis(current: number, time: number, valence: number, T: number = TEMP_REF, P: number = 1): number {
    const moles = (current * time) / (FARADAY * valence);
    // V = nRT/P
    const R_LATM = 0.08206;
    const volume = (moles * R_LATM * T) / P;
    this._history.push({ method: 'gasVolumeFromElectrolysis', volume });
    return volume;
  }

  /** Electrochemical series reactivity. 电化学序反应性 */
  electrochemicalSeries(metal: string): { reactivity: string; position: number } {
    const series: Record<string, { reactivity: string; position: number }> = {
      'K': { reactivity: 'very high', position: 1 },
      'Na': { reactivity: 'very high', position: 2 },
      'Ca': { reactivity: 'high', position: 3 },
      'Mg': { reactivity: 'high', position: 4 },
      'Al': { reactivity: 'high', position: 5 },
      'Zn': { reactivity: 'moderate', position: 6 },
      'Fe': { reactivity: 'moderate', position: 7 },
      'Ni': { reactivity: 'low', position: 8 },
      'Sn': { reactivity: 'low', position: 9 },
      'Pb': { reactivity: 'low', position: 10 },
      'H': { reactivity: 'reference', position: 11 },
      'Cu': { reactivity: 'low', position: 12 },
      'Ag': { reactivity: 'very low', position: 13 },
      'Au': { reactivity: 'very low', position: 14 },
      'Pt': { reactivity: 'very low', position: 15 },
    };
    const data = series[metal] ?? { reactivity: 'unknown', position: -1 };
    this._history.push({ method: 'electrochemicalSeries', metal });
    return data;
  }

  /** Standard potential of common redox couples. 常见氧化还原电对的标准电位 */
  standardPotential(reaction: string): number {
    return STANDARD_POTENTIALS[reaction] ?? 0;
  }

  /** Return a copy of the standard reduction potential table. 标准还原电位表副本 */
  standardReductionPotentials(): Record<string, number> {
    this._history.push({ method: 'standardReductionPotentials' });
    return { ...STANDARD_POTENTIALS };
  }

  /** Spontaneity of redox reaction. 氧化还原反应自发性 */
  redoxSpontaneous(anode: string, cathode: string): { spontaneous: boolean; voltage: number } {
    const v = this.cellVoltage(anode, cathode);
    this._history.push({ method: 'redoxSpontaneous', v });
    return { spontaneous: v > 0, voltage: v };
  }

  /** Decomposition voltage in electrolysis. 电解分解电压 */
  decompositionVoltage(reactionPotential: number, overpotential: number = 0): number {
    return Math.abs(reactionPotential) + overpotential;
  }

  /** Overpotential estimation. 过电位估算 */
  overpotential(current: number, exchangeCurrent: number, T: number = TEMP_REF): number {
    if (exchangeCurrent <= 0) return 0;
    // simplified Tafel
    const eta = (2 * R_GAS * T / FARADAY) * Math.log(current / exchangeCurrent);
    this._history.push({ method: 'overpotential', eta });
    return eta;
  }

  /** Gibbs-Helmholtz equation for electrochemical cells. 电化学电池的 Gibbs-Helmholtz 方程 */
  gibbsHelmholtzElectrochemical(dG: number, dH: number, T: number): number {
    // ΔG = ΔH - TΔS, ΔS = -(dG/dT)
    // dE/dT = ΔS / (nF)
    const dS = (dH - dG) / T;
    this._history.push({ method: 'gibbsHelmholtzElectrochemical', dS });
    return dS;
  }

  /** Temperature coefficient of cell voltage. 电池电压温度系数 */
  temperatureCoefficient(dS: number, n: number): number {
    // dE/dT = ΔS / (nF)
    return dS / (n * FARADAY);
  }

  /** Conductivity cell constant. 电导池常数 */
  conductivityCellConstant(resistance: number, conductivity: number): number {
    if (conductivity === 0) return 0;
    // K = R * κ
    return resistance * conductivity;
  }

  /** Specific conductivity from resistance and cell constant. 由电阻和电池常数计算电导率 */
  specificConductance(resistance: number, cellConstant: number): number {
    if (resistance === 0) return 0;
    return cellConstant / resistance;
  }

  /** Faraday's law of electrolysis: moles = Q/(nF). 法拉第电解定律：摩尔数 */
  molesFromCharge(charge: number, n: number): number {
    if (n === 0) return 0;
    return charge / (n * FARADAY);
  }

  /** Charge from moles and electrons. 由摩尔数和电子数计算电荷量 */
  chargeFromMoles(moles: number, n: number): number {
    return moles * n * FARADAY;
  }

  /** Calculate charge from current and time. 由电流和时间计算电荷量 */
  chargeFromCurrentTime(current: number, time: number): number {
    return current * time;
  }

  /** Electrochemical equivalent (mass per coulomb). 电化学当量（每库仑质量） */
  electrochemicalEquivalent(molarMass: number, valence: number): number {
    if (valence === 0) return 0;
    return molarMass / (valence * FARADAY);
  }

  /** Nernst equation for full cell with concentrations. 含浓度的完整电池能斯特方程 */
  nernstCellVoltage(
    E0: number, n: number,
    anodeConc: number[], cathodeConc: number[], anodeStoich: number[] = [], cathodeStoich: number[] = [],
  ): number {
    // E = E0 - (RT/nF) ln Q, Q = [products]/[reactants]
    let Q = 1;
    for (const c of cathodeConc) Q *= c;
    for (const c of anodeConc) Q /= c;
    const E = E0 - (R_GAS * TEMP_REF / (n * FARADAY)) * Math.log(Q);
    this._history.push({ method: 'nernstCellVoltage', E });
    return E;
  }

  /** Conductometric titration endpoint detection. 电导滴定终点检测 */
  conductometricTitration(
    volumes: number[], conductivities: number[],
  ): { endpointVolume: number; description: string } {
    // Find intersection of two linear regions
    if (volumes.length < 4) return { endpointVolume: 0, description: 'insufficient data' };
    let maxChange = 0;
    let endpointVolume = 0;
    for (let i = 1; i < volumes.length - 1; i++) {
      const change = Math.abs(conductivities[i + 1] - 2 * conductivities[i] + conductivities[i - 1]);
      if (change > maxChange) {
        maxChange = change;
        endpointVolume = volumes[i];
      }
    }
    this._history.push({ method: 'conductometricTitration' });
    return { endpointVolume, description: 'intersection of linear regions' };
  }

  /** Potentiometric titration endpoint. 电位滴定终点 */
  potentiometricTitration(
    volumes: number[], potentials: number[],
  ): { endpointVolume: number; endpointPotential: number } {
    if (volumes.length < 3) return { endpointVolume: 0, endpointPotential: 0 };
    // Find max slope (first derivative)
    let maxSlope = 0;
    let endpointVolume = 0;
    let endpointPotential = 0;
    for (let i = 1; i < volumes.length - 1; i++) {
      const slope = (potentials[i + 1] - potentials[i - 1]) / (volumes[i + 1] - volumes[i - 1]);
      if (Math.abs(slope) > maxSlope) {
        maxSlope = Math.abs(slope);
        endpointVolume = volumes[i];
        endpointPotential = potentials[i];
      }
    }
    this._history.push({ method: 'potentiometricTitration' });
    return { endpointVolume, endpointPotential };
  }

  /** Ionic mobility of an ion. 离子迁移率 */
  ionicMobility(ionicConductivity: number, charge: number): number {
    // u = λ / (F * |z|)
    if (charge === 0) return 0;
    return ionicConductivity / (FARADAY * Math.abs(charge));
  }

  /** Transport number of an ion. 离子迁移数 */
  transportNumber(ionConductivity: number, totalConductivity: number): number {
    if (totalConductivity === 0) return 0;
    return ionConductivity / totalConductivity;
  }

  /** Hittorf's method for transport numbers. Hittorf 法测定迁移数 */
  hittorfMethod(initialMoles: number, finalMoles: number, totalMolesReacted: number): number {
    if (totalMolesReacted === 0) return 0;
    return (initialMoles - finalMoles) / totalMolesReacted;
  }

  /** Moving boundary method transport number. 界面移动法测迁移数 */
  movingBoundaryMethod(volumeMoved: number, concentration: number, totalCharge: number): number {
    if (totalCharge === 0) return 0;
    const molesMoved = volumeMoved * concentration;
    return (molesMoved * FARADAY) / totalCharge;
  }

  /** Cell resistance from voltage and current. 由电压和电流计算电池电阻 */
  cellResistance(voltage: number, current: number): number {
    if (current === 0) return Infinity;
    return voltage / current;
  }

  /** Internal resistance effect on cell voltage. 内阻对电池电压的影响 */
  internalResistanceEffect(emf: number, internalR: number, current: number): number {
    return emf - current * internalR;
  }

  /** Power delivered by a cell. 电池输出功率 */
  cellPower(emf: number, internalR: number, externalR: number): number {
    if (internalR + externalR === 0) return 0;
    const current = emf / (internalR + externalR);
    return current * current * externalR;
  }

  /** Maximum power transfer condition. 最大功率传输条件 */
  maxPowerTransfer(emf: number, internalR: number): { power: number; externalR: number } {
    // Maximum power when external R = internal R
    const externalR = internalR;
    const power = (emf * emf) / (4 * internalR);
    return { power, externalR };
  }

  /** Energy efficiency of a cell. 电池能量效率 */
  cellEnergyEfficiency(actualVoltage: number, reversibleVoltage: number): number {
    if (reversibleVoltage === 0) return 0;
    return (actualVoltage / reversibleVoltage) * 100;
  }

  /** Voltage efficiency. 电压效率 */
  voltageEfficiency(operatingVoltage: number, theoreticalVoltage: number): number {
    if (theoreticalVoltage === 0) return 0;
    return (operatingVoltage / theoreticalVoltage) * 100;
  }

  /** Coulombic efficiency. 库仑效率 */
  coulombicEfficiency(dischargeCapacity: number, chargeCapacity: number): number {
    if (chargeCapacity === 0) return 0;
    return (dischargeCapacity / chargeCapacity) * 100;
  }

  /** Overall energy efficiency of electrochemical system. 电化学系统总能量效率 */
  overallEfficiency(voltageEff: number, coulombicEff: number): number {
    return (voltageEff * coulombicEff) / 100;
  }

  /** Calculate theoretical voltage of Daniell cell. 丹聂尔电池理论电压 */
  daniellCellVoltage(zincConc: number = 1, copperConc: number = 1): number {
    // Zn + Cu²⁺ → Zn²⁺ + Cu
    // E° = E°(Cu²⁺/Cu) - E°(Zn²⁺/Zn) = 0.34 - (-0.76) = 1.10 V
    const E0 = 0.34 - (-0.76);
    const E = E0 - (R_GAS * TEMP_REF / (2 * FARADAY)) * Math.log(zincConc / copperConc);
    this._history.push({ method: 'daniellCellVoltage', E });
    return E;
  }

  /** Lead-acid battery cell reaction analysis. 铅酸电池反应分析 */
  leadAcidCell(sgAcid: number = 1.28): { voltage: number; sgAcid: number; soc: number } {
    // E = 2.04 + 0.0592 * log([H2SO4])
    // Specific gravity to molarity: 1.28 sg ≈ 5.0 M
    const molarity = (sgAcid - 1) * 17.5;
    const voltage = 2.04 + 0.0592 * Math.log10(molarity);
    const soc = ((sgAcid - 1.12) / (1.28 - 1.12)) * 100;
    this._history.push({ method: 'leadAcidCell' });
    return { voltage, sgAcid, soc: Math.max(0, Math.min(100, soc)) };
  }

  /** Dry cell (Leclanché) voltage. 干电池（勒克朗谢）电压 */
  dryCellVoltage(): number {
    return 1.5;
  }

  /** Alkaline battery voltage. 碱性电池电压 */
  alkalineBatteryVoltage(): number {
    return 1.5;
  }

  /** Mercury battery voltage. 汞电池电压 */
  mercuryBatteryVoltage(): number {
    return 1.35;
  }

  /** Lithium battery voltage. 锂电池电压 */
  lithiumBatteryVoltage(): number {
    return 3.0;
  }

  /** Silver oxide battery voltage. 氧化银电池电压 */
  silverOxideBatteryVoltage(): number {
    return 1.55;
  }

  /** Zinc-air battery voltage. 锌空电池电压 */
  zincAirBatteryVoltage(): number {
    return 1.4;
  }

  /** Cathodic protection (sacrificial anode). 阴极保护（牺牲阳极） */
  cathodicProtectionSacrificial(structureMetal: string, anodeMetal: string): { protected: boolean; voltage: string } {
    const eStruct = STANDARD_POTENTIALS[`${structureMetal}2+/${structureMetal}`] ?? 0;
    const eAnode = STANDARD_POTENTIALS[`${anodeMetal}2+/${anodeMetal}`] ?? 0;
    const protected_ = eAnode < eStruct;
    this._history.push({ method: 'cathodicProtectionSacrificial' });
    return { protected: protected_, voltage: `${eStruct - eAnode} V` };
  }

  /** Impressed current cathodic protection. 外加电流阴极保护 */
  impressedCurrentCathodicProtection(requiredVoltage: number): { appliedVoltage: number; description: string } {
    this._history.push({ method: 'impressedCurrentCathodicProtection' });
    return {
      appliedVoltage: requiredVoltage * -1,
      description: `Apply ${requiredVoltage} V negative to make structure cathode`,
    };
  }

  /** Polarization resistance. 极化电阻 */
  polarizationResistance(tafelSlopeA: number, tafelSlopeC: number, corrosionCurrent: number): number {
    // Rp = (βa * βc) / (2.303 * (βa + βc) * i_corr)
    if (corrosionCurrent === 0) return Infinity;
    const denom = 2.303 * (tafelSlopeA + tafelSlopeC) * corrosionCurrent;
    if (denom === 0) return Infinity;
    return (tafelSlopeA * tafelSlopeC) / denom;
  }

  /** Stern-Geary equation for corrosion current. Stern-Geary 方程计算腐蚀电流 */
  sternGearyEquation(polarizationR: number, betaA: number, betaC: number): number {
    // i_corr = B / Rp, B = βa*βc / (2.303(βa+βc))
    if (polarizationR === 0) return 0;
    const B = (betaA * betaC) / (2.303 * (betaA + betaC));
    return B / polarizationR;
  }

  /** Pourbaix diagram pH-Eh regions. Pourbaix 图 pH-Eh 区域 */
  pourbaixRegion(pH: number, Eh: number): { region: string; stable: string } {
    let region: string;
    let stable: string;
    if (Eh > 0.8 && pH < 7) {
      region = 'corrosion (acidic oxidizing)';
      stable = 'Fe²⁺/Fe³⁺';
    } else if (Eh > 0.5 && pH > 7) {
      region = 'passivation';
      stable = 'Fe2O3/Fe3O4';
    } else if (Eh < -0.6) {
      region = 'immunity';
      stable = 'Fe (metal)';
    } else if (pH > 10) {
      region = 'passivation (alkaline)';
      stable = 'Fe2O3';
    } else {
      region = 'corrosion (acidic reducing)';
      stable = 'Fe²⁺';
    }
    this._history.push({ method: 'pourbaixRegion' });
    return { region, stable };
  }

  /** Faradaic current from scan rate and CV parameters. 由扫描速率和 CV 参数计算法拉第电流 */
  cyclicVoltammetryPeakCurrent(area: number, concentration: number, n: number, diffusionCoeff: number, scanRate: number): number {
    // Randles-Sevcik: ip = 0.4463 * nFAC * sqrt(nFνD/RT)
    const RT = R_GAS * TEMP_REF;
    const sqrtTerm = Math.sqrt((n * FARADAY * scanRate * diffusionCoeff) / RT);
    const ip = 0.4463 * n * FARADAY * area * concentration * sqrtTerm;
    this._history.push({ method: 'cyclicVoltammetryPeakCurrent', ip });
    return ip;
  }

  /** Reversible CV peak potential. 可逆 CV 峰电位 */
  cvPeakPotentialReversible(formalPotential: number, n: number): { anodicPeak: number; cathodicPeak: number; separation: number } {
    // ΔEp = 59/n mV at 25°C
    const separation = 0.059 / n;
    const anodicPeak = formalPotential + separation / 2;
    const cathodicPeak = formalPotential - separation / 2;
    this._history.push({ method: 'cvPeakPotentialReversible' });
    return { anodicPeak, cathodicPeak, separation };
  }

  /** Nicholson method for kinetic analysis (CV). Nicholson 法（CV 动力学分析） */
  nicholsonMethod(peakSeparation: number): number {
    // ΔEp → kinetic parameter ψ
    // Simplified table lookup
    const dEp = peakSeparation * 1000; // convert to mV
    if (dEp < 61) return 1.0;
    if (dEp < 65) return 0.5;
    if (dEp < 70) return 0.3;
    if (dEp < 80) return 0.1;
    if (dEp < 100) return 0.05;
    return 0.01;
  }

  /** Private history recorder (capped at 200 entries). 私有历史记录方法 */
  private _recordHistory(entry: unknown): void {
    this._history.push(entry);
    if (this._history.length > 200) {
      this._history.shift();
    }
  }

  toPacket(): DataPacket<{
    cells: ElectrochemicalCell[];
    reactions: HalfReaction[];
    batteries: Battery[];
    fuelCells: FuelCell[];
    analyses: Array<{ type: string; result: unknown }>;
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['chemistry', 'Electrochemistry'],
      priority: 1,
      phase: 'chemistry:electrochemistry',
    };
    return {
      id: `ec-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        cells: this._cells,
        reactions: this._reactions,
        batteries: this._batteries,
        fuelCells: this._fuelCells,
        analyses: this._analyses,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._cells = [];
    this._reactions = [];
    this._batteries = [];
    this._fuelCells = [];
    this._analyses = [];
    this._history = [];
    this._counter = 0;
  }

  get cellCount(): number {
    return this._cells.length;
  }

  get reactionCount(): number {
    return this._reactions.length;
  }

  get batteryCount(): number {
    return this._batteries.length;
  }

  get fuelCellCount(): number {
    return this._fuelCells.length;
  }

  get analysisCount(): number {
    return this._analyses.length;
  }

  get historyDepth(): number {
    return this._history.length;
  }
}
