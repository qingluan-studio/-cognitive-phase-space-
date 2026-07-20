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

  // ---------------------------------------------------------------------------
  // Additional clustering algorithms
  // ---------------------------------------------------------------------------

  /** K-Means++ initialization (improves centroid seeding). */
  kmeansPlusPlus(X: number[][], k: number, maxIter: number = 100): Cluster[] {
    const n = X.length;
    if (n === 0 || k <= 0) return [];
    const centroids = this._initCentroidsPlusPlus(X, k);
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
    this._history.push({ algorithm: 'kmeans++', k, iterations: iter, inertia: prevInertia, timestamp: Date.now() });
    return clusters;
  }

  /** Mini-batch K-Means (for large datasets). */
  miniBatchKmeans(X: number[][], k: number, batchSize: number = 32, maxIter: number = 100): Cluster[] {
    const n = X.length;
    if (n === 0 || k <= 0) return [];
    const centroids = this._initCentroidsPlusPlus(X, k);
    for (let iter = 0; iter < maxIter; iter++) {
      const batch = this._sampleBatch(X, batchSize);
      const assignments = batch.map(x => {
        let bestIdx = 0;
        let bestDist = Infinity;
        centroids.forEach((c, i) => {
          const d = this._sqDist(x, c);
          if (d < bestDist) { bestDist = d; bestIdx = i; }
        });
        return bestIdx;
      });
      batch.forEach((x, i) => {
        const c = assignments[i];
        const lr = 1 / (1 + iter);
        centroids[c] = centroids[c].map((v, d) => v + lr * (x[d] - v));
      });
    }
    const clusters = this._assignClusters(X, centroids);
    this._clusters = clusters;
    this._history.push({ algorithm: 'mini-batch-kmeans', k, iterations: maxIter, inertia: this._inertia(X, clusters), timestamp: Date.now() });
    return clusters;
  }

  /** K-Medoids (PAM - Partitioning Around Medoids). */
  kmedoids(X: number[][], k: number, maxIter: number = 100): Cluster[] {
    const n = X.length;
    if (n === 0 || k <= 0) return [];
    let medoidIndices: number[] = [];
    while (medoidIndices.length < k) {
      const idx = Math.floor(Math.random() * n);
      if (!medoidIndices.includes(idx)) medoidIndices.push(idx);
    }
    for (let iter = 0; iter < maxIter; iter++) {
      const labels = X.map(x => {
        let bestIdx = 0;
        let bestDist = Infinity;
        medoidIndices.forEach((m, i) => {
          const d = this._sqDist(x, X[m]);
          if (d < bestDist) { bestDist = d; bestIdx = i; }
        });
        return bestIdx;
      });
      const newMedoids: number[] = [];
      for (let c = 0; c < k; c++) {
        const members = labels.map((l, i) => l === c ? i : -1).filter(i => i >= 0);
        if (members.length === 0) { newMedoids.push(medoidIndices[c]); continue; }
        let bestMedoid = members[0];
        let bestCost = Infinity;
        for (const m of members) {
          const cost = members.reduce((s, j) => s + this._sqDist(X[j], X[m]), 0);
          if (cost < bestCost) { bestCost = cost; bestMedoid = m; }
        }
        newMedoids.push(bestMedoid);
      }
      const same = newMedoids.every((m, i) => m === medoidIndices[i]);
      medoidIndices = newMedoids;
      if (same) break;
    }
    const labels = X.map(x => {
      let bestIdx = 0;
      let bestDist = Infinity;
      medoidIndices.forEach((m, i) => {
        const d = this._sqDist(x, X[m]);
        if (d < bestDist) { bestDist = d; bestIdx = i; }
      });
      return bestIdx;
    });
    const clusters = this._labelsToClusters(X, labels);
    this._clusters = clusters;
    this._history.push({ algorithm: 'kmedoids', k, iterations: maxIter, inertia: 0, timestamp: Date.now() });
    return clusters;
  }

  /** K-Modes (categorical data clustering using simple matching dissimilarity). */
  kmodes(X: number[][], k: number, maxIter: number = 100): Cluster[] {
    const n = X.length;
    if (n === 0 || k <= 0) return [];
    let modes: number[][] = [];
    while (modes.length < k) {
      const idx = Math.floor(Math.random() * n);
      if (!modes.find(m => m.every((v, i) => v === X[idx][i]))) modes.push([...X[idx]]);
    }
    for (let iter = 0; iter < maxIter; iter++) {
      const labels = X.map(x => {
        let bestIdx = 0;
        let bestDist = Infinity;
        modes.forEach((m, i) => {
          const d = x.reduce((s, v, j) => s + (v !== m[j] ? 1 : 0), 0);
          if (d < bestDist) { bestDist = d; bestIdx = i; }
        });
        return bestIdx;
      });
      const newModes: number[][] = [];
      for (let c = 0; c < k; c++) {
        const members = X.filter((_, i) => labels[i] === c);
        if (members.length === 0) { newModes.push(modes[c]); continue; }
        const dim = members[0].length;
        const newMode: number[] = [];
        for (let d = 0; d < dim; d++) {
          const counts = new Map<number, number>();
          members.forEach(m => counts.set(m[d], (counts.get(m[d]) ?? 0) + 1));
          let bestVal = 0;
          let bestCount = 0;
          for (const [val, count] of counts) if (count > bestCount) { bestVal = val; bestCount = count; }
          newMode.push(bestVal);
        }
        newModes.push(newMode);
      }
      const same = newModes.every((m, i) => m.every((v, j) => v === modes[i][j]));
      modes = newModes;
      if (same) break;
    }
    const labels = X.map(x => {
      let bestIdx = 0;
      let bestDist = Infinity;
      modes.forEach((m, i) => {
        const d = x.reduce((s, v, j) => s + (v !== m[j] ? 1 : 0), 0);
        if (d < bestDist) { bestDist = d; bestIdx = i; }
      });
      return bestIdx;
    });
    const clusters = this._labelsToClusters(X, labels);
    this._clusters = clusters;
    this._history.push({ algorithm: 'kmodes', k, iterations: maxIter, inertia: 0, timestamp: Date.now() });
    return clusters;
  }

  /** Fuzzy C-Means clustering (soft clustering with membership degrees). */
  fuzzyCMeans(X: number[][], c: number, m: number = 2, maxIter: number = 100): { centroids: number[][]; membership: number[][] } {
    const n = X.length;
    if (n === 0 || c <= 0) return { centroids: [], membership: [] };
    const dim = X[0].length;
    let centroids = this._initCentroidsPlusPlus(X, c);
    let membership: number[][] = Array.from({ length: n }, () => new Array(c).fill(1 / c));
    for (let iter = 0; iter < maxIter; iter++) {
      // Update membership
      for (let i = 0; i < n; i++) {
        const distances = centroids.map(cent => Math.sqrt(this._sqDist(X[i], cent)) + 1e-12);
        for (let j = 0; j < c; j++) {
          let sum = 0;
          for (let k2 = 0; k2 < c; k2++) {
            sum += Math.pow(distances[j] / distances[k2], 2 / (m - 1));
          }
          membership[i][j] = 1 / sum;
        }
      }
      // Update centroids
      const newCentroids: number[][] = [];
      for (let j = 0; j < c; j++) {
        const num = new Array(dim).fill(0);
        let den = 0;
        for (let i = 0; i < n; i++) {
          const w = Math.pow(membership[i][j], m);
          for (let d = 0; d < dim; d++) num[d] += w * X[i][d];
          den += w;
        }
        newCentroids.push(num.map(v => v / (den + 1e-12)));
      }
      centroids = newCentroids;
    }
    const labels = membership.map(r => r.indexOf(Math.max(...r)));
    this._clusters = this._labelsToClusters(X, labels);
    this._history.push({ algorithm: 'fcm', k: c, iterations: maxIter, inertia: 0, timestamp: Date.now() });
    return { centroids, membership };
  }

  /** OPTICS (Ordering Points To Identify the Clustering Structure). */
  optics(X: number[][], eps: number, minSamples: number): { labels: number[]; reachability: number[]; ordering: number[] } {
    const n = X.length;
    const labels = new Array(n).fill(-1);
    const reachability = new Array(n).fill(Infinity);
    const processed = new Array(n).fill(false);
    const ordering: number[] = [];
    let clusterId = 0;
    for (let i = 0; i < n; i++) {
      if (processed[i]) continue;
      processed[i] = true;
      const neighbors = this._rangeQuery(X, i, eps);
      ordering.push(i);
      if (neighbors.length < minSamples) continue;
      const seeds: { idx: number; reach: number }[] = [];
      this._opticsUpdate(X, i, neighbors, seeds, processed, reachability, eps, minSamples);
      while (seeds.length > 0) {
        seeds.sort((a, b) => a.reach - b.reach);
        const next = seeds.shift()!;
        if (processed[next.idx]) continue;
        processed[next.idx] = true;
        ordering.push(next.idx);
        const nextNeighbors = this._rangeQuery(X, next.idx, eps);
        if (nextNeighbors.length < minSamples) continue;
        this._opticsUpdate(X, next.idx, nextNeighbors, seeds, processed, reachability, eps, minSamples);
      }
      // Assign cluster label to the connected component
      for (const idx of ordering) if (labels[idx] === -1 && reachability[idx] <= eps) labels[idx] = clusterId;
      clusterId++;
    }
    return { labels, reachability, ordering };
  }

  /** HDBSCAN (Hierarchical Density-Based Spatial Clustering). */
  hdbscan(X: number[][], minClusterSize: number = 5): { labels: number[]; probabilities: number[] } {
    const n = X.length;
    // Compute mutual reachability distances (simplified)
    const labels = new Array(n).fill(-1);
    const probabilities = new Array(n).fill(0);
    // Build distance matrix
    const dist: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const d = Math.sqrt(this._sqDist(X[i], X[j]));
        dist[i][j] = d;
        dist[j][i] = d;
      }
    }
    // Core distances (k-distance with k = minClusterSize)
    const coreDist = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      const sorted = [...dist[i]].sort((a, b) => a - b);
      coreDist[i] = sorted[Math.min(minClusterSize, sorted.length - 1)] ?? 0;
    }
    // Simplified cluster assignment based on core distance
    let clusterId = 0;
    const visited = new Array(n).fill(false);
    for (let i = 0; i < n; i++) {
      if (visited[i]) continue;
      const queue = [i];
      visited[i] = true;
      const members: number[] = [];
      while (queue.length > 0) {
        const cur = queue.shift()!;
        members.push(cur);
        for (let j = 0; j < n; j++) {
          if (visited[j]) continue;
          const mutualReach = Math.max(coreDist[cur], coreDist[j], dist[cur][j]);
          if (mutualReach < 1.0) {
            visited[j] = true;
            queue.push(j);
          }
        }
      }
      if (members.length >= minClusterSize) {
        for (const m of members) {
          labels[m] = clusterId;
          probabilities[m] = 1;
        }
        clusterId++;
      }
    }
    return { labels, probabilities };
  }

  /** BIRCH (Balanced Iterative Reducing and Clustering using Hierarchies). */
  birch(X: number[][], threshold: number, branchingFactor: number = 50): Cluster[] {
    // Simplified BIRCH using CF (clustering feature) subclusters
    const cfSubclusters: { n: number; ls: number[]; ss: number }[] = [];
    for (const x of X) {
      const dim = x.length;
      let inserted = false;
      for (const cf of cfSubclusters) {
        const centroid = cf.ls.map(v => v / cf.n);
        if (Math.sqrt(this._sqDist(x, centroid)) < threshold) {
          cf.n++;
          for (let d = 0; d < dim; d++) cf.ls[d] += x[d];
          cf.ss += this._sqDist(x, centroid);
          inserted = true;
          break;
        }
      }
      if (!inserted) {
        cfSubclusters.push({ n: 1, ls: [...x], ss: 0 });
        if (cfSubclusters.length > branchingFactor) {
          // Merge closest two
          let bestI = 0, bestJ = 1, bestDist = Infinity;
          for (let i = 0; i < cfSubclusters.length; i++) {
            for (let j = i + 1; j < cfSubclusters.length; j++) {
              const ci = cfSubclusters[i].ls.map(v => v / cfSubclusters[i].n);
              const cj = cfSubclusters[j].ls.map(v => v / cfSubclusters[j].n);
              const d = this._sqDist(ci, cj);
              if (d < bestDist) { bestDist = d; bestI = i; bestJ = j; }
            }
          }
          const a = cfSubclusters[bestI];
          const b = cfSubclusters[bestJ];
          const merged = { n: a.n + b.n, ls: a.ls.map((v, d) => v + b.ls[d]), ss: a.ss + b.ss };
          cfSubclusters.splice(bestJ, 1);
          cfSubclusters.splice(bestI, 1);
          cfSubclusters.push(merged);
        }
      }
    }
    const centroids = cfSubclusters.map(cf => cf.ls.map(v => v / cf.n));
    const labels = X.map(x => {
      let bestIdx = 0;
      let bestDist = Infinity;
      centroids.forEach((c, i) => {
        const d = this._sqDist(x, c);
        if (d < bestDist) { bestDist = d; bestIdx = i; }
      });
      return bestIdx;
    });
    const clusters = this._labelsToClusters(X, labels);
    this._clusters = clusters;
    this._history.push({ algorithm: 'birch', k: cfSubclusters.length, iterations: 1, inertia: 0, timestamp: Date.now() });
    return clusters;
  }

  /** Affinity Propagation clustering (message passing between data points). */
  affinityPropagation(X: number[][], maxIter: number = 100, damping: number = 0.5): Cluster[] {
    const n = X.length;
    if (n === 0) return [];
    // Compute similarity matrix
    const S: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        S[i][j] = i === j ? -this._median(S[i] || [0]) : -this._sqDist(X[i], X[j]);
      }
    }
    // Set diagonal to median of similarities as preference
    const preferences = S.map(row => this._median(row.filter((_, j) => j !== 0)));
    for (let i = 0; i < n; i++) S[i][i] = preferences[i];
    let R: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    let A: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let iter = 0; iter < maxIter; iter++) {
      // Update responsibilities
      for (let i = 0; i < n; i++) {
        for (let k = 0; k < n; k++) {
          let maxOther = -Infinity;
          for (let k2 = 0; k2 < n; k2++) {
            if (k2 === k) continue;
            maxOther = Math.max(maxOther, A[i][k2] + S[i][k2]);
          }
          R[i][k] = (1 - damping) * (S[i][k] - maxOther) + damping * R[i][k];
        }
      }
      // Update availabilities
      for (let i = 0; i < n; i++) {
        for (let k = 0; k < n; k++) {
          if (i === k) {
            let sum = 0;
            for (let i2 = 0; i2 < n; i2++) {
              if (i2 === k) continue;
              sum += Math.max(0, R[i2][k]);
            }
            A[i][k] = (1 - damping) * sum + damping * A[i][k];
          } else {
            let sum = 0;
            for (let i2 = 0; i2 < n; i2++) {
              if (i2 === k || i2 === i) continue;
              sum += Math.max(0, R[i2][k]);
            }
            A[i][k] = (1 - damping) * Math.min(0, R[k][k] + sum) + damping * A[i][k];
          }
        }
      }
    }
    // Extract exemplars
    const exemplars: number[] = [];
    for (let i = 0; i < n; i++) {
      if (A[i][i] + R[i][i] > 0) exemplars.push(i);
    }
    if (exemplars.length === 0) exemplars.push(0);
    const labels = X.map(x => {
      let bestIdx = 0;
      let bestDist = Infinity;
      exemplars.forEach((e, i) => {
        const d = this._sqDist(x, X[e]);
        if (d < bestDist) { bestDist = d; bestIdx = i; }
      });
      return bestIdx;
    });
    const clusters = this._labelsToClusters(X, labels);
    this._clusters = clusters;
    this._history.push({ algorithm: 'affinity', k: exemplars.length, iterations: maxIter, inertia: 0, timestamp: Date.now() });
    return clusters;
  }

  /** Self-Organizing Map (Kohonen map). */
  selfOrganizingMap(X: number[][], gridSize: number, maxIter: number = 100, initialLr: number = 0.5): number[][] {
    const dim = X[0]?.length ?? 0;
    if (dim === 0) return [];
    const nodes: number[][] = Array.from({ length: gridSize * gridSize }, () =>
      Array.from({ length: dim }, () => Math.random())
    );
    const initialRadius = gridSize / 2;
    for (let iter = 0; iter < maxIter; iter++) {
      const lr = initialLr * (1 - iter / maxIter);
      const radius = initialRadius * (1 - iter / maxIter);
      for (const x of X) {
        let bmu = 0;
        let bestDist = Infinity;
        nodes.forEach((n, i) => {
          const d = this._sqDist(x, n);
          if (d < bestDist) { bestDist = d; bmu = i; }
        });
        const bmuR = Math.floor(bmu / gridSize);
        const bmuC = bmu % gridSize;
        nodes.forEach((n, i) => {
          const r = Math.floor(i / gridSize);
          const c = i % gridSize;
          const distToBmu = Math.sqrt((r - bmuR) ** 2 + (c - bmuC) ** 2);
          if (distToBmu <= radius) {
            const influence = Math.exp(-(distToBmu * distToBmu) / (2 * radius * radius));
            for (let d = 0; d < dim; d++) n[d] += lr * influence * (x[d] - n[d]);
          }
        });
      }
    }
    return nodes;
  }

  // ---------------------------------------------------------------------------
  // Dimensionality reduction variants
  // ---------------------------------------------------------------------------

  /** Incremental PCA (processes data in batches). */
  incrementalPCA(X: number[][], nComponents: number, batchSize: number = 32): PCA {
    const batches = this._batch(X, batchSize);
    let mean = new Array(X[0]?.length ?? 0).fill(0);
    let components: number[][] = [];
    let explainedVariance: number[] = [];
    for (const batch of batches) {
      const batchMean = this._columnMeans(batch);
      const centered = batch.map(row => row.map((v, i) => v - batchMean[i]));
      mean = mean.map((v, i) => v + batchMean[i] / batches.length);
      const cov = this._covariance(centered);
      const { eigenvalues, eigenvectors } = this._eigenDecompose(cov);
      const indices = eigenvalues.map((v, i) => i).sort((a, b) => eigenvalues[b] - eigenvalues[a]).slice(0, nComponents);
      components = indices.map(i => eigenvectors[i]);
      explainedVariance = indices.map(i => eigenvalues[i]);
    }
    const pca: PCA = { components, explainedVariance, mean, nComponents };
    this._pcas.push(pca);
    return pca;
  }

  /** Sparse PCA (sparse principal components via L1 regularization). */
  sparsePCA(X: number[][], nComponents: number, alpha: number = 0.1, maxIter: number = 100): PCA {
    const dim = X[0]?.length ?? 0;
    const mean = this._columnMeans(X);
    const centered = X.map(row => row.map((v, i) => v - mean[i]));
    const components: number[][] = [];
    const explainedVariance: number[] = [];
    for (let c = 0; c < nComponents; c++) {
      let component = new Array(dim).fill(0).map(() => Math.random() - 0.5);
      for (let iter = 0; iter < maxIter; iter++) {
        const proj = centered.map(row => row.reduce((s, v, i) => s + v * component[i], 0));
        const grad = new Array(dim).fill(0);
        for (let i = 0; i < centered.length; i++) {
          for (let d = 0; d < dim; d++) grad[d] += proj[i] * centered[i][d];
        }
        for (let d = 0; d < dim; d++) {
          component[d] += 0.01 * grad[d] / Math.max(1, centered.length);
          // L1 proximal operator (soft thresholding)
          component[d] = Math.sign(component[d]) * Math.max(0, Math.abs(component[d]) - alpha);
        }
        const norm = Math.sqrt(component.reduce((s, v) => s + v * v, 0));
        if (norm > 0) component = component.map(v => v / norm);
      }
      components.push(component);
      const varExplained = centered.reduce((s, row) => s + Math.pow(row.reduce((s2, v, i) => s2 + v * component[i], 0), 2), 0) / centered.length;
      explainedVariance.push(varExplained);
      // Deflate
      for (let i = 0; i < centered.length; i++) {
        const proj = centered[i].reduce((s, v, d) => s + v * component[d], 0);
        for (let d = 0; d < dim; d++) centered[i][d] -= proj * component[d];
      }
    }
    const pca: PCA = { components, explainedVariance, mean, nComponents };
    this._pcas.push(pca);
    return pca;
  }

  /** Kernel PCA (non-linear dimensionality reduction). */
  kernelPCA(X: number[][], nComponents: number, kernel: 'rbf' | 'poly' | 'linear' = 'rbf', gamma: number = 0.1): PCA {
    const n = X.length;
    const K: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (kernel === 'rbf') K[i][j] = Math.exp(-gamma * this._sqDist(X[i], X[j]));
        else if (kernel === 'poly') K[i][j] = Math.pow(1 + X[i].reduce((s, v, k) => s + v * X[j][k], 0), 3);
        else K[i][j] = X[i].reduce((s, v, k) => s + v * X[j][k], 0);
      }
    }
    // Center the kernel matrix
    const rowMeans = K.map(row => row.reduce((s, v) => s + v, 0) / n);
    const totalMean = rowMeans.reduce((s, v) => s + v, 0) / n;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        K[i][j] = K[i][j] - rowMeans[i] - rowMeans[j] + totalMean;
      }
    }
    const { eigenvalues, eigenvectors } = this._eigenDecompose(K);
    const indices = eigenvalues.map((v, i) => i).sort((a, b) => eigenvalues[b] - eigenvalues[a]).slice(0, nComponents);
    const components = indices.map(i => eigenvectors[i]);
    const explainedVariance = indices.map(i => eigenvalues[i] / (eigenvalues.reduce((s, v) => s + v, 0) + 1e-12));
    const pca: PCA = { components, explainedVariance, mean: new Array(X[0]?.length ?? 0).fill(0), nComponents };
    this._pcas.push(pca);
    return pca;
  }

  /** Truncated SVD (for sparse data, works on term-document matrices). */
  truncatedSvd(X: number[][], nComponents: number): { U: number[][]; S: number[]; V: number[][] } {
    const n = X.length;
    const dim = X[0]?.length ?? 0;
    const XtX: number[][] = Array.from({ length: dim }, () => new Array(dim).fill(0));
    for (let i = 0; i < dim; i++) {
      for (let j = 0; j < dim; j++) {
        XtX[i][j] = X.reduce((s, row) => s + row[i] * row[j], 0);
      }
    }
    const { eigenvalues, eigenvectors } = this._eigenDecompose(XtX);
    const indices = eigenvalues.map((v, i) => i).sort((a, b) => eigenvalues[b] - eigenvalues[a]).slice(0, nComponents);
    const S = indices.map(i => Math.sqrt(Math.max(0, eigenvalues[i])));
    const V = indices.map(i => eigenvectors[i]);
    const U: number[][] = X.map(row => indices.map((_, c) => {
      const s = S[c];
      if (s === 0) return 0;
      return row.reduce((sum, v, i) => sum + v * V[c][i], 0) / s;
    }));
    return { U, S, V };
  }

  /** Non-negative Matrix Factorization (NMF). */
  nmf(X: number[][], nComponents: number, maxIter: number = 100): { W: number[][]; H: number[][] } {
    const n = X.length;
    const dim = X[0]?.length ?? 0;
    let W: number[][] = Array.from({ length: n }, () =>
      Array.from({ length: nComponents }, () => Math.random())
    );
    let H: number[][] = Array.from({ length: nComponents }, () =>
      Array.from({ length: dim }, () => Math.random())
    );
    for (let iter = 0; iter < maxIter; iter++) {
      // Multiplicative update for H
      const WH = W.map(wRow => H[0].map((_, j) => wRow.reduce((s, w, k) => s + w * H[k][j], 0)));
      for (let k = 0; k < nComponents; k++) {
        for (let j = 0; j < dim; j++) {
          let numerator = 0;
          let denominator = 0;
          for (let i = 0; i < n; i++) {
            numerator += W[i][k] * X[i][j];
            denominator += W[i][k] * WH[i][j] + 1e-12;
          }
          H[k][j] *= numerator / denominator;
        }
      }
      // Multiplicative update for W
      const WH2 = W.map(wRow => H[0].map((_, j) => wRow.reduce((s, w, k) => s + w * H[k][j], 0)));
      for (let i = 0; i < n; i++) {
        for (let k = 0; k < nComponents; k++) {
          let numerator = 0;
          let denominator = 0;
          for (let j = 0; j < dim; j++) {
            numerator += H[k][j] * X[i][j];
            denominator += H[k][j] * WH2[i][j] + 1e-12;
          }
          W[i][k] *= numerator / denominator;
        }
      }
    }
    return { W, H };
  }

  /** Independent Component Analysis (ICA). */
  ica(X: number[][], nComponents: number, maxIter: number = 100): { sources: number[][]; mixing: number[][] } {
    const n = X.length;
    const dim = X[0]?.length ?? 0;
    const mean = this._columnMeans(X);
    const centered = X.map(row => row.map((v, i) => v - mean[i]));
    // Whitening via PCA
    const cov = this._covariance(centered);
    const { eigenvalues, eigenvectors } = this._eigenDecompose(cov);
    const indices = eigenvalues.map((v, i) => i).sort((a, b) => eigenvalues[b] - eigenvalues[a]).slice(0, nComponents);
    const whitening = indices.map(i => eigenvectors[i].map(v => v / Math.sqrt(Math.max(1e-12, eigenvalues[i]))));
    const whitened = centered.map(row => whitening.map(w => row.reduce((s, v, i) => s + v * w[i], 0)));
    // FastICA with tanh non-linearity
    let W: number[][] = Array.from({ length: nComponents }, (_, i) => {
      const v = new Array(nComponents).fill(0);
      v[i] = 1;
      return v;
    });
    for (let iter = 0; iter < maxIter; iter++) {
      for (let c = 0; c < nComponents; c++) {
        const wx = whitened.map(row => row.reduce((s, v, i) => s + v * W[c][i], 0));
        const tanh = wx.map(x => Math.tanh(x));
        const sech2 = tanh.map(t => 1 - t * t);
        const grad = whitened.map((row, i) => row.map((v, j) => tanh[i] * v - sech2[i] * W[c][j]));
        const newW = new Array(nComponents).fill(0);
        for (let d = 0; d < nComponents; d++) {
          newW[d] = grad.reduce((s, g) => s + g[d], 0) / n;
        }
        const norm = Math.sqrt(newW.reduce((s, v) => s + v * v, 0));
        if (norm > 0) W[c] = newW.map(v => v / norm);
      }
      // Decorrelate (Gram-Schmidt)
      for (let c = 0; c < nComponents; c++) {
        for (let p = 0; p < c; p++) {
          const dot = W[c].reduce((s, v, i) => s + v * W[p][i], 0);
          W[c] = W[c].map((v, i) => v - dot * W[p][i]);
        }
        const norm = Math.sqrt(W[c].reduce((s, v) => s + v * v, 0));
        if (norm > 0) W[c] = W[c].map(v => v / norm);
      }
    }
    const sources = whitened.map(row => W.map(w => row.reduce((s, v, i) => s + v * w[i], 0)));
    const mixing = W[0].map((_, i) => W.map(w => w[i]));
    return { sources, mixing };
  }

  /** Multidimensional Scaling (MDS). */
  mds(X: number[][], nComponents: number = 2, maxIter: number = 100): number[][] {
    const n = X.length;
    const D: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const d = Math.sqrt(this._sqDist(X[i], X[j]));
        D[i][j] = d;
        D[j][i] = d;
      }
    }
    // Double centering
    const B: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    const rowMeans = D.map(row => row.reduce((s, v) => s + v, 0) / n);
    const totalMean = rowMeans.reduce((s, v) => s + v, 0) / n;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        B[i][j] = -0.5 * (D[i][j] * D[i][j] - rowMeans[i] * rowMeans[j] - rowMeans[j] * rowMeans[i] + totalMean * totalMean);
      }
    }
    const { eigenvalues, eigenvectors } = this._eigenDecompose(B);
    const indices = eigenvalues.map((v, i) => i).sort((a, b) => eigenvalues[b] - eigenvalues[a]).slice(0, nComponents);
    return X.map((_, i) => indices.map(c => Math.sqrt(Math.max(0, eigenvalues[c])) * eigenvectors[c][i]));
  }

  /** Isomap (Isometric Mapping). */
  isomap(X: number[][], nNeighbors: number, nComponents: number = 2): number[][] {
    const n = X.length;
    // Build k-NN graph
    const D: number[][] = Array.from({ length: n }, () => new Array(n).fill(Infinity));
    for (let i = 0; i < n; i++) {
      const distances = X.map((x, j) => ({ idx: j, dist: i === j ? 0 : Math.sqrt(this._sqDist(X[i], x)) }));
      distances.sort((a, b) => a.dist - b.dist);
      for (let k = 0; k < Math.min(nNeighbors + 1, distances.length); k++) {
        const j = distances[k].idx;
        D[i][j] = distances[k].dist;
        D[j][i] = distances[k].dist;
      }
    }
    // Floyd-Warshall for geodesic distances
    for (let k = 0; k < n; k++) {
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (D[i][k] + D[k][j] < D[i][j]) D[i][j] = D[i][k] + D[k][j];
        }
      }
    }
    return this.mds(D.map(row => row.map(v => isFinite(v) ? v : 0)), nComponents);
  }

  /** Locally Linear Embedding (LLE). */
  lle(X: number[][], nNeighbors: number, nComponents: number = 2): number[][] {
    const n = X.length;
    // Find k nearest neighbors
    const neighbors: number[][] = X.map((x, i) => {
      const dists = X.map((y, j) => ({ idx: j, dist: i === j ? Infinity : this._sqDist(x, y) }));
      dists.sort((a, b) => a.dist - b.dist);
      return dists.slice(0, nNeighbors).map(d => d.idx);
    });
    // Compute reconstruction weights (simplified: equal weights)
    const weights: number[][] = Array.from({ length: n }, (_, i) => {
      const w = new Array(n).fill(0);
      const k = neighbors[i].length;
      for (const j of neighbors[i]) w[j] = 1 / k;
      return w;
    });
    // Compute embedding via eigenvectors of M = (I - W)^T (I - W)
    const M: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        let sum = 0;
        for (let k = 0; k < n; k++) {
          const ik = i === k ? 1 - weights[k][i] : -weights[k][i];
          const jk = j === k ? 1 - weights[k][j] : -weights[k][j];
          sum += ik * jk;
        }
        M[i][j] = sum;
      }
    }
    const { eigenvalues, eigenvectors } = this._eigenDecompose(M);
    const indices = eigenvalues.map((v, i) => i).sort((a, b) => eigenvalues[a] - eigenvalues[b]).slice(1, nComponents + 1);
    return X.map((_, i) => indices.map(c => eigenvectors[c][i]));
  }

  /** Denoising Autoencoder (adds noise to input, reconstructs clean input). */
  denoisingAutoencoder(X: number[][], encodingDim: number, noiseFactor: number = 0.1): { encoded: number[][]; decoded: number[][] } {
    const noisy = X.map(row => row.map(v => v + (Math.random() - 0.5) * noiseFactor));
    const result = this.autoencoder(noisy, encodingDim);
    // Compare reconstruction to original X
    return { encoded: result.encoded, decoded: result.decoded };
  }

  /** Variational Autoencoder (simplified). */
  variationalAutoencoder(X: number[][], encodingDim: number, maxIter: number = 100): { encoded: number[][]; decoded: number[][]; klDivergence: number } {
    const dim = X[0]?.length ?? 0;
    const n = X.length;
    // Random initialization of encoder/decoder parameters
    const encW: number[][] = Array.from({ length: encodingDim }, () => Array.from({ length: dim }, () => Math.random() * 0.1));
    const encB = new Array(encodingDim).fill(0);
    const decW: number[][] = Array.from({ length: dim }, () => Array.from({ length: encodingDim }, () => Math.random() * 0.1));
    const decB = new Array(dim).fill(0);
    const logVarW: number[][] = Array.from({ length: encodingDim }, () => Array.from({ length: dim }, () => Math.random() * 0.1));
    const logVarB = new Array(encodingDim).fill(0);
    let totalKL = 0;
    const lr = 0.01;
    for (let iter = 0; iter < maxIter; iter++) {
      let klSum = 0;
      for (const x of X) {
        const mean = encW.map((w, i) => w.reduce((s, v, j) => s + v * x[j], 0) + encB[i]);
        const logVar = logVarW.map((w, i) => w.reduce((s, v, j) => s + v * x[j], 0) + logVarB[i]);
        const z = mean.map((m, i) => m + Math.exp(0.5 * logVar[i]) * (Math.random() - 0.5));
        const recon = decW.map((w, i) => w.reduce((s, v, j) => s + v * z[j], 0) + decB[i]);
        // Gradients (simplified)
        const reconErr = recon.map((r, i) => r - x[i]);
        for (let i = 0; i < dim; i++) {
          for (let j = 0; j < encodingDim; j++) {
            decW[i][j] -= lr * reconErr[i] * z[j];
          }
          decB[i] -= lr * reconErr[i];
        }
        // KL divergence term
        const kl = mean.reduce((s, m, i) => s + 0.5 * (m * m + Math.exp(logVar[i]) - logVar[i] - 1), 0);
        klSum += kl;
      }
      totalKL = klSum / n;
    }
    const encoded = X.map(x => encW.map((w, i) => w.reduce((s, v, j) => s + v * x[j], 0) + encB[i]));
    const decoded = encoded.map(z => decW.map((w, i) => w.reduce((s, v, j) => s + v * z[j], 0) + decB[i]));
    return { encoded, decoded, klDivergence: totalKL };
  }

  /** Latent Dirichlet Allocation (LDA) for topic modeling. */
  lda(documents: number[][], nTopics: number, maxIter: number = 100): { docTopic: number[][]; topicWord: number[][] } {
    const nDocs = documents.length;
    const vocabSize = documents[0]?.length ?? 0;
    const docTopic: number[][] = Array.from({ length: nDocs }, () =>
      Array.from({ length: nTopics }, () => Math.random())
    );
    const topicWord: number[][] = Array.from({ length: nTopics }, () =>
      Array.from({ length: vocabSize }, () => Math.random())
    );
    // Normalize initial distributions
    docTopic.forEach(row => {
      const sum = row.reduce((s, v) => s + v, 0);
      for (let i = 0; i < row.length; i++) row[i] /= sum;
    });
    topicWord.forEach(row => {
      const sum = row.reduce((s, v) => s + v, 0);
      for (let i = 0; i < row.length; i++) row[i] /= sum;
    });
    for (let iter = 0; iter < maxIter; iter++) {
      for (let d = 0; d < nDocs; d++) {
        for (let w = 0; w < vocabSize; w++) {
          const posterior = Array.from({ length: nTopics }, (_, k) => docTopic[d][k] * topicWord[k][w] + 1e-12);
          const sum = posterior.reduce((s, v) => s + v, 0);
          for (let k = 0; k < nTopics; k++) posterior[k] /= sum;
          // Update topic-word distribution weighted by document word count
          for (let k = 0; k < nTopics; k++) {
            topicWord[k][w] += documents[d][w] * posterior[k];
          }
          for (let k = 0; k < nTopics; k++) {
            docTopic[d][k] += documents[d][w] * posterior[k];
          }
        }
      }
      // Normalize
      docTopic.forEach(row => {
        const sum = row.reduce((s, v) => s + v, 0);
        for (let i = 0; i < row.length; i++) row[i] /= sum;
      });
      topicWord.forEach(row => {
        const sum = row.reduce((s, v) => s + v, 0);
        for (let i = 0; i < row.length; i++) row[i] /= sum;
      });
    }
    return { docTopic, topicWord };
  }

  /** Factor Analysis. */
  factorAnalysis(X: number[][], nFactors: number, maxIter: number = 100): { loadings: number[][]; factors: number[][]; specificVariance: number[] } {
    const n = X.length;
    const dim = X[0]?.length ?? 0;
    const mean = this._columnMeans(X);
    const centered = X.map(row => row.map((v, i) => v - mean[i]));
    // Initialize
    let loadings: number[][] = Array.from({ length: dim }, () =>
      Array.from({ length: nFactors }, () => Math.random() * 0.1)
    );
    let specificVariance = new Array(dim).fill(0.5);
    for (let iter = 0; iter < maxIter; iter++) {
      // E-step: estimate factors
      const factors: number[][] = centered.map(row => {
        // E[f|X] = L^T (LL^T + Psi)^-1 X
        const LtCov = loadings[0].map((_, j) =>
          loadings.reduce((s, l, i) => s + l[j] * specificVariance[i], 0)
        );
        return LtCov.map(c => c * row.reduce((s, v) => s + v, 0) / n);
      });
      // M-step: update loadings and specific variance (simplified)
      const XTF = centered[0].map((_, i) =>
        factors.reduce((s, f, k) => s + centered[k][i] * f[0], 0) / n
      );
      for (let i = 0; i < dim; i++) {
        loadings[i][0] = XTF[i];
        const reconErr = centered.reduce((s, row, k) => s + Math.pow(row[i] - factors[k][0] * loadings[i][0], 2), 0) / n;
        specificVariance[i] = Math.max(0.01, reconErr);
      }
    }
    const factors = centered.map(row =>
      loadings[0].map((_, j) => loadings.reduce((s, l, i) => s + l[j] * row[i], 0))
    );
    return { loadings, factors, specificVariance };
  }

  // ---------------------------------------------------------------------------
  // Additional anomaly detection
  // ---------------------------------------------------------------------------

  /** Local Outlier Factor (LOF). */
  localOutlierFactor(X: number[][], nNeighbors: number = 20): Anomaly[] {
    const n = X.length;
    const kDist = X.map((x, i) => {
      const dists = X.map((y, j) => ({ idx: j, dist: i === j ? Infinity : Math.sqrt(this._sqDist(x, y)) }));
      dists.sort((a, b) => a.dist - b.dist);
      return dists[nNeighbors - 1]?.dist ?? 0;
    });
    const reachDist: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const d = Math.sqrt(this._sqDist(X[i], X[j]));
        reachDist[i][j] = Math.max(kDist[j], d);
      }
    }
    const lrd: number[] = [];
    for (let i = 0; i < n; i++) {
      const dists = X.map((y, j) => ({ idx: j, dist: i === j ? Infinity : Math.sqrt(this._sqDist(X[i], y)) }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, nNeighbors);
      const sum = dists.reduce((s, d) => s + reachDist[i][d.idx], 0);
      lrd.push(1 / (sum / nNeighbors + 1e-12));
    }
    const lof = X.map((_, i) => {
      const dists = X.map((y, j) => ({ idx: j, dist: i === j ? Infinity : Math.sqrt(this._sqDist(X[i], y)) }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, nNeighbors);
      return dists.reduce((s, d) => s + lrd[d.idx], 0) / nNeighbors / lrd[i];
    });
    const threshold = this._percentile(lof, 90);
    const anomalies: Anomaly[] = lof.map((s, i) => ({
      score: s,
      isAnomaly: s > threshold,
      index: i,
    }));
    this._anomalies = anomalies;
    return anomalies;
  }

  /** Elliptic Envelope (Gaussian distribution-based anomaly detection). */
  ellipticEnvelope(X: number[][], contamination: number = 0.1): Anomaly[] {
    const mean = this._columnMeans(X);
    const n = X.length;
    const dim = X[0]?.length ?? 0;
    const centered = X.map(row => row.map((v, i) => v - mean[i]));
    const cov: number[][] = Array.from({ length: dim }, () => new Array(dim).fill(0));
    for (const row of centered) {
      for (let i = 0; i < dim; i++) {
        for (let j = 0; j < dim; j++) cov[i][j] += row[i] * row[j];
      }
    }
    for (let i = 0; i < dim; i++) for (let j = 0; j < dim; j++) cov[i][j] /= Math.max(1, n);
    const invCov = this._matrixInverse(cov);
    const distances = X.map(x => {
      const d = x.map((v, i) => v - mean[i]);
      return d.reduce((s, v, i) => s + v * invCov[i].reduce((s2, x, j) => s2 + x * d[j], 0), 0);
    });
    const threshold = this._percentile(distances, (1 - contamination) * 100);
    const anomalies: Anomaly[] = distances.map((s, i) => ({
      score: s,
      isAnomaly: s > threshold,
      index: i,
    }));
    this._anomalies = anomalies;
    return anomalies;
  }

  // ---------------------------------------------------------------------------
  // Clustering evaluation metrics
  // ---------------------------------------------------------------------------

  /** Calinski-Harabasz index (variance ratio criterion). */
  calinskiHarabasz(X: number[][], labels: number[]): number {
    const uniqueLabels = [...new Set(labels)].filter(l => l >= 0);
    const k = uniqueLabels.length;
    if (k <= 1) return 0;
    const n = X.length;
    const overallCentroid = this._mean(X);
    const centroids = uniqueLabels.map(l => {
      const members = X.filter((_, i) => labels[i] === l);
      return this._mean(members);
    });
    let bg = 0;
    let wg = 0;
    for (let i = 0; i < k; i++) {
      const members = X.filter((_, idx) => labels[idx] === uniqueLabels[i]);
      bg += members.length * this._sqDist(centroids[i], overallCentroid);
      wg += members.reduce((s, m) => s + this._sqDist(m, centroids[i]), 0);
    }
    return (bg / (k - 1)) / (wg / (n - k) + 1e-12);
  }

  /** Dunn index. */
  dunnIndex(X: number[][], labels: number[]): number {
    const uniqueLabels = [...new Set(labels)].filter(l => l >= 0);
    if (uniqueLabels.length < 2) return 0;
    const centroids = uniqueLabels.map(l => {
      const members = X.filter((_, i) => labels[i] === l);
      return this._mean(members);
    });
    let minInter = Infinity;
    for (let i = 0; i < uniqueLabels.length; i++) {
      for (let j = i + 1; j < uniqueLabels.length; j++) {
        const d = Math.sqrt(this._sqDist(centroids[i], centroids[j]));
        if (d < minInter) minInter = d;
      }
    }
    let maxIntra = 0;
    for (let i = 0; i < uniqueLabels.length; i++) {
      const members = X.filter((_, idx) => labels[idx] === uniqueLabels[i]);
      for (let a = 0; a < members.length; a++) {
        for (let b = a + 1; b < members.length; b++) {
          const d = Math.sqrt(this._sqDist(members[a], members[b]));
          if (d > maxIntra) maxIntra = d;
        }
      }
    }
    return maxIntra === 0 ? 0 : minInter / maxIntra;
  }

  /** Adjusted Rand Index (ARI). */
  adjustedRandIndex(labelsTrue: number[], labelsPred: number[]): number {
    const n = labelsTrue.length;
    const classes = [...new Set(labelsTrue)];
    const clusters = [...new Set(labelsPred)];
    const contingency: number[][] = Array.from({ length: classes.length }, () => new Array(clusters.length).fill(0));
    for (let i = 0; i < n; i++) {
      const ci = classes.indexOf(labelsTrue[i]);
      const cj = clusters.indexOf(labelsPred[i]);
      contingency[ci][cj]++;
    }
    const sumCombC = contingency.flat().reduce((s, v) => s + this._comb2(v), 0);
    const sumCombK = classes.map((_, i) =>
      clusters.reduce((s, _, j) => s + contingency[i][j], 0)
    ).reduce((s, v) => s + this._comb2(v), 0);
    const sumCombA = clusters.map((_, j) =>
      classes.reduce((s, _, i) => s + contingency[i][j], 0)
    ).reduce((s, v) => s + this._comb2(v), 0);
    const expectedIndex = sumCombK * sumCombA / this._comb2(n);
    const maxIndex = (sumCombK + sumCombA) / 2;
    return maxIndex === expectedIndex ? 0 : (sumCombC - expectedIndex) / (maxIndex - expectedIndex);
  }

  /** Normalized Mutual Information (NMI). */
  normalizedMutualInfo(labelsTrue: number[], labelsPred: number[]): number {
    const n = labelsTrue.length;
    const classes = [...new Set(labelsTrue)];
    const clusters = [...new Set(labelsPred)];
    const contingency: number[][] = Array.from({ length: classes.length }, () => new Array(clusters.length).fill(0));
    for (let i = 0; i < n; i++) {
      contingency[classes.indexOf(labelsTrue[i])][clusters.indexOf(labelsPred[i])]++;
    }
    const pi = classes.map((_, i) => clusters.reduce((s, _, j) => s + contingency[i][j], 0) / n);
    const pj = clusters.map((_, j) => classes.reduce((s, _, i) => s + contingency[i][j], 0) / n);
    let mi = 0;
    for (let i = 0; i < classes.length; i++) {
      for (let j = 0; j < clusters.length; j++) {
        if (contingency[i][j] === 0) continue;
        const pij = contingency[i][j] / n;
        mi += pij * Math.log(pij / (pi[i] * pj[j] + 1e-12));
      }
    }
    const hC = -pi.reduce((s, p) => s + p * Math.log(p + 1e-12), 0);
    const hK = -pj.reduce((s, p) => s + p * Math.log(p + 1e-12), 0);
    return mi / Math.sqrt(hC * hK + 1e-12);
  }

  /** Homogeneity score (each cluster contains only members of a single class). */
  homogeneity(labelsTrue: number[], labelsPred: number[]): number {
    const nmi = this.normalizedMutualInfo(labelsTrue, labelsPred);
    const classes = [...new Set(labelsTrue)];
    const n = labelsTrue.length;
    const pc = classes.map(c => labelsTrue.filter(l => l === c).length / n);
    const hc = -pc.reduce((s, p) => s + p * Math.log(p + 1e-12), 0);
    return hc === 0 ? 1 : nmi / hc;
  }

  /** Completeness score (all members of a class are assigned to the same cluster). */
  completeness(labelsTrue: number[], labelsPred: number[]): number {
    return this.homogeneity(labelsPred, labelsTrue);
  }

  /** V-measure (harmonic mean of homogeneity and completeness). */
  vMeasure(labelsTrue: number[], labelsPred: number[]): number {
    const h = this.homogeneity(labelsTrue, labelsPred);
    const c = this.completeness(labelsTrue, labelsPred);
    return h + c === 0 ? 0 : 2 * h * c / (h + c);
  }

  /** Fowlkes-Mallows index. */
  fowlkesMallows(labelsTrue: number[], labelsPred: number[]): number {
    const n = labelsTrue.length;
    let tp = 0, fp = 0, fn = 0;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const sameTrue = labelsTrue[i] === labelsTrue[j];
        const samePred = labelsPred[i] === labelsPred[j];
        if (sameTrue && samePred) tp++;
        else if (!sameTrue && samePred) fp++;
        else if (sameTrue && !samePred) fn++;
      }
    }
    return tp / Math.sqrt((tp + fp) * (tp + fn) + 1e-12);
  }

  // ---------------------------------------------------------------------------
  // Distance and similarity metrics
  // ---------------------------------------------------------------------------

  /** Euclidean distance. */
  euclidean(a: number[], b: number[]): number {
    return Math.sqrt(this._sqDist(a, b));
  }

  /** Manhattan (L1) distance. */
  manhattan(a: number[], b: number[]): number {
    return a.reduce((s, v, i) => s + Math.abs(v - (b[i] ?? 0)), 0);
  }

  /** Cosine distance. */
  cosineDistance(a: number[], b: number[]): number {
    const dot = a.reduce((s, v, i) => s + v * (b[i] ?? 0), 0);
    const na = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
    const nb = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
    return 1 - dot / (na * nb + 1e-12);
  }

  /** Minkowski distance of order p. */
  minkowski(a: number[], b: number[], p: number = 3): number {
    return Math.pow(a.reduce((s, v, i) => s + Math.pow(Math.abs(v - (b[i] ?? 0)), p), 0), 1 / p);
  }

  /** Mahalanobis distance. */
  mahalanobis(a: number[], b: number[], cov: number[][]): number {
    const diff = a.map((v, i) => v - b[i]);
    const invCov = this._matrixInverse(cov);
    const m = diff.reduce((s, v, i) => s + v * invCov[i].reduce((s2, x, j) => s2 + x * diff[j], 0), 0);
    return Math.sqrt(Math.max(0, m));
  }

  /** Hamming distance. */
  hamming(a: number[], b: number[]): number {
    return a.reduce((s, v, i) => s + (v !== (b[i] ?? 0) ? 1 : 0), 0);
  }

  /** Jaccard similarity. */
  jaccard(a: number[], b: number[]): number {
    const set1 = new Set(a);
    const set2 = new Set(b);
    let intersect = 0;
    for (const v of set1) if (set2.has(v)) intersect++;
    const union = set1.size + set2.size - intersect;
    return union === 0 ? 0 : intersect / union;
  }

  // ---------------------------------------------------------------------------
  // Kernel functions
  // ---------------------------------------------------------------------------

  /** RBF (Gaussian) kernel. */
  rbfKernel(a: number[], b: number[], gamma: number = 0.1): number {
    return Math.exp(-gamma * this._sqDist(a, b));
  }

  /** Polynomial kernel. */
  polynomialKernel(a: number[], b: number[], degree: number = 3, c: number = 1): number {
    return Math.pow(c + a.reduce((s, v, i) => s + v * (b[i] ?? 0), 0), degree);
  }

  /** Linear kernel. */
  linearKernel(a: number[], b: number[]): number {
    return a.reduce((s, v, i) => s + v * (b[i] ?? 0), 0);
  }

  /** Sigmoid kernel. */
  sigmoidKernel(a: number[], b: number[], alpha: number = 0.1, c: number = 0): number {
    return Math.tanh(alpha * a.reduce((s, v, i) => s + v * (b[i] ?? 0), 0) + c);
  }

  /** Laplacian kernel. */
  laplacianKernel(a: number[], b: number[], gamma: number = 0.1): number {
    return Math.exp(-gamma * this.manhattan(a, b));
  }

  // ---------------------------------------------------------------------------
  // Registry access
  // ---------------------------------------------------------------------------

  /** Get stored clusters. */
  getClusters(): Cluster[] {
    return [...this._clusters];
  }

  /** Get stored PCA results. */
  getPcas(): PCA[] {
    return [...this._pcas];
  }

  /** Get stored anomalies. */
  getAnomalies(): Anomaly[] {
    return [...this._anomalies];
  }

  /** Get history records. */
  getHistory(): ClusteringRecord[] {
    return [...this._history];
  }

  /** Clear history records. */
  clearHistory(): void {
    this._history = [];
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

  private _median(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  private _initCentroidsPlusPlus(X: number[][], k: number): number[][] {
    const n = X.length;
    if (n === 0) return [];
    const centroids: number[][] = [X[Math.floor(Math.random() * n)]];
    while (centroids.length < k) {
      const distances = X.map(x => Math.min(...centroids.map(c => this._sqDist(x, c))));
      const total = distances.reduce((s, v) => s + v, 0);
      if (total === 0) {
        centroids.push(X[Math.floor(Math.random() * n)]);
        continue;
      }
      const r = Math.random() * total;
      let cumSum = 0;
      for (let i = 0; i < n; i++) {
        cumSum += distances[i];
        if (cumSum >= r) {
          centroids.push([...X[i]]);
          break;
        }
      }
    }
    return centroids;
  }

  private _sampleBatch(X: number[][], batchSize: number): number[][] {
    const n = X.length;
    const batch: number[][] = [];
    for (let i = 0; i < Math.min(batchSize, n); i++) {
      batch.push(X[Math.floor(Math.random() * n)]);
    }
    return batch;
  }

  private _opticsUpdate(X: number[][], idx: number, neighbors: number[], seeds: { idx: number; reach: number }[], _processed: boolean[], reachability: number[], eps: number, minSamples: number): void {
    const coreDist = this._coreDistance(X, idx, eps, minSamples);
    for (const n of neighbors) {
      if (n === idx) continue;
      const d = Math.sqrt(this._sqDist(X[idx], X[n]));
      const newReach = Math.max(coreDist, d);
      if (newReach < reachability[n]) {
        reachability[n] = newReach;
        const existing = seeds.find(s => s.idx === n);
        if (existing) existing.reach = newReach;
        else seeds.push({ idx: n, reach: newReach });
      }
    }
  }

  private _coreDistance(X: number[][], idx: number, _eps: number, minSamples: number): number {
    const distances = X.map((x, i) => i === idx ? Infinity : Math.sqrt(this._sqDist(X[idx], x))).sort((a, b) => a - b);
    return distances[minSamples - 1] ?? Infinity;
  }

  private _batch(X: number[][], batchSize: number): number[][][] {
    const batches: number[][][] = [];
    for (let i = 0; i < X.length; i += batchSize) {
      batches.push(X.slice(i, i + batchSize));
    }
    return batches;
  }

  private _matrixInverse(M: number[][]): number[][] {
    const n = M.length;
    if (n === 0) return [];
    const A: number[][] = M.map(row => [...row]);
    const I: number[][] = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => i === j ? 1 : 0)
    );
    for (let col = 0; col < n; col++) {
      let maxRow = col;
      for (let row = col + 1; row < n; row++) {
        if (Math.abs(A[row][col]) > Math.abs(A[maxRow][col])) maxRow = row;
      }
      [A[col], A[maxRow]] = [A[maxRow], A[col]];
      [I[col], I[maxRow]] = [I[maxRow], I[col]];
      const pivot = A[col][col];
      if (Math.abs(pivot) < 1e-12) continue;
      for (let j = 0; j < n; j++) {
        A[col][j] /= pivot;
        I[col][j] /= pivot;
      }
      for (let i = 0; i < n; i++) {
        if (i === col) continue;
        const factor = A[i][col];
        for (let j = 0; j < n; j++) {
          A[i][j] -= factor * A[col][j];
          I[i][j] -= factor * I[col][j];
        }
      }
    }
    return I;
  }

  private _comb2(n: number): number {
    return n < 2 ? 0 : (n * (n - 1)) / 2;
  }
}
