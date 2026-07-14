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
  private _bufferEntropy: number[];
  private _controlGain: number;

  constructor(capacity: number = 1000) {
    this._level = 0;
    this._capacity = capacity;
    this._measures = [];
    this._droppedPackets = 0;
    this._bufferEntropy = [];
    this._controlGain = 0.1;
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

  get controlGain(): number {
    return this._controlGain;
  }

  public ingest(volume: number): void {
    this._level += volume;
    this._bufferEntropy.push(volume);
    if (this._bufferEntropy.length > 50) this._bufferEntropy.shift();
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
      this._level = Math.floor(this._level * (1 - this._controlGain));
    }
    if (ratio > 0.9) {
      this._measures.push('drop-low-priority');
      const dropped = Math.floor(this._level * this._controlGain * 3);
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

  public computeBufferEntropy(): number {
    if (this._bufferEntropy.length === 0) return 0;
    const mean = this._bufferEntropy.reduce((a, b) => a + b, 0) / this._bufferEntropy.length;
    const variance = this._bufferEntropy.reduce((s, v) => s + (v - mean) ** 2, 0) / this._bufferEntropy.length;
    return 0.5 * Math.log2(2 * Math.PI * Math.E * Math.max(variance, 1e-10));
  }

  public predictOverflowProbability(): number {
    const entropy = this.computeBufferEntropy();
    const ratio = this._level / this._capacity;
    return 1 / (1 + Math.exp(-(ratio * 10 - entropy * 0.1)));
  }

  public tuneControlGain(gain: number): void {
    this._controlGain = Math.max(0.01, Math.min(1, gain));
  }
}
