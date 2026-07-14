export interface BridgePillar {
  id: string;
  side: 'dream' | 'reality';
  stability: number;
  load: number;
}

export interface CrossingEvent {
  id: string;
  direction: 'dream-to-reality' | 'reality-to-dream';
  payload: Record<string, unknown>;
  crossedAt: number;
}

export class AltjiraBridge {
  private _pillars: Map<string, BridgePillar> = new Map();
  private _crossings: CrossingEvent[] = [];
  private _structuralIntegrity = 1.0;
  private _maxPayloadSize = 1024;
  private _loadHistory: number[] = [];
  private _spectralLoad: number[] = [];

  addPillar(pillar: BridgePillar): void {
    this._pillars.set(pillar.id, pillar);
  }

  cross(direction: CrossingEvent['direction'], payload: Record<string, unknown>): CrossingEvent | null {
    if (this._structuralIntegrity < 0.2) return null;
    const payloadSize = JSON.stringify(payload).length;
    if (payloadSize > this._maxPayloadSize) return null;
    const event: CrossingEvent = {
      id: `cross-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      direction,
      payload,
      crossedAt: Date.now(),
    };
    this._crossings.push(event);
    if (this._crossings.length > 100) this._crossings.shift();
    this._distributeLoad(payloadSize);
    this._loadHistory.push(payloadSize);
    if (this._loadHistory.length > 50) this._loadHistory.shift();
    return event;
  }

  private _distributeLoad(load: number): void {
    const pillars = Array.from(this._pillars.values());
    if (pillars.length === 0) return;
    const share = load / pillars.length;
    for (const p of pillars) {
      p.load += share;
      p.stability = Math.max(0, p.stability - share * 0.001);
    }
    this._structuralIntegrity = pillars.reduce((s, p) => s + p.stability, 0) / pillars.length;
    this._updateSpectralLoad();
  }

  reinforce(pillarId: string, amount: number): BridgePillar | null {
    const p = this._pillars.get(pillarId);
    if (!p) return null;
    p.stability = Math.min(1, p.stability + amount);
    p.load = Math.max(0, p.load - amount * 10);
    return p;
  }

  inspectIntegrity(): number {
    return this._structuralIntegrity;
  }

  listPillars(side?: BridgePillar['side']): BridgePillar[] {
    const all = Array.from(this._pillars.values());
    return side ? all.filter(p => p.side === side) : all;
  }

  getCrossings(limit: number = 50): CrossingEvent[] {
    return this._crossings.slice(-limit);
  }

  setMaxPayload(size: number): void {
    this._maxPayloadSize = Math.max(0, size);
  }

  get pillarCount(): number {
    return this._pillars.size;
  }

  computeLoadEntropy(): number {
    if (this._loadHistory.length === 0) return 0;
    const mean = this._loadHistory.reduce((a, b) => a + b, 0) / this._loadHistory.length;
    const variance = this._loadHistory.reduce((s, v) => s + (v - mean) ** 2, 0) / this._loadHistory.length;
    return 0.5 * Math.log2(2 * Math.PI * Math.E * Math.max(variance, 1e-10));
  }

  computeFourierLoad(): number[] {
    const N = this._loadHistory.length;
    if (N === 0) return [];
    const result: number[] = new Array(N).fill(0);
    for (let k = 0; k < N; k++) {
      let real = 0;
      let imag = 0;
      for (let n = 0; n < N; n++) {
        const angle = -2 * Math.PI * k * n / N;
        real += this._loadHistory[n] * Math.cos(angle);
        imag += this._loadHistory[n] * Math.sin(angle);
      }
      result[k] = Math.sqrt(real * real + imag * imag);
    }
    return result;
  }

  predictFailureProbability(): number {
    const fft = this.computeFourierLoad();
    if (fft.length === 0) return 0;
    const dominantFreq = Math.max(...fft);
    return 1 / (1 + Math.exp(-(dominantFreq / 1000 - this._structuralIntegrity)));
  }

  private _updateSpectralLoad(): void {
    this._spectralLoad = this.computeFourierLoad();
  }
}
