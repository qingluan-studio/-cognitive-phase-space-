import { DataPacket, PacketMeta } from '../shared/types';
import { Point, Vector } from '../affine_geometry/AffineSpace';

export interface VanishingPoint {
  id: string;
  position: Point;
  direction: Vector;
  type: 'parallel' | 'converging' | 'circular';
}

export interface HorizonLine {
  y: number;
  vanishingPoints: string[];
  perspective: number;
}

export interface OnePointPerspective {
  centerVanishingPoint: string;
  horizon: HorizonLine;
  depthLines: Line[];
}

export interface Line {
  start: Point;
  end: Point;
}

export class VanishingPoint {
  private _points: Map<string, VanishingPoint> = new Map();
  private _horizonLines: Map<string, HorizonLine> = new Map();
  private _perspectives: Map<string, OnePointPerspective> = new Map();
  private _history: unknown[] = [];

  findVanishingPoint(lines: Line[]): VanishingPoint {
    if (lines.length < 2) {
      const vp: VanishingPoint = {
        id: 'vp-default',
        position: { x: 0, y: 0, z: 0 },
        direction: { dx: 0, dy: 0, dz: 1 },
        type: 'parallel',
      };
      this._history.push({ type: 'findVanishingPoint', lines, result: vp });
      return vp;
    }

    const line1 = lines[0];
    const line2 = lines[1];

    const dir1: Vector = {
      dx: line1.end.x - line1.start.x,
      dy: line1.end.y - line1.start.y,
      dz: line1.end.z - line1.start.z,
    };
    const dir2: Vector = {
      dx: line2.end.x - line2.start.x,
      dy: line2.end.y - line2.start.y,
      dz: line2.end.z - line2.start.z,
    };

    const cross: Vector = {
      dx: dir1.dy * dir2.dz - dir1.dz * dir2.dy,
      dy: dir1.dz * dir2.dx - dir1.dx * dir2.dz,
      dz: dir1.dx * dir2.dy - dir1.dy * dir2.dx,
    };

    const len = Math.sqrt(cross.dx ** 2 + cross.dy ** 2 + cross.dz ** 2);
    const normalizedDir: Vector = {
      dx: cross.dx / len,
      dy: cross.dy / len,
      dz: cross.dz / len,
    };

    const vp: VanishingPoint = {
      id: `vp-${Date.now().toString(36)}`,
      position: { x: 0, y: 0, z: 1000 },
      direction: normalizedDir,
      type: Math.abs(normalizedDir.dz) > 0.9 ? 'parallel' : 'converging',
    };

    this._points.set(vp.id, vp);
    this._history.push({ type: 'findVanishingPoint', lines, result: vp });
    return vp;
  }

  constructHorizon(lines: Line[]): HorizonLine {
    const vps: string[] = [];
    const step = Math.floor(lines.length / 2);

    for (let i = 0; i < lines.length; i += step) {
      const subset = lines.slice(i, Math.min(i + 2, lines.length));
      const vp = this.findVanishingPoint(subset);
      vps.push(vp.id);
    }

    const horizon: HorizonLine = {
      y: 0,
      vanishingPoints: vps,
      perspective: 0.5 + Math.random() * 0.3,
    };

    this._horizonLines.set('main', horizon);
    this._history.push({ type: 'constructHorizon', lines, result: horizon });
    return horizon;
  }

  onePointPerspective(centerVP: VanishingPoint): OnePointPerspective {
    const horizon: HorizonLine = {
      y: 0,
      vanishingPoints: [centerVP.id],
      perspective: 0.7,
    };

    const depthLines: Line[] = [];
    for (let i = -2; i <= 2; i++) {
      depthLines.push({
        start: { x: i, y: 1, z: 0 },
        end: centerVP.position,
      });
    }

    const perspective: OnePointPerspective = {
      centerVanishingPoint: centerVP.id,
      horizon,
      depthLines,
    };

    this._perspectives.set('one-point', perspective);
    this._history.push({ type: 'onePointPerspective', centerVP, result: perspective });
    return perspective;
  }

  twoPointPerspective(leftVP: VanishingPoint, rightVP: VanishingPoint): OnePointPerspective {
    const horizon: HorizonLine = {
      y: 0,
      vanishingPoints: [leftVP.id, rightVP.id],
      perspective: 0.6,
    };

    const depthLines: Line[] = [];
    for (let i = -1; i <= 1; i++) {
      depthLines.push({ start: { x: -3, y: i, z: 0 }, end: leftVP.position });
      depthLines.push({ start: { x: 3, y: i, z: 0 }, end: rightVP.position });
    }

    const perspective: OnePointPerspective = {
      centerVanishingPoint: 'two-point',
      horizon,
      depthLines,
    };

    this._perspectives.set('two-point', perspective);
    this._history.push({ type: 'twoPointPerspective', leftVP, rightVP, result: perspective });
    return perspective;
  }

  threePointPerspective(leftVP: VanishingPoint, rightVP: VanishingPoint, topVP: VanishingPoint): OnePointPerspective {
    const horizon: HorizonLine = {
      y: 0,
      vanishingPoints: [leftVP.id, rightVP.id, topVP.id],
      perspective: 0.8,
    };

    const depthLines: Line[] = [];
    for (let i = -1; i <= 1; i++) {
      depthLines.push({ start: { x: -3, y: 0, z: i }, end: leftVP.position });
      depthLines.push({ start: { x: 3, y: 0, z: i }, end: rightVP.position });
      depthLines.push({ start: { x: i, y: -3, z: 0 }, end: topVP.position });
    }

    const perspective: OnePointPerspective = {
      centerVanishingPoint: 'three-point',
      horizon,
      depthLines,
    };

    this._perspectives.set('three-point', perspective);
    this._history.push({ type: 'threePointPerspective', leftVP, rightVP, topVP, result: perspective });
    return perspective;
  }

  depthEstimation(vanishingPoint: VanishingPoint, distance: number): number {
    const depth = distance * (1 - Math.abs(vanishingPoint.direction.dz));
    this._history.push({ type: 'depthEstimation', vanishingPoint, distance, result: depth });
    return depth;
  }

  perspectiveDistortion(point: Point, vanishingPoint: VanishingPoint): Point {
    const dist = Math.sqrt(point.x ** 2 + point.y ** 2);
    const factor = 1 / (1 + dist * 0.1);

    const distorted: Point = {
      x: point.x * factor,
      y: point.y * factor,
      z: point.z + dist * 0.05,
    };

    this._history.push({ type: 'perspectiveDistortion', point, vanishingPoint, result: distorted });
    return distorted;
  }

  getVanishingPoint(id: string): VanishingPoint | undefined {
    return this._points.get(id);
  }

  toPacket(): DataPacket<{
    points: Map<string, VanishingPoint>;
    horizonLines: Map<string, HorizonLine>;
    perspectives: Map<string, OnePointPerspective>;
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['perspective_system', 'VanishingPoint'],
      priority: 1,
      phase: 'perspective_analysis',
    };
    return {
      id: `vp-${Date.now().toString(36)}`,
      payload: {
        points: this._points,
        horizonLines: this._horizonLines,
        perspectives: this._perspectives,
      },
      metadata,
    };
  }

  reset(): void {
    this._points = new Map();
    this._horizonLines = new Map();
    this._perspectives = new Map();
    this._history = [];
  }
}
