import { DataPacket, Signal } from '../shared/types';

export interface UncannyExperience {
  familiarity: number;
  strangeness: number;
  uncanniness: number;
  discomfort: number;
  attraction: number;
  valleyDepth: number;
  timestamp: number;
}

export interface StimulusFeatures {
  humanLikeness: number;
  realism: number;
  animationQuality: number;
  proportionCorrectness: number;
  textureNaturalness: number;
  motionFluidity: number;
}

export interface ValleyParameters {
  valleyFloor: number;
  valleyWidth: number;
  peakBefore: number;
  peakAfter: number;
  ascentRate: number;
  descentRate: number;
}

export interface UncannyDimension {
  name: string;
  sensitivity: number;
  currentUncanniness: number;
  weight: number;
}

export class UncannyValley {
  private _familiarity: number;
  private _strangeness: number;
  private _uncanniness: number;
  private _discomfort: number;
  private _attraction: number;
  private _valleyParams: ValleyParameters;
  private _dimensions: UncannyDimension[];
  private _history: UncannyExperience[];
  private _timeStep: number;
  private _threshold: number;
  private _tolerance: number;

  constructor() {
    this._familiarity = 0.5;
    this._strangeness = 0.5;
    this._uncanniness = 0;
    this._discomfort = 0;
    this._attraction = 0;
    this._valleyParams = {
      valleyFloor: 0.7,
      valleyWidth: 0.15,
      peakBefore: 0.5,
      peakAfter: 1.0,
      ascentRate: 3,
      descentRate: 5
    };
    this._dimensions = [
      { name: 'appearance', sensitivity: 0.8, currentUncanniness: 0, weight: 0.3 },
      { name: 'motion', sensitivity: 0.9, currentUncanniness: 0, weight: 0.25 },
      { name: 'voice', sensitivity: 0.7, currentUncanniness: 0, weight: 0.2 },
      { name: 'behavior', sensitivity: 0.85, currentUncanniness: 0, weight: 0.15 },
      { name: 'context', sensitivity: 0.6, currentUncanniness: 0, weight: 0.1 }
    ];
    this._history = [];
    this._timeStep = 0;
    this._threshold = 0.5;
    this._tolerance = 0.2;
  }

  get uncanniness(): number { return this._uncanniness; }
  get discomfort(): number { return this._discomfort; }
  get attraction(): number { return this._attraction; }
  get familiarity(): number { return this._familiarity; }
  get strangeness(): number { return this._strangeness; }
  get threshold(): number { return this._threshold; }
  get tolerance(): number { return this._tolerance; }
  get valleyParameters(): ValleyParameters { return { ...this._valleyParams }; }

  public setThreshold(threshold: number): void {
    this._threshold = Math.max(0, Math.min(1, threshold));
  }

  public setTolerance(tolerance: number): void {
    this._tolerance = Math.max(0, Math.min(1, tolerance));
  }

  public setValleyParameters(params: Partial<ValleyParameters>): void {
    this._valleyParams = { ...this._valleyParams, ...params };
  }

  public setDimension(name: string, sensitivity: number, weight: number): void {
    const dim = this._dimensions.find(d => d.name === name);
    if (dim) {
      dim.sensitivity = Math.max(0, Math.min(1, sensitivity));
      dim.weight = Math.max(0, weight);
      this._normalizeDimensionWeights();
    }
  }

  private _normalizeDimensionWeights(): void {
    const total = this._dimensions.reduce((s, d) => s + d.weight, 0);
    if (total > 0) {
      for (const d of this._dimensions) {
        d.weight /= total;
      }
    }
  }

  public evaluateStimulus(features: StimulusFeatures): UncannyExperience {
    this._timeStep++;

    const humanLikeness = (
      features.humanLikeness * 0.3 +
      features.realism * 0.2 +
      features.proportionCorrectness * 0.2 +
      features.textureNaturalness * 0.15 +
      features.motionFluidity * 0.1 +
      features.animationQuality * 0.05
    );

    this._familiarity = humanLikeness;

    const deviation = Math.abs(features.proportionCorrectness - 0.95) * 2 +
      Math.abs(features.textureNaturalness - 0.9) * 1.5 +
      Math.abs(features.motionFluidity - 0.95) * 2;
    this._strangeness = Math.min(1, deviation);

    this._uncanniness = this._uncannyValleyFunction(humanLikeness);
    this._discomfort = this._uncanniness * 0.8;
    this._attraction = this._calculateAttraction(humanLikeness);

    this._updateDimensions(features);

    const experience: UncannyExperience = {
      familiarity: this._familiarity,
      strangeness: this._strangeness,
      uncanniness: this._uncanniness,
      discomfort: this._discomfort,
      attraction: this._attraction,
      valleyDepth: this._valleyDepth(),
      timestamp: this._timeStep
    };

    this._history.push(experience);
    return experience;
  }

  private _uncannyValleyFunction(humanLikeness: number): number {
    const p = this._valleyParams;
    const valleyCenter = p.valleyFloor;
    const valleyWidth = p.valleyWidth;

    if (humanLikeness <= valleyCenter - valleyWidth) {
      const progress = humanLikeness / (valleyCenter - valleyWidth);
      return p.peakBefore * Math.pow(progress, p.ascentRate * 0.5);
    }

    if (humanLikeness >= valleyCenter + valleyWidth) {
      const progress = (humanLikeness - valleyCenter - valleyWidth) / (1 - valleyCenter - valleyWidth);
      return p.peakBefore + (p.peakAfter - p.peakBefore) * Math.pow(progress, p.ascentRate);
    }

    const distFromCenter = (humanLikeness - valleyCenter) / valleyWidth;
    const valleyShape = 1 - Math.abs(distFromCenter) * 2;
    return p.peakBefore * (1 - valleyShape * p.descentRate * 0.5);
  }

  private _calculateAttraction(humanLikeness: number): number {
    if (humanLikeness < this._valleyParams.valleyFloor - this._valleyParams.valleyWidth) {
      return humanLikeness * 0.8;
    }
    if (humanLikeness > this._valleyParams.valleyFloor + this._valleyParams.valleyWidth) {
      return humanLikeness * 0.9;
    }
    const valleyProgress = (humanLikeness - (this._valleyParams.valleyFloor - this._valleyParams.valleyWidth)) /
      (2 * this._valleyParams.valleyWidth);
    const dip = Math.sin(valleyProgress * Math.PI);
    return humanLikeness * 0.6 - dip * 0.3;
  }

  private _updateDimensions(features: StimulusFeatures): void {
    const appearanceDeviation = Math.abs(features.realism - 0.9) +
      Math.abs(features.textureNaturalness - 0.9) +
      Math.abs(features.proportionCorrectness - 0.95);
    this._dimensions[0].currentUncanniness = Math.min(1, appearanceDeviation * 0.5);

    const motionDeviation = Math.abs(features.motionFluidity - 0.95) +
      Math.abs(features.animationQuality - 0.9);
    this._dimensions[1].currentUncanniness = Math.min(1, motionDeviation);

    this._dimensions[2].currentUncanniness = Math.min(1, (1 - features.textureNaturalness) * 0.7);

    const behaviorDeviation = Math.abs(features.animationQuality - 0.85);
    this._dimensions[3].currentUncanniness = Math.min(1, behaviorDeviation * 1.5);

    this._dimensions[4].currentUncanniness = this._strangeness * 0.5;
  }

  private _valleyDepth(): number {
    const p = this._valleyParams;
    const left = this._uncannyValleyFunction(p.valleyFloor - p.valleyWidth);
    const bottom = this._uncannyValleyFunction(p.valleyFloor);
    return left - bottom;
  }

  public findValleyMinimum(start: number = 0.5, end: number = 0.9): { humanLikeness: number; uncanniness: number } {
    let minUncanniness = Infinity;
    let minLikeness = start;
    const steps = 100;

    for (let i = 0; i <= steps; i++) {
      const likeness = start + (end - start) * i / steps;
      const uncanny = this._uncannyValleyFunction(likeness);
      if (uncanny < minUncanniness) {
        minUncanniness = uncanny;
        minLikeness = likeness;
      }
    }

    return { humanLikeness: minLikeness, uncanniness: minUncanniness };
  }

  public uncannyRating(stimulus: StimulusFeatures): {
    level: 'low' | 'moderate' | 'high' | 'extreme';
    score: number;
  } {
    const experience = this.evaluateStimulus(stimulus);
    const score = experience.uncanniness;

    let level: 'low' | 'moderate' | 'high' | 'extreme' = 'low';
    if (score > 0.25) level = 'moderate';
    if (score > 0.5) level = 'high';
    if (score > 0.75) level = 'extreme';

    return { level, score };
  }

  public almostHuman(percentHuman: number): UncannyExperience {
    const likeness = percentHuman / 100;
    return this.evaluateStimulus({
      humanLikeness: likeness,
      realism: likeness * 0.95,
      animationQuality: likeness * 0.9,
      proportionCorrectness: likeness > 0.7 ? 0.8 + (likeness - 0.7) : likeness,
      textureNaturalness: likeness * 0.85,
      motionFluidity: likeness * 0.92
    });
  }

  public zombification(lifeLevel: number): UncannyExperience {
    return this.evaluateStimulus({
      humanLikeness: 0.9,
      realism: 0.8 + lifeLevel * 0.2,
      animationQuality: 0.3 + lifeLevel * 0.6,
      proportionCorrectness: 0.7 + lifeLevel * 0.25,
      textureNaturalness: 0.4 + lifeLevel * 0.5,
      motionFluidity: 0.2 + lifeLevel * 0.7
    });
  }

  public doppelgangerEffect(similarity: number): UncannyExperience {
    return this.evaluateStimulus({
      humanLikeness: 0.95,
      realism: 0.95,
      animationQuality: 0.9,
      proportionCorrectness: 0.9 + similarity * 0.08,
      textureNaturalness: 0.92,
      motionFluidity: 0.88
    });
  }

  public dollToHuman(categories: number = 10): UncannyExperience[] {
    const results: UncannyExperience[] = [];
    for (let i = 0; i < categories; i++) {
      const likeness = i / (categories - 1);
      const exp = this.evaluateStimulus({
        humanLikeness: likeness,
        realism: likeness,
        animationQuality: likeness * 0.9,
        proportionCorrectness: 0.5 + likeness * 0.45,
        textureNaturalness: likeness * 0.9,
        motionFluidity: likeness * 0.85
      });
      results.push(exp);
    }
    return results;
  }

  public isUncanny(): boolean {
    return this._uncanniness > this._threshold;
  }

  public uncannyToleranceAdaptation(exposureTime: number): number {
    const adaptation = 1 - Math.exp(-exposureTime * 0.1);
    this._threshold += adaptation * this._tolerance * 0.1;
    this._threshold = Math.min(1, this._threshold);
    return this._threshold;
  }

  public uncannyToPacket(): DataPacket<Signal> {
    return {
      id: `uncanny-${Date.now()}`,
      payload: {
        source: 'uncanny-valley',
        magnitude: this._uncanniness,
        entropy: this._discomfort,
        timestamp: Date.now()
      },
      metadata: {
        createdAt: Date.now(),
        route: ['aesthetics', 'uncanny'],
        priority: 0.6,
        phase: 'unease'
      }
    };
  }

  public reset(): void {
    this._familiarity = 0.5;
    this._strangeness = 0.5;
    this._uncanniness = 0;
    this._discomfort = 0;
    this._attraction = 0;
    this._history = [];
    this._timeStep = 0;
    for (const d of this._dimensions) {
      d.currentUncanniness = 0;
    }
  }

  public getHistory(): UncannyExperience[] {
    return [...this._history];
  }

  public getDimensions(): UncannyDimension[] {
    return this._dimensions.map(d => ({ ...d }));
  }
}
