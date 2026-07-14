/**
 * 光谱线程：未完全结束的线程以幽灵形式存在。
 * 未完全结束的线程残留为光谱线程，在频谱中显现为周期性的幽灵信号。
 */

export type SpectrumBand = 'alpha' | 'beta' | 'gamma' | 'delta' | 'theta';

export interface SpectralThreadRecord {
  id: string;
  threadId: string;
  band: SpectrumBand;
  residualEnergy: number;
  frequency: number;
  lastObserved: number;
  terminated: boolean;
}

export interface SpectrumReading {
  threads: SpectralThreadRecord[];
  dominantBand: SpectrumBand | null;
  totalResidual: number;
  readAt: number;
}

export class SpectralThread {
  private _threads: Map<string, SpectralThreadRecord> = new Map();
  private _readings: SpectrumReading[] = [];
  private _terminationThreshold = 0.05;

  register(threadId: string, band: SpectrumBand, frequency: number): SpectralThreadRecord {
    const thread: SpectralThreadRecord = {
      id: `spec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      threadId,
      band,
      residualEnergy: 1.0,
      frequency,
      lastObserved: Date.now(),
      terminated: false,
    };
    this._threads.set(thread.id, thread);
    return thread;
  }

  observe(threadId: string): SpectralThreadRecord | null {
    const thread = this._threads.get(threadId);
    if (!thread || thread.terminated) return null;
    thread.residualEnergy *= 0.9;
    thread.lastObserved = Date.now();
    if (thread.residualEnergy < this._terminationThreshold) {
      thread.terminated = true;
    }
    return thread;
  }

  readSpectrum(): SpectrumReading {
    const active = Array.from(this._threads.values()).filter(t => !t.terminated);
    const bandTotals: Record<SpectrumBand, number> = {
      alpha: 0, beta: 0, gamma: 0, delta: 0, theta: 0,
    };
    let totalResidual = 0;
    for (const t of active) {
      bandTotals[t.band] += t.residualEnergy;
      totalResidual += t.residualEnergy;
    }
    let dominantBand: SpectrumBand | null = null;
    let max = 0;
    for (const band of Object.keys(bandTotals) as SpectrumBand[]) {
      if (bandTotals[band] > max) {
        max = bandTotals[band];
        dominantBand = band;
      }
    }
    const reading: SpectrumReading = {
      threads: active.map(t => ({ ...t })),
      dominantBand,
      totalResidual,
      readAt: Date.now(),
    };
    this._readings.push(reading);
    if (this._readings.length > 100) this._readings.shift();
    return reading;
  }

  pulse(threadId: string, energy: number): SpectralThreadRecord | null {
    const thread = this._threads.get(threadId);
    if (!thread) return null;
    thread.residualEnergy = Math.min(1, thread.residualEnergy + energy);
    thread.terminated = false;
    thread.lastObserved = Date.now();
    return thread;
  }

  terminate(threadId: string): boolean {
    const thread = this._threads.get(threadId);
    if (!thread) return false;
    thread.terminated = true;
    thread.residualEnergy = 0;
    return true;
  }

  getReadings(limit: number = 50): SpectrumReading[] {
    return this._readings.slice(-limit);
  }

  get activeThreadCount(): number {
    let count = 0;
    for (const t of this._threads.values()) {
      if (!t.terminated) count++;
    }
    return count;
  }
}
