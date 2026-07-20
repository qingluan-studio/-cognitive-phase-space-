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

  /** Compute ergonomic clearance for a workstation. */
  public ergonomicClearance(userHeight: number, taskType: 'seated' | 'standing' | 'mixed'): { workSurfaceHeight: number; kneeClearance: number; reachZone: number; eyeHeight: number; recommendations: string[] } {
    const workSurfaceHeight = taskType === 'seated' ? userHeight * 0.43 : taskType === 'standing' ? userHeight * 0.53 : userHeight * 0.48;
    const kneeClearance = userHeight * 0.28;
    const reachZone = userHeight * 0.45;
    const eyeHeight = taskType === 'seated' ? userHeight * 0.48 : userHeight * 0.93;
    const recommendations: string[] = [];
    if (taskType === 'seated') {
      recommendations.push('adjustable-chair-required');
      recommendations.push('footrest-if-feet-not-flat');
      recommendations.push('monitor-at-eye-level');
    } else if (taskType === 'standing') {
      recommendations.push('anti-fatigue-mat-recommended');
      recommendations.push('adjustable-height-desk-preferred');
    } else {
      recommendations.push('sit-stand-desk-optimal');
      recommendations.push('frequent-posture-changes');
    }
    return {
      workSurfaceHeight: Number(workSurfaceHeight.toFixed(2)),
      kneeClearance: Number(kneeClearance.toFixed(2)),
      reachZone: Number(reachZone.toFixed(2)),
      eyeHeight: Number(eyeHeight.toFixed(2)),
      recommendations,
    };
  }

  /** Compute wayfinding complexity score for a building layout. */
  public wayfindingComplexity(rooms: number, decisionPoints: number, floorChanges: number, signageQuality: number): { complexityScore: number; legibility: number; recommendations: string[] } {
    const complexityScore = (decisionPoints * 2 + floorChanges * 5) / Math.max(1, rooms * 0.1) - signageQuality;
    const legibility = Math.max(0, Math.min(1, 1 - complexityScore / 50));
    const recommendations: string[] = [];
    if (complexityScore > 20) recommendations.push('increase-signage-density');
    if (floorChanges > 2) recommendations.push('add-visual-landmarks-at-level-changes');
    if (decisionPoints > 10) recommendations.push('simplify-corridor-layout');
    if (legibility < 0.5) recommendations.push('use-distinctive-architecture-elements');
    this._history.push({ op: 'wayfindingComplexity', complexityScore });
    return {
      complexityScore: Number(complexityScore.toFixed(2)),
      legibility: Number(legibility.toFixed(4)),
      recommendations,
    };
  }

  /** Compute biophilic design score. */
  public biophilicScore(space: Space, natureElements: { plants: number; waterFeatures: number; naturalMaterials: number; viewsToNature: number; daylightFactor: number }): { score: number; level: string; improvements: string[] } {
    const score = (
      Math.min(natureElements.plants * 5, 25) +
      natureElements.waterFeatures * 10 +
      natureElements.naturalMaterials * 5 +
      natureElements.viewsToNature * 15 +
      natureElements.daylightFactor * 20
    );
    let level: string;
    if (score >= 80) level = 'exemplary';
    else if (score >= 60) level = 'good';
    else if (score >= 40) level = 'moderate';
    else level = 'poor';
    const improvements: string[] = [];
    if (natureElements.plants < 3) improvements.push('add-indoor-plants');
    if (natureElements.waterFeatures < 1) improvements.push('consider-water-feature');
    if (natureElements.daylightFactor < 2) improvements.push('increase-daylight-penetration');
    if (natureElements.viewsToNature < 1) improvements.push('optimize-window-placement');
    this._history.push({ op: 'biophilicScore', score });
    return { score: Number(score.toFixed(2)), level, improvements };
  }

  /** Compute spatial syntax integration value (simplified). */
  public spatialIntegration(connectivity: number[], depthFromEntrance: number[]): { integration: number[]; intelligibility: number; synergy: number } {
    const totalDepth = depthFromEntrance.reduce((a, b) => a + b, 0);
    const integration = depthFromEntrance.map(d => Number((totalDepth / Math.max(1, d * depthFromEntrance.length)).toFixed(4)));
    const meanConnectivity = connectivity.reduce((a, b) => a + b, 0) / connectivity.length;
    const meanIntegration = integration.reduce((a, b) => a + b, 0) / integration.length;
    const variance = integration.reduce((s, v) => s + Math.pow(v - meanIntegration, 2), 0) / integration.length;
    const intelligibility = meanConnectivity / Math.sqrt(variance + 0.001);
    const synergy = meanIntegration > 0 ? meanConnectivity / meanIntegration : 0;
    this._history.push({ op: 'spatialIntegration', meanIntegration });
    return { integration, intelligibility: Number(intelligibility.toFixed(4)), synergy: Number(synergy.toFixed(4)) };
  }

  /** Compute proxemics analysis for spatial relationships. */
  public proxemicsAnalysis(spaceType: 'public' | 'social' | 'personal' | 'intimate', occupantCount: number, area: number): { density: number; personalSpace: number; crowdingIndex: number; recommendation: string } {
    const zoneMap = { public: 3.6, social: 1.2, personal: 0.45, intimate: 0.15 };
    const requiredSpace = zoneMap[spaceType];
    const density = occupantCount / area;
    const personalSpace = area / occupantCount;
    const crowdingIndex = personalSpace < requiredSpace ? requiredSpace / personalSpace : 0;
    let recommendation: string;
    if (crowdingIndex > 2) recommendation = 'space-severely-overcrowded';
    else if (crowdingIndex > 1.5) recommendation = 'space-overcrowded-reduce-occupancy';
    else if (crowdingIndex > 1) recommendation = 'space-near-capacity';
    else recommendation = 'space-adequate';
    this._history.push({ op: 'proxemicsAnalysis', crowdingIndex });
    return {
      density: Number(density.toFixed(4)),
      personalSpace: Number(personalSpace.toFixed(4)),
      crowdingIndex: Number(crowdingIndex.toFixed(4)),
      recommendation,
    };
  }

  /** Compute environmental psychology metrics for a space. */
  public environmentalPsychologyMetrics(windowArea: number, floorArea: number, ceilingHeight: number, colorTemperature: number, noiseLevel: number): { perceivedSpaciousness: number; comfortIndex: number; stressPotential: number; productivityScore: number } {
    const windowRatio = windowArea / floorArea;
    const spaciousness = Math.min(1, ceilingHeight / 3.0) * (1 + windowRatio);
    const comfortIndex = (windowRatio * 0.3 + Math.min(1, ceilingHeight / 4) * 0.2 + (1 - noiseLevel / 70) * 0.3 + (1 - Math.abs(colorTemperature - 4000) / 4000) * 0.2);
    const stressPotential = Math.max(0, 1 - comfortIndex);
    const productivityScore = comfortIndex * 0.8 + spaciousness * 0.2;
    this._history.push({ op: 'environmentalPsychologyMetrics', comfortIndex });
    return {
      perceivedSpaciousness: Number(spaciousness.toFixed(4)),
      comfortIndex: Number(comfortIndex.toFixed(4)),
      stressPotential: Number(stressPotential.toFixed(4)),
      productivityScore: Number(productivityScore.toFixed(4)),
    };
  }

  /** Compute circulation efficiency for a floor plan. */
  public circulationEfficiency(paths: { start: string; end: string; distance: number; usage: number }[], totalFloorArea: number): { efficiencyRatio: number; bottleneckRisk: number; averagePathLength: number; recommendations: string[] } {
    const totalPathLength = paths.reduce((s, p) => s + p.distance * p.usage, 0);
    const efficiencyRatio = totalPathLength > 0 ? totalFloorArea / totalPathLength : 0;
    const averagePathLength = paths.length > 0 ? paths.reduce((s, p) => s + p.distance, 0) / paths.length : 0;
    const maxUsage = Math.max(...paths.map(p => p.usage), 0);
    const bottleneckRisk = maxUsage / Math.max(1, paths.reduce((s, p) => s + p.usage, 0) / paths.length);
    const recommendations: string[] = [];
    if (bottleneckRisk > 3) recommendations.push('add-alternative-routes');
    if (averagePathLength > 50) recommendations.push('consider-secondary-entrances');
    if (efficiencyRatio < 10) recommendations.push('optimize-corridor-widths');
    this._history.push({ op: 'circulationEfficiency', efficiencyRatio });
    return {
      efficiencyRatio: Number(efficiencyRatio.toFixed(4)),
      bottleneckRisk: Number(bottleneckRisk.toFixed(4)),
      averagePathLength: Number(averagePathLength.toFixed(2)),
      recommendations,
    };
  }

  /** Compute space utilization rate. */
  public spaceUtilization(scheduledHours: number[], availableHours: number, capacity: number, peakOccupancy: number): { utilizationRate: number; peakUtilization: number; idleTime: number; optimizationPotential: number } {
    const usedHours = scheduledHours.reduce((a, b) => a + b, 0);
    const utilizationRate = usedHours / availableHours;
    const peakUtilization = peakOccupancy / capacity;
    const idleTime = availableHours - usedHours;
    const optimizationPotential = Math.max(0, 1 - utilizationRate) * 0.5 + Math.max(0, 1 - peakUtilization) * 0.5;
    this._history.push({ op: 'spaceUtilization', utilizationRate });
    return {
      utilizationRate: Number(utilizationRate.toFixed(4)),
      peakUtilization: Number(peakUtilization.toFixed(4)),
      idleTime: Number(idleTime.toFixed(2)),
      optimizationPotential: Number(optimizationPotential.toFixed(4)),
    };
  }

  /** Compute flexibility index for a space. */
  public flexibilityIndex(wallTypes: { fixed: number; movable: number; operable: number }, serviceZones: number, floorPlateRegularity: number): { flexibilityIndex: number; adaptabilityScore: number; reconfigurationCost: number } {
    const totalWalls = wallTypes.fixed + wallTypes.movable + wallTypes.operable;
    const movableRatio = totalWalls > 0 ? (wallTypes.movable + wallTypes.operable) / totalWalls : 0;
    const flexibilityIndex = movableRatio * 0.4 + (1 - serviceZones * 0.05) * 0.3 + floorPlateRegularity * 0.3;
    const adaptabilityScore = Math.min(1, flexibilityIndex * 1.5);
    const reconfigurationCost = (1 - movableRatio) * 100 + wallTypes.fixed * 5;
    this._history.push({ op: 'flexibilityIndex', flexibilityIndex });
    return {
      flexibilityIndex: Number(flexibilityIndex.toFixed(4)),
      adaptabilityScore: Number(adaptabilityScore.toFixed(4)),
      reconfigurationCost: Number(reconfigurationCost.toFixed(2)),
    };
  }

  /** Compute accessibility compliance score. */
  public accessibilityScore(doorWidths: number[], corridorWidths: number[], rampGradients: number[], turningSpaces: number, tactileIndicators: boolean): { score: number; compliance: string; violations: string[] } {
    const doorScore = doorWidths.filter(w => w >= 0.9).length / Math.max(1, doorWidths.length);
    const corridorScore = corridorWidths.filter(w => w >= 1.5).length / Math.max(1, corridorWidths.length);
    const rampScore = rampGradients.filter(g => g <= 1 / 12).length / Math.max(1, rampGradients.length);
    const turningScore = turningSpaces >= 1.5 ? 1 : turningSpaces >= 1.2 ? 0.7 : 0.3;
    const tactileScore = tactileIndicators ? 1 : 0;
    const score = (doorScore + corridorScore + rampScore + turningScore + tactileScore) / 5 * 100;
    let compliance: string;
    if (score >= 90) compliance = 'full-compliance';
    else if (score >= 70) compliance = 'partial-compliance';
    else compliance = 'non-compliant';
    const violations: string[] = [];
    if (doorScore < 1) violations.push('some-doors-below-minimum-width');
    if (corridorScore < 1) violations.push('some-corridors-below-minimum-width');
    if (rampScore < 1) violations.push('some-ramps-too-steep');
    if (!tactileIndicators) violations.push('missing-tactile-indicators');
    this._history.push({ op: 'accessibilityScore', score });
    return { score: Number(score.toFixed(2)), compliance, violations };
  }

  /** Compute visual privacy index for open plan layouts. */
  public visualPrivacy(screenHeights: number[], eyeHeight: number, workstationSeparation: number): { privacyIndex: number; distractionPotential: number; acousticPrivacy: number; recommendations: string[] } {
    const effectiveScreens = screenHeights.filter(h => h > eyeHeight * 0.8).length;
    const screenRatio = effectiveScreens / Math.max(1, screenHeights.length);
    const separationFactor = Math.min(1, workstationSeparation / 3.0);
    const privacyIndex = screenRatio * 0.5 + separationFactor * 0.3 + 0.2;
    const distractionPotential = 1 - privacyIndex;
    const acousticPrivacy = screenRatio * 0.3 + separationFactor * 0.5 + 0.2;
    const recommendations: string[] = [];
    if (privacyIndex < 0.5) recommendations.push('increase-screen-height');
    if (workstationSeparation < 2) recommendations.push('increase-workstation-spacing');
    if (acousticPrivacy < 0.5) recommendations.push('add-acoustic-panels');
    this._history.push({ op: 'visualPrivacy', privacyIndex });
    return {
      privacyIndex: Number(privacyIndex.toFixed(4)),
      distractionPotential: Number(distractionPotential.toFixed(4)),
      acousticPrivacy: Number(acousticPrivacy.toFixed(4)),
      recommendations,
    };
  }

  /** Compute thermal zoning efficiency. */
  public thermalZoningEfficiency(zones: { area: number; orientation: number; glazingRatio: number; occupancy: number }[]): { uniformityIndex: number; overheatingRisk: number; underheatingRisk: number; energyPenalty: number } {
    const loads = zones.map(z => z.area * z.glazingRatio * Math.abs(Math.cos(z.orientation)) + z.occupancy * 100);
    const meanLoad = loads.reduce((a, b) => a + b, 0) / loads.length;
    const variance = loads.reduce((s, l) => s + Math.pow(l - meanLoad, 2), 0) / loads.length;
    const uniformityIndex = meanLoad > 0 ? 1 - Math.sqrt(variance) / meanLoad : 0;
    const overheatingRisk = zones.filter(z => z.glazingRatio > 0.4 && Math.abs(z.orientation) < Math.PI / 4).length / zones.length;
    const underheatingRisk = zones.filter(z => z.glazingRatio < 0.1).length / zones.length;
    const energyPenalty = (1 - uniformityIndex) * 0.3 + overheatingRisk * 0.4 + underheatingRisk * 0.3;
    this._history.push({ op: 'thermalZoningEfficiency', uniformityIndex });
    return {
      uniformityIndex: Number(uniformityIndex.toFixed(4)),
      overheatingRisk: Number(overheatingRisk.toFixed(4)),
      underheatingRisk: Number(underheatingRisk.toFixed(4)),
      energyPenalty: Number(energyPenalty.toFixed(4)),
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
