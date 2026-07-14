/**
 * 轭式连接器模块：一个操作同时驾驭两个不同维度的数据，
 * 产生双关语义效应，使单次处理同时服务于多个目标。
 */

export interface ZeugmaDimension {
  id: string;
  label: string;
  data: Record<string, unknown>;
  transform: (input: Record<string, unknown>) => Record<string, unknown>;
}

export interface ZeugmaResult {
  dimensionIds: string[];
  sharedOperation: string;
  outputs: Record<string, Record<string, unknown>>;
  dualPunScore: number;
}

export class ZeugmaJoiner {
  private _dimensions: Map<string, ZeugmaDimension> = new Map();
  private _results: ZeugmaResult[] = [];
  private _joinedPairs: Array<[string, string]> = [];

  registerDimension(dim: ZeugmaDimension): void {
    this._dimensions.set(dim.id, dim);
  }

  join(idA: string, idB: string, operationName = 'dual-apply'): ZeugmaResult | undefined {
    const dimA = this._dimensions.get(idA);
    const dimB = this._dimensions.get(idB);
    if (!dimA || !dimB) return undefined;

    const outA = dimA.transform({ ...dimA.data, ...dimB.data });
    const outB = dimB.transform({ ...dimB.data, ...dimA.data });

    const punScore = this._computePunScore(outA, outB);

    const result: ZeugmaResult = {
      dimensionIds: [idA, idB],
      sharedOperation: operationName,
      outputs: { [idA]: outA, [idB]: outB },
      dualPunScore: punScore,
    };
    this._results.push(result);
    this._joinedPairs.push([idA, idB]);
    return result;
  }

  private _computePunScore(a: Record<string, unknown>, b: Record<string, unknown>): number {
    const keysA = new Set(Object.keys(a));
    const keysB = new Set(Object.keys(b));
    const shared = new Set([...keysA].filter(k => keysB.has(k)));
    const union = new Set([...keysA, ...keysB]);
    return union.size === 0 ? 0 : shared.size / union.size;
  }

  batchJoin(pairs: Array<[string, string]>): ZeugmaResult[] {
    return pairs.map(([a, b]) => this.join(a, b)!).filter(Boolean);
  }

  pivotJoin(dimensionId: string, others: string[]): ZeugmaResult[] {
    return others.map(o => this.join(dimensionId, o)!).filter(Boolean);
  }

  averagePunScore(): number {
    if (this._results.length === 0) return 0;
    return this._results.reduce((s, r) => s + r.dualPunScore, 0) / this._results.length;
  }

  strongestPun(): ZeugmaResult | undefined {
    if (this._results.length === 0) return undefined;
    return [...this._results].sort((a, b) => b.dualPunScore - a.dualPunScore)[0];
  }

  joinedPairsList(): Array<[string, string]> {
    return [...this._joinedPairs];
  }

  removeDimension(id: string): boolean {
    return this._dimensions.delete(id);
  }

  reset(): void {
    this._dimensions.clear();
    this._results = [];
    this._joinedPairs = [];
  }

  get dimensionCount(): number {
    return this._dimensions.size;
  }

  get joinCount(): number {
    return this._results.length;
  }
}
