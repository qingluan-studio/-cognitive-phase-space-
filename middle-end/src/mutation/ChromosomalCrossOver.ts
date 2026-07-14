/**
 * 染色体交叉：模块间交换大段代码。
 * 两个父模块在交叉点进行大段代码交换，产生包含双方片段的子代。
 */

export interface Chromosome {
  id: string;
  segments: string[];
  origin: string;
}

export interface CrossoverResult {
  id: string;
  parentA: string;
  parentB: string;
  childSegments: string[];
  crossoverPoints: number[];
  createdAt: number;
}

export class ChromosomalCrossOver {
  private _chromosomes: Map<string, Chromosome> = new Map();
  private _results: CrossoverResult[] = [];
  private _maxCrossovers = 3;
  private _maxResults = 200;

  registerChromosome(chromosome: Chromosome): void {
    this._chromosomes.set(chromosome.id, chromosome);
  }

  crossover(parentAId: string, parentBId: string): CrossoverResult | null {
    const parentA = this._chromosomes.get(parentAId);
    const parentB = this._chromosomes.get(parentBId);
    if (!parentA || !parentB) return null;
    const minLen = Math.min(parentA.segments.length, parentB.segments.length);
    if (minLen < 2) return null;
    const crossoverPoints: number[] = [];
    for (let i = 0; i < this._maxCrossovers; i++) {
      crossoverPoints.push(1 + Math.floor(Math.random() * (minLen - 1)));
    }
    crossoverPoints.sort((a, b) => a - b);
    const childSegments: string[] = [];
    let useA = Math.random() < 0.5;
    let lastPoint = 0;
    for (const point of crossoverPoints) {
      const source = useA ? parentA : parentB;
      childSegments.push(...source.segments.slice(lastPoint, point));
      useA = !useA;
      lastPoint = point;
    }
    const tailSource = useA ? parentA : parentB;
    childSegments.push(...tailSource.segments.slice(lastPoint));
    const result: CrossoverResult = {
      id: `cross-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      parentA: parentAId,
      parentB: parentBId,
      childSegments,
      crossoverPoints,
      createdAt: Date.now(),
    };
    this._results.push(result);
    if (this._results.length > this._maxResults) this._results.shift();
    return result;
  }

  setCrossoverCount(n: number): void {
    this._maxCrossovers = Math.max(1, n);
  }

  measureDiversity(resultId: string): number {
    const result = this._results.find(r => r.id === resultId);
    if (!result) return 0;
    const unique = new Set(result.childSegments);
    return unique.size / Math.max(result.childSegments.length, 1);
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
}
