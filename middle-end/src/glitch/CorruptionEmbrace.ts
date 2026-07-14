export type CorruptionType = 'bitflip' | 'truncation' | 'duplication' | 'splicing' | 'entropy';

export interface CorruptionSample {
  id: string;
  original: string;
  corrupted: string;
  type: CorruptionType;
  diffPositions: number[];
  diffHistogram: number[];
  embracedAt: number;
}

export interface EmbracedForm {
  sampleId: string;
  newStructure: Record<string, unknown>;
  noveltyScore: number;
  shannonEntropy: number;
  generatedAt: number;
}

export class CorruptionEmbrace {
  private _samples: CorruptionSample[] = [];
  private _forms: EmbracedForm[] = [];
  private _corruptionRate = 0.05;
  private _histogramBins = 16;

  ingest(original: string, type: CorruptionType = 'bitflip'): CorruptionSample {
    const corrupted = this._applyCorruption(original, type);
    const diffPositions = this._findDiffs(original, corrupted);
    const diffHistogram = this._buildHistogram(diffPositions, original.length);
    const sample: CorruptionSample = {
      id: `corr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      original,
      corrupted,
      type,
      diffPositions,
      diffHistogram,
      embracedAt: Date.now(),
    };
    this._samples.push(sample);
    if (this._samples.length > 200) this._samples.shift();
    return sample;
  }

  embrace(sampleId: string): EmbracedForm | null {
    const sample = this._samples.find(s => s.id === sampleId);
    if (!sample) return null;
    const newStructure = this._deriveStructure(sample);
    const noveltyScore = this._scoreNovelty(sample);
    const shannonEntropy = this._shannonEntropy(sample.diffHistogram);
    const form: EmbracedForm = {
      sampleId,
      newStructure,
      noveltyScore,
      shannonEntropy,
      generatedAt: Date.now(),
    };
    this._forms.push(form);
    if (this._forms.length > 100) this._forms.shift();
    return form;
  }

  private _applyCorruption(data: string, type: CorruptionType): string {
    const chars = data.split('');
    switch (type) {
      case 'bitflip':
        for (let i = 0; i < chars.length; i++) {
          if (Math.random() < this._corruptionRate) {
            const code = chars[i].charCodeAt(0);
            const bit = 1 << Math.floor(Math.random() * 7);
            chars[i] = String.fromCharCode(code ^ bit);
          }
        }
        return chars.join('');
      case 'truncation':
        return data.slice(0, Math.max(1, Math.floor(data.length * (1 - this._corruptionRate))));
      case 'duplication':
        return chars.map(c => Math.random() < this._corruptionRate ? c + c : c).join('');
      case 'splicing': {
        if (chars.length < 4) return data;
        const mid = Math.floor(chars.length / 2);
        return chars.slice(mid).join('') + chars.slice(0, mid).join('');
      }
      case 'entropy':
        return chars.map(c => Math.random() < this._corruptionRate
          ? String.fromCharCode(33 + Math.floor(Math.random() * 94))
          : c).join('');
    }
  }

  private _findDiffs(a: string, b: string): number[] {
    const diffs: number[] = [];
    const max = Math.max(a.length, b.length);
    for (let i = 0; i < max; i++) {
      if (a[i] !== b[i]) diffs.push(i);
    }
    return diffs;
  }

  private _buildHistogram(positions: number[], totalLength: number): number[] {
    const bins = new Array(this._histogramBins).fill(0);
    if (totalLength === 0) return bins;
    for (const pos of positions) {
      const binIdx = Math.min(this._histogramBins - 1, Math.floor(pos / totalLength * this._histogramBins));
      bins[binIdx]++;
    }
    return bins;
  }

  private _deriveStructure(sample: CorruptionSample): Record<string, unknown> {
    return {
      type: sample.type,
      diffCount: sample.diffPositions.length,
      length: sample.corrupted.length,
      head: sample.corrupted.slice(0, 8),
      tail: sample.corrupted.slice(-8),
      diffHistogram: sample.diffHistogram,
      centroid: this._histogramCentroid(sample.diffHistogram),
      coverage: sample.diffPositions.length / Math.max(1, sample.original.length),
    };
  }

  private _histogramCentroid(histogram: number[]): number {
    const total = histogram.reduce((s, v) => s + v, 0);
    if (total === 0) return 0;
    let weighted = 0;
    for (let i = 0; i < histogram.length; i++) {
      weighted += i * histogram[i];
    }
    return weighted / total / histogram.length;
  }

  private _scoreNovelty(sample: CorruptionSample): number {
    const ratio = sample.diffPositions.length / Math.max(1, sample.original.length);
    const uniformity = this._histogramUniformity(sample.diffHistogram);
    return Math.min(1, ratio * 3 + uniformity * 2);
  }

  private _histogramUniformity(histogram: number[]): number {
    const total = histogram.reduce((s, v) => s + v, 0);
    if (total === 0) return 0;
    const expected = total / histogram.length;
    const chiSquare = histogram.reduce((s, v) => s + (v - expected) ** 2 / expected, 0);
    return 1 - Math.min(1, chiSquare / (histogram.length * 2));
  }

  private _shannonEntropy(histogram: number[]): number {
    const total = histogram.reduce((s, v) => s + v, 0);
    if (total === 0) return 0;
    let entropy = 0;
    for (const count of histogram) {
      if (count === 0) continue;
      const p = count / total;
      entropy -= p * Math.log2(p);
    }
    return entropy / Math.log2(histogram.length);
  }

  setCorruptionRate(rate: number): void {
    this._corruptionRate = Math.max(0, Math.min(1, rate));
  }

  getSamples(): CorruptionSample[] { return [...this._samples]; }
  getForms(): EmbracedForm[] { return [...this._forms]; }
  get sampleCount(): number { return this._samples.length; }
  get averageNovelty(): number {
    if (this._forms.length === 0) return 0;
    return this._forms.reduce((s, f) => s + f.noveltyScore, 0) / this._forms.length;
  }
}
