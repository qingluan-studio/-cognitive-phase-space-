import { DataPacket, PacketMeta } from '../shared/types';

/** A space descriptor. */
export interface Space {
  readonly id: string;
  readonly type: 'living' | 'working' | 'circulation' | 'service' | 'outdoor';
  readonly dimensions: { width: number; length: number; height: number };
  readonly function: string;
  readonly circulation: string[];
}

/** A floor plan. */
export interface FloorPlan {
  readonly id: string;
  readonly rooms: string[];
  readonly walls: { from: string; to: string; length: number }[];
  readonly doors: { location: string; width: number }[];
  readonly windows: { location: string; size: number }[];
}

/** A proportion descriptor. */
export interface Proportion {
  readonly ratio: number;
  readonly system: string;
  readonly description: string;
  readonly aesthetic: number;
}

/** Spatial relationship descriptor. */
export interface SpatialRelationship {
  readonly spaceA: string;
  readonly spaceB: string;
  readonly relation: 'adjacent' | 'overlapping' | 'contained' | 'separated' | 'connected';
  readonly distance: number;
}

/** Natural light analysis. */
export interface NaturalLightAnalysis {
  readonly space: string;
  readonly orientation: string;
  readonly windows: number;
  readonly daylightFactor: number;
  readonly hoursOfSunlight: number;
}

/** Ventilation analysis. */
export interface VentilationAnalysis {
  readonly space: string;
  readonly openings: number;
  readonly airflowRate: number;
  readonly airChanges: number;
  readonly strategy: string;
}

/** Accessibility analysis. */
export interface AccessibilityAnalysis {
  readonly space: string;
  readonly standard: string;
  readonly compliant: boolean;
  readonly issues: string[];
}

/**
 * SpaceDesign models architectural space planning, floor plans, proportions,
 * circulation, light, ventilation, privacy, accessibility, and zoning.
 */
export class SpaceDesign {
  private _spaces: Map<string, Space> = new Map();
  private _plans: FloorPlan[] = [];
  private _proportions: Proportion[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  get spaceCount(): number { return this._spaces.size; }
  get planCount(): number { return this._plans.length; }
  get proportionCount(): number { return this._proportions.length; }

  /** Design a space given requirements. */
  designSpace(type: Space['type'], requirements: string[]): Space {
    const dimensions = type === 'living' ? { width: 5, length: 6, height: 3 }
      : type === 'working' ? { width: 4, length: 5, height: 3 }
        : type === 'circulation' ? { width: 2, length: 8, height: 3 }
          : type === 'service' ? { width: 2, length: 3, height: 3 }
            : { width: 10, length: 10, height: 3 };
    const space: Space = {
      id: `space-${(++this._counter).toString(36)}`,
      type,
      dimensions,
      function: requirements[0] ?? `${type}-function`,
      circulation: ['main-corridor'],
    };
    this._spaces.set(space.id, space);
    this._history.push({ op: 'designSpace', type });
    return space;
  }

  /** Generate a floor plan from spaces. */
  floorPlan(spaces: Space[], connections: { a: string; b: string }[]): FloorPlan {
    const plan: FloorPlan = {
      id: `plan-${(++this._counter).toString(36)}`,
      rooms: spaces.map(s => s.id),
      walls: connections.map(c => ({ from: c.a, to: c.b, length: 5 })),
      doors: spaces.map(s => ({ location: s.id, width: 0.9 })),
      windows: spaces.filter(s => s.type === 'living' || s.type === 'working').map(s => ({ location: s.id, size: 2 })),
    };
    this._plans.push(plan);
    return plan;
  }

  /** Compute golden ratio for width/height. */
  goldenRatio(width: number, height: number): Proportion {
    const ratio = width / height;
    const golden = 1.618;
    return {
      ratio: Number(ratio.toFixed(3)),
      system: 'golden-ratio',
      description: `actual ratio ${ratio.toFixed(3)} vs golden ${golden}`,
      aesthetic: Number((1 - Math.abs(ratio - golden) / golden).toFixed(2)),
    };
  }

  /** Apply modular system with grid. */
  modularSystem(module_: number, grid: { x: number; y: number }): { module: number; grid: { x: number; y: number }; totalModules: number; alignment: string } {
    return {
      module: module_,
      grid,
      totalModules: grid.x * grid.y,
      alignment: 'strict',
    };
  }

  /** Plan circulation pattern across spaces. */
  circulationPattern(spaces: Space[], flow: string[]): { paths: string[]; efficiency: number; bottlenecks: string[] } {
    return {
      paths: flow,
      efficiency: 0.75,
      bottlenecks: ['entrance', 'intersection'],
    };
  }

  /** Determine spatial relationship between two spaces. */
  spatialRelationship(spaceA: Space, spaceB: Space): SpatialRelationship {
    const dx = spaceA.dimensions.width / 2 - spaceB.dimensions.width / 2;
    const dy = spaceA.dimensions.length / 2 - spaceB.dimensions.length / 2;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const relation: SpatialRelationship['relation'] = distance < 1 ? 'overlapping' : distance < 3 ? 'adjacent' : distance < 6 ? 'connected' : 'separated';
    return { spaceA: spaceA.id, spaceB: spaceB.id, relation, distance: Number(distance.toFixed(2)) };
  }

  /** Analyze natural light for a space. */
  naturalLight(space: Space, orientation: 'north' | 'south' | 'east' | 'west', windows: number): NaturalLightAnalysis {
    const hoursOfSunlight = orientation === 'south' ? 8 : orientation === 'east' || orientation === 'west' ? 4 : 0;
    const daylightFactor = (windows * 2 / Math.max(1, space.dimensions.width * space.dimensions.length)) * 100;
    return {
      space: space.id,
      orientation,
      windows,
      daylightFactor: Number(daylightFactor.toFixed(2)),
      hoursOfSunlight,
    };
  }

  /** Analyze ventilation for a space. */
  ventilation(space: Space, openings: number): VentilationAnalysis {
    const airflowRate = openings * 0.5;
    const volume = space.dimensions.width * space.dimensions.length * space.dimensions.height;
    const airChanges = airflowRate / Math.max(0.01, volume) * 3600;
    return {
      space: space.id,
      openings,
      airflowRate: Number(airflowRate.toFixed(2)),
      airChanges: Number(airChanges.toFixed(2)),
      strategy: 'cross-ventilation',
    };
  }

  /** Assess privacy level of a space. */
  privacy(space: Space, level: 1 | 2 | 3 | 4 | 5): { space: string; level: number; recommendations: string[] } {
    return {
      space: space.id,
      level,
      recommendations: level < 3 ? ['visual-screen', 'acoustic-treatment', 'separate-entrance'] : [],
    };
  }

  /** Assess accessibility of a space. */
  accessibility(space: Space, standard: 'ada' | 'ufas' | 'iso'): AccessibilityAnalysis {
    const doorWidth = 0.9;
    const issues: string[] = [];
    if (doorWidth < 0.85) issues.push('door-width-insufficient');
    if (space.dimensions.width < 1.5) issues.push('turning-space-insufficient');
    return {
      space: space.id,
      standard,
      compliant: issues.length === 0,
      issues,
    };
  }

  /** Apply zoning to areas. */
  zoning(areas: string[], _regulations: string[]): { zones: { name: string; area: string; use: string }[]; conflicts: string[] } {
    return {
      zones: areas.map((a, i) => ({ name: `zone-${i}`, area: a, use: i % 2 === 0 ? 'residential' : 'commercial' })),
      conflicts: [],
    };
  }

  /** Establish spatial hierarchy. */
  spatialHierarchy(spaces: Space[], _priority: string[]): { primary: string; secondary: string[]; tertiary: string[]; order: string[] } {
    return {
      primary: spaces[0]?.id ?? 'none',
      secondary: spaces.slice(1, 3).map(s => s.id),
      tertiary: spaces.slice(3).map(s => s.id),
      order: spaces.map(s => s.id),
    };
  }

  /** Compute proportion for a room. */
  proportion(room: { width: number; length: number; height: number }, ratio: number): Proportion {
    const actual = room.width / room.length;
    return {
      ratio: Number(actual.toFixed(3)),
      system: `target-${ratio}`,
      description: `actual ${actual.toFixed(3)} vs target ${ratio}`,
      aesthetic: Number((1 - Math.abs(actual - ratio) / Math.max(0.01, ratio)).toFixed(2)),
    };
  }

  /** Compute scale relative to human. */
  scale(space: Space, _human: { height: number; reach: number }): { ratio: number; comfort: string; intimacy: number } {
    const ratio = space.dimensions.height / 1.7;
    return {
      ratio: Number(ratio.toFixed(2)),
      comfort: ratio > 2 ? 'monumental' : ratio > 1.5 ? 'comfortable' : 'intimate',
      intimacy: Number((1 / ratio).toFixed(2)),
    };
  }

  toPacket(): DataPacket<{
    spaces: number;
    plans: FloorPlan[];
    proportions: Proportion[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['architecture', 'SpaceDesign'],
      priority: 1,
      phase: 'space-design',
    };
    return {
      id: `space-design-${Date.now().toString(36)}-${(++this._counter).toString(36)}`,
      payload: {
        spaces: this._spaces.size,
        plans: [...this._plans],
        proportions: [...this._proportions],
        history: [...this._history],
      },
      metadata,
    };
  }

  reset(): void {
    this._spaces.clear();
    this._plans = [];
    this._proportions = [];
    this._history = [];
    this._counter = 0;
  }
}
