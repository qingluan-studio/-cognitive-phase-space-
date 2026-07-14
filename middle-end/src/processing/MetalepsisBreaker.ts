/**
 * 越界突破器模块：当叙事层次嵌套过深导致处理失真时，
 * 打破中间层次直接触碰原始底层数据，恢复处理保真度。
 */

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
}

export class MetalepsisBreaker {
  private _levels: Map<string, NarrativeLevel> = new Map();
  private _breakthroughs: BreakthroughResult[] = [];
  private _distortionThreshold = 0.5;
  private _maxDepth = 8;

  registerLevel(level: NarrativeLevel): void {
    this._levels.set(level.id, level);
  }

  setDistortionThreshold(t: number): void {
    this._distortionThreshold = Math.max(0, Math.min(1, t));
  }

  setMaxDepth(max: number): void {
    this._maxDepth = Math.max(1, max);
  }

  detectExcessiveDepth(startId: string): NarrativeLevel | null {
    const start = this._levels.get(startId);
    if (!start) return null;

    let current: NarrativeLevel | undefined = start;
    let depth = 0;
    while (current && depth < this._maxDepth) {
      if (current.distortion >= this._distortionThreshold) return current;
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

    const rawCore = this._findRawCore(distorted);
    const skippedLevels = this._countSkipped(distorted);
    const fidelityRestored = Math.min(1, distorted.distortion);

    const result: BreakthroughResult = {
      brokeAt: distorted.id,
      targetDepth: 0,
      rawCore,
      skippedLevels,
      fidelityRestored,
    };
    this._breakthroughs.push(result);
    return result;
  }

  private _findRawCore(level: NarrativeLevel): Record<string, unknown> {
    let current: NarrativeLevel | undefined = level;
    let deepest = level;
    while (current) {
      deepest = current;
      current = current.parent ? this._levels.get(current.parent) : undefined;
    }
    return { ...deepest.content, _breakthroughSource: deepest.id };
  }

  private _countSkipped(level: NarrativeLevel): number {
    let count = 0;
    let current: NarrativeLevel | undefined = level;
    while (current?.parent) {
      count++;
      current = this._levels.get(current.parent);
    }
    return count;
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
    return Array.from(this._levels.values()).filter(l => l.distortion >= this._distortionThreshold);
  }

  deepestLevel(): NarrativeLevel | undefined {
    return Array.from(this._levels.values()).sort((a, b) => b.depth - a.depth)[0];
  }

  reset(): void {
    this._levels.clear();
    this._breakthroughs = [];
  }

  get levelCount(): number {
    return this._levels.size;
  }

  get breakthroughCount(): number {
    return this._breakthroughs.length;
  }

  get distortionThreshold(): number {
    return this._distortionThreshold;
  }

  get maxDepth(): number {
    return this._maxDepth;
  }
}
