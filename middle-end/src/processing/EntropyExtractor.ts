/**
 * 熵提取器模块：从噪声、用户犹豫、抖动等看似无信息的废料中，
 * 通过统计建模榨取隐藏的结构化信息，化熵为序。
 */

export interface WasteSample {
  id: string;
  source: 'noise' | 'hesitation' | 'jitter' | 'discard';
  raw: Record<string, unknown>;
  entropy: number;
  timestamp: number;
}

export interface ExtractedInfo {
  fromSampleId: string;
  structured: Record<string, unknown>;
  confidence: number;
  yieldBits: number;
}

export class EntropyExtractor {
  private _waste: Map<string, WasteSample> = new Map();
  private _extracted: ExtractedInfo[] = [];
  private _frequencyMap: Map<string, number> = new Map();
  private _totalYield = 0;
  private _maxWaste = 64;

  collect(sample: WasteSample): void {
    this._waste.set(sample.id, sample);
    if (this._waste.size > this._maxWaste) {
      const oldest = Array.from(this._waste.values()).sort((a, b) => a.timestamp - b.timestamp)[0];
      if (oldest) this._waste.delete(oldest.id);
    }
    this._updateFrequency(sample);
  }

  private _updateFrequency(sample: WasteSample): void {
    const key = String(sample.raw.kind ?? sample.source);
    this._frequencyMap.set(key, (this._frequencyMap.get(key) ?? 0) + 1);
  }

  extract(): ExtractedInfo[] {
    const results: ExtractedInfo[] = [];
    for (const sample of this._waste.values()) {
      if (sample.entropy < 0.3) continue;
      const structured = this._distill(sample);
      const confidence = Math.min(1, sample.entropy);
      const yieldBits = Math.round(sample.entropy * 32);
      results.push({
        fromSampleId: sample.id,
        structured,
        confidence,
        yieldBits,
      });
      this._totalYield += yieldBits;
    }
    this._extracted.push(...results);
    return results;
  }

  private _distill(sample: WasteSample): Record<string, unknown> {
    const keys = Object.keys(sample.raw);
    const dominant = this._dominantFrequencyKey();
    return {
      source: sample.source,
      distilledKeys: keys,
      entropyBucket: sample.entropy > 0.7 ? 'high' : sample.entropy > 0.4 ? 'mid' : 'low',
      dominantPattern: dominant,
      extractedAt: Date.now(),
    };
  }

  private _dominantFrequencyKey(): string {
    let best = '';
    let max = 0;
    for (const [k, c] of this._frequencyMap) {
      if (c > max) { max = c; best = k; }
    }
    return best;
  }

  batchExtract(): number {
    const before = this._extracted.length;
    this.extract();
    return this._extracted.length - before;
  }

  entropyHistogram(): Map<string, number> {
    const buckets = new Map<string, number>([['low', 0], ['mid', 0], ['high', 0]]);
    for (const s of this._waste.values()) {
      const bucket = s.entropy > 0.7 ? 'high' : s.entropy > 0.4 ? 'mid' : 'low';
      buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
    }
    return buckets;
  }

  averageEntropy(): number {
    if (this._waste.size === 0) return 0;
    const sum = Array.from(this._waste.values()).reduce((s, w) => s + w.entropy, 0);
    return sum / this._waste.size;
  }

  purgeLowEntropy(threshold = 0.2): number {
    let removed = 0;
    for (const [id, sample] of this._waste) {
      if (sample.entropy < threshold) {
        this._waste.delete(id);
        removed++;
      }
    }
    return removed;
  }

  reset(): void {
    this._waste.clear();
    this._extracted = [];
    this._frequencyMap.clear();
    this._totalYield = 0;
  }

  get wasteCount(): number {
    return this._waste.size;
  }

  get extractedCount(): number {
    return this._extracted.length;
  }

  get totalYield(): number {
    return this._totalYield;
  }
}
