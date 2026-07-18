import { DataPacket, Signal } from '../shared/types';

export interface PowerLawFit {
  exponent: number;
  xMin: number;
  goodnessOfFit: number;
  ksStatistic: number;
  pValue: number;
  scaledRange: [number, number];
}

export interface DistributionData {
  values: number[];
  frequencies: number[];
  cumulative: number[];
}

export interface FractalDimension {
  dimension: number;
  boxSizes: number[];
  boxCounts: number[];
  scalingRange: [number, number];
}

export interface ScaleInvarianceTest {
  isScaleInvariant: boolean;
  hurstExponent: number;
  selfSimilarityIndex: number;
  scaleRange: [number, number];
}

export class PowerLawAnalyzer {
  private _data: number[];
  private _exponent: number;
  private _xMin: number;
  private _goodnessOfFit: number;
  private _ksStatistic: number;
  private _pValue: number;
  private _cache: Map<string, PowerLawFit>;
  private _bootstrapSamples: number;

  constructor(data: number[] = []) {
    this._data = [...data].sort((a, b) => a - b);
    this._exponent = 0;
    this._xMin = 0;
    this._goodnessOfFit = 0;
    this._ksStatistic = 0;
    this._pValue = 0;
    this._cache = new Map();
    this._bootstrapSamples = 1000;
  }

  get exponent(): number { return this._exponent; }
  get xMin(): number { return this._xMin; }
  get goodnessOfFit(): number { return this._goodnessOfFit; }
  get ksStatistic(): number { return this._ksStatistic; }
  get pValue(): number { return this._pValue; }
  get dataCount(): number { return this._data.length; }

  public setData(data: number[]): void {
    this._data = [...data].sort((a, b) => a - b);
    this._cache.clear();
  }

  public addValue(value: number): void {
    this._data.push(value);
    this._data.sort((a, b) => a - b);
    this._cache.clear();
  }

  public setBootstrapSamples(samples: number): void {
    this._bootstrapSamples = Math.max(10, samples);
  }

  public estimateExponent(xMin: number): number {
    const tail = this._data.filter(x => x >= xMin);
    if (tail.length < 10) return 0;

    const sum = tail.reduce((s, x) => s + Math.log(x / xMin), 0);
    const n = tail.length;
    return 1 + n / sum;
  }

  public findOptimalXMin(xMinCandidates?: number[]): { xMin: number; exponent: number; ks: number } {
    const candidates = xMinCandidates || this._getUniqueValues().slice(0, 100);
    let bestKS = Infinity;
    let bestXMin = candidates[0] || 1;
    let bestExp = 0;

    for (const xMin of candidates) {
      const tail = this._data.filter(x => x >= xMin);
      if (tail.length < 10) continue;

      const exp = this.estimateExponent(xMin);
      const ks = this._kolmogorovSmirnov(tail, exp, xMin);

      if (ks < bestKS) {
        bestKS = ks;
        bestXMin = xMin;
        bestExp = exp;
      }
    }

    return { xMin: bestXMin, exponent: bestExp, ks: bestKS };
  }

  private _kolmogorovSmirnov(data: number[], exponent: number, xMin: number): number {
    const sorted = [...data].sort((a, b) => a - b);
    const n = sorted.length;
    let maxDiff = 0;

    for (let i = 0; i < n; i++) {
      const empirical = (i + 1) / n;
      const theoretical = 1 - Math.pow(xMin / sorted[i], exponent - 1);
      const diff = Math.abs(empirical - theoretical);
      if (diff > maxDiff) maxDiff = diff;
    }

    return maxDiff;
  }

  public fitPowerLaw(): PowerLawFit {
    const cacheKey = `fit-${this._data.length}`;
    const cached = this._cache.get(cacheKey);
    if (cached) return cached;

    const optimal = this.findOptimalXMin();
    this._xMin = optimal.xMin;
    this._exponent = optimal.exponent;
    this._ksStatistic = optimal.ks;
    this._goodnessOfFit = 1 - optimal.ks;

    this._pValue = this._calculatePValue(optimal.xMin, optimal.exponent);

    const tail = this._data.filter(x => x >= optimal.xMin);
    const scaledRange: [number, number] = tail.length > 0
      ? [tail[0], tail[tail.length - 1]]
      : [0, 0];

    const result: PowerLawFit = {
      exponent: this._exponent,
      xMin: this._xMin,
      goodnessOfFit: this._goodnessOfFit,
      ksStatistic: this._ksStatistic,
      pValue: this._pValue,
      scaledRange
    };

    this._cache.set(cacheKey, result);
    return result;
  }

  private _calculatePValue(xMin: number, exponent: number): number {
    const tail = this._data.filter(x => x >= xMin);
    const n = tail.length;
    if (n < 20) return 0;

    const observedKS = this._kolmogorovSmirnov(tail, exponent, xMin);
    let greaterCount = 0;

    for (let b = 0; b < this._bootstrapSamples; b++) {
      const sample = this._generatePowerLawSample(exponent, xMin, n);
      const sampleExp = this._estimateFromSample(sample, xMin);
      const sampleKS = this._kolmogorovSmirnov(sample, sampleExp, xMin);
      if (sampleKS > observedKS) greaterCount++;
    }

    return greaterCount / this._bootstrapSamples;
  }

  private _estimateFromSample(sample: number[], xMin: number): number {
    const tail = sample.filter(x => x >= xMin);
    if (tail.length < 10) return 2;
    const sum = tail.reduce((s, x) => s + Math.log(x / xMin), 0);
    return 1 + tail.length / sum;
  }

  private _generatePowerLawSample(exponent: number, xMin: number, n: number): number[] {
    const sample: number[] = [];
    for (let i = 0; i < n; i++) {
      const u = Math.random();
      const x = xMin * Math.pow(1 - u, -1 / (exponent - 1));
      sample.push(x);
    }
    return sample;
  }

  public logBinning(bins: number = 20): DistributionData {
    if (this._data.length === 0) {
      return { values: [], frequencies: [], cumulative: [] };
    }

    const minVal = this._data[0];
    const maxVal = this._data[this._data.length - 1];
    const logMin = Math.log(minVal);
    const logMax = Math.log(maxVal);
    const logStep = (logMax - logMin) / bins;

    const frequencies: number[] = new Array(bins).fill(0);
    const values: number[] = [];

    for (let i = 0; i < bins; i++) {
      const binStart = Math.exp(logMin + i * logStep);
      const binEnd = Math.exp(logMin + (i + 1) * logStep);
      values.push(Math.sqrt(binStart * binEnd));

      for (const x of this._data) {
        if (x >= binStart && x < binEnd) {
          frequencies[i]++;
        }
      }
    }

    const cumulative: number[] = [];
    let running = this._data.length;
    for (let i = 0; i < bins; i++) {
      cumulative.push(running / this._data.length);
      running -= frequencies[i];
    }

    return { values, frequencies, cumulative };
  }

  public calculateFractalDimension(points: { x: number; y: number }[]): FractalDimension {
    if (points.length < 10) {
      return { dimension: 0, boxSizes: [], boxCounts: [], scalingRange: [0, 0] };
    }

    const boxSizes: number[] = [];
    const boxCounts: number[] = [];

    let minSize = 0.01;
    let maxSize = 1;

    for (let size = maxSize; size >= minSize; size /= 2) {
      const boxes = new Set<string>();
      for (const p of points) {
        const bx = Math.floor(p.x / size);
        const by = Math.floor(p.y / size);
        boxes.add(`${bx},${by}`);
      }
      if (boxes.size > 1) {
        boxSizes.push(size);
        boxCounts.push(boxes.size);
      }
    }

    let dimension = 0;
    if (boxSizes.length >= 3) {
      const logSizes = boxSizes.map(s => -Math.log(s));
      const logCounts = boxCounts.map(c => Math.log(c));

      const n = logSizes.length;
      let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
      for (let i = 0; i < n; i++) {
        sumX += logSizes[i];
        sumY += logCounts[i];
        sumXY += logSizes[i] * logCounts[i];
        sumX2 += logSizes[i] * logSizes[i];
      }
      dimension = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    }

    const scalingRange: [number, number] = boxSizes.length >= 2
      ? [boxSizes[boxSizes.length - 1], boxSizes[0]]
      : [0, 0];

    return { dimension, boxSizes, boxCounts, scalingRange };
  }

  public hurstExponent(series: number[]): number {
    const n = series.length;
    if (n < 20) return 0.5;

    const maxLag = Math.floor(n / 4);
    const rsValues: number[] = [];
    const lagValues: number[] = [];

    for (let lag = 10; lag <= maxLag; lag *= 2) {
      const numWindows = Math.floor(n / lag);
      let totalRS = 0;

      for (let w = 0; w < numWindows; w++) {
        const window = series.slice(w * lag, (w + 1) * lag);
        const mean = window.reduce((a, b) => a + b, 0) / lag;

        const cumulative: number[] = [];
        let sum = 0;
        for (const v of window) {
          sum += v - mean;
          cumulative.push(sum);
        }

        const range = Math.max(...cumulative) - Math.min(...cumulative);

        let variance = 0;
        for (const v of window) {
          variance += (v - mean) ** 2;
        }
        const std = Math.sqrt(variance / lag);

        if (std > 0) {
          totalRS += range / std;
        }
      }

      if (numWindows > 0) {
        rsValues.push(Math.log(totalRS / numWindows));
        lagValues.push(Math.log(lag));
      }
    }

    if (lagValues.length < 2) return 0.5;

    const k = lagValues.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < k; i++) {
      sumX += lagValues[i];
      sumY += rsValues[i];
      sumXY += lagValues[i] * rsValues[i];
      sumX2 += lagValues[i] * lagValues[i];
    }

    return (k * sumXY - sumX * sumY) / (k * sumX2 - sumX * sumX);
  }

  public testScaleInvariance(series: number[]): ScaleInvarianceTest {
    const hurst = this.hurstExponent(series);
    const selfSimilarity = Math.abs(hurst - 0.5) * 2;

    let isScaleInvariant = false;
    if (hurst > 0.4 && hurst < 0.9) {
      isScaleInvariant = true;
    }

    return {
      isScaleInvariant,
      hurstExponent: hurst,
      selfSimilarityIndex: selfSimilarity,
      scaleRange: [10, Math.floor(series.length / 4)]
    };
  }

  public paretoPrinciple(): { top20PercentFraction: number; is8020: boolean } {
    if (this._data.length < 10) return { top20PercentFraction: 0, is8020: false };

    const total = this._data.reduce((s, x) => s + x, 0);
    const topCount = Math.ceil(this._data.length * 0.2);
    const topSum = this._data.slice(-topCount).reduce((s, x) => s + x, 0);
    const fraction = total > 0 ? topSum / total : 0;

    return {
      top20PercentFraction: fraction,
      is8020: Math.abs(fraction - 0.8) < 0.15
    };
  }

  public zipfLaw(): { rankExponent: number; goodnessOfFit: number } {
    if (this._data.length < 10) return { rankExponent: 0, goodnessOfFit: 0 };

    const sortedDesc = [...this._data].sort((a, b) => b - a);
    const ranks = sortedDesc.map((_, i) => i + 1);

    const logRanks = ranks.map(r => Math.log(r));
    const logVals = sortedDesc.map(v => Math.log(Math.max(v, 1)));

    const n = logRanks.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += logRanks[i];
      sumY += logVals[i];
      sumXY += logRanks[i] * logVals[i];
      sumX2 += logRanks[i] * logRanks[i];
    }

    const exponent = -(n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    let ssRes = 0;
    const intercept = (sumY - (-exponent) * sumX) / n;
    for (let i = 0; i < n; i++) {
      const predicted = intercept + (-exponent) * logRanks[i];
      ssRes += (logVals[i] - predicted) ** 2;
    }

    const meanY = sumY / n;
    let ssTot = 0;
    for (let i = 0; i < n; i++) {
      ssTot += (logVals[i] - meanY) ** 2;
    }

    const goodness = ssTot > 0 ? 1 - ssRes / ssTot : 0;

    return { rankExponent: exponent, goodnessOfFit: Math.max(0, goodness) };
  }

  public powerLawToPacket(): DataPacket<Signal> {
    return {
      id: `power-law-${Date.now()}`,
      payload: {
        source: 'power-law-analyzer',
        magnitude: this._exponent,
        entropy: 1 - this._goodnessOfFit,
        timestamp: Date.now()
      },
      metadata: {
        createdAt: Date.now(),
        route: ['complexity', 'power-law'],
        priority: 0.6,
        phase: 'analysis'
      }
    };
  }

  private _getUniqueValues(): number[] {
    const unique = Array.from(new Set(this._data));
    return unique.sort((a, b) => a - b);
  }

  public reset(): void {
    this._data = [];
    this._exponent = 0;
    this._xMin = 0;
    this._goodnessOfFit = 0;
    this._ksStatistic = 0;
    this._pValue = 0;
    this._cache.clear();
  }

  public getData(): number[] {
    return [...this._data];
  }
}
