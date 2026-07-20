import { DataPacket, PacketMeta } from '../shared/types';

/** Genotype descriptor. */
export interface Genotype {
  alleles: string[];
  heterozygous: boolean;
  homozygous: boolean;
}

/** Phenotype descriptor. */
export interface Phenotype {
  traits: Record<string, string>;
  dominant: string[];
  recessive: string[];
}

/** Punnett square descriptor. */
export interface PunnettSquare {
  cross: string;
  grid: string[][];
  ratios: { genotype: Record<string, number>; phenotype: Record<string, number> };
}

/** Pedigree descriptor. */
export interface Pedigree {
  family: string;
  generations: number;
  affected: string[];
  carriers: string[];
  inheritance: string;
}

/** Allele descriptor used for Mendelian modeling. */
export interface Allele {
  symbol: string;
  dominance: 'dominant' | 'recessive' | 'codominant' | 'incomplete';
  frequency: number;
  trait: string;
}

/** Locus descriptor. */
export interface Locus {
  name: string;
  chromosome: number;
  position: number; // bp
  alleles: Allele[];
}

/** Linkage descriptor for two loci. */
export interface Linkage {
  locus1: string;
  locus2: string;
  recombinationFraction: number; // 0..0.5
  coupling: boolean;
}

/** Population allele frequency snapshot. */
export interface AlleleFrequencies {
  population: string;
  locus: string;
  frequencies: Record<string, number>;
  heterozygosity: number;
}

/** Mutation descriptor. */
export interface MutationRecord {
  type: 'substitution' | 'insertion' | 'deletion' | 'duplication' | 'inversion' | 'translocation';
  position: number;
  ref: string;
  alt: string;
  effect: string;
}

/** DNA base complement map. */
const DNA_COMPLEMENT: Record<string, string> = {
  A: 'T', T: 'A', C: 'G', G: 'C',
  a: 't', t: 'a', c: 'g', g: 'c',
  N: 'N', n: 'n',
};

/** RNA codon to amino acid table (standard genetic code). */
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

/** Single-letter amino acid properties. */
const AMINO_ACID_WEIGHT: Record<string, number> = {
  A: 89.1, R: 174.2, N: 132.1, D: 133.1, C: 121.2,
  E: 147.1, Q: 146.2, G: 75.0, H: 155.2, I: 131.2,
  L: 131.2, K: 146.2, M: 149.2, F: 165.2, P: 115.1,
  S: 105.1, T: 119.1, W: 204.2, Y: 181.2, V: 117.1,
};

/** Hydrophobicity (Kyte-Doolittle) values per amino acid. */
const HYDROPATHY: Record<string, number> = {
  A: 1.8, R: -4.5, N: -3.5, D: -3.5, C: 2.5,
  E: -3.5, Q: -3.5, G: -0.4, H: -3.2, I: 4.5,
  L: 3.8, K: -3.9, M: 1.9, F: 2.8, P: -1.6,
  S: -0.8, T: -0.7, W: -0.9, Y: -1.3, V: 4.2,
};

/** Genetics: crosses, Punnett squares, population genetics. */
export class Genetics {
  private _genotypes: Genotype[] = [];
  private _phenotypes: Phenotype[] = [];
  private _crosses: PunnettSquare[] = [];
  private _loci: Map<string, Locus> = new Map();
  private _linkages: Linkage[] = [];
  private _populations: Map<string, AlleleFrequencies> = new Map();
  private _mutations: MutationRecord[] = [];
  private _pedigrees: Pedigree[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  constructor() {
    this._seedLoci();
  }

  /** Seed some common Mendelian loci for reference. */
  private _seedLoci(): void {
    const seed: Locus[] = [
      {
        name: 'ABO',
        chromosome: 9,
        position: 136131000,
        alleles: [
          { symbol: 'IA', dominance: 'codominant', frequency: 0.42, trait: 'A antigen' },
          { symbol: 'IB', dominance: 'codominant', frequency: 0.11, trait: 'B antigen' },
          { symbol: 'i', dominance: 'recessive', frequency: 0.47, trait: 'O (no antigen)' },
        ],
      },
      {
        name: 'Rh',
        chromosome: 1,
        position: 25282500,
        alleles: [
          { symbol: 'D', dominance: 'dominant', frequency: 0.59, trait: 'Rh positive' },
          { symbol: 'd', dominance: 'recessive', frequency: 0.41, trait: 'Rh negative' },
        ],
      },
      {
        name: 'Mendel-P',
        chromosome: 1,
        position: 0,
        alleles: [
          { symbol: 'P', dominance: 'dominant', frequency: 0.9, trait: 'purple flower' },
          { symbol: 'p', dominance: 'recessive', frequency: 0.1, trait: 'white flower' },
        ],
      },
      {
        name: 'SickleCell',
        chromosome: 11,
        position: 5225464,
        alleles: [
          { symbol: 'HbA', dominance: 'codominant', frequency: 0.9, trait: 'normal hemoglobin' },
          { symbol: 'HbS', dominance: 'codominant', frequency: 0.1, trait: 'sickle hemoglobin' },
        ],
      },
      {
        name: 'EyeColor',
        chromosome: 15,
        position: 28365618,
        alleles: [
          { symbol: 'BEY2', dominance: 'dominant', frequency: 0.7, trait: 'brown eyes' },
          { symbol: 'bey2', dominance: 'recessive', frequency: 0.3, trait: 'blue eyes' },
        ],
      },
    ];
    for (const locus of seed) this._loci.set(locus.name, locus);
  }

  /** Monohybrid cross between two single-trait genotypes. */
  monohybridCross(parent1: string, parent2: string): PunnettSquare {
    const p1 = parent1.split('');
    const p2 = parent2.split('');
    const grid: string[][] = [];
    const genotypeCount: Record<string, number> = {};
    for (const a of p1) {
      const row: string[] = [];
      for (const b of p2) {
        const sorted = [a, b].sort().join('');
        row.push(sorted);
        genotypeCount[sorted] = (genotypeCount[sorted] ?? 0) + 1;
      }
      grid.push(row);
    }
    const total = Object.values(genotypeCount).reduce((s, c) => s + c, 0);
    const genotype: Record<string, number> = {};
    for (const [k, v] of Object.entries(genotypeCount)) genotype[k] = v / total;
    const phenotype: Record<string, number> = {};
    for (const [k, v] of Object.entries(genotypeCount)) {
      const dom = k[0].toUpperCase() === k[0] ? 'dominant' : 'recessive';
      phenotype[dom] = (phenotype[dom] ?? 0) + v / total;
    }
    const result: PunnettSquare = {
      cross: `${parent1} × ${parent2}`,
      grid,
      ratios: { genotype, phenotype },
    };
    this._crosses.push(result);
    this._history.push({ method: 'monohybridCross', args: [parent1, parent2] });
    return result;
  }

  /** Dihybrid cross between two double-trait genotypes (e.g. 'AaBb'). */
  dihybridCross(p1: string, p2: string): PunnettSquare {
    const gametes1 = this._gametes(p1);
    const gametes2 = this._gametes(p2);
    const grid: string[][] = [];
    const genotypeCount: Record<string, number> = {};
    for (const g1 of gametes1) {
      const row: string[] = [];
      for (const g2 of gametes2) {
        const combined = this._mergeGametes(g1, g2);
        row.push(combined);
        genotypeCount[combined] = (genotypeCount[combined] ?? 0) + 1;
      }
      grid.push(row);
    }
    const total = Object.values(genotypeCount).reduce((s, c) => s + c, 0);
    const genotype: Record<string, number> = {};
    for (const [k, v] of Object.entries(genotypeCount)) genotype[k] = v / total;
    const phenotype: Record<string, number> = {};
    for (const [k, v] of Object.entries(genotypeCount)) {
      const pheno = this._phenotypeFromDihybrid(k);
      phenotype[pheno] = (phenotype[pheno] ?? 0) + v / total;
    }
    const result: PunnettSquare = {
      cross: `${p1} × ${p2}`,
      grid,
      ratios: { genotype, phenotype },
    };
    this._crosses.push(result);
    this._history.push({ method: 'dihybridCross', args: [p1, p2] });
    return result;
  }

  /** Generate the four gametes from a dihybrid genotype like 'AaBb'. */
  private _gametes(genotype: string): string[] {
    const pairs: string[][] = [];
    for (let i = 0; i + 1 < genotype.length; i += 2) {
      pairs.push([genotype[i]!, genotype[i + 1]!]);
    }
    const result: string[] = [];
    const combine = (idx: number, current: string): void => {
      if (idx >= pairs.length) {
        result.push(current);
        return;
      }
      for (const a of pairs[idx] ?? []) {
        combine(idx + 1, current + a);
      }
    };
    combine(0, '');
    return result;
  }

  /** Merge two gametes into a sorted genotype string preserving trait grouping. */
  private _mergeGametes(g1: string, g2: string): string {
    let result = '';
    for (let i = 0; i < g1.length; i++) {
      const pair = [g1[i], g2[i]].sort();
      result += pair.join('');
    }
    return result;
  }

  /** Compute phenotype label for a dihybrid genotype. */
  private _phenotypeFromDihybrid(genotype: string): string {
    let label = '';
    for (let i = 0; i + 1 < genotype.length; i += 2) {
      const a = genotype[i];
      const b = genotype[i + 1];
      if (!a || !b) continue;
      const hasDominant = a === a.toUpperCase() || b === b.toUpperCase();
      label += hasDominant ? 'D' : 'r';
    }
    return label;
  }

  /** Trihybrid cross for three traits. */
  trihybridCross(p1: string, p2: string): PunnettSquare {
    const gametes1 = this._gametes(p1);
    const gametes2 = this._gametes(p2);
    const genotypeCount: Record<string, number> = {};
    for (const g1 of gametes1) {
      for (const g2 of gametes2) {
        const combined = this._mergeGametes(g1, g2);
        genotypeCount[combined] = (genotypeCount[combined] ?? 0) + 1;
      }
    }
    const total = Object.values(genotypeCount).reduce((s, c) => s + c, 0);
    const genotype: Record<string, number> = {};
    for (const [k, v] of Object.entries(genotypeCount)) genotype[k] = v / total;
    const result: PunnettSquare = {
      cross: `${p1} × ${p2}`,
      grid: [],
      ratios: { genotype, phenotype: {} },
    };
    this._crosses.push(result);
    this._history.push({ method: 'trihybridCross' });
    return result;
  }

  /** Build a Punnett square for two parents. */
  punnettSquare(p1: string, p2: string): PunnettSquare {
    return this.monohybridCross(p1, p2);
  }

  /** Genotype ratio from a cross. */
  genotypeRatio(cross: PunnettSquare): Record<string, number> {
    this._history.push({ method: 'genotypeRatio' });
    return { ...cross.ratios.genotype };
  }

  /** Phenotype ratio from a cross. */
  phenotypeRatio(cross: PunnettSquare): Record<string, number> {
    this._history.push({ method: 'phenotypeRatio' });
    return { ...cross.ratios.phenotype };
  }

  /** Probability of an allele combination (independent assortment). */
  probability(alleles: string[]): number {
    const p = Math.pow(0.5, alleles.length);
    this._history.push({ method: 'probability', p });
    return p;
  }

  /** Hardy-Weinberg equilibrium frequencies. */
  hardyWeinberg(p: number, q: number): { p: number; q: number; pp: number; pq: number; qq: number } {
    const pp = p * p;
    const pq = 2 * p * q;
    const qq = q * q;
    this._history.push({ method: 'hardyWeinberg', p, q });
    return { p, q, pp, pq, qq };
  }

  /** Test whether a sample is in Hardy-Weinberg equilibrium (chi-square). */
  hardyWeinbergTest(observed: { AA: number; Aa: number; aa: number }): {
    expected: { AA: number; Aa: number; aa: number };
    chiSquare: number;
    degreesOfFreedom: number;
    inEquilibrium: boolean;
  } {
    const total = observed.AA + observed.Aa + observed.aa;
    if (total === 0) {
      return { expected: { AA: 0, Aa: 0, aa: 0 }, chiSquare: 0, degreesOfFreedom: 1, inEquilibrium: true };
    }
    const p = (2 * observed.AA + observed.Aa) / (2 * total);
    const q = 1 - p;
    const expected = {
      AA: total * p * p,
      Aa: total * 2 * p * q,
      aa: total * q * q,
    };
    let chiSquare = 0;
    if (expected.AA > 0) chiSquare += Math.pow(observed.AA - expected.AA, 2) / expected.AA;
    if (expected.Aa > 0) chiSquare += Math.pow(observed.Aa - expected.Aa, 2) / expected.Aa;
    if (expected.aa > 0) chiSquare += Math.pow(observed.aa - expected.aa, 2) / expected.aa;
    this._history.push({ method: 'hardyWeinbergTest', chiSquare });
    // Critical value at 0.05 significance, df=1 is 3.841
    return { expected, chiSquare, degreesOfFreedom: 1, inEquilibrium: chiSquare < 3.841 };
  }

  /** Sex-linked trait analysis. */
  sexLinked(trait: string, parents: { mother: string; father: string }): { sons: string; daughters: string } {
    void trait;
    const motherAlleles = parents.mother.split('');
    const fatherAlleles = parents.father.split('');
    const sons = fatherAlleles[0] ?? 'X';
    const daughters = `${motherAlleles[0] ?? 'X'}${fatherAlleles[0] ?? 'X'}`;
    this._history.push({ method: 'sexLinked' });
    return { sons, daughters };
  }

  /** Codominance cross (both alleles expressed). */
  codominance(p1: string, p2: string): Phenotype {
    const traits: Record<string, string> = { cross: `${p1}+${p2}` };
    const result: Phenotype = {
      traits,
      dominant: [p1, p2],
      recessive: [],
    };
    this._phenotypes.push(result);
    this._history.push({ method: 'codominance' });
    return result;
  }

  /** Incomplete dominance cross (blended phenotype). */
  incompleteDominance(p1: string, p2: string): Phenotype {
    const traits: Record<string, string> = { blended: `${p1}${p2}` };
    const result: Phenotype = {
      traits,
      dominant: [],
      recessive: [],
    };
    this._phenotypes.push(result);
    this._history.push({ method: 'incompleteDominance' });
    return result;
  }

  /** Epistasis (one gene masks another). */
  epistasis(genes: string[]): { epistatic: string; hypostatic: string } {
    const result = {
      epistatic: genes[0] ?? 'A',
      hypostatic: genes[1] ?? 'B',
    };
    this._history.push({ method: 'epistasis' });
    return result;
  }

  /** Polygenic trait (multiple genes contributing). */
  polygenic(traits: string[]): { geneCount: number; phenotypes: number } {
    const result = {
      geneCount: traits.length,
      phenotypes: 2 * traits.length + 1,
    };
    this._history.push({ method: 'polygenic' });
    return result;
  }

  /** Analyze a pedigree. */
  pedigreeAnalysis(family: { name: string; generations: number; affected: string[]; carriers: string[] }): Pedigree {
    const inheritance = family.affected.length > family.generations ? 'dominant' : 'recessive';
    const result: Pedigree = {
      family: family.name,
      generations: family.generations,
      affected: family.affected,
      carriers: family.carriers,
      inheritance,
    };
    this._pedigrees.push(result);
    this._history.push({ method: 'pedigreeAnalysis' });
    return result;
  }

  /** Karyotype analysis. */
  karyotype(chromosomes: number): { count: number; normal: boolean; sex: string } {
    const normal = chromosomes === 46;
    const sex = chromosomes === 46 ? 'XX or XY' : 'unknown';
    this._history.push({ method: 'karyotype' });
    return { count: chromosomes, normal, sex };
  }

  /** Predict mutation effect. */
  mutationEffect(mutation: { type: string; position: number }): string {
    const effects: Record<string, string> = {
      substitution: 'silent, missense, or nonsense',
      insertion: 'frameshift',
      deletion: 'frameshift',
      duplication: 'gene expansion',
      inversion: 'gene disruption',
    };
    const effect = effects[mutation.type] ?? 'unknown';
    this._history.push({ method: 'mutationEffect', type: mutation.type });
    return effect;
  }

  /** Reverse complement of a DNA sequence. */
  reverseComplement(dna: string): string {
    const complement = dna.split('').map(b => DNA_COMPLEMENT[b] ?? 'N').join('');
    return complement.split('').reverse().join('');
  }

  /** Transcribe DNA to mRNA (T -> U, complement). */
  transcribe(dna: string): string {
    const rnaComplement: Record<string, string> = { A: 'U', T: 'A', C: 'G', G: 'C', a: 'u', t: 'a', c: 'g', g: 'c' };
    return dna.split('').map(b => rnaComplement[b] ?? 'N').join('');
  }

  /** Translate mRNA to a protein sequence (single-letter codes). */
  translate(mrna: string): string {
    let protein = '';
    let started = false;
    for (let i = 0; i + 3 <= mrna.length; i += 3) {
      const codon = mrna.substring(i, i + 3).toUpperCase();
      const aa = CODON_TABLE[codon];
      if (!aa) continue;
      if (aa === 'M' && !started) {
        started = true;
        protein += aa;
        continue;
      }
      if (!started) continue;
      if (aa === '*') break;
      protein += aa;
    }
    this._history.push({ method: 'translate' });
    return protein;
  }

  /** Compute GC content of a DNA sequence (percentage). */
  gcContent(dna: string): number {
    if (dna.length === 0) return 0;
    const gc = (dna.match(/[GCgc]/g) ?? []).length;
    return (gc / dna.length) * 100;
  }

  /** Compute melting temperature (Wallace rule for short oligos). */
  meltingTemp(dna: string): number {
    const upper = dna.toUpperCase();
    const a = (upper.match(/A/g) ?? []).length;
    const t = (upper.match(/T/g) ?? []).length;
    const g = (upper.match(/G/g) ?? []).length;
    const c = (upper.match(/C/g) ?? []).length;
    if (upper.length < 14) {
      return 2 * (a + t) + 4 * (g + c);
    }
    return 64.9 + (41 * (g + c - 16.4)) / upper.length;
  }

  /** Compute molecular weight of a DNA oligo. */
  dnaMolecularWeight(dna: string): number {
    const upper = dna.toUpperCase();
    const counts: Record<string, number> = { A: 0, T: 0, G: 0, C: 0 };
    for (const b of upper) if (b in counts) counts[b]!++;
    const a = counts.A!;
    const t = counts.T!;
    const g = counts.G!;
    const c = counts.C!;
    return (a * 313.21 + t * 304.2 + g * 329.21 + c * 289.18) - 61.96;
  }

  /** Compute approximate molecular weight of a protein. */
  proteinMolecularWeight(sequence: string): number {
    if (sequence.length === 0) return 0;
    let total = 0;
    for (const aa of sequence.toUpperCase()) {
      total += AMINO_ACID_WEIGHT[aa] ?? 110;
    }
    return total - (sequence.length - 1) * 18.02; // water loss per peptide bond
  }

  /** Compute isoelectric point estimate (very rough, Henderson-Hasselbalch on charged residues). */
  isoelectricPoint(sequence: string): number {
    const upper = sequence.toUpperCase();
    const counts: Record<string, number> = { D: 0, E: 0, K: 0, R: 0, H: 0 };
    for (const aa of upper) if (aa in counts) counts[aa]!++;
    const acid = counts.D! + counts.E!;
    const base = counts.K! + counts.R! + counts.H! * 0.1;
    if (acid === 0 && base === 0) return 7.0;
    if (acid === 0) return 12.0;
    if (base === 0) return 2.0;
    return 7 + 0.5 * Math.log10(base / acid);
  }

  /** Grand average of hydropathy (GRAVY) for a protein sequence. */
  gravyScore(sequence: string): number {
    if (sequence.length === 0) return 0;
    let total = 0;
    for (const aa of sequence.toUpperCase()) {
      total += HYDROPATHY[aa] ?? 0;
    }
    return total / sequence.length;
  }

  /** Design a primer with target melting temperature. */
  primerDesign(template: string, targetTm: number): { primer: string; tm: number; length: number } {
    let primer = '';
    let tm = 0;
    for (const b of template.toUpperCase()) {
      primer += b;
      tm = this.meltingTemp(primer);
      if (tm >= targetTm) break;
      if (primer.length >= 30) break;
    }
    this._history.push({ method: 'primerDesign', tm });
    return { primer, tm, length: primer.length };
  }

  /** PCR amplification simulation. */
  pcr(template: string, _primers: { forward: string; reverse: string }, cycles: number): { copies: number; product: string } {
    const copies = Math.pow(2, cycles);
    this._history.push({ method: 'pcr', cycles });
    return { copies, product: template };
  }

  /** Estimate probability that a child of two carriers will be affected (autosomal recessive). */
  autosomalRecessiveRisk(parentsCarriers: number): number {
    if (parentsCarriers === 2) return 0.25;
    if (parentsCarriers === 1) return 0;
    return 0;
  }

  /** Estimate probability that a child will be affected (autosomal dominant, one affected heterozygous parent). */
  autosomalDominantRisk(affectedHeterozygousParents: number): number {
    if (affectedHeterozygousParents === 2) return 0.75;
    if (affectedHeterozygousParents === 1) return 0.5;
    return 0;
  }

  /** Compute inbreeding coefficient from pedigree depth (simplified Wright's path). */
  inbreedingCoefficient(commonAncestors: number, generationsPerPath: number[]): number {
    let fx = 0;
    for (const n of generationsPerPath) {
      fx += Math.pow(0.5, n + 1) * (1 + 0);
    }
    void commonAncestors;
    return Math.min(1, fx);
  }

  /** Compute relatedness coefficient between two relatives. */
  relatedness(generationsToCommonAncestor: number[]): number {
    let r = 0;
    for (const n of generationsToCommonAncestor) {
      r += Math.pow(0.5, n);
    }
    return r;
  }

  /** Linkage analysis - estimate recombination frequency from observed recombinants. */
  recombinationFrequency(totalOffspring: number, recombinants: number): number {
    if (totalOffspring === 0) return 0.5;
    return Math.min(0.5, recombinants / totalOffspring);
  }

  /** Convert recombination frequency to map distance in centimorgans. */
  mapDistance(recombFraction: number): number {
    return recombFraction * 100;
  }

  /** Haldane map function: distance -> recombination fraction. */
  haldaneMapFunction(distanceCM: number): number {
    const d = distanceCM / 100;
    return 0.5 * (1 - Math.exp(-2 * d));
  }

  /** Kosambi map function: distance -> recombination fraction. */
  kosambiMapFunction(distanceCM: number): number {
    const d = distanceCM / 100;
    return 0.5 * Math.tanh(2 * d);
  }

  /** Inverse Kosambi map function: recombination fraction -> distance. */
  inverseKosambi(recombFraction: number): number {
    const r = Math.max(0, Math.min(0.5, recombFraction));
    return 25 * Math.log((1 + 2 * r) / (1 - 2 * r));
  }

  /** Compute effective population size (inbreeding Ne). */
  effectivePopulationSize(nMales: number, nFemales: number): number {
    if (nMales + nFemales === 0) return 0;
    return (4 * nMales * nFemales) / (nMales + nFemales);
  }

  /** Loss of heterozygosity per generation due to drift. */
  heterozygosityLoss(Ne: number, generations: number): number {
    const perGen = 1 / (2 * Ne);
    return 1 - Math.pow(1 - perGen, generations);
  }

  /** Add a locus to the catalog. */
  addLocus(locus: Locus): void {
    this._loci.set(locus.name, locus);
    this._history.push({ method: 'addLocus', name: locus.name });
  }

  /** Get a locus by name. */
  getLocus(name: string): Locus | null {
    return this._loci.get(name) ?? null;
  }

  /** Compute expected heterozygosity for a locus given allele frequencies. */
  expectedHeterozygosity(frequencies: number[]): number {
    let sumSq = 0;
    for (const f of frequencies) sumSq += f * f;
    return 1 - sumSq;
  }

  /** Allele frequency shift under selection (single generation). */
  alleleFrequencyShift(currentFreq: number, w11: number, w12: number, w22: number): number {
    const p = currentFreq;
    const q = 1 - p;
    const wBar = p * p * w11 + 2 * p * q * w12 + q * q * w22;
    if (wBar === 0) return p;
    const newP = (p * p * w11 + p * q * w12) / wBar;
    return Math.max(0, Math.min(1, newP));
  }

  /** QTL (quantitative trait loci) effect estimate. */
  qtlEffect(parent1Mean: number, parent2Mean: number, f2Mean: number): { additive: number; dominance: number } {
    const additive = (parent1Mean - parent2Mean) / 2;
    const dominance = f2Mean - (parent1Mean + parent2Mean) / 2;
    return { additive, dominance };
  }

  /** Heritability (broad sense) from variance components. */
  broadSenseHeritability(varianceAdditive: number, varianceDominance: number, varianceEpistatic: number, variancePhenotypic: number): number {
    if (variancePhenotypic === 0) return 0;
    return (varianceAdditive + varianceDominance + varianceEpistatic) / variancePhenotypic;
  }

  /** Narrow sense heritability (h^2). */
  narrowSenseHeritability(varianceAdditive: number, variancePhenotypic: number): number {
    if (variancePhenotypic === 0) return 0;
    return varianceAdditive / variancePhenotypic;
  }

  /** Response to selection (Breeder's equation R = h^2 * S). */
  responseToSelection(heritability: number, selectionDifferential: number): number {
    return heritability * selectionDifferential;
  }

  /** Compute realized heritability from observed response. */
  realizedHeritability(response: number, selectionDifferential: number): number {
    if (selectionDifferential === 0) return 0;
    return response / selectionDifferential;
  }

  /** Estimate recombination distance from testcross data. */
  testcrossAnalysis(progeny: { parent1: number; parent2: number; recombinant1: number; recombinant2: number }): {
    total: number;
    recombinants: number;
    recombinationFraction: number;
    mapDistance: number;
  } {
    const total = progeny.parent1 + progeny.parent2 + progeny.recombinant1 + progeny.recombinant2;
    const recombinants = progeny.recombinant1 + progeny.recombinant2;
    if (total === 0) return { total: 0, recombinants: 0, recombinationFraction: 0, mapDistance: 0 };
    const rf = recombinants / total;
    return { total, recombinants, recombinationFraction: rf, mapDistance: rf * 100 };
  }

  /** Compute a 3-point testcross gene order from progeny counts. */
  threePointCross(data: Record<string, number>): { order: string[]; doubleCrossovers: number; distances: Record<string, number> } {
    const entries = Object.entries(data).sort((a, b) => a[1] - b[1]);
    const dco = entries[0]?.[1] ?? 0;
    const dcoKey = entries[0]?.[0] ?? '';
    const parentals = entries[entries.length - 1]?.[0] ?? '';
    // Middle gene is the one that differs between DCO and parentals
    const order: string[] = [];
    for (let i = 0; i < dcoKey.length; i++) {
      if (dcoKey[i] !== parentals[i]) {
        order.push('middle');
      } else {
        order.push('flank');
      }
    }
    const total = entries.reduce((s, [, v]) => s + v, 0);
    const distances: Record<string, number> = { 'interval-1': total > 0 ? (dco * 2) / total * 100 : 0 };
    this._history.push({ method: 'threePointCross' });
    return { order, doubleCrossovers: dco, distances };
  }

  /** Convert a triplet codon to its amino acid. */
  codonToAa(codon: string): string {
    return CODON_TABLE[codon.toUpperCase()] ?? 'X';
  }

  /** Reverse-translate a protein to possible DNA codons. */
  reverseTranslate(protein: string): string[] {
    const reverseTable: Record<string, string[]> = {
      F: ['TTT', 'TTC'], L: ['TTA', 'TTG', 'CTT', 'CTC', 'CTA', 'CTG'],
      I: ['ATT', 'ATC', 'ATA'], M: ['ATG'], V: ['GTT', 'GTC', 'GTA', 'GTG'],
      S: ['TCT', 'TCC', 'TCA', 'TCG', 'AGT', 'AGC'], P: ['CCT', 'CCC', 'CCA', 'CCG'],
      T: ['ACT', 'ACC', 'ACA', 'ACG'], A: ['GCT', 'GCC', 'GCA', 'GCG'],
      Y: ['TAT', 'TAC'], '*': ['TAA', 'TAG', 'TGA'], H: ['CAT', 'CAC'],
      Q: ['CAA', 'CAG'], N: ['AAT', 'AAC'], K: ['AAA', 'AAG'],
      D: ['GAT', 'GAC'], E: ['GAA', 'GAG'], C: ['TGT', 'TGC'], W: ['TGG'],
      R: ['CGT', 'CGC', 'CGA', 'CGG', 'AGA', 'AGG'], G: ['GGT', 'GGC', 'GGA', 'GGG'],
    };
    const result: string[] = [];
    for (const aa of protein.toUpperCase()) {
      const codons = reverseTable[aa];
      if (codons && codons.length > 0) result.push(codons[0]!);
    }
    return result;
  }

  /** Generate a random DNA sequence of given length. */
  randomDNA(length: number): string {
    const bases = ['A', 'T', 'C', 'G'];
    let result = '';
    for (let i = 0; i < length; i++) {
      result += bases[Math.floor(Math.random() * 4)];
    }
    return result;
  }

  /** Apply a point mutation to a sequence. */
  applyMutation(sequence: string, position: number, newBase: string): string {
    if (position < 0 || position >= sequence.length) return sequence;
    return sequence.substring(0, position) + newBase + sequence.substring(position + 1);
  }

  /** Find restriction enzyme cut sites in a DNA sequence. */
  restrictionSites(dna: string, enzymeSite: string): number[] {
    const sites: number[] = [];
    const upper = dna.toUpperCase();
    const site = enzymeSite.toUpperCase();
    let idx = upper.indexOf(site);
    while (idx !== -1) {
      sites.push(idx);
      idx = upper.indexOf(site, idx + 1);
    }
    return sites;
  }

  /** Compute amino acid composition of a protein. */
  aaComposition(sequence: string): Record<string, number> {
    const composition: Record<string, number> = {};
    for (const aa of sequence.toUpperCase()) {
      composition[aa] = (composition[aa] ?? 0) + 1;
    }
    return composition;
  }

  /** Compute extinction coefficient at 280 nm for a protein. */
  extinctionCoefficient280(sequence: string): number {
    const upper = sequence.toUpperCase();
    const w = (upper.match(/W/g) ?? []).length;
    const y = (upper.match(/Y/g) ?? []).length;
    const c = (upper.match(/C/g) ?? []).length;
    return w * 5500 + y * 1490 + c * 125;
  }

  /** Compute codon adaptation index (simplified). */
  codonAdaptationIndex(cds: string, optimalCodons: Set<string>): number {
    if (cds.length < 3) return 0;
    let total = 0;
    let count = 0;
    for (let i = 0; i + 3 <= cds.length; i += 3) {
      const codon = cds.substring(i, i + 3).toUpperCase();
      const aa = CODON_TABLE[codon];
      if (!aa || aa === '*' || aa === 'M') continue;
      count++;
      if (optimalCodons.has(codon)) total += 1;
    }
    return count === 0 ? 0 : total / count;
  }

  /** Compute the binomial probability of k events in n trials. */
  binomialProbability(n: number, k: number, p: number): number {
    if (k < 0 || k > n) return 0;
    const coeff = this._binomialCoeff(n, k);
    return coeff * Math.pow(p, k) * Math.pow(1 - p, n - k);
  }

  private _binomialCoeff(n: number, k: number): number {
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;
    let result = 1;
    for (let i = 0; i < k; i++) {
      result = (result * (n - i)) / (i + 1);
    }
    return Math.round(result);
  }

  /** Compute the chi-square test for goodness of fit. */
  chiSquareTest(observed: number[], expected: number[]): { chiSquare: number; df: number } {
    let chi = 0;
    const df = observed.length - 1;
    for (let i = 0; i < observed.length; i++) {
      const exp = expected[i] ?? 1;
      if (exp > 0) {
        chi += Math.pow(observed[i]! - exp, 2) / exp;
      }
    }
    this._history.push({ method: 'chiSquareTest' });
    return { chiSquare: chi, df };
  }

  /** Estimate the probability of fixation of a new neutral mutation (1/2Ne). */
  neutralFixationProbability(popSize: number): number {
    return 1 / (2 * popSize);
  }

  /** Compute F-statistics (Fis, Fit, Fst) from subpopulation heterozygosities. */
  fStatistics(Hs: number, Ht: number, Hi: number): { Fis: number; Fit: number; Fst: number } {
    const Fis = Hs === 0 ? 0 : 1 - Hi / Hs;
    const Fit = Ht === 0 ? 0 : 1 - Hi / Ht;
    const Fst = Ht === 0 ? 0 : (Ht - Hs) / Ht;
    return { Fis, Fit, Fst };
  }

  /** Compute fixation index (Fst) between two populations. */
  fixationIndex(p1: number, p2: number): number {
    const pBar = (p1 + p2) / 2;
    const Hs = 2 * pBar * (1 - pBar) - (Math.pow(p1 - pBar, 2) + Math.pow(p2 - pBar, 2)) / 2;
    const Ht = 2 * pBar * (1 - pBar);
    if (Ht === 0) return 0;
    return (Ht - Hs) / Ht;
  }

  /** Track a mutation record. */
  recordMutation(mutation: MutationRecord): void {
    this._mutations.push(mutation);
    this._history.push({ method: 'recordMutation', type: mutation.type });
  }

  /** Predict CRISPR-Cas9 off-target sites (very simplified). */
  crisprOffTarget(grna: string, genome: string, maxMismatches: number = 3): Array<{ position: number; mismatches: number; sequence: string }> {
    const sites: Array<{ position: number; mismatches: number; sequence: string }> = [];
    const grnaUpper = grna.toUpperCase();
    const genomeUpper = genome.toUpperCase();
    for (let i = 0; i + grnaUpper.length <= genomeUpper.length; i++) {
      const sub = genomeUpper.substring(i, i + grnaUpper.length);
      let mismatches = 0;
      for (let j = 0; j < grnaUpper.length; j++) {
        if (grnaUpper[j] !== sub[j]) mismatches++;
      }
      if (mismatches <= maxMismatches) {
        sites.push({ position: i, mismatches, sequence: sub });
      }
    }
    return sites;
  }

  /** Predict whether a SNP is synonymous or non-synonymous. */
  classifySnp(codon: string, position: number, newBase: string): { type: string; original: string; mutated: string } {
    if (position < 0 || position >= codon.length) {
      return { type: 'invalid', original: '', mutated: '' };
    }
    const mutated = codon.substring(0, position) + newBase + codon.substring(position + 1);
    const aa1 = CODON_TABLE[codon.toUpperCase()] ?? '?';
    const aa2 = CODON_TABLE[mutated.toUpperCase()] ?? '?';
    let type = 'synonymous';
    if (aa2 === '*') type = 'nonsense';
    else if (aa1 !== aa2) type = 'missense';
    return { type, original: aa1, mutated: aa2 };
  }

  /** Compute the identity between two DNA sequences. */
  sequenceIdentity(seq1: string, seq2: string): number {
    const minLen = Math.min(seq1.length, seq2.length);
    if (minLen === 0) return 0;
    let matches = 0;
    for (let i = 0; i < minLen; i++) {
      if (seq1[i]?.toUpperCase() === seq2[i]?.toUpperCase()) matches++;
    }
    return matches / minLen;
  }

  /** Generate a simple consensus sequence from an alignment. */
  consensus(sequences: string[]): string {
    if (sequences.length === 0) return '';
    const length = Math.min(...sequences.map(s => s.length));
    let result = '';
    for (let i = 0; i < length; i++) {
      const column: Record<string, number> = {};
      for (const s of sequences) {
        const base = s[i]?.toUpperCase();
        if (!base) continue;
        column[base] = (column[base] ?? 0) + 1;
      }
      let maxBase = '-';
      let maxCount = 0;
      for (const [b, c] of Object.entries(column)) {
        if (c > maxCount) {
          maxCount = c;
          maxBase = b;
        }
      }
      result += maxBase;
    }
    return result;
  }

  /** Compute Shannon entropy of a DNA sequence (bits). */
  sequenceEntropy(sequence: string): number {
    if (sequence.length === 0) return 0;
    const counts: Record<string, number> = {};
    for (const b of sequence.toUpperCase()) {
      counts[b] = (counts[b] ?? 0) + 1;
    }
    let entropy = 0;
    const total = sequence.length;
    for (const count of Object.values(counts)) {
      const p = count / total;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  /** Simulate a simple Wright-Fisher model of genetic drift. */
  wrightFisher(initialFreq: number, populationSize: number, generations: number): number[] {
    const trajectory: number[] = [initialFreq];
    let p = initialFreq;
    for (let g = 0; g < generations; g++) {
      const alleleCount = Math.floor(2 * populationSize * p);
      let newCount = 0;
      for (let i = 0; i < 2 * populationSize; i++) {
        if (Math.random() < alleleCount / (2 * populationSize)) newCount++;
      }
      p = newCount / (2 * populationSize);
      trajectory.push(p);
      if (p === 0 || p === 1) break;
    }
    return trajectory;
  }

  /** Compute all possible gametes from a given polyploid genotype. */
  polyploidGametes(genotype: string, ploidy: number): string[] {
    const alleles = genotype.split('');
    if (alleles.length !== ploidy) return [];
    const result = new Set<string>();
    const generate = (current: string, remaining: string[], depth: number): void => {
      if (depth === ploidy / 2) {
        result.add(current.split('').sort().join(''));
        return;
      }
      for (let i = 0; i < remaining.length; i++) {
        const next = remaining.slice(i + 1);
        generate(current + remaining[i], next, depth + 1);
      }
    };
    generate('', alleles, 0);
    return Array.from(result);
  }

  /** Format a genotype for display. */
  formatGenotype(genotype: string): string {
    return genotype.split('').sort((a, b) => {
      const ua = a.toUpperCase();
      const ub = b.toUpperCase();
      if (ua === ub) return a === a.toUpperCase() ? -1 : 1;
      return ua < ub ? -1 : 1;
    }).join('');
  }

  /** Compute phenotype probability from a Punnett square given a dominance map. */
  phenotypeProbability(cross: PunnettSquare, dominanceMap: Record<string, boolean>): number {
    let prob = 0;
    for (const [geno, p] of Object.entries(cross.ratios.genotype)) {
      const hasDominant = geno.split('').some((b, i) => dominanceMap[b] ?? (i % 2 === 0));
      if (hasDominant) prob += p;
    }
    return prob;
  }

  /** Predict expected offspring ratio for a test cross. */
  testCrossRatio(genotype: string): Record<string, number> {
    const gametes = this._gametes(genotype);
    const ratios: Record<string, number> = {};
    for (const g of gametes) {
      ratios[g] = (ratios[g] ?? 0) + 1;
    }
    const total = Object.values(ratios).reduce((s, c) => s + c, 0);
    const result: Record<string, number> = {};
    for (const [k, v] of Object.entries(ratios)) result[k] = v / total;
    return result;
  }

  toPacket(): DataPacket<{
    genotypes: Genotype[];
    phenotypes: Phenotype[];
    crosses: PunnettSquare[];
    pedigrees: Pedigree[];
    loci: Map<string, Locus>;
    linkages: Linkage[];
    populations: Map<string, AlleleFrequencies>;
    mutations: MutationRecord[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['biology', 'Genetics'],
      priority: 1,
      phase: 'biology:genetics',
    };
    return {
      id: `gen-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        genotypes: this._genotypes,
        phenotypes: this._phenotypes,
        crosses: this._crosses,
        pedigrees: this._pedigrees,
        loci: this._loci,
        linkages: this._linkages,
        populations: this._populations,
        mutations: this._mutations,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._genotypes = [];
    this._phenotypes = [];
    this._crosses = [];
    this._pedigrees = [];
    this._linkages = [];
    this._populations = new Map();
    this._mutations = [];
    this._history = [];
    this._counter = 0;
    this._loci = new Map();
    this._seedLoci();
  }

  get genotypeCount(): number {
    return this._genotypes.length;
  }

  get phenotypeCount(): number {
    return this._phenotypes.length;
  }

  get crossCount(): number {
    return this._crosses.length;
  }

  get historyDepth(): number {
    return this._history.length;
  }

  get locusCount(): number {
    return this._loci.size;
  }

  get mutationCount(): number {
    return this._mutations.length;
  }

  get pedigreeCount(): number {
    return this._pedigrees.length;
  }
}
