/**
 * 转喻栈模块：层层嵌套引用穿透，从表层包装逐层
 * 深入直达原始数据本质，每层引用都可独立追踪与剥离。
 */

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

export class MetalepsisStack {
  private _frames: Map<string, MetalepticFrame> = new Map();
  private _stack: string[] = [];
  private _maxDepth = 10;
  private _unwrapCount = 0;

  pushFrame(frame: MetalepticFrame): void {
    this._frames.set(frame.id, frame);
    this._stack.push(frame.id);
    if (this._stack.length > this._maxDepth) {
      this._stack.shift();
    }
  }

  popFrame(): MetalepticFrame | undefined {
    const id = this._stack.pop();
    if (!id) return undefined;
    return this._frames.get(id);
  }

  peek(): MetalepticFrame | undefined {
    const topId = this._stack[this._stack.length - 1];
    return topId ? this._frames.get(topId) : undefined;
  }

  unwrap(targetId?: string): UnwrappedCore {
    const traversed: string[] = [];
    let currentId: string | null = targetId ?? this._stack[this._stack.length - 1] ?? null;
    let core: Record<string, unknown> = {};
    let depth = 0;

    while (currentId && depth < this._maxDepth) {
      const frame = this._frames.get(currentId);
      if (!frame) break;
      traversed.push(frame.id);
      core = this._mergeWrapper(core, frame.wrapper);
      currentId = frame.reference;
      depth++;
    }

    this._unwrapCount++;
    return { core, depth, traversedFrames: traversed, unwrappedAt: Date.now() };
  }

  private _mergeWrapper(accumulated: Record<string, unknown>, wrapper: Record<string, unknown>): Record<string, unknown> {
    return { ...wrapper, ...accumulated };
  }

  wrap(core: Record<string, unknown>, wrapper: Record<string, unknown>, metadata: Record<string, unknown> = {}): MetalepticFrame {
    const id = `frame-${this._frames.size}`;
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
    for (const id of this._stack) {
      const frame = this._frames.get(id);
      if (frame) {
        for (const [key, value] of Object.entries(frame.wrapper)) {
          if (!(key in result)) result[key] = value;
        }
      }
    }
    return result;
  }

  setMaxDepth(max: number): void {
    this._maxDepth = Math.max(1, max);
  }

  reset(): void {
    this._frames.clear();
    this._stack = [];
    this._unwrapCount = 0;
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
}
