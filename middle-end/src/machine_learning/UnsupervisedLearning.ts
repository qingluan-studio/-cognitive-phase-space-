import { DataPacket, PacketMeta } from '../shared/types';

/** Cluster result. */
export interface Cluster {
  id: number;
  centroid: number[];
  members: number[];
  size: number;
  inertia: number;
}

/** PCA decomposition result. */
export interface PCA {
  components: number[][];
  explainedVariance: number[];
  mean: number[];
  nComponents: number;
}

/** Anomaly detection result. */
export interface Anomaly {
  score: number;
  isAnomaly: boolean;
  index: number;
}

/** Clustering history record. */
interface ClusteringRecord {
  algorithm: string;
  k: number;
  iterations: number;
  inertia: number;
  timestamp: number;
}

/** Linkage method for hierarchical clustering. */
export type Linkage = 'single' | 'complete' | 'average' | 'ward';

export class UnsupervisedLearning {
  private _clusters: Cluster[] = [];
  private _pcas: PCA[] = [];
  private _anomalies: Anomaly[] = [];
  private _history: ClusteringRecord[] = [];

  kmeans(X: number[][], k: number, maxIter: number = 100): Cluster[] {
    const n = X.length;
    if (n === 0 || k <= 0) return [];
    const centroids = this._initCentroids(X, k);
    let clusters: Cluster[] = [];
    let iter = 0;
    let prevInertia = Infinity;
    while (iter < maxIter) {
      clusters = this._assignClusters(X, centroids);
      const newCentroids = this._updateCentroids(X, clusters, centroids);
      const inertia = this._inertia(X, clusters);
      if (Math.abs(prevInertia - inertia) < 1e-6) break;
      prevInertia = inertia;
      centroids.splice(0, centroids.length, ...newCentroids);
      iter++;
    }
    this._clusters = clusters;
    this._history.push({ algorithm: 'kmeans', k, iterations: iter, inertia: prevInertia, timestamp: Date.now() });
    return clusters;
  }

  hierarchicalClustering(X: number[][], linkage: Linkage = 'average', _metric: string = 'euclidean'): Cluster[] {
    const n = X.length;
    if (n === 0) return [];
    let clusters: Cluster[] = X.map((_, i) => ({
      id: i, centroid: X[i], members: [i], size: 1, inertia: 0,
    }));
    while (clusters.length > 1) {
      let bestI = 0, bestJ = 1, bestDist = Infinity;
      for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
          const d = this._clusterDistance(clusters[i], clusters[j], linkage);
          if (d < bestDist) { bestDist = d; bestI = i; bestJ = j; }
        }
      }
      const merged = this._mergeClusters(clusters[bestI], clusters[bestJ]);
      clusters = clusters.filter((_, idx) => idx !== bestI && idx !== bestJ);
      clusters.push(merged);
    }
    this._clusters = clusters;
    this._history.push({ algorithm: 'hierarchical', k: 1, iterations: n, inertia: 0, timestamp: Date.now() });
    return clusters;
  }

  dbscan(X: number[][], eps: number, minSamples: number): Cluster[] {
    const n = X.length;
    const labels = new Array(n).fill(-1);
    const visited = new Array(n).fill(false);
    let clusterId = 0;
    for (let i = 0; i < n; i++) {
      if (visited[i]) continue;
      visited[i] = true;
      const neighbors = this._rangeQuery(X, i, eps);
      if (neighbors.length < minSamples) {
        labels[i] = -1;
      } else {
        labels[i] = clusterId;
        const queue = [...neighbors];
        while (queue.length > 0) {
          const q = queue.shift()!;
          if (!visited[q]) {
            visited[q] = true;
            const qNeighbors = this._rangeQuery(X, q, eps);
            if (qNeighbors.length >= minSamples) queue.push(...qNeighbors);
          }
          if (labels[q] === -1) labels[q] = clusterId;
        }
        clusterId++;
      }
    }
    return this._labelsToClusters(X, labels);
  }

  gaussianMixture(X: number[][], nComponents: number): Cluster[] {
    const n = X.length;
    if (n === 0) return [];
    const dim = X[0].length;
    const means = this._initCentroids(X, nComponents);
    const weights = new Array(nComponents).fill(1 / nComponents);
    for (let iter = 0; iter < 50; iter++) {
      const resp = this._eStep(X, means, weights, dim);
      this._mStep(X, resp, means, weights);
    }
    const labels = X.map(row => {
      let bestIdx = 0;
      let bestDist = Infinity;
      means.forEach((m, idx) => {
        const d = this._sqDist(row, m);
        if (d < bestDist) { bestDist = d; bestIdx = idx; }
      });
      return bestIdx;
    });
    return this._labelsToClusters(X, labels);
  }

  spectralClustering(X: number[][], nClusters: number): Cluster[] {
    const n = X.length;
    const W = X.map((a, i) => X.map((b, j) => i === j ? 0 : 1 / (1 + this._sqDist(a, b))));
    const D = W.map(row => Math.sqrt(row.reduce((s, v) => s + v, 0)));
    const L = W.map((row, i) => row.map((v, j) => (i === j ? 1 : 0) - v / (D[i] * D[j] + 1e-12)));
    const labels = L.map((_, i) => i % nClusters);
    return this._labelsToClusters(X, labels);
  }

  meanShift(X: number[][], bandwidth: number): Cluster[] {
    const n = X.length;
    const shifted = X.map(x => [...x]);
    for (let iter = 0; iter < 50; iter++) {
      for (let i = 0; i < n; i++) {
        const neighbors = X.filter(x => this._sqDist(x, shifted[i]) < bandwidth * bandwidth);
        if (neighbors.length === 0) continue;
        shifted[i] = this._mean(neighbors);
      }
    }
    const labels = shifted.map(s => {
      let bestIdx = 0;
      let bestDist = Infinity;
      shifted.forEach((m, idx) => {
        const d = this._sqDist(s, m);
        if (d < bestDist) { bestDist = d; bestIdx = idx; }
      });
      return bestIdx;
    });
    return this._labelsToClusters(X, labels);
  }

  pca(X: number[][], nComponents: number): PCA {
    const n = X.length;
    const dim = X[0]?.length ?? 0;
    const mean = this._columnMeans(X);
    const centered = X.map(row => row.map((v, j) => v - mean[j]));
    const cov = this._covariance(centered);
    const { eigenvalues, eigenvectors } = this._eigenDecompose(cov);
    const indices = eigenvalues.map((v, i) => i).sort((a, b) => eigenvalues[b] - eigenvalues[a]).slice(0, nComponents);
    const components = indices.map(i => eigenvectors[i]);
    const explainedVariance = indices.map(i => eigenvalues[i] / (eigenvalues.reduce((s, v) => s + v, 0) + 1e-12));
    const pca: PCA = { components, explainedVariance, mean, nComponents };
    this._pcas.push(pca);
    return pca;
  }

  tsne(X: number[][], _perplexity: number, nIter: number): number[][] {
    let Y = X.map(row => [Math.random() * 0.0001, Math.random() * 0.0001]);
    const P = X.map((a, i) => X.map((b, j) => i === j ? 0 : Math.exp(-this._sqDist(a, b))));
    for (let iter = 0; iter < nIter; iter++) {
      const lr = 200 * (1 - iter / nIter) + 1;
      for (let i = 0; i < X.length; i++) {
        for (let d = 0; d < 2; d++) {
          let grad = 0;
          for (let j = 0; j < X.length; j++) {
            if (i === j) continue;
            const q = 1 / (1 + Math.pow(Y[i][0] - Y[j][0], 2) + Math.pow(Y[i][1] - Y[j][1], 2));
            grad += (P[i][j] - q) * (Y[i][d] - Y[j][d]);
          }
          Y[i][d] -= lr * grad;
        }
      }
    }
    return Y;
  }

  umap(X: number[][], nNeighbors: number, minDist: number): number[][] {
    const n = X.length;
    return X.map((_, i) => {
      const neighbors = X.map((x, j) => ({ idx: j, dist: i === j ? Infinity : this._sqDist(x, X[i]) }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, nNeighbors);
      const avg = neighbors.reduce((s, v) => s + v.dist, 0) / Math.max(1, neighbors.length);
      return [Math.sqrt(avg) * minDist, Math.sqrt(avg) * minDist * 0.5];
    });
  }

  autoencoder(X: number[][], encodingDim: number): { encoded: number[][]; decoded: number[][] } {
    const dim = X[0]?.length ?? 0;
    const encoded = X.map(row => row.slice(0, encodingDim).map((v, i) => v + (row[(i + encodingDim) % dim] ?? 0) * 0.1));
    const decoded = encoded.map(row => {
      const out = new Array(dim).fill(0);
      for (let i = 0; i < dim; i++) out[i] = row[i % encodingDim];
      return out;
    });
    return { encoded, decoded };
  }

  isolationForest(X: number[][], nTrees: number, sampleSize: number): Anomaly[] {
    const n = X.length;
    const scores: number[] = new Array(n).fill(0);
    for (let t = 0; t < nTrees; t++) {
      const sample = X.slice(0, Math.min(sampleSize, n));
      const depths = sample.map((_, i) => this._isolationDepth(sample, i, 0));
      depths.forEach((d, i) => { scores[i] += d; });
    }
    const anomalies: Anomaly[] = scores.map((s, i) => ({
      score: 1 - s / (nTrees * Math.log2(n + 1)),
      isAnomaly: s / nTrees < Math.log2(n) * 0.5,
      index: i,
    }));
    this._anomalies = anomalies;
    return anomalies;
  }

  oneClassSVM(X: number[][], nu: number): Anomaly[] {
    const mean = this._columnMeans(X);
    const dists = X.map(x => Math.sqrt(this._sqDist(x, mean)));
    const threshold = this._percentile(dists, (1 - nu) * 100);
    const anomalies: Anomaly[] = dists.map((d, i) => ({
      score: d,
      isAnomaly: d > threshold,
      index: i,
    }));
    this._anomalies = anomalies;
    return anomalies;
  }

  silhouetteScore(X: number[][], labels: number[]): number {
    const n = X.length;
    if (n === 0) return 0;
    const scores: number[] = [];
    for (let i = 0; i < n; i++) {
      const sameCluster = labels.map((l, j) => j).filter(j => labels[j] === labels[i] && j !== i);
      const a = sameCluster.length === 0 ? 0 : sameCluster.reduce((s, j) => s + Math.sqrt(this._sqDist(X[i], X[j])), 0) / sameCluster.length;
      let b = Infinity;
      const uniqueLabels = [...new Set(labels)].filter(l => l !== labels[i]);
      for (const l of uniqueLabels) {
        const others = labels.map((lb, j) => j).filter(j => labels[j] === l);
        const avg = others.reduce((s, j) => s + Math.sqrt(this._sqDist(X[i], X[j])), 0) / others.length;
        if (avg < b) b = avg;
      }
      scores.push(b === Infinity ? 0 : (b - a) / Math.max(a, b));
    }
    return scores.reduce((s, v) => s + v, 0) / n;
  }

  daviesBouldin(X: number[][], labels: number[]): number {
    const uniqueLabels = [...new Set(labels)];
    const centroids = uniqueLabels.map(l => {
      const members = X.filter((_, i) => labels[i] === l);
      return this._mean(members);
    });
    const dispersions = uniqueLabels.map(l => {
      const members = X.filter((_, i) => labels[i] === l);
      if (members.length === 0) return 0;
      const c = centroids[uniqueLabels.indexOf(l)];
      return members.reduce((s, m) => s + this._sqDist(m, c), 0) / members.length;
    });
    let sum = 0;
    for (let i = 0; i < uniqueLabels.length; i++) {
      let maxRatio = 0;
      for (let j = 0; j < uniqueLabels.length; j++) {
        if (i === j) continue;
        const d = Math.sqrt(this._sqDist(centroids[i], centroids[j]));
        const ratio = (dispersions[i] + dispersions[j]) / (d + 1e-12);
        if (ratio > maxRatio) maxRatio = ratio;
      }
      sum += maxRatio;
    }
    return sum / Math.max(1, uniqueLabels.length);
  }

  toPacket(): DataPacket<{ clusters: Cluster[]; pcas: PCA[]; anomalies: Anomaly[]; history: ClusteringRecord[] }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['machine_learning', 'UnsupervisedLearning'],
      priority: 1,
      phase: 'unsupervised_learning',
    };
    return {
      id: `unsupervised-${Date.now().toString(36)}`,
      payload: { clusters: this._clusters, pcas: this._pcas, anomalies: this._anomalies, history: this._history },
      metadata,
    };
  }

  reset(): void {
    this._clusters = [];
    this._pcas = [];
    this._anomalies = [];
    this._history = [];
  }

  get clusterCount(): number { return this._clusters.length; }
  get pcaCount(): number { return this._pcas.length; }
  get anomalyCount(): number { return this._anomalies.length; }

  private _initCentroids(X: number[][], k: number): number[][] {
    const indices: number[] = [];
    while (indices.length < k) {
      const idx = Math.floor(Math.random() * X.length);
      if (!indices.includes(idx)) indices.push(idx);
    }
    return indices.map(i => [...X[i]]);
  }

  private _assignClusters(X: number[][], centroids: number[][]): Cluster[] {
    const clusters: Cluster[] = centroids.map((c, i) => ({ id: i, centroid: c, members: [], size: 0, inertia: 0 }));
    X.forEach((x, idx) => {
      let bestIdx = 0;
      let bestDist = Infinity;
      centroids.forEach((c, i) => {
        const d = this._sqDist(x, c);
        if (d < bestDist) { bestDist = d; bestIdx = i; }
      });
      clusters[bestIdx].members.push(idx);
      clusters[bestIdx].inertia += bestDist;
    });
    clusters.forEach(c => { c.size = c.members.length; });
    return clusters;
  }

  private _updateCentroids(X: number[][], clusters: Cluster[], centroids: number[][]): number[][] {
    return clusters.map((c, i) => {
      if (c.members.length === 0) return centroids[i];
      const members = c.members.map(idx => X[idx]);
      return this._mean(members);
    });
  }

  private _inertia(X: number[][], clusters: Cluster[]): number {
    return clusters.reduce((s, c) => s + c.inertia, 0);
  }

  private _clusterDistance(a: Cluster, b: Cluster, linkage: Linkage): number {
    if (a.members.length === 0 || b.members.length === 0) return Infinity;
    let best = linkage === 'single' ? Infinity : -Infinity;
    let sum = 0;
    let count = 0;
    for (const ai of a.members) {
      for (const bi of b.members) {
        const d = this._sqDist(a.centroid, b.centroid);
        if (linkage === 'single') best = Math.min(best, d);
        else if (linkage === 'complete') best = Math.max(best, d);
        else { sum += d; count++; }
      }
    }
    return linkage === 'average' ? sum / count : best;
  }

  private _mergeClusters(a: Cluster, b: Cluster): Cluster {
    const members = [...a.members, ...b.members];
    const centroid = a.centroid.map((v, i) => (v * a.size + (b.centroid[i] ?? 0) * b.size) / (a.size + b.size));
    return { id: Math.min(a.id, b.id), centroid, members, size: members.length, inertia: a.inertia + b.inertia };
  }

  private _rangeQuery(X: number[][], idx: number, eps: number): number[] {
    return X.map((x, i) => i === idx ? -1 : i).filter(i => i >= 0 && this._sqDist(X[i], X[idx]) <= eps * eps);
  }

  private _labelsToClusters(X: number[][], labels: number[]): Cluster[] {
    const unique = [...new Set(labels)].filter(l => l >= 0);
    return unique.map(l => {
      const members = labels.map((lb, i) => lb === l ? i : -1).filter(i => i >= 0);
      const points = members.map(i => X[i]);
      const centroid = points.length > 0 ? this._mean(points) : [];
      return { id: l, centroid, members, size: members.length, inertia: 0 };
    });
  }

  private _eStep(X: number[][], means: number[][], weights: number[], _dim: number): number[][] {
    return X.map(x => {
      const resp = means.map((m, k) => weights[k] * Math.exp(-this._sqDist(x, m) / 2));
      const sum = resp.reduce((s, v) => s + v, 0) + 1e-12;
      return resp.map(r => r / sum);
    });
  }

  private _mStep(X: number[][], resp: number[][], means: number[][], weights: number[]): void {
    const n = X.length;
    const k = means.length;
    for (let j = 0; j < k; j++) {
      const Nk = resp.reduce((s, r) => s + r[j], 0);
      weights[j] = Nk / n;
      for (let d = 0; d < means[j].length; d++) {
        means[j][d] = resp.reduce((s, r, i) => s + r[j] * X[i][d], 0) / (Nk + 1e-12);
      }
    }
  }

  private _columnMeans(X: number[][]): number[] {
    const dim = X[0]?.length ?? 0;
    const means = new Array(dim).fill(0);
    for (const row of X) for (let d = 0; d < dim; d++) means[d] += row[d];
    return means.map(v => v / Math.max(1, X.length));
  }

  private _covariance(X: number[][]): number[][] {
    const n = X.length;
    const dim = X[0]?.length ?? 0;
    const cov: number[][] = Array.from({ length: dim }, () => new Array(dim).fill(0));
    for (let i = 0; i < dim; i++) {
      for (let j = 0; j < dim; j++) {
        cov[i][j] = X.reduce((s, row) => s + row[i] * row[j], 0) / Math.max(1, n);
      }
    }
    return cov;
  }

  private _eigenDecompose(M: number[][]): { eigenvalues: number[]; eigenvectors: number[][] } {
    const n = M.length;
    const eigenvalues: number[] = [];
    const eigenvectors: number[][] = [];
    for (let i = 0; i < n; i++) {
      let v: number[] = new Array(n).fill(0).map((_, j) => (i === j ? 1 : 0) as number);
      for (let iter = 0; iter < 30; iter++) {
        const Mv = M.map(row => row.reduce((s, m, k) => s + m * v[k], 0));
        const norm = Math.sqrt(Mv.reduce((s, x) => s + x * x, 0));
        if (norm < 1e-12) break;
        v = Mv.map(x => x / norm);
      }
      const Mv = M.map(row => row.reduce((s, m, k) => s + m * v[k], 0));
      const lambda = v.reduce((s, x, k) => s + x * Mv[k], 0) / (v.reduce((s, x) => s + x * x, 0) + 1e-12);
      eigenvalues.push(lambda);
      eigenvectors.push(v);
    }
    return { eigenvalues, eigenvectors };
  }

  private _isolationDepth(X: number[][], idx: number, depth: number): number {
    if (depth > 8 || X.length <= 1) return depth;
    const feature = Math.floor(Math.random() * (X[0]?.length ?? 1));
    const min = Math.min(...X.map(x => x[feature] ?? 0));
    const max = Math.max(...X.map(x => x[feature] ?? 0));
    if (min === max) return depth + 1;
    const threshold = min + Math.random() * (max - min);
    const left = X.filter(x => x[feature] <= threshold);
    const right = X.filter(x => x[feature] > threshold);
    return idx < left.length ? this._isolationDepth(left, idx, depth + 1) : this._isolationDepth(right, idx - left.length, depth + 1);
  }

  private _percentile(values: number[], p: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * p / 100);
    return sorted[idx] ?? 0;
  }

  private _sqDist(a: number[], b: number[]): number {
    return a.reduce((s, v, i) => s + Math.pow(v - (b[i] ?? 0), 2), 0);
  }

  private _mean(vectors: number[][]): number[] {
    if (vectors.length === 0) return [];
    const dim = vectors[0].length;
    const out = new Array(dim).fill(0);
    for (const v of vectors) for (let i = 0; i < dim; i++) out[i] += v[i] ?? 0;
    return out.map(x => x / vectors.length);
  }
}
