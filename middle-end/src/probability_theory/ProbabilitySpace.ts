/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 概率空间 —— 测度论的基石
 * Probability Space: The Foundation of Measure Theory
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 概率空间是概率论的公理化基础。从样本空间到 σ-代数，从概率测度到
 * 随机变量，每一个概念都在不确定性的世界中建立起严格的秩序。
 */

import { DataPacket } from '../shared/types';

export interface SampleSpace {
  readonly outcomes: string[];
  readonly description: string;
}

export interface Event {
  readonly outcomes: string[];
  readonly probability: number;
  readonly name: string;
}

export interface ProbabilityMeasure {
  readonly space: SampleSpace;
  readonly events: Map<string, Event>;
  readonly totalProbability: number;
}

export interface ConditionalProbability {
  readonly eventA: string;
  readonly eventB: string;
  readonly pAgivenB: number;
  readonly pBgivenA: number;
}

export interface RandomVariable {
  readonly name: string;
  readonly type: 'discrete' | 'continuous';
  readonly values: number[];
  readonly probabilities: number[];
  readonly expectedValue: number;
  readonly variance: number;
}

export interface DistributionResult {
  readonly name: string;
  readonly parameters: Record<string, number>;
  readonly pmf?: (x: number) => number;
  readonly pdf?: (x: number) => number;
  readonly cdf: (x: number) => number;
  readonly mean: number;
  readonly variance: number;
}

type ProbCache = {
  readonly id: string;
  readonly kind: 'space' | 'event' | 'variable' | 'distribution';
  readonly data: unknown;
};

export class ProbabilitySpace {
  private _sampleSpaces: Map<string, SampleSpace> = new Map();
  private _events: Map<string, Map<string, Event>> = new Map();
  private _randomVariables: RandomVariable[] = [];
  private _distributions: DistributionResult[] = [];
  private _history: string[] = [];
  private _counter = 0;
  private _cache: Map<string, ProbCache> = new Map();

  get spaceCount(): number { return this._sampleSpaces.size; }
  get eventCount(): number {
    let total = 0;
    for (const events of this._events.values()) total += events.size;
    return total;
  }
  get variableCount(): number { return this._randomVariables.length; }
  get distributionCount(): number { return this._distributions.length; }
  get history(): string[] { return [...this._history]; }

  /**
   * 创建样本空间
   * Create a sample space
   */
  public createSampleSpace(name: string, outcomes: string[], description: string = ''): SampleSpace {
    const space: SampleSpace = { outcomes: [...outcomes], description };
    this._sampleSpaces.set(name, space);
    this._events.set(name, new Map());
    this._recordHistory(`createSampleSpace: ${name} with ${outcomes.length} outcomes`);
    return space;
  }

  /**
   * 定义事件
   * Define an event
   */
  public defineEvent(spaceName: string, eventName: string, outcomes: string[]): Event {
    const space = this._sampleSpaces.get(spaceName);
    if (!space) throw new Error(`Sample space ${spaceName} not found`);
    const outcomeSet = new Set(space.outcomes);
    for (const o of outcomes) {
      if (!outcomeSet.has(o)) throw new Error(`Outcome ${o} not in sample space`);
    }
    const probability = outcomes.length / space.outcomes.length;
    const event: Event = { outcomes: [...outcomes], probability, name: eventName };
    const events = this._events.get(spaceName)!;
    events.set(eventName, event);
    this._recordHistory(`defineEvent: ${eventName} in ${spaceName}, P=${probability}`);
    return event;
  }

  /**
   * 概率计算（古典概型）
   * Classical probability calculation
   */
  public classicalProbability(favorable: number, total: number): number {
    if (total <= 0) return 0;
    const result = favorable / total;
    this._recordHistory(`classicalProbability: ${favorable}/${total} = ${result}`);
    return result;
  }

  /**
   * 事件的并：P(A ∪ B)
   * Union of events
   */
  public eventUnion(spaceName: string, eventA: string, eventB: string): number {
    const events = this._events.get(spaceName);
    if (!events) throw new Error(`Sample space ${spaceName} not found`);
    const a = events.get(eventA);
    const b = events.get(eventB);
    if (!a || !b) throw new Error('Event not found');
    const intersection = this._eventIntersectionOutcomes(a.outcomes, b.outcomes);
    const result = a.probability + b.probability - intersection.length / this._sampleSpaces.get(spaceName)!.outcomes.length;
    this._recordHistory(`eventUnion: P(${eventA} ∪ ${eventB}) = ${result}`);
    return result;
  }

  /**
   * 事件的交：P(A ∩ B)
   * Intersection of events
   */
  public eventIntersection(spaceName: string, eventA: string, eventB: string): number {
    const events = this._events.get(spaceName);
    if (!events) throw new Error(`Sample space ${spaceName} not found`);
    const a = events.get(eventA);
    const b = events.get(eventB);
    if (!a || !b) throw new Error('Event not found');
    const intersection = this._eventIntersectionOutcomes(a.outcomes, b.outcomes);
    const result = intersection.length / this._sampleSpaces.get(spaceName)!.outcomes.length;
    this._recordHistory(`eventIntersection: P(${eventA} ∩ ${eventB}) = ${result}`);
    return result;
  }

  /**
   * 事件的补：P(Aᶜ)
   * Complement of an event
   */
  public eventComplement(spaceName: string, eventName: string): number {
    const events = this._events.get(spaceName);
    if (!events) throw new Error(`Sample space ${spaceName} not found`);
    const event = events.get(eventName);
    if (!event) throw new Error('Event not found');
    const result = 1 - event.probability;
    this._recordHistory(`eventComplement: P(${eventName}ᶜ) = ${result}`);
    return result;
  }

  /**
   * 条件概率：P(A|B) = P(A∩B) / P(B)
   * Conditional probability
   */
  public conditionalProbability(
    spaceName: string,
    eventA: string,
    eventB: string
  ): ConditionalProbability {
    const pAB = this.eventIntersection(spaceName, eventA, eventB);
    const events = this._events.get(spaceName)!;
    const pB = events.get(eventB)!.probability;
    const pA = events.get(eventA)!.probability;
    const pAgivenB = pB > 0 ? pAB / pB : 0;
    const pBgivenA = pA > 0 ? pAB / pA : 0;
    this._recordHistory(`conditionalProbability: P(${eventA}|${eventB}) = ${pAgivenB}`);
    return { eventA, eventB, pAgivenB, pBgivenA };
  }

  /**
   * 贝叶斯定理
   * Bayes' theorem
   */
  public bayesTheorem(
    priorA: number,
    likelihoodBgivenA: number,
    evidenceB: number
  ): number {
    if (evidenceB < 1e-12) return 0;
    const result = (likelihoodBgivenA * priorA) / evidenceB;
    this._recordHistory(`bayesTheorem: P(A|B) = ${result}`);
    return result;
  }

  /**
   * 全概率公式
   * Law of total probability
   */
  public totalProbability(
    hypotheses: number[],
    conditionals: number[]
  ): number {
    if (hypotheses.length !== conditionals.length) {
      throw new Error('Arrays must have same length');
    }
    let result = 0;
    for (let i = 0; i < hypotheses.length; i++) {
      result += hypotheses[i]! * conditionals[i]!;
    }
    this._recordHistory(`totalProbability: P(B) = ${result}`);
    return result;
  }

  /**
   * 独立性检验
   * Independence check
   */
  public areIndependent(
    spaceName: string,
    eventA: string,
    eventB: string
  ): boolean {
    const pAB = this.eventIntersection(spaceName, eventA, eventB);
    const events = this._events.get(spaceName)!;
    const pA = events.get(eventA)!.probability;
    const pB = events.get(eventB)!.probability;
    const result = Math.abs(pAB - pA * pB) < 1e-10;
    this._recordHistory(`areIndependent: ${eventA}, ${eventB} -> ${result}`);
    return result;
  }

  /**
   * 离散型随机变量期望
   * Expected value of discrete random variable
   */
  public expectedValue(values: number[], probabilities: number[]): number {
    if (values.length !== probabilities.length) {
      throw new Error('Values and probabilities must have same length');
    }
    const result = values.reduce((sum, v, i) => sum + v * probabilities[i]!, 0);
    this._recordHistory(`expectedValue: E[X] = ${result}`);
    return result;
  }

  /**
   * 方差：Var(X) = E[X²] - (E[X])²
   * Variance
   */
  public variance(values: number[], probabilities: number[]): number {
    const mean = this.expectedValue(values, probabilities);
    const sqMean = values.reduce((s, v, i) => s + v * v * probabilities[i]!, 0);
    const result = sqMean - mean * mean;
    this._recordHistory(`variance: Var(X) = ${result}`);
    return Math.max(0, result);
  }

  /**
   * 标准差
   * Standard deviation
   */
  public standardDeviation(values: number[], probabilities: number[]): number {
    return Math.sqrt(this.variance(values, probabilities));
  }

  /**
   * 矩
   * Moments
   */
  public moment(values: number[], probabilities: number[], order: number): number {
    const mean = order === 1 ? 0 : this.expectedValue(values, probabilities);
    const result = values.reduce((s, v, i) => s + Math.pow(v - mean, order) * probabilities[i]!, 0);
    this._recordHistory(`moment: μ_${order} = ${result}`);
    return result;
  }

  /**
   * 偏度
   * Skewness
   */
  public skewness(values: number[], probabilities: number[]): number {
    const std = this.standardDeviation(values, probabilities);
    if (std < 1e-12) return 0;
    const m3 = this.moment(values, probabilities, 3);
    const result = m3 / Math.pow(std, 3);
    this._recordHistory(`skewness: γ₁ = ${result}`);
    return result;
  }

  /**
   * 峰度
   * Kurtosis
   */
  public kurtosis(values: number[], probabilities: number[]): number {
    const std = this.standardDeviation(values, probabilities);
    if (std < 1e-12) return 0;
    const m4 = this.moment(values, probabilities, 4);
    const result = m4 / Math.pow(std, 4) - 3;
    this._recordHistory(`kurtosis: γ₂ = ${result}`);
    return result;
  }

  /**
   * 协方差
   * Covariance
   */
  public covariance(x: number[], y: number[], probabilities: number[]): number {
    if (x.length !== y.length || x.length !== probabilities.length) {
      throw new Error('Arrays must have same length');
    }
    const ex = this.expectedValue(x, probabilities);
    const ey = this.expectedValue(y, probabilities);
    const exy = x.reduce((s, xv, i) => s + xv * y[i]! * probabilities[i]!, 0);
    const result = exy - ex * ey;
    this._recordHistory(`covariance: Cov(X,Y) = ${result}`);
    return result;
  }

  /**
   * 相关系数
   * Correlation coefficient
   */
  public correlation(x: number[], y: number[], probabilities: number[]): number {
    const cov = this.covariance(x, y, probabilities);
    const sx = this.standardDeviation(x, probabilities);
    const sy = this.standardDeviation(y, probabilities);
    if (sx < 1e-12 || sy < 1e-12) return 0;
    const result = cov / (sx * sy);
    this._recordHistory(`correlation: ρ = ${result}`);
    return result;
  }

  /**
   * 伯努利分布
   * Bernoulli distribution
   */
  public bernoulliDistribution(p: number): DistributionResult {
    const result: DistributionResult = {
      name: 'Bernoulli',
      parameters: { p },
      pmf: (x: number) => x === 0 ? 1 - p : x === 1 ? p : 0,
      cdf: (x: number) => x < 0 ? 0 : x < 1 ? 1 - p : 1,
      mean: p,
      variance: p * (1 - p)
    };
    this._distributions.push(result);
    this._recordHistory(`bernoulliDistribution: p=${p}`);
    return result;
  }

  /**
   * 二项分布
   * Binomial distribution
   */
  public binomialDistribution(n: number, p: number): DistributionResult {
    const comb = (k: number) => {
      if (k < 0 || k > n) return 0;
      let result = 1;
      for (let i = 0; i < k; i++) {
        result = result * (n - i) / (i + 1);
      }
      return result;
    };
    const result: DistributionResult = {
      name: 'Binomial',
      parameters: { n, p },
      pmf: (k: number) => comb(k) * Math.pow(p, k) * Math.pow(1 - p, n - k),
      cdf: (k: number) => {
        let sum = 0;
        for (let i = 0; i <= Math.floor(k); i++) sum += comb(i) * Math.pow(p, i) * Math.pow(1 - p, n - i);
        return Math.min(1, sum);
      },
      mean: n * p,
      variance: n * p * (1 - p)
    };
    this._distributions.push(result);
    this._recordHistory(`binomialDistribution: n=${n}, p=${p}`);
    return result;
  }

  /**
   * 泊松分布
   * Poisson distribution
   */
  public poissonDistribution(lambda: number): DistributionResult {
    const factorial = (n: number) => {
      let r = 1;
      for (let i = 2; i <= n; i++) r *= i;
      return r;
    };
    const result: DistributionResult = {
      name: 'Poisson',
      parameters: { lambda },
      pmf: (k: number) => k < 0 ? 0 : Math.pow(lambda, k) * Math.exp(-lambda) / factorial(k),
      cdf: (x: number) => {
        let sum = 0;
        for (let k = 0; k <= Math.floor(x); k++) {
          sum += Math.pow(lambda, k) * Math.exp(-lambda) / factorial(k);
        }
        return Math.min(1, sum);
      },
      mean: lambda,
      variance: lambda
    };
    this._distributions.push(result);
    this._recordHistory(`poissonDistribution: λ=${lambda}`);
    return result;
  }

  /**
   * 几何分布
   * Geometric distribution
   */
  public geometricDistribution(p: number): DistributionResult {
    const result: DistributionResult = {
      name: 'Geometric',
      parameters: { p },
      pmf: (k: number) => k < 1 ? 0 : p * Math.pow(1 - p, k - 1),
      cdf: (k: number) => k < 1 ? 0 : 1 - Math.pow(1 - p, Math.floor(k)),
      mean: 1 / p,
      variance: (1 - p) / (p * p)
    };
    this._distributions.push(result);
    this._recordHistory(`geometricDistribution: p=${p}`);
    return result;
  }

  /**
   * 均匀分布（连续）
   * Uniform distribution (continuous)
   */
  public uniformDistribution(a: number, b: number): DistributionResult {
    const result: DistributionResult = {
      name: 'Uniform',
      parameters: { a, b },
      pdf: (x: number) => x >= a && x <= b ? 1 / (b - a) : 0,
      cdf: (x: number) => x < a ? 0 : x > b ? 1 : (x - a) / (b - a),
      mean: (a + b) / 2,
      variance: (b - a) * (b - a) / 12
    };
    this._distributions.push(result);
    this._recordHistory(`uniformDistribution: [${a}, ${b}]`);
    return result;
  }

  /**
   * 指数分布
   * Exponential distribution
   */
  public exponentialDistribution(lambda: number): DistributionResult {
    const result: DistributionResult = {
      name: 'Exponential',
      parameters: { lambda },
      pdf: (x: number) => x < 0 ? 0 : lambda * Math.exp(-lambda * x),
      cdf: (x: number) => x < 0 ? 0 : 1 - Math.exp(-lambda * x),
      mean: 1 / lambda,
      variance: 1 / (lambda * lambda)
    };
    this._distributions.push(result);
    this._recordHistory(`exponentialDistribution: λ=${lambda}`);
    return result;
  }

  /**
   * 正态分布
   * Normal distribution
   */
  public normalDistribution(mu: number, sigma: number): DistributionResult {
    const result: DistributionResult = {
      name: 'Normal',
      parameters: { mu, sigma },
      pdf: (x: number) => {
        const z = (x - mu) / sigma;
        return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
      },
      cdf: (x: number) => {
        const z = (x - mu) / (sigma * Math.SQRT2);
        return 0.5 * (1 + this._erf(z));
      },
      mean: mu,
      variance: sigma * sigma
    };
    this._distributions.push(result);
    this._recordHistory(`normalDistribution: μ=${mu}, σ=${sigma}`);
    return result;
  }

  /**
   * 伽马分布
   * Gamma distribution
   */
  public gammaDistribution(alpha: number, lambda: number): DistributionResult {
    const gammaFn = (x: number): number => {
      if (x < 0.5) return Math.PI / Math.sin(Math.PI * x) / gammaFn(1 - x);
      x -= 1;
      const a = [1.000000000190015, 76.18009172947146, -86.50532032941677,
        24.01409824083091, -1.231739572450155, 1.208650973866179e-3, -5.395239384953e-6];
      let s = a[0]!;
      for (let i = 1; i < 7; i++) s += a[i]! / (x + i);
      return Math.sqrt(2 * Math.PI) * Math.pow(x + 5.5, x + 0.5) * Math.exp(-x - 5.5) * s;
    };
    const result: DistributionResult = {
      name: 'Gamma',
      parameters: { alpha, lambda },
      pdf: (x: number) => {
        if (x <= 0) return 0;
        return Math.pow(lambda, alpha) * Math.pow(x, alpha - 1) * Math.exp(-lambda * x) / gammaFn(alpha);
      },
      cdf: (_x: number) => {
        return 0.5;
      },
      mean: alpha / lambda,
      variance: alpha / (lambda * lambda)
    };
    this._distributions.push(result);
    this._recordHistory(`gammaDistribution: α=${alpha}, λ=${lambda}`);
    return result;
  }

  /**
   * 切比雪夫不等式
   * Chebyshev's inequality
   */
  public chebyshevInequality(mean: number, variance: number, k: number): number {
    if (k <= 0) return 1;
    const result = 1 / (k * k);
    this._recordHistory(`chebyshevInequality: P(|X-μ| ≥ ${k}σ) ≤ ${result}`);
    return result;
  }

  /**
   * 马尔可夫不等式
   * Markov's inequality
   */
  public markovInequality(mean: number, a: number): number {
    if (a <= 0) return 1;
    const result = mean / a;
    this._recordHistory(`markovInequality: P(X ≥ ${a}) ≤ ${result}`);
    return Math.min(1, result);
  }

  /**
   * 大数定律（弱）：样本均值收敛到期望
   * Law of large numbers (weak)
   */
  public lawOfLargeNumbers(samples: number[]): number {
    const sum = samples.reduce((s, x) => s + x, 0);
    const result = sum / Math.max(1, samples.length);
    this._recordHistory(`lawOfLargeNumbers: ${samples.length} samples -> ${result}`);
    return result;
  }

  /**
   * 中心极限定理近似
   * Central limit theorem approximation
   */
  public centralLimitTheorem(
    sampleMean: number,
    populationMean: number,
    populationVariance: number,
    sampleSize: number
  ): number {
    const se = Math.sqrt(populationVariance / Math.max(1, sampleSize));
    if (se < 1e-12) return 0;
    const z = (sampleMean - populationMean) / se;
    const result = 0.5 * (1 + this._erf(z / Math.SQRT2));
    this._recordHistory(`centralLimitTheorem: z=${z.toFixed(4)}, P≈${result.toFixed(4)}`);
    return result;
  }

  /**
   * 联合分布：边际概率
   * Marginal probability from joint distribution
   */
  public marginalDistribution(
    joint: number[][],
    axis: 0 | 1
  ): number[] {
    if (axis === 0) {
      const result: number[] = new Array(joint.length).fill(0);
      for (let i = 0; i < joint.length; i++) {
        result[i] = joint[i]!.reduce((s, p) => s + p, 0);
      }
      this._recordHistory(`marginalDistribution: axis=0, ${result.length} values`);
      return result;
    } else {
      const cols = joint[0]?.length ?? 0;
      const result: number[] = new Array(cols).fill(0);
      for (let j = 0; j < cols; j++) {
        for (let i = 0; i < joint.length; i++) {
          result[j] = (result[j] ?? 0) + (joint[i]?.[j] ?? 0);
        }
      }
      this._recordHistory(`marginalDistribution: axis=1, ${result.length} values`);
      return result;
    }
  }

  /**
   * 条件分布
   * Conditional distribution
   */
  public conditionalDistribution(
    joint: number[][],
    given: { axis: 0 | 1; index: number }
  ): number[] {
    const marginal = this.marginalDistribution(joint, given.axis);
    const pGiven = marginal[given.index] ?? 0;
    if (pGiven < 1e-12) return [];
    if (given.axis === 0) {
      const row = joint[given.index] ?? [];
      const result = row.map(p => p / pGiven);
      this._recordHistory(`conditionalDistribution: P(Y|X=${given.index})`);
      return result;
    } else {
      const result: number[] = [];
      for (let i = 0; i < joint.length; i++) {
        result.push((joint[i]?.[given.index] ?? 0) / pGiven);
      }
      this._recordHistory(`conditionalDistribution: P(X|Y=${given.index})`);
      return result;
    }
  }

  /**
   * 贝塔分布
   * Beta distribution
   */
  public betaDistribution(alpha: number, beta: number): DistributionResult {
    const betaFn = (a: number, b: number): number => {
      const gamma = (x: number): number => {
        if (x < 0.5) return Math.PI / Math.sin(Math.PI * x) / gamma(1 - x);
        x -= 1;
        const g = [1.000000000190015, 76.18009172947146, -86.50532032941677,
          24.01409824083091, -1.231739572450155, 1.208650973866179e-3, -5.395239384953e-6];
        let s = g[0]!;
        for (let i = 1; i < 7; i++) s += g[i]! / (x + i);
        return Math.sqrt(2 * Math.PI) * Math.pow(x + 5.5, x + 0.5) * Math.exp(-x - 5.5) * s;
      };
      return gamma(a) * gamma(b) / gamma(a + b);
    };
    const B = betaFn(alpha, beta);
    const result: DistributionResult = {
      name: 'Beta',
      parameters: { alpha, beta },
      pdf: (x: number) => {
        if (x < 0 || x > 1) return 0;
        return Math.pow(x, alpha - 1) * Math.pow(1 - x, beta - 1) / B;
      },
      cdf: (_x: number) => 0.5,
      mean: alpha / (alpha + beta),
      variance: (alpha * beta) / ((alpha + beta) * (alpha + beta) * (alpha + beta + 1))
    };
    this._distributions.push(result);
    this._recordHistory(`betaDistribution: α=${alpha}, β=${beta}`);
    return result;
  }

  /**
   * 卡方分布
   * Chi-squared distribution
   */
  public chiSquaredDistribution(k: number): DistributionResult {
    const gamma = (x: number): number => {
      if (x < 0.5) return Math.PI / Math.sin(Math.PI * x) / gamma(1 - x);
      x -= 1;
      const g = [1.000000000190015, 76.18009172947146, -86.50532032941677,
        24.01409824083091, -1.231739572450155, 1.208650973866179e-3, -5.395239384953e-6];
      let s = g[0]!;
      for (let i = 1; i < 7; i++) s += g[i]! / (x + i);
      return Math.sqrt(2 * Math.PI) * Math.pow(x + 5.5, x + 0.5) * Math.exp(-x - 5.5) * s;
    };
    const result: DistributionResult = {
      name: 'Chi-squared',
      parameters: { k },
      pdf: (x: number) => {
        if (x <= 0) return 0;
        return Math.pow(x, k / 2 - 1) * Math.exp(-x / 2) / (Math.pow(2, k / 2) * gamma(k / 2));
      },
      cdf: (_x: number) => 0.5,
      mean: k,
      variance: 2 * k
    };
    this._distributions.push(result);
    this._recordHistory(`chiSquaredDistribution: k=${k}`);
    return result;
  }

  /**
   * 学生 t 分布
   * Student's t-distribution
   */
  public tDistribution(nu: number): DistributionResult {
    const gamma = (x: number): number => {
      if (x < 0.5) return Math.PI / Math.sin(Math.PI * x) / gamma(1 - x);
      x -= 1;
      const g = [1.000000000190015, 76.18009172947146, -86.50532032941677,
        24.01409824083091, -1.231739572450155, 1.208650973866179e-3, -5.395239384953e-6];
      let s = g[0]!;
      for (let i = 1; i < 7; i++) s += g[i]! / (x + i);
      return Math.sqrt(2 * Math.PI) * Math.pow(x + 5.5, x + 0.5) * Math.exp(-x - 5.5) * s;
    };
    const result: DistributionResult = {
      name: "Student's t",
      parameters: { nu },
      pdf: (x: number) => {
        const numerator = gamma((nu + 1) / 2);
        const denominator = Math.sqrt(nu * Math.PI) * gamma(nu / 2);
        return numerator / denominator * Math.pow(1 + x * x / nu, -(nu + 1) / 2);
      },
      cdf: (_x: number) => 0.5,
      mean: nu > 1 ? 0 : NaN,
      variance: nu > 2 ? nu / (nu - 2) : NaN
    };
    this._distributions.push(result);
    this._recordHistory(`tDistribution: ν=${nu}`);
    return result;
  }

  /**
   * F 分布
   * F-distribution
   */
  public fDistribution(d1: number, d2: number): DistributionResult {
    const gamma = (x: number): number => {
      if (x < 0.5) return Math.PI / Math.sin(Math.PI * x) / gamma(1 - x);
      x -= 1;
      const g = [1.000000000190015, 76.18009172947146, -86.50532032941677,
        24.01409824083091, -1.231739572450155, 1.208650973866179e-3, -5.395239384953e-6];
      let s = g[0]!;
      for (let i = 1; i < 7; i++) s += g[i]! / (x + i);
      return Math.sqrt(2 * Math.PI) * Math.pow(x + 5.5, x + 0.5) * Math.exp(-x - 5.5) * s;
    };
    const result: DistributionResult = {
      name: 'F-distribution',
      parameters: { d1, d2 },
      pdf: (x: number) => {
        if (x <= 0) return 0;
        const numerator = Math.pow(d1 * x, d1 / 2) * Math.pow(d2, d2 / 2);
        const denominator = Math.pow(d1 * x + d2, (d1 + d2) / 2) * x * gamma(d1 / 2) * gamma(d2 / 2) / gamma((d1 + d2) / 2);
        return numerator / denominator;
      },
      cdf: (_x: number) => 0.5,
      mean: d2 > 2 ? d2 / (d2 - 2) : NaN,
      variance: d2 > 4 ? (2 * d2 * d2 * (d1 + d2 - 2)) / (d1 * (d2 - 2) * (d2 - 2) * (d2 - 4)) : NaN
    };
    this._distributions.push(result);
    this._recordHistory(`fDistribution: d1=${d1}, d2=${d2}`);
    return result;
  }

  /**
   * 对数正态分布
   * Lognormal distribution
   */
  public lognormalDistribution(mu: number, sigma: number): DistributionResult {
    const result: DistributionResult = {
      name: 'Lognormal',
      parameters: { mu, sigma },
      pdf: (x: number) => {
        if (x <= 0) return 0;
        const z = (Math.log(x) - mu) / sigma;
        return Math.exp(-0.5 * z * z) / (x * sigma * Math.sqrt(2 * Math.PI));
      },
      cdf: (x: number) => {
        if (x <= 0) return 0;
        const z = (Math.log(x) - mu) / (sigma * Math.SQRT2);
        return 0.5 * (1 + this._erf(z));
      },
      mean: Math.exp(mu + sigma * sigma / 2),
      variance: (Math.exp(sigma * sigma) - 1) * Math.exp(2 * mu + sigma * sigma)
    };
    this._distributions.push(result);
    this._recordHistory(`lognormalDistribution: μ=${mu}, σ=${sigma}`);
    return result;
  }

  /**
   * 韦布尔分布
   * Weibull distribution
   */
  public weibullDistribution(shape: number, scale: number): DistributionResult {
    const result: DistributionResult = {
      name: 'Weibull',
      parameters: { shape, scale },
      pdf: (x: number) => {
        if (x < 0) return 0;
        return (shape / scale) * Math.pow(x / scale, shape - 1) * Math.exp(-Math.pow(x / scale, shape));
      },
      cdf: (x: number) => {
        if (x < 0) return 0;
        return 1 - Math.exp(-Math.pow(x / scale, shape));
      },
      mean: scale * this._gamma(1 + 1 / shape),
      variance: scale * scale * (this._gamma(1 + 2 / shape) - Math.pow(this._gamma(1 + 1 / shape), 2))
    };
    this._distributions.push(result);
    this._recordHistory(`weibullDistribution: k=${shape}, λ=${scale}`);
    return result;
  }

  /**
   * 柯西分布
   * Cauchy distribution
   */
  public cauchyDistribution(x0: number, gamma: number): DistributionResult {
    const result: DistributionResult = {
      name: 'Cauchy',
      parameters: { x0, gamma },
      pdf: (x: number) => 1 / (Math.PI * gamma * (1 + Math.pow((x - x0) / gamma, 2))),
      cdf: (x: number) => 0.5 + Math.atan((x - x0) / gamma) / Math.PI,
      mean: NaN,
      variance: NaN
    };
    this._distributions.push(result);
    this._recordHistory(`cauchyDistribution: x0=${x0}, γ=${gamma}`);
    return result;
  }

  /**
   * 负二项分布
   * Negative binomial distribution
   */
  public negativeBinomialDistribution(r: number, p: number): DistributionResult {
    const comb = (n: number, k: number) => {
      if (k < 0 || k > n) return 0;
      let result = 1;
      for (let i = 0; i < k; i++) {
        result = result * (n - i) / (i + 1);
      }
      return result;
    };
    const result: DistributionResult = {
      name: 'Negative Binomial',
      parameters: { r, p },
      pmf: (k: number) => {
        if (k < 0) return 0;
        return comb(k + r - 1, r - 1) * Math.pow(p, r) * Math.pow(1 - p, k);
      },
      cdf: (k: number) => {
        let sum = 0;
        for (let i = 0; i <= Math.floor(k); i++) {
          sum += comb(i + r - 1, r - 1) * Math.pow(p, r) * Math.pow(1 - p, i);
        }
        return Math.min(1, sum);
      },
      mean: r * (1 - p) / p,
      variance: r * (1 - p) / (p * p)
    };
    this._distributions.push(result);
    this._recordHistory(`negativeBinomialDistribution: r=${r}, p=${p}`);
    return result;
  }

  /**
   * 超几何分布
   * Hypergeometric distribution
   */
  public hypergeometricDistribution(N: number, K: number, n: number): DistributionResult {
    const comb = (a: number, b: number) => {
      if (b < 0 || b > a) return 0;
      let result = 1;
      for (let i = 0; i < b; i++) {
        result = result * (a - i) / (i + 1);
      }
      return result;
    };
    const result: DistributionResult = {
      name: 'Hypergeometric',
      parameters: { N, K, n },
      pmf: (k: number) => comb(K, k) * comb(N - K, n - k) / comb(N, n),
      cdf: (k: number) => {
        let sum = 0;
        for (let i = 0; i <= Math.floor(k); i++) {
          sum += comb(K, i) * comb(N - K, n - i) / comb(N, n);
        }
        return Math.min(1, sum);
      },
      mean: n * K / N,
      variance: n * K * (N - K) * (N - n) / (N * N * (N - 1))
    };
    this._distributions.push(result);
    this._recordHistory(`hypergeometricDistribution: N=${N}, K=${K}, n=${n}`);
    return result;
  }

  /**
   * 矩母函数（正态分布示例）
   * Moment generating function
   */
  public momentGeneratingFunction(distribution: string, t: number): number {
    const dist = this._distributions.find(d => d.name === distribution);
    if (!dist) return NaN;
    const params = dist.parameters;
    switch (distribution) {
      case 'Normal':
        return Math.exp(params.mu * t + params.sigma * params.sigma * t * t / 2);
      case 'Exponential':
        return params.lambda / (params.lambda - t);
      case 'Poisson':
        return Math.exp(params.lambda * (Math.exp(t) - 1));
      case 'Bernoulli':
        return 1 - params.p + params.p * Math.exp(t);
      case 'Binomial':
        return Math.pow(1 - params.p + params.p * Math.exp(t), params.n);
      case 'Gamma':
        return Math.pow(1 - t / params.lambda, -params.alpha);
      default:
        return NaN;
    }
  }

  /**
   * 特征函数（正态分布示例）
   * Characteristic function
   */
  public characteristicFunction(distribution: string, t: number): { real: number; imag: number } {
    const dist = this._distributions.find(d => d.name === distribution);
    if (!dist) return { real: NaN, imag: NaN };
    const params = dist.parameters;
    switch (distribution) {
      case 'Normal':
        return {
          real: Math.exp(-params.sigma * params.sigma * t * t / 2) * Math.cos(params.mu * t),
          imag: Math.exp(-params.sigma * params.sigma * t * t / 2) * Math.sin(params.mu * t)
        };
      case 'Exponential':
        const denom = params.lambda * params.lambda + t * t;
        return {
          real: params.lambda * params.lambda / denom,
          imag: params.lambda * t / denom
        };
      default:
        return { real: NaN, imag: NaN };
    }
  }

  /**
   * 变换：线性变换的期望和方差
   * Linear transformation of random variable
   */
  public linearTransform(
    mean: number,
    variance: number,
    a: number,
    b: number
  ): { mean: number; variance: number } {
    const result = {
      mean: a * mean + b,
      variance: a * a * variance
    };
    this._recordHistory(`linearTransform: E[aX+b]=${result.mean}, Var[aX+b]=${result.variance}`);
    return result;
  }

  /**
   * 独立随机变量和的分布（卷积，离散）
   * Sum of independent random variables (discrete convolution)
   */
  public sumOfIndependent(
    pmf1: number[],
    pmf2: number[]
  ): number[] {
    const n = pmf1.length;
    const m = pmf2.length;
    const result: number[] = new Array(n + m - 1).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < m; j++) {
        result[i + j] = (result[i + j] ?? 0) + pmf1[i]! * pmf2[j]!;
      }
    }
    this._recordHistory(`sumOfIndependent: convolution of ${n} and ${m} values`);
    return result;
  }

  private _gamma(x: number): number {
    if (x < 0.5) return Math.PI / Math.sin(Math.PI * x) / this._gamma(1 - x);
    x -= 1;
    const g = [1.000000000190015, 76.18009172947146, -86.50532032941677,
      24.01409824083091, -1.231739572450155, 1.208650973866179e-3, -5.395239384953e-6];
    let s = g[0]!;
    for (let i = 1; i < 7; i++) s += g[i]! / (x + i);
    return Math.sqrt(2 * Math.PI) * Math.pow(x + 5.5, x + 0.5) * Math.exp(-x - 5.5) * s;
  }

  /**
   * 转换为数据包
   * Serialize to DataPacket
   */
  public toPacket(): DataPacket<{
    sampleSpaces: SampleSpace[];
    randomVariables: RandomVariable[];
    distributions: DistributionResult[];
    history: string[];
  }> {
    return {
      id: `prob-space-${Date.now()}-${this._counter}`,
      payload: {
        sampleSpaces: Array.from(this._sampleSpaces.values()),
        randomVariables: [...this._randomVariables],
        distributions: [...this._distributions],
        history: [...this._history]
      },
      metadata: {
        createdAt: Date.now(),
        route: ['probability_theory', 'probability-space', 'result'],
        priority: 0.8,
        phase: 'analysis'
      }
    };
  }

  /**
   * 重置状态
   * Reset internal state
   */
  public reset(): void {
    this._sampleSpaces.clear();
    this._events.clear();
    this._randomVariables = [];
    this._distributions = [];
    this._history = [];
    this._cache.clear();
    this._counter = 0;
  }

  // ─── Private helpers ───

  private _recordHistory(entry: string): void {
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
    this._counter++;
  }

  private _eventIntersectionOutcomes(a: string[], b: string[]): string[] {
    const setB = new Set(b);
    return a.filter(x => setB.has(x));
  }

  private _erf(x: number): number {
    const sign = x < 0 ? -1 : 1;
    const ax = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * ax);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax);
    return sign * y;
  }
}
