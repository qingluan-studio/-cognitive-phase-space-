import { DataPacket, PacketMeta } from '../shared/types';

/** Functional group descriptor. 官能团描述 */
export interface FunctionalGroup {
  name: string;
  formula: string;
  suffix: string;
}

/** Isomer record. 同分异构体记录 */
export interface Isomer {
  type: 'structural' | 'cis-trans' | 'optical' | 'conformational';
  structures: string[];
}

/** Organic reaction descriptor. 有机反应描述 */
export interface OrganicReaction {
  type: string;
  mechanism: string;
}

/** Hydrocarbon chain record. 烃链记录 */
export interface Hydrocarbon {
  name: string;
  formula: string;
  carbons: number;
  saturation: 'saturated' | 'unsaturated';
}

/** Stereochemistry descriptor. 立体化学描述 */
export interface Stereochemistry {
  center: string;
  configuration: 'R' | 'S' | 'E' | 'Z' | 'none';
  opticalActivity: number;
  enantiomer: string;
}

/** Reaction mechanism step. 反应机理步骤 */
export interface MechanismStep {
  step: number;
  description: string;
  intermediate: string;
  rate: 'slow' | 'fast';
}

/** Polymer descriptor. 聚合物描述 */
export interface Polymer {
  name: string;
  monomer: string;
  type: 'addition' | 'condensation';
  repeatUnit: string;
  degreeOfPolymerization: number;
}

/** Aromatic compound descriptor. 芳香化合物描述 */
export interface AromaticCompound {
  name: string;
  formula: string;
  piElectrons: number;
  ringCount: number;
  aromatic: boolean;
}

/** Heterocycle descriptor. 杂环化合物描述 */
export interface Heterocycle {
  name: string;
  heteroatom: string;
  ringSize: number;
  aromatic: boolean;
  piElectrons: number;
}

/** Named reaction descriptor. 命名反应描述 */
export interface NamedReaction {
  name: string;
  reactants: string[];
  products: string[];
  mechanism: string;
  category: string;
}

/** Reactive intermediate stability. 反应中间体稳定性 */
export interface IntermediateStability {
  type: 'carbocation' | 'carbanion' | 'radical' | 'carbene';
  order: string[];
  explanation: string;
}

/** Alkyl group descriptor. 烷基描述 */
export interface AlkylGroup {
  name: string;
  formula: string;
  carbons: number;
  isomerism: string;
}

/** Degree of unsaturation result. 不饱和度结果 */
export interface DegreeOfUnsaturation {
  formula: string;
  DoU: number;
  rings: number;
  piBonds: number;
  explanation: string;
}

/** Reaction prediction result. 反应预测结果 */
export interface ReactionPrediction {
  substrate: string;
  reagent: string;
  majorProduct: string;
  minorProduct: string;
  rule: string;
  mechanism: string;
}

const ALKANE_PREFIXES: string[] = ['', 'meth', 'eth', 'prop', 'but', 'pent', 'hex', 'hept', 'oct', 'non', 'dec',
  'undec', 'dodec', 'tridec', 'tetradec', 'pentadec', 'hexadec', 'heptadec', 'octadec', 'nonadec', 'icos'];

/** IUPAC prefix table for C1-C20. IUPAC 前缀表（C1-C20） */
const IUPAC_PREFIXES: Record<number, string> = {
  1: 'meth', 2: 'eth', 3: 'prop', 4: 'but', 5: 'pent',
  6: 'hex', 7: 'hept', 8: 'oct', 9: 'non', 10: 'dec',
  11: 'undec', 12: 'dodec', 13: 'tridec', 14: 'tetradec', 15: 'pentadec',
  16: 'hexadec', 17: 'heptadec', 18: 'octadec', 19: 'nonadec', 20: 'icos',
};

/** Common organic compounds database. 常见有机化合物数据库 */
const COMMON_ORGANIC_COMPOUNDS: Record<string, { formula: string; molarMass: number; category: string }> = {
  'methane': { formula: 'CH4', molarMass: 16.04, category: 'alkane' },
  'ethane': { formula: 'C2H6', molarMass: 30.07, category: 'alkane' },
  'propane': { formula: 'C3H8', molarMass: 44.10, category: 'alkane' },
  'butane': { formula: 'C4H10', molarMass: 58.12, category: 'alkane' },
  'ethylene': { formula: 'C2H4', molarMass: 28.05, category: 'alkene' },
  'propene': { formula: 'C3H6', molarMass: 42.08, category: 'alkene' },
  'acetylene': { formula: 'C2H2', molarMass: 26.04, category: 'alkyne' },
  'benzene': { formula: 'C6H6', molarMass: 78.11, category: 'aromatic' },
  'toluene': { formula: 'C7H8', molarMass: 92.14, category: 'aromatic' },
  'methanol': { formula: 'CH3OH', molarMass: 32.04, category: 'alcohol' },
  'ethanol': { formula: 'C2H5OH', molarMass: 46.07, category: 'alcohol' },
  'phenol': { formula: 'C6H5OH', molarMass: 94.11, category: 'alcohol' },
  'formaldehyde': { formula: 'CH2O', molarMass: 30.03, category: 'aldehyde' },
  'acetaldehyde': { formula: 'C2H4O', molarMass: 44.05, category: 'aldehyde' },
  'acetone': { formula: 'C3H6O', molarMass: 58.08, category: 'ketone' },
  'aceticAcid': { formula: 'CH3COOH', molarMass: 60.05, category: 'carboxylic acid' },
  'ethylAcetate': { formula: 'C4H8O2', molarMass: 88.11, category: 'ester' },
  'methylAmine': { formula: 'CH3NH2', molarMass: 31.06, category: 'amine' },
  'aniline': { formula: 'C6H5NH2', molarMass: 93.13, category: 'amine' },
  'diethylEther': { formula: 'C4H10O', molarMass: 74.12, category: 'ether' },
};

/** Common bond dissociation energies (kJ/mol). 常见键解离能 */
const BOND_ENERGIES_ORGANIC: Record<string, number> = {
  'C-H': 413, 'C-C': 348, 'C=C': 614, 'C≡C': 839,
  'C-O': 358, 'C=O': 745, 'C-N': 305, 'C=N': 615, 'C≡N': 891,
  'C-Cl': 339, 'C-Br': 276, 'C-I': 238, 'C-F': 485,
  'O-H': 463, 'N-H': 391, 'O-O': 146, 'O=O': 498,
  'N-N': 163, 'N=N': 418, 'N≡N': 946, 'H-H': 436,
};

/** Heterocycle database. 杂环化合物数据库 */
const HETEROCYCLES_DATABASE: Record<string, Heterocycle> = {
  'pyridine': { name: 'pyridine', heteroatom: 'N', ringSize: 6, aromatic: true, piElectrons: 6 },
  'pyrrole': { name: 'pyrrole', heteroatom: 'N', ringSize: 5, aromatic: true, piElectrons: 6 },
  'furan': { name: 'furan', heteroatom: 'O', ringSize: 5, aromatic: true, piElectrons: 6 },
  'thiophene': { name: 'thiophene', heteroatom: 'S', ringSize: 5, aromatic: true, piElectrons: 6 },
  'imidazole': { name: 'imidazole', heteroatom: 'N', ringSize: 5, aromatic: true, piElectrons: 6 },
  'pyrimidine': { name: 'pyrimidine', heteroatom: 'N', ringSize: 6, aromatic: true, piElectrons: 6 },
  'tetrahydrofuran': { name: 'THF', heteroatom: 'O', ringSize: 5, aromatic: false, piElectrons: 0 },
  'dioxane': { name: 'dioxane', heteroatom: 'O', ringSize: 6, aromatic: false, piElectrons: 0 },
};

/** Polymer database. 聚合物数据库 */
const POLYMER_DATABASE: Record<string, { monomer: string; type: 'addition' | 'condensation'; repeatUnit: string }> = {
  'polyethylene': { monomer: 'CH2=CH2', type: 'addition', repeatUnit: '-CH2-CH2-' },
  'polypropylene': { monomer: 'CH2=CHCH3', type: 'addition', repeatUnit: '-CH2-CH(CH3)-' },
  'PVC': { monomer: 'CH2=CHCl', type: 'addition', repeatUnit: '-CH2-CHCl-' },
  'PTFE': { monomer: 'CF2=CF2', type: 'addition', repeatUnit: '-CF2-CF2-' },
  'polystyrene': { monomer: 'CH2=CHC6H5', type: 'addition', repeatUnit: '-CH2-CH(C6H5)-' },
  'PET': { monomer: 'C2H4O2+C6H4(COOH)2', type: 'condensation', repeatUnit: '-C6H4-CO-O-C2H4-O-CO-' },
  'nylon-6,6': { monomer: 'H2N(CH2)6NH2+HOOC(CH2)4COOH', type: 'condensation', repeatUnit: '-NH-(CH2)6-NH-CO-(CH2)4-CO-' },
  'Kevlar': { monomer: 'H2N-C6H4-NH2+ClOC-C6H4-COCl', type: 'condensation', repeatUnit: '-NH-C6H4-NH-CO-C6H4-CO-' },
  'glycolide': { monomer: 'glycolic acid', type: 'condensation', repeatUnit: '-O-CH2-CO-' },
};

/** Named reactions database. 命名反应数据库 */
const NAMED_REACTIONS: Record<string, NamedReaction> = {
  'Diels-Alder': { name: 'Diels-Alder', reactants: ['diene', 'dienophile'], products: ['cyclohexene'], mechanism: '[4+2] cycloaddition', category: 'pericyclic' },
  'Friedel-Crafts alkylation': { name: 'Friedel-Crafts alkylation', reactants: ['aromatic', 'alkyl halide', 'AlCl3'], products: ['alkylated aromatic'], mechanism: 'electrophilic aromatic substitution', category: 'EAS' },
  'Friedel-Crafts acylation': { name: 'Friedel-Crafts acylation', reactants: ['aromatic', 'acyl chloride', 'AlCl3'], products: ['acylated aromatic'], mechanism: 'electrophilic aromatic substitution', category: 'EAS' },
  'Grignard': { name: 'Grignard', reactants: ['RMgX', 'carbonyl'], products: ['alcohol'], mechanism: 'nucleophilic addition', category: 'C-C bond formation' },
  'Wittig': { name: 'Wittig', reactants: ['ylide', 'aldehyde/ketone'], products: ['alkene'], mechanism: 'nucleophilic addition-elimination', category: 'alkene synthesis' },
  'Aldol': { name: 'Aldol', reactants: ['enolate', 'aldehyde'], products: ['beta-hydroxy carbonyl'], mechanism: 'nucleophilic addition', category: 'condensation' },
  'Claisen': { name: 'Claisen', reactants: ['ester', 'ester'], products: ['beta-keto ester'], mechanism: 'nucleophilic acyl substitution', category: 'condensation' },
  'Cannizzaro': { name: 'Cannizzaro', reactants: ['aldehyde (no alpha-H)', 'base'], products: ['alcohol', 'carboxylic acid'], mechanism: 'disproportionation', category: 'redox' },
  'Michael': { name: 'Michael', reactants: ['enolate', 'alpha,beta-unsaturated carbonyl'], products: ['1,5-dicarbonyl'], mechanism: 'conjugate addition', category: 'C-C bond formation' },
  'Hofmann elimination': { name: 'Hofmann elimination', reactants: ['quaternary ammonium', 'base'], products: ['alkene', 'tertiary amine'], mechanism: 'E2 elimination', category: 'elimination' },
  'Sandmeyer': { name: 'Sandmeyer', reactants: ['diazonium', 'CuX'], products: ['aryl halide'], mechanism: 'radical substitution', category: 'substitution' },
  'Williamson ether': { name: 'Williamson', reactants: ['alkoxide', 'alkyl halide'], products: ['ether'], mechanism: 'SN2', category: 'ether synthesis' },
};

/** Common leaving groups ranked by leaving ability. 常见离去基团（按离去能力排序） */
const LEAVING_GROUPS: Array<{ group: string; stability: string; rate: string }> = [
  { group: 'I-', stability: 'excellent', rate: 'fast' },
  { group: 'Br-', stability: 'good', rate: 'fast' },
  { group: 'Cl-', stability: 'moderate', rate: 'moderate' },
  { group: 'F-', stability: 'poor', rate: 'slow' },
  { group: 'OTs', stability: 'excellent', rate: 'fast' },
  { group: 'OMs', stability: 'excellent', rate: 'fast' },
  { group: 'H2O', stability: 'good', rate: 'fast' },
  { group: 'N2', stability: 'excellent', rate: 'fast' },
];

/** Build and reason about organic chemistry structures. 构建和分析有机化学结构 */
export class OrganicChemistry {
  private _groups: FunctionalGroup[] = [];
  private _isomers: Isomer[] = [];
  private _reactions: OrganicReaction[] = [];
  private _mechanisms: MechanismStep[][] = [];
  private _polymers: Polymer[] = [];
  private _aromatics: AromaticCompound[] = [];
  private _heterocycles: Heterocycle[] = [];
  private _namedReactions: NamedReaction[] = [];
  private _stereo: Stereochemistry[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  constructor() {
    this._seedFunctionalGroups();
  }

  private _seedFunctionalGroups(): void {
    const seed: Array<[string, string, string]> = [
      ['alcohol', '-OH', '-ol'],
      ['aldehyde', '-CHO', '-al'],
      ['ketone', 'C=O', '-one'],
      ['carboxylic acid', '-COOH', '-oic acid'],
      ['ester', '-COO-', '-oate'],
      ['amine', '-NH2', '-amine'],
      ['ether', '-O-', '-ether'],
      ['amide', '-CONH2', '-amide'],
      ['nitrile', '-C≡N', '-nitrile'],
      ['thiol', '-SH', '-thiol'],
      ['anhydride', '-CO-O-CO-', '-anhydride'],
      ['acyl chloride', '-COCl', '-oyl chloride'],
      ['nitro', '-NO2', '-nitro'],
      ['sulfonic acid', '-SO3H', '-sulfonic acid'],
    ];
    for (const [name, formula, suffix] of seed) {
      this._groups.push({ name, formula, suffix });
    }
  }

  private _prefix(n: number): string {
    return IUPAC_PREFIXES[n] ?? ALKANE_PREFIXES[Math.min(n, ALKANE_PREFIXES.length - 1)] ?? `C${n}`;
  }

  /** Private history recorder (capped at 200 entries). 私有历史记录方法（上限 200 条） */
  private _recordHistory(entry: unknown): void {
    this._history.push(entry);
    if (this._history.length > 200) {
      this._history.shift();
    }
  }

  /** Construct an alkane of n carbons. 由 n 个碳原子构建烷烃 */
  alkane(n: number): Hydrocarbon {
    const name = `${this._prefix(n)}ane`;
    const formula = `C${n}H${2 * n + 2}`;
    this._history.push({ method: 'alkane', n });
    return { name, formula, carbons: n, saturation: 'saturated' };
  }

  /** Construct an alkene of n carbons. 由 n 个碳原子构建烯烃 */
  alkene(n: number): Hydrocarbon {
    const name = `${this._prefix(n)}ene`;
    const formula = n > 1 ? `C${n}H${2 * n}` : `C${n}H${2 * n + 2}`;
    this._history.push({ method: 'alkene', n });
    return { name, formula, carbons: n, saturation: 'unsaturated' };
  }

  /** Construct an alkyne of n carbons. 由 n 个碳原子构建炔烃 */
  alkyne(n: number): Hydrocarbon {
    const name = `${this._prefix(n)}yne`;
    const formula = n > 1 ? `C${n}H${2 * n - 2}` : `C${n}H${2 * n + 2}`;
    this._history.push({ method: 'alkyne', n });
    return { name, formula, carbons: n, saturation: 'unsaturated' };
  }

  /** Construct an alcohol of n carbons. 由 n 个碳原子构建醇 */
  alcohol(n: number): { name: string; formula: string } {
    const name = `${this._prefix(n)}an-1-ol`;
    const formula = `C${n}H${2 * n + 1}OH`;
    this._history.push({ method: 'alcohol', n });
    return { name, formula };
  }

  /** Construct an aldehyde of n carbons. 由 n 个碳原子构建醛 */
  aldehyde(n: number): { name: string; formula: string } {
    const name = `${this._prefix(n)}anal`;
    const formula = n === 1 ? 'CH2O' : `C${n}H${2 * n}O`;
    this._history.push({ method: 'aldehyde', n });
    return { name, formula };
  }

  /** Construct a ketone of n carbons (n >= 3). 由 n 个碳原子构建酮（n ≥ 3） */
  ketone(n: number): { name: string; formula: string } {
    const name = `${this._prefix(n)}an-2-one`;
    const formula = `C${n}H${2 * n}O`;
    this._history.push({ method: 'ketone', n });
    return { name, formula };
  }

  /** Construct a carboxylic acid of n carbons. 由 n 个碳原子构建羧酸 */
  carboxylicAcid(n: number): { name: string; formula: string } {
    const name = `${this._prefix(n)}anoic acid`;
    const formula = n === 1 ? 'CH2O2' : `C${n}H${2 * n}O2`;
    this._history.push({ method: 'carboxylicAcid', n });
    return { name, formula };
  }

  /** Construct an ester of n carbons. 由 n 个碳原子构建酯 */
  ester(n: number): { name: string; formula: string } {
    const name = `${this._prefix(n - 1)}yl ${this._prefix(1)}anoate`;
    const formula = `C${n}H${2 * n}O2`;
    this._history.push({ method: 'ester', n });
    return { name, formula };
  }

  /** Construct an amine of n carbons. 由 n 个碳原子构建胺 */
  amine(n: number): { name: string; formula: string } {
    const name = `${this._prefix(n)}an-1-amine`;
    const formula = `C${n}H${2 * n + 3}N`;
    this._history.push({ method: 'amine', n });
    return { name, formula };
  }

  /** Construct an ether of n carbons. 由 n 个碳原子构建醚 */
  ether(n: number): { name: string; formula: string } {
    const half = Math.floor(n / 2);
    const name = `di${this._prefix(half)}yl ether`;
    const formula = `C${n}H${2 * n + 2}O`;
    this._recordHistory({ method: 'ether', n });
    return { name, formula };
  }

  /** Construct an amide of n carbons. 由 n 个碳原子构建酰胺 */
  amide(n: number): { name: string; formula: string } {
    const name = `${this._prefix(n)}anamide`;
    const formula = `C${n}H${2 * n + 1}NO`;
    this._recordHistory({ method: 'amide', n });
    return { name, formula };
  }

  /** Construct a nitrile of n carbons. 由 n 个碳原子构建腈 */
  nitrile(n: number): { name: string; formula: string } {
    const name = `${this._prefix(n - 1)}anenitrile`;
    const formula = `C${n}H${2 * n - 1}N`;
    this._recordHistory({ method: 'nitrile', n });
    return { name, formula };
  }

  /** Construct a thiol of n carbons. 由 n 个碳原子构建硫醇 */
  thiol(n: number): { name: string; formula: string } {
    const name = `${this._prefix(n)}ane-1-thiol`;
    const formula = `C${n}H${2 * n + 1}SH`;
    this._recordHistory({ method: 'thiol', n });
    return { name, formula };
  }

  /** Construct an acyl chloride of n carbons. 由 n 个碳原子构建酰氯 */
  acylChloride(n: number): { name: string; formula: string } {
    const name = `${this._prefix(n)}anoyl chloride`;
    const formula = `C${n}H${2 * n - 1}ClO`;
    this._recordHistory({ method: 'acylChloride', n });
    return { name, formula };
  }

  /** Construct an acid anhydride of n carbons. 由 n 个碳原子构建酸酐 */
  anhydride(n: number): { name: string; formula: string } {
    const name = `${this._prefix(n)}anoic anhydride`;
    const formula = `C${2 * n}H${4 * n - 2}O3`;
    this._recordHistory({ method: 'anhydride', n });
    return { name, formula };
  }

  /** Construct substituted benzene. 由取代基构建取代苯 */
  benzene(substituents: string[]): { name: string; formula: string } {
    const parts = substituents.length > 0 ? substituents.join('-') + '-' : '';
    const name = `${parts}benzene`;
    this._history.push({ method: 'benzene', substituents });
    return { name, formula: 'C6H6' };
  }

  /** Construct a cycloalkane of n carbons. 由 n 个碳原子构建环烷烃 */
  cycloalkane(n: number): Hydrocarbon {
    const name = `cyclo${this._prefix(n)}ane`;
    const formula = `C${n}H${2 * n}`;
    this._recordHistory({ method: 'cycloalkane', n });
    return { name, formula, carbons: n, saturation: 'saturated' };
  }

  /** Construct a cycloalkene of n carbons. 由 n 个碳原子构建环烯烃 */
  cycloalkene(n: number): Hydrocarbon {
    const name = `cyclo${this._prefix(n)}ene`;
    const formula = `C${n}H${2 * n - 2}`;
    this._recordHistory({ method: 'cycloalkene', n });
    return { name, formula, carbons: n, saturation: 'unsaturated' };
  }

  /** Generate IUPAC name from a structure token string. 由结构标记生成 IUPAC 名称 */
  iupacName(structure: string): string {
    const tokens = structure.split(';').map(t => t.trim()).filter(Boolean);
    if (tokens.length === 0) return 'unknown';
    const carbonCount = tokens.filter(t => t.startsWith('C')).length;
    const fg = tokens.find(t => t.startsWith('FG:'));
    const prefix = this._prefix(carbonCount);
    if (!fg) return `${prefix}ane`;
    const fgName = fg.substring(3);
    const mapping: Record<string, string> = {
      alcohol: `${prefix}an-1-ol`,
      aldehyde: `${prefix}anal`,
      ketone: `${prefix}an-2-one`,
      'carboxylic acid': `${prefix}anoic acid`,
      ester: `${prefix}anoate`,
      amine: `${prefix}an-1-amine`,
    };
    this._history.push({ method: 'iupacName', structure });
    return mapping[fgName] ?? `${prefix}ane`;
  }

  /** Reverse a name into a structural formula stub. 由名称反推结构式 */
  structuralFormula(name: string): string {
    const m = name.match(/^([a-z]+)(an|ene|yne)/);
    if (!m) return name;
    const prefix = m[1];
    const idx = ALKANE_PREFIXES.indexOf(prefix);
    if (idx < 0) return name;
    const n = idx;
    if (name.endsWith('ane')) return `C${n}H${2 * n + 2}`;
    if (name.endsWith('ene')) return `C${n}H${2 * n}`;
    if (name.endsWith('yne')) return `C${n}H${2 * n - 2}`;
    return name;
  }

  /** Estimate number of structural isomers for a formula. 估算化学式的结构异构体数 */
  isomerCount(formula: string): number {
    const m = formula.match(/C(\d+)/);
    if (!m) return 1;
    const n = parseInt(m[1], 10);
    const table: Record<number, number> = { 1: 1, 2: 1, 3: 1, 4: 2, 5: 3, 6: 5, 7: 9, 8: 18, 9: 35, 10: 75 };
    this._history.push({ method: 'isomerCount', formula });
    return table[n] ?? Math.max(1, Math.floor(Math.pow(2, n - 3)));
  }

  /** Enumerate structural isomers (limited enumeration). 列举结构异构体（有限枚举） */
  structuralIsomers(formula: string): Isomer {
    const m = formula.match(/C(\d+)/);
    const n = m ? parseInt(m[1], 10) : 1;
    const structures: string[] = [];
    const count = Math.min(n, 4);
    for (let i = 0; i < count; i++) {
      structures.push(`C${n - i}-C${i || ''}`.replace(/-C$/, ''));
    }
    const isomer: Isomer = { type: 'structural', structures };
    this._isomers.push(isomer);
    this._history.push({ method: 'structuralIsomers', formula });
    return isomer;
  }

  /** Enumerate stereoisomers. 列举立体异构体 */
  stereoisomers(formula: string): Isomer {
    const m = formula.match(/C(\d+)/);
    const n = m ? parseInt(m[1], 10) : 1;
    const structures = n > 2 ? ['cis', 'trans'] : ['none'];
    const isomer: Isomer = { type: 'cis-trans', structures };
    this._isomers.push(isomer);
    this._history.push({ method: 'stereoisomers', formula });
    return isomer;
  }

  /** Determine E/Z configuration around a double bond. 判断双键的 E/Z 构型 */
  ezConfiguration(highPriority: Array<'left' | 'right'>): 'E' | 'Z' | 'none' {
    if (highPriority.length < 2) return 'none';
    if (highPriority[0] === highPriority[1]) return 'Z';
    return 'E';
  }

  /** Determine R/S configuration at a stereocenter. 判断立体中心的 R/S 构型 */
  rsConfiguration(priority: string[]): 'R' | 'S' {
    const reverse = [...priority].reverse();
    const isClockwise = JSON.stringify(priority) < JSON.stringify(reverse);
    this._recordHistory({ method: 'rsConfiguration' });
    return isClockwise ? 'R' : 'S';
  }

  /** Optical activity from specific rotation. 由比旋光度计算光学活性 */
  opticalActivity(observed: number, concentration: number, pathLength: number): number {
    if (concentration <= 0 || pathLength <= 0) return 0;
    const specific = observed / (concentration * pathLength);
    this._recordHistory({ method: 'opticalActivity', specific });
    return specific;
  }

  /** Enantiomeric excess from observed rotation. 由实测旋光计算对映体过量 */
  enantiomericExcess(observed: number, maxRotation: number): number {
    if (maxRotation === 0) return 0;
    const ee = (observed / maxRotation) * 100;
    this._recordHistory({ method: 'enantiomericExcess', ee });
    return Math.max(-100, Math.min(100, ee));
  }

  /** Compute enantiomer and diastereomer counts from chiral centers. 由手性中心数计算对映体与非对映体数 */
  stereoisomerCount(chiralCenters: number, hasMesomer: boolean = false): { enantiomers: number; diastereomers: number; total: number } {
    const max = Math.pow(2, chiralCenters);
    const mesoReduction = hasMesomer ? 1 : 0;
    const total = max - mesoReduction;
    const enantiomers = 2;
    const diastereomers = Math.max(0, total - enantiomers);
    this._recordHistory({ method: 'stereoisomerCount', chiralCenters });
    return { enantiomers, diastereomers, total };
  }

  /** Detect meso compound (stereocenters + internal mirror plane). 检测内消旋体 */
  mesoCompound(chiralCenters: number, hasMirrorPlane: boolean): boolean {
    return chiralCenters >= 2 && hasMirrorPlane;
  }

  /** Substitution reaction. 取代反应 */
  substitution(substrate: string, reagent: string): OrganicReaction {
    const r: OrganicReaction = {
      type: 'substitution',
      mechanism: `${substrate} + ${reagent} -> substituted product + leaving group`,
    };
    this._reactions.push(r);
    this._history.push({ method: 'substitution' });
    return r;
  }

  /** Addition reaction. 加成反应 */
  addition(alkene: string, reagent: string): OrganicReaction {
    const r: OrganicReaction = {
      type: 'addition',
      mechanism: `${alkene} + ${reagent} -> saturated product`,
    };
    this._reactions.push(r);
    this._history.push({ method: 'addition' });
    return r;
  }

  /** Elimination reaction. 消除反应 */
  elimination(substrate: string): OrganicReaction {
    const r: OrganicReaction = {
      type: 'elimination',
      mechanism: `${substrate} -> alkene + small molecule (HX or H2O)`,
    };
    this._reactions.push(r);
    this._history.push({ method: 'elimination' });
    return r;
  }

  /** Condensation reaction. 缩合反应 */
  condensation(a: string, b: string): OrganicReaction {
    const r: OrganicReaction = {
      type: 'condensation',
      mechanism: `${a} + ${b} -> larger molecule + H2O`,
    };
    this._reactions.push(r);
    this._history.push({ method: 'condensation' });
    return r;
  }

  /** Hydrolysis reaction. 水解反应 */
  hydrolysis(substrate: string): OrganicReaction {
    const r: OrganicReaction = {
      type: 'hydrolysis',
      mechanism: `${substrate} + H2O -> two smaller molecules`,
    };
    this._reactions.push(r);
    this._history.push({ method: 'hydrolysis' });
    return r;
  }

  /** Polymerization of monomers. 聚合反应 */
  polymerization(monomers: string[]): OrganicReaction {
    const r: OrganicReaction = {
      type: 'polymerization',
      mechanism: `${monomers.length} monomers -> polymer chain`,
    };
    this._reactions.push(r);
    this._history.push({ method: 'polymerization', count: monomers.length });
    return r;
  }

  /** Electrophilic aromatic substitution on benzene. 芳香亲电取代 */
  aromaticSubstitution(benzene: string, reagent: string): OrganicReaction {
    const r: OrganicReaction = {
      type: 'aromatic-substitution',
      mechanism: `${benzene} + ${reagent} -> substituted benzene + H+`,
    };
    this._reactions.push(r);
    this._history.push({ method: 'aromaticSubstitution' });
    return r;
  }

  /** SN1 mechanism: 2-step unimolecular nucleophilic substitution. SN1 机理 */
  sn1(substrate: string, nucleophile: string): { mechanism: MechanismStep[]; rate: string; stereochemistry: string } {
    const steps: MechanismStep[] = [
      { step: 1, description: `${substrate} -> carbocation + leaving group`, intermediate: 'carbocation', rate: 'slow' },
      { step: 2, description: `carbocation + ${nucleophile} -> product`, intermediate: 'carbocation', rate: 'fast' },
    ];
    this._mechanisms.push(steps);
    this._recordHistory({ method: 'sn1' });
    return { mechanism: steps, rate: 'rate = k[substrate]', stereochemistry: 'racemization' };
  }

  /** SN2 mechanism: 1-step bimolecular nucleophilic substitution. SN2 机理 */
  sn2(substrate: string, nucleophile: string): { mechanism: MechanismStep[]; rate: string; stereochemistry: string } {
    const steps: MechanismStep[] = [
      { step: 1, description: `${nucleophile} backside-attacks ${substrate} -> product + leaving group (single step)`, intermediate: 'transition state', rate: 'slow' },
    ];
    this._mechanisms.push(steps);
    this._recordHistory({ method: 'sn2' });
    return { mechanism: steps, rate: 'rate = k[substrate][nucleophile]', stereochemistry: 'inversion (Walden)' };
  }

  /** E1 mechanism: 2-step unimolecular elimination. E1 机理 */
  e1(substrate: string, base: string): { mechanism: MechanismStep[]; rate: string; rule: string } {
    const steps: MechanismStep[] = [
      { step: 1, description: `${substrate} -> carbocation + leaving group`, intermediate: 'carbocation', rate: 'slow' },
      { step: 2, description: `base (${base}) abstracts beta-H -> alkene`, intermediate: 'carbocation', rate: 'fast' },
    ];
    this._mechanisms.push(steps);
    this._recordHistory({ method: 'e1' });
    return { mechanism: steps, rate: 'rate = k[substrate]', rule: 'Zaitsev (more substituted alkene)' };
  }

  /** E2 mechanism: 1-step bimolecular elimination. E2 机理 */
  e2(substrate: string, base: string): { mechanism: MechanismStep[]; rate: string; rule: string } {
    const steps: MechanismStep[] = [
      { step: 1, description: `${base} abstracts beta-H anti-periplanar while leaving group departs -> alkene`, intermediate: 'transition state', rate: 'slow' },
    ];
    this._mechanisms.push(steps);
    this._recordHistory({ method: 'e2' });
    return { mechanism: steps, rate: 'rate = k[substrate][base]', rule: 'anti-periplanar required; Zaitsev or Hofmann depending on base' };
  }

  /** E1cb mechanism: carbanion-mediated elimination. E1cb 机理 */
  e1cb(substrate: string, base: string): { mechanism: MechanismStep[]; rate: string; requirement: string } {
    const steps: MechanismStep[] = [
      { step: 1, description: `base (${base}) abstracts acidic beta-H -> carbanion`, intermediate: 'carbanion', rate: 'slow' },
      { step: 2, description: `carbanion expels leaving group -> alkene`, intermediate: 'carbanion', rate: 'fast' },
    ];
    this._mechanisms.push(steps);
    this._recordHistory({ method: 'e1cb' });
    return { mechanism: steps, rate: 'rate = k[substrate][base]', requirement: 'poor leaving group + acidic beta-H' };
  }

  /** Markovnikov's rule for HX addition. 马氏规则（HX 加成） */
  markovnikov(alkene: string, hx: string): ReactionPrediction {
    this._recordHistory({ method: 'markovnikov' });
    return {
      substrate: alkene,
      reagent: hx,
      majorProduct: `H adds to carbon with more H's; X adds to more substituted carbon`,
      minorProduct: `anti-Markovnikov (peroxide effect for HBr)`,
      rule: 'Markovnikov',
      mechanism: 'electrophilic addition via carbocation intermediate',
    };
  }

  /** Anti-Markovnikov addition (peroxide effect for HBr). 反马氏加成（过氧化效应） */
  antiMarkovnikov(alkene: string, hbr: string): ReactionPrediction {
    this._recordHistory({ method: 'antiMarkovnikov' });
    return {
      substrate: alkene,
      reagent: hbr,
      majorProduct: `Br adds to less substituted carbon (radical mechanism)`,
      minorProduct: `Markovnikov product`,
      rule: 'Anti-Markovnikov (peroxide effect, HBr only)',
      mechanism: 'radical addition',
    };
  }

  /** Zaitsev's rule for elimination. 扎伊采夫规则 */
  zaitsevRule(substrate: string): ReactionPrediction {
    this._recordHistory({ method: 'zaitsevRule' });
    return {
      substrate,
      reagent: 'small base',
      majorProduct: 'more substituted (more stable) alkene',
      minorProduct: 'less substituted (Hofmann) alkene',
      rule: 'Zaitsev',
      mechanism: 'E1 or E2 with small base',
    };
  }

  /** Hofmann's rule for elimination with bulky base. 霍夫曼规则（大体积碱） */
  hofmannRule(substrate: string, bulkyBase: string): ReactionPrediction {
    this._recordHistory({ method: 'hofmannRule' });
    return {
      substrate,
      reagent: bulkyBase,
      majorProduct: 'less substituted (Hofmann) alkene',
      minorProduct: 'more substituted (Zaitsev) alkene',
      rule: 'Hofmann',
      mechanism: 'E2 with bulky base (e.g., t-BuOK)',
    };
  }

  /** Diels-Alder reaction. Diels-Alder 反应 */
  dielsAlder(diene: string, dienophile: string): NamedReaction {
    const reaction = NAMED_REACTIONS['Diels-Alder'];
    const result: NamedReaction = {
      ...reaction,
      reactants: [diene, dienophile],
      products: ['cyclohexene derivative'],
    };
    this._namedReactions.push(result);
    this._recordHistory({ method: 'dielsAlder' });
    return result;
  }

  /** Friedel-Crafts alkylation/acylation. Friedel-Crafts 反应 */
  friedelCrafts(aromatic: string, reagent: string, type: 'alkylation' | 'acylation'): NamedReaction {
    const key = type === 'alkylation' ? 'Friedel-Crafts alkylation' : 'Friedel-Crafts acylation';
    const reaction = NAMED_REACTIONS[key];
    const result: NamedReaction = {
      ...reaction,
      reactants: [aromatic, reagent, 'AlCl3'],
      products: [`${type === 'alkylation' ? 'alkylated' : 'acylated'} ${aromatic}`],
    };
    this._namedReactions.push(result);
    this._recordHistory({ method: 'friedelCrafts', type });
    return result;
  }

  /** Grignard reaction: RMgX + carbonyl -> alcohol. 格氏反应 */
  grignard(rMgX: string, carbonyl: string): NamedReaction {
    const reaction = NAMED_REACTIONS['Grignard'];
    const result: NamedReaction = {
      ...reaction,
      reactants: [rMgX, carbonyl],
      products: ['alcohol (after acidic workup)'],
    };
    this._namedReactions.push(result);
    this._recordHistory({ method: 'grignard' });
    return result;
  }

  /** Wittig reaction: ylide + aldehyde/ketone -> alkene. 维蒂希反应 */
  wittig(ylide: string, carbonyl: string): NamedReaction {
    const reaction = NAMED_REACTIONS['Wittig'];
    const result: NamedReaction = {
      ...reaction,
      reactants: [ylide, carbonyl],
      products: ['alkene + Ph3P=O'],
    };
    this._namedReactions.push(result);
    this._recordHistory({ method: 'wittig' });
    return result;
  }

  /** Aldol condensation. 羟醛缩合 */
  aldol(enolateSource: string, electrophile: string): NamedReaction {
    const reaction = NAMED_REACTIONS['Aldol'];
    const result: NamedReaction = {
      ...reaction,
      reactants: [enolateSource, electrophile],
      products: ['beta-hydroxy carbonyl (aldol)'],
    };
    this._namedReactions.push(result);
    this._recordHistory({ method: 'aldol' });
    return result;
  }

  /** Claisen condensation (ester condensation). 克莱森缩合 */
  claisen(ester1: string, ester2: string): NamedReaction {
    const reaction = NAMED_REACTIONS['Claisen'];
    const result: NamedReaction = {
      ...reaction,
      reactants: [ester1, ester2],
      products: ['beta-keto ester'],
    };
    this._namedReactions.push(result);
    this._recordHistory({ method: 'claisen' });
    return result;
  }

  /** Cannizzaro disproportionation. 坎尼扎罗歧化反应 */
  cannizzaro(aldehyde: string): NamedReaction {
    const reaction = NAMED_REACTIONS['Cannizzaro'];
    const result: NamedReaction = {
      ...reaction,
      reactants: [aldehyde, 'concentrated base'],
      products: ['alcohol (reduced)', 'carboxylate (oxidized)'],
    };
    this._namedReactions.push(result);
    this._recordHistory({ method: 'cannizzaro' });
    return result;
  }

  /** Michael addition (conjugate addition). 迈克尔加成 */
  michael(donor: string, acceptor: string): NamedReaction {
    const reaction = NAMED_REACTIONS['Michael'];
    const result: NamedReaction = {
      ...reaction,
      reactants: [donor, acceptor],
      products: ['1,5-dicarbonyl'],
    };
    this._namedReactions.push(result);
    this._recordHistory({ method: 'michael' });
    return result;
  }

  /** Sandmeyer reaction (diazonium -> aryl halide). 桑德迈尔反应 */
  sandmeyer(diazonium: string, cuX: string): NamedReaction {
    const reaction = NAMED_REACTIONS['Sandmeyer'];
    const result: NamedReaction = {
      ...reaction,
      reactants: [diazonium, cuX],
      products: ['aryl halide + N2'],
    };
    this._namedReactions.push(result);
    this._recordHistory({ method: 'sandmeyer' });
    return result;
  }

  /** Williamson ether synthesis. 威廉姆逊醚合成 */
  williamson(alkoxide: string, alkylHalide: string): NamedReaction {
    const reaction = NAMED_REACTIONS['Williamson ether'];
    const result: NamedReaction = {
      ...reaction,
      reactants: [alkoxide, alkylHalide],
      products: ['ether + halide salt'],
    };
    this._namedReactions.push(result);
    this._recordHistory({ method: 'williamson' });
    return result;
  }

  /** Hofmann elimination of quaternary ammonium salts. 季铵盐的霍夫曼消除 */
  hofmannElimination(ammonium: string, base: string): NamedReaction {
    const reaction = NAMED_REACTIONS['Hofmann elimination'];
    const result: NamedReaction = {
      ...reaction,
      reactants: [ammonium, base],
      products: ['least substituted alkene (Hofmann)', 'tertiary amine'],
    };
    this._namedReactions.push(result);
    this._recordHistory({ method: 'hofmannElimination' });
    return result;
  }

  /** Stability order of carbocations. 碳正离子稳定性顺序 */
  carbocationStability(): IntermediateStability {
    this._recordHistory({ method: 'carbocationStability' });
    return {
      type: 'carbocation',
      order: ['methyl', 'primary', 'secondary', 'tertiary', 'allylic', 'benzylic'],
      explanation: 'Stabilized by hyperconjugation and inductive effects; resonance (allylic/benzylic) further stabilizes.',
    };
  }

  /** Stability order of carbanions. 碳负离子稳定性顺序 */
  carbanionStability(): IntermediateStability {
    this._recordHistory({ method: 'carbanionStability' });
    return {
      type: 'carbanion',
      order: ['tertiary', 'secondary', 'primary', 'methyl'],
      explanation: 'Alkyl groups donate electron density, destabilizing negative charge; opposite of carbocations.',
    };
  }

  /** Stability order of free radicals. 自由基稳定性顺序 */
  radicalStability(): IntermediateStability {
    this._recordHistory({ method: 'radicalStability' });
    return {
      type: 'radical',
      order: ['methyl', 'primary', 'secondary', 'tertiary', 'allylic', 'benzylic'],
      explanation: 'Stabilized by hyperconjugation and resonance; same trend as carbocations but less pronounced.',
    };
  }

  /** Degree of unsaturation (Index of Hydrogen Deficiency). 不饱和度（氢缺陷指数） */
  degreeOfUnsaturation(formula: string): DegreeOfUnsaturation {
    const c = (formula.match(/C(\d*)/)?.[1] ?? '1');
    const h = (formula.match(/H(\d*)/)?.[1] ?? '1');
    const n = (formula.match(/N(\d*)/)?.[1] ?? '0');
    const x = (formula.match(/(?:Cl|Br|F|I)(\d*)/)?.[1] ?? '0');
    const C = parseInt(c, 10) || 1;
    const H = parseInt(h, 10) || 1;
    const N = parseInt(n, 10) || 0;
    const X = parseInt(x, 10) || 0;
    const DoU = (2 * C + 2 + N - H - X) / 2;
    this._recordHistory({ method: 'degreeOfUnsaturation', DoU });
    return {
      formula,
      DoU,
      rings: 0,
      piBonds: DoU,
      explanation: `DoU = (2C + 2 + N - H - X) / 2 = (2*${C} + 2 + ${N} - ${H} - ${X}) / 2 = ${DoU}`,
    };
  }

  /** Huckel's rule for aromaticity: 4n+2 pi electrons. Hückel 规则（4n+2 π 电子） */
  huckelRule(piElectrons: number, cyclic: boolean = true, planar: boolean = true): boolean {
    if (!cyclic || !planar) return false;
    const isHuckel = (piElectrons - 2) >= 0 && (piElectrons - 2) % 4 === 0;
    this._recordHistory({ method: 'huckelRule', piElectrons, aromatic: isHuckel });
    return isHuckel;
  }

  /** Antiaromaticity check (4n pi electrons). 反芳香性检查（4n π 电子） */
  antiaromatic(piElectrons: number, cyclic: boolean = true, planar: boolean = true): boolean {
    if (!cyclic || !planar) return false;
    return piElectrons > 0 && piElectrons % 4 === 0;
  }

  /** Aromatic compound analysis. 芳香化合物分析 */
  aromaticCompound(name: string, piElectrons: number, ringCount: number = 1): AromaticCompound {
    const aromatic = this.huckelRule(piElectrons);
    const formula = name === 'benzene' ? 'C6H6'
      : name === 'naphthalene' ? 'C10H8'
      : name === 'anthracene' ? 'C14H10'
      : name === 'phenanthrene' ? 'C14H10'
      : 'unknown';
    const result: AromaticCompound = { name, formula, piElectrons, ringCount, aromatic };
    this._aromatics.push(result);
    this._recordHistory({ method: 'aromaticCompound', name });
    return result;
  }

  /** Heterocycle lookup. 杂环化合物查询 */
  heterocycle(name: string): Heterocycle | null {
    const result = HETEROCYCLES_DATABASE[name];
    if (result) {
      this._heterocycles.push(result);
      this._recordHistory({ method: 'heterocycle', name });
    }
    return result ?? null;
  }

  /** List all heterocycles in database. 列出所有杂环化合物 */
  listHeterocycles(): Heterocycle[] {
    return Object.values(HETEROCYCLES_DATABASE);
  }

  /** Polymer descriptor. 聚合物描述 */
  polymer(name: string, degreeOfPolymerization: number): Polymer {
    const db = POLYMER_DATABASE[name];
    const result: Polymer = {
      name,
      monomer: db?.monomer ?? 'unknown monomer',
      type: db?.type ?? 'addition',
      repeatUnit: db?.repeatUnit ?? 'unknown',
      degreeOfPolymerization,
    };
    this._polymers.push(result);
    this._recordHistory({ method: 'polymer', name });
    return result;
  }

  /** Number-average molecular weight Mn. 数均分子量 Mn */
  numberAverageMW(weights: number[]): number {
    if (weights.length === 0) return 0;
    const sum = weights.reduce((s, w) => s + w, 0);
    const mn = sum / weights.length;
    this._recordHistory({ method: 'numberAverageMW', mn });
    return mn;
  }

  /** Weight-average molecular weight Mw. 重均分子量 Mw */
  weightAverageMW(weights: number[]): number {
    if (weights.length === 0) return 0;
    const num = weights.reduce((s, w) => s + w * w, 0);
    const den = weights.reduce((s, w) => s + w, 0);
    if (den === 0) return 0;
    const mw = num / den;
    this._recordHistory({ method: 'weightAverageMW', mw });
    return mw;
  }

  /** Polydispersity index PDI = Mw/Mn. 多分散性指数 PDI */
  polydispersityIndex(mn: number, mw: number): number {
    if (mn === 0) return 0;
    const pdi = mw / mn;
    this._recordHistory({ method: 'polydispersityIndex', pdi });
    return pdi;
  }

  /** Predict major product of alkene + HX addition (Markovnikov). 预测烯烃与 HX 加成的主产物（马氏） */
  predictAdditionProduct(alkene: string, hx: string): ReactionPrediction {
    return this.markovnikov(alkene, hx);
  }

  /** Predict major product of elimination. 预测消除的主产物 */
  predictEliminationProduct(substrate: string, base: string, bulky: boolean = false): ReactionPrediction {
    return bulky ? this.hofmannRule(substrate, base) : this.zaitsevRule(substrate);
  }

  /** Identify functional groups in a compound name. 由化合物名称识别官能团 */
  identifyFunctionalGroup(name: string): string[] {
    const found: string[] = [];
    const lower = name.toLowerCase();
    if (lower.endsWith('ol')) found.push('alcohol');
    if (lower.endsWith('al') || lower.includes('aldehyde')) found.push('aldehyde');
    if (lower.endsWith('one')) found.push('ketone');
    if (lower.includes('oic acid')) found.push('carboxylic acid');
    if (lower.includes('oate')) found.push('ester');
    if (lower.endsWith('amine') || lower.includes('amino')) found.push('amine');
    if (lower.endsWith('ether')) found.push('ether');
    if (lower.endsWith('amide')) found.push('amide');
    if (lower.endsWith('nitrile') || lower.endsWith('cyanide')) found.push('nitrile');
    if (lower.endsWith('thiol') || lower.includes('mercaptan')) found.push('thiol');
    if (lower.endsWith('ene')) found.push('alkene');
    if (lower.endsWith('yne')) found.push('alkyne');
    if (lower.endsWith('ane')) found.push('alkane');
    if (lower.includes('benzene') || lower.includes('phenyl')) found.push('aromatic');
    if (lower.includes('anhydride')) found.push('anhydride');
    if (lower.endsWith('oyl chloride')) found.push('acyl chloride');
    if (lower.includes('nitro')) found.push('nitro');
    this._recordHistory({ method: 'identifyFunctionalGroup', name, found });
    return found;
  }

  /** Reactivity ranking of leaving groups. 离去基团反应性排序 */
  leavingGroupRanking(): Array<{ group: string; stability: string; rate: string }> {
    this._recordHistory({ method: 'leavingGroupRanking' });
    return [...LEAVING_GROUPS];
  }

  /** SN1 vs SN2 prediction based on substrate. 由底物预测 SN1 还是 SN2 */
  sn1OrSn2(substrate: 'methyl' | 'primary' | 'secondary' | 'tertiary' | 'allylic' | 'benzylic',
           solvent: 'protic' | 'aprotic'): { mechanism: 'SN1' | 'SN2'; reason: string } {
    if (substrate === 'tertiary' || ((substrate === 'allylic' || substrate === 'benzylic') && solvent === 'protic')) {
      return { mechanism: 'SN1', reason: 'Stable carbocation + polar protic solvent stabilizes intermediate.' };
    }
    if (substrate === 'methyl' || substrate === 'primary') {
      return { mechanism: 'SN2', reason: 'Backside attack favored; little steric hindrance.' };
    }
    if (substrate === 'secondary') {
      return solvent === 'aprotic'
        ? { mechanism: 'SN2', reason: 'Polar aprotic solvent enhances nucleophile; secondary borderline.' }
        : { mechanism: 'SN1', reason: 'Polar protic solvent stabilizes carbocation; secondary borderline.' };
    }
    return { mechanism: 'SN2', reason: 'Default SN2 for less hindered substrates.' };
  }

  /** E1 vs E2 prediction. E1 还是 E2 预测 */
  e1OrE2(substrate: 'primary' | 'secondary' | 'tertiary', baseStrength: 'weak' | 'strong'): { mechanism: 'E1' | 'E2'; reason: string } {
    if (substrate === 'tertiary' && baseStrength === 'weak') {
      return { mechanism: 'E1', reason: 'Tertiary carbocation stabilized; weak base favors unimolecular path.' };
    }
    return { mechanism: 'E2', reason: 'Strong base drives concerted elimination.' };
  }

  /** Combustion analysis of organic compound: CxHy + O2 -> CO2 + H2O. 有机物燃烧分析 */
  combustion(moles: number, co2: number, h2o: number): { c: number; h: number; formula: string } {
    const c = co2;
    const h = 2 * h2o;
    const formula = `C${c}H${h}`;
    this._recordHistory({ method: 'combustion', moles, formula });
    return { c, h, formula };
  }

  /** Heat of combustion estimate (kJ/mol, negative). 燃烧热估算（kJ/mol，负值） */
  heatOfCombustion(carbons: number, hasOxygen: boolean = false): number {
    const base = -660 * (carbons - 1) - 890;
    const correction = hasOxygen ? 0 : -50;
    this._recordHistory({ method: 'heatOfCombustion' });
    return base + correction;
  }

  /** Bond energy calculation for a reaction. 反应键能计算 */
  reactionEnergy(bondsBroken: string[], bondsFormed: string[]): { energyIn: number; energyOut: number; deltaH: number } {
    let energyIn = 0;
    let energyOut = 0;
    for (const b of bondsBroken) energyIn += BOND_ENERGIES_ORGANIC[b] ?? 0;
    for (const b of bondsFormed) energyOut += BOND_ENERGIES_ORGANIC[b] ?? 0;
    const deltaH = energyIn - energyOut;
    this._recordHistory({ method: 'reactionEnergy', deltaH });
    return { energyIn, energyOut, deltaH };
  }

  /** Acidity of organic compounds (pKa estimate). 有机物酸性估算（pKa） */
  pKaEstimate(functionalGroup: 'alcohol' | 'carboxylic acid' | 'phenol' | 'amine' | 'thiol' | 'alpha-hydrogen' | 'beta-dicarbonyl'): number {
    const pKaTable: Record<string, number> = {
      'alcohol': 16,
      'carboxylic acid': 4.75,
      'phenol': 10,
      'amine': 38,
      'thiol': 10.5,
      'alpha-hydrogen': 20,
      'beta-dicarbonyl': 9,
    };
    const pKa = pKaTable[functionalGroup] ?? 0;
    this._recordHistory({ method: 'pKaEstimate', functionalGroup, pKa });
    return pKa;
  }

  /** Acidity comparison: stronger acid has lower pKa. 酸性比较：pKa 越低酸性越强 */
  strongerAcid(pKa1: number, pKa2: number): string {
    return pKa1 < pKa2 ? 'acid1' : 'acid2';
  }

  /** Inductive effect on acidity. 诱导效应对酸性的影响 */
  inductiveEffectOnAcidity(substituents: string[]): { effect: string; pKaShift: number } {
    let pKaShift = 0;
    for (const sub of substituents) {
      const ewg: Record<string, number> = { 'F': -1.5, 'Cl': -1.0, 'Br': -0.8, 'I': -0.5, 'NO2': -2.5, 'CN': -1.5, 'OH': -1.0 };
      const edg: Record<string, number> = { 'CH3': 0.4, 'C2H5': 0.5, 'OCH3': 0.3, 'NH2': 0.5 };
      pKaShift += ewg[sub] ?? edg[sub] ?? 0;
    }
    const effect = pKaShift < 0 ? 'EWG (stabilizes conjugate base, increases acidity)' : 'EDG (decreases acidity)';
    this._recordHistory({ method: 'inductiveEffectOnAcidity', pKaShift });
    return { effect, pKaShift };
  }

  /** Resonance effect on acidity/stability. 共振效应对酸性/稳定性的影响 */
  resonanceStabilization(compound: string): { stabilized: boolean; description: string } {
    const resonanceCompounds = ['carboxylate', 'phenoxide', 'enolate', 'allylic', 'benzylic', 'amide', 'ester enolate'];
    const stabilized = resonanceCompounds.some(c => compound.toLowerCase().includes(c));
    return {
      stabilized,
      description: stabilized
        ? 'Resonance delocalizes charge, stabilizing the conjugate base.'
        : 'No significant resonance stabilization.',
    };
  }

  /** Tautomerism: keto-enol equilibrium. 互变异构：酮-烯醇平衡 */
  ketoEnolTautomerism(ketone: string, alphaHydrogens: number): { enolForm: string; ketoneForm: string; equilibrium: number } {
    const enolForm = `enol form of ${ketone}`;
    const equilibrium = alphaHydrogens > 0 ? 0.001 : 0;
    this._recordHistory({ method: 'ketoEnolTautomerism' });
    return { enolForm, ketoneForm: ketone, equilibrium };
  }

  /** Common oxidation levels for organic carbon. 有机碳的常见氧化态 */
  oxidationState(carbonEnv: 'alkane' | 'alkene' | 'alkyne' | 'alcohol' | 'aldehyde' | 'carboxylic acid' | 'CO2'): number {
    const states: Record<string, number> = {
      'alkane': -3, 'alkene': -2, 'alkyne': -1,
      'alcohol': -1, 'aldehyde': +1, 'carboxylic acid': +3, 'CO2': +4,
    };
    return states[carbonEnv] ?? 0;
  }

  /** Common organic solvents polarity index. 常见有机溶剂极性指数 */
  solventPolarity(): Record<string, number> {
    return {
      'hexane': 0.0, 'toluene': 2.4, 'diethyl ether': 2.8, 'THF': 4.0,
      'chloroform': 4.1, 'ethyl acetate': 4.4, 'acetone': 5.1,
      'ethanol': 5.2, 'methanol': 5.1, 'water': 9.0, 'DMSO': 7.2,
    };
  }

  /** Reactivity of substituents on benzene (ortho/para vs meta directors). 苯环取代基定位效应 */
  directingEffect(substituent: string): { director: 'ortho-para' | 'meta'; activation: 'activating' | 'deactivating' } {
    const opActivating = ['OH', 'OR', 'NH2', 'NHR', 'NR2', 'CH3', 'C2H5', 'Ph', 'OCOR', 'NHCOR'];
    const opDeactivating = ['F', 'Cl', 'Br', 'I'];
    const metaDeactivating = ['NO2', 'CN', 'SO3H', 'CHO', 'COR', 'COOH', 'COOR', 'CF3'];
    if (opActivating.includes(substituent)) {
      return { director: 'ortho-para', activation: 'activating' };
    }
    if (opDeactivating.includes(substituent)) {
      return { director: 'ortho-para', activation: 'deactivating' };
    }
    if (metaDeactivating.includes(substituent)) {
      return { director: 'meta', activation: 'deactivating' };
    }
    return { director: 'ortho-para', activation: 'activating' };
  }

  /** Reaction of alcohol oxidation: primary->aldehyde->acid; secondary->ketone; tertiary->no reaction. 醇的氧化反应 */
  alcoholOxidation(type: 'primary' | 'secondary' | 'tertiary', oxidant: string): { product: string; further: string } {
    if (type === 'primary') {
      return { product: 'aldehyde (mild oxidant like PCC)', further: 'carboxylic acid (strong oxidant like KMnO4)' };
    }
    if (type === 'secondary') {
      return { product: 'ketone', further: 'no further oxidation (no alpha-H on carbonyl C)' };
    }
    return { product: 'no reaction (tertiary alcohol lacks alpha-H)', further: 'strong oxidant causes C-C cleavage' };
  }

  /** Reaction of aldehydes/ketones with 2,4-DNP (test for carbonyl). 醛/酮与 2,4-二硝基苯肼反应（羰基检验） */
  carbonylTest(compound: string): { positive: boolean; product: string } {
    const isCarbonyl = /al|one|aldehyde|ketone/i.test(compound);
    return {
      positive: isCarbonyl,
      product: isCarbonyl ? '2,4-dinitrophenylhydrazone (orange/yellow precipitate)' : 'no reaction',
    };
  }

  /** Tollens' test for aldehydes (silver mirror). 醛的银镜反应（Tollens 试剂） */
  tollensTest(compound: string): { positive: boolean; product: string } {
    const isAldehyde = /al$|aldehyde/i.test(compound);
    return {
      positive: isAldehyde,
      product: isAldehyde ? 'silver mirror (Ag) + carboxylate' : 'no reaction (ketones do not reduce Tollens)',
    };
  }

  /** Lucas test for alcohol classification. 醇的卢卡斯试剂分类 */
  lucasTest(type: 'primary' | 'secondary' | 'tertiary'): { observation: string; rate: string } {
    if (type === 'tertiary') return { observation: 'immediate turbidity', rate: 'fast' };
    if (type === 'secondary') return { observation: 'turbidity within 5 minutes', rate: 'moderate' };
    return { observation: 'no reaction at room temperature', rate: 'slow' };
  }

  /** Identify an unknown organic compound from formula and tests. 由分子式和试验鉴别有机物 */
  identifyCompound(formula: string, tests: Record<string, boolean>): string {
    if (tests.tollens) return 'aldehyde';
    if (tests['2,4-DNP']) return 'aldehyde or ketone';
    if (tests.lucas) return 'alcohol (secondary or tertiary)';
    if (tests.ninhydrin) return 'amine or amino acid';
    if (tests.bromine) return 'alkene or alkyne (unsaturated)';
    if (tests.baeyer) return 'alkene or alkyne (unsaturated)';
    if (tests.feCl3) return 'phenol or enol';
    if (tests.naHCO3) return 'carboxylic acid';
    const m = formula.match(/C(\d+)/);
    const n = m ? parseInt(m[1], 10) : 0;
    if (n > 0) return `alkane or aromatic (C${n})`;
    return 'unknown';
  }

  /** Reaction of alkene with Br2 (decolorization test). 烯烃与溴反应（褪色试验） */
  bromineTest(compound: string): { positive: boolean; product: string } {
    const isUnsaturated = /ene|yne|alkene|alkyne/i.test(compound);
    return {
      positive: isUnsaturated,
      product: isUnsaturated ? 'vicinal dibromide (colorless)' : 'no reaction (orange color persists)',
    };
  }

  /** Saponification of ester: ester + base -> carboxylate + alcohol. 酯的皂化反应 */
  saponification(ester: string, base: string): OrganicReaction {
    const r: OrganicReaction = {
      type: 'saponification',
      mechanism: `${ester} + ${base} -> carboxylate salt + alcohol`,
    };
    this._reactions.push(r);
    this._recordHistory({ method: 'saponification' });
    return r;
  }

  /** Esterification: carboxylic acid + alcohol -> ester + water (Fischer). 酯化反应（Fischer 法） */
  esterification(acid: string, alcohol: string): OrganicReaction {
    const r: OrganicReaction = {
      type: 'esterification',
      mechanism: `${acid} + ${alcohol} <-> ester + H2O (H+ catalyst, Fischer esterification)`,
    };
    this._reactions.push(r);
    this._recordHistory({ method: 'esterification' });
    return r;
  }

  /** Reaction of carboxylic acid with base. 羧酸与碱反应 */
  acidBaseNeutralization(acid: string, base: string): OrganicReaction {
    const r: OrganicReaction = {
      type: 'acid-base',
      mechanism: `${acid} + ${base} -> carboxylate salt + water`,
    };
    this._reactions.push(r);
    this._recordHistory({ method: 'neutralization' });
    return r;
  }

  /** Reaction of amines as bases (with acids). 胺作为碱与酸反应 */
  amineBasicity(amine: string, acid: string): OrganicReaction {
    const r: OrganicReaction = {
      type: 'amine-basicity',
      mechanism: `${amine} + ${acid} -> ammonium salt`,
    };
    this._reactions.push(r);
    this._recordHistory({ method: 'amineBasicity' });
    return r;
  }

  /** Hofmann rearrangement: amide -> amine (loss of CO). 霍夫曼重排反应 */
  hofmannRearrangement(amide: string): OrganicReaction {
    const r: OrganicReaction = {
      type: 'rearrangement',
      mechanism: `${amide} + Br2 + base -> amine (one fewer carbon) + CO2`,
    };
    this._reactions.push(r);
    this._recordHistory({ method: 'hofmannRearrangement' });
    return r;
  }

  /** Beckmann rearrangement: oxime -> amide. 贝克曼重排反应 */
  beckmannRearrangement(oxime: string): OrganicReaction {
    const r: OrganicReaction = {
      type: 'rearrangement',
      mechanism: `${oxime} + H+ -> amide (via 1,2-shift)`,
    };
    this._reactions.push(r);
    this._recordHistory({ method: 'beckmannRearrangement' });
    return r;
  }

  /** Wolff-Kishner reduction: carbonyl -> CH2. Wolff-Kishner 还原反应 */
  wolffKishner(carbonyl: string): OrganicReaction {
    const r: OrganicReaction = {
      type: 'reduction',
      mechanism: `${carbonyl} + N2H4 + KOH (high T) -> methylene (CH2) + N2`,
    };
    this._reactions.push(r);
    this._recordHistory({ method: 'wolffKishner' });
    return r;
  }

  /** Clemmensen reduction: carbonyl -> CH2 (Zn/Hg, HCl). Clemmensen 还原反应 */
  clemmensen(carbonyl: string): OrganicReaction {
    const r: OrganicReaction = {
      type: 'reduction',
      mechanism: `${carbonyl} + Zn(Hg)/HCl -> methylene (CH2)`,
    };
    this._reactions.push(r);
    this._recordHistory({ method: 'clemmensen' });
    return r;
  }

  /** Common organic compounds lookup. 常见有机化合物查询 */
  lookupCompound(name: string): { formula: string; molarMass: number; category: string } | null {
    return COMMON_ORGANIC_COMPOUNDS[name] ?? null;
  }

  /** List functional groups in database. 列出官能团数据库 */
  listFunctionalGroups(): FunctionalGroup[] {
    return [...this._groups];
  }

  /** Cahn-Ingold-Prelog priority (heuristic by atomic number of attached atom). CIP 优先级（按原子序数） */
  cipPriority(atoms: string[]): string[] {
    const atomicNumber: Record<string, number> = {
      'H': 1, 'C': 6, 'N': 7, 'O': 8, 'F': 9, 'P': 15, 'S': 16,
      'Cl': 17, 'Br': 35, 'I': 53,
    };
    return [...atoms].sort((a, b) => (atomicNumber[b] ?? 0) - (atomicNumber[a] ?? 0));
  }

  /** Chiral center detection heuristic (sp3 C with 4 different groups). 手性中心检测启发式 */
  chiralCenter(carbon: string, groups: string[]): boolean {
    if (groups.length !== 4) return false;
    const unique = new Set(groups);
    return unique.size === 4 && /C/i.test(carbon);
  }

  /** Alkyl halide classification (methyl/1/2/3). 卤代烷分类（甲基/伯/仲/叔） */
  alkylHalideClass(carbonAttachedToHalogen: 'methyl' | 'primary' | 'secondary' | 'tertiary'): string {
    return carbonAttachedToHalogen;
  }

  /** Reactivity order of alkyl halides in SN2. 卤代烷在 SN2 中的反应性顺序 */
  sn2ReactivityOrder(): string[] {
    return ['methyl > primary > secondary >> tertiary (steric hindrance)'];
  }

  /** Reactivity order of alkyl halides in SN1. 卤代烷在 SN1 中的反应性顺序 */
  sn1ReactivityOrder(): string[] {
    return ['tertiary > secondary > primary > methyl (carbocation stability)'];
  }

  /** Nucleophile strength ranking (typical). 亲核试剂强度排序（典型） */
  nucleophileStrength(): Record<string, string> {
    return {
      'I-': 'strong', 'Br-': 'strong', 'Cl-': 'moderate', 'F-': 'weak',
      'HS-': 'strong', 'CN-': 'strong', 'OH-': 'moderate', 'H2O': 'weak',
      'NH3': 'moderate', 'RO-': 'strong', 'RS-': 'strong',
    };
  }

  /** Base strength ranking (typical). 碱强度排序（典型） */
  baseStrength(): Record<string, string> {
    return {
      'NaH': 'very strong', 'LDA': 'very strong', 'NaOH': 'strong',
      'KOH': 'strong', 'NaOEt': 'moderate', 'NaOMe': 'moderate',
      'NaHCO3': 'weak', 'pyridine': 'weak', 'Et3N': 'moderate',
    };
  }

  /** Reaction of alkynes with sodium in liquid ammonia (anti reduction). 炔与钠/液氨反应（反式还原） */
  dissolvingMetalReduction(alkyne: string): OrganicReaction {
    const r: OrganicReaction = {
      type: 'reduction',
      mechanism: `${alkyne} + Na/NH3(l) -> trans-alkene`,
    };
    this._reactions.push(r);
    this._recordHistory({ method: 'dissolvingMetalReduction' });
    return r;
  }

  /** Catalytic hydrogenation: alkene + H2/Pd -> alkane. 催化加氢反应 */
  hydrogenation(alkene: string, catalyst: string = 'Pd'): OrganicReaction {
    const r: OrganicReaction = {
      type: 'reduction',
      mechanism: `${alkene} + H2 / ${catalyst} -> alkane (syn addition)`,
    };
    this._reactions.push(r);
    this._recordHistory({ method: 'hydrogenation' });
    return r;
  }

  /** Hydroboration-oxidation: anti-Markovnikov hydration of alkene. 硼氢化-氧化反应 */
  hydroborationOxidation(alkene: string): OrganicReaction {
    const r: OrganicReaction = {
      type: 'addition',
      mechanism: `${alkene} + BH3, then H2O2/NaOH -> anti-Markovnikov alcohol (syn addition)`,
    };
    this._reactions.push(r);
    this._recordHistory({ method: 'hydroborationOxidation' });
    return r;
  }

  /** Oxymercuration-demercuration: Markovnikov hydration without rearrangement. 羟汞化-脱汞反应 */
  oxymercuration(alkene: string): OrganicReaction {
    const r: OrganicReaction = {
      type: 'addition',
      mechanism: `${alkene} + Hg(OAc)2/H2O, then NaBH4 -> Markovnikov alcohol (no rearrangement)`,
    };
    this._reactions.push(r);
    this._recordHistory({ method: 'oxymercuration' });
    return r;
  }

  /** Ozonolysis of alkene: cleavage to carbonyls. 臭氧分解反应 */
  ozonolysis(alkene: string): OrganicReaction {
    const r: OrganicReaction = {
      type: 'oxidative cleavage',
      mechanism: `${alkene} + O3, then Zn/H2O or Me2S -> two carbonyl fragments`,
    };
    this._reactions.push(r);
    this._recordHistory({ method: 'ozonolysis' });
    return r;
  }

  /** Halogen addition to alkene: anti addition giving vicinal dihalide. 卤素与烯烃的反式加成 */
  halogenation(alkene: string, halogen: string): OrganicReaction {
    const r: OrganicReaction = {
      type: 'addition',
      mechanism: `${alkene} + ${halogen}2 -> vicinal dihalide (anti addition via bromonium ion)`,
    };
    this._reactions.push(r);
    this._recordHistory({ method: 'halogenation' });
    return r;
  }

  /** Hydration of alkene via acid catalysis (Markovnikov). 烯烃的酸催化水合（马氏） */
  acidCatalyzedHydration(alkene: string): OrganicReaction {
    const r: OrganicReaction = {
      type: 'addition',
      mechanism: `${alkene} + H2O / H+ -> Markovnikov alcohol (via carbocation)`,
    };
    this._reactions.push(r);
    this._recordHistory({ method: 'acidCatalyzedHydration' });
    return r;
  }

  /** Pinacol rearrangement: vicinal diol -> ketone. 频哪醇重排 */
  pinacolRearrangement(diol: string): OrganicReaction {
    const r: OrganicReaction = {
      type: 'rearrangement',
      mechanism: `${diol} + H+ -> ketone/aldehyde (1,2-methyl/aryl shift)`,
    };
    this._reactions.push(r);
    this._recordHistory({ method: 'pinacolRearrangement' });
    return r;
  }

  /** Baeyer-Villiger oxidation: ketone + peracid -> ester. Baeyer-Villiger 氧化反应 */
  baeyerVilliger(ketone: string): OrganicReaction {
    const r: OrganicReaction = {
      type: 'oxidation',
      mechanism: `${ketone} + mCPBA -> ester (oxygen insertion)`,
    };
    this._reactions.push(r);
    this._recordHistory({ method: 'baeyerVilliger' });
    return r;
  }

  /** Hell-Volhard-Zelinsky reaction: alpha-halogenation of carboxylic acids. HVZ 反应 */
  hvzReaction(acid: string): OrganicReaction {
    const r: OrganicReaction = {
      type: 'alpha-substitution',
      mechanism: `${acid} + Br2/PBr3 -> alpha-bromo carboxylic acid`,
    };
    this._reactions.push(r);
    this._recordHistory({ method: 'hvzReaction' });
    return r;
  }

  /** Gabriel synthesis of primary amines. Gabriel 伯胺合成法 */
  gabrielSynthesis(alkylHalide: string): OrganicReaction {
    const r: OrganicReaction = {
      type: 'substitution',
      mechanism: `${alkylHalide} + phthalimide -> primary amine (avoids over-alkylation)`,
    };
    this._reactions.push(r);
    this._recordHistory({ method: 'gabrielSynthesis' });
    return r;
  }

  /** Lassaigne's test for nitrogen, sulfur, halogens. 钠熔法（氮/硫/卤素检验） */
  lassaigneTest(element: 'N' | 'S' | 'Cl' | 'Br' | 'I'): { reagent: string; observation: string } {
    const tests: Record<string, { reagent: string; observation: string }> = {
      'N': { reagent: 'FeSO4 + FeCl3 + HCl', observation: 'Prussian blue color' },
      'S': { reagent: 'sodium nitroprusside', observation: 'purple color' },
      'Cl': { reagent: 'AgNO3 + HNO3', observation: 'white precipitate (AgCl)' },
      'Br': { reagent: 'AgNO3 + HNO3', observation: 'pale yellow precipitate (AgBr)' },
      'I': { reagent: 'AgNO3 + HNO3', observation: 'yellow precipitate (AgI)' },
    };
    this._recordHistory({ method: 'lassaigneTest', element });
    return tests[element];
  }

  /** Cahn-Ingold-Prelog priority with stereo descriptors. CIP 优先级与立体描述符 */
  stereoDescriptor(center: string, groups: string[]): Stereochemistry {
    const priority = this.cipPriority(groups);
    const configuration = this.rsConfiguration(priority);
    const result: Stereochemistry = {
      center,
      configuration,
      opticalActivity: 0,
      enantiomer: configuration === 'R' ? 'S' : 'R',
    };
    this._stereo.push(result);
    this._recordHistory({ method: 'stereoDescriptor' });
    return result;
  }

  toPacket(): DataPacket<{
    groups: FunctionalGroup[];
    isomers: Isomer[];
    reactions: OrganicReaction[];
    mechanisms: MechanismStep[][];
    polymers: Polymer[];
    aromatics: AromaticCompound[];
    heterocycles: Heterocycle[];
    namedReactions: NamedReaction[];
    stereo: Stereochemistry[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['chemistry', 'OrganicChemistry'],
      priority: 1,
      phase: 'chemistry:organic',
    };
    return {
      id: `org-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        groups: this._groups,
        isomers: this._isomers,
        reactions: this._reactions,
        mechanisms: this._mechanisms,
        polymers: this._polymers,
        aromatics: this._aromatics,
        heterocycles: this._heterocycles,
        namedReactions: this._namedReactions,
        stereo: this._stereo,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._groups = [];
    this._isomers = [];
    this._reactions = [];
    this._mechanisms = [];
    this._polymers = [];
    this._aromatics = [];
    this._heterocycles = [];
    this._namedReactions = [];
    this._stereo = [];
    this._history = [];
    this._counter = 0;
    this._seedFunctionalGroups();
  }

  get groupCount(): number {
    return this._groups.length;
  }

  get isomerCountList(): number {
    return this._isomers.length;
  }

  get reactionCount(): number {
    return this._reactions.length;
  }

  get mechanismCount(): number {
    return this._mechanisms.length;
  }

  get polymerCount(): number {
    return this._polymers.length;
  }

  get aromaticCount(): number {
    return this._aromatics.length;
  }

  get heterocycleCount(): number {
    return this._heterocycles.length;
  }

  get namedReactionCount(): number {
    return this._namedReactions.length;
  }

  get historyDepth(): number {
    return this._history.length;
  }
}
