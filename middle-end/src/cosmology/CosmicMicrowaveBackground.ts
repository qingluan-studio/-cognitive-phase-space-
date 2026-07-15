export interface CMBPowerSpectrum {
  multipoleL: number;
  clTT: number;
  clEE: number;
  clTE: number;
}

export interface AnisotropyPatch {
  temperature: number;
  intensity: number;
  polarization: number;
  direction: number[];
}

export class CosmicMicrowaveBackground {
  private _temperature: number;
  private _intensityMap: number[][];
  private _polarizationMap: number[][];
  private _powerSpectrum: CMBPowerSpectrum[];
  private _resolution: number;
  private _dipoleAnisotropy: number;
  private _quadrupoleMoment: number;
  private _opticalDepth: number;
  private _soundHorizon: number;
  private _history: CMBPowerSpectrum[];

  constructor(resolution: number = 64) {
    this._temperature = 2.725;
    this._resolution = resolution;
    this._intensityMap = this._initializeMap();
    this._polarizationMap = this._initializeMap();
    this._powerSpectrum = [];
    this._dipoleAnisotropy = 0;
    this._quadrupoleMoment = 0;
    this._opticalDepth = 0.09;
    this._soundHorizon = 147;
    this._history = [];
  }

  get temperature(): number {
    return this._temperature;
  }

  get resolution(): number {
    return this._resolution;
  }

  get dipoleAnisotropy(): number {
    return this._dipoleAnisotropy;
  }

  get quadrupoleMoment(): number {
    return this._quadrupoleMoment;
  }

  get opticalDepth(): number {
    return this._opticalDepth;
  }

  private _initializeMap(): number[][] {
    const map: number[][] = [];
    for (let i = 0; i < this._resolution; i++) {
      const row = new Array(this._resolution).fill(0);
      map.push(row);
    }
    return map;
  }

  public computeBlackbodySpectrum(frequency: number): number {
    const h = 6.626e-34;
    const kB = 1.38e-23;
    const c = 299792458;
    const T = this._temperature;
    const x = (h * frequency) / (kB * T);
    if (x > 100) return 0;
    return (2 * h * frequency * frequency * frequency) / (c * c * (Math.exp(x) - 1));
  }

  public generateAnisotropyMap(seed: number = 42): number[][] {
    let rng = seed;
    const next = () => {
      rng = (rng * 16807 + 0) % 2147483647;
      return (rng / 2147483647) * 2 - 1;
    };
    for (let i = 0; i < this._resolution; i++) {
      for (let j = 0; j < this._resolution; j++) {
        const theta = (i / this._resolution) * Math.PI;
        const phi = (j / this._resolution) * 2 * Math.PI;
        const fluctuation = next() * 1e-4 * this._temperature;
        const dipole = this._dipoleAnisotropy * Math.sin(theta) * Math.cos(phi);
        const quadrupole = this._quadrupoleMoment * (3 * Math.cos(theta) * Math.cos(theta) - 1) / 2;
        this._intensityMap[i][j] = this._temperature + fluctuation + dipole + quadrupole;
      }
    }
    return this._intensityMap.map(row => [...row]);
  }

  public computeAngularPowerSpectrum(maxL: number): CMBPowerSpectrum[] {
    const spectrum: CMBPowerSpectrum[] = [];
    for (let l = 2; l <= maxL; l++) {
      const clTT = 1e-10 / (l * (l + 1)) * (2 * Math.PI) * (1 + Math.pow(l / 220, 2));
      const clEE = clTT * 0.1 * Math.pow(this._opticalDepth, 2);
      const clTE = clTT * 0.05 * this._opticalDepth;
      spectrum.push({ multipoleL: l, clTT, clEE, clTE });
    }
    this._powerSpectrum = spectrum;
    return spectrum;
  }

  public computeAcousticPeakLocation(): number {
    const omegaB = 0.022;
    const omegaM = 0.12;
    return 200 * Math.sqrt(omegaM / omegaB);
  }

  public computeSilkDampingScale(): number {
    const omegaB = 0.022;
    const h = 0.7;
    return 1.6 / (omegaB * h);
  }

  public computeSachsWolfePlateau(l: number): number {
    return 1e-10 / (l * (l + 1)) * (2 * Math.PI);
  }

  public computeReionizationOpticalDepth(redshift: number): number {
    const sigmaT = 6.65e-29;
    const c = 299792458;
    const H0 = 70;
    const ne = 1e-7 * Math.pow(1 + redshift, 3);
    const dt = 1 / (H0 * Math.sqrt(0.3 * Math.pow(1 + redshift, 3) + 0.7));
    return ne * sigmaT * c * dt;
  }

  public addGravitationalLensing(lensingPotential: number[][]): void {
    for (let i = 0; i < this._resolution; i++) {
      for (let j = 0; j < this._resolution; j++) {
        const deflection = lensingPotential[i][j] || 0;
        const sourceI = Math.max(0, Math.min(this._resolution - 1, Math.floor(i + deflection)));
        const sourceJ = Math.max(0, Math.min(this._resolution - 1, Math.floor(j + deflection)));
        this._intensityMap[i][j] = this._intensityMap[sourceI][sourceJ];
      }
    }
  }

  public getIntensityMap(): number[][] {
    return this._intensityMap.map(row => [...row]);
  }

  public getPolarizationMap(): number[][] {
    return this._polarizationMap.map(row => [...row]);
  }

  public computeTemperatureVariance(): number {
    let variance = 0;
    for (let i = 0; i < this._resolution; i++) {
      for (let j = 0; j < this._resolution; j++) {
        const delta = this._intensityMap[i][j] - this._temperature;
        variance += delta * delta;
      }
    }
    return variance / (this._resolution * this._resolution);
  }

  public computeDipoleAmplitude(): number {
    let amp = 0;
    for (let i = 0; i < this._resolution; i++) {
      for (let j = 0; j < this._resolution; j++) {
        const theta = (i / this._resolution) * Math.PI;
        const phi = (j / this._resolution) * 2 * Math.PI;
        amp += this._intensityMap[i][j] * Math.sin(theta) * Math.cos(phi);
      }
    }
    return amp / (this._resolution * this._resolution);
  }

  public setOpticalDepth(tau: number): void {
    this._opticalDepth = Math.max(0, tau);
  }

  public getPowerSpectrum(): CMBPowerSpectrum[] {
    return this._powerSpectrum.map(p => ({ ...p }));
  }

  public getHistory(): CMBPowerSpectrum[] {
    return this._history.map(h => ({ ...h }));
  }

  public reset(): void {
    this._temperature = 2.725;
    this._intensityMap = this._initializeMap();
    this._polarizationMap = this._initializeMap();
    this._powerSpectrum = [];
    this._dipoleAnisotropy = 0;
    this._quadrupoleMoment = 0;
    this._opticalDepth = 0.09;
    this._soundHorizon = 147;
    this._history = [];
  }
}
