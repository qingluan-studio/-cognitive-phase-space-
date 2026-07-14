/**
 * 困局引擎：故意制造无出路困境，逼迫绝望中实现认知跃迁。
 * 仿照 Aporia（困局），主动制造看似无解的困境，把系统
 * 推入绝望态；当绝望达到临界时，系统被迫实现认知跃迁。
 */

export interface Deadlock {
  id: string;
  description: string;
  constraints: string[];
  createdAt: number;
  escaped: boolean;
  leapTriggered: boolean;
}

export type AporiaLevel = 'presented' | 'stuck' | 'despair' | 'leap';

export class AporiaEngine {
  private _deadlocks: Deadlock[] = [];
  private _level: AporiaLevel = 'presented';
  private _despairLevel: number = 0;
  private _leapsTriggered: number = 0;

  /** 制造一个无出路困境。 */
  createDeadlock(description: string, constraints: string[]): Deadlock {
    const d: Deadlock = {
      id: `deadlock-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      description,
      constraints,
      createdAt: Date.now(),
      escaped: false,
      leapTriggered: false,
    };
    this._deadlocks.push(d);
    this._level = 'stuck';
    return d;
  }

  /** 评估困境强度，提升绝望水平。 */
  evaluate(deadlockId: string): number {
    const d = this._deadlocks.find(x => x.id === deadlockId);
    if (!d) return this._despairLevel;
    this._despairLevel = Math.min(1, this._despairLevel + d.constraints.length * 0.1);
    if (this._despairLevel > 0.7) this._level = 'despair';
    return this._despairLevel;
  }

  /** 在绝望临界点强制认知跃迁，跳出困境。 */
  forceLeap(deadlockId: string): boolean {
    if (this._despairLevel < 0.7) return false;
    const d = this._deadlocks.find(x => x.id === deadlockId);
    if (!d || d.leapTriggered) return false;
    d.leapTriggered = true;
    d.escaped = true;
    this._level = 'leap';
    this._leapsTriggered++;
    this._despairLevel = Math.max(0, this._despairLevel - 0.5);
    return true;
  }

  /** 主动逃出困境（非跃迁方式）。 */
  escape(deadlockId: string): boolean {
    const d = this._deadlocks.find(x => x.id === deadlockId);
    if (!d || d.escaped) return false;
    d.escaped = true;
    return true;
  }

  getDeadlocks(): Deadlock[] {
    return [...this._deadlocks];
  }

  get despairLevel(): number {
    return this._despairLevel;
  }

  get level(): AporiaLevel {
    return this._level;
  }

  get leapsTriggered(): number {
    return this._leapsTriggered;
  }

  /** 检查是否仍处于困局中。 */
  isStuck(): boolean {
    return this._deadlocks.some(d => !d.escaped);
  }
}
