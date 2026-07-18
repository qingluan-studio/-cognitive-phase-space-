import { DataPacket, KnowledgeUnit } from '../shared/types';

export interface SceneElement {
  id: string;
  type: 'entity' | 'background' | 'foreground' | 'effect';
  position: { x: number; y: number; z: number };
  scale: number;
  rotation: number;
  color: string;
  textureId: string;
  layer: number;
}

export interface GeneratedScene {
  id: string;
  elements: SceneElement[];
  mood: string;
  complexity: number;
  harmonyScore: number;
  focalPoint: { x: number; y: number };
  depthLayers: number;
}

export interface GenerationParams {
  seed: number;
  theme: string;
  complexity: number;
  symmetry: number;
  density: number;
  colorPalette: string[];
}

export class SceneGenerator {
  private _scenes: Map<string, GeneratedScene>;
  private _seed: number;
  private _currentParams: GenerationParams;
  private _history: GeneratedScene[];
  private _elementTemplates: Map<string, Partial<SceneElement>>;
  private _symmetryAxis: { x: number; y: number };

  constructor(initialSeed: number = Date.now()) {
    this._scenes = new Map();
    this._seed = initialSeed;
    this._currentParams = {
      seed: initialSeed,
      theme: 'abstract',
      complexity: 0.5,
      symmetry: 0.3,
      density: 0.6,
      colorPalette: ['#1a1a2e', '#16213e', '#0f3460', '#e94560', '#ffffff']
    };
    this._history = [];
    this._elementTemplates = new Map();
    this._symmetryAxis = { x: 0.5, y: 0.5 };
    this._initializeTemplates();
  }

  get sceneCount(): number { return this._scenes.size; }
  get currentSeed(): number { return this._seed; }
  get currentParams(): GenerationParams { return { ...this._currentParams }; }
  get history(): GeneratedScene[] { return this._history.map(s => ({ ...s, elements: s.elements.map(e => ({ ...e })) })); }

  private _initializeTemplates(): void {
    const templates: Array<[string, Partial<SceneElement>]> = [
      ['circle', { type: 'entity', scale: 1, rotation: 0, color: '#ffffff', textureId: 'default', layer: 5 }],
      ['rectangle', { type: 'entity', scale: 1, rotation: 0, color: '#ffffff', textureId: 'default', layer: 5 }],
      ['triangle', { type: 'entity', scale: 1, rotation: 0, color: '#ffffff', textureId: 'default', layer: 5 }],
      ['gradient_bg', { type: 'background', scale: 1, rotation: 0, color: '#1a1a2e', textureId: 'gradient', layer: 0 }],
      ['particle', { type: 'effect', scale: 0.1, rotation: 0, color: '#ffffff', textureId: 'sparkle', layer: 10 }],
      ['wave', { type: 'foreground', scale: 1, rotation: 0, color: '#e94560', textureId: 'wave', layer: 8 }],
      ['orb', { type: 'entity', scale: 0.8, rotation: 0, color: '#e94560', textureId: 'glow', layer: 6 }],
      ['crystal', { type: 'entity', scale: 0.6, rotation: 45, color: '#0f3460', textureId: 'facet', layer: 5 }]
    ];
    for (const [name, template] of templates) {
      this._elementTemplates.set(name, template);
    }
  }

  private _nextRandom(): number {
    this._seed = (this._seed * 9301 + 49297) % 233280;
    return this._seed / 233280;
  }

  private _randomRange(min: number, max: number): number {
    return min + this._nextRandom() * (max - min);
  }

  public setParams(params: Partial<GenerationParams>): void {
    this._currentParams = { ...this._currentParams, ...params };
    if (params.seed !== undefined) {
      this._seed = params.seed;
    }
  }

  public registerTemplate(name: string, template: Partial<SceneElement>): void {
    this._elementTemplates.set(name, template);
  }

  public generateScene(sceneId: string): GeneratedScene {
    const params = this._currentParams;
    const elementCount = Math.floor(5 + params.complexity * 45);
    const elements: SceneElement[] = [];

    const bgColor = params.colorPalette[0];
    elements.push({
      id: `${sceneId}_bg`,
      type: 'background',
      position: { x: 0.5, y: 0.5, z: 0 },
      scale: 1,
      rotation: 0,
      color: bgColor,
      textureId: 'gradient',
      layer: 0
    });

    const templateNames = Array.from(this._elementTemplates.keys());
    for (let i = 0; i < elementCount; i++) {
      const templateName = templateNames[Math.floor(this._nextRandom() * templateNames.length)];
      const template = this._elementTemplates.get(templateName)!;
      
      let x = this._nextRandom();
      let y = this._nextRandom();

      if (this._nextRandom() < params.symmetry) {
        x = this._symmetryAxis.x + (this._symmetryAxis.x - x) * 0.8 + this._nextRandom() * 0.05;
      }

      const paletteColor = params.colorPalette[Math.floor(this._nextRandom() * params.colorPalette.length)];
      
      const element: SceneElement = {
        id: `${sceneId}_el_${i}`,
        type: (template.type as SceneElement['type']) || 'entity',
        position: { x, y, z: this._nextRandom() * 10 },
        scale: (template.scale || 1) * this._randomRange(0.2, 2.5),
        rotation: (template.rotation || 0) + this._randomRange(0, 360),
        color: template.type === 'background' ? (template.color || paletteColor) : paletteColor,
        textureId: template.textureId || 'default',
        layer: (template.layer || 5) + Math.floor(this._nextRandom() * 3)
      };
      elements.push(element);
    }

    const focalX = elements.reduce((sum, e) => sum + e.position.x * e.scale, 0) / 
                   elements.reduce((sum, e) => sum + e.scale, 0);
    const focalY = elements.reduce((sum, e) => sum + e.position.y * e.scale, 0) / 
                   elements.reduce((sum, e) => sum + e.scale, 0);

    const harmonyScore = this._calculateHarmony(elements);
    const depthLayers = new Set(elements.map(e => e.layer)).size;

    const scene: GeneratedScene = {
      id: sceneId,
      elements,
      mood: params.theme,
      complexity: params.complexity,
      harmonyScore,
      focalPoint: { x: focalX, y: focalY },
      depthLayers
    };

    this._scenes.set(sceneId, scene);
    this._history.push(scene);
    return scene;
  }

  private _calculateHarmony(elements: SceneElement[]): number {
    if (elements.length < 2) return 1.0;

    let distributionScore = 0;
    const gridSize = 5;
    const grid: number[][] = [];
    for (let i = 0; i < gridSize; i++) {
      grid.push(new Array(gridSize).fill(0));
    }

    for (const el of elements) {
      const gx = Math.min(Math.floor(el.position.x * gridSize), gridSize - 1);
      const gy = Math.min(Math.floor(el.position.y * gridSize), gridSize - 1);
      grid[gy][gx]++;
    }

    const avgPerCell = elements.length / (gridSize * gridSize);
    let variance = 0;
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        variance += Math.pow(grid[i][j] - avgPerCell, 2);
      }
    }
    variance /= gridSize * gridSize;
    distributionScore = 1 / (1 + variance / (avgPerCell + 0.1));

    const layerSpread = new Set(elements.map(e => e.layer)).size / 12;
    const colorVariety = new Set(elements.map(e => e.color)).size / 10;

    return (distributionScore * 0.5 + layerSpread * 0.25 + Math.min(colorVariety, 1) * 0.25);
  }

  public getScene(sceneId: string): GeneratedScene | undefined {
    return this._scenes.get(sceneId);
  }

  public mutateScene(sceneId: string, mutationRate: number = 0.3): GeneratedScene | null {
    const scene = this._scenes.get(sceneId);
    if (!scene) return null;

    const mutatedElements = scene.elements.map(el => {
      if (this._nextRandom() < mutationRate) {
        return {
          ...el,
          position: {
            x: Math.max(0, Math.min(1, el.position.x + (this._nextRandom() - 0.5) * 0.2)),
            y: Math.max(0, Math.min(1, el.position.y + (this._nextRandom() - 0.5) * 0.2)),
            z: el.position.z + (this._nextRandom() - 0.5) * 2
          },
          scale: Math.max(0.1, el.scale * (1 + (this._nextRandom() - 0.5) * 0.5)),
          rotation: (el.rotation + (this._nextRandom() - 0.5) * 60) % 360
        };
      }
      return el;
    });

    const mutated: GeneratedScene = {
      ...scene,
      id: `${sceneId}_mutated_${Date.now()}`,
      elements: mutatedElements,
      harmonyScore: this._calculateHarmony(mutatedElements)
    };

    this._scenes.set(mutated.id, mutated);
    this._history.push(mutated);
    return mutated;
  }

  public blendScenes(sceneIdA: string, sceneIdB: string, blendRatio: number = 0.5): GeneratedScene | null {
    const sceneA = this._scenes.get(sceneIdA);
    const sceneB = this._scenes.get(sceneIdB);
    if (!sceneA || !sceneB) return null;

    const countA = Math.floor(sceneA.elements.length * blendRatio);
    const countB = Math.floor(sceneB.elements.length * (1 - blendRatio));
    
    const shuffledA = [...sceneA.elements].sort(() => this._nextRandom() - 0.5);
    const shuffledB = [...sceneB.elements].sort(() => this._nextRandom() - 0.5);

    const blendedElements = [
      ...shuffledA.slice(0, countA).map(e => ({ ...e, id: `${e.id}_blend` })),
      ...shuffledB.slice(0, countB).map(e => ({ ...e, id: `${e.id}_blend` }))
    ];

    const blended: GeneratedScene = {
      id: `blend_${sceneIdA}_${sceneIdB}_${Date.now()}`,
      elements: blendedElements,
      mood: `${sceneA.mood}_${sceneB.mood}`,
      complexity: (sceneA.complexity + sceneB.complexity) / 2,
      harmonyScore: this._calculateHarmony(blendedElements),
      focalPoint: {
        x: sceneA.focalPoint.x * blendRatio + sceneB.focalPoint.x * (1 - blendRatio),
        y: sceneA.focalPoint.y * blendRatio + sceneB.focalPoint.y * (1 - blendRatio)
      },
      depthLayers: new Set(blendedElements.map(e => e.layer)).size
    };

    this._scenes.set(blended.id, blended);
    this._history.push(blended);
    return blended;
  }

  public findFocalElements(sceneId: string, count: number = 3): SceneElement[] {
    const scene = this._scenes.get(sceneId);
    if (!scene) return [];

    return [...scene.elements]
      .filter(e => e.type === 'entity')
      .sort((a, b) => b.scale - a.scale)
      .slice(0, count);
  }

  public getElementsByLayer(sceneId: string, layer: number): SceneElement[] {
    const scene = this._scenes.get(sceneId);
    if (!scene) return [];
    return scene.elements.filter(e => e.layer === layer);
  }

  public exportScenePacket(sceneId: string): DataPacket<GeneratedScene> | null {
    const scene = this._scenes.get(sceneId);
    if (!scene) return null;
    return {
      id: `packet_${sceneId}`,
      payload: scene,
      metadata: {
        createdAt: Date.now(),
        route: ['procedural_art', 'scene_generator'],
        priority: 2,
        phase: 'generation'
      }
    };
  }

  public reset(): void {
    this._scenes.clear();
    this._history = [];
    this._seed = Date.now();
    this._currentParams = {
      seed: this._seed,
      theme: 'abstract',
      complexity: 0.5,
      symmetry: 0.3,
      density: 0.6,
      colorPalette: ['#1a1a2e', '#16213e', '#0f3460', '#e94560', '#ffffff']
    };
  }

  public exportScenes(): GeneratedScene[] {
    return Array.from(this._scenes.values()).map(s => ({
      ...s,
      elements: s.elements.map(e => ({ ...e }))
    }));
  }
}
