export interface NebulaCluster {
  id: string;
  centroid: Record<string, unknown>;
  members: number;
  dispersion: number;
  representative: Record<string, unknown>;
  density: number;
}

export interface NebulaConfig {
  similarityThreshold: number;
  maxClusters: number;
  weightKey: string;
  epsilon: number;
  minPoints: number;
}

export class NebulaCompressor {
  private _clusters: Map<string, NebulaCluster> = new Map();
  private _config: NebulaConfig;
  private _originalCount = 0;
  private _nextId = 0;
  private _pointBuffer: Array<Record<string, unknown>> = [];
  private _bufferLimit = 128;

  constructor(config?: Partial<NebulaConfig>) {
    this._config = {
      similarityThreshold: config?.similarityThreshold ?? 0.65,
      maxClusters: config?.maxClusters ?? 32,
      weightKey: config?.weightKey ?? 'type',
      epsilon: config?.epsilon ?? 0.3,
      minPoints: config?.minPoints ?? 3,
    };
  }

  ingest(points: Record<string, unknown>[]): NebulaCluster[] {
    this._originalCount += points.length;
    this._pointBuffer.push(...points);
    if (this._pointBuffer.length >= this._bufferLimit) this._densityCluster();
    else for (const point of points) this._assign(point);
    return Array.from(this._clusters.values());
  }

  private _densityCluster(): void {
    const visited = new Set<number>();
    for (let i = 0; i < this._pointBuffer.length; i++) {
      if (visited.has(i)) continue;
      const neighbors = this._regionQuery(i);
      if (neighbors.length >= this._config.minPoints) {
        const cluster = this._createDensityCluster(this._pointBuffer[i], neighbors.length);
        this._expandCluster(i, neighbors, visited, cluster);
      }
    }
    for (let i = 0; i < this._pointBuffer.length; i++) if (!visited.has(i)) this._assign(this._pointBuffer[i]);
    this._pointBuffer = [];
  }

  private _regionQuery(idx: number): number[] {
    const neighbors: number[] = [];
    const target = this._pointBuffer[idx];
    for (let i = 0; i < this._pointBuffer.length; i++) {
      if (i === idx) continue;
      if (1 - this._similarity(target, this._pointBuffer[i]) <= this._config.epsilon) neighbors.push(i);
    }
    return neighbors;
  }

  private _expandCluster(idx: number, neighbors: number[], visited: Set<number>, cluster: NebulaCluster): void {
    const queue = [...neighbors];
    visited.add(idx);
    this._mergeInto(cluster, this._pointBuffer[idx]);
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      this._mergeInto(cluster, this._pointBuffer[current]);
      const cn = this._regionQuery(current);
      if (cn.length >= this._config.minPoints) queue.push(...cn.filter(n => !visited.has(n)));
    }
  }

  private _assign(point: Record<string, unknown>): void {
    let bestCluster: NebulaCluster | undefined;
    let bestScore = 0;
    for (const cluster of this._clusters.values()) {
      const score = this._similarity(point, cluster.centroid) * (1 + cluster.density * 0.2);
      if (score > bestScore) { bestScore = score; bestCluster = cluster; }
    }
    if (bestCluster && bestScore >= this._config.similarityThreshold) this._mergeInto(bestCluster, point);
    else this._createCluster(point);
  }

  private _similarity(a: Record<string, unknown>, b: Record<string, unknown>): number {
    const keysA = new Set(Object.keys(a)), keysB = new Set(Object.keys(b));
    const intersection = [...keysA].filter(k => keysB.has(k));
    const union = new Set([...keysA, ...keysB]);
    const keyRatio = union.size === 0 ? 0 : intersection.length / union.size;
    let numMatch = 0, numTotal = 0, strMatch = 0, strTotal = 0;
    for (const k of intersection) {
      const va = a[k], vb = b[k];
      if (typeof va === 'number' && typeof vb === 'number') {
        numTotal++;
        numMatch += 1 - Math.min(1, Math.abs(va - vb) / Math.max(Math.abs(va), Math.abs(vb), 1));
      } else { strTotal++; if (String(va) === String(vb)) strMatch++; }
    }
    const numRatio = numTotal === 0 ? 0.5 : numMatch / numTotal;
    const strRatio = strTotal === 0 ? 0.5 : strMatch / strTotal;
    return keyRatio * 0.35 + (numRatio + strRatio) * 0.325;
  }

  private _mergeInto(cluster: NebulaCluster, point: Record<string, unknown>): void {
    cluster.members++;
    const weight = 1 / Math.sqrt(cluster.members + 1);
    const pw = typeof point[this._config.weightKey] === 'number' ? Number(point[this._config.weightKey]) : 1;
    const adjWeight = weight * Math.min(2, Math.max(0.5, pw));
    for (const key of Object.keys(point)) {
      if (typeof point[key] === 'number') {
        const cv = cluster.centroid[key];
        cluster.centroid[key] = typeof cv === 'number' ? cv * (1 - adjWeight) + Number(point[key]) * adjWeight : point[key];
      }
    }
    const sim = this._similarity(point, cluster.centroid);
    cluster.dispersion = cluster.dispersion * 0.85 + (1 - sim) * 0.15;
    cluster.density = cluster.members / (1 + cluster.dispersion);
    if (sim > this._similarity(cluster.representative, cluster.centroid)) cluster.representative = { ...point };
  }

  private _createCluster(point: Record<string, unknown>): void {
    if (this._clusters.size >= this._config.maxClusters) this._evictWeakest();
    const id = `neb-${this._nextId++}`;
    this._clusters.set(id, { id, centroid: { ...point }, members: 1, dispersion: 0, representative: { ...point }, density: 1 });
  }

  private _createDensityCluster(point: Record<string, unknown>, size: number): NebulaCluster {
    if (this._clusters.size >= this._config.maxClusters) this._evictWeakest();
    const id = `neb-${this._nextId++}`;
    const cluster = { id, centroid: { ...point }, members: 0, dispersion: 0, representative: { ...point }, density: size };
    this._clusters.set(id, cluster);
    return cluster;
  }

  private _evictWeakest(): void {
    let weakest: NebulaCluster | undefined;
    let weakestScore = Infinity;
    for (const c of this._clusters.values()) {
      const score = c.dispersion / Math.max(1, c.members * c.density);
      if (score < weakestScore) { weakestScore = score; weakest = c; }
    }
    if (weakest) this._clusters.delete(weakest.id);
  }

  compress(): Record<string, unknown> {
    const clusters = Array.from(this._clusters.values());
    return {
      clusterCount: clusters.length,
      totalMembers: clusters.reduce((s, c) => s + c.members, 0),
      clusters: clusters.map(c => ({ id: c.id, centroid: c.centroid, members: c.members, dispersion: c.dispersion, density: c.density })),
      averageEntropy: this._originalCount === 0 ? 0 : clusters.reduce((s, c) => s + c.dispersion * c.members, 0) / this._originalCount,
    };
  }

  compressionRatio(): number {
    const totalMembers = Array.from(this._clusters.values()).reduce((s, c) => s + c.members, 0);
    return totalMembers === 0 ? 1 : this._clusters.size / totalMembers;
  }

  decompress(): Record<string, unknown>[] {
    const expanded: Record<string, unknown>[] = [];
    for (const cluster of this._clusters.values()) {
      for (let i = 0; i < cluster.members; i++) expanded.push({ ...cluster.representative, _reconstructedIndex: i });
    }
    return expanded;
  }

  tune(partial: Partial<NebulaConfig>): void { this._config = { ...this._config, ...partial }; }

  reset(): void {
    this._clusters.clear();
    this._originalCount = 0;
    this._pointBuffer = [];
  }

  get clusterCount(): number { return this._clusters.size; }
  get originalCount(): number { return this._originalCount; }
  get config(): NebulaConfig { return { ...this._config }; }
  get coreClusterCount(): number {
    return Array.from(this._clusters.values()).filter(c => c.density >= this._config.minPoints).length;
  }
}
