/**
 * 腐化拥抱：接受并利用数据损坏产生新形式。
 * 不修复损坏的字节，而是将其视为新形态的种子，从中衍生出新的数据结构。
 */

export type CorruptionType = 'bitflip' | 'truncation' | 'duplication' | 'splicing' | 'entropy';

export interface CorruptionSample {
  id: string;
  original: string;
  corrupted: string;
  type: CorruptionType;
  diffPositions: number[];
  embracedAt: number;
}

export interface EmbracedForm {
  sampleId: string;
  newStructure: Record<string, unknown>;
  noveltyScore: number;
  generatedAt: number;
}

export class CorruptionEmbrace {
  private _samples: CorruptionSample[] = [];
  private _forms: EmbracedForm[] = [];
  private _corruptionRate = 0.05;

  ingest(original: string, type: CorruptionType = 'bitflip'): CorruptionSample {
    const corrupted = this._applyCorruption(original, type);
    const diffPositions = this._findDiffs(original, corrupted);
    const sample: CorruptionSample = {
      id: `corr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      original,
      corrupted,
      type,
      diffPositions,
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
    const form: EmbracedForm = {
      sampleId,
      newStructure,
      noveltyScore,
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
            chars[i] = String.fromCharCode(chars[i].charCodeAt(0) ^ (1 << Math.floor(Math.random() * 7)));
          }
        }
        return chars.join('');
      case 'truncation':
        return data.slice(0, Math.max(1, Math.floor(data.length * (1 - this._corruptionRate))));
      case 'duplication':
        return chars.map(c => Math.random() < this._corruptionRate ? c + c : c).join('');
      case 'splicing':
        if (chars.length < 4) return data;
        const mid = Math.floor(chars.length / 2);
        return chars.slice(mid).join('') + chars.slice(0, mid).join('');
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

  private _deriveStructure(sample: CorruptionSample): Record<string, unknown> {
    return {
      type: sample.type,
      diffCount: sample.diffPositions.length,
      length: sample.corrupted.length,
      head: sample.corrupted.slice(0, 8),
      tail: sample.corrupted.slice(-8),
    };
  }

  private _scoreNovelty(sample: CorruptionSample): number {
    const ratio = sample.diffPositions.length / Math.max(1, sample.original.length);
    return Math.min(1, ratio * 5);
  }

  setCorruptionRate(rate: number): void {
    this._corruptionRate = Math.max(0, Math.min(1, rate));
  }

  getSamples(): CorruptionSample[] {
    return [...this._samples];
  }

  getForms(): EmbracedForm[] {
    return [...this._forms];
  }

  get sampleCount(): number {
    return this._samples.length;
  }
}
