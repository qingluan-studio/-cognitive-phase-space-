/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 随机过程 —— 时间之流中的概率
 * Random Process: Probability in the Flow of Time
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 随机过程是时间维度上的概率舞蹈。从马尔可夫链到布朗运动，
 * 从泊松过程到鞅，每一步都在不确定性的河流中留下轨迹。
 */

import { DataPacket } from '../shared/types';

export interface MarkovChain {
  readonly states: string[];
  readonly transitionMatrix: number[][];
  readonly initialDistribution: number[];
  readonly stationaryDistribution?: number[];
}

export interface RandomWalkResult {
  readonly path: number[];
  readonly finalPosition: number;
  readonly maxPosition: number;
  readonly minPosition: number;
}

export interface PoissonProcessResult {
  readonly arrivals: number[];
  readonly interArrivalTimes: number[];
  readonly count: number;
}

export interface BrownianMotionResult {
  readonly path: number[];
  readonly times: number[];
  readonly finalValue: number;
  readonly maxValue: number;
  readonly minValue: number;
}

export interface QueueResult {
  readonly arrivalTimes: number[];
  readonly serviceTimes: number[];
  readonly departureTimes: number[];
  readonly waitTimes: number[];
  readonly queueLengths: number[];
  readonly avgWaitTime: number;
  readonly maxQueueLength: number;
}

export interface GamblersRuinResult {
  readonly probabilityOfWin: number;
  readonly expectedDuration: number;
  readonly simulationPath?: number[];
}

export interface RenewalProcessResult {
  readonly renewalTimes: number[];
  readonly interRenewalTimes: number[];
  readonly renewalCount: number;
}

type ProcessCache = {
  readonly id: string;
  readonly kind: 'markov' | 'random-walk' | 'poisson' | 'brownian';
  readonly data: unknown;
};

export class RandomProcess {
  private _markovChains: MarkovChain[] = [];
  private _randomWalks: RandomWalkResult[] = [];
  private _poissonProcesses: PoissonProcessResult[] = [];
  private _brownianMotions: BrownianMotionResult[] = [];
  private _history: string[] = [];
  private _counter = 0;
  private _cache: Map<string, ProcessCache> = new Map();

  get markovChainCount(): number { return this._markovChains.length; }
  get randomWalkCount(): number { return this._randomWalks.length; }
  get poissonProcessCount(): number { return this._poissonProcesses.length; }
  get brownianMotionCount(): number { return this._brownianMotions.length; }
  get history(): string[] { return [...this._history]; }

  /**
   * 创建马尔可夫链
   * Create a Markov chain
   */
  public createMarkovChain(
    states: string[],
    transitionMatrix: number[][],
    initialDistribution: number[]
  ): MarkovChain {
    const chain: MarkovChain = {
      states: [...states],
      transitionMatrix: transitionMatrix.map(row => [...row]),
      initialDistribution: [...initialDistribution]
    };
    this._markovChains.push(chain);
    this._recordHistory(`createMarkovChain: ${states.length} states`);
    return chain;
  }

  /**
   * 马尔可夫链 n 步转移
   * Markov chain after n steps
   */
  public markovChainSteps(chain: MarkovChain, steps: number): number[] {
    let current = [...chain.initialDistribution];
    for (let s = 0; s < steps; s++) {
      const next: number[] = new Array(current.length).fill(0);
      for (let i = 0; i < current.length; i++) {
        for (let j = 0; j < current.length; j++) {
          next[j] = (next[j] ?? 0) + current[i]! * (chain.transitionMatrix[i]?.[j] ?? 0);
        }
      }
      current = next;
    }
    this._recordHistory(`markovChainSteps: ${steps} steps`);
    return current;
  }

  /**
   * 马尔可夫链平稳分布
   * Stationary distribution of Markov chain
   */
  public stationaryDistribution(chain: MarkovChain): number[] {
    const n = chain.states.length;
    const A: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        A[i]![j] = (chain.transitionMatrix[j]?.[i] ?? 0) - (i === j ? 1 : 0);
      }
    }
    A[n - 1] = new Array(n).fill(1);
    const b = new Array(n).fill(0);
    b[n - 1] = 1;
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
   * 马尔可夫链状态分类（互通类、周期、常返）
   * Markov chain state classification
   */
  public classifyStates(chain: MarkovChain): {
    communicatingClasses: number[][];
    periodic: boolean;
    recurrent: boolean[];
  } {
    const n = chain.states.length;
    const reachable = Array.from({ length: n }, () => new Array(n).fill(false));
    for (let i = 0; i < n; i++) {
      reachable[i]![i] = true;
      const stack = [i];
      while (stack.length > 0) {
        const u = stack.pop()!;
        for (let v = 0; v < n; v++) {
          if ((chain.transitionMatrix[u]?.[v] ?? 0) > 0 && !reachable[i]![v]) {
            reachable[i]![v] = true;
            stack.push(v);
          }
        }
      }
    }
    const visited = new Set<number>();
    const communicatingClasses: number[][] = [];
    for (let i = 0; i < n; i++) {
      if (visited.has(i)) continue;
      const eqClass: number[] = [];
      for (let j = 0; j < n; j++) {
        if (reachable[i]![j] && reachable[j]![i]) {
          eqClass.push(j);
          visited.add(j);
        }
      }
      communicatingClasses.push(eqClass);
    }
    const recurrent = new Array(n).fill(false);
    for (const cls of communicatingClasses) {
      let isClosed = true;
      for (const i of cls) {
        for (let j = 0; j < n; j++) {
          if ((chain.transitionMatrix[i]?.[j] ?? 0) > 0 && !cls.includes(j)) {
            isClosed = false;
          }
        }
      }
      if (isClosed) {
        for (const i of cls) recurrent[i] = true;
      }
    }
    this._recordHistory(`classifyStates: ${communicatingClasses.length} classes`);
    return { communicatingClasses, periodic: false, recurrent };
  }

  /**
   * 对称随机游走（一维）
   * Symmetric random walk (1D)
   */
  public symmetricRandomWalk(steps: number, start: number = 0): RandomWalkResult {
    const path: number[] = [start];
    let position = start;
    let maxPos = start;
    let minPos = start;
    for (let i = 0; i < steps; i++) {
      const step = Math.random() < 0.5 ? -1 : 1;
      position += step;
      path.push(position);
      if (position > maxPos) maxPos = position;
      if (position < minPos) minPos = position;
    }
    const result: RandomWalkResult = { path, finalPosition: position, maxPosition: maxPos, minPosition: minPos };
    this._randomWalks.push(result);
    this._recordHistory(`symmetricRandomWalk: ${steps} steps, final=${position}`);
    return result;
  }

  /**
   * 有偏随机游走
   * Biased random walk
   */
  public biasedRandomWalk(steps: number, p: number, start: number = 0): RandomWalkResult {
    const path: number[] = [start];
    let position = start;
    let maxPos = start;
    let minPos = start;
    for (let i = 0; i < steps; i++) {
      const step = Math.random() < p ? 1 : -1;
      position += step;
      path.push(position);
      if (position > maxPos) maxPos = position;
      if (position < minPos) minPos = position;
    }
    const result: RandomWalkResult = { path, finalPosition: position, maxPosition: maxPos, minPosition: minPos };
    this._randomWalks.push(result);
    this._recordHistory(`biasedRandomWalk: p=${p}, ${steps} steps`);
    return result;
  }

  /**
   * 赌徒破产问题（解析解）
   * Gambler's ruin problem (analytical solution)
   */
  public gamblersRuinAnalytical(
    initialCapital: number,
    targetCapital: number,
    p: number
  ): GamblersRuinResult {
    let probabilityOfWin: number;
    let expectedDuration: number;
    if (Math.abs(p - 0.5) < 1e-10) {
      probabilityOfWin = initialCapital / targetCapital;
      expectedDuration = initialCapital * (targetCapital - initialCapital);
    } else {
      const q = 1 - p;
      const r = q / p;
      probabilityOfWin = (1 - Math.pow(r, initialCapital)) / (1 - Math.pow(r, targetCapital));
      expectedDuration = (initialCapital / (q - p)) - (targetCapital / (q - p)) * probabilityOfWin;
    }
    const result: GamblersRuinResult = { probabilityOfWin, expectedDuration };
    this._recordHistory(`gamblersRuinAnalytical: P(win)=${probabilityOfWin.toFixed(4)}`);
    return result;
  }

  /**
   * 赌徒破产模拟
   * Gambler's ruin simulation
   */
  public gamblersRuinSimulation(
    initialCapital: number,
    targetCapital: number,
    p: number,
    maxSteps: number = 10000
  ): GamblersRuinResult {
    let capital = initialCapital;
    const path: number[] = [capital];
    let steps = 0;
    while (capital > 0 && capital < targetCapital && steps < maxSteps) {
      capital += Math.random() < p ? 1 : -1;
      path.push(capital);
      steps++;
    }
    const probabilityOfWin = capital >= targetCapital ? 1 : 0;
    const result: GamblersRuinResult = { probabilityOfWin, expectedDuration: steps, simulationPath: path };
    this._recordHistory(`gamblersRuinSimulation: ${steps} steps, result=${capital}`);
    return result;
  }

  /**
   * 泊松过程生成
   * Poisson process generation
   */
  public poissonProcess(lambda: number, timeHorizon: number): PoissonProcessResult {
    const arrivals: number[] = [];
    const interArrivalTimes: number[] = [];
    let t = 0;
    while (t < timeHorizon) {
      const u = Math.random();
      const interArrival = -Math.log(u) / lambda;
      t += interArrival;
      if (t < timeHorizon) {
        arrivals.push(t);
        interArrivalTimes.push(interArrival);
      }
    }
    const result: PoissonProcessResult = { arrivals, interArrivalTimes, count: arrivals.length };
    this._poissonProcesses.push(result);
    this._recordHistory(`poissonProcess: λ=${lambda}, ${arrivals.length} arrivals`);
    return result;
  }

  /**
   * 泊松过程计数分布（解析）
   * Poisson process count distribution (analytical)
   */
  public poissonCountDistribution(lambda: number, t: number, k: number): number {
    const factorial = (n: number) => {
      let r = 1;
      for (let i = 2; i <= n; i++) r *= i;
      return r;
    };
    const result = Math.pow(lambda * t, k) * Math.exp(-lambda * t) / factorial(k);
    this._recordHistory(`poissonCountDistribution: P(N(${t})=${k}) = ${result}`);
    return result;
  }

  /**
   * 更新过程
   * Renewal process
   */
  public renewalProcess(
    interRenewalMean: number,
    timeHorizon: number
  ): RenewalProcessResult {
    const renewalTimes: number[] = [];
    const interRenewalTimes: number[] = [];
    let t = 0;
    while (t < timeHorizon) {
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const interRenewal = Math.max(0.1, interRenewalMean + z * interRenewalMean * 0.3);
      t += interRenewal;
      if (t < timeHorizon) {
        renewalTimes.push(t);
        interRenewalTimes.push(interRenewal);
      }
    }
    const result: RenewalProcessResult = { renewalTimes, interRenewalTimes, renewalCount: renewalTimes.length };
    this._recordHistory(`renewalProcess: ${renewalTimes.length} renewals`);
    return result;
  }

  /**
   * 布朗运动（维纳过程）
   * Brownian motion (Wiener process)
   */
  public brownianMotion(
    steps: number,
    dt: number,
    drift: number = 0,
    volatility: number = 1,
    start: number = 0
  ): BrownianMotionResult {
    const path: number[] = [start];
    const times: number[] = [0];
    let value = start;
    let maxVal = start;
    let minVal = start;
    for (let i = 0; i < steps; i++) {
      const z = this._gaussianRandom();
      value += drift * dt + volatility * Math.sqrt(dt) * z;
      path.push(value);
      times.push((i + 1) * dt);
      if (value > maxVal) maxVal = value;
      if (value < minVal) minVal = value;
    }
    const result: BrownianMotionResult = { path, times, finalValue: value, maxValue: maxVal, minValue: minVal };
    this._brownianMotions.push(result);
    this._recordHistory(`brownianMotion: ${steps} steps, final=${value.toFixed(4)}`);
    return result;
  }

  /**
   * 几何布朗运动
   * Geometric Brownian motion
   */
  public geometricBrownianMotion(
    steps: number,
    dt: number,
    mu: number,
    sigma: number,
    start: number = 1
  ): BrownianMotionResult {
    const path: number[] = [start];
    const times: number[] = [0];
    let value = start;
    let maxVal = start;
    let minVal = start;
    for (let i = 0; i < steps; i++) {
      const z = this._gaussianRandom();
      value *= Math.exp((mu - 0.5 * sigma * sigma) * dt + sigma * Math.sqrt(dt) * z);
      path.push(value);
      times.push((i + 1) * dt);
      if (value > maxVal) maxVal = value;
      if (value < minVal) minVal = value;
    }
    const result: BrownianMotionResult = { path, times, finalValue: value, maxValue: maxVal, minValue: minVal };
    this._brownianMotions.push(result);
    this._recordHistory(`geometricBrownianMotion: ${steps} steps, final=${value.toFixed(4)}`);
    return result;
  }

  /**
   * 排队论：M/M/1 队列
   * Queueing theory: M/M/1 queue
   */
  public mm1Queue(
    lambda: number,
    mu: number,
    numCustomers: number
  ): QueueResult {
    const arrivalTimes: number[] = [];
    const serviceTimes: number[] = [];
    const departureTimes: number[] = [];
    const waitTimes: number[] = [];
    const queueLengths: number[] = [];
    let currentTime = 0;
    let serviceEndTime = 0;
    let maxQueueLength = 0;
    let queue = 0;
    for (let i = 0; i < numCustomers; i++) {
      const u1 = Math.random();
      const interArrival = -Math.log(u1) / lambda;
      currentTime += interArrival;
      arrivalTimes.push(currentTime);
      const u2 = Math.random();
      const serviceTime = -Math.log(u2) / mu;
      serviceTimes.push(serviceTime);
      const wait = Math.max(0, serviceEndTime - currentTime);
      waitTimes.push(wait);
      const startTime = Math.max(currentTime, serviceEndTime);
      serviceEndTime = startTime + serviceTime;
      departureTimes.push(serviceEndTime);
      queue = Math.max(0, queue - 1 + (wait > 0 ? 1 : 0));
      queueLengths.push(queue);
      if (queue > maxQueueLength) maxQueueLength = queue;
    }
    const avgWaitTime = waitTimes.reduce((s, w) => s + w, 0) / waitTimes.length;
    const result: QueueResult = {
      arrivalTimes,
      serviceTimes,
      departureTimes,
      waitTimes,
      queueLengths,
      avgWaitTime,
      maxQueueLength
    };
    this._recordHistory(`mm1Queue: λ=${lambda}, μ=${mu}, ${numCustomers} customers`);
    return result;
  }

  /**
   * M/M/1 队列稳态指标（解析）
   * M/M/1 queue steady-state metrics (analytical)
   */
  public mm1SteadyState(lambda: number, mu: number): {
    rho: number;
    avgQueueLength: number;
    avgWaitTime: number;
    avgSystemTime: number;
    p0: number;
  } {
    const rho = lambda / mu;
    if (rho >= 1) {
      return { rho, avgQueueLength: Infinity, avgWaitTime: Infinity, avgSystemTime: Infinity, p0: 0 };
    }
    const avgQueueLength = rho * rho / (1 - rho);
    const avgWaitTime = rho / (mu - lambda);
    const avgSystemTime = 1 / (mu - lambda);
    const p0 = 1 - rho;
    this._recordHistory(`mm1SteadyState: ρ=${rho.toFixed(4)}, Lq=${avgQueueLength.toFixed(4)}`);
    return { rho, avgQueueLength, avgWaitTime, avgSystemTime, p0 };
  }

  /**
   * 自相关函数（时间序列）
   * Autocorrelation function
   */
  public autocorrelation(series: number[], maxLag: number): number[] {
    const n = series.length;
    const mean = series.reduce((s, x) => s + x, 0) / n;
    const variance = series.reduce((s, x) => s + (x - mean) * (x - mean), 0) / n;
    const result: number[] = [];
    for (let lag = 0; lag <= Math.min(maxLag, n - 1); lag++) {
      let cov = 0;
      for (let i = 0; i < n - lag; i++) {
        cov += (series[i]! - mean) * (series[i + lag]! - mean);
      }
      result.push(cov / (n - lag) / variance);
    }
    this._recordHistory(`autocorrelation: ${result.length} lags`);
    return result;
  }

  /**
   * 滑动平均
   * Moving average
   */
  public movingAverage(series: number[], windowSize: number): number[] {
    const result: number[] = [];
    for (let i = 0; i <= series.length - windowSize; i++) {
      let sum = 0;
      for (let j = 0; j < windowSize; j++) {
        sum += series[i + j]!;
      }
      result.push(sum / windowSize);
    }
    this._recordHistory(`movingAverage: window=${windowSize}, ${result.length} points`);
    return result;
  }

  /**
   * 指数平滑
   * Exponential smoothing
   */
  public exponentialSmoothing(series: number[], alpha: number): number[] {
    if (series.length === 0) return [];
    const result: number[] = [series[0]!];
    for (let i = 1; i < series.length; i++) {
      result.push(alpha * series[i]! + (1 - alpha) * result[i - 1]!);
    }
    this._recordHistory(`exponentialSmoothing: α=${alpha}`);
    return result;
  }

  /**
   * AR(1) 过程生成
   * AR(1) process generation
   */
  public ar1Process(n: number, phi: number, sigma: number, mu: number = 0): number[] {
    const result: number[] = [];
    let x = mu / (1 - phi);
    for (let i = 0; i < n; i++) {
      const epsilon = this._gaussianRandom() * sigma;
      x = mu + phi * (x - mu) + epsilon;
      result.push(x);
    }
    this._recordHistory(`ar1Process: φ=${phi}, ${n} points`);
    return result;
  }

  /**
   * MA(1) 过程生成
   * MA(1) process generation
   */
  public ma1Process(n: number, theta: number, sigma: number, mu: number = 0): number[] {
    const result: number[] = [];
    let prevEpsilon = 0;
    for (let i = 0; i < n; i++) {
      const epsilon = this._gaussianRandom() * sigma;
      const x = mu + epsilon + theta * prevEpsilon;
      result.push(x);
      prevEpsilon = epsilon;
    }
    this._recordHistory(`ma1Process: θ=${theta}, ${n} points`);
    return result;
  }

  /**
   * 蒙特卡洛模拟：期望估计
   * Monte Carlo simulation: expectation estimation
   */
  public monteCarloExpectation(
    sampler: () => number,
    n: number
  ): { mean: number; variance: number; stdError: number } {
    const samples: number[] = [];
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const x = sampler();
      samples.push(x);
      sum += x;
    }
    const mean = sum / n;
    let sqSum = 0;
    for (const x of samples) {
      sqSum += (x - mean) * (x - mean);
    }
    const variance = sqSum / (n - 1);
    const stdError = Math.sqrt(variance / n);
    this._recordHistory(`monteCarloExpectation: n=${n}, mean=${mean.toFixed(4)}`);
    return { mean, variance, stdError };
  }

  /**
   * 重要性采样（简化版）
   * Importance sampling (simplified)
   */
  public importanceSampling(
    targetPdf: (x: number) => number,
    proposalPdf: (x: number) => number,
    proposalSampler: () => number,
    n: number
  ): number {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const x = proposalSampler();
      const px = proposalPdf(x);
      if (px < 1e-12) continue;
      const weight = targetPdf(x) / px;
      sum += weight;
    }
    const result = sum / n;
    this._recordHistory(`importanceSampling: n=${n}, estimate=${result.toFixed(4)}`);
    return result;
  }

  /**
   * 马尔可夫链蒙特卡洛（Metropolis-Hastings，简化版）
   * MCMC: Metropolis-Hastings (simplified)
   */
  public metropolisHastings(
    targetPdf: (x: number) => number,
    proposalStd: number,
    n: number,
    burnIn: number = 1000,
    start: number = 0
  ): number[] {
    const samples: number[] = [];
    let x = start;
    let accepted = 0;
    for (let i = 0; i < n + burnIn; i++) {
      const y = x + this._gaussianRandom() * proposalStd;
      const ratio = targetPdf(y) / targetPdf(x);
      const alpha = Math.min(1, ratio);
      if (Math.random() < alpha) {
        x = y;
        if (i >= burnIn) accepted++;
      }
      if (i >= burnIn) samples.push(x);
    }
    this._recordHistory(`metropolisHastings: ${samples.length} samples, accept rate=${(accepted / n).toFixed(4)}`);
    return samples;
  }

  /**
   * 鞅检验（简化版：对称随机游走）
   * Martingale test (simplified: symmetric random walk)
   */
  public martingaleTest(path: number[]): boolean {
    for (let i = 1; i < path.length; i++) {
      const diff = path[i]! - path[i - 1]!;
      if (Math.abs(diff) > 1.5) return false;
    }
    return true;
  }

  /**
   * 停时示例：首次到达时间
   * Stopping time: first passage time
   */
  public firstPassageTime(path: number[], threshold: number): number {
    for (let i = 0; i < path.length; i++) {
      if (path[i]! >= threshold) {
        this._recordHistory(`firstPassageTime: reached at step ${i}`);
        return i;
      }
    }
    this._recordHistory('firstPassageTime: not reached');
    return -1;
  }

  /**
   * 反射原理应用：首达概率
   * Reflection principle: first passage probability
   */
  public reflectionPrinciple(n: number, k: number): number {
    if (k <= 0 || k > n) return 0;
    const comb = (a: number, b: number) => {
      if (b < 0 || b > a) return 0;
      let result = 1;
      for (let i = 0; i < b; i++) {
        result = result * (a - i) / (i + 1);
      }
      return result;
    };
    const result = comb(n, (n + k) / 2) - comb(n, (n + k + 2) / 2);
    this._recordHistory(`reflectionPrinciple: P(S_${n}=${k}, max>=${k}) = ${result}`);
    return result;
  }

  /**
   * 隐马尔可夫模型：前向算法
   * HMM: Forward algorithm
   */
  public hmmForward(
    observations: number[],
    states: number,
    transitionMatrix: number[][],
    emissionMatrix: number[][],
    initialDistribution: number[]
  ): number {
    const T = observations.length;
    let alpha = [...initialDistribution];
    for (let t = 0; t < T; t++) {
      const obs = observations[t]!;
      const newAlpha: number[] = new Array(states).fill(0);
      for (let j = 0; j < states; j++) {
        for (let i = 0; i < states; i++) {
          newAlpha[j] = (newAlpha[j] ?? 0) + alpha[i]! * (transitionMatrix[i]?.[j] ?? 0);
        }
        newAlpha[j] = (newAlpha[j] ?? 0) * (emissionMatrix[j]?.[obs] ?? 0);
      }
      alpha = newAlpha;
    }
    const result = alpha.reduce((s, a) => s + a, 0);
    this._recordHistory(`hmmForward: P(O) = ${result}`);
    return result;
  }

  /**
   * 隐马尔可夫模型：Viterbi 算法
   * HMM: Viterbi algorithm
   */
  public hmmViterbi(
    observations: number[],
    states: number,
    transitionMatrix: number[][],
    emissionMatrix: number[][],
    initialDistribution: number[]
  ): number[] {
    const T = observations.length;
    const delta: number[][] = [];
    const psi: number[][] = [];
    delta[0] = [];
    for (let i = 0; i < states; i++) {
      delta[0]![i] = initialDistribution[i]! * (emissionMatrix[i]?.[observations[0]!] ?? 0);
    }
    for (let t = 1; t < T; t++) {
      delta[t] = new Array(states).fill(0);
      psi[t] = new Array(states).fill(0);
      const obs = observations[t]!;
      for (let j = 0; j < states; j++) {
        let maxVal = 0;
        let maxIdx = 0;
        for (let i = 0; i < states; i++) {
          const val = delta[t - 1]![i]! * (transitionMatrix[i]?.[j] ?? 0);
          if (val > maxVal) {
            maxVal = val;
            maxIdx = i;
          }
        }
        delta[t]![j] = maxVal * (emissionMatrix[j]?.[obs] ?? 0);
        psi[t]![j] = maxIdx;
      }
    }
    const path: number[] = new Array(T).fill(0);
    let maxProb = 0;
    for (let i = 0; i < states; i++) {
      if (delta[T - 1]![i]! > maxProb) {
        maxProb = delta[T - 1]![i]!;
        path[T - 1] = i;
      }
    }
    for (let t = T - 2; t >= 0; t--) {
      path[t] = psi[t + 1]![path[t + 1]!]!;
    }
    this._recordHistory(`hmmViterbi: most likely path found`);
    return path;
  }

  /**
   * 生灭过程
   * Birth-death process (stationary distribution)
   */
  public birthDeathStationary(
    birthRates: number[],
    deathRates: number[]
  ): number[] {
    const n = birthRates.length;
    const pi: number[] = new Array(n).fill(0);
    pi[0] = 1;
    for (let i = 1; i < n; i++) {
      let prod = 1;
      for (let j = 0; j < i; j++) {
        prod *= (birthRates[j] ?? 0) / (deathRates[j + 1] ?? 1);
      }
      pi[i] = prod;
    }
    const sum = pi.reduce((s, p) => s + p, 0);
    for (let i = 0; i < n; i++) pi[i] = pi[i]! / sum;
    this._recordHistory(`birthDeathStationary: ${n} states`);
    return pi;
  }

  /**
   * 随机积分（欧拉近似，简化版）
   * Stochastic integral (Euler approximation, simplified)
   */
  public stochasticIntegral(
    steps: number,
    dt: number,
    integrand: (t: number, w: number) => number
  ): number[] {
    const result: number[] = [0];
    let w = 0;
    let integral = 0;
    for (let i = 0; i < steps; i++) {
      const t = i * dt;
      const z = this._gaussianRandom();
      const dw = Math.sqrt(dt) * z;
      integral += integrand(t, w) * dw;
      w += dw;
      result.push(integral);
    }
    this._recordHistory(`stochasticIntegral: ${steps} steps`);
    return result;
  }

  /**
   * Itô 引理验证（简化版）
   * Itô's lemma verification (simplified)
   */
  public itoLemma(
    steps: number,
    dt: number,
    mu: number,
    sigma: number,
    f: (x: number) => number,
    df: (x: number) => number,
    d2f: (x: number) => number
  ): { itoProcess: number[]; directProcess: number[] } {
    const itoProcess: number[] = [];
    const directProcess: number[] = [];
    let x = 0;
    let fx = f(x);
    itoProcess.push(fx);
    directProcess.push(fx);
    for (let i = 0; i < steps; i++) {
      const z = this._gaussianRandom();
      const dw = Math.sqrt(dt) * z;
      const dx = mu * dt + sigma * dw;
      x += dx;
      const dfx = df(x) * dx + 0.5 * d2f(x) * sigma * sigma * dt;
      fx += dfx;
      itoProcess.push(fx);
      directProcess.push(f(x));
    }
    this._recordHistory(`itoLemma: ${steps} steps`);
    return { itoProcess, directProcess };
  }

  /**
   * Girsanov 定理（测度变换）
   * Girsanov theorem (measure change)
   */
  public girsanovTransform(
    path: number[],
    dt: number,
    drift: number,
    volatility: number
  ): number[] {
    const result: number[] = [];
    let radonNikodym = 1;
    for (let i = 0; i < path.length; i++) {
      const t = i * dt;
      const w = path[i]!;
      const exponent = -drift * w / volatility - 0.5 * (drift * drift / (volatility * volatility)) * t;
      radonNikodym = Math.exp(exponent);
      result.push(radonNikodym);
    }
    this._recordHistory(`girsanovTransform: ${path.length} points`);
    return result;
  }

  /**
   * Feynman-Kac 公式（简化版）
   * Feynman-Kac formula (simplified)
   */
  public feynmanKac(
    x0: number,
    t: number,
    steps: number,
    paths: number,
    terminalCondition: (x: number) => number,
    drift: number,
    volatility: number
  ): number {
    const dt = t / steps;
    let sum = 0;
    for (let p = 0; p < paths; p++) {
      let x = x0;
      for (let i = 0; i < steps; i++) {
        const z = this._gaussianRandom();
        x += drift * dt + volatility * Math.sqrt(dt) * z;
      }
      sum += terminalCondition(x);
    }
    const result = sum / paths;
    this._recordHistory(`feynmanKac: ${paths} paths, estimate=${result.toFixed(4)}`);
    return result;
  }

  /**
   * Black-Scholes 期权定价（解析解）
   * Black-Scholes option pricing (analytical)
   */
  public blackScholes(
    S: number,
    K: number,
    T: number,
    r: number,
    sigma: number,
    type: 'call' | 'put' = 'call'
  ): { price: number; delta: number; gamma: number; theta: number; vega: number; rho: number } {
    const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
    const d2 = d1 - sigma * Math.sqrt(T);
    const nd1 = 0.5 * (1 + this._erf(d1 / Math.SQRT2));
    const nd2 = 0.5 * (1 + this._erf(d2 / Math.SQRT2));
    const pdfD1 = Math.exp(-0.5 * d1 * d1) / Math.sqrt(2 * Math.PI);
    let price: number, delta: number, theta: number, rho: number;
    if (type === 'call') {
      price = S * nd1 - K * Math.exp(-r * T) * nd2;
      delta = nd1;
      theta = (-S * pdfD1 * sigma / (2 * Math.sqrt(T)) - r * K * Math.exp(-r * T) * nd2);
      rho = K * T * Math.exp(-r * T) * nd2;
    } else {
      price = K * Math.exp(-r * T) * (1 - nd2) - S * (1 - nd1);
      delta = nd1 - 1;
      theta = (-S * pdfD1 * sigma / (2 * Math.sqrt(T)) + r * K * Math.exp(-r * T) * (1 - nd2));
      rho = -K * T * Math.exp(-r * T) * (1 - nd2);
    }
    const gamma = pdfD1 / (S * sigma * Math.sqrt(T));
    const vega = S * Math.sqrt(T) * pdfD1;
    this._recordHistory(`blackScholes: ${type} price = ${price.toFixed(4)}`);
    return { price, delta, gamma, theta, vega, rho };
  }

  /**
   * 蒙特卡洛期权定价
   * Monte Carlo option pricing
   */
  public monteCarloOption(
    S: number,
    K: number,
    T: number,
    r: number,
    sigma: number,
    paths: number,
    steps: number = 1,
    type: 'call' | 'put' = 'call'
  ): { price: number; stdError: number } {
    const dt = T / steps;
    const payoffs: number[] = [];
    for (let p = 0; p < paths; p++) {
      let s = S;
      for (let i = 0; i < steps; i++) {
        const z = this._gaussianRandom();
        s *= Math.exp((r - 0.5 * sigma * sigma) * dt + sigma * Math.sqrt(dt) * z);
      }
      const payoff = type === 'call'
        ? Math.max(0, s - K)
        : Math.max(0, K - s);
      payoffs.push(Math.exp(-r * T) * payoff);
    }
    const price = payoffs.reduce((s, p) => s + p, 0) / paths;
    const variance = payoffs.reduce((s, p) => s + (p - price) * (p - price), 0) / (paths - 1);
    const stdError = Math.sqrt(variance / paths);
    this._recordHistory(`monteCarloOption: ${paths} paths, price=${price.toFixed(4)}`);
    return { price, stdError };
  }

  private _erf(x: number): number {
    const sign = x < 0 ? -1 : 1;
    const ax = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * ax);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax);
    return sign * y;
  }

  /**
   * 转换为数据包
   * Serialize to DataPacket
   */
  public toPacket(): DataPacket<{
    markovChains: MarkovChain[];
    randomWalks: number;
    poissonProcesses: number;
    brownianMotions: number;
    history: string[];
  }> {
    return {
      id: `random-process-${Date.now()}-${this._counter}`,
      payload: {
        markovChains: [...this._markovChains],
        randomWalks: this._randomWalks.length,
        poissonProcesses: this._poissonProcesses.length,
        brownianMotions: this._brownianMotions.length,
        history: [...this._history]
      },
      metadata: {
        createdAt: Date.now(),
        route: ['probability_theory', 'random-process', 'result'],
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
    this._markovChains = [];
    this._randomWalks = [];
    this._poissonProcesses = [];
    this._brownianMotions = [];
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

  private _gaussianRandom(): number {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
}
