export interface ExileReturnData {
  candidate: string;
  eligible: boolean;
  pendingChecks: string[];
  returnedAt: number | null;
  purification: number;
  trustScore: number;
}

interface _CheckEntry {
  name: string;
  passed: boolean;
  weight: number;
  attempts: number;
  lastAttempt: number;
}

export class ExileReturn {
  private _candidate: string;
  private _purification: number;
  private _checks: Map<string, _CheckEntry>;
  private _returnedAt: number | null;
  private _sponsorships: string[];
  private _decayRate: number;

  constructor(candidate: string, decayRate: number = 0.995) {
    this._candidate = candidate;
    this._purification = 0;
    this._checks = new Map<string, _CheckEntry>();
    const defaults = [
      { name: 'stability', weight: 0.3 },
      { name: 'compatibility', weight: 0.25 },
      { name: 'security', weight: 0.3 },
      { name: 'behavior', weight: 0.15 },
    ];
    for (const d of defaults) {
      this._checks.set(d.name, { name: d.name, passed: false, weight: d.weight, attempts: 0, lastAttempt: 0 });
    }
    this._returnedAt = null;
    this._sponsorships = [];
    this._decayRate = decayRate;
  }

  get candidate(): string {
    return this._candidate;
  }

  get purification(): number {
    return this._purification;
  }

  get trustScore(): number {
    if (this._checks.size === 0) return 0;
    let acc = 0;
    let total = 0;
    for (const c of this._checks.values()) {
      acc += (c.passed ? 1 : 0) * c.weight;
      total += c.weight;
    }
    const purityFactor = this._purification / 100;
    const sponsorFactor = Math.min(1, this._sponsorships.length / 3);
    return total === 0 ? 0 : (acc / total) * 0.6 + purityFactor * 0.3 + sponsorFactor * 0.1;
  }

  get eligible(): boolean {
    return this._purification >= 80 && this._allChecksPassed();
  }

  private _allChecksPassed(): boolean {
    for (const c of this._checks.values()) {
      if (!c.passed) return false;
    }
    return true;
  }

  public purify(amount: number): void {
    this._purification = Math.min(100, this._purification + amount);
  }

  public decay(amount: number = 1): void {
    this._purification = Math.max(0, this._purification - amount * this._decayRate);
    for (const c of this._checks.values()) {
      if (c.passed && Math.random() < 0.01) {
        c.passed = false;
      }
    }
  }

  public runCheck(name: string, pass: boolean): boolean {
    const check = this._checks.get(name);
    if (!check) return false;
    check.attempts += 1;
    check.lastAttempt = Date.now();
    check.passed = pass;
    if (pass) this._purification = Math.min(100, this._purification + check.weight * 20);
    else this._purification = Math.max(0, this._purification - check.weight * 10);
    return pass;
  }

  public addCheck(name: string, weight: number = 0.1): void {
    if (!this._checks.has(name)) {
      this._checks.set(name, { name, passed: false, weight, attempts: 0, lastAttempt: 0 });
    }
  }

  public sponsor(name: string): boolean {
    if (this._sponsorships.includes(name)) return false;
    this._sponsorships.push(name);
    this._purification = Math.min(100, this._purification + 5);
    return true;
  }

  public withdrawSponsorship(name: string): boolean {
    const idx = this._sponsorships.indexOf(name);
    if (idx < 0) return false;
    this._sponsorships.splice(idx, 1);
    this._purification = Math.max(0, this._purification - 5);
    return true;
  }

  public pendingChecks(): string[] {
    const pending: string[] = [];
    for (const c of this._checks.values()) {
      if (!c.passed) pending.push(c.name);
    }
    return pending;
  }

  public checkReliability(name: string): number {
    const check = this._checks.get(name);
    if (!check || check.attempts === 0) return 0;
    return check.passed ? 1 : 0;
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
      purification: this._purification,
      trustScore: this.trustScore,
    };
  }
}
