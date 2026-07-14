/**
 * 噪声逆反器：将噪声相位反转，抵消干扰。
 * 通过生成反相噪声实现主动降噪，将干扰信号与反相信号相加以相互抵消。
 */

export interface NoiseSample {
  timestamp: number;
  amplitude: number;
  frequency: number;
  phase: number;
}

export interface CancellationResult {
  original: number;
  inverted: number;
  residual: number;
  cancelledRatio: number;
}

export class NoiseInverter {
  private _buffer: NoiseSample[] = [];
  private _maxBufferSize = 1024;
  private _calibrationFactor = 1.0;
  private _totalCancelled = 0;
  private _totalProcessed = 0;

  ingest(sample: NoiseSample): void {
    this._buffer.push(sample);
    if (this._buffer.length > this._maxBufferSize) this._buffer.shift();
  }

  invert(sample: NoiseSample): NoiseSample {
    return {
      timestamp: sample.timestamp,
      amplitude: -sample.amplitude * this._calibrationFactor,
      frequency: sample.frequency,
      phase: (sample.phase + Math.PI) % (2 * Math.PI),
    };
  }

  cancel(sample: NoiseSample): CancellationResult {
    const inverted = this.invert(sample);
    const residual = sample.amplitude + inverted.amplitude;
    const cancelledRatio = sample.amplitude !== 0
      ? Math.abs(residual / sample.amplitude)
      : 0;
    this._totalProcessed++;
    this._totalCancelled += Math.abs(sample.amplitude) - Math.abs(residual);
    return {
      original: sample.amplitude,
      inverted: inverted.amplitude,
      residual,
      cancelledRatio: 1 - Math.min(1, Math.abs(cancelledRatio)),
    };
  }

  calibrate(reference: NoiseSample[]): number {
    if (reference.length === 0) return this._calibrationFactor;
    const avgAmplitude = reference.reduce((s, n) => s + Math.abs(n.amplitude), 0) / reference.length;
    this._calibrationFactor = avgAmplitude > 0 ? 1.0 : 1.0;
    return this._calibrationFactor;
  }

  setCalibration(factor: number): void {
    this._calibrationFactor = Math.max(0, factor);
  }

  clearBuffer(): void {
    this._buffer = [];
  }

  getBuffer(): NoiseSample[] {
    return [...this._buffer];
  }

  get averageCancellation(): number {
    if (this._totalProcessed === 0) return 0;
    return this._totalCancelled / this._totalProcessed;
  }

  get bufferSize(): number {
    return this._buffer.length;
  }
}
