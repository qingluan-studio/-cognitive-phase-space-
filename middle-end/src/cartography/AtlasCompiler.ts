import { KnowledgeUnit, DataPacket } from '../shared/types';

export interface MapEntry {
  id: string;
  name: string;
  type: MapType;
  perspective: string;
  createdAt: number;
  dimensions: number;
  nodeCount: number;
  edgeCount: number;
  data: unknown;
}

export type MapType = 'cognitive' | 'topological' | 'geographic' | 'semantic' | 'network' | 'temporal' | 'comparative';

export interface AtlasSection {
  id: string;
  title: string;
  description: string;
  mapIds: string[];
  order: number;
  theme: string;
}

export interface Atlas {
  id: string;
  title: string;
  subtitle: string;
  sections: AtlasSection[];
  maps: Map<string, MapEntry>;
  createdAt: number;
  updatedAt: number;
  version: string;
  editor: string;
}

export interface CompilationOptions {
  sortBy: 'date' | 'name' | 'complexity' | 'relevance';
  includeIndex: boolean;
  includeLegend: boolean;
  maxMapsPerSection: number;
  crossReference: boolean;
}

export interface AtlasIndex {
  terms: Map<string, string[]>;
  mapReferences: Map<string, string[]>;
  crossReferences: Map<string, string[]>;
}

export interface LegendItem {
  symbol: string;
  label: string;
  description: string;
  color?: string;
}

export class AtlasCompiler {
  private _atlases: Map<string, Atlas>;
  private _currentAtlas: string | null;
  private _compilationOptions: CompilationOptions;
  private _indexCache: Map<string, AtlasIndex>;
  private _legends: Map<string, LegendItem[]>;
  private _viewHistory: string[];

  constructor() {
    this._atlases = new Map();
    this._currentAtlas = null;
    this._compilationOptions = {
      sortBy: 'date',
      includeIndex: true,
      includeLegend: true,
      maxMapsPerSection: 20,
      crossReference: true
    };
    this._indexCache = new Map();
    this._legends = new Map();
    this._viewHistory = [];
  }

  get atlasCount(): number { return this._atlases.size; }
  get currentAtlas(): string | null { return this._currentAtlas; }

  public createAtlas(id: string, title: string, subtitle: string = '', editor: string = 'system'): Atlas {
    const atlas: Atlas = {
      id,
      title,
      subtitle,
      sections: [],
      maps: new Map(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: '1.0.0',
      editor
    };
    this._atlases.set(id, atlas);
    if (!this._currentAtlas) {
      this._currentAtlas = id;
    }
    return atlas;
  }

  public selectAtlas(id: string): boolean {
    if (this._atlases.has(id)) {
      this._currentAtlas = id;
      this._viewHistory.push(id);
      return true;
    }
    return false;
  }

  public getAtlas(id: string): Atlas | null {
    return this._atlases.get(id) || null;
  }

  public addMap(atlasId: string, map: MapEntry, sectionId?: string): boolean {
    const atlas = this._atlases.get(atlasId);
    if (!atlas) return false;

    atlas.maps.set(map.id, map);
    atlas.updatedAt = Date.now();

    if (sectionId) {
      const section = atlas.sections.find(s => s.id === sectionId);
      if (section && !section.mapIds.includes(map.id)) {
        section.mapIds.push(map.id);
      }
    }

    this._indexCache.delete(atlasId);
    return true;
  }

  public removeMap(atlasId: string, mapId: string): boolean {
    const atlas = this._atlases.get(atlasId);
    if (!atlas || !atlas.maps.has(mapId)) return false;

    atlas.maps.delete(mapId);
    for (const section of atlas.sections) {
      const idx = section.mapIds.indexOf(mapId);
      if (idx >= 0) section.mapIds.splice(idx, 1);
    }
    atlas.updatedAt = Date.now();
    this._indexCache.delete(atlasId);
    return true;
  }

  public createSection(atlasId: string, id: string, title: string, description: string, theme: string = ''): boolean {
    const atlas = this._atlases.get(atlasId);
    if (!atlas) return false;

    if (atlas.sections.some(s => s.id === id)) return false;

    atlas.sections.push({
      id,
      title,
      description,
      mapIds: [],
      order: atlas.sections.length,
      theme
    });
    atlas.updatedAt = Date.now();
    return true;
  }

  public reorderSections(atlasId: string, order: string[]): boolean {
    const atlas = this._atlases.get(atlasId);
    if (!atlas) return false;

    atlas.sections.sort((a, b) => {
      const idxA = order.indexOf(a.id);
      const idxB = order.indexOf(b.id);
      if (idxA === -1 && idxB === -1) return a.order - b.order;
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });

    atlas.sections.forEach((s, i) => { s.order = i; });
    atlas.updatedAt = Date.now();
    return true;
  }

  public compileAtlas(atlasId: string, options?: Partial<CompilationOptions>): Atlas | null {
    const atlas = this._atlases.get(atlasId);
    if (!atlas) return null;

    const fullOptions = { ...this._compilationOptions, ...options };

    for (const section of atlas.sections) {
      section.mapIds = this._sortMaps(section.mapIds.map(id => atlas.maps.get(id)!).filter(Boolean), fullOptions.sortBy)
        .map(m => m.id)
        .slice(0, fullOptions.maxMapsPerSection);
    }

    const unassigned = Array.from(atlas.maps.keys()).filter(id =>
      !atlas.sections.some(s => s.mapIds.includes(id))
    );
    if (unassigned.length > 0) {
      if (!atlas.sections.some(s => s.id === 'misc')) {
        atlas.sections.push({
          id: 'misc',
          title: 'Miscellaneous',
          description: 'Maps not assigned to a specific section',
          mapIds: unassigned,
          order: atlas.sections.length,
          theme: 'general'
        });
      }
    }

    if (fullOptions.crossReference) {
      this._buildCrossReferences(atlas);
    }

    if (fullOptions.includeIndex) {
      this._buildIndex(atlas);
    }

    atlas.version = this._bumpVersion(atlas.version, 'minor');
    atlas.updatedAt = Date.now();
    return atlas;
  }

  public generateIndex(atlasId: string): AtlasIndex | null {
    const atlas = this._atlases.get(atlasId);
    if (!atlas) return null;
    return this._buildIndex(atlas);
  }

  public generateLegend(atlasId: string): LegendItem[] {
    const atlas = this._atlases.get(atlasId);
    if (!atlas) return [];

    if (this._legends.has(atlasId)) {
      return this._legends.get(atlasId)!;
    }

    const legend: LegendItem[] = [
      { symbol: '○', label: 'Node', description: 'A concept or entity in the map' },
      { symbol: '─', label: 'Edge', description: 'A connection between nodes' },
      { symbol: '●', label: 'Central Node', description: 'Highly connected hub concept' },
      { symbol: '◎', label: 'Cluster', description: 'Group of related concepts' },
      { symbol: '⟷', label: 'Bidirectional', description: 'Mutual relationship' },
      { symbol: '→', label: 'Directional', description: 'One-way relationship' }
    ];

    const types = new Set<MapType>();
    for (const map of atlas.maps.values()) {
      types.add(map.type);
    }

    const typeSymbols: Record<MapType, { symbol: string; description: string }> = {
      cognitive: { symbol: '🧠', description: 'Cognitive map of thought processes' },
      topological: { symbol: '🏔', description: 'Topological terrain view' },
      geographic: { symbol: '🗺', description: 'Geographic layout' },
      semantic: { symbol: '📚', description: 'Semantic relationship map' },
      network: { symbol: '🕸', description: 'Network graph view' },
      temporal: { symbol: '⏳', description: 'Time-based progression' },
      comparative: { symbol: '⚖', description: 'Comparative analysis' }
    };

    for (const type of types) {
      legend.push({
        symbol: typeSymbols[type].symbol,
        label: type,
        description: typeSymbols[type].description
      });
    }

    this._legends.set(atlasId, legend);
    return legend;
  }

  public findMaps(atlasId: string, query: {
    type?: MapType;
    perspective?: string;
    keyword?: string;
    minNodes?: number;
    maxNodes?: number;
  }): MapEntry[] {
    const atlas = this._atlases.get(atlasId);
    if (!atlas) return [];

    const results: MapEntry[] = [];
    for (const map of atlas.maps.values()) {
      if (query.type && map.type !== query.type) continue;
      if (query.perspective && map.perspective !== query.perspective) continue;
      if (query.minNodes && map.nodeCount < query.minNodes) continue;
      if (query.maxNodes && map.nodeCount > query.maxNodes) continue;
      if (query.keyword && !map.name.toLowerCase().includes(query.keyword.toLowerCase())) continue;
      results.push(map);
    }
    return results;
  }

  public getMapSequence(atlasId: string, sectionId: string): MapEntry[] {
    const atlas = this._atlases.get(atlasId);
    if (!atlas) return [];

    const section = atlas.sections.find(s => s.id === sectionId);
    if (!section) return [];

    return section.mapIds.map(id => atlas.maps.get(id)!).filter(Boolean);
  }

  public compareAtlases(atlasIdA: string, atlasIdB: string): {
    commonMaps: string[];
    uniqueToA: string[];
    uniqueToB: string[];
    similarity: number;
  } {
    const atlasA = this._atlases.get(atlasIdA);
    const atlasB = this._atlases.get(atlasIdB);
    if (!atlasA || !atlasB) {
      return { commonMaps: [], uniqueToA: [], uniqueToB: [], similarity: 0 };
    }

    const mapsA = new Set(atlasA.maps.keys());
    const mapsB = new Set(atlasB.maps.keys());

    const common: string[] = [];
    const uniqueA: string[] = [];
    const uniqueB: string[] = [];

    for (const id of mapsA) {
      if (mapsB.has(id)) common.push(id);
      else uniqueA.push(id);
    }
    for (const id of mapsB) {
      if (!mapsA.has(id)) uniqueB.push(id);
    }

    const total = mapsA.size + mapsB.size - common.length;
    const similarity = total > 0 ? common.length / total : 1;

    return { commonMaps: common, uniqueToA: uniqueA, uniqueToB: uniqueB, similarity };
  }

  public mergeAtlases(atlasIdA: string, atlasIdB: string, mergedId: string, mergedTitle: string): string {
    const atlasA = this._atlases.get(atlasIdA);
    const atlasB = this._atlases.get(atlasIdB);
    if (!atlasA || !atlasB) return '';

    const merged = this.createAtlas(mergedId, mergedTitle, `Merged from ${atlasA.title} and ${atlasB.title}`);

    for (const [id, map] of atlasA.maps) {
      merged.maps.set(id, map);
    }
    for (const [id, map] of atlasB.maps) {
      if (!merged.maps.has(id)) {
        merged.maps.set(id, map);
      }
    }

    const sectionMap = new Map<string, string>();
    for (const section of [...atlasA.sections, ...atlasB.sections]) {
      if (!sectionMap.has(section.id)) {
        sectionMap.set(section.id, section.id);
        merged.sections.push({ ...section, mapIds: [] });
      }
    }

    for (const section of atlasA.sections) {
      const mergedSection = merged.sections.find(s => s.id === section.id);
      if (mergedSection) {
        for (const mapId of section.mapIds) {
          if (!mergedSection.mapIds.includes(mapId)) {
            mergedSection.mapIds.push(mapId);
          }
        }
      }
    }
    for (const section of atlasB.sections) {
      const mergedSection = merged.sections.find(s => s.id === section.id);
      if (mergedSection) {
        for (const mapId of section.mapIds) {
          if (!mergedSection.mapIds.includes(mapId)) {
            mergedSection.mapIds.push(mapId);
          }
        }
      }
    }

    merged.sections.forEach((s, i) => { s.order = i; });
    this._atlases.set(mergedId, merged);
    return mergedId;
  }

  public exportAtlas(atlasId: string): {
    title: string;
    subtitle: string;
    version: string;
    sections: { title: string; maps: { name: string; type: string }[] }[];
  } | null {
    const atlas = this._atlases.get(atlasId);
    if (!atlas) return null;

    return {
      title: atlas.title,
      subtitle: atlas.subtitle,
      version: atlas.version,
      sections: atlas.sections.map(s => ({
        title: s.title,
        maps: s.mapIds.map(id => {
          const m = atlas.maps.get(id);
          return { name: m?.name || id, type: m?.type || 'unknown' };
        })
      }))
    };
  }

  public setCompilationOptions(options: Partial<CompilationOptions>): void {
    this._compilationOptions = { ...this._compilationOptions, ...options };
  }

  private _sortMaps(maps: MapEntry[], sortBy: CompilationOptions['sortBy']): MapEntry[] {
    const sorted = [...maps];
    switch (sortBy) {
      case 'date':
        sorted.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'complexity':
        sorted.sort((a, b) => (b.nodeCount + b.edgeCount) - (a.nodeCount + a.edgeCount));
        break;
      case 'relevance':
        sorted.sort((a, b) => (b.nodeCount * b.dimensions) - (a.nodeCount * a.dimensions));
        break;
    }
    return sorted;
  }

  private _buildCrossReferences(atlas: Atlas): void {
    const mapIds = Array.from(atlas.maps.keys());
    for (let i = 0; i < mapIds.length; i++) {
      for (let j = i + 1; j < mapIds.length; j++) {
        const a = atlas.maps.get(mapIds[i])!;
        const b = atlas.maps.get(mapIds[j])!;
        if (a.type === b.type || a.perspective === b.perspective) {
        }
      }
    }
  }

  private _buildIndex(atlas: Atlas): AtlasIndex {
    if (this._indexCache.has(atlas.id)) {
      return this._indexCache.get(atlas.id)!;
    }

    const terms = new Map<string, string[]>();
    const mapReferences = new Map<string, string[]>();
    const crossReferences = new Map<string, string[]>();

    for (const [mapId, map] of atlas.maps) {
      const words = map.name.toLowerCase().split(/\s+/);
      for (const word of words) {
        if (word.length > 2) {
          if (!terms.has(word)) terms.set(word, []);
          if (!terms.get(word)!.includes(mapId)) {
            terms.get(word)!.push(mapId);
          }
        }
      }

      for (const section of atlas.sections) {
        if (section.mapIds.includes(mapId)) {
          if (!mapReferences.has(section.id)) mapReferences.set(section.id, []);
          mapReferences.get(section.id)!.push(mapId);
        }
      }
    }

    const index: AtlasIndex = { terms, mapReferences, crossReferences };
    this._indexCache.set(atlas.id, index);
    return index;
  }

  private _bumpVersion(version: string, type: 'major' | 'minor' | 'patch'): string {
    const parts = version.split('.').map(n => parseInt(n, 10));
    if (parts.length !== 3) return '1.0.0';

    switch (type) {
      case 'major':
        parts[0]++;
        parts[1] = 0;
        parts[2] = 0;
        break;
      case 'minor':
        parts[1]++;
        parts[2] = 0;
        break;
      case 'patch':
        parts[2]++;
        break;
    }
    return parts.join('.');
  }

  public processPacket(packet: DataPacket<MapEntry>): DataPacket<Atlas> {
    const atlasId = packet.metadata.phase;
    if (!this._atlases.has(atlasId)) {
      this.createAtlas(atlasId, `Atlas-${atlasId}`);
    }
    this.addMap(atlasId, packet.payload);
    const atlas = this.compileAtlas(atlasId);
    return {
      id: `compiled-${packet.id}`,
      payload: atlas!,
      metadata: {
        ...packet.metadata,
        route: [...packet.metadata.route, 'AtlasCompiler']
      }
    };
  }

  public reset(): void {
    this._atlases.clear();
    this._currentAtlas = null;
    this._indexCache.clear();
    this._legends.clear();
    this._viewHistory = [];
  }
}
