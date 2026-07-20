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

  /** Compute auspicious dates for an activity. */
  auspiciousDate(activity: 'moving-in' | 'wedding' | 'business-opening' | 'renovation', year: number, _month: number): { activity: string; recommendedDates: number[]; avoidedDates: number[]; rationale: string } {
    const recommendedDates = [3, 7, 12, 18, 24, 28];
    const avoidedDates = [4, 14, 22];
    return {
      activity,
      recommendedDates,
      avoidedDates,
      rationale: `selected-based-on-tong-shu-${year}`,
    };
  }

  /** Identify five ghosts (wu gui) directions. */
  fiveGhosts(_gua: number): { directions: string[]; remedies: string[]; impact: string } {
    return {
      directions: ['northwest', 'west', 'southwest', 'northeast'],
      remedies: ['metal-element-cures', 'six-emporer-coins', 'salt-water-cure', 'metal-calabash'],
      impact: 'potential-misfortune-illness-or-conflict',
    };
  }

  /** Apply eight mansions (ba zhai) school analysis. */
  eightMansions(gua: number): { fourAuspicious: string[]; fourInauspicious: string[]; classification: string; bestUse: Record<string, string> } {
    const eastGroup = [1, 3, 4, 9];
    const classification = eastGroup.includes(gua) ? 'east-group' : 'west-group';
    return {
      fourAuspicious: ['sheng-qi', 'tian-yi', 'yan-nian', 'fu-wei'],
      fourInauspicious: ['huo-hai', 'liu-sha', 'wu-gui', 'jue-ming'],
      classification,
      bestUse: {
        'sheng-qi': 'main-door-study',
        'tian-yi': 'bedroom-kitchen',
        'yan-nian': 'master-bedroom',
        'fu-wei': 'meditation-study',
      },
    };
  }

  /** Compute xuankong da gua (xuan kong) analysis. */
  xuankongDaGua(period: number, facing: number): { period: number; facing: number; waterStar: number; mountainStar: number; combination: string; auspicious: boolean } {
    const waterStar = ((period + 1) % 9) || 9;
    const mountainStar = ((period + 5) % 9) || 9;
    const combination = `${waterStar}-${mountainStar}`;
    const auspicious = [1, 6, 8].includes(waterStar) && [1, 6, 8].includes(mountainStar);
    return { period, facing, waterStar, mountainStar, combination, auspicious };
  }

  /** Analyze landscape dragon (long) formation. */
  landscapeDragon(formation: string, mountain: string, water: string): { formation: string; mountain: string; water: string; dragonType: string; quality: number } {
    const dragonTypes: Record<string, string> = {
      'green-dragon': 'left-side-protection',
      'white-tiger': 'right-side-protection',
      'black-tortoise': 'behind-support',
      'red-phoenix': 'front-open-space',
    };
    return {
      formation,
      mountain,
      water,
      dragonType: dragonTypes[formation] ?? 'protective-formation',
      quality: 0.75,
    };
  }

  /** Analyze water dragon principles. */
  waterDragon(waterFlow: 'incoming' | 'outgoing' | 'curved' | 'straight', direction: string): { flow: string; direction: string; auspicious: boolean; prosperityEffect: number; recommendation: string } {
    const auspicious = waterFlow === 'curved' || (waterFlow === 'incoming' && ['east', 'southeast', 'north'].includes(direction));
    return {
      flow: waterFlow,
      direction,
      auspicious,
      prosperityEffect: auspicious ? 0.8 : 0.4,
      recommendation: auspicious ? 'maintain-clear-flow' : 'redirect-or-cure',
    };
  }

  /** Apply lo pan compass analysis. */
  loPanCompass(sitting: string, facing: string, _period: number): { sitting: string; facing: string; mountains24: string[]; trigram: string; assessment: string } {
    const mountains = ['ren', 'zi', 'gui', 'chou', 'gen', 'yin', 'jia', 'mao', 'yi', 'chen', 'xun', 'si', 'bing', 'wu', 'ding', 'wei', 'kun', 'shen', 'geng', 'you', 'xin', 'xu', 'qian', 'hai'];
    return {
      sitting,
      facing,
      mountains24: mountains,
      trigram: 'kan',
      assessment: 'period-appropriate',
    };
  }

  /** Compute 24 mountains direction analysis. */
  twentyFourMountains(direction: string): { mountain: string; element: FiveElements['type']; trigram: string; heavenlyStem: string; earthlyBranch: string } {
    const mountainMap: Record<string, { element: FiveElements['type']; trigram: string; stem: string; branch: string }> = {
      north: { element: 'water', trigram: 'kan', stem: 'ren-gui', branch: 'zi' },
      south: { element: 'fire', trigram: 'li', stem: 'bing-ding', branch: 'wu' },
      east: { element: 'wood', trigram: 'zhen', stem: 'jia-yi', branch: 'mao' },
      west: { element: 'metal', trigram: 'dui', stem: 'geng-xin', branch: 'you' },
      northeast: { element: 'earth', trigram: 'gen', stem: 'chou-gen', branch: 'chou-yin' },
      southeast: { element: 'wood', trigram: 'xun', stem: 'chen-xun', branch: 'chen-si' },
      southwest: { element: 'earth', trigram: 'kun', stem: 'wei-kun', branch: 'wei-shen' },
      northwest: { element: 'metal', trigram: 'qian', stem: 'xu-qian', branch: 'xu-hai' },
    };
    const m = mountainMap[direction] ?? { element: 'earth' as const, trigram: 'kun', stem: 'unknown', branch: 'unknown' };
    return { mountain: direction, ...m };
  }

  /** Analyze yearly flying stars. */
  yearlyFlyingStars(year: number): { period: number; rulingStar: number; positions: { star: number; direction: string; interpretation: string }[] } {
    const rulingStar = ((year - 2000) % 9) + 1;
    const positions = [
      { star: rulingStar, direction: 'center', interpretation: 'overall-energy' },
      { star: ((rulingStar + 1) % 9) || 9, direction: 'northwest', interpretation: 'travel-helpful-people' },
      { star: ((rulingStar + 2) % 9) || 9, direction: 'west', interpretation: 'children-creativity' },
      { star: ((rulingStar + 3) % 9) || 9, direction: 'northeast', interpretation: 'knowledge-self-cultivation' },
      { star: ((rulingStar + 4) % 9) || 9, direction: 'south', interpretation: 'fame-recognition' },
      { star: ((rulingStar + 5) % 9) || 9, direction: 'north', interpretation: 'career-life-path' },
      { star: ((rulingStar + 6) % 9) || 9, direction: 'southwest', interpretation: 'relationships-love' },
      { star: ((rulingStar + 7) % 9) || 9, direction: 'east', interpretation: 'family-health' },
      { star: ((rulingStar + 8) % 9) || 9, direction: 'southeast', interpretation: 'wealth-abundance' },
    ];
    return {
      period: Math.ceil((year - 1864) / 20),
      rulingStar,
      positions,
    };
  }

  /** Apply space clearing techniques. */
  spaceClearing(method: 'sage' | 'singing-bowl' | 'incense' | 'salt-water' | 'sound', _duration: number): { method: string; benefits: string[]; effectiveness: number; recommendedFrequency: string } {
    const benefitsMap: Record<string, string[]> = {
      sage: ['remove-negative-energy', 'purify-space', 'clear-stagnant-qi'],
      'singing-bowl': ['harmonize-energy', 'clear-stagnant-qi', 'raise-vibration'],
      incense: ['purify-air', 'calm-mind', 'attract-positive-qi'],
      'salt-water': ['absorb-negative-energy', 'clear-sha-qi', 'purify-water-element'],
      sound: ['disperse-stagnant-qi', 'activate-energy', 'cleanse-space'],
    };
    return {
      method,
      benefits: benefitsMap[method] ?? ['general-clearing'],
      effectiveness: 0.7,
      recommendedFrequency: 'monthly',
    };
  }

  /** Compute eight house formula for bedroom placement. */
  eightHouseBedroom(gua: number, _roomType: 'master' | 'guest' | 'child'): { auspiciousDirections: string[]; inauspiciousDirections: string[]; recommendedPlacement: string; elements: string[] } {
    const eastGroup = [1, 3, 4, 9];
    return {
      auspiciousDirections: eastGroup.includes(gua) ? ['east', 'southeast', 'north', 'south'] : ['west', 'northwest', 'southwest', 'northeast'],
      inauspiciousDirections: eastGroup.includes(gua) ? ['west', 'northwest', 'southwest', 'northeast'] : ['east', 'southeast', 'north', 'south'],
      recommendedPlacement: eastGroup.includes(gua) ? 'head-pointing-east' : 'head-pointing-west',
      elements: ['wood', 'water', 'fire'],
    };
  }

  /** Apply symbolic feng shui animals. */
  symbolicAnimals(_purpose: 'protection' | 'wealth' | 'career' | 'relationship' | 'health'): { animals: { name: string; placement: string; direction: string; meaning: string }[]; activationRitual: string } {
    return {
      animals: [
        { name: 'fu-dog', placement: 'entrance', direction: 'flanking', meaning: 'protection' },
        { name: 'dragon-turtle', placement: 'behind', direction: 'north', meaning: 'support-stability' },
        { name: 'pi-yao', placement: 'wealth-corner', direction: 'southeast', meaning: 'wealth-protection' },
        { name: 'qilin', placement: 'front', direction: 'south', meaning: 'auspicious-fortune' },
        { name: 'three-legged-toad', placement: 'near-door', direction: 'facing-in', meaning: 'wealth-invitation' },
      ],
      activationRitual: 'cleanse-and-program-with-intention',
    };
  }

  /** Compute element balance of a space. */
  elementBalance(elements: { wood: number; fire: number; earth: number; metal: number; water: number }): { dominant: FiveElements['type']; weakest: FiveElements['type']; balanced: boolean; recommendations: string[] } {
    const entries = Object.entries(elements) as [FiveElements['type'], number][];
    const dominant = entries.reduce((a, b) => b[1] > a[1] ? b : a)[0];
    const weakest = entries.reduce((a, b) => b[1] < a[1] ? b : a)[0];
    const max = Math.max(...entries.map(e => e[1]));
    const min = Math.min(...entries.map(e => e[1]));
    const balanced = max - min < 20;
    const recommendations: string[] = [];
    if (!balanced) recommendations.push(`add-${weakest}-element`, `reduce-${dominant}-element`);
    return { dominant, weakest, balanced, recommendations };
  }

  /** Analyze poison arrows (sha qi from sharp angles). */
  poisonArrows(features: { type: string; direction: string; sharpness: number }[]): { count: number; severity: number; cures: string[]; priorities: { feature: string; cure: string }[] } {
    const count = features.length;
    const severity = Number((features.reduce((s, f) => s + f.sharpness, 0) / Math.max(1, count)).toFixed(2));
    const cures = ['soften-with-plant', 'block-with-screen', 'use-crystal', 'mirror-deflection', 'curtain-or-drape'];
    const priorities = features.map(f => ({ feature: f.type, cure: 'block-or-soften' }));
    return { count, severity, cures, priorities };
  }

  /** Compute wealth corner activation. */
  wealthCornerActivation(_bagua: Bagua, _enhancers: string[]): { direction: string; elements: string[]; activation: string[]; maintenance: string[]; expectedBenefit: number } {
    return {
      direction: 'southeast',
      elements: ['wood', 'water'],
      activation: ['place-healthy-plant', 'add-water-feature', 'use-purple-green-color', 'clean-and-declutter'],
      maintenance: ['water-plants-weekly', 'keep-clean', 'refresh-water-features'],
      expectedBenefit: 0.7,
    };
  }

  /** Compute career corner activation. */
  careerCornerActivation(_bagua: Bagua, _enhancers: string[]): { direction: string; elements: string[]; activation: string[]; maintenance: string[]; expectedBenefit: number } {
    return {
      direction: 'north',
      elements: ['water', 'metal'],
      activation: ['add-water-feature', 'use-black-blue-color', 'place-fish-aquarium', 'metal-elements'],
      maintenance: ['keep-water-clean', 'ensure-flow', 'maintain-fish-health'],
      expectedBenefit: 0.65,
    };
  }

  /** Compute love corner activation. */
  loveCornerActivation(_bagua: Bagua, _enhancers: string[]): { direction: string; elements: string[]; activation: string[]; maintenance: string[]; expectedBenefit: number } {
    return {
      direction: 'southwest',
      elements: ['earth', 'fire'],
      activation: ['use-pair-items', 'place-rose-quartz', 'add-red-pink-color', 'crystals-and-ceramics'],
      maintenance: ['keep-pairs-balanced', 'remove-single-items', 'keep-clean'],
      expectedBenefit: 0.6,
    };
  }

  /** Apply feng shui office principles. */
  officeFengShui(seatPosition: 'commanding' | 'back-to-door' | 'facing-wall' | 'under-beam'): { position: string; auspicious: boolean; corrections: string[]; recommendations: string[] } {
    const auspicious = seatPosition === 'commanding';
    const correctionsMap: Record<string, string[]> = {
      commanding: [],
      'back-to-door': ['place-mirror', 'reposition-desk'],
      'facing-wall': ['add-artwork', 'place-mirror-on-wall'],
      'under-beam': ['hang-flute', 'use-canopy', 'move-desk'],
    };
    return {
      position: seatPosition,
      auspicious,
      corrections: correctionsMap[seatPosition],
      recommendations: ['keep-desk-clear', 'add-plant', 'use-proper-lighting', 'incorporate-elements'],
    };
  }

  /** Apply feng shui kitchen principles. */
  kitchenFengShui(stovePosition: string, sinkPosition: string, _refrigerator: string): { stove: string; sink: string; conflict: boolean; remedies: string[]; harmony: number } {
    const conflict = ['adjacent', 'opposite'].includes(stovePosition) && ['adjacent', 'opposite'].includes(sinkPosition);
    return {
      stove: stovePosition,
      sink: sinkPosition,
      conflict,
      remedies: conflict ? ['place-wood-element-between', 'use-plant'] : [],
      harmony: conflict ? 0.4 : 0.8,
    };
  }

  /** Apply feng shui bedroom principles. */
  bedroomFengShui(bedPosition: 'commanding' | 'under-window' | 'under-beam' | 'facing-mirror' | 'against-shared-wall'): { position: string; auspicious: boolean; remedies: string[]; recommendations: string[] } {
    const auspicious = bedPosition === 'commanding';
    const remediesMap: Record<string, string[]> = {
      commanding: [],
      'under-window': ['add-headboard', 'use-heavy-curtains'],
      'under-beam': ['hang-flute', 'use-canopy', 'move-bed'],
      'facing-mirror': ['remove-mirror', 'cover-at-night'],
      'against-shared-wall': ['use-headboard', 'add-wall-art'],
    };
    return {
      position: bedPosition,
      auspicious,
      remedies: remediesMap[bedPosition],
      recommendations: ['use-supportive-headboard', 'keep-clutter-free', 'balance-nightstands', 'use-soothing-colors'],
    };
  }

  /** Compute annual afflictions. */
  annualAfflictions(year: number): { fiveYellow: string; threeKillings: string; grandDukeJupiter: string; yearBreaker: string; recommendations: string[] } {
    const yearAnimal = ['monkey', 'rooster', 'dog', 'pig', 'rat', 'ox', 'tiger', 'rabbit', 'dragon', 'snake', 'horse', 'sheep'];
    const yearIndex = (year - 2020) % 12;
    return {
      fiveYellow: ['center', 'northwest', 'west', 'northeast', 'south', 'north', 'southwest', 'east', 'southeast'][((year - 2020) % 9)],
      threeKillings: ['east', 'south', 'west', 'north'][((year - 2020) % 4)],
      grandDukeJupiter: yearAnimal[yearIndex],
      yearBreaker: yearAnimal[(yearIndex + 6) % 12],
      recommendations: ['avoid-renovation-in-afflicted-areas', 'place-cures', 'do-not-disturb-ground'],
    };
  }

  /** Apply classical feng shui formulas summary. */
  classicalFormulas(sitting: string, facing: string, period: number): { eightMansions: boolean; flyingStars: boolean; xuankong: boolean; waterDragon: boolean; formSchool: boolean; assessment: string } {
    return {
      eightMansions: true,
      flyingStars: true,
      xuankong: true,
      waterDragon: true,
      formSchool: true,
      assessment: `period-${period}-sitting-${sitting}-facing-${facing}`,
    };
  }

  /** Compute kua number compatibility for two people. */
  kuaCompatibility(kua1: number, kua2: number): { compatible: boolean; groupMatch: string; favorable: string[]; recommendations: string[] } {
    const eastGroup = [1, 3, 4, 9];
    const compatible = (eastGroup.includes(kua1) && eastGroup.includes(kua2)) || (!eastGroup.includes(kua1) && !eastGroup.includes(kua2));
    return {
      compatible,
      groupMatch: compatible ? 'same-group' : 'different-group',
      favorable: compatible ? ['shared-energies', 'harmonious-directions', 'supportive-environment'] : ['compromise-needed', 'separate-spaces'],
      recommendations: compatible ? ['align-bed-facing-favorable'] : ['use-shared-favorable-directions', 'enhance-common-areas'],
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
