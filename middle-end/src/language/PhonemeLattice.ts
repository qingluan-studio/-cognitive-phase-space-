export interface Phoneme {
  symbol: string;
  features: number[];
  sonority: number;
}

export interface Syllable {
  onset: string[];
  nucleus: string;
  coda: string[];
  weight: number;
}

export class PhonemeLattice {
  private _phonemes: Map<string, Phoneme>;
  private _constraints: { pattern: RegExp; weight: number }[];
  private _syllables: Syllable[];
  private _history: string[];

  constructor() {
    this._phonemes = new Map();
    this._constraints = [];
    this._syllables = [];
    this._history = [];
  }

  get phonemeCount(): number { return this._phonemes.size; }
  get constraintCount(): number { return this._constraints.length; }
  get syllableCount(): number { return this._syllables.length; }

  public addPhoneme(symbol: string, features: number[], sonority: number): void {
    this._phonemes.set(symbol, { symbol, features, sonority });
  }

  public addConstraint(pattern: RegExp, weight: number): void {
    this._constraints.push({ pattern, weight });
  }

  public computeSonority(sequence: string[]): number[] {
    return sequence.map(s => this._phonemes.get(s)?.sonority || 0);
  }

  public isSonorityRising(sequence: string[]): boolean {
    const sonorities = this.computeSonority(sequence);
    for (let i = 1; i < sonorities.length; i++) {
      if (sonorities[i] < sonorities[i - 1]) return false;
    }
    return true;
  }

  public findSyllableBoundaries(sequence: string[]): number[] {
    const boundaries: number[] = [0];
    const sonorities = this.computeSonority(sequence);
    for (let i = 1; i < sequence.length - 1; i++) {
      if (sonorities[i] > sonorities[i - 1] && sonorities[i] > sonorities[i + 1]) {
        boundaries.push(i);
      }
    }
    boundaries.push(sequence.length);
    return boundaries;
  }

  public syllabify(sequence: string[]): Syllable[] {
    const boundaries = this.findSyllableBoundaries(sequence);
    const syllables: Syllable[] = [];
    for (let i = 0; i < boundaries.length - 1; i++) {
      const start = boundaries[i];
      const end = boundaries[i + 1];
      const slice = sequence.slice(start, end);
      const peakIndex = slice.reduce((bestIdx, s, idx, arr) => {
        const son = this._phonemes.get(s)?.sonority || 0;
        const bestSon = this._phonemes.get(arr[bestIdx])?.sonority || 0;
        return son > bestSon ? idx : bestIdx;
      }, 0);
      const onset = slice.slice(0, peakIndex);
      const nucleus = slice[peakIndex];
      const coda = slice.slice(peakIndex + 1);
      const weight = onset.length + coda.length * 2;
      syllables.push({ onset, nucleus, coda, weight });
    }
    this._syllables = syllables;
    return syllables.map(s => ({ ...s, onset: [...s.onset], coda: [...s.coda] }));
  }

  public computeViolationScore(sequence: string[]): number {
    const str = sequence.join('');
    let score = 0;
    for (const constraint of this._constraints) {
      const matches = str.match(constraint.pattern);
      if (matches) {
        score += matches.length * constraint.weight;
      }
    }
    return score;
  }

  public generateCandidates(base: string[], mutations: number = 10): string[][] {
    const candidates: string[][] = [];
    const phonemes = Array.from(this._phonemes.keys());
    for (let m = 0; m < mutations; m++) {
      const candidate = [...base];
      const idx = Math.floor(Math.random() * candidate.length);
      const op = Math.random();
      if (op < 0.33) {
        candidate[idx] = phonemes[Math.floor(Math.random() * phonemes.length)];
      } else if (op < 0.66) {
        candidate.splice(idx, 0, phonemes[Math.floor(Math.random() * phonemes.length)]);
      } else {
        candidate.splice(idx, 1);
      }
      candidates.push(candidate);
    }
    return candidates;
  }

  public optimizeForm(base: string[], iterations: number = 50): string[] {
    let best = [...base];
    let bestScore = this.computeViolationScore(best);
    for (let i = 0; i < iterations; i++) {
      const candidates = this.generateCandidates(best, 5);
      for (const candidate of candidates) {
        const score = this.computeViolationScore(candidate);
        if (score < bestScore) {
          bestScore = score;
          best = candidate;
        }
      }
    }
    this._history.push(best.join(''));
    return best;
  }

  public computeFeatureDistance(a: string, b: string): number {
    const fa = this._phonemes.get(a)?.features;
    const fb = this._phonemes.get(b)?.features;
    if (!fa || !fb) return Infinity;
    let dist = 0;
    for (let i = 0; i < fa.length; i++) {
      dist += Math.abs(fa[i] - fb[i]);
    }
    return dist;
  }

  public findMinimalPair(wordA: string[], wordB: string[]): number {
    if (wordA.length !== wordB.length) return -1;
    let diffCount = 0;
    let diffIndex = -1;
    for (let i = 0; i < wordA.length; i++) {
      if (wordA[i] !== wordB[i]) {
        diffCount++;
        diffIndex = i;
      }
    }
    return diffCount === 1 ? diffIndex : -1;
  }

  public computeRhymeStrength(wordA: string[], wordB: string[]): number {
    const sylA = this.syllabify(wordA);
    const sylB = this.syllabify(wordB);
    if (sylA.length === 0 || sylB.length === 0) return 0;
    const lastA = sylA[sylA.length - 1];
    const lastB = sylB[sylB.length - 1];
    const rhymeA = [lastA.nucleus, ...lastA.coda];
    const rhymeB = [lastB.nucleus, ...lastB.coda];
    const minLen = Math.min(rhymeA.length, rhymeB.length);
    let matches = 0;
    for (let i = 0; i < minLen; i++) {
      if (rhymeA[rhymeA.length - 1 - i] === rhymeB[rhymeB.length - 1 - i]) matches++;
    }
    return matches / Math.max(rhymeA.length, rhymeB.length);
  }

  public reset(): void {
    this._phonemes.clear();
    this._constraints = [];
    this._syllables = [];
    this._history = [];
  }

  public exportPhonemes(): Phoneme[] {
    return Array.from(this._phonemes.values()).map(p => ({ ...p, features: [...p.features] }));
  }
}
