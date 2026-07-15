export interface TasteState {
  culturalResonance: number;
  individualDeviation: number;
  harmonicSeries: number[];
  dissonanceTolerance: number;
  preferenceEntropy: number;
}

export class TasteHarmonics {
  private _culturalResonance: number;
  private _individualDeviation: number;
  private _harmonicSeries: number[];
  private _dissonanceTolerance: number;
  private _preferenceEntropy: number;
  private _history: TasteState[];

  constructor() {
    this._culturalResonance = 0.5;
    this._individualDeviation = 0.1;
    this._harmonicSeries = [1, 2, 3, 4, 5];
    this._dissonanceTolerance = 0.3;
    this._preferenceEntropy = 1.0;
    this._history = [];
  }

  get culturalResonance(): number { return this._culturalResonance; }
  get individualDeviation(): number { return this._individualDeviation; }
  get dissonanceTolerance(): number { return this._dissonanceTolerance; }
  get preferenceEntropy(): number { return this._preferenceEntropy; }

  public calculateResonance(fundamental: number, overtones: number[]): number {
    let resonance = 0;
    for (const o of overtones) {
      const ratio = o / fundamental;
      const integerPart = Math.round(ratio);
      const detune = Math.abs(ratio - integerPart);
      resonance += 1 / (1 + detune * 100);
    }
    resonance /= overtones.length;
    this._culturalResonance = resonance;
    this._recordState();
    return resonance;
  }

  public individualTasteSpectrum(communityAverage: number[], personalScores: number[]): number {
    if (communityAverage.length !== personalScores.length) return 0;
    let deviation = 0;
    for (let i = 0; i < communityAverage.length; i++) {
      deviation += Math.pow(personalScores[i] - communityAverage[i], 2);
    }
    deviation = Math.sqrt(deviation / communityAverage.length);
    this._individualDeviation = deviation;
    this._recordState();
    return deviation;
  }

  public generateHarmonicSeries(fundamental: number, count: number): number[] {
    const series: number[] = [];
    for (let n = 1; n <= count; n++) {
      series.push(fundamental * n);
    }
    this._harmonicSeries = series;
    this._recordState();
    return series;
  }

  public beatFrequency(freqA: number, freqB: number): number {
    return Math.abs(freqA - freqB);
  }

  public consonanceIndex(intervalRatio: number): number {
    const tolerance = 0.02;
    const justIntervals = [1, 16 / 15, 9 / 8, 6 / 5, 5 / 4, 4 / 3, 3 / 2, 8 / 5, 5 / 3, 16 / 9, 15 / 8, 2];
    let minDist = Infinity;
    for (const ji of justIntervals) {
      const dist = Math.abs(intervalRatio - ji);
      if (dist < minDist) minDist = dist;
    }
    const consonance = 1 / (1 + minDist / tolerance);
    return consonance;
  }

  public temperamentError(equalTempered: number, justIntonation: number): number {
    const cents = 1200 * Math.log2(equalTempered / justIntonation);
    return cents;
  }

  public culturalDrift(initialTaste: number[], generations: number, mutationRate: number): number[][] {
    const history: number[][] = [initialTaste];
    let current = [...initialTaste];
    for (let g = 0; g < generations; g++) {
      for (let i = 0; i < current.length; i++) {
        if (Math.random() < mutationRate) {
          current[i] += (Math.random() - 0.5) * 0.1;
          current[i] = Math.max(0, Math.min(1, current[i]));
        }
      }
      history.push([...current]);
    }
    return history;
  }

  public preferenceDistributionEntropy(preferences: number[]): number {
    const total = preferences.reduce((a, b) => a + b, 0);
    if (total === 0) return 0;
    let entropy = 0;
    for (const p of preferences) {
      const prob = p / total;
      if (prob > 0) entropy -= prob * Math.log2(prob);
    }
    this._preferenceEntropy = entropy;
    this._recordState();
    return entropy;
  }

  public dissonanceProfile(frequencies: number[], amplitudes: number[]): number {
    let dissonance = 0;
    for (let i = 0; i < frequencies.length; i++) {
      for (let j = i + 1; j < frequencies.length; j++) {
        const diff = Math.abs(frequencies[i] - frequencies[j]);
        const maxFreq = Math.max(frequencies[i], frequencies[j]);
        const roughness = amplitudes[i] * amplitudes[j] * (Math.exp(-3.5 * diff / 0.5) - Math.exp(-3.5 * (diff + 0.5) / 0.5));
        dissonance += Math.max(0, roughness);
      }
    }
    this._dissonanceTolerance = Math.tanh(dissonance);
    this._recordState();
    return dissonance;
  }

  public spectralCentroid(frequencies: number[], magnitudes: number[]): number {
    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < frequencies.length; i++) {
      numerator += frequencies[i] * magnitudes[i];
      denominator += magnitudes[i];
    }
    return numerator / (denominator + 0.0001);
  }

  public tasteClustering(tastes: number[][], k: number): number[][] {
    const centroids: number[][] = tastes.slice(0, k).map(t => [...t]);
    const assignments: number[] = new Array(tastes.length).fill(0);
    for (let iter = 0; iter < 20; iter++) {
      for (let i = 0; i < tastes.length; i++) {
        let bestDist = Infinity;
        let bestK = 0;
        for (let c = 0; c < k; c++) {
          let dist = 0;
          for (let d = 0; d < tastes[i].length; d++) {
            dist += Math.pow(tastes[i][d] - centroids[c][d], 2);
          }
          if (dist < bestDist) {
            bestDist = dist;
            bestK = c;
          }
        }
        assignments[i] = bestK;
      }
      for (let c = 0; c < k; c++) {
        const cluster = tastes.filter((_, i) => assignments[i] === c);
        if (cluster.length === 0) continue;
        for (let d = 0; d < centroids[c].length; d++) {
          centroids[c][d] = cluster.reduce((sum, t) => sum + t[d], 0) / cluster.length;
        }
      }
    }
    return centroids;
  }

  public reset(): void {
    this._culturalResonance = 0.5;
    this._individualDeviation = 0.1;
    this._harmonicSeries = [1, 2, 3, 4, 5];
    this._dissonanceTolerance = 0.3;
    this._preferenceEntropy = 1.0;
    this._history = [];
  }

  private _recordState(): void {
    this._history.push({
      culturalResonance: this._culturalResonance,
      individualDeviation: this._individualDeviation,
      harmonicSeries: [...this._harmonicSeries],
      dissonanceTolerance: this._dissonanceTolerance,
      preferenceEntropy: this._preferenceEntropy
    });
  }

  public getHistory(): TasteState[] {
    return this._history;
  }
}
