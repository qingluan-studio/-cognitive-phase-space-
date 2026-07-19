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

/** Ecology: energy flow, population dynamics, cycles. */
export class Ecology {
  private _ecosystems: Ecosystem[] = [];
  private _foodChains: FoodChain[] = [];
  private _populations: Population[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  /** Build a food chain. */
  foodChain(organisms: string[]): FoodChain {
    const levels = organisms.map((o, i) => ({ organism: o, trophic: i + 1 }));
    const result: FoodChain = { levels };
    this._foodChains.push(result);
    this._history.push({ method: 'foodChain' });
    return result;
  }

  /** Build a food web from a list of organisms. */
  foodWeb(organisms: string[]): { organisms: string[]; links: Array<{ from: string; to: string }> } {
    const links: Array<{ from: string; to: string }> = [];
    for (let i = 0; i < organisms.length - 1; i++) {
      links.push({ from: organisms[i], to: organisms[i + 1] });
    }
    this._history.push({ method: 'foodWeb' });
    return { organisms, links };
  }

  /** Energy flow at a trophic level given efficiency. */
  energyFlow(level: number, efficiency: number): { level: number; energy: number } {
    const baseEnergy = 10000;
    const energy = baseEnergy * Math.pow(efficiency / 100, level - 1);
    this._history.push({ method: 'energyFlow' });
    return { level, energy };
  }

  /** Enumerate trophic levels in an ecosystem. */
  trophicLevels(ecosystem: Ecosystem): { producers: number; consumers: number; decomposers: number } {
    this._history.push({ method: 'trophicLevels' });
    return {
      producers: ecosystem.producers.length,
      consumers: ecosystem.consumers.length,
      decomposers: ecosystem.decomposers.length,
    };
  }

  /** Build a biomass pyramid from trophic level sizes. */
  biomassPyramid(levels: number[]): { levels: number[]; total: number } {
    const total = levels.reduce((s, l) => s + l, 0);
    this._history.push({ method: 'biomassPyramid' });
    return { levels, total };
  }

  /** Carrying capacity given resources. */
  carryingCapacity(population: Population, resources: number): number {
    const cap = Math.floor(resources / 10);
    this._history.push({ method: 'carryingCapacity' });
    return Math.max(population.size, cap);
  }

  /** Logistic growth N(t) = K / (1 + ((K - N0) / N0) * e^(-rt)). */
  logisticGrowth(N0: number, K: number, r: number, t: number): number {
    if (N0 === 0) return 0;
    const N = K / (1 + ((K - N0) / N0) * Math.exp(-r * t));
    this._history.push({ method: 'logisticGrowth', N });
    return Math.round(N);
  }

  /** Exponential growth N(t) = N0 * e^(rt). */
  exponentialGrowth(N0: number, r: number, t: number): number {
    const N = N0 * Math.exp(r * t);
    this._history.push({ method: 'exponentialGrowth', N });
    return Math.round(N);
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
    this._history.push({ method: 'populationDynamics' });
    return result;
  }

  /** Symbiotic relationship classification. */
  symbiosis(species1: string, species2: string, type: 'mutualism' | 'commensalism' | 'parasitism'): { relationship: string; outcome: string } {
    const outcomes: Record<string, string> = {
      mutualism: 'both benefit',
      commensalism: 'one benefits, other unaffected',
      parasitism: 'one benefits, other harmed',
    };
    this._history.push({ method: 'symbiosis', type });
    return { relationship: `${species1}-${species2}`, outcome: outcomes[type] };
  }

  /** Niche of an organism. */
  niche(organism: string, environment: string): { organism: string; environment: string; role: string } {
    this._history.push({ method: 'niche' });
    return { organism, environment, role: 'producer/consumer/decomposer' };
  }

  /** Succession stage. */
  succession(stage: 'pioneer' | 'intermediate' | 'climax'): { stage: string; biodiversity: number } {
    const biodiv: Record<string, number> = { pioneer: 5, intermediate: 25, climax: 50 };
    this._history.push({ method: 'succession' });
    return { stage, biodiversity: biodiv[stage] };
  }

  /** Generic biogeochemical cycle. */
  biogeochemicalCycle(element: string): { element: string; reservoirs: string[]; processes: string[] } {
    this._history.push({ method: 'biogeochemicalCycle', element });
    return {
      element,
      reservoirs: ['atmosphere', 'biosphere', 'hydrosphere', 'lithosphere'],
      processes: ['assimilation', 'release', 'transformation'],
    };
  }

  /** Carbon cycle summary. */
  carbonCycle(): { reservoirs: string[]; processes: string[] } {
    this._history.push({ method: 'carbonCycle' });
    return {
      reservoirs: ['atmosphere (CO2)', 'biosphere (organic)', 'oceans (bicarbonate)', 'fossil fuels', 'sediments'],
      processes: ['photosynthesis', 'respiration', 'combustion', 'decomposition', 'sedimentation'],
    };
  }

  /** Nitrogen cycle summary. */
  nitrogenCycle(): { reservoirs: string[]; processes: string[] } {
    this._history.push({ method: 'nitrogenCycle' });
    return {
      reservoirs: ['atmosphere (N2)', 'soil (NH4+, NO3-)', 'biomass', 'oceans'],
      processes: ['nitrogen fixation', 'nitrification', 'denitrification', 'assimilation', 'ammonification'],
    };
  }

  /** Water cycle summary. */
  waterCycle(): { reservoirs: string[]; processes: string[] } {
    this._history.push({ method: 'waterCycle' });
    return {
      reservoirs: ['oceans', 'ice caps', 'groundwater', 'lakes/rivers', 'atmosphere'],
      processes: ['evaporation', 'condensation', 'precipitation', 'infiltration', 'runoff'],
    };
  }

  toPacket(): DataPacket<{
    ecosystems: Ecosystem[];
    foodChains: FoodChain[];
    populations: Population[];
    history: unknown[];
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
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._ecosystems = [];
    this._foodChains = [];
    this._populations = [];
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

  get historyDepth(): number {
    return this._history.length;
  }
}
