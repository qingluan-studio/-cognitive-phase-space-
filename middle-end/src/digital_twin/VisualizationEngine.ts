import { DataPacket } from '../shared/types';

export interface Render3DConfig {
  id: string;
  scene: string;
  engine: 'webgl' | 'threejs' | 'babylon' | 'unity' | 'unreal';
  camera: {
    position: number[];
    target: number[];
    fov: number;
    near: number;
    far: number;
  };
  lighting: {
    ambient: number;
    directional: number[];
    pointLights: { position: number[]; intensity: number; color: string }[];
  };
  quality: 'low' | 'medium' | 'high' | 'ultra';
  resolution: { width: number; height: number };
  fps: number;
  lastFrameTime: number;
  frameCount: number;
}

export interface RealTimeAnimation {
  id: string;
  name: string;
  target: string;
  type: 'transform' | 'morph' | 'skeletal' | 'particle' | 'shader';
  duration: number;
  loop: boolean;
  speed: number;
  currentTime: number;
  playing: boolean;
  keyframes: { time: number; value: Record<string, number> }[];
  interpolation: 'linear' | 'cubic' | 'ease_in' | 'ease_out' | 'ease_in_out';
}

export interface DataVisualization {
  id: string;
  name: string;
  type: 'line_chart' | 'bar_chart' | 'scatter' | 'heatmap' | 'gauge' | 'histogram' | 'pie' | 'surface';
  dataSource: string;
  dimensions: { x: string; y: string; z?: string; color?: string; size?: string };
  styling: {
    colors: string[];
    lineWidth: number;
    opacity: number;
    showLegend: boolean;
    showGrid: boolean;
  };
  refreshRate: number;
  lastUpdate: number;
  dataPoints: number;
}

export interface VRARConfig {
  id: string;
  mode: 'vr' | 'ar' | 'mr';
  device: string;
  fov: number;
  ipd: number;
  tracking: '6dof' | '3dof' | 'none';
  controllers: number;
  haptics: boolean;
  passthrough: boolean;
  markers: { id: string; position: number[]; rotation: number[]; size: number[] }[];
  anchors: { id: string; position: number[]; rotation: number[] }[];
  connected: boolean;
  latency: number;
}

export interface VisualizationScene {
  id: string;
  name: string;
  objects: {
    id: string;
    type: string;
    position: number[];
    rotation: number[];
    scale: number[];
    visible: boolean;
    material: string;
  }[];
  activeCamera: string;
  activeLights: string[];
  background: string;
  fog: { enabled: boolean; color: string; density: number };
}

export interface VisualizationEngineResult {
  renderConfigs: Render3DConfig[];
  animations: RealTimeAnimation[];
  dataVisualizations: DataVisualization[];
  vrArConfigs: VRARConfig[];
  scenes: VisualizationScene[];
  totalVisualizations: number;
  renderQuality: number;
  performance: {
    avgFps: number;
    frameTime: number;
    drawCalls: number;
    triangleCount: number;
  };
}

export class VisualizationEngine {
  private _renderConfigs: Map<string, Render3DConfig> = new Map();
  private _animations: Map<string, RealTimeAnimation> = new Map();
  private _dataVisualizations: Map<string, DataVisualization> = new Map();
  private _vrArConfigs: Map<string, VRARConfig> = new Map();
  private _scenes: Map<string, VisualizationScene> = new Map();
  private _counter: number = 0;
  private _lastResult: VisualizationEngineResult | null = null;
  private _materialLibrary: Map<string, {
    name: string;
    type: string;
    color: string;
    metallic: number;
    roughness: number;
    transparent: boolean;
    opacity: number;
  }> = new Map();
  private _geometryLibrary: Map<string, {
    name: string;
    type: string;
    vertices: number;
    faces: number;
  }> = new Map();
  private _performanceStats: {
    avgFps: number;
    frameTime: number;
    drawCalls: number;
    triangleCount: number;
    totalFrames: number;
    totalRenderTime: number;
  } = {
    avgFps: 0,
    frameTime: 0,
    drawCalls: 0,
    triangleCount: 0,
    totalFrames: 0,
    totalRenderTime: 0,
  };
  private _textureLibrary: Map<string, { name: string; type: string; resolution: number[]; format: string }> = new Map();
  private _shaderLibrary: Map<string, { name: string; type: string; vertexShader: string; fragmentShader: string }> = new Map();

  constructor() {
    this._initMaterialLibrary();
    this._initGeometryLibrary();
    this._initTextureLibrary();
    this._initShaderLibrary();
  }

  private _initMaterialLibrary(): void {
    const materials = [
      { name: 'default', material: { type: 'standard', color: '#cccccc', metallic: 0, roughness: 0.5, transparent: false, opacity: 1 } },
      { name: 'metal', material: { type: 'standard', color: '#aaaaaa', metallic: 0.9, roughness: 0.1, transparent: false, opacity: 1 } },
      { name: 'glass', material: { type: 'physical', color: '#ffffff', metallic: 0, roughness: 0, transparent: true, opacity: 0.3 } },
      { name: 'plastic', material: { type: 'standard', color: '#ff6600', metallic: 0, roughness: 0.3, transparent: false, opacity: 1 } },
      { name: 'rubber', material: { type: 'standard', color: '#333333', metallic: 0, roughness: 0.9, transparent: false, opacity: 1 } },
      { name: 'glow', material: { type: 'emissive', color: '#00ffff', metallic: 0, roughness: 0, transparent: false, opacity: 1 } },
      { name: 'wireframe', material: { type: 'basic', color: '#00ff00', metallic: 0, roughness: 0, transparent: false, opacity: 1 } },
      { name: 'xray', material: { type: 'xray', color: '#88ccff', metallic: 0, roughness: 0, transparent: true, opacity: 0.5 } },
    ];
    materials.forEach(m => this._materialLibrary.set(m.name, m.material));
  }

  private _initGeometryLibrary(): void {
    const geometries = [
      { name: 'cube', geometry: { type: 'box', vertices: 8, faces: 12 } },
      { name: 'sphere', geometry: { type: 'sphere', vertices: 1024, faces: 2048 } },
      { name: 'cylinder', geometry: { type: 'cylinder', vertices: 64, faces: 128 } },
      { name: 'plane', geometry: { type: 'plane', vertices: 4, faces: 2 } },
      { name: 'torus', geometry: { type: 'torus', vertices: 256, faces: 512 } },
      { name: 'cone', geometry: { type: 'cone', vertices: 33, faces: 64 } },
    ];
    geometries.forEach(g => this._geometryLibrary.set(g.name, g.geometry));
  }

  private _initTextureLibrary(): void {
    const textures = [
      { name: 'albedo_default', texture: { type: 'albedo', resolution: [1024, 1024], format: 'png' } },
      { name: 'normal_default', texture: { type: 'normal', resolution: [1024, 1024], format: 'png' } },
      { name: 'roughness_default', texture: { type: 'roughness', resolution: [512, 512], format: 'png' } },
      { name: 'metallic_default', texture: { type: 'metallic', resolution: [512, 512], format: 'png' } },
    ];
    textures.forEach(t => this._textureLibrary.set(t.name, t.texture));
  }

  private _initShaderLibrary(): void {
    const shaders = [
      { name: 'standard', shader: { type: 'PBR', vertexShader: 'standard_vert', fragmentShader: 'standard_frag' } },
      { name: 'unlit', shader: { type: 'basic', vertexShader: 'unlit_vert', fragmentShader: 'unlit_frag' } },
      { name: 'outline', shader: { type: 'post', vertexShader: 'outline_vert', fragmentShader: 'outline_frag' } },
      { name: 'heatmap', shader: { type: 'data', vertexShader: 'heatmap_vert', fragmentShader: 'heatmap_frag' } },
    ];
    shaders.forEach(s => this._shaderLibrary.set(s.name, s.shader));
  }

  get renderConfigs(): Render3DConfig[] {
    return Array.from(this._renderConfigs.values());
  }

  get animations(): RealTimeAnimation[] {
    return Array.from(this._animations.values());
  }

  get dataVisualizations(): DataVisualization[] {
    return Array.from(this._dataVisualizations.values());
  }

  get vrArConfigs(): VRARConfig[] {
    return Array.from(this._vrArConfigs.values());
  }

  get scenes(): VisualizationScene[] {
    return Array.from(this._scenes.values());
  }

  get totalVisualizations(): number {
    return (
      this._renderConfigs.size +
      this._animations.size +
      this._dataVisualizations.size +
      this._vrArConfigs.size +
      this._scenes.size
    );
  }

  get performanceStats(): {
    avgFps: number;
    frameTime: number;
    drawCalls: number;
    triangleCount: number;
  } {
    return {
      avgFps: this._performanceStats.avgFps,
      frameTime: this._performanceStats.frameTime,
      drawCalls: this._performanceStats.drawCalls,
      triangleCount: this._performanceStats.triangleCount,
    };
  }

  createRenderConfig(
    scene: string,
    engine: 'webgl' | 'threejs' | 'babylon' | 'unity' | 'unreal',
    params: {
      quality?: 'low' | 'medium' | 'high' | 'ultra';
      resolution?: { width: number; height: number };
    } = {}
  ): Render3DConfig {
    const id = `render-${Date.now()}-${this._counter++}`;
    const quality = params.quality ?? 'high';
    const qualitySettings: Record<string, { resolution: { width: number; height: number }; fps: number }> = {
      low: { resolution: { width: 640, height: 480 }, fps: 30 },
      medium: { resolution: { width: 1280, height: 720 }, fps: 60 },
      high: { resolution: { width: 1920, height: 1080 }, fps: 60 },
      ultra: { resolution: { width: 3840, height: 2160 }, fps: 120 },
    };
    const settings = qualitySettings[quality];
    const config: Render3DConfig = {
      id,
      scene,
      engine,
      camera: {
        position: [0, 0, 10],
        target: [0, 0, 0],
        fov: 60,
        near: 0.1,
        far: 1000,
      },
      lighting: {
        ambient: 0.3,
        directional: [1, 1, 1],
        pointLights: [],
      },
      quality,
      resolution: params.resolution ?? settings.resolution,
      fps: settings.fps,
      lastFrameTime: 0,
      frameCount: 0,
    };
    this._renderConfigs.set(id, config);
    return config;
  }

  createAnimation(
    name: string,
    target: string,
    type: 'transform' | 'morph' | 'skeletal' | 'particle' | 'shader',
    duration: number,
    params: {
      loop?: boolean;
      speed?: number;
      keyframes?: { time: number; value: Record<string, number> }[];
      interpolation?: 'linear' | 'cubic' | 'ease_in' | 'ease_out' | 'ease_in_out';
    } = {}
  ): RealTimeAnimation {
    const id = `anim-${Date.now()}-${this._counter++}`;
    const animation: RealTimeAnimation = {
      id,
      name,
      target,
      type,
      duration,
      loop: params.loop ?? true,
      speed: params.speed ?? 1,
      currentTime: 0,
      playing: false,
      keyframes: params.keyframes ?? [],
      interpolation: params.interpolation ?? 'ease_in_out',
    };
    this._animations.set(id, animation);
    return animation;
  }

  createDataVisualization(
    name: string,
    type: 'line_chart' | 'bar_chart' | 'scatter' | 'heatmap' | 'gauge' | 'histogram' | 'pie' | 'surface',
    dataSource: string,
    params: {
      dimensions?: { x: string; y: string; z?: string; color?: string; size?: string };
      styling?: {
        colors: string[];
        lineWidth: number;
        opacity: number;
        showLegend: boolean;
        showGrid: boolean;
      };
      refreshRate?: number;
    } = {}
  ): DataVisualization {
    const id = `dataviz-${Date.now()}-${this._counter++}`;
    const viz: DataVisualization = {
      id,
      name,
      type,
      dataSource,
      dimensions: params.dimensions ?? { x: 'time', y: 'value' },
      styling: params.styling ?? {
        colors: ['#2196F3', '#4CAF50', '#FF9800', '#F44336', '#9C27B0'],
        lineWidth: 2,
        opacity: 0.8,
        showLegend: true,
        showGrid: true,
      },
      refreshRate: params.refreshRate ?? 30,
      lastUpdate: 0,
      dataPoints: 0,
    };
    this._dataVisualizations.set(id, viz);
    return viz;
  }

  createVRARConfig(
    mode: 'vr' | 'ar' | 'mr',
    device: string,
    params: {
      fov?: number;
      ipd?: number;
      tracking?: '6dof' | '3dof' | 'none';
      controllers?: number;
      haptics?: boolean;
      passthrough?: boolean;
    } = {}
  ): VRARConfig {
    const id = `vrar-${Date.now()}-${this._counter++}`;
    const config: VRARConfig = {
      id,
      mode,
      device,
      fov: params.fov ?? 110,
      ipd: params.ipd ?? 0.064,
      tracking: params.tracking ?? '6dof',
      controllers: params.controllers ?? 2,
      haptics: params.haptics ?? true,
      passthrough: params.passthrough ?? (mode === 'ar' || mode === 'mr'),
      markers: [],
      anchors: [],
      connected: false,
      latency: 0,
    };
    this._vrArConfigs.set(id, config);
    return config;
  }

  createScene(name: string): VisualizationScene {
    const id = `scene-${Date.now()}-${this._counter++}`;
    const scene: VisualizationScene = {
      id,
      name,
      objects: [],
      activeCamera: 'default',
      activeLights: ['default'],
      background: '#1a1a2e',
      fog: { enabled: false, color: '#1a1a2e', density: 0.01 },
    };
    this._scenes.set(id, scene);
    return scene;
  }

  addSceneObject(
    sceneId: string,
    objectId: string,
    type: string,
    params: {
      position?: number[];
      rotation?: number[];
      scale?: number[];
      visible?: boolean;
      material?: string;
    } = {}
  ): boolean {
    const scene = this._scenes.get(sceneId);
    if (!scene) return false;
    scene.objects.push({
      id: objectId,
      type,
      position: params.position ?? [0, 0, 0],
      rotation: params.rotation ?? [0, 0, 0],
      scale: params.scale ?? [1, 1, 1],
      visible: params.visible ?? true,
      material: params.material ?? 'default',
    });
    return true;
  }

  removeSceneObject(sceneId: string, objectId: string): boolean {
    const scene = this._scenes.get(sceneId);
    if (!scene) return false;
    const index = scene.objects.findIndex(o => o.id === objectId);
    if (index === -1) return false;
    scene.objects.splice(index, 1);
    return true;
  }

  updateObjectTransform(
    sceneId: string,
    objectId: string,
    transform: { position?: number[]; rotation?: number[]; scale?: number[] }
  ): boolean {
    const scene = this._scenes.get(sceneId);
    if (!scene) return false;
    const obj = scene.objects.find(o => o.id === objectId);
    if (!obj) return false;
    if (transform.position) obj.position = transform.position;
    if (transform.rotation) obj.rotation = transform.rotation;
    if (transform.scale) obj.scale = transform.scale;
    return true;
  }

  setCameraPosition(renderId: string, position: number[], target: number[]): boolean {
    const config = this._renderConfigs.get(renderId);
    if (!config) return false;
    config.camera.position = position;
    config.camera.target = target;
    return true;
  }

  addPointLight(
    renderId: string,
    position: number[],
    intensity: number,
    color: string = '#ffffff'
  ): boolean {
    const config = this._renderConfigs.get(renderId);
    if (!config) return false;
    config.lighting.pointLights.push({ position, intensity, color });
    return true;
  }

  playAnimation(animationId: string): boolean {
    const animation = this._animations.get(animationId);
    if (!animation) return false;
    animation.playing = true;
    return true;
  }

  pauseAnimation(animationId: string): boolean {
    const animation = this._animations.get(animationId);
    if (!animation) return false;
    animation.playing = false;
    return true;
  }

  seekAnimation(animationId: string, time: number): boolean {
    const animation = this._animations.get(animationId);
    if (!animation) return false;
    animation.currentTime = Math.max(0, Math.min(animation.duration, time));
    return true;
  }

  setAnimationSpeed(animationId: string, speed: number): boolean {
    const animation = this._animations.get(animationId);
    if (!animation) return false;
    animation.speed = speed;
    return true;
  }

  addKeyframe(
    animationId: string,
    time: number,
    value: Record<string, number>
  ): boolean {
    const animation = this._animations.get(animationId);
    if (!animation) return false;
    animation.keyframes.push({ time, value });
    animation.keyframes.sort((a, b) => a.time - b.time);
    return true;
  }

  updateDataVisualization(
    vizId: string,
    dataPoints: number
  ): boolean {
    const viz = this._dataVisualizations.get(vizId);
    if (!viz) return false;
    viz.lastUpdate = Date.now();
    viz.dataPoints = dataPoints;
    return true;
  }

  connectVRDevice(configId: string): boolean {
    const config = this._vrArConfigs.get(configId);
    if (!config) return false;
    config.connected = true;
    config.latency = 10 + Math.random() * 10;
    return true;
  }

  disconnectVRDevice(configId: string): boolean {
    const config = this._vrArConfigs.get(configId);
    if (!config) return false;
    config.connected = false;
    return false;
  }

  addMarker(
    configId: string,
    markerId: string,
    position: number[],
    rotation: number[],
    size: number[]
  ): boolean {
    const config = this._vrArConfigs.get(configId);
    if (!config) return false;
    config.markers.push({ id: markerId, position, rotation, size });
    return true;
  }

  addAnchor(
    configId: string,
    anchorId: string,
    position: number[],
    rotation: number[]
  ): boolean {
    const config = this._vrArConfigs.get(configId);
    if (!config) return false;
    config.anchors.push({ id: anchorId, position, rotation });
    return true;
  }

  renderFrame(renderId: string): { frameTime: number; fps: number; drawCalls: number } {
    const config = this._renderConfigs.get(renderId);
    if (!config) return { frameTime: 0, fps: 0, drawCalls: 0 };
    const frameTime = 1000 / config.fps;
    const drawCalls = Math.floor(config.resolution.width * config.resolution.height / 10000);
    config.lastFrameTime = Date.now();
    config.frameCount++;
    this._performanceStats.totalFrames++;
    this._performanceStats.totalRenderTime += frameTime;
    this._performanceStats.avgFps =
      (this._performanceStats.avgFps * (this._performanceStats.totalFrames - 1) + config.fps) /
      this._performanceStats.totalFrames;
    this._performanceStats.frameTime = frameTime;
    this._performanceStats.drawCalls = drawCalls;
    this._performanceStats.triangleCount = drawCalls * 100;
    return { frameTime, fps: config.fps, drawCalls };
  }

  setQuality(renderId: string, quality: 'low' | 'medium' | 'high' | 'ultra'): boolean {
    const config = this._renderConfigs.get(renderId);
    if (!config) return false;
    config.quality = quality;
    const qualitySettings: Record<string, { resolution: { width: number; height: number }; fps: number }> = {
      low: { resolution: { width: 640, height: 480 }, fps: 30 },
      medium: { resolution: { width: 1280, height: 720 }, fps: 60 },
      high: { resolution: { width: 1920, height: 1080 }, fps: 60 },
      ultra: { resolution: { width: 3840, height: 2160 }, fps: 120 },
    };
    const settings = qualitySettings[quality];
    config.resolution = settings.resolution;
    config.fps = settings.fps;
    return true;
  }

  getMaterialNames(): string[] {
    return Array.from(this._materialLibrary.keys());
  }

  getGeometryNames(): string[] {
    return Array.from(this._geometryLibrary.keys());
  }

  getTextureNames(): string[] {
    return Array.from(this._textureLibrary.keys());
  }

  getShaderNames(): string[] {
    return Array.from(this._shaderLibrary.keys());
  }

  toPacket(): DataPacket<VisualizationEngineResult> {
    const result: VisualizationEngineResult = {
      renderConfigs: Array.from(this._renderConfigs.values()),
      animations: Array.from(this._animations.values()),
      dataVisualizations: Array.from(this._dataVisualizations.values()),
      vrArConfigs: Array.from(this._vrArConfigs.values()),
      scenes: Array.from(this._scenes.values()),
      totalVisualizations: this.totalVisualizations,
      renderQuality: this._renderConfigs.size > 0 ? 0.85 : 0,
      performance: {
        avgFps: this._performanceStats.avgFps,
        frameTime: this._performanceStats.frameTime,
        drawCalls: this._performanceStats.drawCalls,
        triangleCount: this._performanceStats.triangleCount,
      },
    };
    this._lastResult = result;
    this._counter++;
    return {
      id: `visualization-engine-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['digital_twin', 'visualization_engine'],
        priority: 1,
        phase: 'visualization',
      },
    };
  }

  reset(): void {
    this._renderConfigs.clear();
    this._animations.clear();
    this._dataVisualizations.clear();
    this._vrArConfigs.clear();
    this._scenes.clear();
    this._counter = 0;
    this._lastResult = null;
    this._performanceStats = {
      avgFps: 0,
      frameTime: 0,
      drawCalls: 0,
      triangleCount: 0,
      totalFrames: 0,
      totalRenderTime: 0,
    };
  }
}
