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

interface ThermodynamicState {
  enthalpy: number;
  entropy: number;
  freeEnergy: number;
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
  private _thermoState: ThermodynamicState = { enthalpy: 0, entropy: 0, freeEnergy: 0 };
  private _heatDist: number[] = [];
  private _powerSpectrum: number[] = [];

  recordHesitation(durationMs: number, context: string, metadata: Record<string, unknown> = {}): void {
    this._events.push({ timestamp: Date.now(), durationMs, context, metadata });
    this._updateHeatDistribution();
    this._updateThermodynamics();
    this._computePowerSpectrum();
    this._updateSignature();
  }

  generateHeatSpectrum(): HeatSignature {
    return { ...this._signature };
  }

  analyzeContext(context: string): HeatSpectrumState {
    const recent = this._events.filter(e => e.context === context).slice(-20);
    if (recent.length === 0) return 'neutral';
    const avg = recent.reduce((s, e) => s + e.durationMs, 0) / recent.length;
    const ctxEntropy = this._contextEntropy(context);
    return this._classifyDelay(avg * (1 + ctxEntropy * 0.2));
  }

  resetBaseline(): void {
    const recent = this._events.slice(-100);
    if (recent.length > 0) {
      this._baselineDelay = recent.reduce((s, e) => s + e.durationMs, 0) / recent.length;
    }
    this._signature = { state: 'neutral', intensity: 0, temperature: 37, volatility: 0, trend: 'stable' };
    this._thermoState = { enthalpy: 0, entropy: 0, freeEnergy: 0 };
    this._heatDist = [];
    this._powerSpectrum = [];
  }

  getAnomalyScore(): number {
    if (this._events.length < 10) return 0;
    const recent = this._events.slice(-20).map(e => e.durationMs);
    const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
    const std = Math.sqrt(recent.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / recent.length);
    const cv = std / mean;
    const entropyScore = this._thermoState.entropy / Math.log2(recent.length || 1);
    const fractal = this._higuchiFractalDimension(recent);
    return Math.min(1, cv * 0.4 + entropyScore * 0.3 + (fractal - 1) * 0.3);
  }

  private _updateHeatDistribution(): void {
    const recent = this._events.slice(-100);
    if (recent.length < 2) return;
    const bins = 20;
    const min = Math.min(...recent.map(e => e.durationMs));
    const max = Math.max(...recent.map(e => e.durationMs));
    const range = max - min || 1;
    this._heatDist = Array(bins).fill(0);
    for (const e of recent) {
      const idx = Math.min(bins - 1, Math.floor((e.durationMs - min) / range * bins));
      this._heatDist[idx]++;
    }
    this._diffuseHeat();
  }

  private _diffuseHeat(): void {
    const alpha = 0.1;
    const bins = this._heatDist.length;
    const prev = [...this._heatDist];
    for (let i = 1; i < bins - 1; i++) {
      this._heatDist[i] = prev[i] + alpha * (prev[i - 1] - 2 * prev[i] + prev[i + 1]);
    }
    const total = this._heatDist.reduce((a, b) => a + b, 0);
    if (total > 0) for (let i = 0; i < bins; i++) this._heatDist[i] /= total;
  }

  private _updateThermodynamics(): void {
    const recent = this._events.slice(-50);
    if (recent.length < 2) return;
    const delays = recent.map(e => e.durationMs);
    const mean = delays.reduce((a, b) => a + b, 0) / delays.length;
    let entropy = 0;
    for (const p of this._heatDist) if (p > 1e-10) entropy -= p * Math.log2(p);
    this._thermoState.entropy = entropy;
    this._thermoState.enthalpy = mean;
    const temp = 37 + (mean - this._baselineDelay) * 0.05;
    this._thermoState.freeEnergy = this._thermoState.enthalpy - temp * entropy;
  }

  private _computePowerSpectrum(): void {
    const recent = this._events.slice(-64);
    if (recent.length < 4) return;
    const delays = recent.map(e => e.durationMs);
    const n = delays.length;
    const mean = delays.reduce((a, b) => a + b, 0) / n;
    const centered = delays.map(d => d - mean);
    const spectrum: number[] = [];
    for (let k = 0; k < Math.floor(n / 2); k++) {
      let real = 0, imag = 0;
      for (let t = 0; t < n; t++) {
        const angle = 2 * Math.PI * k * t / n;
        real += centered[t] * Math.cos(angle);
        imag -= centered[t] * Math.sin(angle);
      }
      spectrum.push(Math.sqrt(real * real + imag * imag) / n);
    }
    this._powerSpectrum = spectrum;
  }

  private _higuchiFractalDimension(series: number[]): number {
    if (series.length < 10) return 1;
    const n = series.length;
    const kMax = Math.min(Math.floor(n / 4), 10);
    const lengths: number[] = [];
    for (let k = 1; k <= kMax; k++) {
      let totalLen = 0;
      for (let m = 0; m < k; m++) {
        let len = 0, count = 0;
        for (let i = m; i < n - k; i += k) {
          len += Math.abs(series[i + k] - series[i]);
          count++;
        }
        if (count > 0) totalLen += len * (n - 1) / (k * k * count);
      }
      lengths.push(totalLen / k);
    }
    const logK = Array.from({ length: kMax }, (_, i) => Math.log(i + 1));
    const logL = lengths.map(l => Math.log(Math.max(l, 1e-10)));
    const slope = this._linearRegressionSlope(logK, logL);
    return Math.max(1, Math.min(2, -slope));
  }

  private _linearRegressionSlope(x: number[], y: number[]): number {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((s, xi, i) => s + xi * y[i], 0);
    const sumX2 = x.reduce((s, xi) => s + xi * xi, 0);
    const denom = n * sumX2 - sumX * sumX;
    return Math.abs(denom) < 1e-10 ? 0 : (n * sumXY - sumX * sumY) / denom;
  }

  private _contextEntropy(context: string): number {
    const ctxEvents = this._events.filter(e => e.context === context);
    if (ctxEvents.length < 5) return 0;
    const delays = ctxEvents.slice(-20).map(e => e.durationMs);
    const mean = delays.reduce((a, b) => a + b, 0) / delays.length;
    const variance = delays.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / delays.length;
    return 0.5 * Math.log2(2 * Math.PI * Math.E * Math.max(variance, 1e-10));
  }

  private _updateSignature(): void {
    const recent = this._events.slice(-50);
    if (recent.length === 0) return;

    const avg = recent.reduce((s, e) => s + e.durationMs, 0) / recent.length;
    const state = this._classifyDelay(avg);

    const intensities: Record<HeatSpectrumState, number> = {
      frozen: 0.1, cool: 0.3, neutral: 0.5, warm: 0.7, burning: 0.9,
    };

    const normDelay = Math.max(0, Math.min(1, (avg - this._baselineDelay) / 1000));
    const temperature = 37 + normDelay * 25 + this._thermoState.entropy * 2;
    const volatility = this._calculateVolatility(recent);
    const trend = this._detectTrend(recent);

    const intensityBoost = this._powerSpectrum.length > 0
      ? this._powerSpectrum[0] / Math.max(...this._powerSpectrum, 1)
      : 0;

    this._signature = {
      state,
      intensity: Math.min(1, intensities[state] + intensityBoost * 0.2),
      temperature: Math.max(20, Math.min(60, temperature)),
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
    const avg = events.reduce((s, e) => s + e.durationMs, 0) / events.length;
    const variance = events.reduce((s, e) => s + Math.pow(e.durationMs - avg, 2), 0) / events.length;
    const cv = Math.sqrt(variance) / avg;
    return Math.min(1, cv * 0.7 + (this._thermoState.entropy / 4) * 0.3);
  }

  private _detectTrend(events: HesitationEvent[]): 'rising' | 'falling' | 'stable' {
    if (events.length < 4) return 'stable';
    const delays = events.map(e => e.durationMs);
    const slope = this._linearRegressionSlope(delays.map((_, i) => i), delays);
    if (slope > 5) return 'rising';
    if (slope < -5) return 'falling';
    return 'stable';
  }

  get eventCount(): number {
    return this._events.length;
  }
}
