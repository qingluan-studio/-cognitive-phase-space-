import { DataPacket, PacketMeta } from '../shared/types';

/** Universe state. */
export interface Universe {
  id: string;
  age: number;
  size: number;
  density: number;
  hubble: number;
  omegaM: number;
  omegaLambda: number;
  omegaK: number;
}

/** A cosmic epoch. */
export interface CosmicEpoch {
  name: string;
  time: number;
  temperature: number;
  events: string[];
}

/** A cosmological parameter. */
export interface CosmologicalParameter {
  name: string;
  value: number;
  unit: string;
  description: string;
}

/** History record. */
interface CosmoRecord {
  operation: string;
  timestamp: number;
}

/** Speed of light (m/s). */
export const C = 2.99792458e8;
/** Hubble constant in km/s/Mpc. */
export const HUBBLE_DEFAULT = 70;
/** Critical density. */
export const RHO_CRIT = 9.47e-27;

export class Cosmology {
  private _parameters: Map<string, CosmologicalParameter> = new Map();
  private _epochs: CosmicEpoch[] = [];
  private _history: CosmoRecord[] = [];

  constructor() {
    this._initParameters();
    this._initEpochs();
  }

  hubbleLaw(distance: number, velocity: number): number {
    if (distance === 0) return 0;
    return velocity / distance;
  }

  hubbleConstant(): number {
    return HUBBLE_DEFAULT;
  }

  criticalDensity(H: number): number {
    const Hsi = H * 1000 / (3.086e22);
    return 3 * Hsi * Hsi / (8 * Math.PI * 6.6743e-11);
  }

  omegaValues(): { omegaM: number; omegaLambda: number; omegaK: number } {
    return { omegaM: 0.31, omegaLambda: 0.69, omegaK: 0 };
  }

  friedmannEquations(a: number, rho: number, lambda: number, k: number): { acceleration: number; expansion: number } {
    const H2 = (8 * Math.PI * 6.6743e-11 / 3) * rho + lambda / 3 - k / (a * a);
    const acceleration = -4 * Math.PI * 6.6743e-11 * rho / 3 + lambda / 3;
    return { acceleration, expansion: Math.sqrt(Math.max(0, H2)) };
  }

  cosmicMicrowaveBackground(): { temperature: number; anisotropy: number; peak: number } {
    return { temperature: 2.725, anisotropy: 1e-5, peak: 160.2 };
  }

  bigBangNucleosynthesis(): { hydrogen: number; helium: number; lithium: number; deuterium: number } {
    return { hydrogen: 0.75, helium: 0.25, lithium: 1e-9, deuterium: 2.6e-5 };
  }

  recombination(): { time: number; temperature: number; redshift: number } {
    return { time: 380000, temperature: 3000, redshift: 1100 };
  }

  darkAge(): { start: number; end: number; description: string } {
    return { start: 380000, end: 150e6, description: 'no stars yet formed' };
  }

  reionization(): { start: number; end: number; description: string } {
    return { start: 150e6, end: 1e9, description: 'first stars ionize hydrogen' };
  }

  structureFormation(spectrum: 'cold_dark_matter' | 'hot_dark_matter' | 'warm_dark_matter'): { scale: number; growthRate: number } {
    const params = {
      cold_dark_matter: { scale: 1e-3, growthRate: 1.0 },
      hot_dark_matter: { scale: 1e6, growthRate: 0.5 },
      warm_dark_matter: { scale: 1e1, growthRate: 0.8 },
    };
    return params[spectrum];
  }

  inflation(parameters: { duration: number; efold: number }): { expansionFactor: number; perturbationAmplitude: number } {
    return {
      expansionFactor: Math.exp(parameters.efold),
      perturbationAmplitude: 2e-5,
    };
  }

  darkMatter(signal: 'wimp' | 'axion' | 'sterile_neutrino'): { crossSection: number; mass: number } {
    const signals = {
      wimp: { crossSection: 1e-44, mass: 100 },
      axion: { crossSection: 1e-50, mass: 1e-5 },
      sterile_neutrino: { crossSection: 1e-40, mass: 7 },
    };
    return signals[signal];
  }

  darkEnergy(equation: 'cosmological_constant' | 'quintessence' | 'phantom'): { w: number; rho: number } {
    const equations = {
      cosmological_constant: { w: -1, rho: 6.9e-27 },
      quintessence: { w: -0.95, rho: 6.9e-27 },
      phantom: { w: -1.2, rho: 6.9e-27 },
    };
    return equations[equation];
  }

  cosmologicalRedshift(z: number): { wavelength: number; frequency: number } {
    const restWavelength = 500;
    return {
      wavelength: restWavelength * (1 + z),
      frequency: 1 / (1 + z),
    };
  }

  lookbackTime(z: number): number {
    const H0 = HUBBLE_DEFAULT * 1000 / 3.086e22;
    const omegaM = 0.31;
    const omegaLambda = 0.69;
    const integral = (2 / (3 * Math.sqrt(omegaLambda))) * Math.log((Math.sqrt(omegaLambda * (1 + z) ** 3) + Math.sqrt(omegaLambda * (1 + z) ** 3 + omegaM)) / Math.sqrt(omegaM));
    return integral / H0 / (3.156e7);
  }

  comovingDistance(z: number): number {
    const H0 = HUBBLE_DEFAULT;
    const c = 3e5;
    const integral = Math.log(1 + z) * 0.8;
    return c * integral / H0;
  }

  luminosityDistance(z: number): number {
    return this.comovingDistance(z) * (1 + z);
  }

  toPacket(): DataPacket<{ parameters: Map<string, CosmologicalParameter>; epochs: CosmicEpoch[]; history: CosmoRecord[] }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['astronomy', 'Cosmology'],
      priority: 1,
      phase: 'cosmology',
    };
    return {
      id: `cosmology-${Date.now().toString(36)}`,
      payload: { parameters: this._parameters, epochs: this._epochs, history: this._history },
      metadata,
    };
  }

  reset(): void {
    this._parameters = new Map();
    this._epochs = [];
    this._history = [];
    this._initParameters();
    this._initEpochs();
  }

  get parameterCount(): number { return this._parameters.size; }
  get epochCount(): number { return this._epochs.length; }
  get historyCount(): number { return this._history.length; }

  private _initParameters(): void {
    const params: CosmologicalParameter[] = [
      { name: 'H0', value: 70, unit: 'km/s/Mpc', description: 'Hubble constant' },
      { name: 'OmegaM', value: 0.31, unit: '', description: 'Matter density' },
      { name: 'OmegaLambda', value: 0.69, unit: '', description: 'Dark energy density' },
      { name: 'OmegaB', value: 0.049, unit: '', description: 'Baryon density' },
      { name: 'OmegaK', value: 0, unit: '', description: 'Curvature' },
      { name: 'sigma8', value: 0.81, unit: '', description: 'Density fluctuation amplitude' },
      { name: 'ns', value: 0.965, unit: '', description: 'Scalar spectral index' },
      { name: 'tau', value: 0.054, unit: '', description: 'Optical depth' },
      { name: 'T_CMB', value: 2.725, unit: 'K', description: 'CMB temperature' },
    ];
    for (const p of params) this._parameters.set(p.name, p);
  }

  private _initEpochs(): void {
    this._epochs = [
      { name: 'Planck Epoch', time: 1e-43, temperature: 1e32, events: ['quantum gravity dominates'] },
      { name: 'GUT Epoch', time: 1e-36, temperature: 1e29, events: ['inflation begins'] },
      { name: 'Electroweak Epoch', time: 1e-12, temperature: 1e15, events: ['Higgs field activation'] },
      { name: 'Quark Epoch', time: 1e-6, temperature: 1e13, events: ['quark-gluon plasma'] },
      { name: 'Hadron Epoch', time: 1e-3, temperature: 1e11, events: ['protons and neutrons form'] },
      { name: 'Lepton Epoch', time: 1, temperature: 1e10, events: ['lepton annihilation'] },
      { name: 'Nucleosynthesis', time: 100, temperature: 1e9, events: ['light nuclei form'] },
      { name: 'Photon Epoch', time: 1e4, temperature: 1e8, events: ['photons dominate'] },
      { name: 'Recombination', time: 380000, temperature: 3000, events: ['atoms form', 'CMB released'] },
      { name: 'Dark Age', time: 150e6, temperature: 60, events: ['no stars'] },
      { name: 'Reionization', time: 1e9, temperature: 20, events: ['first stars ignite'] },
      { name: 'Stellar Era', time: 13.8e9, temperature: 2.725, events: ['present day'] },
    ];
  }
}
