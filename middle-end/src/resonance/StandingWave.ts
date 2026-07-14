/**
 * 驻波模块：振荡不向前传播，而是形成固定的波节与波腹结构。
 * 用于刻画系统中持续存在但不迁移的稳定模式。
 */

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

  private _buildNodes(): void {
    const n = this._config.harmonics;
    for (let i = 0; i <= n; i++) {
      const position = (i / n) * this._config.length;
      const isNode = i % 1 === 0;
      this._nodes.push({
        position,
        type: isNode ? 'node' : 'antinode',
        amplitude: Math.sin((n * Math.PI * position) / this._config.length),
      });
    }
  }

  fieldAt(position: number): number {
    const k = (this._config.harmonics * Math.PI) / this._config.length;
    return Math.sin(k * position) * Math.cos(2 * Math.PI * this._time);
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
    this._energy = this._nodes.reduce(
      (acc, n) => acc + n.amplitude * n.amplitude * 0.5,
      0
    );
    this._meta.lastDt = dt;
  }

  setHarmonics(n: number): void {
    this._config = { ...this._config, harmonics: n };
    this._nodes = [];
    this._buildNodes();
  }

  antinodePositions(): number[] {
    return this._nodes.filter((n) => n.type === 'antinode').map((n) => n.position);
  }

  nodePositions(): number[] {
    return this._nodes.filter((n) => n.type === 'node').map((n) => n.position);
  }

  report(): Record<string, unknown> {
    return {
      nodeCount: this._nodes.length,
      energy: this._energy,
      wavelength: this.wavelength,
      meta: this._meta,
    };
  }
}
