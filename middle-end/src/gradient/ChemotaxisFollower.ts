export interface ConcentrationSample {
  x: number;
  y: number;
  concentration: number;
  gradientMagnitude: number;
}

export type ChemotaxisStep = {
  dx: number;
  dy: number;
  gain: number;
  aligned: boolean;
};

export interface ChemotaxisConfig {
  stepSize: number;
  adaptationGain: number;
  saturationLevel: number;
  noiseAmplitude: number;
}

export class ChemotaxisFollower {
  private _config: ChemotaxisConfig;
  private _samples: ConcentrationSample[] = [];
  private _position: [number, number] = [0, 0];
  private _state: Record<string, unknown> = {};
  private _kellerSegelHistory: number[] = [];
  private _receptorOccupancy: number = 0;
  private _runTumbleBias: number = 0.5;

  constructor(config: ChemotaxisConfig) {
    this._config = config;
  }

  get sampleCount(): number {
    return this._samples.length;
  }

  get position(): readonly [number, number] {
    return this._position;
  }

  get runTumbleBias(): number {
    return this._runTumbleBias;
  }

  private _kellerSegelEquation(c: number, chi: number, mu: number): number {
    return chi * c - mu * c * c;
  }

  private _updateReceptorOccupancy(concentration: number): void {
    const kd = 1;
    this._receptorOccupancy = concentration / (kd + concentration);
    this._runTumbleBias = this._receptorOccupancy / (1 + this._receptorOccupancy);
  }

  sample(x: number, y: number, concentration: number): ConcentrationSample {
    const gradientMagnitude = this._samples.length > 0
      ? Math.abs(concentration - this._samples[this._samples.length - 1].concentration)
      : 0;
    const sample: ConcentrationSample = { x, y, concentration, gradientMagnitude };
    this._samples.push(sample);
    if (this._samples.length > 50) this._samples.shift();
    this._updateReceptorOccupancy(concentration);
    const ks = this._kellerSegelEquation(concentration, this._config.adaptationGain, 0.1);
    this._kellerSegelHistory.push(ks);
    if (this._kellerSegelHistory.length > 30) this._kellerSegelHistory.shift();
    return sample;
  }

  computeGradient(): ChemotaxisStep {
    if (this._samples.length < 2) {
      return { dx: 0, dy: 0, gain: 0, aligned: false };
    }
    const current = this._samples[this._samples.length - 1];
    const previous = this._samples[this._samples.length - 2];
    const dc = current.concentration - previous.concentration;
    const dx = current.x - previous.x;
    const dy = current.y - previous.y;
    const dist = Math.sqrt(dx * dx + dy * dy) + 0.001;
    const gradX = (dc * dx) / dist;
    const gradY = (dc * dy) / dist;
    const gain = Math.min(this._config.saturationLevel, Math.abs(dc) * this._config.adaptationGain);
    const step: ChemotaxisStep = {
      dx: (gradX / (Math.abs(gradX) + Math.abs(gradY) + 0.001)) * this._config.stepSize,
      dy: (gradY / (Math.abs(gradX) + Math.abs(gradY) + 0.001)) * this._config.stepSize,
      gain,
      aligned: dc > 0,
    };
    this._position[0] += step.dx + (Math.random() - 0.5) * this._config.noiseAmplitude;
    this._position[1] += step.dy + (Math.random() - 0.5) * this._config.noiseAmplitude;
    this._state.lastStep = step;
    return step;
  }

  run(): ChemotaxisStep {
    const step = this.computeGradient();
    if (this._runTumbleBias > 0.6) {
      step.dx *= 2;
      step.dy *= 2;
    }
    return step;
  }

  tumble(): ChemotaxisStep {
    const angle = Math.random() * 2 * Math.PI;
    const step: ChemotaxisStep = {
      dx: Math.cos(angle) * this._config.stepSize,
      dy: Math.sin(angle) * this._config.stepSize,
      gain: 0,
      aligned: false,
    };
    this._position[0] += step.dx;
    this._position[1] += step.dy;
    return step;
  }

  averageConcentration(): number {
    if (this._samples.length === 0) return 0;
    return this._samples.reduce((acc, s) => acc + s.concentration, 0) / this._samples.length;
  }

  pathLength(): number {
    let length = 0;
    for (let i = 1; i < this._samples.length; i++) {
      const dx = this._samples[i].x - this._samples[i - 1].x;
      const dy = this._samples[i].y - this._samples[i - 1].y;
      length += Math.sqrt(dx * dx + dy * dy);
    }
    return length;
  }

  reset(): void {
    this._samples = [];
    this._position = [0, 0];
    this._kellerSegelHistory = [];
    this._receptorOccupancy = 0;
    this._runTumbleBias = 0.5;
    this._state = {};
  }

  report(): Record<string, unknown> {
    return {
      samples: this._samples.length,
      position: this._position,
      averageConcentration: this.averageConcentration(),
      state: this._state,
      runTumbleBias: this._runTumbleBias.toFixed(4),
      pathLength: this.pathLength().toFixed(2),
    };
  }
}
