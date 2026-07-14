/**
 * 不和谐之美模块：在不和谐中发现并量化美感的维度。
 * 将张力转化为审美价值，强调冲突本身的吸引力。
 */

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

  constructor(config: BeautyConfig) {
    this._config = config;
    this._initDimensions();
  }

  get dimensionCount(): number {
    return this._dimensions.length;
  }

  get lastAssessment(): BeautyAssessment | null {
    return this._assessments.length > 0 ? this._assessments[this._assessments.length - 1] : null;
  }

  private _initDimensions(): void {
    this._dimensions = [
      { name: 'harmony', value: 0, weight: this._config.harmonyWeight },
      { name: 'tension', value: 0, weight: this._config.tensionWeight },
      { name: 'novelty', value: 0, weight: this._config.noveltyWeight },
    ];
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
    const rating: BeautyAssessment['rating'] =
      score < 0.33 ? 'harsh' : score < 0.66 ? 'interesting' : 'sublime';
    const result: BeautyAssessment = { score, rating, dominant };
    this._assessments.push(result);
    if (this._assessments.length > 30) this._assessments.shift();
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

  reset(): void {
    this._dimensions.forEach((d) => (d.value = 0));
    this._assessments = [];
    this._cache = {};
  }

  report(): Record<string, unknown> {
    return {
      dimensions: this._dimensions,
      assessments: this._assessments.length,
      averageScore: this.averageScore(),
      cache: this._cache,
    };
  }
}
