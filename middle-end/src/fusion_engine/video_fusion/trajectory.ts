/**
 * 视频轨迹数据契约（TypeScript 端）
 *
 * 与 Python 侧 fusion_engine.video_fusion.trajectory 对应，
 * 供水逻辑否决权与 T6 视频评估器使用。
 */

export interface TrajectoryPoint {
  t: number;
  dimensions: Record<string, number>;
  velocity: Record<string, number>;
  confidence?: number;
  metadata?: Record<string, unknown>;
}

export interface VideoTrajectory {
  trajectoryId: string;
  sourceExpert: string;
  confidence: number;
  points: TrajectoryPoint[];
}

export function createTrajectory(
  id: string,
  sourceExpert = 'unknown',
  confidence = 1.0,
): VideoTrajectory {
  return {
    trajectoryId: id,
    sourceExpert,
    confidence,
    points: [],
  };
}

export function addPoint(trajectory: VideoTrajectory, point: TrajectoryPoint): void {
  trajectory.points.push(point);
}

export function trajectoryDuration(trajectory: VideoTrajectory): number {
  if (trajectory.points.length < 2) return 0;
  return trajectory.points[trajectory.points.length - 1].t - trajectory.points[0].t;
}

export function trajectorySmoothness(trajectory: VideoTrajectory): number {
  if (trajectory.points.length < 3) return 1.0;
  let jumps = 0;
  let total = 0;
  for (let i = 1; i < trajectory.points.length - 1; i++) {
    const prev = trajectory.points[i - 1];
    const curr = trajectory.points[i];
    const next = trajectory.points[i + 1];
    const dt = curr.t - prev.t;
    if (dt <= 0) continue;
    for (const dim of Object.keys(curr.dimensions)) {
      if (dim in prev.dimensions && dim in next.dimensions) {
        const v1 = (curr.dimensions[dim] - prev.dimensions[dim]) / dt;
        const v2 = (next.dimensions[dim] - curr.dimensions[dim]) / dt;
        if (Math.abs(v2 - v1) > 0.5) jumps++;
        total++;
      }
    }
  }
  const jumpRate = total > 0 ? jumps / total : 0;
  return Math.max(0.0, 1.0 - jumpRate * 2);
}
