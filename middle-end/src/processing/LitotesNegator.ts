/**
 * 曲言否定器模块：用双重否定代替直接肯定表述，
 * 增加数据解读的层次深度，通过否定之否定逼近真相。
 */

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
}

export class LitotesNegator {
  private _statements: Map<string, LitoticStatement> = new Map();
  private _results: LitoticResult[] = [];
  private _negationPrefix = 'not_';
  private _maxDepth = 3;

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
    if (typeof value === 'number') return -value;
    if (typeof value === 'string') return `¬${value}`;
    if (Array.isArray(value)) return [];
    if (value === null) return 'exists';
    return null;
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
      depth++;
    }

    const negated = layers[1] ?? {};
    const renegated = layers[2] ?? layers[1] ?? {};
    const affirmed = this._reaffirm(renegated);

    const result: LitoticResult = {
      statementId,
      negated,
      renegated,
      affirmed,
      depthGain: depth,
    };
    this._results.push(result);
    return result;
  }

  private _reaffirm(payload: Record<string, unknown>): Record<string, unknown> {
    const affirmed: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload)) {
      const stripped = key.startsWith(this._negationPrefix) ? key.slice(this._negationPrefix.length) : key;
      affirmed[stripped] = this._negateValue(value);
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

  compareDepths(statementId: string): { layerSpread: number; affirmedKeys: number } {
    const result = this._results.find(r => r.statementId === statementId);
    if (!result) return { layerSpread: 0, affirmedKeys: 0 };
    return {
      layerSpread: result.depthGain,
      affirmedKeys: Object.keys(result.affirmed).length,
    };
  }

  reset(): void {
    this._statements.clear();
    this._results = [];
  }

  get statementCount(): number {
    return this._statements.size;
  }

  get resultCount(): number {
    return this._results.length;
  }

  get maxDepth(): number {
    return this._maxDepth;
  }
}
