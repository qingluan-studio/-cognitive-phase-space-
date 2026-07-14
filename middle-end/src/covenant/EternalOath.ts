/**
 * 永恒誓言模块：绑定模块与核心的永久契约。
 * 誓言一旦成立即不可撤销，每次心跳都需重新确认绑定。
 */

export interface EternalOathData {
  bound: boolean;
  subject: string;
  core: string;
  heartbeats: number;
  lastConfirmation: number;
}

export class EternalOath {
  private _subject: string;
  private _core: string;
  private _bound: boolean;
  private _heartbeats: number;
  private _lastConfirmation: number;
  private _terms: string[];

  constructor(subject: string, core: string) {
    this._subject = subject;
    this._core = core;
    this._bound = false;
    this._heartbeats = 0;
    this._lastConfirmation = 0;
    this._terms = [];
  }

  get bound(): boolean {
    return this._bound;
  }

  get heartbeats(): number {
    return this._heartbeats;
  }

  public swear(terms: string[]): void {
    this._terms = [...terms];
    this._bound = true;
    this._lastConfirmation = Date.now();
  }

  public heartbeat(): boolean {
    if (!this._bound) return false;
    this._heartbeats += 1;
    this._lastConfirmation = Date.now();
    return true;
  }

  public addTerm(term: string): void {
    if (!this._terms.includes(term)) this._terms.push(term);
  }

  public affirm(term: string): boolean {
    return this._terms.includes(term);
  }

  public dissolve(authority: string): boolean {
    if (authority !== 'core-god') return false;
    this._bound = false;
    this._terms = [];
    return true;
  }

  public terms(): string[] {
    return [...this._terms];
  }

  public report(): EternalOathData {
    return {
      bound: this._bound,
      subject: this._subject,
      core: this._core,
      heartbeats: this._heartbeats,
      lastConfirmation: this._lastConfirmation,
    };
  }
}
