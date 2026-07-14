export interface TuberNode {
  id: string;
  parentId: string | null;
  fitness: number;
  generation: number;
  mutationRate: number;
  genotype: number[];
  phenotype: Record<string, number>;
}

export interface PropagationResult {
  parentId: string;
  childId: string;
  mutations: number;
  fitnessDelta: number;
  hammingDistance: number;
  levenshteinDistance: number;
  geneticDrift: number;
}

export class TuberPropagation {
  private _nodes: Map<string, TuberNode> = new Map();
  private _results: PropagationResult[] = [];
  private _state: Record<string, unknown> = {};
  private _fitnessLandscape: Map<string, number> = new Map();
  private _generationStats: Map<number, { avgFitness: number; variance: number; entropy: number }> = new Map();

  constructor() {}

  get nodeCount(): number {
    return this._nodes.size;
  }

  get rootCount(): number {
    return Array.from(this._nodes.values()).filter((n) => n.parentId === null).length;
  }

  plantRoot(id: string, genotype: number[], fitness: number): TuberNode {
    const node: TuberNode = {
      id,
      parentId: null,
      fitness,
      generation: 0,
      mutationRate: 0.01,
      genotype: [...genotype],
      phenotype: this._computePhenotype(genotype),
    };
    this._nodes.set(id, node);
    this._fitnessLandscape.set(id, fitness);
    return node;
  }

  propagate(parentId: string, childId: string): PropagationResult | null {
    const parent = this._nodes.get(parentId);
    if (!parent) return null;
    const mutations = Math.floor(Math.random() * 3);
    const childGenotype = [...parent.genotype];
    for (let i = 0; i < mutations; i++) {
      const idx = Math.floor(Math.random() * childGenotype.length);
      childGenotype[idx] += (Math.random() - 0.5) * 2;
    }
    const drift = (Math.random() - 0.5) * parent.mutationRate;
    const childFitness = Math.max(0, parent.fitness + drift);
    const node: TuberNode = {
      id: childId,
      parentId,
      fitness: childFitness,
      generation: parent.generation + 1,
      mutationRate: Math.max(0.001, parent.mutationRate + (Math.random() - 0.5) * 0.005),
      genotype: childGenotype,
      phenotype: this._computePhenotype(childGenotype),
    };
    this._nodes.set(childId, node);
    this._fitnessLandscape.set(childId, childFitness);
    const hamming = this._hammingDistance(parent.genotype, childGenotype);
    const levenshtein = this._levenshteinDistance(parent.genotype, childGenotype);
    const result: PropagationResult = {
      parentId,
      childId,
      mutations,
      fitnessDelta: childFitness - parent.fitness,
      hammingDistance: hamming,
      levenshteinDistance: levenshtein,
      geneticDrift: drift,
    };
    this._results.push(result);
    if (this._results.length > 100) this._results.shift();
    this._updateGenerationStats(node.generation);
    return result;
  }

  private _computePhenotype(genotype: number[]): Record<string, number> {
    const sum = genotype.reduce((s, v) => s + v, 0);
    const mean = sum / (genotype.length || 1);
    const variance = genotype.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (genotype.length || 1);
    return { mean, variance, magnitude: Math.sqrt(sum * sum) };
  }

  private _hammingDistance(a: number[], b: number[]): number {
    let diff = 0;
    const len = Math.max(a.length, b.length);
    for (let i = 0; i < len; i++) {
      if ((a[i] ?? 0) !== (b[i] ?? 0)) diff++;
    }
    return diff;
  }

  private _levenshteinDistance(a: number[], b: number[]): number {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      }
    }
    return dp[m][n];
  }

  private _updateGenerationStats(gen: number): void {
    const nodes = Array.from(this._nodes.values()).filter((n) => n.generation === gen);
    if (nodes.length === 0) return;
    const fitnesses = nodes.map((n) => n.fitness);
    const avg = fitnesses.reduce((s, v) => s + v, 0) / fitnesses.length;
    const variance = fitnesses.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / fitnesses.length;
    const total = fitnesses.reduce((s, v) => s + v, 0);
    const entropy = -fitnesses.reduce((s, v) => {
      const p = v / total;
      return p > 0 ? s + p * Math.log2(p) : s;
    }, 0);
    this._generationStats.set(gen, { avgFitness: avg, variance, entropy });
  }

  lineage(id: string): TuberNode[] {
    const path: TuberNode[] = [];
    let curr: string | null = id;
    while (curr) {
      const node = this._nodes.get(curr);
      if (!node) break;
      path.unshift(node);
      curr = node.parentId;
    }
    return path;
  }

  fittest(): TuberNode | null {
    if (this._nodes.size === 0) return null;
    return Array.from(this._nodes.values()).reduce((best, n) => (n.fitness > best.fitness ? n : best));
  }

  averageFitness(): number {
    if (this._nodes.size === 0) return 0;
    return Array.from(this._nodes.values()).reduce((s, n) => s + n.fitness, 0) / this._nodes.size;
  }

  fitnessVariance(): number {
    const avg = this.averageFitness();
    if (this._nodes.size === 0) return 0;
    return Array.from(this._nodes.values()).reduce((s, n) => s + Math.pow(n.fitness - avg, 2), 0) / this._nodes.size;
  }

  geneticDiversity(): number {
    const nodes = Array.from(this._nodes.values());
    if (nodes.length < 2) return 0;
    let totalDist = 0;
    let pairs = 0;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        totalDist += this._hammingDistance(nodes[i].genotype, nodes[j].genotype);
        pairs++;
      }
    }
    return pairs > 0 ? totalDist / pairs : 0;
  }

  report(): Record<string, unknown> {
    return {
      nodes: this._nodes.size,
      roots: this.rootCount,
      generations: this._generationStats.size,
      avgFitness: this.averageFitness(),
      variance: this.fitnessVariance(),
      diversity: this.geneticDiversity(),
      state: this._state,
    };
  }
}
