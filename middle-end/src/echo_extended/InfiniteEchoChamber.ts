/**
 * 无限回声室模块：模拟永不衰减的重复反射，形成无限循环的回声。
 * 用于追踪信号在闭合空间中的永久持续路径。
 */

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

  constructor(config: EchoChamberConfig) {
    this._config = config;
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
    const amplitude = this._config.decayFactor >= 1
      ? last.amplitude
      : last.amplitude * this._config.decayFactor;
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
    const isStable = this._config.decayFactor >= 1;
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
  }

  report(): Record<string, unknown> {
    return {
      reflectionCount: this._reflections.length,
      iteration: this._iteration,
      totalEnergy: this.totalEnergy,
      state: this._state,
    };
  }
}
