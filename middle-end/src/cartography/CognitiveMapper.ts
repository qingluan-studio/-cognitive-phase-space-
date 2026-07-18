import { KnowledgeUnit, DataPacket } from '../shared/types';

export interface MapNode {
  id: string;
  position: { x: number; y: number; z?: number };
  concept: string;
  weight: number;
  cluster: string;
  connections: string[];
}

export interface MapEdge {
  source: string;
  target: string;
  strength: number;
  type: 'associative' | 'hierarchical' | 'causal' | 'analogical';
  traversals: number;
}

export interface CognitiveMapData {
  id: string;
  name: string;
  nodes: Map<string, MapNode>;
  edges: MapEdge[];
  dimensions: number;
  scale: number;
  center: { x: number; y: number; z?: number };
}

export interface MapRegion {
  id: string;
  name: string;
  nodeIds: string[];
  centroid: { x: number; y: number; z?: number };
  density: number;
  cohesion: number;
}

export interface MappingResult {
  mapId: string;
  nodesPlaced: number;
  edgesDrawn: number;
  regions: MapRegion[];
  stress: number;
  iterations: number;
}

export class CognitiveMapper {
  private _maps: Map<string, CognitiveMapData>;
  private _currentMap: string | null;
  private _mappingHistory: MappingResult[];
  private _layoutIterations: number;
  private _attractionCoefficient: number;
  private _repulsionCoefficient: number;

  constructor(layoutIterations: number = 100) {
    this._maps = new Map();
    this._currentMap = null;
    this._mappingHistory = [];
    this._layoutIterations = layoutIterations;
    this._attractionCoefficient = 0.01;
    this._repulsionCoefficient = 1000;
  }

  get mapCount(): number { return this._maps.size; }
  get currentMap(): string | null { return this._currentMap; }
  get layoutIterations(): number { return this._layoutIterations; }

  public createMap(id: string, name: string, dimensions: number = 2): void {
    const map: CognitiveMapData = {
      id,
      name,
      nodes: new Map(),
      edges: [],
      dimensions,
      scale: 1,
      center: { x: 0, y: 0, ...(dimensions > 2 ? { z: 0 } : {}) }
    };
    this._maps.set(id, map);
    if (!this._currentMap) {
      this._currentMap = id;
    }
  }

  public selectMap(mapId: string): boolean {
    if (this._maps.has(mapId)) {
      this._currentMap = mapId;
      return true;
    }
    return false;
  }

  public addNode(mapId: string, id: string, concept: string, weight: number = 1.0): void {
    const map = this._maps.get(mapId);
    if (!map) return;

    const node: MapNode = {
      id,
      position: this._randomPosition(map.dimensions),
      concept,
      weight,
      cluster: '',
      connections: []
    };
    map.nodes.set(id, node);
  }

  public addEdge(mapId: string, source: string, target: string, strength: number = 1.0, type: MapEdge['type'] = 'associative'): void {
    const map = this._maps.get(mapId);
    if (!map) return;

    const existing = map.edges.find(e =>
      (e.source === source && e.target === target) ||
      (e.source === target && e.target === source)
    );

    if (existing) {
      existing.strength += strength * 0.1;
      existing.traversals++;
    } else {
      map.edges.push({ source, target, strength, type, traversals: 1 });
      const sourceNode = map.nodes.get(source);
      const targetNode = map.nodes.get(target);
      if (sourceNode && !sourceNode.connections.includes(target)) {
        sourceNode.connections.push(target);
      }
      if (targetNode && !targetNode.connections.includes(source)) {
        targetNode.connections.push(source);
      }
    }
  }

  public addKnowledgeUnit(mapId: string, ku: KnowledgeUnit): void {
    this.addNode(mapId, ku.id, ku.content, ku.vector?.[0] || 1.0);
  }

  public connectSimilar(mapId: string, threshold: number = 0.5): number {
    const map = this._maps.get(mapId);
    if (!map) return 0;

    const nodes = Array.from(map.nodes.values());
    let connections = 0;

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const sim = this._nodeSimilarity(nodes[i], nodes[j]);
        if (sim >= threshold) {
          this.addEdge(mapId, nodes[i].id, nodes[j].id, sim, 'associative');
          connections++;
        }
      }
    }
    return connections;
  }

  public layoutMap(mapId: string): MappingResult | null {
    const map = this._maps.get(mapId);
    if (!map) return null;

    const nodes = Array.from(map.nodes.values());
    if (nodes.length < 2) {
      return {
        mapId,
        nodesPlaced: nodes.length,
        edgesDrawn: map.edges.length,
        regions: [],
        stress: 0,
        iterations: 0
      };
    }

    let stress = 0;
    let iterations = 0;

    for (iterations = 0; iterations < this._layoutIterations; iterations++) {
      stress = this._layoutIteration(map);
      if (stress < 0.01) break;
    }

    const regions = this._detectRegions(map);
    this._updateCenter(map);

    const result: MappingResult = {
      mapId,
      nodesPlaced: map.nodes.size,
      edgesDrawn: map.edges.length,
      regions,
      stress,
      iterations
    };

    this._mappingHistory.push(result);
    return result;
  }

  public getNodePosition(mapId: string, nodeId: string): { x: number; y: number; z?: number } | null {
    const map = this._maps.get(mapId);
    if (!map) return null;
    const node = map.nodes.get(nodeId);
    return node ? { ...node.position } : null;
  }

  public findPath(mapId: string, start: string, end: string): string[] {
    const map = this._maps.get(mapId);
    if (!map) return [];

    const visited = new Set<string>();
    const queue: { node: string; path: string[] }[] = [{ node: start, path: [start] }];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.node === end) return current.path;
      if (visited.has(current.node)) continue;
      visited.add(current.node);

      const node = map.nodes.get(current.node);
      if (node) {
        for (const neighbor of node.connections) {
          if (!visited.has(neighbor)) {
            queue.push({ node: neighbor, path: [...current.path, neighbor] });
          }
        }
      }
    }
    return [];
  }

  public calculateMapDensity(mapId: string): number {
    const map = this._maps.get(mapId);
    if (!map || map.nodes.size === 0) return 0;

    const maxEdges = map.nodes.size * (map.nodes.size - 1) / 2;
    return map.edges.length / Math.max(1, maxEdges);
  }

  public findCentralNodes(mapId: string, count: number = 5): string[] {
    const map = this._maps.get(mapId);
    if (!map) return [];

    const centralities = new Map<string, number>();
    for (const [id, node] of map.nodes) {
      centralities.set(id, node.connections.length * node.weight);
    }

    return Array.from(centralities.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([id]) => id);
  }

  public getRegions(mapId: string): MapRegion[] {
    const map = this._maps.get(mapId);
    if (!map) return [];
    return this._detectRegions(map);
  }

  public mergeMaps(mapIdA: string, mapIdB: string, mergedId: string): string {
    const mapA = this._maps.get(mapIdA);
    const mapB = this._maps.get(mapIdB);
    if (!mapA || !mapB) return '';

    this.createMap(mergedId, `Merged: ${mapA.name} + ${mapB.name}`, mapA.dimensions);

    for (const [id, node] of mapA.nodes) {
      this.addNode(mergedId, id, node.concept, node.weight);
    }
    for (const [id, node] of mapB.nodes) {
      if (!mapA.nodes.has(id)) {
        this.addNode(mergedId, id, node.concept, node.weight);
      }
    }
    for (const edge of mapA.edges) {
      this.addEdge(mergedId, edge.source, edge.target, edge.strength, edge.type);
    }
    for (const edge of mapB.edges) {
      this.addEdge(mergedId, edge.source, edge.target, edge.strength, edge.type);
    }

    return mergedId;
  }

  public zoomMap(mapId: string, factor: number): void {
    const map = this._maps.get(mapId);
    if (!map) return;
    map.scale *= factor;
    for (const node of map.nodes.values()) {
      node.position.x *= factor;
      node.position.y *= factor;
      if (node.position.z !== undefined) {
        node.position.z *= factor;
      }
    }
  }

  public panMap(mapId: string, dx: number, dy: number, dz: number = 0): void {
    const map = this._maps.get(mapId);
    if (!map) return;
    for (const node of map.nodes.values()) {
      node.position.x += dx;
      node.position.y += dy;
      if (node.position.z !== undefined) {
        node.position.z += dz;
      }
    }
    this._updateCenter(map);
  }

  private _randomPosition(dimensions: number): { x: number; y: number; z?: number } {
    const pos = {
      x: (Math.random() - 0.5) * 200,
      y: (Math.random() - 0.5) * 200
    };
    if (dimensions > 2) {
      (pos as any).z = (Math.random() - 0.5) * 200;
    }
    return pos;
  }

  private _nodeSimilarity(a: MapNode, b: MapNode): number {
    const dx = a.position.x - b.position.x;
    const dy = a.position.y - b.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return Math.exp(-dist / 100) * Math.min(a.weight, b.weight);
  }

  private _layoutIteration(map: CognitiveMapData): number {
    const nodes = Array.from(map.nodes.values());
    let totalStress = 0;

    const forces = new Map<string, { fx: number; fy: number; fz?: number }>();
    for (const node of nodes) {
      forces.set(node.id, { fx: 0, fy: 0, ...(map.dimensions > 2 ? { fz: 0 } : {}) });
    }

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].position.x - nodes[i].position.x;
        const dy = nodes[j].position.y - nodes[i].position.y;
        let dz = 0;
        if (map.dimensions > 2 && nodes[i].position.z !== undefined && nodes[j].position.z !== undefined) {
          dz = nodes[j].position.z! - nodes[i].position.z!;
        }

        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.01;
        const repulsion = this._repulsionCoefficient / (dist * dist);

        const forceI = forces.get(nodes[i].id)!;
        const forceJ = forces.get(nodes[j].id)!;

        forceI.fx -= repulsion * dx / dist;
        forceI.fy -= repulsion * dy / dist;
        if (forceI.fz !== undefined && forceJ.fz !== undefined) {
          forceI.fz! -= repulsion * dz / dist;
          forceJ.fz! += repulsion * dz / dist;
        }
        forceJ.fx += repulsion * dx / dist;
        forceJ.fy += repulsion * dy / dist;
      }
    }

    for (const edge of map.edges) {
      const source = map.nodes.get(edge.source);
      const target = map.nodes.get(edge.target);
      if (!source || !target) continue;

      const dx = target.position.x - source.position.x;
      const dy = target.position.y - source.position.y;
      let dz = 0;
      if (map.dimensions > 2 && source.position.z !== undefined && target.position.z !== undefined) {
        dz = target.position.z - source.position.z;
      }

      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.01;
      const attraction = this._attractionCoefficient * edge.strength * dist;

      const forceS = forces.get(edge.source)!;
      const forceT = forces.get(edge.target)!;

      forceS.fx += attraction * dx / dist;
      forceS.fy += attraction * dy / dist;
      if (forceS.fz !== undefined && forceT.fz !== undefined) {
        forceS.fz! += attraction * dz / dist;
        forceT.fz! -= attraction * dz / dist;
      }
      forceT.fx -= attraction * dx / dist;
      forceT.fy -= attraction * dy / dist;

      totalStress += Math.abs(dist - edge.strength * 50);
    }

    const damping = 0.85;
    for (const node of nodes) {
      const force = forces.get(node.id)!;
      node.position.x += force.fx * damping;
      node.position.y += force.fy * damping;
      if (node.position.z !== undefined && force.fz !== undefined) {
        node.position.z += force.fz * damping;
      }
    }

    return totalStress / Math.max(1, map.edges.length);
  }

  private _detectRegions(map: CognitiveMapData): MapRegion[] {
    const regions: MapRegion[] = [];
    const visited = new Set<string>();
    let regionId = 0;

    for (const [id, node] of map.nodes) {
      if (visited.has(id)) continue;

      const regionNodes: string[] = [];
      const stack = [id];

      while (stack.length > 0) {
        const current = stack.pop()!;
        if (visited.has(current)) continue;
        visited.add(current);
        regionNodes.push(current);

        const currentNode = map.nodes.get(current);
        if (currentNode) {
          for (const neighbor of currentNode.connections) {
            if (!visited.has(neighbor)) {
              stack.push(neighbor);
            }
          }
        }
      }

      if (regionNodes.length > 0) {
        const centroid = this._calculateCentroid(map, regionNodes);
        const density = this._calculateRegionDensity(map, regionNodes);
        const cohesion = this._calculateRegionCohesion(map, regionNodes);

        regions.push({
          id: `region-${regionId++}`,
          name: `Region ${regionId}`,
          nodeIds: regionNodes,
          centroid,
          density,
          cohesion
        });
      }
    }

    return regions;
  }

  private _calculateCentroid(map: CognitiveMapData, nodeIds: string[]): { x: number; y: number; z?: number } {
    let sumX = 0, sumY = 0, sumZ = 0;
    let hasZ = false;

    for (const id of nodeIds) {
      const node = map.nodes.get(id);
      if (node) {
        sumX += node.position.x;
        sumY += node.position.y;
        if (node.position.z !== undefined) {
          sumZ += node.position.z;
          hasZ = true;
        }
      }
    }

    const n = Math.max(1, nodeIds.length);
    const result: any = { x: sumX / n, y: sumY / n };
    if (hasZ) result.z = sumZ / n;
    return result;
  }

  private _calculateRegionDensity(map: CognitiveMapData, nodeIds: string[]): number {
    const n = nodeIds.length;
    if (n < 2) return 1;
    const maxEdges = n * (n - 1) / 2;
    let internalEdges = 0;
    const idSet = new Set(nodeIds);

    for (const edge of map.edges) {
      if (idSet.has(edge.source) && idSet.has(edge.target)) {
        internalEdges++;
      }
    }
    return internalEdges / maxEdges;
  }

  private _calculateRegionCohesion(map: CognitiveMapData, nodeIds: string[]): number {
    if (nodeIds.length < 2) return 1;
    const centroid = this._calculateCentroid(map, nodeIds);
    let totalDist = 0;
    let count = 0;

    for (const id of nodeIds) {
      const node = map.nodes.get(id);
      if (node) {
        const dx = node.position.x - centroid.x;
        const dy = node.position.y - centroid.y;
        let dz = 0;
        if (node.position.z !== undefined && centroid.z !== undefined) {
          dz = node.position.z - centroid.z;
        }
        totalDist += Math.sqrt(dx * dx + dy * dy + dz * dz);
        count++;
      }
    }
    const avgDist = totalDist / Math.max(1, count);
    return Math.exp(-avgDist / 100);
  }

  private _updateCenter(map: CognitiveMapData): void {
    const ids = Array.from(map.nodes.keys());
    if (ids.length === 0) return;
    map.center = this._calculateCentroid(map, ids);
  }

  public processPacket(packet: DataPacket<KnowledgeUnit[]>): DataPacket<MappingResult> {
    const mapId = packet.metadata.phase;
    if (!this._maps.has(mapId)) {
      this.createMap(mapId, `Map-${mapId}`);
    }
    for (const ku of packet.payload) {
      this.addKnowledgeUnit(mapId, ku);
    }
    this.connectSimilar(mapId);
    const result = this.layoutMap(mapId);
    return {
      id: `mapped-${packet.id}`,
      payload: result!,
      metadata: {
        ...packet.metadata,
        route: [...packet.metadata.route, 'CognitiveMapper']
      }
    };
  }

  public exportMap(mapId: string): { nodes: MapNode[]; edges: MapEdge[] } | null {
    const map = this._maps.get(mapId);
    if (!map) return null;
    return {
      nodes: Array.from(map.nodes.values()),
      edges: [...map.edges]
    };
  }

  public reset(): void {
    this._maps.clear();
    this._currentMap = null;
    this._mappingHistory = [];
  }
}
