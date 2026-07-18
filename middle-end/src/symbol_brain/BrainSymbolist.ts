import { KnowledgeUnit, Signal, DataPacket } from '../shared/types';

export interface NeuralCorrelate {
  region: string;
  hemisphere: 'left' | 'right' | 'bilateral';
  activationLevel: number;
  latency: number;
  frequencyBand: 'delta' | 'theta' | 'alpha' | 'beta' | 'gamma';
  coherence: number;
}

export interface SymbolNeuralMapping {
  symbolId: string;
  symbol: string;
  correlates: NeuralCorrelate[];
  encodingStrength: number;
  retrievalTime: number;
  consolidationLevel: number;
  emotionalTag: number;
}

export interface HemisphericLateralization {
  leftDominance: number;
  rightDominance: number;
  integratedRegions: string[];
  corpusCallosumFlow: number;
}

export interface SymbolicInterpretation {
  id: string;
  symbol: string;
  neuralPattern: string[];
  cognitiveLayer: string;
  meaningHypothesis: string;
  confidence: number;
  supportingRegions: string[];
  conflictingRegions: string[];
}

export interface NeuralAssembly {
  id: string;
  members: string[];
  firingThreshold: number;
  bindingStrength: number;
  associatedSymbols: string[];
}

export interface IBrainSymbolist {
  mappingCount: number;
  addMapping(mapping: SymbolNeuralMapping): void;
  getMapping(symbolId: string): SymbolNeuralMapping | undefined;
  interpretSymbol(symbolId: string): SymbolicInterpretation | null;
  computeLateralization(symbolId: string): HemisphericLateralization;
  findSharedRegions(symbolIds: string[]): string[];
  buildNeuralAssembly(symbolIds: string[]): NeuralAssembly | null;
  predictActivation(symbol: string, context: string[]): NeuralCorrelate[];
  compareNeuralPatterns(symbolA: string, symbolB: string): number;
}

export class BrainSymbolist implements IBrainSymbolist {
  private _mappings: Map<string, SymbolNeuralMapping>;
  private _regionIndex: Map<string, string[]>;
  private _interpretationCache: Map<string, SymbolicInterpretation>;
  private _assemblies: NeuralAssembly[];
  private _neuralRegions: string[];
  private _cognitiveLayers: string[];
  private _maxCacheSize: number;

  constructor() {
    this._mappings = new Map();
    this._regionIndex = new Map();
    this._interpretationCache = new Map();
    this._assemblies = [];
    this._neuralRegions = [
      'prefrontal_cortex',
      'hippocampus',
      'amygdala',
      'temporal_lobe',
      'parietal_lobe',
      'occipital_lobe',
      'cerebellum',
      'basal_ganglia',
      'thalamus',
      'cingulate_cortex',
      'insula',
      'wernicke_area',
      'broca_area',
      'angular_gyrus',
      'fusiform_gyrus'
    ];
    this._cognitiveLayers = [
      'perceptual',
      'conceptual',
      'emotional',
      'procedural',
      'episodic',
      'semantic',
      'metacognitive'
    ];
    this._maxCacheSize = 200;
  }

  get mappingCount(): number { return this._mappings.size; }
  get regionCount(): number { return this._neuralRegions.length; }
  get assemblyCount(): number { return this._assemblies.length; }
  get knownRegions(): string[] { return [...this._neuralRegions]; }

  public addMapping(mapping: SymbolNeuralMapping): void {
    this._mappings.set(mapping.symbolId, {
      ...mapping,
      correlates: mapping.correlates.map(c => ({ ...c }))
    });
    for (const corr of mapping.correlates) {
      if (!this._regionIndex.has(corr.region)) {
        this._regionIndex.set(corr.region, []);
      }
      const list = this._regionIndex.get(corr.region)!;
      if (!list.includes(mapping.symbolId)) {
        list.push(mapping.symbolId);
      }
    }
    this._interpretationCache.clear();
  }

  public getMapping(symbolId: string): SymbolNeuralMapping | undefined {
    const m = this._mappings.get(symbolId);
    return m ? {
      ...m,
      correlates: m.correlates.map(c => ({ ...c }))
    } : undefined;
  }

  public interpretSymbol(symbolId: string): SymbolicInterpretation | null {
    const cached = this._interpretationCache.get(symbolId);
    if (cached) return { ...cached, supportingRegions: [...cached.supportingRegions], conflictingRegions: [...cached.conflictingRegions], neuralPattern: [...cached.neuralPattern] };
    const mapping = this._mappings.get(symbolId);
    if (!mapping) return null;
    const activeRegions = mapping.correlates.filter(c => c.activationLevel > 0.3);
    const activeRegionNames = activeRegions.map(r => r.region);
    let cognitiveLayer = this._classifyCognitiveLayer(activeRegionNames, mapping);
    let confidence = mapping.encodingStrength * 0.5 + (activeRegions.length / this._neuralRegions.length) * 0.3 + (1 - mapping.retrievalTime) * 0.2;
    confidence = Math.min(1, confidence);
    const supporting: string[] = [];
    const conflicting: string[] = [];
    for (const corr of mapping.correlates) {
      if (corr.activationLevel > 0.5) {
        supporting.push(corr.region);
      } else if (corr.activationLevel < 0.2 && corr.coherence > 0.5) {
        conflicting.push(corr.region);
      }
    }
    const hypothesis = this._generateHypothesis(mapping, activeRegionNames, cognitiveLayer);
    const interpretation: SymbolicInterpretation = {
      id: `interp-${symbolId}-${Date.now()}`,
      symbol: mapping.symbol,
      neuralPattern: activeRegionNames,
      cognitiveLayer,
      meaningHypothesis: hypothesis,
      confidence,
      supportingRegions: supporting,
      conflictingRegions: conflicting
    };
    if (this._interpretationCache.size >= this._maxCacheSize) {
      const firstKey = this._interpretationCache.keys().next().value;
      if (firstKey !== undefined) this._interpretationCache.delete(firstKey);
    }
    this._interpretationCache.set(symbolId, interpretation);
    return { ...interpretation, supportingRegions: [...interpretation.supportingRegions], conflictingRegions: [...interpretation.conflictingRegions], neuralPattern: [...interpretation.neuralPattern] };
  }

  private _classifyCognitiveLayer(regions: string[], mapping: SymbolNeuralMapping): string {
    if (regions.includes('occipital_lobe') || regions.includes('fusiform_gyrus')) {
      return 'perceptual';
    }
    if (mapping.emotionalTag > 0.6 || regions.includes('amygdala') || regions.includes('insula')) {
      return 'emotional';
    }
    if (regions.includes('hippocampus')) {
      return 'episodic';
    }
    if (regions.includes('wernicke_area') || regions.includes('broca_area') || regions.includes('temporal_lobe')) {
      return 'semantic';
    }
    if (regions.includes('prefrontal_cortex') || regions.includes('cingulate_cortex')) {
      return 'metacognitive';
    }
    if (regions.includes('basal_ganglia') || regions.includes('cerebellum')) {
      return 'procedural';
    }
    return 'conceptual';
  }

  private _generateHypothesis(mapping: SymbolNeuralMapping, regions: string[], layer: string): string {
    const emotionTag = mapping.emotionalTag > 0.5 ? ' emotionally-charged' : mapping.emotionalTag < 0.3 ? ' neutral' : ' mixed-emotion';
    const strengthDesc = mapping.encodingStrength > 0.7 ? 'strongly' : mapping.encodingStrength > 0.4 ? 'moderately' : 'weakly';
    return `${mapping.symbol} is ${strengthDesc} encoded at the ${layer} layer with${emotionTag} valence, involving ${regions.length} neural regions.`;
  }

  public computeLateralization(symbolId: string): HemisphericLateralization {
    const mapping = this._mappings.get(symbolId);
    if (!mapping) {
      return { leftDominance: 0.5, rightDominance: 0.5, integratedRegions: [], corpusCallosumFlow: 0 };
    }
    let leftActivation = 0;
    let rightActivation = 0;
    let bilateralCount = 0;
    const integrated: string[] = [];
    for (const corr of mapping.correlates) {
      if (corr.hemisphere === 'left') {
        leftActivation += corr.activationLevel;
      } else if (corr.hemisphere === 'right') {
        rightActivation += corr.activationLevel;
      } else {
        bilateralCount++;
        leftActivation += corr.activationLevel * 0.5;
        rightActivation += corr.activationLevel * 0.5;
        integrated.push(corr.region);
      }
    }
    const total = leftActivation + rightActivation;
    const leftDom = total > 0 ? leftActivation / total : 0.5;
    const rightDom = total > 0 ? rightActivation / total : 0.5;
    const ccFlow = mapping.correlates.length > 0 ? bilateralCount / mapping.correlates.length : 0;
    return {
      leftDominance: leftDom,
      rightDominance: rightDom,
      integratedRegions: integrated,
      corpusCallosumFlow: ccFlow
    };
  }

  public findSharedRegions(symbolIds: string[]): string[] {
    if (symbolIds.length === 0) return [];
    const regionSets: Set<string>[] = [];
    for (const id of symbolIds) {
      const mapping = this._mappings.get(id);
      if (mapping) {
        regionSets.push(new Set(mapping.correlates.map(c => c.region)));
      }
    }
    if (regionSets.length === 0) return [];
    const intersection = new Set(regionSets[0]);
    for (let i = 1; i < regionSets.length; i++) {
      for (const region of intersection) {
        if (!regionSets[i].has(region)) {
          intersection.delete(region);
        }
      }
    }
    return Array.from(intersection);
  }

  public buildNeuralAssembly(symbolIds: string[]): NeuralAssembly | null {
    if (symbolIds.length < 2) return null;
    const regionActivation = new Map<string, number>();
    for (const id of symbolIds) {
      const mapping = this._mappings.get(id);
      if (!mapping) continue;
      for (const corr of mapping.correlates) {
        const current = regionActivation.get(corr.region) || 0;
        regionActivation.set(corr.region, current + corr.activationLevel);
      }
    }
    if (regionActivation.size === 0) return null;
    const regions = Array.from(regionActivation.entries())
      .filter(([, v]) => v > 0.3)
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => k);
    let totalStrength = 0;
    for (const [, v] of regionActivation) {
      totalStrength += v;
    }
    const bindingStrength = Math.min(1, totalStrength / (symbolIds.length * 5));
    const threshold = 0.5 - bindingStrength * 0.3;
    const assembly: NeuralAssembly = {
      id: `assembly-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      members: regions,
      firingThreshold: threshold,
      bindingStrength,
      associatedSymbols: [...symbolIds]
    };
    this._assemblies.push(assembly);
    if (this._assemblies.length > 50) {
      this._assemblies.shift();
    }
    return { ...assembly, members: [...assembly.members], associatedSymbols: [...assembly.associatedSymbols] };
  }

  public predictActivation(symbol: string, context: string[]): NeuralCorrelate[] {
    const baseMapping = this._mappings.get(symbol);
    if (!baseMapping) {
      const predicted: NeuralCorrelate[] = [];
      for (let i = 0; i < 5; i++) {
        const region = this._neuralRegions[Math.floor(Math.random() * this._neuralRegions.length)];
        predicted.push({
          region,
          hemisphere: ['left', 'right', 'bilateral'][Math.floor(Math.random() * 3)] as 'left' | 'right' | 'bilateral',
          activationLevel: Math.random() * 0.5,
          latency: 100 + Math.random() * 300,
          frequencyBand: ['delta', 'theta', 'alpha', 'beta', 'gamma'][Math.floor(Math.random() * 5)] as NeuralCorrelate['frequencyBand'],
          coherence: Math.random()
        });
      }
      return predicted;
    }
    const contextBoost = new Map<string, number>();
    for (const ctx of context) {
      const ctxMapping = this._mappings.get(ctx);
      if (ctxMapping) {
        for (const corr of ctxMapping.correlates) {
          contextBoost.set(corr.region, (contextBoost.get(corr.region) || 0) + corr.activationLevel * 0.3);
        }
      }
    }
    const predicted: NeuralCorrelate[] = [];
    for (const corr of baseMapping.correlates) {
      const boost = contextBoost.get(corr.region) || 0;
      predicted.push({
        ...corr,
        activationLevel: Math.min(1, corr.activationLevel + boost),
        latency: corr.latency * (1 - boost * 0.2)
      });
    }
    return predicted;
  }

  public compareNeuralPatterns(symbolA: string, symbolB: string): number {
    const mapA = this._mappings.get(symbolA);
    const mapB = this._mappings.get(symbolB);
    if (!mapA || !mapB) return 0;
    const regionsA = new Map(mapA.correlates.map(c => [c.region, c.activationLevel]));
    const regionsB = new Map(mapB.correlates.map(c => [c.region, c.activationLevel]));
    const allRegions = new Set([...regionsA.keys(), ...regionsB.keys()]);
    let similarity = 0;
    let total = 0;
    for (const region of allRegions) {
      const a = regionsA.get(region) || 0;
      const b = regionsB.get(region) || 0;
      similarity += 1 - Math.abs(a - b);
      total++;
    }
    const patternSim = total > 0 ? similarity / total : 0;
    const strengthSim = 1 - Math.abs(mapA.encodingStrength - mapB.encodingStrength);
    const emotionSim = 1 - Math.abs(mapA.emotionalTag - mapB.emotionalTag);
    return patternSim * 0.6 + strengthSim * 0.2 + emotionSim * 0.2;
  }

  public findSymbolsByRegion(region: string, minActivation: number = 0.3): string[] {
    const symbols = this._regionIndex.get(region) || [];
    return symbols.filter(s => {
      const m = this._mappings.get(s);
      if (!m) return false;
      const corr = m.correlates.find(c => c.region === region);
      return corr ? corr.activationLevel >= minActivation : false;
    });
  }

  public toKnowledgeUnit(symbolId: string): KnowledgeUnit | null {
    const mapping = this._mappings.get(symbolId);
    if (!mapping) return null;
    const vector: number[] = [];
    vector.push(mapping.encodingStrength);
    vector.push(1 - mapping.retrievalTime);
    vector.push(mapping.consolidationLevel);
    vector.push(mapping.emotionalTag);
    for (const region of this._neuralRegions) {
      const corr = mapping.correlates.find(c => c.region === region);
      vector.push(corr ? corr.activationLevel : 0);
    }
    const lat = this.computeLateralization(symbolId);
    vector.push(lat.leftDominance);
    vector.push(lat.rightDominance);
    return {
      id: `bsymbolist-${symbolId}`,
      content: mapping.symbol,
      vector,
      lineage: ['neural-mapping', ...mapping.correlates.map(c => c.region)]
    };
  }

  public toSignal(symbolId: string): Signal | null {
    const mapping = this._mappings.get(symbolId);
    if (!mapping) return null;
    const totalActivation = mapping.correlates.reduce((s, c) => s + c.activationLevel, 0);
    return {
      source: `bsymbolist-${symbolId}`,
      magnitude: totalActivation / mapping.correlates.length,
      entropy: 1 - mapping.encodingStrength,
      timestamp: Date.now()
    };
  }

  public reset(): void {
    this._mappings.clear();
    this._regionIndex.clear();
    this._interpretationCache.clear();
    this._assemblies = [];
  }
}
