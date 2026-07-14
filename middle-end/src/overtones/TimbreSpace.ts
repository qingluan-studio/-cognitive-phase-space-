/**
 * 音色空间模块：由多个音色参数构成的多维空间，每个点代表一种音色。
 * 用于在音色宇宙中定位、比较与插值。
 */

export interface TimbreVector {
  brightness: number;
  warmth: number;
  roughness: number;
  richness: number;
}

export type TimbreDistance = {
  euclidean: number;
  manhattan: number;
  cosine: number;
};

export interface TimbreConfig {
  dimensions: number;
  reference: TimbreVector;
}

export class TimbreSpace {
  private _config: TimbreConfig;
  private _points: Map<string, TimbreVector> = new Map();
  private _current: TimbreVector;
  private _meta: Record<string, unknown> = {};

  constructor(config: TimbreConfig) {
    this._config = config;
    this._current = { ...config.reference };
  }

  get pointCount(): number {
    return this._points.size;
  }

  get current(): TimbreVector {
    return { ...this._current };
  }

  register(name: string, vector: TimbreVector): void {
    this._points.set(name, { ...vector });
    this._meta.lastRegistered = name;
  }

  distance(a: TimbreVector, b: TimbreVector): TimbreDistance {
    const euclidean = Math.sqrt(
      Math.pow(a.brightness - b.brightness, 2) +
        Math.pow(a.warmth - b.warmth, 2) +
        Math.pow(a.roughness - b.roughness, 2) +
        Math.pow(a.richness - b.richness, 2)
    );
    const manhattan =
      Math.abs(a.brightness - b.brightness) +
      Math.abs(a.warmth - b.warmth) +
      Math.abs(a.roughness - b.roughness) +
      Math.abs(a.richness - b.richness);
    const dot =
      a.brightness * b.brightness +
      a.warmth * b.warmth +
      a.roughness * b.roughness +
      a.richness * b.richness;
    const magA = Math.sqrt(
      a.brightness ** 2 + a.warmth ** 2 + a.roughness ** 2 + a.richness ** 2
    );
    const magB = Math.sqrt(
      b.brightness ** 2 + b.warmth ** 2 + b.roughness ** 2 + b.richness ** 2
    );
    const cosine = magA > 0 && magB > 0 ? dot / (magA * magB) : 0;
    return { euclidean, manhattan, cosine };
  }

  moveTo(name: string): boolean {
    const target = this._points.get(name);
    if (!target) return false;
    this._current = { ...target };
    this._meta.movedTo = name;
    return true;
  }

  interpolate(target: TimbreVector, alpha: number): TimbreVector {
    const result: TimbreVector = {
      brightness: this._current.brightness * (1 - alpha) + target.brightness * alpha,
      warmth: this._current.warmth * (1 - alpha) + target.warmth * alpha,
      roughness: this._current.roughness * (1 - alpha) + target.roughness * alpha,
      richness: this._current.richness * (1 - alpha) + target.richness * alpha,
    };
    this._current = result;
    return result;
  }

  nearestNeighbor(): { name: string; distance: TimbreDistance } | null {
    let best: { name: string; distance: TimbreDistance } | null = null;
    for (const [name, v] of this._points) {
      const d = this.distance(this._current, v);
      if (!best || d.euclidean < best.distance.euclidean) {
        best = { name, distance: d };
      }
    }
    return best;
  }

  centroid(): TimbreVector {
    if (this._points.size === 0) return { ...this._config.reference };
    let brightness = 0, warmth = 0, roughness = 0, richness = 0;
    for (const v of this._points.values()) {
      brightness += v.brightness;
      warmth += v.warmth;
      roughness += v.roughness;
      richness += v.richness;
    }
    const n = this._points.size;
    return { brightness: brightness / n, warmth: warmth / n, roughness: roughness / n, richness: richness / n };
  }

  report(): Record<string, unknown> {
    return {
      pointCount: this._points.size,
      current: this._current,
      meta: this._meta,
    };
  }
}
