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

/** Dark matter candidate. */
export interface DarkMatterCandidate {
  name: string;
  type: string;
  massGeV: number;
  crossSectionCm2: number;
  status: string;
}

/** Dark energy model. */
export interface DarkEnergyModel {
  name: string;
  equationOfState: number; // w
  description: string;
  density: number; // kg/m^3
}

/** Primordial element abundance. */
export interface PrimordialAbundance {
  element: string;
  massFraction: number;
  numberFraction: number;
  source: string;
}

/** Large-scale structure type. */
export type StructureType = 'galaxy' | 'cluster' | 'supercluster' | 'filament' | 'void' | 'wall' | 'great_attractor' | 'lyman_alpha_bog';

/** Cosmic structure (large-scale). */
export interface CosmicStructure {
  name: string;
  type: StructureType;
  distanceMpc: number;
  sizeMpc: number;
  massSolar: number;
  discoveryYear: number;
  notes: string;
}

/** Cosmic distance ladder rung. */
export interface DistanceLadderRung {
  method: string;
  maxDistanceMpc: number;
  precision: number;
  calibrationObject: string;
  description: string;
}

/** CMB (Cosmic Microwave Background) data. */
export interface CMBData {
  temperatureK: number;
  dipoleMicroK: number;
  anisotropyMicroK: number;
  peakWavelengthMm: number;
  redshift: number;
  ageMyr: number;
}

/** Big Bang nucleosynthesis product. */
export interface BBNProduct {
  element: string;
  massFraction: number;
  halfLifeYears: number | null;
  formationTime: string;
  notes: string;
}

/** Gravitational wave event. */
export interface GravitationalWaveEvent {
  name: string;
  date: string;
  type: 'binary_black_hole' | 'binary_neutron_star' | 'black_hole_neutron_star' | 'unknown';
  distanceMpc: number;
  chirpMassSolar: number;
  strainAmplitude: number;
  totalMassSolar: number;
  detectionMethod: string;
}

/** Cosmic probe method. */
export interface CosmicProbe {
  name: string;
  type: 'baryon_acoustic_oscillation' | 'supernova' | 'weak_lensing' | 'cmb' | 'redshift_space_distortion';
  description: string;
  precision: number;
  measurable: string;
}

/** Cosmic horizon. */
export interface CosmicHorizon {
  name: string;
  radiusGpc: number;
  description: string;
}

/** Fundamental cosmological constant. */
export interface FundConstant {
  name: string;
  symbol: string;
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
/** Gravitational constant (m^3 kg^-1 s^-2). */
export const G = 6.6743e-11;
/** Planck constant (J·s). */
export const H_PLANCK = 6.62607015e-34;
/** Boltzmann constant (J/K). */
export const K_B = 1.380649e-23;
/** Stefan-Boltzmann constant (W m^-2 K^-4). */
export const SIGMA_SB = 5.670374419e-8;
/** Planck mass (kg). */
export const PLANCK_MASS = 2.176434e-8;
/** Planck length (m). */
export const PLANCK_LENGTH = 1.616255e-35;
/** Planck time (s). */
export const PLANCK_TIME = 5.391247e-44;
/** Planck temperature (K). */
export const PLANCK_TEMP = 1.416784e32;
/** Electron volt (J). */
export const EV = 1.602176634e-19;
/** Reduced Hubble constant h = H0/100 (dimensionless). */
export const H_REDUCED = 0.7;
/** Meters per Megaparsec. */
export const MPC_IN_M = 3.085677581e22;
/** One year (s). */
export const SECONDS_PER_YEAR = 3.15576e7;
/** Age of the universe (years). */
export const AGE_UNIVERSE_YR = 1.3797e10;
/** Critical density parameter Omega_C. */
export const OMEGA_C = 0.265;
/** Radius of observable universe (Gpc). */
export const OBSERVABLE_RADIUS_GPC = 14.3;
/** CMB temperature (K). */
export const T_CMB = 2.7255;

const DARK_MATTER_CANDIDATES: DarkMatterCandidate[] = [
  { name: 'WIMP', type: 'Weakly Interacting Massive Particle', massGeV: 100, crossSectionCm2: 1e-44, status: 'leading candidate' },
  { name: 'Axion', type: 'Pseudoscalar particle', massGeV: 1e-11, crossSectionCm2: 1e-50, status: 'predicted by Peccei-Quinn theory' },
  { name: 'Sterile Neutrino', type: 'Right-handed neutrino', massGeV: 7e-3, crossSectionCm2: 1e-40, status: 'warm dark matter candidate' },
  { name: 'Neutralino', type: 'Supersymmetric partner', massGeV: 100, crossSectionCm2: 1e-44, status: 'SUSY lightest stable particle' },
  { name: 'Kaluza-Klein', type: 'Extra dimension particle', massGeV: 1000, crossSectionCm2: 1e-43, status: 'universal extra dimensions' },
  { name: 'Gravitino', type: 'Superpartner of graviton', massGeV: 1e-3, crossSectionCm2: 1e-46, status: 'supergravity candidate' },
  { name: 'Hidden photon', type: 'Dark photon', massGeV: 1e-12, crossSectionCm2: 1e-60, status: 'dark sector mediator' },
  { name: 'Primordial black hole', type: 'Black hole from early universe', massGeV: 1e30, crossSectionCm2: 0, status: 'constrained by microlensing' },
];

const DARK_ENERGY_MODELS: DarkEnergyModel[] = [
  { name: 'Cosmological Constant (ΛCDM)', equationOfState: -1, density: 6.9e-27, description: 'Vacuum energy density from quantum field theory, constant in space and time.' },
  { name: 'Quintessence', equationOfState: -0.95, density: 6.9e-27, description: 'Scalar field with dynamic equation of state; can vary with time.' },
  { name: 'Phantom Energy', equationOfState: -1.2, density: 6.9e-27, description: 'Energy with w < -1; leads to Big Rip singularity.' },
  { name: 'Chaplygin Gas', equationOfState: -0.5, density: 6.9e-27, description: 'Exotic fluid that interpolates between dust and cosmological constant.' },
  { name: 'k-essence', equationOfState: -1, density: 6.9e-27, description: 'Scalar field with non-canonical kinetic term.' },
  { name: 'Modified Gravity (DGP)', equationOfState: -1, density: 0, description: 'Modified gravity on a brane; no dark energy field required.' },
  { name: 'Cardassian Expansion', equationOfState: -1, density: 6.9e-27, description: 'Modified Friedmann equation with extra term.' },
  { name: 'Holographic Dark Energy', equationOfState: -1, density: 6.9e-27, description: 'Energy density bounded by holographic principle.' },
];

const PRIMORDIAL_ABUNDANCES: PrimordialAbundance[] = [
  { element: 'Hydrogen-1', massFraction: 0.7526, numberFraction: 0.9248, source: 'Big Bang nucleosynthesis' },
  { element: 'Helium-4', massFraction: 0.2474, numberFraction: 0.0741, source: 'Big Bang nucleosynthesis' },
  { element: 'Deuterium-2', massFraction: 2.6e-5, numberFraction: 1.5e-4, source: 'Big Bang nucleosynthesis' },
  { element: 'Helium-3', massFraction: 1.1e-5, numberFraction: 1.1e-5, source: 'Big Bang nucleosynthesis' },
  { element: 'Lithium-7', massFraction: 5.2e-10, numberFraction: 4.2e-10, source: 'Big Bang nucleosynthesis' },
  { element: 'Beryllium-7', massFraction: 1e13, numberFraction: 1e-13, source: 'Big Bang nucleosynthesis (negligible)' },
  { element: 'Boron-11', massFraction: 1e-15, numberFraction: 1e-15, source: 'Big Bang nucleosynthesis (negligible)' },
];

const COSMIC_STRUCTURES: CosmicStructure[] = [
  { name: 'Local Group', type: 'cluster', distanceMpc: 0, sizeMpc: 3, massSolar: 2e12, discoveryYear: 2003, notes: 'Galaxy group including Milky Way and Andromeda' },
  { name: 'Virgo Supercluster', type: 'supercluster', distanceMpc: 16.5, sizeMpc: 30, massSolar: 1e15, discoveryYear: 1953, notes: 'Contains the Local Group' },
  { name: 'Laniakea Supercluster', type: 'supercluster', distanceMpc: 80, sizeMpc: 160, massSolar: 1e17, discoveryYear: 2014, notes: 'Contains Virgo Supercluster; means "immeasurable heaven"' },
  { name: 'Shapley Supercluster', type: 'supercluster', distanceMpc: 200, sizeMpc: 80, massSolar: 4e17, discoveryYear: 1930, notes: 'Largest concentration of matter in the local universe' },
  { name: 'Great Attractor', type: 'great_attractor', distanceMpc: 80, sizeMpc: 50, massSolar: 5e16, discoveryYear: 1986, notes: 'Gravitational anomaly pulling galaxies' },
  { name: 'Sloan Great Wall', type: 'wall', distanceMpc: 300, sizeMpc: 420, massSolar: 2e17, discoveryYear: 2003, notes: 'One of the largest known structures' },
  { name: 'Hercules-Corona Borealis Great Wall', type: 'wall', distanceMpc: 3000, sizeMpc: 3000, massSolar: 1e18, discoveryYear: 2013, notes: 'Largest known structure in the universe' },
  { name: 'Boötes Void', type: 'void', distanceMpc: 230, sizeMpc: 100, massSolar: 0, discoveryYear: 1981, notes: 'One of the largest known voids' },
  { name: 'Local Void', type: 'void', distanceMpc: 10, sizeMpc: 30, massSolar: 0, discoveryYear: 1987, notes: 'Void adjacent to the Local Group' },
  { name: 'CfA2 Great Wall', type: 'wall', distanceMpc: 70, sizeMpc: 250, massSolar: 2e17, discoveryYear: 1989, notes: 'Early-discovered large-scale structure' },
  { name: 'Coma Cluster (Abell 1656)', type: 'cluster', distanceMpc: 100, sizeMpc: 6, massSolar: 2e15, discoveryYear: 1930, notes: 'Large cluster in Coma Berenices' },
  { name: 'Perseus-Pisces Supercluster', type: 'supercluster', distanceMpc: 75, sizeMpc: 40, massSolar: 1e16, discoveryYear: 1979, notes: 'Long chain of galaxies' },
  { name: 'Pavo-Indus Supercluster', type: 'supercluster', distanceMpc: 70, sizeMpc: 30, massSolar: 1e16, discoveryYear: 1985, notes: 'Southern supercluster' },
  { name: 'Centaurus Cluster (Abell 3526)', type: 'cluster', distanceMpc: 56, sizeMpc: 6, massSolar: 1e15, discoveryYear: 1926, notes: 'Part of the Hydra-Centaurus Supercluster' },
  { name: 'Fornax Cluster (Abell S373)', type: 'cluster', distanceMpc: 20, sizeMpc: 3, massSolar: 7e13, discoveryYear: 1837, notes: 'Small cluster in Fornax' },
  { name: 'Norma Cluster (Abell 3627)', type: 'cluster', distanceMpc: 67, sizeMpc: 6, massSolar: 1e15, discoveryYear: 1980, notes: 'Believed near Great Attractor' },
  { name: 'Bullet Cluster (1E 0657-56)', type: 'cluster', distanceMpc: 1000, sizeMpc: 6, massSolar: 1e15, discoveryYear: 1995, notes: 'Key evidence for dark matter' },
  { name: 'Eridanus Supervoid', type: 'void', distanceMpc: 1800, sizeMpc: 300, massSolar: 0, discoveryYear: 2004, notes: 'Possible CMB cold spot explanation' },
  { name: 'Horologium-Reticulum Supercluster', type: 'supercluster', distanceMpc: 250, sizeMpc: 90, massSolar: 1e17, discoveryYear: 1980, notes: 'Large southern supercluster' },
  { name: 'Ursa Major Supercluster', type: 'supercluster', distanceMpc: 80, sizeMpc: 30, massSolar: 5e16, discoveryYear: 1980, notes: 'Northern supercluster' },
];

const DISTANCE_LADDER: DistanceLadderRung[] = [
  { method: 'Parallax', maxDistanceMpc: 0.0004, precision: 0.001, calibrationObject: 'Earth orbit (Gaia)', description: 'Direct geometric method using Earth orbit baseline' },
  { method: 'Main-Sequence Fitting', maxDistanceMpc: 0.06, precision: 0.1, calibrationObject: 'Hyades Cluster', description: 'Compares color-magnitude of cluster to nearby reference' },
  { method: 'RR Lyrae Variables', maxDistanceMpc: 0.1, precision: 0.1, calibrationObject: 'HIPPARCOS', description: 'Period-luminosity relation for RR Lyrae stars' },
  { method: 'Tip of Red Giant Branch (TRGB)', maxDistanceMpc: 5, precision: 0.05, calibrationObject: 'Local Group galaxies', description: 'Luminosity of red giant tip in old populations' },
  { method: 'Cepheid Variables', maxDistanceMpc: 30, precision: 0.05, calibrationObject: 'LMC Cepheids', description: 'Period-luminosity relation for Cepheids' },
  { method: 'Tully-Fisher Relation', maxDistanceMpc: 100, precision: 0.15, calibrationObject: 'Spiral galaxies', description: 'Luminosity vs rotation velocity for spirals' },
  { method: 'Faber-Jackson Relation', maxDistanceMpc: 100, precision: 0.2, calibrationObject: 'Elliptical galaxies', description: 'Luminosity vs velocity dispersion for ellipticals' },
  { method: 'Surface Brightness Fluctuation', maxDistanceMpc: 50, precision: 0.1, calibrationObject: 'Nearby ellipticals', description: 'Pixel-to-pixel fluctuations vs distance' },
  { method: 'Type Ia Supernovae', maxDistanceMpc: 1000, precision: 0.05, calibrationObject: 'Cepheid-calibrated SNe Ia', description: 'Standardizable candles up to z~2' },
  { method: 'Baryon Acoustic Oscillations (BAO)', maxDistanceMpc: 3000, precision: 0.05, calibrationObject: 'CMB acoustic peaks', description: 'Standard ruler from sound horizon' },
  { method: 'Redshift', maxDistanceMpc: 14000, precision: 0.001, calibrationObject: 'Cosmological model', description: 'Hubble law applied at cosmological distances' },
  { method: 'Time Delay Cosmography', maxDistanceMpc: 3000, precision: 0.05, calibrationObject: 'Strong lenses', description: 'Time delays in lensed quasars/supernovae' },
];

const CMB_DATA: CMBData = {
  temperatureK: 2.7255,
  dipoleMicroK: 3362,
  anisotropyMicroK: 18,
  peakWavelengthMm: 1.06,
  redshift: 1100,
  ageMyr: 380,
};

const BBN_PRODUCTS: BBNProduct[] = [
  { element: 'Hydrogen-1', massFraction: 0.7526, halfLifeYears: null, formationTime: '20 minutes after Big Bang', notes: 'Most abundant element in universe' },
  { element: 'Helium-4', massFraction: 0.2474, halfLifeYears: null, formationTime: '3-20 minutes after Big Bang', notes: 'Second-most abundant; very stable prediction' },
  { element: 'Deuterium-2', massFraction: 2.6e-5, halfLifeYears: null, formationTime: '3-20 minutes after Big Bang', notes: 'Highly sensitive to baryon density' },
  { element: 'Helium-3', massFraction: 1.1e-5, halfLifeYears: null, formationTime: '3-20 minutes after Big Bang', notes: 'Stable isotope; observed in HII regions' },
  { element: 'Lithium-7', massFraction: 5.2e-10, halfLifeYears: null, formationTime: '3-20 minutes after Big Bang', notes: 'Lithium problem: observed < predicted' },
  { element: 'Beryllium-7', massFraction: 1e-13, halfLifeYears: 0.15, formationTime: '3-20 minutes after Big Bang', notes: 'Radioactively decays to Lithium-7' },
  { element: 'Tritium (Hydrogen-3)', massFraction: 1e-15, halfLifeYears: 12.32, formationTime: '3-20 minutes after Big Bang', notes: 'Beta decays to Helium-3' },
];

const GRAVITATIONAL_WAVE_EVENTS: GravitationalWaveEvent[] = [
  { name: 'GW150914', date: '2015-09-14', type: 'binary_black_hole', distanceMpc: 440, chirpMassSolar: 28.1, strainAmplitude: 1e-21, totalMassSolar: 65, detectionMethod: 'LIGO Hanford + Livingston' },
  { name: 'GW151226', date: '2015-12-26', type: 'binary_black_hole', distanceMpc: 440, chirpMassSolar: 8.9, strainAmplitude: 3.4e-22, totalMassSolar: 21, detectionMethod: 'LIGO Hanford + Livingston' },
  { name: 'GW170104', date: '2017-01-04', type: 'binary_black_hole', distanceMpc: 880, chirpMassSolar: 21.1, strainAmplitude: 3.1e-22, totalMassSolar: 48, detectionMethod: 'LIGO Hanford + Livingston' },
  { name: 'GW170608', date: '2017-06-08', type: 'binary_black_hole', distanceMpc: 340, chirpMassSolar: 7.9, strainAmplitude: 3e-22, totalMassSolar: 18, detectionMethod: 'LIGO Livingston (Hanford offline)' },
  { name: 'GW170814', date: '2017-08-14', type: 'binary_black_hole', distanceMpc: 540, chirpMassSolar: 30.5, strainAmplitude: 1.1e-21, totalMassSolar: 53, detectionMethod: 'LIGO + Virgo (3-detector)' },
  { name: 'GW170817', date: '2017-08-17', type: 'binary_neutron_star', distanceMpc: 40, chirpMassSolar: 1.188, strainAmplitude: 5.4e-22, totalMassSolar: 2.8, detectionMethod: 'LIGO + Virgo + EM (kilonova)' },
  { name: 'GW190412', date: '2019-04-12', type: 'binary_black_hole', distanceMpc: 700, chirpMassSolar: 13.8, strainAmplitude: 5e-22, totalMassSolar: 38, detectionMethod: 'LIGO + Virgo (asymmetric masses)' },
  { name: 'GW190521', date: '2019-05-21', type: 'binary_black_hole', distanceMpc: 5300, chirpMassSolar: 64.3, strainAmplitude: 7.5e-22, totalMassSolar: 142, detectionMethod: 'LIGO + Virgo (highest mass)' },
  { name: 'GW190814', date: '2019-08-14', type: 'black_hole_neutron_star', distanceMpc: 241, chirpMassSolar: 6.1, strainAmplitude: 4.5e-22, totalMassSolar: 26, detectionMethod: 'LIGO + Virgo (2.6 Msun secondary)' },
  { name: 'GW200105', date: '2020-01-05', type: 'black_hole_neutron_star', distanceMpc: 278, chirpMassSolar: 3.4, strainAmplitude: 2.1e-22, totalMassSolar: 6.5, detectionMethod: 'LIGO Livingston + Virgo' },
];

const COSMIC_PROBES: CosmicProbe[] = [
  { name: 'Type Ia Supernovae', type: 'supernova', description: 'Standardizable candles measuring cosmic acceleration', precision: 0.05, measurable: 'H0, ΩΛ, w' },
  { name: 'Baryon Acoustic Oscillations', type: 'baryon_acoustic_oscillation', description: 'Standard ruler from sound horizon in early universe', precision: 0.05, measurable: 'H0, DA, ΩM' },
  { name: 'CMB Anisotropies', type: 'cmb', description: 'Angular power spectrum of CMB temperature fluctuations', precision: 0.01, measurable: 'H0, ΩM, ΩΛ, Ωb, ns, σ8, τ' },
  { name: 'Weak Gravitational Lensing', type: 'weak_lensing', description: 'Statistical shear of background galaxy shapes', precision: 0.1, measurable: 'σ8, ΩM, growth index' },
  { name: 'Redshift Space Distortions', type: 'redshift_space_distortion', description: 'Anisotropy from peculiar velocities', precision: 0.1, measurable: 'fσ8, growth rate' },
  { name: 'Lyman-α Forest', type: 'weak_lensing', description: 'Absorption by neutral hydrogen in quasar spectra', precision: 0.1, measurable: 'P(k), bias' },
  { name: 'Sunyaev-Zeldovich Effect', type: 'cmb', description: 'Inverse Compton scattering of CMB by cluster gas', precision: 0.1, measurable: 'cluster counts, σ8, ΩM' },
  { name: 'Strong Gravitational Lensing', type: 'weak_lensing', description: 'Time delays and image configurations', precision: 0.05, measurable: 'H0' },
  { name: 'Alcock-Paczynski Test', type: 'redshift_space_distortion', description: 'Geometric test using isotropy of objects', precision: 0.1, measurable: 'H(z), DA' },
  { name: 'Cosmic Chronometry', type: 'redshift_space_distortion', description: 'Age dating of passively evolving galaxies', precision: 0.15, measurable: 'H(z)' },
];

const COSMIC_HORIZONS: CosmicHorizon[] = [
  { name: 'Particle Horizon', radiusGpc: 14.3, description: 'Maximum distance from which particles could have traveled to observer since Big Bang; radius of observable universe.' },
  { name: 'Event Horizon', radiusGpc: 5.5, description: 'Maximum distance from which we will ever receive signals in the future (due to accelerated expansion).' },
  { name: 'Hubble Horizon', radiusGpc: 4.3, description: 'Distance at which recession velocity equals speed of light; c/H0.' },
  { name: 'Cosmological Horizon', radiusGpc: 14.3, description: 'Often used synonymously with particle horizon.' },
  { name: 'Sound Horizon', radiusGpc: 0.144, description: 'Comoving distance sound could travel before recombination; sets BAO scale (~147 Mpc).' },
];

const FUNDAMENTAL_CONSTANTS: FundConstant[] = [
  { name: 'Speed of Light', symbol: 'c', value: C, unit: 'm/s', description: 'Maximum speed of information in the universe' },
  { name: 'Gravitational Constant', symbol: 'G', value: G, unit: 'm^3 kg^-1 s^-2', description: 'Coupling strength of gravity' },
  { name: 'Planck Constant', symbol: 'h', value: H_PLANCK, unit: 'J·s', description: 'Quantum of action' },
  { name: 'Reduced Planck Constant', symbol: 'ℏ', value: H_PLANCK / (2 * Math.PI), unit: 'J·s', description: 'Quantum of angular momentum' },
  { name: 'Boltzmann Constant', symbol: 'k_B', value: K_B, unit: 'J/K', description: 'Relates temperature to energy' },
  { name: 'Stefan-Boltzmann Constant', symbol: 'σ', value: SIGMA_SB, unit: 'W m^-2 K^-4', description: 'Black body radiation power' },
  { name: 'Planck Mass', symbol: 'm_P', value: PLANCK_MASS, unit: 'kg', description: 'Mass scale at which quantum gravity becomes relevant' },
  { name: 'Planck Length', symbol: 'l_P', value: PLANCK_LENGTH, unit: 'm', description: 'Smallest meaningful length scale' },
  { name: 'Planck Time', symbol: 't_P', value: PLANCK_TIME, unit: 's', description: 'Time scale of Planck epoch' },
  { name: 'Planck Temperature', symbol: 'T_P', value: PLANCK_TEMP, unit: 'K', description: 'Temperature at Planck epoch' },
  { name: 'Cosmological Constant', symbol: 'Λ', value: 1.1056e-52, unit: 'm^-2', description: 'Vacuum energy density parameter' },
  { name: 'Hubble Constant', symbol: 'H0', value: HUBBLE_DEFAULT, unit: 'km/s/Mpc', description: 'Current rate of cosmic expansion' },
  { name: 'Vacuum Energy Density', symbol: 'ρ_Λ', value: 5.96e-27, unit: 'kg/m^3', description: 'Energy density of vacuum (dark energy)' },
  { name: 'Critical Density', symbol: 'ρ_c', value: 8.6e-27, unit: 'kg/m^3', description: 'Density required for flat universe' },
  { name: 'Baryon-to-Photon Ratio', symbol: 'η', value: 6.1e-10, unit: '', description: 'Number of baryons per photon' },
];

export class Cosmology {
  private _parameters: Map<string, CosmologicalParameter> = new Map();
  private _epochs: CosmicEpoch[] = [];
  private _history: CosmoRecord[] = [];
  private _darkMatter: DarkMatterCandidate[] = [];
  private _darkEnergy: DarkEnergyModel[] = [];
  private _primordial: PrimordialAbundance[] = [];
  private _structures: CosmicStructure[] = [];
  private _distanceLadder: DistanceLadderRung[] = [];
  private _gwEvents: GravitationalWaveEvent[] = [];
  private _probes: CosmicProbe[] = [];
  private _horizons: CosmicHorizon[] = [];
  private _constants: FundConstant[] = [];
  private _counter = 0;

  constructor() {
    this._initParameters();
    this._initEpochs();
    this._initAuxData();
  }

  hubbleLaw(distance: number, velocity: number): number {
    if (distance === 0) return 0;
    return velocity / distance;
  }

  /** Hubble flow: velocity = H0 * distance. */
  hubbleFlow(distanceMpc: number): number {
    return HUBBLE_DEFAULT * distanceMpc; // km/s
  }

  /** Hubble constant (km/s/Mpc). */
  hubbleConstant(): number {
    return HUBBLE_DEFAULT;
  }

  /** Hubble constant in SI units (1/s). */
  hubbleConstantSI(): number {
    return HUBBLE_DEFAULT * 1000 / MPC_IN_M;
  }

  /** Hubble time: 1/H0, in seconds and Gyr. */
  hubbleTime(): { seconds: number; gyr: number } {
    const hSi = this.hubbleConstantSI();
    const seconds = 1 / hSi;
    return { seconds, gyr: seconds / (SECONDS_PER_YEAR * 1e9) };
  }

  /** Hubble distance c/H0, in Mpc and meters. */
  hubbleDistance(): { mpc: number; meters: number } {
    const hSi = this.hubbleConstantSI();
    const meters = C / hSi;
    return { mpc: meters / MPC_IN_M, meters };
  }

  criticalDensity(H: number): number {
    const Hsi = H * 1000 / MPC_IN_M;
    return 3 * Hsi * Hsi / (8 * Math.PI * G);
  }

  /** Critical density in units of kg/m^3 for default H0. */
  criticalDensityDefault(): number {
    return this.criticalDensity(HUBBLE_DEFAULT);
  }

  /** Omega parameters for ΛCDM model. */
  omegaValues(): { omegaM: number; omegaLambda: number; omegaK: number } {
    return { omegaM: 0.31, omegaLambda: 0.69, omegaK: 0 };
  }

  /** Ω_b (baryons), Ω_c (cold dark matter), Ω_M (total matter). */
  matterDensities(): { omegaB: number; omegaC: number; omegaM: number } {
    return { omegaB: 0.049, omegaC: 0.265, omegaM: 0.314 };
  }

  friedmannEquations(a: number, rho: number, lambda: number, k: number): { acceleration: number; expansion: number } {
    const H2 = (8 * Math.PI * G / 3) * rho + lambda / 3 - k / (a * a);
    const acceleration = -4 * Math.PI * G * rho / 3 + lambda / 3;
    return { acceleration, expansion: Math.sqrt(Math.max(0, H2)) };
  }

  /** Deceleration parameter q0 = (Ω_M / 2) - Ω_Λ. */
  decelerationParameter(): number {
    const { omegaM, omegaLambda } = this.omegaValues();
    return 0.5 * omegaM - omegaLambda;
  }

  cosmicMicrowaveBackground(): { temperature: number; anisotropy: number; peak: number } {
    return { temperature: T_CMB, anisotropy: 1e-5, peak: 160.2 };
  }

  /** CMB data with dipole, anisotropy, peak wavelength, redshift, age. */
  cmbData(): CMBData {
    return { ...CMB_DATA };
  }

  bigBangNucleosynthesis(): { hydrogen: number; helium: number; lithium: number; deuterium: number } {
    return { hydrogen: 0.7526, helium: 0.2474, lithium: 5.2e-10, deuterium: 2.6e-5 };
  }

  /** Detailed BBN products. */
  bbnProducts(): BBNProduct[] {
    return BBN_PRODUCTS.map(p => ({ ...p }));
  }

  /** Primordial abundances from BBN. */
  primordialAbundances(): PrimordialAbundance[] {
    return PRIMORDIAL_ABUNDANCES.map(p => ({ ...p }));
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

  /** Calculate comoving expansion factor a(t) ∝ t^(2/3) for matter domination. */
  scaleFactorMatter(time: number): number {
    return Math.pow(time, 2 / 3);
  }

  /** Scale factor a(t) ∝ exp(Ht) for dark energy domination. */
  scaleFactorDarkEnergy(time: number, hubble: number = HUBBLE_DEFAULT): number {
    const hSi = hubble * 1000 / MPC_IN_M;
    return Math.exp(hSi * time);
  }

  /** Temperature of the universe at redshift z: T = T0 * (1 + z). */
  temperatureAtRedshift(z: number, t0: number = T_CMB): number {
    return t0 * (1 + z);
  }

  /** Time-temperature relation in radiation-dominated universe: T ∝ t^(-1/2). */
  timeFromTemperature(temperatureK: number): number {
    // t (seconds) ≈ (1e10 / T)^2 with T in K (radiation dominated era)
    return Math.pow(1e10 / temperatureK, 2);
  }

  /** Photon-to-baryon ratio. */
  photonBaryonRatio(): number {
    return 1.64e9;
  }

  darkMatter(signal: 'wimp' | 'axion' | 'sterile_neutrino'): { crossSection: number; mass: number } {
    const signals = {
      wimp: { crossSection: 1e-44, mass: 100 },
      axion: { crossSection: 1e-50, mass: 1e-5 },
      sterile_neutrino: { crossSection: 1e-40, mass: 7 },
    };
    return signals[signal];
  }

  /** All dark matter candidates. */
  darkMatterCandidates(): DarkMatterCandidate[] {
    return DARK_MATTER_CANDIDATES.map(d => ({ ...d }));
  }

  /** Find dark matter candidate by name. */
  darkMatterByName(name: string): DarkMatterCandidate | null {
    const lower = name.toLowerCase();
    return DARK_MATTER_CANDIDATES.find(d => d.name.toLowerCase() === lower) ?? null;
  }

  darkEnergy(equation: 'cosmological_constant' | 'quintessence' | 'phantom'): { w: number; rho: number } {
    const equations = {
      cosmological_constant: { w: -1, rho: 6.9e-27 },
      quintessence: { w: -0.95, rho: 6.9e-27 },
      phantom: { w: -1.2, rho: 6.9e-27 },
    };
    return equations[equation];
  }

  /** All dark energy models. */
  darkEnergyModels(): DarkEnergyModel[] {
    return DARK_ENERGY_MODELS.map(d => ({ ...d }));
  }

  /** Find dark energy model by name. */
  darkEnergyByName(name: string): DarkEnergyModel | null {
    const lower = name.toLowerCase();
    return DARK_ENERGY_MODELS.find(d => d.name.toLowerCase().includes(lower)) ?? null;
  }

  cosmologicalRedshift(z: number): { wavelength: number; frequency: number } {
    const restWavelength = 500;
    return {
      wavelength: restWavelength * (1 + z),
      frequency: 1 / (1 + z),
    };
  }

  /** Cosmological redshift: photon wavelength stretches with scale factor. */
  redshiftFromScale(a: number): number {
    if (a <= 0) return Infinity;
    return 1 / a - 1;
  }

  /** Scale factor from redshift. */
  scaleFromRedshift(z: number): number {
    return 1 / (1 + z);
  }

  lookbackTime(z: number): number {
    const H0 = HUBBLE_DEFAULT * 1000 / MPC_IN_M;
    const omegaM = 0.31;
    const omegaLambda = 0.69;
    const integral = (2 / (3 * Math.sqrt(omegaLambda))) * Math.log(
      (Math.sqrt(omegaLambda * (1 + z) ** 3) + Math.sqrt(omegaLambda * (1 + z) ** 3 + omegaM)) / Math.sqrt(omegaM),
    );
    return integral / H0 / SECONDS_PER_YEAR;
  }

  comovingDistance(z: number): number {
    const H0 = HUBBLE_DEFAULT;
    const c = 3e5;
    const integral = Math.log(1 + z) * 0.8;
    return c * integral / H0;
  }

  /** Luminosity distance d_L = d_C * (1 + z). */
  luminosityDistance(z: number): number {
    return this.comovingDistance(z) * (1 + z);
  }

  /** Angular diameter distance d_A = d_C / (1 + z). */
  angularDiameterDistance(z: number): number {
    return this.comovingDistance(z) / (1 + z);
  }

  /** Distance modulus from redshift (uses luminosity distance). */
  distanceModulusAtRedshift(z: number): number {
    const dLpc = this.luminosityDistance(z) * 1e6; // Mpc to pc
    return 5 * Math.log10(Math.max(1, dLpc)) - 5;
  }

  /** Age of the universe at redshift z (matter+lambda). */
  ageAtRedshift(z: number): number {
    const H0 = HUBBLE_DEFAULT * 1000 / MPC_IN_M;
    const omegaM = 0.31;
    const omegaLambda = 0.69;
    const a = 1 / (1 + z);
    const term = Math.sqrt(omegaLambda * Math.pow(a, 3) + omegaM);
    const age = (2 / (3 * H0 * Math.sqrt(omegaLambda))) * Math.log((1 + term) / Math.max(1e-12, term - 1 + (term + 1)));
    void a;
    // Simpler approximate form
    return Math.max(0, age) / SECONDS_PER_YEAR;
  }

  /** Age of the universe in years. */
  ageOfUniverse(): number {
    return AGE_UNIVERSE_YR;
  }

  /** All cosmic epochs. */
  epochs(): CosmicEpoch[] {
    return [...this._epochs];
  }

  /** Find epoch by name. */
  epochByName(name: string): CosmicEpoch | null {
    const lower = name.toLowerCase();
    return this._epochs.find(e => e.name.toLowerCase() === lower) ?? null;
  }

  /** All cosmological parameters. */
  parameters(): CosmologicalParameter[] {
    return [...this._parameters.values()];
  }

  /** Get a parameter by name. */
  parameter(name: string): CosmologicalParameter | null {
    return this._parameters.get(name) ?? null;
  }

  /** Large-scale structures catalog. */
  cosmicStructures(): CosmicStructure[] {
    return [...this._structures];
  }

  /** Find cosmic structure by name. */
  structureByName(name: string): CosmicStructure | null {
    const lower = name.toLowerCase();
    return this._structures.find(s => s.name.toLowerCase().includes(lower)) ?? null;
  }

  /** Structures of a given type. */
  structuresByType(type: StructureType): CosmicStructure[] {
    return this._structures.filter(s => s.type === type);
  }

  /** Cosmic distance ladder rungs. */
  distanceLadder(): DistanceLadderRung[] {
    return [...this._distanceLadder];
  }

  /** Gravitational wave events. */
  gravitationalWaveEvents(): GravitationalWaveEvent[] {
    return [...this._gwEvents];
  }

  /** Find gravitational wave event by name. */
  gwByName(name: string): GravitationalWaveEvent | null {
    const lower = name.toLowerCase();
    return this._gwEvents.find(e => e.name.toLowerCase() === lower) ?? null;
  }

  /** All cosmic probes. */
  cosmicProbes(): CosmicProbe[] {
    return [...this._probes];
  }

  /** Cosmic horizons. */
  cosmicHorizons(): CosmicHorizon[] {
    return [...this._horizons];
  }

  /** Find horizon by name. */
  horizonByName(name: string): CosmicHorizon | null {
    const lower = name.toLowerCase();
    return this._horizons.find(h => h.name.toLowerCase().includes(lower)) ?? null;
  }

  /** Fundamental constants. */
  fundamentalConstants(): FundConstant[] {
    return [...this._constants];
  }

  /** Find constant by symbol. */
  constantBySymbol(symbol: string): FundConstant | null {
    const lower = symbol.toLowerCase();
    return this._constants.find(c => c.symbol.toLowerCase() === lower) ?? null;
  }

  /** Mass-energy equivalence: E = mc^2. */
  massEnergy(massKg: number): number {
    return massKg * C * C;
  }

  /** Convert electron volts to joules. */
  evToJoules(ev: number): number {
    return ev * EV;
  }

  /** Convert temperature to energy (kT) in eV. */
  temperatureToEnergy(temperatureK: number): number {
    return K_B * temperatureK / EV;
  }

  /** Stefan-Boltzmann radiation flux: j* = σ T^4. */
  radiationFlux(temperatureK: number): number {
    return SIGMA_SB * Math.pow(temperatureK, 4);
  }

  /** Planck energy density for black body. */
  planckEnergyDensity(temperatureK: number): number {
    // u = a T^4 where a = 4σ/c = 7.5657e-16 J m^-3 K^-4
    const a = 7.5657e-16;
    return a * Math.pow(temperatureK, 4);
  }

  /** Number density of CMB photons. */
  cmbPhotonDensity(): number {
    return 411; // photons per cm^3 at T_CMB
  }

  /** Jeans length for gravitational collapse. */
  jeansLength(temperatureK: number, densityKgm3: number, meanMolecularWeight: number = 1.0): number {
    // λ_J = c_s * sqrt(π / (G ρ)), c_s = sqrt(γ k T / (m_H μ))
    const c_s = Math.sqrt(5 * K_B * temperatureK / (1.67e-27 * meanMolecularWeight));
    return c_s * Math.sqrt(Math.PI / (G * Math.max(1e-30, densityKgm3)));
  }

  /** Jeans mass: M_J = (π/6) ρ λ_J^3. */
  jeansMass(temperatureK: number, densityKgm3: number, meanMolecularWeight: number = 1.0): number {
    const lambda = this.jeansLength(temperatureK, densityKgm3, meanMolecularWeight);
    return (Math.PI / 6) * densityKgm3 * Math.pow(lambda, 3);
  }

  /** Hubble parameter at redshift z in ΛCDM: H(z) = H0 * sqrt(Ω_M(1+z)^3 + Ω_Λ + Ω_K(1+z)^2). */
  hubbleAtRedshift(z: number): number {
    const { omegaM, omegaLambda, omegaK } = this.omegaValues();
    return HUBBLE_DEFAULT * Math.sqrt(omegaM * Math.pow(1 + z, 3) + omegaLambda + omegaK * Math.pow(1 + z, 2));
  }

  /** Density parameter at redshift z: Ω_M(z), Ω_Λ(z), Ω_K(z). */
  omegaAtRedshift(z: number): { omegaM: number; omegaLambda: number; omegaK: number } {
    const { omegaM, omegaLambda, omegaK } = this.omegaValues();
    const E2 = omegaM * Math.pow(1 + z, 3) + omegaLambda + omegaK * Math.pow(1 + z, 2);
    return {
      omegaM: omegaM * Math.pow(1 + z, 3) / E2,
      omegaLambda: omegaLambda / E2,
      omegaK: omegaK * Math.pow(1 + z, 2) / E2,
    };
  }

  /** Comoving volume element dV/dz/dΩ at redshift z. */
  comovingVolumeElement(z: number): number {
    const dH = C * MPC_IN_M / (HUBBLE_DEFAULT * 1000); // Hubble distance in Mpc
    const dm = this.comovingDistance(z); // transverse comoving distance (flat universe)
    const E = Math.sqrt(0.31 * Math.pow(1 + z, 3) + 0.69);
    return dH * dm * dm / Math.max(1e-12, E);
  }

  /** Fate of the universe based on Ω_Λ and w. */
  fateOfUniverse(omegaLambda: number, w: number): string {
    if (w < -1) return 'Big Rip: phantom energy tears apart spacetime.';
    if (omegaLambda > 1) return w === -1 ? 'de Sitter expansion: exponential expansion forever' : 'exponential expansion';
    if (omegaLambda < 1 && w === -1) return 'Big Crunch: gravity eventually halts and reverses expansion';
    if (omegaLambda === 0) return 'Coasting or recollapse depending on Ω_M';
    return 'Heat death: stars burn out, galaxies recede, universe grows cold';
  }

  toPacket(): DataPacket<{ parameters: Map<string, CosmologicalParameter>; epochs: CosmicEpoch[]; history: CosmoRecord[] }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['astronomy', 'Cosmology'],
      priority: 1,
      phase: 'cosmology',
    };
    return {
      id: `cosmology-${Date.now().toString(36)}-${++this._counter}`,
      payload: { parameters: this._parameters, epochs: this._epochs, history: this._history },
      metadata,
    };
  }

  reset(): void {
    this._parameters = new Map();
    this._epochs = [];
    this._history = [];
    this._darkMatter = [];
    this._darkEnergy = [];
    this._primordial = [];
    this._structures = [];
    this._distanceLadder = [];
    this._gwEvents = [];
    this._probes = [];
    this._horizons = [];
    this._constants = [];
    this._counter = 0;
    this._initParameters();
    this._initEpochs();
    this._initAuxData();
  }

  get parameterCount(): number { return this._parameters.size; }
  get epochCount(): number { return this._epochs.length; }
  get historyCount(): number { return this._history.length; }
  get darkMatterCount(): number { return this._darkMatter.length; }
  get darkEnergyModelCount(): number { return this._darkEnergy.length; }
  get primordialCount(): number { return this._primordial.length; }
  get structureCount(): number { return this._structures.length; }
  get distanceLadderCount(): number { return this._distanceLadder.length; }
  get gwEventCount(): number { return this._gwEvents.length; }
  get probeCount(): number { return this._probes.length; }
  get horizonCount(): number { return this._horizons.length; }
  get constantCount(): number { return this._constants.length; }

  private _initParameters(): void {
    const params: CosmologicalParameter[] = [
      { name: 'H0', value: 70, unit: 'km/s/Mpc', description: 'Hubble constant' },
      { name: 'OmegaM', value: 0.31, unit: '', description: 'Matter density' },
      { name: 'OmegaLambda', value: 0.69, unit: '', description: 'Dark energy density' },
      { name: 'OmegaB', value: 0.049, unit: '', description: 'Baryon density' },
      { name: 'OmegaC', value: 0.265, unit: '', description: 'Cold dark matter density' },
      { name: 'OmegaK', value: 0, unit: '', description: 'Curvature' },
      { name: 'sigma8', value: 0.81, unit: '', description: 'Density fluctuation amplitude' },
      { name: 'ns', value: 0.965, unit: '', description: 'Scalar spectral index' },
      { name: 'tau', value: 0.054, unit: '', description: 'Optical depth' },
      { name: 'T_CMB', value: 2.7255, unit: 'K', description: 'CMB temperature' },
      { name: 'w', value: -1, unit: '', description: 'Dark energy equation of state' },
      { name: 'Y_He', value: 0.2453, unit: '', description: 'Helium mass fraction' },
      { name: 'z_reion', value: 8.8, unit: '', description: 'Reionization redshift' },
      { name: 't0', value: 13.8, unit: 'Gyr', description: 'Age of universe' },
      { name: 'h', value: 0.7, unit: '', description: 'Reduced Hubble constant' },
      { name: 'Omega_b/h^2', value: 0.0224, unit: '', description: 'Physical baryon density' },
      { name: 'Omega_c/h^2', value: 0.120, unit: '', description: 'Physical CDM density' },
      { name: 'r', value: 0.06, unit: '', description: 'Tensor-to-scalar ratio' },
      { name: 'dn/dlnk', value: 0, unit: '', description: 'Running of spectral index' },
      { name: 'N_eff', value: 3.046, unit: '', description: 'Effective number of neutrino species' },
    ];
    for (const p of params) this._parameters.set(p.name, p);
  }

  private _initEpochs(): void {
    this._epochs = [
      { name: 'Planck Epoch', time: 1e-43, temperature: 1e32, events: ['quantum gravity dominates'] },
      { name: 'GUT Epoch', time: 1e-36, temperature: 1e29, events: ['inflation begins', 'electroweak + strong unification'] },
      { name: 'Electroweak Epoch', time: 1e-12, temperature: 1e15, events: ['Higgs field activation', 'electroweak symmetry breaking'] },
      { name: 'Quark Epoch', time: 1e-6, temperature: 1e13, events: ['quark-gluon plasma'] },
      { name: 'Hadron Epoch', time: 1e-3, temperature: 1e11, events: ['protons and neutrons form'] },
      { name: 'Lepton Epoch', time: 1, temperature: 1e10, events: ['lepton annihilation'] },
      { name: 'Nucleosynthesis', time: 100, temperature: 1e9, events: ['light nuclei form (D, He, Li)'] },
      { name: 'Photon Epoch', time: 1e4, temperature: 1e8, events: ['photons dominate', 'matter-radiation equality'] },
      { name: 'Recombination', time: 380000, temperature: 3000, events: ['atoms form', 'CMB released'] },
      { name: 'Dark Age', time: 150e6, temperature: 60, events: ['no stars yet formed'] },
      { name: 'Reionization', time: 1e9, temperature: 20, events: ['first stars ignite', 'quasars form'] },
      { name: 'Stellar Era', time: 13.8e9, temperature: 2.725, events: ['present day', 'galaxy formation complete'] },
      { name: 'Degenerate Era', time: 1e15, temperature: 0.01, events: ['stars exhausted', 'proton decay (if any)'] },
      { name: 'Black Hole Era', time: 1e40, temperature: 1e-15, events: ['only black holes remain'] },
      { name: 'Dark Era', time: 1e100, temperature: 1e-30, events: ['heat death', 'all black holes evaporated'] },
    ];
  }

  private _initAuxData(): void {
    this._darkMatter = DARK_MATTER_CANDIDATES.map(d => ({ ...d }));
    this._darkEnergy = DARK_ENERGY_MODELS.map(d => ({ ...d }));
    this._primordial = PRIMORDIAL_ABUNDANCES.map(p => ({ ...p }));
    this._structures = COSMIC_STRUCTURES.map(s => ({ ...s }));
    this._distanceLadder = DISTANCE_LADDER.map(d => ({ ...d }));
    this._gwEvents = GRAVITATIONAL_WAVE_EVENTS.map(g => ({ ...g }));
    this._probes = COSMIC_PROBES.map(p => ({ ...p }));
    this._horizons = COSMIC_HORIZONS.map(h => ({ ...h }));
    this._constants = FUNDAMENTAL_CONSTANTS.map(c => ({ ...c }));
  }
}
