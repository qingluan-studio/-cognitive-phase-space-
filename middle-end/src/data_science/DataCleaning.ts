import { DataPacket, PacketMeta } from '../shared/types';

export interface CleanResult {
  cleaned: Record<string, unknown>[];
  issues: string[];
  methods: string[];
  report: Record<string, number>;
}

export interface DataQuality {
  completeness: number;
  accuracy: number;
  consistency: number;
  timeliness: number;
  uniqueness: number;
}

export class DataCleaning {
  private _cleanResults: CleanResult[] = [];
  private _qualityReports: DataQuality[] = [];
  private _counter = 0;

  handleMissing(data: Record<string, unknown>[], method: string = 'mean'): Record<string, unknown>[] {
    const result = data.map(row => ({ ...row }));
    const columns = data.length > 0 ? Object.keys(data[0]) : [];
    for (const col of columns) {
      const vals = data.map(r => r[col]).filter(v => v !== null && v !== undefined);
      if (vals.length === 0) continue;
      const isNumeric = vals.every(v => typeof v === 'number');
      let fillValue: unknown;
      if (isNumeric) {
        const numVals = vals as number[];
        switch (method) {
          case 'mean': fillValue = numVals.reduce((s, v) => s + v, 0) / numVals.length; break;
          case 'median': fillValue = [...numVals].sort((a, b) => a - b)[Math.floor(numVals.length / 2)]; break;
          case 'mode': fillValue = this._mode(numVals); break;
          case 'zero': fillValue = 0; break;
          default: fillValue = numVals.reduce((s, v) => s + v, 0) / numVals.length;
        }
      } else {
        fillValue = this._mode(vals);
      }
      for (const row of result) {
        if (row[col] === null || row[col] === undefined) {
          row[col] = fillValue;
        }
      }
    }
    this._cleanResults.push({
      cleaned: result,
      issues: ['missing_values'],
      methods: [method],
      report: { handled: result.length, method_used: 1 },
    });
    return result;
  }

  fillMean(data: Record<string, unknown>[], column: string): Record<string, unknown>[] {
    const result = data.map(row => ({ ...row }));
    const vals = data.map(r => r[column]).filter(v => typeof v === 'number') as number[];
    if (vals.length === 0) return result;
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    for (const row of result) {
      if (row[column] === null || row[column] === undefined) {
        row[column] = mean;
      }
    }
    return result;
  }

  fillMedian(data: Record<string, unknown>[], column: string): Record<string, unknown>[] {
    const result = data.map(row => ({ ...row }));
    const vals = data.map(r => r[column]).filter(v => typeof v === 'number') as number[];
    if (vals.length === 0) return result;
    const sorted = [...vals].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    for (const row of result) {
      if (row[column] === null || row[column] === undefined) {
        row[column] = median;
      }
    }
    return result;
  }

  fillMode(data: Record<string, unknown>[], column: string): Record<string, unknown>[] {
    const result = data.map(row => ({ ...row }));
    const vals = data.map(r => r[column]).filter(v => v !== null && v !== undefined);
    if (vals.length === 0) return result;
    const mode = this._mode(vals);
    for (const row of result) {
      if (row[column] === null || row[column] === undefined) {
        row[column] = mode;
      }
    }
    return result;
  }

  interpolate(data: Record<string, unknown>[], method: string = 'linear'): Record<string, unknown>[] {
    const result = data.map(row => ({ ...row }));
    const columns = data.length > 0 ? Object.keys(data[0]).filter(c => {
      const vals = data.map(r => r[c]).filter(v => typeof v === 'number');
      return vals.length > 0;
    }) : [];
    for (const col of columns) {
      const values = result.map(r => r[col] as number | null);
      for (let i = 0; i < values.length; i++) {
        if (values[i] === null || values[i] === undefined) {
          let prevIdx = i - 1;
          let nextIdx = i + 1;
          while (prevIdx >= 0 && (values[prevIdx] === null || values[prevIdx] === undefined)) prevIdx--;
          while (nextIdx < values.length && (values[nextIdx] === null || values[nextIdx] === undefined)) nextIdx++;
          if (prevIdx >= 0 && nextIdx < values.length) {
            const prev = values[prevIdx] as number;
            const next = values[nextIdx] as number;
            const ratio = (i - prevIdx) / (nextIdx - prevIdx);
            (result[i] as Record<string, number>)[col] = prev + (next - prev) * ratio;
          } else if (prevIdx >= 0) {
            (result[i] as Record<string, number>)[col] = values[prevIdx] as number;
          } else if (nextIdx < values.length) {
            (result[i] as Record<string, number>)[col] = values[nextIdx] as number;
          }
        }
      }
    }
    return result;
  }

  dropMissing(data: Record<string, unknown>[], threshold: number = 0.5): Record<string, unknown>[] {
    return data.filter(row => {
      const cols = Object.keys(row);
      const missing = cols.filter(c => row[c] === null || row[c] === undefined).length;
      return missing / cols.length <= threshold;
    });
  }

  removeDuplicates(data: Record<string, unknown>[]): Record<string, unknown>[] {
    const seen = new Set<string>();
    const result: Record<string, unknown>[] = [];
    for (const row of data) {
      const key = JSON.stringify(row);
      if (!seen.has(key)) {
        seen.add(key);
        result.push(row);
      }
    }
    return result;
  }

  standardizeFormats(data: Record<string, unknown>[], column: string): Record<string, unknown>[] {
    const result = data.map(row => ({ ...row }));
    for (const row of result) {
      const val = row[column];
      if (typeof val === 'string') {
        row[column] = val.trim().toLowerCase();
      }
    }
    return result;
  }

  normalizeText(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '');
  }

  correctTypo(text: string, dictionary: string[]): string {
    let best = text;
    let bestDist = Infinity;
    for (const word of dictionary) {
      const dist = this._levenshtein(text, word);
      if (dist < bestDist) {
        bestDist = dist;
        best = word;
      }
    }
    return bestDist <= 2 ? best : text;
  }

  outlierRemoval(data: Record<string, unknown>[], method: string = 'iqr', threshold: number = 1.5): Record<string, unknown>[] {
    const numCols = data.length > 0 ? Object.keys(data[0]).filter(c => {
      const vals = data.map(r => r[c]).filter(v => typeof v === 'number');
      return vals.length > 0;
    }) : [];
    return data.filter(row => {
      for (const col of numCols) {
        const val = row[col];
        if (typeof val !== 'number') continue;
        const values = data.map(r => r[col]).filter(v => typeof v === 'number') as number[];
        const sorted = [...values].sort((a, b) => a - b);
        const n = sorted.length;
        const q1 = sorted[Math.floor(n * 0.25)];
        const q3 = sorted[Math.floor(n * 0.75)];
        const iqr = q3 - q1;
        const lower = q1 - threshold * iqr;
        const upper = q3 + threshold * iqr;
        if (val < lower || val > upper) return false;
      }
      return true;
    });
  }

  dataTypeConvert(data: Record<string, unknown>[], column: string, type: string): Record<string, unknown>[] {
    const result = data.map(row => ({ ...row }));
    for (const row of result) {
      const val = row[column];
      switch (type) {
        case 'number': row[column] = Number(val); break;
        case 'string': row[column] = String(val); break;
        case 'boolean': row[column] = Boolean(val); break;
        case 'int': row[column] = parseInt(String(val), 10); break;
        case 'float': row[column] = parseFloat(String(val)); break;
      }
    }
    return result;
  }

  featureScaling(data: Record<string, unknown>[], method: string = 'minmax'): Record<string, unknown>[] {
    const result = data.map(row => ({ ...row }));
    const numCols = data.length > 0 ? Object.keys(data[0]).filter(c => {
      const vals = data.map(r => r[c]).filter(v => typeof v === 'number');
      return vals.length > 0;
    }) : [];
    for (const col of numCols) {
      const values = data.map(r => r[col]).filter(v => typeof v === 'number') as number[];
      if (values.length === 0) continue;
      const min = Math.min(...values);
      const max = Math.max(...values);
      const mean = values.reduce((s, v) => s + v, 0) / values.length;
      const std = Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length);
      for (const row of result) {
        const val = row[col];
        if (typeof val !== 'number') continue;
        if (method === 'minmax') {
          (row as Record<string, number>)[col] = max === min ? 0 : (val - min) / (max - min);
        } else if (method === 'standard') {
          (row as Record<string, number>)[col] = std === 0 ? 0 : (val - mean) / std;
        }
      }
    }
    return result;
  }

  qualityReport(data: Record<string, unknown>[]): DataQuality {
    const columns = data.length > 0 ? Object.keys(data[0]) : [];
    const totalCells = data.length * columns.length;
    let completeCells = 0;
    for (const row of data) {
      for (const col of columns) {
        if (row[col] !== null && row[col] !== undefined) completeCells++;
      }
    }
    const completeness = totalCells > 0 ? completeCells / totalCells : 0;
    const uniqueRows = new Set(data.map(r => JSON.stringify(r))).size;
    const uniqueness = data.length > 0 ? uniqueRows / data.length : 1;
    const quality: DataQuality = {
      completeness,
      accuracy: completeness * 0.95,
      consistency: 0.9,
      timeliness: 0.95,
      uniqueness,
    };
    this._qualityReports.push(quality);
    return quality;
  }

  private _mode<T>(values: T[]): T | undefined {
    const counts = new Map<T, number>();
    let maxCount = 0;
    let mode: T | undefined;
    for (const v of values) {
      const c = (counts.get(v) || 0) + 1;
      counts.set(v, c);
      if (c > maxCount) {
        maxCount = c;
        mode = v;
      }
    }
    return mode;
  }

  private _levenshtein(a: string, b: string): number {
    const m = a.length, n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
      }
    }
    return dp[m][n];
  }

  toPacket(): DataPacket<{
    cleanResults: CleanResult[];
    qualityReports: DataQuality[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['data_science', 'DataCleaning'],
      priority: 1,
      phase: 'data_cleaning',
    };
    return {
      id: `data-cleaning-${Date.now().toString(36)}`,
      payload: {
        cleanResults: this._cleanResults,
        qualityReports: this._qualityReports,
      },
      metadata,
    };
  }

  reset(): void {
    this._cleanResults = [];
    this._qualityReports = [];
    this._counter = 0;
  }

  get cleanResultCount(): number { return this._cleanResults.length; }
  get qualityReportCount(): number { return this._qualityReports.length; }
}
