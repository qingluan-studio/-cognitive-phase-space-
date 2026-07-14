export interface BridgeEndpoint {
  time: number;
  value: number;
}

export interface BridgePath {
  id: string;
  start: BridgeEndpoint;
  end: BridgeEndpoint;
  waypoints: BridgeEndpoint[];
  variance: number;
  createdAt: number;
}

export class BrownianBridge {
  private _paths: BridgePath[] = [];
  private _steps = 50;
  private _volatility = 0.1;
  private _rngState = 12345;

  build(start: BridgeEndpoint, end: BridgeEndpoint): BridgePath {
    const waypoints: BridgeEndpoint[] = [start];
    const T = Math.max(1e-6, end.time - start.time);
    const dt = T / this._steps;
    const sigma = this._volatility * Math.sqrt(dt);

    let current = start.value;
    for (let i = 1; i < this._steps; i++) {
      const t = i / this._steps;
      const driftToEndpoint = (end.value - current) * (1 / (this._steps - i));
      const bridgeMean = start.value + t * (end.value - start.value);
      const shock = this._gaussian() * sigma;
      const bridgeCorrection = (bridgeMean - current) * dt / T;
      const value = current + driftToEndpoint * dt + bridgeCorrection + shock;
      current = value;
      waypoints.push({ time: start.time + i * dt, value });
    }
    waypoints.push(end);

    const path: BridgePath = {
      id: `bridge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      start,
      end,
      waypoints,
      variance: this._computeVariance(waypoints),
      createdAt: Date.now(),
    };
    this._paths.push(path);
    if (this._paths.length > 100) this._paths.shift();
    return path;
  }

  analyticalMean(start: BridgeEndpoint, end: BridgeEndpoint, t: number): number {
    const T = Math.max(1e-9, end.time - start.time);
    const s = (t - start.time) / T;
    if (s <= 0) return start.value;
    if (s >= 1) return end.value;
    return start.value * (1 - s) + end.value * s;
  }

  analyticalVariance(start: BridgeEndpoint, end: BridgeEndpoint, t: number): number {
    const T = Math.max(1e-9, end.time - start.time);
    const s = (t - start.time) / T;
    if (s <= 0 || s >= 1) return 0;
    return T * s * (1 - s) * this._volatility * this._volatility;
  }

  sample(path: BridgePath, time: number): number {
    if (time <= path.start.time) return path.start.value;
    if (time >= path.end.time) return path.end.value;
    for (let i = 1; i < path.waypoints.length; i++) {
      if (path.waypoints[i].time >= time) {
        const prev = path.waypoints[i - 1];
        const curr = path.waypoints[i];
        const ratio = (time - prev.time) / Math.max(0.001, curr.time - prev.time);
        return prev.value + ratio * (curr.value - prev.value);
      }
    }
    return path.end.value;
  }

  merge(pathA: BridgePath, pathB: BridgePath): BridgePath {
    const start: BridgeEndpoint = {
      time: Math.min(pathA.start.time, pathB.start.time),
      value: (pathA.start.value + pathB.start.value) / 2,
    };
    const end: BridgeEndpoint = {
      time: Math.max(pathA.end.time, pathB.end.time),
      value: (pathA.end.value + pathB.end.value) / 2,
    };
    return this.build(start, end);
  }

  optimalMerge(pathA: BridgePath, pathB: BridgePath): BridgePath {
    const varA = pathA.variance || 1e-9;
    const varB = pathB.variance || 1e-9;
    const wA = 1 / varA;
    const wB = 1 / varB;
    const wSum = wA + wB;
    const start: BridgeEndpoint = {
      time: Math.min(pathA.start.time, pathB.start.time),
      value: (pathA.start.value * wA + pathB.start.value * wB) / wSum,
    };
    const end: BridgeEndpoint = {
      time: Math.max(pathA.end.time, pathB.end.time),
      value: (pathA.end.value * wA + pathB.end.value * wB) / wSum,
    };
    return this.build(start, end);
  }

  conditionalExpectation(path: BridgePath, obsTime: number, obsValue: number): number {
    const T = path.end.time - path.start.time;
    if (T <= 0) return obsValue;
    const t1 = obsTime - path.start.time;
    const t2 = path.end.time - obsTime;
    if (t1 <= 0) return path.start.value;
    if (t2 <= 0) return path.end.value;
    const bridgeMean = (t2 / T) * path.start.value + (t1 / T) * path.end.value;
    const sigma2 = this._volatility * this._volatility * t1 * t2 / T;
    const obs2 = obsValue * obsValue;
    const denom = sigma2 + obs2;
    if (denom <= 0) return bridgeMean;
    const posteriorMean = (obs2 * bridgeMean + sigma2 * obsValue) / denom;
    return posteriorMean;
  }

  private _gaussian(): number {
    let u = 0, v = 0;
    while (u === 0) { this._rngState = (this._rngState * 1103515245 + 12345) & 0x7fffffff; u = this._rngState / 0x7fffffff; }
    while (v === 0) { this._rngState = (this._rngState * 1103515245 + 12345) & 0x7fffffff; v = this._rngState / 0x7fffffff; }
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  setSteps(n: number): void {
    this._steps = Math.max(2, n);
  }

  setVolatility(v: number): void {
    this._volatility = Math.max(0, v);
  }

  getPaths(): BridgePath[] {
    return [...this._paths];
  }

  get pathCount(): number {
    return this._paths.length;
  }

  private _computeVariance(waypoints: BridgeEndpoint[]): number {
    if (waypoints.length === 0) return 0;
    const mean = waypoints.reduce((s, w) => s + w.value, 0) / waypoints.length;
    return waypoints.reduce((s, w) => s + (w.value - mean) ** 2, 0) / waypoints.length;
  }
}
