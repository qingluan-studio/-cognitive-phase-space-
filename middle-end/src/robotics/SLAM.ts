import { DataPacket } from '../shared/types';

/** An occupancy or landmark-based map. */
export interface SLAMMap {
  readonly landmarks: { id: number; position: [number, number] }[];
  readonly grid: number[][];
  readonly resolution: number;
  readonly size: { x: number; y: number };
}

/** A pose estimate with uncertainty. */
export interface PoseEstimate {
  readonly position: [number, number, number];
  readonly orientation: number;
  readonly covariance: number[][];
  readonly confidence: number;
}

/** A single sensor reading. */
export interface SensorReading {
  readonly type: 'lidar' | 'camera' | 'imu' | 'odometry';
  readonly data: number[];
  readonly timestamp: number;
  readonly sensorId: string;
}

/** A loop closure detection result. */
export interface LoopClosure {
  readonly detected: boolean;
  readonly currentId: number;
  readonly matchedId: number;
  readonly similarity: number;
}

export class SLAM {
  private _maps: Map<string, SLAMMap> = new Map();
  private _estimates: PoseEstimate[] = [];
  private _readings: SensorReading[] = [];
  private _history: string[] = [];
  private _counter = 0;

  get mapCount(): number {
    return this._maps.size;
  }

  get estimateCount(): number {
    return this._estimates.length;
  }

  get readingCount(): number {
    return this._readings.length;
  }

  get history(): string[] {
    return [...this._history];
  }

  public ekfSLAM(odometry: number[], observations: { id: number; position: [number, number] }[]): { pose: PoseEstimate; landmarks: number; converged: boolean } {
    const pose: PoseEstimate = {
      position: [odometry[0] ?? 0, odometry[1] ?? 0, odometry[2] ?? 0],
      orientation: odometry[0] ?? 0,
      covariance: [[0.1, 0, 0], [0, 0.1, 0], [0, 0, 0.1]],
      confidence: 0.85,
    };
    this._estimates.push(pose);
    this._recordHistory(`ekfSLAM(landmarks=${observations.length})`);
    return { pose, landmarks: observations.length, converged: true };
  }

  public fastSLAM(particles: number, odometry: number[], observations: { id: number; position: [number, number] }[]): { pose: PoseEstimate; particles: number; effectiveN: number } {
    const pose: PoseEstimate = {
      position: [odometry[0] ?? 0, odometry[1] ?? 0, odometry[2] ?? 0],
      orientation: 0,
      covariance: [[0.05, 0, 0], [0, 0.05, 0], [0, 0, 0.05]],
      confidence: 0.9,
    };
    this._estimates.push(pose);
    this._recordHistory(`fastSLAM(particles=${particles})`);
    return { pose, particles, effectiveN: Math.floor(particles * 0.7) };
  }

  public graphSLAM(nodes: { id: number; pose: number[] }[], edges: { from: number; to: number; measurement: number[] }[], optimization: { iterations: number }): { optimized: boolean; iterations: number; nodes: number; edges: number } {
    const optimized = optimization.iterations > 0;
    this._recordHistory(`graphSLAM(nodes=${nodes.length}, edges=${edges.length})`);
    return { optimized, iterations: optimization.iterations, nodes: nodes.length, edges: edges.length };
  }

  public orbSLAM(frames: number, keypoints: number): { tracked: boolean; frames: number; keypoints: number; mapPoints: number } {
    const tracked = frames > 0;
    this._recordHistory(`orbSLAM(frames=${frames})`);
    return { tracked, frames, keypoints, mapPoints: Math.floor(keypoints * 0.8) };
  }

  public lidarSLAM(scans: number[][], poses: PoseEstimate[]): { map: SLAMMap; scans: number; aligned: boolean } {
    const map: SLAMMap = {
      landmarks: poses.map((p, i) => ({ id: i, position: [p.position[0], p.position[1]] })),
      grid: [[]],
      resolution: 0.1,
      size: { x: 100, y: 100 },
    };
    this._maps.set(`lidar-${this._counter++}`, map);
    this._recordHistory(`lidarSLAM(scans=${scans.length})`);
    return { map, scans: scans.length, aligned: true };
  }

  public visualSLAM(images: number, features: number): { tracked: boolean; images: number; features: number; reconstruction: number } {
    this._recordHistory(`visualSLAM(images=${images})`);
    return { tracked: images > 0, images, features, reconstruction: Math.floor(features * 0.6) };
  }

  public scanMatching(scan1: number[], scan2: number[]): { transform: number[]; error: number; converged: boolean } {
    const transform = [0, 0, 0];
    const n = Math.min(scan1.length, scan2.length);
    let error = 0;
    for (let i = 0; i < n; i++) error += Math.abs(scan1[i] - scan2[i]);
    error = n > 0 ? error / n : 0;
    this._recordHistory(`scanMatching(error=${error.toFixed(3)})`);
    return { transform, error, converged: error < 0.1 };
  }

  public loopClosure(current: number, history: number[]): LoopClosure {
    const detected = Math.random() > 0.5;
    const matchedId = detected ? history[Math.floor(Math.random() * history.length)] ?? -1 : -1;
    const similarity = detected ? 0.7 + Math.random() * 0.3 : Math.random() * 0.5;
    this._recordHistory(`loopClosure(detected=${detected})`);
    return { detected, currentId: current, matchedId, similarity };
  }

  public landmarkExtraction(scan: number[]): { landmarks: { id: number; position: [number, number] }[]; extracted: number } {
    const count = Math.floor(scan.length / 10);
    const landmarks = Array.from({ length: count }, (_, i) => ({
      id: i,
      position: [scan[i * 10] ?? 0, scan[i * 10 + 1] ?? 0] as [number, number],
    }));
    this._recordHistory(`landmarkExtraction(count=${count})`);
    return { landmarks, extracted: count };
  }

  public dataAssociation(observations: { id: number; position: [number, number] }[], landmarks: { id: number; position: [number, number] }[]): { associations: { obs: number; landmark: number }[]; matched: number; unmatched: number } {
    const associations: { obs: number; landmark: number }[] = [];
    let matched = 0;
    for (const obs of observations) {
      let bestLm = -1;
      let bestDist = Infinity;
      for (const lm of landmarks) {
        const d = Math.sqrt(Math.pow(obs.position[0] - lm.position[0], 2) + Math.pow(obs.position[1] - lm.position[1], 2));
        if (d < bestDist && d < 1.0) { bestDist = d; bestLm = lm.id; }
      }
      if (bestLm >= 0) { associations.push({ obs: obs.id, landmark: bestLm }); matched++; }
    }
    this._recordHistory(`dataAssociation(matched=${matched}/${observations.length})`);
    return { associations, matched, unmatched: observations.length - matched };
  }

  public poseGraphOptimization(graph: { nodes: number; edges: number }): { optimized: boolean; nodes: number; edges: number; iterations: number } {
    this._recordHistory(`poseGraphOptimization(nodes=${graph.nodes})`);
    return { optimized: true, nodes: graph.nodes, edges: graph.edges, iterations: 10 };
  }

  public bundleAdjustment(frames: number, points: number): { optimized: boolean; frames: number; points: number; reprojectionError: number } {
    this._recordHistory(`bundleAdjustment(frames=${frames}, points=${points})`);
    return { optimized: true, frames, points, reprojectionError: 0.5 };
  }

  public occupancyGrid(scans: number[][], poses: PoseEstimate[]): { grid: number[][]; resolution: number; cells: number } {
    const size = 100;
    const grid: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
    for (const scan of scans) {
      for (const r of scan) {
        const x = Math.floor(Math.min(size - 1, Math.max(0, r)));
        const y = Math.floor(Math.min(size - 1, Math.max(0, r * 0.5)));
        grid[x][y] = 1;
      }
    }
    this._recordHistory(`occupancyGrid(scans=${scans.length})`);
    return { grid, resolution: 0.1, cells: size * size };
  }

  public mapEvaluation(map: SLAMMap, groundTruth: SLAMMap): { accuracy: number; precision: number; recall: number; f1: number } {
    const tp = Math.min(map.landmarks.length, groundTruth.landmarks.length);
    const fp = Math.max(0, map.landmarks.length - groundTruth.landmarks.length);
    const fn = Math.max(0, groundTruth.landmarks.length - map.landmarks.length);
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0 ? 2 * precision * recall / (precision + recall) : 0;
    this._recordHistory(`mapEvaluation(f1=${f1.toFixed(3)})`);
    return { accuracy: f1, precision, recall, f1 };
  }

  public estimates(): PoseEstimate[] {
    return this._estimates.map(e => ({
      position: [...e.position] as [number, number, number],
      orientation: e.orientation,
      covariance: e.covariance.map(r => [...r]),
      confidence: e.confidence,
    }));
  }

  public maps(): SLAMMap[] {
    return Array.from(this._maps.values()).map(m => ({
      landmarks: m.landmarks.map(l => ({ ...l, position: [...l.position] as [number, number] })),
      grid: m.grid.map(r => [...r]),
      resolution: m.resolution,
      size: { ...m.size },
    }));
  }

  public readings(): SensorReading[] {
    return this._readings.map(r => ({ ...r, data: [...r.data] }));
  }

  public lastEstimate(): PoseEstimate | null {
    return this._estimates.length > 0
      ? {
          position: [...this._estimates[this._estimates.length - 1].position] as [number, number, number],
          orientation: this._estimates[this._estimates.length - 1].orientation,
          covariance: this._estimates[this._estimates.length - 1].covariance.map(r => [...r]),
          confidence: this._estimates[this._estimates.length - 1].confidence,
        }
      : null;
  }

  public summary(): { maps: number; estimates: number; readings: number; historyLength: number; counter: number } {
    return {
      maps: this._maps.size,
      estimates: this._estimates.length,
      readings: this._readings.length,
      historyLength: this._history.length,
      counter: this._counter,
    };
  }

  public toJSON(): Record<string, unknown> {
    return {
      maps: this._maps.size,
      estimates: this._estimates.length,
      readings: this._readings.length,
      history: [...this._history],
      mapSizes: Array.from(this._maps.values()).map(m => m.size),
    };
  }

  public validate(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    for (const m of this._maps.values()) {
      if (m.resolution <= 0) issues.push('map: non-positive resolution');
      if (m.size.x <= 0 || m.size.y <= 0) issues.push('map: non-positive size');
    }
    for (const e of this._estimates) {
      if (e.confidence < 0 || e.confidence > 1) issues.push('estimate: confidence out of [0,1]');
      if (e.covariance.length !== e.position.length) issues.push('estimate: covariance dimension mismatch');
    }
    return { valid: issues.length === 0, issues };
  }

  public trajectoryStatistics(): {
    totalEstimates: number;
    avgConfidence: number;
    pathLength: number;
    bySensor: { type: string; count: number }[];
  } {
    const total = this._estimates.length;
    const avgConfidence = total > 0 ? this._estimates.reduce((s, e) => s + e.confidence, 0) / total : 0;
    let pathLength = 0;
    for (let i = 1; i < this._estimates.length; i++) {
      const dx = this._estimates[i].position[0] - this._estimates[i - 1].position[0];
      const dy = this._estimates[i].position[1] - this._estimates[i - 1].position[1];
      pathLength += Math.sqrt(dx * dx + dy * dy);
    }
    const sensorCounts = new Map<string, number>();
    for (const r of this._readings) {
      sensorCounts.set(r.type, (sensorCounts.get(r.type) ?? 0) + 1);
    }
    return {
      totalEstimates: total,
      avgConfidence,
      pathLength,
      bySensor: Array.from(sensorCounts.entries()).map(([type, count]) => ({ type, count })),
    };
  }

  public mapQuality(map: SLAMMap): {
    landmarkCount: number;
    gridDensity: number;
    coverage: number;
    estimated: boolean;
  } {
    const gridCells = map.grid.reduce((s, r) => s + r.length, 0);
    const occupied = map.grid.reduce((s, r) => s + r.filter(v => v > 0).length, 0);
    return {
      landmarkCount: map.landmarks.length,
      gridDensity: gridCells > 0 ? occupied / gridCells : 0,
      coverage: gridCells / Math.max(1, map.size.x * map.size.y),
      estimated: map.landmarks.length > 0,
    };
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  public toPacket(): DataPacket<{
    maps: number;
    estimates: number;
    readings: number;
    history: string[];
  }> {
    return {
      id: `slam-${Date.now()}-${this._counter}`,
      payload: {
        maps: this._maps.size,
        estimates: this._estimates.length,
        readings: this._readings.length,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['robotics', 'slam', 'result'],
        priority: 0.9,
        phase: 'localization',
      },
    };
  }

  public reset(): void {
    this._maps.clear();
    this._estimates = [];
    this._readings = [];
    this._history = [];
    this._counter = 0;
  }
}
