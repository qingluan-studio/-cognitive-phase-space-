export type CompressionEntry = {
  id: string;
  startTime: number;
  endTime: number;
  data: unknown;
  priority: number;
};

export type CompressionResult = {
  compressedId: string;
  entries: string[];
  compressedData: unknown;
  overlapRatio: number;
  compressionRatio: number;
};

export class StrettoCompressor {
  private entries: CompressionEntry[] = [];
  private overlapThreshold = 0.3;
  private maxCompressionRatio = 0.5;

  addEntry(entry: CompressionEntry): void {
    this.entries.push(entry);
  }

  setOverlapThreshold(threshold: number): void {
    this.overlapThreshold = Math.max(0, Math.min(1, threshold));
  }

  compress(): CompressionResult[] {
    const sorted = [...this.entries].sort((a, b) => a.startTime - b.startTime);
    const results: CompressionResult[] = [];
    let currentGroup: CompressionEntry[] = [];

    for (let i = 0; i < sorted.length; i++) {
      const entry = sorted[i];
      
      if (currentGroup.length === 0) {
        currentGroup.push(entry);
        continue;
      }

      const lastEntry = currentGroup[currentGroup.length - 1];
      const overlap = this.calculateOverlap(lastEntry, entry);

      if (overlap >= this.overlapThreshold) {
        currentGroup.push(entry);
      } else {
        results.push(this.compressGroup(currentGroup));
        currentGroup = [entry];
      }
    }

    if (currentGroup.length > 0) {
      results.push(this.compressGroup(currentGroup));
    }

    this.entries = [];
    return results;
  }

  private calculateOverlap(a: CompressionEntry, b: CompressionEntry): number {
    const overlapStart = Math.max(a.startTime, b.startTime);
    const overlapEnd = Math.min(a.endTime, b.endTime);
    const overlapDuration = Math.max(0, overlapEnd - overlapStart);
    const totalDuration = Math.max(a.endTime, b.endTime) - Math.min(a.startTime, b.startTime);
    
    return totalDuration > 0 ? overlapDuration / totalDuration : 0;
  }

  private compressGroup(group: CompressionEntry[]): CompressionResult {
    const sortedByPriority = [...group].sort((a, b) => b.priority - a.priority);
    const primary = sortedByPriority[0];
    
    const compressedData = sortedByPriority.reduce((acc, entry) => {
      if (typeof acc === 'object' && typeof entry.data === 'object') {
        return { ...acc, ...entry.data };
      }
      return acc;
    }, primary.data);

    const originalSize = JSON.stringify(group).length;
    const compressedSize = JSON.stringify(compressedData).length;
    const compressionRatio = Math.min(this.maxCompressionRatio, compressedSize / originalSize);

    return {
      compressedId: `compressed-${primary.id}`,
      entries: group.map(e => e.id),
      compressedData,
      overlapRatio: group.length > 1 ? this.calculateGroupOverlap(group) : 1,
      compressionRatio,
    };
  }

  private calculateGroupOverlap(group: CompressionEntry[]): number {
    const minStart = Math.min(...group.map(e => e.startTime));
    const maxEnd = Math.max(...group.map(e => e.endTime));
    const totalDuration = maxEnd - minStart;
    
    const overlapStart = Math.max(...group.map(e => e.startTime));
    const overlapEnd = Math.min(...group.map(e => e.endTime));
    const overlapDuration = Math.max(0, overlapEnd - overlapStart);
    
    return totalDuration > 0 ? overlapDuration / totalDuration : 0;
  }

  getPendingCount(): number {
    return this.entries.length;
  }

  clearEntries(): void {
    this.entries = [];
  }

  removeEntry(id: string): void {
    this.entries = this.entries.filter(e => e.id !== id);
  }
}