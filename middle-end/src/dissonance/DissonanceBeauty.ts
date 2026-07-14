export interface BeautyDimension {
  name: string;
  value: number;
  weight: number;
}

export type BeautyAssessment = {
  score: number;
  rating: 'harsh' | 'interesting' | 'sublime';
  dominant: string;
};

export interface BeautyConfig {
  harmonyWeight: number;
  tensionWeight: number;
  noveltyWeight: number;
}

export class DissonanceBeauty {
  private _config: BeautyConfig;
  private _dimensions: BeautyDimension[] = [];
  private _assessments: BeautyAssessment[] = [];
  private _cache: Record<string, unknown> = {};
  private _goldenRatio: number = 1.6180339887;
  private _fibonacciWeights: number[] = [];
  private _complexityMeasure: number = 0;

  constructor(config: BeautyConfig) {
    this._config = config;
    this._initDimensions();
    this._initFibonacci();
  }

  get dimensionCount(): number {
    return this._dimensions.length;
  }

  get lastAssessment(): BeautyAssessment | null {
    return this._assessments.length > 0 ? this._assessments[this._assessments.length - 1] : null;
  }

  get complexityMeasure(): number {
    return this._complexityMeasure;
  }

  private _initDimensions(): void {
    this._dimensions = [
      { name: 'harmony', value: 0, weight: this._config.harmonyWeight },
      { name: 'tension', value: 0, weight: this._config.tensionWeight },
      { name: 'novelty', value: 0, weight: this._config.noveltyWeight },
    ];
  }

  private _initFibonacci(): void {
    this._fibonacciWeights = [1, 1];
    for (let i = 2; i < 12; i++) {
      this._fibonacciWeights.push(this._fibonacciWeights[i - 1] + this._fibonacciWeights[i - 2]);
    }
  }

  private _computeComplexity(): void {
    const values = this._dimensions.map((d) => d.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + (b - mean) * (b - mean), 0) / values.length;
    this._complexityMeasure = Math.sqrt(variance) * this._goldenRatio;
  }

  private _computeFractalScore(): number {
    let score = 0;
    for (let i = 0; i < this._dimensions.length; i++) {
      const fib = this._fibonacciWeights[i + 2] || 1;
      score += this._dimensions[i].value * (fib / this._fibonacciWeights[this._fibonacciWeights.length - 1]);
    }
    return score;
  }

  setDimension(name: string, value: number): void {
    const dim = this._dimensions.find((d) => d.name === name);
    if (dim) {
      dim.value = Math.max(0, Math.min(1, value));
    }
  }

  assess(): BeautyAssessment {
    let score = 0;
    let dominant = '';
    let best = -Infinity;
    for (const d of this._dimensions) {
      const contribution = d.value * d.weight;
      score += contribution;
      if (contribution > best) {
        best = contribution;
        dominant = d.name;
      }
    }
    const fractalBonus = this._computeFractalScore();
    score = (score + fractalBonus) / (1 + this._goldenRatio * 0.1);
    const rating: BeautyAssessment['rating'] =
      score < 0.33 ? 'harsh' : score < 0.66 ? 'interesting' : 'sublime';
    const result: BeautyAssessment = { score, rating, dominant };
    this._assessments.push(result);
    if (this._assessments.length > 30) this._assessments.shift();
    this._computeComplexity();
    return result;
  }

  injectTension(amount: number): void {
    const dim = this._dimensions.find((d) => d.name === 'tension');
    if (dim) dim.value = Math.min(1, dim.value + amount);
  }

  balanceWeights(): void {
    const total = this._dimensions.reduce((acc, d) => acc + d.weight, 0);
    for (const d of this._dimensions) {
      d.weight = d.weight / total;
    }
  }

  averageScore(): number {
    if (this._assessments.length === 0) return 0;
    return this._assessments.reduce((acc, a) => acc + a.score, 0) / this._assessments.length;
  }

  findSublime(): BeautyAssessment | null {
    return this._assessments.find((a) => a.rating === 'sublime') ?? null;
  }

  computeAutoCorrelation(lag: number): number {
    if (this._assessments.length < lag + 2) return 0;
    const scores = this._assessments.map((a) => a.score);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < scores.length - lag; i++) {
      numerator += (scores[i] - mean) * (scores[i + lag] - mean);
    }
    for (let i = 0; i < scores.length; i++) {
      denominator += (scores[i] - mean) * (scores[i] - mean);
    }
    return denominator > 0 ? numerator / denominator : 0;
  }

  reset(): void {
    this._dimensions.forEach((d) => (d.value = 0));
    this._assessments = [];
    this._cache = {};
    this._complexityMeasure = 0;
  }

  report(): Record<string, unknown> {
    return {
      dimensions: this._dimensions,
      assessments: this._assessments.length,
      averageScore: this.averageScore(),
      cache: this._cache,
      complexityMeasure: this._complexityMeasure.toFixed(4),
      autoCorrelation: this.computeAutoCorrelation(1).toFixed(4),
    };
  }
}
