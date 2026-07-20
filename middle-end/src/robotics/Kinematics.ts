import { DataPacket } from '../shared/types';

export interface Joint {
  readonly type: 'revolute' | 'prismatic' | 'continuous' | 'fixed';
  readonly angle: number;
  readonly axis: [number, number, number];
  readonly limits: { min: number; max: number };
}

export interface Link {
  readonly length: number;
  readonly mass: number;
  readonly inertia: number[];
  readonly name: string;
}

export interface Pose {
  readonly position: [number, number, number];
  readonly orientation: [number, number, number, number];
}

export interface IKResult {
  readonly joints: number[];
  readonly success: boolean;
  readonly error: number;
  readonly iterations: number;
}

export interface DHParameter {
  readonly alpha: number;
  readonly a: number;
  readonly theta: number;
  readonly d: number;
}

export interface VelocityState {
  readonly jointVelocities: number[];
  readonly endEffectorVelocity: number[];
  readonly jacobian: number[][];
}

export interface AccelerationState {
  readonly jointAccelerations: number[];
  readonly endEffectorAcceleration: number[];
  readonly jacobianDot: number[][];
}

export interface KinematicChain {
  readonly joints: Joint[];
  readonly links: Link[];
  readonly dhParameters: DHParameter[];
  readonly baseFrame: Pose;
  readonly tipFrame: Pose;
}

export interface WorkspacePoint {
  readonly position: [number, number, number];
  readonly reachable: boolean;
  readonly maniputability: number;
}

export interface TrajectoryPoint {
  readonly time: number;
  readonly jointPositions: number[];
  readonly jointVelocities: number[];
  readonly jointAccelerations: number[];
}

export interface SingularityAnalysis {
  readonly isSingular: boolean;
  readonly singularityType: 'boundary' | 'internal' | 'wrist';
  readonly conditionNumber: number;
  readonly minimumSingularValue: number;
}

export class Kinematics {
  private _joints: Map<string, Joint> = new Map();
  private _links: Link[] = [];
  private _poses: Pose[] = [];
  private _history: string[] = [];
  private _counter = 0;
  private _currentChain: KinematicChain | null = null;

  get jointCount(): number {
    return this._joints.size;
  }

  get linkCount(): number {
    return this._links.length;
  }

  get poseCount(): number {
    return this._poses.length;
  }

  get history(): string[] {
    return [...this._history];
  }

  get currentChain(): KinematicChain | null {
    return this._currentChain;
  }

  public forwardKinematics(joints: number[], links: Link[]): Pose {
    const position: [number, number, number] = [0, 0, 0];
    let x = 0, y = 0, z = 0;
    let angle = 0;
    for (let i = 0; i < joints.length; i++) {
      angle += joints[i];
      const len = links[i]?.length ?? 1;
      x += len * Math.cos(angle);
      y += len * Math.sin(angle);
    }
    position[0] = x;
    position[1] = y;
    position[2] = z;
    const orientation: [number, number, number, number] = [Math.cos(angle / 2), 0, 0, Math.sin(angle / 2)];
    const pose: Pose = { position, orientation };
    this._poses.push(pose);
    this._recordHistory(`forwardKinematics(joints=${joints.length})`);
    return pose;
  }

  public forwardKinematics3D(joints: number[], dhParams: DHParameter[]): Pose {
    let transform = this._identityMatrix(4);
    for (let i = 0; i < joints.length; i++) {
      const dh = dhParams[i];
      const theta = dh.theta + joints[i];
      const ct = Math.cos(theta);
      const st = Math.sin(theta);
      const ca = Math.cos(dh.alpha);
      const sa = Math.sin(dh.alpha);
      const linkTransform = [
        [ct, -st * ca, st * sa, dh.a * ct],
        [st, ct * ca, -ct * sa, dh.a * st],
        [0, sa, ca, dh.d],
        [0, 0, 0, 1],
      ];
      transform = this._matrixMultiply(transform, linkTransform);
    }
    const position: [number, number, number] = [
      transform[0][3] ?? 0,
      transform[1][3] ?? 0,
      transform[2][3] ?? 0,
    ];
    const rotation = [
      [transform[0][0] ?? 0, transform[0][1] ?? 0, transform[0][2] ?? 0],
      [transform[1][0] ?? 0, transform[1][1] ?? 0, transform[1][2] ?? 0],
      [transform[2][0] ?? 0, transform[2][1] ?? 0, transform[2][2] ?? 0],
    ];
    const orientation = this.quaternion(rotation);
    const pose: Pose = { position, orientation };
    this._poses.push(pose);
    this._recordHistory(`forwardKinematics3D(joints=${joints.length})`);
    return pose;
  }

  public inverseKinematics(target: Pose, links: Link[], joints: number[]): IKResult {
    const maxIter = 100;
    const tolerance = 1e-3;
    let current = [...joints];
    let error = Infinity;
    let iter = 0;
    for (iter = 0; iter < maxIter; iter++) {
      const pose = this.forwardKinematics(current, links);
      error = Math.sqrt(
        Math.pow(pose.position[0] - target.position[0], 2) +
        Math.pow(pose.position[1] - target.position[1], 2) +
        Math.pow(pose.position[2] - target.position[2], 2)
      );
      if (error < tolerance) break;
      for (let i = 0; i < current.length; i++) {
        current[i] += (Math.random() - 0.5) * 0.1 * error;
      }
    }
    const result: IKResult = { joints: current, success: error < tolerance, error, iterations: iter };
    this._recordHistory(`inverseKinematics(success=${result.success}, err=${error.toFixed(4)})`);
    return result;
  }

  public inverseKinematicsNewton(target: Pose, dhParams: DHParameter[], initialJoints: number[]): IKResult {
    const maxIter = 100;
    const tolerance = 1e-6;
    const alpha = 0.5;
    let current = [...initialJoints];
    let error = Infinity;
    let iter = 0;

    for (iter = 0; iter < maxIter; iter++) {
      const pose = this.forwardKinematics3D(current, dhParams);
      const J = this.jacobian3D(current, dhParams);
      const posError = [
        target.position[0] - pose.position[0],
        target.position[1] - pose.position[1],
        target.position[2] - pose.position[2],
      ];
      const orientError = this._quaternionError(pose.orientation, target.orientation);
      const errorVector = [...posError, ...orientError];

      error = Math.sqrt(errorVector.reduce((s, v) => s + v * v, 0));
      if (error < tolerance) break;

      const Jt = this._transpose(J);
      const JtJ = this._matrixMultiply(Jt, J);
      const JtE = this._matrixMultiplyVector(Jt, errorVector);
      const delta = this._solveLinearSystem(JtJ, JtE);

      for (let i = 0; i < current.length; i++) {
        current[i] += alpha * (delta[i] ?? 0);
      }
    }

    const result: IKResult = { joints: current, success: error < tolerance, error, iterations: iter };
    this._recordHistory(`inverseKinematicsNewton(success=${result.success}, err=${error.toFixed(6)})`);
    return result;
  }

  public inverseKinematicsAnalyticalPUMA(target: Pose): IKResult {
    const { position, orientation } = target;
    const [x, y, z] = position;
    const d1 = 0.625;
    const a2 = 0.450;
    const a3 = 0.200;
    const d4 = 0.600;

    const wristCenter = [
      x - d4 * (orientation[1] * orientation[3] + orientation[0] * orientation[2]),
      y + d4 * (orientation[0] * orientation[3] - orientation[1] * orientation[2]),
      z - d4 * (orientation[0] * orientation[1] - orientation[2] * orientation[3]),
    ];

    const theta1 = Math.atan2(wristCenter[1], wristCenter[0]);
    const r1 = Math.sqrt(wristCenter[0] ** 2 + wristCenter[1] ** 2);
    const z1 = wristCenter[2] - d1;
    const r = Math.sqrt(r1 ** 2 + z1 ** 2);

    const cosTheta3 = (r ** 2 - a2 ** 2 - a3 ** 2) / (2 * a2 * a3);
    const theta3 = Math.acos(Math.max(-1, Math.min(1, cosTheta3)));

    const theta2 = Math.atan2(z1, r1) - Math.atan2(a3 * Math.sin(theta3), a2 + a3 * Math.cos(theta3));

    const joints = [theta1, theta2, theta3, 0, 0, 0];
    const result: IKResult = { joints, success: true, error: 0, iterations: 0 };
    this._recordHistory('inverseKinematicsAnalyticalPUMA()');
    return result;
  }

  public jacobian(joints: number[], links: Link[]): number[][] {
    const n = joints.length;
    const jacobian: number[][] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let i = 0; i < n; i++) {
      let angle = 0;
      for (let k = 0; k <= i; k++) angle += joints[k];
      const len = links[i]?.length ?? 1;
      jacobian[0][i] = -len * Math.sin(angle);
      jacobian[1][i] = len * Math.cos(angle);
      jacobian[2][i] = 0;
    }
    this._recordHistory(`jacobian(joints=${n})`);
    return jacobian;
  }

  public jacobian3D(joints: number[], dhParams: DHParameter[]): number[][] {
    const n = joints.length;
    const J: number[][] = Array.from({ length: 6 }, () => Array(n).fill(0));
    let transform = this._identityMatrix(4);
    const zAxes: number[][] = [];
    const origins: number[][] = [];

    for (let i = 0; i < n; i++) {
      const dh = dhParams[i];
      const theta = dh.theta + joints[i];
      const ct = Math.cos(theta);
      const st = Math.sin(theta);
      const ca = Math.cos(dh.alpha);
      const sa = Math.sin(dh.alpha);
      const linkTransform = [
        [ct, -st * ca, st * sa, dh.a * ct],
        [st, ct * ca, -ct * sa, dh.a * st],
        [0, sa, ca, dh.d],
        [0, 0, 0, 1],
      ];
      transform = this._matrixMultiply(transform, linkTransform);
      zAxes.push([transform[0][2] ?? 0, transform[1][2] ?? 0, transform[2][2] ?? 0]);
      origins.push([transform[0][3] ?? 0, transform[1][3] ?? 0, transform[2][3] ?? 0]);
    }

    const endOrigin = [transform[0][3] ?? 0, transform[1][3] ?? 0, transform[2][3] ?? 0];

    for (let i = 0; i < n; i++) {
      const origin = origins[i];
      const zAxis = zAxes[i];
      const diff = [endOrigin[0] - origin[0], endOrigin[1] - origin[1], endOrigin[2] - origin[2]];
      const cross = this._crossProduct(zAxis, diff);
      J[0][i] = cross[0];
      J[1][i] = cross[1];
      J[2][i] = cross[2];
      J[3][i] = zAxis[0];
      J[4][i] = zAxis[1];
      J[5][i] = zAxis[2];
    }

    this._recordHistory(`jacobian3D(joints=${n})`);
    return J;
  }

  public velocityKinematics(jacobian: number[][], jointVelocities: number[]): number[] {
    const result: number[] = [0, 0, 0];
    for (let i = 0; i < jacobian.length; i++) {
      for (let j = 0; j < jointVelocities.length; j++) {
        result[i] += (jacobian[i][j] ?? 0) * (jointVelocities[j] ?? 0);
      }
    }
    this._recordHistory('velocityKinematics()');
    return result;
  }

  public inverseVelocityKinematics(jacobian: number[][], desiredVelocity: number[]): number[] {
    const Jt = this._transpose(jacobian);
    const JtJ = this._matrixMultiply(Jt, jacobian);
    const JtV = this._matrixMultiplyVector(Jt, desiredVelocity);
    const damping = 0.01;
    for (let i = 0; i < JtJ.length; i++) {
      JtJ[i][i] += damping;
    }
    const jointVelocities = this._solveLinearSystem(JtJ, JtV);
    this._recordHistory('inverseVelocityKinematics()');
    return jointVelocities;
  }

  public accelerationKinematics(jacobian: number[][], jacobianDot: number[][], jointVelocities: number[], jointAccelerations: number[]): number[] {
    const jv = this.velocityKinematics(jacobian, jointVelocities);
    const jDotV = this.velocityKinematics(jacobianDot, jointVelocities);
    const jA = this.velocityKinematics(jacobian, jointAccelerations);
    const result = jv.map((_, i) => jDotV[i] + jA[i]);
    this._recordHistory('accelerationKinematics()');
    return result;
  }

  public dhParameters(alpha: number, a: number, theta: number, d: number): DHParameter {
    this._recordHistory('dhParameters()');
    return { alpha, a, theta, d };
  }

  public dhTransform(alpha: number, a: number, theta: number, d: number): number[][] {
    const ct = Math.cos(theta);
    const st = Math.sin(theta);
    const ca = Math.cos(alpha);
    const sa = Math.sin(alpha);
    const matrix = [
      [ct, -st * ca, st * sa, a * ct],
      [st, ct * ca, -ct * sa, a * st],
      [0, sa, ca, d],
      [0, 0, 0, 1],
    ];
    this._recordHistory('dhTransform()');
    return matrix;
  }

  public eulerAngles(rotation: number[][], convention: 'XYZ' | 'ZYX' | 'ZYZ'): [number, number, number] {
    const r = rotation;
    let angles: [number, number, number] = [0, 0, 0];
    if (convention === 'XYZ') {
      angles[1] = Math.asin(Math.max(-1, Math.min(1, r[0][2])));
      angles[0] = Math.atan2(-r[1][2], r[2][2]);
      angles[2] = Math.atan2(-r[0][1], r[0][0]);
    } else if (convention === 'ZYX') {
      angles[1] = Math.asin(-Math.max(-1, Math.min(1, r[2][0])));
      angles[0] = Math.atan2(r[1][0], r[0][0]);
      angles[2] = Math.atan2(r[2][1], r[2][2]);
    } else {
      angles[0] = Math.atan2(r[1][2], r[0][2]);
      angles[1] = Math.acos(Math.max(-1, Math.min(1, r[2][2])));
      angles[2] = Math.atan2(-r[2][1], -r[2][0]);
    }
    this._recordHistory(`eulerAngles(${convention})`);
    return angles;
  }

  public quaternion(rotation: number[][]): [number, number, number, number] {
    const trace = (rotation[0][0] ?? 0) + (rotation[1][1] ?? 0) + (rotation[2][2] ?? 0);
    let qw: number, qx: number, qy: number, qz: number;
    if (trace > 0) {
      const s = 0.5 / Math.sqrt(trace + 1);
      qw = 0.25 / s;
      qx = ((rotation[2][1] ?? 0) - (rotation[1][2] ?? 0)) * s;
      qy = ((rotation[0][2] ?? 0) - (rotation[2][0] ?? 0)) * s;
      qz = ((rotation[1][0] ?? 0) - (rotation[0][1] ?? 0)) * s;
    } else {
      qw = 0;
      qx = 0;
      qy = 0;
      qz = 1;
    }
    this._recordHistory('quaternion()');
    return [qw, qx, qy, qz];
  }

  public quaternionToRotation(q: [number, number, number, number]): number[][] {
    const [qw, qx, qy, qz] = q;
    const s = 2 / (qw * qw + qx * qx + qy * qy + qz * qz);
    const rotation = [
      [1 - s * (qy * qy + qz * qz), s * (qx * qy - qz * qw), s * (qx * qz + qy * qw)],
      [s * (qx * qy + qz * qw), 1 - s * (qx * qx + qz * qz), s * (qy * qz - qx * qw)],
      [s * (qx * qz - qy * qw), s * (qy * qz + qx * qw), 1 - s * (qx * qx + qy * qy)],
    ];
    this._recordHistory('quaternionToRotation()');
    return rotation;
  }

  public rotationMatrix(euler: [number, number, number]): number[][] {
    const [rx, ry, rz] = euler;
    const cx = Math.cos(rx), sx = Math.sin(rx);
    const cy = Math.cos(ry), sy = Math.sin(ry);
    const cz = Math.cos(rz), sz = Math.sin(rz);
    const matrix = [
      [cy * cz, -cy * sz, sy],
      [cx * sz + sx * sy * cz, cx * cz - sx * sy * sz, -sx * cy],
      [sx * sz - cx * sy * cz, sx * cz + cx * sy * sz, cx * cy],
    ];
    this._recordHistory('rotationMatrix()');
    return matrix;
  }

  public homogeneousTransform(rotation: number[][], translation: [number, number, number]): number[][] {
    const matrix: number[][] = rotation.map(row => [...row, 0]);
    matrix.push([...translation, 1]);
    this._recordHistory('homogeneousTransform()');
    return matrix;
  }

  public manipulability(jacobian: number[][]): number {
    const n = jacobian[0]?.length ?? 0;
    const jjt: number[][] = Array.from({ length: 3 }, () => Array(3).fill(0));
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        for (let k = 0; k < n; k++) {
          jjt[i][j] += (jacobian[i][k] ?? 0) * (jacobian[j][k] ?? 0);
        }
      }
    }
    const det = jjt[0][0] * (jjt[1][1] * jjt[2][2] - jjt[1][2] * jjt[2][1]) -
                jjt[0][1] * (jjt[1][0] * jjt[2][2] - jjt[1][2] * jjt[2][0]) +
                jjt[0][2] * (jjt[1][0] * jjt[2][1] - jjt[1][1] * jjt[2][0]);
    const manip = Math.sqrt(Math.abs(det));
    this._recordHistory(`manipulability(w=${manip.toFixed(4)})`);
    return manip;
  }

  public manipulability3D(jacobian: number[][]): number {
    const m = jacobian.length;
    const n = jacobian[0]?.length ?? 0;
    const jjt: number[][] = Array.from({ length: m }, () => Array(m).fill(0));
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < m; j++) {
        for (let k = 0; k < n; k++) {
          jjt[i][j] += (jacobian[i][k] ?? 0) * (jacobian[j][k] ?? 0);
        }
      }
    }
    const det = this._matrixDeterminant(jjt);
    const manip = Math.sqrt(Math.abs(det));
    this._recordHistory(`manipulability3D(w=${manip.toFixed(4)})`);
    return manip;
  }

  public singularities(jacobian: number[][]): { singular: boolean; rank: number; conditions: number } {
    const det = jacobian[0][0] * jacobian[1][1] * jacobian[2][2] -
                jacobian[0][1] * jacobian[1][0] * jacobian[2][2];
    const singular = Math.abs(det) < 1e-6;
    this._recordHistory(`singularities(singular=${singular})`);
    return { singular, rank: singular ? 2 : 3, conditions: singular ? 1 : 0 };
  }

  public singularityAnalysis(jacobian: number[][]): SingularityAnalysis {
    const svd = this._singularValueDecomposition(jacobian);
    const minSV = Math.min(...svd.singularValues);
    const maxSV = Math.max(...svd.singularValues);
    const conditionNumber = maxSV > 0 ? maxSV / Math.max(minSV, 1e-10) : Infinity;
    const isSingular = minSV < 1e-6;
    let singularityType: 'boundary' | 'internal' | 'wrist' = 'internal';
    if (minSV < 1e-8) singularityType = 'wrist';
    else if (conditionNumber > 1e6) singularityType = 'boundary';
    this._recordHistory(`singularityAnalysis(singular=${isSingular}, cond=${conditionNumber.toFixed(2)})`);
    return { isSingular, singularityType, conditionNumber, minimumSingularValue: minSV };
  }

  public workspace(links: Link[], jointLimits: { min: number; max: number }[]): { points: number; volume: number; reachable: boolean } {
    const samples = 100;
    const points = samples;
    const reach = links.reduce((s, l) => s + l.length, 0);
    const volume = (4 / 3) * Math.PI * Math.pow(reach, 3);
    this._recordHistory(`workspace(samples=${samples})`);
    return { points, volume, reachable: true };
  }

  public workspaceAnalysis(links: Link[], jointLimits: { min: number; max: number }[], samples: number = 1000): WorkspacePoint[] {
    const n = links.length;
    const points: WorkspacePoint[] = [];
    for (let i = 0; i < samples; i++) {
      const joints: number[] = [];
      for (let j = 0; j < n; j++) {
        const limit = jointLimits[j] ?? { min: -Math.PI, max: Math.PI };
        joints.push(limit.min + Math.random() * (limit.max - limit.min));
      }
      const pose = this.forwardKinematics(joints, links);
      const jacobian = this.jacobian(joints, links);
      const manip = this.manipulability(jacobian);
      points.push({
        position: pose.position,
        reachable: true,
        maniputability: manip,
      });
    }
    this._recordHistory(`workspaceAnalysis(samples=${samples})`);
    return points;
  }

  public trajectory(start: number[], end: number[], time: number, method: 'cubic' | 'quintic' | 'linear'): { points: number[][]; time: number; method: string } {
    const steps = Math.max(1, Math.floor(time * 10));
    const points: number[][] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const point = start.map((s, j) => {
        const e = end[j] ?? s;
        switch (method) {
          case 'cubic':
            return s + (e - s) * (3 * t * t - 2 * t * t * t);
          case 'quintic':
            return s + (e - s) * (10 * t * t * t - 15 * t * t * t * t + 6 * t * t * t * t * t);
          case 'linear':
          default:
            return s + (e - s) * t;
        }
      });
      points.push(point);
    }
    this._recordHistory(`trajectory(method=${method}, steps=${steps})`);
    return { points, time, method };
  }

  public trajectoryWithVelocity(start: number[], end: number[], startTime: number[] = [], endTime: number[] = [], time: number, method: 'cubic' | 'quintic'): TrajectoryPoint[] {
    const steps = Math.max(1, Math.floor(time * 100));
    const points: TrajectoryPoint[] = [];
    const n = start.length;
    const startVel = startTime.length === n ? startTime : Array(n).fill(0);
    const endVel = endTime.length === n ? endTime : Array(n).fill(0);

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const jointPositions: number[] = [];
      const jointVelocities: number[] = [];
      const jointAccelerations: number[] = [];

      for (let j = 0; j < n; j++) {
        const s = start[j];
        const e = end[j];
        const sv = startVel[j];
        const ev = endVel[j];

        if (method === 'cubic') {
          const a0 = s;
          const a1 = sv;
          const a2 = 3 * (e - s) - 2 * sv - ev;
          const a3 = -2 * (e - s) + sv + ev;
          jointPositions.push(a0 + a1 * t + a2 * t * t + a3 * t * t * t);
          jointVelocities.push(a1 + 2 * a2 * t + 3 * a3 * t * t);
          jointAccelerations.push(2 * a2 + 6 * a3 * t);
        } else {
          const a0 = s;
          const a1 = sv;
          const a2 = 0;
          const a3 = 10 * (e - s) - 6 * sv - 4 * ev;
          const a4 = -15 * (e - s) + 8 * sv + 7 * ev;
          const a5 = 6 * (e - s) - 3 * sv - 3 * ev;
          jointPositions.push(a0 + a1 * t + a2 * t * t + a3 * t * t * t + a4 * t * t * t * t + a5 * t * t * t * t * t);
          jointVelocities.push(a1 + 2 * a2 * t + 3 * a3 * t * t + 4 * a4 * t * t * t + 5 * a5 * t * t * t * t);
          jointAccelerations.push(2 * a2 + 6 * a3 * t + 12 * a4 * t * t + 20 * a5 * t * t * t);
        }
      }

      points.push({
        time: t * time,
        jointPositions,
        jointVelocities,
        jointAccelerations,
      });
    }

    this._recordHistory(`trajectoryWithVelocity(method=${method}, steps=${steps})`);
    return points;
  }

  public cartesianTrajectory(start: Pose, end: Pose, time: number, steps: number = 100): { poses: Pose[]; times: number[] } {
    const poses: Pose[] = [];
    const times: number[] = [];

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const s = 10 * t * t * t - 15 * t * t * t * t + 6 * t * t * t * t * t;

      const position: [number, number, number] = [
        start.position[0] + (end.position[0] - start.position[0]) * s,
        start.position[1] + (end.position[1] - start.position[1]) * s,
        start.position[2] + (end.position[2] - start.position[2]) * s,
      ];

      const orientation = this._slerp(start.orientation, end.orientation, s);

      poses.push({ position, orientation });
      times.push(t * time);
    }

    this._recordHistory(`cartesianTrajectory(steps=${steps})`);
    return { poses, times };
  }

  public planTrajectoryThroughWaypoints(waypoints: Pose[], times: number[]): { poses: Pose[]; times: number[]; trajectory: TrajectoryPoint[] } {
    const poses: Pose[] = [];
    const allTimes: number[] = [];

    for (let i = 0; i < waypoints.length - 1; i++) {
      const start = waypoints[i];
      const end = waypoints[i + 1];
      const startTime = times[i] ?? i;
      const endTime = times[i + 1] ?? (i + 1);
      const duration = endTime - startTime;
      const steps = Math.max(10, Math.floor(duration * 50));

      const segment = this.cartesianTrajectory(start, end, duration, steps);
      poses.push(...segment.poses);
      allTimes.push(...segment.times.map(t => t + startTime));
    }

    this._recordHistory(`planTrajectoryThroughWaypoints(waypoints=${waypoints.length})`);
    return { poses, times: allTimes, trajectory: [] };
  }

  public createKinematicChain(joints: Joint[], links: Link[], dhParams: DHParameter[]): KinematicChain {
    const baseFrame: Pose = { position: [0, 0, 0], orientation: [1, 0, 0, 0] };
    const zeroJoints = joints.map(() => 0);
    const tipFrame = this.forwardKinematics3D(zeroJoints, dhParams);
    const chain: KinematicChain = { joints, links, dhParameters: dhParams, baseFrame, tipFrame };
    this._currentChain = chain;
    this._recordHistory(`createKinematicChain(joints=${joints.length})`);
    return chain;
  }

  public loadUR5Kinematics(): KinematicChain {
    const dhParams: DHParameter[] = [
      { alpha: Math.PI / 2, a: 0, theta: 0, d: 0.089159 },
      { alpha: 0, a: -0.425, theta: 0, d: 0 },
      { alpha: 0, a: -0.39225, theta: 0, d: 0 },
      { alpha: Math.PI / 2, a: 0, theta: 0, d: 0.10915 },
      { alpha: -Math.PI / 2, a: 0, theta: 0, d: 0.09465 },
      { alpha: 0, a: 0, theta: 0, d: 0.0823 },
    ];
    const joints: Joint[] = dhParams.map((_, i) => ({
      type: 'revolute',
      angle: 0,
      axis: [0, 0, 1],
      limits: { min: -2 * Math.PI, max: 2 * Math.PI },
    }));
    const links: Link[] = [
      { length: 0.425, mass: 10, inertia: [1, 0, 0], name: 'link1' },
      { length: 0.39225, mass: 8, inertia: [1, 0, 0], name: 'link2' },
      { length: 0.10915, mass: 5, inertia: [1, 0, 0], name: 'link3' },
      { length: 0.09465, mass: 3, inertia: [1, 0, 0], name: 'link4' },
      { length: 0.0823, mass: 2, inertia: [1, 0, 0], name: 'link5' },
      { length: 0, mass: 1, inertia: [1, 0, 0], name: 'end-effector' },
    ];
    return this.createKinematicChain(joints, links, dhParams);
  }

  public loadPUMA560Kinematics(): KinematicChain {
    const dhParams: DHParameter[] = [
      { alpha: 0, a: 0, theta: 0, d: 0.625 },
      { alpha: -Math.PI / 2, a: 0.450, theta: -Math.PI / 2, d: 0 },
      { alpha: 0, a: 0.200, theta: 0, d: 0 },
      { alpha: -Math.PI / 2, a: 0, theta: 0, d: 0.600 },
      { alpha: Math.PI / 2, a: 0, theta: 0, d: 0 },
      { alpha: 0, a: 0, theta: 0, d: 0.080 },
    ];
    const joints: Joint[] = dhParams.map((_, i) => ({
      type: 'revolute',
      angle: 0,
      axis: [0, 0, 1],
      limits: { min: -Math.PI, max: Math.PI },
    }));
    const links: Link[] = [
      { length: 0.450, mass: 15, inertia: [1, 0, 0], name: 'link1' },
      { length: 0.200, mass: 10, inertia: [1, 0, 0], name: 'link2' },
      { length: 0.600, mass: 8, inertia: [1, 0, 0], name: 'link3' },
      { length: 0, mass: 5, inertia: [1, 0, 0], name: 'link4' },
      { length: 0, mass: 3, inertia: [1, 0, 0], name: 'link5' },
      { length: 0.080, mass: 2, inertia: [1, 0, 0], name: 'end-effector' },
    ];
    return this.createKinematicChain(joints, links, dhParams);
  }

  public validateKinematics(joints: number[], dhParams: DHParameter[]): { valid: boolean; errors: string[]; jointLimits: boolean[] } {
    const errors: string[] = [];
    const limits: boolean[] = [];

    for (let i = 0; i < joints.length; i++) {
      const joint = joints[i];
      const dh = dhParams[i];
      if (isNaN(joint)) errors.push(`Joint ${i}: NaN value`);
      if (!isFinite(joint)) errors.push(`Joint ${i}: infinite value`);
      limits.push(joint >= -Math.PI && joint <= Math.PI);
    }

    if (joints.length !== dhParams.length) {
      errors.push(`Joint count (${joints.length}) mismatch with DH parameters (${dhParams.length})`);
    }

    this._recordHistory(`validateKinematics(valid=${errors.length === 0})`);
    return { valid: errors.length === 0, errors, jointLimits: limits };
  }

  public computeStaticTorques(joints: number[], dhParams: DHParameter[], endEffectorForce: number[]): number[] {
    const n = joints.length;
    const torques: number[] = Array(n).fill(0);
    const J = this.jacobian3D(joints, dhParams);
    const Jt = this._transpose(J);
    const forces = [...endEffectorForce, 0, 0, 0];
    const wrench = this._matrixMultiplyVector(Jt, forces);
    for (let i = 0; i < n; i++) {
      torques[i] = wrench[i] ?? 0;
    }
    this._recordHistory('computeStaticTorques()');
    return torques;
  }

  public inverseDynamics(joints: number[], jointVelocities: number[], jointAccelerations: number[], dhParams: DHParameter[], masses: number[]): number[] {
    const n = joints.length;
    const torques: number[] = Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      const mass = masses[i] ?? 1;
      torques[i] += mass * jointAccelerations[i];
      torques[i] += 0.1 * jointVelocities[i];
    }
    this._recordHistory('inverseDynamics()');
    return torques;
  }

  public poses(): Pose[] {
    return this._poses.map(p => ({
      position: [...p.position] as [number, number, number],
      orientation: [...p.orientation] as [number, number, number, number],
    }));
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  private _identityMatrix(size: number): number[][] {
    const matrix: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
    for (let i = 0; i < size; i++) matrix[i][i] = 1;
    return matrix;
  }

  private _matrixMultiply(a: number[][], b: number[][]): number[][] {
    const rows = a.length;
    const cols = b[0]?.length ?? 0;
    const inner = b.length;
    const result: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        for (let k = 0; k < inner; k++) {
          result[i][j] += (a[i][k] ?? 0) * (b[k][j] ?? 0);
        }
      }
    }
    return result;
  }

  private _transpose(matrix: number[][]): number[][] {
    const rows = matrix.length;
    const cols = matrix[0]?.length ?? 0;
    const result: number[][] = Array.from({ length: cols }, () => Array(rows).fill(0));
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        result[j][i] = matrix[i][j] ?? 0;
      }
    }
    return result;
  }

  private _matrixMultiplyVector(matrix: number[][], vector: number[]): number[] {
    const rows = matrix.length;
    const result: number[] = Array(rows).fill(0);
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < vector.length; j++) {
        result[i] += (matrix[i][j] ?? 0) * (vector[j] ?? 0);
      }
    }
    return result;
  }

  private _solveLinearSystem(A: number[][], b: number[]): number[] {
    const n = A.length;
    const augmented: number[][] = A.map((row, i) => [...row, b[i] ?? 0]);

    for (let i = 0; i < n; i++) {
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) maxRow = k;
      }
      [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

      const pivot = augmented[i][i];
      if (Math.abs(pivot) < 1e-10) continue;

      for (let k = i + 1; k < n; k++) {
        const factor = augmented[k][i] / pivot;
        for (let j = i; j <= n; j++) {
          augmented[k][j] -= factor * augmented[i][j];
        }
      }
    }

    const x: number[] = Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let sum = 0;
      for (let j = i + 1; j < n; j++) sum += augmented[i][j] * x[j];
      const denom = augmented[i][i];
      x[i] = Math.abs(denom) > 1e-10 ? (augmented[i][n] - sum) / denom : 0;
    }

    return x;
  }

  private _crossProduct(a: number[], b: number[]): number[] {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ];
  }

  private _quaternionError(q1: [number, number, number, number], q2: [number, number, number, number]): number[] {
    const [w1, x1, y1, z1] = q1;
    const [w2, x2, y2, z2] = q2;
    return [
      w2 * x1 - x2 * w1 - y2 * z1 + z2 * y1,
      w2 * y1 - y2 * w1 - z2 * x1 + x2 * z1,
      w2 * z1 - z2 * w1 - x2 * y1 + y2 * x1,
    ];
  }

  private _slerp(q1: [number, number, number, number], q2: [number, number, number, number], t: number): [number, number, number, number] {
    let dot = q1[0] * q2[0] + q1[1] * q2[1] + q1[2] * q2[2] + q1[3] * q2[3];
    if (dot < 0) {
      q2 = [-q2[0], -q2[1], -q2[2], -q2[3]];
      dot = -dot;
    }
    if (dot > 0.9995) {
      return [
        q1[0] + t * (q2[0] - q1[0]),
        q1[1] + t * (q2[1] - q1[1]),
        q1[2] + t * (q2[2] - q1[2]),
        q1[3] + t * (q2[3] - q1[3]),
      ];
    }
    const angle = Math.acos(dot);
    const sinAngle = Math.sin(angle);
    const s1 = Math.sin((1 - t) * angle) / sinAngle;
    const s2 = Math.sin(t * angle) / sinAngle;
    return [
      s1 * q1[0] + s2 * q2[0],
      s1 * q1[1] + s2 * q2[1],
      s1 * q1[2] + s2 * q2[2],
      s1 * q1[3] + s2 * q2[3],
    ];
  }

  private _matrixDeterminant(matrix: number[][]): number {
    const n = matrix.length;
    if (n === 2) return matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
    if (n === 3) {
      return matrix[0][0] * (matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1]) -
             matrix[0][1] * (matrix[1][0] * matrix[2][2] - matrix[1][2] * matrix[2][0]) +
             matrix[0][2] * (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0]);
    }
    let det = 0;
    for (let i = 0; i < n; i++) {
      const minor = matrix.slice(1).map(row => [...row.slice(0, i), ...row.slice(i + 1)]);
      det += matrix[0][i] * Math.pow(-1, i) * this._matrixDeterminant(minor);
    }
    return det;
  }

  private _singularValueDecomposition(matrix: number[][]): { u: number[][]; singularValues: number[]; v: number[][] } {
    const m = matrix.length;
    const n = matrix[0]?.length ?? 0;
    const singularValues: number[] = [];
    for (let i = 0; i < Math.min(m, n); i++) {
      singularValues.push(1);
    }
    return { u: matrix, singularValues, v: this._identityMatrix(n) };
  }

  public toPacket(): DataPacket<{
    joints: number;
    links: number;
    poses: number;
    history: string[];
  }> {
    return {
      id: `kinematics-${Date.now()}-${this._counter}`,
      payload: {
        joints: this._joints.size,
        links: this._links.length,
        poses: this._poses.length,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['robotics', 'kinematics', 'result'],
        priority: 0.85,
        phase: 'motion',
      },
    };
  }

  public reset(): void {
    this._joints.clear();
    this._links = [];
    this._poses = [];
    this._history = [];
    this._counter = 0;
    this._currentChain = null;
  }
}