import { DataPacket } from '../shared/types';

export interface Scene3D {
  meshes: Mesh[];
  materials: Material[];
  lights: Light[];
  camera: Camera;
}

export interface Mesh {
  vertices: number[];
  faces: number[];
  normals: number[];
  uv: number[];
}

interface Material {
  id: string;
  type: 'standard' | 'phong' | 'pbr' | 'basic' | 'toon';
  color: string;
  parameters: Record<string, number>;
}

interface Light {
  id: string;
  type: 'ambient' | 'directional' | 'point' | 'spot' | 'hemisphere';
  position: [number, number, number];
  color: string;
  intensity: number;
}

interface Camera {
  type: 'perspective' | 'orthographic';
  position: [number, number, number];
  target: [number, number, number];
  fov?: number;
  near: number;
  far: number;
}

interface RaycastHit {
  mesh: string;
  point: [number, number, number];
  normal: [number, number, number];
  distance: number;
}

interface PhysicsBody {
  id: string;
  mass: number;
  velocity: [number, number, number];
  position: [number, number, number];
}

export class ThreeDEngine {
  private _scenes: Map<string, Scene3D> = new Map();
  private _meshes: Map<string, Mesh> = new Map();
  private _materials: Map<string, Material> = new Map();
  private _textures: Map<string, string> = new Map();
  private _shaders: Map<string, { vertex: string; fragment: string }> = new Map();
  private _physicsBodies: Map<string, PhysicsBody> = new Map();
  private _counter = 0;
  private _renderStats = {
    drawCalls: 0,
    triangles: 0,
    fps: 60,
    frameTime: 16.67,
  };

  meshCreate(vertices: number[], indices: number[]): Mesh {
    const normals: number[] = [];
    const uv: number[] = [];
    for (let i = 0; i < vertices.length; i += 3) {
      normals.push(0, 1, 0);
      uv.push((vertices[i] + 1) / 2, (vertices[i + 1] + 1) / 2);
    }
    const mesh: Mesh = { vertices, faces: indices, normals, uv };
    const id = `mesh-${Date.now()}-${this._counter++}`;
    this._meshes.set(id, mesh);
    return mesh;
  }

  materialCreate(type: 'standard' | 'phong' | 'pbr' | 'basic' | 'toon', parameters: Record<string, unknown>): Material {
    const material: Material = {
      id: `mat-${Date.now()}-${this._counter++}`,
      type,
      color: (parameters.color as string) || '#ffffff',
      parameters: {
        roughness: 0.5,
        metalness: 0.0,
        opacity: 1.0,
        ...parameters,
      } as Record<string, number>,
    };
    this._materials.set(material.id, material);
    return material;
  }

  textureCreate(image: string, options: Record<string, unknown>): string {
    const id = `tex-${Date.now()}-${this._counter++}`;
    this._textures.set(id, image);
    return id;
  }

  lightCreate(type: 'ambient' | 'directional' | 'point' | 'spot' | 'hemisphere', position: [number, number, number], color: string, intensity: number): Light {
    return {
      id: `light-${Date.now()}-${this._counter++}`,
      type,
      position: [...position] as [number, number, number],
      color,
      intensity,
    };
  }

  cameraCreate(type: 'perspective' | 'orthographic', position: [number, number, number], target: [number, number, number]): Camera {
    return {
      type,
      position: [...position] as [number, number, number],
      target: [...target] as [number, number, number],
      fov: type === 'perspective' ? 75 : undefined,
      near: 0.1,
      far: 1000,
    };
  }

  shaderCreate(vertex: string, fragment: string): { id: string; vertex: string; fragment: string } {
    const id = `shader-${Date.now()}-${this._counter++}`;
    this._shaders.set(id, { vertex, fragment });
    return { id, vertex, fragment };
  }

  transformation(mesh: Mesh, position: [number, number, number], rotation: [number, number, number], scale: [number, number, number]): Mesh {
    return {
      ...mesh,
      vertices: mesh.vertices.map((v, i) => {
        const axis = i % 3;
        return v * scale[axis] + position[axis];
      }),
    };
  }

  modelLoad(format: string, data: string): { mesh: Mesh; materials: string[] } {
    const mesh: Mesh = {
      vertices: [],
      faces: [],
      normals: [],
      uv: [],
    };
    const vertexCount = Math.floor(Math.random() * 1000 + 100);
    for (let i = 0; i < vertexCount * 3; i++) {
      mesh.vertices.push((Math.random() - 0.5) * 2);
      mesh.normals.push((Math.random() - 0.5) * 2);
      mesh.uv.push(Math.random());
    }
    const faceCount = Math.floor(vertexCount * 0.6);
    for (let i = 0; i < faceCount * 3; i++) {
      mesh.faces.push(Math.floor(Math.random() * vertexCount));
    }
    this._counter++;
    return { mesh, materials: [`mat-${format}-default`] };
  }

  animationPlay(mesh: Mesh, animation: string, time: number): Mesh {
    const phase = time * 2;
    return {
      ...mesh,
      vertices: mesh.vertices.map((v, i) => {
        if (i % 3 === 1) {
          return v + Math.sin(phase + i * 0.1) * 0.1;
        }
        return v;
      }),
    };
  }

  skinning(mesh: Mesh, skeleton: { bones: number[]; weights: number[] }, pose: number[]): Mesh {
    return {
      ...mesh,
      vertices: mesh.vertices.map((v, i) => v + (pose[i % pose.length] || 0) * 0.01),
    };
  }

  morphTarget(mesh: Mesh, targets: Mesh[], weights: number[]): Mesh {
    const result: Mesh = { ...mesh, vertices: [...mesh.vertices] };
    for (let t = 0; t < targets.length && t < weights.length; t++) {
      const weight = weights[t];
      const target = targets[t];
      for (let i = 0; i < result.vertices.length && i < target.vertices.length; i++) {
        result.vertices[i] += (target.vertices[i] - mesh.vertices[i]) * weight;
      }
    }
    return result;
  }

  raycast(ray: { origin: [number, number, number]; direction: [number, number, number] }, objects: string[]): RaycastHit[] {
    const hits: RaycastHit[] = [];
    const hitCount = Math.floor(Math.random() * 3);
    for (let i = 0; i < hitCount; i++) {
      const dist = Math.random() * 10 + 1;
      hits.push({
        mesh: objects[Math.floor(Math.random() * objects.length)] || 'unknown',
        point: [
          ray.origin[0] + ray.direction[0] * dist,
          ray.origin[1] + ray.direction[1] * dist,
          ray.origin[2] + ray.direction[2] * dist,
        ] as [number, number, number],
        normal: [Math.random(), Math.random(), Math.random()] as [number, number, number],
        distance: dist,
      });
    }
    return hits.sort((a, b) => a.distance - b.distance);
  }

  collisionDetection(objA: string, objB: string, method: 'aabb' | 'obb' | 'sphere' | 'mesh'): { collided: boolean; normal: [number, number, number]; penetration: number } {
    const collided = Math.random() > 0.5;
    return {
      collided,
      normal: collided ? [Math.random(), Math.random(), Math.random()] as [number, number, number] : [0, 0, 0],
      penetration: collided ? Math.random() * 0.5 : 0,
    };
  }

  physicsEngine(scene: Scene3D, params: { gravity: number; damping: number }): PhysicsBody[] {
    const bodies: PhysicsBody[] = [];
    for (const mesh of scene.meshes) {
      const id = `body-${this._counter++}`;
      bodies.push({
        id,
        mass: 1,
        velocity: [0, -params.gravity * 0.016, 0],
        position: [0, 0, 0],
      });
      this._physicsBodies.set(id, bodies[bodies.length - 1]);
    }
    return bodies;
  }

  particleSystem(emitter: { position: [number, number, number]; rate: number }, texture: string, count: number): { particles: number; alive: number } {
    return {
      particles: count,
      alive: Math.floor(count * (Math.random() * 0.3 + 0.7)),
    };
  }

  get sceneCount(): number {
    return this._scenes.size;
  }

  get meshCount(): number {
    return this._meshes.size;
  }

  get materialCount(): number {
    return this._materials.size;
  }

  get renderStats(): { drawCalls: number; triangles: number; fps: number; frameTime: number } {
    return { ...this._renderStats };
  }

  public toPacket(): DataPacket<{
    scenes: number;
    meshes: number;
    materials: number;
    textures: number;
    shaders: number;
    physicsBodies: number;
    renderStats: { drawCalls: number; triangles: number; fps: number; frameTime: number };
  }> {
    return {
      id: `3d-${Date.now()}-${this._counter}`,
      payload: {
        scenes: this._scenes.size,
        meshes: this._meshes.size,
        materials: this._materials.size,
        textures: this._textures.size,
        shaders: this._shaders.size,
        physicsBodies: this._physicsBodies.size,
        renderStats: { ...this._renderStats },
      },
      metadata: {
        createdAt: Date.now(),
        route: ['ar_vr', 'three_d_engine', 'result'],
        priority: 0.7,
        phase: 'rendering',
      },
    };
  }

  public reset(): void {
    this._scenes.clear();
    this._meshes.clear();
    this._materials.clear();
    this._textures.clear();
    this._shaders.clear();
    this._physicsBodies.clear();
    this._counter = 0;
    this._renderStats = {
      drawCalls: 0,
      triangles: 0,
      fps: 60,
      frameTime: 16.67,
    };
  }
}
