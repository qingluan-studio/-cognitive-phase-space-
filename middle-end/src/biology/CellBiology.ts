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

/** Cell biology: division, transport, metabolism. */
export class CellBiology {
  private _cells: Cell[] = [];
  private _cycles: CellCycle[] = [];
  private _organelles: Map<string, Organelle> = new Map();
  private _history: unknown[] = [];
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
    this._history.push({ method: 'mitosis', phase });
    return cycle;
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
    this._history.push({ method: 'meiosis', phase });
    return cycle;
  }

  /** Cytokinesis descriptor. */
  cytokinesis(cell: Cell): { cell: Cell; daughter: number } {
    const result = { cell, daughter: 2 };
    this._history.push({ method: 'cytokinesis' });
    return result;
  }

  /** Membrane transport analysis. */
  membraneTransport(type: 'passive' | 'active' | 'facilitated' | 'osmosis', molecule: string, concentration: { in: number; out: number }): { direction: string; energy: boolean } {
    const direction = concentration.out > concentration.in ? 'inward' : 'outward';
    const energy = type === 'active';
    void molecule;
    this._history.push({ method: 'membraneTransport' });
    return { direction, energy };
  }

  /** Diffusion along a gradient. */
  diffusion(gradient: { high: number; low: number }): { rate: number; direction: string } {
    const rate = Math.abs(gradient.high - gradient.low) * 0.1;
    this._history.push({ method: 'diffusion' });
    return { rate, direction: 'high to low' };
  }

  /** Osmosis across a membrane. */
  osmosis(concentration: { inside: number; outside: number }, membrane: string): { direction: string; tonicity: string } {
    let tonicity: string;
    if (concentration.outside > concentration.inside) tonicity = 'hypertonic';
    else if (concentration.outside < concentration.inside) tonicity = 'hypotonic';
    else tonicity = 'isotonic';
    void membrane;
    this._history.push({ method: 'osmosis' });
    return { direction: 'water toward higher solute', tonicity };
  }

  /** Active transport requires energy. */
  activeTransport(molecule: string, energy: number): { molecule: string; energyUsed: number; direction: string } {
    this._history.push({ method: 'activeTransport' });
    return { molecule, energyUsed: energy, direction: 'against gradient' };
  }

  /** Endocytosis of a particle. */
  endocytosis(particle: string): { particle: string; mechanism: string } {
    this._history.push({ method: 'endocytosis' });
    return { particle, mechanism: 'membrane engulfment' };
  }

  /** Exocytosis of a vesicle. */
  exocytosis(vesicle: string): { vesicle: string; mechanism: string } {
    this._history.push({ method: 'exocytosis' });
    return { vesicle, mechanism: 'membrane fusion' };
  }

  /** Photosynthesis equation. */
  photosynthesis(light: number, co2: number, h2o: number): { products: { glucose: number; oxygen: number }; rate: number } {
    const rate = Math.min(light, co2, h2o) * 0.1;
    this._history.push({ method: 'photosynthesis' });
    return { products: { glucose: rate * 0.1, oxygen: rate * 0.1 }, rate };
  }

  /** Cellular respiration. */
  cellularRespiration(glucose: number, oxygen: number): { products: { atp: number; co2: number; h2o: number }; rate: number } {
    const rate = Math.min(glucose, oxygen) * 0.5;
    this._history.push({ method: 'cellularRespiration' });
    return { products: { atp: rate * 36, co2: rate * 6, h2o: rate * 6 }, rate };
  }

  /** Protein synthesis from DNA. */
  proteinSynthesis(dna: string): { mrna: string; protein: string } {
    const mrna = this.transcription(dna);
    const protein = this.translation(mrna);
    this._history.push({ method: 'proteinSynthesis' });
    return { mrna, protein };
  }

  /** Transcribe DNA to mRNA. */
  transcription(dna: string): string {
    const complement: Record<string, string> = { A: 'U', T: 'A', C: 'G', G: 'C' };
    const mrna = dna.split('').map(b => complement[b] ?? 'X').join('');
    this._history.push({ method: 'transcription' });
    return mrna;
  }

  /** Translate mRNA to a protein string. */
  translation(mrna: string): string {
    const codonTable: Record<string, string> = {
      AUG: 'M', UUU: 'F', UUC: 'F', UUA: 'L', UUG: 'L',
      UCU: 'S', UCC: 'S', UCA: 'S', UCG: 'S',
      UAU: 'Y', UAC: 'Y', UAA: '*', UAG: '*',
      UGU: 'C', UGC: 'C', UGA: '*', UGG: 'W',
      CUU: 'L', CUC: 'L', CUA: 'L', CUG: 'L',
      CCU: 'P', CCC: 'P', CCA: 'P', CCG: 'P',
      CAU: 'H', CAC: 'H', CAA: 'Q', CAG: 'Q',
      CGU: 'R', CGC: 'R', CGA: 'R', CGG: 'R',
      AUU: 'I', AUC: 'I', AUA: 'I', GUU: 'V',
      GUC: 'V', GUA: 'V', GUG: 'V', GCU: 'A',
      GCC: 'A', GCA: 'A', GCG: 'A', GAU: 'D',
      GAC: 'D', GAA: 'E', GAG: 'E', GGU: 'G',
      GGC: 'G', GGA: 'G', GGG: 'G', ACU: 'T',
      ACC: 'T', ACA: 'T', ACG: 'T', AAU: 'N',
      AAC: 'N', AAA: 'K', AAG: 'K', AGU: 'S',
      AGC: 'S', AGA: 'R', AGG: 'R',
    };
    let protein = '';
    for (let i = 0; i + 3 <= mrna.length; i += 3) {
      const codon = mrna.substring(i, i + 3);
      const aa = codonTable[codon];
      if (!aa) continue;
      if (aa === '*') break;
      protein += aa;
    }
    this._history.push({ method: 'translation' });
    return protein;
  }

  /** DNA replication. */
  dnaReplication(dna: string): { leading: string; lagging: string } {
    const complement: Record<string, string> = { A: 'T', T: 'A', C: 'G', G: 'C' };
    const newStrand = dna.split('').map(b => complement[b] ?? 'X').join('');
    this._history.push({ method: 'dnaReplication' });
    return { leading: newStrand, lagging: newStrand.split('').reverse().join('') };
  }

  /** List mitosis stages in order. */
  mitosisStages(): string[] {
    this._history.push({ method: 'mitosisStages' });
    return ['prophase', 'prometaphase', 'metaphase', 'anaphase', 'telophase'];
  }

  /** Cell signaling cascade. */
  cellSignaling(ligand: string, receptor: string): { ligand: string; receptor: string; response: string } {
    this._history.push({ method: 'cellSignaling' });
    return { ligand, receptor, response: 'cascade activation' };
  }

  toPacket(): DataPacket<{
    cells: Cell[];
    cycles: CellCycle[];
    organelles: Map<string, Organelle>;
    history: unknown[];
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
