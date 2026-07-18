import { DataPacket, Signal } from '../shared/types';

export interface SublimeExperience {
  magnitude: number;
  terror: number;
  pleasure: number;
  awe: number;
  transcendence: number;
  overwhelm: number;
  elevation: number;
  timestamp: number;
}

export interface SublimeDimension {
  name: string;
  intensity: number;
  valence: number;
  contribution: number;
}

export interface SublimeTrigger {
  type: 'natural' | 'artistic' | 'mathematical' | 'cosmic' | 'moral';
  scale: number;
  complexity: number;
  novelty: number;
}

export interface TranscendenceState {
  egoDissolution: number;
  unityExperience: number;
  timelessness: number;
  ineffability: number;
}

export class SublimeEngine {
  private _magnitude: number;
  private _terror: number;
  private _pleasure: number;
  private _awe: number;
  private _transcendence: number;
  private _dimensions: SublimeDimension[];
  private _history: SublimeExperience[];
  private _sublimeThreshold: number;
  private _egoBoundary: number;
  private _scaleSensitivity: number;
  private _timeStep: number;

  constructor() {
    this._magnitude = 0;
    this._terror = 0;
    this._pleasure = 0;
    this._awe = 0;
    this._transcendence = 0;
    this._dimensions = [
      { name: 'vastness', intensity: 0.5, valence: 0.7, contribution: 0.2 },
      { name: 'infinity', intensity: 0.3, valence: 0.6, contribution: 0.15 },
      { name: 'power', intensity: 0.6, valence: 0.4, contribution: 0.2 },
      { name: 'novelty', intensity: 0.4, valence: 0.8, contribution: 0.15 },
      { name: 'complexity', intensity: 0.5, valence: 0.5, contribution: 0.15 },
      { name: 'beauty', intensity: 0.3, valence: 0.9, contribution: 0.15 }
    ];
    this._history = [];
    this._sublimeThreshold = 0.6;
    this._egoBoundary = 0.8;
    this._scaleSensitivity = 1.0;
    this._timeStep = 0;
  }

  get magnitude(): number { return this._magnitude; }
  get terror(): number { return this._terror; }
  get pleasure(): number { return this._pleasure; }
  get awe(): number { return this._awe; }
  get transcendence(): number { return this._transcendence; }
  get sublimeThreshold(): number { return this._sublimeThreshold; }
  get egoBoundary(): number { return this._egoBoundary; }
  get scaleSensitivity(): number { return this._scaleSensitivity; }

  public setSublimeThreshold(threshold: number): void {
    this._sublimeThreshold = Math.max(0, Math.min(1, threshold));
  }

  public setEgoBoundary(boundary: number): void {
    this._egoBoundary = Math.max(0, Math.min(1, boundary));
  }

  public setScaleSensitivity(sensitivity: number): void {
    this._scaleSensitivity = Math.max(0, sensitivity);
  }

  public setDimension(name: string, intensity: number, valence: number): void {
    const dim = this._dimensions.find(d => d.name === name);
    if (dim) {
      dim.intensity = Math.max(0, Math.min(1, intensity));
      dim.valence = Math.max(0, Math.min(1, valence));
    }
  }

  public triggerSublime(trigger: SublimeTrigger): SublimeExperience {
    this._timeStep++;

    let totalMagnitude = 0;
    let totalTerror = 0;
    let totalPleasure = 0;

    const scaleEffect = Math.tanh(trigger.scale * this._scaleSensitivity * 0.5);
    const complexityEffect = Math.tanh(trigger.complexity * 0.5);
    const noveltyEffect = Math.tanh(trigger.novelty * 0.7);

    for (const dim of this._dimensions) {
      const activation = dim.intensity * scaleEffect * (0.5 + 0.5 * complexityEffect) * (0.7 + 0.3 * noveltyEffect);
      const magnitude = activation * dim.contribution;
      totalMagnitude += magnitude;
      totalTerror += magnitude * (1 - dim.valence);
      totalPleasure += magnitude * dim.valence;
    }

    const typeMultipliers: { [key: string]: number } = {
      natural: 1.0,
      artistic: 0.8,
      mathematical: 0.7,
      cosmic: 1.5,
      moral: 0.9
    };
    const typeMult = typeMultipliers[trigger.type] || 1;
    totalMagnitude *= typeMult;
    totalTerror *= typeMult;
    totalPleasure *= typeMult;

    this._magnitude = Math.min(1, totalMagnitude);
    this._terror = Math.min(1, totalTerror);
    this._pleasure = Math.min(1, totalPleasure);

    this._awe = this._calculateAwe();
    this._transcendence = this._calculateTranscendence();

    const experience: SublimeExperience = {
      magnitude: this._magnitude,
      terror: this._terror,
      pleasure: this._pleasure,
      awe: this._awe,
      transcendence: this._transcendence,
      overwhelm: this._calculateOverwhelm(),
      elevation: this._calculateElevation(),
      timestamp: this._timeStep
    };

    this._history.push(experience);
    return experience;
  }

  private _calculateAwe(): number {
    if (this._magnitude < this._sublimeThreshold) {
      return this._magnitude * 0.3;
    }
    const terrorPleasureMix = this._terror * 0.4 + this._pleasure * 0.6;
    return Math.min(1, this._magnitude * 0.6 + terrorPleasureMix * 0.4);
  }

  private _calculateTranscendence(): number {
    if (this._magnitude < this._sublimeThreshold) return 0;
    const egoDissolution = Math.max(0, (this._magnitude - this._egoBoundary) / Math.max(1 - this._egoBoundary, 0.01));
    const unity = this._magnitude * this._pleasure;
    return Math.min(1, egoDissolution * 0.5 + unity * 0.5);
  }

  private _calculateOverwhelm(): number {
    return Math.min(1, this._magnitude * this._terror);
  }

  private _calculateElevation(): number {
    return Math.min(1, this._awe * this._pleasure * (1 - this._terror * 0.5));
  }

  public getTranscendenceState(): TranscendenceState {
    const t = this._transcendence;
    return {
      egoDissolution: t * 0.8,
      unityExperience: t * 0.9,
      timelessness: t * 0.7,
      ineffability: t * 0.85
    };
  }

  public naturalSublime(scale: number, danger: number = 0.3): SublimeExperience {
    return this.triggerSublime({
      type: 'natural',
      scale,
      complexity: 0.6,
      novelty: 0.5
    });
  }

  public mathematicalSublime(
    depth: number,
    elegance: number = 0.7
  ): SublimeExperience {
    return this.triggerSublime({
      type: 'mathematical',
      scale: depth,
      complexity: elegance,
      novelty: 0.4
    });
  }

  public cosmicSublime(distance: number): SublimeExperience {
    const scale = Math.log10(1 + distance);
    return this.triggerSublime({
      type: 'cosmic',
      scale,
      complexity: 0.8,
      novelty: 0.9
    });
  }

  public artisticSublime(complexity: number, novelty: number): SublimeExperience {
    return this.triggerSublime({
      type: 'artistic',
      scale: 0.7,
      complexity,
      novelty
    });
  }

  public moralSublime(virtue: number, sacrifice: number): SublimeExperience {
    return this.triggerSublime({
      type: 'moral',
      scale: virtue,
      complexity: sacrifice,
      novelty: 0.3
    });
  }

  public sublimeDecay(dt: number = 1): void {
    const decayRate = 0.1 * dt;
    this._magnitude = Math.max(0, this._magnitude - decayRate);
    this._terror = Math.max(0, this._terror - decayRate * 1.2);
    this._pleasure = Math.max(0, this._pleasure - decayRate * 0.8);
    this._awe = this._calculateAwe();
    this._transcendence = this._calculateTranscendence();
  }

  public isSublime(): boolean {
    return this._magnitude >= this._sublimeThreshold;
  }

  public sublimeIntensity(): number {
    return Math.max(0, (this._magnitude - this._sublimeThreshold) / (1 - this._sublimeThreshold));
  }

  public terrorPleasureRatio(): number {
    if (this._terror + this._pleasure === 0) return 0.5;
    return this._terror / (this._terror + this._pleasure);
  }

  public dynamicSublime(steps: number, baseScale: number = 0.5): SublimeExperience[] {
    const experiences: SublimeExperience[] = [];
    for (let i = 0; i < steps; i++) {
      const oscillation = Math.sin(i * 0.3) * 0.2;
      const scale = baseScale + oscillation;
      const exp = this.triggerSublime({
        type: 'natural',
        scale,
        complexity: 0.5 + 0.3 * Math.sin(i * 0.2),
        novelty: 0.4 + 0.2 * Math.cos(i * 0.15)
      });
      experiences.push(exp);
    }
    return experiences;
  }

  public calculateKantianSublime(): { mathematical: number; dynamical: number } {
    const mathematical = this._dimensions.find(d => d.name === 'infinity')?.intensity || 0;
    const dynamical = this._dimensions.find(d => d.name === 'power')?.intensity || 0;
    return {
      mathematical: mathematical * this._magnitude,
      dynamical: dynamical * this._magnitude
    };
  }

  public sublimeToPacket(): DataPacket<Signal> {
    return {
      id: `sublime-${Date.now()}`,
      payload: {
        source: 'sublime-engine',
        magnitude: this._awe,
        entropy: this._terror,
        timestamp: Date.now()
      },
      metadata: {
        createdAt: Date.now(),
        route: ['aesthetics', 'sublime'],
        priority: 0.8,
        phase: 'transcendence'
      }
    };
  }

  public reset(): void {
    this._magnitude = 0;
    this._terror = 0;
    this._pleasure = 0;
    this._awe = 0;
    this._transcendence = 0;
    this._history = [];
    this._timeStep = 0;
  }

  public getHistory(): SublimeExperience[] {
    return [...this._history];
  }

  public getDimensions(): SublimeDimension[] {
    return this._dimensions.map(d => ({ ...d }));
  }
}
