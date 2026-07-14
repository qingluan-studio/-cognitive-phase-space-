/**
 * 交错颠倒器模块：将数据结构的首尾颠倒后与原始结构交叉验证，
 * 通过对称性比对发现隐藏的内在结构模式。
 */

export interface ChiasmusLayer {
  id: string;
  sequence: Record<string, unknown>[];
  inverted: Record<string, unknown>[];
  crossMap: Array<{ originalIndex: number; mirroredIndex: number; matched: boolean }>;
}

export interface ChiasmusReport {
  layerId: string;
  hiddenSymmetry: number;
  matchedPairs: number;
  totalPairs: number;
  discoveredPattern: Record<string, unknown>;
}

export class ChiasmusInverter {
  private _layers: Map<string, ChiasmusLayer> = new Map();
  private _reports: ChiasmusReport[] = [];
  private _tolerance = 0.1;

  addLayer(layer: ChiasmusLayer): void {
    this._layers.set(layer.id, layer);
  }

  setTolerance(t: number): void {
    this._tolerance = Math.max(0, t);
  }

  invert(sequence: Record<string, unknown>[]): Record<string, unknown>[] {
    return [...sequence].reverse();
  }

  crossVerify(layerId: string): ChiasmusReport | undefined {
    const layer = this._layers.get(layerId);
    if (!layer) return undefined;

    layer.inverted = this.invert(layer.sequence);
    const crossMap: ChiasmusLayer['crossMap'] = [];
    let matched = 0;

    for (let i = 0; i < layer.sequence.length; i++) {
      const mirrorIdx = layer.sequence.length - 1 - i;
      const original = layer.sequence[i];
      const mirrored = layer.sequence[mirrorIdx];
      const isMatch = this._match(original, mirrored);
      crossMap.push({ originalIndex: i, mirroredIndex: mirrorIdx, matched: isMatch });
      if (isMatch) matched++;
    }

    layer.crossMap = crossMap;
    const total = layer.sequence.length;
    const hiddenSymmetry = total === 0 ? 0 : matched / total;
    const pattern = this._discoverPattern(layer.sequence, crossMap);

    const report: ChiasmusReport = {
      layerId,
      hiddenSymmetry,
      matchedPairs: matched,
      totalPairs: total,
      discoveredPattern: pattern,
    };
    this._reports.push(report);
    return report;
  }

  private _match(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (Math.abs(keysA.length - keysB.length) > 1) return false;
    let diff = 0;
    const allKeys = new Set([...keysA, ...keysB]);
    for (const k of allKeys) {
      if (String(a[k]) !== String(b[k])) diff++;
    }
    return diff / Math.max(1, allKeys.size) <= this._tolerance;
  }

  private _discoverPattern(sequence: Record<string, unknown>[], crossMap: ChiasmusLayer['crossMap']): Record<string, unknown> {
    const matchedIndices = crossMap.filter(c => c.matched).map(c => c.originalIndex);
    return {
      length: sequence.length,
      symmetricCore: matchedIndices.length > 0,
      matchedCount: matchedIndices.length,
      pivotIndex: Math.floor(sequence.length / 2),
      isPalindrome: matchedIndices.length === sequence.length,
    };
  }

  crossVerifyAll(): ChiasmusReport[] {
    return Array.from(this._layers.keys()).map(id => this.crossVerify(id)!).filter(Boolean);
  }

  mostSymmetric(): ChiasmusReport | undefined {
    if (this._reports.length === 0) return undefined;
    return [...this._reports].sort((a, b) => b.hiddenSymmetry - a.hiddenSymmetry)[0];
  }

  averageSymmetry(): number {
    if (this._reports.length === 0) return 0;
    return this._reports.reduce((s, r) => s + r.hiddenSymmetry, 0) / this._reports.length;
  }

  palindromicLayers(): string[] {
    return this._reports.filter(r => r.discoveredPattern.isPalindrome).map(r => r.layerId);
  }

  reset(): void {
    this._layers.clear();
    this._reports = [];
  }

  get layerCount(): number {
    return this._layers.size;
  }

  get reportCount(): number {
    return this._reports.length;
  }

  get tolerance(): number {
    return this._tolerance;
  }
}
