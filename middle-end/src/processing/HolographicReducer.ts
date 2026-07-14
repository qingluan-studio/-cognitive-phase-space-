export interface HologramFragment {
  id: string;
  encoded: Record<string, unknown>;
  coverage: number;
  redundancy: number;
  randomSeed: number;
  projectionDimension: number;
}

export interface HolographicResult {
  fragments: HologramFragment[];
  totalDimension: number;
  encodedDimension: number;
  reconstructability: number;
}

export class HolographicReducer {
  private _fragments: Map<string, HologramFragment> = new Map();
  private _original: Record<string, unknown> = {};
  private _results: HolographicResult[] = [];
  private _fragmentSize = 4;
  private _overlap = 0.5;
  private _projectionRatio = 0.6;
  private _maxIterations = 20;

  setFragmentSize(size: number): void { this._fragmentSize = Math.max(1, size); }
  setOverlap(overlap: number): void { this._overlap = Math.max(0, Math.min(1, overlap)); }
  setProjectionRatio(r: number): void { this._projectionRatio = Math.max(0.1, Math.min(1, r)); }
  setMaxIterations(n: number): void { this._maxIterations = Math.max(1, n); }

  encode(data: Record<string, unknown>): HolographicResult {
    this._original = { ...data };
    const keys = Object.keys(data).filter(k => typeof data[k] === 'number');
    const totalDim = keys.length;
    const projDim = Math.max(1, Math.floor(totalDim * this._projectionRatio));
    const step = Math.max(1, Math.round(this._fragmentSize * (1 - this._overlap)));
    const fragments: HologramFragment[] = [];
    const seed = 42;

    for (let i = 0; i < keys.length; i += step) {
      const slice = keys.slice(i, i + this._fragmentSize);
      const seedVal = seed + i;
      const projected = this._randomProjection(data, keys, projDim, seedVal);
      const encoded: Record<string, unknown> = {};
      for (const key of slice) encoded[key] = data[key];
      for (let j = 0; j < projDim; j++) encoded[`proj_${j}`] = projected[j];
      encoded._holographicIndex = i;
      encoded._holographicTotal = totalDim;
      encoded._seed = seedVal;
      const fragment: HologramFragment = {
        id: `frag-${i}`, encoded,
        coverage: slice.length / Math.max(1, totalDim),
        redundancy: (slice.length / Math.max(1, keys.length)) * this._overlap,
        randomSeed: seedVal, projectionDimension: projDim,
      };
      fragments.push(fragment);
      this._fragments.set(fragment.id, fragment);
    }

    const encodedDim = fragments.reduce((s, f) => s + Object.keys(f.encoded).filter(k => !k.startsWith('_')).length, 0);
    const result: HolographicResult = {
      fragments, totalDimension: totalDim, encodedDimension: encodedDim,
      reconstructability: this._estimateReconstructability(fragments, totalDim),
    };
    this._results.push(result);
    return result;
  }

  private _randomProjection(data: Record<string, unknown>, keys: string[], projDim: number, seed: number): number[] {
    const result = new Array(projDim).fill(0);
    let rngState = seed;
    const rand = () => {
      rngState = (rngState * 1664525 + 1013904223) >>> 0;
      return (rngState & 0xfffffff) / 0xfffffff;
    };
    const matrix: number[][] = [];
    for (let i = 0; i < projDim; i++) {
      const row: number[] = [];
      for (let j = 0; j < keys.length; j++) row.push(rand() * 2 - 1);
      const norm = Math.sqrt(row.reduce((s, x) => s + x * x, 0));
      matrix.push(row.map(x => x / Math.max(0.001, norm)));
    }
    for (let i = 0; i < projDim; i++) {
      let sum = 0;
      for (let j = 0; j < keys.length; j++) {
        const val = data[keys[j]];
        if (typeof val === 'number') sum += matrix[i][j] * val;
      }
      result[i] = sum;
    }
    return result;
  }

  private _estimateReconstructability(fragments: HologramFragment[], totalDim: number): number {
    const allKeys = new Set<string>();
    let totalProjDim = 0;
    for (const frag of fragments) {
      for (const key of Object.keys(frag.encoded))
        if (!key.startsWith('_') && !key.startsWith('proj_')) allKeys.add(key);
      totalProjDim += frag.projectionDimension;
    }
    const keyCoverage = totalDim === 0 ? 0 : allKeys.size / totalDim;
    const projCoverage = Math.min(1, totalProjDim / Math.max(1, totalDim * fragments.length));
    return keyCoverage * 0.6 + projCoverage * 0.4;
  }

  reconstruct(fragmentIds?: string[]): Record<string, unknown> {
    const ids = fragmentIds ?? Array.from(this._fragments.keys());
    const reconstructed: Record<string, unknown> = {};
    const valueSums: Record<string, { sum: number; count: number }> = {};

    for (const id of ids) {
      const frag = this._fragments.get(id);
      if (!frag) continue;
      for (const [key, value] of Object.entries(frag.encoded)) {
        if (key.startsWith('_') || key.startsWith('proj_')) continue;
        if (typeof value === 'number') {
          if (!valueSums[key]) valueSums[key] = { sum: 0, count: 0 };
          valueSums[key].sum += value;
          valueSums[key].count++;
        } else if (!(key in reconstructed)) {
          reconstructed[key] = value;
        }
      }
    }

    for (const [key, info] of Object.entries(valueSums)) reconstructed[key] = info.sum / info.count;

    const firstFrag = ids.length > 0 ? this._fragments.get(ids[0]) : undefined;
    if (firstFrag) {
      const projKeys = Object.keys(firstFrag.encoded).filter(k => k.startsWith('proj_'));
      const projections = projKeys.map(k => firstFrag.encoded[k] as number);
      const sparse = this._sparseReconstruct(projections, firstFrag);
      for (const [key, val] of Object.entries(sparse))
        if (!(key in reconstructed)) reconstructed[key] = val;
    }

    reconstructed._reconstructed = true;
    reconstructed._fragmentCount = ids.length;
    return reconstructed;
  }

  private _sparseReconstruct(projections: number[], fragment: HologramFragment): Record<string, number> {
    const result: Record<string, number> = {};
    const keys = Object.keys(this._original).filter(k => typeof this._original[k] === 'number');
    if (keys.length === 0 || projections.length === 0) return result;

    let x = new Array(keys.length).fill(0);
    let rngState = fragment.randomSeed;
    const rand = () => {
      rngState = (rngState * 1664525 + 1013904223) >>> 0;
      return (rngState & 0xfffffff) / 0xfffffff;
    };

    const phi: number[][] = [];
    for (let i = 0; i < projections.length; i++) {
      const row: number[] = [];
      for (let j = 0; j < keys.length; j++) row.push(rand() * 2 - 1);
      const norm = Math.sqrt(row.reduce((s, v) => s + v * v, 0));
      phi.push(row.map(v => v / Math.max(0.001, norm)));
    }

    for (let iter = 0; iter < this._maxIterations; iter++) {
      const residual = new Array(projections.length).fill(0);
      for (let i = 0; i < projections.length; i++) {
        let ax = 0;
        for (let j = 0; j < keys.length; j++) ax += phi[i][j] * x[j];
        residual[i] = projections[i] - ax;
      }
      const gradient = new Array(keys.length).fill(0);
      for (let j = 0; j < keys.length; j++)
        for (let i = 0; i < projections.length; i++) gradient[j] += phi[i][j] * residual[i];
      for (let j = 0; j < keys.length; j++) x[j] += 0.1 * gradient[j];
      x = x.map(v => v > 0.01 ? v - 0.01 : v < -0.01 ? v + 0.01 : 0);
    }

    for (let i = 0; i < keys.length; i++)
      if (Math.abs(x[i]) > 0.001) result[keys[i]] = x[i];
    return result;
  }

  averageReconstructability(): number {
    if (this._results.length === 0) return 0;
    return this._results.reduce((s, r) => s + r.reconstructability, 0) / this._results.length;
  }

  reset(): void {
    this._fragments.clear();
    this._original = {};
    this._results = [];
  }

  get fragmentCount(): number { return this._fragments.size; }
  get resultCount(): number { return this._results.length; }
  get fragmentSize(): number { return this._fragmentSize; }
  get overlap(): number { return this._overlap; }
  get projectionRatio(): number { return this._projectionRatio; }
}
