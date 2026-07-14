export type HeatSpectrumState = 'frozen' | 'cool' | 'neutral' | 'warm' | 'burning';

export interface HesitationEvent {
  timestamp: number;
  durationMs: number;
  context: string;
  metadata: Record<string, unknown>;
}

export interface HeatSignature {
  state: HeatSpectrumState;
  intensity: number;
  temperature: number;
  volatility: number;
  trend: 'rising' | 'falling' | 'stable';
}

export class SoulThermograph {
  private _events: HesitationEvent[] = [];
  private _signature: HeatSignature = {
    state: 'neutral',
    intensity: 0,
    temperature: 37,
    volatility: 0,
    trend: 'stable',
  };
  private _baselineDelay = 0;

  recordHesitation(durationMs: number, context: string, metadata: Record<string, unknown> = {}): void {
    const event: HesitationEvent = {
      timestamp: Date.now(),
      durationMs,
      context,
      metadata,
    };
    this._events.push(event);
    this._updateSignature();
  }

  generateHeatSpectrum(): HeatSignature {
    return { ...this._signature };
  }

  analyzeContext(context: string): HeatSpectrumState {
    const recent = this._events
      .filter(e => e.context === context)
      .slice(-20);

    if (recent.length === 0) return 'neutral';

    const avgDelay = recent.reduce((sum, e) => sum + e.durationMs, 0) / recent.length;
    return this._classifyDelay(avgDelay);
  }

  resetBaseline(): void {
    const recent = this._events.slice(-100);
    if (recent.length > 0) {
      this._baselineDelay = recent.reduce((sum, e) => sum + e.durationMs, 0) / recent.length;
    }
    this._signature = {
      state: 'neutral',
      intensity: 0,
      temperature: 37,
      volatility: 0,
      trend: 'stable',
    };
  }

  getAnomalyScore(): number {
    if (this._events.length < 10) return 0;

    const recent = this._events.slice(-10);
    const avg = recent.reduce((sum, e) => sum + e.durationMs, 0) / recent.length;
    const std = Math.sqrt(
      recent.reduce((sum, e) => sum + Math.pow(e.durationMs - avg, 2), 0) / recent.length
    );
    return Math.min(1, std / avg);
  }

  private _updateSignature(): void {
    const recent = this._events.slice(-50);
    if (recent.length === 0) return;

    const avgDelay = recent.reduce((sum, e) => sum + e.durationMs, 0) / recent.length;
    const state = this._classifyDelay(avgDelay);

    const intensities: Record<HeatSpectrumState, number> = {
      frozen: 0.1,
      cool: 0.3,
      neutral: 0.5,
      warm: 0.7,
      burning: 0.9,
    };

    const temperatures: Record<HeatSpectrumState, number> = {
      frozen: 20,
      cool: 30,
      neutral: 37,
      warm: 45,
      burning: 60,
    };

    const volatility = this._calculateVolatility(recent);
    const trend = this._detectTrend(recent);

    this._signature = {
      state,
      intensity: intensities[state],
      temperature: temperatures[state],
      volatility,
      trend,
    };
  }

  private _classifyDelay(delayMs: number): HeatSpectrumState {
    if (delayMs < 50) return 'frozen';
    if (delayMs < 200) return 'cool';
    if (delayMs < 500) return 'neutral';
    if (delayMs < 1000) return 'warm';
    return 'burning';
  }

  private _calculateVolatility(events: HesitationEvent[]): number {
    if (events.length < 2) return 0;
    const avg = events.reduce((sum, e) => sum + e.durationMs, 0) / events.length;
    const variance = events.reduce((sum, e) => sum + Math.pow(e.durationMs - avg, 2), 0) / events.length;
    return Math.min(1, Math.sqrt(variance) / avg);
  }

  private _detectTrend(events: HesitationEvent[]): 'rising' | 'falling' | 'stable' {
    if (events.length < 2) return 'stable';
    const firstHalf = events.slice(0, events.length / 2);
    const secondHalf = events.slice(events.length / 2);
    const firstAvg = firstHalf.reduce((sum, e) => sum + e.durationMs, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, e) => sum + e.durationMs, 0) / secondHalf.length;
    const diff = secondAvg - firstAvg;
    if (diff > 50) return 'rising';
    if (diff < -50) return 'falling';
    return 'stable';
  }

  get eventCount(): number {
    return this._events.length;
  }
}
