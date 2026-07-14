export interface EchoReflection {
  iteration: number;
  amplitude: number;
  delay: number;
  signature: string;
}

export type EchoTrace = {
  reflections: EchoReflection[];
  totalEnergy: number;
  isStable: boolean;
};

export interface EchoChamberConfig {
  decayFactor: number;
  baseDelay: number;
  maxIterations: number;
}

export class InfiniteEchoChamber {
  private _config: EchoChamberConfig;
  private _reflections: EchoReflection[] = [];
  private _source: number = 0;
  private _iteration: number = 0;
  private _state: Record<string, unknown> = {};
  private _feedbackMatrix: number[][] = [];
  private _modeShapes: number[][] = [];
  private _eigenvalueHistory: number[] = [];

  constructor(config: EchoChamberConfig) {
    this._config = config;
    this._initFeedbackMatrix();
  }

  get reflectionCount(): number {
    return this._reflections.length;
  }

  get iteration(): number {
    return this._iteration;
  }

  get totalEnergy(): number {
    return this._reflections.reduce((acc, r) => acc + r.amplitude, 0);
  }

  get dominantEigenvalue(): number {
    return this._eigenvalueHistory.length > 0 ? this._eigenvalueHistory[this._eigenvalueHistory.length - 1] : 0;
  }

  private _initFeedbackMatrix(): void {
    const n = 4;
    this._feedbackMatrix = [];
    for (let i = 0; i < n; i++) {
      const row: number[] = [];
      for (let j = 0; j < n; j++) {
        row.push(i === j ? this._config.decayFactor : Math.random() * 0.1);
      }
      this._feedbackMatrix.push(row);
    }
  }

  private _powerIteration(matrix: number[][]): number {
    const n = matrix.length;
    let vec = new Array(n).fill(1 / n);
    for (let iter = 0; iter < 15; iter++) {
      const next = new Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          next[i] += matrix[i][j] * vec[j];
        }
      }
      const norm = Math.sqrt(next.reduce((s, v) => s + v * v, 0));
      vec = next.map((v) => v / (norm || 1));
    }
    let eigenvalue = 0;
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < n; j++) {
        sum += matrix[i][j] * vec[j];
      }
      eigenvalue += sum * vec[i];
    }
    return eigenvalue;
  }

  emit(source: number): EchoReflection {
    this._source = source;
    this._iteration = 0;
    const reflection: EchoReflection = {
      iteration: this._iteration,
      amplitude: source,
      delay: 0,
      signature: `echo-0`,
    };
    this._reflections.push(reflection);
    this._state.emittedAt = Date.now();
    return reflection;
  }

  step(): EchoReflection {
    this._iteration++;
    const last = this._reflections[this._reflections.length - 1];
    const eigenvalue = this._powerIteration(this._feedbackMatrix);
    this._eigenvalueHistory.push(eigenvalue);
    if (this._eigenvalueHistory.length > 20) this._eigenvalueHistory.shift();
    const amplitude = this._config.decayFactor >= 1
      ? last.amplitude
      : last.amplitude * this._config.decayFactor * Math.abs(eigenvalue);
    const reflection: EchoReflection = {
      iteration: this._iteration,
      amplitude,
      delay: last.delay + this._config.baseDelay,
      signature: `echo-${this._iteration}`,
    };
    this._reflections.push(reflection);
    if (this._reflections.length > this._config.maxIterations) {
      this._reflections.shift();
    }
    return reflection;
  }

  trace(): EchoTrace {
    const isStable = this._config.decayFactor >= 1 || this.dominantEigenvalue > 1;
    return {
      reflections: [...this._reflections],
      totalEnergy: this.totalEnergy,
      isStable,
    };
  }

  run(count: number): EchoReflection[] {
    const result: EchoReflection[] = [];
    for (let i = 0; i < count; i++) {
      result.push(this.step());
    }
    return result;
  }

  currentAmplitude(): number {
    if (this._reflections.length === 0) return 0;
    return this._reflections[this._reflections.length - 1].amplitude;
  }

  isSustaining(): boolean {
    return this.currentAmplitude() > 0.01;
  }

  clear(): void {
    this._reflections = [];
    this._iteration = 0;
    this._state.clearedAt = Date.now();
    this._eigenvalueHistory = [];
  }

  report(): Record<string, unknown> {
    return {
      reflectionCount: this._reflections.length,
      iteration: this._iteration,
      totalEnergy: this.totalEnergy,
      state: this._state,
      dominantEigenvalue: this.dominantEigenvalue.toFixed(4),
    };
  }
}
