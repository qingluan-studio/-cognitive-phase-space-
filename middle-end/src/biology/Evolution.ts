import { DataPacket, PacketMeta } from '../shared/types';

/** Population descriptor. */
export interface Population {
  size: number;
  alleleFreq: Record<string, number>;
  fitness: number;
}

/** Selection descriptor. */
export interface Selection {
  type: 'directional' | 'stabilizing' | 'disruptive' | 'sexual' | 'artificial';
  pressure: number;
  direction: 'positive' | 'negative' | 'balanced';
}

/** Speciation descriptor. */
export interface Speciation {
  type: 'allopatric' | 'sympatric' | 'parapatric' | 'peripatric';
  isolation: 'geographic' | 'reproductive' | 'temporal' | 'behavioral' | 'ecological';
}

/** Fitness landscape descriptor. */
export interface FitnessLandscape {
  peaks: Array<{ genotype: string; fitness: number }>;
  valleys: Array<{ genotype: string; fitness: number }>;
  ruggedness: number;
}

/** Phylogenetic tree node. */
export interface PhyloNode {
  id: string;
  taxon: string | null;
  parent: string | null;
  children: string[];
  branchLength: number;
  age: number;
  support: number;
}

/** Phylogenetic tree descriptor. */
export interface PhyloTree {
  nodes: Map<string, PhyloNode>;
  root: string;
  totalBranchLength: number;
  tips: number;
}

/** Molecular clock estimate. */
export interface MolecularClock {
  divergenceTime: number;
  substitutions: number;
  rate: number;
  confidence: number;
}

/** Coalescence descriptor. */
export interface Coalescence {
  mrca: number;
  tMRCA: number;
  theta: number;
  lineages: number;
}

/** Taxonomic rank descriptor. */
export interface Taxon {
  kingdom: string;
  phylum: string;
  class: string;
  order: string;
  family: string;
  genus: string;
  species: string;
  common: string;
}

/** Geological era description for context. */
export interface GeologicalContext {
  era: string;
  period: string;
  age: number; // Ma
  atmosphericO2: number;
  atmosphericCO2: number;
  description: string;
}

/** Evolution: natural selection, drift, speciation. */
export class Evolution {
  private _populations: Population[] = [];
  private _selections: Selection[] = [];
  private _speciations: Speciation[] = [];
  private _fitnessLandscapes: FitnessLandscape[] = [];
  private _trees: PhyloTree[] = [];
  private _molecularClocks: MolecularClock[] = [];
  private _coalescences: Coalescence[] = [];
  private _taxa: Map<string, Taxon> = new Map();
  private _history: unknown[] = [];
  private _counter = 0;

  constructor() {
    this._seedTaxa();
  }

  /** Seed some canonical taxa for reference. */
  private _seedTaxa(): void {
    const seed: Taxon[] = [
      { kingdom: 'Animalia', phylum: 'Chordata', class: 'Mammalia', order: 'Primates', family: 'Hominidae', genus: 'Homo', species: 'H. sapiens', common: 'human' },
      { kingdom: 'Animalia', phylum: 'Chordata', class: 'Mammalia', order: 'Carnivora', family: 'Felidae', genus: 'Panthera', species: 'P. leo', common: 'lion' },
      { kingdom: 'Animalia', phylum: 'Chordata', class: 'Aves', order: 'Passeriformes', family: 'Corvidae', genus: 'Corvus', species: 'C. corax', common: 'raven' },
      { kingdom: 'Plantae', phylum: 'Angiospermae', class: 'Eudicotyledoneae', order: 'Rosales', family: 'Rosaceae', genus: 'Rosa', species: 'R. gallica', common: 'French rose' },
      { kingdom: 'Fungi', phylum: 'Basidiomycota', class: 'Agaricomycetes', order: 'Agaricales', family: 'Amanitaceae', genus: 'Amanita', species: 'A. muscaria', common: 'fly agaric' },
      { kingdom: 'Bacteria', phylum: 'Proteobacteria', class: 'Gammaproteobacteria', order: 'Enterobacterales', family: 'Enterobacteriaceae', genus: 'Escherichia', species: 'E. coli', common: 'E. coli' },
      { kingdom: 'Animalia', phylum: 'Arthropoda', class: 'Insecta', order: 'Lepidoptera', family: 'Nymphalidae', genus: 'Danaus', species: 'D. plexippus', common: 'monarch butterfly' },
      { kingdom: 'Animalia', phylum: 'Chordata', class: 'Actinopterygii', order: 'Salmoniformes', family: 'Salmonidae', genus: 'Salmo', species: 'S. salar', common: 'Atlantic salmon' },
    ];
    for (const t of seed) this._taxa.set(t.species, t);
  }

  /** Apply natural selection to a population. */
  naturalSelection(population: Population, pressure: number): Population {
    const newFitness = population.fitness * (1 - pressure * 0.1);
    const newSize = Math.max(1, Math.floor(population.size * (1 + pressure * 0.05)));
    const newAlleleFreq: Record<string, number> = {};
    for (const [k, v] of Object.entries(population.alleleFreq)) {
      newAlleleFreq[k] = Math.max(0, Math.min(1, v + pressure * 0.01));
    }
    const result: Population = { size: newSize, alleleFreq: newAlleleFreq, fitness: newFitness };
    this._populations.push(result);
    this._history.push({ method: 'naturalSelection' });
    return result;
  }

  /** Artificial selection across generations. */
  artificialSelection(trait: string, generations: number): { trait: string; generations: number; change: number } {
    const change = generations * 0.05;
    this._history.push({ method: 'artificialSelection', trait });
    return { trait, generations, change };
  }

  /** Genetic drift over generations (Wright-Fisher model). */
  geneticDrift(population: Population, generations: number): Population {
    let alleleFreq = { ...population.alleleFreq };
    for (let g = 0; g < generations; g++) {
      for (const k of Object.keys(alleleFreq)) {
        const drift = (Math.random() - 0.5) * 0.1 / Math.sqrt(population.size);
        alleleFreq[k] = Math.max(0, Math.min(1, alleleFreq[k]! + drift));
      }
    }
    const result: Population = { ...population, alleleFreq };
    this._populations.push(result);
    this._history.push({ method: 'geneticDrift' });
    return result;
  }

  /** Bottleneck event. */
  bottleneck(population: Population, event: { survivors: number }): Population {
    const newSize = event.survivors;
    const result: Population = { ...population, size: newSize };
    this._populations.push(result);
    this._history.push({ method: 'bottleneck' });
    return result;
  }

  /** Founder effect. */
  founderEffect(population: Population, founders: string[]): Population {
    const founderAlleles: Record<string, number> = {};
    for (const a of founders) {
      founderAlleles[a] = (founderAlleles[a] ?? 0) + 1;
    }
    const total = founders.length;
    for (const k of Object.keys(founderAlleles)) {
      founderAlleles[k] = founderAlleles[k]! / total;
    }
    const result: Population = { ...population, alleleFreq: founderAlleles };
    this._populations.push(result);
    this._history.push({ method: 'founderEffect' });
    return result;
  }

  /** Gene flow between populations. */
  geneFlow(pop1: Population, pop2: Population, rate: number): { pop1: Population; pop2: Population } {
    const newFreq1: Record<string, number> = {};
    const newFreq2: Record<string, number> = {};
    const keys = new Set([...Object.keys(pop1.alleleFreq), ...Object.keys(pop2.alleleFreq)]);
    for (const k of keys) {
      const f1 = pop1.alleleFreq[k] ?? 0;
      const f2 = pop2.alleleFreq[k] ?? 0;
      newFreq1[k] = f1 * (1 - rate) + f2 * rate;
      newFreq2[k] = f2 * (1 - rate) + f1 * rate;
    }
    const result1: Population = { ...pop1, alleleFreq: newFreq1 };
    const result2: Population = { ...pop2, alleleFreq: newFreq2 };
    this._populations.push(result1, result2);
    this._history.push({ method: 'geneFlow' });
    return { pop1: result1, pop2: result2 };
  }

  /** Hardy-Weinberg equilibrium check. */
  hardyWeinbergEquilibrium(p: number, q: number): { equilibrium: boolean; expected: Record<string, number> } {
    const equilibrium = Math.abs(p + q - 1) < 1e-6;
    const expected: Record<string, number> = {
      pp: p * p,
      pq: 2 * p * q,
      qq: q * q,
    };
    this._history.push({ method: 'hardyWeinbergEquilibrium' });
    return { equilibrium, expected };
  }

  /** Compute fitness of a genotype in an environment. */
  fitness(genotype: string, environment: string): number {
    let f = 1.0;
    if (environment === 'harsh') f = 0.6;
    if (environment === 'favorable') f = 1.2;
    if (genotype.includes('A')) f += 0.1;
    this._history.push({ method: 'fitness' });
    return Math.max(0, Math.min(1.5, f));
  }

  /** Directional selection favors one extreme. */
  directionalSelection(population: Population, trait: string): Selection {
    const result: Selection = { type: 'directional', pressure: 0.2, direction: 'positive' };
    void trait;
    void population;
    this._selections.push(result);
    this._history.push({ method: 'directionalSelection' });
    return result;
  }

  /** Stabilizing selection favors the mean. */
  stabilizingSelection(population: Population, trait: string): Selection {
    const result: Selection = { type: 'stabilizing', pressure: 0.1, direction: 'balanced' };
    void population;
    void trait;
    this._selections.push(result);
    this._history.push({ method: 'stabilizingSelection' });
    return result;
  }

  /** Disruptive selection favors both extremes. */
  disruptiveSelection(population: Population, trait: string): Selection {
    const result: Selection = { type: 'disruptive', pressure: 0.3, direction: 'balanced' };
    void population;
    void trait;
    this._selections.push(result);
    this._history.push({ method: 'disruptiveSelection' });
    return result;
  }

  /** Sexual selection. */
  sexualSelection(trait: string, preference: string): Selection {
    const result: Selection = { type: 'sexual', pressure: 0.15, direction: 'positive' };
    void trait;
    void preference;
    this._selections.push(result);
    this._history.push({ method: 'sexualSelection' });
    return result;
  }

  /** Allopatric speciation via geographic barrier. */
  speciationAllopatric(population: Population, barrier: string): Speciation {
    void population;
    void barrier;
    const result: Speciation = { type: 'allopatric', isolation: 'geographic' };
    this._speciations.push(result);
    this._history.push({ method: 'speciationAllopatric' });
    return result;
  }

  /** Sympatric speciation within the same area. */
  speciationSympatric(population: Population, mechanism: string): Speciation {
    void population;
    const isolationMap: Record<string, Speciation['isolation']> = {
      'polyploidy': 'reproductive',
      'behavioral': 'behavioral',
      'temporal': 'temporal',
      'ecological': 'ecological',
    };
    const result: Speciation = {
      type: 'sympatric',
      isolation: isolationMap[mechanism] ?? 'reproductive',
    };
    this._speciations.push(result);
    this._history.push({ method: 'speciationSympatric' });
    return result;
  }

  /** Parapatric speciation (adjacent populations). */
  speciationParapatric(population: Population, gradient: string): Speciation {
    void population;
    void gradient;
    const result: Speciation = { type: 'parapatric', isolation: 'ecological' };
    this._speciations.push(result);
    this._history.push({ method: 'speciationParapatric' });
    return result;
  }

  /** Peripatric speciation (small peripheral isolate). */
  speciationPeripatric(population: Population, founders: number): Speciation {
    void population;
    void founders;
    const result: Speciation = { type: 'peripatric', isolation: 'geographic' };
    this._speciations.push(result);
    this._history.push({ method: 'speciationPeripatric' });
    return result;
  }

  /** Coevolution between two species. */
  coevolution(species1: string, species2: string): { species1: string; species2: string; relationship: string } {
    this._history.push({ method: 'coevolution' });
    return { species1, species2, relationship: 'mutualistic' };
  }

  /** Coevolution with explicit type. */
  coevolutionType(s1: string, s2: string, type: 'mutualism' | 'antagonism' | 'commensalism'): {
    species1: string;
    species2: string;
    relationship: string;
    description: string;
  } {
    const descriptions: Record<string, string> = {
      mutualism: 'both species benefit',
      antagonism: 'one benefits, one harmed (e.g. predator-prey)',
      commensalism: 'one benefits, other unaffected',
    };
    this._history.push({ method: 'coevolutionType' });
    return { species1: s1, species2: s2, relationship: type, description: descriptions[type] };
  }

  /** Extinction risk assessment. */
  extinctionRisk(population: Population): { risk: 'low' | 'medium' | 'high'; cause: string } {
    let risk: 'low' | 'medium' | 'high';
    if (population.size < 50) risk = 'high';
    else if (population.size < 500) risk = 'medium';
    else risk = 'low';
    this._history.push({ method: 'extinctionRisk' });
    return { risk, cause: 'small population size' };
  }

  /** Build a fitness landscape from genotype-fitness pairs. */
  fitnessLandscape(entries: Array<{ genotype: string; fitness: number }>): FitnessLandscape {
    const sorted = [...entries].sort((a, b) => b.fitness - a.fitness);
    const top = sorted[0];
    const bottom = sorted[sorted.length - 1];
    const peaks: Array<{ genotype: string; fitness: number }> = top ? [top] : [];
    const valleys: Array<{ genotype: string; fitness: number }> = bottom ? [bottom] : [];
    const mean = entries.reduce((s, e) => s + e.fitness, 0) / Math.max(entries.length, 1);
    const variance = entries.reduce((s, e) => s + Math.pow(e.fitness - mean, 2), 0) / Math.max(entries.length, 1);
    const landscape: FitnessLandscape = {
      peaks,
      valleys,
      ruggedness: Math.sqrt(variance),
    };
    this._fitnessLandscapes.push(landscape);
    this._history.push({ method: 'fitnessLandscape' });
    return landscape;
  }

  /** Compute adaptive landscape roughness from genotype fitness values. */
  landscapeRuggedness(entries: Array<{ genotype: string; fitness: number }>): number {
    if (entries.length < 2) return 0;
    let totalDiff = 0;
    let count = 0;
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const diff = Math.abs(entries[i]!.fitness - entries[j]!.fitness);
        const ham = this._hammingDistance(entries[i]!.genotype, entries[j]!.genotype);
        if (ham > 0) {
          totalDiff += diff / ham;
          count++;
        }
      }
    }
    return count === 0 ? 0 : totalDiff / count;
  }

  private _hammingDistance(s1: string, s2: string): number {
    const min = Math.min(s1.length, s2.length);
    let d = 0;
    for (let i = 0; i < min; i++) {
      if (s1[i] !== s2[i]) d++;
    }
    return d;
  }

  /** Molecular clock estimate given divergence and substitutions. */
  molecularClock(substitutions: number, divergenceTime: number): MolecularClock {
    if (divergenceTime === 0) {
      return { divergenceTime, substitutions, rate: 0, confidence: 0 };
    }
    const rate = substitutions / divergenceTime;
    const confidence = Math.min(1, 1 / Math.sqrt(substitutions + 1));
    const clock: MolecularClock = { divergenceTime, substitutions, rate, confidence };
    this._molecularClocks.push(clock);
    this._history.push({ method: 'molecularClock' });
    return clock;
  }

  /** Estimate divergence time given substitution count and rate. */
  divergenceTime(substitutions: number, rate: number): number {
    if (rate === 0) return 0;
    return substitutions / rate;
  }

  /** Compute the Jukes-Cantor distance between two sequences. */
  jukesCantor(p: number): number {
    // p = observed fraction of differences
    if (p <= 0) return 0;
    if (p >= 0.75) return Infinity;
    return -0.75 * Math.log(1 - (4 / 3) * p);
  }

  /** Kimura 2-parameter distance. */
  kimura2parameter(p: number, q: number): number {
    // p = transitions, q = transversions
    if (p + q >= 1) return Infinity;
    return -0.5 * Math.log(1 - 2 * p - q) - 0.25 * Math.log(1 - 2 * q);
  }

  /** Build a simple UPGMA tree from a distance matrix. */
  upgma(labels: string[], matrix: number[][]): PhyloTree {
    const nodes: Map<string, PhyloNode> = new Map();
    const clusters: Array<{ label: string; members: string[]; height: number }> = [];
    for (const label of labels) {
      const id = `node-${label}`;
      nodes.set(id, {
        id,
        taxon: label,
        parent: null,
        children: [],
        branchLength: 0,
        age: 0,
        support: 1,
      });
      clusters.push({ label: id, members: [id], height: 0 });
    }
    let matrixCopy = matrix.map(row => [...row]);
    let counter = 0;
    while (clusters.length > 1) {
      let minDist = Infinity;
      let iMin = 0;
      let jMin = 1;
      for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
          if (matrixCopy[i]![j]! < minDist) {
            minDist = matrixCopy[i]![j]!;
            iMin = i;
            jMin = j;
          }
        }
      }
      const newHeight = minDist / 2;
      const newId = `internal-${counter++}`;
      const a = clusters[iMin]!;
      const b = clusters[jMin]!;
      nodes.set(newId, {
        id: newId,
        taxon: null,
        parent: null,
        children: [a.label, b.label],
        branchLength: newHeight,
        age: newHeight,
        support: 0.9,
      });
      const aNode = nodes.get(a.label);
      if (aNode) {
        aNode.parent = newId;
        aNode.branchLength = newHeight - a.height;
      }
      const bNode = nodes.get(b.label);
      if (bNode) {
        bNode.parent = newId;
        bNode.branchLength = newHeight - b.height;
      }
      const newCluster = { label: newId, members: [...a.members, ...b.members], height: newHeight };
      clusters.splice(Math.max(iMin, jMin), 1);
      clusters.splice(Math.min(iMin, jMin), 1);
      clusters.push(newCluster);
      // rebuild distance matrix (simplified average linkage)
      const newMatrix: number[][] = [];
      for (let i = 0; i < clusters.length; i++) {
        const row: number[] = [];
        for (let j = 0; j < clusters.length; j++) {
          if (i === j) row.push(0);
          else {
            const ci = clusters[i]!;
            const cj = clusters[j]!;
            let sum = 0;
            let count = 0;
            for (const m1 of ci.members) {
              for (const m2 of cj.members) {
                const mi = labels.indexOf(m1.replace('node-', ''));
                const mj = labels.indexOf(m2.replace('node-', ''));
                if (mi >= 0 && mj >= 0) {
                  sum += matrix[mi]![mj]!;
                  count++;
                }
              }
            }
            row.push(count === 0 ? 0 : sum / count);
          }
        }
        newMatrix.push(row);
      }
      matrixCopy = newMatrix;
    }
    const tree: PhyloTree = {
      nodes,
      root: clusters[0]?.label ?? '',
      totalBranchLength: Array.from(nodes.values()).reduce((s, n) => s + n.branchLength, 0),
      tips: Array.from(nodes.values()).filter(n => n.taxon !== null).length,
    };
    this._trees.push(tree);
    this._history.push({ method: 'upgma' });
    return tree;
  }

  /** Compute neighbor-joining (very simplified). */
  neighborJoining(labels: string[], matrix: number[][]): PhyloTree {
    // Simplified - same as UPGMA for demo purposes
    return this.upgma(labels, matrix);
  }

  /** Compute the Q matrix for neighbor joining (row sums used). */
  qMatrix(matrix: number[][], n: number): number[][] {
    const rowSums = matrix.map(row => row.reduce((s, v) => s + v, 0));
    const q: number[][] = [];
    for (let i = 0; i < n; i++) {
      const row: number[] = [];
      for (let j = 0; j < n; j++) {
        if (i === j) row.push(0);
        else row.push((n - 2) * matrix[i]![j]! - rowSums[i]! - rowSums[j]!);
      }
      q.push(row);
    }
    return q;
  }

  /** Coalescence time for k lineages with effective population size Ne. */
  coalescenceTime(k: number, Ne: number): number {
    if (k <= 1) return 0;
    return (2 * Ne) / (k * (k - 1));
  }

  /** Full coalescence simulation for two lineages (mean tMRCA = 2Ne). */
  coalescence(Ne: number, lineages: number): Coalescence {
    const tMRCA = 2 * Ne;
    const theta = 4 * Ne * 1e-9 * 1e6; // simplified theta = 4Ne*u*L
    const result: Coalescence = {
      mrca: 1,
      tMRCA,
      theta,
      lineages,
    };
    this._coalescences.push(result);
    this._history.push({ method: 'coalescence' });
    return result;
  }

  /** Tajima's D test for neutrality. */
  tajimaD(segregatingSites: number, pairwiseDifferences: number, sampleSize: number): number {
    const n = sampleSize;
    const a1 = this._tajimaA1(n);
    const a2 = this._tajimaA2(n);
    const S = segregatingSites;
    const thetaW = S / a1;
    const thetaPi = pairwiseDifferences * 2 / (n * (n - 1));
    const b1 = (n + 1) / (3 * (n - 1) * a1) - 1 / (a1 * a1);
    const b2 = 2 * (n * n + n + 3) / (9 * n * (n - 1)) - (n + 2) / (n * a1) + a2 / (a1 * a1);
    const c1 = b1 / S;
    const c2 = b2 / (S * (S - 1));
    const denom = Math.sqrt(c1 * S + c2 * S * (S - 1));
    if (denom === 0) return 0;
    return (thetaPi - thetaW) / denom;
  }

  private _tajimaA1(n: number): number {
    let sum = 0;
    for (let i = 1; i < n; i++) sum += 1 / i;
    return sum;
  }

  private _tajimaA2(n: number): number {
    let sum = 0;
    for (let i = 1; i < n; i++) sum += 1 / (i * i);
    return sum;
  }

  /** Compute fixation probability under selection (Kimura). */
  fixationProbability(s: number, Ne: number): number {
    if (Math.abs(s) < 1e-12) return 1 / (2 * Ne);
    const p0 = 1 / (2 * Ne);
    const num = 1 - Math.exp(-2 * s * p0);
    const den = 1 - Math.exp(-2 * s);
    if (den === 0) return p0;
    return num / den;
  }

  /** Time to fixation of an allele (deterministic approximation). */
  timeToFixation(Ne: number, p0: number): number {
    if (p0 <= 0 || p0 >= 1) return 0;
    return -4 * Ne * Math.log(p0) * Math.log(1 - p0);
  }

  /** Mutation-selection balance for a deleterious recessive allele. */
  mutationSelectionBalance(mu: number, s: number): number {
    if (s <= 0) return 0;
    return Math.sqrt(mu / s);
  }

  /** Mutation-selection balance for a deleterious dominant allele. */
  mutationSelectionBalanceDominant(mu: number, s: number): number {
    if (s <= 0) return 0;
    return mu / s;
  }

  /** Compute inbreeding effective population size. */
  inbreedingEffectiveSize(Nm: number, Nf: number): number {
    if (Nm + Nf === 0) return 0;
    return (4 * Nm * Nf) / (Nm + Nf);
  }

  /** Variance effective population size. */
  varianceEffectiveSize(deltaP: number[], generations: number): number {
    if (deltaP.length < 2) return 0;
    let variance = 0;
    for (const d of deltaP) variance += d * d;
    variance /= deltaP.length;
    if (variance === 0) return Infinity;
    const pBar = deltaP.reduce((s, p) => s + p, 0) / deltaP.length;
    return pBar * (1 - pBar) / (2 * variance * generations);
  }

  /** Compute Price equation components (selection covariance). */
  priceEquation(
    population: Array<{ genotype: string; fitness: number; trait: number }>,
  ): { covariance: number; expectedOffspringTrait: number; response: number } {
    const n = population.length;
    if (n === 0) return { covariance: 0, expectedOffspringTrait: 0, response: 0 };
    const meanFitness = population.reduce((s, p) => s + p.fitness, 0) / n;
    const meanTrait = population.reduce((s, p) => s + p.trait, 0) / n;
    let cov = 0;
    for (const p of population) {
      cov += (p.fitness - meanFitness) * (p.trait - meanTrait);
    }
    cov /= n;
    const response = meanFitness === 0 ? 0 : cov / meanFitness;
    return {
      covariance: cov,
      expectedOffspringTrait: meanTrait + response,
      response,
    };
  }

  /** Hamilton's rule for kin selection: rB > C. */
  hamiltonRule(relatedness: number, benefit: number, cost: number): { satisfies: boolean; net: number } {
    const net = relatedness * benefit - cost;
    return { satisfies: net > 0, net };
  }

  /** Compute heterozygosity after t generations with effective size Ne. */
  heterozygosityOverTime(H0: number, Ne: number, t: number): number {
    return H0 * Math.pow(1 - 1 / (2 * Ne), t);
  }

  /** Allele diversity from allele frequencies. */
  alleleDiversity(frequencies: number[]): number {
    let h = 0;
    for (const f of frequencies) {
      if (f > 0) h -= f * Math.log(f);
    }
    return Math.exp(h);
  }

  /** Simpson's diversity index for species abundance. */
  simpsonsDiversity(abundances: number[]): number {
    const total = abundances.reduce((s, a) => s + a, 0);
    if (total === 0) return 0;
    let sumSq = 0;
    for (const a of abundances) sumSq += (a / total) * (a / total);
    return 1 - sumSq;
  }

  /** Shannon diversity index. */
  shannonDiversity(abundances: number[]): number {
    const total = abundances.reduce((s, a) => s + a, 0);
    if (total === 0) return 0;
    let h = 0;
    for (const a of abundances) {
      const p = a / total;
      if (p > 0) h -= p * Math.log(p);
    }
    return h;
  }

  /** Evenness (Pielou) index. */
  pielouEvenness(abundances: number[]): number {
    const S = abundances.filter(a => a > 0).length;
    if (S <= 1) return 0;
    return this.shannonDiversity(abundances) / Math.log(S);
  }

  /** Estimate the per-generation rate of allele frequency change under selection. */
  alleleFrequencyChange(p: number, w11: number, w12: number, w22: number): number {
    const q = 1 - p;
    const wBar = p * p * w11 + 2 * p * q * w12 + q * q * w22;
    if (wBar === 0) return 0;
    const newP = (p * p * w11 + p * q * w12) / wBar;
    return newP - p;
  }

  /** Compute inbreeding coefficient from heterozygosity loss. */
  inbreedingFromHeterozygosity(Hobs: number, Hexp: number): number {
    if (Hexp === 0) return 0;
    return 1 - Hobs / Hexp;
  }

  /** Compute the Fst between two populations. */
  fst(p1: number, p2: number): number {
    const pBar = (p1 + p2) / 2;
    const Ht = 2 * pBar * (1 - pBar);
    const Hs = 0.5 * (2 * p1 * (1 - p1) + 2 * p2 * (1 - p2));
    if (Ht === 0) return 0;
    return (Ht - Hs) / Ht;
  }

  /** Compute Haldane's sieve (probability of fixation of dominant vs recessive). */
  haldaneSieve(s: number, p: number, dominance: 'dominant' | 'recessive'): number {
    if (Math.abs(s) < 1e-12) return p;
    if (dominance === 'dominant') {
      return 2 * s * p / (1 - Math.exp(-2 * s));
    }
    return 2 * s * p * (1 - p) / (1 - Math.exp(-2 * s * (1 - p)));
  }

  /** Compute adaptive radiation rate (number of new species per unit time). */
  adaptiveRadiation(initialSpecies: number, currentSpecies: number, time: number): number {
    if (time === 0) return 0;
    return (currentSpecies - initialSpecies) / time;
  }

  /** Punctuated equilibrium vs gradualism classification. */
  equilibriumMode(speciationEvents: Array<{ duration: number; rapid: boolean }>): {
    mode: 'punctuated' | 'gradual' | 'mixed';
    rapidEvents: number;
  } {
    const rapid = speciationEvents.filter(e => e.rapid).length;
    const slow = speciationEvents.length - rapid;
    let mode: 'punctuated' | 'gradual' | 'mixed' = 'mixed';
    if (rapid > slow * 2) mode = 'punctuated';
    else if (slow > rapid * 2) mode = 'gradual';
    return { mode, rapidEvents: rapid };
  }

  /** Taxonomic classification lookup. */
  classify(species: string): Taxon | null {
    return this._taxa.get(species) ?? null;
  }

  /** Add a taxon. */
  addTaxon(taxon: Taxon): void {
    this._taxa.set(taxon.species, taxon);
    this._history.push({ method: 'addTaxon', species: taxon.species });
  }

  /** Compute Red Queen hypothesis dynamic (evolution of interacting species). */
  redQueen(pop1: number, pop2: number, generations: number): Array<{ gen: number; p1: number; p2: number }> {
    const trajectory: Array<{ gen: number; p1: number; p2: number }> = [];
    let p1 = pop1;
    let p2 = pop2;
    for (let g = 0; g < generations; g++) {
      p1 = Math.max(0, Math.min(1, p1 + (p2 - 0.5) * 0.1));
      p2 = Math.max(0, Math.min(1, p2 + (p1 - 0.5) * 0.1));
      trajectory.push({ gen: g, p1, p2 });
    }
    return trajectory;
  }

  /** Compute Bergmann's rule (body size vs latitude). */
  bergmannsRule(latitude: number): { expectedMass: number; description: string } {
    const mass = 100 * Math.pow(Math.abs(latitude) / 90, 1.5);
    return {
      expectedMass: mass,
      description: latitude === 0 ? 'tropical (smaller)' : 'temperate/polar (larger)',
    };
  }

  /** Compute Allen's rule (appendage size vs climate). */
  allensRule(temperature: number): { appendageRatio: number; description: string } {
    const ratio = 0.5 + (temperature - 20) * 0.02;
    return {
      appendageRatio: Math.max(0.2, Math.min(1.0, ratio)),
      description: temperature > 20 ? 'longer appendages (warm)' : 'shorter appendages (cold)',
    };
  }

  /** Compute Dollo's law (irreversibility of evolution). */
  dollosLaw(traitLost: string, generations: number): { reversible: boolean; probability: number } {
    void traitLost;
    return {
      reversible: false,
      probability: Math.pow(0.01, generations),
    };
  }

  /** Cope's rule (body size tends to increase over evolutionary time). */
  copesRule(initialMass: number, generations: number): number {
    return initialMass * Math.pow(1.001, generations);
  }

  /** Rensch's rule (sexual size dimorphism scales with body size). */
  renschRule(maleSize: number, femaleSize: number): { ratio: number; description: string } {
    const ratio = maleSize / femaleSize;
    return {
      ratio,
      description: ratio > 1 ? 'male-biased dimorphism' : ratio < 1 ? 'female-biased dimorphism' : 'monomorphic',
    };
  }

  /** Build a simple phylogenetic tree from a distance matrix. */
  buildPhylogeny(labels: string[], distances: number[][]): PhyloTree {
    return this.upgma(labels, distances);
  }

  /** Compute the time since most recent common ancestor (TMRCA). */
  tmrca(Ne: number, sampleSize: number): number {
    // Coalescent: E[T_MRCA] = 2Ne * (1 - 1/n) for n samples (under neutral coalescent)
    if (sampleSize <= 1) return 0;
    return 2 * Ne * (1 - 1 / sampleSize);
  }

  /** Compute the probability of identity by descent (IBD). */
  identityByDescent(Ne: number, generations: number): number {
    return Math.pow(1 - 1 / (2 * Ne), generations);
  }

  /** Compute effective number of species from abundance data. */
  effectiveSpeciesNumber(abundances: number[]): number {
    const simpson = this.simpsonsDiversity(abundances);
    return 1 / (1 - simpson);
  }

  /** Compute the relative rate test (Sarich-Wilson). */
  relativeRateTest(d1: number, d2: number, dOutgroup: number): { equal: boolean; t1: number; t2: number } {
    const t1 = (d1 + dOutgroup - d2) / 2;
    const t2 = (d2 + dOutgroup - d1) / 2;
    return { equal: Math.abs(t1 - t2) < 0.1, t1, t2 };
  }

  /** Estimate the most recent common ancestor (MRCA) for k samples. */
  mrca(k: number, Ne: number): number {
    if (k <= 1) return 0;
    let sum = 0;
    for (let i = 1; i < k; i++) {
      sum += 1 / (i * (i + 1));
    }
    return 2 * Ne * sum;
  }

  /** Compute the difference between observed and expected heterozygosity. */
  heterozygosityDeficit(Hobs: number, Hexp: number): number {
    if (Hexp === 0) return 0;
    return (Hexp - Hobs) / Hexp;
  }

  /** Compute the time since a bottleneck from heterozygosity excess. */
  bottleneckTime(Hcurrent: number, Hexpected: number, Ne: number): number {
    if (Hexpected === 0 || Hcurrent >= Hexpected) return 0;
    const ratio = Hcurrent / Hexpected;
    return -2 * Ne * Math.log(ratio);
  }

  /** Compute Markov chain stationary distribution for a 2-allele system. */
  stationaryDistribution(matrix: number[][]): number[] {
    // Simple iterative method
    let pi = [0.5, 0.5];
    for (let iter = 0; iter < 1000; iter++) {
      const newPi = [0, 0];
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          newPi[i]! += pi[j]! * (matrix[j]?.[i] ?? 0);
        }
      }
      const sum = newPi[0]! + newPi[1]!;
      if (sum > 0) {
        newPi[0] = newPi[0]! / sum;
        newPi[1] = newPi[1]! / sum;
      }
      if (Math.abs(newPi[0]! - pi[0]!) < 1e-9) break;
      pi = newPi;
    }
    return pi;
  }

  /** Compute the effective migration rate given Fst. */
  effectiveMigration(fst: number): number {
    if (fst >= 1) return 0;
    if (fst <= 0) return Infinity;
    return (1 - fst) / (4 * fst);
  }

  /** Compute speciation rate (per million years). */
  speciationRate(speciesNow: number, speciesThen: number, timeMa: number): number {
    if (timeMa === 0) return 0;
    return Math.log(speciesNow / Math.max(1, speciesThen)) / timeMa;
  }

  /** Compute extinction rate (per million years). */
  extinctionRate(extinctions: number, totalSpecies: number, timeMa: number): number {
    if (timeMa === 0 || totalSpecies === 0) return 0;
    return extinctions / (totalSpecies * timeMa);
  }

  /** Compute net diversification rate. */
  netDiversification(speciationRate: number, extinctionRate: number): number {
    return speciationRate - extinctionRate;
  }

  /** Apply r- and K-selection theory. */
  rKSelection(environment: 'stable' | 'unstable'): {
    type: 'r' | 'K';
    traits: string[];
  } {
    if (environment === 'unstable') {
      return {
        type: 'r',
        traits: ['small size', 'early maturity', 'many offspring', 'low parental care', 'short lifespan'],
      };
    }
    return {
      type: 'K',
      traits: ['large size', 'late maturity', 'few offspring', 'high parental care', 'long lifespan'],
    };
  }

  /** Compute allometric scaling (Kleiber's law: metabolic rate ~ M^0.75). */
  allometry(mass: number, exponent: number = 0.75): number {
    return Math.pow(mass, exponent);
  }

  /** Compute the species-area relationship (S = c * A^z). */
  speciesArea(area: number, c: number = 1, z: number = 0.25): number {
    return c * Math.pow(area, z);
  }

  /** Estimate generation time from life-history traits. */
  generationTime(ageAtMaturity: number, reproductiveLifespan: number): number {
    return ageAtMaturity + reproductiveLifespan / 2;
  }

  /** Compute the Gompertz mortality curve. */
  gompertzMortality(age: number, alpha: number, beta: number): number {
    return alpha * Math.exp(beta * age);
  }

  toPacket(): DataPacket<{
    populations: Population[];
    selections: Selection[];
    speciations: Speciation[];
    fitnessLandscapes: FitnessLandscape[];
    trees: PhyloTree[];
    molecularClocks: MolecularClock[];
    coalescences: Coalescence[];
    taxa: Map<string, Taxon>;
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['biology', 'Evolution'],
      priority: 1,
      phase: 'biology:evolution',
    };
    return {
      id: `evo-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        populations: this._populations,
        selections: this._selections,
        speciations: this._speciations,
        fitnessLandscapes: this._fitnessLandscapes,
        trees: this._trees,
        molecularClocks: this._molecularClocks,
        coalescences: this._coalescences,
        taxa: this._taxa,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._populations = [];
    this._selections = [];
    this._speciations = [];
    this._fitnessLandscapes = [];
    this._trees = [];
    this._molecularClocks = [];
    this._coalescences = [];
    this._taxa = new Map();
    this._history = [];
    this._counter = 0;
    this._seedTaxa();
  }

  get populationCount(): number {
    return this._populations.length;
  }

  get selectionCount(): number {
    return this._selections.length;
  }

  get speciationCount(): number {
    return this._speciations.length;
  }

  get historyDepth(): number {
    return this._history.length;
  }

  get treeCount(): number {
    return this._trees.length;
  }

  get molecularClockCount(): number {
    return this._molecularClocks.length;
  }

  get coalescenceCount(): number {
    return this._coalescences.length;
  }

  get taxonCount(): number {
    return this._taxa.size;
  }
}
