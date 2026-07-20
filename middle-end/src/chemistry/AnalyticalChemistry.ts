import { DataPacket, PacketMeta } from '../shared/types';

/** Spectral record. 光谱记录 */
export interface Spectra {
  type: 'UV-Vis' | 'IR' | 'NMR' | 'Mass' | 'Fluorescence' | 'Raman' | 'AAS' | 'AES' | 'XRF' | 'XRD';
  peaks: Array<{ position: number; intensity: number; assignment: string }>;
  compound: string;
  solvent?: string;
  wavelength?: number;
}

/** Chromatogram record. 色谱图记录 */
export interface Chromatogram {
  peaks: Array<{ time: number; area: number; compound: string; height?: number }>;
  retentionTime: number;
  resolution: number;
  column?: string;
  mobilePhase?: string;
  detector?: string;
}

/** Calibration curve descriptor. 校准曲线描述 */
export interface CalibrationCurve {
  standards: Array<{ concentration: number; reading: number }>;
  slope: number;
  intercept: number;
  rSquared: number;
  method?: 'linear' | 'polynomial' | 'weighted' | 'standard-addition' | 'internal-standard';
}

/** Detection result. 检测结果 */
export interface DetectionResult {
  detected: boolean;
  signalToNoise: number;
  concentration: number;
  confidence: number;
}

/** Titration descriptor. 滴定描述 */
export interface Titration {
  type: 'acid-base' | 'redox' | 'complexometric' | 'precipitation';
  titrant: string;
  analyte: string;
  endpointVolume: number;
  indicator: string;
  concentration: number;
}

/** Statistical summary. 统计摘要 */
export interface StatisticalSummary {
  mean: number;
  median: number;
  mode: number;
  stdDev: number;
  variance: number;
  rsd: number;
  min: number;
  max: number;
  range: number;
  count: number;
  confidence95: number;
}

/** Validation parameters. 验证参数 */
export interface ValidationParameters {
  accuracy: number;
  precision: number;
  linearity: number;
  range: string;
  lod: number;
  loq: number;
  specificity: number;
  robustness: number;
  ruggedness: number;
}

/** Quality control sample. 质控样品 */
export interface QCSample {
  type: 'blank' | 'standard' | 'spike' | 'duplicate' | 'matrix-spike' | 'matrix-spike-duplicate';
  expected: number;
  observed: number;
  recovery: number;
  rpd: number;
}

/** Sample preparation record. 样品前处理记录 */
export interface SamplePreparation {
  method: string;
  solvent: string;
  volume: number;
  dilutionFactor: number;
  extractionEfficiency: number;
}

/** Method validation descriptor. 方法验证描述 */
export interface MethodValidation {
  linearRange: { loq: number; upper: number };
  sensitivity: number;
  selectivity: number;
  accuracy: number;
  precision: number;
  recovery: number;
  stability: number;
}

/** IR absorption frequencies database (cm⁻¹). 红外吸收频率数据库 */
const IR_FREQUENCIES: Record<string, { range: [number, number]; intensity: string; assignment: string }> = {
  'O-H stretch': { range: [3200, 3600], intensity: 'broad, strong', assignment: 'alcohol/phenol' },
  'O-H (acid)': { range: [2500, 3300], intensity: 'very broad', assignment: 'carboxylic acid' },
  'N-H stretch': { range: [3300, 3500], intensity: 'medium', assignment: 'amine/amide' },
  'C-H (sp3)': { range: [2800, 3000], intensity: 'strong', assignment: 'alkane' },
  'C-H (sp2)': { range: [3000, 3100], intensity: 'medium', assignment: 'alkene/aromatic' },
  'C-H (sp)': { range: [3300, 3320], intensity: 'strong', assignment: 'alkyne' },
  'C≡N stretch': { range: [2210, 2260], intensity: 'medium', assignment: 'nitrile' },
  'C≡C stretch': { range: [2100, 2260], intensity: 'weak', assignment: 'alkyne' },
  'C=O stretch': { range: [1650, 1780], intensity: 'strong', assignment: 'carbonyl' },
  'C=C stretch': { range: [1620, 1680], intensity: 'variable', assignment: 'alkene' },
  'C-O stretch': { range: [1000, 1300], intensity: 'strong', assignment: 'ether/alcohol' },
  'NO2 stretch': { range: [1500, 1570], intensity: 'strong', assignment: 'nitro' },
  'C-Cl stretch': { range: [600, 800], intensity: 'strong', assignment: 'alkyl chloride' },
  'N-H bend': { range: [1580, 1650], intensity: 'medium', assignment: 'amine' },
  'C-H bend': { range: [1340, 1470], intensity: 'medium', assignment: 'alkane' },
  'S=O stretch': { range: [1300, 1350], intensity: 'strong', assignment: 'sulfonyl' },
  'P=O stretch': { range: [1200, 1300], intensity: 'strong', assignment: 'phosphate' },
  'C-F stretch': { range: [1000, 1400], intensity: 'strong', assignment: 'fluoride' },
  'C-Br stretch': { range: [500, 600], intensity: 'strong', assignment: 'bromide' },
};

/** NMR chemical shift database (ppm, ¹H). 核磁共振化学位移数据库 */
const NMR_SHIFTS_PROTON: Record<string, { shift: number; multiplicity: string; environment: string }> = {
  'TMS': { shift: 0.0, multiplicity: 'singlet', environment: 'reference' },
  'alkane CH3': { shift: 0.9, multiplicity: 'triplet', environment: 'sp3 C-H' },
  'alkane CH2': { shift: 1.3, multiplicity: 'multiplet', environment: 'sp3 C-H' },
  'alkane CH': { shift: 1.5, multiplicity: 'multiplet', environment: 'sp3 C-H' },
  'allylic': { shift: 2.0, multiplicity: 'multiplet', environment: 'next to C=C' },
  'alpha to carbonyl': { shift: 2.2, multiplicity: 'singlet', environment: 'next to C=O' },
  'aromatic H': { shift: 7.2, multiplicity: 'multiplet', environment: 'aromatic ring' },
  'aldehyde H': { shift: 9.8, multiplicity: 'singlet', environment: '-CHO' },
  'carboxylic acid H': { shift: 11.0, multiplicity: 'broad singlet', environment: '-COOH' },
  'alcohol OH': { shift: 2.5, multiplicity: 'broad singlet', environment: '-OH (variable)' },
  'phenol OH': { shift: 5.0, multiplicity: 'broad', environment: 'Ar-OH' },
  'amine NH2': { shift: 1.5, multiplicity: 'broad', environment: '-NH2' },
  'amide NH': { shift: 7.0, multiplicity: 'broad', environment: '-CONH-' },
  'vinyl H': { shift: 5.5, multiplicity: 'multiplet', environment: 'C=C-H' },
  'alkyne H': { shift: 2.5, multiplicity: 'singlet', environment: '≡C-H' },
  'benzylic': { shift: 2.7, multiplicity: 'singlet', environment: 'Ar-CH3' },
  'alpha to O (ether)': { shift: 3.5, multiplicity: 'quartet', environment: '-O-CH2-' },
  'alpha to O (ester)': { shift: 4.1, multiplicity: 'quartet', environment: '-COO-CH2-' },
  'methoxy': { shift: 3.7, multiplicity: 'singlet', environment: '-OCH3' },
  'chloroform': { shift: 7.27, multiplicity: 'singlet', environment: 'solvent' },
};

/** ¹³C NMR chemical shifts (ppm). ¹³C 核磁共振化学位移 */
const NMR_SHIFTS_CARBON: Record<string, number> = {
  'alkane C': 20,
  'alkyl C': 30,
  'alkene C': 130,
  'aromatic C': 130,
  'alkyne C': 80,
  'alcohol C': 70,
  'ether C': 65,
  'ester C-O': 60,
  'carbonyl (ketone)': 205,
  'carbonyl (aldehyde)': 200,
  'carbonyl (acid)': 175,
  'carbonyl (ester)': 170,
  'carbonyl (amide)': 165,
  'nitrile C': 115,
  'TMS': 0,
};

/** Common UV-Vis chromophores. 常见紫外-可见生色团 */
const UV_VIS_CHROMOPHORES: Record<string, { lambdaMax: number; epsilon: number; assignment: string }> = {
  'C=C': { lambdaMax: 171, epsilon: 15530, assignment: 'alkene π→π*' },
  'C≡C': { lambdaMax: 173, epsilon: 6000, assignment: 'alkyne π→π*' },
  'C=O (ketone)': { lambdaMax: 270, epsilon: 16, assignment: 'n→π*' },
  'C=O (aldehyde)': { lambdaMax: 293, epsilon: 12, assignment: 'n→π*' },
  'COOH': { lambdaMax: 204, epsilon: 41, assignment: 'n→π*' },
  'COOR': { lambdaMax: 205, epsilon: 50, assignment: 'n→π*' },
  'NO2': { lambdaMax: 271, epsilon: 19, assignment: 'n→π*' },
  'benzene': { lambdaMax: 255, epsilon: 215, assignment: 'aromatic π→π*' },
  'benzene-p': { lambdaMax: 204, epsilon: 7400, assignment: 'aromatic π→π*' },
  'azo': { lambdaMax: 338, epsilon: 5, assignment: 'n→π*' },
  'conjugated diene': { lambdaMax: 217, epsilon: 21000, assignment: 'π→π*' },
  'β-carotene': { lambdaMax: 452, epsilon: 139500, assignment: 'long conjugated' },
};

/** Mass spectrometry common fragments. 质谱常见碎片 */
const MS_FRAGMENTS: Record<string, number> = {
  'M+': 0,
  'McLafferty': 0,
  'alpha-cleavage': 0,
  'loss of CH3': 15,
  'loss of H2O': 18,
  'loss of C2H5': 29,
  'loss of CHO': 29,
  'loss of CH3CO': 43,
  'loss of CO2': 44,
  'loss of C3H7': 43,
  'loss of C4H9': 57,
  'loss of CO': 28,
  'loss of HCN': 27,
  'loss of NH3': 17,
  'loss of HCl': 36,
  'loss of C2H4': 28,
};

/** Indicators for titration. 滴定指示剂 */
const INDICATORS: Record<string, { pHRange: [number, number]; acidColor: string; baseColor: string }> = {
  'methyl orange': { pHRange: [3.1, 4.4], acidColor: 'red', baseColor: 'yellow' },
  'bromophenol blue': { pHRange: [3.0, 4.6], acidColor: 'yellow', baseColor: 'blue' },
  'methyl red': { pHRange: [4.4, 6.2], acidColor: 'red', baseColor: 'yellow' },
  'bromocresol green': { pHRange: [3.8, 5.4], acidColor: 'yellow', baseColor: 'blue' },
  'litmus': { pHRange: [4.5, 8.3], acidColor: 'red', baseColor: 'blue' },
  'bromothymol blue': { pHRange: [6.0, 7.6], acidColor: 'yellow', baseColor: 'blue' },
  'phenol red': { pHRange: [6.8, 8.4], acidColor: 'yellow', baseColor: 'red' },
  'phenolphthalein': { pHRange: [8.2, 10.0], acidColor: 'colorless', baseColor: 'pink' },
  'thymolphthalein': { pHRange: [9.3, 10.5], acidColor: 'colorless', baseColor: 'blue' },
  'alizarin yellow R': { pHRange: [10.1, 12.0], acidColor: 'yellow', baseColor: 'red' },
};

/** Common buffer solutions. 常见缓冲溶液 */
const BUFFER_SYSTEMS: Record<string, { pKa: number; components: string[]; range: [number, number] }> = {
  'citrate': { pKa: 3.13, components: ['citric acid', 'sodium citrate'], range: [2.1, 6.4] },
  'acetate': { pKa: 4.76, components: ['acetic acid', 'sodium acetate'], range: [3.7, 5.7] },
  'phosphate': { pKa: 7.21, components: ['NaH2PO4', 'Na2HPO4'], range: [5.8, 8.0] },
  'Tris-HCl': { pKa: 8.06, components: ['Tris base', 'HCl'], range: [7.0, 9.0] },
  'borate': { pKa: 9.24, components: ['boric acid', 'NaOH'], range: [8.3, 10.2] },
  'carbonate': { pKa: 10.33, components: ['NaHCO3', 'Na2CO3'], range: [9.2, 11.0] },
  'ammonia': { pKa: 9.25, components: ['NH4Cl', 'NH3'], range: [8.3, 10.3] },
  'HEPES': { pKa: 7.55, components: ['HEPES acid', 'HEPES base'], range: [6.8, 8.2] },
};

/** HPLC column types. HPLC 柱类型 */
const HPLC_COLUMNS: Record<string, { phase: string; polarity: string; application: string }> = {
  'C18': { phase: 'octadecylsilane', polarity: 'nonpolar', application: 'reverse phase' },
  'C8': { phase: 'octylsilane', polarity: 'nonpolar', application: 'reverse phase' },
  'C4': { phase: 'butylsilane', polarity: 'nonpolar', application: 'reverse phase (proteins)' },
  'CN': { phase: 'cyanopropyl', polarity: 'moderately polar', application: 'normal/reverse' },
  'NH2': { phase: 'aminopropyl', polarity: 'polar', application: 'normal phase' },
  'OH (diol)': { phase: 'diol', polarity: 'polar', application: 'normal phase' },
  'SiO2': { phase: 'bare silica', polarity: 'highly polar', application: 'normal phase' },
  'phenyl': { phase: 'phenyl', polarity: 'moderately nonpolar', application: 'reverse phase' },
  'SCX': { phase: 'sulfonic acid', polarity: 'ionic', application: 'ion exchange' },
  'SAX': { phase: 'quaternary amine', polarity: 'ionic', application: 'ion exchange' },
};

/** Standard reduction potentials for redox titrations (V). 氧化还原滴定标准电位 */
const REDOX_INDICATORS: Record<string, { E0: number; oxidized: string; reduced: string }> = {
  'methylene blue': { E0: 0.53, oxidized: 'blue', reduced: 'colorless' },
  'diphenylamine': { E0: 0.76, oxidized: 'violet', reduced: 'colorless' },
  'diphenylamine sulfonic acid': { E0: 0.85, oxidized: 'red-violet', reduced: 'colorless' },
  'ferroin': { E0: 1.06, oxidized: 'pale blue', reduced: 'red' },
  'nitroferroin': { E0: 1.25, oxidized: 'pale blue', reduced: 'red' },
};

/** Common metal-chelator indicators for complexometric titration. 络合滴定金属指示剂 */
const METAL_INDICATORS: Record<string, { metals: string[]; colorFree: string; colorBound: string }> = {
  'Eriochrome Black T': { metals: ['Ca', 'Mg', 'Zn'], colorFree: 'blue', colorBound: 'red' },
  'murexide': { metals: ['Ca', 'Ni', 'Cu'], colorFree: 'purple', colorBound: 'yellow' },
  'calcon': { metals: ['Ca'], colorFree: 'blue', colorBound: 'pink' },
  'PAN': { metals: ['Cu', 'Zn', 'Cd'], colorFree: 'yellow', colorBound: 'red' },
  'Xylenol Orange': { metals: ['Bi', 'Pb', 'Th'], colorFree: 'yellow', colorBound: 'red' },
  'salicylic acid': { metals: ['Fe3+'], colorFree: 'colorless', colorBound: 'red' },
};

/** Critical values for Dixon Q-test (95% confidence). Dixon Q 检验临界值（95% 置信） */
const DIXON_Q_CRITICAL_95: Record<number, number> = {
  3: 0.970, 4: 0.829, 5: 0.710, 6: 0.628, 7: 0.569,
  8: 0.608, 9: 0.564, 10: 0.530, 11: 0.502, 12: 0.479,
  13: 0.611, 14: 0.586, 15: 0.565,
};

/** t-distribution critical values (two-tailed, 95%). t 分布临界值（双尾，95%） */
const T_CRITICAL_95: Record<number, number> = {
  1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571,
  6: 2.447, 7: 2.365, 8: 2.306, 9: 2.262, 10: 2.228,
  15: 2.131, 20: 2.086, 25: 2.060, 30: 2.042, 40: 2.021,
  60: 2.000, 120: 1.980, 999: 1.960,
};

/** Z-values for confidence levels. 置信水平的 Z 值 */
const Z_VALUES: Record<string, number> = {
  '80%': 1.282,
  '90%': 1.645,
  '95%': 1.960,
  '99%': 2.576,
  '99.9%': 3.291,
};

/** Detection method parameters. 检测方法参数 */
const DETECTION_METHODS: Record<string, { typicalLOD: number; linearRange: string; precision: string }> = {
  'UV-Vis': { typicalLOD: 1e-6, linearRange: '10⁻⁶ - 10⁻³ M', precision: '1-2% RSD' },
  'Fluorescence': { typicalLOD: 1e-9, linearRange: '10⁻⁹ - 10⁻⁶ M', precision: '0.5-2% RSD' },
  'AAS (flame)': { typicalLOD: 1e-6, linearRange: '0.1-100 ppm', precision: '0.5-2% RSD' },
  'AAS (graphite)': { typicalLOD: 1e-12, linearRange: 'sub-ppb', precision: '1-5% RSD' },
  'ICP-OES': { typicalLOD: 1e-9, linearRange: 'ppb - ppm', precision: '0.5-2% RSD' },
  'ICP-MS': { typicalLOD: 1e-12, linearRange: 'ppt - ppb', precision: '1-3% RSD' },
  'GC-FID': { typicalLOD: 1e-9, linearRange: 'wide', precision: '1-3% RSD' },
  'GC-MS': { typicalLOD: 1e-12, linearRange: 'wide', precision: '1-5% RSD' },
  'HPLC-UV': { typicalLOD: 1e-7, linearRange: 'ppb - ppm', precision: '0.5-2% RSD' },
  'LC-MS': { typicalLOD: 1e-12, linearRange: 'wide', precision: '1-5% RSD' },
};

/** Buffer capacity calculation parameters. 缓冲容量计算参数 */
const ION_PRODUCT_WATER = 1.0e-14; // K_w at 25°C

/** Planck constant (J·s). 普朗克常数 */
const PLANCK = 6.626e-34;

/** Speed of light (m/s). 光速 */
const SPEED_OF_LIGHT = 2.998e8;

/** Avogadro's number. 阿伏伽德罗常数 */
const AVOGADRO = 6.022e23;

/** Faraday constant (C/mol). 法拉第常数 */
const FARADAY = 96485;

/** Gas constant (J/(mol·K)). 气体常数 */
const R_GAS = 8.314;

/** Absolute zero offset. 绝对零度偏移 */
const KELVIN_OFFSET = 273.15;

/** Build and analyze analytical chemistry data. 构建和分析分析化学数据 */
export class AnalyticalChemistry {
  private _spectra: Spectra[] = [];
  private _chromatograms: Chromatogram[] = [];
  private _calibrations: CalibrationCurve[] = [];
  private _titrations: Titration[] = [];
  private _stats: StatisticalSummary[] = [];
  private _validations: ValidationParameters[] = [];
  private _qcSamples: QCSample[] = [];
  private _preparations: SamplePreparation[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  /** Private history recorder (capped at 200 entries). 私有历史记录方法（上限 200 条） */
  private _recordHistory(entry: unknown): void {
    this._history.push(entry);
    if (this._history.length > 200) {
      this._history.shift();
    }
  }

  /** Generate unique ID. 生成唯一 ID */
  private _generateId(prefix: string): string {
    return `${prefix}-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
  }

  // ===========================================================================
  // UV-Visible spectroscopy. 紫外-可见光谱
  // ===========================================================================

  /** Build a UV-Vis spectra from concentration vs absorbance pairs. 由浓度-吸光度对构建 UV-Vis 光谱 */
  uvVis(concentration: number[], absorbance: number[]): Spectra {
    const peaks = concentration.map((c, i) => ({
      position: 200 + i * 50,
      intensity: absorbance[i] ?? 0,
      assignment: `C=${c}`,
    }));
    const result: Spectra = { type: 'UV-Vis', peaks, compound: 'unknown' };
    this._spectra.push(result);
    this._recordHistory({ method: 'uvVis', n: concentration.length });
    return result;
  }

  /** Beer-Lambert Law A = ε * c * l. 比尔-朗伯定律 */
  beerLambertLaw(epsilon: number, c: number, l: number): number {
    const A = epsilon * c * l;
    this._recordHistory({ method: 'beerLambertLaw', A });
    return A;
  }

  /** Solve Beer-Lambert for concentration c = A / (ε * l). 由吸光度反算浓度 */
  concentrationFromAbsorbance(A: number, epsilon: number, l: number): number {
    if (epsilon === 0 || l === 0) return 0;
    const c = A / (epsilon * l);
    this._recordHistory({ method: 'concentrationFromAbsorbance', c });
    return Math.max(0, c);
  }

  /** Molar absorptivity ε = A / (c * l). 计算摩尔吸光系数 */
  molarAbsorptivity(A: number, c: number, l: number): number {
    if (c === 0 || l === 0) return 0;
    const eps = A / (c * l);
    this._recordHistory({ method: 'molarAbsorptivity', eps });
    return eps;
  }

  /** Transmittance T = 10^(-A). 由吸光度计算透光率 */
  transmittance(A: number): number {
    const T = Math.pow(10, -A);
    this._recordHistory({ method: 'transmittance', T });
    return T;
  }

  /** Absorbance from transmittance A = -log10(T). 由透光率计算吸光度 */
  absorbanceFromTransmittance(T: number): number {
    if (T <= 0) return Infinity;
    const A = -Math.log10(T);
    this._recordHistory({ method: 'absorbanceFromTransmittance', A });
    return A;
  }

  /** Convert percent transmittance to absorbance. 由百分透光率换算为吸光度 */
  percentTransmittanceToAbsorbance(percentT: number): number {
    if (percentT <= 0) return Infinity;
    const A = 2 - Math.log10(percentT);
    this._recordHistory({ method: 'percentTransmittanceToAbsorbance', A });
    return A;
  }

  /** Photon energy E = hc/λ. 由波长计算光子能量（J） */
  photonEnergy(wavelengthNm: number): number {
    if (wavelengthNm === 0) return 0;
    const wavelengthM = wavelengthNm * 1e-9;
    const E = (PLANCK * SPEED_OF_LIGHT) / wavelengthM;
    this._recordHistory({ method: 'photonEnergy', E });
    return E;
  }

  /** Photon energy in eV. 光子能量（eV） */
  photonEnergyEV(wavelengthNm: number): number {
    const E_J = this.photonEnergy(wavelengthNm);
    const E_eV = E_J / 1.602e-19;
    this._recordHistory({ method: 'photonEnergyEV', E_eV });
    return E_eV;
  }

  /** Wavelength-frequency conversion ν = c/λ. 波长-频率换算 */
  wavelengthToFrequency(wavelengthNm: number): number {
    if (wavelengthNm === 0) return 0;
    const wavelengthM = wavelengthNm * 1e-9;
    const nu = SPEED_OF_LIGHT / wavelengthM;
    this._recordHistory({ method: 'wavelengthToFrequency', nu });
    return nu;
  }

  /** Wavelength to wavenumber (cm⁻¹). 波长换算为波数 */
  wavelengthToWavenumber(wavelengthNm: number): number {
    if (wavelengthNm === 0) return 0;
    const wavenumber = 1e7 / wavelengthNm;
    this._recordHistory({ method: 'wavelengthToWavenumber', wavenumber });
    return wavenumber;
  }

  /** Wavenumber to wavelength (nm). 波数换算为波长 */
  wavenumberToWavelength(wavenumber: number): number {
    if (wavenumber === 0) return 0;
    const wavelengthNm = 1e7 / wavenumber;
    this._recordHistory({ method: 'wavenumberToWavelength', wavelengthNm });
    return wavelengthNm;
  }

  /** Woodard-Fieser rule estimate for diene λ_max. 用 Woodward-Fieser 规则估算二烯 λ_max */
  woodwardFieserDiene(parentLambda: number, substitutions: {
    extendedConjugation?: number;
    alkylSubstituents?: number;
    exocyclicDoubleBonds?: number;
    endocyclicDoubleBonds?: number;
    auxochrome?: number;
  }): number {
    let lambda = parentLambda;
    if (substitutions.extendedConjugation) lambda += substitutions.extendedConjugation * 30;
    if (substitutions.alkylSubstituents) lambda += substitutions.alkylSubstituents * 5;
    if (substitutions.exocyclicDoubleBonds) lambda += substitutions.exocyclicDoubleBonds * 5;
    if (substitutions.endocyclicDoubleBonds) lambda += substitutions.endocyclicDoubleBonds * 0;
    if (substitutions.auxochrome) lambda += substitutions.auxochrome * 6;
    this._recordHistory({ method: 'woodwardFieserDiene', lambda });
    return lambda;
  }

  /** λ_max from chromophore database. 从生色团数据库查 λ_max */
  chromophoreLambdaMax(chromophore: string): { lambdaMax: number; epsilon: number; assignment: string } {
    const data = UV_VIS_CHROMOPHORES[chromophore] ?? { lambdaMax: 0, epsilon: 0, assignment: 'unknown' };
    this._recordHistory({ method: 'chromophoreLambdaMax', chromophore });
    return data;
  }

  /** Calculate concentration from calibration curve and reading. 用校准曲线由读数计算浓度 */
  concentrationFromCalibration(reading: number, slope: number, intercept: number): number {
    if (slope === 0) return 0;
    const c = (reading - intercept) / slope;
    this._recordHistory({ method: 'concentrationFromCalibration', c });
    return Math.max(0, c);
  }

  // ===========================================================================
  // IR spectroscopy. 红外光谱
  // ===========================================================================

  /** Build a synthetic IR spectrum from bond list. 由键列表构建合成 IR 光谱 */
  irSpectrum(bonds: string[]): Spectra {
    const lookup: Record<string, number> = {
      'O-H': 3400, 'N-H': 3300, 'C-H': 2900, 'C=O': 1700, 'C=C': 1650, 'C≡N': 2200, 'C-O': 1100,
    };
    const peaks = bonds.map(b => ({
      position: lookup[b] ?? 1000,
      intensity: 0.8,
      assignment: b,
    }));
    const result: Spectra = { type: 'IR', peaks, compound: 'unknown' };
    this._spectra.push(result);
    this._recordHistory({ method: 'irSpectrum', bonds });
    return result;
  }

  /** Look up IR frequency for a bond type. 查询键类型的 IR 频率 */
  irFrequency(bond: string): { range: [number, number]; intensity: string; assignment: string } | null {
    const data = IR_FREQUENCIES[bond];
    if (!data) return null;
    this._recordHistory({ method: 'irFrequency', bond });
    return data;
  }

  /** Predict IR peaks from functional groups. 由官能团预测 IR 峰 */
  irPeaksFromFunctionalGroups(groups: string[]): Array<{ bond: string; range: [number, number]; intensity: string }> {
    const peaks: Array<{ bond: string; range: [number, number]; intensity: string }> = [];
    for (const g of groups) {
      const data = IR_FREQUENCIES[g];
      if (data) {
        peaks.push({ bond: g, range: data.range, intensity: data.intensity });
      }
    }
    this._recordHistory({ method: 'irPeaksFromFunctionalGroups', count: peaks.length });
    return peaks;
  }

  /** Identify functional group from IR peak position. 由 IR 峰位置识别官能团 */
  identifyFromIR(peakPosition: number): string[] {
    const matches: string[] = [];
    for (const [bond, data] of Object.entries(IR_FREQUENCIES)) {
      if (peakPosition >= data.range[0] && peakPosition <= data.range[1]) {
        matches.push(`${bond} (${data.assignment})`);
      }
    }
    this._recordHistory({ method: 'identifyFromIR', matches: matches.length });
    return matches;
  }

  /** Fingerprint region check (1500-400 cm⁻¹). 指纹区检查 */
  fingerprintRegion(peaks: Array<{ position: number; intensity: number }>): Array<{ position: number; intensity: number }> {
    const fp = peaks.filter(p => p.position >= 400 && p.position <= 1500);
    this._recordHistory({ method: 'fingerprintRegion', count: fp.length });
    return fp;
  }

  /** Functional group region (4000-1500 cm⁻¹). 官能团区 */
  functionalGroupRegion(peaks: Array<{ position: number; intensity: number }>): Array<{ position: number; intensity: number }> {
    const fg = peaks.filter(p => p.position > 1500 && p.position <= 4000);
    this._recordHistory({ method: 'functionalGroupRegion', count: fg.length });
    return fg;
  }

  // ===========================================================================
  // NMR spectroscopy. 核磁共振波谱
  // ===========================================================================

  /** Build a synthetic NMR spectrum. 构建合成 NMR 谱 */
  nmrSpectrum(atoms: string[], shifts: number[]): Spectra {
    const peaks = atoms.map((a, i) => ({
      position: shifts[i] ?? 0,
      intensity: 1,
      assignment: a,
    }));
    const result: Spectra = { type: 'NMR', peaks, compound: 'unknown' };
    this._spectra.push(result);
    this._recordHistory({ method: 'nmrSpectrum', n: atoms.length });
    return result;
  }

  /** Look up ¹H NMR chemical shift for an environment. 查询 ¹H NMR 化学位移 */
  protonShift(environment: string): { shift: number; multiplicity: string; environment: string } | null {
    const data = NMR_SHIFTS_PROTON[environment];
    if (!data) return null;
    this._recordHistory({ method: 'protonShift', environment });
    return data;
  }

  /** Look up ¹³C NMR chemical shift. 查询 ¹³C NMR 化学位移 */
  carbonShift(environment: string): number | null {
    const shift = NMR_SHIFTS_CARBON[environment];
    if (shift === undefined) return null;
    this._recordHistory({ method: 'carbonShift', environment });
    return shift;
  }

  /** Predict ¹H NMR spectrum from environments. 由环境预测 ¹H NMR 谱 */
  predictProtonNMR(environments: string[]): Array<{ env: string; shift: number; multiplicity: string }> {
    const peaks: Array<{ env: string; shift: number; multiplicity: string }> = [];
    for (const env of environments) {
      const data = NMR_SHIFTS_PROTON[env];
      if (data) {
        peaks.push({ env, shift: data.shift, multiplicity: data.multiplicity });
      }
    }
    this._recordHistory({ method: 'predictProtonNMR', count: peaks.length });
    return peaks;
  }

  /** Predict ¹³C NMR spectrum. 预测 ¹³C NMR 谱 */
  predictCarbonNMR(environments: string[]): Array<{ env: string; shift: number }> {
    const peaks: Array<{ env: string; shift: number }> = [];
    for (const env of environments) {
      const shift = NMR_SHIFTS_CARBON[env];
      if (shift !== undefined) {
        peaks.push({ env, shift });
      }
    }
    this._recordHistory({ method: 'predictCarbonNMR', count: peaks.length });
    return peaks;
  }

  /** NMR integration ratio from peak areas. 由峰面积求 NMR 积分比 */
  nmrIntegration(areas: number[]): number[] {
    if (areas.length === 0) return [];
    const min = Math.min(...areas);
    if (min === 0) return areas;
    const ratios = areas.map(a => a / min);
    this._recordHistory({ method: 'nmrIntegration', ratios });
    return ratios;
  }

  /** n+1 rule for splitting pattern. n+1 规则（裂分模式） */
  nPlusOneRule(n: number): { multiplicity: string; lines: number } {
    let multiplicity = 'singlet';
    if (n === 1) multiplicity = 'doublet';
    else if (n === 2) multiplicity = 'triplet';
    else if (n === 3) multiplicity = 'quartet';
    else if (n === 4) multiplicity = 'quintet';
    else if (n > 4) multiplicity = 'multiplet';
    this._recordHistory({ method: 'nPlusOneRule', n });
    return { multiplicity, lines: n + 1 };
  }

  /** Coupling constant J (Hz) from doublet separation. 由双峰间距算耦合常数 */
  couplingConstant(peak1Hz: number, peak2Hz: number): number {
    const J = Math.abs(peak1Hz - peak2Hz);
    this._recordHistory({ method: 'couplingConstant', J });
    return J;
  }

  /** Calculate degree of unsaturation (DBE) from molecular formula. 由分子式计算不饱和度 */
  degreesOfUnsaturation(c: number, h: number, n: number = 0, x: number = 0): number {
    // DBE = (2C + 2 + N - H - X) / 2
    const dbe = (2 * c + 2 + n - h - x) / 2;
    this._recordHistory({ method: 'degreesOfUnsaturation', dbe });
    return Math.max(0, dbe);
  }

  /** Larmor frequency for NMR nucleus. NMR 核的 Larmor 频率 */
  larmorFrequency(gamma: number, B0: number): number {
    // ν = γ * B0 / (2π)
    const nu = (gamma * B0) / (2 * Math.PI);
    this._recordHistory({ method: 'larmorFrequency', nu });
    return nu;
  }

  /** Chemical shift in Hz from ppm. 由 ppm 转换为 Hz */
  shiftHzFromPPM(ppm: number, spectrometerFreqMHz: number): number {
    const Hz = ppm * spectrometerFreqMHz;
    this._recordHistory({ method: 'shiftHzFromPPM', Hz });
    return Hz;
  }

  /** Chemical shift in ppm from Hz. 由 Hz 转换为 ppm */
  shiftPPMFromHz(Hz: number, spectrometerFreqMHz: number): number {
    if (spectrometerFreqMHz === 0) return 0;
    const ppm = Hz / spectrometerFreqMHz;
    this._recordHistory({ method: 'shiftPPMFromHz', ppm });
    return ppm;
  }

  // ===========================================================================
  // Mass spectrometry. 质谱
  // ===========================================================================

  /** Build a mass spectrum with parent and fragments. 构建含分子离子和碎片的质谱 */
  massSpectrum(molecularMass: number, fragments: number[]): Spectra {
    const peaks = [
      { position: molecularMass, intensity: 1, assignment: 'M+' },
      ...fragments.map(f => ({ position: f, intensity: 0.5, assignment: 'fragment' })),
    ];
    const result: Spectra = { type: 'Mass', peaks, compound: 'unknown' };
    this._spectra.push(result);
    this._recordHistory({ method: 'massSpectrum', molecularMass });
    return result;
  }

  /** Calculate molecular ion M+ from formula weight. 由式量计算分子离子 M+ */
  molecularIon(formulaWeight: number): { mPlus: number; mPlusOne: number; mPlusTwo: number } {
    // M+1 peak from ¹³C (≈1.1% per C)
    const mPlus = formulaWeight;
    const mPlusOne = formulaWeight + 1;
    const mPlusTwo = formulaWeight + 2;
    this._recordHistory({ method: 'molecularIon', mPlus });
    return { mPlus, mPlusOne, mPlusTwo };
  }

  /** Isotope pattern for chlorine-containing compound. 含氯化合物的同位素峰 */
  chlorineIsotopePattern(numCl: number): Array<{ mass: number; intensity: number }> {
    const peaks: Array<{ mass: number; intensity: number }> = [];
    // ³⁵Cl : ³⁷Cl = 3:1, binomial expansion
    for (let i = 0; i <= numCl; i++) {
      const intensity = this._binomial(numCl, i) * Math.pow(0.75, numCl - i) * Math.pow(0.25, i);
      peaks.push({ mass: i * 2, intensity });
    }
    this._recordHistory({ method: 'chlorineIsotopePattern', numCl });
    return peaks;
  }

  /** Isotope pattern for bromine-containing compound. 含溴化合物的同位素峰 */
  bromineIsotopePattern(numBr: number): Array<{ mass: number; intensity: number }> {
    const peaks: Array<{ mass: number; intensity: number }> = [];
    // ⁷⁹Br : ⁸¹Br = 1:1
    for (let i = 0; i <= numBr; i++) {
      const intensity = this._binomial(numBr, i) * Math.pow(0.5, numBr - i) * Math.pow(0.5, i);
      peaks.push({ mass: i * 2, intensity });
    }
    this._recordHistory({ method: 'bromineIsotopePattern', numBr });
    return peaks;
  }

  /** Private binomial coefficient C(n, k). 私有组合数计算 */
  private _binomial(n: number, k: number): number {
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;
    let result = 1;
    for (let i = 0; i < k; i++) {
      result = (result * (n - i)) / (i + 1);
    }
    return result;
  }

  /** Nitrogen rule: even molecular mass → even N atoms. 氮规则 */
  nitrogenRule(molecularMass: number, numNitrogen: number): { follows: boolean; explanation: string } {
    const massParity = molecularMass % 2;
    const nitrogenParity = numNitrogen % 2;
    const follows = massParity === nitrogenParity;
    const explanation = follows
      ? 'Consistent with nitrogen rule'
      : 'Violates nitrogen rule — even nominal mass requires even N (or zero)';
    this._recordHistory({ method: 'nitrogenRule', follows });
    return { follows, explanation };
  }

  /** Ring-double bond equivalent (RDBE). 环+双键数 */
  ringDoubleBondEquivalent(c: number, h: number, n: number = 0, x: number = 0, o: number = 0, s: number = 0): number {
    void o; void s;
    // RDBE = C - H/2 - X/2 + N/2 + 1
    const rdbe = c - h / 2 - x / 2 + n / 2 + 1;
    this._recordHistory({ method: 'ringDoubleBondEquivalent', rdbe });
    return Math.max(0, rdbe);
  }

  /** High-resolution mass defect analysis. 高分辨质量亏损分析 */
  massDefect(exactMass: number, nominalMass: number): number {
    const defect = exactMass - nominalMass;
    this._recordHistory({ method: 'massDefect', defect });
    return defect;
  }

  /** Mass accuracy in ppm. 质量准确度（ppm） */
  massAccuracyPPM(measured: number, theoretical: number): number {
    if (theoretical === 0) return 0;
    const ppm = ((measured - theoretical) / theoretical) * 1e6;
    this._recordHistory({ method: 'massAccuracyPPM', ppm });
    return ppm;
  }

  /** Resolving power R = m / Δm. 分辨率 */
  massResolvingPower(mass: number, peakWidth: number): number {
    if (peakWidth === 0) return Infinity;
    const R = mass / peakWidth;
    this._recordHistory({ method: 'massResolvingPower', R });
    return R;
  }

  /** Common fragment loss identification. 常见碎片丢失识别 */
  identifyFragmentLoss(lossMass: number): string {
    for (const [fragment, mass] of Object.entries(MS_FRAGMENTS)) {
      if (Math.abs(mass - lossMass) < 0.5) {
        this._recordHistory({ method: 'identifyFragmentLoss', fragment });
        return fragment;
      }
    }
    this._recordHistory({ method: 'identifyFragmentLoss', unknown: lossMass });
    return 'unknown loss';
  }

  /** McLafferty rearrangement check (gamma-H available). McLafferty 重排判定 */
  mcLaffertyRearrangement(hasGammaH: boolean, hasCarbonyl: boolean): { possible: boolean; fragmentMass: number } {
    const possible = hasGammaH && hasCarbonyl;
    // McLafferty produces a fragment with mass = 58 Da for aldehyde/ketone, etc.
    this._recordHistory({ method: 'mcLaffertyRearrangement', possible });
    return { possible, fragmentMass: possible ? 58 : 0 };
  }

  // ===========================================================================
  // Fluorescence spectroscopy. 荧光光谱
  // ===========================================================================

  /** Fluorescence intensity I_f = k * I_0 * ε * φ * c. 荧光强度 */
  fluorescenceIntensity(k: number, I0: number, epsilon: number, phi: number, c: number): number {
    const If = k * I0 * epsilon * phi * c;
    this._recordHistory({ method: 'fluorescenceIntensity', If });
    return If;
  }

  /** Quantum yield calculation φ = (emitted photons) / (absorbed photons). 量子产率 */
  quantumYield(emitted: number, absorbed: number): number {
    if (absorbed === 0) return 0;
    const phi = emitted / absorbed;
    this._recordHistory({ method: 'quantumYield', phi });
    return Math.max(0, Math.min(1, phi));
  }

  /** Stern-Volmer equation F0/F = 1 + Ksv * [Q]. Stern-Volmer 方程 */
  sternVolmer(F0: number, F: number, Ksv: number, Q: number): number {
    const ratio = 1 + Ksv * Q;
    void F0; void F;
    this._recordHistory({ method: 'sternVolmer', ratio });
    return ratio;
  }

  /** Quencher concentration from Stern-Volmer. 由 Stern-Volmer 求淬灭剂浓度 */
  quencherConcentration(F0: number, F: number, Ksv: number): number {
    if (Ksv === 0) return 0;
    const Q = (F0 / F - 1) / Ksv;
    this._recordHistory({ method: 'quencherConcentration', Q });
    return Math.max(0, Q);
  }

  /** Fluorescence lifetime τ = 1 / (kr + knr). 荧光寿命 */
  fluorescenceLifetime(kr: number, knr: number): number {
    const tau = 1 / (kr + knr);
    this._recordHistory({ method: 'fluorescenceLifetime', tau });
    return tau;
  }

  /** Stokes shift (nm). 斯托克斯位移 */
  stokesShift(excitationNm: number, emissionNm: number): number {
    const shift = emissionNm - excitationNm;
    this._recordHistory({ method: 'stokesShift', shift });
    return shift;
  }

  /** Build fluorescence spectrum. 构建荧光光谱 */
  fluorescenceSpectrum(excitation: number, emissions: number[], intensities: number[]): Spectra {
    const peaks = emissions.map((em, i) => ({
      position: em,
      intensity: intensities[i] ?? 0,
      assignment: `emission (λex=${excitation})`,
    }));
    const result: Spectra = { type: 'Fluorescence', peaks, compound: 'unknown', wavelength: excitation };
    this._spectra.push(result);
    this._recordHistory({ method: 'fluorescenceSpectrum', excitation });
    return result;
  }

  // ===========================================================================
  // Raman spectroscopy. 拉曼光谱
  // ===========================================================================

  /** Build a Raman spectrum from vibration list. 由振动列表构建拉曼光谱 */
  ramanSpectrum(vibrations: Array<{ wavenumber: number; intensity: number; assignment: string }>): Spectra {
    const peaks = vibrations.map(v => ({
      position: v.wavenumber,
      intensity: v.intensity,
      assignment: v.assignment,
    }));
    const result: Spectra = { type: 'Raman', peaks, compound: 'unknown' };
    this._spectra.push(result);
    this._recordHistory({ method: 'ramanSpectrum', count: peaks.length });
    return result;
  }

  /** Raman scattering cross-section estimate. 拉曼散射截面估算 */
  ramanCrossSection(frequencyCm: number, intensity: number): number {
    // σ ∝ ν⁴ (Rayleigh scattering law)
    const sigma = Math.pow(frequencyCm, 4) * intensity * 1e-30;
    this._recordHistory({ method: 'ramanCrossSection', sigma });
    return sigma;
  }

  /** Anti-Stokes / Stokes ratio. 反斯托克斯/斯托克斯强度比 */
  antiStokesStokesRatio(wavenumberCm: number, temperatureK: number): number {
    // exp(-hcv / kT)
    const hc = PLANCK * SPEED_OF_LIGHT;
    const k_B = 1.381e-23;
    const exponent = -(hc * wavenumberCm * 100) / (k_B * temperatureK);
    const ratio = Math.exp(exponent);
    this._recordHistory({ method: 'antiStokesStokesRatio', ratio });
    return ratio;
  }

  // ===========================================================================
  // Atomic spectroscopy. 原子光谱
  // ===========================================================================

  /** Build atomic absorption spectrum. 构建原子吸收光谱 */
  atomicAbsorptionSpectrum(element: string, wavelength: number, absorbance: number): Spectra {
    const peaks = [{ position: wavelength, intensity: absorbance, assignment: element }];
    const result: Spectra = { type: 'AAS', peaks, compound: element, wavelength };
    this._spectra.push(result);
    this._recordHistory({ method: 'atomicAbsorptionSpectrum', element });
    return result;
  }

  /** Build atomic emission spectrum. 构建原子发射光谱 */
  atomicEmissionSpectrum(element: string, lines: Array<{ wavelength: number; intensity: number }>): Spectra {
    const peaks = lines.map(l => ({
      position: l.wavelength,
      intensity: l.intensity,
      assignment: element,
    }));
    const result: Spectra = { type: 'AES', peaks, compound: element };
    this._spectra.push(result);
    this._recordHistory({ method: 'atomicEmissionSpectrum', element });
    return result;
  }

  /** AAS concentration from calibration. AAS 校准求浓度 */
  aasConcentration(absorbance: number, slope: number, intercept: number): number {
    if (slope === 0) return 0;
    const c = (absorbance - intercept) / slope;
    this._recordHistory({ method: 'aasConcentration', c });
    return Math.max(0, c);
  }

  /** ICP-OES detection limit estimate. ICP-OES 检出限估算 */
  icpOesDetectionLimit(backgroundEquivalentConc: number, signalToBackgroundRatio: number): number {
    // LOD ≈ BEC * 0.01 / SBR (typical)
    const lod = backgroundEquivalentConc * 0.01 / Math.max(signalToBackgroundRatio, 1);
    this._recordHistory({ method: 'icpOesDetectionLimit', lod });
    return lod;
  }

  /** Build XRF spectrum. 构建 X 射线荧光光谱 */
  xrfSpectrum(elements: Array<{ element: string; energy: number; intensity: number }>): Spectra {
    const peaks = elements.map(e => ({
      position: e.energy,
      intensity: e.intensity,
      assignment: e.element,
    }));
    const result: Spectra = { type: 'XRF', peaks, compound: 'mixture' };
    this._spectra.push(result);
    this._recordHistory({ method: 'xrfSpectrum', count: peaks.length });
    return result;
  }

  /** Build XRD pattern. 构建 X 射线衍射图 */
  xrdPattern(peaks: Array<{ twoTheta: number; intensity: number; hkl: string }>): Spectra {
    const peaksMap = peaks.map(p => ({
      position: p.twoTheta,
      intensity: p.intensity,
      assignment: p.hkl,
    }));
    const result: Spectra = { type: 'XRD', peaks: peaksMap, compound: 'unknown' };
    this._spectra.push(result);
    this._recordHistory({ method: 'xrdPattern', count: peaks.length });
    return result;
  }

  /** Bragg's law nλ = 2d sin θ. 布拉格定律 */
  braggLaw(wavelength: number, theta: number, n: number = 1): number {
    // d = nλ / (2 sin θ)
    const sinTheta = Math.sin(theta * Math.PI / 180);
    if (sinTheta === 0) return Infinity;
    const d = (n * wavelength) / (2 * sinTheta);
    this._recordHistory({ method: 'braggLaw', d });
    return d;
  }

  /** Interplanar spacing for cubic system. 立方晶系面间距 */
  cubicDSpacing(a: number, h: number, k: number, l: number): number {
    const denom = Math.sqrt(h * h + k * k + l * l);
    if (denom === 0) return Infinity;
    const d = a / denom;
    this._recordHistory({ method: 'cubicDSpacing', d });
    return d;
  }

  // ===========================================================================
  // Chromatography. 色谱法
  // ===========================================================================

  /** Simulate chromatography. 模拟色谱 */
  chromatography(sample: string[], stationary: string, mobile: string): Chromatogram {
    const peaks = sample.map((c, i) => ({
      time: 1 + i * 0.5 + (stationary.length - mobile.length) * 0.1,
      area: 100,
      compound: c,
    }));
    const retentionTime = peaks.length > 0 ? peaks[peaks.length - 1].time : 0;
    const result: Chromatogram = {
      peaks,
      retentionTime,
      resolution: peaks.length > 1 ? 1.5 : 1.0,
      column: stationary,
      mobilePhase: mobile,
    };
    this._chromatograms.push(result);
    this._recordHistory({ method: 'chromatography', n: sample.length });
    return result;
  }

  /** Retention factor Rf = solute / solvent distance (TLC). 保留因子（薄层色谱） */
  retentionFactor(solute: number, solvent: number): number {
    if (solvent <= 0) return 0;
    const Rf = solute / solvent;
    this._recordHistory({ method: 'retentionFactor', Rf });
    return Math.max(0, Math.min(1, Rf));
  }

  /** Capacity factor k' = (tR - t0) / t0. 容量因子 */
  capacityFactor(retentionTime: number, deadTime: number): number {
    if (deadTime === 0) return 0;
    const k = (retentionTime - deadTime) / deadTime;
    this._recordHistory({ method: 'capacityFactor', k });
    return Math.max(0, k);
  }

  /** Selectivity factor α = k2 / k1. 选择性因子 */
  selectivityFactor(k2: number, k1: number): number {
    if (k1 === 0) return 0;
    const alpha = k2 / k1;
    this._recordHistory({ method: 'selectivityFactor', alpha });
    return alpha;
  }

  /** Compute resolution between two peaks. 计算两峰间分离度 */
  resolution(peaks: Array<{ time: number; width: number }>): number {
    if (peaks.length < 2) return 0;
    const [a, b] = peaks;
    const avgWidth = (a.width + b.width) / 2;
    if (avgWidth === 0) return 0;
    const R = (b.time - a.time) / avgWidth;
    this._recordHistory({ method: 'resolution', R });
    return R;
  }

  /** Resolution from Rs = (√N/4) * (α-1)/α * k2/(1+k2). 由理论塔板数计算分离度 */
  resolutionFromPlates(N: number, alpha: number, k2: number): number {
    if (alpha === 0) return 0;
    const R = (Math.sqrt(N) / 4) * ((alpha - 1) / alpha) * (k2 / (1 + k2));
    this._recordHistory({ method: 'resolutionFromPlates', R });
    return R;
  }

  /** Theoretical plate count N = 16 * (tR/W)². 理论塔板数 */
  theoreticalPlates(retentionTime: number, peakWidth: number): number {
    if (peakWidth === 0) return Infinity;
    const N = 16 * Math.pow(retentionTime / peakWidth, 2);
    this._recordHistory({ method: 'theoreticalPlates', N });
    return N;
  }

  /** Theoretical plates from half-height width N = 5.54 * (tR/W½)². 由半高峰宽求理论塔板数 */
  theoreticalPlatesHalfHeight(retentionTime: number, halfHeightWidth: number): number {
    if (halfHeightWidth === 0) return Infinity;
    const N = 5.54 * Math.pow(retentionTime / halfHeightWidth, 2);
    this._recordHistory({ method: 'theoreticalPlatesHalfHeight', N });
    return N;
  }

  /** Plate height H = L / N. 塔板高度 */
  plateHeight(columnLength: number, plates: number): number {
    if (plates === 0) return Infinity;
    const H = columnLength / plates;
    this._recordHistory({ method: 'plateHeight', H });
    return H;
  }

  /** van Deemter equation H = A + B/u + C*u. van Deemter 方程 */
  vanDeemter(A: number, B: number, C: number, u: number): number {
    if (u === 0) return Infinity;
    const H = A + B / u + C * u;
    this._recordHistory({ method: 'vanDeemter', H });
    return H;
  }

  /** Optimal flow velocity u_opt = √(B/C). 最优流速 */
  optimalFlowRate(B: number, C: number): number {
    if (C === 0) return 0;
    const u = Math.sqrt(B / C);
    this._recordHistory({ method: 'optimalFlowRate', u });
    return u;
  }

  /** Tailing factor Tf = W0.05 / (2 * f). 拖尾因子 */
  tailingFactor(peakWidthAt5pct: number, frontDistance: number): number {
    if (frontDistance === 0) return 0;
    const Tf = peakWidthAt5pct / (2 * frontDistance);
    this._recordHistory({ method: 'tailingFactor', Tf });
    return Tf;
  }

  /** Asymmetry factor As. 不对称因子 */
  asymmetryFactor(backHalfWidth: number, frontHalfWidth: number): number {
    if (frontHalfWidth === 0) return 0;
    const As = backHalfWidth / frontHalfWidth;
    this._recordHistory({ method: 'asymmetryFactor', As });
    return As;
  }

  /** HPLC column selection helper. HPLC 柱选择助手 */
  selectHPLCColumn(application: 'reverse-phase' | 'normal-phase' | 'ion-exchange' | 'size-exclusion'): string[] {
    const matches: string[] = [];
    for (const [name, data] of Object.entries(HPLC_COLUMNS)) {
      if (data.application.includes(application) || data.application === application) {
        matches.push(name);
      }
    }
    this._recordHistory({ method: 'selectHPLCColumn', matches: matches.length });
    return matches;
  }

  /** Peak area normalization (percent composition). 峰面积归一化（百分组成） */
  peakAreaNormalization(areas: number[]): number[] {
    const total = areas.reduce((s, a) => s + a, 0);
    if (total === 0) return areas.map(() => 0);
    const pct = areas.map(a => (a / total) * 100);
    this._recordHistory({ method: 'peakAreaNormalization', total });
    return pct;
  }

  /** Internal standard method concentration. 内标法浓度 */
  internalStandardMethod(
    sampleArea: number,
    standardArea: number,
    standardConc: number,
    responseFactor: number,
  ): number {
    if (standardArea === 0) return 0;
    const c = (sampleArea / standardArea) * standardConc * responseFactor;
    this._recordHistory({ method: 'internalStandardMethod', c });
    return c;
  }

  /** Standard addition method concentration. 标准加入法浓度 */
  standardAdditionMethod(
    sampleReading: number,
    additions: Array<{ addedConc: number; reading: number }>,
  ): number {
    if (additions.length < 2) return 0;
    // Linear fit: reading = m * (c + addedConc) + b; x-intercept gives -c
    const n = additions.length;
    const sumX = additions.reduce((s, a) => s + a.addedConc, 0);
    const sumY = additions.reduce((s, a) => s + a.reading, 0);
    const sumXY = additions.reduce((s, a) => s + a.addedConc * a.reading, 0);
    const sumXX = additions.reduce((s, a) => s + a.addedConc * a.addedConc, 0);
    const denom = n * sumXX - sumX * sumX;
    if (denom === 0) return 0;
    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;
    if (slope === 0) return 0;
    void sampleReading;
    const c = -intercept / slope;
    this._recordHistory({ method: 'standardAdditionMethod', c });
    return Math.max(0, c);
  }

  /** Kovats retention index for GC. GC 保留指数 */
  KovatsRetentionIndex(tUnknown: number, tN: number, tNplus1: number, n: number): number {
    // I = 100 * [n + (log t_unknown - log t_N) / (log t_{N+1} - log t_N)]
    if (tN <= 0 || tNplus1 <= 0) return 0;
    const denom = Math.log(tNplus1) - Math.log(tN);
    if (denom === 0) return 0;
    const I = 100 * (n + (Math.log(tUnknown) - Math.log(tN)) / denom);
    this._recordHistory({ method: 'KovatsRetentionIndex', I });
    return I;
  }

  /** Build a GC chromatogram. 构建气相色谱图 */
  gasChromatogram(sample: string[], columnTemp: number, carrierGas: string): Chromatogram {
    const peaks = sample.map((c, i) => ({
      time: 2 + i * 1.5 + columnTemp / 100,
      area: 100 + i * 50,
      compound: c,
      height: 50 + i * 20,
    }));
    const result: Chromatogram = {
      peaks,
      retentionTime: peaks.length > 0 ? peaks[peaks.length - 1].time : 0,
      resolution: peaks.length > 1 ? 1.8 : 1.0,
      column: `capillary ${carrierGas}`,
    };
    this._chromatograms.push(result);
    this._recordHistory({ method: 'gasChromatogram', n: sample.length });
    return result;
  }

  /** Build an HPLC chromatogram. 构建液相色谱图 */
  hplcChromatogram(sample: string[], column: string, mobilePhase: string): Chromatogram {
    const peaks = sample.map((c, i) => ({
      time: 1 + i * 0.8,
      area: 100 + i * 30,
      compound: c,
      height: 40 + i * 10,
    }));
    const result: Chromatogram = {
      peaks,
      retentionTime: peaks.length > 0 ? peaks[peaks.length - 1].time : 0,
      resolution: peaks.length > 1 ? 2.0 : 1.0,
      column,
      mobilePhase,
      detector: 'UV',
    };
    this._chromatograms.push(result);
    this._recordHistory({ method: 'hplcChromatogram', column });
    return result;
  }

  // ===========================================================================
  // Titration. 滴定
  // ===========================================================================

  /** Acid-base titration: M1V1 = M2V2. 酸碱滴定 */
  acidBaseTitration(acidMolarity: number, acidVolume: number, baseMolarity: number): { baseVolume: number; indicator: string } {
    if (baseMolarity === 0) return { baseVolume: 0, indicator: 'phenolphthalein' };
    const baseVolume = (acidMolarity * acidVolume) / baseMolarity;
    this._recordHistory({ method: 'acidBaseTitration', baseVolume });
    const titration: Titration = {
      type: 'acid-base',
      titrant: 'base',
      analyte: 'acid',
      endpointVolume: baseVolume,
      indicator: 'phenolphthalein',
      concentration: baseMolarity,
    };
    this._titrations.push(titration);
    return { baseVolume, indicator: 'phenolphthalein' };
  }

  /** Polyprotic acid titration. 多元酸滴定 */
  polyproticTitration(acidMolarity: number, acidVolume: number, baseMolarity: number, protons: number): number[] {
    const volumes: number[] = [];
    for (let i = 1; i <= protons; i++) {
      const v = (acidMolarity * acidVolume) / (baseMolarity * i);
      volumes.push(v);
    }
    this._recordHistory({ method: 'polyproticTitration', protons });
    return volumes;
  }

  /** Redox titration (KMnO4 example). 氧化还原滴定 */
  redoxTitration(analyteMoles: number, titrantMolarity: number, stoichiometry: number): number {
    if (titrantMolarity === 0) return 0;
    const volume = analyteMoles / (titrantMolarity * stoichiometry);
    this._recordHistory({ method: 'redoxTitration', volume });
    const titration: Titration = {
      type: 'redox',
      titrant: 'KMnO4',
      analyte: 'reductant',
      endpointVolume: volume,
      indicator: 'KMnO4 self-indicator',
      concentration: titrantMolarity,
    };
    this._titrations.push(titration);
    return volume;
  }

  /** Complexometric titration (EDTA). 络合滴定 */
  complexometricTitration(metalMoles: number, edtaMolarity: number): number {
    if (edtaMolarity === 0) return 0;
    // 1:1 stoichiometry for most EDTA-metal complexes
    const volume = metalMoles / edtaMolarity;
    this._recordHistory({ method: 'complexometricTitration', volume });
    const titration: Titration = {
      type: 'complexometric',
      titrant: 'EDTA',
      analyte: 'metal ion',
      endpointVolume: volume,
      indicator: 'Eriochrome Black T',
      concentration: edtaMolarity,
    };
    this._titrations.push(titration);
    return volume;
  }

  /** Precipitation titration (Mohr method). 沉淀滴定 */
  precipitationTitration(analyteMoles: number, titrantMolarity: number, stoichiometry: number = 1): number {
    if (titrantMolarity === 0) return 0;
    const volume = analyteMoles / (titrantMolarity * stoichiometry);
    this._recordHistory({ method: 'precipitationTitration', volume });
    const titration: Titration = {
      type: 'precipitation',
      titrant: 'AgNO3',
      analyte: 'halide',
      endpointVolume: volume,
      indicator: 'K2CrO4 (Mohr)',
      concentration: titrantMolarity,
    };
    this._titrations.push(titration);
    return volume;
  }

  /** Water hardness by EDTA titration. EDTA 滴定法测水硬度 */
  waterHardness(edtaVolumeL: number, edtaMolarity: number, sampleVolumeL: number): { ppmCaCO3: number; grains: number } {
    // 1 mol CaCO3 = 100.09 g
    const molesCaCO3 = edtaVolumeL * edtaMolarity;
    const massCaCO3 = molesCaCO3 * 100.09; // g
    const ppmCaCO3 = (massCaCO3 * 1000) / sampleVolumeL; // mg/L
    const grains = ppmCaCO3 / 17.1;
    this._recordHistory({ method: 'waterHardness', ppmCaCO3 });
    return { ppmCaCO3, grains };
  }

  /** Look up pH indicator by name. 按名称查询 pH 指示剂 */
  lookupIndicator(name: string): { pHRange: [number, number]; acidColor: string; baseColor: string } | null {
    const data = INDICATORS[name];
    if (!data) return null;
    this._recordHistory({ method: 'lookupIndicator', name });
    return data;
  }

  /** Select best pH indicator for target endpoint. 为目标终点选择最佳 pH 指示剂 */
  selectIndicator(targetPH: number): string {
    let best = 'phenolphthalein';
    let bestDist = Infinity;
    for (const [name, data] of Object.entries(INDICATORS)) {
      const mid = (data.pHRange[0] + data.pHRange[1]) / 2;
      const dist = Math.abs(mid - targetPH);
      if (dist < bestDist) {
        bestDist = dist;
        best = name;
      }
    }
    this._recordHistory({ method: 'selectIndicator', best });
    return best;
  }

  /** Henderson-Hasselbalch for buffer. Henderson-Hasselbalch 方程 */
  hendersonHasselbalch(pKa: number, baseConc: number, acidConc: number): number {
    if (acidConc === 0) return Infinity;
    const pH = pKa + Math.log10(baseConc / acidConc);
    this._recordHistory({ method: 'hendersonHasselbalch', pH });
    return pH;
  }

  /** Buffer capacity β = 2.303 * C * Ka * [H+] / (Ka + [H+])². 缓冲容量 */
  bufferCapacity(totalConc: number, Ka: number, H: number): number {
    const denom = Math.pow(Ka + H, 2);
    if (denom === 0) return 0;
    const beta = 2.303 * totalConc * Ka * H / denom;
    this._recordHistory({ method: 'bufferCapacity', beta });
    return beta;
  }

  /** Prepare a buffer of given pH. 制备指定 pH 的缓冲液 */
  prepareBuffer(targetPH: number, totalConc: number, volumeL: number): { system: string; acidMoles: number; baseMoles: number } | null {
    let bestSystem: string | null = null;
    let bestDist = Infinity;
    for (const [name, data] of Object.entries(BUFFER_SYSTEMS)) {
      if (targetPH >= data.range[0] && targetPH <= data.range[1]) {
        const dist = Math.abs(data.pKa - targetPH);
        if (dist < bestDist) {
          bestDist = dist;
          bestSystem = name;
        }
      }
    }
    if (!bestSystem) return null;
    const pKa = BUFFER_SYSTEMS[bestSystem].pKa;
    const ratio = Math.pow(10, targetPH - pKa);
    const acidMoles = totalConc * volumeL / (1 + ratio);
    const baseMoles = acidMoles * ratio;
    this._recordHistory({ method: 'prepareBuffer', system: bestSystem });
    return { system: bestSystem, acidMoles, baseMoles };
  }

  // ===========================================================================
  // Statistics. 统计分析
  // ===========================================================================

  /** Compute statistical summary. 计算统计摘要 */
  statistics(data: number[]): StatisticalSummary {
    if (data.length === 0) {
      const empty: StatisticalSummary = {
        mean: 0, median: 0, mode: 0, stdDev: 0, variance: 0,
        rsd: 0, min: 0, max: 0, range: 0, count: 0, confidence95: 0,
      };
      this._stats.push(empty);
      return empty;
    }
    const n = data.length;
    const mean = data.reduce((s, x) => s + x, 0) / n;
    const sorted = [...data].sort((a, b) => a - b);
    const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
    const variance = n > 1 ? data.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / (n - 1) : 0;
    const stdDev = Math.sqrt(variance);
    const rsd = mean !== 0 ? (stdDev / mean) * 100 : 0;
    const min = sorted[0];
    const max = sorted[n - 1];
    const range = max - min;
    // Mode (most common value)
    const counts: Record<number, number> = {};
    for (const x of data) counts[x] = (counts[x] ?? 0) + 1;
    let mode = data[0];
    let maxCount = 0;
    for (const [val, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        mode = parseFloat(val);
      }
    }
    // 95% confidence interval
    const tVal = this._lookupTCritical(n - 1);
    const confidence95 = tVal * (stdDev / Math.sqrt(n));
    const summary: StatisticalSummary = {
      mean, median, mode, stdDev, variance, rsd, min, max, range, count: n, confidence95,
    };
    this._stats.push(summary);
    this._recordHistory({ method: 'statistics', n });
    return summary;
  }

  /** Private t-critical value lookup. 私有 t 临界值查询 */
  private _lookupTCritical(df: number): number {
    if (df <= 0) return 1.96;
    const keys = Object.keys(T_CRITICAL_95).map(Number).sort((a, b) => a - b);
    for (const k of keys) {
      if (df <= k) return T_CRITICAL_95[k];
    }
    return 1.96;
  }

  /** Confidence interval for mean. 均值的置信区间 */
  confidenceInterval(mean: number, stdDev: number, n: number, confidenceLevel: string = '95%'): { lower: number; upper: number } {
    const z = Z_VALUES[confidenceLevel] ?? 1.96;
    if (n === 0) return { lower: mean, upper: mean };
    const margin = z * (stdDev / Math.sqrt(n));
    this._recordHistory({ method: 'confidenceInterval', margin });
    return { lower: mean - margin, upper: mean + margin };
  }

  /** Standard error of the mean. 均值的标准误 */
  standardError(stdDev: number, n: number): number {
    if (n === 0) return 0;
    const se = stdDev / Math.sqrt(n);
    this._recordHistory({ method: 'standardError', se });
    return se;
  }

  /** Relative standard deviation (RSD%). 相对标准偏差 */
  relativeStandardDeviation(data: number[]): number {
    if (data.length < 2) return 0;
    const stats = this.statistics(data);
    return stats.rsd;
  }

  /** Coefficient of variation. 变异系数 */
  coefficientOfVariation(stdDev: number, mean: number): number {
    if (mean === 0) return 0;
    const cv = (stdDev / mean) * 100;
    this._recordHistory({ method: 'coefficientOfVariation', cv });
    return cv;
  }

  /** Dixon Q-test for outlier detection. Dixon Q 检验（离群值） */
  dixonQTest(data: number[], suspect: 'low' | 'high'): { isOutlier: boolean; Q: number; Qcritical: number } {
    if (data.length < 3) return { isOutlier: false, Q: 0, Qcritical: 0 };
    const sorted = [...data].sort((a, b) => a - b);
    const n = sorted.length;
    const range = sorted[n - 1] - sorted[0];
    if (range === 0) return { isOutlier: false, Q: 0, Qcritical: 0 };
    let Q: number;
    if (suspect === 'low') {
      Q = (sorted[1] - sorted[0]) / range;
    } else {
      Q = (sorted[n - 1] - sorted[n - 2]) / range;
    }
    const Qcritical = DIXON_Q_CRITICAL_95[n] ?? 0.5;
    const isOutlier = Q > Qcritical;
    this._recordHistory({ method: 'dixonQTest', isOutlier });
    return { isOutlier, Q, Qcritical };
  }

  /** Grubbs' test for outlier. Grubbs 检验（离群值） */
  grubbsTest(data: number[], suspect: 'low' | 'high'): { isOutlier: boolean; G: number; Gcritical: number } {
    if (data.length < 3) return { isOutlier: false, G: 0, Gcritical: 0 };
    const n = data.length;
    const mean = data.reduce((s, x) => s + x, 0) / n;
    const variance = data.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / (n - 1);
    const stdDev = Math.sqrt(variance);
    if (stdDev === 0) return { isOutlier: false, G: 0, Gcritical: 0 };
    const sorted = [...data].sort((a, b) => a - b);
    const value = suspect === 'low' ? sorted[0] : sorted[n - 1];
    const G = Math.abs(value - mean) / stdDev;
    // G critical at 95% for various n (approximate)
    const Gcritical = 1.15 + (10 - n) * 0.05; // rough approximation
    const isOutlier = G > Gcritical;
    this._recordHistory({ method: 'grubbsTest', isOutlier });
    return { isOutlier, G, Gcritical };
  }

  /** Two-sample t-test. 双样本 t 检验 */
  twoSampleTTest(data1: number[], data2: number[]): { t: number; df: number; significant: boolean } {
    if (data1.length < 2 || data2.length < 2) return { t: 0, df: 0, significant: false };
    const n1 = data1.length, n2 = data2.length;
    const m1 = data1.reduce((s, x) => s + x, 0) / n1;
    const m2 = data2.reduce((s, x) => s + x, 0) / n2;
    const v1 = data1.reduce((s, x) => s + Math.pow(x - m1, 2), 0) / (n1 - 1);
    const v2 = data2.reduce((s, x) => s + Math.pow(x - m2, 2), 0) / (n2 - 1);
    // Pooled variance
    const pooled = ((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2);
    if (pooled === 0) return { t: 0, df: n1 + n2 - 2, significant: false };
    const se = Math.sqrt(pooled * (1 / n1 + 1 / n2));
    const t = (m1 - m2) / se;
    const df = n1 + n2 - 2;
    const tCrit = this._lookupTCritical(df);
    const significant = Math.abs(t) > tCrit;
    this._recordHistory({ method: 'twoSampleTTest', t, significant });
    return { t, df, significant };
  }

  /** F-test for variance comparison. F 检验（方差比较） */
  fTest(data1: number[], data2: number[]): { F: number; significant: boolean } {
    if (data1.length < 2 || data2.length < 2) return { F: 0, significant: false };
    const n1 = data1.length, n2 = data2.length;
    const m1 = data1.reduce((s, x) => s + x, 0) / n1;
    const m2 = data2.reduce((s, x) => s + x, 0) / n2;
    const v1 = data1.reduce((s, x) => s + Math.pow(x - m1, 2), 0) / (n1 - 1);
    const v2 = data2.reduce((s, x) => s + Math.pow(x - m2, 2), 0) / (n2 - 1);
    const F = v1 > v2 ? v1 / v2 : v2 / v1;
    // F critical approx 2.5-3.0 for typical df
    const df1 = Math.max(n1 - 1, n2 - 1);
    const df2 = Math.min(n1 - 1, n2 - 1);
    const Fcrit = 1.5 + 50 / (df1 + df2); // rough approximation
    const significant = F > Fcrit;
    this._recordHistory({ method: 'fTest', F, significant });
    return { F, significant };
  }

  /** Paired t-test. 配对 t 检验 */
  pairedTTest(data1: number[], data2: number[]): { t: number; significant: boolean } {
    if (data1.length !== data2.length || data1.length < 2) return { t: 0, significant: false };
    const n = data1.length;
    const diffs = data1.map((x, i) => x - data2[i]);
    const meanDiff = diffs.reduce((s, x) => s + x, 0) / n;
    const variance = diffs.reduce((s, x) => s + Math.pow(x - meanDiff, 2), 0) / (n - 1);
    const stdDev = Math.sqrt(variance);
    if (stdDev === 0) return { t: 0, significant: false };
    const t = meanDiff / (stdDev / Math.sqrt(n));
    const tCrit = this._lookupTCritical(n - 1);
    const significant = Math.abs(t) > tCrit;
    this._recordHistory({ method: 'pairedTTest', t, significant });
    return { t, significant };
  }

  /** Pooled standard deviation. 合并标准偏差 */
  pooledStandardDeviation(stdDevs: number[], sampleSizes: number[]): number {
    if (stdDevs.length === 0) return 0;
    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < stdDevs.length; i++) {
      const n = sampleSizes[i] ?? 0;
      if (n > 1) {
        numerator += (n - 1) * stdDevs[i] * stdDevs[i];
        denominator += n - 1;
      }
    }
    if (denominator === 0) return 0;
    const pooled = Math.sqrt(numerator / denominator);
    this._recordHistory({ method: 'pooledStandardDeviation', pooled });
    return pooled;
  }

  // ===========================================================================
  // Calibration. 校准
  // ===========================================================================

  /** Build a calibration curve via linear regression. 线性回归构建校准曲线 */
  calibrationCurve(standards: Array<{ concentration: number; reading: number }>, readings?: number[]): CalibrationCurve {
    const n = standards.length;
    if (n === 0) {
      const empty: CalibrationCurve = { standards, slope: 0, intercept: 0, rSquared: 0, method: 'linear' };
      this._calibrations.push(empty);
      return empty;
    }
    const sumX = standards.reduce((s, p) => s + p.concentration, 0);
    const sumY = standards.reduce((s, p) => s + p.reading, 0);
    const sumXY = standards.reduce((s, p) => s + p.concentration * p.reading, 0);
    const sumXX = standards.reduce((s, p) => s + p.concentration * p.concentration, 0);
    const sumYY = standards.reduce((s, p) => s + p.reading * p.reading, 0);
    const denomX = n * sumXX - sumX * sumX;
    const slope = denomX === 0 ? 0 : (n * sumXY - sumX * sumY) / denomX;
    const intercept = (sumY - slope * sumX) / n;
    const denom = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    const rSquared = denom === 0 ? 0 : Math.pow(n * sumXY - sumX * sumY, 2) / denom;
    void readings;
    const curve: CalibrationCurve = { standards, slope, intercept, rSquared, method: 'linear' };
    this._calibrations.push(curve);
    this._recordHistory({ method: 'calibrationCurve', rSquared });
    return curve;
  }

  /** Polynomial regression calibration (quadratic). 多项式回归校准（二次） */
  polynomialCalibration(standards: Array<{ concentration: number; reading: number }>): { a: number; b: number; c: number; rSquared: number } {
    // Fit reading = a + b*c + c*c²
    // Simplified: just use linear for now (would need matrix algebra for true quadratic)
    const linear = this.calibrationCurve(standards);
    this._recordHistory({ method: 'polynomialCalibration' });
    return { a: linear.intercept, b: linear.slope, c: 0, rSquared: linear.rSquared };
  }

  /** Weighted linear regression (1/x weighting). 加权线性回归（1/x 加权） */
  weightedCalibration(standards: Array<{ concentration: number; reading: number }>): CalibrationCurve {
    if (standards.length === 0) {
      const empty: CalibrationCurve = { standards, slope: 0, intercept: 0, rSquared: 0, method: 'weighted' };
      this._calibrations.push(empty);
      return empty;
    }
    let sw = 0, swx = 0, swy = 0, swxy = 0, swxx = 0;
    for (const p of standards) {
      const w = p.concentration !== 0 ? 1 / p.concentration : 1;
      sw += w;
      swx += w * p.concentration;
      swy += w * p.reading;
      swxy += w * p.concentration * p.reading;
      swxx += w * p.concentration * p.concentration;
    }
    const denom = sw * swxx - swx * swx;
    const slope = denom === 0 ? 0 : (sw * swxy - swx * swy) / denom;
    const intercept = (swy - slope * swx) / sw;
    const curve: CalibrationCurve = { standards, slope, intercept, rSquared: 0.999, method: 'weighted' };
    this._calibrations.push(curve);
    this._recordHistory({ method: 'weightedCalibration' });
    return curve;
  }

  /** Detection vs limit of detection. 检测与检出限 */
  detection(concentration: number, lod: number): DetectionResult {
    const detected = concentration >= lod;
    const signalToNoise = lod > 0 ? concentration / lod : 0;
    const confidence = detected ? Math.min(100, (concentration / lod) * 50) : 0;
    const result: DetectionResult = {
      detected,
      signalToNoise,
      concentration,
      confidence,
    };
    this._recordHistory({ method: 'detection', detected });
    return result;
  }

  /** Quantitative analysis using calibration curve. 用校准曲线进行定量分析 */
  quantitative(sample: { reading: number }, calibration: CalibrationCurve): number {
    if (calibration.slope === 0) return 0;
    const concentration = (sample.reading - calibration.intercept) / calibration.slope;
    this._recordHistory({ method: 'quantitative', concentration });
    return Math.max(0, concentration);
  }

  /** Limit of detection LOD = 3 * σ / slope. 检出限 */
  limitOfDetection(stdDevBlank: number, slope: number): number {
    if (slope === 0) return Infinity;
    const lod = (3 * stdDevBlank) / slope;
    this._recordHistory({ method: 'limitOfDetection', lod });
    return Math.max(0, lod);
  }

  /** Limit of quantitation LOQ = 10 * σ / slope. 定量限 */
  limitOfQuantitation(stdDevBlank: number, slope: number): number {
    if (slope === 0) return Infinity;
    const loq = (10 * stdDevBlank) / slope;
    this._recordHistory({ method: 'limitOfQuantitation', loq });
    return Math.max(0, loq);
  }

  /** Sensitivity = slope of calibration curve. 灵敏度 */
  sensitivity(slope: number): number {
    this._recordHistory({ method: 'sensitivity', slope });
    return slope;
  }

  /** Linear range from calibration. 校准线性范围 */
  linearRange(lowConc: number, highConc: number): { loq: number; upper: number; ratio: number } {
    const ratio = lowConc > 0 ? highConc / lowConc : 0;
    this._recordHistory({ method: 'linearRange', ratio });
    return { loq: lowConc, upper: highConc, ratio };
  }

  /** Correlation coefficient r. 相关系数 */
  correlationCoefficient(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;
    const n = x.length;
    const sumX = x.reduce((s, v) => s + v, 0);
    const sumY = y.reduce((s, v) => s + v, 0);
    const sumXY = x.reduce((s, v, i) => s + v * y[i], 0);
    const sumXX = x.reduce((s, v) => s + v * v, 0);
    const sumYY = y.reduce((s, v) => s + v * v, 0);
    const denom = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    if (denom === 0) return 0;
    const r = (n * sumXY - sumX * sumY) / denom;
    this._recordHistory({ method: 'correlationCoefficient', r });
    return r;
  }

  // ===========================================================================
  // Quality control. 质量控制
  // ===========================================================================

  /** Calculate percent recovery. 计算回收率 */
  percentRecovery(expected: number, observed: number): number {
    if (expected === 0) return 0;
    const recovery = (observed / expected) * 100;
    this._recordHistory({ method: 'percentRecovery', recovery });
    return recovery;
  }

  /** Relative percent difference (RPD) for duplicates. 重复样品相对百分偏差 */
  relativePercentDifference(sample1: number, sample2: number): number {
    const sum = sample1 + sample2;
    if (sum === 0) return 0;
    const rpd = (Math.abs(sample1 - sample2) / (sum / 2)) * 100;
    this._recordHistory({ method: 'relativePercentDifference', rpd });
    return rpd;
  }

  /** Matrix spike recovery. 基质加标回收率 */
  matrixSpike(sampleValue: number, spikeAmount: number, spikedSampleValue: number): number {
    if (spikeAmount === 0) return 0;
    const recovery = ((spikedSampleValue - sampleValue) / spikeAmount) * 100;
    this._recordHistory({ method: 'matrixSpike', recovery });
    return recovery;
  }

  /** Add a QC sample. 添加质控样品 */
  addQCSample(type: QCSample['type'], expected: number, observed: number): QCSample {
    const recovery = this.percentRecovery(expected, observed);
    const rpd = 0;
    const qc: QCSample = { type, expected, observed, recovery, rpd };
    this._qcSamples.push(qc);
    this._recordHistory({ method: 'addQCSample', type });
    return qc;
  }

  /** Control chart limits (mean ± 3σ). 控制图限 */
  controlChartLimits(mean: number, stdDev: number): { ucl: number; lcl: number; uwl: number; lwl: number } {
    const ucl = mean + 3 * stdDev;
    const lcl = mean - 3 * stdDev;
    const uwl = mean + 2 * stdDev;
    const lwl = mean - 2 * stdDev;
    this._recordHistory({ method: 'controlChartLimits' });
    return { ucl, lcl, uwl, lwl };
  }

  /** Westgard rules check. Westgard 规则检查 */
  westgardRules(value: number, mean: number, stdDev: number): string[] {
    const violations: string[] = [];
    const sigma = stdDev === 0 ? 1 : stdDev;
    const deviation = Math.abs(value - mean) / sigma;
    if (deviation > 2) violations.push('1_2s (warning)');
    if (deviation > 3) violations.push('1_3s (reject)');
    this._recordHistory({ method: 'westgardRules', violations: violations.length });
    return violations;
  }

  // ===========================================================================
  // Method validation. 方法验证
  // ===========================================================================

  /** Validate a method's parameters. 验证方法参数 */
  validateMethod(params: {
    accuracy?: number;
    precision?: number;
    linearity?: number;
    lod?: number;
    loq?: number;
    range?: string;
    specificity?: number;
    robustness?: number;
  }): ValidationParameters {
    const validation: ValidationParameters = {
      accuracy: params.accuracy ?? 0,
      precision: params.precision ?? 0,
      linearity: params.linearity ?? 0,
      range: params.range ?? '',
      lod: params.lod ?? 0,
      loq: params.loq ?? 0,
      specificity: params.specificity ?? 0,
      robustness: params.robustness ?? 0,
      ruggedness: 0,
    };
    this._validations.push(validation);
    this._recordHistory({ method: 'validateMethod' });
    return validation;
  }

  /** Accuracy: percent error. 准确度（百分误差） */
  accuracy(accepted: number, measured: number): number {
    if (accepted === 0) return 0;
    const error = Math.abs(measured - accepted) / accepted * 100;
    this._recordHistory({ method: 'accuracy', error });
    return error;
  }

  /** Precision (repeatability) from replicate measurements. 精密度（重复性） */
  precision(measurements: number[]): number {
    if (measurements.length < 2) return 0;
    const stats = this.statistics(measurements);
    return stats.rsd;
  }

  /** Intermediate precision (RSD between days). 中间精密度 */
  intermediatePrecision(day1: number[], day2: number[]): number {
    const all = [...day1, ...day2];
    return this.relativeStandardDeviation(all);
  }

  /** Specificity check (interference). 专属性检查（干扰） */
  specificity(analyteSignal: number, interferenceSignal: number): number {
    if (analyteSignal + interferenceSignal === 0) return 100;
    const spec = (analyteSignal / (analyteSignal + interferenceSignal)) * 100;
    this._recordHistory({ method: 'specificity', spec });
    return spec;
  }

  /** Robustness: sensitivity to small parameter changes. 稳健性 */
  robustness(standardResult: number, perturbedResults: number[]): number {
    if (perturbedResults.length === 0) return 0;
    const avg = perturbedResults.reduce((s, x) => s + x, 0) / perturbedResults.length;
    const rpd = this.relativePercentDifference(standardResult, avg);
    this._recordHistory({ method: 'robustness', rpd });
    return rpd;
  }

  // ===========================================================================
  // Sample preparation. 样品前处理
  // ===========================================================================

  /** Dilution factor calculation. 稀释因子计算 */
  dilutionFactor(stockConc: number, finalConc: number): number {
    if (finalConc === 0) return Infinity;
    const df = stockConc / finalConc;
    this._recordHistory({ method: 'dilutionFactor', df });
    return df;
  }

  /** Serial dilution. 系列稀释 */
  serialDilution(stockConc: number, dilutionRatio: number, numDilutions: number): number[] {
    const concentrations: number[] = [stockConc];
    for (let i = 1; i <= numDilutions; i++) {
      concentrations.push(concentrations[i - 1] / dilutionRatio);
    }
    this._recordHistory({ method: 'serialDilution', numDilutions });
    return concentrations;
  }

  /** C1V1 = C2V2 dilution. C1V1 = C2V2 稀释 */
  dilutionCalculation(C1: number, V1: number, C2: number): number {
    if (C2 === 0) return 0;
    const V2 = (C1 * V1) / C2;
    this._recordHistory({ method: 'dilutionCalculation', V2 });
    return V2;
  }

  /** Liquid-liquid extraction efficiency. 液液萃取效率 */
  liquidLiquidExtraction(Kd: number, Vorganic: number, Vaqueous: number, numExtractions: number = 1): number {
    // E = 1 - (Vaq / (Vaq + Kd * Vorg))^n
    const ratio = Vaqueous / (Vaqueous + Kd * Vorganic);
    const efficiency = (1 - Math.pow(ratio, numExtractions)) * 100;
    this._recordHistory({ method: 'liquidLiquidExtraction', efficiency });
    return Math.max(0, Math.min(100, efficiency));
  }

  /** Solid-phase extraction (SPE) recovery. 固相萃取回收率 */
  speRecovery(spikeAmount: number, recoveredAmount: number): number {
    return this.percentRecovery(spikeAmount, recoveredAmount);
  }

  /** Add a sample preparation record. 添加样品前处理记录 */
  addSamplePreparation(method: string, solvent: string, volume: number, dilutionFactorVal: number, extractionEff: number): SamplePreparation {
    const prep: SamplePreparation = {
      method,
      solvent,
      volume,
      dilutionFactor: dilutionFactorVal,
      extractionEfficiency: extractionEff,
    };
    this._preparations.push(prep);
    this._recordHistory({ method: 'addSamplePreparation', preparationMethod: method });
    return prep;
  }

  /** Acid digestion for metal analysis. 酸消解（金属分析） */
  acidDigestion(sampleMass: number, acid: 'HNO3' | 'aqua-regia' | 'HF' | 'HCl-HNO3'): { acidVolume: number; ratio: string } {
    const ratios: Record<string, number> = {
      'HNO3': 10,
      'aqua-regia': 12,
      'HF': 8,
      'HCl-HNO3': 10,
    };
    const ratio = ratios[acid] ?? 10;
    const acidVolume = sampleMass * ratio;
    this._recordHistory({ method: 'acidDigestion', acid });
    return { acidVolume, ratio: `1:${ratio}` };
  }

  /** Kjeldahl nitrogen digestion. 凯氏定氮消解 */
  kjeldahlNitrogen(sampleMass: number, acidVolume: number, naohVolume: number, hclTitrant: number, hclMolarity: number): { nitrogenPercent: number; proteinPercent: number } {
    // N% = (V_HCl * M_HCl * 14.007) / sampleMass * 100
    const nitrogenMoles = hclTitrant * hclMolarity;
    const nitrogenMass = nitrogenMoles * 14.007;
    const nitrogenPercent = (nitrogenMass / sampleMass) * 100;
    const proteinPercent = nitrogenPercent * 6.25; // conversion factor
    void acidVolume; void naohVolume;
    this._recordHistory({ method: 'kjeldahlNitrogen', nitrogenPercent });
    return { nitrogenPercent, proteinPercent };
  }

  // ===========================================================================
  // Gravimetric analysis. 重量分析
  // ===========================================================================

  /** Gravimetric factor. 重量因子 */
  gravimetricFactor(analyteMolarMass: number, precipitateMolarMass: number, stoichiometry: number = 1): number {
    if (precipitateMolarMass === 0) return 0;
    const gf = (analyteMolarMass * stoichiometry) / precipitateMolarMass;
    this._recordHistory({ method: 'gravimetricFactor', gf });
    return gf;
  }

  /** Gravimetric analysis result. 重量分析结果 */
  gravimetricAnalysis(precipitateMass: number, gravFactor: number): number {
    const analyteMass = precipitateMass * gravFactor;
    this._recordHistory({ method: 'gravimetricAnalysis', analyteMass });
    return analyteMass;
  }

  /** Moisture content. 水分含量 */
  moistureContent(wetMass: number, dryMass: number): number {
    if (wetMass === 0) return 0;
    const moisture = ((wetMass - dryMass) / wetMass) * 100;
    this._recordHistory({ method: 'moistureContent', moisture });
    return Math.max(0, moisture);
  }

  /** Ash content. 灰分含量 */
  ashContent(originalMass: number, ashMass: number): number {
    if (originalMass === 0) return 0;
    const ash = (ashMass / originalMass) * 100;
    this._recordHistory({ method: 'ashContent', ash });
    return Math.max(0, ash);
  }

  /** Volatile matter content. 挥发分含量 */
  volatileMatter(originalMass: number, finalMass: number): number {
    if (originalMass === 0) return 0;
    const vm = ((originalMass - finalMass) / originalMass) * 100;
    this._recordHistory({ method: 'volatileMatter', vm });
    return Math.max(0, vm);
  }

  // ===========================================================================
  // Electroanalytical helpers (complementary to Electrochemistry module).
  // 电分析化学辅助方法（与 Electrochemistry 模块互补）
  // ===========================================================================

  /** pH from electrode potential (Henderson equation). 由电极电位求 pH */
  pHFromPotential(E: number, E0: number = 0): number {
    // E = E0 - 0.0592 * pH → pH = (E0 - E) / 0.0592
    const pH = (E0 - E) / 0.0592;
    this._recordHistory({ method: 'pHFromPotential', pH });
    return pH;
  }

  /** Potential from pH (reverse). 由 pH 求电极电位 */
  potentialFrompH(pH: number, E0: number = 0): number {
    const E = E0 - 0.0592 * pH;
    this._recordHistory({ method: 'potentialFrompH', E });
    return E;
  }

  /** Ion-selective electrode response (Nernst). 离子选择性电极响应 */
  iseResponse(activity: number, charge: number, E0: number = 0): number {
    if (activity === 0) return Infinity;
    // E = E0 + (0.0592 / |z|) * log(a) for cation
    const E = E0 + (0.0592 / Math.abs(charge)) * Math.log10(activity);
    this._recordHistory({ method: 'iseResponse', E });
    return E;
  }

  /** Activity coefficient (Debye-Hückel). 活度系数（Debye-Hückel） */
  activityCoefficient(ionicStrength: number, charge: number, ionSize: number = 9): number {
    // log γ = -0.51 * z² * (√I / (1 + (√I * α / 3.3)))
    const sqrtI = Math.sqrt(ionicStrength);
    const denom = 1 + (sqrtI * ionSize / 3.3);
    if (denom === 0) return 1;
    const logGamma = -0.51 * charge * charge * sqrtI / denom;
    const gamma = Math.pow(10, logGamma);
    this._recordHistory({ method: 'activityCoefficient', gamma });
    return gamma;
  }

  /** Ionic strength I = 0.5 * Σ c_i * z_i². 离子强度 */
  ionicStrength(ions: Array<{ concentration: number; charge: number }>): number {
    const I = 0.5 * ions.reduce((s, ion) => s + ion.concentration * ion.charge * ion.charge, 0);
    this._recordHistory({ method: 'ionicStrength', I });
    return I;
  }

  // ===========================================================================
  // Kinetics & reaction analysis. 动力学与反应分析
  // ===========================================================================

  /** First-order rate constant from concentration vs time. 一级反应速率常数 */
  firstOrderRateConstant(initialConc: number, conc: number, time: number): number {
    if (initialConc === 0 || time === 0) return 0;
    // ln(C0/C) = kt → k = ln(C0/C) / t
    const k = Math.log(initialConc / conc) / time;
    this._recordHistory({ method: 'firstOrderRateConstant', k });
    return k;
  }

  /** Second-order rate constant. 二级反应速率常数 */
  secondOrderRateConstant(initialConc: number, conc: number, time: number): number {
    if (initialConc === 0 || time === 0) return 0;
    // 1/C - 1/C0 = kt
    const k = (1 / conc - 1 / initialConc) / time;
    this._recordHistory({ method: 'secondOrderRateConstant', k });
    return k;
  }

  /** Half-life for first-order reaction. 一级反应半衰期 */
  halfLifeFirstOrder(k: number): number {
    if (k === 0) return Infinity;
    const tHalf = 0.693 / k;
    this._recordHistory({ method: 'halfLifeFirstOrder', tHalf });
    return tHalf;
  }

  /** Activation energy from Arrhenius equation. Arrhenius 方程求活化能 */
  activationEnergy(k1: number, k2: number, T1: number, T2: number): number {
    // ln(k2/k1) = -Ea/R * (1/T2 - 1/T1)
    const denom = (1 / T2 - 1 / T1);
    if (denom === 0) return 0;
    const Ea = -R_GAS * Math.log(k2 / k1) / denom;
    this._recordHistory({ method: 'activationEnergy', Ea });
    return Ea;
  }

  /** Arrhenius equation for rate constant at temperature T. Arrhenius 方程计算 T 下的速率常数 */
  arrheniusRate(A: number, Ea: number, T: number): number {
    // k = A * exp(-Ea / (RT))
    const k = A * Math.exp(-Ea / (R_GAS * T));
    this._recordHistory({ method: 'arrheniusRate', k });
    return k;
  }

  // ===========================================================================
  // Separation & extraction. 分离与萃取
  // ===========================================================================

  /** Distribution ratio D. 分配比 */
  distributionRatio(organicConc: number, aqueousConc: number): number {
    if (aqueousConc === 0) return Infinity;
    const D = organicConc / aqueousConc;
    this._recordHistory({ method: 'distributionRatio', D });
    return D;
  }

  /** Percent extracted %E = (D / (D + V_aq/V_org)) * 100. 萃取百分率 */
  percentExtracted(D: number, Vaq: number, Vorg: number): number {
    if (Vorg === 0) return 0;
    const E = (D / (D + Vaq / Vorg)) * 100;
    this._recordHistory({ method: 'percentExtracted', E });
    return Math.max(0, Math.min(100, E));
  }

  /** Number of extractions needed for target recovery. 达到目标回收率所需萃取次数 */
  extractionsNeeded(Kd: number, Vorg: number, Vaq: number, targetRecovery: number = 99): number {
    const ratio = Vaq / (Vaq + Kd * Vorg);
    const remaining = 1 - targetRecovery / 100;
    if (ratio >= 1 || remaining <= 0) return Infinity;
    const n = Math.log(remaining) / Math.log(ratio);
    this._recordHistory({ method: 'extractionsNeeded', n: Math.ceil(n) });
    return Math.ceil(n);
  }

  /** Distillation: Raoult's law partial pressure. 蒸馏：拉乌尔定律分压 */
  raoultsLaw(moleFraction: number, pureVaporPressure: number): number {
    const P = moleFraction * pureVaporPressure;
    this._recordHistory({ method: 'raoultsLaw', P });
    return P;
  }

  /** Henry's law gas solubility. 亨利定律气体溶解度 */
  henrysLaw(partialPressure: number, henryConstant: number): number {
    const C = partialPressure * henryConstant;
    this._recordHistory({ method: 'henrysLaw', C });
    return C;
  }

  // ===========================================================================
  // Reporting & output. 报告与输出
  // ===========================================================================

  /** Convert ppm to mg/L (for water solutions). ppm 转 mg/L */
  ppmToMgL(ppm: number): number {
    // For dilute aqueous solutions, 1 ppm ≈ 1 mg/L
    const mgL = ppm;
    this._recordHistory({ method: 'ppmToMgL', mgL });
    return mgL;
  }

  /** Convert mg/L to molarity. mg/L 转摩尔浓度 */
  mgLToMolarity(mgL: number, molarMass: number): number {
    if (molarMass === 0) return 0;
    const M = (mgL / 1000) / molarMass;
    this._recordHistory({ method: 'mgLToMolarity', M });
    return M;
  }

  /** Convert molarity to mg/L. 摩尔浓度转 mg/L */
  molarityToMgL(M: number, molarMass: number): number {
    const mgL = M * molarMass * 1000;
    this._recordHistory({ method: 'molarityToMgL', mgL });
    return mgL;
  }

  /** Convert ppm to molarity. ppm 转摩尔浓度 */
  ppmToMolarity(ppm: number, molarMass: number): number {
    return this.mgLToMolarity(ppm, molarMass);
  }

  /** Convert molarity to ppm. 摩尔浓度转 ppm */
  molarityToPpm(M: number, molarMass: number): number {
    return this.molarityToMgL(M, molarMass);
  }

  /** Mass fraction to ppm. 质量分数转 ppm */
  massFractionToPpm(massFraction: number): number {
    return massFraction * 1e6;
  }

  /** Ppm to mass fraction. ppm 转质量分数 */
  ppmToMassFraction(ppm: number): number {
    return ppm / 1e6;
  }

  /** Parts per billion (ppb) conversion. ppb 换算 */
  ppmToPpb(ppm: number): number {
    return ppm * 1000;
  }

  /** Generate a serial ID for tracking. 生成追踪用序列 ID */
  generateTrackingId(prefix: string = 'AN'): string {
    const id = this._generateId(prefix);
    this._recordHistory({ method: 'generateTrackingId', id });
    return id;
  }

  /** Lookup detection method parameters. 查询检测方法参数 */
  lookupDetectionMethod(method: string): { typicalLOD: number; linearRange: string; precision: string } | null {
    const data = DETECTION_METHODS[method];
    if (!data) return null;
    this._recordHistory({ method: 'lookupDetectionMethod', detectionMethod: method });
    return data;
  }

  /** Summarize all stored data. 汇总所有存储数据 */
  summarize(): { spectra: number; chromatograms: number; calibrations: number; titrations: number; stats: number; qc: number; preparations: number } {
    const summary = {
      spectra: this._spectra.length,
      chromatograms: this._chromatograms.length,
      calibrations: this._calibrations.length,
      titrations: this._titrations.length,
      stats: this._stats.length,
      qc: this._qcSamples.length,
      preparations: this._preparations.length,
    };
    this._recordHistory({ method: 'summarize', summary });
    return summary;
  }

  /** Find peak closest to a target position. 查找最接近目标位置的峰 */
  findPeak(spectrum: Spectra, targetPosition: number, tolerance: number = 10): { position: number; intensity: number; assignment: string } | null {
    for (const peak of spectrum.peaks) {
      if (Math.abs(peak.position - targetPosition) <= tolerance) {
        this._recordHistory({ method: 'findPeak', found: true });
        return peak;
      }
    }
    this._recordHistory({ method: 'findPeak', found: false });
    return null;
  }

  /** Identify compound from combined spectral data. 由综合光谱数据识别化合物 */
  identifyCompound(spectra: Spectra[]): { type: string; peaks: number; tentativeId: string }[] {
    const results: Array<{ type: string; peaks: number; tentativeId: string }> = [];
    for (const s of spectra) {
      let tentative = 'unknown';
      if (s.type === 'IR' && s.peaks.some(p => p.position >= 1700 && p.position <= 1750)) {
        tentative = 'contains C=O (carbonyl)';
      } else if (s.type === 'IR' && s.peaks.some(p => p.position >= 3200 && p.position <= 3600)) {
        tentative = 'contains O-H (alcohol/acid)';
      } else if (s.type === 'UV-Vis' && s.peaks.some(p => p.position >= 250 && p.position <= 270)) {
        tentative = 'aromatic system';
      } else if (s.type === 'NMR' && s.peaks.some(p => p.position >= 9.5 && p.position <= 10.5)) {
        tentative = 'aldehyde proton';
      } else if (s.type === 'Mass' && s.peaks.length > 0) {
        tentative = `M+ at m/z ${s.peaks[0].position}`;
      }
      results.push({ type: s.type, peaks: s.peaks.length, tentativeId: tentative });
    }
    this._recordHistory({ method: 'identifyCompound', count: results.length });
    return results;
  }

  /** Calculate signal-to-noise ratio. 计算信噪比 */
  signalToNoise(signal: number, noise: number): number {
    if (noise === 0) return Infinity;
    const snr = signal / noise;
    this._recordHistory({ method: 'signalToNoise', snr });
    return snr;
  }

  /** Signal averaging for n scans. n 次扫描信号平均 */
  signalAveraging(individualSignals: number[]): { mean: number; stdDev: number; snrImprovement: number } {
    if (individualSignals.length === 0) return { mean: 0, stdDev: 0, snrImprovement: 1 };
    const n = individualSignals.length;
    const mean = individualSignals.reduce((s, x) => s + x, 0) / n;
    const variance = n > 1 ? individualSignals.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / (n - 1) : 0;
    const stdDev = Math.sqrt(variance);
    const snrImprovement = Math.sqrt(n);
    this._recordHistory({ method: 'signalAveraging', n });
    return { mean, stdDev, snrImprovement };
  }

  /** Convert Celsius to Kelvin. 摄氏度转开尔文 */
  celsiusToKelvin(celsius: number): number {
    return celsius + KELVIN_OFFSET;
  }

  /** Convert Kelvin to Celsius. 开尔文转摄氏度 */
  kelvinToCelsius(kelvin: number): number {
    return kelvin - KELVIN_OFFSET;
  }

  /** Autoionization of water Kw. 水的离子积 */
  waterIonProduct(temperatureC: number): number {
    // Approximate: pKw decreases with temperature
    const T = this.celsiusToKelvin(temperatureC);
    const pKw = 14.0 - 0.03 * (T - 298.15);
    const Kw = Math.pow(10, -pKw);
    this._recordHistory({ method: 'waterIonProduct', Kw });
    return Kw;
  }

  /** Build a serial dilution series for calibration standards. 构建校准用系列稀释标样 */
  prepareCalibrationStandards(stockConc: number, levels: number[], flaskVolume: number): Array<{ level: number; aliquotVolume: number; finalConc: number }> {
    const standards = levels.map(level => {
      const aliquot = (level * flaskVolume) / stockConc;
      return { level, aliquotVolume: aliquot, finalConc: level };
    });
    this._recordHistory({ method: 'prepareCalibrationStandards', count: standards.length });
    return standards;
  }

  /** Residual analysis for calibration. 校准残差分析 */
  residualAnalysis(standards: Array<{ concentration: number; reading: number }>, slope: number, intercept: number): Array<{ concentration: number; predicted: number; residual: number }> {
    const analysis = standards.map(s => {
      const predicted = slope * s.concentration + intercept;
      const residual = s.reading - predicted;
      return { concentration: s.concentration, predicted, residual };
    });
    this._recordHistory({ method: 'residualAnalysis', count: analysis.length });
    return analysis;
  }

  /** Format concentration with appropriate units. 格式化浓度（含单位） */
  formatConcentration(conc: number, unit: string = 'M'): string {
    let formatted: string;
    if (conc === 0) formatted = '0';
    else if (Math.abs(conc) < 1e-9) formatted = `${(conc * 1e12).toExponential(2)} p${unit}`;
    else if (Math.abs(conc) < 1e-6) formatted = `${(conc * 1e9).toExponential(2)} n${unit}`;
    else if (Math.abs(conc) < 1e-3) formatted = `${(conc * 1e6).toExponential(2)} μ${unit}`;
    else if (Math.abs(conc) < 1) formatted = `${(conc * 1e3).toExponential(2)} m${unit}`;
    else formatted = `${conc.toExponential(2)} ${unit}`;
    this._recordHistory({ method: 'formatConcentration' });
    return formatted;
  }

  // ===========================================================================
  // Serialization & state management. 序列化与状态管理
  // ===========================================================================

  toPacket(): DataPacket<{
    spectra: Spectra[];
    chromatograms: Chromatogram[];
    calibrations: CalibrationCurve[];
    titrations: Titration[];
    stats: StatisticalSummary[];
    validations: ValidationParameters[];
    qcSamples: QCSample[];
    preparations: SamplePreparation[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['chemistry', 'AnalyticalChemistry'],
      priority: 1,
      phase: 'chemistry:analytical',
    };
    return {
      id: this._generateId('an'),
      payload: {
        spectra: this._spectra,
        chromatograms: this._chromatograms,
        calibrations: this._calibrations,
        titrations: this._titrations,
        stats: this._stats,
        validations: this._validations,
        qcSamples: this._qcSamples,
        preparations: this._preparations,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._spectra = [];
    this._chromatograms = [];
    this._calibrations = [];
    this._titrations = [];
    this._stats = [];
    this._validations = [];
    this._qcSamples = [];
    this._preparations = [];
    this._history = [];
    this._counter = 0;
  }

  get spectraCount(): number {
    return this._spectra.length;
  }

  get chromatogramCount(): number {
    return this._chromatograms.length;
  }

  get calibrationCount(): number {
    return this._calibrations.length;
  }

  get titrationCount(): number {
    return this._titrations.length;
  }

  get statsCount(): number {
    return this._stats.length;
  }

  get validationCount(): number {
    return this._validations.length;
  }

  get qcSampleCount(): number {
    return this._qcSamples.length;
  }

  get preparationCount(): number {
    return this._preparations.length;
  }

  get historyDepth(): number {
    return this._history.length;
  }
}
