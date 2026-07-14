/**
 * 大洪水协议模块：应对信息洪水的最高级别协议。
 * 一旦水位超过警戒线即启动分流、压缩、丢弃等多级响应。
 */

export interface DelugeProtocolData {
  level: number;
  alertLevel: 'green' | 'yellow' | 'red';
  activeMeasures: string[];
  throughput: number;
}

export class DelugeProtocol {
  private _level: number;
  private _capacity: number;
  private _measures: string[];
  private _droppedPackets: number;

  constructor(capacity: number = 1000) {
    this._level = 0;
    this._capacity = capacity;
    this._measures = [];
    this._droppedPackets = 0;
  }

  get level(): number {
    return this._level;
  }

  get alertLevel(): 'green' | 'yellow' | 'red' {
    const ratio = this._level / this._capacity;
    if (ratio > 0.9) return 'red';
    if (ratio > 0.6) return 'yellow';
    return 'green';
  }

  public ingest(volume: number): void {
    this._level += volume;
    this._applyMeasures();
  }

  public drain(volume: number): void {
    this._level = Math.max(0, this._level - volume);
  }

  private _applyMeasures(): void {
    this._measures = [];
    const ratio = this._level / this._capacity;
    if (ratio > 0.6) {
      this._measures.push('compress');
      this._level = Math.floor(this._level * 0.8);
    }
    if (ratio > 0.9) {
      this._measures.push('drop-low-priority');
      const dropped = Math.floor(this._level * 0.3);
      this._droppedPackets += dropped;
      this._level -= dropped;
    }
    if (ratio > 1.2) {
      this._measures.push('emergency-shed');
      this._level = Math.floor(this._capacity * 0.5);
    }
  }

  public throughput(): number {
    return Math.max(0, this._capacity - this._level);
  }

  public expand(extra: number): void {
    this._capacity += extra;
  }

  public report(): DelugeProtocolData {
    return {
      level: this._level,
      alertLevel: this.alertLevel,
      activeMeasures: [...this._measures],
      throughput: this.throughput(),
    };
  }

  public droppedCount(): number {
    return this._droppedPackets;
  }
}
