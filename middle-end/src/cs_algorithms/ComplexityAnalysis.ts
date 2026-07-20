import { DataPacket, PacketMeta } from '../shared/types';

/** Big-O complexity class. */
export type ComplexityClass =
  | 'O(1)'
  | 'O(log n)'
  | 'O(log^2 n)'
  | 'O(sqrt n)'
  | 'O(n)'
  | 'O(n log n)'
  | 'O(n log^2 n)'
  | 'O(n^2)'
  | 'O(n^2 log n)'
  | 'O(n^3)'
  | 'O(n^k)'
  | 'O(2^n)'
  | 'O(n!)'
  | 'O(k^n)'
  | 'Theta'
  | 'Omega'
  | 'unknown';

/** Single measurement of an algorithm's runtime or operation count. */
export interface ComplexityMeasurement {
  n: number;
  operations: number;
  durationMs: number;
  memoryBytes?: number;
}

/** Result of complexity analysis. */
export interface ComplexityAnalysisResult {
  bestFit: ComplexityClass;
  coefficient: number;
  exponent: number;
  rSquared: number;
  measurements: ComplexityMeasurement[];
  predictions: Array<{ n: number; predictedOps: number }>;
}

/** Master theorem case classification. */
export type MasterTheoremCase = 'case1' | 'case2' | 'case3' | 'inapplicable';

/** Master theorem input parameters. */
export interface MasterTheoremInput {
  a: number;
  b: number;
  f: (n: number) => number;
  fDescription: string;
}

/** Master theorem result. */
export interface MasterTheoremResult {
  input: MasterTheoremInput;
  case: MasterTheoremCase;
  solution: string;
  complexity: ComplexityClass;
  criticalExponent: number;
}

/** Resource usage snapshot for amortized analysis. */
export interface ResourceSnapshot {
  step: number;
  actualCost: number;
  amortizedCost: number;
  cumulativeActual: number;
  cumulativeAmortized: number;
  potential: number;
}

/** Amortized analysis result. */
export interface AmortizedAnalysisResult {
  snapshots: ResourceSnapshot[];
  totalActual: number;
  totalAmortized: number;
  averageActual: number;
  averageAmortized: number;
  boundType: 'aggregate' | 'accounting' | 'potential';
}

/** Recurrence relation term. */
export interface RecurrenceTerm {
  coefficient: number;
  recurrenceNumerator: number;
  recurrenceDenominator: number;
  baseCase: number;
  baseSize: number;
}

/** Recurrence solution. */
export interface RecurrenceSolution {
  recurrence: string;
  complexity: ComplexityClass;
  method: 'master' | 'substitution' | 'iteration' | 'recursion-tree';
  explanation: string;
}

/** Operation counter for instrumented analysis. */
export interface OperationCounter {
  comparisons: number;
  swaps: number;
  assignments: number;
  arrayAccesses: number;
  functionCalls: number;
  arithmeticOps: number;
  branches: number;
}

/** Complexity theory classification entry. */
export interface ProblemComplexity {
  name: string;
  category: 'P' | 'NP' | 'NP-Hard' | 'NP-Complete' | 'co-NP' | 'PSPACE' | 'EXPTIME' | 'NEXPTIME';
  reductionFrom?: string;
  notes: string;
}

/** Performance benchmark entry. */
export interface BenchmarkEntry {
  algorithm: string;
  inputSize: number;
  operations: number;
  durationMs: number;
  memoryBytes: number;
  timestamp: number;
}

/** Time/space complexity descriptor for an algorithm. */
export interface AlgorithmProfile {
  name: string;
  bestTime: ComplexityClass;
  averageTime: ComplexityClass;
  worstTime: ComplexityClass;
  worstSpace: ComplexityClass;
  stable: boolean;
  inPlace: boolean;
  notes: string;
}

/** Internal history entry. */
interface ComplexityHistoryEntry {
  algorithm: string;
  inputSize: number;
  operations: number;
  timestamp: number;
  analysis: ComplexityClass;
}

/**
 * Comprehensive complexity analysis toolkit:
 *  - Empirical complexity fitting from measurements
 *  - Master theorem solver for divide-and-conquer recurrences
 *  - Recurrence solvers (substitution, iteration, recursion-tree)
 *  - Amortized analysis (aggregate, accounting, potential)
 *  - Operation counting with multiple counters
 *  - Standard algorithm profile registry
 *  - NP-completeness reference table
 */
export class ComplexityAnalysis {
  private _history: ComplexityHistoryEntry[] = [];
  private _benchmarks: BenchmarkEntry[] = [];
  private _counter: number = 0;
  private _counters: OperationCounter = {
    comparisons: 0,
    swaps: 0,
    assignments: 0,
    arrayAccesses: 0,
    functionCalls: 0,
    arithmeticOps: 0,
    branches: 0,
  };

  /** Reset all operation counters. */
  resetCounters(): void {
    this._counters = { comparisons: 0, swaps: 0, assignments: 0, arrayAccesses: 0, functionCalls: 0, arithmeticOps: 0, branches: 0 };
  }

  /** Increment a specific counter. */
  inc(name: keyof OperationCounter, by: number = 1): void {
    this._counters[name] += by;
  }

  /** Get a snapshot of current counters. */
  get counters(): OperationCounter {
    return { ...this._counters };
  }

  /** Total operations across all counters. */
  totalOperations(): number {
    return Object.values(this._counters).reduce((s, v) => s + v, 0);
  }

  /** Execute a function while measuring operations and time. */
  measure<T>(fn: () => T, n: number, algorithm: string = 'unknown'): { result: T; measurement: ComplexityMeasurement } {
    this.resetCounters();
    const start = Date.now();
    const result = fn();
    const durationMs = Date.now() - start;
    const operations = this.totalOperations();
    const measurement: ComplexityMeasurement = { n, operations, durationMs };
    this._history.push({ algorithm, inputSize: n, operations, timestamp: Date.now(), analysis: 'unknown' });
    this._benchmarks.push({ algorithm, inputSize: n, operations, durationMs, memoryBytes: 0, timestamp: Date.now() });
    this._counter++;
    return { result, measurement };
  }

  /** Run a function on multiple input sizes and collect measurements. */
  benchmark<T>(factory: (n: number) => T, fn: (input: T) => void, sizes: number[], algorithm: string = 'unknown'): ComplexityMeasurement[] {
    const measurements: ComplexityMeasurement[] = [];
    for (const n of sizes) {
      const input = factory(n);
      const start = Date.now();
      this.resetCounters();
      fn(input);
      const durationMs = Date.now() - start;
      const operations = this.totalOperations();
      const measurement: ComplexityMeasurement = { n, operations, durationMs };
      measurements.push(measurement);
      this._history.push({ algorithm, inputSize: n, operations, timestamp: Date.now(), analysis: 'unknown' });
      this._benchmarks.push({ algorithm, inputSize: n, operations, durationMs, memoryBytes: 0, timestamp: Date.now() });
      this._counter++;
    }
    return measurements;
  }

  /** Theoretical growth rates for known complexity classes. */
  static growthRate(c: ComplexityClass, n: number): number {
    switch (c) {
      case 'O(1)': return 1;
      case 'O(log n)': return Math.log2(Math.max(2, n));
      case 'O(log^2 n)': { const l = Math.log2(Math.max(2, n)); return l * l; }
      case 'O(sqrt n)': return Math.sqrt(Math.max(1, n));
      case 'O(n)': return n;
      case 'O(n log n)': return n * Math.log2(Math.max(2, n));
      case 'O(n log^2 n)': { const l = Math.log2(Math.max(2, n)); return n * l * l; }
      case 'O(n^2)': return n * n;
      case 'O(n^2 log n)': return n * n * Math.log2(Math.max(2, n));
      case 'O(n^3)': return n * n * n;
      case 'O(2^n)': return Math.pow(2, n);
      case 'O(n!)': {
        let r = 1;
        for (let i = 2; i <= n; i++) r *= i;
        return r;
      }
      default: return n;
    }
  }

  /** Compute best-fit complexity class from measurements. */
  analyzeComplexity(measurements: ComplexityMeasurement[]): ComplexityAnalysisResult {
    if (measurements.length < 2) {
      return { bestFit: 'unknown', coefficient: 0, exponent: 0, rSquared: 0, measurements, predictions: [] };
    }
    const candidates: ComplexityClass[] = [
      'O(1)', 'O(log n)', 'O(sqrt n)', 'O(n)', 'O(n log n)', 'O(n^2)', 'O(n^3)', 'O(2^n)',
    ];
    let bestFit: ComplexityClass = 'unknown';
    let bestR2 = -Infinity;
    let coefficient = 0;
    let exponent = 0;
    for (const c of candidates) {
      const { r2, slope, intercept } = this._fitComplexity(c, measurements);
      if (r2 > bestR2) {
        bestR2 = r2;
        bestFit = c;
        coefficient = Math.exp(intercept);
        exponent = slope;
      }
    }
    const predictions = measurements.map(m => ({
      n: m.n,
      predictedOps: coefficient * ComplexityAnalysis.growthRate(bestFit, m.n),
    }));
    return { bestFit, coefficient, exponent, rSquared: bestR2, measurements, predictions };
  }

  /** Fit measurements to a complexity class using log-log linear regression. */
  private _fitComplexity(c: ComplexityClass, measurements: ComplexityMeasurement[]): { r2: number; slope: number; intercept: number } {
    const points: Array<{ x: number; y: number }> = [];
    for (const m of measurements) {
      const x = ComplexityAnalysis.growthRate(c, m.n);
      if (x <= 0 || m.operations <= 0) continue;
      points.push({ x: Math.log(x), y: Math.log(m.operations) });
    }
    if (points.length < 2) return { r2: -Infinity, slope: 0, intercept: 0 };
    const n = points.length;
    const sumX = points.reduce((s, p) => s + p.x, 0);
    const sumY = points.reduce((s, p) => s + p.y, 0);
    const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
    const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
    const denom = n * sumX2 - sumX * sumX;
    if (Math.abs(denom) < 1e-12) return { r2: 0, slope: 0, intercept: sumY / n };
    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;
    const meanY = sumY / n;
    let ssTot = 0;
    let ssRes = 0;
    for (const p of points) {
      const pred = slope * p.x + intercept;
      ssTot += Math.pow(p.y - meanY, 2);
      ssRes += Math.pow(p.y - pred, 2);
    }
    const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
    return { r2, slope, intercept };
  }

  /** Solve recurrence T(n) = a*T(n/b) + f(n) via Master Theorem. */
  masterTheorem(input: MasterTheoremInput): MasterTheoremResult {
    const { a, b, f } = input;
    if (a <= 0 || b <= 1) {
      return {
        input,
        case: 'inapplicable',
        solution: 'Master theorem requires a >= 1 and b > 1',
        complexity: 'unknown',
        criticalExponent: NaN,
      };
    }
    const logBA = Math.log(b) / Math.log(a);
    const criticalExponent = logBA;
    // Compare f(n) with n^(log_b a)
    const samples = [100, 1000, 10000, 100000];
    const fValues = samples.map(n => f(n));
    const nCritValues = samples.map(n => Math.pow(n, criticalExponent));
    // Compute polynomial exponents via regression in log-log space
    const fExp = this._estimateExponent(samples, fValues);
    const critExp = this._estimateExponent(samples, nCritValues);
    if (fExp < critExp - 0.05) {
      const e = criticalExponent.toFixed(3);
      return {
        input,
        case: 'case1',
        solution: `f(n) = O(n^(log_b a - ε)) for some ε > 0, so T(n) = Θ(n^(log_b a)) = Θ(n^${e})`,
        complexity: this._complexityFromExponent(criticalExponent),
        criticalExponent,
      };
    }
    if (Math.abs(fExp - critExp) < 0.1) {
      const e = criticalExponent.toFixed(3);
      return {
        input,
        case: 'case2',
        solution: `f(n) = Θ(n^(log_b a) * log^k n) for some k >= 0, so T(n) = Θ(n^(log_b a) * log n) = Θ(n^${e} * log n)`,
        complexity: 'O(n log n)',
        criticalExponent,
      };
    }
    if (fExp > critExp + 0.05) {
      // Need regularity: a f(n/b) <= c f(n) for c < 1
      let regular = true;
      for (const n of samples) {
        if (a * f(n / b) > 0.99 * f(n)) { regular = false; break; }
      }
      if (regular) {
        return {
          input,
          case: 'case3',
          solution: `f(n) = Ω(n^(log_b a + ε)) and a f(n/b) <= c f(n), so T(n) = Θ(f(n))`,
          complexity: this._complexityFromExponent(fExp),
          criticalExponent,
        };
      }
    }
    return {
      input,
      case: 'inapplicable',
      solution: 'Master theorem inapplicable: regularity condition fails or growth mismatch',
      complexity: 'unknown',
      criticalExponent,
    };
  }

  /** Estimate polynomial exponent via log-log regression. */
  private _estimateExponent(ns: number[], values: number[]): number {
    const points = ns.map((n, i) => ({ x: Math.log(n), y: Math.log(Math.max(1, values[i])) }));
    const n = points.length;
    const sumX = points.reduce((s, p) => s + p.x, 0);
    const sumY = points.reduce((s, p) => s + p.y, 0);
    const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
    const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
    const denom = n * sumX2 - sumX * sumX;
    if (Math.abs(denom) < 1e-12) return 0;
    return (n * sumXY - sumX * sumY) / denom;
  }

  /** Map a polynomial exponent to a ComplexityClass. */
  private _complexityFromExponent(e: number): ComplexityClass {
    if (e < 0.05) return 'O(1)';
    if (Math.abs(e - 0.5) < 0.1) return 'O(sqrt n)';
    if (Math.abs(e - 1) < 0.1) return 'O(n)';
    if (Math.abs(e - 2) < 0.1) return 'O(n^2)';
    if (Math.abs(e - 3) < 0.1) return 'O(n^3)';
    return 'O(n^k)';
  }

  /** Solve a recurrence via the substitution method. */
  substitutionMethod(recurrence: string, guess: ComplexityClass, verifySteps: number = 5): RecurrenceSolution {
    // Very simplified: assumes T(n) = a*T(n/b) + f(n)
    const match = recurrence.match(/T\(n\)\s*=\s*(\d+)\s*\*\s*T\(n\s*\/\s*(\d+)\)\s*\+\s*(.+)/);
    if (!match) {
      return {
        recurrence,
        complexity: guess,
        method: 'substitution',
        explanation: 'Could not parse recurrence; using provided guess.',
      };
    }
    const a = parseInt(match[1], 10);
    const b = parseInt(match[2], 10);
    const fStr = match[3].trim();
    const logBA = Math.log(b) / Math.log(a);
    let inductionHolds = true;
    // Inductive verification: assume T(n/b) <= c * g(n/b) and check T(n) <= c * g(n)
    const c = 1; // scaling constant
    for (let k = 1; k <= verifySteps; k++) {
      const n = Math.pow(b, k + 1);
      const gN = ComplexityAnalysis.growthRate(guess, n);
      const gNb = ComplexityAnalysis.growthRate(guess, n / b);
      const fN = this._evaluateF(fStr, n);
      if (c * gNb * a + fN > c * gN + 1e-9) {
        inductionHolds = false;
        break;
      }
    }
    return {
      recurrence,
      complexity: guess,
      method: 'substitution',
      explanation: `Assume T(n/b) <= c*g(n/b) where g is ${guess}. Inductive step ${inductionHolds ? 'holds' : 'fails'} for a=${a}, b=${b}, log_b(a)=${logBA.toFixed(3)}.`,
    };
  }

  /** Solve a recurrence via the iteration (plug-and-chug) method. */
  iterationMethod(recurrence: string, depth: number = 10): RecurrenceSolution {
    const match = recurrence.match(/T\(n\)\s*=\s*(\d+)\s*\*\s*T\(n\s*\/\s*(\d+)\)\s*\+\s*(.+)/);
    if (!match) {
      return {
        recurrence,
        complexity: 'unknown',
        method: 'iteration',
        explanation: 'Could not parse recurrence',
      };
    }
    const a = parseInt(match[1], 10);
    const b = parseInt(match[2], 10);
    const fStr = match[3].trim();
    const logBA = Math.log(b) / Math.log(a);
    const terms: Array<{ level: number; cost: number; subproblemSize: number }> = [];
    let total = 0;
    for (let i = 0; i < depth; i++) {
      const subproblemSize = Math.pow(b, -i);
      if (subproblemSize * 1000 < 1) break;
      const cost = Math.pow(a, i) * this._evaluateF(fStr, 1000 * subproblemSize);
      terms.push({ level: i, cost, subproblemSize });
      total += cost;
    }
    void total;
    const complexity = this._complexityFromExponent(logBA);
    return {
      recurrence,
      complexity: complexity === 'O(n^k)' ? 'O(n log n)' : complexity,
      method: 'iteration',
      explanation: `Iterated ${terms.length} levels; sum of per-level costs converges asymptotically.`,
    };
  }

  /** Solve a recurrence via the recursion tree method. */
  recursionTreeMethod(recurrence: string, maxDepth: number = 20): RecurrenceSolution {
    const match = recurrence.match(/T\(n\)\s*=\s*(\d+)\s*\*\s*T\(n\s*\/\s*(\d+)\)\s*\+\s*(.+)/);
    if (!match) {
      return {
        recurrence,
        complexity: 'unknown',
        method: 'recursion-tree',
        explanation: 'Could not parse recurrence',
      };
    }
    const a = parseInt(match[1], 10);
    const b = parseInt(match[2], 10);
    const fStr = match[3].trim();
    const logBA = Math.log(b) / Math.log(a);
    const tree: Array<{ level: number; subproblems: number; size: number; perNodeCost: number; levelCost: number }> = [];
    for (let i = 0; i < maxDepth; i++) {
      const size = Math.pow(b, -i);
      if (size < 0.001) break;
      const subproblems = Math.pow(a, i);
      const perNodeCost = this._evaluateF(fStr, 1000 * size);
      const levelCost = subproblems * perNodeCost;
      tree.push({ level: i, subproblems, size: 1000 * size, perNodeCost, levelCost });
    }
    const lastCost = tree[tree.length - 1]?.levelCost ?? 0;
    const firstCost = tree[0]?.levelCost ?? 1;
    let trend: 'increasing' | 'decreasing' | 'constant';
    if (lastCost > firstCost * 1.2) trend = 'increasing';
    else if (lastCost < firstCost * 0.8) trend = 'decreasing';
    else trend = 'constant';
    let complexity: ComplexityClass;
    if (trend === 'increasing') {
      complexity = this._complexityFromExponent(this._estimateExponent(tree.map(t => t.level), tree.map(t => t.levelCost)));
    } else if (trend === 'decreasing') {
      complexity = this._complexityFromExponent(logBA);
    } else {
      complexity = 'O(n log n)';
    }
    return {
      recurrence,
      complexity,
      method: 'recursion-tree',
      explanation: `Tree depth ${tree.length}; per-level cost trend is ${trend} (log_b a = ${logBA.toFixed(3)}).`,
    };
  }

  /** Evaluate a textual function expression like 'n', 'n^2', 'n*log(n)' for a given n. */
  private _evaluateF(expr: string, n: number): number {
    const e = expr.toLowerCase().replace(/\s/g, '');
    if (e === '1' || e === 'o(1)') return 1;
    if (e === 'n') return n;
    if (e === 'n^2') return n * n;
    if (e === 'n^3') return n * n * n;
    if (e === 'log(n)' || e === 'logn') return Math.log2(Math.max(2, n));
    if (e === 'n*log(n)' || e === 'nlogn') return n * Math.log2(Math.max(2, n));
    if (e === 'n^2*log(n)') return n * n * Math.log2(Math.max(2, n));
    if (e === 'sqrt(n)') return Math.sqrt(Math.max(1, n));
    // Try eval as last resort (sandbox-safe since we control inputs)
    try {
      const f = new Function('n', `return ${e.replace(/\^/g, '**').replace(/log/g, 'Math.log2')};`);
      return f(n);
    } catch {
      return n;
    }
  }

  /** Aggregate method amortized analysis: average cost over n operations. */
  aggregateAnalysis(costs: number[]): AmortizedAnalysisResult {
    const snapshots: ResourceSnapshot[] = [];
    let cumulativeActual = 0;
    let cumulativeAmortized = 0;
    let potential = 0;
    const totalAmortized = costs.reduce((s, c) => s + c, 0) / Math.max(1, costs.length);
    for (let i = 0; i < costs.length; i++) {
      cumulativeActual += costs[i];
      cumulativeAmortized += totalAmortized;
      potential = cumulativeAmortized - cumulativeActual;
      snapshots.push({
        step: i,
        actualCost: costs[i],
        amortizedCost: totalAmortized,
        cumulativeActual,
        cumulativeAmortized,
        potential,
      });
    }
    const totalActual = cumulativeActual;
    return {
      snapshots,
      totalActual,
      totalAmortized: cumulativeAmortized,
      averageActual: totalActual / Math.max(1, costs.length),
      averageAmortized: totalAmortized,
      boundType: 'aggregate',
    };
  }

  /** Accounting method amortized analysis. */
  accountingMethod(costs: number[], charges: number[]): AmortizedAnalysisResult {
    const snapshots: ResourceSnapshot[] = [];
    let cumulativeActual = 0;
    let cumulativeAmortized = 0;
    let potential = 0;
    for (let i = 0; i < costs.length; i++) {
      cumulativeActual += costs[i];
      cumulativeAmortized += charges[i];
      potential = cumulativeAmortized - cumulativeActual;
      snapshots.push({
        step: i,
        actualCost: costs[i],
        amortizedCost: charges[i],
        cumulativeActual,
        cumulativeAmortized,
        potential,
      });
    }
    return {
      snapshots,
      totalActual: cumulativeActual,
      totalAmortized: cumulativeAmortized,
      averageActual: cumulativeActual / Math.max(1, costs.length),
      averageAmortized: cumulativeAmortized / Math.max(1, costs.length),
      boundType: 'accounting',
    };
  }

  /** Potential method amortized analysis with custom potential function. */
  potentialMethod(costs: number[], potential: (i: number, prev: number) => number): AmortizedAnalysisResult {
    const snapshots: ResourceSnapshot[] = [];
    let cumulativeActual = 0;
    let cumulativeAmortized = 0;
    let prevPotential = 0;
    for (let i = 0; i < costs.length; i++) {
      const newPotential = potential(i, prevPotential);
      const amortized = costs[i] + newPotential - prevPotential;
      cumulativeActual += costs[i];
      cumulativeAmortized += amortized;
      snapshots.push({
        step: i,
        actualCost: costs[i],
        amortizedCost: amortized,
        cumulativeActual,
        cumulativeAmortized,
        potential: newPotential,
      });
      prevPotential = newPotential;
    }
    return {
      snapshots,
      totalActual: cumulativeActual,
      totalAmortized: cumulativeAmortized,
      averageActual: cumulativeActual / Math.max(1, costs.length),
      averageAmortized: cumulativeAmortized / Math.max(1, costs.length),
      boundType: 'potential',
    };
  }

  /** Standard binary counter increment cost analysis. */
  binaryCounterAmortized(numIncrements: number): AmortizedAnalysisResult {
    const costs: number[] = [];
    let value = 0;
    for (let i = 0; i < numIncrements; i++) {
      let cost = 1;
      let v = ++value;
      while (v % 2 === 0) { cost++; v /= 2; }
      costs.push(cost);
    }
    return this.aggregateAnalysis(costs);
  }

  /** Multipop stack amortized analysis. */
  multipopStackAmortized(operations: Array<{ type: 'push' | 'pop' | 'multipop'; k?: number }>): AmortizedAnalysisResult {
    const costs: number[] = operations.map(op => {
      if (op.type === 'push') return 1;
      if (op.type === 'pop') return 1;
      return op.k ?? 1; // multipop costs min(k, stack.size) but we use k as upper bound
    });
    // Accounting method: charge 2 per push, 0 per pop/multipop
    const charges: number[] = operations.map(op => op.type === 'push' ? 2 : 0);
    return this.accountingMethod(costs, charges);
  }

  /** Dynamic table doubling amortized analysis. */
  dynamicTableDoubling(numInsertions: number, initialCapacity: number = 1): AmortizedAnalysisResult {
    const costs: number[] = [];
    let capacity = initialCapacity;
    let size = 0;
    for (let i = 0; i < numInsertions; i++) {
      if (size === capacity) {
        costs.push(size + 1); // doubling cost = copy size + insert
        capacity *= 2;
      } else {
        costs.push(1);
      }
      size++;
    }
    return this.aggregateAnalysis(costs);
  }

  /** Registry of standard algorithm complexity profiles. */
  private static _profiles: Record<string, AlgorithmProfile> = {
    bubbleSort: { name: 'Bubble Sort', bestTime: 'O(n)', averageTime: 'O(n^2)', worstTime: 'O(n^2)', worstSpace: 'O(1)', stable: true, inPlace: true, notes: 'Stable comparison sort' },
    insertionSort: { name: 'Insertion Sort', bestTime: 'O(n)', averageTime: 'O(n^2)', worstTime: 'O(n^2)', worstSpace: 'O(1)', stable: true, inPlace: true, notes: 'Best for small or nearly-sorted arrays' },
    selectionSort: { name: 'Selection Sort', bestTime: 'O(n^2)', averageTime: 'O(n^2)', worstTime: 'O(n^2)', worstSpace: 'O(1)', stable: false, inPlace: true, notes: 'Minimizes swaps' },
    mergeSort: { name: 'Merge Sort', bestTime: 'O(n log n)', averageTime: 'O(n log n)', worstTime: 'O(n log n)', worstSpace: 'O(n)', stable: true, inPlace: false, notes: 'Stable divide-and-conquer' },
    quickSort: { name: 'Quick Sort', bestTime: 'O(n log n)', averageTime: 'O(n log n)', worstTime: 'O(n^2)', worstSpace: 'O(log n)', stable: false, inPlace: true, notes: 'Pivot choice matters' },
    heapSort: { name: 'Heap Sort', bestTime: 'O(n log n)', averageTime: 'O(n log n)', worstTime: 'O(n log n)', worstSpace: 'O(1)', stable: false, inPlace: true, notes: 'Guaranteed O(n log n) in-place' },
    countingSort: { name: 'Counting Sort', bestTime: 'O(n+k)', averageTime: 'O(n+k)', worstTime: 'O(n+k)', worstSpace: 'O(k)', stable: true, inPlace: false, notes: 'Linear when k = O(n)' },
    radixSort: { name: 'Radix Sort', bestTime: 'O(d(n+k))', averageTime: 'O(d(n+k))', worstTime: 'O(d(n+k))', worstSpace: 'O(n+k)', stable: true, inPlace: false, notes: 'Digit-by-digit stable sort' },
    binarySearch: { name: 'Binary Search', bestTime: 'O(1)', averageTime: 'O(log n)', worstTime: 'O(log n)', worstSpace: 'O(1)', stable: false, inPlace: true, notes: 'Requires sorted input' },
    linearSearch: { name: 'Linear Search', bestTime: 'O(1)', averageTime: 'O(n)', worstTime: 'O(n)', worstSpace: 'O(1)', stable: false, inPlace: true, notes: 'Unsorted input' },
    dfs: { name: 'Depth-First Search', bestTime: 'O(V+E)', averageTime: 'O(V+E)', worstTime: 'O(V+E)', worstSpace: 'O(V)', stable: false, inPlace: false, notes: 'Graph traversal' },
    bfs: { name: 'Breadth-First Search', bestTime: 'O(V+E)', averageTime: 'O(V+E)', worstTime: 'O(V+E)', worstSpace: 'O(V)', stable: false, inPlace: false, notes: 'Graph traversal' },
    dijkstra: { name: "Dijkstra's Algorithm", bestTime: 'O((V+E) log V)', averageTime: 'O((V+E) log V)', worstTime: 'O((V+E) log V)', worstSpace: 'O(V)', stable: false, inPlace: false, notes: 'Single-source shortest path with non-negative weights' },
    bellmanFord: { name: "Bellman-Ford Algorithm", bestTime: 'O(VE)', averageTime: 'O(VE)', worstTime: 'O(VE)', worstSpace: 'O(V)', stable: false, inPlace: false, notes: 'Handles negative weights' },
    floydWarshall: { name: 'Floyd-Warshall Algorithm', bestTime: 'O(V^3)', averageTime: 'O(V^3)', worstTime: 'O(V^3)', worstSpace: 'O(V^2)', stable: false, inPlace: false, notes: 'All-pairs shortest paths' },
    primMST: { name: "Prim's MST", bestTime: 'O(E log V)', averageTime: 'O(E log V)', worstTime: 'O(E log V)', worstSpace: 'O(V)', stable: false, inPlace: false, notes: 'Minimum spanning tree' },
    kruskalMST: { name: "Kruskal's MST", bestTime: 'O(E log E)', averageTime: 'O(E log E)', worstTime: 'O(E log E)', worstSpace: 'O(V)', stable: false, inPlace: false, notes: 'Minimum spanning tree via union-find' },
    fft: { name: 'Fast Fourier Transform', bestTime: 'O(n log n)', averageTime: 'O(n log n)', worstTime: 'O(n log n)', worstSpace: 'O(n)', stable: false, inPlace: false, notes: 'Polynomial multiplication' },
    matrixMultiplyNaive: { name: 'Naive Matrix Multiply', bestTime: 'O(n^3)', averageTime: 'O(n^3)', worstTime: 'O(n^3)', worstSpace: 'O(n^2)', stable: false, inPlace: false, notes: 'Triple nested loop' },
    strassenMultiply: { name: 'Strassen Matrix Multiply', bestTime: 'O(n^2.807)', averageTime: 'O(n^2.807)', worstTime: 'O(n^2.807)', worstSpace: 'O(n^2)', stable: false, inPlace: false, notes: 'Divide-and-conquer matrix multiplication' },
    karatsubaMultiply: { name: 'Karatsuba Multiply', bestTime: 'O(n^1.585)', averageTime: 'O(n^1.585)', worstTime: 'O(n^1.585)', worstSpace: 'O(n)', stable: false, inPlace: false, notes: 'Fast integer multiplication' },
  };

  /** Get the profile of a standard algorithm. */
  getProfile(name: string): AlgorithmProfile | undefined {
    return ComplexityAnalysis._profiles[name];
  }

  /** List all registered algorithm profiles. */
  listProfiles(): string[] {
    return Object.keys(ComplexityAnalysis._profiles);
  }

  /** Register a custom algorithm profile. */
  registerProfile(name: string, profile: AlgorithmProfile): void {
    ComplexityAnalysis._profiles[name] = profile;
  }

  /** Registry of NP-completeness classifications. */
  private static _problems: ProblemComplexity[] = [
    { name: 'SAT', category: 'NP-Complete', notes: 'Satisfiability — first proven NP-complete problem (Cook-Levin)' },
    { name: '3-SAT', category: 'NP-Complete', reductionFrom: 'SAT', notes: '3-CNF satisfiability' },
    { name: 'Clique', category: 'NP-Complete', reductionFrom: '3-SAT', notes: 'Find k-clique in graph' },
    { name: 'Vertex Cover', category: 'NP-Complete', reductionFrom: '3-SAT', notes: 'Minimum vertex cover' },
    { name: 'Hamiltonian Cycle', category: 'NP-Complete', reductionFrom: '3-SAT', notes: 'Cycle visiting every vertex once' },
    { name: 'Traveling Salesman (decision)', category: 'NP-Complete', reductionFrom: 'Hamiltonian Cycle', notes: 'TSP with threshold k' },
    { name: 'Subset Sum', category: 'NP-Complete', reductionFrom: '3-SAT', notes: 'Subset summing to target' },
    { name: 'Knapsack (decision)', category: 'NP-Complete', reductionFrom: 'Subset Sum', notes: '0/1 knapsack decision variant' },
    { name: 'Graph Coloring', category: 'NP-Complete', reductionFrom: '3-SAT', notes: 'Color graph with k colors' },
    { name: 'Independent Set', category: 'NP-Complete', reductionFrom: 'Clique', notes: 'Max independent set' },
    { name: 'Integer Programming', category: 'NP-Hard', reductionFrom: 'SAT', notes: 'Linear programming with integer variables' },
    { name: 'Halting Problem', category: 'EXPTIME', notes: 'Undecidable in general' },
    { name: 'Graph Isomorphism', category: 'NP', notes: 'Not known to be P or NP-complete' },
    { name: 'Factoring', category: 'NP', notes: 'Not known to be NP-complete; basis for RSA' },
    { name: 'Shortest Path', category: 'P', notes: 'Solvable by Dijkstra, BFS' },
    { name: 'Minimum Spanning Tree', category: 'P', notes: 'Solvable by Kruskal, Prim' },
    { name: 'Maximum Flow', category: 'P', notes: 'Solvable by Ford-Fulkerson, Edmonds-Karp' },
    { name: 'Linear Programming', category: 'P', notes: 'Solvable by simplex, interior point' },
    { name: 'Primality Testing', category: 'P', notes: 'AKS algorithm — deterministic polynomial' },
    { name: '2-SAT', category: 'P', notes: 'Solvable via SCC' },
    { name: 'Eulerian Cycle', category: 'P', notes: 'Solvable by Hierholzer algorithm' },
  ];

  /** Look up a problem's complexity classification. */
  lookupProblem(name: string): ProblemComplexity | undefined {
    return ComplexityAnalysis._problems.find(p => p.name.toLowerCase() === name.toLowerCase());
  }

  /** List all problems in a category. */
  listByCategory(category: ProblemComplexity['category']): ProblemComplexity[] {
    return ComplexityAnalysis._problems.filter(p => p.category === category);
  }

  /** Generate input sizes following a geometric progression. */
  static geometricSizes(start: number, end: number, ratio: number = 2): number[] {
    const sizes: number[] = [];
    let s = start;
    while (s <= end) {
      sizes.push(s);
      s = Math.floor(s * ratio);
    }
    return sizes;
  }

  /** Compute the speedup ratio between two algorithms. */
  speedup(measurementsA: ComplexityMeasurement[], measurementsB: ComplexityMeasurement[]): Array<{ n: number; speedup: number }> {
    const mapA = new Map(measurementsA.map(m => [m.n, m]));
    return measurementsB
      .filter(m => mapA.has(m.n))
      .map(m => ({ n: m.n, speedup: (mapA.get(m.n)!.durationMs || 1) / (m.durationMs || 1) }));
  }

  /** Compute the efficiency of an algorithm relative to its theoretical lower bound. */
  efficiency(actual: ComplexityMeasurement[], theoretical: ComplexityClass): number[] {
    return actual.map(m => {
      const theo = ComplexityAnalysis.growthRate(theoretical, m.n);
      return theo / Math.max(1, m.operations);
    });
  }

  /** Detect potential performance regressions by comparing recent to baseline measurements. */
  detectRegression(baseline: BenchmarkEntry[], recent: BenchmarkEntry[], threshold: number = 1.5): Array<{ algorithm: string; inputSize: number; regression: number }> {
    const map = new Map(baseline.map(b => [`${b.algorithm}:${b.inputSize}`, b]));
    const regressions: Array<{ algorithm: string; inputSize: number; regression: number }> = [];
    for (const r of recent) {
      const key = `${r.algorithm}:${r.inputSize}`;
      const b = map.get(key);
      if (!b || b.durationMs === 0) continue;
      const ratio = r.durationMs / b.durationMs;
      if (ratio > threshold) regressions.push({ algorithm: r.algorithm, inputSize: r.inputSize, regression: ratio });
    }
    return regressions;
  }

  /** Compare two algorithms on the same input sizes. */
  compareAlgorithms(measurementsA: ComplexityMeasurement[], measurementsB: ComplexityMeasurement[], nameA: string = 'A', nameB: string = 'B'): Array<{ n: number; opsA: number; opsB: number; timeA: number; timeB: number; faster: string }> {
    const mapB = new Map(measurementsB.map(m => [m.n, m]));
    return measurementsA.map(mA => {
      const mB = mapB.get(mA.n);
      if (!mB) return { n: mA.n, opsA: mA.operations, opsB: -1, timeA: mA.durationMs, timeB: -1, faster: 'B-missing' };
      return {
        n: mA.n,
        opsA: mA.operations,
        opsB: mB.operations,
        timeA: mA.durationMs,
        timeB: mB.durationMs,
        faster: mA.durationMs < mB.durationMs ? nameA : nameB,
      };
    });
  }

  /** Estimate maximum problem size solvable in a given time budget. */
  estimateMaxSize(complexity: ComplexityClass, timeBudgetMs: number, baseline: ComplexityMeasurement): number {
    // Solve baseline.operations * growthRate(c, n) / growthRate(c, baseline.n) = timeBudgetMs * ops_per_ms
    const opsPerMs = baseline.operations / Math.max(1, baseline.durationMs);
    const targetOps = timeBudgetMs * opsPerMs;
    // Iteratively find n
    let lo = 1;
    let hi = 1e18;
    while (lo < hi - 1) {
      const mid = Math.floor((lo + hi) / 2);
      if (ComplexityAnalysis.growthRate(complexity, mid) < targetOps) lo = mid;
      else hi = mid;
    }
    return lo;
  }

  /** Compute the average memory usage per element. */
  memoryPerElement(measurements: Array<{ n: number; memoryBytes: number }>): number {
    if (measurements.length === 0) return 0;
    const sum = measurements.reduce((s, m) => s + m.memoryBytes / m.n, 0);
    return sum / measurements.length;
  }

  /** Compute Little's law: L = λ * W. */
  littlesLaw(arrivalRate: number, averageWaitTime: number): number {
    return arrivalRate * averageWaitTime;
  }

  /** Compute Amdahl's law speedup given a parallel fraction. */
  amdahlSpeedup(serialFraction: number, processorCount: number): number {
    return 1 / (serialFraction + (1 - serialFraction) / processorCount);
  }

  /** Compute Gustafson's law speedup. */
  gustafsonSpeedup(serialFraction: number, processorCount: number): number {
    return processorCount - serialFraction * (processorCount - 1);
  }

  /** Compute parallel efficiency: speedup / processor count. */
  parallelEfficiency(speedup: number, processorCount: number): number {
    return speedup / processorCount;
  }

  /** Compute the linearithmic constant (c in n log n = c * ops). */
  linearithmicConstant(measurements: ComplexityMeasurement[]): number {
    const valid = measurements.filter(m => m.n > 1 && m.operations > 0);
    if (valid.length === 0) return 0;
    const ratios = valid.map(m => m.operations / (m.n * Math.log2(m.n)));
    return ratios.reduce((s, r) => s + r, 0) / ratios.length;
  }

  /** Detect whether measurements follow a power law. */
  detectPowerLaw(measurements: ComplexityMeasurement[]): { isPowerLaw: boolean; exponent: number; rSquared: number } {
    const points = measurements.map(m => ({ x: Math.log(Math.max(1, m.n)), y: Math.log(Math.max(1, m.operations)) }));
    if (points.length < 2) return { isPowerLaw: false, exponent: 0, rSquared: 0 };
    const n = points.length;
    const sumX = points.reduce((s, p) => s + p.x, 0);
    const sumY = points.reduce((s, p) => s + p.y, 0);
    const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
    const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
    const denom = n * sumX2 - sumX * sumX;
    if (Math.abs(denom) < 1e-12) return { isPowerLaw: false, exponent: 0, rSquared: 0 };
    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;
    const meanY = sumY / n;
    let ssTot = 0;
    let ssRes = 0;
    for (const p of points) {
      const pred = slope * p.x + intercept;
      ssTot += Math.pow(p.y - meanY, 2);
      ssRes += Math.pow(p.y - pred, 2);
    }
    const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
    return { isPowerLaw: r2 > 0.95, exponent: slope, rSquared: r2 };
  }

  /** Convert an operation count to an estimated time given a base throughput. */
  estimateTime(operations: number, opsPerSecond: number): number {
    return operations / Math.max(1, opsPerSecond);
  }

  /** Compare two complexity classes by growth rate. */
  compareComplexity(a: ComplexityClass, b: ComplexityClass, n: number = 1000): number {
    return ComplexityAnalysis.growthRate(a, n) - ComplexityAnalysis.growthRate(b, n);
  }

  /** Get the standard ordering of complexity classes (lower index = faster growth). */
  static complexityOrder(): ComplexityClass[] {
    return ['O(1)', 'O(log n)', 'O(log^2 n)', 'O(sqrt n)', 'O(n)', 'O(n log n)', 'O(n log^2 n)', 'O(n^2)', 'O(n^2 log n)', 'O(n^3)', 'O(2^n)', 'O(n!)'];
  }

  /** Pretty-print a measurement table. */
  formatMeasurements(measurements: ComplexityMeasurement[]): string {
    const lines: string[] = ['n\toperations\tduration(ms)'];
    for (const m of measurements) lines.push(`${m.n}\t${m.operations}\t${m.durationMs}`);
    return lines.join('\n');
  }

  /** Pretty-print a benchmark result. */
  formatAnalysis(result: ComplexityAnalysisResult): string {
    return [
      `Best fit: ${result.bestFit}`,
      `Coefficient: ${result.coefficient.toFixed(4)}`,
      `R²: ${result.rSquared.toFixed(4)}`,
      `Measurements: ${result.measurements.length}`,
    ].join('\n');
  }

  /** Convert internal state to DataPacket. */
  toPacket(): DataPacket<{ history: ComplexityHistoryEntry[]; benchmarks: BenchmarkEntry[]; counter: number }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['cs_algorithms', 'ComplexityAnalysis'],
      priority: 1,
      phase: 'complexity_analysis',
    };
    return {
      id: `complexity-${Date.now().toString(36)}-${this._counter.toString(36)}`,
      payload: { history: this._history, benchmarks: this._benchmarks, counter: this._counter },
      metadata,
    };
  }

  /** Reset all internal state. */
  reset(): void {
    this._history = [];
    this._benchmarks = [];
    this._counter = 0;
    this.resetCounters();
  }

  get historyCount(): number { return this._history.length; }
  get benchmarkCount(): number { return this._benchmarks.length; }
  get counter(): number { return this._counter; }
  get lastEntry(): ComplexityHistoryEntry | null { return this._history[this._history.length - 1] ?? null; }
  get history(): ComplexityHistoryEntry[] { return [...this._history]; }
  get benchmarks(): BenchmarkEntry[] { return [...this._benchmarks]; }
}
