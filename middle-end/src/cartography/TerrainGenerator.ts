import { KnowledgeUnit, DataPacket, Signal } from '../shared/types';

export interface TerrainPoint {
  x: number;
  y: number;
  height: number;
  feature: TerrainFeature;
  gradient: { dx: number; dy: number };
  knowledgeDensity: number;
}

export type TerrainFeature = 'plain' | 'hill' | 'mountain' | 'valley' | 'ridge' | 'canyon' | 'plateau' | 'peak' | 'basin';

export interface TerrainMap {
  id: string;
  width: number;
  height: number;
  resolution: number;
  points: TerrainPoint[][];
  seed: number;
  maxHeight: number;
  minHeight: number;
}

export interface TopologyProfile {
  peaks: { x: number; y: number; height: number }[];
  valleys: { x: number; y: number; height: number }[];
  ridges: { start: { x: number; y: number }; end: { x: number; y: number } }[];
  averageElevation: number;
  ruggedness: number;
  fractalDimension: number;
}

export interface RiverSystem {
  id: string;
  source: { x: number; y: number };
  mouth: { x: number; y: number };
  path: { x: number; y: number }[];
  length: number;
  flowRate: number;
}

export interface ContourLine {
  elevation: number;
  points: { x: number; y: number }[];
  closed: boolean;
}

export class TerrainGenerator {
  private _terrains: Map<string, TerrainMap>;
  private _currentTerrain: string | null;
  private _topologyCache: Map<string, TopologyProfile>;
  private _rivers: Map<string, RiverSystem[]>;
  private _contours: Map<string, ContourLine[]>;
  private _noiseScale: number;
  private _octaves: number;
  private _persistence: number;

  constructor(noiseScale: number = 0.02, octaves: number = 6) {
    this._terrains = new Map();
    this._currentTerrain = null;
    this._topologyCache = new Map();
    this._rivers = new Map();
    this._contours = new Map();
    this._noiseScale = noiseScale;
    this._octaves = octaves;
    this._persistence = 0.5;
  }

  get terrainCount(): number { return this._terrains.size; }
  get currentTerrain(): string | null { return this._currentTerrain; }
  get noiseScale(): number { return this._noiseScale; }
  get octaves(): number { return this._octaves; }

  public generateTerrain(id: string, width: number, height: number, seed: number = Date.now()): TerrainMap {
    const resolution = 1;
    const points: TerrainPoint[][] = [];
    let maxHeight = -Infinity;
    let minHeight = Infinity;

    for (let y = 0; y < height; y++) {
      points[y] = [];
      for (let x = 0; x < width; x++) {
        const h = this._fractalNoise(x, y, seed);
        maxHeight = Math.max(maxHeight, h);
        minHeight = Math.min(minHeight, h);
        const gradient = this._calculateGradient(x, y, seed);
        const feature = this._classifyTerrain(h, gradient);
        const density = this._calculateDensity(h);

        points[y][x] = {
          x,
          y,
          height: h,
          feature,
          gradient,
          knowledgeDensity: density
        };
      }
    }

    const terrain: TerrainMap = {
      id,
      width,
      height,
      resolution,
      points,
      seed,
      maxHeight,
      minHeight
    };

    this._terrains.set(id, terrain);
    if (!this._currentTerrain) {
      this._currentTerrain = id;
    }
    return terrain;
  }

  public generateFromKnowledge(id: string, knowledgeUnits: KnowledgeUnit[], width: number = 100, height: number = 100): TerrainMap {
    const seed = knowledgeUnits.length > 0 ? knowledgeUnits[0].id.length * 1000 : Date.now();
    const terrain = this.generateTerrain(id, width, height, seed);

    for (let i = 0; i < knowledgeUnits.length; i++) {
      const ku = knowledgeUnits[i];
      const px = Math.floor((Math.sin(i * 1.5) * 0.5 + 0.5) * (width - 1));
      const py = Math.floor((Math.cos(i * 1.3) * 0.5 + 0.5) * (height - 1));
      const strength = (ku.vector?.[0] || 0.5) * 10;
      this._raiseTerrain(terrain, px, py, strength, 5);
    }

    this._recalculateExtremes(terrain);
    this._terrains.set(id, terrain);
    return terrain;
  }

  public getTerrain(id: string): TerrainMap | null {
    return this._terrains.get(id) || null;
  }

  public selectTerrain(id: string): boolean {
    if (this._terrains.has(id)) {
      this._currentTerrain = id;
      return true;
    }
    return false;
  }

  public getHeight(terrainId: string, x: number, y: number): number | null {
    const terrain = this._terrains.get(terrainId);
    if (!terrain) return null;
    const px = Math.floor(Math.max(0, Math.min(terrain.width - 1, x)));
    const py = Math.floor(Math.max(0, Math.min(terrain.height - 1, y)));
    return terrain.points[py]?.[px]?.height ?? null;
  }

  public getFeature(terrainId: string, x: number, y: number): TerrainFeature | null {
    const terrain = this._terrains.get(terrainId);
    if (!terrain) return null;
    const px = Math.floor(Math.max(0, Math.min(terrain.width - 1, x)));
    const py = Math.floor(Math.max(0, Math.min(terrain.height - 1, y)));
    return terrain.points[py]?.[px]?.feature ?? null;
  }

  public analyzeTopology(terrainId: string): TopologyProfile | null {
    const terrain = this._terrains.get(terrainId);
    if (!terrain) return null;

    if (this._topologyCache.has(terrainId)) {
      return this._topologyCache.get(terrainId)!;
    }

    const peaks: { x: number; y: number; height: number }[] = [];
    const valleys: { x: number; y: number; height: number }[] = [];
    const ridges: { start: { x: number; y: number }; end: { x: number; y: number } }[] = [];
    let totalElevation = 0;
    let pointCount = 0;
    let ruggedness = 0;

    for (let y = 1; y < terrain.height - 1; y++) {
      for (let x = 1; x < terrain.width - 1; x++) {
        const h = terrain.points[y][x].height;
        totalElevation += h;
        pointCount++;

        const neighbors = [
          terrain.points[y - 1][x].height,
          terrain.points[y + 1][x].height,
          terrain.points[y][x - 1].height,
          terrain.points[y][x + 1].height
        ];

        const maxNeighbor = Math.max(...neighbors);
        const minNeighbor = Math.min(...neighbors);

        if (h > maxNeighbor) peaks.push({ x, y, height: h });
        if (h < minNeighbor) valleys.push({ x, y, height: h });

        ruggedness += Math.abs(h - maxNeighbor) + Math.abs(h - minNeighbor);
      }
    }

    const sortedPeaks = [...peaks].sort((a, b) => b.height - a.height).slice(0, 10);
    const sortedValleys = [...valleys].sort((a, b) => a.height - b.height).slice(0, 10);

    for (let i = 0; i < sortedPeaks.length - 1; i++) {
      ridges.push({
        start: { x: sortedPeaks[i].x, y: sortedPeaks[i].y },
        end: { x: sortedPeaks[i + 1].x, y: sortedPeaks[i + 1].y }
      });
    }

    const profile: TopologyProfile = {
      peaks: sortedPeaks,
      valleys: sortedValleys,
      ridges,
      averageElevation: totalElevation / Math.max(1, pointCount),
      ruggedness: ruggedness / Math.max(1, pointCount),
      fractalDimension: this._calculateFractalDimension(terrain)
    };

    this._topologyCache.set(terrainId, profile);
    return profile;
  }

  public generateRivers(terrainId: string, count: number = 3): RiverSystem[] {
    const terrain = this._terrains.get(terrainId);
    if (!terrain) return [];

    const rivers: RiverSystem[] = [];
    const topology = this.analyzeTopology(terrainId);
    const sources = topology?.peaks || [];

    for (let i = 0; i < Math.min(count, sources.length); i++) {
      const source = sources[i];
      const river = this._traceRiver(terrain, source.x, source.y);
      rivers.push(river);
    }

    this._rivers.set(terrainId, rivers);
    return rivers;
  }

  public generateContours(terrainId: string, levels: number = 10): ContourLine[] {
    const terrain = this._terrains.get(terrainId);
    if (!terrain) return [];

    const contours: ContourLine[] = [];
    const range = terrain.maxHeight - terrain.minHeight;
    const step = range / (levels + 1);

    for (let l = 1; l <= levels; l++) {
      const elevation = terrain.minHeight + step * l;
      const line = this._traceContour(terrain, elevation);
      if (line.points.length > 2) {
        contours.push(line);
      }
    }

    this._contours.set(terrainId, contours);
    return contours;
  }

  public smoothTerrain(terrainId: string, iterations: number = 1): void {
    const terrain = this._terrains.get(terrainId);
    if (!terrain) return;

    for (let iter = 0; iter < iterations; iter++) {
      const newHeights: number[][] = [];
      for (let y = 0; y < terrain.height; y++) {
        newHeights[y] = [];
        for (let x = 0; x < terrain.width; x++) {
          let sum = 0;
          let count = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const ny = y + dy;
              const nx = x + dx;
              if (ny >= 0 && ny < terrain.height && nx >= 0 && nx < terrain.width) {
                sum += terrain.points[ny][nx].height;
                count++;
              }
            }
          }
          newHeights[y][x] = sum / count;
        }
      }
      for (let y = 0; y < terrain.height; y++) {
        for (let x = 0; x < terrain.width; x++) {
          terrain.points[y][x].height = newHeights[y][x];
          terrain.points[y][x].gradient = this._calculatePointGradient(terrain, x, y);
          terrain.points[y][x].feature = this._classifyTerrain(newHeights[y][x], terrain.points[y][x].gradient);
        }
      }
      this._recalculateExtremes(terrain);
    }
    this._topologyCache.delete(terrainId);
  }

  public erodeTerrain(terrainId: string, amount: number = 0.1): void {
    const terrain = this._terrains.get(terrainId);
    if (!terrain) return;

    for (let y = 1; y < terrain.height - 1; y++) {
      for (let x = 1; x < terrain.width - 1; x++) {
        const point = terrain.points[y][x];
        const slope = Math.sqrt(point.gradient.dx ** 2 + point.gradient.dy ** 2);
        const erosion = slope * amount * point.height;
        point.height -= erosion;

        const steepest = this._findSteepestNeighbor(terrain, x, y);
        if (steepest) {
          terrain.points[steepest.y][steepest.x].height += erosion * 0.5;
        }
      }
    }
    this._recalculateExtremes(terrain);
    this._topologyCache.delete(terrainId);
  }

  public calculateVisibility(terrainId: string, fromX: number, fromY: number, radius: number): boolean[][] {
    const terrain = this._terrains.get(terrainId);
    if (!terrain) return [];

    const visible: boolean[][] = [];
    const fromHeight = terrain.points[fromY]?.[fromX]?.height || 0;

    for (let y = 0; y < terrain.height; y++) {
      visible[y] = [];
      for (let x = 0; x < terrain.width; x++) {
        const dist = Math.sqrt((x - fromX) ** 2 + (y - fromY) ** 2);
        if (dist > radius) {
          visible[y][x] = false;
          continue;
        }
        visible[y][x] = this._lineOfSight(terrain, fromX, fromY, fromHeight, x, y);
      }
    }
    return visible;
  }

  public findHighestPoint(terrainId: string): { x: number; y: number; height: number } | null {
    const terrain = this._terrains.get(terrainId);
    if (!terrain) return null;

    let maxH = -Infinity;
    let maxX = 0, maxY = 0;
    for (let y = 0; y < terrain.height; y++) {
      for (let x = 0; x < terrain.width; x++) {
        if (terrain.points[y][x].height > maxH) {
          maxH = terrain.points[y][x].height;
          maxX = x;
          maxY = y;
        }
      }
    }
    return { x: maxX, y: maxY, height: maxH };
  }

  public findLowestPoint(terrainId: string): { x: number; y: number; height: number } | null {
    const terrain = this._terrains.get(terrainId);
    if (!terrain) return null;

    let minH = Infinity;
    let minX = 0, minY = 0;
    for (let y = 0; y < terrain.height; y++) {
      for (let x = 0; x < terrain.width; x++) {
        if (terrain.points[y][x].height < minH) {
          minH = terrain.points[y][x].height;
          minX = x;
          minY = y;
        }
      }
    }
    return { x: minX, y: minY, height: minH };
  }

  public extractSignals(terrainId: string): Signal[] {
    const terrain = this._terrains.get(terrainId);
    if (!terrain) return [];

    const signals: Signal[] = [];
    const highest = this.findHighestPoint(terrainId);
    const lowest = this.findLowestPoint(terrainId);
    const topology = this.analyzeTopology(terrainId);

    if (highest) {
      signals.push({
        source: `terrain:${terrainId}:peak`,
        magnitude: highest.height,
        entropy: topology ? (1 - topology.ruggedness) || 0.5 : 0.5,
        timestamp: Date.now()
      });
    }
    if (lowest) {
      signals.push({
        source: `terrain:${terrainId}:valley`,
        magnitude: lowest.height,
        entropy: topology?.ruggedness || 0.5,
        timestamp: Date.now()
      });
    }

    return signals;
  }

  private _fractalNoise(x: number, y: number, seed: number): number {
    let total = 0;
    let frequency = this._noiseScale;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < this._octaves; i++) {
      total += this._perlinNoise(x * frequency, y * frequency, seed + i * 1000) * amplitude;
      maxValue += amplitude;
      amplitude *= this._persistence;
      frequency *= 2;
    }

    return total / maxValue;
  }

  private _perlinNoise(x: number, y: number, seed: number): number {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;

    const aa = this._hash(xi, yi, seed);
    const ab = this._hash(xi, yi + 1, seed);
    const ba = this._hash(xi + 1, yi, seed);
    const bb = this._hash(xi + 1, yi + 1, seed);

    const u = this._fade(xf);
    const v = this._fade(yf);

    const x1 = this._lerp(aa, ba, u);
    const x2 = this._lerp(ab, bb, u);
    return this._lerp(x1, x2, v);
  }

  private _hash(x: number, y: number, seed: number): number {
    let h = seed + x * 374761393 + y * 668265263;
    h = (h ^ (h >> 13)) * 1274126177;
    return ((h ^ (h >> 16)) >>> 0) / 4294967295;
  }

  private _fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private _lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private _calculateGradient(x: number, y: number, seed: number): { dx: number; dy: number } {
    const eps = 0.001;
    const hL = this._fractalNoise(x - eps, y, seed);
    const hR = this._fractalNoise(x + eps, y, seed);
    const hD = this._fractalNoise(x, y - eps, seed);
    const hU = this._fractalNoise(x, y + eps, seed);
    return {
      dx: (hR - hL) / (2 * eps),
      dy: (hU - hD) / (2 * eps)
    };
  }

  private _calculatePointGradient(terrain: TerrainMap, x: number, y: number): { dx: number; dy: number } {
    const hL = terrain.points[y]?.[x - 1]?.height ?? terrain.points[y][x].height;
    const hR = terrain.points[y]?.[x + 1]?.height ?? terrain.points[y][x].height;
    const hD = terrain.points[y - 1]?.[x]?.height ?? terrain.points[y][x].height;
    const hU = terrain.points[y + 1]?.[x]?.height ?? terrain.points[y][x].height;
    return {
      dx: (hR - hL) / 2,
      dy: (hU - hD) / 2
    };
  }

  private _classifyTerrain(height: number, gradient: { dx: number; dy: number }): TerrainFeature {
    const slope = Math.sqrt(gradient.dx ** 2 + gradient.dy ** 2);
    const normalizedHeight = (height + 1) / 2;

    if (slope < 0.02 && normalizedHeight > 0.8) return 'plateau';
    if (slope < 0.02 && normalizedHeight < 0.2) return 'basin';
    if (slope > 0.3 && normalizedHeight > 0.7) return 'mountain';
    if (slope > 0.2 && normalizedHeight > 0.5) return 'hill';
    if (slope < 0.05) return 'plain';
    if (gradient.dx > 0.1 && gradient.dy > 0.1) return 'ridge';
    if (gradient.dx < -0.1 && gradient.dy < -0.1) return 'valley';
    if (slope > 0.4) return 'canyon';
    if (normalizedHeight > 0.9) return 'peak';
    return 'plain';
  }

  private _calculateDensity(height: number): number {
    return Math.max(0, Math.min(1, (height + 1) / 2));
  }

  private _raiseTerrain(terrain: TerrainMap, cx: number, cy: number, amount: number, radius: number): void {
    for (let y = cy - radius; y <= cy + radius; y++) {
      for (let x = cx - radius; x <= cx + radius; x++) {
        if (y < 0 || y >= terrain.height || x < 0 || x >= terrain.width) continue;
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        if (dist <= radius) {
          const factor = 1 - dist / radius;
          terrain.points[y][x].height += amount * factor * factor;
        }
      }
    }
  }

  private _recalculateExtremes(terrain: TerrainMap): void {
    let maxH = -Infinity;
    let minH = Infinity;
    for (let y = 0; y < terrain.height; y++) {
      for (let x = 0; x < terrain.width; x++) {
        maxH = Math.max(maxH, terrain.points[y][x].height);
        minH = Math.min(minH, terrain.points[y][x].height);
      }
    }
    terrain.maxHeight = maxH;
    terrain.minHeight = minH;
  }

  private _calculateFractalDimension(terrain: TerrainMap): number {
    const counts: number[] = [];
    const sizes = [1, 2, 4, 8, 16];

    for (const size of sizes) {
      if (size >= terrain.width || size >= terrain.height) break;
      let count = 0;
      for (let y = 0; y < terrain.height - size; y += size) {
        for (let x = 0; x < terrain.width - size; x += size) {
          let minH = Infinity, maxH = -Infinity;
          for (let dy = 0; dy < size; dy++) {
            for (let dx = 0; dx < size; dx++) {
              const h = terrain.points[y + dy][x + dx].height;
              minH = Math.min(minH, h);
              maxH = Math.max(maxH, h);
            }
          }
          if (maxH - minH > 0.01) count++;
        }
      }
      counts.push(count);
    }

    if (counts.length < 2) return 2;
    const logSizes = sizes.slice(0, counts.length).map(s => Math.log(1 / s));
    const logCounts = counts.map(c => Math.log(c + 1));

    const meanX = logSizes.reduce((a, b) => a + b, 0) / logSizes.length;
    const meanY = logCounts.reduce((a, b) => a + b, 0) / logCounts.length;

    let num = 0, den = 0;
    for (let i = 0; i < logSizes.length; i++) {
      num += (logSizes[i] - meanX) * (logCounts[i] - meanY);
      den += (logSizes[i] - meanX) ** 2;
    }

    return 2 + (den > 0 ? num / den : 0);
  }

  private _traceRiver(terrain: TerrainMap, startX: number, startY: number): RiverSystem {
    const path: { x: number; y: number }[] = [];
    let x = startX;
    let y = startY;
    const visited = new Set<string>();

    while (x >= 0 && x < terrain.width && y >= 0 && y < terrain.height) {
      const key = `${x},${y}`;
      if (visited.has(key)) break;
      visited.add(key);
      path.push({ x, y });

      const lowest = this._findLowestNeighbor(terrain, x, y);
      if (!lowest) break;
      if (terrain.points[lowest.y][lowest.x].height >= terrain.points[y][x].height) break;

      x = lowest.x;
      y = lowest.y;
    }

    return {
      id: `river-${startX}-${startY}`,
      source: { x: startX, y: startY },
      mouth: path[path.length - 1] || { x: startX, y: startY },
      path,
      length: path.length,
      flowRate: Math.max(0.1, path.length / 100)
    };
  }

  private _findLowestNeighbor(terrain: TerrainMap, x: number, y: number): { x: number; y: number } | null {
    let lowestH = terrain.points[y][x].height;
    let lowest = null;

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= terrain.width || ny < 0 || ny >= terrain.height) continue;
        if (terrain.points[ny][nx].height < lowestH) {
          lowestH = terrain.points[ny][nx].height;
          lowest = { x: nx, y: ny };
        }
      }
    }
    return lowest;
  }

  private _findSteepestNeighbor(terrain: TerrainMap, x: number, y: number): { x: number; y: number } | null {
    const point = terrain.points[y][x];
    let steepestGrad = 0;
    let steepest = null;

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= terrain.width || ny < 0 || ny >= terrain.height) continue;
        const grad = point.height - terrain.points[ny][nx].height;
        if (grad > steepestGrad) {
          steepestGrad = grad;
          steepest = { x: nx, y: ny };
        }
      }
    }
    return steepest;
  }

  private _traceContour(terrain: TerrainMap, elevation: number): ContourLine {
    const points: { x: number; y: number }[] = [];
    const visited = new Set<string>();

    for (let y = 0; y < terrain.height - 1; y++) {
      for (let x = 0; x < terrain.width - 1; x++) {
        const h00 = terrain.points[y][x].height;
        const h10 = terrain.points[y][x + 1].height;
        const h01 = terrain.points[y + 1][x].height;
        const h11 = terrain.points[y + 1][x + 1].height;

        const crosses =
          (h00 - elevation) * (h10 - elevation) < 0 ||
          (h10 - elevation) * (h11 - elevation) < 0 ||
          (h01 - elevation) * (h11 - elevation) < 0 ||
          (h00 - elevation) * (h01 - elevation) < 0;

        if (crosses) {
          const key = `${x},${y}`;
          if (!visited.has(key)) {
            visited.add(key);
            points.push({ x: x + 0.5, y: y + 0.5 });
          }
        }
      }
    }

    return { elevation, points, closed: false };
  }

  private _lineOfSight(
    terrain: TerrainMap,
    x0: number, y0: number, h0: number,
    x1: number, y1: number
  ): boolean {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.ceil(dist);

    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const x = Math.floor(x0 + dx * t);
      const y = Math.floor(y0 + dy * t);
      if (x < 0 || x >= terrain.width || y < 0 || y >= terrain.height) continue;

      const terrainHeight = terrain.points[y][x].height;
      const lineHeight = h0 + (terrain.points[y1]?.[x1]?.height - h0) * t;

      if (terrainHeight > lineHeight + 0.01) {
        return false;
      }
    }
    return true;
  }

  public processPacket(packet: DataPacket<KnowledgeUnit[]>): DataPacket<TerrainMap> {
    const terrainId = packet.metadata.phase;
    const terrain = this.generateFromKnowledge(terrainId, packet.payload);
    return {
      id: `terraformed-${packet.id}`,
      payload: terrain,
      metadata: {
        ...packet.metadata,
        route: [...packet.metadata.route, 'TerrainGenerator']
      }
    };
  }

  public reset(): void {
    this._terrains.clear();
    this._currentTerrain = null;
    this._topologyCache.clear();
    this._rivers.clear();
    this._contours.clear();
  }
}
