import { KnowledgeUnit, DataPacket } from '../shared/types';

export interface Stroke {
  type: string;
  order: number;
  direction: 'left' | 'right' | 'up' | 'down' | 'diagonal';
  pressure: number;
}

export interface Radical {
  id: string;
  name: string;
  meaning: string;
  position: 'left' | 'right' | 'top' | 'bottom' | 'enclosure' | 'inside';
  semanticWeight: number;
}

export interface SemanticLayer {
  level: number;
  label: string;
  features: string[];
  activation: number;
}

export interface CharacterEntry {
  character: string;
  pinyin: string;
  strokeCount: number;
  strokes: Stroke[];
  radicals: Radical[];
  layers: SemanticLayer[];
  etymology: string;
  frequency: number;
  complexity: number;
}

export interface ICharacterDictionary {
  size: number;
  addCharacter(entry: CharacterEntry): void;
  getCharacter(char: string): CharacterEntry | undefined;
  findByRadical(radicalId: string): string[];
  computeSemanticDistance(charA: string, charB: string): number;
  decomposeCharacter(char: string): Radical[];
  buildLayerActivation(char: string, context: string[]): SemanticLayer[];
}

export class CharacterDictionary implements ICharacterDictionary {
  private _characters: Map<string, CharacterEntry>;
  private _radicalIndex: Map<string, string[]>;
  private _strokeIndex: Map<number, string[]>;
  private _lookupHistory: { character: string; timestamp: number; context: string[] }[];
  private _maxHistorySize: number;

  constructor() {
    this._characters = new Map();
    this._radicalIndex = new Map();
    this._strokeIndex = new Map();
    this._lookupHistory = [];
    this._maxHistorySize = 100;
  }

  get size(): number { return this._characters.size; }
  get radicalCount(): number { return this._radicalIndex.size; }
  get lookupHistory(): { character: string; timestamp: number; context: string[] }[] {
    return [...this._lookupHistory];
  }

  public addCharacter(entry: CharacterEntry): void {
    this._characters.set(entry.character, entry);
    for (const radical of entry.radicals) {
      if (!this._radicalIndex.has(radical.id)) {
        this._radicalIndex.set(radical.id, []);
      }
      const chars = this._radicalIndex.get(radical.id)!;
      if (!chars.includes(entry.character)) {
        chars.push(entry.character);
      }
    }
    const sc = entry.strokeCount;
    if (!this._strokeIndex.has(sc)) {
      this._strokeIndex.set(sc, []);
    }
    const strokeChars = this._strokeIndex.get(sc)!;
    if (!strokeChars.includes(entry.character)) {
      strokeChars.push(entry.character);
    }
  }

  public getCharacter(char: string): CharacterEntry | undefined {
    const entry = this._characters.get(char);
    if (entry) {
      this._recordLookup(char, []);
    }
    return entry ? { ...entry, strokes: [...entry.strokes], radicals: [...entry.radicals], layers: entry.layers.map(l => ({ ...l, features: [...l.features] })) } : undefined;
  }

  public findByRadical(radicalId: string): string[] {
    return [...(this._radicalIndex.get(radicalId) || [])];
  }

  public findByStrokeCount(count: number): string[] {
    return [...(this._strokeIndex.get(count) || [])];
  }

  public computeSemanticDistance(charA: string, charB: string): number {
    const a = this._characters.get(charA);
    const b = this._characters.get(charB);
    if (!a || !b) return Infinity;
    const radicalOverlap = this._computeRadicalOverlap(a.radicals, b.radicals);
    const strokeDiff = Math.abs(a.strokeCount - b.strokeCount) / Math.max(a.strokeCount, b.strokeCount);
    const layerDistance = this._computeLayerDistance(a.layers, b.layers);
    const frequencyDiff = Math.abs(a.frequency - b.frequency);
    return (1 - radicalOverlap) * 0.4 + strokeDiff * 0.2 + layerDistance * 0.3 + frequencyDiff * 0.1;
  }

  private _computeRadicalOverlap(radicalsA: Radical[], radicalsB: Radical[]): number {
    const setA = new Set(radicalsA.map(r => r.id));
    const setB = new Set(radicalsB.map(r => r.id));
    let intersection = 0;
    for (const r of setA) {
      if (setB.has(r)) intersection++;
    }
    const union = setA.size + setB.size - intersection;
    return union > 0 ? intersection / union : 0;
  }

  private _computeLayerDistance(layersA: SemanticLayer[], layersB: SemanticLayer[]): number {
    const maxLevel = Math.max(
      ...layersA.map(l => l.level),
      ...layersB.map(l => l.level)
    );
    let totalDist = 0;
    for (let level = 0; level <= maxLevel; level++) {
      const la = layersA.find(l => l.level === level);
      const lb = layersB.find(l => l.level === level);
      if (!la && !lb) continue;
      if (!la || !lb) {
        totalDist += 1;
      } else {
        const featA = new Set(la.features);
        const featB = new Set(lb.features);
        let overlap = 0;
        for (const f of featA) {
          if (featB.has(f)) overlap++;
        }
        const union = featA.size + featB.size - overlap;
        totalDist += union > 0 ? 1 - overlap / union : 0;
      }
    }
    return totalDist / (maxLevel + 1);
  }

  public decomposeCharacter(char: string): Radical[] {
    const entry = this._characters.get(char);
    if (!entry) return [];
    return entry.radicals.map(r => ({ ...r }));
  }

  public buildLayerActivation(char: string, context: string[]): SemanticLayer[] {
    const entry = this._characters.get(char);
    if (!entry) return [];
    const contextRadicals = new Set<string>();
    for (const c of context) {
      const ctxEntry = this._characters.get(c);
      if (ctxEntry) {
        for (const r of ctxEntry.radicals) {
          contextRadicals.add(r.id);
        }
      }
    }
    return entry.layers.map(layer => {
      let activation = layer.activation;
      for (const feat of layer.features) {
        if (contextRadicals.has(feat)) {
          activation *= 1.5;
        }
      }
      return { ...layer, activation: Math.min(1, activation) };
    });
  }

  public findSimilarCharacters(char: string, k: number = 5): { character: string; distance: number }[] {
    const results: { character: string; distance: number }[] = [];
    for (const [c] of this._characters) {
      if (c === char) continue;
      const dist = this.computeSemanticDistance(char, c);
      results.push({ character: c, distance: dist });
    }
    results.sort((a, b) => a.distance - b.distance);
    return results.slice(0, k);
  }

  public generateCompound(radicalIds: string[]): CharacterEntry | null {
    if (radicalIds.length < 2) return null;
    let totalStrokes = 0;
    const radicals: Radical[] = [];
    const allFeatures = new Set<string>();
    const layersMap = new Map<number, { label: string; features: Set<string>; activation: number }>();
    for (const rid of radicalIds) {
      let found = false;
      for (const [, entry] of this._characters) {
        const r = entry.radicals.find(rr => rr.id === rid);
        if (r) {
          radicals.push({ ...r });
          totalStrokes += Math.ceil(entry.strokeCount / entry.radicals.length);
          for (const layer of entry.layers) {
            if (!layersMap.has(layer.level)) {
              layersMap.set(layer.level, { label: layer.label, features: new Set(), activation: 0 });
            }
            const lm = layersMap.get(layer.level)!;
            for (const f of layer.features) lm.features.add(f);
            lm.activation = Math.max(lm.activation, layer.activation);
          }
          found = true;
          break;
        }
      }
      if (!found) return null;
    }
    const layers: SemanticLayer[] = [];
    for (const [level, data] of layersMap) {
      layers.push({
        level,
        label: data.label,
        features: Array.from(data.features),
        activation: data.activation / radicalIds.length
      });
    }
    layers.sort((a, b) => a.level - b.level);
    const compoundChar = radicalIds.join('+');
    return {
      character: compoundChar,
      pinyin: 'compound',
      strokeCount: totalStrokes,
      strokes: [],
      radicals,
      layers,
      etymology: `Compound of ${radicalIds.join(', ')}`,
      frequency: 0.1,
      complexity: radicals.length * 0.5
    };
  }

  private _recordLookup(char: string, context: string[]): void {
    this._lookupHistory.push({ character: char, timestamp: Date.now(), context });
    if (this._lookupHistory.length > this._maxHistorySize) {
      this._lookupHistory.shift();
    }
  }

  public toKnowledgeUnit(char: string): KnowledgeUnit | null {
    const entry = this._characters.get(char);
    if (!entry) return null;
    const vector = this._characterToVector(entry);
    return {
      id: `char-${char}`,
      content: entry.character,
      vector,
      lineage: entry.radicals.map(r => r.id)
    };
  }

  private _characterToVector(entry: CharacterEntry): number[] {
    const vector: number[] = [];
    vector.push(entry.strokeCount / 30);
    vector.push(entry.complexity);
    vector.push(entry.frequency);
    const radicalVector = new Array(20).fill(0);
    for (let i = 0; i < Math.min(entry.radicals.length, 20); i++) {
      radicalVector[i] = entry.radicals[i].semanticWeight;
    }
    vector.push(...radicalVector);
    const layerVector = new Array(10).fill(0);
    for (const layer of entry.layers) {
      if (layer.level < 10) {
        layerVector[layer.level] = layer.activation;
      }
    }
    vector.push(...layerVector);
    return vector;
  }

  public reset(): void {
    this._characters.clear();
    this._radicalIndex.clear();
    this._strokeIndex.clear();
    this._lookupHistory = [];
  }
}
