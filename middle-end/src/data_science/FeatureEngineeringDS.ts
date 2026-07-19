import { DataPacket, PacketMeta } from '../shared/types';

export interface Feature {
  name: string;
  type: string;
  importance: number;
  transformation: string;
}

export interface FeatureSet {
  features: Feature[];
  data: Record<string, unknown>[];
  scores: Record<string, number>;
}

export class FeatureEngineeringDS {
  private _features: Map<string, Feature> = new Map();
  private _featureSets: FeatureSet[] = [];
  private _counter = 0;

  createFeatures(data: Record<string, unknown>[], transformations: string[]): Record<string, unknown>[] {
    const result = data.map(row => ({ ...row }));
    const numCols = data.length > 0 ? Object.keys(data[0]).filter(c => {
      const vals = data.map(r => r[c]).filter(v => typeof v === 'number');
      return vals.length > 0;
    }) : [];
    for (const transform of transformations) {
      for (const col of numCols) {
        const values = data.map(r => r[col]).filter(v => typeof v === 'number') as number[];
        if (values.length === 0) continue;
        switch (transform) {
          case 'log':
            for (let i = 0; i < result.length; i++) {
              const val = Number(result[i][col]);
              (result[i] as Record<string, unknown>)[`${col}_log`] = val > 0 ? Math.log(val) : 0;
            }
            break;
          case 'sqrt':
            for (let i = 0; i < result.length; i++) {
              const val = Number(result[i][col]);
              (result[i] as Record<string, unknown>)[`${col}_sqrt`] = val >= 0 ? Math.sqrt(val) : 0;
            }
            break;
          case 'square':
            for (let i = 0; i < result.length; i++) {
              const val = Number(result[i][col]);
              (result[i] as Record<string, unknown>)[`${col}_sq`] = val * val;
            }
            break;
          case 'normalize':
            const min = Math.min(...values);
            const max = Math.max(...values);
            for (let i = 0; i < result.length; i++) {
              const val = Number(result[i][col]);
              (result[i] as Record<string, unknown>)[`${col}_norm`] = max === min ? 0 : (val - min) / (max - min);
            }
            break;
          case 'standardize':
            const mean = values.reduce((s, v) => s + v, 0) / values.length;
            const std = Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length);
            for (let i = 0; i < result.length; i++) {
              const val = Number(result[i][col]);
              (result[i] as Record<string, unknown>)[`${col}_std`] = std === 0 ? 0 : (val - mean) / std;
            }
            break;
        }
      }
    }
    return result;
  }

  encodeCategorical(data: Record<string, unknown>[], method: string = 'onehot', columns: string[]): Record<string, unknown>[] {
    if (method === 'onehot') return this.oneHotEncode(data, columns);
    if (method === 'label') return this.labelEncode(data, columns);
    return data;
  }

  oneHotEncode(data: Record<string, unknown>[], columns: string[]): Record<string, unknown>[] {
    const result = data.map(row => ({ ...row }));
    for (const col of columns) {
      const uniqueVals = [...new Set(data.map(r => String(r[col])))];
      for (const row of result) {
        const val = String(row[col]);
        for (const uv of uniqueVals) {
          (row as Record<string, number>)[`${col}_${uv}`] = val === uv ? 1 : 0;
        }
        delete row[col];
      }
    }
    return result;
  }

  labelEncode(data: Record<string, unknown>[], columns: string[]): Record<string, unknown>[] {
    const result = data.map(row => ({ ...row }));
    for (const col of columns) {
      const uniqueVals = [...new Set(data.map(r => String(r[col])))];
      const labelMap: Record<string, number> = {};
      uniqueVals.forEach((v, i) => { labelMap[v] = i; });
      for (const row of result) {
        const val = String(row[col]);
        row[col] = labelMap[val] ?? 0;
      }
    }
    return result;
  }

  targetEncode(data: Record<string, unknown>[], columns: string[], target: string): Record<string, unknown>[] {
    const result = data.map(row => ({ ...row }));
    for (const col of columns) {
      const groupMeans: Record<string, number> = {};
      const groups: Record<string, number[]> = {};
      for (const row of data) {
        const key = String(row[col]);
        const tval = Number(row[target]);
        if (!groups[key]) groups[key] = [];
        groups[key].push(tval);
      }
      for (const [key, vals] of Object.entries(groups)) {
        groupMeans[key] = vals.reduce((s, v) => s + v, 0) / vals.length;
      }
      for (const row of result) {
        const key = String(row[col]);
        row[col] = groupMeans[key] ?? 0;
      }
    }
    return result;
  }

  polynomialFeatures(data: Record<string, unknown>[], degree: number = 2): Record<string, unknown>[] {
    const result = data.map(row => ({ ...row }));
    const numCols = data.length > 0 ? Object.keys(data[0]).filter(c => {
      const vals = data.map(r => r[c]).filter(v => typeof v === 'number');
      return vals.length > 0;
    }) : [];
    for (let d = 2; d <= degree; d++) {
      for (const col of numCols) {
        for (let i = 0; i < result.length; i++) {
          const val = Number(result[i][col]);
          (result[i] as Record<string, number>)[`${col}_pow${d}`] = Math.pow(val, d);
        }
      }
    }
    return result;
  }

  interactionFeatures(data: Record<string, unknown>[], columns: string[]): Record<string, unknown>[] {
    const result = data.map(row => ({ ...row }));
    for (let i = 0; i < columns.length; i++) {
      for (let j = i + 1; j < columns.length; j++) {
        const col1 = columns[i], col2 = columns[j];
        for (let k = 0; k < result.length; k++) {
          const v1 = Number(result[k][col1]);
          const v2 = Number(result[k][col2]);
          (result[k] as Record<string, number>)[`${col1}_x_${col2}`] = v1 * v2;
        }
      }
    }
    return result;
  }

  binning(data: Record<string, unknown>[], column: string, bins: number, method: string = 'equal_width'): Record<string, unknown>[] {
    const result = data.map(row => ({ ...row }));
    const values = data.map(r => Number(r[column])).filter(v => !isNaN(v));
    if (values.length === 0) return result;
    let binEdges: number[] = [];
    if (method === 'equal_width') {
      const min = Math.min(...values);
      const max = Math.max(...values);
      const width = (max - min) / bins;
      binEdges = Array.from({ length: bins + 1 }, (_, i) => min + i * width);
    } else if (method === 'equal_freq') {
      const sorted = [...values].sort((a, b) => a - b);
      binEdges = Array.from({ length: bins + 1 }, (_, i) => sorted[Math.min(Math.floor(i * sorted.length / bins), sorted.length - 1)]);
    }
    for (let i = 0; i < result.length; i++) {
      const val = Number(result[i][column]);
      let binIdx = bins - 1;
      for (let b = 0; b < bins; b++) {
        if (val >= binEdges[b] && val < binEdges[b + 1]) {
          binIdx = b;
          break;
        }
      }
      (result[i] as Record<string, unknown>)[`${column}_bin`] = binIdx;
    }
    return result;
  }

  logTransform(data: Record<string, unknown>[], column: string): Record<string, unknown>[] {
    const result = data.map(row => ({ ...row }));
    for (let i = 0; i < result.length; i++) {
      const val = Number(result[i][column]);
      result[i][column] = val > 0 ? Math.log(val) : 0;
    }
    return result;
  }

  sqrtTransform(data: Record<string, unknown>[], column: string): Record<string, unknown>[] {
    const result = data.map(row => ({ ...row }));
    for (let i = 0; i < result.length; i++) {
      const val = Number(result[i][column]);
      result[i][column] = val >= 0 ? Math.sqrt(val) : 0;
    }
    return result;
  }

  boxCoxTransform(data: Record<string, unknown>[], column: string): Record<string, unknown>[] {
    const result = data.map(row => ({ ...row }));
    const values = data.map(r => Number(r[column])).filter(v => v > 0);
    if (values.length === 0) return result;
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const logMean = Math.log(mean);
    const meanLog = values.reduce((s, v) => s + Math.log(v), 0) / values.length;
    const lambda = logMean - meanLog;
    for (let i = 0; i < result.length; i++) {
      const val = Number(result[i][column]);
      if (val > 0) {
        result[i][column] = Math.abs(lambda) < 1e-10 ? Math.log(val) : (Math.pow(val, lambda) - 1) / lambda;
      }
    }
    return result;
  }

  yeoJohnson(data: Record<string, unknown>[], column: string): Record<string, unknown>[] {
    const result = data.map(row => ({ ...row }));
    const lambda = 0.5;
    for (let i = 0; i < result.length; i++) {
      const val = Number(result[i][column]);
      if (val >= 0) {
        result[i][column] = Math.abs(lambda) < 1e-10
          ? Math.log1p(val)
          : (Math.pow(val + 1, lambda) - 1) / lambda;
      } else {
        result[i][column] = Math.abs(lambda - 2) < 1e-10
          ? -Math.log1p(-val)
          : -(Math.pow(-val + 1, 2 - lambda) - 1) / (2 - lambda);
      }
    }
    return result;
  }

  featureSelection(data: Record<string, unknown>[], target: string, method: string = 'correlation', k: number = 10): string[] {
    const numCols = data.length > 0 ? Object.keys(data[0]).filter(c => {
      const vals = data.map(r => r[c]).filter(v => typeof v === 'number');
      return vals.length > 0 && c !== target;
    }) : [];
    const scores: Record<string, number> = {};
    const yVals = data.map(r => Number(r[target])).filter(v => !isNaN(v));
    for (const col of numCols) {
      const xVals = data.map(r => Number(r[col])).filter(v => !isNaN(v));
      const n = Math.min(xVals.length, yVals.length);
      const meanX = xVals.reduce((s, v) => s + v, 0) / n;
      const meanY = yVals.reduce((s, v) => s + v, 0) / n;
      let num = 0, denX = 0, denY = 0;
      for (let i = 0; i < n; i++) {
        num += (xVals[i] - meanX) * (yVals[i] - meanY);
        denX += (xVals[i] - meanX) * (xVals[i] - meanX);
        denY += (yVals[i] - meanY) * (yVals[i] - meanY);
      }
      const den = Math.sqrt(denX * denY);
      scores[col] = den === 0 ? 0 : Math.abs(num / den);
    }
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    return sorted.slice(0, k).map(([col]) => col);
  }

  pcaReduce(data: Record<string, unknown>[], n_components: number = 2): number[][] {
    const numCols = data.length > 0 ? Object.keys(data[0]).filter(c => {
      const vals = data.map(r => r[c]).filter(v => typeof v === 'number');
      return vals.length > 0;
    }) : [];
    const matrix = data.map(row => numCols.map(c => Number(row[c]) || 0));
    const n = matrix.length;
    const d = numCols.length;
    if (n < 2 || d < 2) return matrix.slice(0, n_components);
    const means = new Array(d).fill(0);
    for (let j = 0; j < d; j++) {
      for (let i = 0; i < n; i++) means[j] += matrix[i][j];
      means[j] /= n;
    }
    const centered = matrix.map(row => row.map((v, j) => v - means[j]));
    const cov: number[][] = Array.from({ length: d }, () => new Array(d).fill(0));
    for (let i = 0; i < d; i++) {
      for (let j = 0; j < d; j++) {
        let s = 0;
        for (let k = 0; k < n; k++) s += centered[k][i] * centered[k][j];
        cov[i][j] = s / (n - 1);
      }
    }
    const eig = this._powerIteration(cov, d, Math.min(n_components, d));
    const result = centered.map(row => {
      return eig.map(eigenvec => {
        let s = 0;
        for (let j = 0; j < d; j++) s += row[j] * eigenvec[j];
        return s;
      });
    });
    return result;
  }

  selectFromModel(data: Record<string, unknown>[], target: string, model: string): string[] {
    const numCols = data.length > 0 ? Object.keys(data[0]).filter(c => {
      const vals = data.map(r => r[c]).filter(v => typeof v === 'number');
      return vals.length > 0 && c !== target;
    }) : [];
    const importances: Record<string, number> = {};
    const yVals = data.map(r => Number(r[target])).filter(v => !isNaN(v));
    for (const col of numCols) {
      const xVals = data.map(r => Number(r[col])).filter(v => !isNaN(v));
      const n = Math.min(xVals.length, yVals.length);
      let totalVar = 0;
      const meanY = yVals.reduce((s, v) => s + v, 0) / n;
      for (let i = 0; i < n; i++) totalVar += Math.pow(yVals[i] - meanY, 2);
      let residualVar = 0;
      const meanX = xVals.reduce((s, v) => s + v, 0) / n;
      for (let i = 0; i < n; i++) {
        const pred = meanY + (xVals[i] - meanX) * 0.5;
        residualVar += Math.pow(yVals[i] - pred, 2);
      }
      importances[col] = totalVar === 0 ? 0 : 1 - residualVar / totalVar;
    }
    const sorted = Object.entries(importances).sort((a, b) => b[1] - a[1]);
    return sorted.filter(([, v]) => v > 0.01).map(([col]) => col);
  }

  private _powerIteration(matrix: number[][], d: number, k: number): number[][] {
    const eigenvectors: number[][] = [];
    let residual = matrix.map(row => [...row]);
    for (let comp = 0; comp < k; comp++) {
      let vec = new Array(d).fill(1);
      for (let iter = 0; iter < 100; iter++) {
        const newVec = new Array(d).fill(0);
        for (let i = 0; i < d; i++) {
          for (let j = 0; j < d; j++) newVec[i] += residual[i][j] * vec[j];
        }
        const norm = Math.sqrt(newVec.reduce((s, v) => s + v * v, 0));
        if (norm < 1e-10) break;
        vec = newVec.map(v => v / norm);
      }
      eigenvectors.push(vec);
      const eigval = vec.reduce((s, v, i) => s + v * residual[i].reduce((ss, rv, j) => ss + rv * vec[j], 0), 0);
      for (let i = 0; i < d; i++) {
        for (let j = 0; j < d; j++) {
          residual[i][j] -= eigval * vec[i] * vec[j];
        }
      }
    }
    return eigenvectors;
  }

  toPacket(): DataPacket<{
    features: Map<string, Feature>;
    featureSets: FeatureSet[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['data_science', 'FeatureEngineeringDS'],
      priority: 1,
      phase: 'feature_engineering',
    };
    return {
      id: `feature-engineering-${Date.now().toString(36)}`,
      payload: {
        features: this._features,
        featureSets: this._featureSets,
      },
      metadata,
    };
  }

  reset(): void {
    this._features = new Map();
    this._featureSets = [];
    this._counter = 0;
  }

  get featureCount(): number { return this._features.size; }
  get featureSetCount(): number { return this._featureSets.length; }
}
