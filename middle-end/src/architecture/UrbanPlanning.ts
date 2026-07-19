import { DataPacket, PacketMeta } from '../shared/types';

/** A zoning descriptor. */
export interface Zone {
  readonly id: string;
  readonly type: 'residential' | 'commercial' | 'industrial' | 'mixed' | 'green' | 'institutional';
  readonly regulations: string[];
  readonly density: 'low' | 'medium' | 'high';
  readonly area: number;
}

/** A city descriptor. */
export interface City {
  readonly id: string;
  readonly districts: string[];
  readonly infrastructure: string[];
  readonly population: number;
  readonly area: number;
}

/** Infrastructure descriptor. */
export interface Infrastructure {
  readonly type: 'transportation' | 'water' | 'electricity' | 'gas' | 'telecom' | 'waste';
  readonly capacity: number;
  readonly coverage: number;
  readonly condition: 'good' | 'fair' | 'poor';
}

/** Transportation plan. */
export interface TransportationPlan {
  readonly network: string;
  readonly mode: 'road' | 'rail' | 'bus' | 'bike' | 'pedestrian' | 'mixed';
  readonly length: number;
  readonly stations: number;
}

/** Green space plan. */
export interface GreenSpacePlan {
  readonly area: number;
  readonly type: 'park' | 'garden' | 'greenway' | 'forest' | 'square';
  readonly distribution: string;
  readonly perCapita: number;
}

/** Smart city application descriptor. */
export interface SmartCityApp {
  readonly technology: string;
  readonly applications: string[];
  readonly dataSources: string[];
  readonly impact: number;
}

/** Sustainability metrics. */
export interface SustainabilityMetrics {
  readonly policies: string[];
  readonly metrics: { name: string; value: number }[];
  readonly score: number;
  readonly rating: 'low' | 'medium' | 'high';
}

/**
 * UrbanPlanning models zoning, land use, density, transportation,
 * utilities, smart-city applications, and sustainability.
 */
export class UrbanPlanning {
  private _zones: Map<string, Zone> = new Map();
  private _cities: City[] = [];
  private _infrastructure: Infrastructure[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  get zoneCount(): number { return this._zones.size; }
  get cityCount(): number { return this._cities.length; }
  get infrastructureCount(): number { return this._infrastructure.length; }

  /** Create a zoning plan. */
  zoningPlan(area: number, regulations: string[]): Zone {
    const zone: Zone = {
      id: `zone-${(++this._counter).toString(36)}`,
      type: regulations.some(r => r.includes('residential')) ? 'residential' : 'mixed',
      regulations,
      density: regulations.length > 5 ? 'high' : regulations.length > 2 ? 'medium' : 'low',
      area,
    };
    this._zones.set(zone.id, zone);
    return zone;
  }

  /** Classify land use. */
  landUse(classification: string, area: number): { classification: string; area: number; percentage: number; compatible: string[] } {
    const compat: Record<string, string[]> = {
      residential: ['commercial', 'green', 'institutional'],
      commercial: ['residential', 'mixed', 'institutional'],
      industrial: ['industrial'],
      green: ['residential', 'institutional'],
    };
    return {
      classification,
      area,
      percentage: 0,
      compatible: compat[classification] ?? ['mixed'],
    };
  }

  /** Compute density. */
  density(population: number, area: number, type: 'gross' | 'net'): { density: number; per: string; classification: string } {
    const d = area > 0 ? population / area : 0;
    let classification = 'low';
    if (d > 10000) classification = 'high';
    else if (d > 5000) classification = 'medium';
    return {
      density: Number(d.toFixed(0)),
      per: `${type}-hectare`,
      classification,
    };
  }

  /** Plan transportation network. */
  transportation(network: string, mode: TransportationPlan['mode']): TransportationPlan {
    const lengths: Record<TransportationPlan['mode'], number> = {
      road: 100, rail: 50, bus: 80, bike: 30, pedestrian: 20, mixed: 200,
    };
    return {
      network,
      mode,
      length: lengths[mode],
      stations: mode === 'rail' || mode === 'bus' ? 20 : 0,
    };
  }

  /** Design a grid plan. */
  gridPlan(blocks: number, streets: number): { blocks: number; streets: number; intersections: number; coverage: number } {
    return {
      blocks,
      streets,
      intersections: Math.floor(streets * streets / 2),
      coverage: 0.7,
    };
  }

  /** Design a radial plan. */
  radialPlan(center: string, radii: number): { center: string; radii: number; avenues: number; rings: number } {
    return {
      center,
      radii,
      avenues: radii * 2,
      rings: 3,
    };
  }

  /** Plan green space. */
  greenSpace(area: number, type: GreenSpacePlan['type'], _distribution: string): GreenSpacePlan {
    return {
      area,
      type,
      distribution: 'even',
      perCapita: Number((area / 1000).toFixed(2)),
    };
  }

  /** Plan public services. */
  publicServices(population: number, _needs: string[]): { services: { type: string; count: number; capacity: number }[]; coverage: number } {
    return {
      services: [
        { type: 'school', count: Math.ceil(population / 5000), capacity: 500 },
        { type: 'hospital', count: Math.ceil(population / 50000), capacity: 200 },
        { type: 'library', count: Math.ceil(population / 20000), capacity: 100 },
        { type: 'fire-station', count: Math.ceil(population / 30000), capacity: 50 },
      ],
      coverage: 0.85,
    };
  }

  /** Plan utilities. */
  utility(water: number, electricity: number, gas: number, telecom: number): Infrastructure[] {
    const items: Infrastructure[] = [
      { type: 'water', capacity: water, coverage: 0.95, condition: 'good' },
      { type: 'electricity', capacity: electricity, coverage: 0.98, condition: 'good' },
      { type: 'gas', capacity: gas, coverage: 0.7, condition: 'fair' },
      { type: 'telecom', capacity: telecom, coverage: 0.9, condition: 'good' },
    ];
    this._infrastructure.push(...items);
    return items;
  }

  /** Plan waste management. */
  wasteManagement(population: number, volume: number): { perCapita: number; facilities: number; recycling: number; landfill: number } {
    return {
      perCapita: Number((volume / population).toFixed(2)),
      facilities: Math.ceil(population / 10000),
      recycling: 0.35,
      landfill: 0.65,
    };
  }

  /** Project urban growth. */
  urbanGrowth(population: number, projection: number, boundary: number): { current: number; projected: number; growthRate: number; withinBoundary: boolean } {
    return {
      current: population,
      projected: projection,
      growthRate: Number(((projection - population) / population * 100).toFixed(2)),
      withinBoundary: projection <= boundary,
    };
  }

  /** Detect gentrification. */
  gentrification(_neighborhood: string, indicators: { indicator: string; change: number }[]): { detected: boolean; severity: number; displacement: number } {
    const avgChange = indicators.reduce((s, i) => s + i.change, 0) / Math.max(1, indicators.length);
    return {
      detected: avgChange > 0.1,
      severity: Number(avgChange.toFixed(2)),
      displacement: Number((avgChange * 0.5).toFixed(2)),
    };
  }

  /** Apply smart city technologies. */
  smartCity(technology: string, applications: string[]): SmartCityApp {
    return {
      technology,
      applications,
      dataSources: ['iot-sensors', 'mobile-data', 'satellite-imagery'],
      impact: 0.7,
    };
  }

  /** Plan sustainability. */
  sustainable(policies: string[], metrics: { name: string; value: number }[]): SustainabilityMetrics {
    const score = metrics.reduce((s, m) => s + m.value, 0) / Math.max(1, metrics.length);
    const rating: SustainabilityMetrics['rating'] = score > 0.7 ? 'high' : score > 0.4 ? 'medium' : 'low';
    return { policies, metrics, score: Number(score.toFixed(2)), rating };
  }

  toPacket(): DataPacket<{
    zones: number;
    cities: City[];
    infrastructure: Infrastructure[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['architecture', 'UrbanPlanning'],
      priority: 1,
      phase: 'urban-planning',
    };
    return {
      id: `urban-planning-${Date.now().toString(36)}-${(++this._counter).toString(36)}`,
      payload: {
        zones: this._zones.size,
        cities: [...this._cities],
        infrastructure: [...this._infrastructure],
        history: [...this._history],
      },
      metadata,
    };
  }

  reset(): void {
    this._zones.clear();
    this._cities = [];
    this._infrastructure = [];
    this._history = [];
    this._counter = 0;
  }
}
