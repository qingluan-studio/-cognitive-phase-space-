export interface KairosSignal {
  id: string;
  source: string;
  intensity: number;
  timestamp: number;
  tags: string[];
  phase: number;
}

export interface CapturedMoment {
  id: string;
  signals: KairosSignal[];
  hijackedAction: Record<string, unknown>;
  capturedAt: number;
  executed: boolean;
  synchronyIndex: number;
  criticality: number;
}

export type KairosVerdict = 'dormant' | 'rising' | 'kairos' | 'missed';

export class KairosSnatcher {
  private _signals: KairosSignal[] = [];
  private _captured: CapturedMoment[] = [];
  private _registry: Map<string, (s: KairosSignal) => void> = new Map();
  private _verdict: KairosVerdict = 'dormant';
  private _threshold: number = 0.75;
  private _windowSize: number = 8;
  private _sandpileEnergy: number = 0;
  private _criticalEnergy: number = 1.0;
  private _synchronyIndex: number = 0;
  private _sourcePhases: Map<string, number> = new Map();

  registerSignal(id: string, handler: (s: KairosSignal) => void): void {
    this._registry.set(id, handler);
  }

  detectKairos(signal: KairosSignal): KairosVerdict {
    signal.phase = this._computeSignalPhase(signal);
    this._signals.push(signal);
    this._sourcePhases.set(signal.source, signal.phase);
    this._sandpileEnergy += signal.intensity;
    if (this._signals.length > this._windowSize * 4) {
      this._signals = this._signals.slice(-this._windowSize * 4);
    }
    const handler = this._registry.get(signal.source);
    if (handler) handler(signal);
    this._synchronyIndex = this._computeKuramotoOrder();
    this._verdict = this._evaluate();
    if (this._sandpileEnergy >= this._criticalEnergy && this._verdict === 'kairos') {
      this._sandpileEnergy = 0;
    }
    return this._verdict;
  }

  hijack(action: Record<string, unknown>): CapturedMoment | null {
    if (this._verdict !== 'kairos') return null;
    const recent = this._signals.slice(-this._windowSize);
    const criticality = this._computeCriticality(recent);
    const moment: CapturedMoment = {
      id: `kairos-${Date.now()}`,
      signals: recent,
      hijackedAction: action,
      capturedAt: Date.now(),
      executed: false,
      synchronyIndex: this._synchronyIndex,
      criticality,
    };
    this._captured.push(moment);
    return moment;
  }

  execute(momentId: string): boolean {
    const moment = this._captured.find(m => m.id === momentId);
    if (!moment || moment.executed) return false;
    moment.executed = true;
    return true;
  }

  evaluate(): KairosVerdict {
    this._synchronyIndex = this._computeKuramotoOrder();
    this._verdict = this._evaluate();
    return this._verdict;
  }

  get verdict(): KairosVerdict {
    return this._verdict;
  }

  get synchronyIndex(): number {
    return this._synchronyIndex;
  }

  getCapturedMoments(): CapturedMoment[] {
    return [...this._captured];
  }

  private _evaluate(): KairosVerdict {
    if (this._signals.length === 0) return 'dormant';
    const window = this._signals.slice(-this._windowSize);
    const avgIntensity = window.reduce((s, x) => s + x.intensity, 0) / window.length;
    const synch = this._synchronyIndex;
    const energyRatio = this._sandpileEnergy / this._criticalEnergy;
    const composite = 0.4 * avgIntensity + 0.4 * synch + 0.2 * energyRatio;
    if (composite >= this._threshold) return 'kairos';
    if (composite >= this._threshold * 0.5) return 'rising';
    return 'dormant';
  }

  private _computeKuramotoOrder(): number {
    const phases = Array.from(this._sourcePhases.values());
    if (phases.length < 2) return 0;
    let sumSin = 0, sumCos = 0;
    for (const phase of phases) {
      sumSin += Math.sin(phase);
      sumCos += Math.cos(phase);
    }
    return Math.sqrt(sumSin * sumSin + sumCos * sumCos) / phases.length;
  }

  private _computeSignalPhase(signal: KairosSignal): number {
    const recent = this._signals.filter(s => s.source === signal.source).slice(-4);
    if (recent.length < 2) return Math.random() * Math.PI * 2;
    const prev = recent[recent.length - 1];
    const dt = signal.timestamp - prev.timestamp;
    if (dt === 0) return prev.phase;
    const freq = 2 * Math.PI * signal.intensity / Math.max(1, dt);
    return (prev.phase + freq * dt) % (Math.PI * 2);
  }

  private _computeCriticality(window: KairosSignal[]): number {
    if (window.length < 3) return 0;
    const intensities = window.map(s => s.intensity);
    const mean = intensities.reduce((a, b) => a + b, 0) / intensities.length;
    const variance = intensities.reduce((s, v) => s + (v - mean) ** 2, 0) / intensities.length;
    const skewness = this._computeSkewness(intensities, mean, variance);
    const kurtosis = this._computeKurtosis(intensities, mean, variance);
    const avalancheSize = this._detectAvalanches(intensities);
    const powerLawFit = this._powerLawExponent(avalancheSize);
    return Math.min(1, (Math.abs(skewness) + kurtosis / 3 + powerLawFit) / 3);
  }

  private _computeSkewness(arr: number[], mean: number, variance: number): number {
    if (variance === 0) return 0;
    const std = Math.sqrt(variance);
    const skew = arr.reduce((s, v) => s + ((v - mean) / std) ** 3, 0) / arr.length;
    return Math.abs(skew);
  }

  private _computeKurtosis(arr: number[], mean: number, variance: number): number {
    if (variance === 0) return 0;
    const std = Math.sqrt(variance);
    const kurt = arr.reduce((s, v) => s + ((v - mean) / std) ** 4, 0) / arr.length - 3;
    return Math.max(0, Math.min(1, kurt / 3));
  }

  private _detectAvalanches(intensities: number[]): number[] {
    const sizes: number[] = [];
    const threshold = 0.5;
    let currentSize = 0;
    for (const v of intensities) {
      if (v > threshold) {
        currentSize += v;
      } else if (currentSize > 0) {
        sizes.push(currentSize);
        currentSize = 0;
      }
    }
    if (currentSize > 0) sizes.push(currentSize);
    return sizes;
  }

  private _powerLawExponent(sizes: number[]): number {
    if (sizes.length < 3) return 0;
    const sorted = sizes.filter(s => s > 0).sort((a, b) => a - b);
    if (sorted.length < 3) return 0;
    const n = sorted.length;
    let sumLog = 0, sumLogLog = 0;
    for (const s of sorted) {
      const logs = Math.log(s);
      sumLog += logs;
      sumLogLog += logs * Math.log(s + 1);
    }
    const avgLog = sumLog / n;
    const avgLogLog = sumLogLog / n;
    return Math.min(1, Math.abs(avgLogLog - avgLog * avgLog) / 2);
  }
}
