/**
 * 承诺验证者模块：确保每个承诺都被履行。
 * 注册承诺、追踪状态，并把到期未履行者标记为违约。
 */

export interface PromiseVerifierData {
  pending: number;
  fulfilled: number;
  broken: number;
  promises: Array<{ id: string; status: string }>;
}

export interface TrackedPromise {
  id: string;
  description: string;
  due: number;
  fulfilled: boolean;
  broken: boolean;
}

export class PromiseVerifier {
  private _promises: Map<string, TrackedPromise>;
  private _now: () => number;

  constructor(now: () => number = () => Date.now()) {
    this._promises = new Map<string, TrackedPromise>();
    this._now = now;
  }

  get pendingCount(): number {
    let n = 0;
    for (const p of this._promises.values()) {
      if (!p.fulfilled && !p.broken) n += 1;
    }
    return n;
  }

  public register(id: string, description: string, dueInMs: number): void {
    this._promises.set(id, {
      id,
      description,
      due: this._now() + dueInMs,
      fulfilled: false,
      broken: false,
    });
  }

  public fulfill(id: string): boolean {
    const p = this._promises.get(id);
    if (!p || p.broken) return false;
    p.fulfilled = true;
    return true;
  }

  public tick(): string[] {
    const now = this._now();
    const broken: string[] = [];
    for (const [id, p] of this._promises) {
      if (!p.fulfilled && !p.broken && p.due < now) {
        p.broken = true;
        broken.push(id);
      }
    }
    return broken;
  }

  public cancel(id: string): void {
    this._promises.delete(id);
  }

  public statusOf(id: string): string {
    const p = this._promises.get(id);
    if (!p) return 'unknown';
    if (p.fulfilled) return 'fulfilled';
    if (p.broken) return 'broken';
    return 'pending';
  }

  public report(): PromiseVerifierData {
    let fulfilled = 0;
    let broken = 0;
    const list: Array<{ id: string; status: string }> = [];
    for (const p of this._promises.values()) {
      if (p.fulfilled) fulfilled += 1;
      if (p.broken) broken += 1;
      list.push({ id: p.id, status: this.statusOf(p.id) });
    }
    return { pending: this.pendingCount, fulfilled, broken, promises: list };
  }
}
