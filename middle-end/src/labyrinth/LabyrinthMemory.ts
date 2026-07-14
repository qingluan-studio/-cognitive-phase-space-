/**
 * 迷宫记忆模块：记住走过的错路以防重复。
 * 维护一张已访问节点表，配合方向偏好，提高后续寻路效率。
 */

export interface LabyrinthMemoryData {
  visited: string[];
  deadEnds: string[];
  edges: Array<{ from: string; to: string }>;
}

export class LabyrinthMemory {
  private _visited: Set<string>;
  private _deadEnds: Set<string>;
  private _edges: Map<string, Set<string>>;
  private _preference: Map<string, string>;

  constructor() {
    this._visited = new Set<string>();
    this._deadEnds = new Set<string>();
    this._edges = new Map<string, Set<string>>();
    this._preference = new Map<string, string>();
  }

  get visited(): string[] {
    return Array.from(this._visited);
  }

  get deadEnds(): string[] {
    return Array.from(this._deadEnds);
  }

  public markVisited(node: string): void {
    this._visited.add(node);
  }

  public recordEdge(from: string, to: string): void {
    if (!this._edges.has(from)) this._edges.set(from, new Set<string>());
    this._edges.get(from)!.add(to);
  }

  public markDeadEnd(node: string): void {
    this._deadEnds.add(node);
  }

  public isDeadEnd(node: string): boolean {
    return this._deadEnds.has(node);
  }

  public nextFrom(node: string): string | null {
    const preferred = this._preference.get(node);
    if (preferred && !this._deadEnds.has(preferred)) return preferred;
    const neighbors = this._edges.get(node);
    if (!neighbors) return null;
    for (const n of neighbors) {
      if (!this._deadEnds.has(n)) return n;
    }
    return null;
  }

  public setPreference(node: string, target: string): void {
    this._preference.set(node, target);
  }

  public report(): LabyrinthMemoryData {
    const edges: Array<{ from: string; to: string }> = [];
    for (const [from, tos] of this._edges) {
      for (const to of tos) edges.push({ from, to });
    }
    return {
      visited: this.visited,
      deadEnds: this.deadEnds,
      edges,
    };
  }

  public forget(node: string): void {
    this._visited.delete(node);
    this._deadEnds.delete(node);
    this._edges.delete(node);
    this._preference.delete(node);
  }
}
