/**
 * 流放者回归模块：净化后的模块回归主流。
 * 流放期满且通过考察后，被允许重新接入主干网络。
 */

export interface ExileReturnData {
  candidate: string;
  eligible: boolean;
  pendingChecks: string[];
  returnedAt: number | null;
}

export class ExileReturn {
  private _candidate: string;
  private _purification: number;
  private _checks: string[];
  private _passed: Set<string>;
  private _returnedAt: number | null;

  constructor(candidate: string) {
    this._candidate = candidate;
    this._purification = 0;
    this._checks = ['stability', 'compatibility', 'security', 'behavior'];
    this._passed = new Set<string>();
    this._returnedAt = null;
  }

  get candidate(): string {
    return this._candidate;
  }

  get purification(): number {
    return this._purification;
  }

  get eligible(): boolean {
    return this._purification >= 80 && this._passed.size === this._checks.length;
  }

  public purify(amount: number): void {
    this._purification = Math.min(100, this._purification + amount);
  }

  public runCheck(name: string, pass: boolean): boolean {
    if (!this._checks.includes(name)) return false;
    if (pass) this._passed.add(name);
    else this._passed.delete(name);
    return pass;
  }

  public addCheck(name: string): void {
    if (!this._checks.includes(name)) this._checks.push(name);
  }

  public pendingChecks(): string[] {
    return this._checks.filter((c) => !this._passed.has(c));
  }

  public returnToMain(): boolean {
    if (!this.eligible) return false;
    this._returnedAt = Date.now();
    return true;
  }

  public report(): ExileReturnData {
    return {
      candidate: this._candidate,
      eligible: this.eligible,
      pendingChecks: this.pendingChecks(),
      returnedAt: this._returnedAt,
    };
  }
}
