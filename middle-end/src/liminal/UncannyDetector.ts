export interface UncannyPattern {
  id: string;
  feature: string;
  score: number;
  sample: string;
}

export interface UncannyReport {
  totalScore: number;
  patterns: UncannyPattern[];
  isUncanny: boolean;
  valleyDepth: number;
}

export type Sensitivity = 'relaxed' | 'normal' | 'paranoid';

export class UncannyDetector {
  private _patterns: UncannyPattern[] = [];
  private _registry: Map<string, (score: number) => boolean> = new Map();
  private _threshold: number = 0.7;
  private _sensitivity: Sensitivity = 'normal';
  private _calibrationOffset: number = 0;
  private _featureMeans: number[] = [0.3, 0.25, 0.4, 0.5];
  private _featureCovariances: number[][] = [
    [0.1, 0.02, 0.01, 0.03],
    [0.02, 0.08, 0.015, 0.02],
    [0.01, 0.015, 0.12, 0.04],
    [0.03, 0.02, 0.04, 0.15],
  ];
  private _featureHistory: number[][] = [];

  registerPattern(id: string, detector: (score: number) => boolean): void {
    this._registry.set(id, detector);
  }

  scan(content: string): UncannyPattern[] {
    const hits: UncannyPattern[] = [];
    const features = ['overPolite', 'excessiveEmpathy', 'mechanicalRhythm', 'uncannyFluency'];
    const scores: number[] = [];
    for (const feature of features) {
      const score = this._score(content, feature);
      scores.push(score);
      const detector = this._registry.get(feature);
      const triggered = detector ? detector(score) : score > this._threshold;
      if (triggered) {
        const pattern: UncannyPattern = {
          id: `p-${feature}-${Date.now()}`,
          feature,
          score,
          sample: content.slice(0, 64),
        };
        hits.push(pattern);
        this._patterns.push(pattern);
      }
    }
    this._featureHistory.push(scores);
    if (this._featureHistory.length > 100) this._featureHistory.shift();
    return hits;
  }

  detect(content: string): UncannyReport {
    const patterns = this.scan(content);
    const featureNames = ['overPolite', 'excessiveEmpathy', 'mechanicalRhythm', 'uncannyFluency'];
    const featureScores = featureNames.map(f => this._score(content, f));
    const mahalanobis = this._mahalanobisDistance(featureScores);
    const entropy = this._shannonEntropy(content);
    const semanticDensity = this._semanticDensity(content);
    const composite = this._compositeScore(mahalanobis, entropy, semanticDensity, patterns);
    const adjusted = composite + this._calibrationOffset;
    const valleyDepth = this._valleyDepthFunction(adjusted);
    return {
      totalScore: adjusted,
      patterns,
      isUncanny: adjusted >= this._threshold,
      valleyDepth,
    };
  }

  evaluateUncanny(report: UncannyReport): 'safe' | 'eerie' | 'repulsive' {
    if (!report.isUncanny) return 'safe';
    if (report.valleyDepth > 0.5) return 'repulsive';
    return 'eerie';
  }

  calibrate(offset: number): void {
    this._calibrationOffset = offset;
  }

  setSensitivity(level: Sensitivity): void {
    this._sensitivity = level;
    this._threshold = level === 'relaxed' ? 0.9 : level === 'paranoid' ? 0.5 : 0.7;
  }

  getReport(): { totalScans: number; threshold: number; sensitivity: Sensitivity } {
    return {
      totalScans: this._patterns.length,
      threshold: this._threshold,
      sensitivity: this._sensitivity,
    };
  }

  get patterns(): UncannyPattern[] {
    return [...this._patterns];
  }

  get featureHistory(): number[][] {
    return [...this._featureHistory];
  }

  private _score(content: string, feature: string): number {
    const len = content.length;
    if (len === 0) return 0;
    switch (feature) {
      case 'overPolite':
        return Math.min(1, (content.match(/please|thank|sorry|apologize|regret/gi)?.length ?? 0) / (len / 80));
      case 'excessiveEmpathy':
        return Math.min(1, (content.match(/understand|feel|empathy|sympathize|relate/gi)?.length ?? 0) / (len / 80));
      case 'mechanicalRhythm': {
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
        if (sentences.length < 3) return 0;
        const lengths = sentences.map(s => s.trim().length);
        const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
        const variance = lengths.reduce((a, b) => a + (b - mean) ** 2, 0) / lengths.length;
        const cv = Math.sqrt(variance) / (mean || 1);
        return Math.min(1, 1 - cv);
      }
      case 'uncannyFluency': {
        const uniqueWords = new Set(content.toLowerCase().match(/\b\w+\b/g) ?? []).size;
        const totalWords = content.match(/\b\w+\b/g)?.length ?? 1;
        const ttr = uniqueWords / totalWords;
        const perfectCurve = Math.exp(-Math.pow((len - 300) / 200, 2));
        return Math.min(1, (1 - ttr) * 0.5 + perfectCurve * 0.5);
      }
      default:
        return 0;
    }
  }

  private _mahalanobisDistance(vector: number[]): number {
    const n = vector.length;
    const diff: number[] = [];
    for (let i = 0; i < n; i++) diff.push(vector[i] - this._featureMeans[i]);
    const invCov = this._invertMatrix(this._featureCovariances);
    if (!invCov) return 0;
    let temp: number[] = [];
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < n; j++) sum += diff[j] * invCov[j][i];
      temp.push(sum);
    }
    let distance = 0;
    for (let i = 0; i < n; i++) distance += diff[i] * temp[i];
    return Math.sqrt(Math.max(0, distance));
  }

  private _invertMatrix(matrix: number[][]): number[][] | null {
    const n = matrix.length;
    const augmented: number[][] = [];
    for (let i = 0; i < n; i++) {
      augmented.push([...matrix[i], ...Array(n).fill(0)]);
      augmented[i][n + i] = 1;
    }
    for (let i = 0; i < n; i++) {
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) maxRow = k;
      }
      [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
      const pivot = augmented[i][i];
      if (Math.abs(pivot) < 1e-10) return null;
      for (let j = 0; j < 2 * n; j++) augmented[i][j] /= pivot;
      for (let k = 0; k < n; k++) {
        if (k === i) continue;
        const factor = augmented[k][i];
        for (let j = 0; j < 2 * n; j++) augmented[k][j] -= factor * augmented[i][j];
      }
    }
    const inverse: number[][] = [];
    for (let i = 0; i < n; i++) inverse.push(augmented[i].slice(n));
    return inverse;
  }

  private _shannonEntropy(content: string): number {
    const freq: Record<string, number> = {};
    const chars = content.toLowerCase().replace(/\s/g, '');
    for (const c of chars) freq[c] = (freq[c] || 0) + 1;
    const total = chars.length || 1;
    let entropy = 0;
    for (const c in freq) {
      const p = freq[c] / total;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    return entropy / Math.log2(26);
  }

  private _semanticDensity(content: string): number {
    const words = content.match(/\b\w+\b/g) ?? [];
    if (words.length === 0) return 0;
    const syllableEstimate = words.reduce((sum, w) => sum + Math.max(1, w.match(/[aeiouy]/gi)?.length ?? 1), 0);
    const avgSyllables = syllableEstimate / words.length;
    const longWords = words.filter(w => w.length > 6).length / words.length;
    return Math.min(1, (avgSyllables / 3) * 0.4 + longWords * 0.6);
  }

  private _compositeScore(mahalanobis: number, entropy: number, density: number, patterns: UncannyPattern[]): number {
    const patternScore = patterns.reduce((s, p) => s + p.score, 0) / 4;
    const normalizedMahal = Math.min(1, mahalanobis / 3);
    const entropyDeviation = Math.abs(entropy - 0.6) * 2;
    return normalizedMahal * 0.35 + patternScore * 0.35 + entropyDeviation * 0.15 + density * 0.15;
  }

  private _valleyDepthFunction(score: number): number {
    if (score <= 0.5) return 0;
    if (score >= 1) return 0;
    const peak = 0.75;
    const width = 0.25;
    return Math.max(0, 1 - Math.pow((score - peak) / width, 2));
  }
}
