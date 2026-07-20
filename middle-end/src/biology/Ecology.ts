import { DataPacket, PacketMeta } from '../shared/types';

/** Ecosystem descriptor. */
export interface Ecosystem {
  producers: string[];
  consumers: string[];
  decomposers: string[];
}

/** Food chain descriptor. */
export interface FoodChain {
  levels: Array<{ organism: string; trophic: number }>;
}

/** Population descriptor. */
export interface Population {
  size: number;
  growth: number;
  carrying: number;
}

/** Species with ecological attributes. */
export interface Species {
  id: string;
  name: string;
  kingdom: 'Plantae' | 'Animalia' | 'Fungi' | 'Protista' | 'Bacteria' | 'Archaea';
  trophicLevel: number;
  iucnStatus: IucnStatus;
  bodyMassKg: number;
  lifespanYears: number;
  rStrategist: boolean; // true = r-selected, false = K-selected
}

/** IUCN conservation status. */
export type IucnStatus = 'EX' | 'EW' | 'CR' | 'EN' | 'VU' | 'NT' | 'LC' | 'DD' | 'NE';

/** Biome descriptor. */
export interface Biome {
  name: string;
  climate: 'tropical' | 'temperate' | 'arid' | 'polar' | 'aquatic';
  vegetation: string;
  meanTempC: number;
  annualPrecipMm: number;
  netPrimaryProductivity: number; // g C / m² / yr
  examples: string[];
}

/** Trophic level descriptor. */
export interface TrophicLevel {
  level: number;
  name: string;
  description: string;
  energykJ: number;
  biomassKg: number;
}

/** Predator-prey interaction pair. */
export interface PredatorPreyPair {
  predator: string;
  prey: string;
  captureRate: number;
  handlingTime: number;
}

/** Niche dimensions (Hutchinson's n-dimensional hypervolume). */
export interface NicheDimensions {
  fundamental: string[];
  realized: string[];
  temperatureRange: [number, number];
  pHRange: [number, number];
  moistureRange: [number, number];
}

/** Biogeochemical cycle summary. */
export interface BiogeochemicalCycle {
  element: string;
  reservoirs: string[];
  processes: string[];
  fluxRates: Array<{ from: string; to: string; rate: number }>;
  residenceTimeYears: number;
}

/** Metapopulation descriptor (Levins model). */
export interface Metapopulation {
  patches: number;
  occupied: number;
  colonizationRate: number;
  extinctionRate: number;
}

/** Island biogeography parameters. */
export interface IslandParams {
  areaKm2: number;
  distanceKm: number; // distance to mainland
  speciesCount: number;
}

/** History record. */
interface EcologyRecord {
  method: string;
  target: string;
  timestamp: number;
}

const BIOMES: Biome[] = [
  { name: 'Tropical Rainforest', climate: 'tropical', vegetation: 'broadleaf evergreen', meanTempC: 26, annualPrecipMm: 2500, netPrimaryProductivity: 2200, examples: ['Amazon', 'Congo', 'Southeast Asia'] },
  { name: 'Tropical Seasonal Forest', climate: 'tropical', vegetation: 'deciduous', meanTempC: 25, annualPrecipMm: 1500, netPrimaryProductivity: 1600, examples: ['India', 'Brazil Cerrado'] },
  { name: 'Temperate Deciduous Forest', climate: 'temperate', vegetation: 'deciduous broadleaf', meanTempC: 10, annualPrecipMm: 1000, netPrimaryProductivity: 1200, examples: ['Eastern US', 'Europe', 'China'] },
  { name: 'Temperate Coniferous Forest', climate: 'temperate', vegetation: 'coniferous', meanTempC: 8, annualPrecipMm: 800, netPrimaryProductivity: 800, examples: ['Pacific NW', 'Scandinavia'] },
  { name: 'Boreal Forest (Taiga)', climate: 'polar', vegetation: 'evergreen conifers', meanTempC: -5, annualPrecipMm: 400, netPrimaryProductivity: 800, examples: ['Siberia', 'Canada'] },
  { name: 'Tropical Grassland (Savanna)', climate: 'tropical', vegetation: 'grasses with scattered trees', meanTempC: 24, annualPrecipMm: 800, netPrimaryProductivity: 900, examples: ['African Savanna', 'Llanos'] },
  { name: 'Temperate Grassland', climate: 'temperate', vegetation: 'grasses', meanTempC: 10, annualPrecipMm: 500, netPrimaryProductivity: 600, examples: ['Prairies', 'Steppes', 'Pampas'] },
  { name: 'Desert (Hot)', climate: 'arid', vegetation: 'sparse xerophytes', meanTempC: 25, annualPrecipMm: 100, netPrimaryProductivity: 90, examples: ['Sahara', 'Arabian'] },
  { name: 'Desert (Cold)', climate: 'polar', vegetation: 'sparse', meanTempC: 5, annualPrecipMm: 150, netPrimaryProductivity: 90, examples: ['Gobi', 'Patagonian'] },
  { name: 'Tundra', climate: 'polar', vegetation: 'mosses, lichens, dwarf shrubs', meanTempC: -12, annualPrecipMm: 250, netPrimaryProductivity: 140, examples: ['Arctic', 'Alpine'] },
  { name: 'Chaparral (Mediterranean)', climate: 'temperate', vegetation: 'sclerophyllous shrubs', meanTempC: 15, annualPrecipMm: 600, netPrimaryProductivity: 700, examples: ['California', 'Mediterranean basin'] },
  { name: 'Wetland', climate: 'aquatic', vegetation: 'hydrophytes', meanTempC: 15, annualPrecipMm: 1200, netPrimaryProductivity: 2000, examples: ['Everglades', 'Pantanal'] },
  { name: 'Estuary', climate: 'aquatic', vegetation: 'salt-tolerant plants', meanTempC: 15, annualPrecipMm: 1000, netPrimaryProductivity: 1500, examples: ['Chesapeake Bay', 'Thames'] },
  { name: 'Coral Reef', climate: 'aquatic', vegetation: 'coral-algal symbiosis', meanTempC: 25, annualPrecipMm: 0, netPrimaryProductivity: 2500, examples: ['Great Barrier Reef', 'Caribbean'] },
  { name: 'Open Ocean', climate: 'aquatic', vegetation: 'phytoplankton', meanTempC: 17, annualPrecipMm: 0, netPrimaryProductivity: 125, examples: ['Pacific', 'Atlantic'] },
  { name: 'Upwelling Zone', climate: 'aquatic', vegetation: 'phytoplankton bloom', meanTempC: 15, annualPrecipMm: 0, netPrimaryProductivity: 600, examples: ['Peru Current', 'Benguela'] },
];

const IUCN_DESCRIPTIONS: Record<IucnStatus, { name: string; description: string; criteria: string }> = {
  EX: { name: 'Extinct', description: 'no individuals remaining', criteria: 'no reasonable doubt' },
  EW: { name: 'Extinct in the Wild', description: 'survives only in captivity', criteria: 'exhaustive surveys' },
  CR: { name: 'Critically Endangered', description: 'extremely high risk of extinction', criteria: '>50% in 10 yrs/3 gens' },
  EN: { name: 'Endangered', description: 'very high risk of extinction', criteria: '>20% in 20 yrs/5 gens' },
  VU: { name: 'Vulnerable', description: 'high risk of extinction', criteria: '>10% in 100 yrs' },
  NT: { name: 'Near Threatened', description: 'close to qualifying for threatened', criteria: 'near VU threshold' },
  LC: { name: 'Least Concern', description: 'widespread and abundant', criteria: 'does not qualify' },
  DD: { name: 'Data Deficient', description: 'inadequate information', criteria: 'no assessment possible' },
  NE: { name: 'Not Evaluated', description: 'not yet assessed', criteria: 'no assessment made' },
};

const SPECIES_DB: Species[] = [
  { id: 'sp1', name: 'Homo sapiens', kingdom: 'Animalia', trophicLevel: 3, iucnStatus: 'LC', bodyMassKg: 70, lifespanYears: 80, rStrategist: false },
  { id: 'sp2', name: 'Panthera leo', kingdom: 'Animalia', trophicLevel: 4, iucnStatus: 'VU', bodyMassKg: 190, lifespanYears: 15, rStrategist: false },
  { id: 'sp3', name: 'Loxodonta africana', kingdom: 'Animalia', trophicLevel: 2, iucnStatus: 'EN', bodyMassKg: 5400, lifespanYears: 70, rStrategist: false },
  { id: 'sp4', name: 'Canis lupus', kingdom: 'Animalia', trophicLevel: 3, iucnStatus: 'LC', bodyMassKg: 40, lifespanYears: 12, rStrategist: false },
  { id: 'sp5', name: 'Apis mellifera', kingdom: 'Animalia', trophicLevel: 2, iucnStatus: 'VU', bodyMassKg: 0.0001, lifespanYears: 0.16, rStrategist: true },
  { id: 'sp6', name: 'Quercus robur', kingdom: 'Plantae', trophicLevel: 1, iucnStatus: 'LC', bodyMassKg: 5000, lifespanYears: 1000, rStrategist: false },
  { id: 'sp7', name: 'Pinus sylvestris', kingdom: 'Plantae', trophicLevel: 1, iucnStatus: 'LC', bodyMassKg: 3000, lifespanYears: 500, rStrategist: false },
  { id: 'sp8', name: 'Escherichia coli', kingdom: 'Bacteria', trophicLevel: 2, iucnStatus: 'LC', bodyMassKg: 1e-15, lifespanYears: 0.000038, rStrategist: true },
  { id: 'sp9', name: 'Amanita muscaria', kingdom: 'Fungi', trophicLevel: 3, iucnStatus: 'LC', bodyMassKg: 0.05, lifespanYears: 0.16, rStrategist: true },
  { id: 'sp10', name: 'Gorilla gorilla', kingdom: 'Animalia', trophicLevel: 2, iucnStatus: 'CR', bodyMassKg: 160, lifespanYears: 40, rStrategist: false },
  { id: 'sp11', name: 'Balaenoptera musculus', kingdom: 'Animalia', trophicLevel: 2, iucnStatus: 'EN', bodyMassKg: 150000, lifespanYears: 90, rStrategist: false },
  { id: 'sp12', name: 'Drosophila melanogaster', kingdom: 'Animalia', trophicLevel: 2, iucnStatus: 'LC', bodyMassKg: 0.000001, lifespanYears: 0.082, rStrategist: true },
];

/** Ecology: energy flow, population dynamics, cycles. */
export class Ecology {
  private _ecosystems: Ecosystem[] = [];
  private _foodChains: FoodChain[] = [];
  private _populations: Population[] = [];
  private _species: Map<string, Species> = new Map(SPECIES_DB.map(s => [s.id, s]));
  private _history: EcologyRecord[] = [];
  private _counter = 0;

  /** Build a food chain. */
  foodChain(organisms: string[]): FoodChain {
    const levels = organisms.map((o, i) => ({ organism: o, trophic: i + 1 }));
    const result: FoodChain = { levels };
    this._foodChains.push(result);
    this._history.push({ method: 'foodChain', target: `${organisms.length} levels`, timestamp: Date.now() });
    return result;
  }

  /** Build a food web from a list of organisms. */
  foodWeb(organisms: string[]): { organisms: string[]; links: Array<{ from: string; to: string }> } {
    const links: Array<{ from: string; to: string }> = [];
    for (let i = 0; i < organisms.length - 1; i++) {
      links.push({ from: organisms[i]!, to: organisms[i + 1]! });
    }
    this._history.push({ method: 'foodWeb', target: `${links.length} links`, timestamp: Date.now() });
    return { organisms, links };
  }

  /** Trophic network from predator-prey interactions. */
  trophicNetwork(pairs: PredatorPreyPair[]): { nodes: string[]; edges: number; meanTrophicLevel: number } {
    const nodes = new Set<string>();
    for (const p of pairs) { nodes.add(p.predator); nodes.add(p.prey); }
    const edges = pairs.length;
    const meanTrophicLevel = 2 + edges / Math.max(1, nodes.size);
    this._history.push({ method: 'trophicNetwork', target: `${edges} edges`, timestamp: Date.now() });
    return { nodes: [...nodes], edges, meanTrophicLevel };
  }

  /** Functional response type I (linear): consumed = a*N. */
  functionalResponseI(preyDensity: number, attackRate: number): number {
    return attackRate * preyDensity;
  }

  /** Functional response type II (saturating, Holling disc equation): consumed = a*N/(1+a*h*N). */
  functionalResponseII(preyDensity: number, attackRate: number, handlingTime: number): number {
    const denom = 1 + attackRate * handlingTime * preyDensity;
    if (denom === 0) return 0;
    return (attackRate * preyDensity) / denom;
  }

  /** Functional response type III (sigmoidal): consumed = a*N^2 / (1 + a*h*N^2). */
  functionalResponseIII(preyDensity: number, attackRate: number, handlingTime: number): number {
    const denom = 1 + attackRate * handlingTime * preyDensity * preyDensity;
    if (denom === 0) return 0;
    return (attackRate * preyDensity * preyDensity) / denom;
  }

  /** Energy flow at a trophic level given efficiency. */
  energyFlow(level: number, efficiency: number): { level: number; energy: number } {
    const baseEnergy = 10000;
    const energy = baseEnergy * Math.pow(efficiency / 100, level - 1);
    this._history.push({ method: 'energyFlow', target: `L${level}`, timestamp: Date.now() });
    return { level, energy };
  }

  /** Enumerate trophic levels in an ecosystem. */
  trophicLevels(ecosystem: Ecosystem): { producers: number; consumers: number; decomposers: number } {
    this._history.push({ method: 'trophicLevels', target: 'count', timestamp: Date.now() });
    return {
      producers: ecosystem.producers.length,
      consumers: ecosystem.consumers.length,
      decomposers: ecosystem.decomposers.length,
    };
  }

  /** Build a biomass pyramid from trophic level sizes. */
  biomassPyramid(levels: number[]): { levels: number[]; total: number } {
    const total = levels.reduce((s, l) => s + l, 0);
    this._history.push({ method: 'biomassPyramid', target: `${levels.length} levels`, timestamp: Date.now() });
    return { levels, total };
  }

  /** Pyramid of numbers (Eltonian). */
  numbersPyramid(counts: number[]): { levels: number[]; ratio: number; inverted: boolean } {
    const total = counts.reduce((s, c) => s + c, 0);
    let inverted = false;
    for (let i = 1; i < counts.length; i++) {
      if (counts[i]! > counts[i - 1]!) { inverted = true; break; }
    }
    return { levels: counts, ratio: counts[0]! / Math.max(1, counts[counts.length - 1]!), inverted };
  }

  /** Carrying capacity given resources. */
  carryingCapacity(population: Population, resources: number): number {
    const cap = Math.floor(resources / 10);
    this._history.push({ method: 'carryingCapacity', target: `cap=${cap}`, timestamp: Date.now() });
    return Math.max(population.size, cap);
  }

  /** Logistic growth N(t) = K / (1 + ((K - N0) / N0) * e^(-rt)). */
  logisticGrowth(N0: number, K: number, r: number, t: number): number {
    if (N0 === 0) return 0;
    const N = K / (1 + ((K - N0) / N0) * Math.exp(-r * t));
    this._history.push({ method: 'logisticGrowth', target: `t=${t}`, timestamp: Date.now() });
    return Math.round(N);
  }

  /** Logistic growth derivative (instantaneous rate). */
  logisticGrowthRate(N: number, K: number, r: number): number {
    return r * N * (1 - N / Math.max(1, K));
  }

  /** Exponential growth N(t) = N0 * e^(rt). */
  exponentialGrowth(N0: number, r: number, t: number): number {
    const N = N0 * Math.exp(r * t);
    this._history.push({ method: 'exponentialGrowth', target: `t=${t}`, timestamp: Date.now() });
    return Math.round(N);
  }

  /** Gompertz growth: N(t) = K * exp(-b * exp(-c*t)). */
  gompertzGrowth(N0: number, K: number, c: number, t: number): number {
    if (N0 <= 0 || K <= 0) return 0;
    const b = -Math.log(N0 / K);
    return K * Math.exp(b * Math.exp(-c * t));
  }

  /** von Bertalanffy growth (size-based, common for fish). */
  vonBertalanffy(t: number, linf: number, k: number, t0: number): number {
    return linf * (1 - Math.exp(-k * (t - t0)));
  }

  /** Beverton-Holt model: N(t+1) = R0 * N(t) / (1 + N(t)/K). */
  bevertonHolt(N: number, R0: number, K: number): number {
    if (1 + N / Math.max(1e-9, K) === 0) return 0;
    return (R0 * N) / (1 + N / Math.max(1e-9, K));
  }

  /** Ricker model: N(t+1) = N(t) * exp(r*(1 - N(t)/K)). */
  rickerModel(N: number, r: number, K: number): number {
    if (K <= 0) return 0;
    return N * Math.exp(r * (1 - N / K));
  }

  /** Hassell model with density dependence + aggregation. */
  hassellModel(N: number, R: number, a: number, b: number): number {
    const denom = 1 + a * Math.pow(N, b);
    if (denom === 0) return 0;
    return (R * N) / denom;
  }

  /** Allee effect (strong): dN/dt = rN(1 - N/K)(N/A - 1). */
  alleeEffect(N: number, r: number, K: number, alleeThreshold: number): number {
    if (K <= 0 || N < alleeThreshold) return -N;
    return r * N * (1 - N / K) * (N / Math.max(1e-9, alleeThreshold) - 1);
  }

  /** Lotka-Volterra predator-prey model: time series. */
  lotkaVolterra(prey0: number, predator0: number, alpha: number, beta: number, delta: number, gamma: number, steps: number, dt: number = 0.1): Array<{ t: number; prey: number; predator: number }> {
    const series: Array<{ t: number; prey: number; predator: number }> = [];
    let prey = prey0, predator = predator0;
    for (let i = 0; i < steps; i++) {
      const dPrey = (alpha * prey - beta * prey * predator) * dt;
      const dPredator = (delta * prey * predator - gamma * predator) * dt;
      prey = Math.max(0, prey + dPrey);
      predator = Math.max(0, predator + dPredator);
      series.push({ t: i * dt, prey: Math.round(prey), predator: Math.round(predator) });
    }
    this._history.push({ method: 'lotkaVolterra', target: `${steps} steps`, timestamp: Date.now() });
    return series;
  }

  /** Lotka-Volterra competition (two-species). */
  lotkaVolterraCompetition(n1: number, n2: number, r1: number, r2: number, k1: number, k2: number, alpha12: number, alpha21: number, steps: number, dt: number = 0.1): Array<{ t: number; n1: number; n2: number }> {
    const series: Array<{ t: number; n1: number; n2: number }> = [];
    let p1 = n1, p2 = n2;
    for (let i = 0; i < steps; i++) {
      const d1 = r1 * p1 * (1 - (p1 + alpha12 * p2) / Math.max(1, k1)) * dt;
      const d2 = r2 * p2 * (1 - (p2 + alpha21 * p1) / Math.max(1, k2)) * dt;
      p1 = Math.max(0, p1 + d1);
      p2 = Math.max(0, p2 + d2);
      series.push({ t: i * dt, n1: Math.round(p1), n2: Math.round(p2) });
    }
    this._history.push({ method: 'lotkaVolterraCompetition', target: `${steps} steps`, timestamp: Date.now() });
    return series;
  }

  /** Lotka-Volterra mutualism (two-species). */
  lotkaVolterraMutualism(n1: number, n2: number, r1: number, r2: number, k1: number, k2: number, beta12: number, beta21: number, steps: number, dt: number = 0.1): Array<{ t: number; n1: number; n2: number }> {
    const series: Array<{ t: number; n1: number; n2: number }> = [];
    let p1 = n1, p2 = n2;
    for (let i = 0; i < steps; i++) {
      const d1 = r1 * p1 * (1 - (p1 - beta12 * p2) / Math.max(1, k1)) * dt;
      const d2 = r2 * p2 * (1 - (p2 - beta21 * p1) / Math.max(1, k2)) * dt;
      p1 = Math.max(0, p1 + d1);
      p2 = Math.max(0, p2 + d2);
      series.push({ t: i * dt, n1: Math.round(p1), n2: Math.round(p2) });
    }
    this._history.push({ method: 'lotkaVolterraMutualism', target: `${steps} steps`, timestamp: Date.now() });
    return series;
  }

  /** Nicholson-Bailey host-parasitoid model. */
  nicholsonBailey(host0: number, parasitoid0: number, a: number, lambda: number, steps: number): Array<{ t: number; host: number; parasitoid: number }> {
    const series: Array<{ t: number; host: number; parasitoid: number }> = [];
    let H = host0, P = parasitoid0;
    for (let i = 0; i < steps; i++) {
      const escaped = Math.exp(-a * P);
      const newHost = lambda * H * escaped;
      const newParasitoid = (1 - escaped) * H;
      H = Math.max(0, newHost);
      P = Math.max(0, newParasitoid);
      series.push({ t: i, host: Math.round(H), parasitoid: Math.round(P) });
    }
    this._history.push({ method: 'nicholsonBailey', target: `${steps} steps`, timestamp: Date.now() });
    return series;
  }

  /** Population dynamics simulation. */
  populationDynamics(populations: Population[], interactions: Array<{ type: string; strength: number }>): Population[] {
    const result = populations.map(p => ({
      size: Math.max(0, Math.floor(p.size * (1 + p.growth * 0.1))),
      growth: p.growth,
      carrying: p.carrying,
    }));
    void interactions;
    this._populations.push(...result);
    this._history.push({ method: 'populationDynamics', target: `${populations.length} pops`, timestamp: Date.now() });
    return result;
  }

  /** Shannon diversity index H' = -Σ pi * ln(pi). */
  shannonIndex(counts: number[]): { H: number; Hmax: number; evenness: number } {
    const total = counts.reduce((s, c) => s + c, 0);
    if (total === 0) return { H: 0, Hmax: 0, evenness: 0 };
    let H = 0;
    for (const c of counts) {
      if (c > 0) {
        const p = c / total;
        H -= p * Math.log(p);
      }
    }
    const Hmax = Math.log(counts.length);
    const evenness = Hmax === 0 ? 0 : H / Hmax;
    this._history.push({ method: 'shannonIndex', target: `H=${H.toFixed(3)}`, timestamp: Date.now() });
    return { H, Hmax, evenness };
  }

  /** Shannon index with log base 2. */
  shannonBits(counts: number[]): number {
    const total = counts.reduce((s, c) => s + c, 0);
    if (total === 0) return 0;
    let H = 0;
    for (const c of counts) {
      if (c > 0) {
        const p = c / total;
        H -= p * Math.log2(p);
      }
    }
    return H;
  }

  /** Simpson's diversity index D = 1 - Σ(pi^2). */
  simpsonIndex(counts: number[]): { D: number; Dinv: number; evenness: number } {
    const total = counts.reduce((s, c) => s + c, 0);
    if (total === 0) return { D: 0, Dinv: 0, evenness: 0 };
    let sumSquares = 0;
    for (const c of counts) {
      const p = c / total;
      sumSquares += p * p;
    }
    const D = 1 - sumSquares;
    const Dinv = 1 / Math.max(1e-12, sumSquares);
    const evenness = D / (1 - 1 / Math.max(1, counts.length));
    return { D, Dinv, evenness };
  }

  /** Gini-Simpson index (probability of interspecific encounter). */
  giniSimpson(counts: number[]): number {
    const total = counts.reduce((s, c) => s + c, 0);
    if (total === 0) return 0;
    let sum = 0;
    for (const c of counts) {
      const p = c / total;
      sum += p * p;
    }
    return 1 - sum;
  }

  /** Margalef richness index: d = (S - 1) / ln(N). */
  margalefIndex(counts: number[]): number {
    const S = counts.length;
    const N = counts.reduce((s, c) => s + c, 0);
    if (N === 0) return 0;
    return (S - 1) / Math.log(N);
  }

  /** Menhinick richness index: d = S / sqrt(N). */
  menhinickIndex(counts: number[]): number {
    const S = counts.length;
    const N = counts.reduce((s, c) => s + c, 0);
    if (N === 0) return 0;
    return S / Math.sqrt(N);
  }

  /** Brillouin diversity: HB = ln(N!) - Σ ln(ni!). */
  brillouinIndex(counts: number[]): number {
    const N = counts.reduce((s, c) => s + c, 0);
    let hb = this._logFactorial(N);
    for (const c of counts) hb -= this._logFactorial(c);
    return hb;
  }

  /** Pielou's evenness J' = H'/Hmax. */
  pielouEvenness(counts: number[]): number {
    const { H, Hmax } = this.shannonIndex(counts);
    return Hmax === 0 ? 0 : H / Hmax;
  }

  /** Berger-Parker dominance: d = N_max / N. */
  bergerParkerIndex(counts: number[]): number {
    const total = counts.reduce((s, c) => s + c, 0);
    if (total === 0) return 0;
    const max = Math.max(...counts);
    return max / total;
  }

  /** Fisher's alpha diversity. */
  fisherAlpha(counts: number[]): number {
    const S = counts.length;
    const N = counts.reduce((s, c) => s + c, 0);
    if (N <= S) return 0;
    // Solve S = alpha * ln(1 + N/alpha), approximate
    let alpha = 1;
    for (let i = 0; i < 50; i++) {
      const denom = 1 + N / alpha;
      if (denom <= 0) break;
      alpha = S / Math.log(denom);
    }
    return alpha;
  }

  /** Chao1 richness estimator (abundance-based). */
  chao1(counts: number[], biasCorrected: boolean = true): number {
    const Sobs = counts.filter(c => c > 0).length;
    const f1 = counts.filter(c => c === 1).length;
    const f2 = counts.filter(c => c === 2).length;
    if (biasCorrected) {
      return Sobs + (f1 * (f1 - 1)) / (2 * Math.max(1, (f2 + 1)));
    }
    return Sobs + (f1 * f1) / (2 * Math.max(1, f2));
  }

  /** ACE (Abundance-based Coverage Estimator). */
  aceIndex(counts: number[], threshold: number = 10): number {
    const rare = counts.filter(c => c <= threshold);
    const abundant = counts.filter(c => c > threshold);
    const Srare = rare.length;
    const Sabundant = abundant.length;
    const Nrar = rare.reduce((s, c) => s + c, 0);
    if (Nrar === 0) return Sabundant;
    const f1 = rare.filter(c => c === 1).length;
    const coverage = 1 - f1 / Nrar;
    const denom = coverage + (coverage * f1) / Math.max(1e-9, Nrar - f1);
    if (denom === 0) return Sabundant;
    const S = Sabundant + Srare / coverage + f1 / denom;
    return S;
  }

  /** Beta diversity: Whittaker's β = (S / mean α) - 1. */
  whittakerBeta(gamma: number, alpha: number): number {
    if (alpha === 0) return 0;
    return (gamma / alpha) - 1;
  }

  /** Sørensen similarity index for two samples. */
  sorensenIndex(a: string[], b: string[]): number {
    if (a.length === 0 && b.length === 0) return 1;
    const setA = new Set(a), setB = new Set(b);
    let common = 0;
    for (const x of setA) if (setB.has(x)) common++;
    return (2 * common) / (setA.size + setB.size);
  }

  /** Jaccard similarity index. */
  jaccardIndex(a: string[], b: string[]): number {
    if (a.length === 0 && b.length === 0) return 1;
    const setA = new Set(a), setB = new Set(b);
    let common = 0;
    for (const x of setA) if (setB.has(x)) common++;
    return common / (setA.size + setB.size - common);
  }

  /** Bray-Curtis dissimilarity. */
  brayCurtis(a: number[], b: number[]): number {
    if (a.length !== b.length) return 1;
    let sumMin = 0, sumTotal = 0;
    for (let i = 0; i < a.length; i++) {
      sumMin += Math.min(a[i]!, b[i]!);
      sumTotal += a[i]! + b[i]!;
    }
    if (sumTotal === 0) return 0;
    return 1 - (2 * sumMin) / sumTotal;
  }

  /** Symbiotic relationship classification. */
  symbiosis(species1: string, species2: string, type: 'mutualism' | 'commensalism' | 'parasitism'): { relationship: string; outcome: string } {
    const outcomes: Record<string, string> = {
      mutualism: 'both benefit',
      commensalism: 'one benefits, other unaffected',
      parasitism: 'one benefits, other harmed',
    };
    this._history.push({ method: 'symbiosis', target: type, timestamp: Date.now() });
    return { relationship: `${species1}-${species2}`, outcome: outcomes[type] };
  }

  /** Niche of an organism (Hutchinsonian). */
  niche(organism: string, environment: string): NicheDimensions {
    this._history.push({ method: 'niche', target: organism, timestamp: Date.now() });
    return {
      fundamental: ['temperature', 'pH', 'moisture', 'salinity', 'light'],
      realized: ['temperature', 'moisture'],
      temperatureRange: [0, 40],
      pHRange: [5, 9],
      moistureRange: [0.2, 0.8],
    };
  }

  /** Niche overlap (Pianka index). */
  piankaOverlap(niche1: number[], niche2: number[]): number {
    if (niche1.length !== niche2.length) return 0;
    let num = 0, den1 = 0, den2 = 0;
    for (let i = 0; i < niche1.length; i++) {
      const p1 = niche1[i]! ** 2, p2 = niche2[i]! ** 2;
      num += niche1[i]! * niche2[i]!;
      den1 += p1;
      den2 += p2;
    }
    if (den1 === 0 || den2 === 0) return 0;
    return num / Math.sqrt(den1 * den2);
  }

  /** Succession stage. */
  succession(stage: 'pioneer' | 'intermediate' | 'climax'): { stage: string; biodiversity: number } {
    const biodiv: Record<string, number> = { pioneer: 5, intermediate: 25, climax: 50 };
    this._history.push({ method: 'succession', target: stage, timestamp: Date.now() });
    return { stage, biodiversity: biodiv[stage] };
  }

  /** Primary succession timeline. */
  primarySuccession(): Array<{ stage: string; durationYears: number; dominant: string }> {
    return [
      { stage: 'bare substrate', durationYears: 0, dominant: 'none' },
      { stage: 'pioneer (lichens, mosses)', durationYears: 50, dominant: 'lichens' },
      { stage: 'herbaceous plants', durationYears: 100, dominant: 'grasses, forbs' },
      { stage: 'shrubs', durationYears: 200, dominant: 'shrubs' },
      { stage: 'early trees', durationYears: 500, dominant: 'pine, birch' },
      { stage: 'climax forest', durationYears: 1000, dominant: 'oak, beech' },
    ];
  }

  /** Secondary succession timeline. */
  secondarySuccession(): Array<{ stage: string; durationYears: number; dominant: string }> {
    return [
      { stage: 'disturbed soil', durationYears: 0, dominant: 'weeds' },
      { stage: 'annual plants', durationYears: 2, dominant: 'annuals' },
      { stage: 'perennial herbs', durationYears: 10, dominant: 'perennials' },
      { stage: 'shrubs', durationYears: 30, dominant: 'shrubs' },
      { stage: 'pioneer trees', durationYears: 100, dominant: 'pine, birch' },
      { stage: 'climax community', durationYears: 200, dominant: 'oak, hickory' },
    ];
  }

  /** Generic biogeochemical cycle. */
  biogeochemicalCycle(element: string): BiogeochemicalCycle {
    this._history.push({ method: 'biogeochemicalCycle', target: element, timestamp: Date.now() });
    return {
      element,
      reservoirs: ['atmosphere', 'biosphere', 'hydrosphere', 'lithosphere'],
      processes: ['assimilation', 'release', 'transformation'],
      fluxRates: [{ from: 'atmosphere', to: 'biosphere', rate: 100 }, { from: 'biosphere', to: 'lithosphere', rate: 50 }],
      residenceTimeYears: 100,
    };
  }

  /** Carbon cycle summary. */
  carbonCycle(): BiogeochemicalCycle {
    this._history.push({ method: 'carbonCycle', target: 'C', timestamp: Date.now() });
    return {
      element: 'C',
      reservoirs: ['atmosphere (CO2 ~ 870 Gt)', 'biosphere (~600 Gt)', 'oceans (~38,000 Gt)', 'fossil fuels (~5,000-10,000 Gt)', 'sediments (~75,000,000 Gt)'],
      processes: ['photosynthesis', 'respiration', 'combustion', 'decomposition', 'sedimentation', 'weathering'],
      fluxRates: [
        { from: 'atmosphere', to: 'biosphere', rate: 120 },
        { from: 'biosphere', to: 'atmosphere', rate: 119 },
        { from: 'atmosphere', to: 'oceans', rate: 90 },
        { from: 'oceans', to: 'atmosphere', rate: 88 },
        { from: 'fossil fuels', to: 'atmosphere', rate: 9.5 },
      ],
      residenceTimeYears: 5,
    };
  }

  /** Nitrogen cycle summary. */
  nitrogenCycle(): BiogeochemicalCycle {
    this._history.push({ method: 'nitrogenCycle', target: 'N', timestamp: Date.now() });
    return {
      element: 'N',
      reservoirs: ['atmosphere (N2, 78%)', 'soil (NH4+, NO3-)', 'biomass', 'oceans (dissolved N)'],
      processes: ['nitrogen fixation', 'nitrification', 'denitrification', 'assimilation', 'ammonification', 'anammox'],
      fluxRates: [
        { from: 'atmosphere', to: 'biosphere', rate: 0.14 }, // biological fixation
        { from: 'atmosphere', to: 'biosphere', rate: 0.08 }, // industrial Haber-Bosch
        { from: 'soil', to: 'atmosphere', rate: 0.12 }, // denitrification
        { from: 'biomass', to: 'soil', rate: 1.2 }, // ammonification
      ],
      residenceTimeYears: 625,
    };
  }

  /** Water cycle summary. */
  waterCycle(): BiogeochemicalCycle {
    this._history.push({ method: 'waterCycle', target: 'H2O', timestamp: Date.now() });
    return {
      element: 'H2O',
      reservoirs: ['oceans (1.34 billion km³)', 'ice caps (24 million km³)', 'groundwater (23 million km³)', 'lakes/rivers (0.19 million km³)', 'atmosphere (13,000 km³)'],
      processes: ['evaporation', 'condensation', 'precipitation', 'infiltration', 'runoff', 'transpiration'],
      fluxRates: [
        { from: 'oceans', to: 'atmosphere', rate: 423000 },
        { from: 'atmosphere', to: 'oceans', rate: 385000 },
        { from: 'land', to: 'atmosphere', rate: 71000 },
        { from: 'atmosphere', to: 'land', rate: 111000 },
      ],
      residenceTimeYears: 3200,
    };
  }

  /** Phosphorus cycle. */
  phosphorusCycle(): BiogeochemicalCycle {
    this._history.push({ method: 'phosphorusCycle', target: 'P', timestamp: Date.now() });
    return {
      element: 'P',
      reservoirs: ['sedimentary rocks', 'soil', 'biomass', 'oceans (dissolved PO4)'],
      processes: ['weathering', 'assimilation', 'decomposition', 'sedimentation', 'uplift'],
      fluxRates: [
        { from: 'rocks', to: 'soil', rate: 0.015 },
        { from: 'soil', to: 'biomass', rate: 0.07 },
        { from: 'biomass', to: 'soil', rate: 0.07 },
        { from: 'soil', to: 'oceans', rate: 0.022 },
      ],
      residenceTimeYears: 11000000,
    };
  }

  /** Sulfur cycle. */
  sulfurCycle(): BiogeochemicalCycle {
    this._history.push({ method: 'sulfurCycle', target: 'S', timestamp: Date.now() });
    return {
      element: 'S',
      reservoirs: ['ocean (SO4^2-)', 'sediments (pyrite, gypsum)', 'atmosphere (SO2, H2S, DMS)', 'biosphere'],
      processes: ['assimilation', 'decomposition', 'sedimentation', 'volcanic emission', 'weathering'],
      fluxRates: [
        { from: 'ocean', to: 'biosphere', rate: 0.3 },
        { from: 'biosphere', to: 'ocean', rate: 0.3 },
        { from: 'rocks', to: 'atmosphere', rate: 0.01 },
        { from: 'atmosphere', to: 'land', rate: 0.1 },
      ],
      residenceTimeYears: 5000,
    };
  }

  /** All biomes. */
  biomes(): Biome[] {
    return [...BIOMES];
  }

  /** Lookup biome by name. */
  biome(name: string): Biome | null {
    return BIOMES.find(b => b.name.toLowerCase().includes(name.toLowerCase())) ?? null;
  }

  /** Whittaker biome classification by temperature and precipitation. */
  whittakerBiome(tempC: number, precipMm: number): string {
    if (tempC > 24 && precipMm > 2000) return 'Tropical Rainforest';
    if (tempC > 24 && precipMm > 1000) return 'Tropical Seasonal Forest';
    if (tempC > 24 && precipMm > 250) return 'Savanna';
    if (tempC > 24) return 'Hot Desert';
    if (tempC > 5 && precipMm > 1500) return 'Temperate Rainforest';
    if (tempC > 5 && precipMm > 800) return 'Temperate Forest';
    if (tempC > 5 && precipMm > 300) return 'Temperate Grassland';
    if (tempC > 5) return 'Cold Desert';
    if (tempC > -5 && precipMm > 400) return 'Boreal Forest';
    if (tempC > -5) return 'Cold Desert';
    return 'Tundra';
  }

  /** IUCN status info. */
  iucnStatus(status: IucnStatus): { name: string; description: string; criteria: string } {
    return IUCN_DESCRIPTIONS[status];
  }

  /** All species. */
  species(): Species[] {
    return [...SPECIES_DB];
  }

  /** Lookup species by ID. */
  getSpecies(id: string): Species | null {
    return this._species.get(id) ?? null;
  }

  /** Species-area relationship: S = c * A^z. */
  speciesArea(area: number, c: number = 1, z: number = 0.25): number {
    return c * Math.pow(area, z);
  }

  /** Island biogeography (MacArthur-Wilson). */
  islandBiogeography(area: number, distance: number): { immigrationRate: number; extinctionRate: number; equilibriumSpecies: number } {
    // Immigration decreases with distance, extinction decreases with area
    const I0 = 100, E0 = 50;
    const immRate = I0 * Math.exp(-distance / 1000);
    const extRate = E0 * Math.exp(-area / 10000);
    const eq = immRate / Math.max(0.001, immRate + extRate) * 200;
    return { immigrationRate: immRate, extinctionRate: extRate, equilibriumSpecies: Math.round(eq) };
  }

  /** Metapopulation (Levins) model: dp/dt = cp(1-p) - ep. */
  levinsMetapopulation(occupied: number, patches: number, colonization: number, extinction: number, steps: number = 100): Array<{ t: number; p: number }> {
    const series: Array<{ t: number; p: number }> = [];
    let p = occupied / Math.max(1, patches);
    for (let t = 0; t < steps; t++) {
      const dp = colonization * p * (1 - p) - extinction * p;
      p = Math.max(0, Math.min(1, p + dp));
      series.push({ t, p });
    }
    return series;
  }

  /** Minimum Viable Population (MVP) estimate. */
  mvp(growthRate: number, variance: number, years: number = 40, probability: number = 0.99): number {
    // Simplified: MVP ≈ -ln(1 - p) / (r - variance/2) * years
    const numerator = -Math.log(1 - probability);
    const denom = (growthRate - variance / 2);
    if (denom <= 0) return Infinity;
    return Math.ceil(numerator / denom * years * 50);
  }

  /** Population Viability Analysis (PVA) - simplified. */
  pva(initial: number, growthRate: number, variance: number, years: number, simulations: number = 100): { extinctionProbability: number; finalPopulation: number[] } {
    const finals: number[] = [];
    let extinctions = 0;
    for (let s = 0; s < simulations; s++) {
      let N = initial;
      for (let y = 0; y < years; y++) {
        const noise = (Math.random() - 0.5) * 2 * Math.sqrt(variance);
        N = Math.max(0, N * (1 + growthRate + noise));
        if (N < 1) { extinctions++; N = 0; break; }
      }
      finals.push(Math.round(N));
    }
    return { extinctionProbability: extinctions / simulations, finalPopulation: finals };
  }

  /** Effective population size (inbreeding): Ne = 4*Nm*Nf / (Nm + Nf). */
  effectivePopulationSize(nMales: number, nFemales: number): number {
    if (nMales + nFemales === 0) return 0;
    return (4 * nMales * nFemales) / (nMales + nFemales);
  }

  /** Effective population size with variance in reproductive success. */
  effectivePopulationVariance(N: number, variance: number): number {
    return (4 * N - 2) / (variance + 2);
  }

  /** r/K selection theory. */
  rkSelection(type: 'r' | 'K'): { strategy: string; traits: string[] } {
    if (type === 'r') {
      return {
        strategy: 'r-selected',
        traits: ['short lifespan', 'high fecundity', 'small offspring', 'early maturity', 'low parental care', 'unstable environment', 'no territoriality'],
      };
    }
    return {
      strategy: 'K-selected',
      traits: ['long lifespan', 'low fecundity', 'large offspring', 'late maturity', 'high parental care', 'stable environment', 'strong territoriality'],
    };
  }

  /** Grime's CSR plant strategies. */
  csrStrategies(): { type: string; name: string; traits: string[] }[] {
    return [
      { type: 'C', name: 'Competitor', traits: ['high biomass', 'rapid growth', 'tall stature'] },
      { type: 'S', name: 'Stress-tolerator', traits: ['slow growth', 'evergreen', 'low biomass', 'conservative resource use'] },
      { type: 'R', name: 'Ruderal', traits: ['short lifespan', 'high seed output', 'fast growth', 'disturbed habitats'] },
    ];
  }

  /** Trophic efficiency. */
  trophicEfficiency(input: number, output: number): number {
    if (input === 0) return 0;
    return (output / input) * 100;
  }

  /** Ecological footprint per person (in global hectares). */
  ecologicalFootprint(consumption: { food: number; housing: number; transport: number; goods: number; services: number }, biocapacity: number): { footprint: number; biocapacity: number; deficit: number } {
    const total = consumption.food + consumption.housing + consumption.transport + consumption.goods + consumption.services;
    return {
      footprint: total,
      biocapacity,
      deficit: biocapacity - total,
    };
  }

  /** Net reproductive rate R0 = Σ lx * mx. */
  netReproductiveRate(lifeTable: Array<{ lx: number; mx: number }>): number {
    return lifeTable.reduce((sum, row) => sum + row.lx * row.mx, 0);
  }

  /** Generation time T = Σ x*lx*mx / Σ lx*mx. */
  generationTime(lifeTable: Array<{ age: number; lx: number; mx: number }>): number {
    const num = lifeTable.reduce((s, r) => s + r.age * r.lx * r.mx, 0);
    const den = lifeTable.reduce((s, r) => s + r.lx * r.mx, 0);
    if (den === 0) return 0;
    return num / den;
  }

  /** Intrinsic rate of increase r ≈ ln(R0) / T. */
  intrinsicRate(R0: number, T: number): number {
    if (T === 0) return 0;
    return Math.log(R0) / T;
  }

  /** Stable age distribution (Lotka equation simplified). */
  stableAgeDistribution(survivorship: number[], _fecundity: number[], r: number): number[] {
    const total = survivorship.reduce((s, l, x) => s + l * Math.exp(-r * x), 0);
    if (total === 0) return survivorship.map(() => 0);
    return survivorship.map((l, x) => (l * Math.exp(-r * x)) / total);
  }

  /** Demographic stochasticity simulation. */
  demographicStochasticity(initial: number, birthRate: number, deathRate: number, years: number): number[] {
    const series: number[] = [];
    let N = initial;
    for (let y = 0; y < years; y++) {
      let births = 0, deaths = 0;
      for (let i = 0; i < N; i++) {
        if (Math.random() < birthRate) births++;
        if (Math.random() < deathRate) deaths++;
      }
      N = Math.max(0, N + births - deaths);
      series.push(N);
      if (N === 0) break;
    }
    return series;
  }

  /** Environmental stochasticity simulation. */
  environmentalStochasticity(initial: number, meanR: number, sdR: number, years: number): number[] {
    const series: number[] = [];
    let N = initial;
    for (let y = 0; y < years; y++) {
      const r = meanR + (Math.random() - 0.5) * 2 * sdR;
      N = Math.max(0, N * Math.exp(r));
      series.push(Math.round(N));
    }
    return series;
  }

  /** Connectance of a food web C = L/S^2. */
  foodWebConnectance(speciesCount: number, linksCount: number): number {
    if (speciesCount === 0) return 0;
    return linksCount / (speciesCount * speciesCount);
  }

  /** Linkage density = L/S. */
  linkageDensity(speciesCount: number, linksCount: number): number {
    if (speciesCount === 0) return 0;
    return linksCount / speciesCount;
  }

  /** Trophic level of a species by fractional method (Pauly & Palomares). */
  fractionalTrophicLevel(dietFractions: Array<{ preyTL: number; fraction: number }>): number {
    let sum = 0;
    let total = 0;
    for (const d of dietFractions) {
      sum += d.fraction * (d.preyTL + 1);
      total += d.fraction;
    }
    if (total === 0) return 2;
    return 1 + sum / total;
  }

  /** Ecological pyramids. */
  energyPyramid(producerEnergy: number, efficiency: number = 10): Array<{ level: number; energy: number }> {
    const pyramid: Array<{ level: number; energy: number }> = [];
    let energy = producerEnergy;
    for (let level = 1; level <= 5; level++) {
      pyramid.push({ level, energy: Math.round(energy) });
      energy *= efficiency / 100;
    }
    return pyramid;
  }

  /** Terrestrial primary productivity (Miami model): NPP = 3000 / (1 + e^(1.42 - 0.141T)) ... precipitation-form too. */
  miamiNpp(tempC: number, precipMm: number): number {
    const tempNpp = 3000 / (1 + Math.exp(1.42 - 0.141 * tempC));
    const precipNpp = 3000 * (1 - Math.exp(-0.000664 * precipMm));
    return Math.min(tempNpp, precipNpp);
  }

  /** Net ecosystem exchange (NEE) = GPP - Reco. */
  netEcosystemExchange(gpp: number, ecosystemRespiration: number): number {
    return gpp - ecosystemRespiration;
  }

  /** Add a custom species. */
  addSpecies(species: Species): void {
    this._species.set(species.id, species);
    this._history.push({ method: 'addSpecies', target: species.id, timestamp: Date.now() });
  }

  /** Add an ecosystem. */
  addEcosystem(ecosystem: Ecosystem): void {
    this._ecosystems.push(ecosystem);
    this._history.push({ method: 'addEcosystem', target: `${ecosystem.producers.length}+${ecosystem.consumers.length}`, timestamp: Date.now() });
  }

  /** Keystones species detection (simplified). */
  keystoneDetection(species: string[], removalImpact: Array<{ species: string; impact: number }>): string[] {
    return removalImpact.filter(r => r.impact > 0.5).map(r => r.species);
  }

  /** Top-down vs bottom-up control. */
  trophicCascade(type: 'top-down' | 'bottom-up'): { description: string; example: string } {
    if (type === 'top-down') {
      return { description: 'predators control herbivores, releasing producers', example: 'Otter-urchin-kelp (Aleutian Islands)' };
    }
    return { description: 'nutrients/producers control higher trophic levels', example: 'Sahara dust fertilizing Amazon' };
  }

  /** Red List summary by status. */
  redListSummary(): Record<IucnStatus, number> {
    const result = {} as Record<IucnStatus, number>;
    for (const status of Object.keys(IUCN_DESCRIPTIONS) as IucnStatus[]) {
      result[status] = SPECIES_DB.filter(s => s.iucnStatus === status).length;
    }
    return result;
  }

  /** Biodiversity hotspot detection. */
  biodiversityHotspots(): Array<{ name: string; endemicPlants: number; habitatLost: number }> {
    return [
      { name: 'Atlantic Forest (Brazil)', endemicPlants: 8000, habitatLost: 88 },
      { name: 'California Floristic Province', endemicPlants: 2124, habitatLost: 75 },
      { name: 'Cape Floristic Region (S. Africa)', endemicPlants: 6210, habitatLost: 78 },
      { name: 'Indo-Burma', endemicPlants: 7000, habitatLost: 86 },
      { name: 'Madagascar and Indian Ocean Islands', endemicPlants: 12000, habitatLost: 90 },
      { name: 'Mediterranean Basin', endemicPlants: 13000, habitatLost: 5 },
      { name: 'Mesoamerica', endemicPlants: 5000, habitatLost: 80 },
      { name: 'New Zealand', endemicPlants: 1865, habitatLost: 70 },
      { name: 'Tropical Andes', endemicPlants: 15000, habitatLost: 75 },
      { name: 'Sundaland', endemicPlants: 15000, habitatLost: 70 },
    ];
  }

  toPacket(): DataPacket<{
    ecosystems: Ecosystem[];
    foodChains: FoodChain[];
    populations: Population[];
    species: Species[];
    history: EcologyRecord[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['biology', 'Ecology'],
      priority: 1,
      phase: 'biology:ecology',
    };
    return {
      id: `eco-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        ecosystems: this._ecosystems,
        foodChains: this._foodChains,
        populations: this._populations,
        species: [...this._species.values()],
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._ecosystems = [];
    this._foodChains = [];
    this._populations = [];
    this._species = new Map(SPECIES_DB.map(s => [s.id, s]));
    this._history = [];
    this._counter = 0;
  }

  get ecosystemCount(): number {
    return this._ecosystems.length;
  }

  get foodChainCount(): number {
    return this._foodChains.length;
  }

  get populationCount(): number {
    return this._populations.length;
  }

  get speciesCount(): number {
    return this._species.size;
  }

  get historyDepth(): number {
    return this._history.length;
  }

  /** Stirling's approximation of ln(n!). */
  private _logFactorial(n: number): number {
    if (n <= 1) return 0;
    let result = 0;
    for (let i = 2; i <= n; i++) result += Math.log(i);
    return result;
  }
}
