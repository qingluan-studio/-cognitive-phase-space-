export interface VoidResponseData {
  query: string;
  response: null;
  timestamp: number;
  emptinessWeight: number;
}

export interface ParsedVoid {
  isMeaningful: boolean;
  inferredAnswer: string;
  confidence: number;
}

export class VoidResponse {
  private _query: string;
  private _emptinessWeight: number;
  private _timestamp: number;
  private _history: VoidResponseData[];
  private _shannonEntropy: number;
  private _topologicalGenus: number;
  private _nullSpectrum: number[];

  constructor() {
    this._query = '';
    this._emptinessWeight = 0;
    this._timestamp = 0;
    this._history = [];
    this._shannonEntropy = 0;
    this._topologicalGenus = 0;
    this._nullSpectrum = [];
  }

  get emptinessWeight(): number {
    return this._emptinessWeight;
  }

  get history(): VoidResponseData[] {
    return [...this._history];
  }

  get shannonEntropy(): number {
    return this._shannonEntropy;
  }

  get topologicalGenus(): number {
    return this._topologicalGenus;
  }

  public ask(query: string): VoidResponseData {
    this._query = query;
    this._timestamp = Date.now();
    this._emptinessWeight = Math.min(this._emptinessWeight + query.length * 0.1, 100);
    this._shannonEntropy = this._computeQueryEntropy(query);
    this._topologicalGenus = this._computeGenus(query);
    this._nullSpectrum.push(this._emptinessWeight);
    if (this._nullSpectrum.length > 50) this._nullSpectrum.shift();
    const record: VoidResponseData = {
      query,
      response: null,
      timestamp: this._timestamp,
      emptinessWeight: this._emptinessWeight,
    };
    this._history.push(record);
    return record;
  }

  public parse(): ParsedVoid {
    const isMeaningful = this._emptinessWeight > 30;
    const spectralMean = this._nullSpectrum.length > 0
      ? this._nullSpectrum.reduce((a, b) => a + b, 0) / this._nullSpectrum.length
      : 0;
    const confidence = Math.min(1, this._emptinessWeight / 100 + spectralMean / 200);
    return {
      isMeaningful,
      inferredAnswer: isMeaningful ? 'silence-affirmative' : 'silence-unknown',
      confidence,
    };
  }

  public reset(): void {
    this._emptinessWeight = 0;
    this._query = '';
    this._nullSpectrum = [];
  }

  public summarize(): Record<string, unknown> {
    const avgEmptiness = this._history.reduce((s, r) => s + r.emptinessWeight, 0) / Math.max(1, this._history.length);
    return {
      totalQueries: this._history.length,
      avgEmptiness,
      lastQuery: this._query,
      shannonEntropy: this._shannonEntropy,
      topologicalGenus: this._topologicalGenus,
      nullSpectrum: [...this._nullSpectrum],
    };
  }

  public exportVoid(): string {
    return this._history.map((r) => `${r.timestamp}:∅`).join('|');
  }

  public fourierTransformSpectrum(): number[] {
    const N = this._nullSpectrum.length;
    if (N === 0) return [];
    const result: number[] = new Array(N).fill(0);
    for (let k = 0; k < N; k++) {
      let real = 0;
      let imag = 0;
      for (let n = 0; n < N; n++) {
        const angle = -2 * Math.PI * k * n / N;
        real += this._nullSpectrum[n] * Math.cos(angle);
        imag += this._nullSpectrum[n] * Math.sin(angle);
      }
      result[k] = Math.sqrt(real * real + imag * imag);
    }
    return result;
  }

  public spectralGap(): number {
    const ft = this.fourierTransformSpectrum();
    if (ft.length < 2) return 0;
    const sorted = [...ft].sort((a, b) => b - a);
    return sorted[0] - sorted[1];
  }

  private _decay(): void {
    this._emptinessWeight *= 0.95;
  }

  private _computeQueryEntropy(query: string): number {
    const freq = new Map<string, number>();
    for (const ch of query) {
      freq.set(ch, (freq.get(ch) ?? 0) + 1);
    }
    let entropy = 0;
    const len = query.length;
    for (const count of freq.values()) {
      const p = count / len;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  private _computeGenus(query: string): number {
    const brackets = query.split('').filter(c => c === '(' || c === ')' || c === '[' || c === ']' || c === '{' || c === '}');
    let genus = 0;
    let depth = 0;
    for (const b of brackets) {
      if (b === '(' || b === '[' || b === '{') depth++;
      if (b === ')' || b === ']' || b === '}') {
        if (depth > 0) depth--;
        else genus++;
      }
    }
    return genus + depth;
  }
}
