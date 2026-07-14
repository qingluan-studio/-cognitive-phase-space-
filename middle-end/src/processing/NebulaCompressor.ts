/**
 * 星云压缩器模块：利用模糊相似性对数据集群进行超高比例有损压缩，
 * 将相近数据点合并为星云团，仅保留团心与离散度。
 */

export interface NebulaCluster {
  id: string;
  centroid: Record<string, unknown>;
  members: number;
  dispersion: number;
  representative: Record<string, unknown>;
}

export interface NebulaConfig {
  similarityThreshold: number;
  maxClusters: number;
  weightKey: string;
}

export class NebulaCompressor {
  private _clusters: Map<string, NebulaCluster> = new Map();
  private _config: NebulaConfig;
  private _originalCount = 0;
  private _nextId = 0;

  constructor(config?: Partial<NebulaConfig>) {
    this._config = {
      similarityThreshold: config?.similarityThreshold ?? 0.7,
      maxClusters: config?.maxClusters ?? 32,
      weightKey: config?.weightKey ?? 'type',
    };
  }

  ingest(points: Record<string, unknown>[]): NebulaCluster[] {
    this._originalCount += points.length;
    for (const point of points) {
      this._assign(point);
    }
    return Array.from(this._clusters.values());
  }

  private _assign(point: Record<string, unknown>): void {
    let bestCluster: NebulaCluster | undefined;
    let bestScore = 0;

    for (const cluster of this._clusters.values()) {
      const score = this._similarity(point, cluster.centroid);
      if (score > bestScore) {
        bestScore = score;
        bestCluster = cluster;
      }
    }

    if (bestCluster && bestScore >= this._config.similarityThreshold) {
      this._mergeInto(bestCluster, point);
    } else {
      this._createCluster(point);
    }
  }

  private _similarity(a: Record<string, unknown>, b: Record<string, unknown>): number {
    const keysA = new Set(Object.keys(a));
    const keysB = new Set(Object.keys(b));
    const intersection = new Set([...keysA].filter(k => keysB.has(k)));
    const union = new Set([...keysA, ...keysB]);
    const keyRatio = union.size === 0 ? 0 : intersection.size / union.size;

    let valueMatch = 0;
    for (const k of intersection) {
      if (String(a[k]) === String(b[k])) valueMatch++;
    }
    const valueRatio = intersection.size === 0 ? 0 : valueMatch / intersection.size;
    return keyRatio * 0.4 + valueRatio * 0.6;
  }

  private _mergeInto(cluster: NebulaCluster, point: Record<string, unknown>): void {
    cluster.members++;
    const weight = 1 / (cluster.members + 1);
    for (const key of Object.keys(point)) {
      if (typeof point[key] === 'number' && typeof cluster.centroid[key] === 'number') {
        cluster.centroid[key] = (Number(cluster.centroid[key]) * (1 - weight)) + (Number(point[key]) * weight);
      }
    }
    cluster.dispersion = cluster.dispersion * 0.9 + (1 - this._similarity(point, cluster.centroid)) * 0.1;
  }

  private _createCluster(point: Record<string, unknown>): void {
    if (this._clusters.size >= this._config.maxClusters) {
      this._evictSmallest();
    }
    const id = `neb-${this._nextId++}`;
    const cluster: NebulaCluster = {
      id,
      centroid: { ...point },
      members: 1,
      dispersion: 0,
      representative: { ...point },
    };
    this._clusters.set(id, cluster);
  }

  private _evictSmallest(): void {
    let smallest: NebulaCluster | undefined;
    for (const c of this._clusters.values()) {
      if (!smallest || c.members < smallest.members) smallest = c;
    }
    if (smallest) this._clusters.delete(smallest.id);
  }

  compress(): Record<string, unknown> {
    const clusters = Array.from(this._clusters.values());
    return {
      clusterCount: clusters.length,
      totalMembers: clusters.reduce((s, c) => s + c.members, 0),
      clusters: clusters.map(c => ({ id: c.id, centroid: c.centroid, members: c.members, dispersion: c.dispersion })),
    };
  }

  compressionRatio(): number {
    const totalMembers = Array.from(this._clusters.values()).reduce((s, c) => s + c.members, 0);
    return totalMembers === 0 ? 1 : this._clusters.size / totalMembers;
  }

  decompress(): Record<string, unknown>[] {
    const expanded: Record<string, unknown>[] = [];
    for (const cluster of this._clusters.values()) {
      for (let i = 0; i < cluster.members; i++) {
        expanded.push({ ...cluster.representative, _reconstructedIndex: i });
      }
    }
    return expanded;
  }

  tune(partial: Partial<NebulaConfig>): void {
    this._config = { ...this._config, ...partial };
  }

  reset(): void {
    this._clusters.clear();
    this._originalCount = 0;
  }

  get clusterCount(): number {
    return this._clusters.size;
  }

  get originalCount(): number {
    return this._originalCount;
  }

  get config(): NebulaConfig {
    return { ...this._config };
  }
}
