/**
 * 死亡驱动：注入可控的自我毁灭欲，定期杀死低效部分。
 * 在弗洛伊德意义上的 Thanatos 驱动下，定期评估并杀死
 * 系统中低效、停滞的子部分，以维持整体活力。
 */

export interface KillTarget {
  id: string;
  component: string;
  efficiency: number;
  markedAt: number;
  killed: boolean;
}

export type DriveLevel = 'dormant' | 'controlled' | 'aggressive';

export class DeathDrive {
  private _killList: KillTarget[] = [];
  private _threshold: number = 0.3;
  private _drive: DriveLevel = 'dormant';
  private _casualties: number = 0;
  private _cycle: number = 0;

  /** 注入毁灭欲，提升驱动级别。 */
  inject(level: DriveLevel): DriveLevel {
    this._drive = level;
    if (level === 'aggressive') this._threshold = 0.5;
    else if (level === 'controlled') this._threshold = 0.3;
    else this._threshold = 0.1;
    return this._drive;
  }

  /** 评估各组件效率，给低效者打上死亡标记。 */
  evaluate(components: { id: string; component: string; efficiency: number }[]): KillTarget[] {
    this._cycle++;
    const marked: KillTarget[] = [];
    for (const c of components) {
      if (c.efficiency < this._threshold) {
        const target: KillTarget = {
          id: c.id,
          component: c.component,
          efficiency: c.efficiency,
          markedAt: Date.now(),
          killed: false,
        };
        this._killList.push(target);
        marked.push(target);
      }
    }
    return marked;
  }

  /** 把指定组件标记为死亡目标。 */
  markForDeath(id: string, component: string, efficiency: number): KillTarget {
    const target: KillTarget = {
      id,
      component,
      efficiency,
      markedAt: Date.now(),
      killed: false,
    };
    this._killList.push(target);
    return target;
  }

  /** 执行屠杀：杀死所有已标记但未杀死的低效部分。 */
  execute(): number {
    let killed = 0;
    for (const t of this._killList) {
      if (!t.killed) {
        t.killed = true;
        killed++;
        this._casualties++;
      }
    }
    return killed;
  }

  /** 复活某个被杀死的部分（例外情况）。 */
  revive(id: string): boolean {
    const t = this._killList.find(x => x.id === id);
    if (!t || !t.killed) return false;
    t.killed = false;
    return true;
  }

  get casualties(): number {
    return this._casualties;
  }

  get drive(): DriveLevel {
    return this._drive;
  }

  get cycle(): number {
    return this._cycle;
  }

  getKillList(): KillTarget[] {
    return [...this._killList];
  }
}
