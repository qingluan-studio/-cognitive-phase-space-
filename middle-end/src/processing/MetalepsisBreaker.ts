export interface NarrativeLevel {
  id: string;
  depth: number;
  content: Record<string, unknown>;
  distortion: number;
  parent: string | null;
}

export interface BreakthroughResult {
  brokeAt: string;
  targetDepth: number;
  rawCore: Record<string, unknown>;
  skippedLevels: number;
  fidelityRestored: number;
  shortestPath: string[];
}

export class MetalepsisBreaker {
  private _levels: Map<string, NarrativeLevel> = new Map();
  private _breakthroughs: BreakthroughResult[] = [];
  private _distortionThreshold = 0.5;
  private _maxDepth = 8;
  private _adjacency: Map<string, string[]> = new Map();
  private _distortionPropagation: Map<string, number> = new Map();

  registerLevel(level: NarrativeLevel): void {
    this._levels.set(level.id, level);
    this._buildAdjacency();
    this._propagateDistortion();
  }

  setDistortionThreshold(t: number): void {
    this._distortionThreshold = Math.max(0, Math.min(1, t));
  }

  setMaxDepth(max: number): void {
    this._maxDepth = Math.max(1, max);
  }

  private _buildAdjacency(): void {
    this._adjacency.clear();
    for (const level of this._levels.values()) {
      if (!this._adjacency.has(level.id)) this._adjacency.set(level.id, []);
      if (level.parent) {
        this._adjacency.get(level.id)!.push(level.parent);
        if (!this._adjacency.has(level.parent)) this._adjacency.set(level.parent, []);
        this._adjacency.get(level.parent)!.push(level.id);
      }
    }
  }

  private _propagateDistortion(): void {
    this._distortionPropagation.clear();
    for (const level of this._levels.values()) {
      this._distortionPropagation.set(level.id, level.distortion);
    }
    for (let iter = 0; iter < 3; iter++) {
      for (const [id, neighbors] of this._adjacency) {
        let neighborDist = 0;
        for (const n of neighbors) {
          neighborDist += this._distortionPropagation.get(n) ?? 0;
        }
        const avgNeighbor = neighbors.length > 0 ? neighborDist / neighbors.length : 0;
        const current = this._distortionPropagation.get(id) ?? 0;
        this._distortionPropagation.set(id, current * 0.7 + avgNeighbor * 0.3);
      }
    }
  }

  detectExcessiveDepth(startId: string): NarrativeLevel | null {
    const start = this._levels.get(startId);
    if (!start) return null;

    let current: NarrativeLevel | undefined = start;
    let depth = 0;
    while (current && depth < this._maxDepth) {
      const propagated = this._distortionPropagation.get(current.id) ?? current.distortion;
      if (propagated >= this._distortionThreshold) return current;
      current = current.parent ? this._levels.get(current.parent) : undefined;
      depth++;
    }
    return null;
  }

  breakthrough(startId: string): BreakthroughResult | undefined {
    const start = this._levels.get(startId);
    if (!start) return undefined;

    const distorted = this.detectExcessiveDepth(startId);
    if (!distorted) return undefined;

    const rawCoreLevel = this._findRawCoreLevel(distorted);
    const path = this._shortestPath(distorted.id, rawCoreLevel.id);
    const skippedLevels = path.length - 1;
    const fidelityRestored = Math.min(1, this._distortionPropagation.get(distorted.id) ?? distorted.distortion);

    const result: BreakthroughResult = {
      brokeAt: distorted.id,
      targetDepth: rawCoreLevel.depth,
      rawCore: { ...rawCoreLevel.content, _breakthroughSource: rawCoreLevel.id },
      skippedLevels,
      fidelityRestored,
      shortestPath: path,
    };
    this._breakthroughs.push(result);
    return result;
  }

  private _findRawCoreLevel(level: NarrativeLevel): NarrativeLevel {
    let current: NarrativeLevel | undefined = level;
    let deepest = level;
    let minDistortion = this._distortionPropagation.get(level.id) ?? level.distortion;

    while (current) {
      const dist = this._distortionPropagation.get(current.id) ?? current.distortion;
      if (dist < minDistortion) {
        minDistortion = dist;
        deepest = current;
      }
      current = current.parent ? this._levels.get(current.parent) : undefined;
    }
    return deepest;
  }

  private _shortestPath(startId: string, endId: string): string[] {
    if (startId === endId) return [startId];

    const visited = new Set<string>();
    const queue: { id: string; path: string[] }[] = [{ id: startId, path: [startId] }];

    while (queue.length > 0) {
      const { id, path } = queue.shift()!;
      if (id === endId) return path;
      if (visited.has(id)) continue;
      visited.add(id);

      const neighbors = this._adjacency.get(id) ?? [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push({ id: neighbor, path: [...path, neighbor] });
        }
      }
    }
    return [startId];
  }

  breakthroughAll(): BreakthroughResult[] {
    const results: BreakthroughResult[] = [];
    for (const id of this._levels.keys()) {
      const result = this.breakthrough(id);
      if (result) results.push(result);
    }
    return results;
  }

  averageFidelityRestored(): number {
    if (this._breakthroughs.length === 0) return 0;
    return this._breakthroughs.reduce((s, r) => s + r.fidelityRestored, 0) / this._breakthroughs.length;
  }

  distortedLevels(): NarrativeLevel[] {
    return Array.from(this._levels.values()).filter(l =>
      (this._distortionPropagation.get(l.id) ?? l.distortion) >= this._distortionThreshold
    );
  }

  deepestLevel(): NarrativeLevel | undefined {
    return Array.from(this._levels.values()).sort((a, b) => b.depth - a.depth)[0];
  }

  totalDistortion(): number {
    let total = 0;
    for (const dist of this._distortionPropagation.values()) total += dist;
    return total;
  }

  reset(): void {
    this._levels.clear();
    this._breakthroughs = [];
    this._adjacency.clear();
    this._distortionPropagation.clear();
  }

  get levelCount(): number { return this._levels.size; }
  get breakthroughCount(): number { return this._breakthroughs.length; }
  get distortionThreshold(): number { return this._distortionThreshold; }
  get maxDepth(): number { return this._maxDepth; }
}
