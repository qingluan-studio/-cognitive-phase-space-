/**
 * 放逐令模块：官方宣布永久驱逐。
 * 一经签发即不可撤销（除非特赦），并附带原因、生效时间等正式记录。
 */

export interface BanishmentDecreeData {
  target: string;
  reason: string;
  issuedAt: number;
  permanent: boolean;
  pardoned: boolean;
}

export class BanishmentDecree {
  private _target: string;
  private _reason: string;
  private _issuedAt: number;
  private _permanent: boolean;
  private _pardoned: boolean;
  private _signatories: string[];

  constructor(target: string, reason: string, permanent: boolean = true) {
    this._target = target;
    this._reason = reason;
    this._issuedAt = Date.now();
    this._permanent = permanent;
    this._pardoned = false;
    this._signatories = [];
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

  public sign(name: string): boolean {
    if (this._signatories.includes(name)) return false;
    this._signatories.push(name);
    return true;
  }

  public isSigned(): boolean {
    return this._signatories.length >= 1;
  }

  public amendReason(newReason: string, authority: string): boolean {
    if (!this._signatories.includes(authority)) return false;
    this._reason = newReason;
    return true;
  }

  public pardon(authority: string): boolean {
    if (authority !== 'council') return false;
    this._pardoned = true;
    return true;
  }

  public signatories(): string[] {
    return [...this._signatories];
  }

  public report(): BanishmentDecreeData {
    return {
      target: this._target,
      reason: this._reason,
      issuedAt: this._issuedAt,
      permanent: this._permanent,
      pardoned: this._pardoned,
    };
  }
}
