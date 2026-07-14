/**
 * 遗忘栈：主动遗忘无用长期记忆，提升系统速度。
 * 长期记忆被压入栈底逐渐淡化，访问越少的记忆越早被遗忘；
 * 系统通过主动遗忘降低负载、维持响应速度。
 */

export interface MemoryItem {
  id: string;
  content: Record<string, unknown>;
  weight: number;
  pushedAt: number;
  accessCount: number;
}

export type ForgettingPolicy = 'lru' | 'decay' | 'aggressive';

export class AmnesiaStack {
  private _stack: MemoryItem[] = [];
  private _forgetThreshold: number = 0.1;
  private _policy: ForgettingPolicy = 'decay';
  private _forgotten: number = 0;

  push(item: MemoryItem): number {
    this._stack.push(item);
    return this._stack.length;
  }

  pop(): MemoryItem | null {
    return this._stack.pop() ?? null;
  }

  /** 访问栈中某项，增加其权重防止被遗忘。 */
  recover(id: string): MemoryItem | null {
    const item = this._stack.find(m => m.id === id);
    if (!item) return null;
    item.accessCount++;
    item.weight = Math.min(1, item.weight + 0.1);
    return item;
  }

  /** 主动遗忘：按策略清理低权重记忆。 */
  forget(): number {
    const before = this._stack.length;
    if (this._policy === 'lru') {
      this._stack.sort((a, b) => a.accessCount - b.accessCount);
    } else if (this._policy === 'decay') {
      const now = Date.now();
      for (const m of this._stack) {
        const age = (now - m.pushedAt) / 1000;
        m.weight = Math.max(0, m.weight - age * 0.01);
      }
    } else {
      this._stack.forEach(m => (m.weight *= 0.5));
    }
    this._stack = this._stack.filter(m => {
      if (m.weight < this._forgetThreshold) {
        this._forgotten++;
        return false;
      }
      return true;
    });
    return before - this._stack.length;
  }

  getMemoryLoad(): number {
    return this._stack.reduce((sum, m) => sum + m.weight, 0);
  }

  setPolicy(policy: ForgettingPolicy): void {
    this._policy = policy;
  }

  setThreshold(threshold: number): void {
    this._forgetThreshold = Math.max(0, Math.min(1, threshold));
  }

  get depth(): number {
    return this._stack.length;
  }

  get forgottenCount(): number {
    return this._forgotten;
  }

  getStack(): MemoryItem[] {
    return [...this._stack];
  }
}
