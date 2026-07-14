export interface CascadeStage {
  level: number;
  frequency: number;
  amplitude: number;
  triggered: boolean;
}

export type CascadeReport = {
  stages: CascadeStage[];
  totalGain: number;
  terminated: boolean;
};

export interface CascadeConfig {
  baseFrequency: number;
  ratio: number;
  threshold: number;
  maxLevels: number;
}

export class ResonanceCascade {
  private _config: CascadeConfig;
  private _stages: CascadeStage[] = [];
  private _active: boolean = false;
  private _iterations: number = 0;
  private _dissipation: number = 0;
  private _triggerLog: Record<string, unknown> = {};

  constructor(config: CascadeConfig) {
    this._config = config;
    this._seedStages();
  }

  get stageCount(): number {
    return this._stages.length;
  }

  get isActive(): boolean {
    return this._active;
  }

  get totalGain(): number {
    return this._stages.reduce((acc, s) => acc * (s.triggered ? s.amplitude : 1), 1);
  }

  get propagationVelocity(): number {
    if (this._stages.length < 2) return 0;
    const triggered = this._stages.filter(s => s.triggered);
    if (triggered.length < 2) return 0;
    const df = triggered[triggered.length - 1].frequency - triggered[0].frequency;
    return df / Math.max(1, this._iterations);
  }

  private _seedStages(): void {
    for (let i = 0; i < this._config.maxLevels; i++) {
      this._stages.push({
        level: i,
        frequency: this._config.baseFrequency * Math.pow(this._config.ratio, i),
        amplitude: 1 / (i + 1),
        triggered: false,
      });
    }
  }

  ignite(amplitude: number): boolean {
    if (amplitude < this._config.threshold) {
      this._triggerLog.igniteFailed = { amplitude };
      return false;
    }
    this._active = true;
    this._stages[0].triggered = true;
    this._stages[0].amplitude = amplitude;
    this._cascadeDown();
    this._triggerLog.ignitedAt = Date.now();
    this._triggerLog.seedAmplitude = amplitude;
    return true;
  }

  private _cascadeDown(): void {
    for (let i = 1; i < this._stages.length; i++) {
      const prev = this._stages[i - 1];
      const curr = this._stages[i];
      const couplingFactor = 1 / (1 + 0.5 * Math.abs(curr.frequency - prev.frequency) / prev.frequency);
      const transferred = prev.triggered ? prev.amplitude * curr.amplitude * couplingFactor : 0;
      if (transferred >= this._config.threshold) {
        curr.triggered = true;
        curr.amplitude = transferred;
        this._dissipation += prev.amplitude * (1 - couplingFactor);
      } else {
        break;
      }
    }
  }

  lyapunovExponent(): number {
    const amps = this._stages.filter(s => s.triggered).map(s => Math.log(Math.max(1e-9, s.amplitude)));
    if (amps.length < 2) return 0;
    const n = amps.length;
    const mean = amps.reduce((a, b) => a + b, 0) / n;
    let variance = 0;
    for (const a of amps) variance += (a - mean) * (a - mean);
    variance /= n;
    return mean - 0.5 * variance;
  }

  qualityFactor(level: number): number {
    if (level < 0 || level >= this._stages.length) return 0;
    const stage = this._stages[level];
    if (!stage.triggered) return 0;
    return stage.frequency / Math.max(1e-9, this._config.threshold);
  }

  energyDistribution(): number[] {
    const total = this._stages.reduce((s, x) => s + (x.triggered ? x.amplitude * x.amplitude : 0), 0);
    if (total <= 0) return this._stages.map(() => 0);
    return this._stages.map(s => (s.triggered ? (s.amplitude * s.amplitude) / total : 0));
  }

  spectralCentroid(): number {
    let weighted = 0;
    let total = 0;
    for (const s of this._stages) {
      if (s.triggered) {
        weighted += s.frequency * s.amplitude;
        total += s.amplitude;
      }
    }
    return total > 0 ? weighted / total : 0;
  }

  propagate(): CascadeReport {
    if (!this._active) {
      return { stages: [...this._stages], totalGain: this.totalGain, terminated: true };
    }
    this._iterations++;
    this._cascadeDown();
    const terminated = this._stages.every((s) => !s.triggered);
    if (terminated) this._active = false;
    return { stages: [...this._stages], totalGain: this.totalGain, terminated };
  }

  resetStage(level: number): void {
    if (level < 0 || level >= this._stages.length) return;
    this._stages[level].triggered = false;
    this._stages[level].amplitude = 1 / (level + 1);
  }

  activeStages(): CascadeStage[] {
    return this._stages.filter((s) => s.triggered);
  }

  summary(): Record<string, unknown> {
    return {
      active: this._active,
      stageCount: this._stages.length,
      totalGain: this.totalGain,
      lyapunovExponent: this.lyapunovExponent(),
      spectralCentroid: this.spectralCentroid(),
      dissipation: this._dissipation,
      triggerLog: this._triggerLog,
    };
  }
}
