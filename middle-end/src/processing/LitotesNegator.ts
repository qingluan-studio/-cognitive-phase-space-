export interface LitoticStatement {
  id: string;
  directAffirmation: string;
  doubleNegation: string;
  payload: Record<string, unknown>;
  depthLayers: number;
}

export interface LitoticResult {
  statementId: string;
  negated: Record<string, unknown>;
  renegated: Record<string, unknown>;
  affirmed: Record<string, unknown>;
  depthGain: number;
  truthValue: number;
  logicalDepth: number;
}

export class LitotesNegator {
  private _statements: Map<string, LitoticStatement> = new Map();
  private _results: LitoticResult[] = [];
  private _negationPrefix = 'not_';
  private _maxDepth = 3;
  private _truthTable: Map<string, boolean> = new Map();

  addStatement(statement: LitoticStatement): void {
    this._statements.set(statement.id, statement);
  }

  setNegationPrefix(prefix: string): void {
    this._negationPrefix = prefix;
  }

  setMaxDepth(depth: number): void {
    this._maxDepth = Math.max(1, depth);
  }

  negate(payload: Record<string, unknown>): Record<string, unknown> {
    const negated: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload)) {
      negated[`${this._negationPrefix}${key}`] = this._negateValue(value);
    }
    return negated;
  }

  private _negateValue(value: unknown): unknown {
    if (typeof value === 'boolean') return !value;
    if (typeof value === 'number') return value >= 0 && value <= 1 ? 1 - value : -value;
    if (typeof value === 'string') return value.startsWith('¬') ? value.slice(1) : `¬${value}`;
    if (Array.isArray(value)) return value.length === 0 ? ['empty'] : [];
    if (value === null) return 'exists';
    if (value === undefined) return 'defined';
    if (typeof value === 'object' && value !== null) {
      return this._negateObject(value as Record<string, unknown>);
    }
    return null;
  }

  private _negateObject(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      result[`${this._negationPrefix}${k}`] = this._negateValue(v);
    }
    return result;
  }

  process(statementId: string): LitoticResult | undefined {
    const statement = this._statements.get(statementId);
    if (!statement) return undefined;

    let current = { ...statement.payload };
    const layers: Record<string, unknown>[] = [current];
    let depth = 0;

    while (depth < statement.depthLayers && depth < this._maxDepth) {
      current = this.negate(current);
      layers.push(current);
      this._updateTruthTable(layers[layers.length - 2], current, depth);
      depth++;
    }

    const negated = layers[1] ?? {};
    const renegated = layers[2] ?? layers[1] ?? {};
    const affirmed = this._reaffirm(renegated);
    const truthValue = this._computeTruthValue(layers);
    const logicalDepth = this._computeLogicalDepth(layers);

    const result: LitoticResult = {
      statementId, negated, renegated, affirmed,
      depthGain: depth, truthValue, logicalDepth,
    };
    this._results.push(result);
    return result;
  }

  private _updateTruthTable(
    prev: Record<string, unknown>,
    curr: Record<string, unknown>,
    depth: number
  ): void {
    for (const key of Object.keys(curr)) {
      const truthKey = `${depth}:${key}`;
      const prevKey = key.startsWith(this._negationPrefix)
        ? key.slice(this._negationPrefix.length)
        : `${this._negationPrefix}${key}`;
      this._truthTable.set(truthKey, prevKey in prev);
    }
  }

  private _computeTruthValue(layers: Record<string, unknown>[]): number {
    if (layers.length < 2) return 1;
    let consistency = 0, totalPairs = 0;
    const doublePrefix = this._negationPrefix.repeat(2);

    for (let i = 0; i < layers.length - 1; i += 2) {
      const layer2Idx = i + 2;
      if (layer2Idx >= layers.length) break;
      const keys1 = new Set(Object.keys(layers[i]));
      const keys2 = new Set(
        Object.keys(layers[layer2Idx]).map(k =>
          k.startsWith(doublePrefix) ? k.slice(doublePrefix.length) : k
        )
      );
      const intersection = new Set([...keys1].filter(k => keys2.has(k)));
      const union = new Set([...keys1, ...keys2]);
      if (union.size > 0) {
        consistency += intersection.size / union.size;
        totalPairs++;
      }
    }
    return totalPairs === 0 ? 0.5 : consistency / totalPairs;
  }

  private _computeLogicalDepth(layers: Record<string, unknown>[]): number {
    if (layers.length === 0) return 0;
    const totalKeys = layers.reduce((s, l) => s + Object.keys(l).length, 0);
    const uniqueKeys = new Set(layers.flatMap(l => Object.keys(l))).size;
    const redundancy = uniqueKeys === 0 ? 1 : totalKeys / uniqueKeys;
    return Math.min(1, (layers.length - 1) * 0.5 + redundancy * 0.5);
  }

  private _reaffirm(payload: Record<string, unknown>): Record<string, unknown> {
    const affirmed: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload)) {
      let stripped = key;
      let negCount = 0;
      while (stripped.startsWith(this._negationPrefix)) {
        stripped = stripped.slice(this._negationPrefix.length);
        negCount++;
      }
      affirmed[stripped] = negCount % 2 === 0 ? value : this._negateValue(value);
    }
    return affirmed;
  }

  processAll(): LitoticResult[] {
    return Array.from(this._statements.keys()).map(id => this.process(id)!).filter(Boolean);
  }

  averageDepthGain(): number {
    if (this._results.length === 0) return 0;
    return this._results.reduce((s, r) => s + r.depthGain, 0) / this._results.length;
  }

  averageTruthValue(): number {
    if (this._results.length === 0) return 0;
    return this._results.reduce((s, r) => s + r.truthValue, 0) / this._results.length;
  }

  compareDepths(statementId: string): { layerSpread: number; affirmedKeys: number; truthValue: number } {
    const result = this._results.find(r => r.statementId === statementId);
    if (!result) return { layerSpread: 0, affirmedKeys: 0, truthValue: 0 };
    return {
      layerSpread: result.depthGain,
      affirmedKeys: Object.keys(result.affirmed).length,
      truthValue: result.truthValue,
    };
  }

  reset(): void {
    this._statements.clear();
    this._results = [];
    this._truthTable.clear();
  }

  get statementCount(): number { return this._statements.size; }
  get resultCount(): number { return this._results.length; }
  get maxDepth(): number { return this._maxDepth; }
  get truthTableSize(): number { return this._truthTable.size; }
}
