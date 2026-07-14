export interface Chromosome {
  id: string;
  segments: string[];
  origin: string;
  fitness: number;
}

export interface CrossoverResult {
  id: string;
  parentA: string;
  parentB: string;
  childSegments: string[];
  crossoverPoints: number[];
  recombinationFraction: number;
  childFitness: number;
  createdAt: number;
}

export class ChromosomalCrossOver {
  private _chromosomes: Map<string, Chromosome> = new Map();
  private _results: CrossoverResult[] = [];
  private _maxCrossovers: number = 3;
  private _maxResults: number = 200;
  private _linkageMap: Map<string, number> = new Map();

  registerChromosome(chromosome: Chromosome): void {
    this._chromosomes.set(chromosome.id, chromosome);
  }

  crossover(parentAId: string, parentBId: string): CrossoverResult | null {
    const parentA = this._chromosomes.get(parentAId);
    const parentB = this._chromosomes.get(parentBId);
    if (!parentA || !parentB) return null;
    const minLen = Math.min(parentA.segments.length, parentB.segments.length);
    if (minLen < 2) return null;
    const crossoverPoints = this._generateCrossoverPoints(minLen);
    const { childSegments, switches } = this._recombine(parentA, parentB, crossoverPoints);
    const recombinationFraction = switches / Math.max(minLen - 1, 1);
    const childFitness = this._computeChildFitness(parentA, parentB, childSegments);
    const result: CrossoverResult = {
      id: `cross-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      parentA: parentAId,
      parentB: parentBId,
      childSegments,
      crossoverPoints,
      recombinationFraction,
      childFitness,
      createdAt: Date.now(),
    };
    this._results.push(result);
    this._updateLinkage(crossoverPoints);
    if (this._results.length > this._maxResults) this._results.shift();
    return result;
  }

  setCrossoverCount(n: number): void {
    this._maxCrossovers = Math.max(1, n);
  }

  measureDiversity(resultId: string): number {
    const result = this._results.find((r) => r.id === resultId);
    if (!result) return 0;
    const unique = new Set(result.childSegments);
    return unique.size / Math.max(result.childSegments.length, 1);
  }

  computeHaldaneMapDistance(resultId: string): number {
    const result = this._results.find((r) => r.id === resultId);
    if (!result) return 0;
    const r = result.recombinationFraction;
    if (r >= 0.5) return 50;
    return -50 * Math.log(1 - 2 * r) / 2;
  }

  computeAverageRecombination(): number {
    if (this._results.length === 0) return 0;
    const sum = this._results.reduce((s, r) => s + r.recombinationFraction, 0);
    return sum / this._results.length;
  }

  computeFitnessVariance(): number {
    if (this._results.length === 0) return 0;
    const fitnesses = this._results.map((r) => r.childFitness);
    const mean = fitnesses.reduce((s, f) => s + f, 0) / fitnesses.length;
    const variance = fitnesses.reduce((s, f) => s + (f - mean) ** 2, 0) / fitnesses.length;
    return variance;
  }

  detectHeterosis(parentAId: string, parentBId: string): number {
    const parentA = this._chromosomes.get(parentAId);
    const parentB = this._chromosomes.get(parentBId);
    if (!parentA || !parentB) return 0;
    const midParentFitness = (parentA.fitness + parentB.fitness) / 2;
    const childResults = this._results.filter(
      (r) => r.parentA === parentAId && r.parentB === parentBId
    );
    if (childResults.length === 0) return 0;
    const avgChildFitness = childResults.reduce((s, r) => s + r.childFitness, 0) / childResults.length;
    return avgChildFitness - midParentFitness;
  }

  getChromosome(id: string): Chromosome | null {
    return this._chromosomes.get(id) ?? null;
  }

  getResults(limit: number = 50): CrossoverResult[] {
    return this._results.slice(-limit);
  }

  get chromosomeCount(): number {
    return this._chromosomes.size;
  }

  private _generateCrossoverPoints(minLen: number): number[] {
    const points: number[] = [];
    const count = Math.min(this._maxCrossovers, minLen - 1);
    for (let i = 0; i < count; i++) {
      points.push(1 + Math.floor(Math.random() * (minLen - 1)));
    }
    return [...new Set(points)].sort((a, b) => a - b);
  }

  private _recombine(parentA: Chromosome, parentB: Chromosome, points: number[]): { childSegments: string[]; switches: number } {
    const childSegments: string[] = [];
    let useA = Math.random() < 0.5;
    let lastPoint = 0;
    let switches = 0;
    for (const point of points) {
      const source = useA ? parentA : parentB;
      childSegments.push(...source.segments.slice(lastPoint, point));
      useA = !useA;
      lastPoint = point;
      switches++;
    }
    const tailSource = useA ? parentA : parentB;
    childSegments.push(...tailSource.segments.slice(lastPoint));
    return { childSegments, switches };
  }

  private _computeChildFitness(parentA: Chromosome, parentB: Chromosome, childSegments: string[]): number {
    const uniqueRatio = new Set(childSegments).size / Math.max(childSegments.length, 1);
    const avgParent = (parentA.fitness + parentB.fitness) / 2;
    const heterosisBonus = uniqueRatio > 0.5 ? 0.1 * (uniqueRatio - 0.5) : 0;
    return Math.max(0, Math.min(1, avgParent + heterosisBonus + (Math.random() - 0.5) * 0.05));
  }

  private _updateLinkage(points: number[]): void {
    for (const p of points) {
      this._linkageMap.set(`${p}`, (this._linkageMap.get(`${p}`) ?? 0) + 1);
    }
  }
}
