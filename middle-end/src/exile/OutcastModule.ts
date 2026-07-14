/**
 * 放逐模块模块：被社群驱逐的模块独自运行。
 * 在隔离环境中维持自身运行，只能通过受控接口与外界通信。
 */

export interface OutcastModuleData {
  name: string;
  isolationCycles: number;
  health: number;
  messages: string[];
}

export class OutcastModule {
  private _name: string;
  private _isolationCycles: number;
  private _health: number;
  private _inbox: string[];
  private _outbox: string[];
  private _banished: boolean;

  constructor(name: string) {
    this._name = name;
    this._isolationCycles = 0;
    this._health = 100;
    this._inbox = [];
    this._outbox = [];
    this._banished = true;
  }

  get name(): string {
    return this._name;
  }

  get health(): number {
    return this._health;
  }

  get banished(): boolean {
    return this._banished;
  }

  public survive(): void {
    this._isolationCycles += 1;
    this._health = Math.max(0, this._health - 2);
  }

  public receive(message: string): void {
    this._inbox.push(message);
    this._health = Math.min(100, this._health + 1);
  }

  public send(message: string): void {
    this._outbox.push(message);
  }

  public drainOutbox(): string[] {
    const out = [...this._outbox];
    this._outbox = [];
    return out;
  }

  public readInbox(): string[] {
    return [...this._inbox];
  }

  public heal(amount: number): void {
    this._health = Math.min(100, this._health + amount);
  }

  public report(): OutcastModuleData {
    return {
      name: this._name,
      isolationCycles: this._isolationCycles,
      health: this._health,
      messages: this._inbox,
    };
  }
}
