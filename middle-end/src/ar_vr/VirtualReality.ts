import { DataPacket } from '../shared/types';

export interface VRScene {
  objects: VRObject[];
  lights: VRLight[];
  camera: VRCamera;
  skybox: string;
}

export interface VRDevice {
  type: string;
  fov: number;
  resolution: { width: number; height: number };
  refreshRate: number;
}

interface VRObject {
  id: string;
  mesh: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

interface VRLight {
  id: string;
  type: 'directional' | 'point' | 'spot' | 'ambient';
  position: [number, number, number];
  color: string;
  intensity: number;
}

interface VRCamera {
  position: [number, number, number];
  rotation: [number, number, number];
  fov: number;
  near: number;
  far: number;
}

interface RenderFrame {
  timestamp: number;
  eye: 'left' | 'right' | 'both';
  texture: string;
  latency: number;
}

export class VirtualReality {
  private _scenes: Map<string, VRScene> = new Map();
  private _devices: Map<string, VRDevice> = new Map();
  private _frames: RenderFrame[] = [];
  private _counter = 0;
  private _renderStats = {
    totalFrames: 0,
    avgFps: 0,
    avgLatency: 0,
    droppedFrames: 0,
  };
  private _comfortSettings = {
    mode: 'normal' as 'normal' | 'comfort' | 'performance',
    vignette: 0,
    motionBlur: 0,
    fieldOfViewReduction: 0,
  };

  createScene(assets: { objects?: VRObject[]; lights?: VRLight[]; camera?: Partial<VRCamera>; skybox?: string }): VRScene {
    const scene: VRScene = {
      objects: assets.objects || [],
      lights: assets.lights || [],
      camera: {
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        fov: 90,
        near: 0.1,
        far: 1000,
        ...assets.camera,
      },
      skybox: assets.skybox || 'default',
    };
    const id = `scene-${Date.now()}-${this._counter++}`;
    this._scenes.set(id, scene);
    return scene;
  }

  addObject(scene: VRScene, object: VRObject, position: [number, number, number]): VRScene {
    const newObject = { ...object, position: [...position] as [number, number, number] };
    scene.objects.push(newObject);
    return scene;
  }

  removeObject(scene: VRScene, objectId: string): VRScene {
    scene.objects = scene.objects.filter(o => o.id !== objectId);
    return scene;
  }

  updateCamera(scene: VRScene, position: [number, number, number], rotation: [number, number, number]): VRScene {
    scene.camera.position = [...position] as [number, number, number];
    scene.camera.rotation = [...rotation] as [number, number, number];
    return scene;
  }

  renderScene(scene: VRScene, device: VRDevice): RenderFrame {
    const frame: RenderFrame = {
      timestamp: Date.now(),
      eye: 'both',
      texture: `render-${Date.now()}-${this._counter++}`,
      latency: Math.random() * 20 + 5,
    };
    this._frames.push(frame);
    if (this._frames.length > 100) this._frames.shift();
    this._updateRenderStats(frame);
    return frame;
  }

  stereoscopicRender(scene: VRScene, eyeSeparation: number): { left: RenderFrame; right: RenderFrame } {
    const leftFrame: RenderFrame = {
      timestamp: Date.now(),
      eye: 'left',
      texture: `left-${Date.now()}-${this._counter++}`,
      latency: Math.random() * 15 + 3,
    };
    const rightFrame: RenderFrame = {
      timestamp: Date.now(),
      eye: 'right',
      texture: `right-${Date.now()}-${this._counter++}`,
      latency: Math.random() * 15 + 3,
    };
    this._frames.push(leftFrame, rightFrame);
    if (this._frames.length > 200) this._frames.splice(0, this._frames.length - 200);
    this._updateRenderStats(leftFrame);
    return { left: leftFrame, right: rightFrame };
  }

  foveatedRendering(scene: VRScene, gazePoint: [number, number]): RenderFrame {
    const frame = this.renderScene(scene, {
      type: 'foveated',
      fov: 110,
      resolution: { width: 2000, height: 2000 },
      refreshRate: 90,
    });
    return {
      ...frame,
      texture: `foveated-${gazePoint[0]}-${gazePoint[1]}`,
    };
  }

  lensDistortion(image: string, k1: number, k2: number): string {
    return `distorted-${image}-k1-${k1}-k2-${k2}`;
  }

  chromaticAberration(image: string, shift: number): string {
    return `chromatic-${image}-shift-${shift}`;
  }

  timewarp(pose: { position: [number, number, number]; rotation: [number, number, number] }, latency: number): { pose: [number, number, number]; rotation: [number, number, number] } {
    const factor = latency * 0.001;
    return {
      pose: pose.position.map(p => p * (1 + factor)) as [number, number, number],
      rotation: pose.rotation.map(r => r * (1 + factor * 0.5)) as [number, number, number],
    };
  }

  spacewarp(timestamp: number, predicted: number): number {
    return timestamp + predicted * 0.8;
  }

  reprojection(pose: { position: [number, number, number]; rotation: [number, number, number] }, frame: RenderFrame): RenderFrame {
    return {
      ...frame,
      texture: `reprojected-${frame.texture}`,
      latency: frame.latency * 0.6,
    };
  }

  comfortMode(render: RenderFrame, mode: 'normal' | 'comfort' | 'performance'): RenderFrame {
    this._comfortSettings.mode = mode;
    const qualityMultiplier = mode === 'comfort' ? 0.7 : mode === 'performance' ? 0.5 : 1;
    return {
      ...render,
      latency: render.latency * qualityMultiplier,
    };
  }

  vrController(device: VRDevice, hand: 'left' | 'right', input: Record<string, unknown>): { hand: string; buttons: string[]; position: [number, number, number] } {
    return {
      hand,
      buttons: Object.keys(input).filter(k => (input[k] as boolean) === true),
      position: [Math.random(), Math.random(), Math.random()],
    };
  }

  roomScale(bounds: { width: number; height: number; depth: number }, guardian: boolean): { bounds: { width: number; height: number; depth: number }; guardian: boolean; safe: boolean } {
    const safe = bounds.width > 1 && bounds.height > 1 && bounds.depth > 1;
    return { bounds, guardian, safe };
  }

  passthrough(cameraFeed: string, overlay: string): string {
    return `passthrough-${cameraFeed}-overlay-${overlay}`;
  }

  private _updateRenderStats(frame: RenderFrame): void {
    this._renderStats.totalFrames++;
    const recent = this._frames.slice(-60);
    this._renderStats.avgFps = recent.length > 0 ? recent.length / ((recent[recent.length - 1].timestamp - recent[0].timestamp) / 1000 || 1) : 0;
    this._renderStats.avgLatency = recent.reduce((s, f) => s + f.latency, 0) / (recent.length || 1);
  }

  get sceneCount(): number {
    return this._scenes.size;
  }

  get deviceCount(): number {
    return this._devices.size;
  }

  get renderStats(): { totalFrames: number; avgFps: number; avgLatency: number; droppedFrames: number } {
    return { ...this._renderStats };
  }

  public toPacket(): DataPacket<{
    scenes: number;
    devices: number;
    frames: number;
    renderStats: { totalFrames: number; avgFps: number; avgLatency: number; droppedFrames: number };
    comfortSettings: { mode: string; vignette: number; motionBlur: number; fieldOfViewReduction: number };
  }> {
    return {
      id: `vr-${Date.now()}-${this._counter}`,
      payload: {
        scenes: this._scenes.size,
        devices: this._devices.size,
        frames: this._frames.length,
        renderStats: { ...this._renderStats },
        comfortSettings: { ...this._comfortSettings },
      },
      metadata: {
        createdAt: Date.now(),
        route: ['ar_vr', 'virtual_reality', 'result'],
        priority: 0.8,
        phase: 'rendering',
      },
    };
  }

  public reset(): void {
    this._scenes.clear();
    this._devices.clear();
    this._frames = [];
    this._counter = 0;
    this._renderStats = {
      totalFrames: 0,
      avgFps: 0,
      avgLatency: 0,
      droppedFrames: 0,
    };
    this._comfortSettings = {
      mode: 'normal',
      vignette: 0,
      motionBlur: 0,
      fieldOfViewReduction: 0,
    };
  }
}
