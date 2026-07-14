/**
 * OpenSesameProtocol - 芝麻开门协议
 * 通过特定暗语触发边界的全面开放，只有持有正确密令的
 * 请求者才能解锁系统的完全访问权限。
 */

export interface OpenSesameProtocolData {
  readonly protocolId: string;
  magicPhrase: string;
  secondaryToken: string;
  maxAttempts: number;
  cooldownPeriod: number;
}

export interface AccessAttempt {
  requester: string;
  phraseProvided: string;
  tokenProvided: string;
  granted: boolean;
  timestamp: number;
}

export class OpenSesameProtocol {
  private _data: OpenSesameProtocolData;
  private _attempts: AccessAttempt[] = [];
  private _failedAttempts: Map<string, number> = new Map();
  private _cooldowns: Map<string, number> = new Map();
  private _fullyOpen: boolean = false;
  private _openSessions: number = 0;

  constructor(data: OpenSesameProtocolData) {
    this._data = { ...data };
  }

  get protocolId(): string {
    return this._data.protocolId;
  }

  get fullyOpen(): boolean {
    return this._fullyOpen;
  }

  get openSessions(): number {
    return this._openSessions;
  }

  public requestAccess(requester: string, phrase: string, token: string, timestamp: number): boolean {
    if (this._isInCooldown(requester, timestamp)) {
      this._recordAttempt(requester, phrase, token, false, timestamp);
      return false;
    }
    const phraseOk = phrase === this._data.magicPhrase;
    const tokenOk = token === this._data.secondaryToken;
    const granted = phraseOk && tokenOk;
    this._recordAttempt(requester, phrase, token, granted, timestamp);
    if (granted) {
      this._fullyOpen = true;
      this._openSessions++;
      this._failedAttempts.delete(requester);
      return true;
    }
    this._registerFailure(requester, timestamp);
    return false;
  }

  private _recordAttempt(requester: string, phrase: string, token: string, granted: boolean, timestamp: number): void {
    this._attempts.push({ requester, phraseProvided: phrase, tokenProvided: token, granted, timestamp });
    if (this._attempts.length > 50) {
      this._attempts.shift();
    }
  }

  private _registerFailure(requester: string, timestamp: number): void {
    const count = (this._failedAttempts.get(requester) ?? 0) + 1;
    this._failedAttempts.set(requester, count);
    if (count >= this._data.maxAttempts) {
      this._cooldowns.set(requester, timestamp + this._data.cooldownPeriod);
      this._failedAttempts.delete(requester);
    }
  }

  private _isInCooldown(requester: string, timestamp: number): boolean {
    const until = this._cooldowns.get(requester);
    if (until === undefined) {
      return false;
    }
    if (timestamp >= until) {
      this._cooldowns.delete(requester);
      return false;
    }
    return true;
  }

  public rotatePhrase(newPhrase: string, newToken: string): void {
    this._data.magicPhrase = newPhrase;
    this._data.secondaryToken = newToken;
    this._fullyOpen = false;
  }

  public closeAccess(): void {
    this._fullyOpen = false;
    this._openSessions = 0;
  }

  public revokeSession(): void {
    if (this._openSessions > 0) {
      this._openSessions--;
    }
    if (this._openSessions === 0) {
      this._fullyOpen = false;
    }
  }

  public isAuthorized(requester: string): boolean {
    const recent = this._attempts.filter(
      (a) => a.requester === requester && a.granted
    );
    return recent.length > 0;
  }

  public auditTrail(): Record<string, unknown> {
    const granted = this._attempts.filter((a) => a.granted).length;
    return {
      protocolId: this.protocolId,
      fullyOpen: this._fullyOpen,
      openSessions: this._openSessions,
      totalAttempts: this._attempts.length,
      grantedAttempts: granted,
      blockedRequesters: this._cooldowns.size,
      maxAttempts: this._data.maxAttempts,
      cooldownPeriod: this._data.cooldownPeriod,
    };
  }
}
