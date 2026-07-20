import { DataPacket } from '../shared/types';

export interface Render3DConfig {
  id: string;
  camera: { position: number[]; target: number[]; up: number[]; fov: number };
  lights: { type: 'ambient' | 'directional' | 'point' | 'spot'; position: number[]; color: number[]; intensity: number }[];
  backgroundColor: number[];
  antialiasing: boolean;
  shadowsEnabled: boolean;
  postProcessing: { bloom: boolean; ssao: boolean; toneMapping: boolean; exposure: number };
  lodDistance: number[];
  clippingPlanes: { near: number; far: number };
  metadata: Record<string, unknown>;
}

export interface RealTimeAnimation {
  id: string;
  targetId: string;
  property: string;
  startValue: number | number[];
  endValue: number | number[];
  duration: number;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bounce' | 'elastic';
  loop: boolean;
  reverseOnComplete: boolean;
  delay: number;
  triggeredBy: string;
  metadata: Record<string, unknown>;
}

export interface DataVisualization {
  id: string;
  type: 'line' | 'bar' | 'scatter' | 'heatmap' | 'gauge' | 'radar' | 'pie' | '3d-surface';
  dataSource: string;
  xAxis: { label: string; min?: number; max?: number; scale: 'linear' | 'log' | 'time' };
  yAxis: { label: string; min?: number; max?: number; scale: 'linear' | 'log' };
  series: { name: string; color: number[]; style: 'solid' | 'dashed' | 'dotted'; width: number }[];
  annotations: { x: number; y: number; text: string; color: number[] }[];
  interactive: boolean;
  refreshRate: number;
  metadata: Record<string, unknown>;
}

export interface VRARConfig {
  id: string;
  type: 'vr' | 'ar' | 'mr';
  headsetType: string;
  trackingSpace: 'room-scale' | 'stationary' | 'bounded';
  handTrackingEnabled: boolean;
  gestureRecognition: boolean;
  spatialAnchors: boolean;
  passthroughEnabled: boolean;
  renderScale: number;
  foveatedRendering: boolean;
  metadata: Record<string, unknown>;
}

export interface VisualizationScene {
  id: string;
  name: string;
  renderConfig: Render3DConfig;
  animations: RealTimeAnimation[];
  visualizations: DataVisualization[];
  vrConfig?: VRARConfig;
  cameraPath?: { points: number[][]; duration: number; easing: string };
  overlays: { type: string; position: number[]; content: string; scale: number }[];
  metadata: Record<string, unknown>;
}

export interface Viewport {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  camera: { position: number[]; target: number[] };
  layerMask: number;
  visible: boolean;
}

export interface MaterialDefinition {
  id: string;
  name: string;
  type: 'standard' | 'pbr' | 'unlit' | 'wireframe' | 'transparent';
  color: number[];
  roughness: number;
  metalness: number;
  emissive: number[];
  opacity: number;
  textureMaps: Record<string, string>;
  shaderOverrides: Record<string, unknown>;
}

export interface ParticleSystem {
  id: string;
  maxParticles: number;
  emissionRate: number;
  lifetime: number;
  startSize: number;
  endSize: number;
  startColor: number[];
  endColor: number[];
  velocity: number[];
  acceleration: number[];
  shape: 'point' | 'sphere' | 'box' | 'cone';
  shapeParams: Record<string, number>;
  blendMode: 'additive' | 'blend' | 'multiply';
}

export interface PostProcessStack {
  id: string;
  effects: { type: string; enabled: boolean; parameters: Record<string, unknown> }[];
  renderTargetSize: { width: number; height: number };
  format: string;
}

export class VisualizationEngine {
  private _scenes: Map<string, VisualizationScene> = new Map();
  private _renderConfigs: Map<string, Render3DConfig> = new Map();
  private _animations: Map<string, RealTimeAnimation> = new Map();
  private _visualizations: Map<string, DataVisualization> = new Map();
  private _vrConfigs: Map<string, VRARConfig> = new Map();
  private _viewports: Map<string, Viewport> = new Map();
  private _materials: Map<string, MaterialDefinition> = new Map();
  private _particleSystems: Map<string, ParticleSystem> = new Map();
  private _postProcessStacks: Map<string, PostProcessStack> = new Map();
  private _activeSceneId: string | null = null;
  private _lastResult: VisualizationScene | null = null;
  private _counter: number = 0;
  private _fps: number = 60;
  private _frameTime: number = 16.67;
  private _renderScale: number = 1.0;
  private _vsyncEnabled: boolean = true;
  private _debugMode: boolean = false;
  private _statistics: { frameCount: number; drawCalls: number; triangleCount: number; textureMemory: number } = { frameCount: 0, drawCalls: 0, triangleCount: 0, textureMemory: 0 };
  private _layerVisibility: Map<number, boolean> = new Map();
  private _animationQueue: RealTimeAnimation[] = [];
  private _screenshotQueue: string[] = [];
  private _videoRecording: boolean = false;
  private _recordingFrameRate: number = 30;
  private _recordingQuality: number = 0.9;
  private _cameraBookmarks: Map<string, { position: number[]; target: number[]; name: string }> = new Map();
  private _theme: 'light' | 'dark' | 'high-contrast' = 'dark';
  private _performanceLog: { timestamp: number; fps: number; drawCalls: number; memory: number }[] = [];

  constructor() {
    this._initDefaultMaterials();
    this._initDefaultPostProcessStack();
  }

  private _initDefaultMaterials(): void {
    this._materials.set('default-standard', {
      id: 'default-standard',
      name: 'Default Standard',
      type: 'standard',
      color: [0.8, 0.8, 0.8],
      roughness: 0.5,
      metalness: 0.0,
      emissive: [0, 0, 0],
      opacity: 1.0,
      textureMaps: {},
      shaderOverrides: {}
    });

    this._materials.set('default-pbr', {
      id: 'default-pbr',
      name: 'Default PBR',
      type: 'pbr',
      color: [0.7, 0.7, 0.7],
      roughness: 0.3,
      metalness: 0.8,
      emissive: [0, 0, 0],
      opacity: 1.0,
      textureMaps: {},
      shaderOverrides: {}
    });

    this._materials.set('highlight-emissive', {
      id: 'highlight-emissive',
      name: 'Highlight Emissive',
      type: 'unlit',
      color: [1, 0.8, 0],
      roughness: 0,
      metalness: 0,
      emissive: [1, 0.8, 0],
      opacity: 0.8,
      textureMaps: {},
      shaderOverrides: {}
    });

    this._materials.set('transparent-glass', {
      id: 'transparent-glass',
      name: 'Transparent Glass',
      type: 'transparent',
      color: [0.9, 0.95, 1.0],
      roughness: 0.05,
      metalness: 0,
      emissive: [0, 0, 0],
      opacity: 0.3,
      textureMaps: {},
      shaderOverrides: {}
    });
  }

  private _initDefaultPostProcessStack(): void {
    this._postProcessStacks.set('default-stack', {
      id: 'default-stack',
      effects: [
        { type: 'bloom', enabled: true, parameters: { intensity: 0.5, threshold: 0.8, radius: 0.5 } },
        { type: 'tonemapping', enabled: true, parameters: { mode: 'aces', exposure: 1.0 } },
        { type: 'color-grading', enabled: false, parameters: { contrast: 1.0, saturation: 1.0 } },
        { type: 'fxaa', enabled: true, parameters: { quality: 'high' } },
        { type: 'ssao', enabled: false, parameters: { radius: 0.5, intensity: 1.0 } }
      ],
      renderTargetSize: { width: 1920, height: 1080 },
      format: 'rgba8'
    });
  }

  get scenes(): Map<string, VisualizationScene> {
    return new Map(this._scenes);
  }

  get renderConfigs(): Map<string, Render3DConfig> {
    return new Map(this._renderConfigs);
  }

  get animations(): Map<string, RealTimeAnimation> {
    return new Map(this._animations);
  }

  get visualizations(): Map<string, DataVisualization> {
    return new Map(this._visualizations);
  }

  get vrConfigs(): Map<string, VRARConfig> {
    return new Map(this._vrConfigs);
  }

  get viewports(): Map<string, Viewport> {
    return new Map(this._viewports);
  }

  get materials(): Map<string, MaterialDefinition> {
    return new Map(this._materials);
  }

  get activeSceneId(): string | null {
    return this._activeSceneId;
  }

  get activeScene(): VisualizationScene | null {
    return this._activeSceneId ? this._scenes.get(this._activeSceneId) || null : null;
  }

  get lastResult(): VisualizationScene | null {
    return this._lastResult;
  }

  get fps(): number {
    return this._fps;
  }

  get frameTime(): number {
    return this._frameTime;
  }

  get renderScale(): number {
    return this._renderScale;
  }

  get vsyncEnabled(): boolean {
    return this._vsyncEnabled;
  }

  get debugMode(): boolean {
    return this._debugMode;
  }

  get statistics(): { frameCount: number; drawCalls: number; triangleCount: number; textureMemory: number } {
    return { ...this._statistics };
  }

  get theme(): string {
    return this._theme;
  }

  get isRecording(): boolean {
    return this._videoRecording;
  }

  get totalScenes(): number {
    return this._scenes.size;
  }

  get totalAnimations(): number {
    return this._animations.size;
  }

  get totalVisualizations(): number {
    return this._visualizations.size;
  }

  setRenderScale(scale: number): void {
    this._renderScale = scale;
  }

  setVsyncEnabled(enabled: boolean): void {
    this._vsyncEnabled = enabled;
  }

  setDebugMode(enabled: boolean): void {
    this._debugMode = enabled;
  }

  setTheme(theme: 'light' | 'dark' | 'high-contrast'): void {
    this._theme = theme;
  }

  setFps(targetFps: number): void {
    this._fps = targetFps;
    this._frameTime = 1000 / targetFps;
  }

  addScene(scene: VisualizationScene): void {
    this._scenes.set(scene.id, scene);
    this._lastResult = scene;
  }

  removeScene(id: string): boolean {
    if (this._activeSceneId === id) {
      this._activeSceneId = null;
    }
    return this._scenes.delete(id);
  }

  activateScene(id: string): boolean {
    if (this._scenes.has(id)) {
      this._activeSceneId = id;
      return true;
    }
    return false;
  }

  addRenderConfig(config: Render3DConfig): void {
    this._renderConfigs.set(config.id, config);
  }

  removeRenderConfig(id: string): boolean {
    return this._renderConfigs.delete(id);
  }

  addAnimation(animation: RealTimeAnimation): void {
    this._animations.set(animation.id, animation);
  }

  removeAnimation(id: string): boolean {
    return this._animations.delete(id);
  }

  playAnimation(id: string): boolean {
    const animation = this._animations.get(id);
    if (!animation) return false;
    this._animationQueue.push(animation);
    return true;
  }

  stopAnimation(id: string): boolean {
    const idx = this._animationQueue.findIndex(a => a.id === id);
    if (idx >= 0) {
      this._animationQueue.splice(idx, 1);
      return true;
    }
    return false;
  }

  addVisualization(visualization: DataVisualization): void {
    this._visualizations.set(visualization.id, visualization);
  }

  removeVisualization(id: string): boolean {
    return this._visualizations.delete(id);
  }

  addVRConfig(config: VRARConfig): void {
    this._vrConfigs.set(config.id, config);
  }

  removeVRConfig(id: string): boolean {
    return this._vrConfigs.delete(id);
  }

  addViewport(viewport: Viewport): void {
    this._viewports.set(viewport.id, viewport);
  }

  removeViewport(id: string): boolean {
    return this._viewports.delete(id);
  }

  addMaterial(material: MaterialDefinition): void {
    this._materials.set(material.id, material);
  }

  removeMaterial(id: string): boolean {
    return this._materials.delete(id);
  }

  addParticleSystem(system: ParticleSystem): void {
    this._particleSystems.set(system.id, system);
  }

  removeParticleSystem(id: string): boolean {
    return this._particleSystems.delete(id);
  }

  addPostProcessStack(stack: PostProcessStack): void {
    this._postProcessStacks.set(stack.id, stack);
  }

  removePostProcessStack(id: string): boolean {
    return this._postProcessStacks.delete(id);
  }

  setLayerVisibility(layer: number, visible: boolean): void {
    this._layerVisibility.set(layer, visible);
  }

  isLayerVisible(layer: number): boolean {
    return this._layerVisibility.get(layer) !== false;
  }

  addCameraBookmark(id: string, name: string, position: number[], target: number[]): void {
    this._cameraBookmarks.set(id, { name, position: [...position], target: [...target] });
  }

  removeCameraBookmark(id: string): boolean {
    return this._cameraBookmarks.delete(id);
  }

  getCameraBookmarks(): Map<string, { position: number[]; target: number[]; name: string }> {
    return new Map(this._cameraBookmarks);
  }

  goToBookmark(id: string): { position: number[]; target: number[] } | null {
    const bookmark = this._cameraBookmarks.get(id);
    return bookmark ? { position: bookmark.position, target: bookmark.target } : null;
  }

  takeScreenshot(viewportId?: string): string {
    const id = `screenshot-${Date.now()}`;
    this._screenshotQueue.push(id);
    return id;
  }

  startRecording(frameRate: number = 30, quality: number = 0.9): void {
    this._videoRecording = true;
    this._recordingFrameRate = frameRate;
    this._recordingQuality = quality;
  }

  stopRecording(): string {
    this._videoRecording = false;
    return `recording-${Date.now()}.mp4`;
  }

  updateStatistics(drawCalls: number, triangleCount: number, textureMemory: number): void {
    this._statistics.frameCount++;
    this._statistics.drawCalls = drawCalls;
    this._statistics.triangleCount = triangleCount;
    this._statistics.textureMemory = textureMemory;

    this._performanceLog.push({
      timestamp: Date.now(),
      fps: this._fps,
      drawCalls,
      memory: textureMemory
    });

    if (this._performanceLog.length > 1000) {
      this._performanceLog.shift();
    }
  }

  getPerformanceLog(): { timestamp: number; fps: number; drawCalls: number; memory: number }[] {
    return [...this._performanceLog];
  }

  getAverageFrameTime(): number {
    if (this._performanceLog.length === 0) return 0;
    return this._performanceLog.reduce((sum, p) => sum + 1000 / p.fps, 0) / this._performanceLog.length;
  }

  exportScene(sceneId: string): string {
    const scene = this._scenes.get(sceneId);
    return scene ? JSON.stringify(scene, null, 2) : '';
  }

  importScene(json: string): VisualizationScene | null {
    try {
      const scene = JSON.parse(json) as VisualizationScene;
      this.addScene(scene);
      return scene;
    } catch {
      return null;
    }
  }

  cloneScene(sourceId: string, newId: string): VisualizationScene | null {
    const source = this._scenes.get(sourceId);
    if (!source) return null;
    const cloned = JSON.parse(JSON.stringify(source)) as VisualizationScene;
    cloned.id = newId;
    cloned.name = `${source.name} (Clone)`;
    this.addScene(cloned);
    return cloned;
  }

  createDataVisualizationFromSeries(seriesId: string, data: number[][]): DataVisualization {
    const viz: DataVisualization = {
      id: `viz-${seriesId}`,
      type: 'line',
      dataSource: seriesId,
      xAxis: { label: 'Time', scale: 'linear' },
      yAxis: { label: 'Value', scale: 'linear' },
      series: data.map((_, i) => ({
        name: `Series ${i + 1}`,
        color: [Math.random(), Math.random(), Math.random()],
        style: 'solid',
        width: 2
      })),
      annotations: [],
      interactive: true,
      refreshRate: 30,
      metadata: {}
    };
    this.addVisualization(viz);
    return viz;
  }

  render(): VisualizationScene | null {
    const startTime = Date.now();
    if (!this._activeSceneId) return null;

    const scene = this._scenes.get(this._activeSceneId);
    if (!scene) return null;

    this.updateStatistics(
      Math.floor(Math.random() * 1000) + 100,
      Math.floor(Math.random() * 100000) + 10000,
      Math.floor(Math.random() * 512) + 128
    );

    this._lastResult = scene;
    this._counter++;
    this._frameTime = Date.now() - startTime;
    return scene;
  }

  toPacket(): DataPacket<VisualizationScene> {
    const result = this._lastResult || {
      id: '',
      name: '',
      renderConfig: {
        id: '',
        camera: { position: [0, 0, 0], target: [0, 0, 0], up: [0, 1, 0], fov: 60 },
        lights: [],
        backgroundColor: [0, 0, 0],
        antialiasing: true,
        shadowsEnabled: true,
        postProcessing: { bloom: false, ssao: false, toneMapping: true, exposure: 1 },
        lodDistance: [],
        clippingPlanes: { near: 0.1, far: 1000 },
        metadata: {}
      },
      animations: [],
      visualizations: [],
      overlays: [],
      metadata: {}
    };
    this._counter++;
    return {
      id: `visualization-engine-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['digital-twin', 'visualization-engine'],
        priority: 1,
        phase: 'visualization'
      }
    };
  }

  reset(): void {
    this._scenes.clear();
    this._renderConfigs.clear();
    this._animations.clear();
    this._visualizations.clear();
    this._vrConfigs.clear();
    this._viewports.clear();
    this._materials.clear();
    this._particleSystems.clear();
    this._postProcessStacks.clear();
    this._activeSceneId = null;
    this._lastResult = null;
    this._counter = 0;
    this._fps = 60;
    this._frameTime = 16.67;
    this._renderScale = 1.0;
    this._vsyncEnabled = true;
    this._debugMode = false;
    this._statistics = { frameCount: 0, drawCalls: 0, triangleCount: 0, textureMemory: 0 };
    this._layerVisibility.clear();
    this._animationQueue = [];
    this._screenshotQueue = [];
    this._videoRecording = false;
    this._recordingFrameRate = 30;
    this._recordingQuality = 0.9;
    this._cameraBookmarks.clear();
    this._theme = 'dark';
    this._performanceLog = [];
    this._initDefaultMaterials();
    this._initDefaultPostProcessStack();
  }
}
