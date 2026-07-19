import { DataPacket, PacketMeta } from '../shared/types';

export interface Dataset {
  name: string;
  rows: Record<string, unknown>[];
  columns: string[];
  dtypes: Record<string, string>;
}

export interface SummaryStatistics {
  column: string;
  count: number;
  mean: number;
  std: number;
  min: number;
  q25: number;
  median: number;
  q75: number;
  max: number;
}

export interface CorrelationMatrix {
  columns: string[];
  matrix: number[][];
  method: string;
}

export class DataExploration {
  private _datasets: Map<string, Dataset> = new Map();
  private _summaries: SummaryStatistics[] = [];
  private _correlations: CorrelationMatrix[] = [];
  private _counter = 0;

  loadData(data: Record<string, unknown>[], name: string = 'dataset'): Dataset {
    const columns = data.length > 0 ? Object.keys(data[0]) : [];
    const dtypes: Record<string, string> = {};
    for (const col of columns) {
      const values = data.map(row => row[col]).filter(v => v !== null && v !== undefined);
      if (values.length === 0) {
        dtypes[col] = 'unknown';
      } else if (values.every(v => typeof v === 'number')) {
        dtypes[col] = 'number';
      } else if (values.every(v => typeof v === 'string')) {
        dtypes[col] = 'string';
      } else if (values.every(v => typeof v === 'boolean')) {
        dtypes[col] = 'boolean';
      } else {
        dtypes[col] = 'mixed';
      }
    }
    const dataset: Dataset = { name, rows: data, columns, dtypes };
    this._datasets.set(name, dataset);
    return dataset;
  }

  describe(data: Record<string, unknown>[]): SummaryStatistics[] {
    const columns = data.length > 0 ? Object.keys(data[0]).filter(c => {
      const vals = data.map(r => r[c]).filter(v => typeof v === 'number');
      return vals.length > 0;
    }) : [];
    const summaries: SummaryStatistics[] = [];
    for (const col of columns) {
      const values = data.map(r => r[col]).filter(v => typeof v === 'number') as number[];
      if (values.length === 0) continue;
      const sorted = [...values].sort((a, b) => a - b);
      const count = values.length;
      const mean = values.reduce((s, v) => s + v, 0) / count;
      const std = Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / count);
      const min = sorted[0];
      const max = sorted[count - 1];
      const q25 = sorted[Math.floor(count * 0.25)];
      const median = sorted[Math.floor(count * 0.5)];
      const q75 = sorted[Math.floor(count * 0.75)];
      summaries.push({ column: col, count, mean, std, min, q25, median, q75, max });
    }
    this._summaries = summaries;
    return summaries;
  }

  countNulls(data: Record<string, unknown>[]): Record<string, number> {
    const columns = data.length > 0 ? Object.keys(data[0]) : [];
    const nullCounts: Record<string, number> = {};
    for (const col of columns) {
      nullCounts[col] = data.filter(row => row[col] === null || row[col] === undefined).length;
    }
    return nullCounts;
  }

  uniqueValues(data: Record<string, unknown>[], column: string): unknown[] {
    const values = data.map(row => row[column]).filter(v => v !== null && v !== undefined);
    return [...new Set(values)];
  }

  valueCounts(data: Record<string, unknown>[], column: string): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const row of data) {
      const key = String(row[column]);
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }

  correlation(data: Record<string, unknown>[], method: string = 'pearson'): CorrelationMatrix {
    const numCols = data.length > 0 ? Object.keys(data[0]).filter(c => {
      const vals = data.map(r => r[c]).filter(v => typeof v === 'number');
      return vals.length > 0;
    }) : [];
    const n = numCols.length;
    const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    const values: number[][] = numCols.map(col => data.map(r => r[col]).filter(v => typeof v === 'number') as number[]);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 1;
        } else {
          matrix[i][j] = this._pearsonCorr(values[i], values[j]);
        }
      }
    }
    const result: CorrelationMatrix = { columns: numCols, matrix, method };
    this._correlations.push(result);
    return result;
  }

  covariance(data: Record<string, unknown>[]): CorrelationMatrix {
    const numCols = data.length > 0 ? Object.keys(data[0]).filter(c => {
      const vals = data.map(r => r[c]).filter(v => typeof v === 'number');
      return vals.length > 0;
    }) : [];
    const n = numCols.length;
    const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    const values: number[][] = numCols.map(col => data.map(r => r[col]).filter(v => typeof v === 'number') as number[]);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        matrix[i][j] = this._covariance(values[i], values[j]);
      }
    }
    return { columns: numCols, matrix, method: 'covariance' };
  }

  crossTabulation(data: Record<string, unknown>[], col1: string, col2: string): Record<string, Record<string, number>> {
    const table: Record<string, Record<string, number>> = {};
    for (const row of data) {
      const k1 = String(row[col1]);
      const k2 = String(row[col2]);
      if (!table[k1]) table[k1] = {};
      table[k1][k2] = (table[k1][k2] || 0) + 1;
    }
    return table;
  }

  groupBy(data: Record<string, unknown>[], groupCol: string, aggFunc: string): Record<string, unknown> {
    const groups: Record<string, Record<string, unknown>[]> = {};
    for (const row of data) {
      const key = String(row[groupCol]);
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    }
    const result: Record<string, unknown> = {};
    const numCols = data.length > 0 ? Object.keys(data[0]).filter(c => c !== groupCol && data.some(r => typeof r[c] === 'number')) : [];
    for (const [key, rows] of Object.entries(groups)) {
      const agg: Record<string, number> = {};
      for (const col of numCols) {
        const vals = rows.map(r => r[col]).filter(v => typeof v === 'number') as number[];
        if (vals.length === 0) continue;
        switch (aggFunc) {
          case 'mean': agg[col] = vals.reduce((s, v) => s + v, 0) / vals.length; break;
          case 'sum': agg[col] = vals.reduce((s, v) => s + v, 0); break;
          case 'min': agg[col] = Math.min(...vals); break;
          case 'max': agg[col] = Math.max(...vals); break;
          case 'count': agg[col] = vals.length; break;
          default: agg[col] = vals.reduce((s, v) => s + v, 0) / vals.length;
        }
      }
      result[key] = agg;
    }
    return result;
  }

  pivotTable(data: Record<string, unknown>[], index: string, columns: string, values: string): Record<string, Record<string, number>> {
    const pivot: Record<string, Record<string, number>> = {};
    for (const row of data) {
      const idx = String(row[index]);
      const col = String(row[columns]);
      const val = Number(row[values]) || 0;
      if (!pivot[idx]) pivot[idx] = {};
      pivot[idx][col] = (pivot[idx][col] || 0) + val;
    }
    return pivot;
  }

  outliers(data: Record<string, unknown>[], method: string = 'iqr'): Record<string, number[]> {
    const result: Record<string, number[]> = {};
    const numCols = data.length > 0 ? Object.keys(data[0]).filter(c => {
      const vals = data.map(r => r[c]).filter(v => typeof v === 'number');
      return vals.length > 0;
    }) : [];
    for (const col of numCols) {
      const values = data.map(r => r[col]).filter(v => typeof v === 'number') as number[];
      const sorted = [...values].sort((a, b) => a - b);
      const n = sorted.length;
      const q1 = sorted[Math.floor(n * 0.25)];
      const q3 = sorted[Math.floor(n * 0.75)];
      const iqr = q3 - q1;
      const lower = q1 - 1.5 * iqr;
      const upper = q3 + 1.5 * iqr;
      result[col] = values.filter(v => v < lower || v > upper);
    }
    return result;
  }

  distribution(data: Record<string, unknown>[], column: string, bins: number = 10): number[] {
    const values = data.map(r => r[column]).filter(v => typeof v === 'number') as number[];
    if (values.length === 0) return [];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binWidth = (max - min) / bins || 1;
    const hist = new Array(bins).fill(0);
    for (const v of values) {
      let idx = Math.floor((v - min) / binWidth);
      if (idx >= bins) idx = bins - 1;
      hist[idx]++;
    }
    return hist;
  }

  skewness(data: Record<string, unknown>[], column: string): number {
    const values = data.map(r => r[column]).filter(v => typeof v === 'number') as number[];
    const n = values.length;
    if (n < 3) return 0;
    const mean = values.reduce((s, v) => s + v, 0) / n;
    const std = Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / n);
    if (std === 0) return 0;
    const skew = values.reduce((s, v) => s + Math.pow((v - mean) / std, 3), 0) * n / ((n - 1) * (n - 2));
    return skew;
  }

  kurtosis(data: Record<string, unknown>[], column: string): number {
    const values = data.map(r => r[column]).filter(v => typeof v === 'number') as number[];
    const n = values.length;
    if (n < 4) return 0;
    const mean = values.reduce((s, v) => s + v, 0) / n;
    const std = Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / n);
    if (std === 0) return 0;
    const kurt = values.reduce((s, v) => s + Math.pow((v - mean) / std, 4), 0) * n * (n + 1) / ((n - 1) * (n - 2) * (n - 3))
      - 3 * (n - 1) * (n - 1) / ((n - 2) * (n - 3));
    return kurt;
  }

  private _pearsonCorr(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n === 0) return 0;
    const meanX = x.reduce((s, v) => s + v, 0) / n;
    const meanY = y.reduce((s, v) => s + v, 0) / n;
    let num = 0, denX = 0, denY = 0;
    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      num += dx * dy;
      denX += dx * dx;
      denY += dy * dy;
    }
    const den = Math.sqrt(denX * denY);
    return den === 0 ? 0 : num / den;
  }

  private _covariance(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;
    const meanX = x.reduce((s, v) => s + v, 0) / n;
    const meanY = y.reduce((s, v) => s + v, 0) / n;
    let sum = 0;
    for (let i = 0; i < n; i++) sum += (x[i] - meanX) * (y[i] - meanY);
    return sum / (n - 1);
  }

  toPacket(): DataPacket<{
    datasets: Map<string, Dataset>;
    summaries: SummaryStatistics[];
    correlations: CorrelationMatrix[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['data_science', 'DataExploration'],
      priority: 1,
      phase: 'data_exploration',
    };
    return {
      id: `data-exploration-${Date.now().toString(36)}`,
      payload: {
        datasets: this._datasets,
        summaries: this._summaries,
        correlations: this._correlations,
      },
      metadata,
    };
  }

  reset(): void {
    this._datasets = new Map();
    this._summaries = [];
    this._correlations = [];
    this._counter = 0;
  }

  get datasetCount(): number { return this._datasets.size; }
  get summaryCount(): number { return this._summaries.length; }
  get correlationCount(): number { return this._correlations.length; }
}
