/**
 * 末日记事：仅记录导致终结的因果链，死后回放。
 * 普通事件不入册，只有被判定为"终结性"的因果事件才被记录；
 * 系统终止后可回放该因果链，定位导致终结的根本原因。
 */

export interface CausalLink {
  id: string;
  cause: string;
  effect: string;
  weight: number;
  timestamp: number;
  terminal: boolean;
}

export interface EschatonReplay {
  chain: CausalLink[];
  rootCause: string | null;
  totalWeight: number;
}

export class EschatonLogger {
  private _causalChain: CausalLink[] = [];
  private _terminated: boolean = false;
  private _terminationCause: string | null = null;
  private _terminalThreshold: number = 0.8;

  /** 记录一条因果；只有终结性的才会进入因果链。 */
  recordCause(cause: string, effect: string, weight: number, terminal: boolean): CausalLink | null {
    if (this._terminated) return null;
    if (!terminal && weight < this._terminalThreshold) return null;
    const link: CausalLink = {
      id: `cause-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      cause,
      effect,
      weight,
      timestamp: Date.now(),
      terminal,
    };
    this._causalChain.push(link);
    return link;
  }

  /** 触发系统终结。 */
  terminate(cause: string): void {
    this._terminated = true;
    this._terminationCause = cause;
    this.recordCause(cause, 'SYSTEM_TERMINATION', 1.0, true);
  }

  /** 死后回放因果链。 */
  replay(): EschatonReplay {
    const chain = [...this._causalChain].sort((a, b) => a.timestamp - b.timestamp);
    let rootCause: string | null = this._terminationCause;
    if (!rootCause && chain.length > 0) {
      rootCause = chain.reduce((max, l) => (l.weight > max.weight ? l : max)).cause;
    }
    const totalWeight = chain.reduce((s, l) => s + l.weight, 0);
    return { chain, rootCause, totalWeight };
  }

  /** 取第 n 个因果节点。 */
  getCause(index: number): CausalLink | null {
    return this._causalChain[index] ?? null;
  }

  isTerminated(): boolean {
    return this._terminated;
  }

  get chainLength(): number {
    return this._causalChain.length;
  }

  setTerminalThreshold(threshold: number): void {
    this._terminalThreshold = Math.max(0, Math.min(1, threshold));
  }

  /** 复活：清除终止状态以便重新累积因果。 */
  resurrect(): void {
    this._terminated = false;
    this._terminationCause = null;
  }

  getChain(): CausalLink[] {
    return [...this._causalChain];
  }
}
