export interface Pattern {
  id: string;
  features: number[];
  label: string;
  frequency: number;
}

export interface RecognitionResult {
  patternId: string;
  similarity: number;
  confidence: number;
  features: number[];
}

export class PatternRecognition {
  private _patterns: Map<string, Pattern>;
  private _prototype: number[];
  private _featureWeights: number[];
  private _threshold: number;
  private _history: RecognitionResult[];
  private _noiseLevel: number;

  constructor(featureDim: number, threshold: number = 0.8) {
    this._patterns = new Map();
    this._prototype = new Array(featureDim).fill(0);
    this._featureWeights = new Array(featureDim).fill(1.0);
    this._threshold = threshold;
    this._history = [];
    this._noiseLevel = 0.05;
  }

  get patternCount(): number { return this._patterns.size; }
  get featureDim(): number { return this._prototype.length; }
  get threshold(): number { return this._threshold; }
  get history(): RecognitionResult[] { return this._history; }

  public setThreshold(t: number): void {
    this._threshold = t;
  }

  public setNoiseLevel(n: number): void {
    this._noiseLevel = n;
  }

  public learnPattern(id: string, features: number[], label: string): void {
    const normalized = this._normalize(features);
    const pattern: Pattern = {
      id,
      features: normalized,
      label,
      frequency: 1
    };
    if (this._patterns.has(id)) {
      pattern.frequency = this._patterns.get(id)!.frequency + 1;
      for (let i = 0; i < normalized.length; i++) {
        pattern.features[i] = (this._patterns.get(id)!.features[i] * (pattern.frequency - 1) + normalized[i]) / pattern.frequency;
      }
    }
    this._patterns.set(id, pattern);
    this._updatePrototype();
  }

  private _normalize(features: number[]): number[] {
    const norm = Math.sqrt(features.reduce((sum, v) => sum + v * v, 0));
    return norm > 0 ? features.map(v => v / norm) : features;
  }

  private _updatePrototype(): void {
    const dim = this._prototype.length;
    this._prototype = new Array(dim).fill(0);
    for (const pattern of this._patterns.values()) {
      for (let i = 0; i < dim; i++) {
        this._prototype[i] += pattern.features[i];
      }
    }
    const count = this._patterns.size;
    if (count > 0) {
      for (let i = 0; i < dim; i++) {
        this._prototype[i] /= count;
      }
    }
  }

  public recognize(features: number[]): RecognitionResult | null {
    const normalized = this._normalize(features);
    let bestId: string | null = null;
    let bestSim = this._threshold;
    for (const [id, pattern] of this._patterns) {
      const sim = this._weightedSimilarity(normalized, pattern.features);
      if (sim > bestSim) {
        bestSim = sim;
        bestId = id;
      }
    }
    if (bestId) {
      const result: RecognitionResult = {
        patternId: bestId,
        similarity: bestSim,
        confidence: bestSim,
        features: [...normalized]
      };
      this._history.push(result);
      return result;
    }
    return null;
  }

  private _weightedSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i] * this._featureWeights[i];
      normA += a[i] * a[i] * this._featureWeights[i];
      normB += b[i] * b[i] * this._featureWeights[i];
    }
    return normA > 0 && normB > 0 ? dot / Math.sqrt(normA * normB) : 0;
  }

  public extractFeatures(rawInput: number[][]): number[] {
    const features: number[] = [];
    const flat = rawInput.flat();
    const mean = flat.reduce((sum, v) => sum + v, 0) / flat.length;
    const variance = flat.reduce((sum, v) => sum + (v - mean) ** 2, 0) / flat.length;
    features.push(mean, variance);
    for (let i = 1; i < flat.length; i++) {
      features.push(flat[i] - flat[i - 1]);
    }
    return features.slice(0, this._prototype.length);
  }

  public computeDistances(features: number[]): Map<string, number> {
    const normalized = this._normalize(features);
    const distances = new Map<string, number>();
    for (const [id, pattern] of this._patterns) {
      distances.set(id, 1 - this._weightedSimilarity(normalized, pattern.features));
    }
    return distances;
  }

  public kNearestNeighbors(features: number[], k: number = 3): RecognitionResult[] {
    const normalized = this._normalize(features);
    const similarities: { id: string; sim: number }[] = [];
    for (const [id, pattern] of this._patterns) {
      similarities.push({ id, sim: this._weightedSimilarity(normalized, pattern.features) });
    }
    similarities.sort((a, b) => b.sim - a.sim);
    return similarities.slice(0, k).map(s => ({
      patternId: s.id,
      similarity: s.sim,
      confidence: s.sim,
      features: [...normalized]
    }));
  }

  public computeFeatureImportance(): number[] {
    const importance = new Array(this._prototype.length).fill(0);
    const ids = Array.from(this._patterns.keys());
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = this._patterns.get(ids[i])!.features;
        const b = this._patterns.get(ids[j])!.features;
        for (let f = 0; f < a.length; f++) {
          importance[f] += Math.abs(a[f] - b[f]);
        }
      }
    }
    const maxImp = Math.max(...importance, 0.001);
    return importance.map(v => v / maxImp);
  }

  public updateFeatureWeights(): void {
    this._featureWeights = this.computeFeatureImportance();
  }

  public addNoise(features: number[]): number[] {
    return features.map(v => v + (Math.random() - 0.5) * 2 * this._noiseLevel);
  }

  public computePrototypeDistance(features: number[]): number {
    const normalized = this._normalize(features);
    return 1 - this._weightedSimilarity(normalized, this._prototype);
  }

  public getPatternsByLabel(label: string): Pattern[] {
    return Array.from(this._patterns.values())
      .filter(p => p.label === label)
      .map(p => ({ ...p, features: [...p.features] }));
  }

  public computeConfusionMatrix(testPatterns: { features: number[]; trueLabel: string }[]): Map<string, Map<string, number>> {
    const matrix = new Map<string, Map<string, number>>();
    for (const test of testPatterns) {
      const result = this.recognize(test.features);
      const predicted = result ? this._patterns.get(result.patternId)!.label : 'unknown';
      if (!matrix.has(test.trueLabel)) matrix.set(test.trueLabel, new Map());
      const row = matrix.get(test.trueLabel)!;
      row.set(predicted, (row.get(predicted) || 0) + 1);
    }
    return matrix;
  }

  public computeAccuracy(testPatterns: { features: number[]; trueLabel: string }[]): number {
    let correct = 0;
    for (const test of testPatterns) {
      const result = this.recognize(test.features);
      if (result) {
        const predictedLabel = this._patterns.get(result.patternId)!.label;
        if (predictedLabel === test.trueLabel) correct++;
      }
    }
    return testPatterns.length > 0 ? correct / testPatterns.length : 0;
  }

  public reset(): void {
    this._patterns.clear();
    this._prototype = new Array(this._prototype.length).fill(0);
    this._featureWeights = new Array(this._featureWeights.length).fill(1.0);
    this._history = [];
  }

  public exportPatterns(): Pattern[] {
    return Array.from(this._patterns.values()).map(p => ({ ...p, features: [...p.features] }));
  }
}
