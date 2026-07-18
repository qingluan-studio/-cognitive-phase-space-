import type { DataPacket } from '../shared/types';

/**
 * StarConvergence — ★ Stellar convergence operator.
 *
 * The star sigil governs multi-path convergence, radial navigation,
 * and multi-dimensional rating. Active rays converge on a centre,
 * while diverge() re-emits them from any source point. Ratings are
 * kept as weighted scores normalised onto a 0..5 stellar scale.
 */

export interface StarRay {
  id: string;
  angle: number;       // radians, normalised to [0, 2π)
  length: number;
  intensity: number;   // 0..1
  label: string;
  isActive: boolean;
  emittedAt: number;
}

export interface ConvergencePoint {
  x: number;
  y: number;
  energy: number;
  contributing: string[]; // ray ids that joined this convergence
  timestamp: number;
}

export interface RatingDimension {
  name: string;
  score: number;   // raw 0..1
  weight: number;  // >= 0
}

export interface StellarRating {
  target: string;
  score: number; // 0..5
  dimensions: RatingDimension[];
  confidence: number;
}

interface IlluminationStats {
  coverage: number;
  brightness: number;
  focus: number;
}

interface PulseRecord {
  timestamp: number;
  intensity: number;
  rayCount: number;
  kind: 'pulse' | 'rotate' | 'extinguish';
}

export class StarConvergence {
  private _rays: Map<string, StarRay>;
  private _convergencePoints: ConvergencePoint[];
  private _ratings: Map<string, StellarRating>;
  private _centerPoint: { x: number; y: number };
  private _rayCount: number;
  private _history: PulseRecord[];
  private _counter: number;
  private _maxHistory: number = 500;
  private _pulseDecay: number = 0.95;

  constructor(center: { x: number; y: number } = { x: 0, y: 0 }) {
    this._rays = new Map();
    this._convergencePoints = [];
    this._ratings = new Map();
    this._centerPoint = { ...center };
    this._rayCount = 0;
    this._history = [];
    this._counter = 0;
    this._seedDefaultRays();
  }

  get rays(): StarRay[] {
    return Array.from(this._rays.values()).map(r => ({ ...r }));
  }

  get convergencePoints(): ConvergencePoint[] {
    return this._convergencePoints.map(p => ({
      ...p,
      contributing: [...p.contributing],
    }));
  }

  get ratings(): StellarRating[] {
    return Array.from(this._ratings.values()).map(r => ({
      ...r,
      dimensions: r.dimensions.map(d => ({ ...d })),
    }));
  }

  get centerPoint(): { x: number; y: number } {
    return { ...this._centerPoint };
  }

  get history(): PulseRecord[] {
    return this._history.map(h => ({ ...h }));
  }

  get rayCount(): number { return this._rayCount; }
  get activeRayCount(): number {
    let n = 0;
    for (const r of this._rays.values()) if (r.isActive) n++;
    return n;
  }

  private _seedDefaultRays(): void {
    const labels = [
      'north', 'northeast', 'east', 'southeast',
      'south', 'southwest', 'west', 'northwest',
    ];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      this.emitRay(angle, labels[i], 0.5);
    }
  }

  /** Emit a new ray at `angle` (radians) with the given label and intensity. */
  emitRay(angle: number, label: string, intensity: number): StarRay {
    const id = `ray-${(++this._counter).toString(36)}-${this._rayCount.toString(36)}`;
    const ray: StarRay = {
      id,
      angle: this._normalizeAngle(angle),
      length: 1.0,
      intensity: Math.max(0, Math.min(1, intensity)),
      label,
      isActive: true,
      emittedAt: Date.now(),
    };
    this._rays.set(id, ray);
    this._rayCount++;
    return { ...ray };
  }

  /**
   * Converge every active ray onto the centre, summing their intensities
   * into a single energy reading. Records a new ConvergencePoint.
   */
  converge(): ConvergencePoint {
    const active = Array.from(this._rays.values()).filter(r => r.isActive);
    let energy = 0;
    const contributing: string[] = [];
    for (const r of active) {
      energy += r.intensity * r.length;
      contributing.push(r.id);
    }
    const point: ConvergencePoint = {
      x: this._centerPoint.x,
      y: this._centerPoint.y,
      energy: active.length > 0 ? Math.min(1, energy / active.length) : 0,
      contributing,
      timestamp: Date.now(),
    };
    this._convergencePoints.push(point);
    if (this._convergencePoints.length > 100) this._convergencePoints.shift();
    return { ...point, contributing: [...point.contributing] };
  }

  /**
   * Re-centre on `source` and re-emit every existing ray outward from it,
   * boosting each ray's intensity slightly to model the radial burst.
   */
  diverge(source: { x: number; y: number }): StarRay[] {
    this._centerPoint = { ...source };
    const refreshed: StarRay[] = [];
    for (const ray of this._rays.values()) {
      const updated: StarRay = {
        ...ray,
        intensity: Math.min(1, ray.intensity + 0.1),
        emittedAt: Date.now(),
      };
      this._rays.set(ray.id, updated);
      refreshed.push({ ...updated });
    }
    return refreshed;
  }

  /**
   * Score `target` across weighted dimensions. Each dimension's score
   * is clamped to [0,1] and weights to >=0; the aggregate is rescaled
   * onto the 0..5 stellar scale.
   */
  rate(target: string, dimensions: RatingDimension[]): StellarRating {
    const totalWeight = dimensions.reduce((s, d) => s + Math.max(0, d.weight), 0);
    let weighted = 0;
    let validDims = 0;
    const normalizedDims: RatingDimension[] = dimensions.map(d => {
      const score = Math.max(0, Math.min(1, d.score));
      const weight = Math.max(0, d.weight);
      weighted += score * weight;
      if (weight > 0) validDims++;
      return { name: d.name, score, weight };
    });
    const normalized = totalWeight > 0 ? weighted / totalWeight : 0;
    const score5 = Math.round(normalized * 5 * 100) / 100;
    const confidence =
      dimensions.length > 0 ? Math.min(1, validDims / dimensions.length) : 0;
    const rating: StellarRating = {
      target,
      score: score5,
      dimensions: normalizedDims.map(d => ({ ...d })),
      confidence,
    };
    this._ratings.set(target, rating);
    return { ...rating, dimensions: rating.dimensions.map(d => ({ ...d })) };
  }

  /** Top-n ratings by descending score (defensive copies). */
  topRated(n: number): StellarRating[] {
    const all = Array.from(this._ratings.values());
    all.sort((a, b) => b.score - a.score);
    return all.slice(0, Math.max(0, Math.floor(n))).map(r => ({
      ...r,
      dimensions: r.dimensions.map(d => ({ ...d })),
    }));
  }

  /** Rotate the entire star by `angle` radians around the centre. */
  rotateStar(angle: number): void {
    const delta = this._normalizeAngle(angle);
    for (const ray of this._rays.values()) {
      ray.angle = this._normalizeAngle(ray.angle + delta);
    }
    this._history.push({
      timestamp: Date.now(),
      intensity: 0,
      rayCount: this._rays.size,
      kind: 'rotate',
    });
    this._trimHistory();
  }

  /**
   * Pulse every active ray to `intensity`, then apply a flicker decay
   * so the burst fades smoothly back toward ambient levels.
   */
  pulse(intensity: number): void {
    const level = Math.max(0, Math.min(1, intensity));
    for (const ray of this._rays.values()) {
      if (ray.isActive) ray.intensity = level;
    }
    this._history.push({
      timestamp: Date.now(),
      intensity: level,
      rayCount: this._rays.size,
      kind: 'pulse',
    });
    this._trimHistory();
    for (const ray of this._rays.values()) {
      if (ray.isActive) ray.intensity *= this._pulseDecay;
    }
  }

  /** Extinguish a single ray by id (no-op if unknown). */
  extinguish(rayId: string): void {
    const ray = this._rays.get(rayId);
    if (!ray) return;
    ray.isActive = false;
    ray.intensity = 0;
    this._history.push({
      timestamp: Date.now(),
      intensity: 0,
      rayCount: this._rays.size,
      kind: 'extinguish',
    });
    this._trimHistory();
  }

  /**
   * Illumination summary across active rays:
   *  - coverage:   fraction of rays still lit
   *  - brightness: mean intensity of lit rays
   *  - focus:      how concentrated the rays are around one direction
   */
  illuminate(): IlluminationStats {
    const total = this._rays.size;
    if (total === 0) return { coverage: 0, brightness: 0, focus: 0 };
    const active = Array.from(this._rays.values()).filter(r => r.isActive);
    const coverage = active.length / total;
    let brightness = 0;
    for (const r of active) brightness += r.intensity;
    brightness = active.length > 0 ? brightness / active.length : 0;
    let sumX = 0;
    let sumY = 0;
    let totalMag = 0;
    for (const r of active) {
      sumX += Math.cos(r.angle) * r.intensity;
      sumY += Math.sin(r.angle) * r.intensity;
      totalMag += r.intensity;
    }
    const mag = Math.sqrt(sumX * sumX + sumY * sumY);
    const focus = totalMag > 0 ? mag / totalMag : 0;
    return { coverage, brightness, focus };
  }

  /**
   * Find the active ray whose angle is closest to the bearing from the
   * centre to `target`, stretching it to reach the target. If no active
   * ray exists, a fresh ray is emitted toward the target as a fallback.
   */
  navigate(target: { x: number; y: number }): StarRay {
    const dx = target.x - this._centerPoint.x;
    const dy = target.y - this._centerPoint.y;
    const targetAngle = this._normalizeAngle(Math.atan2(dy, dx));
    const targetDist = Math.sqrt(dx * dx + dy * dy);
    let best: StarRay | null = null;
    let bestDelta = Infinity;
    for (const ray of this._rays.values()) {
      if (!ray.isActive) continue;
      let delta = Math.abs(ray.angle - targetAngle);
      if (delta > Math.PI) delta = 2 * Math.PI - delta;
      if (delta < bestDelta) {
        bestDelta = delta;
        best = ray;
      }
    }
    if (!best) {
      const emitted = this.emitRay(
        targetAngle,
        `nav-${this._counter}`,
        Math.min(1, 1 / (1 + targetDist)),
      );
      best = this._rays.get(emitted.id) || null;
    }
    if (!best) throw new Error('No ray available for navigation');
    best.length = Math.max(best.length, targetDist);
    best.intensity = Math.min(1, best.intensity + 0.2);
    return { ...best };
  }

  toPacket(): DataPacket {
    const illum = this.illuminate();
    const id = `star-${Date.now().toString(36)}-${(++this._counter).toString(36)}`;
    return {
      id,
      payload: {
        center: { ...this._centerPoint },
        rayCount: this._rayCount,
        activeRayCount: this.activeRayCount,
        convergenceCount: this._convergencePoints.length,
        ratingCount: this._ratings.size,
        illumination: illum,
        topRated: this.topRated(3).map(r => ({ target: r.target, score: r.score })),
      },
      metadata: {
        createdAt: Date.now(),
        route: ['StarConvergence'],
        priority: 1,
        phase: 'geometric-sigil',
      },
    };
  }

  private _normalizeAngle(a: number): number {
    const twoPi = Math.PI * 2;
    let r = a % twoPi;
    if (r < 0) r += twoPi;
    return r;
  }

  private _trimHistory(): void {
    while (this._history.length > this._maxHistory) this._history.shift();
  }

  reset(): void {
    this._rays.clear();
    this._convergencePoints = [];
    this._ratings.clear();
    this._centerPoint = { x: 0, y: 0 };
    this._rayCount = 0;
    this._history = [];
    this._counter = 0;
    this._seedDefaultRays();
  }
}
