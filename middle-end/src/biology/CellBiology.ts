import { DataPacket, PacketMeta } from '../shared/types';

/** Cell descriptor. */
export interface Cell {
  type: 'prokaryotic' | 'eukaryotic' | 'plant' | 'animal' | 'fungal';
  organelles: string[];
  membrane: string;
}

/** Cell cycle phase descriptor. */
export interface CellCycle {
  phase: 'G1' | 'S' | 'G2' | 'M' | 'G0';
  duration: number;
  checkpoint: boolean;
}

/** Organelle descriptor. */
export interface Organelle {
  name: string;
  function: string;
  count: number;
}

/** Membrane transport description. */
export interface TransportEvent {
  mechanism: 'passive' | 'facilitated' | 'active' | 'endocytosis' | 'exocytosis' | 'osmosis';
  molecule: string;
  direction: 'inward' | 'outward';
  energyCost: number;
  rate: number;
}

/** Signal transduction step. */
export interface SignalingStep {
  ligand: string;
  receptor: string;
  secondMessenger: string;
  effector: string;
  response: string;
}

/** Apoptosis pathway descriptor. */
export interface ApoptosisPathway {
  type: 'intrinsic' | 'extrinsic' | 'perforin-granzyme';
  triggers: string[];
  caspases: string[];
  outcome: string;
}

/** Cell adhesion molecule descriptor. */
export interface AdhesionMolecule {
  family: 'cadherin' | 'integrin' | 'selectin' | 'IgSF' | 'lectin';
  name: string;
  ligand: string;
  function: string;
  calciumDependent: boolean;
}

/** Stem cell descriptor. */
export interface StemCell {
  potency: 'totipotent' | 'pluripotent' | 'multipotent' | 'oligopotent' | 'unipotent';
  source: string;
  markers: string[];
  differentiationPaths: string[];
}

/** Cancer hallmark descriptor. */
export interface CancerHallmark {
  name: string;
  description: string;
  mechanism: string;
  therapeuticTarget: string;
}

/** Membrane lipid composition entry. */
export interface MembraneLipid {
  name: string;
  fraction: number;
  charge: 'neutral' | 'negative' | 'positive' | 'zwitterionic';
  location: 'outer' | 'inner' | 'both';
}

/** Cell junction descriptor. */
export interface CellJunction {
  type: 'tight' | 'adherens' | 'desmosome' | 'gap' | 'hemidesmosome' | 'focal adhesion';
  proteins: string[];
  function: string;
  tissue: string;
}

/** Mitosis phase descriptor with detailed substructure. */
export interface MitosisPhase {
  phase: 'prophase' | 'prometaphase' | 'metaphase' | 'anaphase' | 'telophase';
  duration: number; // minutes
  keyEvents: string[];
  checkpoint: string;
}

/** Meiotic recombination event. */
export interface RecombinationEvent {
  type: 'crossing-over' | 'independent-assortment' | 'gene-conversion';
  position: number;
  frequency: number;
}

/** History record. */
interface CellBiologyRecord {
  method: string;
  target: string;
  timestamp: number;
}

/** Standard genetic code (mRNA codon to amino acid). */
const CODON_TABLE: Record<string, string> = {
  UUU: 'F', UUC: 'F', UUA: 'L', UUG: 'L',
  CUU: 'L', CUC: 'L', CUA: 'L', CUG: 'L',
  AUU: 'I', AUC: 'I', AUA: 'I', AUG: 'M',
  GUU: 'V', GUC: 'V', GUA: 'V', GUG: 'V',
  UCU: 'S', UCC: 'S', UCA: 'S', UCG: 'S',
  CCU: 'P', CCC: 'P', CCA: 'P', CCG: 'P',
  ACU: 'T', ACC: 'T', ACA: 'T', ACG: 'T',
  GCU: 'A', GCC: 'A', GCA: 'A', GCG: 'A',
  UAU: 'Y', UAC: 'Y', UAA: '*', UAG: '*',
  CAU: 'H', CAC: 'H', CAA: 'Q', CAG: 'Q',
  AAU: 'N', AAC: 'N', AAA: 'K', AAG: 'K',
  GAU: 'D', GAC: 'D', GAA: 'E', GAG: 'E',
  UGU: 'C', UGC: 'C', UGA: '*', UGG: 'W',
  CGU: 'R', CGC: 'R', CGA: 'R', CGG: 'R',
  AGU: 'S', AGC: 'S', AGA: 'R', AGG: 'R',
  GGU: 'G', GGC: 'G', GGA: 'G', GGG: 'G',
};

/** DNA complement bases. */
const DNA_COMPLEMENT: Record<string, string> = { A: 'T', T: 'A', C: 'G', G: 'C' };

/** RNA complement (transcription). */
const DNA_TO_RNA: Record<string, string> = { A: 'U', T: 'A', C: 'G', G: 'C' };

/** Membrane lipid catalog. */
const MEMBRANE_LIPIDS: MembraneLipid[] = [
  { name: 'phosphatidylcholine', fraction: 0.45, charge: 'zwitterionic', location: 'outer' },
  { name: 'phosphatidylethanolamine', fraction: 0.25, charge: 'zwitterionic', location: 'inner' },
  { name: 'phosphatidylserine', fraction: 0.10, charge: 'negative', location: 'inner' },
  { name: 'phosphatidylinositol', fraction: 0.08, charge: 'negative', location: 'inner' },
  { name: 'sphingomyelin', fraction: 0.10, charge: 'zwitterionic', location: 'outer' },
  { name: 'cholesterol', fraction: 0.30, charge: 'neutral', location: 'both' },
];

/** Major cell junction catalog. */
const CELL_JUNCTIONS: CellJunction[] = [
  { type: 'tight', proteins: ['claudins', 'occludin', 'ZO-1', 'ZO-2'], function: 'seal paracellular space', tissue: 'epithelium' },
  { type: 'adherens', proteins: ['E-cadherin', 'β-catenin', 'α-catenin'], function: 'cell-cell adhesion', tissue: 'epithelium' },
  { type: 'desmosome', proteins: ['desmoglein', 'desmocollin', 'desmoplakin'], function: 'mechanical strength', tissue: 'epithelium, cardiac muscle' },
  { type: 'gap', proteins: ['connexin'], function: 'ionic/metabolic coupling', tissue: 'cardiac muscle, neurons' },
  { type: 'hemidesmosome', proteins: ['α6β4 integrin', 'plectin', 'BP230'], function: 'anchor to basement membrane', tissue: 'epithelium' },
  { type: 'focal adhesion', proteins: ['α-actinin', 'talin', 'vinculin', 'focal adhesion kinase'], function: 'cell-ECM adhesion', tissue: 'fibroblasts' },
];

/** Stem cell potency catalog. */
const STEM_CELL_CATALOG: StemCell[] = [
  { potency: 'totipotent', source: 'zygote', markers: ['Oct4', 'Sox2', 'Nanog', 'CDX2'], differentiationPaths: ['embryonic', 'extraembryonic'] },
  { potency: 'pluripotent', source: 'inner cell mass', markers: ['Oct4', 'Sox2', 'Nanog', 'SSEA-4'], differentiationPaths: ['ectoderm', 'mesoderm', 'endoderm'] },
  { potency: 'multipotent', source: 'bone marrow', markers: ['CD34', 'CD133', 'Sca-1'], differentiationPaths: ['blood', 'bone', 'cartilage', 'fat'] },
  { potency: 'oligopotent', source: 'lymphoid progenitor', markers: ['IL-7R', 'CD127'], differentiationPaths: ['B cell', 'T cell', 'NK cell'] },
  { potency: 'unipotent', source: 'epidermis', markers: ['K15', 'CD200'], differentiationPaths: ['keratinocyte'] },
];

/** Cancer hallmarks (Hanahan and Weinberg 2011). */
const CANCER_HALLMARKS: CancerHallmark[] = [
  { name: 'sustaining proliferative signaling', description: 'oncogene activation (e.g., RAS, MYC)', mechanism: 'growth factor independence', therapeuticTarget: 'EGFR inhibitor' },
  { name: 'evading growth suppressors', description: 'loss of tumor suppressors (RB1, TP53)', mechanism: 'cell cycle checkpoint bypass', therapeuticTarget: 'CDK4/6 inhibitor' },
  { name: 'resisting cell death', description: 'apoptosis evasion', mechanism: 'BCL-2 overexpression', therapeuticTarget: 'BCL-2 inhibitor (venetoclax)' },
  { name: 'enabling replicative immortality', description: 'telomerase reactivation', mechanism: 'hTERT expression', therapeuticTarget: 'telomerase inhibitor' },
  { name: 'inducing angiogenesis', description: 'VEGF-driven vascularization', mechanism: 'HIF1α activation', therapeuticTarget: 'bevacizumab (anti-VEGF)' },
  { name: 'activating invasion and metastasis', description: 'EMT and matrix remodeling', mechanism: 'loss of E-cadherin', therapeuticTarget: 'MMP inhibitor' },
  { name: 'deregulating cellular energetics', description: 'Warburg effect (aerobic glycolysis)', mechanism: 'increased glycolysis', therapeuticTarget: 'HK2 inhibitor' },
  { name: 'avoiding immune destruction', description: 'immune checkpoint engagement', mechanism: 'PD-L1 expression', therapeuticTarget: 'pembrolizumab (anti-PD-1)' },
  { name: 'genome instability and mutation', description: 'defective DNA repair (BRCA1/2)', mechanism: 'PARP dependency', therapeuticTarget: 'olaparib (PARP inhibitor)' },
  { name: 'tumor-promoting inflammation', description: 'tumor-associated macrophages', mechanism: 'NF-κB signaling', therapeuticTarget: 'COX-2 inhibitor' },
];

/** Diffusion constants for common molecules (m^2/s). */
const DIFFUSION_CONSTANTS: Record<string, number> = {
  oxygen: 2.1e-9,
  carbon_dioxide: 1.7e-9,
  water: 2.3e-9,
  glucose: 6.7e-10,
  sodium_ion: 1.33e-9,
  potassium_ion: 1.96e-9,
  atp: 4.0e-10,
  protein: 1.0e-11,
};

/** Mitosis phase durations (minutes). */
const MITOSIS_PHASES: MitosisPhase[] = [
  { phase: 'prophase', duration: 30, keyEvents: ['chromatin condensation', 'nuclear envelope breakdown', 'spindle formation'], checkpoint: 'G2/M DNA damage' },
  { phase: 'prometaphase', duration: 12, keyEvents: ['nuclear envelope fully disassembled', 'kinetochore attachment'], checkpoint: 'spindle assembly' },
  { phase: 'metaphase', duration: 15, keyEvents: ['chromosome alignment at metaphase plate'], checkpoint: 'spindle assembly checkpoint (SAC)' },
  { phase: 'anaphase', duration: 8, keyEvents: ['sister chromatid separation', 'anaphase A and B'], checkpoint: 'anaphase promoting complex (APC/C)' },
  { phase: 'telophase', duration: 20, keyEvents: ['nuclear envelope reassembly', 'chromosome decondensation'], checkpoint: 'exit mitosis' },
];

/** Cell biology: division, transport, metabolism. */
export class CellBiology {
  private _cells: Cell[] = [];
  private _cycles: CellCycle[] = [];
  private _organelles: Map<string, Organelle> = new Map();
  private _history: CellBiologyRecord[] = [];
  private _counter = 0;

  constructor() {
    this._seedOrganelles();
  }

  private _seedOrganelles(): void {
    const seed: Array<[string, string, number]> = [
      ['nucleus', 'stores genetic material', 1],
      ['mitochondria', 'ATP production', 1000],
      ['ribosomes', 'protein synthesis', 10000000],
      ['endoplasmic reticulum', 'protein/lipid synthesis', 1],
      ['golgi apparatus', 'protein packaging', 1],
      ['lysosomes', 'digestion', 300],
      ['chloroplasts', 'photosynthesis (plants)', 50],
      ['vacuoles', 'storage', 1],
      ['cytoskeleton', 'structural support', 1],
      ['cell membrane', 'selective barrier', 1],
      ['peroxisomes', 'oxidative reactions', 100],
      ['centrosome', 'microtubule organization', 1],
      ['nucleolus', 'ribosome biogenesis', 1],
      ['smooth ER', 'lipid synthesis, detoxification', 1],
      ['rough ER', 'protein synthesis, folding', 1],
      ['cytosol', 'metabolic reactions', 1],
    ];
    for (const [name, fn, count] of seed) {
      this._organelles.set(name, { name, function: fn, count });
    }
  }

  /** Mitosis phase descriptor. */
  mitosis(phase: 'prophase' | 'metaphase' | 'anaphase' | 'telophase'): CellCycle {
    const durations: Record<string, number> = { prophase: 30, metaphase: 15, anaphase: 8, telophase: 20 };
    const cycle: CellCycle = {
      phase: 'M',
      duration: durations[phase] ?? 0,
      checkpoint: phase === 'metaphase',
    };
    this._cycles.push(cycle);
    this._history.push({ method: 'mitosis', target: phase, timestamp: Date.now() });
    return cycle;
  }

  /** Detailed mitosis phase information. */
  mitosisDetailed(phase: 'prophase' | 'prometaphase' | 'metaphase' | 'anaphase' | 'telophase'): MitosisPhase {
    const entry = MITOSIS_PHASES.find(p => p.phase === phase) ?? MITOSIS_PHASES[0];
    this._history.push({ method: 'mitosisDetailed', target: phase, timestamp: Date.now() });
    return { ...entry };
  }

  /** Full mitotic sequence. */
  mitosisSequence(): MitosisPhase[] {
    this._history.push({ method: 'mitosisSequence', target: 'all', timestamp: Date.now() });
    return MITOSIS_PHASES.map(p => ({ ...p }));
  }

  /** Total mitosis duration. */
  mitosisDuration(): number {
    return MITOSIS_PHASES.reduce((s, p) => s + p.duration, 0);
  }

  /** Meiosis phase descriptor. */
  meiosis(phase: 'prophase1' | 'metaphase1' | 'anaphase1' | 'telophase1' | 'prophase2' | 'metaphase2' | 'anaphase2' | 'telophase2'): CellCycle {
    const durations: Record<string, number> = {
      prophase1: 90, metaphase1: 30, anaphase1: 15, telophase1: 30,
      prophase2: 30, metaphase2: 15, anaphase2: 8, telophase2: 20,
    };
    const cycle: CellCycle = {
      phase: 'M',
      duration: durations[phase] ?? 0,
      checkpoint: phase === 'metaphase1',
    };
    this._cycles.push(cycle);
    this._history.push({ method: 'meiosis', target: phase, timestamp: Date.now() });
    return cycle;
  }

  /** Meiosis I stages subphases of prophase I. */
  prophaseISubphases(): Array<{ stage: string; duration: number; events: string }> {
    return [
      { stage: 'leptotene', duration: 20, events: 'chromosome condensation begins' },
      { stage: 'zygotene', duration: 25, events: 'synaptonemal complex forms, synapsis' },
      { stage: 'pachytene', duration: 30, events: 'crossing over via Spo11 DSBs' },
      { stage: 'diplotene', duration: 15, events: 'chiasmata visible, dissolution of SC' },
      { stage: 'diakinesis', duration: 10, events: 'terminalization of chiasmata' },
    ];
  }

  /** Recombination frequency from genetic distance (1 Morgan = 100 cM = 100% RF). */
  recombinationFrequency(mapDistanceCM: number): number {
    return Math.min(0.5, mapDistanceCM / 100);
  }

  /** Genetic distance from recombination frequency (Haldane map function). */
  haldaneMapFunction(recombinationFrequency: number): number {
    if (recombinationFrequency <= 0 || recombinationFrequency >= 0.5) return 0;
    return -0.5 * Math.log(1 - 2 * recombinationFrequency) * 100;
  }

  /** Kosambi map function (accounts for interference). */
  kosambiMapFunction(recombinationFrequency: number): number {
    if (recombinationFrequency <= 0 || recombinationFrequency >= 0.5) return 0;
    return 25 * Math.log((1 + 2 * recombinationFrequency) / (1 - 2 * recombinationFrequency));
  }

  /** Inverse Kosambi: map distance -> RF. */
  inverseKosambiMapFunction(mapDistanceCM: number): number {
    const x = mapDistanceCM / 25;
    const expVal = Math.exp(x);
    return (expVal - 1) / (2 * (expVal + 1));
  }

  /** Cytokinesis descriptor. */
  cytokinesis(cell: Cell): { cell: Cell; daughter: number; mechanism: string } {
    const mechanism = cell.type === 'plant' ? 'cell plate formation' : 'cleavage furrow (actin-myosin contractile ring)';
    this._history.push({ method: 'cytokinesis', target: cell.type, timestamp: Date.now() });
    return { cell, daughter: 2, mechanism };
  }

  /** Membrane transport analysis. */
  membraneTransport(
    type: 'passive' | 'active' | 'facilitated' | 'osmosis',
    molecule: string,
    concentration: { in: number; out: number },
  ): { direction: string; energy: boolean; rate: number } {
    const direction = concentration.out > concentration.in ? 'inward' : 'outward';
    const energy = type === 'active';
    const gradient = Math.abs(concentration.out - concentration.in);
    const D = DIFFUSION_CONSTANTS[molecule.toLowerCase()] ?? 1e-10;
    const rate = type === 'active' ? gradient * 1e-3 : gradient * D * 1e9;
    this._history.push({ method: 'membraneTransport', target: molecule, timestamp: Date.now() });
    return { direction, energy, rate };
  }

  /** Detailed transport event. */
  transportEvent(
    mechanism: TransportEvent['mechanism'],
    molecule: string,
    concentration: { in: number; out: number },
  ): TransportEvent {
    const inward = concentration.out > concentration.in;
    const energyCost = mechanism === 'active' ? 1 : mechanism === 'endocytosis' || mechanism === 'exocytosis' ? 2 : 0;
    const D = DIFFUSION_CONSTANTS[molecule.toLowerCase()] ?? 1e-10;
    const gradient = Math.abs(concentration.out - concentration.in);
    const rate = mechanism === 'active' || mechanism === 'endocytosis' || mechanism === 'exocytosis'
      ? gradient * 1e-2
      : gradient * D * 1e9;
    this._history.push({ method: 'transportEvent', target: molecule, timestamp: Date.now() });
    return {
      mechanism,
      molecule,
      direction: inward ? 'inward' : 'outward',
      energyCost,
      rate,
    };
  }

  /** Diffusion along a gradient (Fick's law simplified). */
  diffusion(gradient: { high: number; low: number }): { rate: number; direction: string } {
    const rate = Math.abs(gradient.high - gradient.low) * 0.1;
    this._history.push({ method: 'diffusion', target: 'gradient', timestamp: Date.now() });
    return { rate, direction: 'high to low' };
  }

  /** Fick's first law: J = -D(dC/dx). */
  fickFirstLaw(D: number, dC: number, dx: number): number {
    if (dx === 0) return 0;
    return -D * (dC / dx);
  }

  /** Fick's second law (1D diffusion equation): dC/dt = D * d2C/dx2. */
  fickSecondLaw(D: number, d2Cdx2: number): number {
    return D * d2Cdx2;
  }

  /** Stokes-Einstein radius from diffusion coefficient. */
  stokesEinsteinRadius(D: number, T: number, viscosity: number): number {
    const k = 1.380649e-23;
    return (k * T) / (6 * Math.PI * viscosity * D);
  }

  /** Osmosis across a membrane. */
  osmosis(concentration: { inside: number; outside: number }, membrane: string): { direction: string; tonicity: string; pressure: number } {
    let tonicity: string;
    if (concentration.outside > concentration.inside) tonicity = 'hypertonic';
    else if (concentration.outside < concentration.inside) tonicity = 'hypotonic';
    else tonicity = 'isotonic';
    const R = 8.314;
    const T = 310;
    const osmoticPressure = R * T * Math.abs(concentration.outside - concentration.inside);
    this._history.push({ method: 'osmosis', target: membrane, timestamp: Date.now() });
    return { direction: 'water toward higher solute', tonicity, pressure: osmoticPressure };
  }

  /** Active transport requires energy. */
  activeTransport(molecule: string, energy: number): { molecule: string; energyUsed: number; direction: string } {
    this._history.push({ method: 'activeTransport', target: molecule, timestamp: Date.now() });
    return { molecule, energyUsed: energy, direction: 'against gradient' };
  }

  /** Sodium-potassium pump (Na+/K+ ATPase) properties. */
  sodiumPotassiumPump(): { ionsPerATP: { na: number; k: number }; direction: string; atpPerCycle: number } {
    this._history.push({ method: 'sodiumPotassiumPump', target: 'ATPase', timestamp: Date.now() });
    return {
      ionsPerATP: { na: 3, k: 2 },
      direction: '3 Na+ out, 2 K+ in',
      atpPerCycle: 1,
    };
  }

  /** Calcium ATPase pump properties. */
  calciumPump(): { ionsPerATP: number; direction: string } {
    return { ionsPerATP: 2, direction: '2 Ca2+ from cytosol to SR/ER' };
  }

  /** Proton pump (V-type ATPase). */
  protonPump(): { ionsPerATP: number; direction: string } {
    return { ionsPerATP: 2, direction: 'H+ from cytosol to lumen (acidification)' };
  }

  /** Endocytosis of a particle. */
  endocytosis(particle: string): { particle: string; mechanism: string; types: string[] } {
    this._history.push({ method: 'endocytosis', target: particle, timestamp: Date.now() });
    return {
      particle,
      mechanism: 'membrane engulfment',
      types: ['phagocytosis', 'pinocytosis', 'receptor-mediated endocytosis', 'caveolae-mediated'],
    };
  }

  /** Exocytosis of a vesicle. */
  exocytosis(vesicle: string): { vesicle: string; mechanism: string; cargo: string } {
    this._history.push({ method: 'exocytosis', target: vesicle, timestamp: Date.now() });
    return { vesicle, mechanism: 'membrane fusion (SNARE-mediated)', cargo: 'neurotransmitter/hormone/protein' };
  }

  /** Photosynthesis equation. */
  photosynthesis(light: number, co2: number, h2o: number): { products: { glucose: number; oxygen: number }; rate: number } {
    const rate = Math.min(light, co2, h2o) * 0.1;
    this._history.push({ method: 'photosynthesis', target: 'chloroplast', timestamp: Date.now() });
    return { products: { glucose: rate * 0.1, oxygen: rate * 0.1 }, rate };
  }

  /** Light reactions of photosynthesis. */
  lightReactions(): { inputs: string[]; outputs: string[]; location: string } {
    return {
      inputs: ['H2O', 'NADP+', 'ADP', 'Pi', 'light'],
      outputs: ['O2', 'NADPH', 'ATP', 'H+'],
      location: 'thylakoid membrane',
    };
  }

  /** Calvin cycle (dark reactions). */
  calvinCycle(): { inputs: string[]; outputs: string[]; location: string; enzymes: string[] } {
    return {
      inputs: ['CO2', 'ATP', 'NADPH'],
      outputs: ['G3P', 'ADP', 'NADP+'],
      location: 'stroma',
      enzymes: ['RuBisCO', 'PGK', 'GAPDH', 'TPIS'],
    };
  }

  /** Cellular respiration. */
  cellularRespiration(glucose: number, oxygen: number): { products: { atp: number; co2: number; h2o: number }; rate: number } {
    const rate = Math.min(glucose, oxygen) * 0.5;
    this._history.push({ method: 'cellularRespiration', target: 'mitochondria', timestamp: Date.now() });
    return { products: { atp: rate * 36, co2: rate * 6, h2o: rate * 6 }, rate };
  }

  /** ATP yield breakdown per glucose (aerobic). */
  atpYieldBreakdown(): { stage: string; atp: number; location: string }[] {
    return [
      { stage: 'glycolysis (substrate-level)', atp: 2, location: 'cytosol' },
      { stage: 'glycolysis (NADH → 1.5 ATP each)', atp: 3, location: 'cytosol → mitochondria' },
      { stage: 'pyruvate oxidation', atp: 3, location: 'mitochondrial matrix' },
      { stage: 'TCA cycle (substrate-level)', atp: 2, location: 'matrix' },
      { stage: 'TCA cycle (NADH → 2.5 each)', atp: 15, location: 'matrix' },
      { stage: 'TCA cycle (FADH2 → 1.5 each)', atp: 2, location: 'matrix' },
    ];
  }

  /** Total ATP yield per glucose. */
  totalAtpYield(): number {
    return this.atpYieldBreakdown().reduce((s, e) => s + e.atp, 0);
  }

  /** Protein synthesis from DNA. */
  proteinSynthesis(dna: string): { mrna: string; protein: string } {
    const mrna = this.transcription(dna);
    const protein = this.translation(mrna);
    this._history.push({ method: 'proteinSynthesis', target: 'ribosome', timestamp: Date.now() });
    return { mrna, protein };
  }

  /** Transcribe DNA to mRNA. */
  transcription(dna: string): string {
    const mrna = dna.split('').map(b => DNA_TO_RNA[b] ?? 'X').join('');
    this._history.push({ method: 'transcription', target: 'RNA pol II', timestamp: Date.now() });
    return mrna;
  }

  /** Reverse-transcribe RNA to DNA (retroviral). */
  reverseTranscription(rna: string): string {
    const complement: Record<string, string> = { A: 'T', U: 'A', C: 'G', G: 'C' };
    const dna = rna.split('').map(b => complement[b] ?? 'X').join('');
    this._history.push({ method: 'reverseTranscription', target: 'reverse transcriptase', timestamp: Date.now() });
    return dna;
  }

  /** Translate mRNA to a protein string. */
  translation(mrna: string): string {
    let protein = '';
    let started = false;
    for (let i = 0; i + 3 <= mrna.length; i += 3) {
      const codon = mrna.substring(i, i + 3);
      const aa = CODON_TABLE[codon];
      if (!aa) continue;
      if (!started) {
        if (aa === 'M') {
          protein += aa;
          started = true;
        }
        continue;
      }
      if (aa === '*') break;
      protein += aa;
    }
    this._history.push({ method: 'translation', target: 'ribosome', timestamp: Date.now() });
    return protein;
  }

  /** Resolve single codon to amino acid. */
  codonToAa(codon: string): string {
    return CODON_TABLE[codon.toUpperCase()] ?? 'X';
  }

  /** DNA replication. */
  dnaReplication(dna: string): { leading: string; lagging: string } {
    const newStrand = dna.split('').map(b => DNA_COMPLEMENT[b] ?? 'X').join('');
    this._history.push({ method: 'dnaReplication', target: 'DNA pol III', timestamp: Date.now() });
    return { leading: newStrand, lagging: newStrand.split('').reverse().join('') };
  }

  /** Okazaki fragment length (eukaryotes ~ 200 nt, prokaryotes ~ 1000-2000 nt). */
  okazakiFragmentLength(organism: 'eukaryote' | 'prokaryote'): number {
    return organism === 'eukaryote' ? 200 : 1500;
  }

  /** GC content of DNA. */
  gcContent(dna: string): number {
    if (dna.length === 0) return 0;
    const gc = (dna.match(/[GC]/g) ?? []).length;
    return (gc / dna.length) * 100;
  }

  /** Melting temperature (Tm) of a DNA duplex. */
  meltingTemp(dna: string): number {
    const a = (dna.match(/A/g) ?? []).length;
    const t = (dna.match(/T/g) ?? []).length;
    const g = (dna.match(/G/g) ?? []).length;
    const c = (dna.match(/C/g) ?? []).length;
    if (dna.length < 14) return 2 * (a + t) + 4 * (g + c);
    return 64.9 + (41 * (g + c - 16.4)) / dna.length;
  }

  /** Reverse complement of DNA. */
  reverseComplement(dna: string): string {
    return dna.split('').reverse().map(b => DNA_COMPLEMENT[b] ?? 'X').join('');
  }

  /** List mitosis stages in order. */
  mitosisStages(): string[] {
    this._history.push({ method: 'mitosisStages', target: 'all', timestamp: Date.now() });
    return ['prophase', 'prometaphase', 'metaphase', 'anaphase', 'telophase'];
  }

  /** Cell signaling cascade. */
  cellSignaling(ligand: string, receptor: string): { ligand: string; receptor: string; response: string } {
    this._history.push({ method: 'cellSignaling', target: ligand, timestamp: Date.now() });
    return { ligand, receptor, response: 'cascade activation' };
  }

  /** Detailed signal transduction step. */
  signalTransduction(ligand: string, receptor: string): SignalingStep {
    const secondMessengerMap: Record<string, string> = {
      epinephrine: 'cAMP',
      glucagon: 'cAMP',
      'vasopressin-V1': 'IP3/DAG',
      'vasopressin-V2': 'cAMP',
      'acetylcholine-M1': 'IP3/DAG',
      'acetylcholine-M2': 'cAMP (inhibited)',
      insulin: 'PIP3',
      'growth factor': 'PIP3',
    };
    const sm = secondMessengerMap[ligand.toLowerCase()] ?? 'cAMP';
    const effectorMap: Record<string, string> = {
      cAMP: 'protein kinase A (PKA)',
      'IP3/DAG': 'protein kinase C (PKC)',
      PIP3: 'AKT/PKB',
    };
    const effector = effectorMap[sm] ?? 'kinase cascade';
    const responseMap: Record<string, string> = {
      epinephrine: 'glycogenolysis, lipolysis',
      glucagon: 'gluconeogenesis, glycogenolysis',
      insulin: 'glucose uptake, glycogenesis',
      'growth factor': 'cell proliferation, survival',
    };
    this._history.push({ method: 'signalTransduction', target: ligand, timestamp: Date.now() });
    return {
      ligand,
      receptor,
      secondMessenger: sm,
      effector,
      response: responseMap[ligand.toLowerCase()] ?? 'cellular response',
    };
  }

  /** GPCR pathway analysis. */
  gpcrPathway(ligand: string, gprotein: 'Gs' | 'Gi' | 'Gq' | 'G12'): { secondMessenger: string; effector: string; outcome: string } {
    const pathways: Record<string, { secondMessenger: string; effector: string; outcome: string }> = {
      Gs: { secondMessenger: 'cAMP ↑', effector: 'adenylyl cyclase', outcome: 'PKA activation' },
      Gi: { secondMessenger: 'cAMP ↓', effector: 'adenylyl cyclase (inhibited)', outcome: 'PKA inhibition' },
      Gq: { secondMessenger: 'IP3, DAG', effector: 'phospholipase C', outcome: 'PKC activation, Ca2+ release' },
      G12: { secondMessenger: 'RhoA', effector: 'RhoGEF', outcome: 'cytoskeletal rearrangement' },
    };
    const p = pathways[gprotein];
    this._history.push({ method: 'gpcrPathway', target: `${ligand}:${gprotein}`, timestamp: Date.now() });
    return p;
  }

  /** RTK (receptor tyrosine kinase) pathway analysis. */
  rtkPathway(receptor: string): { cascade: string[]; downstream: string; outcome: string } {
    return {
      cascade: ['ligand binding', 'RTK dimerization', 'autophosphorylation', 'Ras-GEF recruitment', 'Ras-GTP', 'Raf', 'MEK', 'ERK'],
      downstream: 'transcription factors (c-Myc, Elk-1)',
      outcome: 'cell growth, proliferation, differentiation',
    };
  }

  /** Membrane lipid composition. */
  membraneLipids(): MembraneLipid[] {
    return [...MEMBRANE_LIPIDS];
  }

  /** Fluid mosaic model summary. */
  fluidMosaicModel(): { components: string[]; features: string[]; temperature_effect: string } {
    return {
      components: ['phospholipids', 'cholesterol', 'integral proteins', 'peripheral proteins', 'glycolipids', 'glycoproteins'],
      features: ['lateral diffusion', 'flip-flop (rare)', 'flexible', 'asymmetric', 'selectively permeable'],
      temperature_effect: 'lower T → gel phase; higher T → fluid; cholesterol buffers fluidity',
    };
  }

  /** Membrane potential (Goldman-Hodgkin-Katz equation). */
  membranePotential(ions: Array<{ name: string; inside: number; outside: number; permeability: number }>): number {
    let numerator = 0;
    let denominator = 0;
    for (const ion of ions) {
      if (ion.name === 'Cl') {
        numerator += ion.permeability * ion.inside;
        denominator += ion.permeability * ion.outside;
      } else {
        numerator += ion.permeability * ion.outside;
        denominator += ion.permeability * ion.inside;
      }
    }
    if (denominator === 0) return 0;
    return (8.314 * 310 / 96485) * Math.log(numerator / denominator) * 1000;
  }

  /** Nernst equation for a single ion. */
  nernstPotential(ion: string, inside: number, outside: number): number {
    const z: Record<string, number> = { K: 1, Na: 1, Cl: -1, Ca: 2, Mg: 2 };
    const charge = z[ion] ?? 1;
    return (8.314 * 310 / (charge * 96485)) * Math.log(outside / inside) * 1000;
  }

  /** Resting membrane potential (typical neuron). */
  restingPotential(): number {
    return -70;
  }

  /** Action potential characteristics. */
  actionPotentialThreshold(): number {
    return -55;
  }

  /** Apoptosis pathway descriptor. */
  apoptosis(type: 'intrinsic' | 'extrinsic' | 'perforin-granzyme'): ApoptosisPathway {
    const pathways: Record<string, ApoptosisPathway> = {
      intrinsic: {
        type: 'intrinsic',
        triggers: ['DNA damage', 'growth factor withdrawal', 'ER stress', 'hypoxia'],
        caspases: ['caspase-9', 'caspase-3', 'caspase-7'],
        outcome: 'mitochondrial outer membrane permeabilization (MOMP)',
      },
      extrinsic: {
        type: 'extrinsic',
        triggers: ['FasL/Fas', 'TNF-α/TNFR1', 'TRAIL/DR4/DR5'],
        caspases: ['caspase-8', 'caspase-3', 'caspase-7'],
        outcome: 'DISC formation, executioner caspase activation',
      },
      'perforin-granzyme': {
        type: 'perforin-granzyme',
        triggers: ['cytotoxic T cell', 'NK cell'],
        caspases: ['caspase-10', 'caspase-3', 'caspase-7'],
        outcome: 'granzyme B cleaves Bid → tBid → MOMP',
      },
    };
    this._history.push({ method: 'apoptosis', target: type, timestamp: Date.now() });
    return pathways[type];
  }

  /** Necroptosis pathway. */
  necroptosis(): { triggers: string; effectors: string; outcome: string } {
    return {
      triggers: 'TNF + caspase-8 inhibition + cIAP depletion',
      effectors: 'RIPK1, RIPK3, MLKL',
      outcome: 'programmed necrosis, inflammatory',
    };
  }

  /** Autophagy pathway. */
  autophagy(): { triggers: string[]; regulators: string[]; outcome: string } {
    return {
      triggers: ['starvation', 'amino acid depletion', 'mTOR inhibition'],
      regulators: ['ULK1 complex', 'Beclin-1', 'LC3-II', 'p62/SQSTM1'],
      outcome: 'lysosomal degradation of cytoplasmic components',
    };
  }

  /** Cell adhesion molecules catalog. */
  adhesionMolecules(): AdhesionMolecule[] {
    return [
      { family: 'cadherin', name: 'E-cadherin', ligand: 'E-cadherin (homophilic)', function: 'epithelial adhesion', calciumDependent: true },
      { family: 'cadherin', name: 'N-cadherin', ligand: 'N-cadherin (homophilic)', function: 'neural, muscle adhesion', calciumDependent: true },
      { family: 'cadherin', name: 'VE-cadherin', ligand: 'VE-cadherin (homophilic)', function: 'endothelial adherens junctions', calciumDependent: true },
      { family: 'integrin', name: 'α5β1 integrin', ligand: 'fibronectin', function: 'focal adhesion, fibroblast', calciumDependent: true },
      { family: 'integrin', name: 'αLβ2 (LFA-1)', ligand: 'ICAM-1', function: 'leukocyte adhesion', calciumDependent: true },
      { family: 'selectin', name: 'P-selectin', ligand: 'PSGL-1', function: 'platelet-leukocyte adhesion', calciumDependent: true },
      { family: 'selectin', name: 'E-selectin', ligand: 'sialyl-Lewis X', function: 'endothelial-leukocyte adhesion', calciumDependent: true },
      { family: 'IgSF', name: 'ICAM-1', ligand: 'LFA-1', function: 'leukocyte endothelial adhesion', calciumDependent: false },
      { family: 'IgSF', name: 'NCAM', ligand: 'NCAM (homophilic)', function: 'neural adhesion', calciumDependent: false },
    ];
  }

  /** Cell junctions catalog. */
  cellJunctions(): CellJunction[] {
    return [...CELL_JUNCTIONS];
  }

  /** Stem cell potency catalog. */
  stemCells(): StemCell[] {
    return [...STEM_CELL_CATALOG];
  }

  /** Cancer hallmarks catalog. */
  cancerHallmarks(): CancerHallmark[] {
    return [...CANCER_HALLMARKS];
  }

  /** iPSC reprogramming factors (Yamanaka factors). */
  yamanakaFactors(): { factor: string; role: string }[] {
    return [
      { factor: 'Oct4', role: 'maintains pluripotency, Sox2 partner' },
      { factor: 'Sox2', role: 'neural lineage priming, Oct4 partner' },
      { factor: 'Klf4', role: 'anti-proliferative, survival, reprogramming' },
      { factor: 'c-Myc', role: 'proliferation, cell cycle re-entry' },
    ];
  }

  /** Cellular organelle catalog. */
  organelleList(): Organelle[] {
    return Array.from(this._organelles.values());
  }

  /** Get a specific organelle. */
  getOrganelle(name: string): Organelle | null {
    return this._organelles.get(name) ?? null;
  }

  /** Cell type comparison. */
  compareCellTypes(): Array<{ feature: string; prokaryotic: string; eukaryotic: string }> {
    return [
      { feature: 'nucleus', prokaryotic: 'absent', eukaryotic: 'present' },
      { feature: 'membrane-bound organelles', prokaryotic: 'absent', eukaryotic: 'present' },
      { feature: 'DNA structure', prokaryotic: 'circular, naked', eukaryotic: 'linear, with histones' },
      { feature: 'ribosomes', prokaryotic: '70S', eukaryotic: '80S' },
      { feature: 'cell wall', prokaryotic: 'peptidoglycan', eukaryotic: 'cellulose/chitin (if present)' },
      { feature: 'reproduction', prokaryotic: 'binary fission', eukaryotic: 'mitosis/meiosis' },
      { feature: 'size', prokaryotic: '1-10 µm', eukaryotic: '10-100 µm' },
      { feature: 'mitochondria', prokaryotic: 'absent', eukaryotic: 'present' },
    ];
  }

  /** Diffusion coefficient lookup. */
  diffusionCoefficient(molecule: string): number {
    return DIFFUSION_CONSTANTS[molecule.toLowerCase()] ?? 1e-10;
  }

  /** Osmolarity calculation. */
  osmolarity(soluteMoles: Array<{ moles: number; dissociationFactor: number }>): number {
    return soluteMoles.reduce((s, sol) => s + sol.moles * sol.dissociationFactor, 0);
  }

  /** Tonicity classification. */
  tonicity(solutionOsm: number, cellOsm: number = 300): 'hypotonic' | 'isotonic' | 'hypertonic' {
    if (solutionOsm < cellOsm) return 'hypotonic';
    if (solutionOsm > cellOsm) return 'hypertonic';
    return 'isotonic';
  }

  /** Hodgkin-Huxley membrane equation (simplified). */
  hodgkinHuxley(V: number, t: number, params: { gNa: number; gK: number; gL: number; ENa: number; EK: number; EL: number }): number {
    const { gNa, gK, gL, ENa, EK, EL } = params;
    void t;
    const m3 = 0.5;
    const h = 0.5;
    const n4 = 0.3;
    const I = gNa * m3 * m3 * m3 * h * (V - ENa) + gK * n4 * (V - EK) + gL * (V - EL);
    return I;
  }

  /** Cell cycle duration by cell type. */
  cellCycleDuration(cellType: 'bacteria' | 'yeast' | 'mammalian' | 'epidermal' | 'intestinal' | 'hepatocyte' | 'neuron'): number {
    const durations: Record<string, number> = {
      bacteria: 0.5,
      yeast: 2,
      mammalian: 24,
      epidermal: 200,
      intestinal: 12,
      hepatocyte: 400,
      neuron: Infinity,
    };
    return durations[cellType] ?? 24;
  }

  /** G1/S checkpoint analysis. */
  g1SCheckpoint(): { regulator: string; trigger: string; outcome: string } {
    return {
      regulator: 'Rb-E2F, p53, CDK2-Cyclin E',
      trigger: 'mitogenic signals + DNA integrity',
      outcome: 'commitment to S phase',
    };
  }

  /** G2/M checkpoint analysis. */
  g2MCheckpoint(): { regulator: string; trigger: string; outcome: string } {
    return {
      regulator: 'CDK1-Cyclin B, p53, Chk1/Chk2',
      trigger: 'DNA damage',
      outcome: 'mitotic entry or arrest',
    };
  }

  /** Spindle assembly checkpoint. */
  spindleCheckpoint(): { regulator: string; trigger: string; outcome: string } {
    return {
      regulator: 'MAD2, BubR1, APC/C-Cdc20',
      trigger: 'unattached kinetochores',
      outcome: 'anaphase entry blocked',
    };
  }

  /** Cyclin-CDK pairing catalog. */
  cyclinCdkPairs(): Array<{ phase: string; cyclin: string; cdk: string; target: string }> {
    return [
      { phase: 'G1', cyclin: 'D', cdk: '4/6', target: 'Rb phosphorylation' },
      { phase: 'G1/S', cyclin: 'E', cdk: '2', target: 'G1/S transition' },
      { phase: 'S', cyclin: 'A', cdk: '2', target: 'DNA replication' },
      { phase: 'G2/M', cyclin: 'B', cdk: '1', target: 'mitotic entry' },
    ];
  }

  /** Mitochondrial electron transport chain. */
  etcComplexes(): Array<{ complex: string; substrates: string; products: string; protonsPumped: number }> {
    return [
      { complex: 'I (NADH dehydrogenase)', substrates: 'NADH, CoQ', products: 'NAD+, CoQH2', protonsPumped: 4 },
      { complex: 'II (succinate dehydrogenase)', substrates: 'FADH2, CoQ', products: 'FAD, CoQH2', protonsPumped: 0 },
      { complex: 'III (cytochrome bc1)', substrates: 'CoQH2, cyt c', products: 'CoQ, cyt c (reduced)', protonsPumped: 4 },
      { complex: 'IV (cytochrome c oxidase)', substrates: 'cyt c (red), O2', products: 'cyt c (ox), H2O', protonsPumped: 2 },
      { complex: 'V (ATP synthase)', substrates: 'ADP, Pi, H+ gradient', products: 'ATP', protonsPumped: -3 },
    ];
  }

  /** P/O ratio (ATP per oxygen atom). */
  poRatio(electronDonor: 'NADH' | 'FADH2'): number {
    return electronDonor === 'NADH' ? 2.5 : 1.5;
  }

  /** Cell wall composition by kingdom. */
  cellWallComposition(kingdom: 'bacteria' | 'archaea' | 'plants' | 'fungi' | 'animals'): string {
    const composition: Record<string, string> = {
      bacteria: 'peptidoglycan (NAG-NAM peptide cross-links)',
      archaea: 'pseudopeptidoglycan or S-layer',
      plants: 'cellulose + hemicellulose + pectin + lignin',
      fungi: 'chitin (NAG polymer) + glucans',
      animals: 'no cell wall',
    };
    return composition[kingdom];
  }

  /** Cytoskeleton components. */
  cytoskeleton(): Array<{ filament: string; diameter_nm: number; subunit: string; role: string }> {
    return [
      { filament: 'microfilament', diameter_nm: 7, subunit: 'actin', role: 'cell shape, motility, contraction' },
      { filament: 'microtubule', diameter_nm: 25, subunit: 'α/β tubulin', role: 'intracellular transport, mitotic spindle' },
      { filament: 'intermediate filament', diameter_nm: 10, subunit: 'keratin, vimentin, lamin', role: 'mechanical stability' },
    ];
  }

  /** Cell-cell communication types. */
  cellCommunicationTypes(): Array<{ type: string; mechanism: string; example: string }> {
    return [
      { type: 'autocrine', mechanism: 'cell signals to itself', example: 'cytokines in immune cells' },
      { type: 'paracrine', mechanism: 'local signaling to nearby cells', example: 'synaptic transmission' },
      { type: 'endocrine', mechanism: 'hormones via bloodstream', example: 'insulin, thyroid hormone' },
      { type: 'juxtacrine', mechanism: 'direct membrane contact', example: 'Notch-Delta signaling' },
      { type: 'synaptic', mechanism: 'specialized paracrine via synapse', example: 'neurotransmitter release' },
    ];
  }

  /** Second messenger catalog. */
  secondMessengers(): Array<{ messenger: string; source: string; effect: string }> {
    return [
      { messenger: 'cAMP', source: 'adenylyl cyclase', effect: 'PKA activation' },
      { messenger: 'cGMP', source: 'guanylyl cyclase', effect: 'PKG activation' },
      { messenger: 'IP3', source: 'PLC', effect: 'Ca2+ release from ER' },
      { messenger: 'DAG', source: 'PLC', effect: 'PKC activation' },
      { messenger: 'Ca2+', source: 'ER or extracellular', effect: 'calmodulin, CaMK' },
      { messenger: 'PIP3', source: 'PI3K', effect: 'AKT activation' },
      { messenger: 'NO', source: 'NO synthase', effect: 'sGC, vasodilation' },
      { messenger: 'arachidonic acid', source: 'PLA2', effect: 'eicosanoid synthesis' },
    ];
  }

  /** Mitochondrial chemiosmotic coupling. */
  chemiosmoticCoupling(protonsPumped: number, protonLeak: number): { atpSynthesized: number; couplingEfficiency: number } {
    const atpSynthesized = Math.max(0, (protonsPumped - protonLeak) / 3);
    const couplingEfficiency = protonsPumped === 0 ? 0 : 1 - protonLeak / protonsPumped;
    return { atpSynthesized, couplingEfficiency };
  }

  /** ROS (reactive oxygen species) generation. */
  rosGeneration(mitochondrialComplex: 'I' | 'II' | 'III' | 'IV'): { species: string; rate: number; scavenger: string } {
    const data: Record<string, { species: string; rate: number; scavenger: string }> = {
      I: { species: 'superoxide (matrix side)', rate: 1.0, scavenger: 'Mn-SOD (MnSOD)' },
      II: { species: 'superoxide (matrix)', rate: 0.7, scavenger: 'Mn-SOD' },
      III: { species: 'superoxide (both sides)', rate: 1.5, scavenger: 'Mn-SOD + Cu/Zn-SOD' },
      IV: { species: 'low', rate: 0.1, scavenger: 'catalase, GPx' },
    };
    return data[mitochondrialComplex];
  }

  /** Mitochondrial DNA characteristics. */
  mtdnaCharacteristics(): { size_bp: number; genes: number; inheritance: string; mutations_rate: string } {
    return {
      size_bp: 16569,
      genes: 37,
      inheritance: 'maternal',
      mutations_rate: '10x higher than nuclear DNA',
    };
  }

  /** Lysosome properties. */
  lysosomeProperties(): { ph: number; enzymes: string[]; function: string } {
    return {
      ph: 4.5,
      enzymes: ['acid hydrolases (proteases, lipases, nucleases, phosphatases)'],
      function: 'degradation, autophagy, plasma membrane repair',
    };
  }

  /** Peroxisome function. */
  peroxisomeFunction(): { enzymes: string[]; function: string; byproduct: string } {
    return {
      enzymes: ['catalase', 'urate oxidase', 'D-amino acid oxidase', 'fatty acyl-CoA oxidase'],
      function: 'very-long-chain fatty acid β-oxidation, H2O2 detoxification',
      byproduct: 'H2O2 (decomposed by catalase: 2H2O2 → 2H2O + O2)',
    };
  }

  /** Protein targeting pathways. */
  proteinTargeting(): Array<{ pathway: string; signal: string; destination: string }> {
    return [
      { pathway: 'co-translational (SRP)', signal: 'N-terminal hydrophobic signal peptide', destination: 'ER lumen, secretory pathway' },
      { pathway: 'mitochondrial import', signal: 'N-terminal presequence', destination: 'mitochondrial matrix' },
      { pathway: 'chloroplast import', signal: 'transit peptide', destination: 'chloroplast stroma' },
      { pathway: 'nuclear import', signal: 'nuclear localization signal (NLS)', destination: 'nucleus' },
      { pathway: 'peroxisomal import', signal: 'PTS1 (C-terminal SKL)', destination: 'peroxisome' },
    ];
  }

  /** Cell viability assay. */
  cellViability(viable: number, total: number): { percentage: number; status: string } {
    const percentage = total === 0 ? 0 : (viable / total) * 100;
    let status = 'critical';
    if (percentage > 95) status = 'healthy';
    else if (percentage > 80) status = 'suboptimal';
    else if (percentage > 50) status = 'stressed';
    return { percentage, status };
  }

  /** Population doubling time. */
  populationDoublingTime(initial: number, final: number, durationHours: number): number {
    if (initial <= 0 || final <= initial) return Infinity;
    return (durationHours * Math.log(2)) / Math.log(final / initial);
  }

  /** Cell count from hemocytometer. */
  hemocytometerCount(cellsPerSquare: number, squaresCounted: number, dilutionFactor: number): number {
    if (squaresCounted === 0) return 0;
    return (cellsPerSquare / squaresCounted) * dilutionFactor * 1e4;
  }

  /** Bacterial growth phases. */
  bacterialGrowthCurve(): Array<{ phase: string; description: string; doubling_time_min: number }> {
    return [
      { phase: 'lag', description: 'adaptation, no division', doubling_time_min: Infinity },
      { phase: 'exponential (log)', description: 'maximum division rate', doubling_time_min: 20 },
      { phase: 'stationary', description: 'growth = death', doubling_time_min: Infinity },
      { phase: 'death', description: 'death > growth', doubling_time_min: -Infinity },
    ];
  }

  /** Mitotic index calculation. */
  mitoticIndex(cellsInMitosis: number, totalCells: number): number {
    if (totalCells === 0) return 0;
    return cellsInMitosis / totalCells;
  }

  /** Contact inhibition descriptor. */
  contactInhibition(): { mechanism: string; regulators: string; loss_in: string } {
    return {
      mechanism: 'cell-cycle arrest upon contact',
      regulators: 'NF2/Merlin, Hippo pathway, LATS1/2, p27',
      loss_in: 'cancer (loss of contact inhibition is a hallmark)',
    };
  }

  /** Anchorage dependence. */
  anchorageDependence(): { mechanism: string; regulators: string; loss_in: string } {
    return {
      mechanism: 'cells must attach to ECM to proliferate',
      regulators: 'integrins, FAK, integrin-linked kinase (ILK)',
      loss_in: 'tumorigenesis (anchorage-independent growth)',
    };
  }

  /** Add a custom cell. */
  addCell(cell: Cell): void {
    this._cells.push(cell);
    this._history.push({ method: 'addCell', target: cell.type, timestamp: Date.now() });
  }

  /** Remove a cell. */
  removeCell(index: number): boolean {
    if (index < 0 || index >= this._cells.length) return false;
    this._cells.splice(index, 1);
    this._history.push({ method: 'removeCell', target: String(index), timestamp: Date.now() });
    return true;
  }

  /** Add an organelle. */
  addOrganelle(organelle: Organelle): void {
    this._organelles.set(organelle.name, organelle);
    this._history.push({ method: 'addOrganelle', target: organelle.name, timestamp: Date.now() });
  }

  toPacket(): DataPacket<{
    cells: Cell[];
    cycles: CellCycle[];
    organelles: Map<string, Organelle>;
    history: CellBiologyRecord[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['biology', 'CellBiology'],
      priority: 1,
      phase: 'biology:cell',
    };
    return {
      id: `cell-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        cells: this._cells,
        cycles: this._cycles,
        organelles: this._organelles,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._cells = [];
    this._cycles = [];
    this._organelles = new Map();
    this._history = [];
    this._counter = 0;
    this._seedOrganelles();
  }

  get cellCount(): number {
    return this._cells.length;
  }

  get cycleCount(): number {
    return this._cycles.length;
  }

  get organelleCount(): number {
    return this._organelles.size;
  }

  get historyDepth(): number {
    return this._history.length;
  }
}
