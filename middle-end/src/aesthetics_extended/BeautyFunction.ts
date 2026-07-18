import { DataPacket, Signal } from '../shared/types';

export interface BeautyComponents {
  symmetry: number;
  proportion: number;
  harmony: number;
  contrast: number;
  complexity: number;
  novelty: number;
  totalBeauty: number;
}

export interface BeautyDimension {
  name: string;
  weight: number;
  value: number;
  contribution: number;
  idealValue: number;
}

export interface BeautyFunctionParams {
  goldenRatioWeight: number;
  symmetryWeight: number;
  complexityOptimum: number;
  noveltyBonus: number;
  harmonyDecay: number;
}

export interface BeautyProfile {
  id: string;
  name: string;
  dimensions: BeautyDimension[];
  totalScore: number;
  category: string;
}

export class BeautyFunction {
  private _dimensions: BeautyDimension[];
  private _totalBeauty: number;
  private _params: BeautyFunctionParams;
  private _profiles: Map<string, BeautyProfile>;
  private _history: BeautyComponents[];
  private _timeStep: number;
  private _tasteDrift: number;
  private _familiarityBias: number;

  constructor() {
    this._dimensions = [
      { name: 'symmetry', weight: 0.15, value: 0.5, contribution: 0, idealValue: 1.0 },
      { name: 'proportion', weight: 0.2, value: 0.5, contribution: 0, idealValue: 0.618 },
      { name: 'harmony', weight: 0.2, value: 0.5, contribution: 0, idealValue: 1.0 },
      { name: 'contrast', weight: 0.15, value: 0.5, contribution: 0, idealValue: 0.7 },
      { name: 'complexity', weight: 0.15, value: 0.5, contribution: 0, idealValue: 0.5 },
      { name: 'novelty', weight: 0.15, value: 0.5, contribution: 0, idealValue: 0.6 }
    ];
    this._totalBeauty = 0;
    this._params = {
      goldenRatioWeight: 0.3,
      symmetryWeight: 0.2,
      complexityOptimum: 0.5,
      noveltyBonus: 0.15,
      harmonyDecay: 0.1
    };
    this._profiles = new Map();
    this._history = [];
    this._timeStep = 0;
    this._tasteDrift = 0.01;
    this._familiarityBias = 0.1;
  }

  get totalBeauty(): number { return this._totalBeauty; }
  get tasteDrift(): number { return this._tasteDrift; }
  get familiarityBias(): number { return this._familiarityBias; }
  get parameters(): BeautyFunctionParams { return { ...this._params }; }

  public setParameters(params: Partial<BeautyFunctionParams>): void {
    this._params = { ...this._params, ...params };
  }

  public setTasteDrift(drift: number): void {
    this._tasteDrift = Math.max(0, drift);
  }

  public setFamiliarityBias(bias: number): void {
    this._familiarityBias = Math.max(0, Math.min(1, bias));
  }

  public setDimension(name: string, weight: number, idealValue: number): void {
    const dim = this._dimensions.find(d => d.name === name);
    if (dim) {
      dim.weight = Math.max(0, weight);
      dim.idealValue = Math.max(0, Math.min(1, idealValue));
      this._normalizeWeights();
    }
  }

  private _normalizeWeights(): void {
    const total = this._dimensions.reduce((s, d) => s + d.weight, 0);
    if (total > 0) {
      for (const d of this._dimensions) {
        d.weight /= total;
      }
    }
  }

  public evaluate(components: Partial<BeautyComponents>): BeautyComponents {
    this._timeStep++;

    for (const dim of this._dimensions) {
      const key = dim.name as keyof BeautyComponents;
      if (components[key] !== undefined) {
        dim.value = Math.max(0, Math.min(1, components[key] as number));
      }
    }

    let total = 0;
    for (const dim of this._dimensions) {
      const distance = Math.abs(dim.value - dim.idealValue);
      const quality = 1 - distance;
      dim.contribution = quality * dim.weight;
      total += dim.contribution;
    }

    const goldenBonus = this._goldenRatioBonus(components.proportion || 0.5);
    const complexityBonus = this._invertedU(components.complexity || 0.5, this._params.complexityOptimum);
    const noveltyBonus = (components.novelty || 0) * this._params.noveltyBonus;

    total = total * (1 + goldenBonus * this._params.goldenRatioWeight + complexityBonus * 0.2 + noveltyBonus);
    this._totalBeauty = Math.max(0, Math.min(1, total));

    const result: BeautyComponents = {
      symmetry: this._dimensions[0].value,
      proportion: this._dimensions[1].value,
      harmony: this._dimensions[2].value,
      contrast: this._dimensions[3].value,
      complexity: this._dimensions[4].value,
      novelty: this._dimensions[5].value,
      totalBeauty: this._totalBeauty
    };

    this._history.push(result);
    return result;
  }

  private _goldenRatioBonus(proportion: number): number {
    const phi = (1 + Math.sqrt(5)) / 2;
    const normalizedProportion = proportion * 1.5 + 0.5;
    const distance = Math.abs(normalizedProportion - phi) / phi;
    return Math.max(0, 1 - distance * 2);
  }

  private _invertedU(value: number, optimum: number): number {
    const width = 0.5;
    const distance = Math.abs(value - optimum) / width;
    return Math.exp(-distance * distance);
  }

  public createProfile(id: string, name: string, category: string, scores: Partial<BeautyComponents>): BeautyProfile {
    const evaluation = this.evaluate(scores);
    const profile: BeautyProfile = {
      id,
      name,
      category,
      dimensions: this._dimensions.map(d => ({ ...d })),
      totalScore: evaluation.totalBeauty
    };
    this._profiles.set(id, profile);
    return profile;
  }

  public getProfile(id: string): BeautyProfile | undefined {
    const p = this._profiles.get(id);
    return p ? { ...p, dimensions: p.dimensions.map(d => ({ ...d })) } : undefined;
  }

  public compareProfiles(id1: string, id2: string): { similarity: number; preference: number; winner: string | null } {
    const p1 = this._profiles.get(id1);
    const p2 = this._profiles.get(id2);
    if (!p1 || !p2) return { similarity: 0, preference: 0, winner: null };

    let similarity = 0;
    for (let i = 0; i < p1.dimensions.length; i++) {
      const diff = Math.abs(p1.dimensions[i].value - p2.dimensions[i].value);
      similarity += (1 - diff) * p1.dimensions[i].weight;
    }

    const preference = p1.totalScore - p2.totalScore;
    const winner = preference > 0.01 ? id1 : preference < -0.01 ? id2 : null;

    return { similarity, preference, winner };
  }

  public aestheticDistance(p1: BeautyComponents, p2: BeautyComponents): number {
    let distance = 0;
    const dims = ['symmetry', 'proportion', 'harmony', 'contrast', 'complexity', 'novelty'] as const;
    for (const dim of dims) {
      distance += (p1[dim] - p2[dim]) ** 2;
    }
    return Math.sqrt(distance / dims.length);
  }

  public beautyLandscape(resolution: number = 20): number[][] {
    const landscape: number[][] = [];
    for (let i = 0; i <= resolution; i++) {
      const row: number[] = [];
      for (let j = 0; j <= resolution; j++) {
        const complexity = i / resolution;
        const symmetry = j / resolution;
        const result = this.evaluate({ complexity, symmetry });
        row.push(result.totalBeauty);
      }
      landscape.push(row);
    }
    return landscape;
  }

  public findOptimalBeauty(): BeautyComponents {
    let bestScore = 0;
    let bestComponents: BeautyComponents = this.evaluate({});

    const steps = 10;
    const dimNames = ['symmetry', 'proportion', 'harmony', 'contrast', 'complexity', 'novelty'] as const;

    function search(index: number, current: Partial<BeautyComponents>): void {
      if (index >= dimNames.length) {
        const result = new BeautyFunction();
        const evalResult = result.evaluate(current);
        if (evalResult.totalBeauty > bestScore) {
          bestScore = evalResult.totalBeauty;
          bestComponents = evalResult;
        }
        return;
      }
      for (let v = 0; v <= steps; v++) {
        const value = v / steps;
        search(index + 1, { ...current, [dimNames[index]]: value });
      }
    }

    search(0, {});
    return bestComponents;
  }

  public familiarityEffect(exposureCount: number): number {
    const saturation = 1 - Math.exp(-exposureCount * 0.1);
    const boost = saturation * this._familiarityBias;
    return boost;
  }

  public tasteEvolution(generations: number): BeautyComponents[] {
    const evolution: BeautyComponents[] = [];
    let current = this.evaluate({});

    for (let g = 0; g < generations; g++) {
      const newComponents: Partial<BeautyComponents> = {};
      const dimNames = ['symmetry', 'proportion', 'harmony', 'contrast', 'complexity', 'novelty'] as const;
      for (const dim of dimNames) {
        const currentValue = (current as any)[dim];
        const drift = (Math.random() * 2 - 1) * this._tasteDrift;
        newComponents[dim] = Math.max(0, Math.min(1, currentValue + drift));
      }
      current = this.evaluate(newComponents);
      evolution.push(current);
    }

    return evolution;
  }

  public weberFechner(intensity: number): number {
    return Math.log(1 + intensity);
  }

  public stevensPowerLaw(intensity: number, exponent: number = 0.7): number {
    return Math.pow(intensity, exponent);
  }

  public calculateHaloEffect(primaryTrait: number, haloStrength: number = 0.3): number {
    return primaryTrait * (1 + haloStrength);
  }

  public beautyToPacket(): DataPacket<Signal> {
    return {
      id: `beauty-${Date.now()}`,
      payload: {
        source: 'beauty-function',
        magnitude: this._totalBeauty,
        entropy: 1 - this._totalBeauty,
        timestamp: Date.now()
      },
      metadata: {
        createdAt: Date.now(),
        route: ['aesthetics', 'beauty'],
        priority: 0.7,
        phase: 'appreciation'
      }
    };
  }

  public reset(): void {
    for (const d of this._dimensions) {
      d.value = 0.5;
      d.contribution = 0;
    }
    this._totalBeauty = 0;
    this._profiles.clear();
    this._history = [];
    this._timeStep = 0;
  }

  public getHistory(): BeautyComponents[] {
    return [...this._history];
  }

  public getDimensions(): BeautyDimension[] {
    return this._dimensions.map(d => ({ ...d }));
  }

  public getAllProfiles(): BeautyProfile[] {
    return Array.from(this._profiles.values()).map(p => ({
      ...p,
      dimensions: p.dimensions.map(d => ({ ...d }))
    }));
  }
}
