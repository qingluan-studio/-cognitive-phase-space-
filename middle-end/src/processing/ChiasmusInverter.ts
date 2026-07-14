export interface ChiasmusLayer {
  id: string;
  sequence: Record<string, unknown>[];
  inverted: Record<string, unknown>[];
  crossMap: Array<{ originalIndex: number; mirroredIndex: number; matched: boolean; similarity: number }>;
}

export interface ChiasmusReport {
  layerId: string;
  hiddenSymmetry: number;
  matchedPairs: number;
  totalPairs: number;
  discoveredPattern: Record<string, unknown>;
  symmetryDepth: number;
  structuralCoherence: number;
}

export class ChiasmusInverter {
  private _layers: Map<string, ChiasmusLayer> = new Map();
  private _reports: ChiasmusReport[] = [];
  private _tolerance = 0.1;
  private _dpMatrix: number[][] = [];

  addLayer(layer: ChiasmusLayer): void {
    this._layers.set(layer.id, layer);
  }

  setTolerance(t: number): void {
    this._tolerance = Math.max(0, Math.min(1, t));
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
      const similarity = this._cosineSimilarity(layer.sequence[i], layer.sequence[mirrorIdx]);
      const isMatch = similarity >= (1 - this._tolerance);
      crossMap.push({ originalIndex: i, mirroredIndex: mirrorIdx, matched: isMatch, similarity });
      if (isMatch) matched++;
    }

    layer.crossMap = crossMap;
    const total = layer.sequence.length;
    const hiddenSymmetry = total === 0 ? 0 : matched / total;
    const symmetryDepth = this._computeSymmetryDepth(crossMap);
    const structuralCoherence = this._computeStructuralCoherence(layer.sequence);
    const pattern = this._discoverPattern(layer.sequence, crossMap);

    const report: ChiasmusReport = {
      layerId, hiddenSymmetry, matchedPairs: matched, totalPairs: total,
      discoveredPattern: pattern, symmetryDepth, structuralCoherence,
    };
    this._reports.push(report);
    return report;
  }

  private _cosineSimilarity(a: Record<string, unknown>, b: Record<string, unknown>): number {
    const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
    let dotProduct = 0, normA = 0, normB = 0;
    for (const k of allKeys) {
      const valA = this._normalizeValue(a[k]);
      const valB = this._normalizeValue(b[k]);
      dotProduct += valA * valB;
      normA += valA * valA;
      normB += valB * valB;
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dotProduct / denom;
  }

  private _normalizeValue(v: unknown): number {
    if (v === undefined || v === null) return 0;
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (typeof v === 'number') return isFinite(v) ? Math.tanh(v) : 0;
    if (typeof v === 'string') return v.length > 0 ? 1 : 0;
    if (Array.isArray(v)) return v.length > 0 ? 1 : 0;
    return 0.5;
  }

  private _computeSymmetryDepth(crossMap: ChiasmusLayer['crossMap']): number {
    const n = crossMap.length;
    if (n === 0) return 0;
    let maxDepth = 0;
    for (let center = 0; center < n; center++) {
      let depth = 0;
      while (center - depth >= 0 && center + depth < n &&
             crossMap[center - depth].matched && crossMap[center + depth].matched) depth++;
      maxDepth = Math.max(maxDepth, depth);
    }
    return maxDepth / Math.ceil(n / 2);
  }

  private _computeStructuralCoherence(sequence: Record<string, unknown>[]): number {
    const n = sequence.length;
    if (n < 3) return 0;
    this._buildDPMatrix(sequence);
    let coherence = 0;
    for (let i = 0; i < n; i++) coherence += this._dpMatrix[i][n - 1 - i];
    return coherence / (n * n);
  }

  private _buildDPMatrix(sequence: Record<string, unknown>[]): void {
    const n = sequence.length;
    this._dpMatrix = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const sim = this._cosineSimilarity(sequence[i], sequence[j]);
        if (sim >= (1 - this._tolerance)) {
          this._dpMatrix[i][j] = (i === 0 || j === 0) ? 1 : this._dpMatrix[i - 1][j - 1] + 1;
        }
      }
    }
  }

  private _discoverPattern(
    sequence: Record<string, unknown>[],
    crossMap: ChiasmusLayer['crossMap']
  ): Record<string, unknown> {
    const matchedIndices = crossMap.filter(c => c.matched).map(c => c.originalIndex);
    let longestRun = 0, currentRun = 0;
    for (const c of crossMap) {
      if (c.matched) { currentRun++; longestRun = Math.max(longestRun, currentRun); }
      else currentRun = 0;
    }
    const pivotIndex = Math.floor(sequence.length / 2);
    return {
      length: sequence.length,
      symmetricCore: matchedIndices.length > 0,
      matchedCount: matchedIndices.length,
      pivotIndex,
      isPalindrome: matchedIndices.length === sequence.length,
      longestSymmetricRun: longestRun,
      mirrorQuality: sequence.length === 0 ? 0 :
        matchedIndices.filter(i => i < pivotIndex).length / Math.max(1, Math.floor(sequence.length / 2)),
    };
  }

  crossVerifyAll(): ChiasmusReport[] {
    return Array.from(this._layers.keys()).map(id => this.crossVerify(id)!).filter(Boolean);
  }

  mostSymmetric(): ChiasmusReport | undefined {
    if (this._reports.length === 0) return undefined;
    return [...this._reports].sort((a, b) =>
      (b.hiddenSymmetry * 0.5 + b.symmetryDepth * 0.3 + b.structuralCoherence * 0.2) -
      (a.hiddenSymmetry * 0.5 + a.symmetryDepth * 0.3 + a.structuralCoherence * 0.2)
    )[0];
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
    this._dpMatrix = [];
  }

  get layerCount(): number { return this._layers.size; }
  get reportCount(): number { return this._reports.length; }
  get tolerance(): number { return this._tolerance; }
}
