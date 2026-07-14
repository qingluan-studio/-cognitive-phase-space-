export interface EchoPoint {
  timestamp: number;
  intensity: number;
  angleOfIncidence: number;
  specular: boolean;
}

export type EchoProfile = {
  decayRate: number;
  reverberationTime: number;
  clarity: number;
};

export interface SpecularEchoConfig {
  reflectivity: number;
  roomVolume: number;
  surfaceArea: number;
}

export class SpecularEcho {
  private _config: SpecularEchoConfig;
  private _echoes: EchoPoint[] = [];
  private _profile: EchoProfile | null = null;
  private _state: Record<string, unknown> = {};
  private _energyDecayCurve: number[] = [];
  private _schroederIntegration: number[] = [];
  private _meanFreePath: number = 0;

  constructor(config: SpecularEchoConfig) {
    this._config = config;
    this._meanFreePath = (4 * config.roomVolume) / config.surfaceArea;
  }

  get echoCount(): number {
    return this._echoes.length;
  }

  get meanFreePath(): number {
    return this._meanFreePath;
  }

  get sabineAbsorption(): number {
    return this._computeSabineAbsorption();
  }

  private _computeSabineAbsorption(): number {
    const c = 343;
    const rt60 = this._computeRT60();
    return (0.161 * this._config.roomVolume) / (rt60 * this._config.surfaceArea + 0.001);
  }

  private _computeRT60(): number {
    const c = 343;
    const alpha = 1 - this._config.reflectivity;
    return (0.161 * this._config.roomVolume) / (-this._config.surfaceArea * Math.log(1 - alpha) + 0.001);
  }

  private _schroederIntegrate(): void {
    this._schroederIntegration = [];
    let sum = 0;
    for (let i = this._energyDecayCurve.length - 1; i >= 0; i--) {
      sum += this._energyDecayCurve[i];
      this._schroederIntegration.unshift(sum);
    }
  }

  emit(intensity: number, angleOfIncidence: number): EchoPoint {
    const specular = angleOfIncidence < Math.PI / 4;
    const echo: EchoPoint = {
      timestamp: Date.now(),
      intensity,
      angleOfIncidence,
      specular,
    };
    this._echoes.push(echo);
    if (this._echoes.length > 50) this._echoes.shift();
    this._energyDecayCurve.push(intensity);
    if (this._energyDecayCurve.length > 50) this._energyDecayCurve.shift();
    this._schroederIntegrate();
    return echo;
  }

  reflect(echo: EchoPoint): EchoPoint {
    const reflected: EchoPoint = {
      timestamp: Date.now(),
      intensity: echo.intensity * this._config.reflectivity,
      angleOfIncidence: echo.angleOfIncidence,
      specular: echo.specular,
    };
    this._echoes.push(reflected);
    if (this._echoes.length > 50) this._echoes.shift();
    this._energyDecayCurve.push(reflected.intensity);
    if (this._energyDecayCurve.length > 50) this._energyDecayCurve.shift();
    this._schroederIntegrate();
    return reflected;
  }

  computeProfile(): EchoProfile {
    const rt60 = this._computeRT60();
    const intensities = this._echoes.map((e) => e.intensity);
    const clarity = intensities.length > 0 ? intensities[0] / (intensities.reduce((a, b) => a + b, 0) + 0.001) : 0;
    let decayRate = 0;
    if (intensities.length >= 2) {
      for (let i = 1; i < intensities.length; i++) {
        if (intensities[i - 1] > 0) {
          decayRate += Math.log(intensities[i] / intensities[i - 1]);
        }
      }
      decayRate /= intensities.length - 1;
    }
    this._profile = { decayRate, reverberationTime: rt60, clarity };
    return this._profile;
  }

  totalReflectedEnergy(): number {
    return this._echoes.reduce((acc, e) => acc + e.intensity, 0);
  }

  isSpecular(): boolean {
    return this._echoes.every((e) => e.specular);
  }

  earlyDecayTime(): number {
    if (this._schroederIntegration.length < 2) return 0;
    const edt = -10 / (Math.log(this._schroederIntegration[Math.min(9, this._schroederIntegration.length - 1)] / (this._schroederIntegration[0] + 0.001)) / Math.log(10));
    return isFinite(edt) ? edt : 0;
  }

  reset(): void {
    this._echoes = [];
    this._profile = null;
    this._energyDecayCurve = [];
    this._schroederIntegration = [];
    this._state = {};
  }

  report(): Record<string, unknown> {
    return {
      echoes: this._echoes.length,
      totalEnergy: this.totalReflectedEnergy().toFixed(3),
      profile: this._profile,
      state: this._state,
      meanFreePath: this._meanFreePath.toFixed(3),
      sabineAbsorption: this.sabineAbsorption.toFixed(4),
      earlyDecayTime: this.earlyDecayTime().toFixed(4),
    };
  }
}
