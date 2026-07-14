export type CompressionEntry = {
  id: string;
  startTime: number;
  endTime: number;
  data: Record<string, unknown>;
  priority: number;
  tags: string[];
};

export type CompressionResult = {
  compressedId: string;
  entries: string[];
  compressedData: Record<string, unknown>;
  overlapRatio: number;
  compressionRatio: number;
  clusterScore: number;
  informationLoss: number;
};

export type TimeCluster = {
  entries: CompressionEntry[];
  centroid: number;
  radius: number;
  density: number;
};

export class StrettoCompressor {
  private _entries: CompressionEntry[] = [];
  private _overlapThreshold = 0.3;
  private _maxCompressionRatio = 0.5;
  private _clusterEpsilon = 100;
  private _minClusterSize = 2;

  get entries(): CompressionEntry[] {
    return [...this._entries];
  }

  get overlapThreshold(): number {
    return this._overlapThreshold;
  }

  get maxCompressionRatio(): number {
    return this._maxCompressionRatio;
  }

  addEntry(entry: CompressionEntry): void {
    this._entries.push({ ...entry });
  }

  setOverlapThreshold(threshold: number): void {
    this._overlapThreshold = Math.max(0, Math.min(1, threshold));
  }

  setMaxCompressionRatio(ratio: number): void {
    this._maxCompressionRatio = Math.max(0.1, Math.min(1, ratio));
  }

  compress(): CompressionResult[] {
    if (this._entries.length === 0) return [];

    const sorted = [...this._entries].sort((a, b) => a.startTime - b.startTime);
    const clusters = this._clusterByTimeOverlap(sorted);
    
    const results: CompressionResult[] = [];
    
    for (const cluster of clusters) {
      if (cluster.entries.length >= this._minClusterSize) {
        results.push(this._compressCluster(cluster));
      } else {
        for (const entry of cluster.entries) {
          results.push(this._compressSingle(entry));
        }
      }
    }

    this._entries = [];
    return results.sort((a, b) => b.compressionRatio - a.compressionRatio);
  }

  private _clusterByTimeOverlap(entries: CompressionEntry[]): TimeCluster[] {
    const clusters: TimeCluster[] = [];
    
    for (const entry of entries) {
      let matched = false;
      
      for (const cluster of clusters) {
        if (this._entryFitsCluster(entry, cluster)) {
          cluster.entries.push(entry);
          this._updateClusterCentroid(cluster);
          matched = true;
          break;
        }
      }
      
      if (!matched) {
        clusters.push({
          entries: [entry],
          centroid: (entry.startTime + entry.endTime) / 2,
          radius: (entry.endTime - entry.startTime) / 2,
          density: 0,
        });
      }
    }
    
    return clusters.map(c => ({
      ...c,
      density: this._computeClusterDensity(c),
    }));
  }

  private _entryFitsCluster(entry: CompressionEntry, cluster: TimeCluster): boolean {
    const entryCenter = (entry.startTime + entry.endTime) / 2;
    const distance = Math.abs(entryCenter - cluster.centroid);
    return distance < cluster.radius + this._clusterEpsilon;
  }

  private _updateClusterCentroid(cluster: TimeCluster): void {
    const totalWeighted = cluster.entries.reduce((sum, e) => {
      const weight = e.priority * (e.endTime - e.startTime);
      return sum + weight * ((e.startTime + e.endTime) / 2);
    }, 0);
    
    const totalWeight = cluster.entries.reduce((sum, e) => {
      return sum + e.priority * (e.endTime - e.startTime);
    }, 0);
    
    cluster.centroid = totalWeight > 0 ? totalWeighted / totalWeight : cluster.centroid;
    
    const maxDistance = cluster.entries.reduce((max, e) => {
      const center = (e.startTime + e.endTime) / 2;
      return Math.max(max, Math.abs(center - cluster.centroid));
    }, 0);
    
    cluster.radius = maxDistance;
  }

  private _computeClusterDensity(cluster: TimeCluster): number {
    if (cluster.entries.length < 2) return 0;
    
    let totalOverlap = 0;
    for (let i = 0; i < cluster.entries.length; i++) {
      for (let j = i + 1; j < cluster.entries.length; j++) {
        totalOverlap += this._calculateOverlap(cluster.entries[i], cluster.entries[j]);
      }
    }
    
    const pairs = cluster.entries.length * (cluster.entries.length - 1) / 2;
    return pairs > 0 ? totalOverlap / pairs : 0;
  }

  private _calculateOverlap(a: CompressionEntry, b: CompressionEntry): number {
    const overlapStart = Math.max(a.startTime, b.startTime);
    const overlapEnd = Math.min(a.endTime, b.endTime);
    const overlapDuration = Math.max(0, overlapEnd - overlapStart);
    const totalDuration = Math.max(a.endTime, b.endTime) - Math.min(a.startTime, b.startTime);
    
    return totalDuration > 0 ? overlapDuration / totalDuration : 0;
  }

  private _compressCluster(cluster: TimeCluster): CompressionResult {
    const sortedByPriority = [...cluster.entries].sort((a, b) => b.priority - a.priority);
    const primary = sortedByPriority[0];
    
    const mergedData = this._mergeDataWithPriority(sortedByPriority);
    const originalSize = this._estimateDataSize(sortedByPriority);
    const compressedSize = this._estimateDataSize([{ ...primary, data: mergedData }]);
    
    const compressionRatio = Math.min(this._maxCompressionRatio, compressedSize / originalSize);
    const clusterScore = cluster.density * (1 - compressionRatio);
    const informationLoss = this._computeInformationLoss(sortedByPriority, mergedData);

    return {
      compressedId: `compressed-${primary.id}-${cluster.entries.length}`,
      entries: cluster.entries.map(e => e.id),
      compressedData: mergedData,
      overlapRatio: cluster.density,
      compressionRatio,
      clusterScore,
      informationLoss,
    };
  }

  private _mergeDataWithPriority(entries: CompressionEntry[]): Record<string, unknown> {
    const weights = entries.map(e => e.priority);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    
    const merged: Record<string, unknown> = {};
    
    for (const [index, entry] of entries.entries()) {
      const weight = weights[index] / totalWeight;
      
      for (const [key, value] of Object.entries(entry.data)) {
        if (!(key in merged)) {
          merged[key] = value;
        } else {
          const existing = merged[key];
          merged[key] = this._mergeValues(existing, value, weight);
        }
      }
    }
    
    return merged;
  }

  private _mergeValues(a: unknown, b: unknown, weight: number): unknown {
    if (typeof a === 'number' && typeof b === 'number') {
      return a * (1 - weight) + b * weight;
    }
    
    if (typeof a === 'string' && typeof b === 'string') {
      return weight > 0.5 ? b : a;
    }
    
    if (Array.isArray(a) && Array.isArray(b)) {
      const result: unknown[] = [];
      const maxLength = Math.max(a.length, b.length);
      for (let i = 0; i < maxLength; i++) {
        result.push(this._mergeValues(a[i] || null, b[i] || null, weight));
      }
      return result;
    }
    
    if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null) {
      const merged: Record<string, unknown> = { ...(a as Record<string, unknown>) };
      for (const [key, value] of Object.entries(b as Record<string, unknown>)) {
        merged[key] = this._mergeValues(merged[key], value, weight);
      }
      return merged;
    }
    
    return weight > 0.5 ? b : a;
  }

  private _estimateDataSize(entries: CompressionEntry[]): number {
    let totalSize = 0;
    for (const entry of entries) {
      totalSize += JSON.stringify(entry.data).length;
    }
    return totalSize;
  }

  private _computeInformationLoss(originalEntries: CompressionEntry[], mergedData: Record<string, unknown>): number {
    let totalLoss = 0;
    const mergedStr = JSON.stringify(mergedData);
    
    for (const entry of originalEntries) {
      const entryStr = JSON.stringify(entry.data);
      const similarity = this._computeStringSimilarity(entryStr, mergedStr);
      totalLoss += (1 - similarity) * entry.priority;
    }
    
    const totalPriority = originalEntries.reduce((sum, e) => sum + e.priority, 0);
    return totalPriority > 0 ? totalLoss / totalPriority : 0;
  }

  private _computeStringSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length === 0 || b.length === 0) return 0;
    
    const matrix: number[][] = [];
    
    for (let i = 0; i <= a.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= b.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    
    const distance = matrix[a.length][b.length];
    return 1 - distance / Math.max(a.length, b.length);
  }

  private _compressSingle(entry: CompressionEntry): CompressionResult {
    return {
      compressedId: `compressed-${entry.id}-1`,
      entries: [entry.id],
      compressedData: { ...entry.data },
      overlapRatio: 1,
      compressionRatio: 1,
      clusterScore: 0,
      informationLoss: 0,
    };
  }

  getPendingCount(): number {
    return this._entries.length;
  }

  clearEntries(): void {
    this._entries = [];
  }

  removeEntry(id: string): void {
    this._entries = this._entries.filter(e => e.id !== id);
  }

  predictCompressionRatio(): number {
    if (this._entries.length < 2) return 1;
    
    const sorted = [...this._entries].sort((a, b) => a.startTime - b.startTime);
    const clusters = this._clusterByTimeOverlap(sorted);
    
    let totalOriginalSize = 0;
    let totalCompressedSize = 0;
    
    for (const cluster of clusters) {
      if (cluster.entries.length >= this._minClusterSize) {
        const sortedByPriority = [...cluster.entries].sort((a, b) => b.priority - a.priority);
        const primary = sortedByPriority[0];
        const mergedData = this._mergeDataWithPriority(sortedByPriority);
        
        totalOriginalSize += this._estimateDataSize(cluster.entries);
        totalCompressedSize += this._estimateDataSize([{ ...primary, data: mergedData }]);
      } else {
        totalOriginalSize += this._estimateDataSize(cluster.entries);
        totalCompressedSize += this._estimateDataSize(cluster.entries);
      }
    }
    
    return totalOriginalSize > 0 ? totalCompressedSize / totalOriginalSize : 1;
  }

  findOptimalCompression(): CompressionResult[] {
    const originalResults = this.compress();
    
    const optimalResults = originalResults.filter(r => {
      return r.clusterScore > 0.3 && r.informationLoss < 0.2;
    });
    
    return optimalResults.length > 0 ? optimalResults : originalResults;
  }
}