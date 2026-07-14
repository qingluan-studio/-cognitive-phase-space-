/**
 * 递归锚模块：防止无限递归的强制终止点。
 * 在递归调用链上钉入锚点，超过深度或重复度阈值即截断。
 */

export interface RecursionAnchorData {
  depth: number;
  maxDepth: number;
  anchors: string[];
  triggered: boolean;
}

export class RecursionAnchor {
  private _depth: number;
  private _maxDepth: number;
  private _anchors: string[];
  private _triggered: boolean;
  private _visited: Map<string, number>;

  constructor(maxDepth: number = 100) {
    this._depth = 0;
    this._maxDepth = maxDepth;
    this._anchors = [];
    this._triggered = false;
    this._visited = new Map<string, number>();
  }

  get depth(): number {
    return this._depth;
  }

  get triggered(): boolean {
    return this._triggered;
  }

  public enter(key: string): boolean {
    this._depth += 1;
    const visits = (this._visited.get(key) ?? 0) + 1;
    this._visited.set(key, visits);
    if (this._depth >= this._maxDepth || visits > 3) {
      this._triggered = true;
      this._anchors.push(`cut@${key}`);
      return false;
    }
    return true;
  }

  public leave(): void {
    if (this._depth > 0) this._depth -= 1;
  }

  public setMaxDepth(d: number): void {
    this._maxDepth = Math.max(1, d);
  }

  public reset(): void {
    this._depth = 0;
    this._anchors = [];
    this._triggered = false;
    this._visited.clear();
  }

  public anchorsPlaced(): string[] {
    return [...this._anchors];
  }

  public report(): RecursionAnchorData {
    return {
      depth: this._depth,
      maxDepth: this._maxDepth,
      anchors: [...this._anchors],
      triggered: this._triggered,
    };
  }
}
