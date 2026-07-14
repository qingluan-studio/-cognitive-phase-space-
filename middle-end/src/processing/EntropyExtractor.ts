export type WasteSource = 'noise' | 'hesitation' | 'jitter' | 'discard';

export interface WasteSample {
  id: string;
  source: WasteSource;
  raw: Record<string, unknown>;
  entropy: number;
  timestamp: number;
  sequence?: number[];
}

export interface ExtractedInfo {
  fromSampleId: string;
  structured: Record<string, unknown>;
  confidence: number;
  yieldBits: number;
  shannonEntropy: number;
  sampleEntropy: number;
  lzComplexity: number;
  fractalDimension: number;
}

interface PatternNode {
  count: number;
  children: Map<string, PatternNode>;
}

export class EntropyExtractor {
  private _waste: Map<string, WasteSample> = new Map();
  private _extracted: ExtractedInfo[] = [];
  private _frequencyMap: Map<string, number> = new Map();
  private _totalYield = 0;
  private _maxWaste = 64;
  private _patternTree: PatternNode = { count: 0, children: new Map() };
  private _sequenceHistory: Map<string, number[]> = new Map();
  private _mutualInfoCache: Map<string, number> = new Map();
  private _binCount = 10;
  private _sampleEntropyM = 2;
  private _sampleEntropyR = 0.2;

  collect(sample: WasteSample): void {
    const enriched: WasteSample = {
      ...sample,
      sequence: sample.sequence ?? this._extractSequence(sample.raw),
    };
    this._waste.set(sample.id, enriched);
    if (this._waste.size > this._maxWaste) {
      const oldest = this._findOldest();
      if (oldest) this._waste.delete(oldest.id);
    }
    this._updateFrequency(sample);
    if (enriched.sequence) {
      this._updatePatternTree(enriched.sequence);
      this._sequenceHistory.set(sample.id, enriched.sequence);
    }
  }

  private _extractSequence(raw: Record<string, unknown>): number[] {
    const seq: number[] = [];
    const keys = Object.keys(raw).sort();
    for (const k of keys) {
      const v = raw[k];
      if (typeof v === 'number') {
        seq.push(v);
      } else if (typeof v === 'boolean') {
        seq.push(v ? 1 : 0);
      } else if (typeof v === 'string') {
        let h = 0;
        for (let i = 0; i < v.length; i++) {
          h = ((h << 5) - h) + v.charCodeAt(i);
        }
        seq.push(Math.abs(h) / 1000000);
      }
    }
    return seq.length > 0 ? seq : [Math.random()];
  }

  private _findOldest(): WasteSample | null {
    let oldest: WasteSample | null = null;
    let earliest = Infinity;
    for (const s of this._waste.values()) {
      if (s.timestamp < earliest) {
        earliest = s.timestamp;
        oldest = s;
      }
    }
    return oldest;
  }

  private _updateFrequency(sample: WasteSample): void {
    const key = String(sample.raw.kind ?? sample.source);
    this._frequencyMap.set(key, (this._frequencyMap.get(key) ?? 0) + 1);
  }

  private _updatePatternTree(seq: number[]): void {
    const quantized = seq.map(v => this._quantize(v));
    let node = this._patternTree;
    node.count++;
    for (const sym of quantized) {
      const s = String(sym);
      if (!node.children.has(s)) {
        node.children.set(s, { count: 0, children: new Map() });
      }
      node = node.children.get(s)!;
      node.count++;
    }
  }

  private _quantize(v: number): number {
    const clamped = Math.max(-1, Math.min(1, v));
    return Math.floor((clamped + 1) / 2 * this._binCount);
  }

  extract(): ExtractedInfo[] {
    const results: ExtractedInfo[] = [];
    for (const sample of this._waste.values()) {
      if (sample.entropy < 0.3) continue;
      const seq = sample.sequence ?? this._extractSequence(sample.raw);

      const shannon = this._shannonEntropy(seq);
      const sampleEnt = this._sampleEntropy(seq);
      const lz = this._lzComplexity(seq);
      const fractal = this._higuchiDimension(seq);
      const structured = this._distill(sample, seq, shannon, sampleEnt, lz, fractal);

      const confidence = Math.min(1, sample.entropy * (1 + lz * 0.5));
      const yieldBits = Math.round(shannon * seq.length * 0.5 + lz * 16);

      const info: ExtractedInfo = {
        fromSampleId: sample.id,
        structured,
        confidence,
        yieldBits,
        shannonEntropy: shannon,
        sampleEntropy: sampleEnt,
        lzComplexity: lz,
        fractalDimension: fractal,
      };

      results.push(info);
      this._totalYield += yieldBits;
    }
    this._extracted.push(...results);
    return results;
  }

  private _distill(
    sample: WasteSample,
    seq: number[],
    shannon: number,
    sampleEnt: number,
    lz: number,
    fractal: number
  ): Record<string, unknown> {
    const keys = Object.keys(sample.raw);
    const dominant = this._dominantFrequencyKey();
    const periodicity = this._detectPeriodicity(seq);
    const trend = this._linearTrend(seq);
    const regime = this._classifyRegime(shannon, sampleEnt, lz, fractal);

    return {
      source: sample.source,
      distilledKeys: keys,
      entropyBucket: sample.entropy > 0.7 ? 'high' : sample.entropy > 0.4 ? 'mid' : 'low',
      dominantPattern: dominant,
      extractedAt: Date.now(),
      sequenceLength: seq.length,
      shannonEntropy: shannon,
      sampleEntropy: sampleEnt,
      lzComplexity: lz,
      fractalDimension: fractal,
      periodicityScore: periodicity,
      trendDirection: trend > 0 ? 'up' : trend < 0 ? 'down' : 'flat',
      trendStrength: Math.abs(trend),
      regime,
      informationDensity: (shannon + sampleEnt + lz) / 3,
      structureScore: fractal / 2,
    };
  }

  private _shannonEntropy(seq: number[]): number {
    if (seq.length === 0) return 0;
    const counts = new Map<number, number>();
    const quantized = seq.map(v => this._quantize(v));
    for (const v of quantized) {
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    const n = quantized.length;
    let entropy = 0;
    for (const count of counts.values()) {
      const p = count / n;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    const maxEntropy = Math.log2(this._binCount);
    return maxEntropy === 0 ? 0 : entropy / maxEntropy;
  }

  private _sampleEntropy(seq: number[]): number {
    const n = seq.length;
    const m = this._sampleEntropyM;
    const r = this._sampleEntropyR;
    if (n <= m + 1) return 0.5;

    const std = this._std(seq);
    const threshold = r * std;

    let countM = 0, countM1 = 0;
    const maxI = n - m;
    const maxJ = n - m - 1;

    for (let i = 0; i < maxI; i++) {
      for (let j = i + 1; j < maxJ; j++) {
        let match = true;
        for (let k = 0; k < m; k++) {
          if (Math.abs(seq[i + k] - seq[j + k]) > threshold) {
            match = false;
            break;
          }
        }
        if (match) {
          countM++;
          if (Math.abs(seq[i + m] - seq[j + m]) <= threshold) {
            countM1++;
          }
        }
      }
    }

    if (countM === 0 || countM1 === 0) return 0.5;
    const sampEn = -Math.log(countM1 / countM);
    return Math.min(2, Math.max(0, sampEn)) / 2;
  }

  private _std(seq: number[]): number {
    if (seq.length < 2) return 1;
    const mean = seq.reduce((s, v) => s + v, 0) / seq.length;
    const variance = seq.reduce((s, v) => s + (v - mean) ** 2, 0) / seq.length;
    return Math.sqrt(variance) || 1;
  }

  private _lzComplexity(seq: number[]): number {
    const quantized = seq.map(v => this._quantize(v));
    const n = quantized.length;
    if (n === 0) return 0;

    let complexity = 1;
    let i = 1;
    while (i < n) {
      let found = false;
      for (let j = 0; j < i; j++) {
        let k = 0;
        while (i + k < n && quantized[j + k] === quantized[i + k]) {
          k++;
          if (j + k >= i) break;
        }
        if (k > 0 && j + k >= i) {
          i += k;
          found = true;
          break;
        }
      }
      if (!found) {
        complexity++;
        i++;
      }
    }

    const normalized = complexity * Math.log2(n) / n;
    return Math.min(1, Math.max(0, normalized));
  }

  private _higuchiDimension(seq: number[]): number {
    const n = seq.length;
    if (n < 8) return 1;

    const kMax = Math.min(Math.floor(n / 4), 10);
    const lnL: number[] = [];
    const lnK: number[] = [];

    for (let k = 2; k <= kMax; k++) {
      let lengthSum = 0;
      for (let m = 0; m < k; m++) {
        let Lmk = 0;
        const Nmk = Math.floor((n - 1 - m) / k);
        if (Nmk < 1) continue;
        for (let i = 1; i <= Nmk; i++) {
          Lmk += Math.abs(seq[m + i * k] - seq[m + (i - 1) * k]);
        }
        Lmk = Lmk * (n - 1) / (Nmk * k * k);
        lengthSum += Lmk;
      }
      const avgLength = lengthSum / k;
      if (avgLength > 0) {
        lnL.push(Math.log(avgLength));
        lnK.push(Math.log(k));
      }
    }

    if (lnL.length < 3) return 1;
    const slope = this._linearRegressionSlope(lnK, lnL);
    const dimension = -slope;
    return Math.min(2, Math.max(1, dimension));
  }

  private _linearRegressionSlope(x: number[], y: number[]): number {
    const n = x.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += x[i];
      sumY += y[i];
      sumXY += x[i] * y[i];
      sumX2 += x[i] * x[i];
    }
    const denom = n * sumX2 - sumX * sumX;
    return denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  }

  private _detectPeriodicity(seq: number[]): number {
    if (seq.length < 8) return 0;
    const n = seq.length;
    const mean = seq.reduce((s, v) => s + v, 0) / n;
    let maxCorr = 0;

    for (let lag = 1; lag <= Math.floor(n / 2); lag++) {
      let sum = 0;
      let var1 = 0, var2 = 0;
      for (let i = 0; i < n - lag; i++) {
        sum += (seq[i] - mean) * (seq[i + lag] - mean);
        var1 += (seq[i] - mean) ** 2;
        var2 += (seq[i + lag] - mean) ** 2;
      }
      const denom = Math.sqrt(var1 * var2);
      const corr = denom === 0 ? 0 : sum / denom;
      if (corr > maxCorr) maxCorr = corr;
    }
    return Math.max(0, maxCorr);
  }

  private _linearTrend(seq: number[]): number {
    if (seq.length < 2) return 0;
    const n = seq.length;
    const xMean = (n - 1) / 2;
    const yMean = seq.reduce((s, v) => s + v, 0) / n;
    let num = 0, denom = 0;
    for (let i = 0; i < n; i++) {
      num += (i - xMean) * (seq[i] - yMean);
      denom += (i - xMean) ** 2;
    }
    return denom === 0 ? 0 : num / denom;
  }

  private _classifyRegime(shan: number, samp: number, lz: number, fract: number): string {
    const avg = (shan + samp + lz + fract / 2) / 4;
    if (avg > 0.7) return 'chaotic';
    if (avg > 0.4) return 'complex';
    if (avg > 0.2) return 'periodic';
    return 'ordered';
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

  averageLZComplexity(): number {
    if (this._extracted.length === 0) return 0;
    const sum = this._extracted.reduce((s, e) => s + e.lzComplexity, 0);
    return sum / this._extracted.length;
  }

  mutualInformation(sampleIdA: string, sampleIdB: string): number {
    const cacheKey = `${sampleIdA}|${sampleIdB}`;
    const cached = this._mutualInfoCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const seqA = this._sequenceHistory.get(sampleIdA);
    const seqB = this._sequenceHistory.get(sampleIdB);
    if (!seqA || !seqB || seqA.length === 0 || seqB.length === 0) return 0;

    const minLen = Math.min(seqA.length, seqB.length);
    const qA = seqA.slice(0, minLen).map(v => this._quantize(v));
    const qB = seqB.slice(0, minLen).map(v => this._quantize(v));

    const hA = this._shannonEntropy(seqA.slice(0, minLen));
    const hB = this._shannonEntropy(seqB.slice(0, minLen));

    const jointCounts = new Map<string, number>();
    for (let i = 0; i < minLen; i++) {
      const key = `${qA[i]},${qB[i]}`;
      jointCounts.set(key, (jointCounts.get(key) ?? 0) + 1);
    }

    let hJoint = 0;
    for (const count of jointCounts.values()) {
      const p = count / minLen;
      if (p > 0) hJoint -= p * Math.log2(p);
    }

    const mi = hA + hB - hJoint;
    const result = Math.max(0, Math.min(1, mi / Math.log2(this._binCount)));
    this._mutualInfoCache.set(cacheKey, result);
    this._mutualInfoCache.set(`${sampleIdB}|${sampleIdA}`, result);
    return result;
  }

  purgeLowEntropy(threshold = 0.2): number {
    let removed = 0;
    for (const [id, sample] of this._waste) {
      if (sample.entropy < threshold) {
        this._waste.delete(id);
        this._sequenceHistory.delete(id);
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
    this._patternTree = { count: 0, children: new Map() };
    this._sequenceHistory.clear();
    this._mutualInfoCache.clear();
  }

  get wasteCount(): number { return this._waste.size; }
  get extractedCount(): number { return this._extracted.length; }
  get totalYield(): number { return this._totalYield; }
  get binCount(): number { return this._binCount; }
  get patternTreeSize(): number { return this._countNodes(this._patternTree); }

  private _countNodes(node: PatternNode): number {
    let count = 1;
    for (const child of node.children.values()) {
      count += this._countNodes(child);
    }
    return count;
  }
}
