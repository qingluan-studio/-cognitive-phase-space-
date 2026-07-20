import { DataPacket, PacketMeta } from '../shared/types';

/** Acid-base system descriptor. 酸碱系统描述 */
export interface AcidBaseSystem {
  type: 'acid' | 'base' | 'neutral';
  strength: 'strong' | 'weak' | 'neutral';
  pH: number;
  pOH: number;
}

/** Buffer system descriptor. 缓冲系统描述 */
export interface Buffer {
  acid: string;
  salt: string;
  pH: number;
  capacity: number;
}

/** Titration curve descriptor. 滴定曲线描述 */
export interface Titration {
  curve: Array<{ volume: number; pH: number }>;
  endpoint: { volume: number; pH: number };
  indicator: string;
}

/** Acid dissociation data. 酸解离数据 */
export interface AcidDissociation {
  name: string;
  formula: string;
  Ka: number;
  pKa: number;
  strength: 'strong' | 'weak' | 'very-weak';
  polyprotic: boolean;
  steps: Array<{ Ka: number; pKa: number }>;
}

/** Salt hydrolysis result. 盐水解结果 */
export interface SaltHydrolysis {
  salt: string;
  type: 'acidic' | 'basic' | 'neutral';
  pH: number;
  hydrolysisConstant: number;
  description: string;
}

/** Buffer capacity detailed. 缓冲容量详细 */
export interface BufferCapacityAnalysis {
  pH: number;
  capacity: number;
  maxCapacity: number;
  optimalRatio: number;
  range: [number, number];
  effectiveness: 'excellent' | 'good' | 'fair' | 'poor';
}

/** Titration curve point. 滴定曲线点 */
export interface TitrationPoint {
  volume: number;
  pH: number;
  region: 'initial' | 'buffer' | 'half-equivalence' | 'equivalence' | 'post-equivalence' | 'excess';
}

/** Indicator descriptor. 指示剂描述 */
export interface Indicator {
  name: string;
  pHRange: [number, number];
  colorAcid: string;
  colorBase: string;
  pKa: number;
  suitable: boolean;
}

/** Common ion effect result. 同离子效应结果 */
export interface CommonIonEffect {
  originalPH: number;
  newPH: number;
  shift: number;
  description: string;
}

const KW_25C = 1.0e-14;
const R_GAS = 8.314;
const KELVIN_OFFSET = 273.15;

/** Common acid dissociation constants at 25°C. 常见酸解离常数（25°C） */
const ACID_DISSOCIATION_CONSTANTS: Record<string, Array<{ Ka: number; pKa: number }>> = {
  'HCl': [{ Ka: 1e7, pKa: -7 }],
  'HBr': [{ Ka: 1e9, pKa: -9 }],
  'HI': [{ Ka: 1e10, pKa: -10 }],
  'HClO4': [{ Ka: 1e10, pKa: -10 }],
  'HNO3': [{ Ka: 24, pKa: -1.4 }],
  'H2SO4': [{ Ka: 1e3, pKa: -3 }, { Ka: 0.012, pKa: 1.92 }],
  'H3PO4': [{ Ka: 0.0075, pKa: 2.12 }, { Ka: 6.2e-8, pKa: 7.21 }, { Ka: 4.8e-13, pKa: 12.32 }],
  'H2CO3': [{ Ka: 4.3e-7, pKa: 6.37 }, { Ka: 5.6e-11, pKa: 9.25 }],
  'H2SO3': [{ Ka: 0.015, pKa: 1.82 }, { Ka: 6.2e-8, pKa: 7.21 }],
  'HNO2': [{ Ka: 4.5e-4, pKa: 3.35 }],
  'HF': [{ Ka: 6.6e-4, pKa: 3.18 }],
  'HCOOH': [{ Ka: 1.8e-4, pKa: 3.74 }],
  'CH3COOH': [{ Ka: 1.8e-5, pKa: 4.74 }],
  'HCN': [{ Ka: 6.2e-10, pKa: 9.21 }],
  'H3BO3': [{ Ka: 5.8e-10, pKa: 9.24 }],
  'H2C2O4': [{ Ka: 5.9e-2, pKa: 1.23 }, { Ka: 6.4e-5, pKa: 4.19 }],
  'H2S': [{ Ka: 1e-7, pKa: 7.0 }, { Ka: 1e-19, pKa: 19 }],
  'C6H5COOH': [{ Ka: 6.3e-5, pKa: 4.2 }],
  'C6H5OH': [{ Ka: 1e-10, pKa: 10 }],
  'NH4+': [{ Ka: 5.6e-10, pKa: 9.25 }],
};

/** Common base dissociation constants at 25°C. 常见碱解离常数 */
const BASE_DISSOCIATION_CONSTANTS: Record<string, Array<{ Kb: number; pKb: number }>> = {
  'NaOH': [{ Kb: 1, pKb: 0 }],
  'KOH': [{ Kb: 1, pKb: 0 }],
  'Ba(OH)2': [{ Kb: 1, pKb: 0 }],
  'Ca(OH)2': [{ Kb: 0.025, pKb: 1.6 }],
  'NH3': [{ Kb: 1.8e-5, pKb: 4.74 }],
  'CH3NH2': [{ Kb: 4.4e-4, pKb: 3.36 }],
  'C2H5NH2': [{ Kb: 5.6e-4, pKb: 3.25 }],
  'C5H5N': [{ Kb: 1.7e-9, pKb: 8.77 }],
  'C6H5NH2': [{ Kb: 4.3e-10, pKb: 9.37 }],
  'N2H4': [{ Kb: 1.3e-6, pKb: 5.89 }],
};

/** Indicator database. 指示剂数据库 */
const INDICATORS: Array<{ name: string; range: [number, number]; acid: string; base: string; pKa: number }> = [
  { name: 'methyl violet', range: [0.0, 1.6], acid: 'yellow', base: 'blue', pKa: 0.8 },
  { name: 'crystal violet', range: [0.0, 1.8], acid: 'yellow', base: 'blue', pKa: 0.9 },
  { name: 'thymol blue', range: [1.2, 2.8], acid: 'red', base: 'yellow', pKa: 2.0 },
  { name: 'orange IV', range: [1.4, 2.8], acid: 'red', base: 'yellow', pKa: 2.1 },
  { name: 'methyl orange', range: [3.1, 4.4], acid: 'red', base: 'yellow', pKa: 3.7 },
  { name: 'bromophenol blue', range: [3.0, 4.6], acid: 'yellow', base: 'blue', pKa: 3.85 },
  { name: 'bromocresol green', range: [3.8, 5.4], acid: 'yellow', base: 'blue', pKa: 4.66 },
  { name: 'methyl red', range: [4.4, 6.2], acid: 'red', base: 'yellow', pKa: 5.1 },
  { name: 'chlorophenol red', range: [5.0, 6.6], acid: 'yellow', base: 'red', pKa: 6.0 },
  { name: 'bromocresol purple', range: [5.2, 6.8], acid: 'yellow', base: 'purple', pKa: 6.3 },
  { name: 'bromothymol blue', range: [6.0, 7.6], acid: 'yellow', base: 'blue', pKa: 7.1 },
  { name: 'phenol red', range: [6.4, 8.2], acid: 'yellow', base: 'red', pKa: 7.4 },
  { name: 'cresol red', range: [7.0, 8.8], acid: 'yellow', base: 'red', pKa: 8.2 },
  { name: 'thymol blue (basic)', range: [8.0, 9.6], acid: 'yellow', base: 'blue', pKa: 8.9 },
  { name: 'phenolphthalein', range: [8.0, 10.0], acid: 'colorless', base: 'pink', pKa: 9.3 },
  { name: 'thymolphthalein', range: [9.3, 10.5], acid: 'colorless', base: 'blue', pKa: 9.9 },
  { name: 'alizarin yellow R', range: [10.1, 12.0], acid: 'yellow', base: 'red', pKa: 11.0 },
  { name: 'nitramine', range: [10.8, 13.0], acid: 'colorless', base: 'orange', pKa: 11.9 },
];

/** Acid-base chemistry: pH, buffers, titrations. 酸碱化学：pH、缓冲、滴定 */
export class AcidBase {
  private _systems: AcidBaseSystem[] = [];
  private _buffers: Buffer[] = [];
  private _titrations: Titration[] = [];
  private _analyses: Array<{ type: string; result: unknown }> = [];
  private _history: unknown[] = [];
  private _counter = 0;

  /** pH from H+ concentration. 由 H+ 浓度计算 pH */
  pH(concentration: number): number {
    if (concentration <= 0) return 7;
    const pH = -Math.log10(concentration);
    this._history.push({ method: 'pH', concentration, pH });
    return Math.max(0, Math.min(14, pH));
  }

  /** pOH from OH- concentration. 由 OH- 浓度计算 pOH */
  pOH(concentration: number): number {
    if (concentration <= 0) return 7;
    const pOH = -Math.log10(concentration);
    this._history.push({ method: 'pOH', concentration, pOH });
    return Math.max(0, Math.min(14, pOH));
  }

  /** Convert pH to [H+]. pH 转 [H+] */
  pHToH(pH: number): number {
    return Math.pow(10, -pH);
  }

  /** Convert pOH to [OH-]. pOH 转 [OH-] */
  pOHToOH(pOH: number): number {
    return Math.pow(10, -pOH);
  }

  /** Convert pH to pOH (at 25°C). pH 转 pOH（25°C） */
  pHToPOH(pH: number): number {
    return Math.max(0, Math.min(14, 14 - pH));
  }

  /** Convert pOH to pH. pOH 转 pH */
  pOHTopH(pOH: number): number {
    return Math.max(0, Math.min(14, 14 - pOH));
  }

  /** Temperature-dependent ion product of water. 温度依赖的水的离子积 */
  kw(T: number): number {
    const kw = KW_25C * Math.exp(-(1 / T - 1 / 298.15) * 5000);
    this._history.push({ method: 'kw', T });
    return kw;
  }

  /** pKw at temperature T. 温度 T 下的 pKw */
  pKw(T: number): number {
    const kw = this.kw(T);
    return -Math.log10(kw);
  }

  /** Neutral pH at temperature T. 温度 T 下的中性 pH */
  neutralPH(T: number): number {
    const pKw = this.pKw(T);
    return pKw / 2;
  }

  /** Strong acid pH. 强酸 pH */
  strongAcid(concentration: number): AcidBaseSystem {
    const pH = this.pH(concentration);
    const result: AcidBaseSystem = { type: 'acid', strength: 'strong', pH, pOH: 14 - pH };
    this._systems.push(result);
    this._history.push({ method: 'strongAcid' });
    return result;
  }

  /** Strong acid with multiple protons. 多质子强酸 pH */
  strongAcidPolyprotic(concentration: number, nProtons: number): AcidBaseSystem {
    const hConc = concentration * nProtons;
    const pH = this.pH(hConc);
    const result: AcidBaseSystem = { type: 'acid', strength: 'strong', pH, pOH: 14 - pH };
    this._systems.push(result);
    this._history.push({ method: 'strongAcidPolyprotic', nProtons });
    return result;
  }

  /** Weak acid pH given Ka and concentration. 弱酸 pH */
  weakAcid(Ka: number, concentration: number): AcidBaseSystem {
    if (Ka <= 0 || concentration <= 0) {
      const r: AcidBaseSystem = { type: 'acid', strength: 'weak', pH: 7, pOH: 7 };
      this._systems.push(r);
      return r;
    }
    const h = (-Ka + Math.sqrt(Ka * Ka + 4 * Ka * concentration)) / 2;
    const pH = this.pH(h);
    const result: AcidBaseSystem = { type: 'acid', strength: 'weak', pH, pOH: 14 - pH };
    this._systems.push(result);
    this._history.push({ method: 'weakAcid', Ka });
    return result;
  }

  /** Weak acid with approximation [H+] = sqrt(Ka * C). 弱酸近似公式 */
  weakAcidApprox(Ka: number, concentration: number): AcidBaseSystem {
    if (Ka <= 0 || concentration <= 0) {
      const r: AcidBaseSystem = { type: 'acid', strength: 'weak', pH: 7, pOH: 7 };
      this._systems.push(r);
      return r;
    }
    const h = Math.sqrt(Ka * concentration);
    const pH = this.pH(h);
    const result: AcidBaseSystem = { type: 'acid', strength: 'weak', pH, pOH: 14 - pH };
    this._systems.push(result);
    this._history.push({ method: 'weakAcidApprox', Ka });
    return result;
  }

  /** Percent dissociation of weak acid. 弱酸解离百分数 */
  percentDissociation(Ka: number, concentration: number): number {
    if (Ka <= 0 || concentration <= 0) return 0;
    const h = (-Ka + Math.sqrt(Ka * Ka + 4 * Ka * concentration)) / 2;
    const pct = (h / concentration) * 100;
    this._history.push({ method: 'percentDissociation', pct });
    return pct;
  }

  /** Strong base pH. 强碱 pH */
  strongBase(concentration: number): AcidBaseSystem {
    const pOH = this.pOH(concentration);
    const result: AcidBaseSystem = { type: 'base', strength: 'strong', pH: 14 - pOH, pOH };
    this._systems.push(result);
    this._history.push({ method: 'strongBase' });
    return result;
  }

  /** Strong base with multiple OH groups. 多 OH 强碱 pH */
  strongBasePolyacidic(concentration: number, nOH: number): AcidBaseSystem {
    const ohConc = concentration * nOH;
    const pOH = this.pOH(ohConc);
    const result: AcidBaseSystem = { type: 'base', strength: 'strong', pH: 14 - pOH, pOH };
    this._systems.push(result);
    this._history.push({ method: 'strongBasePolyacidic', nOH });
    return result;
  }

  /** Weak base pH given Kb and concentration. 弱碱 pH */
  weakBase(Kb: number, concentration: number): AcidBaseSystem {
    if (Kb <= 0 || concentration <= 0) {
      const r: AcidBaseSystem = { type: 'base', strength: 'weak', pH: 7, pOH: 7 };
      this._systems.push(r);
      return r;
    }
    const oh = (-Kb + Math.sqrt(Kb * Kb + 4 * Kb * concentration)) / 2;
    const pOH = this.pOH(oh);
    const result: AcidBaseSystem = { type: 'base', strength: 'weak', pH: 14 - pOH, pOH };
    this._systems.push(result);
    this._history.push({ method: 'weakBase', Kb });
    return result;
  }

  /** Weak base approximation [OH-] = sqrt(Kb * C). 弱碱近似公式 */
  weakBaseApprox(Kb: number, concentration: number): AcidBaseSystem {
    if (Kb <= 0 || concentration <= 0) {
      const r: AcidBaseSystem = { type: 'base', strength: 'weak', pH: 7, pOH: 7 };
      this._systems.push(r);
      return r;
    }
    const oh = Math.sqrt(Kb * concentration);
    const pOH = this.pOH(oh);
    const result: AcidBaseSystem = { type: 'base', strength: 'weak', pH: 14 - pOH, pOH };
    this._systems.push(result);
    this._history.push({ method: 'weakBaseApprox', Kb });
    return result;
  }

  /** Buffer pH from Henderson-Hasselbalch using Ka. 由 Ka 计算 pH */
  bufferpH(Ka: number, acid: number, salt: number): number {
    if (Ka <= 0 || acid <= 0) return 7;
    const pKa = -Math.log10(Ka);
    const pH = pKa + Math.log10(salt / acid);
    const buffer: Buffer = {
      acid: 'HA',
      salt: 'A-',
      pH: Math.max(0, Math.min(14, pH)),
      capacity: Math.min(acid, salt) * 0.1,
    };
    this._buffers.push(buffer);
    this._history.push({ method: 'bufferpH' });
    return buffer.pH;
  }

  /** Henderson-Hasselbalch equation. Henderson-Hasselbalch 方程 */
  hendersonHasselbalch(pKa: number, acid: number, base: number): number {
    if (acid <= 0) return pKa;
    const pH = pKa + Math.log10(base / acid);
    this._history.push({ method: 'hendersonHasselbalch' });
    return Math.max(0, Math.min(14, pH));
  }

  /** Buffer preparation: ratio of acid to salt for target pH. 缓冲液配制：目标 pH 下酸盐比 */
  bufferPreparation(targetPH: number, pKa: number): { acidToBase: number; baseToAcid: number } {
    const ratio = Math.pow(10, pKa - targetPH);
    this._history.push({ method: 'bufferPreparation', ratio });
    return { acidToBase: ratio, baseToAcid: 1 / ratio };
  }

  /** Buffer capacity (van Slyke equation). 缓冲容量（van Slyke 方程） */
  bufferCapacity(acidConc: number, saltConc: number, Ka: number): number {
    const pKa = -Math.log10(Ka);
    const pH = pKa + Math.log10(saltConc / acidConc);
    const H = Math.pow(10, -pH);
    const C = acidConc + saltConc;
    const capacity = 2.303 * C * Ka * H / Math.pow(Ka + H, 2);
    this._history.push({ method: 'bufferCapacity', pH, capacity });
    return capacity;
  }

  /** Detailed buffer capacity analysis. 详细缓冲容量分析 */
  bufferCapacityAnalysis(acidConc: number, saltConc: number, Ka: number): BufferCapacityAnalysis {
    const pKa = -Math.log10(Ka);
    const pH = pKa + Math.log10(saltConc / acidConc);
    const H = Math.pow(10, -pH);
    const C = acidConc + saltConc;
    const capacity = 2.303 * C * Ka * H / Math.pow(Ka + H, 2);
    const maxCapacity = 0.576 * C; // max at pH = pKa
    const optimalRatio = 1;
    let effectiveness: 'excellent' | 'good' | 'fair' | 'poor';
    const ratio = saltConc / acidConc;
    if (ratio > 0.1 && ratio < 10) effectiveness = 'excellent';
    else if (ratio > 0.05 && ratio < 20) effectiveness = 'good';
    else if (ratio > 0.01 && ratio < 100) effectiveness = 'fair';
    else effectiveness = 'poor';
    const result: BufferCapacityAnalysis = {
      pH,
      capacity,
      maxCapacity,
      optimalRatio,
      range: [pKa - 1, pKa + 1],
      effectiveness,
    };
    this._analyses.push({ type: 'bufferCapacityAnalysis', result });
    this._history.push({ method: 'bufferCapacityAnalysis' });
    return result;
  }

  /** Effect of adding acid or base to buffer. 向缓冲液加酸或碱的影响 */
  bufferEffect(
    acidConc: number, saltConc: number, Ka: number,
    addedMoles: number, isAcid: boolean, volume: number = 1,
  ): { newPH: number; deltaPH: number } {
    const pKa = -Math.log10(Ka);
    const originalPH = pKa + Math.log10(saltConc / acidConc);
    let newAcid = acidConc;
    let newSalt = saltConc;
    const add = addedMoles / volume;
    if (isAcid) {
      newAcid += add;
      newSalt -= add;
    } else {
      newAcid -= add;
      newSalt += add;
    }
    if (newAcid <= 0 || newSalt <= 0) return { newPH: originalPH, deltaPH: 0 };
    const newPH = pKa + Math.log10(newSalt / newAcid);
    const deltaPH = newPH - originalPH;
    this._history.push({ method: 'bufferEffect', newPH, deltaPH });
    return { newPH, deltaPH };
  }

  /** Generate a titration curve given acid and base info. 生成滴定曲线 */
  titration(acid: { M: number; V: number }, base: { M: number; V: number }, volumes: number[]): Titration {
    const curve: Array<{ volume: number; pH: number }> = [];
    for (const v of volumes) {
      const molesAcid = acid.M * acid.V;
      const molesBase = base.M * v;
      const net = molesAcid - molesBase;
      const totalV = acid.V + v;
      let pH: number;
      if (net > 0) pH = -Math.log10(net / totalV);
      else if (net < 0) pH = 14 + Math.log10(-net / totalV);
      else pH = 7;
      curve.push({ volume: v, pH: Math.max(0, Math.min(14, pH)) });
    }
    const equivVol = (acid.M * acid.V) / base.M;
    const endpoint = { volume: equivVol, pH: 7 };
    const titration: Titration = { curve, endpoint, indicator: this.indicator(7) };
    this._titrations.push(titration);
    this._history.push({ method: 'titration' });
    return titration;
  }

  /** Detailed titration curve with regions. 详细滴定曲线 */
  titrationDetailed(
    acid: { M: number; V: number; Ka?: number },
    base: { M: number; V: number },
    nPoints: number = 50,
  ): { points: TitrationPoint[]; endpoint: { volume: number; pH: number } } {
    const equivVol = (acid.M * acid.V) / base.M;
    const points: TitrationPoint[] = [];
    const maxV = equivVol * 2;
    for (let i = 0; i <= nPoints; i++) {
      const v = (maxV * i) / nPoints;
      const molesAcid = acid.M * acid.V;
      const molesBase = base.M * v;
      const net = molesAcid - molesBase;
      const totalV = acid.V + v;
      let pH: number;
      let region: TitrationPoint['region'];
      if (v === 0) {
        // Initial
        if (acid.Ka) {
          const h = Math.sqrt(acid.Ka * acid.M);
          pH = -Math.log10(h);
        } else {
          pH = -Math.log10(acid.M);
        }
        region = 'initial';
      } else if (v < equivVol * 0.99) {
        // Buffer region (if weak acid) or pre-equivalence
        if (acid.Ka && Math.abs(net) > 1e-10) {
          const pKa = -Math.log10(acid.Ka);
          pH = pKa + Math.log10(molesBase / net);
        } else if (net > 0) {
          pH = -Math.log10(net / totalV);
        } else {
          pH = 7;
        }
        if (Math.abs(v - equivVol / 2) < equivVol / nPoints) region = 'half-equivalence';
        else region = 'buffer';
      } else if (Math.abs(v - equivVol) < equivVol / nPoints) {
        // Equivalence
        if (acid.Ka) {
          // Salt hydrolysis of weak acid + strong base
          const conc = molesAcid / totalV;
          const Kb = KW_25C / acid.Ka;
          const oh = Math.sqrt(Kb * conc);
          pH = 14 + Math.log10(oh);
        } else {
          pH = 7;
        }
        region = 'equivalence';
      } else if (v < equivVol * 1.1) {
        region = 'post-equivalence';
        const excess = (molesBase - molesAcid) / totalV;
        pH = 14 + Math.log10(excess);
      } else {
        region = 'excess';
        const excess = (molesBase - molesAcid) / totalV;
        pH = 14 + Math.log10(excess);
      }
      points.push({ volume: v, pH: Math.max(0, Math.min(14, pH)), region });
    }
    const endpoint = { volume: equivVol, pH: 7 };
    this._history.push({ method: 'titrationDetailed' });
    return { points, endpoint };
  }

  /** Compute equivalence point volume for M1*V1 = M2*V2. 等当点体积 */
  equivalencePoint(M1: number, V1: number, M2: number): number {
    if (M2 <= 0) return 0;
    const v2 = (M1 * V1) / M2;
    this._history.push({ method: 'equivalencePoint', v2 });
    return v2;
  }

  /** Half-equivalence point where pH = pKa. 半等当点 */
  halfEquivalencePoint(pKa: number): number {
    this._history.push({ method: 'halfEquivalencePoint', pKa });
    return pKa;
  }

  /** Recommend an indicator for a target pH. 为目标 pH 推荐指示剂 */
  indicator(pH: number): string {
    let name: string;
    if (pH < 3.2) name = 'methyl orange';
    else if (pH < 6) name = 'bromothymol blue';
    else if (pH < 8.4) name = 'phenol red';
    else if (pH < 10) name = 'phenolphthalein';
    else name = 'alizarin yellow';
    this._history.push({ method: 'indicator', pH, name });
    return name;
  }

  /** Get detailed indicator info. 获取详细指示剂信息 */
  indicatorInfo(pH: number): Indicator {
    let best: { name: string; range: [number, number]; acid: string; base: string; pKa: number } | null = null;
    let bestDist = Infinity;
    for (const ind of INDICATORS) {
      const midpoint = (ind.range[0] + ind.range[1]) / 2;
      const dist = Math.abs(midpoint - pH);
      if (dist < bestDist) {
        bestDist = dist;
        best = ind;
      }
    }
    if (!best) {
      return {
        name: 'phenolphthalein',
        pHRange: [8.0, 10.0],
        colorAcid: 'colorless',
        colorBase: 'pink',
        pKa: 9.3,
        suitable: true,
      };
    }
    const suitable = pH >= best.range[0] && pH <= best.range[1];
    const result: Indicator = {
      name: best.name,
      pHRange: best.range,
      colorAcid: best.acid,
      colorBase: best.base,
      pKa: best.pKa,
      suitable,
    };
    this._history.push({ method: 'indicatorInfo', pH });
    return result;
  }

  /** List all available indicators. 列出所有可用指示剂 */
  listIndicators(): Indicator[] {
    return INDICATORS.map(ind => ({
      name: ind.name,
      pHRange: ind.range,
      colorAcid: ind.acid,
      colorBase: ind.base,
      pKa: ind.pKa,
      suitable: true,
    }));
  }

  /** Neutralization reaction result. 中和反应结果 */
  neutralization(acid: { M: number; V: number }, base: { M: number; V: number }): AcidBaseSystem {
    const netH = acid.M * acid.V - base.M * base.V;
    const totalV = acid.V + base.V;
    let pH: number;
    if (netH > 0) pH = -Math.log10(netH / totalV);
    else if (netH < 0) pH = 14 + Math.log10(-netH / totalV);
    else pH = 7;
    const result: AcidBaseSystem = {
      type: 'neutral',
      strength: 'neutral',
      pH: Math.max(0, Math.min(14, pH)),
      pOH: 14 - Math.max(0, Math.min(14, pH)),
    };
    this._systems.push(result);
    this._history.push({ method: 'neutralization' });
    return result;
  }

  /** Heat of neutralization (kJ/mol). 中和热 */
  heatOfNeutralization(strongAcid: boolean, strongBase: boolean): number {
    if (strongAcid && strongBase) return -57.1;
    if (strongAcid || strongBase) return -53.4;
    return -50;
  }

  /** Polyprotic acid dissociation analysis. 多元酸解离分析 */
  polyproticAcid(name: string): AcidDissociation {
    const steps = ACID_DISSOCIATION_CONSTANTS[name] ?? [{ Ka: 1e-5, pKa: 5 }];
    const first = steps[0];
    let strength: 'strong' | 'weak' | 'very-weak';
    if (first.Ka > 1) strength = 'strong';
    else if (first.Ka > 1e-7) strength = 'weak';
    else strength = 'very-weak';
    const result: AcidDissociation = {
      name,
      formula: name,
      Ka: first.Ka,
      pKa: first.pKa,
      strength,
      polyprotic: steps.length > 1,
      steps,
    };
    this._analyses.push({ type: 'polyproticAcid', result });
    this._history.push({ method: 'polyproticAcid', name });
    return result;
  }

  /** pH of polyprotic acid (first dissociation dominant). 多元酸 pH */
  polyproticAcidPH(name: string, concentration: number): number {
    const data = ACID_DISSOCIATION_CONSTANTS[name] ?? [{ Ka: 1e-5, pKa: 5 }];
    const Ka1 = data[0].Ka;
    if (Ka1 > 1) {
      // Strong acid first dissociation
      return this.pH(concentration);
    }
    return this.weakAcid(Ka1, concentration).pH;
  }

  /** pH of amphiprotic species (HA- in solution). 两性物质 pH */
  amphiproticPH(Ka1: number, Ka2: number, concentration: number): number {
    // pH ≈ (pKa1 + pKa2) / 2 (independent of concentration for amphiprotic)
    const pKa1 = -Math.log10(Ka1);
    const pKa2 = -Math.log10(Ka2);
    const pH = (pKa1 + pKa2) / 2;
    this._history.push({ method: 'amphiproticPH', pH });
    return pH;
  }

  /** Salt hydrolysis analysis. 盐水解分析 */
  saltHydrolysis(saltType: 'weak-acid-strong-base' | 'strong-acid-weak-base' | 'weak-acid-weak-base' | 'strong-acid-strong-base',
    concentration: number, Ka: number = 1e-5, Kb: number = 1e-5): SaltHydrolysis {
    let pH: number;
    let type: 'acidic' | 'basic' | 'neutral';
    let Kh: number;
    let description: string;
    if (saltType === 'weak-acid-strong-base') {
      // A- + H2O ⇌ HA + OH-
      Kh = KW_25C / Ka;
      const oh = Math.sqrt(Kh * concentration);
      pH = 14 + Math.log10(oh);
      type = 'basic';
      description = 'Anion hydrolyzes producing OH-';
    } else if (saltType === 'strong-acid-weak-base') {
      // BH+ + H2O ⇌ B + H3O+
      Kh = KW_25C / Kb;
      const h = Math.sqrt(Kh * concentration);
      pH = -Math.log10(h);
      type = 'acidic';
      description = 'Cation hydrolyzes producing H+';
    } else if (saltType === 'weak-acid-weak-base') {
      // Both hydrolyze
      Kh = Ka / Kb;
      pH = 7 - Math.log10(Kh) / 2;
      type = Ka > Kb ? 'acidic' : 'basic';
      description = 'Both ions hydrolyze; pH depends on Ka vs Kb';
    } else {
      pH = 7;
      Kh = 0;
      type = 'neutral';
      description = 'No hydrolysis (strong acid + strong base)';
    }
    const result: SaltHydrolysis = {
      salt: saltType,
      type,
      pH,
      hydrolysisConstant: Kh,
      description,
    };
    this._analyses.push({ type: 'saltHydrolysis', result });
    this._history.push({ method: 'saltHydrolysis' });
    return result;
  }

  /** Common ion effect on weak acid. 同离子效应对弱酸的影响 */
  commonIonEffect(acidConc: number, saltConc: number, Ka: number): CommonIonEffect {
    const originalPH = this.weakAcid(Ka, acidConc).pH;
    // With common ion (salt provides A-)
    const h = Ka * acidConc / (acidConc + saltConc);
    const newPH = -Math.log10(h);
    const result: CommonIonEffect = {
      originalPH,
      newPH,
      shift: newPH - originalPH,
      description: `Adding ${saltConc}M common ion shifts pH by ${(newPH - originalPH).toFixed(2)}`,
    };
    this._analyses.push({ type: 'commonIonEffect', result });
    this._history.push({ method: 'commonIonEffect' });
    return result;
  }

  /** Degree of hydrolysis h = sqrt(Kh/C). 水解度 */
  degreeOfHydrolysis(Kh: number, concentration: number): number {
    if (concentration <= 0) return 0;
    const h = Math.sqrt(Kh / concentration);
    this._history.push({ method: 'degreeOfHydrolysis', h });
    return h;
  }

  /** pH of mixture of two acids. 混合酸 pH */
  mixedAcidsPH(acids: Array<{ concentration: number; Ka?: number; strong: boolean }>): number {
    let totalH = 0;
    for (const a of acids) {
      if (a.strong) {
        totalH += a.concentration;
      } else if (a.Ka) {
        totalH += Math.sqrt(a.Ka * a.concentration);
      }
    }
    return this.pH(totalH);
  }

  /** pH of mixture of two bases. 混合碱 pH */
  mixedBasesPH(bases: Array<{ concentration: number; Kb?: number; strong: boolean }>): number {
    let totalOH = 0;
    for (const b of bases) {
      if (b.strong) {
        totalOH += b.concentration;
      } else if (b.Kb) {
        totalOH += Math.sqrt(b.Kb * b.concentration);
      }
    }
    const pOH = -Math.log10(totalOH);
    return 14 - pOH;
  }

  /** Solubility of weak acid in acidic/basic solution. 弱酸在酸碱溶液中的溶解度 */
  weakAcidSolubility(Ka: number, solubilityPure: number, pH: number): number {
    // S = S0 * (1 + [H+]/Ka) for weak acid
    const H = Math.pow(10, -pH);
    const S = solubilityPure * (1 + H / Ka);
    this._history.push({ method: 'weakAcidSolubility', S });
    return S;
  }

  /** Convert Ka to pKa. Ka 转 pKa */
  kaToPka(Ka: number): number {
    if (Ka <= 0) return 14;
    return -Math.log10(Ka);
  }

  /** Convert pKa to Ka. pKa 转 Ka */
  pkaToKa(pKa: number): number {
    return Math.pow(10, -pKa);
  }

  /** Convert Kb to pKb. Kb 转 pKb */
  kbToPkb(Kb: number): number {
    if (Kb <= 0) return 14;
    return -Math.log10(Kb);
  }

  /** Convert pKb to Kb. pKb 转 Kb */
  pkbToKb(pKb: number): number {
    return Math.pow(10, -pKb);
  }

  /** Ka and Kb relationship: Ka * Kb = Kw. Ka 和 Kb 关系 */
  kaKbRelationship(Ka: number): number {
    return KW_25C / Ka;
  }

  /** Convert pKa to pKb (at 25°C). pKa 转 pKb */
  pkaToPkb(pKa: number): number {
    return 14 - pKa;
  }

  /** Convert pKb to pKa. pKb 转 pKa */
  pkbToPka(pKb: number): number {
    return 14 - pKb;
  }

  /** Identify if a substance is acidic, basic, or neutral based on pH. 由 pH 判断物质酸碱性 */
  classify(pH: number): 'strongly-acidic' | 'weakly-acidic' | 'neutral' | 'weakly-basic' | 'strongly-basic' {
    if (pH < 3) return 'strongly-acidic';
    if (pH < 7) return 'weakly-acidic';
    if (pH === 7) return 'neutral';
    if (pH <= 11) return 'weakly-basic';
    return 'strongly-basic';
  }

  /** Lewis acid-base theory: identify electron pair acceptor/donor. Lewis 酸碱理论 */
  lewisAcidBase(species: string, hasLonePair: boolean, hasEmptyOrbital: boolean): 'lewis-acid' | 'lewis-base' | 'amphoteric' | 'neither' {
    if (hasLonePair && hasEmptyOrbital) return 'amphoteric';
    if (hasLonePair) return 'lewis-base';
    if (hasEmptyOrbital) return 'lewis-acid';
    return 'neither';
  }

  /** Bronsted-Lowry conjugate acid-base pair. Bronsted-Lowry 共轭酸碱对 */
  conjugatePair(acidOrBase: string, isAcid: boolean): { original: string; conjugate: string } {
    if (isAcid) {
      // HA -> A- (conjugate base)
      const conjugate = acidOrBase.replace(/H$/, '-') + (acidOrBase.endsWith('-') ? '' : '');
      this._history.push({ method: 'conjugatePair' });
      return { original: acidOrBase, conjugate };
    } else {
      // A- -> HA (conjugate acid)
      const conjugate = acidOrBase.replace(/-$/, 'H');
      this._history.push({ method: 'conjugatePair' });
      return { original: acidOrBase, conjugate };
    }
  }

  /** Determine pH range for color change. 指示剂变色范围 */
  indicatorRange(pKa: number): [number, number] {
    return [pKa - 1, pKa + 1];
  }

  /** pH at any point during titration of weak acid with strong base. 弱酸强碱滴定中任意点 pH */
  titrationWeakAcidStrongBase(
    acidInitial: number, acidVolume: number, Ka: number,
    baseMolarity: number, baseVolumeAdded: number,
  ): number {
    const molesAcid = acidInitial * acidVolume;
    const molesBase = baseMolarity * baseVolumeAdded;
    const totalV = acidVolume + baseVolumeAdded;
    if (molesBase < molesAcid) {
      // Buffer region
      const remainingAcid = (molesAcid - molesBase) / totalV;
      const formedSalt = molesBase / totalV;
      if (remainingAcid <= 0) return 7;
      return -Math.log10(Ka) + Math.log10(formedSalt / remainingAcid);
    } else if (molesBase === molesAcid) {
      // Equivalence
      const conc = molesAcid / totalV;
      const Kb = KW_25C / Ka;
      const oh = Math.sqrt(Kb * conc);
      return 14 + Math.log10(oh);
    } else {
      // Excess base
      const excess = (molesBase - molesAcid) / totalV;
      return 14 + Math.log10(excess);
    }
  }

  /** pH at any point during titration of weak base with strong acid. 弱碱强酸滴定中任意点 pH */
  titrationWeakBaseStrongAcid(
    baseInitial: number, baseVolume: number, Kb: number,
    acidMolarity: number, acidVolumeAdded: number,
  ): number {
    const molesBase = baseInitial * baseVolume;
    const molesAcid = acidMolarity * acidVolumeAdded;
    const totalV = baseVolume + acidVolumeAdded;
    if (molesAcid < molesBase) {
      // Buffer region
      const remainingBase = (molesBase - molesAcid) / totalV;
      const formedSalt = molesAcid / totalV;
      if (remainingBase <= 0) return 7;
      const pOH = -Math.log10(Kb) + Math.log10(formedSalt / remainingBase);
      return 14 - pOH;
    } else if (molesAcid === molesBase) {
      // Equivalence
      const conc = molesBase / totalV;
      const Ka = KW_25C / Kb;
      const h = Math.sqrt(Ka * conc);
      return -Math.log10(h);
    } else {
      // Excess acid
      const excess = (molesAcid - molesBase) / totalV;
      return -Math.log10(excess);
    }
  }

  /** Calculate acid dissociation from pH and concentration. 由 pH 和浓度反算 Ka */
  kaFromPH(pH: number, concentration: number): number {
    const h = Math.pow(10, -pH);
    if (concentration <= h) return 0;
    const Ka = (h * h) / (concentration - h);
    this._history.push({ method: 'kaFromPH', Ka });
    return Ka;
  }

  /** Calculate percent ionization. 电离百分数 */
  percentIonization(Ka: number, concentration: number): number {
    return this.percentDissociation(Ka, concentration);
  }

  /** Estimate pH of acid rain. 酸雨 pH 估算 */
  acidRainPH(so2ppm: number, no2ppm: number): number {
    // SO2 -> H2SO3 (diprotic), NO2 -> HNO3
    const so2conc = so2ppm * 1e-6 / 24.45; // mol/L approx
    const no2conc = no2ppm * 1e-6 / 24.45;
    const totalH = no2conc + 2 * so2conc * 0.5; // approximation
    return this.pH(totalH);
  }

  /** Ocean acidification pH (simplified). 海洋酸化 pH 估算 */
  oceanAcidificationPH(co2ppm: number): number {
    // Henry's law: [CO2] = KH * pCO2
    const KH = 0.034; // mol/(L·atm)
    const pCO2 = co2ppm * 1e-6;
    const co2conc = KH * pCO2;
    const Ka1 = 4.3e-7;
    const h = Math.sqrt(Ka1 * co2conc);
    return this.pH(h);
  }

  /** Blood pH regulation via bicarbonate buffer. 血液 pH 调节（碳酸氢盐缓冲） */
  bloodPH(HCO3: number, H2CO3: number): number {
    const pKa = 6.35; // pKa1 of carbonic acid at body temp
    const pH = pKa + Math.log10(HCO3 / H2CO3);
    this._history.push({ method: 'bloodPH', pH });
    return pH;
  }

  /** Henderson-Hasselbach for bicarbonate system. 碳酸氢盐系统 */
  bicarbonateBuffer(pCO2: number, HCO3: number): number {
    // pH = 6.1 + log([HCO3-] / (0.03 * pCO2))
    const pH = 6.1 + Math.log10(HCO3 / (0.03 * pCO2));
    this._history.push({ method: 'bicarbonateBuffer', pH });
    return pH;
  }

  /** Anion gap in clinical chemistry. 临床化学阴离子间隙 */
  anionGap(Na: number, Cl: number, HCO3: number): { gap: number; interpretation: string } {
    const gap = Na - (Cl + HCO3);
    let interpretation: string;
    if (gap < 8) interpretation = 'low anion gap';
    else if (gap <= 16) interpretation = 'normal anion gap';
    else interpretation = 'high anion gap metabolic acidosis';
    this._history.push({ method: 'anionGap', gap });
    return { gap, interpretation };
  }

  /** Convert pH to hydrogen ion concentration in nM. pH 转 [H+]（nM） */
  pHToNm(pH: number): number {
    // [H+] in mol/L → nM: [H+] * 1e9
    return Math.pow(10, -pH) * 1e9;
  }

  /** Buffer index β. 缓冲指数 */
  bufferIndex(dCbase: number, dpH: number): number {
    if (dpH === 0) return 0;
    return dCbase / dpH;
  }

  /** Isoionic point for amphoteric compounds. 两性化合物的等电点 */
  isoionicPoint(pKa1: number, pKa2: number): number {
    return (pKa1 + pKa2) / 2;
  }

  /** Isoelectric point for amino acids. 氨基酸的等电点 */
  isoelectricPoint(pKaAcid: number, pKaBase: number): number {
    return (pKaAcid + pKaBase) / 2;
  }

  /** Determine if solution is buffered at given pH. 判断溶液是否在给定 pH 下有缓冲作用 */
  isBuffered(acidConc: number, saltConc: number, Ka: number, targetPH: number): boolean {
    const pKa = -Math.log10(Ka);
    const bufferPH = pKa + Math.log10(saltConc / acidConc);
    const result = Math.abs(bufferPH - targetPH) < 1;
    this._history.push({ method: 'isBuffered', result });
    return result;
  }

  /** pH jump calculation when diluting a buffer. 稀释缓冲液的 pH 跳变 */
  dilutionEffectOnBuffer(acidConc: number, saltConc: number, Ka: number, dilutionFactor: number): { originalPH: number; newPH: number; delta: number } {
    const pKa = -Math.log10(Ka);
    const originalPH = pKa + Math.log10(saltConc / acidConc);
    // Ratio unchanged by dilution, but water dissociation becomes significant at very low conc
    const newAcid = acidConc / dilutionFactor;
    const newSalt = saltConc / dilutionFactor;
    let newPH: number;
    if (newAcid < 1e-7 || newSalt < 1e-7) {
      // Very dilute - approach pH 7
      newPH = (originalPH + 7) / 2;
    } else {
      newPH = pKa + Math.log10(newSalt / newAcid);
    }
    const delta = newPH - originalPH;
    this._history.push({ method: 'dilutionEffectOnBuffer', delta });
    return { originalPH, newPH, delta };
  }

  /** Strong acid pH from pH directly. 已知 pH 反推强酸浓度 */
  strongAcidConcentrationFromPH(pH: number): number {
    return Math.pow(10, -pH);
  }

  /** Strong base pH from pH directly. 已知 pH 反推强碱浓度 */
  strongBaseConcentrationFromPH(pH: number): number {
    return Math.pow(10, -(14 - pH));
  }

  /** Determine acid strength classification. 酸强度分类 */
  acidStrength(Ka: number): 'strong' | 'moderate' | 'weak' | 'very-weak' {
    if (Ka > 1) return 'strong';
    if (Ka > 1e-4) return 'moderate';
    if (Ka > 1e-10) return 'weak';
    return 'very-weak';
  }

  /** Determine base strength classification. 碱强度分类 */
  baseStrength(Kb: number): 'strong' | 'moderate' | 'weak' | 'very-weak' {
    if (Kb > 1) return 'strong';
    if (Kb > 1e-4) return 'moderate';
    if (Kb > 1e-10) return 'weak';
    return 'very-weak';
  }

  /** Calculate pH from hydronium ion activity. 由水合氢离子活度计算 pH */
  pHFromActivity(activity: number): number {
    return -Math.log10(activity);
  }

  /** pH change when adding water (dilution of strong acid). 强酸稀释的 pH 变化 */
  dilutionPHChange(initialPH: number, dilutionFactor: number): number {
    // For strong acid: [H+] decreases by dilution factor
    const initialH = Math.pow(10, -initialPH);
    const newH = initialH / dilutionFactor;
    if (newH < 1e-7) return 7; // approaches neutral
    return -Math.log10(newH);
  }

  /** Mixing two solutions of different pH. 混合两种不同 pH 的溶液 */
  mixPH(pH1: number, V1: number, pH2: number, V2: number): number {
    const h1 = Math.pow(10, -pH1);
    const h2 = Math.pow(10, -pH2);
    const totalV = V1 + V2;
    if (totalV <= 0) return 7;
    const avgH = (h1 * V1 + h2 * V2) / totalV;
    return this.pH(avgH);
  }

  /** Approximate pH of carbonated water. 碳酸水 pH 估算 */
  carbonatedWaterPH(co2Pressure: number): number {
    // Henry's law + Ka1 of carbonic acid
    const KH = 0.034;
    const co2conc = KH * co2Pressure;
    const Ka1 = 4.3e-7;
    const h = Math.sqrt(Ka1 * co2conc);
    return this.pH(h);
  }

  /** Lookup acid Ka by formula. 由化学式查找酸 Ka */
  lookupAcidKa(formula: string): number {
    const data = ACID_DISSOCIATION_CONSTANTS[formula];
    const Ka = data ? data[0].Ka : 0;
    this._history.push({ method: 'lookupAcidKa', formula });
    return Ka;
  }

  /** Lookup base Kb by formula. 由化学式查找碱 Kb */
  lookupBaseKb(formula: string): number {
    const data = BASE_DISSOCIATION_CONSTANTS[formula];
    const Kb = data ? data[0].Kb : 0;
    this._history.push({ method: 'lookupBaseKb', formula });
    return Kb;
  }

  /** Identify acid/base from formula. 由化学式识别酸碱 */
  identifyAcidBase(formula: string): 'acid' | 'base' | 'salt' | 'unknown' {
    if (formula.startsWith('H') || ACID_DISSOCIATION_CONSTANTS[formula]) return 'acid';
    if (formula.includes('OH') || BASE_DISSOCIATION_CONSTANTS[formula]) return 'base';
    if (formula.includes('Na') || formula.includes('K') || formula.includes('Ca')) return 'salt';
    return 'unknown';
  }

  /** Return pKa of common acids. 返回常见酸的 pKa */
  pKaOf(formula: string): number {
    const data = ACID_DISSOCIATION_CONSTANTS[formula];
    const pKa = data ? data[0].pKa : 14;
    this._history.push({ method: 'pKaOf', formula });
    return pKa;
  }

  /** Return pKb of common bases. 返回常见碱的 pKb */
  pKbOf(formula: string): number {
    const data = BASE_DISSOCIATION_CONSTANTS[formula];
    const pKb = data ? data[0].pKb : 14;
    this._history.push({ method: 'pKbOf', formula });
    return pKb;
  }

  /** Acid rain acidity contribution. 酸雨酸度贡献 */
  acidRainContribution(so2: number, no2: number, hcl: number): { pH: number; mainContributor: string } {
    const so2Acid = so2 * 2; // H2SO3 → 2H+
    const no2Acid = no2; // HNO3 → H+
    const hclAcid = hcl;
    const total = so2Acid + no2Acid + hclAcid;
    let mainContributor: string;
    if (so2Acid >= no2Acid && so2Acid >= hclAcid) mainContributor = 'SO2';
    else if (no2Acid >= hclAcid) mainContributor = 'NO2';
    else mainContributor = 'HCl';
    return { pH: this.pH(total), mainContributor };
  }

  /** Calculate pH from hydrogen ion activity with activity coefficient. 由活度系数计算 pH */
  pHWithActivity(concentration: number, activityCoeff: number): number {
    const activity = concentration * activityCoeff;
    return this.pH(activity);
  }

  /** Calculate degree of dissociation α. 电离度 α */
  degreeOfDissociation(Ka: number, concentration: number): number {
    if (Ka <= 0 || concentration <= 0) return 0;
    const h = (-Ka + Math.sqrt(Ka * Ka + 4 * Ka * concentration)) / 2;
    return h / concentration;
  }

  /** Ostwald's dilution law: Ka = α²C / (1-α). Ostwald 稀释定律 */
  ostwaldDilutionLaw(alpha: number, concentration: number): number {
    if (alpha >= 1) return Infinity;
    return (alpha * alpha * concentration) / (1 - alpha);
  }

  /** Calculate pH of amphiprotic salt like NaHCO3. 两性盐 pH */
  amphiproticSaltPH(Ka1: number, Ka2: number): number {
    const pKa1 = -Math.log10(Ka1);
    const pKa2 = -Math.log10(Ka2);
    return (pKa1 + pKa2) / 2;
  }

  /** Hydrolysis constant for anion of weak acid. 弱酸阴离子的水解常数 */
  anionHydrolysisConstant(Ka: number): number {
    return KW_25C / Ka;
  }

  /** Hydrolysis constant for cation of weak base. 弱碱阳离子的水解常数 */
  cationHydrolysisConstant(Kb: number): number {
    return KW_25C / Kb;
  }

  /** Calculate buffer index β at given pH. 给定 pH 下的缓冲指数 */
  bufferIndexAtPH(C: number, pKa: number, pH: number): number {
    const H = Math.pow(10, -pH);
    const Ka = Math.pow(10, -pKa);
    const beta = 2.303 * C * Ka * H / Math.pow(Ka + H, 2);
    this._history.push({ method: 'bufferIndexAtPH', beta });
    return beta;
  }

  /** Titration index (pH at half-equivalence). 滴定指数（半等当点 pH） */
  titrationIndex(pKa: number): number {
    return pKa;
  }

  /** Calculate concentration of dissociated acid. 已解离酸浓度 */
  dissociatedConcentration(Ka: number, concentration: number): number {
    if (Ka <= 0 || concentration <= 0) return 0;
    return (-Ka + Math.sqrt(Ka * Ka + 4 * Ka * concentration)) / 2;
  }

  /** Calculate concentration of undissociated acid. 未解离酸浓度 */
  undissociatedConcentration(Ka: number, concentration: number): number {
    const dissociated = this.dissociatedConcentration(Ka, concentration);
    return concentration - dissociated;
  }

  /** Private history recorder (capped at 200 entries). 私有历史记录方法 */
  private _recordHistory(entry: unknown): void {
    this._history.push(entry);
    if (this._history.length > 200) {
      this._history.shift();
    }
  }

  toPacket(): DataPacket<{
    systems: AcidBaseSystem[];
    buffers: Buffer[];
    titrations: Titration[];
    analyses: Array<{ type: string; result: unknown }>;
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['chemistry', 'AcidBase'],
      priority: 1,
      phase: 'chemistry:acid-base',
    };
    return {
      id: `ab-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        systems: this._systems,
        buffers: this._buffers,
        titrations: this._titrations,
        analyses: this._analyses,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._systems = [];
    this._buffers = [];
    this._titrations = [];
    this._analyses = [];
    this._history = [];
    this._counter = 0;
  }

  get systemCount(): number {
    return this._systems.length;
  }

  get bufferCount(): number {
    return this._buffers.length;
  }

  get titrationCount(): number {
    return this._titrations.length;
  }

  get analysisCount(): number {
    return this._analyses.length;
  }

  get historyDepth(): number {
    return this._history.length;
  }
}
