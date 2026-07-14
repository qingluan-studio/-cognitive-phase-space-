/**
 * 布朗桥：连接过去和未来的噪声路径。
 * 生成起点与终点均已确定的随机过程，在两端约束下产生连接过去与未来的桥梁路径。
 */

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

  build(start: BridgeEndpoint, end: BridgeEndpoint): BridgePath {
    const waypoints: BridgeEndpoint[] = [start];
    const dt = (end.time - start.time) / this._steps;

    for (let i = 1; i < this._steps; i++) {
      const t = i / this._steps;
      const drift = start.value + t * (end.value - start.value);
      const shock = (Math.random() - 0.5) * 2 * this._volatility * Math.sqrt(dt);
      const prev = waypoints[i - 1].value;
      const adjustment = (end.value - prev) * (1 - t) / Math.max(0.01, (1 - (i - 1) / this._steps));
      const value = prev + (adjustment - prev) * dt + shock;
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
    const variance = waypoints.reduce((s, w) => s + (w.value - mean) ** 2, 0) / waypoints.length;
    return variance;
  }
}
