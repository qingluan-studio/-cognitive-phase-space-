import { KnowledgeUnit, DataPacket, Signal } from '../shared/types';

export type FlavorDimension = 'sweet' | 'sour' | 'salty' | 'bitter' | 'umami' | 'spicy' | 'astringent';

export interface DataFlavor {
  id: string;
  dimensions: Record<FlavorDimension, number>;
  intensity: number;
  complexity: number;
  balance: number;
  aftertaste: string[];
}

export interface FlavorProfile {
  id: string;
  name: string;
  baseNotes: FlavorDimension[];
  topNotes: FlavorDimension[];
  heartNotes: FlavorDimension[];
  description: string;
}

export interface SynthesisResult {
  flavorId: string;
  sourceUnits: string[];
  flavor: DataFlavor;
  harmonyScore: number;
  noveltyIndex: number;
  synthesisTime: number;
}

export interface FlavorPalette {
  id: string;
  name: string;
  flavors: Map<string, DataFlavor>;
  colorSpace: string;
}

export class FlavorSynthesizer {
  private _palettes: Map<string, FlavorPalette>;
  private _currentPalette: string | null;
  private _synthesisHistory: SynthesisResult[];
  private _flavorMemory: Map<string, DataFlavor>;
  private _harmonyMatrix: number[][];
  private _synthesisPrecision: number;

  constructor(synthesisPrecision: number = 0.01) {
    this._palettes = new Map();
    this._currentPalette = null;
    this._synthesisHistory = [];
    this._flavorMemory = new Map();
    this._harmonyMatrix = this._createHarmonyMatrix();
    this._synthesisPrecision = synthesisPrecision;
  }

  get paletteCount(): number { return this._palettes.size; }
  get currentPalette(): string | null { return this._currentPalette; }
  get synthesisCount(): number { return this._synthesisHistory.length; }
  get flavorMemorySize(): number { return this._flavorMemory.size; }

  public createPalette(id: string, name: string): void {
    const palette: FlavorPalette = {
      id,
      name,
      flavors: new Map(),
      colorSpace: 'flavor-rgb'
    };
    this._palettes.set(id, palette);
    if (!this._currentPalette) {
      this._currentPalette = id;
    }
  }

  public selectPalette(paletteId: string): boolean {
    if (this._palettes.has(paletteId)) {
      this._currentPalette = paletteId;
      return true;
    }
    return false;
  }

  public extractFlavor(unit: KnowledgeUnit): DataFlavor {
    const cached = this._flavorMemory.get(unit.id);
    if (cached) return cached;

    const dimensions = this._extractDimensions(unit);
    const intensity = this._calculateIntensity(dimensions);
    const complexity = this._calculateComplexity(dimensions);
    const balance = this._calculateBalance(dimensions);
    const aftertaste = this._deriveAftertaste(unit);

    const flavor: DataFlavor = {
      id: `flavor-${unit.id}`,
      dimensions,
      intensity,
      complexity,
      balance,
      aftertaste
    };

    this._flavorMemory.set(unit.id, flavor);
    return flavor;
  }

  public addFlavorToPalette(paletteId: string, flavor: DataFlavor): void {
    const palette = this._palettes.get(paletteId);
    if (palette) {
      palette.flavors.set(flavor.id, flavor);
    }
  }

  public synthesize(flavorIds: string[], paletteId?: string): SynthesisResult {
    const pid = paletteId || this._currentPalette;
    const palette = pid ? this._palettes.get(pid) : null;

    const flavors: DataFlavor[] = [];
    for (const fid of flavorIds) {
      const f = this._flavorMemory.get(fid);
      if (f) flavors.push(f);
      else if (palette) {
        const pf = palette.flavors.get(fid);
        if (pf) flavors.push(pf);
      }
    }

    if (flavors.length === 0) {
      return this._emptyResult(flavorIds);
    }

    const startTime = Date.now();
    const blended = this._blendFlavors(flavors);
    const harmonyScore = this._calculateHarmony(flavors);
    const noveltyIndex = this._calculateNovelty(blended);

    const result: SynthesisResult = {
      flavorId: `synth-${Date.now()}`,
      sourceUnits: flavorIds,
      flavor: blended,
      harmonyScore,
      noveltyIndex,
      synthesisTime: Date.now() - startTime
    };

    this._synthesisHistory.push(result);
    this._flavorMemory.set(result.flavorId, blended);
    return result;
  }

  public createFlavorProfile(id: string, name: string, units: KnowledgeUnit[]): FlavorProfile {
    const flavors = units.map(u => this.extractFlavor(u));
    const dominant = this._findDominantDimensions(flavors);
    const baseNotes = dominant.slice(0, 2);
    const heartNotes = dominant.slice(2, 5);
    const topNotes = dominant.slice(5, 7);

    return {
      id,
      name,
      baseNotes,
      heartNotes,
      topNotes,
      description: this._generateFlavorDescription(flavors, baseNotes, heartNotes, topNotes)
    };
  }

  public compareFlavors(flavorA: string, flavorB: string): number {
    const a = this._flavorMemory.get(flavorA);
    const b = this._flavorMemory.get(flavorB);
    if (!a || !b) return 0;
    return this._flavorDistance(a, b);
  }

  public findHarmoniousFlavors(targetFlavorId: string, count: number = 5): string[] {
    const target = this._flavorMemory.get(targetFlavorId);
    if (!target) return [];

    const scores: { id: string; score: number }[] = [];
    for (const [id, flavor] of this._flavorMemory) {
      if (id === targetFlavorId) continue;
      const harmony = this._pairHarmony(target, flavor);
      scores.push({ id, score: harmony });
    }

    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, count)
      .map(s => s.id);
  }

  public amplifyFlavor(flavorId: string, dimension: FlavorDimension, factor: number): DataFlavor | null {
    const flavor = this._flavorMemory.get(flavorId);
    if (!flavor) return null;

    const amplified: DataFlavor = {
      ...flavor,
      id: `${flavorId}-amp-${dimension}`,
      dimensions: {
        ...flavor.dimensions,
        [dimension]: Math.min(1, flavor.dimensions[dimension] * factor)
      }
    };
    amplified.intensity = this._calculateIntensity(amplified.dimensions);
    amplified.balance = this._calculateBalance(amplified.dimensions);

    this._flavorMemory.set(amplified.id, amplified);
    return amplified;
  }

  public getFlavorWheel(paletteId?: string): { dimension: FlavorDimension; value: number }[] {
    const pid = paletteId || this._currentPalette;
    const palette = pid ? this._palettes.get(pid) : null;
    const flavors = palette ? Array.from(palette.flavors.values()) : Array.from(this._flavorMemory.values());

    const dimensions: FlavorDimension[] = ['sweet', 'sour', 'salty', 'bitter', 'umami', 'spicy', 'astringent'];
    return dimensions.map(d => ({
      dimension: d,
      value: flavors.reduce((sum, f) => sum + f.dimensions[d], 0) / Math.max(1, flavors.length)
    }));
  }

  public signalToFlavor(signal: Signal): DataFlavor {
    const dimensions: Record<FlavorDimension, number> = {
      sweet: Math.min(1, signal.magnitude * 0.3 + signal.entropy * 0.1),
      sour: Math.min(1, signal.entropy * 0.4),
      salty: Math.min(1, Math.abs(signal.magnitude - 0.5) * 0.5),
      bitter: Math.min(1, (1 - signal.magnitude) * 0.3),
      umami: Math.min(1, signal.magnitude * 0.5),
      spicy: Math.min(1, signal.entropy * 0.6),
      astringent: Math.min(1, Math.abs(0.3 - signal.entropy) * 0.8)
    };

    return {
      id: `flavor-signal-${signal.timestamp}`,
      dimensions,
      intensity: signal.magnitude,
      complexity: signal.entropy,
      balance: 1 - Math.abs(signal.magnitude - signal.entropy),
      aftertaste: [signal.source]
    };
  }

  private _extractDimensions(unit: KnowledgeUnit): Record<FlavorDimension, number> {
    const vec = unit.vector || [];
    const dimensions: Record<FlavorDimension, number> = {
      sweet: this._sig(vec[0] || 0),
      sour: this._sig(vec[1] || 0),
      salty: this._sig(vec[2] || 0),
      bitter: this._sig(vec[3] || 0),
      umami: this._sig(vec[4] || 0.5),
      spicy: this._sig(vec[5] || 0),
      astringent: this._sig(vec[6] || 0.3)
    };
    return dimensions;
  }

  private _sig(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  private _calculateIntensity(dimensions: Record<FlavorDimension, number>): number {
    const values = Object.values(dimensions);
    return Math.sqrt(values.reduce((s, v) => s + v * v, 0) / values.length);
  }

  private _calculateComplexity(dimensions: Record<FlavorDimension, number>): number {
    const values = Object.values(dimensions);
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + (v - mean) * (v - mean), 0) / values.length;
    return Math.min(1, Math.sqrt(variance) * 2);
  }

  private _calculateBalance(dimensions: Record<FlavorDimension, number>): number {
    const values = Object.values(dimensions);
    const sorted = [...values].sort((a, b) => a - b);
    const range = sorted[sorted.length - 1] - sorted[0];
    return 1 - range;
  }

  private _deriveAftertaste(unit: KnowledgeUnit): string[] {
    const aftertastes: string[] = [];
    if (unit.content.length > 50) aftertastes.push('lingering');
    if (unit.lineage.length > 3) aftertastes.push('heritage');
    if (unit.vector && unit.vector.length > 10) aftertastes.push('layered');
    if (unit.id.includes('archaic')) aftertastes.push('ancient');
    if (aftertastes.length === 0) aftertastes.push('clean');
    return aftertastes;
  }

  private _blendFlavors(flavors: DataFlavor[]): DataFlavor {
    const dimensions: Record<FlavorDimension, number> = {
      sweet: 0, sour: 0, salty: 0, bitter: 0, umami: 0, spicy: 0, astringent: 0
    };

    let totalWeight = 0;
    for (const flavor of flavors) {
      const weight = flavor.intensity;
      for (const dim of Object.keys(dimensions) as FlavorDimension[]) {
        dimensions[dim] += flavor.dimensions[dim] * weight;
      }
      totalWeight += weight;
    }

    for (const dim of Object.keys(dimensions) as FlavorDimension[]) {
      dimensions[dim] = Math.min(1, dimensions[dim] / Math.max(1, totalWeight));
    }

    const aftertaste = [...new Set(flavors.flatMap(f => f.aftertaste))];

    return {
      id: `blend-${Date.now()}`,
      dimensions,
      intensity: this._calculateIntensity(dimensions),
      complexity: this._calculateComplexity(dimensions),
      balance: this._calculateBalance(dimensions),
      aftertaste
    };
  }

  private _calculateHarmony(flavors: DataFlavor[]): number {
    if (flavors.length < 2) return 1;

    let totalHarmony = 0;
    let pairs = 0;

    for (let i = 0; i < flavors.length; i++) {
      for (let j = i + 1; j < flavors.length; j++) {
        totalHarmony += this._pairHarmony(flavors[i], flavors[j]);
        pairs++;
      }
    }

    return totalHarmony / Math.max(1, pairs);
  }

  private _pairHarmony(a: DataFlavor, b: DataFlavor): number {
    const dims: FlavorDimension[] = ['sweet', 'sour', 'salty', 'bitter', 'umami', 'spicy', 'astringent'];
    let harmony = 0;

    for (let i = 0; i < dims.length; i++) {
      for (let j = 0; j < dims.length; j++) {
        harmony += a.dimensions[dims[i]] * b.dimensions[dims[j]] * this._harmonyMatrix[i][j];
      }
    }

    return Math.min(1, Math.max(0, harmony));
  }

  private _createHarmonyMatrix(): number[][] {
    const n = 7;
    const matrix: number[][] = [];
    for (let i = 0; i < n; i++) {
      matrix[i] = [];
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 0.3;
        } else {
          const distance = Math.abs(i - j);
          matrix[i][j] = Math.max(0, 0.8 - distance * 0.15) / n;
        }
      }
    }
    return matrix;
  }

  private _calculateNovelty(flavor: DataFlavor): number {
    if (this._flavorMemory.size === 0) return 1;

    let minDistance = Infinity;
    for (const existing of this._flavorMemory.values()) {
      const dist = this._flavorDistance(flavor, existing);
      minDistance = Math.min(minDistance, dist);
    }

    return Math.min(1, minDistance);
  }

  private _flavorDistance(a: DataFlavor, b: DataFlavor): number {
    const dims: FlavorDimension[] = ['sweet', 'sour', 'salty', 'bitter', 'umami', 'spicy', 'astringent'];
    let sumSq = 0;
    for (const dim of dims) {
      sumSq += Math.pow(a.dimensions[dim] - b.dimensions[dim], 2);
    }
    return Math.sqrt(sumSq / dims.length);
  }

  private _findDominantDimensions(flavors: DataFlavor[]): FlavorDimension[] {
    const dims: FlavorDimension[] = ['sweet', 'sour', 'salty', 'bitter', 'umami', 'spicy', 'astringent'];
    const avg: Record<string, number> = {};

    for (const dim of dims) {
      avg[dim] = flavors.reduce((s, f) => s + f.dimensions[dim], 0) / Math.max(1, flavors.length);
    }

    return dims.sort((a, b) => avg[b] - avg[a]);
  }

  private _generateFlavorDescription(
    flavors: DataFlavor[],
    baseNotes: FlavorDimension[],
    heartNotes: FlavorDimension[],
    topNotes: FlavorDimension[]
  ): string {
    const parts: string[] = [];
    if (baseNotes.length > 0) {
      parts.push(`Base: ${baseNotes.join(', ')}`);
    }
    if (heartNotes.length > 0) {
      parts.push(`Heart: ${heartNotes.join(', ')}`);
    }
    if (topNotes.length > 0) {
      parts.push(`Top: ${topNotes.join(', ')}`);
    }
    return parts.join(' | ');
  }

  private _emptyResult(flavorIds: string[]): SynthesisResult {
    return {
      flavorId: 'empty',
      sourceUnits: flavorIds,
      flavor: {
        id: 'empty',
        dimensions: { sweet: 0, sour: 0, salty: 0, bitter: 0, umami: 0, spicy: 0, astringent: 0 },
        intensity: 0,
        complexity: 0,
        balance: 0,
        aftertaste: []
      },
      harmonyScore: 0,
      noveltyIndex: 0,
      synthesisTime: 0
    };
  }

  public processPacket(packet: DataPacket<KnowledgeUnit[]>): DataPacket<SynthesisResult> {
    const paletteId = packet.metadata.phase;
    if (!this._palettes.has(paletteId)) {
      this.createPalette(paletteId, `Palette-${paletteId}`);
    }

    const flavorIds: string[] = [];
    for (const ku of packet.payload) {
      const flavor = this.extractFlavor(ku);
      this.addFlavorToPalette(paletteId, flavor);
      flavorIds.push(flavor.id);
    }

    const result = this.synthesize(flavorIds, paletteId);
    return {
      id: `flavored-${packet.id}`,
      payload: result,
      metadata: {
        ...packet.metadata,
        route: [...packet.metadata.route, 'FlavorSynthesizer']
      }
    };
  }

  public exportPalette(paletteId: string): { id: string; name: string; flavors: DataFlavor[] } | null {
    const palette = this._palettes.get(paletteId);
    if (!palette) return null;
    return {
      id: palette.id,
      name: palette.name,
      flavors: Array.from(palette.flavors.values())
    };
  }

  public reset(): void {
    this._palettes.clear();
    this._currentPalette = null;
    this._synthesisHistory = [];
    this._flavorMemory.clear();
  }
}
