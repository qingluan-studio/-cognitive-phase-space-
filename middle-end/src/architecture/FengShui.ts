import { DataPacket, PacketMeta } from '../shared/types';

/** Qi flow descriptor. */
export interface QiFlow {
  readonly direction: string;
  readonly intensity: number;
  readonly balance: number;
  readonly smoothness: number;
}

/** A bagua (eight-trigrams) area descriptor. */
export interface Bagua {
  readonly area: string;
  readonly direction: string;
  readonly element: 'wood' | 'fire' | 'earth' | 'metal' | 'water';
  readonly life: 'wealth' | 'fame' | 'relationships' | 'family' | 'health' | 'children' | 'knowledge' | 'career' | 'helpful-people';
}

/** Five-elements relationship descriptor. */
export interface FiveElements {
  readonly type: 'wood' | 'fire' | 'earth' | 'metal' | 'water';
  readonly relationships: { other: string; relation: 'sheng' | 'ke'; description: string }[];
}

/** Compass school result. */
export interface CompassResult {
  readonly facing: string;
  readonly sitting: string;
  readonly favorable: string[];
  readonly unfavorable: string[];
  readonly gua: number;
}

/** Flying stars analysis. */
export interface FlyingStarsResult {
  readonly year: number;
  readonly facing: string;
  readonly waterStar: number;
  readonly mountainStar: number;
  readonly interpretation: string;
}

/** Ming Gua (life trigram) descriptor. */
export interface MingGua {
  readonly gua: number;
  readonly eastWest: 'east' | 'west';
  readonly favorable: string[];
  readonly unfavorable: string[];
}

/** Feng shui cure descriptor. */
export interface FengShuiCure {
  readonly problem: string;
  readonly element: string;
  readonly placement: string;
  readonly method: string;
  readonly effectiveness: number;
}

/**
 * FengShui performs bagua mapping, compass/form school analysis, flying stars,
 * five-elements relationships, and applies cures to feng-shui problems.
 */
export class FengShui {
  private _qiFlows: QiFlow[] = [];
  private _baguas: Map<string, Bagua> = new Map();
  private _elements: FiveElements[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  constructor() {
    this._seedBagua();
  }

  get qiFlowCount(): number { return this._qiFlows.length; }
  get baguaCount(): number { return this._baguas.size; }
  get elementCount(): number { return this._elements.length; }

  /** Map bagua directions to areas. */
  baguaMap(direction: string): Bagua | null {
    return this._baguas.get(direction) ?? null;
  }

  /** Compass school analysis. */
  compassSchool(facing: string, sitting: string): CompassResult {
    const gua = this._directionToGua(facing);
    return {
      facing,
      sitting,
      favorable: ['sheng-qi', 'tian-yi', 'yan-nian', 'fu-wei'],
      unfavorable: ['huo-hai', 'liu-sha', 'wu-gui', 'jue-ming'],
      gua,
    };
  }

  /** Form school analysis (landscape). */
  formSchool(landscape: string, water: string, mountain: string): { landscape: string; water: string; mountain: string; supports: boolean; qiQuality: number } {
    const supports = mountain === 'behind' && water === 'front';
    return {
      landscape,
      water,
      mountain,
      supports,
      qiQuality: supports ? 0.85 : 0.4,
    };
  }

  /** Flying stars analysis. */
  flyingStars(year: number, facing: string): FlyingStarsResult {
    const waterStar = ((year - 2000) % 9) + 1;
    const mountainStar = ((year - 2000 + 4) % 9) + 1;
    let interpretation = 'neutral';
    if (waterStar === 8 || waterStar === 9) interpretation = 'prosperous';
    if (waterStar === 2 || waterStar === 5) interpretation = 'inauspicious';
    return { year, facing, waterStar, mountainStar, interpretation };
  }

  /** Five-elements analysis. */
  fiveElements(element: FiveElements['type'], _cycle: 'sheng' | 'ke'): FiveElements {
    const sheng: Record<FiveElements['type'], FiveElements['type']> = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' };
    const ke: Record<FiveElements['type'], FiveElements['type']> = { wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood' };
    const result: FiveElements = {
      type: element,
      relationships: [
        { other: sheng[element], relation: 'sheng', description: `${element} generates ${sheng[element]}` },
        { other: ke[element], relation: 'ke', description: `${element} controls ${ke[element]}` },
      ],
    };
    this._elements.push(result);
    return result;
  }

  /** Test whether element1 nourishes element2 (sheng cycle). */
  elementNourish(element1: FiveElements['type'], element2: FiveElements['type']): boolean {
    const sheng: Record<FiveElements['type'], FiveElements['type']> = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' };
    return sheng[element1] === element2;
  }

  /** Test whether element1 controls element2 (ke cycle). */
  elementControl(element1: FiveElements['type'], element2: FiveElements['type']): boolean {
    const ke: Record<FiveElements['type'], FiveElements['type']> = { wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood' };
    return ke[element1] === element2;
  }

  /** Test whether element1 weakens element2. */
  elementWeaken(element1: FiveElements['type'], element2: FiveElements['type']): boolean {
    return this.elementNourish(element2, element1) || this.elementControl(element2, element1);
  }

  /** Analyze chi flow through entrance/layout. */
  chiFlow(entrance: string, layout: string[]): QiFlow {
    const flow: QiFlow = {
      direction: entrance,
      intensity: 0.7,
      balance: layout.length > 3 ? 0.8 : 0.5,
      smoothness: layout.length < 5 ? 0.8 : 0.5,
    };
    this._qiFlows.push(flow);
    return flow;
  }

  /** Identify sha qi (negative energy) sources. */
  shaQi(source: string, direction: string): { source: string; direction: string; severity: number; cure: string } {
    const severity = source.includes('pointed') || source.includes('sharp') ? 0.8 : 0.4;
    return {
      source,
      direction,
      severity,
      cure: 'block-with-screen-or-plant',
    };
  }

  /** Compute Ming Gua from birth year and gender. */
  mingGua(birthYear: number, gender: 'male' | 'female'): MingGua {
    const digits = birthYear.toString().split('').map(Number).reduce((s, n) => s + n, 0);
    const remainder = digits % 9;
    let gua: number;
    if (gender === 'male') {
      gua = remainder === 0 ? 9 : 11 - remainder;
      if (gua > 9) gua -= 9;
    } else {
      gua = (remainder + 4) % 9;
      if (gua === 0) gua = 9;
    }
    const eastWest: MingGua['eastWest'] = [1, 3, 4, 9].includes(gua) ? 'east' : 'west';
    return {
      gua,
      eastWest,
      favorable: ['sheng-qi', 'tian-yi', 'yan-nian', 'fu-wei'],
      unfavorable: ['huo-hai', 'liu-sha', 'wu-gui', 'jue-ming'],
    };
  }

  /** Identify favorable directions for a gua. */
  favorableDirections(gua: number): string[] {
    const east = ['north', 'south', 'east', 'southeast'];
    const west = ['northwest', 'southwest', 'west', 'northeast'];
    return [1, 3, 4, 9].includes(gua) ? east : west;
  }

  /** Identify wealth area from bagua. */
  wealthArea(_bagua: Bagua): { area: string; direction: string; element: string; enhancers: string[] } {
    return {
      area: 'wealth',
      direction: 'southeast',
      element: 'wood',
      enhancers: ['plant', 'water-feature', 'purple-color'],
    };
  }

  /** Identify relationship area from bagua. */
  relationshipArea(_bagua: Bagua): { area: string; direction: string; element: string; enhancers: string[] } {
    return {
      area: 'relationships',
      direction: 'southwest',
      element: 'earth',
      enhancers: ['pair-items', 'pink-color', 'crystals'],
    };
  }

  /** Identify health area from bagua. */
  healthArea(_bagua: Bagua): { area: string; direction: string; element: string; enhancers: string[] } {
    return {
      area: 'health',
      direction: 'center',
      element: 'earth',
      enhancers: ['earth-tone', 'ceramic', 'yellow-color'],
    };
  }

  /** Apply a feng shui cure. */
  cure(problem: string, element: FiveElements['type'], placement: string): FengShuiCure {
    return {
      problem,
      element,
      placement,
      method: `${element}-enhancement`,
      effectiveness: 0.7,
    };
  }

  private _directionToGua(direction: string): number {
    const map: Record<string, number> = {
      north: 1, northeast: 8, east: 3, southeast: 4,
      south: 9, southwest: 2, west: 7, northwest: 6,
    };
    return map[direction] ?? 0;
  }

  private _seedBagua(): void {
    const baguas: Bagua[] = [
      { area: 'wealth', direction: 'southeast', element: 'wood', life: 'wealth' },
      { area: 'fame', direction: 'south', element: 'fire', life: 'fame' },
      { area: 'relationships', direction: 'southwest', element: 'earth', life: 'relationships' },
      { area: 'children', direction: 'west', element: 'metal', life: 'children' },
      { area: 'helpful-people', direction: 'northwest', element: 'metal', life: 'helpful-people' },
      { area: 'career', direction: 'north', element: 'water', life: 'career' },
      { area: 'knowledge', direction: 'northeast', element: 'earth', life: 'knowledge' },
      { area: 'family', direction: 'east', element: 'wood', life: 'family' },
      { area: 'health', direction: 'center', element: 'earth', life: 'health' },
    ];
    for (const b of baguas) this._baguas.set(b.direction, b);
  }

  toPacket(): DataPacket<{
    qiFlows: QiFlow[];
    baguas: number;
    elements: FiveElements[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['architecture', 'FengShui'],
      priority: 1,
      phase: 'feng-shui',
    };
    return {
      id: `feng-shui-${Date.now().toString(36)}-${(++this._counter).toString(36)}`,
      payload: {
        qiFlows: [...this._qiFlows],
        baguas: this._baguas.size,
        elements: [...this._elements],
        history: [...this._history],
      },
      metadata,
    };
  }

  reset(): void {
    this._qiFlows = [];
    this._baguas.clear();
    this._elements = [];
    this._history = [];
    this._counter = 0;
    this._seedBagua();
  }
}
