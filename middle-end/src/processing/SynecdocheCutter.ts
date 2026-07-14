/**
 * 提喻切割器模块：用部分替代整体进行高效处理，
 * 或将整体浓缩为关键部分，在精度与成本间动态权衡。
 */

export type SynecdocheMode = 'part-for-whole' | 'whole-for-part';

export interface SynecdocheSlice {
  id: string;
  key: string;
  value: unknown;
  representative: boolean;
  coverage: number;
}

export interface CondensedResult {
  slices: SynecdocheSlice[];
  mode: SynecdocheMode;
  coverage: number;
  reconstructed: Record<string, unknown>;
}

export class SynecdocheCutter {
  private _slices: Map<string, SynecdocheSlice> = new Map();
  private _mode: SynecdocheMode = 'part-for-whole';
  private _keyPriority: Map<string, number> = new Map();
  private _maxSlices = 8;

  setMode(mode: SynecdocheMode): void {
    this._mode = mode;
  }

  setKeyPriority(key: string, priority: number): void {
    this._keyPriority.set(key, priority);
  }

  setMaxSlices(max: number): void {
    this._maxSlices = Math.max(1, max);
  }

  cut(whole: Record<string, unknown>): CondensedResult {
    const keys = Object.keys(whole);
    const prioritized = this._sortKeys(keys);
    const selected = this._mode === 'part-for-whole'
      ? prioritized.slice(0, this._maxSlices)
      : prioritized.slice(-this._maxSlices);

    const slices: SynecdocheSlice[] = selected.map((key, idx) => ({
      id: `slice-${idx}`,
      key,
      value: whole[key],
      representative: idx === 0,
      coverage: 1 / selected.length,
    }));

    const coverage = selected.length / keys.length;
    const reconstructed = this._reconstruct(slices, whole);

    return { slices, mode: this._mode, coverage, reconstructed };
  }

  private _sortKeys(keys: string[]): string[] {
    return [...keys].sort((a, b) => (this._keyPriority.get(b) ?? 0) - (this._keyPriority.get(a) ?? 0));
  }

  private _reconstruct(slices: SynecdocheSlice[], original: Record<string, unknown>): Record<string, unknown> {
    const reconstructed: Record<string, unknown> = {};
    for (const slice of slices) {
      reconstructed[slice.key] = slice.value;
    }
    reconstructed._reconstructed = true;
    reconstructed._missingKeys = Object.keys(original).filter(k => !(k in reconstructed));
    return reconstructed;
  }

  storeSlice(slice: SynecdocheSlice): void {
    this._slices.set(slice.id, slice);
  }

  batchCut(wholes: Record<string, unknown>[]): CondensedResult[] {
    return wholes.map(w => this.cut(w));
  }

  expandSlice(sliceId: string, template: Record<string, unknown>): Record<string, unknown> | undefined {
    const slice = this._slices.get(sliceId);
    if (!slice) return undefined;
    return { ...template, [slice.key]: slice.value, _expanded: true };
  }

  averageCoverage(): number {
    if (this._slices.size === 0) return 0;
    return Array.from(this._slices.values()).reduce((s, x) => s + x.coverage, 0) / this._slices.size;
  }

  representativeSlices(): SynecdocheSlice[] {
    return Array.from(this._slices.values()).filter(s => s.representative);
  }

  reset(): void {
    this._slices.clear();
    this._keyPriority.clear();
  }

  get sliceCount(): number {
    return this._slices.size;
  }

  get mode(): SynecdocheMode {
    return this._mode;
  }

  get maxSlices(): number {
    return this._maxSlices;
  }
}
