import { DataPacket, PacketMeta } from '../shared/types';

/** Enzyme descriptor. */
export interface Enzyme {
  name: string;
  substrate: string;
  km: number;
  vmax: number;
}

/** Metabolic pathway descriptor. */
export interface MetabolicPathway {
  steps: Array<{ enzyme: string; substrate: string; product: string }>;
  inputs: string[];
  outputs: string[];
}

/** Protein structure level. */
export interface ProteinStructure {
  level: 'primary' | 'secondary' | 'tertiary' | 'quaternary';
  description: string;
  features: string[];
}

/** Amino acid property record. */
export interface AminoAcidProperty {
  code: string;
  name: string;
  threeLetter: string;
  mw: number; // g/mol (residue mass after dehydration)
  pKaSideChain: number | null;
  hydrophobicity: number; // Kyte-Doolittle scale
  polar: boolean;
  charged: boolean;
  essential: boolean;
}

/** Vitamin descriptor. */
export interface Vitamin {
  name: string;
  soluble: 'water' | 'fat';
  activeForm: string;
  function: string;
  deficiency: string;
  rda: number; // recommended daily allowance, mg
}

/** Coenzyme / cofactor. */
export interface Coenzyme {
  name: string;
  abbreviation: string;
  vitaminPrecursor: string;
  role: string;
  reactionType: string;
}

/** Buffer system for pH calculations. */
export interface BufferSystem {
  name: string;
  acid: string;
  conjugateBase: string;
  pKa: number;
  usefulRange: [number, number];
}

/** Redox couple for bioenergetics. */
export interface RedoxCouple {
  name: string;
  oxidized: string;
  reduced: string;
  e0: number; // standard reduction potential in volts
  electrons: number;
}

/** Thermodynamic quantity. */
export interface ThermodynamicValue {
  reaction: string;
  dG0: number; // kJ/mol
  dH0: number; // kJ/mol
  dS0: number; // J/(mol·K)
}

/** Post-translational modification. */
export interface PostTranslationalModification {
  name: string;
  targetResidue: string;
  enzyme: string;
  function: string;
  reversible: boolean;
}

/** Lipid type descriptor. */
export interface LipidType {
  name: string;
  class: 'phospholipid' | 'sphingolipid' | 'sterol' | 'glycerolipid' | 'eicosanoid';
  components: string[];
  charge: number;
  bilayer: boolean;
}

/** Carbohydrate descriptor. */
export interface Carbohydrate {
  name: string;
  formula: string;
  monomers: number; // 1 = mono, 2 = di, etc.
  isomer: 'D' | 'L';
  ringForm: 'pyranose' | 'furanose' | 'open';
}

/** Nucleotide base pair. */
export interface NucleotideBase {
  name: string;
  symbol: string;
  ringType: 'purine' | 'pyrimidine';
  pairsWith: string;
  mw: number;
}

/** History record. */
interface BiochemistryRecord {
  method: string;
  target: string;
  timestamp: number;
}

/** Amino acid properties table (Kyte-Doolittle hydrophobicity). */
const AMINO_ACID_PROPERTIES: AminoAcidProperty[] = [
  { code: 'A', name: 'Alanine', threeLetter: 'Ala', mw: 71.08, pKaSideChain: null, hydrophobicity: 1.8, polar: false, charged: false, essential: false },
  { code: 'R', name: 'Arginine', threeLetter: 'Arg', mw: 156.19, pKaSideChain: 12.48, hydrophobicity: -4.5, polar: true, charged: true, essential: true },
  { code: 'N', name: 'Asparagine', threeLetter: 'Asn', mw: 114.10, pKaSideChain: null, hydrophobicity: -3.5, polar: true, charged: false, essential: false },
  { code: 'D', name: 'Aspartate', threeLetter: 'Asp', mw: 115.09, pKaSideChain: 3.65, hydrophobicity: -3.5, polar: true, charged: true, essential: false },
  { code: 'C', name: 'Cysteine', threeLetter: 'Cys', mw: 103.14, pKaSideChain: 8.18, hydrophobicity: 2.5, polar: true, charged: false, essential: false },
  { code: 'E', name: 'Glutamate', threeLetter: 'Glu', mw: 129.12, pKaSideChain: 4.25, hydrophobicity: -3.5, polar: true, charged: true, essential: false },
  { code: 'Q', name: 'Glutamine', threeLetter: 'Gln', mw: 128.13, pKaSideChain: null, hydrophobicity: -3.5, polar: true, charged: false, essential: false },
  { code: 'G', name: 'Glycine', threeLetter: 'Gly', mw: 57.05, pKaSideChain: null, hydrophobicity: -0.4, polar: false, charged: false, essential: false },
  { code: 'H', name: 'Histidine', threeLetter: 'His', mw: 137.14, pKaSideChain: 6.00, hydrophobicity: -3.2, polar: true, charged: true, essential: true },
  { code: 'I', name: 'Isoleucine', threeLetter: 'Ile', mw: 113.16, pKaSideChain: null, hydrophobicity: 4.5, polar: false, charged: false, essential: true },
  { code: 'L', name: 'Leucine', threeLetter: 'Leu', mw: 113.16, pKaSideChain: null, hydrophobicity: 3.8, polar: false, charged: false, essential: true },
  { code: 'K', name: 'Lysine', threeLetter: 'Lys', mw: 128.17, pKaSideChain: 10.53, hydrophobicity: -3.9, polar: true, charged: true, essential: true },
  { code: 'M', name: 'Methionine', threeLetter: 'Met', mw: 131.19, pKaSideChain: null, hydrophobicity: 1.9, polar: false, charged: false, essential: true },
  { code: 'F', name: 'Phenylalanine', threeLetter: 'Phe', mw: 147.18, pKaSideChain: null, hydrophobicity: 2.8, polar: false, charged: false, essential: true },
  { code: 'P', name: 'Proline', threeLetter: 'Pro', mw: 97.12, pKaSideChain: null, hydrophobicity: -1.6, polar: false, charged: false, essential: false },
  { code: 'S', name: 'Serine', threeLetter: 'Ser', mw: 87.08, pKaSideChain: null, hydrophobicity: -0.8, polar: true, charged: false, essential: false },
  { code: 'T', name: 'Threonine', threeLetter: 'Thr', mw: 101.10, pKaSideChain: null, hydrophobicity: -0.7, polar: true, charged: false, essential: true },
  { code: 'W', name: 'Tryptophan', threeLetter: 'Trp', mw: 186.21, pKaSideChain: null, hydrophobicity: -0.9, polar: true, charged: false, essential: true },
  { code: 'Y', name: 'Tyrosine', threeLetter: 'Tyr', mw: 163.18, pKaSideChain: 10.07, hydrophobicity: -1.3, polar: true, charged: false, essential: false },
  { code: 'V', name: 'Valine', threeLetter: 'Val', mw: 99.13, pKaSideChain: null, hydrophobicity: 4.2, polar: false, charged: false, essential: true },
];

const VITAMINS: Vitamin[] = [
  { name: 'A (retinol)', soluble: 'fat', activeForm: 'retinal', function: 'vision, retinal pigment', deficiency: 'night blindness', rda: 0.9 },
  { name: 'C (ascorbic acid)', soluble: 'water', activeForm: 'ascorbate', function: 'collagen hydroxylation, antioxidant', deficiency: 'scurvy', rda: 90 },
  { name: 'D (calciferol)', soluble: 'fat', activeForm: 'calcitriol', function: 'calcium homeostasis', deficiency: 'rickets, osteomalacia', rda: 0.015 },
  { name: 'E (tocopherol)', soluble: 'fat', activeForm: 'alpha-tocopherol', function: 'lipid antioxidant', deficiency: 'hemolytic anemia', rda: 15 },
  { name: 'K (phylloquinone)', soluble: 'fat', activeForm: 'hydroquinone', function: 'blood clotting, gamma-carboxylation', deficiency: 'bleeding', rda: 0.12 },
  { name: 'B1 (thiamine)', soluble: 'water', activeForm: 'TPP', function: 'decarboxylation', deficiency: 'beriberi', rda: 1.2 },
  { name: 'B2 (riboflavin)', soluble: 'water', activeForm: 'FAD', function: 'redox cofactor', deficiency: 'ariboflavinosis', rda: 1.3 },
  { name: 'B3 (niacin)', soluble: 'water', activeForm: 'NAD+ / NADP+', function: 'redox cofactor', deficiency: 'pellagra', rda: 16 },
  { name: 'B5 (pantothenic acid)', soluble: 'water', activeForm: 'CoA', function: 'acyl group transfer', deficiency: 'paresthesia', rda: 5 },
  { name: 'B6 (pyridoxine)', soluble: 'water', activeForm: 'PLP', function: 'amino acid metabolism', deficiency: 'dermatitis', rda: 1.3 },
  { name: 'B7 (biotin)', soluble: 'water', activeForm: 'biocytin', function: 'carboxylation', deficiency: 'dermatitis', rda: 0.03 },
  { name: 'B9 (folate)', soluble: 'water', activeForm: 'THF', function: 'one-carbon transfer', deficiency: 'megaloblastic anemia', rda: 0.4 },
  { name: 'B12 (cobalamin)', soluble: 'water', activeForm: 'methylcobalamin', function: 'methyl transfer', deficiency: 'pernicious anemia', rda: 0.0024 },
];

const COENZYMES: Coenzyme[] = [
  { name: 'Nicotinamide adenine dinucleotide', abbreviation: 'NAD+', vitaminPrecursor: 'B3 (niacin)', role: 'electron carrier', reactionType: 'redox' },
  { name: 'Nicotinamide adenine dinucleotide phosphate', abbreviation: 'NADP+', vitaminPrecursor: 'B3 (niacin)', role: 'reductive biosynthesis', reactionType: 'redox' },
  { name: 'Flavin adenine dinucleotide', abbreviation: 'FAD', vitaminPrecursor: 'B2 (riboflavin)', role: 'electron carrier', reactionType: 'redox' },
  { name: 'Flavin mononucleotide', abbreviation: 'FMN', vitaminPrecursor: 'B2 (riboflavin)', role: 'electron carrier', reactionType: 'redox' },
  { name: 'Coenzyme A', abbreviation: 'CoA', vitaminPrecursor: 'B5 (pantothenic acid)', role: 'acyl transfer', reactionType: 'transfer' },
  { name: 'Thiamine pyrophosphate', abbreviation: 'TPP', vitaminPrecursor: 'B1 (thiamine)', role: 'decarboxylation', reactionType: 'cleavage' },
  { name: 'Pyridoxal phosphate', abbreviation: 'PLP', vitaminPrecursor: 'B6 (pyridoxine)', role: 'amino acid transfer', reactionType: 'transfer' },
  { name: 'Biotin', abbreviation: 'Btn', vitaminPrecursor: 'B7 (biotin)', role: 'carboxylation', reactionType: 'carboxylation' },
  { name: 'Tetrahydrofolate', abbreviation: 'THF', vitaminPrecursor: 'B9 (folate)', role: 'one-carbon transfer', reactionType: 'transfer' },
  { name: 'Adenosylcobalamin', abbreviation: 'AdoCbl', vitaminPrecursor: 'B12 (cobalamin)', role: 'methylmalonyl rearrangement', reactionType: 'rearrangement' },
  { name: 'S-adenosylmethionine', abbreviation: 'SAM', vitaminPrecursor: 'methionine', role: 'methyl donor', reactionType: 'methylation' },
  { name: 'Ubiquinone', abbreviation: 'CoQ', vitaminPrecursor: 'synthesized in body', role: 'electron transport', reactionType: 'redox' },
];

const BUFFER_SYSTEMS: BufferSystem[] = [
  { name: 'Phosphate', acid: 'H2PO4-', conjugateBase: 'HPO4^2-', pKa: 6.86, usefulRange: [5.86, 7.86] },
  { name: 'HEPES', acid: 'HEPES-H', conjugateBase: 'HEPES-', pKa: 7.5, usefulRange: [6.5, 8.5] },
  { name: 'Tris', acid: 'Tris-H+', conjugateBase: 'Tris', pKa: 8.06, usefulRange: [7.06, 9.06] },
  { name: 'Bicarbonate', acid: 'H2CO3', conjugateBase: 'HCO3-', pKa: 6.35, usefulRange: [5.35, 7.35] },
  { name: 'MOPS', acid: 'MOPS-H', conjugateBase: 'MOPS-', pKa: 7.2, usefulRange: [6.2, 8.2] },
  { name: 'PIPES', acid: 'PIPES-H2', conjugateBase: 'PIPES-', pKa: 6.76, usefulRange: [5.76, 7.76] },
  { name: 'Glycine', acid: 'H3N+CH2COOH', conjugateBase: 'H3N+CH2COO-', pKa: 2.34, usefulRange: [1.34, 3.34] },
  { name: 'Acetate', acid: 'CH3COOH', conjugateBase: 'CH3COO-', pKa: 4.76, usefulRange: [3.76, 5.76] },
  { name: 'Citrate', acid: 'Citric acid', conjugateBase: 'Citrate', pKa: 3.13, usefulRange: [2.13, 4.13] },
  { name: 'Borate', acid: 'B(OH)3', conjugateBase: 'B(OH)4-', pKa: 9.24, usefulRange: [8.24, 10.24] },
];

const REDOX_COUPLES: RedoxCouple[] = [
  { name: 'NAD+/NADH', oxidized: 'NAD+', reduced: 'NADH', e0: -0.320, electrons: 2 },
  { name: 'NADP+/NADPH', oxidized: 'NADP+', reduced: 'NADPH', e0: -0.320, electrons: 2 },
  { name: 'FAD/FADH2', oxidized: 'FAD', reduced: 'FADH2', e0: -0.220, electrons: 2 },
  { name: 'FMN/FMNH2', oxidized: 'FMN', reduced: 'FMNH2', e0: -0.220, electrons: 2 },
  { name: 'CoQ/CoQH2', oxidized: 'ubiquinone', reduced: 'ubiquinol', e0: 0.045, electrons: 2 },
  { name: 'cyt b (Fe3+/Fe2+)', oxidized: 'cyt b Fe3+', reduced: 'cyt b Fe2+', e0: 0.077, electrons: 1 },
  { name: 'cyt c1 (Fe3+/Fe2+)', oxidized: 'cyt c1 Fe3+', reduced: 'cyt c1 Fe2+', e0: 0.220, electrons: 1 },
  { name: 'cyt c (Fe3+/Fe2+)', oxidized: 'cyt c Fe3+', reduced: 'cyt c Fe2+', e0: 0.254, electrons: 1 },
  { name: 'cyt a (Fe3+/Fe2+)', oxidized: 'cyt a Fe3+', reduced: 'cyt a Fe2+', e0: 0.290, electrons: 1 },
  { name: 'cyt a3 (Fe3+/Fe2+)', oxidized: 'cyt a3 Fe3+', reduced: 'cyt a3 Fe2+', e0: 0.350, electrons: 1 },
  { name: 'O2/H2O', oxidized: '1/2 O2', reduced: 'H2O', e0: 0.816, electrons: 2 },
  { name: 'pyruvate/lactate', oxidized: 'pyruvate', reduced: 'lactate', e0: -0.185, electrons: 2 },
  { name: 'oxaloacetate/malate', oxidized: 'oxaloacetate', reduced: 'malate', e0: -0.166, electrons: 2 },
  { name: 'fumarate/succinate', oxidized: 'fumarate', reduced: 'succinate', e0: 0.031, electrons: 2 },
];

const THERMODYNAMIC_TABLE: ThermodynamicValue[] = [
  { reaction: 'ATP + H2O -> ADP + Pi', dG0: -30.5, dH0: -20.5, dS0: 33.5 },
  { reaction: 'ATP + H2O -> AMP + PPi', dG0: -32.2, dH0: -22.0, dS0: 34.0 },
  { reaction: 'PPi + H2O -> 2Pi', dG0: -33.5, dH0: -22.5, dS0: 36.8 },
  { reaction: 'glucose-6-phosphate + H2O -> glucose + Pi', dG0: -13.8, dH0: -10.0, dS0: 12.7 },
  { reaction: 'glucose + 6 O2 -> 6 CO2 + 6 H2O', dG0: -2870, dH0: -2808, dS0: 182 },
  { reaction: 'pyruvate + NADH + H+ -> lactate + NAD+', dG0: -25.1, dH0: -22.0, dS0: 10.4 },
  { reaction: 'fructose-6-phosphate + ATP -> fructose-1,6-bisphosphate + ADP', dG0: -14.2, dH0: -18.5, dS0: -14.4 },
  { reaction: 'PEP + ADP -> pyruvate + ATP', dG0: -31.4, dH0: -28.5, dS0: 9.7 },
  { reaction: 'acetyl-CoA + 7.5 O2 -> 9 CO2 + 8 H2O + CoA', dG0: -9075, dH0: -9050, dS0: 84 },
];

const POST_TRANSLATIONAL_MODS: PostTranslationalModification[] = [
  { name: 'Phosphorylation', targetResidue: 'Ser/Thr/Tyr', enzyme: 'protein kinase', function: 'signal transduction', reversible: true },
  { name: 'Glycosylation (N-linked)', targetResidue: 'Asn', enzyme: 'oligosaccharyltransferase', function: 'protein folding, signaling', reversible: false },
  { name: 'Glycosylation (O-linked)', targetResidue: 'Ser/Thr', enzyme: 'glycosyltransferase', function: 'mucin structure', reversible: false },
  { name: 'Ubiquitination', targetResidue: 'Lys', enzyme: 'E3 ubiquitin ligase', function: 'proteasomal degradation', reversible: true },
  { name: 'SUMOylation', targetResidue: 'Lys', enzyme: 'SUMO E3 ligase', function: 'nuclear localization', reversible: true },
  { name: 'Acetylation', targetResidue: 'Lys', enzyme: 'histone acetyltransferase', function: 'chromatin remodeling', reversible: true },
  { name: 'Methylation', targetResidue: 'Lys/Arg', enzyme: 'methyltransferase', function: 'epigenetic regulation', reversible: true },
  { name: 'Hydroxylation', targetResidue: 'Pro/Lys', enzyme: 'prolyl hydroxylase', function: 'collagen stability', reversible: false },
  { name: 'Disulfide bond formation', targetResidue: 'Cys', enzyme: 'protein disulfide isomerase', function: 'protein folding', reversible: true },
  { name: 'Carboxylation', targetResidue: 'Glu', enzyme: 'gamma-glutamyl carboxylase', function: 'calcium binding', reversible: false },
  { name: 'Palmitoylation', targetResidue: 'Cys', enzyme: 'palmitoyl transferase', function: 'membrane anchoring', reversible: true },
  { name: 'Myristoylation', targetResidue: 'Gly (N-term)', enzyme: 'N-myristoyltransferase', function: 'membrane anchoring', reversible: false },
  { name: 'Prenylation', targetResidue: 'Cys (CAAX)', enzyme: 'farnesyltransferase', function: 'membrane anchoring', reversible: false },
  { name: 'ADP-ribosylation', targetResidue: 'Arg/Cys', enzyme: 'ADP-ribosyltransferase', function: 'toxicity, signaling', reversible: true },
];

const LIPID_TYPES: LipidType[] = [
  { name: 'Phosphatidylcholine (PC)', class: 'phospholipid', components: ['choline', 'phosphate', 'glycerol', '2 fatty acids'], charge: 0, bilayer: true },
  { name: 'Phosphatidylethanolamine (PE)', class: 'phospholipid', components: ['ethanolamine', 'phosphate', 'glycerol', '2 fatty acids'], charge: 0, bilayer: true },
  { name: 'Phosphatidylserine (PS)', class: 'phospholipid', components: ['serine', 'phosphate', 'glycerol', '2 fatty acids'], charge: -1, bilayer: true },
  { name: 'Phosphatidylinositol (PI)', class: 'phospholipid', components: ['inositol', 'phosphate', 'glycerol', '2 fatty acids'], charge: -1, bilayer: true },
  { name: 'Sphingomyelin (SM)', class: 'sphingolipid', components: ['phosphocholine', 'sphingosine', 'fatty acid'], charge: 0, bilayer: true },
  { name: 'Cholesterol', class: 'sterol', components: ['steroid ring', 'hydroxyl', 'hydrocarbon tail'], charge: 0, bilayer: true },
  { name: 'Triacylglycerol (TAG)', class: 'glycerolipid', components: ['glycerol', '3 fatty acids'], charge: 0, bilayer: false },
  { name: 'Diacylglycerol (DAG)', class: 'glycerolipid', components: ['glycerol', '2 fatty acids'], charge: 0, bilayer: false },
  { name: 'Prostaglandin E2', class: 'eicosanoid', components: ['arachidonic acid derivative'], charge: -1, bilayer: false },
  { name: 'Leukotriene B4', class: 'eicosanoid', components: ['arachidonic acid derivative'], charge: -1, bilayer: false },
  { name: 'Ganglioside GM1', class: 'sphingolipid', components: ['sphingosine', 'fatty acid', 'oligosaccharide', 'sialic acid'], charge: -1, bilayer: true },
  { name: 'Cerebroside', class: 'sphingolipid', components: ['sphingosine', 'fatty acid', 'sugar'], charge: 0, bilayer: true },
];

const NUCLEOTIDE_BASES: NucleotideBase[] = [
  { name: 'Adenine', symbol: 'A', ringType: 'purine', pairsWith: 'T', mw: 135.13 },
  { name: 'Guanine', symbol: 'G', ringType: 'purine', pairsWith: 'C', mw: 151.13 },
  { name: 'Cytosine', symbol: 'C', ringType: 'pyrimidine', pairsWith: 'G', mw: 111.10 },
  { name: 'Thymine', symbol: 'T', ringType: 'pyrimidine', pairsWith: 'A', mw: 126.11 },
  { name: 'Uracil', symbol: 'U', ringType: 'pyrimidine', pairsWith: 'A', mw: 112.09 },
];

const CARBOHYDRATES: Carbohydrate[] = [
  { name: 'Glucose', formula: 'C6H12O6', monomers: 1, isomer: 'D', ringForm: 'pyranose' },
  { name: 'Fructose', formula: 'C6H12O6', monomers: 1, isomer: 'D', ringForm: 'furanose' },
  { name: 'Galactose', formula: 'C6H12O6', monomers: 1, isomer: 'D', ringForm: 'pyranose' },
  { name: 'Mannose', formula: 'C6H12O6', monomers: 1, isomer: 'D', ringForm: 'pyranose' },
  { name: 'Ribose', formula: 'C5H10O5', monomers: 1, isomer: 'D', ringForm: 'furanose' },
  { name: 'Deoxyribose', formula: 'C5H10O4', monomers: 1, isomer: 'D', ringForm: 'furanose' },
  { name: 'Sucrose', formula: 'C12H22O11', monomers: 2, isomer: 'D', ringForm: 'open' },
  { name: 'Lactose', formula: 'C12H22O11', monomers: 2, isomer: 'D', ringForm: 'open' },
  { name: 'Maltose', formula: 'C12H22O11', monomers: 2, isomer: 'D', ringForm: 'open' },
  { name: 'Cellulose', formula: '(C6H10O5)n', monomers: 1000, isomer: 'D', ringForm: 'open' },
  { name: 'Glycogen', formula: '(C6H10O5)n', monomers: 30000, isomer: 'D', ringForm: 'open' },
  { name: 'Starch (amylose)', formula: '(C6H10O5)n', monomers: 1000, isomer: 'D', ringForm: 'open' },
];

/** Biochemistry: enzymes, metabolism, protein structure. */
export class Biochemistry {
  private _enzymes: Enzyme[] = [];
  private _pathways: MetabolicPathway[] = [];
  private _structures: ProteinStructure[] = [];
  private _history: BiochemistryRecord[] = [];
  private _counter = 0;

  /** Michaelis-Menten rate v = (Vmax * [S]) / (Km + [S]). */
  michaelisMenten(substrate: number, km: number, vmax: number): number {
    if (km + substrate === 0) return 0;
    const v = (vmax * substrate) / (km + substrate);
    this._history.push({ method: 'michaelisMenten', target: `v=${v.toFixed(4)}`, timestamp: Date.now() });
    return v;
  }

  /** Lineweaver-Burk plot data: 1/v vs 1/[S]. */
  lineweaverBurk(km: number, vmax: number): { slope: number; intercept: number; points: Array<{ x: number; y: number }> } {
    const points: Array<{ x: number; y: number }> = [];
    for (let s = 0.5; s <= 5; s += 0.5) {
      const v = this.michaelisMenten(s, km, vmax);
      if (v > 0) points.push({ x: 1 / s, y: 1 / v });
    }
    this._history.push({ method: 'lineweaverBurk', target: `${points.length} points`, timestamp: Date.now() });
    return { slope: km / vmax, intercept: 1 / vmax, points };
  }

  /** Eadie-Hofstee transformation: v vs v/[S]. */
  eadieHofstee(km: number, vmax: number): { slope: number; intercept: number; points: Array<{ x: number; y: number }> } {
    const points: Array<{ x: number; y: number }> = [];
    for (let s = 0.5; s <= 5; s += 0.5) {
      const v = this.michaelisMenten(s, km, vmax);
      if (v > 0) points.push({ x: v / s, y: v });
    }
    this._history.push({ method: 'eadieHofstee', target: `${points.length} points`, timestamp: Date.now() });
    return { slope: -km, intercept: vmax, points };
  }

  /** Hanes-Woolf plot: [S]/v vs [S]. */
  hanesWoolf(km: number, vmax: number): { slope: number; intercept: number; points: Array<{ x: number; y: number }> } {
    const points: Array<{ x: number; y: number }> = [];
    for (let s = 0.5; s <= 5; s += 0.5) {
      const v = this.michaelisMenten(s, km, vmax);
      if (v > 0) points.push({ x: s, y: s / v });
    }
    this._history.push({ method: 'hanesWoolf', target: `${points.length} points`, timestamp: Date.now() });
    return { slope: 1 / vmax, intercept: km / vmax, points };
  }

  /** Hill equation for cooperative binding: v = Vmax * [S]^n / (K^0.5 + [S]^n). */
  hillEquation(substrate: number, k05: number, vmax: number, n: number): { v: number; cooperativity: string } {
    if (k05 <= 0) return { v: 0, cooperativity: 'n/a' };
    const v = (vmax * Math.pow(substrate, n)) / (Math.pow(k05, n) + Math.pow(substrate, n));
    let cooperativity = 'non-cooperative';
    if (n > 1) cooperativity = 'positive';
    else if (n < 1) cooperativity = 'negative';
    this._history.push({ method: 'hillEquation', target: `n=${n}`, timestamp: Date.now() });
    return { v, cooperativity };
  }

  /** Hill coefficient estimator from saturation data. */
  hillCoefficient(saturationCurve: Array<{ s: number; v: number }>, vmax: number): number {
    if (saturationCurve.length < 2) return 1;
    const half = vmax / 2;
    let k05 = 0;
    let prevS = 0;
    for (const pt of saturationCurve) {
      if (pt.v >= half) { k05 = pt.s; break; }
      prevS = pt.s;
    }
    if (k05 === 0) return 1;
    // log(v/(Vmax-v)) vs log(s)
    const logS: number[] = [];
    const logY: number[] = [];
    for (const pt of saturationCurve) {
      if (pt.v > 0 && pt.v < vmax) {
        logS.push(Math.log(pt.s));
        logY.push(Math.log(pt.v / (vmax - pt.v)));
      }
    }
    if (logS.length < 2) return 1;
    // linear regression slope
    const n = logS.length;
    const sumX = logS.reduce((a, b) => a + b, 0);
    const sumY = logY.reduce((a, b) => a + b, 0);
    const sumXY = logS.reduce((acc, x, i) => acc + x * logY[i]!, 0);
    const sumX2 = logS.reduce((acc, x) => acc + x * x, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    void prevS;
    this._history.push({ method: 'hillCoefficient', target: `n=${slope.toFixed(3)}`, timestamp: Date.now() });
    return slope;
  }

  /** Enzyme inhibition analysis. */
  enzymeInhibition(type: 'competitive' | 'noncompetitive' | 'uncompetitive', inhibitor: number, ki: number): { type: string; apparentKm: number; apparentVmax: number } {
    const baseKm = 1;
    const baseVmax = 100;
    let apparentKm = baseKm;
    let apparentVmax = baseVmax;
    if (type === 'competitive') {
      apparentKm = baseKm * (1 + inhibitor / ki);
    } else if (type === 'noncompetitive') {
      apparentVmax = baseVmax / (1 + inhibitor / ki);
    } else if (type === 'uncompetitive') {
      apparentKm = baseKm / (1 + inhibitor / ki);
      apparentVmax = baseVmax / (1 + inhibitor / ki);
    }
    this._history.push({ method: 'enzymeInhibition', target: type, timestamp: Date.now() });
    return { type, apparentKm, apparentVmax };
  }

  /** Mixed inhibition: a = 1 + I/Kis, a' = 1 + I/Kii. */
  mixedInhibition(inhibitor: number, kis: number, kii: number): { alpha: number; alphaPrime: number; apparentKm: number; apparentVmax: number } {
    const alpha = 1 + inhibitor / Math.max(1e-9, kis);
    const alphaPrime = 1 + inhibitor / Math.max(1e-9, kii);
    const baseKm = 1;
    const baseVmax = 100;
    const apparentKm = (baseKm * alpha) / alphaPrime;
    const apparentVmax = baseVmax / alphaPrime;
    this._history.push({ method: 'mixedInhibition', target: `I=${inhibitor}`, timestamp: Date.now() });
    return { alpha, alphaPrime, apparentKm, apparentVmax };
  }

  /** IC50 to Ki conversion using Cheng-Prusoff equation. */
  chengPrusoff(ic50: number, substrate: number, km: number): number {
    return ic50 / (1 + substrate / Math.max(1e-9, km));
  }

  /** Allosteric regulation descriptor. */
  allostericRegulation(enzyme: string, effector: string): { enzyme: string; effector: string; effect: string } {
    const effect = effector.includes('activator') ? 'activation' : 'inhibition';
    this._history.push({ method: 'allostericRegulation', target: enzyme, timestamp: Date.now() });
    return { enzyme, effector, effect };
  }

  /** Monod-Wyman-Changeux (MWC) concerted model. */
  mwcModel(substrate: number, kr: number, kt: number, l: number, n: number): { fraction: number } {
    // Y = alpha(1+alpha)^(n-1) / (L(1+c*alpha)^n + (1+alpha)^n)
    // Simplified: assumes c = Kt/Kr
    const c = kt / Math.max(1e-9, kr);
    const alpha = substrate / Math.max(1e-9, kr);
    const numerator = alpha * Math.pow(1 + alpha, n - 1);
    const denominator = l * Math.pow(1 + c * alpha, n) + Math.pow(1 + alpha, n);
    const fraction = denominator === 0 ? 0 : numerator / denominator;
    this._history.push({ method: 'mwcModel', target: `n=${n}`, timestamp: Date.now() });
    return { fraction };
  }

  /** Sequential (Koshland-Nemethy-Filmer) model simplified. */
  knfModel(substrate: number, k1: number, k2: number, n: number): { fraction: number } {
    // Simplified sequential binding with interaction factor
    let total = 0;
    let bound = 0;
    let product = 1;
    for (let i = 1; i <= n; i++) {
      const ki = k1 * Math.pow(k2 / k1, (i - 1) / Math.max(1, n - 1));
      product *= substrate / Math.max(1e-9, ki);
      total += product;
      bound += i * product;
    }
    const fraction = (total + 1) === 0 ? 0 : bound / (n * (total + 1));
    this._history.push({ method: 'knfModel', target: `n=${n}`, timestamp: Date.now() });
    return { fraction };
  }

  /** Temperature effect on rate (Q10 rule). */
  q10Rule(rate: number, tempDelta: number, q10: number = 2): number {
    return rate * Math.pow(q10, tempDelta / 10);
  }

  /** Arrhenius equation: k = A * exp(-Ea / (R * T)). */
  arrhenius(activationEnergy: number, temperatureK: number, preExponential: number = 1e10): number {
    const R = 8.314; // J/(mol·K)
    return preExponential * Math.exp(-activationEnergy / (R * temperatureK));
  }

  /** Activation energy from two rate measurements. */
  activationEnergy(rate1: number, temp1: number, rate2: number, temp2: number): number {
    // Ea = R * ln(k2/k1) / (1/T1 - 1/T2)
    if (rate1 <= 0 || rate2 <= 0) return 0;
    const R = 8.314;
    const ea = (R * Math.log(rate2 / rate1)) / (1 / temp1 - 1 / temp2);
    this._history.push({ method: 'activationEnergy', target: `Ea=${ea.toFixed(2)}`, timestamp: Date.now() });
    return ea;
  }

  /** pH effect on enzyme activity (two-pK model). */
  phOptimum(ph: number, pKa1: number, pKa2: number): number {
    // Activity = 1 / (1 + 10^(pKa1-pH) + 10^(pH-pKa2))
    const denom = 1 + Math.pow(10, pKa1 - ph) + Math.pow(10, ph - pKa2);
    return 1 / denom;
  }

  /** Glycolysis pathway. */
  glycolysis(): MetabolicPathway {
    const pathway: MetabolicPathway = {
      steps: [
        { enzyme: 'hexokinase', substrate: 'glucose', product: 'glucose-6-phosphate' },
        { enzyme: 'phosphoglucose isomerase', substrate: 'glucose-6-phosphate', product: 'fructose-6-phosphate' },
        { enzyme: 'phosphofructokinase-1', substrate: 'fructose-6-phosphate', product: 'fructose-1,6-bisphosphate' },
        { enzyme: 'aldolase', substrate: 'fructose-1,6-bisphosphate', product: 'DHAP + GAP' },
        { enzyme: 'triose phosphate isomerase', substrate: 'DHAP', product: 'GAP' },
        { enzyme: 'GAPDH', substrate: 'GAP', product: '1,3-bisphosphoglycerate' },
        { enzyme: 'phosphoglycerate kinase', substrate: '1,3-BPG', product: '3-phosphoglycerate' },
        { enzyme: 'phosphoglycerate mutase', substrate: '3-PG', product: '2-PG' },
        { enzyme: 'enolase', substrate: '2-PG', product: 'PEP' },
        { enzyme: 'pyruvate kinase', substrate: 'PEP', product: 'pyruvate' },
      ],
      inputs: ['glucose', '2 ATP', '2 NAD+'],
      outputs: ['2 pyruvate', '2 ATP (net)', '2 NADH'],
    };
    this._pathways.push(pathway);
    this._history.push({ method: 'glycolysis', target: '10 steps', timestamp: Date.now() });
    return pathway;
  }

  /** Krebs cycle (citric acid cycle). */
  krebsCycle(): MetabolicPathway {
    const pathway: MetabolicPathway = {
      steps: [
        { enzyme: 'citrate synthase', substrate: 'oxaloacetate + acetyl-CoA', product: 'citrate' },
        { enzyme: 'aconitase', substrate: 'citrate', product: 'isocitrate' },
        { enzyme: 'isocitrate dehydrogenase', substrate: 'isocitrate', product: 'alpha-ketoglutarate' },
        { enzyme: 'alpha-ketoglutarate dehydrogenase', substrate: 'alpha-KG', product: 'succinyl-CoA' },
        { enzyme: 'succinyl-CoA synthetase', substrate: 'succinyl-CoA', product: 'succinate' },
        { enzyme: 'succinate dehydrogenase', substrate: 'succinate', product: 'fumarate' },
        { enzyme: 'fumarase', substrate: 'fumarate', product: 'malate' },
        { enzyme: 'malate dehydrogenase', substrate: 'malate', product: 'oxaloacetate' },
      ],
      inputs: ['acetyl-CoA', '3 NAD+', 'FAD', 'ADP + Pi'],
      outputs: ['2 CO2', '3 NADH', 'FADH2', 'GTP/ATP'],
    };
    this._pathways.push(pathway);
    this._history.push({ method: 'krebsCycle', target: '8 steps', timestamp: Date.now() });
    return pathway;
  }

  /** Electron transport chain. */
  electronTransportChain(): MetabolicPathway {
    const pathway: MetabolicPathway = {
      steps: [
        { enzyme: 'Complex I (NADH dehydrogenase)', substrate: 'NADH', product: 'NAD+' },
        { enzyme: 'Complex II (succinate dehydrogenase)', substrate: 'FADH2', product: 'FAD' },
        { enzyme: 'Complex III (cyt bc1)', substrate: 'ubiquinol', product: 'cytochrome c (red)' },
        { enzyme: 'Complex IV (cyt c oxidase)', substrate: 'cytochrome c (red)', product: 'H2O' },
        { enzyme: 'ATP synthase (Complex V)', substrate: 'ADP + Pi', product: 'ATP' },
      ],
      inputs: ['NADH', 'FADH2', 'O2', 'ADP'],
      outputs: ['NAD+', 'FAD', 'H2O', '~28 ATP'],
    };
    this._pathways.push(pathway);
    this._history.push({ method: 'electronTransportChain', target: '5 complexes', timestamp: Date.now() });
    return pathway;
  }

  /** Gluconeogenesis. */
  gluconeogenesis(): MetabolicPathway {
    const pathway: MetabolicPathway = {
      steps: [
        { enzyme: 'pyruvate carboxylase (mitochondrial)', substrate: 'pyruvate', product: 'oxaloacetate' },
        { enzyme: 'PEPCK', substrate: 'oxaloacetate', product: 'PEP' },
        { enzyme: 'fructose-1,6-bisphosphatase', substrate: 'F-1,6-BP', product: 'F-6-P' },
        { enzyme: 'glucose-6-phosphatase', substrate: 'G-6-P', product: 'glucose' },
      ],
      inputs: ['2 pyruvate', '4 ATP', '2 GTP', '2 NADH'],
      outputs: ['glucose', 'ADP', 'GDP', 'NAD+'],
    };
    this._pathways.push(pathway);
    this._history.push({ method: 'gluconeogenesis', target: '4 bypass steps', timestamp: Date.now() });
    return pathway;
  }

  /** Fatty acid oxidation (beta-oxidation). */
  fattyAcidOxidation(): MetabolicPathway {
    const pathway: MetabolicPathway = {
      steps: [
        { enzyme: 'acyl-CoA synthetase', substrate: 'fatty acid', product: 'fatty acyl-CoA' },
        { enzyme: 'CPT-1', substrate: 'acyl-CoA', product: 'acylcarnitine' },
        { enzyme: 'CPT-2', substrate: 'acylcarnitine', product: 'acyl-CoA (matrix)' },
        { enzyme: 'acyl-CoA dehydrogenase', substrate: 'acyl-CoA', product: 'trans-enoyl-CoA' },
        { enzyme: 'enoyl-CoA hydratase', substrate: 'enoyl-CoA', product: '3-hydroxyacyl-CoA' },
        { enzyme: 'hydroxyacyl-CoA dehydrogenase', substrate: '3-OH-acyl-CoA', product: '3-ketoacyl-CoA' },
        { enzyme: 'thiolase', substrate: '3-ketoacyl-CoA', product: 'acyl-CoA (n-2) + acetyl-CoA' },
      ],
      inputs: ['fatty acyl-CoA', 'FAD', 'NAD+', 'CoA'],
      outputs: ['acetyl-CoA', 'FADH2', 'NADH'],
    };
    this._pathways.push(pathway);
    this._history.push({ method: 'fattyAcidOxidation', target: '7 steps', timestamp: Date.now() });
    return pathway;
  }

  /** Fatty acid synthesis. */
  fattyAcidSynthesis(): MetabolicPathway {
    const pathway: MetabolicPathway = {
      steps: [
        { enzyme: 'acetyl-CoA carboxylase', substrate: 'acetyl-CoA', product: 'malonyl-CoA' },
        { enzyme: 'ACP-acyltransferase', substrate: 'acetyl-CoA', product: 'acetyl-ACP' },
        { enzyme: 'malonyl-CoA-ACP transferase', substrate: 'malonyl-CoA', product: 'malonyl-ACP' },
        { enzyme: 'beta-ketoacyl synthase', substrate: 'acetyl-ACP + malonyl-ACP', product: 'acetoacetyl-ACP' },
        { enzyme: 'beta-ketoacyl reductase', substrate: 'acetoacetyl-ACP', product: '3-OH-butyryl-ACP' },
        { enzyme: 'dehydratase', substrate: '3-OH-butyryl-ACP', product: 'crotonyl-ACP' },
        { enzyme: 'enoyl reductase', substrate: 'crotonyl-ACP', product: 'butyryl-ACP' },
      ],
      inputs: ['acetyl-CoA', 'ATP', 'NADPH', 'CO2'],
      outputs: ['palmitate', 'ADP', 'NADP+'],
    };
    this._pathways.push(pathway);
    this._history.push({ method: 'fattyAcidSynthesis', target: '7 steps', timestamp: Date.now() });
    return pathway;
  }

  /** Urea cycle. */
  ureaCycle(): MetabolicPathway {
    const pathway: MetabolicPathway = {
      steps: [
        { enzyme: 'CPS-I', substrate: 'NH3 + CO2 + 2ATP', product: 'carbamoyl phosphate' },
        { enzyme: 'ornithine transcarbamylase', substrate: 'carbamoyl-P + ornithine', product: 'citrulline' },
        { enzyme: 'argininosuccinate synthetase', substrate: 'citrulline + aspartate + ATP', product: 'argininosuccinate' },
        { enzyme: 'argininosuccinate lyase', substrate: 'argininosuccinate', product: 'arginine + fumarate' },
        { enzyme: 'arginase', substrate: 'arginine + H2O', product: 'urea + ornithine' },
      ],
      inputs: ['NH3', 'CO2', 'aspartate', '3 ATP'],
      outputs: ['urea', 'fumarate', 'ADP'],
    };
    this._pathways.push(pathway);
    this._history.push({ method: 'ureaCycle', target: '5 steps', timestamp: Date.now() });
    return pathway;
  }

  /** Pentose phosphate pathway (oxidative branch). */
  pentosePhosphatePathway(): MetabolicPathway {
    const pathway: MetabolicPathway = {
      steps: [
        { enzyme: 'G6P dehydrogenase', substrate: 'glucose-6-phosphate', product: '6-phosphogluconolactone' },
        { enzyme: 'lactonase', substrate: '6-P-gluconolactone', product: '6-phosphogluconate' },
        { enzyme: '6-P-gluconate dehydrogenase', substrate: '6-P-gluconate', product: 'ribulose-5-P' },
      ],
      inputs: ['G6P', '2 NADP+'],
      outputs: ['Ru5P', '2 NADPH', 'CO2'],
    };
    this._pathways.push(pathway);
    this._history.push({ method: 'pentosePhosphatePathway', target: 'oxidative branch', timestamp: Date.now() });
    return pathway;
  }

  /** Glycogen synthesis (glycogenesis). */
  glycogenesis(): MetabolicPathway {
    const pathway: MetabolicPathway = {
      steps: [
        { enzyme: 'hexokinase', substrate: 'glucose', product: 'G6P' },
        { enzyme: 'phosphoglucomutase', substrate: 'G6P', product: 'G1P' },
        { enzyme: 'UDP-glucose pyrophosphorylase', substrate: 'G1P + UTP', product: 'UDP-glucose' },
        { enzyme: 'glycogen synthase', substrate: 'UDP-glucose + glycogen primer', product: 'glycogen (n+1)' },
        { enzyme: 'branching enzyme', substrate: 'linear glucan', product: 'branched glycogen' },
      ],
      inputs: ['glucose', 'UTP', 'glycogen primer'],
      outputs: ['glycogen', 'UDP', 'Pi'],
    };
    this._pathways.push(pathway);
    this._history.push({ method: 'glycogenesis', target: '5 steps', timestamp: Date.now() });
    return pathway;
  }

  /** Glycogen breakdown (glycogenolysis). */
  glycogenolysis(): MetabolicPathway {
    const pathway: MetabolicPathway = {
      steps: [
        { enzyme: 'glycogen phosphorylase', substrate: 'glycogen (α-1,4)', product: 'G1P' },
        { enzyme: 'debranching enzyme', substrate: 'glycogen (α-1,6 branch)', product: 'glucose' },
        { enzyme: 'phosphoglucomutase', substrate: 'G1P', product: 'G6P' },
        { enzyme: 'G6Pase (liver, kidney)', substrate: 'G6P', product: 'glucose' },
      ],
      inputs: ['glycogen', 'Pi'],
      outputs: ['G1P', 'glucose'],
    };
    this._pathways.push(pathway);
    this._history.push({ method: 'glycogenolysis', target: '4 steps', timestamp: Date.now() });
    return pathway;
  }

  /** Cori cycle (lactate recycling). */
  coriCycle(): MetabolicPathway {
    const pathway: MetabolicPathway = {
      steps: [
        { enzyme: 'LDH (muscle)', substrate: 'pyruvate + NADH', product: 'lactate + NAD+' },
        { enzyme: 'blood transport', substrate: 'lactate (blood)', product: 'lactate (liver)' },
        { enzyme: 'LDH (liver)', substrate: 'lactate + NAD+', product: 'pyruvate + NADH' },
        { enzyme: 'gluconeogenesis', substrate: 'pyruvate', product: 'glucose' },
        { enzyme: 'blood transport', substrate: 'glucose (blood)', product: 'glucose (muscle)' },
      ],
      inputs: ['2 lactate (muscle)'],
      outputs: ['glucose (muscle)'],
    };
    this._pathways.push(pathway);
    this._history.push({ method: 'coriCycle', target: '5 steps', timestamp: Date.now() });
    return pathway;
  }

  /** Ketogenesis (liver ketone body synthesis). */
  ketogenesis(): MetabolicPathway {
    const pathway: MetabolicPathway = {
      steps: [
        { enzyme: 'thiolase', substrate: '2 acetyl-CoA', product: 'acetoacetyl-CoA' },
        { enzyme: 'HMG-CoA synthase', substrate: 'acetoacetyl-CoA + acetyl-CoA', product: 'HMG-CoA' },
        { enzyme: 'HMG-CoA lyase', substrate: 'HMG-CoA', product: 'acetoacetate' },
        { enzyme: 'beta-hydroxybutyrate dehydrogenase', substrate: 'acetoacetate + NADH', product: 'beta-hydroxybutyrate' },
      ],
      inputs: ['acetyl-CoA (from beta-oxidation)', 'NADH'],
      outputs: ['acetoacetate', 'beta-hydroxybutyrate'],
    };
    this._pathways.push(pathway);
    this._history.push({ method: 'ketogenesis', target: '4 steps', timestamp: Date.now() });
    return pathway;
  }

  /** Cholesterol synthesis (mevalonate pathway). */
  cholesterolSynthesis(): MetabolicPathway {
    const pathway: MetabolicPathway = {
      steps: [
        { enzyme: 'thiolase', substrate: '2 acetyl-CoA', product: 'acetoacetyl-CoA' },
        { enzyme: 'HMG-CoA synthase', substrate: 'AcAc-CoA + Ac-CoA', product: 'HMG-CoA' },
        { enzyme: 'HMG-CoA reductase (rate-limiting)', substrate: 'HMG-CoA + 2 NADPH', product: 'mevalonate' },
        { enzyme: 'mevalonate kinase', substrate: 'mevalonate', product: 'mevalonate-5-P' },
        { enzyme: 'phosphomevalonate kinase', substrate: 'MV-5-P', product: 'MV-5-PP' },
        { enzyme: 'MV-PP decarboxylase', substrate: 'MV-5-PP', product: 'isopentenyl-PP' },
        { enzyme: 'squalene synthase', substrate: '6 IPP (after isomerization)', product: 'squalene' },
        { enzyme: 'squalene epoxidase + cyclase', substrate: 'squalene', product: 'lanosterol' },
        { enzyme: 'multi-step conversion', substrate: 'lanosterol', product: 'cholesterol' },
      ],
      inputs: ['acetyl-CoA', 'NADPH', 'ATP', 'O2'],
      outputs: ['cholesterol', 'NADP+', 'ADP', 'CO2'],
    };
    this._pathways.push(pathway);
    this._history.push({ method: 'cholesterolSynthesis', target: 'mevalonate pathway', timestamp: Date.now() });
    return pathway;
  }

  /** Protein synthesis summary. */
  proteinSynthesis(): MetabolicPathway {
    const pathway: MetabolicPathway = {
      steps: [
        { enzyme: 'aminoacyl-tRNA synthetase', substrate: 'amino acid + tRNA + ATP', product: 'aa-tRNA + AMP + PPi' },
        { enzyme: 'RNA polymerase II', substrate: 'DNA + NTPs', product: 'mRNA' },
        { enzyme: 'small ribosomal subunit', substrate: 'mRNA + Met-tRNA', product: 'initiation complex' },
        { enzyme: 'large ribosomal subunit', substrate: 'initiation complex', product: 'functional ribosome' },
        { enzyme: 'peptidyl transferase', substrate: 'aa-tRNAs + mRNA', product: 'polypeptide' },
        { enzyme: 'release factor', substrate: 'stop codon', product: 'released protein' },
      ],
      inputs: ['DNA', 'ATP', 'GTP', 'amino acids', 'tRNAs'],
      outputs: ['protein', 'ADP', 'GDP', 'Pi'],
    };
    this._pathways.push(pathway);
    this._history.push({ method: 'proteinSynthesis', target: 'translation', timestamp: Date.now() });
    return pathway;
  }

  /** Nucleotide synthesis (de novo purine). */
  purineSynthesis(): MetabolicPathway {
    const pathway: MetabolicPathway = {
      steps: [
        { enzyme: 'PRPP synthetase', substrate: 'ribose-5-P + ATP', product: 'PRPP' },
        { enzyme: 'glutamine-PRPP amidotransferase', substrate: 'PRPP + Gln', product: '5-phosphoribosylamine' },
        { enzyme: 'GAR synthetase', substrate: 'PRA + Gly + ATP', product: 'GAR' },
        { enzyme: 'GAR transformylase', substrate: 'GAR + N10-formyl-THF', product: 'FGAR' },
        { enzyme: 'FGAR amidotransferase', substrate: 'FGAR + Gln', product: 'FGAM' },
        { enzyme: 'AIR synthetase', substrate: 'FGAM + ATP', product: 'AIR' },
        { enzyme: 'CAIR synthetase', substrate: 'AIR + CO2', product: 'CAIR' },
        { enzyme: 'SAICAR synthetase', substrate: 'CAIR + Asp', product: 'SAICAR' },
        { enzyme: 'AICAR transformylase', substrate: 'AICAR + fTHF', product: 'FAICAR' },
        { enzyme: 'IMP cyclohydrolase', substrate: 'FAICAR', product: 'IMP' },
      ],
      inputs: ['PRPP', 'Gln', 'Gly', 'Asp', 'formyl-THF', 'CO2', 'ATP'],
      outputs: ['IMP', 'Glu', 'fumarate', 'THF'],
    };
    this._pathways.push(pathway);
    this._history.push({ method: 'purineSynthesis', target: 'de novo', timestamp: Date.now() });
    return pathway;
  }

  /** Primary structure descriptor. */
  primaryStructure(sequence: string): ProteinStructure {
    const s: ProteinStructure = {
      level: 'primary',
      description: 'linear amino acid sequence',
      features: [`${sequence.length} residues`],
    };
    this._structures.push(s);
    this._history.push({ method: 'primaryStructure', target: `${sequence.length} aa`, timestamp: Date.now() });
    return s;
  }

  /** Secondary structure descriptor. */
  secondaryStructure(type: 'alpha-helix' | 'beta-sheet' | 'turn', sequence: string): ProteinStructure {
    const s: ProteinStructure = {
      level: 'secondary',
      description: `local folding: ${type}`,
      features: [type, `${sequence.length} residues`],
    };
    this._structures.push(s);
    this._history.push({ method: 'secondaryStructure', target: type, timestamp: Date.now() });
    return s;
  }

  /** Tertiary structure descriptor. */
  tertiaryStructure(folds: number): ProteinStructure {
    const s: ProteinStructure = {
      level: 'tertiary',
      description: '3D folded structure',
      features: [`${folds} fold domains`],
    };
    this._structures.push(s);
    this._history.push({ method: 'tertiaryStructure', target: `${folds} domains`, timestamp: Date.now() });
    return s;
  }

  /** Quaternary structure descriptor. */
  quaternaryStructure(subunits: number): ProteinStructure {
    const s: ProteinStructure = {
      level: 'quaternary',
      description: 'multi-subunit complex',
      features: [`${subunits} subunits`],
    };
    this._structures.push(s);
    this._history.push({ method: 'quaternaryStructure', target: `${subunits} subunits`, timestamp: Date.now() });
    return s;
  }

  /** Ramachandran plot region for a residue. */
  ramachandran(phi: number, psi: number): { region: string; favored: boolean } {
    // Simplified Ramachandran regions
    if (phi >= -90 && phi <= -30 && psi >= -60 && psi <= 30) {
      return { region: 'alpha-helix (right-handed)', favored: true };
    }
    if (phi >= -150 && phi <= -60 && psi >= 90 && psi <= 150) {
      return { region: 'beta-sheet', favored: true };
    }
    if (phi >= 30 && phi <= 90 && psi >= -30 && psi <= 90) {
      return { region: 'alpha-helix (left-handed)', favored: false };
    }
    if (phi >= -120 && phi <= -30 && psi >= 30 && psi <= 120) {
      return { region: 'collagen helix', favored: true };
    }
    return { region: 'disallowed', favored: false };
  }

  /** Protein molecular weight (Da) from sequence. */
  proteinMolecularWeight(sequence: string): number {
    let mw = 18.02; // water for termini
    for (const aa of sequence.toUpperCase()) {
      const prop = AMINO_ACID_PROPERTIES.find(p => p.code === aa);
      if (prop) mw += prop.mw;
    }
    return mw;
  }

  /** Protein extinction coefficient at 280 nm (Edelhoch method). */
  extinctionCoefficient280(sequence: string): number {
    let countW = 0, countY = 0, countC = 0;
    for (const aa of sequence.toUpperCase()) {
      if (aa === 'W') countW++;
      else if (aa === 'Y') countY++;
      else if (aa === 'C') countC++;
    }
    // ε = (#W * 5500) + (#Y * 1490) + (#C * 125) - reduced cystines counted
    return countW * 5500 + countY * 1490 + (countC / 2) * 125;
  }

  /** Protein isoelectric point (pI) calculation via bisection. */
  proteinIsoelectricPoint(sequence: string): number {
    const propMap = new Map(AMINO_ACID_PROPERTIES.map(p => [p.code, p]));
    const pKaNTerm = 9.69;
    const pKaCTerm = 2.34;
    let lo = 0, hi = 14;
    for (let iter = 0; iter < 50; iter++) {
      const mid = (lo + hi) / 2;
      let charge = 0;
      // N-terminus (positive when protonated)
      charge += 1 / (1 + Math.pow(10, mid - pKaNTerm));
      // C-terminus (negative when deprotonated)
      charge -= 1 / (1 + Math.pow(10, pKaCTerm - mid));
      // Side chains
      for (const aa of sequence.toUpperCase()) {
        const prop = propMap.get(aa);
        if (!prop || prop.pKaSideChain === null) continue;
        if (prop.charged) {
          if (['R', 'K', 'H'].includes(aa)) {
            // positive side chain
            charge += 1 / (1 + Math.pow(10, mid - prop.pKaSideChain));
          } else if (['D', 'E'].includes(aa)) {
            // negative side chain
            charge -= 1 / (1 + Math.pow(10, prop.pKaSideChain - mid));
          } else if (aa === 'C') {
            charge -= 1 / (1 + Math.pow(10, prop.pKaSideChain - mid));
          } else if (aa === 'Y') {
            charge -= 1 / (1 + Math.pow(10, prop.pKaSideChain - mid));
          }
        }
      }
      if (charge > 0) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  /** GRAVY score (grand average of hydrophobicity). */
  gravyScore(sequence: string): number {
    const propMap = new Map(AMINO_ACID_PROPERTIES.map(p => [p.code, p]));
    let total = 0;
    let count = 0;
    for (const aa of sequence.toUpperCase()) {
      const prop = propMap.get(aa);
      if (prop) {
        total += prop.hydrophobicity;
        count++;
      }
    }
    return count === 0 ? 0 : total / count;
  }

  /** Amino acid composition of a sequence. */
  aaComposition(sequence: string): Record<string, number> {
    const counts: Record<string, number> = {};
    let total = 0;
    for (const aa of sequence.toUpperCase()) {
      if (AMINO_ACID_PROPERTIES.some(p => p.code === aa)) {
        counts[aa] = (counts[aa] ?? 0) + 1;
        total++;
      }
    }
    const result: Record<string, number> = {};
    for (const aa of Object.keys(counts)) {
      result[aa] = counts[aa]! / total;
    }
    return result;
  }

  /** Count disulfide bonds from sequence (assuming max possible). */
  disulfideBonds(sequence: string): { cysteines: number; maxBonds: number } {
    let count = 0;
    for (const aa of sequence.toUpperCase()) if (aa === 'C') count++;
    return { cysteines: count, maxBonds: Math.floor(count / 2) };
  }

  /** Henderson-Hasselbalch equation for buffer pH. */
  hendersonHasselbalch(pKa: number, acid: number, base: number): number {
    if (acid <= 0 || base <= 0) return 0;
    return pKa + Math.log10(base / acid);
  }

  /** Buffer capacity (β = 2.303 * C * Ka * [H+] / (Ka + [H+])^2). */
  bufferCapacity(pKa: number, totalConcentration: number, ph: number): number {
    const ka = Math.pow(10, -pKa);
    const h = Math.pow(10, -ph);
    return 2.303 * totalConcentration * ka * h / Math.pow(ka + h, 2);
  }

  /** Recommended buffer for a target pH. */
  recommendBuffer(targetPh: number): BufferSystem | null {
    return BUFFER_SYSTEMS.find(b => targetPh >= b.usefulRange[0] && targetPh <= b.usefulRange[1]) ?? null;
  }

  /** All buffer systems. */
  bufferSystems(): BufferSystem[] {
    return [...BUFFER_SYSTEMS];
  }

  /** All vitamins. */
  vitamins(): Vitamin[] {
    return [...VITIMINS_COPY()];
  }

  /** All coenzymes. */
  coenzymes(): Coenzyme[] {
    return [...COENZYMES];
  }

  /** All amino acid properties. */
  aminoAcids(): AminoAcidProperty[] {
    return [...AMINO_ACID_PROPERTIES];
  }

  /** Lookup amino acid property by one-letter code. */
  aminoAcid(code: string): AminoAcidProperty | null {
    return AMINO_ACID_PROPERTIES.find(p => p.code === code.toUpperCase()) ?? null;
  }

  /** All redox couples. */
  redoxCouples(): RedoxCouple[] {
    return [...REDOX_COUPLES];
  }

  /** Nernst equation for reduction potential. */
  nernstPotential(e0: number, electrons: number, oxidized: number, reduced: number, temperatureK: number = 298.15): number {
    const R = 8.314, F = 96485;
    if (reduced <= 0) return Infinity;
    return e0 - (R * temperatureK / (electrons * F)) * Math.log(reduced / oxidized);
  }

  /** Gibbs free energy from redox potential: ΔG = -nFΔE. */
  redoxFreeEnergy(eAccept: number, eDonate: number, electrons: number): number {
    const F = 96485;
    return -electrons * F * (eAccept - eDonate);
  }

  /** Standard ΔG for a reaction. */
  standardFreeEnergy(reaction: string): ThermodynamicValue | null {
    return THERMODYNAMIC_TABLE.find(t => t.reaction === reaction) ?? null;
  }

  /** ΔG at given concentrations: ΔG = ΔG° + RT ln Q. */
  actualFreeEnergy(dG0: number, reactionQuotient: number, temperatureK: number = 298.15): number {
    const R = 8.314 / 1000; // kJ/(mol·K)
    return dG0 + R * temperatureK * Math.log(Math.max(1e-12, reactionQuotient));
  }

  /** Equilibrium constant from ΔG°: K_eq = exp(-ΔG°/RT). */
  equilibriumConstant(dG0: number, temperatureK: number = 298.15): number {
    const R = 8.314 / 1000;
    return Math.exp(-dG0 / (R * temperatureK));
  }

  /** Post-translational modifications catalog. */
  postTranslationalMods(): PostTranslationalModification[] {
    return [...POST_TRANSLATIONAL_MODS];
  }

  /** Lipid types catalog. */
  lipidTypes(): LipidType[] {
    return [...LIPID_TYPES];
  }

  /** Carbohydrate catalog. */
  carbohydrates(): Carbohydrate[] {
    return [...CARBOHYDRATES];
  }

  /** Nucleotide bases catalog. */
  nucleotideBases(): NucleotideBase[] {
    return [...NUCLEOTIDE_BASES];
  }

  /** ATP yield for aerobic glucose oxidation. */
  atpYieldGlucose(): { source: string; atp: number }[] {
    return [
      { source: 'Glycolysis (substrate-level)', atp: 2 },
      { source: 'Glycolysis (NADH -> ETC)', atp: 5 }, // 2 NADH * 2.5
      { source: 'Pyruvate dehydrogenase (NADH)', atp: 5 }, // 2 NADH * 2.5
      { source: 'TCA cycle (substrate-level GTP)', atp: 2 },
      { source: 'TCA cycle (NADH -> ETC)', atp: 15 }, // 6 NADH * 2.5
      { source: 'TCA cycle (FADH2 -> ETC)', atp: 3 }, // 2 FADH2 * 1.5
      { source: 'Total theoretical max', atp: 32 },
      { source: 'Realistic (proton leak, transport)', atp: 30 },
    ];
  }

  /** ATP yield for fatty acid oxidation (per palmitate). */
  atpYieldPalmitate(): { source: string; atp: number }[] {
    return [
      { source: '7 FADH2 -> ETC', atp: 10.5 }, // 7 * 1.5
      { source: '7 NADH -> ETC', atp: 17.5 }, // 7 * 2.5
      { source: '8 acetyl-CoA -> TCA', atp: 80 }, // 8 * 10
      { source: 'Activation cost', atp: -2 }, // uses ATP -> AMP + PPi
      { source: 'Total', atp: 106 },
    ];
  }

  /** Stoichiometric ΔG for ATP hydrolysis at typical cellular conditions. */
  cellularAtpHydrolysis(atp: number, adp: number, pi: number): number {
    // ΔG = ΔG° + RT ln([ADP][Pi]/[ATP])
    const dG0 = -30.5;
    if (atp <= 0) return 0;
    return this.actualFreeEnergy(dG0, (adp * pi) / atp);
  }

  /** Michaelis-Menten with substrate inhibition. */
  substrateInhibition(substrate: number, km: number, ki: number, vmax: number): number {
    // v = Vmax * [S] / (Km + [S] + [S]^2/Ki)
    const denom = km + substrate + (substrate * substrate) / Math.max(1e-9, ki);
    return (vmax * substrate) / denom;
  }

  /** Random DNA/RNA sequence generator. */
  randomSequence(length: number, alphabet: 'DNA' | 'RNA' | 'protein'): string {
    const sets: Record<string, string> = {
      DNA: 'ACGT',
      RNA: 'ACGU',
      protein: 'ACDEFGHIKLMNPQRSTVWY',
    };
    const chars = sets[alphabet] ?? 'ACGT';
    let out = '';
    for (let i = 0; i < length; i++) {
      out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
  }

  /** Reverse complement of DNA. */
  reverseComplement(dna: string): string {
    const complement: Record<string, string> = { A: 'T', T: 'A', G: 'C', C: 'G', a: 't', t: 'a', g: 'c', c: 'g' };
    let out = '';
    for (let i = dna.length - 1; i >= 0; i--) {
      out += complement[dna[i]!] ?? dna[i]!;
    }
    return out;
  }

  /** GC content of a DNA sequence. */
  gcContent(dna: string): number {
    if (dna.length === 0) return 0;
    let gc = 0;
    for (const b of dna.toUpperCase()) {
      if (b === 'G' || b === 'C') gc++;
    }
    return gc / dna.length;
  }

  /** Melting temperature (Tm) of DNA by Wallace rule (for short oligos < 14nt). */
  meltingTempWallace(dna: string): number {
    let gc = 0, at = 0;
    for (const b of dna.toUpperCase()) {
      if (b === 'G' || b === 'C') gc++;
      else at++;
    }
    return 2 * at + 4 * gc;
  }

  /** Tm using salt-adjusted formula for longer oligos. */
  meltingTempSalt(dna: string, naConcentration: number = 50): number {
    const gc = this.gcContent(dna);
    const len = dna.length;
    if (len < 14) return this.meltingTempWallace(dna);
    return 81.5 + 16.6 * Math.log10(naConcentration / 1000) + 41 * gc - 675 / Math.max(1, len);
  }

  /** Beer-Lambert law: A = ε * c * l. */
  beerLambert(extinctionCoeff: number, concentration: number, pathLength: number = 1): number {
    return extinctionCoeff * concentration * pathLength;
  }

  /** Concentration from absorbance (rearranged Beer-Lambert). */
  concentration(absorbance: number, extinctionCoeff: number, pathLength: number = 1): number {
    if (extinctionCoeff * pathLength === 0) return 0;
    return absorbance / (extinctionCoeff * pathLength);
  }

  /** Convert absorbance to transmittance. */
  transmittance(absorbance: number): number {
    return Math.pow(10, -absorbance);
  }

  /** Bradford assay: protein concentration from A595. */
  bradfordAssay(absorbance595: number, slope: number = 0.5): number {
    return absorbance595 / slope;
  }

  /** Convert between Celsius, Kelvin, Fahrenheit. */
  convertTemperature(value: number, from: 'C' | 'K' | 'F', to: 'C' | 'K' | 'F'): number {
    let celsius = value;
    if (from === 'K') celsius = value - 273.15;
    else if (from === 'F') celsius = (value - 32) * 5 / 9;
    if (to === 'K') return celsius + 273.15;
    if (to === 'F') return celsius * 9 / 5 + 32;
    return celsius;
  }

  /** Molar mass to molarity. */
  massToMolarity(massGram: number, mw: number, volumeL: number): number {
    if (mw === 0 || volumeL === 0) return 0;
    return (massGram / mw) / volumeL;
  }

  /** Dilution: C1 * V1 = C2 * V2. */
  dilution(c1: number, v1: number, c2: number): number {
    if (c2 === 0) return 0;
    return (c1 * v1) / c2;
  }

  /** Net charge of a peptide at given pH. */
  peptideCharge(sequence: string, ph: number): number {
    const propMap = new Map(AMINO_ACID_PROPERTIES.map(p => [p.code, p]));
    let charge = 0;
    // N-terminus
    charge += 1 / (1 + Math.pow(10, ph - 9.69));
    // C-terminus
    charge -= 1 / (1 + Math.pow(10, 2.34 - ph));
    // Side chains
    for (const aa of sequence.toUpperCase()) {
      const prop = propMap.get(aa);
      if (!prop || prop.pKaSideChain === null) continue;
      if (['R', 'K', 'H'].includes(aa)) {
        charge += 1 / (1 + Math.pow(10, ph - prop.pKaSideChain));
      } else if (['D', 'E', 'C', 'Y'].includes(aa)) {
        charge -= 1 / (1 + Math.pow(10, prop.pKaSideChain - ph));
      }
    }
    return charge;
  }

  /** Hemoglobin oxygen saturation curve (Hill equation, n=2.8). */
  hemoglobinSaturation(pO2: number, p50: number = 26.8): number {
    const n = 2.8;
    return Math.pow(pO2, n) / (Math.pow(p50, n) + Math.pow(pO2, n));
  }

  /** Bohr effect on hemoglobin (pH shift on P50). */
  bohrEffect(ph: number): number {
    // log(P50) = log(26.8) - 0.48 * (pH - 7.4)
    return Math.pow(10, Math.log10(26.8) - 0.48 * (ph - 7.4));
  }

  /** Enzyme unit definition: 1 U = amount converting 1 µmol substrate/min. */
  enzymeUnits(rateMicromolPerMin: number): number {
    return rateMicromolPerMin;
  }

  /** Specific activity (U/mg protein). */
  specificActivity(units: number, massMg: number): number {
    if (massMg === 0) return 0;
    return units / massMg;
  }

  /** Turnover number k_cat = Vmax / [E]. */
  turnoverNumber(vmax: number, enzymeConcentration: number): number {
    if (enzymeConcentration === 0) return 0;
    return vmax / enzymeConcentration;
  }

  /** Catalytic efficiency: k_cat / Km. */
  catalyticEfficiency(kcat: number, km: number): number {
    if (km === 0) return 0;
    return kcat / km;
  }

  /** Diffusion limit (Smoluchowski) for enzyme-substrate encounter. */
  diffusionLimit(radius1: number, radius2: number, d1: number, d2: number): number {
    // k = 4πNA * (D1+D2) * (r1+r2)  in M^-1 s^-1
    const na = 6.022e23;
    const r = (radius1 + radius2) * 1e-7; // nm to cm
    const d = (d1 + d2);
    return 4 * Math.PI * na * d * r / 1000; // to M^-1 s^-1
  }

  /** Van't Hoff equation: d(ln K)/dT = ΔH°/(RT²). */
  vantHoff(dH0: number, t1: number, t2: number): number {
    const R = 8.314;
    return -dH0 / R * (1 / t2 - 1 / t1);
  }

  /** Add a custom enzyme. */
  addEnzyme(enzyme: Enzyme): void {
    this._enzymes.push(enzyme);
    this._history.push({ method: 'addEnzyme', target: enzyme.name, timestamp: Date.now() });
  }

  /** Find an enzyme by name. */
  findEnzyme(name: string): Enzyme | null {
    return this._enzymes.find(e => e.name.toLowerCase() === name.toLowerCase()) ?? null;
  }

  /** List all custom enzymes. */
  listEnzymes(): Enzyme[] {
    return [...this._enzymes];
  }

  toPacket(): DataPacket<{
    enzymes: Enzyme[];
    pathways: MetabolicPathway[];
    structures: ProteinStructure[];
    history: BiochemistryRecord[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['biology', 'Biochemistry'],
      priority: 1,
      phase: 'biology:biochemistry',
    };
    return {
      id: `biochem-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        enzymes: this._enzymes,
        pathways: this._pathways,
        structures: this._structures,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._enzymes = [];
    this._pathways = [];
    this._structures = [];
    this._history = [];
    this._counter = 0;
  }

  get enzymeCount(): number {
    return this._enzymes.length;
  }

  get pathwayCount(): number {
    return this._pathways.length;
  }

  get structureCount(): number {
    return this._structures.length;
  }

  get historyDepth(): number {
    return this._history.length;
  }
}

/** Internal helper to copy vitamins array. */
function VITIMINS_COPY(): Vitamin[] {
  return [...VITIMINS];
}

// Re-export for convenience (avoids the typo helper being exposed elsewhere)
export const VITAMINS_LIST = VITIMINS_COPY();
