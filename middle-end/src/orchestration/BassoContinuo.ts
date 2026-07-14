export interface ContinuoVoice {
  id: string;
  name: string;
  frequency: number;
  amplitude: number;
  active: boolean;
  modulationIndex: number;
  phase: number;
}

export interface SupportFrame {
  id: string;
  timestamp: number;
  voices: string[];
  aggregateAmplitude: number;
  stable: boolean;
  spectralPower: number[];
  dominantFrequency: number;
}

export interface StabilityReport {
  measuredAt: number;
  aggregateAmplitude: number;
  variance: number;
  stable: boolean;
  drift: number;
  predictedNextAmplitude: number;
  predictionConfidence: number;
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
  private _arOrder = 3;
  private _modulationRate = 0.1;

  addVoice(name: string, frequency: number, amplitude: number = 0.5, modulationIndex: number = 0): ContinuoVoice {
    if (frequency <= 0 || amplitude < 0 || amplitude > 1 || modulationIndex < 0 || modulationIndex > 1) throw new Error('Invalid voice parameters');
    const id = `voice-${++this._idCounter}-${Date.now()}`;
    const voice: ContinuoVoice = { id, name, frequency, amplitude, active: true, modulationIndex, phase: 0 };
    this._voices.set(id, voice);
    return voice;
  }

  removeVoice(voiceId: string): boolean { return this._voices.delete(voiceId); }
  muteVoice(voiceId: string): boolean { const v = this._voices.get(voiceId); if (!v) return false; v.active = false; return true; }
  unmuteVoice(voiceId: string): boolean { const v = this._voices.get(voiceId); if (!v) return false; v.active = true; return true; }

  start(interval: number = 100): void { if (this._running) return; this._running = true; this._timer = setInterval(() => this._sample(), interval); }
  stop(): void { this._running = false; if (this._timer) { clearInterval(this._timer); this._timer = null; } }

  reportStability(): StabilityReport {
    const recent = this._amplitudeHistory.slice(-this._stabilityWindow);
    const agg = recent.length > 0 ? recent.reduce((s, v) => s + v, 0) / recent.length : 0;
    const variance = recent.length > 0 ? recent.reduce((s, v) => s + Math.pow(v - agg, 2), 0) / recent.length : 0;
    const [predicted, confidence] = this._predictNextAmplitude();
    return { measuredAt: Date.now(), aggregateAmplitude: agg, variance, stable: Math.sqrt(variance) <= this._driftThreshold, drift: Math.sqrt(variance), predictedNextAmplitude: predicted, predictionConfidence: confidence };
  }

  setStabilityWindow(w: number): void { if (w < 1) throw new Error('Window must be at least 1'); this._stabilityWindow = w; }
  setDriftThreshold(t: number): void { if (t < 0) throw new Error('Threshold must be non-negative'); this._driftThreshold = t; }
  setAROrder(order: number): void { if (order < 1) throw new Error('AR order must be at least 1'); this._arOrder = order; }
  setModulationRate(rate: number): void { if (rate <= 0) throw new Error('Rate must be positive'); this._modulationRate = rate; }

  adjustAmplitude(voiceId: string, amplitude: number): ContinuoVoice {
    const voice = this._voices.get(voiceId);
    if (!voice || amplitude < 0 || amplitude > 1) throw new Error('Invalid amplitude adjustment');
    voice.amplitude = amplitude;
    return voice;
  }

  getVoice(id: string): ContinuoVoice | undefined { return this._voices.get(id); }
  getSpectralAnalysis(): { frequencies: number[]; magnitudes: number[] } { const active = this.activeVoices; return { frequencies: active.map(v => v.frequency), magnitudes: active.map(v => v.amplitude) }; }

  get voices(): ContinuoVoice[] { return Array.from(this._voices.values()); }
  get activeVoices(): ContinuoVoice[] { return Array.from(this._voices.values()).filter(v => v.active); }
  get frames(): SupportFrame[] { return [...this._frames]; }
  get isRunning(): boolean { return this._running; }
  get stabilityWindow(): number { return this._stabilityWindow; }
  get driftThreshold(): number { return this._driftThreshold; }
  get arOrder(): number { return this._arOrder; }

  private _sample(): void {
    const active = this.activeVoices;
    let aggregate = 0;
    const now = Date.now();
    for (const voice of active) {
      voice.phase = (voice.phase + this._modulationRate * (voice.frequency / 100)) % (2 * Math.PI);
      aggregate += voice.amplitude * (1 + voice.modulationIndex * Math.sin(voice.phase));
    }
    this._amplitudeHistory.push(aggregate);
    if (this._amplitudeHistory.length > 1000) this._amplitudeHistory.shift();
    const power = this._computeSpectralPower();
    this._frames.push({
      id: `frame-${++this._idCounter}-${now}`,
      timestamp: now,
      voices: active.map(v => v.id),
      aggregateAmplitude: aggregate,
      stable: this.reportStability().stable,
      spectralPower: power,
      dominantFrequency: this._findDominantFrequency(),
    });
    if (this._frames.length > 1000) this._frames.shift();
  }

  private _computeSpectralPower(): number[] {
    const active = this.activeVoices;
    if (active.length === 0) return [];
    const bins = 8, power: number[] = Array(bins).fill(0);
    const maxFreq = Math.max(...active.map(v => v.frequency)), minFreq = Math.min(...active.map(v => v.frequency));
    const range = maxFreq - minFreq || 1;
    for (const voice of active) power[Math.min(bins - 1, Math.floor(((voice.frequency - minFreq) / range) * bins))] += voice.amplitude * voice.amplitude;
    const total = power.reduce((s, v) => s + v, 0);
    return total > 0 ? power.map(p => p / total) : power;
  }

  private _findDominantFrequency(): number {
    const active = this.activeVoices;
    if (active.length === 0) return 0;
    let maxPower = 0, dominant = 0;
    for (const voice of active) { const p = voice.amplitude * voice.amplitude * voice.frequency; if (p > maxPower) { maxPower = p; dominant = voice.frequency; } }
    return dominant;
  }

  private _predictNextAmplitude(): [number, number] {
    const history = this._amplitudeHistory;
    if (history.length < this._arOrder + 1) return [history[history.length - 1] || 0, 0];
    const recent = history.slice(-this._arOrder - 1);
    const X: number[][] = [], y: number[] = [];
    for (let i = 0; i < recent.length - 1; i++) {
      const row: number[] = [];
      for (let j = 0; j < this._arOrder && i - j >= 0; j++) row.push(recent[i - j]);
      while (row.length < this._arOrder) row.unshift(0);
      X.push(row); y.push(recent[i + 1]);
    }
    const coeffs = this._solveAR(X, y);
    if (!coeffs) return [recent[recent.length - 1], 0];
    const last = recent.slice(-this._arOrder);
    let prediction = 0;
    for (let i = 0; i < coeffs.length; i++) prediction += coeffs[i] * (last[i] || 0);
    const residuals = this._computeResiduals(X, y, coeffs);
    return [prediction, Math.max(0, 1 - residuals)];
  }

  private _solveAR(X: number[][], y: number[]): number[] | null {
    const n = X.length, m = X[0].length;
    if (n < m) return null;
    const AtA: number[][] = Array(m).fill(null).map(() => Array(m).fill(0)), AtY: number[] = Array(m).fill(0);
    for (let i = 0; i < n; i++) { for (let j = 0; j < m; j++) { for (let k = 0; k < m; k++) AtA[j][k] += X[i][j] * X[i][k]; AtY[j] += X[i][j] * y[i]; } }
    return this._gaussianEliminate(AtA, AtY);
  }

  private _gaussianEliminate(A: number[][], b: number[]): number[] | null {
    const n = A.length, aug = A.map((row, i) => [...row, b[i]]);
    for (let i = 0; i < n; i++) {
      let maxRow = i;
      for (let k = i + 1; k < n; k++) if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k;
      [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];
      if (Math.abs(aug[i][i]) < 1e-10) return null;
      for (let k = i + 1; k < n; k++) { const c = aug[k][i] / aug[i][i]; for (let j = i; j <= n; j++) aug[k][j] -= c * aug[i][j]; }
    }
    const x: number[] = Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) { x[i] = aug[i][n]; for (let j = i + 1; j < n; j++) x[i] -= aug[i][j] * x[j]; x[i] /= aug[i][i]; }
    return x;
  }

  private _computeResiduals(X: number[][], y: number[], coeffs: number[]): number {
    let err = 0;
    for (let i = 0; i < X.length; i++) { let pred = 0; for (let j = 0; j < coeffs.length; j++) pred += coeffs[j] * X[i][j]; err += Math.pow(y[i] - pred, 2); }
    const mean = y.reduce((s, v) => s + v, 0) / y.length;
    const variance = y.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / y.length;
    return variance > 0 ? err / (y.length * variance) : 0;
  }
}