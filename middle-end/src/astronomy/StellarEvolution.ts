import { DataPacket, PacketMeta } from '../shared/types';

/** Stellar stage identifier. */
export type StellarStageName =
  | 'protostar' | 'pre_main_sequence' | 'main_sequence' | 'red_giant_branch'
  | 'horizontal_branch' | 'asymptotic_giant' | 'planetary_nebula' | 'white_dwarf'
  | 'neutron_star' | 'black_hole' | 'supernova' | 'helium_flash'
  | 'carbon_burning' | 'neon_burning' | 'oxygen_burning' | 'silicon_burning';

/** A star. */
export interface Star {
  id: string;
  name: string;
  mass: number;
  radius: number;
  temp: number;
  luminosity: number;
  stage: StellarStageName;
  age: number;
  metallicity: number;
  rotationPeriod: number;
  magneticField: number;
  composition: { hydrogen: number; helium: number; metals: number };
}

/** A stellar evolution stage. */
export interface StellarStage {
  name: StellarStageName;
  duration: number;
  process: string;
  temperature: number;
  luminosity: number;
  massRange: [number, number];
}

/** Hertzsprung-Russell diagram point. */
export interface HRDiagram {
  stars: { temp: number; luminosity: number; name: string; stage: StellarStageName; mass: number }[];
  spectralClasses: string[];
  luminosityClasses: string[];
  evolutionTracks: { mass: number; points: { temp: number; luminosity: number }[] }[];
}

/** Nucleosynthesis product. */
export interface NucleosynthesisProduct {
  element: string;
  abundance: number;
  process: string;
  birthSite: string;
}

/** Supernova type and properties. */
export interface Supernova {
  type: string;
  progenitor: string;
  peakLuminosity: number;
  energy: number;
  ejectaMass: number;
  remnant: string;
}

/** Stellar remnant. */
export interface StellarRemnant {
  type: 'white_dwarf' | 'neutron_star' | 'black_hole';
  mass: number;
  radius: number;
  density: number;
  temperature: number;
  magneticField: number;
}

/** History record. */
interface StellarRecord {
  starId: string;
  fromStage: StellarStageName;
  toStage: StellarStageName;
  timestamp: number;
}

/** Solar luminosity in watts. */
export const SOLAR_LUMINOSITY = 3.828e26;
/** Solar mass in kg. */
export const SOLAR_MASS = 1.989e30;
/** Solar radius in meters. */
export const SOLAR_RADIUS = 6.96e8;
/** Solar effective temperature in Kelvin. */
export const SOLAR_TEMPERATURE = 5778;
/** Solar age in years. */
export const SOLAR_AGE = 4.6e9;
/** Chandrasekhar limit (solar masses). */
export const CHANDRASEKHAR_LIMIT = 1.44;
/** Oppenheimer-Volkoff limit (solar masses). */
export const OPPENHEIMER_VOLKOFF_LIMIT = 2.1;
/** Tolman-Oppenheimer-Volkoff limit estimate (solar masses). */
export const TOV_LIMIT = 2.5;
/** Speed of light. */
export const C = 2.99792458e8;
/** Gravitational constant. */
export const G = 6.6743e-11;
/** Stefan-Boltzmann constant. */
export const STEFAN_BOLTZMANN = 5.670374419e-8;
/** Proton mass. */
export const PROTON_MASS = 1.6726219e-27;
/** Electron mass. */
export const ELECTRON_MASS = 9.10938356e-31;
/** Boltzmann constant. */
export const BOLTZMANN = 1.380649e-23;
/** Planck constant. */
export const PLANCK_CONSTANT = 6.62607015e-34;
/** Reduced Planck constant. */
export const HBAR = 1.054571817e-34;
/** Atomic mass unit. */
export const AMU = 1.66053906660e-27;
/** Hydrogen mass fraction (solar). */
export const X_SOLAR = 0.7381;
/** Helium mass fraction (solar). */
export const Y_SOLAR = 0.2485;
/** Metallicity (solar). */
export const Z_SOLAR = 0.0134;
/** Eddington luminosity constant. */
export const EDDINGTON_CONSTANT = 1.26e31;

export class StellarEvolution {
  private _stars: Map<string, Star> = new Map();
  private _stages: StellarStage[] = [];
  private _history: StellarRecord[] = [];
  private _counter = 0;
  private _remnants: StellarRemnant[] = [];
  private _supernovae: Supernova[] = [];
  private _nucleosynthesis: NucleosynthesisProduct[] = [];

  constructor() {
    this._stages = this._initStages();
  }

  protostar(cloudMass: number, cloudDensity: number, metallicity: number = 0.02): Star {
    const mass = cloudMass;
    const radius = Math.pow(mass / (4 / 3 * Math.PI * cloudDensity), 1 / 3) * 100;
    const temp = 3000;
    const luminosity = mass * 10;
    return this._createStar('protostar-1', 'Protostar', mass, radius, temp, luminosity, 'protostar', 0, metallicity);
  }

  preMainSequence(mass: number, metallicity: number = 0.02): Star {
    const radius = mass * 2;
    const temp = 4000 * Math.pow(mass, 0.3);
    const luminosity = Math.pow(mass, 1.5);
    return this._createStar('pms', 'Pre-Main Sequence', mass, radius, temp, luminosity, 'pre_main_sequence', 0, metallicity);
  }

  mainSequence(mass: number, metallicity: number = 0.02): Star {
    const luminosity = Math.pow(mass, mass < 0.5 ? 2.3 : mass < 2 ? 4 : 3.5);
    const temp = 5778 * Math.pow(mass, 0.54);
    const radius = Math.pow(mass, 0.8);
    return this._createStar(`ms-${mass}`, 'Main Sequence', mass, radius, temp, luminosity, 'main_sequence', 0, metallicity);
  }

  redGiantBranch(star: Star): Star {
    return this._evolve(star, 'red_giant_branch', {
      radius: star.radius * 100,
      temp: star.temp * 0.5,
      luminosity: star.luminosity * 1000,
    });
  }

  heliumFlash(star: Star): Star {
    return this._evolve(star, 'helium_flash', {
      radius: star.radius * 0.1,
      temp: star.temp * 2,
      luminosity: star.luminosity * 0.1,
    });
  }

  horizontalBranch(star: Star): Star {
    return this._evolve(star, 'horizontal_branch', {
      radius: star.radius * 20,
      temp: star.temp * 1.5,
      luminosity: star.luminosity * 50,
    });
  }

  asymptoticGiant(star: Star): Star {
    return this._evolve(star, 'asymptotic_giant', {
      radius: star.radius * 200,
      temp: star.temp * 0.5,
      luminosity: star.luminosity * 4000,
    });
  }

  planetaryNebula(star: Star): Star {
    return this._evolve(star, 'planetary_nebula', {
      radius: star.radius,
      temp: 100000,
      luminosity: star.luminosity * 0.1,
    });
  }

  whiteDwarf(star: Star, mass: number): Star {
    const remnant: StellarRemnant = {
      type: 'white_dwarf',
      mass,
      radius: 0.01 * Math.pow(mass / CHANDRASEKHAR_LIMIT, -1 / 3),
      density: 1e9,
      temperature: 10000,
      magneticField: 1e6,
    };
    this._remnants.push(remnant);
    return this._evolve(star, 'white_dwarf', {
      radius: 0.01,
      temp: 10000,
      luminosity: 0.001,
      mass,
    });
  }

  neutronStar(star: Star, mass: number): Star {
    const remnant: StellarRemnant = {
      type: 'neutron_star',
      mass,
      radius: 1e-5,
      density: 1e18,
      temperature: 1e6,
      magneticField: 1e8,
    };
    this._remnants.push(remnant);
    return this._evolve(star, 'neutron_star', {
      radius: 1e-5,
      temp: 1e6,
      luminosity: 0.0001,
      mass,
    });
  }

  blackHole(star: Star, mass: number): Star {
    const schwarzschildRadius = 2 * G * mass * SOLAR_MASS / (C * C) / SOLAR_RADIUS;
    const remnant: StellarRemnant = {
      type: 'black_hole',
      mass,
      radius: schwarzschildRadius,
      density: Infinity,
      temperature: 0,
      magneticField: 0,
    };
    this._remnants.push(remnant);
    return this._evolve(star, 'black_hole', {
      radius: schwarzschildRadius,
      temp: 0,
      luminosity: 0,
      mass,
    });
  }

  supernova(star: Star, type: string = 'II'): Star {
    const supernova: Supernova = {
      type,
      progenitor: star.name,
      peakLuminosity: 1e10,
      energy: 1e46,
      ejectaMass: star.mass * 0.5,
      remnant: star.mass > 20 ? 'black_hole' : 'neutron_star',
    };
    this._supernovae.push(supernova);
    return this._evolve(star, 'supernova', {
      radius: star.radius * 1000,
      temp: 1e9,
      luminosity: 1e10,
    });
  }

  carbonBurning(star: Star): Star {
    return this._evolve(star, 'carbon_burning', {
      temp: star.temp * 5,
      luminosity: star.luminosity * 100,
    });
  }

  neonBurning(star: Star): Star {
    return this._evolve(star, 'neon_burning', {
      temp: star.temp * 10,
      luminosity: star.luminosity * 500,
    });
  }

  oxygenBurning(star: Star): Star {
    return this._evolve(star, 'oxygen_burning', {
      temp: star.temp * 20,
      luminosity: star.luminosity * 1000,
    });
  }

  siliconBurning(star: Star): Star {
    return this._evolve(star, 'silicon_burning', {
      temp: star.temp * 50,
      luminosity: star.luminosity * 5000,
    });
  }

  stellarClassification(temp: number, luminosity: number): { spectralClass: string; luminosityClass: string } {
    let spectralClass = 'M';
    if (temp >= 30000) spectralClass = 'O';
    else if (temp >= 10000) spectralClass = 'B';
    else if (temp >= 7500) spectralClass = 'A';
    else if (temp >= 6000) spectralClass = 'F';
    else if (temp >= 5200) spectralClass = 'G';
    else if (temp >= 3700) spectralClass = 'K';
    let luminosityClass = 'V';
    if (luminosity > 1e6) luminosityClass = 'Ia+';
    else if (luminosity > 1e5) luminosityClass = 'Ia';
    else if (luminosity > 1e4) luminosityClass = 'Ib';
    else if (luminosity > 1e3) luminosityClass = 'II';
    else if (luminosity > 100) luminosityClass = 'III';
    else if (luminosity > 10) luminosityClass = 'IV';
    return { spectralClass, luminosityClass };
  }

  spectralTypeDetails(spectralClass: string): { temperatureRange: [number, number]; color: string; massRange: [number, number]; lifetime: number; examples: string[] } {
    const details: Record<string, { temperatureRange: [number, number]; color: string; massRange: [number, number]; lifetime: number; examples: string[] }> = {
      'O': { temperatureRange: [30000, 50000], color: 'blue', massRange: [16, 150], lifetime: 1e7, examples: ['Rigel', 'Naos', 'Alnitak'] },
      'B': { temperatureRange: [10000, 30000], color: 'blue-white', massRange: [2.1, 16], lifetime: 1e8, examples: ['Sirius B', 'Rigel', 'Bellatrix'] },
      'A': { temperatureRange: [7500, 10000], color: 'white', massRange: [1.4, 2.1], lifetime: 1e9, examples: ['Sirius A', 'Vega', 'Altair'] },
      'F': { temperatureRange: [6000, 7500], color: 'yellow-white', massRange: [1.04, 1.4], lifetime: 3e9, examples: ['Procyon', 'Polaris', 'Sigma Octantis'] },
      'G': { temperatureRange: [5200, 6000], color: 'yellow', massRange: [0.8, 1.04], lifetime: 1e10, examples: ['Sun', 'Alpha Centauri A', 'Tau Ceti'] },
      'K': { temperatureRange: [3700, 5200], color: 'orange', massRange: [0.45, 0.8], lifetime: 3e10, examples: ['Arcturus', 'Aldebaran', 'Alpha Centauri B'] },
      'M': { temperatureRange: [2400, 3700], color: 'red', massRange: [0.08, 0.45], lifetime: 1e12, examples: ['Proxima Centauri', 'Betelgeuse', 'Antares'] },
    };
    return details[spectralClass] ?? details['G'];
  }

  hertzsprungRussell(stars: Star[]): HRDiagram {
    return {
      stars: stars.map(s => ({
        temp: s.temp,
        luminosity: s.luminosity,
        name: s.name,
        stage: s.stage,
        mass: s.mass,
      })),
      spectralClasses: ['O', 'B', 'A', 'F', 'G', 'K', 'M'],
      luminosityClasses: ['Ia+', 'Ia', 'Ib', 'II', 'III', 'IV', 'V', 'sd', 'D'],
      evolutionTracks: [
        { mass: 1, points: this._evolutionTrack(1) },
        { mass: 5, points: this._evolutionTrack(5) },
        { mass: 20, points: this._evolutionTrack(20) },
      ],
    };
  }

  private _evolutionTrack(mass: number): { temp: number; luminosity: number }[] {
    const points: { temp: number; luminosity: number }[] = [];
    const msTemp = 5778 * Math.pow(mass, 0.54);
    const msLum = Math.pow(mass, 3.5);
    points.push({ temp: msTemp, luminosity: msLum });
    points.push({ temp: msTemp * 0.5, luminosity: msLum * 100 });
    points.push({ temp: msTemp * 2, luminosity: msLum * 50 });
    points.push({ temp: msTemp * 0.3, luminosity: msLum * 500 });
    return points;
  }

  nucleosynthesis(stage: StellarStageName): string[] {
    const processes: Record<StellarStageName, string[]> = {
      protostar: ['deuterium burning', 'lithium burning'],
      pre_main_sequence: ['deuterium burning', 'convective contraction'],
      main_sequence: ['proton-proton chain', 'CNO cycle'],
      red_giant_branch: ['hydrogen shell burning'],
      helium_flash: ['helium ignition degenerate'],
      horizontal_branch: ['helium core burning', 'hydrogen shell burning'],
      asymptotic_giant: ['helium shell burning', 'hydrogen shell burning', 's-process'],
      planetary_nebula: ['no fusion', 'envelope ejection'],
      white_dwarf: ['no fusion', 'radiative cooling'],
      carbon_burning: ['carbon fusion', 'neon production'],
      neon_burning: ['neon photodisintegration', 'oxygen production'],
      oxygen_burning: ['oxygen fusion', 'silicon production'],
      silicon_burning: ['silicon fusion', 'iron peak elements'],
      neutron_star: ['no fusion', 'neutron degenerate'],
      black_hole: ['no fusion', 'gravitational singularity'],
      supernova: ['r-process', 'silicon burning', 'explosive nucleosynthesis', 'photodisintegration'],
    };
    return processes[stage] ?? [];
  }

  fusionReaction(stage: StellarStageName): string {
    const reactions: Record<StellarStageName, string> = {
      protostar: '²H + ¹H → ³He + γ',
      pre_main_sequence: 'gravitational contraction → heating',
      main_sequence: '4¹H → ⁴He + 2e⁺ + 2νₑ + 26.7 MeV',
      red_giant_branch: 'H shell: 4¹H → ⁴He',
      helium_flash: '3 ⁴He → ¹²C + 7.27 MeV (degenerate)',
      horizontal_branch: '3 ⁴He → ¹²C; ¹²C + ⁴He → ¹⁶O',
      asymptotic_giant: 'He shell flashes; s-process: neutron capture',
      planetary_nebula: 'none - envelope ejected',
      white_dwarf: 'none - electron degeneracy pressure',
      carbon_burning: '¹²C + ¹²C → ²⁴Mg + γ',
      neon_burning: '²⁰Ne + γ → ¹⁶O + ⁴He',
      oxygen_burning: '¹⁶O + ¹⁶O → ³²S + γ',
      silicon_burning: '²⁸Si + ⁷⁴He → ⁵⁶Ni',
      neutron_star: 'none - neutron degeneracy pressure',
      black_hole: 'none - beyond event horizon',
      supernova: '²⁸Si → ⁵⁶Ni → ⁵⁶Fe; r-process',
    };
    return reactions[stage] ?? 'none';
  }

  nucleosynthesisProducts(star: Star): NucleosynthesisProduct[] {
    const products: NucleosynthesisProduct[] = [];
    const elements = [
      { element: 'H', abundance: 0.7, process: 'Big Bang', birthSite: 'primordial' },
      { element: 'He', abundance: 0.28, process: 'Big Bang', birthSite: 'primordial' },
      { element: 'C', abundance: 0.003, process: 'triple-alpha', birthSite: 'RGB/AGB stars' },
      { element: 'N', abundance: 0.001, process: 'CNO cycle', birthSite: 'main sequence stars' },
      { element: 'O', abundance: 0.008, process: 'He burning', birthSite: 'massive stars' },
      { element: 'Ne', abundance: 0.002, process: 'C burning', birthSite: 'massive stars' },
      { element: 'Mg', abundance: 0.0006, process: 'C burning', birthSite: 'massive stars' },
      { element: 'Si', abundance: 0.0007, process: 'O burning', birthSite: 'massive stars' },
      { element: 'Fe', abundance: 0.001, process: 'Si burning', birthSite: 'supernovae' },
      { element: 'Au', abundance: 1e-9, process: 'r-process', birthSite: 'neutron star mergers' },
      { element: 'U', abundance: 1e-10, process: 'r-process', birthSite: 'supernovae/NS mergers' },
    ];
    for (const el of elements) {
      products.push({ ...el });
    }
    this._nucleosynthesis = products;
    return products;
  }

  stellarLifetime(mass: number): number {
    if (mass < 0.8) return 1e12 * Math.pow(mass, -1.5);
    if (mass < 2) return 1e10 * Math.pow(mass, -2.5);
    if (mass < 10) return 1e10 * Math.pow(mass, -3);
    return 1e7 * Math.pow(mass, -2);
  }

  mainSequenceLifetime(mass: number, metallicity: number = 0.02): number {
    const baseLifetime = this.stellarLifetime(mass);
    const metallicityFactor = 1 - 0.3 * Math.log10(metallicity / 0.02);
    return baseLifetime * metallicityFactor;
  }

  chandrasekharLimit(): number {
    return CHANDRASEKHAR_LIMIT;
  }

  oppenheimerVolkoffLimit(): number {
    return OPPENHEIMER_VOLKOFF_LIMIT;
  }

  eddingtonLuminosity(mass: number): number {
    return EDDINGTON_CONSTANT * mass;
  }

  schwarzschildRadius(mass: number): number {
    return 2 * G * mass * SOLAR_MASS / (C * C);
  }

  hawkingTemperature(mass: number): number {
    return HBAR * C * C * C / (8 * Math.PI * G * mass * SOLAR_MASS * BOLTZMANN);
  }

  hawkingLifetime(mass: number): number {
    return 5120 * Math.PI * G * G * Math.pow(mass * SOLAR_MASS, 3) / (HBAR * Math.pow(C, 4));
  }

  massRadiusRelation(mass: number, type: 'main_sequence' | 'white_dwarf' | 'neutron_star'): number {
    switch (type) {
      case 'main_sequence':
        return Math.pow(mass, 0.8);
      case 'white_dwarf':
        return Math.pow(mass / CHANDRASEKHAR_LIMIT, -1 / 3) * 0.01;
      case 'neutron_star':
        return 12 / (mass / 1.4) * 1e-5;
      default:
        return 1;
    }
  }

  initialFinalMassRelation(initialMass: number): { finalMass: number; remnantType: string } {
    if (initialMass < 8) {
      return { finalMass: 0.5 + 0.1 * (initialMass - 1), remnantType: 'white_dwarf' };
    }
    if (initialMass < 20) {
      return { finalMass: 1.4 + 0.05 * (initialMass - 8), remnantType: 'neutron_star' };
    }
    return { finalMass: 3 + 0.3 * (initialMass - 20), remnantType: 'black_hole' };
  }

  starDeath(mass: number, metallicity: number = 0.02): { type: string; remnantMass: number; explosion: boolean; supernovaType: string } {
    if (mass < 0.08) {
      return { type: 'brown_dwarf', remnantMass: mass, explosion: false, supernovaType: 'none' };
    }
    if (mass < 8) {
      return { type: 'planetary_nebula', remnantMass: 0.5 + 0.1 * mass, explosion: false, supernovaType: 'none' };
    }
    if (mass < 20) {
      return { type: 'core_collapse', remnantMass: 1.4 + (mass - 8) * 0.05, explosion: true, supernovaType: 'II' };
    }
    if (mass < 40) {
      return { type: 'core_collapse', remnantMass: Math.min(2.5, 1.4 + (mass - 8) * 0.05), explosion: true, supernovaType: 'Ib/Ic' };
    }
    return { type: 'direct_collapse', remnantMass: mass * 0.3, explosion: false, supernovaType: 'failed' };
  }

  supernovaType(progenitorMass: number, progenitorType: string): Supernova {
    let type = 'II';
    let progenitor = 'red supergiant';
    if (progenitorType === 'white_dwarf') {
      type = 'Ia';
      progenitor = 'carbon-oxygen white dwarf';
    } else if (progenitorMass > 20 && progenitorType === 'Wolf-Rayet') {
      type = 'Ic';
      progenitor = 'Wolf-Rayet star';
    } else if (progenitorMass > 15) {
      type = 'Ib';
      progenitor = 'helium star';
    }
    return {
      type,
      progenitor,
      peakLuminosity: type === 'Ia' ? 5e9 : 1e10,
      energy: 1e46,
      ejectaMass: type === 'Ia' ? 1.4 : progenitorMass * 0.8,
      remnant: progenitorMass > 20 ? 'black_hole' : 'neutron_star',
    };
  }

  stellarWind(mass: number, luminosity: number, metallicity: number): { massLossRate: number; windVelocity: number; windMomentum: number } {
    const baseRate = 1e-14 * luminosity * metallicity / mass;
    const massLossRate = Math.pow(mass, 2.5) * baseRate;
    const windVelocity = 0.01 * C * Math.sqrt(luminosity / (mass * 1000));
    const windMomentum = massLossRate * windVelocity;
    return { massLossRate, windVelocity, windMomentum };
  }

  convectiveZone(mass: number): { outerConvective: number; innerConvective: number; coreConvective: boolean } {
    if (mass < 0.3) {
      return { outerConvective: 1, innerConvective: 0, coreConvective: false };
    }
    if (mass < 1.5) {
      return { outerConvective: 0.3, innerConvective: 0, coreConvective: false };
    }
    return { outerConvective: 0, innerConvective: 0.2, coreConvective: true };
  }

  energyTransport(mass: number): { radiationZone: number; convectionZone: number; method: string } {
    if (mass < 0.5) {
      return { radiationZone: 0, convectionZone: 1, method: 'fully convective' };
    }
    if (mass < 1.2) {
      return { radiationZone: 0.7, convectionZone: 0.3, method: 'radiative core + convective envelope' };
    }
    return { radiationZone: 0.3, convectionZone: 0.7, method: 'convective core + radiative envelope' };
  }

  ppChainEnergy(temp: number, density: number): number {
    const T9 = temp / 1e9;
    const epsilon = 2.4e3 * density * Math.pow(T9, -2 / 3) * Math.exp(-3.38 * Math.pow(T9, -1 / 3));
    return epsilon;
  }

  cnoCycleEnergy(temp: number, density: number, metallicity: number): number {
    const T9 = temp / 1e9;
    const epsilon = 8.7e27 * density * metallicity * Math.pow(T9, -2 / 3) * Math.exp(-15.2 * Math.pow(T9, -1 / 3));
    return epsilon;
  }

  tripleAlphaEnergy(temp: number, density: number, heliumFraction: number): number {
    const T8 = temp / 1e8;
    const epsilon = 5e8 * density * density * heliumFraction * heliumFraction * Math.pow(T8, -3) * Math.exp(-44 / T8);
    return epsilon;
  }

  stefanBoltzmann(radius: number, temp: number): number {
    return 4 * Math.PI * radius * radius * STEFAN_BOLTZMANN * Math.pow(temp, 4);
  }

  wienDisplacementLaw(temp: number): number {
    return 2.897771955e-3 / temp;
  }

  bolometricCorrection(spectralClass: string): number {
    const corrections: Record<string, number> = {
      'O': -3, 'B': -1.5, 'A': -0.3, 'F': 0, 'G': 0.5, 'K': 1, 'M': 2,
    };
    return corrections[spectralClass] ?? 0;
  }

  absoluteMagnitude(luminosity: number): number {
    return 4.83 - 2.5 * Math.log10(luminosity);
  }

  apparentMagnitude(absoluteMag: number, distanceParsecs: number): number {
    return absoluteMag + 5 * Math.log10(distanceParsecs / 10);
  }

  distanceModulus(apparentMag: number, absoluteMag: number): number {
    return Math.pow(10, (apparentMag - absoluteMag) / 5 + 1) * 10;
  }

  massLuminosityRelation(mass: number): number {
    if (mass < 0.23) return 0.23 * Math.pow(mass, 2.3);
    if (mass < 0.85) return Math.pow(mass, 4);
    if (mass < 2) return Math.pow(mass, 4);
    if (mass < 55) return 1.4 * Math.pow(mass, 3.5);
    return 32000 * mass;
  }

  colorIndex(temp: number): { bv: number; ub: number; vi: number } {
    const bv = -2.5 * Math.log10(Math.pow(5500 / temp, 4) / 1) + 0.5;
    const ub = bv * 0.7;
    const vi = bv * 1.2;
    return { bv, ub, vi };
  }

  /** Salpeter Initial Mass Function: dN/dM ∝ M^(-2.35) for M in [0.5, 100]. */
  salpeterIMF(mass: number): number {
    if (mass <= 0) return 0;
    return Math.pow(mass, -2.35);
  }

  /** Kroupa Initial Mass Function: piecewise power law. */
  kroupaIMF(mass: number): number {
    if (mass <= 0) return 0;
    if (mass < 0.08) return Math.pow(mass, -0.3) * 0.035;
    if (mass < 0.5) return Math.pow(mass, -1.3) * 0.08;
    if (mass < 1.0) return Math.pow(mass, -2.3) * 0.5;
    return Math.pow(mass, -2.3);
  }

  /** Miller-Scalo IMF: log-normal in log mass. */
  millerScaloIMF(mass: number): number {
    if (mass <= 0) return 0;
    const logM = Math.log10(mass);
    const xi = 0.995 * Math.exp(-0.5 * Math.pow((logM - Math.log10(0.1)) / 0.67, 2));
    return xi * mass;
  }

  /** Chabrier IMF (2003) for individual stars: log-normal below 1 Msun, power law above. */
  chabrierIMF(mass: number): number {
    if (mass <= 0) return 0;
    if (mass < 1.0) {
      const sigma = 0.55;
      const mC = 0.22;
      return (1 / (mass * Math.sqrt(2 * Math.PI * sigma * sigma))) *
        Math.exp(-Math.pow(Math.log10(mass) - Math.log10(mC), 2) / (2 * sigma * sigma));
    }
    return 0.158 * Math.pow(mass, -2.3);
  }

  /** Star formation rate (Schmidt-Kennicutt law): Σ_SFR ∝ Σ_gas^1.4. */
  schmidtKennicutt(gasSurfaceDensity: number): number {
    if (gasSurfaceDensity <= 0) return 0;
    return 2.5e-4 * Math.pow(gasSurfaceDensity, 1.4);
  }

  /** Stellar population classification (I, II, III). */
  stellarPopulation(metallicity: number): { population: string; description: string; example: string } {
    if (metallicity < 1e-7) return { population: 'III', description: 'First-generation stars, metal-free', example: 'hypothetical; not directly observed' };
    if (metallicity < 0.01) return { population: 'II', description: 'Old, metal-poor stars', example: 'Globular clusters, halo stars' };
    return { population: 'I', description: 'Young, metal-rich stars', example: 'Sun, disk stars, open clusters' };
  }

  /** Metallicity [Fe/H] from Z and Z_sun. */
  metallicityFeH(z: number, zSun: number = 0.014): number {
    if (z <= 0 || zSun <= 0) return 0;
    return Math.log10(z / zSun);
  }

  /** Convert [Fe/H] to metallicity fraction Z. */
  fehToMetallicity(feh: number, zSun: number = 0.014): number {
    return zSun * Math.pow(10, feh);
  }

  /** Dynamical timescale: t_dyn = sqrt(R^3 / (G M)). */
  dynamicalTimescale(radiusSolar: number, massSolar: number): number {
    const G_CGS = 6.674e-8;
    const R_SOLAR = 6.957e10;
    const M_SOLAR = 1.989e33;
    const r = radiusSolar * R_SOLAR;
    const m = massSolar * M_SOLAR;
    return Math.sqrt(Math.pow(r, 3) / (G_CGS * m));
  }

  /** Nuclear timescale: t_nuc = ε * M * c^2 / L. */
  nuclearTimescale(massSolar: number, luminositySolar: number, efficiency: number = 0.007): number {
    const C2 = 9e20; // c^2 in cgs
    const M_SOLAR = 1.989e33;
    return efficiency * massSolar * M_SOLAR * C2 / Math.max(1e33, luminositySolar * 3.828e33);
  }

  /** Thermal (Kelvin-Helmholtz) timescale: t_KH = G M^2 / (R L). */
  kelvinHelmholtzTimescale(massSolar: number, radiusSolar: number, luminositySolar: number): number {
    const G_CGS = 6.674e-8;
    const M_SOLAR = 1.989e33;
    const R_SOLAR = 6.957e10;
    const L_SOLAR = 3.828e33;
    return G_CGS * Math.pow(massSolar * M_SOLAR, 2) /
      Math.max(1e33, radiusSolar * R_SOLAR * luminositySolar * L_SOLAR);
  }

  /** Eddington standard candle luminosity limit: L_Edd = 4πGMm_p c / σ_T. */
  eddingtonLuminosity(massSolar: number): number {
    return 1.26e38 * massSolar; // erg/s
  }

  /** Roche lobe radius approximation (Eggleton 1983). */
  rocheLobe(mass1: number, mass2: number): { q1: number; q2: number; r1: number; r2: number } {
    const q1 = mass1 / mass2;
    const q2 = mass2 / mass1;
    const r1 = 0.49 * Math.pow(q1, 2 / 3) /
      (0.6 * Math.pow(q1, 2 / 3) + Math.log(1 + Math.cbrt(Math.max(1e-12, q1))));
    const r2 = 0.49 * Math.pow(q2, 2 / 3) /
      (0.6 * Math.pow(q2, 2 / 3) + Math.log(1 + Math.cbrt(Math.max(1e-12, q2))));
    return { q1, q2, r1, r2 };
  }

  /** Habitable zone bounds (Kopparapu et al. 2013). */
  habitableZone(stellarLuminosity: number, stellarTemp: number): { inner: number; outer: number; optimisticInner: number; optimisticOuter: number } {
    const tStar = stellarTemp - 5780;
    const seffSun = 1.0;
    // Recent Venus / Runaway Greenhouse / Maximum Greenhouse / Early Mars
    const a = [1.7665e-4, 5.9674e-9, 1.107e-12, 2.866e-17];
    const b = [-2.139e-9, 1.107e-12, 1.332e-15, 4.0e-19];
    const seff = (a0: number, a1: number, a2: number, a3: number) =>
      a0 + a1 * tStar + a2 * tStar * tStar + a3 * tStar * tStar * tStar;
    const seffRV = seff(1.7763, 1.8665e-4, 2.866e-9, 2.866e-17);
    const seffRG = seff(1.066, 1.7665e-4, 5.9674e-9, 1.107e-12);
    const seffMG = seff(0.36, 5.8947e-5, 1.67e-11, 1.332e-15);
    const seffEM = seff(0.32, 5.244e-5, 1.0e-11, 1.332e-15);
    const dist = (s: number) => Math.sqrt(stellarLuminosity / Math.max(1e-9, s));
    void seffSun; void a; void b;
    return {
      inner: dist(seffRG),
      outer: dist(seffMG),
      optimisticInner: dist(seffRV),
      optimisticOuter: dist(seffEM),
    };
  }

  /** Mass loss rate via Reimers formula for red giants: dM/dt = -η * L*R/M. */
  reimersMassLoss(massSolar: number, luminositySolar: number, radiusSolar: number, eta: number = 0.4): number {
    return -eta * 4e-13 * luminositySolar * radiusSolar / Math.max(0.1, massSolar);
  }

  /** Wolf-Rayet mass loss rate (Nugis & Lamers 2000). */
  wolfRayetMassLoss(massSolar: number, luminositySolar: number): number {
    const logL = Math.log10(Math.max(1e-3, luminositySolar));
    const logM = Math.log10(Math.max(0.1, massSolar));
    return Math.pow(10, -7.85 + 1.07 * logL - 0.37 * logM);
  }

  addStar(star: Star): void {
    this._stars.set(star.id, star);
  }

  getStar(id: string): Star | null {
    return this._stars.get(id) ?? null;
  }

  listStars(stage?: StellarStageName): Star[] {
    const stars = Array.from(this._stars.values());
    return stage ? stars.filter(s => s.stage === stage) : stars;
  }

  toPacket(): DataPacket<{ stars: Map<string, Star>; stages: StellarStage[]; history: StellarRecord[]; remnants: StellarRemnant[]; supernovae: Supernova[]; nucleosynthesis: NucleosynthesisProduct[] }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['astronomy', 'StellarEvolution'],
      priority: 1,
      phase: 'stellar_evolution',
    };
    return {
      id: `stellar-evolution-${Date.now().toString(36)}`,
      payload: {
        stars: this._stars,
        stages: this._stages,
        history: this._history,
        remnants: this._remnants,
        supernovae: this._supernovae,
        nucleosynthesis: this._nucleosynthesis,
      },
      metadata,
    };
  }

  reset(): void {
    this._stars = new Map();
    this._stages = this._initStages();
    this._history = [];
    this._counter = 0;
    this._remnants = [];
    this._supernovae = [];
    this._nucleosynthesis = [];
  }

  get starCount(): number { return this._stars.size; }
  get stageCount(): number { return this._stages.length; }
  get historyCount(): number { return this._history.length; }
  get remnantCount(): number { return this._remnants.length; }
  get supernovaCount(): number { return this._supernovae.length; }

  private _createStar(id: string, name: string, mass: number, radius: number, temp: number, luminosity: number, stage: StellarStageName, age: number, metallicity: number): Star {
    const star: Star = {
      id: `star-${++this._counter}-${id}`,
      name,
      mass,
      radius,
      temp,
      luminosity,
      stage,
      age,
      metallicity,
      rotationPeriod: 25 * Math.pow(mass, -0.5),
      magneticField: 1 * Math.pow(mass, 2),
      composition: {
        hydrogen: 1 - metallicity - 0.25,
        helium: 0.25 + metallicity * 0.5,
        metals: metallicity,
      },
    };
    this._stars.set(star.id, star);
    return star;
  }

  private _evolve(star: Star, newStage: StellarStageName, changes: Partial<Pick<Star, 'radius' | 'temp' | 'luminosity' | 'mass'>>): Star {
    const updated: Star = {
      ...star,
      stage: newStage,
      radius: changes.radius ?? star.radius,
      temp: changes.temp ?? star.temp,
      luminosity: changes.luminosity ?? star.luminosity,
      mass: changes.mass ?? star.mass,
      age: star.age + 1e6,
    };
    this._stars.set(star.id, updated);
    this._history.push({ starId: star.id, fromStage: star.stage, toStage: newStage, timestamp: Date.now() });
    return updated;
  }

  private _initStages(): StellarStage[] {
    return [
      { name: 'protostar', duration: 1e5, process: 'gravitational collapse', temperature: 3000, luminosity: 10, massRange: [0.08, 150] },
      { name: 'pre_main_sequence', duration: 1e7, process: 'convective contraction', temperature: 4000, luminosity: 5, massRange: [0.08, 150] },
      { name: 'main_sequence', duration: 1e10, process: 'hydrogen fusion', temperature: 5778, luminosity: 1, massRange: [0.08, 150] },
      { name: 'red_giant_branch', duration: 1e8, process: 'hydrogen shell burning', temperature: 3500, luminosity: 1000, massRange: [0.8, 150] },
      { name: 'helium_flash', duration: 1, process: 'helium ignition', temperature: 1e8, luminosity: 1e6, massRange: [0.5, 8] },
      { name: 'horizontal_branch', duration: 1e8, process: 'core helium burning', temperature: 20000, luminosity: 50, massRange: [0.5, 8] },
      { name: 'asymptotic_giant', duration: 1e6, process: 'thermal pulses', temperature: 3000, luminosity: 4000, massRange: [0.8, 8] },
      { name: 'planetary_nebula', duration: 1e4, process: 'envelope ejection', temperature: 100000, luminosity: 100, massRange: [0.8, 8] },
      { name: 'white_dwarf', duration: 1e12, process: 'radiative cooling', temperature: 10000, luminosity: 0.001, massRange: [0.17, 1.44] },
      { name: 'carbon_burning', duration: 1e3, process: 'carbon fusion', temperature: 8e8, luminosity: 1e5, massRange: [8, 150] },
      { name: 'neon_burning', duration: 1, process: 'neon photodisintegration', temperature: 1.5e9, luminosity: 1e6, massRange: [10, 150] },
      { name: 'oxygen_burning', duration: 0.5, process: 'oxygen fusion', temperature: 2e9, luminosity: 1e7, massRange: [12, 150] },
      { name: 'silicon_burning', duration: 0.01, process: 'silicon fusion', temperature: 3.5e9, luminosity: 1e8, massRange: [15, 150] },
      { name: 'neutron_star', duration: 1e15, process: 'spin down', temperature: 1e6, luminosity: 0.0001, massRange: [1.44, 2.5] },
      { name: 'black_hole', duration: Infinity, process: 'Hawking radiation', temperature: 0, luminosity: 0, massRange: [2.5, Infinity] },
      { name: 'supernova', duration: 0.1, process: 'core collapse', temperature: 1e9, luminosity: 1e10, massRange: [8, 150] },
    ];
  }
}
