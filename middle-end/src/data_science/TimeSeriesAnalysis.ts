import { DataPacket, PacketMeta } from '../shared/types';

export interface TimeSeries {
  data: number[];
  timestamps: number[];
  frequency: string;
}

export interface TSDecomposition {
  trend: number[];
  seasonal: number[];
  residual: number[];
}

export class TimeSeriesAnalysis {
  private _series: Map<string, TimeSeries> = new Map();
  private _decompositions: TSDecomposition[] = [];
  private _counter = 0;

  stationarityTest(data: number[], method: string = 'adf'): { statistic: number; pValue: number; stationary: boolean } {
    const n = data.length;
    if (n < 4) return { statistic: 0, pValue: 1, stationary: false };
    const diffs = data.slice(1).map((v, i) => v - data[i]);
    const lagged = data.slice(0, -1);
    const y = diffs;
    const X = lagged.map(v => [1, v]);
    const result = this._linearRegression(X, y);
    const coefs = result.coefficients;
    const tStat = coefs[1] / (result.stdError || 0.01);
    const pValue = Math.min(1, Math.abs(tStat) < 2 ? 0.5 : 0.01);
    return { statistic: tStat, pValue, stationary: pValue < 0.05 };
  }

  arimaModel(data: number[], order: [number, number, number]): { forecast: number[]; parameters: number[] } {
    const [p, d, q] = order;
    let series = [...data];
    for (let i = 0; i < d; i++) {
      series = series.slice(1).map((v, j) => v - series[j]);
    }
    const n = series.length;
    const arCoefs = new Array(p).fill(0.1);
    const maCoefs = new Array(q).fill(0.05);
    const residuals = new Array(n).fill(0);
    for (let i = p; i < n; i++) {
      let arPart = 0;
      for (let j = 0; j < p; j++) arPart += arCoefs[j] * series[i - 1 - j];
      let maPart = 0;
      for (let j = 0; j < q && i - 1 - j >= 0; j++) maPart += maCoefs[j] * residuals[i - 1 - j];
      residuals[i] = series[i] - arPart - maPart;
    }
    const forecast: number[] = [];
    let lastVals = [...series.slice(-p)];
    let lastResiduals = [...residuals.slice(-q)];
    for (let h = 0; h < 10; h++) {
      let arPart = 0;
      for (let j = 0; j < p && j < lastVals.length; j++) arPart += arCoefs[j] * lastVals[lastVals.length - 1 - j];
      let maPart = 0;
      for (let j = 0; j < q && j < lastResiduals.length; j++) maPart += maCoefs[j] * lastResiduals[lastResiduals.length - 1 - j];
      const next = arPart + maPart;
      forecast.push(next);
      lastVals.push(next);
      if (lastVals.length > p) lastVals.shift();
      lastResiduals.push(0);
      if (lastResiduals.length > q) lastResiduals.shift();
    }
    return { forecast, parameters: [...arCoefs, ...maCoefs] };
  }

  sarimaModel(data: number[], order: [number, number, number], seasonal: [number, number, number, number]): { forecast: number[] } {
    const result = this.arimaModel(data, order);
    return { forecast: result.forecast };
  }

  exponentialSmoothing(data: number[], type: string = 'simple'): number[] {
    const alpha = 0.3;
    const smoothed: number[] = [];
    if (data.length === 0) return smoothed;
    smoothed[0] = data[0];
    for (let i = 1; i < data.length; i++) {
      smoothed[i] = alpha * data[i] + (1 - alpha) * smoothed[i - 1];
    }
    return smoothed;
  }

  holtWinters(data: number[], seasonal: number = 12, trend: string = 'additive'): { forecast: number[]; level: number[]; trend: number[]; season: number[] } {
    const n = data.length;
    const alpha = 0.3, beta = 0.1, gamma = 0.1;
    const level = new Array(n).fill(0);
    const trendArr = new Array(n).fill(0);
    const season = new Array(n).fill(0);
    if (n < seasonal) {
      return { forecast: [], level, trend: trendArr, season };
    }
    let trendInit = 0;
    for (let i = 0; i < seasonal; i++) trendInit += (data[i + seasonal] - data[i]) / seasonal;
    trendInit /= seasonal;
    const seasonalInit = new Array(seasonal).fill(0);
    for (let i = 0; i < seasonal; i++) seasonalInit[i] = data[i] / (data[0] + trendInit * i);
    level[0] = data[0] / seasonalInit[0];
    trendArr[0] = trendInit;
    for (let i = 0; i < seasonal; i++) season[i] = seasonalInit[i];
    for (let i = 1; i < n; i++) {
      const sIdx = i % seasonal;
      const prevSIdx = (i - seasonal + seasonal) % seasonal;
      level[i] = alpha * (data[i] / season[prevSIdx]) + (1 - alpha) * (level[i - 1] + trendArr[i - 1]);
      trendArr[i] = beta * (level[i] - level[i - 1]) + (1 - beta) * trendArr[i - 1];
      season[sIdx] = gamma * (data[i] / level[i]) + (1 - gamma) * season[prevSIdx];
    }
    const forecast: number[] = [];
    const lastLevel = level[n - 1];
    const lastTrend = trendArr[n - 1];
    for (let h = 1; h <= 12; h++) {
      const sIdx = (n - 1 + h) % seasonal;
      forecast.push((lastLevel + lastTrend * h) * season[sIdx]);
    }
    return { forecast, level, trend: trendArr, season };
  }

  prophetForecast(data: number[], periods: number = 365): number[] {
    const n = data.length;
    const trend = this._linearTrend(data);
    const seasonal = this._seasonalComponent(data, 7);
    const forecast: number[] = [];
    for (let h = 1; h <= periods; h++) {
      const t = n + h;
      const trendVal = trend.intercept + trend.slope * t;
      const seasonVal = seasonal[(h - 1) % seasonal.length];
      forecast.push(trendVal + seasonVal);
    }
    return forecast;
  }

  decompose(data: number[], method: string = 'additive', period: number = 12): TSDecomposition {
    const n = data.length;
    const trend = new Array(n).fill(0);
    const seasonal = new Array(n).fill(0);
    const residual = new Array(n).fill(0);
    const half = Math.floor(period / 2);
    for (let i = 0; i < n; i++) {
      let sum = 0, count = 0;
      for (let j = i - half; j <= i + half; j++) {
        if (j >= 0 && j < n) { sum += data[j]; count++; }
      }
      trend[i] = count > 0 ? sum / count : data[i];
    }
    const seasonalPattern = new Array(period).fill(0);
    const seasonalCount = new Array(period).fill(0);
    for (let i = 0; i < n; i++) {
      const idx = i % period;
      const diff = method === 'multiplicative' ? data[i] / trend[i] : data[i] - trend[i];
      if (isFinite(diff)) {
        seasonalPattern[idx] += diff;
        seasonalCount[idx]++;
      }
    }
    for (let i = 0; i < period; i++) {
      if (seasonalCount[i] > 0) seasonalPattern[i] /= seasonalCount[i];
    }
    for (let i = 0; i < n; i++) {
      seasonal[i] = seasonalPattern[i % period];
      if (method === 'multiplicative') {
        residual[i] = trend[i] !== 0 ? data[i] / (trend[i] * seasonal[i]) : 0;
      } else {
        residual[i] = data[i] - trend[i] - seasonal[i];
      }
    }
    const result: TSDecomposition = { trend, seasonal, residual };
    this._decompositions.push(result);
    return result;
  }

  trendDetection(data: number[], method: string = 'linear'): { slope: number; intercept: number; trend: boolean } {
    const result = this._linearTrend(data);
    return { ...result, trend: Math.abs(result.slope) > 0.01 };
  }

  seasonalityDetect(data: number[], period: number): { seasonal: boolean; strength: number } {
    const n = data.length;
    if (n < period * 2) return { seasonal: false, strength: 0 };
    const decomp = this.decompose(data, 'additive', period);
    const seasonalVar = this._variance(decomp.seasonal);
    const totalVar = this._variance(data);
    const strength = totalVar > 0 ? seasonalVar / totalVar : 0;
    return { seasonal: strength > 0.1, strength };
  }

  autocorrelation(data: number[], lags: number = 20): number[] {
    const n = data.length;
    const mean = data.reduce((s, v) => s + v, 0) / n;
    const variance = data.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / n;
    const acf: number[] = [];
    for (let lag = 0; lag <= lags; lag++) {
      let cov = 0;
      for (let i = lag; i < n; i++) {
        cov += (data[i] - mean) * (data[i - lag] - mean);
      }
      acf.push(variance > 0 ? cov / (n * variance) : 0);
    }
    return acf;
  }

  partialAutocorrelation(data: number[], lags: number = 20): number[] {
    const n = data.length;
    const pacf: number[] = [1];
    const acf = this.autocorrelation(data, lags);
    for (let k = 1; k <= lags; k++) {
      let num = 0, den = 0;
      for (let i = k; i < n; i++) {
        let pred = 0, predLag = 0;
        for (let j = 1; j < k; j++) {
          pred += acf[j] * data[i - j];
          predLag += acf[j] * data[i - j - 1];
        }
        num += (data[i] - pred) * (data[i - k] - predLag);
        den += Math.pow(data[i - k] - predLag, 2);
      }
      pacf.push(den > 0 ? num / den : 0);
    }
    return pacf;
  }

  forecast(data: number[], model: string = 'arima', periods: number = 10): number[] {
    switch (model) {
      case 'arima': return this.arimaModel(data, [1, 1, 1]).forecast;
      case 'exponential': return this.exponentialSmoothing(data).slice(-periods);
      case 'holtwinters': return this.holtWinters(data).forecast.slice(0, periods);
      default: return this.arimaModel(data, [1, 1, 1]).forecast;
    }
  }

  anomalyDetect(data: number[], method: string = 'sigma', threshold: number = 3): number[] {
    const anomalies: number[] = [];
    const mean = data.reduce((s, v) => s + v, 0) / data.length;
    const std = Math.sqrt(data.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / data.length);
    for (let i = 0; i < data.length; i++) {
      if (Math.abs(data[i] - mean) > threshold * std) {
        anomalies.push(i);
      }
    }
    return anomalies;
  }

  private _linearTrend(data: number[]): { slope: number; intercept: number } {
    const n = data.length;
    if (n < 2) return { slope: 0, intercept: data[0] || 0 };
    const xs = Array.from({ length: n }, (_, i) => i);
    const meanX = n / 2;
    const meanY = data.reduce((s, v) => s + v, 0) / n;
    let ssXY = 0, ssXX = 0;
    for (let i = 0; i < n; i++) {
      ssXY += (xs[i] - meanX) * (data[i] - meanY);
      ssXX += Math.pow(xs[i] - meanX, 2);
    }
    const slope = ssXX > 0 ? ssXY / ssXX : 0;
    const intercept = meanY - slope * meanX;
    return { slope, intercept };
  }

  private _seasonalComponent(data: number[], period: number): number[] {
    const n = data.length;
    const seasonal = new Array(period).fill(0);
    const count = new Array(period).fill(0);
    for (let i = 0; i < n; i++) {
      seasonal[i % period] += data[i];
      count[i % period]++;
    }
    for (let i = 0; i < period; i++) {
      if (count[i] > 0) seasonal[i] /= count[i];
    }
    const mean = seasonal.reduce((s, v) => s + v, 0) / period;
    return seasonal.map(v => v - mean);
  }

  private _variance(arr: number[]): number {
    const n = arr.length;
    if (n < 2) return 0;
    const mean = arr.reduce((s, v) => s + v, 0) / n;
    return arr.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / n;
  }

  private _linearRegression(X: number[][], y: number[]): { coefficients: number[]; stdError: number } {
    const n = X.length;
    const d = X[0]?.length ?? 0;
    const Xt = this._transpose(X);
    const XtX = this._matrixMultiply(Xt, X);
    const Xty = this._matVec(Xt, y);
    const coefs = this._solveLinear(XtX, Xty);
    const fitted = X.map(row => this._dot(row, coefs));
    const residuals = y.map((yi, i) => yi - fitted[i]);
    const mse = residuals.reduce((s, r) => s + r * r, 0) / Math.max(1, n - d);
    return { coefficients: coefs, stdError: Math.sqrt(mse) };
  }

  private _dot(a: number[], b: number[]): number { return a.reduce((s, x, i) => s + x * b[i], 0); }

  private _transpose(m: number[][]): number[][] {
    const r = m.length, c = m[0]?.length ?? 0;
    const t: number[][] = Array.from({ length: c }, () => new Array(r).fill(0));
    for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) t[j][i] = m[i][j];
    return t;
  }

  private _matrixMultiply(a: number[][], b: number[][]): number[][] {
    const n = a.length, k = b.length, m = b[0]?.length ?? 0;
    const out: number[][] = Array.from({ length: n }, () => new Array(m).fill(0));
    for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
      let s = 0;
      for (let p = 0; p < k; p++) s += a[i][p] * b[p][j];
      out[i][j] = s;
    }
    return out;
  }

  private _matVec(m: number[][], v: number[]): number[] {
    return m.map(row => this._dot(row, v));
  }

  private _solveLinear(A: number[][], b: number[]): number[] {
    const n = A.length;
    const M = A.map((row, i) => [...row, b[i]]);
    for (let i = 0; i < n; i++) {
      let pivot = i;
      for (let r = i + 1; r < n; r++) if (Math.abs(M[r][i]) > Math.abs(M[pivot][i])) pivot = r;
      [M[i], M[pivot]] = [M[pivot], M[i]];
      if (Math.abs(M[i][i]) < 1e-12) continue;
      for (let r = 0; r < n; r++) {
        if (r === i) continue;
        const f = M[r][i] / M[i][i];
        for (let c = i; c <= n; c++) M[r][c] -= f * M[i][c];
      }
    }
    return M.map((row, i) => Math.abs(M[i][i]) < 1e-12 ? 0 : row[n] / M[i][i]);
  }

  toPacket(): DataPacket<{
    series: Map<string, TimeSeries>;
    decompositions: TSDecomposition[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['data_science', 'TimeSeriesAnalysis'],
      priority: 1,
      phase: 'time_series_analysis',
    };
    return {
      id: `time-series-${Date.now().toString(36)}`,
      payload: {
        series: this._series,
        decompositions: this._decompositions,
      },
      metadata,
    };
  }

  reset(): void {
    this._series = new Map();
    this._decompositions = [];
    this._counter = 0;
  }

  get seriesCount(): number { return this._series.size; }
  get decompositionCount(): number { return this._decompositions.length; }
}
