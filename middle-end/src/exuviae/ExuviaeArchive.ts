/**
 * 蜕皮档案：存储所有历史版本的壳，供复活/回滚/考古。
 * 把每次蜕皮产生的旧壳持久化存储，支持按版本复活、
 * 回滚到历史状态，以及对历史壳的考古分析。
 */

export interface Shell {
  id: string;
  module: string;
  version: string;
  state: Record<string, unknown>;
  storedAt: number;
  resurrected: boolean;
}

export interface ArchaeologyReport {
  module: string;
  versions: number;
  lineage: string[];
}

export class ExuviaeArchive {
  private _shells: Map<string, Shell> = new Map();
  private _indexByModule: Map<string, string[]> = new Map();

  /** 存入一枚历史壳。 */
  store(shell: Shell): Shell {
    this._shells.set(shell.id, shell);
    const list = this._indexByModule.get(shell.module) ?? [];
    list.push(shell.id);
    this._indexByModule.set(shell.module, list);
    return shell;
  }

  /** 取回指定历史壳。 */
  retrieve(id: string): Shell | null {
    return this._shells.get(id) ?? null;
  }

  /** 从历史壳复活模块：取出最新非复活壳。 */
  resurrect(module: string): Shell | null {
    const ids = this._indexByModule.get(module) ?? [];
    for (let i = ids.length - 1; i >= 0; i--) {
      const shell = this._shells.get(ids[i]);
      if (shell && !shell.resurrected) {
        shell.resurrected = true;
        return shell;
      }
    }
    return null;
  }

  /** 回滚到指定历史壳。 */
  rollback(module: string, version: string): Shell | null {
    const ids = this._indexByModule.get(module) ?? [];
    for (const id of ids) {
      const shell = this._shells.get(id);
      if (shell && shell.version === version) return shell;
    }
    return null;
  }

  /** 考古：对模块历史进行谱系分析。 */
  archaeology(module: string): ArchaeologyReport {
    const ids = this._indexByModule.get(module) ?? [];
    const versions = ids
      .map(id => this._shells.get(id)?.version)
      .filter((v): v is string => !!v);
    return { module, versions: versions.length, lineage: versions };
  }

  getShells(): Shell[] {
    return [...this._shells.values()];
  }

  get moduleCount(): number {
    return this._indexByModule.size;
  }

  /** 按模块枚举所有壳。 */
  byModule(module: string): Shell[] {
    return (this._indexByModule.get(module) ?? [])
      .map(id => this._shells.get(id))
      .filter((s): s is Shell => !!s);
  }
}
