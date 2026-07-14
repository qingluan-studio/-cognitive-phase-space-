/**
 * 返回点映射模块：记录磁滞过程中的转折点，并保证小循环回到原状态的特性。
 * 用于建模嵌套回线与封闭子回路的记忆规则。
 */

export interface ReturnPoint {
  id: number;
  field: number;
  magnetization: number;
  parentId: number | null;
}

export type ReturnPointTree = {
  root: ReturnPoint | null;
  children: Map<number, ReturnPoint[]>;
};

export interface ReturnPointConfig {
  maxPoints: number;
  closureTolerance: number;
}

export class ReturnPointMap {
  private _config: ReturnPointConfig;
  private _points: ReturnPoint[] = [];
  private _tree: ReturnPointTree = { root: null, children: new Map() };
  private _currentParent: number | null = null;
  private _closureLog: Record<string, unknown> = {};

  constructor(config: ReturnPointConfig) {
    this._config = config;
  }

  get pointCount(): number {
    return this._points.length;
  }

  get currentParent(): number | null {
    return this._currentParent;
  }

  addPoint(field: number, magnetization: number): ReturnPoint {
    const id = this._points.length;
    const point: ReturnPoint = { id, field, magnetization, parentId: this._currentParent };
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
      this._points.shift();
    }
    return point;
  }

  closeLoop(): boolean {
    if (this._currentParent === null) return false;
    const parent = this._points.find((p) => p.id === this._currentParent);
    if (!parent) return false;
    const closed = Math.abs(parent.field) <= this._config.closureTolerance;
    this._closureLog.last = { parentId: parent.id, closed };
    this._currentParent = parent.parentId;
    return closed;
  }

  findNearest(field: number): ReturnPoint | null {
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

  descendantsOf(id: number): ReturnPoint[] {
    return this._tree.children.get(id) ?? [];
  }

  pathToRoot(id: number): ReturnPoint[] {
    const path: ReturnPoint[] = [];
    let cur = this._points.find((p) => p.id === id);
    while (cur) {
      path.push(cur);
      cur = cur.parentId === null ? undefined : this._points.find((p) => p.id === cur!.parentId);
    }
    return path;
  }

  resetToRoot(): void {
    this._currentParent = null;
    this._closureLog.resetAt = Date.now();
  }

  snapshot(): Record<string, unknown> {
    return {
      points: this._points.length,
      currentParent: this._currentParent,
      closureLog: this._closureLog,
    };
  }
}
