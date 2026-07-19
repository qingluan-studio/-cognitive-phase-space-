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

/** Genetics: crosses, Punnett squares, population genetics. */
export class Genetics {
  private _genotypes: Genotype[] = [];
  private _phenotypes: Phenotype[] = [];
  private _crosses: PunnettSquare[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

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
    this._history.push({ method: 'monohybridCross' });
    return result;
  }

  /** Dihybrid cross between two double-trait genotypes. */
  dihybridCross(p1: string, p2: string): PunnettSquare {
    const alleles1 = p1.split('');
    const alleles2 = p2.split('');
    const grid: string[][] = [];
    const genotypeCount: Record<string, number> = {};
    for (const a of alleles1) {
      const row: string[] = [];
      for (const b of alleles2) {
        const combined = `${a}${b}`;
        row.push(combined);
        genotypeCount[combined] = (genotypeCount[combined] ?? 0) + 1;
      }
      grid.push(row);
    }
    const total = Object.values(genotypeCount).reduce((s, c) => s + c, 0);
    const genotype: Record<string, number> = {};
    for (const [k, v] of Object.entries(genotypeCount)) genotype[k] = v / total;
    const result: PunnettSquare = {
      cross: `${p1} × ${p2}`,
      grid,
      ratios: { genotype, phenotype: {} },
    };
    this._crosses.push(result);
    this._history.push({ method: 'dihybridCross' });
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

  /** Probability of an allele combination. */
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
    this._history.push({ method: 'hardyWeinberg' });
    return { p, q, pp, pq, qq };
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

  toPacket(): DataPacket<{
    genotypes: Genotype[];
    phenotypes: Phenotype[];
    crosses: PunnettSquare[];
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
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._genotypes = [];
    this._phenotypes = [];
    this._crosses = [];
    this._history = [];
    this._counter = 0;
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
}
