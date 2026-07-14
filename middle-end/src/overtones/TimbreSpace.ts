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
  mahalanobis: number;
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
  private _covariance: number[][] = [];
  private _inverseCovariance: number[][] = [];

  constructor(config: TimbreConfig) {
    this._config = config;
    this._current = { ...config.reference };
    this._computeCovariance();
  }

  get pointCount(): number {
    return this._points.size;
  }

  get current(): TimbreVector {
    return { ...this._current };
  }

  get spectralEntropy(): number {
    const values = Array.from(this._points.values());
    if (values.length === 0) return 0;
    const energies = values.map((v) => v.brightness + v.warmth + v.roughness + v.richness);
    const total = energies.reduce((s, e) => s + e, 0);
    if (total === 0) return 0;
    return -energies.reduce((s, e) => {
      const p = e / total;
      return p > 0 ? s + p * Math.log2(p) : s;
    }, 0);
  }

  register(name: string, vector: TimbreVector): void {
    this._points.set(name, { ...vector });
    this._meta.lastRegistered = name;
    this._computeCovariance();
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
    const magA = Math.sqrt(a.brightness ** 2 + a.warmth ** 2 + a.roughness ** 2 + a.richness ** 2);
    const magB = Math.sqrt(b.brightness ** 2 + b.warmth ** 2 + b.roughness ** 2 + b.richness ** 2);
    const cosine = magA > 0 && magB > 0 ? dot / (magA * magB) : 0;
    const diff = [a.brightness - b.brightness, a.warmth - b.warmth, a.roughness - b.roughness, a.richness - b.richness];
    let mahalanobis = 0;
    if (this._inverseCovariance.length === 4) {
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          mahalanobis += diff[i] * this._inverseCovariance[i][j] * diff[j];
        }
      }
      mahalanobis = Math.sqrt(Math.abs(mahalanobis));
    }
    return { euclidean, manhattan, cosine, mahalanobis };
  }

  private _computeCovariance(): void {
    const values = Array.from(this._points.values());
    if (values.length < 2) {
      this._covariance = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
      this._inverseCovariance = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
      return;
    }
    const dims = ['brightness', 'warmth', 'roughness', 'richness'] as const;
    const means = dims.map((d) => values.reduce((s, v) => s + v[d], 0) / values.length);
    this._covariance = Array.from({ length: 4 }, (_, i) =>
      Array.from({ length: 4 }, (_, j) => {
        let sum = 0;
        for (const v of values) sum += (v[dims[i]] - means[i]) * (v[dims[j]] - means[j]);
        return sum / (values.length - 1);
      })
    );
    this._inverseCovariance = this._pseudoInverse(this._covariance);
  }

  private _pseudoInverse(matrix: number[][]): number[][] {
    const n = matrix.length;
    const inv = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
    );
    const a = matrix.map((row) => [...row]);
    for (let i = 0; i < n; i++) {
      let pivot = a[i][i];
      if (Math.abs(pivot) < 1e-10) {
        for (let k = i + 1; k < n; k++) {
          if (Math.abs(a[k][i]) > Math.abs(pivot)) {
            [a[i], a[k]] = [a[k], a[i]];
            [inv[i], inv[k]] = [inv[k], inv[i]];
            pivot = a[i][i];
            break;
          }
        }
      }
      if (Math.abs(pivot) < 1e-10) continue;
      for (let j = 0; j < n; j++) {
        a[i][j] /= pivot;
        inv[i][j] /= pivot;
      }
      for (let k = 0; k < n; k++) {
        if (k === i) continue;
        const factor = a[k][i];
        for (let j = 0; j < n; j++) {
          a[k][j] -= factor * a[i][j];
          inv[k][j] -= factor * inv[i][j];
        }
      }
    }
    return inv;
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
      entropy: this.spectralEntropy,
      covariance: this._covariance,
    };
  }
}
