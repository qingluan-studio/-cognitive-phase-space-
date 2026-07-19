import { DataPacket, PacketMeta } from '../shared/types';
import { Point, Vector } from '../affine_geometry/AffineSpace';

export interface AnamorphicSurface {
  type: 'cylinder' | 'cone' | 'sphere' | 'plane';
  parameters: Record<string, number>;
}

export interface DistortionMap {
  originalPoint: Point;
  distortedPoint: Point;
  distortionFactor: number;
}

export interface HiddenMessage {
  id: string;
  text: string;
  surface: AnamorphicSurface;
  viewingAngle: number;
  visible: boolean;
}

export class AnamorphicProjection {
  private _surfaces: Map<string, AnamorphicSurface> = new Map();
  private _maps: Map<string, DistortionMap[]> = new Map();
  private _messages: Map<string, HiddenMessage> = new Map();
  private _history: unknown[] = [];
  private _currentAngle = 0;

  projectToSurface(image: unknown, surface: AnamorphicSurface): unknown {
    const distortionMap = this._generateDistortionMap(surface);
    this._maps.set(surface.type, distortionMap);
    this._history.push({ type: 'projectToSurface', surface, result: distortionMap });
    return distortionMap;
  }

  distort(image: unknown, distortion: DistortionMap[]): unknown {
    this._history.push({ type: 'distort', image, distortion });
    return image;
  }

  undistort(distortedImage: unknown, surface: AnamorphicSurface): unknown {
    const distortionMap = this._maps.get(surface.type) || [];
    const undistorted = distortionMap.map(dm => dm.originalPoint);
    this._history.push({ type: 'undistort', distortedImage, surface, result: undistorted });
    return undistorted;
  }

  revealMessage(messageId: string, angle: number): HiddenMessage | undefined {
    const message = this._messages.get(messageId);
    if (message) {
      const tolerance = 15;
      message.visible = Math.abs(angle - message.viewingAngle) < tolerance;
      this._currentAngle = angle;
      this._history.push({ type: 'revealMessage', messageId, angle, result: message });
    }
    return message;
  }

  cylindricalAnamorphosis(image: unknown, radius: number): unknown {
    const surface: AnamorphicSurface = { type: 'cylinder', parameters: { radius } };
    const distortionMap = this._generateDistortionMap(surface);
    this._surfaces.set(`cylinder-${radius}`, surface);
    this._maps.set(`cylinder-${radius}`, distortionMap);
    this._history.push({ type: 'cylindricalAnamorphosis', radius, result: distortionMap });
    return distortionMap;
  }

  conicalAnamorphosis(image: unknown, angle: number): unknown {
    const surface: AnamorphicSurface = { type: 'cone', parameters: { angle } };
    const distortionMap = this._generateDistortionMap(surface);
    this._surfaces.set(`cone-${angle}`, surface);
    this._maps.set(`cone-${angle}`, distortionMap);
    this._history.push({ type: 'conicalAnamorphosis', angle, result: distortionMap });
    return distortionMap;
  }

  sphericalAnamorphosis(image: unknown, radius: number): unknown {
    const surface: AnamorphicSurface = { type: 'sphere', parameters: { radius } };
    const distortionMap = this._generateDistortionMap(surface);
    this._surfaces.set(`sphere-${radius}`, surface);
    this._maps.set(`sphere-${radius}`, distortionMap);
    this._history.push({ type: 'sphericalAnamorphosis', radius, result: distortionMap });
    return distortionMap;
  }

  get getDistortionMap(): Map<string, DistortionMap[]> {
    return this._maps;
  }

  private _generateDistortionMap(surface: AnamorphicSurface): DistortionMap[] {
    const map: DistortionMap[] = [];
    const samples = 10;

    for (let i = -samples; i <= samples; i++) {
      for (let j = -samples; j <= samples; j++) {
        const original: Point = { x: i / samples, y: j / samples, z: 0 };
        let distorted: Point;
        let factor = 1;

        switch (surface.type) {
          case 'cylinder':
            const r = surface.parameters.radius || 1;
            const theta = original.x * Math.PI;
            distorted = {
              x: r * Math.cos(theta),
              y: original.y,
              z: r * Math.sin(theta),
            };
            factor = Math.abs(Math.cos(theta));
            break;
          case 'cone':
            const coneAngle = surface.parameters.angle || 45;
            const coneRadius = Math.abs(original.y) * Math.tan(coneAngle * Math.PI / 180);
            distorted = {
              x: coneRadius * Math.cos(original.x * Math.PI),
              y: original.y,
              z: coneRadius * Math.sin(original.x * Math.PI),
            };
            factor = Math.abs(Math.cos(coneAngle * Math.PI / 180));
            break;
          case 'sphere':
            const sphereR = surface.parameters.radius || 1;
            const phi = (original.y + 1) * Math.PI / 2;
            const theta2 = original.x * Math.PI;
            distorted = {
              x: sphereR * Math.sin(phi) * Math.cos(theta2),
              y: sphereR * Math.cos(phi),
              z: sphereR * Math.sin(phi) * Math.sin(theta2),
            };
            factor = Math.sin(phi);
            break;
          default:
            distorted = { ...original };
        }

        map.push({ originalPoint: original, distortedPoint: distorted, distortionFactor: factor });
      }
    }

    return map;
  }

  toPacket(): DataPacket<{
    surfaces: Map<string, AnamorphicSurface>;
    maps: Map<string, DistortionMap[]>;
    messages: Map<string, HiddenMessage>;
    currentAngle: number;
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['perspective_system', 'AnamorphicProjection'],
      priority: 1,
      phase: 'anamorphosis',
    };
    return {
      id: `anamorphic-${Date.now().toString(36)}`,
      payload: {
        surfaces: this._surfaces,
        maps: this._maps,
        messages: this._messages,
        currentAngle: this._currentAngle,
      },
      metadata,
    };
  }

  reset(): void {
    this._surfaces = new Map();
    this._maps = new Map();
    this._messages = new Map();
    this._history = [];
    this._currentAngle = 0;
  }
}
