import { KnowledgeUnit, DataPacket } from '../shared/types';

export interface SymbolMeaning {
  culture: string;
  meaning: string;
  positivity: number;
  context: string[];
}

export interface ArchetypeSymbol {
  id: string;
  name: string;
  category: string;
  imagePath: string;
  meanings: SymbolMeaning[];
  crossCulturalMappings: { targetCulture: string; equivalentSymbol: string; similarity: number }[];
  universal: boolean;
  emergenceAge: number;
}

export interface CulturalDimension {
  individualism: number;
  powerDistance: number;
  uncertaintyAvoidance: number;
  masculinity: number;
  longTermOrientation: number;
  indulgence: number;
}

export interface SymbolCluster {
  id: string;
  theme: string;
  members: string[];
  coreMeaning: string;
  culturalSpread: string[];
}

export interface ISymbolDictionary {
  size: number;
  addSymbol(symbol: ArchetypeSymbol): void;
  getSymbol(symbolId: string): ArchetypeSymbol | undefined;
  findByMeaning(keyword: string, culture?: string): string[];
  getCrossCulturalEquivalent(symbolId: string, targetCulture: string): { equivalent: string; similarity: number } | null;
  computeSymbolDistance(symbolA: string, symbolB: string): number;
  clusterByTheme(minSize: number): SymbolCluster[];
  getCulturalSymbols(culture: string): string[];
}

export class SymbolDictionary implements ISymbolDictionary {
  private _symbols: Map<string, ArchetypeSymbol>;
  private _cultureIndex: Map<string, string[]>;
  private _categoryIndex: Map<string, string[]>;
  private _meaningIndex: Map<string, { symbolId: string; culture: string; weight: number }[]>;
  private _lookupLog: { symbolId: string; culture?: string; timestamp: number }[];
  private _maxLogSize: number;

  constructor() {
    this._symbols = new Map();
    this._cultureIndex = new Map();
    this._categoryIndex = new Map();
    this._meaningIndex = new Map();
    this._lookupLog = [];
    this._maxLogSize = 100;
  }

  get size(): number { return this._symbols.size; }
  get cultureCount(): number { return this._cultureIndex.size; }
  get categoryCount(): number { return this._categoryIndex.size; }
  get universalCount(): number {
    let count = 0;
    for (const [, s] of this._symbols) {
      if (s.universal) count++;
    }
    return count;
  }
  get lookupLog(): { symbolId: string; culture?: string; timestamp: number }[] {
    return [...this._lookupLog];
  }

  public addSymbol(symbol: ArchetypeSymbol): void {
    this._symbols.set(symbol.id, symbol);
    const cultures = new Set<string>();
    for (const m of symbol.meanings) {
      cultures.add(m.culture);
      const keywords = this._extractKeywords(m.meaning);
      for (const kw of keywords) {
        if (!this._meaningIndex.has(kw)) {
          this._meaningIndex.set(kw, []);
        }
        this._meaningIndex.get(kw)!.push({
          symbolId: symbol.id,
          culture: m.culture,
          weight: m.positivity
        });
      }
    }
    for (const c of cultures) {
      if (!this._cultureIndex.has(c)) {
        this._cultureIndex.set(c, []);
      }
      const list = this._cultureIndex.get(c)!;
      if (!list.includes(symbol.id)) {
        list.push(symbol.id);
      }
    }
    if (!this._categoryIndex.has(symbol.category)) {
      this._categoryIndex.set(symbol.category, []);
    }
    const catList = this._categoryIndex.get(symbol.category)!;
    if (!catList.includes(symbol.id)) {
      catList.push(symbol.id);
    }
  }

  private _extractKeywords(text: string): string[] {
    const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
    return words.filter(w => w.length > 2);
  }

  public getSymbol(symbolId: string): ArchetypeSymbol | undefined {
    const s = this._symbols.get(symbolId);
    if (s) {
      this._recordLookup(symbolId);
      return {
        ...s,
        meanings: s.meanings.map(m => ({ ...m, context: [...m.context] })),
        crossCulturalMappings: s.crossCulturalMappings.map(m => ({ ...m }))
      };
    }
    return undefined;
  }

  private _recordLookup(symbolId: string, culture?: string): void {
    this._lookupLog.push({ symbolId, culture, timestamp: Date.now() });
    if (this._lookupLog.length > this._maxLogSize) {
      this._lookupLog.shift();
    }
  }

  public findByMeaning(keyword: string, culture?: string): string[] {
    const kw = keyword.toLowerCase();
    const matches = this._meaningIndex.get(kw) || [];
    const filtered = culture
      ? matches.filter(m => m.culture === culture)
      : matches;
    const symbolScores = new Map<string, number>();
    for (const m of filtered) {
      const current = symbolScores.get(m.symbolId) || 0;
      symbolScores.set(m.symbolId, current + Math.abs(m.weight));
    }
    const result = Array.from(symbolScores.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id);
    return result;
  }

  public getCulturalSymbols(culture: string): string[] {
    return [...(this._cultureIndex.get(culture) || [])];
  }

  public getCategorySymbols(category: string): string[] {
    return [...(this._categoryIndex.get(category) || [])];
  }

  public getCrossCulturalEquivalent(symbolId: string, targetCulture: string): { equivalent: string; similarity: number } | null {
    const symbol = this._symbols.get(symbolId);
    if (!symbol) return null;
    const direct = symbol.crossCulturalMappings.find(m => m.targetCulture === targetCulture);
    if (direct) {
      return { equivalent: direct.equivalentSymbol, similarity: direct.similarity };
    }
    const sourceCulture = symbol.meanings[0]?.culture;
    if (!sourceCulture) return null;
    let bestMatch: { equivalent: string; similarity: number } | null = null;
    let bestSim = 0;
    for (const [, s] of this._symbols) {
      const hasTarget = s.meanings.some(m => m.culture === targetCulture);
      if (!hasTarget) continue;
      const sim = this._computeSymbolSimilarity(symbol, s);
      if (sim > bestSim) {
        bestSim = sim;
        bestMatch = { equivalent: s.id, similarity: sim };
      }
    }
    return bestMatch;
  }

  private _computeSymbolSimilarity(a: ArchetypeSymbol, b: ArchetypeSymbol): number {
    const catSim = a.category === b.category ? 1 : 0;
    const meaningsA = new Set(a.meanings.map(m => m.meaning));
    const meaningsB = new Set(b.meanings.map(m => m.meaning));
    let overlap = 0;
    for (const m of meaningsA) {
      if (meaningsB.has(m)) overlap++;
    }
    const union = meaningsA.size + meaningsB.size - overlap;
    const meaningSim = union > 0 ? overlap / union : 0;
    const universalBonus = (a.universal && b.universal) ? 0.1 : 0;
    return catSim * 0.3 + meaningSim * 0.6 + universalBonus;
  }

  public computeSymbolDistance(symbolA: string, symbolB: string): number {
    const a = this._symbols.get(symbolA);
    const b = this._symbols.get(symbolB);
    if (!a || !b) return Infinity;
    const sim = this._computeSymbolSimilarity(a, b);
    return 1 - sim;
  }

  public clusterByTheme(minSize: number = 3): SymbolCluster[] {
    const symbolIds = Array.from(this._symbols.keys());
    const adjacency = new Map<string, string[]>();
    for (const id of symbolIds) {
      adjacency.set(id, []);
    }
    for (let i = 0; i < symbolIds.length; i++) {
      for (let j = i + 1; j < symbolIds.length; j++) {
        const dist = this.computeSymbolDistance(symbolIds[i], symbolIds[j]);
        if (dist < 0.5) {
          adjacency.get(symbolIds[i])!.push(symbolIds[j]);
          adjacency.get(symbolIds[j])!.push(symbolIds[i]);
        }
      }
    }
    const visited = new Set<string>();
    const clusters: SymbolCluster[] = [];
    let clusterId = 0;
    for (const id of symbolIds) {
      if (visited.has(id)) continue;
      const queue = [id];
      const members: string[] = [];
      while (queue.length > 0) {
        const current = queue.shift()!;
        if (visited.has(current)) continue;
        visited.add(current);
        members.push(current);
        const neighbors = adjacency.get(current) || [];
        for (const n of neighbors) {
          if (!visited.has(n)) {
            queue.push(n);
          }
        }
      }
      if (members.length >= minSize) {
        let coreSymbol = members[0];
        let maxDegree = -1;
        for (const m of members) {
          const degree = (adjacency.get(m) || []).length;
          if (degree > maxDegree) {
            maxDegree = degree;
            coreSymbol = m;
          }
        }
        const core = this._symbols.get(coreSymbol)!;
        const coreMeaning = core.meanings[0]?.meaning || '';
        const cultures = new Set<string>();
        for (const m of members) {
          const s = this._symbols.get(m)!;
          for (const meaning of s.meanings) {
            cultures.add(meaning.culture);
          }
        }
        clusters.push({
          id: `theme-cluster-${clusterId++}`,
          theme: core.category,
          members,
          coreMeaning,
          culturalSpread: Array.from(cultures)
        });
      }
    }
    return clusters;
  }

  public findUniversalSymbols(): string[] {
    const result: string[] = [];
    for (const [id, s] of this._symbols) {
      if (s.universal) result.push(id);
    }
    return result;
  }

  public computeCulturalSymbolDistance(cultureA: string, cultureB: string): number {
    const symsA = this._cultureIndex.get(cultureA) || [];
    const symsB = this._cultureIndex.get(cultureB) || [];
    if (symsA.length === 0 || symsB.length === 0) return 1;
    let totalDist = 0;
    let count = 0;
    for (const a of symsA) {
      for (const b of symsB) {
        totalDist += this.computeSymbolDistance(a, b);
        count++;
      }
    }
    return count > 0 ? totalDist / count : 1;
  }

  public toKnowledgeUnit(symbolId: string): KnowledgeUnit | null {
    const s = this._symbols.get(symbolId);
    if (!s) return null;
    const vector: number[] = [];
    vector.push(s.universal ? 1 : 0);
    vector.push(s.emergenceAge / 10000);
    const meaningVec = new Array(10).fill(0);
    for (let i = 0; i < Math.min(s.meanings.length, 10); i++) {
      meaningVec[i] = s.meanings[i].positivity;
    }
    vector.push(...meaningVec);
    vector.push(s.crossCulturalMappings.length / 10);
    return {
      id: `symbol-${symbolId}`,
      content: s.name,
      vector,
      lineage: [s.category]
    };
  }

  public exportCulturalDimensions(culture: string): CulturalDimension {
    const syms = this._cultureIndex.get(culture) || [];
    let positivitySum = 0;
    let contextDiversity = 0;
    let universalRatio = 0;
    let mappingCount = 0;
    let ageSum = 0;
    for (const id of syms) {
      const s = this._symbols.get(id)!;
      for (const m of s.meanings) {
        if (m.culture === culture) {
          positivitySum += m.positivity;
          contextDiversity += m.context.length;
        }
      }
      if (s.universal) universalRatio++;
      mappingCount += s.crossCulturalMappings.length;
      ageSum += s.emergenceAge;
    }
    const n = syms.length || 1;
    return {
      individualism: Math.min(1, universalRatio / n),
      powerDistance: 1 - Math.min(1, mappingCount / (n * 5)),
      uncertaintyAvoidance: 1 - Math.min(1, contextDiversity / (n * 10)),
      masculinity: (positivitySum / n + 1) / 2,
      longTermOrientation: Math.min(1, ageSum / (n * 5000)),
      indulgence: Math.min(1, positivitySum / n * 0.5 + 0.5)
    };
  }

  public reset(): void {
    this._symbols.clear();
    this._cultureIndex.clear();
    this._categoryIndex.clear();
    this._meaningIndex.clear();
    this._lookupLog = [];
  }
}
