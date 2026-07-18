import { DataPacket, Signal } from '../shared/types';

export interface LightSource {
  id: string;
  type: 'point' | 'directional' | 'spot' | 'ambient';
  position: { x: number; y: number; z: number };
  direction: { x: number; y: number; z: number };
  color: string;
  intensity: number;
  radius: number;
  angle: number;
  falloff: number;
}

export interface LightLayout {
  id: string;
  name: string;
  sources: LightSource[];
  ambientColor: string;
  ambientIntensity: number;
  mood: string;
  contrast: number;
  warmth: number;
}

export interface ShadowMap {
  size: number;
  data: number[][];
  softness: number;
  direction: number;
}

export interface AtmosphereState {
  fogDensity: number;
  glowIntensity: number;
  bloomAmount: number;
  colorGrade: string;
  vignetteStrength: number;
}

export class LightingConductor {
  private _layouts: Map<string, LightLayout>;
  private _currentLayout: LightLayout | null;
  private _atmosphere: AtmosphereState;
  private _history: LightLayout[];
  private _shadowCache: Map<string, ShadowMap>;
  private _moodPresets: Map<string, Partial<LightLayout>>;

  constructor() {
    this._layouts = new Map();
    this._currentLayout = null;
    this._atmosphere = {
      fogDensity: 0.1,
      glowIntensity: 0.3,
      bloomAmount: 0.2,
      colorGrade: 'neutral',
      vignetteStrength: 0.3
    };
    this._history = [];
    this._shadowCache = new Map();
    this._moodPresets = new Map();
    this._initializePresets();
  }

  get layoutCount(): number { return this._layouts.size; }
  get currentLayout(): LightLayout | null { return this._currentLayout; }
  get atmosphere(): AtmosphereState { return { ...this._atmosphere }; }
  get history(): LightLayout[] { return this._history.map(l => this._cloneLayout(l)); }

  private _initializePresets(): void {
    const presets: Array<[string, Partial<LightLayout>]> = [
      ['golden_hour', {
        name: 'Golden Hour',
        ambientColor: '#FFE4B5',
        ambientIntensity: 0.4,
        mood: 'warm',
        contrast: 0.6,
        warmth: 0.9
      }],
      ['blue_hour', {
        name: 'Blue Hour',
        ambientColor: '#4A6FA5',
        ambientIntensity: 0.3,
        mood: 'cool',
        contrast: 0.7,
        warmth: 0.1
      }],
      ['noir', {
        name: 'Film Noir',
        ambientColor: '#1A1A1A',
        ambientIntensity: 0.1,
        mood: 'dramatic',
        contrast: 0.95,
        warmth: 0.2
      }],
      ['overcast', {
        name: 'Overcast',
        ambientColor: '#B0B0B0',
        ambientIntensity: 0.6,
        mood: 'flat',
        contrast: 0.2,
        warmth: 0.4
      }],
      ['neon_night', {
        name: 'Neon Night',
        ambientColor: '#0A0A1A',
        ambientIntensity: 0.05,
        mood: 'vibrant',
        contrast: 0.9,
        warmth: 0.3
      }],
      ['ethereal', {
        name: 'Ethereal',
        ambientColor: '#E8E8FF',
        ambientIntensity: 0.7,
        mood: 'dreamy',
        contrast: 0.3,
        warmth: 0.5
      }]
    ];
    for (const [name, preset] of presets) {
      this._moodPresets.set(name, preset);
    }
  }

  private _cloneLayout(layout: LightLayout): LightLayout {
    return {
      ...layout,
      sources: layout.sources.map(s => ({
        ...s,
        position: { ...s.position },
        direction: { ...s.direction }
      }))
    };
  }

  public setAtmosphere(state: Partial<AtmosphereState>): void {
    this._atmosphere = { ...this._atmosphere, ...state };
  }

  public createLayout(layoutId: string, mood: string = 'neutral'): LightLayout {
    const preset = this._moodPresets.get(mood);
    const layout: LightLayout = {
      id: layoutId,
      name: preset?.name || `Layout ${layoutId}`,
      sources: [],
      ambientColor: preset?.ambientColor || '#FFFFFF',
      ambientIntensity: preset?.ambientIntensity !== undefined ? preset.ambientIntensity : 0.3,
      mood: preset?.mood || mood,
      contrast: preset?.contrast !== undefined ? preset.contrast : 0.5,
      warmth: preset?.warmth !== undefined ? preset.warmth : 0.5
    };

    if (preset) {
      this._populatePresetSources(layout, mood);
    }

    this._layouts.set(layoutId, layout);
    this._currentLayout = layout;
    this._history.push(this._cloneLayout(layout));
    return layout;
  }

  private _populatePresetSources(layout: LightLayout, mood: string): void {
    switch (mood) {
      case 'golden_hour':
        layout.sources.push({
          id: `${layout.id}_sun`,
          type: 'directional',
          position: { x: 0.8, y: 0.2, z: 0.9 },
          direction: { x: -0.5, y: 0.3, z: -1 },
          color: '#FFD700',
          intensity: 1.2,
          radius: 1,
          angle: 45,
          falloff: 0.5
        });
        layout.sources.push({
          id: `${layout.id}_fill`,
          type: 'ambient',
          position: { x: 0.5, y: 0.5, z: 0.5 },
          direction: { x: 0, y: -1, z: 0 },
          color: '#FFA500',
          intensity: 0.3,
          radius: 1,
          angle: 360,
          falloff: 0
        });
        break;
      case 'noir':
        layout.sources.push({
          id: `${layout.id}_key`,
          type: 'spot',
          position: { x: 0.3, y: 0.9, z: 0.5 },
          direction: { x: 0.2, y: -1, z: 0 },
          color: '#FFFFEE',
          intensity: 1.5,
          radius: 0.3,
          angle: 30,
          falloff: 0.8
        });
        layout.sources.push({
          id: `${layout.id}_rim`,
          type: 'directional',
          position: { x: 0.9, y: 0.5, z: 0.2 },
          direction: { x: -1, y: 0, z: 0.1 },
          color: '#FFFFFF',
          intensity: 0.6,
          radius: 1,
          angle: 10,
          falloff: 0.3
        });
        break;
      case 'neon_night':
        const neonColors = ['#FF00FF', '#00FFFF', '#FF0080', '#80FF00'];
        for (let i = 0; i < 4; i++) {
          layout.sources.push({
            id: `${layout.id}_neon_${i}`,
            type: 'point',
            position: { 
              x: 0.2 + (i % 2) * 0.6, 
              y: 0.3 + Math.floor(i / 2) * 0.4, 
              z: 0.5 
            },
            direction: { x: 0, y: 0, z: -1 },
            color: neonColors[i],
            intensity: 0.8,
            radius: 0.2,
            angle: 360,
            falloff: 0.6
          });
        }
        break;
      default:
        layout.sources.push({
          id: `${layout.id}_key`,
          type: 'directional',
          position: { x: 0.5, y: 0.8, z: 0.7 },
          direction: { x: 0, y: -0.5, z: -1 },
          color: '#FFFFFF',
          intensity: 1,
          radius: 1,
          angle: 45,
          falloff: 0.5
        });
    }
  }

  public addLightSource(layoutId: string, source: LightSource): boolean {
    const layout = this._layouts.get(layoutId);
    if (!layout) return false;
    layout.sources.push({ ...source });
    this._shadowCache.delete(layoutId);
    return true;
  }

  public removeLightSource(layoutId: string, sourceId: string): boolean {
    const layout = this._layouts.get(layoutId);
    if (!layout) return false;
    const idx = layout.sources.findIndex(s => s.id === sourceId);
    if (idx < 0) return false;
    layout.sources.splice(idx, 1);
    this._shadowCache.delete(layoutId);
    return true;
  }

  public updateLightSource(layoutId: string, sourceId: string, updates: Partial<LightSource>): boolean {
    const layout = this._layouts.get(layoutId);
    if (!layout) return false;
    const source = layout.sources.find(s => s.id === sourceId);
    if (!source) return false;
    Object.assign(source, updates);
    if (updates.position) source.position = { ...updates.position };
    if (updates.direction) source.direction = { ...updates.direction };
    this._shadowCache.delete(layoutId);
    return true;
  }

  public calculateBrightness(layoutId: string, point: { x: number; y: number; z: number }): number {
    const layout = this._layouts.get(layoutId);
    if (!layout) return 0;

    let total = layout.ambientIntensity;

    for (const source of layout.sources) {
      const dx = point.x - source.position.x;
      const dy = point.y - source.position.y;
      const dz = point.z - source.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (source.type === 'ambient') {
        total += source.intensity;
      } else if (source.type === 'directional') {
        total += source.intensity * 0.5;
      } else {
        const attenuation = 1 / (1 + dist * source.falloff * 5);
        let spotFactor = 1;
        
        if (source.type === 'spot') {
          const angle = Math.atan2(Math.sqrt(dx * dx + dz * dz), dy) * 180 / Math.PI;
          if (angle > source.angle) {
            spotFactor = Math.max(0, 1 - (angle - source.angle) / 20);
          }
        }
        
        total += source.intensity * attenuation * spotFactor;
      }
    }

    return Math.min(1, total);
  }

  public generateShadowMap(layoutId: string, size: number = 64): ShadowMap | null {
    const cached = this._shadowCache.get(layoutId);
    if (cached && cached.size === size) return cached;

    const layout = this._layouts.get(layoutId);
    if (!layout) return null;

    const data: number[][] = [];
    const mainSource = layout.sources.find(s => s.type !== 'ambient') || layout.sources[0];
    if (!mainSource) return null;

    const lightDir = mainSource.direction;
    const lightAngle = Math.atan2(lightDir.x, lightDir.z);

    for (let y = 0; y < size; y++) {
      const row: number[] = [];
      for (let x = 0; x < size; x++) {
        const nx = x / size;
        const ny = y / size;
        
        const distFromCenter = Math.sqrt((nx - 0.5) ** 2 + (ny - 0.5) ** 2);
        const shadowBase = distFromCenter * 0.3;
        
        const dirInfluence = (Math.cos(lightAngle) * (nx - 0.5) + Math.sin(lightAngle) * (ny - 0.5)) * 0.2;
        
        let shadow = Math.max(0, Math.min(0.8, shadowBase + dirInfluence));
        
        const noise = (Math.sin(nx * 40) * Math.cos(ny * 40)) * 0.05;
        shadow += noise;
        
        row.push(Math.max(0, Math.min(1, shadow)));
      }
      data.push(row);
    }

    const shadowMap: ShadowMap = {
      size,
      data,
      softness: 0.5,
      direction: lightAngle
    };

    this._shadowCache.set(layoutId, shadowMap);
    return shadowMap;
  }

  public computeContrast(layoutId: string): number {
    const layout = this._layouts.get(layoutId);
    if (!layout) return 0;

    let maxBright = layout.ambientIntensity;
    let minBright = layout.ambientIntensity;

    const samplePoints = [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 1, z: 1 },
      { x: 0.5, y: 0.5, z: 0.5 },
      { x: 0, y: 1, z: 0 },
      { x: 1, y: 0, z: 1 }
    ];

    for (const pt of samplePoints) {
      const brightness = this.calculateBrightness(layoutId, pt);
      maxBright = Math.max(maxBright, brightness);
      minBright = Math.min(minBright, brightness);
    }

    return maxBright > 0 ? (maxBright - minBright) / maxBright : 0;
  }

  public computeMoodScore(layoutId: string): { warmth: number; drama: number; softness: number } {
    const layout = this._layouts.get(layoutId);
    if (!layout) return { warmth: 0.5, drama: 0.5, softness: 0.5 };

    const warmth = this._calculateWarmth(layout);
    const contrast = this.computeContrast(layoutId);
    const drama = contrast;
    
    const avgIntensity = layout.sources.reduce((sum, s) => sum + s.intensity, 0) / Math.max(1, layout.sources.length);
    const softness = 1 - Math.min(1, avgIntensity * 0.5 + contrast * 0.5);

    return { warmth, drama, softness };
  }

  private _calculateWarmth(layout: LightLayout): number {
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 128, g: 128, b: 128 };
    };

    let totalWarmth = 0;
    let totalIntensity = 0;

    const ambientRgb = hexToRgb(layout.ambientColor);
    const ambientWarmth = (ambientRgb.r - ambientRgb.b + 255) / 510;
    totalWarmth += ambientWarmth * layout.ambientIntensity;
    totalIntensity += layout.ambientIntensity;

    for (const source of layout.sources) {
      const rgb = hexToRgb(source.color);
      const warmth = (rgb.r - rgb.b + 255) / 510;
      totalWarmth += warmth * source.intensity;
      totalIntensity += source.intensity;
    }

    return totalIntensity > 0 ? totalWarmth / totalIntensity : 0.5;
  }

  public blendLayouts(layoutIdA: string, layoutIdB: string, ratio: number, outputId: string): LightLayout | null {
    const layoutA = this._layouts.get(layoutIdA);
    const layoutB = this._layouts.get(layoutIdB);
    if (!layoutA || !layoutB) return null;

    const blendedSources: LightSource[] = [];
    const maxSources = Math.max(layoutA.sources.length, layoutB.sources.length);
    
    for (let i = 0; i < maxSources; i++) {
      if (i < layoutA.sources.length && i < layoutB.sources.length) {
        const a = layoutA.sources[i];
        const b = layoutB.sources[i];
        blendedSources.push({
          id: `${outputId}_src_${i}`,
          type: a.type,
          position: {
            x: a.position.x * ratio + b.position.x * (1 - ratio),
            y: a.position.y * ratio + b.position.y * (1 - ratio),
            z: a.position.z * ratio + b.position.z * (1 - ratio)
          },
          direction: {
            x: a.direction.x * ratio + b.direction.x * (1 - ratio),
            y: a.direction.y * ratio + b.direction.y * (1 - ratio),
            z: a.direction.z * ratio + b.direction.z * (1 - ratio)
          },
          color: a.color,
          intensity: a.intensity * ratio + b.intensity * (1 - ratio),
          radius: a.radius * ratio + b.radius * (1 - ratio),
          angle: a.angle * ratio + b.angle * (1 - ratio),
          falloff: a.falloff * ratio + b.falloff * (1 - ratio)
        });
      } else if (i < layoutA.sources.length && ratio > 0.5) {
        blendedSources.push({ ...layoutA.sources[i], id: `${outputId}_src_${i}` });
      } else if (i < layoutB.sources.length && ratio < 0.5) {
        blendedSources.push({ ...layoutB.sources[i], id: `${outputId}_src_${i}` });
      }
    }

    const blended: LightLayout = {
      id: outputId,
      name: `Blend: ${layoutA.name} + ${layoutB.name}`,
      sources: blendedSources,
      ambientColor: layoutA.ambientColor,
      ambientIntensity: layoutA.ambientIntensity * ratio + layoutB.ambientIntensity * (1 - ratio),
      mood: `${layoutA.mood}_${layoutB.mood}`,
      contrast: layoutA.contrast * ratio + layoutB.contrast * (1 - ratio),
      warmth: layoutA.warmth * ratio + layoutB.warmth * (1 - ratio)
    };

    this._layouts.set(outputId, blended);
    this._currentLayout = blended;
    this._history.push(this._cloneLayout(blended));
    return blended;
  }

  public selectLayout(layoutId: string): LightLayout | null {
    const layout = this._layouts.get(layoutId);
    if (layout) {
      this._currentLayout = layout;
      this._history.push(this._cloneLayout(layout));
    }
    return layout || null;
  }

  public getLayout(layoutId: string): LightLayout | undefined {
    return this._layouts.get(layoutId);
  }

  public toSignal(layoutId: string): Signal | null {
    const layout = this._layouts.get(layoutId);
    if (!layout) return null;

    const moodScore = this.computeMoodScore(layoutId);

    return {
      source: `lighting_${layoutId}`,
      magnitude: moodScore.drama,
      entropy: 1 - moodScore.softness,
      timestamp: Date.now()
    };
  }

  public exportLayoutPacket(layoutId: string): DataPacket<LightLayout> | null {
    const layout = this._layouts.get(layoutId);
    if (!layout) return null;
    return {
      id: `packet_${layoutId}`,
      payload: this._cloneLayout(layout),
      metadata: {
        createdAt: Date.now(),
        route: ['procedural_art', 'lighting_conductor'],
        priority: 2,
        phase: 'illumination'
      }
    };
  }

  public reset(): void {
    this._layouts.clear();
    this._shadowCache.clear();
    this._history = [];
    this._currentLayout = null;
    this._atmosphere = {
      fogDensity: 0.1,
      glowIntensity: 0.3,
      bloomAmount: 0.2,
      colorGrade: 'neutral',
      vignetteStrength: 0.3
    };
  }

  public exportLayouts(): LightLayout[] {
    return Array.from(this._layouts.values()).map(l => this._cloneLayout(l));
  }
}
