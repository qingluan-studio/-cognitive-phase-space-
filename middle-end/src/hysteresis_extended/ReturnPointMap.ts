export interface ReturnPoint {
  id: number;
  field: number;
  magnetization: number;
  parentId: number | null;
  depth: number;
}

export type ReturnPointTree = {
  root: ReturnPoint | null;
  children: Map<number, ReturnPoint[]>;
};

export interface ReturnPointConfig {
  maxPoints: number;
  closureTolerance: number;
  wipingOutThreshold: number;
}

export class ReturnPointMap {
  private _config: ReturnPointConfig;
  private _points: ReturnPoint[] = [];
  private _tree: ReturnPointTree = { root: null, children: new Map() };
  private _currentParent: number | null = null;
  private _closureLog: Record<string, unknown> = {};
  private _closedLoops: number = 0;

  constructor(config: ReturnPointConfig) {
    this._config = config;
  }

  get pointCount(): number {
    return this._points.length;
  }

  get currentParent(): number | null {
    return this._currentParent;
  }

  get closedLoops(): number {
    return this._closedLoops;
  }

  public addPoint(field: number, magnetization: number): ReturnPoint {
    const id = this._points.length;
    const depth = this._currentParent === null ? 0 : this._depthOf(this._currentParent) + 1;
    const point: ReturnPoint = { id, field, magnetization, parentId: this._currentParent, depth };
    this._points.push(point);
    if (this._currentParent === null) {
      this._tree.root = point;
    } else {
      const siblings = this._tree.children.get(this._currentParent) ?? [];
      siblings.push(point);
      this._tree.children.set(this._currentParent, siblings);
    }
    this._tree.children.set(id, []);
    this._currentParent = id;
    if (this._points.length > this._config.maxPoints) {
      const removed = this._points.shift();
      if (removed) this._tree.children.delete(removed.id);
    }
    return point;
  }

  private _depthOf(id: number): number {
    const point = this._points.find((p) => p.id === id);
    return point ? point.depth : 0;
  }

  public closeLoop(): boolean {
    if (this._currentParent === null) return false;
    const parent = this._points.find((p) => p.id === this._currentParent);
    if (!parent) return false;
    const fieldDiff = Math.abs(parent.field);
    const closed = fieldDiff <= this._config.closureTolerance;
    if (closed) this._closedLoops++;
    this._closureLog.last = { parentId: parent.id, closed, fieldDiff };
    this._currentParent = parent.parentId;
    return closed;
  }

  public wipingOut(field: number): number {
    let wiped = 0;
    for (const point of this._points) {
      if (Math.abs(point.field) > Math.abs(field) + this._config.wipingOutThreshold) {
        this._tree.children.delete(point.id);
        wiped++;
      }
    }
    if (wiped > 0) {
      this._points = this._points.filter((p) => Math.abs(p.field) <= Math.abs(field) + this._config.wipingOutThreshold);
    }
    this._closureLog.wipeOut = { field, wiped };
    return wiped;
  }

  public findNearest(field: number): ReturnPoint | null {
    let nearest: ReturnPoint | null = null;
    let best = Infinity;
    for (const p of this._points) {
      const d = Math.abs(p.field - field);
      if (d < best) {
        best = d;
        nearest = p;
      }
    }
    return nearest;
  }

  public descendantsOf(id: number): ReturnPoint[] {
    return this._tree.children.get(id) ?? [];
  }

  public pathToRoot(id: number): ReturnPoint[] {
    const path: ReturnPoint[] = [];
    let cur = this._points.find((p) => p.id === id);
    while (cur) {
      path.push(cur);
      cur = cur.parentId === null ? undefined : this._points.find((p) => p.id === cur!.parentId);
    }
    return path;
  }

  public maxDepth(): number {
    if (this._points.length === 0) return 0;
    return Math.max(...this._points.map((p) => p.depth));
  }

  public loopArea(id: number): number {
    const path = this.pathToRoot(id);
    if (path.length < 2) return 0;
    let area = 0;
    for (let i = 1; i < path.length; i++) {
      const dF = path[i].field - path[i - 1].field;
      const avgM = (path[i].magnetization + path[i - 1].magnetization) / 2;
      area += avgM * dF;
    }
    return Math.abs(area);
  }

  public resetToRoot(): void {
    this._currentParent = null;
    this._closureLog.resetAt = Date.now();
  }

  public snapshot(): Record<string, unknown> {
    return {
      points: this._points.length,
      currentParent: this._currentParent,
      closedLoops: this._closedLoops,
      maxDepth: this.maxDepth(),
      closureLog: this._closureLog,
    };
  }
}
