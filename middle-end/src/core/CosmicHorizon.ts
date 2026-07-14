export type HorizonPhase = 'expanding' | 'contracting' | 'static' | 'oscillating';

export interface ObservableRegion {
  id: string;
  radius: number;
  center: [number, number, number];
  surfaceArea: number;
  enclosedVolume: number;
  entropy: number;
  temperature: number;
  phase: HorizonPhase;
  createdAt: number;
  lastRadiated: number;
}

export interface HawkingRadiation {
  horizonId: string;
  timestamp: number;
  energy: number;
  wavelength: number;
  informationContent: number;
  isThermal: boolean;
  correlationSignature: string;
}

export interface CausalityViolation {
  sourceEvent: string;
  targetEvent: string;
  spatialSeparation: number;
  temporalSeparation: number;
  isViolation: boolean;
  lightConeResult: 'timelike' | 'spacelike' | 'lightlike';
}

interface PenroseDiagram {
  pastNullInfinity: number;
  futureNullInfinity: number;
  spatialInfinity: number;
  eventHorizon: number;
  singularity: number;
}

export class CosmicHorizon {
  private _regions: Map<string, ObservableRegion> = new Map();
  private _radiations: Map<string, HawkingRadiation[]> = new Map();
  private _causalityChecks: CausalityViolation[] = [];
  private _censoredEvents: Set<string> = new Set();
  private _horizonRadius = 1.0;
  private _hubbleConstant = 0.07;
  private _planckTemperature = 1.42e32;
  private _informationParadoxLog: Array<{ timestamp: number; info: number; claimed: number }> = [];
  private _ticker = 0;
  private _schwarzschildThreshold = 2.0;
  private _penrose: PenroseDiagram;
  private _hawkingCache: Map<string, { lastTemp: number; halfLife: number }> = new Map();

  get horizonRadius(): number { return this._horizonRadius; }
  get hubbleConstant(): number { return this._hubbleConstant; }
  get regionCount(): number { return this._regions.size; }
  get observableEntropy(): number {
    let total = 0;
    for (const region of this._regions.values()) total += region.entropy;
    return total;
  }

  constructor(initialRadius: number = 1.0) {
    this._horizonRadius = initialRadius;
    this._penrose = {
      pastNullInfinity: -1,
      futureNullInfinity: 1,
      spatialInfinity: 0,
      eventHorizon: this._horizonRadius,
      singularity: this._horizonRadius * 0.5,
    };
  }

  createRegion(id: string, initialRadius: number, center: [number, number, number] = [0, 0, 0]): ObservableRegion {
    const region: ObservableRegion = {
      id,
      radius: initialRadius,
      center,
      surfaceArea: 4 * Math.PI * initialRadius * initialRadius,
      enclosedVolume: (4 / 3) * Math.PI * initialRadius * initialRadius * initialRadius,
      entropy: this._bekensteinHawkingEntropy(initialRadius),
      temperature: this._hawkingTemperature(initialRadius),
      phase: 'expanding',
      createdAt: Date.now(),
      lastRadiated: Date.now(),
    };
    this._regions.set(id, region);
    this._radiations.set(id, []);
    this._hawkingCache.set(id, { lastTemp: region.temperature, halfLife: region.entropy * 0.1 });
    return region;
  }

  expandRegion(regionId: string, deltaT: number): ObservableRegion | null {
    const region = this._regions.get(regionId);
    if (!region) return null;
    const expansionRate = this._hubbleConstant * region.radius;
    const newRadius = region.radius + expansionRate * deltaT + this._cosmicJitter();
    if (newRadius > this._schwarzschildThreshold * this._horizonRadius) {
      this._collapseToSingularity(region);
      return region;
    }
    region.radius = newRadius;
    region.surfaceArea = 4 * Math.PI * newRadius * newRadius;
    region.enclosedVolume = (4 / 3) * Math.PI * newRadius * newRadius * newRadius;
    region.entropy = this._bekensteinHawkingEntropy(newRadius);
    region.temperature = this._hawkingTemperature(newRadius);
    region.phase = expansionRate > 0 ? 'expanding' : 'contracting';
    const cache = this._hawkingCache.get(regionId);
    if (cache) cache.lastTemp = region.temperature;
    return region;
  }

  emitHawkingRadiation(regionId: string): HawkingRadiation | null {
    const region = this._regions.get(regionId);
    if (!region) return null;
    const now = Date.now();
    const dt = (now - region.lastRadiated) * 0.001;
    if (dt < 0.1) return null;
    const temp = this._hawkingTemperature(region.radius);
    const meanEnergy = this._boltzmannEnergy(temp);
    const energy = meanEnergy * (0.5 + 0.5 * Math.abs(Math.sin(this._ticker * 0.17)));
    const wavelength = this._planckWavelength(energy);
    const info = Math.min(region.entropy * 0.01, energy * region.radius * 0.1);
    const rad: HawkingRadiation = {
      horizonId: regionId,
      timestamp: now,
      energy,
      wavelength,
      informationContent: info,
      isThermal: Math.random() > this._informationBounceProb(region.entropy),
      correlationSignature: `hawking-${regionId}-${this._ticker}-${Math.floor(energy * 1e6).toString(36)}`,
    };
    const list = this._radiations.get(regionId);
    if (list) {
      list.push(rad);
      if (list.length > 100) list.shift();
    }
    region.entropy = Math.max(0, region.entropy - info);
    region.lastRadiated = now;
    this._ticker++;
    if (region.entropy < 1 && region.radius > 0.01) {
      this._finalEvaporate(region);
    }
    return rad;
  }

  censorEvent(sourceId: string, targetId: string, timestamp: number, spatialDist: number): CausalityViolation {
    const dt = timestamp - Date.now();
    const ds2 = spatialDist * spatialDist - dt * dt;
    let lightConeResult: CausalityViolation['lightConeResult'];
    if (ds2 < 0) lightConeResult = 'timelike';
    else if (ds2 > 0) lightConeResult = 'spacelike';
    else lightConeResult = 'lightlike';
    const isViolation = lightConeResult === 'spacelike';
    const violation: CausalityViolation = {
      sourceEvent: sourceId, targetEvent: targetId,
      spatialSeparation: spatialDist, temporalSeparation: dt,
      isViolation, lightConeResult,
    };
    if (isViolation) this._censoredEvents.add(sourceId);
    this._causalityChecks.push(violation);
    if (this._causalityChecks.length > 500) this._causalityChecks.shift();
    return violation;
  }

  isWithinHorizon(distance: number): boolean {
    return distance <= this._horizonRadius;
  }

  getCosmicCensorshipStrength(): number {
    return this._censoredEvents.size / Math.max(1, this._causalityChecks.length);
  }

  informationParadoxScore(): number {
    if (this._informationParadoxLog.length < 2) return 0;
    const latest = this._informationParadoxLog[this._informationParadoxLog.length - 1];
    return Math.max(0, latest.info - latest.claimed) / Math.max(0.01, latest.info);
  }

  mergeHorizons(regionIdA: string, regionIdB: string): ObservableRegion | null {
    const a = this._regions.get(regionIdA);
    const b = this._regions.get(regionIdB);
    if (!a || !b) return null;
    const mergedRadius = Math.sqrt(a.radius * a.radius + b.radius * b.radius);
    const mergedEntropy = a.entropy + b.entropy;
    const mergedId = `${regionIdA}+${regionIdB}`;
    const merged: ObservableRegion = {
      id: mergedId, radius: mergedRadius,
      center: [
        (a.center[0] + b.center[0]) / 2,
        (a.center[1] + b.center[1]) / 2,
        (a.center[2] + b.center[2]) / 2,
      ],
      surfaceArea: 4 * Math.PI * mergedRadius * mergedRadius,
      enclosedVolume: (4 / 3) * Math.PI * mergedRadius * mergedRadius * mergedRadius,
      entropy: mergedEntropy,
      temperature: this._hawkingTemperature(mergedRadius),
      phase: a.phase === 'expanding' && b.phase === 'expanding' ? 'expanding' : 'static',
      createdAt: Date.now(),
      lastRadiated: Date.now(),
    };
    this._regions.delete(regionIdA);
    this._regions.delete(regionIdB);
    this._regions.set(mergedId, merged);
    this._radiations.delete(regionIdA);
    this._radiations.delete(regionIdB);
    this._radiations.set(mergedId, []);
    this._hawkingCache.delete(regionIdA);
    this._hawkingCache.delete(regionIdB);
    this._hawkingCache.set(mergedId, { lastTemp: merged.temperature, halfLife: mergedEntropy * 0.1 });
    return merged;
  }

  getRegion(regionId: string): ObservableRegion | undefined { return this._regions.get(regionId); }
  getRadiations(regionId: string): HawkingRadiation[] { return this._radiations.get(regionId) || []; }

  private _bekensteinHawkingEntropy(radius: number): number {
    return Math.PI * radius * radius * this._horizonRadius;
  }

  private _hawkingTemperature(radius: number): number {
    const safeR = Math.max(0.01, radius);
    return 1.0 / (8 * Math.PI * this._horizonRadius * safeR);
  }

  private _boltzmannEnergy(temperature: number): number {
    const k_B = 1.380649e-23;
    return k_B * temperature * Math.abs(Math.cos(this._ticker * 0.03));
  }

  private _planckWavelength(energy: number): number {
    const h = 6.62607015e-34;
    const c = 299792458;
    return (h * c) / Math.max(1e-50, energy);
  }

  private _cosmicJitter(): number {
    return (Math.random() - 0.5) * 0.02 * this._horizonRadius;
  }

  private _informationBounceProb(entropy: number): number {
    return Math.tanh(entropy / 100);
  }

  private _collapseToSingularity(region: ObservableRegion): void {
    region.radius = 1e-6;
    region.phase = 'contracting';
    region.entropy = 0;
    region.temperature = this._planckTemperature * 0.1;
    this._informationParadoxLog.push({
      timestamp: Date.now(),
      info: region.surfaceArea,
      claimed: 0,
    });
  }

  private _finalEvaporate(region: ObservableRegion): void {
    region.entropy = 0;
    region.radius = 1e-9;
    region.phase = 'static';
    this._informationParadoxLog.push({
      timestamp: Date.now(),
      info: region.surfaceArea,
      claimed: region.surfaceArea,
    });
  }
}
