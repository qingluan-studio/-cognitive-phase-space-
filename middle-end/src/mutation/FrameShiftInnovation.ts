export interface FrameShiftRecord {
  id: string;
  source: string;
  shiftType: 'insertion' | 'deletion';
  position: number;
  segment: string;
  newFrame: string;
  readingFrameOffset: number;
  noveltyScore: number;
  createdAt: number;
}

export class FrameShiftInnovation {
  private _records: FrameShiftRecord[] = [];
  private _insertPool: string[] = ['xyz', 'abc', '123', 'qq', 'zz', 'rr'];
  private _frameSize: number = 3;
  private _maxRecords: number = 200;
  private _jukesCantorAlpha: number = 0.01;
  private _sequenceComplexityCache: Map<string, number> = new Map();

  insertShift(source: string, position?: number): FrameShiftRecord | null {
    if (source.length === 0) return null;
    const pos = Math.min(source.length, position ?? Math.floor(Math.random() * source.length));
    const segment = this._insertPool[Math.floor(Math.random() * this._insertPool.length)];
    const newFrame = source.slice(0, pos) + segment + source.slice(pos);
    const offset = segment.length % this._frameSize;
    const novelty = this._computeNovelty(source, newFrame);
    const record: FrameShiftRecord = {
      id: `fs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      source,
      shiftType: 'insertion',
      position: pos,
      segment,
      newFrame,
      readingFrameOffset: offset,
      noveltyScore: novelty,
      createdAt: Date.now(),
    };
    this._records.push(record);
    if (this._records.length > this._maxRecords) this._records.shift();
    return record;
  }

  deleteShift(source: string, length?: number): FrameShiftRecord | null {
    if (source.length < 2) return null;
    const delLen = Math.min(source.length - 1, length ?? Math.floor(Math.random() * 3) + 1);
    const pos = Math.floor(Math.random() * (source.length - delLen + 1));
    const segment = source.slice(pos, pos + delLen);
    const newFrame = source.slice(0, pos) + source.slice(pos + delLen);
    const offset = (this._frameSize - (delLen % this._frameSize)) % this._frameSize;
    const novelty = this._computeNovelty(source, newFrame);
    const record: FrameShiftRecord = {
      id: `fs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      source,
      shiftType: 'deletion',
      position: pos,
      segment,
      newFrame,
      readingFrameOffset: offset,
      noveltyScore: novelty,
      createdAt: Date.now(),
    };
    this._records.push(record);
    if (this._records.length > this._maxRecords) this._records.shift();
    return record;
  }

  compareFrames(original: string, shifted: string): number {
    const minLen = Math.min(original.length, shifted.length);
    let diffs = 0;
    for (let i = 0; i < minLen; i++) {
      if (original[i] !== shifted[i]) diffs++;
    }
    diffs += Math.abs(original.length - shifted.length);
    return diffs;
  }

  extractCodons(source: string, startFrame: number = 0): string[] {
    const codons: string[] = [];
    for (let i = startFrame; i + this._frameSize <= source.length; i += this._frameSize) {
      codons.push(source.slice(i, i + this._frameSize));
    }
    return codons;
  }

  computeFrameDivergence(original: string, shifted: string): number {
    const origCodons = this.extractCodons(original);
    const shiftedCodons = this.extractCodons(shifted);
    const origSet = new Set(origCodons);
    const shiftedSet = new Set(shiftedCodons);
    const intersection = [...origSet].filter((c) => shiftedSet.has(c)).length;
    const union = new Set([...origSet, ...shiftedSet]).size;
    if (union === 0) return 0;
    return 1 - intersection / union;
  }

  computeJukesCantorDistance(original: string, shifted: string): number {
    const p = this.compareFrames(original, shifted) / Math.max(original.length, shifted.length);
    if (p >= 0.75) return Infinity;
    return -0.75 * Math.log(1 - (4 / 3) * p);
  }

  computeSequenceComplexity(source: string): number {
    if (this._sequenceComplexityCache.has(source)) {
      return this._sequenceComplexityCache.get(source)!;
    }
    const n = source.length;
    if (n === 0) return 0;
    const substrings: Map<string, number> = new Map();
    for (let len = 1; len <= Math.min(3, n); len++) {
      for (let i = 0; i + len <= n; i++) {
        const sub = source.slice(i, i + len);
        substrings.set(sub, (substrings.get(sub) ?? 0) + 1);
      }
    }
    let entropy = 0;
    const total = n * Math.min(3, n);
    for (const count of substrings.values()) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }
    this._sequenceComplexityCache.set(source, entropy);
    return entropy;
  }

  computeAverageNovelty(): number {
    if (this._records.length === 0) return 0;
    const sum = this._records.reduce((s, r) => s + r.noveltyScore, 0);
    return sum / this._records.length;
  }

  computeInsertionDeletionRatio(): number {
    const insertions = this._records.filter((r) => r.shiftType === 'insertion').length;
    const deletions = this._records.length - insertions;
    if (deletions === 0) return insertions > 0 ? Infinity : 0;
    return insertions / deletions;
  }

  setInsertPool(segments: string[]): void {
    this._insertPool = segments;
  }

  setFrameSize(size: number): void {
    this._frameSize = Math.max(1, size);
  }

  getRecord(id: string): FrameShiftRecord | null {
    return this._records.find((r) => r.id === id) ?? null;
  }

  getRecords(limit: number = 50): FrameShiftRecord[] {
    return this._records.slice(-limit);
  }

  get totalShifts(): number {
    return this._records.length;
  }

  get jukesCantorAlpha(): number {
    return this._jukesCantorAlpha;
  }

  private _computeNovelty(original: string, shifted: string): number {
    const origFreq: Record<string, number> = {};
    const shiftFreq: Record<string, number> = {};
    for (const ch of original) origFreq[ch] = (origFreq[ch] ?? 0) + 1;
    for (const ch of shifted) shiftFreq[ch] = (shiftFreq[ch] ?? 0) + 1;
    const chars = new Set([...Object.keys(origFreq), ...Object.keys(shiftFreq)]);
    let klDiv = 0;
    const origLen = original.length || 1;
    const shiftLen = shifted.length || 1;
    for (const ch of chars) {
      const p = (origFreq[ch] ?? 0) / origLen;
      const q = (shiftFreq[ch] ?? 0) / shiftLen;
      if (p > 0 && q > 0) {
        klDiv += p * Math.log(p / q);
      }
    }
    return Math.min(1, Math.abs(klDiv));
  }
}
