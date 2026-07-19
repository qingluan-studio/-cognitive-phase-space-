/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 高等概率论 —— 不确定性的微积分
 * Advanced Probability: The Calculus of Uncertainty
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 概率论是关于不确定性的科学。从期望到方差，从切比雪夫到贝叶斯，
 * 从大数定律到中心极限定理，每一刻的随机都在规律的骨架上振动。
 */

import { DataPacket } from '../shared/types';

export interface RandomVariable {
  readonly name: string;
  readonly type: 'discrete' | 'continuous';
  readonly distribution: string;
  readonly expectedValue: number;
  readonly variance: number;
}

export interface JointDistribution {
  readonly variables: string[];
  readonly pmf: Map<string, number>;
  readonly marginal: Map<string, number>;
  readonly conditional: Map<string, number>;
}

export interface MomentGeneratingFunction {
  readonly expression: string;
  readonly moments: number[];
}

type VariableCache = {
  readonly id: string;
  readonly variable: RandomVariable;
};

export class AdvancedProbability {
  private _variables: Map<string, VariableCache> = new Map();
  private _joints: JointDistribution[] = [];
  private _mgfs: MomentGeneratingFunction[] = [];
  private _history: string[] = [];
  private _counter = 0;

  get variableCount(): number { return this._variables.size; }
  get jointCount(): number { return this._joints.length; }
  get mgfCount(): number { return this._mgfs.length; }
  get history(): string[] { return [...this._history]; }

  /**
   * 期望值：E[X] = Σ x·P(x)
   * Expected value
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
    return result;
  }

  /**
   * 标准差：σ = √Var(X)
   * Standard deviation
   */
  public standardDeviation(values: number[], probabilities: number[]): number {
    return Math.sqrt(this.variance(values, probabilities));
  }

  /**
   * 协方差：Cov(X, Y) = E[XY] - E[X]E[Y]
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
   * 相关系数：ρ = Cov(X,Y) / (σ_X σ_Y)
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
   * 矩母函数：M(t) = E[e^(tX)]
   * Moment generating function (symbolic)
   */
  public momentGeneratingFunction(distribution: string): string {
    const table: Record<string, string> = {
      'bernoulli': 'M(t) = 1 - p + p*e^t',
      'binomial': 'M(t) = (1 - p + p*e^t)^n',
      'poisson': 'M(t) = exp(λ(e^t - 1))',
      'geometric': 'M(t) = p*e^t / (1 - (1-p)*e^t)',
      'uniform': 'M(t) = (e^(tb) - e^(ta)) / (t(b-a))',
      'exponential': 'M(t) = λ / (λ - t)',
      'normal': 'M(t) = exp(μt + σ²t²/2)',
      'gamma': 'M(t) = (1 - t/λ)^(-α)'
    };
    const result = table[distribution.toLowerCase()] ?? `M(t) = E[e^(tX)] for ${distribution}`;
    this._mgfs.push({ expression: result, moments: [] });
    this._recordHistory(`momentGeneratingFunction: ${distribution}`);
    return result;
  }

  /**
   * 求各阶矩：M^(n)(0)
   * Find moments of order up to n
   */
  public findMoments(mgf: string, order: number): number[] {
    // Simplified: derive moments from known distributions
    const moments: number[] = [];
    const lambdaMatch = mgf.match(/λ\s*\/\s*\(λ\s*-\s*t\)/);
    const normalMatch = mgf.match(/exp\(μt\s*\+\s*σ²t²\/2\)/);
    const poissonMatch = mgf.match(/exp\(λ\(e\^t\s*-\s*1\)\)/);
    if (lambdaMatch) {
      for (let n = 1; n <= order; n++) {
        moments.push(this._factorial(n) / Math.pow(2, n));
      }
    } else if (normalMatch) {
      for (let n = 1; n <= order; n++) {
        if (n % 2 === 1) moments.push(0);
        else moments.push(this._doubleFactorial(n - 1));
      }
    } else if (poissonMatch) {
      for (let n = 1; n <= order; n++) {
        // Bell numbers for Poisson moments
        moments.push(this._bellNumber(n));
      }
    } else {
      for (let n = 1; n <= order; n++) moments.push(0);
    }
    this._recordHistory(`findMoments: ${order} moments from ${mgf}`);
    return moments;
  }

  /**
   * 特征函数：φ(t) = E[e^(itX)]
   * Characteristic function (symbolic)
   */
  public characteristicFunction(distribution: string): string {
    const table: Record<string, string> = {
      'bernoulli': 'φ(t) = 1 - p + p*e^(it)',
      'binomial': 'φ(t) = (1 - p + p*e^(it))^n',
      'poisson': 'φ(t) = exp(λ(e^(it) - 1))',
      'uniform': 'φ(t) = (e^(itb) - e^(ita)) / (it(b-a))',
      'exponential': 'φ(t) = λ / (λ - it)',
      'normal': 'φ(t) = exp(iμt - σ²t²/2)'
    };
    const result = table[distribution.toLowerCase()] ?? `φ(t) = E[e^(itX)] for ${distribution}`;
    this._recordHistory(`characteristicFunction: ${distribution}`);
    return result;
  }

  /**
   * 切比雪夫不等式：P(|X-μ| ≥ kσ) ≤ 1/k²
   * Chebyshev's inequality
   */
  public chebyshevInequality(mean: number, variance: number, k: number): number {
    if (k <= 0) return 1;
    const result = Math.min(1, variance / (k * k * variance)) || 1 / (k * k);
    this._recordHistory(`chebyshevInequality: ≤ ${result} for k=${k}`);
    return 1 / (k * k);
  }

  /**
   * 马尔可夫不等式：P(X ≥ k) ≤ E[X]/k
   * Markov's inequality
   */
  public markovInequality(mean: number, k: number): number {
    if (k <= 0) return 1;
    const result = Math.min(1, mean / k);
    this._recordHistory(`markovInequality: ≤ ${result} for k=${k}`);
    return result;
  }

  /**
   * 中心极限定理：样本均值近似正态
   * Central limit theorem approximation
   */
  public centralLimitTheorem(sample: number[], population: { mean: number; variance: number }): number {
    const sampleMean = sample.reduce((s, x) => s + x, 0) / Math.max(1, sample.length);
    const n = sample.length;
    const se = Math.sqrt(population.variance / Math.max(1, n));
    if (se < 1e-12) return 0;
    const z = (sampleMean - population.mean) / se;
    const result = 0.5 * (1 + this._erf(z / Math.sqrt(2)));
    this._recordHistory(`centralLimitTheorem: z=${z.toFixed(4)}, P≈${result.toFixed(4)}`);
    return result;
  }

  /**
   * 大数定律：样本均值 → 期望
   * Law of large numbers
   */
  public lawOfLargeNumbers(samples: number[]): number {
    const sum = samples.reduce((s, x) => s + x, 0);
    const result = sum / Math.max(1, samples.length);
    this._recordHistory(`lawOfLargeNumbers: ${samples.length} samples -> ${result}`);
    return result;
  }

  /**
   * 贝叶斯更新：P(A|B) = P(B|A)P(A) / P(B)
   * Bayesian update
   */
  public bayesianUpdate(prior: number, likelihood: number, evidence: number): number {
    if (evidence < 1e-12) return 0;
    const result = (likelihood * prior) / evidence;
    this._recordHistory(`bayesianUpdate: posterior = ${result}`);
    return result;
  }

  /**
   * 马尔可夫链：n 步状态分布
   * Markov chain after n steps
   */
  public markovChain(transitionMatrix: number[][], initial: number[], steps: number): number[] {
    let current = [...initial];
    for (let s = 0; s < steps; s++) {
      const next: number[] = new Array(current.length).fill(0);
      for (let i = 0; i < current.length; i++) {
        for (let j = 0; j < current.length; j++) {
          next[j] = (next[j] ?? 0) + current[i]! * (transitionMatrix[i]?.[j] ?? 0);
        }
      }
      current = next;
    }
    this._recordHistory(`markovChain: ${steps} steps`);
    return current;
  }

  /**
   * 平稳分布：πP = π
   * Stationary distribution
   */
  public stationaryDistribution(transitionMatrix: number[][]): number[] {
    const n = transitionMatrix.length;
    // Solve (P^T - I)π = 0 with constraint Σπ = 1
    const A = transitionMatrix[0]!.map((_, j) =>
      transitionMatrix.map((row, i) => (i === j ? row[j]! - 1 : row[j]!))
    );
    // Replace last equation with sum = 1
    A[n - 1] = new Array(n).fill(1);
    const b = new Array(n).fill(0);
    b[n - 1] = 1;
    // Solve via Gaussian elimination
    const aug = A.map((row, i) => [...row, b[i]!]);
    for (let i = 0; i < n; i++) {
      let pivot = i;
      for (let r = i + 1; r < n; r++) {
        if (Math.abs(aug[r]![i]!) > Math.abs(aug[pivot]![i]!)) pivot = r;
      }
      [aug[i]!, aug[pivot]!] = [aug[pivot]!, aug[i]!];
      const p = aug[i]![i]!;
      if (Math.abs(p) < 1e-12) continue;
      for (let c = 0; c <= n; c++) aug[i]![c] = aug[i]![c]! / p;
      for (let r = 0; r < n; r++) {
        if (r !== i) {
          const f = aug[r]![i]!;
          for (let c = 0; c <= n; c++) aug[r]![c] = aug[r]![c]! - f * aug[i]![c]!;
        }
      }
    }
    const result = aug.map(row => row[n] ?? 0);
    this._recordHistory('stationaryDistribution: solved');
    return result;
  }

  /**
   * 注册随机变量
   * Register a random variable
   */
  public registerVariable(name: string, variable: RandomVariable): void {
    this._variables.set(name, { id: name, variable });
    this._recordHistory(`registerVariable: ${name} (${variable.distribution})`);
  }

  /**
   * 转换为数据包
   * Serialize to DataPacket
   */
  public toPacket(): DataPacket<{
    variables: RandomVariable[];
    joints: JointDistribution[];
    mgfs: MomentGeneratingFunction[];
    history: string[];
  }> {
    return {
      id: `adv-prob-${Date.now()}-${this._counter}`,
      payload: {
        variables: Array.from(this._variables.values()).map(v => v.variable),
        joints: [...this._joints],
        mgfs: [...this._mgfs],
        history: [...this._history]
      },
      metadata: {
        createdAt: Date.now(),
        route: ['probability_theory', 'advanced', 'result'],
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
    this._variables.clear();
    this._joints = [];
    this._mgfs = [];
    this._history = [];
    this._counter = 0;
  }

  // ─── Private helpers ───

  private _recordHistory(entry: string): void {
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
    this._counter++;
  }

  private _factorial(n: number): number {
    if (n <= 1) return 1;
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }

  private _doubleFactorial(n: number): number {
    if (n <= 0) return 1;
    let r = 1;
    for (let i = n; i > 0; i -= 2) r *= i;
    return r;
  }

  private _bellNumber(n: number): number {
    if (n === 0) return 1;
    const bell: number[][] = [[1]];
    for (let i = 1; i <= n; i++) {
      const row: number[] = [bell[i - 1]![bell[i - 1]!.length - 1]!];
      for (let j = 1; j <= i; j++) {
        row.push(row[j - 1]! + bell[i - 1]![j - 1]!);
      }
      bell.push(row);
    }
    return bell[n]![0]!;
  }

  private _erf(x: number): number {
    // Abramowitz & Stegun approximation
    const sign = x < 0 ? -1 : 1;
    const ax = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * ax);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax);
    return sign * y;
  }
}
