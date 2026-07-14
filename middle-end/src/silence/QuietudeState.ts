/**
 * 宁静态模块：绝对的静止和沉默。
 * 进入宁静态后所有操作都被静音，仅记录心跳与停留时长。
 */

export interface QuietudeStateData {
  silent: boolean;
  heartbeats: number;
  duration: number;
  interruptions: number;
}

export class QuietudeState {
  private _silent: boolean;
  private _heartbeats: number;
  private _enteredAt: number;
  private _interruptions: number;
  private _log: string[];

  constructor() {
    this._silent = false;
    this._heartbeats = 0;
    this._enteredAt = 0;
    this._interruptions = 0;
    this._log = [];
  }

  get silent(): boolean {
    return this._silent;
  }

  get heartbeats(): number {
    return this._heartbeats;
  }

  get duration(): number {
    if (this._enteredAt === 0) return 0;
    return Date.now() - this._enteredAt;
  }

  public enter(): void {
    this._silent = true;
    this._enteredAt = Date.now();
    this._log.push('entered-quietude');
  }

  public pulse(): void {
    if (this._silent) this._heartbeats += 1;
  }

  public interrupt(reason: string): void {
    if (this._silent) {
      this._interruptions += 1;
      this._log.push(`interrupted:${reason}`);
    }
  }

  public leave(): void {
    this._silent = false;
    this._enteredAt = 0;
    this._log.push('left-quietude');
  }

  public history(): string[] {
    return [...this._log];
  }

  public report(): QuietudeStateData {
    return {
      silent: this._silent,
      heartbeats: this._heartbeats,
      duration: this.duration,
      interruptions: this._interruptions,
    };
  }
}
