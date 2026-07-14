export interface StandingNode {
  position: number;
  type: 'node' | 'antinode';
  amplitude: number;
}

export type StandingWaveField = {
  positions: number[];
  amplitudes: number[];
  wavelength: number;
};

export interface StandingWaveConfig {
  length: number;
  harmonics: number;
  waveSpeed: number;
}

export class StandingWave {
  private _config: StandingWaveConfig;
  private _nodes: StandingNode[] = [];
  private _energy: number = 0;
  private _time: number = 0;
  private _damping: number = 0.01;
  private _meta: Record<string, unknown> = {};

  constructor(config: StandingWaveConfig) {
    this._config = config;
    this._buildNodes();
  }

  get nodeCount(): number {
    return this._nodes.length;
  }

  get energy(): number {
    return this._energy;
  }

  get wavelength(): number {
    return (2 * this._config.length) / this._config.harmonics;
  }

  get waveNumber(): number {
    return (2 * Math.PI) / this.wavelength;
  }

  get angularFrequency(): number {
    return this._config.waveSpeed * this.waveNumber;
  }

  get fundamentalFrequency(): number {
    return this._config.waveSpeed / (2 * this._config.length);
  }

  private _buildNodes(): void {
    const n = this._config.harmonics;
    for (let i = 0; i <= n; i++) {
      const position = (i / n) * this._config.length;
      const k = (n * Math.PI) / this._config.length;
      const amp = Math.sin(k * position);
      const isNode = Math.abs(amp) < 1e-6;
      this._nodes.push({
        position,
        type: isNode ? 'node' : 'antinode',
        amplitude: amp,
      });
    }
  }

  fieldAt(position: number): number {
    const k = (this._config.harmonics * Math.PI) / this._config.length;
    const omega = this.angularFrequency;
    const envelope = Math.exp(-this._damping * this._time);
    return Math.sin(k * position) * Math.cos(omega * this._time) * envelope;
  }

  velocityAt(position: number): number {
    const k = (this._config.harmonics * Math.PI) / this._config.length;
    const omega = this.angularFrequency;
    const envelope = Math.exp(-this._damping * this._time);
    return -omega * Math.sin(k * position) * Math.sin(omega * this._time) * envelope;
  }

  computeStandingWaveRatio(forwardPower: number, reflectedPower: number): number {
    if (forwardPower <= 0 || reflectedPower < 0) return Infinity;
    const ratio = Math.sqrt(reflectedPower / forwardPower);
    if (ratio >= 1) return Infinity;
    return (1 + ratio) / (1 - ratio);
  }

  fourierCoefficient(order: number, samples: number = 256): number {
    const k = (this._config.harmonics * Math.PI) / this._config.length;
    let sum = 0;
    for (let i = 0; i < samples; i++) {
      const x = (i / samples) * this._config.length;
      const basis = Math.sin((order * Math.PI * x) / this._config.length);
      sum += Math.sin(k * x) * basis;
    }
    return (2 * sum) / samples;
  }

  totalEnergy(periods: number = 4): number {
    const omega = this.angularFrequency;
    const k = (this._config.harmonics * Math.PI) / this._config.length;
    const density = 1;
    const samples = 64;
    let kinetic = 0;
    let potential = 0;
    for (let t = 0; t < samples; t++) {
      const time = (t / samples) * ((2 * Math.PI) / omega) * periods;
      const envelope = Math.exp(-this._damping * time);
      for (let i = 0; i < samples; i++) {
        const x = (i / samples) * this._config.length;
        const displacement = Math.sin(k * x) * Math.cos(omega * time) * envelope;
        const velocity = -omega * Math.sin(k * x) * Math.sin(omega * time) * envelope;
        const dx = this._config.length / samples;
        kinetic += 0.5 * density * velocity * velocity * dx;
        potential += 0.5 * density * this._config.waveSpeed * this._config.waveSpeed * k * k * displacement * displacement * dx;
      }
    }
    return (kinetic + potential) / (samples * samples);
  }

  snapshot(steps: number): StandingWaveField {
    const positions: number[] = [];
    const amplitudes: number[] = [];
    for (let i = 0; i <= steps; i++) {
      const p = (i / steps) * this._config.length;
      positions.push(p);
      amplitudes.push(this.fieldAt(p));
    }
    return { positions, amplitudes, wavelength: this.wavelength };
  }

  advanceTime(dt: number): void {
    this._time += dt;
    const omega = this.angularFrequency;
    const envelope = Math.exp(-this._damping * this._time);
    this._energy = this._nodes.reduce(
      (acc, n) => acc + n.amplitude * n.amplitude * envelope * envelope * 0.5,
      0
    );
    this._energy *= omega * omega;
    this._meta.lastDt = dt;
    this._meta.decayFactor = envelope;
  }

  setHarmonics(n: number): void {
    this._config = { ...this._config, harmonics: Math.max(1, n) };
    this._nodes = [];
    this._buildNodes();
  }

  antinodePositions(): number[] {
    return this._nodes.filter((n) => n.type === 'antinode').map((n) => n.position);
  }

  nodePositions(): number[] {
    return this._nodes.filter((n) => n.type === 'node').map((n) => n.position);
  }

  harmonicSeries(count: number): number[] {
    const f0 = this.fundamentalFrequency;
    return Array.from({ length: count }, (_, i) => f0 * (i + 1));
  }

  report(): Record<string, unknown> {
    return {
      nodeCount: this._nodes.length,
      energy: this._energy,
      wavelength: this.wavelength,
      waveNumber: this.waveNumber,
      angularFrequency: this.angularFrequency,
      meta: this._meta,
    };
  }
}
