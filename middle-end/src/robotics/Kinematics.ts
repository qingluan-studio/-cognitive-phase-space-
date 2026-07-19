import { DataPacket } from '../shared/types';

/** A robotic joint. */
export interface Joint {
  readonly type: 'revolute' | 'prismatic' | 'continuous' | 'fixed';
  readonly angle: number;
  readonly axis: [number, number, number];
  readonly limits: { min: number; max: number };
}

/** A link in a kinematic chain. */
export interface Link {
  readonly length: number;
  readonly mass: number;
  readonly inertia: number[];
  readonly name: string;
}

/** A 3D pose with position and orientation. */
export interface Pose {
  readonly position: [number, number, number];
  readonly orientation: [number, number, number, number];
}

/** Result of an inverse kinematics solve. */
export interface IKResult {
  readonly joints: number[];
  readonly success: boolean;
  readonly error: number;
  readonly iterations: number;
}

/** DH (Denavit-Hartenberg) parameters. */
export interface DHParameter {
  readonly alpha: number;
  readonly a: number;
  readonly theta: number;
  readonly d: number;
}

export class Kinematics {
  private _joints: Map<string, Joint> = new Map();
  private _links: Link[] = [];
  private _poses: Pose[] = [];
  private _history: string[] = [];
  private _counter = 0;

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

  public singularities(jacobian: number[][]): { singular: boolean; rank: number; conditions: number } {
    const det = jacobian[0][0] * jacobian[1][1] * jacobian[2][2] -
                jacobian[0][1] * jacobian[1][0] * jacobian[2][2];
    const singular = Math.abs(det) < 1e-6;
    this._recordHistory(`singularities(singular=${singular})`);
    return { singular, rank: singular ? 2 : 3, conditions: singular ? 1 : 0 };
  }

  public workspace(links: Link[], jointLimits: { min: number; max: number }[]): { points: number; volume: number; reachable: boolean } {
    const samples = 100;
    const points = samples;
    const reach = links.reduce((s, l) => s + l.length, 0);
    const volume = (4 / 3) * Math.PI * Math.pow(reach, 3);
    this._recordHistory(`workspace(samples=${samples})`);
    return { points, volume, reachable: true };
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
  }
}
