import { DataPacket, Signal } from '../shared/types';

export interface TextureTile {
  id: string;
  name: string;
  size: number;
  data: number[][];
  type: 'noise' | 'pattern' | 'gradient' | 'cellular';
  seed: number;
}

export interface WeaveParams {
  tileIdA: string;
  tileIdB: string;
  blendMode: 'add' | 'multiply' | 'overlay' | 'displace';
  intensity: number;
  scale: number;
}

export interface TextureLayer {
  tileId: string;
  opacity: number;
  offsetX: number;
  offsetY: number;
  scale: number;
  rotation: number;
  blendMode: string;
}

export interface GeneratedTexture {
  id: string;
  size: number;
  layers: TextureLayer[];
  data: number[][];
  complexity: number;
  coherence: number;
}

export class TextureWeaver {
  private _tiles: Map<string, TextureTile>;
  private _textures: Map<string, GeneratedTexture>;
  private _currentSeed: number;
  private _history: GeneratedTexture[];
  private _defaultSize: number;
  private _weavePatterns: string[];

  constructor(defaultSize: number = 64) {
    this._tiles = new Map();
    this._textures = new Map();
    this._currentSeed = Date.now();
    this._history = [];
    this._defaultSize = defaultSize;
    this._weavePatterns = ['twill', 'satin', 'plain', 'herringbone', 'basket'];
    this._initializeDefaultTiles();
  }

  get tileCount(): number { return this._tiles.size; }
  get textureCount(): number { return this._textures.size; }
  get currentSeed(): number { return this._currentSeed; }
  get defaultSize(): number { return this._defaultSize; }
  get history(): GeneratedTexture[] { return this._history.map(t => ({ ...t, data: t.data.map(r => [...r]), layers: t.layers.map(l => ({ ...l })) })); }

  private _initializeDefaultTiles(): void {
    this._tiles.set('white_noise', this._generateWhiteNoise('white_noise', this._defaultSize, this._currentSeed++));
    this._tiles.set('perlin_like', this._generatePerlinLike('perlin_like', this._defaultSize, this._currentSeed++));
    this._tiles.set('gradient_linear', this._generateGradient('gradient_linear', this._defaultSize, 'linear'));
    this._tiles.set('gradient_radial', this._generateGradient('gradient_radial', this._defaultSize, 'radial'));
    this._tiles.set('cellular', this._generateCellular('cellular', this._defaultSize, this._currentSeed++));
    this._tiles.set('dots', this._generateDotsPattern('dots', this._defaultSize));
    this._tiles.set('lines', this._generateLinesPattern('lines', this._defaultSize));
  }

  private _nextRandom(seed: number): { value: number; nextSeed: number } {
    const next = (seed * 9301 + 49297) % 233280;
    return { value: next / 233280, nextSeed: next };
  }

  private _generateWhiteNoise(id: string, size: number, seed: number): TextureTile {
    const data: number[][] = [];
    let currentSeed = seed;
    for (let y = 0; y < size; y++) {
      const row: number[] = [];
      for (let x = 0; x < size; x++) {
        const { value, nextSeed } = this._nextRandom(currentSeed);
        row.push(value);
        currentSeed = nextSeed;
      }
      data.push(row);
    }
    return { id, name: 'White Noise', size, data, type: 'noise', seed };
  }

  private _generatePerlinLike(id: string, size: number, seed: number): TextureTile {
    const data: number[][] = [];
    let currentSeed = seed;
    const gridSize = 8;
    const gradients: { x: number; y: number }[][] = [];
    
    for (let y = 0; y <= gridSize; y++) {
      const row: { x: number; y: number }[] = [];
      for (let x = 0; x <= gridSize; x++) {
        const { value: angle, nextSeed } = this._nextRandom(currentSeed);
        currentSeed = nextSeed;
        const theta = angle * Math.PI * 2;
        row.push({ x: Math.cos(theta), y: Math.sin(theta) });
      }
      gradients.push(row);
    }

    const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
    const lerp = (a: number, b: number, t: number) => a + t * (b - a);
    const dotGridGradient = (ix: number, iy: number, x: number, y: number) => {
      const dx = x - ix;
      const dy = y - iy;
      return dx * gradients[iy][ix].x + dy * gradients[iy][ix].y;
    };

    for (let y = 0; y < size; y++) {
      const row: number[] = [];
      for (let x = 0; x < size; x++) {
        const px = (x / size) * gridSize;
        const py = (y / size) * gridSize;
        const x0 = Math.floor(px);
        const y0 = Math.floor(py);
        const x1 = Math.min(x0 + 1, gridSize);
        const y1 = Math.min(y0 + 1, gridSize);
        const sx = fade(px - x0);
        const sy = fade(py - y0);
        const n00 = dotGridGradient(x0, y0, px, py);
        const n10 = dotGridGradient(x1, y0, px, py);
        const n01 = dotGridGradient(x0, y1, px, py);
        const n11 = dotGridGradient(x1, y1, px, py);
        const ix0 = lerp(n00, n10, sx);
        const ix1 = lerp(n01, n11, sx);
        let value = lerp(ix0, ix1, sy);
        value = (value + 1) / 2;
        row.push(Math.max(0, Math.min(1, value)));
      }
      data.push(row);
    }

    return { id, name: 'Perlin-like Noise', size, data, type: 'noise', seed };
  }

  private _generateGradient(id: string, size: number, type: 'linear' | 'radial'): TextureTile {
    const data: number[][] = [];
    for (let y = 0; y < size; y++) {
      const row: number[] = [];
      for (let x = 0; x < size; x++) {
        let value: number;
        if (type === 'linear') {
          value = x / size;
        } else {
          const dx = (x - size / 2) / (size / 2);
          const dy = (y - size / 2) / (size / 2);
          value = Math.sqrt(dx * dx + dy * dy);
          value = Math.min(1, value);
        }
        row.push(value);
      }
      data.push(row);
    }
    return { id, name: `Gradient (${type})`, size, data, type: 'gradient', seed: 0 };
  }

  private _generateCellular(id: string, size: number, seed: number): TextureTile {
    const data: number[][] = [];
    let currentSeed = seed;
    const pointCount = 15;
    const points: { x: number; y: number }[] = [];
    
    for (let i = 0; i < pointCount; i++) {
      const { value: v1, nextSeed: s1 } = this._nextRandom(currentSeed);
      currentSeed = s1;
      const { value: v2, nextSeed: s2 } = this._nextRandom(currentSeed);
      currentSeed = s2;
      points.push({ x: v1 * size, y: v2 * size });
    }

    for (let y = 0; y < size; y++) {
      const row: number[] = [];
      for (let x = 0; x < size; x++) {
        let minDist = size * size;
        let secondMin = size * size;
        for (const p of points) {
          const dist = (x - p.x) ** 2 + (y - p.y) ** 2;
          if (dist < minDist) {
            secondMin = minDist;
            minDist = dist;
          } else if (dist < secondMin) {
            secondMin = dist;
          }
        }
        const value = 1 - Math.sqrt(minDist) / (size * 0.5);
        row.push(Math.max(0, Math.min(1, value)));
      }
      data.push(row);
    }

    return { id, name: 'Cellular', size, data, type: 'cellular', seed };
  }

  private _generateDotsPattern(id: string, size: number): TextureTile {
    const data: number[][] = [];
    const dotSpacing = 8;
    const dotRadius = 2;
    for (let y = 0; y < size; y++) {
      const row: number[] = [];
      for (let x = 0; x < size; x++) {
        const gridX = x % dotSpacing;
        const gridY = y % dotSpacing;
        const centerX = dotSpacing / 2;
        const centerY = dotSpacing / 2;
        const dist = Math.sqrt((gridX - centerX) ** 2 + (gridY - centerY) ** 2);
        row.push(dist < dotRadius ? 1 : 0);
      }
      data.push(row);
    }
    return { id, name: 'Dots Pattern', size, data, type: 'pattern', seed: 0 };
  }

  private _generateLinesPattern(id: string, size: number): TextureTile {
    const data: number[][] = [];
    const lineSpacing = 4;
    const lineWidth = 1;
    for (let y = 0; y < size; y++) {
      const row: number[] = [];
      for (let x = 0; x < size; x++) {
        const pos = (x + y) % lineSpacing;
        row.push(pos < lineWidth ? 1 : 0);
      }
      data.push(row);
    }
    return { id, name: 'Lines Pattern', size, data, type: 'pattern', seed: 0 };
  }

  public setSeed(seed: number): void {
    this._currentSeed = seed;
  }

  public getTile(tileId: string): TextureTile | undefined {
    return this._tiles.get(tileId);
  }

  public registerTile(tile: TextureTile): void {
    this._tiles.set(tile.id, tile);
  }

  public generateNoiseTile(id: string, size: number = this._defaultSize): TextureTile {
    const tile = this._generatePerlinLike(id, size, this._currentSeed++);
    this._tiles.set(id, tile);
    return tile;
  }

  public weave(params: WeaveParams, outputId: string): GeneratedTexture | null {
    const tileA = this._tiles.get(params.tileIdA);
    const tileB = this._tiles.get(params.tileIdB);
    if (!tileA || !tileB) return null;

    const size = Math.max(tileA.size, tileB.size);
    const data: number[][] = [];
    const intensity = params.intensity;

    for (let y = 0; y < size; y++) {
      const row: number[] = [];
      for (let x = 0; x < size; x++) {
        const a = tileA.data[y % tileA.size][x % tileA.size];
        const b = tileB.data[y % tileB.size][x % tileB.size];
        let result: number;

        switch (params.blendMode) {
          case 'add':
            result = Math.min(1, a + b * intensity);
            break;
          case 'multiply':
            result = a * (1 - intensity + b * intensity);
            break;
          case 'overlay':
            result = a < 0.5 
              ? 2 * a * b * intensity + a * (1 - intensity)
              : 1 - 2 * (1 - a) * (1 - b) * intensity + a * (1 - intensity);
            break;
          case 'displace':
            const dx = Math.floor((b - 0.5) * intensity * 10);
            const dy = Math.floor((b - 0.5) * intensity * 10);
            const sx = (x + dx + size) % size;
            const sy = (y + dy + size) % size;
            result = tileA.data[sy % tileA.size][sx % tileA.size];
            break;
          default:
            result = a;
        }
        row.push(Math.max(0, Math.min(1, result)));
      }
      data.push(row);
    }

    const texture: GeneratedTexture = {
      id: outputId,
      size,
      layers: [
        { tileId: params.tileIdA, opacity: 1, offsetX: 0, offsetY: 0, scale: 1, rotation: 0, blendMode: 'normal' },
        { tileId: params.tileIdB, opacity: intensity, offsetX: 0, offsetY: 0, scale: params.scale, rotation: 0, blendMode: params.blendMode }
      ],
      data,
      complexity: this._calculateComplexity(data),
      coherence: this._calculateCoherence(data)
    };

    this._textures.set(outputId, texture);
    this._history.push(texture);
    return texture;
  }

  public composeTexture(layers: TextureLayer[], outputId: string, size: number = this._defaultSize): GeneratedTexture | null {
    if (layers.length === 0) return null;

    let data: number[][] = new Array(size).fill(0).map(() => new Array(size).fill(0));

    for (const layer of layers) {
      const tile = this._tiles.get(layer.tileId);
      if (!tile) continue;

      const layerData = this._renderLayer(tile, layer, size);
      
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const alpha = layer.opacity;
          data[y][x] = data[y][x] * (1 - alpha) + layerData[y][x] * alpha;
        }
      }
    }

    const texture: GeneratedTexture = {
      id: outputId,
      size,
      layers: layers.map(l => ({ ...l })),
      data,
      complexity: this._calculateComplexity(data),
      coherence: this._calculateCoherence(data)
    };

    this._textures.set(outputId, texture);
    this._history.push(texture);
    return texture;
  }

  private _renderLayer(tile: TextureTile, layer: TextureLayer, size: number): number[][] {
    const data: number[][] = [];
    const scale = layer.scale;
    const offsetX = layer.offsetX * size;
    const offsetY = layer.offsetY * size;

    for (let y = 0; y < size; y++) {
      const row: number[] = [];
      for (let x = 0; x < size; x++) {
        const tx = ((x - offsetX) / scale + tile.size * 100) % tile.size;
        const ty = ((y - offsetY) / scale + tile.size * 100) % tile.size;
        const ix0 = Math.floor(tx);
        const iy0 = Math.floor(ty);
        const ix1 = (ix0 + 1) % tile.size;
        const iy1 = (iy0 + 1) % tile.size;
        const fx = tx - ix0;
        const fy = ty - iy0;
        
        const v00 = tile.data[iy0][ix0];
        const v10 = tile.data[iy0][ix1];
        const v01 = tile.data[iy1][ix0];
        const v11 = tile.data[iy1][ix1];
        
        const v = v00 * (1 - fx) * (1 - fy) + v10 * fx * (1 - fy) + v01 * (1 - fx) * fy + v11 * fx * fy;
        row.push(v);
      }
      data.push(row);
    }
    return data;
  }

  private _calculateComplexity(data: number[][]): number {
    const size = data.length;
    let totalChange = 0;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (x > 0) totalChange += Math.abs(data[y][x] - data[y][x - 1]);
        if (y > 0) totalChange += Math.abs(data[y][x] - data[y - 1][x]);
      }
    }
    const maxChange = size * size * 2;
    return totalChange / maxChange;
  }

  private _calculateCoherence(data: number[][]): number {
    const size = data.length;
    let localSim = 0;
    let count = 0;
    const window = 2;
    
    for (let y = window; y < size - window; y += window) {
      for (let x = window; x < size - window; x += window) {
        const center = data[y][x];
        let localVariance = 0;
        for (let dy = -window; dy <= window; dy++) {
          for (let dx = -window; dx <= window; dx++) {
            localVariance += Math.abs(data[y + dy][x + dx] - center);
          }
        }
        localSim += 1 - Math.min(1, localVariance / ((window * 2 + 1) ** 2));
        count++;
      }
    }
    return count > 0 ? localSim / count : 0;
  }

  public getTexture(textureId: string): GeneratedTexture | undefined {
    return this._textures.get(textureId);
  }

  public toSignal(textureId: string): Signal | null {
    const texture = this._textures.get(textureId);
    if (!texture) return null;

    const flat = texture.data.flat();
    const mean = flat.reduce((a, b) => a + b, 0) / flat.length;
    const variance = flat.reduce((a, b) => a + (b - mean) ** 2, 0) / flat.length;

    return {
      source: `texture_${textureId}`,
      magnitude: mean,
      entropy: variance,
      timestamp: Date.now()
    };
  }

  public exportTexturePacket(textureId: string): DataPacket<GeneratedTexture> | null {
    const texture = this._textures.get(textureId);
    if (!texture) return null;
    return {
      id: `packet_${textureId}`,
      payload: texture,
      metadata: {
        createdAt: Date.now(),
        route: ['procedural_art', 'texture_weaver'],
        priority: 2,
        phase: 'weaving'
      }
    };
  }

  public reset(): void {
    this._tiles.clear();
    this._textures.clear();
    this._history = [];
    this._currentSeed = Date.now();
    this._initializeDefaultTiles();
  }

  public exportTiles(): TextureTile[] {
    return Array.from(this._tiles.values()).map(t => ({
      ...t,
      data: t.data.map(r => [...r])
    }));
  }
}
