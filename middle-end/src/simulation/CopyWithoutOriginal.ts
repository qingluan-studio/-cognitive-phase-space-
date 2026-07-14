export interface SimulacrumCopy {
  id: string;
  generation: number;
  fidelity: number;
  mutations: number;
}

export type CopyLineage = {
  rootId: string;
  depth: number;
  divergence: number;
};

export interface CopyConfig {
  mutationRate: number;
  maxGenerations: number;
  fidelityThreshold: number;
}

export class CopyWithoutOriginal {
  private _config: CopyConfig;
  private _copies: SimulacrumCopy[] = [];
  private _lineages: CopyLineage[] = [];
  private _state: Record<string, unknown> = {};
  private _hammingDistances: number[] = [];
  private _phylogeneticTree: Map<string, string[]> = new Map();
  private _informationEntropy: number = 0;

  constructor(config: CopyConfig) {
    this._config = config;
  }

  get copyCount(): number {
    return this._copies.length;
  }

  get averageFidelity(): number {
    if (this._copies.length === 0) return 0;
    return this._copies.reduce((acc, c) => acc + c.fidelity, 0) / this._copies.length;
  }

  get informationEntropy(): number {
    return this._informationEntropy;
  }

  private _computeHamming(a: SimulacrumCopy, b: SimulacrumCopy): number {
    return Math.abs(a.generation - b.generation) + Math.abs(a.mutations - b.mutations);
  }

  private _updatePhylogeny(parentId: string, childId: string): void {
    if (!this._phylogeneticTree.has(parentId)) {
      this._phylogeneticTree.set(parentId, []);
    }
    this._phylogeneticTree.get(parentId)!.push(childId);
  }

  private _computeEntropy(): void {
    const generationCounts: Record<number, number> = {};
    for (const c of this._copies) {
      generationCounts[c.generation] = (generationCounts[c.generation] || 0) + 1;
    }
    const total = this._copies.length;
    let entropy = 0;
    for (const key of Object.keys(generationCounts)) {
      const p = generationCounts[parseInt(key)] / total;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    this._informationEntropy = entropy;
  }

  createOriginal(): SimulacrumCopy {
    const copy: SimulacrumCopy = { id: `gen-0`, generation: 0, fidelity: 1, mutations: 0 };
    this._copies.push(copy);
    this._phylogeneticTree.set(copy.id, []);
    this._computeEntropy();
    return copy;
  }

  reproduce(parentId: string): SimulacrumCopy | null {
    const parent = this._copies.find((c) => c.id === parentId);
    if (!parent || parent.generation >= this._config.maxGenerations) return null;
    const mutated = Math.random() < this._config.mutationRate;
    const fidelity = mutated ? Math.max(0, parent.fidelity - 0.1) : parent.fidelity;
    const mutations = mutated ? parent.mutations + 1 : parent.mutations;
    const copy: SimulacrumCopy = {
      id: `${parentId}-${this._copies.length}`,
      generation: parent.generation + 1,
      fidelity,
      mutations,
    };
    this._copies.push(copy);
    this._updatePhylogeny(parentId, copy.id);
    if (this._copies.length > 40) this._copies.shift();
    for (const other of this._copies) {
      if (other.id !== copy.id) {
        this._hammingDistances.push(this._computeHamming(copy, other));
      }
    }
    if (this._hammingDistances.length > 100) this._hammingDistances.splice(0, this._hammingDistances.length - 100);
    this._computeEntropy();
    return copy;
  }

  computeLineage(copyId: string): CopyLineage {
    const copy = this._copies.find((c) => c.id === copyId);
    if (!copy) return { rootId: '', depth: 0, divergence: 0 };
    const rootId = copy.id.split('-')[0];
    const depth = copy.generation;
    const avgHamming = this._hammingDistances.length > 0
      ? this._hammingDistances.reduce((a, b) => a + b, 0) / this._hammingDistances.length
      : 0;
    const lineage: CopyLineage = { rootId, depth, divergence: avgHamming };
    this._lineages.push(lineage);
    if (this._lineages.length > 20) this._lineages.shift();
    return lineage;
  }

  hasOriginal(): boolean {
    return this._copies.some((c) => c.generation === 0 && c.mutations === 0);
  }

  pureCopies(): SimulacrumCopy[] {
    return this._copies.filter((c) => c.mutations === 0);
  }

  averageDivergence(): number {
    if (this._hammingDistances.length === 0) return 0;
    return this._hammingDistances.reduce((a, b) => a + b, 0) / this._hammingDistances.length;
  }

  treeDepth(): number {
    return this._copies.reduce((max, c) => (c.generation > max ? c.generation : max), 0);
  }

  reset(): void {
    this._copies = [];
    this._lineages = [];
    this._hammingDistances = [];
    this._phylogeneticTree.clear();
    this._informationEntropy = 0;
    this._state = {};
  }

  report(): Record<string, unknown> {
    return {
      copies: this._copies.length,
      averageFidelity: this.averageFidelity.toFixed(4),
      lineages: this._lineages.length,
      hasOriginal: this.hasOriginal(),
      state: this._state,
      informationEntropy: this._informationEntropy.toFixed(4),
      averageDivergence: this.averageDivergence().toFixed(4),
    };
  }
}
