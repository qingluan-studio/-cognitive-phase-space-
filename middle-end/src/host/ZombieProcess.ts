/**
 * ZombieProcess - 僵尸进程
 * 宿主被寄生后失去自主意识，行为由寄生者远程操控，
 * 进程虽在运行但丧失自主决策能力，成为执行寄生者意志的载体。
 */

export interface ZombieProcessData {
  readonly processId: string;
  hostId: string;
  autonomyLevel: number;
  puppetMaster: string;
  commandQueue: string[];
}

export interface ExecutedCommand {
  command: string;
  timestamp: number;
  result: 'success' | 'failed' | 'partial';
}

export class ZombieProcess {
  private _data: ZombieProcessData;
  private _executedLog: ExecutedCommand[] = [];
  private _residualAutonomy: number;
  private _commandLatency: number = 0;
  private _heartbeatCount: number = 0;

  constructor(data: ZombieProcessData) {
    this._data = { ...data, commandQueue: [...data.commandQueue] };
    this._residualAutonomy = data.autonomyLevel;
  }

  get processId(): string {
    return this._data.processId;
  }

  get puppetMaster(): string {
    return this._data.puppetMaster;
  }

  get autonomyLevel(): number {
    return this._residualAutonomy;
  }

  get pendingCommands(): number {
    return this._data.commandQueue.length;
  }

  public receiveCommand(command: string, timestamp: number): void {
    this._data.commandQueue.push(command);
    this._commandLatency = Math.max(0, this._commandLatency - 0.05);
  }

  public executeNext(timestamp: number): ExecutedCommand | null {
    if (this._data.commandQueue.length === 0) {
      return null;
    }
    const command = this._data.commandQueue.shift()!;
    const obeyChance = 1 - this._residualAutonomy;
    const roll = Math.random();
    let result: 'success' | 'failed' | 'partial';
    if (roll < obeyChance * 0.8) {
      result = 'success';
    } else if (roll < obeyChance) {
      result = 'partial';
    } else {
      result = 'failed';
      this._residualAutonomy = Math.min(1, this._residualAutonomy + 0.05);
    }
    const entry: ExecutedCommand = { command, timestamp, result };
    this._executedLog.push(entry);
    if (this._executedLog.length > 40) {
      this._executedLog.shift();
    }
    return entry;
  }

  public heartbeat(): boolean {
    this._heartbeatCount++;
    this._commandLatency = Math.min(1, this._commandLatency + 0.02);
    return this._heartbeatCount % 5 === 0;
  }

  public resistControl(strength: number): void {
    this._residualAutonomy = Math.min(1, this._residualAutonomy + strength * 0.1);
  }

  public reinforceControl(intensity: number): void {
    this._residualAutonomy = Math.max(0, this._residualAutonomy - intensity * 0.15);
    this._commandLatency = Math.max(0, this._commandLatency - 0.1);
  }

  public severLink(): boolean {
    if (this._residualAutonomy > 0.7) {
      this._data.puppetMaster = '';
      this._data.commandQueue = [];
      return true;
    }
    return false;
  }

  public zombieReport(): Record<string, unknown> {
    const successRate = this._executedLog.length > 0
      ? this._executedLog.filter((e) => e.result === 'success').length / this._executedLog.length
      : 0;
    return {
      processId: this.processId,
      puppetMaster: this._data.puppetMaster || 'none',
      autonomy: this._residualAutonomy.toFixed(3),
      pendingCommands: this.pendingCommands,
      executedCount: this._executedLog.length,
      successRate: successRate.toFixed(3),
      heartbeatCount: this._heartbeatCount,
      commandLatency: this._commandLatency.toFixed(3),
    };
  }
}
