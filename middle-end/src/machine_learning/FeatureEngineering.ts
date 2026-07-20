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

  // ---------------------------------------------------------------------------
  // Advanced scaling and transforms
  // ---------------------------------------------------------------------------

  /** Max-Abs scaling (divides by max absolute value, preserving sparsity). */
  maxAbsScale(X: number[][]): number[][] {
    const dim = X[0]?.length ?? 0;
    const maxAbs = new Array(dim).fill(0);
    for (const row of X) for (let j = 0; j < dim; j++) maxAbs[j] = Math.max(maxAbs[j], Math.abs(row[j]));
    return X.map(row => row.map((v, j) => v / (maxAbs[j] + 1e-12)));
  }

  /** Quantile transformer (maps to uniform or normal distribution). */
  quantileTransform(X: number[][], nQuantiles: number = 1000, output: 'uniform' | 'normal' = 'normal'): number[][] {
    const dim = X[0]?.length ?? 0;
    const result: number[][] = X.map(row => [...row]);
    for (let j = 0; j < dim; j++) {
      const col = X.map(row => row[j]);
      const sorted = [...col].sort((a, b) => a - b);
      for (let i = 0; i < X.length; i++) {
        const rank = sorted.indexOf(col[i]);
        const u = rank / Math.max(1, sorted.length - 1);
        result[i][j] = output === 'uniform' ? u : this._probit(u);
      }
      void nQuantiles;
    }
    return result;
  }

  /** Log transform (with optional offset for non-positive values). */
  logTransform(X: number[][], offset: number = 1): number[][] {
    return X.map(row => row.map(v => Math.log(v + offset)));
  }

  /** Reciprocal transform (1/x). */
  reciprocalTransform(X: number[][], offset: number = 1e-6): number[][] {
    return X.map(row => row.map(v => 1 / (v + offset)));
  }

  /** Square-root transform. */
  sqrtTransform(X: number[][]): number[][] {
    return X.map(row => row.map(v => Math.sign(v) * Math.sqrt(Math.abs(v))));
  }

  /** Cube-root transform (handles negatives). */
  cbrtTransform(X: number[][]): number[][] {
    return X.map(row => row.map(v => Math.cbrt(v)));
  }

  /** Sigmoid transform. */
  sigmoidTransform(X: number[][]): number[][] {
    return X.map(row => row.map(v => 1 / (1 + Math.exp(-v))));
  }

  /** Tanh transform. */
  tanhTransform(X: number[][]): number[][] {
    return X.map(row => row.map(v => Math.tanh(v)));
  }

  /** Clip outliers to specified quantiles. */
  clipOutliers(X: number[][], lowerQ: number = 0.05, upperQ: number = 0.95): number[][] {
    const dim = X[0]?.length ?? 0;
    const bounds: { lower: number; upper: number }[] = [];
    for (let j = 0; j < dim; j++) {
      const col = [...X.map(row => row[j])].sort((a, b) => a - b);
      bounds.push({
        lower: col[Math.floor(col.length * lowerQ)] ?? 0,
        upper: col[Math.floor(col.length * upperQ)] ?? 0,
      });
    }
    return X.map(row => row.map((v, j) => Math.max(bounds[j].lower, Math.min(bounds[j].upper, v))));
  }

  /** Winsorize (cap extreme values to percentiles). */
  winsorize(X: number[][], limits: [number, number] = [0.05, 0.05]): number[][] {
    return this.clipOutliers(X, limits[0], 1 - limits[1]);
  }

  // ---------------------------------------------------------------------------
  // Imputation methods
  // ---------------------------------------------------------------------------

  /** Mean imputation for missing values (NaN). */
  meanImpute(X: number[][]): number[][] {
    const dim = X[0]?.length ?? 0;
    const means: number[] = [];
    for (let j = 0; j < dim; j++) {
      const col = X.map(row => row[j]).filter(v => !Number.isNaN(v));
      means.push(col.reduce((s, v) => s + v, 0) / Math.max(1, col.length));
    }
    return X.map(row => row.map((v, j) => (Number.isNaN(v) ? means[j] : v)));
  }

  /** Median imputation. */
  medianImpute(X: number[][]): number[][] {
    const dim = X[0]?.length ?? 0;
    const medians: number[] = [];
    for (let j = 0; j < dim; j++) {
      const col = X.map(row => row[j]).filter(v => !Number.isNaN(v)).sort((a, b) => a - b);
      const mid = Math.floor(col.length / 2);
      medians.push(col.length % 2 === 0 ? (col[mid - 1] + col[mid]) / 2 : col[mid]);
    }
    return X.map(row => row.map((v, j) => (Number.isNaN(v) ? medians[j] : v)));
  }

  /** Mode imputation (for categorical / discrete features). */
  modeImpute(X: number[][]): number[][] {
    const dim = X[0]?.length ?? 0;
    const modes: number[] = [];
    for (let j = 0; j < dim; j++) {
      const counts = new Map<number, number>();
      for (const row of X) {
        const v = row[j];
        if (!Number.isNaN(v)) counts.set(v, (counts.get(v) ?? 0) + 1);
      }
      let best = 0, bestCount = 0;
      for (const [k, c] of counts) if (c > bestCount) { best = k; bestCount = c; }
      modes.push(best);
    }
    return X.map(row => row.map((v, j) => (Number.isNaN(v) ? modes[j] : v)));
  }

  /** KNN imputation (uses nearest neighbors' mean for missing values). */
  knnImpute(X: number[][], k: number = 5): number[][] {
    const n = X.length;
    const dim = X[0]?.length ?? 0;
    const result = X.map(row => [...row]);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < dim; j++) {
        if (!Number.isNaN(X[i][j])) continue;
        const dists = X.map((row, idx) => ({
          idx,
          d: idx === i ? Infinity : row.reduce((s, v, c) => c === j || Number.isNaN(v) ? s : s + Math.pow(v - X[i][c], 2), 0),
        })).filter(d => !Number.isNaN(X[d.idx][j])).sort((a, b) => a.d - b.d).slice(0, k);
        if (dists.length > 0) {
          result[i][j] = dists.reduce((s, d) => s + X[d.idx][j], 0) / dists.length;
        }
      }
    }
    return result;
  }

  /** Iterative imputation (round-robin regression imputation). */
  iterativeImpute(X: number[][], maxIter: number = 10, tol: number = 1e-3): number[][] {
    let Xc = this.meanImpute(X);
    for (let iter = 0; iter < maxIter; iter++) {
      const prev = Xc.map(row => [...row]);
      const dim = Xc[0]?.length ?? 0;
      for (let j = 0; j < dim; j++) {
        const missingIdx: number[] = [];
        for (let i = 0; i < X.length; i++) if (Number.isNaN(X[i][j])) missingIdx.push(i);
        if (missingIdx.length === 0) continue;
        const trainX: number[][] = [];
        const trainY: number[] = [];
        for (let i = 0; i < X.length; i++) {
          if (!Number.isNaN(X[i][j])) {
            trainX.push(Xc[i].filter((_, c) => c !== j));
            trainY.push(Xc[i][j]);
          }
        }
        const meanY = this._mean(trainY);
        for (const i of missingIdx) {
          const xVec = Xc[i].filter((_, c) => c !== j);
          const weights = trainX.map((tx, ti) => {
            const d = Math.sqrt(tx.reduce((s, v, k) => s + Math.pow(v - xVec[k], 2), 0));
            return 1 / (d + 1e-6);
          });
          const sumW = weights.reduce((s, w) => s + w, 0);
          Xc[i][j] = trainY.reduce((s, y, ti) => s + y * weights[ti], 0) / (sumW + 1e-12) || meanY;
        }
      }
      let maxDelta = 0;
      for (let i = 0; i < X.length; i++) for (let j = 0; j < dim; j++) {
        maxDelta = Math.max(maxDelta, Math.abs(Xc[i][j] - prev[i][j]));
      }
      if (maxDelta < tol) break;
    }
    return Xc;
  }

  /** Constant value imputation. */
  constantImpute(X: number[][], fillValue: number = 0): number[][] {
    return X.map(row => row.map(v => (Number.isNaN(v) ? fillValue : v)));
  }

  /** Forward-fill imputation (carry last observation forward). */
  forwardFillImpute(X: number[][]): number[][] {
    const dim = X[0]?.length ?? 0;
    const result = X.map(row => [...row]);
    const lastValues = new Array(dim).fill(NaN);
    for (let i = 0; i < X.length; i++) {
      for (let j = 0; j < dim; j++) {
        if (Number.isNaN(X[i][j])) {
          if (!Number.isNaN(lastValues[j])) result[i][j] = lastValues[j];
        } else {
          lastValues[j] = X[i][j];
        }
      }
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // Encoding methods
  // ---------------------------------------------------------------------------

  /** Binary encoding (efficient alternative to one-hot for high cardinality). */
  binaryEncode(categories: string[]): { mapping: Map<string, number>; encoded: number[][] } {
    const unique = [...new Set(categories)];
    const mapping = new Map<string, number>();
    unique.forEach((c, i) => mapping.set(c, i));
    const bits = Math.max(1, Math.ceil(Math.log2(unique.length + 1)));
    return {
      mapping,
      encoded: categories.map(c => {
        const val = mapping.get(c) ?? 0;
        return Array.from({ length: bits }, (_, b) => (val >> b) & 1);
      }),
    };
  }

  /** Count encoding (replaces category with its frequency). */
  countEncode(categories: string[]): number[] {
    const counts = new Map<string, number>();
    for (const c of categories) counts.set(c, (counts.get(c) ?? 0) + 1);
    return categories.map(c => counts.get(c) ?? 0);
  }

  /** Hashing encoding (feature hashing for high cardinality). */
  hashEncode(categories: string[], nComponents: number = 8): number[][] {
    return categories.map(c => {
      const vec = new Array(nComponents).fill(0);
      let hash = 0;
      for (let i = 0; i < c.length; i++) hash = ((hash << 5) - hash + c.charCodeAt(i)) | 0;
      for (let i = 0; i < nComponents; i++) {
        const bit = (hash >> i) & 1;
        vec[i] = bit === 1 ? 1 : -1;
      }
      return vec;
    });
  }

  /** James-Stein encoding (Bayesian shrinkage toward overall mean). */
  jamesSteinEncode(categories: string[], target: number[], lambda: number = 0.5): number[] {
    const overallMean = this._mean(target);
    const groupSums = new Map<string, number>();
    const groupCounts = new Map<string, number>();
    categories.forEach((c, i) => {
      groupSums.set(c, (groupSums.get(c) ?? 0) + target[i]);
      groupCounts.set(c, (groupCounts.get(c) ?? 0) + 1);
    });
    return categories.map(c => {
      const mean = (groupSums.get(c) ?? 0) / Math.max(1, groupCounts.get(c) ?? 1);
      return lambda * overallMean + (1 - lambda) * mean;
    });
  }

  /** CatBoost encoding (ordered target encoding). */
  catBoostEncode(categories: string[], target: number[]): number[] {
    const result: number[] = [];
    const stats = new Map<string, { sum: number; count: number }>();
    const overall = { sum: 0, count: 0 };
    for (let i = 0; i < categories.length; i++) {
      const c = categories[i];
      const stat = stats.get(c) ?? { sum: 0, count: 0 };
      const encoded = stat.count === 0
        ? overall.sum / Math.max(1, overall.count)
        : (stat.sum + overall.sum) / (stat.count + overall.count + 1);
      result.push(encoded);
      stats.set(c, { sum: stat.sum + target[i], count: stat.count + 1 });
      overall.sum += target[i];
      overall.count += 1;
    }
    return result;
  }

  /** Leave-one-out target encoding (avoids leakage). */
  leaveOneOutEncode(categories: string[], target: number[]): number[] {
    const groupSums = new Map<string, number>();
    const groupCounts = new Map<string, number>();
    const totalSum = target.reduce((s, v) => s + v, 0);
    categories.forEach((c, i) => {
      groupSums.set(c, (groupSums.get(c) ?? 0) + target[i]);
      groupCounts.set(c, (groupCounts.get(c) ?? 0) + 1);
    });
    return categories.map((c, i) => {
      const sum = (groupSums.get(c) ?? 0) - target[i];
      const count = (groupCounts.get(c) ?? 1) - 1;
      return count > 0 ? sum / count : (totalSum - target[i]) / Math.max(1, target.length - 1);
    });
  }

  /** Weight of Evidence (WoE) encoding for binary classification. */
  woeEncode(categories: string[], target: number[]): number[] {
    const goods = new Map<string, number>();
    const bads = new Map<string, number>();
    let totalGood = 0, totalBad = 0;
    categories.forEach((c, i) => {
      if (target[i] === 1) {
        goods.set(c, (goods.get(c) ?? 0) + 1);
        totalGood++;
      } else {
        bads.set(c, (bads.get(c) ?? 0) + 1);
        totalBad++;
      }
    });
    return categories.map(c => {
      const g = (goods.get(c) ?? 0) + 0.5;
      const b = (bads.get(c) ?? 0) + 0.5;
      return Math.log((g / Math.max(1, totalGood)) / (b / Math.max(1, totalBad)));
    });
  }

  // ---------------------------------------------------------------------------
  // Feature selection - additional methods
  // ---------------------------------------------------------------------------

  /** Select percentile (selects top features in given percentile by score). */
  selectPercentile(X: number[][], y: number[], percentile: number, scoreFunc: 'chi2' | 'f_classif' | 'mutual_info' = 'f_classif'): FeatureSelection {
    const dim = X[0]?.length ?? 0;
    const k = Math.max(1, Math.floor(dim * percentile / 100));
    return this.selectKBest(X, y, k, scoreFunc);
  }

  /** Select features based on false positive rate. */
  selectFpr(X: number[][], y: number[], alpha: number = 0.05): FeatureSelection {
    const dim = X[0]?.length ?? 0;
    const scores = this._fClassifScores(X, y);
    const selected: number[] = [];
    for (let j = 0; j < dim; j++) if (scores[j] > alpha) selected.push(j);
    const selection: FeatureSelection = { selected, scores, method: 'fpr' };
    this._selections.push(selection);
    return selection;
  }

  /** Select features based on false discovery rate. */
  selectFdr(X: number[][], y: number[], alpha: number = 0.05): FeatureSelection {
    const dim = X[0]?.length ?? 0;
    const scores = this._fClassifScores(X, y);
    const sortedIdx = scores.map((s, i) => i).sort((a, b) => scores[a] - scores[b]);
    const selected: number[] = [];
    for (let r = 0; r < sortedIdx.length; r++) {
      const threshold = alpha * (r + 1) / sortedIdx.length;
      if (scores[sortedIdx[r]] <= threshold) selected.push(sortedIdx[r]);
    }
    const selection: FeatureSelection = { selected, scores, method: 'fdr' };
    this._selections.push(selection);
    return selection;
  }

  /** Select features based on family-wise error rate. */
  selectFwe(X: number[][], y: number[], alpha: number = 0.05): FeatureSelection {
    const dim = X[0]?.length ?? 0;
    const scores = this._fClassifScores(X, y);
    const threshold = alpha / dim;
    const selected: number[] = [];
    for (let j = 0; j < dim; j++) if (scores[j] <= threshold) selected.push(j);
    const selection: FeatureSelection = { selected, scores, method: 'fwe' };
    this._selections.push(selection);
    return selection;
  }

  /** Mutual information feature selection. */
  mutualInfoClassif(X: number[][], y: number[], k: number): FeatureSelection {
    const n = X.length;
    const dim = X[0]?.length ?? 0;
    const scores: number[] = [];
    const yEntropy = this._entropy(y);
    for (let j = 0; j < dim; j++) {
      const col = X.map(row => row[j]);
      const xEntropy = this._entropy(col);
      const jointEntropy = this._jointEntropy(col, y);
      scores.push(xEntropy + yEntropy - jointEntropy);
    }
    const indices = scores.map((s, i) => i).sort((a, b) => scores[b] - scores[a]).slice(0, k);
    const selection: FeatureSelection = { selected: indices, scores, method: 'mutual_info' };
    this._selections.push(selection);
    return selection;
  }

  /** Sequential Forward Selection (greedy feature selection). */
  sequentialForwardSelection(model: { fit: (X: number[][], y: number[]) => void; predict: (X: number[][]) => number[] }, X: number[][], y: number[], k: number): FeatureSelection {
    const dim = X[0]?.length ?? 0;
    const selected: number[] = [];
    const remaining = Array.from({ length: dim }, (_, i) => i);
    while (selected.length < k && remaining.length > 0) {
      let bestScore = -Infinity;
      let bestFeature = -1;
      for (const f of remaining) {
        const trial = [...selected, f];
        const Xsub = X.map(row => trial.map(i => row[i]));
        model.fit(Xsub, y);
        const preds = model.predict(Xsub);
        const score = this._accuracy(y, preds);
        if (score > bestScore) { bestScore = score; bestFeature = f; }
      }
      selected.push(bestFeature);
      const idx = remaining.indexOf(bestFeature);
      remaining.splice(idx, 1);
    }
    const selection: FeatureSelection = { selected, scores: selected.map(() => 1), method: 'sfs' };
    this._selections.push(selection);
    return selection;
  }

  /** Sequential Backward Selection (greedy feature elimination). */
  sequentialBackwardSelection(model: { fit: (X: number[][], y: number[]) => void; predict: (X: number[][]) => number[] }, X: number[][], y: number[], k: number): FeatureSelection {
    const dim = X[0]?.length ?? 0;
    let selected = Array.from({ length: dim }, (_, i) => i);
    while (selected.length > k) {
      let worstScore = Infinity;
      let worstFeature = -1;
      for (const f of selected) {
        const trial = selected.filter(i => i !== f);
        const Xsub = X.map(row => trial.map(i => row[i]));
        model.fit(Xsub, y);
        const preds = model.predict(Xsub);
        const score = this._accuracy(y, preds);
        if (score < worstScore) { worstScore = score; worstFeature = f; }
      }
      selected = selected.filter(i => i !== worstFeature);
    }
    const selection: FeatureSelection = { selected, scores: selected.map(() => 1), method: 'sbs' };
    this._selections.push(selection);
    return selection;
  }

  /** Exhaustive feature selection (best subset of size k). */
  exhaustiveSelection(model: { fit: (X: number[][], y: number[]) => void; predict: (X: number[][]) => number[] }, X: number[][], y: number[], k: number): FeatureSelection {
    const dim = X[0]?.length ?? 0;
    const allCombos = this._combinations(Array.from({ length: dim }, (_, i) => i), k);
    let bestScore = -Infinity;
    let bestCombo: number[] = [];
    for (const combo of allCombos) {
      const Xsub = X.map(row => combo.map(i => row[i]));
      model.fit(Xsub, y);
      const preds = model.predict(Xsub);
      const score = this._accuracy(y, preds);
      if (score > bestScore) { bestScore = score; bestCombo = combo; }
    }
    const selection: FeatureSelection = { selected: bestCombo, scores: bestCombo.map(() => bestScore), method: 'exhaustive' };
    this._selections.push(selection);
    return selection;
  }

  // ---------------------------------------------------------------------------
  // Discretization methods
  // ---------------------------------------------------------------------------

  /** Decision tree discretization (uses tree splits for binning). */
  decisionTreeDiscretize(X: number[][], y: number[], maxDepth: number = 3): { feature: number; thresholds: number[]; bins: number[] } {
    const dim = X[0]?.length ?? 0;
    let bestFeature = 0;
    let bestScore = -Infinity;
    let bestThresholds: number[] = [];
    for (let j = 0; j < dim; j++) {
      const col = X.map(row => row[j]);
      const thresholds = this._treeThresholds(col, y, maxDepth);
      const score = this._discretizeScore(col, y, thresholds);
      if (score > bestScore) { bestScore = score; bestFeature = j; bestThresholds = thresholds; }
    }
    const col = X.map(row => row[bestFeature]);
    const bins = col.map(v => bestThresholds.filter(t => v > t).length);
    return { feature: bestFeature, thresholds: bestThresholds, bins };
  }

  /** MDLP (Minimum Description Length Principle) discretization. */
  mdlpDiscretize(values: number[], labels: number[]): { thresholds: number[]; bins: number[] } {
    const thresholds: number[] = [];
    this._mdlpRecursive(values, labels, thresholds, 0, values.length);
    thresholds.sort((a, b) => a - b);
    const bins = values.map(v => thresholds.filter(t => v > t).length);
    return { thresholds, bins };
  }

  // ---------------------------------------------------------------------------
  // Feature generation (cross-feature / aggregation)
  // ---------------------------------------------------------------------------

  /** Aggregation features (mean, sum, min, max, std across groups of features). */
  aggregateFeatures(X: number[][], featureGroups: number[][]): number[][] {
    return X.map(row => {
      const out = [...row];
      for (const group of featureGroups) {
        const vals = group.map(i => row[i]);
        const mean = this._mean(vals);
        out.push(
          mean,
          vals.reduce((s, v) => s + v, 0),
          Math.min(...vals),
          Math.max(...vals),
          Math.sqrt(this._variance(vals, mean)),
        );
      }
      return out;
    });
  }

  /** Date/time feature extraction. */
  dateTimeFeatures(timestamps: number[]): number[][] {
    return timestamps.map(ts => {
      const d = new Date(ts);
      return [
        d.getFullYear(),
        d.getMonth() + 1,
        d.getDate(),
        d.getHours(),
        d.getMinutes(),
        d.getSeconds(),
        d.getDay(),
        Math.floor((d.getMonth() * 30 + d.getDate()) / 7), // week of year approx
        d.getHours() < 6 ? 0 : d.getHours() < 12 ? 1 : d.getHours() < 18 ? 2 : 3, // time of day bin
        d.getDay() === 0 || d.getDay() === 6 ? 1 : 0, // is_weekend
      ];
    });
  }

  /** Text statistical features (length, word count, punctuation count, etc.). */
  textStatFeatures(texts: string[]): number[][] {
    return texts.map(t => {
      const words = t.split(/\s+/).filter(w => w.length > 0);
      const chars = t.length;
      const upper = (t.match(/[A-Z]/g) ?? []).length;
      const lower = (t.match(/[a-z]/g) ?? []).length;
      const punct = (t.match(/[.,!?;:]/g) ?? []).length;
      const digits = (t.match(/[0-9]/g) ?? []).length;
      const whitespace = (t.match(/\s/g) ?? []).length;
      const uniqueWords = new Set(words.map(w => w.toLowerCase())).size;
      return [
        chars,
        words.length,
        chars / Math.max(1, words.length), // avg word length
        upper,
        lower,
        punct,
        digits,
        whitespace,
        uniqueWords,
        uniqueWords / Math.max(1, words.length), // lexical diversity
      ];
    });
  }

  /** Group-by aggregation features. */
  groupByAggregate(values: number[], groups: string[], target: number[]): { groupMeans: Map<string, number>; encoded: number[] } {
    const sums = new Map<string, number>();
    const counts = new Map<string, number>();
    groups.forEach((g, i) => {
      sums.set(g, (sums.get(g) ?? 0) + target[i]);
      counts.set(g, (counts.get(g) ?? 0) + 1);
    });
    const groupMeans = new Map<string, number>();
    for (const [g, s] of sums) groupMeans.set(g, s / Math.max(1, counts.get(g) ?? 1));
    const encoded = groups.map(g => groupMeans.get(g) ?? 0);
    void values;
    return { groupMeans, encoded };
  }

  // ---------------------------------------------------------------------------
  // Dimensionality-reduction feature extraction
  // ---------------------------------------------------------------------------

  /** Principal component feature extraction (top-k components). */
  pcaFeatures(X: number[][], k: number): number[][] {
    const centered = this.standardize(X);
    const cov = this._covarianceMatrix(centered);
    const { eigenvalues, eigenvectors } = this._jacobiEigen(cov);
    const idx = eigenvalues.map((_, i) => i).sort((a, b) => eigenvalues[b] - eigenvalues[a]).slice(0, k);
    const components = idx.map(i => eigenvectors[i]);
    return centered.map(row => components.map(c => c.reduce((s, v, j) => s + v * row[j], 0)));
  }

  /** Add polynomial features of degree d with full interaction terms. */
  fullPolynomialFeatures(X: number[][], degree: number, includeBias: boolean = false): number[][] {
    return X.map(row => {
      const out: number[] = includeBias ? [1] : [];
      const dim = row.length;
      const combinations = this._combinations(Array.from({ length: dim }, (_, i) => i), degree);
      for (const combo of combinations) {
        out.push(combo.reduce((s, i) => s * row[i], 1));
      }
      return out;
    });
  }

  /** Radial Basis Function features. */
  rbfFeatures(X: number[][], centers: number[][], gamma: number = 1.0): number[][] {
    return X.map(row => centers.map(c => Math.exp(-gamma * row.reduce((s, v, i) => s + Math.pow(v - (c[i] ?? 0), 2), 0))));
  }

  /** Fourier features (sin/cos transforms for periodic features). */
  fourierFeatures(X: number[][], nHarmonics: number, period: number = 2 * Math.PI): number[][] {
    return X.map(row => {
      const out: number[] = [];
      for (const v of row) {
        for (let k = 1; k <= nHarmonics; k++) {
          out.push(Math.sin(2 * Math.PI * k * v / period));
          out.push(Math.cos(2 * Math.PI * k * v / period));
        }
      }
      return out;
    });
  }

  // ---------------------------------------------------------------------------
  // Outlier detection feature
  // ---------------------------------------------------------------------------

  /** Z-score based outlier flagging. */
  zScoreOutliers(X: number[][], threshold: number = 3): boolean[][] {
    const means = this._columnMeans(X);
    const stds = this._columnStds(X, means);
    return X.map(row => row.map((v, j) => Math.abs((v - means[j]) / (stds[j] + 1e-12)) > threshold));
  }

  /** Modified Z-score (using MAD). */
  modifiedZScoreOutliers(X: number[][], threshold: number = 3.5): boolean[][] {
    const dim = X[0]?.length ?? 0;
    const medians = this._columnMedian(X);
    const mads: number[] = [];
    for (let j = 0; j < dim; j++) {
      const col = X.map(row => Math.abs(row[j] - medians[j])).sort((a, b) => a - b);
      const mid = Math.floor(col.length / 2);
      mads.push(col.length % 2 === 0 ? (col[mid - 1] + col[mid]) / 2 : col[mid]);
    }
    return X.map(row => row.map((v, j) => 0.6745 * Math.abs(v - medians[j]) / (mads[j] + 1e-12) > threshold));
  }

  /** IQR-based outlier flagging. */
  iqrOutliers(X: number[][], k: number = 1.5): boolean[][] {
    const dim = X[0]?.length ?? 0;
    const bounds: { lower: number; upper: number }[] = [];
    for (let j = 0; j < dim; j++) {
      const col = X.map(row => row[j]).sort((a, b) => a - b);
      const q1 = col[Math.floor(col.length * 0.25)] ?? 0;
      const q3 = col[Math.floor(col.length * 0.75)] ?? 0;
      const iqr = q3 - q1;
      bounds.push({ lower: q1 - k * iqr, upper: q3 + k * iqr });
    }
    return X.map(row => row.map((v, j) => v < bounds[j].lower || v > bounds[j].upper));
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

  private _mean(v: number[]): number {
    return v.length === 0 ? 0 : v.reduce((s, x) => s + x, 0) / v.length;
  }

  private _variance(v: number[], mean?: number): number {
    if (v.length === 0) return 0;
    const m = mean ?? this._mean(v);
    return v.reduce((s, x) => s + Math.pow(x - m, 2), 0) / v.length;
  }

  private _accuracy(yTrue: number[], yPred: number[]): number {
    if (yTrue.length === 0) return 0;
    let correct = 0;
    for (let i = 0; i < yTrue.length; i++) if (yTrue[i] === yPred[i]) correct++;
    return correct / yTrue.length;
  }

  private _probit(p: number): number {
    const u = Math.max(1e-10, Math.min(1 - 1e-10, p));
    return Math.SQRT2 * this._erfInv(2 * u - 1);
  }

  private _erfInv(x: number): number {
    const tt1 = Math.log(1 - x * x);
    const tt2 = 2 / (Math.PI * 0.147) + tt1 / 2;
    return Math.sign(x) * Math.sqrt(-tt1 / (2 * 0.147) - tt2 + Math.sqrt(tt2 * tt2 - tt1 / 0.147));
  }

  private _fClassifScores(X: number[][], y: number[]): number[] {
    const n = X.length;
    const dim = X[0]?.length ?? 0;
    const classes = [...new Set(y)];
    const overallMean = this._mean(y);
    const scores: number[] = [];
    for (let j = 0; j < dim; j++) {
      const col = X.map(row => row[j]);
      let between = 0, within = 0;
      for (const c of classes) {
        const subset = col.filter((_, i) => y[i] === c);
        const mean = this._mean(subset);
        between += subset.length * Math.pow(mean - overallMean, 2);
        within += subset.reduce((s, v) => s + Math.pow(v - mean, 2), 0);
      }
      scores.push(within === 0 ? 0 : between / Math.max(1e-12, within / Math.max(1, n - classes.length)));
    }
    return scores;
  }

  private _entropy(values: number[]): number {
    if (values.length === 0) return 0;
    const counts = new Map<number, number>();
    for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
    let entropy = 0;
    for (const c of counts.values()) {
      const p = c / values.length;
      entropy -= p * Math.log2(p + 1e-12);
    }
    return entropy;
  }

  private _jointEntropy(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;
    const counts = new Map<string, number>();
    for (let i = 0; i < x.length; i++) {
      const key = `${x[i]}-${y[i]}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    let entropy = 0;
    for (const c of counts.values()) {
      const p = c / x.length;
      entropy -= p * Math.log2(p + 1e-12);
    }
    return entropy;
  }

  private _combinations(arr: number[], k: number): number[][] {
    if (k === 0) return [[]];
    if (arr.length === 0) return [];
    if (k > arr.length) return [];
    const result: number[][] = [];
    const combo: number[] = [];
    const helper = (start: number, depth: number) => {
      if (depth === k) { result.push([...combo]); return; }
      for (let i = start; i < arr.length; i++) {
        combo.push(arr[i]);
        helper(i + 1, depth + 1);
        combo.pop();
      }
    };
    helper(0, 0);
    return result;
  }

  private _treeThresholds(values: number[], labels: number[], maxDepth: number): number[] {
    const thresholds: number[] = [];
    const idx = values.map((_, i) => i).sort((a, b) => values[a] - values[b]);
    const helper = (idxArr: number[], depth: number) => {
      if (depth >= maxDepth || idxArr.length < 2) return;
      let bestGain = -Infinity;
      let bestThreshold = 0;
      let bestSplit = 0;
      for (let i = 1; i < idxArr.length; i++) {
        if (values[idxArr[i]] === values[idxArr[i - 1]]) continue;
        const threshold = (values[idxArr[i]] + values[idxArr[i - 1]]) / 2;
        const left = idxArr.slice(0, i).map(j => labels[j]);
        const right = idxArr.slice(i).map(j => labels[j]);
        const gain = this._gini(labels.filter((_, j) => idxArr.includes(j))) -
                     (left.length * this._gini(left) + right.length * this._gini(right)) / idxArr.length;
        if (gain > bestGain) { bestGain = gain; bestThreshold = threshold; bestSplit = i; }
      }
      if (bestGain > 0) {
        thresholds.push(bestThreshold);
        helper(idxArr.slice(0, bestSplit), depth + 1);
        helper(idxArr.slice(bestSplit), depth + 1);
      }
    };
    helper(idx, 0);
    return thresholds;
  }

  private _gini(labels: number[]): number {
    if (labels.length === 0) return 0;
    const counts = new Map<number, number>();
    for (const l of labels) counts.set(l, (counts.get(l) ?? 0) + 1);
    let sum = 0;
    for (const c of counts.values()) {
      const p = c / labels.length;
      sum += p * p;
    }
    return 1 - sum;
  }

  private _discretizeScore(values: number[], labels: number[], thresholds: number[]): number {
    if (thresholds.length === 0) return 0;
    const bins = values.map(v => thresholds.filter(t => v > t).length);
    const binLabels = new Map<number, number[]>();
    bins.forEach((b, i) => {
      if (!binLabels.has(b)) binLabels.set(b, []);
      binLabels.get(b)!.push(labels[i]);
    });
    let infoGain = this._entropy(labels);
    for (const ls of binLabels.values()) {
      infoGain -= (ls.length / labels.length) * this._entropy(ls);
    }
    return infoGain;
  }

  private _mdlpRecursive(values: number[], labels: number[], thresholds: number[], start: number, end: number): void {
    if (end - start < 2) return;
    const slice = values.slice(start, end).map((v, i) => ({ v, l: labels[start + i] }));
    slice.sort((a, b) => a.v - b.v);
    const sortedV = slice.map(s => s.v);
    const sortedL = slice.map(s => s.l);
    let bestGain = 0, bestThreshold = NaN, bestIdx = -1;
    const parentEnt = this._entropy(sortedL);
    for (let i = 1; i < sortedV.length; i++) {
      if (sortedV[i] === sortedV[i - 1]) continue;
      const threshold = (sortedV[i] + sortedV[i - 1]) / 2;
      const left = sortedL.slice(0, i);
      const right = sortedL.slice(i);
      const gain = parentEnt - (left.length * this._entropy(left) + right.length * this._entropy(right)) / sortedL.length;
      if (gain > bestGain) { bestGain = gain; bestThreshold = threshold; bestIdx = i; }
    }
    if (bestIdx === -1) return;
    const delta = Math.log2(sortedL.length) / sortedL.length;
    const k = [...new Set(sortedL)].length;
    const k1 = [...new Set(sortedL.slice(0, bestIdx))].length;
    const k2 = [...new Set(sortedL.slice(bestIdx))].length;
    const criterion = (Math.log2(sortedL.length - 1) + delta * (k - k1 - k2)) / sortedL.length;
    if (bestGain > criterion) {
      thresholds.push(bestThreshold);
      this._mdlpRecursive(sortedV, sortedL, thresholds, 0, bestIdx);
      this._mdlpRecursive(sortedV, sortedL, thresholds, bestIdx, sortedV.length);
    }
  }

  private _covarianceMatrix(X: number[][]): number[][] {
    const n = X.length;
    if (n === 0) return [];
    const dim = X[0].length;
    const means = new Array(dim).fill(0);
    for (let i = 0; i < n; i++) for (let j = 0; j < dim; j++) means[j] += X[i][j] / n;
    const cov: number[][] = Array.from({ length: dim }, () => new Array(dim).fill(0));
    for (let i = 0; i < n; i++) {
      for (let a = 0; a < dim; a++) {
        for (let b = 0; b < dim; b++) {
          cov[a][b] += (X[i][a] - means[a]) * (X[i][b] - means[b]) / Math.max(1, n - 1);
        }
      }
    }
    return cov;
  }

  private _jacobiEigen(A: number[][]): { eigenvalues: number[]; eigenvectors: number[][] } {
    const n = A.length;
    if (n === 0) return { eigenvalues: [], eigenvectors: [] };
    const eigenvalues = [...A[0]];
    const eigenvectors: number[][] = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => i === j ? 1 : 0),
    );
    for (let iter = 0; iter < 50; iter++) {
      let maxOff = 0, p = 0, q = 1;
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          if (Math.abs(A[i][j]) > maxOff) { maxOff = Math.abs(A[i][j]); p = i; q = j; }
        }
      }
      if (maxOff < 1e-10) break;
      const app = A[p][p], aqq = A[q][q], apq = A[p][q];
      const theta = Math.atan2(2 * apq, aqq - app) / 2;
      const c = Math.cos(theta), s = Math.sin(theta);
      for (let i = 0; i < n; i++) {
        const tmp = A[i][p];
        A[i][p] = c * tmp + s * A[i][q];
        A[i][q] = -s * tmp + c * A[i][q];
      }
      for (let i = 0; i < n; i++) {
        const tmp = A[p][i];
        A[p][i] = c * tmp + s * A[q][i];
        A[q][i] = -s * tmp + c * A[q][i];
      }
      for (let i = 0; i < n; i++) {
        const tmp = eigenvectors[i][p];
        eigenvectors[i][p] = c * tmp + s * eigenvectors[i][q];
        eigenvectors[i][q] = -s * tmp + c * eigenvectors[i][q];
      }
      eigenvalues[p] = A[p][p];
      eigenvalues[q] = A[q][q];
    }
    return { eigenvalues, eigenvectors };
  }
}
