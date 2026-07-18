import { KnowledgeUnit, DataPacket, Signal } from '../shared/types';
import { CharacterDictionary, CharacterEntry } from './CharacterDictionary';
import { EmotionalLexicon, EmotionWord } from './EmotionalLexicon';
import { SymbolDictionary, ArchetypeSymbol } from './SymbolDictionary';
import { DomainOntology, ConceptNode } from './DomainOntology';

export type DictionaryLayer = 'character' | 'emotion' | 'symbol' | 'domain';

export interface MeaningEmergence {
  id: string;
  sourceLayers: DictionaryLayer[];
  concept: string;
  vector: number[];
  coherence: number;
  novelty: number;
  strength: number;
  timestamp: number;
}

export interface LayerLink {
  sourceLayer: DictionaryLayer;
  targetLayer: DictionaryLayer;
  sourceId: string;
  targetId: string;
  mappingStrength: number;
  activationCount: number;
}

export interface ResonancePattern {
  id: string;
  triggerWord: string;
  activatedLayers: DictionaryLayer[];
  emergentMeaning: string;
  intensity: number;
  duration: number;
}

export interface IDictionaryMind {
  characterDict: CharacterDictionary;
  emotionLexicon: EmotionalLexicon;
  symbolDict: SymbolDictionary;
  domainOntology: DomainOntology;
  emergenceCount: number;
  lookupAcrossLayers(query: string, context?: string[]): MeaningEmergence[];
  buildLayerLinks(linkCount: number): void;
  activateConcept(concept: string, layer: DictionaryLayer, intensity: number): void;
  computeMeaningEmergence(seed: string, layers: DictionaryLayer[]): MeaningEmergence | null;
  getResonancePatterns(minIntensity: number): ResonancePattern[];
  integrateAllToKnowledgeUnit(query: string): KnowledgeUnit | null;
}

export class DictionaryMind implements IDictionaryMind {
  private _characterDict: CharacterDictionary;
  private _emotionLexicon: EmotionalLexicon;
  private _symbolDict: SymbolDictionary;
  private _domainOntology: DomainOntology;
  private _layerLinks: LayerLink[];
  private _activationMap: Map<string, { layer: DictionaryLayer; intensity: number; timestamp: number }>;
  private _emergences: MeaningEmergence[];
  private _resonancePatterns: ResonancePattern[];
  private _decayRate: number;
  private _maxEmergences: number;
  private _resonanceThreshold: number;

  constructor() {
    this._characterDict = new CharacterDictionary();
    this._emotionLexicon = new EmotionalLexicon();
    this._symbolDict = new SymbolDictionary();
    this._domainOntology = new DomainOntology();
    this._layerLinks = [];
    this._activationMap = new Map();
    this._emergences = [];
    this._resonancePatterns = [];
    this._decayRate = 0.05;
    this._maxEmergences = 100;
    this._resonanceThreshold = 0.6;
  }

  get characterDict(): CharacterDictionary { return this._characterDict; }
  get emotionLexicon(): EmotionalLexicon { return this._emotionLexicon; }
  get symbolDict(): SymbolDictionary { return this._symbolDict; }
  get domainOntology(): DomainOntology { return this._domainOntology; }
  get emergenceCount(): number { return this._emergences.length; }
  get linkCount(): number { return this._layerLinks.length; }
  get activeConceptCount(): number { return this._activationMap.size; }
  get emergences(): MeaningEmergence[] { return [...this._emergences]; }

  public lookupAcrossLayers(query: string, context: string[] = []): MeaningEmergence[] {
    const results: MeaningEmergence[] = [];
    const charMatches = this._characterDict.findSimilarCharacters(query, 3);
    for (const match of charMatches) {
      const emergence = this.computeMeaningEmergence(match.character, ['character', 'emotion', 'symbol', 'domain']);
      if (emergence) {
        emergence.coherence *= 1 / (1 + match.distance);
        results.push(emergence);
      }
    }
    const emoResults = this._emotionLexicon.findSynonyms(query, 1);
    for (const emoWord of emoResults) {
      const emergence = this.computeMeaningEmergence(emoWord, ['emotion', 'symbol', 'domain']);
      if (emergence) results.push(emergence);
    }
    const symMatches = this._symbolDict.findByMeaning(query);
    for (const symId of symMatches.slice(0, 3)) {
      const emergence = this.computeMeaningEmergence(symId, ['symbol', 'domain', 'emotion']);
      if (emergence) results.push(emergence);
    }
    const conceptMatches = this._domainOntology.findConceptsByName(query);
    for (const cid of conceptMatches.slice(0, 3)) {
      const emergence = this.computeMeaningEmergence(cid, ['domain', 'symbol', 'emotion']);
      if (emergence) results.push(emergence);
    }
    results.sort((a, b) => b.strength - a.strength);
    return results;
  }

  public buildLayerLinks(linkCount: number = 50): void {
    this._layerLinks = [];
    const charEntries: { id: string; vector: number[] }[] = [];
    for (const c of this._getAllCharacters()) {
      const ku = this._characterDict.toKnowledgeUnit(c);
      if (ku) charEntries.push({ id: c, vector: ku.vector });
    }
    const emoEntries: { id: string; vector: number[] }[] = [];
    for (const w of this._getAllEmotionWords()) {
      const ku = this._emotionLexicon.toKnowledgeUnit(w);
      if (ku) emoEntries.push({ id: w, vector: ku.vector });
    }
    const symEntries: { id: string; vector: number[] }[] = [];
    for (const s of this._getAllSymbols()) {
      const ku = this._symbolDict.toKnowledgeUnit(s);
      if (ku) symEntries.push({ id: s, vector: ku.vector });
    }
    const domEntries: { id: string; vector: number[] }[] = [];
    for (const d of this._getAllConcepts()) {
      const ku = this._domainOntology.toKnowledgeUnit(d);
      if (ku) domEntries.push({ id: d, vector: ku.vector });
    }
    this._buildCrossLinks(charEntries, emoEntries, 'character', 'emotion', linkCount / 4);
    this._buildCrossLinks(emoEntries, symEntries, 'emotion', 'symbol', linkCount / 4);
    this._buildCrossLinks(symEntries, domEntries, 'symbol', 'domain', linkCount / 4);
    this._buildCrossLinks(charEntries, domEntries, 'character', 'domain', linkCount / 4);
  }

  private _buildCrossLinks(
    setA: { id: string; vector: number[] }[],
    setB: { id: string; vector: number[] }[],
    layerA: DictionaryLayer,
    layerB: DictionaryLayer,
    count: number
  ): void {
    const candidates: LayerLink[] = [];
    for (const a of setA) {
      for (const b of setB) {
        const sim = this._cosineSimilarity(a.vector, b.vector);
        if (sim > 0.3) {
          candidates.push({
            sourceLayer: layerA,
            targetLayer: layerB,
            sourceId: a.id,
            targetId: b.id,
            mappingStrength: sim,
            activationCount: 0
          });
        }
      }
    }
    candidates.sort((a, b) => b.mappingStrength - a.mappingStrength);
    this._layerLinks.push(...candidates.slice(0, Math.floor(count)));
  }

  private _cosineSimilarity(a: number[], b: number[]): number {
    const len = Math.min(a.length, b.length);
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < len; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom > 0 ? dot / denom : 0;
  }

  private _getAllCharacters(): string[] {
    const result: string[] = [];
    for (let i = 0; i < this._characterDict.size; i++) {
      const char = String.fromCharCode(0x4e00 + i);
      if (this._characterDict.getCharacter(char)) result.push(char);
    }
    return result;
  }

  private _getAllEmotionWords(): string[] {
    const polarities: ('positive' | 'negative' | 'neutral' | 'ambivalent')[] = ['positive', 'negative', 'neutral', 'ambivalent'];
    const all = new Set<string>();
    for (const p of polarities) {
      for (const w of this._emotionLexicon.getPolarityWords(p)) {
        all.add(w);
      }
    }
    return Array.from(all);
  }

  private _getAllSymbols(): string[] {
    return this._symbolDict.findUniversalSymbols();
  }

  private _getAllConcepts(): string[] {
    return this._domainOntology.findConceptsByName('');
  }

  public activateConcept(concept: string, layer: DictionaryLayer, intensity: number): void {
    const key = `${layer}:${concept}`;
    const now = Date.now();
    this._activationMap.set(key, { layer, intensity, timestamp: now });
    this._propagateActivation(concept, layer, intensity * 0.5);
    this._checkResonance(concept, layer);
  }

  private _propagateActivation(concept: string, layer: DictionaryLayer, intensity: number): void {
    if (intensity < 0.1) return;
    const relatedLinks = this._layerLinks.filter(l =>
      (l.sourceLayer === layer && l.sourceId === concept) ||
      (l.targetLayer === layer && l.targetId === concept)
    );
    for (const link of relatedLinks) {
      const targetLayer = link.sourceLayer === layer ? link.targetLayer : link.sourceLayer;
      const targetId = link.sourceLayer === layer ? link.targetId : link.sourceId;
      const newIntensity = intensity * link.mappingStrength;
      const key = `${targetLayer}:${targetId}`;
      const existing = this._activationMap.get(key);
      if (!existing || newIntensity > existing.intensity) {
        this._activationMap.set(key, {
          layer: targetLayer,
          intensity: newIntensity,
          timestamp: Date.now()
        });
      }
      link.activationCount++;
    }
  }

  private _checkResonance(trigger: string, layer: DictionaryLayer): void {
    const activeLayers = new Set<DictionaryLayer>();
    let totalIntensity = 0;
    let count = 0;
    for (const [, info] of this._activationMap) {
      activeLayers.add(info.layer);
      totalIntensity += info.intensity;
      count++;
    }
    const avgIntensity = count > 0 ? totalIntensity / count : 0;
    if (activeLayers.size >= 3 && avgIntensity > this._resonanceThreshold) {
      const pattern: ResonancePattern = {
        id: `resonance-${Date.now()}`,
        triggerWord: trigger,
        activatedLayers: Array.from(activeLayers),
        emergentMeaning: `Resonance across ${activeLayers.size} layers triggered by ${trigger}`,
        intensity: avgIntensity,
        duration: activeLayers.size * 1000
      };
      this._resonancePatterns.push(pattern);
      if (this._resonancePatterns.length > 50) {
        this._resonancePatterns.shift();
      }
    }
  }

  public computeMeaningEmergence(seed: string, layers: DictionaryLayer[]): MeaningEmergence | null {
    const vectors: number[][] = [];
    const usedLayers: DictionaryLayer[] = [];
    if (layers.includes('character')) {
      const ku = this._characterDict.toKnowledgeUnit(seed);
      if (ku) { vectors.push(ku.vector); usedLayers.push('character'); }
    }
    if (layers.includes('emotion')) {
      const ku = this._emotionLexicon.toKnowledgeUnit(seed);
      if (ku) { vectors.push(ku.vector); usedLayers.push('emotion'); }
    }
    if (layers.includes('symbol')) {
      const ku = this._symbolDict.toKnowledgeUnit(seed);
      if (ku) { vectors.push(ku.vector); usedLayers.push('symbol'); }
    }
    if (layers.includes('domain')) {
      const ku = this._domainOntology.toKnowledgeUnit(seed);
      if (ku) { vectors.push(ku.vector); usedLayers.push('domain'); }
    }
    if (vectors.length === 0) return null;
    const maxLen = Math.max(...vectors.map(v => v.length));
    const combined = new Array(maxLen).fill(0);
    for (const vec of vectors) {
      for (let i = 0; i < vec.length; i++) {
        combined[i] += vec[i] / vectors.length;
      }
    }
    const coherence = this._computeVectorCoherence(vectors);
    const novelty = usedLayers.length / 4;
    const strength = coherence * novelty;
    const emergence: MeaningEmergence = {
      id: `emergence-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sourceLayers: usedLayers,
      concept: seed,
      vector: combined,
      coherence,
      novelty,
      strength,
      timestamp: Date.now()
    };
    this._emergences.push(emergence);
    if (this._emergences.length > this._maxEmergences) {
      this._emergences.shift();
    }
    return emergence;
  }

  private _computeVectorCoherence(vectors: number[][]): number {
    if (vectors.length < 2) return 1;
    let totalSim = 0;
    let pairs = 0;
    for (let i = 0; i < vectors.length; i++) {
      for (let j = i + 1; j < vectors.length; j++) {
        totalSim += this._cosineSimilarity(vectors[i], vectors[j]);
        pairs++;
      }
    }
    return pairs > 0 ? totalSim / pairs : 0;
  }

  public getResonancePatterns(minIntensity: number = 0.5): ResonancePattern[] {
    return this._resonancePatterns.filter(p => p.intensity >= minIntensity);
  }

  public integrateAllToKnowledgeUnit(query: string): KnowledgeUnit | null {
    const emergence = this.computeMeaningEmergence(query, ['character', 'emotion', 'symbol', 'domain']);
    if (!emergence) return null;
    return {
      id: `integrated-${query}`,
      content: query,
      vector: emergence.vector,
      lineage: emergence.sourceLayers
    };
  }

  public decayActivations(): void {
    const toRemove: string[] = [];
    for (const [key, info] of this._activationMap) {
      info.intensity *= (1 - this._decayRate);
      if (info.intensity < 0.01) {
        toRemove.push(key);
      }
    }
    for (const key of toRemove) {
      this._activationMap.delete(key);
    }
  }

  public getTopActivations(limit: number = 10): { concept: string; layer: DictionaryLayer; intensity: number }[] {
    const entries = Array.from(this._activationMap.entries())
      .map(([key, info]) => ({
        concept: key.split(':').slice(1).join(':'),
        layer: info.layer,
        intensity: info.intensity
      }));
    entries.sort((a, b) => b.intensity - a.intensity);
    return entries.slice(0, limit);
  }

  public toSignal(query: string): Signal | null {
    const emergence = this.computeMeaningEmergence(query, ['character', 'emotion', 'symbol', 'domain']);
    if (!emergence) return null;
    return {
      source: `dictionary-mind-${query}`,
      magnitude: emergence.strength,
      entropy: 1 - emergence.coherence,
      timestamp: Date.now()
    };
  }

  public reset(): void {
    this._characterDict.reset();
    this._emotionLexicon.reset();
    this._symbolDict.reset();
    this._domainOntology.reset();
    this._layerLinks = [];
    this._activationMap.clear();
    this._emergences = [];
    this._resonancePatterns = [];
  }
}
