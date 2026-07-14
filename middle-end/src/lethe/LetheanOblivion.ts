/**
 * 遗忘湮灭：选择性永久浸泡记忆，制造遗忘以减轻过载。
 * 仿照 Lethe 遗忘之河，选择性地把指定记忆永久浸泡
 * (湮灭)，使其不可恢复，从而减轻系统记忆过载。
 */

export interface SubmergedMemory {
  id: string;
  content: Record<string, unknown>;
  submergedAt: number;
  permanent: boolean;
}

export type OblivionMode = 'selective' | 'bulk' | 'cascading';

export class LetheanOblivion {
  private _submerged: SubmergedMemory[] = [];
  private _mode: OblivionMode = 'selective';
  private _overloadLevel: number = 0;
  private _permanentlyLost: number = 0;

  /** 把一条记忆永久浸泡入遗忘河。 */
  submerge(id: string, content: Record<string, unknown>, permanent: boolean = true): SubmergedMemory {
    const m: SubmergedMemory = {
      id,
      content,
      submergedAt: Date.now(),
      permanent,
    };
    this._submerged.push(m);
    if (permanent) this._permanentlyLost++;
    this._overloadLevel = Math.max(0, this._overloadLevel - 0.1);
    return m;
  }

  /** 批量遗忘：把多条记忆一次性浸泡。 */
  forget(memories: { id: string; content: Record<string, unknown> }[]): number {
    this._mode = 'bulk';
    for (const m of memories) {
      this.submerge(m.id, m.content, true);
    }
    return memories.length;
  }

  /** 尝试从遗忘河中恢复记忆；永久浸泡的不可恢复。 */
  recover(id: string): Record<string, unknown> | null {
    const idx = this._submerged.findIndex(m => m.id === id);
    if (idx < 0) return null;
    const m = this._submerged[idx];
    if (m.permanent) return null;
    this._submerged.splice(idx, 1);
    return m.content;
  }

  /** 评估当前系统过载水平。 */
  evaluate(overload: number): number {
    this._overloadLevel = overload;
    return this._overloadLevel;
  }

  /** 级联遗忘：过载过高时自动扩大遗忘范围。 */
  drown(threshold: number = 0.8): number {
    this._mode = 'cascading';
    if (this._overloadLevel < threshold) return 0;
    const toDrown = Math.floor(this._submerged.length * 0.3);
    for (let i = 0; i < toDrown; i++) {
      const m = this._submerged[i];
      if (!m.permanent) {
        m.permanent = true;
        this._permanentlyLost++;
      }
    }
    return toDrown;
  }

  getSubmerged(): SubmergedMemory[] {
    return [...this._submerged];
  }

  get mode(): OblivionMode {
    return this._mode;
  }

  get permanentlyLost(): number {
    return this._permanentlyLost;
  }

  get overloadLevel(): number {
    return this._overloadLevel;
  }
}
