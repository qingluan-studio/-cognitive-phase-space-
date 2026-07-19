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
];

/** Molecular biology: DNA, RNA, protein, PCR. */
export class MolecularBiology {
  private _dna: Map<string, DNA> = new Map();
  private _rna: RNA[] = [];
  private _proteins: Protein[] = [];
  private _enzymes: RestrictionEnzyme[] = [];
  private _history: unknown[] = [];
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
    this._history.push({ method: 'transcribe' });
    return rna;
  }

  /** Translate mRNA into a protein. */
  translate(mrna: RNA): Protein {
    let seq = '';
    for (let i = 0; i + 3 <= mrna.sequence.length; i += 3) {
      const codon = mrna.sequence.substring(i, i + 3);
      const aa = CODON_TABLE[codon];
      if (!aa) continue;
      if (aa === '*') break;
      seq += aa;
    }
    const protein: Protein = { sequence: seq, structure: 'primary' };
    this._proteins.push(protein);
    this._history.push({ method: 'translate' });
    return protein;
  }

  /** Return the codon table. */
  codonTable(): Record<string, string> {
    this._history.push({ method: 'codonTable' });
    return { ...CODON_TABLE };
  }

  /** Resolve single amino acid from a codon. */
  aminoAcid(codon: string): string {
    this._history.push({ method: 'aminoAcid' });
    return CODON_TABLE[codon] ?? 'X';
  }

  /** Compute GC content of a DNA sequence. */
  gcContent(dna: string): number {
    if (dna.length === 0) return 0;
    const gc = (dna.match(/[GC]/g) ?? []).length;
    const content = (gc / dna.length) * 100;
    this._history.push({ method: 'gcContent' });
    return content;
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
    this._history.push({ method: 'meltingTemp', tm });
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
    this._history.push({ method: 'primerDesign' });
    return { primer, tm: this.meltingTemp(primer) };
  }

  /** PCR amplification simulation. */
  pcr(template: string, primers: { forward: string; reverse: string }, cycles: number): { copies: number; product: string } {
    const copies = Math.pow(2, cycles);
    void primers;
    this._history.push({ method: 'pcr', cycles });
    return { copies, product: template };
  }

  /** Gel electrophoresis simulation. */
  gelElectrophoresis(dna: string, fragments: number[]): { bands: Array<{ size: number; position: number }> } {
    const bands = fragments.map(f => ({
      size: f,
      position: Math.log10(f + 1) * 10,
    }));
    void dna;
    this._history.push({ method: 'gelElectrophoresis' });
    return { bands };
  }

  /** Restriction digest simulation. */
  restrictionDigest(dna: string, enzyme: string): { fragments: string[]; enzyme: string } {
    const e = this._enzymes.find(en => en.name === enzyme);
    if (!e) return { fragments: [dna], enzyme };
    const site = e.recognitionSite;
    const regex = new RegExp(site, 'g');
    const fragments: string[] = [];
    let lastIdx = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(dna)) !== null) {
      fragments.push(dna.substring(lastIdx, match.index + e.cutPosition));
      lastIdx = match.index + e.cutPosition;
    }
    fragments.push(dna.substring(lastIdx));
    this._history.push({ method: 'restrictionDigest' });
    return { fragments, enzyme };
  }

  /** Ligation of fragments. */
  ligation(fragments: string[]): { product: string; count: number } {
    this._history.push({ method: 'ligation' });
    return { product: fragments.join(''), count: fragments.length };
  }

  /** Molecular cloning. */
  cloning(insert: string, vector: string): { recombinant: string; insert: string; vector: string } {
    const recombinant = `${vector.substring(0, Math.floor(vector.length / 2))}${insert}${vector.substring(Math.floor(vector.length / 2))}`;
    this._history.push({ method: 'cloning' });
    return { recombinant, insert, vector };
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
    this._history.push({ method: 'sequencing' });
    return { method, ...entry };
  }

  /** Predict protein folding class. */
  proteinFolding(sequence: string): { class: string; confidence: number } {
    const hydrophobic = (sequence.match(/[AVILMFYW]/g) ?? []).length;
    const ratio = hydrophobic / Math.max(sequence.length, 1);
    const cls = ratio > 0.4 ? 'globular' : 'fibrous';
    this._history.push({ method: 'proteinFolding' });
    return { class: cls, confidence: Math.min(1, ratio * 1.5) };
  }

  /** Predict secondary structure. */
  secondaryStructure(sequence: string): { alphaHelix: number; betaSheet: number; coil: number } {
    const helix = (sequence.match(/[AELM]/g) ?? []).length;
    const sheet = (sequence.match(/[VTIY]/g) ?? []).length;
    const total = sequence.length || 1;
    const coil = total - helix - sheet;
    this._history.push({ method: 'secondaryStructure' });
    return {
      alphaHelix: helix / total,
      betaSheet: sheet / total,
      coil: coil / total,
    };
  }

  /** Predict active site residues. */
  activeSite(protein: Protein, substrate: string): { residues: number[]; substrate: string } {
    void protein;
    this._history.push({ method: 'activeSite' });
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
    this._history.push({ method: 'mutation' });
    return { type: mutation.type, effect: effects[mutation.type] };
  }

  toPacket(): DataPacket<{
    dna: Map<string, DNA>;
    rna: RNA[];
    proteins: Protein[];
    enzymes: RestrictionEnzyme[];
    history: unknown[];
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
