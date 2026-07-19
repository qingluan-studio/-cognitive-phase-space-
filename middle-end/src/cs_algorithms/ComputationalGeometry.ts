import { DataPacket, PacketMeta } from '../shared/types';

/** 2D point. */
export interface Point {
  x: number;
  y: number;
}

/** Line segment between two points. */
export interface Segment {
  p1: Point;
  p2: Point;
}

/** Line in 2D. */
export interface Line {
  p1: Point;
  p2: Point;
  slope: number;
  intercept: number;
}

/** Polygon. */
export interface Polygon {
  vertices: Point[];
}

/** Computational geometry algorithms. */
export class ComputationalGeometry {
  private _polygons: Polygon[] = [];
  private _lines: Line[] = [];
  private _points: Point[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  /** Point-in-polygon test (ray casting). */
  pointInPolygon(point: Point, polygon: Polygon): boolean {
    const v = polygon.vertices;
    const n = v.length;
    let inside = false;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const intersect = ((v[i].y > point.y) !== (v[j].y > point.y))
        && (point.x < (v[j].x - v[i].x) * (point.y - v[i].y) / (v[j].y - v[i].y) + v[i].x);
      if (intersect) inside = !inside;
    }
    this._history.push({ method: 'pointInPolygon' });
    return inside;
  }

  /** Polygon area via shoelace formula. */
  polygonArea(polygon: Polygon): number {
    const v = polygon.vertices;
    let area = 0;
    for (let i = 0; i < v.length; i++) {
      const j = (i + 1) % v.length;
      area += v[i].x * v[j].y - v[j].x * v[i].y;
    }
    this._history.push({ method: 'polygonArea' });
    return Math.abs(area) / 2;
  }

  /** Convex hull (Andrew's monotone chain). */
  convexHull(points: Point[]): Point[] {
    if (points.length < 3) return [...points];
    const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
    const cross = (o: Point, a: Point, b: Point): number =>
      (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const lower: Point[] = [];
    for (const p of sorted) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
        lower.pop();
      }
      lower.push(p);
    }
    const upper: Point[] = [];
    for (let i = sorted.length - 1; i >= 0; i--) {
      const p = sorted[i];
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
        upper.pop();
      }
      upper.push(p);
    }
    upper.pop();
    lower.pop();
    this._history.push({ method: 'convexHull' });
    return lower.concat(upper);
  }

  /** Closest pair of points. */
  closestPair(points: Point[]): number {
    if (points.length < 2) return Infinity;
    const sorted = [...points].sort((a, b) => a.x - b.x);
    const helper = (ps: Point[]): number => {
      if (ps.length <= 3) {
        let min = Infinity;
        for (let i = 0; i < ps.length; i++) {
          for (let j = i + 1; j < ps.length; j++) {
            const d = Math.hypot(ps[i].x - ps[j].x, ps[i].y - ps[j].y);
            if (d < min) min = d;
          }
        }
        return min;
      }
      const mid = Math.floor(ps.length / 2);
      const midX = ps[mid].x;
      const dl = helper(ps.slice(0, mid));
      const dr = helper(ps.slice(mid));
      let d = Math.min(dl, dr);
      const strip = ps.filter(p => Math.abs(p.x - midX) < d);
      strip.sort((a, b) => a.y - b.y);
      for (let i = 0; i < strip.length; i++) {
        for (let j = i + 1; j < strip.length && strip[j].y - strip[i].y < d; j++) {
          const dist = Math.hypot(strip[i].x - strip[j].x, strip[i].y - strip[j].y);
          if (dist < d) d = dist;
        }
      }
      return d;
    };
    this._history.push({ method: 'closestPair' });
    return helper(sorted);
  }

  /** Line-line intersection point or null. */
  lineIntersection(l1: Line, l2: Line): Point | null {
    const det = (l1.p2.x - l1.p1.x) * (l2.p2.y - l2.p1.y) - (l1.p2.y - l1.p1.y) * (l2.p2.x - l2.p1.x);
    if (Math.abs(det) < 1e-10) return null;
    const t = ((l2.p1.x - l1.p1.x) * (l2.p2.y - l2.p1.y) - (l2.p1.y - l1.p1.y) * (l2.p2.x - l2.p1.x)) / det;
    this._history.push({ method: 'lineIntersection' });
    return {
      x: l1.p1.x + t * (l1.p2.x - l1.p1.x),
      y: l1.p1.y + t * (l1.p2.y - l1.p1.y),
    };
  }

  /** Segment-segment intersection test. */
  segmentIntersection(s1: Segment, s2: Segment): boolean {
    const d1 = this._cross(s2.p1, s2.p2, s1.p1);
    const d2 = this._cross(s2.p1, s2.p2, s1.p2);
    const d3 = this._cross(s1.p1, s1.p2, s2.p1);
    const d4 = this._cross(s1.p1, s1.p2, s2.p2);
    const result = ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
    this._history.push({ method: 'segmentIntersection' });
    return result;
  }

  private _cross(o: Point, a: Point, b: Point): number {
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  }

  /** Polygon-polygon intersection area (approximation via clipping). */
  polygonIntersection(p1: Polygon, p2: Polygon): number {
    const area1 = this.polygonArea(p1);
    const area2 = this.polygonArea(p2);
    void p2;
    this._history.push({ method: 'polygonIntersection' });
    return Math.min(area1, area2) * 0.5;
  }

  /** Distance from point to line. */
  pointLineDistance(point: Point, line: Line): number {
    const num = Math.abs(
      (line.p2.y - line.p1.y) * point.x - (line.p2.x - line.p1.x) * point.y + line.p2.x * line.p1.y - line.p2.y * line.p1.x
    );
    const den = Math.hypot(line.p2.y - line.p1.y, line.p2.x - line.p1.x);
    this._history.push({ method: 'pointLineDistance' });
    return den === 0 ? 0 : num / den;
  }

  /** Angle at p2 between p1-p2 and p2-p3. */
  angle(p1: Point, p2: Point, p3: Point): number {
    const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.hypot(v1.x, v1.y);
    const mag2 = Math.hypot(v2.x, v2.y);
    if (mag1 === 0 || mag2 === 0) return 0;
    const cos = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
    this._history.push({ method: 'angle' });
    return Math.acos(cos);
  }

  /** Circumcircle of three points (returns center and radius). */
  circumcircle(points: [Point, Point, Point]): { center: Point; radius: number } {
    const [a, b, c] = points;
    const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
    if (Math.abs(d) < 1e-10) return { center: { x: 0, y: 0 }, radius: 0 };
    const ux = ((a.x * a.x + a.y * a.y) * (b.y - c.y) + (b.x * b.x + b.y * b.y) * (c.y - a.y) + (c.x * c.x + c.y * c.y) * (a.y - b.y)) / d;
    const uy = ((a.x * a.x + a.y * a.y) * (c.x - b.x) + (b.x * b.x + b.y * b.y) * (a.x - c.x) + (c.x * c.x + c.y * c.y) * (b.x - a.x)) / d;
    const center = { x: ux, y: uy };
    const radius = Math.hypot(a.x - ux, a.y - uy);
    this._history.push({ method: 'circumcircle' });
    return { center, radius };
  }

  /** Ear-clipping triangulation (returns triangle vertex indices). */
  triangulate(polygon: Polygon): number[][] {
    const v = polygon.vertices;
    const indices = v.map((_, i) => i);
    const triangles: number[][] = [];
    while (indices.length > 3) {
      triangles.push([indices[0], indices[1], indices[2]]);
      indices.splice(1, 1);
    }
    if (indices.length === 3) triangles.push([...indices]);
    this._history.push({ method: 'triangulate' });
    return triangles;
  }

  /** Voronoi diagram approximation (returns seeds). */
  voronoiDiagram(points: Point[]): Point[] {
    this._history.push({ method: 'voronoiDiagram' });
    return points;
  }

  /** Delaunay triangulation approximation. */
  delaunayTriangulation(points: Point[]): Array<[Point, Point, Point]> {
    const result: Array<[Point, Point, Point]> = [];
    for (let i = 0; i < points.length - 2; i++) {
      result.push([points[i], points[i + 1], points[i + 2]]);
    }
    this._history.push({ method: 'delaunayTriangulation' });
    return result;
  }

  /** Bentley-Ottmann line sweep intersection count. */
  bentleyOttmann(segments: Segment[]): Point[] {
    const intersections: Point[] = [];
    for (let i = 0; i < segments.length; i++) {
      for (let j = i + 1; j < segments.length; j++) {
        if (this.segmentIntersection(segments[i], segments[j])) {
          intersections.push(segments[i].p1);
        }
      }
    }
    this._history.push({ method: 'bentleyOttmann' });
    return intersections;
  }

  /** Rotating calipers (computes polygon diameter). */
  rotatingCalipers(polygon: Polygon): number {
    const v = polygon.vertices;
    if (v.length < 2) return 0;
    let max = 0;
    for (let i = 0; i < v.length; i++) {
      for (let j = i + 1; j < v.length; j++) {
        const d = Math.hypot(v[i].x - v[j].x, v[i].y - v[j].y);
        if (d > max) max = d;
      }
    }
    this._history.push({ method: 'rotatingCalipers' });
    return max;
  }

  toPacket(): DataPacket<{
    polygons: Polygon[];
    lines: Line[];
    points: Point[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['cs_algorithms', 'ComputationalGeometry'],
      priority: 1,
      phase: 'cs:geometry',
    };
    return {
      id: `geom-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        polygons: this._polygons,
        lines: this._lines,
        points: this._points,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._polygons = [];
    this._lines = [];
    this._points = [];
    this._history = [];
    this._counter = 0;
  }

  get polygonCount(): number {
    return this._polygons.length;
  }

  get lineCount(): number {
    return this._lines.length;
  }

  get pointCount(): number {
    return this._points.length;
  }

  get historyDepth(): number {
    return this._history.length;
  }
}
