export interface BanishmentDecreeData {
  target: string;
  reason: string;
  issuedAt: number;
  permanent: boolean;
  pardoned: boolean;
  signatories: string[];
  authorityWeight: number;
  enforceability: number;
}

interface _Signatory {
  name: string;
  authority: number;
  signedAt: number;
}

export class BanishmentDecree {
  private _target: string;
  private _reason: string;
  private _issuedAt: number;
  private _permanent: boolean;
  private _pardoned: boolean;
  private _signatories: Map<string, _Signatory>;
  private _violations: number;
  private _amendments: number;

  constructor(target: string, reason: string, permanent: boolean = true) {
    this._target = target;
    this._reason = reason;
    this._issuedAt = Date.now();
    this._permanent = permanent;
    this._pardoned = false;
    this._signatories = new Map<string, _Signatory>();
    this._violations = 0;
    this._amendments = 0;
  }

  get target(): string {
    return this._target;
  }

  get reason(): string {
    return this._reason;
  }

  get issuedAt(): number {
    return this._issuedAt;
  }

  get permanent(): boolean {
    return this._permanent;
  }

  get active(): boolean {
    return !this._pardoned;
  }

  get authorityWeight(): number {
    if (this._signatories.size === 0) return 0;
    let acc = 0;
    for (const s of this._signatories.values()) acc += s.authority;
    return acc;
  }

  get enforceability(): number {
    const signatoryFactor = Math.min(1, this._signatories.size / 3);
    const authorityFactor = Math.min(1, this.authorityWeight / 10);
    const ageFactor = Math.min(1, (Date.now() - this._issuedAt) / (1000 * 60 * 60 * 24));
    const violationPenalty = Math.max(0, 1 - this._violations * 0.1);
    return signatoryFactor * 0.3 + authorityFactor * 0.4 + ageFactor * 0.1 + violationPenalty * 0.2;
  }

  public sign(name: string, authority: number = 1): boolean {
    if (this._signatories.has(name)) return false;
    if (this._pardoned) return false;
    this._signatories.set(name, { name, authority, signedAt: Date.now() });
    return true;
  }

  public isSigned(): boolean {
    return this._signatories.size >= 1;
  }

  public recordViolation(): void {
    this._violations += 1;
  }

  public amendReason(newReason: string, authority: string): boolean {
    if (!this._signatories.has(authority)) return false;
    this._reason = newReason;
    this._amendments += 1;
    return true;
  }

  public escalate(permanent: boolean): void {
    this._permanent = this._permanent || permanent;
  }

  public pardon(authority: string): boolean {
    if (authority !== 'council') return false;
    if (this._permanent && this.authorityWeight < 10) return false;
    this._pardoned = true;
    return true;
  }

  public revokeSignatory(name: string): boolean {
    return this._signatories.delete(name);
  }

  public signatories(): string[] {
    return Array.from(this._signatories.keys());
  }

  public signatoryDetail(name: string): _Signatory | null {
    return this._signatories.get(name) ?? null;
  }

  public get amendmentCount(): number {
    return this._amendments;
  }

  public get violationCount(): number {
    return this._violations;
  }

  public report(): BanishmentDecreeData {
    return {
      target: this._target,
      reason: this._reason,
      issuedAt: this._issuedAt,
      permanent: this._permanent,
      pardoned: this._pardoned,
      signatories: Array.from(this._signatories.keys()),
      authorityWeight: this.authorityWeight,
      enforceability: this.enforceability,
    };
  }
}
