import { DataPacket, PacketMeta } from '../shared/types';
import { Point, Vector } from '../affine_geometry/AffineSpace';

export interface SectionPlane {
  id: string;
  position: Point;
  normal: Vector;
  offset: number;
}

export interface CrossSection {
  planeId: string;
  intersectionPoints: Point[];
  area: number;
  centroid: Point;
}

export interface HiddenLine {
  line: Line;
  visible: boolean;
  reason: 'occluded' | 'behind' | 'outside';
}

export interface Line {
  start: Point;
  end: Point;
}

export interface Object3D {
  vertices: Point[];
  edges: Line[];
  faces: Point[][];
}

export class SectionView {
  private _planes: Map<string, SectionPlane> = new Map();
  private _sections: Map<string, CrossSection> = new Map();
  private _hiddenLines: Map<string, HiddenLine[]> = new Map();
  private _history: unknown[] = [];

  createSection(object: Object3D, plane: SectionPlane): CrossSection {
    const intersectionPoints: Point[] = [];

    for (const edge of object.edges) {
      const intersection = this._linePlaneIntersection(edge, plane);
      if (intersection) {
        intersectionPoints.push(intersection);
      }
    }

    const area = this._polygonArea(intersectionPoints);
    const centroid = this._polygonCentroid(intersectionPoints);

    const section: CrossSection = {
      planeId: plane.id,
      intersectionPoints,
      area,
      centroid,
    };

    this._sections.set(plane.id, section);
    this._planes.set(plane.id, plane);
    this._history.push({ type: 'createSection', object, plane, result: section });
    return section;
  }

  sectionArea(section: CrossSection): number {
    return section.area;
  }

  centroid(section: CrossSection): Point {
    return section.centroid;
  }

  hiddenLineRemoval(section: CrossSection, viewType: string): HiddenLine[] {
    const hiddenLines: HiddenLine[] = [];

    for (let i = 0; i < section.intersectionPoints.length; i++) {
      for (let j = i + 1; j < section.intersectionPoints.length; j++) {
        const line: Line = {
          start: section.intersectionPoints[i],
          end: section.intersectionPoints[j],
        };

        let visible = true;
        let reason: 'occluded' | 'behind' | 'outside' = 'outside';

        for (let k = 0; k < section.intersectionPoints.length; k++) {
          if (k === i || k === j) continue;
          if (this._pointInsideTriangle(section.intersectionPoints[k], section.intersectionPoints[i], section.intersectionPoints[j], section.intersectionPoints[(j + 1) % section.intersectionPoints.length])) {
            visible = false;
            reason = 'occluded';
            break;
          }
        }

        hiddenLines.push({ line, visible, reason });
      }
    }

    this._hiddenLines.set(`${section.planeId}-${viewType}`, hiddenLines);
    this._history.push({ type: 'hiddenLineRemoval', section, viewType, result: hiddenLines });
    return hiddenLines;
  }

  multiSection(object: Object3D, planes: SectionPlane[]): CrossSection[] {
    const sections: CrossSection[] = [];
    for (const plane of planes) {
      sections.push(this.createSection(object, plane));
    }
    this._history.push({ type: 'multiSection', object, planes, result: sections });
    return sections;
  }

  sectionAnalysis(section: CrossSection): { shape: string; perimeter: number; aspectRatio: number } {
    const n = section.intersectionPoints.length;
    let perimeter = 0;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const dx = section.intersectionPoints[j].x - section.intersectionPoints[i].x;
      const dy = section.intersectionPoints[j].y - section.intersectionPoints[i].y;
      perimeter += Math.sqrt(dx * dx + dy * dy);
    }

    let shape = 'irregular';
    if (n === 3) shape = 'triangle';
    else if (n === 4) shape = 'quadrilateral';
    else if (n === 5) shape = 'pentagon';
    else if (n === 6) shape = 'hexagon';

    const aspectRatio = section.area > 0 ? perimeter * perimeter / (4 * Math.PI * section.area) : 0;

    this._history.push({ type: 'sectionAnalysis', section, result: { shape, perimeter, aspectRatio } });
    return { shape, perimeter, aspectRatio };
  }

  getSection(planeId: string): CrossSection | undefined {
    return this._sections.get(planeId);
  }

  private _linePlaneIntersection(line: Line, plane: SectionPlane): Point | null {
    const direction: Vector = {
      dx: line.end.x - line.start.x,
      dy: line.end.y - line.start.y,
      dz: line.end.z - line.start.z,
    };

    const normal = plane.normal;
    const len = Math.sqrt(normal.dx ** 2 + normal.dy ** 2 + normal.dz ** 2);
    const nx = normal.dx / len;
    const ny = normal.dy / len;
    const nz = normal.dz / len;

    const denominator = nx * direction.dx + ny * direction.dy + nz * direction.dz;
    if (Math.abs(denominator) < 1e-6) return null;

    const numerator = -(nx * line.start.x + ny * line.start.y + nz * line.start.z - plane.offset);
    const t = numerator / denominator;

    if (t < 0 || t > 1) return null;

    return {
      x: line.start.x + t * direction.dx,
      y: line.start.y + t * direction.dy,
      z: line.start.z + t * direction.dz,
    };
  }

  private _polygonArea(points: Point[]): number {
    let area = 0;
    const n = points.length;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }

    return Math.abs(area / 2);
  }

  private _polygonCentroid(points: Point[]): Point {
    const n = points.length;
    if (n === 0) return { x: 0, y: 0, z: 0 };

    let cx = 0;
    let cy = 0;
    let area = 0;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const cross = points[i].x * points[j].y - points[j].x * points[i].y;
      area += cross;
      cx += (points[i].x + points[j].x) * cross;
      cy += (points[i].y + points[j].y) * cross;
    }

    if (Math.abs(area) < 1e-6) return { x: 0, y: 0, z: 0 };

    return { x: cx / (3 * area), y: cy / (3 * area), z: 0 };
  }

  private _pointInsideTriangle(p: Point, a: Point, b: Point, c: Point): boolean {
    const areaABC = this._polygonArea([a, b, c]);
    const areaPAB = this._polygonArea([p, a, b]);
    const areaPBC = this._polygonArea([p, b, c]);
    const areaPCA = this._polygonArea([p, c, a]);

    return Math.abs(areaABC - (areaPAB + areaPBC + areaPCA)) < 1e-6;
  }

  toPacket(): DataPacket<{
    planes: Map<string, SectionPlane>;
    sections: Map<string, CrossSection>;
    hiddenLines: Map<string, HiddenLine[]>;
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['orthogonal_projection', 'SectionView'],
      priority: 1,
      phase: 'section_analysis',
    };
    return {
      id: `section-${Date.now().toString(36)}`,
      payload: {
        planes: this._planes,
        sections: this._sections,
        hiddenLines: this._hiddenLines,
      },
      metadata,
    };
  }

  reset(): void {
    this._planes = new Map();
    this._sections = new Map();
    this._hiddenLines = new Map();
    this._history = [];
  }
}
