/**
 * 归乡融合模块：流放模块回归并与核心重新整合。
 * 把流放期间积累的能力并入主核心，处理合并冲突并产出统一接口。
 */

export interface HomecomingMergeData {
  incoming: string[];
  merged: string[];
  conflicts: string[];
  integrated: boolean;
}

export class HomecomingMerge {
  private _incoming: string[];
  private _merged: string[];
  private _conflicts: string[];
  private _integrated: boolean;
  private _coreCapabilities: Set<string>;

  constructor(coreCapabilities: string[] = []) {
    this._incoming = [];
    this._merged = [];
    this._conflicts = [];
    this._integrated = false;
    this._coreCapabilities = new Set<string>(coreCapabilities);
  }

  get incomingCount(): number {
    return this._incoming.length;
  }

  get conflictCount(): number {
    return this._conflicts.length;
  }

  public arrive(capability: string): void {
    if (!this._incoming.includes(capability)) this._incoming.push(capability);
  }

  public merge(capability: string): boolean {
    if (this._coreCapabilities.has(capability)) {
      this._conflicts.push(capability);
      return false;
    }
    this._coreCapabilities.add(capability);
    this._merged.push(capability);
    this._incoming = this._incoming.filter((c) => c !== capability);
    return true;
  }

  public resolveConflict(capability: string, rename: string): void {
    if (this._conflicts.includes(capability)) {
      this._coreCapabilities.add(rename);
      this._merged.push(rename);
      this._conflicts = this._conflicts.filter((c) => c !== capability);
    }
  }

  public integrate(): boolean {
    if (this._incoming.length > 0 || this._conflicts.length > 0) return false;
    this._integrated = true;
    return true;
  }

  public capabilities(): string[] {
    return Array.from(this._coreCapabilities);
  }

  public report(): HomecomingMergeData {
    return {
      incoming: [...this._incoming],
      merged: [...this._merged],
      conflicts: [...this._conflicts],
      integrated: this._integrated,
    };
  }
}
