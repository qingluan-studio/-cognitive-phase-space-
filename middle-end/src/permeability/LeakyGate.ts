/**
 * LeakyGate - 漏泄门
 * 有意泄漏部分信息以制造模糊性与不可预测性，通过控制
 * 泄漏率与噪声注入，使外界难以精确推断系统内部状态。
 */

export interface LeakyGateData {
  readonly gateId: string;
  leakRate: number;
  noiseInjection: number;
  sealed: boolean;
}

export interface LeakEmission {
  content: string;
  distortion: number;
  timestamp: number;
}

export class LeakyGate {
  private _data: LeakyGateData;
  private _emissions: LeakEmission[] = [];
  private _internalBuffer: string[] = [];
  private _ambiguityScore: number = 0;
  private _observersFooled: number = 0;

  constructor(data: LeakyGateData) {
    this._data = { ...data };
  }

  get gateId(): string {
    return this._data.gateId;
  }

  get leakRate(): number {
    return this._data.leakRate;
  }

  get ambiguityScore(): number {
    return this._ambiguityScore;
  }

  get sealed(): boolean {
    return this._data.sealed;
  }

  public ingest(content: string): void {
    this._internalBuffer.push(content);
    if (this._internalBuffer.length > 50) {
      this._internalBuffer.shift();
    }
  }

  public emitLeak(timestamp: number): LeakEmission | null {
    if (this._data.sealed || this._internalBuffer.length === 0) {
      return null;
    }
    if (Math.random() > this._data.leakRate) {
      return null;
    }
    const content = this._internalBuffer.shift()!;
    const distorted = this._applyDistortion(content);
    const emission: LeakEmission = {
      content: distorted,
      distortion: this._data.noiseInjection,
      timestamp,
    };
    this._emissions.push(emission);
    this._ambiguityScore = Math.min(1, this._ambiguityScore + 0.05);
    if (this._emissions.length > 30) {
      this._emissions.shift();
    }
    return emission;
  }

  private _applyDistortion(content: string): string {
    if (this._data.noiseInjection === 0) {
      return content;
    }
    const chars = content.split('');
    for (let i = 0; i < chars.length; i++) {
      if (Math.random() < this._data.noiseInjection) {
        chars[i] = String.fromCharCode(chars[i].charCodeAt(0) + (Math.random() < 0.5 ? 1 : -1));
      }
    }
    return chars.join('');
  }

  public injectNoise(level: number): void {
    this._data.noiseInjection = Math.max(0, Math.min(1, this._data.noiseInjection + level));
    this._ambiguityScore = Math.min(1, this._ambiguityScore + level * 0.3);
  }

  public adjustLeakRate(delta: number): void {
    this._data.leakRate = Math.max(0, Math.min(1, this._data.leakRate + delta));
  }

  public seal(): void {
    this._data.sealed = true;
    this._data.leakRate = 0;
  }

  public unseal(): void {
    this._data.sealed = false;
    this._data.leakRate = 0.1;
  }

  public misleadObserver(): boolean {
    const success = Math.random() < this._ambiguityScore;
    if (success) {
      this._observersFooled++;
    }
    return success;
  }

  public leakReport(): Record<string, unknown> {
    return {
      gateId: this.gateId,
      leakRate: this._data.leakRate.toFixed(3),
      noiseInjection: this._data.noiseInjection.toFixed(3),
      sealed: this._data.sealed,
      bufferSize: this._internalBuffer.length,
      emissions: this._emissions.length,
      ambiguityScore: this._ambiguityScore.toFixed(3),
      observersFooled: this._observersFooled,
    };
  }
}
