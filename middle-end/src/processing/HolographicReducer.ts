/**
 * 全息归约器模块：将高维数据压缩为全息低维表示，
 * 每个局部片段都包含整体信息的编码，可从任意片段重建整体。
 */

export interface HologramFragment {
  id: string;
  encoded: Record<string, unknown>;
  coverage: number;
  redundancy: number;
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

  setFragmentSize(size: number): void {
    this._fragmentSize = Math.max(1, size);
  }

  setOverlap(overlap: number): void {
    this._overlap = Math.max(0, Math.min(1, overlap));
  }

  encode(data: Record<string, unknown>): HolographicResult {
    this._original = { ...data };
    const keys = Object.keys(data);
    const step = Math.max(1, Math.round(this._fragmentSize * (1 - this._overlap)));
    const fragments: HologramFragment[] = [];
    const totalDim = keys.length;

    for (let i = 0; i < keys.length; i += step) {
      const slice = keys.slice(i, i + this._fragmentSize);
      const encoded: Record<string, unknown> = {};
      for (const key of slice) {
        encoded[key] = data[key];
      }
      encoded._holographicIndex = i;
      encoded._holographicTotal = totalDim;
      const coverage = slice.length / totalDim;
      const redundancy = this._computeRedundancy(slice, keys);
      const fragment: HologramFragment = {
        id: `frag-${i}`,
        encoded,
        coverage,
        redundancy,
      };
      fragments.push(fragment);
      this._fragments.set(fragment.id, fragment);
    }

    const encodedDim = fragments.reduce((s, f) => s + Object.keys(f.encoded).length - 2, 0);
    const reconstructability = this._estimateReconstructability(fragments, totalDim);

    const result: HolographicResult = {
      fragments,
      totalDimension: totalDim,
      encodedDimension: encodedDim,
      reconstructability,
    };
    this._results.push(result);
    return result;
  }

  private _computeRedundancy(slice: string[], allKeys: string[]): number {
    const overlap = slice.length / allKeys.length;
    return overlap * this._overlap;
  }

  private _estimateReconstructability(fragments: HologramFragment[], totalDim: number): number {
    const allKeys = new Set<string>();
    for (const frag of fragments) {
      for (const key of Object.keys(frag.encoded)) {
        if (!key.startsWith('_')) allKeys.add(key);
      }
    }
    return totalDim === 0 ? 0 : allKeys.size / totalDim;
  }

  reconstruct(fragmentIds?: string[]): Record<string, unknown> {
    const ids = fragmentIds ?? Array.from(this._fragments.keys());
    const reconstructed: Record<string, unknown> = {};
    for (const id of ids) {
      const frag = this._fragments.get(id);
      if (!frag) continue;
      for (const [key, value] of Object.entries(frag.encoded)) {
        if (!key.startsWith('_')) reconstructed[key] = value;
      }
    }
    reconstructed._reconstructed = true;
    reconstructed._fragmentCount = ids.length;
    return reconstructed;
  }

  reconstructFromPartial(fragmentId: string): Record<string, unknown> {
    const frag = this._fragments.get(fragmentId);
    if (!frag) return {};
    const partial: Record<string, unknown> = { ...frag.encoded };
    partial._partialReconstruction = true;
    partial._estimatedCoverage = frag.coverage;
    return partial;
  }

  averageCoverage(): number {
    if (this._fragments.size === 0) return 0;
    return Array.from(this._fragments.values()).reduce((s, f) => s + f.coverage, 0) / this._fragments.size;
  }

  averageReconstructability(): number {
    if (this._results.length === 0) return 0;
    return this._results.reduce((s, r) => s + r.reconstructability, 0) / this._results.length;
  }

  compressionRatio(): number {
    if (this._results.length === 0) return 1;
    const latest = this._results[this._results.length - 1];
    return latest.totalDimension === 0 ? 1 : latest.encodedDimension / latest.totalDimension;
  }

  reset(): void {
    this._fragments.clear();
    this._original = {};
    this._results = [];
  }

  get fragmentCount(): number {
    return this._fragments.size;
  }

  get resultCount(): number {
    return this._results.length;
  }

  get fragmentSize(): number {
    return this._fragmentSize;
  }

  get overlap(): number {
    return this._overlap;
  }
}
