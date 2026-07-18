import { KnowledgeUnit, DataPacket } from '../shared/types';

export interface StratigraphicLayer {
  id: string;
  depth: number;
  timestamp: number;
  artifacts: KnowledgeUnit[];
  density: number;
  ageEstimate: number;
}

export interface ExcavationSite {
  id: string;
  name: string;
  layers: StratigraphicLayer[];
  totalDepth: number;
  currentDepth: number;
}

export interface ExcavationResult {
  siteId: string;
  layerId: string;
  artifactsFound: KnowledgeUnit[];
  layerAge: number;
  completeness: number;
}

export class StratigraphicExcavator {
  private _sites: Map<string, ExcavationSite>;
  private _currentSite: string | null;
  private _excavationHistory: ExcavationResult[];
  private _depthResolution: number;
  private _artifactFilter: (artifact: KnowledgeUnit) => boolean;

  constructor(depthResolution: number = 1.0) {
    this._sites = new Map();
    this._currentSite = null;
    this._excavationHistory = [];
    this._depthResolution = depthResolution;
    this._artifactFilter = () => true;
  }

  get siteCount(): number { return this._sites.size; }
  get currentSite(): string | null { return this._currentSite; }
  get depthResolution(): number { return this._depthResolution; }
  get excavationCount(): number { return this._excavationHistory.length; }

  public createSite(id: string, name: string): void {
    this._sites.set(id, {
      id,
      name,
      layers: [],
      totalDepth: 0,
      currentDepth: 0
    });
    if (!this._currentSite) {
      this._currentSite = id;
    }
  }

  public selectSite(siteId: string): boolean {
    if (this._sites.has(siteId)) {
      this._currentSite = siteId;
      return true;
    }
    return false;
  }

  public addLayer(siteId: string, layer: StratigraphicLayer): void {
    const site = this._sites.get(siteId);
    if (site) {
      site.layers.push(layer);
      site.totalDepth = Math.max(site.totalDepth, layer.depth);
      this._sortLayersByDepth(site);
    }
  }

  public depositArtifact(siteId: string, depth: number, artifact: KnowledgeUnit): void {
    const site = this._sites.get(siteId);
    if (!site) return;

    let layer = this._findLayerAtDepth(site, depth);
    if (!layer) {
      layer = this._createLayer(depth);
      site.layers.push(layer);
      this._sortLayersByDepth(site);
      site.totalDepth = Math.max(site.totalDepth, depth);
    }
    layer.artifacts.push(artifact);
    layer.density = layer.artifacts.length / Math.max(1, this._depthResolution);
  }

  public excavate(siteId: string, targetDepth: number): ExcavationResult[] {
    const site = this._sites.get(siteId);
    if (!site) return [];

    const results: ExcavationResult[] = [];
    const startDepth = site.currentDepth;

    for (let d = startDepth; d <= targetDepth; d += this._depthResolution) {
      const layer = this._findLayerAtDepth(site, d);
      if (layer) {
        const filteredArtifacts = layer.artifacts.filter(this._artifactFilter);
        const result: ExcavationResult = {
          siteId,
          layerId: layer.id,
          artifactsFound: filteredArtifacts,
          layerAge: layer.ageEstimate,
          completeness: this._calculateLayerCompleteness(layer)
        };
        results.push(result);
        this._excavationHistory.push(result);
      }
    }

    site.currentDepth = Math.min(targetDepth, site.totalDepth);
    return results;
  }

  public excavateNextLayer(siteId: string): ExcavationResult | null {
    const site = this._sites.get(siteId);
    if (!site) return null;

    const nextLayer = site.layers.find(l => l.depth > site.currentDepth);
    if (!nextLayer) return null;

    return this.excavate(siteId, nextLayer.depth)[0] || null;
  }

  public getLayerAtDepth(siteId: string, depth: number): StratigraphicLayer | null {
    const site = this._sites.get(siteId);
    if (!site) return null;
    return this._findLayerAtDepth(site, depth);
  }

  public getOldestLayer(siteId: string): StratigraphicLayer | null {
    const site = this._sites.get(siteId);
    if (!site || site.layers.length === 0) return null;
    return site.layers[site.layers.length - 1];
  }

  public getNewestLayer(siteId: string): StratigraphicLayer | null {
    const site = this._sites.get(siteId);
    if (!site || site.layers.length === 0) return null;
    return site.layers[0];
  }

  public searchArtifacts(siteId: string, predicate: (artifact: KnowledgeUnit) => boolean): KnowledgeUnit[] {
    const site = this._sites.get(siteId);
    if (!site) return [];

    const found: KnowledgeUnit[] = [];
    for (const layer of site.layers) {
      for (const artifact of layer.artifacts) {
        if (predicate(artifact)) {
          found.push(artifact);
        }
      }
    }
    return found;
  }

  public calculateStratigraphicIntegrity(siteId: string): number {
    const site = this._sites.get(siteId);
    if (!site || site.layers.length < 2) return 1.0;

    let violations = 0;
    for (let i = 1; i < site.layers.length; i++) {
      if (site.layers[i].ageEstimate <= site.layers[i - 1].ageEstimate) {
        violations++;
      }
    }
    return 1 - violations / (site.layers.length - 1);
  }

  public correlateLayers(siteIdA: string, siteIdB: string): Map<string, string> {
    const siteA = this._sites.get(siteIdA);
    const siteB = this._sites.get(siteIdB);
    if (!siteA || !siteB) return new Map();

    const correlations = new Map<string, string>();
    for (const layerA of siteA.layers) {
      let bestMatch = '';
      let bestSimilarity = 0;
      for (const layerB of siteB.layers) {
        const similarity = this._layerSimilarity(layerA, layerB);
        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestMatch = layerB.id;
        }
      }
      if (bestMatch) {
        correlations.set(layerA.id, bestMatch);
      }
    }
    return correlations;
  }

  public setArtifactFilter(filter: (artifact: KnowledgeUnit) => boolean): void {
    this._artifactFilter = filter;
  }

  public resetExcavation(siteId: string): void {
    const site = this._sites.get(siteId);
    if (site) {
      site.currentDepth = 0;
    }
  }

  public getExcavationProgress(siteId: string): number {
    const site = this._sites.get(siteId);
    if (!site || site.totalDepth === 0) return 0;
    return site.currentDepth / site.totalDepth;
  }

  private _findLayerAtDepth(site: ExcavationSite, depth: number): StratigraphicLayer | null {
    for (const layer of site.layers) {
      if (Math.abs(layer.depth - depth) < this._depthResolution / 2) {
        return layer;
      }
    }
    return null;
  }

  private _createLayer(depth: number): StratigraphicLayer {
    return {
      id: `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      depth,
      timestamp: Date.now(),
      artifacts: [],
      density: 0,
      ageEstimate: depth * 1000
    };
  }

  private _sortLayersByDepth(site: ExcavationSite): void {
    site.layers.sort((a, b) => a.depth - b.depth);
  }

  private _calculateLayerCompleteness(layer: StratigraphicLayer): number {
    const expectedDensity = layer.depth > 0 ? 1 / Math.log(layer.depth + 1) : 1;
    return Math.min(1, layer.density / Math.max(0.01, expectedDensity));
  }

  private _layerSimilarity(a: StratigraphicLayer, b: StratigraphicLayer): number {
    const ageDiff = Math.abs(a.ageEstimate - b.ageEstimate);
    const densityDiff = Math.abs(a.density - b.density);
    const artifactOverlap = this._artifactOverlap(a.artifacts, b.artifacts);
    return artifactOverlap * 0.5 + (1 - Math.min(1, ageDiff / Math.max(a.ageEstimate, b.ageEstimate, 1))) * 0.3 + (1 - Math.min(1, densityDiff)) * 0.2;
  }

  private _artifactOverlap(a: KnowledgeUnit[], b: KnowledgeUnit[]): number {
    if (a.length === 0 && b.length === 0) return 1;
    const idsA = new Set(a.map(x => x.id));
    const idsB = new Set(b.map(x => x.id));
    let intersection = 0;
    for (const id of idsA) {
      if (idsB.has(id)) intersection++;
    }
    return intersection / Math.max(idsA.size, idsB.size);
  }

  public processPacket(packet: DataPacket<KnowledgeUnit[]>): DataPacket<ExcavationResult[]> {
    const siteId = packet.metadata.phase;
    if (!this._sites.has(siteId)) {
      this.createSite(siteId, `Site-${siteId}`);
    }
    for (const artifact of packet.payload) {
      const depth = packet.metadata.priority * 10;
      this.depositArtifact(siteId, depth, artifact);
    }
    const results = this.excavate(siteId, this._sites.get(siteId)!.totalDepth);
    return {
      id: `excavated-${packet.id}`,
      payload: results,
      metadata: {
        ...packet.metadata,
        route: [...packet.metadata.route, 'StratigraphicExcavator']
      }
    };
  }

  public exportSite(siteId: string): ExcavationSite | null {
    const site = this._sites.get(siteId);
    if (!site) return null;
    return JSON.parse(JSON.stringify(site));
  }

  public reset(): void {
    this._sites.clear();
    this._currentSite = null;
    this._excavationHistory = [];
  }
}
