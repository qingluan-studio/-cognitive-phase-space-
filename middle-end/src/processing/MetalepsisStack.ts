export interface MetalepticFrame {
  id: string;
  level: number;
  reference: string | null;
  wrapper: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface UnwrappedCore {
  core: Record<string, unknown>;
  depth: number;
  traversedFrames: string[];
  unwrappedAt: number;
}

interface CycleInfo {
  detected: boolean;
  cycleStart: string | null;
  cycleLength: number;
  path: string[];
}

interface LayerResolution {
  frameId: string;
  layerDepth: number;
  resolved: boolean;
  confidence: number;
  shadowKeys: string[];
}

export class MetalepsisStack {
  private _frames: Map<string, MetalepticFrame> = new Map();
  private _stack: string[] = [];
  private _maxDepth = 10;
  private _unwrapCount = 0;
  private _cycleCache: Map<string, CycleInfo> = new Map();
  private _layerMemo: Map<string, LayerResolution[]> = new Map();
  private _shadowState: Map<string, Map<string, number>> = new Map();

  pushFrame(frame: MetalepticFrame): void {
    this._frames.set(frame.id, frame);
    this._stack.push(frame.id);
    this._invalidateCaches();
    if (this._stack.length > this._maxDepth) {
      this._stack.shift();
    }
  }

  popFrame(): MetalepticFrame | undefined {
    const id = this._stack.pop();
    if (!id) return undefined;
    this._invalidateCaches();
    return this._frames.get(id);
  }

  peek(): MetalepticFrame | undefined {
    const topId = this._stack[this._stack.length - 1];
    return topId ? this._frames.get(topId) : undefined;
  }

  unwrap(targetId?: string): UnwrappedCore {
    const traversed: string[] = [];
    const visited = new Set<string>();
    let currentId: string | null = targetId ?? this._stack[this._stack.length - 1] ?? null;
    let core: Record<string, unknown> = {};
    let depth = 0;

    while (currentId && depth < this._maxDepth && !visited.has(currentId)) {
      const frame = this._frames.get(currentId);
      if (!frame) break;
      visited.add(currentId);
      traversed.push(frame.id);
      core = this._mergeWrapper(core, frame.wrapper, depth);
      this._trackShadow(core, frame.wrapper, frame.id);
      currentId = frame.reference;
      depth++;
    }

    if (currentId && visited.has(currentId)) {
      this._recordCycle(traversed, currentId);
    }

    this._unwrapCount++;
    this._cacheLayerResolution(traversed, core);
    return { core, depth, traversedFrames: traversed, unwrappedAt: Date.now() };
  }

  private _mergeWrapper(
    accumulated: Record<string, unknown>,
    wrapper: Record<string, unknown>,
    depth: number
  ): Record<string, unknown> {
    const result: Record<string, unknown> = { ...accumulated };
    const weight = 1 / (depth + 1);
    
    for (const [key, value] of Object.entries(wrapper)) {
      if (!(key in result)) {
        result[key] = value;
      } else {
        const existing = result[key];
        if (typeof existing === 'number' && typeof value === 'number') {
          result[key] = existing * (1 - weight) + value * weight;
        } else if (typeof existing === 'object' && typeof value === 'object' && existing !== null && value !== null) {
          result[key] = this._deepMerge(
            existing as Record<string, unknown>,
            value as Record<string, unknown>,
            weight
          );
        } else {
          result[key] = value;
        }
      }
    }
    
    return result;
  }

  private _deepMerge(
    a: Record<string, unknown>,
    b: Record<string, unknown>,
    weight: number
  ): Record<string, unknown> {
    const result: Record<string, unknown> = { ...a };
    for (const [key, val] of Object.entries(b)) {
      if (!(key in result)) {
        result[key] = val;
      } else {
        const existing = result[key];
        if (typeof existing === 'number' && typeof val === 'number') {
          result[key] = existing * (1 - weight) + val * weight;
        } else {
          result[key] = val;
        }
      }
    }
    return result;
  }

  private _trackShadow(
    core: Record<string, unknown>,
    wrapper: Record<string, unknown>,
    frameId: string
  ): void {
    if (!this._shadowState.has(frameId)) {
      this._shadowState.set(frameId, new Map());
    }
    const shadows = this._shadowState.get(frameId)!;
    for (const key of Object.keys(wrapper)) {
      if (key in core && core[key] !== wrapper[key]) {
        const current = shadows.get(key) ?? 0;
        shadows.set(key, current + 1);
      }
    }
  }

  private _recordCycle(path: string[], cycleNode: string): void {
    const cycleStartIdx = path.indexOf(cycleNode);
    const cyclePath = cycleStartIdx >= 0 ? path.slice(cycleStartIdx) : path;
    const cycleKey = cyclePath.join('->');
    if (!this._cycleCache.has(cycleKey)) {
      this._cycleCache.set(cycleKey, {
        detected: true,
        cycleStart: cycleNode,
        cycleLength: cyclePath.length,
        path: cyclePath,
      });
    }
  }

  private _cacheLayerResolution(traversed: string[], core: Record<string, unknown>): void {
    const key = traversed.join('|');
    if (this._layerMemo.has(key)) return;
    
    const resolutions: LayerResolution[] = traversed.map((frameId, idx) => {
      const frame = this._frames.get(frameId);
      const wrapperKeys = frame ? Object.keys(frame.wrapper) : [];
      const coreKeys = Object.keys(core);
      const shadowKeys = wrapperKeys.filter(k => {
        const v = core[k];
        const fv = frame?.wrapper[k];
        return v !== undefined && fv !== undefined && v !== fv;
      });
      const coverage = wrapperKeys.length === 0 ? 1 :
        (wrapperKeys.length - shadowKeys.length) / wrapperKeys.length;
      return {
        frameId,
        layerDepth: idx,
        resolved: true,
        confidence: coverage,
        shadowKeys,
      };
    });
    
    this._layerMemo.set(key, resolutions);
  }

  detectCycle(fromId: string): CycleInfo {
    const cacheKey = `check:${fromId}`;
    if (this._cycleCache.has(cacheKey)) {
      return this._cycleCache.get(cacheKey)!;
    }
    
    const visited = new Set<string>();
    const path: string[] = [];
    let currentId: string | null = fromId;
    
    while (currentId) {
      if (visited.has(currentId)) {
        const cycleStartIdx = path.indexOf(currentId);
        const cyclePath = cycleStartIdx >= 0 ? path.slice(cycleStartIdx) : [...path, currentId];
        const result: CycleInfo = {
          detected: true,
          cycleStart: currentId,
          cycleLength: cyclePath.length,
          path: cyclePath,
        };
        this._cycleCache.set(cacheKey, result);
        return result;
      }
      visited.add(currentId);
      path.push(currentId);
      const frame = this._frames.get(currentId);
      if (!frame) break;
      currentId = frame.reference;
    }
    
    const result: CycleInfo = {
      detected: false,
      cycleStart: null,
      cycleLength: 0,
      path,
    };
    this._cycleCache.set(cacheKey, result);
    return result;
  }

  wrap(core: Record<string, unknown>, wrapper: Record<string, unknown>, metadata: Record<string, unknown> = {}): MetalepticFrame {
    const id = `frame-${this._frames.size}-${Date.now().toString(36)}`;
    const reference = this._stack[this._stack.length - 1] ?? null;
    const frame: MetalepticFrame = {
      id,
      level: this._stack.length,
      reference,
      wrapper: { ...wrapper, _core: core },
      metadata,
    };
    this.pushFrame(frame);
    return frame;
  }

  getFrame(id: string): MetalepticFrame | undefined {
    return this._frames.get(id);
  }

  depthOf(id: string): number {
    const frame = this._frames.get(id);
    return frame?.level ?? -1;
  }

  flatten(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const depths: Map<string, number> = new Map();
    
    for (let i = this._stack.length - 1; i >= 0; i--) {
      const frame = this._frames.get(this._stack[i]);
      if (!frame) continue;
      const depth = this._stack.length - 1 - i;
      for (const [key, value] of Object.entries(frame.wrapper)) {
        if (!(key in result) || depth < (depths.get(key) ?? Infinity)) {
          result[key] = value;
          depths.set(key, depth);
        }
      }
    }
    return result;
  }

  setMaxDepth(max: number): void {
    this._maxDepth = Math.max(1, max);
    this._invalidateCaches();
  }

  private _invalidateCaches(): void {
    this._cycleCache.clear();
    this._layerMemo.clear();
  }

  layerResolutions(fromId?: string): LayerResolution[] {
    const startId = fromId ?? this._stack[this._stack.length - 1];
    if (!startId) return [];
    
    const key = this._buildMemoKey(startId);
    if (this._layerMemo.has(key)) {
      return this._layerMemo.get(key)!;
    }
    
    this.unwrap(startId);
    return this._layerMemo.get(key) ?? [];
  }

  private _buildMemoKey(startId: string): string {
    const ids: string[] = [];
    let current: string | null = startId;
    const visited = new Set<string>();
    while (current && !visited.has(current)) {
      visited.add(current);
      ids.push(current);
      const frame = this._frames.get(current);
      current = frame?.reference ?? null;
    }
    return ids.join('|');
  }

  reset(): void {
    this._frames.clear();
    this._stack = [];
    this._unwrapCount = 0;
    this._cycleCache.clear();
    this._layerMemo.clear();
    this._shadowState.clear();
  }

  get frameCount(): number {
    return this._frames.size;
  }

  get stackDepth(): number {
    return this._stack.length;
  }

  get unwrapCount(): number {
    return this._unwrapCount;
  }

  get maxDepth(): number {
    return this._maxDepth;
  }

  get cycleCount(): number {
    return Array.from(this._cycleCache.values()).filter(c => c.detected).length;
  }
}
