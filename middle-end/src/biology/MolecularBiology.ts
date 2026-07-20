import { DataPacket, PacketMeta } from '../shared/types';

/** DNA descriptor. */
export interface DNA {
  sequence: string;
  gcContent: number;
}

/** RNA descriptor. */
export interface RNA {
  type: 'mRNA' | 'tRNA' | 'rRNA' | 'snRNA' | 'miRNA';
  sequence: string;
}

/** Protein descriptor. */
export interface Protein {
  sequence: string;
  structure: 'primary' | 'secondary' | 'tertiary' | 'quaternary';
}

/** Restriction enzyme descriptor. */
export interface RestrictionEnzyme {
  name: string;
  recognitionSite: string;
  cutPosition: number;
}

/** PCR primer pair. */
export interface PrimerPair {
  forward: string;
  reverse: string;
  tmForward: number;
  tmReverse: number;
  productLength: number;
}

/** Mutation descriptor. */
export interface Mutation {
  type: 'substitution' | 'insertion' | 'deletion' | 'duplication' | 'inversion' | 'frameshift';
  position: number;
  ref: string;
  alt: string;
  effect: 'synonymous' | 'missense' | 'nonsense' | 'frameshift' | 'splice-site';
}

/** CRISPR guide RNA descriptor. */
export interface GuideRNA {
  sequence: string;
  pam: string;
  target: string;
  offTargets: Array<{ sequence: string; mismatches: number; position: number }>;
}

/** Amino acid property record. */
export interface AminoAcidProperty {
  code: string;
  name: string;
  mw: number;
  pkaCOOH: number;
  pkaNH2: number;
  pKaR: number | null;
  hydrophobicity: number;
  polarity: 'nonpolar' | 'polar' | 'acidic' | 'basic';
}

/** Sequencing platform descriptor. */
export interface SequencingPlatform {
  name: string;
  technology: string;
  readLength: number;
  accuracy: number;
  throughputGb: number;
  costPerGb: number;
  runTime: string;
}

/** BLAST hit descriptor. */
export interface BlastHit {
  subject: string;
  identity: number;
  evalue: number;
  score: number;
  alignmentLength: number;
}

/** Cloning vector descriptor. */
export interface CloningVector {
  name: string;
  size: number;
  copyNumber: number;
  marker: string;
  origin: string;
  multipleCloningSite: string[];
}

/** Real-time PCR method descriptor. */
export interface QpcrMethod {
  chemistry: 'SYBR' | 'TaqMan' | 'Molecular Beacon' | 'Scorpion';
  target: string;
  efficiency: number;
  rSquared: number;
  slope: number;
}

/** RNA-seq result. */
export interface RnaSeqResult {
  gene: string;
  readCount: number;
  tpm: number;
  fpkm: number;
  foldChange: number;
  pValue: number;
}

/** Protein modification descriptor. */
export interface ProteinModification {
  type: 'phosphorylation' | 'glycosylation' | 'ubiquitination' | 'acetylation' | 'methylation' | 'sumoylation';
  residue: string;
  position: number;
  enzyme: string;
}

/** History record. */
interface MolecularBiologyRecord {
  method: string;
  target: string;
  timestamp: number;
}

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

const ENZYMES: RestrictionEnzyme[] = [
  { name: 'EcoRI', recognitionSite: 'GAATTC', cutPosition: 1 },
  { name: 'BamHI', recognitionSite: 'GGATCC', cutPosition: 1 },
  { name: 'HindIII', recognitionSite: 'AAGCTT', cutPosition: 1 },
  { name: 'EcoRV', recognitionSite: 'GATATC', cutPosition: 3 },
  { name: 'NotI', recognitionSite: 'GCGGCCGC', cutPosition: 2 },
  { name: 'XhoI', recognitionSite: 'CTCGAG', cutPosition: 1 },
  { name: 'PstI', recognitionSite: 'CTGCAG', cutPosition: 3 },
  { name: 'SmaI', recognitionSite: 'CCCGGG', cutPosition: 3 },
  { name: 'KpnI', recognitionSite: 'GGTACC', cutPosition: 5 },
  { name: 'SacI', recognitionSite: 'GAGCTC', cutPosition: 5 },
  { name: 'SalI', recognitionSite: 'GTCGAC', cutPosition: 1 },
  { name: 'XbaI', recognitionSite: 'TCTAGA', cutPosition: 1 },
];

const AMINO_ACIDS: AminoAcidProperty[] = [
  { code: 'A', name: 'Alanine', mw: 89.09, pkaCOOH: 2.35, pkaNH2: 9.87, pKaR: null, hydrophobicity: 1.8, polarity: 'nonpolar' },
  { code: 'R', name: 'Arginine', mw: 174.20, pkaCOOH: 2.18, pkaNH2: 9.09, pKaR: 12.48, hydrophobicity: -4.5, polarity: 'basic' },
  { code: 'N', name: 'Asparagine', mw: 132.12, pkaCOOH: 2.18, pkaNH2: 9.09, pKaR: null, hydrophobicity: -3.5, polarity: 'polar' },
  { code: 'D', name: 'Aspartic acid', mw: 133.10, pkaCOOH: 1.88, pkaNH2: 9.60, pKaR: 3.65, hydrophobicity: -3.5, polarity: 'acidic' },
  { code: 'C', name: 'Cysteine', mw: 121.16, pkaCOOH: 1.96, pkaNH2: 10.28, pKaR: 8.18, hydrophobicity: 2.5, polarity: 'polar' },
  { code: 'E', name: 'Glutamic acid', mw: 147.13, pkaCOOH: 2.19, pkaNH2: 9.67, pKaR: 4.25, hydrophobicity: -3.5, polarity: 'acidic' },
  { code: 'Q', name: 'Glutamine', mw: 146.15, pkaCOOH: 2.17, pkaNH2: 9.13, pKaR: null, hydrophobicity: -3.5, polarity: 'polar' },
  { code: 'G', name: 'Glycine', mw: 75.07, pkaCOOH: 2.34, pkaNH2: 9.60, pKaR: null, hydrophobicity: -0.4, polarity: 'nonpolar' },
  { code: 'H', name: 'Histidine', mw: 155.16, pkaCOOH: 1.82, pkaNH2: 9.17, pKaR: 6.00, hydrophobicity: -3.2, polarity: 'basic' },
  { code: 'I', name: 'Isoleucine', mw: 131.17, pkaCOOH: 2.36, pkaNH2: 9.68, pKaR: null, hydrophobicity: 4.5, polarity: 'nonpolar' },
  { code: 'L', name: 'Leucine', mw: 131.17, pkaCOOH: 2.36, pkaNH2: 9.60, pKaR: null, hydrophobicity: 3.8, polarity: 'nonpolar' },
  { code: 'K', name: 'Lysine', mw: 146.19, pkaCOOH: 2.18, pkaNH2: 8.95, pKaR: 10.53, hydrophobicity: -3.9, polarity: 'basic' },
  { code: 'M', name: 'Methionine', mw: 149.21, pkaCOOH: 2.28, pkaNH2: 9.21, pKaR: null, hydrophobicity: 1.9, polarity: 'nonpolar' },
  { code: 'F', name: 'Phenylalanine', mw: 165.19, pkaCOOH: 1.83, pkaNH2: 9.13, pKaR: null, hydrophobicity: 2.8, polarity: 'nonpolar' },
  { code: 'P', name: 'Proline', mw: 115.13, pkaCOOH: 1.99, pkaNH2: 10.60, pKaR: null, hydrophobicity: -1.6, polarity: 'nonpolar' },
  { code: 'S', name: 'Serine', mw: 105.09, pkaCOOH: 2.21, pkaNH2: 9.15, pKaR: null, hydrophobicity: -0.8, polarity: 'polar' },
  { code: 'T', name: 'Threonine', mw: 119.12, pkaCOOH: 2.09, pkaNH2: 9.10, pKaR: null, hydrophobicity: -0.7, polarity: 'polar' },
  { code: 'W', name: 'Tryptophan', mw: 204.23, pkaCOOH: 2.38, pkaNH2: 9.39, pKaR: null, hydrophobicity: -0.9, polarity: 'nonpolar' },
  { code: 'Y', name: 'Tyrosine', mw: 181.19, pkaCOOH: 2.20, pkaNH2: 9.11, pKaR: 10.07, hydrophobicity: -1.3, polarity: 'polar' },
  { code: 'V', name: 'Valine', mw: 117.15, pkaCOOH: 2.32, pkaNH2: 9.62, pKaR: null, hydrophobicity: 4.2, polarity: 'nonpolar' },
];

const SEQUENCING_PLATFORMS: SequencingPlatform[] = [
  { name: 'Sanger', technology: 'capillary electrophoresis', readLength: 1000, accuracy: 99.999, throughputGb: 0.000001, costPerGb: 100000, runTime: 'hours' },
  { name: 'Illumina MiSeq', technology: 'sequencing by synthesis', readLength: 300, accuracy: 99.9, throughputGb: 15, costPerGb: 100, runTime: '4-56 hours' },
  { name: 'Illumina NovaSeq', technology: 'sequencing by synthesis', readLength: 300, accuracy: 99.9, throughputGb: 6000, costPerGb: 5, runTime: '13-44 hours' },
  { name: 'PacBio Sequel', technology: 'single-molecule real-time (SMRT)', readLength: 30000, accuracy: 99, throughputGb: 100, costPerGb: 50, runTime: '30 hours' },
  { name: 'Oxford Nanopore MinION', technology: 'nanopore', readLength: 1000000, accuracy: 95, throughputGb: 50, costPerGb: 100, runTime: '1-72 hours' },
  { name: 'Oxford Nanopore PromethION', technology: 'nanopore', readLength: 1000000, accuracy: 97, throughputGb: 7000, costPerGb: 10, runTime: '64 hours' },
  { name: 'Ion Torrent', technology: 'semiconductor', readLength: 400, accuracy: 99, throughputGb: 50, costPerGb: 50, runTime: '2-8 hours' },
];

const CLONING_VECTORS: CloningVector[] = [
  { name: 'pUC19', size: 2686, copyNumber: 500, marker: 'lacZα', origin: 'pMB1', multipleCloningSite: ['EcoRI', 'BamHI', 'HindIII', 'PstI', 'SmaI', 'XbaI', 'SalI'] },
  { name: 'pBR322', size: 4361, copyNumber: 20, marker: 'AmpR, TetR', origin: 'pMB1', multipleCloningSite: ['EcoRI', 'BamHI', 'PstI', 'HindIII'] },
  { name: 'pET28', size: 5368, copyNumber: 100, marker: 'KanR, His-tag', origin: 'pBR322 ori', multipleCloningSite: ['NdeI', 'XhoI', 'BamHI', 'EcoRI'] },
  { name: 'pGEX', size: 4969, copyNumber: 100, marker: 'AmpR, GST-tag', origin: 'pBR322 ori', multipleCloningSite: ['BamHI', 'EcoRI', 'SalI', 'XhoI'] },
  { name: 'pBad', size: 4100, copyNumber: 50, marker: 'AmpR, arabinose-inducible', origin: 'pBR322 ori', multipleCloningSite: ['NcoI', 'XhoI', 'HindIII'] },
  { name: 'pFastBac', size: 4776, copyNumber: 100, marker: 'AmpR, GentR', origin: 'pUC ori', multipleCloningSite: ['BamHI', 'EcoRI', 'XhoI', 'NotI'] },
];

/** Molecular biology: DNA, RNA, protein, PCR. */
export class MolecularBiology {
  private _dna: Map<string, DNA> = new Map();
  private _rna: RNA[] = [];
  private _proteins: Protein[] = [];
  private _enzymes: RestrictionEnzyme[] = [];
  private _history: MolecularBiologyRecord[] = [];
  private _counter = 0;

  constructor() {
    this._enzymes = [...ENZYMES];
  }

  /** Transcribe DNA into mRNA. */
  transcribe(dna: string): RNA {
    const complement: Record<string, string> = { A: 'U', T: 'A', C: 'G', G: 'C' };
    const sequence = dna.split('').map(b => complement[b] ?? 'X').join('');
    const rna: RNA = { type: 'mRNA', sequence };
    this._rna.push(rna);
    this._history.push({ method: 'transcribe', target: 'mRNA', timestamp: Date.now() });
    return rna;
  }

  /** Translate mRNA into a protein. */
  translate(mrna: RNA): Protein {
    let seq = '';
    let started = false;
    for (let i = 0; i + 3 <= mrna.sequence.length; i += 3) {
      const codon = mrna.sequence.substring(i, i + 3);
      const aa = CODON_TABLE[codon];
      if (!aa) continue;
      if (!started) {
        if (aa === 'M') {
          seq += aa;
          started = true;
        }
        continue;
      }
      if (aa === '*') break;
      seq += aa;
    }
    const protein: Protein = { sequence: seq, structure: 'primary' };
    this._proteins.push(protein);
    this._history.push({ method: 'translate', target: 'protein', timestamp: Date.now() });
    return protein;
  }

  /** Reverse translate a protein to a degenerate DNA sequence (most common codons). */
  reverseTranslate(protein: string): string {
    const aaToCodon: Record<string, string> = {
      A: 'GCT', R: 'CGT', N: 'AAT', D: 'GAT', C: 'TGT',
      E: 'GAA', Q: 'CAG', G: 'GGT', H: 'CAT', I: 'ATT',
      L: 'CTT', K: 'AAA', M: 'ATG', F: 'TTT', P: 'CCT',
      S: 'TCT', T: 'ACT', W: 'TGG', Y: 'TAT', V: 'GTT',
    };
    let dna = '';
    for (const aa of protein) {
      dna += aaToCodon[aa] ?? 'NNN';
    }
    return dna;
  }

  /** Return the codon table. */
  codonTable(): Record<string, string> {
    this._history.push({ method: 'codonTable', target: 'all', timestamp: Date.now() });
    return { ...CODON_TABLE };
  }

  /** Resolve single amino acid from a codon. */
  aminoAcid(codon: string): string {
    this._history.push({ method: 'aminoAcid', target: codon, timestamp: Date.now() });
    return CODON_TABLE[codon] ?? 'X';
  }

  /** Codon usage bias (E. coli optimized). */
  codonUsageBias(organism: 'ecoli' | 'human' | 'yeast'): Record<string, number> {
    const tables: Record<string, Record<string, number>> = {
      ecoli: { ATG: 1.0, TTT: 0.58, TTC: 0.42, TTA: 0.14, TTG: 0.13, CTT: 0.11, CTC: 0.11, CTA: 0.04, CTG: 0.47 },
      human: { ATG: 1.0, TTT: 0.46, TTC: 0.54, TTA: 0.07, TTG: 0.13, CTT: 0.13, CTC: 0.20, CTA: 0.07, CTG: 0.40 },
      yeast: { ATG: 1.0, TTT: 0.30, TTC: 0.70, TTA: 0.13, TTG: 0.30, CTT: 0.13, CTC: 0.10, CTA: 0.13, CTG: 0.21 },
    };
    return tables[organism];
  }

  /** Compute GC content of a DNA sequence. */
  gcContent(dna: string): number {
    if (dna.length === 0) return 0;
    const gc = (dna.match(/[GC]/g) ?? []).length;
    const content = (gc / dna.length) * 100;
    this._history.push({ method: 'gcContent', target: 'gc', timestamp: Date.now() });
    return content;
  }

  /** Compute AT content. */
  atContent(dna: string): number {
    if (dna.length === 0) return 0;
    return 100 - this.gcContent(dna);
  }

  /** Compute melting temperature (Wallace rule for short oligos). */
  meltingTemp(dna: string): number {
    const a = (dna.match(/A/g) ?? []).length;
    const t = (dna.match(/T/g) ?? []).length;
    const g = (dna.match(/G/g) ?? []).length;
    const c = (dna.match(/C/g) ?? []).length;
    let tm: number;
    if (dna.length < 14) {
      tm = 2 * (a + t) + 4 * (g + c);
    } else {
      tm = 64.9 + 41 * (g + c - 16.4) / dna.length;
    }
    this._history.push({ method: 'meltingTemp', target: 'tm', timestamp: Date.now() });
    return tm;
  }

  /** Salt-adjusted melting temperature. */
  meltingTempSalt(dna: string, naConc: number): number {
    const gc = (dna.match(/[GC]/gi) ?? []).length;
    const gcFraction = dna.length === 0 ? 0 : gc / dna.length;
    const tm = 81.5 + 16.6 * Math.log10(naConc) + 41 * gcFraction - 600 / dna.length;
    return tm;
  }

  /** Nearest-neighbor Tm calculation (simplified). */
  nearestNeighborTm(dna: string, naConc: number = 0.05): number {
    const nnParams: Record<string, { dH: number; dS: number }> = {
      AA: { dH: -7.9, dS: -22.2 }, AT: { dH: -7.2, dS: -20.4 },
      TA: { dH: -7.2, dS: -21.3 }, TT: { dH: -7.9, dS: -22.2 },
      CA: { dH: -8.5, dS: -22.7 }, CT: { dH: -7.8, dS: -21.0 },
      GA: { dH: -8.2, dS: -22.2 }, GT: { dH: -8.4, dS: -22.4 },
      CG: { dH: -10.6, dS: -27.2 }, GC: { dH: -9.8, dS: -24.4 },
      GG: { dH: -8.0, dS: -19.9 }, CC: { dH: -8.0, dS: -19.9 },
      AG: { dH: -7.8, dS: -21.0 }, AC: { dH: -8.4, dS: -22.4 },
      TG: { dH: -8.2, dS: -22.2 }, TC: { dH: -8.5, dS: -22.7 },
    };
    let dH = 0.2;
    let dS = -5.7;
    for (let i = 0; i < dna.length - 1; i++) {
      const pair = dna.substring(i, i + 2).toUpperCase();
      const params = nnParams[pair];
      if (params) {
        dH += params.dH;
        dS += params.dS;
      }
    }
    const R = 1.987;
    const ct = 0.00025;
    const tm = (dH * 1000) / (dS + R * Math.log(ct / 4)) - 273.15 + 16.6 * Math.log10(naConc);
    return tm;
  }

  /** Design a primer with target melting temperature. */
  primerDesign(template: string, tm: number): { primer: string; tm: number } {
    let primer = '';
    for (const b of template) {
      primer += b;
      const currentTm = this.meltingTemp(primer);
      if (currentTm >= tm) break;
    }
    this._history.push({ method: 'primerDesign', target: 'primer', timestamp: Date.now() });
    return { primer, tm: this.meltingTemp(primer) };
  }

  /** Design a primer pair for PCR. */
  primerPairDesign(template: string, targetLength: number, targetTm: number): PrimerPair {
    const forward = this.primerDesign(template, targetTm).primer;
    const reverseTemplate = this.reverseComplement(template.substring(Math.max(0, targetLength - forward.length - 100)));
    const reverse = this.primerDesign(reverseTemplate, targetTm).primer;
    return {
      forward,
      reverse,
      tmForward: this.meltingTemp(forward),
      tmReverse: this.meltingTemp(reverse),
      productLength: targetLength,
    };
  }

  /** PCR amplification simulation. */
  pcr(template: string, primers: { forward: string; reverse: string }, cycles: number): { copies: number; product: string } {
    const copies = Math.pow(2, cycles);
    void primers;
    this._history.push({ method: 'pcr', target: `${cycles} cycles`, timestamp: Date.now() });
    return { copies, product: template };
  }

  /** PCR efficiency from standard curve slope. */
  pcrEfficiency(slope: number): number {
    if (slope === 0) return 0;
    return Math.pow(10, -1 / slope) - 1;
  }

  /** qPCR Ct value simulation. */
  qpcrCt(initialCopies: number, efficiency: number, threshold: number): number {
    if (initialCopies <= 0 || efficiency <= 0) return Infinity;
    const log = Math.log(threshold / initialCopies) / Math.log(1 + efficiency);
    return log;
  }

  /** Gel electrophoresis simulation. */
  gelElectrophoresis(dna: string, fragments: number[]): { bands: Array<{ size: number; position: number }> } {
    const bands = fragments.map(f => ({
      size: f,
      position: Math.log10(f + 1) * 10,
    }));
    void dna;
    this._history.push({ method: 'gelElectrophoresis', target: 'gel', timestamp: Date.now() });
    return { bands };
  }

  /** Restriction digest simulation. */
  restrictionDigest(dna: string, enzyme: string): { fragments: string[]; enzyme: string; cutCount: number } {
    const e = this._enzymes.find(en => en.name === enzyme);
    if (!e) return { fragments: [dna], enzyme, cutCount: 0 };
    const site = e.recognitionSite;
    const regex = new RegExp(site, 'g');
    const fragments: string[] = [];
    let lastIdx = 0;
    let match: RegExpExecArray | null;
    let cutCount = 0;
    while ((match = regex.exec(dna)) !== null) {
      fragments.push(dna.substring(lastIdx, match.index + e.cutPosition));
      lastIdx = match.index + e.cutPosition;
      cutCount++;
    }
    fragments.push(dna.substring(lastIdx));
    this._history.push({ method: 'restrictionDigest', target: enzyme, timestamp: Date.now() });
    return { fragments, enzyme, cutCount };
  }

  /** Find all restriction sites in a sequence. */
  restrictionSites(dna: string): Array<{ enzyme: string; positions: number[] }> {
    const results: Array<{ enzyme: string; positions: number[] }> = [];
    for (const e of this._enzymes) {
      const positions: number[] = [];
      let idx = 0;
      while ((idx = dna.indexOf(e.recognitionSite, idx)) !== -1) {
        positions.push(idx);
        idx++;
      }
      if (positions.length > 0) results.push({ enzyme: e.name, positions });
    }
    return results;
  }

  /** Ligation of fragments. */
  ligation(fragments: string[]): { product: string; count: number } {
    this._history.push({ method: 'ligation', target: 'ligation', timestamp: Date.now() });
    return { product: fragments.join(''), count: fragments.length };
  }

  /** Molecular cloning. */
  cloning(insert: string, vector: string): { recombinant: string; insert: string; vector: string } {
    const recombinant = `${vector.substring(0, Math.floor(vector.length / 2))}${insert}${vector.substring(Math.floor(vector.length / 2))}`;
    this._history.push({ method: 'cloning', target: 'recombinant', timestamp: Date.now() });
    return { recombinant, insert, vector };
  }

  /** Gateway cloning. */
  gatewayCloning(entryClone: string, destinationVector: string): { expressionClone: string } {
    const startCodonIdx = entryClone.indexOf('ATG');
    const insert = startCodonIdx >= 0 ? entryClone.substring(startCodonIdx) : entryClone;
    return { expressionClone: destinationVector + insert };
  }

  /** Gibson assembly. */
  gibsonAssembly(fragments: string[], overlapLength: number = 20): { assembled: string; fragmentCount: number } {
    let assembled = fragments[0] ?? '';
    for (let i = 1; i < fragments.length; i++) {
      assembled += (fragments[i] ?? '').substring(overlapLength);
    }
    return { assembled, fragmentCount: fragments.length };
  }

  /** Golden Gate assembly. */
  goldenGateAssembly(parts: string[]): { assembled: string } {
    return { assembled: parts.join('') };
  }

  /** Sequencing method summary. */
  sequencing(method: 'sanger' | 'next-generation' | 'nanopore' | 'pacbio'): { method: string; readLength: number; accuracy: number } {
    const table: Record<string, { readLength: number; accuracy: number }> = {
      sanger: { readLength: 1000, accuracy: 99.9 },
      'next-generation': { readLength: 300, accuracy: 99.9 },
      nanopore: { readLength: 100000, accuracy: 95 },
      pacbio: { readLength: 20000, accuracy: 99 },
    };
    const entry = table[method] ?? table.sanger;
    this._history.push({ method: 'sequencing', target: method, timestamp: Date.now() });
    return { method, ...entry };
  }

  /** Sequencing platforms catalog. */
  sequencingPlatforms(): SequencingPlatform[] {
    return [...SEQUENCING_PLATFORMS];
  }

  /** Coverage calculation. */
  sequencingCoverage(reads: number, readLength: number, genomeSize: number): number {
    if (genomeSize === 0) return 0;
    return (reads * readLength) / genomeSize;
  }

  /** Lander-Waterman coverage theory. */
  landerWaterman(genomeSize: number, readCount: number, readLength: number): { coverage: number; gaps: number; fractionCovered: number } {
    const coverage = (readCount * readLength) / genomeSize;
    const fractionCovered = 1 - Math.exp(-coverage);
    const gaps = genomeSize * Math.exp(-coverage);
    return { coverage, gaps, fractionCovered };
  }

  /** N50 calculation. */
  n50(contigs: number[]): number {
    if (contigs.length === 0) return 0;
    const sorted = [...contigs].sort((a, b) => b - a);
    const total = sorted.reduce((s, c) => s + c, 0);
    let cumulative = 0;
    for (const c of sorted) {
      cumulative += c;
      if (cumulative >= total / 2) return c;
    }
    return sorted[sorted.length - 1] ?? 0;
  }

  /** BLAST alignment simulation. */
  blast(query: string, database: string[], eValueThreshold: number = 0.001): BlastHit[] {
    const hits: BlastHit[] = [];
    for (const subject of database) {
      const matches = this._countMatches(query, subject);
      if (matches > 0) {
        const identity = (matches / Math.max(query.length, subject.length)) * 100;
        const evalue = Math.pow(10, -matches / 10);
        if (evalue <= eValueThreshold) {
          hits.push({
            subject,
            identity,
            evalue,
            score: matches * 2,
            alignmentLength: matches,
          });
        }
      }
    }
    return hits.sort((a, b) => b.score - a.score);
  }

  private _countMatches(a: string, b: string): number {
    const minLen = Math.min(a.length, b.length);
    let matches = 0;
    for (let i = 0; i < minLen; i++) {
      if (a[i] === b[i]) matches++;
    }
    return matches;
  }

  /** Smith-Waterman local alignment (simplified). */
  smithWaterman(seq1: string, seq2: string, matchScore: number = 2, mismatchScore: number = -1, gapScore: number = -1): { score: number; aligned1: string; aligned2: string } {
    const m = seq1.length;
    const n = seq2.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    let maxScore = 0;
    let maxI = 0;
    let maxJ = 0;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const match = seq1[i - 1] === seq2[j - 1] ? matchScore : mismatchScore;
        dp[i]![j] = Math.max(0, dp[i - 1]![j - 1]! + match, dp[i - 1]![j]! + gapScore, dp[i]![j - 1]! + gapScore);
        if (dp[i]![j]! > maxScore) {
          maxScore = dp[i]![j]!;
          maxI = i;
          maxJ = j;
        }
      }
    }
    let aligned1 = '';
    let aligned2 = '';
    let i = maxI;
    let j = maxJ;
    while (i > 0 && j > 0 && dp[i]![j]! > 0) {
      const match = seq1[i - 1] === seq2[j - 1] ? matchScore : mismatchScore;
      if (dp[i]![j] === dp[i - 1]![j - 1]! + match) {
        aligned1 = seq1[i - 1] + aligned1;
        aligned2 = seq2[j - 1] + aligned2;
        i--;
        j--;
      } else if (dp[i]![j] === dp[i - 1]![j]! + gapScore) {
        aligned1 = seq1[i - 1] + aligned1;
        aligned2 = '-' + aligned2;
        i--;
      } else {
        aligned1 = '-' + aligned1;
        aligned2 = seq2[j - 1] + aligned2;
        j--;
      }
    }
    return { score: maxScore, aligned1, aligned2 };
  }

  /** Needleman-Wunsch global alignment (simplified). */
  needlemanWunsch(seq1: string, seq2: string, matchScore: number = 2, mismatchScore: number = -1, gapScore: number = -1): { score: number; aligned1: string; aligned2: string } {
    const m = seq1.length;
    const n = seq2.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i]![0] = i * gapScore;
    for (let j = 0; j <= n; j++) dp[0]![j] = j * gapScore;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const match = seq1[i - 1] === seq2[j - 1] ? matchScore : mismatchScore;
        dp[i]![j] = Math.max(dp[i - 1]![j - 1]! + match, dp[i - 1]![j]! + gapScore, dp[i]![j - 1]! + gapScore);
      }
    }
    let aligned1 = '';
    let aligned2 = '';
    let i = m;
    let j = n;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && dp[i]![j] === dp[i - 1]![j - 1]! + (seq1[i - 1] === seq2[j - 1] ? matchScore : mismatchScore)) {
        aligned1 = seq1[i - 1] + aligned1;
        aligned2 = seq2[j - 1] + aligned2;
        i--;
        j--;
      } else if (i > 0 && dp[i]![j] === dp[i - 1]![j]! + gapScore) {
        aligned1 = seq1[i - 1] + aligned1;
        aligned2 = '-' + aligned2;
        i--;
      } else {
        aligned1 = '-' + aligned1;
        aligned2 = seq2[j - 1] + aligned2;
        j--;
      }
    }
    return { score: dp[m]![n]!, aligned1, aligned2 };
  }

  /** Hamming distance. */
  hammingDistance(s1: string, s2: string): number {
    if (s1.length !== s2.length) return Math.abs(s1.length - s2.length);
    let distance = 0;
    for (let i = 0; i < s1.length; i++) {
      if (s1[i] !== s2[i]) distance++;
    }
    return distance;
  }

  /** Edit (Levenshtein) distance. */
  levenshteinDistance(s1: string, s2: string): number {
    const m = s1.length;
    const n = s2.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i]![0] = i;
    for (let j = 0; j <= n; j++) dp[0]![j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + cost);
      }
    }
    return dp[m]![n]!;
  }

  /** Predict protein folding class. */
  proteinFolding(sequence: string): { class: string; confidence: number } {
    const hydrophobic = (sequence.match(/[AVILMFYW]/g) ?? []).length;
    const ratio = hydrophobic / Math.max(sequence.length, 1);
    const cls = ratio > 0.4 ? 'globular' : 'fibrous';
    this._history.push({ method: 'proteinFolding', target: 'class', timestamp: Date.now() });
    return { class: cls, confidence: Math.min(1, ratio * 1.5) };
  }

  /** Predict secondary structure. */
  secondaryStructure(sequence: string): { alphaHelix: number; betaSheet: number; coil: number } {
    const helix = (sequence.match(/[AELM]/g) ?? []).length;
    const sheet = (sequence.match(/[VTIY]/g) ?? []).length;
    const total = sequence.length || 1;
    const coil = total - helix - sheet;
    this._history.push({ method: 'secondaryStructure', target: '2D', timestamp: Date.now() });
    return {
      alphaHelix: helix / total,
      betaSheet: sheet / total,
      coil: coil / total,
    };
  }

  /** Chou-Fasman secondary structure prediction (simplified). */
  chouFasman(sequence: string): { regions: Array<{ start: number; end: number; type: string }> } {
    const helixPromoters = new Set(['A', 'E', 'L', 'M', 'Q', 'K', 'R', 'H']);
    const sheetPromoters = new Set(['V', 'I', 'Y', 'F', 'W', 'T']);
    const regions: Array<{ start: number; end: number; type: string }> = [];
    let currentType = '';
    let start = 0;
    for (let i = 0; i < sequence.length; i++) {
      const aa = sequence[i]!;
      let type = 'coil';
      if (helixPromoters.has(aa)) type = 'helix';
      else if (sheetPromoters.has(aa)) type = 'sheet';
      if (type !== currentType) {
        if (currentType !== '' && i - start >= 4) {
          regions.push({ start, end: i - 1, type: currentType });
        }
        currentType = type;
        start = i;
      }
    }
    if (currentType !== '' && sequence.length - start >= 4) {
      regions.push({ start, end: sequence.length - 1, type: currentType });
    }
    return { regions };
  }

  /** Protein molecular weight. */
  proteinMolecularWeight(sequence: string): number {
    if (sequence.length === 0) return 0;
    let total = 18.02;
    for (const aa of sequence) {
      const prop = AMINO_ACIDS.find(p => p.code === aa);
      if (prop) total += prop.mw - 18.02;
    }
    return total;
  }

  /** Protein isoelectric point (pI). */
  proteinIsoelectricPoint(sequence: string): number {
    const counts: Record<string, number> = {};
    for (const aa of sequence) {
      counts[aa] = (counts[aa] ?? 0) + 1;
    }
    let low = 0;
    let high = 14;
    for (let iter = 0; iter < 50; iter++) {
      const mid = (low + high) / 2;
      let charge = 0;
      for (const aa of sequence) {
        const prop = AMINO_ACIDS.find(p => p.code === aa);
        if (!prop) continue;
        if (prop.polarity === 'acidic') charge -= counts[aa]! / (1 + Math.pow(10, prop.pKaR! - mid));
        if (prop.polarity === 'basic') charge += counts[aa]! / (1 + Math.pow(10, mid - prop.pKaR!));
      }
      charge += 1 / (1 + Math.pow(10, mid - 9.0));
      charge -= 1 / (1 + Math.pow(10, 2.0 - mid));
      if (charge > 0) low = mid;
      else high = mid;
    }
    return (low + high) / 2;
  }

  /** Grand average of hydropathicity (GRAVY). */
  gravyScore(sequence: string): number {
    if (sequence.length === 0) return 0;
    let sum = 0;
    for (const aa of sequence) {
      const prop = AMINO_ACIDS.find(p => p.code === aa);
      if (prop) sum += prop.hydrophobicity;
    }
    return sum / sequence.length;
  }

  /** Amino acid composition. */
  aaComposition(sequence: string): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const aa of sequence) {
      counts[aa] = (counts[aa] ?? 0) + 1;
    }
    const total = sequence.length || 1;
    const result: Record<string, number> = {};
    for (const aa in counts) {
      result[aa] = counts[aa]! / total;
    }
    return result;
  }

  /** Extinction coefficient at 280 nm. */
  extinctionCoefficient280(sequence: string): number {
    const nW = (sequence.match(/W/g) ?? []).length;
    const nY = (sequence.match(/Y/g) ?? []).length;
    const nC = (sequence.match(/C/g) ?? []).length;
    return nW * 5500 + nY * 1490 + nC * 125;
  }

  /** Codon adaptation index (CAI). */
  codonAdaptationIndex(cds: string, organism: 'ecoli' | 'human' | 'yeast' = 'ecoli'): number {
    const usage = this.codonUsageBias(organism);
    let logSum = 0;
    let count = 0;
    const maxUsage: Record<string, number> = {};
    for (const codon in usage) {
      const aa = CODON_TABLE[codon];
      if (!aa) continue;
      if (!maxUsage[aa] || usage[codon]! > maxUsage[aa]!) {
        maxUsage[aa] = usage[codon]!;
      }
    }
    for (let i = 0; i + 3 <= cds.length; i += 3) {
      const codon = cds.substring(i, i + 3);
      const aa = CODON_TABLE[codon];
      if (!aa || aa === '*' || aa === 'M') continue;
      const u = usage[codon];
      const maxU = maxUsage[aa];
      if (u && maxU && u > 0 && maxU > 0) {
        logSum += Math.log(u / maxU);
        count++;
      }
    }
    return count === 0 ? 0 : Math.exp(logSum / count);
  }

  /** Predict active site residues. */
  activeSite(protein: Protein, substrate: string): { residues: number[]; substrate: string } {
    void protein;
    this._history.push({ method: 'activeSite', target: 'site', timestamp: Date.now() });
    return { residues: [0, 1, 2], substrate };
  }

  /** Apply a mutation to a DNA sequence. */
  mutation(mutation: { type: 'substitution' | 'insertion' | 'deletion'; position: number; base: string }): { type: string; effect: string } {
    const effects: Record<string, string> = {
      substitution: 'may be silent, missense, or nonsense',
      insertion: 'frameshift downstream',
      deletion: 'frameshift downstream',
    };
    void mutation;
    this._history.push({ method: 'mutation', target: mutation.type, timestamp: Date.now() });
    return { type: mutation.type, effect: effects[mutation.type] };
  }

  /** Classify a mutation effect. */
  classifyMutation(ref: string, alt: string, codonPosition: number): Mutation['effect'] {
    if (ref === alt) return 'synonymous';
    if (codonPosition % 3 !== 0) {
      if (alt === '*') return 'nonsense';
      return 'missense';
    }
    return 'frameshift';
  }

  /** SIFT score prediction. */
  siftScore(conservation: number): number {
    return Math.max(0, Math.min(1, 1 - conservation));
  }

  /** PolyPhen-2 score prediction. */
  polyphenScore(structuralChange: number, conservation: number): number {
    return Math.min(1, structuralChange * 0.6 + (1 - conservation) * 0.4);
  }

  /** CRISPR-Cas9 guide RNA design. */
  crisprGuideDesign(target: string, pam: string = 'NGG'): GuideRNA {
    const guideLength = 20;
    const pamRegex = new RegExp(pam.replace('N', '[ACGT]'), 'g');
    const matches: number[] = [];
    let m: RegExpExecArray | null;
    while ((m = pamRegex.exec(target)) !== null) {
      if (m.index >= guideLength) {
        matches.push(m.index - guideLength);
      }
    }
    const bestPos = matches[0] ?? 0;
    const sequence = target.substring(bestPos, bestPos + guideLength);
    return {
      sequence,
      pam,
      target,
      offTargets: this._crisprOffTarget(sequence, target),
    };
  }

  /** CRISPR off-target prediction. */
  private _crisprOffTarget(guide: string, target: string): Array<{ sequence: string; mismatches: number; position: number }> {
    const offTargets: Array<{ sequence: string; mismatches: number; position: number }> = [];
    const windowSize = guide.length;
    for (let i = 0; i + windowSize <= target.length; i++) {
      if (i === 0) continue;
      const candidate = target.substring(i, i + windowSize);
      let mismatches = 0;
      for (let j = 0; j < windowSize; j++) {
        if (candidate[j] !== guide[j]) mismatches++;
      }
      if (mismatches <= 3) {
        offTargets.push({ sequence: candidate, mismatches, position: i });
      }
    }
    return offTargets;
  }

  /** CRISPR off-target score (Doench 2016, simplified). */
  crisprOffTargetScore(guide: string, offTarget: string): number {
    let score = 1;
    const positionWeights = [0, 0, 0.014, 0.014, 0.014, 0.005, 0.012, 0.014, 0.014, 0.012, 0.012, 0.012, 0.014, 0.012, 0.014, 0.012, 0.014, 0.014, 0.079, 1];
    for (let i = 0; i < guide.length; i++) {
      if (guide[i] !== offTarget[i]) {
        score *= 1 - (positionWeights[i] ?? 0.05);
      }
    }
    return score;
  }

  /** Cloning vectors catalog. */
  cloningVectors(): CloningVector[] {
    return [...CLONING_VECTORS];
  }

  /** Real-time PCR method summary. */
  qpcrMethod(chemistry: QpcrMethod['chemistry'], target: string): QpcrMethod {
    return {
      chemistry,
      target,
      efficiency: 0.95,
      rSquared: 0.99,
      slope: -3.3,
    };
  }

  /** RNA-seq differential expression analysis. */
  rnaSeqAnalysis(reads: Array<{ gene: string; count: number }>, controlCounts: Record<string, number>): RnaSeqResult[] {
    const results: RnaSeqResult[] = [];
    const totalReads = reads.reduce((s, r) => s + r.count, 0);
    const totalControl = Object.values(controlCounts).reduce((s, c) => s + c, 0);
    for (const r of reads) {
      const tpm = (r.count / Math.max(1, totalReads)) * 1e6;
      const controlCount = controlCounts[r.gene] ?? 0;
      const controlTPM = (controlCount / Math.max(1, totalControl)) * 1e6;
      const foldChange = controlTPM === 0 ? Infinity : tpm / controlTPM;
      const pValue = Math.exp(-Math.abs(foldChange - 1));
      results.push({
        gene: r.gene,
        readCount: r.count,
        tpm,
        fpkm: tpm,
        foldChange,
        pValue,
      });
    }
    return results;
  }

  /** Variant calling (simplified). */
  variantCalling(reference: string, read: string): Mutation[] {
    const variants: Mutation[] = [];
    const minLen = Math.min(reference.length, read.length);
    for (let i = 0; i < minLen; i++) {
      if (reference[i] !== read[i]) {
        variants.push({
          type: 'substitution',
          position: i,
          ref: reference[i] ?? 'N',
          alt: read[i] ?? 'N',
          effect: this.classifyMutation(reference[i] ?? 'N', read[i] ?? 'N', i),
        });
      }
    }
    return variants;
  }

  /** DNA reverse complement. */
  reverseComplement(dna: string): string {
    const complement: Record<string, string> = { A: 'T', T: 'A', C: 'G', G: 'C' };
    return dna.split('').reverse().map(b => complement[b] ?? 'N').join('');
  }

  /** DNA random generation. */
  randomDna(length: number): string {
    const bases = 'ATCG';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += bases[Math.floor(Math.random() * 4)];
    }
    return result;
  }

  /** Protein modification types. */
  proteinModifications(): ProteinModification[] {
    return [
      { type: 'phosphorylation', residue: 'S/T/Y', position: 0, enzyme: 'protein kinase' },
      { type: 'glycosylation', residue: 'N/X-S/T', position: 0, enzyme: 'glycosyltransferase' },
      { type: 'ubiquitination', residue: 'K', position: 0, enzyme: 'E3 ligase' },
      { type: 'acetylation', residue: 'K', position: 0, enzyme: 'HAT' },
      { type: 'methylation', residue: 'K/R', position: 0, enzyme: 'methyltransferase' },
      { type: 'sumoylation', residue: 'K', position: 0, enzyme: 'SUMO E3' },
    ];
  }

  /** Translation initiation site prediction. */
  translationInitiationSite(dna: string): number {
    const dnaUpper = dna.toUpperCase();
    for (let i = 0; i + 6 <= dnaUpper.length; i++) {
      if (dnaUpper.substring(i, i + 3) === 'ATG') {
        const nextCodon = dnaUpper.substring(i + 3, i + 6);
        if (nextCodon && nextCodon[0] === 'G' && nextCodon.startsWith('G')) {
          return i;
        }
      }
    }
    return dnaUpper.indexOf('ATG');
  }

  /** Open reading frame (ORF) finder. */
  findOrfs(dna: string, minLength: number = 30): Array<{ start: number; end: number; length: number; strand: string }> {
    const orfs: Array<{ start: number; end: number; length: number; strand: string }> = [];
    const upper = dna.toUpperCase();
    for (let i = 0; i + 3 <= upper.length; i += 3) {
      if (upper.substring(i, i + 3) === 'ATG') {
        for (let j = i + 3; j + 3 <= upper.length; j += 3) {
          const codon = upper.substring(j, j + 3);
          if (codon === 'TAA' || codon === 'TAG' || codon === 'TGA') {
            const length = j + 3 - i;
            if (length >= minLength) {
              orfs.push({ start: i, end: j + 3, length, strand: '+' });
            }
            break;
          }
        }
      }
    }
    const revComp = this.reverseComplement(dna);
    for (let i = 0; i + 3 <= revComp.length; i += 3) {
      if (revComp.substring(i, i + 3) === 'ATG') {
        for (let j = i + 3; j + 3 <= revComp.length; j += 3) {
          const codon = revComp.substring(j, j + 3);
          if (codon === 'TAA' || codon === 'TAG' || codon === 'TGA') {
            const length = j + 3 - i;
            if (length >= minLength) {
              orfs.push({ start: i, end: j + 3, length, strand: '-' });
            }
            break;
          }
        }
      }
    }
    return orfs;
  }

  /** GC skew analysis. */
  gcSkew(dna: string, windowSize: number = 1000): Array<{ position: number; skew: number }> {
    const result: Array<{ position: number; skew: number }> = [];
    for (let i = 0; i + windowSize <= dna.length; i += windowSize) {
      const window = dna.substring(i, i + windowSize).toUpperCase();
      const g = (window.match(/G/g) ?? []).length;
      const c = (window.match(/C/g) ?? []).length;
      const skew = (g - c) / Math.max(1, g + c);
      result.push({ position: i, skew });
    }
    return result;
  }

  /** CpG island detection. */
  cpgIslands(dna: string, windowSize: number = 200, gcThreshold: number = 0.5, observedExpectedRatio: number = 0.6): Array<{ start: number; end: number; gcContent: number; oeRatio: number }> {
    const islands: Array<{ start: number; end: number; gcContent: number; oeRatio: number }> = [];
    for (let i = 0; i + windowSize <= dna.length; i++) {
      const window = dna.substring(i, i + windowSize).toUpperCase();
      const gc = (window.match(/[GC]/g) ?? []).length;
      const gcContent = gc / windowSize;
      const cpg = (window.match(/CG/g) ?? []).length;
      const c = (window.match(/C/g) ?? []).length;
      const g = (window.match(/G/g) ?? []).length;
      const oe = cpg === 0 ? 0 : (cpg * windowSize) / Math.max(1, c * g);
      if (gcContent >= gcThreshold && oe >= observedExpectedRatio) {
        islands.push({ start: i, end: i + windowSize, gcContent, oeRatio: oe });
      }
    }
    return islands;
  }

  /** Sequence motif search. */
  motifSearch(sequence: string, motif: string): number[] {
    const positions: number[] = [];
    const regex = new RegExp(motif.replace(/N/gi, '[ACGT]'), 'g');
    let match: RegExpExecArray | null;
    while ((match = regex.exec(sequence)) !== null) {
      positions.push(match.index);
    }
    return positions;
  }

  /** Transcription factor binding site (TFBS) database (simplified). */
  tfBindingSites(): Array<{ tf: string; motif: string; description: string }> {
    return [
      { tf: 'TATA-binding protein', motif: 'TATAAA', description: 'core promoter element' },
      { tf: 'SP1', motif: 'GGGCGG', description: 'GC box' },
      { tf: 'NF-κB', motif: 'GGGRNWYYCC', description: 'immune response element' },
      { tf: 'AP-1', motif: 'TGAGTCA', description: 'CRE-like element' },
      { tf: 'CREB', motif: 'TGACGTCA', description: 'cAMP response element' },
      { tf: 'MYC', motif: 'CACGTG', description: 'E-box element' },
      { tf: 'p53', motif: 'RRRCWWGYYY', description: 'tumor suppressor binding site' },
      { tf: 'E2F', motif: 'TTTCGCGC', description: 'cell cycle regulated' },
      { tf: 'STAT', motif: 'TTCCNGGAA', description: 'cytokine signaling' },
      { tf: 'HIF-1α', motif: 'RCGTG', description: 'hypoxia response element' },
    ];
  }

  /** Sequence identity calculation. */
  sequenceIdentity(seq1: string, seq2: string): number {
    if (seq1.length === 0) return 0;
    let matches = 0;
    const minLen = Math.min(seq1.length, seq2.length);
    for (let i = 0; i < minLen; i++) {
      if (seq1[i] === seq2[i]) matches++;
    }
    return (matches / Math.max(seq1.length, seq2.length)) * 100;
  }

  /** Consensus sequence from alignment. */
  consensus(sequences: string[]): string {
    if (sequences.length === 0) return '';
    const length = Math.max(...sequences.map(s => s.length));
    let consensus = '';
    for (let i = 0; i < length; i++) {
      const counts: Record<string, number> = {};
      for (const seq of sequences) {
        if (i < seq.length) {
          const base = seq[i]!;
          counts[base] = (counts[base] ?? 0) + 1;
        }
      }
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      if (sorted.length > 0) consensus += sorted[0]![0];
    }
    return consensus;
  }

  /** Sequence entropy (Shannon). */
  sequenceEntropy(sequences: string[]): number {
    if (sequences.length === 0) return 0;
    const length = Math.max(...sequences.map(s => s.length));
    let totalEntropy = 0;
    for (let i = 0; i < length; i++) {
      const counts: Record<string, number> = {};
      let total = 0;
      for (const seq of sequences) {
        if (i < seq.length) {
          const base = seq[i]!;
          counts[base] = (counts[base] ?? 0) + 1;
          total++;
        }
      }
      for (const base in counts) {
        const p = counts[base]! / total;
        totalEntropy -= p * Math.log2(p);
      }
    }
    return totalEntropy / length;
  }

  /** Multiple sequence alignment (MSA) - simplified (centroid based). */
  multipleSequenceAlignment(sequences: string[]): { aligned: string[]; consensus: string } {
    if (sequences.length === 0) return { aligned: [], consensus: '' };
    const maxLength = Math.max(...sequences.map(s => s.length));
    const aligned = sequences.map(s => s.padEnd(maxLength, '-'));
    return { aligned, consensus: this.consensus(aligned) };
  }

  /** Phylogenetic distance (Jukes-Cantor). */
  jukesCantorDistance(p: number): number {
    if (p >= 0.75) return Infinity;
    return -0.75 * Math.log(1 - (4 / 3) * p);
  }

  /** Kimura 2-parameter distance. */
  kimura2ParameterDistance(p: number, q: number): number {
    return -0.5 * Math.log(1 - 2 * p - q) - 0.25 * Math.log(1 - 2 * q);
  }

  /** DNA mutation rate (per generation). */
  mutationRate(mutations: number, generations: number, genomeSize: number): number {
    if (generations === 0 || genomeSize === 0) return 0;
    return mutations / (generations * genomeSize);
  }

  /** Nonsynonymous/synonymous substitution ratio (dN/dS). */
  dnDsRatio(dN: number, dS: number): { ratio: number; selection: string } {
    if (dS === 0) return { ratio: Infinity, selection: 'positive selection' };
    const ratio = dN / dS;
    let selection = 'neutral';
    if (ratio < 0.1) selection = 'purifying';
    else if (ratio > 1) selection = 'positive';
    return { ratio, selection };
  }

  /** Amino acid property lookup. */
  aaProperty(code: string): AminoAcidProperty | null {
    return AMINO_ACIDS.find(a => a.code === code) ?? null;
  }

  /** Amino acids catalog. */
  aminoAcidTable(): AminoAcidProperty[] {
    return [...AMINO_ACIDS];
  }

  /** Enzyme catalog. */
  enzymeCatalog(): RestrictionEnzyme[] {
    return [...this._enzymes];
  }

  /** Codon degeneracy (number of codons per amino acid). */
  codonDegeneracy(): Record<string, number> {
    const degeneracy: Record<string, number> = {};
    for (const codon in CODON_TABLE) {
      const aa = CODON_TABLE[codon];
      if (aa !== '*') {
        degeneracy[aa] = (degeneracy[aa] ?? 0) + 1;
      }
    }
    return degeneracy;
  }

  /** Wobble base pairing rules. */
  wobbleRules(): Array<{ anticodon5prime: string; codon3prime: string }> {
    return [
      { anticodon5prime: 'C', codon3prime: 'G' },
      { anticodon5prime: 'A', codon3prime: 'U' },
      { anticodon5prime: 'U', codon3prime: 'A or G' },
      { anticodon5prime: 'G', codon3prime: 'C or U' },
      { anticodon5prime: 'I', codon3prime: 'U, C, or A' },
    ];
  }

  /** Kozak consensus sequence (eukaryotic). */
  kozakConsensus(): { sequence: string; position: string; consensus: string } {
    return {
      sequence: 'gccRccAUGG',
      position: '-6 to +5 (A of AUG is +1)',
      consensus: 'GCC(A/G)CCAUGG',
    };
  }

  /** Shine-Dalgarno sequence (prokaryotic). */
  shineDalgarno(): { sequence: string; position: string; consensus: string } {
    return {
      sequence: 'AGGAGG',
      position: '-10 to -5 upstream of start codon',
      consensus: 'AGGAGGU',
    };
  }

  /** Stop codon context. */
  stopCodonContext(): { codons: string[]; efficiency: Record<string, number> } {
    return {
      codons: ['UAA', 'UAG', 'UGA'],
      efficiency: { UAA: 1.0, UGA: 0.7, UAG: 0.5 },
    };
  }

  /** Codon adaptation for heterologous expression. */
  codonOptimize(protein: string, organism: 'ecoli' | 'human' | 'yeast'): string {
    const usage = this.codonUsageBias(organism);
    const aaToCodon: Record<string, string[]> = {};
    for (const codon in usage) {
      const aa = CODON_TABLE[codon];
      if (!aa) continue;
      if (!aaToCodon[aa]) aaToCodon[aa] = [];
      aaToCodon[aa].push(codon);
    }
    const maxCodon: Record<string, string> = {};
    for (const aa in aaToCodon) {
      const codons = aaToCodon[aa]!;
      codons.sort((a, b) => (usage[b] ?? 0) - (usage[a] ?? 0));
      maxCodon[aa] = codons[0];
    }
    let result = '';
    for (const aa of protein) {
      result += maxCodon[aa] ?? 'ATG';
    }
    return result;
  }

  toPacket(): DataPacket<{
    dna: Map<string, DNA>;
    rna: RNA[];
    proteins: Protein[];
    enzymes: RestrictionEnzyme[];
    history: MolecularBiologyRecord[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['biology', 'MolecularBiology'],
      priority: 1,
      phase: 'biology:molecular',
    };
    return {
      id: `mol-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        dna: this._dna,
        rna: this._rna,
        proteins: this._proteins,
        enzymes: this._enzymes,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._dna = new Map();
    this._rna = [];
    this._proteins = [];
    this._enzymes = [...ENZYMES];
    this._history = [];
    this._counter = 0;
  }

  get dnaCount(): number {
    return this._dna.size;
  }

  get rnaCount(): number {
    return this._rna.length;
  }

  get proteinCount(): number {
    return this._proteins.length;
  }

  get enzymeCount(): number {
    return this._enzymes.length;
  }

  get historyDepth(): number {
    return this._history.length;
  }
}
