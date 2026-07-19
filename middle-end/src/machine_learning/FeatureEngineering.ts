import { DataPacket, PacketMeta } from '../shared/types';

/** Feature descriptor. */
export interface Feature {
  name: string;
  type: 'numeric' | 'categorical' | 'ordinal' | 'binary';
  statistics: { mean: number; std: number; min: number; max: number; missing: number };
}

/** A feature transformation. */
export interface Transform {
  type: 'normalize' | 'standardize' | 'minmax' | 'robust' | 'power' | 'onehot' | 'label' | 'ordinal' | 'target' | 'bin' | 'polynomial';
  params: Record<string, unknown>;
}

/** Feature selection result. */
export interface FeatureSelection {
  selected: number[];
  scores: number[];
  method: string;
}

/** Feature engineering history record. */
interface FeatureRecord {
  operation: string;
  features: number;
  timestamp: number;
}

/** Normalization method. */
export type NormalizeMethod = 'l1' | 'l2' | 'max';

/** Power transform method. */
export type PowerMethod = 'box-cox' | 'yeo-johnson';

/** Binning strategy. */
export type BinStrategy = 'uniform' | 'quantile' | 'kmeans';

export class FeatureEngineering {
  private _features: Feature[] = [];
  private _transforms: Transform[] = [];
  private _selections: FeatureSelection[] = [];
  private _history: FeatureRecord[] = [];

  normalize(X: number[][], method: NormalizeMethod = 'l2'): number[][] {
    if (method === 'l2') {
      return X.map(row => {
        const norm = Math.sqrt(row.reduce((s, v) => s + v * v, 0)) + 1e-12;
        return row.map(v => v / norm);
      });
    } else if (method === 'l1') {
      return X.map(row => {
        const norm = row.reduce((s, v) => s + Math.abs(v), 0) + 1e-12;
        return row.map(v => v / norm);
      });
    }
    return X.map(row => {
      const max = Math.max(...row.map(Math.abs)) + 1e-12;
      return row.map(v => v / max);
    });
  }

  standardize(X: number[][]): number[][] {
    const means = this._columnMeans(X);
    const stds = this._columnStds(X, means);
    return X.map(row => row.map((v, i) => (v - means[i]) / (stds[i] + 1e-12)));
  }

  minMaxScale(X: number[][], min: number = 0, max: number = 1): number[][] {
    const mins = this._columnMin(X);
    const maxs = this._columnMax(X);
    return X.map(row => row.map((v, i) => min + (v - mins[i]) / (maxs[i] - mins[i] + 1e-12) * (max - min)));
  }

  robustScale(X: number[][]): number[][] {
    const medians = this._columnMedian(X);
    const iqrs = this._columnIQR(X, medians);
    return X.map(row => row.map((v, i) => (v - medians[i]) / (iqrs[i] + 1e-12)));
  }

  powerTransform(X: number[][], method: PowerMethod = 'yeo-johnson'): number[][] {
    return X.map(row => row.map(v => {
      if (method === 'box-cox') {
        return v <= 0 ? Math.log(v + 1) : (Math.pow(v + 1, 0.5) - 1) / 0.5;
      }
      return v >= 0 ? Math.log(v + 1) : -Math.log(-v + 1);
    }));
  }

  oneHotEncode(categories: string[], data: string[]): number[][] {
    return data.map(d => categories.map(c => c === d ? 1 : 0));
  }

  labelEncode(labels: string[]): { mapping: Map<string, number>; encoded: number[] } {
    const mapping = new Map<string, number>();
    labels.forEach((l, i) => { if (!mapping.has(l)) mapping.set(l, mapping.size); });
    return { mapping, encoded: labels.map(l => mapping.get(l) ?? 0) };
  }

  ordinalEncode(categories: string[], order: string[]): number[] {
    return categories.map(c => order.indexOf(c));
  }

  targetEncode(categories: string[], target: number[]): number[] {
    const sumMap = new Map<string, number>();
    const countMap = new Map<string, number>();
    categories.forEach((c, i) => {
      sumMap.set(c, (sumMap.get(c) ?? 0) + target[i]);
      countMap.set(c, (countMap.get(c) ?? 0) + 1);
    });
    return categories.map(c => (sumMap.get(c) ?? 0) / (countMap.get(c) ?? 1));
  }

  bin(variable: number[], bins: number, strategy: BinStrategy = 'uniform'): number[] {
    const min = Math.min(...variable);
    const max = Math.max(...variable);
    if (strategy === 'quantile') {
      const sorted = [...variable].sort((a, b) => a - b);
      return variable.map(v => {
        const idx = sorted.indexOf(v);
        return Math.min(bins - 1, Math.floor(idx / variable.length * bins));
      });
    } else if (strategy === 'kmeans') {
      const centers = Array.from({ length: bins }, (_, i) => min + (max - min) * (i + 0.5) / bins);
      return variable.map(v => {
        let bestIdx = 0;
        let bestDist = Infinity;
        centers.forEach((c, i) => {
          const d = Math.abs(v - c);
          if (d < bestDist) { bestDist = d; bestIdx = i; }
        });
        return bestIdx;
      });
    }
    const width = (max - min) / bins + 1e-12;
    return variable.map(v => Math.min(bins - 1, Math.max(0, Math.floor((v - min) / width))));
  }

  polynomialFeatures(X: number[][], degree: number): number[][] {
    return X.map(row => {
      const features: number[] = [];
      for (let d = 1; d <= degree; d++) {
        for (let i = 0; i < row.length; i++) {
          for (let j = i; j < row.length; j++) {
            if (d === 1 && i === j) features.push(row[i]);
            else if (d === 2 && i !== j) features.push(row[i] * row[j]);
          }
        }
        if (d === 2) features.push(...row.map(v => v * v));
      }
      return features;
    });
  }

  interactionTerms(X: number[][], features: number[]): number[][] {
    return X.map(row => {
      const out = [...row];
      for (let i = 0; i < features.length; i++) {
        for (let j = i + 1; j < features.length; j++) {
          out.push(row[features[i]] * row[features[j]]);
        }
      }
      return out;
    });
  }

  selectKBest(X: number[][], y: number[], k: number, scoreFunc: 'chi2' | 'f_classif' | 'mutual_info' = 'f_classif'): FeatureSelection {
    const n = X.length;
    const dim = X[0]?.length ?? 0;
    const yMean = y.reduce((s, v) => s + v, 0) / Math.max(1, n);
    const scores = Array.from({ length: dim }, (_, j) => {
      const col = X.map(row => row[j]);
      const colMean = col.reduce((s, v) => s + v, 0) / Math.max(1, n);
      let num = 0, den = 0;
      for (let i = 0; i < n; i++) {
        num += Math.pow(col[i] - colMean, 2) * Math.pow(y[i] - yMean, 2);
        den += Math.pow(col[i] - colMean, 2);
      }
      return den === 0 ? 0 : num / den;
    });
    const indices = scores.map((s, i) => i).sort((a, b) => scores[b] - scores[a]).slice(0, k);
    const selection: FeatureSelection = { selected: indices, scores, method: scoreFunc };
    this._selections.push(selection);
    return selection;
  }

  rfe(model: { fit: (X: number[][], y: number[]) => void; predict: (X: number[][]) => number[] }, X: number[][], y: number[], nFeatures: number): FeatureSelection {
    const dim = X[0]?.length ?? 0;
    let selected = Array.from({ length: dim }, (_, i) => i);
    while (selected.length > nFeatures) {
      const Xsub = X.map(row => selected.map(i => row[i]));
      model.fit(Xsub, y);
      const preds = model.predict(Xsub);
      const importance = selected.map((_, i) => Math.abs(preds.reduce((s, p, j) => s + p * Xsub[j][i], 0)));
      const minIdx = importance.indexOf(Math.min(...importance));
      selected = selected.filter((_, i) => i !== minIdx);
    }
    const selection: FeatureSelection = { selected, scores: selected.map(() => 1), method: 'rfe' };
    this._selections.push(selection);
    return selection;
  }

  selectFromModel(model: { fit: (X: number[][], y: number[]) => void }, X: number[][], y: number[]): FeatureSelection {
    model.fit(X, y);
    const dim = X[0]?.length ?? 0;
    const scores = Array.from({ length: dim }, (_, i) => 1 / (1 + i));
    const selected = scores.map((s, i) => ({ s, i })).filter(v => v.s > 0.3).map(v => v.i);
    const selection: FeatureSelection = { selected, scores, method: 'select_from_model' };
    this._selections.push(selection);
    return selection;
  }

  varianceThreshold(X: number[][], threshold: number): FeatureSelection {
    const dim = X[0]?.length ?? 0;
    const variances = Array.from({ length: dim }, (_, j) => {
      const col = X.map(row => row[j]);
      const mean = col.reduce((s, v) => s + v, 0) / Math.max(1, col.length);
      return col.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / Math.max(1, col.length);
    });
    const selected = variances.map((v, i) => ({ v, i })).filter(v => v.v > threshold).map(v => v.i);
    const selection: FeatureSelection = { selected, scores: variances, method: 'variance_threshold' };
    this._selections.push(selection);
    return selection;
  }

  correlationMatrix(X: number[][]): number[][] {
    const dim = X[0]?.length ?? 0;
    const means = this._columnMeans(X);
    const stds = this._columnStds(X, means);
    const matrix: number[][] = Array.from({ length: dim }, () => new Array(dim).fill(0));
    for (let i = 0; i < dim; i++) {
      for (let j = 0; j < dim; j++) {
        let cov = 0;
        for (let k = 0; k < X.length; k++) cov += (X[k][i] - means[i]) * (X[k][j] - means[j]);
        cov /= Math.max(1, X.length);
        matrix[i][j] = cov / ((stds[i] * stds[j]) + 1e-12);
      }
    }
    return matrix;
  }

  vif(X: number[][]): number[] {
    const dim = X[0]?.length ?? 0;
    const corr = this.correlationMatrix(X);
    return Array.from({ length: dim }, (_, i) => {
      const r2 = corr[i][i] * corr[i][i];
      return r2 >= 1 ? Infinity : 1 / (1 - r2);
    });
  }

  toPacket(): DataPacket<{ features: Feature[]; transforms: Transform[]; selections: FeatureSelection[]; history: FeatureRecord[] }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['machine_learning', 'FeatureEngineering'],
      priority: 1,
      phase: 'feature_engineering',
    };
    return {
      id: `feature-eng-${Date.now().toString(36)}`,
      payload: { features: this._features, transforms: this._transforms, selections: this._selections, history: this._history },
      metadata,
    };
  }

  reset(): void {
    this._features = [];
    this._transforms = [];
    this._selections = [];
    this._history = [];
  }

  get featureCount(): number { return this._features.length; }
  get transformCount(): number { return this._transforms.length; }
  get selectionCount(): number { return this._selections.length; }

  private _columnMeans(X: number[][]): number[] {
    const dim = X[0]?.length ?? 0;
    const out = new Array(dim).fill(0);
    for (const row of X) for (let i = 0; i < dim; i++) out[i] += row[i];
    return out.map(v => v / Math.max(1, X.length));
  }

  private _columnStds(X: number[][], means: number[]): number[] {
    const dim = X[0]?.length ?? 0;
    const out = new Array(dim).fill(0);
    for (const row of X) for (let i = 0; i < dim; i++) out[i] += Math.pow(row[i] - means[i], 2);
    return out.map(v => Math.sqrt(v / Math.max(1, X.length)));
  }

  private _columnMin(X: number[][]): number[] {
    const dim = X[0]?.length ?? 0;
    const out = new Array(dim).fill(Infinity);
    for (const row of X) for (let i = 0; i < dim; i++) out[i] = Math.min(out[i], row[i]);
    return out;
  }

  private _columnMax(X: number[][]): number[] {
    const dim = X[0]?.length ?? 0;
    const out = new Array(dim).fill(-Infinity);
    for (const row of X) for (let i = 0; i < dim; i++) out[i] = Math.max(out[i], row[i]);
    return out;
  }

  private _columnMedian(X: number[][]): number[] {
    const dim = X[0]?.length ?? 0;
    const out: number[] = [];
    for (let j = 0; j < dim; j++) {
      const col = X.map(row => row[j]).sort((a, b) => a - b);
      out.push(col.length % 2 === 0 ? (col[col.length / 2 - 1] + col[col.length / 2]) / 2 : col[Math.floor(col.length / 2)]);
    }
    return out;
  }

  private _columnIQR(X: number[][], medians: number[]): number[] {
    const dim = X[0]?.length ?? 0;
    const out: number[] = [];
    for (let j = 0; j < dim; j++) {
      const col = X.map(row => row[j]).sort((a, b) => a - b);
      const q1 = col[Math.floor(col.length * 0.25)];
      const q3 = col[Math.floor(col.length * 0.75)];
      out.push(q3 - q1);
      void medians;
    }
    return out;
  }
}
