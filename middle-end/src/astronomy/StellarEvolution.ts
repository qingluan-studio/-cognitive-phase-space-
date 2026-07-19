import { DataPacket, PacketMeta } from '../shared/types';

/** Stellar stage identifier. */
export type StellarStageName =
  | 'protostar' | 'main_sequence' | 'red_giant' | 'horizontal_branch'
  | 'asymptotic_giant' | 'planetary_nebula' | 'white_dwarf'
  | 'neutron_star' | 'black_hole' | 'supernova';

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
}

/** A stellar evolution stage. */
export interface StellarStage {
  name: StellarStageName;
  duration: number;
  process: string;
  temperature: number;
  luminosity: number;
}

/** Hertzsprung-Russell diagram point. */
export interface HRDiagram {
  stars: { temp: number; luminosity: number; name: string; stage: StellarStageName }[];
  spectralClasses: string[];
  luminosityClasses: string[];
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

export class StellarEvolution {
  private _stars: Map<string, Star> = new Map();
  private _stages: StellarStage[] = [];
  private _history: StellarRecord[] = [];
  private _counter = 0;

  constructor() {
    this._stages = this._initStages();
  }

  protostar(cloud: { mass: number; density: number }, mass: number): Star {
    return this._createStar('protostar-1', 'Protostar', mass, mass * 5, 3000, mass * 10, 'protostar', 0, 0.02);
  }

  mainSequence(mass: number): Star {
    const luminosity = Math.pow(mass, 3.5);
    const temp = 5778 * Math.pow(mass, 0.54);
    const radius = Math.pow(mass, 0.8);
    return this._createStar(`ms-${mass}`, 'Main Sequence', mass, radius, temp, luminosity, 'main_sequence', 0, 0.02);
  }

  redGiant(star: Star): Star {
    return this._evolve(star, 'red_giant', {
      radius: star.radius * 100,
      temp: star.temp * 0.6,
      luminosity: star.luminosity * 1000,
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
    return this._evolve(star, 'white_dwarf', {
      radius: 0.01,
      temp: 10000,
      luminosity: 0.001,
      mass,
    });
  }

  neutronStar(star: Star, mass: number): Star {
    return this._evolve(star, 'neutron_star', {
      radius: 1e-5,
      temp: 1e6,
      luminosity: 0.0001,
      mass,
    });
  }

  blackHole(star: Star, mass: number): Star {
    return this._evolve(star, 'black_hole', {
      radius: 3e-6 * mass,
      temp: 0,
      luminosity: 0,
      mass,
    });
  }

  supernova(star: Star): Star {
    return this._evolve(star, 'supernova', {
      radius: star.radius * 1000,
      temp: 1e9,
      luminosity: 1e10,
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
    if (luminosity > 1e5) luminosityClass = 'Ia';
    else if (luminosity > 1e4) luminosityClass = 'Ib';
    else if (luminosity > 1e3) luminosityClass = 'II';
    else if (luminosity > 100) luminosityClass = 'III';
    else if (luminosity > 10) luminosityClass = 'IV';
    return { spectralClass, luminosityClass };
  }

  hertzsprungRussell(star: Star): HRDiagram {
    return {
      stars: [{
        temp: star.temp,
        luminosity: star.luminosity,
        name: star.name,
        stage: star.stage,
      }],
      spectralClasses: ['O', 'B', 'A', 'F', 'G', 'K', 'M'],
      luminosityClasses: ['Ia', 'Ib', 'II', 'III', 'IV', 'V'],
    };
  }

  nucleosynthesis(stage: StellarStageName): string[] {
    const processes: Record<StellarStageName, string[]> = {
      protostar: ['deuterium burning'],
      main_sequence: ['proton-proton chain', 'CNO cycle'],
      red_giant: ['helium fusion', 'triple-alpha'],
      horizontal_branch: ['helium burning', 'hydrogen shell burning'],
      asymptotic_giant: ['carbon burning', 'oxygen burning', 's-process'],
      planetary_nebula: ['no fusion'],
      white_dwarf: ['no fusion'],
      neutron_star: ['no fusion'],
      black_hole: ['no fusion'],
      supernova: ['r-process', 'silicon burning', 'explosive nucleosynthesis'],
    };
    return processes[stage] ?? [];
  }

  fusionReaction(stage: StellarStageName): string {
    const reactions: Record<StellarStageName, string> = {
      protostar: '²H + ²H → ³He + n',
      main_sequence: '4¹H → ⁴He + 2e⁺ + 2νₑ + 26.7 MeV',
      red_giant: '3 ⁴He → ¹²C + 7.27 MeV',
      horizontal_branch: '3 ⁴He → ¹²C; ¹²C + ⁴He → ¹⁶O',
      asymptotic_giant: '¹²C + ¹²C → ²⁴Mg',
      planetary_nebula: 'none',
      white_dwarf: 'none',
      neutron_star: 'none',
      black_hole: 'none',
      supernova: '²⁸Si → ⁵⁶Ni → ⁵⁶Fe',
    };
    return reactions[stage] ?? 'none';
  }

  stellarLifetime(mass: number): number {
    return 1e10 * Math.pow(mass, -2.5);
  }

  chandrasekharLimit(): number {
    return 1.44;
  }

  oppenheimerVolkoffLimit(): number {
    return 2.1;
  }

  eddingtonLuminosity(mass: number): number {
    return 1.26e31 * mass;
  }

  toPacket(): DataPacket<{ stars: Map<string, Star>; stages: StellarStage[]; history: StellarRecord[] }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['astronomy', 'StellarEvolution'],
      priority: 1,
      phase: 'stellar_evolution',
    };
    return {
      id: `stellar-evolution-${Date.now().toString(36)}`,
      payload: { stars: this._stars, stages: this._stages, history: this._history },
      metadata,
    };
  }

  reset(): void {
    this._stars = new Map();
    this._stages = this._initStages();
    this._history = [];
    this._counter = 0;
  }

  get starCount(): number { return this._stars.size; }
  get stageCount(): number { return this._stages.length; }
  get historyCount(): number { return this._history.length; }

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
    };
    this._stars.set(star.id, updated);
    this._history.push({ starId: star.id, fromStage: star.stage, toStage: newStage, timestamp: Date.now() });
    return updated;
  }

  private _initStages(): StellarStage[] {
    return [
      { name: 'protostar', duration: 1e5, process: 'gravitational collapse', temperature: 3000, luminosity: 1 },
      { name: 'main_sequence', duration: 1e10, process: 'hydrogen fusion', temperature: 5778, luminosity: 1 },
      { name: 'red_giant', duration: 1e8, process: 'helium fusion', temperature: 3500, luminosity: 1000 },
      { name: 'horizontal_branch', duration: 1e8, process: 'core helium burning', temperature: 20000, luminosity: 50 },
      { name: 'asymptotic_giant', duration: 1e6, process: 'thermal pulses', temperature: 3000, luminosity: 4000 },
      { name: 'planetary_nebula', duration: 1e4, process: 'envelope ejection', temperature: 100000, luminosity: 100 },
      { name: 'white_dwarf', duration: 1e12, process: 'radiative cooling', temperature: 10000, luminosity: 0.001 },
      { name: 'neutron_star', duration: 1e15, process: 'spin down', temperature: 1e6, luminosity: 0.0001 },
      { name: 'black_hole', duration: Infinity, process: 'Hawking radiation', temperature: 0, luminosity: 0 },
      { name: 'supernova', duration: 0.1, process: 'core collapse', temperature: 1e9, luminosity: 1e10 },
    ];
  }
}
