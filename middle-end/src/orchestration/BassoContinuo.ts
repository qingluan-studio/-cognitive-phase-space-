/** 通奏低音 - 提供持续的低频支撑流，维持结构稳定性 */

export interface ContinuoVoice {
  id: string;
  name: string;
  frequency: number;
  amplitude: number;
  active: boolean;
}

export interface SupportFrame {
  id: string;
  timestamp: number;
  voices: string[];
  aggregateAmplitude: number;
  stable: boolean;
}

export interface StabilityReport {
  measuredAt: number;
  aggregateAmplitude: number;
  variance: number;
  stable: boolean;
  drift: number;
}

export class BassoContinuo {
  private _voices: Map<string, ContinuoVoice> = new Map();
  private _frames: SupportFrame[] = [];
  private _amplitudeHistory: number[] = [];
  private _idCounter = 0;
  private _stabilityWindow = 10;
  private _driftThreshold = 0.15;
  private _timer: ReturnType<typeof setInterval> | null = null;
  private _running = false;

  addVoice(name: string, frequency: number, amplitude: number = 0.5): ContinuoVoice {
    if (frequency <= 0) throw new Error('Frequency must be positive');
    if (amplitude < 0 || amplitude > 1) throw new Error('Amplitude must be in [0,1]');
    const id = `voice-${++this._idCounter}-${Date.now()}`;
    const voice: ContinuoVoice = { id, name, frequency, amplitude, active: true };
    this._voices.set(id, voice);
    return voice;
  }

  removeVoice(voiceId: string): boolean {
    return this._voices.delete(voiceId);
  }

  muteVoice(voiceId: string): boolean {
    const voice = this._voices.get(voiceId);
    if (!voice) return false;
    voice.active = false;
    return true;
  }

  unmuteVoice(voiceId: string): boolean {
    const voice = this._voices.get(voiceId);
    if (!voice) return false;
    voice.active = true;
    return true;
  }

  start(interval: number = 100): void {
    if (this._running) return;
    this._running = true;
    this._timer = setInterval(() => this._sample(), interval);
  }

  stop(): void {
    this._running = false;
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  reportStability(): StabilityReport {
    const recent = this._amplitudeHistory.slice(-this._stabilityWindow);
    const aggregate =
      recent.length > 0 ? recent.reduce((s, v) => s + v, 0) / recent.length : 0;
    const variance =
      recent.length > 0
        ? recent.reduce((s, v) => s + Math.pow(v - aggregate, 2), 0) / recent.length
        : 0;
    const drift = Math.sqrt(variance);
    return {
      measuredAt: Date.now(),
      aggregateAmplitude: aggregate,
      variance,
      stable: drift <= this._driftThreshold,
      drift,
    };
  }

  setStabilityWindow(w: number): void {
    if (w < 1) throw new Error('Window must be at least 1');
    this._stabilityWindow = w;
  }

  setDriftThreshold(t: number): void {
    if (t < 0) throw new Error('Threshold must be non-negative');
    this._driftThreshold = t;
  }

  adjustAmplitude(voiceId: string, amplitude: number): ContinuoVoice {
    const voice = this._voices.get(voiceId);
    if (!voice) throw new Error(`Voice not found: ${voiceId}`);
    if (amplitude < 0 || amplitude > 1) throw new Error('Amplitude must be in [0,1]');
    voice.amplitude = amplitude;
    return voice;
  }

  getVoice(id: string): ContinuoVoice | undefined {
    return this._voices.get(id);
  }

  get voices(): ContinuoVoice[] {
    return Array.from(this._voices.values());
  }

  get activeVoices(): ContinuoVoice[] {
    return Array.from(this._voices.values()).filter(v => v.active);
  }

  get frames(): SupportFrame[] {
    return [...this._frames];
  }

  get isRunning(): boolean {
    return this._running;
  }

  get stabilityWindow(): number {
    return this._stabilityWindow;
  }

  get driftThreshold(): number {
    return this._driftThreshold;
  }

  private _sample(): void {
    const active = this.activeVoices;
    const aggregate = active.reduce((s, v) => s + v.amplitude, 0);
    this._amplitudeHistory.push(aggregate);
    if (this._amplitudeHistory.length > 1000) {
      this._amplitudeHistory.shift();
    }
    const frame: SupportFrame = {
      id: `frame-${++this._idCounter}-${Date.now()}`,
      timestamp: Date.now(),
      voices: active.map(v => v.id),
      aggregateAmplitude: aggregate,
      stable: this.reportStability().stable,
    };
    this._frames.push(frame);
    if (this._frames.length > 1000) this._frames.shift();
  }
}
